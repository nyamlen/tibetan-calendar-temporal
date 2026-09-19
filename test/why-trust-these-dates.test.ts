import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as astrology from "../src/astrology/index.js";
import { isoToTibetan } from "../src/computation/conversion.js";
import * as root from "../src/index.js";
import * as observances from "../src/observances/index.js";
import { BHUTAN, BHUTAN_HENNING } from "../src/traditions/bhutan.js";
import { CROSS_VERSION_LEAP } from "./fixtures/cross-version-leap.js";
import { ESZTHOFF_DATES } from "./fixtures/crosscheck-eszthoff.js";
import { LOTSAWA_DATES } from "./fixtures/crosscheck-lotsawa.js";
import { STEINERT_DATES } from "./fixtures/crosscheck-steinert.js";
import { FPMT_OBSERVANCES } from "./fixtures/fpmt-observances.js";
import { A2_DIVERGENCE_COUNTS, JANSON_EPOCH } from "./fixtures/janson-epoch.js";
import { LOSAR_DATES } from "./fixtures/losar.js";
import { RGOB_DAYS } from "./fixtures/rgob.js";
import { YOGA_NAMES } from "./fixtures/yoga-names.js";
import {
	a2ForkDivergences,
	bhutanDayMismatches,
	bhutanStart,
	TRUSTED_DAYS,
	trustedEnd,
	unpairedLeapBlocks,
} from "./support/bhutan.js";
import { mismatchesIn } from "./support/crosscheck.js";
import { fpmtMoonComparison, fpmtNumberingMismatches } from "./support/fpmt.js";
import {
	favorabilityDays,
	favorabilityDisagreements,
	mansionDays,
	mansionDisagreements,
} from "./support/fpmt-yoga.js";
import { thrownBy } from "./support/thrown.js";
import { VERSIONS } from "./support/versions.js";

/**
 * Every figure, window and count in `docs/why-trust-these-dates.md`.
 *
 * @remarks
 * That page ships to npm, and it is almost entirely windows, counts and agreement claims — the values
 * likeliest to drift. It had no suite until 2026-09-18, and the gap had cost four false statements:
 * a Bhutanese row count that included 273 days no test compares, a citation example claiming three
 * implementations over a year only one source reaches, four sources said to "overlap across the same
 * period" that share only two years, and three implementations said to side with the engine on a day
 * none of them has data for.
 *
 * The rules are `test/guide.test.ts`'s, and two more that the page's content forces.
 *
 * - **Read the page, never restate it.** Every figure is captured out of the prose or a table row and
 *   compared with a value **computed** from the fixtures and the engine.
 * - **Measure with the validation suites' own predicates**, from `test/support/`. A second definition
 *   of "agrees" would make the page and the suite two claims under one word.
 * - **Anchor windows to data.** `docs/testing.md` is checked as well, but second: two documents that
 *   share an error agree with each other.
 * - **Nothing numeric escapes classification.** Every digit and every number word on the page must lie
 *   inside a claim — asserted, or listed as not assertable with its reason — so a figure added later
 *   fails here until someone decides which it is.
 *
 * Matching runs on the page with every run of whitespace collapsed to one space, so a claim does not
 * break when a sentence is re-wrapped.
 */

const document = readFileSync(new URL("../docs/why-trust-these-dates.md", import.meta.url), "utf8");
const text = document.replace(/\s+/g, " ");
const testingDocument = readFileSync(new URL("../docs/testing.md", import.meta.url), "utf8");

// ---- formatting, in the page's own conventions ----------------------------------------------------

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
const plain = (iso: string) => Temporal.PlainDate.from(iso);
const monthName = (date: Temporal.PlainDate) => MONTHS[date.month - 1] as string;
/** "1 January 2022" — the prose form. */
const long = (date: Temporal.PlainDate) => `${date.day} ${monthName(date)} ${date.year}`;
/** "1 Jan 2022" — the table form. */
const short = (date: Temporal.PlainDate) =>
	`${date.day} ${monthName(date).slice(0, 3)} ${date.year}`;
const count = (n: number) => n.toLocaleString("en-US");

/**
 * The number words the page uses, and nothing else. A word missing from this table cannot be asserted,
 * which is the point: it has to be added deliberately.
 */
const NUMBER_WORDS: Record<number, string> = {
	1: "one",
	2: "two",
	3: "three",
	4: "four",
	5: "five",
	6: "six",
	10: "ten",
	25: "twenty-five",
	27: "twenty-seven",
	30: "thirty",
};
const word = (n: number) => NUMBER_WORDS[n] ?? `<${n} has no number word>`;

/** "just over six years": a window of at least that many whole years, and less than half a year more. */
function justOver(from: Temporal.PlainDate, to: Temporal.PlainDate): string {
	const length = from.until(to.add({ days: 1 }), { largestUnit: "years" });
	const over = length.months > 0 || length.days > 0;
	if (!over || length.months >= 6) return `<${length.toString()} is not "just over" a whole year>`;
	return `just over ${word(length.years)} years`;
}

function windowOf(rows: readonly { iso: string }[]) {
	const isos = rows.map((row) => row.iso).sort();
	return { first: plain(isos[0] as string), last: plain(isos[isos.length - 1] as string) };
}

// ---- the measurements the page quotes ---------------------------------------------------------------

