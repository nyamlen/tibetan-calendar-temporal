#!/usr/bin/env node
// Enforces the conventions that lint, typecheck and the test suite cannot see.
//
// Every rule here guards a claim whose violation produces a plausible wrong answer rather
// than a crash — a float creeping into the integer arithmetic, a bare throw losing the code
// a consumer branches on, a dependency appearing under a package that advertises none. Those
// are the expensive failures in this repo, and until this script existed nothing checked them.
//
// Each failure names its rule, because the point is to teach the convention at the moment it
// is broken rather than to point at a line. Violations are collected and reported together,
// for the same reason the test suite asserts once over a sweep: the first offender is rarely
// the only one.
//
// Zero dependencies, by the same logic as the engine itself.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
	encoding: "utf8",
}).trim();

// --others --exclude-standard adds untracked files while still respecting .gitignore, so a
// brand-new file is checked before it is ever `git add`-ed. Mirrors check-links.mjs, and for
// the same reason: a check that only sees tracked files reports "all clear" on the file most
// likely to be wrong.
//
// --cached also lists a path the index holds and the disk does not — a deletion or a rename staged
// on only one side. Handing that path to a rule crashed the whole run on `ENOENT` and discarded
// every finding collected before it, so it is dropped here and reported instead. Reported, not
// silently dropped: the index and the working tree disagreeing is a real state worth being told
// about, and a clean CI checkout can never reach it.
const missingFromDisk = new Set();

function tracked(...patterns) {
	return execFileSync(
		"git",
		["ls-files", "--cached", "--others", "--exclude-standard", ...patterns],
		{
			cwd: root,
			encoding: "utf8",
		},
	)
		.split("\n")
		.filter(Boolean)
		.filter((file) => {
			if (existsSync(resolve(root, file))) return true;
			if (!missingFromDisk.has(file)) {
				missingFromDisk.add(file);
				fail(
					"the index and the working tree agree",
					file,
					"is tracked but missing from disk, so it was not read. Stage the deletion or rename (`git add -A` on the path), or restore the file.",
				);
			}
			return false;
		});
}

/** A caught throw as one sentence — a non-`Error` has no `message`, and most messages lack a stop. */
const reasonOf = (error) => String(error?.message ?? error).replace(/(?<![.!?])$/, ".");

function read(file) {
	try {
		return readFileSync(resolve(root, file), "utf8");
	} catch (error) {
		if (error?.code !== "ENOENT") throw error;
		throw new Error(
			`cannot read ${file}: it does not exist on disk. The checker expects it — restore it, or update the rule that names it.`,
		);
	}
}

const failures = [];
function fail(rule, where, message) {
	failures.push({ rule, where, message });
}

/**
 * Splits a source file into lines carrying only their *code*, with comments separated out.
 *
 * Block comments are tracked across lines, so a docblock mentioning `new Error` or `a / b` is
 * not mistaken for the thing it documents — which is most of the false positives a naive grep
 * produces here, since this codebase documents its own rules in prose beside the code.
 */
function codeLines(source) {
	const out = [];
	let inBlock = false;

	source.split("\n").forEach((raw, index) => {
		const line = { number: index + 1, code: "", comment: "" };
		let rest = raw;

		while (rest.length > 0) {
			if (inBlock) {
				const end = rest.indexOf("*/");
				if (end === -1) {
					line.comment += rest;
					rest = "";
				} else {
					line.comment += rest.slice(0, end + 2);
					rest = rest.slice(end + 2);
					inBlock = false;
				}
				continue;
			}

			const lineComment = rest.indexOf("//");
			const blockStart = rest.indexOf("/*");

			if (lineComment !== -1 && (blockStart === -1 || lineComment < blockStart)) {
				line.code += rest.slice(0, lineComment);
				line.comment += rest.slice(lineComment);
				rest = "";
			} else if (blockStart !== -1) {
				line.code += rest.slice(0, blockStart);
				rest = rest.slice(blockStart + 2);
				line.comment += "/*";
				inBlock = true;
			} else {
				line.code += rest;
				rest = "";
			}
		}

		out.push(line);
	});

	return out;
}

/** Every line's code, comments stripped, rejoined — the form most rules actually want. */
const codeOf = (source) =>
	codeLines(source)
		.map((line) => line.code)
		.join("\n");

/**
 * A body shorter than this may legitimately recur — `return a % b;` is 13 characters — and
 * reporting those would train people to ignore Rule 14. Measured: the two real duplicates found on
 * 2026-09-23 were 119 and 214 characters.
 */
const DUPLICATE_BODY_FLOOR = 40;

/**
 * The one file in `src/` where an identity check against `Temporal` belongs.
 *
 * @remarks
 * Named as a constant because Rule 15's message points at it and the self-test asserts the file
 * exists: a rename that left this string behind would turn the rule into one banning the idiom
 * everywhere, with no home to move it to.
 */
const TEMPORAL_KIND_HOME = "src/temporal-kind.ts";

/**
 * Whether a line asks the identity question rule 15 exists to refuse.
 *
 * @remarks
 * Applied to a line's **code**, never its raw text: `codeLines` has already removed comments, which
 * matters in both directions. Rule 15 must not fire on the docblock explaining why the idiom is
 * banned — its first run did exactly that, on a comment in `asPlainDate` pointing readers at the
 * shared predicate, and a rule that flags its own documentation is a rule people learn to ignore.
 * And rule 15's **self-test** must not be *satisfied* by that same prose: `src/temporal-kind.ts`
 * says `instanceof Temporal` three times in its own remarks, so a whole-text search would stay
 * green with the single real check deleted. It did, until a review found it.
 *
 * **It matches the constructor, not just the namespace, and that was a widening on 2026-09-23.**
 * The first version tested `instanceof Temporal` literally, so three forms passed it —
 * `v instanceof globalThis.Temporal.PlainDate`, an aliased `const T = Temporal; v instanceof
 * T.PlainDate`, and, worst, a destructured `const { PlainDate } = Temporal; v instanceof
 * PlainDate`. The last is idiomatic JavaScript and the most likely to be written **by accident**,
 * which is the whole population this rule exists for; it was missed because the first pattern was
 * written from the shape the codebase happened to contain. Widening cost one character class and
 * produces zero false positives across `src/` — measured, the only match is the legal one.
 *
 * What still passes is a single-identifier alias (`const P = Temporal.PlainDate; v instanceof P`),
 * a comma-expression, and a `getPrototypeOf` comparison. Catching those needs the checker to
 * resolve bindings, and none is written by accident. **So this is still a ratchet against the
 * accident rather than a proof of absence** — do not cite it as one.
 *
 * Sharing this predicate between the rule and its self-test is deliberate, and it is the opposite
 * of the advice elsewhere in this file. "A guard must not share its predicate with the thing it
 * guards" applies where the two could drift into agreeing wrongly; here the hazard runs the other
 * way, and one definition of "asks the identity question" is what keeps them honest.
 */
function isIdentityCheck(code) {
	return /\binstanceof\s+[\w$.]*\b(Temporal|PlainDate|PlainDateTime|ZonedDateTime)\b/.test(code);
}

/**
 * Every `function name(...) { ... }` in a source, with its body normalised to one line.
 *
 * Built on `codeOf`, so comments are already gone and a docblock difference cannot hide a
 * duplicate — which matters, because the two real duplicates had *different* docblocks.
 *
 * Brace-matching, not parsing. A `{` inside a string literal would break it; none exists in `src/`
 * today, and `selfTest`'s count invariant is what notices if that stops being true.
 */
