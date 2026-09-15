import { describe, expect, it } from "vitest";
import { MANSION_NAMES, mansionNames } from "../../src/astrology/mansion-names.js";
import { MANSION_COUNT } from "../../src/astrology/mansions.js";
import { MANSION_NAMES as VERIFIED } from "../fixtures/mansion-names.js";

/**
 * The shipped mansion names, held against `scripts/verify-mansion-and-trigram-names.mjs`'s output.
 *
 * The verifier needs the network and runs before a release; this closes the gap between runs, so a
 * hand-edit to `src/astrology/mansion-names.ts` fails `npm test` rather than shipping unverified.
 */
describe("the lunar-mansion names", () => {
	it("are twenty-seven, one per index, as the fixture has them", () => {
		expect(MANSION_NAMES).toHaveLength(MANSION_COUNT);
		expect(VERIFIED.map((row) => row.index)).toEqual([...Array(MANSION_COUNT).keys()]);
	});

	it("match the verified fixture character for character", () => {
		const bad: string[] = [];
		for (const row of VERIFIED) {
			const { tibetanName, sanskritName } = mansionNames(row.index);
			const shipped = [
				tibetanName.tibetan,
				tibetanName.wylie,
				tibetanName.phonetic,
				sanskritName.iast,
				sanskritName.devanagari,
			];
			const verified = [row.tibetan, row.wylie, row.phonetic, row.iast, row.devanagari];
			if (shipped.join("|") !== verified.join("|"))
				bad.push(`${row.index}: ${shipped.join("|")} ≠ ${verified.join("|")}`);
		}
		expect(bad).toEqual([]);
	});

	it("follow Das at 22 and 23, where the Mahāvyutpatti lists the two the other way round", () => {
		// Pinned by value: the decision is the whole content of these two rows.
		expect(mansionNames(22).sanskritName.iast).toBe("dhaniṣṭhā");
		expect(mansionNames(23).sanskritName.iast).toBe("śatabhiṣā");
		expect(VERIFIED[22]?.mahavyutpatti).toBe("mon gre|śatabhiṣā");
	});

	it("are frozen, so one consumer cannot rename a mansion for every other", () => {
		expect(Object.isFrozen(MANSION_NAMES)).toBe(true);
		expect(Object.isFrozen(mansionNames(0).tibetanName)).toBe(true);
	});
});
