// node fetch.mjs <dir>
// Saves Henning's daily Phugpa calendars for 2021-2027 into <dir>, one JSON record per page
// ({ url, status, text }), the shape check-recording.mjs reads. Over http: the site's HTTPS
// certificate is wrong. Run one at a time; the site is a single small server.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
if (dir === undefined) {
	console.error("usage: node fetch.mjs <dir>");
	process.exit(2);
}
mkdirSync(dir, { recursive: true });

for (let year = 2021; year <= 2027; year++) {
	const url = `http://www.kalacakra.org/calendar/tdata/pl_${year}.txt`;
	const response = await fetch(url);
	const text = await response.text();
	writeFileSync(
		join(dir, `pl_${year}.json`),
		JSON.stringify({ url, status: response.status, text }),
	);
	console.log(`${response.status} ${url} ${Buffer.byteLength(text)} bytes`);
	if (!response.ok) process.exitCode = 1;
}
