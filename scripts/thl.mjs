/**
 * The shared THL module: word-separated phonetics, the boundary rule and the word gate.
 *
 * Every verifier that emits a shipped `phonetic` goes through here, so a Wylie is marked the same way
 * on every surface and a word is gated the same way against the same dictionaries. Importing this
 * module fetches nothing and reads no file; `loadBoundaries` and `fetchGateSets` do, when called.
 *
 * ## The rule (`markingFor`)
 *
 * One syllable and two syllables need no row: a two-syllable name is one word. A name of three or more
 * syllables must have a row in `scripts/word-boundaries.data.json`, carrying Andreas' ruling, whose
 * `marked` joins a word's syllables with a space and parts words with `-` — the format THL's
 * "Words separated by" mode reads (`sep_join: "-"`). A two-syllable name has a row only to carry a
 * `gateException`.
 *
 * ## The gate (`gateWord`, `phoneticsFor`)
 *
 * Each word of a multi-syllable name must be a headword in a gate dictionary, exactly or through the
 * `-pa`/`-ba` rung on either side, or a member an enumerating entry spells; or its row's
 * `gateException` must state evidence whose required headwords are still present. The gate decides
 * whether a word exists and never where a boundary falls. A single syllable is neither a boundary nor a
 * word the rule decides, so it is not gated.
 *
 * `provePredicates()` holds a literal case for every refusal and an invariant over the real boundary
 * file. A verifier calls it before use and refuses to run if it returns anything.
 */

import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchAggregate, indexEntries } from "./tibetan-dictionary.mjs";

export const THL_URL = "https://old.thlib.org/cgi-bin/thl/lbow/phonetics.pl";

