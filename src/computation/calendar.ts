/**
 * Month numbering, the true month count, and leap months — Janson §5, "Numbering of months and
 * leap months".
 *
 * @remarks
 * The Tibetan calendar rests on the relation **67 lunar months = 65 solar months**, treated as
 * exact. Leap months are spaced to match it: two leap months per 65 regular months, with
 * alternating gaps of 32 and 33 regular months. It follows that the pattern repeats every 65
 * years, in which each month number 1–12 is the leap month exactly twice.
 *
 * A leap month **shares its number with an adjacent month**, so a leap year contains two months
 * carrying one number. Which of the two is the leap month is the tradition's to say, through
 * {@link ../traditions/types.TraditionConfig.leapMonthPosition}: the first under `PHUGPA` and
 * `PHUGPA_HENNING`, the second under `BHUTAN` and `BHUTAN_HENNING`. Janson's general rule is the
 * first, a leap month taking the number of the following month; the Bhutanese version takes the
 * number of the preceding month. A month is therefore identified by the triple `(Y, M, isLeap)`,
 * and separately by a linear *true month count* `n` that ignores year boundaries and is zero for
 * the month that begins at the epoch.
 *
 * @packageDocumentation
 */

import { rangeError } from "../errors.js";
import type { TraditionConfig } from "../traditions/types.js";
import { amod, ceilDiv, floorDiv, mod } from "./arithmetic.js";
import { julianDayOfLunarDay } from "./corrections.js";
import type { ScaledTradition } from "./scaling.js";

// `subject` is a thunk because this guard runs on every closed-form call, and building the message
// eagerly would cost every success to save one throw.
/**
 * Rejects a year for which the leap-year closed forms would overflow `Number.MAX_SAFE_INTEGER`.
 *
 * @remarks
 * The guard for {@link isLeapYear}, {@link leapMonthOfYear} and {@link solarMonthsSinceEpoch}, hence
 * `hasLeapMonth`, `leapMonthNumberFor` and `monthsInYear`. Past the bound they would answer from
 * arithmetic noise. The bound is derived from the config's `epochYear`.
 *
 * A path that goes on to {@link trueMonthCount} needs the narrower {@link assertMonthCountYear}
 * instead.
 *
 * @param subject - Builds the subject the message opens with; called only when it throws.
 * @throws RangeError with code `TCT_OUTSIDE_EXACT_RANGE` if `|year − epochYear|` exceeds the bound.
 */
export function assertClosedFormYear(
	subject: () => string,
	year: number,
	tradition: TraditionConfig,
): void {
	assertYearWithin(subject, year, tradition, leapYearLimit(tradition));
}

/**
 * Rejects a year for which {@link trueMonthCount}'s arithmetic would overflow
 * `Number.MAX_SAFE_INTEGER`.
 *
 * @remarks
 * The guard for every path that reaches the true month count: `lunationFromMonth`, `monthsBetween`,
 * `addMonths`, `addMonthsToDate` and the date conversions. It is the leap-year bound of
 * {@link assertClosedFormYear} and, as well, a bound on the `67·M*` term, which is 67 times larger
 * than the month count the leap-year forms touch and so leaves the safe range first.
 *
 * @param subject - Builds the subject the message opens with; called only when it throws.
 * @throws RangeError with code `TCT_OUTSIDE_EXACT_RANGE` if `|year − epochYear|` exceeds the bound.
 */
export function assertMonthCountYear(
	subject: () => string,
	year: number,
	tradition: TraditionConfig,
): void {
	assertYearWithin(
		subject,
		year,
		tradition,
		Math.min(leapYearLimit(tradition), monthCountLimit(tradition)),
	);
}

function assertYearWithin(
	subject: () => string,
	year: number,
	tradition: TraditionConfig,
	limit: number,
): void {
	if (Math.abs(year - tradition.epochYear) > limit) {
		throw rangeError(
			"TCT_OUTSIDE_EXACT_RANGE",
			`${subject()} is outside the range where this tradition's closed-form year arithmetic ` +
				`stays exact: |year − epochYear| must be at most ${limit}, received ${year}`,
		);
	}
}

