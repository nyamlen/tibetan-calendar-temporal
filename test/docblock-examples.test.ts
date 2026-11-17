import { describe, expect, it } from "vitest";
import {
	attributesFor,
	calendarDayAttributesFor,
	ELEMENTAL_YOGAS,
	elementalYoga,
	elementalYogaFor,
	LUNAR_MANSIONS,
	lunarDayAttributesFor,
	lunarMansionFor,
	monthAttributesFor,
	yearAttributesFor,
} from "../src/astrology/index.js";
import { lunarDayAttributes } from "../src/astrology/lunar-day.js";
import { mansionNumber } from "../src/astrology/mansions.js";
import { monthAttributes } from "../src/astrology/month.js";
import { monthFromCount, trueMonthCount } from "../src/computation/calendar.js";
import { isoToTibetan, losarFor, tibetanToIso } from "../src/computation/conversion.js";
import {
	rabjungFromYear,
	royalEraFromYear,
	yearFromRoyalEra,
	yearNameFromYear,
} from "../src/computation/epoch.js";
import { meanDate } from "../src/computation/mean-astronomy.js";
import { deriveScaling, scalingFor } from "../src/computation/scaling.js";
import { rabjungFor, weekdayNameFor, yearNameFor } from "../src/cycles.js";
import { formatTibetanDate } from "../src/format.js";
import { monthNamesFor } from "../src/month-names.js";
import { daysInMonth, leapMonthNumberFor, monthsFor, resolveMonth } from "../src/months.js";
import {
	addDays,
	addMonths,
	lunationFromMonth,
	monthFromLunation,
	monthsBetween,
	nextFullMoon,
} from "../src/navigation.js";
import { composeObservances, EXAMPLE_OBSERVANCES } from "../src/observances/index.js";
import { parseTibetanMonth } from "../src/parse.js";
import { BHUTAN } from "../src/traditions/bhutan.js";
import { PHUGPA } from "../src/traditions/phugpa.js";
import { asTibetanWeekday, type TibetanWeekday } from "../src/types.js";
import { thrownBy } from "./support/thrown.js";

/**
 * Every docblock `@example` in `src/` that states a concrete result, asserted.
 *
 * Docblocks reach the shipped `.d.ts` and are what editor hover renders, so a stale one is a false
 * contract statement rather than a tidying issue — and unlike the README, nothing was checking
 * them. `test/readme.test.ts` does exactly this job for the README and exists for the same reason.
 *
 * This suite found a live error on its first run: `leapMonthNumberFor` documented `2153 → 6`, when
 * 2153 has no leap month at all and 2151 is the year whose month 6 is doubled. It had shipped in
 * the type declarations.
 *
 * When you add an `@example` stating a value, assert it here in the same commit. When one changes,
 * this fails, which is the point.
 */
