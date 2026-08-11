import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
	hasLeapMonth,
	intercalationIndex,
	isLeapYear,
	leapMonthOfYear,
	leapYearsBetween,
	monthFromCount,
	monthsInYear,
	solarMonthsSinceEpoch,
	trueMonthCount,
} from "../../src/computation/calendar.js";
import { PHUGPA } from "../../src/traditions/phugpa.js";

const P = PHUGPA;
const years = fc.integer({ min: 806, max: 4000 });
const monthNumbers = fc.integer({ min: 1, max: 12 });
const counts = fc.integer({ min: 0, max: 40_000 });

describe("solarMonthsSinceEpoch", () => {
	it("is zero at the epoch month", () => {
		expect(solarMonthsSinceEpoch(P, 806, 3)).toBe(0);
	});

	it("advances by 12 per year and 1 per month", () => {
		expect(solarMonthsSinceEpoch(P, 807, 3)).toBe(12);
		expect(solarMonthsSinceEpoch(P, 806, 4)).toBe(1);
		expect(solarMonthsSinceEpoch(P, 805, 3)).toBe(-12);
	});
});

describe("intercalationIndex", () => {
	// Janson: β* is by definition the intercalation index at the epoch.
	it("equals beta* at the epoch", () => {
		expect(intercalationIndex(P, 806, 3)).toBe(P.intercalationIndexAtEpoch);
		expect(intercalationIndex(P, 806, 3)).toBe(61);
	});

	it("always lands in 0..64 and steps by 2 per month", () => {
		fc.assert(
			fc.property(years, monthNumbers, (y, m) => {
				const index = intercalationIndex(P, y, m);
				expect(index).toBeGreaterThanOrEqual(0);
				expect(index).toBeLessThan(65);
				const next = m === 12 ? intercalationIndex(P, y + 1, 1) : intercalationIndex(P, y, m + 1);
				expect(next).toBe((index + 2) % 65);
			}),
		);
	});
});

describe("trueMonthCount", () => {
	// Janson Remark 10: for Phugpa at E806, β* = 61 ≥ 48, so the month with true month count 0
	// is month 2 of 806, not the nominal epoch month 3.
	it("puts count 0 at month 2 of 806, as Janson's remark on the epoch requires", () => {
		expect(trueMonthCount(P, 806, 2)).toBe(0);
		expect(trueMonthCount(P, 806, 3)).toBe(1);
	});

	it("increases by exactly one per calendar month, leap months included", () => {
		fc.assert(
			fc.property(years, (y) => {
				// Enumerate the year's months in calendar order: a leap month immediately
				// precedes the regular month it shares a number with.
				const inOrder: number[] = [];
				for (let m = 1; m <= 12; m++) {
					if (hasLeapMonth(P, y, m)) inOrder.push(trueMonthCount(P, y, m, true));
					inOrder.push(trueMonthCount(P, y, m, false));
				}
				expect(inOrder.length).toBe(monthsInYear(P, y));
				for (let i = 1; i < inOrder.length; i++) {
					expect(inOrder[i]).toBe((inOrder[i - 1] ?? 0) + 1);
				}
			}),
		);
	});

	it("gives a leap month the count one below its regular twin", () => {
		fc.assert(
			fc.property(years, monthNumbers, (y, m) => {
				fc.pre(hasLeapMonth(P, y, m));
				expect(trueMonthCount(P, y, m, true)).toBe(trueMonthCount(P, y, m, false) - 1);
			}),
		);
	});

	// Guards the decision to keep epoch E806: n must never go negative for real dates.
	it("stays non-negative for every month from 806 onwards", () => {
		fc.assert(
			fc.property(years, monthNumbers, (y, m) => {
				expect(trueMonthCount(P, y, m, false)).toBeGreaterThanOrEqual(0);
			}),
		);
	});
});

