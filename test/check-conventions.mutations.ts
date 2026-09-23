/**
 * Proves that `scripts/check-conventions.mjs` still reports what it exists to report.
 *
 * Run with `npm run test:conventions`. Deliberately **not** part of `npm test`: its subject is one
 * script, not the engine, so it would add time to every local run for a result that changes only
 * when the checker does. CI runs it on every push, which is what keeps its mutation targets honest.
 *
 * ## Why this exists
 *
 * The suite never runs the checker, and the checker's own `selfTest` proves its predicates but not
 * that a rule *fires*. A rule that silently stops firing prints "All conventions hold", which is
 * indistinguishable from success. So each row below breaks one convention in a throwaway copy of
 * the working tree and asserts on the exit code **and** a message fragment — the exit code alone
 * cannot tell a guard firing from the checker crashing, which is how a mutation run has passed for
 * the wrong reason in this repository before.
 *
 * - **C0** is the control: the unmutated copy must pass. If it fails, every other row is measuring
 *   nothing.
 * - **R1–R14** each prove one rule still fires. The last test holds the set against the checker's
 *   own `RULES` registry, so a new rule without a mutant fails here.
 * - **X1–X7** prove the containment added on 2026-09-12: a throw must not cost the findings already
 *   collected, a path in the index but not on disk is reported rather than read, and the registry
 *   refuses a missing or mismatched rule.
 * - **X8** proves the six-season fixture passes Rule 7 because it is allowlisted, not because some
 *   script happens to mention its name.
 *
 * ## Why a copy of the working tree, and not a worktree or the checkout itself
 *
 * Mutating the checkout means a crash mid-row leaves it damaged. `git worktree add` avoids that but
 * checks out HEAD, silently skipping the uncommitted checker edits this suite most needs to see. So
 * the files git would list — tracked and untracked-but-not-ignored, exactly the checker's own view —
 * are copied into a scratch directory under the OS temp directory and indexed there, once; each row
 * then gets its own copy of that.
 *
 * ## When a row fails because its target moved
 *
 * Several rows edit specific text — R13 removes `TibetanDateFields` from the README, R12 edits the
 * rabjung generator's template. When an ordinary commit moves that text, the row reports
 * "mutation target not found" rather than a checker failure. Point the row at the text's new home;
 * the checker is not broken.
 */

