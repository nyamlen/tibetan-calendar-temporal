import { describe, expect, it } from "vitest";
import { isoToTibetan, losarFor, tibetanDateExists } from "../../src/computation/conversion.js";
import { DEFAULT_OBSERVANCES, getObservances, observancesOn } from "../../src/observances/index.js";
import type { ObservanceRule } from "../../src/observances/types.js";
import { BHUTAN } from "../../src/traditions/bhutan.js";
import { thrownBy } from "../support/thrown.js";

const iso = (s: string) => Temporal.PlainDate.from(s);

// The observance *engine*: how a rule resolves onto a calendar day, and what the boundary refuses.
// Agreement with FPMT's published calendars is a different claim about a different subject, and
// lives in test/validation/fpmt-observances.test.ts.

describe("observance resolution", () => {
	// The row docs/testing.md calls the fixture's most informative: a leap month and a doubled day
	// at once, from an almanac-line source, and the case FPMT itself published two dates for.
	it("puts the 2024 Chokhor Duchen on 10 July by default, the second of the doubled pair", () => {
		const found = observancesOn(iso("2024-07-10")).filter((o) => o.rule.id === "chokhor-duchen");
		expect(found).toHaveLength(1);
		expect(found[0]?.resolution).toBe("secondOfDoubled");
		expect(observancesOn(iso("2024-07-09")).some((o) => o.rule.id === "chokhor-duchen")).toBe(
			false,
		);
	});

	// Janson's holidays section, following Berzin, says the first. Kopan Monastery observed the
	// 9th. An institution follows that line by spreading the config, never by editing the engine.
	it("puts it on 9 July under Janson's rule, reached by spreading the config", () => {
		const kopan = { ...DEFAULT_OBSERVANCES, id: "kopan", doubledDay: "first" as const };
		const found = observancesOn(iso("2024-07-09"), { config: kopan }).filter(
			(o) => o.rule.id === "chokhor-duchen",
		);
		expect(found).toHaveLength(1);
		expect(found[0]?.resolution).toBe("firstOfDoubled");
	});

	it("emits both halves under 'both', reproducing FPMT's own 'July 9 or July 10'", () => {
		const config = { ...DEFAULT_OBSERVANCES, doubledDay: "both" as const };
		const days = getObservances(iso("2024-07-01"), iso("2024-07-31"), { config })
			.filter((o) => o.rule.id === "chokhor-duchen")
			.map((o) => o.date.isoDate.toString());
		expect(days).toEqual(["2024-07-09", "2024-07-10"]);
	});

	// Janson says observances are usually not kept in leap months; FPMT does the opposite here,
	// and 4 of the regular month 6 that follows carries nothing at all.
	it("keeps the 2024 Chokhor Duchen in the leap month, not the regular month 6", () => {
		const inRegular = observancesOn(iso("2024-08-08")).some((o) => o.rule.id === "chokhor-duchen");
		expect(inRegular).toBe(false);
		expect(isoToTibetan(iso("2024-08-08")).isLeapMonth).toBe(false);
	});

	// A monthly observance recurs in *both* halves of a leap pair; only annual ones choose.
	it("recurs monthly through both months of a leap pair", () => {
		const leap = observancesOn(iso("2024-07-16")).some((o) => o.rule.id === "tsok-10");
		const regular = observancesOn(iso("2024-08-14")).some((o) => o.rule.id === "tsok-10");
		expect({ leap, regular }).toEqual({ leap: true, regular: true });
	});

	it("reports how each observance landed", () => {
		const kinds = new Set(
			getObservances(iso("2022-01-01"), iso("2025-12-31")).map((o) => o.resolution),
		);
		// "shiftedFromSkipped" is absent from the shipped config by design: the four great days
		// use it, but none of them met a skipped date in this window.
		expect(kinds.has("exact")).toBe(true);
		expect(kinds.has("secondOfDoubled")).toBe(true);
	});

	it("returns nothing for a reversed range", () => {
		expect(getObservances(iso("2026-01-02"), iso("2026-01-01"))).toEqual([]);
	});

	it("returns results in date order", () => {
		const days = getObservances(iso("2026-01-01"), iso("2026-12-31")).map((o) =>
			o.date.isoDate.toString(),
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
			name: id,
			kind: "puja" as const,
			tier: 3 as const,
			when: { day: 15 },
			source: "https://example.invalid/",
		});
		const config = {
			...DEFAULT_OBSERVANCES,
			id: "tie",
			// Deliberately supplied out of order, and mixing case and an accent -- the inputs where
			// collations disagree with each other.
			rules: [rule("Zebra"), rule("apple"), rule("guru-rinpoche"), rule("guru-rinpoché")],
		};
		// The window covers two Tibetan months, so day 15 comes round twice; the date is the primary
		// key and the id tie-break applies within each day.
		const byDay = new Map<string, string[]>();
		for (const o of getObservances(iso("2026-05-01"), iso("2026-05-31"), { config })) {
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
		expect(() => getObservances(iso("1950-01-01"), iso("2150-12-31"))).not.toThrow();
		expect(() => getObservances(iso("1950-01-01"), iso("2151-01-01"))).toThrow(/at most 200 years/);
		expect(() => getObservances(iso("0001-01-01"), iso("9999-12-31"))).toThrow(RangeError);
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
				),
			)?.code,
		).toBe("TCT_INVALID_ARGUMENT");
	});

	it.each(BAD_ARGS)("observancesOn rejects %s", (_label, value) => {
		expect(thrownBy(() => observancesOn(value as unknown as Temporal.PlainDate))?.code).toBe(
			"TCT_INVALID_ARGUMENT",
		);
	});

	// Regression: valid ISO strings within the span cap must still work exactly as before, both
	// through getObservances and through observancesOn's delegation to it.
	it("still accepts valid ISO strings within the span cap, unchanged", () => {
		const viaPlainDate = getObservances(iso("2024-01-01"), iso("2024-12-31"));
		const viaStrings = getObservances(
			"2024-01-01" as unknown as Temporal.PlainDate,
			"2024-12-31" as unknown as Temporal.PlainDate,
		);
		expect(viaStrings).toEqual(viaPlainDate);

		const onPlainDate = observancesOn(iso("2024-07-10"));
		const onString = observancesOn("2024-07-10" as unknown as Temporal.PlainDate);
		expect(onString).toEqual(onPlainDate);
		expect(onString.length).toBeGreaterThan(0);
	});
});