// Both limits are derived from the config at each call, never a literal: a bound computed for
// Phugpa and hardcoded would be wrong for a tradition with another epoch, index or leap rule. The
// arithmetic is cheap enough to need no memoisation. Each is a floored safe-integer quotient, so it
// is a *bound*, never a calendar quantity: one off would only narrow the accepted range.

// solarMonthsSinceEpoch needs 12·(year − epochYear) + month − epochMonth safe, with the trailing
// term at most 11 in magnitude; isLeapYear and leapMonthOfYear need 24·year + γ* safe on the
// *absolute* year, γ* being `mod(…, 65)` and so at most 64. The absolute bound converts to
// |year − epochYear| by the triangle inequality, |year| ≤ |epochYear| + |year − epochYear|. For any
// config the absolute term binds (about 3.7e14 against the relative 7.5e14), and the relative one
// is kept because it costs nothing.
function leapYearLimit(tradition: TraditionConfig): number {
	// exact: a safe-integer quotient floored to a bound, never a calendar quantity.
	const relativeLimit = Math.floor((Number.MAX_SAFE_INTEGER - 12) / 12);
	// exact: as above.
	const absoluteLimit =
		Math.floor((Number.MAX_SAFE_INTEGER - 65) / 24) - Math.abs(tradition.epochYear);
	return Math.min(relativeLimit, absoluteLimit);
}

// trueMonthCount needs 67·M* + intercalationIndexAtEpoch + (65 − leapIndexThreshold) safe, with
// |M*| ≤ 12·|year − epochYear| + 11. About 1.1e13 years for Phugpa.
function monthCountLimit(tradition: TraditionConfig): number {
	// exact: a safe-integer quotient floored to a bound, never a calendar quantity.
	return Math.floor(
		(Number.MAX_SAFE_INTEGER -
			67 * 11 -
			Math.abs(tradition.intercalationIndexAtEpoch) -
			Math.abs(65 - tradition.leapIndexThreshold)) /
			(67 * 12),
	);
}

// `assertClosedFormYear` cannot cover this: it is stated in `|year − epochYear|`, and the year is
// not known until *after* the overflowing multiplication has happened.
/**
 * Rejects a true month count that would make {@link monthFromCount} overflow into confident
 * nonsense.
 *
 * @remarks
 * The counterpart of {@link assertClosedFormYear} for the *inverse* direction. `monthFromCount`
 * computes `65·monthCount + β` before anything else, so a large enough count loses precision past
 * 2⁵³ and silently returns a month identity built from arithmetic noise.
 *
 * The bound is **derived from the config at each call**, never a literal. `β` is built entirely from
 * injected fields — `67·M₀ − β* − (65 − threshold)` — so a tradition with a different epoch month,
 * intercalation index or leap rule gets a different limit.
 *
 * @param subject - Builds the subject the message opens with; called only when it throws.
 * @throws RangeError with code `TCT_OUTSIDE_EXACT_RANGE` if `|monthCount|` exceeds the bound.
 */
export function assertLunation(
	subject: () => string,
	monthCount: number,
	tradition: TraditionConfig,
): void {
	// 65·monthCount + β must stay inside the safe range. Subtracting |β| rather than β covers the
	// negative direction with the same limit.
	// exact: a safe-integer quotient floored to a bound. `beta(config)` is itself integer-only.
	const limit = Math.floor((Number.MAX_SAFE_INTEGER - Math.abs(beta(tradition))) / 65);
	if (Math.abs(monthCount) > limit) {
		throw rangeError(
			"TCT_OUTSIDE_EXACT_RANGE",
			`${subject()} is outside the range where this tradition's month-count arithmetic stays ` +
				`exact: |lunation| must be at most ${limit}, received ${monthCount}`,
		);
	}
}

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
	/** Month number, 1–12. Shared with the adjacent month when `isLeap` is true. */
	month: number;
	/**
	 * Whether this is the leap month of the two sharing this number.
	 *
	 * Which of the pair that is depends on the tradition — see
	 * {@link ../traditions/types.TraditionConfig.leapMonthPosition}. Do not read it as "the first".
	 */
	isLeap: boolean;
}

