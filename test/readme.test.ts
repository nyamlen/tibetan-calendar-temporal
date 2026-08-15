import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	isoToTibetan,
	julianDayFromIso,
	losarFor,
	tibetanDateExists,
	tibetanToIso,
	tibetanWeekday,
} from "../src/computation/conversion.js";
import { formatTibetanDate } from "../src/format.js";
import { hasLeapMonth, leapMonthOfYear, monthsFor } from "../src/months.js";
import { GELUG, getObservances, observancesOn } from "../src/observances/index.js";
import { parseTibetanDate } from "../src/parse.js";
import { PHUGPA_HENNING } from "../src/traditions/phugpa.js";
import { SkippedDayError } from "../src/types.js";

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

	it("converts a Western date", () => {
		expect(formatTibetanDate(date)).toBe("2153-M06-30");
		expect(date.month).toBe(6);
		expect(date.day).toBe(30);
	});

	it("serialises to the documented JSON", () => {
		expect(JSON.parse(JSON.stringify(date))).toEqual({
			year: 2153,
			yearStartsIn: 2026,
			rabjung: { cycle: 17, year: 40 },
			yearName: { element: "fire", animal: "horse", gender: "male" },
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
		});
	});

	it("numbers the weekday as ISO 8601 and names it through Temporal", () => {
		expect(date.dayOfWeek).toBe(3);
		expect(date.isoDate.dayOfWeek).toBe(3);
		expect(date.isoDate.toLocaleString("en-GB", { weekday: "long" })).toBe("Wednesday");
		// The almanac convention, 0 = Saturday, kept separate from the ISO field.
		expect(tibetanWeekday(julianDayFromIso(iso("2026-08-12")))).toBe(4);
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
		expect(leapMonthOfYear(2151)).toBe(6);

		const month = monthsFor(2153)[0];
		expect(month?.monthCode).toBe("M01");
		expect(month?.days).toBe(29);
		expect(month?.firstDay.toString()).toBe("2026-02-18");
		expect(month?.lastDay.toString()).toBe("2026-03-18");
	});

	it("reads the documented dates back, including a skipped one", () => {
		expect(parseTibetanDate("2153-M12-08")).toEqual({
			year: 2153,
			month: 12,
			day: 8,
			isLeapMonth: false,
			isLeapDay: false,
		});
		expect(tibetanToIso(parseTibetanDate("2153-M12-08")).toString()).toBe("2027-01-15");
		expect(formatTibetanDate(parseTibetanDate("2152-M09-30 (leap)"))).toBe("2152-M09-30 (leap)");

		const skipped = parseTibetanDate("2150-M12-29");
		expect(tibetanDateExists(skipped)).toBe(false);

		for (const rejected of ["2153-M12-8", "2153-m12-08", "2153-12-08"]) {
			try {
				parseTibetanDate(rejected);
				expect.unreachable(`${rejected} should be refused`);
			} catch (error) {
				expect((error as { code?: string }).code, rejected).toBe("TCT_INVALID_ARGUMENT");
			}
		}
	});

	// The message text is pinned here only because the README prints it. Everywhere else the suite
	// asserts on `error.code`, which is the contract; wording is not and may change.
	it("reports and throws on the documented skipped date", () => {
		expect(tibetanDateExists({ year: 2150, month: 12, day: 29 })).toBe(false);
		expect(() => tibetanToIso({ year: 2150, month: 12, day: 29 })).toThrow(SkippedDayError);
		expect(() => tibetanToIso({ year: 2150, month: 12, day: 29 })).toThrow(
			"Tibetan date 2150-M12-29 is skipped: no calendar day carries it.",
		);
	});

	it("distinguishes the halves of the documented doubled date", () => {
		expect(isoToTibetan(iso("2025-11-19")).isLeapDay).toBe(true);
		expect(isoToTibetan(iso("2025-11-20")).isLeapDay).toBe(false);
		expect(isoToTibetan(iso("2025-11-19")).isDoubledDay).toBe(true);
		expect(tibetanToIso({ year: 2152, month: 9, day: 30, isLeapDay: true }).toString()).toBe(
			"2025-11-19",
		);
		expect(tibetanToIso({ year: 2152, month: 9, day: 30 }).toString()).toBe("2025-11-20");
	});

	it("selects the documented leap month", () => {
		const leap = isoToTibetan(iso("2024-07-06"));
		expect(leap.monthCode).toBe("M06L");
		expect(leap.isLeapMonth).toBe(true);
		expect(tibetanToIso({ year: 2151, month: 6, day: 1, isLeapMonth: true }).toString()).toBe(
			"2024-07-06",
		);
		expect(tibetanToIso({ year: 2151, month: 6, day: 1 }).toString()).toBe("2024-08-05");
	});

	// The composed case the README warns about, and the one that caught the drafting error.
	it("needs both flags where a leap month and a doubled day coincide", () => {
		expect(
			tibetanToIso({
				year: 2151,
				month: 6,
				day: 4,
				isLeapMonth: true,
				isLeapDay: true,
			}).toString(),
		).toBe("2024-07-09");
		expect(tibetanToIso({ year: 2151, month: 6, day: 4, isLeapMonth: true }).toString()).toBe(
			"2024-07-10",
		);
	});

	it("names the year as documented", () => {
		const losar = isoToTibetan(iso("2026-02-18"));
		expect(formatTibetanDate(losar)).toBe("2153-M01-01");
		expect(losar.yearName).toEqual({ element: "fire", animal: "horse", gender: "male" });
		expect(losar.rabjung).toEqual({ cycle: 17, year: 40 });
	});

	it("shows the documented difference between the two traditions", () => {
		const day = iso("2025-11-19");
		expect(formatTibetanDate(isoToTibetan(day))).toBe("2152-M09-30 (leap)");
		expect(formatTibetanDate(isoToTibetan(day, PHUGPA_HENNING))).toBe("2152-M09-29");
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

	it("moves the 2024 Chokhor Duchen to 9 July under a spread config", () => {
		const kopan = { ...GELUG, id: "kopan", doubledDay: "first" as const };
		expect(observancesOn(iso("2024-07-09"), kopan).map((o) => o.rule.id)).toContain(
			"chokhor-duchen",
		);
	});

	it("computes Losar without the day-1 trap the section warns about", () => {
		expect(losarFor(2153).isoDate.toString()).toBe("2026-02-18");
	});

	// The README prints the three convention fields, their allowed values and GELUG's defaults as a
	// table. A default changing there and not here would put a wrong date in front of a reader.
	it("documents GELUG's convention defaults correctly", () => {
		expect(GELUG.doubledDay).toBe("second");
		expect(GELUG.skippedDay).toBe("preceding");
		expect(GELUG.leapMonth).toBe("leap");
	});

	// The list of `resolution` values reads as exhaustive, and once was not -- it omitted
	// "firstOfDoubled", which any config setting `doubledDay: 'first'` produces. Asserting the set
	// rather than a sample is the point.
	it("produces every resolution the README lists, and no other", () => {
		const documented = ["exact", "firstOfDoubled", "secondOfDoubled", "shiftedFromSkipped"];
		const seen = new Set<string>();
		for (const doubledDay of ["first", "second", "both"] as const) {
			const config = { ...GELUG, id: `readme-${doubledDay}`, doubledDay };
			// A wide window on purpose: "exact" and the two doubled cases appear within months, but a
			// rule's own day being skipped is rarer than a skipped day, so a few years would not
			// exercise "shiftedFromSkipped" and the assertion would pass for the wrong reason.
			for (const o of getObservances(iso("2010-01-01"), iso("2030-12-31"), config)) {
				seen.add(o.resolution);
			}
		}
		expect([...seen].sort()).toEqual(documented);
	});

	// The `myCentre` example: extend `rules` by spreading, never replace it.
	it("accepts the documented custom-rule config", () => {
		const myCentre = {
			...GELUG,
			id: "my-centre",
			rules: [
				...GELUG.rules,
				{
					id: "founder-anniversary",
					name: "Founder's anniversary",
					kind: "anniversary" as const,
					tier: 2 as const,
					when: { month: 4, day: 15 },
					source: "https://example.org/calendar",
					skippedDay: "preceding" as const,
				},
			],
		};
		const found = getObservances(iso("2026-01-01"), iso("2026-12-31"), myCentre).filter(
			(o) => o.rule.id === "founder-anniversary",
		);
		expect(found).toHaveLength(1);
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
	it("reports the documented skipped date with the documented code", () => {
		let thrown: unknown;
		try {
			tibetanToIso({ year: 2150, month: 12, day: 29 });
		} catch (error) {
			thrown = error;
		}
		expect(thrown).toBeInstanceOf(SkippedDayError);
		expect((thrown as { code?: string }).code).toBe("TCT_SKIPPED_DAY");
		expect((thrown as SkippedDayError).requested).toEqual({ year: 2150, month: 12, day: 29 });
	});

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
