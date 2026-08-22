#!/usr/bin/env node
/**
 * Derives the 60 rabjung year names, verifies every column against an independent authority, and
 * refuses to write anything if a check fails.
 *
 * Usage — from a scratch directory **outside** this repository:
 *   npm init -y && npm install jsewts tibetan-ewts-converter
 *   node /path/to/repo/scripts/verify-rabjung-names.mjs <tibet.tex> <samvatsara.wiki> [sewell.txt]
 *
 * Obtain the sources with:
 *   curl -L -o 1401.6285.gz https://arxiv.org/e-print/1401.6285 && gzip -dc 1401.6285.gz > tibet.tex
 *   curl -L -o samvatsara.wiki "https://en.wikipedia.org/w/index.php?title=Samvatsara&action=raw"
 *   curl -L -o sewell1924.txt https://archive.org/download/siddhantasindian0000sewe/siddhantasindian0000sewe_djvu.txt
 *
 * `-L` is required on all three: arXiv redirects /e-print/ to /src/, and without it curl saves the
 * redirect page, leaving an empty tibet.tex that fails later as "T60 not found" rather than as a
 * download error. Keep all three outside this repository, per CLAUDE.md.
 *
 * **Then format the fixture**, from the repository:
 *   npx biome check --write test/fixtures/rabjung-names.ts
 *
 * This script emits one row per line, which Biome reflows to one field per line. The step has always
 * been required and was never written down, so a re-run left `npm run lint` failing for reasons that
 * looked nothing like formatting -- `biome check .` reports the diff without saying which file, and
 * the obvious suspects are the files you just edited rather than the one the generator rewrote.
 *
 * ## The sources, and why each one
 *
 * Five, and each is here because it is the only thing that can answer a particular question. Where
 * two could answer the same question, both are used and required to agree -- one source is an
 * opinion, two that agree independently is a result.
 *
 * 1. **Janson's LaTeX** gives the **Wylie**, the cycle position and the two Gregorian years. This is
 *    the Tibetan lineage (he takes the table from Henning's Appendix I) and the only source this
 *    package derives from, per the clean-room constraint. Extracted mechanically, never transcribed.
 *
 *    His ASCII Sanskrit column is **deliberately not captured.** It collides three names onto
 *    `pramadi`, carries no Devanagari, and he flags its spellings as varying between sources. The
 *    row regex below takes five fields where the retired generator took six.
 *
 * 2. **The Wikipedia samvatsara table** gives **IAST and Devanagari**. It is here for one reason: it
 *    is the only machine-readable source found that carries diacritics and Devanagari together.
 *    Sewell has neither -- see below -- so nothing else can source these two columns.
 *
 * 3. **Sewell & Fleet, _The Siddhantas and the Indian Calendar_ (1924)** is the authority the IAST
 *    column is *cited* to, and it is used here to check **name identity only**: which name sits at
 *    which position. It cannot check spelling, because it carries **no IAST diacritics at all** --
 *    it prints "Sukla", "Vrisha", "Kshaya" in 1924 romanisation. Consulting it directly is what
 *    found the corrections below: a column cited to Sewell that disagrees with Sewell.
 *
 *    Its scan is OCR, and noisy -- "Ksliaya", "Manniathn", "Ahgiras". No single occurrence is
 *    trusted. The book prints "N Name" thousands of times across its year-conversion tables, so the
 *    **modal spelling at each position over thousands of reads** is taken instead: OCR errors
 *    scatter, the true reading does not. This is optional input; supply it and the corrections are
 *    re-checked against it.
 *
 * 4. **English Wiktionary** does two things nothing else here can. It attests that a Devanagari
 *    headword **exists as a Sanskrit word**, and -- for many of these names -- it states the cycle
 *    position outright ("Name of the 31st year of Jupiter's cycle of 60 years"). That makes it a
 *    third lineage on the one axis in question, independent of both Janson and Sewell. It also
 *    carries the Sanskrit senses, which is the only sourced material for an English meaning:
 *    Sewell prints no meanings, checked directly.
 *
 * 5. **`jsewts` and `tibetan-ewts-converter`** convert Wylie to Tibetan script and must agree
 *    exactly, and the result must read back as the Wylie it came from. **THL's converter** supplies
 *    THL Simplified phonetics, its publisher being the standard's author.
 *
 * ## Why this is not on the CI path
 *
 * It needs the network and two converters that live outside the repo by design. What CI checks is
 * the committed output: `test/fixtures/rabjung-names.ts` is read by the suite, so a hand-edit to the
 * shipped table fails `npm test` even if this script has not run in months.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
	devanagariToIast,
	devanagariToSlp1,
	lookupCandidates,
	ordinalWordToNumber,
	proveIndicPredicates,
	slugVariants,
} from "./indic.ts";

const [texPath, wikiPath, sewellPath] = process.argv.slice(2);
if (!texPath || !wikiPath) {
	console.error(
		"usage: node scripts/verify-rabjung-names.mjs <tibet.tex> <samvatsara.wiki> [sewell.txt]",
	);
	process.exit(1);
}

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
const problems = [];
const fail = (message) => problems.push(message);
const UA = "tibetan-calendar-temporal fixture verification (https://github.com/nyamlen)";

// ---------------------------------------------------------------------------------------------
// 1. Janson: position, Wylie, years. Five fields -- his Sanskrit is not captured.
// ---------------------------------------------------------------------------------------------

const tex = readFileSync(texPath, "utf8").split("\n");
const texStart = tex.findIndex((l) => l.includes("element--animal & Tibetan & Sanskrit"));
const texEnd = tex.findIndex((l) => l.includes("\\label{T60}"));
if (texStart === -1 || texEnd === -1) throw new Error("T60 not found -- wrong source file?");

const rows = [];
for (const line of tex.slice(texStart, texEnd)) {
	const m = line
		.replace(/\\\\.*$/, "")
		.match(
			/^\s*(\d+)\s*&\s*(\d+)\s*&\s*(\w+)--(\w+)\s*&([^&]+)&([^&]+)&\s*(\d{4})\s*&\s*(\d{4})\s*$/,
		);
	if (!m) continue;
	rows.push({
		n: Number(m[1]),
		wylie: m[5].trim(),
		// Janson's ASCII Sanskrit, captured for ONE purpose: it is the only mechanical detector of the
		// rows where the Tibetan tradition and the Indic list carry different names rather than
		// different spellings. It is never written to the fixture and never reaches src/ -- it collides
		// three names onto `pramadi` and carries no Devanagari, so it is unfit to ship as a name. It
		// was dropped entirely once, and the divergence evidence went with it; the claim then survived
		// for months in a roadmap sentence whose position-60 half had become wrong.
		jansonSanskrit: m[6].trim(),
		years: [Number(m[7]), Number(m[8])],
	});
}
if (rows.length !== 60) throw new Error(`expected 60 Janson rows, got ${rows.length}`);

/**
 * Corrections to Janson's Wylie, as data carrying their own evidence.
 *
 * Same discipline as the Indic corrections below: the original must still be present before the
 * correction is applied, so it self-invalidates if a reprint ever fixes it.
 */
const WYLIE_CORRECTIONS = [
	{
		n: 6,
		from: "anggi ra",
		to: "ang gi ra",
		why:
			"Janson's `anggi ra` does not survive the EWTS round trip: it converts to ཨངགི་ར, which " +
			"reads back as `angagi ra` -- not a word. `ang gi ra` converts to ཨང་གི་ར and round-trips " +
			"exactly, both converters agree on it, and THL returns a clean phonetic for it where " +
			"`anggi ra` returns the `(?)` marker meaning it could not analyse the string. It is also the " +
			"form the retired bespoke converter hard-coded for this row, and it matches the syllable " +
			"structure of the Sanskrit it transliterates, Angirasa आङ्गिरस. The likeliest reading is a " +
			"missing space in the source.",
	},
];

for (const c of WYLIE_CORRECTIONS) {
	const row = rows.find((r) => r.n === c.n);
	if (!row) {
		fail(`Wylie correction for position ${c.n} has nothing to correct`);
		continue;
	}
	if (row.wylie !== c.from) {
		fail(
			`Wylie correction at ${c.n} expected "${c.from}" but the source now reads "${row.wylie}" -- ` +
				"re-check whether the correction is still needed",
		);
		continue;
	}
	row.wylieCorrectedFrom = row.wylie;
	row.wylie = c.to;
	console.log(`correcting Wylie ${c.n}: "${c.from}" -> "${c.to}"`);
}

// ---------------------------------------------------------------------------------------------
// 2. The Indic list: IAST and Devanagari, with its own Gregorian years.
// ---------------------------------------------------------------------------------------------

const wiki = readFileSync(wikiPath, "utf8");
const wikiTable = wiki.slice(wiki.indexOf('{| class="wikitable sortable"'));

/**
 * Strips wiki inline markup from a cell.
 *
 * Wikipedia bolds the whole row for the *current* samvatsara, so this markup is not a fixed
 * property of the source -- it moves one row every year, which made the extraction time-dependent
 * until this was added.
 */
