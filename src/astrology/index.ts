/**
 * What kind of day a day is, after the appendix "Further astrological calculations" of Janson's paper.
 *
 * @remarks
 * The root entry point answers *which day it is*. This subpath answers *what the day is held to
 * be* — the labels an almanac prints beside the date, on cycles that repeat independently of each
 * other: five elements for the year, an animal, a gender and an element for the month, four more
 * labels for the lunar day, five for the calendar day, and one pairing that needs the moon's actual
 * position.
 *
 * ```ts
 * import { attributesFor } from "tibetan-calendar-temporal/astrology";
 *
 * const day = attributesFor(Temporal.PlainDate.from("2026-09-01"));
 * day.year.power;        // "fire" — the Tibetan year beginning in 2026 CE is a Fire Horse year
 * day.calendarDay.animal;
 * day.yoga?.englishName;     // "death" — the least auspicious of the ten
 * ```
 *
 * **A day carries two sets of labels that disagree**, and that is not a defect to reconcile:
 * almanacs print both. The lunar day is the thirtieth of a lunation; the calendar day is
 * sunrise-to-sunrise. On a **doubled** date the two halves share one lunar day and so share
 * `lunarDay`, while `calendarDay` differs and `yoga` can — see {@link attributesFor}.
 *
 * **Sourcing is not uniform across this subpath, and the docs say where each piece comes from.**
 * Janson gives every cycle and the mansion arithmetic; Henning gives the element each mansion
 * carries and the ten yoga names, which Janson cites and does not derive; **favorability is in
 * neither source** and is FPMT's; the *tshig mdzod chen mo* states the same ten yoga pairs and grades
 * the ten, which is `auspiciousness`. [`docs/astrology.md`](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/astrology.md) is the reader-facing account.
 *
 * **`PHUGPA` and `PHUGPA_HENNING` answer everything; `BHUTAN` and `BHUTAN_HENNING` refuse the
 * month-dependent attributes and the elemental yoga.**
 * Janson tabulates no month-animal list for the Bhutanese version, so
 * {@link monthAttributesFor} and {@link lunarDayAttributesFor} throw `TCT_ATTRIBUTE_NOT_SOURCED`
 * for the two Bhutanese configs rather than handing over Phugpa's answers. The elemental yoga is
 * refused too, by any tradition whose `naming.weekdayOffset` is nonzero — both Bhutanese configs —
 * because no source says what its weekday element is under that shift; {@link elementalYogaFor}
 * throws and {@link attributesFor} reports `null`. Everything else answers for every shipped
 * tradition.
 *
 * **The mansion table ships as `LUNAR_MANSIONS`**, all 27 in index order, mirroring `ELEMENTAL_YOGAS`.
 * A mansion has **no English name**, because no source prints one.
 *
 * **Every attribute block carries `tibetanNames`**, keyed by the English field it names —
 * `day.month.tibetanNames.animal` is the Tibetan for `day.month.animal`.
 *
 * @packageDocumentation
 */

import { trueMonthCount } from "../computation/calendar.js";
import {
	asWesternDay,
	isoToTibetan,
	julianDayFromIsoUnchecked,
} from "../computation/conversion.js";
import { attributesYearFromRoyalEra, yearFromRoyalEra } from "../computation/epoch.js";
import { scalingFor } from "../computation/scaling.js";
import { assertSafeYear, rangeError } from "../errors.js";
import { deepFreeze } from "../freeze.js";
import { boundedMonth } from "../months.js";
import { weekdayNameWithOffset } from "../names.js";
import { PHUGPA } from "../traditions/phugpa.js";
import type { TraditionConfig } from "../traditions/types.js";
import type {
	TibetanDate,
	TibetanDateFields,
	TibetanDateSnapshot,
	TibetanMonthFields,
	TibetanWeekdayElement,
} from "../types.js";
import { type CalendarDayAttributes, calendarDayAttributes } from "./calendar-day.js";
import { type LunarDayAttributes, lunarDayAttributes } from "./lunar-day.js";
import { mansionElement } from "./mansion-elements.js";
import { mansionNames } from "./mansion-names.js";
import { MANSION_COUNT, mansionNumber } from "./mansions.js";
import { type MonthAttributes, monthAttributes } from "./month.js";
import type { DayAttributes, LunarMansion } from "./types.js";
import { type YearAttributes, yearAttributes } from "./year.js";
import { type ElementalYoga, yogaForMansion } from "./yoga.js";

