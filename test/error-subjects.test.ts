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
// A row that is wrong today asserts today's wrong prefix, marked `// wrong:`, and the commit that
// fixes it changes the expectation, so the diff shows the old message beside the new one. Not
// `it.fails`: that passes on any throw, a `TypeError` included, so it cannot show the failure is the
// right one.

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
			["lunationFromMonth", m.lunationFromMonth, "TCT_FIELD_OUT_OF_RANGE", "lunationFromMonth: "],
			["addMonths", m.addMonths, "TCT_FIELD_OUT_OF_RANGE", "addMonths: "],
			["monthsBetween", m.monthsBetween, "TCT_FIELD_OUT_OF_RANGE", "monthsBetween (to): "],
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
			["datesFor", m.datesFor, "TCT_FIELD_OUT_OF_RANGE", "datesFor: "],
			// wrong: fixed in commit 4
			[
				"monthNamesFor",
				m.monthNamesFor,
				"TCT_FIELD_OUT_OF_RANGE",
				"daysInMonth({ year: 2153, month: 13 }): ",
			],
			// wrong: fixed in commit 4
			[
				"monthAttributesFor",
				m.monthAttributesFor,
				"TCT_FIELD_OUT_OF_RANGE",
				"daysInMonth({ year: 2153, month: 13 }): ",
			],
			[
				"formatTibetanMonth",
				m.formatTibetanMonth,
				"TCT_FIELD_OUT_OF_RANGE",
				"formatTibetanMonth: expected a year and a month 1-12",
			],
			["addDays", d.addDays, "TCT_FIELD_OUT_OF_RANGE", "addDays: "],
			["resolveDate", d.resolveDate, "TCT_FIELD_OUT_OF_RANGE", "resolveDate: "],
			["addMonthsToDate", d.addMonthsToDate, "TCT_FIELD_OUT_OF_RANGE", "addMonthsToDate: "],
			["daysBetween", d.daysBetween, "TCT_FIELD_OUT_OF_RANGE", "daysBetween (to): "],
			[
				"tibetanToIso",
				d.tibetanToIso,
				"TCT_FIELD_OUT_OF_RANGE",
				"tibetanToIso({ year: 2153, month: 13, day: 1 }): ",
			],
			// wrong: fixed in commit 4
			[
				"lunarDayAttributesFor",
				d.lunarDayAttributesFor,
				"TCT_FIELD_OUT_OF_RANGE",
				"daysInMonth({ year: 2153, month: 13 }): ",
			],
			[
				"formatTibetanDate",
				d.formatTibetanDate,
				"TCT_FIELD_OUT_OF_RANGE",
				"formatTibetanDate: expected a year, a month 1-12 and a day 1-30",
			],
		];
		it.each(rows)("%s", (_label, call, code, prefix) => expectRow(call, PHUGPA, code, prefix));
	});

	describe("day 31", () => {
		const d = dateExports(date({ day: 31 }));
		const rows: Row[] = [
			["addDays", d.addDays, "TCT_FIELD_OUT_OF_RANGE", "addDays: "],
			["resolveDate", d.resolveDate, "TCT_FIELD_OUT_OF_RANGE", "resolveDate: "],
			["addMonthsToDate", d.addMonthsToDate, "TCT_FIELD_OUT_OF_RANGE", "addMonthsToDate: "],
			["daysBetween", d.daysBetween, "TCT_FIELD_OUT_OF_RANGE", "daysBetween (to): "],
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
				"lunarDayAttributesFor: ",
			],
			[
				"formatTibetanDate",
				d.formatTibetanDate,
				"TCT_FIELD_OUT_OF_RANGE",
				"formatTibetanDate: expected a year, a month 1-12 and a day 1-30",
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
				"lunationFromMonth({ year: 2153, month: 1 }): ",
			],
			["addMonths", m.addMonths, "TCT_NO_SUCH_LEAP_MONTH", "addMonths({ year: 2153, month: 1 }): "],
			[
				"monthsBetween",
				m.monthsBetween,
				"TCT_NO_SUCH_LEAP_MONTH",
				"monthsBetween (to)({ year: 2153, month: 1 }): ",
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
			["datesFor", m.datesFor, "TCT_NO_SUCH_LEAP_MONTH", "datesFor({ year: 2153, month: 1 }): "],
			// wrong: fixed in commit 4
			[
				"monthNamesFor",
				m.monthNamesFor,
				"TCT_NO_SUCH_LEAP_MONTH",
				"daysInMonth({ year: 2153, month: 1, isLeapMonth: true }): ",
			],
			// wrong: fixed in commit 4
			[
				"monthAttributesFor",
				m.monthAttributesFor,
				"TCT_NO_SUCH_LEAP_MONTH",
				"daysInMonth({ year: 2153, month: 1, isLeapMonth: true }): ",
			],
			// wrong: fixed in commit 3
			[
				"addDays",
				d.addDays,
				"TCT_NO_SUCH_LEAP_MONTH",
				"tibetanToIso({ year: 2153, month: 1, day: 1, isLeapMonth: true }): ",
			],
			// wrong: fixed in commit 3
			[
				"resolveDate",
				d.resolveDate,
				"TCT_NO_SUCH_LEAP_MONTH",
				"tibetanToIso({ year: 2153, month: 1, day: 1, isLeapMonth: true }): ",
			],
			[
				"addMonthsToDate",
				d.addMonthsToDate,
				"TCT_NO_SUCH_LEAP_MONTH",
				"addMonthsToDate({ year: 2153, month: 1 }): ",
			],
			// wrong: fixed in commit 3
			[
				"daysBetween",
				d.daysBetween,
				"TCT_NO_SUCH_LEAP_MONTH",
				"tibetanToIso({ year: 2153, month: 1, day: 1, isLeapMonth: true }): ",
			],
			[
				"tibetanToIso",
				d.tibetanToIso,
				"TCT_NO_SUCH_LEAP_MONTH",
				"tibetanToIso({ year: 2153, month: 1, day: 1, isLeapMonth: true }): ",
			],
			// wrong: fixed in commit 4
			[
				"lunarDayAttributesFor",
				d.lunarDayAttributesFor,
				"TCT_NO_SUCH_LEAP_MONTH",
				"daysInMonth({ year: 2153, month: 1, isLeapMonth: true }): ",
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
			// wrong: fixed in commit 4
			[
				"monthNamesFor",
				m.monthNamesFor,
				"TCT_OUTSIDE_EXACT_RANGE",
				"daysInMonth({ year: 11500, month: 1 }) is outside",
			],
			// wrong: fixed in commit 4
			[
				"monthAttributesFor",
				m.monthAttributesFor,
				"TCT_OUTSIDE_EXACT_RANGE",
				"daysInMonth({ year: 11500, month: 1 }) is outside",
			],
			// wrong: fixed in commit 3
			[
				"addDays",
				d.addDays,
				"TCT_OUTSIDE_EXACT_RANGE",
				"tibetanToIso({ year: 11500, month: 1, day: 1 }) is outside",
			],
			// wrong: fixed in commit 3
			[
				"resolveDate",
				d.resolveDate,
				"TCT_OUTSIDE_EXACT_RANGE",
				"tibetanToIso({ year: 11500, month: 1, day: 1 }) is outside",
			],
			[
				"addMonthsToDate",
				d.addMonthsToDate,
				"TCT_OUTSIDE_EXACT_RANGE",
				"addMonthsToDate(130705) is outside",
			],
			// wrong: fixed in commit 3
			[
				"daysBetween",
				d.daysBetween,
				"TCT_OUTSIDE_EXACT_RANGE",
				"tibetanToIso({ year: 11500, month: 1, day: 1 }) is outside",
			],
			[
				"tibetanToIso",
				d.tibetanToIso,
				"TCT_OUTSIDE_EXACT_RANGE",
				"tibetanToIso({ year: 11500, month: 1, day: 1 }) is outside",
			],
			// wrong: fixed in commit 3
			[
				"tibetanDateExists",
				d.tibetanDateExists,
				"TCT_OUTSIDE_EXACT_RANGE",
				"tibetanToIso({ year: 11500, month: 1, day: 1 }) is outside",
			],
			// wrong: fixed in commit 4
			[
				"lunarDayAttributesFor",
				d.lunarDayAttributesFor,
				"TCT_OUTSIDE_EXACT_RANGE",
				"daysInMonth({ year: 11500, month: 1 }) is outside",
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

		// wrong: all four answer today; fixed in commit 4
		it.each([
			["daysInMonth", m.daysInMonth],
			["monthNamesFor", m.monthNamesFor],
			["monthAttributesFor", m.monthAttributesFor],
			["lunarDayAttributesFor", d.lunarDayAttributesFor],
		] as const)("%s answers", (_label, call) => {
			expect(thrownBy(() => call(PHUGPA_HENNING))).toBeUndefined();
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

	// wrong: order C today — the range before the tradition. Order B from commit 4.
	it.each([
		["resolveMonth", () => resolveMonth(month13, brokenTradition)],
		["datesFor", () => datesFor(month13, brokenTradition)],
	] as const)("%s, month 13 with a broken tradition", (_label, call) => {
		expect(codeOf(call)).toBe("TCT_FIELD_OUT_OF_RANGE");
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
	// wrong: the month's error wins today; from commit 4 the day's does, since the day is range-checked
	// with the other fields, before anything about the month is computed.
	it("a leap month with no twin, day 31", () => {
		expect(
			thrownBy(() => lunarDayAttributesFor(date({ isLeapMonth: true, day: 31 }), PHUGPA))?.code,
		).toBe("TCT_NO_SUCH_LEAP_MONTH");
	});
	it("outside the exact range, day 31", () => {
		expect(
			thrownBy(() => lunarDayAttributesFor(date({ year: 11500, day: 31 }), PHUGPA_HENNING))?.code,
		).toBe("TCT_OUTSIDE_EXACT_RANGE");
	});
});
