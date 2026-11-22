import { describe, expect, it } from "vitest";
import { HENNING_28, MANSION_ELEMENTS } from "../../src/astrology/mansion-elements.js";
import { MANSION_NAMES } from "../../src/astrology/mansion-names.js";

// M4.2: `LUNAR_MANSIONS` zips the name table and Henning's element table purely by position, and the
// two are ordered on different authorities (the names follow Das at 22 and 23, where the
// Mahāvyutpatti lists Śatabhiṣā first). Nothing else checks that index i names one mansion in both,
// so re-sourcing either table could ship a mansion with its neighbour's element.

// Henning's spelling (lowercased) to the name table's IAST, where they differ. Each entry is a
// spelling variant of one mansion; none may pair two mansions.
const VARIANTS: Readonly<Record<string, string>> = {
	kṛittikā: "kṛttikā",
	mṛigaśiras: "mṛgaśiras",
	āśleṣā: "aśleṣā",
	jyeṣṭha: "jyeṣṭhā",
	pūrvāṣhāḍhā: "pūrvāṣāḍhā",
	śravaṇa: "śravaṇā",
	śatabhiṣaj: "śatabhiṣā",
	pūrvabhādrapāda: "pūrvabhadrapadā",
	uttarabhādrapāda: "uttarabhadrapadā",
};

const kept = HENNING_28.filter((mansion) => mansion.name !== "Abhijit");
const spelling = (name: string) => name.normalize("NFC").toLowerCase();

describe("Henning's element table and the name table describe one mansion per index", () => {
	it("keeps the 27 mansions the names number", () => {
		expect(kept.map((mansion) => mansion.element)).toEqual(MANSION_ELEMENTS);
		expect(kept).toHaveLength(MANSION_NAMES.length);
	});

	it("names the same mansion at every index", () => {
		const misaligned = kept.flatMap((mansion, index) => {
			const henning = spelling(mansion.name);
			const name = MANSION_NAMES[index]?.sanskritName.iast.normalize("NFC");
			return (VARIANTS[henning] ?? henning) === name ? [] : [`${index}: ${henning} / ${name}`];
		});
		expect(misaligned).toEqual([]);
	});

	it("uses every spelling variant, so none can hide a mismatch", () => {
		const henning = new Set(kept.map((mansion) => spelling(mansion.name)));
		expect(Object.keys(VARIANTS).filter((variant) => !henning.has(variant))).toEqual([]);
	});

	it("never maps Dhaniṣṭhā and Śatabhiṣā onto each other, the contested pair", () => {
		const pairs = Object.entries(VARIANTS).filter(
			([from, to]) =>
				(from.startsWith("dhani") && to.startsWith("śatabhi")) ||
				(from.startsWith("śatabhi") && to.startsWith("dhani")),
		);
		expect(pairs).toEqual([]);
	});
});
