/**
 * Month numbering, the true month count, and leap months — Janson §5.
 *
 * @remarks
 * The Tibetan calendar rests on the relation **67 lunar months = 65 solar months**, treated as
 * exact. Leap months are spaced to match it: two leap months per 65 regular months, with
 * alternating gaps of 32 and 33 regular months. It follows that the pattern repeats every 65
 * years, in which each month number 1–12 is the leap month exactly twice.
 *
 * A leap month **shares its number with an adjacent month**, so a leap year contains two months
 * carrying one number. Which of the two is the leap month is the tradition's to say, through
 * {@link ../traditions/types.TraditionConfig.leapMonthPosition}: the first under Phugpa, Tsurphu
 * and the Mongolian version, the second under the Bhutanese. A month is therefore identified by
 * the triple `(Y, M, isLeap)`, and separately by a linear *true month count* `n` that ignores year
 * boundaries and is zero at the epoch.
 *
 * @packageDocumentation
 */

import { rangeError } from "../errors.js";
import type { TraditionConfig } from "../traditions/types.js";
import { amod, ceilDiv, floorDiv, mod } from "./arithmetic.js";
import { julianDayOfLunarDay } from "./corrections.js";
import type { ScaledTradition } from "./scaling.js";

/**
 * Rejects a year for which the closed-form arithmetic would overflow `Number.MAX_SAFE_INTEGER`.
 *
 * @remarks
 * Two different closed forms route through this one guard, and they overflow at two different
 * points because they are stated in two different variables:
 *
 * - {@link solarMonthsSinceEpoch} (reached from {@link sharesNumberWithLeapMonth}, hence `tibetanToIso` and
 *   `daysInMonth`) computes `12·(year − epochYear) + …` — **relative** to the epoch.
 * - {@link isLeapYear} and {@link leapMonthOfYear} compute `24·year + γ*` directly on the
 *   **absolute** Janson *Y* — not relative to the epoch at all, so a year far from the epoch in
 *   either direction overflows this one at roughly half the relative formula's magnitude, even
 *   while `|year − epochYear|` still looks comfortably in range.
 *
 * Both silently lose precision past 2⁵³ rather than throwing, so an absurdly large year would come
 * back as a confident `false` or `undefined` computed from arithmetic noise instead of refusing to
 * answer. The bound taken is the **tighter** of the two, converted to the same `|year − epochYear|`
 * terms this guard is stated in via the triangle inequality
 * (`|year| ≤ |epochYear| + |year − epochYear|`), so a single check protects whichever formula the
 * caller goes on to evaluate — over-protecting the relative formula costs nothing, since every
 * real year is nowhere near either limit.
 *
 * The bound is **derived from `config.epochYear` at each call**, never a literal: `epochYear`
 * is injected per tradition, so a bound computed once for Phugpa and hardcoded would be silently
 * wrong for a tradition with a different epoch. The arithmetic here is cheap enough that, unlike
 * {@link ScaledTradition.searchHalfWidth}, it needs no memoisation to stay off the hot path.
 *
 * `subject` is a thunk for the same reason as {@link assertExactJulianDay}'s: this guard runs on
 * every closed-form call, and building the message eagerly would cost every success to save one
 * throw.
 */
