#!/usr/bin/env node
/**
 * Verifies the Tibetan names of the fourteen observances that ship one, and refuses to write anything
 * if any check fails for any name.
 *
 * Usage — from a scratch directory **outside** this repository:
 *   npm init -y && npm install jsewts tibetan-ewts-converter
 *   node /path/to/repo/scripts/verify-observance-names.mjs
 *
 * Built from `docs/names/observance-sourcing.md`, which was written before this script. That record
 * holds the proposed spellings, the marked word boundaries, THL's expected phonetics, the sources and
 * the five checks; this script holds them as data and re-checks every one on each run.
 *
 * ## Checks, per name
 *
 * 1. **Script** from two EWTS implementations that must agree.
 * 2. **A round trip** back to the Wylie it came from.
 * 3. **Witnesses.** A term: its head word must be attested by two of three groups — a Jäschke page
 *    read from the image, the Mahāvyutpatti's pairing, and a headword of the *tshig mdzod chen mo* or
 *    *dung dkar* (gate only: a headword exists, nothing quoted; both are one group, by Andreas'
 *    ruling of 2026-11-11). A person: two groups, each stating the proposed spelling itself, honorifics
 *    kept — equal to it or opening with it as whole words — from BDRC's person record, a gate-only
 *    headword, Lotsawa House's Tibetan page heading, or Tibetan Wikipedia; BDRC's record is also the
 *    identity anchor. Das's index is never a witness, because the aggregate's indexes list headwords
 *    their book does not print.
 * 4. **The sense is read, not the presence.** A Jäschke sense is carried as data read from the page
 *    image (archive.org `tibetanenglishdi00jsuoft`, image n = printed page + 25) with the index
 *    re-checked against its page; a Mahāvyutpatti sense is its Sanskrit pairing, read mechanically,
 *    and Monier-Williams is read through `entriesHeadedBy` where it carries the Sanskrit.
 * 5. **THL phonetics** in "Words separated by" mode from the record's marked Wylie, equal to the
 *    record's column, free of THL's "(?)" marker unless a recorded correction replaces it; and every
 *    marked word is a headword, or part of one, in a dictionary read.
 *
 * ## Corrections
 *
 * Two phonetics are corrections to THL's output by Andreas (2026-11-11), carried as data that states
 * the value THL is expected to return and the value corrected to. The run refuses if THL no longer
 * returns the expected value.
 *
 * Nothing is taken from the two copyrighted dictionaries but whether a headword exists.
 */

import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { entriesHeadedBy, provePredicates as proveColognePredicates } from "./cologne.mjs";
import {
	fetchAggregate,
	indexEntries,
	provePredicates as proveDictionaryPredicates,
} from "./tibetan-dictionary.mjs";

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
const UA = "tibetan-calendar-temporal fixture verification (https://github.com/nyamlen)";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const problems = [];
const fail = (id, check, message) => problems.push({ id, check, message });

// ---------------------------------------------------------------------------------------------
// The data: what the sourcing record proposes
// ---------------------------------------------------------------------------------------------

/**
 * `marked` joins the syllables of a word with a space and parts words with `-`, which THL's
 * "Words separated by" mode reads. `recordPhonetic` is the record's last column, and is what THL
 * must return for the marked Wylie, except where a correction is recorded below.
 */
