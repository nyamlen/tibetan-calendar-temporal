/**
 * Month numbering, the true month count, and leap months — Janson §5.
 *
 * @remarks
 * The Tibetan calendar rests on the relation **67 lunar months = 65 solar months**, treated as
 * exact. Leap months are spaced to match it: two leap months per 65 regular months, with
 * alternating gaps of 32 and 33 regular months. It follows that the pattern repeats every 65
 * years, in which each month number 1–12 is the leap month exactly twice.
 *
 * A leap month takes **the same number as the month that follows it**, so a leap year contains
 * two months with one number and the first of them is the leap month. A month is therefore
 * identified by the triple `(Y, M, isLeap)`, and separately by a linear *true month count* `n`
 * that ignores year boundaries and is zero at the epoch.
 *
 * @packageDocumentation
 */

import type { TraditionConfig } from "../traditions/types.js";
import { amod, ceilDiv, floorDiv, mod } from "./arithmetic.js";
import { julianDayOfLunarDay } from "./corrections.js";
import type { ScaledTradition } from "./scaling.js";

/**
 * A month identified the way the calendar names it.
 *
 * @remarks
 * Not the public `TibetanMonth`, which this must not be confused with: `year` here is Janson's *Y*
 * rather than the royal era, and the flag is `isLeap` rather than `isLeapMonth`. This is the
 * identity triple the arithmetic works in; the public shape is the boundary's rendering of it.
 */
export interface MonthIdentity {
	/** Janson's *Y* — the Gregorian year the Tibetan year begins in. */
	year: number;
	/** Month number, 1–12. Shared with the following month when `isLeap` is true. */
	month: number;
	/** Whether this is the leap month — the first of the two sharing this number. */
	isLeap: boolean;
}

/**
 * Janson's `β`, derived from the epoch's intercalation index.
 *
 * @remarks
 * Janson writes `β = 184 − β*`, but the 184 is not a constant of nature: it is `67·M₀ − 17` with
 * the traditional `M₀ = 3`. Deriving it keeps the dependence on the epoch month explicit rather
 * than buried in a magic number, and keeps the formula correct if a tradition ever used a
 * different epoch month.
 *
 * For Phugpa at E806: `67·3 − 61 − 17 = 123`.
 */
function beta(config: TraditionConfig): number {
	return 67 * config.epochMonth - config.intercalationIndexAtEpoch - 17;
}

/**
 * Janson's `γ*`, the constant of the closed-form leap-year rule.
 *
 * @remarks
 * `γ* = (−24·Y₀ − β) mod 65`, which is 33 for Phugpa. Janson notes the value is the same for
 * every epoch of a given tradition, since the leap years themselves do not depend on the epoch.
 */
function gammaStar(config: TraditionConfig): number {
	return mod(-24 * config.epochYear - beta(config), 65);
}

/**
 * The number of solar months elapsed since the epoch — Janson's `M*`.
 *
 * @remarks
 * `M* = 12(Y − Y₀) + M − M₀`. Negative for months before the epoch, which is why every operation
 * downstream uses sign-correct division and modulo.
 */
export function solarMonthsSinceEpoch(
	config: TraditionConfig,
	year: number,
	month: number,
): number {
	return 12 * (year - config.epochYear) + month - config.epochMonth;
}

/**
 * The intercalation index — Janson's *zla-bshol rtsis-'phro*.
 *
 * @remarks
 * `ix = (2·M* + β*) mod 65`, the fractional part of the preliminary true month expressed in
 * sixty-fifths. Janson gives it equivalently as `(67·M* + β*) mod 65`; the two agree because
 * `67 ≡ 2 (mod 65)`.
 *
 * This is the index the **leap-month rule** tests, and it is *not* always the value an almanac
 * prints: Janson's Remark 11 notes that where the true month rounds up, published almanacs show
 * this value plus 2. That correction is irrelevant to dates and is not applied here.
 */
export function intercalationIndex(config: TraditionConfig, year: number, month: number): number {
	return mod(2 * solarMonthsSinceEpoch(config, year, month) + config.intercalationIndexAtEpoch, 65);
}

/**
 * Whether month `M` of year `Y` is preceded by a leap month with the same number — its *leap twin*.
 *
 * @remarks
 * The traditional Phugpa rule: a leap month is inserted when the intercalation index is
 * **48 or 49**.
 *
 * Named for the twin rather than for the year because the question is per-**month**. The public
 * `hasLeapMonth` asks a per-**year** question — does this year contain a leap month anywhere — and
 * the two must not share a name. `TCT_NO_SUCH_LEAP_MONTH` already describes the failure this
 * detects as a month having "no leap twin that year".
 */
export function hasLeapTwin(config: TraditionConfig, year: number, month: number): boolean {
	const index = intercalationIndex(config, year, month);
	return index === 48 || index === 49;
}

