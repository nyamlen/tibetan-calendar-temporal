import { describe, expect, it } from "vitest";
import { devanagariToIast } from "../scripts/indic.ts";
import { rabjungFromYear } from "../src/computation/epoch.js";
import { RABJUNG_NAMES as SHIPPED_RABJUNG_NAMES } from "../src/rabjung-names.js";
import { RABJUNG_NAMES } from "./fixtures/rabjung-names.js";
import { SIXTY_YEAR_CYCLE } from "./fixtures/sixty-year-cycle.js";

/**
 * Gloss units in a selection, splitting on `,` and `;` outside parentheses.
 *
 * Mirrors the generator's rule deliberately rather than importing it: this suite's job is to check
 * what reached the committed file, and a shared implementation would pass by agreeing with itself.
 */
function glossUnits(text: string): number {
	let depth = 0;
	let units = 1;
	for (const char of text) {
		if (char === "(" || char === "[") depth += 1;
		else if (char === ")" || char === "]") depth = Math.max(0, depth - 1);
		else if ((char === "," || char === ";") && depth === 0) units += 1;
	}
	return units;
}

/**
 * Integrity of the generated rabjung name table.
 *
 * @remarks
 * `scripts/verify-rabjung-names.mjs` checks *provenance* — that every column came from the source it
 * claims and survived its cross-checks — but it needs the network and two converters that live
 * outside the repo, so nothing on the CI path runs it. This suite checks what survives into the
 * committed file, which is the half that can be verified on every push.
 *
 * It deliberately does **not** re-derive anything. Re-running a converter here would test the
 * converter, not the table, and would put a generation-time dependency on the CI path.
 *
 * The second `describe` below checks `src/rabjung-names.ts` against this same fixture, the same
 * division `test/names.test.ts` uses for `src/names.ts`: provenance is checked before a release,
 * integrity on every push.
 */
describe("the generated rabjung name table", () => {
	it("covers all sixty positions exactly once", () => {
		const positions = RABJUNG_NAMES.map((row) => row.position);
		expect(positions).toEqual(Array.from({ length: 60 }, (_, index) => index + 1));
	});

	it("carries every column on every row", () => {
		const incomplete = RABJUNG_NAMES.filter(
			(row) => !row.tibetan || !row.wylie || !row.phonetic || !row.devanagari || !row.iast,
		).map((row) => row.position);
		expect(incomplete).toEqual([]);
	});

	it("keeps the Wylie collision-free, which is why it is the key", () => {
		const seen = new Set(RABJUNG_NAMES.map((row) => row.wylie));
		expect(seen.size).toBe(60);
	});

	it("never carries a THL uncertainty marker", () => {
		// THL writes a literal "(?)" for a syllable it cannot analyse, which an emptiness check passes
		// straight through. `anggi ra` returned "anggi(?) ra" before its Wylie was corrected.
		const unanalysed = RABJUNG_NAMES.filter((row) => row.phonetic.includes("(?)")).map(
			(row) => row.position,
		);
		expect(unanalysed).toEqual([]);
	});

	it("omits the trailing tsheg, as isolated terms do", () => {
		const trailing = RABJUNG_NAMES.filter((row) => row.tibetan.endsWith("་")).map(
			(row) => row.position,
		);
		expect(trailing).toEqual([]);
	});

	it("pairs each row with the Gregorian years of the 16th and 17th cycles", () => {
		// Cycle 16 runs 1927-1986 and cycle 17 1987-2046, so the pair is fixed by the position.
		const wrong = RABJUNG_NAMES.filter(
			(row) => row.years[0] !== 1926 + row.position || row.years[1] !== 1986 + row.position,
		).map((row) => ({ position: row.position, years: row.years }));
		expect(wrong).toEqual([]);
	});

	it("derives every IAST from its own Devanāgarī", () => {
		// The samvatsara table's own romanisation disagrees with its own script at twelve positions,
		// which is why the column is derived rather than taken. This is the check that keeps it so.
		const wrong = RABJUNG_NAMES.filter((row) => {
			const derived = row.devanagari
				.split("/")
				.map((part) => {
					const iast = devanagariToIast(part.trim());
					return iast.charAt(0).toUpperCase() + iast.slice(1);
				})
				.join("/");
			return derived !== row.iast;
		}).map((row) => ({ position: row.position, iast: row.iast, devanagari: row.devanagari }));
		expect(wrong).toEqual([]);
	});

	it("carries Monier-Williams senses on every row", () => {
		// All sixty resolve, eleven of them only through a rung of the lookup ladder. A row with no
		// senses means the ladder or the source moved, not that the name is unattested.
		const empty = RABJUNG_NAMES.filter((row) => row.senses.length === 0).map((row) => row.position);
		expect(empty).toEqual([]);
	});

	it("selects only what the sense it cites actually says", () => {
		// The guarantee is "can select, never invent". It holds only if the chosen gloss is still a
		// substring of the sense carrying its recorded Cologne ID.
		const bad = RABJUNG_NAMES.filter((row) => row.selected !== null)
			.filter(
				(row) =>
					!row.senses.some(
						(sense) => sense.id === row.selectedSenseId && sense.text.includes(row.selected ?? ""),
					),
			)
			.map((row) => ({ position: row.position, selected: row.selected, id: row.selectedSenseId }));
		expect(bad).toEqual([]);
	});

	it("keeps every selection to at most two gloss units", () => {
		// MW's sense lines are themselves gloss lists, so selecting a whole line is almost never the
		// right span; an earlier version shipped one selection running to 177 characters.
		const tooMany = RABJUNG_NAMES.filter((row) => row.selected !== null)
			.filter((row) => glossUnits(row.selected ?? "") > 2)
			.map((row) => ({ position: row.position, units: glossUnits(row.selected ?? "") }));
		expect(tooMany).toEqual([]);
	});

	it("pairs a selected gloss with the sense it came from, and neither alone", () => {
		const mismatched = RABJUNG_NAMES.filter(
			(row) => (row.selected === null) !== (row.selectedSenseId === null),
		).map((row) => row.position);
		expect(mismatched).toEqual([]);
	});

	it("never contradicts the Bṛhat Saṃhitā where it states a position", () => {
		const wrong = RABJUNG_NAMES.filter(
			(row) => row.brihatSamhitaPosition !== null && row.brihatSamhitaPosition !== row.position,
		).map((row) => ({ position: row.position, states: row.brihatSamhitaPosition }));
		expect(wrong).toEqual([]);
	});

	it("agrees with the two positions the engine already computes", () => {
		// 2026 is position 40 of cycle 17 — the value src/computation/epoch.ts derives independently,
		// and the one the README's serialisation example prints.
		expect(RABJUNG_NAMES[39]?.years[1]).toBe(2026);
		expect(RABJUNG_NAMES[0]?.years[1]).toBe(1987);
	});
});

