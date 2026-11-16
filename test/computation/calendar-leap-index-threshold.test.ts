/**
 * The leap-month rule is per-tradition, and `β` is derived from it.
 *
 * @remarks
 * `sharesNumberWithLeapMonth` tested `index === 48 || index === 49` and `trueMonthCount` added a literal `17`
 * until 2026-08-16. Both are Phugpa's, and `docs/roadmap.md` claimed for three phases that Tsurphu
 * "differs solely in these values" — meaning the constants — which Janson contradicts: he states a
 * different leap rule for each version.
 *
 * What makes the generalisation checkable rather than merely plausible is that Janson **publishes
 * β for all four versions**. If `β = 67·M₀ − β* − (65 − threshold)` reproduces his four numbers
 * from their four thresholds, the formula is his; if it reproduces three, it is a coincidence.
 * That is the whole point of this file.
 */

import { describe, expect, it } from "vitest";
import {
	beta,
	intercalationIndex,
	sharesNumberWithLeapMonth,
} from "../../src/computation/calendar.js";
import { PHUGPA } from "../../src/traditions/phugpa.js";
import type { TraditionConfig } from "../../src/traditions/types.js";
import { validatedTradition } from "../../src/traditions/validate.js";

/**
 * Epoch data as Janson gives it per version, with the β he publishes for each.
 *
 * Only `epochMonth`, `intercalationIndexAtEpoch` and `leapIndexThreshold` feed `beta`, so the rest
 * of each config is irrelevant here and deliberately not supplied — this file tests one formula,
 * not four calendars.
 */
const JANSON_BETA = [
	{ tradition: "Phugpa (E806)", epochMonth: 3, betaStar: 61, threshold: 48, published: 123 },
	{ tradition: "Mongolian", epochMonth: 3, betaStar: 10, threshold: 46, published: 172 },
	{ tradition: "Bhutanese (E1754)", epochMonth: 3, betaStar: 2, threshold: 57, published: 191 },
	// Janson publishes 142 for Tsurphu at E1732. β is only ever used mod 65, and 142 − 77 = 65,
	// so this is agreement. He gives 187 for the E1852 epoch, likewise congruent.
	{ tradition: "Tsurphu (E1732)", epochMonth: 3, betaStar: 59, threshold: 0, published: 142 },
] as const;

function configWith(epochMonth: number, betaStar: number, threshold: number): TraditionConfig {
	return {
		...PHUGPA,
		epochMonth,
		intercalationIndexAtEpoch: betaStar,
		leapIndexThreshold: threshold,
	};
}

describe("beta, against Janson's published values", () => {
	for (const row of JANSON_BETA) {
		it(`matches ${row.tradition} mod 65`, () => {
			const derived = beta(configWith(row.epochMonth, row.betaStar, row.threshold));
			expect(derived % 65).toBe(row.published % 65);
		});
	}

	it("matches Phugpa, the Mongolian and the Bhutanese versions exactly, not merely mod 65", () => {
		// Exact agreement on three of four is what rules out a formula that happens to be congruent.
		for (const row of JANSON_BETA.filter((r) => !r.tradition.startsWith("Tsurphu"))) {
			expect(beta(configWith(row.epochMonth, row.betaStar, row.threshold))).toBe(row.published);
		}
	});

	it("still gives Phugpa 123 from the shipped config", () => {
		expect(beta(PHUGPA)).toBe(123);
	});
});

describe("the leap rule follows the threshold", () => {
	it("fires on the threshold and one above it, and on nothing else", () => {
		// Drive the index across its whole range by walking months, rather than asserting against a
		// hand-computed list — the point is that the *rule* tracks the config, not that any
		// particular month is leap.
		for (const threshold of [0, 46, 48, 57]) {
			const config = { ...PHUGPA, leapIndexThreshold: threshold };
			for (let month = 1; month <= 12; month += 1) {
				for (let year = 2000; year < 2010; year += 1) {
					const index = intercalationIndex(config, year, month);
					const expected = index === threshold || index === threshold + 1;
					expect(sharesNumberWithLeapMonth(config, year, month)).toBe(expected);
				}
			}
		}
	});

	it("keeps Janson's 24-leap-months-per-65-years for Phugpa through the config path", () => {
		// Janson: over 65 years there are 65·12 = 780 regular months and 2·12 = 24 leap months.
		// Asserting the invariant rather than a hand-picked leap year keeps this test independent
		// of any date I would otherwise have to look up and could get wrong.
		let leapMonths = 0;
		for (let year = 2000; year < 2065; year += 1) {
			for (let month = 1; month <= 12; month += 1) {
				if (sharesNumberWithLeapMonth(PHUGPA, year, month)) leapMonths += 1;
			}
		}
		expect(leapMonths).toBe(24);
	});

	it("holds the same invariant for every published threshold", () => {
		// The count is a property of the 67:65 relation, not of Phugpa — so a threshold that broke
		// it would be producing a differently-shaped calendar, not merely a differently-placed one.
		for (const threshold of [0, 46, 48, 57]) {
			const config = { ...PHUGPA, leapIndexThreshold: threshold };
			let leapMonths = 0;
			for (let year = 2000; year < 2065; year += 1) {
				for (let month = 1; month <= 12; month += 1) {
					if (sharesNumberWithLeapMonth(config, year, month)) leapMonths += 1;
				}
			}
			expect(leapMonths, `threshold ${threshold}`).toBe(24);
		}
	});
});

describe("validation", () => {
	it("rejects a missing threshold rather than defaulting it", () => {
		const { leapIndexThreshold: _omitted, ...withoutIt } = PHUGPA;
		expect(() => validatedTradition(withoutIt as TraditionConfig)).toThrow(
			expect.objectContaining({ code: "TCT_INVALID_TRADITION_CONFIG" }),
		);
	});

	it("rejects 64, where the rule's second index would be unreachable", () => {
		// ix is mod 65, so a threshold of 64 matches only one index and halves the leap months —
		// a calendar that runs and is wrong, which is the failure mode this package exists to avoid.
		expect(() => validatedTradition({ ...PHUGPA, leapIndexThreshold: 64 })).toThrow(
			expect.objectContaining({ code: "TCT_INVALID_TRADITION_CONFIG" }),
		);
	});

	it.each([-1, 1.5, Number.NaN, "48"])("rejects %p", (value) => {
		expect(() =>
			validatedTradition({ ...PHUGPA, leapIndexThreshold: value } as TraditionConfig),
		).toThrow(expect.objectContaining({ code: "TCT_INVALID_TRADITION_CONFIG" }));
	});

	it("accepts every value Janson publishes", () => {
		for (const threshold of [0, 46, 48, 57]) {
			expect(() => validatedTradition({ ...PHUGPA, leapIndexThreshold: threshold })).not.toThrow();
		}
	});
});
