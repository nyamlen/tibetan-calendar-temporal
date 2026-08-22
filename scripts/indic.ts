/**
 * Devanāgarī transliteration and lookup normalisation, for the rabjung name generator.
 *
 * @remarks
 * Generation-time only — `scripts/` is not in `package.json`'s `files`, so nothing here ships. It is
 * TypeScript rather than `.mjs` so that one implementation serves both the generator and the CI-path
 * test: `tsconfig.json` sets no `allowJs`, so a `.ts` test cannot import a `.mjs` script, and Node 26
 * strips types natively, so an `.mjs` generator can import this.
 *
 * Two consumers, two scripts. **SLP1** is Cologne's lookup key
 * (`getword.php?key=<SLP1>&filter=deva`); **IAST** is the shipped column, which is derived here
 * rather than taken from the saṃvatsara table, because that table's romanisation is lossy — it drops
 * the macron on `-in` stems and prints `Kshaya` where IAST is `kṣaya`.
 *
 * {@link proveIndicPredicates} runs before any caller uses this module. That is the house pattern
 * from `scripts/check-conventions.mjs`: a broken transliterator must report itself as broken rather
 * than surface as a violation at some position.
 */

/** Independent vowel signs. */
const VOWELS: Readonly<Record<string, { slp1: string; iast: string }>> = {
	अ: { slp1: "a", iast: "a" },
	आ: { slp1: "A", iast: "ā" },
	इ: { slp1: "i", iast: "i" },
	ई: { slp1: "I", iast: "ī" },
	उ: { slp1: "u", iast: "u" },
	ऊ: { slp1: "U", iast: "ū" },
	ऋ: { slp1: "f", iast: "ṛ" },
	ॠ: { slp1: "F", iast: "ṝ" },
	ऌ: { slp1: "x", iast: "ḷ" },
	ॡ: { slp1: "X", iast: "ḹ" },
	ए: { slp1: "e", iast: "e" },
	ऐ: { slp1: "E", iast: "ai" },
	ओ: { slp1: "o", iast: "o" },
	औ: { slp1: "O", iast: "au" },
};

/** Dependent vowel signs (mātrās), which replace a consonant's inherent `a`. */
const MATRAS: Readonly<Record<string, { slp1: string; iast: string }>> = {
	"ा": { slp1: "A", iast: "ā" },
	"ि": { slp1: "i", iast: "i" },
	"ी": { slp1: "I", iast: "ī" },
	"ु": { slp1: "u", iast: "u" },
	"ू": { slp1: "U", iast: "ū" },
	"ृ": { slp1: "f", iast: "ṛ" },
	"ॄ": { slp1: "F", iast: "ṝ" },
	"ॢ": { slp1: "x", iast: "ḷ" },
	"ॣ": { slp1: "X", iast: "ḹ" },
	"े": { slp1: "e", iast: "e" },
	"ै": { slp1: "E", iast: "ai" },
	"ो": { slp1: "o", iast: "o" },
	"ौ": { slp1: "O", iast: "au" },
};

/** Consonants, without the inherent vowel — the caller appends it unless a virāma or mātrā follows. */
const CONSONANTS: Readonly<Record<string, { slp1: string; iast: string }>> = {
	क: { slp1: "k", iast: "k" },
	ख: { slp1: "K", iast: "kh" },
	ग: { slp1: "g", iast: "g" },
	घ: { slp1: "G", iast: "gh" },
	ङ: { slp1: "N", iast: "ṅ" },
	च: { slp1: "c", iast: "c" },
	छ: { slp1: "C", iast: "ch" },
	ज: { slp1: "j", iast: "j" },
	झ: { slp1: "J", iast: "jh" },
	ञ: { slp1: "Y", iast: "ñ" },
	ट: { slp1: "w", iast: "ṭ" },
	ठ: { slp1: "W", iast: "ṭh" },
	ड: { slp1: "q", iast: "ḍ" },
	ढ: { slp1: "Q", iast: "ḍh" },
	ण: { slp1: "R", iast: "ṇ" },
	त: { slp1: "t", iast: "t" },
	थ: { slp1: "T", iast: "th" },
	द: { slp1: "d", iast: "d" },
	ध: { slp1: "D", iast: "dh" },
	न: { slp1: "n", iast: "n" },
	प: { slp1: "p", iast: "p" },
	फ: { slp1: "P", iast: "ph" },
	ब: { slp1: "b", iast: "b" },
	भ: { slp1: "B", iast: "bh" },
	म: { slp1: "m", iast: "m" },
	य: { slp1: "y", iast: "y" },
	र: { slp1: "r", iast: "r" },
	ल: { slp1: "l", iast: "l" },
	ळ: { slp1: "L", iast: "ḷ" },
	व: { slp1: "v", iast: "v" },
	श: { slp1: "S", iast: "ś" },
	ष: { slp1: "z", iast: "ṣ" },
	स: { slp1: "s", iast: "s" },
	ह: { slp1: "h", iast: "h" },
};

