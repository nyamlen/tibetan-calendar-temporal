#!/usr/bin/env node
/**
 * Regenerates the Janson fixtures in `test/fixtures/` from the paper's LaTeX source.
 *
 * Usage:
 *   node scripts/extract-janson-fixtures.mjs <path-to-tibet.tex>
 *
 * Obtain the source with:
 *   curl -o 1401.6285.gz https://arxiv.org/e-print/1401.6285
 *   gzip -dc 1401.6285.gz > tibet.tex
 *
 * Keep `tibet.tex` OUTSIDE this repository. arXiv's default submission licence grants arXiv
 * distribution rights, not third-party redistribution, so vendoring a copy here would raise
 * exactly the licence question this project exists to avoid. See CLAUDE.md.
 *
 * What this script extracts is two tables of *dates and traditional names* — facts, not
 * copyrightable expression — which is what makes them usable as fixtures under the clean-room
 * constraint. The script itself contains no content from the paper, only the parsing logic.
 *
 * Extraction is mechanical on purpose. Transcribing 120 dates by hand is exactly the kind of
 * task that introduces a silent one-day error into the primary correctness gate.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const source = process.argv[2];
if (!source) {
	console.error("usage: node scripts/extract-janson-fixtures.mjs <path-to-tibet.tex>");
	process.exit(1);
}

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "..", "test", "fixtures");
const text = readFileSync(source, "utf8");
const lines = text.split("\n");

/** Finds a table body by the LaTeX label that follows it, returning the rows between. */
function rowsBefore(label, count) {
	const end = lines.findIndex((l) => l.includes(`\\label{${label}}`));
	if (end === -1) throw new Error(`label ${label} not found — is this the right source file?`);
	// Walk back to the last `count` rows that look like table data.
	const body = [];
	for (let i = end; i >= 0 && body.length < count; i--) {
		if (/&/.test(lines[i]) && /\\\\/.test(lines[i])) body.unshift(lines[i]);
	}
	if (body.length !== count)
		throw new Error(`expected ${count} rows before ${label}, got ${body.length}`);
	return body;
}

const BACKSLASH = String.fromCharCode(92);
const stripRowEnd = (s) => s.replace(new RegExp(`${BACKSLASH}${BACKSLASH}+\\s*$`), "").trim();

// ---------------------------------------------------------------------------------------------
// Losar table: two side-by-side pairs of (date, year) with a shared element-animal name.
// ---------------------------------------------------------------------------------------------
const losar = [];
for (const raw of rowsBefore("Tlosar", 30)) {
	const cells = stripRowEnd(raw)
		.split("&")
		.map((c) => c.trim());
	if (cells.length !== 6) throw new Error(`unexpected Losar row: ${raw}`);
	const [a, b, nameLeft, c, d, nameRight] = cells;
	for (const [cell, name] of [
		[a, nameLeft],
		[b, nameLeft],
		[c, nameRight],
		[d, nameRight],
	]) {
		const m = cell.match(/^(\d+)\/(\d+)\s+(\d{4})$/);
		if (!m) throw new Error(`unparsable date cell: ${cell}`);
		losar.push({
			year: Number(m[3]),
			iso: `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`,
			name: stripRowEnd(name).replace(/--/g, "-").toLowerCase(),
		});
	}
}
losar.sort((x, y) => x.year - y.year);
if (losar.length !== 120) throw new Error(`expected 120 Losar rows, got ${losar.length}`);

// ---------------------------------------------------------------------------------------------
// 60-year cycle table: Indian index, Chinese index, element-animal, names, two Gregorian years.
// ---------------------------------------------------------------------------------------------
const cycle = [];
for (const raw of rowsBefore("T60", 60)) {
	const m = stripRowEnd(raw).match(
		/^\s*(\d+)\s*&\s*(\d+)\s*&\s*(\w+)--(\w+)\s*&.*&\s*(\d{4})\s*&\s*(\d{4})\s*$/,
	);
	if (!m) throw new Error(`unparsable cycle row: ${raw}`);
	cycle.push({
		indian: Number(m[1]),
		chinese: Number(m[2]),
		element: m[3].toLowerCase(),
		animal: m[4].toLowerCase(),
		years: [Number(m[5]), Number(m[6])],
	});
}
if (cycle.length !== 60) throw new Error(`expected 60 cycle rows, got ${cycle.length}`);

// ---------------------------------------------------------------------------------------------
// Epoch-era and a2-divergence values, scattered through the prose rather than tabulated.
//
// These are the only external checks the engine has outside 1927-2046. Whitespace is collapsed
// first: every value below spans a line break somewhere in the source, and line-based matching
// silently misses them.
// ---------------------------------------------------------------------------------------------
const flat = text.replace(/\s+/g, " ");

