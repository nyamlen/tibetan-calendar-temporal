/**
 * The comparison against FPMT's day-by-day calendars — month, day and leap month.
 *
 * @remarks
 * Moved here from `test/validation/fpmt.test.ts` on 2026-09-18, for the reason
 * `test/support/crosscheck.ts` gives: the shipped page's "three days disagree with FPMT" must be
 * measured by the predicate the validation suite pins, not by a restatement of it.
 *
 * The doubled- and leap-day flags are deliberately **not** compared. FPMT's grid prints a day number
 * per Gregorian day and nothing that says which half of a doubled date is the intercalated one.
 */

import { isoToTibetan } from "../../src/computation/conversion.js";
import { PHUGPA } from "../../src/traditions/phugpa.js";
import type { TraditionConfig } from "../../src/traditions/types.js";
import { FPMT_OBSERVANCES } from "../fixtures/fpmt-observances.js";

/** Every FPMT row whose month, day or leap-month flag the engine computes differently. */
export function fpmtNumberingMismatches(config: TraditionConfig = PHUGPA) {
	return FPMT_OBSERVANCES.filter((row) => {
		const t = isoToTibetan(Temporal.PlainDate.from(row.iso), config);
		return (
			t.month !== row.month || t.day !== row.day || t.isLeapMonth !== (row.isLeapMonth ?? false)
		);
	});
}
