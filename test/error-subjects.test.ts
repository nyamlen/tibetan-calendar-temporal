import { describe, expect, it } from "vitest";
import { lunarDayAttributesFor, monthAttributesFor } from "../src/astrology/index.js";
import {
	addDays,
	addMonths,
	addMonthsToDate,
	datesFor,
	daysBetween,
	daysInMonth,
	formatTibetanDate,
	formatTibetanMonth,
	leapMonthNumberFor,
	lunationFromMonth,
	monthNamesFor,
	monthsBetween,
	PHUGPA,
	PHUGPA_HENNING,
	resolveDate,
	resolveMonth,
	type TibetanDateFields,
	type TibetanMonthFields,
	type TraditionConfig,
	tibetanDateExists,
	tibetanToIso,
} from "../src/index.js";
import { thrownBy } from "./support/thrown.js";

// The property under test: **an error names the function the caller called**, and for a two-argument
// function, which argument. That is a different property from `hostile-inputs.test.ts`'s, which asks
// only that every failure carry a code. A message is not contract — its code is — but a message naming
// `daysInMonth` to a caller who wrote `monthNamesFor` sends them to read the wrong docblock.
//
// Each row pins the code **and** the message's opening, as an anchored pattern built from a literal
// string, never `toContain`: `toContain("to")` passed for a message naming `tibetanToIso`, because
// " to find" is in its sentence.
//
// Written on 2026-09-24 against the messages as they then stood, a wrong row asserting its wrong
// prefix under a `// wrong:` note, and each expectation changed in the commit that fixed it — so
// `git log -p` on this file shows every old message beside its new one. Not `it.fails`: that passes
// on any throw, a `TypeError` included, so it cannot show the failure is the right one.

const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const opening = (text: string) => new RegExp(`^${escaped(text)}`);

type Call = (tradition: TraditionConfig) => unknown;
type Row = readonly [label: string, call: Call, code: string, prefix: string];

const month = (fields: Partial<TibetanMonthFields> = {}): TibetanMonthFields => ({
	year: 2153,
	month: 1,
	...fields,
});
const date = (fields: Partial<TibetanDateFields> = {}): TibetanDateFields => ({
	year: 2153,
	month: 1,
	day: 1,
	...fields,
});

/** Every month-tier export in scope, called with `value` as its month argument. */
const monthExports = (value: TibetanMonthFields) =>
	({
		lunationFromMonth: (t: TraditionConfig) => lunationFromMonth(value, t),
		addMonths: (t: TraditionConfig) => addMonths(value, 1, t),
		monthsBetween: (t: TraditionConfig) => monthsBetween(month(), value, t),
		resolveMonth: (t: TraditionConfig) => resolveMonth(value, t),
		daysInMonth: (t: TraditionConfig) => daysInMonth(value, t),
		datesFor: (t: TraditionConfig) => datesFor(value, t),
		monthNamesFor: (t: TraditionConfig) => monthNamesFor(value, t),
		monthAttributesFor: (t: TraditionConfig) => monthAttributesFor(value, t),
		formatTibetanMonth: () => formatTibetanMonth(value),
	}) as const;

/** Every date-tier export in scope, called with `value` as its date argument. */
const dateExports = (value: TibetanDateFields) =>
	({
		addDays: (t: TraditionConfig) => addDays(value, 1, t),
		resolveDate: (t: TraditionConfig) => resolveDate(value, t),
		addMonthsToDate: (t: TraditionConfig) => addMonthsToDate(value, 1, { tradition: t }),
		daysBetween: (t: TraditionConfig) => daysBetween(date(), value, t),
		tibetanToIso: (t: TraditionConfig) => tibetanToIso(value, t),
		tibetanDateExists: (t: TraditionConfig) => tibetanDateExists(value, t),
		lunarDayAttributesFor: (t: TraditionConfig) => lunarDayAttributesFor(value, t),
		formatTibetanDate: () => formatTibetanDate(value),
	}) as const;

