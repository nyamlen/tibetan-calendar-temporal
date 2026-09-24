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
 * `lunarDay`, while `calendarDay` differs and `yoga` can — see {@link attributesFor}.
 *
 * **Sourcing is not uniform across this subpath, and the docs say where each piece comes from.**
 * Janson gives every cycle and the mansion arithmetic; Henning gives the element each mansion
 * carries and the ten yoga names, which Janson cites and does not derive; **favorability is in
 * neither source** and is FPMT's; the *tshig mdzod chen mo* states the same ten yoga pairs and grades
 * the ten, which is `auspiciousness`. `docs/astrology.md` is the reader-facing account.
 *
 * **Two traditions answer and two refuse.** Janson tabulates no month-animal list for the Bhutanese
 * version, so {@link monthAttributesFor} and {@link lunarDayAttributesFor} throw
 * `TCT_ATTRIBUTE_NOT_SOURCED` for `BHUTAN` and `BHUTAN_HENNING` rather than handing over Phugpa's
 * answers. Everything else answers for every tradition.
 *
 * **The mansion table ships as `LUNAR_MANSIONS`**, all 27 in index order, mirroring `ELEMENTAL_YOGAS`.
 * It didn't ship until 2026-09-18: an early attempt exported three bare mansion names with no way to
 * learn a day's index, which was a dead export and was withdrawn the same day, 2026-09-12. The names
 * shipped once verified; a mansion has **no English name**, because no source prints one.
 *
 * **Every attribute block carries `tibetanNames`**, keyed by the English field it names —
 * `day.month.tibetanNames.animal` is the Tibetan for `day.month.animal`.
 *
 * @packageDocumentation
 */

import { trueMonthCount } from "../computation/calendar.js";
import { asWesternDay, isoToTibetan, julianDayFromIso } from "../computation/conversion.js";
import { yearFromRoyalEra } from "../computation/epoch.js";
import { scalingFor } from "../computation/scaling.js";
import { describe, rangeError } from "../errors.js";
import { deepFreeze } from "../freeze.js";
import { boundedMonth } from "../months.js";
import { weekdayNameWithOffset } from "../names.js";
import { PHUGPA } from "../traditions/phugpa.js";
import type { TraditionConfig } from "../traditions/types.js";
import type {
	TibetanDate,
	TibetanDateFields,
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
 * All 27 lunar mansions, in index order — the table `lunarMansionFor` looks a day's mansion up in.
 *
 * @remarks
 * Mirrors {@link ELEMENTAL_YOGAS}: a consumer building a reference view (a legend, a translation
 * table) can enumerate every mansion without needing a date for each one. Composed here, not in
 * `mansion-names.ts` or `mansion-elements.ts`, because those two modules are deliberately separate —
 * the names and the elements are Mahāvyutpatti-and-friends versus Henning, different sources — and
 * this table is the same merge {@link lunarMansionFor} does for a single index, run over all 27.
 *
 * @example
 * ```ts
 * LUNAR_MANSIONS[0].tibetanName.wylie;    // "tha skar"
 * LUNAR_MANSIONS[26].sanskritName.iast;   // "revatī"
 * ```
 */
export const LUNAR_MANSIONS: readonly LunarMansion[] = deepFreeze(
	Array.from({ length: MANSION_COUNT }, (_, index) => {
		const { tibetanName, sanskritName } = mansionNames(index);
		return { index, tibetanName, sanskritName, element: mansionElement(index) };
	}),
);

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
			`yearAttributesFor: year must be a safe integer, received ${describe(year)}. Years here are the ` +
				"royal era, matching TibetanDate.year — 2153, not 2026.",
		);
	}
	return yearAttributes(yearFromRoyalEra(year));
}

