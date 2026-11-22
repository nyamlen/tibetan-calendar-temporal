import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
	assertMonthCountYear,
	intercalationIndex,
	isLeapYear,
	leapMonthOfYear,
	monthFromCount,
	sharesNumberWithLeapMonth,
	solarMonthsSinceEpoch,
	trueMonthCount,
} from "../../src/computation/calendar.js";
import { monthsInYear } from "../../src/months.js";
import { lunationFromMonth } from "../../src/navigation.js";
import { BHUTAN, BHUTAN_HENNING } from "../../src/traditions/bhutan.js";
import { PHUGPA, PHUGPA_HENNING } from "../../src/traditions/phugpa.js";
import type { TraditionConfig } from "../../src/traditions/types.js";

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
		expect(trueMonthCount(P, 806, 2, false)).toBe(0);
		expect(trueMonthCount(P, 806, 3, false)).toBe(1);
	});

	it("increases by exactly one per calendar month, leap months included", () => {
		fc.assert(
			fc.property(years, (y) => {
				// Enumerate the year's months in calendar order: a leap month immediately
				// precedes the regular month it shares a number with.
				const inOrder: number[] = [];
				for (let m = 1; m <= 12; m++) {
					if (sharesNumberWithLeapMonth(P, y, m)) inOrder.push(trueMonthCount(P, y, m, true));
					inOrder.push(trueMonthCount(P, y, m, false));
				}
				// The public monthsInYear takes the royal-era year, Janson's Y + 127.
				expect(inOrder.length).toBe(monthsInYear(y + 127, P));
				for (let i = 1; i < inOrder.length; i++) {
					expect(inOrder[i]).toBe((inOrder[i - 1] ?? 0) + 1);
				}
			}),
		);
	});

	it("gives a leap month the count one below its regular twin", () => {
		fc.assert(
			fc.property(years, monthNumbers, (y, m) => {
				fc.pre(sharesNumberWithLeapMonth(P, y, m));
				expect(trueMonthCount(P, y, m, true)).toBe(trueMonthCount(P, y, m, false) - 1);
			}),
		);
	});

	// Guards the decision to keep epoch E806. The boundary is the epoch month itself, not the
	// start of 806: beta* = 61 puts true month count 0 at month 2 of 806, so months 1 and 2 of
	// that single year are the only ones before it. Everything from 807 onwards is non-negative.
	it("stays non-negative from 807 onwards", () => {
		fc.assert(
			fc.property(fc.integer({ min: 807, max: 4000 }), monthNumbers, (y, m) => {
				expect(trueMonthCount(P, y, m, false)).toBeGreaterThanOrEqual(0);
			}),
		);
	});

	it("turns non-negative exactly at the epoch month, month 2 of 806", () => {
		expect(trueMonthCount(P, 806, 1, false)).toBe(-1);
		expect(trueMonthCount(P, 806, 2, false)).toBe(0);
		expect(trueMonthCount(P, 806, 3, false)).toBe(1);
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
				for (const isLeap of sharesNumberWithLeapMonth(P, y, m) ? [true, false] : [false]) {
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
	it("matches sharesNumberWithLeapMonth against the closed form for 3000 years", () => {
		for (let y = 806; y <= 3806; y++) {
			const byIndex = [...Array(12).keys()]
				.map((i) => i + 1)
				.find((m) => sharesNumberWithLeapMonth(P, y, m));
			expect(isLeapYear(P, y)).toBe(byIndex !== undefined);
			expect(leapMonthOfYear(P, y)).toBe(byIndex);
		}
	});

	it("gives 12 or 13 months per year", () => {
		fc.assert(
			fc.property(years, (y) => {
				expect([12, 13]).toContain(monthsInYear(y + 127, P));
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
				const leapYears = Array.from({ length: 65 }, (_, i) => isLeapYear(P, y + i)).filter(
					Boolean,
				);
				expect(leapYears.length).toBe(24);
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
				expect(sharesNumberWithLeapMonth(P, y + 65, m)).toBe(sharesNumberWithLeapMonth(P, y, m));
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
		expect(sharesNumberWithLeapMonth(P, 2000, 1)).toBe(true);
	});
});

describe("assertMonthCountYear covers trueMonthCount's 67·M*", () => {
	const configs = [
		["PHUGPA", PHUGPA],
		["PHUGPA_HENNING", PHUGPA_HENNING],
		["BHUTAN", BHUTAN],
		["BHUTAN_HENNING", BHUTAN_HENNING],
	] as const;

	const accepts = (tradition: TraditionConfig, year: number): boolean => {
		try {
			assertMonthCountYear(() => "probe", year, tradition);
			return true;
		} catch (error) {
			if ((error as { code?: string }).code !== "TCT_OUTSIDE_EXACT_RANGE") throw error;
			return false;
		}
	};

	// Largest accepted |year − epochYear|, found through the guard itself.
	const widestAccepted = (tradition: TraditionConfig): number => {
		let lo = 0;
		let hi = 2 ** 52;
		while (lo < hi) {
			const mid = Math.floor((lo + hi + 1) / 2);
			if (accepts(tradition, tradition.epochYear + mid)) lo = mid;
			else hi = mid - 1;
		}
		return lo;
	};

	it("refuses lunationFromMonth at year 1e14 instead of returning equal counts for two months", () => {
		expect(() => lunationFromMonth({ year: 1e14, month: 9 })).toThrow(
			expect.objectContaining({ code: "TCT_OUTSIDE_EXACT_RANGE" }),
		);
	});

	it("keeps every accepted year exact, at both ends, for all four shipped configs", () => {
		const bad: string[] = [];
		for (const [name, config] of configs) {
			const widest = widestAccepted(config);
			for (const sign of [1, -1]) {
				for (let back = 0; back < 4; back++) {
					const year = config.epochYear + sign * (widest - back);
					let previous: number | undefined;
					for (let month = 1; month <= 12; month++) {
						const month_ = { year: year + 127, month };
						const count = lunationFromMonth(month_, config);
						if (previous !== undefined && count - previous !== 1 && count - previous !== 2) {
							bad.push(`${name} ${year}/${month}: step ${count - previous}`);
						}
						previous = count;
					}
					const solar = BigInt(12) * BigInt(year - config.epochYear) + 0n;
					const first = lunationFromMonth({ year: year + 127, month: 1 }, config);
					const rounded =
						(67n * (solar + BigInt(1 - config.epochMonth)) +
							BigInt(config.intercalationIndexAtEpoch) +
							BigInt(65 - config.leapIndexThreshold)) /
						65n;
					const exact =
						67n * (solar + BigInt(1 - config.epochMonth)) +
						BigInt(config.intercalationIndexAtEpoch) +
						BigInt(65 - config.leapIndexThreshold);
					const floor = exact >= 0n ? rounded : -((-exact + 64n) / 65n);
					if (Math.abs(Number(BigInt(first) - floor)) > 1) {
						bad.push(`${name} ${year}: month 1 count ${first}, reference ${floor}`);
					}
				}
			}
		}
		expect(bad).toEqual([]);
	});
});
