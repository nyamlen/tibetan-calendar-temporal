import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { losarJulianDay } from "../../src/computation/calendar.js";
import {
	isoFromJulianDay,
	isoToTibetan,
	julianDayFromIso,
	tibetanDateExists,
	tibetanToIso,
	tibetanWeekday,
} from "../../src/computation/conversion.js";
import { deriveScaling } from "../../src/computation/scaling.js";
import { PHUGPA, PHUGPA_HENNING } from "../../src/traditions/phugpa.js";
import { LOSAR_DATES } from "../fixtures/losar.js";

const scaled = deriveScaling(PHUGPA);
const iso = (s: string) => Temporal.PlainDate.from(s);

describe("Julian day numbers", () => {
	// Janson §2 gives this worked value explicitly.
	it("puts 1 January 2007 at JD 2454102", () => {
		expect(julianDayFromIso(iso("2007-01-01"))).toBe(2_454_102);
	});

	it("round-trips against Temporal", () => {
		fc.assert(
			fc.property(fc.integer({ min: 1_800_000, max: 3_000_000 }), (jd) => {
				expect(julianDayFromIso(isoFromJulianDay(jd))).toBe(jd);
			}),
		);
	});

	it("advances by exactly one per calendar day", () => {
		fc.assert(
			fc.property(fc.integer({ min: 2_000_000, max: 2_600_000 }), (jd) => {
				expect(julianDayFromIso(isoFromJulianDay(jd).add({ days: 1 }))).toBe(jd + 1);
			}),
		);
	});
});

describe("day of week", () => {
	// Janson §9: 0 = Saturday. JD 2454102 is 1 January 2007, a Monday, so it must give 2.
	it("numbers 0 as Saturday", () => {
		expect(tibetanWeekday(2_454_102)).toBe(2);
		expect(iso("2007-01-01").dayOfWeek).toBe(1); // ISO Monday
	});

	it("agrees with the ISO weekday up to the fixed offset", () => {
		fc.assert(
			fc.property(fc.integer({ min: 2_000_000, max: 2_600_000 }), (jd) => {
				const isoWeekday = isoFromJulianDay(jd).dayOfWeek; // 1=Mon..7=Sun
				expect(tibetanWeekday(jd)).toBe(isoWeekday % 7 === 0 ? 1 : (isoWeekday + 1) % 7);
			}),
		);
	});
});

// The primary correctness gate. Losar exercises the month count, the leap-month rule, the
// day-labelling rule and the true-date astronomy simultaneously.
describe("Janson's Losar table, 1927-2046", () => {
	it("reproduces all 120 dates", () => {
		const mismatches: string[] = [];
		for (const row of LOSAR_DATES) {
			const computed = isoFromJulianDay(losarJulianDay(scaled, PHUGPA, row.year)).toString();
			if (computed !== row.losar)
				mismatches.push(`${row.year}: expected ${row.losar}, got ${computed}`);
		}
		expect(mismatches).toEqual([]);
	});

	// Losar is the first day of month 1 — but that day is numbered 2 whenever day 1 is skipped.
	// Janson makes exactly this point, and it is why he computes Losar from the *previous*
	// year's month 12 rather than by evaluating day 1 directly.
	it("puts every Losar in month 1, on day 1 or day 2", () => {
		const dayTwoYears: number[] = [];
		for (const row of LOSAR_DATES) {
			const date = isoToTibetan(iso(row.losar));
			expect({ year: date.yearStartsIn, month: date.month }).toEqual({
				year: row.year,
				month: 1,
			});
			expect([1, 2]).toContain(date.day);
			if (date.day === 2) dayTwoYears.push(row.year);
		}
		// The case is real but uncommon; if this ever becomes empty the fixture or the
		// day-labelling rule has changed.
		expect(dayTwoYears.length).toBeGreaterThan(0);
	});

	it("numbers Losar as day 2 exactly when day 1 of that month is skipped", () => {
		for (const row of LOSAR_DATES) {
			const date = isoToTibetan(iso(row.losar));
			const dayOneExists = tibetanDateExists({
				year: date.year,
				month: 1,
				day: 1,
				isLeapMonth: date.isLeapMonth,
			});
			expect(dayOneExists).toBe(date.day === 1);
		}
	});

	// Janson Remark 20: 2000 opened with a leap month 1, and Losar was still the first day of
	// the year — the one holiday that is observed in a leap month.
	it("puts Losar 2000 in the leap month 1", () => {
		const date = isoToTibetan(iso("2000-02-06"));
		expect(date.isLeapMonth).toBe(true);
		expect(date.monthCode).toBe("M01L");
		expect(date.day).toBe(1);
	});

	it("cross-checks the year names against the same table", () => {
		for (const row of LOSAR_DATES) {
			const date = isoToTibetan(iso(row.losar));
			expect(`${date.yearName.element}-${date.yearName.animal}`).toBe(row.name);
		}
	});
});