function functionBodies(source) {
	const code = codeOf(source);
	const DECLARATION = /(?:^|[^\w.$])function\s+([A-Za-z0-9_$]+)\s*(?:<[^>]*>)?\s*\(/g;
	const out = [];
	for (const match of code.matchAll(DECLARATION)) {
		let index = match.index + match[0].length - 1;
		let depth = 0;
		let paramsEnd = -1;
		for (; index < code.length; index++) {
			if (code[index] === "(") depth++;
			else if (code[index] === ")" && --depth === 0) {
				paramsEnd = index;
				break;
			}
		}
		if (paramsEnd === -1) continue;
		const bodyStart = code.indexOf("{", paramsEnd);
		if (bodyStart === -1) continue;
		depth = 0;
		let end = bodyStart;
		for (; end < code.length; end++) {
			if (code[end] === "{") depth++;
			else if (code[end] === "}" && --depth === 0) break;
		}
		out.push({
			name: match[1],
			body: code
				.slice(bodyStart + 1, end)
				.replace(/\s+/g, " ")
				.trim(),
		});
	}
	return out;
}

// ---------------------------------------------------------------------------------------
// The predicates, and the proof that they hold
//
// The rules below are mostly git plumbing wrapped around a handful of small textual decisions.
// The plumbing is not where the bugs are. The decisions are, and one of them was wrong for a
// while: Rule 11 was first written to match a suite's **first `-`-delimited segment** against the
// module list, which rejects `mean-astronomy.test.ts` — a file that was already correct. Nothing
// caught it; it was noticed by reading. That is the failure this section exists to prevent.
//
// So the predicates are pure functions, and `selfTest` proves them **before any rule runs**. It
// runs on every invocation rather than behind a flag, which is the point: a proof that only runs
// when someone remembers to run it is the same proof that was missing.
//
// **Two kinds of check, catching disjoint failures. This is a partition, not a ranking.**
//
//   An *invariant* derived from the repository catches mistakes nobody thought of. The Rule 11
//   invariant — every module's own name must be an acceptable suite name — fails on the
//   segment-splitting predicate immediately, and nothing in it mentions `mean-astronomy`. That is
//   its whole value: it did not need the answer in advance.
//
//   A *literal example* catches what the invariant is blind to. An equality-only predicate
//   satisfies the Rule 11 invariant perfectly while rejecting `calendar-leap-index-threshold`.
//   Only a stated case sees that.
//
// Neither subsumes the other, and for one rule only the example is available at all — see
// `validatesFixture`, which can have no useful invariant because the obvious one is vacuous.
//
// Nothing proves `selfTest`. The regress stops here deliberately: each predicate was mutated by
// hand once, during implementation, and observed failing. That evidence is in the commit message.
// ---------------------------------------------------------------------------------------

/**
 * Rule 11 — is `suite` named for one of `modules`, optionally narrowed as `<module>-<concept>`?
 *
 * Longest-prefix, **not** first-`-`-segment. Splitting on "-" answers a different question, and
 * answers it wrongly for the one hyphenated module in `src/computation/`.
 */
const namedForModule = (suite, modules) =>
	modules.some((module) => suite === module || suite.startsWith(`${module}-`));

const HARDCODED_COUNT =
	/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\b[^$`.\n]{0,80}\$\{/gi;

/**
 * The markdown template a generator writes, for a document anywhere under docs/.
 *
 * The path part allows intermediate directory arguments, so a document that moves into
 * docs/names/ is still matched. Rule 12's guard below deliberately does NOT reuse this pattern:
 * they were one regex until 2026-08-22, which meant a change to where documents live would stop
 * both matching at the same moment — the rule checking nothing while the invariant meant to catch
 * exactly that reported nothing wrong. A guard that goes quiet together with the thing it guards
 * is the vacuous case this file's own preamble warns about.
 */
const DOCUMENT_TEMPLATE =
	/writeFileSync\(\s*join\(root, "docs",(?:\s*"[^"]+",)*\s*"[^"]+\.md"\),\s*`([\s\S]*?)`,\s*\);/g;

const documentTemplates = (source) =>
	[...source.matchAll(DOCUMENT_TEMPLATE)].map((match) => match[1]);

/**
 * Rule 9 — does `suite` name one of the fixtures it imports, or their shared prefix?
 *
 * The direction is the entire rule: a *fixture* name starts with the *suite* name, never the
 * reverse. `bhutan.test.ts` validating `bhutan.ts` passes; `bhutan-fixture.test.ts` validating
 * `bhutan.ts` must not, and that drift is what the rule was written for.
 */
const validatesFixture = (suite, fixtures) => fixtures.some((fixture) => fixture.startsWith(suite));

/**
 * Rule 10 — the names a module imports through a braced import list.
 *
 * Runs over `codeOf`, so a commented-out import does not count. Two things it deliberately does
 * not match, both stated in Rule 10's own comment: namespace imports (`import * as t`) and default
 * imports. No suite uses either, and the resulting failure would be loud rather than silent.
 *
 * The `[^}]*` spans newlines, which is not incidental — `test/validation/` already contains
 * multi-line `import {` blocks, and a line-oriented pattern would under-match and fail a suite
 * that is perfectly correct.
 */
const IMPORT_LIST = /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+["'][^"']+["']/g;

const importedNames = (source) => {
	const names = new Set();
	for (const [, list] of codeOf(source).matchAll(IMPORT_LIST)) {
		for (const part of list.split(",")) {
			// `{ type CrosscheckRow, STEINERT_DATES }` and `{ PHUGPA as P }` both reduce to the
			// name as the exporting module spells it, which is what Rule 10 asks about.
			const name = part
				.trim()
				.replace(/^type\s+/, "")
				.split(/\s+as\s+/)[0]
				.trim();
			if (name !== "") names.add(name);
		}
	}
	return names;
};

/** Rule 7 — a module declaring only types: no `export const`, `function`, `class`, `let` or `var`. */
const carriesNoData = (source) =>
	!codeLines(source).some(({ code }) =>
		/^export\s+(?:const|let|var|function|class|default)\b/.test(code.trim()),
	);

/**
 * Rule 13 — the type names a barrel re-exports, as a consumer sees them.
 *
 * An `as` alias publishes the alias, so the last segment is the public name. A value export is
 * not a type export and must not be collected: `test/public-api.test.ts` already pins those, and
 * pinning them twice in different shapes is how two guards drift apart.
 */
const exportedTypeNames = (source) =>
	new Set(
		[...source.matchAll(/export type \{([^}]*)\}/g)]
			.flatMap(([, names]) => names.split(","))
			.map((name) =>
				name
					.trim()
					.split(/\s+as\s+/)
					.pop()
					.trim(),
			)
			.filter(Boolean),
	);

/**
 * Rule 13 — the type names the README documents, with where each list sits in the file.
 *
 * Deliberately a **different shape** from `exportedTypeNames` above: that one parses TypeScript
 * syntax, this one reads a prose paragraph and takes its backticked identifiers. A single pattern
 * serving both would let one edit silence the rule and the invariant meant to catch that at the
 * same moment — the trap Rule 12's guard was rewritten to avoid.
 */
const documentedTypeLists = (markdown) =>
	[...markdown.matchAll(/Type-only exports[^\n]*(?:\n(?!\s*\n)[^\n]*)*/g)].map((match) => ({
		at: match.index,
		names: new Set([...match[0].matchAll(/`([A-Za-z][A-Za-z0-9]*)`/g)].map(([, name]) => name)),
	}));

/**
 * Rule 4, widened 2026-09-23 — the `{@link}` targets in docblocks a consumer can read: the docblock
 * of a declaration the barrels export, and of a member of an interface or class they export.
 *
 * Those compile into `dist/*.d.ts` and render on hover, so a link there to a symbol the barrels do
 * not export points a consumer at something they cannot import — the polyfill probe found four,
 * among them `{@link trueMonthCount}` on `TraditionConfig.leapIndexThreshold`. Every other docblock
 * is internal and may link internal helpers freely: measured the same day, before the fix, 79 of 311
 * links in `src/` targeted non-barrel symbols, eleven of them the defects this closes; after it, 70 of
 * the 320 symbol links do, every one in an internal docblock. So the scope is the whole of the rule.
 *
 * Returns `{ line, target }` for each link in scope, `line` 1-based; module links (`….js`) are left
 * to the resolution check above, since a module is not a symbol.
 */
const publicDocblockLinks = (source, isPublic) => {
	const lines = source.split("\n");
	const out = [];
	let container = null;
	for (let i = 0; i < lines.length; i++) {
		const text = lines[i] ?? "";
		const opens =
			/^export\s+(?:declare\s+)?(?:abstract\s+)?(?:interface|class)\s+([A-Za-z_$][\w$]*)/.exec(
				text,
			);
		if (opens?.[1]) container = isPublic(opens[1]) ? opens[1] : null;
		else if (/^\}/.test(text)) container = null;
		if (!text.trimStart().startsWith("/**")) continue;
		const start = i;
		while (i < lines.length && !(lines[i] ?? "").includes("*/")) i++;
		let next = i + 1;
		while (next < lines.length && (lines[next] ?? "").trim() === "") next++;
		const following = lines[next] ?? "";
		const declared =
			/^export\s+(?:declare\s+)?(?:abstract\s+)?(?:async\s+)?(?:function|const|let|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/.exec(
				following,
			)?.[1];
		const inScope =
			(declared !== undefined && isPublic(declared)) ||
			(declared === undefined &&
				container !== null &&
				/^\s+(?:readonly\s+|static\s+)*(?:constructor\b|[A-Za-z_$][\w$]*\??\s*[:(<])/.test(
					following,
				));
		if (!inScope) continue;
		for (let at = start; at <= i; at++) {
			for (const [, target] of (lines[at] ?? "").matchAll(
				/\{@link\s+([^}|\s]+)(?:[|\s][^}]*)?\}/g,
			)) {
				if (target && !target.endsWith(".js")) out.push({ line: at + 1, target });
			}
		}
	}
	return out;
};

/**
 * Rule 16 — the runtime names a barrel exports: `export { … }` blocks that are not `export type`,
 * and `export function` / `export const` / `export class` declarations in the barrel itself.
 *
 * The runtime counterpart of `exportedTypeNames`, and deliberately a separate pattern: a `type`
 * block must never be read as a value block, or removing a type would look like removing a function.
 */
const exportedValueNames = (source) =>
	new Set([
		...[...source.matchAll(/export \{([^}]*)\}/g)]
			.flatMap(([, names]) => names.split(","))
			.map((name) =>
				name
					.trim()
					.split(/\s+as\s+/)
					.pop()
					.trim(),
			)
			.filter(Boolean),
		...[...source.matchAll(/^export\s+(?:function|const|class)\s+([A-Za-z_$][\w$]*)/gm)].map(
			([, name]) => name,
		),
	]);

/**
 * Rule 16 — the first-column identifiers of every README table whose header opens with `heading`,
 * with where each row sits in the file. A row counts only when its first cell is exactly one
 * backticked identifier, so a prose cell cannot be mistaken for an export.
 */
const documentedTableRows = (markdown, heading) => {
	const rows = [];
	let inTable = false;
	let at = 0;
	for (const line of markdown.split("\n")) {
		if (line.startsWith(`| ${heading} |`)) inTable = true;
		else if (!line.startsWith("|")) inTable = false;
		else if (inTable) {
			const name = /^\| `([A-Za-z_][\w.]*)` \|/.exec(line)?.[1];
			if (name) rows.push({ at, name });
		}
		at += line.length + 1;
	}
	return rows;
};

/** Rule 16 — the members of the `TibetanCalendarErrorCode` union, read from `src/errors.ts`. */
const errorCodeUnion = (source) => {
	const union = /export type TibetanCalendarErrorCode =([^;]*);/.exec(source)?.[1] ?? "";
	return new Set([...union.matchAll(/"([A-Z_]+)"/g)].map(([, code]) => code));
};

/**
 * Rule 16 — runtime exports with no row of their own, and the README text that documents each
 * instead. `SkippedDayError` is a class, so it has no signature to tabulate; the Errors subsection
 * describes it in prose.
 */
const DOCUMENTED_IN_PROSE = new Map([
	["SkippedDayError", "`SkippedDayError` is the only exported error class"],
]);

/**
 * Rule 13 — every published entry point, with the README heading that opens its section.
 *
 * @remarks
 * `heading: null` is the root, whose section runs from the top of the file to the first subpath
 * heading. Every other entry must carry the heading its section opens with, and they must be listed
 * in the order the README prints them — the self-test checks both, because the section ranges below
 * are nonsense otherwise.
 *
 * This was a **two-element array and a single boundary string** until 2026-09-12, which could not
 * express three entry points: one boundary cannot separate three sections, and the failure was
 * silent — an unextended rule kept passing while checking nothing about the new barrel.
 */
const TYPE_BARRELS = [
	{ file: "src/index.ts", label: "the root entry point", heading: null },
	{
		file: "src/observances/index.ts",
		label: "./observances",
		heading: "### `tibetan-calendar-temporal/observances`",
	},
	{
		file: "src/astrology/index.ts",
		label: "./astrology",
		heading: "### `tibetan-calendar-temporal/astrology`",
	},
];

/**
 * Where each entry point's README section starts and ends, by its heading.
 *
 * @remarks
 * Returns `null` if any declared heading is missing or out of order, because assigning a list to a
 * section would then be guesswork — and a rule that guesses is worse than one that says it cannot
 * tell.
 *
 * **The two refusals are not independent, and the self-test says so rather than implying otherwise.**
 * A missing heading gives `indexOf` of -1, which is below the root's 0, so the *ordering* comparison
 * catches it and the `=== -1` arm never fires while the first entry is the root with no heading. That
 * arm is kept as the statement of intent — and proved unreachable by mutation rather than assumed
 * reachable, which is how a self-test case came to pass for the wrong reason on 2026-09-12.
 */