export type { CalendarDayAttributes, TibetanTrigram } from "./calendar-day.js";
export type { LunarDayAttributes } from "./lunar-day.js";
export type { MonthAttributes } from "./month.js";
export type { DayAttributes, LunarMansion } from "./types.js";
export type { YearAttributes } from "./year.js";
export type { ElementalYoga, YogaAuspiciousness } from "./yoga.js";
export { ELEMENTAL_YOGAS, elementalYoga } from "./yoga.js";

/**
 * Lists all 27 lunar mansions in index order, each with the fields `lunarMansionFor` returns.
 *
 * @remarks
 * Mirrors {@link ELEMENTAL_YOGAS}: a consumer building a reference view (a legend, a translation
 * table) can enumerate every mansion without needing a date for each one.
 *
 * @example
 * ```ts
 * LUNAR_MANSIONS[0].tibetanName.wylie;    // "tha skar"
 * LUNAR_MANSIONS[26].sanskritName.iast;   // "revatī"
 * ```
 */
// Composed here, not in `mansion-names.ts` or `mansion-elements.ts`, because those two modules are
// deliberately separate — the names are the Mahāvyutpatti's and its neighbours, the elements are
// Henning's, different sources — and this table is the same merge `lunarMansionFor` does for a
// single index, run over all 27.
export const LUNAR_MANSIONS: readonly LunarMansion[] = deepFreeze(
	Array.from({ length: MANSION_COUNT }, (_, index) => {
		const { tibetanName, sanskritName } = mansionNames(index);
		return { index, tibetanName, sanskritName, element: mansionElement(index) };
	}),
);

/**
 * Returns the five elements and three numbers of a Tibetan year.
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
 * yearAttributesFor(2153).fortune;     // "iron" — Horse years are iron; no year is "earth"
 * ```
 */
export function yearAttributesFor(year: number): YearAttributes {
	assertSafeYear(
		"yearAttributesFor",
		year,
		". Years here are the royal era, matching TibetanDate.year — 2153, not 2026.",
	);
	return yearAttributes(attributesYearFromRoyalEra(year));
}

/**
 * Returns the animal, gender, element and — in one tradition only — number of a Tibetan month.
 *
 * @remarks
 * `month.year` is the **royal era**, matching {@link TibetanDate.year} and {@link yearAttributesFor}
 * — not Janson's Gregorian `Y`, which this function converts to internally.
 *
 * **A leap month takes the same attributes as the regular month sharing its number**, which Janson
 * states outright. `isLeapMonth` is therefore accepted and validated like everywhere else in this
 * package, and makes no difference to the answer; it is not ignored silently, because a leap flag on
 * a year with no such leap month is still a caller error.
 *
 * `number` is `null` for `PHUGPA` and `PHUGPA_HENNING`: Janson states that only Tsurphu calendars
 * number their months.
 *
 * @throws RangeError with code `TCT_FIELD_OUT_OF_RANGE` for a `year` or `month` that is a number but
 * not an integer or is out of range;
 * `TCT_INVALID_ARGUMENT` if `month` is not an object naming a Tibetan month, or its `year` or
 * `month` is absent or not a number;
 * `TCT_INVALID_TRADITION_CONFIG` if `tradition` is not a valid config; `TCT_NO_SUCH_LEAP_MONTH`
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
	tradition: TraditionConfig = PHUGPA,
): MonthAttributes {
	// The month tier's own guard: the shape, the year, the month number, the leap flag against the
	// year's actual leap month, and the exact range at both ends of the month.
	const { fields, scaled } = boundedMonth("monthAttributesFor", month, "month", tradition);

	return monthAttributes(scaled.tradition, yearFromRoyalEra(fields.year), fields.month);
}

/**
 * Returns the animal, element, trigram and number of a lunar day.
 *
 * @remarks
 * `date.year` is the **royal era**, matching {@link TibetanDate.year} and {@link yearAttributesFor} —
 * not Janson's Gregorian `Y`.
 *
 * Takes the **Tibetan** `(year, month, day)` and never a Western date, which is deliberate in two
 * ways. There is no calendar ambiguity to resolve — a lunar day is a Tibetan notion, so loose fields
 * say everything — and it is what lets a **skipped** lunar day be asked about at all: the day no
 * calendar day carries still has an animal and an element, but `TibetanDate` cannot represent one.
 *
 * Three of the four labels reach back through the month, so all four refuse together where the
 * month's are unsourced. The refusal is coarse by exactly one field — the animal alone is
 * tradition-free.
 *
 * @throws RangeError with code `TCT_FIELD_OUT_OF_RANGE` for a `year`, `month` or `day` that is a
 * number but not an integer or is out of range;
 * `TCT_INVALID_ARGUMENT` if `date` is not an object naming a Tibetan date, or its `year`, `month`
 * or `day` is absent or not a number;
 * `TCT_INVALID_TRADITION_CONFIG` if `tradition` is not a valid config; `TCT_NO_SUCH_LEAP_MONTH`
 * if `isLeapMonth` is set for a month with no leap twin that year; `TCT_OUTSIDE_EXACT_RANGE` past the
 * tradition's exact range; or **`TCT_ATTRIBUTE_NOT_SOURCED`** for a tradition whose month attributes
 * no source gives.
 *
 * @example
 * ```ts
 * const day = lunarDayAttributesFor({ year: 2153, month: 1, day: 1 });
 * // { animal: "tiger", element: "water", trigram: "water", number: 7, tibetanNames: { … } }
 * day.tibetanNames.trigram.wylie; // "kham"
 * ```
 */
