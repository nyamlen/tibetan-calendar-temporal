import { describe, expect, it } from "vitest";
import { isoToTibetan, losarFor, tibetanToIso } from "../src/computation/conversion.js";
import { formatTibetanDate, formatTibetanMonth } from "../src/format.js";
import { monthsFor, resolveMonth } from "../src/months.js";
import { parseTibetanMonth } from "../src/parse.js";
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
		// Not a date-shaped thing at all: nothing here has a field to be out of a range.
		for (const value of [null, undefined, "2153-M12-08"]) {
			expect(
				codeOf(() => formatTibetanDate(value as never)),
				JSON.stringify(value),
			).toBe("TCT_INVALID_ARGUMENT");
		}
		// Object-shaped and MISSING a required field. Absent is TCT_INVALID_ARGUMENT, not out of
		// range: the argument is malformed rather than naming an impossible date, and only the
		// range code is on tibetanDateExists's swallow-allowlist. Reversed 2026-08-26.
		for (const value of [{}, { year: 2153, month: 12 }, { year: 2153, month: 12, day: "8" }]) {
			expect(
				codeOf(() => formatTibetanDate(value as never)),
				JSON.stringify(value),
			).toBe("TCT_INVALID_ARGUMENT");
		}
		// Object-shaped, every required field present, and a number out of its range.
		for (const value of [
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

describe("formatTibetanMonth / parseTibetanMonth", () => {
	it("renders the leap pair distinguishably", () => {
		expect(formatTibetanMonth({ year: 2151, month: 6, isLeapMonth: true })).toBe("2151-M06L");
		expect(formatTibetanMonth({ year: 2151, month: 6 })).toBe("2151-M06");
	});

	it("round-trips every month of a leap year, leap pair included", () => {
		const months = monthsFor(2151);
		expect(months).toHaveLength(13);
		const bad: string[] = [];
		for (const month of months) {
			const text = formatTibetanMonth(month);
			const back = parseTibetanMonth(text);
			if (
				back.year !== month.year ||
				back.month !== month.month ||
				back.isLeapMonth !== month.isLeapMonth
			) {
				bad.push(text);
			}
			if (formatTibetanMonth(back) !== text) bad.push(`${text} (not an identity)`);
		}
		expect(bad).toEqual([]);
	});

	it("accepts a TibetanDate and drops the day, as the docblock states", () => {
		const date = isoToTibetan(iso("2027-01-15"));
		expect(formatTibetanMonth(date)).toBe("2153-M12");
	});

	it("refuses a plausible-but-wrong string rather than guessing", () => {
		for (const text of ["2151-06", "2151-M6", "2151-M06l", "2151-M06-01", "2151-M13"]) {
			expect(codeOf(() => parseTibetanMonth(text))).toBe("TCT_INVALID_ARGUMENT");
		}
	});

	it("composes with resolveMonth", () => {
		expect(resolveMonth(parseTibetanMonth("2151-M06L")).days).toBe(30);
	});
});

describe("the month string pair's guards", () => {
	// Added after `npm run coverage` reported these three lines unreached — the new code shipped
	// with its happy path and its grammar covered and its FIELD guards not. Coverage is run for
	// what it reports, not only to keep it passing.
	it("refuses a month object that is not one", () => {
		expect(codeOf(() => formatTibetanMonth({ year: 2151, month: 13 }))).toBe(
			"TCT_FIELD_OUT_OF_RANGE",
		);
		expect(codeOf(() => formatTibetanMonth({ year: 2151, month: 0 }))).toBe(
			"TCT_FIELD_OUT_OF_RANGE",
		);
		expect(codeOf(() => formatTibetanMonth({ year: 1.5, month: 1 }))).toBe(
			"TCT_FIELD_OUT_OF_RANGE",
		);
		expect(codeOf(() => formatTibetanMonth({} as never))).toBe("TCT_INVALID_ARGUMENT");
		expect(codeOf(() => formatTibetanMonth(null as never))).toBe("TCT_INVALID_ARGUMENT");
	});

	it("refuses a non-string where the text belongs", () => {
		for (const value of [null, undefined, 2151, { year: 2151 }]) {
			expect(codeOf(() => parseTibetanMonth(value as never))).toBe("TCT_INVALID_ARGUMENT");
		}
	});

	it("refuses a year outside the safe-integer range, as the date parser does", () => {
		// Parses the grammar, then fails on the value — so it is a FIELD out of range, not a
		// malformed string. The two codes are on opposite sides of the boundary the parser draws.
		const huge = `${"9".repeat(20)}-M06`;
		expect(codeOf(() => parseTibetanMonth(huge))).toBe("TCT_FIELD_OUT_OF_RANGE");
	});
});