/**
 * The animal, gender, element and — in one tradition only — number of a Tibetan month.
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
 * `number` is `null` for Phugpa: Janson states that only Tsurphu calendars number their months.
 *
 * @throws RangeError with code `TCT_FIELD_OUT_OF_RANGE` for a non-integer or out-of-range field;
 * `TCT_INVALID_ARGUMENT` if `month` is not an object naming a Tibetan month;
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
	// Validated first, so a bad tradition is reported before a bad date, as it was when this took a bag.
	scalingFor(tradition);
	// The month tier's own guard: the shape, the year, the month number, the leap flag against the
	// year's actual leap month, and the exact range at both ends of the month.
	boundedMonth("monthAttributesFor", month, "month", tradition);

	return monthAttributes(tradition, yearFromRoyalEra(month.year), month.month);
}

/**
 * The animal, element, trigram and number of a lunar day.
 *
 * @remarks
 * `date.year` is the **royal era**, matching {@link TibetanDate.year} and {@link yearAttributesFor} —
 * not Janson's Gregorian `Y`.
 *
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
 * `TCT_INVALID_ARGUMENT` if `date` is not an object naming a Tibetan date;
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
	scalingFor(tradition);
	// The month tier's guard with the day range-checked alongside the other fields, and never a
	// conversion: a skipped day is a legitimate argument here, and `tibetanToIso` would refuse it.
	// So the month is bounded, not the day.
	boundedMonth("lunarDayAttributesFor", date, "date", tradition);

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
	return calendarDayAttributes(julianDayFromIso(isoOf("calendarDayAttributesFor", date)));
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
 * `favorable` comes from FPMT; `auspiciousness`, the four-way grading, from the *tshig mdzod chen mo*.
 *
 * **On a doubled date the two halves can get different yogas**, because their Julian days differ and
 * so do their weekday elements — though the mansion can move too, and the pair can land on the same
 * yoga. Pass the `Temporal.PlainDate` of the half you mean, or a resolved `TibetanDate` — which
 * carries `isLeapDay`, the flag that says which half it is.
 *
 * @throws RangeError with code `TCT_INVALID_ARGUMENT` for an argument that names no calendar day;
 * `TCT_INVALID_TRADITION_CONFIG` for an invalid `tradition`; `TCT_OUTSIDE_EXACT_RANGE` past the
 * tradition's exact range.
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
	scalingFor(tradition);
	const resolved = isoToTibetan(isoOf("elementalYogaFor", date), tradition);
	return yogaOf(resolved, tradition);
}

/**
 * The lunar mansion the moon is in at the start of a calendar day: its index, names and element.
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
	scalingFor(tradition);
	return lunarMansionOf(isoToTibetan(isoOf("lunarMansionFor", date), tradition), tradition);
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
 * the same for both — while they are two different calendar days, so `calendarDay` differs and
 * `yoga` can. Anyone who has not met the two-clocks point reads that as a bug; it is the point.
 *
 * @throws RangeError with code `TCT_INVALID_ARGUMENT` for an argument that names no calendar day;
 * `TCT_INVALID_TRADITION_CONFIG` for an invalid `tradition`; `TCT_OUTSIDE_EXACT_RANGE` past the
 * tradition's exact range. **Never**
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
	tradition: TraditionConfig = PHUGPA,
): DayAttributes {
	scalingFor(tradition);
	const resolved = isoToTibetan(isoOf("attributesFor", date), tradition);
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
	const { tibetanName, sanskritName } = mansionNames(index);
	return { index, tibetanName, sanskritName, element: mansionElement(index) };
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

/**
 * A `Temporal.PlainDate` from either accepted shape, rejecting loose fields by name.
 *
 * @remarks
 * A thin pass-through to {@link asWesternDay} so that each caller's message names itself. This was
 * a second copy of `navigation.ts`'s `phaseStart` until 2026-09-23, written when `./astrology`
 * landed because the existing helper was private to another module. Its message named four shapes
 * and never mentioned the resolved `TibetanDate` it accepts; `phaseStart`'s named two of four. Both
 * shipped in `dist/*.d.ts`.
 */
function isoOf(functionName: string, date: Temporal.PlainDate | TibetanDate): Temporal.PlainDate {
	return asWesternDay(functionName, date);
}