const NAMES = [
	{
		id: "chotrul-duchen",
		kind: "term",
		wylie: "cho 'phrul dus chen",
		marked: "cho 'phrul-dus chen",
		recordPhonetic: "chontrül düchen",
		head: "dus chen",
		sense: [{ jaeschke: "dus chen" }],
	},
	{
		id: "saga-dawa-duchen",
		kind: "term",
		wylie: "sa ga zla ba dus chen",
		marked: "sa ga-zla ba-dus chen",
		recordPhonetic: "saga dawa düchen",
		head: "dus chen",
		sense: [{ jaeschke: "dus chen" }],
	},
	{
		id: "chokhor-duchen",
		kind: "term",
		wylie: "chos 'khor dus chen",
		marked: "chos 'khor-dus chen",
		recordPhonetic: "chönkhor düchen",
		head: "dus chen",
		sense: [{ jaeschke: "dus chen" }],
	},
	{
		id: "lhabab-duchen",
		kind: "term",
		wylie: "lha babs dus chen",
		marked: "lha babs-dus chen",
		recordPhonetic: "lhabap düchen",
		head: "dus chen",
		sense: [{ jaeschke: "dus chen" }],
	},
	{
		id: "saga-dawa-month",
		kind: "term",
		wylie: "sa ga zla ba",
		marked: "sa ga-zla ba",
		recordPhonetic: "saga dawa",
		head: "zla ba",
		sense: [{ mvy: ["zla ba", "māsaḥ"] }, { mw: "māsa", sentence: "a month or the 12th part" }],
	},
	{
		id: "sojong",
		kind: "term",
		wylie: "gso sbyong",
		marked: "gso sbyong",
		recordPhonetic: "sojong",
		head: "gso sbyong",
		sense: [{ mvy: ["gso sbyong", "poṣadhaḥ"] }],
	},
	{
		id: "fire-puja",
		kind: "term",
		wylie: "sbyin sreg",
		marked: "sbyin sreg",
		recordPhonetic: "jinsek",
		head: "sbyin sreg",
		sense: [{ mvy: ["sbyin sreg", "homaḥ"] }, { mw: "homa", sentence: "oblation with fire" }],
	},
	{
		id: "milarepa",
		kind: "person",
		anchor: "mi la ras pa",
		wylie: "mi la ras pa",
		marked: "mi la ras pa",
		recordPhonetic: "milarepa",
		bdrc: "P1853",
	},
	{
		id: "guru-rinpoche",
		kind: "person",
		anchor: "gu ru rin po che",
		wylie: "gu ru rin po che",
		marked: "gu ru-rin po che",
		recordPhonetic: "guru rinpoché",
		bdrc: "P4956",
	},
	{
		id: "gampopa",
		kind: "person",
		anchor: "sgam po pa",
		wylie: "sgam po pa",
		marked: "sgam po pa",
		recordPhonetic: "gampopa",
		bdrc: "P1844",
	},
	{
		id: "karmapa-16",
		kind: "person",
		anchor: "karma pa",
		wylie: "rgyal ba karma pa bcu drug pa",
		marked: "rgyal ba-karma pa-bcu drug pa",
		recordPhonetic: "gyelwa kama(?)pa chudrukpa",
		bdrc: "P865",
	},
	{
		id: "tsongkhapa",
		kind: "person",
		lotsawa: "tsongkhapa",
		anchor: "tsong kha pa",
		wylie: "rje tsong kha pa",
		marked: "rje-tsong kha pa",
		recordPhonetic: "jé tsongkhapa",
		bdrc: "P64",
	},
	{
		id: "sakya-pandita",
		kind: "person",
		anchor: "sa skya paN+Di ta",
		wylie: "sa skya paN+Di ta",
		marked: "sa skya-paN+Di ta",
		recordPhonetic: "sakya pandi(?)ta",
		bdrc: "P1056",
	},
	{
		id: "dudjom-rinpoche",
		kind: "person",
		lotsawa: "dudjom-rinpoche",
		anchor: "bdud 'joms",
		wylie: "bdud 'joms rin po che",
		marked: "bdud 'joms-rin po che",
		recordPhonetic: "dünjom rinpoché",
		bdrc: "P736",
	},
];

/**
 * Where a correction replaces THL's output. Each states the value THL is expected to return, so a
 * correction that stops being needed fails the run instead of silently patching a converter that has
 * since changed. The evidence is the project owner's knowledge of the pronunciation, a witness of a
 * different kind from a dictionary, and is recorded as such.
 */
const CORRECTIONS = [
	{
		id: "karmapa-16",
		thlExpected: "gyelwa kama(?)pa chudrukpa",
		correctedTo: "gyelwa karmapa chudrukpa",
		evidence: "Andreas, 2026-11-11: sure of the pronunciation karmapa; THL marks its own kama(?)pa",
	},
	{
		id: "sakya-pandita",
		thlExpected: "sakya pandi(?)ta",
		correctedTo: "sakya pandita",
		evidence:
			"Andreas, 2026-11-11: sure of the pronunciation pandita; THL marks its own pandi(?)ta",
	},
];

/**
 * The one name that ships on a single witness, as Andreas ruled on 2026-11-11 ("maybe accept one
 * witness for this one"). It is data, not a loosened check: it names the rule, the one group allowed
 * to stand alone and why, and it **self-invalidates** — the run refuses if that group stops stating the
 * spelling, or if a second group ever does (the exception is then unneeded). It applies to no other
 * name, and a name that is not a person is never eligible.
 */
const SINGLE_WITNESS_EXCEPTIONS = [
	{
		id: "karmapa-16",
		group: "Tibetan Wikipedia",
		why:
			"no source read prints rgyal ba karma pa bcu drug pa but the list of Tibetan scholars in Tibetan " +
			"Wikipedia: BDRC prints only the numeral form, the dictionaries head karma pa alone, and Lotsawa " +
			"House prints karma pa bcu drug pa under other honorifics (rgyal dbang, 'jig rten dbang phyug); " +
			"the sources Andreas supplied for him (rywiki, Buddha-Nature) answer the verifier with a " +
			"Cloudflare challenge, and a BDRC work part he supplied does not print it",
	},
];

/**
 * What was read in Jäschke's printed pages, by eye, from the page images (archive.org
 * `tibetanenglishdi00jsuoft`, image n = printed page + 25). **The aggregate's Jäschke index is not
 * evidence that a headword is printed**: it also lists headwords from later works (it has *bdud 'joms
 * rin po che* at a page of a book published in 1881), and it lists *gu ru rin po che* at p. 69, where
 * the page prints only *gú-ru*, "spiritual teacher". So a Jäschke witness is one of these rows, and the
 * index is used only to re-check that the headword is still where the row was read, to within two
 * pages. The scan's OCR is unusable, so a row is data carrying its page, image and what is printed.
 * Jäschke prints *g* as *y* in this transliteration (*yso-sbyoń-ba* for *gso sbyong ba*).
 */
