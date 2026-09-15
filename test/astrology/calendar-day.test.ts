import { describe, expect, it } from "vitest";
import { TRIGRAM_NAMES, TRIGRAMS } from "../../src/astrology/calendar-day.js";
import { TRIGRAM_NAMES as VERIFIED } from "../fixtures/trigram-names.js";

/**
 * The trigram vocabulary, held against `scripts/verify-mansion-and-trigram-names.mjs`'s output.
 *
 * The order matters as much as the words: Janson's formulas index the eight by his numbering, so a
 * table with the right words in another order would put every day on the wrong trigram.
 */
describe("the trigrams", () => {
	it("are Janson's eight English words, in his numbered order", () => {
		expect(TRIGRAMS).toEqual(
			[...VERIFIED].sort((a, b) => a.number - b.number).map((row) => row.englishName),
		);
	});

	it("carry the verified Tibetan names character for character", () => {
		const bad: string[] = [];
		for (const row of VERIFIED) {
			const name = TRIGRAM_NAMES[row.englishName as keyof typeof TRIGRAM_NAMES];
			const shipped = [name?.tibetan, name?.wylie, name?.phonetic].join("|");
			const verified = [row.tibetan, row.wylie, row.phonetic].join("|");
			if (shipped !== verified) bad.push(`${row.englishName}: ${shipped} ≠ ${verified}`);
		}
		expect(bad).toEqual([]);
	});

	it("are frozen", () => {
		expect(Object.isFrozen(TRIGRAM_NAMES)).toBe(true);
		expect(Object.isFrozen(TRIGRAM_NAMES.fire)).toBe(true);
	});
});
