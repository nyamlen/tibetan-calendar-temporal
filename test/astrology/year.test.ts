import { describe, expect, it } from "vitest";
import { calendarDayAttributes } from "../../src/astrology/calendar-day.js";
import { yearAttributes } from "../../src/astrology/year.js";
import { JANSON_YEAR_ELEMENTS } from "../fixtures/janson-attributes.js";

/**
 * The engine's year and calendar-day attributes against Janson's own printed table.
 *
 * He computed T60e from the same formulas implemented here, so agreement catches a transcription
 * error or a misread formula — which is nearly all of the risk in a layer of closed forms. It is
 * not external corroboration, and `docs/development/testing.md` says so.
 */

/** The Gregorian year sitting at a given position of the Chinese sixty-year cycle. */
const yearAtPosition = (position: number) => position + 3;

/** The Julian day sitting at that same position: Janson's `(JD − 10) amod 60`. */
const julianDayAtPosition = (position: number) => position + 10;

describe("year attributes reproduce all sixty rows of Janson's table", () => {
	it("agrees on every element at every position", () => {
		const bad: string[] = [];
		for (const row of JANSON_YEAR_ELEMENTS) {
			const computed = yearAttributes(yearAtPosition(row.chinese));
			if (computed.cyclePosition !== row.chinese) {
				bad.push(`${row.chinese}: cyclePosition ${computed.cyclePosition}`);
				continue;
			}
			for (const field of ["power", "animal", "life", "body", "fortune", "spirit"] as const) {
				if (computed[field] !== row[field]) {
					bad.push(`${row.chinese} ${field}: ${computed[field]} ≠ ${row[field]}`);
				}
			}
		}
		expect(bad).toEqual([]);
	});

	it("agrees across an entire 180-year period, not just one cycle", () => {
		// The elements repeat every 60 and the numbers every 9, so a 60-year sweep looks exhaustive
		// and proves nothing about the numbers. 180 is the first year the whole set returns.
		const bad: string[] = [];
		for (let year = 1900; year < 2080; year++) {
			const computed = yearAttributes(year);
			const row = JANSON_YEAR_ELEMENTS.find((entry) => entry.chinese === computed.cyclePosition);
			if (!row) {
				bad.push(`${year}: no row for position ${computed.cyclePosition}`);
				continue;
			}
			if (computed.power !== row.power || computed.life !== row.life) {
				bad.push(`${year}: ${computed.power}/${computed.life} vs ${row.power}/${row.life}`);
			}
		}
		expect(bad).toEqual([]);
	});
});

describe("the three year numbers", () => {
	it("count backwards by one each year, wrapping at nine", () => {
		for (let year = 1950; year < 2050; year++) {
			const now = yearAttributes(year);
			const next = yearAttributes(year + 1);
			expect(next.central).toBe(((now.central - 1 + 8) % 9) + 1);
		}
	});

	it("keeps life three below the central number and power three above", () => {
		for (let year = 1950; year < 2050; year++) {
			const { central, lifeNumber, powerNumber } = yearAttributes(year);
			expect(lifeNumber).toBe(((central - 3 + 8) % 9) + 1);
			expect(powerNumber).toBe(((central + 3 - 1) % 9) + 1);
		}
	});

	it("returns to the same combination of elements and numbers only after 180 years", () => {
		const key = (year: number) => {
			const a = yearAttributes(year);
			return `${a.power}/${a.life}/${a.body}/${a.fortune}/${a.spirit}/${a.central}`;
		};
		expect(key(2000)).toBe(key(2180));
		// Sixty is not enough — the numbers have not come back round.
		expect(key(2000)).not.toBe(key(2060));
	});

	it("stays in 1…9", () => {
		for (let year = 1800; year < 2200; year++) {
			const { central, lifeNumber, powerNumber } = yearAttributes(year);
			for (const n of [central, lifeNumber, powerNumber]) {
				expect(n).toBeGreaterThanOrEqual(1);
				expect(n).toBeLessThanOrEqual(9);
			}
		}
	});
});

describe("negative and ancient years", () => {
	it("computes without falling out of the cycles", () => {
		// `ceilDiv` and `amod` are defined for negatives; a naive `%` is not, and would put the
		// power element outside the table for any year before 3 CE.
		const bad: string[] = [];
		for (let year = -600; year < 40; year++) {
			const a = yearAttributes(year);
			if (a.cyclePosition < 1 || a.cyclePosition > 60) bad.push(`${year}: ${a.cyclePosition}`);
			if (!a.power || !a.body) bad.push(`${year}: missing element`);
		}
		expect(bad).toEqual([]);
	});
});

describe("calendar-day attributes", () => {
	it("takes the same sixty-row table at Janson's day offset", () => {
		const bad: string[] = [];
		for (const row of JANSON_YEAR_ELEMENTS) {
			const computed = calendarDayAttributes(julianDayAtPosition(row.chinese));
			for (const field of ["life", "body", "fortune", "spirit"] as const) {
				if (computed.elements[field] !== row[field]) {
					bad.push(`${row.chinese} ${field}: ${computed.elements[field]} ≠ ${row[field]}`);
				}
			}
		}
		expect(bad).toEqual([]);
	});

	it("cycles each attribute at its own period", () => {
		const jd = 2_461_285;
		expect(calendarDayAttributes(jd + 10).element).toBe(calendarDayAttributes(jd).element);
		expect(calendarDayAttributes(jd + 12).animal).toBe(calendarDayAttributes(jd).animal);
		expect(calendarDayAttributes(jd + 8).trigram).toBe(calendarDayAttributes(jd).trigram);
		expect(calendarDayAttributes(jd + 9).number).toBe(calendarDayAttributes(jd).number);
		expect(calendarDayAttributes(jd + 2).gender).toBe(calendarDayAttributes(jd).gender);
	});

	it("alternates gender with the parity of the Julian day", () => {
		expect(calendarDayAttributes(2_461_285).gender).toBe("male"); // odd
		expect(calendarDayAttributes(2_461_286).gender).toBe("female"); // even
	});

	it("needs no tradition — the same day is the same everywhere", () => {
		// There is no config parameter at all, which is the point: these attributes are a function of
		// the Julian day and nothing else, so Bhutan and Phugpa cannot disagree about them.
		expect(calendarDayAttributes.length).toBe(1);
	});
});
