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
/**
 * Every data row of the `tabular` whose caption carries `label`, header excluded.
 *
 * `rowsBefore` walks backwards collecting lines that carry both `&` and a row terminator, which
 * **cannot see a table's final row when that row omits the terminator** — and T12months does
 * exactly that, its month 12 sitting bare before `\end{tabular}`. Walking back 12 rows there
 * collected months 1-11 plus the header, which has the right shape and the right count and is
 * silently the wrong data.
 *
 * So this reads the block instead of the line endings: everything between `\begin{tabular}` and the
 * label, split on the terminator, keeping rows whose first cell is a number. The header is dropped
 * by that test rather than by counting, which is what makes it robust to the same trap in another
 * table.
 */
function tableRows(label) {
	const end = lines.findIndex((l) => l.includes(`\\label{${label}}`));
	if (end === -1) throw new Error(`label ${label} not found — is this the right source file?`);
	let start = end;
	while (start >= 0 && !lines[start].includes("\\begin{tabular}")) start--;
	if (start < 0) throw new Error(`no \\begin{tabular} before ${label}`);
	// Line by line, not split on the row terminator. Each data row occupies its own line in these
	// tables, and terminator-splitting is doubly wrong here: the last row omits its terminator, and
	// `new RegExp("\\\\")` matches a SINGLE backslash, so the text fragments on every LaTeX macro —
	// `\PH`, `\hline` — rather than on row ends.
	return lines
		.slice(start + 1, end)
		.map((row) => row.replace(/\\hline/g, "").trim())
		.filter((row) => row.includes("&") && /^\s*\d/.test(row));
}

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

// ---------------------------------------------------------------------------------------------
// Cross-version leap months: one row per Gregorian year, one column per tradition, the cell
// holding the leap month number or nothing.
//
// Janson prints 2000-2020 and leaves 2021-2030 commented out in the source. The commented rows are
// extracted too and flagged, per CLAUDE.md: his LaTeX comments carry material absent from the
// rendered paper, and a decade of extra rows is worth having as long as their standing is visible.
//
// The Bhutan column uses *Bhutanese* numbering, in which a leap month takes the number of the
// preceding month. This package numbers from the following month, so its numbers are expected to
// differ — see the fixture's docblock.
// ---------------------------------------------------------------------------------------------
const crossVersionLeap = [];
{
	const end = lines.findIndex((l) => l.includes("\\label{T4Leap}"));
	if (end === -1) throw new Error("label T4Leap not found — is this the right source file?");
	for (let i = end; i >= 0 && !lines[i].includes("\\begin{table}"); i--) {
		const raw = lines[i];
		const commented = /^\s*%/.test(raw);
		const body = stripRowEnd(raw.replace(/^\s*%\s*/, ""));
		const cells = body.split("&").map((c) => c.trim());
		if (cells.length !== 5) continue;
		// Must be an explicit four-digit year. `Number("")` is 0 and `Number.isInteger(0)` is true,
		// so a looser check swallows the header row `& \PH & \TS & Mongolia & Bhutan` as year zero.
		if (!/^\d{4}$/.test(cells[0])) continue;
		const year = Number(cells[0]);
		const cell = (value) => (value === "" ? undefined : Number(value));
		crossVersionLeap.unshift({
			year,
			commented,
			phugpa: cell(cells[1]),
			tsurphu: cell(cells[2]),
			mongolian: cell(cells[3]),
			bhutanese: cell(cells[4]),
		});
	}
	if (crossVersionLeap.length < 21) {
		throw new Error(`expected at least 21 T4Leap rows, got ${crossVersionLeap.length}`);
	}
	const printed = crossVersionLeap.filter((r) => !r.commented).length;
	if (printed !== 21)
		throw new Error(`expected 21 printed T4Leap rows (2000-2020), got ${printed}`);
	// Tsurphu and the Mongolian version have the same leap months, which Janson states in prose.
	// Checking it here means a mis-parsed column cannot pass unnoticed.
	for (const row of crossVersionLeap) {
		if (row.tsurphu !== row.mongolian) {
			throw new Error(
				`T4Leap ${row.year}: Tsurphu ${row.tsurphu} and Mongolian ${row.mongolian} differ, but ` +
					"Janson states the two versions have the same leap months — the parse is wrong",
			);
		}
	}
}

