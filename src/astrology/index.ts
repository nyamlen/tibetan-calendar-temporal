/**
 * Janson's Appendix E: what kind of day a day is.
 *
 * @remarks
 * The root entry point answers *which day it is*. This subpath answers *what the day is held to
 * be* — the labels an almanac prints beside the date, on cycles that repeat independently of each
 * other: five elements for the year, an animal and an element for the month, four more labels for
 * the lunar day, five for the calendar day, and one pairing that needs the moon's actual position.
 *
 * ```ts
 * import { attributesFor } from "tibetan-calendar-temporal/astrology";
 *
 * const day = attributesFor(Temporal.PlainDate.from("2026-09-01"));
 * day.year.power;        // "fire" — 2026 is a Fire Horse year
 * day.calendarDay.animal;
 * day.yoga.englishName;      // "death" — the least auspicious of the ten
 * ```
 *
 * **A day carries two sets of labels that disagree**, and that is not a defect to reconcile:
 * almanacs print both. The lunar day is the thirtieth of a lunation; the calendar day is
 * sunrise-to-sunrise. On a **doubled** date the two halves share one lunar day and so share
 * `lunarDay`, while `calendarDay` and `yoga` differ — see {@link attributesFor}.
 *
 * **Sourcing is not uniform across this subpath, and the docs say where each piece comes from.**
 * Janson gives every cycle and the mansion arithmetic; Henning gives the element each mansion
 * carries and the ten yoga names, which Janson cites and does not derive; **favorability is in
 * neither source** and is FPMT's alone. `docs/astrology.md` is the reader-facing account.
 *
 * **Two traditions answer and two refuse.** Janson tabulates no month-animal list for the Bhutanese
 * version, so {@link monthAttributesFor} and {@link lunarDayAttributesFor} throw
 * `TCT_ATTRIBUTE_NOT_SOURCED` for `BHUTAN` and `BHUTAN_HENNING` rather than handing over Phugpa's
 * answers. Everything else answers for every tradition.
 *
 * **The mansion is exposed for a date, and only for a date.** {@link lunarMansionFor} gives its index
 * and element. The element table on its own is not exported, because a consumer holding it with no
 * way to learn a day's index would have a dead export — which is how three mansion names came to be
 * exported on 2026-09-12 and withdrawn the same day. The mansions' **names** are not shipped yet; they
 * need the same verification as every other name here.
 *
 * @packageDocumentation
 */

import { trueMonthCount } from "../computation/calendar.js";
import { asPlainDate, isoToTibetan, julianDayFromIso } from "../computation/conversion.js";
import { yearFromRoyalEra } from "../computation/epoch.js";
import { scalingFor } from "../computation/scaling.js";
import { rangeError } from "../errors.js";
import { daysInMonth } from "../months.js";
import { weekdayNameWithOffset } from "../names.js";
import { PHUGPA } from "../traditions/phugpa.js";
import type { TraditionConfig } from "../traditions/types.js";
import {
	rejectInvalidLeapFlags,
	rejectMissingFields,
	rejectTemporalInstance,
	type TibetanDate,
	type TibetanDateFields,
	type TibetanMonthFields,
	type TibetanWeekdayElement,
} from "../types.js";
import { type CalendarDayAttributes, calendarDayAttributes } from "./calendar-day.js";
import { type LunarDayAttributes, lunarDayAttributes } from "./lunar-day.js";
import { mansionElement } from "./mansion-elements.js";
import { mansionNumber } from "./mansions.js";
import { type MonthAttributes, monthAttributes } from "./month.js";
import type { AstrologyQueryOptions, DayAttributes, LunarMansion } from "./types.js";
import { type YearAttributes, yearAttributes } from "./year.js";
import { type ElementalYoga, yogaForMansion } from "./yoga.js";

export type { CalendarDayAttributes, TibetanTrigram } from "./calendar-day.js";
export type { LunarDayAttributes } from "./lunar-day.js";
export type { MonthAttributes } from "./month.js";
export type { AstrologyQueryOptions, DayAttributes, LunarMansion } from "./types.js";
export type { YearAttributes } from "./year.js";
export type { ElementalYoga } from "./yoga.js";
export { ELEMENTAL_YOGAS, elementalYoga } from "./yoga.js";