/** Pulls one match out of the flattened source, failing loudly rather than returning undefined. */
function extract(pattern, what) {
	const m = flat.match(pattern);
	if (!m) throw new Error(`could not find ${what} — is this the right source file?`);
	return m;
}

// "the epoch, i.e., the mean new moon, is at JD 2015531, Monday 23 March 806 (Julian)"
const epochMatch = extract(
	/is at JD (\d+), (\w+) (\d+) (\w+) (\d+) \(Julian\)/,
	"the epoch Julian day",
);

// "We have here given m_0 in the traditional form modulo 7; to get the result in JD ... add 2015529."
const epochOffset = extract(/in JD as in this paper, add (\d+)/, "the m0-to-JD offset");

// The three epoch constants for Phugpa, as six-decimal values in the four-version comparison
// table. Each decimal row is a continuation row: an empty first cell, then one value per version,
// Phugpa first. Taking them in document order gives m0, s0, a0.
const decimalRows = [
	...flat.matchAll(/& (\d+\.\d{6}) & (\d+\.\d{6}) & (\d+\.\d{6}) & (\d+\.\d{6}) \\\\/g),
].map((m) => Number(m[1]));
if (decimalRows.length !== 3)
	throw new Error(`expected 3 epoch-constant rows, got ${decimalRows.length}`);