// ---------------------------------------------------------------------------------------------
// Appendix E attribute tables.
//
// These validate the astrological attribute layer, and they are the only external check it has:
// Janson computes these tables from the formulas, but he computed them independently of *our*
// implementation of those formulas, so agreement catches a transcription error or a misread
// formula. It does not catch a shared misreading of the paper, and docs/testing.md says so.
//
// T60e is the one that matters most. It prints all five of a year's elements against the sixty-year
// cycle, so a single table pins power, life, body, fortune and spirit at every cycle position.
// ---------------------------------------------------------------------------------------------

/** Strips a LaTeX row to its `&`-separated cells. */
const cells = (raw) =>
	stripRowEnd(raw)
		.split("&")
		.map((cell) =>
			cell
				.replace(/\\[a-zA-Z]+/g, "")
				.replace(/[{}]/g, "")
				.trim(),
		);

// T60e — the 60-year cycle of every year element.
const yearElements = [];
for (const raw of rowsBefore("T60e", 60)) {
	const c = cells(raw);
	if (c.length !== 7) throw new Error(`unparsable T60e row: ${raw}`);
	const name = c[2].match(/^(\w+)--(\w+)$/);
	if (!name) throw new Error(`unparsable T60e name: ${c[2]}`);
	yearElements.push({
		chinese: Number(c[0]),
		indian: Number(c[1]),
		power: name[1].toLowerCase(),
		animal: name[2].toLowerCase(),
		life: c[3].toLowerCase(),
		body: c[4].toLowerCase(),
		fortune: c[5].toLowerCase(),
		spirit: c[6].toLowerCase(),
	});
}

// T12months — which animal each month carries, and its gender. The sharpest fork in the layer:
// Phugpa month 1 is Dragon, Tsurphu month 1 is Tiger.
//
// Read with `tableRows` rather than `rowsBefore`: month 12's row carries no terminator, so the
// backwards walk silently returned months 1-11 plus the header.
const monthAnimals = [];
for (const raw of tableRows("T12months")) {
	const c = cells(raw);
	if (c.length !== 4) throw new Error(`unparsable T12months row: ${raw}`);
	monthAnimals.push({
		month: Number(c[0]),
		phugpa: c[1].toLowerCase(),
		tsurphu: c[2].toLowerCase(),
		gender: c[3].toLowerCase(),
	});
}

// Tmonths — the lunar-mansion month names and two seasonal columns. The Sanskrit column is not
// emitted: it is TeX-accented and nothing here decodes accents, so it would arrive mangled.
// "seasonal II" is the Tiger-anchored system under Phugpa only; Tsurphu's Tiger sits elsewhere.
const monthNames = [];
for (const raw of tableRows("Tmonths")) {
	const c = cells(raw);
	if (c.length !== 6) throw new Error(`unparsable Tmonths row: ${raw}`);
	monthNames.push({
		month: Number(c[0]),
		tibetan: c[1],
		seasonalI: c[3].toLowerCase(),
		animal: c[4].toLowerCase(),
		seasonalII: c[5].toLowerCase(),
	});
}

