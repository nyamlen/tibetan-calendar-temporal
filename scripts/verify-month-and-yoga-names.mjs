#!/usr/bin/env node
/**
 * Verifies the lunar-mansion month names, the season names and the ten elemental-yoga names against
 * independent dictionaries, and refuses to write anything if any check fails.
 *
 * Usage — from a scratch directory **outside** this repository:
 *   npm init -y && npm install jsewts tibetan-ewts-converter
 *   node /path/to/repo/scripts/verify-month-and-yoga-names.mjs /path/to/tibet.tex
 *
 * Obtain the paper's source exactly as `verify-name-sources.mjs` describes; keep it outside the
 * repository.
 *
 * ## Why this is not `verify-name-sources.mjs` with more terms
 *
 * That script proves a term exists by finding an English Wiktionary entry at exactly its title. For
 * these terms the check fails both ways: nine of the twelve mansion month names and every
 * season-month compound have no entry, and the three that do are homographs — `mchu` "lip", `mgo`
 * "head", `rgyal` "victory". So existence is gated by dictionaries instead, read for the pairing
 * that says *which* sense is meant. The evidence and every decision this encodes are in
 * `docs/names/month-and-yoga-sourcing.md`, which was written before this script so that the script
 * could be built from a record rather than from memory.
 *
 * ## What is taken from which source
 *
 * | Source | Standing | Read for |
 * |---|---|---|
 * | Janson's month-names table (LaTeX) | The derivation source | The twelve mansion month names, and each month's Sanskrit name — to number the Mahāvyutpatti's months, and as a witness to the Indian month names, one with Henning |
 * | Vimalaprabhā, ed. Upadhyaya (Sarnath 1986), Part I | Read by eye from page images: **carried as data** | That month 5 is ज्येष्ठ — the one exception to the Indian-month rule |
 * | Mahāvyutpatti (aggregate `21-Mahavyutpatti-Skt`) | Public domain, independent of Janson and Henning | Tibetan–Sanskrit pairs: the nakṣatras, the six seasons, the season-months |
 * | Das and Jäschke scan indexes (`65-`, `66-`) | Public domain | That a headword exists — the index number is **not** a printed page: Jäschke's is the scan leaf, 26 above the printed page, and Das's is approximate |
 * | *tshig mdzod chen mo*, *dung dkar tshig mdzod chen mo* (`25-`, `34-`) | Copyrighted: **gate only** | That a headword exists; the spelling of each member of a set an entry enumerates; from the *tshig mdzod chen mo* alone, the element pair it assigns each member and the grouping it states |
 * | Monier-Williams, via Cologne | Public domain | That a Sanskrit headword exists, and its printed page; for each Indian month, the entry that defines it |
 * | Henning, *Kālacakra and the Tibetan Calendar*, p. 204 | In copyright: facts only | The ten yogas' Wylie and IAST, confirmed against the scan by Andreas — carried as data below |
 *
 * From the two copyrighted dictionaries **no gloss text is read into any output**: only whether a
 * headword exists, how an enumerated member is spelled, which element pair the enumeration gives it,
 * and the grouping its closing sentence states — the fifth, sixth and seventh takeable facts in
 * `scripts/tibetan-dictionary.mjs`. The grouping names each group's size, never its members, so
 * which yoga is in which group is **read by list order** and marked as such everywhere it is emitted.
 *
 * ## Checks, and why each exists
 *
 * 1. **Script** from two EWTS implementations that must agree, a round trip back to the same Wylie,
 *    and no discouraged vowel sign — the checks `verify-name-sources.mjs` established.
 * 2. **Mansion month names**: each is the Mahāvyutpatti's Tibetan for the nakṣatra the sourcing
 *    record names, except `khrums`, which is the shared stem of two — so both must exist.
 * 3. **Season-month compounds**: the Mahāvyutpatti's twelve season-month entries, numbered through
 *    their Sanskrit month against Janson's table, give every (season, part) exactly once. That list
 *    is emitted as the pin for the original Kālacakra system, because nothing in Janson's table
 *    carries that system.
 * 3b. **Indian month names**: each is the headword of the Monier-Williams entry that defines the
 *    month, and the words judged defining must still be printed in an entry it heads — every entry
 *    Cologne returns is read, not the first. Janson's table and the Mahāvyutpatti must agree with it
 *    except where a divergence states the exact form they print. Month 5 is a stated exception whose
 *    pointer, and the definition it departs from, are both re-checked.
 * 4. **Six seasons**: each Tibetan name is paired with its Sanskrit in the Mahāvyutpatti, and the
 *    Sanskrit stem heads a Monier-Williams entry that still prints the season's recorded sense —
 *    every entry Cologne returns is read, as for the Indian months.
 * 5. **Yogas**: each name is spelled as the *tshig mdzod chen mo*'s enumeration spells it, and each
 *    Sanskrit name is a Monier-Williams headword — except *pragati*, whose absence is asserted, and
 *    which no rung of the lookup ladder reaches. Where Monier-Williams prints the yoga's English, the
 *    page cited is that entry's. The same enumeration's element pair must equal Henning's for every yoga, and its closing grouping
 *    must still name the four groups with counts summing to ten; each group's English is re-checked
 *    against its dictionary index, or through Monier-Williams, or — when composed — against every
 *    dictionary coming to head the compound.
 * 6. **Phonetics** from THL's own converter.
 *
 * Every choice between attested spellings, and every correction, is **data carrying its evidence and
 * re-checked on every run**, so one that stops being needed fails loudly rather than silently
 * patching a source that has since changed.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { entriesHeadedBy, provePredicates as proveColognePredicates } from "./cologne.mjs";
import {
	devanagariToIast,
	devanagariToSlp1,
	lookupCandidates,
	proveIndicPredicates,
	slp1ToDevanagari,
} from "./indic.ts";
import {
	fetchAggregate,
	indexEntries,
	provePredicates as proveDictionaryPredicates,
} from "./tibetan-dictionary.mjs";

const source = process.argv[2];
if (!source) {
	console.error("usage: node scripts/verify-month-and-yoga-names.mjs <path-to-tibet.tex>");
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

/** Janson's TeX accents to IAST. Only the forms his month-names table uses. */
function texToIast(tex) {
	return tex
		.replace(/\\tibxx?\{([^}]*)\}/g, "$1")
		.replace(/\{\\d\s*([a-zA-Z])\}/g, "\\d{$1}")
		.replace(/\\d\{([sStTdDnNrRhHmM])\}/g, (_, c) => `${c}̣`)
		.replace(/\\'([sS])/g, (_, c) => `${c}́`)
		.replace(/\\=([aAiIuU])/g, (_, c) => `${c}̄`)
		.replace(/[{}]/g, "")
		.normalize("NFC")
		.trim();
}

/** A Mahāvyutpatti Sanskrit cell, without its visarga, with any parenthesised alternative. */
function mvyForms(cell) {
	const strip = (s) => s.trim().replace(/[ḥh]$/, "").toLowerCase();
	const alternative = /\(([^)]+)\)/.exec(cell)?.[1];
	return [strip(cell.replace(/\([^)]*\)/, "")), ...(alternative ? [strip(alternative)] : [])];
}

/**
 * Whether the Mahāvyutpatti's nominative is this stem's nominative. Three shapes, each a rule of
 * Sanskrit: an a-stem takes -ḥ, an ā-stem is its own nominative, and a final -d is -t in pausa.
 */
function isNominativeOf(nominative, stem) {
	return (
		nominative === `${stem}ḥ` ||
		nominative === stem ||
		(stem.endsWith("d") && nominative === `${stem.slice(0, -1)}t`)
	);
}

/** The names a Tibetan–Tibetan enumeration lists, each ending in `sbyor`. Spelling only. */
function enumeratedNames(body, joiner) {
	return body
		.replace(/[{}]/g, "")
		.split("/")
		.map((item) => item.trim())
		.map((item) => new RegExp(`${joiner}\\s+(.+?)\\s+sbyor(?:\\s|$)`).exec(item)?.[1])
		.filter(Boolean);
}

const ELEMENT_WORD = { sa: "earth", chu: "water", me: "fire", rlung: "wind" };

/**
 * Each member of an enumeration with the element pair it states: `sa rlung` is earth and wind, and
 * `sa gnyis` — "earth, two" — is earth twice. An element word outside the four reads as `undefined`,
 * which the caller refuses, rather than being skipped.
 */
