import { describe, expect, it } from "vitest";
import { losarFor } from "../src/computation/conversion.js";
import { rabjungFor, yearNameFor } from "../src/cycles.js";
import { PHUGPA_HENNING } from "../src/traditions/phugpa.js";

const codeOf = (call: () => unknown): string | undefined => {
	try {
		call();
		return undefined;
	} catch (error) {
		return (error as { code?: string }).code;
	}
};

/**
 * Naming a year, without evaluating the calendar to do it.
 *
 * These are closed forms over the year alone — three modulos — where the only previous route was
 * `losarFor(y).yearName`, which runs a full mean-astronomy pass and is not a route anyone guesses
 * from the name.
 */
describe("yearNameFor and rabjungFor", () => {
	it("agrees with the value on the year's Losar, across a century", () => {
		for (let year = 2100; year <= 2200; year++) {
			expect(yearNameFor(year), `${year}`).toEqual(losarFor(year).yearName);
			expect(rabjungFor(year), `${year}`).toEqual(losarFor(year).rabjung);
		}
	});

	it("cycles the elements every ten years and the animals every twelve", () => {
		for (let year = 2100; year <= 2200; year++) {
			expect(yearNameFor(year + 10).element).toBe(yearNameFor(year).element);
			expect(yearNameFor(year + 12).animal).toBe(yearNameFor(year).animal);
			// The full name repeats only every sixty, which is what makes it a sixty-year cycle.
			expect(yearNameFor(year + 60)).toEqual(yearNameFor(year));
		}
	});

	it("alternates gender with the element pairs", () => {
		// Each element holds two consecutive years, one male then one female.
		const first = yearNameFor(2153);
		const second = yearNameFor(2154);
		expect(second.element).toBe(first.element);
		expect(second.gender).not.toBe(first.gender);
	});

	/**
	 * The twelve-year animal return, which is what *lokeg* (ལོ་སྐེག) counts — the obstacle year
	 * falling every twelfth year from birth, at ages 13, 25, 37, 49 and 61.
	 */
	it("returns the birth animal every twelfth year", () => {
		const birth = 2130;
		for (const age of [13, 25, 37, 49, 61]) {
			expect(yearNameFor(birth + age - 1).animal).toBe(yearNameFor(birth).animal);
		}
	});

	it("advances the rabjung cycle every sixty years", () => {
		const here = rabjungFor(2153);
		const later = rabjungFor(2153 + 60);
		expect(later.cycle).toBe(here.cycle + 1);
		expect(later.year).toBe(here.year);
	});

	/**
	 * The reason these are exports rather than a documented `losarFor` hop: being pure modulo
	 * arithmetic they need no calendar, so they answer for years where evaluating one must refuse.
	 */
	it("answers for years where losarFor refuses", () => {
		expect(codeOf(() => losarFor(20_000, PHUGPA_HENNING))).toBe("TCT_OUTSIDE_EXACT_RANGE");
		expect(() => yearNameFor(20_000)).not.toThrow();
		expect(() => rabjungFor(20_000)).not.toThrow();
		expect(yearNameFor(20_000)).toEqual(yearNameFor(20_000 - 60));
	});

	it.each([
		["a fraction", 2153.5],
		["NaN", Number.NaN],
		["Infinity", Number.POSITIVE_INFINITY],
		["past the safe integer range", Number.MAX_SAFE_INTEGER + 2],
	])("rejects %s", (_label, year) => {
		expect(codeOf(() => yearNameFor(year))).toBe("TCT_FIELD_OUT_OF_RANGE");
		expect(codeOf(() => rabjungFor(year))).toBe("TCT_FIELD_OUT_OF_RANGE");
	});

	it("rejects a non-number year", () => {
		expect(codeOf(() => yearNameFor("2153" as unknown as number))).toBe("TCT_FIELD_OUT_OF_RANGE");
	});

	it("names the function the caller called", () => {
		try {
			rabjungFor(1.5);
			expect.unreachable("should reject a fraction");
		} catch (error) {
			expect((error as Error).message).toContain("rabjungFor");
		}
	});
});
