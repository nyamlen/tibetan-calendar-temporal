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

import { codedError, hasCode, rangeError } from "../errors.js";
import { PHUGPA } from "../traditions/phugpa.js";
import type { TraditionConfig } from "../traditions/types.js";
import { assertTraditionConfig } from "../traditions/validate.js";
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

// Checked at module evaluation, because the next line already needs Temporal. Without this a
// consumer on a runtime that lacks it gets `ReferenceError: Temporal is not defined` on import,
// before calling anything, naming neither the requirement nor the fix. Every entry point reaches
// here: `./observances` imports this module.
/* c8 ignore start -- unreachable under test: the suite runs on Node 26, where Temporal exists */
if (typeof Temporal === "undefined") {
	throw codedError(
		"TCT_MISSING_TEMPORAL",
		"tibetan-calendar-temporal requires the Temporal API, which is not available in this " +
			"runtime. Temporal ships enabled from Node 26; Node 24 has it behind " +
			"--harmony-temporal. On older runtimes or in a browser, import a polyfill before this " +
			'package: `import "temporal-polyfill/global";`',
	);
}
/* c8 ignore stop */

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
 * Renders a caller's input back to them, so a failure identifies the row that produced it.
 *
 * @remarks
 * A caller converting a table of dates gets one throw and needs to know *which* entry caused it.
 * The bad field alone does not say. Optional flags appear only when set, so the common case stays
 * short.
 */
function describeInput(input: TibetanDateInput): string {
	const flags = [
		input.isLeapMonth === true ? "isLeapMonth: true" : undefined,
		input.isLeapDay === true ? "isLeapDay: true" : undefined,
	].filter((f) => f !== undefined);
	const fields = [`year: ${input.year}`, `month: ${input.month}`, `day: ${input.day}`, ...flags];
	return `{ ${fields.join(", ")} }`;
}

/**
 * Rejects a year that is not a safe integer.
 *
 * @remarks
 * One predicate covers fractions, `NaN`, `±Infinity` and 2⁵³ overflow. The bounds checks alone
 * cannot: `NaN` satisfies neither `< 1` nor `> 30`, so it passes every comparison and reaches the
 * arithmetic.
 *
 * This does **not** catch the royal-era confusion — passing Gregorian 2026 where royal-era 2153 is
 * meant. 2026 is a perfectly valid royal-era year (1899 CE), so no guard can distinguish the two,
 * and the conversion returns a well-formed date 127 years away. That is a documentation problem,
 * handled in the README, not something an error message can reach.
 */