export const BOUNDARIES_PATH = fileURLToPath(
	new URL("./word-boundaries.data.json", import.meta.url),
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** The `<textarea>` THL's page puts the phonetics in: the second one on the page. */
export function thlPhoneticsOf(html) {
	const areas = [...html.matchAll(/<textarea[^>]*>([\s\S]*?)<\/textarea>/g)].map((m) =>
		m[1].trim(),
	);
	return areas[1];
}

/**
 * THL's phonetics for a marked Wylie in "Words separated by" mode, three attempts.
 *
 * @param {string} marked syllables joined by a space, words parted by `-`
 * @param {string} userAgent
 */
export async function thlSeparated(marked, userAgent) {
	for (let attempt = 0; attempt < 3; attempt++) {
		try {
			const response = await fetch(THL_URL, {
				method: "POST",
				headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": userAgent },
				body: new URLSearchParams({
					input: marked,
					type: "thl",
					words: "sep",
					sep_join: "-",
					send: "Make Phonetics",
				}),
			});
			if (!response.ok) throw new Error(`THL returned ${response.status}`);
			return thlPhoneticsOf(await response.text());
		} catch (error) {
			if (attempt === 2) throw error;
			await sleep(1000 * (attempt + 1));
		}
	}
	throw new Error("THL exhausted its retries");
}

/** The syllables of a Wylie: its space-separated parts. */
export const syllablesOf = (wylie) => wylie.split(" ").filter((s) => s !== "");

/** The words of a marked Wylie: parts separated by `-`. */
export const wordsOf = (marked) => marked.split("-");

/** The marked Wylie with its boundaries made plain spaces: it must equal the unmarked Wylie. */
export const unmarked = (marked) => marked.replaceAll("-", " ");

/**
 * @typedef {{ dictionary: string, headword: string }} GateRequirement
 * @typedef {{ word: string, evidence: string, requires: GateRequirement[] }} GateException
 * @typedef {{ marked: string, ruling: string | null, gateException?: GateException }} BoundaryRow
 */

const isText = (v) => typeof v === "string" && v !== "";

/** Refuses a malformed `gateException`, naming the row and the field. */
function checkGateException(wylie, row) {
	const refuse = (field, wants) => {
		throw new Error(
			`boundary row for "${wylie}": gateException${field && `.${field}`} must be ${wants}`,
		);
	};
	const ex = row.gateException;
	if (ex === null || typeof ex !== "object" || Array.isArray(ex)) refuse("", "an object");
	if (!isText(ex.word)) refuse("word", "a non-empty string");
	if (!wordsOf(row.marked).includes(ex.word)) refuse("word", "one of the words of marked");
	if (!isText(ex.evidence)) refuse("evidence", "a non-empty string");
	if (!Array.isArray(ex.requires) || ex.requires.length === 0)
		refuse("requires", "a non-empty array");
	for (const r of ex.requires)
		if (r === null || typeof r !== "object" || !isText(r.dictionary) || !isText(r.headword))
			refuse("requires", "an array of { dictionary, headword } strings");
}

/**
 * The authored boundary file as a map keyed by Wylie; refuses an unreadable file, a row without
 * `marked` and a malformed `gateException`. A missing `ruling` reads as `null`, which `markingFor`
 * refuses.
 *
 * @param {string} [path]
 * @returns {Map<string, BoundaryRow>}
 */
export function loadBoundaries(path = BOUNDARIES_PATH) {
	let data;
	try {
		data = JSON.parse(readFileSync(path, "utf8"));
	} catch (error) {
		throw new Error(`cannot read the word boundaries at ${path}: ${error.message}`);
	}
	if (data === null || typeof data !== "object" || Array.isArray(data))
		throw new Error(`the word boundaries at ${path} are not an object keyed by Wylie`);
	const rows = new Map();
	for (const [wylie, row] of Object.entries(data)) {
		if (row === null || typeof row !== "object" || typeof row.marked !== "string")
			throw new Error(`boundary row "${wylie}" in ${path} has no "marked"`);
		if (row.gateException !== undefined) checkGateException(wylie, row);
		rows.set(wylie, { ...row, ruling: row.ruling ?? null });
	}
	return rows;
}

/**
 * The rule: how a Wylie is marked, or why it cannot be yet.
 *
 * @param {string} wylie
 * @param {Map<string, BoundaryRow>} boundaries
 * @returns {{ marked: string, row: BoundaryRow | null } | { problem: string }}
 */
export function markingFor(wylie, boundaries) {
	const row = boundaries.get(wylie) ?? null;
	const n = syllablesOf(wylie).length;
	if (row === null) {
		if (n >= 3)
			return {
				problem: `no boundary row for "${wylie}" (${n} syllables): a longer name needs Andreas' ruling in scripts/word-boundaries.data.json`,
			};
		return { marked: wylie, row: null };
	}
	if (row.ruling === null) return { problem: `boundary row for "${wylie}" has no ruling yet` };
	if (unmarked(row.marked) !== wylie)
		return {
			problem: `boundary row for "${wylie}" marks "${row.marked}", which does not unmark to it`,
		};
	if (n === 2 && !row.gateException)
		return {
			problem: `two-syllable name "${wylie}" has a boundary row without a gateException; the rule makes it one word`,
		};
	if (n === 2 && row.marked.includes("-"))
		return {
			problem: `two-syllable name "${wylie}" is one word: its marking has a boundary`,
		};
	if (n === 1)
		return { problem: `single-syllable name "${wylie}" has a boundary row; the rule needs none` };
	return { marked: row.marked, row };
}

/**
 * The gate dictionaries as sets of headwords, keyed by name. `extra` adds sets the caller names, such
 * as Jäschke pages it has read; they follow the three here in the map's order, which the gate's
 * error message prints.
 *
 * @param {{ mvy: string, tshig: string, dung: string }} texts aggregate file bodies
 * @param {Record<string, Iterable<string>>} [extra]
 * @returns {Map<string, Set<string>>}
 */
export function gateSets(texts, extra = {}) {
	const mvy = new Set(
		texts.mvy
			.split("\n")
			.map((line) => line.split("|"))
			.filter((cells) => cells.length === 2)
			.map(([tibetan]) => tibetan.trim()),
	);
	const sets = new Map([
		["Mahāvyutpatti", mvy],
		["tshig mdzod chen mo", new Set(indexEntries(texts.tshig).keys())],
		["dung dkar tshig mdzod chen mo", new Set(indexEntries(texts.dung).keys())],
	]);
	for (const [name, words] of Object.entries(extra)) sets.set(name, new Set(words));
	return sets;
}

/** The three gate dictionaries, fetched. */
export async function fetchGateSets(extra = {}) {
	const [mvy, tshig, dung] = await Promise.all([
		fetchAggregate("21-Mahavyutpatti-Skt"),
		fetchAggregate("25-tshig-mdzod-chen-mo-Tib"),
		fetchAggregate("34-dung-dkar-tshig-mdzod-chen-mo-Tib"),
	]);
	return gateSets({ mvy, tshig, dung }, extra);
}

/**
 * The dictionaries (or `"enumeration"`) that admit a word: the word itself, with a nominalising
 * ending (`ba`, `pa`) added, or with one removed (*bcu drug pa* against *bcu drug*). Each is a rule of
 * Tibetan spelling true of every word it touches, so it changes what is looked up and nothing printed.
 *
 * @param {string} word
 * @param {Map<string, Set<string>>} sets
 * @param {Set<string>} [enumerated] member spellings an enumerating entry states
 * @returns {string[]}
 */
export function gateWord(word, sets, enumerated) {
	const candidates = [word, `${word} ba`, `${word} pa`, word.replace(/ [pb]a$/, "")];
	const admitted = [...sets]
		.filter(([, headwords]) => candidates.some((c) => headwords.has(c)))
		.map(([name]) => name);
	if (enumerated && candidates.some((c) => enumerated.has(c))) admitted.push("enumeration");
	return admitted;
}

/**
 * THL's phonetics for each name, with the rule applied, each word gated and each correction held to
 * what THL says now. Returns the results and every problem; a caller refuses to emit if there is one.
 * Names are looked up one at a time with a courtesy pause between THL calls; a marked Wylie shared by
 * several names is asked once.
 *
 * @param {{ id: string, wylie: string }[]} names
 * @param {{
 *   boundaries: Map<string, BoundaryRow>,
 *   gate: Map<string, Set<string>>,
 *   enumerated?: Set<string>,
 *   corrections?: { id: string, thlExpected: string, correctedTo: string, evidence: string }[],
 *   userAgent: string,
 *   thl?: (marked: string) => Promise<string | undefined>,
 *   pauseMs?: number,
 * }} options `pauseMs` defaults to 150; a proof passes 0
 */
export async function phoneticsFor(names, options) {
	const { boundaries, gate, enumerated, corrections = [], userAgent, pauseMs = 150 } = options;
	const thl = options.thl ?? ((marked) => thlSeparated(marked, userAgent));
	const results = new Map();
	const problems = [];
	const asked = new Map();
	const problem = (id, message) => problems.push({ id, message });

	for (const { id, wylie } of names) {
		const marking = markingFor(wylie, boundaries);
		if ("problem" in marking) {
			problem(id, marking.problem);
			continue;
		}
		const { marked, row } = marking;

		let said;
		try {
			if (!asked.has(marked)) {
				asked.set(marked, await thl(marked));
				if (pauseMs > 0) await sleep(pauseMs);
			}
			said = asked.get(marked);
		} catch (error) {
			problem(id, `THL lookup for "${marked}" failed: ${error.message}`);
			continue;
		}
		if (!said) {
			problem(id, `THL returned no phonetics for "${marked}"`);
			continue;
		}

		const correction = corrections.find((c) => c.id === id) ?? null;
		let phonetic = said;
		if (correction) {
			if (said !== correction.thlExpected)
				problem(
					id,
					`correction for ${id} is no longer justified: it expects THL to return "${correction.thlExpected}", but THL returned "${said}"`,
				);
			phonetic = correction.correctedTo;
		} else if (said.includes("(?)")) {
			problem(id, `THL returned "${said}", which carries its own uncertainty marker "(?)"`);
		}

		if (syllablesOf(wylie).length > 1) {
			for (const word of wordsOf(marked)) {
				const exception = row?.gateException?.word === word ? row.gateException : null;
				if (gateWord(word, gate, enumerated).length > 0) {
					if (exception)
						problem(id, `gateException for "${word}" is no longer needed: the gate admits it`);
					continue;
				}
				if (!exception) {
					problem(
						id,
						`word "${word}" of "${marked}" is no headword in ${[...gate.keys()].join(", ")}${enumerated ? ", nor a member an enumeration spells" : ""}`,
					);
					continue;
				}
				for (const { dictionary, headword } of exception.requires) {
					if (!gate.get(dictionary)?.has(headword))
						problem(
							id,
							`gateException for "${word}" is no longer justified: ${dictionary} has no headword "${headword}"`,
						);
				}
			}
		}

		results.set(id, { marked, thl: said, phonetic, corrected: correction });
	}
	return { results, problems };
}

/**
 * Proves this module's own predicates against literal cases, offline: every refusal has a case that
 * fails if the refusal is weakened. Returns a description per broken predicate; empty when sound.
 *
 * @returns {Promise<string[]>}
 */
export async function provePredicates() {
	const broken = [];
	const same = (got, want) => JSON.stringify(got) === JSON.stringify(want);
	const attempt = async (what, run) => {
		try {
			const failure = await run();
			if (failure) broken.push(`${what}: ${failure}`);
		} catch (error) {
			broken.push(`${what}: threw ${error?.message ?? error}`);
		}
	};
	const none = new Map();
	const row = (marked, rest = {}) =>
		new Map([[rest.key ?? marked.replaceAll("-", " "), { marked, ruling: "x", ...rest }]]);

	await attempt("thlPhoneticsOf", () =>
		thlPhoneticsOf("<textarea>in</textarea><textarea class='eng'> saga dawa </textarea>") !==
		"saga dawa"
			? "read the wrong textarea"
			: null,
	);
	await attempt("syllablesOf/wordsOf/unmarked", () =>
		syllablesOf("sa ga zla ba").length !== 4 ||
		wordsOf("sa ga-zla ba-dus chen").join("|") !== "sa ga|zla ba|dus chen" ||
		unmarked("sa ga-zla ba") !== "sa ga zla ba"
			? "split or joined a marked Wylie wrongly"
			: null,
	);

	const marking = (label, wylie, boundaries, check) =>
		attempt(`markingFor ${label}`, () => {
			const got = markingFor(wylie, boundaries);
			return check(got) ? null : `answered ${JSON.stringify(got)}`;
		});
	const isMarked = (m) => (got) => got.marked === m && !("problem" in got);
	const isProblem = (start) => (got) =>
		typeof got.problem === "string" && got.problem.startsWith(start);

	await marking("one-word two syllables", "nyi ma", none, isMarked("nyi ma"));
	await marking("one syllable", "snron", none, isMarked("snron"));
	await marking(
		"three syllables is the threshold",
		"sgam po pa",
		none,
		isProblem("no boundary row"),
	);
	await marking("six syllables", "sa ga zla ba dus chen", none, isProblem("no boundary row"));
	await marking(
		"two syllables with a row and no gateException",
		"nyi ma",
		new Map([["nyi ma", { marked: "nyi ma", ruling: "x" }]]),
		isProblem("two-syllable name"),
	);
	await marking(
		"two syllables with a boundary in the marking",
		"lha babs",
		new Map([
			[
				"lha babs",
				{
					marked: "lha-babs",
					ruling: "x",
					gateException: { word: "lha-babs", evidence: "x", requires: [] },
				},
			],
		]),
		(got) => got.problem === `two-syllable name "lha babs" is one word: its marking has a boundary`,
	);
	await marking(
		"one syllable with a row",
		"snron",
		new Map([["snron", { marked: "snron", ruling: "x" }]]),
		(got) => got.problem === `single-syllable name "snron" has a boundary row; the rule needs none`,
	);
	await marking(
		"a ruled row",
		"sa ga zla ba dus chen",
		row("sa ga zla ba-dus chen"),
		isMarked("sa ga zla ba-dus chen"),
	);
	for (const bad of [
		"sa ga--zla ba dus chen",
		"-sa ga zla ba dus chen",
		"sa ga zla ba dus chen-",
		"sa ga zla ba-dus",
	])
		await marking(
			`a row marking "${bad}"`,
			"sa ga zla ba dus chen",
			new Map([["sa ga zla ba dus chen", { marked: bad, ruling: "x" }]]),
			isProblem("boundary row for"),
		);
	await marking(
		"a row marking a different Wylie",
		"sa ga zla ba dus chen",
		new Map([["sa ga zla ba dus chen", { marked: "sa ga zla ba-dus", ruling: "x" }]]),
		(got) => got.problem?.endsWith("which does not unmark to it"),
	);
	await marking(
		"a row with no ruling",
		"sa ga zla ba dus chen",
		new Map([["sa ga zla ba dus chen", { marked: "sa ga zla ba-dus chen", ruling: null }]]),
		(got) => got.problem?.endsWith("has no ruling yet"),
	);

	const sets = (name, ...headwords) => new Map([[name, new Set(headwords)]]);
	for (const [word, headword, why] of [
		["bcu drug pa", "bcu drug", "stem removal"],
		["mi mthun", "mi mthun pa", "the pa candidate"],
		["lha", "lha ba", "the ba candidate"],
		["bcu drug pa", "bcu drug pa", "the word itself"],
	])
		await attempt(`gateWord ${why}`, () => {
			const got = gateWord(word, sets("D", headword));
			return same(got, ["D"]) ? null : `answered ${JSON.stringify(got)} for "${word}"`;
		});
	await attempt("gateWord admits nothing unknown", () =>
		same(gateWord("x", sets("D", "y")), []) ? null : "admitted an unknown word",
	);
	await attempt("gateWord enumeration", () => {
		const got = gateWord("'phel 'gyur", sets("D", "y"), new Set(["'phel 'gyur"]));
		return same(got, ["enumeration"]) ? null : `answered ${JSON.stringify(got)}`;
	});

	await attempt("gateSets", () => {
		const got = gateSets(
			{ mvy: "bdud 'joms|māra\n", tshig: "nyi ma|x\n", dung: "zla ba|y\n" },
			{ J: ["dus"] },
		);
		return same(
			[...got.keys()],
			["Mahāvyutpatti", "tshig mdzod chen mo", "dung dkar tshig mdzod chen mo", "J"],
		) &&
			got.get("Mahāvyutpatti").has("bdud 'joms") &&
			got.get("tshig mdzod chen mo").has("nyi ma") &&
			got.get("dung dkar tshig mdzod chen mo").has("zla ba") &&
			got.get("J").has("dus")
			? null
			: "built the wrong sets";
	});

	const gate = new Map([["D", new Set(["nyi ma", "dus chen", "sa ga", "zla ba"])]]);
	const run = (names, extra = {}) =>
		phoneticsFor(names, {
			boundaries: none,
			gate,
			userAgent: "proof",
			pauseMs: 0,
			thl: async () => "nyima",
			...extra,
		});
	const messages = (out) => out.problems.map((p) => p.message);

	await attempt("phoneticsFor a clean name", async () => {
		const out = await run([{ id: "a", wylie: "nyi ma" }]);
		const r = out.results.get("a");
		return out.problems.length === 0 &&
			r?.phonetic === "nyima" &&
			r.thl === "nyima" &&
			r.corrected === null
			? null
			: `answered ${JSON.stringify([...out.results])} ${JSON.stringify(out.problems)}`;
	});
	await attempt("phoneticsFor does not gate a single syllable", async () => {
		const out = await run([{ id: "a", wylie: "unknownsyllable" }]);
		return out.problems.length === 0 ? null : `gated: ${messages(out)}`;
	});
	await attempt("phoneticsFor gates a two-syllable name", async () => {
		const out = await run([{ id: "a", wylie: "no word" }]);
		return same(messages(out), [`word "no word" of "no word" is no headword in D`])
			? null
			: `answered ${JSON.stringify(messages(out))}`;
	});
	await attempt("phoneticsFor names the enumeration arm in the gate message", async () => {
		const out = await run([{ id: "a", wylie: "no word" }], { enumerated: new Set(["z"]) });
		return same(messages(out), [
			`word "no word" of "no word" is no headword in D, nor a member an enumeration spells`,
		])
			? null
			: `answered ${JSON.stringify(messages(out))}`;
	});
	await attempt("phoneticsFor admits through an enumeration", async () => {
		const out = await run([{ id: "a", wylie: "no word" }], { enumerated: new Set(["no word"]) });
		return out.problems.length === 0 ? null : `refused: ${messages(out)}`;
	});
	await attempt("phoneticsFor with a THL that throws", async () => {
		const out = await run([{ id: "a", wylie: "nyi ma" }], {
			thl: async () => {
				throw new Error("boom");
			},
		});
		return same(messages(out), [`THL lookup for "nyi ma" failed: boom`])
			? null
			: `answered ${JSON.stringify(messages(out))}`;
	});
	await attempt("phoneticsFor with THL returning nothing", async () => {
		const out = await run([{ id: "a", wylie: "nyi ma" }], { thl: async () => "" });
		return same(messages(out), [`THL returned no phonetics for "nyi ma"`])
			? null
			: `answered ${JSON.stringify(messages(out))}`;
	});
	await attempt("phoneticsFor with an uncertainty marker and no correction", async () => {
		const out = await run([{ id: "a", wylie: "nyi ma" }], { thl: async () => "kama(?)pa" });
		return same(messages(out), [
			`THL returned "kama(?)pa", which carries its own uncertainty marker "(?)"`,
		])
			? null
			: `answered ${JSON.stringify(messages(out))}`;
	});
	const correction = { id: "a", thlExpected: "kama(?)pa", correctedTo: "karmapa", evidence: "x" };
	await attempt("phoneticsFor with a matching correction", async () => {
		const out = await run([{ id: "a", wylie: "nyi ma" }], {
			thl: async () => "kama(?)pa",
			corrections: [correction],
		});
		const r = out.results.get("a");
		return out.problems.length === 0 &&
			r?.phonetic === "karmapa" &&
			r.thl === "kama(?)pa" &&
			r.corrected === correction
			? null
			: `answered ${JSON.stringify([...out.results])} ${JSON.stringify(out.problems)}`;
	});
	await attempt("phoneticsFor with a stale correction", async () => {
		const out = await run([{ id: "a", wylie: "nyi ma" }], { corrections: [correction] });
		return same(messages(out), [
			`correction for a is no longer justified: it expects THL to return "kama(?)pa", but THL returned "nyima"`,
		])
			? null
			: `answered ${JSON.stringify(messages(out))}`;
	});

	const excepted = (requires) =>
		new Map([
			[
				"lha babs dus chen",
				{
					marked: "lha babs-dus chen",
					ruling: "x",
					gateException: { word: "lha babs", evidence: "x", requires },
				},
			],
		]);
	const lhabab = [{ id: "a", wylie: "lha babs dus chen" }];
	await attempt("phoneticsFor with a justified gateException", async () => {
		const out = await run(lhabab, {
			boundaries: excepted([{ dictionary: "D", headword: "dus chen" }]),
		});
		return out.problems.length === 0 ? null : `refused: ${messages(out)}`;
	});
	await attempt("phoneticsFor without a gateException covering the word", async () => {
		const out = await run(lhabab, {
			boundaries: new Map([["lha babs dus chen", { marked: "lha babs-dus chen", ruling: "x" }]]),
		});
		return same(messages(out), [`word "lha babs" of "lha babs-dus chen" is no headword in D`])
			? null
			: `answered ${JSON.stringify(messages(out))}`;
	});
	await attempt("phoneticsFor with a gateException whose headword is absent", async () => {
		const out = await run(lhabab, {
			boundaries: excepted([{ dictionary: "D", headword: "lha babs dus chen" }]),
		});
		return same(messages(out), [
			`gateException for "lha babs" is no longer justified: D has no headword "lha babs dus chen"`,
		])
			? null
			: `answered ${JSON.stringify(messages(out))}`;
	});
	await attempt("phoneticsFor with a gateException the gate no longer needs", async () => {
		const out = await run(lhabab, {
			boundaries: excepted([{ dictionary: "D", headword: "dus chen" }]),
			gate: new Map([["D", new Set(["lha babs", "dus chen"])]]),
		});
		return same(messages(out), [
			`gateException for "lha babs" is no longer needed: the gate admits it`,
		])
			? null
			: `answered ${JSON.stringify(messages(out))}`;
	});
	await attempt("phoneticsFor covers only the word its gateException names", async () => {
		const out = await run([{ id: "a", wylie: "lha babs dus chen" }], {
			boundaries: new Map([
				[
					"lha babs dus chen",
					{
						marked: "lha babs-dus chen",
						ruling: "x",
						gateException: {
							word: "lha babs",
							evidence: "x",
							requires: [{ dictionary: "D", headword: "nyi ma" }],
						},
					},
				],
			]),
			gate: new Map([["D", new Set(["nyi ma"])]]),
		});
		return same(messages(out), [`word "dus chen" of "lha babs-dus chen" is no headword in D`])
			? null
			: `answered ${JSON.stringify(messages(out))}`;
	});
	await attempt("phoneticsFor refuses a longer name with no row", async () => {
		const out = await run([{ id: "a", wylie: "sgam po pa" }]);
		return out.problems.length === 1 && out.problems[0].message.startsWith("no boundary row")
			? null
			: `answered ${JSON.stringify(messages(out))}`;
	});

	await attempt("thlSeparated posts the word-separated request", async () => {
		const realFetch = globalThis.fetch;
		let sent;
		globalThis.fetch = async (url, options) => {
			sent = { url, options };
			return {
				ok: true,
				text: async () => "<textarea>in</textarea><textarea> saga dawa </textarea>",
			};
		};
		try {
			const got = await thlSeparated("sa ga-zla ba", "proof-agent");
			const body = sent.options.body;
			return got === "saga dawa" &&
				sent.url === THL_URL &&
				sent.options.method === "POST" &&
				sent.options.headers["User-Agent"] === "proof-agent" &&
				body.get("input") === "sa ga-zla ba" &&
				body.get("type") === "thl" &&
				body.get("words") === "sep" &&
				body.get("sep_join") === "-" &&
				body.get("send") === "Make Phonetics"
				? null
				: `sent ${String(sent?.options?.body)}, got ${got}`;
		} finally {
			globalThis.fetch = realFetch;
		}
	});

	await attempt("loadBoundaries", () => {
		const dir = mkdtempSync(join(tmpdir(), "thl-proof-"));
		try {
			const write = (name, text) => {
				const path = join(dir, name);
				writeFileSync(path, text);
				return path;
			};
			const refuses = (path) => {
				try {
					loadBoundaries(path);
					return false;
				} catch {
					return true;
				}
			};
			const good = loadBoundaries(write("good.json", '{"a b c":{"marked":"a b-c"}}'));
			if (good.get("a b c")?.ruling !== null) return "did not read a missing ruling as null";
			if (!refuses(write("bad.json", "{"))) return "accepted unreadable JSON";
			if (!refuses(write("nomarked.json", '{"a b c":{"ruling":"x"}}')))
				return "accepted a row without marked";
			if (!refuses(join(dir, "absent.json"))) return "accepted a missing file";
			const exception = (patch) => {
				const gateException = {
					word: "lha babs",
					evidence: "x",
					requires: [{ dictionary: "D", headword: "h" }],
					...patch,
				};
				return JSON.stringify({
					"lha babs dus chen": { marked: "lha babs-dus chen", ruling: "x", gateException },
				});
			};
			const said = (patch) => {
				try {
					loadBoundaries(write("ex.json", exception(patch)));
					return "accepted";
				} catch (error) {
					return error.message;
				}
			};
			const head = 'boundary row for "lha babs dus chen": gateException.';
			if (said({}) !== "accepted") return `refused a sound gateException: ${said({})}`;
			for (const [what, patch, tail] of [
				["a missing word", { word: undefined }, "word must be a non-empty string"],
				["an empty evidence", { evidence: "" }, "evidence must be a non-empty string"],
				["a word in no word of marked", { word: "dus" }, "word must be one of the words of marked"],
				["no requires", { requires: undefined }, "requires must be a non-empty array"],
				["an empty requires", { requires: [] }, "requires must be a non-empty array"],
				[
					"a requirement without a headword",
					{ requires: [{ dictionary: "D" }] },
					"requires must be an array of { dictionary, headword } strings",
				],
				[
					"a requirement with an empty dictionary",
					{ requires: [{ dictionary: "", headword: "h" }] },
					"requires must be an array of { dictionary, headword } strings",
				],
			]) {
				const got = said(patch);
				if (got !== head + tail) return `${what}: answered "${got}"`;
			}
			return null;
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	if (existsSync(BOUNDARIES_PATH))
		await attempt("the real boundary file", () => {
			const rows = loadBoundaries();
			const bad = [...rows].filter(([key, r]) => unmarked(r.marked) !== key).map(([key]) => key);
			return bad.length === 0 ? null : `rows that do not unmark to their key: ${bad.join(", ")}`;
		});

	return broken;
}