const SIGNS: Readonly<Record<string, { slp1: string; iast: string }>> = {
	"ं": { slp1: "M", iast: "ṃ" },
	"ः": { slp1: "H", iast: "ḥ" },
	"ँ": { slp1: "~", iast: "m̐" },
	ऽ: { slp1: "'", iast: "'" },
};

const VIRAMA = "्";
const NUKTA = "़";

/** Thrown when a Devanāgarī string contains a codepoint no table covers. */
export class UnmappedCodepointError extends Error {
	readonly codepoint: string;

	// No parameter properties, and none anywhere in this file: Node's type stripping is *erase-only*,
	// and a parameter property emits an assignment, so it fails at import with
	// ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX. `erasableSyntaxOnly` in tsconfig.json makes that a typecheck
	// error rather than something the next contributor discovers at runtime.
	constructor(codepoint: string, source: string) {
		const hex = codepoint.codePointAt(0)?.toString(16).toUpperCase().padStart(4, "0");
		super(`no mapping for ${JSON.stringify(codepoint)} (U+${hex}) in ${JSON.stringify(source)}`);
		this.name = "UnmappedCodepointError";
		this.codepoint = codepoint;
	}
}

type Script = "slp1" | "iast";

function transliterate(devanagari: string, script: Script): string {
	let out = "";
	const chars = [...devanagari];
	for (let index = 0; index < chars.length; index++) {
		const char = chars[index];
		if (char === undefined) continue;
		if (char === NUKTA) continue;
		// A virāma reached here rather than being consumed by its consonant is a stray one; the
		// consonant branch below eats every well-formed occurrence.
		if (char === VIRAMA) continue;

		const consonant = CONSONANTS[char];
		if (consonant) {
			out += consonant[script];
			const next = chars[index + 1];
			if (next === VIRAMA) {
				index += 1;
				continue;
			}
			const matra = next === undefined ? undefined : MATRAS[next];
			if (matra) {
				out += matra[script];
				index += 1;
				continue;
			}
			// The inherent vowel, spelled `a` in both scripts.
			out += "a";
			continue;
		}

		const vowel = VOWELS[char];
		if (vowel) {
			out += vowel[script];
			continue;
		}
		const sign = SIGNS[char];
		if (sign) {
			out += sign[script];
			continue;
		}
		throw new UnmappedCodepointError(char, devanagari);
	}
	return out;
}

/** Cologne's lookup key for a Devanāgarī headword. `क्षय` → `kzaya`. */
export const devanagariToSlp1 = (devanagari: string): string => transliterate(devanagari, "slp1");

/** The shipped IAST for a Devanāgarī headword. `क्षय` → `kṣaya`. */
export const devanagariToIast = (devanagari: string): string => transliterate(devanagari, "iast");

const SLP1_TO_DEVANAGARI = (() => {
	const consonants = new Map<string, string>();
	const vowels = new Map<string, string>();
	const matras = new Map<string, string>();
	const signs = new Map<string, string>();
	for (const [glyph, value] of Object.entries(CONSONANTS)) consonants.set(value.slp1, glyph);
	for (const [glyph, value] of Object.entries(VOWELS)) vowels.set(value.slp1, glyph);
	for (const [glyph, value] of Object.entries(MATRAS)) matras.set(value.slp1, glyph);
	for (const [glyph, value] of Object.entries(SIGNS)) signs.set(value.slp1, glyph);
	return { consonants, vowels, matras, signs };
})();

/**
 * The inverse of {@link devanagariToSlp1}, which exists so the round-trip invariant in
 * {@link proveIndicPredicates} can be stated over real data rather than over examples.
 */
