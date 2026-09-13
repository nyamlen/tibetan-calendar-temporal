/**
 * The two types that belong to the `./astrology` **surface** rather than to any one computation.
 *
 * @remarks
 * Every other type here sits beside the arithmetic that produces it — `YearAttributes` in `year.ts`,
 * `MonthAttributes` in `month.ts`, and so on — because each is that module's answer. These two are
 * different: one is the shape of a question a caller asks, the other the shape of the composed
 * answer, and neither is produced by a single module.
 *
 * They live here rather than in the barrel for the reason `./observances` does the same: a barrel
 * re-exports, and `check:conventions` rule 13 compares the README's type lists against what each
 * barrel's `export type` blocks name. A type *declared* in a barrel is invisible to it, so declaring
 * one there would quietly leave it unguarded — which is how this file came to exist, the rule having
 * said so on 2026-09-12.
 *
 * @packageDocumentation
 */

import type { TraditionConfig } from "../traditions/types.js";
import type { TibetanDate } from "../types.js";
import type { CalendarDayAttributes } from "./calendar-day.js";
import type { LunarDayAttributes } from "./lunar-day.js";
import type { MonthAttributes } from "./month.js";
import type { YearAttributes } from "./year.js";
import type { ElementalYoga } from "./yoga.js";

/**
 * Which tradition's conventions to use.
 *
 * @remarks
 * An options bag rather than a positional parameter, matching `./observances` — the pattern this
 * package settled on 2026-08-26, so a caller never has to write `undefined` to skip one axis of
 * choice and reach another.
 */
export interface AstrologyQueryOptions {
	/** Astronomical constants and naming rules. Defaults to `PHUGPA`. */
	tradition?: TraditionConfig;
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
	/** The elemental yoga — the weekday's element paired with the lunar mansion's. */
	yoga: ElementalYoga;
}