/**
 * The true month count `n` for a given month — Janson's *zla-dag*.
 *
 * @remarks
 * `n = ⌊(67·M* + β* + 17)/65⌋ − [isLeap]`.
 *
 * The `+17` encodes Janson's rounding rule, since `48 = 65 − 17`: the preliminary true month
 * rounds down when the intercalation index is below 48 and up otherwise, except that a leap
 * month always rounds down. Subtracting one for a leap month is what gives the two months
 * sharing a number their consecutive counts.
 *
 * `n` is zero at the epoch and increases by exactly one per month, leap months included.
 *
 * @param isLeap - Pass `true` for the leap month of a pair. Passing `true` for a month that is
 * not a leap month yields a count belonging to a different month; use {@link hasLeapTwin} to
 * check first.
 */
export function trueMonthCount(
	config: TraditionConfig,
	year: number,
	month: number,
	isLeap = false,
): number {
	const solarMonths = solarMonthsSinceEpoch(config, year, month);
	const rounded = floorDiv(67 * solarMonths + config.intercalationIndexAtEpoch + 17, 65);
	return rounded - (isLeap ? 1 : 0);
}

/**
 * Recovers the month `(Y, M, isLeap)` from a true month count — Janson §5, "The inverse problem".
 *
 * @remarks
 * ```text
 * x       = ⌈(65n + β)/67⌉
 * M       = x amod 12
 * Y       = ⌈x/12⌉ − 1 + Y₀
 * isLeap  = (65n + β) mod 67 ∈ {1, 2}
 * ```
 *
 * The first is a **ceiling**. PDF-extracted text renders it as a floor, which shifts months by
 * one at boundaries and produces a calendar that is plausible and wrong. `amod` in the second is
 * equally load-bearing: `mod` would report month 12 as month 0.
 *
 * A month is leap exactly when it takes the same number as the next one, which is what the
 * remainder test detects.
 */
export function monthFromCount(config: TraditionConfig, monthCount: number): MonthIdentity {
	const scaled = 65 * monthCount + beta(config);
	const x = ceilDiv(scaled, 67);
	const remainder = mod(scaled, 67);
	return {
		year: ceilDiv(x, 12) - 1 + config.epochYear,
		month: amod(x, 12),
		isLeap: remainder === 1 || remainder === 2,
	};
}

/**
 * Whether year `Y` contains a leap month, by Janson's closed form.
 *
 * @remarks
 * `(24·Y + γ*) mod 65 ≥ 41`, with `γ* = 33` for Phugpa.
 *
 * The inequality is **`≥`**. PDF-extracted text renders it as `≤`, which selects the
 * complementary 41 years of every 65 — a calendar with leap months in all the wrong places, and
 * one that still produces well-formed dates.
 *
 * This is an independent derivation from the {@link hasLeapTwin} route, which tests the
 * intercalation index directly. The two must agree for every year, and the test suite asserts
 * that as a cross-check.
 */
export function isLeapYear(config: TraditionConfig, year: number): boolean {
	return mod(24 * year + gammaStar(config), 65) >= 41;
}

/**
 * The number of the leap month in a leap year, or `undefined` if the year has none.
 *
 * @remarks
 * `M = ⌊33 − ((24·Y + γ*) mod 65)/2⌋`. Janson notes that for a non-leap year this yields an
 * impossible `M ≥ 13`, which is how the absence is detected.
 *
 * Implemented as `⌊(66 − x)/2⌋` so that the halving stays integer arithmetic rather than
 * producing a fraction to floor.
 */
export function leapMonthOfYear(config: TraditionConfig, year: number): number | undefined {
	const x = mod(24 * year + gammaStar(config), 65);
	const month = floorDiv(66 - x, 2);
	return month <= 12 ? month : undefined;
}

/**
 * The number of leap years — equivalently leap months — from `firstYear` to `lastYear` inclusive.
 *
 * @remarks
 * `⌊(24(Y₂+1) + γ*)/65⌋ − ⌊(24·Y₁ + γ*)/65⌋`. Useful as an independent check on the leap-year
 * rule: over any 65 consecutive years it must be exactly 24.
 */
export function leapYearsBetween(
	config: TraditionConfig,
	firstYear: number,
	lastYear: number,
): number {
	const g = gammaStar(config);
	return floorDiv(24 * (lastYear + 1) + g, 65) - floorDiv(24 * firstYear + g, 65);
}

/**
 * The number of months in the Tibetan year `Y` — 12, or 13 in a leap year.
 */
export function monthsInYear(config: TraditionConfig, year: number): number {
	return isLeapYear(config, year) ? 13 : 12;
}

/**
 * How a lunar day's number appears in the calendar — Janson §6.
 *
 * @remarks
 * Calendar days are 24 hours; lunar days vary between about 21.5 and 25.7 hours. The mismatch
 * means the numbering is not always one-to-one, and the labelling rule resolves it: **a calendar
 * day is named by the lunar day current at its start**, equivalently a lunar day names the
 * calendar day in which it ends.
 */