// "Some recent examples are 10 February 2001 (JD 2451951) and 10 May 2006 (JD 2453866); the next
// example is 19 November 2025 (JD 2460999)." -- calendar days where the two a2 values disagree.
const MONTHS = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];
const divergenceDates = [
	...extract(
		/Some recent examples are (.+?) \(It would be interesting/,
		"the a2 divergence examples",
	)[1].matchAll(/(\d+) (\w+) (\d{4}) \(JD (\d+)\)/g),
].map((m) => {
	const month = MONTHS.indexOf(m[2]) + 1;
	if (month === 0) throw new Error(`unknown month name: ${m[2]}`);
	return {
		iso: `${m[3]}-${String(month).padStart(2, "0")}-${m[1].padStart(2, "0")}`,
		julianDay: Number(m[4]),
	};
});
if (divergenceDates.length !== 3)
	throw new Error(`expected 3 a2 divergence dates, got ${divergenceDates.length}`);

// "a computer search finding 9 examples in 1900--1999 and 8 examples in 2000--2099", and the
// footnote "there are 16 examples in the first 65 year cycle 1027--1091".
const modernCounts = extract(
	/finding (\d+) examples in (\d{4})--(\d{4}) and (\d+) examples in (\d{4})--(\d{4})/,
	"the a2 divergence counts",
);
const cycleCount = extract(
	/there are (\d+) examples in the first 65 year cycle (\d{4})--(\d{4})/,
	"the first-cycle a2 divergence count",
);

const divergenceCounts = [
	{ from: Number(modernCounts[2]), to: Number(modernCounts[3]), count: Number(modernCounts[1]) },
	{ from: Number(modernCounts[5]), to: Number(modernCounts[6]), count: Number(modernCounts[4]) },
	{ from: Number(cycleCount[2]), to: Number(cycleCount[3]), count: Number(cycleCount[1]) },
];

const header = (what) => `/**
 * ${what}
 *
 * @remarks
 * GENERATED by \`scripts/extract-janson-fixtures.mjs\` from the LaTeX source of arXiv:1401.6285.
 * Do not edit by hand — re-run the script instead.
 *
 * A table of dates and traditional names: facts rather than copyrightable expression, which is
 * what makes it usable directly under this project's clean-room constraint.
 */`;

writeFileSync(
	join(fixtures, "losar.ts"),
	`${header(
		"Gregorian dates of Losar for the 16th and 17th rabjung cycles, 1927-2046, with each year's\n * element-animal name.\n *\n * This is the primary correctness gate for the engine: Losar exercises the month count, the\n * leap-month rule, the day-labelling rule and the true-date astronomy at once.",
	)}
export interface LosarRow {
	/** Janson's *Y* — the Gregorian year the Tibetan year begins in. */
	year: number;
	/** ISO date of the first day of the Tibetan year. */
	losar: string;
	/** The year's element-animal name, lowercased, e.g. "fire-horse". */
	name: string;
}

export const LOSAR_DATES: readonly LosarRow[] = [
${losar.map((r) => `\t{ year: ${r.year}, losar: "${r.iso}", name: "${r.name}" },`).join("\n")}
];
`,
);

writeFileSync(
	join(fixtures, "sixty-year-cycle.ts"),
	`${header(
		"The Indian and Chinese 60-year cycles side by side, for the cycles running 1927-1986 and\n * 1987-2046.\n *\n * The two index columns differ by three, which is the point of the fixture: a year's position in\n * the Indian cycle does not index its Chinese element-animal name.",
	)}
export interface SixtyYearCycleRow {
	/** Position in the Indian (rabjung / Prabhava) cycle, 1-60. */
	indian: number;
	/** Position in the Chinese cycle, 1-60. Not exposed by the package; here to prove the offset. */
	chinese: number;
	element: string;
	animal: string;
	/** Gregorian years in the 16th and 17th rabjung cycles carrying this name. */
	years: [number, number];
}

export const SIXTY_YEAR_CYCLE: readonly SixtyYearCycleRow[] = [
${cycle
	.map(
		(r) =>
			`\t{ indian: ${String(r.indian).padStart(2)}, chinese: ${String(r.chinese).padStart(2)}, element: "${r.element}", animal: "${r.animal}", years: [${r.years[0]}, ${r.years[1]}] },`,
	)
	.join("\n")}
];
`,
);

writeFileSync(
	join(fixtures, "janson-epoch.ts"),
	`${header(
		"Worked values from Janson outside the 1927-2046 Losar table: the epoch itself, and the days\n * where the two candidate values of a2 disagree.\n *\n * These are the engine's only external checks before 1927. The Losar table covers 1927-2046 at one\n * day per year, and the day-by-day cross-check fixtures cover 2022-2027; everything earlier rested\n * on internal self-consistency, which can catch an inconsistency but never a shared misreading of\n * the paper. The 1027-1091 divergence count is the first external evidence in that range.",
	)}
/**
 * Janson's epoch values for Phugpa, from the four-version comparison table.
 *
 * @remarks
 * These are all stated at the **nominal** epoch — the beginning of month 3 (\`nag pa\`) of 806,
 * which is Janson's \\(K\\bar{a}lacakra\\) reference point. That is **true month count 1**, not 0,
 * in this package: Phugpa's intercalation index at the epoch is 61, and 61 >= 48 puts the month
 * with count 0 at month *2* of 806. So \`m0\` here sits one lunation after the config's
 * \`meanDate.atEpoch\`, and comparing the two directly is off by exactly one month.
 */
export interface JansonEpoch {
	/** Julian day of the mean new moon there. The same in all four versions Janson compares. */
	julianDay: number;
	/** The Julian-calendar date of that Julian day, as Janson gives it. Not proleptic Gregorian. */
	julianCalendarDate: string;
	/** Add to Janson's \`m0 mod 7\` to recover the Julian-day form used in this package. */
	julianDayOffset: number;
	/** Mean date there, to six decimals, once \`julianDayOffset\` is added back. */
	meanDate: number;
	/** Mean solar longitude there, in circles, to six decimals. Compare modulo 1. */
	meanSun: number;
	/** Lunar anomaly there, in circles, to six decimals. Compare modulo 1. */
	lunarAnomaly: number;
}

export const JANSON_EPOCH: JansonEpoch = {
	julianDay: ${epochMatch[1]},
	julianCalendarDate: "${epochMatch[3]} ${epochMatch[4]} ${epochMatch[5]}",
	julianDayOffset: ${epochOffset[1]},
	meanDate: ${decimalRows[0]},
	meanSun: ${decimalRows[1]},
	lunarAnomaly: ${decimalRows[2]},
};

/**
 * Calendar days where a2 = 1/28 and Henning's a2 give different Tibetan dates.
 *
 * @remarks
 * Janson lists these as the recent instances of a divergence he expects about once in 4,100 days.
 * The package ships both values as \`PHUGPA\` and \`PHUGPA_HENNING\`, so each is a falsifiable claim
 * about the pair rather than about either one alone.
 */
export const A2_DIVERGENCE_DATES: readonly { iso: string; julianDay: number }[] = [
${divergenceDates.map((d) => `\t{ iso: "${d.iso}", julianDay: ${d.julianDay} },`).join("\n")}
];

/**
 * How many such divergences Janson's computer search found in each window.
 *
 * @remarks
 * The 1027-1091 window is the whole point: it is the first 65-year cycle, nine centuries before
 * any other external check this engine has, and Janson notes the occurrences are irregular -- 16
 * there against 9 and 8 in the modern centuries.
 *
 * Count **events, not days**. A divergence is a skipped or doubled day shifting by one, which
 * shows up as one or two *consecutive* differing calendar days; Janson counts each as a single
 * example. Counting raw days instead gives 15, 12 and 24 against his 9, 8 and 16.
 */
export const A2_DIVERGENCE_COUNTS: readonly { from: number; to: number; count: number }[] = [
${divergenceCounts.map((c) => `\t{ from: ${c.from}, to: ${c.to}, count: ${c.count} },`).join("\n")}
];
`,
);

console.log(
	`wrote ${losar.length} Losar rows, ${cycle.length} cycle rows, ` +
		`the epoch at JD ${epochMatch[1]}, ${divergenceDates.length} a2 divergence dates and ` +
		`${divergenceCounts.length} divergence counts to test/fixtures/`,
);
