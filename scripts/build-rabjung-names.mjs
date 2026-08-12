#!/usr/bin/env node
/**
 * Builds `docs/rabjung-names.md` — the 60 rabjung year names side by side, with the provenance
 * of every column, so the question of what to ship can be decided from evidence.
 *
 * Usage:
 *   node scripts/build-rabjung-names.mjs <path-to-tibet.tex> <path-to-samvatsara.wiki>
 *
 * Obtain the two sources with:
 *   curl -o 1401.6285.gz https://arxiv.org/e-print/1401.6285 && gzip -dc 1401.6285.gz > tibet.tex
 *   curl -o samvatsara.wiki "https://en.wikipedia.org/w/index.php?title=Samvatsara&action=raw"
 *
 * Keep both OUTSIDE this repository, for the licence reason in CLAUDE.md.
 *
 * This is a **reference table, not a fixture.** Nothing in `src/` or `test/` reads it. It exists
 * so a decision about `rabjung.name` can be taken against real data rather than recollection, and
 * so the columns that are sourced stay visibly separate from the columns that are not.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const [texPath, wikiPath] = process.argv.slice(2);
if (!texPath || !wikiPath) {
	console.error("usage: node scripts/build-rabjung-names.mjs <tibet.tex> <samvatsara.wiki>");
	process.exit(1);
}

// ---------------------------------------------------------------------------------------------
// Janson §"The 60 year cycle", the table captioned "The Chinese and Indian 60 year cycles of
// names": Wylie and his ASCII Sanskrit, plus the two Gregorian years per row.
//
// `T60` below is the LaTeX *label*, used here only as a grep anchor — it is not a table number,
// and the caption above is what identifies the table. See the citation rule in CLAUDE.md.
// ---------------------------------------------------------------------------------------------
const tex = readFileSync(texPath, "utf8").split("\n");
const texStart = tex.findIndex((l) => l.includes("element--animal & Tibetan & Sanskrit"));
const texEnd = tex.findIndex((l) => l.includes("\\label{T60}"));
if (texStart === -1 || texEnd === -1) throw new Error("T60 not found — wrong source file?");

const janson = [];
for (const line of tex.slice(texStart, texEnd)) {
	const m = line
		.replace(/\\\\.*$/, "")
		.match(
			/^\s*(\d+)\s*&\s*(\d+)\s*&\s*(\w+)--(\w+)\s*&([^&]+)&([^&]+)&\s*(\d{4})\s*&\s*(\d{4})\s*$/,
		);
	if (!m) continue;
	janson.push({
		n: Number(m[1]),
		element: m[3].toLowerCase(),
		animal: m[4].toLowerCase(),
		wylie: m[5].trim(),
		sanskrit: m[6].trim(),
		years: [Number(m[7]), Number(m[8])],
	});
}
if (janson.length !== 60) throw new Error(`expected 60 Janson rows, got ${janson.length}`);

// ---------------------------------------------------------------------------------------------
// The Indian samvatsara list: IAST and Devanagari, with its own Gregorian years.
// ---------------------------------------------------------------------------------------------
const wiki = readFileSync(wikiPath, "utf8");
const wikiTable = wiki.slice(wiki.indexOf('{| class="wikitable sortable"'));
const indic = [];
for (const row of wikiTable.split("\n|-\n").slice(1)) {
	const cells = row.split("\n|").map((c) => c.trim());
	if (cells.length < 10) continue;
	// The number cell carries an inline style, so the value is whatever follows the last pipe.
	const num = (cells[0].split("|").pop() ?? "")
		.replace(/&nbsp;/g, "")
		.replace(/\.\s*$/, "")
		.trim();
	if (!/^\d+$/.test(num)) continue;
	indic.push({
		n: Number(num),
		iast: cells[1],
		devanagari: cells[2],
		current: Number((cells[8].match(/(\d{4})/) ?? [])[1]),
		prior: Number((cells[9].match(/(\d{4})/) ?? [])[1]),
	});
}
if (indic.length !== 60) throw new Error(`expected 60 samvatsara rows, got ${indic.length}`);

// ---------------------------------------------------------------------------------------------
// Cross-check, not assumption. The two lists reach this file by completely separate routes --
// Henning via Janson's LaTeX, and Sewell & Fleet via the samvatsara table -- so if row n of each
// names the same pair of Gregorian years, they are the same cycle at the same offset. Any
// mismatch means the alignment is wrong and every joined row below would be silently misaligned.
// ---------------------------------------------------------------------------------------------
for (const j of janson) {
	const w = indic.find((r) => r.n === j.n);
	if (!w) throw new Error(`no samvatsara row for ${j.n}`);
	if (w.prior !== j.years[0] || w.current !== j.years[1])
		throw new Error(
			`row ${j.n} year mismatch: Janson ${j.years.join("/")} vs samvatsara ${w.prior}/${w.current}`,
		);
}

// ---------------------------------------------------------------------------------------------
// Wylie to Tibetan script.
//
// Written out rather than hand-typing 60 entries: a converter's mistakes are systematic and so
// findable, where 60 hand conversions fail randomly and silently. That is the same reasoning
// CLAUDE.md gives for generating the date fixtures.
//
// This covers the subset the list actually uses, which is ordinary vocabulary. It is not a
// general EWTS implementation and should not be reused as one.
// ---------------------------------------------------------------------------------------------
const CONSONANTS = {
	k: "ཀ",
	kh: "ཁ",
	g: "ག",
	ng: "ང",
	c: "ཅ",
	ch: "ཆ",
	j: "ཇ",
	ny: "ཉ",
	t: "ཏ",
	th: "ཐ",
	d: "ད",
	n: "ན",
	p: "པ",
	ph: "ཕ",
	b: "བ",
	m: "མ",
	ts: "ཙ",
	tsh: "ཚ",
	dz: "ཛ",
	w: "ཝ",
	zh: "ཞ",
	z: "ཟ",
	"'": "འ",
	y: "ཡ",
	r: "ར",
	l: "ལ",
	sh: "ཤ",
	s: "ས",
	h: "ཧ",
	a: "ཨ",
};
const SUBJOINED = { y: "ྱ", r: "ྲ", l: "ླ", w: "ྭ" };
const VOWELS = { i: "ི", u: "ུ", e: "ེ", o: "ོ" };
const PREFIXES = new Set(["g", "d", "b", "m", "'"]);
const HEADS = new Set(["r", "l", "s"]);

/** Unicode subjoined form of a root consonant, used when it sits under a superscript. */
function subjoinOf(letter) {
	const base = CONSONANTS[letter];
	if (!base) throw new Error(`no consonant for ${letter}`);
	// Subjoined consonants are the base letter's codepoint shifted into the U+0F90 block.
	return String.fromCodePoint(base.codePointAt(0) - 0x0f40 + 0x0f90);
}

