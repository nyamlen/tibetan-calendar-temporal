import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { hasLeapMonth, losarJulianDay, trueMonthCount } from "../src/computation/calendar.js";
import { trueDate } from "../src/computation/corrections.js";
import { deriveScaling } from "../src/computation/scaling.js";
import { formatTibetanDate, isoToTibetan, PHUGPA, tibetanDateExists } from "../src/index.js";
import { GELUG, getObservances } from "../src/observances/index.js";

const scaled = deriveScaling(PHUGPA);

describe("year lengths", () => {
	// Janson Remark 16 gives the possible calendar year lengths and, from a 10,000-year
	// computation, their frequencies: 354 42%, 355 21%, 383 3%, 384 33%, 385 1%.
	it("are always one of 354, 355, 383, 384, 385", () => {
		for (let y = 1500; y < 2500; y++) {
			const length = losarJulianDay(scaled, PHUGPA, y + 1) - losarJulianDay(scaled, PHUGPA, y);
			expect([354, 355, 383, 384, 385]).toContain(length);
		}
	});

	it("occur at roughly Janson's frequencies over 10,000 years", () => {
		const tally = new Map<number, number>();
		for (let y = 1000; y < 11_000; y++) {
			const length = losarJulianDay(scaled, PHUGPA, y + 1) - losarJulianDay(scaled, PHUGPA, y);
			tally.set(length, (tally.get(length) ?? 0) + 1);
		}
		const percent = (n: number) => (tally.get(n) ?? 0) / 100;
		expect(percent(354)).toBeGreaterThan(38);
		expect(percent(354)).toBeLessThan(46);
		expect(percent(355)).toBeGreaterThan(18);
		expect(percent(355)).toBeLessThan(24);
		expect(percent(384)).toBeGreaterThan(29);
		expect(percent(384)).toBeLessThan(37);
		// The rare ones: 383 about 3%, 385 about 1%.
		expect(percent(383)).toBeLessThan(6);
		expect(percent(385)).toBeLessThan(3);
		// A leap year is 383-385 days, a common year 354-355, and nothing else occurs.
		expect([...tally.keys()].sort((a, b) => a - b)).toEqual([354, 355, 383, 384, 385]);
	});

	it("makes long years exactly the leap years", () => {
		for (let y = 1900; y < 2100; y++) {
			const length = losarJulianDay(scaled, PHUGPA, y + 1) - losarJulianDay(scaled, PHUGPA, y);
			const isLong = length > 360;
			const hasLeap = [...Array(12).keys()].some((i) => hasLeapMonth(PHUGPA, y, i + 1));
			expect(isLong).toBe(hasLeap);
		}
	});
});

describe("safe-integer bound", () => {
	// The whole design rests on plain `number` staying exact. The largest intermediate is
	// roughly JD * D, and this asserts it rather than trusting the arithmetic silently.
	it("keeps every true_date an exact safe integer across three millennia", () => {
		let largest = 0;
		for (let n = 0; n < 40_000; n += 7) {
			for (const d of [1, 15, 30]) {
				const value = trueDate(scaled, d, n);
				expect(Number.isSafeInteger(value)).toBe(true);
				largest = Math.max(largest, Math.abs(value));
			}
		}
		expect(largest).toBeLessThan(Number.MAX_SAFE_INTEGER);
		// Comfortable margin, not a near miss: Phugpa has roughly 36x headroom.
		expect(Number.MAX_SAFE_INTEGER / largest).toBeGreaterThan(20);
	});

	it("reports the Julian day at which exactness would end", () => {
		expect(scaled.exactToJulianDay).toBeGreaterThan(8.7e7);
		// Today is around JD 2.46e6, so the limit is far beyond any usable date.
		expect(scaled.exactToJulianDay).toBeGreaterThan(30 * 2_460_000);
	});
});

// Guards the decision to keep epoch E806 rather than a later one with smaller constants.
describe("epoch sign guard", () => {
	// From 807, not 806: the epoch sits at month 2 of 806, so months 1 and 2 of that year are
	// the only ones with a negative count. Asserting from 806 made this property flaky — it
	// passed until fast-check happened to draw year 806 with month 1.
	it("keeps the true month count non-negative for every date from 807 CE", () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 807, max: 5000 }),
				fc.integer({ min: 1, max: 12 }),
				(year, month) => {
					expect(trueMonthCount(PHUGPA, year, month)).toBeGreaterThanOrEqual(0);
				},
			),
		);
	});

	it("still computes correctly where the count does go negative", () => {
		// Before the epoch the arithmetic must not break — this is what floorDiv and mod are
		// for. The result is meaningless historically but must be internally consistent.
		expect(trueMonthCount(PHUGPA, 700, 1)).toBeLessThan(0);
		const date = isoToTibetan(Temporal.PlainDate.from("0700-06-15"));
		expect(date.month).toBeGreaterThanOrEqual(1);
		expect(date.month).toBeLessThanOrEqual(12);
		expect(date.isoDate.toString()).toBe("0700-06-15");
	});
});

