import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
	firstDayOfMonth,
	lastDayOfMonth,
	losarJulianDay,
	monthFromCount,
	trueMonthCount,
} from "../../src/computation/calendar.js";
import {
	isoFromJulianDay,
	isoToTibetan,
	julianDayFromIso,
	losarFor,
	tibetanDateExists,
	tibetanToIso,
	tibetanWeekday,
} from "../../src/computation/conversion.js";
import { meanDate } from "../../src/computation/mean-astronomy.js";
import { deriveScaling } from "../../src/computation/scaling.js";
import { rabjungFor, yearNameFor } from "../../src/cycles.js";
import type { TibetanCalendarErrorCode } from "../../src/errors.js";
import { PHUGPA, PHUGPA_HENNING } from "../../src/traditions/phugpa.js";
import { SkippedDayError } from "../../src/types.js";
import { LOSAR_DATES } from "../fixtures/losar.js";

const scaled = deriveScaling(PHUGPA);
const iso = (s: string) => Temporal.PlainDate.from(s);

describe("Julian day numbers", () => {
	// Janson §2 gives this worked value explicitly.
	it("puts 1 January 2007 at JD 2454102", () => {
		expect(julianDayFromIso(iso("2007-01-01"))).toBe(2_454_102);
	});

	it("round-trips against Temporal", () => {
		fc.assert(
			fc.property(fc.integer({ min: 1_800_000, max: 3_000_000 }), (jd) => {
				expect(julianDayFromIso(isoFromJulianDay(jd))).toBe(jd);
			}),
		);
	});

	it("advances by exactly one per calendar day", () => {
		fc.assert(
			fc.property(fc.integer({ min: 2_000_000, max: 2_600_000 }), (jd) => {
				expect(julianDayFromIso(isoFromJulianDay(jd).add({ days: 1 }))).toBe(jd + 1);
			}),
		);
	});
});

describe("day of week", () => {
	// Janson §9: 0 = Saturday. JD 2454102 is 1 January 2007, a Monday, so it must give 2.
	it("numbers 0 as Saturday", () => {
		expect(tibetanWeekday(2_454_102)).toBe(2);
		expect(iso("2007-01-01").dayOfWeek).toBe(1); // ISO Monday
	});

	it("agrees with the ISO weekday up to the fixed offset", () => {
		fc.assert(
			fc.property(fc.integer({ min: 2_000_000, max: 2_600_000 }), (jd) => {
				const isoWeekday = isoFromJulianDay(jd).dayOfWeek; // 1=Mon..7=Sun
				expect(tibetanWeekday(jd)).toBe(isoWeekday % 7 === 0 ? 1 : (isoWeekday + 1) % 7);
			}),
		);
	});

	/**
	 * The field form. Reaching this from a `TibetanDate` used to mean
	 * `tibetanWeekday(julianDayFromIso(date.isoDate))` — two calls and a re-conversion for a Julian
	 * day the engine had already computed — while `date.dayOfWeek` sat in plain sight carrying the
	 * ISO numbering. A consumer who reached for the visible one printed numbers that did not match
	 * the almanac column.
	 */
	it("carries the same numbering as a field on TibetanDate", () => {
		fc.assert(
			fc.property(fc.integer({ min: 2_200_000, max: 2_500_000 }), (jd) => {
				const date = isoToTibetan(isoFromJulianDay(jd));
				expect(date.tibetanWeekday).toBe(tibetanWeekday(jd));
			}),
		);
	});

	/**
	 * Janson's reason for the field, which is stronger than the display one: "The date and the day
	 * of week are often given together. This resolves the ambiguity when days are repeated." Both
	 * halves of a doubled pair carry the same `day`, so the weekday is what tells them apart.
	 */
	it("distinguishes the two halves of a doubled day", () => {
		const first = isoToTibetan(iso("2025-11-19"));
		const second = isoToTibetan(iso("2025-11-20"));
		expect(first.isDoubledDay).toBe(true);
		expect(second.isDoubledDay).toBe(true);
		expect(first.day).toBe(second.day);
		expect(first.tibetanWeekday).not.toBe(second.tibetanWeekday);
		expect(second.tibetanWeekday).toBe((first.tibetanWeekday + 1) % 7);
	});
});

