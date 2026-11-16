import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";

const dir = process.env.REC_DIR;
mkdirSync(dir, { recursive: true });

const real = globalThis.fetch;
globalThis.fetch = async (url, options) => {
	const response = await real(url, options);
	const text = await response.clone().text();
	const key = createHash("sha1")
		.update(`${options?.method ?? "GET"} ${url} ${options?.body ?? ""}`)
		.digest("hex");
	writeFileSync(
		`${dir}/${key}.json`,
		JSON.stringify({ url: String(url), status: response.status, text }),
	);
	return response;
};