const unmarkup = (cell) =>
	cell
		.replace(/'{2,}/g, "")
		.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1")
		.trim();

const indic = new Map();
for (const row of wikiTable.split("\n|-\n").slice(1)) {
	const cells = row.split("\n|").map((c) => unmarkup(c));
	if (cells.length < 10) continue;
	const num = (cells[0].split("|").pop() ?? "")
		.replace(/&nbsp;/g, "")
		.replace(/\.\s*$/, "")
		.trim();
	if (!/^\d+$/.test(num)) continue;
	indic.set(Number(num), {
		iast: cells[1],
		devanagari: cells[2],
		current: Number((cells[8].match(/(\d{4})/) ?? [])[1]),
		prior: Number((cells[9].match(/(\d{4})/) ?? [])[1]),
	});
}
if (indic.size !== 60) throw new Error(`expected 60 samvatsara rows, got ${indic.size}`);

// Before any rule below runs, prove the transliterator over the corpus it will actually handle. A
// failure here means "the transliterator is broken", not "a position is wrong" -- and the invariant
// is what surfaces a codepoint no table covers, which is precisely what the Vedic ळ in rows 31 and 32
// would be to a reader who had not looked.
proveIndicPredicates([...indic.values()].map((row) => row.devanagari));

// ---------------------------------------------------------------------------------------------
// 3. Year alignment -- the hard gate that licenses joining the two lineages by index.
//
// The lists reach this script by completely separate routes, Henning via Janson's LaTeX and
// Sewell/Rao via the samvatsara table. If row n of each names the same pair of Gregorian years,
// they are the same cycle at the same offset. Any mismatch means every joined row below is
// silently misaligned.
// ---------------------------------------------------------------------------------------------

for (const r of rows) {
	const w = indic.get(r.n);
	if (!w) throw new Error(`no samvatsara row for ${r.n}`);
	if (w.prior !== r.years[0] || w.current !== r.years[1]) {
		throw new Error(
			`row ${r.n} year mismatch: Janson ${r.years.join("/")} vs samvatsara ${w.prior}/${w.current}`,
		);
	}
	r.iast = w.iast;
	r.devanagari = w.devanagari;
}

// ---------------------------------------------------------------------------------------------
// Corrections to the Indic column, as data carrying their own evidence.
//
// Each correction is applied only after BOTH originals -- IAST and Devanagari -- are confirmed still
// present, so it self-invalidates: if the table is ever fixed upstream, this script says so rather
// than silently applying a patch that is no longer needed. Checking the Devanagari matters because
// it is now the column everything else derives from; an earlier version recorded it and never read
// it, which was correct only by the accident that every correction changed both.
//
// A correction changes what the table PRINTS and needs authored evidence. It is not the same thing
// as a rung of the lookup ladder in scripts/indic.ts, which changes only what is QUERIED and states
// a rule of orthography or morphology. Seven rows that look like errors -- the `-in` stems printed
// in the nominative, the anusvara spellings -- are grammar, and belong to the ladder. Conflating the
// two turned seven grammatical facts into twelve editorial judgements in an earlier draft.
// ---------------------------------------------------------------------------------------------

const CORRECTIONS = [
	{
		n: 60,
		fromIast: "Akshaya",
		fromDevanagari: "अक्षय",
		toDevanagari: "क्षय",
		sewellSays: "Kshaya",
		evidence: "sewell",
		why:
			"Sewell & Fleet give Kshaya at position 60 (modal reading, 82% of 49 occurrences) and the " +
			"string 'Akshaya' appears nowhere in the book. Janson has `ksayaka`, and the Tibetan is " +
			"`zad pa`, exhaustion -- ksaya, not a-ksaya, which is its opposite. Three lineages against " +
			"the Wikipedia table's reading. The IAST that follows is `Kṣaya`, not Sewell's `Kshaya`: he " +
			"settles which name sits here and can never settle a spelling, carrying no diacritics at all.",
	},
	{
		n: 31,
		fromIast: "Hevilambi",
		fromDevanagari: "हेविळम्बि",
		toDevanagari: "हेमलम्ब",
		sewellSays: "Hemalamba",
		evidence: "sewell",
		why:
			"Sewell & Fleet give Hemalamba at 31, Janson has `hemalambha`, and English Wiktionary's " +
			"entry at हेमलम्ब reads 'Name of the 31st year of Jupiter's cycle of 60 years' -- a third " +
			"lineage naming the position outright.",
	},
	{
		n: 15,
		fromIast: "Vṛṣaprajā",
		fromDevanagari: "वृषप्रजा",
		toDevanagari: "वृषभ",
		sewellSays: "Vrisha",
		evidence: "attestation",
		why:
			"Wikipedia's वृषप्रजा is unattested, and a reading no dictionary carries is not a variant " +
			"worth preserving. Janson has `brisabha` (vrisabha) and Sewell has Vrisha, so the Indic " +
			"sources point at a bull-name; the Tibetan `khyu mchog` is 'chief bull'. वृषभ is attested and " +
			"its senses are 'a bull' AND 'the chief, most excellent or eminent', carrying both halves of " +
			"the Tibetan where Sewell's वृष is only 'man, male, bull'. So Janson's form is taken over " +
			"Sewell's on attested meaning rather than on preference.",
	},
	{
		n: 37,
		fromIast: "Śobhakṛt",
		fromDevanagari: "शोभकृत्",
		toDevanagari: "शोभन",
		sewellSays: "Sobhana",
		evidence: "attestation",
		why:
			"Sewell and Janson both have Sobhana, and Wikipedia's शोभकृत् is unattested while शोभन is, " +
			"glossed 'brilliant, beautiful'. This was left uncorrected until 2026-08-21 on the argument " +
			"that the Tibetan `mdzes byed` ('beautifying') renders sobhakrit more closely -- but that " +
			"weighed a translation nuance against two sources plus attestation, which is the wrong way " +
			"round.",
	},
	{
		n: 4,
		fromIast: "Pramodūta",
		fromDevanagari: "प्रमोदूत",
		toDevanagari: "प्रमोद",
		evidence: "monier-williams",
		why:
			"प्रमोदूत resolves nowhere. प्रमोद does, and its entry states 'the 4th year in a 60 years' " +
			"cycle of Jupiter' outright, glossing it 'excessive joy, delight, gladness' -- which is the " +
			"Tibetan `rab myos`. The lengthened -uta is not a rung of the ladder, because no rule of " +
			"Sanskrit derives it; it is a variant of the name, and the attested one is taken.",
	},
	{
		n: 9,
		fromIast: "Yuva",
		fromDevanagari: "युव",
		toDevanagari: "युवन्",
		evidence: "homograph",
		why:
			"युव resolves, but to the wrong word: it is the base of the second-person dual pronoun, and " +
			"the sense that came back was 'you both'. That is the homograph trap this table already " +
			"documents at क्षय, caught here by reading the sense rather than the presence of an entry. " +
			"The samvatsara is युवन्, 'young', which the Tibetan `na tshod ldan` renders.",
	},
	{
		n: 56,
		fromIast: "Dundubhi",
		fromDevanagari: "दुन्दुभी",
		toDevanagari: "दुन्दुभि",
		evidence: "homograph",
		why:
			"The feminine दुन्दुभी is a Gandharvi's name and a throw of the dice -- neither is a drum. The " +
			"masculine दुन्दुभि is the kettledrum, which is the Tibetan `rnga chen`, 'great drum'. The " +
			"printed IAST `Dundubhi` transliterates the masculine, so the table's own two columns " +
			"disagreed here before the Devanagari became the source of the IAST.",
	},
	{
		n: 58,
		fromIast: "Raktākṣi",
		fromDevanagari: "रक्ताक्षि",
		toDevanagari: "रक्ताक्ष",
		evidence: "monier-williams",
		why:
			'रक्ताक्षि is a stub in Monier-Williams -- the whole entry reads "m. , Cat.", a headword with no ' +
			'gloss at all -- while रक्ताक्ष reads "red-eyed, having red or blood-shot eyes", which is the Tibetan ' +
			"`mig dmar` exactly. This is the case the IAST check cannot reach: both columns agree on " +
			"Raktākṣi, so nothing internal contradicts anything, and only attestation shows the printed " +
			"form is the wrong one.",
	},
	{
		n: 57,
		fromIast: "Rudhirodgāri",
		fromDevanagari: "रूधिरोद्गारी",
		toDevanagari: "रुधिरोद्गारी",
		evidence: "typo",
		why:
			"रूधिर with a long u is not a word; blood is रुधिर, short. The table's own IAST says so -- it " +
			"prints `Rudhirodgāri`, which transliterates the short vowel -- so this is a typo the source " +
			"contradicts itself about, not a variant. Corrected here, and the `-in` stem that Cologne " +
			"lemmatises under (रुधिरोद्गारिन्) is then reached by the ladder rather than by a second " +
			"correction.",
	},
];

for (const c of CORRECTIONS) {
	const row = rows.find((r) => r.n === c.n);
	if (!row) {
		fail(`correction for position ${c.n} has nothing to correct`);
		continue;
	}
	if (row.iast !== c.fromIast || row.devanagari !== c.fromDevanagari) {
		fail(
			`correction at ${c.n} expected ${c.fromDevanagari} / "${c.fromIast}" but the source now ` +
				`reads ${row.devanagari} / "${row.iast}" -- re-check whether the correction is still needed`,
		);
		continue;
	}
	row.devanagariCorrectedFrom = row.devanagari;
	row.devanagari = c.toDevanagari;
	console.log(`correcting ${c.n}: ${c.fromDevanagari} -> ${c.toDevanagari} (${c.evidence})`);
}

// ---------------------------------------------------------------------------------------------
// The IAST column is DERIVED from the Devanagari, not taken from the samvatsara table.
//
// The table's romanisation is lossy in a way that is invisible until it is checked: it drops the
// macron on `-in` stems (Pramāthi for प्रमाथी), and at position 60 our own earlier correction wrote
// Sewell's 1924 `Kshaya` into a column headed IAST, in a document that says on the same page that
// Sewell carries no diacritics anywhere.
//
// Its printed value is kept and REPORTED where it disagrees, because a disagreement is a signal
// about the Devanagari -- it is what surfaced position 54, where रौद्र was printed as `Raudri`.
// The twelve known disagreements are an allowlist rather than a report nobody must act on: a
// thirteenth fails the run, and an allowlisted row that stops disagreeing fails too.
// ---------------------------------------------------------------------------------------------

/** Positions where the samvatsara table's own IAST does not transliterate its own Devanagari. */
const IAST_DISAGREEMENTS = new Map([
	[13, "प्रमाथी is pramāthī; the table drops the final macron"],
	[32, "विळम्बि carries Vedic ळ, which the table romanises as plain l"],
	[46, "परिधावी is paridhāvī; the table drops the final macron"],
	[47, "प्रमादी is pramādī; the table drops the final macron"],
	[48, "आनंद is ānaṃda; the table romanises the anusvāra as the cluster it stands for"],
	[51, "पिंगल is piṃgala; same anusvāra convention"],
	[53, "सिद्धार्थी is siddhārthī; the table drops the final macron"],
	[54, "रौद्र is raudra; the table prints Raudri, an -i stem the Devanagari does not carry"],
	[59, "the IAST cell offers two readings, Krodhana/Manyu, where the Devanagari gives one"],
]);

for (const r of rows) {
	r.printedIast = r.iast;
	r.iast = r.devanagari
		.split("/")
		.map((part) => {
			const derived = devanagariToIast(part.trim());
			return derived.charAt(0).toUpperCase() + derived.slice(1);
		})
		.join("/");
	const disagrees = r.iast !== r.printedIast;
	const expected = IAST_DISAGREEMENTS.has(r.n);
	if (disagrees && !expected && !r.devanagariCorrectedFrom) {
		fail(
			`position ${r.n}: the samvatsara table prints "${r.printedIast}" but ${r.devanagari} ` +
				`transliterates as "${r.iast}", and this row is not a recorded disagreement. Either the ` +
				"Devanagari is wrong -- which is what this check is for -- or the list needs a new entry " +
				"with its reason.",
		);
	}
	if (!disagrees && expected) {
		fail(
			`position ${r.n} is recorded as an IAST disagreement (${IAST_DISAGREEMENTS.get(r.n)}), but ` +
				"the table now agrees with its own Devanagari. Drop the entry.",
		);
	}
	if (disagrees && expected) r.iastDisagreement = IAST_DISAGREEMENTS.get(r.n);
}

// ---------------------------------------------------------------------------------------------
// Sewell verification, when the text is supplied.
// ---------------------------------------------------------------------------------------------

if (sewellPath) {
	const NOT_SAMVATSARA = new Set([
		"Sun",
		"Snn",
		"Mon",
		"Tues",
		"Tnes",
		"Wed",
		"Thur",
		"Thurs",
		"Fri",
		"Sat",
		"Chaitra",
		"Vaisakha",
		"Jyeshtha",
		"Ashadha",
		"Sravana",
		"Bhadrapada",
		"Asvina",
		"Karttika",
		"Margasira",
		"Pausha",
		"Magha",
		"Phalguna",
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Oct",
		"Nov",
		"Dec",
	]);
	const text = readFileSync(sewellPath, "utf8");
	const votes = new Map();
	for (const m of text.matchAll(/^[ \t]*(\d{1,2})[ \t]+([A-Z][a-zA-Z]{2,})\.?[ \t]*$/gm)) {
		const n = Number(m[1]);
		if (n < 1 || n > 60 || NOT_SAMVATSARA.has(m[2])) continue;
		if (!votes.has(n)) votes.set(n, new Map());
		const c = votes.get(n);
		c.set(m[2], (c.get(m[2]) ?? 0) + 1);
	}
	const modal = (n) => {
		const c = votes.get(n);
		if (!c) return null;
		return [...c].sort((a, b) => b[1] - a[1])[0][0];
	};
	// A bad download is diagnosed as a bad download. archive.org intermittently answers this item with
	// a 500 page, and `curl -sL` saves it silently -- the same trap CLAUDE.md records for arXiv's
	// redirect. Without this the failure surfaced as four separate "position N has no readings"
	// messages, which point at the corrections rather than at the file, and the first instinct is to
	// re-argue evidence that was never in question.
	const positionsSeen = votes.size;
	if (positionsSeen < 30) {
		fail(
			`the Sewell text yielded readings for only ${positionsSeen} of 60 positions, which is a ` +
				`broken input rather than a source that disagrees. ${sewellPath} is ` +
				`${readFileSync(sewellPath, "utf8").length} bytes; the djvu.txt is about 2 MB. Re-download ` +
				"it -- archive.org answers with a 500 page often enough that curl saves the error silently.",
		);
	}

	// Only the corrections that CITE Sewell are checked against him. The rest rest on Monier-Williams
	// or on a homograph read, and demanding his agreement there would invent a requirement their
	// stated evidence never made.
	for (const c of CORRECTIONS.filter((correction) => correction.sewellSays)) {
		const seen = modal(c.n);
		if (!seen) {
			fail(`Sewell supplied but position ${c.n} has no readings -- check the OCR text`);
			continue;
		}
		// Checks that Sewell still says what the correction CLAIMS he says, not that he agrees with
		// the answer. At position 15 the correction deliberately takes Janson's वृषभ over Sewell's
		// वृष, on attested meaning, and documents doing so; demanding agreement there would fail a
		// correction whose reasoning is sound and stated.
		if (seen !== c.sewellSays) {
			fail(
				`the correction at ${c.n} cites Sewell as reading "${c.sewellSays}", but his modal reading ` +
					`is now "${seen}". The correction's stated evidence no longer holds -- re-argue it.`,
			);
		} else {
			// He is quoted in 1924 romanisation throughout, so his string can corroborate the name and
			// never the spelling. Printing both is what keeps that distinction visible in the log.
			const derived = devanagariToIast(c.toDevanagari.split("/")[0]);
			console.log(
				`Sewell reads ${c.n} as "${seen}"; the correction takes ${c.toDevanagari} (${derived})`,
			);
		}
	}
}

// ---------------------------------------------------------------------------------------------
// 4 + 5. Script, by two converters that must agree, and a round trip.
// ---------------------------------------------------------------------------------------------

const DISCOURAGED = ["ཱི", "ཷ", "ཹ", "ཱྀ"];

for (const r of rows) {
	const first = fromWylie(r.wylie);
	const second = secondConverter.to_unicode(r.wylie);
	if (first !== second) {
		fail(`position ${r.n}: EWTS converters disagree on "${r.wylie}" -- ${first} vs ${second}`);
		continue;
	}
	const back = toWylie(first).trim();
	if (back !== r.wylie) {
		fail(
			`position ${r.n}: "${r.wylie}" converts to ${first}, which reads back as "${back}". ` +
				"A Wylie string that does not survive the round trip is not a spelling this script can " +
				"vouch for -- correct it at the source, with evidence, rather than accepting the drift.",
		);
		continue;
	}
	for (const codepoint of DISCOURAGED) {
		if (first.includes(codepoint)) {
			fail(`position ${r.n}: ${first} contains a discouraged composite vowel sign`);
		}
	}
	r.tibetan = first;
}
/**
 * The chosen sense per position: **an authored selection from sourced candidates.**
 *
 * Monier-Williams gives many senses per headword -- 764 across the sixty rows -- often from
 * different roots, so which one applies is an editorial judgement no source makes for us. Taking the
 * first is not a policy, it is an accident: क्षय's first sense is a cross-reference and its second is
 * "dominion" (from क्षि, to rule), where the one matching `zad pa` is "destruction, decay" (from क्षि,
 * to destroy) -- two different words sharing a spelling, which MW marks as separate numbered
 * headwords and Wiktionary did not.
 *
 * Each entry pins **both** an MW sense ID and the gloss taken from it, and the run fails unless the
 * gloss appears verbatim in a sense carrying that ID. The ID alone is not enough, because Cologne
 * groups several sense-lines under one record ID -- सौम्य's ten senses share ID 253659 -- and the
 * gloss alone is not enough, because it would keep matching if the entry were reordered under it.
 *
 * **At most two gloss units**, counted by splitting on `,` and `;` outside parentheses and enforced
 * below. MW's sense lines are themselves gloss lists, so selecting a whole line is how an earlier
 * version ended up with 17 of 31 selections carrying three or more glosses and one running to 177
 * characters. The rule is checked rather than stated.
 *
 * The tie-break, so that thirty-odd judgements are reviewable rather than a matter of taste: **take
 * the gloss that renders the Tibetan name; where the entry offers none, select nothing.** The gaps
 * are as much a finding as the selections.
 */
const SELECTED_SENSES = {
	1: { id: "135530", text: "production, source" }, // Prabhava, `rab byung` arising
	2: { id: "198400", text: "development, evolution" }, // Vibhava, `rnam byung` full arising
	3: { id: "219029", text: "white (the colour)" }, // Sukla, `dkar po` -- the colour, not the fortnight
	4: { id: "136015", text: "excessive joy, delight" }, // Pramoda, `rab myos` elated
	5: { id: "130885", text: "lord of creatures" }, // Prajapati, `skyes bdag`
	// Angirasa, `ang gi ra`. A patronymic DOES have a meaning, and this is it -- an earlier pass
	// wrote the row off as "a proper name, so no meaning" without reading the entry. Taken from
	// the SECOND sense, which names the referent: "descended from" alone dangles, and the first
	// sense offers no contiguous span that says descended from whom.
	6: { id: "22844", text: "a descendant of Aṅgiras" },
	7: { id: "223180", text: "a beautiful face" }, // Srimukha, `dpal gdong` glorious face
	8: { id: "150178", text: "becoming, being" }, // Bhava, `dngos po` entity
	9: { id: "172161", text: "young, youthful" }, // Yuvan, `na tshod ldan` youthful
	10: { id: "100718", text: "bearer, supporter" }, // Dhatri, `'dzin byed` holder -- not "creator"
	11: { id: "29882", text: "master, lord" }, // Isvara, `dbang phyug` mighty lord
	12: { id: "143644", text: "abounding in corn" }, // Bahudhanya, `'bru mang po` much grain
	// Pramathin, `myos ldan`. The Sanskrit is agitation and the Tibetan is intoxication, so this
	// selection deliberately does NOT render the Tibetan -- the two columns gloss different names,
	// which is the point of showing them side by side, and 29, 34, 39 and 52 already do the same.
	13: { id: "135703", text: "stirring about" },
	14: { id: "194161", text: "valour, courage" }, // Vikrama, `rnam gnon` overcoming
	15: { id: "205069", text: "the chief, most excellent" }, // Vrisabha, `khyu mchog` chief bull
	16: { id: "73817", text: "of variegated lustre" }, // Citrabhanu, `sna tshogs` variegated
	17: { id: "258037", text: "self-luminous" }, // Svabhanu, `nyi ma` sun
	18: { id: "84334", text: "liberating, saving" }, // Tarana, `nyi sgrol byed`
	19: { id: "122897", text: "a lord of the earth" }, // Parthiva, `sa skyong` earth-protector
	20: { id: "19308", text: "not liable to change, imperishable" }, // Avyaya, `mi zad` inexhaustible
	21: { id: "238261", text: "all-conquering" }, // Sarvajit, `thams cad 'dul` all-taming
	// Virodhin, `'gal ba` opposition. Taken from the ADJECTIVE's own entry. It read
	// "opposition, hostility" until 2026-08-22, which is विरोध the noun -- the lookup had been
	// landing on a neighbouring headword's page, and the headword check now rejects that.
	23: { id: "199449", text: "opposing, hindering" },
	// Sarvadharin, `kun 'dzin` all-holding. MW knows the printed सर्वधारी only as a year-name;
	// the stem one entry away glosses it outright.
	22: { id: "238402", text: "all-holder" },
	24: { id: "194023", text: "change, alteration" }, // Vikriti, `rnam 'gyur` transformed
	25: { id: "61348", text: "a donkey" }, // Khara, `bong bu` donkey
	26: { id: "103509", text: "rejoicing, gladdening" }, // Nandana, `dga' ba` joy
	27: { id: "194989", text: "victory, conquest" }, // Vijaya, `rnam rgyal` complete victory
	28: { id: "77323", text: "conquest, victory" }, // Jaya, `rgyal ba` victory
	29: { id: "157922", text: "love or the god of love" }, // Manmatha, `myos byed` intoxicating
	30: { id: "94214", text: "ugly-faced" }, // Durmukha, `gdong ngan` ill-faced
	32: { id: "199632", text: "hanging down, pendulous" }, // Vilambin, `rnam 'phyang` hanging down
	33: { id: "193975", text: "liable to change, changeable" }, // Vikarin, `sgyur byed` transforming
	34: { id: "215920", text: "belonging to night, nocturnal" }, // Sarvari -- the Sanskrit, not `kun ldan`
	35: { id: "141490", text: "jumping, leaping" }, // Plava, `'phar ba` leaping
	// Subhakara, `dge byed` virtue-making. Reached by following Monier-Williams' own "= -कर";
	// शुभकृत् has no gloss of its own.
	36: { id: "219651", text: "causing welfare, auspicious" },
	37: { id: "221607", text: "brilliant, splendid" }, // Sobhana, `mdzes byed` beautifying
	39: { id: "201536", text: "beneficent to all" }, // Visvavasu -- the Sanskrit; see the divergence table
	40: { id: "116878", text: "overthrow, defeat" }, // Parabhava, `zil gnon` overwhelming
	41: { id: "141505", text: "a monkey" }, // Plavanga, `spre'u` monkey
	42: { id: "50866", text: "a pin, bolt" }, // Kilaka, `phur bu` peg
	43: { id: "253659", text: "placid, gentle" }, // Saumya, `zhi ba` peaceful
	44: { id: "241813", text: "belonging or applicable to many" }, // Sadharana, `thun mong` common
	45: { id: "199414", text: "causing dissension" }, // Virodhakrit, `'gal byed` opposition-making
	46: { id: "117789", text: "running round" }, // Paridhavin, `yongs 'dzin`
	47: { id: "135768", text: "negligent, careless" }, // Pramadin, `bag med` heedless
	48: { id: "24352", text: "happiness, joy" }, // Ananda, `kun dga'` complete joy
	49: { id: "176054", text: "an evil or malignant demon" }, // Raksasa, `srin bu` demon
	// Anala, `me` fire. The compound cell's SECOND reading, chosen by the Tibetan rather than by
	// which alternative happened to resolve first.
	50: { id: "5252", text: "fire" },
	51: { id: "123605", text: "reddish-brown, tawny" }, // Pingala, `dmar ser can` tawny
	52: { id: "49496", text: "fit for the (present) time" }, // Kalayukta, `dus kyi pho nya`
	// Siddharthin, `don grub` aim-accomplished. Reached through the base compound सिद्धार्थ,
	// since the -in suffix means "possessing" and MW glosses only the base.
	53: { id: "244502", text: "one who has accomplished an aim" },
	54: { id: "180197", text: "savageness, fierceness" }, // Raudra, `drag po` fierce
	55: { id: "94158", text: "weak-minded, silly" }, // Durmati, `blo ngan` ill-minded
	56: { id: "93585", text: "a sort of large kettledrum" }, // Dundubhi, `rnga chen` great drum
	// Raktaksha, `mig dmar` red-eyed. The printed रक्ताक्षि is an MW stub with no gloss.
	58: { id: "173666", text: "red-eyed" },
	59: { id: "58274", text: "inclined to wrath, passionate" }, // Krodhana, `khro bo` wrathful
	60: { id: "59377", text: "destruction, decay" }, // Kshaya, `zad pa` exhaustion -- NOT "dominion"
};

/**
 * Meanings **composed** from the entries for a compound's parts, which is a weaker tier than a
 * verbatim selection and is kept separate from it.
 *
 * Some of these names are ordinary transparent compounds that Monier-Williams simply has no entry
 * for, though he glosses both halves. Returning nothing there says "this name has no meaning", which
 * is false; हेमलम्ब is हेमन् + लम्ब and both are in the dictionary. So a composed gloss is
 * offered instead of a blank -- but never in `selected`, whose whole guarantee is that it is a
 * verbatim span of one printed sense.
 *
 * Three conditions, and the generator enforces the first two. Each part must **resolve in
 * Monier-Williams**, and each part's stated gloss must appear **verbatim** in the sense it cites, so
 * the composition is traceable to sourced entries rather than asserted. The third is editorial and
 * stated in the `why`: **the Tibetan disambiguates the compound**, since हेमलम्ब could be read
 * several ways and `gser 'phyang` says which one the tradition took.
 *
 * Deliberately small. A compound the Tibetan does not render would have no disambiguator, and this
 * mechanism would then be inventing rather than composing.
 */
/**
 * Monier-Williams' ˚ abbreviation, expanded.
 *
 * He writes a compound's repeated element as its initial plus ˚, so रुधिरोद्गारिन् is glossed
 * "'emitting b˚'" — emitting blood. Shipping that verbatim ships a gloss no reader can read, and the
 * expansion is not interpretation: the convention is fixed, and the element is a word he glosses
 * elsewhere in the dictionary.
 *
 * Enforced rather than asserted, on three counts: the entry must still carry the abbreviated text,
 * the element must **resolve in Monier-Williams** with the stated gloss appearing verbatim in it, and
 * the abbreviated initial must match the first letter of that gloss. An expansion that cannot show
 * all three is an invention.
 *
 * The result is the composed tier, not a selection: "emitting blood" appears nowhere in his text.
 */
const ABBREVIATION_EXPANSIONS = [
	{
		n: 57,
		expects: "emitting b˚",
		element: "रुधिर",
		elementId: "178827",
		elementGloss: "blood",
		text: "emitting blood",
		why:
			"रुधिरोद्गारिन्'s only sense reads \"'emitting b˚'\", where ˚ stands for the headword's first " +
			'element. That element is रुधिर, which Monier-Williams glosses "blood", and the Tibetan ' +
			"`khrag skyug` is blood-spitting.",
	},
];

const COMPOSED_MEANINGS = {
	31: {
		text: "hanging gold",
		parts: [
			{ devanagari: "हेमन्", id: "264121", gloss: "gold" },
			{ devanagari: "लम्ब", id: "181489", gloss: "hanging down" },
		],
		why:
			"Monier-Williams carries हेमलम्ब and हेमलम्बक only as the name of this year, but glosses " +
			'both halves: 3. हेमन् is "gold" and लम्ब is "hanging down". The Tibetan `gser \'phyang` is ' +
			"gold-hanging, which is what fixes the reading.",
	},
};

/**
 * Positions deliberately left unselected, so the gaps read as decisions rather than oversights.
 *
 * Every one of these was re-derived on 2026-08-21 against the full Monier-Williams entry. Three
 * earlier notes here did not survive that: they described **the 8-sense cap of the old Wiktionary
 * extractor** as a fact about Sanskrit lexicography. खर was said to list "no sense resembling the
 * Tibetan at all... neither is a donkey"; it lists 27, of which one is "a donkey". प्लव was said to
 * offer nothing meaning leaping; it offers "jumping, leaping, plunging". सौम्य was said to omit
 * "gentle, mild"; MW carries "placid, gentle, mild". All three are now selected.
 *
 * What genuinely remains:
 *
 * - **6 Angirasa** -- a rishi's name, transliterated rather than translated. MW glosses it as
 *   "descended from or belonging to the Angirases", which is a patronymic and not a meaning.
 * - **13 Pramathin** (`myos ldan`, intoxicated) -- MW gives "stirring about, tearing, rending,
 *   troubling, harassing, destroying". The Sanskrit is agitation and the Tibetan is intoxication;
 *   picking the nearest would assert a match the entry does not make.
 * - **22 Sarvadhari, 31 Hemalamba, 53 Siddharthin, 58 Raktakshi** -- the entry exists and its only
 *   senses are "name of the Nth year of the cycle", which is circular.
 * - **36 Subhakrit** -- MW defers the headword to शुभ-कर without glossing it here.
 * - **38 Krodhi** -- Cologne lemmatises क्रोधी only as the name of a musical Sruti; the page returned
 *   is क्रोध's. Selecting "anger, wrath" from it would attribute the root's meaning to a headword MW
 *   does not gloss that way, which is the homograph error this table exists to avoid.
 * - **50 Nala/Anala** (`me`, fire) -- a caution about the compound cell. The cell offers two
 *   readings and the lookup takes the first that resolves, which is नल, "a species of reed". The
 *   Tibetan is fire, which is अनल, the second. Both are attested and नल's own entry claims position
 *   50, so neither is wrong; but the sense list on file is the reed's, so no selection is made from
 *   it. Splitting compound cells solved attestation and did not solve *which* alternative a position
 *   means.
 * - **57 Rudhirodgarin** -- its one sense is MW's abbreviation "emitting b˚", and selecting an
 *   abbreviation would ship a gloss no reader can read.
 */

// ---------------------------------------------------------------------------------------------
// 6. Monier-Williams, via Cologne: the senses, uncapped and citing a printed page.
//
// This replaced English Wiktionary as the sense source on 2026-08-21, for a reason worth keeping.
// Wiktionary's Sanskrit senses **are** Monier-Williams, verbatim -- खर was pulled from both and the
// gloss sequence is identical -- so it was never a lineage independent of MW, and corroborating it
// with anything MW-derived would have been MW agreeing with itself. Cologne serves the same text
// from the scan, with three things Wiktionary drops: a printed page number, a stable per-sense ID,
// and MW's own (H1)/(H2) homonym grouping, which is what makes the क्षय problem -- two words sharing
// a spelling -- machine-readable rather than a note in prose.
//
// It is also simply more complete. The Wiktionary extractor capped senses at 8 and read a fixed
// 3000-character window, and three authored notes in the shipped document rested on that cap: खर
// lists 22 senses, of which #19 is "donkey" and #13 states the 25th year outright, and प्लव lists 16,
// of which #14 is "jumping, leaping". The document said of both that no listed sense resembled the
// Tibetan. There is no cap here, and no window.
// ---------------------------------------------------------------------------------------------

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A courtesy delay and three-attempt backoff, shared by every network source.
 *
 * The run now makes about 240 requests across four hosts, and Wiktionary answered 429 during the
 * source survey that led to this rewrite. A fetch error is thrown rather than swallowed: the caller
 * routes it into `fail()`, so a source that goes down mid-run aborts instead of writing a table
 * where half the rows are sourced and half are silently empty.
 */
async function fetchWithRetry(url, label, { nullOn404 = false } = {}) {
	for (let attempt = 0; attempt < 3; attempt++) {
		try {
			const response = await fetch(url, { headers: { "User-Agent": UA } });
			// A 404 is the source saying it has no such page, which for a corroborating source is an
			// answer rather than a failure. Distinguishing it matters: treating absence as an outage
			// failed the whole run over positions 10 and 45, whose slugs simply do not exist -- while a
			// 403 or a 5xx genuinely is an outage and must still abort.
			if (response.status === 404 && nullOn404) return null;
			if (!response.ok) throw new Error(`${label} returned ${response.status}`);
			return await response.text();
		} catch (error) {
			if (attempt === 2) throw error;
			await sleep(1000 * (attempt + 1));
		}
	}
	throw new Error(`${label} exhausted its retries`);
}

const stripHtml = (html) =>
	html
		.replace(/<[^>]+>/g, " ")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&#\d+;/g, "")
		.replace(/\s{2,}/g, " ")
		.trim();

/**
 * Parses one Cologne page into its senses.
 *
 * Each sense is one table row, carrying MW's homonym marker where a new headword group begins and a
 * Cologne record ID at the end. Both are kept: the ID is what a selection is pinned to, so a
 * reordering upstream fails loudly instead of silently re-pointing the choice at a different gloss.
 */
function parseMonierWilliams(html) {
	const page = /Printed book page[^0-9]*(\d+)/.exec(stripHtml(html))?.[1] ?? null;
	const senses = [];
	let group = null;
	for (const cell of html.split(/<tr>/).slice(1)) {
		const text = stripHtml(cell);
		if (!text) continue;
		const groupMatch = /\((H[0-9A-Z]*)\)/.exec(text);
		if (groupMatch) group = groupMatch[1];
		const id = /\[\s*ID=(\d+)/.exec(text)?.[1] ?? null;
		const gloss = text
			.replace(/\(H[0-9A-Z]*\)/, "")
			.replace(/\[\s*Printed book page[^\]]*\]/, "")
			.replace(/\[\s*ID=[^\]]*\]/g, "")
			.replace(/\s{2,}/g, " ")
			.trim();
		if (!gloss || !id) continue;
		senses.push({ id, group, text: gloss });
	}
	return { page, senses };
}

