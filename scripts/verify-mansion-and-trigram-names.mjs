#!/usr/bin/env node
/**
 * Verifies the 27 lunar-mansion names and the eight trigram names against independent dictionaries,
 * and refuses to write anything if any check fails.
 *
 * Usage — from a scratch directory **outside** this repository:
 *   npm init -y && npm install jsewts tibetan-ewts-converter
 *   node /path/to/repo/scripts/verify-mansion-and-trigram-names.mjs /path/to/tibet.tex
 *
 * Then format the fixtures, from the repository:
 *   npx biome check --write test/fixtures/mansion-names.ts test/fixtures/trigram-names.ts
 *
 * The evidence and every decision this encodes are in `docs/names/mansion-and-trigram-sourcing.md`,
 * written before this script so that the script could be built from a record rather than from memory.
 *
 * ## What is taken from which source
 *
 * | Source | Standing | Read for |
 * |---|---|---|
 * | Janson's trigram table (LaTeX label `T8`) | The derivation source | The eight trigrams' order, Tibetan spellings and English words |
 * | Mahāvyutpatti (aggregate `21-Mahavyutpatti-Skt`; printed: Sakaki 1916 §CLXVI, Mironov 1911 §165) | Public domain | The 28 nakṣatras as Tibetan–Sanskrit pairs, in its own order |
 * | Das and Jäschke scan indexes (`65-`, `66-`) | Public domain | That a cited headword is still where its page image was read — the index is not itself a page |
 * | *tshig mdzod chen mo*, *dung dkar tshig mdzod chen mo* (`25-`, `34-`) | Copyrighted: **gate only** | That a headword exists, and the spelling of each member of a set an entry enumerates |
 * | Monier-Williams, via Cologne | Public domain | That each Sanskrit name is a headword **in its nakṣatra sense**, and its printed page |
 *
 * From the two copyrighted dictionaries no gloss text is read into any output.
 *
 * ## Checks, and why each exists
 *
 * 1. **Script** from two EWTS implementations that must agree, a round trip back to the same Wylie,
 *    and no discouraged vowel sign.
 * 2. **Trigrams**: Janson's table still gives the eight in this order with these spellings and words;
 *    the *tshig mdzod chen mo*'s *spar kha* entry prints every spelling; the *dung dkar*'s enumeration
 *    still differs exactly where recorded; and every dictionary page the English rests on is still
 *    indexed where it was read.
 * 3. **Mansion Tibetan**: each name is the Mahāvyutpatti's Tibetan at the recorded position.
 * 4. **Mansion Sanskrit, rule (A)**: the Mahāvyutpatti's form reduced to its stem by a stated rule of
 *    Sanskrit, except where a decision is carried as data. Each shipped form must be a
 *    Monier-Williams headword **whose entry names a nakṣatra** — presence alone passed a homograph once
 *    already, at rabjung 9 — or be printed inside the entry of one that does.
 * 5. **Phonetics** from THL's own converter.
 *
 * Every decision is **data carrying its evidence and re-checked on every run**, so one
 * that stops being needed fails loudly rather than silently patching a source that has since changed.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { devanagariToIast, proveIndicPredicates, slp1ToDevanagari } from "./indic.ts";
import {
	fetchAggregate,
	indexEntries,
	provePredicates as proveDictionaryPredicates,
} from "./tibetan-dictionary.mjs";

const source = process.argv[2];
if (!source) {
	console.error("usage: node scripts/verify-mansion-and-trigram-names.mjs <path-to-tibet.tex>");
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
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------------------------
// Small readers, proved before use
// ---------------------------------------------------------------------------------------------

/** Janson's trigram table rows: number, Tibetan and element word. Null for a line that is not a row. */
function trigramRow(line) {
	const cells = line.replace(/\\\\.*$/, "").split("&");
	if (cells.length !== 7 || !/^\s*[1-8]\s*$/.test(cells[0])) return null;
	return { number: Number(cells[0]), wylie: cells[3].trim(), english: cells[6].trim() };
}

/** A Mahāvyutpatti Sanskrit cell without its visarga, which the aggregate sometimes types as Latin h. */
const mvyForm = (cell) => cell.trim().replace(/[ḥh]$/, "").toLowerCase();

/**
 * Whether a visarga-stripped Mahāvyutpatti nominative is this stem's, by one of three rules of
 * Sanskrit: a vowel stem whose nominative is the stem itself once the visarga is gone (*hastā*,
 * *puṣya[ḥ]*, *punarvasu[ḥ]*); a neuter a-stem's *-aṃ* (*mūlaṃ*); and an *-as* bahuvrīhi's feminine
 * *-āḥ* (*mṛgaśirāḥ*). Deliberately nothing else: *śravaṇā* is not *śravaṇa*'s nominative, so a
 * different stem cannot pass as a reduction and has to be argued as a decision instead.
 */
