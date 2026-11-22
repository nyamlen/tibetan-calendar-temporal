/**
 * Great holy days as published by FPMT, with the Tibetan date each is defined to fall on.
 *
 * FPMT prepares its dates from the Men-Tsee-Khang almanac, which makes this the only fixture in
 * the suite that comes from the **almanac itself** rather than from someone's implementation of
 * Janson. The three cross-check fixtures all agree with the engine; this one tests something
 * different — whether the engine's day numbers land on the days practitioners actually observe.
 *
 * Each holy day has a fixed Tibetan date, so a published Gregorian date is a direct assertion
 * about the calendar:
 *
 * - Losar — 1st of month 1
 * - Chotrul Duchen — 15th of month 1
 * - Saka Dawa Duchen — 15th of month 4
 * - Chokhor Duchen — 4th of month 6
 * - Lhabab Duchen — 22nd of month 9
 *
 * @remarks
 * **Hand-curated, not generated** — the exception to this directory's rule, because FPMT
 * publishes these in prose announcements with no API or machine-readable feed. Three things keep
 * the risk that `docs/development/testing.md` warns about in check: the list is short enough to check by eye,
 * every row carries the URL it came from, and every row was independently confirmed against
 * three separate implementations before being written down. Rows whose source could not be named
 * were left out rather than filled in from memory.
 */
export interface FpmtHolyDay {
	/** The observance, as FPMT names it. */
	event: string;
	/** ISO date FPMT published. */
	iso: string;
	/** Tibetan month the observance is fixed to. */
	month: number;
	/** Tibetan day the observance is fixed to. */
	day: number;
	/** Whether the observance falls in a leap month that year. */
	isLeapMonth?: boolean;
	/** The FPMT page the date was taken from. */
	source: string;
}

const LOSAR_2024 =
	"https://fpmt.org/edu-news/advice-for-losar-and-the-fifteen-days-of-miracles-february-10-24/";
const CHOKHOR_2024 =
	"https://fpmt.org/edu-news/chokhor-duchen-is-upcoming-practice-and-prayers-for-lama-zopa-rinpoches-swift-return/";

export const FPMT_HOLY_DAYS: readonly FpmtHolyDay[] = [
	{ event: "Losar", iso: "2024-02-10", month: 1, day: 1, source: LOSAR_2024 },
	{ event: "Chotrul Duchen", iso: "2024-02-24", month: 1, day: 15, source: LOSAR_2024 },
	{
		event: "Saka Dawa Duchen",
		iso: "2024-05-23",
		month: 4,
		day: 15,
		source: "https://fpmt.org/edu-news/recommended-practices-for-saka-dawa-may-23-2024/",
	},
	// FPMT gives two dates for 2024 — see FPMT_DOUBLED_DAY_NOTE below.
	{
		event: "Chokhor Duchen",
		iso: "2024-07-09",
		month: 6,
		day: 4,
		isLeapMonth: true,
		source: CHOKHOR_2024,
	},
	{
		event: "Chokhor Duchen",
		iso: "2024-07-10",
		month: 6,
		day: 4,
		isLeapMonth: true,
		source: CHOKHOR_2024,
	},
	{
		event: "Saka Dawa Duchen",
		iso: "2025-06-11",
		month: 4,
		day: 15,
		source: "https://fpmt.org/edu-news/advice-for-practice-on-saka-dawa-duchen-2025/",
	},
	{
		event: "Chokhor Duchen",
		iso: "2025-07-28",
		month: 6,
		day: 4,
		source:
			"https://fpmt.org/edu-news/chokhor-duchen-is-approaching-on-july-28-turning-the-wheel-of-dharma/",
	},
	{
		event: "Lhabab Duchen",
		iso: "2025-11-11",
		month: 9,
		day: 22,
		source: "https://fpmt.org/edu-news/celebrate-lhabab-duchen-on-november-11-merit-multiplying/",
	},
	{
		event: "Saka Dawa Duchen",
		iso: "2026-05-31",
		month: 4,
		day: 15,
		source: "https://fpmt.org/edu-news/saka-dawa-duchen-2026-sunday-may-31/",
	},
	{
		event: "Chokhor Duchen",
		iso: "2026-07-18",
		month: 6,
		day: 4,
		source:
			"https://fpmt.org/edu-news/chokhor-duchen-is-approaching-on-july-18-turning-the-wheel-of-dharma/",
	},
];

/**
 * FPMT's own account of the 2024 Chokhor Duchen, which is a doubled day in this engine:
 *
 * > Chokhor Duchen, one of the four annual holy days of Guru Shakyamuni Buddha, takes place this
 * > year on July 9 or July 10 depending on the various Tibetan calendars.
 *
 * with Kopan Monastery observing the 9th and the Liberation Prison Project calendar the 10th.
 *
 * Both dates carry the same Tibetan date, 4 of the leap month 6 — the engine marks 9 July as the
 * leap day and 10 July as the ordinary one. The disagreement between institutions is therefore
 * not a disagreement about the calendar at all; it is the question of which half of a doubled
 * day an observance falls on, which Janson §11 discusses and which no arithmetic can settle.
 *
 * This is the single most informative row in the fixture: it exercises a leap month and a
 * doubled day at once, from a published almanac-line source, and it is why Phase 3's practice-day
 * logic must let the caller choose rather than hardcoding one convention.
 */
export const FPMT_DOUBLED_DAY_NOTE = "2024-07-09/2024-07-10 are both 4 of leap month 6";