function assertSafeYear(subject: string, year: number): void {
	if (!Number.isSafeInteger(year)) {
		throw rangeError(
			"TCT_FIELD_OUT_OF_RANGE",
			`${subject}: year must be a safe integer, received ${year}`,
		);
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
 *
 * `subject` is a thunk because this sits on the hot path — `isoToTibetan` is called once per day
 * in the multi-century sweeps — and building the message eagerly would format a date on every
 * successful conversion. It is only ever needed on the throw.
 *
 * The message names the tradition, because the bound is a property of the tradition rather than of
 * the package: `PHUGPA_HENNING`'s common denominator is fifteen times Phugpa's, so it runs out
 * around ISO year 11,356 while Phugpa does not. A caller who hits this on one config and not the
 * other needs to be told which one refused.
 */
function assertExactJulianDay(
	scaled: ScaledTradition,
	julianDay: number,
	subject: () => string,
): void {
	if (!(Math.abs(julianDay) <= scaled.exactToJulianDay)) {
		throw rangeError(
			"TCT_OUTSIDE_EXACT_RANGE",
			`${subject()} is outside the range where the ${scaled.config.name} tradition's arithmetic ` +
				`stays exact: |JD| must be at most ${scaled.exactToJulianDay}` +
				`${describeBound(scaled.exactToJulianDay)}, received ${julianDay}`,
		);
	}
}

/**
 * The exactness bound as an ISO year, parenthesised, or `""` when it has none.
 *
 * @remarks
 * A raw Julian day in the tens of millions is not a number anyone can act on. The ISO year is, and
 * it is what makes the `PHUGPA_HENNING` limit legible as "about year 11,356" rather than as
 * `4295220`. Some bounds fall outside `Temporal.PlainDate`'s own ±273,972-year range, so this
 * degrades to nothing rather than throwing a second error while reporting the first.
 */
function describeBound(exactToJulianDay: number): string {
	try {
		return ` (about ISO year ${isoFromJulianDay(exactToJulianDay).year})`;
		/* c8 ignore next 3 -- only reachable for a tradition whose bound exceeds Temporal's range */
	} catch {
		return "";
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
	const subject = () => `tibetanToIso(${describeInput(input)})`;
	assertSafeYear(subject(), input.year);
	if (!Number.isInteger(input.month) || input.month < 1 || input.month > 12) {
		throw rangeError(
			"TCT_FIELD_OUT_OF_RANGE",
			`${subject()}: month must be an integer 1-12, received ${input.month}`,
		);
	}
	if (!Number.isInteger(input.day) || input.day < 1 || input.day > 30) {
		throw rangeError(
			"TCT_FIELD_OUT_OF_RANGE",
			`${subject()}: day must be an integer 1-30, received ${input.day}. Note that Tibetan ` +
				"months run to 30 even when fewer calendar days carry those numbers — a skipped date " +
				"is still 1-30, and reports itself as SkippedDayError rather than as out of range",
		);
	}

	const year = yearFromRoyalEra(input.year);
	if (isLeapMonth && !hasLeapMonth(config, year, input.month)) {
		throw rangeError(
			"TCT_NO_SUCH_LEAP_MONTH",
			`${subject()}: month ${input.month} of ${input.year} has no leap month. Leap months ` +
				"recur roughly every 32 months and fall on a different month number each time; drop " +
				"isLeapMonth, or use isoToTibetan to discover which month of a year is doubled",
		);
	}

	const monthCount = trueMonthCount(config, year, input.month, isLeapMonth);

	// Bound before classifying, not after. Past the exact limit classifyDay's arithmetic has
	// already lost precision, and it reports the damage as a skipped date. The mean date is within
	// 0.6 days of the true date and is exact over a wider range — its denominator divides
	// `commonDenominator` — so it is the right quantity to test the limit with.
	assertExactJulianDay(
		scaled,
		floorDiv(meanDate(scaled, input.day, monthCount), scaled.meanDate.den),
		subject,
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
 * malformed {@link TraditionConfig}. A predicate that reports "this date does not exist" when the
 * truth is "the engine broke" is worse than a throw, and this one is used as an oracle by the
 * suite's strongest property, where masking a failure would make that property pass more easily
 * rather than fail.
 *
 * Two mechanisms keep those out, because the error *type* alone is too coarse for one of them. The
 * invariant violation is a plain `Error`, so the `RangeError` branch never sees it. A malformed
 * config is a `RangeError` like every other input problem — it is genuinely bad input — so it is
 * excluded by **code** instead. That is the case error codes were added for.
 */
export function tibetanDateExists(
	input: TibetanDateInput,
	config: TraditionConfig = PHUGPA,
): boolean {
	try {
		tibetanToIso(input, config);
		return true;
	} catch (error) {
		if (hasCode(error, "TCT_INVALID_TRADITION_CONFIG")) throw error;
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
	assertExactJulianDay(scaled, target, () => date.toString());

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
		// A plain Error, not a RangeError, and the distinction is load-bearing: `tibetanDateExists`
		// reports `false` for a RangeError, so as one of those this would have been swallowed into
		// "that date does not exist" — the opposite of the truth, and in the oracle for the suite's
		// strongest property. See the remarks on that function.
		throw codedError(
			"TCT_INTERNAL",
			`no Tibetan date found for ${date.toString()} within the proved search window; ` +
				"this indicates a bug in the mean-motion estimate, not an unsupported date. " +
				"Please report it at https://github.com/nyamlen/tibetan-calendar-temporal/issues",
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
	assertSafeYear(`losarFor(${year})`, year);
	const julianDay = losarJulianDay(scaled, config, yearFromRoyalEra(year));
	assertExactJulianDay(scaled, julianDay, () => `losarFor(${year})`);
	return isoToTibetan(isoFromJulianDay(julianDay), config);
}

/** Memoised scaling, so repeated conversions do not redo the gcd work. */
const scalingCache = new WeakMap<TraditionConfig, ScaledTradition>();

/**
 * The single choke point for tradition config, and therefore where it is validated.
 *
 * @remarks
 * Every exported function reaches the arithmetic through here, and the cache already means the
 * work happens once per config object, so the validation costs nothing after the first call. That
 * is what lets the check be thorough without touching the multi-century sweeps.
 */
function scalingFor(config: TraditionConfig): ScaledTradition {
	const cached = scalingCache.get(config);
	if (cached !== undefined) return cached;
	assertTraditionConfig(config);
	const derived = deriveScaling(config);
	scalingCache.set(config, derived);
	return derived;
}