// The primary correctness gate. Losar exercises the month count, the leap-month rule, the
// day-labelling rule and the true-date astronomy simultaneously.
describe("Janson's Losar table, 1927-2046", () => {
	it("reproduces all 120 dates", () => {
		const mismatches: string[] = [];
		for (const row of LOSAR_DATES) {
			const computed = isoFromJulianDay(losarJulianDay(scaled, PHUGPA, row.year)).toString();
			if (computed !== row.losar)
				mismatches.push(`${row.year}: expected ${row.losar}, got ${computed}`);
		}
		expect(mismatches).toEqual([]);
	});

	// Losar is the first day of month 1 — but that day is numbered 2 whenever day 1 is skipped.
	// Janson makes exactly this point, and it is why he computes Losar from the *previous*
	// year's month 12 rather than by evaluating day 1 directly.
	it("puts every Losar in month 1, on day 1 or day 2", () => {
		const dayTwoYears: number[] = [];
		for (const row of LOSAR_DATES) {
			const date = isoToTibetan(iso(row.losar));
			expect({ year: date.yearStartsIn, month: date.month }).toEqual({
				year: row.year,
				month: 1,
			});
			expect([1, 2]).toContain(date.day);
			if (date.day === 2) dayTwoYears.push(row.year);
		}
		// The case is real but uncommon; if this ever becomes empty the fixture or the
		// day-labelling rule has changed.
		expect(dayTwoYears.length).toBeGreaterThan(0);
	});

	it("numbers Losar as day 2 exactly when day 1 of that month is skipped", () => {
		for (const row of LOSAR_DATES) {
			const date = isoToTibetan(iso(row.losar));
			const dayOneExists = tibetanDateExists({
				year: date.year,
				month: 1,
				day: 1,
				isLeapMonth: date.isLeapMonth,
			});
			expect(dayOneExists).toBe(date.day === 1);
		}
	});

	// Janson Remark 20: 2000 opened with a leap month 1, and Losar was still the first day of
	// the year — the one holiday that is observed in a leap month.
	it("puts Losar 2000 in the leap month 1", () => {
		const date = isoToTibetan(iso("2000-02-06"));
		expect(date.isLeapMonth).toBe(true);
		expect(date.monthCode).toBe("M01L");
		expect(date.day).toBe(1);
	});

	it("cross-checks the year names against the same table", () => {
		for (const row of LOSAR_DATES) {
			const date = isoToTibetan(iso(row.losar));
			const name = yearNameFor(date.year);
			expect(`${name.element}-${name.animal}`).toBe(row.name);
		}
	});
});

describe("losarFor", () => {
	it("reproduces all 120 dates in Janson's table", () => {
		const mismatches: string[] = [];
		for (const row of LOSAR_DATES) {
			const computed = losarFor(row.year + 127).isoDate.toString();
			if (computed !== row.losar)
				mismatches.push(`${row.year}: expected ${row.losar}, got ${computed}`);
		}
		expect(mismatches).toEqual([]);
	});

	// The reason this function exists. `tibetanToIso({ month: 1, day: 1 })` throws here, so
	// without it a caller cannot obtain Losar at all in these years.
	it("returns day 2 where day 1 is skipped, which tibetanToIso cannot express", () => {
		const losar = losarFor(2104);
		expect(losar.isoDate.toString()).toBe("1977-02-19");
		expect(losar.day).toBe(2);
		expect(tibetanDateExists({ year: 2104, month: 1, day: 1 })).toBe(false);
	});

	// Janson's Losar remark: the year opened with a leap month 1 and Losar was still its first
	// day — the one observance kept in a leap month.
	it("returns the leap month 1 for 2000", () => {
		const losar = losarFor(2127);
		expect(losar.isoDate.toString()).toBe("2000-02-06");
		expect(losar.monthCode).toBe("M01L");
	});

	it("takes the royal era, not Janson's Y", () => {
		expect(losarFor(2153).isoDate.toString()).toBe("2026-02-18");
		expect(losarFor(2153).yearStartsIn).toBe(2026);
	});
});

