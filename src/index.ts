/**
 * Tibetan calendar computation, built on Temporal: the Phugpa and Bhutanese traditions.
 *
 * @remarks
 * Implemented from Svante Janson, *Tibetan Calendar Mathematics* (arXiv:1401.6285). Everything
 * is a pure function over plain objects: same input, same output, no side effects, no runtime
 * dependencies.
 *
 * ```ts
 * import { isoToTibetan, formatTibetanDate, yearNameFor } from "tibetan-calendar-temporal";
 *
 * const date = isoToTibetan(Temporal.PlainDate.from("2027-01-15"));
 * date.year;                  // 2153 — royal era, what an almanac prints
 * date.yearStartsIn;          // 2026 — Janson's Y, for cross-referencing the paper
 * yearNameFor(date.year);     // { element: 'fire', animal: 'horse', gender: 'male', … }
 * formatTibetanDate(date);    // "2153-M12-08"
 * ```
 *
 * Year-level naming is **not** a field on the date: reach it through {@link yearNameFor} and
 * {@link rabjungFor}, which are closed forms over `year`. {@link TibetanDate.weekdayName} is a
 * field, because it is the one name a date cannot regenerate from itself.
 *
 * Three things are worth knowing before relying on the output:
 *
 * - **`year` is the royal era**, not the Gregorian year the Tibetan year starts in. The two
 *   differ by 127 and are both exposed.
 * - **Skipped dates throw.** Some date numbers reach no calendar day at all; `tibetanToIso` and the
 *   other functions that resolve a date raise {@link SkippedDayError}, and
 *   {@link tibetanDateExists} is the predicate. Every other failure carries a
 *   {@link TibetanCalendarErrorCode} and is a `RangeError`, except `TCT_INTERNAL` and
 *   `TCT_MISSING_TEMPORAL`, which are plain `Error`s — branch on `error.code`, never on the
 *   message text.
 * - **Dates before 1447 CE are back-projections.** Phugpa did not exist earlier, the royal-era
 *   numbering is a modern convention, and `Temporal.PlainDate` is proleptic Gregorian where
 *   historical sources are Julian.
 *
 * ## Observances are on a separate subpath
 *
 * `getObservances`, `observancesOn` and the `EXAMPLE_OBSERVANCES` config are **not** exported here.
 * They live on `tibetan-calendar-temporal/observances`, and importing them from the root fails at
 * module load:
 *
 * ```ts
 * import { getObservances, EXAMPLE_OBSERVANCES } from "tibetan-calendar-temporal/observances";
 * ```
 *
 * The split is not packaging tidiness. Everything on this entry point makes a **falsifiable** claim
 * — a constant checks against Janson, a date against an almanac, and a disagreement is a bug.
 * Nothing in the observance layer does: published sources legitimately disagree about which day an
 * institution keeps, so those conventions are injected config rather than engine logic.
 *
 * @packageDocumentation
 */

// `rabjung` and `yearName` are not fields of `TibetanDate` because both are closed forms over `year`,
// so a date carrying them repeated one value across every day of its year (354 to 385 days).

export {
	isoFromJulianDay,
	isoToTibetan,
	julianDayFromIso,
	losarFor,
	tibetanDateExists,
	tibetanToIso,
	tibetanWeekday,
} from "./computation/conversion.js";
export {
	rabjungFor,
	weekdayNameFor,
	yearNameFor,
} from "./cycles.js";
export type { TibetanCalendarErrorCode } from "./errors.js";
export { formatTibetanDate, formatTibetanMonth } from "./format.js";
export type { FourSeasonMonthName, MonthNames, SixSeasonMonthName } from "./month-names.js";
export { monthNamesFor } from "./month-names.js";
export {
	datesFor,
	daysInMonth,
	hasLeapMonth,
	leapMonthNumberFor,
	monthsFor,
	monthsInYear,
	resolveMonth,
} from "./months.js";
export type { AddMonthsToDateOptions, MonthOverflow } from "./navigation.js";
export {
	addDays,
	addMonths,
	addMonthsToDate,
	daysBetween,
	lunationFromMonth,
	monthFromLunation,
	monthsBetween,
	nextFullMoon,
	nextNewMoon,
	resolveDate,
} from "./navigation.js";
export { parseTibetanDate, parseTibetanMonth } from "./parse.js";
export { BHUTAN, BHUTAN_HENNING } from "./traditions/bhutan.js";
export { PHUGPA, PHUGPA_HENNING } from "./traditions/phugpa.js";
export type {
	MeanMotion,
	Rational,
	TraditionConfig,
	TraditionMonthAnimals,
	TraditionNaming,
	TraditionNineNumbers,
} from "./traditions/types.js";
export type {
	Rabjung,
	SanskritName,
	TibetanAnimal,
	TibetanDate,
	TibetanDateFields,
	TibetanElement,
	TibetanGender,
	TibetanMonth,
	TibetanMonthFields,
	TibetanName,
	TibetanPlanet,
	TibetanWeekday,
	TibetanWeekdayElement,
	TibetanWeekdayName,
	TibetanYearName,
} from "./types.js";
export { asTibetanWeekday, SkippedDayError } from "./types.js";
