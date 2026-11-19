/**
 * A consumer config the validator accepts whose safe-integer bound lies past Temporal's own range.
 *
 * @remarks
 * Its denominators are small, so `MAX_SAFE_INTEGER / commonDenominator` reaches Julian days no
 * `Temporal.PlainDate` can name. Not a calendar: "shape, not astronomy" is all the validator checks,
 * and this is here only to prove the exact range is clamped to Temporal's. From the adversarial
 * review's finding X1.1.
 */

import { PHUGPA } from "../../src/traditions/phugpa.js";
import type { TraditionConfig } from "../../src/traditions/types.js";

export const COARSE: TraditionConfig = {
	...PHUGPA,
	id: "coarse",
	name: "Coarse",
	meanDate: {
		perMonth: { num: 2953, den: 100 },
		perDay: { num: 2953, den: 3000 },
		atEpoch: { num: 6_046_505_537, den: 3000 },
	},
	meanSun: {
		perMonth: { num: 1, den: 12 },
		perDay: { num: 1, den: 360 },
		atEpoch: { num: 11, den: 12 },
	},
	lunarAnomaly: {
		perMonth: { num: 2, den: 28 },
		perDay: { num: 1, den: 28 },
		atEpoch: { num: 4, den: 28 },
	},
};
