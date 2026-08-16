/**
 * Moving between Tibetan dates and months: the lunation coordinate, month and day arithmetic, and
 * the moon phases.
 *
 * @remarks
 * ## Two coordinates, and why arithmetic lives in them
 *
 * The calendar has two exact integer lines, and every operation here is `+` on one of them:
 *
 * - the **Julian day**, for solar days — `julianDayFromIso` / `isoFromJulianDay`;
 * - the **lunation**, for months — {@link lunationFromMonth} / {@link monthFromLunation}.
 *
 * Arithmetic on the *labels* — `year`, `month`, `isLeapMonth`, `day` — is where the ambiguities get
 * invented, because the label space is deliberately partial (a skipped date names no day) and
 * non-injective (two months of a leap year share a number, two days of a doubled pair share one).
 * In coordinate space none of that arises: a leap month is simply the next lunation.
 *
 * That is not a convention this package chose. A Tibetan month **is** a lunation, so "one month
 * later" means "the next new moon", and `monthsFor(2151)` prints `… M05 M06L M06 M07 …` because
 * that is the order the moon goes in.
 *
 * @packageDocumentation
 */

import {
	assertClosedFormYear,
	assertLunation,
	firstDayOfMonth,
	lastDayOfMonth,
	monthFromCount,
	sharesNumberWithLeapMonth,
	trueMonthCount,
} from "./computation/calendar.js";
import {
	asPlainDate,
	assertExactJulianDay,
	isoFromJulianDayUnchecked,
	isoToTibetan,
	julianDayFromIso,
	tibetanToIso,
} from "./computation/conversion.js";
import { julianDayOfLunarDay } from "./computation/corrections.js";
import { royalEraFromYear, yearFromRoyalEra } from "./computation/epoch.js";
import { scalingFor } from "./computation/scaling.js";
import { rangeError } from "./errors.js";
import { describeMonth } from "./months.js";
import { PHUGPA } from "./traditions/phugpa.js";
import type { TraditionConfig } from "./traditions/types.js";
import { assertTraditionConfig } from "./traditions/validate.js";
import type { TibetanDate, TibetanDateFields, TibetanMonth, TibetanMonthFields } from "./types.js";
import { rejectInvalidLeapFlags, rejectTemporalInstance } from "./types.js";

/**
 * Validates a month-shaped argument, under the name the caller actually used.
 *
 * @remarks
 * `subject` is threaded rather than hardcoded because these functions delegate: without it a caller
 * who wrote `addMonths` would be told about `lunationFromMonth`, against the error-codes record's
 * requirement that a message echo the call that was made. Duplicating the guards instead would
 * leave an unreachable branch, which is the redundancy `coverage` exists to catch.
 */
function assertMonthFields(subject: string, month: TibetanMonthFields): void {
	rejectTemporalInstance(subject, month);
	rejectInvalidLeapFlags(subject, month);
	if (!Number.isSafeInteger(month.year)) {
		throw rangeError(
			"TCT_FIELD_OUT_OF_RANGE",
			`${subject}: year must be a safe integer, received ${month.year}`,
		);
	}
	if (!Number.isInteger(month.month) || month.month < 1 || month.month > 12) {
		throw rangeError(
			"TCT_FIELD_OUT_OF_RANGE",
			`${subject}: month must be an integer 1-12, received ${month.month}`,
		);
	}
}

/**
 * Validates a date-shaped argument, under the name the caller actually used.
 *
 * @remarks
 * The same checks `tibetanToIso` runs, deliberately repeated here rather than delegated: it names
 * *itself* in its messages, so without this a caller who wrote `addDays` would be told about a
 * function they never called. Neither copy is dead — `tibetanToIso` stays reachable from its own
 * entry point — so this costs a few comparisons and buys a message that echoes the real call.
 */
function assertDateFields(subject: string, date: TibetanDateFields): void {
	rejectTemporalInstance(subject, date);
	rejectInvalidLeapFlags(subject, date);
	if (!Number.isSafeInteger(date.year)) {
		throw rangeError(
			"TCT_FIELD_OUT_OF_RANGE",
			`${subject}: year must be a safe integer, received ${date.year}`,
		);
	}
	if (!Number.isInteger(date.month) || date.month < 1 || date.month > 12) {
		throw rangeError(
			"TCT_FIELD_OUT_OF_RANGE",
			`${subject}: month must be an integer 1-12, received ${date.month}`,
		);
	}
	if (!Number.isInteger(date.day) || date.day < 1 || date.day > 30) {
		throw rangeError(
			"TCT_FIELD_OUT_OF_RANGE",
			`${subject}: day must be an integer 1-30, received ${date.day}`,
		);
	}
}

