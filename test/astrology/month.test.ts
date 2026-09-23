import { describe, expect, it } from "vitest";
import {
	monthAnimalNumber,
	monthAttributes,
	monthElementNumber,
} from "../../src/astrology/month.js";
import { yearAttributes } from "../../src/astrology/year.js";
import { hasCode } from "../../src/errors.js";
import { BHUTAN, BHUTAN_HENNING } from "../../src/traditions/bhutan.js";
import { PHUGPA, PHUGPA_HENNING } from "../../src/traditions/phugpa.js";
import { JANSON_MONTH_ANIMALS } from "../fixtures/janson-attributes.js";
import { thrownBy } from "../support/thrown.js";
import { VERSION_CONFIGS } from "../support/versions.js";

/**
 * Tier B, where the traditions fork on the **rule** rather than on a constant.
 *
 * Two kinds of check here, and they catch different things. The animal and gender go against
 * Janson's printed table, which he computed independently of the formulas. The element has **no
 * printed table** in the paper, so it is held instead against the statements he makes in prose
 * around the formula — the Tiger month takes the son of the year's element, each element is repeated
 * two months, Phugpa restarts every year and Tsurphu does not. Those are independent of the formula
 * in the sense that matters: a transcribed formula that is wrong fails them.
 */

const ELEMENTS = ["wood", "fire", "earth", "iron", "water"] as const;

const TSURPHU = VERSION_CONFIGS.tsurphu;

describe("the month animal and gender, against Janson's table", () => {
	it("reproduces both traditions' twelve animals", () => {
		const bad: string[] = [];
		for (const row of JANSON_MONTH_ANIMALS) {
			const phugpa = monthAttributes(PHUGPA, 2026, row.month);
			const tsurphu = monthAttributes(TSURPHU, 2026, row.month);
			if (phugpa.animal !== row.phugpa) {
				bad.push(`month ${row.month}: Phugpa ${phugpa.animal} ≠ ${row.phugpa}`);
			}
			if (tsurphu.animal !== row.tsurphu) {
				bad.push(`month ${row.month}: Tsurphu ${tsurphu.animal} ≠ ${row.tsurphu}`);
			}
		}
		expect(bad).toEqual([]);
	});

	it("puts the Tiger month where each tradition's config says it is", () => {
		// The config field is `tigerMonth` rather than an animal offset precisely so this is one fact
		// rather than two that can disagree. Janson: "Phugpa almanacs set month 11 = Tiger, while
		// Tsurphu almanacs set month 1 = Tiger".
		expect(monthAttributes(PHUGPA, 2026, 11).animal).toBe("tiger");
		expect(monthAttributes(TSURPHU, 2026, 1).animal).toBe("tiger");
		expect(monthAnimalNumber(PHUGPA, 11)).toBe(3);
		expect(monthAnimalNumber(TSURPHU, 1)).toBe(3);
	});

	it("makes odd months male and even female, in every tradition that answers", () => {
		const bad: string[] = [];
		for (const config of [PHUGPA, PHUGPA_HENNING, TSURPHU, VERSION_CONFIGS.mongolian]) {
			for (const row of JANSON_MONTH_ANIMALS) {
				const expected = row.month % 2 === 1 ? "male" : "female";
				const got = monthAttributes(config, 2026, row.month).gender;
				if (got !== expected) bad.push(`${config.id} month ${row.month}: ${got}`);
			}
		}
		expect(bad).toEqual([]);
	});

	it("does not vary the animal with the year", () => {
		// The animal is a function of the month number alone. A formula that let the year in would
		// still pass the table check above, which only ever asks about one year.
		const bad: string[] = [];
		for (let year = 2020; year <= 2040; year++) {
			for (const row of JANSON_MONTH_ANIMALS) {
				if (monthAttributes(PHUGPA, year, row.month).animal !== row.phugpa) {
					bad.push(`${year}-${row.month}`);
				}
			}
		}
		expect(bad).toEqual([]);
	});
});

