#!/usr/bin/env node
/**
 * Extracts the Tibetan name vocabulary from Janson's LaTeX, verifies it against independent
 * authorities, and refuses to write anything if any check fails.
 *
 * Usage — from a scratch directory **outside** this repository:
 *   npm init -y && npm install jsewts tibetan-ewts-converter
 *   node /path/to/repo/scripts/verify-name-sources.mjs /path/to/tibet.tex
 *
 * Obtain the paper's source with:
 *   curl -L -o 1401.6285.gz https://arxiv.org/e-print/1401.6285
 *   gzip -dc 1401.6285.gz > tibet.tex
 *
 * `-L` is required, not cosmetic: arXiv redirects /e-print/ to /src/, and without it curl saves the
 * 215-byte redirect page. `gzip -dc` then fails and leaves an empty tibet.tex, so the failure
 * surfaces as "label T7 not found" rather than as a download error.
 *
 * Keep `tibet.tex` outside this repository too — see CLAUDE.md.
 *
 * ## Why this exists
 *
 * Janson is the sole source this package derives from, and for the name vocabulary he is not
 * sufficient alone. His day-of-week table gives Saturday as `spen ma`; his Bhutan appendix gives
 * `spen pa` for the same day in Tibet. The wrong one reached a shipped docblock and sat there for
 * three phases, because nothing checked prose against an outside source.
 *
 * ## The verification chain
 *
 * Five checks, each independent of the others. Any failure aborts the whole run.
 *
 * 1. **Wylie** is extracted mechanically from Janson's tables — never transcribed.
 * 2. **Script** is produced by *two* independent EWTS implementations — `jsewts` (BDRC's) and
 *    `tibetan-ewts-converter` — which must agree exactly. One converter is an opinion; two that
 *    agree is a result.
 * 3. **Round trip**: converting the script back to Wylie must return the Wylie we started from,
 *    which catches a conversion that is self-consistent but wrong.
 * 4. **Lexical existence**: English Wiktionary must have an entry at exactly that script title.
 *    This is the check that catches `spen ma` — EWTS converts it happily to `སྤེན་མ`, because
 *    conversion is mechanical and knows nothing about whether a word exists, but Wiktionary has no
 *    such entry while it does have `སྤེན་པ`.
 * 5. **CLDR**, for the seven weekdays only: the converted script must match what `Intl` gives for
 *    the `bo` locale, ignoring the `གཟའ་` planet prefix. A third lineage, entirely offline, and it
 *    independently confirms `spen pa`.
 *
 * Phonetics come from THL's own converter, which is the standard's publisher, in its "Words
 * separated by" mode through `scripts/thl.mjs`. A two-syllable name is one word, so THL joins it
 * (`spen pa` is *penpa*); a name of three syllables or more needs a ruling in
 * `scripts/word-boundaries.data.json`, and the generated `vocabulary.md` says how many terms here
 * are that long. Each word of a
 * multi-syllable term must also be a headword in an accepted dictionary, or the run refuses.
 *
 * ## Why this is not on the CI path
 *
 * Two of the five checks need the network, and the converters live outside the repo by design — no
 * all-rights-reserved or incidental package enters this tree or its lockfile. So this runs **by
 * hand before a release**, the same standing as `npm run coverage`, which nothing gates either.
 *
 * What CI checks is the committed *output*: `test/fixtures/names.ts` is read by the suite, so a
 * hand-edit to `src/names.ts` fails `npm test` even if this script has not run in months.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
	fetchGateSets,
	loadBoundaries,
	phoneticsFor,
	provePredicates as proveThlPredicates,
	syllablesOf,
} from "./thl.mjs";

const source = process.argv[2];
if (!source) {
	console.error("usage: node scripts/verify-name-sources.mjs <path-to-tibet.tex>");
	process.exit(1);
}

// Resolve the converters from the caller's directory so they can live outside this repository.
const requireFromCwd = createRequire(pathToFileURL(join(process.cwd(), "package.json")));
let fromWylie;
let toWylie;
let secondConverter;
try {
	({ fromWylie, toWylie } = requireFromCwd("jsewts"));
	const { EwtsConverter } = requireFromCwd("tibetan-ewts-converter");
	secondConverter = new EwtsConverter();
} catch (error) {
	console.error(
		"cannot resolve the EWTS converters from the current directory.\n" +
			"Install them in a scratch directory outside this repo and run the script from there:\n" +
			"  npm init -y && npm install jsewts tibetan-ewts-converter\n" +
			`(${error.message})`,
	);
	process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const text = readFileSync(source, "utf8");
const lines = text.split("\n");

const problems = [];
const fail = (message) => problems.push(message);

// ---------------------------------------------------------------------------------------------
// 1. Extraction
// ---------------------------------------------------------------------------------------------

/** Rows of a LaTeX tabular, located by the `\label{...}` that follows it. */
function tableRows(label) {
	const end = lines.findIndex((l) => l.includes(`\\label{${label}}`));
	if (end === -1) throw new Error(`label ${label} not found — is this the right source file?`);
	const rows = [];
	for (let i = end; i >= 0 && !lines[i].includes("\\begin{table}"); i--) {
		const line = lines[i];
		if (/^\s*%/.test(line) || !line.includes("&")) continue;
		rows.unshift(line.replace(/\\\\.*$/, "").trim());
	}
	return rows;
}