/**
 * Resolves one Devanagari headword against Cologne, walking the lookup ladder.
 *
 * Measured on 2026-08-21: 48 of the 60 headwords resolve as printed, and all 60 through the ladder.
 * The rung that succeeded is recorded on the row, so the document can state per-row how the entry
 * was reached rather than claim one evidence tier for all sixty.
 */
/**
 * Is this entry actually HEADED by the word asked for, rather than merely mentioning it?
 *
 * Cologne answers a near-miss with a neighbouring headword's page. क्रोधी returns क्रोध's entry --
 * the noun "anger" -- on which क्रोधी appears only as the name of a musical śruti, so accepting it
 * attributed a noun's senses to an adjective. Monier-Williams prints his headword at the start of a
 * sense and hyphenates or spaces compounds ("सर्व —धारी"), so both sides are stripped of spacing
 * and joiners before comparing.
 */
/**
 * Monier-Williams' bare cross-references, which are apparatus rather than senses.
 *
 * Three spellings, and the third was missed for a release: "See under", "See col." and **"See \u221a"**,
 * which points at a verbal root. Position 60 -- the table's flagship correction -- therefore printed
 * its cross-reference as the headline sense instead of "destruction, decay".
 */
const CROSS_REFERENCE = /\bSee\s+(under|col\.|\u221a)/i;

