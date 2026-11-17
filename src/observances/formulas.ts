/**
 * The named formulas a `formula` observance tests every calendar day against.
 *
 * @remarks
 * Internal. `formulaHolds` is the one dispatch on the formula name; a further formula is a further
 * case here and a further entry of the validator's name list.
 *
 * ## `lunarDayPlusWeekdayMod4`
 *
 * **Source.** FPMT, "How to check which day is good and which is bad for offering fire puja",
 * advice from Lama Zopa Rinpoche dictated in November 2001, https://fpmt.org/teachers/zopa/advice/firepuja/.
 *
 * **The rule as the page states it.** Add the Tibetan date, the weekday's number and one, and divide
 * by four: a remainder of 1 or 2 is bad, 3 or 0 is good. Counting Sunday as 0, the good days are
 * those where `(day + weekday) % 4` is 1 or 2, which is what this computes. The formula therefore
 * *holds* on the days the page calls good for a fire puja.
 *
 * **How far it agrees** with FPMT's printed "Fire puja" labels, on the engine's own Tibetan dates,
 * and over which years, is reported in `docs/why-trust-these-dates.md`. The page tells the reader to
 * check for added or omitted days and does not say how the count is adjusted for one, so **how it
 * should be adjusted is unknown** and nothing here guesses. Each calendar day is tested on its own
 * number, which treats a doubled date's two halves as two days.
 *
 * **One lineage.** FPMT's own teacher is explaining FPMT's own days, so agreement with FPMT's
 * calendars is not independent corroboration of the rule.
 */

// The name does not say agnivāsa (अग्निवास) on purpose: the FPMT page never uses the word, and the
// name would claim an identity with the Indic rule that nothing here establishes.
//
// Measured against FPMT's "Fire puja" labels, 39 of the 40 days where the formula and the label
// disagree lie in a Tibetan month holding a doubled or skipped day (the 40 are the literal list in
// `test/validation/fpmt-observances.test.ts`). That is why the missing adjustment above matters.

import { codedError } from "../errors.js";
import type { FormulaName } from "./types.js";

/**
 * Returns whether `name` holds on a calendar day, from its Tibetan day number and its weekday.
 *
 * @param day - The Tibetan day number, 1-30.
 * @param weekday - The weekday counted Sunday 0, Monday 1, … Saturday 6. Not
 * `TibetanDate.tibetanWeekday`, which counts Saturday 0, nor `TibetanDate.dayOfWeek`, which is ISO.
 */
export function formulaHolds(name: FormulaName, day: number, weekday: number): boolean {
	if (name === "lunarDayPlusWeekdayMod4") {
		const remainder = (day + weekday) % 4;
		return remainder === 1 || remainder === 2;
	}
	/* c8 ignore next */
	throw codedError("TCT_INTERNAL", `unhandled formula ${JSON.stringify(name)}`);
}