function typeSectionRanges(readme) {
	const starts = TYPE_BARRELS.map((barrel) =>
		barrel.heading === null ? 0 : readme.indexOf(barrel.heading),
	);
	if (starts.some((at) => at === -1)) return null;
	for (let i = 1; i < starts.length; i++) {
		const previous = starts[i - 1];
		const current = starts[i];
		if (previous === undefined || current === undefined || current <= previous) return null;
	}
	return starts.map((from, index) => ({
		from,
		to: starts[index + 1] ?? readme.length,
	}));
}

function selfTest() {
	const broken = [];
	const check = (predicate, actual, expected, reason) => {
		if (actual !== expected) {
			broken.push(`${predicate}\n      expected ${expected}, got ${actual}\n      ${reason}`);
		}
	};

	// --- Rule 11, the invariant. Derived from the tree, so it needs no foresight. ---
	//
	// Over **every** mirrored directory, not just computation. Pinning it to one directory is how
	// the rule went stale before: the predicate stayed correct while the set of things it was
	// applied to stopped matching src/.
	//
	// Recomputed here rather than read from the `mirroredDirectories` corpus, deliberately: a guard
	// must not share its derivation with the thing it guards, or one bug silences both at once.
	const mirrored = [...new Set(tracked("src/*/*.ts").map((file) => file.split("/")[1]))];
	check(
		"mirrored directories are discovered",
		mirrored.length > 0,
		true,
		"src/ has subdirectories, so the mirror extractor must find some. An empty set makes every parity check below pass vacuously.",
	);
	for (const directory of mirrored) {
		const modules = tracked(`src/${directory}/*.ts`).map((file) => basename(file, ".ts"));
		for (const module of modules) {
			check(
				"namedForModule invariant",
				namedForModule(module, modules),
				true,
				`a module's own name must be an acceptable suite name; "src/${directory}/${module}" was rejected. A first-\`-\`-segment predicate fails exactly here, on a hyphenated module, with no case naming it.`,
			);
		}
	}

	// --- Rule 11, the cases the invariant cannot see. ---
	check(
		"namedForModule",
		namedForModule("calendar-leap-index-threshold", ["calendar"]),
		true,
		"a focused suite narrows its module. An equality-only predicate satisfies the invariant above and still fails this.",
	);
	check(
		"namedForModule",
		namedForModule("leap-index-threshold", ["calendar"]),
		false,
		"a concept name is not a module name — the drift Rule 11 exists to catch.",
	);
	check(
		"namedForModule",
		namedForModule("calendarX", ["calendar"]),
		false,
		"a prefix that is not a segment boundary must not match, or every module claims its neighbours.",
	);

	// --- Rule 9. No invariant, deliberately. ---
	//
	// The obvious one — `validatesFixture(f, [f])` for every fixture — is **vacuous**. It is
	// symmetric in its arguments, so `f.startsWith(f)` is true under the correct predicate and
	// under a reversed one alike. Direction reversal is the only interesting way this breaks, so
	// the assertion cannot see the single thing worth seeing, while reading as coverage. The case
	// below is the whole proof.
	check(
		"validatesFixture",
		validatesFixture("bhutan-fixture", ["bhutan"]),
		false,
		"LOAD-BEARING: the only check that detects a reversed comparison. A fixture name starts with the suite name, never the reverse.",
	);
	check(
		"validatesFixture",
		validatesFixture("crosscheck", ["crosscheck-eszthoff"]),
		true,
		"a suite may be named for the prefix it shares with the fixtures it covers.",
	);

	// --- Rule 12, the cases. ---
	//
	// The rule reads a generator's own template rather than the document it produces, because the
	// document has already lost the distinction between a literal and an interpolated value.
	const hardcodesCount = (template) => {
		HARDCODED_COUNT.lastIndex = 0;
		return HARDCODED_COUNT.test(template);
	};
	check(
		"hardcodesCount",
		// biome-ignore lint/suspicious/noTemplateCurlyInString: the interpolation is the specimen — this rule reads a generator's template source, so its cases must carry a literal ${}.
		hardcodesCount("Four values are marked, at positions ${list}."),
		true,
		"LOAD-BEARING: the exact sentence that was wrong for three commits. A rule that cannot catch its own motivating case is decoration.",
	);
	check(
		"hardcodesCount",
		// biome-ignore lint/suspicious/noTemplateCurlyInString: the interpolation is the specimen — this rule reads a generator's template source, so its cases must carry a literal ${}.
		hardcodesCount("${n} of the 60 have no Sanskrit entry"),
		false,
		"digits are not counts of generated things — 60 is a fact about the cycle, and flagging it would make the rule unusable.",
	);
	check(
		"hardcodesCount",
		// biome-ignore lint/suspicious/noTemplateCurlyInString: the interpolation is the specimen — this rule reads a generator's template source, so its cases must carry a literal ${}.
		hardcodesCount("choosing one would manufacture authority.\n\n${x}"),
		false,
		"LOAD-BEARING: without the sentence boundary this fires on a pronoun two sentences away, which is a false positive measured against the real generator.",
	);
	check(
		"hardcodesCount",
		hardcodesCount("Two independent implementations must agree."),
		false,
		"prose with no interpolation states nothing the generator computed.",
	);

	// --- Rule 12, the invariant. ---
	//
	// A template parser that silently matches nothing passes every document, and reads as coverage
	// while proving nothing. Derived from the tree so it needs no foresight: every generator that
	// writes a docs/*.md must yield at least one template, and at least one of those must contain an
	// interpolation — otherwise there was nothing for the rule to examine in the first place.
	//
	// It sat inside Rule 7 with a `process.exit` of its own until 2026-09-12 — a third exit path that
	// bypassed both this self-test's report and every finding already collected.
	for (const { file, source } of generators ?? []) {
		// This checker is not a generator, but its source quotes the pattern above, so a plain textual
		// signal cannot tell the description from the thing described. Excluded by name for that reason
		// alone -- it holds no writeFileSync call at all.
		if (file.endsWith("check-conventions.mjs")) continue;
		// A cruder, independent signal than DOCUMENT_TEMPLATE, on purpose: if that pattern ever stops
		// matching, this still fires and the invariant reports it rather than both falling silent.
		if (!source.includes('join(root, "docs"')) continue;
		check(
			"documentTemplates invariant",
			documentTemplates(source).some((template) => template.includes("${")),
			true,
			`${file} writes a document, but no interpolated template was recovered from it. Rule 12 would then pass vacuously for every generator, which reads as coverage while proving nothing.`,
		);
	}

	// --- Rule 7. ---
	check(
		"carriesNoData",
		carriesNoData("export interface Row {\n\tiso: string;\n}"),
		true,
		"a type-only module has nothing to transcribe, which is why it is exempt from provenance.",
	);
	check(
		"carriesNoData",
		carriesNoData('export const ROWS = [{ iso: "2026-01-01" }];'),
		false,
		"a fixture declaring data must still name its generator — the whole point of Rule 7.",
	);
	check(
		"carriesNoData",
		carriesNoData("export default { iso: 1 };"),
		false,
		"a default export is data too; only types are exempt.",
	);
	check(
		"carriesNoData",
		carriesNoData("// export const ROWS = [];\nexport type Row = { iso: string };"),
		true,
		"the words in a comment must not count as a declaration. Cross-checks codeLines.",
	);

	// --- Rule 10. ---
	check(
		"importedNames",
		importedNames('import {\n\tPHUGPA,\n\tPHUGPA_HENNING,\n} from "../../src/x.js";').has(
			"PHUGPA_HENNING",
		),
		true,
		"REQUIRED, not incidental: test/validation/ already holds multi-line import blocks. A line-oriented pattern under-matches and fails a suite that is perfectly correct — and it would fire on someone's reformatting, not on the change that introduced it.",
	);
	check(
		"importedNames",
		importedNames('describe("PHUGPA dates", () => {});\n// PHUGPA is checked in fpmt.test.ts').has(
			"PHUGPA",
		),
		false,
		"a comment and a describe title are exactly what satisfied the old grep. Closing that is the point of the rule change.",
	);
	check(
		"importedNames",
		importedNames('// import { TSURPHU } from "../../src/traditions/tsurphu.js";').has("TSURPHU"),
		false,
		"a commented-out import is not an import; importedNames runs over codeOf for this reason.",
	);
	check(
		"importedNames",
		importedNames('import { PHUGPA as PHUGPA_DEFAULT } from "../../src/x.js";').has("PHUGPA"),
		true,
		"an alias still imports the name the exporting module spells, which is what Rule 10 asks about.",
	);

	// --- codeLines, which several rules depend on and none would notice breaking. ---
	check(
		"codeLines",
		codeOf("/**\n * throws new Error when asked\n */\nconst a = 1;").includes("new Error"),
		false,
		"a docblock describing a construct must not be mistaken for the construct. Rule 2 reports a bare throw on this alone.",
	);
	check(
		"codeLines",
		codeOf("const a = 1; /* aside */ const b = 2;").includes("aside"),
		false,
		"an inline block comment is a comment.",
	);
	check(
		"codeLines",
		codeOf("const a = 1; // note").trim(),
		"const a = 1;",
		"code preceding a line comment survives.",
	);
	check(
		"codeLines",
		codeOf('const s = "// not a comment";').includes("not a comment"),
		false,
		"KNOWN LIMIT, not a guarantee: string literals are not tracked, so this is misparsed as a comment. Recorded so a later fix changes this case deliberately rather than being blocked by it.",
	);

	// --- Rule 13, the invariant. Derived from the tree, so it needs no foresight. ---
	//
	// Every name the barrel extractor returns must actually be declared under src/. An extractor
	// that silently matches nothing — a renamed keyword, a broken group — yields an empty set,
	// which would otherwise compare equal to an equally empty README reading and pass vacuously.
	// This fires on that without naming any particular type.
	// Both patterns, not just the second: in git's pathspec `src/**/*.ts` requires at least one
	// directory level, so it silently skips src/types.ts — where most of these are declared.
	const declaredTypes = new Set(
		tracked("src/*.ts", "src/**/*.ts").flatMap((file) =>
			[...read(file).matchAll(/export\s+(?:interface|type)\s+([A-Za-z][A-Za-z0-9]*)/g)].map(
				([, name]) => name,
			),
		),
	);
	for (const barrel of TYPE_BARRELS) {
		// Contained here rather than left to the backstop, because a throw out of the self-test skips
		// every rule — a barrel deleted and not yet staged would otherwise cost the whole report, the
		// failure this runner was restructured to end. Rule 13 reads the same file and reports that it
		// could not run, so skipping the invariant for this barrel cannot pass silently.
		let exported;
		try {
			exported = exportedTypeNames(read(barrel.file));
		} catch (error) {
			fail(
				"the checker's self-test could read its inputs",
				barrel.file,
				`${reasonOf(error)} The exportedTypeNames invariant was not proved for this barrel.`,
			);
			continue;
		}
		check(
			"exportedTypeNames invariant",
			exported.size > 0,
			true,
			`${barrel.file} re-exports types, so the extractor must find some. An empty set compares equal to an empty README reading and passes vacuously.`,
		);
		for (const name of exported) {
			check(
				"exportedTypeNames invariant",
				declaredTypes.has(name),
				true,
				`"${name}" is re-exported by ${barrel.file} but declared nowhere in src/. Either the extractor is collecting something that is not a type name, or the barrel is stale.`,
			);
		}
	}

	// --- Rule 13, the cases the invariant cannot see. ---
	check(
		"exportedTypeNames",
		[...exportedTypeNames("export type { Alpha, Beta } from './x.js';")].join(","),
		"Alpha,Beta",
		"the ordinary case: a braced type re-export lists its names.",
	);
	check(
		"exportedTypeNames",
		[...exportedTypeNames("export type { Alpha as Beta } from './x.js';")].join(","),
		"Beta",
		"an alias publishes the ALIAS. Collecting the left-hand name would report a type the consumer cannot import.",
	);
	check(
		"exportedTypeNames",
		exportedTypeNames("export { Alpha } from './x.js';").size,
		0,
		"a value export is not a type export. The invariant above is satisfied either way, so only this case catches it.",
	);
	check(
		"documentedTypeLists",
		[
			...(documentedTypeLists("Type-only exports: `Alpha`, `Beta`.\n\nNext paragraph.")[0]?.names ??
				[]),
		].join(","),
		"Alpha,Beta",
		"the README's prose list is read from its backticked identifiers, and stops at the blank line.",
	);
	check(
		"documentedTypeLists",
		documentedTypeLists("Type-only exports: `Alpha`.\n\nType-only exports: `Beta`.").length,
		2,
		"both entry points document a list, so the reader must find both. Finding one would silently leave ./observances unguarded.",
	);
	// `typeSectionRanges` is the newest and most intricate predicate here, and it had NO case at all
	// until a code review pointed out that its own docblock claimed otherwise — a false claim inside a
	// guard being worse than a missing one. Four cases, because the two failure modes differ in kind:
	// a heading that is absent, and headings present in the wrong order. Both must return null rather
	// than a plausible range, since a misassigned list means the rule compares a barrel against
	// another entry point's list and passes.
	const headings = TYPE_BARRELS.filter((barrel) => barrel.heading).map((barrel) => barrel.heading);
	const readmeLike = (order) =>
		`Type-only exports: \`Root\`.\n\n${order
			.map((heading) => `${heading}\n\nType-only exports: \`X\`.\n`)
			.join("\n")}`;
	check(
		"typeSectionRanges",
		typeSectionRanges(readmeLike(headings)) === null,
		false,
		"with every heading present in the declared order, the ranges must resolve.",
	);
	check(
		"typeSectionRanges",
		(typeSectionRanges(readmeLike(headings)) ?? []).every(
			(range, index, all) => index === 0 || (all[index - 1]?.from ?? 0) < range.from,
		),
		true,
		"the resolved ranges must ascend, or a list would be assigned to the wrong entry point.",
	);
	check(
		"typeSectionRanges",
		typeSectionRanges(readmeLike([...headings].reverse())) === null,
		true,
		"headings out of the declared order must refuse rather than guess: the ranges would otherwise run backwards and every list would be compared against the wrong barrel.",
	);
	check(
		"typeSectionRanges",
		typeSectionRanges(readmeLike(headings.slice(1))) === null,
		true,
		"a missing heading must refuse, or one entry point would go unguarded — the state rule 13 exists to end. Note which arm refuses: the ORDERING comparison, because indexOf returns -1 and -1 is below the root's 0. Mutating the `=== -1` arm away leaves this case passing, which was checked; that arm is therefore defensive rather than load-bearing, and is kept as the statement of intent for a future TYPE_BARRELS whose first entry is not the root.",
	);

	// --- Rule 14, the invariant. Derived from the tree, so it needs no foresight. ---
	//
	// `functionBodies` brace-matches. If a construct in src/ ever breaks that, it returns few or no
	// functions and Rule 14 passes vacuously over an empty set — the exact failure shape this file
	// exists to prevent. The guard is a deliberately CRUDER, independent count: a bare regex tally of
	// `function name(` with no brace-matching at all, so one bug cannot silence both.
	const parsedFunctions = sources.reduce((n, file) => n + functionBodies(read(file)).length, 0);
	const crudeFunctions = sources.reduce(
		(n, file) =>
			n + (codeOf(read(file)).match(/(?:^|[^\w.$])function\s+[A-Za-z0-9_$]+\s*[(<]/g) ?? []).length,
		0,
	);
	check(
		"functionBodies finds src/'s functions",
		parsedFunctions > 0 && parsedFunctions >= crudeFunctions - 2,
		true,
		`brace-matching must find substantially every function a crude tally finds; got ${parsedFunctions} against ${crudeFunctions}. A parser that silently returns nothing makes Rule 14 report "no duplicates" for ever.`,
	);

	// --- Rule 14, the cases the invariant cannot see. ---
	const bodyOf = (src) => functionBodies(src)[0]?.body;
	check(
		"functionBodies ignores comments and whitespace",
		bodyOf(`function a(x: number): number {
	// a comment
	return x + 1;
}`) === bodyOf("function b(x: number): number { /* different comment */ return x + 1; }"),
		true,
		"two copies that differ only in their comments must compare equal, or a duplicate hides behind a reworded docblock. The two real duplicates found on 2026-09-23 had different docblocks.",
	);
	check(
		"functionBodies separates different bodies",
		bodyOf("function a(x: number): number { return x + 1; }") ===
			bodyOf("function b(x: number): number { return x + 2; }"),
		false,
		"a predicate that collapses distinct bodies would report every short function as a duplicate of every other.",
	);
	check(
		"functionBodies matches the whole body, not the first line",
		bodyOf("function a(): void { if (x) { go(); } done(); }"),
		"if (x) { go(); } done();",
		"brace-matching must span nested braces. Stopping at the first `}` truncates every guard-shaped function to its `if`, which would make unrelated functions compare equal.",
	);
	// Read from src/, never restated here. A hand copy of the body would keep passing while the
	// real function shrank below the floor, which is the failure this case exists to catch.
	const smallestRealDuplicate = functionBodies(read("src/errors.ts")).find(
		(fn) => fn.name === "assertSafeYear",
	);
	check(
		"the duplicate floor admits the real cases",
		(smallestRealDuplicate?.body.length ?? 0) >= DUPLICATE_BODY_FLOOR,
		true,
		"`assertSafeYear` is the smaller of the two duplicates this rule was built from on 2026-09-23, and it must sit above the floor — a floor above it would have let both real cases through. A `false` here also means the function was renamed or moved out of src/errors.ts, in which case point this case at its new home rather than lowering the floor.",
	);

	// --- Rule 15's home must exist, and must be the only file exempt from it. ---
	//
	// Two failures this catches, and neither is loud on its own. If `src/temporal-kind.ts` is
	// renamed and this constant is not, the rule silently becomes one that bans `instanceof
	// Temporal` everywhere with nowhere legal to put it — and it would still read "All conventions
	// hold" until someone next wrote one. And the home is only a home if it actually holds the
	// predicate: a file that has stopped asking `instanceof Temporal` is not exempting anything,
	// which means the policy moved and nobody moved the exemption.
	// `homePresent` is read once and guards the second check, which would otherwise call `read` on a
	// path that is not there — and `read` throws by design. A self-test that crashes reports
	// nothing, which is the failure it exists to prevent, one level up.
	const homePresent = sources.includes(TEMPORAL_KIND_HOME);
	check(
		"rule 15's exempt file",
		homePresent,
		true,
		`${TEMPORAL_KIND_HOME} must exist in src/. Rule 15 exempts it by path, so a rename that leaves the constant behind turns the rule into one with no legal home.`,
	);
	check(
		"rule 15's exempt file",
		homePresent && codeLines(read(TEMPORAL_KIND_HOME)).some(({ code }) => isIdentityCheck(code)),
		true,
		`${TEMPORAL_KIND_HOME} must actually contain an \`instanceof Temporal\` check **in code**. If it does not, the boundary predicate has moved and the exemption is pointing at the wrong file — which no amount of running rule 15 would reveal. CODE lines only, deliberately: that file says \`instanceof Temporal\` three times in its own docblock explaining why it is the only file allowed to, so a whole-text search here is satisfied by the prose it is meant to be independent of, and deleting the one real check would leave this green. Found by review, not by running it.`,
	);

	// --- Rule 16's parsers. Each case is one the rule would silently get wrong. ---
	check(
		"exportedValueNames",
		[
			...exportedValueNames(
				[
					'export type { A, B } from "./a.js";',
					'export { c, d as e } from "./c.js";',
					"export function f() {}",
					"export const G = 1;",
				].join("\n"),
			),
		].join(","),
		"c,e,f,G",
		"a type block must not be read as values (A, B), an alias publishes its alias (e), and a declaration in the barrel itself is an export (f, G). The astrology barrel declares most of its functions in place.",
	);
	check(
		"documentedTableRows",
		documentedTableRows(
			[
				"| Export | Notes |",
				"|---|---|",
				"| `a` | x |",
				"| `b` or `c` | y |",
				"",
				"| Other | Notes |",
				"|---|---|",
				"| `d` | z |",
			].join("\n"),
			"Export",
		)
			.map((row) => row.name)
			.join(","),
		"a",
		"a row counts only when its first cell is one backticked identifier (not `b` or `c`), and only in a table whose header opens with the heading asked for (not d).",
	);
	check(
		"errorCodeUnion",
		[
			...errorCodeUnion(
				[
					"export type TibetanCalendarErrorCode =",
					'\t| "TCT_A"',
					'\t| "TCT_B";',
					'const x = "TCT_C";',
				].join("\n"),
			),
		].join(","),
		"TCT_A,TCT_B",
		"the union ends at its semicolon; a code string elsewhere in the file (TCT_C) is not a member.",
	);

	// --- Rule 4's public-docblock scope. Too wide reports internal links, too narrow misses fields. ---
	check(
		"publicDocblockLinks",
		publicDocblockLinks(
			[
				"/** Internal: see {@link a}. */",
				"function internal() {}",
				"/** Public: see {@link b}. */",
				"export function pub() {}",
				"export interface Shape {",
				"\t/** A field: see {@link c}. */",
				"\treadonly field?: number;",
				"}",
				"export interface Hidden {",
				"\t/** Not published: see {@link d}. */",
				"\treadonly field: number;",
				"}",
				"/** A module link {@link ./x.js} is not a symbol. */",
				"export const pub2 = 1;",
			].join("\n"),
			(name) => ["pub", "Shape", "pub2"].includes(name),
		)
			.map(({ line, target }) => `${line}:${target}`)
			.join(","),
		"3:b,6:c",
		"only a docblock on a published declaration (b) or on a member of a published interface (c) is in scope; an internal function's (a), an unpublished interface member's (d) and a module link are not.",
	);

	// --- The registry. A rule dropped from it stops running and says nothing. ---
	//
	// Every other rule failure in this file is loud; this one is not, because a rule that never runs
	// collects no findings and the run reads "All conventions hold". Checked against the numbers
	// rather than a count alone, so a duplicate cannot stand in for the missing rule.
	check(
		"RULES registry",
		RULES.map(({ number }) => number)
			.sort((a, b) => a - b)
			.join(","),
		Array.from({ length: 16 }, (_, index) => index + 1).join(","),
		"every rule 1-16 must be registered exactly once. Adding a rule means adding it here too.",
	);
	check(
		"RULES registry",
		RULES.every(({ number, run }) => typeof run === "function" && run.name === `rule${number}`),
		true,
		"each registry entry must name its own rule's function. `{ number: 8, run: rule9 }` passes the number check above while rule 8 never runs and rule 9 runs twice.",
	);

	if (broken.length > 0) {
		console.error("The checker itself is broken.\n");
		console.error(
			"This is not a convention violation, and no rule was run. A check below no longer\nbehaves as specified, so every rule resting on it is unreliable.\n",
		);
		for (const failure of broken) {
			console.error(`  ${failure}\n`);
		}
		console.error(
			"Fix the predicate, not the expectation. Each case states why it must hold; if a case is\ngenuinely wrong, change it deliberately and say so.\n",
		);
		report();
		return false;
	}
	return true;
}