/** Validates a count argument — `months`, `days`, or a `lunation`. */
function assertCount(subject: string, name: string, value: number): void {
	if (!Number.isSafeInteger(value)) {
		throw rangeError(
			"TCT_FIELD_OUT_OF_RANGE",
			`${subject}: ${name} must be a safe integer, received ${value}. ` +
				"Counting whole months or days, a fraction names nothing.",
		);
	}
}

/**
 * The month's position in the unbroken count of lunations since the tradition's epoch.
 *
 * @remarks
 * Janson calls this the true month count. Every Tibetan month counts once — **leap months
 * included** — so the value rises by exactly one per month and continues across Losar with no gap.
 *
 * This is the only route to that number: it needs the intercalation index, which is not public and
 * cannot be reconstructed from anything that is. {@link TibetanMonth.lunation} and
 * {@link TibetanDate.lunation} carry it on values the package already produced, so reach for this
 * when you have a month you built yourself and no object to read it off.
 *
 * A `TibetanDate` satisfies `TibetanMonthFields`, so passing one compiles and **ignores the day** —
 * a date's lunation is its month's, which is what {@link TibetanDate.lunation} already reports.
 *
 * Closed form: it never evaluates `true_date`, so it answers for months far outside the range where
 * {@link monthFromLunation} can return boundaries. The pair are inverses over the narrower of the
 * two domains, not over this one.
 *
 * @param month - The month to locate. `isLeapMonth` distinguishes the twins of a leap pair.
 * @param config - Astronomical constants. Defaults to `PHUGPA`.
 *
 * @throws RangeError with code `TCT_INVALID_ARGUMENT` if `month` is not an object naming a Tibetan
 * month, or `isLeapMonth` is present and not a boolean; `TCT_FIELD_OUT_OF_RANGE` if `year` is not a
 * safe integer or `month` is not an integer 1–12; `TCT_NO_SUCH_LEAP_MONTH` if `isLeapMonth` is set
 * for a month with no leap twin that year; `TCT_OUTSIDE_EXACT_RANGE` past the closed-form bound.
 *
 * @example
 * ```ts
 * const n = lunationFromMonth({ year: 2151, month: 6, isLeapMonth: true });
 * monthFromLunation(n + 1).monthCode;   // "M06" — the leap month's twin, one lunation later
 * ```
 */
export function lunationFromMonth(
	month: TibetanMonthFields,
	config: TraditionConfig = PHUGPA,
): number {
	assertTraditionConfig(config);
	assertMonthFields("lunationFromMonth", month);
	return lunationOf("lunationFromMonth", month, config);
}

/**
 * The lunation of an already-validated month, reporting under the caller's name.
 *
 * @remarks
 * `subject` is threaded so that `addMonths` and `monthsBetween` report themselves rather than the
 * helper they delegate to. Guarding again inside each of them instead would leave an unreachable
 * branch, which is the redundancy `coverage` is run to find.
 */
function lunationOf(subject: string, month: TibetanMonthFields, config: TraditionConfig): number {
	const describe = () => `${subject}({ year: ${month.year}, month: ${month.month} })`;
	const y = yearFromRoyalEra(month.year);
	assertClosedFormYear(describe, y, config);

	const isLeap = month.isLeapMonth ?? false;
	// Without this, asking for a leap month that does not exist returns the *previous* month's count
	// rather than refusing — a wrong answer indistinguishable from a right one.
	if (isLeap && !sharesNumberWithLeapMonth(config, y, month.month)) {
		throw rangeError(
			"TCT_NO_SUCH_LEAP_MONTH",
			`${describe()}: month ${month.month} of ${month.year} has no leap month. Drop isLeapMonth, ` +
				"or use monthsFor to see which month of a year is doubled.",
		);
	}
	return trueMonthCount(config, y, month.month, isLeap);
}

