import { describe, expect, it } from "vitest";
import {
	isoToTibetan,
	julianDayFromIso,
	tibetanDateExists,
	tibetanToIso,
	tibetanWeekday,
} from "../src/computation/conversion.js";
import { formatTibetanDate } from "../src/format.js";
import { PHUGPA_HENNING } from "../src/traditions/phugpa.js";
import { SkippedDayError } from "../src/types.js";

const iso = (s: string) => Temporal.PlainDate.from(s);

/**
 * Every claim the README's usage section makes, asserted exactly as written there.
 *
 * Examples in a README rot silently: nothing compiles them, and a reader who copies one that no
 * longer works concludes the library is broken. This suite is the reason the README can state
 * concrete outputs instead of hedging with "something like".
 *
 * Writing it caught a real error before publication — the leap-month example claimed
 * `{ month: 6, day: 4, isLeapMonth: true }` returned 9 July 2024 when it returns the 10th,
 * because that date is a doubled day and needs `isLeapDay` too. If an example here changes,
 * change the README in the same commit.
 */
describe("README usage examples", () => {
	const date = isoToTibetan(iso("2026-08-12"));

	it("converts a Western date", () => {
		expect(formatTibetanDate(date)).toBe("2153-M06-30");
		expect(date.month).toBe(6);
		expect(date.day).toBe(30);
	});

	it("serialises to the documented JSON", () => {
		expect(JSON.parse(JSON.stringify(date))).toEqual({
			year: 2153,
			yearStartsIn: 2026,
			rabjung: { cycle: 17, year: 40 },
			yearName: { element: "fire", animal: "horse", gender: "male" },
			month: 6,
			monthCode: "M06",
			isLeapMonth: false,
			day: 30,
			isDoubledDay: false,
			isLeapDay: false,
			isoDate: "2026-08-12",
			dayOfWeek: 3,
		});
	});

	it("numbers the weekday as ISO 8601 and names it through Temporal", () => {
		expect(date.dayOfWeek).toBe(3);
		expect(date.isoDate.dayOfWeek).toBe(3);
		expect(date.isoDate.toLocaleString("en-GB", { weekday: "long" })).toBe("Wednesday");
		// The almanac convention, 0 = Saturday, kept separate from the ISO field.
		expect(tibetanWeekday(julianDayFromIso(iso("2026-08-12")))).toBe(4);
	});

	it("converts back, with the royal-era year 127 ahead of yearStartsIn", () => {
		expect(tibetanToIso({ year: 2153, month: 6, day: 30 }).toString()).toBe("2026-08-12");
		expect(date.year - date.yearStartsIn).toBe(127);
	});

	it("reports and throws on the documented skipped date", () => {
		expect(tibetanDateExists({ year: 2150, month: 12, day: 29 })).toBe(false);
		expect(() => tibetanToIso({ year: 2150, month: 12, day: 29 })).toThrow(SkippedDayError);
		expect(() => tibetanToIso({ year: 2150, month: 12, day: 29 })).toThrow(
			"Tibetan date 2150-12-29 is skipped: no calendar day carries this number.",
		);
	});

	it("distinguishes the halves of the documented doubled date", () => {
		expect(isoToTibetan(iso("2025-11-19")).isLeapDay).toBe(true);
		expect(isoToTibetan(iso("2025-11-20")).isLeapDay).toBe(false);
		expect(isoToTibetan(iso("2025-11-19")).isDoubledDay).toBe(true);
		expect(tibetanToIso({ year: 2152, month: 9, day: 30, isLeapDay: true }).toString()).toBe(
			"2025-11-19",
		);
		expect(tibetanToIso({ year: 2152, month: 9, day: 30 }).toString()).toBe("2025-11-20");
	});

	it("selects the documented leap month", () => {
		const leap = isoToTibetan(iso("2024-07-06"));
		expect(leap.monthCode).toBe("M06L");
		expect(leap.isLeapMonth).toBe(true);
		expect(tibetanToIso({ year: 2151, month: 6, day: 1, isLeapMonth: true }).toString()).toBe(
			"2024-07-06",
		);
		expect(tibetanToIso({ year: 2151, month: 6, day: 1 }).toString()).toBe("2024-08-05");
	});

	// The composed case the README warns about, and the one that caught the drafting error.
	it("needs both flags where a leap month and a doubled day coincide", () => {
		expect(
			tibetanToIso({
				year: 2151,
				month: 6,
				day: 4,
				isLeapMonth: true,
				isLeapDay: true,
			}).toString(),
		).toBe("2024-07-09");
		expect(tibetanToIso({ year: 2151, month: 6, day: 4, isLeapMonth: true }).toString()).toBe(
			"2024-07-10",
		);
	});

	it("names the year as documented", () => {
		const losar = isoToTibetan(iso("2026-02-18"));
		expect(formatTibetanDate(losar)).toBe("2153-M01-01");
		expect(losar.yearName).toEqual({ element: "fire", animal: "horse", gender: "male" });
		expect(losar.rabjung).toEqual({ cycle: 17, year: 40 });
	});

	it("shows the documented difference between the two traditions", () => {
		const day = iso("2025-11-19");
		expect(formatTibetanDate(isoToTibetan(day))).toBe("2152-M09-30 (leap)");
		expect(formatTibetanDate(isoToTibetan(day, PHUGPA_HENNING))).toBe("2152-M09-29");
	});
});