function assertQueryOptions(functionName: string, options: unknown): void {
	// `=== undefined`, never `??`: nullish-coalescing would read an explicit `{ tradition: null }` as
	// absent and silently substitute PHUGPA, losing the validation a positional parameter had.
	//
	// No `undefined` arm in the message, and that is what the coverage report is for: every caller
	// defaults the parameter to `{}`, so an omitted — or explicitly `undefined` — options object never
	// reaches here. `./observances`'s copy of this guard still carries that arm; it is harmless there
	// and dead for the same reason.
	if (options === null || typeof options !== "object") {
		throw rangeError(
			"TCT_INVALID_ARGUMENT",
			`${functionName}: options must be an object like { tradition } or omitted, received ` +
				JSON.stringify(options),
		);
	}
}

function traditionFrom(functionName: string, options: AstrologyQueryOptions): TraditionConfig {
	assertQueryOptions(functionName, options);
	const tradition = options.tradition === undefined ? PHUGPA : options.tradition;
	// Validates the config and memoises the scaling, exactly as every other entry point does.
	scalingFor(tradition);
	return tradition;
}

/**
 * The five elements and three numbers of a Tibetan year.
 *
 * @remarks
 * Takes the **royal era** — 2153, not 2026 — matching `TibetanDate.year` and `yearNameFor`. The
 * conversion to Janson's Gregorian `Y` happens here.
 *
 * **No tradition, and no calendar.** Every formula is a closed form on the year alone, so this
 * answers for years where evaluating the calendar itself must refuse, and a year picker rendering a
 * century can call it a hundred times without touching the astronomy.
 *
 * The year's name gives one of the five elements. The other four sit on their own cycles and
 * routinely disagree with it: 2153 is a Fire Horse year whose life element is fire but whose body
 * element is water.
 *
 * @param year - Royal-era year, matching {@link TibetanDate.year}.
 *
 * @throws RangeError with code `TCT_FIELD_OUT_OF_RANGE` if `year` is not a safe integer.
 *
 * @example
 * ```ts
 * yearAttributesFor(2153).power;       // "fire"
 * yearAttributesFor(2153).fortune;     // "water" — and never "earth", for any year
 * ```
 */
export function yearAttributesFor(year: number): YearAttributes {
	if (!Number.isSafeInteger(year)) {
		throw rangeError(
			"TCT_FIELD_OUT_OF_RANGE",
			`yearAttributesFor: year must be a safe integer, received ${year}. Years here are the ` +
				"royal era, matching TibetanDate.year — 2153, not 2026.",
		);
	}
	return yearAttributes(yearFromRoyalEra(year));
}

/**
 * The animal, gender, element and — in one tradition only — number of a Tibetan month.
 *
 * @remarks
 * **A leap month takes the same attributes as the regular month sharing its number**, which Janson
 * states outright. `isLeapMonth` is therefore accepted and validated like everywhere else in this
 * package, and makes no difference to the answer; it is not ignored silently, because a leap flag on
 * a year with no such leap month is still a caller error.
 *
 * `number` is `null` for Phugpa: Janson states that only Tsurphu calendars number their months.
 *
 * @throws RangeError with code `TCT_FIELD_OUT_OF_RANGE` for a non-integer or out-of-range field;
 * `TCT_INVALID_ARGUMENT` if `month` is not an object naming a Tibetan month; `TCT_NO_SUCH_LEAP_MONTH`
 * if `isLeapMonth` is set for a month with no leap twin that year; `TCT_OUTSIDE_EXACT_RANGE` past the
 * tradition's exact range; or **`TCT_ATTRIBUTE_NOT_SOURCED`** for a tradition whose month attributes
 * no source gives — `BHUTAN` and `BHUTAN_HENNING`, today.
 *
 * @example
 * ```ts
 * // Phugpa. Month 1 of the Fire Horse year beginning in 2026.
 * monthAttributesFor({ year: 2153, month: 1 });
 * // { animal: "dragon", gender: "male", element: "iron", number: null }
 * ```
 */
