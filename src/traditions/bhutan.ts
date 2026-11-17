/**
 * Defines the Bhutanese constants, from Janson's Bhutan appendix with epoch JD 2361807.
 *
 * @remarks
 * Bhutan uses a version of the Tibetan calendar as an official state calendar, in Dzongkha. It is
 * the only version Janson gives that numbers a leap month from the **preceding** month, placing the
 * leap month *after* the regular month sharing its number — see
 * {@link ./types.TraditionConfig.leapMonthPosition}.
 *
 * The epoch is Janson's own from his Bhutan appendix, not the four-version comparison table, and the
 * appendix states that `m₀` is already "modified to yield the JD" — the same form
 * {@link ../traditions/phugpa.PHUGPA}'s constant takes. So the one-mean-lunar-month offset
 * `docs/traditions.md` warns about does not arise here; it belongs to the comparison table's
 * common-epoch values.
 *
 * `m₁`, `s₁`, `a₁` are Phugpa's — Janson states it — and therefore so are `m₂` and `s₂`. The
 * correction tables are shared too: `moon_tab` and `sun_tab` are defined once, in his astronomical
 * section, and no version appendix restates them.
 *
 * @packageDocumentation
 */

// Every constant below is quoted from Janson's LaTeX source, never from PDF-extracted text.
// The comparison table's Tsurphu and Mongolian values are the ones that do carry the offset; Janson
// also gives each of those versions' own epoch data in its appendix, so "only in that table" would
// overstate it (docs/traditions.md says those two "genuinely need" the table).

import { deepFreeze } from "../freeze.js";
import { PHUGPA } from "./phugpa.js";
import type { TraditionConfig } from "./types.js";

/**
 * The Bhutanese configuration, epoch JD 2361807 — Monday, 22 April 1754 (Gregorian).
 *
 * @remarks
 * **Not swept day by day.** What is checked is 25 government-published days of the Royal
 * Government of Bhutan's own calendar — day numbers, skipped days, doubled days and Losar — plus
 * Bhutan's leap months against Janson's table. The day-by-day sweep against Henning's lineage
 * validates {@link BHUTAN_HENNING} and not this config, which differs from it where `a₂` does.
 * `docs/why-trust-these-dates.md` states over which years and with what independence; the day counts
 * are in `docs/testing.md`.
 *
 * **A disagreement this does not resolve.** Janson records that Bhutan's *government calendar* gives
 * New Year 2003 as 3 March, with day 1 of month 1 repeated, while his own calculations and Henning's
 * software give 3 March as a repeated day 30 of the leap month 12 and New Year on 4 March. He writes
 * "I have no explanation for this discrepancy." This config follows the computed line, so it
 * disagrees with the government calendar on that date. Neither side is ours to overrule.
 *
 * @example
 * ```ts
 * import { BHUTAN, losarFor } from "tibetan-calendar-temporal";
 * losarFor(2130, BHUTAN).isoDate.toString(); // "2003-03-04"
 * ```
 *
 * **Deeply frozen**, correction tables included — see the remarks on
 * {@link ../traditions/phugpa.PHUGPA}, which this is spread from.
 */
export const BHUTAN: TraditionConfig = deepFreeze({
	// Spread rather than assembled field by field, so the shared constants stay shared by
	// construction: a partial config is rejected by the validator, and one assembled by hand would
	// silently drift from Phugpa's tables if either changed.
	...PHUGPA,

	id: "bhutan",
	name: "Bhutanese",

	/**
	 * JD 2361807 is day 30 of month 2 of the Tibetan year beginning in 1754, and the epoch — the mean
	 * new moon 52/707 of a day after it — opens month 3.
	 */
	epochYear: 1754,
	epochMonth: 3,

	/**
	 * β* = 2 at this epoch, which Janson states.
	 *
	 * With the threshold below this yields his published β of 191. That is a real cross-check rather
	 * than a restatement: he separately gives the Bhutanese relation `β + β* ≡ 63 (mod 65)`, and the
	 * engine's `β = 67·M₀ − β* − (65 − threshold)` satisfies it only when the threshold is 57.
	 */
	intercalationIndexAtEpoch: 2,

	/**
	 * A month number has a leap month, which follows it, when its intercalation index is 57 or 58 —
	 * the **simplified** index this package computes.
	 *
	 * Janson states the same rule against the *traditional* index as 59-or-60. That index is the
	 * simplified one raised by 2 from the leap month onward, so each statement describes the same
	 * calendar against its own index; giving this field 59 would describe a different calendar.
	 */
	leapIndexThreshold: 57,

	/**
	 * A leap month takes the number of the **preceding** month, so it falls after it.
	 *
	 * The one version of the four that does. Janson calls it "an important difference", notes it is
	 * the Chinese system rather than the Indian, and that it seems to have been the original
	 * Kālacakra कालचक्र system.
	 */
	leapMonthPosition: "after",

	meanDate: {
		...PHUGPA.meanDate,
		/** `m₀ = 2;4,24,552 ⟨60,60,707⟩ + 2361805 = 2361807 + 52/707`, restated over 5656 = 8·707. */
		atEpoch: { num: 2_361_807 * 5656 + 416, den: 5656 },
	},

	meanSun: {
		...PHUGPA.meanSun,
		/** `s₀ = 0,24,10,50 ⟨27,60,60,67⟩ = 1/67`, restated over 804 = 12·67. */
		atEpoch: { num: 12, den: 804 },
	},

	lunarAnomaly: {
		...PHUGPA.lunarAnomaly,
		/** `a₀ = 3,30 ⟨28,126⟩ = 17/147`, restated over 3528 = 24·147. */
		atEpoch: { num: 408, den: 3528 },
	},

	/**
	 * Day 0 is *nyi ma* rather than *spen pa* — Janson's "unique feature of the Bhutanese calendar",
	 * and Unicode CLDR agrees, naming the same date one planet apart in `bo` and `dz`.
	 *
	 * No date moves. The weekday's name, planet and element do, and the elemental yoga is refused
	 * as unsourced.
	 */
	naming: { weekdayOffset: 1 },
});

/**
 * Bhutan with Henning's value for `a₂`.
 *
 * @remarks
 * Identical to {@link BHUTAN} except for the lunar anomaly's per-day increment, which uses the exact
 * `(1 + a₁)/30 = 3781/105840` rather than the rounded `1/28`. The same fork
 * {@link ../traditions/phugpa.PHUGPA_HENNING} records for Tibet, and it is **one fork, not two**:
 * Janson states `a₂` is the same in every version, so the choice is between almanac practice and
 * Henning's computed calendars rather than between traditions.
 *
 * **This is the variant the validation data supports, and that is worth stating plainly.** The only
 * day-by-day Bhutanese calendar available descends from Henning's own software, so it follows
 * Henning's `a₂` — with the rounded value, some days of the swept window disagree
 * (`docs/testing.md` has its extent). Concluding from that which value *Bhutanese almanacs* print
 * would be circular, and Janson gives no Bhutanese statement on the fork. {@link BHUTAN} therefore
 * keeps the rounded `1/28` the Tibetan almanacs use, exactly as {@link ../traditions/phugpa.PHUGPA}
 * does.
 *
 * @see {@link ../traditions/phugpa.PHUGPA_HENNING} for the divergence dates and frequency in Tibet.
 */
export const BHUTAN_HENNING: TraditionConfig = deepFreeze({
	...BHUTAN,
	id: "bhutan-henning",
	name: "Bhutanese (Henning a₂)",
	lunarAnomaly: { ...BHUTAN.lunarAnomaly, perDay: { num: 3781, den: 105_840 } },
});