const JAESCHKE_READ = [
	{
		forms: ["dus chen"],
		indexKey: "dus chen",
		page: 255,
		image: "n280",
		printed: "dus-čén, under dus (Comp.)",
		sense: "festival, byéd-pa to keep one",
	},
	{
		forms: ["cho 'phrul"],
		indexKey: "cho 'phrul",
		page: 161,
		image: "n186",
		printed: "čo-ʼprúl",
		sense: "magical trick, jugglery",
	},
	{
		forms: ["chos 'khor"],
		indexKey: "chos 'khor",
		page: 163,
		image: "n188",
		printed: "čos-ʼkór, under čos (Comp.)",
		sense: "vulgo prayer-mill",
	},
	{
		forms: ["sa ga"],
		indexKey: "sa ga",
		page: 570,
		image: "n595",
		printed: "sá-ga",
		sense: "n. of one of the lunar mansions, and hence also n. of a month, part of March and April",
	},
	{
		forms: ["zla ba"],
		indexKey: "zla ba",
		page: 490,
		image: "n515",
		printed: "zlá-ba",
		sense: "moon; temporal moon or month",
	},
	{
		forms: ["gso sbyong", "gso sbyong ba"],
		indexKey: "gso sbyong ba",
		page: 590,
		image: "n615",
		printed: "yso-sbyoń-ba",
		sense: "to get quit of sin by confession to a priest; a renewal of obligations",
	},
];

/** Printed by Jäschke on p. 570 as sa-skyá pandi-ta, "a famous Lama, born 1180": a variant spelling. */
const JAESCHKE_VARIANTS = {
	"sakya-pandita": { page: 570, image: "n595", printed: "sa-skyá pandi-ta" },
};

// ---------------------------------------------------------------------------------------------
// Small readers, proved before use
// ---------------------------------------------------------------------------------------------

/** The forms of a Wylie term a dictionary may print it under: itself, or with a nominalising ending. */
const forms = (wylie) => [wylie, `${wylie} ba`, `${wylie} pa`];

/** The words of a marked Wylie: parts separated by `-`. */
const wordsOf = (marked) => marked.split("-");

/** The marked Wylie with its boundaries made plain spaces: it must equal the unmarked Wylie. */
const unmarked = (marked) => marked.replaceAll("-", " ");

/** Whether `word` occurs in `keys` (joined with newlines) bounded by a space or a line edge. */
function isWholeWordIn(keys, word) {
	let at = keys.indexOf(word);
	while (at !== -1) {
		const before = at === 0 ? "\n" : keys[at - 1];
		const after = keys[at + word.length] ?? "\n";
		if ((before === " " || before === "\n") && (after === " " || after === "\n")) return true;
		at = keys.indexOf(word, at + 1);
	}
	return false;
}

/** The ewts labels of a BDRC JSON-LD record: names carry `bo-x-ewts`, with a trailing `/`. */
function ewtsLabels(record) {
	const out = new Set();
	for (const node of record["@graph"] ?? []) {
		for (const key of ["rdfs:label", "skos:prefLabel"]) {
			const value = node[key];
			if (value === undefined) continue;
			for (const v of Array.isArray(value) ? value : [value]) {
				if (typeof v === "object" && v["@language"]?.includes("ewts"))
					out.add(v["@value"].replace(/\/$/, "").trim());
			}
		}
	}
	return [...out];
}

/** Whether a label states `wylie`: equal to it, or opening with it as whole words. */
const labelStates = (label, wylie) => label === wylie || label.startsWith(`${wylie} `);

/** The `<textarea>` THL's page puts the phonetics in: the second one on the page. */
function thlPhoneticsOf(html) {
	const areas = [...html.matchAll(/<textarea[^>]*>([\s\S]*?)<\/textarea>/g)].map((m) =>
		m[1].trim(),
	);
	return areas[1];
}

