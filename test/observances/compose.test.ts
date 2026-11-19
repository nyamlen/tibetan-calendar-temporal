import { describe, expect, it } from "vitest";
import {
	composeObservances,
	EXAMPLE_OBSERVANCES,
	getObservances,
	nextObservance,
	observancesOn,
} from "../../src/observances/index.js";
import type { ObservanceConfig, ObservanceLayer } from "../../src/observances/types.js";
import { thrownBy } from "../support/thrown.js";

const iso = (s: string) => Temporal.PlainDate.from(s);
const INVALID = "TCT_INVALID_OBSERVANCE_CONFIG";

const NAME = { tibetan: "ཀ", wylie: "ka", phonetic: "ka" };

const monthly = (id: string, extra: object = {}) => ({
	id,
	englishName: id,
	when: { type: "monthly", days: [10] },
	...extra,
});

// Plain, unfrozen, with levels, a name on a level, and a first rule whose `when` carries an array.
const plainBase = (): ObservanceConfig =>
	({
		id: "base",
		englishName: "Base",
		tibetanName: NAME,
		doubledDay: "second",
		skippedDay: "preceding",
		leapMonth: "leap",
		levels: [
			{ id: "great", englishName: "Great", tibetanName: { ...NAME } },
			{ id: "small", englishName: "Small" },
			{ id: "tiny", englishName: "Tiny" },
		],
		rules: [
			monthly("a", { level: "great", tags: ["x"], tibetanName: { ...NAME } }),
			monthly("b", { level: "small" }),
			monthly("c"),
		],
	}) as unknown as ObservanceConfig;

const layer = (patch: object = {}): ObservanceLayer =>
	({ id: "layer", englishName: "Layer", ...patch }) as ObservanceLayer;

const ruleIds = (c: ObservanceConfig) => c.rules.map((r) => r.id);
const levelIds = (c: ObservanceConfig) => (c.levels ?? []).map((l) => l.id);
const codeOf = (base: unknown, l: unknown) =>
	thrownBy(() => composeObservances(base as never, l as never))?.code;