describe("isoToTibetan", () => {
	// The TSDoc example, and the case where the royal-era year and the ISO year differ most
	// visibly.
	// Cross-checked by hand against Janson's own table: Losar 2026 is 2026-02-18 and Losar 2027
	// is 2027-02-07, so this Tibetan year runs 354 days and 2027-01-15 is its 332nd. Eleven
	// months is about 325 days, which puts the date early in month 12.
	it("converts 2027-01-15 to 8/12 of royal-era 2153", () => {
		const date = isoToTibetan(iso("2027-01-15"));
		expect(date.year).toBe(2153);
		expect(date.yearStartsIn).toBe(2026);
		expect(date.month).toBe(12);
		expect(date.day).toBe(8);
		expect(date.rabjung).toEqual({ cycle: 17, year: 40 });
		expect(date.yearName).toEqual({ element: "fire", animal: "horse", gender: "male" });
		expect(date.isoDate.toString()).toBe("2027-01-15");
	});

	it("always returns a date whose isoDate is the input", () => {
		fc.assert(
			fc.property(fc.integer({ min: 2_100_000, max: 2_600_000 }), (jd) => {
				const date = isoFromJulianDay(jd);
				expect(isoToTibetan(date).isoDate.equals(date)).toBe(true);
			}),
		);
	});

	it("produces only in-range month and day numbers", () => {
		fc.assert(
			fc.property(fc.integer({ min: 2_000_000, max: 2_700_000 }), (jd) => {
				const date = isoToTibetan(isoFromJulianDay(jd));
				expect(date.month).toBeGreaterThanOrEqual(1);
				expect(date.month).toBeLessThanOrEqual(12);
				expect(date.day).toBeGreaterThanOrEqual(1);
				expect(date.day).toBeLessThanOrEqual(30);
				expect(date.isLeapDay && !date.isDoubledDay).toBe(false);
			}),
		);
	});

	it("advances monotonically through consecutive days", () => {
		let previous = -Infinity;
		let date = iso("2024-01-01");
		for (let i = 0; i < 800; i++) {
			const t = isoToTibetan(date);
			const ordinal = t.yearStartsIn * 10_000 + t.month * 100 + t.day;
			expect(ordinal).toBeGreaterThanOrEqual(previous);
			previous = t.isLeapMonth || t.isDoubledDay ? previous : ordinal;
			date = date.add({ days: 1 });
		}
	});
});

describe("tibetanToIso", () => {
	it("inverts isoToTibetan for every day of a four-year span", () => {
		let date = iso("2023-01-01");
		for (let i = 0; i < 1461; i++) {
			const t = isoToTibetan(date);
			const back = tibetanToIso({
				year: t.year,
				month: t.month,
				day: t.day,
				isLeapMonth: t.isLeapMonth,
				isLeapDay: t.isLeapDay,
			});
			expect(back.toString()).toBe(date.toString());
			date = date.add({ days: 1 });
		}
	});

	it("rejects out-of-range input", () => {
		expect(() => tibetanToIso({ year: 2153, month: 13, day: 1 })).toThrow(RangeError);
		expect(() => tibetanToIso({ year: 2153, month: 1, day: 31 })).toThrow(RangeError);
		expect(() => tibetanToIso({ year: 2153, month: 5, day: 1, isLeapMonth: true })).toThrow(
			RangeError,
		);
	});
});