// The branch carrying the subtlest hand-reasoning in the layer, and unreachable from the shipped
// config: DEFAULT_OBSERVANCES has no day-1 rule, and its monthly rules all opt out with skippedDay: "omit".
// Only a consumer config gets here, which is exactly why it needs a test.
describe("a rule on day 1, where the preceding day belongs to the previous month", () => {
	const dayOne = {
		...DEFAULT_OBSERVANCES,
		id: "day-one",
		rules: [
			{
				id: "first-of-month",
				name: "First of the month",
				kind: "puja" as const,
				tier: 3 as const,
				when: { day: 1 },
				skippedDay: "preceding" as const,
				source: "https://example.invalid/ - test fixture, not a real observance",
			},
		],
	};

	// Losar 1977 is the case in range where day 1 is skipped: the year opens on the day numbered 2.
	// So the day-1 rule for month 1 has no day to land on, and shifts back across a month boundary
	// -- and across a *year* boundary -- onto the 30th of month 12 of the year before.
	it("shifts back across the month boundary when day 1 is skipped", () => {
		const shifted = getObservances(iso("1977-01-01"), iso("1977-12-31"), { config: dayOne }).filter(
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
		const found = getObservances(iso("1977-01-01"), iso("1977-12-31"), { config: dayOne });
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

// ObservanceConfig is the documented extension point, and until now nothing checked what a
// consumer put in it. The mean-motion formulas are linear in the lunar day, so an out-of-range
// day extrapolated into a real, wrong calendar date labelled resolution: "exact".
describe("consumer config validation", () => {
	const withRule = (rule: Record<string, unknown>) => ({
		...DEFAULT_OBSERVANCES,
		id: "test",
		rules: [
			{
				id: "r",
				name: "R",
				kind: "puja" as const,
				tier: 3 as const,
				when: { day: 15 },
				source: "https://example.invalid/",
				...rule,
			},
		],
	});
	const run = (config: unknown) =>
		getObservances(iso("2026-01-01"), iso("2026-12-31"), {
			config: config as typeof DEFAULT_OBSERVANCES,
		});

	it("accepts the shipped DEFAULT_OBSERVANCES config", () => {
		expect(() => run(DEFAULT_OBSERVANCES)).not.toThrow();
	});

	// `{ ...DEFAULT_OBSERVANCES, rules: [...DEFAULT_OBSERVANCES.rules, mine] }` is what the docs tell a consumer to write, so
	// `DEFAULT_OBSERVANCES.rules.push(mine)` is the mistake one keystroke away -- and it used to succeed, adding
	// the rule for every caller in the process.
	it("freezes DEFAULT_OBSERVANCES, its rules array and each rule", () => {
		expect(Object.isFrozen(DEFAULT_OBSERVANCES)).toBe(true);
		expect(Object.isFrozen(DEFAULT_OBSERVANCES.rules)).toBe(true);
		for (const rule of DEFAULT_OBSERVANCES.rules) {
			expect(Object.isFrozen(rule)).toBe(true);
			expect(Object.isFrozen(rule.when)).toBe(true);
		}
		expect(() =>
			(DEFAULT_OBSERVANCES.rules as ObservanceRule[]).push({ id: "z" } as ObservanceRule),
		).toThrow(TypeError);
	});

	// Each of these previously returned a real, wrong day rather than complaining.
	it.each([
		["day 31 - was the 1st of the following month", { when: { day: 31 } }],
		["day 0 - was the 30th of the previous month", { when: { day: 0 } }],
		["day -1 - was the 29th of the previous month", { when: { day: -1 } }],
		["day 45 - was the 15th of the same month", { when: { day: 45 } }],
		["fractional day", { when: { day: 15.5 } }],
		["NaN day", { when: { day: Number.NaN } }],
	])("rejects %s", (_label, rule) => {
		expect(() => run(withRule(rule))).toThrow(/day must be an integer 1-30/);
	});

	// The other silent-failure mode: an out-of-range month matched nothing, so the observance
	// vanished from the year without complaint.
	it.each([
		["month 0", 0],
		["month 13", 13],
		["fractional month", 6.5],
	])("rejects %s", (_label, month) => {
		expect(() => run(withRule({ when: { month, day: 15 } }))).toThrow(
			/month must be an integer 1-12/,
		);
	});

	it("rejects duplicate rule ids", () => {
		const config = {
			...DEFAULT_OBSERVANCES,
			rules: [...DEFAULT_OBSERVANCES.rules, DEFAULT_OBSERVANCES.rules[0] as never],
		};
		expect(() => run(config)).toThrow(/unique within a config/);
	});

	it("rejects an empty rule id", () => {
		expect(() => run(withRule({ id: "" }))).toThrow(/non-empty string/);
	});

	// The config is meant to be *extended* by spreading -- `{ ...DEFAULT_OBSERVANCES, rules: [...DEFAULT_OBSERVANCES.rules, x] }`
	// -- and a reader who writes a partial one instead used to reach a `for...of` over undefined.
	it("rejects a config whose rules are missing or not an array", () => {
		for (const rules of [undefined, null, {}]) {
			expect(() => run({ ...DEFAULT_OBSERVANCES, rules } as never)).toThrow(
				/rules must be an array/,
			);
		}
	});

	// Type-level only, so JSON.parse or a plain-JS consumer walks straight past the compiler.
	it.each([
		["doubledDay", { doubledDay: "1st" }, /doubledDay must be one of/],
		["skippedDay", { skippedDay: "before" }, /skippedDay must be one of/],
		["leapMonth", { leapMonth: "yes" }, /leapMonth must be one of/],
	])("rejects an invalid %s on a rule", (_label, rule, pattern) => {
		expect(() => run(withRule(rule))).toThrow(pattern);
	});

	it("rejects an invalid convention on the config itself", () => {
		expect(() => run({ ...DEFAULT_OBSERVANCES, doubledDay: "1st" })).toThrow(
			/config doubledDay must be one of/,
		);
	});

	// Validation is memoised per config object, so a repeated call must behave identically rather
	// than passing the second time through.
	it("stays rejected on a repeat call", () => {
		const bad = withRule({ when: { day: 31 } });
		expect(() => run(bad)).toThrow(/day must be/);
		expect(() => run(bad)).toThrow(/day must be/);
	});

	// The three convention fields are declared *required* on ObservanceConfig, and the validator's
	// `value !== undefined` escape let all three through when missing. Downstream they resolved to
	// `undefined` and fell into whichever branch came last. `undefined` is also the far likelier
	// input than the `"1st"` the validator did catch: it is what a config written before a field
	// existed, a hand-built config, or a spread of a Partial<> all produce.
	it.each(["doubledDay", "skippedDay", "leapMonth"])(
		"rejects a config with %s missing entirely",
		(field) => {
			const config = { ...DEFAULT_OBSERVANCES } as Record<string, unknown>;
			delete config[field];
			expect(thrownBy(() => run(config))?.code).toBe("TCT_INVALID_OBSERVANCE_CONFIG");
		},
	);

	// What the omission actually cost, kept as a worked case rather than only a shape assertion.
	// 2024 is a leap-6 year; FPMT prints Chokhor Duchen in the leap month, and with `leapMonth`
	// dropped the engine returned 2024-08-08 from the regular month 6 instead of 2024-07-10.
	it("no longer resolves Chokhor Duchen a month late when leapMonth is dropped", () => {
		const chokhor = {
			...DEFAULT_OBSERVANCES,
			id: "chokhor-only",
			rules: [
				{
					id: "chokhor-duchen",
					name: "Chokhor Duchen",
					kind: "duchen" as const,
					tier: 1 as const,
					when: { month: 6, day: 4 },
					source: "https://fpmt.org/resources/calendar/",
				},
			],
		} as Record<string, unknown>;

		const withLeap = { ...chokhor, leapMonth: "leap" };
		expect(
			getObservances(iso("2024-01-01"), iso("2024-12-31"), {
				config: withLeap as typeof DEFAULT_OBSERVANCES,
			}).map((o) => o.date.isoDate.toString()),
		).toEqual(["2024-07-10"]);

		const dropped = { ...chokhor };
		delete dropped.leapMonth;
		expect(thrownBy(() => run(dropped))?.code).toBe("TCT_INVALID_OBSERVANCE_CONFIG");
	});

	// CLAUDE.md: "Every consumer config gets a validator ... TraditionConfig went unchecked for
	// three phases because the failure looked like a language error rather than a missing feature."
	// These are that same language error, one layer out: all three were raw TypeErrors with
	// code: undefined, so a consumer's `catch (e) { if (e.code === ...) }` fell through.
	it.each([
		["a null config", null],
		["a non-object config", 42],
		["a string config", "gelug"],
	])("rejects %s with a coded error", (_label, config) => {
		expect(thrownBy(() => observancesOn(iso("2026-01-01"), { config } as never))?.code).toBe(
			"TCT_INVALID_OBSERVANCE_CONFIG",
		);
	});

	// The options bag reshape of 2026-08-26 created a new boundary, and this is its guard. Without
	// it these read a property off a non-object and throw the same raw uncoded TypeError the block
	// above exists to prevent — one layer further out. TCT_INVALID_ARGUMENT, not the config code:
	// the bag is the wrong KIND of thing and no config has been reached.
	it.each([
		["a null bag", null],
		["a number bag", 42],
		["a string bag", "gelug"],
	])("rejects %s passed where the options bag belongs", (_label, options) => {
		expect(thrownBy(() => observancesOn(iso("2026-01-01"), options as never))?.code).toBe(
			"TCT_INVALID_ARGUMENT",
		);
		expect(
			thrownBy(() => getObservances(iso("2026-01-01"), iso("2026-12-31"), options as never))?.code,
		).toBe("TCT_INVALID_ARGUMENT");
	});

	// `undefined` is not in the list above on purpose: it means "argument omitted", so the default
	// parameter supplies DEFAULT_OBSERVANCES and the call is correct. Only an explicitly wrong value is an error.
	it("treats an undefined config as the DEFAULT_OBSERVANCES default", () => {
		expect(() => observancesOn(iso("2026-01-01"), undefined)).not.toThrow();
		expect(() => observancesOn(iso("2026-01-01"), {})).not.toThrow();
	});

	it.each([
		["a null rule", { ...DEFAULT_OBSERVANCES, rules: [null] }],
		[
			"a rule with no when",
			{ ...DEFAULT_OBSERVANCES, rules: [{ id: "r", name: "R", kind: "puja", tier: 1 }] },
		],
		[
			"a null when",
			{
				...DEFAULT_OBSERVANCES,
				rules: [{ id: "r", name: "R", kind: "puja", tier: 1, when: null }],
			},
		],
	])("rejects %s with a coded error", (_label, config) => {
		expect(thrownBy(() => run(config))?.code).toBe("TCT_INVALID_OBSERVANCE_CONFIG");
	});

	// Accepted and returned results before: kind: "not-a-kind", tier: 99, source: "".
	it.each([
		["an unknown kind", { kind: "not-a-kind" }],
		["an out-of-range tier", { tier: 99 }],
		["a fractional tier", { tier: 1.5 }],
		["an empty source", { source: "" }],
		["a missing source", { source: undefined }],
		["an empty name", { name: "" }],
	])("rejects a rule with %s", (_label, patch) => {
		expect(thrownBy(() => run(withRule(patch)))?.code).toBe("TCT_INVALID_OBSERVANCE_CONFIG");
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
		const topLevel = Object.keys(DEFAULT_OBSERVANCES);
		const ruleFields = Object.keys(DEFAULT_OBSERVANCES.rules[0] as object);

		for (const field of topLevel) {
			for (const mutation of ["drop", "null"] as const) {
				const config = { ...DEFAULT_OBSERVANCES, id: `mutant-${field}-${mutation}` } as Record<
					string,
					unknown
				>;
				if (mutation === "drop") delete config[field];
				else config[field] = null;

				const error = thrownBy(() => run(config));
				// `name` is metadata the arithmetic never reads, so dropping it may legitimately not
				// throw -- but if it throws, it must be coded.
				if (error !== undefined && error.code !== "TCT_INVALID_OBSERVANCE_CONFIG") {
					uncoded.push(`config.${field} ${mutation}: ${error.name} code=${error.code}`);
				}
			}
		}

		for (const field of ruleFields) {
			for (const mutation of ["drop", "null"] as const) {
				const rule = { ...(DEFAULT_OBSERVANCES.rules[0] as object) } as Record<string, unknown>;
				if (mutation === "drop") delete rule[field];
				else rule[field] = null;
				const config = {
					...DEFAULT_OBSERVANCES,
					id: `mutant-rule-${field}-${mutation}`,
					rules: [rule],
				};

				const error = thrownBy(() => run(config));
				if (error !== undefined && error.code !== "TCT_INVALID_OBSERVANCE_CONFIG") {
					uncoded.push(`rule.${field} ${mutation}: ${error.name} code=${error.code}`);
				}
			}
		}

		expect(uncoded).toEqual([]);
	});
});

describe("the options bag refuses an array", () => {
	// An array is an object, so the shared guard passed one until 2026-09-23 and the defaults were
	// used silently. It is what a point-free `map` hands the second parameter.
	it("observancesOn", () => {
		let code: unknown = "no throw";
		try {
			// @ts-expect-error -- an array is the wrong kind of thing, which is what is under test
			observancesOn(Temporal.PlainDate.from("2024-07-09"), []);
		} catch (error) {
			code = (error as { code?: unknown }).code;
		}
		expect(code).toBe("TCT_INVALID_ARGUMENT");
	});
});

describe("the options bag refuses unknown keys", () => {
	// Decided 2026-09-24. A misspelt key was ignored, so `{ tradtion: BHUTAN }` answered Phugpa's
	// days without a word.
	const day = Temporal.PlainDate.from("2026-01-01");

	it("refuses a misspelt tradition, naming it", () => {
		const error = thrownBy(() => observancesOn(day, { tradtion: BHUTAN } as never));
		expect(error?.code).toBe("TCT_INVALID_ARGUMENT");
		expect(error?.message).toContain('"tradtion"');
		expect(
			thrownBy(() => getObservances(day, day, Object.create({ tradtion: BHUTAN })))?.code,
		).toBe("TCT_INVALID_ARGUMENT");
	});

	it("still reads `config` as the ObservanceConfig, so a TraditionConfig there is a config error", () => {
		expect(thrownBy(() => observancesOn(day, { config: BHUTAN } as never))?.code).toBe(
			"TCT_INVALID_OBSERVANCE_CONFIG",
		);
	});
});