function enumeratedPairs(body, joiner) {
	return body
		.replace(/[{}]/g, "")
		.split("/")
		.map((item) => item.trim())
		.map((item) => new RegExp(`^(\\S+) (\\S+) ${joiner}\\s+(.+?)\\s+sbyor(?:\\s|$)`).exec(item))
		.filter(Boolean)
		.map(([, first, second, name]) => ({
			name,
			elements: [
				ELEMENT_WORD[first],
				second === "gnyis" ? ELEMENT_WORD[first] : ELEMENT_WORD[second],
			],
		}));
}

const COUNT_WORD = { gcig: 1, gnyis: 2, gsum: 3, bzhi: 4 };

/**
 * The grouping an enumeration closes with — `bzang po gsum dang/ gso thub gsum/ … dang bcu zhes
 * grags` — as `{ wylie, count }` in the order stated, plus the total it names. Null when the sentence
 * is absent; a group it cannot read comes back as `null` in place, so a changed shape is refused
 * rather than silently shortening the list.
 */
function statedGrouping(body) {
	const m = /rnams la (.+?) dang (bcu) zhes grags/.exec(body.replace(/[{}]/g, ""));
	if (!m) return null;
	const groups = m[1]
		.split("/")
		.map((part) => part.trim().replace(/ dang$/, ""))
		.map((part) => /^(.+) (gcig|gnyis|gsum|bzhi)$/.exec(part))
		.map((g) => (g ? { wylie: g[1], count: COUNT_WORD[g[2]] } : null));
	return { groups, total: { bcu: 10 }[m[2]] };
}

/** Does an enumeration's spelling print this name — whole, as a compound, or with a genitive? */
function enumerationPrints(names, wylie) {
	const compound = wylie.replace(/ (?:pa|ba)$/, "");
	return names.some((n) => n === wylie || n === compound || n === `${wylie}'i`);
}

/**
 * The entries whose text prints `words`. `entriesHeadedBy` strips Cologne's compound dashes from an
 * entry body, so both sides are compared with dashes and all spacing removed.
 */
function prints(entries, words) {
	const bare = (s) => s.replace(/[\s—–-]/g, "");
	return entries.filter((e) => bare(e.body).includes(bare(words)));
}

/**
 * A month sense, in English or as Monier-Williams' own `scil. māsa` — the word *māsa* alone. `\b`
 * cannot bound it: a diacritic letter is a non-word character to `\b`, so it finds a boundary inside
 * *ṣaṇmāsa* and reads the compound as the word.
 */
const MONTH_SENSE = /\bmonths?\b|(?<!\p{L})māsa(?!\p{L})/iu;

function proveOwnPredicates() {
	const broken = [];
	const mw = entriesHeadedBy(
		"[Printed book page 812 ,3] mārga —śīrṣa m. (also with māsa ) N. of the month in which the full moon enters the const˚ Mṛga-śiras , the 10th" +
			" [Printed book page 426 ,3] jyeṣṭha mfn. most excellent … for jyaiṣṭha , VarBṛS.",
		"mārgaśīrṣa",
	);
	if (
		prints(mw, "N. of the month in which the full moon enters the const˚ Mṛga-śiras").length !== 1
	)
		broken.push("prints missed recorded words across Cologne's dash and spacing");
	if (
		prints(mw, "N. of the month in which the full moon enters the const˚ Mṛga-śira,").length !== 0
	)
		broken.push("prints matched words the entry does not print");
	const siddhi = entriesHeadedBy(
		"[Printed book page 1215 ,1] 1. siddhi f. driving off [ ID=1 ]" +
			" [Printed book page 1216 ,2] 2. siddhi f. accomplishment, performance [ ID=2 ]" +
			" [Printed book page 1217 ,1] siddhi —kara mfn. causing success [ ID=3 ]",
		"siddhi",
	);
	if (pageOfWord(siddhi, "accomplishment") !== 1216)
		broken.push("pageOfWord did not read past a homograph to the entry printing the word");
	if (pageOfWord(siddhi, "success") !== null)
		broken.push("pageOfWord read a word from an entry the name does not head");
	if (pageOfWord(siddhi, "perform") !== null) broken.push("pageOfWord matched part of a word");
	for (const [sense, want] of [
		["N. of a month in the rainy season", true],
		["one of the 12 months constituting", true],
		["for jyaiṣṭha , VarBṛS.", false],
		["the 16th lunar mansion", false],
		["( scil. māsa ) the month", true],
		["m. ( scil. māsa )", true],
		["a compound, samāsa", false],
		["a compound, ṣaṇmāsa", false],
		["the day of full moon, paurṇa-māsī", false],
	]) {
		if (MONTH_SENSE.test(sense) !== want) broken.push(`MONTH_SENSE read "${sense}" wrongly`);
	}
	for (const [tex, want] of [
		["M\\=agha", "Māgha"],
		["Jye{\\d s}{\\d t}ha", "Jyeṣṭha"],
		["\\=A\\d{s}\\=a\\d{d}ha", "Āṣāḍha"],
		["\\'Sr\\=ava\\d{n}a", "Śrāvaṇa"],
		["M\\=arga\\'s\\=ir\\d{s}a", "Mārgaśīrṣa"],
		["\\tibxx{nag pa}", "nag pa"],
	]) {
		if (texToIast(tex) !== want)
			broken.push(`texToIast(${tex}) gave ${texToIast(tex)}, not ${want}`);
	}
	const forms = mvyForms("mṛgaśīrṣaḥ (mārgaśīrṣaḥ)");
	if (forms[0] !== "mṛgaśīrṣa" || forms[1] !== "mārgaśīrṣa")
		broken.push(`mvyForms split the alternative wrongly: ${forms}`);
	if (mvyForms("puṣyah")[0] !== "puṣya") broken.push("mvyForms kept a Latin-h visarga");
	for (const [nom, stem, want] of [
		["vasantaḥ", "vasanta", true],
		["varṣā", "varṣā", true],
		["śarat", "śarad", true],
		["hemantaḥ", "śiśira", false],
	]) {
		if (isNominativeOf(nom, stem) !== want) broken.push(`isNominativeOf(${nom}, ${stem}) is wrong`);
	}
	const names = enumeratedNames(
		"{sa gnyis 'phrad pa dngos grub sbyor/ sa me 'phrad pa bsreg sbyor/ me chu 'phrad pa 'chi sbyor rnams la}",
		"'phrad pa",
	);
	if (names.join("|") !== "dngos grub|bsreg|'chi") broken.push(`enumeratedNames read ${names}`);
	if (!enumerationPrints(["bsreg"], "bsreg pa")) broken.push("a compound form was not recognised");
	if (!enumerationPrints(["bsreg pa'i"], "bsreg pa"))
		broken.push("a genitive form was not recognised");
	if (enumerationPrints(["bsreg"], "sreg pa")) broken.push("a prefix difference was accepted");
	const pairs = enumeratedPairs(
		"{gza' dang rgyu skar rnams kyi sbyor ba ste/ sa gnyis 'phrad pa dngos grub sbyor/ sa rlung 'phrad pa mi 'phrod sbyor/ me chu 'phrad pa 'chi sbyor rnams la}",
		"'phrad pa",
	);
	if (
		pairs.map((p) => `${p.name}=${p.elements.join("+")}`).join("|") !==
		"dngos grub=earth+earth|mi 'phrod=earth+wind|'chi=fire+water"
	)
		broken.push(`enumeratedPairs read ${JSON.stringify(pairs)}`);
	if (enumeratedPairs("{shing me 'phrad pa x sbyor/}", "'phrad pa")[0]?.elements[0] !== undefined)
		broken.push("enumeratedPairs accepted an element outside the Indian four");
	const grouping = statedGrouping(
		"{… 'chi sbyor rnams la bzang po gsum dang/ gso thub gsum/ ngan gsum/ tha chad gcig dang bcu zhes grags/}",
	);
	if (
		grouping?.total !== 10 ||
		grouping.groups.map((g) => `${g?.wylie}:${g?.count}`).join("|") !==
			"bzang po:3|gso thub:3|ngan:3|tha chad:1"
	)
		broken.push(`statedGrouping read ${JSON.stringify(grouping)}`);
	if (
		!statedGrouping(
			"{rnams la bzang po gsum dang/ ngan ma lags dang bcu zhes grags/}",
		)?.groups.includes(null)
	)
		broken.push("statedGrouping read a group with no count instead of refusing it");
	if (statedGrouping("{rnams la bzang po gsum dang/ ngan bdun}") !== null)
		broken.push("statedGrouping read a grouping with no closing total");
	if (broken.length > 0) {
		console.error(
			`the checker itself is broken, so nothing below can be trusted:\n  - ${broken.join("\n  - ")}`,
		);
		process.exit(2);
	}
}

