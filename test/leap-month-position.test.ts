/**
 * Where a leap month sits relative to the regular month sharing its number.
 *
 * @remarks
 * Bhutan numbers a leap month from the **preceding** month, which places it **after** the regular
 * month sharing its number. Phugpa, Tsurphu and the Mongolian version all place it before. Janson
 * calls the difference "an important difference", notes it is the Chinese system rather than the
 * Indian, and that it seems to have been the original Kālacakra कालचक्र system.
 *
 * The two framings invert, which is the trap this file exists partly to pin: *numbers from the
 * preceding month* and *falls after* are the same fact. `TraditionConfig.leapMonthPosition` states
 * the position, because every consumer of it in `src/` cares about order and none cares about
 * numbering.
 *
 * Required rather than defaulted, and deliberately so — the same reasoning as
 * `leapIndexThreshold`, one level further out. A default of `"before"` would silently give Tibet's
 * ordering to a Bhutanese config: no error, no wrong-looking output, just every date in one lunation
 * a month out. `undefined` is the likelier mistake than a wrong string.
 */

import { describe, expect, it } from "vitest";
import {
	lastDayOfMonth,
	lastMonthCountOfYear,
	losarJulianDay,
	monthFromCount,
	sharesNumberWithLeapMonth,
	trueMonthCount,
} from "../src/computation/calendar.js";
import { scalingFor } from "../src/computation/scaling.js";
import { monthsFor } from "../src/months.js";
import { getObservances } from "../src/observances/index.js";
import type { ObservanceConfig } from "../src/observances/types.js";
import { PHUGPA } from "../src/traditions/phugpa.js";
import type { TraditionConfig } from "../src/traditions/types.js";
import { validatedTradition } from "../src/traditions/validate.js";

/**
 * Phugpa with the ordering reversed and nothing else touched.
 *
 * @remarks
 * Not a real tradition — Bhutan differs in its threshold too. That is the point: holding every other
 * field fixed isolates what the position alone does, so a difference between these two configs is
 * attributable to one field rather than to two.
 */
const MIRRORED: TraditionConfig = { ...PHUGPA, leapMonthPosition: "after" };

const YEARS = { from: 1900, to: 2100 };

/** Every month of a year in chronological order, with the twin emitted on the config's side. */
function monthsInOrder(config: TraditionConfig, year: number) {
	const out: { year: number; month: number; isLeap: boolean; count: number }[] = [];
	for (let month = 1; month <= 12; month++) {
		const twin = sharesNumberWithLeapMonth(config, year, month);
		const emit = (isLeap: boolean) =>
			out.push({ year, month, isLeap, count: trueMonthCount(config, year, month, isLeap) });
		if (twin && config.leapMonthPosition === "before") emit(true);
		emit(false);
		if (twin && config.leapMonthPosition === "after") emit(true);
	}
	return out;
}

function sweep(config: TraditionConfig) {
	const out: ReturnType<typeof monthsInOrder> = [];
	for (let year = YEARS.from; year <= YEARS.to; year++) out.push(...monthsInOrder(config, year));
	return out;
}

/** Throws and reports the message, so two rejections can be compared rather than merely counted. */
function messageFrom(config: unknown): string {
	try {
		validatedTradition(config as TraditionConfig);
	} catch (error) {
		return (error as Error).message;
	}
	throw new Error("expected validatedTradition to throw, and it did not");
}

describe("validation", () => {
	it("rejects a missing position rather than defaulting it", () => {
		const { leapMonthPosition: _omitted, ...withoutIt } = PHUGPA;
		expect(() => validatedTradition(withoutIt as TraditionConfig)).toThrow(
			expect.objectContaining({ code: "TCT_INVALID_TRADITION_CONFIG" }),
		);
	});

	it.each(["", "Before", "AFTER", "preceding", "following", 0, 1, true, null])(
		"rejects %p",
		(value) => {
			expect(() =>
				validatedTradition({ ...PHUGPA, leapMonthPosition: value } as TraditionConfig),
			).toThrow(expect.objectContaining({ code: "TCT_INVALID_TRADITION_CONFIG" }));
		},
	);

	it("tells absence and a wrong value apart", () => {
		// Not a style point. A missing field and a mistyped one are different mistakes with different
		// fixes, and folding them into one message is what made `leapIndexThreshold`'s absence read as
		// an out-of-range number. Asserting the two differ pins the distinction without pinning
		// wording, which is not contract — the code is.
		const { leapMonthPosition: _omitted, ...withoutIt } = PHUGPA;
		expect(messageFrom(withoutIt)).not.toBe(
			messageFrom({ ...PHUGPA, leapMonthPosition: "sideways" }),
		);
	});

	it("accepts both positions", () => {
		for (const leapMonthPosition of ["before", "after"] as const) {
			expect(() => validatedTradition({ ...PHUGPA, leapMonthPosition })).not.toThrow();
		}
	});
});