describe("composeObservances", () => {
	it("moves the 2024 Chokhor Düchen with a one-key layer, as Kopan does", () => {
		const kopan = composeObservances(EXAMPLE_OBSERVANCES, {
			id: "kopan",
			englishName: "Kopan",
			doubledDay: "first",
		});
		const dates = (config: ObservanceConfig) =>
			getObservances(iso("2024-07-01"), iso("2024-07-31"), config)
				.filter((o) => o.rule.id === "chokhor-duchen")
				.map((o) => o.date.isoDate.toString());
		expect(dates(EXAMPLE_OBSERVANCES)).toEqual(["2024-07-10"]);
		expect(dates(kopan)).toEqual(["2024-07-09"]);
		expect(kopan.doubledDay).toBe("first");
		expect(kopan.skippedDay).toBe(EXAMPLE_OBSERVANCES.skippedDay);
		expect(kopan.leapMonth).toBe(EXAMPLE_OBSERVANCES.leapMonth);
	});

	it("takes skippedDay and leapMonth from the layer when it sets them", () => {
		const base = plainBase();
		const result = composeObservances(
			base,
			layer({ skippedDay: "following", leapMonth: "regular" }),
		);
		expect(base.skippedDay).toBe("preceding");
		expect(base.leapMonth).toBe("leap");
		expect(result.skippedDay).toBe("following");
		expect(result.leapMonth).toBe("regular");
		expect(result.doubledDay).toBe(base.doubledDay);
	});

	it("applies remove, then replace, then add, and keeps replaced rules in place", () => {
		const result = composeObservances(
			plainBase(),
			layer({
				remove: ["a"],
				replace: [monthly("c", { englishName: "C2" })],
				add: [monthly("z"), monthly("y")],
			}),
		);
		expect(ruleIds(result)).toEqual(["b", "c", "z", "y"]);
		expect(result.rules[1]?.englishName).toBe("C2");
	});

	it("keeps a replacement at the position of the rule it replaces", () => {
		const result = composeObservances(plainBase(), layer({ replace: [monthly("b")] }));
		expect(ruleIds(result)).toEqual(["a", "b", "c"]);
	});

	it("appends addLevels after the base's levels, in the order given", () => {
		const result = composeObservances(
			plainBase(),
			layer({
				addLevels: [
					{ id: "z", englishName: "Z" },
					{ id: "m", englishName: "M" },
				],
			}),
		);
		expect(levelIds(result)).toEqual(["great", "small", "tiny", "z", "m"]);
	});

	it("keeps the remaining levels' order after removeLevels, then appends", () => {
		const result = composeObservances(
			plainBase(),
			layer({
				remove: ["a", "b"],
				removeLevels: ["small"],
				addLevels: [{ id: "new", englishName: "New" }],
			}),
		);
		expect(levelIds(result)).toEqual(["great", "tiny", "new"]);
	});

	it("replaces a level in place, so a rule naming it is untouched and its position is kept", () => {
		const result = composeObservances(
			plainBase(),
			layer({
				replaceLevels: [{ id: "small", englishName: "Minor", tibetanName: { ...NAME } }],
			}),
		);
		expect(levelIds(result)).toEqual(["great", "small", "tiny"]);
		expect(result.levels?.[1]).toEqual({
			id: "small",
			englishName: "Minor",
			tibetanName: NAME,
		});
		expect(result.rules[1]?.level).toBe("small");
	});

	it("orders levels remove, replace, add, as it does rules", () => {
		const result = composeObservances(
			plainBase(),
			layer({
				remove: ["c"],
				removeLevels: ["tiny"],
				replaceLevels: [{ id: "great", englishName: "G2" }],
				addLevels: [{ id: "new", englishName: "New" }],
			}),
		);
		expect(levelIds(result)).toEqual(["great", "small", "new"]);
		expect(result.levels?.[0]?.englishName).toBe("G2");
	});

	it("takes id, englishName and tibetanName from the layer only", () => {
		const base = plainBase();
		const bare = composeObservances(base, layer());
		expect(bare.id).toBe("layer");
		expect(bare.englishName).toBe("Layer");
		expect("tibetanName" in bare).toBe(false);
		const named = composeObservances(base, layer({ tibetanName: { ...NAME, wylie: "kha" } }));
		expect(named.tibetanName?.wylie).toBe("kha");
	});

	it("gives a config with no levels and a layer with none no levels key", () => {
		const base = { ...plainBase() } as { levels?: unknown; rules: unknown };
		delete base.levels;
		base.rules = [monthly("a"), monthly("b")] as never;
		const result = composeObservances(base as ObservanceConfig, layer({ add: [monthly("c")] }));
		expect("levels" in result).toBe(false);
		expect(ruleIds(result)).toEqual(["a", "b", "c"]);
	});

	it("accepts a rule that names no level on a base with no levels", () => {
		const bare = { ...EXAMPLE_OBSERVANCES, rules: [] } as ObservanceConfig;
		const result = composeObservances(bare, layer({ add: [monthly("solo")] }));
		expect(ruleIds(result)).toEqual(["solo"]);
	});

	it("works with observancesOn, getObservances and nextObservance, finding an added rule", () => {
		const result = composeObservances(
			EXAMPLE_OBSERVANCES,
			layer({ add: [{ ...monthly("tenth"), when: { type: "monthly", days: [10] } }] }),
		);
		const from = iso("2026-03-01");
		const next = nextObservance(from, "tenth", result);
		expect(next?.rule.id).toBe("tenth");
		expect(next?.date.isoDate.toString()).toBe("2026-03-28");
		const day = observancesOn(iso("2026-03-28"), result);
		expect(day.some((o) => o.rule.id === "tenth")).toBe(true);
		const range = getObservances(iso("2026-03-01"), iso("2026-03-31"), result);
		expect(range.filter((o) => o.rule.id === "tenth").length).toBeGreaterThan(0);
	});

	describe("refusals", () => {
		const cases: [string, unknown, unknown][] = [
			["remove naming an unknown id", plainBase(), layer({ remove: ["nope"] })],
			["replace naming an unknown id", plainBase(), layer({ replace: [monthly("nope")] })],
			["add naming an id the base keeps", plainBase(), layer({ add: [monthly("a")] })],
			["an id twice in remove", plainBase(), layer({ remove: ["a", "a"] })],
			["an id twice in replace", plainBase(), layer({ replace: [monthly("a"), monthly("a")] })],
			[
				"an id in both remove and add",
				plainBase(),
				layer({ remove: ["a"], add: [monthly("a", { englishName: "A2" })] }),
			],
			[
				"an id in both replace and add",
				plainBase(),
				layer({ replace: [monthly("a")], add: [monthly("a")] }),
			],
			[
				"a level in both removeLevels and addLevels",
				plainBase(),
				layer({
					remove: ["a"],
					removeLevels: ["great"],
					addLevels: [{ id: "great", englishName: "G2" }],
				}),
			],
			["an id twice in add", plainBase(), layer({ add: [monthly("q"), monthly("q")] })],
			[
				"an id in both remove and replace",
				plainBase(),
				layer({ remove: ["a"], replace: [monthly("a")] }),
			],
			["removeLevels naming an unknown level", plainBase(), layer({ removeLevels: ["nope"] })],
			["a level twice in removeLevels", plainBase(), layer({ removeLevels: ["tiny", "tiny"] })],
			["removing a level a remaining rule names", plainBase(), layer({ removeLevels: ["great"] })],
			[
				"a rule naming an undeclared level",
				plainBase(),
				layer({ add: [monthly("q", { level: "ghost" })] }),
			],
			[
				"adding a level that exists",
				plainBase(),
				layer({ addLevels: [{ id: "tiny", englishName: "T" }] }),
			],
			[
				"a level twice in addLevels",
				plainBase(),
				layer({
					addLevels: [
						{ id: "n", englishName: "N" },
						{ id: "n", englishName: "N" },
					],
				}),
			],
			["an unknown layer key", plainBase(), layer({ rules: [] })],
			[
				"an unknown key in an added rule",
				plainBase(),
				layer({ add: [monthly("q", { kind: "x" })] }),
			],
			[
				"an unknown key in a replacement",
				plainBase(),
				layer({ replace: [monthly("a", { kind: "x" })] }),
			],
			["a layer that is null", plainBase(), null],
			["a layer that is an array", plainBase(), []],
			["a base that is null", null, layer()],
			["a base that is a string", "base", layer()],
			["a layer id that is not a string", plainBase(), layer({ id: 5 })],
			["an empty layer id", plainBase(), layer({ id: "" })],
			["a layer englishName that is not a string", plainBase(), layer({ englishName: 5 })],
			["a layer tibetanName of the wrong shape", plainBase(), layer({ tibetanName: "x" })],
			["remove that is not an array", plainBase(), layer({ remove: "a" })],
			["remove holding a non-string", plainBase(), layer({ remove: [1] })],
			["replace that is not an array", plainBase(), layer({ replace: {} })],
			["replace holding a non-object", plainBase(), layer({ replace: [1] })],
			["add holding a rule with no id", plainBase(), layer({ add: [{ englishName: "x" }] })],
			[
				"an invalid added rule",
				plainBase(),
				layer({ add: [{ ...monthly("q"), when: { type: "x" } }] }),
			],
			["addLevels that is not an array", plainBase(), layer({ addLevels: "x" })],
			["addLevels holding a non-object", plainBase(), layer({ addLevels: [1] })],
			[
				"replaceLevels naming an unknown level",
				plainBase(),
				layer({ replaceLevels: [{ id: "nope", englishName: "N" }] }),
			],
			[
				"a level in both replaceLevels and removeLevels",
				plainBase(),
				layer({
					remove: ["c"],
					removeLevels: ["tiny"],
					replaceLevels: [{ id: "tiny", englishName: "T2" }],
				}),
			],
			[
				"a level in both replaceLevels and addLevels",
				plainBase(),
				layer({
					replaceLevels: [{ id: "tiny", englishName: "T2" }],
					addLevels: [{ id: "tiny", englishName: "T3" }],
				}),
			],
			[
				"a level twice in replaceLevels",
				plainBase(),
				layer({
					replaceLevels: [
						{ id: "tiny", englishName: "T2" },
						{ id: "tiny", englishName: "T3" },
					],
				}),
			],
			["replaceLevels that is not an array", plainBase(), layer({ replaceLevels: "x" })],
			["replaceLevels holding a non-object", plainBase(), layer({ replaceLevels: [1] })],
			[
				"an invalid replacement level",
				plainBase(),
				layer({ replaceLevels: [{ id: "tiny", englishName: 5 }] }),
			],
			["a doubledDay that is not a choice", plainBase(), layer({ doubledDay: "third" })],
			["a skippedDay that is not a choice", plainBase(), layer({ skippedDay: 1 })],
			["a leapMonth that is not a choice", plainBase(), layer({ leapMonth: null })],
		];
		it.each(cases)("%s", (_label, base, l) => {
			expect(codeOf(base, l)).toBe(INVALID);
		});

		it("names the offending id", () => {
			const error = thrownBy(() => composeObservances(plainBase(), layer({ remove: ["nope"] })));
			expect(error?.message).toContain("nope");
		});
	});

	describe("never changes what the caller passed in", () => {
		const addRule = () =>
			monthly("added", {
				tags: ["t"],
				tibetanName: { ...NAME },
				when: { type: "annual", dates: [{ month: 1, day: 1 }] },
			});
		const addLevel = () => ({ id: "lv", englishName: "Lv", tibetanName: { ...NAME } });

		it("leaves an unfrozen base equal to its snapshot and wholly unfrozen", () => {
			const base = plainBase();
			const withAnnual = {
				...base,
				rules: [
					{
						id: "first",
						englishName: "First",
						level: "great",
						when: { type: "annual", dates: [{ month: 1, day: 1 }] },
					},
					...base.rules,
				],
			} as unknown as ObservanceConfig;
			const snapshot = structuredClone(withAnnual);
			const result = composeObservances(withAnnual, layer({ add: [addRule()] }));
			expect(Object.isFrozen(result)).toBe(true);
			expect(withAnnual).toEqual(snapshot);
			const first = withAnnual.rules[0] as { when: { dates: unknown } };
			expect(Object.isFrozen(withAnnual)).toBe(false);
			expect(Object.isFrozen(withAnnual.rules)).toBe(false);
			expect(Object.isFrozen(first)).toBe(false);
			expect(Object.isFrozen(first.when)).toBe(false);
			expect(Object.isFrozen(first.when.dates)).toBe(false);
			expect(Object.isFrozen(withAnnual.levels)).toBe(false);
			expect(Object.isFrozen(withAnnual.levels?.[0])).toBe(false);
			expect(Object.isFrozen(withAnnual.levels?.[0]?.tibetanName)).toBe(false);
			expect(Object.isFrozen(withAnnual.tibetanName)).toBe(false);
		});

		it("also leaves a base whose first rule is monthly unfrozen", () => {
			const base = plainBase();
			composeObservances(base, layer());
			const first = base.rules[0] as { when: { days: unknown } };
			expect(Object.isFrozen(first)).toBe(false);
			expect(Object.isFrozen(first.when)).toBe(false);
			expect(Object.isFrozen(first.when.days)).toBe(false);
		});

		it("leaves the layer's rules, levels and names unfrozen and unchanged", () => {
			const l = layer({
				tibetanName: { ...NAME },
				remove: ["b"],
				replace: [monthly("a", { tags: ["r"], tibetanName: { ...NAME } })],
				add: [addRule()],
				removeLevels: ["tiny"],
				addLevels: [addLevel()],
				conventions: [{ id: "c", doubledDay: "first" }],
			}) as ObservanceLayer & {
				replace: { tags: string[]; tibetanName: object; when: object }[];
				add: { tags: string[]; tibetanName: object; when: { dates: object } }[];
				addLevels: { tibetanName: object }[];
				remove: string[];
				conventions: object[];
			};
			const snapshot = structuredClone(l);
			composeObservances(plainBase(), l);
			expect(l).toEqual(snapshot);
			for (const value of [
				l,
				l.tibetanName,
				l.remove,
				l.replace,
				l.replace[0],
				l.replace[0]?.tags,
				l.replace[0]?.tibetanName,
				l.replace[0]?.when,
				l.add,
				l.add[0],
				l.add[0]?.tags,
				l.add[0]?.tibetanName,
				l.add[0]?.when,
				l.add[0]?.when.dates,
				l.removeLevels,
				l.addLevels,
				l.addLevels[0],
				l.addLevels[0]?.tibetanName,
				l.conventions,
				l.conventions[0],
			]) {
				expect(Object.isFrozen(value)).toBe(false);
			}
		});

		it("composes on a frozen base and leaves it as it was", () => {
			const before = JSON.stringify(EXAMPLE_OBSERVANCES);
			const result = composeObservances(EXAMPLE_OBSERVANCES, layer({ remove: ["tara"] }));
			expect(JSON.stringify(EXAMPLE_OBSERVANCES)).toBe(before);
			expect(Object.isFrozen(EXAMPLE_OBSERVANCES)).toBe(true);
			expect(ruleIds(result)).not.toContain("tara");
			expect(result.rules.length).toBe(EXAMPLE_OBSERVANCES.rules.length - 1);
		});

		it("shares no rule object with the base or the layer", () => {
			const l = layer({ add: [addRule()] }) as unknown as { add: object[] };
			const base = plainBase();
			const result = composeObservances(base, l as unknown as ObservanceLayer);
			expect(result.rules[0]).not.toBe(base.rules[0]);
			expect(result.rules.at(-1)).not.toBe(l.add[0]);
			const found = getObservances(iso("2026-01-01"), iso("2026-06-30"), result).filter(
				(o) => o.rule.id === "added",
			);
			expect(found.length).toBeGreaterThan(0);
			for (const o of found) expect(o.rule).not.toBe(l.add[0]);
		});
	});

	it("returns a deeply frozen result", () => {
		const result = composeObservances(
			plainBase(),
			layer({ tibetanName: { ...NAME }, add: [monthly("z", { tags: ["t"] })] }),
		);
		expect(Object.isFrozen(result)).toBe(true);
		expect(Object.isFrozen(result.rules)).toBe(true);
		expect(Object.isFrozen(result.rules[0])).toBe(true);
		expect(Object.isFrozen(result.rules[0]?.when)).toBe(true);
		expect(Object.isFrozen(result.rules.at(-1)?.tags)).toBe(true);
		expect(Object.isFrozen(result.levels)).toBe(true);
		expect(Object.isFrozen(result.levels?.[0]?.tibetanName)).toBe(true);
		expect(Object.isFrozen(result.tibetanName)).toBe(true);
	});

	it("returns a fresh result each call", () => {
		const base = plainBase();
		expect(composeObservances(base, layer())).not.toBe(composeObservances(base, layer()));
	});
});

