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
import { copyFileSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
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
	console.log("Building...");
	runNpm(["run", "build"], repo);

	console.log("Packing...");
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

	console.log("Importing as a consumer would:");
	// Run from the scratch directory so bare specifiers resolve through the installed package's
	// `exports` map rather than through this repository.
	process.stdout.write(runNode(["consumer.mjs"], scratch));

	console.log("\nThe packed tarball imports and computes correctly through both subpaths.");
} catch (error) {
	if (error.stdout) process.stdout.write(error.stdout);
	if (error.stderr) process.stderr.write(error.stderr);
	console.error(`\ntest:pack failed: ${error.message}`);
	process.exitCode = 1;
} finally {
	rmSync(scratch, { recursive: true, force: true });
}