export type DayKind =
	/** One lunar day ends in this calendar day. The ordinary case. */
	| "normal"
	/**
	 * The lunar day begins and ends inside a single calendar day, so two lunar days end on that
	 * day and it takes the name of the first. This number reaches no calendar day at all.
	 */
	| "skipped"
	/**
	 * The lunar day wholly contains a calendar day, so no lunar day ends in that one and it takes
	 * the name of the day after. Two consecutive calendar days carry this number.
	 */
	| "doubled";

/** The calendar-day outcome for one lunar day. */
export interface DayClassification {
	kind: DayKind;
	/**
	 * The Julian day number carrying this date, or `undefined` when skipped.
	 *
	 * @remarks
	 * For a doubled date this is the **second** of the two days — the ordinary one. The first is
	 * {@link DayClassification.leapJulianDay}.
	 */
	julianDay: number | undefined;
	/**
	 * For a doubled date, the Julian day number of the first of the pair — the leap day almanacs
	 * mark "Extra". `undefined` otherwise.
	 */
	leapJulianDay: number | undefined;
}

/**
 * Classifies lunar day `d` of true month `n` as normal, skipped or doubled.
 *
 * @remarks
 * Janson §8 notes that `⌊true_date⌋` alone is not enough: for a repeated date it gives the second
 * day, and for a skipped date it gives the day carrying the *preceding* number. Comparing against
 * the previous lunar day resolves all three cases, since consecutive lunar days can land on the
 * same calendar day, the next one, or skip one:
 *
 * | `JD(d) − JD(d−1)` | Meaning |
 * |---|---|
 * | 0 | two lunar days end together, so this number is **skipped** |
 * | 1 | **normal** |
 * | 2 | a calendar day has no lunar day ending in it, so this number is **doubled** |
 *
 * The previous lunar day is day 30 of the preceding month when `d` is 1, which is why the
 * calculation crosses month boundaries rather than resetting.
 */
export function classifyDay(
	scaled: ScaledTradition,
	day: number,
	monthCount: number,
): DayClassification {
	const julianDay = julianDayOfLunarDay(scaled, day, monthCount);
	const previous =
		day === 1
			? julianDayOfLunarDay(scaled, 30, monthCount - 1)
			: julianDayOfLunarDay(scaled, day - 1, monthCount);

	if (julianDay === previous) {
		return { kind: "skipped", julianDay: undefined, leapJulianDay: undefined };
	}
	if (julianDay - previous >= 2) {
		return { kind: "doubled", julianDay, leapJulianDay: julianDay - 1 };
	}
	return { kind: "normal", julianDay, leapJulianDay: undefined };
}

/**
 * The Julian day number of the last calendar day of true month `n`.
 *
 * @remarks
 * Simply `⌊true_date(30, n)⌋`. Janson §8 notes this is correct even when day 30 is itself
 * repeated or skipped, which is what makes it a safe basis for month boundaries.
 */
export function lastDayOfMonth(scaled: ScaledTradition, monthCount: number): number {
	return julianDayOfLunarDay(scaled, 30, monthCount);
}

/**
 * The Julian day number of the first calendar day of true month `n`.
 *
 * @remarks
 * Computed as one day after the last day of the preceding month, **not** by evaluating day 1.
 * Janson §8 is explicit about this: lunar day 1 may end during the month's second calendar day
 * (when day 1 is repeated) or during the last day of the previous month (when it is skipped), so
 * evaluating it directly gives the wrong answer in both cases. He notes this appears to be the
 * source of errors in published tables.
 */
export function firstDayOfMonth(scaled: ScaledTradition, monthCount: number): number {
	return lastDayOfMonth(scaled, monthCount - 1) + 1;
}

/**
 * The number of calendar days in true month `n` — always 29 or 30.
 */
export function daysInMonth(scaled: ScaledTradition, monthCount: number): number {
	return lastDayOfMonth(scaled, monthCount) - lastDayOfMonth(scaled, monthCount - 1);
}

/**
 * The Julian day number of Losar — Tibetan New Year — beginning in Gregorian year `Y`.
 *
 * @remarks
 * One day after the last day of month 12 of the preceding year. Janson §8 recommends exactly
 * this route because the alternatives break in two real cases: the year may open with a **leap
 * month 1**, as 2000 did, and its first day may be **day 2** when day 1 is skipped. Working back
 * from the previous year's month 12 is correct in both.
 *
 * Janson's Remark 20 confirms that Losar is the first day of the year even when that day falls
 * in a leap month, unlike other holidays which are not observed in leap months.
 */
export function losarJulianDay(
	scaled: ScaledTradition,
	config: TraditionConfig,
	year: number,
): number {
	return lastDayOfMonth(scaled, trueMonthCount(config, year - 1, 12, false)) + 1;
}