/** Splits a Wylie syllable into its ordered consonant and vowel tokens. */
function tokenize(syllable) {
	const tokens = [];
	let i = 0;
	while (i < syllable.length) {
		const three = syllable.slice(i, i + 3);
		const two = syllable.slice(i, i + 2);
		const one = syllable[i];
		if (CONSONANTS[three]) {
			tokens.push(three);
			i += 3;
		} else if (CONSONANTS[two]) {
			tokens.push(two);
			i += 2;
		} else if (CONSONANTS[one] || VOWELS[one]) {
			tokens.push(one);
			i += 1;
		} else throw new Error(`unparsable Wylie "${syllable}" at ${i}`);
	}
	return tokens;
}

function convertSyllable(syllable) {
	const tokens = tokenize(syllable);

	// Wylie "a" after a consonant is the *implicit* vowel: it writes nothing, but it still marks
	// where the onset ends and the coda begins. Treating it as a consonant put a spurious ཨ in
	// every open syllable (`rab` came out རྸབ); deleting it instead loses the boundary and turns
	// the same word into the cluster རྦ. It has to stay in place and emit "".
	const vowelAt = tokens.findIndex((t) => VOWELS[t] !== undefined || t === "a");
	const onsetEnd = vowelAt === -1 ? tokens.length : vowelAt;

	// Everything after the vowel is coda; with no written vowel the coda is whatever cannot be
	// part of the onset cluster, which for this vocabulary is everything past the first two.
	let onset = tokens.slice(0, onsetEnd);
	let coda = tokens.slice(onsetEnd + (vowelAt === -1 ? 0 : 1));

	if (vowelAt === -1) {
		// Implicit "a". The onset is at most prefix+super+root+subjoin; the rest is coda.
		const keep = [];
		for (const t of onset) {
			const enough =
				keep.length >= 2 &&
				!(keep.length === 2 && SUBJOINED[t]) &&
				!(keep.length === 2 && PREFIXES.has(keep[0]) && HEADS.has(keep[1]));
			if (enough) break;
			keep.push(t);
		}
		coda = onset.slice(keep.length).concat(coda);
		onset = keep;
	}

	let subjoin = "";
	if (onset.length > 1 && SUBJOINED[onset[onset.length - 1]]) {
		subjoin = SUBJOINED[onset.pop()];
	}

	let prefix = "";
	let head = "";
	const root = onset[onset.length - 1];
	if (onset.length === 3) {
		prefix = CONSONANTS[onset[0]];
		head = CONSONANTS[onset[1]];
	} else if (onset.length === 2) {
		if (HEADS.has(onset[0]) && !PREFIXES.has(onset[0])) head = CONSONANTS[onset[0]];
		else if (PREFIXES.has(onset[0])) prefix = CONSONANTS[onset[0]];
		else head = CONSONANTS[onset[0]];
	}

	// A superscript keeps its own form and the root drops beneath it.
	const stack = head ? head + subjoinOf(root) + subjoin : CONSONANTS[root] + subjoin;
	const vowel = vowelAt === -1 ? "" : (VOWELS[tokens[vowelAt]] ?? "");
	return prefix + stack + vowel + coda.map((c) => CONSONANTS[c]).join("");
}