proveOwnPredicates();
proveDictionaryPredicates();
proveColognePredicates();

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

/** The Mahāvyutpatti as ordered pairs; a Tibetan headword can repeat with different Sanskrit. */
const mvy = mvyText
	.split("\n")
	.map((line) => line.split("|"))
	.filter((cells) => cells.length === 2)
	.map(([tibetan, sanskrit]) => ({ tibetan: tibetan.trim(), sanskrit: sanskrit.trim() }));
const mvyPairs = (tibetan) => mvy.filter((e) => e.tibetan === tibetan);

const HEADWORDS = {
	"tshig mdzod chen mo": indexEntries(tshigText),
	"dung dkar tshig mdzod chen mo": indexEntries(dungText),
	"Das 1902": indexEntries(dasText),
	"Jäschke 1881": indexEntries(jaeschkeText),
};
const headwordIn = (wylie) => Object.keys(HEADWORDS).filter((name) => HEADWORDS[name].has(wylie));

// Janson's month-names table, by label. The last row carries no terminator, so rows are taken by
// their leading month number rather than by `\\`.
const texLines = readFileSync(source, "utf8").split("\n");
const tmonthsEnd = texLines.findIndex((l) => l.includes("\\label{Tmonths}"));
if (tmonthsEnd === -1) throw new Error("label Tmonths not found — is this the right source file?");
const jansonMonths = [];
for (let i = tmonthsEnd; i >= 0 && !texLines[i].includes("\\begin{table}"); i--) {
	const cells = texLines[i].replace(/\\\\.*$/, "").split("&");
	if (cells.length !== 6 || !/^\s*\d+\s*$/.test(cells[0])) continue;
	jansonMonths.unshift({
		month: Number(cells[0]),
		wylie: texToIast(cells[1]),
		sanskrit: texToIast(cells[2]).toLowerCase(),
	});
}
if (jansonMonths.map((m) => m.month).join() !== "1,2,3,4,5,6,7,8,9,10,11,12") {
	throw new Error(`Tmonths parsed as months ${jansonMonths.map((m) => m.month)}, not 1-12`);
}

// ---------------------------------------------------------------------------------------------
// 2. The lunar-mansion month names
// ---------------------------------------------------------------------------------------------

/**
 * The nakṣatra each month name is, per the sourcing record's reading of the Mahāvyutpatti list.
 * `khrums` is not a nakṣatra name as it stands: the list has `khrums stod` and `khrums smad`, and
 * the month's name is their shared stem.
 */
const NAKSATRA = {
	mchu: "maghā",
	dbo: "uttaraphalgunī",
	"nag pa": "citrā",
	"sa ga": "viśākhā",
	snron: "jyeṣṭhā",
	"chu stod": "pūrvāṣāḍhā",
	"gro bzhin": "śravaṇā",
	khrums: { stem: ["khrums stod", "khrums smad"] },
	"tha skar": "aśvinī",
	"smin drug": "kṛttikā",
	mgo: "mṛgaśirā",
	rgyal: "puṣya",
};

const mansionTerms = [];
for (const { month, wylie } of jansonMonths) {
	const expected = NAKSATRA[wylie];
	if (expected === undefined) {
		fail(`month ${month}: Janson's "${wylie}" is not in the sourcing record's nakṣatra reading`);
		continue;
	}
	if (typeof expected === "string") {
		const paired = mvyPairs(wylie).some((e) => mvyForms(e.sanskrit).includes(expected));
		if (!paired)
			fail(`month ${month}: the Mahāvyutpatti does not pair "${wylie}" with ${expected}`);
	} else {
		for (const member of expected.stem) {
			if (mvyPairs(member).length === 0)
				fail(
					`month ${month}: "${wylie}" is the stem of "${member}", which the Mahāvyutpatti lacks`,
				);
		}
		if (mvyPairs(wylie).length > 0) {
			fail(
				`month ${month}: the Mahāvyutpatti now has "${wylie}" as a headword of its own — ` +
					"re-check whether it is still only a stem",
			);
		}
	}
	mansionTerms.push({ kind: "mansion", key: String(month), month, wylie });
}

// ---------------------------------------------------------------------------------------------
// 3. The season-month compounds, and the original Kālacakra identification
// ---------------------------------------------------------------------------------------------

const SEASON_OF = { dpyid: "spring", dbyar: "summer", ston: "autumn", dgun: "winter" };
const PART_OF = {
	"ra ba": "early",
	"'bring po": "middle",
	"tha chung": "late",
	"tha chungs": "late",
};
const PART_WYLIE = { early: "ra ba", middle: "'bring po", late: "tha chung" };

/**
 * Where the Mahāvyutpatti spells a month differently from Janson's table. Each is a spelling the
 * sourcing record lists, and each must still be needed — if the two ever agree, the entry is dead.
 */
const MONTH_SPELLING_VARIANTS = [
	{
		mvy: "jeṣṭha",
		janson: "jyeṣṭha",
		why:
			"the Mahāvyutpatti drops the y. Monier-Williams defines the month as jyaiṣṭha and gives " +
			"jyeṣṭha only 'for jyaiṣṭha'; jyeṣṭha ships as a stated exception, in INDIAN_MONTHS",
	},
	{ mvy: "aśvini", janson: "āśvina", why: "the Mahāvyutpatti's aśviniḥ against Janson's Āśvina" },
	{
		mvy: "kārttika",
		janson: "kārtikka",
		why:
			"Janson and Henning (p. 359) print Kārtikka, Monier-Williams heads the month Kārttika, and " +
			"Henning notes the Vimalaprabhā usually has Kārtika — three spellings of one month",
	},
];
const jansonMonthNumber = new Map(jansonMonths.map((m) => [m.sanskrit, m.month]));
for (const variant of MONTH_SPELLING_VARIANTS) {
	if (jansonMonthNumber.has(variant.mvy))
		fail(`spelling variant ${variant.mvy} → ${variant.janson} is no longer needed`);
	if (!jansonMonthNumber.has(variant.janson))
		fail(
			`spelling variant ${variant.mvy} → ${variant.janson}: Janson no longer prints ${variant.janson}`,
		);
}

const seasonMonths = [];
for (const entry of mvy) {
	const m = /^(dpyid|dbyar|ston|dgun) zla (ra ba|'bring po|tha chungs?)(?: (.+))?$/.exec(
		entry.tibetan,
	);
	if (!m) continue;
	const numbers = mvyForms(entry.sanskrit)
		.map((form) => MONTH_SPELLING_VARIANTS.find((v) => v.mvy === form)?.janson ?? form)
		.map((form) => jansonMonthNumber.get(form))
		.filter((n) => n !== undefined);
	// Not a month: the list's neighbours include vinaya terms built on the same compound.
	if (numbers.length === 0) continue;
	seasonMonths.push({
		month: numbers[0],
		season: SEASON_OF[m[1]],
		part: PART_OF[m[2]],
		mahavyutpatti: `${entry.tibetan}|${entry.sanskrit}`,
	});
}
seasonMonths.sort((a, b) => a.month - b.month);
const usedVariants = new Set(
	seasonMonths.flatMap((r) =>
		MONTH_SPELLING_VARIANTS.filter((v) => r.mahavyutpatti.includes(v.mvy)).map((v) => v.mvy),
	),
);
for (const variant of MONTH_SPELLING_VARIANTS) {
	if (!usedVariants.has(variant.mvy)) fail(`spelling variant ${variant.mvy} matched no entry`);
}
if (seasonMonths.map((r) => r.month).join() !== "1,2,3,4,5,6,7,8,9,10,11,12") {
	fail(
		`the Mahāvyutpatti's season-months numbered as ${seasonMonths.map((r) => r.month)}, not 1-12`,
	);
}
const pairsSeen = new Set(seasonMonths.map((r) => `${r.season} ${r.part}`));
if (pairsSeen.size !== 12)
	fail(`the Mahāvyutpatti's season-months give ${pairsSeen.size} (season, part) pairs, not 12`);

/**
 * `tha chung` over `tha chungs` (S14). The Mahāvyutpatti uses both inside its compounds; as a
 * headword, the shipped spelling must be attested more widely than the rejected one.
 */
const thaChung = headwordIn("tha chung");
const thaChungs = headwordIn("tha chungs");
if (thaChung.length < 2 || thaChungs.length >= thaChung.length) {
	fail(
		`the choice of "tha chung" needs re-arguing: headword in ${thaChung.length} dictionaries ` +
			`(${thaChung}), "tha chungs" in ${thaChungs.length} (${thaChungs})`,
	);
}