const cellsOf = (row) =>
	row.split("&").map((c) =>
		c
			.replace(/\\tibxx?\{([^}]*)\}/g, "$1")
			.replace(/\\[a-zA-Z]+\{?|\}/g, "")
			.trim(),
	);

/** The seven weekdays: index, English, Wylie, planet, astrological element. */
const weekdays = [];
for (const row of tableRows("T7")) {
	const c = cellsOf(row);
	if (c.length !== 5 || !/^\d$/.test(c[0])) continue;
	weekdays.push({
		kind: "weekday",
		key: c[0],
		english: c[1],
		wylie: c[2],
		planet: c[3].toLowerCase(),
		element: c[4].toLowerCase(),
	});
}
if (weekdays.length !== 7) throw new Error(`expected 7 weekday rows, got ${weekdays.length}`);

/** The ten-year cycle gives element and gender together, as `shing-pho`. */
const elements = new Map();
const genders = new Map();
for (const row of tableRows("T10")) {
	const c = cellsOf(row);
	if (c.length < 5 || !/^\d+$/.test(c[0])) continue;
	const [element, gender] = c[4].split("-");
	if (!element || !gender) {
		fail(`ten-year-cycle row has no element-gender pair: ${row}`);
		continue;
	}
	elements.set(c[2].toLowerCase(), element);
	genders.set(c[3].toLowerCase(), gender);
}
if (elements.size !== 5) fail(`expected 5 elements, got ${elements.size}`);
if (genders.size !== 2) fail(`expected 2 genders, got ${genders.size}`);

/** The twelve-year cycle: animal, gender, Wylie. */
const animals = new Map();
for (const row of tableRows("T12")) {
	const c = cellsOf(row);
	if (c.length < 5 || !/^\d+$/.test(c[0])) continue;
	animals.set(c[2].toLowerCase(), c[4]);
}
if (animals.size !== 12) fail(`expected 12 animals, got ${animals.size}`);

const terms = [
	...weekdays,
	...[...elements].map(([key, wylie]) => ({ kind: "element", key, wylie })),
	...[...genders].map(([key, wylie]) => ({ kind: "gender", key, wylie })),
	...[...animals].map(([key, wylie]) => ({ kind: "animal", key, wylie })),
];

// ---------------------------------------------------------------------------------------------
// Corrections to the source, as data carrying their own evidence
//
// Janson is not self-consistent here, so a correction is unavoidable. Making it a table rather than
// an edit keeps three properties: the original is visible, the evidence travels with it, and the
// correction **self-invalidates** — each one is re-checked below, and if the wrong form ever starts
// passing (a corrected reprint, a new Wiktionary entry) the script says so instead of quietly
// applying a patch that is no longer needed.
// ---------------------------------------------------------------------------------------------
const CORRECTIONS = [
	{
		kind: "weekday",
		key: "0",
		from: "spen ma",
		to: "spen pa",
		why:
			"Janson's day-of-week table has `spen ma`, but his own Bhutan appendix has `spen pa` for " +
			"the same day in Tibet. Two independent authorities agree with the appendix: English " +
			"Wiktionary has an entry at སྤེན་པ and none at སྤེན་མ, and CLDR's bo locale gives སྤེན་པ. " +
			"It is also the form behind the common personal name penpa.",
	},
];

