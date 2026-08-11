#!/usr/bin/env node
// Validates every internal markdown link in the repo against the filesystem: relative
// paths must resolve to a real file or directory, and #fragments must match a heading.
//
// External URLs are deliberately NOT checked. The validation sources in docs/testing.md
// point at fpmt.org, lotsawahouse.org and arxiv.org; reaching them from CI would make the
// build flaky and rate-limited in exchange for catching link rot we cannot fix anyway.
//
// Zero dependencies, by the same logic as the engine itself.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
	encoding: "utf8",
}).trim();

const files = execFileSync("git", ["ls-files", "*.md"], { cwd: root, encoding: "utf8" })
	.split("\n")
	.filter(Boolean);

// Blank out fenced code blocks while preserving newlines, so line numbers stay accurate
// and sample code containing bracket syntax is not mistaken for a link.
function stripFences(markdown) {
	return markdown.replace(/^```[\s\S]*?^```/gm, (block) => block.replace(/[^\n]/g, " "));
}

// Variation selectors and zero-width joiners. GitHub's slugger strips an emoji but keeps
// the invisible selector trailing it, so `## ⚠️ Clean-room constraint` anchors to a slug
// with a leading character nobody can type. Both sides of the comparison drop these, so
// the readable form resolves; the cost is not flagging a link that uses the literal
// GitHub slug, which is the right trade for a check that must not cry wolf.
const INVISIBLE = /[\u{FE00}-\u{FE0F}\u{200B}-\u{200D}\u{2060}]/gu;

// Otherwise mirrors GitHub's heading anchor generation: lowercase, drop punctuation,
// spaces to hyphens. Unicode letters are kept, which matters for IAST diacritics.
function slugify(heading) {
	return heading
		.trim()
		.toLowerCase()
		.replace(INVISIBLE, "")
		.replace(/[^\p{L}\p{N}\s-]/gu, "")
		.replace(/\s+/g, "-");
}

// Links may percent-encode spaces or non-ASCII characters.
function decode(value) {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

function headingSlugs(markdown) {
	const slugs = new Set();
	const seen = new Map();
	for (const [, text] of stripFences(markdown).matchAll(/^#{1,6}\s+(.+?)\s*#*$/gm)) {
		const base = slugify(text);
		// GitHub disambiguates repeated headings by appending -1, -2, ...
		const count = seen.get(base) ?? 0;
		seen.set(base, count + 1);
		slugs.add(count === 0 ? base : `${base}-${count}`);
	}
	return slugs;
}

const slugCache = new Map();
function slugsFor(path) {
	if (!slugCache.has(path)) {
		slugCache.set(path, headingSlugs(readFileSync(path, "utf8")));
	}
	return slugCache.get(path);
}

const INLINE_LINK = /\[[^\]]*\]\(\s*<?([^)<>\s]+)>?(?:\s+["'][^"']*["'])?\s*\)/g;
const REFERENCE_DEF = /^ {0,3}\[[^\]]+\]:\s*<?(\S+?)>?\s*$/gm;
const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

const failures = [];

for (const file of files) {
	const absolute = resolve(root, file);
	const source = stripFences(readFileSync(absolute, "utf8"));

	for (const pattern of [INLINE_LINK, REFERENCE_DEF]) {
		for (const match of source.matchAll(pattern)) {
			const target = match[1];
			if (EXTERNAL.test(target)) continue;

			const line = source.slice(0, match.index).split("\n").length;
			const [rawPath, rawFragment] = target.split("#");
			const path = decode(rawPath);
			const fragment = rawFragment && decode(rawFragment).replace(INVISIBLE, "");
			const resolved = path === "" ? absolute : resolve(dirname(absolute), path);

			if (!existsSync(resolved)) {
				failures.push(`${file}:${line}  ${target}  -> no such file or directory`);
				continue;
			}

			// Only markdown files have anchors worth resolving.
			if (fragment && resolved.endsWith(".md") && !slugsFor(resolved).has(fragment)) {
				failures.push(`${file}:${line}  ${target}  -> no heading matches #${fragment}`);
			}
		}
	}
}

if (failures.length > 0) {
	console.error(`Broken markdown links (${failures.length}):\n`);
	for (const failure of failures) console.error(`  ${failure}`);
	console.error("");
	process.exit(1);
}

console.log(`All internal markdown links resolve (${files.length} files checked).`);
