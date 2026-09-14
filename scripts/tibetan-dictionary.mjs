#!/usr/bin/env node
/**
 * Reading Tibetan dictionaries for **facts**, shared by `survey-ngonjo.mjs`,
 * `verify-rabjung-names.mjs` and `verify-month-and-yoga-names.mjs`.
 *
 * ## The plain version
 *
 * English has two words for a horse: *horse*, which you say out loud, and *steed*, which belongs in
 * a poem. A good dictionary puts a little label next to *steed* saying **poetic**, so you know not
 * to use it in a shop.
 *
 * Tibetan does the same, and its label is `(mngon)` — short for མངོན་བརྗོད *ngönjö*, poetic synonym
 * (abhidhāna अभिधान). The sixty rabjung year names are all *steed* words: 54 of the sixty carry that
 * label on the sense that says which year they name. That is why nobody can guess what one of these
 * names means from ordinary Tibetan, and why an English gloss for them has to be checked rather than
 * assumed.
 *
 * ## What may be taken from these dictionaries, and what may not
 *
 * They are modern copyrighted works published through an aggregate whose README says, in capitals,
 * that copyright stays with the respective authors. So they may **gate** and may never be
 * **quoted** — the standing wisdomlib already has here. Exactly seven facts are taken:
 *
 * | Takeable — fact | Not takeable — expression |
 * |---|---|
 * | That a headword exists at this Wylie | The wording of any gloss |
 * | The cycle position an entry states | The phrasing of a definition |
 * | The element–animal year an entry states | |
 * | The register tag on a sense | |
 * | The spelling of each member of a set an entry enumerates | |
 * | The element pair an enumeration assigns to each member | |
 * | The grouping an enumeration states — each group's name and size | |
 *
 * Nothing here returns gloss text, and no caller may write one to a file.
 *
 * The fifth was approved on 2026-09-13 for `verify-month-and-yoga-names.mjs`, which reads the ten
 * elemental-yoga names out of the enumerations under `'phrod sbyor` and `'phrod sbyor bcu`. The
 * sixth and seventh were approved on 2026-09-14 for the same script: the *tshig mdzod chen mo*'s
 * enumeration pairs each name with its elements, and closes by grouping the ten as three, three, three
 * and one. It states the groups' sizes and never their members, so membership is not a fact taken
 * from it — the script infers it from list order and says so in every output.
 *
 * ## Three ways reading them goes wrong, each found the hard way
 *
 * 1. **`(mngon)` has two scopes.** `{(mngon)} 1) {…} 2) {…}` tags the whole entry; `4) {(mngon) …}`
 *    tags that sense alone. Asking "does the entry contain `(mngon)`" conflates them and counts an
 *    entry whose *year* sense is ordinary vocabulary.
 * 2. **The year is not written the way a calendar writes it.** These dictionaries drop the gender
 *    and abbreviate the animal — `me byi lo`, not `me pho byi ba` — and spell the monkey three ways
 *    (`spre`, `sprel`, `spre'u`). Matching a calendar's spelling scored 8 of 60 against the true 57.
 * 3. **A reverse sweep looks stronger and is worse.** Searching the whole dictionary for a year
 *    string returns mostly biographies — "born in the water-horse year" — and requiring the trailing
 *    `lo` those sentences carry drops the entries that write the year bare.
 *
 * A fourth, specific to the English-glossing pair: they state the position as `40th`, `34'th` and
 * `the fifteenth` alike, so a digit-only reader silently under-counts.
 *
 * ## Why the year is computed, never read
 *
 * Every caller passes the Gregorian year it derived for itself and asks whether the source agrees.
 * A source's own identification is then verified rather than trusted — the Tibetan-side analogue of
 * the Bṛhat Saṃhitā position check. {@link provePredicates} runs first and reports "the checker
 * itself is broken" rather than a violation, because a wrong sign arithmetic would report every
 * source as disagreeing and look exactly like a source that had changed.
 */

/**
 * The three dictionaries, with the lineage note that stops them being miscounted as three witnesses.
 *
 * Ives Waldo and Rangjung Yeshe are overlapping modern compilations, so they are close to **one**
 * witness. Any count of "how many sources agree" must collapse them; the independent legs are the
 * *tshig mdzod chen mo*, Jäschke and Das by printed page, and Csoma.
 */
export const DICTIONARIES = [
	{
		id: "waldo",
		label: "Ives Waldo",
		file: "08-IvesWaldo",
		lineage: "modern-compilation",
		glossesInto: "english",
	},
	{
		id: "rangjung",
		label: "Rangjung Yeshe",
		file: "02-RangjungYeshe",
		lineage: "modern-compilation",
		glossesInto: "english",
	},
	{
		id: "tshigmdzod",
		label: "tshig mdzod chen mo",
		file: "25-tshig-mdzod-chen-mo-Tib",
		lineage: "tibetan-tibetan",
		glossesInto: "tibetan",
	},
];

const RAW =
	"https://raw.githubusercontent.com/christiansteinert/tibetan-dictionary/master/_input/dictionaries/public";