function expectRow(call: Call, tradition: TraditionConfig, code: string, prefix: string) {
	const error = thrownBy(() => call(tradition));
	expect(error, "should throw").toBeDefined();
	expect(error?.code).toBe(code);
	expect(error?.message).toMatch(opening(prefix));
}

describe("an error names the function the caller called", () => {
	describe("month 13", () => {
		const m = monthExports(month({ month: 13 }));
		const d = dateExports(date({ month: 13 }));
		const rows: Row[] = [
			[
				"lunationFromMonth",
				m.lunationFromMonth,
				"TCT_FIELD_OUT_OF_RANGE",
				"lunationFromMonth({ year: 2153, month: 13 }): ",
			],
			[
				"addMonths",
				m.addMonths,
				"TCT_FIELD_OUT_OF_RANGE",
				"addMonths({ year: 2153, month: 13 }): ",
			],
			[
				"monthsBetween",
				m.monthsBetween,
				"TCT_FIELD_OUT_OF_RANGE",
				"monthsBetween(to: { year: 2153, month: 13 }): ",
			],
			[
				"resolveMonth",
				m.resolveMonth,
				"TCT_FIELD_OUT_OF_RANGE",
				"resolveMonth({ year: 2153, month: 13 }): ",
			],
			[
				"daysInMonth",
				m.daysInMonth,
				"TCT_FIELD_OUT_OF_RANGE",
				"daysInMonth({ year: 2153, month: 13 }): ",
			],
			["datesFor", m.datesFor, "TCT_FIELD_OUT_OF_RANGE", "datesFor({ year: 2153, month: 13 }): "],
			[
				"monthNamesFor",
				m.monthNamesFor,
				"TCT_FIELD_OUT_OF_RANGE",
				"monthNamesFor({ year: 2153, month: 13 }): ",
			],
			[
				"monthAttributesFor",
				m.monthAttributesFor,
				"TCT_FIELD_OUT_OF_RANGE",
				"monthAttributesFor({ year: 2153, month: 13 }): ",
			],
			[
				"formatTibetanMonth",
				m.formatTibetanMonth,
				"TCT_FIELD_OUT_OF_RANGE",
				"formatTibetanMonth({ year: 2153, month: 13 }): ",
			],
			[
				"addDays",
				d.addDays,
				"TCT_FIELD_OUT_OF_RANGE",
				"addDays({ year: 2153, month: 13, day: 1 }): ",
			],
			[
				"resolveDate",
				d.resolveDate,
				"TCT_FIELD_OUT_OF_RANGE",
				"resolveDate({ year: 2153, month: 13, day: 1 }): ",
			],
			[
				"addMonthsToDate",
				d.addMonthsToDate,
				"TCT_FIELD_OUT_OF_RANGE",
				"addMonthsToDate({ year: 2153, month: 13, day: 1 }): ",
			],
			[
				"daysBetween",
				d.daysBetween,
				"TCT_FIELD_OUT_OF_RANGE",
				"daysBetween(to: { year: 2153, month: 13, day: 1 }): ",
			],
			[
				"tibetanToIso",
				d.tibetanToIso,
				"TCT_FIELD_OUT_OF_RANGE",
				"tibetanToIso({ year: 2153, month: 13, day: 1 }): ",
			],
			[
				"lunarDayAttributesFor",
				d.lunarDayAttributesFor,
				"TCT_FIELD_OUT_OF_RANGE",
				"lunarDayAttributesFor({ year: 2153, month: 13, day: 1 }): ",
			],
			[
				"formatTibetanDate",
				d.formatTibetanDate,
				"TCT_FIELD_OUT_OF_RANGE",
				"formatTibetanDate({ year: 2153, month: 13, day: 1 }): ",
			],
		];
		it.each(rows)("%s", (_label, call, code, prefix) => expectRow(call, PHUGPA, code, prefix));
	});

	describe("day 31", () => {
		const d = dateExports(date({ day: 31 }));
		const rows: Row[] = [
			[
				"addDays",
				d.addDays,
				"TCT_FIELD_OUT_OF_RANGE",
				"addDays({ year: 2153, month: 1, day: 31 }): ",
			],
			[
				"resolveDate",
				d.resolveDate,
				"TCT_FIELD_OUT_OF_RANGE",
				"resolveDate({ year: 2153, month: 1, day: 31 }): ",
			],
			[
				"addMonthsToDate",
				d.addMonthsToDate,
				"TCT_FIELD_OUT_OF_RANGE",
				"addMonthsToDate({ year: 2153, month: 1, day: 31 }): ",
			],
			[
				"daysBetween",
				d.daysBetween,
				"TCT_FIELD_OUT_OF_RANGE",
				"daysBetween(to: { year: 2153, month: 1, day: 31 }): ",
			],
			[
				"tibetanToIso",
				d.tibetanToIso,
				"TCT_FIELD_OUT_OF_RANGE",
				"tibetanToIso({ year: 2153, month: 1, day: 31 }): ",
			],
			[
				"lunarDayAttributesFor",
				d.lunarDayAttributesFor,
				"TCT_FIELD_OUT_OF_RANGE",
				"lunarDayAttributesFor({ year: 2153, month: 1, day: 31 }): ",
			],
			[
				"formatTibetanDate",
				d.formatTibetanDate,
				"TCT_FIELD_OUT_OF_RANGE",
				"formatTibetanDate({ year: 2153, month: 1, day: 31 }): ",
			],
		];
		it.each(rows)("%s", (_label, call, code, prefix) => expectRow(call, PHUGPA, code, prefix));
	});

	describe("a leap month with no twin", () => {
		// Self-invalidating: if 2153 ever gains a leap month 1, every row below stops testing anything.
		it("2153 has no leap month under PHUGPA", () => {
			expect(leapMonthNumberFor(2153, PHUGPA)).toBeUndefined();
		});

		const m = monthExports(month({ isLeapMonth: true }));
		const d = dateExports(date({ isLeapMonth: true }));
		const rows: Row[] = [
			[
				"lunationFromMonth",
				m.lunationFromMonth,
				"TCT_NO_SUCH_LEAP_MONTH",
				"lunationFromMonth({ year: 2153, month: 1, isLeapMonth: true }): ",
			],
			[
				"addMonths",
				m.addMonths,
				"TCT_NO_SUCH_LEAP_MONTH",
				"addMonths({ year: 2153, month: 1, isLeapMonth: true }): ",
			],
			[
				"monthsBetween",
				m.monthsBetween,
				"TCT_NO_SUCH_LEAP_MONTH",
				"monthsBetween(to: { year: 2153, month: 1, isLeapMonth: true }): ",
			],
			[
				"resolveMonth",
				m.resolveMonth,
				"TCT_NO_SUCH_LEAP_MONTH",
				"resolveMonth({ year: 2153, month: 1, isLeapMonth: true }): ",
			],
			[
				"daysInMonth",
				m.daysInMonth,
				"TCT_NO_SUCH_LEAP_MONTH",
				"daysInMonth({ year: 2153, month: 1, isLeapMonth: true }): ",
			],
			[
				"datesFor",
				m.datesFor,
				"TCT_NO_SUCH_LEAP_MONTH",
				"datesFor({ year: 2153, month: 1, isLeapMonth: true }): ",
			],
			[
				"monthNamesFor",
				m.monthNamesFor,
				"TCT_NO_SUCH_LEAP_MONTH",
				"monthNamesFor({ year: 2153, month: 1, isLeapMonth: true }): ",
			],
			[
				"monthAttributesFor",
				m.monthAttributesFor,
				"TCT_NO_SUCH_LEAP_MONTH",
				"monthAttributesFor({ year: 2153, month: 1, isLeapMonth: true }): ",
			],
			[
				"addDays",
				d.addDays,
				"TCT_NO_SUCH_LEAP_MONTH",
				"addDays({ year: 2153, month: 1, day: 1, isLeapMonth: true }): ",
			],
			[
				"resolveDate",
				d.resolveDate,
				"TCT_NO_SUCH_LEAP_MONTH",
				"resolveDate({ year: 2153, month: 1, day: 1, isLeapMonth: true }): ",
			],
			[
				"addMonthsToDate",
				d.addMonthsToDate,
				"TCT_NO_SUCH_LEAP_MONTH",
				"addMonthsToDate({ year: 2153, month: 1, day: 1, isLeapMonth: true }): ",
			],
			[
				"daysBetween",
				d.daysBetween,
				"TCT_NO_SUCH_LEAP_MONTH",
				"daysBetween(to: { year: 2153, month: 1, day: 1, isLeapMonth: true }): ",
			],
			[
				"tibetanToIso",
				d.tibetanToIso,
				"TCT_NO_SUCH_LEAP_MONTH",
				"tibetanToIso({ year: 2153, month: 1, day: 1, isLeapMonth: true }): ",
			],
			[
				"lunarDayAttributesFor",
				d.lunarDayAttributesFor,
				"TCT_NO_SUCH_LEAP_MONTH",
				"lunarDayAttributesFor({ year: 2153, month: 1, day: 1, isLeapMonth: true }): ",
			],
		];
		it.each(rows)("%s", (_label, call, code, prefix) => expectRow(call, PHUGPA, code, prefix));
	});

	describe("outside the exact range: PHUGPA_HENNING, royal year 11500", () => {
		// Only the exports that evaluate `true_date`. `lunationFromMonth` and `monthsBetween` are closed
		// forms and answer here, deliberately.
		const m = monthExports(month({ year: 11500 }));
		const d = dateExports(date({ year: 11500 }));
		const rows: Row[] = [
			["addMonths", m.addMonths, "TCT_OUTSIDE_EXACT_RANGE", "addMonths(130705) is outside"],
			[
				"resolveMonth",
				m.resolveMonth,
				"TCT_OUTSIDE_EXACT_RANGE",
				"resolveMonth({ year: 11500, month: 1 }) is outside",
			],
			[
				"daysInMonth",
				m.daysInMonth,
				"TCT_OUTSIDE_EXACT_RANGE",
				"daysInMonth({ year: 11500, month: 1 }) is outside",
			],
			[
				"datesFor",
				m.datesFor,
				"TCT_OUTSIDE_EXACT_RANGE",
				"datesFor({ year: 11500, month: 1 }) is outside",
			],
			[
				"monthNamesFor",
				m.monthNamesFor,
				"TCT_OUTSIDE_EXACT_RANGE",
				"monthNamesFor({ year: 11500, month: 1 }) is outside",
			],
			[
				"monthAttributesFor",
				m.monthAttributesFor,
				"TCT_OUTSIDE_EXACT_RANGE",
				"monthAttributesFor({ year: 11500, month: 1 }) is outside",
			],
			[
				"addDays",
				d.addDays,
				"TCT_OUTSIDE_EXACT_RANGE",
				"addDays({ year: 11500, month: 1, day: 1 }) is outside",
			],
			[
				"resolveDate",
				d.resolveDate,
				"TCT_OUTSIDE_EXACT_RANGE",
				"resolveDate({ year: 11500, month: 1, day: 1 }) is outside",
			],
			[
				"addMonthsToDate",
				d.addMonthsToDate,
				"TCT_OUTSIDE_EXACT_RANGE",
				"addMonthsToDate(130705) is outside",
			],
			[
				"daysBetween",
				d.daysBetween,
				"TCT_OUTSIDE_EXACT_RANGE",
				"daysBetween(to: { year: 11500, month: 1, day: 1 }) is outside",
			],
			[
				"tibetanToIso",
				d.tibetanToIso,
				"TCT_OUTSIDE_EXACT_RANGE",
				"tibetanToIso({ year: 11500, month: 1, day: 1 }) is outside",
			],
			[
				"tibetanDateExists",
				d.tibetanDateExists,
				"TCT_OUTSIDE_EXACT_RANGE",
				"tibetanDateExists({ year: 11500, month: 1, day: 1 }) is outside",
			],
			[
				"lunarDayAttributesFor",
				d.lunarDayAttributesFor,
				"TCT_OUTSIDE_EXACT_RANGE",
				"lunarDayAttributesFor({ year: 11500, month: 1, day: 1 }) is outside",
			],
		];
		it.each(rows)("%s", (_label, call, code, prefix) =>
			expectRow(call, PHUGPA_HENNING, code, prefix),
		);
	});

	describe("the lower bound of the exact range: PHUGPA_HENNING, royal year -20652, month 3", () => {
		// The month's last day is inside the range and its first day is not. Bounding only the last day
		// let four exports answer for a month `resolveMonth` refuses.
		const m = monthExports({ year: -20652, month: 3 });
		const d = dateExports({ year: -20652, month: 3, day: 30 });

		it("resolveMonth refuses the month — the control", () => {
			expectRow(
				m.resolveMonth,
				PHUGPA_HENNING,
				"TCT_OUTSIDE_EXACT_RANGE",
				"resolveMonth({ year: -20652, month: 3 }) is outside",
			);
		});
		it("datesFor refuses the month", () => {
			expectRow(
				m.datesFor,
				PHUGPA_HENNING,
				"TCT_OUTSIDE_EXACT_RANGE",
				"datesFor({ year: -20652, month: 3 }) is outside",
			);
		});

		it.each([
			["daysInMonth", m.daysInMonth, "daysInMonth({ year: -20652, month: 3 }) is outside"],
			["monthNamesFor", m.monthNamesFor, "monthNamesFor({ year: -20652, month: 3 }) is outside"],
			[
				"monthAttributesFor",
				m.monthAttributesFor,
				"monthAttributesFor({ year: -20652, month: 3 }) is outside",
			],
			[
				"lunarDayAttributesFor",
				d.lunarDayAttributesFor,
				"lunarDayAttributesFor({ year: -20652, month: 3, day: 30 }) is outside",
			],
		] as const)("%s refuses the month", (_label, call, prefix) => {
			expectRow(call, PHUGPA_HENNING, "TCT_OUTSIDE_EXACT_RANGE", prefix);
		});

		// Deliberate, and unchanged: `tibetanToIso` bounds the day it converts, by its mean date, so it
		// answers for day 30 of this month and refuses day 1.
		it("tibetanToIso answers for day 30 and refuses day 1", () => {
			expect(thrownBy(() => d.tibetanToIso(PHUGPA_HENNING))).toBeUndefined();
			expect(
				thrownBy(() => tibetanToIso({ year: -20652, month: 3, day: 1 }, PHUGPA_HENNING))?.code,
			).toBe("TCT_OUTSIDE_EXACT_RANGE");
		});
	});
});

