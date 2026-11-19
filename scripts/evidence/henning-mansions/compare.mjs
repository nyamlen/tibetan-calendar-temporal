// node compare.mjs <dir>
// Compares Henning's daily Phugpa calendars (recorded by fetch.mjs into <dir>) with this engine's
// lunar mansion and with FPMT's day-quality codes, over the days docs/why-trust-these-dates.md
// names. Imports the built dist/, so run `npm run build` first. Exits non-zero unless every
// expectation below holds.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const load = (path) => import(pathToFileURL(join(repo, path)).href);
const { isoToTibetan, weekdayNameFor, PHUGPA } = await load("dist/index.js");
const { lunarMansionFor, LUNAR_MANSIONS } = await load("dist/astrology/index.js");
// Node strips the fixture's erasable types on import.
const { FPMT_OBSERVANCES } = await load("test/fixtures/fpmt-observances.ts");

const dir = process.argv[2];
if (dir === undefined) {
	console.error("usage: node compare.mjs <dir>");
	process.exit(2);
}

// --- Henning's day lines: `N: Day. <mansion>. <WeekdayElement>-<MansionElement>; D Mon YYYY` ---
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
const DAY_LINE = /^\d+: \w{3}\. ([^.]+)\. (\w+)-(\w+); (\d{1,2}) (\w{3}) (\d{4})\s*$/;
const henning = new Map();
for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
	const { text } = JSON.parse(readFileSync(join(dir, file), "utf8"));
	for (const line of text.split(/\r?\n/)) {
		const m = DAY_LINE.exec(line);
		if (m === null) continue;
		const [, mansion, , mansionElement, day, month, year] = m;
		const iso = `${year}-${String(MONTHS[month]).padStart(2, "0")}-${day.padStart(2, "0")}`;
		henning.set(iso, { mansion: mansion.trim(), element: mansionElement.toLowerCase() });
	}
}

// --- Henning's spelling -> LUNAR_MANSIONS index, checked to be a bijection over the names that occur ---
// Most names are this package's Wylie as printed; the overrides are Henning's spellings that differ.
// Henning prints Śravaṇā as `gro zhin`, dropping the prefix of `gro bzhin` (index 21).
const OVERRIDES = { "gro zhin": 21 };
const byWylie = new Map(LUNAR_MANSIONS.map((m) => [m.tibetanName.wylie, m.index]));
const indexOf = (name) => OVERRIDES[name] ?? byWylie.get(name);
const occurring = [...new Set([...henning.values()].map((h) => h.mansion))].sort();
const unmapped = occurring.filter((name) => indexOf(name) === undefined);
const targets = occurring.map(indexOf).filter((i) => i !== undefined);
const failures = [];
if (unmapped.length > 0) failures.push(`unmapped Henning mansion names: ${unmapped.join(", ")}`);
if (new Set(targets).size !== targets.length) failures.push("two Henning names map to one mansion");

// --- The days the shipped sentence names: FPMT's coded days whose pair contains the weekday's element ---
const LETTERS = { E: "earth", W: "water", F: "fire", A: "wind" };
const days = FPMT_OBSERVANCES.flatMap((row) => {
	if (!row.dayQuality) return [];
	const pair = row.dayQuality
		.slice(-2)
		.split("")
		.map((letter) => LETTERS[letter]);
	if (pair.some((element) => element === undefined)) return [];
	const date = isoToTibetan(Temporal.PlainDate.from(row.iso), PHUGPA);
	const weekday = weekdayNameFor(date.tibetanWeekday, PHUGPA).element;
	if (!pair.includes(weekday)) return [];
	const forced = [...pair];
	forced.splice(forced.indexOf(weekday), 1);
	return [{ iso: row.iso, forced: forced[0], engine: lunarMansionFor(date, PHUGPA) }];
});
if (days.length !== 1821) failures.push(`expected 1,821 days, selected ${days.length}`);

// (a) Henning's mansion against the engine's.
const missing = days.filter((d) => !henning.has(d.iso)).map((d) => d.iso);
if (missing.length > 0)
	failures.push(`Henning has no line for ${missing.length} days, first ${missing[0]}`);
const mansionDiffers = days
	.filter((d) => henning.has(d.iso) && indexOf(henning.get(d.iso).mansion) !== d.engine.index)
	.map((d) => d.iso);

// (b) where FPMT's forced element differs, from the engine's element and from Henning's.
const fpmtVsEngine = days.filter((d) => d.forced !== d.engine.element).map((d) => d.iso);
const fpmtVsHenning = days
	.filter((d) => henning.has(d.iso) && d.forced !== henning.get(d.iso).element)
	.map((d) => d.iso);
const sameSet =
	fpmtVsEngine.length === fpmtVsHenning.length &&
	fpmtVsEngine.every((iso, i) => iso === fpmtVsHenning[i]);

console.log(`days compared: ${days.length}`);
console.log(
	`Henning mansion names occurring: ${occurring.length}, mapped one to one: ${unmapped.length === 0}`,
);
console.log(`(a) Henning's mansion differs from the engine's on ${mansionDiffers.length} days`);
console.log(
	`(b) FPMT differs from the engine on ${fpmtVsEngine.length} days, from Henning on ${fpmtVsHenning.length}; same days: ${sameSet}`,
);

if (mansionDiffers.length !== 0)
	failures.push(
		`(a) expected 0, got ${mansionDiffers.length}: ${mansionDiffers.slice(0, 5).join(", ")}`,
	);
if (fpmtVsEngine.length !== 37)
	failures.push(`(b) expected 37 FPMT/engine differences, got ${fpmtVsEngine.length}`);
if (!sameSet) failures.push("(b) the FPMT/engine and FPMT/Henning sets differ");
if (failures.length > 0) {
	console.log(`FAIL\n${failures.join("\n")}`);
	process.exit(1);
}
console.log("PASS");