export function assertClosedFormYear(
	subject: () => string,
	year: number,
	config: TraditionConfig,
): void {
	// solarMonthsSinceEpoch: 12·(year − epochYear) + month − epochMonth must stay safe. `12` is a
	// generous margin for the trailing `+ month − epochMonth`, which is at most 11 in magnitude
	// (month and epochMonth each range 1..12, so their difference is at most 11).
	// exact: both operands are safe integers, so the IEEE quotient is within one ulp of the true
	// value and Math.floor lands on the right integer. This computes a *bound*, never a calendar
	// quantity — a bound one off would only narrow the accepted range, not shift a date.
	const relativeLimit = Math.floor((Number.MAX_SAFE_INTEGER - 12) / 12);
	// isLeapYear / leapMonthOfYear: 24·year + γ* must stay safe, on the *absolute* year. γ* is
	// `mod(…, 65)`, so at most 64; `65` is a generous margin. Converted to the same
	// |year − epochYear| terms via the triangle inequality: if |year − epochYear| ≤ this limit
	// then |year| ≤ |epochYear| + limit ≤ floor((MAX_SAFE_INTEGER − 65) / 24), which is what
	// 24·year needs — the right-hand side here is that raw quantity, not `absoluteLimit` itself,
	// since `absoluteLimit` is that quantity already reduced by `|epochYear|`.
	// exact: as above — a safe-integer quotient floored to a bound, not a calendar quantity.
	const absoluteLimit =
		Math.floor((Number.MAX_SAFE_INTEGER - 65) / 24) - Math.abs(config.epochYear);
	// absoluteLimit is always the binding constraint here, for any config, not merely realistic
	// ones: relativeLimit is ~7.5e14 (Number.MAX_SAFE_INTEGER / 12), and absoluteLimit is
	// ~3.75e14 minus a non-negative `|epochYear|`, so absoluteLimit ≤ ~3.75e14 < relativeLimit
	// unconditionally. The `Math.min` therefore never actually selects `relativeLimit` — kept as
	// defensive code rather than removed, since it costs nothing and the proof lives only in this
	// comment.
	const limit = Math.min(relativeLimit, absoluteLimit);
	if (Math.abs(year - config.epochYear) > limit) {
		throw rangeError(
			"TCT_OUTSIDE_EXACT_RANGE",
			`${subject()} is outside the range where this tradition's closed-form year arithmetic ` +
				`stays exact: |year − epochYear| must be at most ${limit}, received ${year}`,
		);
	}
}

/**
 * Bounds a true month count so {@link monthFromCount} cannot overflow into confident nonsense.
 *
 * @remarks
 * The counterpart of {@link assertClosedFormYear} for the *inverse* direction, and it exists for the
 * same reason. `monthFromCount` computes `65·monthCount + β` before anything else, so a large enough
 * count loses precision past 2⁵³ and silently returns a month identity built from arithmetic noise —
 * exactly the failure `solarMonthsSinceEpoch` had until it was bounded.
 *
 * `assertClosedFormYear` cannot cover this: it is stated in `|year − epochYear|`, and the year is
 * not known until *after* the overflowing multiplication has happened.
 *
 * The bound is **derived from the config at each call**, never a literal. `β` is built entirely from
 * injected fields — `67·M₀ − β* − (65 − threshold)` — so a tradition with a different epoch month,
 * intercalation index or leap rule gets a different limit.
 */
