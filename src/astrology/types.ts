/**
 * The two types of the `./astrology` surface that no one computation produces.
 *
 * @remarks
 * Every other type here sits beside the arithmetic that produces it — `YearAttributes` in `year.ts`,
 * `MonthAttributes` in `month.ts`, and so on — because each is that module's answer. These two are
 * different: `LunarMansion` is composed from three sources, and `DayAttributes` is the composed
 * answer of `attributesFor`. A third, `AstrologyQueryOptions`, lived here until 2026-09-24, when
 * the tradition became a positional parameter.
 *
 * They live here rather than in the barrel for the reason `./observances` does the same: a barrel
 * re-exports, and `check:conventions` rule 13 compares the README's type lists against what each
 * barrel's `export type` blocks name. A type *declared* in a barrel is invisible to it, so declaring
 * one there would quietly leave it unguarded — which is how this file came to exist, the rule having
 * said so on 2026-09-12.
 *
 * @packageDocumentation
 */

import type { SanskritName, TibetanDate, TibetanName, TibetanWeekdayElement } from "../types.js";
import type { CalendarDayAttributes } from "./calendar-day.js";
import type { LunarDayAttributes } from "./lunar-day.js";
import type { MonthAttributes } from "./month.js";
import type { YearAttributes } from "./year.js";
import type { ElementalYoga } from "./yoga.js";

/**
 * The lunar mansion the moon is in at the start of a calendar day.
 *
 * @remarks
 * Composed from three sources, which is why it is declared here rather than beside any one: Janson
 * gives the arithmetic that finds the mansion, Henning the element each mansion carries, and the
 * dictionaries `docs/names/mansion-and-trigram-sourcing.md` records the names.
 *
 * **No English name, deliberately.** No source prints one for a mansion, and translating either name
 * would pair English with a Tibetan word it does not render. `index` is the key a translation table
 * maps from.
 *
 * Not exact against an almanac; see `lunarMansionFor` for why, and `docs/why-trust-these-dates.md`
 * for how often.
 */
export interface LunarMansion {
	/**
	 * The mansion, **0 to 26**: 0 is Aśvinī, 26 Revatī.
	 *
	 * @remarks
	 * Zero-based because both sources number them so: Janson "from 0 to 26", and Henning's list, headed
	 * *Index*, from 0. Henning's list has 28 entries, two of them at 21 — Śravaṇa and Abhijit — and this
	 * numbering is the 27 without Abhijit.
	 */
	index: number;
	/** The mansion's Tibetan name — *tha skar* at 0, *nam gru* at 26. */
	tibetanName: TibetanName;
	/**
	 * The mansion's Sanskrit name, as the Mahāvyutpatti gives it reduced to its stem.
	 *
	 * @remarks
	 * At 22 and 23 the pairing follows Das — Dhaniṣṭhā then Śatabhiṣā — where the Mahāvyutpatti lists
	 * them the other way round.
	 */
	sanskritName: SanskritName;
	/** The mansion's element, from Henning's table: one of the four Indian elements, as for a weekday. */
	element: TibetanWeekdayElement;
}

/** Everything this subpath knows about one calendar day. */
export interface DayAttributes {
	/** The resolved Tibetan date these attributes belong to. */
	date: TibetanDate;
	/** The year's five elements and three numbers. */
	year: YearAttributes;
	/**
	 * The month's animal, gender and element, or `null` where the tradition is unsourced.
	 *
	 * @remarks
	 * `null` only for the Bhutanese configs, and it is a positive statement — "nobody has published
	 * this" — rather than an optional field. The primitives **throw** where this reports `null`,
	 * because a specific question with no answer is an error while "what is known about this day" is
	 * not.
	 */
	month: MonthAttributes | null;
	/** The lunar day's four labels, or `null` where the tradition is unsourced. */
	lunarDay: LunarDayAttributes | null;
	/** The calendar day's own labels; Julian-day congruences, the same in every shipped tradition. */
	calendarDay: CalendarDayAttributes;
	/** The lunar mansion at the start of the calendar day. */
	lunarMansion: LunarMansion;
	/**
	 * The elemental yoga — the weekday's element paired with the lunar mansion's — or `null` where
	 * the tradition shifts the weekday (`naming.weekdayOffset` nonzero, as both Bhutanese configs
	 * do) and no source says what the yoga's weekday element is then.
	 */
	yoga: ElementalYoga | null;
}