/**
 * Does this entry say anything about the word, beyond naming the year it labels?
 *
 * Several of these headwords are known to Monier-Williams ONLY as "N. of the Nth year of Jupiter's
 * cycle", which restates the position column and says nothing about the name. An entry made entirely
 * of those, or of bare cross-references, is not worth stopping the ladder for.
 */
const YEAR_NAME_ONLY = /\d{1,2}(?:st|nd|rd|th)\s+year|\byear\s+(?:in|of)\b[^.]*cycle/i;
const glossesTheWord = (parsed) =>
	parsed.senses.some(
		(sense) => !YEAR_NAME_ONLY.test(sense.text) && !CROSS_REFERENCE.test(sense.text),
	);

const headedBy = (parsed, devanagari) => {
	const bare = (text) => text.replace(/[\s—–―-]/g, "");
	// Only the FIRST sense, which is the entry's own headword. Asking whether ANY sense begins with
	// the word is too weak and accepted exactly the case this exists to reject: क्रोधी does head a
	// sense on क्रोध's page -- the name of a musical śruti -- while the entry is the noun's.
	//
	// Monier-Williams numbers homonyms in front of the headword ("1. अव्यय"), so that is stripped
	// first, or every numbered entry would be rejected.
	const first = parsed.senses[0];
	if (!first) return false;
	return bare(first.text.replace(/^\s*\d+\.\s*/, "")).startsWith(bare(devanagari));
};

/**
 * Entries Monier-Williams defines only by pointing at another headword.
 *
 * शुभकृत्'s whole entry is "mfn. = -कर" -- he defines it as identical to शुभ-कर and glosses
 * it nowhere else. Following that is reading the dictionary as it asks to be read, not inventing a
 * meaning; but which headword "-कर" resolves to is a judgement about his abbreviation, so it is
 * written down with the text it was read from and **re-checked before it is followed**. If he ever
 * glosses the headword directly, the expected text stops matching and the run says so.
 *
 * Deliberately a small table rather than a parser. The general form -- expand "= -X" against the
 * compound's first element -- would also have to handle "id.", "q.v." and bare see-references, and a
 * parser that is wrong about any of them invents a meaning silently, which is the one failure this
 * whole column is built to avoid.
 */
const SENSE_CROSS_REFERENCES = [
	{
		n: 36,
		from: "शुभकृत्",
		expects: "= -कर",
		to: "शुभकर",
		why:
			'Monier-Williams gives शुभकृत् no gloss of its own, only "= -कर", which is his notation for ' +
			'"identical with शुभ-कर". That entry reads "causing welfare, auspicious, fortunate", which is ' +
			"the Tibetan `dge byed`, virtue-making.",
	},
	{
		n: 53,
		from: "सिद्धार्थिन्",
		expects: "53rd year",
		to: "सिद्धार्थ",
		why:
			"Monier-Williams knows सिद्धार्थिन् only as the year-name, but the compound it is formed " +
			'from, सिद्धार्थ, reads "one who has accomplished an aim or object" -- and the -in suffix ' +
			'means "possessing", so the base carries the sense the derivative inherits. The Tibetan ' +
			"`don grub`, aim-accomplished, says the same thing. One entry, quoted verbatim, rather than a " +
			"gloss assembled out of parts.",
	},
];

async function monierWilliamsEntry(devanagari) {
	let fallback = null;
	let headedFallback = null;
	for (const candidate of lookupCandidates(devanagari)) {
		const key = devanagariToSlp1(candidate.devanagari);
		const html = await fetchWithRetry(
			`https://www.sanskrit-lexicon.uni-koeln.de/scans/MWScan/2020/web/webtc/getword.php?key=${encodeURIComponent(key)}&filter=deva`,
			"Cologne",
		);
		await sleep(120);
		if (/not found:/.test(html)) continue;
		const parsed = parseMonierWilliams(html);
		if (parsed.senses.length === 0) continue;
		const resolved = { ...candidate, key, ...parsed };
		// Prefer a rung whose entry is headed by the form queried AND actually glosses it. Taking the
		// first that returns ANY entry is how position 38 landed on क्रोध's page; taking the first
		// *headed* entry is how position 22 stopped at सर्वधारी, which Monier-Williams knows only
		// as a year-name, when the stem सर्वधारिन् one entry away reads "'all-holder'".
		//
		// Both weaker forms are kept as fallbacks, in that order, so a near miss still yields something
		// rather than nothing.
		if (headedBy(parsed, candidate.devanagari)) {
			if (glossesTheWord(parsed)) return resolved;
			headedFallback ??= resolved;
		}
		fallback ??= resolved;
	}
	return headedFallback ?? fallback;
}

