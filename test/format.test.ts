import { describe, expect, it } from "vitest";
import { isoToTibetan, losarFor, tibetanToIso } from "../src/computation/conversion.js";
import { formatTibetanDate } from "../src/format.js";
import type { TibetanDate } from "../src/types.js";
import { SkippedDayError } from "../src/types.js";

const iso = (s: string) => Temporal.PlainDate.from(s);

const codeOf = (call: () => unknown): string | undefined => {
	try {
		call();
		return undefined;
	} catch (error) {
		return (error as { code?: string }).code;
	}
};

describe("formatTibetanDate", () => {
	it("renders the documented forms", () => {
		expect(formatTibetanDate(isoToTibetan(iso("2027-01-15")))).toBe("2153-M12-08");
		expect(formatTibetanDate(isoToTibetan(iso("2000-02-06")))).toBe("2127-M01L-01");
		expect(formatTibetanDate(isoToTibetan(iso("2025-11-19")))).toBe("2152-M09-30 (leap)");
	});

	it("still accepts a TibetanDate unchanged", () => {
		for (const day of ["2026-02-18", "2026-08-12", "2000-02-06", "2025-11-20"]) {
			const date = isoToTibetan(iso(day));
			expect(formatTibetanDate(date), day).toMatch(/^-?\d+-M\d{2}L?-\d{2}( \(leap\))?$/);
		}
		expect(formatTibetanDate(losarFor(2153))).toBe("2153-M01-01");
	});

	/**
	 * The gain from taking the input shape. `monthCode` is a derived field, and reading it meant
	 * trusting the caller to have derived it consistently. Now `monthCodeOf` is the sole producer,
	 * so an object whose `month` and `monthCode` disagree cannot yield a self-contradicting string.
	 */
	it("derives the month segment rather than trusting a supplied monthCode", () => {
		const date = isoToTibetan(iso("2027-01-15"));

		const contradictory: TibetanDate = { ...date, monthCode: "M99L" };
		expect(formatTibetanDate(contradictory)).toBe("2153-M12-08");

		const renumbered: TibetanDate = { ...date, month: 3 };
		expect(formatTibetanDate(renumbered)).toBe("2153-M03-08");
	});

	it("accepts a bare input shape, defaulting both flags to false", () => {
		expect(formatTibetanDate({ year: 2153, month: 6, day: 30 })).toBe("2153-M06-30");
		expect(formatTibetanDate({ year: 2153, month: 6, day: 30, isLeapMonth: true })).toBe(
			"2153-M06L-30",
		);
		expect(formatTibetanDate({ year: 2153, month: 6, day: 30, isLeapDay: true })).toBe(
			"2153-M06-30 (leap)",
		);
	});

	it("pads month and day but not the year", () => {
		expect(formatTibetanDate({ year: 7, month: 1, day: 1 })).toBe("7-M01-01");
		expect(formatTibetanDate({ year: -45, month: 11, day: 29 })).toBe("-45-M11-29");
	});

	/**
	 * The whole docblock is an argument that a plausible-but-wrong string is the failure worth
	 * preventing, and handed `{}` this once produced exactly one.
	 */
	it("refuses anything that is not a date rather than rendering undefined", () => {
		for (const value of [
			{},
			null,
			undefined,
			"2153-M12-08",
			{ year: 2153, month: 12 },
			{ year: 2153, month: 0, day: 1 },
			{ year: 2153, month: 13, day: 1 },
			{ year: 2153, month: 12, day: 0 },
			{ year: 2153, month: 12, day: 31 },
			{ year: 1.5, month: 12, day: 8 },
			{ year: 2153, month: 12, day: Number.NaN },
		]) {
			expect(
				codeOf(() => formatTibetanDate(value as never)),
				JSON.stringify(value),
			).toBe("TCT_FIELD_OUT_OF_RANGE");
		}
	});
});

/**
 * `SkippedDayError` used to build its own string: `2150-12-29`, with no `M` — indistinguishable
 * from an ISO date by eye — and a ` (leap)` suffix meaning a leap *month* where the formatter uses
 * it for a leap *day*. Two incompatible renderings inside one package is what `formatTibetanDate`
 * exists to prevent, so the error now goes through it.
 *
 * Message text is not contract and the rest of the suite asserts on `error.code`. This is scoped to
 * the date substring, which is the part that was inconsistent.
 */
describe("SkippedDayError message", () => {
	it("carries the canonical form of the date it names", () => {
		const skipped = () => tibetanToIso({ year: 2150, month: 12, day: 29 });
		expect(skipped).toThrow(SkippedDayError);
		try {
			skipped();
		} catch (error) {
			expect((error as Error).message).toContain("2150-M12-29");
			expect((error as Error).message).not.toContain("2150-12-29");
		}
	});

	it("marks a leap month with the code, not with a suffix that means a leap day", () => {
		const error = new SkippedDayError({ year: 2127, month: 1, day: 30, isLeapMonth: true });
		expect(error.message).toContain("2127-M01L-30");
		expect(error.message).not.toContain("(leap)");
	});
});
