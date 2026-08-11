import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
	julianDayOfLunarDay,
	moonEquation,
	moonTabAt,
	sunEquation,
	sunTabAt,
	trueDate,
} from "../../src/computation/corrections.js";
import { meanDate } from "../../src/computation/mean-astronomy.js";
import { deriveScaling } from "../../src/computation/scaling.js";
import { PHUGPA } from "../../src/traditions/phugpa.js";

const scaled = deriveScaling(PHUGPA);
const { moonTab, sunTab } = PHUGPA;
const anyIndex = fc.integer({ min: -200, max: 200 });
const days = fc.integer({ min: 1, max: 30 });
const months = fc.integer({ min: 0, max: 20_000 });

describe("moonTabAt", () => {
	it("returns the listed values for 0..7", () => {
		expect([0, 1, 2, 3, 4, 5, 6, 7].map((i) => moonTabAt(moonTab, i))).toEqual([
			0, 5, 10, 15, 19, 22, 24, 25,
		]);
	});

	it("obeys tab(14 - i) = tab(i)", () => {
		fc.assert(
			fc.property(anyIndex, (i) => {
				expect(moonTabAt(moonTab, 14 - i)).toBe(moonTabAt(moonTab, i));
			}),
		);
	});

	// Stated additively as tab(14+i) + tab(i) === 0 rather than as a negation. Writing
	// `-moonTabAt(...)` produces -0 at the zero entries, and Object.is(-0, 0) is false.
	it("obeys tab(14 + i) = -tab(i)", () => {
		fc.assert(
			fc.property(anyIndex, (i) => {
				expect(moonTabAt(moonTab, 14 + i) + moonTabAt(moonTab, i)).toBe(0);
			}),
		);
	});

	it("never returns negative zero", () => {
		fc.assert(
			fc.property(anyIndex, (i) => {
				expect(Object.is(moonTabAt(moonTab, i), -0)).toBe(false);
			}),
		);
	});

	it("has period 28 and is bounded by the table maximum", () => {
		fc.assert(
			fc.property(anyIndex, (i) => {
				expect(moonTabAt(moonTab, i + 28)).toBe(moonTabAt(moonTab, i));
				expect(Math.abs(moonTabAt(moonTab, i))).toBeLessThanOrEqual(25);
			}),
		);
	});

	it("is zero at the nodes the symmetries force", () => {
		expect(moonTabAt(moonTab, 0)).toBe(0);
		expect(moonTabAt(moonTab, 14)).toBe(0);
	});
});

describe("sunTabAt", () => {
	it("returns the listed values for 0..3", () => {
		expect([0, 1, 2, 3].map((i) => sunTabAt(sunTab, i))).toEqual([0, 6, 10, 11]);
	});

	it("obeys the symmetries and has period 12", () => {
		fc.assert(
			fc.property(anyIndex, (i) => {
				expect(sunTabAt(sunTab, 6 - i)).toBe(sunTabAt(sunTab, i));
				expect(sunTabAt(sunTab, 6 + i) + sunTabAt(sunTab, i)).toBe(0);
				expect(sunTabAt(sunTab, i + 12)).toBe(sunTabAt(sunTab, i));
				expect(Math.abs(sunTabAt(sunTab, i))).toBeLessThanOrEqual(11);
				expect(Object.is(sunTabAt(sunTab, i), -0)).toBe(false);
			}),
		);
	});
});

describe("the equations stay within their table bounds", () => {
	it("bounds moon_equ by 25 and sun_equ by 11", () => {
		fc.assert(
			fc.property(days, months, (d, n) => {
				expect(Math.abs(moonEquation(scaled, d, n))).toBeLessThanOrEqual(25 * scaled.moonTabArgDen);
				expect(Math.abs(sunEquation(scaled, d, n))).toBeLessThanOrEqual(11 * scaled.sunTabArgDen);
			}),
		);
	});
});

describe("trueDate", () => {
	// This is the bound that makes the inverse search window provable rather than guessed:
	// |true_date - mean_date| = |moon_equ - sun_equ| / 60 <= (25 + 11)/60 = 0.6 days.
	it("never differs from mean_date by more than 0.6 days", () => {
		fc.assert(
			fc.property(days, months, (d, n) => {
				const mean = meanDate(scaled, d, n) / scaled.meanDate.den;
				const trueValue = trueDate(scaled, d, n) / scaled.commonDenominator;
				expect(Math.abs(trueValue - mean)).toBeLessThanOrEqual(0.6);
			}),
		);
	});

	it("stays an exact safe integer across the supported range", () => {
		fc.assert(
			fc.property(days, fc.integer({ min: 0, max: 100_000 }), (d, n) => {
				expect(Number.isSafeInteger(trueDate(scaled, d, n))).toBe(true);
			}),
		);
	});

	// Janson Remark 17: the epoch is the mean new moon beginning true month 0, and its Tibetan
	// date for E806 is 29/1 806. That day's JD is what floor(m0) gives.
	it("places the epoch's mean new moon at JD 2015501", () => {
		expect(Math.floor(meanDate(scaled, 0, 0) / scaled.meanDate.den)).toBe(2_015_501);
	});

	// Janson Remark 16 derives this bound rather than quoting it: the true lunar day differs
	// from the mean one, m2 = 0.98435 days, by at most (5 + 0.2)/60 = 0.087 days, since
	// consecutive moon_equ values differ by at most 5 and sun_equ by at most about 0.2.
	//
	// Asserted against that derived bound, not against his rounded "21.5 to 25.7 hours" —
	// the true maximum is 25.702 hours, so the rounded figure fails by a fraction of a second.
	// This is the second half of the inverse-window proof: no lunar day is shorter than 0.897
	// days, which is what limits how far the mean-motion estimate can drift.
	it("gives lunar days within Janson's derived bound of the mean lunar day", () => {
		const meanLunarDay = scaled.meanDate.perDay / scaled.meanDate.den;
		const maximumDeviation = (5 + 0.2) / 60;
		fc.assert(
			fc.property(fc.integer({ min: 1, max: 29 }), months, (d, n) => {
				const length =
					(trueDate(scaled, d + 1, n) - trueDate(scaled, d, n)) / scaled.commonDenominator;
				expect(Math.abs(length - meanLunarDay)).toBeLessThanOrEqual(maximumDeviation);
				// Never shorter than ~0.897 days — the fact the search window rests on.
				expect(length).toBeGreaterThan(0.89);
			}),
		);
	});

	it("advances monotonically", () => {
		fc.assert(
			fc.property(fc.integer({ min: 1, max: 29 }), months, (d, n) => {
				expect(trueDate(scaled, d + 1, n)).toBeGreaterThan(trueDate(scaled, d, n));
			}),
		);
	});
});

describe("julianDayOfLunarDay", () => {
	it("is the floor of the true date", () => {
		fc.assert(
			fc.property(days, months, (d, n) => {
				expect(julianDayOfLunarDay(scaled, d, n)).toBe(
					Math.floor(trueDate(scaled, d, n) / scaled.commonDenominator),
				);
			}),
		);
	});

	// Janson Remark 16: a lunar month runs 29.263 to 29.798 days, so a calendar month is
	// always 29 or 30 days.
	it("gives months of 29 or 30 calendar days", () => {
		fc.assert(
			fc.property(months, (n) => {
				const length = julianDayOfLunarDay(scaled, 30, n) - julianDayOfLunarDay(scaled, 30, n - 1);
				expect([29, 30]).toContain(length);
			}),
		);
	});
});