describe("composeObservances: conventions", () => {
	const ruleIn = (config: ObservanceConfig, id: string) => {
		const found = config.rules.find((r) => r.id === id);
		if (found === undefined) throw new Error(`no rule "${id}"`);
		return found;
	};
	const withConventions = (conventions: unknown, patch: object = {}) =>
		composeObservances(EXAMPLE_OBSERVANCES, layer({ conventions, ...patch }));
	const tara = ruleIn(EXAMPLE_OBSERVANCES, "tara");
	const foundingDay = {
		id: "founding-day",
		englishName: "Founding day",
		when: { type: "annual", dates: [{ month: 4, day: 15 }] },
	};

	it("changes one setting of a shipped rule and keeps every other field", () => {
		const result = withConventions([{ id: "tara", doubledDay: "first" }]);
		expect(ruleIn(result, "tara")).toEqual({ ...tara, doubledDay: "first" });
	});

	it("keeps the rule at its position", () => {
		const result = withConventions([{ id: "tara", doubledDay: "first" }]);
		expect(ruleIds(result)).toEqual(ruleIds(EXAMPLE_OBSERVANCES));
	});

	it("moves tara to the first half of the doubled eighth of 15 and 16 May 2024", () => {
		const result = withConventions([{ id: "tara", doubledDay: "first" }]);
		const taraOn = (day: string) =>
			observancesOn(iso(day), result)
				.filter((o) => o.rule.id === "tara")
				.map((o) => o.resolution);
		expect(taraOn("2024-05-15")).toEqual(["firstOfDoubled"]);
		expect(taraOn("2024-05-16")).toEqual([]);
	});

	it("keeps a convention the entry leaves undefined", () => {
		const result = withConventions([{ id: "tara", doubledDay: "first", skippedDay: undefined }]);
		expect(ruleIn(result, "tara").skippedDay).toBe("omit");
	});

	it.each([
		[
			"an id the base does not have",
			[{ id: "nope", doubledDay: "first" }],
			{},
			'conventions names "nope"',
		],
		[
			"an id also removed",
			[{ id: "tara", doubledDay: "first" }],
			{ remove: ["tara"] },
			"appears 2 times, in remove and conventions",
		],
		[
			"an id also replaced",
			[{ id: "tara", doubledDay: "first" }],
			{ replace: [{ ...tara }] },
			"appears 2 times, in replace and conventions",
		],
		[
			"an id also added",
			[{ id: "founding-day", doubledDay: "first" }],
			{ add: [foundingDay] },
			"appears 2 times, in add and conventions",
		],
		[
			"a key that is not a convention",
			[{ id: "tara", englishName: "x" }],
			{},
			'conventions entry "tara" has no key "englishName"',
		],
		["an entry that sets nothing", [{ id: "tara" }], {}, 'conventions entry "tara" sets nothing'],
		[
			"an entry whose only convention is undefined",
			[{ id: "tara", skippedDay: undefined }],
			{},
			'conventions entry "tara" sets nothing',
		],
		["a value that is not a choice", [{ id: "tara", doubledDay: "third" }], {}, "doubledDay"],
		["conventions that is not an array", {}, {}, "conventions must be an array"],
		["an entry that is not an object", [7], {}, "every conventions entry must be an object"],
		[
			"a convention the rule's form does not read",
			[{ id: "tara", leapMonth: "leap" }],
			{},
			'observance rule "tara": leapMonth does not apply to a "monthly" rule',
		],
		[
			"omit on a counted rule",
			[{ id: "sojong", skippedDay: "omit" }],
			{},
			'observance rule "sojong": a "counted" rule does not accept skippedDay "omit"',
		],
	])("refuses %s", (_label, conventions, patch, fragment) => {
		const error = thrownBy(() => withConventions(conventions, patch));
		expect(error?.code).toBe(INVALID);
		expect(error?.message).toContain(fragment);
	});

	// A getter answering differently on a second read must not steer the check and the result apart.
	const fickle = (first: unknown, then: unknown) => {
		let reads = 0;
		return () => (reads++ === 0 ? first : then);
	};

	// The engine checks a private copy and applies only that copy, so a getter answering differently
	// later can reach the result only as a value the checks have seen, never around them.
	it("applies only an id the checks have seen, however the caller's getter answers later", () => {
		const entry = { doubledDay: "first" };
		Object.defineProperty(entry, "id", { get: fickle("tara", "nope"), enumerable: true });
		const error = thrownBy(() => withConventions([entry]));
		expect(error?.code).toBe(INVALID);
		expect(error?.message).toContain('conventions names "nope"');
	});

	it("applies only a convention the checks have seen, however the caller's getter answers later", () => {
		const entry = { id: "tara" };
		Object.defineProperty(entry, "doubledDay", { get: fickle("first", "third"), enumerable: true });
		const error = thrownBy(() => withConventions([entry]));
		expect(error?.code).toBe(INVALID);
		expect(error?.message).toContain("doubledDay");
	});

	it.each([
		[
			"an entry that is a Proxy with no traps",
			() => [new Proxy({ id: "tara", doubledDay: "first" }, {})],
		],
		[
			"conventions that is a Proxy with no traps",
			() => new Proxy([{ id: "tara", doubledDay: "first" }], {}),
		],
	])("refuses %s, as every other part of a config does", (_label, conventions) => {
		const error = thrownBy(() => withConventions(conventions()));
		expect(error?.code).toBe(INVALID);
		expect(error?.message).toContain("not plain data");
	});

	it("does not read a convention an entry only inherits", () => {
		const entry = Object.assign(Object.create({ doubledDay: "first" }), { id: "tara" });
		const error = thrownBy(() => withConventions([entry]));
		expect(error?.code).toBe(INVALID);
		expect(error?.message).toContain('conventions entry "tara" sets nothing');
	});

	it("changes a convention on a rule that carries none of its own, taking it out of the defaults", () => {
		const result = withConventions([{ id: "chokhor-duchen", leapMonth: "regular" }], {
			leapMonth: "leap",
		});
		expect(ruleIn(EXAMPLE_OBSERVANCES, "chokhor-duchen").leapMonth).toBeUndefined();
		expect(ruleIn(result, "chokhor-duchen").leapMonth).toBe("regular");
		const dates = getObservances(iso("2024-07-01"), iso("2024-08-31"), result)
			.filter((o) => o.rule.id === "chokhor-duchen")
			.map((o) => `${o.date.isoDate.toString()} ${o.resolution}`);
		expect(dates).toEqual(["2024-08-08 exact"]);
	});

	it("leaves the layer's defaults reaching every rule the conventions do not name", () => {
		const result = withConventions([{ id: "tara", doubledDay: "first" }], { doubledDay: "first" });
		expect(result.doubledDay).toBe("first");
		expect(ruleIn(result, "medicine-buddha").doubledDay).toBe("both");
		expect(ruleIn(result, "chokhor-duchen").doubledDay).toBeUndefined();
		const kopanDates = getObservances(iso("2024-07-01"), iso("2024-07-31"), result)
			.filter((o) => o.rule.id === "chokhor-duchen")
			.map((o) => o.date.isoDate.toString());
		expect(kopanDates).toEqual(["2024-07-09"]);
	});

	it.each([
		[
			"an id the base lacks",
			{ replace: [{ id: "nope", leapMonth: "regular" }] },
			'replace names "nope"',
		],
		[
			"an id also in conventions",
			{ replace: [{ id: "tara" }], conventions: [{ id: "tara", doubledDay: "first" }] },
			"appears 2 times, in replace and conventions",
		],
	])(
		"refuses a partial replace with %s for that, before saying it is partial",
		(_label, patch, fragment) => {
			const error = thrownBy(() => composeObservances(EXAMPLE_OBSERVANCES, layer(patch)));
			expect(error?.code).toBe(INVALID);
			expect(error?.message).toContain(fragment);
		},
	);

	it("names the layer whose key is unknown", () => {
		const error = thrownBy(() => composeObservances(EXAMPLE_OBSERVANCES, layer({ adds: [] })));
		expect(error?.message).toContain('composeObservances(layer "layer") has no key "adds"');
	});

	it("tells a partial replace that replace takes whole rules", () => {
		const error = thrownBy(() =>
			composeObservances(
				EXAMPLE_OBSERVANCES,
				layer({ replace: [{ id: "chokhor-duchen", leapMonth: "regular" }] }),
			),
		);
		expect(error?.code).toBe(INVALID);
		expect(error?.message).toContain('replace entry "chokhor-duchen" lacks englishName, when');
		expect(error?.message).toContain("conventions");
	});

	it("refuses the key misspelt as convention", () => {
		const error = thrownBy(() =>
			composeObservances(
				EXAMPLE_OBSERVANCES,
				layer({ convention: [{ id: "tara", doubledDay: "first" }] }),
			),
		);
		expect(error?.code).toBe(INVALID);
		expect(error?.message).toContain('has no key "convention"');
	});
});

