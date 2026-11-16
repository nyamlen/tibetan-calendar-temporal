import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const dir = process.env.REC_DIR;
const mut = process.env.MUT ?? "control";

// Each mutant edits one recorded page's month-span caption. The edit must change the page, or the run aborts, so a mutant cannot pass by doing nothing.
// December 2024 spans three Tibetan months (9, 10, 11) in the live page.
const edits = {
	// a three-month span opening in a B month: 6B, 7, 8 (the old parser read the middle as 8, leap)
	"b-first": ["2024/December.php", "Tibetan Months 9-11", "Tibetan Months 6B-8"],
	// a three-month span closing in a B month: 9, 10A, 10B (a leap month before the regular month
	// sharing its number, so the middle is 10, leap)
	"b-last": ["2024/December.php", "Tibetan Months 9-11", "Tibetan Months 9-10B"],
	// a three-month span whose middle cannot lie between its ends: 5, 6, 8
	"middle-does-not-lead": ["2024/December.php", "Tibetan Months 9-11", "Tibetan Months 5-8"],
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
	if (edit !== undefined && String(url).includes(edit[0])) {
		const edited = text.replace(edit[1], edit[2]);
		if (edited === text) throw new Error(`replay: mutant ${mut} did not change ${url}`);
		text = edited;
	}
	return new Response(text, { status: rec.status });
};