export function lunarDayAttributesFor(
	date: TibetanDateFields,
	tradition: TraditionConfig = PHUGPA,
): LunarDayAttributes {
	// The month tier's guard with the day range-checked alongside the other fields, and never a
	// conversion: a skipped day is a legitimate argument here, and `tibetanToIso` would refuse it.
	// So the month is bounded, not the day.
	const { fields, scaled } = boundedMonth("lunarDayAttributesFor", date, "date", tradition);
	const { year, month, day } = fields as TibetanDateSnapshot;

	return lunarDayAttributes(scaled.tradition, yearFromRoyalEra(year), month, day);
}

/**
 * Returns the element, gender, animal, trigram and number of a calendar day, plus four more elements.
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
	return calendarDayAttributes(julianDayFromIsoUnchecked(isoOf("calendarDayAttributesFor", date)));
}

/**
 * Returns the elemental yoga of a calendar day: the weekday's element paired with the mansion's.
 *
 * @remarks
 * **The one attribute here that needs astronomy.** The mansion is where the moon actually is at the
 * start of the calendar day, derived from the same true longitudes the calendar is built from, so
 * unlike every other cycle in this subpath it cannot be worked out with a table.
 *
 * The pair is unordered, which is Janson's definition: ten combinations rather than sixteen.
 * `favorable` comes from FPMT; `auspiciousness`, the four-way grading, from the *tshig mdzod chen mo*.
 *
 * **On a doubled date the two halves can get different yogas**, because their Julian days differ and
 * so do their weekday elements — though the mansion can move too, and the pair can land on the same
 * yoga. Pass the `Temporal.PlainDate` of the half you mean, or a resolved `TibetanDate` — which
 * carries `isLeapDay`, the flag that says which half it is.
 *
 * The mansion of a doubled date's first half follows a rule — the moon's longitude at the end of
 * the lunar day, less 1/27 of a circle — that has one source, Men-Tsee-Khang's 2013 almanac, as
 * Janson reports it. Under another tradition, applying it is an inference.
 *
 * **Refused under a shifted weekday.** A tradition whose `naming.weekdayOffset` is nonzero — `BHUTAN`
 * and `BHUTAN_HENNING` — moves the weekday, and no source says what the yoga pairs with then, so the
 * yoga throws rather than answering from either table. The mansion is unaffected.
 *
 * @throws RangeError with code `TCT_INVALID_ARGUMENT` for an argument that names no calendar day;
 * `TCT_INVALID_TRADITION_CONFIG` for an invalid `tradition`; `TCT_OUTSIDE_EXACT_RANGE` past the
 * tradition's exact range; or **`TCT_ATTRIBUTE_NOT_SOURCED`** for a tradition with a nonzero
 * `naming.weekdayOffset`.
 *
 * @example
 * ```ts
 * // 1 September 2026: a Tuesday, element fire, with the moon in a water mansion.
 * elementalYogaFor(Temporal.PlainDate.from("2026-09-01")).englishName; // "death"
 * ```
 */
