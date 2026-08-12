#!/usr/bin/env node
/**
 * Regenerates `test/fixtures/fpmt-observances.ts` from FPMT's published monthly calendars.
 *
 * Usage:
 *   node scripts/fetch-fpmt-observances.mjs [fromYear] [toYear]
 *
 * ## Why this exists
 *
 * `test/fixtures/fpmt-holy-days.ts` is hand-curated, and CLAUDE.md grants it that exception
 * because "FPMT publishes its dates in prose announcements with no feed to parse". That is true
 * of the edu-news announcements it draws on. It is **not** true of
 * <https://fpmt.org/resources/calendar/YYYY/Month.php>, which renders one HTML table per month
 * mapping each Gregorian day to its Tibetan day number and its practice labels. So this fixture
 * is generated, per the repository's normal rule, and the hand-curated one is left alone.
 *
 * The pages are prepared by astrologer Paksam Ngawang Thartho from the Men-Tsee-Khang (Tibetan
 * Medical and Astrological Institute) calendar — the same almanac line that settles the `a2`
 * fork in docs/decisions/2026-08-12-lunar-anomaly-a2-default.md.
 *
 * ## What it yields
 *
 * Two independent checks from one fetch:
 *
 * 1. **A fourth cross-check of the calendar itself** — `iso` to `month`/`day`/`isLeapMonth`,
 *    from an almanac-derived source rather than another implementation of Janson.
 * 2. **The observance rules** — which day numbers carry which practices, and, on doubled days,
 *    which half FPMT actually prints them on. That last question is the one no arithmetic can
 *    settle and the reason Phase 3 makes it configurable.
 *
 * ## Clean-room boundary
 *
 * This reads published dates and the names of observances. Dates are facts, not copyrightable
 * expression; the observance names are short factual labels. No implementation is read. See
 * CONTRIBUTING.md.
 *
 * ## Page structure, verified against the markup rather than a rendering
 *
 * One `<TABLE id="cal_table">` per page. Its caption `<em>` carries the Tibetan months the
 * Gregorian month spans, e.g. `Tibetan Months 5-6A`. A leap month is suffixed `A` and the
 * regular month sharing its number `B` — confirmed against July and August 2024, where the
 * Chokhor Duchen falls in `6A` and the engine independently makes that the leap month.
 *
 * Each day cell is regular:
 *
 * ```html
 * <span class="h1_bold">10</span>                          <!-- Gregorian day -->
 * <div class="h1_bold tibetan_date"><I>4</I></div>          <!-- Tibetan day number -->
 * UD-FW<br>                                                 <!-- day-quality code -->
 * GCH NMP PP <strong>B</strong><br>                         <!-- short astrological codes -->
 * Precepts<br>                                              <!-- practice labels, one per line -->
 * <em>Lord Buddha's first teaching</em><br>                 <!-- <em> marks a great holy day -->
 * ```
 *
 * Skipped dates carry no marker at all — the number simply jumps, as 1 to 3 across
 * 16-17 June 2026. Doubled dates repeat the number on consecutive cells, as 19-20 November 2025.
 * Both are therefore detected from the sequence, not from an annotation.
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

/**
 * Whole years only — the day-count check at the end assumes it, and a partial year would let the
 * fixture shrink silently. FPMT publishes ahead of the current date but not a full year ahead:
 * as of August 2026 the last complete year on the site is 2025, and 2026 stops at September.
 * Pages exist back to 2018.
 */
const fromYear = Number(process.argv[2] ?? 2022);
const toYear = Number(process.argv[3] ?? 2025);

/** Lines that are purely astrological codes, which are not observances. */
const CODE_LINE = /^(?:[A-Z]{1,4}(?:-[A-Z]{2})?)(?:\s+[A-Z]{1,4}(?:-[A-Z]{2})?)*$/;

function stripTags(s) {
	return s.replace(/<[^>]+>/g, "");
}

function decode(s) {
	return s
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&#8217;|&rsquo;/g, "’")
		.replace(/&#8216;|&lsquo;/g, "‘")
		.replace(/&quot;/g, '"')
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">");
}

function tidy(s) {
	return decode(stripTags(s)).replace(/\s+/g, " ").trim();
}

