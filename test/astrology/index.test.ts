import { describe, expect, it } from "vitest";
import { TRIGRAM_NAMES } from "../../src/astrology/calendar-day.js";
import {
	attributesFor,
	calendarDayAttributesFor,
	elementalYoga,
	elementalYogaFor,
	lunarDayAttributesFor,
	lunarMansionFor,
	monthAttributesFor,
	yearAttributesFor,
} from "../../src/astrology/index.js";
import { isoToTibetan, tibetanDateExists } from "../../src/computation/conversion.js";
import { NAME_TABLES } from "../../src/names.js";
import { BHUTAN, BHUTAN_HENNING } from "../../src/traditions/bhutan.js";
import { PHUGPA, PHUGPA_HENNING } from "../../src/traditions/phugpa.js";
import { thrownBy } from "../support/thrown.js";

/**
 * The subpath's own behaviour, as distinct from its export list — which `test/public-api.test.ts`
 * pins.
 *
 * What is worth testing here is the composition's *semantics*: which parts of a doubled pair agree,
 * that a leap month takes its twin's attributes, and that a skipped lunar day can still be asked
 * about. Each is a claim a docblock makes, and each reads like a bug to anyone who has not met the
 * calendar.
 */

const iso = (s: string) => Temporal.PlainDate.from(s);

describe("the composition on a doubled date", () => {
	// 2024-05-15 and 2024-05-16 are both Tibetan month 4 day 8.
	const first = attributesFor(iso("2024-05-15"));
	const second = attributesFor(iso("2024-05-16"));

	it("shares the year, month and lunar day, because there is one lunar day", () => {
		expect(first.date.day).toBe(second.date.day);
		expect(first.date.isDoubledDay).toBe(true);
		expect(first.year).toEqual(second.year);
		expect(first.month).toEqual(second.month);
		expect(first.lunarDay).toEqual(second.lunarDay);
	});

	it("gives each half the yoga its own calendar day earns, by value", () => {
		// **Pinned by VALUE, not by difference, and that is the whole point of this test.** Asserting
		// only that the two halves differ cannot fail for the bug it is meant to catch: their weekday
		// elements differ either way, so the inequality holds even when `attributesFor` forgets to pass
		// `isLeapDay` down to the mansion. A code review proved that on 2026-09-12 by deleting the flag
		// and watching all 990 tests stay green, while 19 of 31 doubled-first days changed answer —
		// including this one, from maraṇa to amṛta.
		expect(first.yoga?.sanskritName.iast).toBe("maraṇa");
		expect(second.yoga?.sanskritName.iast).toBe("pratikūla");
	});

	it("differs on the calendar day, because there are two calendar days", () => {
		// The half of the docblock that reads like a bug. It is the two-clocks point: the lunar day is
		// a thirtieth of a lunation and the calendar day runs sunrise to sunrise, so a doubled date is
		// one lunar day wearing two calendar days. Pinned by value: the halves are a rabbit day and
		// a dragon day, consecutive in the twelve-animal cycle.
		expect([first.calendarDay.animal, second.calendarDay.animal]).toEqual(["rabbit", "dragon"]);
	});

	it("can nevertheless give both halves one yoga, so the yoga is not what tells them apart", () => {
		// Until 2026-09-23 five shipped sites said the two halves "differ" in yoga. The weekday element
		// always changes, but the mansion can change with it and land the pair on the same one: 9 and
		// 10 July 2024, both Tibetan day 4, are both *death*, from mansion 8 (water) to 9 (fire).
		const july9 = attributesFor(iso("2024-07-09"));
		const july10 = attributesFor(iso("2024-07-10"));
		expect([july9.date.day, july9.date.isLeapDay, july10.date.day, july10.date.isLeapDay]).toEqual([
			4,
			true,
			4,
			false,
		]);
		expect([july9.lunarMansion.index, july10.lunarMansion.index]).toEqual([8, 9]);
		expect([july9.yoga?.englishName, july10.yoga?.englishName]).toEqual(["death", "death"]);
	});

	it("marks which half is which, so a caller can tell them apart", () => {
		expect(first.date.isLeapDay).toBe(true);
		expect(second.date.isLeapDay).toBe(false);
	});
});