/**
 * The month at a given lunation — the inverse of {@link lunationFromMonth}.
 *
 * @remarks
 * Takes an integer with no year in hand, which is the direction a stored coordinate needs: a month
 * persisted as one sortable number comes back as a fully named `TibetanMonth`, year included.
 *
 * **Its domain is narrower than its inverse's.** This returns
 * {@link TibetanMonth.firstDay} and {@link TibetanMonth.lastDay}, so it evaluates `true_date` and is
 * bounded by the tradition's exact range — where `lunationFromMonth`, a closed form, is not. Round
 * trips hold over the narrower domain.
 *
 * @param lunation - The count, zero at the epoch and negative before it.
 * @param config - Astronomical constants. Defaults to `PHUGPA`.
 *
 * @throws RangeError with code `TCT_FIELD_OUT_OF_RANGE` if `lunation` is not a safe integer;
 * `TCT_OUTSIDE_EXACT_RANGE` past where the arithmetic stays exact.
 *
 * @example
 * ```ts
 * const n = lunationFromMonth({ year: 2151, month: 12 });
 * monthFromLunation(n + 1);   // month 1 of 2152 — the count crosses Losar with no gap
 * ```
 */
export function monthFromLunation(
	lunation: number,
	config: TraditionConfig = PHUGPA,
): TibetanMonth {
	assertTraditionConfig(config);
	assertCount("monthFromLunation", "lunation", lunation);
	return monthAt("monthFromLunation", lunation, config);
}

/** The month at an already-validated lunation, reporting under the caller's name. */
function monthAt(name: string, lunation: number, config: TraditionConfig): TibetanMonth {
	const subject = () => `${name}(${lunation})`;
	// Before monthFromCount, not after: it multiplies by 65 first, so an unbounded count loses
	// precision and returns an identity built from noise rather than throwing.
	assertLunation(subject, lunation, config);

	const identity = monthFromCount(config, lunation);
	assertClosedFormYear(subject, identity.year, config);

	const scaled = scalingFor(config);
	// Bound both ends before describeMonth renders them. assertLunation above only keeps the *month
	// count* arithmetic exact; the boundaries come from true_date, whose range is far narrower, and
	// without this a lunation in between produced an uncoded `RangeError: Duration was not valid`
	// straight out of Temporal — a bare throw below the boundary, which is the shape the
	// error-codes record exists to prevent.
	assertExactJulianDay(scaled, firstDayOfMonth(scaled, lunation), subject);
	assertExactJulianDay(scaled, lastDayOfMonth(scaled, lunation), subject);

	return describeMonth(
		scaled,
		lunation,
		royalEraFromYear(identity.year),
		identity.month,
		identity.isLeap,
	);
}

/**
 * The month `months` lunations after this one. Negative counts step backwards.
 *
 * @remarks
 * **Month in, month out — and therefore total.** It never places a day number, so it never meets a
 * skipped one, and there is no convention to choose. That is the whole reason it takes a month
 * rather than a date: `addMonths(someDate, 1)` would have to decide what "the 8th of next month"
 * means when the 8th is skipped there, and the tradition supplies no answer. A `TibetanDate`
 * satisfies `TibetanMonthFields`, so you can still pass one — the day is ignored.
 *
 * ## What the naive versions do
 *
 * This exists because the obvious consumer-side step is wrong, and wrong quietly. Indexing the
 * year's months by month number — `monthsFor(year)[month.month]` — returns **the month you are
 * already on** from the leap month onward, so a "next month" control dies halfway through every
 * leap year while returning a perfectly valid `TibetanMonth` and throwing nothing. Incrementing
 * `month` instead skips the leap month entirely, losing a whole thirty days. Searching a single
 * year by lunation returns nothing at month 12, which is Losar, twelve times a year.
 *
 * In lunation space none of that arises: `+1` from a leap month is its twin, because that is the
 * order the moon goes in.
 *
 * @param month - The month to step from. `isLeapMonth` distinguishes the twins of a leap pair.
 * @param months - How many lunations to move. May be negative or zero.
 * @param config - Astronomical constants. Defaults to `PHUGPA`.
 *
 * @throws RangeError with the codes {@link lunationFromMonth} and {@link monthFromLunation} throw;
 * `TCT_FIELD_OUT_OF_RANGE` if `months` is not a safe integer.
 *
 * @example
 * ```ts
 * addMonths({ year: 2151, month: 5 }, 1).monthCode;   // "M06L" — into the leap month
 * addMonths({ year: 2151, month: 5 }, 2).monthCode;   // "M06"  — and out of it
 * addMonths({ year: 2151, month: 12 }, 1).year;       // 2152   — across Losar
 * ```
 */
export function addMonths(
	month: TibetanMonthFields,
	months: number,
	config: TraditionConfig = PHUGPA,
): TibetanMonth {
	assertTraditionConfig(config);
	assertMonthFields("addMonths", month);
	assertCount("addMonths", "months", months);
	return monthAt("addMonths", lunationOf("addMonths", month, config) + months, config);
}