/**
 * Janson's `β`, derived from the epoch's intercalation index.
 *
 * @remarks
 * Janson writes `β = 184 − β*`, but neither the 184 nor the 17 inside it is a constant of nature.
 * The 184 is `67·M₀ − 17` with the traditional `M₀ = 3`, and the 17 is `65 − 48` with Phugpa's
 * leap-index threshold. Both are derived here, so the formula stays correct for a tradition with
 * a different epoch month **or** a different leap rule.
 *
 * It reproduces every value Janson publishes, for his four versions (the shipped configs use the
 * Phugpa and Bhutanese rows):
 *
 * | Tradition | M₀ | β* | threshold | derived β | Janson |
 * |-----------|----|----|-----------|-----------|--------|
 * | Phugpa    | 3  | 61 | 48        | 123       | 123    |
 * | Mongolian | 3  | 10 | 46        | 172       | 172    |
 * | Bhutanese | 3  | 2  | 57        | 191       | 191    |
 * | Tsurphu   | 3  | 59 | 0         | 77        | 142    |
 *
 * The Tsurphu row is agreement, not a discrepancy: `142 − 77 = 65`, and β is only ever used
 * modulo 65, so the two are the same constant. Janson gives 142 and 187 for his two Tsurphu epochs,
 * each 65 above the value derived here (77, and 122 from `β* = 14`).
 */
export function beta(tradition: TraditionConfig): number {
	return (
		67 * tradition.epochMonth -
		tradition.intercalationIndexAtEpoch -
		(65 - tradition.leapIndexThreshold)
	);
}

/**
 * Janson's `γ*`, the constant of the closed-form leap-year rule.
 *
 * @remarks
 * `γ* = (−24·Y₀ − β) mod 65`, which is 33 for `PHUGPA` and `PHUGPA_HENNING` and 28 for `BHUTAN` and
 * `BHUTAN_HENNING`. Janson notes the value is the same for every epoch of a given version, since
 * the leap years themselves do not depend on the epoch (§5, "Leap years").
 */
function gammaStar(tradition: TraditionConfig): number {
	return mod(-24 * tradition.epochYear - beta(tradition), 65);
}

/**
 * The number of solar months elapsed since the epoch — Janson's `M*`.
 *
 * @remarks
 * `M* = 12(Y − Y₀) + M − M₀`. Negative for months before the epoch, which is why every operation
 * downstream uses sign-correct division and modulo.
 */