describe("the true month count stays a gapless bijection", () => {
	// The property that *determines* the rule rather than merely checking it. The count is Janson's
	// zla-dag: zero at the epoch, increasing by exactly one per month, leap months included. Any
	// ordering rule that satisfies that over two centuries is the right one, and the candidate this
	// work started from — leap = rounded + 1 — is not: it leaves a gap of 2 before the pair and a
	// collision of 0 after it, at every leap month.
	it.each([
		["before", PHUGPA],
		["after", MIRRORED],
	] as const)("advances by exactly one per month under %s", (_position, config) => {
		const months = sweep(config);
		const bad: string[] = [];
		for (let i = 1; i < months.length; i++) {
			const previous = months[i - 1] as (typeof months)[number];
			const current = months[i] as (typeof months)[number];
			const step = current.count - previous.count;
			if (step !== 1) {
				bad.push(
					`${previous.year}/${previous.month}${previous.isLeap ? "L" : ""}=${previous.count} → ` +
						`${current.year}/${current.month}${current.isLeap ? "L" : ""}=${current.count} (step ${step})`,
				);
			}
		}
		expect(bad).toEqual([]);
	});
});

describe("which side of its twin a leap month falls on", () => {
	it("puts the leap month one count earlier under before, and one later under after", () => {
		const bad: string[] = [];
		for (let year = YEARS.from; year <= YEARS.to; year++) {
			for (let month = 1; month <= 12; month++) {
				if (!sharesNumberWithLeapMonth(PHUGPA, year, month)) continue;
				const before =
					trueMonthCount(PHUGPA, year, month, true) - trueMonthCount(PHUGPA, year, month, false);
				const after =
					trueMonthCount(MIRRORED, year, month, true) -
					trueMonthCount(MIRRORED, year, month, false);
				if (before !== -1) bad.push(`before ${year}/${month}: ${before}`);
				if (after !== 1) bad.push(`after ${year}/${month}: ${after}`);
			}
		}
		expect(bad).toEqual([]);
	});

	it("leaves a month with no twin untouched by the position", () => {
		// The sharp one, and the thing the first draft of this rule got wrong. Flipping the position
		// must move *only* the two months sharing a number. If an untwinned month shifts, the
		// adjustment has been applied to the wrong side and every date after it is out by a lunation.
		const bad: string[] = [];
		for (let year = YEARS.from; year <= YEARS.to; year++) {
			for (let month = 1; month <= 12; month++) {
				if (sharesNumberWithLeapMonth(PHUGPA, year, month)) continue;
				const before = trueMonthCount(PHUGPA, year, month, false);
				const after = trueMonthCount(MIRRORED, year, month, false);
				if (before !== after) bad.push(`${year}/${month}: ${before} vs ${after}`);
			}
		}
		expect(bad).toEqual([]);
	});

	it("gives the pair the same two counts either way, and only swaps the labels", () => {
		// Corollary worth pinning separately: the lunation grid does not move. A leap pair occupies
		// the same two counts under both positions; what changes is which one carries the flag.
		const bad: string[] = [];
		for (let year = YEARS.from; year <= YEARS.to; year++) {
			for (let month = 1; month <= 12; month++) {
				if (!sharesNumberWithLeapMonth(PHUGPA, year, month)) continue;
				const pairOf = (config: TraditionConfig) =>
					[
						trueMonthCount(config, year, month, true),
						trueMonthCount(config, year, month, false),
					].sort((a, b) => a - b);
				const [b1, b2] = pairOf(PHUGPA);
				const [a1, a2] = pairOf(MIRRORED);
				if (b1 !== a1 || b2 !== a2) bad.push(`${year}/${month}: [${b1},${b2}] vs [${a1},${a2}]`);
			}
		}
		expect(bad).toEqual([]);
	});
});

