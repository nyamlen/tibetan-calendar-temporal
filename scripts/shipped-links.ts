// The link check `check-pack.mjs` runs over the shipped documents, kept apart so a test can hold it to
// failing on each kind of dead link (`test/shipped-links.test.ts`). Erasable TypeScript only:
// `check-pack.mjs` loads it under Node's type stripping, as the generators load `indic.ts`.
import { posix } from "node:path";

/**
 * The documents a package ships: the Markdown entries of its `package.json#files`.
 *
 * @throws Error if there are none, since a check over no documents would pass vacuously.
 */
export function shippedDocsOf(files: readonly string[]): string[] {
	const docs = files.filter((entry) => entry.endsWith(".md"));
	if (docs.length === 0) {
		throw new Error("package.json#files lists no Markdown document, so there is nothing to check");
	}
	return docs;
}

/** Every link target in `text` outside fenced code: inline, reference definitions, HTML src/href. */
function targetsOf(text: string): string[] {
	const prose: string[] = [];
	// A fence closes only on a run of the same character at least as long as the one that opened
	// it, so a ```` fence can hold a ``` example (CommonMark).
	let fence: string | null = null;
	for (const line of text.split(/\r?\n/)) {
		const marker = /^\s{0,3}(`{3,}|~{3,})/.exec(line)?.[1];
		if (fence === null) {
			if (marker === undefined) prose.push(line);
			else fence = marker;
		} else if (marker !== undefined && marker[0] === fence[0] && marker.length >= fence.length) {
			fence = null;
		}
	}
	const body = prose.join("\n");
	// A title may be "…", '…' or (…); a footnote definition `[^1]: …` is prose, not a link.
	return [
		...[...body.matchAll(/\]\(\s*<?([^)\s>]+)>?(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g)].map(
			(m) => m[1] ?? "",
		),
		...[...body.matchAll(/^\s{0,3}\[(?!\^)[^\]]+\]:\s*<?([^\s>]+)>?/gm)].map((m) => m[1] ?? ""),
		...[...body.matchAll(/\b(?:src|href)\s*=\s*"([^"]*)"/g)].map((m) => m[1] ?? ""),
	];
}

/**
 * The problems with the links in one shipped document, as messages; empty when every link is sound.
 *
 * @remarks
 * A relative target has its `#fragment` stripped; an empty one (a link within the same document)
 * passes; anything else must resolve, from the document's own directory, to a file `exists` reports.
 * A target with a scheme is skipped, except an absolute link under `blob` to a path that `ships`,
 * which is refused: it should be linked relatively, to the copy beside it.
 *
 * @param doc - The document's path inside the package, `/`-separated.
 * @param exists - Whether a package path is a file, a directory, or absent.
 * @param blob - The repository's `…/blob/main/` URL prefix.
 * @param ships - Whether a package path is in `package.json#files`.
 */
export function linkProblems(
	doc: string,
	text: string,
	exists: (path: string) => "file" | "dir" | null,
	blob: string,
	ships: (path: string) => boolean,
): string[] {
	const problems: string[] = [];
	for (const target of targetsOf(text)) {
		if (/^[a-z][a-z0-9+.-]*:/i.test(target)) {
			const path = target.split("#")[0] ?? "";
			if (path.startsWith(blob) && ships(path.slice(blob.length))) {
				problems.push(
					`${doc} links to ${target} by absolute URL, but ${path.slice(blob.length)} ships in the tarball — link it relatively`,
				);
			}
			continue;
		}
		const path = target.split("#")[0] ?? "";
		if (path === "") continue;
		const resolved = posix.normalize(posix.join(posix.dirname(doc), path)).replace(/\/+$/, "");
		const kind = resolved.startsWith("../") ? null : exists(resolved);
		if (kind !== "file") {
			problems.push(
				kind === "dir"
					? `${doc} links to ${target}, which is a directory, not a file`
					: `${doc} links to ${target}, which is not in the tarball`,
			);
		}
	}
	return problems;
}
