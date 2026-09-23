import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isoToTibetan, tibetanToIso } from "../src/computation/conversion.js";
import { monthNamesFor } from "../src/month-names.js";
import { datesFor, monthsFor } from "../src/months.js";
import { MANSION_NAMES } from "./fixtures/mansion-names.js";

/**
 * The figures and the month-to-mansion table in `docs/how-it-is-calculated.md`.
 *
 * @remarks
 * That document ships to npm alongside `docs/guide.md`, so its figures are contract for a reader in
 * exactly the same way — but nothing asserted them until 2026-09-17, and the gap had already cost
 * one: it said a doubled or skipped day occurs in "roughly a quarter of all months", where the true
 * figure is 94%.
 *
 * Everything here is **read out of the document**, never restated, for the reason
 * `test/guide.test.ts` gives for doing the same: a copy kept in the suite passes while the prose
 * drifts. A first draft of this file did restate the table and both percentages, and a review caught
 * it — along with the window being wrong, since `monthsFor` takes a **Tibetan** year and Tibetan
 * 1900–2100 is 1773–1974 CE.
 *
 * Kept out of `test/guide.test.ts` because a suite named for one document while guarding another
 * names the wrong file when it fails.
 */
describe("how-it-is-calculated claims", () => {
	const document = readFileSync(
		new URL("../docs/how-it-is-calculated.md", import.meta.url),
		"utf8",
	);

	describe("the frequency of doubled and skipped days", () => {
		const quoted =
			/Over Tibetan years (\d+)–(\d+) under Phugpa, which run from (\d+) to (\d+) CE, \*\*(\d+)% of\s*\n?months have a skipped day\*\* and \*\*(\d+)% have a doubled one as well\*\*/.exec(
				document,
			);

		it("quotes a window and two percentages in the form this suite can check", () => {
			expect(quoted).not.toBeNull();
		});

		/**
		 * The sentence states its window twice, in two eras, and this is the half a measurement cannot
		 * catch: the first draft looped Tibetan 1900–2100 under prose a reader takes as Gregorian, and
		 * because both windows round to the same percentages, no sweep could tell them apart.
		 */
		it("spans the Gregorian years it also names", () => {
			if (quoted === null) throw new Error("the document's sentence did not parse");
			const [from, to, ceFrom, ceTo] = quoted.slice(1).map(Number);
			if (from === undefined || to === undefined) throw new Error("unparsable window");

			const firstMonth = monthsFor(from)[0];
			const lastMonths = monthsFor(to);
			const lastMonth = lastMonths[lastMonths.length - 1];
			if (firstMonth === undefined || lastMonth === undefined) throw new Error("empty year");
			const firstDay = datesFor(firstMonth)[0];
			const lastDays = datesFor(lastMonth);
			const lastDay = lastDays[lastDays.length - 1];
			if (firstDay === undefined || lastDay === undefined) throw new Error("empty month");

			expect(tibetanToIso(firstDay).year).toBe(ceFrom);
			expect(tibetanToIso(lastDay).year).toBe(ceTo);
		});

		// The long sweep carries an explicit timeout: under v8 coverage instrumentation a 200-year
		// range runs past vitest's 5s default, which is how `npm run coverage` broke silently once.
		it("measures what the document claims, over the years it names", { timeout: 30_000 }, () => {
			if (quoted === null) throw new Error("the document's sentence did not parse");
			const [from, to, , , skippedClaim, doubledClaim] = quoted.slice(1).map(Number);
			if (from === undefined || to === undefined) throw new Error("unparsable window");

			let months = 0;
			let withSkipped = 0;
			let withDoubled = 0;
			let days30 = 0;

			for (let year = from; year <= to; year++) {
				for (const month of monthsFor(year)) {
					const dates = datesFor(month);
					const present = new Set(dates.map((date) => date.day));
					months++;
					for (let day = 1; day <= 30; day++) {
						if (!present.has(day)) {
							withSkipped++;
							break;
						}
					}
					if (dates.some((date) => date.isLeapDay)) withDoubled++;
					if (dates.length === 30) days30++;
				}
			}

			const percent = (count: number) => Math.round((100 * count) / months);
			expect(percent(withSkipped)).toBe(skippedClaim);
			expect(percent(withDoubled)).toBe(doubledClaim);
			// "a month comes out 30 calendar days slightly more often than 29"
			expect(days30).toBeGreaterThan(months - days30);
		});
	});

	describe("the table of months against mansions", () => {
		/** The document's four columns: month, Sanskrit, mansion (one or a pair), and the step. */
		const rows = document
			.split("\n")
			.map((line) => /^\| (\d+) \| \*([^*]+)\* \| ([\d +]+) \| (\d+) \|$/.exec(line.trim()))
			.filter((match): match is RegExpExecArray => match !== null)
			.map((match) => ({
				month: Number(match[1]),
				iast: String(match[2]),
				mansions: String(match[3])
					.split("+")
					.map((piece) => Number(piece.trim())),
				step: Number(match[4]),
			}));

		it("is twelve rows, one per month", () => {
			expect(rows.map((row) => row.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
		});

		it("prints the Sanskrit the engine returns", () => {
			expect(rows.map((row) => row.iast)).toEqual(
				rows.map(
					(row) => monthNamesFor({ year: 2153, month: row.month }).mansion.sanskritName.iast,
				),
			);
		});

		it("names mansions whose Tibetan the month's own name renders", () => {
			const wrong: string[] = [];
			for (const row of rows) {
				const wylie = monthNamesFor({ year: 2153, month: row.month }).mansion.tibetanName.wylie;
				for (const index of row.mansions) {
					const mansion = MANSION_NAMES.find((name) => name.index === index);
					if (mansion === undefined) {
						wrong.push(`month ${row.month}: the fixture has no mansion ${index}`);
					} else if (mansion.wylie !== wylie && !mansion.wylie.startsWith(`${wylie} `)) {
						wrong.push(`month ${row.month}: mansion ${index} is ${mansion.wylie}, not ${wylie}`);
					}
				}
			}
			expect(wrong).toEqual([]);
		});

		it("steps as the printed mansion numbers actually step, nine by 2 and three by 3", () => {
			const steps = rows.map((row, index) => {
				const previous = rows[(index + rows.length - 1) % rows.length];
				const [first] = row.mansions;
				const previousFirst = previous?.mansions[0];
				if (first === undefined || previousFirst === undefined) throw new Error("empty cell");
				return (first - previousFirst + 27) % 27;
			});
			expect(steps).toEqual(rows.map((row) => row.step));
			// "Nine steps of 2 and three of 3, which sum to 27 and close the circle."
			expect(steps.filter((step) => step === 2)).toHaveLength(9);
			expect(steps.filter((step) => step === 3)).toHaveLength(3);
		});
	});
	describe("the doubled-day rule", () => {
		// Until 2026-09-23 the document said a day with no lunar-day end "repeats the previous one".
		// Janson says it takes the number of the FOLLOWING day, and that the first of the pair is the
		// leap day; so does the engine. Read the bullet and hold it to a real doubled pair.
		const bullet =
			/the day takes the number of the following day\. The number is \*\*doubled\*\* — day \d+ occurs twice — and the first of the pair is the\s+leap day\./.exec(
				document,
			);

		it("states that the doubled day takes the following day's number", () => {
			expect(bullet).not.toBeNull();
			expect(document).not.toMatch(/repeats the previous/);
		});

		it("agrees with the engine on 2024-07-09 and 2024-07-10", () => {
			const first = isoToTibetan(Temporal.PlainDate.from("2024-07-09"));
			const second = isoToTibetan(Temporal.PlainDate.from("2024-07-10"));
			expect([first.day, first.isLeapDay, first.isDoubledDay]).toEqual([4, true, true]);
			expect([second.day, second.isLeapDay, second.isDoubledDay]).toEqual([4, false, true]);
		});
	});
});
