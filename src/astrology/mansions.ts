/**
 * The lunar mansion a calendar day begins in — the astronomical half of the elemental yoga.
 *
 * @remarks
 * Everything else in `./astrology` is a cycle you could count on your fingers. This is not: it
 * depends on where the moon actually is, and so on the same true longitudes the calendar itself is
 * built from.
 *
 * Janson's "Further calculations" gives the chain:
 *
 * ```text
 * moon_lunar_day(d,n)  = true_sun(d,n) + d/30
 * moon_calendar_day    = moon_lunar_day − FRAC(true_date)/27
 * mansion              = ⌊27 · moon_calendar_day⌋
 * ```
 *
 * The `/27` in the second line is the moon treated as making one full circle in 27 days, which
 * converts "how far into the calendar day the lunar day ended" into "how far the moon moved in that
 * time". Janson is explicit that it is an approximation, and a good one: the sidereal month is
 * 27.322 days.
 *
 * **The element each mansion carries is not here** — it is Henning's, not Janson's, and it arrives
 * with the yoga. This module answers only *which* mansion.
 *
 * @packageDocumentation
 */

import { floorDiv, lcm, mod, scaleTo } from "../computation/arithmetic.js";
import { trueDate, trueSun, trueSunDenominator } from "../computation/corrections.js";
import type { ScaledTradition } from "../computation/scaling.js";
import { assertInternal } from "../errors.js";

/** How many mansions the ecliptic is divided into. */
export const MANSION_COUNT = 27;

/**
 * The denominator on which {@link moonCalendarDay} is an exact integer.
 *
 * @remarks
 * Three quantities have to meet: `true_sun` over {@link trueSunDenominator}, `d/30`, and
 * `FRAC(true_date)/27` over `commonDenominator · 27`. For both shipped traditions this comes to
 * 2,762,560,080 — **27 times `commonDenominator`**, which is exactly why
 * {@link moonCalendarDay} reduces before it scales.
 */
export function mansionDenominator(scaled: ScaledTradition): number {
	return lcm(lcm(trueSunDenominator(scaled), 30), scaled.commonDenominator * MANSION_COUNT);
}

/**
 * The moon's longitude at the **start of the calendar day**, in circles, reduced to `[0, 1)`.
 *
 * @remarks
 * Returned as an exact integer numerator over {@link mansionDenominator}.
 *
 * **Reduction happens before scaling, and that ordering is the whole design.** `true_sun` grows
 * without bound with the month count, and this denominator is 27 times the one `true_date` uses.
 * Scaling an unreduced longitude onto it would multiply a large number by 27 and cut the
 * safe-integer date bound from about 8.8 × 10⁷ to 3.3 × 10⁶ — against a present-day Julian day of
 * 2.46 × 10⁶, which is about a third of the way to losing exactness inside the calendar's own
 * useful range. Reducing first makes the bound independent of the year, because every term is then
 * below the denominator before anything is multiplied.
 *
 * Only the fractional part of a longitude means anything, so nothing is lost by reducing.
 */
export function moonCalendarDay(scaled: ScaledTradition, day: number, monthCount: number): number {
	const denominator = mansionDenominator(scaled);

	// Reduced to its fractional part *first* — see the remark above.
	const sunDenominator = trueSunDenominator(scaled);
	const sun = scaleTo(
		mod(trueSun(scaled, day, monthCount), sunDenominator),
		sunDenominator,
		denominator,
	);

	// The moon's elongation is d/30 at the end of lunar day d, by definition.
	const elongation = scaleTo(day, 30, denominator);

	// FRAC(true_date) is the time from the start of the calendar day to the end of the lunar day;
	// dividing by 27 turns it into the distance the moon covers in that time.
	const backwards = scaleTo(
		mod(trueDate(scaled, day, monthCount), scaled.commonDenominator),
		scaled.commonDenominator * MANSION_COUNT,
		denominator,
	);

	return mod(sun + elongation - backwards, denominator);
}

/**
 * The lunar mansion the calendar day begins in, numbered **0 to 26** as Janson numbers them.
 *
 * @remarks
 * `⌊27 · moon_calendar_day⌋`, and in the traditional mixed-radix notation this is simply the first
 * term of the lunar longitude.
 *
 * **Janson's 27 is not Henning's 28.** Henning's published list — the one carrying the element each
 * mansion holds — includes *Abhijit* at position 23, which this numbering omits. Anything mapping
 * these indices onto that table has to drop it, and must assert the drop rather than assume it: get
 * it wrong and every mansion from *Dhaniṣṭhā* onward shifts by one, silently.
 *
 * @example
 * ```ts
 * // Phugpa. 1 September 2026 is a Tuesday, whose element is fire; FPMT prints UD-FW for
 * // that day, so the mansion this returns must be one carrying water.
 * const scaled = scalingFor(PHUGPA);
 * mansionNumber(scaled, 20, 1649); // 0…26
 * ```
 */
export function mansionNumber(scaled: ScaledTradition, day: number, monthCount: number): number {
	const denominator = mansionDenominator(scaled);

	// Asserted rather than trusted: the product below is the largest intermediate in this module,
	// and it is the one that would silently lose exactness if a tradition's constants grew.
	assertInternal(
		Number.isSafeInteger(denominator * MANSION_COUNT) || undefined,
		`mansionNumber: ${denominator} · ${MANSION_COUNT} exceeds the safe-integer range, so the ` +
			"mansion cannot be computed exactly for this tradition",
	);

	const mansion = floorDiv(moonCalendarDay(scaled, day, monthCount) * MANSION_COUNT, denominator);

	/* c8 ignore next */
	return assertInternal(
		mansion >= 0 && mansion < MANSION_COUNT ? mansion : undefined,
		`mansionNumber: produced ${mansion}, outside 0…${MANSION_COUNT - 1}; moon_calendar_day was ` +
			"not reduced to [0, 1)",
	);
}