function proveOwnPredicates() {
	const broken = [];
	if (forms("gso sbyong").join("|") !== "gso sbyong|gso sbyong ba|gso sbyong pa")
		broken.push("forms read wrongly");
	if (wordsOf("sa ga-zla ba-dus chen").join("|") !== "sa ga|zla ba|dus chen")
		broken.push("wordsOf split a marked Wylie wrongly");
	if (unmarked("sa ga-zla ba") !== "sa ga zla ba") broken.push("unmarked kept a boundary mark");
	const keys = "dus chen dge ba\nbdud 'joms\nsa ga zla ba";
	for (const [word, want] of [
		["dus chen", true],
		["zla ba", true],
		["dus", true],
		["bdud 'joms", true],
		["dus ch", false],
		["ga zla", true],
		["us chen", false],
		["joms", false],
	]) {
		if (isWholeWordIn(keys, word) !== want)
			broken.push(`isWholeWordIn("${word}") should be ${want}`);
	}
	const labels = ewtsLabels({
		"@graph": [
			{
				"skos:prefLabel": { "@language": "bo-x-ewts", "@value": "sgam po pa bsod nams rin chen/" },
			},
			{ "rdfs:label": { "@language": "zh-hans", "@value": "x" } },
		],
	});
	if (labels.join("|") !== "sgam po pa bsod nams rin chen") broken.push("ewtsLabels read wrongly");
	for (const [label, wylie, want] of [
		["mi la ras pa", "mi la ras pa", true],
		["sgam po pa bsod nams rin chen", "sgam po pa", true],
		["sgam po pak", "sgam po pa", false],
		["tsong kha pa blo bzang grags pa", "rje tsong kha pa", false],
	]) {
		if (labelStates(label, wylie) !== want) broken.push(`labelStates(${label}, ${wylie})`);
	}
	if (
		thlPhoneticsOf("<textarea>in</textarea><textarea class='eng'> saga dawa </textarea>") !==
		"saga dawa"
	)
		broken.push("thlPhoneticsOf read the wrong textarea");
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

async function fetchWithRetry(url, options, label) {
	for (let attempt = 0; attempt < 3; attempt++) {
		try {
			const response = await fetch(url, {
				...options,
				headers: { "User-Agent": UA, ...options?.headers },
			});
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

const mvy = mvyText
	.split("\n")
	.map((line) => line.split("|"))
	.filter((cells) => cells.length === 2)
	.map(([tibetan, sanskrit]) => ({ tibetan: tibetan.trim(), sanskrit: sanskrit.trim() }));

const INDEX = {
	"Jäschke 1881": indexEntries(jaeschkeText),
	"Das 1902": indexEntries(dasText),
	"tshig mdzod chen mo": indexEntries(tshigText),
	"dung dkar tshig mdzod chen mo": indexEntries(dungText),
};
const KEYS = Object.fromEntries(
	Object.entries(INDEX).map(([name, map]) => [name, [...map.keys()].join("\n")]),
);
KEYS.Mahāvyutpatti = mvy.map((e) => e.tibetan).join("\n");

/**
 * The headwords check 5 may test a marked word against: exactly what check 3 accepts as a witness —
 * the Mahāvyutpatti, the two Tibetan–Tibetan dictionaries (gate only) and the Jäschke pages read from
 * their images. The Jäschke and Das **indexes** are deliberately absent: they list headwords their
 * books do not print.
 */
const ACCEPTED_KEYS = {
	Mahāvyutpatti: KEYS.Mahāvyutpatti,
	"tshig mdzod chen mo": KEYS["tshig mdzod chen mo"],
	"dung dkar tshig mdzod chen mo": KEYS["dung dkar tshig mdzod chen mo"],
	"Jäschke 1881 (a page read)": JAESCHKE_READ.flatMap((r) => r.forms).join("\n"),
};

/** Where the aggregate's index puts a headword, as a printed page; Jäschke's leaf is the page + 26. */
function indexedPage(dictionary, headword) {
	const raw = INDEX[dictionary].get(headword)?.[0];
	if (raw === undefined) return null;
	const leaf = Number(raw.replace("?", ""));
	return Number.isNaN(leaf) ? null : dictionary === "Jäschke 1881" ? leaf - 26 : leaf;
}

/**
 * The Jäschke row for a term, if one was read: the row must name one of the term's forms, and the
 * index must still put its headword within two pages of where the page image was read.
 */
function jaeschkeRead(wylie) {
	const row = JAESCHKE_READ.find((r) => r.forms.some((f) => forms(wylie).includes(f)));
	if (!row) return { row: null, problem: null };
	const page = indexedPage("Jäschke 1881", row.indexKey);
	if (page === null) return { row, problem: `"${row.indexKey}" is no longer in Jäschke's index` };
	if (Math.abs(page - row.page) > 2)
		return {
			row,
			problem: `Jäschke's index puts "${row.indexKey}" at p. ${page}, not p. ${row.page}`,
		};
	return { row, problem: null };
}
const headInMvy = (wylie) => {
	for (const form of forms(wylie)) {
		const pair = mvy.find((e) => e.tibetan === form);
		if (pair) return { form, sanskrit: pair.sanskrit };
	}
	return null;
};

const stripHtml = (html) =>
	html
		.replace(/<[^>]+>/g, " ")
		.replace(/&nbsp;/g, " ")
		.replace(/&#\d+;/g, "")
		.replace(/\s{2,}/g, " ")
		.trim();

async function cologneEntries(slp1, iast) {
	const html = await fetchWithRetry(
		`https://www.sanskrit-lexicon.uni-koeln.de/scans/MWScan/2020/web/webtc/getword.php?key=${encodeURIComponent(slp1)}&filter=roman`,
		undefined,
		"Cologne",
	);
	await sleep(150);
	return /not found:/.test(html) ? [] : entriesHeadedBy(stripHtml(html), iast);
}
const MW_SLP1 = { māsa: "mAsa", homa: "homa" };

// ---------------------------------------------------------------------------------------------
// Checks 1 and 2: script from two converters, and a round trip
// ---------------------------------------------------------------------------------------------

const DISCOURAGED = ["ཱི", "ཷ", "ཹ", "ཱྀ"];
for (const name of NAMES) {
	if (unmarked(name.marked) !== name.wylie) {
		fail(name.id, 2, `the marked Wylie "${name.marked}" does not unmark to "${name.wylie}"`);
		continue;
	}
	const first = fromWylie(name.wylie);
	const second = secondConverter.to_unicode(name.wylie);
	if (first !== second) {
		fail(name.id, 1, `EWTS converters disagree on "${name.wylie}": ${first} vs ${second}`);
		continue;
	}
	const back = toWylie(first).trim();
	if (back !== name.wylie) {
		fail(name.id, 2, `"${name.wylie}" converts to ${first}, which reads back as "${back}"`);
		continue;
	}
	if (DISCOURAGED.some((c) => first.includes(c)))
		fail(name.id, 1, `${first} contains a discouraged composite vowel sign`);
	name.tibetan = first;
}

// ---------------------------------------------------------------------------------------------
// Checks 3 and 4: witnesses and the sense read
// ---------------------------------------------------------------------------------------------

const WIKI_UA = { "User-Agent": UA };
async function wikipediaJson(url) {
	for (let attempt = 0; attempt < 6; attempt++) {
		const text = await (await fetch(url, { headers: WIKI_UA })).text();
		try {
			return JSON.parse(text);
		} catch {
			await sleep(20000);
		}
	}
	throw new Error(`Tibetan Wikipedia kept refusing: ${url}`);
}

/** A Tibetan Wikipedia title (Tibetan titles end in a tsheg), following a redirect. Null if absent. */
async function wikipediaTitleFor(script) {
	const data = await wikipediaJson(
		`https://bo.wikipedia.org/w/api.php?action=query&redirects=1&format=json&titles=${encodeURIComponent(`${script}་`)}`,
	);
	await sleep(1500);
	const pages = Object.values(data.query?.pages ?? {});
	if (pages.length === 0 || pages[0].missing !== undefined) return null;
	return {
		source: "Tibetan Wikipedia title",
		entry: `${script}་${data.query.redirects ? " (a redirect)" : ""}`,
		page: null,
	};
}

const wikipediaListData = await wikipediaJson(
	`https://bo.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&titles=${encodeURIComponent("བོད་ཀྱི་མཁས་དབང་།")}`,
);
const wikipediaList =
	Object.values(wikipediaListData.query?.pages ?? {})[0]?.revisions?.[0]?.slots?.main?.["*"] ?? "";
if (wikipediaList.length < 500)
	fail("all", 3, "the Tibetan Wikipedia list article could not be read, or has shrunk");

const bdrcRecords = new Map();
for (const name of NAMES.filter((n) => n.kind === "person")) {
	try {
		const text = await fetchWithRetry(
			`https://purl.bdrc.io/resource/${name.bdrc}`,
			{ headers: { Accept: "application/ld+json" } },
			"BDRC",
		);
		bdrcRecords.set(name.id, JSON.parse(text));
		await sleep(150);
	} catch (error) {
		fail(name.id, 3, `BDRC record ${name.bdrc} could not be read: ${error.message}`);
	}
}

for (const name of NAMES) {
	name.provenance = { witnesses: [], sense: [], notes: [] };
	if (name.kind === "term") {
		const { row: jaeschke, problem: jaeschkeProblem } = jaeschkeRead(name.head);
		if (jaeschkeProblem) fail(name.id, 3, jaeschkeProblem);
		const sanskrit = headInMvy(name.head);
		const dasIndexed = INDEX["Das 1902"].has(name.head) || INDEX["Das 1902"].has(`${name.head} ba`);
		if (jaeschke && !jaeschkeProblem)
			name.provenance.witnesses.push({
				source: "Jäschke 1881",
				entry: jaeschke.printed,
				page: jaeschke.page,
			});
		if (sanskrit)
			name.provenance.witnesses.push({
				source: "Mahāvyutpatti",
				entry: `${sanskrit.form}|${sanskrit.sanskrit}`,
				page: null,
			});
		const headGate = ["tshig mdzod chen mo", "dung dkar tshig mdzod chen mo"].filter((d) =>
			forms(name.head).some((f) => INDEX[d].has(f)),
		);
		if (headGate.length > 0)
			name.provenance.witnesses.push({
				source: headGate.join(" and "),
				entry: name.head,
				page: null,
				gateOnly: true,
			});
		const independent =
			(jaeschke && !jaeschkeProblem ? 1 : 0) + (sanskrit ? 1 : 0) + (headGate.length > 0 ? 1 : 0);
		if (independent < 2)
			fail(
				name.id,
				3,
				`head word "${name.head}" has ${independent} independent witness group(s) read, not 2 ` +
					`(Jäschke page read: ${jaeschke ? `p. ${jaeschke.page}` : "none"}; ` +
					`Mahāvyutpatti: ${sanskrit ? sanskrit.sanskrit : "no"}; ` +
					`Tibetan–Tibetan headword (gate only, one group): ${headGate.join(", ") || "neither"}; ` +
					`Das's index ${dasIndexed ? "lists it, but an index entry is not a page read" : "does not list it"})`,
			);
		const gate = ["tshig mdzod chen mo", "dung dkar tshig mdzod chen mo"].filter((d) =>
			INDEX[d].has(name.wylie),
		);
		name.provenance.notes.push(
			`whole term: Jäschke row ${jaeschkeRead(name.wylie).row ? "read" : "none"}, Mahāvyutpatti ${headInMvy(name.wylie) ? "yes" : "no"}, gate-only headword in ${gate.join(", ") || "neither Tibetan–Tibetan dictionary"}`,
		);

		for (const claim of name.sense) {
			if (claim.jaeschke) {
				const { row, problem } = jaeschkeRead(claim.jaeschke);
				if (!row) fail(name.id, 4, `no Jäschke row was read for "${claim.jaeschke}"`);
				else if (problem) fail(name.id, 4, problem);
				else
					name.provenance.sense.push({
						source: "Jäschke 1881",
						entry: row.printed,
						page: row.page,
						sense: row.sense,
					});
			} else if (claim.mvy) {
				const [tibetan, sanskrit] = claim.mvy;
				if (!mvy.some((e) => e.tibetan === tibetan && e.sanskrit === sanskrit))
					fail(name.id, 4, `the Mahāvyutpatti no longer pairs "${tibetan}" with ${sanskrit}`);
				else
					name.provenance.sense.push({
						source: "Mahāvyutpatti",
						entry: `${tibetan}|${sanskrit}`,
						page: null,
						sense: `paired with ${sanskrit}`,
					});
			} else if (claim.mw) {
				try {
					const entries = await cologneEntries(MW_SLP1[claim.mw], claim.mw);
					const found = entries.find((e) => e.body.includes(claim.sentence));
					if (!found)
						fail(
							name.id,
							4,
							`no Monier-Williams entry headed ${claim.mw} prints "${claim.sentence}" (found on pp. ${entries.map((e) => e.page)})`,
						);
					else
						name.provenance.sense.push({
							source: "Monier-Williams 1899",
							entry: claim.mw,
							page: found.page,
							sense: claim.sentence,
						});
				} catch (error) {
					fail(name.id, 4, `Cologne lookup failed: ${error.message}`);
				}
			}
		}
		if (name.sense.length > 0 && name.provenance.sense.length === 0)
			fail(name.id, 4, "no sense was read for this name");
	} else {
		const record = bdrcRecords.get(name.id);
		const groups = new Map();
		const states = [];
		if (record) {
			const labels = ewtsLabels(record);
			const types = (record["@graph"] ?? []).filter((n) => n["@id"] === `bdr:${name.bdrc}`);
			if (types.length === 0 || !String(types[0]["@type"]).includes("Person"))
				fail(name.id, 3, `BDRC ${name.bdrc} is not a Person record`);
			if (!labels.some((l) => l.includes(name.anchor)))
				fail(
					name.id,
					3,
					`BDRC bdr:${name.bdrc} has no name containing "${name.anchor}": ${labels.join("; ")}`,
				);
			const stated = labels.find((l) => labelStates(l, name.wylie));
			if (stated)
				groups.set("BDRC", {
					source: "BDRC person record",
					entry: `bdr:${name.bdrc}`,
					page: null,
					label: stated,
				});
			else states.push(`BDRC bdr:${name.bdrc} states none (its Wylie names: ${labels.join("; ")})`);
		}
		const gateKeys = ["tshig mdzod chen mo", "dung dkar tshig mdzod chen mo"].flatMap((d) =>
			[...INDEX[d].keys()].filter((k) => labelStates(k, name.wylie)).map((k) => ({ d, k })),
		);
		if (gateKeys.length > 0)
			groups.set("Tibetan–Tibetan dictionaries", {
				source: [...new Set(gateKeys.map((g) => g.d))].join(" and "),
				entry: gateKeys
					.map((g) => g.k)
					.slice(0, 3)
					.join("; "),
				page: null,
				gateOnly: true,
			});
		else states.push("neither Tibetan–Tibetan dictionary heads it");
		if (name.lotsawa) {
			try {
				const html = await fetchWithRetry(
					`https://www.lotsawahouse.org/bo/tibetan-masters/${name.lotsawa}/`,
					undefined,
					"Lotsawa House",
				);
				const title = /<h1 class="bo">([^<]*)<\/h1>/.exec(html)?.[1]?.replace(/།$/, "").trim();
				if (title === name.tibetan)
					groups.set("Lotsawa House", {
						source: "Lotsawa House",
						entry: `/bo/tibetan-masters/${name.lotsawa}/ (page heading)`,
						page: null,
					});
				else states.push(`Lotsawa House's heading is "${title}"`);
			} catch (error) {
				fail(name.id, 3, `Lotsawa House lookup failed: ${error.message}`);
			}
		}
		const wikiTitle = await wikipediaTitleFor(name.tibetan);
		const wikipedia = [];
		if (wikiTitle === null) states.push("no Tibetan Wikipedia title");
		else wikipedia.push(wikiTitle);
		if (wikipediaList.includes(`* ${name.tibetan}།`))
			wikipedia.push({
				source: "Tibetan Wikipedia, the list in the article བོད་ཀྱི་མཁས་དབང་།",
				entry: name.tibetan,
				page: null,
			});
		else states.push("not listed in the Tibetan Wikipedia article བོད་ཀྱི་མཁས་དབང་།");
		// A title and a list item are one site and one editing community: one group, however many pages.
		if (wikipedia.length > 0) groups.set("Tibetan Wikipedia", wikipedia);
		for (const w of groups.values()) name.provenance.witnesses.push(...[w].flat());
		const variant = JAESCHKE_VARIANTS[name.id];
		if (variant)
			name.provenance.notes.push(
				`Jäschke p. ${variant.page} prints "${variant.printed}", a variant spelling, so not a witness to "${name.wylie}"`,
			);
		const exception = SINGLE_WITNESS_EXCEPTIONS.find((e) => e.id === name.id);
		name.singleWitness = false;
		if (exception) {
			const only = [...groups.keys()];
			if (only.length !== 1 || only[0] !== exception.group)
				fail(
					name.id,
					3,
					`the single-witness exception for ${name.id} expects exactly "${exception.group}" and no other group, but ${only.length === 0 ? "no group states the spelling" : `found ${only.join(", ")}`}` +
						`${only.length > 1 ? " — a second witness exists, so the exception is no longer needed" : ""}; not found: ${states.join("; ")}`,
				);
			else name.singleWitness = true;
		} else if (groups.size < 2)
			fail(
				name.id,
				3,
				`"${name.wylie}" has ${groups.size} independent witness(es) stating that spelling, not 2 (${[...groups.keys()].join(", ") || "none"}); not found: ${states.join("; ")}`,
			);
		if (record && (groups.size >= 2 || name.singleWitness))
			name.provenance.sense.push({
				source: "BDRC person record",
				entry: `bdr:${name.bdrc}`,
				page: null,
				sense: "a person record: the sense is biographical by kind",
			});
	}
}

// ---------------------------------------------------------------------------------------------
// Check 5: THL phonetics with the boundaries marked, and each marked word a headword
// ---------------------------------------------------------------------------------------------

async function thlFor(marked) {
	const html = await fetchWithRetry(
		"https://old.thlib.org/cgi-bin/thl/lbow/phonetics.pl",
		{
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				input: marked,
				type: "thl",
				words: "sep",
				sep_join: "-",
				send: "Make Phonetics",
			}),
		},
		"THL",
	);
	return thlPhoneticsOf(html);
}

for (const exception of SINGLE_WITNESS_EXCEPTIONS) {
	if (NAMES.find((n) => n.id === exception.id)?.kind !== "person")
		fail(exception.id, 3, "a single-witness exception names no person here");
}
for (const correction of CORRECTIONS) {
	if (!NAMES.some((n) => n.id === correction.id))
		fail(correction.id, 5, "a correction names a rule that has no name here");
}

for (const name of NAMES) {
	let thl;
	try {
		thl = await thlFor(name.marked);
		await sleep(150);
	} catch (error) {
		fail(name.id, 5, `THL lookup for "${name.marked}" failed: ${error.message}`);
		continue;
	}
	if (!thl) {
		fail(name.id, 5, `THL returned no phonetics for "${name.marked}"`);
		continue;
	}
	name.thl = thl;
	const correction = CORRECTIONS.find((c) => c.id === name.id);
	if (correction) {
		if (thl !== correction.thlExpected)
			fail(
				name.id,
				5,
				`correction for ${name.id} is no longer justified: it expects THL to return "${correction.thlExpected}", but THL returned "${thl}"`,
			);
		if (name.recordPhonetic !== correction.thlExpected)
			fail(
				name.id,
				5,
				`the record's column for ${name.id} is not the value the correction expects`,
			);
		name.phonetic = correction.correctedTo;
		name.corrected = correction;
	} else {
		if (thl.includes("(?)"))
			fail(name.id, 5, `THL returned "${thl}", which carries its own uncertainty marker "(?)"`);
		else if (thl !== name.recordPhonetic)
			fail(name.id, 5, `THL returned "${thl}", not the record's "${name.recordPhonetic}"`);
		name.phonetic = thl;
		name.corrected = null;
	}
	for (const word of wordsOf(name.marked)) {
		// A rung of Tibetan morphology, as in `forms`: an ordinal or agent ending (-pa, -ba) may be absent
		// from the headword that carries the stem (bcu drug pa, "sixteenth", against bcu drug).
		const stem = word.replace(/ [pb]a$/, "");
		const inDictionaries = Object.keys(ACCEPTED_KEYS).filter(
			(d) => isWholeWordIn(ACCEPTED_KEYS[d], word) || isWholeWordIn(ACCEPTED_KEYS[d], stem),
		);
		if (inDictionaries.length === 0)
			fail(
				name.id,
				5,
				`marked word "${word}" is part of no headword that check 3 accepts (the Mahāvyutpatti, the two Tibetan–Tibetan dictionaries, a Jäschke page read)`,
			);
		name.provenance.notes.push(
			`marked word "${word}" is part of a headword in: ${inDictionaries.join(", ")}`,
		);
	}
}

// ---------------------------------------------------------------------------------------------
// Report, then emit only if everything held
// ---------------------------------------------------------------------------------------------

const failed = (id, check) => problems.some((p) => p.id === id && p.check === check);
console.log("name                 1  2  3  4  5  phonetic");
for (const name of NAMES) {
	const marks = [1, 2, 3, 4, 5].map((c) => (failed(name.id, c) ? "x" : "."));
	console.log(`${name.id.padEnd(20)} ${marks.join("  ")}  ${name.phonetic ?? "-"}`);
}
for (const name of NAMES) {
	const cited = (c) =>
		`${c.source} "${c.entry}"${c.page ? ` p. ${c.page}` : ""}${c.gateOnly ? " (gate)" : ""}`;
	console.log(
		`  ${name.id}: witnesses ${name.provenance.witnesses.map(cited).join("; ") || "none"}`,
	);
	console.log(`  ${name.id}: sense ${name.provenance.sense.map(cited).join("; ") || "none"}`);
	for (const note of name.provenance.notes) console.log(`  ${name.id}: ${note}`);
}

if (problems.length > 0) {
	const ids = new Set(problems.map((p) => p.id));
	console.error(
		`\n${NAMES.length - ids.size} of ${NAMES.length} names passed; ${problems.length} problem(s); nothing written:\n`,
	);
	for (const p of problems) console.error(`  - ${p.id} [check ${p.check}]: ${p.message}`);
	process.exit(1);
}

const q = (s) => JSON.stringify(s);
const cite = (c) =>
	`{ source: ${q(c.source)}, entry: ${q(c.entry)}, page: ${c.page ?? "null"}${c.label ? `, label: ${q(c.label)}` : ""}${c.gateOnly ? ", gateOnly: true" : ""} }`;
const row = (n) =>
	`\t{ id: ${q(n.id)}, kind: ${q(n.kind)}, tibetan: ${q(n.tibetan)}, wylie: ${q(n.wylie)}, marked: ${q(n.marked)}, phonetic: ${q(n.phonetic)}, thlPhonetic: ${q(n.thl)}, phoneticCorrected: ${n.corrected ? "true" : "false"}, singleWitness: ${n.singleWitness ? "true" : "false"}, witnesses: [${n.provenance.witnesses.map(cite).join(", ")}], sense: [${n.provenance.sense.map((s) => `{ ${cite(s).slice(2, -2)}, sense: ${q(s.sense)} }`).join(", ")}] },`;

writeFileSync(
	join(root, "test", "fixtures", "observance-names.ts"),
	`/**
 * The Tibetan names of the fourteen observances that ship one, verified against independent sources.
 *
 * @remarks
 * GENERATED by \`scripts/verify-observance-names.mjs\` on ${new Date().toISOString().slice(0, 10)}. Do not edit by hand —
 * re-run the script, then \`npx biome check --write test/fixtures/observance-names.ts\`.
 * The record, the five checks and the open questions are in \`docs/names/observance-sourcing.md\`.
 *
 * The script read the Mahāvyutpatti, Das, Jäschke, the two Tibetan–Tibetan dictionaries (headword
 * existence only), Monier-Williams through Cologne, BDRC's person records and THL's converter.
 *
 * \`marked\` is the Wylie with word boundaries marked by \`-\`, which THL's "Words separated by" mode
 * turned into \`thlPhonetic\`. \`phonetic\` is that, except where \`phoneticCorrected\` is true: then it is
 * Andreas' correction of a "(?)" in THL's output, held in the script as data that refuses to run if THL
 * stops returning the expected value.
 *
 * \`singleWitness\` is true for the one name that ships on a single witness, by Andreas' ruling of
 * 2026-11-11: the Sixteenth Karmapa, whose only witness to \`rgyal ba karma pa bcu drug pa\` is the list
 * of Tibetan scholars in Tibetan Wikipedia. It is an exception held as data in the script, which
 * refuses to run if it is needed for any other name or if a second witness appears.
 */

export interface ObservanceNameCitation {
	source: string;
	entry: string;
	page: number | null;
	label?: string;
	gateOnly?: true;
}

export interface ObservanceNameRow {
	id: string;
	kind: "term" | "person";
	tibetan: string;
	wylie: string;
	marked: string;
	phonetic: string;
	thlPhonetic: string;
	phoneticCorrected: boolean;
	singleWitness: boolean;
	witnesses: readonly ObservanceNameCitation[];
	sense: readonly (ObservanceNameCitation & { sense: string })[];
}

export const OBSERVANCE_NAMES: readonly ObservanceNameRow[] = [
${NAMES.map(row).join("\n")}
];
`,
);

console.log(`\nall ${NAMES.length} names passed; wrote test/fixtures/observance-names.ts`);
