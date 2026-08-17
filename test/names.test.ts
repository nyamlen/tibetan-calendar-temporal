/**
 * The shipped name vocabulary must match what the verification harness produced.
 *
 * @remarks
 * `scripts/verify-name-sources.mjs` needs the network and two converters installed outside this
 * repository, so it is run by hand before a release rather than in CI. That leaves a gap: nothing
 * would stop a hand-edit to `src/names.ts` between runs.
 *
 * This file closes it. `test/fixtures/names.ts` is the harness's own output, committed, and the
 * suite asserts `src/names.ts` agrees with it character for character. So the *provenance* is
 * checked before a release and the *integrity* is checked on every push, which is the same division
 * the other generated fixtures already use.
 */

import { describe, expect, it } from "vitest";
import {
	animalNameOf,
	elementNameOf,
	genderNameOf,
	NAME_TABLES,
	weekdayNameOf,
} from "../src/names.js";
import { PHUGPA } from "../src/traditions/phugpa.js";
import type { TibetanAnimal, TibetanElement, TibetanGender } from "../src/types.js";
import {
	ANIMAL_NAMES,
	ELEMENT_NAMES,
	GENDER_NAMES,
	WEEKDAY_ATTRIBUTES,
	WEEKDAY_NAMES,
} from "./fixtures/names.js";
import { assertNoDiscouragedCodepoints } from "./support/unicode-tibetan.js";

describe("src/names.ts matches the verified fixture", () => {
	it.each(WEEKDAY_NAMES)("weekday $key is $wylie", (row) => {
		const name = weekdayNameOf(Number(row.key), 0);
		expect(name.tibetan).toBe(row.tibetan);
		expect(name.wylie).toBe(row.wylie);
		expect(name.phonetic).toBe(row.phonetic);
	});

	it.each(WEEKDAY_ATTRIBUTES)("weekday $key is the $planet day", (row) => {
		const name = weekdayNameOf(Number(row.key), 0);
		expect(name.planet).toBe(row.planet);
		expect(name.element).toBe(row.element);
	});

	it.each(ELEMENT_NAMES)("element $key is $wylie", (row) => {
		expect(elementNameOf(row.key as TibetanElement)).toEqual({
			tibetan: row.tibetan,
			wylie: row.wylie,
			phonetic: row.phonetic,
		});
	});

	it.each(GENDER_NAMES)("gender $key is $wylie", (row) => {
		expect(genderNameOf(row.key as TibetanGender)).toEqual({
			tibetan: row.tibetan,
			wylie: row.wylie,
			phonetic: row.phonetic,
		});
	});

	it.each(ANIMAL_NAMES)("animal $key is $wylie", (row) => {
		expect(animalNameOf(row.key as TibetanAnimal)).toEqual({
			tibetan: row.tibetan,
			wylie: row.wylie,
			phonetic: row.phonetic,
		});
	});
});

describe("Saturday carries the correction, not Janson's slip", () => {
	it("is spen pa", () => {
		// Janson's day-of-week table prints `spen ma`. Wiktionary has no entry for it and CLDR's bo
		// locale disagrees; both give `spen pa`, which is also the form behind the name *penpa*.
		expect(weekdayNameOf(0, 0).wylie).toBe("spen pa");
		expect(weekdayNameOf(0, 0).wylie).not.toBe("spen ma");
	});

	it("agrees with CLDR, which is a lineage entirely independent of Janson", () => {
		const saturday = Temporal.PlainDate.from("2026-02-14");
		for (let weekday = 0; weekday < 7; weekday += 1) {
			const cldr = saturday
				.add({ days: weekday })
				.toLocaleString("bo", { weekday: "long" })
				.replace("གཟའ་", "")
				.replace(/་$/, "");
			expect(weekdayNameOf(weekday, 0).tibetan, `weekday ${weekday}`).toBe(cldr);
		}
	});
});

describe("the Bhutanese weekday-name offset", () => {
	it("shifts the name by one planet and nothing else", () => {
		// Janson calls this "a unique feature of the Bhutanese calendar": day 0 is spen pa in Tibet
		// and nyi ma in Bhutan.
		expect(weekdayNameOf(0, 1).wylie).toBe("nyi ma");
		expect(weekdayNameOf(1, 1).wylie).toBe("zla ba");
		expect(weekdayNameOf(6, 1).wylie).toBe("spen pa");
	});

	it("matches CLDR's dz locale, which is independent of Janson", () => {
		const saturday = Temporal.PlainDate.from("2026-02-14");
		for (let weekday = 0; weekday < 7; weekday += 1) {
			const cldr = saturday
				.add({ days: weekday })
				.toLocaleString("dz", { weekday: "long" })
				.replace("གཟའ་", "")
				.replace(/་$/, "");
			expect(weekdayNameOf(weekday, 1).tibetan, `weekday ${weekday}`).toBe(cldr);
		}
	});
});

describe("the tables are frozen", () => {
	it("refuses a write, because they are shared by every date", () => {
		// A TibetanDate holds a pointer to these, not a copy. Shared and mutable would reproduce the
		// bug CLAUDE.md records for the monthsFor cache: one consumer's write corrupting every other.
		expect(() => {
			(weekdayNameOf(0, 0) as { wylie: string }).wylie = "x";
		}).toThrow(TypeError);
		expect(() => {
			(NAME_TABLES as unknown as Record<string, unknown>).WEEKDAYS = [];
		}).toThrow(TypeError);
	});

	it("hands out the same object every time", () => {
		expect(weekdayNameOf(0, 0)).toBe(weekdayNameOf(0, 0));
		expect(elementNameOf("fire")).toBe(elementNameOf("fire"));
	});
});

describe("Unicode safety", () => {
	it("uses no discouraged composite vowel sign", () => {
		const every = [...WEEKDAY_NAMES, ...ELEMENT_NAMES, ...GENDER_NAMES, ...ANIMAL_NAMES];
		for (const row of every) {
			expect(() => assertNoDiscouragedCodepoints(row.tibetan, row.wylie)).not.toThrow();
		}
	});

	it("survives every normalisation form", () => {
		for (const row of [...WEEKDAY_NAMES, ...ANIMAL_NAMES]) {
			for (const form of ["NFC", "NFD", "NFKC", "NFKD"] as const) {
				expect(row.tibetan.normalize(form), `${row.wylie} under ${form}`).toBe(row.tibetan);
			}
		}
	});
});

describe("the shipped config", () => {
	it("declares no naming offset, so Phugpa gets the Tibetan names", () => {
		expect(PHUGPA.naming).toBeUndefined();
	});
});