describe("composeObservances: hostile values nested in rules and levels", () => {
	const values: [string, unknown][] = [
		["function", () => 1],
		["Symbol", Symbol("x")],
		["bigint", 10n],
		[
			"throwing getter",
			{
				get boom() {
					throw new Error("getter");
				},
			},
		],
	];
	const sites: [string, (x: unknown) => [ObservanceConfig, unknown]][] = [
		["added rule tags", (x) => [plainBase(), layer({ add: [monthly("q", { tags: [x] })] })]],
		[
			"added rule when.days",
			(x) => [
				plainBase(),
				layer({ add: [monthly("q", { when: { type: "monthly", days: [x] } })] }),
			],
		],
		[
			"added rule when.dates month",
			(x) => [
				plainBase(),
				layer({
					add: [monthly("q", { when: { type: "annual", dates: [{ month: x, day: 1 }] } })],
				}),
			],
		],
		[
			"added rule englishName",
			(x) => [plainBase(), layer({ add: [monthly("q", { englishName: x })] })],
		],
		["added rule level", (x) => [plainBase(), layer({ add: [monthly("q", { level: x })] })]],
		["replaced rule tags", (x) => [plainBase(), layer({ replace: [monthly("a", { tags: [x] })] })]],
		[
			"replaced rule englishName",
			(x) => [plainBase(), layer({ replace: [monthly("a", { englishName: x })] })],
		],
		[
			"replaced rule when.days",
			(x) => [
				plainBase(),
				layer({ replace: [monthly("a", { when: { type: "monthly", days: [x] } })] }),
			],
		],
		[
			"added level englishName",
			(x) => [plainBase(), layer({ addLevels: [{ id: "n", englishName: x }] })],
		],
		[
			"added level tibetanName part",
			(x) => [
				plainBase(),
				layer({ addLevels: [{ id: "n", englishName: "N", tibetanName: { ...NAME, wylie: x } }] }),
			],
		],
		[
			"base rule tags",
			(x) => {
				const base = plainBase();
				(base.rules[0] as unknown as { tags: unknown[] }).tags = [x];
				return [base, layer()];
			},
		],
		[
			"base level tibetanName part",
			(x) => {
				const base = plainBase();
				(
					(base.levels as unknown as { tibetanName: { wylie: unknown } }[])[0] as {
						tibetanName: { wylie: unknown };
					}
				).tibetanName.wylie = x;
				return [base, layer()];
			},
		],
	];
	const cases = sites.flatMap(([site, build]) =>
		values.map(([name, value]) => [`${site} holding a ${name}`, build, value] as const),
	);
	it.each(cases)("%s is refused with a code", (_label, build, value) => {
		const [base, l] = build(value);
		const error = thrownBy(() => composeObservances(base, l as ObservanceLayer));
		expect(error?.constructor?.name).not.toBe("DOMException");
		expect(error?.code).toBe(INVALID);
		// The validator refuses it, naming what is wrong. The copy's own refusal, which a Proxy gets,
		// would also carry the code, so without this a copy made before validation would pass.
		expect(error?.message).not.toMatch(/could not be copied/);
	});
});