for (const correction of CORRECTIONS) {
	const term = terms.find((t) => t.kind === correction.kind && t.key === correction.key);
	if (!term) {
		fail(`correction for ${correction.kind} ${correction.key} has nothing to correct`);
		continue;
	}
	if (term.wylie !== correction.from) {
		fail(
			`correction for ${correction.kind} ${correction.key} expected "${correction.from}" but the ` +
				`source now reads "${term.wylie}" — re-check whether the correction is still needed`,
		);
		continue;
	}
	term.wylie = correction.to;
	term.correctedFrom = correction.from;
	console.log(
		`correcting ${correction.kind} ${correction.key}: "${correction.from}" -> "${correction.to}"`,
	);
}

// ---------------------------------------------------------------------------------------------
// 2 + 3. Script, by two converters that must agree, and a round trip
// ---------------------------------------------------------------------------------------------

/** Vowel signs Unicode discourages; see `test/unicode-tibetan.test.ts` for why they matter. */
const DISCOURAGED = ["ཱི", "ཷ", "ཹ", "ཱྀ"];

for (const term of terms) {
	const first = fromWylie(term.wylie);
	const second = secondConverter.to_unicode(term.wylie);
	if (first !== second) {
		fail(
			`${term.kind} ${term.key}: EWTS converters disagree on "${term.wylie}" — ${first} vs ${second}`,
		);
		continue;
	}
	const back = toWylie(first).trim();
	if (back !== term.wylie) {
		fail(
			`${term.kind} ${term.key}: "${term.wylie}" converts to ${first}, which reads back as "${back}"`,
		);
		continue;
	}
	for (const codepoint of DISCOURAGED) {
		if (first.includes(codepoint)) {
			fail(`${term.kind} ${term.key}: ${first} contains a discouraged composite vowel sign`);
		}
	}
	term.tibetan = first;
}

// ---------------------------------------------------------------------------------------------
// 4. Lexical existence, by exact Wiktionary title
//
// Exact titles rather than a search, because search is far too loose here: searching `glang` (ox)
// returns `གླང་ཆེན`, which is *elephant*, and searching `bya` (bird) returns `བྱ་སྒྲོ`, a feather.
// ---------------------------------------------------------------------------------------------

const UA = "tibetan-calendar-temporal fixture verification (https://github.com/nyamlen)";

async function existingTitles(titles) {
	const found = new Set();
	for (let i = 0; i < titles.length; i += 20) {
		const batch = titles.slice(i, i + 20);
		const response = await fetch(
			"https://en.wiktionary.org/w/api.php?action=query&format=json&titles=" +
				encodeURIComponent(batch.join("|")),
			{ headers: { "User-Agent": UA } },
		);
		if (!response.ok) throw new Error(`Wiktionary returned ${response.status}`);
		const pages = Object.values((await response.json()).query?.pages ?? {});
		for (const page of pages) if (!("missing" in page)) found.add(page.title);
	}
	return found;
}

const withScript = terms.filter((t) => t.tibetan);
// Each correction's *original* is looked up too. If a form we rejected turns out to have an entry,
// the correction is no longer justified and must be re-argued rather than silently kept.
const supersededScripts = CORRECTIONS.map((c) => fromWylie(c.from));
const known = await existingTitles([...withScript.map((t) => t.tibetan), ...supersededScripts]);
for (const [index, correction] of CORRECTIONS.entries()) {
	const superseded = supersededScripts[index];
	if (known.has(superseded)) {
		fail(
			`the correction "${correction.from}" -> "${correction.to}" is no longer justified: ` +
				`Wiktionary now has an entry at ${superseded}. Re-argue it before keeping it.`,
		);
	}
}
for (const term of withScript) {
	if (!known.has(term.tibetan)) {
		fail(
			`${term.kind} ${term.key}: no English Wiktionary entry at "${term.tibetan}" ` +
				`(from Janson's "${term.wylie}"). The conversion is mechanical and cannot tell whether a ` +
				"word exists; this check can. `spen ma` fails here, `spen pa` does not.",
		);
	}
}

