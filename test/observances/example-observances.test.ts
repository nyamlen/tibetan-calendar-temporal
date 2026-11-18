import { describe, expect, it } from "vitest";
import { EXAMPLE_OBSERVANCES } from "../../src/observances/index.js";
import type { ObservanceRule } from "../../src/observances/types.js";
import { OBSERVANCE_NAMES } from "../fixtures/observance-names.js";

const rule = (id: string): ObservanceRule => {
	const found = EXAMPLE_OBSERVANCES.rules.find((r) => r.id === id);
	if (found === undefined) throw new Error(`no rule ${id}`);
	return found;
};

const ANNIVERSARIES = [
	["milarepa", "Milarepa", 1, 14],
	["guru-rinpoche", "Guru Rinpoche", 5, 10],
	["gampopa", "Gampopa", 6, 15],
	["karmapa-16", "Sixteenth Karmapa", 9, 9],
	["tsongkhapa", "Lama Tsong Khapa", 10, 25],
	["sakya-pandita", "Sakya Pandita", 11, 14],
	["dudjom-rinpoche", "Dudjom Rinpoche", 11, 18],
] as const;

describe("EXAMPLE_OBSERVANCES", () => {
	it("declares three levels, named by requirement, in this order", () => {
		expect(EXAMPLE_OBSERVANCES.levels).toEqual([
			{ id: "everyone", englishName: "For everyone" },
			{ id: "no-empowerment", englishName: "Practitioners, no empowerment needed" },
			{ id: "empowerment", englishName: "Practitioners, empowerment required" },
		]);
	});

	it("gives every rule a level that the config declares", () => {
		const declared = new Set(EXAMPLE_OBSERVANCES.levels?.map((l) => l.id));
		const undeclared = EXAMPLE_OBSERVANCES.rules
			.filter((r) => r.level === undefined || !declared.has(r.level))
			.map((r) => `${r.id}: ${String(r.level)}`);
		expect(undeclared).toEqual([]);
	});

	it("ships these nineteen rules, by id, and no other", () => {
		expect(EXAMPLE_OBSERVANCES.rules.map((r) => r.id).sort()).toEqual(
			[
				"chotrul-duchen",
				"saga-dawa-duchen",
				"chokhor-duchen",
				"lhabab-duchen",
				"saga-dawa-month",
				"sojong",
				"medicine-buddha",
				"tara",
				"fire-puja",
				"heruka-day",
				"dakini-day",
				"dharma-protector-day",
				...ANNIVERSARIES.map(([id]) => id),
			].sort(),
		);
	});

	it("keeps FPMT's doubled-day, skipped-day and leap-month conventions at the top", () => {
		expect([
			EXAMPLE_OBSERVANCES.doubledDay,
			EXAMPLE_OBSERVANCES.skippedDay,
			EXAMPLE_OBSERVANCES.leapMonth,
		]).toEqual(["second", "preceding", "leap"]);
	});

	it("names the four düchens as FPMT prints them, tagged duchen and merit-multiplying, for everyone", () => {
		const expected: Record<string, string> = {
			"chotrul-duchen": "Day of Miracles",
			"saga-dawa-duchen": "Lord Buddha's birth, enlightenment and parinirvana",
			"chokhor-duchen": "Lord Buddha's first teaching",
			"lhabab-duchen": "Lord Buddha's descent from God Realm of Thirty Three",
		};
		for (const [id, englishName] of Object.entries(expected)) {
			expect({
				id,
				englishName: rule(id).englishName,
				tags: rule(id).tags,
				level: rule(id).level,
			}).toEqual({
				id,
				englishName,
				tags: ["duchen", "merit-multiplying"],
				level: "everyone",
			});
		}
		expect(
			EXAMPLE_OBSERVANCES.rules.filter((r) => r.tags?.includes("duchen")).map((r) => r.id),
		).toEqual(Object.keys(expected));
	});

	it.each(ANNIVERSARIES)(
		"ships %s as FPMT labels it, on %i/%i, tagged anniversary",
		(id, name, month, day) => {
			const r = rule(id);
			expect([r.englishName, r.level, r.tags]).toEqual([name, "everyone", ["anniversary"]]);
			expect(r.when).toEqual({ type: "annual", dates: [{ month, day }] });
		},
	);

	it("shares the tag anniversary with exactly those seven rules", () => {
		expect(
			EXAMPLE_OBSERVANCES.rules.filter((r) => r.tags?.includes("anniversary")).map((r) => r.id),
		).toEqual(ANNIVERSARIES.map(([id]) => id));
	});

	it("holds the Saga Dawa month as a period of the whole 4th month", () => {
		const r = rule("saga-dawa-month");
		expect([r.englishName, r.level]).toEqual(["Saga Dawa, Lord Buddha's month", "everyone"]);
		expect(r.when).toEqual({
			type: "period",
			first: { month: 4, day: 1 },
			last: { month: 4, day: 30 },
		});
	});

	it("holds sojong as the counted schedule, overriding the config's two day conventions", () => {
		const r = rule("sojong");
		expect([r.englishName, r.level, r.doubledDay, r.skippedDay, r.leapMonth]).toEqual([
			"Sojong (vow renewal)",
			"no-empowerment",
			"first",
			"following",
			undefined,
		]);
		expect(r.when).toEqual({
			type: "counted",
			anchor: { month: 1, day: 15 },
			waxingDays: 15,
			waningDays: { oddMonth: 14, evenMonth: 15 },
			exclude: [{ month: 1, day: 1 }],
		});
	});

	it("holds the fire puja as the formula, labelled as drawn from a restricted practice", () => {
		const r = rule("fire-puja");
		expect([r.englishName, r.level, r.tags]).toEqual([
			"Fire puja",
			"no-empowerment",
			["from-restricted-practice", "practice"],
		]);
		expect(r.when).toEqual({ type: "formula", formula: "lunarDayPlusWeekdayMod4" });
	});

	it("holds every monthly rule to the printed numbers: both halves of a doubled day, none for a skipped one", () => {
		const monthly = EXAMPLE_OBSERVANCES.rules.filter((r) => r.when.type === "monthly");
		expect(monthly.map((r) => r.id)).toEqual([
			"medicine-buddha",
			"tara",
			"heruka-day",
			"dakini-day",
			"dharma-protector-day",
		]);
		for (const r of monthly)
			expect([r.id, r.doubledDay, r.skippedDay]).toEqual([r.id, "both", "omit"]);
	});

	it("gives the monthly rules their days, names, levels and tags", () => {
		const row = (id: string) => {
			const r = rule(id);
			return [r.englishName, r.level, r.tags, r.when];
		};
		expect(row("medicine-buddha")).toEqual([
			"Medicine Buddha puja",
			"no-empowerment",
			["practice"],
			{ type: "monthly", days: [8, 15] },
		]);
		expect(row("tara")).toEqual([
			"Tara puja",
			"no-empowerment",
			["practice"],
			{ type: "monthly", days: [8] },
		]);
		expect(row("heruka-day")).toEqual([
			"Heruka Day",
			"no-empowerment",
			["tsok", "practice"],
			{ type: "monthly", days: [10] },
		]);
		expect(row("dakini-day")).toEqual([
			"Ḍākinī Day",
			"no-empowerment",
			["tsok", "practice"],
			{ type: "monthly", days: [25] },
		]);
		expect(row("dharma-protector-day")).toEqual([
			"Dharma Protector Day",
			"empowerment",
			["tsok", "practice"],
			{ type: "monthly", days: [29] },
		]);
	});
});