export function monthAttributesFor(
	month: TibetanMonthFields,
	options: AstrologyQueryOptions = {},
): MonthAttributes {
	const tradition = traditionFrom("monthAttributesFor", options);
	rejectTemporalInstance("monthAttributesFor", month);
	rejectInvalidLeapFlags("monthAttributesFor", month);
	rejectMissingFields("monthAttributesFor", month, ["year", "month"]);

	// Borrowed wholesale rather than reimplemented: this validates the year, the month number, the
	// leap flag against the year's actual leap month, and the tradition's exact range, in the one
	// place those rules live. The returned length is discarded.
	daysInMonth(month, tradition);

	return monthAttributes(tradition, yearFromRoyalEra(month.year), month.month);
}

/**
 * The animal, element, trigram and number of a lunar day.
 *
 * @remarks
 * Takes the **Tibetan** `(year, month, day)` and never a Western date, which is deliberate in two
 * ways. There is no calendar ambiguity to resolve — a lunar day is a Tibetan notion, so loose fields
 * say everything — and it is what lets a **skipped** lunar day be asked about at all: the day no
 * calendar day carries still has an animal and an element, and an almanac prints them, but
 * `TibetanDate` cannot represent one.
 *
 * Three of the four labels reach back through the month, so all four refuse together where the
 * month's are unsourced. The refusal is coarse by exactly one field — the animal alone is
 * tradition-free.
 *
 * @throws RangeError with code `TCT_FIELD_OUT_OF_RANGE` for a non-integer or out-of-range field;
 * `TCT_INVALID_ARGUMENT` if `date` is not an object naming a Tibetan date; `TCT_NO_SUCH_LEAP_MONTH`
 * if `isLeapMonth` is set for a month with no leap twin that year; `TCT_OUTSIDE_EXACT_RANGE` past the
 * tradition's exact range; or **`TCT_ATTRIBUTE_NOT_SOURCED`** for a tradition whose month attributes
 * no source gives.
 *
 * @example
 * ```ts
 * lunarDayAttributesFor({ year: 2153, month: 1, day: 1 });
 * // { animal: "tiger", element: "water", trigram: "kham", number: 7 }
 * ```
 */
export function lunarDayAttributesFor(
	date: TibetanDateFields,
	options: AstrologyQueryOptions = {},
): LunarDayAttributes {
	const tradition = traditionFrom("lunarDayAttributesFor", options);
	rejectTemporalInstance("lunarDayAttributesFor", date);
	rejectInvalidLeapFlags("lunarDayAttributesFor", date);
	rejectMissingFields("lunarDayAttributesFor", date, ["year", "month", "day"]);

	// The month's own validation, which covers the year, the month number, the leap flag and the
	// exact range. The day is checked here rather than through a conversion, because a skipped day is
	// a legitimate argument to this function and `tibetanToIso` would refuse it.
	daysInMonth(date, tradition);
	if (!Number.isInteger(date.day) || date.day < 1 || date.day > 30) {
		throw rangeError(
			"TCT_FIELD_OUT_OF_RANGE",
			`lunarDayAttributesFor: day must be an integer 1-30, received ${date.day}. A lunar month ` +
				"always has thirty lunar days, even where the calendar skips one of them",
		);
	}

	return lunarDayAttributes(tradition, yearFromRoyalEra(date.year), date.month, date.day);
}

/**
 * The element, gender, animal, trigram and number of a calendar day, plus its four cycle elements.
 *
 * @remarks
 * Every one of these is a congruence on the **Julian day**, so they can be asked of any day at all —
 * no tradition parameter, and no month count. The element, gender, animal and trigram are identical
 * in every version Janson gives; the **number** is identical in every shipped tradition, but Tsurphu
 * calendars assign it from the solstices, which is not modelled.
 *
 * Takes a `Temporal.PlainDate` or a resolved {@link TibetanDate}, and **not** loose
 * `{ year, month, day }` fields: that shape is a genuine value of both calendars, so accepting it
 * would silently resolve an ambiguity this package refuses everywhere else.
 *
 * @throws RangeError with code `TCT_INVALID_ARGUMENT` if `date` is neither a `Temporal.PlainDate`
 * (or `PlainDateTime`/`ZonedDateTime`/ISO string) nor a resolved Tibetan date carrying `isoDate`.
 *
 * @example
 * ```ts
 * calendarDayAttributesFor(Temporal.PlainDate.from("2026-09-01")).gender; // "male" on odd JDs
 * ```
 */
export function calendarDayAttributesFor(
	date: Temporal.PlainDate | TibetanDate,
): CalendarDayAttributes {
	return calendarDayAttributes(julianDayFromIso(isoOf(date)));
}