export function slp1ToDevanagari(slp1: string): string {
	const { consonants, vowels, matras, signs } = SLP1_TO_DEVANAGARI;
	let out = "";
	let pendingConsonant = false;
	for (const char of slp1) {
		if (consonants.has(char)) {
			if (pendingConsonant) out += VIRAMA;
			out += consonants.get(char);
			pendingConsonant = true;
			continue;
		}
		if (char === "a") {
			// The inherent vowel: written by the consonant already, so it only needs consuming.
			if (!pendingConsonant) out += vowels.get("a") ?? "";
			pendingConsonant = false;
			continue;
		}
		if (matras.has(char) || vowels.has(char)) {
			out += pendingConsonant ? (matras.get(char) ?? "") : (vowels.get(char) ?? "");
			pendingConsonant = false;
			continue;
		}
		if (signs.has(char)) {
			out += signs.get(char);
			pendingConsonant = false;
			continue;
		}
		throw new UnmappedCodepointError(char, slp1);
	}
	// A word ending in a bare consonant — `sarvajit`, `SuBakft` — needs a closing virāma, or it reads
	// back with a spurious inherent `a`. Emitting a virāma only *between* consonants silently drops
	// it, which the round-trip invariant caught on सर्वजित् and शुभकृत् when the examples above all passed.
	if (pendingConsonant) out += VIRAMA;
	return out;
}

