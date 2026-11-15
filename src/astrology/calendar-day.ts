/**
 * The attributes a *calendar day* carries — the sunrise-to-sunrise day, not the lunar one.
 *
 * @remarks
 * These run straight off the **Julian day number**, which makes them independent of the Tibetan
 * calendar entirely: no tradition, no month count, no leap months, and they can be asked of any day
 * at all. The element, gender, animal and trigram are identical in every version Janson gives.
 *
 * **The number is not.** Janson's remark under "Attributes for calendar days" states that Tsurphu
 * calendars assign it from the solstices instead — 5 on the first Wood–Mouse day after the true
 * astronomical winter solstice, counting up, and 4 after the summer solstice, counting down. That
 * rule is not modelled; the number here is the Julian-day congruence every shipped tradition uses.
 *
 * **A single day carries two sets of labels that disagree** — these, and the lunar day's. That is
 * not a defect to reconcile; almanacs print both. See [docs/astrology.md](../../docs/astrology.md).
 *
 * @packageDocumentation
 */

import { amod, ceilDiv } from "../computation/arithmetic.js";
import { ANIMALS, ELEMENTS, oneBasedAt } from "../cycle-tables.js";
import { deepFreeze } from "../freeze.js";
import { animalNameOf, elementNameOf, genderNameOf } from "../names.js";
import type { TibetanAnimal, TibetanElement, TibetanGender, TibetanName } from "../types.js";
import { type YearAttributes, yearAttributes } from "./year.js";

/**
 * The eight trigrams, by the English word Janson's table gives each, in his King Wen order.
 *
 * @remarks
 * His caption notes that the numbering "is perhaps not traditional" — it is his, and it is the one
 * his formulas index. The Tibetan name is on `tibetanNames.trigram`.
 *
 * **Five of these words are also elements** — fire, earth, iron, water, wood — and on the same day
 * `trigram` and `element` can differ: a lunar day of water element can fall on the fire trigram. They
 * are different attributes that share a vocabulary, which is why they are different types. The words
 * are Janson's; Das prints six of them for the trigram itself and *hill* and *tree* for the other two
 * — see `docs/names/mansion-and-trigram-sourcing.md`.
 */
export type TibetanTrigram =
	| "fire"
	| "earth"
	| "iron"
	| "sky"
	| "water"
	| "mountain"
	| "wood"
	| "wind";

/** Janson's order, numbered 1–8 as his formulas index it. Shared with the lunar day. */
export const TRIGRAMS: readonly TibetanTrigram[] = [
	"fire",
	"earth",
	"iron",
	"sky",
	"water",
	"mountain",
	"wood",
	"wind",
];

/**
 * The trigrams' Tibetan names, verified by `scripts/verify-mansion-and-trigram-names.mjs` and held
 * against its fixture by the suite. Frozen and shared, like every name object.
 */
export const TRIGRAM_NAMES: Readonly<Record<TibetanTrigram, TibetanName>> = deepFreeze({
	fire: { tibetan: "ལི", wylie: "li", phonetic: "li" },
	earth: { tibetan: "ཁོན", wylie: "khon", phonetic: "khön" },
	iron: { tibetan: "དྭ", wylie: "dwa", phonetic: "da" },
	sky: { tibetan: "ཁེན", wylie: "khen", phonetic: "khen" },
	water: { tibetan: "ཁམ", wylie: "kham", phonetic: "kham" },
	mountain: { tibetan: "གིན", wylie: "gin", phonetic: "gin" },
	wood: { tibetan: "ཟིན", wylie: "zin", phonetic: "zin" },
	wind: { tibetan: "ཟོན", wylie: "zon", phonetic: "zön" },
});

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
	/**
	 * The Tibetan name of every labelled attribute above, keyed by the field it names — `life` and the
	 * other three for the entries of `elements`.
	 */
	tibetanNames: {
		element: TibetanName;
		gender: TibetanName;
		animal: TibetanName;
		trigram: TibetanName;
		life: TibetanName;
		body: TibetanName;
		fortune: TibetanName;
		spirit: TibetanName;
	};
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
	const element = oneBasedAt(ELEMENTS, amod(ceilDiv(julianDay, 2), 5), "day element");
	const animal = oneBasedAt(ANIMALS, amod(julianDay + 2, 12), "day animal");
	const trigram = oneBasedAt(TRIGRAMS, amod(julianDay + 2, 8), "day trigram");

	// The same sixty-row table the years use, entered at a different offset. `yearAttributes` takes
	// a year, and `(Y − 3) amod 60` is its cycle position — so the year whose position matches this
	// day's is `JD − 10 + 3`.
	const { life, body, fortune, spirit, tibetanNames: cycle } = yearAttributes(julianDay - 7);
	const gender: TibetanGender = amod(julianDay, 2) === 1 ? "male" : "female";

	return {
		element,
		gender,
		animal,
		trigram,
		number: amod(-julianDay, 9),
		elements: { life, body, fortune, spirit },
		tibetanNames: {
			element: elementNameOf(element),
			gender: genderNameOf(gender),
			animal: animalNameOf(animal),
			trigram: TRIGRAM_NAMES[trigram],
			life: cycle.life,
			body: cycle.body,
			fortune: cycle.fortune,
			spirit: cycle.spirit,
		},
	};
}
