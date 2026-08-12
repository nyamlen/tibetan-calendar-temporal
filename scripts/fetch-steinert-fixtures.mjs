#!/usr/bin/env node
/**
 * Regenerates `test/fixtures/crosscheck-steinert.ts` from the public JSON API of
 * christian-steinert's Tibetan Buddhist Practice Dates.
 *
 * Usage:
 *   node scripts/fetch-steinert-fixtures.mjs [fromYear] [toYear]
 *
 * Defaults to 2024–2027, which covers two leap months (2024 M06L, 2027 M02L) and the
 * 2025-11-19 divergence between the two values of the lunar anomaly's daily increment.
 *
 * ## Why this source, and what it is evidence of
 *
 * The API returns, for every calendar day, the Tibetan month and day number plus flags for
 * doubled days and leap months — the full day-by-day mapping, not just practice days. That
 * matters: a list of practice days carries no information about the `a₂` fork, because the two
 * values only disagree about which number is doubled or skipped, never about where a month
 * boundary falls. See docs/decisions/2026-08-12-lunar-anomaly-a2-default.md.
 *
 * ## Clean-room boundary
 *
 * This script reads the deployed application's **output** over HTTP. Its source is GPL-3.0 and
 * is never opened. Computed dates are facts, not copyrightable expression, which is what makes
 * them usable here — the same reasoning that governs the Janson fixtures. See CONTRIBUTING.md.
 *
 * ## Why the output is committed
 *
 * CI must not depend on a third party's uptime, and a fixture that changes underneath the test
 * suite is not a fixture. Re-run this script deliberately when refreshing the range; a diff in
 * the output is then a finding to investigate, not noise.
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { formatRow } from "./fixture-row.mjs";

const API = "https://practicedates.christian-steinert.de/dates";

const fromYear = Number(process.argv[2] ?? 2024);
const toYear = Number(process.argv[3] ?? 2027);
if (!Number.isInteger(fromYear) || !Number.isInteger(toYear) || fromYear > toYear) {
	console.error("usage: node scripts/fetch-steinert-fixtures.mjs [fromYear] [toYear]");
	process.exit(1);
}

const pad = (n) => String(n).padStart(2, "0");

const url = `${API}/${fromYear}0101-${toYear}1231`;
process.stderr.write(`fetching ${url}\n`);
const response = await fetch(url);
if (!response.ok) throw new Error(`${url} returned ${response.status} ${response.statusText}`);
const days = await response.json();

if (!Array.isArray(days) || days.length === 0) throw new Error("API returned no days");

// A gap here would silently shorten the fixture and weaken the suite without failing it.
const expected = (Date.UTC(toYear, 11, 31) - Date.UTC(fromYear, 0, 1)) / 86_400_000 + 1;
if (days.length !== expected) {
	throw new Error(`expected ${expected} consecutive days, received ${days.length}`);
}

// repeatedTibMonth flags *both* months of a leap pair — it means "this number occurs twice",
// not "this is the leap month". Lotsawa House's "(+)" marker behaves identically. This package
// treats only the first of the pair as the leap month, so the runs have to be walked to find
// which is which. Mapping the flag straight through silently mislabels ~30 days per leap year.
const runs = [];
for (const [index, d] of days.entries()) {
	const previous = days[index - 1];
	const continues =
		previous !== undefined &&
		previous.tibMonth === d.tibMonth &&
		previous.repeatedTibMonth === d.repeatedTibMonth &&
		d.tibDay >= previous.tibDay;
	if (continues) runs[runs.length - 1].push(index);
	else runs.push([index]);
}
const leapDayIndices = new Set();
for (const [i, run] of runs.entries()) {
	const first = days[run[0]];
	if (first.repeatedTibMonth === 0) continue;
	const next = runs[i + 1];
	// The leap month is the first of two adjacent runs sharing a month number.
	if (next !== undefined && days[next[0]].tibMonth === first.tibMonth) {
		for (const index of run) leapDayIndices.add(index);
	}
}

const rows = days.map((d, index) => {
	const iso = `${d.year}-${pad(d.month)}-${pad(d.day)}`;
	// repeatedTibDay is 0 for an ordinary day, 1 for the first of a doubled pair, 2 for the
	// second. The package's own vocabulary is isDoubledDay plus isLeapDay for the first.
	return {
		iso,
		month: d.tibMonth,
		day: d.tibDay,
		isLeapMonth: leapDayIndices.has(index),
		isDoubledDay: d.repeatedTibDay !== 0,
		isLeapDay: d.repeatedTibDay === 1,
	};
});

// Only the true flags are emitted. The overwhelming majority of days carry none of them, and
// spelling out three `false`s per row pushes every line past the 100-column formatter limit,
// which explodes the fixture from 1.5k lines to 12k.
const body = rows.map(formatRow).join("\n");

const doubled = rows.filter((r) => r.isDoubledDay).length;
const leapMonthDays = rows.filter((r) => r.isLeapMonth).length;

const out = `/**
 * Day-by-day Tibetan dates for ${fromYear}-01-01 to ${toYear}-12-31, from christian-steinert's
 * Tibetan Buddhist Practice Dates.
 *
 * An independent implementation of the Phugpa calendar, and one that follows the **almanac**
 * value of the lunar anomaly's daily increment — verified against Janson's three divergence
 * dates, not assumed. See docs/decisions/2026-08-12-lunar-anomaly-a2-default.md.
 *
 * @remarks
 * GENERATED by \`scripts/fetch-steinert-fixtures.mjs\`. Do not edit by hand — re-run the script.
 *
 * Computed dates are facts rather than copyrightable expression, which is what makes them usable
 * under this project's clean-room constraint. The upstream source is GPL-3.0 and is never read.
 *
 * Covers ${rows.length} consecutive days, of which ${doubled} are doubled and ${leapMonthDays}
 * fall in a leap month. Skipped dates are absent by construction: they name no calendar day, so
 * the API has no row to return for them.
 */
export interface CrosscheckRow {
	/** ISO date. */
	iso: string;
	/** Tibetan month number, 1-12. */
	month: number;
	/** Tibetan day number, 1-30. */
	day: number;
	/** Whether this day falls in a leap month. Omitted where false. */
	isLeapMonth?: boolean;
	/** Whether this day's number is shared with an adjacent calendar day. Omitted where false. */
	isDoubledDay?: boolean;
	/** Whether this is the first day of a doubled pair. Omitted where false. */
	isLeapDay?: boolean;
}

export const STEINERT_DATES: readonly CrosscheckRow[] = [
${body}
];
`;

const target = join(
	dirname(fileURLToPath(import.meta.url)),
	"..",
	"test",
	"fixtures",
	"crosscheck-steinert.ts",
);
writeFileSync(target, out);
process.stderr.write(
	`wrote ${rows.length} days to ${target} (${doubled} doubled, ${leapMonthDays} in leap months)\n`,
);