/** Irregulars: Sanskrit transliterations that do not follow Tibetan orthography. */
const IRREGULAR = {
	"anggi ra": "ཨང་གི་ར",
	"spre'u": "སྤྲེའུ",
};

function toTibetan(wylie) {
	if (IRREGULAR[wylie]) return `${IRREGULAR[wylie]}་`;
	const syllables = wylie.split(/\s+/).map(convertSyllable);
	return `${syllables.join("་")}་`;
}

// ---------------------------------------------------------------------------------------------
// Authored columns. NOT sourced -- see the provenance table in the generated document.
// ---------------------------------------------------------------------------------------------
const AUTHORED = JSON.parse(
	readFileSync(join(dirname(fileURLToPath(import.meta.url)), "rabjung-names.data.json"), "utf8"),
);

// ---------------------------------------------------------------------------------------------
// Emit.
// ---------------------------------------------------------------------------------------------
const rows = janson.map((j) => {
	const w = indic.find((r) => r.n === j.n);
	const extra = AUTHORED[String(j.n)] ?? {};
	return {
		...j,
		iast: w.iast,
		devanagari: w.devanagari,
		tibetan: toTibetan(j.wylie),
		lhasa: extra.lhasa ?? "",
		english: extra.english ?? "",
	};
});

const doc = `# The 60 rabjung year names

**Status: reference table, not shipped data.** Nothing in \`src/\` or \`test/\` reads this file. It
exists so the decision about \`rabjung.name\` — see
[roadmap.md](roadmap.md#beyond-v1) — can be taken against real data rather than recollection.

GENERATED by \`scripts/build-rabjung-names.mjs\`. Re-run it rather than editing the table; the
authored columns live in \`scripts/rabjung-names.data.json\`.

## Provenance, column by column

Read this before using any of it. The columns are **not** of equal standing.

| Column | Source | Standing |
|--------|--------|----------|
| Wylie | Janson §"The 60 year cycle", the table captioned "The Chinese and Indian 60 year cycles of names" — taken in turn from Henning, *Kālacakra and the Tibetan Calendar*, Appendix I | **Sourced.** Extracted mechanically from the LaTeX |
| Sanskrit (Janson) | the same table | **Sourced**, but unusable as a key — \`pramadi\` covers rows 4, 13 and 47 |
| IAST | Sewell & Fleet, *The Siddhantas and the Indian Calendar* (1924), 292–294; S. Balachandra Rao, *Indian Astronomy* (2000), 59 — via the Wikipedia saṃvatsara table | **Sourced.** This is the *Indian* list, not a rendering of Janson's |
| Devanāgarī | the same | **Sourced** |
| Tibetan script | converted from the Wylie column by this script | **Derived, unverified.** No human or authority has checked it |
| Lhasa phonetics | written for this table | **Authored, unverified** |
| English | written for this table, from the Sanskrit and the Tibetan | **Authored, unverified** |

### The alignment is checked, not assumed

The two name lists reach this file by entirely separate routes — Henning through Janson's LaTeX,
Sewell & Fleet through the saṃvatsara table. Each carries its own pair of Gregorian years, and the
generator **fails** unless all 60 rows agree on both. They do, which is what licenses joining them
by index.

### The two Sanskrit lists are not the same strings

Janson prints the forms as Tibetan tradition received them; the IAST column is the Indic original.
So row 3 is \`suklata\` against *Śukla*, row 6 \`ankira\` against *Āṅgirasa*, row 12
\`vahudhvanya\` against *Bahudhānya*. Shipping the IAST means shipping names a Tibetan almanac
does not print. Shipping Janson's means bare ASCII with no Devanāgarī, in spellings he himself
flags as varying between sources.

One point in the IAST column's favour: it **resolves the collision**. Where Janson has \`pramadi\`
three times, the Indic list distinguishes *Pramodūta* (4), *Pramāthi* (13) and *Pramādin* (47).

And one against it, which is heavier. At a handful of positions the two lists carry **different
names, not different spellings**, and where they do the Tibetan sides with Janson:

| # | Tibetan | meaning | Janson | Indic IAST |
|---|---------|---------|--------|------------|
| 20 | \`mi zad\` | inexhaustible | \`aksaya\` | Avyaya/Vyaya |
| 29 | \`myos byed\` | intoxicating | \`mada\` | Manmatha |
| 52 | \`dus kyi pho nya\` | messenger of time | \`kaladuti\` | Kālayukta |
| 60 | \`zad pa\` | exhaustion | \`ksayaka\` | Akshaya |

Rows 20 and 60 are the clearest: \`mi zad\` *is* *akṣaya* and \`zad pa\` *is* *kṣaya*, so Janson's
forms translate the Tibetan while the Indic list uses other names at those positions. Shipping the
IAST column would therefore mean naming years things the Tibetan tradition does not call them —
a correctness problem, not a matter of style.

### How far each unsourced column can be trusted

They are unverified in different ways, and lumping them together would overstate the doubt about
one and understate it about another.

**Tibetan script — mechanical, high confidence, wants confirmation rather than review.** Produced
by a converter, and every row was checked by eye against Tibetan stacking rules. The converter is
not a general EWTS implementation and should not be reused as one; two entries (\`anggi ra\`,
\`spre'u\`) are hard-coded because they are Sanskrit transliterations that do not follow Tibetan
orthography. Its first run put a spurious ཨ in every open syllable, which is the kind of error a
converter makes and a human does not — systematic, and therefore caught. What it needs now is
someone who reads Tibetan to confirm it, not to re-derive it.

**Lhasa phonetics — rule-governed but with judgment calls.** These apply the conventions in
\`CLAUDE.md\` to the Wylie. Three places where a second opinion would help:

- Row 21 \`thams cad 'dul\` is rendered as two words, *tamché dül*; one word is also defensible.
- Rows 38 and 59 are a feminine/masculine pair, \`khro mo\` and \`khro bo\`. They are kept distinct
  as *thromo* and *throwo* rather than collapsed, which matters because the English gloss is
  otherwise identical.
- Row 6 \`anggi ra\` is a Sanskrit name in Tibetan letters, so "Lhasa phonetics" is nominal there.

**English — the weakest column, and the one that cannot be sourced.** It glosses the Tibetan with
the Sanskrit as a cross-check, so it inherits every divergence in the table above. Several entries
have defensible alternatives (row 20 "inexhaustible" against "imperishable"; row 40 \`zil gnon\`
"overwhelming" against "outshining"), and row 6 has no meaning to give at all, being a proper name.
Unlike every other column, no amount of consulting Henning fixes this one: English would remain
authored here, and would be the first fixture content this project wrote rather than sourced.

Checking the first two against Henning's Appendix I, or against a reader of Tibetan, is the work
that remains.

## The table

| # | Wylie | Tibetan | Lhasa | IAST | Devanāgarī | Sanskrit (Janson) | English | Years |
|---|-------|---------|-------|------|------------|-------------------|---------|-------|
${rows
	.map(
		(r) =>
			`| ${r.n} | \`${r.wylie}\` | ${r.tibetan} | *${r.lhasa}* | ${r.iast} | ${r.devanagari} | \`${r.sanskrit}\` | ${r.english} | ${r.years[0]}, ${r.years[1]} |`,
	)
	.join("\n")}
`;

const docs = join(dirname(fileURLToPath(import.meta.url)), "..", "docs");
writeFileSync(join(docs, "rabjung-names.md"), doc);
console.log(`wrote docs/rabjung-names.md — ${rows.length} rows, year alignment verified on all 60`);
