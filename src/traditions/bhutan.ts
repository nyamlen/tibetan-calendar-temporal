/**
 * Bhutanese constants, from Janson's Bhutan appendix with epoch JD 2361807.
 *
 * @remarks
 * Bhutan uses a version of the Tibetan calendar as an official state calendar, in Dzongkha. It is
 * the only version Janson gives that numbers a leap month from the **preceding** month, placing the
 * leap month *after* the regular month sharing its number — see
 * {@link ./types.TraditionConfig.leapMonthPosition}.
 *
 * Every constant below is quoted from Janson's LaTeX source, never from PDF-extracted text.
 *
 * **The epoch is his own, not the four-version comparison table.** His Bhutan appendix gives the
 * epoch data directly, and states that `m₀` is already "modified to yield the JD" — the same form
 * {@link ../traditions/phugpa.PHUGPA}'s constant takes. So the one-mean-lunar-month offset
 * `docs/traditions.md` warns about does not arise here. It still does for Tsurphu and Mongolia,
 * whose epoch data he gives only in that table.
 *
 * `m₁`, `s₁`, `a₁` are Phugpa's — Janson states it — and therefore so are `m₂` and `s₂`. The
 * correction tables are shared too: `moon_tab` and `sun_tab` are defined once, in his astronomical
 * section, and no version appendix restates them.
 *
 * @packageDocumentation
 */

import { deepFreeze } from "../freeze.js";
import { PHUGPA } from "./phugpa.js";
import type { TraditionConfig } from "./types.js";

/**
 * The Bhutanese configuration, epoch JD 2361807 — Monday, 22 April 1754.
 *
 * @remarks
 * **Not swept day by day.** What is checked is 25 days of the Royal Government of Bhutan's own
 * published calendar, in 2025 and 2026 — day numbers, three skipped days, two doubled days and
 * Losar — plus Bhutan's leap months against Janson's table. The day-by-day sweep, 11,050 days
 * against Henning's lineage, validates {@link BHUTAN_HENNING} and not this config: the two differ
 * on three days inside it. See `docs/testing.md` for the windows and what each does and does not
 * cover.
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

	/** JD 2361807 falls in month 3 of the Tibetan year beginning in 1754. */
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
	 * A leap month has intercalation index 57 or 58 — the **simplified** index this package computes.
	 *
	 * Janson states the same rule against the *traditional* index as 59-or-60. The two differ by two
	 * and describe the same calendar; do not mix them.
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
	 * Naming only. No date moves.
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
 * Henning's `a₂` — with the rounded value, three days in 11,050 disagree. Concluding from that which
 * value *Bhutanese almanacs* print would be circular, and Janson gives no Bhutanese statement on the
 * fork. {@link BHUTAN} therefore keeps almanac practice as the default, exactly as
 * {@link ../traditions/phugpa.PHUGPA} does.
 *
 * @see {@link ../traditions/phugpa.PHUGPA} for the divergence dates and frequency in Tibet.
 */
export const BHUTAN_HENNING: TraditionConfig = deepFreeze({
	...BHUTAN,
	id: "bhutan-henning",
	name: "Bhutanese (Henning a₂)",
	lunarAnomaly: { ...BHUTAN.lunarAnomaly, perDay: { num: 3781, den: 105_840 } },
});
