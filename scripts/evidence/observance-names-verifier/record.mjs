import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";

const dir = process.env.REC_DIR;
mkdirSync(dir, { recursive: true });

// The two copyrighted dictionaries are stored as headwords only: the project may gate on a headword's presence and never keeps the text.
const HEADWORDS_ONLY = ["25-tshig-mdzod-chen-mo-Tib", "34-dung-dkar-tshig-mdzod-chen-mo-Tib"];
const headwordsOnly = (text) =>
	text
		.split(/\r?\n/)
		.map((line) => line.slice(0, line.indexOf("|") + 1))
		.filter(Boolean)
		.join("\n")
		.concat("\n");

const real = globalThis.fetch;
globalThis.fetch = async (url, options) => {
	const response = await real(url, options);
	let text = await response.clone().text();
	const reduced = HEADWORDS_ONLY.some((name) => String(url).endsWith(name));
	if (reduced) text = headwordsOnly(text);
	const key = createHash("sha1")
		.update(`${options?.method ?? "GET"} ${url} ${options?.body ?? ""}`)
		.digest("hex");
	const entry = {
		url: String(url),
		body: String(options?.body ?? ""),
		status: response.status,
		text,
	};
	if (reduced) entry.reduced = "headwords only: the copyrighted dictionary bodies are not kept";
	writeFileSync(`${dir}/${key}.json`, JSON.stringify(entry));
	return response;
};