/**
 * Expands a caption like `Tibetan Months 5-6A` into the months the Gregorian month spans.
 *
 * The caption is a **range**, not a list: December 2024 reads `Tibetan Months 9-11` and spans
 * three Tibetan months, 9, 10 and 11. `A` marks a leap month and `B` the regular month sharing
 * its number, so `6A-6B` is the leap month 6 followed by the regular one.
 *
 * `count` comes from the cells themselves — the number of times the day number resets, plus one —
 * so the span's length is observed rather than inferred from the caption. A Gregorian month of at
 * most 31 days cannot span more than three Tibetan months of at least 29 days each, which is what
 * makes filling in a single middle month sufficient.
 */
function parseMonthSpan(caption, count, url) {
	const tokens = [...caption.matchAll(/(\d{1,2})\s*([AB])?/g)].map((m) => ({
		month: Number(m[1]),
		isLeapMonth: m[2] === "A",
	}));
	if (tokens.length === 0) throw new Error(`${url}: unparsed month span "${caption}"`);

	const first = tokens[0];
	const last = tokens[tokens.length - 1];
	if (count === 1) return [first];
	if (count === 2) return [first, last];
	if (count === 3) {
		// The middle month is determined: after a leap month comes the regular month sharing its
		// number; before a regular month of a leap pair comes its leap month; otherwise the
		// numbering simply advances.
		const middle = first.isLeapMonth
			? { month: first.month, isLeapMonth: false }
			: /B/.test(caption) && last.month !== first.month
				? { month: last.month, isLeapMonth: true }
				: { month: (first.month % 12) + 1, isLeapMonth: false };
		return [first, middle, last];
	}
	throw new Error(`${url}: ${count} Tibetan months in one Gregorian month, which cannot happen`);
}

async function fetchMonth(year, monthName) {
	const url = `https://fpmt.org/resources/calendar/${year}/${monthName}.php`;
	const response = await fetch(url);
	if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
	return { url, html: await response.text() };
}

function parseMonth(year, monthIndex, html, url) {
	const table = /<TABLE id="cal_table"[\s\S]*?<\/TABLE>/i.exec(html);
	if (table === null) throw new Error(`no cal_table in ${url}`);

	const caption = /<em[^>]*>([\s\S]*?)<\/em>/i.exec(table[0]);
	if (caption === null) throw new Error(`no month-span caption in ${url}`);

	const cells = [...table[0].matchAll(/<TD height="140"[^>]*>([\s\S]*?)<\/TD>/gi)].map((m) => m[1]);

	// Count the month boundaries before assigning any, so the span's length is observed rather
	// than assumed from the caption's endpoints.
	const days = cells
		.filter((c) => /<span class="h1_bold">(\d+)<\/span>/i.test(c))
		.map((c) => {
			const tibetan = /tibetan_date"><I>\s*(\d+)\s*<\/I>/i.exec(c);
			if (tibetan === null) throw new Error(`cell with no Tibetan day in ${url}`);
			return Number(tibetan[1]);
		});
	const resets = days.filter((d, i) => i > 0 && d < days[i - 1]).length;
	const span = parseMonthSpan(tidy(caption[1]), resets + 1, url);

	const rows = [];
	let spanIndex = 0;
	let previousDay = 0;

	for (const cell of cells) {
		const gregorian = /<span class="h1_bold">(\d+)<\/span>/i.exec(cell);
		const tibetan = /tibetan_date"><I>\s*(\d+)\s*<\/I>/i.exec(cell);
		if (gregorian === null) continue;
		if (tibetan === null) throw new Error(`cell with no Tibetan day in ${url}`);

		const day = Number(tibetan[1]);
		// The day number resets at a month boundary; that is the only signal the cells carry.
		if (day < previousDay) spanIndex += 1;
		previousDay = day;

		// Everything that is not a line of astrological codes is an observance label. FPMT
		// italicises the ones it treats as headline entries — the great holy days, but also
		// teacher anniversaries such as Lama Tsong Khapa and Lama Zopa Rinpoche's birthday — so
		// `major` records the emphasis, not a claim that the day is a duchen.
		const afterHeader = cell.slice(cell.indexOf("</div>") + 6);
		const labels = [];
		let major = false;
		for (const raw of afterHeader.split(/<br\s*\/?>/i)) {
			const text = tidy(raw);
			if (text === "" || CODE_LINE.test(text)) continue;
			if (/<em[^>]*>/i.test(raw)) major = true;
			labels.push(text);
		}

		rows.push({
			iso: `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(Number(gregorian[1])).padStart(2, "0")}`,
			month: span[spanIndex].month,
			day,
			isLeapMonth: span[spanIndex].isLeapMonth,
			labels,
			major,
		});
	}

	return rows;
}

