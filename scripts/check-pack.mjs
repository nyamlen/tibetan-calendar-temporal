#!/usr/bin/env node

/**
 * Packs the tarball, installs it into a scratch directory outside this repository, and imports it
 * the way a consumer would.
 *
 * Usage:
 *   npm run test:pack
 *
 * ## Why this exists
 *
 * Every other test in this repository imports from `src/`. Nothing exercises the *published*
 * shape: not the `exports` map, not `files`, not the emitted `dist/` layout, not the subpath.
 * Those fail in a way the suite structurally cannot see — the code is correct and the package is
 * broken — and the first report comes from a consumer after publishing, which is the one moment a
 * fix is expensive.
 *
 * `publint` and `attw` check the manifest statically and catch most of this. Neither proves the
 * built JavaScript *runs*, which is what `check-pack-consumer.mjs` is for. They are complements,
 * and CI runs all three.
 *
 * The scratch directory goes under the OS temp directory, never inside the repository: installing
 * the tarball writes a `node_modules` holding a copy of this package, and a copy inside the working
 * tree would be picked up by Biome, the link checker and Vitest.
 */

import { execFileSync } from "node:child_process";
import {
	copyFileSync,
	existsSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scripts = dirname(fileURLToPath(import.meta.url));
const repo = resolve(scripts, "..");
const scratch = mkdtempSync(join(tmpdir(), "tct-pack-"));

const exec = (command, args, cwd, shell = false) =>
	execFileSync(command, args, { cwd, encoding: "utf8", shell, stdio: ["ignore", "pipe", "pipe"] });

const runNode = (args, cwd) => exec(process.execPath, args, cwd);

/**
 * Runs npm, preferring its JavaScript entry point over the shim.
 *
 * @remarks
 * `npm_execpath` is set by npm itself whenever a script is run through it, and points at
 * `npm-cli.js` — so this executes as plain Node, with no shell. That matters on Windows, where
 * `npm` is a `.cmd` shim that `execFileSync` refuses to spawn without one, and where `shell: true`
 * additionally raises DEP0190 and would split `process.execPath` on the space in "Program Files".
 * The fallback covers being invoked directly rather than via `npm run`.
 */
const runNpm = (args, cwd) => {
	const cli = process.env.npm_execpath;
	if (cli?.endsWith(".js")) return runNode([cli, ...args], cwd);
	const npm = process.platform === "win32" ? "npm.cmd" : "npm";
	return exec(npm, args, cwd, process.platform === "win32");
};

try {
	// No build here, deliberately: `dist/` is deleted and `npm pack` is left to rebuild it through
	// the `prepack` script, so this run is also the proof that a bare `npm pack` or `npm publish`
	// cannot ship a stale or missing build. It built for itself until 2026-09-24, which covered CI
	// and left the local publish — the case with no other guard — packaging whatever sat in `dist/`.
	rmSync(join(repo, "dist"), { recursive: true, force: true });

	console.log("Packing (prepack builds)...");
	runNpm(["pack", "--pack-destination", scratch], repo);

	const tarball = readdirSync(scratch).find((f) => f.endsWith(".tgz"));
	if (!tarball) throw new Error("npm pack produced no tarball");

	// A bare consumer project: ESM, private, and nothing installed but this package. Zero runtime
	// dependencies means the install needs no registry traffic beyond the tarball itself; if that
	// ever stops being true, this is one of the places that will notice.
	writeFileSync(
		join(scratch, "package.json"),
		`${JSON.stringify({ name: "tct-pack-consumer", private: true, type: "module" }, null, 2)}\n`,
	);
	copyFileSync(join(scripts, "check-pack-consumer.mjs"), join(scratch, "consumer.mjs"));

	console.log(`Installing ${tarball}...`);
	runNpm(["install", "--no-package-lock", "--ignore-scripts", `./${tarball}`], scratch);

	// First, before anything downstream can fail on a missing module instead: with `dist/` deleted
	// above, only the `prepack` script can have put a build in the tarball.
	if (!existsSync(join(scratch, "node_modules", "tibetan-calendar-temporal", "dist", "index.js"))) {
		throw new Error(
			'the tarball holds no dist/index.js — package.json#scripts.prepack must run "npm run build"',
		);
	}

	// The consumer documents `package.json#files` ships. They are what makes the README's
	// condensation safe: the long-form material moved to `docs/guide.md` rather than out of the
	// package, so an npm consumer loses nothing to the split. Nothing else in this repository sees
	// the packed file list, so a `files` edit that dropped them would surface only for a consumer.
	//
	// `docs/how-it-is-calculated.md` joined them on 2026-08-24. Its reason was replaced on
	// 2026-08-25 when the Sanskrit came off `Rabjung.name`: it now ships to answer the question the
	// *smaller* type raises — a `Rabjung` carries a Tibetan year name and no Sanskrit one, and a
	// consumer expecting *Prabhava* beside it needs to be told the cycle has two Sanskrit lists
	// which disagree at five positions. That is calendar, not API, so it belongs in the document
	// that explains the calendar.
	//
	// Their relative links must resolve inside the tarball, because npmjs.com rewrites relative
	// links in a README against `repository` but a file read from `node_modules` gets no such
	// rewriting. Anything repo-only is linked by absolute URL.
	//
	// README.md IS ON THIS LIST, and was not until 2026-08-26. The reasoning above applies to it
	// exactly — it is the file most likely to be read from `node_modules` — but it was exempt from
	// the rule its own siblings were held to, and had accumulated ten dead targets: architecture.md,
	// testing.md, roadmap.md, CONTRIBUTING.md and six more, every one of them fine on npmjs.com and
	// broken in an editor. Found by a consumer spike on 2026-08-25, not by this script.
	const shippedDocs = [
		"README.md",
		"docs/guide.md",
		"docs/why-trust-these-dates.md",
		"docs/how-it-is-calculated.md",
	];
	const installed = join(scratch, "node_modules", "tibetan-calendar-temporal");
	// The opposite mistake, found by the polyfill probe on 2026-09-23: a shipped document linking a
	// file that ships by absolute GitHub URL. why-trust-these-dates.md filed how-it-is-calculated.md
	// among the documents "not included in the published package" for a month after it began
	// shipping, and the README reached both by URL. Such a link works, so nothing broke — it sends
	// a reader offline or on a pinned version to `main` instead of the copy beside it, and states
	// something false about the package. A `files` entry is matched exactly for a file and as a
	// prefix for a directory such as `dist`.
	const { files, repository } = JSON.parse(readFileSync(join(repo, "package.json"), "utf8"));
	const repoUrl = String(repository?.url ?? repository ?? "")
		.replace(/^git\+/, "")
		.replace(/\.git$/, "");
	if (!repoUrl.startsWith("https://github.com/")) {
		throw new Error(
			`package.json#repository is not a GitHub URL (${repoUrl}); the link check cannot run`,
		);
	}
	const blob = `${repoUrl}/blob/main/`;
	const ships = (path) =>
		files.some((entry) => path === entry || path.startsWith(`${entry.replace(/\/$/, "")}/`));
	for (const doc of shippedDocs) {
		const text = readFileSync(join(installed, doc), "utf8");
		for (const [, path] of text.matchAll(/\]\((https?:\/\/[^)#\s]+)/g)) {
			if (path.startsWith(blob) && ships(path.slice(blob.length))) {
				throw new Error(
					`${doc} links to ${path} by absolute URL, but ${path.slice(blob.length)} ships in the tarball — link it relatively`,
				);
			}
		}
		for (const [, target] of text.matchAll(/\]\((?!https?:)([^)#]+)/g)) {
			const resolved = resolve(dirname(join(installed, doc)), target);
			if (!existsSync(resolved)) {
				throw new Error(`${doc} links to ${target}, which is not in the tarball`);
			}
		}
	}
	console.log(`Shipped docs present, with resolving relative links: ${shippedDocs.join(", ")}`);

	console.log("Importing as a consumer would:");
	// Run from the scratch directory so bare specifiers resolve through the installed package's
	// `exports` map rather than through this repository.
	process.stdout.write(runNode(["consumer.mjs"], scratch));

	console.log("\nThe packed tarball imports and computes correctly through all three subpaths.");
} catch (error) {
	if (error.stdout) process.stdout.write(error.stdout);
	if (error.stderr) process.stderr.write(error.stderr);
	console.error(`\ntest:pack failed: ${error.message}`);
	process.exitCode = 1;
} finally {
	rmSync(scratch, { recursive: true, force: true });
}
