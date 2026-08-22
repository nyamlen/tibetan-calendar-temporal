import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
	rabjungFromYear,
	royalEraFromYear,
	yearFromRoyalEra,
	yearNameFromYear,
} from "../../src/computation/epoch.js";
import { SIXTY_YEAR_CYCLE } from "../fixtures/sixty-year-cycle.js";

// Janson §4. Every function here takes Y — the Gregorian year the Tibetan year begins in —
// never the royal-era number.

describe("rabjungFromYear", () => {
	// Janson's own worked example, §4: "AD 2007 is the 21st year in the 17th Prabhava cycle,
	// which began in 1987."
	// These assert `.cycle`/`.year` directly rather than `toEqual({ cycle, year })`: the subject
	// here is the arithmetic, and `toMatchObject` would silently stop checking that no extra field
	// appeared, which is the one thing these assertions exist to catch. `rabjungFromYear` now also
	// returns `name`, checked separately in test/rabjung-names.test.ts.
	it("reproduces Janson's worked example for 2007", () => {
		const result = rabjungFromYear(2007);
		expect(result.cycle).toBe(17);
		expect(result.year).toBe(21);
	});

	it.each`
		year    | cycle | position
		${1027} | ${1}  | ${1}
		${1086} | ${1}  | ${60}
		${1087} | ${2}  | ${1}
		${1987} | ${17} | ${1}
		${2046} | ${17} | ${60}
	`("places $year at cycle $cycle, position $position", ({ year, cycle, position }) => {
		const result = rabjungFromYear(year);
		expect(result.cycle).toBe(cycle);
		expect(result.year).toBe(position);
	});

	it("matches Janson's 60-year cycle table for both listed cycles", () => {
		for (const row of SIXTY_YEAR_CYCLE) {
			const [cycle16, cycle17] = [rabjungFromYear(row.years[0]), rabjungFromYear(row.years[1])];
			expect(cycle16.cycle).toBe(16);
			expect(cycle16.year).toBe(row.indian);
			expect(cycle17.cycle).toBe(17);
			expect(cycle17.year).toBe(row.indian);
		}
	});

	it("always yields a position in 1..60 and inverts the cycle formula", () => {
		fc.assert(
			fc.property(fc.integer({ min: -2000, max: 12_000 }), (y) => {
				const { cycle, year } = rabjungFromYear(y);
				expect(year).toBeGreaterThanOrEqual(1);
				expect(year).toBeLessThanOrEqual(60);
				// Janson §4, the forward form: Y = 1027 + (m-1)*60 + (n-1)
				expect(1027 + (cycle - 1) * 60 + (year - 1)).toBe(y);
			}),
		);
	});
});

describe("yearNameFromYear", () => {
	// Janson §4: "AD 2007 is the 24th year in the Chinese cycle (21st in the Indian) and is
	// thus Fire--female--Pig or simply Fire--Pig."
	it("reproduces Janson's worked example for 2007", () => {
		expect(yearNameFromYear(2007)).toMatchObject({
			element: "fire",
			animal: "pig",
			gender: "female",
		});
	});

	it("matches Janson's 60-year cycle table for all 120 listed years", () => {
		for (const row of SIXTY_YEAR_CYCLE) {
			for (const y of row.years) {
				const name = yearNameFromYear(y);
				expect(name.element).toBe(row.element);
				expect(name.animal).toBe(row.animal);
			}
		}
	});

	it("alternates gender, so it is determined by the animal", () => {
		fc.assert(
			fc.property(fc.integer({ min: 1027, max: 4000 }), (y) => {
				const a = yearNameFromYear(y);
				const b = yearNameFromYear(y + 1);
				expect(a.gender).not.toBe(b.gender);
				// Same animal always implies same gender — Janson notes 2 divides 12.
				expect(yearNameFromYear(y + 12).gender).toBe(a.gender);
			}),
		);
	});

	it("repeats element and animal on a 60-year period, and not sooner", () => {
		fc.assert(
			fc.property(fc.integer({ min: 1027, max: 4000 }), (y) => {
				expect(yearNameFromYear(y + 60)).toEqual(yearNameFromYear(y));
			}),
		);
		// 10 and 12 have gcd 2, so only 30 of the 120 combinations occur; a 30-year shift
		// would repeat the element but never the animal.
		expect(yearNameFromYear(2026 + 30).element).toBe(yearNameFromYear(2026).element);
		expect(yearNameFromYear(2026 + 30).animal).not.toBe(yearNameFromYear(2026).animal);
	});

	it("gives each element two consecutive years", () => {
		expect(yearNameFromYear(1984).element).toBe("wood"); // Chinese 1, male
		expect(yearNameFromYear(1985).element).toBe("wood"); // Chinese 2, female
		expect(yearNameFromYear(1986).element).toBe("fire");
	});
});

// This is the trap the rabjung/yearName split exists to prevent: the two cycles give a year
// different positions, so the Indian index does not select the Chinese name.
describe("the two cycles are offset by three", () => {
	it("confirms the offset across the whole table", () => {
		for (const row of SIXTY_YEAR_CYCLE) {
			expect(((row.indian + 2) % 60) + 1).toBe(row.chinese);
		}
	});

	it("shows 2026 is Indian 40 but Fire-Horse, which is Chinese 43", () => {
		const rabjung = rabjungFromYear(2026);
		expect(rabjung.cycle).toBe(17);
		expect(rabjung.year).toBe(40);
		expect(yearNameFromYear(2026)).toMatchObject({
			element: "fire",
			animal: "horse",
			gender: "male",
		});
		const atIndian40 = SIXTY_YEAR_CYCLE[39];
		const atChinese40 = SIXTY_YEAR_CYCLE.find((r) => r.chinese === 40);
		expect(atIndian40?.chinese).toBe(43);
		// Reading the element-animal off the Indian index lands three years early.
		expect(atChinese40?.animal).toBe("rabbit");
	});
});

describe("royal era conversion", () => {
	it("offsets Janson's Y by 127", () => {
		expect(royalEraFromYear(2026)).toBe(2153);
		expect(yearFromRoyalEra(2153)).toBe(2026);
		// Janson §4 cites a calendar titled 2003 in English and 2130 in Tibetan.
		expect(royalEraFromYear(2003)).toBe(2130);
	});

	it("round-trips", () => {
		fc.assert(
			fc.property(fc.integer({ min: -500, max: 12_000 }), (y) => {
				expect(yearFromRoyalEra(royalEraFromYear(y))).toBe(y);
			}),
		);
	});
});