// ---------------------------------------------------------------------------------------
// The shared corpora
//
// What more than one rule reads, built once and before any of them. Each used to be declared
// inside whichever rule needed it first — `generators` in Rule 7 and read again by Rule 12,
// `testFiles` and `mirroredDirectories` in Rule 9 and read again by Rule 11 — so one rule's
// dependency on another's section was implied by file position rather than stated, and reordering
// the rules could break a rule that had not been touched.
//
// Building them reads files, so each is guarded on its own: a failure is reported rather than
// thrown, one unbuildable corpus does not take the others with it, and every rule that reads a
// corpus it could not get fails loudly on its own account.
// ---------------------------------------------------------------------------------------

function corpus(name, build) {
	try {
		return build();
	} catch (error) {
		fail(
			"the checker's shared corpora could be built",
			"scripts/check-conventions.mjs",
			`\`${name}\` could not be built: ${reasonOf(error)} Every rule reading it could not run either.`,
		);
		return undefined;
	}
}

const manifest = corpus("manifest", () => JSON.parse(read("package.json")));
const sources = corpus("sources", () => tracked("src/*.ts", "src/**/*.ts"));
const generators = corpus("generators", () =>
	tracked("scripts/*.mjs").map((file) => ({ file, source: read(file) })),
);
const testFiles = corpus("testFiles", () => tracked("test").filter((file) => file.endsWith(".ts")));
const mirroredDirectories = corpus(
	"mirroredDirectories",
	() => new Set(tracked("src/*/*.ts").map((file) => file.split("/")[1])),
);