// Janson §6: the full moon ends lunar day 15 and the new moon ends lunar day 30, so the calendar
// day carrying one is the day that lunar day ends in. That is *usually* the day numbered 15 or 30
// — but not when the number is skipped, which is exactly why these are computed rather than
// derived from `day`.
describe("full moon and new moon", () => {
	// Explicit timeout: this walks about 73,000 calendar days, which is well under a second bare
	// but 5-8 seconds under v8 coverage instrumentation -- so `npm run coverage` failed on Vitest's
	// 5s default while `npm test` passed. CI runs test and not coverage, which is why it went
	// unnoticed.
	it("puts exactly one of each in every month over 200 years", () => {
		const first = trueMonthCount(PHUGPA, 1900, 1);
		const last = trueMonthCount(PHUGPA, 2100, 1);
		const wrong: string[] = [];
		for (let n = first; n < last; n++) {
			const month = monthFromCount(PHUGPA, n);
			let full = 0;
			let dark = 0;
			// Walk the calendar days of the month directly, which needs no date-existence
			// reasoning: every JD in the span is a real day carrying exactly one label.
			for (let jd = firstDayOfMonth(scaled, n); jd <= lastDayOfMonth(scaled, n); jd++) {
				const date = isoToTibetan(isoFromJulianDay(jd));
				if (date.isFullMoon) full++;
				if (date.isNewMoon) dark++;
			}
			if (full !== 1 || dark !== 1)
				wrong.push(`${month.year}-${month.month}${month.isLeap ? "L" : ""}: ${full}/${dark}`);
		}
		expect(wrong).toEqual([]);
	}, 30_000);

	it("lands on day 15 and day 30 in an ordinary month", () => {
		expect(isoToTibetan(iso("2026-08-12")).isNewMoon).toBe(true);
		expect(isoToTibetan(iso("2026-08-12")).day).toBe(30);
	});

	// The cases that make `day === 15` the wrong test. When 15 is skipped, lunar days 14 and 15
	// both end in one calendar day, which takes the earlier name — so the full moon is carried by
	// the day numbered 14.
	it("falls on day 14 when day 15 is skipped", () => {
		const date = isoToTibetan(iso("2026-12-23"));
		expect({ day: date.day, month: date.month, isFullMoon: date.isFullMoon }).toEqual({
			day: 14,
			month: 11,
			isFullMoon: true,
		});
		expect(tibetanDateExists({ year: 2153, month: 11, day: 15 })).toBe(false);
	});

	it("falls on day 29 when day 30 is skipped", () => {
		const date = isoToTibetan(iso("2025-02-27"));
		expect({ day: date.day, month: date.month, isNewMoon: date.isNewMoon }).toEqual({
			day: 29,
			month: 12,
			isNewMoon: true,
		});
		expect(tibetanDateExists({ year: 2151, month: 12, day: 30 })).toBe(false);
	});

	// A doubled number is carried by two calendar days; the phase instant is in the second of
	// them, not the leap day. 19 and 20 November 2025 are both 30 of month 9.
	it("falls on the second of a doubled pair, not the leap day", () => {
		const leapDay = isoToTibetan(iso("2025-11-19"));
		const ordinary = isoToTibetan(iso("2025-11-20"));
		expect({ isLeapDay: leapDay.isLeapDay, isNewMoon: leapDay.isNewMoon }).toEqual({
			isLeapDay: true,
			isNewMoon: false,
		});
		expect({ isLeapDay: ordinary.isLeapDay, isNewMoon: ordinary.isNewMoon }).toEqual({
			isLeapDay: false,
			isNewMoon: true,
		});
	});

	it("never marks a day as both", () => {
		fc.assert(
			fc.property(fc.integer({ min: -30_000, max: 30_000 }), (offset) => {
				const date = isoToTibetan(iso("2000-01-01").add({ days: offset }));
				return !(date.isFullMoon && date.isNewMoon);
			}),
		);
	});
});

// Janson's Remark 17: the epoch is the mean new moon beginning the month with true month
// count 0, and for E806 he states its Tibetan date as 29/1 806. This is an assertion about a
// computed value rather than an independent observation, but it pins the epoch end to end --
// mean date, true date, the month count and the day-labelling rule all have to agree to
// reproduce it.
describe("the epoch", () => {
	it("lands on 29/1 806, as Janson states for E806", () => {
		const epochJulianDay = Math.floor(meanDate(scaled, 0, 0) / scaled.meanDate.den);
		expect(epochJulianDay).toBe(2_015_501);
		const date = isoToTibetan(isoFromJulianDay(epochJulianDay));
		expect({ year: date.yearStartsIn, month: date.month, day: date.day }).toEqual({
			year: 806,
			month: 1,
			day: 29,
		});
		expect(date.isLeapMonth).toBe(false);
	});
});