// Janson's seasonal systems as prose: "Month 1 = \tibx{mchu} = late-winter". Two of the four have
// no column in Tmonths — the original Kālacakra identification and the six seasons — so these are
// their only statements in the paper. `\nag` is resolved through its own \newcommand rather than
// spelled here, so a renamed macro fails instead of silently matching nothing.
const macro = (name) => {
	const m = text.match(new RegExp(`\\\\newcommand\\\\${name}\\{\\\\tibx\\{([^}]+)\\}\\}`));
	if (!m) throw new Error(`\\newcommand\\${name} not found`);
	return m[1];
};
const NAG = macro("nag");
const monthItem = (marker) => {
	const start = lines.findIndex((l) => l.includes(marker));
	if (start === -1) throw new Error(`seasonal item "${marker}" not found`);
	const statements = [];
	// Bounded by the next item, so an item that lost a statement cannot borrow one from its neighbour.
	for (let i = start; i < lines.length && statements.length < 2; i++) {
		if (i > start && /^\s*\\item\b|\\end\{enumerate\}/.test(lines[i])) break;
		const m = lines[i].match(
			/^(?:thus )?Month (\d+) = (?:\\tibx\{([^}]+)\}|\\nag\{\}) = ([a-z]+-[a-z]+)/,
		);
		if (m) statements.push({ month: Number(m[1]), tibetan: m[2] ?? NAG, season: m[3] });
	}
	if (statements.map((s) => s.month).join() !== "1,3") {
		throw new Error(`seasonal item "${marker}" parsed as months ${statements.map((s) => s.month)}`);
	}
	return statements;
};
const seasonalProse = {
	month1LateWinter: monthItem("\\label{month-season-KT}"),
	month1EarlySpring: monthItem("\\label{month-season-PH}"),
	sixSeasons: monthItem("A different system with 6 seasons"),
};

// Tlife — life and spirit element by animal, on a 12-year cycle.
const lifeElements = [];
for (const raw of rowsBefore("Tlife", 12)) {
	const c = cells(raw);
	if (c.length !== 5) throw new Error(`unparsable Tlife row: ${raw}`);
	lifeElements.push({
		chinese: Number(c[0]),
		indian: Number(c[1]),
		animal: c[2].toLowerCase(),
		life: c[3].toLowerCase(),
		spirit: c[4].toLowerCase(),
	});
}

if (yearElements.length !== 60)
	throw new Error(`expected 60 T60e rows, got ${yearElements.length}`);
const months = monthAnimals.map((row) => row.month).join(",");
if (months !== "1,2,3,4,5,6,7,8,9,10,11,12") {
	throw new Error(
		`T12months parsed as months ${months}, not 1-12. A count check alone passes when the header ` +
			"is collected and the last row dropped, which is how this table first parsed.",
	);
}
if (lifeElements.length !== 12) throw new Error(`expected 12 Tlife rows`);

if (monthNames.map((row) => row.month).join() !== "1,2,3,4,5,6,7,8,9,10,11,12") {
	throw new Error(`Tmonths parsed as months ${monthNames.map((row) => row.month)}, not 1-12`);
}
// Tmonths and T12months are parsed independently and both carry Phugpa's month animal, so a
// shifted column in either shows up as a disagreement here.
for (const row of monthNames) {
	const phugpa = monthAnimals.find((entry) => entry.month === row.month)?.phugpa;
	if (row.animal !== phugpa) {
		throw new Error(
			`Tmonths gives month ${row.month} the animal ${row.animal}, T12months gives ${phugpa}. ` +
				"One of the two parses has shifted a column.",
		);
	}
}
// The Phugpa prose restates two cells of the table's seasonal I column, so it checks both the prose
// parse and which column is seasonal I.
for (const statement of seasonalProse.month1EarlySpring) {
	const row = monthNames.find((entry) => entry.month === statement.month);
	if (row.seasonalI !== statement.season || row.tibetan !== statement.tibetan) {
		throw new Error(
			`Janson's Phugpa prose says month ${statement.month} = ${statement.tibetan} = ${statement.season}, ` +
				`Tmonths says ${row.tibetan} = ${row.seasonalI}. The prose or the column parse is wrong.`,
		);
	}
}

