import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const dir = process.env.REC_DIR;
const mut = process.env.MUT ?? "control";

const TUPLE =
	/\((\d+),\s*'(\w+)',\s*(\d+),\s*(\d+),\s*(\d+),\s*'([^']*)',\s*(\d+),\s*(\d+),\s*(\d+)\)/g;

// Rewrites the tuples a predicate selects. `change` returns the new (month, leap) pair.
const rewrite = (text, select, change) =>
	text.replace(TUPLE, (whole, id, wd, day, month, leap, name, gd, gm, gy) => {
		const row = {
			month: Number(month),
			leap: Number(leap),
			gd: Number(gd),
			gm: Number(gm),
			gy: Number(gy),
		};
		if (!select(row)) return whole;
		const [m, l] = change(row);
		return `(${id}, '${wd}', ${day}, ${m}, ${l}, '${name}', ${gd}, ${gm}, ${gy})`;
	});

// Each mutant edits the recorded source. An edit that changes nothing aborts the run, so a mutant
// cannot pass by doing nothing.
const edits = {
	// The leap month 4 of 2000 takes the number 5 while its flag stays 4: a leap month whose
	// predecessor is a regular month 4, and which therefore does not share its number.
	"leap-wrong-number": (t) =>
		rewrite(
			t,
			(r) => r.leap === 4 && r.gy === 2000,
			() => [5, 4],
		),
	// The regular month 3 of 2011 becomes a leap month 3, straight after the leap month 2 Janson
	// lists: a leap month following a leap month, inside the window.
	"leap-after-leap": (t) =>
		rewrite(
			t,
			(r) => r.leap === 0 && r.month === 3 && r.gy === 2011,
			() => [3, 3],
		),
};

globalThis.fetch = async (url, options) => {
	const key = createHash("sha1")
		.update(`${options?.method ?? "GET"} ${url} ${options?.body ?? ""}`)
		.digest("hex");
	let rec;
	try {
		rec = JSON.parse(readFileSync(`${dir}/${key}.json`, "utf8"));
	} catch {
		throw new Error(`replay: no recorded response for ${url}`);
	}
	let text = rec.text;
	const edit = edits[mut];
	if (edit !== undefined) {
		const edited = edit(text);
		if (edited === text) throw new Error(`replay: mutant ${mut} did not change ${url}`);
		text = edited;
	} else if (mut !== "control") {
		throw new Error(`replay: unknown mutant ${mut}`);
	}
	return new Response(text, { status: rec.status });
};
