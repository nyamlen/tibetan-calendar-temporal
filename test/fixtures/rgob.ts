/**
 * Bhutanese dates from the **Royal Government of Bhutan's own** published calendar.
 *
 * @remarks
 * **HAND-CURATED, and the second deliberate exception to the generated-fixture rule.** The first is
 * `fpmt-holy-days.ts`. The justification here is parallel and narrow: the Ministry of Home Affairs
 * publishes its calendar as a **scanned PDF with no text layer** — `pdftotext` yields nothing — so
 * there is no markup to parse and no feed to fetch. A generator could only wrap OCR, and an OCR
 * misread of a Tibetan numeral produces a plausible wrong date, which is the failure this package
 * exists to prevent.
 *
 * Its safeguards are `fpmt-holy-days.ts`'s: short enough to check by eye, and every row carries the
 * page it came from.
 *
 * **Why it is worth the exception.** Every other Bhutanese source available descends from Henning's
 * "Open Source Bhutanese Calendar" software — `test/fixtures/bhutan.ts` does, and so does
 * bhutanesecalendar.com, which states it in as many words. Agreement with those is agreement with
 * one lineage. **This is the Royal Government's own publication**, so it is the only independent
 * check on Bhutanese dates in this repository.
 *
 * It also bears on a puzzle Janson leaves open. He records that Bhutan's government calendar put
 * New Year 2003 on 3 March while his calculations and Henning's software give 4 March, and writes
 * "I have no explanation for this discrepancy." Nothing here reproduces that divergence: the rows
 * below agree with the engine throughout, including a skipped day. On this evidence the 2003
 * disagreement is isolated rather than systematic — which is a narrower claim than "explained", and
 * is all that should be drawn from twenty-five rows across two years.
 *
 * **What it does not establish.** `BHUTAN` and `BHUTAN_HENNING` agree on every date below, so this
 * says nothing about the `a₂` fork. Settling that needs a year containing one of its divergence
 * dates — 2001-12-10, 2004-04-10 or 2020-04-23. The Ministry publishes only 2025 and 2026, the
 * Wayback Machine holds only 2026, and 2001 and 2004 predate the site, so the fork stays open.
 *
 * Transcribed by Andreas Bothner from the pages cited, 2026-08-17. The Tibetan numerals were read by
 * a human deliberately: an earlier machine reading of the same document misread three cells in
 * nineteen, all of them `༠` against `༤` or `༥` against `༦`.
 *
 * Sources, both Royal Government of Bhutan, Ministry of Home Affairs, Tashichhodzong, and both
 * linked from {@link https://www.moha.gov.bt/?page_id=5611} — the only two years the Ministry
 * publishes:
 *
 * - 2026: {@link https://www.moha.gov.bt/wp-content/uploads/2025/11/calender-2026.pdf}
 * - 2025: {@link https://www.moha.gov.bt/wp-content/uploads/2024/11/Calendar_2025.pdf}
 *
 * In both, pages 5–16 are the twelve monthly grids and page 5 is January.
 */

/** One day as the Royal Government's calendar prints it. */
export interface RgobDay {
	/** Gregorian date, ISO 8601. */
	readonly iso: string;
	/** The Bhutanese day-of-month number printed in that cell. */
	readonly day: number;
	/** The page of the source PDF this was read from. */
	readonly page: number;
	/** Whether the cell is marked with the dharma wheel, the calendar's holiday mark. */
	readonly holiday: boolean;
	/** What the row demonstrates, where that is the reason it was chosen. */
	readonly note?: string;
}

/**
 * The 2026 calendar, from the twelve monthly pages (5–16) rather than the holiday table (2–3).
 *
 * The monthly pages are the authority: the holiday table on pages 2–3 gives lunar dates in prose and
 * disagreed with the monthly pages once, at 2 May, where the table reads day 15 and the calendar
 * grid reads day 16. The grid is the calendar; the table is a summary of it.
 */
export const RGOB_2026: readonly RgobDay[] = [
	{ iso: "2026-01-01", day: 13, page: 5, holiday: false },
	{ iso: "2026-01-02", day: 14, page: 5, holiday: true, note: "nyilo — winter solstice" },
	{ iso: "2026-01-19", day: 1, page: 5, holiday: true, note: "first day of month 12" },
	{ iso: "2026-02-18", day: 1, page: 6, holiday: true, note: "Losar" },
	{ iso: "2026-02-19", day: 2, page: 6, holiday: true },
	{ iso: "2026-02-21", day: 4, page: 6, holiday: true },
	{ iso: "2026-02-22", day: 5, page: 6, holiday: true },
	{ iso: "2026-02-23", day: 6, page: 6, holiday: true },
	{ iso: "2026-05-02", day: 16, page: 9, holiday: true, note: "the holiday table says 15 here" },
	{ iso: "2026-05-15", day: 28, page: 9, holiday: false },
	{ iso: "2026-05-16", day: 30, page: 9, holiday: false, note: "day 29 skipped" },
	{ iso: "2026-05-31", day: 15, page: 9, holiday: true },
	{ iso: "2026-06-20", day: 6, page: 10, holiday: false },
	{ iso: "2026-06-24", day: 10, page: 10, holiday: true },
];

/**
 * The 2025 calendar, chosen for its **irregularities** rather than its holidays.
 *
 * Two skipped days and two doubled days, each read as a pair of adjacent cells so the irregularity
 * is visible in the data rather than asserted about it: `2025-01-10` is day 11 and `2025-01-11` is
 * day 13, so day 12 is in no cell; `2025-01-19` and `2025-01-20` both print day 21.
 *
 * These are the rows that carry the weight. A run of ordinary consecutive days agrees under almost
 * any epoch error; a doubled day is where Janson's §8 warns that published tables go wrong, because
 * it depends on the lunar-day classification rather than on the month arithmetic.
 *
 * The Royal Government's grid simply prints the number twice for a doubled day and does not mark
 * which member is the intercalated one, so nothing here claims it does. The engine's own
 * `isLeapDay` convention is checked in the suite against the *ordering*, not against this source.
 */
export const RGOB_2025: readonly RgobDay[] = [
	{ iso: "2025-01-02", day: 3, page: 5, holiday: true },
	{ iso: "2025-01-10", day: 11, page: 5, holiday: false },
	{ iso: "2025-01-11", day: 13, page: 5, holiday: false, note: "day 12 skipped" },
	{ iso: "2025-01-19", day: 21, page: 5, holiday: false, note: "day 21 doubled, first cell" },
	{ iso: "2025-01-20", day: 21, page: 5, holiday: false, note: "day 21 doubled, second cell" },
	{ iso: "2025-01-30", day: 1, page: 5, holiday: true, note: "first day of month 12" },
	{ iso: "2025-02-03", day: 5, page: 6, holiday: false },
	{ iso: "2025-02-04", day: 7, page: 6, holiday: false, note: "day 6 skipped" },
	{ iso: "2025-02-21", day: 24, page: 6, holiday: true, note: "day 24 doubled, first cell" },
	{ iso: "2025-02-22", day: 24, page: 6, holiday: true, note: "day 24 doubled, second cell" },
	{ iso: "2025-02-23", day: 25, page: 6, holiday: true },
];

/** Every government-published day here, both years, in date order. */
export const RGOB_DAYS: readonly RgobDay[] = [...RGOB_2025, ...RGOB_2026];
