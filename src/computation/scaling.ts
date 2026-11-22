/**
 * Derives a tradition's exact-integer working representation from its {@link TraditionConfig}.
 *
 * @remarks
 * This module exists so that no denominator is ever written down as a literal. Janson's
 * constants are rationals with fixed denominators; scaling them onto a common denominator makes
 * every subsequent addition a plain integer operation, with no gcd normalisation and no floating
 * point.
 *
 * The common denominator `D` is **not** a universal constant. It is the least common multiple of
 * the denominators this particular tradition's constants produce, and it differs between
 * configs: `PHUGPA` and `BHUTAN` give 102,317,040, while `PHUGPA_HENNING` and `BHUTAN_HENNING`
 * give 1,534,755,600, which Janson's Tsurphu constants give too. Deriving it is what lets a
 * further tradition be added as data rather than as a code change.
 *
 * Deriving it also handles the `a₂` fork for free: Henning's `a₂` is 3781/105,840 where the
 * almanacs' is 1/28, which changes the anomaly denominator and hence `D`, with no other edit.
 *
 * @packageDocumentation
 */

import type { MeanMotion, Rational, TraditionConfig } from "../traditions/types.js";
// A value-import cycle: `traditions/validate.ts` imports this file back. It is safe only while every reference
// across it sits inside a function body; a module-level use of either side's exports would hit a
// TDZ `ReferenceError` whose appearance depends on which barrel loads first. It stays because the validator
// runs `deriveScaling` so a config cannot pass one export and fail another, and `scalingFor` needs
// the validated copy.
import {
	assertArgumentsFit,
	assertCommonDenominatorExact,
	assertDerivable,
	assertMansionExact,
	assertMeanMotionExact,
	validatedTradition,
} from "../traditions/validate.js";
import { ceilDiv, gcd, lcm, scaleTo } from "./arithmetic.js";
import { mansionDenominatorParts } from "./corrections.js";

/** A {@link MeanMotion} with each coefficient expressed as an integer over a shared denominator. */
export interface ScaledMeanMotion {
	/** The denominator all three numerators share. */
	den: number;
	/** `perMonth` scaled by {@link ScaledMeanMotion.den}. */
	perMonth: number;
	/** `perDay` scaled by {@link ScaledMeanMotion.den}. */
	perDay: number;
	/** `atEpoch` scaled by {@link ScaledMeanMotion.den}. */
	atEpoch: number;
}

/** A tradition's constants, pre-scaled onto exact integer denominators. */
export interface ScaledTradition {
	/** The configuration this was derived from. */
	tradition: TraditionConfig;

	/** Mean date coefficients. Its denominator is 11,312 for all four shipped configs. */
	meanDate: ScaledMeanMotion;

	/** Mean solar longitude coefficients. */
	meanSun: ScaledMeanMotion;

	/** Lunar anomaly coefficients. */
	lunarAnomaly: ScaledMeanMotion;

	/**
	 * Denominator of the `moon_tab` argument, `28 · anomaly_moon`.
	 *
	 * @remarks
	 * 126 for `PHUGPA` and `BHUTAN`, 3,780 for the Henning pair. The argument numerator over this
	 * denominator is the anomaly numerator times {@link ScaledTradition.moonTabArgFactor}, which is
	 * 1 when 28 divides the anomaly denominator.
	 */
	moonTabArgDen: number;

	/**
	 * `28 / gcd(28, anomaly denominator)`, by which the anomaly numerator is multiplied to be the
	 * `moon_tab` argument's numerator. 1 for all four shipped configs.
	 */
	moonTabArgFactor: number;

	/**
	 * Denominator of the `sun_tab` argument, `12 · (mean_sun − 1/4)`.
	 *
	 * @remarks
	 * 402 for all four shipped configs. The argument numerator over this denominator is the solar
	 * anomaly numerator times {@link ScaledTradition.sunTabArgFactor}.
	 */
	sunTabArgDen: number;

	/**
	 * `12 / gcd(12, lcm(mean-sun denominator, 4))`, by which the solar anomaly numerator is
	 * multiplied to be the `sun_tab` argument's numerator. 1 for all four shipped configs.
	 */
	sunTabArgFactor: number;