describe("a leap month and the regular month sharing its number", () => {
	it("take the same attributes, which is Janson's stated rule", () => {
		// 2151 has a leap month 6. Nothing in the attribute formulas reads the leap flag — the month
		// number is the whole input — so this is the rule holding rather than a coincidence.
		const leap = monthAttributesFor({ year: 2151, month: 6, isLeapMonth: true });
		const regular = monthAttributesFor({ year: 2151, month: 6 });
		expect(leap).toEqual(regular);
	});

	it("still rejects a leap flag for a year with no leap month of that number", () => {
		// The flag is validated rather than ignored: it makes no difference to the answer, but it is
		// still a caller error, and every other month-taking function in this package says so.
		const error = thrownBy(() => monthAttributesFor({ year: 2153, month: 5, isLeapMonth: true }));
		expect(error?.code).toBe("TCT_NO_SUCH_LEAP_MONTH");
	});
});

describe("a skipped lunar day", () => {
	it("has attributes even though no calendar day carries it", () => {
		// 2150 month 12 day 29 is skipped: the engine refuses to convert it, and an almanac still
		// prints its labels. This is why `lunarDayAttributesFor` takes Tibetan fields rather than a
		// resolved date — a `TibetanDate` for this day cannot exist.
		expect(tibetanDateExists({ year: 2150, month: 12, day: 29 }, PHUGPA)).toBe(false);

		const attributes = lunarDayAttributesFor({ year: 2150, month: 12, day: 29 });
		expect(attributes.animal).toBeDefined();
		expect(attributes.number).toBeGreaterThanOrEqual(1);
		expect(attributes.number).toBeLessThanOrEqual(9);
	});

	it("is refused by the day number, not by the calendar", () => {
		// Thirty lunar days always, even where the calendar skips one. 31 is a caller error.
		expect(thrownBy(() => lunarDayAttributesFor({ year: 2153, month: 1, day: 31 }))?.code).toBe(
			"TCT_FIELD_OUT_OF_RANGE",
		);
		expect(thrownBy(() => lunarDayAttributesFor({ year: 2153, month: 1, day: 0 }))?.code).toBe(
			"TCT_FIELD_OUT_OF_RANGE",
		);
	});
});

describe("the primitives and the composition agree", () => {
	const day = iso("2026-09-01");
	const whole = attributesFor(day);
	const resolved = isoToTibetan(day, PHUGPA);

	it("on the yoga", () => {
		expect(elementalYogaFor(day)).toBe(whole.yoga);
	});

	it("on the calendar day", () => {
		expect(calendarDayAttributesFor(day)).toEqual(whole.calendarDay);
	});

	it("on the year, reached through the royal era", () => {
		expect(yearAttributesFor(resolved.year)).toEqual(whole.year);
	});

	it("on the month and the lunar day", () => {
		expect(monthAttributesFor(resolved)).toEqual(whole.month);
		expect(lunarDayAttributesFor(resolved)).toEqual(whole.lunarDay);
	});
});

