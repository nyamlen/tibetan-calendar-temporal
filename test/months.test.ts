import { describe, expect, it } from "vitest";
import { isLeapYear, leapMonthOfYear as leapMonthOfYearY } from "../src/computation/calendar.js";
import { isoToTibetan, losarFor } from "../src/computation/conversion.js";
import {
	daysInMonth,
	hasLeapMonth,
	leapMonthOfYear,
	monthsFor,
	monthsInYear,
} from "../src/months.js";
import { PHUGPA, PHUGPA_HENNING } from "../src/traditions/phugpa.js";
import type { TibetanMonth } from "../src/types.js";

const iso = (s: string) => Temporal.PlainDate.from(s);

/** Royal era 2100–2250, i.e. Janson's Y 1973–2123. Wide enough to hold every shape below. */
const FIRST_YEAR = 2100;
const LAST_YEAR = 2250;
const YEARS = [...Array(LAST_YEAR - FIRST_YEAR + 1).keys()].map((i) => i + FIRST_YEAR);

/** Indexing under `noUncheckedIndexedAccess`, failing loudly rather than with a cast. */
function at<T>(items: readonly T[], index: number): T {
	const item = items.at(index);
	if (item === undefined) throw new Error(`no element at ${index} of ${items.length}`);
	return item;
}

const codeOf = (call: () => unknown): string | undefined => {
	try {
		call();
		return undefined;
	} catch (error) {
		return (error as { code?: string }).code;
	}
};

/**
 * The months of a year, checked against the year they are supposed to tile.
 *
 * The sum property is the one that matters. `monthsFor` builds each month from its own true month
 * count, while `losarFor` walks back from the previous year's month 12 — two independent routes to
 * the same boundary. A one-day error in `firstDayOfMonth` or `lastDayOfMonth` would leave both
 * self-consistent and make the totals disagree.
 */