import { execFileSync, spawn } from "node:child_process";
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import { cp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CHECKER = "scripts/check-conventions.mjs";
const ROW_TIMEOUT = 60_000;

class Tree {
	readonly root: string;

	constructor(root: string) {
		this.root = root;
	}

	private at(file: string): string {
		return join(this.root, file);
	}

	read(file: string): string {
		return readFileSync(this.at(file), "utf8");
	}

	/** Refuses an edit that changes nothing — the signature of a target that has moved. */
	edit(file: string, change: (source: string) => string, target: string): void {
		const before = this.read(file);
		const after = change(before);
		if (after === before) {
			throw new Error(`mutation target not found in ${file}: ${target}`);
		}
		writeFileSync(this.at(file), after);
	}

	append(file: string, text: string): void {
		this.edit(file, (source) => `${source}${text}`, "append");
	}

	create(file: string, content: string): void {
		if (existsSync(this.at(file))) throw new Error(`mutation would overwrite ${file}`);
		writeFileSync(this.at(file), content);
	}

	/** Deletes from disk only — the file stays in the copy's index. */
	remove(file: string): void {
		if (!existsSync(this.at(file))) throw new Error(`mutation target not found: ${file}`);
		unlinkSync(this.at(file));
	}

	list(directory: string): string[] {
		return readdirSync(this.at(directory));
	}
}

interface Row {
	readonly id: string;
	readonly what: string;
	readonly apply: (tree: Tree) => void;
	readonly must: readonly string[];
	readonly mustNot?: readonly string[];
}

// Built by concatenation so the source carries no template placeholder of its own.
const placeholder = (name: string): string => `$${"{"}${name}}`;

const R: Record<number, Row> = {
	1: {
		id: "R1",
		what: "a runtime dependency",
		apply: (tree) =>
			tree.edit(
				"package.json",
				(source) => source.replace(/^\{\n/, '{\n  "dependencies": { "left-pad": "1.0.0" },\n'),
				"the opening brace of package.json",
			),
		must: ["dependencies must be absent; found left-pad"],
	},
	2: {
		id: "R2",
		what: "a bare new Error in src/",
		apply: (tree) =>
			tree.append(
				"src/cycles.ts",
				'\nexport const zzMutantR2 = () => {\n\tthrow new Error("x");\n};\n',
			),
		must: ["coded errors, never a bare construction", "src/cycles.ts:"],
	},
	3: {
		id: "R3",
		what: "a division with no exact: marker",
		apply: (tree) =>
			tree.append(
				"src/format.ts",
				"\nexport const zzMutantR3 = (a: number, b: number) => a / b;\n",
			),
		must: ["integer-only arithmetic", "src/format.ts:"],
	},
	4: {
		id: "R4",
		what: "a {@link} to nothing",
		apply: (tree) =>
			tree.append(
				"src/freeze.ts",
				"\n/** See {@link NoSuchSymbol}. */\nexport const zzMutantR4 = 1;\n",
			),
		must: ["NoSuchSymbol"],
	},
	5: {
		id: "R5",
		what: "a decision record with a bad status",
		apply: (tree) =>
			tree.edit(
				"docs/decisions/2026-08-11-build-tooling.md",
				(source) => source.replace("status: accepted", "status: bogus"),
				"status: accepted",
			),
		must: ["decision-record format", "2026-08-11-build-tooling.md"],
	},
	6: {
		id: "R6",
		what: "a dead path in the enforcement map",
		apply: (tree) => tree.append("docs/coding-standards.md", "\n`docs/zz-no-such-file.md`\n"),
		must: ["enforcement map stays live", "docs/zz-no-such-file.md"],
	},
	7: {
		id: "R7",
		what: "a fixture no generator names",
		apply: (tree) => tree.create("test/fixtures/zz-orphan.ts", "export const ZZ_ROWS = [];\n"),
		must: ["fixture provenance", "test/fixtures/zz-orphan.ts"],
	},
	8: {
		id: "R8",
		what: "a TCT_ code that does not exist",
		apply: (tree) =>
			tree.append(
				"src/parse.ts",
				"\n/** @throws TCT_NOT_A_CODE never. */\nexport const zzMutantR8 = 1;\n",
			),
		must: ["error codes are real", "TCT_NOT_A_CODE"],
	},
	9: {
		id: "R9",
		what: "a validation suite named off its fixture",
		// Added rather than renamed: a rename leaves the old path in the index, which is X2's state.
		apply: (tree) =>
			tree.create(
				"test/validation/zz-misnamed.test.ts",
				'import { BHUTAN_DATES } from "../fixtures/bhutan.js";\n',
			),
		must: ["validation suites are named for their fixtures", "test/validation/zz-misnamed.test.ts"],
	},
	10: {
		id: "R10",
		what: "an exported config no validation suite imports",
		apply: (tree) => {
			let touched = 0;
			for (const name of tree.list("test/validation")) {
				if (!name.endsWith(".test.ts")) continue;
				const file = `test/validation/${name}`;
				const source = tree.read(file);
				const next = source.replace(/import\s+(?:type\s+)?\{[^}]*\}\s+from/g, (clause) =>
					clause.replace(/\s*\bBHUTAN_HENNING\b\s*,?/g, ""),
				);
				if (next !== source) {
					tree.edit(file, () => next, "BHUTAN_HENNING import");
					touched++;
				}
			}
			if (touched === 0) {
				throw new Error("mutation target not found: no validation suite imports BHUTAN_HENNING");
			}
		},
		must: ["exported configs are validated", "`BHUTAN_HENNING`, which no suite"],
	},
	11: {
		id: "R11",
		what: "a module suite named for a concept",
		apply: (tree) =>
			tree.create("test/computation/zz-concept.test.ts", "// a concept, not a module\n"),
		must: ["module suites are named for their module", "test/computation/zz-concept.test.ts"],
	},
	12: {
		id: "R12",
		what: "a hardcoded count beside an interpolation",
		apply: (tree) =>
			tree.edit(
				"scripts/verify-rabjung-names.mjs",
				(source) =>
					source.replace(
						"`# The 60 rabjung year names\n",
						`\`# The 60 rabjung year names\n\nFour values are marked, at positions ${placeholder("zzList")}.\n`,
					),
				"the rabjung document's title line",
			),
		must: [
			"generated documents state computed counts",
			"scripts/verify-rabjung-names.mjs",
			"Four values are marked",
		],
	},
	13: {
		id: "R13",
		what: "a type missing from the README's list",
		apply: (tree) =>
			tree.edit(
				"README.md",
				(source) => source.replace("`TibetanDateFields`, ", ""),
				"`TibetanDateFields` in the root type list",
			),
		must: ["README type lists match the barrels", "`TibetanDateFields`"],
	},
	14: {
		id: "R14",
		what: "a second function sharing another's body",
		// Appended rather than edited in place, so this row does not depend on any existing
		// function's text and cannot report "mutation target not found" when one is reworded. The
		// body copied is `assertSafeYear`'s, which is one of the two real duplicates this rule was
		// built from on 2026-09-23 — and the smaller one, so it also exercises the length floor.
		apply: (tree) =>
			tree.edit(
				"src/months.ts",
				(source) =>
					`${source}\nfunction assertSafeYearCopy(subject: string, year: number): void {\n\tif (!Number.isSafeInteger(year)) {\n\t\tthrow rangeError(\n\t\t\t"TCT_FIELD_OUT_OF_RANGE",\n\t\t\t\`\${subject}: year must be a safe integer, received \${year}\`,\n\t\t);\n\t}\n}\n`,
				"the end of src/months.ts",
			),
		must: ["no two functions in src/ share a body", "assertSafeYearCopy"],
	},
	15: {
		id: "R15",
		what: "a sixth `instanceof Temporal` outside its one home",
		// Appended rather than edited in place: every existing identity check was removed on
		// 2026-09-23, so there is no live text to point at, and a row anchored to one would report
		// "mutation target not found" the moment the home file is reworded. The mutant is a whole
		// function, so the comment-skipping branch is exercised too — a version of this rule that
		// only matched comments would pass its own row while catching nothing.
		apply: (tree) =>
			tree.edit(
				"src/navigation.ts",
				(source) =>
					`${source}\nfunction reintroducedIdentityCheck(value: unknown): boolean {\n\treturn value instanceof Temporal.PlainDate;\n}\n`,
				"the end of src/navigation.ts",
			),
		must: ["`instanceof Temporal` lives only in src/temporal-kind.ts", "src/navigation.ts"],
	},
};

const rule = (number: number): Row => {
	const row = R[number];
	if (!row) throw new Error(`no mutant for rule ${number}`);
	return row;
};

const X: readonly Row[] = [
	{
		id: "X10",
		what: "an identity check written in the destructured form the first pattern missed",
		// R15 covers `v instanceof Temporal.PlainDate`. This covers the form a rule written from
		// the shape the codebase happened to contain did NOT catch: `const { PlainDate } =
		// Temporal` is idiomatic JavaScript, so it is the likeliest ACCIDENTAL identity check, and
		// the original pattern passed it. Without this row, narrowing the predicate back would
		// leave R15 green.
		apply: (tree) =>
			tree.edit(
				"src/navigation.ts",
				(source) =>
					`${source}\nconst { PlainDate } = Temporal;\nfunction destructuredIdentityCheck(value: unknown): boolean {\n\treturn value instanceof PlainDate;\n}\n`,
				"the end of src/navigation.ts",
			),
		must: ["`instanceof Temporal` lives only in src/temporal-kind.ts", "src/navigation.ts"],
	},
	{
		id: "X9",
		what: "rule 15's home stops holding the predicate it exempts",
		// The self-test read the WHOLE file until a review caught it, and `src/temporal-kind.ts`
		// says `instanceof Temporal` three times in its own docblock explaining why it is the only
		// file allowed to — so deleting the single real check left the self-test green, and the
		// whole vitest suite green too, since a native PlainDate simply takes the String() path and
		// answers identically. It now reads code lines only. This row is what keeps that true.
		apply: (tree) =>
			tree.edit(
				"src/temporal-kind.ts",
				(source) =>
					source.replace(
						"\tif (value instanceof Temporal.PlainDate) return assertIsoCalendar(value);\n",
						"",
					),
				"the one identity check in src/temporal-kind.ts",
			),
		must: ["The checker itself is broken", "rule 15's exempt file"],
	},
	{
		id: "X1",
		what: "a throw in a later rule keeps an earlier rule's finding",
		// Two mutations, deliberately. A throw alone on a clean tree yields an empty report plus a
		// crash notice, which cannot be told apart from the bug this row exists to disprove.
		apply: (tree) => {
			rule(6).apply(tree);
			tree.remove("README.md");
		},
		must: ["docs/zz-no-such-file.md", "rule 13 could not run"],
		mustNot: ["at read ("],
	},
	{
		id: "X2",
		what: "a path in the index but not on disk is reported, not read",
		apply: (tree) => tree.remove("docs/decisions/2026-08-11-temporal-custom-calendars.md"),
		must: ["tracked but missing", "2026-08-11-temporal-custom-calendars.md"],
		mustNot: ["ENOENT"],
	},
	{
		id: "X3",
		what: "a rule dropped from the registry",
		apply: (tree) =>
			tree.edit(
				CHECKER,
				(source) => source.replace("\t{ number: 8, run: rule8 },\n", ""),
				"rule 8's registry entry",
			),
		must: ["The checker itself is broken", "RULES registry"],
	},
	{
		id: "X4",
		what: "an unbuildable corpus blocks only the rules that read it",
		// R13 is there to prove a rule AFTER the throwing ones still runs, not merely that rule 2
		// did not throw.
		apply: (tree) => {
			tree.remove("package.json");
			rule(13).apply(tree);
		},
		must: [
			"`manifest` could not be built",
			"rule 1 could not run",
			"rule 6 could not run",
			...rule(13).must,
		],
		mustNot: ["at read (", "rule 2 could not run"],
	},
	{
		id: "X5",
		what: "a barrel the self-test reads, missing from disk, costs no rule",
		apply: (tree) => {
			rule(6).apply(tree);
			tree.remove("src/observances/index.ts");
		},
		must: [
			"tracked but missing",
			"self-test could read its inputs",
			"docs/zz-no-such-file.md",
			"rule 13 could not run",
		],
		mustNot: ["at read ("],
	},
	{
		id: "X6",
		what: "a generator whose document template stops matching",
		apply: (tree) =>
			tree.edit(
				"scripts/verify-rabjung-names.mjs",
				(source) =>
					source.replace(
						'writeFileSync(\n\tjoin(root, "docs", "names", "rabjung.md"),',
						'writeFileSync(\n\t(join(root, "docs", "names", "rabjung.md")),',
					),
				"the rabjung generator's writeFileSync call",
			),
		must: [
			"The checker itself is broken",
			"documentTemplates invariant",
			"verify-rabjung-names.mjs writes a document",
		],
	},
	{
		id: "X7",
		what: "a registry number paired with another rule's function",
		apply: (tree) =>
			tree.edit(
				CHECKER,
				(source) => source.replace("{ number: 8, run: rule8 },", "{ number: 8, run: rule9 },"),
				"rule 8's registry entry",
			),
		must: ["The checker itself is broken", "must name its own rule's function"],
	},
	{
		id: "X8",
		what: "the six-season fixture, taken out of Rule 7's allowance",
		// The allowance is what exempts it, not a coincidence: `source.includes(name)` would pass the
		// file silently if any script ever mentioned its name in passing.
		apply: (tree) =>
			tree.edit(
				CHECKER,
				(source) => source.replace(', "henning-six-seasons.ts"', ""),
				"henning-six-seasons.ts in HAND_CURATED",
			),
		must: ["fixture provenance", "test/fixtures/henning-six-seasons.ts"],
	},
];

const ROWS: readonly Row[] = [...Object.values(R), ...X];

function check(directory: string): Promise<{ code: number | null; output: string }> {
	return new Promise((done, failed) => {
		const child = spawn(process.execPath, [CHECKER], { cwd: directory });
		let output = "";
		child.stdout.on("data", (chunk) => {
			output += chunk;
		});
		child.stderr.on("data", (chunk) => {
			output += chunk;
		});
		child.on("error", failed);
		child.on("close", (code) => done({ code, output }));
	});
}

let scratch = "";
let pristine = "";

beforeAll(() => {
	scratch = mkdtempSync(join(tmpdir(), "tct-check-conventions-"));
	pristine = join(scratch, "pristine");

	const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
		cwd: repo,
		encoding: "utf8",
	})
		.split("\n")
		.filter(Boolean)
		// A path in the index but not on disk here is the developer's own state, which the control row
		// reports faithfully; it cannot be copied, and the copy's index will simply not hold it.
		.filter((file) => existsSync(join(repo, file)));

	for (const file of files) {
		mkdirSync(dirname(join(pristine, file)), { recursive: true });
		copyFileSync(join(repo, file), join(pristine, file));
	}

	const git = (...args: string[]) =>
		execFileSync("git", ["-c", "core.autocrlf=false", "-c", "core.safecrlf=false", ...args], {
			cwd: pristine,
			stdio: "ignore",
		});
	git("init", "-q");
	git("add", "-A");
}, ROW_TIMEOUT);

