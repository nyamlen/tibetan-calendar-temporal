#!/usr/bin/env node
/**
 * Builds a day-by-day Bhutanese calendar fixture, and refuses to write one it cannot vouch for.
 *
 * Usage:
 *   node scripts/fetch-bhutan-fixtures.mjs [fromYear] [toYear]
 *
 * ## The source
 *
 * `wp-plugins/bhutanese-calendar` on GitHub ships `data/data.txt`, 73,442 rows of SQL tuples
 * covering 1900-01-31 to 2101-02-27. Its README states the data is "extracted from Open Source
 * Bhutanese Calendar software" — Henning's, which is the authority Janson cites throughout his
 * Bhutan appendix.
 *
 * **Licence.** The plugin is GPLv2; what is taken here is **dates**, which this project's
 * clean-room rule already classes as facts rather than copyrightable expression — the same posture
 * as `fetch-eszthoff-fixtures.mjs`. Nothing is vendored, no dependency is added, and none of its PHP
 * is read. A window is taken rather than the whole file.
 *
 * ## What this script establishes rather than assumes
 *
 * The field order is not documented anywhere, so it is derived and then checked:
 *
 * ```text
 * (id, 'weekday', bhutaneseDay, bhutaneseMonth, leapMonth, 'year-name', gregDay, gregMonth, gregYear)
 * ```
 *
 * Five assertions, any of which aborts the run:
 *
 * 1. **Continuity** — one row per Gregorian day, no gaps, no duplicates, **after sorting**. File
 *    order is *not* date order: a block of early-2002 rows is interleaved out of sequence and
 *    another sits after 2004-02-20. A parser trusting file order produces garbage across two years.
 * 2. **The weekday shift** — the `weekday` column must be exactly one day ahead of the true
 *    Gregorian weekday, on every row. This is Janson's "unique feature of the Bhutanese calendar",
 *    and CLDR agrees: its `bo` and `dz` locales name the same date one planet apart.
 * 3. **Janson's anchor** — see below.
 * 4. **Agreement with Janson's own leap-month table**, over the years the two overlap. Two sources
 *    with entirely separate lineages, checked against each other.
 * 5. **Every leap month is paired** with a regular month of the same number immediately before it.
 *    Added after check 4 passed on data carrying a leap month Janson does *not* list — check 4 asks
 *    whether his leap months appear and cannot see an extra one. The committed 2000–2030 window
 *    still contains that defect, at 2030-04-03; `test/validation/bhutan-month-sequence.test.ts`
 *    pins it and validates up to it. Re-running this script will now refuse to write until the
 *    source is fixed or the window is narrowed.
 *
 * ## The anchor, and the trap it avoids
 *
 * Janson records that Bhutan's **government calendar** gives New Year 2003 as 3 March with day 1 of
 * month 1 repeated, while **his calculations and Henning's software** both give 3 March as a
 * repeated day 30 of the last (leap) month of 2002. He writes: *"I have no explanation for this
 * discrepancy."*
 *
 * This dataset descends from Henning's software, so it carries the **computed** form — and it does:
 * 2 and 3 March 2003 are both day 30 of leap month 12, with 1/1 falling on 4 March. Asserting the
 * government-calendar form would therefore have failed on correct data. The disagreement is recorded
 * in the fixture header rather than resolved, because neither side is ours to overrule.
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const fromYear = Number(process.argv[2] ?? 2000);
const toYear = Number(process.argv[3] ?? 2030);
if (!Number.isInteger(fromYear) || !Number.isInteger(toYear) || fromYear > toYear) {
	console.error("usage: node scripts/fetch-bhutan-fixtures.mjs [fromYear] [toYear]");
	process.exit(1);
}

const SOURCE =
	"https://raw.githubusercontent.com/wp-plugins/bhutanese-calendar/master/data/data.txt";

/** Janson's leap months for Bhutan, from his four-version comparison table. */
const JANSON_BHUTAN_LEAP = new Map([
	[2000, 4],
	[2002, 12],
	[2005, 9],
	[2008, 5],
	[2011, 2],
	[2013, 10],
	[2016, 7],
	[2019, 3],
	[2021, 12],
	[2024, 8],
	[2027, 5],
	[2030, 1],
]);

const problems = [];
const fail = (message) => problems.push(message);

console.log(`fetching ${SOURCE}`);
const response = await fetch(SOURCE, {
	headers: { "User-Agent": "tibetan-calendar-temporal fixture build" },
});
if (!response.ok) {
	console.error(`source returned ${response.status}`);
	process.exit(1);
}
const text = await response.text();

