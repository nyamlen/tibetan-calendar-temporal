import { describe, expect, it } from "vitest";
import { isoToTibetan, tibetanDateExists, tibetanToIso } from "../src/computation/conversion.js";
import { SkippedDayError } from "../src/types.js";

const iso = (s: string) => Temporal.PlainDate.from(s);

/**
 * Tier 3. Phase 1's suites prove these categories occur and behave consistently; these pin
 * **named instances** of each, taken from sources rather than from the engine's own output.
 *
 * The distinction matters. "Some day in this decade is doubled" survives a systematic one-day
 * error; "9 and 10 July 2024 are both 4 of leap month 6, and FPMT says so" does not.
 */

describe("skipped dates, by name", () => {
	// Lotsawa House prints `28 | Thu | Feb 8` then `30 * | Fri | Feb 9`. Janson §6: when two lunar
	// days end on one calendar day, that day takes the name of the *first*, so 29 is skipped.
	// christian-steinert numbers this day 29 instead — see docs/development/testing.md.
	it("skips 29 of month 12 in the Tibetan year beginning 2023", () => {
		const year = isoToTibetan(iso("2024-02-08")).year;
		expect(isoToTibetan(iso("2024-02-07")).day).toBe(27);
		expect(isoToTibetan(iso("2024-02-08")).day).toBe(28);
		expect(isoToTibetan(iso("2024-02-09")).day).toBe(30);
		expect(tibetanDateExists({ year, month: 12, day: 29 })).toBe(false);
	});

	// The mirror image: here the skip lands on the lower number, so the surviving day takes 21.
	// Both are the same rule; which number disappears is decided by the astronomy, not a
	// convention, which is why one example of each is pinned.
	it("skips 20 of month 9 in 2025, so 10 November is the 21st", () => {
		const year = isoToTibetan(iso("2025-11-10")).year;
		expect(isoToTibetan(iso("2025-11-09")).day).toBe(19);
		expect(isoToTibetan(iso("2025-11-10")).day).toBe(21);
		expect(tibetanDateExists({ year, month: 9, day: 20 })).toBe(false);
	});

	it("throws SkippedDayError carrying the requested date", () => {
		const year = isoToTibetan(iso("2024-02-08")).year;
		const requested = { year, month: 12, day: 29 };
		expect(() => tibetanToIso(requested)).toThrow(SkippedDayError);
		try {
			tibetanToIso(requested);
			expect.unreachable("should have thrown");
		} catch (error) {
			expect((error as SkippedDayError).requested).toEqual(requested);
		}
	});
});

describe("doubled dates, by name", () => {
	// Confirmed by Lotsawa House (`30 +` twice), christian-steinert (repeatedTibDay 1 then 2) and
	// eszthoff. It is also Janson's 2025 a2 divergence date, so it is pinned in
	// test/computation/conversion.test.ts against the almanac value.
	it("doubles 30 of month 9 in 2025 across 19 and 20 November", () => {
		const first = isoToTibetan(iso("2025-11-19"));
		const second = isoToTibetan(iso("2025-11-20"));
		expect([first.day, second.day]).toEqual([30, 30]);
		expect([first.isLeapDay, second.isLeapDay]).toEqual([true, false]);
		expect(second.isoDate.since(first.isoDate).days).toBe(1);
	});

	it("distinguishes the two halves on the round trip", () => {
		const year = isoToTibetan(iso("2025-11-19")).year;
		expect(tibetanToIso({ year, month: 9, day: 30, isLeapDay: true }).toString()).toBe(
			"2025-11-19",
		);
		expect(tibetanToIso({ year, month: 9, day: 30 }).toString()).toBe("2025-11-20");
	});
});

describe("leap months, by name", () => {
	// Lotsawa House renders two month-6 tables for 2024, the first starting 6 July.
	it("gives the Tibetan year beginning 2024 a leap month 6 starting 6 July", () => {
		const start = isoToTibetan(iso("2024-07-06"));
		expect(start.monthCode).toBe("M06L");
		expect(start.day).toBe(1);
		expect(start.isLeapMonth).toBe(true);

		// The main month 6 follows it, a lunar month later.
		const main = isoToTibetan(iso("2024-08-05"));
		expect(main.monthCode).toBe("M06");
		expect(main.day).toBe(1);
		expect(main.isLeapMonth).toBe(false);
	});

	it("gives the Tibetan year beginning 2027 a leap month 2 starting 9 March", () => {
		const start = isoToTibetan(iso("2027-03-09"));
		expect(start.monthCode).toBe("M02L");
		expect(start.day).toBe(1);
	});

	it("rejects a leap month that does not exist", () => {
		const year = isoToTibetan(iso("2024-07-06")).year;
		expect(() => tibetanToIso({ year, month: 5, day: 1, isLeapMonth: true })).toThrow(RangeError);
	});
});

describe("month and year boundaries", () => {
	// Losar 2026 is 18 February per Janson's table. The day before must be the last day of the
	// previous year's month 12 -- an off-by-one here is exactly the error docs/development/testing.md records
	// an early draft making, when it dated Losar 2026 to 17 February.
	it("puts the day before Losar 2026 at the end of the preceding year", () => {
		const losar = isoToTibetan(iso("2026-02-18"));
		const before = isoToTibetan(iso("2026-02-17"));

		expect({ month: losar.month, day: losar.day }).toEqual({ month: 1, day: 1 });
		expect(before.month).toBe(12);
		expect(before.yearStartsIn).toBe(losar.yearStartsIn - 1);
		expect(before.year).toBe(losar.year - 1);
	});

	it("carries the royal-era year across the Gregorian new year without changing", () => {
		const december = isoToTibetan(iso("2026-12-31"));
		const january = isoToTibetan(iso("2027-01-01"));
		expect(january.year).toBe(december.year);
		expect(january.yearStartsIn).toBe(2026);
	});
});

describe("dates near the epoch", () => {
	// E806 is chosen so the true month count is non-negative for every date after 806 CE. A date
	// just after the epoch must still round-trip; a regression in the search window or the month
	// count would surface here before it surfaced anywhere else.
	it("round-trips a date days after the epoch", () => {
		const date = iso("0806-03-01");
		const t = isoToTibetan(date);
		expect(t.yearStartsIn).toBe(806);
		expect(
			tibetanToIso({
				year: t.year,
				month: t.month,
				day: t.day,
				isLeapMonth: t.isLeapMonth,
				isLeapDay: t.isLeapDay,
			}).toString(),
		).toBe(date.toString());
	});

	it("round-trips every day of the first two months after the epoch", () => {
		let date = iso("0806-02-20");
		for (let i = 0; i < 60; i++) {
			const t = isoToTibetan(date);
			const back = tibetanToIso({
				year: t.year,
				month: t.month,
				day: t.day,
				isLeapMonth: t.isLeapMonth,
				isLeapDay: t.isLeapDay,
			});
			expect(back.toString()).toBe(date.toString());
			date = date.add({ days: 1 });
		}
	});
});