describe("isoToTibetan", () => {
	// The TSDoc example, and the case where the royal-era year and the ISO year differ most
	// visibly.
	// Cross-checked by hand against Janson's own table: Losar 2026 is 2026-02-18 and Losar 2027
	// is 2027-02-07, so this Tibetan year runs 354 days and 2027-01-15 is its 332nd. Eleven
	// months is about 325 days, which puts the date early in month 12.
	it("converts 2027-01-15 to 8/12 of royal-era 2153", () => {
		const date = isoToTibetan(iso("2027-01-15"));
		expect(date.year).toBe(2153);
		expect(date.yearStartsIn).toBe(2026);
		expect(date.month).toBe(12);
		expect(date.day).toBe(8);
		expect(rabjungFor(date.year)).toMatchObject({ cycle: 17, year: 40 });
		expect(yearNameFor(date.year)).toMatchObject({
			element: "fire",
			animal: "horse",
			gender: "male",
		});
		expect(date.isoDate.toString()).toBe("2027-01-15");
	});

	it("always returns a date whose isoDate is the input", () => {
		fc.assert(
			fc.property(fc.integer({ min: 2_100_000, max: 2_600_000 }), (jd) => {
				const date = isoFromJulianDay(jd);
				expect(isoToTibetan(date).isoDate.equals(date)).toBe(true);
			}),
		);
	});

	it("produces only in-range month and day numbers", () => {
		fc.assert(
			fc.property(fc.integer({ min: 2_000_000, max: 2_700_000 }), (jd) => {
				const date = isoToTibetan(isoFromJulianDay(jd));
				expect(date.month).toBeGreaterThanOrEqual(1);
				expect(date.month).toBeLessThanOrEqual(12);
				expect(date.day).toBeGreaterThanOrEqual(1);
				expect(date.day).toBeLessThanOrEqual(30);
				expect(date.isLeapDay && !date.isDoubledDay).toBe(false);
			}),
		);
	});

	it("advances monotonically through consecutive days", () => {
		let previous = -Infinity;
		let date = iso("2024-01-01");
		for (let i = 0; i < 800; i++) {
			const t = isoToTibetan(date);
			const ordinal = t.yearStartsIn * 10_000 + t.month * 100 + t.day;
			expect(ordinal).toBeGreaterThanOrEqual(previous);
			previous = t.isLeapMonth || t.isDoubledDay ? previous : ordinal;
			date = date.add({ days: 1 });
		}
	});
});