/**
 * The shipped rabjung names must match what the verification harness produced.
 *
 * @remarks
 * `src/rabjung-names.ts` carries only the public subset of each fixture row — `tibetan`, `wylie`,
 * `phonetic` and `sanskrit: { devanagari, iast, meaning }` — never the evidence fields (`senses`,
 * `mwPage`, `brihatSamhitaPosition`, and so on), which are provenance, not calendar data.
 * `meaning` merges the fixture's `selected` (verbatim, on 58 of 60 rows) and `composed` (assembled
 * from a compound's parts, on the other 2) into one field: a consumer wants "the English gloss",
 * not to know which of two mechanisms produced it. This suite is what stops the two drifting apart.
 */
describe("src/rabjung-names.ts matches the verified fixture", () => {
	it.each(RABJUNG_NAMES)("position $position ($wylie) matches the shipped table", (row) => {
		const shipped = SHIPPED_RABJUNG_NAMES[row.position - 1];
		expect(shipped).toEqual({
			tibetan: row.tibetan,
			wylie: row.wylie,
			phonetic: row.phonetic,
			sanskrit: {
				devanagari: row.devanagari,
				iast: row.iast,
				meaning: row.selected ?? row.composed,
			},
		});
	});

	it("carries exactly sixty entries", () => {
		expect(SHIPPED_RABJUNG_NAMES.length).toBe(60);
	});

	it("is frozen at every level, so a consumer cannot mutate a shared name object", () => {
		expect(Object.isFrozen(SHIPPED_RABJUNG_NAMES)).toBe(true);
		expect(Object.isFrozen(SHIPPED_RABJUNG_NAMES[0])).toBe(true);
		expect(Object.isFrozen(SHIPPED_RABJUNG_NAMES[0]?.sanskrit)).toBe(true);
	});
});

/**
 * Position N carries name N — the wiring, not the content.
 *
 * @remarks
 * Neither existing check reaches this. The fixture-integrity suite above pins the committed data;
 * the parity suite pins `src/rabjung-names.ts` against that same data by indexing both with the
 * identical `row.position - 1`, so an off-by-one shared by both sides would pass. Neither asks
 * whether the *engine* -- `rabjungFromYear`, via `rabjungNameOf` -- attaches the right row to the
 * right year, so a bug in that indexing specifically passes both.
 *
 * `SIXTY_YEAR_CYCLE` and `RABJUNG_NAMES` derive from the same Janson-anchored Gregorian-year
 * pairing but are independent files with independent provenance -- one from
 * `scripts/extract-janson-fixtures.mjs` parsing the LaTeX, the other from
 * `scripts/verify-rabjung-names.mjs` querying Cologne and Wiktionary -- so joining on year and
 * checking agreement is a real cross-check, not two views of one number.
 *
 * **State the limit**, since both fixtures ultimately anchor to Janson's own cycle-16/17 table:
 * this validates *wiring* -- that position N's row reaches year N's `Rabjung.name` -- not the
 * *content* of any individual row, which the suites above already cover from their own sources.
 */
describe("rabjungFromYear(year).name wires the right row to the right year", () => {
	it("agrees with the independently-sourced sixty-year-cycle fixture at every position", () => {
		const wrong: unknown[] = [];
		for (const row of SIXTY_YEAR_CYCLE) {
			const expected = RABJUNG_NAMES[row.indian - 1];
			for (const year of row.years) {
				const { name } = rabjungFromYear(year);
				if (name.wylie !== expected?.wylie) {
					wrong.push({ year, position: row.indian, got: name.wylie, expected: expected?.wylie });
				}
			}
		}
		expect(wrong).toEqual([]);
	});
});