/** Wylie, as a calendar writes them. */
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
/** The spellings the dictionaries actually use, which a calendar's do not cover. */
const WYLIE_ALIASES = { spre: "(?:spre'u|sprel|spre)", byi: "(?:byi\\s+ba|byi)" };

const ELEMENTS_EN = ["wood", "fire", "earth", "iron", "water"];
const ANIMALS_EN = [
	"mouse",
	"ox",
	"tiger",
	"hare",
	"dragon",
	"snake",
	"horse",
	"sheep",
	"monkey",
	"bird",
	"dog",
	"pig",
];
/** English names these dictionaries use that a calendar does not. */
const ENGLISH_ALIASES = {
	mouse: ["mouse", "rat"],
	hare: ["hare", "rabbit"],
	sheep: ["sheep", "goat", "ram"],
	bird: ["bird", "fowl", "rooster", "cock"],
	pig: ["pig", "boar", "hog"],
	ox: ["ox", "bull", "cow"],
};

const mod = (a, b) => ((a % b) + b) % b;

/**
 * Element, gender and animal of a Gregorian year, in Wylie and in English.
 *
 * 1027 opens the first rabjung and is fire-female-hare.
 */
export function signsForYear(year) {
	const n = year - 1027;
	const element = mod(Math.floor((n + 3) / 2), 5);
	const animal = mod(n + 3, 12);
	const female = mod(n, 2) === 0;
	return {
		element: ELEMENTS[element],
		gender: female ? "mo" : "pho",
		animal: ANIMALS[animal],
		english: {
			element: ELEMENTS_EN[element],
			gender: female ? "female" : "male",
			animal: ANIMALS_EN[animal],
		},
	};
}