describe("docblock examples", () => {
	// index.ts's block is `@remarks` with a fenced example inside it, not `@example` — which is why
	// this suite never saw it, and why it shipped `date.yearName` in dist/index.d.ts for two days
	// after year-level naming came off TibetanDate on 2026-08-24. It is the entry point's headline
	// example and the first API prose a consumer meets on hover. A consumer spike found it.
	//
	// The lesson is the selector, not the line: this suite keys on `@example`, so a value stated in
	// any other tag is unguarded. Assert those here too.
	describe("index.ts — the package docblock", () => {
		it("states the four values its quickstart shows", () => {
			const date = isoToTibetan(Temporal.PlainDate.from("2027-01-15"));
			expect(date.year).toBe(2153);
			expect(date.yearStartsIn).toBe(2026);
			expect(yearNameFor(date.year)).toMatchObject({
				element: "fire",
				animal: "horse",
				gender: "male",
			});
			expect(formatTibetanDate(date)).toBe("2153-M12-08");
		});

		it("is right that a date carries no year-level naming", () => {
			const date = isoToTibetan(Temporal.PlainDate.from("2027-01-15"));
			expect("yearName" in date).toBe(false);
			expect("rabjung" in date).toBe(false);
			expect("weekdayName" in date).toBe(true);
		});
	});

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

		it("leapMonthNumberFor names the doubled month, or undefined", () => {
			expect(leapMonthNumberFor(2151)).toBe(6);
			expect(leapMonthNumberFor(2153)).toBeUndefined();
		});

		it("leapMonthNumberFor answers per tradition, so the example is Phugpa's alone", () => {
			// The docblock claims 2151 gives 6 for Phugpa, 5 for Mongolian, 10 for Bhutanese and
			// nothing for Tsurphu. Only `leapIndexThreshold` varies here — Janson's 48/0/46/57 — so
			// this pins the claim that the answer is tradition-specific, not the other constants.
			const forThreshold = (leapIndexThreshold: number) =>
				leapMonthNumberFor(2151, { ...PHUGPA, leapIndexThreshold });

			expect(forThreshold(48)).toBe(6);
			expect(forThreshold(46)).toBe(5);
			expect(forThreshold(57)).toBe(10);
			expect(forThreshold(0)).toBeUndefined();
		});

		it("resolveMonth states the leap month's code, first day and length", () => {
			const leap = resolveMonth({ year: 2151, month: 6, isLeapMonth: true });
			expect(leap.monthCode).toBe("M06L");
			expect(leap.firstDay.toString()).toBe("2024-07-06");
			expect(leap.days).toBe(30);
		});

		it("leapMonthNumberFor gives BHUTAN's leap month 8 in 2151, after its twin", () => {
			expect(leapMonthNumberFor(2151, BHUTAN)).toBe(8);
			expect(
				monthsFor(2151, BHUTAN)
					.map((month) => month.monthCode)
					.slice(6, 10),
			).toEqual(["M07", "M08", "M08L", "M09"]);
		});

		it("daysInMonth accepts a leap month and a date's own month", () => {
			expect(daysInMonth({ year: 2151, month: 6, isLeapMonth: true })).toBeTypeOf("number");
			expect(daysInMonth(isoToTibetan(Temporal.PlainDate.from("2026-08-12")))).toBeTypeOf("number");
		});
	});

	describe("month-names.ts", () => {
		it("monthNamesFor names Phugpa's month 1 in every system, and Bhutan's Tiger system null", () => {
			const names = monthNamesFor({ year: 2153, month: 1 });
			expect(names.mansion.tibetanName.wylie).toBe("mchu");
			expect(names.mansion.sanskritName.iast).toBe("maghā");
			expect(names.indianMonth.sanskritName.iast).toBe("māgha");
			expect(names.fourSeasons.month1LateWinter.season).toBe("winter");
			expect(names.fourSeasons.month1EarlySpring.tibetanName.wylie).toBe("dpyid zla ra ba");
			expect(names.fourSeasons.tigerEarlySpring?.part).toBe("late");
			expect(names.sixSeasons.month3EarlySpring.season).toBe("dewy");
			expect(
				monthNamesFor({ year: 2153, month: 1 }, BHUTAN).fourSeasons.tigerEarlySpring,
			).toBeNull();
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

		it("rabjungFor(2153).tibetanName states the Tibetan name at position 40, and only that", () => {
			const { tibetanName } = rabjungFor(2153);
			expect(tibetanName.tibetan).toBe("ཟིལ་གནོན");
			expect(tibetanName.wylie).toBe("zil gnon");
			// Neither Sanskrit list ships on this type. A consumer reaching for one gets `undefined`
			// rather than the wrong list's name, which is the whole point of the 2026-08-25 decision.
			expect("sanskrit" in tibetanName).toBe(false);
			expect("sanskritName" in rabjungFor(2153)).toBe(false);
		});

		it("weekdayNameFor gives Saturday as spen pa, the Saturn day", () => {
			// `spen pa`, not `spen ma` — Janson's own weekday table and his Bhutan appendix disagree,
			// and the wrong one reached a shipped docblock once already.
			expect(weekdayNameFor(asTibetanWeekday(0)).wylie).toBe("spen pa");
			expect(weekdayNameFor(asTibetanWeekday(0)).planet).toBe("saturn");
		});

		it("rejects a weekday outside 0…6 as a field out of range", () => {
			// This one genuinely is a range, so it keeps the range code — the split is not a blanket
			// rename of every guard in the module.
			// Cast, because the brand is what stops a TypeScript caller getting here at all. The guard
			// is for the JavaScript consumer and for a branded value that came from a cast like this
			// one — types erase, so it cannot be dropped just because the signature narrowed.
			expect(() => weekdayNameFor(7 as unknown as TibetanWeekday)).toThrow(
				expect.objectContaining({ code: "TCT_FIELD_OUT_OF_RANGE" }),
			);
			// asTibetanWeekday is the checked way in, and refuses the same value with the same code.
			expect(() => asTibetanWeekday(7)).toThrow(
				expect.objectContaining({ code: "TCT_FIELD_OUT_OF_RANGE" }),
			);
		});
	});

	describe("parse.ts", () => {
		it("parseTibetanMonth returns the leap month's three fields", () => {
			expect(parseTibetanMonth("2151-M06L")).toEqual({ year: 2151, month: 6, isLeapMonth: true });
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
	// `src/astrology/`'s docblocks compile into `dist/astrology/*.d.ts`, so their examples ship as
	// contract like every other module's.
	describe("observances/compose.ts", () => {
		it("composes Kopan's one-key layer on the example config", () => {
			const kopan = composeObservances(EXAMPLE_OBSERVANCES, {
				id: "kopan",
				englishName: "Kopan",
				doubledDay: "first",
			});
			expect(kopan.doubledDay).toBe("first");
			expect(kopan.rules).toEqual(EXAMPLE_OBSERVANCES.rules);
		});
	});
	describe("astrology/month.ts and astrology/lunar-day.ts", () => {
		it("states Phugpa's month 1 of 2026 correctly", () => {
			expect(monthAttributes(PHUGPA, 2026, 1)).toMatchObject({
				animal: "dragon",
				gender: "male",
				element: "iron",
				number: null,
			});
		});

		it("states the four labels of its first lunar day correctly", () => {
			const day = lunarDayAttributes(PHUGPA, 2026, 1, 1);
			expect(day).toMatchObject({
				animal: "tiger",
				element: "water",
				trigram: "water",
				number: 7,
			});
			expect(day.tibetanNames.trigram.wylie).toBe("kham");
		});
	});

	describe("astrology/mansions.ts", () => {
		it("states the mansion of 1 September 2026 as 26", () => {
			const resolved = isoToTibetan(Temporal.PlainDate.from("2026-09-01"), PHUGPA);
			expect([resolved.year, resolved.month, resolved.day]).toEqual([2153, 7, 19]);
			const scaled = scalingFor(PHUGPA);
			expect(trueMonthCount(scaled.tradition, yearFromRoyalEra(2153), 7, false)).toBe(15095);
			expect(mansionNumber(scaled, 19, 15095)).toBe(26);
		});
	});

	describe("astrology/index.ts", () => {
		it("states the yoga of 1 September 2026, and its refusal under BHUTAN", () => {
			const date = Temporal.PlainDate.from("2026-09-01");
			expect(attributesFor(date).yoga?.englishName).toBe("death");
			expect(elementalYogaFor(date).englishName).toBe("death");
			expect(attributesFor(date, BHUTAN).yoga).toBeNull();
			expect(thrownBy(() => elementalYogaFor(date, BHUTAN))?.code).toBe(
				"TCT_ATTRIBUTE_NOT_SOURCED",
			);
		});

		it("states the values of the other astrology examples", () => {
			const date = Temporal.PlainDate.from("2026-09-01");
			expect(yearAttributesFor(2153)).toMatchObject({
				power: "fire",
				life: "fire",
				body: "water",
				fortune: "iron",
			});
			expect(monthAttributesFor({ year: 2153, month: 1 })).toMatchObject({
				animal: "dragon",
				gender: "male",
				element: "iron",
				number: null,
			});
			const day = lunarDayAttributesFor({ year: 2153, month: 1, day: 1 });
			expect(day).toMatchObject({ animal: "tiger", element: "water", trigram: "water", number: 7 });
			expect(day.tibetanNames.trigram.wylie).toBe("kham");
			expect(calendarDayAttributesFor(date).gender).toBe("male");
			expect(LUNAR_MANSIONS[0]?.tibetanName.wylie).toBe("tha skar");
			expect(LUNAR_MANSIONS[26]?.sanskritName.iast).toBe("revatī");
			const mansion = lunarMansionFor(date);
			expect([mansion.element, mansion.sanskritName.iast, mansion.tibetanName.wylie]).toEqual([
				"water",
				"revatī",
				"nam gru",
			]);
			expect(attributesFor(date).year.power).toBe("fire");
			expect(attributesFor(date, BHUTAN).month).toBeNull();
			expect(elementalYoga("fire", "water").sanskritName.iast).toBe("maraṇa");
			expect(elementalYoga("water", "fire").favorable).toBe(false);
			expect(elementalYoga("water", "fire")).toBe(elementalYoga("fire", "water"));
			expect(ELEMENTAL_YOGAS).toHaveLength(10);
		});
	});

	describe("traditions/*.ts", () => {
		it("BHUTAN's example states Losar 2130 as 4 March 2003", () => {
			expect(losarFor(2130, BHUTAN).isoDate.toString()).toBe("2003-03-04");
		});

		it("epochMonth states which month true month count 0 is, per leap month position", () => {
			// `epochMonth` 3 throughout. Position "before": month 3 below the threshold, leap month 3
			// for the threshold and one more, month 2 above. Position "after": the same pattern with
			// the threshold plus 2, and the leap month is month 2.
			const countZero = (
				leapMonthPosition: "before" | "after",
				leapIndexThreshold: number,
				intercalationIndexAtEpoch: number,
			) =>
				monthFromCount(
					{ ...PHUGPA, leapMonthPosition, leapIndexThreshold, intercalationIndexAtEpoch },
					0,
				);
			const picture = (m: { month: number; isLeap: boolean }) =>
				`${m.isLeap ? "leap " : ""}month ${m.month}`;

			const before = [47, 48, 49, 50].map((beta) => picture(countZero("before", 48, beta)));
			expect(before).toEqual(["month 3", "leap month 3", "leap month 3", "month 2"]);
			const after = [58, 59, 60, 61].map((beta) => picture(countZero("after", 57, beta)));
			expect(after).toEqual(["month 3", "leap month 2", "leap month 2", "month 2"]);

			expect(picture(monthFromCount(PHUGPA, 0))).toBe("month 2");
			expect(picture(monthFromCount(BHUTAN, 0))).toBe("month 3");
		});

		it("leapIndexThreshold states that 59 is not Bhutan stated against the traditional index", () => {
			const differing = (leapIndexThreshold: number) => {
				const start = Temporal.PlainDate.from("2020-01-01");
				const other = { ...BHUTAN, leapIndexThreshold };
				let count = 0;
				for (let day = 0; day < 3650; day++) {
					const date = start.add({ days: day });
					const a = isoToTibetan(date, BHUTAN);
					const b = isoToTibetan(date, other);
					if (a.lunation !== b.lunation || a.isLeapMonth !== b.isLeapMonth) count++;
				}
				return count;
			};
			expect(differing(57)).toBe(0);
			expect(differing(59)).toBeGreaterThan(0);
		});
	});
});
