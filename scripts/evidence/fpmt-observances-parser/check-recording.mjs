// node check-recording.mjs <recorded-dir>          compare a recording with recorded-manifest.json
// node check-recording.mjs <recorded-dir> --write  write the manifest from a recording
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = process.argv[2];
const manifestPath = join(dirname(fileURLToPath(import.meta.url)), "recorded-manifest.json");
const entries = readdirSync(dir)
	.filter((f) => f.endsWith(".json"))
	.map((f) => {
		const rec = JSON.parse(readFileSync(join(dir, f), "utf8"));
		return {
			url: rec.url,
			status: rec.status,
			bytes: Buffer.byteLength(rec.text),
			sha256: createHash("sha256").update(rec.text).digest("hex"),
		};
	})
	.sort((a, b) => a.url.localeCompare(b.url));

if (process.argv[3] === "--write") {
	writeFileSync(manifestPath, `${JSON.stringify(entries, null, "\t")}\n`);
	console.log(`wrote ${entries.length} entries`);
} else {
	const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
	const have = new Map(entries.map((e) => [e.url, e]));
	const problems = [];
	for (const m of manifest) {
		const e = have.get(m.url);
		if (e === undefined) problems.push(`missing: ${m.url}`);
		else if (e.sha256 !== m.sha256) problems.push(`changed: ${m.url}`);
	}
	for (const e of entries)
		if (!manifest.some((m) => m.url === e.url)) problems.push(`not in manifest: ${e.url}`);
	if (problems.length > 0) {
		console.log(problems.join("\n"));
		process.exit(1);
	}
	console.log(`all ${manifest.length} responses match the manifest`);
}