describe("monthsFor", () => {
	it("tiles the year from Losar to the day before the next, for 150 years", {
		timeout: 30_000,
	}, () => {
		for (const year of YEARS) {
			const months = monthsFor(year);
			const losar = losarFor(year).isoDate;
			const nextLosar = losarFor(year + 1).isoDate;

			expect(at(months, 0).firstDay.toString(), `${year} starts at Losar`).toBe(losar.toString());
			expect(at(months, -1).lastDay.toString(), `${year} ends before the next Losar`).toBe(
				nextLosar.subtract({ days: 1 }).toString(),
			);

			const total = months.reduce((sum, m) => sum + m.days, 0);
			expect(total, `${year} day total`).toBe(nextLosar.since(losar).days);
		}
	});

	it("emits contiguous, non-overlapping months of 29 or 30 days", { timeout: 30_000 }, () => {
		for (const year of YEARS) {
			const months = monthsFor(year);
			expect(months.length === 12 || months.length === 13, `${year} length`).toBe(true);

			for (const month of months) {
				expect(month.days === 29 || month.days === 30, `${year}-${month.monthCode}`).toBe(true);
				expect(month.lastDay.since(month.firstDay).days + 1).toBe(month.days);
			}

			for (let i = 1; i < months.length; i++) {
				expect(
					at(months, i - 1)
						.lastDay.add({ days: 1 })
						.toString(),
				).toBe(at(months, i).firstDay.toString());
			}

			const codes = months.map((m) => m.monthCode);
			expect(new Set(codes).size, `${year} unique codes`).toBe(codes.length);
		}
	});

	it("numbers months 1-12 in order, with the leap month first of its pair", () => {
		for (const year of YEARS) {
			const months = monthsFor(year);
			const numbers = months.map((m) => m.month);
			expect(numbers).toEqual([...numbers].sort((a, b) => a - b));

			const leapIndex = months.findIndex((m) => m.isLeapMonth);
			if (leapIndex !== -1) {
				expect(at(months, leapIndex + 1).month).toBe(at(months, leapIndex).month);
				expect(at(months, leapIndex + 1).isLeapMonth).toBe(false);
				expect(at(months, leapIndex).monthCode).toMatch(/L$/);
			}
			expect(months.filter((m) => m.isLeapMonth).length).toBeLessThanOrEqual(1);
		}
	});

	/**
	 * The one that catches a 127-year offset, which is the likeliest silent error at this boundary
	 * and would leave every property above intact — a shifted year is still a well-formed year.
	 */
	it("takes the royal era, not Janson's Y", () => {
		expect(at(monthsFor(2153), 0).firstDay.toString()).toBe("2026-02-18");
		expect(at(monthsFor(2153), 0).firstDay.toString()).toBe(losarFor(2153).isoDate.toString());
		// 2026 is a perfectly valid royal-era year, and lands 127 years earlier.
		expect(at(monthsFor(2026), 0).firstDay.year).toBe(1899);
	});

	/**
	 * Both cases Janson §8 warns about, where computing a month's first day from date 1 goes wrong.
	 */
	it("handles a year opening with a leap month, and one whose first date is skipped", () => {
		// Royal era 2127 = Y 2000, which opens with leap month 1.
		const first2000 = at(monthsFor(2127), 0);
		expect(first2000.isLeapMonth).toBe(true);
		expect(first2000.month).toBe(1);
		expect(first2000.firstDay.toString()).toBe(losarFor(2127).isoDate.toString());

		// Royal era 2104 = Y 1977, where date 1 is skipped so the year begins on the day numbered 2.
		expect(losarFor(2104).day).toBe(2);
		expect(at(monthsFor(2104), 0).firstDay.toString()).toBe(losarFor(2104).isoDate.toString());
	});

	it("puts every day of a year inside exactly one of its months", { timeout: 30_000 }, () => {
		for (const year of [2150, 2151, 2152, 2153]) {
			const months = monthsFor(year);
			const byCode = new Map<string, TibetanMonth>(months.map((m) => [m.monthCode, m]));
			const end = at(months, -1).lastDay;

			for (
				let day = at(months, 0).firstDay;
				Temporal.PlainDate.compare(day, end) <= 0;
				day = day.add({ days: 1 })
			) {
				const date = isoToTibetan(day);
				expect(date.year, day.toString()).toBe(year);

				const month = byCode.get(date.monthCode);
				expect(month, `${day} -> ${date.monthCode}`).toBeDefined();
				if (month === undefined) continue;
				expect(Temporal.PlainDate.compare(day, month.firstDay)).toBeGreaterThanOrEqual(0);
				expect(Temporal.PlainDate.compare(day, month.lastDay)).toBeLessThanOrEqual(0);
			}
		}
	});

	it("codes malformed input and refuses years past the exact range", () => {
		expect(codeOf(() => monthsFor(1.5))).toBe("TCT_FIELD_OUT_OF_RANGE");
		expect(codeOf(() => monthsFor(Number.NaN))).toBe("TCT_FIELD_OUT_OF_RANGE");
		expect(codeOf(() => monthsFor("2153" as unknown as number))).toBe("TCT_FIELD_OUT_OF_RANGE");
		expect(codeOf(() => monthsFor(12_000, PHUGPA_HENNING))).toBe("TCT_OUTSIDE_EXACT_RANGE");
		expect(codeOf(() => monthsFor(2153, { ...PHUGPA, moonTab: [] }))).toBe(
			"TCT_INVALID_TRADITION_CONFIG",
		);
	});
});

