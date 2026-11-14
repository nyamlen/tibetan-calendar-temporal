import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const manifest = JSON.parse(
	readFileSync(join(dirname(fileURLToPath(import.meta.url)), "recorded-manifest.json"), "utf8"),
);
const dir = process.argv[2];
if (!dir) {
	console.error("usage: node check-recording.mjs <recorded directory>");
	process.exit(2);
}
const problems = [];
for (const row of manifest) {
	const file = join(dir, `${row.key}.json`);
	if (!existsSync(file)) {
		problems.push(`missing ${row.url}`);
		continue;
	}
	const sha256 = createHash("sha256")
		.update(JSON.parse(readFileSync(file, "utf8")).text)
		.digest("hex");
	if (sha256 !== row.sha256) problems.push(`changed since the committed run: ${row.url}`);
}
if (problems.length) {
	console.error(problems.join("\n"));
	process.exit(1);
}
console.log(`all ${manifest.length} recorded responses match the manifest`);
