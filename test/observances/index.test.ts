import { describe, expect, it } from "vitest";
import { isoToTibetan, losarFor, tibetanDateExists } from "../../src/computation/conversion.js";
import { daysInMonth } from "../../src/months.js";
import {
	composeObservances,
	EXAMPLE_OBSERVANCES,
	getObservances,
	observancesOn,
} from "../../src/observances/index.js";
import type { Observance, ObservanceConfig, ObservanceRule } from "../../src/observances/types.js";
import { BHUTAN } from "../../src/traditions/bhutan.js";
import { PHUGPA } from "../../src/traditions/phugpa.js";
import {
	getObservancesChunked,
	OBSERVANCE_SPAN_CAP_YEARS,
} from "../support/observances-chunked.js";
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
		// "dayBeforeSkipped" is absent from the shipped config by design: the four great days
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

	// Within a day, results follow the order of the rules in the config: a contract, so a consumer
	// listing a day shows what the config's author put first. It was by rule id (code unit) until
	// 2026-11-14, which put "medicine-buddha" before "saga-dawa-duchen" on the great day.
	describe("results on one day follow the order of the rules in the config", () => {
		const idsOn = (day: string, config: ObservanceConfig) =>
			observancesOn(iso(day), config).map((o) => o.rule.id);

		it("puts the Saga Dawa Düchen, the month and Medicine Buddha in config order on 2026-05-31", () => {
			const order = EXAMPLE_OBSERVANCES.rules.map((rule) => rule.id);
			expect(
				["saga-dawa-duchen", "saga-dawa-month", "medicine-buddha"].map((id) => order.indexOf(id)),
			).toEqual([1, 11, 14]);
			expect(idsOn("2026-05-31", EXAMPLE_OBSERVANCES)).toEqual([
				"saga-dawa-duchen",
				"saga-dawa-month",
				"medicine-buddha",
			]);
		});

		it("puts Chötrul Düchen, sojong, the fire puja and Medicine Buddha in config order on 2026-03-03", () => {
			expect(idsOn("2026-03-03", EXAMPLE_OBSERVANCES)).toEqual([
				"chotrul-duchen",
				"sojong",
				"fire-puja",
				"medicine-buddha",
			]);
		});

		it("follows a config whose id order is the reverse of its rule order, in a range as in a day", () => {
			const rule = (id: string) => ({
				id,
				englishName: id,
				when: { type: "monthly" as const, days: [15] },
			});
			// Deliberately mixed case and an accent: neither collation nor code-unit order matters now.
			const ids = ["Zebra", "guru-rinpoché", "guru-rinpoche", "apple"];
			const config = { ...EXAMPLE_OBSERVANCES, id: "order", rules: ids.map(rule) };
			const byDay = new Map<string, string[]>();
			for (const o of getObservances(iso("2026-05-01"), iso("2026-05-31"), config)) {
				const key = o.date.isoDate.toString();
				byDay.set(key, [...(byDay.get(key) ?? []), o.rule.id]);
			}
			expect(byDay.size).toBeGreaterThan(0);
			for (const found of byDay.values()) expect(found).toEqual(ids);
			const reversed = { ...config, id: "reversed", rules: [...config.rules].reverse() };
			expect(idsOn([...byDay.keys()][0] as string, reversed)).toEqual([...ids].reverse());
		});

		it("keeps a composed config's order: a removed rule drops out, a replaced one stays, an added one follows", () => {
			const composed = composeObservances(EXAMPLE_OBSERVANCES, {
				id: "composed",
				englishName: "Composed",
				remove: ["sojong"],
				replace: [
					{
						id: "medicine-buddha",
						englishName: "Medicine Buddha, replaced",
						when: { type: "monthly", days: [8, 15] },
					},
				],
				add: [
					{
						id: "zz-added-first",
						englishName: "Added first",
						when: { type: "monthly", days: [8, 15] },
					},
					{
						id: "aa-added-second",
						englishName: "Added second",
						when: { type: "monthly", days: [8, 15] },
					},
				],
			});
			expect(idsOn("2026-03-03", composed)).toEqual([
				"chotrul-duchen",
				"fire-puja",
				"medicine-buddha",
				"zz-added-first",
				"aa-added-second",
			]);
			expect(idsOn("2026-03-26", composed)).toEqual([
				"medicine-buddha",
				"tara",
				"zz-added-first",
				"aa-added-second",
			]);
		});
	});

	// Cost is linear in the span and the per-month work is real, so an unbounded query is minutes
	// of synchronous CPU -- Temporal.PlainDate spans about 547,000 years.
	it("caps the span, and admits exactly 10 years", () => {
		const span = (a: string, b: string) => () =>
			getObservances(iso(a), iso(b), EXAMPLE_OBSERVANCES);
		expect(span("2020-01-01", "2030-12-31")).not.toThrow();
		expect(thrownBy(span("2020-01-01", "2031-01-01"))?.code).toBe("TCT_SPAN_TOO_WIDE");
		expect(thrownBy(span("0001-01-01", "9999-12-31"))?.code).toBe("TCT_SPAN_TOO_WIDE");
	});

	// The chunking helper takes its chunk size from a copy of the cap, so the copy is held to the
	// real thing here: a chunk of that size is admitted and one year more is refused.
	it("matches the chunking helper's copy of the cap", () => {
		const n = OBSERVANCE_SPAN_CAP_YEARS;
		const span = (years: number) => () =>
			getObservances(iso("2020-01-01"), iso(`${2020 + years}-12-31`), EXAMPLE_OBSERVANCES);
		expect(span(n)).not.toThrow();
		expect(thrownBy(span(n + 1))?.code).toBe("TCT_SPAN_TOO_WIDE");
	});

	// The bug this task fixed: `to.year - from.year` was compared before anything normalised the
	// arguments, so a string has no numeric `.year` and `NaN > 10` is `false`. A string range over
	// the cap used to return thousands of observances silently instead of throwing.
	it("still catches the span cap when the range is given as strings", () => {
		const range = (to: string) => () =>
			getObservances(
				"2020-01-01" as unknown as Temporal.PlainDate,
				to as unknown as Temporal.PlainDate,
				EXAMPLE_OBSERVANCES,
			);
		expect(range("2030-12-31")).not.toThrow();
		expect(thrownBy(range("2031-01-01"))?.code).toBe("TCT_SPAN_TOO_WIDE");
		expect(thrownBy(range("1900-01-01"))?.code).toBeUndefined();
	});

	it("still catches the span cap when the range is given as PlainDateTimes", () => {
		const range = (to: string) => () =>
			getObservances(
				Temporal.PlainDateTime.from("2020-01-01T00:00:00") as unknown as Temporal.PlainDate,
				Temporal.PlainDateTime.from(`${to}T00:00:00`) as unknown as Temporal.PlainDate,
				EXAMPLE_OBSERVANCES,
			);
		expect(range("2030-12-31")).not.toThrow();
		expect(thrownBy(range("2031-01-01"))?.code).toBe("TCT_SPAN_TOO_WIDE");
	});

	// A day belongs to exactly one chunk, so the chunked result is what one wide call returns. The
	// wide call is not available past the cap, so the reference is the same range cut at odd, unequal
	// places -- through a doubled half and a shifted day -- which is the property the helper rests on:
	// the function is pure and restarts per call.
	it("gives the same result chunked as cut anywhere else, with no day lost or repeated", () => {
		const config = { ...EXAMPLE_OBSERVANCES, doubledDay: "both" as const };
		const cuts = [
			"2007-03-05",
			"2007-03-06",
			"2011-07-10",
			"2011-07-11",
			"2019-02-28",
			"2025-05-05",
		];
		const edges = ["1999-06-01", ...cuts, "2031-09-17"];
		const reference: ReturnType<typeof getObservances> = [];
		for (let i = 0; i < edges.length - 1; i++) {
			const start = iso(edges[i] as string).add({ days: i === 0 ? 0 : 1 });
			reference.push(...getObservances(start, iso(edges[i + 1] as string), config));
		}
		const chunked = getObservancesChunked(iso("1999-06-01"), iso("2031-09-17"), config);
		const key = (o: (typeof chunked)[number]) =>
			`${o.rule.id} ${o.date.isoDate.toString()} ${o.resolution}`;
		expect(chunked.map(key)).toEqual(reference.map(key));
		expect(new Set(chunked.map(key)).size).toBe(chunked.length);
		expect(chunked.some((o) => o.resolution === "firstOfDoubled")).toBe(true);
		expect(getObservancesChunked(iso("2026-01-02"), iso("2026-01-01"), config)).toEqual([]);
	}, 30_000);
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
			(o) => o.resolution === "dayBeforeSkipped",
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
		expect([...resolutions].sort()).toEqual(["dayBeforeSkipped", "exact", "secondOfDoubled"]);
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
		for (const o of getObservancesChunked(
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
		const sojong = EXAMPLE_OBSERVANCES.rules.find((r) => r.id === "sojong");
		const when = sojong?.when;
		if (when?.type !== "counted") throw new Error("sojong is not counted");
		const shape = {
			levels: EXAMPLE_OBSERVANCES.levels,
			level: EXAMPLE_OBSERVANCES.levels?.[0],
			tags: EXAMPLE_OBSERVANCES.rules.find((r) => r.id === "chotrul-duchen")?.tags,
			tibetanName: EXAMPLE_OBSERVANCES.rules.find((r) => r.id === "chotrul-duchen")?.tibetanName,
			anchor: when.anchor,
			waningDays: when.waningDays,
			exclude: when.exclude,
			excluded: when.exclude?.[0],
		};
		for (const [name, value] of Object.entries(shape)) {
			expect([name, typeof value, Object.isFrozen(value)]).toEqual([name, "object", true]);
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

	it("refuses a TraditionConfig where the config belongs", () => {
		for (const tradition of [PHUGPA, BHUTAN]) {
			expect(thrownBy(() => run(tradition))?.code).toBe(CONFIG_CODE);
		}
	});

	it("refuses the old { config } bag in the config position", () => {
		expect(thrownBy(() => run({ config: EXAMPLE_OBSERVANCES }))?.code).toBe(CONFIG_CODE);
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

	it("rejects repeated annual dates, naming the repeat", () => {
		const error = thrownBy(() =>
			run(
				withWhen({
					type: "annual",
					dates: [
						{ month: 1, day: 15 },
						{ month: 1, day: 15 },
					],
				}),
			),
		);
		expect(error?.code).toBe(CONFIG_CODE);
		expect(error?.message).toContain("when.dates repeats month 1 day 15");
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

	// A setting a form cannot use is refused rather than silently ignored: a monthly rule has no
	// month, so a leapMonth on it would be read by nothing and look as if it had been honoured.
	describe("a per-rule setting the form cannot use", () => {
		it("refuses leapMonth on a monthly rule", () => {
			expect(codeOf(withRule({ leapMonth: "leap" }))).toBe(CONFIG_CODE);
		});

		it("names the setting and the form", () => {
			const error = thrownBy(() => run(withRule({ leapMonth: "leap" })));
			expect(error?.message).toContain("leapMonth");
			expect(error?.message).toContain("monthly");
		});

		it("checks the value before the applicability", () => {
			expect(thrownBy(() => run(withRule({ leapMonth: "bogus" })))?.message).toContain(
				"leapMonth must be one of",
			);
			expect(thrownBy(() => run(withRule({ leapMonth: 7 })))?.message).toContain(
				"leapMonth must be one of",
			);
		});

		it("accepts the three settings an annual rule can use", () => {
			const when = { type: "annual", dates: [{ month: 6, day: 4 }] };
			for (const rule of [
				{ doubledDay: "first" },
				{ skippedDay: "omit" },
				{ leapMonth: "regular" },
			]) {
				expect(() => run(withRule({ when, ...rule }))).not.toThrow();
			}
		});

		it("accepts doubledDay and skippedDay on a monthly rule", () => {
			expect(() => run(withRule({ doubledDay: "first", skippedDay: "omit" }))).not.toThrow();
		});

		it("never refuses a config-level default", () => {
			expect(() => run(withRule({}, { leapMonth: "both" }))).not.toThrow();
		});
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

// "following" is the calendar day after the one carrying day d-1, taken by Julian day. Not the day
// carrying d+1: when d+1 is doubled that would pick its second half, and the first is the day after.
describe('skippedDay: "following"', () => {
	const following = (days: readonly number[]): ObservanceConfig => ({
		...EXAMPLE_OBSERVANCES,
		id: "following",
		skippedDay: "following",
		rules: [
			{
				id: "day-rule",
				englishName: "Day rule",
				when: { type: "monthly", days },
			},
		],
	});

	// Tibetan 2151 (2025 CE) month 12 has no 30th: day 29 is 2025-02-27 and Losar is the next day.
	it("rolls a skipped 30 into the first day of the next month", () => {
		const found = getObservances(iso("2025-02-26"), iso("2025-03-01"), following([30]));
		expect(found.map((o) => [o.date.isoDate.toString(), o.resolution])).toEqual([
			["2025-02-28", "dayAfterSkipped"],
		]);
		const landed = isoToTibetan(iso("2025-02-28"));
		expect({ month: landed.month, day: landed.day }).toEqual({ month: 1, day: 1 });
	});

	// Tibetan 2123 (1996 CE) month 10: day 15 is skipped and 16 is doubled, on 1996-11-25 and 26.
	it("lands on the first half of a doubled day that follows the skipped one", () => {
		const first = isoToTibetan(iso("1996-11-25"));
		const second = isoToTibetan(iso("1996-11-26"));
		expect([first.day, second.day]).toEqual([16, 16]);
		expect(isoToTibetan(iso("1996-11-24")).day).toBe(14);

		const found = getObservances(iso("1996-11-20"), iso("1996-11-30"), following([15]));
		expect(found.map((o) => [o.date.isoDate.toString(), o.resolution])).toEqual([
			["1996-11-25", "dayAfterSkipped"],
		]);
	});

	it("lands on the day after day d-1 for every skipped-then-doubled pair, 1950-2050", () => {
		const cases: Array<[string, number]> = [
			["1956-08-14", 7],
			["1965-01-25", 22],
			["1984-09-06", 10],
			["1996-11-26", 15],
			["2029-05-06", 22],
			["2037-04-07", 21],
			["2046-05-24", 18],
		];
		const bad: string[] = [];
		for (const [secondHalf, skipped] of cases) {
			const day = Temporal.PlainDate.from(secondHalf);
			const found = getObservances(
				day.subtract({ days: 6 }),
				day.add({ days: 6 }),
				following([skipped]),
			);
			const landed = found.map((o) => o.date.isoDate.toString());
			const expected = day.subtract({ days: 1 }).toString();
			if (landed.length !== 1 || landed[0] !== expected) bad.push(`${secondHalf}: ${landed}`);
		}
		expect(bad).toEqual([]);
	});

	it("reports a skipped day as omitted under a rule override of omit", () => {
		const config = following([30]);
		const rule = { ...config.rules[0], skippedDay: "omit" as const } as ObservanceRule;
		expect(
			getObservances(iso("2025-02-26"), iso("2025-03-01"), { ...config, rules: [rule] }),
		).toEqual([]);
	});
});

describe("the western form, year windows and ages", () => {
	const CODE = "TCT_INVALID_OBSERVANCE_CONFIG";
	const configWith = (rule: Record<string, unknown>): ObservanceConfig =>
		({
			...EXAMPLE_OBSERVANCES,
			id: "years",
			rules: [{ id: "r", englishName: "R", ...rule }],
		}) as unknown as ObservanceConfig;
	const western = (fields: Record<string, unknown>, rule: Record<string, unknown> = {}) =>
		configWith({ when: { type: "western", ...fields }, ...rule });
	const annual = (fields: Record<string, unknown>) =>
		configWith({ when: { type: "annual", dates: [{ month: 12, day: 14 }], ...fields } });
	const on = (day: string, config: ObservanceConfig) => observancesOn(iso(day), config);
	const codeOf = (config: ObservanceConfig) =>
		thrownBy(() => getObservances(iso("2026-01-01"), iso("2026-01-02"), config))?.code;

	it("lands a western rule on its Gregorian date, exact, with a Tibetan date", () => {
		const found = on("2026-07-06", western({ month: 7, day: 6 }));
		expect(found.map((o) => [o.resolution, o.date.isoDate.toString()])).toEqual([
			["exact", "2026-07-06"],
		]);
		expect(found[0]?.date.year).toBe(isoToTibetan(iso("2026-07-06")).year);
		expect(on("2026-07-07", western({ month: 7, day: 6 }))).toEqual([]);
	});

	it("honours fromYear: absent in 2019, present in 2024", () => {
		const config = western({ month: 4, day: 13, fromYear: 2024 });
		expect(on("2019-04-13", config)).toEqual([]);
		expect(on("2024-04-13", config)).toHaveLength(1);
	});

	it("honours untilYear inclusively: present in 2025, absent in 2026", () => {
		const config = western({ month: 12, day: 3, untilYear: 2025 });
		expect(on("2025-12-03", config)).toHaveLength(1);
		expect(on("2026-12-03", config)).toEqual([]);
	});

	it("is unbounded without a window: present in 1950 and 2100", () => {
		const config = western({ month: 4, day: 13 });
		expect(on("1950-04-13", config)).toHaveLength(1);
		expect(on("2100-04-13", config)).toHaveLength(1);
	});

	it("gives age 90 on 2025-07-06 for ageFromYear 1935, and none on 1934-07-06", () => {
		const config = western({ month: 7, day: 6, ageFromYear: 1935 });
		expect(on("2025-07-06", config)[0]?.age).toBe(90);
		expect(on("1935-07-06", config)[0]?.age).toBe(0);
		const before = on("1934-07-06", config);
		expect(before).toHaveLength(1);
		expect("age" in (before[0] as object)).toBe(false);
	});

	it("carries no age when no ageFromYear is given", () => {
		expect("age" in (on("2026-07-06", western({ month: 7, day: 6 }))[0] as object)).toBe(false);
	});

	it("puts 29 February in leap years only, and does not shift it", () => {
		const config = western({ month: 2, day: 29 });
		expect(on("2024-02-29", config)).toHaveLength(1);
		const year = getObservances(iso("2025-01-01"), iso("2025-12-31"), config);
		expect(year).toEqual([]);
	});

	it.each([
		["30 February", { month: 2, day: 30 }],
		["31 April", { month: 4, day: 31 }],
		["month 13", { month: 13, day: 1 }],
		["month 0", { month: 0, day: 1 }],
		["day 0", { month: 1, day: 0 }],
		["a fractional day", { month: 1, day: 1.5 }],
		["a missing day", { month: 1 }],
		["a missing month", { day: 1 }],
	])("refuses %s on a western rule", (_label, fields) => {
		expect(codeOf(western(fields))).toBe(CODE);
	});

	it("refuses a key a western form does not have", () => {
		expect(codeOf(western({ month: 7, day: 6, days: [1] }))).toBe(CODE);
		expect(codeOf(western({ month: 7, day: 6, isLeapMonth: true }))).toBe(CODE);
	});

	it("refuses fromYear after untilYear, and accepts them equal", () => {
		expect(codeOf(western({ month: 7, day: 6, fromYear: 2026, untilYear: 2025 }))).toBe(CODE);
		expect(codeOf(annual({ fromYear: 2153, untilYear: 2152 }))).toBe(CODE);
		expect(codeOf(western({ month: 7, day: 6, fromYear: 2025, untilYear: 2025 }))).toBeUndefined();
	});

	it.each(["fromYear", "untilYear", "ageFromYear"])("refuses a non-integer %s", (field) => {
		for (const bad of [2024.5, "2024", Number.NaN, Number.POSITIVE_INFINITY, null, 2 ** 53]) {
			expect(codeOf(western({ month: 7, day: 6, [field]: bad }))).toBe(CODE);
			expect(codeOf(annual({ [field]: bad }))).toBe(CODE);
		}
	});

	it.each(["doubledDay", "skippedDay", "leapMonth"])("refuses %s on a western rule", (setting) => {
		const value = setting === "doubledDay" ? "first" : setting === "skippedDay" ? "omit" : "leap";
		expect(codeOf(western({ month: 7, day: 6 }, { [setting]: value }))).toBe(CODE);
	});

	// 2026-01-31 is Tibetan 2152 month 12 day 14 (Tibetan 2153 begins 2026-02-18), so this
	// occurrence's Tibetan year (2152) and Western year (2026) differ. A window that read the
	// Western year would emit it for untilYear 2151 and keep emitting it in 2027.
	describe("an annual window tests the Tibetan year (2026-01-31 is Tibetan 2152, month 12 day 14)", () => {
		const found = (from: string, to: string, fields: Record<string, unknown>) =>
			getObservances(iso(from), iso(to), annual(fields)).map((o) => o.date.isoDate.toString());

		it("is Tibetan 2152 on 2026-01-31, in Western 2026", () => {
			const date = isoToTibetan(iso("2026-01-31"));
			expect([date.year, date.month, date.day]).toEqual([2152, 12, 14]);
		});

		it("emits it with untilYear 2152", () => {
			expect(found("2026-01-01", "2026-03-01", { untilYear: 2152 })).toEqual(["2026-01-31"]);
		});

		it("does not emit it with untilYear 2151", () => {
			expect(found("2026-01-01", "2026-03-01", { untilYear: 2151 })).toEqual([]);
		});

		it("does not emit the following Tibetan year (2153) with untilYear 2152", () => {
			expect(found("2027-01-01", "2027-03-31", { untilYear: 2152 })).toEqual([]);
		});

		it("emits it from fromYear 2152 and not from 2153", () => {
			expect(found("2026-01-01", "2026-03-01", { fromYear: 2152 })).toEqual(["2026-01-31"]);
			expect(found("2026-01-01", "2026-03-01", { fromYear: 2153 })).toEqual([]);
		});
	});

	it("counts an annual ageFromYear in Tibetan years, pinned by value", () => {
		const config = annual({ ageFromYear: 2100 });
		expect(on("2026-01-31", config)[0]?.age).toBe(52);
		expect(on("2026-01-31", annual({ ageFromYear: 2026 }))[0]?.age).toBe(126);
	});
});

// A skipped first or last day of the year shifts the occurrence over the new year: Tibetan 2273's
// day 1 is skipped (Losar fell on 2146-02-12, the 11th being the last day of 2272), and Tibetan
// 2151's 12/30 is skipped, so "following" lands it on the first day of 2152. The occurrence still
// stands for the year whose 1/1 or 12/30 it is, and that year governs the window and the age.
describe("an annual date shifted across the Tibetan new year", () => {
	const annual = (
		date: { month: number; day: number },
		skippedDay: "preceding" | "following",
		fields: Record<string, unknown>,
	): ObservanceConfig =>
		({
			...EXAMPLE_OBSERVANCES,
			id: "shifted",
			skippedDay,
			rules: [{ id: "r", englishName: "R", when: { type: "annual", dates: [date], ...fields } }],
		}) as unknown as ObservanceConfig;
	const found = (from: string, to: string, config: ObservanceConfig) =>
		getObservances(iso(from), iso(to), config).map(
			(o) => `${o.date.isoDate.toString()} ${o.resolution} ${o.age}`,
		);

	it("sets the scene: 2273's day 1 is skipped and the day before it is Tibetan 2272's", () => {
		expect(tibetanDateExists({ year: 2273, month: 1, day: 1 })).toBe(false);
		const before = isoToTibetan(iso("2146-02-11"));
		expect([before.year, before.month, before.day]).toEqual([2272, 12, 30]);
		expect(isoToTibetan(iso("2146-02-12")).year).toBe(2273);
	});

	it("counts a shifted 1/1 as the year it stands for: ages 2, 3 and 4, not 2, 2 and 4", () => {
		const config = annual({ month: 1, day: 1 }, "preceding", { ageFromYear: 2270 });
		expect(found("2145-01-01", "2147-12-31", config)).toEqual([
			"2145-02-22 exact 2",
			"2146-02-11 dayBeforeSkipped 3",
			"2147-03-03 exact 4",
		]);
	});

	it("takes it into a fromYear window by the year it stands for", () => {
		const emitted = (fromYear: number) =>
			found("2146-01-01", "2146-12-31", annual({ month: 1, day: 1 }, "preceding", { fromYear }));
		expect(emitted(2273)).toEqual(["2146-02-11 dayBeforeSkipped undefined"]);
		expect(emitted(2274)).toEqual([]);
	});

	it("takes it out of an untilYear window by the year it stands for", () => {
		const emitted = (untilYear: number) =>
			found("2146-01-01", "2146-12-31", annual({ month: 1, day: 1 }, "preceding", { untilYear }));
		expect(emitted(2272)).toEqual([]);
		expect(emitted(2273)).toEqual(["2146-02-11 dayBeforeSkipped undefined"]);
	});

	it("keeps the last occurrence of a window ending the year it stands for, though it lands in the next", () => {
		// Tibetan 2151's 12/30 is skipped and 'following' lands it on the first day of Tibetan 2152.
		const config = annual({ month: 12, day: 30 }, "following", { untilYear: 2151 });
		expect(found("2024-01-01", "2026-03-31", config)).toEqual([
			"2024-02-09 exact undefined",
			"2025-02-28 dayAfterSkipped undefined",
		]);
		const landed = isoToTibetan(iso("2025-02-28"));
		expect([landed.year, landed.month, landed.day]).toEqual([2152, 1, 1]);
	});

	it("drops an occurrence the window ends before, though it lands inside the window", () => {
		// 2152's 12/30 stands for 2152; with untilYear 2151 it is out, wherever it lands.
		const config = annual({ month: 12, day: 30 }, "following", { untilYear: 2151 });
		expect(found("2025-03-01", "2026-03-31", config)).toEqual([]);
	});
});

describe("the period form", () => {
	const CODE = "TCT_INVALID_OBSERVANCE_CONFIG";
	const configWith = (rule: Record<string, unknown>): ObservanceConfig =>
		({
			...EXAMPLE_OBSERVANCES,
			id: "periods",
			rules: [{ id: "p", englishName: "P", ...rule }],
		}) as unknown as ObservanceConfig;
	const period = (first: unknown, last: unknown, rule: Record<string, unknown> = {}) =>
		configWith({ when: { type: "period", first, last }, ...rule });
	const isoDays = (from: string, to: string, config: ObservanceConfig) =>
		getObservances(iso(from), iso(to), config);
	const isoList = (found: ReturnType<typeof getObservances>) =>
		found.map((o) => o.date.isoDate.toString());
	const codeOf = (config: ObservanceConfig) =>
		thrownBy(() => getObservances(iso("2026-01-01"), iso("2026-01-02"), config))?.code;
	const spanOf = (found: ReturnType<typeof getObservances>) => {
		const first = found[0]?.period;
		return first === undefined
			? undefined
			: [first.first.isoDate.toString(), first.last.isoDate.toString()];
	};

	it("gives one result per calendar day of Saga Dawa 2026 (Tibetan 2153, month 4)", () => {
		const found = isoDays(
			"2026-05-01",
			"2026-07-31",
			period({ month: 4, day: 1 }, { month: 4, day: 30 }),
		);
		const length = daysInMonth({ year: 2153, month: 4 });
		expect(length).toBe(30);
		expect(found).toHaveLength(length);
		expect(isoList(found)[0]).toBe("2026-05-17");
		expect(isoList(found)[length - 1]).toBe("2026-06-15");
		expect(new Set(found.map((o) => o.resolution))).toEqual(new Set(["inPeriod"]));
		for (const o of found) {
			expect(o.period?.first.isoDate.toString()).toBe("2026-05-17");
			expect(o.period?.last.isoDate.toString()).toBe("2026-06-15");
		}
	});

	it("is a membership test: a doubled number contributes both days, a skipped one none", () => {
		// 2153 month 2 runs 2026-03-19 to 04-17; its 12 is skipped and its 17 is doubled.
		const found = isoDays(
			"2026-03-01",
			"2026-04-30",
			period({ month: 2, day: 10 }, { month: 2, day: 20 }),
		);
		expect(isoList(found)).toEqual([
			"2026-03-28",
			"2026-03-29",
			"2026-03-30",
			"2026-03-31",
			"2026-04-01",
			"2026-04-02",
			"2026-04-03",
			"2026-04-04",
			"2026-04-05",
			"2026-04-06",
			"2026-04-07",
		]);
		expect(found.map((o) => o.date.day)).toEqual([10, 11, 13, 14, 15, 16, 17, 17, 18, 19, 20]);
		expect(spanOf(found)).toEqual(["2026-03-28", "2026-04-07"]);
	});

	it("finds nothing for a one-day period whose only number is skipped", () => {
		// 2153 month 2's 12 is skipped. Its neighbour 11 is the control: the same shape finds one day.
		const one = (day: number) =>
			isoList(isoDays("2026-03-01", "2026-04-30", period({ month: 2, day }, { month: 2, day })));
		expect(one(11)).toEqual(["2026-03-29"]);
		expect(one(12)).toEqual([]);
	});

	it("lets a skipped endpoint number bound the span, and takes both halves of a doubled one", () => {
		const skipped = isoDays(
			"2026-03-01",
			"2026-04-30",
			period({ month: 2, day: 12 }, { month: 2, day: 14 }),
		);
		expect(isoList(skipped)).toEqual(["2026-03-30", "2026-03-31"]);
		expect(spanOf(skipped)).toEqual(["2026-03-30", "2026-03-31"]);
		const doubled = isoDays(
			"2026-03-01",
			"2026-04-30",
			period({ month: 2, day: 17 }, { month: 2, day: 17 }),
		);
		expect(isoList(doubled)).toEqual(["2026-04-03", "2026-04-04"]);
		expect(spanOf(doubled)).toEqual(["2026-04-03", "2026-04-04"]);
	});

	it("never consults the config's doubledDay or skippedDay", () => {
		const config = {
			...period({ month: 2, day: 10 }, { month: 2, day: 20 }),
			doubledDay: "first" as const,
			skippedDay: "omit" as const,
		};
		expect(isoDays("2026-03-01", "2026-04-30", config)).toHaveLength(11);
	});

	describe("over a leap month (2154 has leap month 2: 2027-03-09 to 04-06, then 04-07 to 05-06)", () => {
		const whole = (leapMonth: string) =>
			period({ month: 2, day: 1 }, { month: 2, day: 30 }, { leapMonth });
		const run = (leapMonth: string) => {
			const found = isoDays("2027-02-01", "2027-06-30", whole(leapMonth));
			return [isoList(found)[0], isoList(found).at(-1), found.length, spanOf(found)];
		};

		it("covers the leap month alone under leap", () => {
			expect(run("leap")).toEqual(["2027-03-09", "2027-04-06", 29, ["2027-03-09", "2027-04-06"]]);
		});

		it("covers the regular month alone under regular", () => {
			expect(run("regular")).toEqual([
				"2027-04-07",
				"2027-05-06",
				30,
				["2027-04-07", "2027-05-06"],
			]);
		});

		it("covers both under both, first from the earlier twin and last from the later", () => {
			expect(run("both")).toEqual(["2027-03-09", "2027-05-06", 59, ["2027-03-09", "2027-05-06"]]);
		});

		it("takes the config's leapMonth when the rule sets none", () => {
			const config = {
				...period({ month: 2, day: 1 }, { month: 2, day: 30 }),
				leapMonth: "regular" as const,
			};
			expect(isoList(isoDays("2027-02-01", "2027-06-30", config))[0]).toBe("2027-04-07");
		});

		it("runs through the twin between a leap start and a later month", () => {
			const found = isoDays(
				"2027-02-01",
				"2027-06-30",
				period({ month: 2, day: 25 }, { month: 3, day: 3 }, { leapMonth: "leap" }),
			);
			expect(isoList(found)[0]).toBe("2027-04-01");
			expect(isoList(found).at(-1)).toBe("2027-05-09");
			expect(spanOf(found)).toEqual(["2027-04-01", "2027-05-09"]);
		});
	});

	it("keeps the whole span's bounds when the query cuts into it", () => {
		const found = isoDays(
			"2026-06-01",
			"2026-06-02",
			period({ month: 4, day: 1 }, { month: 4, day: 30 }),
		);
		expect(isoList(found)).toEqual(["2026-06-01", "2026-06-02"]);
		expect(spanOf(found)).toEqual(["2026-05-17", "2026-06-15"]);
	});

	it("does not carry a period on the other forms", () => {
		const found = observancesOn(iso("2024-07-10"), EXAMPLE_OBSERVANCES);
		expect(found.every((o) => !("period" in o))).toBe(true);
	});

	it.each([
		["first after last by day", { month: 4, day: 20 }, { month: 4, day: 10 }],
		["first after last by month", { month: 5, day: 1 }, { month: 4, day: 30 }],
		["a span across the new year", { month: 12, day: 20 }, { month: 1, day: 5 }],
		["month 13", { month: 13, day: 1 }, { month: 13, day: 2 }],
		["day 31", { month: 4, day: 1 }, { month: 4, day: 31 }],
		["day 0", { month: 4, day: 0 }, { month: 4, day: 5 }],
		["a missing last", { month: 4, day: 1 }, undefined],
		["a missing first", undefined, { month: 4, day: 1 }],
		["an unknown key on first", { month: 4, day: 1, isLeapMonth: true }, { month: 4, day: 2 }],
		["an unknown key on last", { month: 4, day: 1 }, { month: 4, day: 2, isLeapMonth: true }],
	])("refuses %s", (_label, first, last) => {
		expect(codeOf(period(first, last))).toBe(CODE);
	});

	it("accepts first equal to last", () => {
		expect(codeOf(period({ month: 4, day: 5 }, { month: 4, day: 5 }))).toBeUndefined();
	});

	it("refuses an unknown key on a period when", () => {
		expect(
			codeOf(
				configWith({
					when: {
						type: "period",
						first: { month: 4, day: 1 },
						last: { month: 4, day: 2 },
						days: [1],
					},
				}),
			),
		).toBe(CODE);
	});

	it.each([
		["doubledDay", "first"],
		["skippedDay", "omit"],
	])("refuses %s on a period rule", (setting, value) => {
		expect(codeOf(period({ month: 4, day: 1 }, { month: 4, day: 2 }, { [setting]: value }))).toBe(
			CODE,
		);
	});
});

describe("the counted form", () => {
	const SOJONG_WHEN = {
		type: "counted",
		anchor: { month: 1, day: 15 },
		waxingDays: 15,
		waningDays: { oddMonth: 14, evenMonth: 15 },
		exclude: [{ month: 1, day: 1 }],
	};
	const sojongConfig = (
		when: Record<string, unknown> = {},
		rule: Record<string, unknown> = {},
	): ObservanceConfig =>
		({
			...EXAMPLE_OBSERVANCES,
			id: "sojong",
			doubledDay: "first",
			skippedDay: "following",
			leapMonth: "leap",
			rules: [{ id: "s", englishName: "S", when: { ...SOJONG_WHEN, ...when }, ...rule }],
		}) as unknown as ObservanceConfig;
	const codeOf = (config: ObservanceConfig) =>
		thrownBy(() => getObservances(iso("2026-01-01"), iso("2026-01-02"), config))?.code;
	const days = (from: string, to: string, config: ObservanceConfig) =>
		getObservances(iso(from), iso(to), config).map((o) => [
			o.date.isoDate.toString(),
			o.resolution,
		]);

	it("counts 2022 from its anchor on the full moon of month 1, odd and even months stepping 14 and 15", () => {
		// 1/15 of Tibetan 2149 is 2022-03-18, and month 1 is odd, so the first waning step is 14 days.
		// The previous year's count ends on 2022-03-02, 16 days before this anchor, outside the range.
		expect(days("2022-03-10", "2022-06-30", sojongConfig())).toEqual([
			["2022-03-18", "exact"],
			["2022-04-01", "counted"],
			["2022-04-16", "counted"],
			["2022-05-01", "counted"],
			["2022-05-16", "counted"],
			["2022-05-30", "counted"],
			["2022-06-14", "counted"],
			["2022-06-29", "counted"],
		]);
	});

	it("carries no interval, only a date, a rule and a resolution", () => {
		const found = getObservances(iso("2022-03-18"), iso("2022-04-16"), sojongConfig());
		expect(found).toHaveLength(3);
		for (const o of found) expect(Object.keys(o).sort()).toEqual(["date", "resolution", "rule"]);
	});

	it("takes the leap twin of month 1 as the anchor under leapMonth leap, and the regular one under regular", () => {
		// Tibetan 2127 (2000 CE) opens with leap month 1: its full moon is 2000-02-19, the regular
		// month's is 2000-03-20.
		expect(days("2000-02-10", "2000-02-25", sojongConfig())).toEqual([["2000-02-19", "exact"]]);
		// Under "regular" 2000-02-19 is still a sojong, but counted from the previous year's anchor
		// and not an anchor: it is the resolution that tells the two apart.
		expect(days("2000-02-10", "2000-02-25", sojongConfig({}, { leapMonth: "regular" }))).toEqual([
			["2000-02-19", "counted"],
		]);
		expect(days("2000-03-15", "2000-03-25", sojongConfig({}, { leapMonth: "regular" }))).toEqual([
			["2000-03-20", "exact"],
		]);
	});

	it("never drops an anchor, even when exclude names the anchor's own date", () => {
		const config = sojongConfig({ exclude: [{ month: 1, day: 15 }] });
		expect(days("2022-03-18", "2022-03-18", config)).toEqual([["2022-03-18", "exact"]]);
	});

	describe("the next year's anchor decides the days just before it", () => {
		// observancesOn asks a one-day range, whose own next anchor is far off: it must still agree with
		// the same day taken from a long range, which holds the anchor in the middle.
		it("answers a single day exactly as the whole range does, on the two days before an anchor", () => {
			const config = sojongConfig();
			const whole = getObservancesChunked(iso("2001-01-01"), iso("2100-12-31"), config);
			const anchors = whole.filter((o) => o.resolution !== "counted");
			expect(anchors.length).toBeGreaterThan(95);
			const bad: string[] = [];
			for (const anchor of anchors) {
				for (const before of [1, 2, 3]) {
					const day = anchor.date.isoDate.subtract({ days: before });
					const alone = observancesOn(day, config).map((o) => `${o.resolution}`);
					const inRange = whole
						.filter((o) => o.date.isoDate.equals(day))
						.map((o) => `${o.resolution}`);
					if (alone.join() !== inRange.join()) bad.push(`${day}: ${alone} vs ${inRange}`);
				}
			}
			expect(bad).toEqual([]);
		}, 30_000);

		// A counted day depends on the next year's anchor, so it is the form most exposed to a cut.
		// Sojong anchors in this range, taken from the rule itself: 2022-03-18, 2024-02-24 and
		// 2027-02-20. The range is cut within two days either side of each, and must come out the same
		// as the helper's own chunking.
		it("gives the same sojong days however the range is cut near an anchor", () => {
			const config = sojongConfig();
			const anchors = getObservances(iso("2020-01-01"), iso("2029-12-31"), config)
				.filter((o) => o.resolution !== "counted")
				.map((o) => o.date.isoDate.toString());
			expect(anchors).toContain("2022-03-18");
			expect(anchors).toContain("2024-02-24");
			expect(anchors).toContain("2027-02-20");
			const cuts = [
				"2022-03-16",
				"2022-03-17",
				"2022-03-18",
				"2022-03-19",
				"2022-03-20",
				"2024-02-22",
				"2024-02-23",
				"2024-02-24",
				"2024-02-25",
				"2024-02-26",
				"2027-02-18",
				"2027-02-19",
				"2027-02-20",
				"2027-02-21",
				"2027-02-22",
			];
			// Every 31 December as well, so the helper's own chunk edges (each a 1 January) are compared
			// against a cut made by an independent route over a century.
			const first = iso("1999-06-01");
			const last = iso("2101-03-01");
			const yearEnds = Array.from({ length: 102 }, (_, i) => `${1999 + i}-12-31`);
			const edges = [...new Set([...cuts, ...yearEnds])].sort().filter((d) => d < last.toString());
			const reference: Observance[] = [];
			let start = first;
			for (const end of [...edges, last.toString()]) {
				reference.push(...getObservances(start, iso(end), config));
				start = iso(end).add({ days: 1 });
			}
			const key = (o: Observance) => `${o.date.isoDate.toString()} ${o.resolution}`;
			const chunked = getObservancesChunked(first, last, config);
			expect(chunked.map(key)).toEqual(reference.map(key));
			expect(chunked.filter((o) => o.resolution === "counted").length).toBeGreaterThan(200);
		}, 30_000);

		it("reports no sojong on the day before or the two days before an anchor", () => {
			const whole = getObservancesChunked(iso("2001-01-01"), iso("2100-12-31"), sojongConfig());
			const dates = new Set(whole.map((o) => o.date.isoDate.toString()));
			const bad: string[] = [];
			for (const anchor of whole.filter((o) => o.resolution !== "counted")) {
				for (const before of [1, 2]) {
					const day = anchor.date.isoDate.subtract({ days: before }).toString();
					if (dates.has(day)) bad.push(`${day} before ${anchor.date.isoDate}`);
				}
			}
			expect(bad).toEqual([]);
		}, 30_000);
	});

	describe("the exclusion, resolved like the anchor", () => {
		const isoOf = (found: ReturnType<typeof days>) => found.map(([d]) => d);

		// A doubled day 1: Tibetan 2068 (1941 CE) opens on 1941-02-26 and 1941-02-27, both numbered 1,
		// and the Rabten count lands on the first half. No such year is in Rabten's window.
		it.each([
			["first", false],
			["second", true],
			["both", false],
		] as const)(
			"on a doubled day 1 under doubledDay %s drops only the half that setting names (kept: %s)",
			(choice, kept) => {
				const control = days("1941-02-20", "1941-03-05", sojongConfig({ exclude: [] }));
				expect(isoOf(control)).toContain("1941-02-26");
				const found = days("1941-02-20", "1941-03-05", sojongConfig({}, { doubledDay: choice }));
				expect(isoOf(found).includes("1941-02-26")).toBe(kept);
			},
		);

		// SYNTHETIC. No real schedule makes the count land on the first real day of a year whose month 1
		// day 1 is skipped (measured over 1447-2500 CE in all four shipped traditions: docs/testing.md),
		// so this exercises the exclusion path through the public API with a valid but non-Rabten step:
		// evenMonth 13 in place of Rabten's 15. Tibetan 2000 (1873 CE) skips its day 1, so its first
		// real day, numbered 2, is 1873-02-28.
		describe("SYNTHETIC: a count landing on the first real day of a year whose day 1 is skipped", () => {
			const steps = { waningDays: { oddMonth: 14, evenMonth: 13 } };
			const around = (config: ObservanceConfig) => isoOf(days("1873-02-20", "1873-03-10", config));

			it("is a skipped day 1, and the first real day is day 2", () => {
				expect(isoToTibetan(iso("1873-02-28")).day).toBe(2);
				expect(isoToTibetan(iso("1873-02-28")).year).toBe(2000);
				expect(isoToTibetan(iso("1873-02-27")).month).toBe(12);
			});

			it("control: with no exclusion the count lands there", () => {
				expect(around(sojongConfig({ ...steps, exclude: [] }))).toContain("1873-02-28");
			});

			it('drops it under skippedDay "following", where 1/1 resolves to the first real day', () => {
				expect(around(sojongConfig(steps))).not.toContain("1873-02-28");
			});

			it('keeps it under skippedDay "preceding", where 1/1 resolves to the day before', () => {
				expect(around(sojongConfig(steps, { skippedDay: "preceding" }))).toContain("1873-02-28");
			});
		});
	});

	describe("refuses what it cannot count", () => {
		it.each([
			["waxingDays 12", { waxingDays: 12 }],
			["waxingDays 17", { waxingDays: 17 }],
			["waxingDays 14.5", { waxingDays: 14.5 }],
			["waxingDays a string", { waxingDays: "15" }],
			["waxingDays missing", { waxingDays: undefined }],
			["oddMonth 12", { waningDays: { oddMonth: 12, evenMonth: 15 } }],
			["evenMonth 17", { waningDays: { oddMonth: 14, evenMonth: 17 } }],
			["evenMonth missing", { waningDays: { oddMonth: 14 } }],
			["waningDays missing", { waningDays: undefined }],
			["waningDays an array", { waningDays: [14, 15] }],
			["anchor missing", { anchor: undefined }],
			["anchor day 31", { anchor: { month: 1, day: 31 } }],
			["anchor month 13", { anchor: { month: 13, day: 1 } }],
			["exclude not an array", { exclude: { month: 1, day: 1 } }],
			["an exclude entry with month 0", { exclude: [{ month: 0, day: 1 }] }],
			["an exclude entry that is not an object", { exclude: [1] }],
			["an unknown key on anchor", { anchor: { month: 1, day: 15, isLeapMonth: true } }],
			[
				"an unknown key on an exclude entry",
				{ exclude: [{ month: 1, day: 1, isLeapMonth: true }] },
			],
			["an unknown key on waningDays", { waningDays: { oddMonth: 14, evenMonth: 15, both: 14 } }],
			["an unknown key on the when", { interval: 14 }],
		])("%s", (_label, patch) => {
			expect(codeOf(sojongConfig(patch))).toBe(CONFIG_CODE);
		});

		it("accepts a step of exactly 13 and exactly 16, an empty exclude and no exclude", () => {
			expect(
				codeOf(sojongConfig({ waxingDays: 13, waningDays: { oddMonth: 13, evenMonth: 16 } })),
			).toBe(undefined);
			expect(codeOf(sojongConfig({ exclude: [] }))).toBe(undefined);
			expect(codeOf(sojongConfig({ exclude: undefined }))).toBe(undefined);
		});

		it("accepts doubledDay and leapMonth on the rule, which apply to the anchor and the exclusions", () => {
			for (const setting of [{ doubledDay: "second" }, { leapMonth: "both" }]) {
				expect(codeOf(sojongConfig({}, setting))).toBe(undefined);
			}
		});

		// An omitted anchor leaves a year with no anchor, and two in a row leave a gap wider than the
		// lookback, so a query's answer would depend on where its range starts.
		describe('skippedDay "omit" is refused, because an omitted anchor leaves the schedule undefined', () => {
			const withDefault = (skippedDay: string, rule: Record<string, unknown> = {}) =>
				({ ...sojongConfig({}, rule), skippedDay }) as unknown as ObservanceConfig;

			it("on the rule itself", () => {
				expect(codeOf(sojongConfig({}, { skippedDay: "omit" }))).toBe(CONFIG_CODE);
			});

			it("inherited from the config's default", () => {
				expect(codeOf(withDefault("omit"))).toBe(CONFIG_CODE);
			});

			it("but accepted when the rule sets its own under an omitting default", () => {
				expect(codeOf(withDefault("omit", { skippedDay: "following" }))).toBe(undefined);
			});

			it.each(["preceding", "following"])("accepts %s", (choice) => {
				expect(codeOf(sojongConfig({}, { skippedDay: choice }))).toBe(undefined);
			});
		});

		// A regression guard, not a fix: under "following" the answer already agreed. With "omit"
		// accepted, Tibetan 2135 and 2136 (2008 and 2009 CE) had no anchor and observancesOn returned
		// nothing on the counted days from 2009-03-09 to 2010-02-11 that a longer range reported.
		it("answers each day of 2009-03-09 to 2010-02-11 alone as a range from 2005 does", () => {
			const config = sojongConfig();
			const range = getObservances(iso("2005-01-01"), iso("2010-03-01"), config);
			const bad: string[] = [];
			for (let day = iso("2009-03-09"); Temporal.PlainDate.compare(day, iso("2010-02-11")) <= 0; ) {
				const alone = observancesOn(day, config)
					.map((o) => o.resolution)
					.join();
				const inRange = range
					.filter((o) => o.date.isoDate.equals(day))
					.map((o) => o.resolution)
					.join();
				if (alone !== inRange) bad.push(`${day}: ${alone} vs ${inRange}`);
				day = day.add({ days: 1 });
			}
			expect(bad).toEqual([]);
			expect(range.filter((o) => o.date.isoDate.toString() >= "2009-03-09").length).toBeGreaterThan(
				20,
			);
		});
	});
});

describe("a config with a rule of a form this release does not know", () => {
	const tara = EXAMPLE_OBSERVANCES.rules.find((r) => r.id === "tara");
	const written = {
		...EXAMPLE_OBSERVANCES,
		id: "newer",
		rules: [
			tara,
			{ id: "eclipse-practice", englishName: "Eclipse practice", when: { type: "eclipse" } },
		],
	} as unknown as ObservanceConfig;

	it("is refused as a whole, so the valid rule beside it cannot be queried", () => {
		expect(thrownBy(() => observancesOn(iso("2026-01-08"), written))?.code).toBe(CONFIG_CODE);
		const withoutUnknown = {
			...written,
			id: "older",
			rules: [tara],
		} as unknown as ObservanceConfig;
		expect(
			getObservances(iso("2026-01-01"), iso("2026-01-31"), withoutUnknown).length,
		).toBeGreaterThan(0);
	});
});
