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
	rows.push({ n: Number(m[1]), wylie: m[5].trim(), years: [Number(m[7]), Number(m[8])] });
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
// The IAST column is cited to Sewell & Fleet but reaches us through the Wikipedia samvatsara table,
// and at two positions the two disagree. Each correction is applied only after the *original* is
// confirmed still present, so it self-invalidates: if the table is ever fixed upstream, this script
// says so rather than silently applying a patch that is no longer needed.
//
// Only positions where the Wikipedia reading is contradicted by BOTH other lineages are corrected.
// Two further discrepancies are recorded and deliberately NOT corrected, because choosing between
// the candidates would be authorship rather than sourcing -- see DISCREPANCIES below.
// ---------------------------------------------------------------------------------------------

const CORRECTIONS = [
	{
		n: 60,
		fromIast: "Akshaya",
		toIast: "Kshaya",
		toDevanagari: "क्षय",
		why:
			"Sewell & Fleet give Kshaya at position 60 (modal reading, 82% of 49 occurrences) and the " +
			"string 'Akshaya' appears nowhere in the book. Janson has `ksayaka`, and the Tibetan is " +
			"`zad pa`, exhaustion -- ksaya, not a-ksaya, which is its opposite. Three lineages against " +
			"the Wikipedia table's reading.",
	},
	{
		n: 31,
		fromIast: "Hevilambi",
		toIast: "Hemalamba",
		toDevanagari: "हेमलम्ब",
		why:
			"Sewell & Fleet give Hemalamba at 31, Janson has `hemalambha`, and English Wiktionary's " +
			"entry at हेमलम्ब reads 'Name of the 31st year of Jupiter's cycle of 60 years' -- a third " +
			"lineage naming the position outright.",
	},
];

for (const c of CORRECTIONS) {
	const row = rows.find((r) => r.n === c.n);
	if (!row) {
		fail(`correction for position ${c.n} has nothing to correct`);
		continue;
	}
	if (row.iast !== c.fromIast) {
		fail(
			`correction at ${c.n} expected "${c.fromIast}" but the source now reads "${row.iast}" -- ` +
				"re-check whether the correction is still needed",
		);
		continue;
	}
	row.iastCorrectedFrom = row.iast;
	row.devanagariCorrectedFrom = row.devanagari;
	row.iast = c.toIast;
	row.devanagari = c.toDevanagari;
	console.log(`correcting ${c.n}: ${c.fromIast} -> ${c.toIast}`);
}

/**
 * Recorded, not corrected. At these positions the sources disagree and no reading is clearly right,
 * so choosing one would manufacture authority rather than source it. They are emitted into the
 * provenance document so a reader sees the conflict instead of a smoothed-over column.
 */