interface Source {
	name: string;
	kind: "published almanac" | "independent implementation";
	rows: readonly { iso: string }[];
	/** The days the engine computes differently, by the validation suite's own predicate. */
	differing: readonly string[];
}

const PHUGPA_SOURCES: readonly Source[] = [
	{
		name: "FPMT monthly calendars",
		kind: "published almanac",
		rows: FPMT_OBSERVANCES,
		differing: fpmtNumberingMismatches().map((row) => row.iso),
	},
	...(
		[
			["Lotsawa House", LOTSAWA_DATES],
			["eszthoff", ESZTHOFF_DATES],
			["christian-steinert", STEINERT_DATES],
		] as const
	).map(([name, rows]) => ({
		name,
		kind: "independent implementation" as const,
		rows,
		differing: mismatchesIn(rows).map(({ expected }) => expected.iso),
	})),
];
const IMPLEMENTATIONS = PHUGPA_SOURCES.filter((s) => s.kind === "independent implementation");
const FULL_AGREEMENT = PHUGPA_SOURCES.filter((s) => s.differing.length === 0);
const sourceNamed = (name: string) => {
	const source = PHUGPA_SOURCES.find((s) => s.name === name);
	if (source === undefined) throw new Error(`no source named ${name}`);
	return source;
};
const agreeCell = (source: Source) =>
	source.differing.length === 0 ? "all" : count(source.rows.length - source.differing.length);

const PHUGPA_ROWS = PHUGPA_SOURCES.reduce((sum, s) => sum + s.rows.length, 0);
const UNION = new Set(PHUGPA_SOURCES.flatMap((s) => s.rows.map((row) => row.iso)));
const UNION_WINDOW = windowOf([...UNION].map((iso) => ({ iso })));
const OVERLAP = {
	first: PHUGPA_SOURCES.map((s) => windowOf(s.rows).first)
		.sort(Temporal.PlainDate.compare)
		.at(-1),
	last: PHUGPA_SOURCES.map((s) => windowOf(s.rows).last).sort(Temporal.PlainDate.compare)[0],
};

const LEAP_ROWS = CROSS_VERSION_LEAP.length * VERSIONS.length;
const LEAP_COMMENTED = CROSS_VERSION_LEAP.filter((row) => row.commented).map((row) => row.year);
const TOTAL_ROWS = PHUGPA_ROWS + TRUSTED_DAYS + RGOB_DAYS.length + LOSAR_DATES.length + LEAP_ROWS;
/** "Nearly 18,000": the total rounded up to the thousand, and within five hundred of it. */
const NEARLY =
	Math.ceil(TOTAL_ROWS / 1000) * 1000 - TOTAL_ROWS <= 500
		? count(Math.ceil(TOTAL_ROWS / 1000) * 1000)
		: `<${count(TOTAL_ROWS)} is not nearly a round thousand>`;

const LOSAR_WINDOW = windowOf(LOSAR_DATES.map((row) => ({ iso: row.losar })));
const FPMT_WINDOW = windowOf(FPMT_OBSERVANCES);
const RGOB_WINDOW = windowOf(RGOB_DAYS);
const LOTSAWA_WINDOW = windowOf(LOTSAWA_DATES);

/** Every leap month the engine puts inside the Phugpa union window, as `year/month`. */
function leapMonthsIn(isos: Iterable<string>): Set<string> {
	const found = new Set<string>();
	for (const iso of isos) {
		const date = isoToTibetan(plain(iso));
		if (date.isLeapMonth) found.add(`${date.year}/${date.month}`);
	}
	return found;
}

/** The day-number difference on each day a source differs, as a set: the page says "one". */
function dayDifferences(
	rows: readonly { iso: string; day: number }[],
	differing: readonly string[],
) {
	return new Set(
		rows
			.filter((row) => differing.includes(row.iso))
			.map((row) => Math.abs(isoToTibetan(plain(row.iso)).day - row.day)),
	);
}
const onlyValue = (values: Set<number>) =>
	values.size === 1 ? word([...values][0] as number) : `<${[...values].join(", ")}>`;

/** The page's residual shape: one year far above the others, which come before it. */
const MANSION_BY_YEAR = (() => {
	const byYear = new Map<number, number>();
	for (const day of mansionDisagreements()) {
		const year = plain(day.iso).year;
		byYear.set(year, (byYear.get(year) ?? 0) + 1);
	}
	return byYear;
})();
const pct = (agreed: number, of: number) => ((100 * agreed) / of).toFixed(1);

/** RGoB's featured days, read through the engine rather than off the fixture's notes. */
const RGOB_FEATURES = (() => {
	let skipped = 0;
	let doubled = 0;
	let losar = 0;
	for (const row of RGOB_DAYS) {
		const date = isoToTibetan(plain(row.iso), BHUTAN);
		const previous = isoToTibetan(plain(row.iso).subtract({ days: 1 }), BHUTAN);
		if (previous.month === date.month && date.day - previous.day === 2) skipped += 1;
		if (date.isLeapDay) doubled += 1;
		if (date.month === 1 && date.day === 1 && !date.isLeapMonth) losar += 1;
	}
	return { skipped, doubled, losar };
})();