const all = [];
for (let year = fromYear; year <= toYear; year++) {
	for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
		const { url, html } = await fetchMonth(year, MONTHS[monthIndex]);
		const rows = parseMonth(year, monthIndex, html, url);
		const expected = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
		if (rows.length !== expected)
			throw new Error(`${url}: parsed ${rows.length} days, expected ${expected}`);
		all.push(...rows);
		process.stderr.write(
			`${year}-${String(monthIndex + 1).padStart(2, "0")}: ${rows.length} days\n`,
		);
	}
}

// A silently shrinking fixture is the failure mode this guards against: the suite would still
// pass, on less evidence.
const expectedDays =
	(Date.UTC(toYear + 1, 0, 1) - Date.UTC(fromYear, 0, 1)) / (24 * 60 * 60 * 1000);
if (all.length !== expectedDays)
	throw new Error(`parsed ${all.length} days, expected ${expectedDays} for ${fromYear}-${toYear}`);

// Doubled days repeat a number on consecutive days within one month; the first is the leap day.
for (let i = 0; i < all.length; i++) {
	const previous = all[i - 1];
	const next = all[i + 1];
	const sameMonth = (a, b) =>
		a !== undefined && b !== undefined && a.month === b.month && a.isLeapMonth === b.isLeapMonth;
	all[i].isDoubledDay =
		(sameMonth(all[i], next) && next.day === all[i].day) ||
		(sameMonth(all[i], previous) && previous.day === all[i].day);
	all[i].isLeapDay = sameMonth(all[i], next) && next.day === all[i].day;
}

const quote = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

const body = all
	.map((r) => {
		const flags = [
			r.isLeapMonth ? "isLeapMonth: true" : null,
			r.isDoubledDay ? "isDoubledDay: true" : null,
			r.isLeapDay ? "isLeapDay: true" : null,
			r.major ? "major: true" : null,
		].filter(Boolean);
		const labels =
			r.labels.length > 0 ? `, labels: [${r.labels.map((l) => `"${quote(l)}"`).join(", ")}]` : "";
		const tail = flags.length > 0 ? `, ${flags.join(", ")}` : "";
		return `\t{ iso: "${r.iso}", month: ${r.month}, day: ${r.day}${tail}${labels} },`;
	})
	.join("\n");

const doubled = all.filter((r) => r.isDoubledDay).length;
const leapMonthDays = all.filter((r) => r.isLeapMonth).length;
const withLabels = all.filter((r) => r.labels.length > 0).length;

const out = `/**
 * Day-by-day Tibetan dates and observance labels for ${fromYear}-01-01 to ${toYear}-12-31, from
 * FPMT's published monthly calendars.
 *
 * @remarks
 * GENERATED by \\\`scripts/fetch-fpmt-observances.mjs\\\`. Do not edit by hand — re-run the script.
 *
 * Unlike the three \\\`crosscheck-*\\\` fixtures, which come from other implementations of Janson,
 * this one comes from an **almanac** line: FPMT's calendars are prepared from the Men-Tsee-Khang
 * calendar. It therefore tests two different things at once — that our day numbering matches what
 * practitioners are given, and which observances fall on which day numbers.
 *
 * Published dates and observance names are facts rather than copyrightable expression, which is
 * what makes them usable under this project's clean-room constraint.
 *
 * Covers ${all.length} consecutive days: ${doubled} doubled, ${leapMonthDays} in leap months, and
 * ${withLabels} carrying at least one observance label. Skipped dates are absent by construction —
 * they name no calendar day, so the calendar has no cell for them.
 */
export interface FpmtObservanceRow {
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
	/**
	 * Whether FPMT italicises one of the labels. It uses emphasis for headline entries — the great
	 * holy days, but also teacher anniversaries — so this records the emphasis, not a category.
	 */
	major?: boolean;
	/** The observance labels FPMT prints, verbatim. Omitted where there are none. */
	labels?: readonly string[];
}

export const FPMT_OBSERVANCES: readonly FpmtObservanceRow[] = [
${body}
];
`;

const target = join(
	dirname(fileURLToPath(import.meta.url)),
	"..",
	"test",
	"fixtures",
	"fpmt-observances.ts",
);
writeFileSync(target, out);
process.stderr.write(
	`wrote ${all.length} days to ${target} (${doubled} doubled, ${leapMonthDays} in leap months, ${withLabels} labelled)\n`,
);
