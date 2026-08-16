/**
 * Guards the Bhutanese fixture's own integrity, ahead of anything that consumes it.
 *
 * @remarks
 * The engine cannot yet be tiled against this data: Bhutan numbers a leap month from the
 * **preceding** month, which no config field expresses, so the comparison would fail for reasons
 * that are the convention rather than the arithmetic. See `docs/traditions.md`.
 *
 * That leaves the fixture unguarded in the meantime, which is how a regeneration silently changes
 * the ground truth under a future test. This file closes the gap: the properties asserted here are
 * the ones `scripts/fetch-bhutan-fixtures.mjs` checked at fetch time, re-checked against the
 * committed output so a hand-edit or a changed upstream is caught by `npm test`.
 */

import { describe, expect, it } from "vitest";
import { BHUTAN_DAYS, BHUTAN_END, BHUTAN_START } from "../fixtures/bhutan.js";

const start = Temporal.PlainDate.from(BHUTAN_START);
const end = Temporal.PlainDate.from(BHUTAN_END);

/** The Gregorian date of a row, from its index — the rows are consecutive days by construction. */
const dateAt = (index: number): Temporal.PlainDate => start.add({ days: index });

describe("shape", () => {
	it("covers every day of the window exactly once", () => {
		expect(BHUTAN_DAYS).toHaveLength(end.since(start, { largestUnit: "day" }).days + 1);
		expect(dateAt(BHUTAN_DAYS.length - 1).equals(end)).toBe(true);
	});

	it("carries plausible Bhutanese day and month numbers throughout", () => {
		// Collected rather than asserted per row. Eleven thousand rows times six assertions, each
		// building a message from a Temporal date, is enough to kill a vitest worker outright — which
		// it did on the first run of this file.
		const bad: string[] = [];
		for (const [index, [day, month, leap]] of BHUTAN_DAYS.entries()) {
			if (day < 1 || day > 30 || month < 1 || month > 12 || leap < 0 || leap > 12) {
				bad.push(`${dateAt(index)}: ${day}/${month} leap=${leap}`);
			}
		}
		expect(bad).toEqual([]);
	});

	it("advances the day number by 0, 1 or 2 within a month", () => {
		// 0 is a doubled day, 2 is a skipped one. Anything else means the rows are out of order —
		// which is a real hazard here, because the upstream file is *not* in date order.
		const bad: string[] = [];
		for (let i = 1; i < BHUTAN_DAYS.length; i += 1) {
			const previous = BHUTAN_DAYS[i - 1] as readonly [number, number, number];
			const current = BHUTAN_DAYS[i] as readonly [number, number, number];
			if (current[1] !== previous[1] || current[2] !== previous[2]) continue;
			const step = current[0] - previous[0];
			if (step < 0 || step > 2) bad.push(`${dateAt(i)}: step ${step}`);
		}
		expect(bad).toEqual([]);
	});
});

describe("Janson's 2003 anchor", () => {
	// He records that Bhutan's government calendar gives New Year 2003 as 3 March with day 1 of
	// month 1 repeated, while his calculations and Henning's software give 3 March as a repeated
	// day 30 of the last (leap) month of 2002 — "I have no explanation for this discrepancy."
	// This data descends from Henning's software and follows the computed line.
	const rowFor = (iso: string) =>
		BHUTAN_DAYS[Temporal.PlainDate.from(iso).since(start, { largestUnit: "day" }).days];

	it("repeats day 30 of leap month 12 across 2 and 3 March", () => {
		expect(rowFor("2003-03-02")).toEqual([30, 12, 12]);
		expect(rowFor("2003-03-03")).toEqual([30, 12, 12]);
	});

	it("puts New Year on 4 March, not the government calendar's 3 March", () => {
		expect(rowFor("2003-03-04")).toEqual([1, 1, 0]);
	});
});

describe("the phenomena a day-level check needs", () => {
	it("contains doubled and skipped days in quantity", () => {
		let doubled = 0;
		let skipped = 0;
		for (let i = 1; i < BHUTAN_DAYS.length; i += 1) {
			const [prevDay] = BHUTAN_DAYS[i - 1] as readonly [number, number, number];
			const [day] = BHUTAN_DAYS[i] as readonly [number, number, number];
			if (day === prevDay) doubled += 1;
			if (day === prevDay + 2) skipped += 1;
		}
		expect(doubled).toBeGreaterThan(200);
		expect(skipped).toBeGreaterThan(350);
	});

	it("contains leap months across the window", () => {
		const leapYears = new Set(
			BHUTAN_DAYS.map((row, index) => (row[2] === 0 ? undefined : dateAt(index).year)).filter(
				(year) => year !== undefined,
			),
		);
		expect(leapYears.size).toBeGreaterThanOrEqual(12);
	});
});