/**
 * Which alternative a compound cell means, where the first that resolves is the wrong one.
 *
 * The samvatsara table records two readings at some positions, and taking the first that resolves is
 * a coin toss dressed as a rule. At 50 it lands on नल, "a species of reed", where the Tibetan `me`
 * is fire -- which is अनल, the second. Both are attested and नल's own entry claims position 50, so
 * neither is *wrong*; the Tibetan is what decides which one this position means, and that is a
 * judgement, so it is written down with its evidence rather than left to ordering.
 *
 * This is not a correction: the table still prints the cell as the source gives it, both readings
 * and all. It changes only which one is looked up.
 */
const PREFERRED_ALTERNATIVE = {
	50: {
		devanagari: "अनल",
		why: "the Tibetan `me` is fire, which is अनल; नल is a reed",
	},
};

/** A cell may offer alternatives -- "अव्यय/व्यय", "नल/अनल". No headword contains a slash. */
async function monierWilliamsForCell(cell, position) {
	const alternatives = cell.split("/").map((part) => part.trim());
	const preferred = PREFERRED_ALTERNATIVE[position];
	if (preferred) {
		if (!alternatives.includes(preferred.devanagari)) {
			fail(
				`position ${position} prefers the reading ${preferred.devanagari}, but the cell now offers ` +
					`${alternatives.join(" / ")}. Re-check the preference rather than adjusting it.`,
			);
		} else {
			alternatives.sort((a, b) =>
				a === preferred.devanagari ? -1 : b === preferred.devanagari ? 1 : 0,
			);
		}
	}
	for (const alternative of alternatives) {
		const entry = await monierWilliamsEntry(alternative);
		if (entry) return { ...entry, headword: alternative };
	}
	return null;
}

// ---------------------------------------------------------------------------------------------
// 6b. English Wiktionary, demoted to attestation and the stated cycle position.
//
// It keeps a job here because it is a second lexicographic witness that a headword exists, and
// because it states the cycle position outright for many of these names. It is no longer the sense
// source, so its 8-sense cap and its 3000-character window are gone with it.
// ---------------------------------------------------------------------------------------------

async function wiktionaryEntry(devanagari) {
	const json = await fetchWithRetry(
		`https://en.wiktionary.org/w/api.php?action=parse&format=json&prop=wikitext&page=${encodeURIComponent(devanagari)}`,
		"Wiktionary",
	);
	await sleep(120);
	const wikitext = JSON.parse(json).parse?.wikitext?.["*"];
	if (!wikitext) return null;
	const at = wikitext.indexOf("==Sanskrit==");
	if (at === -1) return null;
	// Bounded by the NEXT language heading rather than by a fixed character count. A short Sanskrit
	// section followed by ==Hindi== would otherwise let Hindi definitions be harvested as Sanskrit --
	// a hazard the old fixed 3000-character window carried and never happened to trip.
	const rest = wikitext.slice(at + "==Sanskrit==".length);
	const next = rest.search(/\n==[A-Z]/);
	const section = next === -1 ? rest : rest.slice(0, next);
	// Entries state MORE THAN ONE position -- "the first or 35th year", "the 12th (3rd) year" --
	// because the Jovian cycle has competing reckonings that differ by a fixed offset. Collect every
	// number in the cycle sense; a match against any one of them is agreement.
	//
	// The phrasings accepted are wider than "60 years": entries also write "the 22nd year of the
	// Jovian cycle", "the forty-second year of the sixty years' cycle" and "the 3rd year of the 6th
	// lustrum of the bṛhaspati cycle". Requiring the literal "60" and reading digits only missed
	// positions 22, 28, 35 and 42, each of which its entry states outright.
	const stated = [];
	// Read each sense on its own rather than joining them. Joining lets a number from one sense be
	// attributed to another, and it makes the exclusion below impossible to express.
	for (const [, sense] of section.matchAll(
		/^#\s+(.*(?:60|sixty|jovian|bṛhaspati|brihaspati|jupiter).*)/gim,
	)) {
		// "the 3rd year of the 4th Jupiter cycle" is a cycle-and-position reference, like the rabjung's
		// own numbering -- NOT a position in the list of sixty names. तारण reads exactly that, and
		// widening the phrasings accepted above reintroduced it as a false disagreement at position 18
		// after an earlier version had deliberately excluded it.
		if (
			/year\s+of\s+the\s+\d{1,2}(?:st|nd|rd|th)\s+(?:jupiter|bṛhaspati|brihaspati|jovian)/i.test(
				sense,
			)
		) {
			continue;
		}
		// "the 3rd year of the 6th lustrum" is position 28: a lustrum is five years, so the Nth lustrum
		// begins at 5(N-1)+1. Taken first, because neither of its numbers means anything on its own.
		const lustrum =
			/\b(\d{1,2})(?:st|nd|rd|th)\s+year\s+of\s+the\s+(\d{1,2})(?:st|nd|rd|th)\s+lustrum/i.exec(
				sense,
			);
		if (lustrum) {
			stated.push(5 * (Number(lustrum[2]) - 1) + Number(lustrum[1]));
			continue;
		}
		for (const [, digits] of sense.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)?\b/g)) {
			const value = Number(digits);
			if (value >= 1 && value <= 60) stated.push(value);
		}
		// Worded ordinals anywhere in the sense, not only immediately before "year". प्रभव reads "the
		// first or 35th year", where `first` is followed by "or", so a lookahead on " year" misses it
		// and the entry then appears to place position 1 at 35.
		for (const [, word] of sense.matchAll(/\b([a-z]+(?:-[a-z]+)?)\b/gi)) {
			const value = ordinalWordToNumber(word);
			if (value !== null) stated.push(value);
		}
	}
	return { statedPositions: [...new Set(stated)] };
}

async function wiktionaryForCell(cell) {
	for (const alternative of cell.split("/").map((s) => s.trim())) {
		const entry = await wiktionaryEntry(alternative);
		if (entry) return entry;
	}
	return null;
}

for (const r of rows) {
	try {
		const mw = await monierWilliamsForCell(r.devanagari, r.n);
		if (!mw) {
			fail(
				`position ${r.n}: no Monier-Williams entry for ${r.devanagari} on any rung of the ladder. ` +
					"All sixty resolved on 2026-08-21, so this is a source or a spelling to look at, not a " +
					"gap in Sanskrit lexicography.",
			);
			r.senses = [];
		} else {
			r.senses = mw.senses;
			r.mwPage = mw.page;
			r.mwQueriedAs = mw.devanagari;
			r.mwRung = mw.rung;
			r.mwKey = mw.key;

			const xref = SENSE_CROSS_REFERENCES.find((entry) => entry.n === r.n);
			if (xref) {
				if (mw.devanagari !== xref.from || !mw.senses.some((s) => s.text.includes(xref.expects))) {
					fail(
						`position ${r.n} follows a cross-reference on the strength of ${xref.from} reading ` +
							`"${xref.expects}", which its entry no longer says. Re-read it rather than adjusting ` +
							"the expected text.",
					);
				} else {
					const target = await monierWilliamsEntry(xref.to);
					if (!target) {
						fail(`position ${r.n}: the cross-reference target ${xref.to} does not resolve`);
					} else {
						r.senses = target.senses;
						r.mwPage = target.page;
						r.mwQueriedAs = target.devanagari;
						r.mwRung = `cross-reference from ${xref.from}`;
						r.mwKey = target.key;
					}
				}
			}
		}

		const wiktionary = await wiktionaryForCell(r.devanagari);
		r.attested = wiktionary !== null;
		r.statedPositions = wiktionary?.statedPositions ?? [];
		// The 60 excluded: several entries say "a 60 years' cycle", which is the cycle's length and
		// not a position, and it would match position 60 by coincidence rather than by evidence.
		const meaningful = r.statedPositions.filter((p) => p !== 60 || r.n === 60);
		if (meaningful.length > 0 && !meaningful.includes(r.n)) {
			fail(
				`position ${r.n}: Wiktionary's entry at ${r.devanagari} places it at ` +
					`${meaningful.join(" or ")} in the cycle, never ${r.n}. The alignment or the name is wrong.`,
			);
		}
		if (meaningful.includes(r.n)) r.positionConfirmed = true;
	} catch (error) {
		fail(`position ${r.n}: lexicon lookup for ${r.devanagari} failed -- ${error.message}`);
	}
}

/**
 * Anchors, for every column that cannot fail a row on its own.
 *
 * Attestation is evidence, not a gate -- so a change in an API's shape would otherwise mark all
 * sixty unattested and be recorded as a fact about Sanskrit lexicography rather than about our HTTP
 * client. Cologne and wisdomlib need the same guard for the same reason, and get it from खर, whose
 * entry is long enough that a partial parse shows up as a count.
 */
const ANCHORS = [1, 29, 31, 52];
for (const n of ANCHORS) {
	const r = rows.find((row) => row.n === n);
	if (!r?.attested) {
		fail(
			`anchor position ${n} (${r?.devanagari}) is not attested. These four are known to have ` +
				"Wiktionary entries, so this means the lookup is broken, not that the name is unattested.",
		);
	}
}

const khara = rows.find((row) => row.n === 25);
if (khara?.mwPage !== "337" || (khara?.senses.length ?? 0) < 20) {
	fail(
		`the Monier-Williams anchor failed: खर should parse as 22 senses on printed page 337, and came ` +
			`back as ${khara?.senses.length ?? 0} senses on page ${khara?.mwPage ?? "?"}. A short parse ` +
			"means the page's markup changed, not that Monier-Williams grew shorter.",
	);
}

/**
 * Counts gloss units in a selection, splitting on `,` and `;` outside parentheses.
 *
 * Parentheses are skipped because MW's own asides carry commas -- "white (the colour)" and "fit for
 * the (present) time" are one gloss each, and counting naively would reject both.
 */
function glossUnits(text) {
	let depth = 0;
	let units = 1;
	for (const char of text) {
		if (char === "(" || char === "[") depth += 1;
		else if (char === ")" || char === "]") depth = Math.max(0, depth - 1);
		else if ((char === "," || char === ";") && depth === 0) units += 1;
	}
	return units;
}

for (const r of rows) {
	const choice = SELECTED_SENSES[r.n];
	if (choice === undefined) continue;
	const candidates = (r.senses ?? []).filter(
		(sense) => sense.id === choice.id && sense.text.includes(choice.text),
	);
	if (candidates.length === 0) {
		const byId = (r.senses ?? []).filter((sense) => sense.id === choice.id);
		fail(
			`position ${r.n}: the selection "${choice.text}" was not found in Monier-Williams sense ` +
				`${choice.id}. ${
					byId.length === 0
						? "No sense carries that ID any more."
						: `That ID now reads: "${byId[0].text.slice(0, 120)}".`
				} A selection can only ever pick from sourced material, so re-make it against what the ` +
				"entry says now rather than editing the output.",
		);
		continue;
	}
	const units = glossUnits(choice.text);
	if (units > 2) {
		fail(
			`position ${r.n}: the selection "${choice.text}" carries ${units} gloss units, and the ` +
				"limit is two. MW sense lines are themselves gloss lists, so a whole line is almost never " +
				"the right span -- take the one or two that render the Tibetan.",
		);
		continue;
	}
	r.selected = choice.text;
	r.selectedSenseId = choice.id;
}

// Composed meanings, checked against the entries they cite. A composition that cannot be traced to
// two sourced glosses is an invention, so each part must resolve and each stated gloss must appear
// verbatim in the sense whose ID it names.
for (const r of rows) {
	const composed = COMPOSED_MEANINGS[r.n];
	if (composed === undefined) continue;
	if (r.selected) {
		fail(
			`position ${r.n} has both a verbatim selection and a composed meaning. Composition is the ` +
				"weaker tier and exists only where Monier-Williams glosses no entry for the whole word.",
		);
		continue;
	}
	const parts = [];
	for (const part of composed.parts) {
		const entry = await monierWilliamsEntry(part.devanagari);
		const sense = entry?.senses.find((candidate) => candidate.id === part.id);
		if (!sense) {
			fail(
				`position ${r.n}: the composed meaning cites ${part.devanagari} sense ${part.id}, which ` +
					"does not resolve. A composition has to be traceable to entries that exist.",
			);
			continue;
		}
		if (!sense.text.includes(part.gloss)) {
			fail(
				`position ${r.n}: the composed meaning reads "${part.gloss}" for ${part.devanagari}, but ` +
					`sense ${part.id} now says "${sense.text.slice(0, 90)}". Re-make the composition against ` +
					"what the entry says.",
			);
			continue;
		}
		parts.push({ ...part, page: entry.page });
	}
	if (parts.length === composed.parts.length) {
		r.composed = composed.text;
		r.composedFrom = parts;
	}
}