/**
 * How many lunations separate two months, signed.
 *
 * @remarks
 * Positive when `to` follows `from`, matching `getObservances(from, to)`. Counting **lunations**
 * rather than month labels is what makes a leap year come out right: from month 5 to month 7 of a
 * year whose month 6 is doubled is three months, not two, because three new moons pass.
 *
 * A `TibetanDate` satisfies `TibetanMonthFields`, so passing dates compiles and **ignores the
 * days** — this measures the months they fall in, so two dates in the same month are zero apart.
 *
 * Both arguments are validated separately, and the message names which one failed.
 *
 * @throws RangeError with the codes {@link lunationFromMonth} throws, for either argument.
 *
 * @example
 * ```ts
 * monthsBetween({ year: 2151, month: 5 }, { year: 2151, month: 7 });   // 3 — 2151 doubles month 6
 * monthsBetween({ year: 2153, month: 5 }, { year: 2153, month: 7 });   // 2 — 2153 does not
 * ```
 */
export function monthsBetween(
	from: TibetanMonthFields,
	to: TibetanMonthFields,
	config: TraditionConfig = PHUGPA,
): number {
	assertTraditionConfig(config);
	// Named per argument, because "monthsBetween: expected an object" would not say which of the two
	// the caller got wrong — and these are the first two-month exports on this surface.
	assertMonthFields("monthsBetween (from)", from);
	assertMonthFields("monthsBetween (to)", to);
	return (
		lunationOf("monthsBetween (to)", to, config) - lunationOf("monthsBetween (from)", from, config)
	);
}

/**
 * The Tibetan date `days` **solar days** after this one. Negative counts step backwards.
 *
 * @remarks
 * Solar days, not lunar ones, and the distinction is the whole point. A Tibetan date *number* is a
 * lunar day — one thirtieth of a lunation, varying between about 21.5 and 25.7 hours — which is why
 * some numbers are skipped and some carried by two days. Elapsed-time reckonings count solar days:
 * the forty-nine days of the *bardo*, the weekly pujas after a death. That is what this counts.
 *
 * **Total.** `isoToTibetan` is total over calendar days, and a skipped date is a *label* no calendar
 * day carries — so stepping real days can never arrive at one. There is no skipped-day case to
 * decide here, only the two failures that already exist: a skipped **starting** date throws
 * `SkippedDayError` before any arithmetic, and leaving the tradition's exact range throws
 * `TCT_OUTSIDE_EXACT_RANGE`.
 *
 * @param date - The date to step from.
 * @param days - How many solar days to move. May be negative or zero.
 * @param config - Astronomical constants. Defaults to `PHUGPA`.
 *
 * @throws SkippedDayError if `date` itself names no calendar day.
 * @throws RangeError with code `TCT_INVALID_ARGUMENT` for a wrong-kind argument;
 * `TCT_FIELD_OUT_OF_RANGE` if a field or `days` is out of range; `TCT_OUTSIDE_EXACT_RANGE` if the
 * result leaves the range where the arithmetic stays exact.
 *
 * @example
 * ```ts
 * addDays({ year: 2153, month: 12, day: 8 }, 49).isoDate;   // 49 calendar days later
 * ```
 */
export function addDays(
	date: TibetanDateFields,
	days: number,
	config: TraditionConfig = PHUGPA,
): TibetanDate {
	assertTraditionConfig(config);
	assertDateFields("addDays", date);
	assertCount("addDays", "days", days);

	const scaled = scalingFor(config);
	const target = julianDayFromIso(tibetanToIso(date, config)) + days;
	// The starting date was inside the range or tibetanToIso would have refused it, but the *result*
	// need not be: Julian-day arithmetic walks straight out of it. Without this the conversion below
	// would either throw uncoded from Temporal or answer from degraded arithmetic.
	assertExactJulianDay(scaled, target, () => `addDays(…, ${days})`);
	return isoToTibetan(isoFromJulianDayUnchecked(target), config);
}

