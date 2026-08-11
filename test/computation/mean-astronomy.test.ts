import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { mod } from "../../src/computation/arithmetic.js";
import {
	lunarAnomaly,
	meanDate,
	meanSun,
	solarAnomaly,
} from "../../src/computation/mean-astronomy.js";
import { deriveScaling } from "../../src/computation/scaling.js";
import { PHUGPA } from "../../src/traditions/phugpa.js";

const scaled = deriveScaling(PHUGPA);
const days = fc.integer({ min: 0, max: 30 });
const months = fc.integer({ min: 0, max: 30_000 });

describe("meanDate", () => {
	// Janson: the epoch is the mean new moon beginning the month with true month count 0, and
	// its JD is ⌊m₀⌋.
	it("returns m0 at the epoch", () => {
		expect(meanDate(scaled, 0, 0)).toBe(scaled.meanDate.atEpoch);
		expect(Math.floor(meanDate(scaled, 0, 0) / scaled.meanDate.den)).toBe(2_015_501);
	});

	it("advances by the mean lunar month, ≈29.530587 days", () => {
		const step = (meanDate(scaled, 0, 1) - meanDate(scaled, 0, 0)) / scaled.meanDate.den;
		expect(step).toBeCloseTo(29.530587, 6);
	});

	// Janson Remark 15: m₂ = m₁/30, so mean date is linear in the lunar day count 30n + d and
	// does not jump at the start of a month.
	it("is linear in 30n + d, with no jump at month boundaries", () => {
		fc.assert(
			fc.property(months, (n) => {
				expect(meanDate(scaled, 30, n)).toBe(meanDate(scaled, 0, n + 1));
			}),
		);
	});

	it("increases by exactly m2 per lunar day", () => {
		fc.assert(
			fc.property(days, months, (d, n) => {
				expect(meanDate(scaled, d + 1, n) - meanDate(scaled, d, n)).toBe(scaled.meanDate.perDay);
			}),
		);
	});

	it("stays an exact integer across the whole supported range", () => {
		fc.assert(
			fc.property(days, fc.integer({ min: 0, max: 1_000_000 }), (d, n) => {
				const value = meanDate(scaled, d, n);
				expect(Number.isSafeInteger(value)).toBe(true);
			}),
		);
	});
});

describe("meanSun", () => {
	it("returns s0 at the epoch", () => {
		expect(meanSun(scaled, 0, 0) / scaled.meanSun.den).toBeCloseTo(743 / 804, 12);
	});

	// s₁ = 65/804 = 65/(12·67) circles per month, so 804 months is exactly 65 circles.
	it("completes exactly 65 circles in 804 months", () => {
		const travelled = meanSun(scaled, 0, 804) - meanSun(scaled, 0, 0);
		expect(travelled).toBe(65 * scaled.meanSun.den);
	});

	it("is linear in 30n + d like the mean date", () => {
		fc.assert(
			fc.property(months, (n) => {
				expect(meanSun(scaled, 30, n)).toBe(meanSun(scaled, 0, n + 1));
			}),
		);
	});

	// 67 lunar months = 65 solar months is the relation the whole calendar rests on.
	it("embodies the 67:65 relation", () => {
		const solarMonths = (meanSun(scaled, 0, 67) - meanSun(scaled, 0, 0)) * 12;
		expect(solarMonths).toBe(65 * scaled.meanSun.den);
	});
});

describe("solarAnomaly", () => {
	it("is the mean sun less exactly a quarter circle", () => {
		fc.assert(
			fc.property(days, months, (d, n) => {
				const difference = meanSun(scaled, d, n) - solarAnomaly(scaled, d, n);
				expect(difference * 4).toBe(scaled.meanSun.den);
			}),
		);
	});
});

describe("lunarAnomaly", () => {
	it("returns a0 at the epoch", () => {
		expect(lunarAnomaly(scaled, 0, 0) / scaled.lunarAnomaly.den).toBeCloseTo(475 / 3528, 12);
	});

	// a₁ = 253/3528, so 3528 months is exactly 253 circles — the anomaly's period.
	it("completes a whole number of circles in 3528 months", () => {
		const travelled = lunarAnomaly(scaled, 0, 3528) - lunarAnomaly(scaled, 0, 0);
		expect(travelled).toBe(253 * scaled.lunarAnomaly.den);
	});

	it("advances by exactly 1/28 of a circle per day under the almanac a2", () => {
		fc.assert(
			fc.property(days, months, (d, n) => {
				const step = lunarAnomaly(scaled, d + 1, n) - lunarAnomaly(scaled, d, n);
				expect(step * 28).toBe(scaled.lunarAnomaly.den);
			}),
		);
	});

	// Janson Remark 15: unlike the other two, a₂ ≠ a₁/30, so the anomaly jumps slightly at each
	// new month. This is exactly what Henning's alternative a₂ removes, and pinning it here
	// makes the fork visible rather than latent.
	it("does jump at month boundaries, unlike mean date and mean sun", () => {
		const continuous = lunarAnomaly(scaled, 30, 5);
		const nextMonth = lunarAnomaly(scaled, 0, 6);
		expect(nextMonth).not.toBe(continuous);
		// Anomaly is a longitude, so it counts modulo one full circle — which is exactly
		// `den` scaled units. Reduced, the gap is 1/3528 of a circle: thirty days of
		// a₂ = 1/28 fall that far short of the month's true advance of 1 + a₁.
		expect(mod(nextMonth - continuous, scaled.lunarAnomaly.den)).toBe(1);
		expect(30 * scaled.lunarAnomaly.perDay).toBe(3780);
		expect(scaled.lunarAnomaly.den + scaled.lunarAnomaly.perMonth).toBe(3781);
	});
});