// ---------------------------------------------------------------------------------------
// Rule 1 — zero runtime dependencies
//
// The package's headline claim, in the README and in CLAUDE.md, and until now asserted by
// nothing. publint and attw check the manifest's shape, not its dependency count.
// ---------------------------------------------------------------------------------------
function rule1() {
	for (const field of ["dependencies", "peerDependencies", "optionalDependencies"]) {
		const entries = Object.keys(manifest[field] ?? {});
		if (entries.length > 0) {
			fail(
				"zero runtime dependencies",
				"package.json",
				`${field} must be absent; found ${entries.join(", ")}. Temporal is a language built-in and the engine depends on nothing. A generation-time package is resolved from the caller's working directory instead — see scripts/verify-name-sources.mjs.`,
			);
		}
	}
}

// ---------------------------------------------------------------------------------------
// Rule 2 — coded errors only
//
// The code is the part consumers branch on. A bare construction silently omits it, and
// tibetanDateExists allowlists codes rather than types, so an uncoded throw escapes the
// predicate entirely.
// ---------------------------------------------------------------------------------------
function rule2() {
	const BARE_ERROR = /\bnew\s+(Error|RangeError|TypeError|SyntaxError)\s*\(/;

	for (const file of sources) {
		if (file === "src/errors.ts") continue;
		for (const line of codeLines(read(file))) {
			const match = BARE_ERROR.exec(line.code);
			if (match) {
				fail(
					"coded errors, never a bare construction",
					`${file}:${line.number}`,
					`\`new ${match[1]}\` loses the code a consumer branches on. Throw through rangeError() or codedError() in src/errors.ts, or use assertInternal() for an invariant this engine proves for itself.`,
				);
			}
		}
	}
}

// ---------------------------------------------------------------------------------------
// Rule 3 — integer-only arithmetic
//
// A float here is not a crash. It is a date that is right on one platform and wrong on
// another, which is the failure the whole integer strategy exists to prevent. Division is
// where one enters, so every division outside the arithmetic helpers must say, at the site,
// why it stays exact. The marker is deliberately a sentence rather than a suppression: the
// seven existing sites are all safe, and none of them said so before this rule landed.
// ---------------------------------------------------------------------------------------
function rule3() {
	const EXACTNESS_MARKER = /\bexact:/;

	for (const file of sources) {
		if (file === "src/computation/arithmetic.ts") continue;
		const lines = codeLines(read(file));
		for (const [index, line] of lines.entries()) {
			if (!line.code.includes(" / ")) continue;

			// The marker may sit anywhere in the run of lines introducing this statement: on the line
			// itself, in a multi-line comment block above it, or above a statement that wraps so the
			// division lands on a continuation line. Walk upward through comment-only lines and
			// unterminated code lines, stopping at the first line that closes a previous statement.
			let justified = EXACTNESS_MARKER.test(line.comment);
			for (let above = index - 1; !justified && above >= 0; above--) {
				const candidate = lines[above];
				const isCommentOnly = candidate.code.trim() === "" && candidate.comment.trim() !== "";
				const isUnterminated =
					candidate.code.trim() !== "" && !/[;}]\s*$/.test(candidate.code.trim());
				if (!isCommentOnly && !isUnterminated) break;
				justified = EXACTNESS_MARKER.test(candidate.comment);
			}

			if (!justified) {
				fail(
					"integer-only arithmetic",
					`${file}:${line.number}`,
					"a division outside src/computation/arithmetic.ts must carry an `exact:` comment saying why it cannot lose precision — on the same line, or on the comment line directly above. Prefer floorDiv() or ceilDiv() where the intent is integer division.",
				);
			}
		}
	}
}

// ---------------------------------------------------------------------------------------
// Rule 4 — {@link} targets resolve
//
// Docblocks reach the shipped .d.ts and are what editor hover renders, so a dangling link is
// a broken contract statement rather than a tidying issue. Only the root symbol is checked;
// a member path is trusted past its first segment, which still catches every rename of the
// thing being linked.
// ---------------------------------------------------------------------------------------
function rule4() {
	const DECLARATION =
		/^\s*(?:export\s+)?(?:declare\s+)?(?:abstract\s+)?(?:async\s+)?(?:function|const|let|var|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/gm;
	const NAMED_EXPORT = /^\s*export\s+(?:type\s+)?\{([^}]*)\}/gm;

	const symbols = new Set();
	for (const file of sources) {
		const source = read(file);
		for (const [, name] of source.matchAll(DECLARATION)) symbols.add(name);
		for (const [, group] of source.matchAll(NAMED_EXPORT)) {
			for (const entry of group.split(",")) {
				const name = entry
					.trim()
					.split(/\s+as\s+/)
					.pop()
					?.replace(/^type\s+/, "")
					.trim();
				if (name) symbols.add(name);
			}
		}
	}

	const LINK = /\{@link\s+([^}|\s]+)(?:[|\s][^}]*)?\}/g;

	for (const file of sources) {
		for (const line of codeLines(read(file))) {
			for (const [, target] of line.comment.matchAll(LINK)) {
				// A module link — `{@link ./types.js}` — names a file rather than a symbol.
				if (target.endsWith(".js")) {
					const resolved = resolve(root, file, "..", target.replace(/\.js$/, ".ts"));
					if (!existsSync(resolved)) {
						fail("{@link} targets resolve", `${file}:${line.number}`, `no module at ${target}`);
					}
					continue;
				}
				// A qualified link — `{@link ../traditions/types.TraditionConfig.leapIndexThreshold}` —
				// puts the *module basename* first after the last slash, then the symbol. An unqualified
				// one starts at the symbol. Getting this backwards reports every qualified link as
				// broken, which is how the rule failed the first time it ran.
				const qualified = target.includes("/");
				const parts = target.slice(target.lastIndexOf("/") + 1).split(".");
				if (qualified) {
					const module = resolve(
						root,
						file,
						"..",
						`${target.slice(0, target.lastIndexOf("/"))}/${parts[0]}.ts`,
					);
					if (!existsSync(module)) {
						fail("{@link} targets resolve", `${file}:${line.number}`, `no module at ${target}`);
						continue;
					}
				}
				const rootSymbol = qualified ? parts[1] : parts[0];
				if (rootSymbol && !symbols.has(rootSymbol)) {
					fail(
						"{@link} targets resolve",
						`${file}:${line.number}`,
						`{@link ${target}} names \`${rootSymbol}\`, which is not declared anywhere in src/. A stale link ships in the .d.ts and renders as plain text on hover.`,
					);
				}
			}
		}
	}

	const published = new Set(
		TYPE_BARRELS.flatMap(({ file }) => {
			const source = read(file);
			return [...exportedValueNames(source), ...exportedTypeNames(source)];
		}),
	);
	for (const file of sources) {
		for (const { line, target } of publicDocblockLinks(read(file), (name) => published.has(name))) {
			const parts = target.slice(target.lastIndexOf("/") + 1).split(".");
			const rootSymbol = target.includes("/") ? parts[1] : parts[0];
			if (rootSymbol && !published.has(rootSymbol)) {
				fail(
					"{@link} targets resolve",
					`${file}:${line}`,
					`{@link ${target}} is in a docblock that ships in dist/*.d.ts, and \`${rootSymbol}\` is not exported from any entry point — a consumer reading it on hover is pointed at something they cannot import. Name it in prose, or link what the barrels export.`,
				);
			}
		}
	}
}