describe("the year entry point", () => {
	it("rejects a non-integer year with the range code", () => {
		for (const year of [1.5, Number.NaN, "2153" as unknown as number]) {
			expect(thrownBy(() => yearAttributesFor(year))?.code, `${year}`).toBe(
				"TCT_FIELD_OUT_OF_RANGE",
			);
		}
	});

	it("needs no tradition and no calendar, so it answers outside the exact range", () => {
		// The reason it takes a bare year: a year picker rendering a century asks this a hundred times
		// and never asks a day question, and the closed forms hold where the astronomy must refuse.
		expect(yearAttributesFor(12_000).power).toBeDefined();
		// `PHUGPA_HENNING` rather than `PHUGPA`: its exact range is the narrower of the two, because its
		// `a₂` denominator is 105,840 against Phugpa's 28. Phugpa itself still converts this date, which
		// is why the suite that pins this code uses Henning's config too.
		expect(thrownBy(() => attributesFor(iso("+012000-01-01"), PHUGPA_HENNING))?.code).toBe(
			"TCT_OUTSIDE_EXACT_RANGE",
		);
	});
});
describe("the yoga is unsourced under a shifted weekday", () => {
	/**
	 * Under a nonzero `naming.weekdayOffset` the whole weekday moves (name, planet and element), and
	 * no source says what the yoga's weekday element is then. So the yoga is refused rather than
	 * answered from either table. It was answered from the unshifted table until 2026-11-16, which
	 * paired a Bhutanese Saturday's name with the element of a different day.
	 */
	const BHUTANESE = [BHUTAN, BHUTAN_HENNING];

	it("is refused by the primitive with TCT_ATTRIBUTE_NOT_SOURCED, under both Bhutanese configs", () => {
		for (const tradition of BHUTANESE) {
			for (const day of ["2026-09-01", "2026-02-14", "2024-05-15"]) {
				const error = thrownBy(() => elementalYogaFor(iso(day), tradition));
				expect(error?.code, `${tradition.name} ${day}`).toBe("TCT_ATTRIBUTE_NOT_SOURCED");
			}
		}
	});

	it("is refused on every one of 14 consecutive days, so the refusal is not a weekday's", () => {
		const bad: string[] = [];
		let day = iso("2026-09-01");
		for (let i = 0; i < 14; i++) {
			const code = thrownBy(() => elementalYogaFor(day, BHUTAN))?.code;
			if (code !== "TCT_ATTRIBUTE_NOT_SOURCED") bad.push(`${day}: ${code}`);
			day = day.add({ days: 1 });
		}
		expect(bad).toEqual([]);
	});

	it("is reached through the config's weekdayOffset, not through the tradition's name", () => {
		const renamed = { ...PHUGPA, name: "bhutan-looking", naming: { weekdayOffset: 1 } };
		expect(thrownBy(() => elementalYogaFor(iso("2026-09-01"), renamed))?.code).toBe(
			"TCT_ATTRIBUTE_NOT_SOURCED",
		);
		const unshifted = { ...BHUTAN, naming: { weekdayOffset: 0 } };
		expect(elementalYogaFor(iso("2026-09-01"), unshifted).englishName).toBe("death");
	});

	it("leaves tibetanDateExists true for the date, and throws a RangeError rather than a skipped-day error", () => {
		const resolved = isoToTibetan(iso("2026-09-01"), BHUTAN);
		expect(tibetanDateExists(resolved, BHUTAN)).toBe(true);
		expect(thrownBy(() => elementalYogaFor(iso("2026-09-01"), BHUTAN))).toBeInstanceOf(RangeError);
	});

	it("reports null in the composition and leaves every other attribute as it was", () => {
		for (const tradition of BHUTANESE) {
			const day = iso("2026-09-01");
			const attributes = attributesFor(day, tradition);
			expect(attributes.yoga, tradition.name).toBeNull();
			expect(attributes.lunarMansion, tradition.name).toEqual(lunarMansionFor(day, tradition));
			expect(attributes.calendarDay, tradition.name).toEqual(attributesFor(day).calendarDay);
			expect(attributes.year, tradition.name).toEqual(attributesFor(day).year);
			expect(attributes.date, tradition.name).toEqual(isoToTibetan(day, tradition));
		}
	});

	it("leaves Phugpa's yoga unchanged, pinned by value", () => {
		for (const tradition of [PHUGPA, PHUGPA_HENNING]) {
			expect(elementalYogaFor(iso("2026-09-01"), tradition).englishName).toBe("death");
			expect(attributesFor(iso("2024-05-15"), tradition).yoga?.sanskritName.iast).toBe("maraṇa");
			expect(attributesFor(iso("2024-05-16"), tradition).yoga?.sanskritName.iast).toBe("pratikūla");
		}
	});

	it("keeps the element-pair primitive free of any tradition", () => {
		expect(elementalYoga("fire", "water").sanskritName.iast).toBe("maraṇa");
	});
});

