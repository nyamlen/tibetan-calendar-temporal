#!/usr/bin/env node
/**
 * Regenerates `test/fixtures/rabten-sojong.ts` from Rabten Choeling's public calendar.
 *
 * Usage:
 *   node scripts/fetch-rabten-sojong.mjs
 *
 * ## What it parses
 *
 * The month view, `https://www.rabten.eu/en/calendar?view=months&y=YYYY&m=1`, which holds all
 * twelve months of the year. Every day is an anchor element, `<a ... d=YYYY-MM-DD" aria-label="...">`,
 * and a sojong day carries a `calTag is-soj` span whose text is "Sojong", or "Sojong 14" after a
 * 14-day fortnight. The markup is parsed, never a rendered or summarised reading of the page: a
 * summary would be exactly the kind of lossy reading this project's generators exist to avoid.
 *
 * Today's cell carries a further attribute after the label (`aria-current="date"`), so the opening
 * tag is matched to its closing `>` rather than to the label's closing quote: a pattern that stops at
 * the label silently drops today's day, which would be a missing sojong on the day it is fetched.
 *
 * Each page is checked to hold the year asked for. The calendar's day-level range is 2000-2100, and
 * it answers a year outside it with the nearest year inside, silently, so a page whose days are not
 * all in the requested year is an error rather than a duplicate year.
 *
 * ## Offline reruns
 *
 * `RABTEN_RECORD_DIR=<dir>` saves every fetched page there as `rabten-YYYY.html`;
 * `RABTEN_PAGES_DIR=<dir>` reads those saved pages instead of the network. Keep both directories
 * outside the repository: a page is Rabten's, not ours, and a mutation check of this generator
 * edits the saved page, never this file. The output path derives from this file's own location, so
 * to run a mutant copy this script into a scratch tree with its own `test/fixtures/`.
 *
 * Ran 2026-11-11 (see the fixture's header for the counts that run produced).
 *
 * ## Clean-room boundary
 *
 * This reads the published pages of a calendar, which are dates. Dates are facts. No source code is
 * read. Rabten states no method and its lineage is unknown.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FIRST_YEAR = 2000;
const LAST_YEAR = 2100;
const EXPECTED_DATES = 2490;
const EXPECTED_SOJONG_14 = 624;

const pagesDir = process.env.RABTEN_PAGES_DIR;
const recordDir = process.env.RABTEN_RECORD_DIR;
if (recordDir !== undefined) mkdirSync(recordDir, { recursive: true });

async function pageFor(year) {
	if (pagesDir !== undefined) return readFileSync(join(pagesDir, `rabten-${year}.html`), "utf8");
	const url = `https://www.rabten.eu/en/calendar?view=months&y=${year}&m=1`;
	const response = await fetch(url);
	if (!response.ok) throw new Error(`${url} answered ${response.status}`);
	const html = await response.text();
	if (recordDir !== undefined) writeFileSync(join(recordDir, `rabten-${year}.html`), html);
	return html;
}

const rows = [];
for (let year = FIRST_YEAR; year <= LAST_YEAR; year++) {
	const html = await pageFor(year);
	const days = new Set();
	for (const m of html.matchAll(
		/d=(\d{4}-\d{2}-\d{2})" aria-label="[^"]*"[^>]*>([\s\S]*?)<\/a>/g,
	)) {
		const [, iso, body] = m;
		if (!iso.startsWith(`${year}-`)) {
			throw new Error(
				`the page for ${year} holds a day of ${iso.slice(0, 4)}: the calendar answered a year ` +
					"outside its range with a neighbour",
			);
		}
		days.add(iso);
		const tag = body.match(/calTag is-soj">([^<]*)</)?.[1];
		if (tag === undefined) continue;
		const label = tag.trim();
		if (label !== "Sojong" && label !== "Sojong 14") {
			throw new Error(`${iso} carries an unrecognised sojong label ${JSON.stringify(label)}`);
		}
		rows.push({ iso, label });
	}
	if (days.size < 365) {
		throw new Error(`the page for ${year} holds ${days.size} days, fewer than a year`);
	}
}

rows.sort((a, b) => (a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : 0));
if (new Set(rows.map((r) => r.iso)).size !== rows.length) {
	throw new Error("a day is listed as a sojong twice");
}

const sojong14 = rows.filter((r) => r.label === "Sojong 14").length;
if (rows.length !== EXPECTED_DATES || sojong14 !== EXPECTED_SOJONG_14) {
	throw new Error(
		`expected ${EXPECTED_DATES} sojong dates with ${EXPECTED_SOJONG_14} labelled "Sojong 14", ` +
			`found ${rows.length} with ${sojong14}. Stop and report: the calendar may have changed.`,
	);
}

const body = rows.map((r) => `\t{ iso: "${r.iso}", label: "${r.label}" },`).join("\n");

const out = `/**
 * Rabten Choeling's sojong days, ${rows[0].iso} to ${rows.at(-1).iso}: ${rows.length} dates, ${sojong14} of them
 * labelled "Sojong 14".
 *
 * Rabten prints "Sojong 14" on a sojong that follows a 14-day fortnight and "Sojong" on one that
 * follows 15 days. Its day-level range is ${FIRST_YEAR}-${LAST_YEAR}, but its schedule is counted per Tibetan
 * year from the year's first anchor, the first month-1 full moon, so it prints nothing before
 * ${rows[0].iso}: the Tibetan year that opens in ${FIRST_YEAR} contributes only from there.
 *
 * Rabten states no method and its lineage is unknown.
 *
 * @remarks
 * GENERATED by \`scripts/fetch-rabten-sojong.mjs\`. Do not edit by hand — re-run the script.
 */
export interface RabtenSojongRow {
	readonly iso: string;
	readonly label: "Sojong" | "Sojong 14";
}

export const RABTEN_SOJONG: readonly RabtenSojongRow[] = [
${body}
];
`;

const here = dirname(fileURLToPath(import.meta.url));
const target = join(here, "..", "test", "fixtures", "rabten-sojong.ts");
if (!existsSync(dirname(target))) throw new Error(`no ${dirname(target)}`);
writeFileSync(target, out);
console.log(`wrote ${rows.length} dates (${sojong14} labelled "Sojong 14") to ${target}`);
