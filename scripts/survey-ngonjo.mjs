#!/usr/bin/env node
/**
 * Surveys the མངོན་བརྗོད *ngönjö* register marker across all sixty rabjung year names.
 *
 * Usage:
 *   node scripts/survey-ngonjo.mjs
 *
 * ## What it answers
 *
 * The sixty names look like ordinary Tibetan words and are not — see the plain-language account in
 * `scripts/tibetan-dictionary.mjs`, which also holds the reading logic this shares with
 * `verify-rabjung-names.mjs` and the three traps that logic exists to avoid. If the sense that
 * identifies a name as a year carries the `(mngon)` tag, the sixty are literary vocabulary, which
 * is a claim about what the list **is**.
 *
 * This prints a count and gates nothing, deliberately: register is a claim about audience, and
 * `docs/decisions/2026-08-24-year-naming-off-the-date.md` argues redundancy and recoverability
 * instead, so that no shipped decision rests on it. The generator uses the same facts for something
 * narrower and load-bearing — checking that the *word* an authored English gloss describes is the
 * word we think it is.
 *
 * ## What is taken from the source, and what is not
 *
 * Facts only: that a headword exists, that a sense carries a tag, and the element–animal a sense
 * states. No gloss text is stored, printed, or written to any file. The dictionary may **gate** and
 * may never be **quoted**; see docs/names/rabjung-sourcing.md, "The licence gate".
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	DICTIONARIES,
	fetchDictionary,
	indexEntries,
	provePredicates,
	senses,
	signsForYear,
	statesYearInWylie,
} from "./tibetan-dictionary.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const TSHIG_MDZOD = DICTIONARIES.find((d) => d.id === "tshigmdzod");

/**
 * What the source said when this survey was written, and refuses to run without.
 *
 * A count quoted from a source that has since changed is worse than no count, so the expectations
 * are stated rather than assumed. `mngonAtLeast` is deliberately loose — the tag's exact frequency
 * is not the finding — while the two singletons are exact, because both are load-bearing: `(mong)`
 * is what position 12 hangs on, and `(legs)` is what makes position 6 a transliteration.
 */
const EXPECTED = {
	mngonAtLeast: 3000,
	mongIsHapax: true,
	angGiRaTag: "legs",
};

/** Position, Wylie and first Gregorian year, from the committed fixture rather than re-derived. */
function readNames() {
	const source = readFileSync(join(root, "test/fixtures/rabjung-names.ts"), "utf8");
	const rows = [
		...source.matchAll(/position: (\d+),\s*\n\s*tibetan: "([^"]*)",\s*\n\s*wylie: "([^"]*)"/g),
	].map((m) => ({ position: Number(m[1]), wylie: m[3] }));

	// The first `years` after each position, since a row's later fields can also carry pairs.
	const years = new Map();
	for (const y of source.matchAll(/position: (\d+),[\s\S]*?years: \[(\d+), (\d+)\]/g)) {
		if (!years.has(Number(y[1]))) years.set(Number(y[1]), Number(y[2]));
	}
	for (const row of rows) row.year = years.get(row.position);

	if (rows.length !== 60 || rows.some((r) => !r.year)) {
		throw new Error(`expected 60 rows each with a year; parsed ${rows.length}`);
	}
	return rows;
}

function checkSourceUnchanged(text, entries) {
	const problems = [];
	const mngon = (text.match(/\(mngon\)/g) ?? []).length;
	if (mngon < EXPECTED.mngonAtLeast) {
		problems.push(
			`(mngon) appears ${mngon} times, under the ${EXPECTED.mngonAtLeast} this survey was ` +
				"written against. The download is probably truncated.",
		);
	}
	const mong = (text.match(/\(mong\)/g) ?? []).length;
	if (EXPECTED.mongIsHapax && mong !== 1) {
		problems.push(
			`(mong) appears ${mong} times, not once. Position 12 rests on it being a singleton beside ` +
				"3520 (mngon), which is the whole basis for reading it as a slip rather than a register.",
		);
	}
	const angGiRa = (entries.get("ang gi ra") ?? []).flatMap(senses);
	if (!angGiRa.some((s) => s.tag === EXPECTED.angGiRaTag)) {
		problems.push(
			`ang gi ra is no longer tagged (${EXPECTED.angGiRaTag}). Position 6 is reported as a ` +
				"transliteration on the strength of that tag; without it the claim is unsupported.",
		);
	}
	if (problems.length > 0) {
		console.error("The source no longer says what this survey was written against:\n");
		for (const p of problems) console.error(`  - ${p}`);
		process.exit(1);
	}
}

provePredicates();

const text = await fetchDictionary(TSHIG_MDZOD);
const entries = indexEntries(text);
checkSourceUnchanged(text, entries);

const results = readNames().map((row) => {
	const signs = signsForYear(row.year);
	// Position 12 is filed one syllable short of the name. The shortened head is only safe where it
	// is not itself one of the sixty, which `sna tshogs dbyig` (39) shortening to `sna tshogs` (16)
	// is exactly the case against.
	const heads = [row.wylie];
	const shortened = row.wylie.split(" ").slice(0, -1).join(" ");
	if (shortened) heads.push(shortened);

	let hit = null;
	let filedAs = null;
	for (const head of heads) {
		const all = (entries.get(head) ?? []).flatMap(senses);
		if (all.length > 0 && !filedAs) filedAs = head;
		const found = all.find((s) => statesYearInWylie(s.text, signs));
		if (found) {
			hit = found;
			filedAs = head;
			break;
		}
	}
	return {
		position: row.position,
		wylie: row.wylie,
		sign: `${signs.element} ${signs.gender} ${signs.animal}`,
		filedAs: filedAs === row.wylie ? "" : (filedAs ?? "— absent —"),
		statesYear: Boolean(hit),
		tag: hit?.tag ?? null,
	};
});

const count = (predicate) => results.filter(predicate).length;

console.log("pos  name                  computed sign       states year  tag       filed as");
for (const r of results) {
	console.log(
		String(r.position).padStart(3),
		r.wylie.padEnd(21),
		r.sign.padEnd(19),
		r.statesYear ? "    yes   " : "    no    ",
		(r.tag ? `(${r.tag})` : "—").padEnd(9),
		r.filedAs,
	);
}

console.log("");
console.log(`states its own computed year   ${count((r) => r.statesYear)}/60`);
console.log(`  tagged (mngon)               ${count((r) => r.tag === "mngon")}/60`);
console.log(`  tagged something else        ${count((r) => r.tag && r.tag !== "mngon")}/60`);
console.log(`  untagged                     ${count((r) => r.statesYear && !r.tag)}/60`);
console.log(`no year sense                  ${count((r) => !r.statesYear)}/60`);
console.log("");
console.log("Every row that is not a plain (mngon), which is where the interest is:");
for (const r of results.filter((r) => r.tag !== "mngon")) {
	console.log(
		`  ${String(r.position).padStart(2)} ${r.wylie.padEnd(20)} ` +
			(r.statesYear
				? r.tag
					? `tagged (${r.tag})`
					: "states its year, untagged"
				: "no sense states its year"),
	);
}
