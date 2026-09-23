/**
 * The Tibetan codepoints generated script data must never contain, and the guard that checks.
 *
 * @remarks
 * A helper rather than part of `unicode-tibetan.test.ts` because two test files need it and Biome
 * rightly refuses exports from a test file. The reasoning behind the list lives in that test.
 */

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

/**
 * Every run of Tibetan script in `text` that would not survive a reader's normalisation or that
 * has another script spliced into it, with its 1-based line.
 *
 * @remarks
 * Added 2026-09-23, after the polyfill probe found `docs/how-it-is-calculated.md` shipping a
 * garbled *mngon brjod*: a Latin `b` inside the Tibetan, and stacks that changed under NFC. The
 * blocklist above could not see it — none of the four composite vowel signs was involved — so this
 * asks the general question instead: does the text survive NFC unchanged, and is each run one
 * script?
 */
export function unstableTibetanRuns(text: string): string[] {
	const found: string[] = [];
	text.split("\n").forEach((line, index) => {
		for (const [run] of line.matchAll(/[ༀ-࿿](?:[ༀ-࿿]|[A-Za-z]+(?=[ༀ-࿿]))*/g)) {
			if (run.normalize("NFC") !== run || /[A-Za-z]/.test(run))
				found.push(`line ${index + 1}: ${run}`);
		}
	});
	return found;
}
