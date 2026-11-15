import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

interface Row {
	marked: string;
	ruling?: string | null;
	gateException?: unknown;
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

function shippedWylie(): Set<string> {
	const found = new Set<string>();
	for (const file of tsFiles(join(root, "src"))) {
		const text = readFileSync(file, "utf8");
		for (const m of text.matchAll(/wylie: "([^"]+)"/g)) found.add(m[1] as string);
		for (const m of text.matchAll(/tibetan\("[^"]+", "([^"]+)", "[^"]+"\)/g))
			found.add(m[1] as string);
	}
	return found;
}

const syllables = (wylie: string) => wylie.split(" ").filter((s) => s !== "");

describe("word boundaries", () => {
	const shipped = shippedWylie();

	it("finds the shipped Wylie", () => {
		expect(shipped.size).toBeGreaterThan(100);
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

	it("a two-syllable row exists only to carry a gateException", () => {
		const bare = Object.entries(rows)
			.filter(([key, row]) => syllables(key).length < 3 && row.gateException === undefined)
			.map(([key]) => key);
		expect(bare).toEqual([]);
	});

	it("pins the approved observance boundaries", () => {
		const marked = (key: string) => rows[key]?.marked;
		expect(marked("sa ga zla ba dus chen")).toBe("sa ga-zla ba-dus chen");
		expect(marked("sa ga zla ba")).toBe("sa ga-zla ba");
		expect(marked("rje tsong kha pa")).toBe("rje-tsong kha pa");
		expect(marked("gu ru rin po che")).toBe("gu ru-rin po che");
	});
});