// Janson §13. The full period is 705,012,525 days, whose JD exceeds the scaled-integer bound,
// so this is tested at month-count level as the plan requires.
describe("the calendar's period", () => {
	const PERIOD_MONTHS = 23_873_976;
	const PERIOD_YEARS = 1_930_110;

	it("repeats the month numbering after 23,873,976 months", () => {
		// 804 months = 65 years is the leap cycle, and the period is a whole number of those.
		expect(PERIOD_MONTHS % 804).toBe(0);
		expect(PERIOD_YEARS % 65).toBe(0);
		expect((PERIOD_MONTHS / 804) * 65).toBe(PERIOD_YEARS);
	});

	it("repeats the leap-month pattern after the period, and after 65 years", () => {
		fc.assert(
			fc.property(fc.integer({ min: 1000, max: 4000 }), fc.integer({ min: 1, max: 12 }), (y, m) => {
				expect(hasLeapMonth(PHUGPA, y + 65, m)).toBe(hasLeapMonth(PHUGPA, y, m));
				expect(hasLeapMonth(PHUGPA, y + PERIOD_YEARS, m)).toBe(hasLeapMonth(PHUGPA, y, m));
			}),
		);
	});

	it("contains a whole number of weeks, so the weekday repeats too", () => {
		expect(705_012_525 % 7).toBe(0);
	});

	// Janson notes the year names need two periods, since 1,930,110 ≡ 6 (mod 12).
	it("needs two periods to repeat the animal cycle", () => {
		expect(PERIOD_YEARS % 12).toBe(6);
		expect((2 * PERIOD_YEARS) % 60).toBe(0);
	});
});

describe("formatTibetanDate", () => {
	it("uses the month code so leap months cannot collide", () => {
		expect(formatTibetanDate(isoToTibetan(Temporal.PlainDate.from("2027-01-15")))).toBe(
			"2153-M12-08",
		);
		expect(formatTibetanDate(isoToTibetan(Temporal.PlainDate.from("2000-02-06")))).toBe(
			"2127-M01L-01",
		);
	});

	it("never produces a string that parses as an ISO date", () => {
		fc.assert(
			fc.property(fc.integer({ min: 2_300_000, max: 2_500_000 }), (jd) => {
				const text = formatTibetanDate(
					isoToTibetan(Temporal.PlainDate.from("1970-01-01").add({ days: jd - 2_440_588 })),
				);
				expect(() => Temporal.PlainDate.from(text)).toThrow();
			}),
		);
	});
});

// The Tier 1 property docs/testing.md has promised since Phase 0. It constrains the *output*:
// every observance must name a day that exists. Both skipped-day conventions satisfy it --
// "omit" by emitting nothing, "preceding" by moving to a day that does exist -- so this does not
// smuggle in a policy, which is easy to misread it as doing.
describe("skipped days are never observance days", () => {
	it("never places an observance on a date no calendar day carries", () => {
		const found = getObservances(
			Temporal.PlainDate.from("1950-01-01"),
			Temporal.PlainDate.from("2150-12-31"),
		);
		const impossible = found.filter(
			(o) =>
				!tibetanDateExists({
					year: o.date.year,
					month: o.date.month,
					day: o.date.day,
					isLeapMonth: o.date.isLeapMonth,
				}),
		);
		expect(impossible).toEqual([]);
		// A guard against the property passing vacuously over an empty result.
		expect(found.length).toBeGreaterThan(15_000);
	});

	it("holds under every skipped-day and doubled-day convention", () => {
		for (const skippedDay of ["preceding", "omit"] as const) {
			for (const doubledDay of ["first", "second", "both"] as const) {
				const config = { ...GELUG, skippedDay, doubledDay };
				for (const o of getObservances(
					Temporal.PlainDate.from("2020-01-01"),
					Temporal.PlainDate.from("2040-12-31"),
					config,
				)) {
					// Round-tripping through the ISO date is the strongest form: the day the
					// observance names must be the day it actually falls on.
					expect(isoToTibetan(o.date.isoDate).day).toBe(o.date.day);
				}
			}
		}
	});
});
