/**
 * Conversions between `Temporal.PlainDate` and Tibetan dates — Janson §8 and §9.
 *
 * @remarks
 * The forward direction is direct: a Tibetan date names a lunar day, and `⌊true_date⌋` gives the
 * calendar day it ends in. The inverse has no closed form, so it estimates the lunar day count
 * from mean motion and searches a small window — a window whose width is **proved**, not guessed.
 * See {@link isoToTibetan}.
 *
 * @packageDocumentation
 */

import { PHUGPA } from "../traditions/phugpa.js";
import type { TraditionConfig } from "../traditions/types.js";
import type { TibetanDate, TibetanDateInput } from "../types.js";
import { SkippedDayError } from "../types.js";
import { floorDiv, mod } from "./arithmetic.js";
import {
	classifyDay,
	hasLeapMonth,
	losarJulianDay,
	monthFromCount,
	trueMonthCount,
} from "./calendar.js";
import { julianDayOfLunarDay } from "./corrections.js";
import { rabjungFromYear, royalEraFromYear, yearFromRoyalEra, yearNameFromYear } from "./epoch.js";
import { meanDate } from "./mean-astronomy.js";
import { deriveScaling, type ScaledTradition } from "./scaling.js";

/** 1970-01-01, the anchor for converting between Temporal and Julian day numbers. */
const UNIX_EPOCH = Temporal.PlainDate.from("1970-01-01");

/**
 * Julian day number of 1970-01-01.
 *
 * @remarks
 * Checks out against Janson's worked value: 1 January 2007 is JD 2454102, and 2007-01-01 is
 * 13,514 days after the Unix epoch.
 */
const JULIAN_DAY_AT_UNIX_EPOCH = 2_440_588;

/**
 * Converts a `Temporal.PlainDate` to a Julian day number.
 *
 * @remarks
 * Exact integer arithmetic via Temporal's own day arithmetic — no `Date`, no milliseconds, no
 * timezone. The Julian day number counts days regardless of when they begin, so no time of day
 * is involved; Janson makes the point that this is precisely why the day *number* rather than
 * the Julian *date* is the right tool for calendars.
 */
export function julianDayFromIso(date: Temporal.PlainDate): number {
	return JULIAN_DAY_AT_UNIX_EPOCH + date.since(UNIX_EPOCH, { largestUnit: "day" }).days;
}

/** Converts a Julian day number back to a `Temporal.PlainDate`. */
export function isoFromJulianDay(julianDay: number): Temporal.PlainDate {
	return UNIX_EPOCH.add({ days: julianDay - JULIAN_DAY_AT_UNIX_EPOCH });
}

/**
 * Rejects a year that is not a safe integer.
 *
 * @remarks
 * One predicate covers fractions, `NaN`, `±Infinity` and 2⁵³ overflow. The bounds checks alone
 * cannot: `NaN` satisfies neither `< 1` nor `> 30`, so it passes every comparison and reaches the
 * arithmetic.
 */
function assertSafeYear(year: number): void {
	if (!Number.isSafeInteger(year)) {
		throw new RangeError(`year must be a safe integer, received ${year}`);
	}
}

/**
 * Rejects a Julian day past the point where this tradition's arithmetic stays exact.
 *
 * @remarks
 * `true_date` is an integer numerator over `commonDenominator`, so it is roughly `JD · D` and
 * stops being representable at {@link ScaledTradition.exactToJulianDay}. Past that the arithmetic
 * degrades silently rather than refusing, and — worse — a degraded `true_date` misclassifies the
 * day, so 2⁵³ overflow gets reported as a **skipped date**: a specific, confident calendrical
 * claim about a date that was never computed. The correct response to `SkippedDayError` is "fine,
 * that date does not exist"; the correct response here is "your input is out of range". They must
 * not be the same error.
 *
 * Negated comparison so that a `NaN` Julian day fails rather than passes.
 */
function assertExactJulianDay(scaled: ScaledTradition, julianDay: number, subject: string): void {
	if (!(Math.abs(julianDay) <= scaled.exactToJulianDay)) {
		throw new RangeError(
			`${subject} is outside the range where this tradition's arithmetic is exact: ` +
				`|JD| must be at most ${scaled.exactToJulianDay}, received ${julianDay}`,
		);
	}
}