const compoundTerms = [];
for (const season of Object.keys(SEASON_OF)) {
	for (const part of ["early", "middle", "late"]) {
		const key = SEASON_OF[season];
		compoundTerms.push({
			kind: "four-season",
			key: `${key} ${part}`,
			season: key,
			part,
			wylie: `${season} zla ${PART_WYLIE[part]}`,
		});
		if (!pairsSeen.has(`${key} ${part}`))
			fail(`no Mahāvyutpatti season-month attests ${season} ${part}`);
	}
}
for (const word of [...Object.keys(SEASON_OF), "ra ba", "'bring po", "tha chung"]) {
	if (headwordIn(word).length === 0)
		fail(`"${word}" is a headword in none of the dictionaries read`);
}

// ---------------------------------------------------------------------------------------------
// 3b. The Indian month names — the witnesses (Monier-Williams is read further down)
// ---------------------------------------------------------------------------------------------

/**
 * The Sanskrit name of each month, as distinct from its mansion's: *māgha*, not *maghā*.
 *
 * **The rule is Monier-Williams' defining entry** — decided by Andreas on 2026-09-18. "Defining" is a
 * judgement rather than a pattern (*bhādrapada* is "the month Bhādra (a rainy month …)", the shape of a
 * pointer), so `defines` is the words that were read and judged to be the definition, and the run
 * refuses unless an entry headed by the shipped form still prints them.
 *
 * Month 5 is the one stated exception, with its own evidence. It self-invalidates on both sides: the
 * pointer and the definition it departs from must still be printed, and if Monier-Williams ever came to
 * define *jyeṣṭha* as a month itself, the exception would be unneeded and the run says so.
 */
const INDIAN_MONTHS = [
	{ month: 1, slp1: "mAGa", defines: "the month Māgha (which has its full moon in the const˚ M˚" },
	{
		month: 2,
		slp1: "PAlguna",
		defines: "the month during which the full moon stands in the N˚ Ph˚",
	},
	{
		month: 3,
		slp1: "cEtra",
		defines: "N. of the 2nd spring month (its full moon standing in the constellation Citrā",
	},
	{
		month: 4,
		slp1: "vESAKa",
		defines: "one of the 12 months constituting the Hindū lunar year",
	},
	{
		month: 5,
		slp1: "jyezWa",
		exception: {
			pointer: "for jyaiṣṭha",
			departsFrom: {
				slp1: "jyEzWa",
				defines: "N. of a month (May-June, the full moon standing in the constellation Jyeṣṭhā)",
			},
			why:
				"every source that reached this calendar through the Kālacakra or Tibet lacks the ai: the " +
				"Vimalaprabhā three times, beside the neighbouring months' ai; Janson/Henning Jyeṣṭha; the " +
				"Mahāvyutpatti jeṣṭhaḥ",
			// Read by eye from page images; the scan's OCR drops the ai sign, so this cannot be re-read
			// mechanically and is carried as data for the record, like a Jäschke page — no check reads it.
			readIn: {
				edition: "Vimalaprabhā, ed. Upadhyaya (Sarnath 1986), Part I",
				item: "archive.org kalachakra-colour-1",
				readings: [
					{ image: "n147", text: "ज्येष्ठमासं" },
					{ image: "n180", text: "ज्येष्ठादिवृषभे", control: "वैशाखान्ते" },
					{ image: "n243", text: "ज्येष्ठनाड्यः", control: "वैशाखनाड्यः" },
				],
			},
		},
	},
	{ month: 6, slp1: "AzAQa", defines: "N. of a month (corresponding to part of June and July)" },
	{ month: 7, slp1: "SrAvaRa", defines: "N. of one of the twelve Hindū months" },
	{ month: 8, slp1: "BAdrapada", defines: "the month Bhādra (a rainy month" },
	{ month: 9, slp1: "ASvina", defines: "N. of a month in the rainy season" },
	{
		month: 10,
		slp1: "kArttika",
		defines: "N. of a month corresponding to part of October and November",
	},
	{
		month: 11,
		slp1: "mArgaSIrza",
		defines: "N. of the month in which the full moon enters the const˚ Mṛga-śiras",
	},
	{ month: 12, slp1: "pOza", defines: "the month Pauṣa (December-January" },
];

/**
 * Where a witness prints a month other than as it ships. Each states the exact form it expects, so a
 * divergence that a source corrects fails the run instead of silently agreeing, and a witness agreeing
 * everywhere else is checked rather than assumed. Sakaki's printing (p. 524, entries 8261–8272) was
 * read to confirm that the Mahāvyutpatti's two are the text's and not the aggregate's.
 *
 * The same three spellings appear in `MONTH_SPELLING_VARIANTS`, which pairs the two witnesses with each
 * other to number the months; this table pairs each with what ships. A source change to one of them
 * therefore needs correcting in both.
 */
const INDIAN_MONTH_DIVERGENCES = {
	mahavyutpatti: [
		{ month: 5, prints: "jeṣṭha", why: "Sakaki 8264 Jeṣṭhaḥ: neither jyeṣṭha nor jyaiṣṭha" },
		{ month: 9, prints: "aśvini", why: "Sakaki 8268 Açviniḥ: a form of the mansion's name" },
	],
	janson: [
		{
			month: 10,
			prints: "kārtikka",
			why: "a transposition of kārttika's doubling, which Henning (p. 359) also prints",
		},
	],
};

const indianMonthTerms = INDIAN_MONTHS.map((row) => {
	const devanagari = slp1ToDevanagari(row.slp1);
	return { ...row, key: String(row.month), devanagari, iast: devanagariToIast(devanagari) };
});
if (indianMonthTerms.map((t) => t.month).join() !== "1,2,3,4,5,6,7,8,9,10,11,12")
	fail(`INDIAN_MONTHS numbers the months ${indianMonthTerms.map((t) => t.month)}, not 1-12`);

for (const term of indianMonthTerms) {
	const label = `indian month ${term.month}`;
	const janson = jansonMonths.find((m) => m.month === term.month)?.sanskrit;
	const jansonDivergence = INDIAN_MONTH_DIVERGENCES.janson.find((d) => d.month === term.month);
	if (jansonDivergence) {
		if (janson !== jansonDivergence.prints)
			fail(
				`${label}: Janson's divergence expects "${jansonDivergence.prints}", but his table now prints "${janson}"`,
			);
	} else if (janson !== term.iast) {
		fail(`${label}: Janson prints "${janson}", not the "${term.iast}" that ships`);
	}

	const mvyRow = seasonMonths.find((r) => r.month === term.month);
	const mvyNames = mvyRow ? mvyForms(mvyRow.mahavyutpatti.split("|")[1]) : [];
	const mvyDivergence = INDIAN_MONTH_DIVERGENCES.mahavyutpatti.find((d) => d.month === term.month);
	if (!mvyRow) fail(`${label}: no Mahāvyutpatti season-month is numbered ${term.month}`);
	else if (mvyDivergence) {
		if (!mvyNames.includes(mvyDivergence.prints) || mvyNames.includes(term.iast))
			fail(
				`${label}: the Mahāvyutpatti's divergence expects "${mvyDivergence.prints}", but it now prints ${mvyNames}`,
			);
	} else if (!mvyNames.includes(term.iast)) {
		fail(`${label}: the Mahāvyutpatti prints ${mvyNames}, not "${term.iast}"`);
	}
	term.mahavyutpatti = mvyNames;
}
for (const [witness, rows] of Object.entries(INDIAN_MONTH_DIVERGENCES)) {
	for (const row of rows)
		if (!indianMonthTerms.some((t) => t.month === row.month))
			fail(`${witness} divergence for month ${row.month} matches no month`);
}

// ---------------------------------------------------------------------------------------------
// 4. The six seasons
// ---------------------------------------------------------------------------------------------

/**
 * The six-season names. `mvy` is the Tibetan the Mahāvyutpatti pairs with the Sanskrit; `wylie` is
 * what ships. They differ once, for hemanta, and that choice (S14) is data re-checked below.
 */
