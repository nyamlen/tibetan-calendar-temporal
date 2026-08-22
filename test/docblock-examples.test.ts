import { describe, expect, it } from "vitest";
import { isoToTibetan, losarFor, tibetanToIso } from "../src/computation/conversion.js";
import { rabjungFromYear, royalEraFromYear, yearNameFromYear } from "../src/computation/epoch.js";
import { meanDate } from "../src/computation/mean-astronomy.js";
import { deriveScaling } from "../src/computation/scaling.js";
import {
	animalNameFor,
	elementNameFor,
	genderNameFor,
	rabjungFor,
	weekdayNameFor,
	yearNameFor,
} from "../src/cycles.js";
import { daysInMonth, leapMonthOfYear, monthsFor } from "../src/months.js";
import {
	addDays,
	addMonths,
	lunationFromMonth,
	monthFromLunation,
	monthsBetween,
	nextFullMoon,
} from "../src/navigation.js";
import { PHUGPA } from "../src/traditions/phugpa.js";
import type { TibetanAnimal, TibetanElement, TibetanGender } from "../src/types.js";

/**
 * Every docblock `@example` in `src/` that states a concrete result, asserted.
 *
 * Docblocks reach the shipped `.d.ts` and are what editor hover renders, so a stale one is a false
 * contract statement rather than a tidying issue — and unlike the README, nothing was checking
 * them. `test/readme.test.ts` does exactly this job for the README and exists for the same reason.
 *
 * This suite found a live error on its first run: `leapMonthOfYear` documented `2153 → 6`, when
 * 2153 has no leap month at all and 2151 is the year whose month 6 is doubled. It had shipped in
 * the type declarations.
 *
 * When you add an `@example` stating a value, assert it here in the same commit. When one changes,
 * this fails, which is the point.
 */