/** The section of the page between two markers, in its original line structure. */
function between(start: RegExp, end: RegExp): string {
	const from = start.exec(document);
	if (from === null) return "";
	const rest = document.slice(from.index + from[0].length);
	const to = end.exec(rest);
	return to === null ? "" : rest.slice(0, to.index);
}
const paragraphs = (section: string) =>
	section.split(/\n\s*\n/).filter((piece) => piece.trim() !== "");

// ---- the claims ------------------------------------------------------------------------------------

interface Claim {
	/** What the claim says, which is what a failure reports. */
	what: string;
	pattern: RegExp;
	/** The computed values its capture groups must read, in order. */
	expected?: () => readonly (string | number)[];
	/** Why it cannot be asserted. A claim has this or `expected`, never both. */
	notAssertable?: string;
}

const CLAIMS: readonly Claim[] = [
	// How much has actually been checked
	{
		what: "the total, rounded",
		pattern: /Nearly \*\*([\d,]+) rows\*\* of published calendar data/,
		expected: () => [NEARLY],
	},
	{
		what: "the total, as the headline the page declines",
		pattern: /the useful summary is not "([\d,]+) days verified"/,
		expected: () => [NEARLY],
	},
	{
		what: "the summary table's Bhutanese row",
		pattern:
			/\| Bhutanese days, (.+?) – (.+?) \| ([\d,]+) \| one lineage \(Henning's software\) \|/,
		expected: () => [short(bhutanStart), short(trustedEnd), count(TRUSTED_DAYS)],
	},
	{
		what: "the summary table's Phugpa row",
		pattern: /\| Phugpa days, (.+?) – (.+?) \| ([\d,]+) \| \*\*(\w+) independent sources\*\* \|/,
		expected: () => [
			short(UNION_WINDOW.first),
			short(UNION_WINDOW.last),
			count(PHUGPA_ROWS),
			word(PHUGPA_SOURCES.length),
		],
	},
	{
		what: "the summary table's Royal Government row",
		pattern:
			/\| Royal Government of Bhutan days, (\d+)–(\d+) \| (\d+) \| an independent almanac \|/,
		expected: () => [RGOB_WINDOW.first.year, RGOB_WINDOW.last.year, RGOB_DAYS.length],
	},
	{
		what: "the summary table's Losar row",
		pattern: /\| Losar, (\d+)–(\d+) \| (\d+) \| Janson \|/,
		expected: () => [LOSAR_WINDOW.first.year, LOSAR_WINDOW.last.year, LOSAR_DATES.length],
	},
	{
		what: "the summary table's leap-month row, and the years resting on Janson's unprinted rows",
		pattern:
			/\| Leap months across (\w+) traditions, (\d+)–(\d+) \| (\d+) \| Janson \(for (\d+)–(\d+), Janson's own values from his published source files, which he left out of the printed paper\) \|/,
		expected: () => [
			word(VERSIONS.length),
			CROSS_VERSION_LEAP[0]?.year ?? "",
			CROSS_VERSION_LEAP.at(-1)?.year ?? "",
			LEAP_ROWS,
			Math.min(...LEAP_COMMENTED),
			Math.max(...LEAP_COMMENTED),
		],
	},
	{
		what: "the count of qualifications after the summary table",
		pattern: /\*\*(\w+) honest qualifications, and they are the reason/,
		expected: () => [
			word(paragraphs(between(/a headline\s+number\.\*\*/, /So the useful summary/)).length),
		],
	},
	{
		what: "the Phugpa rows as comparisons: sources, overlap, union",
		pattern:
			/The ([\d,]+) Phugpa rows are \*\*comparisons, not distinct days\*\*: the (\w+) sources overlap only in part — all (\w+) cover the same days only from (.+?) to (.+?) — and between them they cover \*\*([\d,]+) distinct days\*\*, every day from (.+?) to (.+?)\. /,
		expected: () => [
			count(PHUGPA_ROWS),
			word(PHUGPA_SOURCES.length),
			word(PHUGPA_SOURCES.length),
			OVERLAP.first ? long(OVERLAP.first) : "",
			OVERLAP.last ? long(OVERLAP.last) : "",
			count(UNION.size),
			long(UNION_WINDOW.first),
			long(UNION_WINDOW.last),
		],
	},
	{
		what: "the argument for presenting comparisons",
		pattern:
			/Four independent sources agreeing on the same day is much stronger evidence than one source checked on four times as many days/,
		notAssertable: "an argument about evidence, not a measurement",
	},
	{
		what: "the Bhutanese rows and their duration",
		pattern:
			/And the ([\d,]+) Bhutanese rows, though far the largest block, descend from \*\*a single lineage\*\*\. They establish that the engine reproduces Henning's Bhutanese calendar for (just over \w+ years), from (.+?) to (.+?)\./,
		expected: () => [
			count(TRUSTED_DAYS),
			justOver(bhutanStart, trustedEnd),
			long(bhutanStart),
			long(trustedEnd),
		],
	},
	{
		what: "the shared-misreading caveat",
		pattern: /because a shared misreading would appear in both/,
		notAssertable: "an argument about lineage",
	},
	{
		what: "the Royal Government rows, twice",
		pattern:
			/The (\S+) Royal Government rows are the only genuinely independent check on Bhutanese day numbers, and (\S+) is what it is\./,
		expected: () => [word(RGOB_DAYS.length), word(RGOB_DAYS.length)],
	},
	{
		what: "the useful summary",
		pattern:
			/It is: \*\*(\w+) independent Phugpa sources which between them cover every day from (.+?) to (.+?), (just over \w+ years) of Bhutanese dates against one lineage plus (\S+) government-published days, and (\d+) years of Losar against Janson\.\*\*/,
		expected: () => [
			word(PHUGPA_SOURCES.length),
			long(UNION_WINDOW.first),
			long(UNION_WINDOW.last),
			justOver(bhutanStart, trustedEnd),
			word(RGOB_DAYS.length),
			LOSAR_DATES.length,
		],
	},

	// The Tibetan (Phugpa) calendar
	{
		what: "the Phugpa section's opening: sources, union window, implementations",
		pattern:
			/Checked \*\*day by day against (\w+) independent sources, which between them cover every day from (.+?) to (.+?)\*\* — FPMT's own published monthly calendars and (\w+) independent implementations\./,
		expected: () => [
			word(PHUGPA_SOURCES.length),
			long(UNION_WINDOW.first),
			long(UNION_WINDOW.last),
			word(IMPLEMENTATIONS.length),
		],
	},
	{
		what: "the advice to quote one source's window",
		pattern: /a claim resting on one of them should quote that source's/,
		notAssertable: "advice to the reader",
	},
	{
		what: "the per-source row for FPMT",
		pattern:
			/\| FPMT monthly calendars \| (published almanac) \| (.+?) \| (.+?) \| ([\d,]+) \| ([\d,]+) — (\w+) days differ, explained below \|/,
		expected: () => {
			const s = sourceNamed("FPMT monthly calendars");
			const w = windowOf(s.rows);
			return [
				s.kind,
				short(w.first),
				short(w.last),
				count(s.rows.length),
				agreeCell(s),
				word(s.differing.length),
			];
		},
	},
	...(["Lotsawa House", "eszthoff", "christian-steinert"] as const).map(
		(name): Claim => ({
			what: `the per-source row for ${name}`,
			pattern: new RegExp(
				`\\| ${name} \\| (independent implementation) \\| (.+?) \\| (.+?) \\| ([\\d,]+) \\| (all|[\\d,]+) \\|`,
			),
			expected: () => {
				const s = sourceNamed(name);
				const w = windowOf(s.rows);
				return [s.kind, short(w.first), short(w.last), count(s.rows.length), agreeCell(s)];
			},
		}),
	),
	{
		what: "christian-steinert's differences",
		pattern:
			/It differs from the engine on (\d+) days, each by (\w+) number beside a skipped or doubled date/,
		expected: () => {
			const s = sourceNamed("christian-steinert");
			return [s.differing.length, onlyValue(dayDifferences(STEINERT_DATES, s.differing))];
		},
	},
	{
		what: "the sources agreeing on every day, and the leap months they span",
		pattern:
			/(\w+) of the (\w+), (.+?), agree on every single day in range, including every doubled date, (\w+) leap months and every skipped date\./,
		expected: () => {
			const all = leapMonthsIn(UNION);
			const spanned = FULL_AGREEMENT.every(
				(s) => [...leapMonthsIn(s.rows.map((r) => r.iso))].join() === [...all].join(),
			);
			return [
				word(FULL_AGREEMENT.length),
				word(PHUGPA_SOURCES.length),
				FULL_AGREEMENT.map((s) => s.name).join(" and "),
				all.size === 2 && spanned ? "both" : `<${all.size} leap months, spanned: ${spanned}>`,
			];
		},
	},
	{
		what: "the Phugpa window's duration",
		pattern: /Outside that window of (just over \w+ years) the evidence is thinner/,
		expected: () => [justOver(UNION_WINDOW.first, UNION_WINDOW.last)],
	},
	{
		what: "Losar",
		pattern:
			/\*\*Losar, (\d+)–(\d+)\*\* — Janson prints the Tibetan New Year for (\d+) consecutive years\. The engine reproduces all (\d+)\./,
		expected: () => [
			LOSAR_WINDOW.first.year,
			LOSAR_WINDOW.last.year,
			LOSAR_DATES.length,
			LOSAR_DATES.length,
		],
	},
	{
		what: "the epoch",
		pattern:
			/\*\*The epoch year, (\d+)\*\* — the founding constants match his to (\w+) decimal places\./,
		expected: () => [
			JANSON_EPOCH.julianCalendarDate.split(" ").at(-1) ?? "",
			word(
				Math.max(
					...[JANSON_EPOCH.meanDate, JANSON_EPOCH.meanSun, JANSON_EPOCH.lunarAnomaly].map(
						(value) => String(value).split(".")[1]?.length ?? 0,
					),
				),
			),
		],
	},
	{
		what: "the a₂ divergences before 1927",
		pattern:
			/\*\*(\d+)–(\d+)\*\* — Janson's own computer search found (\d+) places where two defensible values of one lunar constant give different dates in what he calls the first (\d+)-year cycle\. The engine reproduces all (\d+), and his counts for the twentieth and twenty-first centuries too\. This is the only external check on calendar output before (\d+)\./,
		expected: () => {
			const early = A2_DIVERGENCE_COUNTS.find((row) => row.from < 1900);
			const modern = [1900, 2000].every((from) =>
				A2_DIVERGENCE_COUNTS.some((row) => row.from === from && row.to === from + 99),
			);
			if (early === undefined || !modern) return ["<the fixture lost a window>"];
			return [
				early.from,
				early.to,
				early.count,
				early.to - early.from + 1,
				early.count,
				LOSAR_WINDOW.first.year,
			];
		},
	},

	// The Bhutanese calendar
	{
		what: "the Bhutanese window",
		pattern: /Checked \*\*day by day from (.+?) to (.+?)\*\* against calendar data descending from/,
		expected: () => [long(bhutanStart), long(trustedEnd)],
	},
	{
		what: "the Royal Government days and what they contain",
		pattern:
			/\*\*(\S+) days of the Royal Government of Bhutan's own published calendar\*\* for (\d+)–(\d+), including (\w+) skipped days, (\w+) doubled days and Losar\./,
		expected: () => [
			word(RGOB_DAYS.length),
			RGOB_WINDOW.first.year,
			RGOB_WINDOW.last.year,
			word(RGOB_FEATURES.skipped),
			word(RGOB_FEATURES.doubled),
		],
	},
	{
		what: "the per-source row for Henning's lineage",
		pattern:
			/\| Henning's lineage \| calendar data from Edward Henning's Bhutanese calendar software \| (.+?) \| (.+?) \| ([\d,]+) \| (\w+), under the Henning variant \|/,
		expected: () => [
			short(bhutanStart),
			short(trustedEnd),
			count(TRUSTED_DAYS),
			bhutanDayMismatches(BHUTAN_HENNING).length === 0 ? "all" : "<not all>",
		],
	},
	{
		what: "the per-source row for the Royal Government",
		pattern:
			/\| Royal Government of Bhutan \| the government's own published calendar, read by hand \| (.+?) \| (.+?) \| (\d+), chosen rather than consecutive \| (\w+) \|/,
		expected: () => {
			const wrong = RGOB_DAYS.filter((row) => isoToTibetan(plain(row.iso), BHUTAN).day !== row.day);
			return [
				short(RGOB_WINDOW.first),
				short(RGOB_WINDOW.last),
				RGOB_DAYS.length,
				wrong.length === 0 ? "all" : `<${wrong.length} differ>`,
			];
		},
	},
	{
		what: "the count of Bhutanese qualifications",
		pattern: /(\w+) qualifications, all of which matter:/,
		expected: () => [
			word(
				between(/all of which matter:/, /### Observances/)
					.split("\n")
					.filter((line) => line.startsWith("- ")).length,
			),
		],
	},
	{
		what: "where the Bhutanese window ends, and why",
		pattern:
			/The window ends on \*\*(.+?)\*\*, not at the end of the year, because the upstream source carries (\w+) leap month Janson does not list\./,
		expected: () => [long(trustedEnd), word(unpairedLeapBlocks().length)],
	},
	{
		what: "the default and Henning variants' differences inside the window",
		pattern:
			/validates the \*Henning\* variant of the Bhutanese configuration, not the default one; the (\w+) differ on (\w+) days inside the window\./,
		expected: () => [
			word([BHUTAN, BHUTAN_HENNING].length),
			word(a2ForkDivergences(bhutanStart, trustedEnd).length),
		],
	},
	{
		what: "the size of the only independent Bhutanese check",
		pattern:
			/That government calendar is the only genuinely independent check, and it is (\S+) days\./,
		expected: () => [word(RGOB_DAYS.length)],
	},

	// Observances
	{
		what: "the observance window",
		pattern: /\*\*FPMT's own published monthly calendars for (\d+)–(\d+)\*\*/,
		expected: () => [FPMT_WINDOW.first.year, FPMT_WINDOW.last.year],
	},

	// What is not established
	{
		what: "the Tsurphu and Mongolian leap-month window",
		pattern:
			/leap months are checked against Janson for (\d+)–(\d+) \(for (\d+)–(\d+), Janson's own values from his published source files/,
		expected: () => [
			CROSS_VERSION_LEAP[0]?.year ?? "",
			CROSS_VERSION_LEAP.at(-1)?.year ?? "",
			Math.min(...LEAP_COMMENTED),
			Math.max(...LEAP_COMMENTED),
		],
	},
	{
		what: "the three days FPMT differs on, and their size",
		pattern:
			/\*\*(\w+) days disagree with FPMT\*\*, and they are not smoothed over: (\S+), (\S+) and (\S+)\. Each is a (\w+)-number difference/,
		expected: () => {
			const s = sourceNamed("FPMT monthly calendars");
			return [
				word(s.differing.length),
				...s.differing,
				onlyValue(dayDifferences(FPMT_OBSERVANCES, s.differing)),
			];
		},
	},
	{
		what: "which implementations reach each of FPMT's three days",
		pattern:
			/as far as the (\w+) other implementations reach: none of them has data for (\S+), (.+?) side with the engine on (\S+), and all (\w+) do on (\S+)\./,
		expected: () => {
			const [first, second, third] = sourceNamed("FPMT monthly calendars").differing;
			const siding = (iso: string | undefined) =>
				IMPLEMENTATIONS.filter(
					(s) => s.rows.some((row) => row.iso === iso) && !s.differing.includes(iso as string),
				);
			const reaching = (iso: string | undefined) =>
				IMPLEMENTATIONS.filter((s) => s.rows.some((row) => row.iso === iso));
			return [
				word(IMPLEMENTATIONS.length),
				reaching(first).length === 0 ? (first ?? "") : `<${first} is reached>`,
				siding(second)
					.map((s) => s.name)
					.join(" and "),
				second ?? "",
				siding(third).length === IMPLEMENTATIONS.length
					? word(IMPLEMENTATIONS.length)
					: `<${siding(third).length} side on ${third}>`,
				third ?? "",
			];
		},
	},
	{
		what: "the four explanations",
		pattern: /Four explanations were tested and every one ruled out/,
		notAssertable: "history of an investigation, recorded in docs/testing.md",
	},
	{
		what: "the unsettled Bhutanese constant",
		pattern: /\*\*One Bhutanese constant cannot be settled\*\* by any source available today/,
		notAssertable: "a claim that no source exists",
	},
	{
		what: "the next date deciding the Bhutanese a₂ fork",
		pattern: /have passed or lie decades ahead; the next is in (\d+)\./,
		expected: () => [
			a2ForkDivergences(trustedEnd.add({ days: 1 }), plain("2100-12-31"), 1)[0]?.slice(0, 4) ?? "",
		],
	},
	{
		what: "the start of the Phugpa system",
		pattern: /\*\*The calendar is usable from 1447\*\*, when the Phugpa system was introduced/,
		notAssertable: "a historical fact",
	},
	{
		what: "when the astrology layer landed",
		pattern: /until 2026-09-12, when the `\.\/astrology` subpath landed/,
		notAssertable: "a date in the project's history",
	},
	{
		what: "the year's five elements",
		pattern: /the year's five elements/,
		notAssertable:
			"a description of Janson's cycles, checked against his tables in the astrology suites",
	},
	{
		// Counted as moons, measured by the validation suite's own predicate. The icons FPMT adds on
		// the first half of some doubled dates are recorded in docs/testing.md, not here (Andreas,
		// 2026-09-19), so "FPMT marks" is icons less those twins.
		what: "the moon agreement, its window, and the one moon a day apart",
		pattern:
			/\*\*Full and new moons\*\* are checked against the moon icons FPMT prints on the same calendars, from (.+?) to (.+?)\. Over those (\w+) years FPMT marks (\d+) full and new moons, and the engine puts (\d+) of them on the same day\. The (\d+)th is the new moon of (\w+) (\d+): day (\d+) is skipped that month, so the engine places the new moon on the (\d+)th, and FPMT marks it (\w+) day later, on the (\d+)th\./,
		expected: () => {
			const moons = fpmtMoonComparison();
			const [engine] = moons.unmatchedEngineMoons;
			const [icon] = moons.unmatchedIcons;
			if (
				moons.unmatchedEngineMoons.length !== 1 ||
				moons.unmatchedIcons.length !== 1 ||
				!engine ||
				!icon
			)
				return ["<not exactly one moon a day apart>"];
			const engineDate = plain(engine.iso);
			const iconDate = plain(icon.iso);
			const tibetan = isoToTibetan(engineDate);
			return [
				long(FPMT_WINDOW.first),
				long(FPMT_WINDOW.last),
				word(FPMT_WINDOW.last.year - FPMT_WINDOW.first.year + 1),
				moons.icons.length - moons.twinIcons.length,
				moons.matchedEngineMoons.length,
				moons.engineMoons.length,
				monthName(engineDate),
				engineDate.year,
				engine.kind === "new" && tibetan.isNewMoon && tibetan.day === 29
					? 30
					: "<not a skipped 30>",
				engineDate.day,
				word(engineDate.until(iconDate).days),
				iconDate.day,
			];
		},
	},
	{
		what: "the mansion figure, its days, and the Henning comparison tied to them",
		pattern:
			/agrees with FPMT's published codes on \*\*([\d.]+)%\*\* of the ([\d,]+) days in (\d+)–(\d+) whose code can name one\. Henning's published daily calendars, compared once outside the test suite, give the same mansion as this engine on all ([\d,]+) of those days/,
		expected: () => [
			pct(mansionDays.length - mansionDisagreements().length, mansionDays.length),
			count(mansionDays.length),
			FPMT_WINDOW.first.year,
			FPMT_WINDOW.last.year,
			// The Henning comparison ran once, outside the suite, over exactly these days. Extending
			// FPMT's data moves this figure, and the sentence must then be re-measured, not re-typed.
			count(mansionDays.length),
		],
	},
	{
		what: "the mansion residual's shape over time, and the days fitting no pattern",
		pattern:
			/and far more often in (\d+) than in the (\w+) years before\. No cause is established, and \*\*(\w+) days in (\w+) years fit no pattern at all\*\*/,
		expected: () => {
			const years = [...MANSION_BY_YEAR.keys()].sort();
			const last = years.at(-1) as number;
			const lastCount = MANSION_BY_YEAR.get(last) ?? 0;
			const far = years.slice(0, -1).every((y) => 2 * (MANSION_BY_YEAR.get(y) ?? 0) <= lastCount);
			const middle = mansionDisagreements().filter((d) => d.position >= 0.15 && d.position <= 0.85);
			return [
				far ? last : `<${last} is not far above the others>`,
				word(years.length - 1),
				word(middle.length),
				word(FPMT_WINDOW.last.year - FPMT_WINDOW.first.year + 1),
			];
		},
	},
	{
		what: "the favorability figure and its own days",
		pattern:
			/agrees with their printed prefixes on ([\d.]+)% of the ([\d,]+) days whose code can be read/,
		expected: () => [
			pct(favorabilityDays.length - favorabilityDisagreements.length, favorabilityDays.length),
			count(favorabilityDays.length),
		],
	},
	{
		what: "the dictionary's yogas, groups, and FPMT's favorable ones",
		pattern:
			/states the same element pair for each of the (\w+) yogas and grades them into (\w+) groups, shipped as `auspiciousness`; its grading agrees with FPMT's favorable (\w+)\. That is a check on the (\w+) rows of a table/,
		expected: () => {
			const favorable = astrology.ELEMENTAL_YOGAS.filter((y) => y.favorable);
			const agrees = astrology.ELEMENTAL_YOGAS.every(
				(y) => y.favorable === ["good", "restorative"].includes(y.auspiciousness.englishName),
			);
			return [
				word(YOGA_NAMES.length),
				word(new Set(YOGA_NAMES.map((y) => y.auspiciousness)).size),
				agrees ? word(favorable.length) : "<the grading and FPMT disagree>",
				word(astrology.ELEMENTAL_YOGAS.length),
			];
		},
	},
	{
		what: "what is not computed",
		pattern:
			/Nor are two things his main text describes and almanacs print, the twenty-seven astronomical yogas and the karaṇas/,
		notAssertable:
			"their location is in Janson's LaTeX, which is deliberately kept out of the repository",
	},

	// Why the results are identical everywhere
	{
		what: "the count of design decisions",
		pattern: /(\w+) design decisions do most of the work here, and (\w+) are structural/,
		expected: () => {
			const bold = paragraphs(between(/a matter of\s+care:/, /## How to cite/)).filter((p) =>
				p.startsWith("**"),
			).length;
			return [word(bold), bold === 2 ? "both" : `<${bold}>`];
		},
	},
	{
		what: "daybreak",
		pattern: /about 5 a\.m\. local mean solar time/,
		notAssertable: "held by the absence of any location input, not by a measurement",
	},
	{
		what: "the sunrise argument",
		pattern: /would make every answer depend on one/,
		notAssertable: "an argument",
	},

	// How to cite this
	{
		what: "the citation example, which names one source and its exact window",
		pattern:
			/"agrees with (.+?)'s calculator on every day from (.+?) to (.+?)" is the claim that can be checked\./,
		expected: () => {
			const s = sourceNamed("Lotsawa House");
			return [
				s.differing.length === 0 ? s.name : "<does not agree on every day>",
				long(LOTSAWA_WINDOW.first),
				long(LOTSAWA_WINDOW.last),
			];
		},
	},

	// Numbers the page carries that are not claims at all
	{
		what: "the lineage argument",
		pattern:
			/because the two did not arrive at their answer the same way\. Two programs descended from the same source/,
		notAssertable: "an argument; its link is checked below",
	},
	{
		what: "what the engine can express",
		pattern: /The engine can express both, and their leap months/,
		notAssertable: "a statement about expressiveness; test/support/versions.ts builds both configs",
	},
	{
		what: "the opening's example of an error",
		pattern: /a day number one higher than the almanac prints/,
		notAssertable: "an illustration",
	},
	{
		what: "the paper's arXiv identifier, in the link text and the address",
		pattern: /\[arXiv:1401\.6285\]\(https:\/\/arxiv\.org\/abs\/1401\.6285\)/,
		notAssertable: "provenance",
	},
];

// ---- the suite -------------------------------------------------------------------------------------

describe("why-trust-these-dates claims", () => {
	const matchesOf = (claim: Claim) => [
		...text.matchAll(new RegExp(claim.pattern.source, `${claim.pattern.flags}g`)),
	];

	it("finds every claim exactly once", () => {
		const wrong = CLAIMS.map((claim) => ({
			what: claim.what,
			found: matchesOf(claim).length,
		})).filter((entry) => entry.found !== 1);
		expect(wrong).toEqual([]);
	});

	it("classifies every claim as asserted or not assertable, never both", () => {
		const unclassified = CLAIMS.filter(
			(claim) => (claim.expected === undefined) === (claim.notAssertable === undefined),
		).map((claim) => claim.what);
		expect(unclassified).toEqual([]);
	});

	it.each(
		CLAIMS.filter((claim) => claim.expected !== undefined).map(
			(claim) => [claim.what, claim] as const,
		),
	)("%s", { timeout: 30_000 }, (_what, claim) => {
		const [match] = matchesOf(claim);
		expect(match, "the page no longer says this").toBeDefined();
		const read = (match as RegExpExecArray).slice(1).map((group) => group.toLowerCase());
		const computed = (claim.expected as () => readonly (string | number)[])().map((value) =>
			String(value).toLowerCase(),
		);
		expect(read).toEqual(computed);
	});

	/**
	 * The guard against the gap CLAUDE.md records for the docblock suite, which "is maintained by hand
	 * and nothing checks it is complete". A figure added to the page later fails here until it is either
	 * asserted or listed with the reason it cannot be.
	 */
	it("leaves no figure on the page unclassified", () => {
		const spans = CLAIMS.flatMap((claim) =>
			matchesOf(claim).map((m) => [m.index, m.index + m[0].length] as const),
		);
		const words = Object.values(NUMBER_WORDS)
			.concat("both")
			.sort((a, b) => b.length - a.length);
		const token = new RegExp(`\\d+(?:[.,]\\d+)*|(?<![\\w-])(?:${words.join("|")})(?!\\w)`, "gi");
		const unclaimed = [...text.matchAll(token)]
			.filter((m) => !spans.some(([from, to]) => m.index >= from && m.index < to))
			.map((m) => `"${m[0]}" in "…${text.slice(Math.max(0, m.index - 40), m.index + 40)}…"`);
		expect(unclaimed).toEqual([]);
	});

	it("covers every day of each source's window, and of the union", () => {
		const gaps: string[] = [];
		const days = (w: { first: Temporal.PlainDate; last: Temporal.PlainDate }) =>
			w.first.until(w.last, { largestUnit: "days" }).days + 1;
		for (const s of PHUGPA_SOURCES) {
			if (new Set(s.rows.map((r) => r.iso)).size !== days(windowOf(s.rows))) gaps.push(s.name);
		}
		if (UNION.size !== days(UNION_WINDOW)) gaps.push("the union");
		expect(gaps).toEqual([]);
	});

	it("contains the Losar the Royal Government rows are said to include", () => {
		expect(RGOB_FEATURES.losar).toBe(1);
	});

	it("does not call FPMT's observance set by a school's name", () => {
		// Kopan Monastery, also Gelug, prints the opposite doubled-day choice for the 2024 Chokhor
		// Duchen, so "Gelug" claimed a universality the data contradicts — the reason the export was
		// renamed DEFAULT_OBSERVANCES.
		expect(document).not.toMatch(/Gelug/);
		expect(Object.keys(observances)).toContain("DEFAULT_OBSERVANCES");
	});

	it("ships no Tsurphu or Mongolian calendar on any entry point", () => {
		const names = [root, observances, astrology].flatMap((barrel) => Object.keys(barrel));
		expect(names.filter((name) => /tsurphu|mongol/i.test(name))).toEqual([]);
	});

	it("refuses month and lunar-day attributes for both Bhutanese traditions", () => {
		const codes = [BHUTAN, BHUTAN_HENNING].flatMap((tradition) => [
			thrownBy(() => astrology.monthAttributesFor({ year: 2153, month: 1 }, { tradition }))?.code,
			thrownBy(() =>
				astrology.lunarDayAttributesFor({ year: 2153, month: 1, day: 1 }, { tradition }),
			)?.code,
		]);
		expect(codes).toEqual(Array(4).fill("TCT_ATTRIBUTE_NOT_SOURCED"));
	});

	describe("links into the repository", () => {
		const BASE = "https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/";
		const slugify = (heading: string) =>
			heading
				.trim()
				.toLowerCase()
				.replace(/[^\p{L}\p{N}\s-]/gu, "")
				.replace(/\s+/g, "-");
		const links = [...document.matchAll(/\]\((https:\/\/github\.com\/[^)\s]+)\)/g)].map(
			(m) => m[1] as string,
		);

		it("are all to this repository's main branch", () => {
			expect(links.length).toBeGreaterThan(0);
			expect(links.filter((link) => !link.startsWith(BASE))).toEqual([]);
		});

		it("resolve to a file, and a fragment to one of its headings", () => {
			const broken: string[] = [];
			for (const link of links) {
				const [path, fragment] = link.slice(BASE.length).split("#") as [string, string | undefined];
				const url = new URL(`../${path}`, import.meta.url);
				if (!existsSync(url)) {
					broken.push(`${link}: no such file`);
					continue;
				}
				if (fragment === undefined) continue;
				const headings = [...readFileSync(url, "utf8").matchAll(/^#{1,6}\s+(.+?)\s*$/gm)].map((m) =>
					slugify(m[1] as string),
				);
				if (!headings.includes(fragment)) broken.push(`${link}: no heading #${fragment}`);
			}
			expect(broken).toEqual([]);
		});
	});

	/**
	 * Second, and deliberately so. Every window above is anchored to its fixture; this checks only that
	 * `docs/testing.md`, the one other document allowed to state a window, says the same. Two documents
	 * sharing an error would pass this and fail the anchors, which is why it is not the anchor.
	 */
	describe("docs/testing.md states the same windows", () => {
		it.each(PHUGPA_SOURCES.map((s) => [s.name, s] as const))("%s", (_name, s) => {
			const row = new RegExp(`^\\| ${s.name} \\| (.+?) – (.+?), ([\\d,]+) days \\|`, "m").exec(
				testingDocument,
			);
			const w = windowOf(s.rows);
			expect(row?.slice(1)).toEqual([short(w.first), short(w.last), count(s.rows.length)]);
		});

		it("the union and the Bhutanese window", () => {
			const union = /^\| Cross-check fixtures, day by day \| (.+?) – (.+?), between them \|/m.exec(
				testingDocument,
			);
			const bhutan = /^\| `BHUTAN_HENNING`, day by day \| (.+?) – (.+?) \|/m.exec(testingDocument);
			expect([union?.slice(1), bhutan?.slice(1)]).toEqual([
				[short(UNION_WINDOW.first), short(UNION_WINDOW.last)],
				[short(bhutanStart), short(trustedEnd)],
			]);
		});
	});
});
