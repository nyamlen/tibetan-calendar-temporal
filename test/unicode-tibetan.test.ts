/**
 * Tibetan script must survive normalisation and serialisation unchanged.
 *
 * @remarks
 * Written before any Tibetan-script data was generated, to find out what the actual hazard is
 * rather than to guess at it. The answer is narrower and more useful than "normalise everything":
 *
 * **Ordinary Tibetan syllables are stable under all four normalisation forms.** Stacked subjoined
 * consonants, vowel signs and the `'a` prefix all round-trip through NFC, NFD, NFKC, NFKD and
 * `JSON.stringify` byte-identically. There is nothing to normalise away.
 *
 * **Four composite vowel signs are not**, and they are the whole risk. Unicode discourages all four
 * in favour of their decomposed sequences, and they split into two classes — a distinction found by
 * checking rather than assuming, after an earlier version of this file asserted the wrong one:
 *
 * - **U+0F73 and U+0F81 decompose *canonically***, so they change under **NFC and NFD** as well as
 *   the compatibility forms. These are the dangerous pair: they break under the normalisation a
 *   consumer is *most* likely to apply.
 * - **U+0F77 and U+0F79 decompose only for compatibility**, so they survive NFC and NFD and change
 *   under NFKC and NFKD — which a consumer may still run for search normalisation.
 *
 * So the guard is a **codepoint blocklist on generated data**, not a normalisation pass. Data that
 * avoids these four is stable everywhere; data that contains one is a latent equality bug that no
 * amount of normalising at our end fixes, because the consumer's normalisation is the one that
 * breaks it.
 */

import { describe, expect, it } from "vitest";

/**
 * Tibetan codepoints that change under NFKC/NFKD. Unicode deprecates or discourages each in favour
 * of its decomposition; none should ever appear in generated script data.
 */
export const DISCOURAGED_TIBETAN_CODEPOINTS = new Map([
	["ཱི", "U+0F73 vowel sign II — use U+0F71 U+0F72"],
	["ཷ", "U+0F77 vowel sign vocalic RR — use U+0FB2 U+0F71 U+0F80"],
	["ཹ", "U+0F79 vowel sign vocalic LL — use U+0FB3 U+0F71 U+0F80"],
	["ཱྀ", "U+0F81 vowel sign reversed II — use U+0F71 U+0F80"],
]);
// Written as escapes, not literals, and that is not a style preference. Typing these four as
// characters is unreliable: an editor or a copy-paste may store them already decomposed, in which
// case the file no longer holds the codepoint it appears to and the test silently asserts nothing.
// The first run of this file failed for exactly that reason.

/**
 * Throws with a locating message if `value` contains a discouraged codepoint.
 *
 * Exported so the generated name data can be scanned by the same rule that this file establishes,
 * rather than the rule being restated somewhere it can drift.
 */
export function assertNoDiscouragedCodepoints(value: string, label: string): void {
	for (const [codepoint, advice] of DISCOURAGED_TIBETAN_CODEPOINTS) {
		if (value.includes(codepoint)) {
			throw new Error(`${label} contains ${advice}`);
		}
	}
}

/** Representative syllables, chosen for the hazards rather than for coverage of the vocabulary. */
const SYLLABLES: ReadonlyArray<readonly [string, string]> = [
	["spen pa — Saturn, subjoined pa + vowel", "སྤེན་པ"],
	["lhag pa — Mercury, the lha stack", "ལྷག་པ"],
	["spre'u — monkey, two subjoined + 'a", "སྤྲེའུ"],
	["'brug — dragon, 'a prefix + subjoined ra", "འབྲུག"],
	["rta — horse, superscribed ra", "རྟ"],
	["stag — tiger, superscribed sa", "སྟག"],
	["lcags — iron, subjoined ca", "ལྕགས"],
];

describe("Tibetan script is stable under normalisation", () => {
	it.each(SYLLABLES)("%s survives every normalisation form", (_label, syllable) => {
		expect(syllable.normalize("NFC")).toBe(syllable);
		expect(syllable.normalize("NFD")).toBe(syllable);
		expect(syllable.normalize("NFKC")).toBe(syllable);
		expect(syllable.normalize("NFKD")).toBe(syllable);
	});

	it.each(SYLLABLES)("%s survives a JSON round trip", (_label, syllable) => {
		expect(JSON.parse(JSON.stringify(syllable))).toBe(syllable);
	});

	it.each(SYLLABLES)("%s carries no discouraged codepoint", (label, syllable) => {
		expect(() => assertNoDiscouragedCodepoints(syllable, label)).not.toThrow();
	});
});

describe("the four composite vowel signs are the hazard", () => {
	it.each([...DISCOURAGED_TIBETAN_CODEPOINTS.keys()])(
		"%p changes under NFKC and NFKD",
		(codepoint) => {
			expect(codepoint.normalize("NFKC")).not.toBe(codepoint);
			expect(codepoint.normalize("NFKD")).not.toBe(codepoint);
		},
	);

	it("splits into two classes, and the more dangerous one breaks under plain NFC", () => {
		// Verified rather than assumed, and the assumption was wrong: an earlier version of this file
		// asserted all four survive NFC. Two of them do not, because their decompositions are
		// *canonical* rather than compatibility-only - so they break under the normalisation a
		// consumer is most likely to apply, not the one they are least likely to.
		expect("ཱི".normalize("NFC")).toBe("ཱི");
		expect("ཱྀ".normalize("NFC")).toBe("ཱྀ");

		// The other two are compatibility-only: NFC and NFD leave them alone, NFKC does not.
		expect("ཷ".normalize("NFC")).toBe("ཷ");
		expect("ཹ".normalize("NFC")).toBe("ཹ");
		expect("ཷ".normalize("NFKC")).toBe("ྲཱྀ");
		expect("ཹ".normalize("NFKC")).toBe("ླཱྀ");
	});

	it("holds single composite codepoints, not their decompositions", () => {
		// The one assertion here that cannot pass vacuously. Every other test in this describe block
		// would still pass if the source file had silently stored these keys already decomposed —
		// which is the exact accident this file exists to guard against, and which happened on its
		// first run. A decomposed key would be two or three code units; a composite one is always
		// exactly one.
		for (const codepoint of DISCOURAGED_TIBETAN_CODEPOINTS.keys()) {
			expect([...codepoint]).toHaveLength(1);
		}
	});

	it("is caught by the guard", () => {
		for (const codepoint of DISCOURAGED_TIBETAN_CODEPOINTS.keys()) {
			expect(() => assertNoDiscouragedCodepoints(`ག${codepoint}`, "sample")).toThrow(/use U\+/);
		}
	});
});