export function solarMonthsSinceEpoch(
	tradition: TraditionConfig,
	year: number,
	month: number,
): number {
	return 12 * (year - tradition.epochYear) + month - tradition.epochMonth;
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
 * prints: Janson's remark on the traditional formulation of the true month notes that, for the
 * Phugpa version, where the true month rounds up, published almanacs show this value plus 2. That
 * correction is irrelevant to dates and is not applied here.
 */
export function intercalationIndex(
	tradition: TraditionConfig,
	year: number,
	month: number,
): number {
	return mod(
		2 * solarMonthsSinceEpoch(tradition, year, month) + tradition.intercalationIndexAtEpoch,
		65,
	);
}

// Named for the month rather than for the year because the question is per-month, and the two must
// not share a name with `hasLeapMonth`, which asks per year. `TCT_NO_SUCH_LEAP_MONTH` already
// describes the failure `monthCountFor` raises on a false answer as "no leap twin that year".
/**
 * Returns whether regular month `M` of year `Y` shares its number with a leap month — its *twin*.
 *
 * @remarks
 * A leap month is inserted when the intercalation index is
 * {@link ../traditions/types.TraditionConfig.leapIndexThreshold} or one more than it — **48 or 49**
 * for `PHUGPA` and `PHUGPA_HENNING`, **57 or 58** for `BHUTAN` and `BHUTAN_HENNING`, and in
 * Janson's other versions 0-or-1 for Tsurphu and 46-or-47 for the Mongolian. The threshold is
 * config, never a literal.
 *
 * **Says nothing about which side the twin falls on.** The test is the same under both positions;
 * direction is {@link ../traditions/types.TraditionConfig.leapMonthPosition}'s to state, and this
 * answers only whether there are two months of this number at all. The public `hasLeapMonth` asks
 * the per-year question instead: whether the year contains a leap month anywhere.
 */
export function sharesNumberWithLeapMonth(
	tradition: TraditionConfig,
	year: number,
	month: number,
): boolean {
	const index = intercalationIndex(tradition, year, month);
	return index === tradition.leapIndexThreshold || index === tradition.leapIndexThreshold + 1;
}

/**
 * Returns the true month count `n` for a month — Janson's *zla-dag*.
 *
 * @remarks
 * Under `leapMonthPosition` `"before"`: `n = ⌊(67·M* + β* + (65 − threshold))/65⌋ − [isLeap]`.
 *
 * The added term encodes Janson's rounding rule: the preliminary true month rounds down when the
 * intercalation index is below the tradition's
 * {@link ../traditions/types.TraditionConfig.leapIndexThreshold} and up otherwise, except that a
 * leap month always rounds down. For Phugpa the threshold is 48 and the term is Janson's familiar
 * `+17`; it is written as `65 − threshold` because the two move together and a literal `17` beside
 * a configurable rule is a silent inconsistency. Subtracting one for a leap month is what gives
 * the two months sharing a number their consecutive counts.
 *
 * `n` is zero for the month that begins at the epoch — month 2 of 806 for `PHUGPA`, month 3 of
 * 1754 for `BHUTAN` — and increases by exactly one per month, leap months included.
 *
 * **Which month of a twinned pair takes the adjustment depends on
 * {@link ../traditions/types.TraditionConfig.leapMonthPosition}, and it is not a sign flip.** The
 * pair always occupies the counts `rounded − 1` and `rounded`; all that changes is which of them is
 * the leap month. Under `"before"` the leap month is the earlier, so it takes `rounded − 1` and the
 * regular month keeps `rounded`. Under `"after"` the leap month is the later, so it keeps `rounded`
 * and the **regular** month takes `rounded − 1`. So under `"after"` the adjustment applies to a
 * regular month **only when it has a twin**; an untwinned month keeps `rounded` under both
 * positions.
 *
 * @param isLeap - `true` for the leap month of a pair. For a month with no twin, `true` gives the
 * previous month's count under `"before"` and changes nothing under `"after"`; use
 * {@link sharesNumberWithLeapMonth} to check first.
 */
export function trueMonthCount(
	tradition: TraditionConfig,
	year: number,
	month: number,
	isLeap: boolean,
): number {
	const solarMonths = solarMonthsSinceEpoch(tradition, year, month);
	const rounded = floorDiv(
		67 * solarMonths + tradition.intercalationIndexAtEpoch + (65 - tradition.leapIndexThreshold),
		65,
	);
	if (tradition.leapMonthPosition === "after") {
		// Writing this as `+1` for the leap month instead leaves a gap of two before every pair and a
		// collision after it: a count that is no longer a bijection, which shifts every date past the
		// first leap month of the epoch.
		return isLeap ? rounded : rounded - (sharesNumberWithLeapMonth(tradition, year, month) ? 1 : 0);
	}
	return rounded - (isLeap ? 1 : 0);
}

// Stated once here rather than patched at each call site, for the reason
// `ScaledTradition.searchHalfWidth` is: a bound proved from a config's own values belongs beside the
// proof, not inlined at every site where the next author will miss it.
//
// Spelling it `(12, isLeap: false)` at `losarJulianDay` or the bounds of `monthsFor` is right only
// while leap months precede. Under `"after"` that names the second-to-last month of a year closing
// with a leap month 12, so the day after it places New Year one whole lunation early, with nothing
// about the result looking wrong. `test/validation/bhutan.test.ts` anchors on Janson's Bhutanese
// case, 2 and 3 March 2003 being day 30 of a leap month 12 with New Year on 4 March.
/**
 * Returns the true month count of the **chronologically last** month of Tibetan year `Y`.
 *
 * @remarks
 * "The last month of the year" is not `(12, isLeap: false)` in general. The two positions are
 * mirror images at the two ends of a year. Under
 * {@link ../traditions/types.TraditionConfig.leapMonthPosition} `"before"` a year may **open** with
 * a leap month 1 — the years beginning in 2000 and 2019 do, under `PHUGPA` and `PHUGPA_HENNING`,
 * and Janson's Losar remark records the first. Under `"after"` it may instead **close** with a
 * leap month 12, and then `(12, isLeap: false)` names the second-to-last month — the years
 * beginning in 2002 and 2021 do, under `BHUTAN` and `BHUTAN_HENNING`.
 */
export function lastMonthCountOfYear(tradition: TraditionConfig, year: number): number {
	// Only "after" can close a year with a leap month; under "before" the leap twin of month 12 sits
	// *inside* the year and the regular month 12 still ends it.
	const closesWithLeapMonth =
		tradition.leapMonthPosition === "after" && sharesNumberWithLeapMonth(tradition, year, 12);
	return trueMonthCount(tradition, year, 12, closesWithLeapMonth);
}

// The first is a **ceiling**. PDF-extracted text renders it as a floor, which shifts months by one
// at boundaries and produces a calendar that is plausible and wrong. `amod` in the second is
// equally load-bearing: `mod` would report month 12 as month 0.
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
 * The remainder test identifies the **earlier** member of a twinned pair, which under `"before"` is
 * the leap month. Under
 * {@link ../traditions/types.TraditionConfig.leapMonthPosition} `"after"` the leap month is the
 * later member, so the test is the mirrored one: `n` is leap exactly when `n − 1` is the earlier
 * member. Since `scaled(n − 1) = scaled(n) − 65 ≡ scaled(n) + 2 (mod 67)`, that condition is
 * `remainder ∈ {66, 0}`.
 *
 * `x` — and therefore the year and month number — is unaffected by the position. Both members of a
 * pair yield the same `⌈scaled/67⌉`, which is exactly why they share a number.
 *
 * Does not bound `monthCount`; a caller holding an untrusted count checks it with
 * {@link assertLunation} first.
 */
export function monthFromCount(tradition: TraditionConfig, monthCount: number): MonthIdentity {
	const scaled = 65 * monthCount + beta(tradition);
	const x = ceilDiv(scaled, 67);
	const remainder = mod(scaled, 67);
	return {
		year: ceilDiv(x, 12) - 1 + tradition.epochYear,
		month: amod(x, 12),
		isLeap:
			tradition.leapMonthPosition === "after"
				? remainder === 66 || remainder === 0
				: remainder === 1 || remainder === 2,
	};
}

// The inequality is **`≥`**. PDF-extracted text renders it as `≤`, which selects 42 of every 65
// years instead of 24 — a calendar with leap months in all the wrong places, and one that still
// produces well-formed dates.
/**
 * Returns whether year `Y` contains a leap month, by Janson's closed form.
 *
 * @remarks
 * `(24·Y + γ*) mod 65 ≥ 41`, with `γ* = 33` for `PHUGPA` and `PHUGPA_HENNING` and `γ* = 28` for
 * `BHUTAN` and `BHUTAN_HENNING`; the 41 and the 65 do not vary with the config.
 *
 * This is an independent derivation from the {@link sharesNumberWithLeapMonth} route, which tests the
 * intercalation index directly. The two agree for every year, and the test suite asserts that as a
 * cross-check.
 */
export function isLeapYear(tradition: TraditionConfig, year: number): boolean {
	return mod(24 * year + gammaStar(tradition), 65) >= 41;
}

/**
 * Returns the number of the leap month in a leap year, or `undefined` if the year has none.
 *
 * @remarks
 * `M = ⌊33 − ((24·Y + γ*) mod 65)/2⌋`. Janson notes that for a non-leap year this yields an
 * impossible `M ≥ 13`, which is how the absence is detected.
 *
 * The number is the one the leap month shares with its twin, whichever of the two is the leap
 * month under the config's `leapMonthPosition`.
 */
export function leapMonthOfYear(tradition: TraditionConfig, year: number): number | undefined {
	// `⌊(66 − x)/2⌋` keeps the halving integer, rather than producing a fraction to floor.
	const x = mod(24 * year + gammaStar(tradition), 65);
	const month = floorDiv(66 - x, 2);
	return month <= 12 ? month : undefined;
}

/**
 * How a lunar day's number appears in the calendar — Janson §6.
 *
 * @remarks
 * Calendar days are 24 hours; lunar days vary, Janson says, between about 21.5 and 25.7 hours. The
 * mismatch means the numbering is not always one-to-one, and the labelling rule resolves it: **a
 * calendar day is named by the lunar day current at its start**, equivalently a lunar day names the
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

/**
 * The calendar-day outcome for one lunar day, discriminated on `kind`, so a reader narrows on the kind
 * before it can read a Julian day and a skipped day has none to read.
 */
export type DayClassification =
	| {
			kind: "normal";
			/** The Julian day number carrying this date. */
			julianDay: number;
	  }
	| {
			kind: "doubled";
			/**
			 * The **second** of the two days carrying this date — the ordinary one. The first is
			 * `leapJulianDay`.
			 */
			julianDay: number;
			/** The first of the pair — the leap day almanacs mark "Extra". */
			leapJulianDay: number;
	  }
	| { kind: "skipped" };

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
		return { kind: "skipped" };
	}
	if (julianDay - previous >= 2) {
		return { kind: "doubled", julianDay, leapJulianDay: julianDay - 1 };
	}
	return { kind: "normal", julianDay };
}

