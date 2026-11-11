import { describe, expect, it } from "vitest";
import { isoToTibetan, losarFor, tibetanDateExists } from "../../src/computation/conversion.js";
import { EXAMPLE_OBSERVANCES, getObservances, observancesOn } from "../../src/observances/index.js";
import type { ObservanceConfig, ObservanceRule } from "../../src/observances/types.js";
import { BHUTAN } from "../../src/traditions/bhutan.js";
import { PHUGPA } from "../../src/traditions/phugpa.js";
import { thrownBy } from "../support/thrown.js";

const iso = (s: string) => Temporal.PlainDate.from(s);

// The observance *engine*: how a rule resolves onto a calendar day, and what the boundary refuses.
// Agreement with FPMT's published calendars is a different claim about a different subject, and
// lives in test/validation/fpmt-observances.test.ts.

const CONFIG_CODE = "TCT_INVALID_OBSERVANCE_CONFIG";

describe("observance resolution", () => {
	// The row docs/testing.md calls the fixture's most informative: a leap month and a doubled day
	// at once, from an almanac-line source, and the case FPMT itself published two dates for.
	it("puts the 2024 Chokhor Duchen on 10 July by default, the second of the doubled pair", () => {
		const found = observancesOn(iso("2024-07-10"), EXAMPLE_OBSERVANCES).filter(
			(o) => o.rule.id === "chokhor-duchen",
		);
		expect(found).toHaveLength(1);
		expect(found[0]?.resolution).toBe("secondOfDoubled");
		expect(
			observancesOn(iso("2024-07-09"), EXAMPLE_OBSERVANCES).some(
				(o) => o.rule.id === "chokhor-duchen",
			),
		).toBe(false);
	});

	// Janson's holidays section, following Berzin, says the first. Kopan Monastery observed the
	// 9th. An institution follows that line by spreading the config, never by editing the engine.
	it("puts it on 9 July under Janson's rule, reached by spreading the config", () => {
		const kopan = { ...EXAMPLE_OBSERVANCES, id: "kopan", doubledDay: "first" as const };
		const found = observancesOn(iso("2024-07-09"), kopan).filter(
			(o) => o.rule.id === "chokhor-duchen",
		);
		expect(found).toHaveLength(1);
		expect(found[0]?.resolution).toBe("firstOfDoubled");
	});

	it("emits both halves under 'both', reproducing FPMT's own 'July 9 or July 10'", () => {
		const config = { ...EXAMPLE_OBSERVANCES, doubledDay: "both" as const };
		const days = getObservances(iso("2024-07-01"), iso("2024-07-31"), config)
			.filter((o) => o.rule.id === "chokhor-duchen")
			.map((o) => o.date.isoDate.toString());
		expect(days).toEqual(["2024-07-09", "2024-07-10"]);
	});

	// Janson says observances are usually not kept in leap months; FPMT does the opposite here,
	// and 4 of the regular month 6 that follows carries nothing at all.
	it("keeps the 2024 Chokhor Duchen in the leap month, not the regular month 6", () => {
		const inRegular = observancesOn(iso("2024-08-08"), EXAMPLE_OBSERVANCES).some(
			(o) => o.rule.id === "chokhor-duchen",
		);
		expect(inRegular).toBe(false);
		expect(isoToTibetan(iso("2024-08-08")).isLeapMonth).toBe(false);
	});

	// A monthly observance recurs in *both* halves of a leap pair; only annual ones choose.
	it("recurs monthly through both months of a leap pair", () => {
		const leap = observancesOn(iso("2024-07-16"), EXAMPLE_OBSERVANCES).some(
			(o) => o.rule.id === "heruka-day",
		);
		const regular = observancesOn(iso("2024-08-14"), EXAMPLE_OBSERVANCES).some(
			(o) => o.rule.id === "heruka-day",
		);
		expect({ leap, regular }).toEqual({ leap: true, regular: true });
	});

	// Captured from the code before the 8th and 15th rules merged into one id, so the merge is
	// held to what two rules produced: every date of 2026, each once, none lost or invented.
	it("puts Medicine Buddha on the same 2026 dates under one id as under two", () => {
		const dates = getObservances(iso("2026-01-01"), iso("2026-12-31"), EXAMPLE_OBSERVANCES)
			.filter((o) => o.rule.id === "medicine-buddha")
			.map((o) => o.date.isoDate.toString());
		expect(dates).toEqual([
			"2026-01-03",
			"2026-01-26",
			"2026-02-01",
			"2026-02-24",
			"2026-03-03",
			"2026-03-26",
			"2026-04-01",
			"2026-04-24",
			"2026-05-01",
			"2026-05-24",
			"2026-05-31",
			"2026-06-22",
			"2026-06-29",
			"2026-07-22",
			"2026-07-29",
			"2026-08-20",
			"2026-08-28",
			"2026-09-19",
			"2026-09-26",
			"2026-10-18",
			"2026-10-26",
			"2026-11-17",
			"2026-11-24",
			"2026-12-17",
		]);
	});

	it("reports how each observance landed", () => {
		const kinds = new Set(
			getObservances(iso("2022-01-01"), iso("2025-12-31"), EXAMPLE_OBSERVANCES).map(
				(o) => o.resolution,
			),
		);
		// "shiftedFromSkipped" is absent from the shipped config by design: the four great days
		// use it, but none of them met a skipped date in this window.
		expect(kinds.has("exact")).toBe(true);
		expect(kinds.has("secondOfDoubled")).toBe(true);
	});

	it("returns nothing for a reversed range", () => {
		expect(getObservances(iso("2026-01-02"), iso("2026-01-01"), EXAMPLE_OBSERVANCES)).toEqual([]);
	});

	it("returns results in date order", () => {
		const days = getObservances(iso("2026-01-01"), iso("2026-12-31"), EXAMPLE_OBSERVANCES).map(
			(o) => o.date.isoDate.toString(),
		);
		expect([...days].sort()).toEqual(days);
	});

	// The tie-break used localeCompare, which reads the host locale and ICU build -- so the same
	// input could order differently on two machines, against a stated non-negotiable of this
	// project. Shipped ids are ASCII and sort identically either way, so only a consumer config
	// like this one can pin the behaviour.
	it("breaks same-day ties by code unit, not by host collation", () => {
		const rule = (id: string) => ({
			id,
			englishName: id,
			when: { type: "monthly" as const, days: [15] },
		});
		const config = {
			...EXAMPLE_OBSERVANCES,
			id: "tie",
			// Deliberately supplied out of order, and mixing case and an accent -- the inputs where
			// collations disagree with each other.
			rules: [rule("Zebra"), rule("apple"), rule("guru-rinpoche"), rule("guru-rinpoché")],
		};
		// The window covers two Tibetan months, so day 15 comes round twice; the date is the primary
		// key and the id tie-break applies within each day.
		const byDay = new Map<string, string[]>();
		for (const o of getObservances(iso("2026-05-01"), iso("2026-05-31"), config)) {
			const key = o.date.isoDate.toString();
			byDay.set(key, [...(byDay.get(key) ?? []), o.rule.id]);
		}
		expect(byDay.size).toBeGreaterThan(0);

		for (const ids of byDay.values()) {
			expect(ids).toEqual([...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
			// Uppercase sorts before lowercase by code unit; most locales do the opposite.
			expect(ids[0]).toBe("Zebra");
			// "guru-rinpoche" before "guru-rinpoché": by code unit "e" (0x65) precedes "é" (0xE9).
			expect(ids.indexOf("guru-rinpoche")).toBeLessThan(ids.indexOf("guru-rinpoché"));
		}
	});

	// Cost is linear in the span and the per-month work is real, so an unbounded query is minutes
	// of synchronous CPU -- Temporal.PlainDate spans about 547,000 years.
	it("caps the span, and admits exactly 200 years", () => {
		const span = (a: string, b: string) => () =>
			getObservances(iso(a), iso(b), EXAMPLE_OBSERVANCES);
		expect(span("1950-01-01", "2150-12-31")).not.toThrow();
		expect(thrownBy(span("1950-01-01", "2151-01-01"))?.code).toBe("TCT_SPAN_TOO_WIDE");
		expect(thrownBy(span("0001-01-01", "9999-12-31"))?.code).toBe("TCT_SPAN_TOO_WIDE");
	});

	// The bug this task fixes: `to.year - from.year` was compared before anything normalised the
	// arguments, so a string has no numeric `.year` and `NaN > 200` is `false`. A >200-year string
	// range used to return 15,000+ observances silently instead of throwing.
	it("still catches the span cap when the range is given as strings", () => {
		expect(
			thrownBy(() =>
				getObservances(
					"1500-01-01" as unknown as Temporal.PlainDate,
					"1900-01-01" as unknown as Temporal.PlainDate,
					EXAMPLE_OBSERVANCES,
				),
			)?.code,
		).toBe("TCT_SPAN_TOO_WIDE");
	});

	it("still catches the span cap when the range is given as PlainDateTimes", () => {
		expect(
			thrownBy(() =>
				getObservances(
					Temporal.PlainDateTime.from("1500-01-01T00:00:00") as unknown as Temporal.PlainDate,
					Temporal.PlainDateTime.from("1900-01-01T00:00:00") as unknown as Temporal.PlainDate,
					EXAMPLE_OBSERVANCES,
				),
			)?.code,
		).toBe("TCT_SPAN_TOO_WIDE");
	});
});

// The other half of the same bug: `Temporal.PlainDate.compare` accepted `null`, a number, and other
// nonsense happily, so `getObservances(null, null)` and `getObservances(42, 42)` threw uncoded
// `TypeError`s naming Temporal's internals rather than this package's coded RangeError.
describe("bad from/to arguments", () => {
	const BAD_ARGS: readonly [string, unknown][] = [
		["null", null],
		["a number", 42],
		["an empty object", {}],
		["a nonsense string", "nonsense"],
		["an empty string", ""],
	];

	it.each(BAD_ARGS)("getObservances rejects %s for from and to", (_label, value) => {
		expect(
			thrownBy(() =>
				getObservances(
					value as unknown as Temporal.PlainDate,
					value as unknown as Temporal.PlainDate,
					EXAMPLE_OBSERVANCES,
				),
			)?.code,
		).toBe("TCT_INVALID_ARGUMENT");
	});

	it.each(BAD_ARGS)("observancesOn rejects %s", (_label, value) => {
		expect(
			thrownBy(() => observancesOn(value as unknown as Temporal.PlainDate, EXAMPLE_OBSERVANCES))
				?.code,
		).toBe("TCT_INVALID_ARGUMENT");
	});

	// A bad date is reported as a bad date even when the config is missing as well: dates are
	// normalised first, then the config is validated.
	it("reports a bad date before a missing config", () => {
		expect(
			thrownBy(() => (getObservances as never as (...a: unknown[]) => unknown)(null, null))?.code,
		).toBe("TCT_INVALID_ARGUMENT");
	});

	// Regression: valid ISO strings within the span cap must still work exactly as before, both
	// through getObservances and through observancesOn's delegation to it.
	it("still accepts valid ISO strings within the span cap, unchanged", () => {
		const viaPlainDate = getObservances(iso("2024-01-01"), iso("2024-12-31"), EXAMPLE_OBSERVANCES);
		const viaStrings = getObservances(
			"2024-01-01" as unknown as Temporal.PlainDate,
			"2024-12-31" as unknown as Temporal.PlainDate,
			EXAMPLE_OBSERVANCES,
		);
		expect(viaStrings).toEqual(viaPlainDate);

		const onPlainDate = observancesOn(iso("2024-07-10"), EXAMPLE_OBSERVANCES);
		const onString = observancesOn(
			"2024-07-10" as unknown as Temporal.PlainDate,
			EXAMPLE_OBSERVANCES,
		);
		expect(onString).toEqual(onPlainDate);
		expect(onString.length).toBeGreaterThan(0);
	});
});

// The branch carrying the subtlest hand-reasoning in the layer, and unreachable from the shipped
// config: EXAMPLE_OBSERVANCES has no day-1 rule, and its monthly rules all opt out with skippedDay: "omit".
// Only a consumer config gets here, which is exactly why it needs a test.
describe("a rule on day 1, where the preceding day belongs to the previous month", () => {
	const dayOne = {
		...EXAMPLE_OBSERVANCES,
		id: "day-one",
		rules: [
			{
				id: "first-of-month",
				englishName: "First of the month",
				when: { type: "monthly" as const, days: [1] },
				skippedDay: "preceding" as const,
			},
		],
	};

	// Losar 1977 is the case in range where day 1 is skipped: the year opens on the day numbered 2.
	// So the day-1 rule for month 1 has no day to land on, and shifts back across a month boundary
	// -- and across a *year* boundary -- onto the 30th of month 12 of the year before.
	it("shifts back across the month boundary when day 1 is skipped", () => {
		const shifted = getObservances(iso("1977-01-01"), iso("1977-12-31"), dayOne).filter(
			(o) => o.resolution === "shiftedFromSkipped",
		);
		expect(shifted).toHaveLength(1);

		const landed = shifted[0];
		expect(landed?.date.isoDate.toString()).toBe("1977-02-18");
		expect({ month: landed?.date.month, day: landed?.date.day }).toEqual({ month: 12, day: 30 });

		// The day after is Losar, numbered 2 because 1 does not exist -- which is the whole reason
		// this branch computes a Julian day rather than a day number.
		const next = isoToTibetan(iso("1977-02-19"));
		expect({ month: next.month, day: next.day }).toEqual({ month: 1, day: 2 });
		expect(losarFor(next.year).isoDate.toString()).toBe("1977-02-19");
	});

	// Every month resolves, none silently vanishes, and none lands on a day that does not exist.
	it("resolves all twelve months to real days", () => {
		const found = getObservances(iso("1977-01-01"), iso("1977-12-31"), dayOne);
		expect(found).toHaveLength(12);
		for (const o of found) {
			expect(tibetanDateExists({ year: o.date.year, month: o.date.month, day: o.date.day })).toBe(
				true,
			);
		}
		// One shift and one doubled day among them, so this year exercises all three resolutions.
		const resolutions = new Set(found.map((o) => o.resolution));
		expect([...resolutions].sort()).toEqual(["exact", "secondOfDoubled", "shiftedFromSkipped"]);
	});
});

// One rule is one result per calendar day. A rule naming two days can land both on one calendar
// day -- the skipped one shifts onto its neighbour -- and the day must not appear twice.
describe("one result per rule per calendar day", () => {
	const twoDays = (
		overrides: Partial<ObservanceConfig>,
		days: readonly number[] = [29, 30],
	): ObservanceConfig => ({
		...EXAMPLE_OBSERVANCES,
		id: "two-days",
		...overrides,
		rules: [
			{
				id: "end-of-month",
				englishName: "End of the month",
				when: { type: "monthly", days },
				skippedDay: "preceding",
			},
		],
	});

	// Month 12 of Tibetan 2151 (2025 CE) has no 30th: the 29th, 2025-02-27, is followed by Losar.
	it("emits the exact 29th once when the 30th is skipped onto it", () => {
		const found = getObservances(iso("2025-02-20"), iso("2025-02-27"), twoDays({}));
		expect(found.map((o) => [o.date.isoDate.toString(), o.resolution])).toEqual([
			["2025-02-27", "exact"],
		]);
		const after = isoToTibetan(iso("2025-02-28"));
		expect({ month: after.month, day: after.day }).toEqual({ month: 1, day: 1 });
	});

	// The winner must not depend on the order the entries are listed in.
	it("keeps the same winners when the entries are listed the other way round", () => {
		const exact = getObservances(iso("2025-02-20"), iso("2025-02-27"), twoDays({}, [30, 29]));
		expect(exact.map((o) => [o.date.isoDate.toString(), o.resolution])).toEqual([
			["2025-02-27", "exact"],
		]);
		const doubled = getObservances(
			iso("2066-10-10"),
			iso("2066-10-20"),
			twoDays({ doubledDay: "both" }, [30, 29]),
		);
		expect(doubled.map((o) => [o.date.isoDate.toString(), o.resolution])).toEqual([
			["2066-10-17", "firstOfDoubled"],
			["2066-10-18", "secondOfDoubled"],
		]);
	});

	// Losar 1977 opens on day 2, so the skipped month-1 day 1 shifts back onto month 12 day 30 of
	// the year before -- the day the same rule already holds exactly. The two entries belong to
	// different months, so a per-month reduction kept both.
	it("emits one exact result where a skipped day 1 shifts onto the previous month's 30th", () => {
		const found = getObservances(
			iso("1977-02-15"),
			iso("1977-02-21"),
			twoDays({ doubledDay: "both" }, [1, 30]),
		);
		expect(found.map((o) => [o.date.isoDate.toString(), o.resolution])).toEqual([
			["1977-02-18", "exact"],
		]);
	});

	it("does the same for an annual rule across Losar 1901, in either entry order", () => {
		const annual = (dates: { month: number; day: number }[]): ObservanceConfig => ({
			...EXAMPLE_OBSERVANCES,
			id: "annual-losar",
			skippedDay: "preceding",
			rules: [{ id: "losar-edge", englishName: "Losar edge", when: { type: "annual", dates } }],
		});
		for (const dates of [
			[
				{ month: 12, day: 30 },
				{ month: 1, day: 1 },
			],
			[
				{ month: 1, day: 1 },
				{ month: 12, day: 30 },
			],
		]) {
			const found = getObservances(iso("1901-02-10"), iso("1901-02-25"), annual(dates));
			expect(found.map((o) => [o.date.isoDate.toString(), o.resolution])).toEqual([
				["1901-02-19", "exact"],
			]);
		}
	});

	it("never gives one rule two results on a calendar day, over 1900-1999", () => {
		const doubled: string[] = [];
		const seen = new Set<string>();
		for (const o of getObservances(
			iso("1900-01-01"),
			iso("1999-12-31"),
			twoDays({ doubledDay: "both" }, [1, 29, 30]),
		)) {
			const key = `${o.rule.id} ${o.date.isoDate.toString()}`;
			if (seen.has(key)) doubled.push(`${key} ${o.resolution}`);
			seen.add(key);
		}
		expect(doubled).toEqual([]);
	});

	// Tibetan 2193 (2066 CE), month 8: the 29th is doubled (17 and 18 October) and the 30th is
	// skipped, the day after being 2066-10-19 -- the only such month in 1900-2100. Under "both" the
	// skipped 30th shifts onto the second half, which the doubled 29th already claims: the tie is
	// won by the doubled half, not by the shifted day.
	it("keeps the doubled half over the shifted day on the day both land", () => {
		const found = getObservances(
			iso("2066-10-10"),
			iso("2066-10-20"),
			twoDays({ doubledDay: "both" }),
		);
		expect(found.map((o) => [o.date.isoDate.toString(), o.resolution])).toEqual([
			["2066-10-17", "firstOfDoubled"],
			["2066-10-18", "secondOfDoubled"],
		]);
		const after = isoToTibetan(iso("2066-10-19"));
		expect({ month: after.month, day: after.day }).toEqual({ month: 9, day: 1 });
	});
});

// ObservanceConfig is the documented extension point, and until now nothing checked what a
// consumer put in it. The mean-motion formulas are linear in the lunar day, so an out-of-range
// day extrapolated into a real, wrong calendar date labelled resolution: "exact".
describe("consumer config validation", () => {
	const baseRule = {
		id: "r",
		englishName: "R",
		when: { type: "monthly", days: [15] },
	};
	const withRule = (rule: Record<string, unknown>, config: Record<string, unknown> = {}) => ({
		...EXAMPLE_OBSERVANCES,
		id: "test",
		levels: [{ id: "lv", englishName: "Level" }],
		...config,
		rules: [{ ...baseRule, ...rule }],
	});
	const withWhen = (when: unknown) => withRule({ when });
	const run = (config: unknown) =>
		getObservances(iso("2026-01-01"), iso("2026-12-31"), config as ObservanceConfig);
	const codeOf = (config: unknown) => thrownBy(() => run(config))?.code;

	it("accepts the shipped EXAMPLE_OBSERVANCES config", () => {
		expect(() => run(EXAMPLE_OBSERVANCES)).not.toThrow();
		expect(EXAMPLE_OBSERVANCES.id).toBe("example");
	});

	// `{ ...EXAMPLE_OBSERVANCES, rules: [...EXAMPLE_OBSERVANCES.rules, mine] }` is what the docs tell a consumer to write, so
	// `EXAMPLE_OBSERVANCES.rules.push(mine)` is the mistake one keystroke away -- and it used to succeed, adding
	// the rule for every caller in the process.
	it("freezes EXAMPLE_OBSERVANCES, its rules array and each rule", () => {
		expect(Object.isFrozen(EXAMPLE_OBSERVANCES)).toBe(true);
		expect(Object.isFrozen(EXAMPLE_OBSERVANCES.rules)).toBe(true);
		for (const rule of EXAMPLE_OBSERVANCES.rules) {
			expect(Object.isFrozen(rule)).toBe(true);
			expect(Object.isFrozen(rule.when)).toBe(true);
			if (rule.when.type === "monthly") expect(Object.isFrozen(rule.when.days)).toBe(true);
		}
		expect(() =>
			(EXAMPLE_OBSERVANCES.rules as ObservanceRule[]).push({ id: "z" } as ObservanceRule),
		).toThrow(TypeError);
	});

	// A call without a config is the migrating caller's likeliest mistake, and until 2026-11-11 it
	// silently answered with the shipped rules.
	it("refuses a call with no config, a reversed range included", () => {
		const call = getObservances as unknown as (...args: unknown[]) => unknown;
		expect(thrownBy(() => call(iso("2026-01-01"), iso("2026-12-31")))?.code).toBe(CONFIG_CODE);
		expect(thrownBy(() => call(iso("2026-01-02"), iso("2026-01-01")))?.code).toBe(CONFIG_CODE);
		const on = observancesOn as unknown as (...args: unknown[]) => unknown;
		expect(thrownBy(() => on(iso("2026-01-01")))?.code).toBe(CONFIG_CODE);
	});

	it("refuses a TraditionConfig where the config belongs, and says where the tradition goes", () => {
		for (const tradition of [PHUGPA, BHUTAN]) {
			const error = thrownBy(() => run(tradition));
			expect(error?.code).toBe(CONFIG_CODE);
			expect(error?.message).toContain("tradition");
		}
	});

	it("refuses the old { config } bag in the config position", () => {
		const error = thrownBy(() => run({ config: EXAMPLE_OBSERVANCES }));
		expect(error?.code).toBe(CONFIG_CODE);
		expect(error?.message).toContain("getObservances(from, to, config, tradition)");
		expect(codeOf({ tradition: PHUGPA })).toBe(CONFIG_CODE);
		expect(codeOf({})).toBe(CONFIG_CODE);
	});

	it("takes the tradition as the fourth parameter, and refuses a { tradition } bag there", () => {
		const day = iso("2026-02-18");
		expect(() => getObservances(day, day, EXAMPLE_OBSERVANCES, BHUTAN)).not.toThrow();
		expect(
			thrownBy(() => getObservances(day, day, EXAMPLE_OBSERVANCES, { tradition: BHUTAN } as never))
				?.code,
		).toBe("TCT_INVALID_TRADITION_CONFIG");
		expect(thrownBy(() => observancesOn(day, EXAMPLE_OBSERVANCES, null as never))?.code).toBe(
			"TCT_INVALID_TRADITION_CONFIG",
		);
	});

	it("validates the config before the tradition, and both before an empty range", () => {
		const day = iso("2026-02-18");
		const bothBad = thrownBy(() => getObservances(day, day, {} as never, null as never));
		expect(bothBad?.code).toBe(CONFIG_CODE);
		const reversed = thrownBy(() =>
			getObservances(iso("2026-01-02"), iso("2026-01-01"), EXAMPLE_OBSERVANCES, null as never),
		);
		expect(reversed?.code).toBe("TCT_INVALID_TRADITION_CONFIG");
	});

	// Each of these previously returned a real, wrong day rather than complaining.
	it.each([
		["day 31 - was the 1st of the following month", 31],
		["day 0 - was the 30th of the previous month", 0],
		["day -1 - was the 29th of the previous month", -1],
		["day 45 - was the 15th of the same month", 45],
		["fractional day", 15.5],
		["NaN day", Number.NaN],
	])("rejects %s", (_label, day) => {
		expect(codeOf(withWhen({ type: "monthly", days: [day] }))).toBe(CONFIG_CODE);
	});

	// The other silent-failure mode: an out-of-range month matched nothing, so the observance
	// vanished from the year without complaint.
	it.each([
		["month 0", 0],
		["month 13", 13],
		["fractional month", 6.5],
	])("rejects %s", (_label, month) => {
		expect(codeOf(withWhen({ type: "annual", dates: [{ month, day: 15 }] }))).toBe(CONFIG_CODE);
	});

	it("rejects an annual day outside 1-30", () => {
		expect(codeOf(withWhen({ type: "annual", dates: [{ month: 1, day: 31 }] }))).toBe(CONFIG_CODE);
	});

	it.each([
		["a when without a type", { days: [8] }],
		["an unknown type", { type: "weekly", days: [8] }],
		["the old month-and-day shape", { month: 1, day: 15 }],
		["the old day shape", { day: 8 }],
		["empty days", { type: "monthly", days: [] }],
		["repeated days", { type: "monthly", days: [8, 8] }],
		["days that are not an array", { type: "monthly", days: 8 }],
		["empty dates", { type: "annual", dates: [] }],
		["dates that are not an array", { type: "annual", dates: { month: 1, day: 1 } }],
		["an unknown key on a monthly when", { type: "monthly", days: [8], dates: [] }],
		[
			"an unknown key on an annual when",
			{ type: "annual", dates: [{ month: 1, day: 1 }], days: [1] },
		],
		[
			"an unknown key on a dates entry",
			{ type: "annual", dates: [{ month: 6, day: 4, isLeapMonth: true }] },
		],
		["a null dates entry", { type: "annual", dates: [null] }],
	])("rejects %s", (_label, when) => {
		expect(codeOf(withWhen(when))).toBe(CONFIG_CODE);
	});

	it("rejects duplicate rule ids", () => {
		const config = {
			...EXAMPLE_OBSERVANCES,
			rules: [...EXAMPLE_OBSERVANCES.rules, EXAMPLE_OBSERVANCES.rules[0] as never],
		};
		expect(codeOf(config)).toBe(CONFIG_CODE);
	});

	it("rejects an empty rule id and an empty English name", () => {
		expect(codeOf(withRule({ id: "" }))).toBe(CONFIG_CODE);
		expect(codeOf(withRule({ englishName: "" }))).toBe(CONFIG_CODE);
	});

	// The config is meant to be *extended* by spreading -- `{ ...EXAMPLE_OBSERVANCES, rules: [...EXAMPLE_OBSERVANCES.rules, x] }`
	// -- and a reader who writes a partial one instead used to reach a `for...of` over undefined.
	it("rejects a config whose rules are missing or not an array", () => {
		for (const rules of [undefined, null, {}]) {
			expect(codeOf({ ...EXAMPLE_OBSERVANCES, rules })).toBe(CONFIG_CODE);
		}
	});

	// Type-level only, so JSON.parse or a plain-JS consumer walks straight past the compiler.
	it.each([
		["doubledDay", { doubledDay: "1st" }],
		["skippedDay", { skippedDay: "before" }],
		["leapMonth", { leapMonth: "yes" }],
	])("rejects an invalid %s on a rule", (_label, rule) => {
		expect(codeOf(withRule(rule))).toBe(CONFIG_CODE);
	});

	it("rejects an invalid convention on the config itself", () => {
		expect(codeOf({ ...EXAMPLE_OBSERVANCES, doubledDay: "1st" })).toBe(CONFIG_CODE);
	});

	// Validation is memoised per config object, so a repeated call must behave identically rather
	// than passing the second time through.
	it("stays rejected on a repeat call", () => {
		const bad = withWhen({ type: "monthly", days: [31] });
		expect(codeOf(bad)).toBe(CONFIG_CODE);
		expect(codeOf(bad)).toBe(CONFIG_CODE);
	});

	// The three convention fields are declared *required* on ObservanceConfig, and the validator's
	// `value !== undefined` escape let all three through when missing. Downstream they resolved to
	// `undefined` and fell into whichever branch came last. `undefined` is also the far likelier
	// input than the `"1st"` the validator did catch: it is what a config written before a field
	// existed, a hand-built config, or a spread of a Partial<> all produce.
	it.each(["doubledDay", "skippedDay", "leapMonth"])(
		"rejects a config with %s missing entirely",
		(field) => {
			const config = { ...EXAMPLE_OBSERVANCES } as Record<string, unknown>;
			delete config[field];
			expect(codeOf(config)).toBe(CONFIG_CODE);
		},
	);

	// What the omission actually cost, kept as a worked case rather than only a shape assertion.
	// 2024 is a leap-6 year; FPMT prints Chokhor Duchen in the leap month, and with `leapMonth`
	// dropped the engine returned 2024-08-08 from the regular month 6 instead of 2024-07-10.
	it("no longer resolves Chokhor Duchen a month late when leapMonth is dropped", () => {
		const chokhor = {
			...EXAMPLE_OBSERVANCES,
			id: "chokhor-only",
			rules: [
				{
					id: "chokhor-duchen",
					englishName: "Chokhor Duchen",
					when: { type: "annual", dates: [{ month: 6, day: 4 }] },
				},
			],
		} as Record<string, unknown>;

		const withLeap = { ...chokhor, leapMonth: "leap" };
		expect(
			getObservances(
				iso("2024-01-01"),
				iso("2024-12-31"),
				withLeap as unknown as ObservanceConfig,
			).map((o) => o.date.isoDate.toString()),
		).toEqual(["2024-07-10"]);

		const dropped = { ...chokhor };
		delete dropped.leapMonth;
		expect(codeOf(dropped)).toBe(CONFIG_CODE);
	});

	// CLAUDE.md: "Every consumer config gets a validator ... TraditionConfig went unchecked for
	// three phases because the failure looked like a language error rather than a missing feature."
	// These are that same language error, one layer out: all three were raw TypeErrors with
	// code: undefined, so a consumer's `catch (e) { if (e.code === ...) }` fell through.
	it.each([
		["a null config", null],
		["a non-object config", 42],
		["a string config", "gelug"],
		["an undefined config", undefined],
	])("rejects %s with a coded error", (_label, config) => {
		expect(thrownBy(() => observancesOn(iso("2026-01-01"), config as never))?.code).toBe(
			CONFIG_CODE,
		);
	});

	it.each([
		["a null rule", { ...EXAMPLE_OBSERVANCES, rules: [null] }],
		["a rule with no when", { ...EXAMPLE_OBSERVANCES, rules: [{ id: "r", englishName: "R" }] }],
		["a null when", { ...EXAMPLE_OBSERVANCES, rules: [{ id: "r", englishName: "R", when: null }] }],
	])("rejects %s with a coded error", (_label, config) => {
		expect(codeOf(config)).toBe(CONFIG_CODE);
	});

	// The removed model: a rule carrying `kind`, `tier`, `source` or `name` is the old shape, and a
	// config from JSON.parse that still has one is refused rather than half-read.
	it.each([
		["kind", { kind: "puja" }],
		["tier", { tier: 1 }],
		["source", { source: "https://example.invalid/" }],
		["name", { name: "R" }],
		["an unknown key", { colour: "red" }],
	])("refuses an unknown key on a rule: %s", (_label, patch) => {
		expect(codeOf(withRule(patch))).toBe(CONFIG_CODE);
	});

	it("refuses an unknown key on the config and on a level", () => {
		expect(codeOf(withRule({}, { extra: 1 }))).toBe(CONFIG_CODE);
		expect(codeOf(withRule({}, { name: "Old name" }))).toBe(CONFIG_CODE);
		expect(codeOf(withRule({}, { levels: [{ id: "lv", englishName: "L", tier: 1 }] }))).toBe(
			CONFIG_CODE,
		);
	});

	it("refuses an unknown key naming the key", () => {
		const error = thrownBy(() => run(withRule({ kind: "puja" })));
		expect(error?.message).toContain('"kind"');
	});

	describe("tags", () => {
		it("accepts distinct non-empty strings", () => {
			expect(() => run(withRule({ tags: ["tsok", "monthly"] }))).not.toThrow();
		});

		it.each([
			["a string in place of the array", "tsok"],
			["an empty array element", ["tsok", ""]],
			["a non-string element", [1]],
			["a repeated element", ["tsok", "tsok"]],
			["null", null],
		])("refuses %s", (_label, tags) => {
			expect(codeOf(withRule({ tags }))).toBe(CONFIG_CODE);
		});
	});

	describe("levels", () => {
		it("accepts a rule with no level and no tags", () => {
			expect(() => run(withRule({}))).not.toThrow();
			expect(() => run(withRule({}, { levels: undefined }))).not.toThrow();
		});

		it("accepts a rule naming a declared level", () => {
			expect(() => run(withRule({ level: "lv" }))).not.toThrow();
		});

		it("refuses an undeclared level, and any level when none is declared", () => {
			expect(codeOf(withRule({ level: "nope" }))).toBe(CONFIG_CODE);
			expect(codeOf(withRule({ level: "lv" }, { levels: undefined }))).toBe(CONFIG_CODE);
		});

		it.each([
			["levels that are not an array", "lv"],
			["a null level", [null]],
			["a level with no id", [{ englishName: "L" }]],
			["a level with no englishName", [{ id: "lv" }]],
			[
				"a repeated level id",
				[
					{ id: "lv", englishName: "L" },
					{ id: "lv", englishName: "M" },
				],
			],
		])("refuses %s", (_label, levels) => {
			expect(codeOf(withRule({}, { levels }))).toBe(CONFIG_CODE);
		});
	});

	describe("tibetanName", () => {
		const name = { tibetan: "ཚོགས་", wylie: "tshogs", phonetic: "tsok" };

		it("accepts the three non-empty strings, on a config, a rule and a level", () => {
			expect(() =>
				run(
					withRule(
						{ tibetanName: name },
						{ tibetanName: name, levels: [{ id: "lv", englishName: "L", tibetanName: name }] },
					),
				),
			).not.toThrow();
		});

		it.each([
			["a string", "ཚོགས་"],
			["a part missing", { tibetan: "ཚོགས་", wylie: "tshogs" }],
			["an empty part", { ...name, phonetic: "" }],
			["a non-string part", { ...name, wylie: 1 }],
			["an unknown key", { ...name, sanskrit: "gaṇacakra" }],
			["null", null],
		])("refuses %s", (_label, tibetanName) => {
			expect(codeOf(withRule({ tibetanName }))).toBe(CONFIG_CODE);
		});
	});

	/**
	 * The test the hand-written lists could not be: every rejection carries the code.
	 *
	 * A list of calls known to be coded — which is what `test/public-api.test.ts` walks — can only
	 * confirm the paths someone already thought of. Dropping and nulling each field in turn is what
	 * finds the path nobody did, and it is how the null-config and missing-`when` holes above would
	 * have surfaced without an external reviewer probing for them.
	 */
	it("codes every rejection, over every dropped and nulled field", () => {
		const uncoded: string[] = [];
		const topLevel = Object.keys(EXAMPLE_OBSERVANCES);
		const ruleFields = Object.keys(EXAMPLE_OBSERVANCES.rules[0] as object);

		for (const field of topLevel) {
			for (const mutation of ["drop", "null"] as const) {
				const config = { ...EXAMPLE_OBSERVANCES, id: `mutant-${field}-${mutation}` } as Record<
					string,
					unknown
				>;
				if (mutation === "drop") delete config[field];
				else config[field] = null;

				const error = thrownBy(() => run(config));
				if (error !== undefined && error.code !== CONFIG_CODE) {
					uncoded.push(`config.${field} ${mutation}: ${error.name} code=${error.code}`);
				}
			}
		}

		for (const field of ruleFields) {
			for (const mutation of ["drop", "null"] as const) {
				const rule = { ...(EXAMPLE_OBSERVANCES.rules[0] as object) } as Record<string, unknown>;
				if (mutation === "drop") delete rule[field];
				else rule[field] = null;
				const config = {
					...EXAMPLE_OBSERVANCES,
					id: `mutant-rule-${field}-${mutation}`,
					rules: [rule],
				};

				const error = thrownBy(() => run(config));
				if (error !== undefined && error.code !== CONFIG_CODE) {
					uncoded.push(`rule.${field} ${mutation}: ${error.name} code=${error.code}`);
				}
			}
		}

		expect(uncoded).toEqual([]);
	});
});