describe("the subject renders the fields the shape reads", () => {
	it("a date shows both leap flags when set", () => {
		expectRow(
			() => tibetanToIso(date({ day: 31, isLeapMonth: true, isLeapDay: true })),
			PHUGPA,
			"TCT_FIELD_OUT_OF_RANGE",
			"tibetanToIso({ year: 2153, month: 1, day: 31, isLeapMonth: true, isLeapDay: true }): ",
		);
	});
	// A resolved leap-day date is a valid month argument, and its day and isLeapDay are ignored, so
	// the echo leaves them out rather than showing fields the function never read.
	it("a date passed as a month shows neither its day nor its isLeapDay", () => {
		expectRow(
			() => daysInMonth(date({ month: 13, isLeapDay: true })),
			PHUGPA,
			"TCT_FIELD_OUT_OF_RANGE",
			"daysInMonth({ year: 2153, month: 13 }): ",
		);
	});
});

describe("which error a doubly-bad call reports", () => {
	const brokenTradition = {} as TraditionConfig;
	const month13 = month({ month: 13 });
	const date13 = date({ month: 13 });
	const codeOf = (call: () => unknown) => thrownBy(call)?.code;

	// Order A: the tradition first.
	it("addDays reports the tradition before the shape", () => {
		expect(codeOf(() => addDays(null as never, 1, brokenTradition))).toBe(
			"TCT_INVALID_TRADITION_CONFIG",
		);
	});
	it("monthAttributesFor reports the tradition before the shape", () => {
		expect(codeOf(() => monthAttributesFor(null as never, brokenTradition))).toBe(
			"TCT_INVALID_TRADITION_CONFIG",
		);
	});

	// Order B: the shape, then the tradition, then the range.
	it.each([
		["tibetanToIso", (v: never) => tibetanToIso(v, brokenTradition), date13],
		["daysInMonth", (v: never) => daysInMonth(v, brokenTradition), month13],
	] as const)("%s reports the shape, then the tradition, then the range", (_label, call, value) => {
		expect(codeOf(() => call(null as never))).toBe("TCT_INVALID_ARGUMENT");
		expect(codeOf(() => call(value as never))).toBe("TCT_INVALID_TRADITION_CONFIG");
	});

	// Order C — the range before the tradition — until 2026-09-24, when both moved onto the month
	// tier's shared guard.
	it.each([
		["resolveMonth", (v: never) => resolveMonth(v, brokenTradition)],
		["datesFor", (v: never) => datesFor(v, brokenTradition)],
	] as const)("%s reports the shape, then the tradition, then the range", (_label, call) => {
		expect(codeOf(() => call(null as never))).toBe("TCT_INVALID_ARGUMENT");
		expect(codeOf(() => call(month13 as never))).toBe("TCT_INVALID_TRADITION_CONFIG");
	});

	// Order B is load-bearing here: were the range checked before the tradition, the allowlist would
	// swallow the range error and report a broken config as a date that does not exist.
	it("tibetanDateExists reports a broken tradition rather than answering false", () => {
		expect(codeOf(() => tibetanDateExists(date13, brokenTradition))).toBe(
			"TCT_INVALID_TRADITION_CONFIG",
		);
	});
});

describe("tibetanDateExists still answers false", () => {
	it("for month 13", () => {
		expect(tibetanDateExists(date({ month: 13 }))).toBe(false);
	});
	it("for a leap month with no twin", () => {
		expect(leapMonthNumberFor(2153, PHUGPA)).toBeUndefined();
		expect(tibetanDateExists(date({ isLeapMonth: true }))).toBe(false);
	});
});

describe("lunarDayAttributesFor, where the month and the day are both wrong", () => {
	// The day's error wins, since the day is range-checked with the other fields before anything
	// about the month is computed. Until 2026-09-24 the month's won: TCT_NO_SUCH_LEAP_MONTH and
	// TCT_OUTSIDE_EXACT_RANGE respectively.
	it("a leap month with no twin, day 31", () => {
		expect(
			thrownBy(() => lunarDayAttributesFor(date({ isLeapMonth: true, day: 31 }), PHUGPA))?.code,
		).toBe("TCT_FIELD_OUT_OF_RANGE");
	});
	it("outside the exact range, day 31", () => {
		expect(
			thrownBy(() => lunarDayAttributesFor(date({ year: 11500, day: 31 }), PHUGPA_HENNING))?.code,
		).toBe("TCT_FIELD_OUT_OF_RANGE");
	});
});