describe("monthFromCount inverts trueMonthCount under both positions", () => {
	it.each([
		["before", PHUGPA],
		["after", MIRRORED],
	] as const)("recovers every month it produced under %s", (_position, config) => {
		const bad: string[] = [];
		for (const entry of sweep(config)) {
			const back = monthFromCount(config, entry.count);
			if (back.year !== entry.year || back.month !== entry.month || back.isLeap !== entry.isLeap) {
				bad.push(
					`n=${entry.count} expected ${entry.year}/${entry.month}${entry.isLeap ? "L" : ""}, ` +
						`got ${back.year}/${back.month}${back.isLeap ? "L" : ""}`,
				);
			}
		}
		expect(bad).toEqual([]);
	});

	it.each([
		["before", PHUGPA],
		["after", MIRRORED],
	] as const)("round-trips from an arbitrary count under %s", (_position, config) => {
		const bad: number[] = [];
		for (let n = -500; n <= 15_000; n += 7) {
			const month = monthFromCount(config, n);
			if (trueMonthCount(config, month.year, month.month, month.isLeap) !== n) bad.push(n);
		}
		expect(bad).toEqual([]);
	});
});

describe("where a Tibetan year ends", () => {
	// Until 2026-08-16 three call sites spelled this `(12, isLeap: false)`, which is only the last
	// month of the year when leap months precede. Under "after" a year can close with a leap month
	// 12, and `losarJulianDay` then computed New Year one lunation early — in exactly the year
	// Bhutan's fixture anchors on.
	const yearsClosingWithALeapMonth = (config: TraditionConfig) => {
		const years: number[] = [];
		for (let year = YEARS.from; year <= YEARS.to; year++) {
			if (sharesNumberWithLeapMonth(config, year, 12)) years.push(year);
		}
		return years;
	};

	it("has years that close with a leap month 12, so the case is real", () => {
		// Guards against every assertion below passing vacuously.
		expect(yearsClosingWithALeapMonth(MIRRORED).length).toBeGreaterThan(0);
	});

	it.each([
		["before", PHUGPA],
		["after", MIRRORED],
	] as const)("names the chronologically last month under %s", (_position, config) => {
		const bad: string[] = [];
		for (let year = YEARS.from; year <= YEARS.to; year++) {
			const months = monthsInOrder(config, year);
			const last = months[months.length - 1] as (typeof months)[number];
			const reported = lastMonthCountOfYear(config, year);
			if (reported !== last.count) {
				bad.push(
					`${year}: reported ${reported}, chronologically last is ` +
						`${last.month}${last.isLeap ? "L" : ""}=${last.count}`,
				);
			}
		}
		expect(bad).toEqual([]);
	});

	it.each([
		["before", PHUGPA],
		["after", MIRRORED],
	] as const)("meets the next year's first month with no gap under %s", (_position, config) => {
		const bad: string[] = [];
		for (let year = YEARS.from; year < YEARS.to; year++) {
			const next = monthsInOrder(config, year + 1)[0] as { count: number };
			if (lastMonthCountOfYear(config, year) + 1 !== next.count) {
				bad.push(`${year}→${year + 1}: ${lastMonthCountOfYear(config, year)} then ${next.count}`);
			}
		}
		expect(bad).toEqual([]);
	});

	it("puts Losar after the closing leap month, not before it", () => {
		// The consequence, in days rather than counts. MIRRORED carries Phugpa's astronomical
		// constants, so these are real Julian days — the position is the only thing under test.
		const scaled = scalingFor(MIRRORED);
		const bad: string[] = [];
		for (const year of yearsClosingWithALeapMonth(MIRRORED)) {
			const losar = losarJulianDay(scaled, MIRRORED, year + 1);
			const closingLeapMonth = trueMonthCount(MIRRORED, year, 12, true);
			const expected = lastDayOfMonth(scaled, closingLeapMonth) + 1;
			if (losar !== expected) bad.push(`${year + 1}: Losar ${losar}, expected ${expected}`);
		}
		expect(bad).toEqual([]);
	});
});