for (const expansion of ABBREVIATION_EXPANSIONS) {
	const r = rows.find((row) => row.n === expansion.n);
	if (!r) {
		fail(`abbreviation expansion for position ${expansion.n} has no row`);
		continue;
	}
	if (!(r.senses ?? []).some((sense) => sense.text.includes(expansion.expects))) {
		fail(
			`position ${expansion.n} expands "${expansion.expects}", which its entry no longer carries. ` +
				"Re-read it rather than adjusting the expected text.",
		);
		continue;
	}
	const abbreviated = expansion.expects.slice(-2, -1);
	if (!expansion.elementGloss.startsWith(abbreviated)) {
		fail(
			`position ${expansion.n} expands "${abbreviated}˚" to "${expansion.elementGloss}", which does ` +
				"not begin with that letter. The abbreviation stands for the element's initial.",
		);
		continue;
	}
	const element = await monierWilliamsEntry(expansion.element);
	const sense = element?.senses.find((candidate) => candidate.id === expansion.elementId);
	if (!sense?.text.includes(expansion.elementGloss)) {
		fail(
			`position ${expansion.n}: the element ${expansion.element} sense ${expansion.elementId} no ` +
				`longer glosses "${expansion.elementGloss}", so the expansion is unsupported.`,
		);
		continue;
	}
	r.composed = expansion.text;
	r.composedFrom = [
		{
			devanagari: expansion.element,
			gloss: expansion.elementGloss,
			id: expansion.elementId,
			page: element.page,
		},
	];
}

// ---------------------------------------------------------------------------------------------
// 6c. wisdomlib: the Brihat Samhita position, and corroboration from outside Monier-Williams.
//
// Two jobs, and the second is the reason this source is here at all. wisdomlib aggregates the
// Cologne lexicons with per-source attribution, so it can say whether a headword is carried by
// Shabda-Sagara, Benfey, Yates, Apte or Edgerton -- lexicons genuinely independent of MW. Its MW
// layer is EXCLUDED from that count, or the corroboration would be Monier-Williams agreeing with
// itself, which is the exact failure that demoted Wiktionary as a sense source.
//
// The first job is the Brihat Samhita of Varahamihira, which names the position in words beside the
// Devanagari -- "Vilambi (विलम्बि) refers to the thirty-second samvatsara". That is a primary Indic
// astronomical witness, independent of Wiktionary, Sewell and Janson, on the one axis this table
// most needs a second opinion about. Measured over 24 sampled positions on 2026-08-21: 17 agree,
// none disagree, and roughly a quarter carry no position at all.
// ---------------------------------------------------------------------------------------------

/** Lexicons on a wisdomlib page that are NOT Monier-Williams, and so can corroborate it. */
const INDEPENDENT_LEXICONS = [
	"Shabda-Sagara",
	"Benfey",
	"Yates",
	"Apte",
	"Edgerton",
	"Wilson",
	"Goldstucker",
];

async function wisdomlibEntry(slug, devanagari) {
	const html = await fetchWithRetry(
		`https://www.wisdomlib.org/definition/${encodeURIComponent(slug)}`,
		"wisdomlib",
		{ nullOn404: true },
	);
	// Slower than the others on purpose: this is the one source that rate-limited a full run.
	await sleep(600);
	if (html === null) return null;
	// Stripped to text BEFORE any phrase is matched. The phrase runs across markup -- the Devanagari
	// sits in its own span -- so matching the raw HTML finds nothing and reports the page as carrying
	// no position. That is how a first survey concluded wisdomlib had no coverage at all, which is
	// the same class of error as reading a summarised rendering instead of the source.
	const text = stripHtml(html);
	// The slug is undiacriticised, so it merges homographs and neighbours: `sarvadhari` and
	// `sarvadharin` are different pages. Confirm the page prints the headword we asked about before
	// believing anything on it.
	if (!text.includes(devanagari)) return null;
	const stated = /refers to the ([a-z-]+) sa[ṃm]vatsara/i.exec(text);
	let brihatSamhitaPosition = null;
	if (stated) {
		brihatSamhitaPosition = ordinalWordToNumber(stated[1]);
		if (brihatSamhitaPosition === null) {
			// An ordinal we cannot read is OUR gap, not a disagreement, and must not be silently
			// dropped -- wisdomlib spells position 40 "fourtieth", which a stricter parser would have
			// thrown away as noise rather than reported.
			throw new Error(
				`wisdomlib states the position as "${stated[1]}", which the ordinal parser does not know`,
			);
		}
	}
	const corroborators = INDEPENDENT_LEXICONS.filter((lexicon) => text.includes(lexicon));
	return { brihatSamhitaPosition, corroborators, slug };
}

/**
 * Tries the slugs a row could live under: the derived IAST, and the form Cologne resolved it as.
 *
 * These differ, and position 32 is why: Cologne lemmatises it under विलम्बिन् (`vilambin`) while
 * wisdomlib carries the Brihat Samhita entry under `vilambi`. One resolved headword per row is not
 * enough, so each source records the form it was actually queried with.
 */
async function wisdomlibForRow(r) {
	const slugs = new Set();
	for (const part of r.iast.split("/"))
		for (const slug of slugVariants(part.trim())) slugs.add(slug);
	if (r.mwQueriedAs)
		for (const slug of slugVariants(devanagariToIast(r.mwQueriedAs))) slugs.add(slug);
	for (const slug of slugs) {
		if (!slug) continue;
		for (const part of r.devanagari.split("/").map((s) => s.trim())) {
			const entry = await wisdomlibEntry(slug, part);
			if (entry) return entry;
		}
	}
	return null;
}

/**
 * One request before sixty, so an outage is diagnosed once rather than sixty times.
 *
 * wisdomlib rate-limits, and answers 403 to every User-Agent alike once it does -- a browser string
 * fares no better than ours, which is worth stating because the first instinct on a 403 is to change
 * the User-Agent. That would be working around a site's access decision, which this repository has
 * already declined to do once, for Rangjung Yeshe Wiki, and recorded why.
 *
 * A whole-source outage aborts the run rather than degrading it. Corroboration and the Brihat
 * Samhita position would otherwise come back empty for every row, and "no independent lexicon
 * carries this headword" would be written into the document as a finding when it is a fact about
 * our afternoon's request volume.
 */
let wisdomlibReachable = true;
try {
	await fetchWithRetry("https://www.wisdomlib.org/definition/khara", "wisdomlib");
} catch (error) {
	wisdomlibReachable = false;
	fail(
		`wisdomlib is not answering (${error.message}), so the Brihat Samhita position and the ` +
			"independent-lexicon corroboration are unavailable for all sixty rows. Nothing is written: an " +
			"empty corroboration column would read as a finding about Sanskrit lexicography rather than " +
			"about rate limiting. Wait and re-run -- it answers 403 to every User-Agent alike while " +
			"throttling, so changing ours is not the fix.",
	);
}

for (const r of rows) {
	if (!wisdomlibReachable) break;
	try {
		const entry = await wisdomlibForRow(r);
		r.corroborators = entry?.corroborators ?? [];
		r.wisdomlibQueriedAs = entry?.slug ?? null;
		r.brihatSamhitaPosition = entry?.brihatSamhitaPosition ?? null;
		if (r.brihatSamhitaPosition !== null && r.brihatSamhitaPosition !== r.n) {
			fail(
				`position ${r.n}: the Brihat Samhita places ${r.devanagari} at ` +
					`${r.brihatSamhitaPosition} in the cycle. A primary Indic source disagreeing with the ` +
					"alignment is not something to record and move past.",
			);
		}
	} catch (error) {
		fail(`position ${r.n}: wisdomlib lookup failed -- ${error.message}`);
	}
}

const kharaWisdomlib = rows.find((row) => row.n === 25);
if (wisdomlibReachable && kharaWisdomlib?.brihatSamhitaPosition !== 25) {
	fail(
		"the wisdomlib anchor failed: khara's page states the twenty-fifth samvatsara outright, so a " +
			`null here (${kharaWisdomlib?.brihatSamhitaPosition}) means the page's shape changed, not ` +
			"that the Brihat Samhita fell silent.",
	);
}

// ---------------------------------------------------------------------------------------------
// 7. Phonetics, from THL's converter -- the publisher of the standard.
//
// This keeps its own fetch rather than using `fetchWithRetry`: it is a POST with a form body, and
// the shared helper is a GET. It shares `sleep`, declared with the other network helpers above.
// ---------------------------------------------------------------------------------------------

async function phoneticFor(wylie) {
	for (let attempt = 0; attempt < 3; attempt++) {
		try {
			const response = await fetch("https://old.thlib.org/cgi-bin/thl/lbow/phonetics.pl", {
				method: "POST",
				headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded" },
				body: new URLSearchParams({
					input: wylie,
					type: "thl",
					words: "join",
					sep_join: "",
					send: "Make Phonetics",
				}),
			});
			if (!response.ok) throw new Error(`THL returned ${response.status}`);
			const html = await response.text();
			const areas = [...html.matchAll(/<textarea[^>]*>([\s\S]*?)<\/textarea>/g)].map((m) =>
				m[1].trim(),
			);
			return areas[1];
		} catch (error) {
			if (attempt === 2) throw error;
			await sleep(1000 * (attempt + 1));
		}
	}
}

for (const r of rows) {
	await sleep(150); // a courtesy to a university server; 60 rows, not 27
	try {
		r.phonetic = await phoneticFor(r.wylie);
	} catch (error) {
		fail(`position ${r.n}: THL lookup for "${r.wylie}" failed -- ${error.message}`);
		continue;
	}
	if (!r.phonetic) {
		fail(`position ${r.n}: THL returned no phonetics for "${r.wylie}"`);
	} else if (r.phonetic.includes("(?)")) {
		// THL marks a syllable it cannot analyse with a literal "(?)". An emptiness check passes it
		// straight through, which is how "anggi(?) ra" would otherwise have shipped.
		fail(
			`position ${r.n}: THL could not analyse "${r.wylie}" -- it returned "${r.phonetic}". ` +
				"The (?) marker is THL declining to answer, not an answer.",
		);
	}
}

// ---------------------------------------------------------------------------------------------
// Report, then emit only if everything held.
// ---------------------------------------------------------------------------------------------

for (const r of rows) {
	console.log(
		`  ${String(r.n).padStart(2)}  ${(r.tibetan ?? "-").padEnd(16)} ${r.wylie.padEnd(18)} ` +
			`${(r.phonetic ?? "-").padEnd(16)} ${r.iast.padEnd(14)} ${r.attested ? "attested" : "-"}`,
	);
}

if (problems.length > 0) {
	console.error(`\n${problems.length} problem(s); nothing written:\n`);
	for (const p of problems) console.error(`  - ${p}`);
	process.exit(1);
}

const quote = (s) => JSON.stringify(s);

