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
 * Three independent checks from one fetch:
 *
 * 1. **A fourth cross-check of the calendar itself** — `iso` to `month`/`day`/`isLeapMonth`,
 *    from an almanac-derived source rather than another implementation of Janson.
 * 2. **The observance rules** — which day numbers carry which practices, and, on doubled days,
 *    which half FPMT actually prints them on. That last question is the one no arithmetic can
 *    settle and the reason Phase 3 makes it configurable.
 * 3. **The full and new moons** — FPMT's moon icons against `isFullMoon`/`isNewMoon`.
 *
 * It also records the day-quality and advice codes verbatim, for the tests to read.
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
 * <div …><IMG src="…/fullmoon_new.gif" alt="Full Moon"></div>  <!-- moon icon, where printed -->
 * ```
 *
 * Below the table, a **KEY** defines every short code as `<p><strong>NB</strong> …</p>`. Codes are
 * checked against the key of the page they appear on, so FPMT's own definition is the reference
 * rather than a list typed here. The key lists only some of the yoga pairs FPMT prints, so yoga
 * codes are checked by their shape instead.
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
 * on 2026-11-08 the last complete year on the site is 2026, published through December.
 * Pages exist back to 2018.
 */
const fromYear = Number(process.argv[2] ?? 2022);
const toYear = Number(process.argv[3] ?? 2026);

/** Lines that are purely astrological codes, which are not observances. */
const CODE_LINE = /^(?:[A-Z]{1,4}(?:-[A-Z]{2})?)(?:\s+[A-Z]{1,4}(?:-[A-Z]{2})?)*$/;

/** The elemental yoga: FD- or UD- plus the two element letters. */
const YOGA = /^(?:FD|UD)-[EWFA]{2}$/;

/**
 * Any hyphenated code. FPMT prints one per day, on its own line: the yoga, or on 2022-07-11 the
 * misprint `ED-EW` in its place. Only the yoga shape goes to `dayQuality`; anything else in that
 * slot is kept in `codes`, as printed.
 */
const YOGA_SLOT = /^[A-Z]{1,4}-[A-Z]{2}$/;

/**
 * Codes every page's key has carried since 2022. A key that parses without them has not parsed,
 * and must stop the run rather than make every code look unknown — or, worse, none.
 */
const KNOWN_KEY_CODES = ["B", "GCH", "NCH", "PF", "PP", "UD", "VUD"];

/**
 * The only codes allowed outside the key: FPMT's own misprints, recorded as printed. Each states
 * the day it expects to find the misprint on, and the run refuses if the page no longer carries
 * it, so an entry that stops being needed fails loudly instead of lingering as a licence.
 */
const KNOWN_MISPRINTS = [
	{ iso: "2022-05-31", code: "NPG", likely: "NPF" },
	{ iso: "2022-07-11", code: "ED-EW", likely: "FD-EW" },
];

/** The two moon icons, by their `alt` text. Any other image in a day cell stops the run. */
const MOON_ALT = { "Full Moon": "full", "New Moon": "new" };

/** Which `KNOWN_MISPRINTS` entries the pages actually carried; checked once every page is read. */
const misprintsSeen = new Set();

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

/** The codes the page's own KEY defines, read from below the calendar table. */
function parseKey(html, tableEnd, url) {
	const start = html.slice(tableEnd).search(/<strong>\s*KEY\s*<\/strong>/i);
	if (start < 0) throw new Error(`${url}: no KEY below the calendar table`);
	const key = new Set(
		[...html.slice(tableEnd + start).matchAll(/<p>\s*<strong>([^<]+)<\/strong>/gi)].map((m) =>
			tidy(m[1]),
		),
	);
	const missing = KNOWN_KEY_CODES.filter((code) => !key.has(code));
	if (missing.length > 0)
		throw new Error(`${url}: the KEY parsed without ${missing.join(", ")}, so it has not parsed`);
	return key;
}

function parseMonth(year, monthIndex, html, url) {
	const table = /<TABLE id="cal_table"[\s\S]*?<\/TABLE>/i.exec(html);
	if (table === null) throw new Error(`no cal_table in ${url}`);
	const key = parseKey(html, table.index + table[0].length, url);

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
	let moonIcons = 0;

	for (const cell of cells) {
		const gregorian = /<span class="h1_bold">(\d+)<\/span>/i.exec(cell);
		const tibetan = /tibetan_date"><I>\s*(\d+)\s*<\/I>/i.exec(cell);
		if (gregorian === null) continue;
		if (tibetan === null) throw new Error(`cell with no Tibetan day in ${url}`);

		const day = Number(tibetan[1]);
		// The day number resets at a month boundary; that is the only signal the cells carry.
		if (day < previousDay) spanIndex += 1;
		previousDay = day;
		const iso = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(Number(gregorian[1])).padStart(2, "0")}`;

		// FPMT marks the full and new moon with an icon in the cell. It is an icon, not a moon:
		// some doubled dates carry one on both halves.
		const images = [...cell.matchAll(/<img\b[^>]*>/gi)].map(
			(m) => /\balt="([^"]*)"/i.exec(m[0])?.[1],
		);
		const unknownImage = images.find((alt) => !Object.hasOwn(MOON_ALT, alt ?? ""));
		if (unknownImage !== undefined || images.includes(undefined))
			throw new Error(
				`${url}: ${iso} carries an image that is not a moon icon (alt ${unknownImage === undefined ? "missing" : `"${unknownImage}"`})`,
			);
		if (images.length > 1) throw new Error(`${url}: ${iso} carries ${images.length} moon icons`);
		const moon = images.length === 1 ? MOON_ALT[images[0]] : undefined;
		if (moon !== undefined) moonIcons += 1;

		// `B` (Buddha days) is the only code FPMT prints in bold. If anything else is ever bolded
		// the emphasis may mean something, so stop and find out rather than lose it.
		for (const bold of cell.matchAll(/<strong>([\s\S]*?)<\/strong>/gi))
			if (tidy(bold[1]) !== "B")
				throw new Error(`${url}: ${iso} prints "${tidy(bold[1])}" in bold`);

		// Everything that is not a line of astrological codes is an observance label. FPMT
		// italicises the ones it treats as headline entries — the great holy days, but also
		// teacher anniversaries such as Lama Tsong Khapa and Lama Zopa Rinpoche's birthday — so
		// `major` records the emphasis, not a claim that the day is a duchen.
		const afterHeader = cell.slice(cell.indexOf("</div>") + 6);
		const labels = [];
		let major = false;
		let dayQuality;
		const codes = [];
		let codeLines = 0;
		let slotFilled = false;
		for (const raw of afterHeader.split(/<br\s*\/?>/i)) {
			const text = tidy(raw);
			if (text === "") continue;
			if (CODE_LINE.test(text)) {
				// The elemental yoga, captured rather than discarded. FPMT prints exactly one FD-/UD-
				// code per day, and it names the unordered pair of the weekday's element and the lunar
				// mansion's — E earth, W water, F fire, A air, air being Janson's wind. It is the only
				// external witness this package has for the mansion arithmetic.
				const tokens = text.split(" ");
				for (const slot of tokens.filter((token) => YOGA_SLOT.test(token))) {
					if (slotFilled) throw new Error(`${url}: ${iso} carries two hyphenated codes`);
					slotFilled = true;
					if (YOGA.test(slot)) dayQuality = slot;
				}
				if (tokens.some((token) => !YOGA_SLOT.test(token))) {
					codeLines += 1;
					if (codeLines > 1) throw new Error(`${url}: ${iso} carries two lines of codes`);
				}
				// Every other code is the almanac's advice for the day, kept verbatim. A misprint stays
				// as printed: this fixture records what FPMT published, and does not correct it.
				const advice = tokens.filter((token) => !YOGA.test(token));
				if (advice.length === 0) continue;
				for (const code of advice) {
					if (key.has(code)) continue;
					const misprint = KNOWN_MISPRINTS.find((m) => m.iso === iso && m.code === code);
					if (misprint === undefined)
						throw new Error(
							`${url}: ${iso} carries "${code}", which the page's KEY does not define`,
						);
					misprintsSeen.add(misprint);
				}
				if (advice.includes("B") && !/<strong>\s*B\s*<\/strong>/i.test(raw))
					throw new Error(`${url}: ${iso} prints B without bold`);
				codes.push(...advice);
				continue;
			}
			// A line of codes FPMT changes in a way `CODE_LINE` no longer matches — a five-letter code,
			// say — would otherwise become an observance label in silence, where the key check cannot
			// see it, since that runs only on lines already matched. No label in 2022-2025 is written
			// in capitals alone, so this costs nothing and closes the one direction a code can be lost.
			if (!/[a-z]/.test(text))
				throw new Error(`${url}: ${iso} has "${text}" as a label, but it is written in capitals`);
			if (/<em[^>]*>/i.test(raw)) major = true;
			labels.push(text);
		}

		rows.push({
			iso,
			month: span[spanIndex].month,
			day,
			isLeapMonth: span[spanIndex].isLeapMonth,
			labels,
			major,
			dayQuality,
			codes,
			moon,
		});
	}

	// Every Gregorian month holds at least one full or new moon. A page with no icon at all means
	// the icon is no longer being recognised — which the tests would otherwise report as the
	// engine disagreeing with FPMT, not as a broken parser.
	if (moonIcons === 0) throw new Error(`${url}: no moon icon on the page`);

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