export function elementalYogaFor(
	date: Temporal.PlainDate | TibetanDate,
	tradition: TraditionConfig = PHUGPA,
): ElementalYoga {
	const resolved = isoToTibetan(isoOf("elementalYogaFor", date), tradition);
	return yogaOf(resolved, scalingFor(tradition).tradition);
}

/**
 * Returns the lunar mansion the moon is in at the start of a calendar day: index, names, element.
 *
 * @remarks
 * **Needs astronomy**, like the yoga it drives: the mansion comes from the same true longitudes the
 * calendar is built from. **A published almanac can print a different mansion**, mostly on days when
 * the moon is late in its mansion: FPMT's calendars run slightly ahead of the computation Janson
 * describes, and no cause is established. How often, over which days and for which tradition is
 * stated once, in `docs/why-trust-these-dates.md`; cite it from there rather than restating it.
 *
 * `index` runs **0 to 26**, as both Janson and Henning number the mansions. There is no English name:
 * no source prints one, so `index` is what a translation table keys on.
 *
 * **On a doubled date the two halves can be in different mansions.** Pass the `Temporal.PlainDate` of
 * the half you mean, or a resolved `TibetanDate`, which carries `isLeapDay`. Loose `{ year, month,
 * day }` fields are refused, because that shape is a value of both calendars.
 *
 * The mansion of a doubled date's first half follows a rule — the moon's longitude at the end of
 * the lunar day, less 1/27 of a circle — that has one source, Men-Tsee-Khang's 2013 almanac, as
 * Janson reports it. Under another tradition, such as the Bhutanese, applying it is an inference.
 *
 * @throws RangeError with code `TCT_INVALID_ARGUMENT` for an argument that names no calendar day;
 * `TCT_INVALID_TRADITION_CONFIG` for an invalid `tradition`; `TCT_OUTSIDE_EXACT_RANGE` past the
 * tradition's exact range.
 *
 * @example
 * ```ts
 * // 1 September 2026: the Tuesday whose yoga is "death", fire against a water mansion.
 * const mansion = lunarMansionFor(Temporal.PlainDate.from("2026-09-01"));
 * mansion.element;             // "water"
 * mansion.sanskritName.iast;   // "revatī"
 * mansion.tibetanName.wylie;   // "nam gru"
 * ```
 */
export function lunarMansionFor(
	date: Temporal.PlainDate | TibetanDate,
	tradition: TraditionConfig = PHUGPA,
): LunarMansion {
	return lunarMansionOf(isoToTibetan(isoOf("lunarMansionFor", date), tradition), tradition);
}

/**
 * Returns everything this subpath knows about one calendar day.
 *
 * @remarks
 * The composition, for the almanac view that wants the whole row at once. The primitives **throw**
 * where this returns `null`: a specific question with no answer is an error, while "what is known
 * about this day" is not.
 *
 * **On a doubled date this is partly identical and partly different between the two halves, and
 * that is correct.** They share one Tibetan `(month, day)` — so `year`, `month` and `lunarDay` are
 * the same for both — while they are two different calendar days, so `calendarDay` differs and
 * `yoga` can. Anyone who has not met the two-clocks point reads that as a bug; it is the point.
 *
 * `lunarMansion` of the first half follows a rule that has one source, Men-Tsee-Khang's 2013
 * almanac, as Janson reports it: the moon's longitude is that at the end of the lunar day, less 1/27
 * of a circle. Under another tradition, such as the Bhutanese, applying it is an inference.
 *
 * @throws RangeError with code `TCT_INVALID_ARGUMENT` for an argument that names no calendar day;
 * `TCT_INVALID_TRADITION_CONFIG` for an invalid `tradition`; `TCT_OUTSIDE_EXACT_RANGE` past the
 * tradition's exact range. **Never**
 * `TCT_ATTRIBUTE_NOT_SOURCED`: this reports an unsourced attribute as `null` rather than refusing.
 *
 * @example
 * ```ts
 * const day = attributesFor(Temporal.PlainDate.from("2026-09-01"));
 * day.year.power;        // "fire"
 * day.yoga?.englishName; // "death"
 *
 * const bhutanese = attributesFor(Temporal.PlainDate.from("2026-09-01"), BHUTAN);
 * bhutanese.month;       // null: Janson gives no Bhutanese month-animal list
 * bhutanese.yoga;        // null: no source for the weekday element
 * ```
 */