	/**
	 * Denominator of the moon equation, {@link ScaledTradition.moonTabArgDen} times 60: the equation
	 * is in sixtieths of a day. One of the three denominators {@link ScaledTradition.commonDenominator}
	 * is the `lcm` of.
	 */
	moonEquationDen: number;

	/**
	 * Denominator of the sun equation, {@link ScaledTradition.sunTabArgDen} times 60. One of the
	 * three denominators {@link ScaledTradition.commonDenominator} is the `lcm` of.
	 */
	sunEquationDen: number;

	/**
	 * Numerator of `1/4` over the mean-sun denominator, used to form the solar anomaly.
	 *
	 * @remarks
	 * Janson writes this as `6,45 ⟨27,60⟩` in the traditional notation.
	 */
	quarterCircle: number;

	/**
	 * The common denominator `D`, on which `true_date` is an exact integer.
	 *
	 * @remarks
	 * `lcm` of the mean-date denominator and the two correction denominators, each of the latter
	 * being its table-argument denominator times 60.
	 */
	commonDenominator: number;

	/**
	 * The largest Julian day number for which `JD · D` stays a safe integer.
	 *
	 * @remarks
	 * 88,032,250 for `PHUGPA` and `BHUTAN` (about 8.8 × 10⁷) and 5,868,816 for the Henning pair
	 * (about 5.9 × 10⁶). Both are far beyond any date the calendar is meaningfully applied to —
	 * today's JD is about 2.46 × 10⁶ — but the smaller is thin enough to be worth asserting rather
	 * than assuming.
	 *
	 * Never more than 97,559,412, the nearer end of Temporal's own range, so every Julian day inside
	 * the bound names a `Temporal.PlainDate`. No shipped config reaches that cap.
	 */
	exactToJulianDay: number;

	/**
	 * How far either side of the mean-motion estimate `isoToTibetan` must search, in lunar days.
	 *
	 * @remarks
	 * Derived from the tradition's own `moonTab` and `sunTab`, so a config with larger tables has a
	 * wider window. It is 3 for each of the four shipped configs, whose tables share the maxima 25
	 * and 11 and so bound the correction of the date by `(25 + 11)/60 = 0.6` days.
	 */
	searchHalfWidth: number;
}

/** The largest absolute value in a correction table, which is what bounds its equation. */
function maxMagnitude(table: readonly number[]): number {
	return table.reduce((largest, entry) => Math.max(largest, Math.abs(entry)), 0);
}

/**
 * Reduces a rational to lowest terms.
 *
 * @remarks
 * So that a tradition's common denominator, and with it the range the arithmetic is exact over,
 * depends on the rationals a config holds and not on how its author wrote them: `5/(5d)` and `1/d`
 * are one coefficient.
 */
function lowestTerms(r: Rational): Rational {
	const divisor = gcd(r.num, r.den);
	// exact: a gcd divides both its arguments, so both quotients are whole numbers.
	return { num: r.num / divisor, den: r.den / divisor };
}

/**
 * Scales one mean motion's three coefficients onto the lcm of their reduced denominators and of
 * `alsoDivides`, a factor the caller needs the denominator to carry.
 */
function scaleMeanMotion(motion: MeanMotion, alsoDivides = 1): ScaledMeanMotion {
	const [perMonth, perDay, atEpoch] = [motion.perMonth, motion.perDay, motion.atEpoch].map(
		lowestTerms,
	) as [Rational, Rational, Rational];
	const den = lcm(lcm(lcm(perMonth.den, perDay.den), atEpoch.den), alsoDivides);
	return {
		den,
		perMonth: scaleTo(perMonth.num, perMonth.den, den),
		perDay: scaleTo(perDay.num, perDay.den, den),
		atEpoch: scaleTo(atEpoch.num, atEpoch.den, den),
	};
}