const SIX_SEASONS = [
	{ season: "spring", wylie: "dpyid", mvy: "dpyid", slp1: "vasanta", defines: "spring" },
	{
		season: "summer",
		wylie: "sos ka",
		mvy: "sos ka",
		slp1: "grIzma",
		defines: "the summer, hot season",
	},
	{
		season: "rains",
		wylie: "dbyar",
		mvy: "dbyar",
		slp1: "varzA",
		// Not the first entry headed वर्षा, which is a bare "See p. 927".
		defines: "the rains, rainy season",
	},
	{ season: "autumn", wylie: "ston", mvy: "ston", slp1: "Sarad", defines: "autumn" },
	{
		season: "cold",
		wylie: "dgun stod",
		mvy: "dgun",
		slp1: "hemanta",
		defines: "winter, the cold season",
		preferred: {
			requireHeadwordIn: ["tshig mdzod chen mo", "Das 1902"],
			why:
				"Jäschke (p. 255) and Das (p. 268) agree on dgun stod for hemanta, and bare dgun is " +
				"ambiguous between the sources: the Mahāvyutpatti glosses it hemanta, Das glosses it शिशिर",
		},
	},
	{
		season: "dewy",
		wylie: "dgun smad",
		mvy: "dgun smad",
		slp1: "SiSira",
		defines: "the cool or dewy season",
	},
];

const sixSeasonTerms = [];
for (const row of SIX_SEASONS) {
	const devanagari = slp1ToDevanagari(row.slp1);
	const iast = devanagariToIast(devanagari);
	const paired = mvyPairs(row.mvy).some((e) =>
		e.sanskrit
			.replace(/\([^)]*\)/, "")
			.split(",")
			.some((cell) => isNominativeOf(cell.trim(), iast)),
	);
	if (!paired)
		fail(
			`${row.season}: the Mahāvyutpatti does not pair "${row.mvy}" with a nominative of ${iast}`,
		);
	if (row.preferred) {
		const missing = row.preferred.requireHeadwordIn.filter((d) => !HEADWORDS[d].has(row.wylie));
		if (missing.length > 0)
			fail(`${row.season}: "${row.wylie}" is no longer a headword in ${missing}`);
		if (mvyPairs(row.wylie).length > 0) {
			fail(
				`${row.season}: the Mahāvyutpatti now has "${row.wylie}" itself — the preference for it ` +
					"over its pairing needs restating",
			);
		}
	} else if (row.mvy !== row.wylie) {
		fail(
			`${row.season}: ships "${row.wylie}" against the Mahāvyutpatti's "${row.mvy}" with no stated preference`,
		);
	}
	sixSeasonTerms.push({ kind: "six-season", key: row.season, ...row, iast, devanagari });
}

// ---------------------------------------------------------------------------------------------
// 5. The elemental yogas
// ---------------------------------------------------------------------------------------------

/** Henning p. 204, as Andreas read it off the scan: his Wylie, IAST and English, and the element pair. */
const HENNING_YOGAS = [
	{
		elements: ["earth", "earth"],
		wylie: "dngos grub",
		iast: "siddhi",
		slp1: "sidDi",
		english: "accomplishment",
	},
	{
		elements: ["water", "water"],
		wylie: "bdud rtsi",
		iast: "amṛta",
		slp1: "amfta",
		english: "nectar",
	},
	{
		elements: ["earth", "water"],
		wylie: "lang tsho",
		iast: "yauvana",
		slp1: "yOvana",
		english: "youth",
	},
	{
		elements: ["fire", "fire"],
		wylie: "'phel 'gyur",
		iast: "pragati",
		slp1: "pragati",
		english: "progress",
	},
	{
		elements: ["wind", "wind"],
		wylie: "phun tshogs",
		iast: "saṃpanna",
		slp1: "saMpanna",
		english: "excellence",
	},
	{
		elements: ["fire", "wind"],
		wylie: "stobs ldan",
		iast: "balayukta",
		slp1: "balayukta",
		english: "powerful",
	},
	{
		elements: ["earth", "wind"],
		wylie: "mi phrod",
		iast: "alābha",
		slp1: "alABa",
		english: "deficiency",
	},
	{
		elements: ["water", "wind"],
		wylie: "mi mthun",
		iast: "pratikūla",
		slp1: "pratikUla",
		english: "discord",
	},
	{
		elements: ["earth", "fire"],
		wylie: "sreg pa",
		iast: "dahana",
		slp1: "dahana",
		english: "burning",
	},
	{
		elements: ["fire", "water"],
		wylie: "'chi ba",
		iast: "maraṇa",
		slp1: "maraRa",
		english: "death",
	},
];

const YOGA_CORRECTIONS = [
	{
		from: "mi phrod",
		to: "mi 'phrod",
		why:
			"both Tibetan–Tibetan enumerations of the ten print mi 'phrod, and mi phrod is a headword in " +
			"none of the dictionaries swept",
	},
	{
		from: "sreg pa",
		to: "bsreg pa",
		why:
			"the tshig mdzod chen mo prints the compound bsreg sbyor and the dung dkar the genitive " +
			"bsreg pa'i sbyor — both bsreg pa, parting from Henning in the prefix alone",
	},
];

/**
 * Henning prints no Sanskrit entry for this one that Monier-Williams carries, so its absence is
 * asserted: if a Cologne dictionary ever heads it, S15's "Henning's alone" needs restating.
 */
const EXPECTED_ABSENT_FROM_MW = new Set(["pragati"]);

/**
 * Where each of Henning's English glosses is printed **word for word** in a public-domain dictionary.
 *
 * - `"Monier-Williams"` — re-checked on every run: the word must occur in a Cologne entry headed by
 *   the Sanskrit name, and the page is taken from the entry that carries it.
 * - A Jäschke row was read from the page image, archive.org `tibetanenglishdi00jsuoft`, where image
 *   `n` is printed page + 25. It cannot be re-read mechanically — the scan's OCR is unusable — so it is
 *   data carrying its page and sense, and the run fails if Monier-Williams comes to print the word,
 *   which would make it checkable.
 * - A row with `replaces` ships a dictionary's word **instead of** Henning's, where no dictionary
 *   consulted prints his (Monier-Williams, Jäschke, Das; measured 2026-09-14). Decided by Andreas on
 *   2026-09-14. It self-invalidates like the spelling corrections: Henning's word must still be the
 *   one this table replaces, and the run fails if Monier-Williams comes to print it — then his word is
 *   attested after all, and the replacement needs re-arguing.
 */
const ENGLISH_EVIDENCE = {
	siddhi: "Monier-Williams",
	amṛta: "Monier-Williams",
	yauvana: "Monier-Williams",
	pragati: {
		word: "increase",
		replaces: "progress",
		dictionary: "Jäschke 1881",
		page: 357,
		headword: "'phel-ba",
		sense: "to increase, augment, multiply, enlarge … II. sbst. … increase",
		alsoIn: "Das 1902 p. 849, s.v. hphel-wa: increase, development",
	},
	saṃpanna: {
		dictionary: "Jäschke 1881",
		page: 344,
		headword: "phun(-sum)-tshogs(-pa)",
		sense: "perfection, excellence, superior good",
	},
	balayukta: "Monier-Williams",
	alābha: "Monier-Williams",
	pratikūla: { word: "opposition", replaces: "discord", dictionary: "Monier-Williams" },
	dahana: "Monier-Williams",
	maraṇa: "Monier-Williams",
};

/** The printed page of the first of `entries` in which `word` occurs as a whole word, or null. */
function pageOfWord(entries, word) {
	return entries.find((e) => new RegExp(`\\b${word}\\b`, "i").test(e.body))?.page ?? null;
}

const tshigNames = enumeratedNames(
	HEADWORDS["tshig mdzod chen mo"].get("'phrod sbyor")?.join(" ") ?? "",
	"'phrad pa",
);
const dungNames = enumeratedNames(
	HEADWORDS["dung dkar tshig mdzod chen mo"].get("'phrod sbyor bcu")?.join(" ") ?? "",
	"'phrod pa",
);
if (tshigNames.length !== 10)
	fail(
		`the tshig mdzod chen mo's 'phrod sbyor enumeration read as ${tshigNames.length} names, not 10`,
	);
if (dungNames.length === 0) fail("the dung dkar's 'phrod sbyor bcu enumeration read as empty");

// The tshig mdzod chen mo's element pairs (the sixth takeable fact). The dung dkar's are not read: its
// enumeration is damaged — eight members, with mi 'phrod paired with sa chu where the tshig mdzod and
// Henning both have earth and wind — so it is a spelling witness only.
const tshigBody = HEADWORDS["tshig mdzod chen mo"].get("'phrod sbyor")?.join(" ") ?? "";
const tshigPairs = enumeratedPairs(tshigBody, "'phrad pa");
if (tshigPairs.map((p) => p.name).join("|") !== tshigNames.join("|"))
	fail(
		`the tshig mdzod chen mo's pairs name ${tshigPairs.map((p) => p.name)}, but its enumeration names ${tshigNames}`,
	);
for (const pair of tshigPairs) {
	if (pair.elements.includes(undefined))
		fail(`the tshig mdzod chen mo pairs "${pair.name}" with an element word outside the four`);
}

