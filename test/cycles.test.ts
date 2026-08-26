import { describe, expect, it } from "vitest";
import {
	isoToTibetan,
	julianDayFromIso,
	losarFor,
	tibetanWeekday,
} from "../src/computation/conversion.js";
import { rabjungFor, weekdayNameFor, yearNameFor } from "../src/cycles.js";
import { PHUGPA_HENNING } from "../src/traditions/phugpa.js";
import { asTibetanWeekday, type TibetanWeekday } from "../src/types.js";

const iso = (s: string) => Temporal.PlainDate.from(s);

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
 * These are closed forms over the year alone — three modulos — and since year-level naming came off
 * `TibetanDate` they are the only route to it, rather than a cheap alternative to
 * `losarFor(y).yearName`.
 *
 * That removal cost this file a test. It used to assert that the closed form agreed with the value
 * a full mean-astronomy pass had written onto the Losar date; with the field gone the same
 * comparison reads `yearNameFor(y)` against `yearNameFor(losarFor(y).year)`, which is a tautology
 * and would pass however wrong both sides were. What is kept below is the part that still bites —
 * that Losar belongs to the year it opens, which is what made the old comparison meaningful. The
 * names themselves are cross-checked against Janson's own table in
 * `test/computation/conversion.test.ts`, where the expected values come from a fixture rather than
 * from this package.
 */
describe("yearNameFor and rabjungFor", () => {
	it("names the year its Losar opens, across a century", () => {
		for (let year = 2100; year <= 2200; year++) {
			expect(losarFor(year).year, `${year}`).toBe(year);
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

describe("TibetanWeekday brand", () => {
	// The spike's finding 9: the only SILENT wrong answer anywhere on this surface. ISO dayOfWeek
	// runs 1-7 from Monday, Tibetan tibetanWeekday runs 0-6 from Saturday, both are fields on the
	// same object, and passing the wrong one compiled, threw nothing and returned the wrong name
	// six days in seven.
	it("makes weekdayNameFor(date.dayOfWeek) a COMPILE error", () => {
		const date = isoToTibetan(iso("2027-01-15"));
		// @ts-expect-error dayOfWeek is an ISO number, not a TibetanWeekday. tsc errors on an
		// UNUSED @ts-expect-error, so this line fails `npm run typecheck` the moment the brand is
		// widened back to `number` — which is what makes it evidence rather than decoration.
		expect(() => weekdayNameFor(date.dayOfWeek)).not.toThrow();
	});

	it("lets both legitimate sources through untouched", () => {
		const date = isoToTibetan(iso("2027-01-15"));
		expect(weekdayNameFor(date.tibetanWeekday).wylie).toBe(
			weekdayNameFor(tibetanWeekday(julianDayFromIso(date.isoDate))).wylie,
		);
	});

	it("would have been SILENTLY wrong six days in seven, and thrown on the seventh", () => {
		// A measurement of what the slip actually cost, not a claim about types. tibetanWeekday is
		// (dayOfWeek + 1) mod 7, so the two numbers NEVER coincide. On ISO Sunday, dayOfWeek is 7 and
		// the runtime guard rejects it — loudly. On the other six the call succeeds and returns
		// the wrong name. That asymmetry is the finding: six silent, one loud.
		let silentlyWrong = 0;
		let threw = 0;
		const total = 70;
		let day = iso("2027-01-01");
		for (let i = 0; i < total; i++) {
			const date = isoToTibetan(day);
			const correct = weekdayNameFor(date.tibetanWeekday).wylie;
			try {
				const slipped = weekdayNameFor(date.dayOfWeek as unknown as TibetanWeekday).wylie;
				if (slipped !== correct) silentlyWrong++;
			} catch {
				threw++;
			}
			day = day.add({ days: 1 });
		}
		expect(silentlyWrong).toBe((total / 7) * 6);
		expect(threw).toBe(total / 7);
	});

	it("validates on the way in from a number this package did not produce", () => {
		expect(weekdayNameFor(asTibetanWeekday(0)).planet).toBe("saturn");
		for (const bad of [7, -1, 1.5, Number.NaN]) {
			expect(codeOf(() => asTibetanWeekday(bad))).toBe("TCT_FIELD_OUT_OF_RANGE");
		}
	});

	it("erases at runtime, so a branded value is just a number", () => {
		expect(typeof asTibetanWeekday(3)).toBe("number");
		expect(asTibetanWeekday(3) + 1).toBe(4);
		expect(JSON.parse(JSON.stringify({ w: asTibetanWeekday(3) })).w).toBe(3);
	});
});
