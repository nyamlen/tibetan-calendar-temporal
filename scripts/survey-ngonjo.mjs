#!/usr/bin/env node
/**
 * Surveys the མངོན་བརྗོད *ngönjö* register marker across all sixty rabjung year names.
 *
 * Usage:
 *   node scripts/survey-ngonjo.mjs
 *
 * ## What it answers, and why the question needs this much care
 *
 * The sixty names look like ordinary Tibetan words and are not. The *tshig mdzod chen mo* tags a
 * sense `(mngon)` when it belongs to the *mngon brjod* register — the poetic-synonym vocabulary a
 * reader meets in verse and in almanacs rather than in speech. If the sense that identifies a name
 * as a year carries that tag, the sixty are literary vocabulary, which is a claim about what the
 * list **is**, and one nothing in this repository had ever checked.
 *
 * This prints a count. It gates nothing, and deliberately: register is a claim about audience, and
 * [docs/decisions/2026-08-24-year-naming-off-the-date.md] argues redundancy and recoverability
 * instead, precisely so that no shipped decision rests on it.
 *
 * ## What is taken from the source, and what is not
 *
 * The dictionary is a modern copyrighted work published through an aggregate whose README states
 * that copyright stays with the respective authors. So it may **gate** and may never be **quoted**,
 * exactly the standing wisdomlib already has here. Three facts are taken — that a headword exists,
 * that a sense carries a tag, and the element–animal a sense states — and no gloss text is stored,
 * printed, or written to any file. See docs/names/rabjung-sourcing.md, "The licence gate".
 *
 * ## Three ways this went wrong before it went right
 *
 * Each is a live trap for anyone re-running or extending it, and each inflated or deflated the
 * count by double figures:
 *
 * 1. **The marker has two scopes.** `{(mngon)} 1) {...} 2) {...}` tags the whole entry; `4) {(mngon)
 *    ...}` tags that sense alone. Reading "the entry contains (mngon)" conflates them and counts an
 *    entry whose *year* sense is ordinary vocabulary.
 * 2. **The year is not written the way the calendar writes it.** The dictionary omits the gender and
 *    abbreviates the animal — `me byi lo`, not `me pho byi ba` — and spells the monkey three ways
 *    (`spre`, `sprel`, `spre'u`). Matching the calendar's spelling scored 8/60 against the true 57.
 * 3. **A reverse sweep looks stronger and is worse.** Searching the whole dictionary for each year
 *    string returns mostly biographies — "born in the water-horse year" — and requiring the `lo`
 *    that those sentences carry drops the entries that write the year bare.
 *
 * The year each name should carry is computed here from the cycle, never read off the dictionary,
 * so a source's own identification is verified rather than trusted. The arithmetic proves itself
 * against four publicly known years before it is used to judge anything — the same rule as proving
 * a guard by mutation: establish that the instrument reads zero before measuring with it.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const DICTIONARY =
	"https://raw.githubusercontent.com/christiansteinert/tibetan-dictionary/master/_input/dictionaries/public/25-tshig-mdzod-chen-mo-Tib";

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

const ELEMENTS = ["shing", "me", "sa", "lcags", "chu"];
const ANIMALS = [
	"byi",
	"glang",
	"stag",
	"yos",
	"'brug",
	"sbrul",
	"rta",
	"lug",
	"spre",
	"bya",
	"khyi",
	"phag",
];
/** The spellings the dictionary actually uses, which the calendar's do not cover. */
const ALIASES = { spre: "(?:spre'u|sprel|spre)", byi: "(?:byi\\s+ba|byi)" };

const mod = (a, b) => ((a % b) + b) % b;

/** Element, gender and animal of a Gregorian year. 1027 opens the first rabjung, fire-female-hare. */
function yearSigns(year) {
	const n = year - 1027;
	return {
		element: ELEMENTS[mod(Math.floor((n + 3) / 2), 5)],
		gender: mod(n, 2) === 0 ? "mo" : "pho",
		animal: ANIMALS[mod(n + 3, 12)],
	};
}

