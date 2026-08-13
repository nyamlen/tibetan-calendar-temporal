/**
 * Tibetan calendar (Phugpa tradition) computation, built on Temporal.
 *
 * @remarks
 * Implemented from Svante Janson, *Tibetan Calendar Mathematics* (arXiv:1401.6285). Everything
 * is a pure function over plain objects: same input, same output, no side effects, no runtime
 * dependencies.
 *
 * ```ts
 * import { isoToTibetan, formatTibetanDate } from "tibetan-calendar-temporal";
 *
 * const date = isoToTibetan(Temporal.PlainDate.from("2027-01-15"));
 * date.year;                  // 2153 — royal era, what an almanac prints
 * date.yearStartsIn;          // 2026 — Janson's Y, for cross-referencing the paper
 * date.yearName;              // { element: 'fire', animal: 'horse', gender: 'male' }
 * formatTibetanDate(date);    // "2153-M12-08"
 * ```
 *
 * Three things are worth knowing before relying on the output:
 *
 * - **`year` is the royal era**, not the Gregorian year the Tibetan year starts in. The two
 *   differ by 127 and are both exposed.
 * - **Skipped dates throw.** Some date numbers reach no calendar day at all; `tibetanToIso`
 *   raises {@link SkippedDayError} and {@link tibetanDateExists} is the predicate. Every other
 *   failure is a `RangeError` carrying a {@link TibetanCalendarErrorCode} — branch on
 *   `error.code`, never on the message text.
 * - **Dates before 1447 are back-projections.** Phugpa did not exist earlier, the royal-era
 *   numbering is a modern convention, and `Temporal.PlainDate` is proleptic Gregorian where
 *   historical sources are Julian.
 *
 * @packageDocumentation
 */

export {
	isoFromJulianDay,
	isoToTibetan,
	julianDayFromIso,
	losarFor,
	tibetanDateExists,
	tibetanToIso,
	tibetanWeekday,
} from "./computation/conversion.js";
export type { TibetanCalendarErrorCode } from "./errors.js";
export { formatTibetanDate } from "./format.js";
export {
	daysInMonth,
	hasLeapMonth,
	leapMonthOfYear,
	monthsFor,
	monthsInYear,
} from "./months.js";
export { parseTibetanDate } from "./parse.js";
export { PHUGPA, PHUGPA_HENNING } from "./traditions/phugpa.js";
export type { MeanMotion, Rational, TraditionConfig } from "./traditions/types.js";
export type {
	Rabjung,
	TibetanAnimal,
	TibetanDate,
	TibetanDateInput,
	TibetanElement,
	TibetanGender,
	TibetanMonth,
	TibetanMonthInput,
	TibetanYearName,
} from "./types.js";
export { SkippedDayError } from "./types.js";
