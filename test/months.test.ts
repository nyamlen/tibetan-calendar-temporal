import { describe, expect, it } from "vitest";
import { isLeapYear, leapMonthOfYear as leapMonthOfYearY } from "../src/computation/calendar.js";
import {
	isoToTibetan,
	losarFor,
	tibetanDateExists,
	tibetanToIso,
} from "../src/computation/conversion.js";
import { yearNameFor } from "../src/cycles.js";
import {
	datesFor,
	daysInMonth,
	hasLeapMonth,
	leapMonthNumberFor,
	monthsFor,
	monthsInYear,
	resolveMonth,
} from "../src/months.js";
import { addMonths } from "../src/navigation.js";
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

	/**
	 * `TibetanMonth` carried no `year`, because `monthsFor(year)` was its only producer and supplied
	 * it implicitly. That made it unusable anywhere the consumer did not already know the year —
	 * a returned month could not be fed to `daysInMonth`, and could not be spread into a date.
	 */
	it("carries the year it belongs to, so a month can be used without one in hand", () => {
		for (const year of [2151, 2153]) {
			for (const month of monthsFor(year)) {
				expect(month.year, `${year} ${month.monthCode}`).toBe(year);
				// The composition the missing field blocked: a TibetanMonth satisfies
				// TibetanMonthFields, so it round-trips through the month-level API.
				expect(daysInMonth(month)).toBe(month.days);
			}
		}
	});

	/**
	 * The month's identity as one sortable integer. `(year, month, isLeapMonth)` cannot serve:
	 * a leap month precedes the regular month it shares a number with, so sorting on the tuple puts
	 * them the wrong way round — `false` sorts before `true`.
	 */
	it("carries a lunation that increases strictly in calendar order", () => {
		for (const year of [2151, 2153]) {
			const lunations = monthsFor(year).map((m) => m.lunation);
			for (let i = 1; i < lunations.length; i++) {
				expect(at(lunations, i), `${year} month ${i}`).toBe(at(lunations, i - 1) + 1);
			}
		}
	});

	/**
	 * Every `TibetanDate` carries `yearName`; no `TibetanMonth` did, so rendering a month header
	 * meant hopping into the date tier through a function called `losarFor` — not a route anyone
	 * guesses. Both halves of a doubled pair are checked because reading the year off the wrong
	 * twin is the way a naive implementation gets this wrong.
	 */
	it("names the year of every month, including both halves of a leap pair", () => {
		for (const year of [2151, 2153]) {
			const expected = yearNameFor(year);
			for (const month of monthsFor(year)) {
				expect(month.yearName, `${year} ${month.monthCode}`).toEqual(expected);
			}
		}
	});

	/**
	 * `monthsFor` was not memoised, so every consumer stepping a month grid paid for a full
	 * month-boundary computation two or three times per step. The cache must key on the config as
	 * well as the year — a cache ignoring it would serve PHUGPA results for PHUGPA_HENNING.
	 */
	it("memoises per year without letting one caller corrupt another", () => {
		const first = monthsFor(2151);
		const second = monthsFor(2151);
		expect(second).toEqual(first);
		// Whatever the cache hands out must survive a caller mutating it.
		first.sort((a, b) => b.lunation - a.lunation);
		expect(monthsFor(2151).map((m) => m.monthCode)).toEqual([
			"M01",
			"M02",
			"M03",
			"M04",
			"M05",
			"M06L",
			"M06",
			"M07",
			"M08",
			"M09",
			"M10",
			"M11",
			"M12",
		]);
	});

	/**
	 * The cache must key on the config, not the year alone, or it serves one tradition's months for
	 * another. Royal-era 2226 is one of only four years between 1500 and 2500 where the two shipped
	 * configs disagree at month level — M09 begins 2099-10-15 under `PHUGPA` and 2099-10-14 under
	 * `PHUGPA_HENNING` — which is exactly why the test names it rather than a convenient year: a
	 * config-blind cache passes everywhere else.
	 */
	it("keeps the two traditions apart in the cache", () => {
		const phugpaFirst = monthsFor(2226)
			.find((m) => m.monthCode === "M09")
			?.firstDay.toString();
		const henning = monthsFor(2226, PHUGPA_HENNING).find((m) => m.monthCode === "M09");
		expect(phugpaFirst).toBe("2099-10-15");
		expect(henning?.firstDay.toString()).toBe("2099-10-14");
		// Ask for the first one again, after the second has been through the cache.
		expect(
			monthsFor(2226)
				.find((m) => m.monthCode === "M09")
				?.firstDay.toString(),
		).toBe("2099-10-15");
	});

	it("numbers a leap month one lunation before the regular month it shares a number with", () => {
		const months = monthsFor(2151);
		const leap = months.find((m) => m.monthCode === "M06L");
		const regular = months.find((m) => m.monthCode === "M06");
		expect(leap?.lunation).toBe((regular?.lunation ?? Number.NaN) - 1);
	});

	// Lunations are the unbroken count, so they continue across the Losar boundary without a gap.
	it("continues its lunation count into the next year", () => {
		const lastOf2151 = at(monthsFor(2151), -1);
		const firstOf2152 = at(monthsFor(2152), 0);
		expect(firstOf2152.lunation).toBe(lastOf2151.lunation + 1);
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
			expect(leapMonthNumberFor(year), `leapMonthNumberFor ${year}`).toBe(
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
		expect(leapMonthNumberFor(2153)).toBe(leapMonthOfYearY(PHUGPA, 2026));
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
			() => leapMonthNumberFor(1.5),
			() => monthsInYear(1.5),
		]) {
			expect(codeOf(call)).toBe("TCT_FIELD_OUT_OF_RANGE");
		}
		expect(codeOf(() => hasLeapMonth(2153, { ...PHUGPA, moonTab: [] }))).toBe(
			"TCT_INVALID_TRADITION_CONFIG",
		);
	});
});

