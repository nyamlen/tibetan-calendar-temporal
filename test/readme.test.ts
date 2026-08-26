import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	isoFromJulianDay,
	isoToTibetan,
	julianDayFromIso,
	losarFor,
	tibetanDateExists,
	tibetanToIso,
} from "../src/computation/conversion.js";
import { rabjungFor, yearNameFor } from "../src/cycles.js";
import { formatTibetanDate } from "../src/format.js";
import {
	datesFor,
	daysInMonth,
	hasLeapMonth,
	leapMonthNumberFor,
	monthsFor,
} from "../src/months.js";
import { addMonths, monthsBetween, nextFullMoon } from "../src/navigation.js";
import { getObservances } from "../src/observances/index.js";
import { PHUGPA_HENNING } from "../src/traditions/phugpa.js";

const iso = (s: string) => Temporal.PlainDate.from(s);

/**
 * Every claim the README's usage section makes, asserted exactly as written there.
 *
 * Examples in a README rot silently: nothing compiles them, and a reader who copies one that no
 * longer works concludes the library is broken. This suite is the reason the README can state
 * concrete outputs instead of hedging with "something like".
 *
 * Writing it caught a real error before publication — the leap-month example claimed
 * `{ month: 6, day: 4, isLeapMonth: true }` returned 9 July 2024 when it returns the 10th,
 * because that date is a doubled day and needs `isLeapDay` too. If an example here changes,
 * change the README in the same commit.
 */
