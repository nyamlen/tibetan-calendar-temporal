import { describe, expect, it } from "vitest";
import { isoToTibetan } from "../../src/computation/conversion.js";
import { EXAMPLE_OBSERVANCES, getObservances } from "../../src/observances/index.js";
import type { ObservanceConfig } from "../../src/observances/types.js";
import { thrownBy } from "../support/thrown.js";

const iso = (s: string) => Temporal.PlainDate.from(s);
const CODE = "TCT_INVALID_OBSERVANCE_CONFIG";

const configWith = (rule: Record<string, unknown>): ObservanceConfig =>
	({
		...EXAMPLE_OBSERVANCES,
		id: "formulas",
		rules: [{ id: "f", englishName: "F", ...rule }],
	}) as unknown as ObservanceConfig;
const formula = (when: Record<string, unknown> = {}, rule: Record<string, unknown> = {}) =>
	configWith({ when: { type: "formula", formula: "lunarDayPlusWeekdayMod4", ...when }, ...rule });
const codeOf = (config: ObservanceConfig) =>
	thrownBy(() => getObservances(iso("2026-04-03"), iso("2026-04-04"), config))?.code;

const FROM = iso("2026-03-01");
const TO = iso("2026-04-30");

describe("the formula form", () => {
	// The expectation is built from Temporal's own day of the week, Sunday counted 0, and never from
	// `TibetanDate.weekday`, which counts Saturday as 0: using that one would agree with the engine
	// and be wrong about the formula.
	const expected: string[] = [];
	for (let day = FROM; Temporal.PlainDate.compare(day, TO) <= 0; day = day.add({ days: 1 })) {
		const remainder = (isoToTibetan(day).day + (day.dayOfWeek % 7)) % 4;
		if (remainder === 1 || remainder === 2) expected.push(day.toString());
	}

	it("holds on exactly the days where day plus a Sunday-0 weekday leaves 1 or 2 mod 4", () => {
		const found = getObservances(FROM, TO, formula());
		expect(found.map((o) => o.date.isoDate.toString())).toEqual(expected);
		expect(found.every((o) => o.resolution === "exact")).toBe(true);
		expect(expected).toHaveLength(31);
	});

	it("judges the two halves of a doubled date separately", () => {
		// Tibetan month 2 day 17 of 2153 is doubled: 2026-04-03 (Friday) and 2026-04-04 (Saturday).
		expect(isoToTibetan(iso("2026-04-03")).isDoubledDay).toBe(true);
		expect(isoToTibetan(iso("2026-04-04")).isDoubledDay).toBe(true);
		expect(isoToTibetan(iso("2026-04-04")).day).toBe(17);
		const found = getObservances(iso("2026-04-03"), iso("2026-04-04"), formula());
		expect(found.map((o) => o.date.isoDate.toString())).toEqual(["2026-04-03"]);
	});

	it("honours the queried range", () => {
		const found = getObservances(iso("2026-03-10"), iso("2026-03-20"), formula());
		expect(found.every((o) => expected.includes(o.date.isoDate.toString()))).toBe(true);
		expect(found.map((o) => o.date.isoDate.toString())).toEqual(
			expected.filter((d) => d >= "2026-03-10" && d <= "2026-03-20"),
		);
	});

	it("refuses an unknown formula name, and a missing one", () => {
		expect(codeOf(formula({ formula: "agnivasa" }))).toBe(CODE);
		expect(codeOf(formula({ formula: undefined }))).toBe(CODE);
	});

	it("refuses an unknown key on the when", () => {
		expect(codeOf(formula({ days: [1] }))).toBe(CODE);
	});

	it.each(["doubledDay", "skippedDay", "leapMonth"])("refuses %s on a formula rule", (setting) => {
		const value = { doubledDay: "first", skippedDay: "omit", leapMonth: "leap" }[setting];
		expect(codeOf(formula({}, { [setting]: value }))).toBe(CODE);
	});
});

describe("the formula form before the Julian day count turns negative", () => {
	// -4712-11-24 is Julian day 0. A day before it has a negative Julian day, and JS `%` keeps the
	// sign, so the weekday must be taken as a non-negative remainder.
	it("holds on exactly the days where day plus a Sunday-0 weekday leaves 1 or 2 mod 4, in year -5000", () => {
		const from = iso("-005000-03-01");
		const expected: string[] = [];
		const found: string[] = [];
		const to = from.add({ days: 59 });
		for (let day = from; Temporal.PlainDate.compare(day, to) <= 0; day = day.add({ days: 1 })) {
			const remainder = (isoToTibetan(day).day + (day.dayOfWeek % 7)) % 4;
			if (remainder === 1 || remainder === 2) expected.push(day.toString());
		}
		for (const o of getObservances(from, to, formula())) found.push(o.date.isoDate.toString());
		expect(expected.length).toBeGreaterThan(0);
		expect(found).toEqual(expected);
	});
});
