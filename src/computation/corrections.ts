/**
 * The equation tables and `true_date` of Janson §7.
 *
 * @remarks
 * The mean functions assume uniform motion. The true date corrects them by the *equations* of
 * the moon and sun, each obtained by interpolating a small table — Janson notes these tables are
 * scaled approximations to a sine, and that no general sine function is used, unlike Indian
 * calendars.
 *
 * ```text
 * moon_equ  = moon_tab(28 · anomaly_moon)
 * sun_equ   = sun_tab(12 · (mean_sun − 1/4))
 * true_date = mean_date + moon_equ/60 − sun_equ/60
 * ```
 *
 * All of this is exact integer arithmetic. The interpolation multiplies through by the
 * argument's denominator rather than dividing, so no rounding occurs anywhere before the final
 * floor that yields a Julian day number.
 *
 * @packageDocumentation
 */

import { floorDiv, mod, scaleTo } from "./arithmetic.js";
import { lunarAnomaly, meanDate, solarAnomaly } from "./mean-astronomy.js";
import type { ScaledTradition } from "./scaling.js";

/**
 * Collapses negative zero to positive zero.
 *
 * @remarks
 * The symmetry rules negate table entries, and negating the zero entries yields `-0`. That is
 * numerically equal to `0` but `Object.is(-0, 0)` is false, so it would break strict equality
 * assertions and survive into any consumer comparing results. Both tables have a zero entry, and
 * both symmetry rules pass through it, so this is on the normal path rather than an edge case.
 */
function normaliseZero(value: number): number {
	return value === 0 ? 0 : value;
}

/**
 * Reads the moon equation table at an integer argument, applying Janson's symmetries.
 *
 * @remarks
 * The table is listed for 0…7 and extended by `tab(14 − i) = tab(i)` and
 * `tab(14 + i) = −tab(i)`, which makes it odd-symmetric about 14 and periodic with period 28 —
 * the shape of a sine sampled over a quarter period.
 *
 * @param table - The tradition's `moonTab`, eight values.
 * @param index - Any integer, positive or negative.
 */
export function moonTabAt(table: readonly number[], index: number): number {
	const j = mod(index, 28);
	const value =
		j <= 7
			? table[j]
			: j <= 14
				? table[14 - j]
				: j <= 21
					? -(table[j - 14] ?? 0)
					: -(table[28 - j] ?? 0);
	/* c8 ignore next */
	if (value === undefined) throw new Error("moonTabAt: table must have 8 entries");
	return normaliseZero(value);
}

/**
 * Reads the sun equation table at an integer argument, applying Janson's symmetries.
 *
 * @remarks
 * Listed for 0…3 and extended by `tab(6 − i) = tab(i)` and `tab(6 + i) = −tab(i)`, giving
 * period 12.
 */
export function sunTabAt(table: readonly number[], index: number): number {
	const j = mod(index, 12);
	const value =
		j <= 3
			? table[j]
			: j <= 6
				? table[6 - j]
				: j <= 9
					? -(table[j - 6] ?? 0)
					: -(table[12 - j] ?? 0);
	/* c8 ignore next */
	if (value === undefined) throw new Error("sunTabAt: table must have 4 entries");
	return normaliseZero(value);
}

/**
 * Linearly interpolates a table at a rational argument, exactly.
 *
 * @remarks
 * With argument `numerator / den`, the result is
 * `tab(i) + (tab(i+1) − tab(i)) · frac / den`, which this returns pre-multiplied by `den` so
 * that it stays an integer. The caller therefore receives a numerator over the same `den`.
 *
 * @param readTable - Table accessor honouring the tradition's symmetry rules.
 * @param numerator - Argument numerator; may be negative.
 * @param den - Argument denominator.
 */
function interpolate(readTable: (index: number) => number, numerator: number, den: number): number {
	const index = floorDiv(numerator, den);
	const fraction = mod(numerator, den);
	const base = readTable(index);
	return base * den + (readTable(index + 1) - base) * fraction;
}

/**
 * The equation of the moon — Janson's *zla rkang* — as a numerator over
 * {@link ScaledTradition.moonTabArgDen}.
 *
 * @remarks
 * Bounded by ±25, the table's maximum, so its contribution to the date is at most 25/60 days.
 */
export function moonEquation(scaled: ScaledTradition, day: number, monthCount: number): number {
	// The anomaly numerator over its own denominator IS the argument numerator over
	// moonTabArgDen, because multiplying by 28 exactly cancels the factor of 28 below.
	const argument = lunarAnomaly(scaled, day, monthCount);
	return interpolate(
		(index) => moonTabAt(scaled.config.moonTab, index),
		argument,
		scaled.moonTabArgDen,
	);
}

/**
 * The equation of the sun — Janson's *nyi rkang* — as a numerator over
 * {@link ScaledTradition.sunTabArgDen}.
 *
 * @remarks
 * Bounded by ±11, so its contribution to the date is at most 11/60 days.
 */
export function sunEquation(scaled: ScaledTradition, day: number, monthCount: number): number {
	const argument = solarAnomaly(scaled, day, monthCount);
	return interpolate(
		(index) => sunTabAt(scaled.config.sunTab, index),
		argument,
		scaled.sunTabArgDen,
	);
}

/**
 * The true date — Janson's *gza' dag* — at the end of lunar day `d` in true month `n`.
 *
 * @remarks
 * Returned as an exact integer numerator over {@link ScaledTradition.commonDenominator}. Its
 * floor is the Julian day number of the calendar day in which that lunar day ends, which is the
 * whole basis of the calendar; the fractional part gives the time of day and is used only for
 * astrological detail this package does not compute.
 *
 * Because the two equations are bounded by 25/60 and 11/60 days, `true_date` never differs from
 * `mean_date` by more than 0.6 days. That bound is what makes the inverse search window
 * provable rather than guessed.
 *
 * @example
 * ```ts
 * const scaled = deriveScaling(PHUGPA);
 * const jd = Math.floor(trueDate(scaled, 30, 0) / scaled.commonDenominator);
 * ```
 */
export function trueDate(scaled: ScaledTradition, day: number, monthCount: number): number {
	const d = scaleTo(
		meanDate(scaled, day, monthCount),
		scaled.meanDate.den,
		scaled.commonDenominator,
	);
	const moon = scaleTo(
		moonEquation(scaled, day, monthCount),
		scaled.moonTabArgDen * 60,
		scaled.commonDenominator,
	);
	const sun = scaleTo(
		sunEquation(scaled, day, monthCount),
		scaled.sunTabArgDen * 60,
		scaled.commonDenominator,
	);
	return d + moon - sun;
}

/**
 * The Julian day number of the calendar day in which lunar day `d` of month `n` ends.
 *
 * @remarks
 * `JD = ⌊true_date⌋`, Janson §8. Note the caveat there: when a date is *repeated*, this gives
 * the JD of the **second** of the two days, and the caller must subtract one for the first.
 * Day classification lives in `calendar.ts`, not here.
 */
export function julianDayOfLunarDay(
	scaled: ScaledTradition,
	day: number,
	monthCount: number,
): number {
	return floorDiv(trueDate(scaled, day, monthCount), scaled.commonDenominator);
}
