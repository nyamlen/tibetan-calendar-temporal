import { describe, expect, it } from "vitest";
import { isoToTibetan, tibetanToIso } from "../../src/computation/conversion.js";
import { FPMT_HOLY_DAYS } from "../fixtures/fpmt-holy-days.js";

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
