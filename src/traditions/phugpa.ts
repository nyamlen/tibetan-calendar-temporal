/**
 * Defines the Phugpa (*phug-lugs*) constants, from Janson's astronomical-functions section (§7)
 * with epoch E806.
 *
 * @remarks
 * Phugpa was introduced in 1447 CE and is the most widely used version of the Tibetan calendar —
 * the one followed by the Dalai Lama. Dates computed for years before 1447 are a back-projection:
 * the earlier versions of the calendar, such as the original Kālacakra Tantra (*karaṇa*) one, used
 * different constants.
 *
 * @packageDocumentation
 */

// Every constant below is quoted from Janson's LaTeX source, never from PDF-extracted text.

import { deepFreeze } from "../freeze.js";
import type { TraditionConfig } from "./types.js";

// The engine reads a private frozen copy it takes on first use, so a consumer's own config mutated
// after that changes nothing the engine sees; freezing is what protects this shared singleton, whose
// mutation every later spread would pick up.
/**
 * The standard Phugpa configuration, epoch E806.
 *
 * @remarks
 * Janson gives constants for three interchangeable epochs — E806, E1927 and E1987 — which all
 * produce the same calendar. E806 is used here because it makes the true month count `n`
 * non-negative for every date after 806 CE; see {@link TraditionConfig.epochYear}.
 *
 * It claims to be the dates Tibetans use, and is checked day by day against four independent
 * sources; `docs/why-trust-these-dates.md` states over which years. It follows the
 * rounded `a₂ = 1/28` of the Men-Tsee-Khang almanac; see {@link PHUGPA_HENNING} for the fork.
 *
 * **Deeply frozen**, correction tables included. This is the object the docs point a reader at for
 * `{ ...PHUGPA, … }`, so a mutation of it would be inherited by every later spread.
 *
 * @example
 * ```ts
 * import { PHUGPA } from "tibetan-calendar-temporal";
 * isoToTibetan(Temporal.PlainDate.from("2027-01-15"), PHUGPA);
 * ```
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

	/**
	 * A month number has a leap month when its intercalation index is 48 or 49 — Janson's Phugpa
	 * leap-month rule, and the value from which the `+17` of the rounding rule is derived
	 * (`65 − 48`).
	 *
	 * Not shared with the other versions: Tsurphu uses 0, the Mongolian 46, the Bhutanese 57.
	 */
	leapIndexThreshold: 48,

	/**
	 * A leap month precedes the regular month sharing its number — the Indian convention, shared
	 * with Tsurphu and the Mongolian version.
	 *
	 * Stated rather than assumed: Bhutan does the opposite, and this is a choice Phugpa makes rather
	 * than the only possibility.
	 */
	leapMonthPosition: "before",

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
		 * (1654–1717 CE), and his computed calendars follow it. The two disagree on roughly one day
		 * in 4,100 days — Janson counts 9 divergences in 1900–1999 CE and 8 in 2000–2099 CE, though
		 * 16 in the single 65-year cycle 1027–1091 CE, so the rate is not uniform.
		 *
		 * Janson gives 10 February 2001 and 10 May 2006 as recent divergence dates, and 19 November
		 * 2025 as the next. Because published validation sources straddle this fork, changing
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

	/**
	 * The month-animal rules Janson's astrological appendix states for this version.
	 *
	 * @remarks
	 * `weekdayOffset` and `nineNumbers` are deliberately **not** spelled out: both defaults are
	 * Phugpa's, and explicit defaults would be noise asserting nothing in the config the docs point at
	 * for `{ ...PHUGPA, … }`. The unnumbered months are a sourced fact rather than a gap — Janson:
	 * "only Tsurphu calendars give one of the 9 numbers to each month".
	 */
	naming: { monthAnimals: { tigerMonth: 11, elementRule: "son-of-year" } },
});

/**
 * Phugpa with Henning's value for `a₂`.
 *
 * @remarks
 * Identical to {@link PHUGPA} except for the lunar anomaly's per-day increment, which uses the
 * exact `(1 + a₁)/30 = 3781/105840` rather than the rounded `1/28`. The exact value was proposed by
 * Minling Lochen Dharmashri སྨིན་གླིང་ལོ་ཆེན་དྷརྨ་ཤྲཱི (1654–1717 CE); Edward Henning uses it in his
 * computed calendars.
 *
 * **This is a diagnostic, not a rival answer to "what calendar does my community use."** The two
 * configs make different claims, and the distinction is the whole reason both are exported:
 *
 * - {@link PHUGPA} claims *these are the dates Tibetans use*, and is checked against four
 *   independent sources, among them FPMT's calendar, which is prepared from the Men-Tsee-Khang
 *   almanac; `docs/why-trust-these-dates.md` states over which years.
 * - This claims *these are the dates Henning's line produces*, which is what most public Tibetan
 *   calendar data descends from.
 *
 * So reach for it when a source disagrees with {@link PHUGPA} on about one day in 4,100 — that is
 * the fork, and this identifies it. If you do not know which you want, you want {@link PHUGPA}.
 *
 * Janson's estimate of the disagreement is one day in 4,100. His computer search found 9
 * divergences in 1900–1999 CE and 8 in 2000–2099 CE, though 16 in the single 65-year cycle
 * 1027–1091 CE, so the rate is not uniform. He gives 10 February 2001 and 10 May 2006 as recent
 * divergence dates, and 19 November 2025 as the next.
 *
 * What it is checked against, with the windows in
 * [`docs/testing.md`](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/testing.md):
 *
 * - **Rabten's sojong days**, the one external positive check: the observance's dates, not every
 *   day's number.
 * - **Janson's divergence dates**, which are reproduced, but come from the same paper the
 *   arithmetic does, so they are not external.
 * - **Two negative controls**: Lotsawa House's calculator and FPMT's calendar side with
 *   {@link PHUGPA} on the divergence dates they cover, and the suites assert that this config
 *   disagrees with them there.
 *
 * @see `docs/how-it-is-calculated.md` for what `a₂` is and why a difference of one part in 105,840
 * moves a date at all.
 */
export const PHUGPA_HENNING: TraditionConfig = deepFreeze({
	...PHUGPA,
	id: "phugpa-henning",
	name: "Phugpa (Henning a₂)",
	lunarAnomaly: { ...PHUGPA.lunarAnomaly, perDay: { num: 3781, den: 105_840 } },
});