writeFileSync(
	join(root, "test", "fixtures", "rabjung-names.ts"),
	`/**
 * The 60 rabjung year names, verified against independent authorities.
 *
 * @remarks
 * GENERATED by \`scripts/verify-rabjung-names.mjs\`. Do not edit by hand -- re-run the script.
 *
 * Every row's Wylie was extracted mechanically from Janson's LaTeX; two EWTS implementations agreed
 * on the script and it read back as the same Wylie; THL supplied the phonetics; the Devanagari came
 * from the Indic samvatsara list, joined to Janson's by a Gregorian-year check that has to agree on
 * both years of all sixty rows; and the IAST is **derived from that Devanagari** rather than taken
 * from the list, whose own romanisation disagrees with its own script at twelve positions.
 *
 * \`senses\` is Monier-Williams, from the Cologne scan, uncapped and citing a printed page.
 * \`attested\` records only whether English Wiktionary also has a Sanskrit entry -- it is a second
 * lexicographic witness, not the sense source, and not a gate, so four anchor positions are checked
 * and the run aborts if they stop resolving.
 */

export interface RabjungNameSense {
	/** Cologne record ID. Stable, and what a selection is pinned to. */
	id: string;
	/** Monier-Williams' homonym group, where the entry marks one. */
	group: string | null;
	text: string;
}

export interface RabjungNameFixtureRow {
	/** Position in the cycle, 1-60. */
	position: number;
	tibetan: string;
	wylie: string;
	/** THL Simplified Phonetic Transcription. */
	phonetic: string;
	devanagari: string;
	/** Derived from \`devanagari\`, not taken from the samvatsara table. */
	iast: string;
	/** Gregorian years in the 16th and 17th rabjung cycles carrying this name. */
	years: [number, number];
	/** English Wiktionary has a Sanskrit entry at \`devanagari\`. A second witness, not the source. */
	attested: boolean;
	/** Every sense Monier-Williams lists, in its order. **Sourced**; uncapped. */
	senses: readonly RabjungNameSense[];
	/**
	 * The gloss taken as this name's meaning.
	 *
	 * **An authored selection from sourced candidates**, never free text: the generator refuses to
	 * emit unless this string appears verbatim inside the sense carrying \`selectedSenseId\`, and
	 * unless it carries at most two gloss units. Null where no sense renders the Tibetan.
	 */
	selected: string | null;
	/** The Cologne record ID \`selected\` was taken from. */
	selectedSenseId: string | null;
	/**
	 * A meaning **composed** from the entries for the compound's parts.
	 *
	 * A weaker tier than \`selected\`, and deliberately a separate field: \`selected\` is always a
	 * verbatim span of one printed sense, and mixing the two would end that guarantee. Set only where
	 * Monier-Williams glosses no entry for the whole word but does gloss both halves, and only where
	 * the Tibetan name disambiguates the compound. Null everywhere else.
	 */
	composed: string | null;
	/** The entries a \`composed\` meaning was built from, so it can be checked rather than trusted. */
	composedFrom: readonly { devanagari: string; gloss: string; id: string; page: string | null }[];
	/** Monier-Williams' printed book page, so a reader can check the scan. */
	mwPage: string | null;
	/** The headword actually queried, which is not always the one printed -- see the lookup ladder. */
	mwQueriedAs: string | null;
	/** Which rung of the ladder resolved it; "as printed" where no normalisation was needed. */
	mwRung: string | null;
	/** The position the Brihat Samhita states, via wisdomlib. Null where it states none. */
	brihatSamhitaPosition: number | null;
	/** Lexicons other than Monier-Williams that carry this headword, from wisdomlib's attribution. */
	corroborators: readonly string[];
}

export const RABJUNG_NAMES: readonly RabjungNameFixtureRow[] = [
${rows
	.map((r) => {
		const senses = (r.senses ?? [])
			.map(
				(s) =>
					`{ id: ${quote(s.id)}, group: ${s.group ? quote(s.group) : "null"}, text: ${quote(s.text)} }`,
			)
			.join(", ");
		const optional = (value) => (value ? quote(value) : "null");
		return (
			`\t{ position: ${r.n}, tibetan: ${quote(r.tibetan)}, wylie: ${quote(r.wylie)}, ` +
			`phonetic: ${quote(r.phonetic)}, devanagari: ${quote(r.devanagari)}, iast: ${quote(r.iast)}, ` +
			`years: [${r.years[0]}, ${r.years[1]}], attested: ${r.attested}, senses: [${senses}], ` +
			`selected: ${optional(r.selected)}, selectedSenseId: ${optional(r.selectedSenseId)}, ` +
			`composed: ${optional(r.composed)}, composedFrom: [${(r.composedFrom ?? [])
				.map(
					(part) =>
						`{ devanagari: ${quote(part.devanagari)}, gloss: ${quote(part.gloss)}, id: ${quote(part.id)}, page: ${part.page ? quote(part.page) : "null"} }`,
				)
				.join(", ")}], ` +
			`mwPage: ${optional(r.mwPage)}, mwQueriedAs: ${optional(r.mwQueriedAs)}, ` +
			`mwRung: ${optional(r.mwRung)}, brihatSamhitaPosition: ${r.brihatSamhitaPosition ?? "null"}, ` +
			`corroborators: [${(r.corroborators ?? []).map(quote).join(", ")}] },`
		);
	})
	.join("\n")}
];
`,
);

// ---------------------------------------------------------------------------------------------
// The provenance document.
// ---------------------------------------------------------------------------------------------

/** Authored English glosses of the TIBETAN names. Not sourced; see the provenance table. */
const AUTHORED = JSON.parse(
	readFileSync(join(dirname(fileURLToPath(import.meta.url)), "rabjung-names.data.json"), "utf8"),
);

const cell = (s) => String(s ?? "").replace(/\|/g, "\\|");
const anchorFor = (r) => `sanskrit-senses-at-position-${r.n}`;

/**
 * The table's sense cell: the first sense in full, and a link to the rest.
 *
 * Nothing is truncated. An earlier version sliced each sense to 60 characters, which cut mid-word
 * ("cause of existence (as father or", "cycle of Jupite") and -- worse -- meant eight rows printed a
 * `Selected` string that appeared nowhere in the senses cell beside it, one paragraph below the
 * claim that a selection must appear verbatim among the senses. The full list now lives in a detail
 * section, so that claim is true of the rendered document and not only of the fixture.
 */
const senseCell = (r) => {
	const senses = r.senses ?? [];
	if (senses.length === 0) return "*no Monier-Williams entry*";
	// Monier-Williams opens several entries with a bare cross-reference — "प्र-भव &c. See under
	// प्र-√भू" — which is his apparatus rather than a sense. Showing that as the row's representative
	// gloss tells a reader nothing, so the first SUBSTANTIVE sense is shown, falling back to the first
	// if an entry is nothing but cross-references.
	const substantive = senses.find((sense) => !CROSS_REFERENCE.test(sense.text)) ?? senses[0];
	const rest = senses.length - 1;
	// No inline <br>: MD033 forbids it, and the link reads fine on one line.
	return rest > 0
		? `${cell(substantive.text)} ([+${rest} more](#${anchorFor(r)}))`
		: cell(substantive.text);
};

/** The per-row evidence tier, so no single standing is claimed for all sixty rows. */
const evidenceTier = (r) => {
	const parts = [];
	parts.push(r.mwRung === "as printed" ? "MW as printed" : `MW via ${cell(r.mwRung)}`);
	if (r.attested) parts.push("Wiktionary");
	if (r.corroborators?.length) parts.push(`${r.corroborators.length} other lexicon(s)`);
	const position = [];
	if (r.positionConfirmed) position.push("Wiktionary");
	if (r.brihatSamhitaPosition === r.n) position.push("Bṛhat Saṃhitā");
	parts.push(position.length ? `position: ${position.join(" + ")}` : "position: unstated");
	return parts.join("; ");
};

// A corrected value did NOT come from the source its column heading names, so it is marked. Without
// this the heading over-claims: position 60 reads क्षय under a column headed *saṃvatsara*, when the
// saṃvatsara table says अक्षय.
const mark = (value, corrected) => (corrected ? `${value} †` : value);
const markedCells = rows.reduce(
	(total, r) => total + (r.devanagariCorrectedFrom ? 2 : 0) + (r.wylieCorrectedFrom ? 1 : 0),
	0,
);
const markedPositions = rows
	.filter((r) => r.devanagariCorrectedFrom || r.wylieCorrectedFrom)
	.map((r) => r.n);

/**
 * The meaning cell: a verbatim selection, or a composed gloss marked with a double dagger, or a
 * short reason for the blank.
 *
 * A bare dash says only that the cell is empty. Naming the reason costs nothing and is the
 * difference between "Monier-Williams is silent" and "Monier-Williams knows this word only as the
 * label for this year", which are different facts about the name.
 */
const meaningCell = (r) => {
	if (r.selected) return cell(r.selected);
	if (r.composed) return `${cell(r.composed)} ‡`;
	if ((r.senses ?? []).length === 0) return "—";
	return glossesTheWord({ senses: r.senses }) ? "—" : "*MW: year-name only*";
};

const docRow = (r) =>
	`| ${r.n} | ${r.tibetan} | \`${mark(r.wylie, r.wylieCorrectedFrom)}\` | *${r.phonetic}* | ` +
	`${mark(r.devanagari, r.devanagariCorrectedFrom)} | ${mark(r.iast, r.devanagariCorrectedFrom)} | ` +
	`${cell(AUTHORED[String(r.n)]?.english)} | ${senseCell(r)} | ${meaningCell(r)} | ` +
	`${evidenceTier(r)} | ${r.years[0]}, ${r.years[1]} |`;

/** One block per row that resolved, carrying the full sense list untruncated. */
const detailBlock = (r) => {
	const senses = r.senses ?? [];
	if (senses.length === 0) return "";
	// The heading text IS the anchor. check-links mirrors GitHub's slugger — lowercase, punctuation
	// dropped, spaces to hyphens — so "Sanskrit senses at position 25" slugifies to exactly the
	// fragment the table links to. Naming the headword in the heading instead would drag Devanāgarī
	// and an em dash into the slug and break every link in the table.
	const heading = `### Sanskrit senses at position ${r.n}\n\n${r.devanagari} ${r.iast}`;
	const composedNote = r.composed
		? `

**Composed meaning ‡** — "${cell(r.composed)}", from ${r.composedFrom
				.map((part) => `${part.devanagari} "${part.gloss}" (page ${part.page ?? "?"}, ${part.id})`)
				.join(" + ")}. Monier-Williams has no entry for the whole word.`
		: "";
	const provenance =
		`Monier-Williams, printed page ${r.mwPage ?? "?"}, queried as \`${r.mwQueriedAs}\`` +
		` (${r.mwRung})${r.corroborators?.length ? `. Also carried by ${r.corroborators.join(", ")}` : ""}.`;
	// No inline HTML: markdownlint's MD033 forbids it, and a generated document has no business
	// being the one file that needs an exception.
	const list = senses
		.map((s) => {
			// Monier-Williams numbers his homonyms "1. क्षय", "2. क्षय". A list item whose content opens
			// with that is parsed as a NESTED ORDERED LIST, so the second one fails MD029 for starting at
			// 2. Escaping the period keeps his numbering visible and stops markdown claiming it.
			const escaped = cell(s.text).replace(/^(\d+)\./, "$1\\.");
			const text = s.id === r.selectedSenseId ? `**${escaped}**` : escaped;
			return `- ${text} *(${s.group ?? "—"} · ${s.id})*`;
		})
		.join("\n");
	return `${heading}\n\n${provenance}${composedNote}\n\n${list}\n`;
};

/**
 * The "How a headword is looked up" section, generated from the rows so it cannot drift.
 *
 * The Evidence column says things like "MW via -in stem" on eleven rows, and nothing else in the
 * document explains what that means or why a lookup needed help at all.
 */
const ladderSection = () => {
	const byRung = new Map();
	for (const r of rows) {
		if (r.mwRung === "as printed") continue;
		if (!byRung.has(r.mwRung)) byRung.set(r.mwRung, []);
		byRung.get(r.mwRung).push(r);
	}
	const asPrinted = rows.filter((r) => r.mwRung === "as printed").length;
	const viaRung = rows.length - asPrinted;
	const explanation = {
		"-in stem": "The list prints the nominative singular; Monier-Williams lemmatises the stem.",
		"anusvāra → cluster":
			"One word, two conventions for the same nasal. Monier-Williams files these under the cluster.",
		"cluster → anusvāra":
			"The same rule in reverse — he files this one under the anusvāra, so the ladder tries both directions.",
		"final virāma":
			"A missing virāma leaves a spurious inherent *a*, so the word queried is not the word meant.",
		"ḷ → l + -in stem":
			"ळ is Vedic and Marathi rather than standard Sanskrit, and this row needs the stem rule on top of it — the rungs compose.",
	};
	const body = [...byRung.entries()]
		.map(([rung, group]) => {
			const examples = group.map((r) => `${r.n} ${r.devanagari} → ${r.mwQueriedAs}`).join("; ");
			return `| \`${rung}\` | ${group.length} | ${explanation[rung] ?? ""} | ${examples} |`;
		})
		.join("\n");
	return `## How a headword is looked up

Monier-Williams is a dictionary, so finding a word means naming the **headword form** he files it
under — and that is not always how the saṃvatsara list spells the name. Sent to Cologne exactly as
printed, ${asPrinted} of the ${rows.length} headwords resolve.
The other ${viaRung} do not, and none of them is missing from Monier-Williams:
he has every one, under a different form of the same word.

So the lookup walks a **ladder**: the printed spelling first, then each transformation below, then
the pairs that compose. Every rung states a rule of Sanskrit orthography or morphology, which is what
separates it from a correction — **a rung changes only what is *queried*, while a correction changes
what this table *prints* and carries authored evidence**. The Devanāgarī column still shows the
source's own spelling at every one of these rows; the ladder simply knows where Monier-Williams keeps
it. Collapsing the two would turn ${viaRung} points of grammar into ${viaRung} editorial judgements.

| Rung | Rows | Why it is a rule rather than a judgement | Where it applied |
|---|---|---|---|
${body}`;
};