// ---------------------------------------------------------------------------------------
// Rule 5 — decision-record format
//
// The format is fixed so a reader can find the outcome without reading the reasoning, and so
// markdownlint does not read a `title:` key plus an H1 as two titles.
// ---------------------------------------------------------------------------------------
function rule5() {
	const RECORD_NAME = /^\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.md$/;
	const STATUSES = new Set(["accepted", "superseded", "deprecated"]);

	for (const file of tracked("docs/decisions/*.md")) {
		const name = basename(file);
		if (!RECORD_NAME.test(name)) {
			fail("decision-record format", file, "filename must be YYYY-MM-DD-slug.md, all lowercase.");
			continue;
		}

		const source = read(file);
		const front = /^---\n([\s\S]*?)\n---\n/.exec(source);
		if (!front) {
			fail(
				"decision-record format",
				file,
				"missing YAML front matter carrying `date` and `status`.",
			);
			continue;
		}

		const keys = front[1]
			.split("\n")
			.map((line) => line.split(":")[0]?.trim())
			.filter(Boolean);
		const extra = keys.filter((key) => key !== "date" && key !== "status");
		if (extra.length > 0) {
			fail(
				"decision-record format",
				file,
				`front matter carries only \`date\` and \`status\`; found ${extra.join(", ")}. A \`title\` key duplicates the H1 and makes markdownlint read the file as having two titles.`,
			);
		}

		const status = /^status:\s*(\S+)/m.exec(front[1])?.[1];
		if (!status || !STATUSES.has(status)) {
			fail("decision-record format", file, `status must be one of ${[...STATUSES].join(" / ")}.`);
		}

		const body = source.slice(front[0].length);
		const headings = [...body.matchAll(/^#\s+(.+)$/gm)];
		if (headings.length !== 1) {
			fail(
				"decision-record format",
				file,
				`expected exactly one H1 title; found ${headings.length}.`,
			);
		}

		const afterTitle = body.slice((headings[0]?.index ?? 0) + (headings[0]?.[0].length ?? 0));
		const firstParagraph = afterTitle.split("\n").find((line) => line.trim() !== "");
		if (firstParagraph === undefined || !firstParagraph.startsWith("**Decision:**")) {
			fail(
				"decision-record format",
				file,
				"a bold `**Decision:**` line must state the outcome before any reasoning. A record that only narrates deliberation is a planning artifact and gets deleted.",
			);
		}
	}
}

// ---------------------------------------------------------------------------------------
// Rule 6 — the enforcement map stays live
//
// docs/coding-standards.md maps every rule to the command that fails when it is broken. That
// is only worth having if the commands and paths it names still exist, so the map checks
// itself. Without this it would drift exactly the way the prose version it replaced would.
// ---------------------------------------------------------------------------------------
function rule6() {
	const MAP = "docs/coding-standards.md";
	if (existsSync(resolve(root, MAP))) {
		const source = read(MAP);
		const scripts = new Set(Object.keys(manifest.scripts ?? {}));

		for (const [, command] of source.matchAll(/`npm run ([\w:]+)`/g)) {
			if (!scripts.has(command)) {
				fail(
					"enforcement map stays live",
					MAP,
					`names \`npm run ${command}\`, which is not in package.json#scripts.`,
				);
			}
		}

		for (const [, path] of source.matchAll(/`((?:src|test|scripts|docs)\/[\w./-]+)`/g)) {
			if (!existsSync(resolve(root, path))) {
				fail("enforcement map stays live", MAP, `names \`${path}\`, which does not exist.`);
			}
		}
	}
}

// ---------------------------------------------------------------------------------------
// Rule 7 — fixture provenance
//
// Fixtures are generated and the generator is committed beside them; that pairing is the
// provenance record. Hand-transcription is how a silent one-day error reaches the primary
// correctness gate, which has happened.
//
// Three deliberate exceptions, and the test for all of them is narrow: the authority publishes the
// data in a form with nothing to parse, so a generator could only wrap a lossy reading. FPMT
// publishes its holy days in prose announcements. The Royal Government of Bhutan publishes its
// calendar as a scanned PDF with no text layer at all, where a generator would be OCR — and an OCR
// misread of a Tibetan numeral is a plausible wrong date, which is the failure this package exists
// to prevent. Henning's list of the six-season months is a scanned book whose OCR layer shifts the
// table's columns against its rows, so a generator would pair months with the wrong seasons.
//
// "Parsing it is inconvenient" is not the test. None of these has usable markup.
//
// A third category, and it is a category rather than a grown exception: a file that **carries no
// data at all**. crosscheck-row.ts holds the row type its three sibling fixtures share and declares
// no value, so the transcription error this rule exists to prevent cannot occur in it — there is
// nothing to transcribe.
//
// It is checked first, deliberately. A type-only module would otherwise pass by *accident*, since
// the three generators emit an import naming it and `source.includes(name)` cannot tell an import
// line from a generator's output. A provenance rule that passes for the wrong reason is worse than
// one that fails, so the category is stated rather than left to coincidence.
// ---------------------------------------------------------------------------------------
function rule7() {
	const HAND_CURATED = new Set(["fpmt-holy-days.ts", "rgob.ts", "henning-six-seasons.ts"]);

	for (const fixture of tracked("test/fixtures/*.ts")) {
		const name = basename(fixture, ".ts");
		if (HAND_CURATED.has(`${name}.ts`)) continue;
		if (carriesNoData(read(fixture))) continue;
		if (!generators.some(({ source }) => source.includes(name))) {
			fail(
				"fixture provenance",
				fixture,
				`no script in scripts/ names this fixture, and it declares data. Fixtures are generated, not transcribed — add the generator and commit it alongside the output. The only exceptions are ${[...HAND_CURATED].join(", ")}, and each earns it the same narrow way: its source has no usable markup, so a generator could only wrap a lossy reading. "Parsing it is inconvenient" is not the test. A file declaring only types is exempt, having nothing to transcribe.`,
			);
		}
	}
}

// ---------------------------------------------------------------------------------------
// Rule 12 — a generated document may not hardcode a count the generator computes
//
// `docs/names/rabjung.md` carried the sentence "Four values are marked, at positions 6, 15, 31,
// 37, 60" for three commits. The list is interpolated from the correction records; the word
// "Four" is a literal beside it. There were five positions and nine marked cells, and the
// sentence had been wrong since the moment a fifth correction was added.
//
// A generator can always emit a computed digit, so a literal number-word next to an
// interpolation is never necessary — which is what makes this checkable without judgement.
// Digits are NOT flagged: `${n} of the 60` is legitimate, because 60 is a fact about the cycle
// rather than a count of anything the generator produced.
//
// The window stops at a sentence boundary. Without that, the rule fires on
// "choosing one would manufacture authority rather than source it.\n\n${...}", where "one" is a
// pronoun two sentences away — a false positive measured against the real generator.
function rule12() {
	for (const { file, source } of generators) {
		for (const template of documentTemplates(source)) {
			for (const match of template.matchAll(HARDCODED_COUNT)) {
				fail(
					"generated documents state computed counts",
					file,
					`the emitted markdown reads ${JSON.stringify(match[0].slice(0, 70))} — a literal number-word in the same sentence as an interpolated value. Emit the count instead: it is the shape of "Four values are marked, at positions \${...}", which was wrong for three commits because the list grew and the word did not.`,
				);
			}
		}
	}
}

// ---------------------------------------------------------------------------------------
// Rule 8 — every TCT_ code named in src/ is a real one
//
// Codes are contract and message text is not, so a code is the one string in an error a
// consumer is told to branch on. A typo in a `@throws` sends them branching on a code that is
// never thrown, and a typo in a `codedError` call throws one they were never told about.
// Neither is a type error: both are string literals in prose or in an argument.
// ---------------------------------------------------------------------------------------
function rule8() {
	const CODE_UNION = new Set(
		[...read("src/errors.ts").matchAll(/\|\s*"(TCT_[A-Z_]+)"/g)].map(([, code]) => code),
	);

	for (const file of sources) {
		for (const line of codeLines(read(file))) {
			for (const [, code] of `${line.code}${line.comment}`.matchAll(/\b(TCT_[A-Z_]+)\b/g)) {
				if (!CODE_UNION.has(code)) {
					fail(
						"error codes are real",
						`${file}:${line.number}`,
						`\`${code}\` is not a member of TibetanCalendarErrorCode. A code is the one part of an error consumers branch on, so a typo in a @throws or a codedError call is a broken contract that no type check catches.`,
					);
				}
			}
		}
	}
}

// ---------------------------------------------------------------------------------------
// Rule 9 — validation suites are named for the fixtures they validate
//
// A test whose subject is agreement with an external source is named for the fixture — or the
// fixture prefix — it validates, and lives in test/validation/. That parity is what lets a
// reader find the test for a fixture without opening anything, and it had already drifted:
// bhutan-fixture.test.ts carried a redundant suffix, in a directory of its own invention.
//
// Two halves, because neither alone would have caught that. The directory set catches a new
// home appearing; the prefix rule catches a suite in the right home under the wrong name.
//
// Deliberately blind to everything outside test/validation/, because the exclusion is the half
// a later sweep gets wrong: taking a fixture as *input* does not make a test a validation
// suite. conversion.test.ts imports losar and epoch.test.ts imports sixty-year-cycle, and both
// are named for their module, correctly.
// ---------------------------------------------------------------------------------------
function rule9() {
	// Directories under test/ that hold no suites at all, so no parity question arises.
	const INFRASTRUCTURE_DIRECTORIES = new Set(["fixtures", "support"]);

	// A directory under test/ earns its place by **mirroring a directory under src/**, rather than by
	// being on a list. That was not always so: the set was hardcoded as
	// `["computation", "fixtures", "support", "validation"]`, of which exactly one entry —
	// `computation` — was a module-suite mirror, and the other three were infrastructure or the
	// external-source home. So the "sanctioned set" was one name plus scaffolding, and it went stale
	// the moment src/ grew a second subsystem.
	//
	// It had already cost something. `src/observances/` had nowhere to put a module suite, so
	// `observances.test.ts` sat in test/validation/ with its subject recorded in a comment as the
	// observance *engine* and a hand-written exemption stopping Rule 9 firing on it. That exemption is
	// gone, and so is the file's misplacement — see docs/testing.md.
	//
	// Deriving the mirrors keeps every existing outcome and adds no licence: test/bench/ is still
	// rejected, because there is no src/bench/, which is the reason CLAUDE.md gives for refusing it —
	// a benchmark is neither a module suite nor an external-source suite. The set is
	// `mirroredDirectories`, built with the shared corpora because Rule 11 reads it too.

	const FIXTURE_IMPORT = /from\s+"(?:\.\.\/)+fixtures\/([a-z0-9-]+)\.js"/g;

	const reportedDirectories = new Set();

	for (const file of testFiles) {
		const [, directory] = file.split("/");
		if (file.split("/").length < 3) continue;
		if (directory === "validation") continue;
		if (INFRASTRUCTURE_DIRECTORIES.has(directory)) continue;
		if (mirroredDirectories.has(directory)) continue;
		if (reportedDirectories.has(directory)) continue;
		reportedDirectories.add(directory);
		fail(
			"validation suites are named for their fixtures",
			`test/${directory}/`,
			`is neither test/validation/, nor infrastructure (${[...INFRASTRUCTURE_DIRECTORIES].join(", ")}), nor a mirror of a directory under src/ (${[...mirroredDirectories].join(", ")}). A suite validating the engine against an external source belongs in test/validation/, named for the fixture it validates; a suite whose subject is a module belongs in the directory mirroring that module's own. A third home means one of those two questions was not answered — see docs/testing.md.`,
		);
	}

	for (const file of testFiles) {
		if (!file.startsWith("test/validation/") || !file.endsWith(".test.ts")) continue;

		const suite = basename(file, ".test.ts");
		const fixtures = [...read(file).matchAll(FIXTURE_IMPORT)].map(([, fixture]) => fixture);
		if (fixtures.length === 0) continue;

		// **At least one**, not every one, and the distinction is load-bearing in both directions.
		//
		// Requiring every import to match would forbid a suite consulting a *second, independent*
		// source — which is the cross-checking this project is built on: bhutan.test.ts holds the
		// Bhutanese day data to Janson's leap-month table as well as to itself, and those fixtures
		// share no prefix by construction, because they share no lineage.
		//
		// Requiring only that the names be prefix-*related* in either direction would be too weak: it
		// would accept bhutan-fixture.test.ts, the exact drift this rule exists to catch, since
		// "bhutan-fixture" does start with "bhutan". The direction is what carries the rule.
		if (!validatesFixture(suite, fixtures)) {
			fail(
				"validation suites are named for their fixtures",
				file,
				`validates ${fixtures.map((fixture) => `test/fixtures/${fixture}.ts`).join(", ")}, and none of those names starts with "${suite}". Name the suite for the fixture it validates, or for the prefix it shares with the others it covers — fpmt.test.ts covers both fpmt-*, crosscheck.test.ts all three crosscheck-*. A suite may consult further fixtures as independent cross-checks, but its name has to identify the one it is about. If the suite's real subject is a module rather than a source, it belongs beside that module instead.`,
			);
		}
	}
}

// ---------------------------------------------------------------------------------------
// Rule 10 — an exported tradition config is exercised by a validation suite
//
// Exporting a TraditionConfig asserts that dates computed with it are that tradition's real
// dates. Expressing a tradition, validating its leap months and validating its dates are three
// separate claims, and only the third earns an export — see
// docs/decisions/2026-08-16-exported-means-validated.md.
//
// The check is deliberately weaker than the rule: it cannot tell whether a suite validates much,
// only that one **imports** the config. That is the part a machine can see, and it fails on the
// mistake the rule is about — adding an export without adding evidence. Tsurphu and the Mongolian
// version are the live case: both are fully expressible and their leap months are checked, and
// both must stay unexported until something checks a date.
//
// Imported, not merely mentioned. Until 2026-08-17 this concatenated every suite and grepped for
// `\bPHUGPA\b`, which a **comment** satisfied as readily as an assertion — so deleting a suite's
// assertions while leaving the prose behind kept the rule green. Stripping comments would not have
// been enough either: `describe("BHUTAN dates", …)` is a string literal, and `codeLines` does not
// track those. An import is the smallest thing that cannot be faked by writing about it.
//
// Two deliberate blind spots, so the next person to hit one does not read it as a bug in their own
// code: **namespace imports** (`import * as t`) and default imports are not matched. No suite uses
// either. The failure would be a loud false positive rather than a silent pass, which is the right
// direction for a rule whose job is to refuse an unevidenced export.
// ---------------------------------------------------------------------------------------
function rule10() {
	const CONFIG_EXPORT = /^export \{([^}]*)\} from "\.\/traditions\/[\w-]+\.js";$/gm;
	const validationImports = new Set();
	for (const file of tracked("test/validation").filter((file) => file.endsWith(".test.ts"))) {
		for (const name of importedNames(read(file))) validationImports.add(name);
	}

	for (const [, names] of read("src/index.ts").matchAll(CONFIG_EXPORT)) {
		for (const name of names.split(",").map((part) => part.trim())) {
			// Type-only exports carry no dates and nothing to validate.
			if (name === "" || name.startsWith("type ") || !/^[A-Z][A-Z0-9_]*$/.test(name)) continue;
			if (!validationImports.has(name)) {
				fail(
					"exported configs are validated",
					"src/index.ts",
					`exports the tradition config \`${name}\`, which no suite in test/validation/ imports. Exporting a config asserts its dates are that tradition's real dates, which self-consistency cannot establish — a round trip proves the arithmetic inverts itself and cannot catch a shared misreading of the paper. Tile it against an external calendar day by day, record the window in docs/testing.md, and keep it in docs/traditions.md as data until then. Naming it in a comment or a describe title does not count, and a namespace import is not matched.`,
				);
			}
		}
	}
}

// ---------------------------------------------------------------------------------------
// Rule 11 — a suite in test/computation/ is named for a src/computation/ module
//
// docs/testing.md states the directory is "one suite per src/computation module", and seven of
// nine files honoured it while two were named for a *concept* instead — leap-index-threshold and
// leap-month-position, neither of which is a module. A concept name in a module-parity directory
// is the same false promise Rule 9 catches one directory over: it tells a reader the file's
// subject is something the tree cannot confirm.
//
// The predicate is longest-prefix, deliberately, and getting this wrong is easy: a
// first-`-`-segment rule looks equivalent and rejects mean-astronomy.test.ts, the one hyphenated
// module in src/computation/ and a file that was already correct. Splitting on "-" answers a
// different question than the one being asked.
//
// A focused suite may narrow a module — calendar-leap-index-threshold.test.ts is a calendar.ts
// suite about one rule — but the module it narrows has to lead the name. A suite whose subject
// spans several modules is not a module suite at all and belongs at test/ root, beside
// invariants.test.ts and regression.test.ts.
//
// This runs over **every mirrored directory**, not test/computation/ alone. It was written for
// computation because that was the only mirror that existed; the examples above are still drawn
// from there because that is where the two real drifts happened.
// ---------------------------------------------------------------------------------------
function rule11() {
	// Only directories that actually exist under test/, or `git ls-files` writes a warning per missing
	// path to stderr and CI output fills with noise about directories nobody has created yet.
	const testDirectories = new Set(
		testFiles.filter((file) => file.split("/").length > 2).map((file) => file.split("/")[1]),
	);

	for (const directory of mirroredDirectories) {
		if (!testDirectories.has(directory)) continue;
		// `index` is kept, not filtered. A subsystem's engine lives in its barrel — getObservances is
		// in src/observances/index.ts — so test/observances/index.test.ts is the honest name for its
		// suite, and filtering the barrel out would reject the one file this rule most needs to admit.
		const modules = tracked(`src/${directory}/*.ts`).map((file) => basename(file, ".ts"));

		for (const file of tracked(`test/${directory}/*.test.ts`)) {
			const suite = basename(file, ".test.ts");
			if (namedForModule(suite, modules)) continue;
			fail(
				"module suites are named for their module",
				file,
				`is not named for any module in src/${directory}/ (${modules.join(", ")}). Name it for the module it tests, optionally narrowed — calendar-leap-index-threshold.test.ts is a calendar.ts suite about one rule. If its subject spans several modules it is not a module suite: move it to test/ root, where invariants.test.ts and regression.test.ts already live. See docs/testing.md.`,
			);
		}
	}
}

// ---------------------------------------------------------------------------------------
// Rule 13 — the README's type lists match what the barrels export
//
// `test/public-api.test.ts` pins the runtime surface by reading `Object.keys(api)` and `typeof`.
// Types are erased at runtime, so removing or renaming an exported interface passes every one of
// the CI commands. That is not hypothetical: `RabjungName` and `SanskritName` came off the
// surface on 2026-08-25 and the only thing that caught the now-false type list in `README.md` was
// a grep somebody happened to run. The README ships in the tarball and is what npmjs.com renders,
// so a stale type list is a false contract statement rather than a tidying issue.
//
// This closes the LIST half only. Prose describing a type's FIELDS is not checked here and stays
// a review item — `README.md` described `rabjungFor`'s `name` as carrying Sanskrit for hours after
// it stopped doing so, and no predicate available here would have seen it. The enforcement map
// says so rather than letting this rule read as full coverage.
// ---------------------------------------------------------------------------------------
function rule13() {
	const RULE = "README type lists match the barrels";
	const readme = read("README.md");
	const lists = documentedTypeLists(readme);
	const ranges = typeSectionRanges(readme);
	const declaredHeadings = TYPE_BARRELS.filter((barrel) => barrel.heading)
		.map((barrel) => `\`${barrel.heading}\``)
		.join(", ");

	if (ranges === null) {
		fail(
			RULE,
			"README.md",
			`does not carry every entry point's heading in order — ${declaredHeadings} — so the type lists cannot be told apart. Restore the headings in that order, or teach this rule the new ones.`,
		);
	} else if (lists.length !== TYPE_BARRELS.length) {
		fail(
			RULE,
			"README.md",
			`documents ${lists.length} "Type-only exports" list(s); ${TYPE_BARRELS.length} entry points publish types. A missing list leaves one entry point unguarded, which is the state this rule was written to end.`,
		);
	} else {
		TYPE_BARRELS.forEach((barrel, index) => {
			const range = ranges[index];
			const doc = range && lists.find((list) => list.at >= range.from && list.at < range.to);
			if (!doc) {
				fail(
					RULE,
					"README.md",
					`has no "Type-only exports" list for ${barrel.label} inside its own section of the README.`,
				);
				return;
			}

			const exported = exportedTypeNames(read(barrel.file));
			const missing = [...exported].filter((name) => !doc.names.has(name)).sort();
			const extra = [...doc.names].filter((name) => !exported.has(name)).sort();

			if (missing.length > 0) {
				fail(
					RULE,
					barrel.file,
					`exports ${missing.map((n) => `\`${n}\``).join(", ")}, which README.md's list for ${barrel.label} does not document. Removing or renaming a type breaks no test — sweep README.md, docs/architecture.md, docs/guide.md and any docblock naming it.`,
				);
			}
			if (extra.length > 0) {
				fail(
					RULE,
					"README.md",
					`documents ${extra.map((n) => `\`${n}\``).join(", ")} for ${barrel.label}, which ${barrel.file} does not export. A consumer following the README would fail to import it.`,
				);
			}
		});
	}
}

// ---------------------------------------------------------------------------------------
// Rule 16 — the README's API tables match the barrels' runtime exports, and its error table
// matches the code union
//
// Rule 13's runtime sibling, added 2026-09-23 by the polyfill-probe close-out. The probe found the
// Tradition configs table listing two of four shipped configs, and the error table missing
// `TCT_ATTRIBUTE_NOT_SOURCED`, and nothing could fail on either: `test/public-api.test.ts` pins the
// surface against itself, never against what the README promises. It reuses Rule 13's section
// ranges, so a row is checked against the barrel whose section it sits in.
// ---------------------------------------------------------------------------------------
function rule16() {
	const RULE = "README API tables match the barrels";
	const readme = read("README.md");
	const ranges = typeSectionRanges(readme);
	if (ranges === null) {
		fail(
			RULE,
			"README.md",
			"does not carry every entry point's heading in order, so the API tables cannot be assigned to a barrel. Rule 13 reports the same cause.",
		);
		return;
	}
	const rows = documentedTableRows(readme, "Export");
	TYPE_BARRELS.forEach((barrel, index) => {
		const range = ranges[index];
		if (!range) return;
		const section = readme.slice(range.from, range.to);
		const documented = new Set(
			rows.filter((row) => row.at >= range.from && row.at < range.to).map((row) => row.name),
		);
		const exported = exportedValueNames(read(barrel.file));
		const missing = [...exported]
			.filter((name) => !documented.has(name))
			.filter((name) => {
				const prose = DOCUMENTED_IN_PROSE.get(name);
				return prose === undefined || !section.includes(prose);
			})
			.sort();
		const extra = [...documented].filter((name) => !exported.has(name)).sort();
		if (missing.length > 0) {
			fail(
				RULE,
				barrel.file,
				`exports ${missing.map((n) => `\`${n}\``).join(", ")}, which no API table in README.md's section for ${barrel.label} lists. A consumer reading the README would not know it exists.`,
			);
		}
		if (extra.length > 0) {
			fail(
				RULE,
				"README.md",
				`lists ${extra.map((n) => `\`${n}\``).join(", ")} in an API table for ${barrel.label}, which ${barrel.file} does not export at runtime.`,
			);
		}
	});

	const codes = errorCodeUnion(read("src/errors.ts"));
	const tabled = new Set(documentedTableRows(readme, "`error.code`").map((row) => row.name));
	const untabled = [...codes].filter((code) => !tabled.has(code)).sort();
	const unknown = [...tabled].filter((code) => !codes.has(code)).sort();
	if (codes.size === 0) {
		fail(
			RULE,
			"src/errors.ts",
			"no `TibetanCalendarErrorCode` union was found to compare the README's error table against.",
		);
	}
	if (untabled.length > 0) {
		fail(
			RULE,
			"README.md",
			`the error table has no row for ${untabled.map((c) => `\`${c}\``).join(", ")}, which \`TibetanCalendarErrorCode\` in src/errors.ts declares. Codes are contract; one a consumer cannot look up is one they cannot branch on.`,
		);
	}
	if (unknown.length > 0) {
		fail(
			RULE,
			"README.md",
			`the error table lists ${unknown.map((c) => `\`${c}\``).join(", ")}, which \`TibetanCalendarErrorCode\` in src/errors.ts does not declare.`,
		);
	}
}

