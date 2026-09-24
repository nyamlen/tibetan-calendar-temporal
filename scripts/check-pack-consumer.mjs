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
const astrology = await import("tibetan-calendar-temporal/astrology");

// A date the README prints and `test/readme.test.ts` asserts against `src/`. Recomputing it here
// proves the *built* arithmetic survived compilation, not just that the module loaded.
const date = api.isoToTibetan(Temporal.PlainDate.from("2026-08-12"));
check(
	api.formatTibetanDate(date) === "2153-M06-30",
	`root export computed ${api.formatTibetanDate(date)}, expected 2153-M06-30`,
);

// The month tier and the parser reach a consumer through `dist/` like everything else, and nothing
// else in the suite can see whether they do — every other test imports from `src/`. The round trip
// is the cheapest single assertion that covers both new modules and the widened formatter.
const months = api.monthsFor(2151);
check(
	months.length === 13 && months.some((m) => m.monthCode === "M06L"),
	`monthsFor(2151) returned ${months.length} months, codes ${months.map((m) => m.monthCode).join(" ")}`,
);
check(
	api.hasLeapMonth(2151) && api.leapMonthNumberFor(2151) === 6 && api.monthsInYear(2151) === 13,
	"the closed-form month scalars disagree with monthsFor in the packed build",
);
check(
	api.daysInMonth({ year: 2153, month: 1 }) === 29,
	`daysInMonth for 2153-M01 returned ${api.daysInMonth({ year: 2153, month: 1 })}, expected 29`,
);

const roundTripped = api.formatTibetanDate(api.parseTibetanDate("2153-M06-30"));
check(
	roundTripped === "2153-M06-30",
	`format(parse(s)) returned ${roundTripped}, expected the string back unchanged`,
);

const duchen = observances
	.getObservances(Temporal.PlainDate.from("2026-01-01"), Temporal.PlainDate.from("2026-12-31"))
	.filter((o) => o.rule.kind === "duchen");
check(
	duchen.length === 4,
	`observances subpath returned ${duchen.length} duchen for 2026, wanted 4`,
);

// The third subpath, whose arithmetic nothing else in the packed build exercises: the mansion is the
// only part of this package that needs the *true* solar and lunar longitudes, so a compilation that
// damaged the integer scaling would show here and nowhere else.
const attributes = astrology.attributesFor(Temporal.PlainDate.from("2026-09-01"));
check(
	attributes.year.power === "fire" && attributes.yoga.englishName === "death",
	`astrology subpath gave ${attributes.year.power}/${attributes.yoga.englishName}, wanted fire/death`,
);
check(
	attributes.month !== null && attributes.lunarDay !== null,
	"astrology subpath reported Phugpa's month or lunar-day attributes as unsourced",
);
check(
	astrology.attributesFor(Temporal.PlainDate.from("2026-09-01"), api.BHUTAN).month === null,
	"astrology subpath did not report BHUTAN's month attributes as unsourced",
);
check(astrology.ELEMENTAL_YOGAS.length === 10, "the yoga table did not survive packing");
const mansion = astrology.lunarMansionFor(Temporal.PlainDate.from("2026-09-01"));
check(
	mansion.index === 26 && mansion.element === "water",
	`lunarMansionFor gave ${JSON.stringify(mansion)}, wanted index 26, water`,
);

// The root's month names, whose tables and Tiger-month reader are new to the root build.
const monthNames = api.monthNamesFor({ year: 2153, month: 1 });
check(
	monthNames.fourSeasons.tigerEarlySpring?.part === "late" &&
		monthNames.sixSeasons.month3EarlySpring.sanskritName.iast === "śiśira",
	"monthNamesFor did not survive packing",
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
check(!("attributesFor" in api), "attributesFor leaked onto the root export");

// Where the `exports` map actually sent us. Asserted rather than assumed: a map pointing at `src/`
// or at a path outside `files` resolves fine in a checkout and 404s once published.
const entry = fileURLToPath(import.meta.resolve("tibetan-calendar-temporal"));
const subpath = fileURLToPath(import.meta.resolve("tibetan-calendar-temporal/observances"));
const astrologyPath = fileURLToPath(import.meta.resolve("tibetan-calendar-temporal/astrology"));
check(entry.endsWith(join("dist", "index.js")), `root export resolved to ${entry}`);
check(
	subpath.endsWith(join("dist", "observances", "index.js")),
	`observances subpath resolved to ${subpath}`,
);
check(
	astrologyPath.endsWith(join("dist", "astrology", "index.js")),
	`astrology subpath resolved to ${astrologyPath}`,
);

// Declarations ship alongside and the `types` condition points at them. A missing .d.ts is
// invisible to Node — everything above still passes — and breaks every TypeScript consumer.
//
// Note that `import.meta.resolve` is used above rather than `require.resolve(".../package.json")`:
// the manifest is deliberately not in the `exports` map, so asking for it by subpath throws
// ERR_PACKAGE_PATH_NOT_EXPORTED. That is the map behaving correctly.
const root = dirname(dirname(entry));
for (const declaration of [
	"dist/index.d.ts",
	"dist/observances/index.d.ts",
	"dist/astrology/index.d.ts",
]) {
	check(existsSync(join(root, declaration)), `${declaration} is missing from the tarball`);
}

if (problems.length > 0) {
	for (const problem of problems) console.error(`  x ${problem}`);
	console.error("\nThe packed tarball does not behave like the source tree.");
	process.exit(1);
}

console.log("  ok  all three subpaths import, compute and carry error codes");
