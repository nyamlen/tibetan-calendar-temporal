import { describe, expect, it } from "vitest";
import {
	attributesFor,
	calendarDayAttributesFor,
	elementalYogaFor,
	lunarDayAttributesFor,
	monthAttributesFor,
	yearAttributesFor,
} from "../../src/astrology/index.js";
import { isoToTibetan, tibetanDateExists } from "../../src/computation/conversion.js";
import { weekdayNameFor } from "../../src/cycles.js";
import { BHUTAN } from "../../src/traditions/bhutan.js";
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
		expect(first.yoga.sanskrit).toBe("maraṇa");
		expect(second.yoga.sanskrit).toBe("pratikūla");
	});

	it("differs on the calendar day and the yoga, because there are two calendar days", () => {
		// The half of the docblock that reads like a bug. It is the two-clocks point: the lunar day is
		// a thirtieth of a lunation and the calendar day runs sunrise to sunrise, so a doubled date is
		// one lunar day wearing two calendar days.
		expect(first.calendarDay).not.toEqual(second.calendarDay);
		expect(first.yoga).not.toBe(second.yoga);
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
		expect(
			thrownBy(() => attributesFor(iso("+012000-01-01"), { tradition: PHUGPA_HENNING }))?.code,
		).toBe("TCT_OUTSIDE_EXACT_RANGE");
	});
});
describe("the yoga's weekday element is tradition-free", () => {
	/**
	 * Janson gives the yoga's weekday element in one table, states Bhutan's name shift separately as a
	 * naming feature, and never revisits the yoga for it. So the engine takes his printed table and
	 * does not let `naming.weekdayOffset` propagate — following the shifted *name* would be an
	 * inference nobody has published, and external validation here is Phugpa only.
	 *
	 * Until 2026-09-12 the offset did propagate, which gave Bhutan a different yoga on 12 of 14
	 * consecutive days and made two shipped claims false: `TraditionNaming.weekdayOffset`'s "applies to
	 * the name only", and `docs/astrology.md`'s "the yoga varies only through the mansion".
	 */
	it("pairs the unshifted weekday element even under a tradition that shifts the name", () => {
		const bad: string[] = [];
		let day = iso("2026-09-01");
		for (let i = 0; i < 28; i++) {
			const resolved = isoToTibetan(day, BHUTAN);
			// Bhutan's own naming says one planet on; the yoga must still use the element Janson's
			// weekday table gives for that weekday number.
			const shifted = weekdayNameFor(resolved.tibetanWeekday, BHUTAN).element;
			const unshifted = weekdayNameFor(resolved.tibetanWeekday, PHUGPA).element;
			const yoga = elementalYogaFor(day, { tradition: BHUTAN });
			if (!yoga.elements.includes(unshifted)) {
				bad.push(`${day}: ${yoga.elements.join("+")} omits ${unshifted}`);
			}
			if (shifted !== unshifted && yoga.elements.every((e) => e === shifted)) {
				bad.push(`${day}: both halves are Bhutan's shifted ${shifted}`);
			}
			day = day.add({ days: 1 });
		}
		expect(bad).toEqual([]);
	});

	it("still lets the mansion differ between traditions, which is the one thing that should", () => {
		// docs/astrology.md: "the yoga varies only through the mansion". Bhutan's month count differs
		// from Phugpa's, so some days genuinely disagree — the claim is about the *route*, not about
		// the answers being identical. A suite asserting equality outright would be wrong.
		let day = iso("2026-09-01");
		let differing = 0;
		for (let i = 0; i < 28; i++) {
			if (
				elementalYogaFor(day, { tradition: PHUGPA }).sanskrit !==
				elementalYogaFor(day, { tradition: BHUTAN }).sanskrit
			) {
				differing++;
			}
			day = day.add({ days: 1 });
		}
		expect(differing).toBeGreaterThan(0);
		// And far fewer than the weekday offset produced: it moved 12 of every 14.
		expect(differing).toBeLessThan(14);
	});
});