describe("tibetanToIso", () => {
	it("inverts isoToTibetan for every day of a four-year span", () => {
		let date = iso("2023-01-01");
		for (let i = 0; i < 1461; i++) {
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

	it("rejects out-of-range input", () => {
		expect(() => tibetanToIso({ year: 2153, month: 13, day: 1 })).toThrow(RangeError);
		expect(() => tibetanToIso({ year: 2153, month: 0, day: 1 })).toThrow(/month must be/);
		expect(() => tibetanToIso({ year: 2153, month: 1, day: 31 })).toThrow(RangeError);
		expect(() => tibetanToIso({ year: 2153, month: 1, day: 0 })).toThrow(/day must be/);
		expect(() => tibetanToIso({ year: 2153, month: 5, day: 1, isLeapMonth: true })).toThrow(
			RangeError,
		);
	});

	/** The code of the error a call throws, or `undefined` if it does not throw. */
	const codeOf = (call: () => unknown): string | undefined => {
		try {
			call();
			return undefined;
		} catch (error) {
			return (error as { code?: string }).code;
		}
	};

	// Codes are the contract; message text is not. A consumer branching on a failure kind matches
	// these, which is why they are asserted separately from the wording above.
	it("codes each failure kind distinctly", () => {
		expect(codeOf(() => tibetanToIso({ year: 2153, month: 13, day: 1 }))).toBe(
			"TCT_FIELD_OUT_OF_RANGE",
		);
		expect(codeOf(() => tibetanToIso({ year: 2153, month: 1, day: 31 }))).toBe(
			"TCT_FIELD_OUT_OF_RANGE",
		);
		expect(codeOf(() => tibetanToIso({ year: Number.NaN, month: 1, day: 1 }))).toBe(
			"TCT_FIELD_OUT_OF_RANGE",
		);
		// A leap month that does not exist is its own code: the fields are all in range, and the
		// caller's fix is to drop a flag rather than to correct a number.
		expect(codeOf(() => tibetanToIso({ year: 2153, month: 5, day: 1, isLeapMonth: true }))).toBe(
			"TCT_NO_SUCH_LEAP_MONTH",
		);
		expect(codeOf(() => tibetanToIso({ year: 1e15, month: 3, day: 15 }))).toBe(
			"TCT_OUTSIDE_EXACT_RANGE",
		);
		expect(codeOf(() => isoToTibetan(iso("+012000-01-01"), PHUGPA_HENNING))).toBe(
			"TCT_OUTSIDE_EXACT_RANGE",
		);
		expect(codeOf(() => losarFor(2153.7))).toBe("TCT_FIELD_OUT_OF_RANGE");
	});

	// A caller converting a table gets one throw and has to find the row that caused it. The bad
	// field alone does not say which; the echoed input does.
	it("echoes the whole input and names the call", () => {
		expect(() => tibetanToIso({ year: 2153, month: 13, day: 4 })).toThrow(
			/tibetanToIso\(\{ year: 2153, month: 13, day: 4 \}\)/,
		);
		expect(() => tibetanToIso({ year: 2153, month: 5, day: 1, isLeapMonth: true })).toThrow(
			/isLeapMonth: true/,
		);
		expect(() => losarFor(2153.7)).toThrow(/losarFor\(2153\.7\)/);
	});

	// The bound is a property of the tradition, not of the package, so a caller who hits it on one
	// config and not the other has to be told which refused -- and a raw JD in the tens of millions
	// is not actionable without its ISO year.
	it("names the tradition and an ISO year in the exact-range message", () => {
		let thrown: unknown;
		try {
			isoToTibetan(iso("+012000-01-01"), PHUGPA_HENNING);
		} catch (error) {
			thrown = error;
		}
		const message = (thrown as Error).message;
		expect(message).toContain(PHUGPA_HENNING.name);
		expect(message).toMatch(/about ISO year \d+/);
	});

	// Everything below defends the integer-arithmetic premise at the one place untrusted values
	// enter. A fractional day used to pass every bound check and return a confident wrong date.
	it("rejects non-integer year, month and day", () => {
		expect(() => tibetanToIso({ year: 2153, month: 3, day: 15.5 })).toThrow(/day must be/);
		expect(() => tibetanToIso({ year: 2153, month: 3.4, day: 15 })).toThrow(/month must be/);
		expect(() => tibetanToIso({ year: 2153.7, month: 3, day: 15 })).toThrow(/year must be/);
		expect(() => losarFor(2153.7)).toThrow(/year must be/);
	});

	// NaN satisfies neither `< 1` nor `> 30`, so the bounds alone let it straight through.
	it("rejects NaN, Infinity and unsafe integers", () => {
		for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
			expect(() => tibetanToIso({ year: bad, month: 3, day: 15 })).toThrow(/year must be/);
			expect(() => tibetanToIso({ year: 2153, month: bad, day: 15 })).toThrow(/month must be/);
			expect(() => tibetanToIso({ year: 2153, month: 3, day: bad })).toThrow(/day must be/);
			expect(() => losarFor(bad)).toThrow(/year must be/);
		}
		expect(() => tibetanToIso({ year: 2 ** 53, month: 3, day: 15 })).toThrow(/year must be/);
	});

	it("accepts -0 as a year, and rejects it as a month or day", () => {
		// -0 is a safe integer and Janson's Y = 0 is a real year, so only the 1-based fields reject.
		expect(() => tibetanToIso({ year: 2153, month: 3, day: -0 })).toThrow(/day must be/);
		expect(() => tibetanToIso({ year: 2153, month: -0, day: 15 })).toThrow(/month must be/);
		expect(() => losarFor(-0)).not.toThrow();
	});

	it("reports 2^53 overflow as out-of-exact-range, never as a skipped date", () => {
		// The distinction is the whole point: a caller's correct response to SkippedDayError is
		// "fine, that date does not exist", not "my input is garbage".
		let thrown: unknown;
		try {
			tibetanToIso({ year: 1e15, month: 3, day: 15 });
		} catch (error) {
			thrown = error;
		}
		expect(thrown).toBeInstanceOf(RangeError);
		expect((thrown as Error).name).not.toBe("SkippedDayError");
		expect((thrown as Error).message).toMatch(/exact/);
		expect(() => losarFor(1e15)).toThrow(/exact/);
	});

	// PHUGPA_HENNING's common denominator is 15x Phugpa's, so its exact range is 17x tighter --
	// and unlike Phugpa's, it is reachable well inside Temporal.PlainDate's own range.
	it("enforces the exact range per tradition, not globally", () => {
		const henning = deriveScaling(PHUGPA_HENNING);
		expect(henning.exactToJulianDay).toBeLessThan(scaled.exactToJulianDay);

		const beyondHenning = iso("+012000-01-01");
		expect(() => isoToTibetan(beyondHenning, PHUGPA_HENNING)).toThrow(/exact/);
		expect(() => isoToTibetan(beyondHenning, PHUGPA)).not.toThrow();

		// Past Phugpa's own bound, both refuse.
		expect(() => isoToTibetan(iso("+275760-09-13"), PHUGPA)).toThrow(/exact/);
	});
});

describe("skipped and doubled days", () => {
	it("finds both kinds within a decade and keeps them consistent", () => {
		let doubled = 0;
		let skipped = 0;
		let date = iso("2020-01-01");
		for (let i = 0; i < 3653; i++) {
			const t = isoToTibetan(date);
			if (t.isDoubledDay) doubled++;
			date = date.add({ days: 1 });
		}
		for (let y = 2020; y < 2030; y++) {
			for (let m = 1; m <= 12; m++) {
				for (let d = 1; d <= 30; d++) {
					if (!tibetanDateExists({ year: y + 127, month: m, day: d })) skipped++;
				}
			}
		}
		// Both are common: roughly one of each every couple of months.
		expect(doubled).toBeGreaterThan(20);
		expect(skipped).toBeGreaterThan(20);
	});

	// The predicate must distinguish "this date is not real" from "the engine broke". A bare catch
	// cannot, and this function is the oracle for the suite's strongest property -- so a masked
	// internal failure would make that property pass more easily rather than fail.
	it("answers false for skipped and out-of-range input, and rethrows anything else", () => {
		expect(tibetanDateExists({ year: 2153, month: 3, day: 15 })).toBe(true);
		expect(tibetanDateExists({ year: 2153, month: 13, day: 1 })).toBe(false);
		expect(tibetanDateExists({ year: 2153, month: 3, day: 15.5 })).toBe(false);
		expect(tibetanDateExists({ year: Number.NaN, month: 3, day: 15 })).toBe(false);

		// A malformed tradition config is a caller bug, not a statement about the date, so it must
		// come back as a throw. It reaches here as a RangeError like every other input problem, which
		// the branch above would swallow -- the code is what keeps it out, and this pins that.
		const broken = { ...PHUGPA, moonTab: null as unknown as readonly number[] };
		let thrown: unknown;
		try {
			tibetanDateExists({ year: 2153, month: 3, day: 15 }, broken);
		} catch (error) {
			thrown = error;
		}
		expect(thrown).toBeInstanceOf(RangeError);
		expect((thrown as { code?: string }).code).toBe("TCT_INVALID_TRADITION_CONFIG");
		expect((thrown as Error).message).toMatch(/moonTab/);
	});

	// The test above pins four cases and one rethrow. This one pins the RULE, over every code the
	// package can throw -- which nothing did until 2026-09-23, and that absence is why three
	// docblocks came to describe the rule three different wrong ways (see the remarks on
	// `rangeError` and `codedError` in src/errors.ts, and on `rejectTemporalInstance` in
	// src/types.ts). The predicate answers `false` for exactly three things and rethrows the rest.
	//
	// Completeness is enforced by `tsc`, not by an assertion: the Record is keyed by the whole
	// TibetanCalendarErrorCode union, so adding a code to that union fails `npm run typecheck`
	// until it is classified here. Deciding which side a new code falls on is the point.
	const answersFalse: Record<TibetanCalendarErrorCode, boolean> = {
		// A date the calendar genuinely does not carry. Reported, not thrown.
		TCT_SKIPPED_DAY: true,
		TCT_FIELD_OUT_OF_RANGE: true,
		TCT_NO_SUCH_LEAP_MONTH: true,
		// Everything below is a broken program or an unanswerable question, not a date that does
		// not exist, so the caller must see it rather than read `false` as a calendrical fact.
		TCT_INVALID_ARGUMENT: false,
		TCT_OUTSIDE_EXACT_RANGE: false,
		TCT_INVALID_TRADITION_CONFIG: false,
		TCT_INVALID_OBSERVANCE_CONFIG: false,
		TCT_SPAN_TOO_WIDE: false,
		TCT_ATTRIBUTE_NOT_SOURCED: false,
		TCT_MISSING_TEMPORAL: false,
		TCT_INTERNAL: false,
	};

	// An input that makes `tibetanDateExists` meet each code on its own call path. Five codes have
	// no entry because they cannot be reached through this predicate at all: TCT_MISSING_TEMPORAL
	// is thrown at import, TCT_SPAN_TOO_WIDE and TCT_INVALID_OBSERVANCE_CONFIG belong to
	// ./observances, TCT_ATTRIBUTE_NOT_SOURCED to ./astrology, and TCT_INTERNAL is an invariant
	// this engine proves for itself. They are classified above but not exercised here; that is a
	// statement about this call path, not a claim that they are unreachable everywhere.
	const reachable: Partial<Record<TibetanCalendarErrorCode, () => boolean>> = {
		TCT_SKIPPED_DAY: () => tibetanDateExists({ year: 2151, month: 6, isLeapMonth: true, day: 21 }),
		TCT_FIELD_OUT_OF_RANGE: () => tibetanDateExists({ year: 2153, month: 13, day: 1 }),
		TCT_NO_SUCH_LEAP_MONTH: () =>
			tibetanDateExists({ year: 2153, month: 5, day: 1, isLeapMonth: true }),
		TCT_INVALID_ARGUMENT: () =>
			tibetanDateExists(null as unknown as { year: number; month: number; day: number }),
		TCT_OUTSIDE_EXACT_RANGE: () => tibetanDateExists({ year: 1e15, month: 3, day: 15 }),
		TCT_INVALID_TRADITION_CONFIG: () =>
			tibetanDateExists(
				{ year: 2153, month: 3, day: 15 },
				{
					...PHUGPA,
					moonTab: null as unknown as readonly number[],
				},
			),
	};

	it("answers false for exactly three codes and rethrows every other one", () => {
		// Collected and asserted once: a per-code expect would name only the first offender.
		const wrong: string[] = [];
		for (const [code, run] of Object.entries(reachable)) {
			const expected = answersFalse[code as TibetanCalendarErrorCode];
			let outcome: string;
			try {
				outcome = run() === false ? "false" : "true";
			} catch (error) {
				outcome = `threw ${(error as { code?: string }).code}`;
				// The rethrow must carry the code it started with, or a caller cannot branch on it.
				if ((error as { code?: string }).code !== code) {
					wrong.push(`${code}: rethrew as ${(error as { code?: string }).code}`);
					continue;
				}
			}
			const want = expected ? "false" : `threw ${code}`;
			if (outcome !== want) wrong.push(`${code}: expected ${want}, got ${outcome}`);
		}
		expect(wrong).toEqual([]);
	});

	// The fact all three stale docblocks got wrong, pinned on its own because it is the
	// counter-example to "reports false for a RangeError and rethrows everything else": the one
	// class-matched arm of the allowlist is NOT a RangeError, and the code that IS one is rethrown.
	it("allowlists by code and class, not by RangeError", () => {
		let skipped: unknown;
		try {
			tibetanToIso({ year: 2151, month: 6, isLeapMonth: true, day: 21 });
		} catch (error) {
			skipped = error;
		}
		expect(skipped).toBeInstanceOf(SkippedDayError);
		expect(skipped).not.toBeInstanceOf(RangeError);
		expect(tibetanDateExists({ year: 2151, month: 6, isLeapMonth: true, day: 21 })).toBe(false);

		let invalid: unknown;
		try {
			tibetanDateExists(null as unknown as { year: number; month: number; day: number });
		} catch (error) {
			invalid = error;
		}
		expect(invalid).toBeInstanceOf(RangeError);
		expect((invalid as { code?: string }).code).toBe("TCT_INVALID_ARGUMENT");
	});

	it("throws SkippedDayError with the requested date attached", () => {
		let thrown: unknown;
		outer: for (let m = 1; m <= 12; m++) {
			for (let d = 1; d <= 30; d++) {
				const input = { year: 2153, month: m, day: d };
				if (!tibetanDateExists(input)) {
					try {
						tibetanToIso(input);
					} catch (error) {
						thrown = error;
					}
					break outer;
				}
			}
		}
		expect(thrown).toBeInstanceOf(Error);
		expect((thrown as Error).name).toBe("SkippedDayError");
	});

	// Undocumented until now, and therefore unpinned: the flag is ignored rather than rejected on
	// an ordinary day. A caller iterating dates and carrying the flag forward from a previous
	// result relies on this, and there is no ambiguity to resolve -- the day exists and exactly one
	// calendar day carries it.
	it("ignores isLeapDay on a day that is not doubled", () => {
		const plain = { year: 2153, month: 3, day: 15 };
		expect(isoToTibetan(tibetanToIso(plain)).isDoubledDay).toBe(false);
		expect(tibetanToIso({ ...plain, isLeapDay: true }).toString()).toBe(
			tibetanToIso(plain).toString(),
		);
	});

	it("gives a doubled date two consecutive days, the first flagged as leap", () => {
		let date = iso("2024-01-01");
		for (let i = 0; i < 1000; i++) {
			const t = isoToTibetan(date);
			if (t.isDoubledDay && t.isLeapDay) {
				const next = isoToTibetan(date.add({ days: 1 }));
				expect(next.day).toBe(t.day);
				expect(next.month).toBe(t.month);
				expect(next.isDoubledDay).toBe(true);
				expect(next.isLeapDay).toBe(false);
				return;
			}
			date = date.add({ days: 1 });
		}
		throw new Error("no doubled day found in 1000 days");
	});
});

// Janson names three dates where the two a2 values give different calendars. Settled
// 2026-08-12 in favour of the almanac value 1/28 -- see
// docs/decisions/2026-08-12-lunar-anomaly-a2-default.md.
describe("the a2 fork", () => {
	const forkDates = ["2001-02-10", "2006-05-10", "2025-11-19"];

	it("differs on Janson's three named dates", () => {
		for (const day of forkDates) {
			const almanac = isoToTibetan(iso(day), PHUGPA);
			const henning = isoToTibetan(iso(day), PHUGPA_HENNING);
			expect({ day, differs: almanac.day !== henning.day }).toEqual({ day, differs: true });
		}
	});

	// The whole point of the decision record: these three are the only cheap, public evidence
	// of which value the calendar actually follows, and Janson verified 1/28 against the
	// Men-Tsee-Khang Tibetan Annual Almanac 2013. Both Lotsawa House and christian-steinert
	// agree with every row below. If one of these flips, the default has silently become
	// Henning's -- which is a different calendar, not a rounding difference.
	it("matches the Men-Tsee-Khang almanac on all three, under the default config", () => {
		const observed = forkDates.map((day) => {
			const t = isoToTibetan(iso(day));
			return { day, tibetan: `${t.month}/${t.day}`, doubled: t.isDoubledDay, first: t.isLeapDay };
		});
		expect(observed).toEqual([
			// 17th, and the 18th is skipped. Henning puts the 18th here and skips the 17th.
			{ day: "2001-02-10", tibetan: "12/17", doubled: false, first: false },
			// 13th doubled, so 10 and 11 May share it. Henning doubles the 12th instead.
			{ day: "2006-05-10", tibetan: "3/13", doubled: true, first: true },
			// 30th doubled, so 19 and 20 November share it. Henning doubles the 29th instead.
			{ day: "2025-11-19", tibetan: "9/30", doubled: true, first: true },
		]);
	});

	it("skips 18/12 in the 2001 case, which is how that divergence shows up", () => {
		expect(tibetanDateExists({ year: 2000 + 127, month: 12, day: 18 })).toBe(false);
		expect(tibetanDateExists({ year: 2000 + 127, month: 12, day: 18 }, PHUGPA_HENNING)).toBe(true);
	});

	// Both values reproduce Janson's Losar table in full. That is a useful negative result:
	// Losar is not sensitive to the fork anywhere in 1927-2046, so the table cannot be used to
	// infer which a2 an almanac follows. Settling that needs a published calendar checked
	// against the three dates above.
	//
	// It also means the 120-date gate validates the engine under either value, which is exactly
	// what makes it a good gate — it tests the month count, leap rule and labelling rule
	// without being confounded by the tradition split.
	it("shows Losar cannot distinguish the two a2 values", () => {
		const misses = (config: typeof PHUGPA) => {
			const derived = deriveScaling(config);
			return LOSAR_DATES.filter(
				(row) =>
					isoFromJulianDay(losarJulianDay(derived, config, row.year)).toString() !== row.losar,
			).map((row) => row.year);
		};
		expect(misses(PHUGPA)).toEqual([]);
		expect(misses(PHUGPA_HENNING)).toEqual([]);
	});

	// Janson publishes exact divergence counts for three windows, derived from his own computer
	// search. Reproducing all three pins the *rate* of disagreement rather than a single date, and
	// it is an independent check: the counts depend on the equation tables, the day-labelling rule
	// and both anomaly values agreeing with his implementation across two centuries.
	//
	// The 1027-1091 figure also documents why the headline rate misleads. One in 4,100 days is a
	// long-run average; that cycle runs at one in 1,484, so back-projection diverges far more often
	// than a reader extrapolating from the modern era would expect.
	it("reproduces Janson's published divergence counts", () => {
		const divergences = (fromIso: string, toIso: string) => {
			let date = iso(fromIso);
			const end = iso(toIso);
			let found = 0;
			while (Temporal.PlainDate.compare(date, end) <= 0) {
				const almanac = isoToTibetan(date, PHUGPA);
				const henning = isoToTibetan(date, PHUGPA_HENNING);
				if (almanac.day !== henning.day || almanac.monthCode !== henning.monthCode) found++;
				date = date.add({ days: 1 });
			}
			return found;
		};

		expect({
			twentieth: divergences("1900-01-01", "1999-12-31"),
			twentyFirst: divergences("2000-01-01", "2099-12-31"),
			firstCycle: divergences("1027-01-01", "1091-12-31"),
		}).toEqual({ twentieth: 9, twentyFirst: 8, firstCycle: 16 });
		// Roughly 265 years walked day by day, converting under both configs — about 190,000
		// conversions, each doing the full true-date astronomy. It is inherently the slowest test
		// here and sat just under the 5s default, so it gets explicit headroom rather than failing
		// whenever the suite runs under load.
	}, 30_000);

	it("agrees almost everywhere else, as the ~1-in-4100 rate implies", () => {
		let differences = 0;
		let date = iso("2000-01-01");
		for (let i = 0; i < 3653; i++) {
			if (isoToTibetan(date, PHUGPA).day !== isoToTibetan(date, PHUGPA_HENNING).day) {
				differences++;
			}
			date = date.add({ days: 1 });
		}
		// Janson counts 8 divergences in 2000-2099, so a single decade should have very few.
		expect(differences).toBeLessThan(5);
	});
});