/**
 * `12·(year − epochYear) + …` overflows `Number.MAX_SAFE_INTEGER` for an absurdly large year, and
 * before this guard existed the flagged and unflagged branches disagreed about it: the flagged one
 * ran `sharesNumberWithLeapMonth` on overflowed arithmetic and reported `TCT_NO_SUCH_LEAP_MONTH`, a confident
 * claim about a month that was never actually evaluated, while the unflagged one reached the
 * exactness check further down and correctly refused with `TCT_OUTSIDE_EXACT_RANGE`.
 */
describe("closed-form overflow guard", () => {
	const OVERFLOW_YEAR = 9_007_199_254_740_000;

	it("refuses an overflowing year identically, flagged and unflagged, across every closed form", () => {
		for (const call of [
			() => tibetanToIso({ year: OVERFLOW_YEAR, month: 5, day: 1 }),
			() => tibetanToIso({ year: OVERFLOW_YEAR, month: 5, day: 1, isLeapMonth: true }),
			() => daysInMonth({ year: OVERFLOW_YEAR, month: 5 }),
			() => daysInMonth({ year: OVERFLOW_YEAR, month: 5, isLeapMonth: true }),
			() => hasLeapMonth(OVERFLOW_YEAR),
			() => leapMonthNumberFor(OVERFLOW_YEAR),
			() => monthsInYear(OVERFLOW_YEAR),
		]) {
			expect(codeOf(call)).toBe("TCT_OUTSIDE_EXACT_RANGE");
		}
	});

	it("rethrows the overflow from tibetanDateExists rather than reporting the date absent", () => {
		expect(codeOf(() => tibetanDateExists({ year: OVERFLOW_YEAR, month: 5, day: 1 }))).toBe(
			"TCT_OUTSIDE_EXACT_RANGE",
		);
		expect(
			codeOf(() => tibetanDateExists({ year: OVERFLOW_YEAR, month: 5, day: 1, isLeapMonth: true })),
		).toBe("TCT_OUTSIDE_EXACT_RANGE");
	});

	/**
	 * `isLeapYear`/`leapMonthNumberFor` compute `24·year + γ*` on the *absolute* Janson `Y`, not on
	 * `year − epochYear` like `sharesNumberWithLeapMonth`'s route does — so the bound has to be the tighter of two
	 * different overflow points, converted into the same `|year − epochYear|` terms. A version of
	 * the guard that only accounted for the `12·(year − epochYear)` formula let `hasLeapMonth` answer
	 * with a wrong boolean throughout the top half of the range it claimed to protect, computed from
	 * a `24·year` that had already lost precision — silently, since a boolean is a boolean whether or
	 * not the float arithmetic that produced it was exact. `typeof x === "boolean"` cannot catch that;
	 * only comparing against an exact reference can, which is what this does with `BigInt`.
	 */
	it("answers correctly just inside the bound, checked against a BigInt reference", () => {
		const bigMod = (a: bigint, m: bigint): bigint => {
			const r = a % m;
			return r < 0n ? r + m : r;
		};
		// Mirrors calendar.ts's beta()/gammaStar(): small numbers, so ordinary float math is exact.
		const beta = 67 * PHUGPA.epochMonth - PHUGPA.intercalationIndexAtEpoch - 17;
		const gammaStar = Number(bigMod(BigInt(-24 * PHUGPA.epochYear - beta), 65n));
		// The exact, overflow-proof reference for isLeapYear's `(24·Y + γ*) mod 65 >= 41`.
		const referenceIsLeapYear = (year: number): boolean =>
			bigMod(24n * BigInt(year) + BigInt(gammaStar), 65n) >= 41n;

		// Mirrors assertClosedFormYear's own derivation, rather than a value transcribed by hand —
		// this is the arithmetic a mistyped derivation would break.
		const relativeLimit = Math.floor((Number.MAX_SAFE_INTEGER - 12) / 12);
		const absoluteLimit =
			Math.floor((Number.MAX_SAFE_INTEGER - 65) / 24) - Math.abs(PHUGPA.epochYear);
		const limit = Math.min(relativeLimit, absoluteLimit);

		// Sweep the last 50 years inside the bound, not just the single boundary year: the bug this
		// guards against was wrong across the whole top half of the naive range, not only at its edge.
		for (let offset = 0; offset < 50; offset++) {
			const y = PHUGPA.epochYear + limit - offset; // Janson's Y
			const royalEraYear = y + 127;
			expect(hasLeapMonth(royalEraYear), `Y=${y}`).toBe(referenceIsLeapYear(y));
		}

		const justInsideRoyal = PHUGPA.epochYear + limit + 127;
		expect(codeOf(() => hasLeapMonth(justInsideRoyal + 1))).toBe("TCT_OUTSIDE_EXACT_RANGE");
	});
});