describe("README usage examples", () => {
	const date = isoToTibetan(iso("2026-08-12"));

	// The quickstart, which is the most-read code in the repository and was the one example nothing
	// asserted. It states five values in the README's first 40 lines; a reader who copies it and gets
	// a different answer concludes the library is broken before reaching anything else.
	it("produces the quickstart's five values", () => {
		const day = isoToTibetan(iso("2026-08-23"));

		expect(formatTibetanDate(day)).toBe("2153-M07-11");
		expect(yearNameFor(day.year).element).toBe("fire");
		expect(rabjungFor(day.year).cycle).toBe(17);
		expect(rabjungFor(day.year).year).toBe(40);
		expect(day.weekdayName.phonetic).toBe("nyi ma");
		expect(day.isFullMoon).toBe(false);
	});

	it("converts a Western date", () => {
		expect(formatTibetanDate(date)).toBe("2153-M06-30");
		expect(date.month).toBe(6);
		expect(date.day).toBe(30);
	});

	it("serialises to the documented JSON", () => {
		expect(JSON.parse(JSON.stringify(date))).toEqual({
			year: 2153,
			yearStartsIn: 2026,
			month: 6,
			monthCode: "M06",
			isLeapMonth: false,
			day: 30,
			isDoubledDay: false,
			isLeapDay: false,
			isFullMoon: false,
			isNewMoon: true,
			isoDate: "2026-08-12",
			dayOfWeek: 3,
			tibetanWeekday: 4,
			weekdayName: {
				tibetan: "ལྷག་པ",
				wylie: "lhag pa",
				phonetic: "lhak pa",
				planet: "mercury",
				element: "water",
			},
			lunation: 15_094,
		});
	});

	it("converts back, with the royal-era year 127 ahead of yearStartsIn", () => {
		expect(tibetanToIso({ year: 2153, month: 6, day: 30 }).toString()).toBe("2026-08-12");
		expect(date.year - date.yearStartsIn).toBe(127);
	});

	it("builds the documented month grid", () => {
		const leapYear = monthsFor(2151);
		expect(leapYear.length).toBe(13);
		expect(leapYear.map((m) => m.monthCode).join(" ")).toBe(
			"M01 M02 M03 M04 M05 M06L M06 M07 M08 M09 M10 M11 M12",
		);
		expect(hasLeapMonth(2151)).toBe(true);
		expect(leapMonthNumberFor(2151)).toBe(6);

		const month = monthsFor(2153)[0];
		expect(month?.year).toBe(2153);
		expect(month?.yearName).toMatchObject({ element: "fire", animal: "horse", gender: "male" });
		expect(month?.monthCode).toBe("M01");
		expect(month?.days).toBe(29);
		expect(month?.firstDay.toString()).toBe("2026-02-18");
		expect(month?.lastDay.toString()).toBe("2026-03-18");
	});

	it("passes a month on without the year travelling separately", () => {
		const month = monthsFor(2153)[0];
		if (month === undefined) expect.unreachable("2153 has months");
		expect(daysInMonth(month)).toBe(29);
		expect(tibetanDateExists({ ...month, day: 8 })).toBe(true);
	});

	it("builds a whole year from monthsFor and datesFor", () => {
		const year = monthsFor(2153).flatMap((month) => datesFor(month));
		expect(year.length).toBe(354);
	});

	// The README shipped this line POINT-FREE — `flatMap(datesFor)` — for as long as the assertion
	// above existed, and the assertion never caught it because it transcribed the intent and wrapped
	// the callback while doing so. `flatMap` calls back with `(value, index, array)`, so the array
	// index landed in `datesFor`'s optional `config` parameter and the documented line could never
	// have run. Found by a consumer spike on 2026-08-25, not by this suite.
	//
	// So: assert an example as WRITTEN, not as meant. A suite that quietly repairs the example it is
	// checking reports success on a README that throws.
	it("refuses the point-free form the README used to show", () => {
		expect(() => monthsFor(2153).flatMap(datesFor as never)).toThrow(/TraditionConfig/);
	});

	it("names the year as documented", () => {
		const losar = isoToTibetan(iso("2026-02-18"));
		expect(formatTibetanDate(losar)).toBe("2153-M01-01");
		expect(yearNameFor(losar.year)).toMatchObject({
			element: "fire",
			animal: "horse",
			gender: "male",
		});
		expect(rabjungFor(losar.year)).toMatchObject({ cycle: 17, year: 40 });
	});

	it("shows the documented difference between the two traditions", () => {
		const day = iso("2025-11-19");
		expect(formatTibetanDate(isoToTibetan(day))).toBe("2152-M09-30 (leap)");
		expect(formatTibetanDate(isoToTibetan(day, PHUGPA_HENNING))).toBe("2152-M09-29");
	});

	/**
	 * The Interoperability section's claim that these are Julian day *numbers*, not Julian *dates*.
	 * The worked value is the one a reader coming from an astronomy library will check first: JD
	 * 2440588.0 is 1970-01-01 at noon UT, and the JDN naming that whole day is the same integer.
	 */
	it("uses Julian day numbers, refusing the fractional Julian date form", () => {
		expect(julianDayFromIso(iso("1970-01-01"))).toBe(2_440_588);
		try {
			isoFromJulianDay(2_440_588.5);
			expect.unreachable("a fractional Julian day should be refused");
		} catch (error) {
			expect((error as { code?: string }).code).toBe("TCT_FIELD_OUT_OF_RANGE");
		}
	});
});

// The "Observances" section. Every date printed in a README comment is asserted here, because a
// worked example that drifts is worse than none -- see docs/testing.md on the contract suites.
describe("README observance examples", () => {
	it("lists the four great days of 2026 as documented", () => {
		const duchen = getObservances(iso("2026-01-01"), iso("2026-12-31")).filter(
			(o) => o.rule.kind === "duchen",
		);

		expect(duchen.map((o) => `${o.rule.name}: ${o.date.isoDate}`)).toEqual([
			"Chotrul Duchen: 2026-03-03",
			"Saka Dawa Duchen: 2026-05-31",
			"Chokhor Duchen: 2026-07-18",
			"Lhabab Duchen: 2026-11-01",
		]);
	});

	it("computes Losar without the day-1 trap the section warns about", () => {
		expect(losarFor(2153).isoDate.toString()).toBe("2026-02-18");
	});
});

/**
 * The "Errors and validation" section, and the code table in the API section.
 *
 * Codes are the contract a consumer branches on, so a code printed in the README that the engine
 * does not throw is a broken `switch` in someone's app. `test/public-api.test.ts` pins the codes
 * against the engine; this pins the README's worked examples against both.
 */