// ---------------------------------------------------------------------------------------------
// 5. CLDR, for the weekdays — a third lineage, entirely offline
// ---------------------------------------------------------------------------------------------

const PLANET_PREFIX = "གཟའ་";
const saturday = Temporal.PlainDate.from("2026-02-14"); // a Saturday, i.e. Tibetan weekday 0
for (const term of weekdays) {
	if (!term.tibetan) continue;
	const cldr = saturday
		.add({ days: Number(term.key) })
		.toLocaleString("bo", { weekday: "long" })
		.replace(PLANET_PREFIX, "")
		.replace(/་$/, "");
	if (cldr !== term.tibetan) {
		fail(
			`weekday ${term.key} (${term.english}): Janson's "${term.wylie}" converts to ${term.tibetan}, ` +
				`but CLDR's bo locale gives ${cldr}`,
		);
	}
}

// ---------------------------------------------------------------------------------------------
// Phonetics, from THL's converter — the publisher of the standard
// ---------------------------------------------------------------------------------------------

{
	const broken = await proveThlPredicates();
	if (broken.length > 0) {
		console.error(
			`the checker itself is broken, so nothing below can be trusted:\n  - ${broken.join("\n  - ")}`,
		);
		process.exit(2);
	}
}

const { results, problems: thlProblems } = await phoneticsFor(
	withScript.map((t) => ({ id: `${t.kind} ${t.key}`, wylie: t.wylie })),
	{ boundaries: loadBoundaries(), gate: await fetchGateSets(), userAgent: UA },
);
for (const p of thlProblems) fail(`${p.id}: ${p.message}`);
for (const term of withScript) {
	const result = results.get(`${term.kind} ${term.key}`);
	if (result) term.phonetic = result.phonetic;
}

// ---------------------------------------------------------------------------------------------
// Report, then emit only if everything held
// ---------------------------------------------------------------------------------------------

for (const term of terms) {
	console.log(
		`  ${term.kind.padEnd(7)} ${term.key.padEnd(8)} ${(term.wylie ?? "").padEnd(10)} ` +
			`${(term.tibetan ?? "—").padEnd(10)} ${term.phonetic ?? "—"}`,
	);
}

if (problems.length > 0) {
	console.error(`\n${problems.length} problem(s); nothing written:\n`);
	for (const problem of problems) console.error(`  - ${problem}`);
	process.exit(1);
}

const byKind = (kind) => terms.filter((t) => t.kind === kind);
const quote = (s) => JSON.stringify(s);
const row = (t) =>
	`\t{ key: ${quote(t.key)}, tibetan: ${quote(t.tibetan)}, wylie: ${quote(t.wylie)}, phonetic: ${quote(t.phonetic)} },`;

writeFileSync(
	join(root, "test", "fixtures", "names.ts"),
	`/**
 * The Tibetan name vocabulary, verified against independent authorities.
 *
 * @remarks
 * GENERATED by \`scripts/verify-name-sources.mjs\`. Do not edit by hand — re-run the script.
 *
 * Every row passed five independent checks: the Wylie was extracted mechanically from Janson's
 * tables; two EWTS implementations agreed on the script; the script read back as the same Wylie;
 * English Wiktionary has an entry at exactly that title; and for the weekdays, CLDR's \`bo\` locale
 * agrees with the result.
 *
 * The fourth check is the one that earns its keep. Janson gives Saturday as \`spen ma\` in his
 * day-of-week table and \`spen pa\` in his Bhutan appendix. EWTS converts both happily, because
 * conversion is mechanical; Wiktionary has an entry for the second and none for the first, and CLDR
 * independently gives the second.
 *
 * The suite reads this file, so a hand-edit to \`src/names.ts\` fails \`npm test\` even though the
 * generating script is not on the CI path.
 */

export interface NameFixtureRow {
	/** Weekday index 0-6, or the English identifier of an element, gender or animal. */
	key: string;
	tibetan: string;
	wylie: string;
	phonetic: string;
}

export const WEEKDAY_NAMES: readonly NameFixtureRow[] = [
${byKind("weekday").map(row).join("\n")}
];

export const ELEMENT_NAMES: readonly NameFixtureRow[] = [
${byKind("element").map(row).join("\n")}
];

export const GENDER_NAMES: readonly NameFixtureRow[] = [
${byKind("gender").map(row).join("\n")}
];

export const ANIMAL_NAMES: readonly NameFixtureRow[] = [
${byKind("animal").map(row).join("\n")}
];

/** Planet and astrological element per weekday, from Janson's day-of-week table. */
export const WEEKDAY_ATTRIBUTES: readonly {
	key: string;
	english: string;
	planet: string;
	element: string;
}[] = [
${weekdays.map((d) => `\t{ key: ${quote(d.key)}, english: ${quote(d.english)}, planet: ${quote(d.planet)}, element: ${quote(d.element)} },`).join("\n")}
];
`,
);

