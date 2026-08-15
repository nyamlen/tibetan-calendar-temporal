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
	hasLeapTwin,
	lastDayOfMonth,
	monthFromCount,
	trueMonthCount,
} from "./computation/calendar.js";
import { assertExactJulianDay } from "./computation/conversion.js";
import { royalEraFromYear, yearFromRoyalEra } from "./computation/epoch.js";
import { scalingFor } from "./computation/scaling.js";
import { rangeError } from "./errors.js";
import { describeMonth } from "./months.js";
import { PHUGPA } from "./traditions/phugpa.js";
import type { TraditionConfig } from "./traditions/types.js";
import { assertTraditionConfig } from "./traditions/validate.js";
import type { TibetanMonth, TibetanMonthFields } from "./types.js";
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
	const subject = () => `lunationFromMonth({ year: ${month.year}, month: ${month.month} })`;
	const y = yearFromRoyalEra(month.year);
	assertClosedFormYear(subject, y, config);

	const isLeap = month.isLeapMonth ?? false;
	// Without this, asking for a leap month that does not exist returns the *previous* month's count
	// rather than refusing — a wrong answer indistinguishable from a right one.
	if (isLeap && !hasLeapTwin(config, y, month.month)) {
		throw rangeError(
			"TCT_NO_SUCH_LEAP_MONTH",
			`${subject()}: month ${month.month} of ${month.year} has no leap month. Drop isLeapMonth, ` +
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
	const subject = () => `monthFromLunation(${lunation})`;
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