describe("README error examples", () => {
	it("answers false for both predicate examples", () => {
		expect(tibetanDateExists({ year: 2150, month: 12, day: 29 })).toBe(false);
		expect(tibetanDateExists({ year: 2153, month: 13, day: 1 })).toBe(false);
	});

	// The royal-era warning. The README claims Gregorian 2026 passed as a royal-era year lands in
	// 1899 with no throw -- which is exactly why it is a documentation problem and not a guard.
	it("silently returns an 1899 date for the royal-era mistake", () => {
		const wrong = tibetanToIso({ year: 2026, month: 6, day: 30 });
		expect(wrong.year).toBe(1899);
		expect(isoToTibetan(wrong).yearStartsIn).toBe(1899);
	});

	it("names the polyfill and Node 26 in the import-time guard, as quoted", () => {
		// The guard cannot fire under test -- the suite runs on Node 26 -- so the README's quoted
		// message is checked against the source that produces it.
		const source = readFileSync(
			new URL("../src/computation/conversion.ts", import.meta.url),
			"utf8",
		);
		expect(source).toContain("Temporal ships enabled from Node 26");
		expect(source).toContain("temporal-polyfill/global");
	});
});

/**
 * The API section's Navigation and Year-names blocks. Signatures in a table cannot rot silently,
 * but the worked snippets beside them can, so those are asserted like every other README claim.
 */
describe("README navigation examples", () => {
	it("chains the phases through .isoDate, as documented", () => {
		let moon = nextFullMoon(iso("2026-01-01"));
		const first = moon.isoDate.toString();
		moon = nextFullMoon(moon.isoDate);
		expect(moon.isFullMoon).toBe(true);
		expect(Temporal.PlainDate.compare(moon.isoDate, iso(first))).toBeGreaterThan(0);
	});

	it("builds the documented year picker", () => {
		const years = [];
		for (let y = 2140; y <= 2160; y++) {
			years.push({ year: y, name: yearNameFor(y), rabjung: rabjungFor(y), leap: hasLeapMonth(y) });
		}
		expect(years).toHaveLength(21);
		expect(years[13]).toMatchObject({
			year: 2153,
			name: { element: "fire", animal: "horse", gender: "male" },
			rabjung: { cycle: 17, year: 40 },
			leap: false,
		});
		// A picker wants the leap years visible; 2151 is one.
		expect(years.filter((y) => y.leap).map((y) => y.year)).toContain(2151);
	});

	it("lays out a month grid with datesFor, one entry per calendar day", () => {
		const [first] = monthsFor(2153);
		if (first === undefined) expect.unreachable("2153 has months");
		const dates = datesFor(first);
		expect(dates).toHaveLength(first.days);
		expect(dates[0]?.isoDate.toString()).toBe("2026-02-18");
	});

	// The padding cells either side of a grid: ISO days stepped and converted, which is the one
	// walk the README still shows by hand, because datesFor cannot produce a neighbouring month's days.
	it("fills the cells before a month by stepping ISO days", () => {
		const [first] = monthsFor(2153);
		if (first === undefined) expect.unreachable("2153 has months");
		const before: string[] = [];
		let day = first.firstDay.subtract({ days: 3 });
		for (let i = 0; i < 3; i++, day = day.add({ days: 1 })) {
			before.push(formatTibetanDate(isoToTibetan(day)));
		}
		expect(before).toEqual(["2152-M12-28", "2152-M12-29", "2152-M12-30"]);
	});

	it("steps months into and out of a leap pair, as the table says", () => {
		expect(addMonths({ year: 2151, month: 5 }, 1).monthCode).toBe("M06L");
		expect(monthsBetween({ year: 2151, month: 5 }, { year: 2151, month: 7 })).toBe(3);
		expect(monthsBetween({ year: 2153, month: 5 }, { year: 2153, month: 7 })).toBe(2);
	});

	// The losarFor docblock's M01L case, which the README's Losar note now also has to survive.
	it("opens some years in a leap month", () => {
		expect(losarFor(2146).monthCode).toBe("M01L");
		expect(losarFor(2153).monthCode).toBe("M01");
	});
});
