import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
	firstDayOfMonth,
	lastDayOfMonth,
	losarJulianDay,
	sharesNumberWithLeapMonth,
	trueMonthCount,
} from "../src/computation/calendar.js";
import { isoFromJulianDay } from "../src/computation/conversion.js";
import { trueDate } from "../src/computation/corrections.js";
import { deriveScaling } from "../src/computation/scaling.js";
import {
	formatTibetanDate,
	isoToTibetan,
	losarFor,
	PHUGPA,
	tibetanDateExists,
} from "../src/index.js";
import type { Observance } from "../src/observances/index.js";
import { EXAMPLE_OBSERVANCES, getObservances, observancesOn } from "../src/observances/index.js";
import { getObservancesChunked } from "./support/observances-chunked.js";

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

	// Janson §6: a Tibetan month is one lunation, so it runs 29 or 30 calendar days and nothing
	// else. Counted from the month's first and last calendar days.
	it("give every month either 29 or 30 days, over 1970-2070", () => {
		const first = trueMonthCount(PHUGPA, 1970, 1);
		const last = trueMonthCount(PHUGPA, 2070, 1);
		const lengths = new Set<number>();
		for (let n = first; n < last; n++) {
			lengths.add(lastDayOfMonth(scaled, n) - firstDayOfMonth(scaled, n) + 1);
		}
		expect([...lengths].sort((a, b) => a - b)).toEqual([29, 30]);
		// Both lengths must actually occur; a single-valued set would pass a `toContain` check.
		expect(last - first).toBeGreaterThan(1200);
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
			const hasLeap = [...Array(12).keys()].some((i) =>
				sharesNumberWithLeapMonth(PHUGPA, y, i + 1),
			);
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
				expect(sharesNumberWithLeapMonth(PHUGPA, y + 65, m)).toBe(
					sharesNumberWithLeapMonth(PHUGPA, y, m),
				);
				expect(sharesNumberWithLeapMonth(PHUGPA, y + PERIOD_YEARS, m)).toBe(
					sharesNumberWithLeapMonth(PHUGPA, y, m),
				);
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

// Janson §6: the full moon ends lunar day 15 and the new moon ends lunar day 30, so every month
// must carry exactly one of each -- no more, and crucially no fewer. The "no fewer" half is the
// point. `isFullMoon` is computed rather than derived from `day === 15`, because when 15 is
// skipped no day is numbered 15 and a naive test would lose the full moon entirely. The
// `day === 15 || day === 14` guard in buildDate is an optimisation over that computation, and
// this property is what proves the guard does not drop a case.
describe("moon phases", () => {
	it("puts exactly one full moon and one new moon in every month over 1970-2070", () => {
		const first = trueMonthCount(PHUGPA, 1970, 1);
		const last = trueMonthCount(PHUGPA, 2070, 1);
		const wrong: string[] = [];

		for (let n = first; n < last; n++) {
			let full = 0;
			let dark = 0;
			// Walk the month's calendar days directly. Every Julian day in the span is a real
			// day, so this needs no reasoning about which numbers exist.
			for (let jd = firstDayOfMonth(scaled, n); jd <= lastDayOfMonth(scaled, n); jd++) {
				const date = isoToTibetan(isoFromJulianDay(jd));
				if (date.isFullMoon) full++;
				if (date.isNewMoon) dark++;
			}
			if (full !== 1 || dark !== 1) wrong.push(`month ${n}: ${full} full, ${dark} new`);
		}

		expect(wrong).toEqual([]);
		expect(last - first).toBeGreaterThan(1200);
	}, 30_000);
});

// The Tier 1 property docs/testing.md has promised since Phase 0. It constrains the *output*:
// every observance must name a day that exists. Both skipped-day conventions satisfy it --
// "omit" by emitting nothing, "preceding" by moving to a day that does exist -- so this does not
// smuggle in a policy, which is easy to misread it as doing.
describe("skipped days are never observance days", () => {
	it("never places an observance on a date no calendar day carries", () => {
		const found = getObservancesChunked(
			Temporal.PlainDate.from("1950-01-01"),
			Temporal.PlainDate.from("2150-12-31"),
			EXAMPLE_OBSERVANCES,
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
	}, 60_000);

	// Only the annual rules read the two config defaults this varies: every monthly rule and the
	// sojong set both settings of their own, and the other forms read neither. So it is the annual
	// rules' days that are being tried under nine conventions, and the rest ride along.
	it("round-trips every result under each of the nine skippedDay and doubledDay defaults, 2020-2040", () => {
		const bad: string[] = [];
		let checked = 0;
		for (const skippedDay of ["preceding", "following", "omit"] as const) {
			for (const doubledDay of ["first", "second", "both"] as const) {
				const config = { ...EXAMPLE_OBSERVANCES, skippedDay, doubledDay };
				for (const o of getObservancesChunked(
					Temporal.PlainDate.from("2020-01-01"),
					Temporal.PlainDate.from("2040-12-31"),
					config,
				)) {
					checked++;
					// Round-tripping through the ISO date is the strongest form: the day the
					// observance names must be the day it actually falls on.
					if (isoToTibetan(o.date.isoDate).day !== o.date.day) {
						bad.push(`${skippedDay}/${doubledDay} ${o.rule.id} ${o.date.isoDate.toString()}`);
					}
				}
			}
		}
		expect(bad).toEqual([]);
		// Collected and asserted once: an `expect` per result is tens of thousands of calls.
		expect(checked).toBeGreaterThan(50_000);
	}, 60_000);
});

// `observancesOn(d)` is documented as the one-day slice of `getObservances`, and its implementation
// calls it with a one-day range. A form that looks backwards from a day (the counted schedule's
// lookback, a period's span) could answer differently when the range is a single day than when it is
// a year, so the two are held equal on the days where such a form is most exposed.
describe("observancesOn is the day's slice of getObservances", () => {
	const config = {
		...EXAMPLE_OBSERVANCES,
		id: "slice-check",
		rules: [
			...EXAMPLE_OBSERVANCES.rules,
			{
				id: "leap-day-birthday",
				englishName: "A birthday on 29 February",
				when: { type: "western" as const, month: 2, day: 29, ageFromYear: 1900 },
			},
		],
	};

	const describeResult = (o: Observance): string =>
		[
			o.rule.id,
			o.resolution,
			`${o.date.year}-${o.date.month}-${o.date.day}`,
			String(o.date.isLeapMonth),
			String(o.date.isLeapDay),
			String(o.age),
			o.period === undefined ? "-" : `${o.period.first.isoDate}..${o.period.last.isoDate}`,
		].join(" ");

	it("agrees on doubled and skipped days, leap months, both sides of Losar and the sojong anchors", () => {
		const mismatches: string[] = [];
		let compared = 0;
		let anchorsSampled = 0;
		const anchorsPerYear: string[] = [];
		const kinds = new Set<string>();
		for (let year = 1990; year <= 2049; year++) {
			const whole = getObservances(
				Temporal.PlainDate.from({ year, month: 1, day: 1 }),
				Temporal.PlainDate.from({ year, month: 12, day: 31 }),
				config,
			);
			const bySlice = new Map<string, string[]>();
			for (const o of whole) {
				const key = o.date.isoDate.toString();
				bySlice.set(key, [...(bySlice.get(key) ?? []), describeResult(o)]);
				kinds.add(o.resolution);
			}

			const yearsAnchors = whole.filter(
				(o) => o.rule.id === "sojong" && o.resolution !== "counted",
			);
			if (yearsAnchors.length !== 1) anchorsPerYear.push(`${year}: ${yearsAnchors.length}`);

			const chosen = new Set<string>();
			const add = (d: Temporal.PlainDate) => {
				if (d.year === year) chosen.add(d.toString());
			};
			let previous: ReturnType<typeof isoToTibetan> | undefined;
			for (
				let d = Temporal.PlainDate.from({ year, month: 1, day: 1 });
				d.year === year;
				d = d.add({ days: 1 })
			) {
				const t = isoToTibetan(d);
				const skippedBefore =
					previous !== undefined && previous.month === t.month && t.day - previous.day === 2;
				if (t.isDoubledDay || t.isLeapMonth || skippedBefore) add(d);
				previous = t;
			}
			// Tibetan 2153 begins on 2026-02-18, so the Losar in Western year Y is Tibetan Y + 127.
			const losar = losarFor(year + 127).isoDate;
			for (const offset of [-1, 0, 1]) add(losar.add({ days: offset }));
			for (const o of whole) {
				if (o.rule.id === "sojong" && o.resolution !== "counted") {
					anchorsSampled++;
					add(o.date.isoDate.subtract({ days: 2 }));
					add(o.date.isoDate.subtract({ days: 1 }));
				}
			}
			add(Temporal.PlainDate.from({ year, month: 2, day: 28 }));
			add(Temporal.PlainDate.from({ year, month: 3, day: 1 }));
			if (Temporal.PlainDate.from({ year, month: 1, day: 1 }).inLeapYear) {
				add(Temporal.PlainDate.from({ year, month: 2, day: 29 }));
			}

			for (const day of chosen) {
				const alone = observancesOn(Temporal.PlainDate.from(day), config).map(describeResult);
				const slice = bySlice.get(day) ?? [];
				compared++;
				if (JSON.stringify(alone) !== JSON.stringify(slice)) {
					mismatches.push(`${day}: alone [${alone.join("; ")}] slice [${slice.join("; ")}]`);
				}
			}
		}
		expect(mismatches).toEqual([]);
		// Guards against agreeing over days that carry nothing.
		expect(compared).toBeGreaterThan(2500);
		// Every Western year 1990-2049 holds exactly one sojong anchor, a result that does not resolve
		// as counted, so none goes unsampled and none is sampled twice.
		expect(anchorsPerYear).toEqual([]);
		expect(anchorsSampled).toBe(60);
		expect([...kinds].sort()).toEqual([
			"counted",
			"dayAfterSkipped",
			"dayBeforeSkipped",
			"exact",
			"firstOfDoubled",
			"inPeriod",
			"secondOfDoubled",
		]);
	}, 180_000);
});
