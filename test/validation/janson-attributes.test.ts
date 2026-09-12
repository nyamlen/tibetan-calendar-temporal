import { describe, expect, it } from "vitest";
import {
	JANSON_LIFE_ELEMENTS,
	JANSON_MONTH_ANIMALS,
	JANSON_YEAR_ELEMENTS,
} from "../fixtures/janson-attributes.js";

/**
 * What this suite can and cannot settle.
 *
 * Janson computed these tables from the same formulas the engine will implement, so agreement
 * catches a **transcription error or a misread formula** — which is most of the risk in a layer of
 * closed forms. It cannot catch a shared misreading of the paper, and it is therefore *not*
 * external corroboration in the sense `docs/validation-sources.md` uses. The external witness for
 * the attribute layer is FPMT's day-quality codes, and it covers the yoga only.
 *
 * Until the attribute functions exist, this suite holds the fixture to the structure Janson states
 * in prose around the tables. Those statements are independent of the tables themselves, so a
 * parse that silently shifted a column fails here.
 */

const ELEMENTS = ["wood", "fire", "earth", "iron", "water"];
const ANIMALS = [
	"mouse",
	"ox",
	"tiger",
	"rabbit",
	"dragon",
	"snake",
	"horse",
	"sheep",
	"monkey",
	"bird",
	"dog",
	"pig",
];

describe("the sixty-year element table", () => {
	it("covers every cycle position exactly once", () => {
		expect(JANSON_YEAR_ELEMENTS).toHaveLength(60);
		expect(JANSON_YEAR_ELEMENTS.map((row) => row.chinese)).toEqual(
			Array.from({ length: 60 }, (_, i) => i + 1),
		);
		expect(new Set(JANSON_YEAR_ELEMENTS.map((row) => row.indian)).size).toBe(60);
	});

	it("uses only the five elements and the twelve animals", () => {
		const bad: string[] = [];
		for (const row of JANSON_YEAR_ELEMENTS) {
			for (const [field, value] of Object.entries(row)) {
				if (typeof value !== "string") continue;
				const known = field === "animal" ? ANIMALS : ELEMENTS;
				if (!known.includes(value)) bad.push(`${row.chinese} ${field}=${value}`);
			}
		}
		expect(bad).toEqual([]);
	});

	it("repeats the power element two years at a time, in the standard order", () => {
		// Janson: the power element is the celestial stem's, repeated 2 consecutive years in the
		// order wood, fire, earth, iron, water. A shifted column breaks this immediately.
		const bad: string[] = [];
		for (const row of JANSON_YEAR_ELEMENTS) {
			const expected = ELEMENTS[Math.floor(((row.chinese - 1) % 10) / 2)];
			if (row.power !== expected) bad.push(`${row.chinese}: ${row.power} ≠ ${expected}`);
		}
		expect(bad).toEqual([]);
	});

	it("never gives a year earth as its fortune element", () => {
		// Janson states the fortune element uses only four, on a 4-year cycle: "Earth is not used."
		expect(JANSON_YEAR_ELEMENTS.some((row) => row.fortune === "earth")).toBe(false);
	});

	it("makes every third year's life element earth, and its spirit element fire", () => {
		// Janson: each third year is earth for life (the years ≡ 2 mod 3) and fire for spirit.
		const bad: string[] = [];
		for (const row of JANSON_YEAR_ELEMENTS) {
			const third = row.chinese % 3 === 2;
			if (third && (row.life !== "earth" || row.spirit !== "fire")) {
				bad.push(`${row.chinese}: life=${row.life} spirit=${row.spirit}`);
			}
			if (!third && (row.life === "earth" || row.spirit === "fire")) {
				bad.push(`${row.chinese}: unexpected earth/fire off the third-year cycle`);
			}
		}
		expect(bad).toEqual([]);
	});

	it("repeats the body element for two consecutive years, on a 30-year cycle", () => {
		const bad: string[] = [];
		for (const row of JANSON_YEAR_ELEMENTS) {
			const thirty = JANSON_YEAR_ELEMENTS.find(
				(other) => other.chinese === ((row.chinese + 29) % 60) + 1,
			);
			if (thirty && thirty.body !== row.body) {
				bad.push(`${row.chinese} body=${row.body} vs +30 ${thirty.body}`);
			}
		}
		expect(bad).toEqual([]);
	});
});

describe("life and spirit elements are consistent between the two tables that print them", () => {
	// T60e and Tlife are parsed independently from different parts of the paper. The generator
	// already refuses to emit when they disagree; this is the same check from the other side, so a
	// change that removed the generator's guard still fails here.
	it("agrees at every one of the sixty positions", () => {
		const byAnimal = new Map(JANSON_LIFE_ELEMENTS.map((row) => [row.animal, row]));
		const bad: string[] = [];
		for (const row of JANSON_YEAR_ELEMENTS) {
			const entry = byAnimal.get(row.animal);
			if (!entry) {
				bad.push(`${row.animal} missing from Tlife`);
			} else if (entry.life !== row.life || entry.spirit !== row.spirit) {
				bad.push(
					`${row.chinese} ${row.animal}: T60e ${row.life}/${row.spirit} vs Tlife ${entry.life}/${entry.spirit}`,
				);
			}
		}
		expect(bad).toEqual([]);
	});
});

describe("the month-animal table", () => {
	it("has all twelve months, in order", () => {
		// The regression this pins: the table's last row omits its LaTeX row terminator, so a
		// terminator-based reader silently returns months 1-11 plus the header — right shape, right
		// count, wrong data. That is how this fixture first parsed.
		expect(JANSON_MONTH_ANIMALS.map((row) => row.month)).toEqual(
			Array.from({ length: 12 }, (_, i) => i + 1),
		);
	});

	it("starts Phugpa at Dragon and Tsurphu at Tiger", () => {
		expect(JANSON_MONTH_ANIMALS[0]?.phugpa).toBe("dragon");
		expect(JANSON_MONTH_ANIMALS[0]?.tsurphu).toBe("tiger");
	});

	it("runs each tradition through all twelve animals without repeating", () => {
		expect(new Set(JANSON_MONTH_ANIMALS.map((row) => row.phugpa)).size).toBe(12);
		expect(new Set(JANSON_MONTH_ANIMALS.map((row) => row.tsurphu)).size).toBe(12);
	});

	it("keeps the two traditions exactly two animals apart, all the way round", () => {
		// Phugpa's month 1 is Dragon (animal 5) and Tsurphu's is Tiger (animal 3), and the offset
		// holds for every month. A column shifted in one tradition and not the other breaks this
		// where a per-row check would not.
		const bad: string[] = [];
		for (const row of JANSON_MONTH_ANIMALS) {
			const offset = (ANIMALS.indexOf(row.phugpa) - ANIMALS.indexOf(row.tsurphu) + 12) % 12;
			if (offset !== 2) bad.push(`month ${row.month}: ${row.phugpa}/${row.tsurphu} → ${offset}`);
		}
		expect(bad).toEqual([]);
	});

	it("makes odd months male and even months female", () => {
		const bad: string[] = [];
		for (const row of JANSON_MONTH_ANIMALS) {
			const expected = row.month % 2 === 1 ? "male" : "female";
			if (row.gender !== expected) bad.push(`month ${row.month}: ${row.gender}`);
		}
		expect(bad).toEqual([]);
	});
});