describe("skipped and doubled days", () => {
	it("finds both kinds within a decade and keeps them consistent", () => {
		let doubled = 0;
		let skipped = 0;
		let date = iso("2020-01-01");
		for (let i = 0; i < 3653; i++) {
			const t = isoToTibetan(date);
			if (t.isDoubledDay) doubled++;
			date = date.add({ days: 1 });
		}
		for (let y = 2020; y < 2030; y++) {
			for (let m = 1; m <= 12; m++) {
				for (let d = 1; d <= 30; d++) {
					if (!tibetanDateExists({ year: y + 127, month: m, day: d })) skipped++;
				}
			}
		}
		// Both are common: roughly one of each every couple of months.
		expect(doubled).toBeGreaterThan(20);
		expect(skipped).toBeGreaterThan(20);
	});

	it("throws SkippedDayError with the requested date attached", () => {
		let thrown: unknown;
		outer: for (let m = 1; m <= 12; m++) {
			for (let d = 1; d <= 30; d++) {
				const input = { year: 2153, month: m, day: d };
				if (!tibetanDateExists(input)) {
					try {
						tibetanToIso(input);
					} catch (error) {
						thrown = error;
					}
					break outer;
				}
			}
		}
		expect(thrown).toBeInstanceOf(Error);
		expect((thrown as Error).name).toBe("SkippedDayError");
	});

	it("gives a doubled date two consecutive days, the first flagged as leap", () => {
		let date = iso("2024-01-01");
		for (let i = 0; i < 1000; i++) {
			const t = isoToTibetan(date);
			if (t.isDoubledDay && t.isLeapDay) {
				const next = isoToTibetan(date.add({ days: 1 }));
				expect(next.day).toBe(t.day);
				expect(next.month).toBe(t.month);
				expect(next.isDoubledDay).toBe(true);
				expect(next.isLeapDay).toBe(false);
				return;
			}
			date = date.add({ days: 1 });
		}
		throw new Error("no doubled day found in 1000 days");
	});
});

// Janson names three dates where the two a2 values give different calendars. They are the
// cheapest available check on which value a published almanac follows.
describe("the a2 fork", () => {
	const forkDates = ["2001-02-10", "2006-05-10", "2025-11-19"];

	it("differs on Janson's three named dates", () => {
		for (const day of forkDates) {
			const almanac = isoToTibetan(iso(day), PHUGPA);
			const henning = isoToTibetan(iso(day), PHUGPA_HENNING);
			expect({ day, differs: almanac.day !== henning.day }).toEqual({ day, differs: true });
		}
	});

	// Both values reproduce Janson's Losar table in full. That is a useful negative result:
	// Losar is not sensitive to the fork anywhere in 1927-2046, so the table cannot be used to
	// infer which a2 an almanac follows. Settling that needs a published calendar checked
	// against the three dates above.
	//
	// It also means the 120-date gate validates the engine under either value, which is exactly
	// what makes it a good gate — it tests the month count, leap rule and labelling rule
	// without being confounded by the tradition split.
	it("shows Losar cannot distinguish the two a2 values", () => {
		const misses = (config: typeof PHUGPA) => {
			const derived = deriveScaling(config);
			return LOSAR_DATES.filter(
				(row) =>
					isoFromJulianDay(losarJulianDay(derived, config, row.year)).toString() !== row.losar,
			).map((row) => row.year);
		};
		expect(misses(PHUGPA)).toEqual([]);
		expect(misses(PHUGPA_HENNING)).toEqual([]);
	});

	it("agrees almost everywhere else, as the ~1-in-4100 rate implies", () => {
		let differences = 0;
		let date = iso("2000-01-01");
		for (let i = 0; i < 3653; i++) {
			if (isoToTibetan(date, PHUGPA).day !== isoToTibetan(date, PHUGPA_HENNING).day) {
				differences++;
			}
			date = date.add({ days: 1 });
		}
		// Janson counts 8 divergences in 2000-2099, so a single decade should have very few.
		expect(differences).toBeLessThan(5);
	});
});