/**
 * The four groups the *tshig mdzod chen mo* closes its enumeration with (the seventh takeable fact),
 * and the English each ships under. **The entry states how many yogas are in each group, never which**:
 * membership is read by applying the counts to the enumeration's own order, and every output carries
 * that as `groupedByOrder`. The order has a second, structural explanation — the four same-element
 * pairs come first — under which *phun tshogs* (wind + wind) would be good rather than restorative, so
 * that row is the one to check first if a source ever states membership.
 *
 * Three tiers of English, never collapsed:
 * - `printed` — the word is printed for the Tibetan itself. Jäschke's page is re-checked against the
 *   aggregate's index, whose Jäschke number is the scan leaf, printed page + 26.
 * - `through-sanskrit` — Das gives a Sanskrit equivalent (read from his page image), and Monier-Williams
 *   prints the word for that Sanskrit, which is re-checked through Cologne on every run.
 * - `composed` — no dictionary prints a word for the compound; the English is composed from the glosses
 *   of its parts, and the run fails if a dictionary comes to head the compound.
 *
 * Decided by Andreas on 2026-09-14.
 */
const AUSPICIOUSNESS = [
	{
		wylie: "bzang po",
		englishName: "good",
		tier: "printed",
		source: { dictionary: "Jäschke 1881", page: 496, headword: "bzang po", sense: "1. good (भद्र)" },
	},
	{
		wylie: "gso thub",
		englishName: "restorative",
		tier: "composed",
		composedFrom: [
			{ dictionary: "Jäschke 1881", page: 590, headword: "gso ba", sense: "to cure … to restore" },
			{
				dictionary: "Jäschke 1881",
				page: 234,
				headword: "thub pa",
				sense: "with a verb root: to be able",
			},
		],
		alternative: {
			englishName: "healing",
			dictionary: "Das 1902",
			page: 1312,
			headword: "gso ba",
			why: "the only word printed for the root (curing, healing), rejected because it drops thub",
		},
	},
	{
		wylie: "ngan",
		englishName: "bad",
		tier: "printed",
		source: { dictionary: "Jäschke 1881", page: 126, headword: "ngan pa", sense: "bad" },
	},
	{
		wylie: "tha chad",
		englishName: "worst",
		tier: "through-sanskrit",
		through: {
			slp1: "aDama",
			equivalentIn: {
				dictionary: "Das 1902",
				page: 564,
				headword: "tha cad",
				sense: "खल, प्रतिक्रुष्ट, अधम, क्षुद्र",
			},
		},
		alternative: {
			englishName: "very bad",
			dictionary: "Jäschke 1881",
			page: 226,
			headword: "tha chad",
			why: "printed for tha chad itself, rejected as reading like a step up from bad rather than the end of the scale",
		},
	},
];

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

const grouping = statedGrouping(tshigBody);
const groupOfName = new Map();
if (grouping === null) {
	fail("the tshig mdzod chen mo's 'phrod sbyor no longer closes with a grouping sentence");
} else if (grouping.groups.includes(null)) {
	fail(
		"the tshig mdzod chen mo's grouping sentence has changed shape — a group no longer reads as name + count",
	);
} else {
	const stated = grouping.groups.map((g) => g.wylie).join("|");
	if (stated !== AUSPICIOUSNESS.map((a) => a.wylie).join("|"))
		fail(`the tshig mdzod chen mo now groups the ten as ${stated}`);
	const sum = grouping.groups.reduce((n, g) => n + g.count, 0);
	if (sum !== grouping.total || sum !== tshigNames.length)
		fail(
			`the grouping counts sum to ${sum}, against a stated total of ${grouping.total} and ${tshigNames.length} names`,
		);
	let at = 0;
	for (const group of grouping.groups) {
		for (const name of tshigNames.slice(at, at + group.count)) groupOfName.set(name, group);
		at += group.count;
	}
}

const auspiciousnessTerms = [];
for (const row of AUSPICIOUSNESS) {
	const group = grouping?.groups?.find((g) => g?.wylie === row.wylie);
	if (row.source) checkCitation(`auspiciousness ${row.englishName}`, row.source);
	if (row.composedFrom) {
		for (const part of row.composedFrom) checkCitation(`auspiciousness ${row.englishName}`, part);
		const heads = [
			...headwordIn(row.wylie),
			...(mvyPairs(row.wylie).length > 0 ? ["Mahāvyutpatti"] : []),
		];
		if (heads.length > 0)
			fail(
				`auspiciousness ${row.englishName}: "${row.wylie}" is now a headword in ${heads} — re-argue the composed English`,
			);
	}
	if (row.through) checkCitation(`auspiciousness ${row.englishName}`, row.through.equivalentIn);
	if (row.alternative)
		checkCitation(`auspiciousness ${row.englishName} (alternative)`, row.alternative);
	auspiciousnessTerms.push({
		kind: "auspicious",
		key: row.englishName,
		wylie: row.wylie,
		englishName: row.englishName,
		tier: row.tier,
		members: group?.count ?? null,
		row,
	});
}

const yogaTerms = [];
for (const yoga of HENNING_YOGAS) {
	const correction = YOGA_CORRECTIONS.find((c) => c.from === yoga.wylie);
	const wylie = correction ? correction.to : yoga.wylie;
	if (correction) {
		if (
			enumerationPrints(tshigNames, correction.from) ||
			enumerationPrints(dungNames, correction.from)
		) {
			fail(
				`correction "${correction.from}" -> "${correction.to}" is no longer justified: an enumeration prints the original`,
			);
		}
		console.log(
			`correcting yoga ${yoga.elements.join("+")}: "${correction.from}" -> "${correction.to}"`,
		);
	}
	if (!enumerationPrints(tshigNames, wylie))
		fail(
			`yoga ${yoga.elements.join("+")}: the tshig mdzod chen mo's enumeration does not print "${wylie}"`,
		);
	const pair = tshigPairs.find((p) => enumerationPrints([p.name], wylie));
	const sorted = (elements) => [...elements].sort().join("+");
	if (!pair)
		fail(
			`yoga ${yoga.elements.join("+")}: the tshig mdzod chen mo states no element pair for "${wylie}"`,
		);
	else if (sorted(pair.elements) !== sorted(yoga.elements))
		fail(
			`yoga ${wylie}: the tshig mdzod chen mo pairs it with ${pair.elements.join("+")}, Henning with ${yoga.elements.join("+")}`,
		);
	const group = pair ? groupOfName.get(pair.name) : undefined;
	const auspiciousness = AUSPICIOUSNESS.find((a) => a.wylie === group?.wylie);
	if (!auspiciousness)
		fail(`yoga ${wylie}: falls in no group of the tshig mdzod chen mo's grouping`);
	const devanagari = slp1ToDevanagari(yoga.slp1);
	if (devanagariToIast(devanagari) !== yoga.iast) {
		fail(
			`yoga ${yoga.iast}: SLP1 ${yoga.slp1} transliterates to ${devanagariToIast(devanagari)}, not Henning's spelling`,
		);
	}
	yogaTerms.push({
		kind: "yoga",
		key: yoga.elements.join("+"),
		elements: yoga.elements,
		wylie,
		correctedFrom: correction?.from ?? null,
		iast: yoga.iast,
		devanagari,
		english: yoga.english,
		attestedIn: [
			"tshig mdzod chen mo",
			...(enumerationPrints(dungNames, wylie) ? ["dung dkar tshig mdzod chen mo"] : []),
		],
		elementsAttestedIn:
			pair && sorted(pair.elements) === sorted(yoga.elements) ? ["tshig mdzod chen mo"] : [],
		auspiciousness: auspiciousness?.englishName ?? null,
	});
}
for (const correction of YOGA_CORRECTIONS) {
	if (!HENNING_YOGAS.some((y) => y.wylie === correction.from))
		fail(`correction "${correction.from}" has nothing to correct`);
	if (headwordIn(correction.from).length > 0 && correction.from === "mi phrod")
		fail(`"mi phrod" is now a headword in ${headwordIn("mi phrod")} — re-argue the correction`);
}

// ---------------------------------------------------------------------------------------------
// 1. Script, by two converters that must agree, and a round trip
// ---------------------------------------------------------------------------------------------

const DISCOURAGED = ["ཱི", "ཷ", "ཹ", "ཱྀ"];
const tibetanTerms = [
	...mansionTerms,
	...compoundTerms,
	...sixSeasonTerms,
	...yogaTerms,
	...auspiciousnessTerms,
];
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