// ---------------------------------------------------------------------------------------
// The runner
//
// Findings are collected so they can be reported together, and until 2026-09-12 a throw anywhere
// discarded all of them: one unreadable file crashed the run on a stack trace, and whatever the
// earlier rules had found went with it. Proved, not suspected — a Rule 6 violation injected
// beside a deleted file vanished from the output. So containment is layered, because the layers
// catch different things:
//
//   - each rule runs inside its own try/catch, and a throw becomes an attributed finding;
//   - the shared corpora are guarded where they are built, above, since no rule's guard reaches;
//   - anything else that throws — the self-test reading a barrel, say — reaches the backstop at the
//     bottom, which prints what was collected before rethrowing.
//
// The order of RULES is the order the report groups appear in. Rule 12 runs straight after Rule 7
// for that reason alone: moving it changes the report, and nothing else about the rules.
// ---------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------
// Rule 14 — no two functions in src/ share a body
//
// Measured 2026-09-23 over 172 function declarations in 36 files — before the boundary work
// later the same day, which added `temporal-kind.ts` and removed three describers, leaving 171
// in 37. A bare date is not enough to place a count when the tree moves twice in a day.
// Exactly two pairs, both
// genuine, zero false positives. `assertSafeYear` stood character-identical in `months.ts` and
// `computation/conversion.ts`, and `describe` in `traditions/validate.ts` and
// `observances/index.ts`.
//
// The quieter cost is not the repeated code. The two `assertSafeYear` copies carried DIFFERENT
// docblocks — one explained the `NaN` case, the other the royal-era confusion — so each reader
// got half the reasoning depending on which file they opened.
//
// **What this rule cannot see, stated so it is not mistaken for coverage.** It catches
// copy-paste. It does not catch a *semantic* duplicate written independently: `phaseStart` in
// `navigation.ts` and `isoOf` in `astrology/index.ts` do one job with different bodies and
// different arity, and no predicate here would group them. That class is caught by having one
// named home for boundary code and by asking, when a new subsystem lands, which guards it wrote.
// The enforcement map says so rather than letting this rule read as more than it is.
//
// The 40-character floor is deliberate: a one-line body like `return a % b;` may legitimately
// recur, and reporting it would train people to ignore this rule.
// ---------------------------------------------------------------------------------------
function rule14() {
	const RULE = "no two functions in src/ share a body";
	const byBody = new Map();
	for (const file of sources) {
		for (const fn of functionBodies(read(file))) {
			if (fn.body.length < DUPLICATE_BODY_FLOOR) continue;
			if (!byBody.has(fn.body)) byBody.set(fn.body, []);
			byBody.get(fn.body).push({ file, name: fn.name });
		}
	}
	for (const [, group] of byBody) {
		if (group.length < 2) continue;
		const where = group.map((g) => `${g.file} (${g.name})`).join(", ");
		fail(
			RULE,
			group[0].file,
			`${group.length} functions share a body, character for character, after comments and whitespace are normalised: ${where}. Move it to one module both can import. If the copies have drifted apart in their docblocks, merge those too — half the reasoning in each file is how a duplicate actually hurts.`,
		);
	}
}

