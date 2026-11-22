import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// docs/README.md indexes the folder by audience. A document added without a line here is one a
// reader browsing docs/ never finds, and nothing else would notice.

const docs = new URL("../docs/", import.meta.url);
const index = existsSync(new URL("README.md", docs))
	? readFileSync(new URL("README.md", docs), "utf8")
	: "";
const targets = new Set([...index.matchAll(/\]\(([^)#\s]+)/g)].map((match) => match[1]));

describe("docs/README.md", () => {
	it("links every document in docs/, docs/development/ and docs/sources/", () => {
		const documents = ["", "development/", "sources/"].flatMap((folder) =>
			readdirSync(new URL(folder, docs))
				.filter((name) => name.endsWith(".md") && !(folder === "" && name === "README.md"))
				.map((name) => `${folder}${name}`),
		);
		expect(documents.length).toBeGreaterThan(0);
		expect(documents.filter((document) => !targets.has(document))).toEqual([]);
	});

	it("links names/ and decisions/ as folders", () => {
		expect(["names/", "decisions/"].filter((folder) => !targets.has(folder))).toEqual([]);
	});
});