/**
 * The Tibetan day of week, 0 = Saturday through 6 = Friday — Janson §9.
 *
 * @remarks
 * `(JD + 2) mod 7`. Each weekday is named for a planet, as in Latin and several modern European
 * languages; the cycle is identical to the Western one, so this is a renumbering rather than a
 * different week.
 *
 * {@link TibetanDate.dayOfWeek} exposes the **ISO** numbering instead, matching
 * `Temporal.PlainDate.dayOfWeek`. This function is provided for callers working with almanac
 * conventions.
 */
export function tibetanWeekday(julianDay: number): number {
	return mod(julianDay + 2, 7);
}

/** Formats a month as a Temporal-style code: `"M01"`…`"M12"`, with `L` appended for a leap month. */
function monthCodeOf(month: number, isLeap: boolean): string {
	return `M${String(month).padStart(2, "0")}${isLeap ? "L" : ""}`;
}

/** The lunar day whose end is the full moon, and the one whose end is the new moon — Janson §6. */
const FULL_MOON_LUNAR_DAY = 15;
const NEW_MOON_LUNAR_DAY = 30;

/** Assembles the public shape from a resolved lunar day. */
function buildDate(
	scaled: ScaledTradition,
	monthCount: number,
	year: number,
	month: number,
	isLeapMonth: boolean,
	day: number,
	isDoubledDay: boolean,
	isLeapDay: boolean,
	julianDay: number,
): TibetanDate {
	const isoDate = isoFromJulianDay(julianDay);
	return {
		year: royalEraFromYear(year),
		yearStartsIn: year,
		rabjung: rabjungFromYear(year),
		yearName: yearNameFromYear(year),
		month,
		monthCode: monthCodeOf(month, isLeapMonth),
		isLeapMonth,
		day,
		isDoubledDay,
		isLeapDay,
		// The phase instants end lunar days 15 and 30, so the day carrying one is the day that
		// lunar day ends in — which is what labels every day anyway. Deriving it this way rather
		// than from `day` is what makes it correct when 15 or 30 is skipped.
		//
		// The `day` guard is an optimisation, and a sound one: the phase lands on the day numbered
		// 15 (or 30), or on 14 (or 29) when that number is skipped, and never earlier. Skipping
		// two consecutive numbers would need three lunar day ends inside one calendar day, so two
		// consecutive lunar days totalling under 24 hours, where the minimum length is 21.5 each.
		// Without it, every conversion pays for two extra true-date evaluations.
		isFullMoon:
			(day === FULL_MOON_LUNAR_DAY || day === FULL_MOON_LUNAR_DAY - 1) &&
			julianDayOfLunarDay(scaled, FULL_MOON_LUNAR_DAY, monthCount) === julianDay,
		isNewMoon:
			(day === NEW_MOON_LUNAR_DAY || day === NEW_MOON_LUNAR_DAY - 1) &&
			julianDayOfLunarDay(scaled, NEW_MOON_LUNAR_DAY, monthCount) === julianDay,
		isoDate,
		dayOfWeek: isoDate.dayOfWeek,
	};
}

/**
 * Converts a Tibetan date to the Western calendar day carrying it.
 *
 * @remarks
 * Total for every input that names a real day. A **skipped** date names no day at all, and
 * throws — use {@link tibetanDateExists} to test first.
 *
 * `year` is the royal-era numbering, not Janson's *Y*. Passing 2026 where 2153 is meant returns
 * a date 127 years away rather than failing quietly.
 *
 * For dates before 1447 the result is a back-projection of a tradition that did not yet exist;
 * before 1582 the `Temporal.PlainDate` is proleptic Gregorian where historical sources are
 * Julian. Neither is an error, but neither is what a contemporary would have written.
 *
 * @throws SkippedDayError if the date is skipped.
 * @throws RangeError if `year`, `month` or `day` is not an integer, if the month or day is out of
 * range, if a leap month is requested for a month that has none, or if the date falls outside the
 * range where the arithmetic stays exact — see {@link ScaledTradition.exactToJulianDay}.
 *
 * @example
 * ```ts
 * tibetanToIso({ year: 2153, month: 12, day: 8 });
 * // Temporal.PlainDate 2027-01-15
 * ```
 */