const DISCREPANCIES = [
	{
		n: 15,
		note:
			"Wikipedia has Vrisapraja; Sewell has Vrisha; Janson has `brisabha` (vrisabha); the Tibetan " +
			"`khyu mchog` is 'chief bull'. Sewell and Janson point at a bull-name and the Tibetan agrees, " +
			"but they point at two different ones (vrisa against vrisabha), so there is no single " +
			"corrected reading to apply.",
	},
	{
		n: 37,
		note:
			"Wikipedia has Sobhakrit; Sewell and Janson both have Sobhana. The Tibetan `mdzes byed` is " +
			"'beautifying', which renders sobhakrit (making beautiful) more closely than sobhana " +
			"(beautiful). So the Indic sources agree with each other and the Tibetan agrees with " +
			"Wikipedia -- a genuine split, not an error to fix.",
	},
];

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
	for (const c of CORRECTIONS) {
		const seen = modal(c.n);
		if (!seen) {
			fail(`Sewell supplied but position ${c.n} has no readings -- check the OCR text`);
			continue;
		}
		const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/ksh/g, "ks");
		if (fold(seen) !== fold(c.toIast)) {
			fail(
				`Sewell's modal reading at ${c.n} is "${seen}", but the correction applies "${c.toIast}". ` +
					"The correction's stated evidence no longer holds -- re-argue it.",
			);
		} else {
			console.log(`Sewell confirms ${c.n}: ${seen}`);
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

// ---------------------------------------------------------------------------------------------
// 6. Wiktionary: lexical existence, and the cycle position where the entry states it.
// ---------------------------------------------------------------------------------------------

async function sanskritEntry(devanagari) {
	const url =
		"https://en.wiktionary.org/w/api.php?action=parse&format=json&prop=wikitext&page=" +
		encodeURIComponent(devanagari);
	const response = await fetch(url, { headers: { "User-Agent": UA } });
	if (!response.ok) throw new Error(`Wiktionary returned ${response.status}`);
	const wikitext = (await response.json()).parse?.wikitext?.["*"];
	if (!wikitext) return null;
	const at = wikitext.indexOf("==Sanskrit==");
	if (at === -1) return null;
	const section = wikitext.slice(at, at + 3000);
	const senses = [...section.matchAll(/^#\s+(.+)/gm)]
		.map((m) =>
			m[1]
				.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1")
				.replace(/\{\{[^}]*\}\}/g, "")
				.trim(),
		)
		.filter(Boolean)
		.slice(0, 6);
	// Entries state MORE THAN ONE position -- "the first or 35th year", "the 12th (3rd) year" --
	// because the Jovian cycle has competing reckonings that differ by a fixed offset. Collect every
	// number in the cycle sense; a match against any one of them is agreement. Reading only the first
	// number found reports position 1 as the 35th.
	// The sense must name the SIXTY-year cycle. Accepting any sense that mentions Jupiter is too
	// loose: तारण's entry reads "the 3rd year of the 4th Jupiter cycle", which is a cycle-and-position
	// reference like the rabjung's own numbering, not a position in the list of sixty names.
	const cycleSense = [...section.matchAll(/^#\s+(.*(?:60|sixty)[\s-]*years?.*)/gim)]
		.map((m) => m[1])
		.join(" ");
	const stated = [...cycleSense.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)?\b/g)]
		.map((m) => Number(m[1]))
		.filter((n) => n >= 1 && n <= 60);
	if (/\bfirst\b/i.test(cycleSense)) stated.push(1);
	return { senses, statedPositions: [...new Set(stated)] };
}

for (const r of rows) {
	try {
		const entry = await sanskritEntry(r.devanagari);
		r.attested = entry !== null;
		r.senses = entry?.senses ?? [];
		r.statedPositions = entry?.statedPositions ?? [];
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
		fail(`position ${r.n}: Wiktionary lookup for ${r.devanagari} failed -- ${error.message}`);
	}
}

/**
 * The attestation column cannot fail a row -- not every name has an entry -- so it needs an anchor,
 * or a change in the API's shape would silently mark all sixty unattested and be recorded as a fact
 * about Sanskrit lexicography rather than about our HTTP client.
 */
const ANCHORS = [1, 29, 31, 52];
for (const n of ANCHORS) {
	const r = rows.find((row) => row.n === n);
	if (!r?.attested) {
		fail(
			`anchor position ${n} (${r?.devanagari}) is not attested. These four are known to have ` +
				"Sanskrit entries, so this means the lookup is broken, not that the name is unattested.",
		);
	}
}

// ---------------------------------------------------------------------------------------------
// 7. Phonetics, from THL's converter -- the publisher of the standard.
// ---------------------------------------------------------------------------------------------

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
 * on the script and it read back as the same Wylie; THL supplied the phonetics; and the IAST and
 * Devanagari came from the Indic samvatsara list, joined to Janson's by a Gregorian-year check that
 * has to agree on both years of all sixty rows.
 *
 * \`attested\` records whether English Wiktionary has a Sanskrit entry at that Devanagari headword.
 * It is evidence, not a gate -- not every name has an entry -- so four anchor positions known to
 * have entries are checked, and the run aborts if they stop resolving.
 */

export interface RabjungNameFixtureRow {
	/** Position in the cycle, 1-60. */
	position: number;
	tibetan: string;
	wylie: string;
	/** THL Simplified Phonetic Transcription. */
	phonetic: string;
	devanagari: string;
	iast: string;
	/** Gregorian years in the 16th and 17th rabjung cycles carrying this name. */
	years: [number, number];
	/** English Wiktionary has a Sanskrit entry at \`devanagari\`. */
	attested: boolean;
}

export const RABJUNG_NAMES: readonly RabjungNameFixtureRow[] = [
${rows
	.map(
		(r) =>
			`\t{ position: ${r.n}, tibetan: ${quote(r.tibetan)}, wylie: ${quote(r.wylie)}, phonetic: ${quote(r.phonetic)}, devanagari: ${quote(r.devanagari)}, iast: ${quote(r.iast)}, years: [${r.years[0]}, ${r.years[1]}], attested: ${r.attested} },`,
	)
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

const firstSense = (r) => (r.senses?.[0] ?? "").replace(/\|/g, "\\|").slice(0, 70);
const docRow = (r) =>
	`| ${r.n} | ${r.tibetan} | \`${r.wylie}\` | *${r.phonetic}* | ${r.devanagari} | ${r.iast} | ` +
	`${(AUTHORED[String(r.n)]?.english ?? "").replace(/\|/g, "\\|")} | ${firstSense(r)} | ` +
	`${r.positionConfirmed ? "yes" : "—"} | ${r.years[0]}, ${r.years[1]} |`;

writeFileSync(
	join(root, "docs", "rabjung-names.md"),
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
| Wikipedia saṃvatsara table | IAST, Devanāgarī | The only machine-readable source found carrying diacritics **and** Devanāgarī together. Sewell has neither | **Sourced**, corrected below |
| Sewell & Fleet, *The Siddhāntas and the Indian Calendar* (1924) | **Name identity only** — which name sits at which position | The authority the IAST column is *cited* to. It cannot check spelling: it prints \`Sukla\`, \`Vrisha\`, \`Kshaya\` in 1924 romanisation with **no IAST diacritics anywhere** | **Sourced**, by majority vote over thousands of OCR reads |
| English Wiktionary | That a Devanāgarī headword exists as a Sanskrit word; the cycle position where the entry states it; the Sanskrit senses | A third lineage independent of both Janson and Sewell, and the only one that names positions outright. Also the only sourced material for an English meaning — Sewell prints none, checked directly | **Sourced** |
| \`jsewts\` + \`tibetan-ewts-converter\` | Tibetan script | Two independent implementations required to agree, then to read back as the Wylie they came from | **Derived**, doubly |
| THL phonetics converter | THL Simplified phonetics | The publisher of the standard | **Sourced** |

**Janson's ASCII Sanskrit is deliberately not used.** It collides three names onto \`pramadi\`,
carries no Devanāgarī, and he flags its spellings as varying between sources. With IAST in hand it
is never needed.

**Why Sewell is consulted by majority vote.** Its scan is OCR and noisy — \`Ksliaya\`, \`Manniathn\`,
\`Ahgiras\`. No single occurrence is trusted. The book prints "N Name" thousands of times across its
year-conversion tables, so the modal spelling at each position over thousands of reads is taken
instead: OCR errors scatter, the true reading does not.

## Corrections applied, with their evidence

The IAST column is cited to Sewell & Fleet but reaches us through the Wikipedia saṃvatsara table,
and the two disagree in two places. Each correction is applied only after the **original is
confirmed still present**, so it self-invalidates: if the table is fixed upstream, the script says so
rather than silently applying a patch that is no longer needed.

${CORRECTIONS.map((c) => `- **Position ${c.n}: ${c.fromIast} → ${c.toIast}.** ${c.why}`).join("\n")}
${WYLIE_CORRECTIONS.map((c) => `- **Position ${c.n}, Wylie: \`${c.from}\` → \`${c.to}\`.** ${c.why}`).join("\n")}

## Discrepancies recorded, not corrected

At these positions the sources disagree and no reading is clearly right, so choosing one would
manufacture authority rather than source it.

${DISCREPANCIES.map((d) => `- **Position ${d.n}.** ${d.note}`).join("\n")}

## The two English columns

They gloss **different names**, and that is the point of showing both.

- **English (Tibetan)** is **authored, not sourced.** It glosses the Tibetan name, written for this
  table. No source gives English for these — Sewell & Fleet prints the sixty as bare names against
  Kaliyuga years and fractional day-counts, with no meaning column, checked directly.
- **Sanskrit sense** is the first sense of the Devanāgarī headword on English Wiktionary. **Sourced,
  but a selection**: entries carry several senses, often from different roots, so which one applies
  is an editorial judgement. \`क्षय\` offers "decay, corrosion" alongside "dominion, place of abode".

**Position confirmed** marks rows where Wiktionary's own entry states the cycle position, which is
a third lineage agreeing on the alignment rather than on the spelling.

## The table

| # | Tibetan | Wylie | THL | Devanāgarī | IAST | English (Tibetan, authored) | Sanskrit sense (sourced) | Position confirmed | Years |
|---|---|---|---|---|---|---|---|---|---|
${rows.map(docRow).join("\n")}
`,
);

console.log(
	`\nall ${rows.length} rows passed; wrote test/fixtures/rabjung-names.ts and docs/rabjung-names.md`,
);
