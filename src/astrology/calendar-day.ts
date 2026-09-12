/**
 * The attributes a *calendar day* carries — the sunrise-to-sunrise day, not the lunar one.
 *
 * @remarks
 * These run straight off the **Julian day number**, which makes them independent of the Tibetan
 * calendar entirely: no tradition, no month count, no leap months. They are identical in every
 * version, and they can be asked of any day at all.
 *
 * **A single day carries two sets of labels that disagree** — these, and the lunar day's. That is
 * not a defect to reconcile; almanacs print both. See [docs/astrology.md](../../docs/astrology.md).
 *
 * @packageDocumentation
 */

import { amod, ceilDiv } from "../computation/arithmetic.js";
import { assertInternal } from "../errors.js";
import type { TibetanAnimal, TibetanElement, TibetanGender } from "../types.js";
import { type YearAttributes, yearAttributes } from "./year.js";

/**
 * The eight trigrams in the King Wen order Janson tabulates, by his numbering.
 *
 * @remarks
 * His caption notes that the numbering "is perhaps not traditional" — it is his, and it is the one
 * his formulas index. The Tibetan spellings are his.
 */
export type TibetanTrigram = "li" | "khon" | "dwa" | "khen" | "kham" | "gin" | "zin" | "zon";

const TRIGRAMS: readonly TibetanTrigram[] = [
	"li",
	"khon",
	"dwa",
	"khen",
	"kham",
	"gin",
	"zin",
	"zon",
];

const ELEMENTS: readonly TibetanElement[] = ["wood", "fire", "earth", "iron", "water"];

const ANIMALS: readonly TibetanAnimal[] = [
	"mouse",
	"ox",
	"tiger",
	"rabbit",
	"dragon",
	"snake",
	"horse",
	"sheep",
	"monkey",
	"bird",
	"dog",
	"pig",
];

const at = <T>(table: readonly T[], oneBased: number, what: string): T =>
	assertInternal(table[oneBased - 1], `${what}: index ${oneBased} is outside the cycle`);

/** What a calendar day carries in the Chinese system. */
export interface CalendarDayAttributes {
	/** The day's power element, from the ten-day cycle. */
	element: TibetanElement;
	/** Male when the Julian day number is odd. */
	gender: TibetanGender;
	/** The day's animal, on the twelve-day cycle. */
	animal: TibetanAnimal;
	/** The day's trigram, on the eight-day cycle. */
	trigram: TibetanTrigram;
	/** The day's number, 1–9. */
	number: number;
	/**
	 * The four further elements — life, body, fortune and spirit — which cycle every sixty days
	 * against the very same table the years use.
	 */
	elements: Pick<YearAttributes, "life" | "body" | "fortune" | "spirit">;
}

/**
 * Every attribute of the calendar day with Julian day number `julianDay`.
 *
 * @remarks
 * Janson gives each of these as a bare congruence on `JD`:
 *
 * ```text
 * element  ⌈JD/2⌉ amod 5      gender   male when JD is odd
 * animal   (JD + 2) amod 12   trigram  (JD + 2) amod 8
 * number   (−JD) amod 9
 * ```
 *
 * The four derived elements come from the **sixty-day** cycle, which is the same table as the
 * sixty-*year* one — a day takes the row at `(JD − 10) amod 60`, where a year takes `(Y − 3) amod
 * 60`. Only the offset differs, so {@link yearAttributes} is reused rather than reimplemented, and
 * the fixture that checks one checks the other.
 *
 * **Gender being male on odd days is a coincidence**, and Janson says so: it agrees with the Chinese
 * odd-is-*yang* rule, but Julian day numbers were not invented as part of Chinese astrology.
 */
export function calendarDayAttributes(julianDay: number): CalendarDayAttributes {
	const element = at(ELEMENTS, amod(ceilDiv(julianDay, 2), 5), "day element");
	const animal = at(ANIMALS, amod(julianDay + 2, 12), "day animal");
	const trigram = at(TRIGRAMS, amod(julianDay + 2, 8), "day trigram");

	// The same sixty-row table the years use, entered at a different offset. `yearAttributes` takes
	// a year, and `(Y − 3) amod 60` is its cycle position — so the year whose position matches this
	// day's is `JD − 10 + 3`.
	const { life, body, fortune, spirit } = yearAttributes(julianDay - 7);

	return {
		element,
		gender: amod(julianDay, 2) === 1 ? "male" : "female",
		animal,
		trigram,
		number: amod(-julianDay, 9),
		elements: { life, body, fortune, spirit },
	};
}
