import { createHash } from "node:crypto";
import fs, { readFileSync } from "node:fs";
import { createRequire, syncBuiltinESMExports } from "node:module";

const dir = process.env.REC_DIR;
const mut = process.env.MUT ?? "control";
const require = createRequire(`file:///${process.cwd().replaceAll("\\", "/")}/package.json`);

// Converter mutants alter what a converter returns for one input (the input of checks 1 and 2).
const jsewts = require("jsewts");
const realFrom = jsewts.fromWylie;
const realTo = jsewts.toWylie;
if (mut === "converter-disagree")
	jsewts.fromWylie = (w) => (w === "gso sbyong" ? `${realFrom(w)}་` : realFrom(w));
if (mut === "roundtrip")
	jsewts.toWylie = (t) => (t === realFrom("sbyin sreg") ? "sbyin sreg x" : realTo(t));

const wikipediaListPlusMilarepa = (t) => {
	const j = JSON.parse(t);
	const slot = Object.values(j.query.pages)[0].revisions[0].slots.main;
	slot["*"] += "\n* མི་ལ་རས་པ།\n";
	return JSON.stringify(j);
};

// Each mutant: [which served responses it touches, the one edit]. Every edit is applied to the recorded
// response and must change it, or the run aborts, so a mutant cannot pass by doing nothing.
const edits = {
	// check 4
	"mvy-pair": [
		(u) => u.includes("21-Mahavyutpatti"),
		(t) => t.replace("sbyin sreg|homaḥ", "sbyin sreg|homa"),
	],
	"mw-sense": [
		(u) => u.includes("key=homa&"),
		(t) => t.replaceAll("oblation with fire", "oblation"),
	],
	"jaeschke-index": [
		(u) => u.includes("66-Jaeschke"),
		(t) => t.replace("\ndus chen|280?", "\ndus chen|480?"),
	],
	// check 3, terms: fire puja keeps only the Mahavyutpatti once both Tibetan-Tibetan dictionaries lose its headword
	"term-one-witness": [
		(u) => u.includes("25-tshig") || u.includes("34-dung"),
		(t) => t.replace(/^sbyin sreg\|.*$/gm, "sbyin sregX|gone"),
	],
	// check 3, terms: chotrul rests on Rigpa alone once the dictionary and the Jaschke page both go
	"duchen-rigpa-alone": [
		(u) => u.includes("25-tshig") || u.includes("66-Jaeschke"),
		(t, _body, url) =>
			url.includes("66-Jaeschke")
				? t.replace("\ndus chen|280?", "\ndus chen|480?")
				: t.replace(/^dus chen\|.*$/gm, "dus chen x|gone"),
	],
	// check 3, persons: karmapa-16 needs both its witnesses; take each away in turn
	"karmapa-google-removed": [
		(u) => u.includes("books.google.com"),
		(t) => t.replace("&#3938;", "&#3939;"),
	],
	"karmapa-lotsawa-removed": [
		(u) => u.includes("short-prayer-for-long-life-of-sixteenth-karmapa"),
		(t) => t.replaceAll("རྒྱལ་དབང་ཀརྨ་པ་བཅུ་དྲུག་པ", "རྒྱལ་དབང་ཀརྨ་པ་བཅུ་དྲུག་པX"),
	],
	// I2: milarepa loses BDRC and the dictionary and keeps a Wikipedia title AND a Wikipedia list item: one group
	"wikipedia-one-group": [
		(u) =>
			u.includes("purl.bdrc.io/resource/P1853") ||
			u.includes("25-tshig") ||
			(u.includes("bo.wikipedia.org") && u.includes("rvprop=content")),
		(t, _body, url) =>
			url.includes("bo.wikipedia.org")
				? wikipediaListPlusMilarepa(t)
				: t
						.replaceAll("mi la ras pa/", "mi la ras ba/")
						.replace(/^mi la ras pa\|.*$/gm, "mi la ras ba|x"),
	],
	// check 5: a marked word attested only by an index that check 3 rejects (Jaschke's lists bdud 'joms)
	"check5-index-only": [
		(u) => u.includes("25-tshig") || u.includes("34-dung") || u.includes("21-Mahavyutpatti"),
		(t) => t.replaceAll("bdud 'joms", "bdud 'jomX"),
	],
	// check 5, the self-invalidation of a correction
	"thl-correction": [
		(u) => u.includes("phonetics.pl"),
		(t, body) => (body.includes("karma+pa") ? t.replace("kama(?)pa", "karmapa") : t),
	],
};
// These two touch several responses, some of which a mutant legitimately leaves alone.
const mayLeaveUnchanged = new Set(["thl-correction", "check5-index-only"]);

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
	if (edit?.[0](String(url))) {
		const edited = edit[1](text, String(options?.body ?? ""), String(url));
		if (edited === text && !mayLeaveUnchanged.has(mut))
			throw new Error(`replay: mutant ${mut} did not change ${url}`);
		text = edited;
	}
	return new Response(text, { status: rec.status });
};

// The Rigpa passages are verifier input read from disk, not fetched, so their mutants wrap readFileSync.
const realRead = fs.readFileSync;
fs.readFileSync = (path, ...rest) => {
	if (String(path).includes("observance-name-rigpa-passages")) {
		if (mut === "rigpa-missing")
			throw Object.assign(new Error("ENOENT: no such file (mutant)"), { code: "ENOENT" });
		const text = realRead(path, ...rest);
		if (mut === "rigpa-string") {
			const edited = String(text).replace(
				'"wylie": "chos \'khor dus chen"',
				'"wylie": "chos \'khor dus chens"',
			);
			if (edited === String(text))
				throw new Error("replay: mutant rigpa-string did not change the file");
			return edited;
		}
		return text;
	}
	return realRead(path, ...rest);
};
syncBuiltinESMExports();
