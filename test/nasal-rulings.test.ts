import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

interface Ruling {
	rule: unknown;
	shipped: unknown;
	disposition: unknown;
	ruling: unknown;
}

const root = join(import.meta.dirname, "..");
const rulings = JSON.parse(
	readFileSync(join(root, "scripts", "nasal-rulings.data.json"), "utf8"),
) as Record<string, Ruling>;
const boundaries = JSON.parse(
	readFileSync(join(root, "scripts", "word-boundaries.data.json"), "utf8"),
) as Record<string, { marked: string }>;

function tsFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return tsFiles(path);
		return entry.name.endsWith(".ts") ? [path] : [];
	});
}

function scanShipped(): {
	fromField: Set<string>;
	fromCall: Set<string>;
	phonetics: Map<string, Set<string>>;
} {
	const fromField = new Set<string>();
	const fromCall = new Set<string>();
	const phonetics = new Map<string, Set<string>>();
	const remember = (wylie: string, phonetic: string) => {
		const seen = phonetics.get(wylie) ?? new Set<string>();
		seen.add(phonetic);
		phonetics.set(wylie, seen);
	};
	for (const file of tsFiles(join(root, "src"))) {
		const text = readFileSync(file, "utf8");
		for (const m of text.matchAll(/wylie: "([^"]+)"/g)) fromField.add(m[1] as string);
		for (const m of text.matchAll(/wylie: "([^"]+)",\s*phonetic: "([^"]+)"/g))
			remember(m[1] as string, m[2] as string);
		for (const m of text.matchAll(/tibetan\("[^"]+", "([^"]+)", "([^"]+)"\)/g)) {
			fromCall.add(m[1] as string);
			remember(m[1] as string, m[2] as string);
		}
	}
	return { fromField, fromCall, phonetics };
}

const syllables = (wylie: string) => wylie.split(" ").filter((s) => s !== "");

// The three shapes repeat THL's three `middle_nasals` rules (1 a-chung prefix, 2 `m` prefix, 3 `ld`/`lt`/`lj`/`zl`),
// so a fourth rule added by THL would go unseen here; scripts/evidence/thl-middle-nasals/ says where to re-read them.
function junctionRule(next: string): 1 | 2 | 3 | null {
	if (next.length >= 2 && next.startsWith("'") && !"aeiou".includes(next.charAt(1))) return 1;
	if (next.length >= 2 && next.startsWith("m") && !"aeiouyrl".includes(next.charAt(1))) return 2;
	if (/^(ld|lt|lj|zl)/.test(next)) return 3;
	return null;
}

function junctionsOf(wylie: string): number[] {
	const marked = boundaries[wylie]?.marked ?? wylie;
	const found: number[] = [];
	for (const word of marked.split("-")) {
		const parts = syllables(word);
		for (let i = 1; i < parts.length; i++) {
			const rule = junctionRule(parts[i] as string);
			if (rule !== null) found.push(rule);
		}
	}
	return found;
}

const CORRECTED_KEYS = ["lha mtshams", "mi mthun", "'phel 'gyur", "stobs ldan", "khyu mchog"];
const EARLIER_KEYS = ["cho 'phrul dus chen", "chos 'khor dus chen", "bdud 'joms rin po che"];

describe("nasal rulings", () => {
	const { fromField, fromCall, phonetics } = scanShipped();
	const shipped = new Set([...fromField, ...fromCall]);
	const junctionNames = [...shipped].filter(
		(w) => syllables(w).length >= 2 && junctionsOf(w).length > 0,
	);

	it("finds the junction names through both regex shapes", () => {
		expect(fromField.has("lha mtshams")).toBe(true);
		expect(fromField.has("bdud 'joms rin po che")).toBe(true);
		expect(fromCall.has("dpyid zla ra ba")).toBe(true);
		expect(junctionsOf("khyu mchog")).toEqual([2]);
		expect(junctionsOf("rnam 'gyur")).toEqual([1]);
		expect(junctionsOf("stobs ldan")).toEqual([3]);
		// A junction at the start of a word is between words, not inside one.
		expect(junctionsOf("sa ga zla ba dus chen")).toEqual([]);
		// Measured on 2026-11-15: 28 distinct names with a nasal junction inside a word.
		// Re-measure, do not edit blindly, when a name is added to src/.
		expect(junctionNames).toHaveLength(28);
	});

	it("every shipped name with a junction has a ruling", () => {
		const missing = junctionNames.filter((w) => !(w in rulings));
		expect(missing).toEqual([]);
	});

	it("every ruling names a shipped name with a junction", () => {
		const stale = Object.keys(rulings).filter((key) => !junctionNames.includes(key));
		expect(stale).toEqual([]);
	});

	it("each ruling's rule is the one its junction meets", () => {
		const wrong = Object.entries(rulings)
			.filter(([key, row]) => !junctionsOf(key).includes(row.rule as number))
			.map(([key]) => key);
		expect(wrong).toEqual([]);
	});

	it("each ruling's shipped phonetic is the one in src/", () => {
		const wrong = Object.entries(rulings)
			.filter(([key]) => junctionNames.includes(key))
			.filter(([key, row]) => {
				const seen = phonetics.get(key);
				return !(seen !== undefined && seen.size === 1 && seen.has(row.shipped as string));
			})
			.map(([key]) => key);
		expect(wrong).toEqual([]);
	});

	it("every disposition is thl or corrected", () => {
		const bad = Object.entries(rulings)
			.filter(([, row]) => row.disposition !== "thl" && row.disposition !== "corrected")
			.map(([key]) => key);
		expect(bad).toEqual([]);
	});

	it("the corrected rows are exactly the five", () => {
		const corrected = Object.entries(rulings)
			.filter(([, row]) => row.disposition === "corrected")
			.map(([key]) => key);
		expect([...corrected].sort()).toEqual([...CORRECTED_KEYS].sort());
	});

	it("pins each row's ruling string", () => {
		const wrong = Object.entries(rulings)
			.filter(([key, row]) => {
				const want = EARLIER_KEYS.includes(key) ? "Andreas, 2026-11-11" : "Andreas, 2026-11-15";
				return row.ruling !== want;
			})
			.map(([key]) => key);
		expect(wrong).toEqual([]);
		expect(EARLIER_KEYS.filter((key) => !(key in rulings))).toEqual([]);
	});
});