describe("monthFromCount", () => {
	it("round-trips with trueMonthCount", () => {
		fc.assert(
			fc.property(counts, (n) => {
				const month = monthFromCount(P, n);
				expect(trueMonthCount(P, month.year, month.month, month.isLeap)).toBe(n);
			}),
		);
	});

	it("round-trips the other way for every month of a range of years", () => {
		for (let y = 1900; y <= 2100; y++) {
			for (let m = 1; m <= 12; m++) {
				for (const isLeap of hasLeapMonth(P, y, m) ? [true, false] : [false]) {
					const n = trueMonthCount(P, y, m, isLeap);
					expect(monthFromCount(P, n)).toEqual({ year: y, month: m, isLeap });
				}
			}
		}
	});

	it("advances month numbers in order, wrapping 12 to 1", () => {
		fc.assert(
			fc.property(counts, (n) => {
				const a = monthFromCount(P, n);
				const b = monthFromCount(P, n + 1);
				if (a.isLeap) {
					// A leap month is followed by its regular twin: same year, same number.
					expect(b).toEqual({ year: a.year, month: a.month, isLeap: false });
				} else {
					expect(b.month).toBe((a.month % 12) + 1);
					expect(b.year).toBe(a.month === 12 ? a.year + 1 : a.year);
				}
			}),
		);
	});

	it("never reports two consecutive leap months", () => {
		fc.assert(
			fc.property(counts, (n) => {
				expect(monthFromCount(P, n).isLeap && monthFromCount(P, n + 1).isLeap).toBe(false);
			}),
		);
	});
});

// The strongest internal cross-check available: two formulations Janson derives independently,
// one testing the intercalation index and one a closed form in Y alone, must agree everywhere.
describe("the two leap-year formulations agree", () => {
	it("matches hasLeapMonth against the closed form for 3000 years", () => {
		for (let y = 806; y <= 3806; y++) {
			const byIndex = [...Array(12).keys()].map((i) => i + 1).find((m) => hasLeapMonth(P, y, m));
			expect(isLeapYear(P, y)).toBe(byIndex !== undefined);
			expect(leapMonthOfYear(P, y)).toBe(byIndex);
		}
	});

	it("gives 12 or 13 months per year", () => {
		fc.assert(
			fc.property(years, (y) => {
				expect([12, 13]).toContain(monthsInYear(P, y));
			}),
		);
	});
});

describe("leap month spacing", () => {
	// Janson Remark 8: 65 years contain 780 regular months and 24 leap months, and each month
	// number 1-12 is the leap month exactly twice.
	it("puts exactly 24 leap years in every 65-year window", () => {
		fc.assert(
			fc.property(years, (y) => {
				expect(leapYearsBetween(P, y, y + 64)).toBe(24);
			}),
		);
	});

	it("makes each month number the leap month exactly twice per 65 years", () => {
		const tally = new Map<number, number>();
		for (let y = 1900; y < 1965; y++) {
			const m = leapMonthOfYear(P, y);
			if (m !== undefined) tally.set(m, (tally.get(m) ?? 0) + 1);
		}
		expect([...tally.values()].reduce((a, b) => a + b, 0)).toBe(24);
		expect(tally.size).toBe(12);
		for (const count of tally.values()) expect(count).toBe(2);
	});

	// Janson: leap months are spaced with alternating 32 and 33 regular months between them,
	// so successive leap months are 33 or 34 months apart.
	it("spaces successive leap months by 33 or 34 months", () => {
		const leapCounts: number[] = [];
		for (let n = 0; n < 3000; n++) if (monthFromCount(P, n).isLeap) leapCounts.push(n);
		const gaps = leapCounts.slice(1).map((n, i) => n - (leapCounts[i] ?? 0));
		expect(new Set(gaps)).toEqual(new Set([33, 34]));
	});

	it("repeats the whole leap pattern every 65 years", () => {
		fc.assert(
			fc.property(years, monthNumbers, (y, m) => {
				expect(hasLeapMonth(P, y + 65, m)).toBe(hasLeapMonth(P, y, m));
			}),
		);
	});
});

describe("known leap months", () => {
	// Janson §4 and Remark 20: 2000 began with a leap month 1, which is why Losar 2000 fell on
	// the first day of that leap month.
	it("finds leap month 1 in 2000", () => {
		expect(isLeapYear(P, 2000)).toBe(true);
		expect(leapMonthOfYear(P, 2000)).toBe(1);
		expect(hasLeapMonth(P, 2000, 1)).toBe(true);
	});
});