// ---------------------------------------------------------------------------------------
// Rule 15 — `instanceof Temporal` lives in exactly one file
//
// Five identity checks had accumulated across three files by 2026-09-23, with nothing watching,
// and each asked the wrong question: `instanceof` is true only for an instance built by whichever
// `Temporal` is the global at call time, so a `PlainDate` from a second implementation failed
// every one of them. Seventeen exports then read a Western date as a Tibetan one and answered;
// ten refused a genuine Western date. Two of the five were also a second copy of a policy that
// already existed in another module.
//
// The rule is checkable because the home is ONE NAMED FILE. A rule banning identity checks
// "outside the guards" would need this checker to know which functions count as guards, which it
// cannot; `src/temporal-kind.ts` it can simply compare a path against.
//
// This is the ratchet, not the fix. Nothing stopped a sixth site appearing, and the freeze at
// 1.0.0 is the last moment at which one can appear silently — after it, which inputs throw is
// `error.code` contract.
// ---------------------------------------------------------------------------------------
function rule15() {
	const RULE = "`instanceof Temporal` lives only in src/temporal-kind.ts";
	for (const file of sources) {
		if (file === TEMPORAL_KIND_HOME) continue;
		for (const { number, code } of codeLines(read(file))) {
			if (!isIdentityCheck(code)) continue;
			fail(
				RULE,
				file,
				`line ${number} asks \`instanceof Temporal\`, which tests IDENTITY — whether the value came from this realm's Temporal — where this package needs KIND. A PlainDate from a second implementation (a bundled polyfill, two copies in node_modules, an iframe) fails it, and is then either refused as "the wrong kind of thing" or read structurally as a Tibetan date and answered wrongly. Use \`temporalKindOf\` from ${TEMPORAL_KIND_HOME}, which reads Symbol.toStringTag. See docs/decisions/2026-09-23-brand-not-identity.md.`,
			);
		}
	}
}

const RULES = [
	{ number: 1, run: rule1 },
	{ number: 2, run: rule2 },
	{ number: 3, run: rule3 },
	{ number: 4, run: rule4 },
	{ number: 5, run: rule5 },
	{ number: 6, run: rule6 },
	{ number: 7, run: rule7 },
	{ number: 12, run: rule12 },
	{ number: 8, run: rule8 },
	{ number: 9, run: rule9 },
	{ number: 10, run: rule10 },
	{ number: 11, run: rule11 },
	{ number: 13, run: rule13 },
	{ number: 16, run: rule16 },
	{ number: 14, run: rule14 },
	{ number: 15, run: rule15 },
];

function report() {
	if (failures.length === 0) return;
	const byRule = new Map();
	for (const failure of failures) {
		if (!byRule.has(failure.rule)) byRule.set(failure.rule, []);
		byRule.get(failure.rule).push(failure);
	}

	console.error(`Convention violations (${failures.length}):\n`);
	for (const [rule, entries] of byRule) {
		console.error(`  ${rule}`);
		for (const entry of entries) {
			console.error(`    ${entry.where}`);
			console.error(`      ${entry.message}`);
		}
		console.error("");
	}
	console.error("Every rule above is documented in docs/coding-standards.md.\n");
}

try {
	if (!selfTest()) process.exit(1);

	for (const { number, run } of RULES) {
		try {
			run();
		} catch (error) {
			fail(
				`rule ${number} could not run`,
				"scripts/check-conventions.mjs",
				`${reasonOf(error)} Everything it guards is unchecked until this is fixed.`,
			);
		}
	}
} catch (error) {
	report();
	throw error;
}

report();
if (failures.length > 0) process.exit(1);

console.log(
	`All conventions hold (${sources.length} source files, ${failures.length} violations).`,
);