/** Every Cologne entry for an SLP1 key, in the romanised text `entriesHeadedBy` reads. */
async function cologneRoman(slp1) {
	const html = await fetchWithRetry(
		`https://www.sanskrit-lexicon.uni-koeln.de/scans/MWScan/2020/web/webtc/getword.php?key=${encodeURIComponent(slp1)}&filter=roman`,
		"Cologne",
	);
	await sleep(150);
	return /not found:/.test(html) ? "" : stripHtml(html);
}

/**
 * Every Monier-Williams entry headed by a Devanāgarī name, at the first rung of the lookup ladder that
 * heads any, or null. The ladder changes only what is queried, so the entries are matched against
 * the rung's own form — Cologne prints संपन्न as *sam-panna*.
 *
 * This replaced a reader that took the first entry Cologne returned, which cited the homograph *1.
 * siddhi* "driving off" for the yoga and read वर्षा as absent because वर्ष came first.
 */
async function monierWilliams(devanagari) {
	for (const candidate of lookupCandidates(devanagari)) {
		const iast = devanagariToIast(candidate.devanagari);
		const entries = entriesHeadedBy(
			await cologneRoman(devanagariToSlp1(candidate.devanagari)),
			iast,
		);
		if (entries.length > 0) return { rung: candidate.rung, iast, entries };
	}
	return null;
}

for (const term of sixSeasonTerms) {
	try {
		const entry = await monierWilliams(term.devanagari);
		if (!entry) {
			fail(`${term.season}: ${term.iast} is not a Monier-Williams headword`);
			continue;
		}
		const defining = prints(entry.entries, term.defines);
		if (defining.length === 0) {
			fail(
				`${term.season}: no Monier-Williams entry headed ${entry.iast} prints "${term.defines}" (found on pp. ${entry.entries.map((e) => e.page)})`,
			);
			continue;
		}
		term.mwPage = defining[0].page;
	} catch (error) {
		fail(`${term.season}: Cologne lookup failed — ${error.message}`);
	}
}
for (const term of yogaTerms) {
	try {
		const entry = await monierWilliams(term.devanagari);
		const found = entry !== null;
		const evidence = ENGLISH_EVIDENCE[term.iast];
		if (evidence === undefined) fail(`yoga ${term.iast}: no English evidence row`);
		const pageOf = (word) => (entry ? pageOfWord(entry.entries, word) : null);
		const replacement = typeof evidence === "object" && evidence?.replaces ? evidence : null;
		if (replacement) {
			if (replacement.replaces !== term.english)
				fail(
					`yoga ${term.iast}: the English replacement expects Henning's "${replacement.replaces}", but his table now says "${term.english}"`,
				);
			const hennings = pageOf(term.english);
			if (hennings !== null)
				fail(
					`yoga ${term.iast}: Monier-Williams now prints Henning's "${term.english}" (p. ${hennings}) — the replacement by "${replacement.word}" needs re-arguing`,
				);
		}
		const word = replacement ? replacement.word : term.english;
		const dictionary = typeof evidence === "string" ? evidence : evidence?.dictionary;
		if (dictionary === "Monier-Williams") {
			const page = pageOf(word);
			if (page === null) fail(`yoga ${term.iast}: Monier-Williams no longer prints "${word}"`);
			term.englishSource = { dictionary: "Monier-Williams 1899", page };
		} else {
			const page = pageOf(word);
			if (page !== null)
				fail(
					`yoga ${term.iast}: Monier-Williams now prints "${word}" (p. ${page}) — make it a Monier-Williams row`,
				);
			term.englishSource = { dictionary, page: evidence.page };
		}
		term.englishName = word;
		term.englishReplaces = replacement ? replacement.replaces : null;
		if (EXPECTED_ABSENT_FROM_MW.has(term.iast)) {
			if (found)
				fail(
					`yoga ${term.iast}: Monier-Williams now heads it — S15's "Henning's alone" needs restating`,
				);
			term.mwPage = null;
		} else if (!found) {
			fail(`yoga ${term.iast}: ${term.devanagari} is not a Monier-Williams headword`);
		} else if (dictionary === "Monier-Williams") {
			// The entry that prints the English is the sense the yoga is named for.
			term.mwPage = term.englishSource.page;
		} else {
			// No printed English picks the sense, so homographs on different pages cannot be told apart.
			const pages = [...new Set(entry.entries.map((e) => e.page))];
			if (pages.length !== 1)
				fail(
					`yoga ${term.iast}: Monier-Williams heads ${entry.iast} on pp. ${pages}, and nothing chooses between them`,
				);
			term.mwPage = pages[0];
		}
	} catch (error) {
		fail(`yoga ${term.iast}: Cologne lookup failed — ${error.message}`);
	}
}
for (const term of auspiciousnessTerms.filter((t) => t.row.through)) {
	const devanagari = slp1ToDevanagari(term.row.through.slp1);
	try {
		const entry = await monierWilliams(devanagari);
		const page = entry ? pageOfWord(entry.entries, term.englishName) : null;
		if (page === null)
			fail(
				`auspiciousness ${term.englishName}: Monier-Williams no longer prints "${term.englishName}" under ${devanagari}`,
			);
		term.englishThrough = { devanagari, iast: devanagariToIast(devanagari), page };
	} catch (error) {
		fail(`auspiciousness ${term.englishName}: Cologne lookup failed — ${error.message}`);
	}
}

