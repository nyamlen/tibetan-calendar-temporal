import { describe, expect, it } from "vitest";
import { linkProblems, shippedDocsOf } from "../scripts/shipped-links.ts";

// P1.1 and P1.2: `check-pack.mjs` link-checks the shipped docs. This holds its extractor to failing on
// each kind of dead link it claims to catch, and to passing what is not a link to a file.

const BLOB = "https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/";
const FILES: Record<string, "file" | "dir"> = {
	"docs/guide.md": "file",
	"docs/how-it-is-calculated.md": "file",
	docs: "dir",
};
const exists = (path: string) => FILES[path] ?? null;
const ships = (path: string) => path === "docs/guide.md";

describe("linkProblems", () => {
	it("reports a dead link of every form, and a directory target", () => {
		const text = [
			"[inline](docs/missing.md)",
			"[ref]: docs/also-missing.md",
			'<img src="docs/logo.png">',
			'<a href="docs/gone.md">gone</a>',
			"[all docs](docs/)",
		].join("\n");
		expect(linkProblems("README.md", text, exists, BLOB, ships)).toHaveLength(5);
	});

	it("passes a resolving link, a same-document fragment, another scheme and a fenced example", () => {
		const text = [
			"[guide](docs/guide.md#two-kinds-of-config)",
			"[below](#fragment)",
			"[mail](mailto:someone@example.org)",
			"[site](https://example.org/x)",
			"```md",
			"[x](missing.md)",
			"```",
		].join("\n");
		expect(linkProblems("README.md", text, exists, BLOB, ships)).toEqual([]);
	});

	// Final review: a dead link with a single-quoted or parenthesised title passed silently, a
	// footnote definition was read as a link, and a longer fence holding a ``` example ended early.
	it("reports a dead link whatever form its title takes", () => {
		const text = [
			"[a](docs/gone.md 'title')",
			"[b](docs/gone.md (title))",
			'[c](docs/gone.md "t")',
		].join("\n");
		expect(linkProblems("README.md", text, exists, BLOB, ships)).toHaveLength(3);
	});

	it("reads a footnote definition as prose, not a link", () => {
		expect(linkProblems("README.md", "[^1]: Janson, section 5.", exists, BLOB, ships)).toEqual([]);
	});

	it("keeps a longer fence open across a shorter one inside it", () => {
		const text = ["````md", "```", "[x](missing.md)", "```", "````"].join("\n");
		expect(linkProblems("README.md", text, exists, BLOB, ships)).toEqual([]);
	});

	it("refuses an absolute link to a file that ships", () => {
		const text = `[guide](${BLOB}docs/guide.md)`;
		expect(linkProblems("README.md", text, exists, BLOB, ships)).toHaveLength(1);
	});

	it("resolves a link relative to its document", () => {
		expect(
			linkProblems("docs/guide.md", "[calc](how-it-is-calculated.md)", exists, BLOB, ships),
		).toEqual([]);
	});
});

describe("shippedDocsOf", () => {
	it("takes the Markdown entries of package.json#files", () => {
		expect(shippedDocsOf(["dist", "README.md", "LICENSE", "docs/guide.md"])).toEqual([
			"README.md",
			"docs/guide.md",
		]);
	});

	it("refuses a files list with no Markdown, which would check nothing", () => {
		expect(() => shippedDocsOf(["dist"])).toThrow();
	});
});