/**
 * The month grid: every calendar day of a month, labelled.
 *
 * The loop this replaces is documented in the README and correct — but only because a warning box
 * explains that `for (d = 1; d <= days; d++)` is wrong. Date numbers are not contiguous; calendar
 * days are, which is what this walks.
 */
describe("datesFor", () => {
	it("returns one entry per calendar day, not per date number", () => {
		for (const year of [2151, 2153]) {
			for (const month of monthsFor(year)) {
				const dates = datesFor(month);
				expect(dates.length, `${year} ${month.monthCode}`).toBe(month.days);
				expect(at(dates, 0).isoDate.toString()).toBe(month.firstDay.toString());
				expect(at(dates, -1).isoDate.toString()).toBe(month.lastDay.toString());
			}
		}
	});

	it("labels every entry with the month it belongs to", () => {
		const month = at(monthsFor(2151), 5);
		for (const date of datesFor(month)) {
			expect(date.month).toBe(month.month);
			expect(date.isLeapMonth).toBe(month.isLeapMonth);
			expect(date.lunation).toBe(month.lunation);
		}
	});

	/**
	 * The two irregularities a grid has to render. A doubled number appears twice — once with
	 * `isLeapDay` — and a skipped number does not appear at all, which is precisely why counting to
	 * `days` produces a wrong grid.
	 */
	it("repeats a doubled number and omits a skipped one", () => {
		// 2151 M05 doubles 14 and skips 17 and 28.
		const may = monthsFor(2151).find((m) => m.monthCode === "M05");
		if (may === undefined) expect.unreachable("2151 has M05");
		const numbers = datesFor(may).map((d) => d.day);
		expect(numbers.filter((n) => n === 14)).toHaveLength(2);
		expect(numbers).not.toContain(17);
		expect(numbers).not.toContain(28);
		expect(
			datesFor(may)
				.filter((d) => d.isLeapDay)
				.map((d) => d.day),
		).toEqual([14]);
	});

	it("accepts a hand-built month, not only one from monthsFor", () => {
		const fromList = monthsFor(2151).find((m) => m.monthCode === "M06L");
		if (fromList === undefined) expect.unreachable("2151 has a leap month 6");
		expect(datesFor({ year: 2151, month: 6, isLeapMonth: true })).toHaveLength(fromList.days);
	});

	it.each([
		["a PlainDate", () => datesFor(iso("2026-08-12") as never)],
		["null", () => datesFor(null as never)],
		[
			"a non-boolean isLeapMonth",
			() => datesFor({ year: 2151, month: 6, isLeapMonth: 1 } as never),
		],
	])("rejects %s", (_label, call) => {
		expect(codeOf(call)).toBe("TCT_INVALID_ARGUMENT");
	});

	it.each([
		["month 13", () => datesFor({ year: 2151, month: 13 })],
		["a fractional year", () => datesFor({ year: 2151.5, month: 1 })],
	])("rejects %s", (_label, call) => {
		expect(codeOf(call)).toBe("TCT_FIELD_OUT_OF_RANGE");
	});

	it("refuses a leap month the year does not have", () => {
		expect(codeOf(() => datesFor({ year: 2153, month: 5, isLeapMonth: true }))).toBe(
			"TCT_NO_SUCH_LEAP_MONTH",
		);
	});

	it("refuses a month outside the exact range", () => {
		// PHUGPA_HENNING runs out around royal era 11,483. Both sides of that are pinned, so the
		// bound cannot silently tighten into refusing dates it can compute.
		expect(datesFor({ year: 11_480, month: 1 }, PHUGPA_HENNING)).toHaveLength(30);
		expect(codeOf(() => datesFor({ year: 11_490, month: 1 }, PHUGPA_HENNING))).toBe(
			"TCT_OUTSIDE_EXACT_RANGE",
		);
	});
});

