/**
 * The mean astronomical functions of Janson §7.
 *
 * @remarks
 * Each is linear in the true month count `n` and the lunar day `d`:
 *
 * ```text
 * mean_date(d, n)     = n·m₁ + d·m₂ + m₀
 * mean_sun(d, n)      = n·s₁ + d·s₂ + s₀
 * anomaly_moon(d, n)  = n·a₁ + d·a₂ + a₀
 * ```
 *
 * Every value returned here is an **integer numerator** over the corresponding denominator in
 * {@link ScaledTradition} — never a fraction. Dividing at this stage would introduce the
 * floating-point error the whole design exists to avoid.
 *
 * Because `m₂ = m₁/30` and `s₂ = s₁/30`, mean date and mean sun are really linear in the total
 * lunar day count `30n + d`, so they increase smoothly across month boundaries. The anomaly is
 * the exception: the standard `a₂ = 1/28` does not equal `a₁/30`, which puts a small jump at the
 * start of each month. That discrepancy is the whole substance of the `a₂` fork.
 *
 * @packageDocumentation
 */

import type { ScaledMeanMotion, ScaledTradition } from "./scaling.js";

/**
 * Evaluates a scaled linear mean motion at lunar day `d` of month `n`.
 *
 * @returns The integer numerator over `motion.den`.
 */
function evaluate(motion: ScaledMeanMotion, day: number, monthCount: number): number {
	return monthCount * motion.perMonth + day * motion.perDay + motion.atEpoch;
}

/**
 * Mean date — Janson's *gza' bar pa* — at the end of lunar day `d` in true month `n`.
 *
 * @remarks
 * Returned as a numerator over {@link ScaledTradition.meanDate}`.den`. Because the tradition's
 * `m₀` carries a Julian-day offset, the value is a mean Julian date rather than a bare fraction:
 * dividing by the denominator gives roughly the JD, and `true_date` corrects it by at most
 * 0.6 days.
 *
 * @param scaled - The tradition's derived constants.
 * @param day - Lunar day within the month. Janson's day 0 is the end of the previous month, and
 * is used when computing month boundaries.
 * @param monthCount - True month count `n`, zero at the epoch.
 *
 * @example
 * ```ts
 * const scaled = deriveScaling(PHUGPA);
 * meanDate(scaled, 0, 0) / scaled.meanDate.den; // ≈ 2015501.85, the epoch's mean date
 * ```
 */
export function meanDate(scaled: ScaledTradition, day: number, monthCount: number): number {
	return evaluate(scaled.meanDate, day, monthCount);
}

/**
 * Mean solar longitude — Janson's *nyi ma bar pa* — in units of full circles.
 *
 * @remarks
 * Returned as a numerator over {@link ScaledTradition.meanSun}`.den`. Only the fractional part
 * is meaningful as a longitude, but the unreduced value is kept so that the caller can subtract
 * a quarter circle exactly before reducing.
 */
export function meanSun(scaled: ScaledTradition, day: number, monthCount: number): number {
	return evaluate(scaled.meanSun, day, monthCount);
}

/**
 * Lunar anomaly — Janson's *ril-po dang cha-shas* — in units of full circles.
 *
 * @remarks
 * Returned as a numerator over {@link ScaledTradition.lunarAnomaly}`.den`. Measured from the
 * moon's apogee, where Western astronomy measures from perigee; the two therefore differ by half
 * a circle.
 *
 * This numerator times {@link ScaledTradition.moonTabArgFactor} is the `moon_tab` argument over
 * {@link ScaledTradition.moonTabArgDen}; the factor is 1 when 28 divides the anomaly denominator.
 */
export function lunarAnomaly(scaled: ScaledTradition, day: number, monthCount: number): number {
	return evaluate(scaled.lunarAnomaly, day, monthCount);
}

/**
 * Solar anomaly, `mean_sun − 1/4`, as a numerator over the mean-sun denominator.
 *
 * @remarks
 * Janson writes the quarter circle as `6,45 ⟨27,60⟩` in the traditional mixed-radix notation.
 * The subtraction is exact because 4 divides the mean-sun denominator.
 */
export function solarAnomaly(scaled: ScaledTradition, day: number, monthCount: number): number {
	return meanSun(scaled, day, monthCount) - scaled.quarterCircle;
}