export function assertLunation(
	subject: () => string,
	monthCount: number,
	config: TraditionConfig,
): void {
	// 65·monthCount + β must stay inside the safe range. Subtracting |β| rather than β covers the
	// negative direction with the same limit.
	// exact: a safe-integer quotient floored to a bound. `beta(config)` is itself integer-only.
	const limit = Math.floor((Number.MAX_SAFE_INTEGER - Math.abs(beta(config))) / 65);
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
 * It reproduces every value Janson publishes:
 *
 * | Tradition | M₀ | β* | threshold | derived β | Janson |
 * |-----------|----|----|-----------|-----------|--------|
 * | Phugpa    | 3  | 61 | 48        | 123       | 123    |
 * | Mongolian | 3  | 10 | 46        | 172       | 172    |
 * | Bhutanese | 3  | 2  | 57        | 191       | 191    |
 * | Tsurphu   | 3  | 59 | 0         | 77        | 142    |
 *
 * The Tsurphu row is agreement, not a discrepancy: `142 − 77 = 65`, and β is only ever used
 * modulo 65, so the two are the same constant. Janson's own text says as much, giving different
 * β for two Tsurphu epochs that are likewise congruent.
 */
export function beta(config: TraditionConfig): number {
	return (
		67 * config.epochMonth - config.intercalationIndexAtEpoch - (65 - config.leapIndexThreshold)
	);
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
 * Whether regular month `M` of year `Y` shares its number with a leap month — its *twin*.
 *
 * @remarks
 * A leap month is inserted when the intercalation index is
 * {@link ../traditions/types.TraditionConfig.leapIndexThreshold} or one more than it — **48 or 49**
 * for Phugpa, but 0-or-1 for Tsurphu, 46-or-47 for the Mongolian version and 57-or-58 for the
 * Bhutanese. The threshold is config, never a literal.
 *
 * **Deliberately says nothing about which side the twin falls on**, and it was named `hasLeapTwin`
 * with a docblock reading "is *preceded by* a leap month" until 2026-08-16. The predicate is the
 * same either way — the index test does not change — but the claim was Phugpa's, and false for
 * Bhutan, which places the leap month after. Direction is
 * {@link ../traditions/types.TraditionConfig.leapMonthPosition}'s to state; this answers only
 * whether there are two months of this number at all.
 *
 * Named for the month rather than for the year because the question is per-**month**. The public
 * `hasLeapMonth` asks a per-**year** question — does this year contain a leap month anywhere — and
 * the two must not share a name. `TCT_NO_SUCH_LEAP_MONTH` already describes the failure this
 * detects as a month having "no leap twin that year".
 */
export function sharesNumberWithLeapMonth(
	config: TraditionConfig,
	year: number,
	month: number,
): boolean {
	const index = intercalationIndex(config, year, month);
	return index === config.leapIndexThreshold || index === config.leapIndexThreshold + 1;
}

/**
 * The true month count `n` for a given month — Janson's *zla-dag*.
 *
 * @remarks
 * `n = ⌊(67·M* + β* + (65 − threshold))/65⌋ − [isLeap]`.
 *
 * The added term encodes Janson's rounding rule: the preliminary true month rounds down when the
 * intercalation index is below the tradition's
 * {@link ../traditions/types.TraditionConfig.leapIndexThreshold} and up otherwise, except that a
 * leap month always rounds down. For Phugpa the threshold is 48 and the term is Janson's familiar
 * `+17`; it is written as `65 − threshold` because the two move together and a literal `17` beside
 * a configurable rule is a silent inconsistency. Subtracting one for a leap month is what gives
 * the two months sharing a number their consecutive counts.
 *
 * `n` is zero at the epoch and increases by exactly one per month, leap months included. That
 * property is not decoration — it is what *determines* the adjustment below, and the test suite
 * sweeps two centuries to hold it.
 *
 * **Which month of a twinned pair takes the adjustment depends on
 * {@link ../traditions/types.TraditionConfig.leapMonthPosition}, and it is not a sign flip.** The
 * pair always occupies the counts `rounded − 1` and `rounded`; all that changes is which of them is
 * the leap month. Under `"before"` the leap month is the earlier, so it takes `rounded − 1` and the
 * regular month keeps `rounded`. Under `"after"` the leap month is the later, so it keeps `rounded`
 * and the **regular** month takes `rounded − 1`.
 *
 * The consequence is easy to get wrong, and an early draft of this did: under `"after"` the
 * adjustment applies to a regular month **only when it has a twin**. An untwinned month keeps
 * `rounded` under both positions. Writing it as `+1` for the leap month instead leaves a gap of two
 * before every pair and a collision after it — a count that is no longer a bijection, which shifts
 * every date past the first leap month of the epoch.
 *
 * @param isLeap - Pass `true` for the leap month of a pair. Passing `true` for a month that is
 * not a leap month yields a count belonging to a different month; use {@link sharesNumberWithLeapMonth} to
 * check first.
 *
 * **Omitting it is the likelier mistake, and it is silent.** It defaults to `false`, so a caller
 * deriving a count from a resolved date — `trueMonthCount(config, year, date.month)` — reads the
 * *regular twin* of every leap month and gets a real count for the wrong month. Nothing throws and
 * nothing looks wrong. On 2026-09-12 that produced 22 spurious failures while cross-checking the
 * lunar mansion, every one of them inside leap month 6 of 2024, and it read as a 4% error in the
 * astronomy until the failures were bucketed by month. **A `TibetanDate` carries `isLeapMonth`;
 * pass it.**
 */
export function trueMonthCount(
	config: TraditionConfig,
	year: number,
	month: number,
	isLeap = false,
): number {
	const solarMonths = solarMonthsSinceEpoch(config, year, month);
	const rounded = floorDiv(
		67 * solarMonths + config.intercalationIndexAtEpoch + (65 - config.leapIndexThreshold),
		65,
	);
	if (config.leapMonthPosition === "after") {
		return isLeap ? rounded : rounded - (sharesNumberWithLeapMonth(config, year, month) ? 1 : 0);
	}
	return rounded - (isLeap ? 1 : 0);
}

/**
 * The true month count of the **chronologically last** month of Tibetan year `Y`.
 *
 * @remarks
 * Exists because "the last month of the year" is not `(12, isLeap: false)`, and three call sites
 * spelled it that way until 2026-08-16 — {@link losarJulianDay} and both bounds of `monthsFor`.
 * That spelling is correct only while leap months precede.
 *
 * The two positions are mirror images at the two ends of a year, and the codebase knew about one of
 * them. Under {@link ../traditions/types.TraditionConfig.leapMonthPosition} `"before"` a year may
 * **open** with a leap month 1 — Janson's Remark 20, and the year beginning in 2000 did. Under
 * `"after"` it may instead **close** with a leap month 12, and then `(12, isLeap: false)` names the
 * second-to-last month: `losarJulianDay` returned the day after *that*, placing New Year one whole
 * lunation early with nothing about the result looking wrong.
 *
 * Not theoretical. `test/validation/bhutan.test.ts` anchors on 2 and 3 March 2003 being day 30 of a
 * **leap month 12**, with New Year on 4 March — Janson's own Bhutanese anchor is the failing case.
 *
 * Stated once here rather than patched at each call site, for the reason
 * {@link ScaledTradition.searchHalfWidth} is: a bound proved from a config's own values belongs
 * beside the proof, not inlined three times where the fourth author will miss it.
 */
export function lastMonthCountOfYear(config: TraditionConfig, year: number): number {
	// Only "after" can close a year with a leap month; under "before" the leap twin of month 12 sits
	// *inside* the year and the regular month 12 still ends it.
	const closesWithLeapMonth =
		config.leapMonthPosition === "after" && sharesNumberWithLeapMonth(config, year, 12);
	return trueMonthCount(config, year, 12, closesWithLeapMonth);
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
 * The remainder test identifies the **earlier** member of a twinned pair, which under `"before"` is
 * the leap month. Under
 * {@link ../traditions/types.TraditionConfig.leapMonthPosition} `"after"` the leap month is the
 * later member, so the test is the mirrored one: `n` is leap exactly when `n − 1` is the earlier
 * member. Since `scaled(n − 1) = scaled(n) − 65 ≡ scaled(n) + 2 (mod 67)`, that condition is
 * `remainder ∈ {66, 0}`.
 *
 * `x` — and therefore the year and month number — is unaffected by the position. Both members of a
 * pair yield the same `⌈scaled/67⌉`, which is exactly why they share a number.
 */
export function monthFromCount(config: TraditionConfig, monthCount: number): MonthIdentity {
	const scaled = 65 * monthCount + beta(config);
	const x = ceilDiv(scaled, 67);
	const remainder = mod(scaled, 67);
	return {
		year: ceilDiv(x, 12) - 1 + config.epochYear,
		month: amod(x, 12),
		isLeap:
			config.leapMonthPosition === "after"
				? remainder === 66 || remainder === 0
				: remainder === 1 || remainder === 2,
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
 * This is an independent derivation from the {@link sharesNumberWithLeapMonth} route, which tests the
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
	return lastDayOfMonth(scaled, lastMonthCountOfYear(config, year - 1)) + 1;
}
