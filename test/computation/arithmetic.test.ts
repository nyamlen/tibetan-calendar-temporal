import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
	amod,
	ceilDiv,
	floorDiv,
	gcd,
	lcm,
	mod,
	scaleTo,
} from "../../src/computation/arithmetic.js";

// Janson §2 defines mod, amod, floor and ceiling, and warns twice that implementations
// break on negative operands. Every test here that uses a negative operand is guarding
// that specific warning: JS `%` is remainder, not modulo, and truncation is not floor.

const ints = fc.integer({ min: -100_000, max: 100_000 });
const positives = fc.integer({ min: 1, max: 100_000 });

describe("floorDiv", () => {
	it("matches worked values, including the negative cases JS `/` gets wrong", () => {
		expect(floorDiv(7, 2)).toBe(3);
		expect(floorDiv(6, 2)).toBe(3);
		// Truncation would give -3 for both; floor gives -4 when the division is inexact.
		expect(floorDiv(-7, 2)).toBe(-4);
		expect(floorDiv(-6, 2)).toBe(-3);
		expect(floorDiv(0, 5)).toBe(0);
	});

	it("satisfies x - 1 < floor(x) <= x", () => {
		fc.assert(
			fc.property(ints, positives, (a, b) => {
				const q = floorDiv(a, b);
				expect(Number.isInteger(q)).toBe(true);
				expect(q * b).toBeLessThanOrEqual(a);
				expect((q + 1) * b).toBeGreaterThan(a);
			}),
		);
	});

	it("rejects a zero divisor rather than returning Infinity", () => {
		expect(() => floorDiv(1, 0)).toThrow(RangeError);
	});
});

describe("ceilDiv", () => {
	it("matches worked values", () => {
		expect(ceilDiv(7, 2)).toBe(4);
		expect(ceilDiv(6, 2)).toBe(3);
		expect(ceilDiv(-7, 2)).toBe(-3);
		expect(ceilDiv(0, 5)).toBe(0);
	});

	it("satisfies x <= ceil(x) < x + 1", () => {
		fc.assert(
			fc.property(ints, positives, (a, b) => {
				const q = ceilDiv(a, b);
				expect(q * b).toBeGreaterThanOrEqual(a);
				expect((q - 1) * b).toBeLessThan(a);
			}),
		);
	});

	// The §5 month inversion is a ceiling where the PDF-extracted text showed a floor.
	// This identity is what makes the two implementations visibly different.
	it("relates to floorDiv by ceil(a/b) = -floor(-a/b)", () => {
		fc.assert(
			fc.property(ints, positives, (a, b) => {
				expect(ceilDiv(a, b)).toBe(-floorDiv(-a, b));
			}),
		);
	});
});

describe("mod", () => {
	it("returns a non-negative result where JS `%` does not", () => {
		expect(mod(7, 3)).toBe(1);
		expect(-7 % 3).toBe(-1); // the trap
		expect(mod(-7, 3)).toBe(2);
		expect(mod(-3, 3)).toBe(0);
		expect(mod(0, 65)).toBe(0);
	});

	it("always lands in [0, n) and preserves the congruence class", () => {
		fc.assert(
			fc.property(ints, positives, (m, n) => {
				const r = mod(m, n);
				expect(r).toBeGreaterThanOrEqual(0);
				expect(r).toBeLessThan(n);
				// Asserted through mod rather than `%`: `(-1 - 0) % 1` is -0, and
				// Object.is(-0, 0) is false, so a raw `%` here fails spuriously.
				expect(mod(m - r, n)).toBe(0);
			}),
		);
	});

	it("rejects a non-positive modulus, which Janson does not define", () => {
		expect(() => mod(1, 0)).toThrow(RangeError);
		expect(() => mod(1, -3)).toThrow(RangeError);
	});
});

describe("amod", () => {
	it("differs from mod exactly on the multiples of n", () => {
		expect(amod(7, 3)).toBe(1);
		expect(amod(3, 3)).toBe(3); // mod gives 0 here
		expect(amod(0, 3)).toBe(3);
		expect(amod(-3, 3)).toBe(3);
		expect(amod(12, 12)).toBe(12);
	});

	it("always lands in (0, n] and equals 1 + (m-1) mod n", () => {
		fc.assert(
			fc.property(ints, positives, (m, n) => {
				const r = amod(m, n);
				expect(r).toBeGreaterThan(0);
				expect(r).toBeLessThanOrEqual(n);
				expect(r).toBe(1 + mod(m - 1, n));
				expect(mod(m - r, n)).toBe(0);
			}),
		);
	});

	it("agrees with mod except on multiples of n", () => {
		fc.assert(
			fc.property(ints, positives, (m, n) => {
				expect(amod(m, n)).toBe(mod(m, n) === 0 ? n : mod(m, n));
			}),
		);
	});

	// Janson's worked example, §4: AD 2007 is the 21st year of the 17th Prabhava cycle.
	it("reproduces Janson's rabjung example", () => {
		expect(amod(2007 - 1026, 60)).toBe(21);
	});
});

describe("gcd and lcm", () => {
	it("computes worked values", () => {
		expect(gcd(12, 18)).toBe(6);
		expect(gcd(7, 13)).toBe(1);
		expect(gcd(0, 5)).toBe(5);
		expect(lcm(4, 6)).toBe(12);
		// 2^4·7·101 with 2^3·3^3·5·7 shares 2^3·7, so the lcm reduces well below the product.
		expect(lcm(11312, 7560)).toBe(1_527_120);
	});

	it("satisfies gcd(a,b) * lcm(a,b) === a * b", () => {
		fc.assert(
			fc.property(positives, positives, (a, b) => {
				expect(gcd(a, b) * lcm(a, b)).toBe(a * b);
			}),
		);
	});

	// This is what derives the scaling denominator from a TraditionConfig rather than
	// hardcoding it. Phugpa's D is the lcm of its three stage denominators.
	it("derives the Phugpa scaling denominator", () => {
		expect([11312, 7560, 24120].reduce(lcm)).toBe(102_317_040);
	});

	// Tsurphu's epoch constants carry a second factor of 5 and a fourth factor of 3,
	// so its D is 15x larger. A hardcoded Phugpa D would silently truncate it.
	it("derives a different denominator for Tsurphu, proving D is tradition-dependent", () => {
		expect([7_635_600, 7560, 1_085_400].reduce(lcm)).toBe(1_534_755_600);
	});
});

describe("scaleTo", () => {
	it("scales a rational onto the common denominator", () => {
		expect(scaleTo(1, 2, 12)).toBe(6);
		expect(scaleTo(11135, 11312, 102_317_040)).toBe(11135 * (102_317_040 / 11312));
		expect(scaleTo(-1, 4, 24)).toBe(-6);
	});

	it("refuses a denominator it cannot represent exactly", () => {
		expect(() => scaleTo(1, 7, 12)).toThrow(RangeError);
	});

	it("is exact: scaling then dividing recovers the value", () => {
		fc.assert(
			fc.property(ints, fc.constantFrom(1, 2, 3, 4, 6, 12), (num, den) => {
				expect(scaleTo(num, den, 12) / 12).toBeCloseTo(num / den, 10);
			}),
		);
	});
});