export function attributesFor(
	date: Temporal.PlainDate | TibetanDate,
	tradition: TraditionConfig = PHUGPA,
): DayAttributes {
	const resolved = isoToTibetan(isoOf("attributesFor", date), tradition);
	tradition = scalingFor(tradition).tradition;
	const y = yearFromRoyalEra(resolved.year);

	// The one place in this subpath that reports rather than refuses. It asks whether the month
	// attributes are sourced instead of catching the refusal, so only the unsourced attributes
	// become a null, and every other error — a malformed config, a date out of range — still
	// propagates.
	const sourced = tradition.naming?.monthAnimals !== undefined;
	// Computed once and shared with the yoga, so the composition cannot report one mansion and a
	// yoga derived from another.
	const lunarMansion = lunarMansionOf(resolved, tradition);

	return {
		date: resolved,
		year: yearAttributes(y),
		month: sourced ? monthAttributes(tradition, y, resolved.month) : null,
		lunarDay: sourced ? lunarDayAttributes(tradition, y, resolved.month, resolved.day) : null,
		calendarDay: calendarDayAttributes(julianDayFromIsoUnchecked(resolved.isoDate)),
		lunarMansion,
		yoga: yogaIsSourced(tradition)
			? yogaForMansion(weekdayElementOf(resolved), lunarMansion.index)
			: null,
	};
}

/**
 * Whether the yoga's weekday element has a source under this tradition.
 *
 * Keyed on the config's `naming.weekdayOffset`, never on which tradition it is: a nonzero offset
 * moves the weekday, and no source says what the yoga pairs with then.
 */
function yogaIsSourced(tradition: TraditionConfig): boolean {
	return (tradition.naming?.weekdayOffset ?? 0) === 0;
}

/** The yoga of an already-resolved date, shared by the primitive; refuses where unsourced. */
function yogaOf(resolved: TibetanDate, tradition: TraditionConfig): ElementalYoga {
	if (!yogaIsSourced(tradition)) {
		throw rangeError(
			"TCT_ATTRIBUTE_NOT_SOURCED",
			`${tradition.name} has no sourced elemental yoga: it shifts the weekday by ` +
				`${tradition.naming?.weekdayOffset} and no source says what the yoga's weekday element is ` +
				"then. Nothing about the date you asked about is wrong — the attribute simply has no " +
				"source. The lunar mansion, and the year and calendar-day attributes, still answer",
		);
	}
	return yogaForMansion(weekdayElementOf(resolved), lunarMansionOf(resolved, tradition).index);
}

/** The mansion of an already-resolved date, shared by the compositions and the primitive. */
function lunarMansionOf(resolved: TibetanDate, tradition: TraditionConfig): LunarMansion {
	const scaled = scalingFor(tradition);
	const monthCount = trueMonthCount(
		scaled.tradition,
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
	const { tibetanName, sanskritName } = mansionNames(index);
	return { index, tibetanName, sanskritName, element: mansionElement(index) };
}

/** The weekday element the yoga pairs with the mansion's. */
function weekdayElementOf(resolved: TibetanDate): TibetanWeekdayElement {
	// Reached only under offset 0, where Janson's printed table is the answer. Offset **0** is passed
	// explicitly so that a caller who skipped `yogaIsSourced` would still read the printed table
	// rather than a shifted row nobody sources.
	return weekdayNameWithOffset(resolved.tibetanWeekday, 0).element;
}

/**
 * Returns a `Temporal.PlainDate` from either accepted shape, rejecting loose fields by name.
 *
 * @remarks
 * A thin pass-through to {@link asWesternDay} so that each caller's message names itself.
 */
function isoOf(functionName: string, date: Temporal.PlainDate | TibetanDate): Temporal.PlainDate {
	return asWesternDay(functionName, date);
}