// `Temporal.PlainDate` spans epoch days −100,000,001 to +100,000,000 (ISO −271821-04-19 to
// +275760-09-13; one day wider than `Instant` at the start). The Unix epoch is JD 2,440,588, so that is
// JD −97,559,413 to 102,440,588. The bound is 97,559,412, one day inside the negative end, so the
// exact range stays symmetric about zero, which
// `assertExactJulianDay` and `nextObservance`'s walk both assume. A consumer config with small
// denominators would otherwise have a safe-integer bound past Temporal's, and a day inside it would
// throw Temporal's uncoded `RangeError` (adversarial review X1.1). No shipped config reaches it.
const TEMPORAL_JULIAN_DAY_BOUND = 97_559_412;

/**
 * Computes the exact-integer working representation of a tradition.
 *
 * @remarks
 * Pure and cheap, but the result is worth hoisting out of loops — it performs a handful of
 * gcd computations. Nothing here depends on a date.
 *
 * Does not check the shape of `tradition`: a value that is not a config reaches an uncoded
 * `TypeError`. {@link scalingFor} validates first.
 *
 * @param tradition - A config that has passed validation.
 * @throws RangeError with code `TCT_INVALID_TRADITION_CONFIG` if a mean motion cannot be put over
 * one safe-integer denominator, if the common denominator is not a safe integer or is too large for
 * the lunar mansion to be computed exactly, if the correction tables imply a search window wider than
 * the engine accepts (30 lunar days), or if a table argument could leave the exactly representable
 * integers within the exact range.
 *
 * @example
 * ```ts
 * const scaled = deriveScaling(PHUGPA);
 * scaled.commonDenominator; // 102_317_040
 * ```
 */
