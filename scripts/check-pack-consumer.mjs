/**
 * The consumer half of `npm run test:pack`. Copied into a scratch directory and run from there.
 *
 * It lives in its own file, and is executed as a separate process, because that is the only way
 * the bare specifiers below resolve like a consumer's would: Node resolves `tibetan-calendar-
 * temporal` by walking up from the *importing module's* location, so a copy of this code running
 * inside the repository would find the repository, prove nothing, and pass whatever the tarball
 * contained.
 *
 * Failures are collected rather than thrown one at a time, so a broken package reports everything
 * wrong with it in one run.
 */

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const problems = [];
const check = (condition, message) => {
	if (!condition) problems.push(message);
};

const api = await import("tibetan-calendar-temporal");
const observances = await import("tibetan-calendar-temporal/observances");

// A date the README prints and `test/readme.test.ts` asserts against `src/`. Recomputing it here
// proves the *built* arithmetic survived compilation, not just that the module loaded.
const date = api.isoToTibetan(Temporal.PlainDate.from("2026-08-12"));
check(
	api.formatTibetanDate(date) === "2153-M06-30",
	`root export computed ${api.formatTibetanDate(date)}, expected 2153-M06-30`,
);

const duchen = observances
	.getObservances(Temporal.PlainDate.from("2026-01-01"), Temporal.PlainDate.from("2026-12-31"))
	.filter((o) => o.rule.kind === "duchen");
check(
	duchen.length === 4,
	`observances subpath returned ${duchen.length} duchen for 2026, wanted 4`,
);

// The error surface has to survive packing too: a consumer branching on `error.code` gets nothing
// useful if the property was dropped somewhere between source and tarball.
let thrown;
try {
	api.tibetanToIso({ year: 2150, month: 12, day: 29 });
} catch (error) {
	thrown = error;
}
check(thrown instanceof api.SkippedDayError, "SkippedDayError is not thrown by the packed build");
check(
	thrown?.code === "TCT_SKIPPED_DAY",
	`skipped-day error carried code ${thrown?.code}, expected TCT_SKIPPED_DAY`,
);

// The subpath must stay a subpath. If the root ever re-exports it, a date-only consumer starts
// paying for the rule table, which is the reason for the split.
check(!("getObservances" in api), "getObservances leaked onto the root export");

// Where the `exports` map actually sent us. Asserted rather than assumed: a map pointing at `src/`
// or at a path outside `files` resolves fine in a checkout and 404s once published.
const entry = fileURLToPath(import.meta.resolve("tibetan-calendar-temporal"));
const subpath = fileURLToPath(import.meta.resolve("tibetan-calendar-temporal/observances"));
check(entry.endsWith(join("dist", "index.js")), `root export resolved to ${entry}`);
check(
	subpath.endsWith(join("dist", "observances", "index.js")),
	`observances subpath resolved to ${subpath}`,
);

// Declarations ship alongside and the `types` condition points at them. A missing .d.ts is
// invisible to Node — everything above still passes — and breaks every TypeScript consumer.
//
// Note that `import.meta.resolve` is used above rather than `require.resolve(".../package.json")`:
// the manifest is deliberately not in the `exports` map, so asking for it by subpath throws
// ERR_PACKAGE_PATH_NOT_EXPORTED. That is the map behaving correctly.
const root = dirname(dirname(entry));
for (const declaration of ["dist/index.d.ts", "dist/observances/index.d.ts"]) {
	check(existsSync(join(root, declaration)), `${declaration} is missing from the tarball`);
}

if (problems.length > 0) {
	for (const problem of problems) console.error(`  x ${problem}`);
	console.error("\nThe packed tarball does not behave like the source tree.");
	process.exit(1);
}

console.log("  ok  both subpaths import, compute and carry error codes");