/**
 * The elemental yoga of a calendar day: the weekday's element paired with the lunar mansion's.
 *
 * @remarks
 * **The one attribute here that needs astronomy.** The mansion is where the moon actually is at the
 * start of the calendar day, derived from the same true longitudes the calendar is built from, so
 * unlike every other cycle in this subpath it cannot be worked out with a table.
 *
 * The pair is unordered, which is Janson's definition: ten combinations rather than sixteen.
 * Favorability comes from FPMT and from no other source.
 *
 * **On a doubled date the two halves get different yogas**, because their Julian days differ and so
 * do their weekday elements. Pass the `Temporal.PlainDate` of the half you mean, or a resolved
 * `TibetanDate` — which carries `isLeapDay`, the flag that says which half it is.
 *
 * @throws RangeError with code `TCT_INVALID_ARGUMENT` for an argument that names no calendar day;
 * `TCT_OUTSIDE_EXACT_RANGE` past the tradition's exact range.
 *
 * @example
 * ```ts
 * // 1 September 2026: a Tuesday, element fire, with the moon in a water mansion.
 * elementalYogaFor(Temporal.PlainDate.from("2026-09-01")).englishName; // "death"
 * ```
 */
export function elementalYogaFor(
	date: Temporal.PlainDate | TibetanDate,
	options: AstrologyQueryOptions = {},
): ElementalYoga {
	const tradition = traditionFrom("elementalYogaFor", options);
	const resolved = isoToTibetan(isoOf(date), tradition);
	return yogaOf(resolved, tradition);
}

/**
 * The lunar mansion the moon is in at the start of a calendar day: its index and its element.
 *
 * @remarks
 * **Needs astronomy**, like the yoga it drives: the mansion comes from the same true longitudes the
 * calendar is built from. **It is not exact against an almanac**: Janson's formula approximates the
 * moon's motion, so days near a mansion boundary can disagree. How often, over which days and for which
 * tradition is stated once, in `docs/why-trust-these-dates.md`; cite it from there rather than
 * restating it.
 *
 * `index` runs **0 to 26**, as both Janson and Henning number the mansions. Names are not shipped yet.
 *
 * **On a doubled date the two halves can be in different mansions.** Pass the `Temporal.PlainDate` of
 * the half you mean, or a resolved `TibetanDate`, which carries `isLeapDay`. Loose `{ year, month,
 * day }` fields are refused, because that shape is a value of both calendars.
 *
 * @throws RangeError with code `TCT_INVALID_ARGUMENT` for an argument that names no calendar day;
 * `TCT_INVALID_TRADITION_CONFIG` for an invalid `tradition`; `TCT_OUTSIDE_EXACT_RANGE` past the
 * tradition's exact range.
 *
 * @example
 * ```ts
 * // 1 September 2026: the Tuesday whose yoga is "death", fire against a water mansion.
 * lunarMansionFor(Temporal.PlainDate.from("2026-09-01")).element; // "water"
 * ```
 */
export function lunarMansionFor(
	date: Temporal.PlainDate | TibetanDate,
	options: AstrologyQueryOptions = {},
): LunarMansion {
	const tradition = traditionFrom("lunarMansionFor", options);
	return lunarMansionOf(isoToTibetan(isoOf(date), tradition), tradition);
}

/**
 * Everything this subpath knows about one calendar day.
 *
 * @remarks
 * The composition, for the almanac view that wants the whole row at once. The primitives **throw**
 * where this returns `null`: a specific question with no answer is an error, while "what is known
 * about this day" is not.
 *
 * **On a doubled date this is partly identical and partly different between the two halves, and
 * that is correct.** They share one Tibetan `(month, day)` — so `year`, `month` and `lunarDay` are
 * the same for both — while they are two different calendar days, so `calendarDay` and `yoga`
 * differ. Anyone who has not met the two-clocks point reads that as a bug; it is the point.
 *
 * @throws RangeError with code `TCT_INVALID_ARGUMENT` for an argument that names no calendar day;
 * `TCT_OUTSIDE_EXACT_RANGE` past the tradition's exact range. **Never**
 * `TCT_ATTRIBUTE_NOT_SOURCED`: this reports an unsourced attribute as `null` rather than refusing.
 *
 * @example
 * ```ts
 * const day = attributesFor(Temporal.PlainDate.from("2026-09-01"));
 * day.year.power;   // "fire"
 * day.yoga.englishName; // "death"
 * day.month;        // null under BHUTAN, where Janson gives no month-animal list
 * ```
 */