export function deriveScaling(tradition: TraditionConfig): ScaledTradition {
	// The factor each motion's denominator must carry is written once, here, and the same value goes
	// to the exactness check and to the scaling, so the two cannot certify different lcms. The solar
	// anomaly is mean_sun − 1/4, so the mean sun's denominator carries a factor of 4 and
	// `quarterCircle` is exact for any coefficients.
	const scaled = (name: "meanDate" | "meanSun" | "lunarAnomaly", alsoDivides: number) => {
		assertMeanMotionExact(tradition, name, alsoDivides);
		return scaleMeanMotion(tradition[name], alsoDivides);
	};
	const meanDate = scaled("meanDate", 1);
	const meanSun = scaled("meanSun", 4);
	const lunarAnomaly = scaled("lunarAnomaly", 1);

	// moon_tab takes 28 · anomaly_moon. Writing 28 · x/den as (28/g · x)/(den/g) with g = gcd(28, den)
	// gives the argument over `den/g` whatever `den` is, so two configs holding the same rationals
	// over different denominators read the table at the same point. For Phugpa 28 divides 3528, so
	// g = 28, the factor is 1 and the denominator is 126.
	const moonGcd = gcd(28, lunarAnomaly.den);
	// exact: a gcd divides its arguments, so this quotient is a whole number with no rounding.
	const moonTabArgDen = lunarAnomaly.den / moonGcd;
	// exact: as above.
	const moonTabArgFactor = 28 / moonGcd;

	// sun_tab takes 12 · (mean_sun − 1/4). The subtraction needs 4 to divide the denominator, which
	// `scaleMeanMotion(…, 4)` guarantees; the multiplication is the same gcd split as above.
	const sunAnomalyDen = meanSun.den;
	const sunGcd = gcd(12, sunAnomalyDen);
	// exact: a gcd divides its arguments, as above.
	const sunTabArgDen = sunAnomalyDen / sunGcd;
	// exact: as above.
	const sunTabArgFactor = 12 / sunGcd;

	// true_date = mean_date + moon_equ/60 − sun_equ/60, so D must absorb all three. One list, given to
	// the check and to the lcm alike, so the check guards the D actually used.
	const moonEquationDen = moonTabArgDen * 60;
	const sunEquationDen = sunTabArgDen * 60;
	const parts = [meanDate.den, moonEquationDen, sunEquationDen];
	assertCommonDenominatorExact(tradition, parts);
	const commonDenominator = parts.reduce(lcm);
	// The lunar mansion multiplies the common denominator by 27 twice; refused here, so a config
	// that passes validation never meets an internal error in `./astrology`.
	assertMansionExact(tradition, mansionDenominatorParts({ sunTabArgDen, commonDenominator }));

	// The correction bound, in lunar days, from this tradition's own tables. The bound is a function
	// of the injected correction tables, so writing `3` at the search loop would hardcode a Phugpa
	// constant into a computation over data a consumer supplies. A wider `moonTab` would then break
	// the window silently: the search finds no lunar day ending on the target, and either reports an
	// internal error or returns a date that does not convert back.
	//
	// The derivation is Janson §7 read as an inequality:
	//
	// - `true_date = mean_date + moon_equ/60 − sun_equ/60`, and each equation is bounded by the
	//   largest magnitude in its table, so `|true_date − mean_date| ≤ (max|moonTab| + max|sunTab|)/60`
	//   days. The four shipped configs share the maxima 25 and 11, which gives `(25 + 11)/60 = 0.6`.
	// - One lunar day is `meanDate.perDay / meanDate.den` calendar days, so dividing converts that
	//   bound from calendar days into lunar days.
	// - `Math.round` on the estimate contributes at most a further half a lunar day, and the `+ 2`
	//   below absorbs that with a full unit to spare.
	//
	// Computed with `ceilDiv` on integers, never a floating-point divide, so the result is
	// identical on every platform like everything else here.
	//
	// Do not widen the window at the call site "to be safe". If a date is not found inside it the
	// fault is elsewhere, and `isoToTibetan` says so with `TCT_INTERNAL`.
	const equationBound = maxMagnitude(tradition.moonTab) + maxMagnitude(tradition.sunTab);
	const searchHalfWidth = ceilDiv(equationBound * meanDate.den, 60 * meanDate.perDay) + 2;

	assertDerivable(tradition, searchHalfWidth);

	// exact: a safe-integer quotient floored to a bound, not a calendar quantity, then clamped to
	// Temporal's range so every day inside the bound converts.
	const exactToJulianDay = Math.min(
		Math.floor(Number.MAX_SAFE_INTEGER / commonDenominator),
		TEMPORAL_JULIAN_DAY_BOUND,
	);
	assertArgumentsFit(tradition, exactToJulianDay, meanDate, [
		{ motion: lunarAnomaly, factor: moonTabArgFactor, name: "lunarAnomaly" },
		{ motion: meanSun, factor: sunTabArgFactor, name: "meanSun" },
	]);

	return {
		tradition,
		meanDate,
		meanSun,
		lunarAnomaly,
		moonTabArgDen,
		moonTabArgFactor,
		sunTabArgDen,
		sunTabArgFactor,
		moonEquationDen,
		sunEquationDen,
		quarterCircle: scaleTo(1, 4, meanSun.den),
		commonDenominator,
		exactToJulianDay,
		searchHalfWidth,
	};
}

/** Memoised scaling, so repeated conversions do not redo the gcd work. */
const scalingCache = new WeakMap<TraditionConfig, ScaledTradition>();

// It lives here rather than beside its callers: one definition is one cache, so a config validated
// through one entry point is not revalidated through the next, and a change to the validation
// cannot land in one copy and not the others.

/**
 * Validates a tradition config and returns its scaling, derived once per config object.
 *
 * @remarks
 * The date-computing code reaches a tradition's arithmetic through here, and the cache means the
 * work happens once per config object, so validation costs nothing after the first call. That is
 * what lets the check be thorough without touching the multi-century sweeps.
 *
 * @param tradition - The config to validate and derive from.
 * @throws RangeError with code `TCT_INVALID_TRADITION_CONFIG` if the config is not a valid
 * tradition (see `validatedTradition`) or its constants cannot be scaled exactly (see
 * {@link deriveScaling}).
 */
export function scalingFor(tradition: TraditionConfig): ScaledTradition {
	const cached = scalingCache.get(tradition);
	if (cached !== undefined) return cached;
	const copy = validatedTradition(tradition);
	const derived = deriveScaling(copy);
	scalingCache.set(copy, derived);
	scalingCache.set(tradition, derived);
	return derived;
}
