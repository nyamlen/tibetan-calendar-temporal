import { describe, expect, it } from "vitest";
import { isoToTibetan, tibetanDateExists } from "../../src/computation/conversion.js";
import { PHUGPA_HENNING } from "../../src/traditions/phugpa.js";
import { ESZTHOFF_DATES } from "../fixtures/crosscheck-eszthoff.js";
import { LOTSAWA_DATES } from "../fixtures/crosscheck-lotsawa.js";
import type { CrosscheckRow } from "../fixtures/crosscheck-row.js";
import { STEINERT_DATES } from "../fixtures/crosscheck-steinert.js";

const iso = (s: string) => Temporal.PlainDate.from(s);

/** A row with the optional flags resolved, so a missing flag and an explicit `false` compare equal. */
interface Resolved {
	iso: string;
	month: number;
	day: number;
	isLeapMonth: boolean;
	isDoubledDay: boolean;
	isLeapDay: boolean;
}

/** The fixtures omit false flags to stay inside the formatter's line limit. */
function resolve(row: CrosscheckRow): Resolved {
	return {
		iso: row.iso,
		month: row.month,
		day: row.day,
		isLeapMonth: row.isLeapMonth ?? false,
		isDoubledDay: row.isDoubledDay ?? false,
		isLeapDay: row.isLeapDay ?? false,
	};
}

/** The engine's own view of a day, in the fixture's shape, so mismatches diff readably. */
function computed(row: CrosscheckRow): Resolved {
	const t = isoToTibetan(iso(row.iso));
	return {
		iso: row.iso,
		month: t.month,
		day: t.day,
		isLeapMonth: t.isLeapMonth,
		isDoubledDay: t.isDoubledDay,
		isLeapDay: t.isLeapDay,
	};
}

function mismatchesIn(rows: readonly CrosscheckRow[]) {
	return rows
		.map((row) => ({ expected: resolve(row), actual: computed(row) }))
		.filter(
			({ expected, actual }) =>
				actual.month !== expected.month ||
				actual.day !== expected.day ||
				actual.isLeapMonth !== expected.isLeapMonth ||
				actual.isDoubledDay !== expected.isDoubledDay ||
				actual.isLeapDay !== expected.isLeapDay,
		);
}

// Tier 2. The Losar table proves the engine agrees with Janson; this proves it agrees with an
// independent implementation of the same tradition, day by day, including everything Losar never
// touches -- doubled days, leap months, and every ordinary day in between.
describe("Lotsawa House Phugpa calculator, 2023-2027", () => {
	it("agrees on every day", () => {
		expect(mismatchesIn(LOTSAWA_DATES)).toEqual([]);
	});

	// Guards the fixture rather than the engine. If a regeneration silently returns a shorter or
	// blander range, the suite above would still pass while testing much less.
	it("covers the features it is supposed to exercise", () => {
		expect(LOTSAWA_DATES.length).toBe(1831);
		expect(LOTSAWA_DATES.filter((r) => r.isDoubledDay === true).length).toBeGreaterThan(50);
		expect(LOTSAWA_DATES.filter((r) => r.isLeapMonth === true).length).toBeGreaterThan(50);
		expect(new Set(LOTSAWA_DATES.map((r) => r.month)).size).toBe(12);
	});

	// Skipped dates have no row, because they name no calendar day. Their absence is therefore
	// itself an assertion: every gap in the fixture's day numbers must be a date the engine also
	// refuses to resolve.
	it("has a gap exactly where the engine reports a skipped date", () => {
		const wrong: string[] = [];
		for (let i = 1; i < LOTSAWA_DATES.length; i++) {
			const previous = resolve(LOTSAWA_DATES[i - 1] as CrosscheckRow);
			const current = resolve(LOTSAWA_DATES[i] as CrosscheckRow);
			if (current.month !== previous.month) continue;
			if (current.isLeapMonth !== previous.isLeapMonth) continue;
			for (let missing = previous.day + 1; missing < current.day; missing++) {
				const input = {
					year: isoToTibetan(iso(current.iso)).year,
					month: current.month,
					day: missing,
					isLeapMonth: current.isLeapMonth,
				};
				if (tibetanDateExists(input)) {
					wrong.push(`${current.iso}: ${current.month}/${missing} absent upstream but resolves`);
				}
			}
		}
		expect(wrong).toEqual([]);
	});

	// The negative control for the a2 decision. Henning's value must disagree with this source
	// somewhere in range -- specifically at 2025-11-19 -- or the fixture is not discriminating and
	// the agreement above proves less than it appears to.
	it("disagrees with Henning's a2 exactly where Janson says it should", () => {
		const disagreements = LOTSAWA_DATES.filter((row) => {
			const t = isoToTibetan(iso(row.iso), PHUGPA_HENNING);
			return t.day !== row.day || t.isDoubledDay !== row.isDoubledDay;
		}).map((row) => row.iso);

		expect(disagreements).toContain("2025-11-19");
	});
});

// A third implementation, independent of both the engine and Lotsawa House.
describe("eszthoff/tibetan-date-calculator, 2023-2027", () => {
	it("agrees on every day", () => {
		expect(mismatchesIn(ESZTHOFF_DATES)).toEqual([]);
	});

	it("covers the features it is supposed to exercise", () => {
		expect(ESZTHOFF_DATES.length).toBe(1826);
		expect(ESZTHOFF_DATES.filter((r) => r.isDoubledDay === true).length).toBeGreaterThan(50);
		expect(ESZTHOFF_DATES.filter((r) => r.isLeapMonth === true).length).toBeGreaterThan(50);
	});
});

// christian-steinert agrees with the engine and with Lotsawa House on the a2 fork, but uses a
// different rule for which number a skipped date consumes. The disagreements are catalogued
// rather than asserted away -- see docs/testing.md, "Where christian-steinert differs".
describe("christian-steinert, 2024-2027", () => {
	const mismatches = mismatchesIn(STEINERT_DATES);

	it("agrees on the overwhelming majority of days", () => {
		expect(mismatches.length / STEINERT_DATES.length).toBeLessThan(0.05);
	});

	it("differs only in the day number, never the month or the leap-month flag", () => {
		const structural = mismatches.filter(
			({ expected, actual }) =>
				actual.month !== expected.month || actual.isLeapMonth !== expected.isLeapMonth,
		);
		expect(structural).toEqual([]);
	});

	it("differs only by one, and only adjacent to a skipped or doubled date", () => {
		const unexpected = mismatches.filter(
			({ expected, actual }) => Math.abs(actual.day - expected.day) !== 1,
		);
		expect(unexpected).toEqual([]);
	});

	// Only 2025-11-19 of Janson's three falls inside this fixture's range. The other two are
	// covered against the default config in test/computation/conversion.test.ts.
	it("agrees on the a2 divergence date in range", () => {
		const row = STEINERT_DATES.find((r) => r.iso === "2025-11-19") as CrosscheckRow;
		expect(computed(row)).toEqual(resolve(row));
	});
});