/**
 * How many **solar days** separate two Tibetan dates, signed.
 *
 * @remarks
 * Positive when `to` follows `from`, matching `getObservances(from, to)`.
 *
 * **If both dates came from this package, prefer Temporal.** `a.isoDate.until(b.isoDate)` is
 * Temporal-native, does the same arithmetic, and needs nothing from here. This function earns its
 * place for dates a caller **built themselves** — where there is no `isoDate` to subtract — and
 * those are also the ones that may name no calendar day at all. Saying so is more useful than
 * pretending this is always the right tool.
 *
 * Both endpoints must resolve, so a skipped date throws rather than counting from a day that does
 * not exist. Both arguments are validated separately and the message names which one failed.
 *
 * @throws SkippedDayError if either endpoint names no calendar day.
 * @throws RangeError with the codes {@link addDays} throws, for either argument.
 *
 * @example
 * ```ts
 * daysBetween({ year: 2153, month: 1, day: 1 }, { year: 2153, month: 6, day: 30 });
 * ```
 */
export function daysBetween(
	from: TibetanDateFields,
	to: TibetanDateFields,
	config: TraditionConfig = PHUGPA,
): number {
	assertTraditionConfig(config);
	assertDateFields("daysBetween (from)", from);
	assertDateFields("daysBetween (to)", to);
	return julianDayFromIso(tibetanToIso(to, config)) - julianDayFromIso(tibetanToIso(from, config));
}

/** The lunar days whose ends are the full moon and the new moon — Janson's day-classification rule. */
const FULL_MOON = 15;
const NEW_MOON = 30;

/**
 * The next moon phase strictly after a given calendar day.
 *
 * @remarks
 * An O(1) lookup rather than a search: `julianDayOfLunarDay(scaled, 15, n)` gives the full moon of
 * lunation `n` directly, so this locates the containing month, asks for its phase, and steps one
 * lunation if that has already passed.
 */
function nextPhase(
	name: string,
	lunarDay: number,
	date: Temporal.PlainDate,
	config: TraditionConfig,
): TibetanDate {
	assertTraditionConfig(config);
	const from = asPlainDate(date);
	const scaled = scalingFor(config);
	const target = julianDayFromIso(from);
	assertExactJulianDay(scaled, target, () => `${name}(${from.toString()})`);

	let lunation = isoToTibetan(from, config).lunation;
	let julianDay = julianDayOfLunarDay(scaled, lunarDay, lunation);
	if (julianDay <= target) {
		lunation += 1;
		julianDay = julianDayOfLunarDay(scaled, lunarDay, lunation);
	}
	assertExactJulianDay(scaled, julianDay, () => `${name}(${from.toString()})`);
	return isoToTibetan(isoFromJulianDayUnchecked(julianDay), config);
}

/**
 * The next full moon strictly after `date`.
 *
 * @remarks
 * **Do not test for this with `day === 15`.** The full moon is the *end* of the fifteenth lunar
 * day, and when the number 15 is skipped that instant falls on the day numbered 14 — so the naive
 * check misses the full moon entirely in those months, silently. Measured over 2500 lunations, 56
 * of them do this: about one month in forty-five. 2026-12-23 is one, carrying the full moon of
 * 2153 M11 on the day numbered 14. {@link TibetanDate.isFullMoon} is derived correctly and is what
 * to read when you already have a date.
 *
 * Western in, Tibetan out, matching `isoToTibetan`. These therefore do not chain with themselves:
 * for the next three, step through `isoDate` each time.
 *
 * @throws RangeError with code `TCT_INVALID_ARGUMENT` if `date` is not a value `asPlainDate`
 * accepts — notably a bare `{ year, month, day }` object; `TCT_OUTSIDE_EXACT_RANGE` if the phase
 * lies past where the arithmetic stays exact.
 *
 * @example
 * ```ts
 * let moon = nextFullMoon(Temporal.PlainDate.from("2026-01-01"));
 * moon = nextFullMoon(moon.isoDate);   // the one after that
 * ```
 */
export function nextFullMoon(
	date: Temporal.PlainDate,
	config: TraditionConfig = PHUGPA,
): TibetanDate {
	return nextPhase("nextFullMoon", FULL_MOON, date, config);
}

/**
 * The next new moon strictly after `date`.
 *
 * @remarks
 * The new moon ends lunar day 30 and so ends the month. Two reasons not to test the number: when 30
 * is **doubled** the instant falls on the *second* of the pair rather than on the leap day, and when
 * 30 is **skipped** it falls on the day numbered 29 — 48 times in 2500 lunations, 2025-02-27 among
 * them. {@link TibetanDate.isNewMoon} is the field form.
 *
 * @throws The codes {@link nextFullMoon} throws.
 */
export function nextNewMoon(
	date: Temporal.PlainDate,
	config: TraditionConfig = PHUGPA,
): TibetanDate {
	return nextPhase("nextNewMoon", NEW_MOON, date, config);
}