describe("daysInMonth", () => {
	it("agrees with the corresponding monthsFor entry, every month for 150 years", {
		timeout: 30_000,
	}, () => {
		for (const year of YEARS) {
			for (const month of monthsFor(year)) {
				expect(
					daysInMonth({ year, month: month.month, isLeapMonth: month.isLeapMonth }),
					`${year}-${month.monthCode}`,
				).toBe(month.days);
			}
		}
	});

	it("accepts a TibetanDate unchanged, ignoring its day", () => {
		const date = isoToTibetan(iso("2026-08-12"));
		expect(daysInMonth(date)).toBe(daysInMonth({ year: date.year, month: date.month }));
	});

	// 2151 carries a leap month 6; 2153 carries none at all.
	it("defaults isLeapMonth to the regular month", () => {
		const leap = monthsFor(2151).find((m) => m.isLeapMonth);
		expect(leap?.month).toBe(6);
		expect(daysInMonth({ year: 2151, month: 6 })).toBe(
			daysInMonth({ year: 2151, month: 6, isLeapMonth: false }),
		);
		expect(daysInMonth({ year: 2151, month: 6, isLeapMonth: true })).toBe(leap?.days);
	});

	it("codes each way the input can be wrong", () => {
		expect(codeOf(() => daysInMonth({ year: 2153, month: 0 }))).toBe("TCT_FIELD_OUT_OF_RANGE");
		expect(codeOf(() => daysInMonth({ year: 2153, month: 13 }))).toBe("TCT_FIELD_OUT_OF_RANGE");
		expect(codeOf(() => daysInMonth({ year: 2153, month: 1.5 }))).toBe("TCT_FIELD_OUT_OF_RANGE");
		expect(codeOf(() => daysInMonth({ year: 2153, month: Number.NaN }))).toBe(
			"TCT_FIELD_OUT_OF_RANGE",
		);
		expect(codeOf(() => daysInMonth({ year: 1.5, month: 1 }))).toBe("TCT_FIELD_OUT_OF_RANGE");
		expect(codeOf(() => daysInMonth({ year: 2153, month: 5, isLeapMonth: true }))).toBe(
			"TCT_NO_SUCH_LEAP_MONTH",
		);
		expect(codeOf(() => daysInMonth({ year: 12_000, month: 1 }, PHUGPA_HENNING))).toBe(
			"TCT_OUTSIDE_EXACT_RANGE",
		);
	});
});

/**
 * The scalars and the list are two independent routes to the same facts — closed forms over the
 * year against month boundaries computed from `true_date`. Exposing both is only safe if they
 * cannot drift, which is what this asserts.
 */
describe("the scalars agree with the list", () => {
	it("matches monthsFor on every year of the sweep", { timeout: 30_000 }, () => {
		for (const year of YEARS) {
			const months = monthsFor(year);
			expect(monthsInYear(year), `monthsInYear ${year}`).toBe(months.length);
			expect(hasLeapMonth(year), `hasLeapMonth ${year}`).toBe(months.some((m) => m.isLeapMonth));
			expect(leapMonthOfYear(year), `leapMonthOfYear ${year}`).toBe(
				months.find((m) => m.isLeapMonth)?.month,
			);
		}
	});

	it("puts exactly 24 leap years in every 65 consecutive years", () => {
		for (const start of [2100, 2137, 2200]) {
			const leaps = [...Array(65).keys()].filter((i) => hasLeapMonth(start + i));
			expect(leaps.length, `from ${start}`).toBe(24);
		}
	});

	it("takes the royal era, not Janson's Y", () => {
		expect(hasLeapMonth(2153)).toBe(isLeapYear(PHUGPA, 2026));
		expect(leapMonthOfYear(2153)).toBe(leapMonthOfYearY(PHUGPA, 2026));
		expect(monthsInYear(2153)).toBe(hasLeapMonth(2153) ? 13 : 12);
	});

	/**
	 * Deliberate, not an oversight. The scalars are closed forms over the year and never evaluate
	 * `true_date`, so they stay exact where the month boundaries cannot be computed at all. Past
	 * that bound `monthsFor` refuses rather than answering approximately.
	 */
	it("answers beyond the range where monthsFor refuses", () => {
		expect(codeOf(() => monthsFor(12_000, PHUGPA_HENNING))).toBe("TCT_OUTSIDE_EXACT_RANGE");
		expect(typeof hasLeapMonth(12_000, PHUGPA_HENNING)).toBe("boolean");
		expect(monthsInYear(12_000, PHUGPA_HENNING)).toBeGreaterThanOrEqual(12);
	});

	it("codes malformed input", () => {
		for (const call of [
			() => hasLeapMonth(1.5),
			() => hasLeapMonth(Number.NaN),
			() => leapMonthOfYear(1.5),
			() => monthsInYear(1.5),
		]) {
			expect(codeOf(call)).toBe("TCT_FIELD_OUT_OF_RANGE");
		}
		expect(codeOf(() => hasLeapMonth(2153, { ...PHUGPA, moonTab: [] }))).toBe(
			"TCT_INVALID_TRADITION_CONFIG",
		);
	});
});
