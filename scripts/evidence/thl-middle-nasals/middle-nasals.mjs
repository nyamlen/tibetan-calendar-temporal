// Which shipped multi-syllable names meet THL's three `middle_nasals` rules inside a word, and does
// `scripts/nasal-rulings.data.json` hold a ruling for each? Read-only: reads `src/`, the boundary
// file and the rulings file, prints, and exits 1 if a junction name has no ruling or a ruling names
// a different rule.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("../../../", import.meta.url));
const read = (path) => readFileSync(`${repo}${path}`, "utf8");
const files = [
	"src/names.ts",
	"src/rabjung-names.ts",
	"src/month-names.ts",
	"src/astrology/mansion-names.ts",
	"src/astrology/yoga.ts",
	"src/observances/example-observances.ts",
];
const names = new Map();
for (const f of files) {
	const t = read(f);
	for (const m of t.matchAll(/wylie: "([^"]+)",\s*phonetic: "([^"]+)"/g)) names.set(m[1], m[2]);
	for (const m of t.matchAll(/tibetan\("[^"]+", "([^"]+)", "([^"]+)"\)/g)) names.set(m[1], m[2]);
}
const boundaries = JSON.parse(read("scripts/word-boundaries.data.json"));
const rulings = JSON.parse(read("scripts/nasal-rulings.data.json"));
const wordsOf = (w) => (boundaries[w]?.marked ?? w).split("-");

const RULES = {
	1: "a-chung prefix: the previous final is replaced by n (m before b or ph)",
	2: "m prefix: the previous syllable gains an m suffix unless it already ends in m, n or ng",
	3: "ld, lt, lj or zl: the previous syllable gains an n suffix unless it already ends in a nasal",
};
const ruleOf = (next) => {
	if (/^'[^aeiou]/.test(next)) return 1;
	if (/^m(?![aeiouy])/.test(next) && !/^m(y|r|l)/.test(next)) return 2;
	if (/^l[dtj]/.test(next) || /^zl/.test(next)) return 3;
	return null;
};

const junctions = new Map();
for (const [wylie, shipped] of names) {
	if (wylie.split(" ").length < 2) continue;
	for (const word of wordsOf(wylie)) {
		const syl = word.split(" ");
		for (let i = 1; i < syl.length; i++) {
			const rule = ruleOf(syl[i]);
			if (rule)
				junctions.set(`${wylie}|${syl[i - 1]} | ${syl[i]}`, {
					wylie,
					rule,
					shipped,
					at: `${syl[i - 1]} | ${syl[i]}`,
				});
		}
	}
}

const problems = [];
for (const { wylie, at, rule, shipped } of junctions.values()) {
	const row = rulings[wylie];
	const state = !row
		? "NO RULING"
		: row.rule !== rule
			? `RULING NAMES RULE ${row.rule}`
			: `${row.disposition}, ${row.ruling}`;
	if (!row || row.rule !== rule) problems.push(`${wylie}: ${state}`);
	console.log(
		`${wylie.padEnd(34)} ${at.padEnd(16)} rule ${rule}  shipped: ${shipped.padEnd(22)} ${state}`,
	);
}
const nameCount = new Set([...junctions.values()].map((j) => j.wylie)).size;
console.log(`\n${junctions.size} junctions in ${nameCount} names`);
for (const [rule, text] of Object.entries(RULES)) console.log(`rule ${rule}: ${text}`);
if (problems.length) {
	console.error(
		`\n${problems.length} junction(s) without a matching ruling:\n${problems.join("\n")}`,
	);
	process.exit(1);
}
console.log("every junction has a ruling that names its rule");