for (const term of indianMonthTerms) {
	const label = `indian month ${term.month}`;
	try {
		const entries = entriesHeadedBy(await cologneRoman(term.slp1), term.iast);
		if (entries.length === 0) {
			fail(`${label}: "${term.iast}" is not a Monier-Williams headword`);
			continue;
		}
		if (term.exception) {
			const { pointer, departsFrom } = term.exception;
			const pointing = prints(entries, pointer);
			if (pointing.length === 0)
				fail(`${label}: Monier-Williams no longer prints "${pointer}" under ${term.iast}`);
			if (entries.some((e) => MONTH_SENSE.test(e.body)))
				fail(
					`${label}: Monier-Williams now names a month under ${term.iast} itself — the exception is no longer needed`,
				);
			const target = devanagariToIast(slp1ToDevanagari(departsFrom.slp1));
			const defining = prints(
				entriesHeadedBy(await cologneRoman(departsFrom.slp1), target),
				departsFrom.defines,
			);
			if (defining.length === 0)
				fail(
					`${label}: Monier-Williams no longer defines ${target} as "${departsFrom.defines}" — the exception departs from nothing`,
				);
			term.monierWilliamsPage = pointing[0]?.page ?? null;
			term.definedAs = { iast: target, page: defining[0]?.page ?? null };
		} else {
			const defining = prints(entries, term.defines);
			if (defining.length === 0)
				fail(
					`${label}: no Monier-Williams entry headed ${term.iast} prints "${term.defines}" (found on pp. ${entries.map((e) => e.page)})`,
				);
			term.monierWilliamsPage = defining[0]?.page ?? null;
			term.definedAs = null;
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

proveIndicPredicates(
	[...sixSeasonTerms, ...yogaTerms, ...indianMonthTerms].map((t) => t.devanagari),
);

for (const term of tibetanTerms) {
	console.log(
		`  ${term.kind.padEnd(11)} ${term.key.padEnd(14)} ${term.wylie.padEnd(20)} ${(term.tibetan ?? "—").padEnd(14)} ${term.phonetic ?? "—"}`,
	);
}
for (const row of seasonMonths)
	console.log(
		`  kalacakra   ${String(row.month).padEnd(3)} ${row.season} ${row.part}  ${row.mahavyutpatti}`,
	);
for (const term of indianMonthTerms)
	console.log(
		`  indian      ${term.key.padEnd(3)} ${term.iast.padEnd(12)} ${term.devanagari.padEnd(10)} MW p. ${term.monierWilliamsPage}${term.exception ? `  (exception: MW defines ${term.definedAs?.iast}, p. ${term.definedAs?.page})` : ""}`,
	);

if (problems.length > 0) {
	console.error(`\n${problems.length} problem(s); nothing written:\n`);
	for (const problem of problems) console.error(`  - ${problem}`);
	process.exit(1);
}

const q = (s) => JSON.stringify(s);
const name = (t) => `tibetan: ${q(t.tibetan)}, wylie: ${q(t.wylie)}, phonetic: ${q(t.phonetic)}`;

writeFileSync(
	join(root, "test", "fixtures", "month-names.ts"),
	`/**
 * The lunar-mansion month names and the season names, verified against independent dictionaries.
 *
 * @remarks
 * GENERATED by \`scripts/verify-month-and-yoga-names.mjs\`. Do not edit by hand — re-run the script.
 * The evidence and the decisions behind every row are in \`docs/names/month-and-yoga-sourcing.md\`.
 *
 * Every Tibetan row passed: two EWTS implementations agreeing on the script, a round trip back to the
 * same Wylie, no discouraged vowel sign, and THL phonetics. On top of that, per table:
 *
 * - **Mansion month names** — the Mahāvyutpatti's Tibetan for the nakṣatra, or for \`khrums\` the stem
 *   of the two it names.
 * - **Four-season compounds** — every (season, part) attested among the Mahāvyutpatti's season-months.
 * - **Kālacakra season-months** — the Mahāvyutpatti's own identification, each month numbered through
 *   its Sanskrit name against Janson's table. The pin for the original Kālacakra system, which
 *   Janson's table does not carry.
 * - **Six seasons** — each Tibetan paired with its Sanskrit in the Mahāvyutpatti, and each Sanskrit
 *   stem a Monier-Williams headword, cited by printed page.
 * - **Indian month names** — each the headword of the Monier-Williams entry recorded as defining the
 *   month, cited by printed page, and checked against Janson's table and the Mahāvyutpatti with every
 *   divergence stated. Month 5 is the one exception: \`definedAs\` names the form Monier-Williams
 *   defines, and \`monierWilliamsPage\` is the page of his pointer to it.
 */

export interface MonthNameFixtureRow {
	tibetan: string;
	wylie: string;
	phonetic: string;
}

export const MANSION_MONTH_NAMES: readonly (MonthNameFixtureRow & { month: number })[] = [
${mansionTerms.map((t) => `\t{ month: ${t.month}, ${name(t)} },`).join("\n")}
];

export const FOUR_SEASON_MONTH_NAMES: readonly (MonthNameFixtureRow & { season: string; part: string })[] = [
${compoundTerms.map((t) => `\t{ season: ${q(t.season)}, part: ${q(t.part)}, ${name(t)} },`).join("\n")}
];

/** The Mahāvyutpatti's season-months, as \`tibetan|sanskrit\` exactly as the aggregate prints them. */
export const KALACAKRA_SEASON_MONTHS: readonly { month: number; season: string; part: string; mahavyutpatti: string }[] = [
${seasonMonths.map((r) => `\t{ month: ${r.month}, season: ${q(r.season)}, part: ${q(r.part)}, mahavyutpatti: ${q(r.mahavyutpatti)} },`).join("\n")}
];

export const SIX_SEASON_NAMES: readonly (MonthNameFixtureRow & { season: string; iast: string; devanagari: string; monierWilliamsPage: number })[] = [
${sixSeasonTerms.map((t) => `\t{ season: ${q(t.season)}, ${name(t)}, iast: ${q(t.iast)}, devanagari: ${q(t.devanagari)}, monierWilliamsPage: ${t.mwPage} },`).join("\n")}
];

export const INDIAN_MONTH_NAMES: readonly { month: number; iast: string; devanagari: string; monierWilliamsPage: number; definedAs: { iast: string; page: number } | null }[] = [
${indianMonthTerms.map((t) => `\t{ month: ${t.month}, iast: ${q(t.iast)}, devanagari: ${q(t.devanagari)}, monierWilliamsPage: ${t.monierWilliamsPage}, definedAs: ${t.definedAs ? `{ iast: ${q(t.definedAs.iast)}, page: ${t.definedAs.page} }` : "null"} },`).join("\n")}
];
`,
);

writeFileSync(
	join(root, "test", "fixtures", "yoga-names.ts"),
	`/**
 * The ten elemental-yoga names, verified against independent dictionaries.
 *
 * @remarks
 * GENERATED by \`scripts/verify-month-and-yoga-names.mjs\`. Do not edit by hand — re-run the script.
 * The evidence, both corrections and the standing of *pragati* are in
 * \`docs/names/month-and-yoga-sourcing.md\`.
 *
 * Henning (p. 204) is the only source that lists the ten with their Sanskrit, so his Wylie and IAST are
 * the input. Each Tibetan name must be spelled as the *tshig mdzod chen mo*'s enumeration of the ten
 * spells it — which is what corrects two of Henning's — and each Sanskrit name must be a
 * Monier-Williams headword, except *pragati*, whose absence is asserted.
 *
 * \`englishName\` is printed word for word by \`englishSource\`, a public-domain dictionary. It is Henning's
 * English except where \`englishReplaces\` names the word of his that no dictionary prints.
 *
 * \`elementsAttestedIn\` names the Tibetan–Tibetan dictionary whose enumeration states the same element
 * pair as Henning. \`auspiciousness\` is the group of that enumeration's closing sentence the yoga falls
 * in — **read by list order**, because the entry states each group's size and never its members.
 */

export const YOGA_NAMES: readonly {
	elements: readonly [string, string];
	tibetan: string;
	wylie: string;
	phonetic: string;
	correctedFrom: string | null;
	iast: string;
	devanagari: string;
	monierWilliamsPage: number | null;
	attestedIn: readonly string[];
	englishName: string;
	englishReplaces: string | null;
	englishSource: { dictionary: string; page: number };
	elementsAttestedIn: readonly string[];
	auspiciousness: string;
}[] = [
${yogaTerms.map((t) => `\t{ elements: [${t.elements.map(q).join(", ")}], ${name(t)}, correctedFrom: ${q(t.correctedFrom)}, iast: ${q(t.iast)}, devanagari: ${q(t.devanagari)}, monierWilliamsPage: ${t.mwPage}, attestedIn: [${t.attestedIn.map(q).join(", ")}], englishName: ${q(t.englishName)}, englishReplaces: ${q(t.englishReplaces)}, englishSource: ${t.englishSource === null ? "null" : `{ dictionary: ${q(t.englishSource.dictionary)}, page: ${t.englishSource.page} }`}, elementsAttestedIn: [${t.elementsAttestedIn.map(q).join(", ")}], auspiciousness: ${q(t.auspiciousness)} },`).join("\n")}
];

/**
 * The four groups of the *tshig mdzod chen mo*'s closing sentence, in its order, with the number of
 * yogas it states for each. \`groupedByOrder\` is always true: which yogas are in a group is inferred.
 *
 * \`englishTier\` says how far the English is from the Tibetan. \`printed\`: \`englishSource\` prints it for
 * the Tibetan. \`through-sanskrit\`: \`englishThrough.equivalentIn\` gives the Sanskrit and Monier-Williams
 * prints the word for it. \`composed\`: no dictionary prints a word for the compound, and
 * \`composedFrom\` cites its parts.
 */
export const YOGA_AUSPICIOUSNESS: readonly {
	englishName: string;
	tibetan: string;
	wylie: string;
	phonetic: string;
	members: number;
	groupedByOrder: true;
	englishTier: "printed" | "through-sanskrit" | "composed";
	englishSource: { dictionary: string; page: number } | null;
	englishThrough: { iast: string; devanagari: string; monierWilliamsPage: number; equivalentIn: { dictionary: string; page: number } } | null;
	composedFrom: readonly { wylie: string; dictionary: string; page: number }[] | null;
	alternative: { englishName: string; dictionary: string; page: number } | null;
}[] = [
${auspiciousnessTerms
	.map((t) => {
		const cite = (c) => `{ dictionary: ${q(c.dictionary)}, page: ${c.page} }`;
		const r = t.row;
		return `\t{ englishName: ${q(t.englishName)}, ${name(t)}, members: ${t.members}, groupedByOrder: true, englishTier: ${q(t.tier)}, englishSource: ${r.source ? cite(r.source) : "null"}, englishThrough: ${t.englishThrough ? `{ iast: ${q(t.englishThrough.iast)}, devanagari: ${q(t.englishThrough.devanagari)}, monierWilliamsPage: ${t.englishThrough.page}, equivalentIn: ${cite(r.through.equivalentIn)} }` : "null"}, composedFrom: ${r.composedFrom ? `[${r.composedFrom.map((c) => `{ wylie: ${q(c.headword)}, dictionary: ${q(c.dictionary)}, page: ${c.page} }`).join(", ")}]` : "null"}, alternative: ${r.alternative ? `{ englishName: ${q(r.alternative.englishName)}, ${cite(r.alternative).slice(2)}` : "null"} },`;
	})
	.join("\n")}
];
`,
);

console.log(
	`\nall ${tibetanTerms.length} Tibetan terms and ${sixSeasonTerms.length + yogaTerms.length + indianMonthTerms.length + auspiciousnessTerms.filter((t) => t.englishThrough).length} Sanskrit names passed; ` +
		"wrote test/fixtures/month-names.ts and test/fixtures/yoga-names.ts",
);