describe("resolveMonth", () => {
	it("returns the same object monthsFor returns for that month", () => {
		const month = resolveMonth({ year: 2151, month: 6, isLeapMonth: true });
		expect(month.monthCode).toBe("M06L");
		expect(month.firstDay.toString()).toBe("2024-07-06");
		expect(month.days).toBe(30);
	});

	it("agrees with monthsFor across a leap year, month for month", () => {
		for (const month of monthsFor(2151)) {
			expect(
				resolveMonth({ year: 2151, month: month.month, isLeapMonth: month.isLeapMonth }),
			).toEqual(month);
		}
	});

	it("defaults isLeapMonth to the regular month, as the field documents", () => {
		expect(resolveMonth({ year: 2151, month: 6 }).monthCode).toBe("M06");
	});

	it("throws TCT_NO_SUCH_LEAP_MONTH for a leap month the year does not have", () => {
		expect(codeOf(() => resolveMonth({ year: 2153, month: 6, isLeapMonth: true }))).toBe(
			"TCT_NO_SUCH_LEAP_MONTH",
		);
	});

	it("carries the same guards daysInMonth does", () => {
		expect(codeOf(() => resolveMonth({ year: 2151, month: 13 }))).toBe("TCT_FIELD_OUT_OF_RANGE");
		expect(codeOf(() => resolveMonth({ year: 1.5, month: 1 }))).toBe("TCT_FIELD_OUT_OF_RANGE");
	});
});

describe("every TibetanMonth is frozen", () => {
	const writeDays = (m: TibetanMonth) => () => {
		(m as { days: number }).days = 999;
	};

	it("monthsFor's entries refuse a write, on a miss and on a hit", () => {
		const config = { ...PHUGPA };
		const miss = monthsFor(2153, config);
		expect(writeDays(at(miss, 0))).toThrow(TypeError);
		const hit = monthsFor(2153, config);
		expect(Object.is(at(hit, 0), at(miss, 0))).toBe(true);
		expect(writeDays(at(hit, 0))).toThrow(TypeError);
	});

	it("the nested yearName refuses a write too", () => {
		const m = at(monthsFor(2153), 0);
		expect(() => {
			(m.yearName as { element: string }).element = "bogus";
		}).toThrow(TypeError);
	});

	it("resolveMonth and addMonths return frozen months", () => {
		const resolved = resolveMonth({ year: 2153, month: 1 });
		expect(writeDays(resolved)).toThrow(TypeError);
		expect(writeDays(addMonths(resolved, 1))).toThrow(TypeError);
	});

	it("the array is still fresh, so one caller's sort cannot reach another", () => {
		const a = monthsFor(2153);
		a.reverse();
		expect(at(monthsFor(2153), 0).month).toBe(1);
	});
});

describe("the monthsFor cache holds at most 64 years per config", () => {
	it("the least recently used year comes back as new objects after 64 others", () => {
		const config = { ...PHUGPA };
		const first = at(monthsFor(2100, config), 0);
		expect(at(monthsFor(2100, config), 0)).toBe(first);
		for (let year = 2101; year <= 2164; year++) monthsFor(year, config);
		const recomputed = at(monthsFor(2100, config), 0);
		expect(recomputed).not.toBe(first);
		expect(recomputed).toEqual(first);
	});

	it("a year touched again is kept, and the next oldest is evicted instead", () => {
		const config = { ...PHUGPA };
		const first = at(monthsFor(2100, config), 0);
		const second = at(monthsFor(2101, config), 0);
		for (let year = 2102; year <= 2163; year++) monthsFor(year, config);
		expect(at(monthsFor(2100, config), 0)).toBe(first);
		monthsFor(2164, config);
		expect(at(monthsFor(2101, config), 0)).not.toBe(second);
		expect(at(monthsFor(2100, config), 0)).toBe(first);
	});
});