// The invariant that catches a silently-shifted column: T60e's life and spirit elements must agree
// with Tlife at every one of the sixty positions, and the two tables are parsed independently.
for (const row of yearElements) {
	const byAnimal = lifeElements.find((entry) => entry.animal === row.animal);
	if (!byAnimal) throw new Error(`T60e animal ${row.animal} is absent from Tlife`);
	if (byAnimal.life !== row.life || byAnimal.spirit !== row.spirit) {
		throw new Error(
			`T60e and Tlife disagree for ${row.animal}: T60e says life=${row.life} spirit=${row.spirit}, ` +
				`Tlife says life=${byAnimal.life} spirit=${byAnimal.spirit}. One of the two parses has ` +
				"shifted a column.",
		);
	}
}

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

writeFileSync(
	join(fixtures, "cross-version-leap.ts"),
	`${header(
		"Leap months for four versions of the Tibetan calendar, one row per Gregorian year.\n *\n * This is the only *external* check the engine has for any tradition but Phugpa, and it is\n * available because leap months depend on nothing astronomical: the intercalation index is built\n * from the epoch year, the epoch month and the tradition's leap-index threshold alone. So a\n * Tsurphu or Mongolian config can be validated here without any of its mean-motion constants.\n *\n * Two columns need their conventions stated.\n *\n * **Tsurphu and Mongolian are identical throughout**, which Janson states in prose and the\n * extractor asserts while parsing — a mis-read column cannot reach this file.\n *\n * **The Bhutanese column uses Bhutanese numbering**, in which a leap month takes the number of the\n * *preceding* month. This package numbers a leap month from the month that follows it, so its\n * output is expected to differ from this column, and the difference is the convention rather than\n * an error.",
	)}
export interface CrossVersionLeapRow {
	/** Janson's *Y* — the Gregorian year the Tibetan year begins in. */
	year: number;
	/**
	 * Whether the row is commented out in Janson's source rather than printed in the paper.
	 *
	 * He prints 2000-2020 and leaves 2021-2030 commented. The commented rows are his own computed
	 * values and are kept, flagged, because CLAUDE.md's rule is to read the LaTeX rather than the
	 * rendered output — but a claim resting on them should say which tier it is using.
	 */
	commented: boolean;
	/** Leap month number, or \`undefined\` for a year with no leap month. */
	phugpa: number | undefined;
	tsurphu: number | undefined;
	mongolian: number | undefined;
	/** In Bhutanese numbering — see the note above. */
	bhutanese: number | undefined;
}

export const CROSS_VERSION_LEAP: readonly CrossVersionLeapRow[] = [
${crossVersionLeap
	.map(
		(r) =>
			`\t{ year: ${r.year}, commented: ${r.commented}, phugpa: ${r.phugpa}, tsurphu: ${r.tsurphu}, mongolian: ${r.mongolian}, bhutanese: ${r.bhutanese} },`,
	)
	.join("\n")}
];
`,
);