function proveSignArithmetic() {
	const known = [
		[1027, "me mo yos"],
		[1966, "me pho rta"],
		[2008, "sa pho byi"],
		[2026, "me pho rta"],
	];
	for (const [year, want] of known) {
		const s = yearSigns(year);
		const got = `${s.element} ${s.gender} ${s.animal}`;
		if (got !== want) {
			throw new Error(
				`the checker itself is broken: ${year} computes as ${got}, but it is ${want}. ` +
					"Nothing below can be trusted until this passes.",
			);
		}
	}
}

/** Position, Wylie and first Gregorian year, from the committed fixture rather than re-derived. */
function readNames() {
	const source = readFileSync(join(root, "test/fixtures/rabjung-names.ts"), "utf8");
	const rows = [
		...source.matchAll(/position: (\d+),\s*\n\s*tibetan: "([^"]*)",\s*\n\s*wylie: "([^"]*)"/g),
	].map((m) => ({ position: Number(m[1]), wylie: m[3] }));

	// The first `years` after each position, since the row's later fields can also carry pairs.
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

/**
 * An entry's senses, each with the register tag in force for it.
 *
 * A tag before the first numbered sense governs the whole entry; one inside a sense governs that
 * sense. Splitting on the top-level `N)` keeps sub-senses (`1.`, `2.`) with the sense that carries
 * their tag, which is what position 59 needs.
 */
function senses(body) {
	const tagOf = (text) => (text.match(/\(([a-z' ]{2,14})\)/) ?? [])[1] ?? null;
	const parts = body.split(/\s*\d+\)\s*/);
	const prefix = parts.shift() ?? "";
	const entryTag = tagOf(prefix);
	if (parts.length === 0) return [{ text: prefix, tag: entryTag }];
	return parts.map((text) => ({ text, tag: tagOf(text) ?? entryTag }));
}

function indexEntries(text) {
	const entries = new Map();
	for (const line of text.split("\n")) {
		const bar = line.indexOf("|");
		if (bar < 0) continue;
		const head = line.slice(0, bar);
		if (!entries.has(head)) entries.set(head, []);
		entries.get(head).push(line.slice(bar + 1));
	}
	return entries;
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

const esc = (s) => s.replace(/'/g, "\\'");

function survey(rows, entries) {
	return rows.map((row) => {
		const want = yearSigns(row.year);
		const animal = ALIASES[want.animal] ?? esc(want.animal);
		const yearRe = new RegExp(`${esc(want.element)}\\s+(?:pho\\s+|mo\\s+)?${animal}\\b`);

		// Position 12 is filed one syllable short of the name, so the shortened head is tried too.
		const heads = [row.wylie, row.wylie.split(" ").slice(0, -1).join(" ")].filter(Boolean);
		let hit = null;
		let filedAs = null;
		for (const head of heads) {
			const all = (entries.get(head) ?? []).flatMap(senses);
			if (all.length > 0 && !filedAs) filedAs = head;
			const found = all.find((s) => yearRe.test(s.text));
			if (found) {
				hit = found;
				filedAs = head;
				break;
			}
		}
		return {
			position: row.position,
			wylie: row.wylie,
			year: row.year,
			sign: `${want.element} ${want.gender} ${want.animal}`,
			filedAs,
			statesYear: Boolean(hit),
			tag: hit?.tag ?? null,
		};
	});
}

proveSignArithmetic();

const response = await fetch(DICTIONARY);
if (!response.ok) throw new Error(`${DICTIONARY} answered ${response.status}`);
const text = await response.text();
const entries = indexEntries(text);
checkSourceUnchanged(text, entries);

const rows = readNames();
const results = survey(rows, entries);
const count = (predicate) => results.filter(predicate).length;

console.log("pos  name                  computed sign       states year  tag       filed as");
for (const r of results) {
	console.log(
		String(r.position).padStart(3),
		r.wylie.padEnd(21),
		r.sign.padEnd(19),
		r.statesYear ? "    yes   " : "    no    ",
		(r.tag ? `(${r.tag})` : "—").padEnd(9),
		r.filedAs && r.filedAs !== r.wylie ? r.filedAs : "",
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