describe("every attribute block names its labels in Tibetan", () => {
	/**
	 * `tibetanNames` sits beside the English fields rather than replacing them, so nothing structural
	 * ties the two together: a label added to a block without its Tibetan entry would ship unnamed, and
	 * a stale entry would name a field that is gone. So the expected keys are **derived from each block's
	 * own string fields** — never listed — and every value must be the shared name object for that
	 * field's word, looked up by the field's vocabulary: a trigram's "fire" is not the element's.
	 */
	const vocabulary = (field: string): Readonly<Record<string, unknown>> =>
		field === "trigram"
			? TRIGRAM_NAMES
			: field === "animal"
				? NAME_TABLES.ANIMALS
				: field === "gender"
					? NAME_TABLES.GENDERS
					: NAME_TABLES.ELEMENTS;

	it("has one name per English label, and only those, on every block over four years", () => {
		const bad: string[] = [];
		for (let offset = 0; offset < 4 * 365; offset += 5) {
			const date = iso("2024-01-01").add({ days: offset });
			const day = attributesFor(date);
			const blocks: [string, object | null][] = [
				["year", day.year],
				["month", day.month],
				["lunarDay", day.lunarDay],
				["calendarDay", day.calendarDay],
			];
			for (const [name, block] of blocks) {
				if (block === null) {
					bad.push(`${date} ${name} is null under Phugpa`);
					continue;
				}
				const { tibetanNames, ...rest } = block as Record<string, unknown> & {
					tibetanNames: Record<string, unknown>;
				};
				const labels: Record<string, unknown> = Object.fromEntries(
					Object.entries(rest).filter(([, value]) => typeof value === "string"),
				);
				if (name === "calendarDay") Object.assign(labels, rest.elements);
				const expected = Object.keys(labels).sort().join(",");
				const got = Object.keys(tibetanNames).sort().join(",");
				if (got !== expected) bad.push(`${date} ${name}: names ${got}, labels ${expected}`);
				for (const [field, word] of Object.entries(labels)) {
					if (tibetanNames[field] !== vocabulary(field)[word as string])
						bad.push(`${date} ${name}.${field} "${word}" carries the wrong Tibetan name`);
				}
				if (Object.keys(block).at(-1) !== "tibetanNames")
					bad.push(`${date} ${name}: tibetanNames is not the last key`);
			}
		}
		expect(bad).toEqual([]);
	});
});

describe("the lunar mansion for a date", () => {
	it("gives the documented example's mansion by value", () => {
		// 1 September 2026, whose yoga is "death": fire weekday against a water mansion.
		expect(lunarMansionFor(iso("2026-09-01"))).toEqual({
			index: 26,
			tibetanName: { tibetan: "ནམ་གྲུ", wylie: "nam gru", phonetic: "namdru" },
			sanskritName: { iast: "revatī", devanagari: "रेवती" },
			element: "water",
		});
	});

	it("prints the index first and the names before the element", () => {
		// The key-first rule: a mansion has no English name, so its identifying key is the index.
		expect(Object.keys(lunarMansionFor(iso("2026-09-01")))).toEqual([
			"index",
			"tibetanName",
			"sanskritName",
			"element",
		]);
	});

	it("puts the two halves of a doubled date in the mansions their own mornings fall in", () => {
		// Pinned by value, not as an inequality: the pair's weekday elements differ whatever the
		// mansion does, so an inequality on the yoga says nothing about the mansion, and only the index
		// itself can catch isLeapDay being dropped.
		const brief = (m: ReturnType<typeof lunarMansionFor>) => [
			m.index,
			m.sanskritName.iast,
			m.element,
		];
		expect(brief(lunarMansionFor(iso("2024-05-15")))).toEqual([7, "puṣya", "fire"]);
		expect(brief(lunarMansionFor(iso("2024-05-16")))).toEqual([8, "aśleṣā", "water"]);
		expect(brief(lunarMansionFor(isoToTibetan(iso("2024-05-15"))))).toEqual([7, "puṣya", "fire"]);
	});

	it("is the mansion the composition reports, and the one its yoga was built from", () => {
		for (const day of ["2024-05-15", "2024-05-16", "2025-11-19", "2026-09-01"]) {
			const attributes = attributesFor(iso(day));
			expect(attributes.lunarMansion, day).toEqual(lunarMansionFor(iso(day)));
			expect(attributes.yoga, day).toBe(elementalYogaFor(iso(day)));
		}
	});

	it("refuses loose fields, which name neither calendar", () => {
		expect(thrownBy(() => lunarMansionFor({ year: 2153, month: 1, day: 1 } as never))?.code).toBe(
			"TCT_INVALID_ARGUMENT",
		);
	});

	it("refuses a malformed tradition with the config code, as every root function does", () => {
		// Until 2026-09-24 the tradition came in a `{ tradition }` bag, and a bad bag got
		// TCT_INVALID_ARGUMENT from the bag guard. Positional, it reaches the config validator.
		for (const tradition of [null, 5, [], { tradition: BHUTAN }]) {
			expect(
				thrownBy(() => lunarMansionFor(iso("2026-09-01"), tradition as never))?.code,
				JSON.stringify(tradition),
			).toBe("TCT_INVALID_TRADITION_CONFIG");
		}
	});
});