function isNominativeOf(form, stem) {
	return (
		form === stem ||
		form === `${stem}ṃ` ||
		(stem.endsWith("as") && form === `${stem.slice(0, -2)}ā`)
	);
}

/** The numbered members of a Tibetan–Tibetan enumeration — `{1 lis/2 khod/…}`. Spelling only. */
function numberedMembers(body) {
	return new Map(
		[...body.matchAll(/(?<=^|[{/ ])([1-8])\s+([a-z'.]+)/g)].map((m) => [Number(m[1]), m[2]]),
	);
}

/** Does an entry body contain this spelling as a whole Wylie token? */
const hasToken = (body, wylie) =>
	new RegExp(`(?:^|[\\s{/])${wylie.replace(/'/g, "\\'")}(?=[\\s/}]|$)`).test(body);

/**
 * The Cologne entries headed by `iast`, each with its printed page and text.
 *
 * Cologne prints a compound with a dash (`mṛga —śiras`, `ā-śleṣā`) or, across a vowel sandhi, with a
 * bare space (`pūrvā ṣāḍhā`); numbers homonyms (`2. śravaṇa`); and heads several forms in one entry
 * (`uttara —proṣṭhapadā , uttara —phalgunī or uttara —phālgunī , f.`), sometimes with a bracketed
 * citation (`anu-rādhā [ AV. &c.] f.`). So the head — everything before the first gender or
 * part-of-speech mark — loses its brackets and is split on commas, "or" and parentheses, and each piece
 * compared whole with its spaces removed, so that *hasta* never heads *hastā*.
 */
function entriesHeadedBy(text, iast) {
	return text
		.split("[Printed book page")
		.slice(1)
		.map((chunk) => {
			const page = Number(/^\s*(\d+)/.exec(chunk)?.[1] ?? Number.NaN);
			const body = chunk
				.slice(chunk.indexOf("]") + 1)
				.replace(/\s*[—–-]\s*/g, "")
				.trim();
			const head = body.replace(/^\d+\.\s*/, "").split(/\s(?:mfn|mf|m|f|n|ind)\.(?:\s|$)/)[0];
			const headwords = head
				.replace(/\[[^\]]*\]/g, "")
				.split(/,|\s+or\s+|[()]/)
				.map((piece) => piece.replace(/\s+/g, ""))
				.filter(Boolean);
			return { page, headwords, body };
		})
		.filter((entry) => entry.headwords.includes(iast));
}

const NAKSATRA_SENSE = /Nakṣatra|lunar mansion|lunar asterism|asterism/;

function proveOwnPredicates() {
	const broken = [];
	const row = trigramRow("5 & 2 & \\tri010 & kham & k\\v{a}n & N & water \\\\");
	if (row?.number !== 5 || row.wylie !== "kham" || row.english !== "water")
		broken.push(`trigramRow read ${JSON.stringify(row)}`);
	if (trigramRow("& binary & trigram & Tibetan & Chinese & direction & element\\\\") !== null)
		broken.push("trigramRow read the header as a row");
	if (mvyForm("puṣyah") !== "puṣya") broken.push("mvyForm kept a Latin-h visarga");
	for (const [form, stem, want] of [
		["hastā", "hastā", true],
		["puṣya", "puṣya", true],
		["mūlaṃ", "mūla", true],
		["mṛgaśirā", "mṛgaśiras", true],
		["śravaṇā", "śravaṇa", false],
		["hastā", "hasta", false],
		["maghā", "magha", false],
	]) {
		if (isNominativeOf(form, stem) !== want)
			broken.push(`isNominativeOf(${form}, ${stem}) should be ${want}`);
	}
	const members = numberedMembers("{1 lis/2 khod/3 dwa/ … 8 zon}");
	if (members.get(1) !== "lis" || members.get(2) !== "khod" || members.get(8) !== "zon")
		broken.push(`numberedMembers read ${[...members]}`);
	if (!hasToken("{kha cig li dang khon}", "li") || hasToken("{lis}", "li"))
		broken.push("hasToken does not match whole tokens only");
	const cologne =
		"(H1) [Printed book page 1294 ,3] hasta m. the hand [ ID=1 ] (H1B) [Printed book page 1294 ,3] hastā f. the hand [ ID=2 ] the Nakṣatra Hasta [ ID=3 ]" +
		" (H1) [Printed book page 828 ,3] mṛga —śiras ( mṛga- ), n. N. of the 3rd Nakṣatra" +
		" (H1) [Printed book page 1097 ,1] 2. śravaṇa m. N. of the 20th Nakṣatra";
	const hastā = entriesHeadedBy(cologne, "hastā");
	if (hastā.length !== 1 || hastā[0].page !== 1294 || !NAKSATRA_SENSE.test(hastā[0].body))
		broken.push(`entriesHeadedBy(hastā) read ${JSON.stringify(hastā)}`);
	if (entriesHeadedBy(cologne, "mṛgaśiras")[0]?.page !== 828)
		broken.push("entriesHeadedBy did not remove Cologne's compound dash");
	if (entriesHeadedBy(cologne, "śravaṇa").length !== 1)
		broken.push("entriesHeadedBy did not remove a homonym number");
	if (entriesHeadedBy(cologne, "hast").length !== 0)
		broken.push("entriesHeadedBy matched a prefix of a headword");
	const several =
		"[Printed book page 178 ,3] uttara —proṣṭhapadā , uttara —phalgunī or uttara —phālgunī , f. N. of lunar mansions" +
		" [Printed book page 644 ,1] pūrvā ṣāḍhā f. the first of two constellations called Aṣāḍhā";
	if (entriesHeadedBy(several, "uttaraphalgunī")[0]?.page !== 178)
		broken.push("entriesHeadedBy missed a form in an entry that heads several");
	if (entriesHeadedBy(several, "pūrvāṣāḍhā")[0]?.page !== 644)
		broken.push("entriesHeadedBy missed a compound Cologne spaces across a sandhi");
	if (
		entriesHeadedBy(
			"[Printed book page 37 ,1] anu-rādhā [ AV. &c.] f. the seventeenth",
			"anurādhā",
		)[0]?.page !== 37
	)
		broken.push("entriesHeadedBy missed a headword followed by a bracketed citation");
	if (entriesHeadedBy(several, "uttara").length !== 0)
		broken.push("entriesHeadedBy matched a compound's first member as a headword");
	if (broken.length > 0) {
		console.error(
			`the checker itself is broken, so nothing below can be trusted:\n  - ${broken.join("\n  - ")}`,
		);
		process.exit(2);
	}
}

proveOwnPredicates();
proveDictionaryPredicates();

// ---------------------------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------------------------

async function fetchWithRetry(url, label) {
	for (let attempt = 0; attempt < 3; attempt++) {
		try {
			const response = await fetch(url, { headers: { "User-Agent": UA } });
			if (!response.ok) throw new Error(`${label} returned ${response.status}`);
			return await response.text();
		} catch (error) {
			if (attempt === 2) throw error;
			await sleep(1000 * (attempt + 1));
		}
	}
	throw new Error(`${label} exhausted its retries`);
}

const [mvyText, tshigText, dungText, dasText, jaeschkeText] = await Promise.all([
	fetchAggregate("21-Mahavyutpatti-Skt"),
	fetchAggregate("25-tshig-mdzod-chen-mo-Tib"),
	fetchAggregate("34-dung-dkar-tshig-mdzod-chen-mo-Tib"),
	fetchAggregate("65-ChandraDas_Scan"),
	fetchAggregate("66-Jaeschke_Scan"),
]);

const HEADWORDS = {
	"tshig mdzod chen mo": indexEntries(tshigText),
	"dung dkar tshig mdzod chen mo": indexEntries(dungText),
	"Das 1902": indexEntries(dasText),
	"Jäschke 1881": indexEntries(jaeschkeText),
};
const headwordIn = (wylie) => Object.keys(HEADWORDS).filter((name) => HEADWORDS[name].has(wylie));

/** Where the aggregate's index puts a headword, as a printed page, or null. Das's index is approximate. */
function indexedPage(dictionary, headword) {
	const raw = HEADWORDS[dictionary].get(headword)?.[0];
	if (raw === undefined) return null;
	const leaf = Number(raw.replace("?", ""));
	return dictionary === "Jäschke 1881" ? leaf - 26 : leaf;
}
function checkCitation(label, citation) {
	const page = indexedPage(citation.dictionary, citation.headword);
	if (page === null)
		fail(`${label}: "${citation.headword}" is no longer a headword in ${citation.dictionary}`);
	else if (Math.abs(page - citation.page) > 2)
		fail(
			`${label}: ${citation.dictionary} indexes "${citation.headword}" at p. ${page}, not p. ${citation.page}`,
		);
}

// ---------------------------------------------------------------------------------------------
// 2. The trigrams
// ---------------------------------------------------------------------------------------------

const texLines = readFileSync(source, "utf8").split("\n");
const t8End = texLines.findIndex((l) => l.includes("\\label{T8}"));
if (t8End === -1) throw new Error("label T8 not found — is this the right source file?");
const jansonTrigrams = [];
for (let i = t8End; i >= 0 && !texLines[i].includes("\\begin{table}"); i--) {
	const row = trigramRow(texLines[i]);
	if (row) jansonTrigrams.unshift(row);
}

/**
 * The trigrams as shipped: Janson's spellings and words (decided by Andreas on 2026-09-15), with the
 * evidence each English word rests on. Every page was read from its image; the run re-checks only that
 * the aggregate still indexes the headword there.
 *
 * - `printed` — Das p. 798, s.v. *spar-kha*, prints the word for the trigram itself.
 * - `chain` — Das p. 798 prints a different word for the trigram (`dasWord`) and the Tibetan it stands
 *   for (`element`), and both Jäschke and Das print Janson's word as a sense of that Tibetan.
 */
const TRIGRAMS = [
	{ number: 1, wylie: "li", english: "fire", tier: "printed" },
	{ number: 2, wylie: "khon", english: "earth", tier: "printed" },
	{ number: 3, wylie: "dwa", english: "iron", tier: "printed" },
	{ number: 4, wylie: "khen", english: "sky", tier: "printed" },
	{ number: 5, wylie: "kham", english: "water", tier: "printed" },
	{
		number: 6,
		wylie: "gin",
		english: "mountain",
		tier: "chain",
		dasWord: "hill",
		element: "ri",
		senses: [
			{ dictionary: "Jäschke 1881", page: 525, headword: "ri", sense: "1. mountain, hill" },
			{ dictionary: "Das 1902", page: 1172, headword: "ri", sense: "a mountain, a hill" },
		],
	},
	{
		number: 7,
		wylie: "zin",
		english: "wood",
		tier: "chain",
		dasWord: "tree",
		element: "shing",
		senses: [
			{ dictionary: "Jäschke 1881", page: 558, headword: "shing", sense: "1. tree … 2. wood" },
			{
				dictionary: "Das 1902",
				page: 1233,
				headword: "shing",
				sense: "1. a tree … 2. wood, timber",
			},
		],
	},
	{ number: 8, wylie: "zon", english: "wind", tier: "printed" },
];
const DAS_SPAR_KHA = { dictionary: "Das 1902", page: 798, headword: "spar kha" };
const JAESCHKE_SPAR_KHA = { dictionary: "Jäschke 1881", page: 330, headword: "spar kha" };

/** Where the *dung dkar*'s numbered enumeration spells a trigram differently. Recorded, not chosen. */
const DUNG_DKAR_VARIANTS = new Map([
	[1, "lis"],
	[2, "khod"],
	[4, "khyen"],
]);

if (jansonTrigrams.map((t) => t.number).join() !== "1,2,3,4,5,6,7,8")
	fail(`Janson's trigram table parsed as ${jansonTrigrams.map((t) => t.number)}, not 1-8`);
checkCitation("trigrams", DAS_SPAR_KHA);
checkCitation("trigrams", JAESCHKE_SPAR_KHA);

const tshigSparKha = HEADWORDS["tshig mdzod chen mo"].get("spar kha")?.join(" ") ?? "";
const dungMembers = numberedMembers(
	HEADWORDS["dung dkar tshig mdzod chen mo"].get("spar kha brgyad")?.join(" ") ?? "",
);
if (tshigSparKha === "") fail('the tshig mdzod chen mo no longer has an entry "spar kha"');
if (dungMembers.size !== 8)
	fail(`the dung dkar's spar kha brgyad enumeration read as ${dungMembers.size} members, not 8`);

const trigramTerms = [];
for (const trigram of TRIGRAMS) {
	const label = `trigram ${trigram.number}`;
	const janson = jansonTrigrams.find((t) => t.number === trigram.number);
	if (janson?.wylie !== trigram.wylie || janson?.english !== trigram.english)
		fail(
			`${label}: Janson's table now gives "${janson?.wylie}" / "${janson?.english}", not "${trigram.wylie}" / "${trigram.english}"`,
		);
	const spellingAttestedIn = [];
	if (hasToken(tshigSparKha, trigram.wylie)) spellingAttestedIn.push("tshig mdzod chen mo");
	else fail(`${label}: the tshig mdzod chen mo's spar kha entry does not print "${trigram.wylie}"`);
	const dung = dungMembers.get(trigram.number);
	const variant = DUNG_DKAR_VARIANTS.get(trigram.number);
	if (variant !== undefined) {
		if (dung !== variant)
			fail(
				`${label}: the dung dkar now spells it "${dung}", not the recorded variant "${variant}"`,
			);
	} else if (dung === trigram.wylie) {
		spellingAttestedIn.push("dung dkar tshig mdzod chen mo");
	} else {
		fail(
			`${label}: the dung dkar spells it "${dung}", an unrecorded variant of "${trigram.wylie}"`,
		);
	}
	for (const sense of trigram.senses ?? []) checkCitation(`${label} (${trigram.english})`, sense);
	trigramTerms.push({
		kind: "trigram",
		key: String(trigram.number),
		...trigram,
		spellingAttestedIn,
		variant: variant ?? null,
	});
}

// ---------------------------------------------------------------------------------------------
// 3–4. The lunar mansions
// ---------------------------------------------------------------------------------------------

const MVY_HEADING = "rgyu skar nyi shu rtsa brgyad kyi ming la";
const mvyLines = mvyText.split("\n").map((line) => line.split("|").map((c) => c.trim()));
const mvyStart = mvyLines.findIndex((cells) => cells[0] === MVY_HEADING);
/** The 28 nakṣatras in the Mahāvyutpatti's own order, Kṛttikā first — Sakaki's entries 3187–3214. */
const mvyNaksatras =
	mvyStart === -1
		? []
		: mvyLines
				.slice(mvyStart + 1, mvyStart + 29)
				.map(([tibetan, sanskrit]) => ({ tibetan, sanskrit }));
if (mvyNaksatras.length !== 28 || mvyNaksatras.some((n) => !n.sanskrit))
	fail("the Mahāvyutpatti's nakṣatra section no longer reads as 28 Tibetan–Sanskrit pairs");
const SAKAKI_FIRST_ENTRY = 3187;

/**
 * The 27 mansions in the engine's order, index 0–26. `mvy` is the 1-based position in the
 * Mahāvyutpatti's list, whose Tibetan must be `wylie`. `slp1` spells the shipped Sanskrit stem, from
 * which the Devanāgarī is transliterated; the IAST is re-derived from it and compared.
 *
 * `mwThrough` is for a form Monier-Williams prints only inside another headword's entry: that entry
 * must name a nakṣatra and print `expects`.
 */
const MANSIONS = [
	{ index: 0, wylie: "tha skar", slp1: "aSvinI", mvy: 27 },
	{ index: 1, wylie: "bra nye", slp1: "BaraRI", mvy: 28 },
	{ index: 2, wylie: "smin drug", slp1: "kfttikA", mvy: 1 },
	{ index: 3, wylie: "snar ma", slp1: "rohiRI", mvy: 2 },
	{ index: 4, wylie: "mgo", slp1: "mfgaSiras", mvy: 3 },
	{ index: 5, wylie: "lag", slp1: "ArdrA", mvy: 4 },
	{ index: 6, wylie: "nabs so", slp1: "punarvasu", mvy: 5 },
	{ index: 7, wylie: "rgyal", slp1: "puzya", mvy: 6 },
	{ index: 8, wylie: "skag", slp1: "aSlezA", mvy: 7 },
	{ index: 9, wylie: "mchu", slp1: "maGA", mvy: 8 },
	{ index: 10, wylie: "gre", slp1: "pUrvaPalgunI", mvy: 9 },
	{ index: 11, wylie: "dbo", slp1: "uttaraPalgunI", mvy: 10 },
	{ index: 12, wylie: "me bzhi", slp1: "hastA", mvy: 11 },
	{ index: 13, wylie: "nag pa", slp1: "citrA", mvy: 12 },
	{
		index: 14,
		wylie: "sa ri",
		slp1: "svAtI",
		mvy: 13,
		mwThrough: { slp1: "svAti", expects: "also svātī" },
	},
	{ index: 15, wylie: "sa ga", slp1: "viSAKA", mvy: 14 },
	{ index: 16, wylie: "lha mtshams", slp1: "anurADA", mvy: 15 },
	{ index: 17, wylie: "snron", slp1: "jyezWA", mvy: 16 },
	{ index: 18, wylie: "snrubs", slp1: "mUla", mvy: 17 },
	{ index: 19, wylie: "chu stod", slp1: "pUrvAzAQA", mvy: 18 },
	{ index: 20, wylie: "chu smad", slp1: "uttarAzAQA", mvy: 19 },
	{ index: 21, wylie: "gro bzhin", slp1: "SravaRA", mvy: 20 },
	{ index: 22, wylie: "mon gre", slp1: "DanizWA", mvy: 22 },
	{ index: 23, wylie: "mon gru", slp1: "SataBizA", mvy: 23 },
	{
		index: 24,
		wylie: "khrums stod",
		slp1: "pUrvaBadrapadA",
		mvy: 24,
		// Monier-Williams heads pūrva-bhadra-pada "(and f. ā)" as "= -bhādrap˚", and names the nakṣatra
		// only at the entry it points to — his own cross-reference, followed and re-checked.
		mwThrough: {
			slp1: "pUrvaBadrapada",
			expects: "f( ā )",
			// Matched after the dash normalisation, which turns "= -bhādrap ˚" into "=bhādrap ˚".
			pointer: { text: "=bhādrap", slp1: "pUrvaBAdrapada" },
		},
	},
	{ index: 25, wylie: "khrums smad", slp1: "uttaraBadrapadA", mvy: 25 },
	{ index: 26, wylie: "nam gru", slp1: "revatI", mvy: 26 },
];

/**
 * The one pairing decision. The Mahāvyutpatti pairs *mon gre* with Śatabhiṣā and *mon gru* with
 * Dhaniṣṭhā; Das pairs them the other way (p. 976), as Indian order and Henning do. Decided by Andreas
 * on 2026-09-15, following Das. It self-invalidates: the run fails if the Mahāvyutpatti stops
 * diverging, or if Das's two entries are no longer indexed where they were read.
 */
const PAIRING_DECISIONS = [
	{
		index: 22,
		mvySanskrit: "śatabhiṣā",
		das: { dictionary: "Das 1902", page: 976, headword: "mon dre", devanagari: "धनिष्ठा" },
	},
	{
		index: 23,
		mvySanskrit: "dhaniṣṭhā",
		das: { dictionary: "Das 1902", page: 976, headword: "mon gru", devanagari: "शतभिषा" },
	},
];

const mansionTerms = [];
for (const mansion of MANSIONS) {
	const label = `mansion ${mansion.index}`;
	const devanagari = slp1ToDevanagari(mansion.slp1);
	const iast = devanagariToIast(devanagari);
	const entry = mvyNaksatras[mansion.mvy - 1];
	if (entry?.tibetan !== mansion.wylie)
		fail(
			`${label}: the Mahāvyutpatti's nakṣatra ${mansion.mvy} is "${entry?.tibetan}", not "${mansion.wylie}"`,
		);
	const form = entry ? mvyForm(entry.sanskrit) : null;
	const pairing = PAIRING_DECISIONS.find((p) => p.index === mansion.index);
	let pairingFollows = "Mahāvyutpatti";
	if (pairing) {
		pairingFollows = "Das 1902";
		checkCitation(label, pairing.das);
		if (form !== pairing.mvySanskrit)
			fail(
				`${label}: the Mahāvyutpatti now pairs "${mansion.wylie}" with "${form}", not "${pairing.mvySanskrit}" — the decision to follow Das may no longer be needed`,
			);
		if (!mvyNaksatras.some((n) => isNominativeOf(mvyForm(n.sanskrit), iast)))
			fail(`${label}: "${iast}" is not a Mahāvyutpatti nakṣatra form at any position`);
	} else if (form === null || !isNominativeOf(form, iast)) {
		fail(`${label}: "${iast}" is not the stem of the Mahāvyutpatti's "${entry?.sanskrit}"`);
	}
	mansionTerms.push({
		kind: "mansion",
		key: String(mansion.index),
		...mansion,
		iast,
		devanagari,
		mahavyutpatti: entry ? `${entry.tibetan}|${entry.sanskrit}` : null,
		sakakiEntry: SAKAKI_FIRST_ENTRY + mansion.mvy - 1,
		pairingFollows,
		attestedIn: headwordIn(mansion.wylie),
	});
}
if (mvyNaksatras.length === 28 && mvyNaksatras[20]?.tibetan !== "byi bzhin")
	fail("the Mahāvyutpatti's 21st nakṣatra is no longer byi bzhin, which the list of 27 omits");

// ---------------------------------------------------------------------------------------------
// 1. Script, by two converters that must agree, and a round trip
// ---------------------------------------------------------------------------------------------

const DISCOURAGED = ["ཱི", "ཷ", "ཹ", "ཱྀ"];
const tibetanTerms = [...trigramTerms, ...mansionTerms];
for (const term of tibetanTerms) {
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
	if (DISCOURAGED.some((c) => first.includes(c)))
		fail(`${term.kind} ${term.key}: ${first} contains a discouraged composite vowel sign`);
	term.tibetan = first;
}

// ---------------------------------------------------------------------------------------------
// Monier-Williams, via Cologne
// ---------------------------------------------------------------------------------------------

const stripHtml = (html) =>
	html
		.replace(/<[^>]+>/g, " ")
		.replace(/&nbsp;/g, " ")
		.replace(/&#\d+;/g, "")
		.replace(/\s{2,}/g, " ")
		.trim();

async function cologne(slp1) {
	const html = await fetchWithRetry(
		`https://www.sanskrit-lexicon.uni-koeln.de/scans/MWScan/2020/web/webtc/getword.php?key=${encodeURIComponent(slp1)}&filter=roman`,
		"Cologne",
	);
	await sleep(150);
	return /not found:/.test(html) ? "" : stripHtml(html);
}

for (const term of mansionTerms) {
	const label = `mansion ${term.index}`;
	try {
		if (term.mwThrough) {
			const { pointer } = term.mwThrough;
			const through = devanagariToIast(slp1ToDevanagari(term.mwThrough.slp1));
			const entries = entriesHeadedBy(await cologne(term.mwThrough.slp1), through).filter(
				(e) =>
					e.body.includes(term.mwThrough.expects) &&
					(pointer ? e.body.includes(pointer.text) : NAKSATRA_SENSE.test(e.body)),
			);
			if (entries.length === 0)
				fail(
					`${label}: Monier-Williams no longer prints "${term.mwThrough.expects}" in ${pointer ? `an entry for ${through} pointing "${pointer.text}"` : `a nakṣatra entry for ${through}`}`,
				);
			if (pointer) {
				const target = devanagariToIast(slp1ToDevanagari(pointer.slp1));
				const named = entriesHeadedBy(await cologne(pointer.slp1), target).filter((e) =>
					NAKSATRA_SENSE.test(e.body),
				);
				if (named.length === 0)
					fail(`${label}: ${through} points to ${target}, which no longer names a nakṣatra`);
			}
			if (entriesHeadedBy(await cologne(term.slp1), term.iast).length > 0)
				fail(`${label}: Monier-Williams now heads "${term.iast}" itself — drop the mwThrough`);
			term.mwPage = entries[0]?.page ?? null;
			term.mwThroughIast = through;
		} else {
			const entries = entriesHeadedBy(await cologne(term.slp1), term.iast);
			const naksatra = entries.filter((e) => NAKSATRA_SENSE.test(e.body));
			if (entries.length === 0) fail(`${label}: "${term.iast}" is not a Monier-Williams headword`);
			else if (naksatra.length === 0)
				fail(
					`${label}: Monier-Williams heads "${term.iast}" (p. ${entries[0].page}) but names no nakṣatra under it`,
				);
			term.mwPage = naksatra[0]?.page ?? null;
			term.mwThroughIast = null;
		}
	} catch (error) {
		fail(`${label}: Cologne lookup failed — ${error.message}`);
	}
}

// ---------------------------------------------------------------------------------------------
// Phonetics, from THL's converter
// ---------------------------------------------------------------------------------------------

async function phoneticFor(wylie) {
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
	const areas = [...(await response.text()).matchAll(/<textarea[^>]*>([\s\S]*?)<\/textarea>/g)].map(
		(m) => m[1].trim(),
	);
	return areas[1];
}

for (const term of tibetanTerms.filter((t) => t.tibetan)) {
	try {
		term.phonetic = await phoneticFor(term.wylie);
		await sleep(150);
	} catch (error) {
		fail(`${term.kind} ${term.key}: THL lookup for "${term.wylie}" failed — ${error.message}`);
	}
	if (!term.phonetic)
		fail(`${term.kind} ${term.key}: THL returned no phonetics for "${term.wylie}"`);
}

// ---------------------------------------------------------------------------------------------
// Report, then emit only if everything held
// ---------------------------------------------------------------------------------------------

proveIndicPredicates(mansionTerms.map((t) => t.devanagari));

for (const term of tibetanTerms) {
	console.log(
		`  ${term.kind.padEnd(8)} ${term.key.padEnd(3)} ${term.wylie.padEnd(12)} ${(term.tibetan ?? "—").padEnd(12)} ${(term.phonetic ?? "—").padEnd(12)} ${term.iast ?? term.english} ${term.mwPage ?? ""}`,
	);
}

if (problems.length > 0) {
	console.error(`\n${problems.length} problem(s); nothing written:\n`);
	for (const problem of problems) console.error(`  - ${problem}`);
	process.exit(1);
}

const q = (s) => JSON.stringify(s);
const name = (t) => `tibetan: ${q(t.tibetan)}, wylie: ${q(t.wylie)}, phonetic: ${q(t.phonetic)}`;
const cite = (c) => `{ dictionary: ${q(c.dictionary)}, page: ${c.page} }`;

writeFileSync(
	join(root, "test", "fixtures", "mansion-names.ts"),
	`/**
 * The 27 lunar-mansion names, verified against independent dictionaries.
 *
 * @remarks
 * GENERATED by \`scripts/verify-mansion-and-trigram-names.mjs\`. Do not edit by hand — re-run the script.
 * The evidence and the decisions behind every row are in \`docs/names/mansion-and-trigram-sourcing.md\`.
 *
 * Every row passed: two EWTS implementations agreeing on the script, a round trip back to the same
 * Wylie, no discouraged vowel sign, and THL phonetics; the Tibetan is the Mahāvyutpatti's at
 * \`mahavyutpatti\` (Sakaki's entry \`sakakiEntry\`); and the Sanskrit is that entry's form reduced to its
 * stem, a Monier-Williams headword naming a nakṣatra on \`monierWilliamsPage\` — or printed inside
 * \`monierWilliamsThrough\`'s entry there.
 *
 * Only the pairing departs from the Mahāvyutpatti: \`pairingFollows: "Das 1902"\` marks the two rows
 * where it follows Das, carried as self-invalidating data.
 */

export const MANSION_NAMES: readonly {
	index: number;
	tibetan: string;
	wylie: string;
	phonetic: string;
	iast: string;
	devanagari: string;
	monierWilliamsPage: number;
	monierWilliamsThrough: string | null;
	mahavyutpatti: string;
	sakakiEntry: number;
	pairingFollows: "Mahāvyutpatti" | "Das 1902";
	attestedIn: readonly string[];
}[] = [
${mansionTerms.map((t) => `\t{ index: ${t.index}, ${name(t)}, iast: ${q(t.iast)}, devanagari: ${q(t.devanagari)}, monierWilliamsPage: ${t.mwPage}, monierWilliamsThrough: ${q(t.mwThroughIast)}, mahavyutpatti: ${q(t.mahavyutpatti)}, sakakiEntry: ${t.sakakiEntry}, pairingFollows: ${q(t.pairingFollows)}, attestedIn: [${t.attestedIn.map(q).join(", ")}] },`).join("\n")}
];
`,
);

writeFileSync(
	join(root, "test", "fixtures", "trigram-names.ts"),
	`/**
 * The eight trigram names, verified against independent dictionaries.
 *
 * @remarks
 * GENERATED by \`scripts/verify-mansion-and-trigram-names.mjs\`. Do not edit by hand — re-run the script.
 * The evidence and the decisions behind every row are in \`docs/names/mansion-and-trigram-sourcing.md\`.
 *
 * \`number\` and \`wylie\` are Janson's, and \`englishName\` is his word, decided by Andreas on 2026-09-15.
 * Every Tibetan row passed the script and phonetic checks, and the *tshig mdzod chen mo*'s *spar kha*
 * entry prints the spelling (\`spellingAttestedIn\`); \`variant\` is the *dung dkar*'s different spelling,
 * recorded and not chosen.
 *
 * \`englishTier\` says how the English is sourced. \`printed\`: Das p. 798 prints it for the trigram.
 * \`chain\`: Das p. 798 prints \`dasWord\` for the trigram and \`element\` as its Tibetan, and each of
 * \`senses\` prints \`englishName\` as a sense of \`element\`.
 */

export const TRIGRAM_NAMES: readonly {
	number: number;
	englishName: string;
	tibetan: string;
	wylie: string;
	phonetic: string;
	englishTier: "printed" | "chain";
	dasWord: string | null;
	element: string | null;
	senses: readonly { dictionary: string; page: number }[];
	spellingAttestedIn: readonly string[];
	variant: string | null;
}[] = [
${trigramTerms.map((t) => `\t{ number: ${t.number}, englishName: ${q(t.english)}, ${name(t)}, englishTier: ${q(t.tier)}, dasWord: ${q(t.dasWord ?? null)}, element: ${q(t.element ?? null)}, senses: [${(t.senses ?? []).map(cite).join(", ")}], spellingAttestedIn: [${t.spellingAttestedIn.map(q).join(", ")}], variant: ${q(t.variant)} },`).join("\n")}
];
`,
);

console.log(
	`\nall ${trigramTerms.length} trigram and ${mansionTerms.length} mansion names passed; ` +
		"wrote test/fixtures/mansion-names.ts and test/fixtures/trigram-names.ts",
);
