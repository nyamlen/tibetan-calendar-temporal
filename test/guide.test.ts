import { describe, expect, it } from "vitest";
import {
	isoToTibetan,
	julianDayFromIso,
	tibetanDateExists,
	tibetanToIso,
	tibetanWeekday,
} from "../src/computation/conversion.js";
import { yearNameFor } from "../src/cycles.js";
import { formatTibetanDate } from "../src/format.js";
import { monthsFor } from "../src/months.js";
import { GELUG, getObservances, observancesOn } from "../src/observances/index.js";
import { parseTibetanDate } from "../src/parse.js";
import { SkippedDayError } from "../src/types.js";

const iso = (s: string) => Temporal.PlainDate.from(s);

/**
 * Every claim `docs/guide.md` makes that states a value, asserted exactly as written there.
 *
 * The guide took the long-form material the README shed when it became a landing page, and these
 * cases came with it. They are split out of `test/readme.test.ts` rather than left there because a
 * suite named for one document while guarding another is a suite nobody will think to update: the
 * failure names the wrong file, and the person fixing it edits the wrong prose.
 *
 * The split was per-case, not per-block. The four `describe`s in the README suite did not align
 * with the README/guide boundary at all — its "usage examples" block alone spanned material that
 * landed on both sides — so each `it` was triaged on where its example now lives.
 *
 * `docs/guide.md` ships to npm, so these examples are contract for a consumer exactly as the
 * README's are. If one changes, change the guide in the same commit.
 */
describe("guide examples", () => {
	const date = isoToTibetan(iso("2026-08-12"));

	// The date's route back to its own month, and the invariant that makes it usable: the number on
	// the date is the number on the month containing it.
	it("carries the lunation of the month containing it", () => {
		const month = monthsFor(date.year).find((m) => m.monthCode === date.monthCode);
		expect(date.lunation).toBe(month?.lunation);
		expect(month?.yearName).toEqual(yearNameFor(date.year));
	});

	it("numbers the weekday as ISO 8601 and names it through Temporal", () => {
		expect(date.dayOfWeek).toBe(3);
		expect(date.isoDate.dayOfWeek).toBe(3);
		expect(date.isoDate.toLocaleString("en-GB", { weekday: "long" })).toBe("Wednesday");
		// The Tibetan numbering, 0 = Saturday, kept separate from the ISO field. Available both as
		// a field and from a Julian day, and the two must agree.
		expect(date.tibetanWeekday).toBe(4);
		expect(tibetanWeekday(julianDayFromIso(iso("2026-08-12")))).toBe(4);
	});

	it("numbers lunations consecutively, with the leap month before its twin", () => {
		const lunations = monthsFor(2151).map((m) => m.lunation);
		for (let i = 1; i < lunations.length; i++) {
			expect(lunations[i]).toBe((lunations[i - 1] ?? Number.NaN) + 1);
		}
		const months = monthsFor(2151);
		const leap = months.find((m) => m.monthCode === "M06L");
		const regular = months.find((m) => m.monthCode === "M06");
		expect(leap?.lunation).toBe((regular?.lunation ?? Number.NaN) - 1);
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

	it("moves the 2024 Chokhor Duchen to 9 July under a spread config", () => {
		const kopan = { ...GELUG, id: "kopan", doubledDay: "first" as const };
		expect(observancesOn(iso("2024-07-09"), kopan).map((o) => o.rule.id)).toContain(
			"chokhor-duchen",
		);
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
});
