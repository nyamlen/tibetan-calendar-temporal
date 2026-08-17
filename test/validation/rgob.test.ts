/**
 * The engine against the Royal Government of Bhutan's own calendar.
 *
 * @remarks
 * **The only check on Bhutanese dates in this repository that is not Henning's lineage.**
 * `test/validation/bhutan.test.ts` tiles 11,050 days, but its fixture descends from Henning's "Open
 * Source Bhutanese Calendar" software — as does every other Bhutanese source found, bhutanesecalendar.com
 * included, which states it outright. Agreement with those establishes that this engine reproduces
 * Henning. This file is what establishes that it reproduces **Bhutan**.
 *
 * Twenty-five rows against eleven thousand, so it is narrow by construction. Breadth is not what it
 * contributes; independence is — and what the rows are *chosen* for. Three skipped days, two doubled
 * days and a Losar, across two years: the cases Janson's §8 warns published tables get wrong,
 * because they turn on the lunar-day classification rather than on the month arithmetic. A run of
 * ordinary consecutive days would agree under almost any epoch error.
 *
 * See `test/fixtures/rgob.ts` for provenance, why the fixture is hand-curated, and what it
 * deliberately does not establish.
 */

import { describe, expect, it } from "vitest";
import { isoToTibetan } from "../../src/computation/conversion.js";
import { BHUTAN, BHUTAN_HENNING } from "../../src/traditions/bhutan.js";
import { RGOB_DAYS } from "../fixtures/rgob.js";

describe("the fixture is worth checking against", () => {
	it("covers the phenomena that discriminate a calendar, not just easy days", () => {
		// A run of consecutive ordinary days would agree under almost any epoch error. These do not:
		// a doubled day is where Janson's §8 warns published tables go wrong, because it turns on the
		// lunar-day classification rather than on the month arithmetic.
		expect(RGOB_DAYS.some((row) => row.note?.includes("Losar"))).toBe(true);
		expect(RGOB_DAYS.filter((row) => row.note?.includes("skipped")).length).toBeGreaterThanOrEqual(
			3,
		);
		expect(RGOB_DAYS.filter((row) => row.note?.includes("doubled")).length).toBe(4);
		// Spread across two years and six Gregorian months, so the rows are not one clustered run that
		// a single epoch offset could satisfy by luck.
		expect(new Set(RGOB_DAYS.map((row) => row.iso.slice(0, 4))).size).toBe(2);
		expect(new Set(RGOB_DAYS.map((row) => row.iso.slice(0, 7))).size).toBe(6);
	});

	it("carries a source page for every row", () => {
		const unsourced = RGOB_DAYS.filter((row) => !Number.isInteger(row.page) || row.page < 1);
		expect(unsourced).toEqual([]);
	});

	it("is in date order, with no day appearing twice except a doubled one", () => {
		// Guards the transcription itself. Adjacent rows sharing a Gregorian date would be a slip; a
		// Gregorian date going backwards would mean the years were concatenated the wrong way round.
		const isos = RGOB_DAYS.map((row) => row.iso);
		expect([...isos].sort()).toEqual(isos);
		expect(new Set(isos).size).toBe(isos.length);
	});
});

describe("BHUTAN reproduces it", () => {
	it("agrees on the day number of every row", () => {
		const bad: string[] = [];
		for (const row of RGOB_DAYS) {
			const date = isoToTibetan(Temporal.PlainDate.from(row.iso), BHUTAN);
			if (date.day !== row.day) {
				bad.push(
					`${row.iso} (p${row.page}): RGoB day ${row.day}, engine ${date.month}/${date.day}`,
				);
			}
		}
		expect(bad).toEqual([]);
	});

	it("doubles the days the Royal Government doubles, and marks the first as the leap day", () => {
		// The pairs are adjacent rows sharing a day number. The government grid does not say which
		// member is intercalated, so what is checked is the engine's *ordering*: the earlier cell
		// carries isLeapDay. That is the convention `TibetanDate.isLeapDay` documents.
		const pairs: [string, string][] = [
			["2025-01-19", "2025-01-20"],
			["2025-02-21", "2025-02-22"],
		];
		for (const [first, second] of pairs) {
			const a = isoToTibetan(Temporal.PlainDate.from(first), BHUTAN);
			const b = isoToTibetan(Temporal.PlainDate.from(second), BHUTAN);
			expect(a.day).toBe(b.day);
			expect(a.isLeapDay).toBe(true);
			expect(b.isLeapDay).toBe(false);
		}
	});

	it("skips the days the Royal Government skips", () => {
		// Read as adjacent pairs whose day numbers jump by two, so the skipped number appears nowhere.
		const jumps: [string, string, number][] = [
			["2025-01-10", "2025-01-11", 12],
			["2025-02-03", "2025-02-04", 6],
			["2026-05-15", "2026-05-16", 29],
		];
		for (const [before, after, missing] of jumps) {
			const a = isoToTibetan(Temporal.PlainDate.from(before), BHUTAN);
			const b = isoToTibetan(Temporal.PlainDate.from(after), BHUTAN);
			expect(b.day - a.day).toBe(2);
			expect([a.day, b.day]).not.toContain(missing);
		}
	});

	it("puts Losar 2026 where the Royal Government does", () => {
		const losar = isoToTibetan(Temporal.PlainDate.from("2026-02-18"), BHUTAN);
		expect(losar.month).toBe(1);
		expect(losar.day).toBe(1);
		expect(losar.isLeapMonth).toBe(false);
	});
});

describe("what this cannot settle", () => {
	it("does not discriminate the a₂ fork, and says so rather than implying otherwise", () => {
		// Stated as an assertion so it cannot rot. If a future row ever *does* separate the two
		// configs, this fails and the fixture's docblock — which claims the fork stays open — has to be
		// rewritten rather than silently outgrown.
		const differing = RGOB_DAYS.filter((row) => {
			const iso = Temporal.PlainDate.from(row.iso);
			const a = isoToTibetan(iso, BHUTAN);
			const b = isoToTibetan(iso, BHUTAN_HENNING);
			return a.day !== b.day || a.month !== b.month;
		});
		expect(differing).toEqual([]);
	});
});