describe("the month element, against Janson's prose", () => {
	it("gives Phugpa's Tiger month the son of the following year's element", () => {
		// Janson: the Tiger month — month 11 of the *preceding* year — "gets the element following the
		// element of the year". So month 11 of year Y belongs to year Y + 1.
		const bad: string[] = [];
		for (let year = 1900; year <= 2100; year++) {
			const power = yearAttributes(year + 1).power;
			const son = ELEMENTS[(ELEMENTS.indexOf(power) + 1) % 5];
			const got = monthAttributes(PHUGPA, year, 11).element;
			if (got !== son) bad.push(`${year}: month 11 is ${got}, son of ${power} is ${son}`);
		}
		expect(bad).toEqual([]);
	});

	it("repeats each element for two months across the twelve-month run from the Tiger month", () => {
		// The run opening with month 11 of year Y covers months 11 and 12 of Y and 1-10 of Y + 1, and
		// Janson says the pattern is the years': each element twice, male then female, then the next.
		// This is the check that fails if either arm of the two-arm formula is misphased — and it
		// crosses the year boundary, which a single-year sweep cannot.
		const bad: string[] = [];
		for (let year = 1900; year <= 2100; year++) {
			const run = [
				monthElementNumber(PHUGPA, year, 11),
				monthElementNumber(PHUGPA, year, 12),
				...Array.from({ length: 10 }, (_, i) => monthElementNumber(PHUGPA, year + 1, i + 1)),
			];
			const start = run[0] ?? 0;
			const expected = Array.from(
				{ length: 12 },
				(_, i) => ((start - 1 + Math.floor(i / 2)) % 5) + 1,
			);
			if (run.join(",") !== expected.join(",")) {
				bad.push(`${year}: ${run.join(",")} ≠ ${expected.join(",")}`);
			}
		}
		expect(bad).toEqual([]);
	});

	it("advances Phugpa's Tiger-month element one step a year", () => {
		// Janson states this of the continuous Tsurphu cycle and it holds of Phugpa's anchor too,
		// since the year's power element advances every two years and the son follows it.
		const bad: string[] = [];
		for (let year = 1900; year <= 2100; year++) {
			const here = monthElementNumber(PHUGPA, year, 11);
			const next = monthElementNumber(PHUGPA, year + 1, 11);
			const step = (next - here + 5) % 5;
			if (step !== 0 && step !== 1) bad.push(`${year}→${year + 1}: ${here}→${next}`);
		}
		expect(bad).toEqual([]);
	});

	it("runs Tsurphu's elements on continuously, month after month and year after year", () => {
		// The difference between the two rules, stated as a test: 12 months is six element-steps, so a
		// continuous cycle lands one step further on each year, with no restart.
		const bad: string[] = [];
		for (let year = 1900; year <= 2100; year++) {
			for (let month = 1; month <= 12; month++) {
				const nextMonth = month === 12 ? 1 : month + 1;
				const nextYear = month === 12 ? year + 1 : year;
				const here = monthElementNumber(TSURPHU, year, month);
				const next = monthElementNumber(TSURPHU, nextYear, nextMonth);
				// Two months per element, so a step happens on every other month and never skips one.
				const step = (next - here + 5) % 5;
				if (step > 1) bad.push(`${year}-${month}: ${here}→${next}`);
			}
		}
		expect(bad).toEqual([]);
	});

	it("differs from Phugpa on the element in the same year, which is the point of the two rules", () => {
		// A guard against the two arms collapsing into one. If a refactor ever made `elementRule`
		// unread, this is what notices.
		const phugpa = Array.from({ length: 12 }, (_, i) => monthElementNumber(PHUGPA, 2026, i + 1));
		const tsurphu = Array.from({ length: 12 }, (_, i) => monthElementNumber(TSURPHU, 2026, i + 1));
		expect(phugpa).not.toEqual(tsurphu);
	});
});