// Counted rather than written down, so a longer term added to the source changes the sentence that
// describes it instead of leaving it saying "none".
const longer = terms.filter((t) => syllablesOf(t.wylie).length > 2);
const longerNote =
	longer.length === 0
		? "none here"
		: `${longer.length} here: ${longer.map((t) => `\`${t.wylie}\``).join(", ")}`;

const docRow = (t) => `| \`${t.key}\` | ${t.tibetan} | \`${t.wylie}\` | *${t.phonetic}* |`;
writeFileSync(
	join(root, "docs", "names", "vocabulary.md"),
	`# Name sources

**Status: generated.** Produced by \`scripts/verify-name-sources.mjs\`; re-run it rather than editing
this file.

## Provenance, column by column

| Column | Source | Standing |
|---|---|---|
| Wylie | Janson's day-of-week table and his ten- and twelve-year cycle tables | **Sourced**, extracted mechanically |
| Tibetan | \`jsewts\` and \`tibetan-ewts-converter\`, required to agree | **Derived**, by two independent implementations |
| Phonetic | THL Simplified Phonetic Transcription, from THL's own converter in its "Words separated by" mode: a two-syllable name is one word and is joined, longer names per \`scripts/word-boundaries.data.json\` (${longerNote}) | **Sourced** |
| Planet, element, English | Janson's day-of-week table | **Sourced** |

## What each row survived

1. **Mechanical extraction** from the LaTeX — no hand transcription.
2. **Two EWTS implementations agreeing** on the script. One converter is an opinion; two agreeing
   is a result.
3. **A round trip** back to the same Wylie, which catches a conversion that is self-consistent but
   wrong.
4. **An English Wiktionary entry at exactly that title.** Exact titles, never a search: searching
   \`glang\` (ox) returns *elephant*, and \`bya\` (bird) returns *feather*.
5. **CLDR agreement**, for the seven weekdays, from \`Intl\` with the \`bo\` locale — a third lineage,
   entirely offline.

**Why check 4 earns its place.** Janson gives Saturday as \`spen ma\` in the day-of-week table and
\`spen pa\` in the Bhutan appendix, for the same day in Tibet. EWTS converts both without complaint,
because conversion is mechanical and knows nothing about whether a word exists. Wiktionary has an
entry for one and not the other, and CLDR agrees with it. The slip fails here rather than shipping —
as it previously did, into a docblock, unnoticed for three phases.

## Weekdays

| # | Tibetan | Wylie | THL phonetic |
|---|---|---|---|
${byKind("weekday").map(docRow).join("\n")}

## Elements

| Element | Tibetan | Wylie | THL phonetic |
|---|---|---|---|
${byKind("element").map(docRow).join("\n")}

## Genders

| Gender | Tibetan | Wylie | THL phonetic |
|---|---|---|---|
${byKind("gender").map(docRow).join("\n")}

## Animals

| Animal | Tibetan | Wylie | THL phonetic |
|---|---|---|---|
${byKind("animal").map(docRow).join("\n")}
`,
);

console.log(
	`\nall ${terms.length} terms passed; wrote test/fixtures/names.ts and docs/names/vocabulary.md`,
);