// A Proxy with no traps is indistinguishable from its target to every read the validator makes, so
// it passes validation, and `structuredClone` then refuses it. That refusal is the caller's input
// being the wrong kind of thing, and it carries a code. A Proxy whose trap throws is refused with the
// same code, and the caller's own error is its `cause`.
describe("composeObservances: a Proxy standing for a whole rule or level", () => {
	const proxied = <T extends object>(target: T): T => new Proxy(target, {});
	const rule = () => monthly("q");
	const sites: [string, () => [ObservanceConfig, ObservanceLayer]][] = [
		["an added rule", () => [plainBase(), layer({ add: [proxied(rule())] })]],
		["a replaced rule", () => [plainBase(), layer({ replace: [proxied(monthly("a"))] })]],
		[
			"an added level",
			() => [plainBase(), layer({ addLevels: [proxied({ id: "n", englishName: "N" })] })],
		],
		[
			"a base rule",
			() => {
				const base = plainBase();
				(base.rules as unknown as object[])[0] = proxied(base.rules[0] as object);
				return [base, layer()];
			},
		],
		["the layer's tibetanName", () => [plainBase(), layer({ tibetanName: proxied({ ...NAME }) })]],
	];

	it.each(sites)("%s is refused with a code, not a DOMException", (_label, build) => {
		const [base, l] = build();
		const error = thrownBy(() => composeObservances(base, l));
		expect(error?.constructor?.name).not.toBe("DOMException");
		expect(error?.code).toBe(INVALID);
	});
});