describe("the month number, which only one tradition has", () => {
	it("is null for Phugpa, because Janson says only Tsurphu calendars carry it", () => {
		const bad: string[] = [];
		for (let month = 1; month <= 12; month++) {
			const got = monthAttributes(PHUGPA, 2026, month).number;
			if (got !== null) bad.push(`month ${month}: ${got}`);
		}
		expect(bad).toEqual([]);
	});

	it("is null for Mongolia, which shares Tsurphu's animals but not its numbers", () => {
		// Janson gives Mongolia Tsurphu's rules for animal, gender and element, and says only Tsurphu
		// calendars number their months. The Mongolian test config reused Tsurphu's whole block until
		// 2026-09-13, numbers included, and no test noticed.
		const mongolian = VERSION_CONFIGS.mongolian;
		const bad: string[] = [];
		for (let month = 1; month <= 12; month++) {
			const got = monthAttributes(mongolian, 2026, month);
			if (got.number !== null) bad.push(`month ${month}: ${got.number}`);
		}
		expect(bad).toEqual([]);
		expect(monthAttributes(mongolian, 2026, 1).animal).toBe("tiger");
	});

	it("reads Janson's (3 − (12Y + M)) amod 9 for Tsurphu at a pinned value", () => {
		// 3 − (12·2026 + 1) = −24310 ≡ 8 (mod 9). The steps test below holds at any phase; this pins it.
		expect(monthAttributes(TSURPHU, 2026, 1).number).toBe(8);
		expect(monthAttributes(TSURPHU, 2026, 2).number).toBe(7);
	});

	it("decreases by one a month and by three a year for Tsurphu", () => {
		const bad: string[] = [];
		for (let year = 2000; year <= 2050; year++) {
			for (let month = 1; month <= 12; month++) {
				const here = monthAttributes(TSURPHU, year, month).number;
				if (here === null || here < 1 || here > 9) {
					bad.push(`${year}-${month}: ${here} is not one of the nine numbers`);
					continue;
				}
				const nextMonth = month === 12 ? 1 : month + 1;
				const nextYear = month === 12 ? year + 1 : year;
				const next = monthAttributes(TSURPHU, nextYear, nextMonth).number;
				if (next !== ((here + 7) % 9) + 1) bad.push(`${year}-${month}: ${here}→${next}`);
				const yearLater = monthAttributes(TSURPHU, year + 1, month).number;
				if (yearLater !== ((here + 5) % 9) + 1) {
					bad.push(`${year}-${month}: ${here} → ${yearLater} a year later, not −3`);
				}
			}
		}
		expect(bad).toEqual([]);
	});
});

describe("a tradition whose month attributes are unsourced refuses", () => {
	it("throws TCT_ATTRIBUTE_NOT_SOURCED for both Bhutanese configs", () => {
		for (const config of [BHUTAN, BHUTAN_HENNING]) {
			const error = thrownBy(() => monthAttributes(config, 2026, 1));
			expect(error?.code).toBe("TCT_ATTRIBUTE_NOT_SOURCED");
			expect(error?.message).toContain(config.name);
		}
	});

	it("carries a code no existence predicate swallows", () => {
		// `tibetanDateExists` answers `false` by allowlist — one class and two codes, everything else rethrown —
		// and this code must stay off it: a Bhutanese date exists perfectly well, only an attribute of
		// it is unsourced. Asserted through `hasCode`, the predicate the allowlist itself uses, so this
		// fails if the code is ever given one of those three instead.
		const error = thrownBy(() => monthAttributes(BHUTAN, 2026, 1));
		expect(error).toBeInstanceOf(RangeError);
		for (const swallowed of [
			"TCT_FIELD_OUT_OF_RANGE",
			"TCT_NO_SUCH_LEAP_MONTH",
			"TCT_SKIPPED_DAY",
		] as const) {
			expect(hasCode(error, swallowed)).toBe(false);
		}
	});

	it("refuses the helpers too, not only the composed answer", () => {
		// Both are exported for the lunar-day attributes, so a refusal that lived only in
		// `monthAttributes` would leak Phugpa's answers through the back door.
		expect(thrownBy(() => monthAnimalNumber(BHUTAN, 1))?.code).toBe("TCT_ATTRIBUTE_NOT_SOURCED");
		expect(thrownBy(() => monthElementNumber(BHUTAN, 2026, 1))?.code).toBe(
			"TCT_ATTRIBUTE_NOT_SOURCED",
		);
	});

	it("refuses a custom Tibetan config that has not opted in", () => {
		// The deciding case for "absence means refuse": a Mongolian config built from Phugpa's
		// constants must not inherit Phugpa's month animals, because Janson says Mongolia uses
		// Tsurphu's. Here the whole `naming` block is dropped instead.
		const { naming: _naming, ...custom } = PHUGPA;
		expect(thrownBy(() => monthAttributes(custom, 2026, 1))?.code).toBe(
			"TCT_ATTRIBUTE_NOT_SOURCED",
		);
	});

	it("says what is unsourced and what still answers", () => {
		const message = thrownBy(() => monthAttributes(BHUTAN, 2026, 1))?.message ?? "";
		expect(message).toMatch(/no source|not sourced|no month-animal list/);
		expect(message).toContain("calendar-day");
	});
});
