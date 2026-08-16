/**
 * Janson's four versions, expressed as far as `TraditionConfig` can honestly express them.
 *
 * @remarks
 * A helper rather than part of a test file because more than one suite needs them and Biome rightly
 * refuses exports from a test file.
 *
 * **These are not runnable calendars, and must not be copied into `src/` as though they were.**
 * Each is `PHUGPA` with three fields replaced — the epoch's intercalation index, the leap-index
 * threshold, and the leap month's position. Everything astronomical is still Phugpa's, because
 * `docs/traditions.md` records why the other versions' `m₀`, `s₀` and `a₀` are not yet safe to
 * transcribe.
 *
 * That substitution is legitimate for exactly the questions these configs are used to ask.
 * **Leap months, month numbering and the true month count depend on nothing astronomical** — they
 * come from the epoch year, the epoch month, the threshold and the position alone. Any question
 * about a *date* is Phugpa's answer wearing another version's name, and asking one here would be a
 * misuse.
 *
 * β\* at the common epoch E806 is 61 for Phugpa, **0 for Tsurphu** and **46 for the Mongolian**
 * version, all of which Janson states — counting back to the Kālacakra कालचक्र epoch *nag pa* 806
 * yields those indices. The **Bhutanese β\* at E806 is not stated**; 0 is what his E1754 value of 2
 * implies, and the leap-month agreement across 2000–2030 is the evidence for it.
 */

import { PHUGPA } from "../../src/traditions/phugpa.js";
import type { TraditionConfig } from "../../src/traditions/types.js";

/** The four version names Janson gives, in the order his comparison tables use. */
export const VERSIONS = ["phugpa", "tsurphu", "mongolian", "bhutanese"] as const;

export type Version = (typeof VERSIONS)[number];

export const VERSION_CONFIGS: Record<Version, TraditionConfig> = {
	phugpa: PHUGPA,
	tsurphu: {
		...PHUGPA,
		intercalationIndexAtEpoch: 0,
		leapIndexThreshold: 0,
		leapMonthPosition: "before",
	},
	mongolian: {
		...PHUGPA,
		intercalationIndexAtEpoch: 46,
		leapIndexThreshold: 46,
		leapMonthPosition: "before",
	},
	/**
	 * The simplified intercalation index, 57 — not the traditional 59 an almanac prints. Janson gives
	 * the rule both ways and they differ by two; this package computes the simplified one.
	 *
	 * `leapMonthPosition: "after"` is the whole reason this config differs in kind from the two
	 * above. Bhutan numbers a leap month from the **preceding** month, which places it after the
	 * regular month sharing its number.
	 */
	bhutanese: {
		...PHUGPA,
		intercalationIndexAtEpoch: 0,
		leapIndexThreshold: 57,
		leapMonthPosition: "after",
	},
};

/**
 * A **runnable** Bhutanese calendar, with Bhutan's own epoch and mean-motion constants.
 *
 * @remarks
 * Unlike {@link VERSION_CONFIGS}, nothing here is Phugpa's except the parts Janson states are
 * shared. This is a candidate for `src/`, kept in the test tree until the day-by-day tiling in
 * `test/validation/bhutan.test.ts` passes — expressing a tradition and validating it are different
 * claims, and only the second earns an export.
 *
 * **The epoch is Janson's own, not the four-version comparison table.** His Bhutan appendix gives
 * the epoch data directly at JD 2361807 — Monday, 22 April 1754 — and says explicitly that `m₀` is
 * "modified to yield the JD", which is the same form `PHUGPA.meanDate.atEpoch` takes. So the
 * one-mean-lunar-month offset that `docs/traditions.md` warns about, and the `x₀ = table x₀ − x₁`
 * reconciliation derived to undo it, are **not needed for Bhutan at all**. That reconciliation
 * stands for Tsurphu and Mongolia, whose epoch data he gives only in the comparison table.
 *
 * `m₁`, `s₁`, `a₁` are Phugpa's — Janson states it — and therefore so are `m₂`, `s₂`, `a₂`. The
 * correction tables are his too: `moon_tab` and `sun_tab` are defined **once**, in his astronomical
 * section, and no version appendix restates them.
 *
 * **A cross-check that costs nothing and is worth stating.** Janson gives the Bhutanese relation
 * `β + β* ≡ 63 (mod 65)`. The engine derives `β = 67·M₀ − β* − (65 − threshold)`, which makes
 * `β + β* ≡ 136 + threshold ≡ threshold + 6 (mod 65)`. Those agree exactly when the threshold is
 * **57** — the simplified index this package computes, and not the 59 his traditional formulation
 * uses. The derived `β` is then 191, which is the value he publishes.
 */
export const BHUTAN_CANDIDATE: TraditionConfig = {
	// Spread, not assembled field by field: `moonTab` and `sunTab` are Janson's universal tables and
	// a partial config is rejected by the validator, which is what caught the first draft of this.
	...PHUGPA,

	id: "bhutan",
	name: "Bhutanese",

	/** JD 2361807 is month 3 of the Tibetan year beginning in 1754. */
	epochYear: 1754,
	epochMonth: 3,

	/** β* = 2 at this epoch, which Janson states. With threshold 57 this yields his β of 191. */
	intercalationIndexAtEpoch: 2,

	/**
	 * The **simplified** intercalation index, 57-or-58. Janson also states the rule against the
	 * traditional index as 59-or-60; the two differ by two and this package computes the simplified
	 * one.
	 */
	leapIndexThreshold: 57,

	/** A leap month takes the number of the preceding month, so it falls after it. */
	leapMonthPosition: "after",

	meanDate: {
		...PHUGPA.meanDate,
		/** `m₀ = 2;4,24,552 ⟨60,60,707⟩ + 2361805 = 2361807 + 52/707`. Restated over 5656 = 8·707. */
		atEpoch: { num: 2_361_807 * 5656 + 416, den: 5656 },
	},

	meanSun: {
		...PHUGPA.meanSun,
		/** `s₀ = 0,24,10,50 ⟨27,60,60,67⟩ = 1/67`. Restated over 804 = 12·67. */
		atEpoch: { num: 12, den: 804 },
	},

	lunarAnomaly: {
		...PHUGPA.lunarAnomaly,
		/**
		 * `a₂ = (1 + a₁)/30 = 3781/105840`, Henning's exact value rather than the almanac's rounded
		 * `1/28`.
		 *
		 * The fork is real and this side of it is **evidence, not preference**. With `1/28` the tiling
		 * below misses exactly three days in 11,050 — 2001-12-10, 2004-04-10 and 2020-04-23 — which is
		 * about one in 3,700, the rate `PHUGPA`'s docblock records for this fork (Janson counts 8
		 * divergences per century). The fixture descends from Henning's own software, so it follows
		 * Henning's `a₂`, and switching to it takes the miss count to zero.
		 *
		 * That says nothing about which value *Bhutanese almanacs* print — Janson gives no Bhutanese
		 * statement on the fork, and this is the same open question `PHUGPA` versus `PHUGPA_HENNING`
		 * records for Tibet.
		 */
		perDay: { num: 3781, den: 105_840 },
		/** `a₀ = 3,30 ⟨28,126⟩ = 17/147`. Restated over 3528 = 24·147. */
		atEpoch: { num: 408, den: 3528 },
	},

	/** Day 0 is *nyi ma* rather than *spen pa* — Janson's "unique feature of the Bhutanese calendar". */
	naming: { weekdayOffset: 1 },
};