export function attributesFor(
	date: Temporal.PlainDate | TibetanDate,
	options: AstrologyQueryOptions = {},
): DayAttributes {
	const tradition = traditionFrom("attributesFor", options);
	const resolved = isoToTibetan(isoOf(date), tradition);
	const y = yearFromRoyalEra(resolved.year);

	// The one place in this subpath that reports rather than refuses, so the refusal is caught here
	// and nowhere else. Narrow: only the unsourced-attribute code becomes a null, and every other
	// error — a malformed config, a date out of range — still propagates.
	const sourced = tradition.naming?.monthAnimals !== undefined;
	// Computed once and shared with the yoga, so the composition cannot report one mansion and a
	// yoga derived from another.
	const lunarMansion = lunarMansionOf(resolved, tradition);

	return {
		date: resolved,
		year: yearAttributes(y),
		month: sourced ? monthAttributes(tradition, y, resolved.month) : null,
		lunarDay: sourced ? lunarDayAttributes(tradition, y, resolved.month, resolved.day) : null,
		calendarDay: calendarDayAttributes(julianDayFromIso(resolved.isoDate)),
		lunarMansion,
		yoga: yogaForMansion(weekdayElementOf(resolved), lunarMansion.index),
	};
}

/** The yoga of an already-resolved date, shared by the composition and the primitive. */
function yogaOf(resolved: TibetanDate, tradition: TraditionConfig): ElementalYoga {
	return yogaForMansion(weekdayElementOf(resolved), lunarMansionOf(resolved, tradition).index);
}

/** The mansion of an already-resolved date, shared by the compositions and the primitive. */
function lunarMansionOf(resolved: TibetanDate, tradition: TraditionConfig): LunarMansion {
	const scaled = scalingFor(tradition);
	const monthCount = trueMonthCount(
		tradition,
		yearFromRoyalEra(resolved.year),
		resolved.month,
		resolved.isLeapMonth,
	);
	// `isLeapDay` is what distinguishes the two halves of a doubled pair, and nothing below the
	// calendar day can: they share a Tibetan date. Omitting it answers the second half's yoga for
	// both days, which is wrong for the first and was measured wrong on 19 of 31 such days.
	// `test/astrology/index.test.ts` pins both halves' yogas by VALUE for this reason: asserting only
	// that the two differ cannot fail here, since their weekday elements differ either way.
	const index = mansionNumber(scaled, resolved.day, monthCount, resolved.isLeapDay);
	return { index, element: mansionElement(index) };
}

/** The weekday element the yoga pairs with the mansion's. */
function weekdayElementOf(resolved: TibetanDate): TibetanWeekdayElement {
	// Offset **0**, deliberately, rather than `weekdayNameFor(…, tradition)` — which would apply
	// `naming.weekdayOffset` and hand Bhutan a different yoga on most days. Janson gives the yoga's
	// weekday element in one table, states Bhutan's name shift separately as a naming feature, and
	// never revisits the yoga for it; so following the shifted *name* here would be an inference
	// nobody has published, on a surface that freezes at 1.0.0 and whose only external validation is
	// Phugpa. Taking his printed table instead is the sourced answer, and it keeps two claims true
	// that were briefly false: `TraditionNaming.weekdayOffset`'s "applies to the name only", and
	// `docs/astrology.md`'s "the yoga varies only through the mansion".
	return weekdayNameWithOffset(resolved.tibetanWeekday, 0).element;
}

/** A `Temporal.PlainDate` from either accepted shape, rejecting loose fields by name. */
function isoOf(date: Temporal.PlainDate | TibetanDate): Temporal.PlainDate {
	const candidate: unknown = date;
	if (
		candidate !== null &&
		typeof candidate === "object" &&
		!(candidate instanceof Temporal.PlainDate) &&
		"isoDate" in candidate
	) {
		// A resolved TibetanDate says which calendar it means, so it is accepted; a bare
		// { year, month, day } is a value of both calendars and is not.
		return asPlainDate((candidate as TibetanDate).isoDate);
	}
	return asPlainDate(date as Temporal.PlainDate);
}
