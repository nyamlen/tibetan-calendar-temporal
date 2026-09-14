/**
 * The six-season name of each month, from Henning's list of the Indian months.
 *
 * @remarks
 * **HAND-CURATED, and one of three deliberate exceptions to the generated-fixture rule.** The source
 * is Edward Henning, *Kālacakra and the Tibetan Calendar* (2007), Appendix I, "The Indian months",
 * pp. 358–359. The edition consulted is a scanned book with an OCR text layer, and that layer shifts the
 * table's columns against its rows, so a generator could only wrap a scrambled reading. **The pairing
 * of each month with its season was confirmed against the scanned pages by a human reader on 2026-09-13.** Do not
 * regenerate it from the OCR, and do not extend it from a machine reading.
 *
 * Janson gives only months 1 and 3 of this system and cites Henning for the rest, so his two
 * statements, pinned in `janson-month-names.ts`, are a check on this file and not a second witness.
 *
 * `season` is Henning's own English, which he says he chose over translating the Tibetan: an authored
 * gloss, not a sourced term, and not this package's keys.
 *
 * **`page` was not checked by eye; only the pairing was.** It is where the OCR layer places each row —
 * months 3–5 on p. 358, the rest on p. 359. The scrambling shifts columns against rows, not rows
 * between pages, and the OCR puts three month names and three season words on p. 358, so the split is
 * probably right; confirm it against the scan before citing a single row's page.
 *
 * The list is in Kālacakra order, starting at *nag pa*; it is kept in that order here.
 */

export interface HenningSixSeasonRow {
	/** Month number, 1-12. */
	month: number;
	/** The lunar-mansion month name, in Wylie. */
	mansion: string;
	/** Henning's English, e.g. "Early-pre-winter". */
	season: string;
	/** Printed page, as the OCR layer places the row — see the note above. */
	page: 358 | 359;
}

export const HENNING_SIX_SEASONS: readonly HenningSixSeasonRow[] = [
	{ month: 3, mansion: "nag pa", season: "Early-spring", page: 358 },
	{ month: 4, mansion: "sa ga", season: "Late-spring", page: 358 },
	{ month: 5, mansion: "snron", season: "Early-summer", page: 358 },
	{ month: 6, mansion: "chu stod", season: "Late-summer", page: 359 },
	{ month: 7, mansion: "gro bzhin", season: "Early-rains", page: 359 },
	{ month: 8, mansion: "khrums", season: "Late-rains", page: 359 },
	{ month: 9, mansion: "tha skar", season: "Early-autumn", page: 359 },
	{ month: 10, mansion: "smin drug", season: "Late-autumn", page: 359 },
	{ month: 11, mansion: "mgo", season: "Early-pre-winter", page: 359 },
	{ month: 12, mansion: "rgyal", season: "Late-pre-winter", page: 359 },
	{ month: 1, mansion: "mchu", season: "Early-winter", page: 359 },
	{ month: 2, mansion: "dbo", season: "Late-winter", page: 359 },
];