// Each row deletes its own copy as it finishes. Deleting all of them in one afterAll took longer than
// Vitest's hook timeout on Windows, where every removed file is scanned.
afterAll(() => {
	if (scratch) rmSync(scratch, { recursive: true, force: true, maxRetries: 3 });
}, ROW_TIMEOUT);

async function checkCopy(
	id: string,
	mutate: (tree: Tree) => void,
): Promise<{ code: number | null; output: string }> {
	const root = join(scratch, id);
	await cp(pristine, root, { recursive: true });
	try {
		mutate(new Tree(root));
		return await check(root);
	} finally {
		await rm(root, { recursive: true, force: true, maxRetries: 3 });
	}
}

describe.concurrent("scripts/check-conventions.mjs, mutated", () => {
	test(
		"C0 — the unmutated copy passes (the control)",
		async () => {
			const { code, output } = await checkCopy("C0", () => {});
			expect({ code, holds: output.includes("All conventions hold") }, output).toEqual({
				code: 0,
				holds: true,
			});
		},
		ROW_TIMEOUT,
	);

	for (const row of ROWS) {
		test(
			`${row.id} — ${row.what}`,
			async () => {
				const { code, output } = await checkCopy(row.id, row.apply);

				const problems = [
					...(code === 1 ? [] : [`exit ${code}, expected 1`]),
					...row.must.filter((text) => !output.includes(text)).map((text) => `missing: ${text}`),
					...(row.mustNot ?? [])
						.filter((text) => output.includes(text))
						.map((text) => `present: ${text}`),
				];
				expect(problems, output).toEqual([]);
			},
			ROW_TIMEOUT,
		);
	}
});

test("every rule in the checker's registry has a mutant", () => {
	const registered = [
		// Anchored to a whole registry line: the self-test's own message quotes an entry as an example.
		...readFileSync(join(repo, CHECKER), "utf8").matchAll(
			/^\t\{ number: (\d+), run: rule\d+ \},$/gm,
		),
	]
		.map(([, number]) => Number(number))
		.sort((a, b) => a - b);
	const covered = Object.keys(R)
		.map(Number)
		.sort((a, b) => a - b);

	expect(registered.length).toBeGreaterThan(0);
	expect(covered).toEqual(registered);
});
