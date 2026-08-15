import { describe, expect, it } from "vitest";
import { isoToTibetan, tibetanToIso } from "../src/computation/conversion.js";
import { formatTibetanDate } from "../src/format.js";
import { parseTibetanDate } from "../src/parse.js";
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

describe("parseTibetanDate", () => {
	it("reads each part of the canonical form", () => {
		expect(parseTibetanDate("2153-M12-08")).toEqual({
			year: 2153,
			month: 12,
			day: 8,
			isLeapMonth: false,
			isLeapDay: false,
		});
		expect(parseTibetanDate("2127-M01L-01")).toEqual({
			year: 2127,
			month: 1,
			day: 1,
			isLeapMonth: true,
			isLeapDay: false,
		});
		expect(parseTibetanDate("2152-M09-30 (leap)")).toEqual({
			year: 2152,
			month: 9,
			day: 30,
			isLeapMonth: false,
			isLeapDay: true,
		});
	});

	it("always reports both flags, so the shape is predictable", () => {
		expect(Object.keys(parseTibetanDate("2153-M01-01")).sort()).toEqual([
			"day",
			"isLeapDay",
			"isLeapMonth",
			"month",
			"year",
		]);
	});

	it("accepts a year of zero and negative years", () => {
		expect(parseTibetanDate("0-M01-01").year).toBe(0);
		expect(parseTibetanDate("-45-M01-01").year).toBe(-45);
	});

	/**
	 * The whole point of returning an input shape rather than a resolved date. A skipped date is a
	 * well-formed string that names no calendar day; almanacs and written sources print them, so a
	 * parser that could not read one back would be the wrong parser.
	 */
	it("parses a skipped date rather than throwing on it", () => {
		const skipped = parseTibetanDate("2150-M12-29");
		expect(skipped).toEqual({
			year: 2150,
			month: 12,
			day: 29,
			isLeapMonth: false,
			isLeapDay: false,
		});
		// The string was fine; resolving it is what fails.
		expect(() => tibetanToIso(skipped)).toThrow(SkippedDayError);
	});

	/**
	 * Strict by construction. Loosening a grammar later breaks nobody; tightening one does.
	 */
	it.each([
		["unpadded day", "2153-M12-8"],
		["unpadded month", "2153-M1-01"],
		["lowercase month marker", "2153-m12-08"],
		["lowercase leap-month suffix", "2153-M01l-01"],
		["no month marker, i.e. an ISO-looking date", "2153-12-08"],
		["leading zero on the year", "02153-M12-08"],
		["explicit plus on the year", "+2153-M12-08"],
		["negative zero year", "-0-M12-08"],
		["month 13", "2153-M13-01"],
		["month 00", "2153-M00-01"],
		["day 31", "2153-M12-31"],
		["day 00", "2153-M12-00"],
		["capitalised leap suffix", "2153-M12-08 (Leap)"],
		["leap suffix without a space", "2153-M12-08(leap)"],
		["leading whitespace", " 2153-M12-08"],
		["trailing whitespace", "2153-M12-08 "],
		["trailing text", "2153-M12-08 extra"],
		["empty string", ""],
	])("refuses %s", (_label, text) => {
		// A well-typed string in the wrong shape is a wrong argument, not a field out of a range:
		// the grammar never got far enough to have a field. Some of these do name an out-of-range
		// number — "2153-M13-01" — but the regex rejects the whole string before any field is read,
		// so one code covers the grammar and the split stays at the boundary the parser draws.
		expect(
			codeOf(() => parseTibetanDate(text)),
			text,
		).toBe("TCT_INVALID_ARGUMENT");
	});

	it("refuses a non-string and an unrepresentable year", () => {
		// `Object.create(null)` is in the list because it has no `constructor` — the branch the
		// message-building helper needs a fallback for, and the one coverage showed untested.
		for (const value of [null, undefined, 2153, {}, ["2153-M12-08"], Object.create(null)]) {
			expect(codeOf(() => parseTibetanDate(value as unknown as string))).toBe(
				"TCT_INVALID_ARGUMENT",
			);
		}
		// This one *is* a field out of a range: it parses as canonical, then the year it names
		// cannot be represented. The grammar was satisfied, so the failure is about the value.
		expect(codeOf(() => parseTibetanDate("99999999999999999999-M12-08"))).toBe(
			"TCT_FIELD_OUT_OF_RANGE",
		);
	});
});

/**
 * The two round trips, and the reason both are needed.
 *
 * The string identity checks that the pair is lossless and that it typechecks as an identity —
 * which is the whole reason `formatTibetanDate` takes the input shape. The value identity checks
 * that the parse means the *same day*, which a purely textual property cannot establish: a parser
 * that swapped month and day would satisfy the first and fail the second.
 */
describe("round trip", () => {
	it("is a string identity across a four-year sweep", { timeout: 30_000 }, () => {
		for (
			let day = iso("2024-01-01");
			Temporal.PlainDate.compare(day, iso("2027-12-31")) <= 0;
			day = day.add({ days: 1 })
		) {
			const text = formatTibetanDate(isoToTibetan(day));
			expect(formatTibetanDate(parseTibetanDate(text)), day.toString()).toBe(text);
		}
	});

	it("is a value identity across a four-year sweep", { timeout: 30_000 }, () => {
		for (
			let day = iso("2024-01-01");
			Temporal.PlainDate.compare(day, iso("2027-12-31")) <= 0;
			day = day.add({ days: 1 })
		) {
			const text = formatTibetanDate(isoToTibetan(day));
			expect(tibetanToIso(parseTibetanDate(text)).toString(), text).toBe(day.toString());
		}
	});

	/**
	 * The sweep covers these, but named cases say what it is covering. Each is a feature of the
	 * format that a naive parser drops, and each names a different day from the one it collides with.
	 */
	it("round-trips the three cases the format exists to distinguish", () => {
		// A leap month, which a bare `${year}-${month}-${day}` collides with its twin.
		const leapMonth = formatTibetanDate(isoToTibetan(iso("2000-02-06")));
		expect(leapMonth).toBe("2127-M01L-01");
		expect(tibetanToIso(parseTibetanDate(leapMonth)).toString()).toBe("2000-02-06");

		// Both halves of a doubled day, which share a number and differ only in the suffix.
		const first = formatTibetanDate(isoToTibetan(iso("2025-11-19")));
		const second = formatTibetanDate(isoToTibetan(iso("2025-11-20")));
		expect(first).toMatch(/ \(leap\)$/);
		expect(second).not.toMatch(/ \(leap\)$/);
		expect(first.replace(" (leap)", "")).toBe(second);
		expect(tibetanToIso(parseTibetanDate(first)).toString()).toBe("2025-11-19");
		expect(tibetanToIso(parseTibetanDate(second)).toString()).toBe("2025-11-20");
	});
});