/**
 * The Julian day number of the last calendar day of true month `n`.
 *
 * @remarks
 * Simply `⌊true_date(30, n)⌋`. Janson §8 notes this is correct even when day 30 is itself
 * repeated or skipped, which is what makes it a safe basis for month boundaries.
 * It is not bounded by the tradition's exact range; callers bound the result.
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
 * source of errors in the tables of one published calendar source, Schuh's.
 */
export function firstDayOfMonth(scaled: ScaledTradition, monthCount: number): number {
	return lastDayOfMonth(scaled, monthCount - 1) + 1;
}

/**
 * The Julian day number of Losar — Tibetan New Year — beginning in Gregorian year `Y`.
 *
 * @remarks
 * One day after the last day of the preceding year's last month. Janson §8 recommends this route,
 * stated for month 12, because the alternatives break in two real cases: the year may open with a
 * **leap month 1**, as the year beginning in 2000 CE did under `PHUGPA`, and its first day may be
 * **day 2** when day 1 is skipped.
 * Working back from the previous year's last month is correct in both.
 * That month is {@link lastMonthCountOfYear}'s, which under `BHUTAN` can be a leap month 12.
 *
 * Janson's Losar remark confirms that Losar is the first day of the year even when that day falls
 * in a leap month, unlike other holidays which are usually not observed in leap months.
 */
export function losarJulianDay(
	scaled: ScaledTradition,
	tradition: TraditionConfig,
	year: number,
): number {
	return lastDayOfMonth(scaled, lastMonthCountOfYear(tradition, year - 1)) + 1;
}
