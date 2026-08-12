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
 * @throws RangeError if the month or day is out of range, or a leap month is requested for a
 * month that has none.
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
	const year = yearFromRoyalEra(input.year);
	const isLeapMonth = input.isLeapMonth ?? false;

	if (input.month < 1 || input.month > 12) {
		throw new RangeError(`month must be 1-12, received ${input.month}`);
	}
	if (input.day < 1 || input.day > 30) {
		throw new RangeError(`day must be 1-30, received ${input.day}`);
	}
	if (isLeapMonth && !hasLeapMonth(config, year, input.month)) {
		throw new RangeError(`month ${input.month} of ${input.year} has no leap month`);
	}

	const monthCount = trueMonthCount(config, year, input.month, isLeapMonth);
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
 * The predicate counterpart to {@link tibetanToIso}: `false` exactly where that would throw
 * {@link SkippedDayError}. Out-of-range input is `false` rather than an error, so this is safe to
 * use for validating user input.
 */
export function tibetanDateExists(
	input: TibetanDateInput,
	config: TraditionConfig = PHUGPA,
): boolean {
	try {
		tibetanToIso(input, config);
		return true;
	} catch {
		return false;
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
 */
export function losarFor(year: number, config: TraditionConfig = PHUGPA): TibetanDate {
	const scaled = scalingFor(config);
	const julianDay = losarJulianDay(scaled, config, yearFromRoyalEra(year));
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
