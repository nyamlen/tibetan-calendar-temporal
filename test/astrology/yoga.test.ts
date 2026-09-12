import { describe, expect, it } from "vitest";
import { MANSION_ELEMENTS, mansionElement } from "../../src/astrology/mansion-elements.js";
import { MANSION_COUNT, mansionNumber } from "../../src/astrology/mansions.js";
import { ELEMENTAL_YOGAS, elementalYoga, yogaForMansion } from "../../src/astrology/yoga.js";
import { trueMonthCount } from "../../src/computation/calendar.js";
import { isoToTibetan } from "../../src/computation/conversion.js";
import { yearFromRoyalEra } from "../../src/computation/epoch.js";
import { scalingFor } from "../../src/computation/scaling.js";
import { weekdayNameFor } from "../../src/cycles.js";
import { PHUGPA } from "../../src/traditions/phugpa.js";
import type { TibetanWeekdayElement } from "../../src/types.js";

/**
 * The ten pairings, and the one structural property that matters: the pair is **unordered**.
 *
 * Janson says so outright — "the order of these two elements does not matter and the combination is
 * regarded as an unordered pair" — so symmetry is his definition rather than a convenience, and a
 * lookup keyed on the arrival order would silently produce twenty yogas where there are ten.
 */

const ELEMENTS: readonly TibetanWeekdayElement[] = ["earth", "water", "fire", "wind"];

const scaled = scalingFor(PHUGPA);

const iso = (s: string) => Temporal.PlainDate.from(s);

describe("the ten yogas", () => {
	it("are exactly ten, which is what an unordered pair of four elements gives", () => {
		// 4 matched + 6 mixed. Eleven would mean a duplicate; nine, a missing row.
		expect(ELEMENTAL_YOGAS).toHaveLength(10);
	});

	it("cover every pairing of the four elements exactly once", () => {
		const covered = new Set<string>();
		for (const first of ELEMENTS) {
			for (const second of ELEMENTS) covered.add(elementalYoga(first, second).sanskrit);
		}
		expect(covered.size).toBe(10);
		expect([...covered].sort()).toEqual(ELEMENTAL_YOGAS.map((y) => y.sanskrit).sort());
	});

	it("are symmetric in their arguments", () => {
		const bad: string[] = [];
		for (const first of ELEMENTS) {
			for (const second of ELEMENTS) {
				const forward = elementalYoga(first, second);
				const backward = elementalYoga(second, first);
				if (forward !== backward) bad.push(`${first}+${second} ≠ ${second}+${first}`);
			}
		}
		expect(bad).toEqual([]);
	});

	it("return one object per yoga, so two days sharing one are comparable by identity", () => {
		// The pair is printed as Henning prints it rather than re-sorted, so what makes two days
		// comparable is object identity, not a canonical tuple. Asserted because the alternative — a
		// fresh object per call — would pass every other test here and quietly break `===`.
		expect(elementalYoga("fire", "water")).toBe(elementalYoga("water", "fire"));
		expect(elementalYoga("fire", "water").elements).toEqual(["fire", "water"]);
	});

	it("hold six of the ten favorable, which is FPMT's division", () => {
		// Janson ranks none of them and Henning's page carries the names rather than the judgement, so
		// this count is FPMT's sole claim. `test/validation/fpmt-observances.test.ts` checks it day by
		// day against their printed prefixes.
		expect(ELEMENTAL_YOGAS.filter((yoga) => yoga.favorable)).toHaveLength(6);
		expect(ELEMENTAL_YOGAS.filter((yoga) => !yoga.favorable).map((yoga) => yoga.sanskrit)).toEqual([
			"alābha",
			"pratikūla",
			"dahana",
			"maraṇa",
		]);
	});

	it("hold every matched pair favorable and no mixed pair involving fire and water", () => {
		// Structural, from the table's own shape: the four same-element yogas are all favorable, and
		// fire+water is the one the sources call death.
		const matched = ELEMENTAL_YOGAS.filter((yoga) => yoga.elements[0] === yoga.elements[1]);
		expect(matched).toHaveLength(4);
		expect(matched.every((yoga) => yoga.favorable)).toBe(true);
		expect(elementalYoga("fire", "water").english).toBe("death");
	});

	it("carry a name in all three columns for every row", () => {
		const bad = ELEMENTAL_YOGAS.filter(
			(yoga) => !yoga.sanskrit || !yoga.wylie || !yoga.english,
		).map((yoga) => yoga.elements.join("+"));
		expect(bad).toEqual([]);
	});

	it("is frozen, like every other shipped table here", () => {
		expect(Object.isFrozen(ELEMENTAL_YOGAS)).toBe(true);
		expect(Object.isFrozen(ELEMENTAL_YOGAS[0])).toBe(true);
		expect(Object.isFrozen(ELEMENTAL_YOGAS[0]?.elements)).toBe(true);
	});
});

describe("a yoga from a mansion number", () => {
	it("answers for every one of the 27 mansions", () => {
		const bad: string[] = [];
		for (let index = 0; index < MANSION_COUNT; index++) {
			const yoga = yogaForMansion("fire", index);
			if (!yoga.sanskrit) bad.push(`mansion ${index}`);
			if (!yoga.elements.includes(mansionElement(index))) bad.push(`mansion ${index}: element`);
		}
		expect(bad).toEqual([]);
	});

	it("uses the Indian four and never a Chinese element", () => {
		// `wood` and `iron` are year elements and cannot appear here. A table accidentally typed
		// against `TibetanElement` would pass a typecheck and fail this.
		expect(new Set(MANSION_ELEMENTS)).toEqual(new Set(["earth", "water", "fire", "wind"]));
	});
});

describe("the two halves of a doubled day", () => {
	/**
	 * The bug A2 named, and the one a test checking only that a value came back cannot see.
	 *
	 * A doubled date is two calendar days sharing one Tibetan `(month, day)`. Their Julian days
	 * differ by one, so the **weekday element differs and therefore the yoga differs** — and
	 * `mansionNumber` cannot tell them apart from the Tibetan date alone, which is why it takes
	 * `firstOfDoubledPair`. Computing the yoga from the date fields gives both days one answer, and
	 * it is wrong for the first.
	 */
	it("get different yogas, and equality here is the bug", () => {
		// 2024-05-15 and 2024-05-16 are both Tibetan month 4 day 8; the first carries isLeapDay.
		const first = isoToTibetan(iso("2024-05-15"), PHUGPA);
		const second = isoToTibetan(iso("2024-05-16"), PHUGPA);
		expect(first.day).toBe(second.day);
		expect(first.month).toBe(second.month);
		expect(first.isDoubledDay).toBe(true);
		expect(first.isLeapDay).toBe(true);
		expect(second.isLeapDay).toBe(false);

		const yogaOf = (date: typeof first) => {
			const monthCount = trueMonthCount(
				PHUGPA,
				yearFromRoyalEra(date.year),
				date.month,
				date.isLeapMonth,
			);
			const weekday = weekdayNameFor(date.tibetanWeekday, PHUGPA).element;
			return yogaForMansion(weekday, mansionNumber(scaled, date.day, monthCount, date.isLeapDay));
		};

		// The weekday element alone already differs, since the Julian days are consecutive.
		expect(weekdayNameFor(first.tibetanWeekday, PHUGPA).element).not.toBe(
			weekdayNameFor(second.tibetanWeekday, PHUGPA).element,
		);
		expect(yogaOf(first).sanskrit).not.toBe(yogaOf(second).sanskrit);
	});
});