/**
 * The divergence table: where the Tibetan tradition and the Indic list put DIFFERENT names at one
 * position, rather than different spellings of one name.
 *
 * Janson's ASCII Sanskrit is the only mechanical detector of this, and it is extracted here for that
 * purpose alone -- it is never written to the fixture and never reaches `src/`. It was dropped from
 * this document once before, on the reasoning that it collides three names onto `pramadi` and so is
 * useless as a name source. That is true and is why it is not shipped; but it took the evidence for
 * the divergence with it, and the claim survived for months in a roadmap sentence whose position-60
 * half had by then become wrong.
 */
const DIVERGENCES = [
	{
		n: 13,
		janson: "pramadi",
		verdict: "Senses diverge",
		note:
			"A different kind of divergence from the rest of this table, and worth separating. The two " +
			"lists agree on the NAME here -- both are Pramāthin -- and disagree on what it means: " +
			'Monier-Williams glosses it "stirring about, tearing, rending", agitation, while the Tibetan ' +
			"`myos ldan` is intoxication. Janson's ASCII cannot corroborate either way, because " +
			"`pramadi` is the form he collides onto positions 4, 13 and 47 alike. So the Sanskrit sense " +
			"is selected as the Sanskrit's own, and the Tibetan gloss stands beside it unreconciled.",
	},
	{
		n: 20,
		janson: "aksaya",
		verdict: "Not a divergence",
		note:
			"Janson's `aksaya` matches the FIRST alternative of the compound cell अव्यय/व्यय, which is the " +
			"reading the Tibetan `mi zad` (inexhaustible) also takes. This is a within-cell selection " +
			"question, not two traditions naming different things.",
	},
	{
		n: 29,
		janson: "mada",
		verdict: "Divergent",
		note:
			"Intoxication against मन्मथ, the god of love. The Tibetan `myos byed` ('intoxicating') sides " +
			"with Janson, so the two lists carry different names at this index.",
	},
	{
		n: 39,
		janson: "visvabandhu",
		verdict: "Open",
		note:
			"vasu ('wealth') against bandhu ('kinsman'). The Tibetan `sna tshogs dbyig` -- dbyig is " +
			"wealth -- sides with the INDIC विश्वावसु, not with Janson, which suggests his ASCII is corrupt " +
			"here rather than that the traditions diverge. Recorded rather than decided.",
	},
	{
		n: 52,
		janson: "kaladuti",
		verdict: "Divergent",
		note:
			"kāla-dūtī, 'messenger of time', against कालयुक्त, 'joined to time'. The Tibetan " +
			"`dus kyi pho nya` is the messenger, so it sides with Janson.",
	},
	{
		n: 60,
		janson: "ksayaka",
		verdict: "Dissolved",
		note:
			"Both are kṣaya. This was recorded for months as the clearest divergence -- `zad pa` " +
			"(exhaustion) against *Akshaya* (imperishable), two opposite names at one index -- and the " +
			"correction above removed it. The Indic cell said अक्षय; Sewell, Janson and the Tibetan all " +
			"say क्षय.",
	},
];

// Each record states the Janson reading it was argued from, and the run fails if his table no longer
// says that -- the same self-invalidation the corrections use. A divergence table that silently
// drifts from its source is worse than none, because it reads as evidence.
for (const d of DIVERGENCES) {
	const r = rows.find((row) => row.n === d.n);
	if (!r) {
		fail(`divergence record for position ${d.n} has no row`);
	} else if (r.jansonSanskrit !== d.janson) {
		fail(
			`the divergence record at ${d.n} was argued from Janson's "${d.janson}", but his table now ` +
				`reads "${r.jansonSanskrit}". Re-argue it rather than adjusting the expected value.`,
		);
	}
}

const divergenceRow = (d) => {
	const r = rows.find((row) => row.n === d.n);
	return (
		`| ${d.n} | \`${r?.jansonSanskrit}\` | ${r?.devanagari} ${r?.iast} | ` +
		`${cell(AUTHORED[String(d.n)]?.english)} | **${d.verdict}** | ${d.note} |`
	);
};

writeFileSync(
	join(root, "docs", "names", "rabjung.md"),
	`# The 60 rabjung year names

**Status: generated.** Produced by \`scripts/verify-rabjung-names.mjs\`; re-run it rather than
editing this file. \`test/fixtures/rabjung-names.ts\` is generated from the same run and is what the
suite reads.

## The sources, and why each one

Each source is here because it is the only thing that can answer a particular question. Where two
could answer the same question, both are used and required to agree — one source is an opinion, two
agreeing independently is a result.

| Source | Answers | Why this one | Standing |
|---|---|---|---|
| Janson, *Tibetan Calendar Mathematics* (LaTeX) | Wylie, cycle position, the two Gregorian years | The Tibetan lineage — he takes the table from Henning's Appendix I — and the only source this package derives from, per the clean-room constraint | **Sourced**, extracted mechanically |
| Wikipedia saṃvatsara table | Devanāgarī | The only machine-readable source found carrying the script against the cycle positions. Its **IAST is no longer used**: it disagrees with its own Devanāgarī at ${IAST_DISAGREEMENTS.size} positions, so the IAST column below is derived instead | **Sourced**, corrected below |
| Sewell & Fleet, *The Siddhāntas and the Indian Calendar* (1924) | **Name identity only** — which name sits at which position | The authority the Indic column was originally cited to. It cannot check spelling: it prints \`Sukla\`, \`Vrisha\`, \`Kshaya\` in 1924 romanisation with **no IAST diacritics anywhere** | **Sourced**, by majority vote over thousands of OCR reads |
| Monier-Williams, via the Cologne Digital Sanskrit Dictionaries | The Sanskrit senses | The authority itself, from the scan: uncapped, citing a printed page, and carrying MW's own homonym grouping | **Sourced**, with a page citation per row |
| wisdomlib | The Bṛhat Saṃhitā's cycle position; which **other** lexicons carry a headword | Varāhamihira names the position in words beside the Devanāgarī — a primary Indic astronomical witness, independent of Janson, Sewell and Wiktionary. Only the position is taken, never the prose | **Sourced**, where present |
| English Wiktionary | That a Devanāgarī headword exists; the cycle position where its entry states it | A second lexicographic witness. **Not a sense source**: its Sanskrit senses *are* Monier-Williams, verbatim, so it is not a lineage independent of MW | **Sourced** |
| \`jsewts\` + \`tibetan-ewts-converter\` | Tibetan script | Two independent implementations required to agree, then to read back as the Wylie they came from | **Derived**, doubly |
| THL phonetics converter | THL Simplified phonetics | The publisher of the standard | **Sourced** |

**Janson's ASCII Sanskrit is not shipped, and is extracted for exactly one purpose.** It collides
three names onto \`pramadi\`, carries no Devanāgarī, and he flags its spellings as varying between
sources, so it is unfit as a name column. But it is the **only mechanical detector** of the rows
where the two traditions carry different names rather than different spellings, so it is read for the
divergence table below and never written to the fixture or to \`src/\`.

**Why Sewell is consulted by majority vote.** Its scan is OCR and noisy — \`Ksliaya\`, \`Manniathn\`,
\`Ahgiras\`. No single occurrence is trusted. The book prints "N Name" thousands of times across its
year-conversion tables, so the modal spelling at each position over thousands of reads is taken
instead: OCR errors scatter, the true reading does not.

## Why the IAST column is derived

It is computed from the Devanāgarī, not taken from the saṃvatsara table, because that table's
romanisation is lossy in ways that are invisible until they are checked. It drops the macron on
\`-in\` stems — प्रमाथी printed as *Pramāthi* — and it prints *Raudri* for रौद्र. An earlier correction
of this document's own making wrote Sewell's 1924 \`Kshaya\` into a column headed IAST, on the same
page that says Sewell carries no diacritics anywhere.

The printed value is kept as a signal rather than discarded: **${IAST_DISAGREEMENTS.size} positions
disagree with their own Devanāgarī**, each recorded with its reason, and a disagreement that is not
on that list fails the run.

${[...IAST_DISAGREEMENTS.entries()].map(([n, why]) => `- **${n}.** ${why}.`).join("\n")}

## Corrections applied, with their evidence

Each correction is applied only after **both originals are confirmed still present**, so it
self-invalidates: if the saṃvatsara table is fixed upstream, the script says so rather than silently
applying a patch that is no longer needed.

A correction changes what this table **prints** and carries authored evidence. It is not the same as
a rung of the lookup ladder, which changes only what is **queried** and states a rule of orthography
or morphology — seven rows that look like errors are \`-in\` stems printed in the nominative, or
anusvāra spellings, and those are grammar rather than judgement.

${CORRECTIONS.map((c) => `- **Position ${c.n}: ${c.fromDevanagari} → ${c.toDevanagari}** *(${c.evidence})*. ${c.why}`).join("\n")}
${WYLIE_CORRECTIONS.map((c) => `- **Position ${c.n}, Wylie: \`${c.from}\` → \`${c.to}\`.** ${c.why}`).join("\n")}

${ladderSection()}

## Where the two traditions name different things

The Tibetan names are mostly translations of the Sanskrit, but not everywhere. These are the
positions where Janson's Tibetan-lineage Sanskrit and the Indic list carry **different names** rather
than different spellings — the distinction that decides whether the two columns of a row can be read
as one name.

| # | Janson *(Tibetan lineage)* | Indic | English of the Tibetan | Verdict | Why |
|---|---|---|---|---|---|
${DIVERGENCES.map(divergenceRow).join("\n")}

## The English columns

They gloss **different names**, which is the point of showing them side by side.

- **English of the Tibetan** is **authored, not sourced.** It glosses the Tibetan name, written for
  this table. No source gives English for these — Sewell & Fleet prints the sixty as bare names
  against Kaliyuga years and fractional day-counts, with no meaning column, checked directly.
- **Sanskrit senses** are **sourced**: every sense Monier-Williams lists for that headword, uncapped
  — ${rows.reduce((total, r) => total + (r.senses?.length ?? 0), 0)} of them across the sixty rows.
  The table shows the first; the rest are in the detail section below, untruncated.
- **Selected** is an **authored choice from those sourced candidates**, and the generator refuses to
  run unless the chosen gloss appears verbatim inside the sense carrying its recorded Cologne ID, and
  unless it carries at most two gloss units. So the editorial step is visible and machine-checked; it
  can select, never invent. ${rows.filter((r) => r.selected).length} of the 60 carry one.

**Why a selection is needed at all.** Entries carry many senses, often from different roots, and
taking the first is an accident rather than a policy. \`क्षय\` opens with a cross-reference and then
"dominion" — from *kṣi*, to rule — where the sense that renders \`zad pa\` is "destruction, decay",
from a different *kṣi* meaning to destroy. Monier-Williams marks these as separate numbered
headwords, which is one of the reasons the sense column comes from him.

## The table

Every column heading names where that column comes from, so no row has to be traced back through
the prose above to know what stands behind it. **Evidence** states the standing of that row in
particular, rather than one claim standing for all sixty.

**‡ marks a meaning **composed** from the entries for a compound's parts** rather than quoted from
one printed sense. It is a weaker tier, kept visibly separate: Monier-Williams has no entry for the
whole word but glosses both halves, and the Tibetan name is what fixes which reading of the compound
is meant. The parts and the senses they were taken from are listed in the detail section below.

**† marks a value that did *not* come from the source its heading names** — it came from a
correction above, with its evidence. Position 60 is the case to have in mind: it reads क्षय under a
column headed *saṃvatsara*, when the saṃvatsara table says अक्षय. ${markedCells} cells are marked,
at ${markedPositions.length} positions: ${markedPositions.join(", ")}.

| # *(Janson)* | Tibetan *(two EWTS)* | Wylie *(Janson)* | Phonetic *(THL)* | Devanāgarī *(saṃvatsara)* | IAST *(derived)* | English of the Tibetan **(authored)** | Sanskrit senses *(Monier-Williams)* | Selected **(authored)** | Evidence | Years *(Janson + saṃvatsara)* |
|---|---|---|---|---|---|---|---|---|---|---|
${rows.map(docRow).join("\n")}

## The senses in full

Every sense Monier-Williams gives, with its Cologne record ID and homonym group, and the printed page
the entry sits on. **The selected gloss is bolded** in its sense, so the editorial choice can be
checked against everything it was chosen from rather than taken on trust.

${rows.map(detailBlock).filter(Boolean).join("\n").trimEnd()}
`,
);

console.log(
	`\nall ${rows.length} rows passed; wrote test/fixtures/rabjung-names.ts and docs/names/rabjung.md`,
);