export function tibetanToIso(
	input: TibetanDateInput,
	config: TraditionConfig = PHUGPA,
): Temporal.PlainDate {
	const scaled = scalingFor(config);
	const isLeapMonth = input.isLeapMonth ?? false;

	// Integrality before range: the whole determinism argument rests on integer arithmetic, and a
	// fractional value passes every bound check below and comes out as a confident wrong date.
	// NaN in particular satisfies neither `< 1` nor `> 30`, so the bounds alone let it through.
	assertSafeYear(input.year);
	if (!Number.isInteger(input.month) || input.month < 1 || input.month > 12) {
		throw new RangeError(`month must be an integer 1-12, received ${input.month}`);
	}
	if (!Number.isInteger(input.day) || input.day < 1 || input.day > 30) {
		throw new RangeError(`day must be an integer 1-30, received ${input.day}`);
	}

	const year = yearFromRoyalEra(input.year);
	if (isLeapMonth && !hasLeapMonth(config, year, input.month)) {
		throw new RangeError(`month ${input.month} of ${input.year} has no leap month`);
	}

	const monthCount = trueMonthCount(config, year, input.month, isLeapMonth);

	// Bound before classifying, not after. Past the exact limit classifyDay's arithmetic has
	// already lost precision, and it reports the damage as a skipped date. The mean date is within
	// 0.6 days of the true date and is exact over a wider range — its denominator divides
	// `commonDenominator` — so it is the right quantity to test the limit with.
	assertExactJulianDay(
		scaled,
		floorDiv(meanDate(scaled, input.day, monthCount), scaled.meanDate.den),
		`Tibetan date ${input.year}-${input.month}-${input.day}`,
	);

	const classification = classifyDay(scaled, input.day, monthCount);

	if (classification.kind === "skipped") throw new SkippedDayError(input);
	if (classification.kind === "doubled" && (input.isLeapDay ?? false)) {
		return isoFromJulianDay(classification.leapJulianDay as number);
	}
	return isoFromJulianDay(classification.julianDay as number);
}

/**
 * Whether a Tibetan date names a real calendar day.
 *
 * @remarks
 * The predicate counterpart to {@link tibetanToIso}. It answers `false` in the two cases a caller
 * means by "this date is not real": the date is **skipped**, so no calendar day carries its
 * number, and the input is out of range or not an integer. Both are ordinary answers about the
 * input, which is what makes this safe to point at user input.
 *
 * It deliberately does **not** swallow anything else. A bare `catch` here would also return
 * `false` for the `"this indicates a bug in the mean-motion estimate"` invariant violation in
 * {@link isoToTibetan} — the one error in this codebase explicitly labelled as a bug — and for a
 * `TypeError` from a malformed {@link TraditionConfig}. A predicate that reports "this date does
 * not exist" when the truth is "the engine broke" is worse than a throw, and this one is used as
 * an oracle by the suite's strongest property, where masking a failure would make that property
 * pass more easily rather than fail.
 */
export function tibetanDateExists(
	input: TibetanDateInput,
	config: TraditionConfig = PHUGPA,
): boolean {
	try {
		tibetanToIso(input, config);
		return true;
	} catch (error) {
		if (error instanceof SkippedDayError || error instanceof RangeError) return false;
		throw error;
	}
}

/**
 * Converts a Western calendar day to its Tibetan date.
 *
 * @remarks
 * There is no closed-form inverse, so this estimates and searches. The estimate comes from mean
 * motion over the linear lunar day count `l = 30n + d`, and the search window is **provably**
 * ±3:
 *
 * - `|true_date − mean_date| = |moon_equ − sun_equ| / 60 ≤ (25 + 11)/60 = 0.6` days, and
 * - no true lunar day is shorter than about 0.897 days,
 *
 * so the estimate cannot be more than 2 away from the truth. Both bounds are asserted by tests.
 * Do not widen this window "to be safe" — if a date is not found inside it, the fault is
 * elsewhere.
 *
 * @throws RangeError if the date falls outside the range where the arithmetic stays exact. This
 * is reachable inside `Temporal.PlainDate`'s own range: `PHUGPA_HENNING` is exact only to about
 * year 11,356.
 *
 * Counting matches inside the window classifies the day directly, which is why no separate pass
 * is needed: one lunar day ending here is the ordinary case; two means the second's number is
 * skipped and this day takes the first's name; none means this day is the first of a doubled
 * pair and takes the name of the day after.
 *
 * @example
 * ```ts
 * const date = isoToTibetan(Temporal.PlainDate.from("2027-01-15"));
 * date.year;         // 2153 — royal era, not 2027
 * date.yearStartsIn; // 2026 — Janson's Y
 * date.month;        // 12
 * date.day;          // 8
 * ```
 */