const esc = (s) => s.replace(/'/g, "\\'");

/** Does this text state the year in Wylie? Gender optional; the dictionaries usually omit it. */
export function statesYearInWylie(text, signs) {
	const animal = WYLIE_ALIASES[signs.animal] ?? esc(signs.animal);
	return new RegExp(`${esc(signs.element)}\\s+(?:pho\\s+|mo\\s+)?${animal}\\b`).test(text);
}

/** Does this text state the year in English? Order and gender both vary, so neither is required. */
export function statesYearInEnglish(text, signs) {
	const lower = text.toLowerCase();
	const animals = ENGLISH_ALIASES[signs.english.animal] ?? [signs.english.animal];
	return lower.includes(signs.english.element) && animals.some((a) => lower.includes(a));
}

const WORD_ORDINALS = {
	first: 1,
	second: 2,
	third: 3,
	fourth: 4,
	fifth: 5,
	sixth: 6,
	seventh: 7,
	eighth: 8,
	ninth: 9,
	tenth: 10,
	eleventh: 11,
	twelfth: 12,
	thirteenth: 13,
	fourteenth: 14,
	fifteenth: 15,
	sixteenth: 16,
	seventeenth: 17,
	eighteenth: 18,
	nineteenth: 19,
	twentieth: 20,
	thirtieth: 30,
	fortieth: 40,
	fiftieth: 50,
	sixtieth: 60,
};

/**
 * Every cycle position a text states, as numbers.
 *
 * `40th`, `34'th` and `the fifteenth` all occur, and compounds like `twenty-third` do too. A
 * digit-only reader loses every word form, which is a silent under-count rather than an error.
 */
export function positionsStatedIn(text) {
	const found = new Set();
	for (const m of text.matchAll(/\b(\d{1,2})\s*'?(?:st|nd|rd|th)\b/g)) found.add(Number(m[1]));
	const lower = text.toLowerCase();
	for (const [word, value] of Object.entries(WORD_ORDINALS)) {
		if (new RegExp(`\\b${word}\\b`).test(lower)) found.add(value);
	}
	for (const m of lower.matchAll(
		/\b(twenty|thirty|forty|fifty)[- ](first|second|third|fourth|fifth|sixth|seventh|eighth|ninth)\b/g,
	)) {
		const tens = { twenty: 20, thirty: 30, forty: 40, fifty: 50 }[m[1]];
		found.add(tens + WORD_ORDINALS[m[2]]);
	}
	return found;
}

/** `headword|body` per line; a headword can repeat, so bodies are collected rather than replaced. */
export function indexEntries(text) {
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

/**
 * An entry's senses, each with the register tag in force for it.
 *
 * A tag before the first numbered sense governs the whole entry; one inside a sense governs that
 * sense. Splitting on the top-level `N)` keeps sub-senses (`1.`, `2.`) with the sense carrying their
 * tag, which is what position 59 needs.
 */
export function senses(body) {
	const tagOf = (text) => (text.match(/\(([a-z' ]{2,14})\)/) ?? [])[1] ?? null;
	const parts = body.split(/\s*\d+\)\s*/);
	const prefix = parts.shift() ?? "";
	const entryTag = tagOf(prefix);
	// The prefix is a sense in its own right, not merely where the entry-level tag lives. In the
	// tshig mdzod it is usually bare `{(mngon)}` and dropping it costs nothing, which is how an
	// earlier draft got away with it; Ives Waldo puts the entire English gloss there and only the
	// Tibetan quotation after `1)`, so dropping it lost the very text being checked.
	return [
		{ text: prefix, tag: entryTag },
		...parts.map((text) => ({ text, tag: tagOf(text) ?? entryTag })),
	];
}

export async function fetchDictionary(dictionary) {
	const response = await fetch(`${RAW}/${dictionary.file}`);
	if (!response.ok) {
		throw new Error(`${dictionary.label}: ${RAW}/${dictionary.file} answered ${response.status}`);
	}
	return await response.text();
}

/**
 * Prove the predicates before using them, and report a broken checker rather than a violation.
 *
 * Two kinds, catching disjoint failures, so both are written. The **invariant** is derived from the
 * data and catches what nobody thought of: every one of the sixty positions must produce a sign
 * triple, and the sixty triples must be distinct — a formula wrong in any of its three moduli
 * collapses that. The **literal cases** catch what the invariant cannot see: an arithmetic that
 * cycles correctly but is offset lands every triple on the wrong year and satisfies the invariant
 * perfectly.
 */
export function provePredicates() {
	const problems = [];

	const triples = new Set();
	for (let position = 1; position <= 60; position++) {
		const signs = signsForYear(1026 + position);
		if (!signs.element || !signs.animal) {
			problems.push(`position ${position} produced no sign triple`);
			continue;
		}
		triples.add(`${signs.element} ${signs.gender} ${signs.animal}`);
	}
	if (triples.size !== 60) {
		problems.push(`the sixty positions produce ${triples.size} distinct signs, not 60`);
	}

	for (const [year, want] of [
		[1027, "me mo yos"],
		[1966, "me pho rta"],
		[2008, "sa pho byi"],
		[2026, "me pho rta"],
	]) {
		const s = signsForYear(year);
		const got = `${s.element} ${s.gender} ${s.animal}`;
		if (got !== want) problems.push(`${year} computes as ${got}, but it is ${want}`);
	}

	// The year matchers, against the spellings that broke earlier drafts.
	const monkey = signsForYear(1968); // sa pho spre
	for (const spelling of ["sa spre lo", "sa pho sprel lo", "sa spre'u"]) {
		if (!statesYearInWylie(spelling, monkey)) problems.push(`Wylie matcher missed ${spelling}`);
	}
	if (statesYearInWylie("sa pho khyi lo", monkey))
		problems.push("Wylie matcher accepted a dog year as a monkey year");

	const mouse = signsForYear(1936); // me pho byi, fire male mouse
	for (const spelling of ["fire male mouse", "Male Fire Rat", "fire rat year"]) {
		if (!statesYearInEnglish(spelling, mouse))
			problems.push(`English matcher missed "${spelling}"`);
	}
	if (statesYearInEnglish("fire male dog year", mouse)) {
		problems.push("English matcher accepted a dog year as a mouse year");
	}

	// Position reading, against all three printed forms.
	for (const [text, want] of [
		["40th year of the rab byung", 40],
		["34'th year male iron mouse", 34],
		["the fifteenth year of rab byung", 15],
		["twenty-third year", 23],
	]) {
		if (!positionsStatedIn(text).has(want))
			problems.push(`position reader missed ${want} in "${text}"`);
	}

	// Sense scoping, against both scopes and a sub-sense.
	const whole = senses("{(mngon)} 1) {lag pa/} 2) {me byi lo/}");
	if (!whole.every((s) => s.tag === "mngon"))
		problems.push("an entry-level (mngon) did not reach every sense");
	// Content-addressed, not index-addressed: an earlier version asserted on inner[0] and inner[1],
	// which made a correct change to how the prefix is returned look like a broken predicate.
	const inner = senses("1) {drag po/} 2) {(mngon) }1. {shing glang lo/ }2. {…}");
	const taggedOf = (list, needle) => list.find((s) => s.text.includes(needle))?.tag;
	if (taggedOf(inner, "drag po") !== null) {
		problems.push("a sense-level tag leaked backwards onto an untagged sense");
	}
	if (taggedOf(inner, "shing glang") !== "mngon") {
		problems.push("a sense-level (mngon) did not reach its own sub-senses");
	}

	// The prefix is a sense. Ives Waldo puts the whole gloss before `1)` and only a Tibetan
	// quotation after it, so a `senses` that drops the prefix loses the text being checked -- which
	// is what it did, silently, until position 15 disagreed with a source that in fact agreed.
	const prefixed = senses(
		"bull, the 15th year of {rab byung} {lcags mo sbrul} 1) {(mngon) chu rta lo/}",
	);
	if (!prefixed.some((s) => s.text.includes("lcags mo sbrul"))) {
		problems.push(
			"senses() dropped the prefix, losing an entry whose gloss precedes its first numbered sense",
		);
	}

	if (problems.length > 0) {
		throw new Error(
			`the checker itself is broken, so nothing below can be trusted:\n  - ${problems.join("\n  - ")}`,
		);
	}
}
