import { describe, expect, it } from "vitest";
import { isoToTibetan, tibetanToIso } from "../../src/computation/conversion.js";
import { PHUGPA, PHUGPA_HENNING } from "../../src/traditions/phugpa.js";
import { FPMT_HOLY_DAYS } from "../fixtures/fpmt-holy-days.js";
import { FPMT_OBSERVANCES } from "../fixtures/fpmt-observances.js";
import { fpmtNumberingMismatches } from "../support/fpmt.js";

const iso = (s: string) => Temporal.PlainDate.from(s);

// Tier 2, and the only fixture sourced from the almanac rather than from an implementation of
// Janson. The cross-check suites ask "do we compute what other engines compute"; this asks "do
// our day numbers land on the days people actually observe".
describe("FPMT published holy days", () => {
	it("puts every published date on the Tibetan date the observance is fixed to", () => {
		const mismatches = FPMT_HOLY_DAYS.filter((row) => {
			const t = isoToTibetan(iso(row.iso));
			return (
				t.month !== row.month || t.day !== row.day || t.isLeapMonth !== (row.isLeapMonth ?? false)
			);
		}).map((row) => {
			const t = isoToTibetan(iso(row.iso));
			return `${row.event} ${row.iso}: expected ${row.month}/${row.day}, got ${t.monthCode}-${t.day}`;
		});

		expect(mismatches).toEqual([]);
	});

	it("cites a source for every row", () => {
		for (const row of FPMT_HOLY_DAYS) {
			expect(row.source).toMatch(/^https:\/\/fpmt\.org\//);
		}
	});

	// FPMT published two dates for the 2024 Chokhor Duchen, "July 9 or July 10 depending on the
	// various Tibetan calendars". Both are the same Tibetan date -- 4 of the leap month 6 -- so the
	// two institutions are not disagreeing about the calendar, only about which half of a doubled
	// day to observe. This is the fixture's best row: leap month and doubled day at once, from a
	// published almanac-line source.
	it("resolves the 2024 Chokhor Duchen ambiguity as one doubled day in a leap month", () => {
		const first = isoToTibetan(iso("2024-07-09"));
		const second = isoToTibetan(iso("2024-07-10"));

		expect({ month: first.monthCode, day: first.day, doubled: first.isDoubledDay }).toEqual({
			month: "M06L",
			day: 4,
			doubled: true,
		});
		expect(first.isLeapDay).toBe(true);
		expect(second.isLeapDay).toBe(false);
		expect({ month: second.monthCode, day: second.day }).toEqual({ month: "M06L", day: 4 });

		// The round trip has to distinguish them, or a caller could not express either choice.
		expect(
			tibetanToIso({
				year: first.year,
				month: 6,
				day: 4,
				isLeapMonth: true,
				isLeapDay: true,
			}).toString(),
		).toBe("2024-07-09");
		expect(tibetanToIso({ year: first.year, month: 6, day: 4, isLeapMonth: true }).toString()).toBe(
			"2024-07-10",
		);
	});

	// Chokhor Duchen 2024 is in the leap month, not the main month 6 that follows it. Getting this
	// backwards would move the observance by a lunar month while still looking plausible.
	it("places the 2024 Chokhor Duchen in the leap month, a month before the main one", () => {
		const year = isoToTibetan(iso("2024-07-09")).year;
		expect(tibetanToIso({ year, month: 6, day: 4, isLeapMonth: false }).toString()).toBe(
			"2024-08-08",
		);
	});
});

/**
 * The day-by-day grid, which is a different instrument from the holy-day list above: it prints a
 * Tibetan day number for every Gregorian day, which is the only kind of source that carries
 * information about the `a2` fork. See docs/decisions/2026-08-12-lunar-anomaly-a2-default.md,
 * which was written when no such source was to hand.
 */
describe("FPMT monthly calendars, 2022-2026", () => {
	const numbering = fpmtNumberingMismatches;

	it("agrees on all but three of 1,826 days", () => {
		expect(numbering().map((r) => r.iso)).toEqual(["2022-12-03", "2023-11-09", "2024-12-08"]);
	});

	// The evidence the a2 decision record asked for and could not obtain. These pages are prepared
	// from the Men-Tsee-Khang calendar, so this is the almanac line deciding between the two
	// readings — and it decides for the default the engine already shipped.
	it("matches a2 = 1/28 better than Henning's value", () => {
		expect(numbering(PHUGPA).length).toBeLessThan(numbering(PHUGPA_HENNING).length);
	});

	// Henning's extra divergences are exactly the 2025 cluster Janson names, where FPMT sides with
	// the engine. If this ever empties, the negative control has stopped controlling.
	it("puts Henning's extra divergences at the 2025 doubled date", () => {
		const extra = numbering(PHUGPA_HENNING)
			.map((r) => r.iso)
			.filter((iso) => !numbering(PHUGPA).some((r) => r.iso === iso));
		expect(extra).toContain("2025-11-19");
	});

	/**
	 * The three residual divergences, catalogued rather than asserted away — the same treatment
	 * `crosscheck.test.ts` gives christian-steinert's 23.
	 *
	 * The shape is what is pinned, because the shape is what would change if the cause were
	 * something other than a one-off difference in which number a skipped or doubled date
	 * consumes: never in the month, never in the leap-month flag, never more than one in the day
	 * number, and always resolved again by the next day.
	 */
	it("keeps every residual divergence to one day, self-correcting immediately", () => {
		for (const row of numbering()) {
			const t = isoToTibetan(iso(row.iso));
			expect({ iso: row.iso, month: t.month, isLeapMonth: t.isLeapMonth }).toEqual({
				iso: row.iso,
				month: row.month,
				isLeapMonth: row.isLeapMonth ?? false,
			});
			// Never more than one in the day number. The sign is not constant, and that is not an
			// inconsistency: a skipped number pushes later days up while a doubled one pushes them
			// down. Stated in terms of the number *consumed*, FPMT is one higher every time — we
			// skip 10 where it skips 11, and we double 26 where it doubles 27.
			expect(Math.abs(t.day - row.day)).toBe(1);

			// The next day agrees again, so nothing propagates. None of the three is the last row,
			// so the lookup always resolves.
			const next = FPMT_OBSERVANCES[FPMT_OBSERVANCES.indexOf(row) + 1];
			expect(next).toBeDefined();
			expect(isoToTibetan(iso(next?.iso as string)).day).toBe(next?.day);
		}
	});
});
