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
 * traditions — Phugpa gives 102,317,040 while Tsurphu gives 1,534,755,600. Deriving it is what
 * lets a second tradition be added as data rather than as a code change.
 *
 * Deriving it also handles the `a₂` fork for free: Henning's value has denominator 105,840
 * rather than 28, which changes the anomaly denominator and hence `D`, with no other edit.
 *
 * @packageDocumentation
 */

import type { MeanMotion, Rational, TraditionConfig } from "../traditions/types.js";
import { gcd, lcm, scaleTo } from "./arithmetic.js";

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
	config: TraditionConfig;

	/** Mean date coefficients. Its denominator is 11,312 for Phugpa. */
	meanDate: ScaledMeanMotion;

	/** Mean solar longitude coefficients. */
	meanSun: ScaledMeanMotion;

	/** Lunar anomaly coefficients. */
	lunarAnomaly: ScaledMeanMotion;

	/**
	 * Denominator of the `moon_tab` argument, `28 · anomaly_moon`.
	 *
	 * @remarks
	 * 126 for Phugpa. Because 28 divides the anomaly denominator, the anomaly numerator *is* the
	 * argument numerator over this denominator — no rescaling is needed at the call site.
	 */
	moonTabArgDen: number;

	/**
	 * Denominator of the `sun_tab` argument, `12 · (mean_sun − 1/4)`.
	 *
	 * @remarks
	 * 402 for Phugpa.
	 */
	sunTabArgDen: number;

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
	 * Roughly 8.8 × 10⁷ for Phugpa and 5.9 × 10⁶ for Tsurphu. Both are far beyond any date the
	 * calendar is meaningfully applied to — today's JD is about 2.46 × 10⁶ — but the second is
	 * thin enough to be worth asserting rather than assuming.
	 */
	exactToJulianDay: number;
}

/** Scales one mean motion's three coefficients onto the lcm of their denominators. */
function scaleMeanMotion(motion: MeanMotion): ScaledMeanMotion {
	const den = [motion.perMonth, motion.perDay, motion.atEpoch]
		.map((r: Rational) => r.den)
		.reduce(lcm);
	return {
		den,
		perMonth: scaleTo(motion.perMonth.num, motion.perMonth.den, den),
		perDay: scaleTo(motion.perDay.num, motion.perDay.den, den),
		atEpoch: scaleTo(motion.atEpoch.num, motion.atEpoch.den, den),
	};
}

/**
 * Computes the exact-integer working representation of a tradition.
 *
 * @remarks
 * Pure and cheap, but the result is worth hoisting out of loops — it performs a handful of
 * gcd computations. Nothing here depends on a date.
 *
 * @param config - The tradition to derive from.
 * @throws RangeError if a constant's denominator cannot be represented exactly, which would
 * indicate a malformed config rather than a calendar problem.
 *
 * @example
 * ```ts
 * const scaled = deriveScaling(PHUGPA);
 * scaled.commonDenominator; // 102_317_040
 * ```
 */
export function deriveScaling(config: TraditionConfig): ScaledTradition {
	const meanDate = scaleMeanMotion(config.meanDate);
	const meanSun = scaleMeanMotion(config.meanSun);
	const lunarAnomaly = scaleMeanMotion(config.lunarAnomaly);

	// moon_tab takes 28 · anomaly_moon. Multiplying a rational over `den` by 28 reduces the
	// denominator by gcd(28, den) — for Phugpa 28 divides 3528 exactly, giving 126.
	const moonTabArgDen = lunarAnomaly.den / gcd(28, lunarAnomaly.den);

	// sun_tab takes 12 · (mean_sun − 1/4). The subtraction needs 4 to divide the denominator,
	// which it does for every tradition Janson gives; the multiplication then reduces by 12.
	const sunAnomalyDen = lcm(meanSun.den, 4);
	const sunTabArgDen = sunAnomalyDen / gcd(12, sunAnomalyDen);

	// true_date = mean_date + moon_equ/60 − sun_equ/60, so D must absorb all three.
	const commonDenominator = [meanDate.den, moonTabArgDen * 60, sunTabArgDen * 60].reduce(lcm);

	return {
		config,
		meanDate,
		meanSun,
		lunarAnomaly,
		moonTabArgDen,
		sunTabArgDen,
		quarterCircle: scaleTo(1, 4, meanSun.den),
		commonDenominator,
		exactToJulianDay: Math.floor(Number.MAX_SAFE_INTEGER / commonDenominator),
	};
}
