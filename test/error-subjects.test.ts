import { describe, expect, it } from "vitest";
import {
	attributesFor,
	elementalYogaFor,
	lunarDayAttributesFor,
	lunarMansionFor,
	monthAttributesFor,
} from "../src/astrology/index.js";
import {
	addDays,
	addMonths,
	addMonthsToDate,
	datesFor,
	daysBetween,
	daysInMonth,
	formatTibetanDate,
	formatTibetanMonth,
	hasLeapMonth,
	isoFromJulianDay,
	isoToTibetan,
	julianDayFromIso,
	leapMonthNumberFor,
	losarFor,
	lunationFromMonth,
	monthFromLunation,
	monthNamesFor,
	monthsBetween,
	monthsFor,
	monthsInYear,
	nextFullMoon,
	nextNewMoon,
	PHUGPA,
	PHUGPA_HENNING,
	resolveDate,
	resolveMonth,
	type TibetanDateFields,
	type TibetanMonthFields,
	type TraditionConfig,
	tibetanDateExists,
	tibetanToIso,
	weekdayNameFor,
} from "../src/index.js";
import {
	composeObservances,
	EXAMPLE_OBSERVANCES,
	getObservances,
	nextObservance,
	observancesOn,
} from "../src/observances/index.js";
import { assertTibetanRanges, assertTibetanShape } from "../src/types.js";
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

	// One order everywhere: the shape, then the tradition, then the range. Until 2026-11-15 the
	// navigators and five astrology exports checked the tradition first ("order A"); Andreas ruled for
	// this order, and docs/decisions/2026-11-15-attribute-functions-share-the-exact-range.md records why.
	it.each([
		["tibetanToIso", (v: never) => tibetanToIso(v, brokenTradition), date13],
		["daysInMonth", (v: never) => daysInMonth(v, brokenTradition), month13],
		["lunationFromMonth", (v: never) => lunationFromMonth(v, brokenTradition), month13],
		["addMonths", (v: never) => addMonths(v, 1, brokenTradition), month13],
		["addDays", (v: never) => addDays(v, 1, brokenTradition), date13],
		["resolveDate", (v: never) => resolveDate(v, brokenTradition), date13],
		[
			"addMonthsToDate",
			(v: never) => addMonthsToDate(v, 1, { tradition: brokenTradition }),
			date13,
		],
		["monthsBetween(from)", (v: never) => monthsBetween(v, month13, brokenTradition), month13],
		["monthsBetween(to)", (v: never) => monthsBetween(month13, v, brokenTradition), month13],
		["daysBetween(from)", (v: never) => daysBetween(v, date13, brokenTradition), date13],
		["daysBetween(to)", (v: never) => daysBetween(date13, v, brokenTradition), date13],
		["monthAttributesFor", (v: never) => monthAttributesFor(v, brokenTradition), month13],
		["lunarDayAttributesFor", (v: never) => lunarDayAttributesFor(v, brokenTradition), date13],
	] as const)("%s reports the shape, then the tradition, then the range", (_label, call, value) => {
		expect(codeOf(() => call(null as never))).toBe("TCT_INVALID_ARGUMENT");
		expect(codeOf(() => call(value as never))).toBe("TCT_INVALID_TRADITION_CONFIG");
	});

	// Western-date exports have no range a caller can reach with a valid date, so the shape against
	// the tradition is the whole order.
	const day = Temporal.PlainDate.from("2026-09-01");
	it.each([
		["isoToTibetan", (v: never) => isoToTibetan(v, brokenTradition)],
		["nextFullMoon", (v: never) => nextFullMoon(v, brokenTradition)],
		["nextNewMoon", (v: never) => nextNewMoon(v, brokenTradition)],
		["elementalYogaFor", (v: never) => elementalYogaFor(v, brokenTradition)],
		["lunarMansionFor", (v: never) => lunarMansionFor(v, brokenTradition)],
		["attributesFor", (v: never) => attributesFor(v, brokenTradition)],
	] as const)("%s reports the shape before the tradition", (_label, call) => {
		expect(codeOf(() => call(null as never))).toBe("TCT_INVALID_ARGUMENT");
		expect(codeOf(() => call(day as never))).toBe("TCT_INVALID_TRADITION_CONFIG");
	});

	// Order C — the range before the tradition — until 2026-09-24, when both moved onto the month
	// tier's shared guard.
	it.each([
		["resolveMonth", (v: never) => resolveMonth(v, brokenTradition)],
		["datesFor", (v: never) => datesFor(v, brokenTradition)],
		["monthNamesFor", (v: never) => monthNamesFor(v, brokenTradition)],
	] as const)("%s reports the shape, then the tradition, then the range", (_label, call) => {
		expect(codeOf(() => call(null as never))).toBe("TCT_INVALID_ARGUMENT");
		expect(codeOf(() => call(month13 as never))).toBe("TCT_INVALID_TRADITION_CONFIG");
	});

	// A bare number has no shape, so the order reduces to the tradition before the number. Until the
	// parked cleanup batch, five of these checked the number first; the 2026-11-15 ruling had left
	// them outside order B, and the 2026-11-17 one brought them in.
	it.each([
		["monthsFor", (v: never) => monthsFor(v, brokenTradition)],
		["losarFor", (v: never) => losarFor(v, brokenTradition)],
		["monthFromLunation", (v: never) => monthFromLunation(v, brokenTradition)],
		["hasLeapMonth", (v: never) => hasLeapMonth(v, brokenTradition)],
		["leapMonthNumberFor", (v: never) => leapMonthNumberFor(v, brokenTradition)],
		["monthsInYear", (v: never) => monthsInYear(v, brokenTradition)],
		["weekdayNameFor", (v: never) => weekdayNameFor(v, brokenTradition)],
		["isoFromJulianDay", (v: never) => isoFromJulianDay(v, brokenTradition)],
	] as const)("%s reports the tradition before its number", (_label, call) => {
		expect(codeOf(() => call(1.5 as never))).toBe("TCT_INVALID_TRADITION_CONFIG");
		expect(codeOf(() => call("x" as never))).toBe("TCT_INVALID_TRADITION_CONFIG");
	});

	// A count beside a month or date is a value, not a shape, so the tradition comes before it.
	it.each([
		["addMonths", () => addMonths(month({}), 1.5, brokenTradition)],
		["addDays", () => addDays(date({}), 1.5, brokenTradition)],
		["addMonthsToDate", () => addMonthsToDate(date({}), 1.5, { tradition: brokenTradition })],
	] as const)("%s reports the tradition before its count", (_label, call) => {
		expect(codeOf(call)).toBe("TCT_INVALID_TRADITION_CONFIG");
	});

	// With a valid tradition a bad bare number keeps the range code, a non-number included: the
	// deliberate exception in the argument-errors record.
	it.each([
		["monthsFor", (v: never) => monthsFor(v)],
		["losarFor", (v: never) => losarFor(v)],
		["monthFromLunation", (v: never) => monthFromLunation(v)],
		["hasLeapMonth", (v: never) => hasLeapMonth(v)],
		["leapMonthNumberFor", (v: never) => leapMonthNumberFor(v)],
		["monthsInYear", (v: never) => monthsInYear(v)],
		["weekdayNameFor", (v: never) => weekdayNameFor(v)],
		["isoFromJulianDay", (v: never) => isoFromJulianDay(v)],
	] as const)(
		"%s, under a valid tradition, still reports a wrong number as a range",
		(_label, call) => {
			expect(codeOf(() => call(1.5 as never))).toBe("TCT_FIELD_OUT_OF_RANGE");
			expect(codeOf(() => call("x" as never))).toBe("TCT_FIELD_OUT_OF_RANGE");
		},
	);

	// Order B is load-bearing here: were the range checked before the tradition, the allowlist would
	// swallow the range error and report a broken config as a date that does not exist.
	it("tibetanDateExists reports a broken tradition rather than answering false", () => {
		expect(codeOf(() => tibetanDateExists(null as never, brokenTradition))).toBe(
			"TCT_INVALID_ARGUMENT",
		);
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
	// The day's error wins — for any out-of-range day, not only 31 — since the day is range-checked
	// with the other fields before anything about the month is computed. Until 2026-09-24 the month's won: TCT_NO_SUCH_LEAP_MONTH and
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

describe("composeObservances names itself, not the validator", () => {
	const layerRows = [
		["a layer that is not an object", null, "the layer must be an object"],
		["an unknown layer key", { id: "l", englishName: "L", rules: [] }, "has no key"],
		["a layer id that is not a string", { id: 5, englishName: "L" }, "id"],
		["a remove naming no rule", { id: "l", englishName: "L", remove: ["nope"] }, "remove"],
		["an add naming a kept rule", { id: "l", englishName: "L", add: [{ id: "tara" }] }, "add"],
		[
			"a conventions entry with a key that is not a convention",
			{ id: "l", englishName: "L", conventions: [{ id: "tara", when: {} }] },
			"conventions",
		],
		[
			"a conventions entry naming no rule",
			{ id: "l", englishName: "L", conventions: [{ id: "nope", doubledDay: "first" }] },
			"conventions",
		],
	] as const;
	it.each(layerRows)("%s", (_label, layer) => {
		const error = thrownBy(() => composeObservances(EXAMPLE_OBSERVANCES, layer as never));
		expect(error?.code).toBe("TCT_INVALID_OBSERVANCE_CONFIG");
		expect(error?.message).toMatch(opening("composeObservances(layer"));
	});

	// A fault inside a rule or name the layer supplies surfaces only when the composed candidate is
	// validated, and it is still the layer's: X1.6.
	const monthlyWhen = { type: "monthly", days: [10] };
	const throwingWhen = Object.defineProperty({ id: "new", englishName: "New" }, "when", {
		enumerable: true,
		get() {
			throw new Error("trap");
		},
	});
	const candidateRows = [
		[
			"an add rule whose when is a Proxy",
			{
				id: "l",
				englishName: "L",
				add: [{ id: "new", englishName: "New", when: new Proxy(monthlyWhen, {}) }],
			},
		],
		["an add rule whose when getter throws", { id: "l", englishName: "L", add: [throwingWhen] }],
		[
			"a layer tibetanName given as a Proxy",
			{
				id: "l",
				englishName: "L",
				tibetanName: new Proxy({ tibetan: "ཀ", wylie: "ka", phonetic: "ka" }, {}),
			},
		],
	] as const;
	it.each(candidateRows)("%s", (_label, layer) => {
		const error = thrownBy(() => composeObservances(EXAMPLE_OBSERVANCES, layer as never));
		expect(error?.code).toBe("TCT_INVALID_OBSERVANCE_CONFIG");
		expect(error?.message).toMatch(opening("composeObservances(layer"));
	});

	it("still names the base for a fault in the base", () => {
		const base = {
			...EXAMPLE_OBSERVANCES,
			rules: [new Proxy({ ...EXAMPLE_OBSERVANCES.rules[0] }, {})],
		};
		const error = thrownBy(() => composeObservances(base as never, { id: "l", englishName: "L" }));
		expect(error?.code).toBe("TCT_INVALID_OBSERVANCE_CONFIG");
		expect(error?.message).toMatch(opening("composeObservances(base)"));
	});
});

describe("nextObservance names itself, not getObservances", () => {
	const from = Temporal.PlainDate.from("2026-01-01");
	const rows = [
		["an unknown rule id", "nope"],
		["a rule id that is not a string", 15],
	] as const;
	it.each(rows)("%s", (_label, ruleId) => {
		const error = thrownBy(() => nextObservance(from, ruleId as never, EXAMPLE_OBSERVANCES));
		expect(error?.code).toBe("TCT_INVALID_ARGUMENT");
		expect(error?.message).toMatch(opening("nextObservance(ruleId): "));
		expect(error?.message).not.toMatch(/getObservances/);
	});
});

describe("a Western date's refusal opens with the caller's name", () => {
	// Until the parked cleanup batch these two refusals named no caller: the calendar one was built
	// by assertIsoCalendar, and asWesternDay passed no subject to asPlainDate for a string.
	const day = Temporal.PlainDate.from("2026-01-01");
	const hebrew = Temporal.PlainDate.from("2007-01-01").withCalendar("hebrew");
	it.each([
		["a Hebrew-calendar PlainDate", () => getObservances(hebrew, day, EXAMPLE_OBSERVANCES)],
		[
			"an ISO string carrying a Hebrew calendar",
			() => getObservances("2007-01-01[u-ca=hebrew]" as never, day, EXAMPLE_OBSERVANCES),
		],
	] as const)("getObservances, given %s", (_label, call) => {
		const error = thrownBy(call);
		expect(error?.code).toBe("TCT_INVALID_ARGUMENT");
		expect(error?.message.startsWith("getObservances(from): ")).toBe(true);
	});

	it.each([
		["isoToTibetan", (value: unknown) => isoToTibetan(value as never)],
		["julianDayFromIso", (value: unknown) => julianDayFromIso(value as never)],
	] as const)("%s names itself and its argument", (name, call) => {
		const wrong = [["junk"], [hebrew], ["2007-01-01[u-ca=hebrew]"]]
			.map(([value]) => thrownBy(() => call(value))?.message ?? "no throw")
			.filter((message) => !message.startsWith(`${name}(date): `));
		expect(wrong).toEqual([]);
	});

	it("nextFullMoon, given a string Temporal cannot read", () => {
		const error = thrownBy(() => nextFullMoon("junk" as never));
		expect(error?.code).toBe("TCT_INVALID_ARGUMENT");
		expect(error?.message.startsWith("nextFullMoon: ")).toBe(true);
	});

	it("nextFullMoon, given a Hebrew-calendar PlainDate", () => {
		expect(thrownBy(() => nextFullMoon(hebrew))?.message.startsWith("nextFullMoon: ")).toBe(true);
	});

	// A revoked Proxy's type cannot even be read, and that refusal is built before any other.
	const revoked = (() => {
		const { proxy, revoke } = Proxy.revocable({}, {});
		revoke();
		return proxy;
	})();
	it.each([
		["getObservances(from): ", () => getObservances(revoked as never, day, EXAMPLE_OBSERVANCES)],
		["nextFullMoon: ", () => nextFullMoon(revoked as never)],
		["nextFullMoon: ", () => nextFullMoon({ isoDate: revoked } as never)],
	] as const)("a value whose type cannot be read opens with %s", (prefix, call) => {
		const error = thrownBy(call);
		expect(error?.code).toBe("TCT_INVALID_ARGUMENT");
		expect(error?.message.startsWith(prefix)).toBe(true);
	});
});

// The observance entry points share one date guard and one config validator, and each states its own
// name through them. A shared message that named another function's signature sent a caller to read
// the wrong docblock: a TraditionConfig given to `composeObservances`, which takes no tradition, was
// told to use `getObservances(from, to, config, tradition)`.
describe("a Tibetan date's refusal names its caller and the right remedy", () => {
	const revoked = (() => {
		const { proxy, revoke } = Proxy.revocable({}, {});
		revoke();
		return proxy;
	})();

	// M2.2: the unreadable-type refusal was the one assertTibetanShape message without the caller.
	it.each([
		["tibetanToIso: ", () => tibetanToIso(revoked as never)],
		["formatTibetanMonth: ", () => formatTibetanMonth(revoked as never)],
	] as const)("a value whose type cannot be read opens with %s", (prefix, call) => {
		const error = thrownBy(call);
		expect(error?.code).toBe("TCT_INVALID_ARGUMENT");
		expect(error?.message.startsWith(prefix)).toBe(true);
	});

	// M2.3: resolveDate is a direct swap for isoToTibetan, not a "convert first" export.
	it("tells a resolveDate caller holding a Western date to call isoToTibetan instead", () => {
		const error = thrownBy(() => resolveDate(Temporal.PlainDate.from("2027-01-15") as never));
		expect(error?.code).toBe("TCT_INVALID_ARGUMENT");
		expect(error?.message).toContain("Did you mean isoToTibetan(date)?");
	});

	// M2.1: the non-object refusal said "date" for a month too.
	it("calls a month a month when refusing a non-object", () => {
		const error = thrownBy(() => formatTibetanMonth(null as never));
		expect(error?.code).toBe("TCT_INVALID_ARGUMENT");
		expect(error?.message).toContain("naming a Tibetan month");
	});

	// M2.4: a month snapshot range-checked as a date compiled, and its missing day was refused as out
	// of range, which tibetanDateExists swallows.
	it("makes a month snapshot range-checked as a date a COMPILE error", () => {
		const month = assertTibetanShape("x", { year: 2153, month: 1 }, "month", "convert");
		// @ts-expect-error a month snapshot is not a date snapshot. tsc errors on an UNUSED
		// directive, so this line fails `npm run typecheck` if the overloads are lost.
		expect(() => assertTibetanRanges("x", month, "date")).toThrow();
	});
});

describe("the observance guards name the function that was called", () => {
	const from = Temporal.PlainDate.from("2026-01-01");
	const CONFIG = "TCT_INVALID_OBSERVANCE_CONFIG";
	const ARGUMENT = "TCT_INVALID_ARGUMENT";
	const layer = { id: "l", englishName: "L" };

	type ObservanceRow = readonly [label: string, call: () => unknown, code: string, prefix: string];
	const dateRows: ObservanceRow[] = [
		[
			"getObservances from",
			() => getObservances(null as never, from, EXAMPLE_OBSERVANCES),
			ARGUMENT,
			"getObservances(from): ",
		],
		[
			"getObservances to",
			() => getObservances(from, 5 as never, EXAMPLE_OBSERVANCES),
			ARGUMENT,
			"getObservances(to): ",
		],
		[
			"observancesOn",
			() => observancesOn(null as never, EXAMPLE_OBSERVANCES),
			ARGUMENT,
			"observancesOn(date): ",
		],
		[
			"nextObservance",
			() => nextObservance(null as never, "tara", EXAMPLE_OBSERVANCES),
			ARGUMENT,
			"nextObservance(from): ",
		],
		[
			"getObservances from, a string Temporal rejects",
			() => getObservances("nope" as never, from, EXAMPLE_OBSERVANCES),
			ARGUMENT,
			"getObservances(from): ",
		],
	];
	it.each(dateRows)("%s", (_label, call, code, prefix) => {
		const error = thrownBy(call);
		expect(error?.code).toBe(code);
		expect(error?.message).toMatch(opening(prefix));
	});

	const configRows: ObservanceRow[] = [
		[
			"getObservances, null",
			() => getObservances(from, from, null as never),
			CONFIG,
			"getObservances(config): ",
		],
		[
			"observancesOn, null",
			() => observancesOn(from, null as never),
			CONFIG,
			"observancesOn(config): ",
		],
		[
			"nextObservance, null",
			() => nextObservance(from, "tara", null as never),
			CONFIG,
			"nextObservance(config): ",
		],
		[
			"composeObservances, null",
			() => composeObservances(null as never, layer),
			CONFIG,
			"composeObservances(base): ",
		],
		[
			"observancesOn, a Date",
			() => observancesOn(from, new Date() as never),
			CONFIG,
			"observancesOn(config): ",
		],
		[
			"nextObservance, a TraditionConfig",
			() => nextObservance(from, "tara", PHUGPA as never),
			CONFIG,
			"nextObservance(config): ",
		],
		[
			"nextObservance, a { tradition } bag",
			() => nextObservance(from, "tara", { tradition: PHUGPA } as never),
			CONFIG,
			"nextObservance(config): ",
		],
		[
			"nextObservance, a { config } bag",
			() => nextObservance(from, "tara", { config: EXAMPLE_OBSERVANCES } as never),
			CONFIG,
			"nextObservance(config): ",
		],
		[
			"composeObservances, a TraditionConfig",
			() => composeObservances(PHUGPA as never, layer),
			CONFIG,
			"composeObservances(base): ",
		],
		[
			"composeObservances, a { tradition } bag",
			() => composeObservances({ tradition: PHUGPA } as never, layer),
			CONFIG,
			"composeObservances(base): ",
		],
		[
			"composeObservances, a { config } bag",
			() => composeObservances({ config: EXAMPLE_OBSERVANCES } as never, layer),
			CONFIG,
			"composeObservances(base): ",
		],
		[
			"getObservances, a TraditionConfig",
			() => getObservances(from, from, PHUGPA as never),
			CONFIG,
			"getObservances(config): ",
		],
	];
	it.each(configRows)("%s", (_label, call, code, prefix) => {
		const error = thrownBy(call);
		expect(error?.code).toBe(code);
		expect(error?.message).toMatch(opening(prefix));
	});

	it("tells nobody to pass a tradition to composeObservances, which takes none", () => {
		for (const wrong of [PHUGPA, { tradition: PHUGPA }, { config: EXAMPLE_OBSERVANCES }]) {
			const error = thrownBy(() => composeObservances(wrong as never, layer));
			expect(error?.message).not.toMatch(/getObservances/);
			expect(error?.message).toMatch(/composeObservances\(base, layer\)/);
		}
	});

	it("names the function's own signature, not another's, for nextObservance", () => {
		for (const wrong of [PHUGPA, { tradition: PHUGPA }, { config: EXAMPLE_OBSERVANCES }]) {
			const error = thrownBy(() => nextObservance(from, "tara", wrong as never));
			expect(error?.message).not.toMatch(/getObservances/);
			expect(error?.message).toMatch(/nextObservance\(from, ruleId, config, tradition\)/);
		}
	});

	it("says what a tradition given as the layer is, and what a layer is", () => {
		const error = thrownBy(() => composeObservances(EXAMPLE_OBSERVANCES, PHUGPA as never));
		expect(error?.code).toBe(CONFIG);
		expect(error?.message).toMatch(opening("composeObservances(layer): "));
		expect(error?.message).toMatch(/TraditionConfig/);
		expect(error?.message).not.toMatch(/has no key "name"/);
	});

	it("says what a Date given as the config is", () => {
		const error = thrownBy(() => observancesOn(from, new Date() as never));
		expect(error?.message).toMatch(/Date/);
		expect(error?.message).not.toMatch(/received undefined/);
	});

	it("points a config-shaped refusal at composeObservances, not at spreading", () => {
		const error = thrownBy(() => observancesOn(from, null as never));
		expect(error?.message).toMatch(/composeObservances/);
		expect(error?.message).not.toMatch(/spread/);
		const rules = thrownBy(() =>
			observancesOn(from, { ...EXAMPLE_OBSERVANCES, rules: "x" } as never),
		);
		expect(rules?.message).toMatch(/composeObservances/);
		expect(rules?.message).not.toMatch(/spread/);
	});
});
