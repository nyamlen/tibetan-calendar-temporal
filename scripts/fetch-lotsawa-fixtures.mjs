#!/usr/bin/env node
/**
 * Regenerates `test/fixtures/crosscheck-lotsawa.ts` from the Lotsawa House Phugpa calculator.
 *
 * Usage:
 *   node scripts/fetch-lotsawa-fixtures.mjs <path-to-raw.json>
 *
 * ## Obtaining the input
 *
 * The calculator renders client-side, so there is no endpoint to fetch. Open
 * <https://www.lotsawahouse.org/Static/tools/phugpa.html> and run this in the browser console:
 *
 * ```js
 * (() => {
 *   const extract = () => [...document.querySelectorAll('table')]
 *     .filter(t => /Tibetan Month/.test(t.rows[0]?.cells[0]?.innerText ?? ''))
 *     .map(t => {
 *       const head = t.rows[0].cells[0].innerText.trim();
 *       return {
 *         month: Number(/–\s*(\d+)(?:st|nd|rd|th) Tibetan Month/.exec(head)[1]),
 *         repeatedMonth: /\(\+\)/.test(head),
 *         rows: [...t.rows].slice(1).map(r => {
 *           const c = [...r.cells].map(x => x.innerText.trim());
 *           return { dayCell: c[2], weekday: c[3], date: c[4] };
 *         }),
 *       };
 *     });
 *   const input = document.querySelector('#year-input');
 *   const button = document.querySelector('#make-calendar');
 *   const out = {};
 *   for (const year of [2023, 2024, 2025, 2026, 2027]) {
 *     input.value = String(year);
 *     button.click();
 *     out[year] = extract();
 *   }
 *   copy(JSON.stringify(out));
 * })();
 * ```
 *
 * That is the same pattern as `extract-janson-fixtures.mjs`, which also takes an
 * externally-obtained file: the provenance is explicit, and the validation below makes silent
 * corruption fail loudly rather than quietly shrinking the fixture.
 *
 * If you drive the page with the Playwright MCP rather than by hand, **give `browser_evaluate` a
 * `filename` beginning `.playwright-mcp/`**. A bare filename resolves against the repository
 * root and drops the dump in the working tree; `.playwright-mcp/` is gitignored. Absolute paths
 * elsewhere are rejected outright — the server confines writes to its allowed roots, which
 * default to the directory the session started in.
 *
 * ## Clean-room boundary
 *
 * This reads the rendered **output** of the calculator. Its calendar library is never opened.
 * Computed dates are facts, not copyrightable expression. See CONTRIBUTING.md.
 *
 * ## Two conventions worth knowing
 *
 * - Lotsawa marks **both** months of a leap pair `(+)`, flagging "this number occurs twice"
 *   rather than "this is the leap month". The leap month is the first of the pair, which is
 *   this package's convention and christian-steinert's too.
 * - In the day column, `*` marks the day *after* a skipped number and `+` marks a doubled day.
 *   Only the number itself is used here; the markers are re-derived and cross-checked.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { formatRow } from "./fixture-row.mjs";

const source = process.argv[2];
if (!source) {
	console.error("usage: node scripts/fetch-lotsawa-fixtures.mjs <path-to-raw.json>");
	process.exit(1);
}

const raw = JSON.parse(readFileSync(source, "utf8"));

const MONTHS = {
	Jan: 1,
	Feb: 2,
	Mar: 3,
	Apr: 4,
	May: 5,
	Jun: 6,
	Jul: 7,
	Aug: 8,
	Sep: 9,
	Oct: 10,
	Nov: 11,
	Dec: 12,
};
const pad = (n) => String(n).padStart(2, "0");

const rows = [];

for (const tibetanYear of Object.keys(raw).map(Number).sort()) {
	const months = raw[tibetanYear];

	// A leap pair shares a number; the first of the two is the leap month.
	const seen = new Set();
	const leapFlags = months.map((m) => {
		const isFirstOfPair =
			m.repeatedMonth && !seen.has(m.month) && months.filter((x) => x.month === m.month).length > 1;
		seen.add(m.month);
		return isFirstOfPair;
	});

	// A Tibetan year opens at Losar in Feb or Mar and runs into Jan or Feb of the next Gregorian
	// year, so the Gregorian year advances once, at the Dec->Jan wrap.
	let gregorian = tibetanYear;
	let previousGregorianMonth = 0;

	months.forEach((m, index) => {
		for (const r of m.rows) {
			const parsed = /^([A-Z][a-z]{2}) (\d{1,2})$/.exec(r.date);
			if (!parsed) throw new Error(`unparseable date cell ${JSON.stringify(r.date)}`);
			const gregorianMonth = MONTHS[parsed[1]];
			if (gregorianMonth === undefined) throw new Error(`unknown month ${parsed[1]}`);
			if (gregorianMonth < previousGregorianMonth) gregorian += 1;
			previousGregorianMonth = gregorianMonth;

			const dayNumber = Number(/^(\d{1,2})/.exec(r.dayCell)?.[1]);
			if (!Number.isInteger(dayNumber)) throw new Error(`unparseable day cell ${r.dayCell}`);

			rows.push({
				iso: `${gregorian}-${pad(gregorianMonth)}-${pad(Number(parsed[2]))}`,
				month: m.month,
				day: dayNumber,
				isLeapMonth: leapFlags[index],
				doubledMarker: /\+/.test(r.dayCell),
			});
		}
	});
}

rows.sort((a, b) => a.iso.localeCompare(b.iso));

// Every calendar day must appear exactly once, with no gaps: skipped Tibetan *dates* have no
// calendar day, but no calendar day is ever missing. A break here means the year reconstruction
// went wrong, which is the one failure mode that would otherwise be invisible.
for (let i = 1; i < rows.length; i++) {
	const previous = Temporal.PlainDate.from(rows[i - 1].iso);
	const current = Temporal.PlainDate.from(rows[i].iso);
	const gap = current.since(previous).days;
	if (gap !== 1) throw new Error(`${rows[i - 1].iso} -> ${rows[i].iso} is a gap of ${gap} days`);
}

// Re-derive the doubled flags from the numbering and check them against Lotsawa's own markers.
const enriched = rows.map((r, i) => {
	const previous = rows[i - 1];
	const next = rows[i + 1];
	const sameAsPrevious =
		previous !== undefined &&
		previous.day === r.day &&
		previous.month === r.month &&
		previous.isLeapMonth === r.isLeapMonth;
	const sameAsNext =
		next !== undefined &&
		next.day === r.day &&
		next.month === r.month &&
		next.isLeapMonth === r.isLeapMonth;
	return {
		iso: r.iso,
		month: r.month,
		day: r.day,
		isLeapMonth: r.isLeapMonth,
		isDoubledDay: sameAsPrevious || sameAsNext,
		isLeapDay: sameAsNext && !sameAsPrevious,
		marker: r.doubledMarker,
	};
});

const markerDisagreements = enriched.filter((r) => r.isDoubledDay !== r.marker);
if (markerDisagreements.length > 0) {
	throw new Error(
		`derived doubled-day flags disagree with the page's own "+" markers on ` +
			`${markerDisagreements.length} days, e.g. ${markerDisagreements[0].iso}`,
	);
}

// Shares the row formatter with the Steinert generator so both fixtures stay identical in shape
// and inside the 100-column formatter limit. See the note there on why false flags are omitted.
const body = enriched.map(formatRow).join("\n");

const doubled = enriched.filter((r) => r.isDoubledDay).length;
const leapMonthDays = enriched.filter((r) => r.isLeapMonth).length;

const out = `/**
 * Day-by-day Tibetan dates from the Lotsawa House Phugpa calculator, ${enriched[0].iso} to
 * ${enriched.at(-1).iso}.
 *
 * An independent implementation built directly on Janson, and one that follows the **almanac**
 * value of the lunar anomaly's daily increment — verified against his three divergence dates.
 * See docs/decisions/2026-08-12-lunar-anomaly-a2-default.md.
 *
 * @remarks
 * GENERATED by \`scripts/fetch-lotsawa-fixtures.mjs\`. Do not edit by hand — re-run the script.
 *
 * Computed dates are facts rather than copyrightable expression, which is what makes them usable
 * under this project's clean-room constraint. The upstream calendar library is never read.
 *
 * Covers ${enriched.length} consecutive days, of which ${doubled} are doubled and
 * ${leapMonthDays} fall in a leap month. Skipped dates are absent by construction: they name no
 * calendar day, so the calculator prints no row for them.
 */
import type { CrosscheckRow } from "./crosscheck-steinert.js";

export const LOTSAWA_DATES: readonly CrosscheckRow[] = [
${body}
];
`;

const target = join(
	dirname(fileURLToPath(import.meta.url)),
	"..",
	"test",
	"fixtures",
	"crosscheck-lotsawa.ts",
);
writeFileSync(target, out);
process.stderr.write(
	`wrote ${enriched.length} days to ${target} (${doubled} doubled, ${leapMonthDays} in leap months)\n`,
);
