/**
 * Tsurphu, the Mongolian and the Bhutanese versions, checked against Janson rather than against
 * themselves.
 *
 * @remarks
 * Until now every external check this engine had was Phugpa's. This file adds the first for the
 * other three, and it is possible for a reason worth stating: **leap months depend on nothing
 * astronomical.** The intercalation index is built from the epoch year, the epoch month and the
 * tradition's leap-index threshold alone, so a tradition's leap months can be validated without any
 * of its mean-motion constants — which is exactly the part this project cannot yet source for them.
 *
 * That makes the claim here narrow and real, rather than broad and hopeful:
 *
 * - **Validated:** which month number is the leap month, and in which years, for all four versions
 *   over 2000-2030.
 * - **Not validated:** any day-level date for anything but Phugpa. That needs `m₀`, `s₀`, `a₀`, and
 *   `docs/traditions.md` records why those are not yet safe to transcribe.
 *
 * The configs come from `test/support/versions.ts` — `PHUGPA` with three fields replaced, which is
 * legitimate precisely because nothing else participates. `leapMonthPosition` is the third and does
 * not affect anything this file asserts — a leap month's *number* is the same whichever side of its
 * twin it falls — but `test/validation/bhutan.test.ts` turns on it, which is why the
 * four now live in one place rather than being restated per suite.
 */

import { describe, expect, it } from "vitest";
import { sharesNumberWithLeapMonth } from "../../src/computation/calendar.js";
import { BHUTAN, BHUTAN_HENNING } from "../../src/traditions/bhutan.js";
import { PHUGPA, PHUGPA_HENNING } from "../../src/traditions/phugpa.js";
import type { TraditionConfig } from "../../src/traditions/types.js";
import { CROSS_VERSION_LEAP } from "../fixtures/cross-version-leap.js";
import { VERSION_CONFIGS as CONFIGS, VERSIONS } from "../support/versions.js";

/** The leap month of a year, or `undefined` — the shape Janson's table is in. */
function leapMonthOf(config: TraditionConfig, year: number): number | undefined {
	for (let month = 1; month <= 12; month += 1) {
		if (sharesNumberWithLeapMonth(config, year, month)) return month;
	}
	return undefined;
}

const PRINTED = CROSS_VERSION_LEAP.filter((row) => !row.commented);
const COMMENTED = CROSS_VERSION_LEAP.filter((row) => row.commented);

describe("against the years Janson prints (2000-2020)", () => {
	it("has 21 of them", () => {
		expect(PRINTED).toHaveLength(21);
		expect(PRINTED[0]?.year).toBe(2000);
		expect(PRINTED.at(-1)?.year).toBe(2020);
	});

	for (const version of VERSIONS) {
		it(`reproduces every ${version} leap month`, () => {
			for (const row of PRINTED) {
				expect(
					leapMonthOf(CONFIGS[version] as TraditionConfig, row.year),
					`${version} ${row.year}`,
				).toBe(row[version]);
			}
		});
	}
});

describe("against the years Janson leaves commented in the source (2021-2030)", () => {
	// A second tier deliberately kept separate: these are his computed values, present in the LaTeX
	// but absent from the rendered paper. They are worth having and should never be cited as
	// published.
	it("has 10 of them", () => {
		expect(COMMENTED).toHaveLength(10);
	});

	for (const version of VERSIONS) {
		it(`reproduces every ${version} leap month`, () => {
			for (const row of COMMENTED) {
				expect(
					leapMonthOf(CONFIGS[version] as TraditionConfig, row.year),
					`${version} ${row.year}`,
				).toBe(row[version]);
			}
		});
	}
});

describe("the exported BHUTAN, not only the hand-built Bhutanese row", () => {
	// VERSION_CONFIGS.bhutanese is PHUGPA with three fields replaced; the shipped BHUTAN is its own
	// config. The leap-month claim made for the export has to be tested on the export.
	it("the exported BHUTAN's leap months match Janson's Bhutanese column", () => {
		const wrong = CROSS_VERSION_LEAP.filter(
			(row) => leapMonthOf(BHUTAN, row.year) !== row.bhutanese,
		).map((row) => `${row.year}: Janson ${row.bhutanese}, BHUTAN ${leapMonthOf(BHUTAN, row.year)}`);
		expect(CROSS_VERSION_LEAP).toHaveLength(31);
		expect(wrong).toEqual([]);
	});

	// The exported-means-validated record says the two Henning variants' leap months are validated,
	// PHUGPA_HENNING's "as Phugpa's". True by construction, since only the lunar anomaly differs and
	// leap months depend on nothing astronomical; held here on the exports so a change to either
	// config's leap fields is caught.
	it("the exported Henning variants' leap months match Janson's columns", () => {
		const cases: readonly (readonly [TraditionConfig, "phugpa" | "bhutanese"])[] = [
			[PHUGPA_HENNING, "phugpa"],
			[BHUTAN_HENNING, "bhutanese"],
		];
		const wrong = cases.flatMap(([config, column]) =>
			CROSS_VERSION_LEAP.filter((row) => leapMonthOf(config, row.year) !== row[column]).map(
				(row) => `${config.id} ${row.year}`,
			),
		);
		expect(wrong).toEqual([]);
	});
});

describe("what the agreement does and does not establish", () => {
	it("confirms Tsurphu and the Mongolian version share leap months", () => {
		// Janson states this in prose. Reproducing it from two configs that differ in both β* and
		// threshold is a stronger check than reading it off one column.
		for (const row of CROSS_VERSION_LEAP) {
			expect(leapMonthOf(CONFIGS.tsurphu as TraditionConfig, row.year)).toBe(
				leapMonthOf(CONFIGS.mongolian as TraditionConfig, row.year),
			);
		}
	});

	it("finds the Bhutanese leap month *number*, which is a narrower claim than it looks", () => {
		// Worth being precise about, because it is easy to over-read. Janson's simplified Bhutanese
		// rule is stated as "regular month M is *followed* by a leap month if ix = 57 or 58", and the
		// leap month takes M's number — so the number this engine reports is already the Bhutanese
		// one, and the agreement above is real.
		//
		// It says nothing about the leap month's *position*, which is what moves dates and is what
		// `leapMonthPosition` now expresses. This file would pass identically with the position set
		// wrongly, so it is not evidence for it — `test/validation/bhutan.test.ts` is.
		const bhutaneseLeapYears = CROSS_VERSION_LEAP.filter((row) => row.bhutanese !== undefined);
		expect(bhutaneseLeapYears.length).toBeGreaterThan(0);
		for (const row of bhutaneseLeapYears) {
			expect(leapMonthOf(CONFIGS.bhutanese as TraditionConfig, row.year)).toBe(row.bhutanese);
		}
	});

	it("does not claim any day-level date for a non-Phugpa tradition", () => {
		// A guard against this file being cited for more than it shows. The three non-Phugpa configs
		// carry Phugpa's astronomical constants, so any date they produce is Phugpa's, not theirs.
		for (const version of ["tsurphu", "mongolian", "bhutanese"] as const) {
			const config = CONFIGS[version] as TraditionConfig;
			expect(config.meanDate).toBe(PHUGPA.meanDate);
			expect(config.meanSun).toBe(PHUGPA.meanSun);
			expect(config.lunarAnomaly).toBe(PHUGPA.lunarAnomaly);
		}
	});
});