describe("the tradition is the last parameter, positional", () => {
	// Until 2026-09-24 these took `{ tradition }`, and from plain JavaScript a positional BHUTAN was
	// read as an empty bag and silently answered Phugpa's. Each pin is a value that differs.
	it("answers Bhutan's month as null in the composition", () => {
		expect(attributesFor(iso("2026-09-01"), BHUTAN).month).toBeNull();
		expect(attributesFor(iso("2026-09-01"), BHUTAN).lunarDay).toBeNull();
	});

	it("refuses Bhutan's unsourced month and lunar-day attributes", () => {
		expect(thrownBy(() => monthAttributesFor({ year: 2153, month: 1 }, BHUTAN))?.code).toBe(
			"TCT_ATTRIBUTE_NOT_SOURCED",
		);
		expect(
			thrownBy(() => lunarDayAttributesFor({ year: 2153, month: 1, day: 1 }, BHUTAN))?.code,
		).toBe("TCT_ATTRIBUTE_NOT_SOURCED");
	});

	it("gives Bhutan's mansion where it differs from Phugpa's", () => {
		// 8 September 2026: Phugpa's month count puts the moon in mansion 6, Bhutan's in 7.
		expect(lunarMansionFor(iso("2026-09-08")).index).toBe(6);
		expect(lunarMansionFor(iso("2026-09-08"), BHUTAN).index).toBe(7);
	});
});

describe("yearAttributesFor at the extreme safe integers", () => {
	const representative = (year: number) => {
		const r = ((year % 180) + 180) % 180;
		return 2000 + ((r - 2000 + 180 * 1000) % 180);
	};

	it("equals the answer for a small year in the same class mod 180, at both ends", () => {
		const bad: string[] = [];
		for (let k = 0; k < 3000; k++) {
			for (const year of [Number.MIN_SAFE_INTEGER + k, Number.MAX_SAFE_INTEGER - k]) {
				const rep = representative(year);
				if (((rep % 180) + 180) % 180 !== ((year % 180) + 180) % 180) {
					bad.push(`${year}: bad representative ${rep}`);
					continue;
				}
				if (JSON.stringify(yearAttributesFor(year)) !== JSON.stringify(yearAttributesFor(rep))) {
					bad.push(`${year} differs from ${rep}`);
				}
			}
		}
		expect(bad).toEqual([]);
	});

	it("pins a value: MIN_SAFE_INTEGER is a horse year with cyclePosition 19", () => {
		const got = yearAttributesFor(Number.MIN_SAFE_INTEGER);
		expect(got.animal).toBe("horse");
		expect(got.cyclePosition).toBe(19);
	});

	it("pins the top: MAX_SAFE_INTEGER is a monkey year, cyclePosition 21, power wood", () => {
		const got = yearAttributesFor(Number.MAX_SAFE_INTEGER);
		expect(got.animal).toBe("monkey");
		expect(got.cyclePosition).toBe(21);
		expect(got.power).toBe("wood");
	});

	it("has period 180 over 1900 to 2400, and no proper divisor of 180 is one", () => {
		const key = (y: number) => JSON.stringify(yearAttributesFor(y));
		const failures: number[] = [];
		for (let y = 1900; y < 2400; y++) if (key(y) !== key(y + 180)) failures.push(y);
		expect(failures).toEqual([]);
		for (const d of [1, 2, 3, 4, 5, 6, 9, 10, 12, 15, 18, 20, 30, 36, 45, 60, 90]) {
			let differs = false;
			for (let y = 1900; y < 2080 && !differs; y++) differs = key(y) !== key(y + d);
			expect(differs, `period ${d}`).toBe(true);
		}
	});
});