const ROW =
	/\((\d+),\s*'(\w+)',\s*(\d+),\s*(\d+),\s*(\d+),\s*'([^']*)',\s*(\d+),\s*(\d+),\s*(\d+)\)/g;

const all = [];
for (const m of text.matchAll(ROW)) {
	all.push({
		weekday: m[2],
		day: Number(m[3]),
		month: Number(m[4]),
		leapMonth: Number(m[5]),
		yearName: m[6],
		iso: Temporal.PlainDate.from({
			year: Number(m[9]),
			month: Number(m[8]),
			day: Number(m[7]),
		}),
	});
}
if (all.length === 0) {
	console.error("no rows parsed — the source format has changed");
	process.exit(1);
}
console.log(`parsed ${all.length} rows`);

// File order is not date order. Sorting is load-bearing, not tidiness.
all.sort((a, b) => Temporal.PlainDate.compare(a.iso, b.iso));

// 1. Continuity.
for (let i = 1; i < all.length; i += 1) {
	const delta = all[i].iso.since(all[i - 1].iso, { largestUnit: "day" }).days;
	if (delta !== 1) {
		fail(`${all[i - 1].iso} is followed by ${all[i].iso}, a step of ${delta} days`);
		break;
	}
}

// 2. The Bhutanese weekday shift, on every row.
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
let shiftMismatches = 0;
for (const row of all) {
	const actual = WEEKDAYS[row.iso.dayOfWeek - 1];
	const shift = (WEEKDAYS.indexOf(row.weekday) - WEEKDAYS.indexOf(actual) + 7) % 7;
	if (shift !== 1) shiftMismatches += 1;
}
if (shiftMismatches > 0) {
	fail(
		`the weekday column is one day ahead on ${all.length - shiftMismatches} rows but not on ` +
			`${shiftMismatches} — the Bhutanese shift is meant to be uniform`,
	);
}

// 3. Janson's anchor: the computed form, not the government calendar's.
const at = (iso) => all.find((r) => r.iso.equals(Temporal.PlainDate.from(iso)));
const march2 = at("2003-03-02");
const march3 = at("2003-03-03");
const march4 = at("2003-03-04");
if (
	!march2 ||
	!march3 ||
	!march4 ||
	march2.day !== 30 ||
	march3.day !== 30 ||
	march2.month !== 12 ||
	march3.month !== 12 ||
	march2.leapMonth !== 12 ||
	march3.leapMonth !== 12 ||
	march4.day !== 1 ||
	march4.month !== 1
) {
	fail(
		"the 2003 anchor does not hold: Janson and Henning both compute 2 and 3 March 2003 as a " +
			"repeated day 30 of leap month 12, with 1/1 on 4 March. Got " +
			`${march2?.day}/${march2?.month}, ${march3?.day}/${march3?.month}, ${march4?.day}/${march4?.month}`,
	);
}

// 4. Agreement with Janson's leap-month table where the two overlap.
const leapByYear = new Map();
for (const row of all) {
	if (row.leapMonth === 0) continue;
	// A Tibetan year is named by the Gregorian year it begins in; take the earliest row of each run.
	const year = row.iso.month <= 2 ? row.iso.year - 1 : row.iso.year;
	if (!leapByYear.has(year)) leapByYear.set(year, row.leapMonth);
}
for (const [year, expected] of JANSON_BHUTAN_LEAP) {
	const found = leapByYear.get(year);
	if (found !== expected) {
		fail(`Janson gives Bhutan leap month ${expected} in ${year}; the dataset gives ${found}`);
	}
}

// 5. Every leap month is paired with a regular month of the same number, immediately before it.
//
// Added 2026-08-16, after check 4 passed on data carrying a leap month Janson does not list. That
// check asks whether *his* leap months appear; it cannot see an extra one. The 2000-2030 window
// held a leap month 2 running 2030-04-03 to 2030-05-02, straight after the leap month 1 he does
// list — so that year had regular 1, leap 1, leap 2, regular 3, with no regular month 2 at all.
// The upstream leaves its leap flag set one month too long there.
//
// Stated as pairing rather than as "one leap month per year", because the pairing is what the
// Bhutanese convention actually claims: a leap month takes the number of the month *preceding* it.
const months = [];
for (const row of all) {
	const last = months[months.length - 1];
	if (!last || last.month !== row.bhutaneseMonth || last.leapMonth !== row.leapMonth) {
		months.push({ month: row.bhutaneseMonth, leapMonth: row.leapMonth, iso: row.iso });
	}
}
for (const [index, entry] of months.entries()) {
	if (entry.leapMonth === 0) continue;
	const previous = months[index - 1];
	if (previous === undefined) continue;
	if (previous.month !== entry.month || previous.leapMonth !== 0) {
		fail(
			`leap month ${entry.month} beginning ${entry.iso.toString()} is not preceded by a regular ` +
				`month ${entry.month}; the month before it is ${previous.month}` +
				`${previous.leapMonth === 0 ? "" : " (also leap)"}. In the Bhutanese convention a leap ` +
				"month takes the number of the month preceding it, so an unpaired one means the source's " +
				"leap flag is set on the wrong rows",
		);
	}
}

