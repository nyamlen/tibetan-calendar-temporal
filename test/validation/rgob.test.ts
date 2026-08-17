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
 * Fourteen rows against eleven thousand, so it is narrow by construction. Breadth is not what it
 * contributes; independence is.
 *
 * See `test/fixtures/rgob.ts` for provenance, why the fixture is hand-curated, and what it
 * deliberately does not establish.
 */

import { describe, expect, it } from "vitest";
import { isoToTibetan } from "../../src/computation/conversion.js";
import { BHUTAN, BHUTAN_HENNING } from "../../src/traditions/bhutan.js";
import { RGOB_2026 } from "../fixtures/rgob.js";

describe("the fixture is worth checking against", () => {
	it("covers the phenomena that discriminate a calendar, not just easy days", () => {
		// A run of consecutive ordinary days would agree under almost any epoch error. These do not.
		expect(RGOB_2026.some((row) => row.note?.includes("Losar"))).toBe(true);
		expect(RGOB_2026.some((row) => row.note?.includes("skipped"))).toBe(true);
		// Four Gregorian months — January, February, May and June — so the rows are not one clustered
		// run that a single epoch offset could satisfy by luck.
		expect(new Set(RGOB_2026.map((row) => row.iso.slice(0, 7))).size).toBe(4);
	});

	it("carries a source page for every row", () => {
		const unsourced = RGOB_2026.filter((row) => !Number.isInteger(row.page) || row.page < 1);
		expect(unsourced).toEqual([]);
	});
});

describe("BHUTAN reproduces it", () => {
	it("agrees on the day number of every row", () => {
		const bad: string[] = [];
		for (const row of RGOB_2026) {
			const date = isoToTibetan(Temporal.PlainDate.from(row.iso), BHUTAN);
			if (date.day !== row.day) {
				bad.push(
					`${row.iso} (p${row.page}): RGoB day ${row.day}, engine ${date.month}/${date.day}`,
				);
			}
		}
		expect(bad).toEqual([]);
	});

	it("skips the day the Royal Government skips", () => {
		// 15 May 2026 is day 28 and 16 May is day 30, so day 29 exists in no cell. Reproducing that
		// exercises the lunar-day classification, not merely the month arithmetic — the part of Janson
		// §8 he warns is the source of errors in published tables.
		const may = (day: number) =>
			isoToTibetan(Temporal.PlainDate.from({ year: 2026, month: 5, day }), BHUTAN);
		expect(may(15).day).toBe(28);
		expect(may(16).day).toBe(30);
		expect([may(15).day, may(16).day]).not.toContain(29);
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
		const differing = RGOB_2026.filter((row) => {
			const iso = Temporal.PlainDate.from(row.iso);
			const a = isoToTibetan(iso, BHUTAN);
			const b = isoToTibetan(iso, BHUTAN_HENNING);
			return a.day !== b.day || a.month !== b.month;
		});
		expect(differing).toEqual([]);
	});
});