/** Strips IAST diacritics, giving wisdomlib's undiacriticised slug. `Vṛṣabha` → `vrsabha`. */
export function stripDiacritics(iast: string): string {
	return iast.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * The romanised slugs a name could live under, most literal first.
 *
 * Stripping diacritics turns the vocalic ṛ into a bare `r`, giving `dhatr` and `virodhakrt` — which
 * are not romanisations anybody writes. wisdomlib uses the older convention that spells it `ri`, so
 * धातृ is `dhatri` and विरोधकृत् is `virodhakrit`; both 404 under the strict form and resolve under
 * this one. The same convention writes vocalic ḷ as `li`.
 */
export function slugVariants(iast: string): string[] {
	const strict = stripDiacritics(iast);
	const vocalic = stripDiacritics(
		iast.normalize("NFC").replace(/[ṛṝ]/gi, "ri").replace(/[ḷḹ]/gi, "li"),
	);
	return strict === vocalic ? [strict] : [strict, vocalic];
}

const ORDINAL_UNITS: Readonly<Record<string, number>> = {
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
};

const ORDINAL_TENS: Readonly<Record<string, number>> = {
	twentieth: 20,
	thirtieth: 30,
	fortieth: 40,
	// wisdomlib spells position 40 "fourtieth". Sources are quoted, not corrected, so the parser
	// accepts the spelling that is actually on the page.
	fourtieth: 40,
	fiftieth: 50,
	sixtieth: 60,
};

const TENS_PREFIX: Readonly<Record<string, number>> = {
	twenty: 20,
	thirty: 30,
	forty: 40,
	fourty: 40,
	fifty: 50,
};

const CARDINAL_UNITS: Readonly<Record<string, number>> = {
	one: 1,
	two: 2,
	three: 3,
	four: 4,
	five: 5,
	six: 6,
	seven: 7,
	eight: 8,
	nine: 9,
};

/**
 * Parses a written ordinal, 1–60. `"forty-second"` → 42, `"fourtieth"` → 40.
 *
 * Returns `null` for anything it does not recognise, and the caller must **fail** on `null` rather
 * than treat it as a disagreement — an unparsed ordinal is our gap, not the source's.
 */
export function ordinalWordToNumber(word: string): number | null {
	const normalised = word.trim().toLowerCase().replace(/\s+/g, "-");
	const unit = ORDINAL_UNITS[normalised];
	if (unit !== undefined) return unit;
	const tens = ORDINAL_TENS[normalised];
	if (tens !== undefined) return tens;
	const compound = /^([a-z]+)-([a-z]+)$/.exec(normalised);
	if (compound) {
		const tensPart = TENS_PREFIX[compound[1] ?? ""];
		const unitsPart = ORDINAL_UNITS[compound[2] ?? ""];
		if (tensPart !== undefined && unitsPart !== undefined && unitsPart < 10) {
			const value = tensPart + unitsPart;
			if (value >= 1 && value <= 60) return value;
		}
	}
	return null;
}

/** Parses a written cardinal 1–20, used by the hardcoded-count check. */
export const cardinalWordToNumber = (word: string): number | null =>
	CARDINAL_UNITS[word.trim().toLowerCase()] ??
	ORDINAL_UNITS[`${word.trim().toLowerCase()}th`] ??
	null;

/** How a candidate headword was reached, recorded per row so the document can state its tier. */
export interface LookupCandidate {
	devanagari: string;
	/** `"as printed"` when no transformation was applied. */
	rung: string;
}

const NASAL_FOR_CLASS: ReadonlyArray<{ nasal: string; members: readonly string[] }> = [
	{ nasal: "ङ", members: ["क", "ख", "ग", "घ"] },
	{ nasal: "ञ", members: ["च", "छ", "ज", "झ"] },
	{ nasal: "ण", members: ["ट", "ठ", "ड", "ढ"] },
	{ nasal: "न", members: ["त", "थ", "द", "ध"] },
	{ nasal: "म", members: ["प", "फ", "ब", "भ"] },
];

/** `आनंद` → `आनन्द`. An anusvāra before a stop is the same sound as the homorganic nasal. */
function anusvaraToCluster(devanagari: string): string | null {
	let changed = false;
	let out = "";
	const chars = [...devanagari];
	for (let index = 0; index < chars.length; index++) {
		const char = chars[index];
		if (char === undefined) continue;
		const next = chars[index + 1];
		if (char === "ं" && next !== undefined) {
			const entry = NASAL_FOR_CLASS.find((klass) => klass.members.includes(next));
			if (entry) {
				out += entry.nasal + VIRAMA;
				changed = true;
				continue;
			}
		}
		out += char;
	}
	return changed ? out : null;
}

/** `प्लवङ्ग` → `प्लवंग`. The reverse of {@link anusvaraToCluster}; MW lemmatises both ways. */
function clusterToAnusvara(devanagari: string): string | null {
	let changed = false;
	let out = "";
	const chars = [...devanagari];
	for (let index = 0; index < chars.length; index++) {
		const char = chars[index];
		if (char === undefined) continue;
		const nasal = NASAL_FOR_CLASS.find((klass) => klass.nasal === char);
		if (nasal && chars[index + 1] === VIRAMA) {
			const following = chars[index + 2];
			if (following !== undefined && CONSONANTS[following]) {
				out += "ं";
				index += 1;
				changed = true;
				continue;
			}
		}
		out += char;
	}
	return changed ? out : null;
}

/**
 * `प्रमाथी` → `प्रमाथिन्`. The saṃvatsara list prints the nominative; MW lemmatises the stem.
 *
 * Both vowel lengths occur in the list — 13 प्रमाथी and 46 परिधावी carry ī, 32 विळम्बि and 33 विकारि
 * carry i — so matching only ī leaves two rows unresolved for no reason of grammar.
 */
function nominativeToInStem(devanagari: string): string | null {
	const last = devanagari.at(-1);
	if (last !== "ी" && last !== "ि") return null;
	return `${devanagari.slice(0, -1)}ि${"न"}${VIRAMA}`;
}

/** `विळम्बि` → `विलम्बि`. ळ is Vedic and Marathi; standard Sanskrit has ल. */
function vedicLToL(devanagari: string): string | null {
	return devanagari.includes("ळ") ? devanagari.replaceAll("ळ", "ल") : null;
}

/** `विरोधकृत` → `विरोधकृत्`. A missing virāma leaves a spurious inherent `a`. */
function addFinalVirama(devanagari: string): string | null {
	const last = [...devanagari].at(-1);
	if (last === undefined || !CONSONANTS[last]) return null;
	return devanagari + VIRAMA;
}

const RUNGS: ReadonlyArray<{ rung: string; apply: (input: string) => string | null }> = [
	{ rung: "ḷ → l", apply: vedicLToL },
	{ rung: "-in stem", apply: nominativeToInStem },
	{ rung: "anusvāra → cluster", apply: anusvaraToCluster },
	{ rung: "cluster → anusvāra", apply: clusterToAnusvara },
	{ rung: "final virāma", apply: addFinalVirama },
];

/**
 * The lookup ladder: the printed form first, then each documented normalisation, then the pairs that
 * compose (position 32 needs `ḷ → l` *and* `-in stem`).
 *
 * This is deliberately **not** a correction list. A correction changes what the table prints and
 * carries authored evidence; a rung changes only what is *queried*, and states a rule of Sanskrit
 * orthography or morphology that holds for every row it touches. Conflating them is how seven
 * grammatical facts became twelve editorial judgements in an earlier draft.
 */
export function lookupCandidates(devanagari: string): LookupCandidate[] {
	const seen = new Set<string>([devanagari]);
	const candidates: LookupCandidate[] = [{ devanagari, rung: "as printed" }];

	for (const { rung, apply } of RUNGS) {
		const next = apply(devanagari);
		if (next && !seen.has(next)) {
			seen.add(next);
			candidates.push({ devanagari: next, rung });
		}
	}

	for (const first of RUNGS) {
		const intermediate = first.apply(devanagari);
		if (!intermediate) continue;
		for (const second of RUNGS) {
			if (second.rung === first.rung) continue;
			const next = second.apply(intermediate);
			if (next && !seen.has(next)) {
				seen.add(next);
				candidates.push({ devanagari: next, rung: `${first.rung} + ${second.rung}` });
			}
		}
	}

	return candidates;
}

/**
 * Proves this module's own predicates, and must run before any caller uses it.
 *
 * Two kinds of check, catching disjoint failures, per `CLAUDE.md`. The **literal cases** catch what
 * an invariant cannot see — a wrong entry for one glyph. The **invariant over the corpus** catches
 * what nobody thought of: an unmapped codepoint reaches it as a thrown error naming the glyph, which
 * is exactly how ळ and the anusvāra spellings would announce themselves in a table nobody had read.
 *
 * @param corpus - every Devanāgarī headword the run will handle, so the invariant is stated over the
 *   real data rather than over examples.
 * @throws Error naming the broken predicate. The caller reports this as "the transliterator is
 *   broken", never as a violation at a position.
 */
export function proveIndicPredicates(corpus: readonly string[]): void {
	const failures: string[] = [];
	const check = (label: string, actual: unknown, expected: unknown): void => {
		if (actual !== expected) {
			failures.push(
				`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
			);
		}
	};

	check('devanagariToIast("खर")', devanagariToIast("खर"), "khara");
	check('devanagariToIast("क्षय")', devanagariToIast("क्षय"), "kṣaya");
	check('devanagariToIast("वृषभ")', devanagariToIast("वृषभ"), "vṛṣabha");
	check('devanagariToSlp1("खर")', devanagariToSlp1("खर"), "Kara");
	check('devanagariToSlp1("क्षय")', devanagariToSlp1("क्षय"), "kzaya");
	check('devanagariToSlp1("प्रमाथिन्")', devanagariToSlp1("प्रमाथिन्"), "pramATin");
	check('stripDiacritics("Vṛṣabha")', stripDiacritics("Vṛṣabha"), "vrsabha");
	check('slugVariants("Dhātṛ")', slugVariants("Dhātṛ").join("|"), "dhatr|dhatri");
	check(
		'slugVariants("Virodhakṛt")',
		slugVariants("Virodhakṛt").join("|"),
		"virodhakrt|virodhakrit",
	);
	// A name with no vocalic r yields ONE slug, not a duplicate pair — the caller iterates these.
	check('slugVariants("Khara")', slugVariants("Khara").join("|"), "khara");
	check('ordinalWordToNumber("first")', ordinalWordToNumber("first"), 1);
	check('ordinalWordToNumber("forty-second")', ordinalWordToNumber("forty-second"), 42);
	check('ordinalWordToNumber("twenty-fifth")', ordinalWordToNumber("twenty-fifth"), 25);
	check('ordinalWordToNumber("thirty-second")', ordinalWordToNumber("thirty-second"), 32);
	// The misspelling is on the page for position 40; accepting it is deliberate, so it is pinned.
	check('ordinalWordToNumber("fourtieth")', ordinalWordToNumber("fourtieth"), 40);
	check('ordinalWordToNumber("sixtieth")', ordinalWordToNumber("sixtieth"), 60);
	check('ordinalWordToNumber("umpteenth")', ordinalWordToNumber("umpteenth"), null);
	check('nominativeToInStem("प्रमाथी")', nominativeToInStem("प्रमाथी"), "प्रमाथिन्");
	check('anusvaraToCluster("आनंद")', anusvaraToCluster("आनंद"), "आनन्द");
	check('clusterToAnusvara("प्लवङ्ग")', clusterToAnusvara("प्लवङ्ग"), "प्लवंग");
	check('vedicLToL("विळम्बि")', vedicLToL("विळम्बि"), "विलम्बि");
	check('addFinalVirama("विरोधकृत")', addFinalVirama("विरोधकृत"), "विरोधकृत्");

	// The invariant: every headword the run will touch survives SLP1 and back unchanged. It names no
	// glyph, so it keeps working as the table changes, and it is the check that fails first when a
	// source introduces a codepoint no table covers.
	for (const word of corpus) {
		for (const alternative of word.split("/").map((part) => part.trim())) {
			if (alternative === "") continue;
			let round: string;
			try {
				round = slp1ToDevanagari(devanagariToSlp1(alternative));
			} catch (error) {
				failures.push(`round trip threw for ${alternative}: ${(error as Error).message}`);
				continue;
			}
			if (round !== alternative) {
				failures.push(`round trip: ${alternative} -> ${devanagariToSlp1(alternative)} -> ${round}`);
			}
		}
	}

	if (failures.length > 0) {
		throw new Error(
			`the transliterator is broken, so nothing below can be trusted:\n  - ${failures.join("\n  - ")}`,
		);
	}
}