if (problems.length > 0) {
	console.error(`\n${problems.length} problem(s); nothing written:\n`);
	for (const problem of problems) console.error(`  - ${problem}`);
	process.exit(1);
}

console.log("all four checks passed");

// ---------------------------------------------------------------------------------------------
// Emit the requested window, compactly.
//
// Verbose object rows would run to about a megabyte for a window this long — ten times the largest
// existing fixture. Dates are consecutive, so the start date plus one small tuple per day carries
// everything without the repetition.
// ---------------------------------------------------------------------------------------------
const window = all.filter((r) => r.iso.year >= fromYear && r.iso.year <= toYear);
const start = window[0];
const end = window.at(-1);

const doubled = window.filter((r, i) => i > 0 && window[i - 1].day === r.day).length;
const skipped = window.filter((r, i) => i > 0 && r.day === window[i - 1].day + 2).length;
const leapMonths = new Set(window.filter((r) => r.leapMonth !== 0).map((r) => r.iso.year)).size;

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "..", "test", "fixtures");
writeFileSync(
	join(fixtures, "bhutan.ts"),
	`/**
 * Day-by-day Bhutanese calendar dates, ${start.iso} to ${end.iso}.
 *
 * @remarks
 * GENERATED by \`scripts/fetch-bhutan-fixtures.mjs\`. Do not edit by hand — re-run the script.
 *
 * Extracted from \`wp-plugins/bhutanese-calendar\`, whose README states the data comes from "Open
 * Source Bhutanese Calendar software" — Henning's, the authority Janson cites throughout his Bhutan
 * appendix. Dates are facts rather than copyrightable expression, which is what makes them usable
 * here; nothing else from that package is.
 *
 * The window matches the years Janson's own four-version leap-month table covers, so the two
 * sources — which share no lineage — check each other. The generating script asserts that
 * agreement, along with continuity, and the one-day weekday shift on every row.
 *
 * **A disagreement this fixture does not resolve.** Janson records that Bhutan's *government
 * calendar* gives New Year 2003 as 3 March with day 1 of month 1 repeated, while his own
 * calculations and Henning's software give 3 March as a repeated day 30 of the last (leap) month of
 * 2002. He writes: "I have no explanation for this discrepancy." This data follows the computed
 * line — 2 and 3 March 2003 are day 30 of leap month 12, and 1/1 falls on 4 March. Neither side is
 * ours to overrule, so the conflict is recorded rather than smoothed.
 *
 * **The leap-month numbering is Bhutanese**, in which a leap month takes the number of the
 * *preceding* month and so falls after the regular month sharing it. The engine expresses that as
 * \`TraditionConfig.leapMonthPosition: "after"\` and reproduces the month sequence here — see
 * \`test/validation/bhutan.test.ts\`, which is what settles the convention.
 *
 * **One leap month in this window is the source's own, not Janson's.** A leap month 2 begins
 * 2030-04-03, straight after the leap month 1 he lists, giving that year two consecutive leap months
 * and no regular month 2 at all. Validation runs up to it. Check 5 above exists because of it, and
 * the committed window predates that check.
 */

/** First Gregorian day of the window; rows run consecutively from here, one per day. */
export const BHUTAN_START = "${start.iso}";

/** Last Gregorian day of the window. */
export const BHUTAN_END = "${end.iso}";

/**
 * One tuple per consecutive Gregorian day: \`[bhutaneseDay, bhutaneseMonth, leapMonthNumber]\`.
 *
 * \`leapMonthNumber\` is 0 in a regular month, and otherwise the number of the leap month the day
 * falls in. A repeated day shows as two consecutive tuples with the same day number; a skipped day
 * shows as a number that never appears.
 */
export const BHUTAN_DAYS: readonly (readonly [number, number, number])[] = [
${window.map((r) => `\t[${r.day}, ${r.month}, ${r.leapMonth}],`).join("\n")}
];
`,
);

console.log(
	`wrote ${window.length} days (${start.iso} to ${end.iso}) to test/fixtures/bhutan.ts — ` +
		`${leapMonths} years with a leap month, ${doubled} doubled and ${skipped} skipped days`,
);