describe("monthsFor emits a year in chronological order", () => {
	it.each([
		["before", PHUGPA],
		["after", MIRRORED],
	] as const)("never steps the lunation backwards under %s", (_position, config) => {
		const bad: string[] = [];
		for (let year = 2100; year <= 2180; year++) {
			const months = monthsFor(year, config);
			for (let i = 1; i < months.length; i++) {
				const previous = months[i - 1] as (typeof months)[number];
				const current = months[i] as (typeof months)[number];
				if (current.lunation !== previous.lunation + 1) {
					bad.push(
						`${year}: ${previous.monthCode}=${previous.lunation} → ` +
							`${current.monthCode}=${current.lunation}`,
					);
				}
			}
		}
		expect(bad).toEqual([]);
	});

	it("puts the leap month after its twin under after, and before it under before", () => {
		const codesFor = (config: TraditionConfig, year: number) =>
			monthsFor(year, config).map((month) => month.monthCode);
		// A year Phugpa gives a leap month, so both configs produce thirteen months.
		const leapYear = 2151;
		const before = codesFor(PHUGPA, leapYear);
		const after = codesFor(MIRRORED, leapYear);

		expect(before).toHaveLength(13);
		expect(after).toHaveLength(13);
		expect(before.indexOf("M06L")).toBe(before.indexOf("M06") - 1);
		expect(after.indexOf("M06L")).toBe(after.indexOf("M06") + 1);
		// Same thirteen months either way; only the pair's order differs.
		expect([...before].sort()).toEqual([...after].sort());
	});
});

describe("the observance layer selects the right one of a twinned pair", () => {
	// The convention itself is semantic and needed no change: it branches on `month.isLeap`, so
	// "leap" means the leap month wherever it sits. What did need changing is how `getObservances`
	// *locates* the twin. It probed `monthCount ± 1`, which is inverted under "after", and the
	// failure was a missed twin rather than a mirrored one: the leapMonth convention was skipped and
	// the observance fired in both months. These tests would pass on the old code for "before" and
	// fail for "after" by returning two hits instead of one.
	const ruleIn = (month: number, leapMonth: "leap" | "regular") => ({
		id: "probe",
		englishName: "Probe",
		when: { type: "annual" as const, dates: [{ month, day: 15 }] },
		leapMonth,
	});

	const configWith = (leapMonth: "leap" | "regular"): ObservanceConfig => ({
		id: "probe",
		englishName: "Probe",
		doubledDay: "second",
		skippedDay: "preceding",
		leapMonth,
		rules: [ruleIn(6, leapMonth)],
	});

	// Royal-era 2151 — the Tibetan year beginning in Gregorian 2024 — has a leap month 6 under
	// Phugpa's threshold, which both configs share, so the pair exists either way and only its order
	// differs. It is the year of the Chokhor Duchen that FPMT prints in the leap month.
	const window = {
		from: Temporal.PlainDate.from("2024-03-01"),
		to: Temporal.PlainDate.from("2024-12-31"),
	};

	it.each([
		["before", PHUGPA],
		["after", MIRRORED],
	] as const)("fires once, not in both months, under %s", (_position, tradition) => {
		for (const choice of ["leap", "regular"] as const) {
			const hits = getObservances(window.from, window.to, configWith(choice), tradition);
			expect(hits.filter((hit) => hit.rule.id === "probe")).toHaveLength(1);
		}
	});

	it("picks the earlier month for regular under after, and the later under before", () => {
		const dayOf = (tradition: TraditionConfig, choice: "leap" | "regular") => {
			const [hit] = getObservances(window.from, window.to, configWith(choice), tradition);
			return hit?.date.isoDate.toString();
		};
		// Same physical pair of lunations either way, so the two configs must disagree about which
		// one "regular" names — that disagreement is the whole feature.
		expect(dayOf(PHUGPA, "regular")).not.toBe(dayOf(MIRRORED, "regular"));
		// And "regular" under "after" must be the *earlier* of the two, which is "leap" under
		// "before" — the pair's members are the same lunations, only relabelled.
		expect(dayOf(MIRRORED, "regular")).toBe(dayOf(PHUGPA, "leap"));
		expect(dayOf(MIRRORED, "leap")).toBe(dayOf(PHUGPA, "regular"));
	});
});

describe("the shipped configs", () => {
	it("declares Phugpa's ordering explicitly rather than by omission", () => {
		// The whole point of the field being required: `"before"` is a choice Phugpa makes, not the
		// only possibility, and the config should say so.
		expect(PHUGPA.leapMonthPosition).toBe("before");
	});
});
