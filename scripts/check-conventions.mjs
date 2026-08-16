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
		.filter(Boolean);
}

const read = (file) => readFileSync(resolve(root, file), "utf8");

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

// ---------------------------------------------------------------------------------------
// Rule 1 — zero runtime dependencies
//
// The package's headline claim, in the README and in CLAUDE.md, and until now asserted by
// nothing. publint and attw check the manifest's shape, not its dependency count.
// ---------------------------------------------------------------------------------------

const manifest = JSON.parse(read("package.json"));
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

// ---------------------------------------------------------------------------------------
// Rule 2 — coded errors only
//
// The code is the part consumers branch on. A bare construction silently omits it, and
// tibetanDateExists allowlists codes rather than types, so an uncoded throw escapes the
// predicate entirely.
// ---------------------------------------------------------------------------------------

const BARE_ERROR = /\bnew\s+(Error|RangeError|TypeError|SyntaxError)\s*\(/;
const sources = tracked("src/*.ts", "src/**/*.ts");

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

// ---------------------------------------------------------------------------------------
// Rule 3 — integer-only arithmetic
//
// A float here is not a crash. It is a date that is right on one platform and wrong on
// another, which is the failure the whole integer strategy exists to prevent. Division is
// where one enters, so every division outside the arithmetic helpers must say, at the site,
// why it stays exact. The marker is deliberately a sentence rather than a suppression: the
// seven existing sites are all safe, and none of them said so before this rule landed.
// ---------------------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------------------
// Rule 4 — {@link} targets resolve
//
// Docblocks reach the shipped .d.ts and are what editor hover renders, so a dangling link is
// a broken contract statement rather than a tidying issue. Only the root symbol is checked;
// a member path is trusted past its first segment, which still catches every rename of the
// thing being linked.
// ---------------------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------------------
// Rule 5 — decision-record format
//
// The format is fixed so a reader can find the outcome without reading the reasoning, and so
// markdownlint does not read a `title:` key plus an H1 as two titles.
// ---------------------------------------------------------------------------------------

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
		fail("decision-record format", file, "missing YAML front matter carrying `date` and `status`.");
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

// ---------------------------------------------------------------------------------------
// Rule 6 — the enforcement map stays live
//
// docs/coding-standards.md maps every rule to the command that fails when it is broken. That
// is only worth having if the commands and paths it names still exist, so the map checks
// itself. Without this it would drift exactly the way the prose version it replaced would.
// ---------------------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------------------
// Rule 7 — fixture provenance
//
// Fixtures are generated and the generator is committed beside them; that pairing is the
// provenance record. Hand-transcription is how a silent one-day error reaches the primary
// correctness gate, which has happened. fpmt-holy-days.ts is the one deliberate exception,
// because FPMT publishes those dates in prose with no feed to parse.
// ---------------------------------------------------------------------------------------

const HAND_CURATED = new Set(["fpmt-holy-days.ts"]);
const generators = tracked("scripts/*.mjs").map((file) => ({ file, source: read(file) }));

for (const fixture of tracked("test/fixtures/*.ts")) {
	const name = basename(fixture, ".ts");
	if (HAND_CURATED.has(`${name}.ts`)) continue;
	if (!generators.some(({ source }) => source.includes(name))) {
		fail(
			"fixture provenance",
			fixture,
			`no script in scripts/ names this fixture. Fixtures are generated, not transcribed — add the generator and commit it alongside the output. The sole exception is ${[...HAND_CURATED].join(", ")}, and that justification is narrower than it looks.`,
		);
	}
}

// ---------------------------------------------------------------------------------------

if (failures.length > 0) {
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
	process.exit(1);
}

console.log(
	`All conventions hold (${sources.length} source files, ${failures.length} violations).`,
);
