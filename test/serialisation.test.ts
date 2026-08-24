import { describe, expect, it } from "vitest";
import { datesFor, monthsFor } from "../src/months.js";

/**
 * The size of a year of dates, serialised.
 *
 * @remarks
 * Part 3 of the naming plan specified this gate and never built it — there was no size assertion
 * anywhere in `test/` and no figure in `README.md`, so this is new work rather than a
 * re-measurement of something already checked. It matters now specifically because `Rabjung`
 * gained a second level of nesting: `rabjung.name` carries a `RabjungName`, which carries a
 * `SanskritName`.
 *
 * Name objects are **shared frozen singletons** — `src/rabjung-names.ts` and `src/names.ts` freeze
 * one object per weekday, element, gender, animal and rabjung position, and every `TibetanDate`
 * holds a pointer to one of those rather than a copy. So the true *in-memory* cost of a year of
 * dates is pointer fields, not thousands of string copies. `JSON.stringify` cannot see that —
 * serialisation always expands every pointer to its full object — so this measures the
 * serialised size specifically, which is the number a consumer actually pays when persisting or
 * transmitting a year of dates, and states it rather than assumes it.
 */
describe("a year of dates, serialised", () => {
	function serialisedYear(year: number): { days: number; bytes: number } {
		const dates = monthsFor(year).flatMap((month) => datesFor(month));
		const json = JSON.stringify(dates);
		return { days: dates.length, bytes: Buffer.byteLength(json, "utf8") };
	}

	// 2153 is the year every other README example uses. 2151 has a leap month (M06L, per
	// CLAUDE.md's cross-version leap example), so it carries a 13th month and is the more expensive
	// case -- the bound below is checked against it, not against the cheaper ordinary year.
	it("matches the ordinary-year figure stated in the guide", () => {
		const { days, bytes } = serialisedYear(2153);
		expect(days).toBe(354);
		expect(bytes).toBe(126_629);
	});

	it("stays under a generous bound even for a thirteen-month leap year", () => {
		const { days, bytes } = serialisedYear(2151);
		expect(days).toBe(384);
		// Measured at 137,336 bytes (~358 bytes/day). The bound is roughly 1.5x that, so it fails
		// only on a real regression -- a name field growing unboundedly, a lost freeze causing a
		// per-date copy, or year-level naming returning to the date -- not on ordinary content
		// drift from a table regeneration.
		expect(bytes).toBeLessThan(days * 540);
	});
});
