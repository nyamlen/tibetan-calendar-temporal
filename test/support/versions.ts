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

/**
 * The month-animal rules Tsurphu and Mongolia share, which are the Chinese calendar's.
 *
 * @remarks
 * Month 1 is Tiger and the element cycle runs on continuously rather than restarting from the year's
 * element — both the opposite of Phugpa's, which is why a config spread from `PHUGPA` must replace
 * the `naming` block rather than inherit it.
 *
 * The nine month numbers are **not** shared, and until 2026-09-13 this block wrongly carried them
 * for Mongolia too. Janson: "The Tsurphu rules for animal, gender and element agree with the rules in
 * the Chinese calendar … Mongolia uses also the same rules" — three rules, not four — and "only
 * Tsurphu calendars give one of the 9 numbers to each month".
 */
const CHINESE_MONTH_ANIMALS = {
	tigerMonth: 1,
	elementRule: "continuous",
} as const;

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
		naming: { monthAnimals: CHINESE_MONTH_ANIMALS, nineNumbers: { months: "descending" } },
	},
	/** Janson: Mongolia uses Tsurphu's rules for the month animal, gender and element. */
	mongolian: {
		...PHUGPA,
		intercalationIndexAtEpoch: 46,
		leapIndexThreshold: 46,
		leapMonthPosition: "before",
		naming: { monthAnimals: CHINESE_MONTH_ANIMALS },
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
		// The month block is deliberately **replaced rather than inherited**: spreading `PHUGPA` copies
		// its `naming`, which would hand this config Phugpa's month animals — the one thing Janson
		// gives no Bhutanese list for. `weekdayOffset: 1` is what the shipped `BHUTAN` carries.
		naming: { weekdayOffset: 1 },
	},
};