export function isoToTibetan(
	date: Temporal.PlainDate,
	config: TraditionConfig = PHUGPA,
): TibetanDate {
	const scaled = scalingFor(config);
	const target = julianDayFromIso(date);
	assertExactJulianDay(scaled, target, date.toString());

	// Invert the mean date over the linear lunar day count l = 30n + d.
	const { den, perDay, atEpoch } = scaled.meanDate;
	const estimate = Math.round((target * den - atEpoch) / perDay);

	// Collect every lunar day in the window that ends on the target calendar day, plus the
	// first that ends after it — needed for the doubled case, where none ends on it.
	let named: { day: number; monthCount: number } | undefined;
	let following: { day: number; monthCount: number } | undefined;

	for (let l = estimate - 3; l <= estimate + 3; l++) {
		const monthCount = floorDiv(l - 1, 30);
		const day = l - 30 * monthCount;
		const julianDay = julianDayOfLunarDay(scaled, day, monthCount);
		if (julianDay === target && named === undefined) named = { day, monthCount };
		if (julianDay > target && following === undefined) following = { day, monthCount };
	}

	// No lunar day ends on this calendar day, so it is the first of a doubled pair and takes
	// the name of the following day.
	const resolved = named ?? following;
	/* c8 ignore next */
	if (resolved === undefined) {
		throw new RangeError(
			`no Tibetan date found for ${date.toString()} within the proved search window; ` +
				"this indicates a bug in the mean-motion estimate, not an unsupported date",
		);
	}

	const month = monthFromCount(config, resolved.monthCount);
	const classification = classifyDay(scaled, resolved.day, resolved.monthCount);
	const isDoubledDay = classification.kind === "doubled";

	return buildDate(
		scaled,
		resolved.monthCount,
		month.year,
		month.month,
		month.isLeap,
		resolved.day,
		isDoubledDay,
		isDoubledDay && classification.leapJulianDay === target,
		target,
	);
}

/**
 * Losar, the Tibetan New Year, for a given royal-era year.
 *
 * @remarks
 * Losar cannot be obtained as `tibetanToIso({ month: 1, day: 1 })`. Where day 1 is skipped the
 * year begins on the day numbered **2** — 1977 is the case in range — and that call throws
 * {@link SkippedDayError} instead of returning the new year. Where the year opens with a leap
 * month 1, which happens twice per 65-year cycle and last did in 2000, the year begins in the
 * leap month rather than the regular one.
 *
 * Janson computes it as one day after the last day of the preceding year, which sidesteps both
 * cases rather than special-casing them, and confirms in the Losar remark that the new year is the
 * first day of the year even when that day falls in a leap month — unlike other observances, which
 * are usually not kept in leap months.
 *
 * `year` is the royal-era numbering, matching {@link TibetanDate.year}: 2153, not 2026.
 *
 * @example
 * ```ts
 * losarFor(2153).isoDate;   // 2026-02-18
 * losarFor(2104).day;       // 2 — day 1 is skipped in 1977
 * ```
 *
 * @throws RangeError if `year` is not a safe integer, or falls outside the range where the
 * arithmetic stays exact.
 */
export function losarFor(year: number, config: TraditionConfig = PHUGPA): TibetanDate {
	const scaled = scalingFor(config);
	assertSafeYear(year);
	const julianDay = losarJulianDay(scaled, config, yearFromRoyalEra(year));
	assertExactJulianDay(scaled, julianDay, `Losar of ${year}`);
	return isoToTibetan(isoFromJulianDay(julianDay), config);
}

/** Memoised scaling, so repeated conversions do not redo the gcd work. */
const scalingCache = new WeakMap<TraditionConfig, ScaledTradition>();

function scalingFor(config: TraditionConfig): ScaledTradition {
	const cached = scalingCache.get(config);
	if (cached !== undefined) return cached;
	const derived = deriveScaling(config);
	scalingCache.set(config, derived);
	return derived;
}