writeFileSync(
	join(fixtures, "janson-attributes.ts"),
	`${header(
		"Janson's Appendix E attribute tables: the five elements a year carries, the animal and gender\n * of each month, and the life and spirit elements by animal.\n *\n * These check the astrological layer against tables Janson computed independently of our\n * implementation of his formulas. That catches a transcription error or a misread formula; it\n * cannot catch a shared misreading of the paper, so it is not external corroboration. See\n * docs/testing.md.",
	)}
export interface JansonYearElementsRow {
	/** Position in the Chinese 60-year cycle, 1-60. */
	chinese: number;
	/** Position in the Indian (Prabhava) 60-year cycle, 1-60. */
	indian: number;
	/** The power element — the one that appears in the year's name. */
	power: string;
	/** The year's animal. */
	animal: string;
	/** Life element *srog*, fixed by the animal. */
	life: string;
	/** Body element *lus*, on a 30-year cycle. */
	body: string;
	/** Fortune element *klung rta*, on a 4-year cycle; earth never appears. */
	fortune: string;
	/** Spirit element *bla*, the element preceding the life element. */
	spirit: string;
}

export interface JansonMonthAnimalRow {
	/** Month number, 1-12. */
	month: number;
	/** The animal Phugpa gives this month — month 1 is Dragon. */
	phugpa: string;
	/** The animal Tsurphu gives it — month 1 is Tiger, matching the Chinese calendar. */
	tsurphu: string;
	/** Male for odd months, female for even. */
	gender: string;
}

export interface JansonLifeElementRow {
	/** Position mod 12 from the start of a Chinese cycle. */
	chinese: number;
	/** Position mod 12 from the start of a Prabhava cycle. */
	indian: number;
	/** The animal that fixes both elements below. */
	animal: string;
	/** Life element *srog*. */
	life: string;
	/** Spirit element *bla*. */
	spirit: string;
}

/** All five year elements at every position of the sixty-year cycle. */
export const JANSON_YEAR_ELEMENTS: readonly JansonYearElementsRow[] = ${JSON.stringify(yearElements, null, "\t")};

/** The animal and gender of each month, in both traditions Janson tabulates. */
export const JANSON_MONTH_ANIMALS: readonly JansonMonthAnimalRow[] = ${JSON.stringify(monthAnimals, null, "\t")};

/** Life and spirit elements by animal, the 12-year cycle underlying two columns of T60e. */
export const JANSON_LIFE_ELEMENTS: readonly JansonLifeElementRow[] = ${JSON.stringify(lifeElements, null, "\t")};
`,
);

writeFileSync(
	join(fixtures, "janson-month-names.ts"),
	`${header(
		"Janson's month-names table and his prose statements of the seasonal systems it does not\n * tabulate.\n *\n * Like the attribute tables, these were computed by Janson rather than read from an almanac, so\n * agreement catches a transcription or rule error and is not external corroboration.",
	)}
export interface JansonMonthNameRow {
	/** Month number, 1-12. */
	month: number;
	/** The lunar-mansion month name, in Janson's Wylie. */
	tibetan: string;
	/** Phugpa's Kālacakra identification: month 1 is early-spring. Janson's own words, e.g. "mid-spring". */
	seasonalI: string;
	/** Phugpa's month animal; the generator checks it against T12months. */
	animal: string;
	/** Tiger = early-spring, **under Phugpa only**, whose Tiger month is 11. */
	seasonalII: string;
}

export interface JansonSeasonalStatement {
	month: number;
	/** The month's lunar-mansion name, in Janson's Wylie. */
	tibetan: string;
	/** Janson's own words, e.g. "late-winter" — not this package's keys. */
	season: string;
}

/** The twelve rows of Janson's month-names table, Sanskrit omitted. */
export const JANSON_MONTH_NAMES: readonly JansonMonthNameRow[] = ${JSON.stringify(monthNames, null, "\t")};

/**
 * Months 1 and 3 of three seasonal systems, as Janson states them in prose. The first and the third
 * have no column in the table; the second restates two of its cells, which the generator checks.
 */
export const JANSON_SEASONAL_STATEMENTS: {
	readonly month1LateWinter: readonly JansonSeasonalStatement[];
	readonly month1EarlySpring: readonly JansonSeasonalStatement[];
	readonly sixSeasons: readonly JansonSeasonalStatement[];
} = ${JSON.stringify(seasonalProse, null, "\t")};
`,
);

console.log(
	`wrote ${monthNames.length} month-name rows, ${losar.length} Losar rows, ${cycle.length} cycle rows, ` +
		`the epoch at JD ${epochMatch[1]}, ${divergenceDates.length} a2 divergence dates, ` +
		`${divergenceCounts.length} divergence counts and ${crossVersionLeap.length} cross-version ` +
		`leap rows (${crossVersionLeap.filter((r) => !r.commented).length} printed) to test/fixtures/`,
);
