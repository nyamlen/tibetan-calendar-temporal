import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

interface GateException {
	word: unknown;
	evidence: unknown;
	requires: unknown;
}

interface Row {
	marked: string;
	ruling?: string | null;
	gateException?: GateException;
}

const root = join(import.meta.dirname, "..");
const rows = JSON.parse(
	readFileSync(join(root, "scripts", "word-boundaries.data.json"), "utf8"),
) as Record<string, Row>;

function tsFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return tsFiles(path);
		return entry.name.endsWith(".ts") ? [path] : [];
	});
}

function scanShipped(): { fromField: Set<string>; fromCall: Set<string> } {
	const fromField = new Set<string>();
	const fromCall = new Set<string>();
	for (const file of tsFiles(join(root, "src"))) {
		const text = readFileSync(file, "utf8");
		for (const m of text.matchAll(/wylie: "([^"]+)"/g)) fromField.add(m[1] as string);
		for (const m of text.matchAll(/tibetan\(\s*"[^"]+",\s*"([^"]+)",\s*"[^"]+",?\s*\)/g))
			fromCall.add(m[1] as string);
	}
	return { fromField, fromCall };
}

const syllables = (wylie: string) => wylie.split(" ").filter((s) => s !== "");

const OBSERVANCE_KEYS = [
	"cho 'phrul dus chen",
	"sa ga zla ba dus chen",
	"chos 'khor dus chen",
	"lha babs dus chen",
	"mi la ras pa",
	"gu ru rin po che",
	"sgam po pa",
	"rgyal dbang karma pa bcu drug pa",
	"rje tsong kha pa",
	"sa skya paN+Di ta",
	"bdud 'joms rin po che",
	"sa ga zla ba",
];

const EXCEPTION_KEYS = [
	"dus kyi pho nya",
	"ston zla ra ba",
	"ston zla 'bring po",
	"ston zla tha chung",
	"lha babs dus chen",
	"gso thub",
];

describe("word boundaries", () => {
	const { fromField, fromCall } = scanShipped();
	const shipped = new Set([...fromField, ...fromCall]);

	it("finds the shipped Wylie through both regex shapes", () => {
		expect(fromField.has("gso thub")).toBe(true);
		expect(fromField.has("gu ru rin po che")).toBe(true);
		expect(fromCall.has("dpyid zla ra ba")).toBe(true);
		expect(fromCall.has("nag pa")).toBe(true);
		// Measured on 2026-11-15: 123 distinct names of two or more syllables.
		// Re-measure, do not edit blindly, when a name is added to src/.
		expect([...shipped].filter((w) => syllables(w).length >= 2)).toHaveLength(123);
	});

	it("every shipped name of three or more syllables has a boundary row", () => {
		const missing = [...shipped].filter((w) => syllables(w).length >= 3 && !(w in rows));
		expect(missing).toEqual([]);
	});

	it("every boundary row names a shipped Wylie", () => {
		const stale = Object.keys(rows).filter((key) => !shipped.has(key));
		expect(stale).toEqual([]);
	});

	it("every marking unmarks to its key and has no empty word", () => {
		const bad = Object.entries(rows)
			.filter(([key, row]) => {
				const words = row.marked.split("-");
				const wellFormed = words.every((w) => w !== "" && w === syllables(w).join(" "));
				return !wellFormed || row.marked.replaceAll("-", " ") !== key;
			})
			.map(([key]) => key);
		expect(bad).toEqual([]);
	});

	it("every row carries a ruling", () => {
		const unruled = Object.entries(rows)
			.filter(([, row]) => !(typeof row.ruling === "string" && row.ruling.length > 0))
			.map(([key]) => key);
		expect(unruled).toEqual([]);
	});

	it("pins each row's ruling date", () => {
		const wrong = Object.entries(rows)
			.filter(([key, row]) => {
				const want = OBSERVANCE_KEYS.includes(key) ? "Andreas, 2026-11-11" : "Andreas, 2026-11-15";
				return row.ruling !== want;
			})
			.map(([key]) => key);
		expect(wrong).toEqual([]);
		expect(OBSERVANCE_KEYS.filter((key) => !(key in rows))).toEqual([]);
	});

	it("a two-syllable row exists only to carry a gateException", () => {
		const bare = Object.entries(rows)
			.filter(([key, row]) => syllables(key).length < 3 && row.gateException === undefined)
			.map(([key]) => key);
		expect(bare).toEqual([]);
		const hyphenated = Object.entries(rows)
			.filter(([key, row]) => syllables(key).length === 2 && row.marked.includes("-"))
			.map(([key]) => key);
		expect(hyphenated).toEqual([]);
	});

	it("pins the rows that carry a gateException, and their shape", () => {
		const carrying = Object.entries(rows)
			.filter(([, row]) => row.gateException !== undefined)
			.map(([key]) => key);
		expect([...carrying].sort()).toEqual([...EXCEPTION_KEYS].sort());

		const malformed = Object.entries(rows)
			.filter(([, row]) => row.gateException !== undefined)
			.filter(([, row]) => {
				const ex = row.gateException as GateException;
				const requiresOk =
					Array.isArray(ex.requires) &&
					ex.requires.length > 0 &&
					ex.requires.every(
						(r) =>
							r !== null &&
							typeof r === "object" &&
							typeof (r as { dictionary?: unknown }).dictionary === "string" &&
							typeof (r as { headword?: unknown }).headword === "string",
					);
				const evidenceOk = typeof ex.evidence === "string" && ex.evidence !== "";
				const wordOk = typeof ex.word === "string" && row.marked.split("-").includes(ex.word);
				return !(requiresOk && evidenceOk && wordOk);
			})
			.map(([key]) => key);
		expect(malformed).toEqual([]);
	});

	it("pins the approved observance boundaries", () => {
		const marked = (key: string) => rows[key]?.marked;
		expect(marked("sa ga zla ba dus chen")).toBe("sa ga-zla ba-dus chen");
		expect(marked("sa ga zla ba")).toBe("sa ga-zla ba");
		expect(marked("rje tsong kha pa")).toBe("rje-tsong kha pa");
		expect(marked("gu ru rin po che")).toBe("gu ru-rin po che");
	});
});
