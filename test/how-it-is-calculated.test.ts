import { describe, expect, it } from "vitest";
import { monthNamesFor } from "../src/month-names.js";
import { datesFor, monthsFor } from "../src/months.js";
import { MANSION_NAMES } from "./fixtures/mansion-names.js";

/**
 * Every claim `docs/how-it-is-calculated.md` makes that states a value.
 *
 * @remarks
 * That document ships to npm alongside `docs/guide.md`, so its figures are contract for a reader in
 * exactly the same way — but nothing asserted them until 2026-09-17, and the gap had already cost
 * one: it said a doubled or skipped day occurs in "roughly a quarter of all months", where the true
 * figure is 94%. A prose statistic in a shipped document is a value, and this suite is where it is
 * pinned.
 *
 * Kept out of `test/guide.test.ts` for the reason that file gives for its own split: a suite named
 * for one document while guarding another names the wrong file when it fails.
 */
describe("how-it-is-calculated claims", () => {
	// The long sweep carries an explicit timeout: under v8 coverage instrumentation the 200-year
	// range runs well past vitest's 5s default, which is how `npm run coverage` broke silently once.
	describe("the frequency of doubled and skipped days", () => {
		it("is 94% skipped and 64% doubled over 1900-2100 under Phugpa", { timeout: 30_000 }, () => {
			let months = 0;
			let withSkipped = 0;
			let withDoubled = 0;
			let days30 = 0;

			for (let year = 1900; year <= 2100; year++) {
				for (const month of monthsFor(year)) {
					const dates = datesFor(month);
					const present = new Set(dates.map((date) => date.day));
					months++;
					for (let day = 1; day <= 30; day++) {
						if (!present.has(day)) {
							withSkipped++;
							break;
						}
					}
					if (dates.some((date) => date.isLeapDay)) withDoubled++;
					if (dates.length === 30) days30++;
				}
			}

			const percent = (count: number) => Math.round((100 * count) / months);
			expect(percent(withSkipped)).toBe(94);
			expect(percent(withDoubled)).toBe(64);
			// "a month comes out 30 calendar days slightly more often than 29"
			expect(days30).toBeGreaterThan(months - days30);
		});
	});

	describe("the table of months against mansions", () => {
		// Month, then the mansion index the document prints. Month 8 is named for the pair 24 + 25,
		// and its step is counted from the first of them, which the document states.
		const TABLE = [
			{ month: 1, mansion: 9, step: 2 },
			{ month: 2, mansion: 11, step: 2 },
			{ month: 3, mansion: 13, step: 2 },
			{ month: 4, mansion: 15, step: 2 },
			{ month: 5, mansion: 17, step: 2 },
			{ month: 6, mansion: 19, step: 2 },
			{ month: 7, mansion: 21, step: 2 },
			{ month: 8, mansion: 24, step: 3 },
			{ month: 9, mansion: 0, step: 3 },
			{ month: 10, mansion: 2, step: 2 },
			{ month: 11, mansion: 4, step: 2 },
			{ month: 12, mansion: 7, step: 3 },
		] as const;

		const mansionAt = (index: number) => {
			const row = MANSION_NAMES.find((name) => name.index === index);
			if (row === undefined) throw new Error(`no mansion ${index} in the fixture`);
			return row;
		};

		it("names each month for the mansion the document gives, in the shipped Tibetan", () => {
			const wrong: string[] = [];
			for (const { month, mansion } of TABLE) {
				const shipped = monthNamesFor({ year: 2153, month }).mansion.tibetanName.wylie;
				// Month 8 is the stem its two mansions share, so it matches neither in full.
				const expected = month === 8 ? "khrums" : mansionAt(mansion).wylie;
				if (shipped !== expected) wrong.push(`month ${month}: ${shipped} != ${expected}`);
			}
			expect(wrong).toEqual([]);
		});

		it("has month 8 as the stem of mansions 24 and 25", () => {
			expect(mansionAt(24).wylie).toBe("khrums stod");
			expect(mansionAt(25).wylie).toBe("khrums smad");
			expect(monthNamesFor({ year: 2153, month: 8 }).mansion.tibetanName.wylie).toBe("khrums");
		});

		it("steps by 2 nine times and by 3 three times, summing to the 27 mansions", () => {
			const steps = TABLE.map(({ month, mansion }) => {
				const previous = TABLE[(month + 10) % 12];
				if (previous === undefined) throw new Error("table is not twelve rows");
				return (mansion - previous.mansion + 27) % 27;
			});
			expect(steps).toEqual(TABLE.map((row) => row.step));
			expect(steps.filter((step) => step === 2)).toHaveLength(9);
			expect(steps.filter((step) => step === 3)).toHaveLength(3);
			expect(steps.reduce((total, step) => total + step, 0)).toBe(27);
		});
	});
});