describe("composeObservances reads its layer once, afresh", () => {
	const taraOf = (config: ObservanceConfig) => config.rules.find((rule) => rule.id === "tara");

	it("a conventions array edited between composes is read afresh", () => {
		const conventions: { id: string; doubledDay: string }[] = [{ id: "tara", doubledDay: "first" }];
		const layer = { id: "l", englishName: "L", conventions } as unknown as ObservanceLayer;
		expect(taraOf(composeObservances(EXAMPLE_OBSERVANCES, layer))?.doubledDay).toBe("first");
		(conventions[0] as { doubledDay: string }).doubledDay = "second";
		expect(taraOf(composeObservances(EXAMPLE_OBSERVANCES, layer))?.doubledDay).toBe("second");
		(conventions[0] as { doubledDay: string }).doubledDay = "bogus";
		expect(thrownBy(() => composeObservances(EXAMPLE_OBSERVANCES, layer))?.code).toBe(INVALID);
	});

	it("gives the composed config the id it validated, when the id getter changes its answer", () => {
		const answers = ["first", "second", "third", "fourth"];
		const layer = Object.defineProperty({ englishName: "L" }, "id", {
			enumerable: true,
			get: () => answers.shift() ?? "later",
		}) as unknown as ObservanceLayer;
		const composed = composeObservances(EXAMPLE_OBSERVANCES, layer);
		expect(composed.id).toBe("first");
	});
});