const inRange = KNOWN_MISPRINTS.filter((m) => {
	const year = Number(m.iso.slice(0, 4));
	return year >= fromYear && year <= toYear;
});
for (const misprint of inRange)
	if (!misprintsSeen.has(misprint))
		throw new Error(
			`the known misprint "${misprint.code}" is no longer an unknown code on ${misprint.iso}: ` +
				`FPMT has corrected it, or has added it to the page's KEY. Remove it from KNOWN_MISPRINTS.`,
		);

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
		const quality = r.dayQuality ? `, dayQuality: "${r.dayQuality}"` : "";
		const codes = r.codes.length > 0 ? `, codes: [${r.codes.map((c) => `"${c}"`).join(", ")}]` : "";
		const moon = r.moon ? `, moon: "${r.moon}"` : "";
		const tail = flags.length > 0 ? `, ${flags.join(", ")}` : "";
		return `\t{ iso: "${r.iso}", month: ${r.month}, day: ${r.day}${tail}${quality}${codes}${moon}${labels} },`;
	})
	.join("\n");

const doubled = all.filter((r) => r.isDoubledDay).length;
const leapMonthDays = all.filter((r) => r.isLeapMonth).length;
const withLabels = all.filter((r) => r.labels.length > 0).length;
const withCodes = all.filter((r) => r.codes.length > 0).length;
const fullIcons = all.filter((r) => r.moon === "full").length;
const newIcons = all.filter((r) => r.moon === "new").length;
const misprintList = inRange.map((m) => `\\\`${m.code}\\\` on ${m.iso}`).join(" and ");

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
 * Covers ${all.length} consecutive days: ${doubled} doubled, ${leapMonthDays} in leap months,
 * ${withLabels} carrying at least one observance label, and ${withCodes} carrying advice codes. FPMT prints
 * ${fullIcons} full-moon and ${newIcons} new-moon icons over them. Skipped dates are absent by construction —
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
	/**
	 * FPMT's day-quality code — the elemental yoga, as FD- or UD- plus two element letters.
	 *
	 * E earth, W water, F fire, A air; air is Janson's *wind*. The code names the **unordered pair**
	 * of the weekday's element and the lunar mansion's, so with the weekday element known the
	 * mansion's is forced — which is what makes this the only external check the mansion arithmetic
	 * has. Omitted on the few days FPMT prints no yoga code, or a misprinted one, which is kept in
	 * \\\`codes\\\`.
	 */
	dayQuality?: string;
	/**
	 * FPMT's advice codes for the day — \\\`GCH NB NMP NPF B\\\` and the like — verbatim and in page
	 * order, each defined in the key below every month's table. The yoga code is not among them;
	 * it is \\\`dayQuality\\\`. Omitted where there are none. Misprints are kept as printed:
	 * ${misprintList}.
	 */
	codes?: readonly string[];
	/**
	 * The moon icon FPMT prints in the day's cell. This records an **icon**, not a moon: FPMT
	 * marks both halves of some doubled dates, so icons outnumber moons. Omitted where there is none.
	 */
	moon?: "full" | "new";
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
