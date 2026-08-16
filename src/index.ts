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
 * ## Observances are on a separate subpath
 *
 * `getObservances`, `observancesOn` and the `GELUG` config are **not** exported here. They live on
 * `tibetan-calendar-temporal/observances`, and importing them from the root fails at module load:
 *
 * ```ts
 * import { getObservances, GELUG } from "tibetan-calendar-temporal/observances";
 * ```
 *
 * The split is not packaging tidiness. Everything on this entry point makes a **falsifiable** claim
 * — a constant checks against Janson, a date against an almanac, and a disagreement is a bug.
 * Nothing in the observance layer does: published sources legitimately disagree about which day an
 * institution keeps, so those conventions are injected config rather than engine logic.
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
	datesFor,
	daysInMonth,
	hasLeapMonth,
	leapMonthOfYear,
	monthsFor,
	monthsInYear,
} from "./months.js";
export {
	animalNameFor,
	elementNameFor,
	genderNameFor,
	rabjungFor,
	weekdayNameFor,
	yearNameFor,
} from "./naming.js";
export {
	addDays,
	addMonths,
	daysBetween,
	lunationFromMonth,
	monthFromLunation,
	monthsBetween,
	nextFullMoon,
	nextNewMoon,
} from "./navigation.js";
export { parseTibetanDate } from "./parse.js";
export { BHUTAN, BHUTAN_HENNING } from "./traditions/bhutan.js";
export { PHUGPA, PHUGPA_HENNING } from "./traditions/phugpa.js";
export type {
	MeanMotion,
	Rational,
	TraditionConfig,
	TraditionNaming,
} from "./traditions/types.js";
export type {
	Rabjung,
	TibetanAnimal,
	TibetanDate,
	TibetanDateFields,
	TibetanElement,
	TibetanGender,
	TibetanMonth,
	TibetanMonthFields,
	TibetanName,
	TibetanPlanet,
	TibetanWeekdayElement,
	TibetanWeekdayName,
	TibetanYearName,
} from "./types.js";
export { SkippedDayError } from "./types.js";