describe("the example's tags", () => {
	it("tags every rule", () => {
		expect(EXAMPLE_OBSERVANCES.rules.filter((r) => !r.tags?.length).map((r) => r.id)).toEqual([]);
	});

	it("tags each rule as ruled", () => {
		const duchen = ["duchen", "merit-multiplying"];
		const anniversary = ["anniversary"];
		const tsok = ["tsok", "practice"];
		expect(Object.fromEntries(EXAMPLE_OBSERVANCES.rules.map((r) => [r.id, r.tags]))).toEqual({
			"chotrul-duchen": duchen,
			"saga-dawa-duchen": duchen,
			"chokhor-duchen": duchen,
			"lhabab-duchen": duchen,
			milarepa: anniversary,
			"guru-rinpoche": anniversary,
			gampopa: anniversary,
			"karmapa-16": anniversary,
			tsongkhapa: anniversary,
			"sakya-pandita": anniversary,
			"dudjom-rinpoche": anniversary,
			"saga-dawa-month": ["merit-multiplying"],
			sojong: ["practice"],
			"fire-puja": ["from-restricted-practice", "practice"],
			"medicine-buddha": ["practice"],
			tara: ["practice"],
			"heruka-day": tsok,
			"dakini-day": tsok,
			"dharma-protector-day": tsok,
		});
	});
});

describe("the Tibetan names the example ships", () => {
	const shipping = EXAMPLE_OBSERVANCES.rules.filter((r) => r.tibetanName !== undefined);

	it("equal the verified fixture, character for character", () => {
		const wrong: string[] = [];
		for (const row of OBSERVANCE_NAMES) {
			const name = rule(row.id).tibetanName;
			if (
				name?.tibetan !== row.tibetan ||
				name.wylie !== row.wylie ||
				name.phonetic !== row.phonetic
			) {
				wrong.push(row.id);
			}
		}
		expect(wrong).toEqual([]);
	});

	it("belong to exactly the fourteen rules the fixture verifies, and to no other", () => {
		expect(OBSERVANCE_NAMES).toHaveLength(14);
		expect(shipping.map((r) => r.id).sort()).toEqual(OBSERVANCE_NAMES.map((r) => r.id).sort());
	});

	it("are the four düchens, Saga Dawa, sojong, the fire puja and the seven anniversaries", () => {
		expect(shipping.map((r) => r.id).sort()).toEqual(
			[
				"chotrul-duchen",
				"saga-dawa-duchen",
				"chokhor-duchen",
				"lhabab-duchen",
				"saga-dawa-month",
				"sojong",
				"fire-puja",
				...ANNIVERSARIES.map(([id]) => id),
			].sort(),
		);
	});

	it("carry no key beyond the three a TibetanName has in this layer", () => {
		for (const r of shipping) {
			expect(Object.keys(r.tibetanName ?? {}).sort()).toEqual(["phonetic", "tibetan", "wylie"]);
		}
	});
});