describe("docblock examples", () => {
	describe("conversion.ts", () => {
		it("losarFor states the right Losar, skipped day and leap-month opening", () => {
			expect(losarFor(2153).isoDate.toString()).toBe("2026-02-18");
			expect(losarFor(2104).day).toBe(2);
			expect(losarFor(2146).monthCode).toBe("M01L");
		});
	});

	describe("epoch.ts", () => {
		it("royalEraFromYear and rabjungFromYear match Janson's worked example", () => {
			expect(royalEraFromYear(2026)).toBe(2153);
			expect(rabjungFromYear(2007).cycle).toBe(17);
			expect(rabjungFromYear(2007).year).toBe(21);
		});

		it("yearNameFromYear names 2007 the female fire pig", () => {
			const name = yearNameFromYear(2007);
			expect(name.element).toBe("fire");
			expect(name.animal).toBe("pig");
			expect(name.gender).toBe("female");
			expect(name.animalName.wylie).toBe("phag");
		});
	});

	describe("scaling.ts and mean-astronomy.ts", () => {
		const scaled = deriveScaling(PHUGPA);

		it("derives Phugpa's common denominator", () => {
			expect(scaled.commonDenominator).toBe(102_317_040);
		});

		it("puts the epoch's mean date near 2015501.85", () => {
			// The docblock states an approximation, so this asserts the approximation it states.
			const atEpoch = meanDate(scaled, 0, 0) / scaled.meanDate.den;
			expect(Math.abs(atEpoch - 2015501.85)).toBeLessThan(0.01);
		});
	});

	describe("months.ts", () => {
		it("monthsFor gives a common year twelve months, opening on Losar", () => {
			expect(monthsFor(2153).length).toBe(12);
			expect(monthsFor(2153)[0]?.firstDay.toString()).toBe("2026-02-18");
		});

		it("monthsFor gives a leap year thirteen, with the leap month before its twin", () => {
			const leapYear = monthsFor(2151);
			expect(leapYear.length).toBe(13);
			expect(leapYear.map((month) => month.monthCode)).toEqual([
				"M01",
				"M02",
				"M03",
				"M04",
				"M05",
				"M06L",
				"M06",
				"M07",
				"M08",
				"M09",
				"M10",
				"M11",
				"M12",
			]);
		});

		it("leapMonthOfYear names the doubled month, or undefined", () => {
			expect(leapMonthOfYear(2151)).toBe(6);
			expect(leapMonthOfYear(2153)).toBeUndefined();
		});

		it("leapMonthOfYear answers per tradition, so the example is Phugpa's alone", () => {
			// The docblock claims 2151 gives 6 for Phugpa, 5 for Mongolian, 10 for Bhutanese and
			// nothing for Tsurphu. Only `leapIndexThreshold` varies here — Janson's 48/0/46/57 — so
			// this pins the claim that the answer is tradition-specific, not the other constants.
			const forThreshold = (leapIndexThreshold: number) =>
				leapMonthOfYear(2151, { ...PHUGPA, leapIndexThreshold });

			expect(forThreshold(48)).toBe(6);
			expect(forThreshold(46)).toBe(5);
			expect(forThreshold(57)).toBe(10);
			expect(forThreshold(0)).toBeUndefined();
		});

		it("daysInMonth accepts a leap month and a date's own month", () => {
			expect(daysInMonth({ year: 2151, month: 6, isLeapMonth: true })).toBeTypeOf("number");
			expect(daysInMonth(isoToTibetan(Temporal.PlainDate.from("2026-08-12")))).toBeTypeOf("number");
		});
	});

	describe("cycles.ts", () => {
		it("yearNameFor names 2153 the male fire horse, returning the animal every twelfth year", () => {
			const name = yearNameFor(2153);
			expect({ element: name.element, animal: name.animal, gender: name.gender }).toEqual({
				element: "fire",
				animal: "horse",
				gender: "male",
			});
			expect(yearNameFor(2130 + 12).animal).toBe(yearNameFor(2130).animal);
		});

		it("rabjungFor holds position across a full cycle", () => {
			expect(rabjungFor(2153).cycle).toBe(17);
			expect(rabjungFor(2153).year).toBe(40);
			expect(rabjungFor(2153 + 60).cycle).toBe(18);
			expect(rabjungFor(2153 + 60).year).toBe(40);
		});

		it("rabjungFor(2153).name states the Tibetan and Sanskrit name at position 40", () => {
			const { name } = rabjungFor(2153);
			expect(name.tibetan).toBe("ཟིལ་གནོན");
			expect(name.sanskrit.meaning).toBe("overthrow, defeat");
		});

		it("weekdayNameFor gives Saturday as spen pa, the Saturn day", () => {
			// `spen pa`, not `spen ma` — Janson's own weekday table and his Bhutan appendix disagree,
			// and the wrong one reached a shipped docblock once already.
			expect(weekdayNameFor(0).wylie).toBe("spen pa");
			expect(weekdayNameFor(0).planet).toBe("saturn");
		});

		it("the three vocabulary lookups return their documented names", () => {
			// These four functions are on the public surface and, before this suite, were called by
			// nothing but the export-shape test — `cycles.ts` sat at 37% function coverage.
			expect(elementNameFor("fire")).toEqual({ tibetan: "མེ", wylie: "me", phonetic: "mé" });
			expect(animalNameFor("horse")).toEqual({ tibetan: "རྟ", wylie: "rta", phonetic: "ta" });
			expect(genderNameFor("male")).toEqual({ tibetan: "ཕོ", wylie: "pho", phonetic: "po" });
		});

		it("rejects a member outside the union as a wrong-kind argument", () => {
			// TCT_INVALID_ARGUMENT, not TCT_FIELD_OUT_OF_RANGE: "Fire" is a bug in the calling code,
			// like the string outside parseTibetanDate's grammar, not bad data someone typed.
			// See docs/decisions/2026-08-15-argument-errors-split.md.
			for (const call of [
				() => elementNameFor("Fire" as TibetanElement),
				() => animalNameFor("rooster" as TibetanAnimal),
				() => genderNameFor("neuter" as TibetanGender),
			]) {
				expect(call).toThrow(expect.objectContaining({ code: "TCT_INVALID_ARGUMENT" }));
			}
		});

		it("rejects a weekday outside 0…6 as a field out of range", () => {
			// This one genuinely is a range, so it keeps the range code — the split is not a blanket
			// rename of every guard in the module.
			expect(() => weekdayNameFor(7)).toThrow(
				expect.objectContaining({ code: "TCT_FIELD_OUT_OF_RANGE" }),
			);
		});
	});

	describe("navigation.ts", () => {
		it("a lunation steps out of the leap month into its twin", () => {
			const n = lunationFromMonth({ year: 2151, month: 6, isLeapMonth: true });
			expect(monthFromLunation(n + 1).monthCode).toBe("M06");
		});

		it("a lunation crosses Losar with no gap", () => {
			const n = lunationFromMonth({ year: 2151, month: 12 });
			const crossing = monthFromLunation(n + 1);
			expect({ year: crossing.year, month: crossing.month }).toEqual({ year: 2152, month: 1 });
		});

		it("addMonths steps into the leap month, out of it, and across Losar", () => {
			expect(addMonths({ year: 2151, month: 5 }, 1).monthCode).toBe("M06L");
			expect(addMonths({ year: 2151, month: 5 }, 2).monthCode).toBe("M06");
			expect(addMonths({ year: 2151, month: 12 }, 1).year).toBe(2152);
		});

		it("monthsBetween counts the leap month in a leap year and not otherwise", () => {
			expect(monthsBetween({ year: 2151, month: 5 }, { year: 2151, month: 7 })).toBe(3);
			expect(monthsBetween({ year: 2153, month: 5 }, { year: 2153, month: 7 })).toBe(2);
		});

		it("addDays moves whole calendar days", () => {
			const start = { year: 2153, month: 12, day: 8 };
			const moved = addDays(start, 49);
			expect(moved.isoDate.toString()).toBe(tibetanToIso(start).add({ days: 49 }).toString());
		});

		it("nextFullMoon advances when fed its own result", () => {
			const first = nextFullMoon(Temporal.PlainDate.from("2026-08-12"));
			const second = nextFullMoon(first.isoDate);
			expect(Temporal.PlainDate.compare(second.isoDate, first.isoDate)).toBeGreaterThan(0);
		});
	});
});
