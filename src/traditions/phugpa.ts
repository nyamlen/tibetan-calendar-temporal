/**
 * Phugpa (*phug-lugs*) constants, from Janson §7 with epoch E806.
 *
 * @remarks
 * Phugpa was introduced in 1447 and is the most widely used version of the Tibetan calendar —
 * the one followed by the Dalai Lama. Dates computed for years before 1447 are a
 * back-projection: earlier traditions give genuinely different dates.
 *
 * Every constant below is quoted from Janson's LaTeX source, never from PDF-extracted text.
 *
 * @packageDocumentation
 */

import { deepFreeze } from "../freeze.js";
import type { TraditionConfig } from "./types.js";

/**
 * The standard Phugpa configuration, epoch E806.
 *
 * @remarks
 * Janson gives constants for three interchangeable epochs — E806, E1927 and E1987 — which all
 * produce the same calendar. E806 is used here because it makes the true month count `n`
 * non-negative for every date after 806 CE; see {@link TraditionConfig.epochYear}.
 *
 * @example
 * ```ts
 * import { PHUGPA } from "tibetan-calendar-temporal";
 * isoToTibetan(Temporal.PlainDate.from("2027-01-15"), PHUGPA);
 * ```
 *
 * **Deeply frozen**, correction tables included. This is the object the docs point a reader at for
 * `{ ...PHUGPA, … }`, and a mutation one keystroke away from that spread would change the calendar
 * for every caller in the process — silently, because the derived scaling is memoised on the
 * object and would not be recomputed. See {@link deepFreeze}.
 */
export const PHUGPA: TraditionConfig = deepFreeze({
	id: "phugpa",
	name: "Phugpa",

	epochYear: 806,
	epochMonth: 3,

	/**
	 * β* = 61 at E806. Janson gives 55 for E1927 and 0 for E1987; all three describe the same
	 * calendar because the month count differs correspondingly.
	 */
	intercalationIndexAtEpoch: 61,

	meanDate: {
		/** m₁ = 29;31,50,0,480 ⟨60,60,6,707⟩ ≈ 29.530587 days, the mean lunar month. */
		perMonth: { num: 167_025, den: 5656 },
		/** m₂ = m₁ / 30, so mean date is linear in the lunar day count with no jump at months. */
		perDay: { num: 11_135, den: 11_312 },
		/**
		 * m₀ = 0;50,44,2,38 ⟨60,60,6,707⟩ + 2015501.
		 *
		 * The integer 2,015,501 is Janson's addition, not traditional: it shifts the result from
		 * a day-of-week reckoning to a Julian day number. It is congruent to −2 modulo 7, which
		 * is what keeps the weekday formula `(JD + 2) mod 7` correct.
		 */
		atEpoch: { num: 2_015_501 * 5656 + 4783, den: 5656 },
	},

	meanSun: {
		/** s₁ = 65/804 = 65/(12·67) circles per month. */
		perMonth: { num: 65, den: 804 },
		/** s₂ = s₁ / 30. */
		perDay: { num: 13, den: 4824 },
		/** s₀ = 24,57,5,2,16 ⟨27,60,60,6,67⟩. */
		atEpoch: { num: 743, den: 804 },
	},

	lunarAnomaly: {
		/** a₁ = 2,1 ⟨28,126⟩. */
		perMonth: { num: 253, den: 3528 },
		/**
		 * a₂ = 1,0 ⟨28,126⟩ = 1/28.
		 *
		 * @defaultValue `1/28`, the value almanacs use.
		 *
		 * This is a **known fork in the tradition**. Henning instead uses the mathematically more
		 * natural `(1 + a₁)/30 = 3781/105840`, proposed by Minling Lochen Dharmashri
		 * (1654–1717), and his computed calendars follow it. The two disagree on roughly one day
		 * in 4,100 days — Janson counts 9 divergences in 1900–1999 and 8 in 2000–2099, though 16 in
		 * the single cycle 1027–1091, so the rate is not uniform.
		 *
		 * Janson names three recent divergence dates: 10 February 2001, 10 May 2006 and
		 * 19 November 2025. Because published validation sources straddle this fork, changing
		 * this value will make a handful of fixtures fail in a way that looks like an arithmetic
		 * bug and is not.
		 */
		perDay: { num: 1, den: 28 },
		/** a₀ = 3,97 ⟨28,126⟩. */
		atEpoch: { num: 475, den: 3528 },
	},

	/** moon_tab(0…7). Increments are at most 5, which bounds the correction at 25/60 days. */
	moonTab: [0, 5, 10, 15, 19, 22, 24, 25],

	/** sun_tab(0…3). Increments are at most 6, bounding the correction at 11/60 days. */
	sunTab: [0, 6, 10, 11],
});

/**
 * Phugpa with Henning's value for `a₂`.
 *
 * @remarks
 * Identical to {@link PHUGPA} except for the lunar anomaly's per-day increment, which uses the
 * exact `(1 + a₁)/30 = 3781/105840` rather than the rounded `1/28`. Provided so that the fork
 * is visible and testable rather than a mystery when a fixture disagrees.
 *
 * Sources descended from Henning's calculations — including several public Tibetan calendar
 * archives — follow this variant. Almanac practice follows {@link PHUGPA}.
 *
 * @see {@link PHUGPA} for the divergence dates and frequency.
 */
export const PHUGPA_HENNING: TraditionConfig = deepFreeze({
	...PHUGPA,
	id: "phugpa-henning",
	name: "Phugpa (Henning a₂)",
	lunarAnomaly: { ...PHUGPA.lunarAnomaly, perDay: { num: 3781, den: 105_840 } },
});
