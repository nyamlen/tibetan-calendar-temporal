/**
 * Which months a Tibetan year has, and how long each one is — the month tier of the public API.
 *
 * @remarks
 * Everything here is a boundary rendering of arithmetic that already lives in
 * [computation/calendar.ts]({@link ./computation/calendar.js}). Two things happen at this boundary
 * and nowhere below it: the year becomes the **royal era** rather than Janson's *Y*, and the input
 * is validated.
 *
 * The tier splits in two, and the split is deliberate rather than redundancy:
 *
 * - {@link monthsFor} and {@link daysInMonth} compute month **boundaries**, so they evaluate
 *   `true_date` and are bounded by {@link ScaledTradition.exactToJulianDay}.
 * - {@link hasLeapMonth}, {@link leapMonthOfYear} and {@link monthsInYear} are closed forms over
 *   the year alone. They touch no lunar arithmetic and stay exact up to the configured tradition's
 *   derivable range — far past {@link ScaledTradition.exactToJulianDay} — for a handful of integer
 *   operations against the ~26 `true_date` evaluations the list costs.
 *
 * That difference is why both exist. Deriving `hasLeapMonth(y)` from `monthsFor(y)` is correct and
 * disproportionate; a year picker rendering a century would do thousands of `true_date` evaluations
 * to learn a hundred booleans.
 *
 * @packageDocumentation
 */

import {
	assertClosedFormYear,
	daysInMonth as daysInMonthCount,
	firstDayOfMonth,
	hasLeapTwin,
	isLeapYear,
	lastDayOfMonth,
	leapMonthOfYear as leapMonthOfYearY,
	trueMonthCount,
} from "./computation/calendar.js";
import { assertExactJulianDay, isoFromJulianDayUnchecked } from "./computation/conversion.js";
import { yearFromRoyalEra } from "./computation/epoch.js";
import { type ScaledTradition, scalingFor } from "./computation/scaling.js";
import { rangeError } from "./errors.js";
import { monthCodeOf } from "./format.js";
import { PHUGPA } from "./traditions/phugpa.js";
import type { TraditionConfig } from "./traditions/types.js";
import { assertTraditionConfig } from "./traditions/validate.js";
import type { TibetanMonth, TibetanMonthFields } from "./types.js";
import { rejectInvalidLeapFlags, rejectTemporalInstance } from "./types.js";

/**
 * Rejects a year that is not a safe integer.
 *
 * @remarks
 * One predicate covers fractions, `NaN`, `±Infinity` and 2⁵³ overflow — the bounds checks alone
 * cannot, since `NaN` satisfies no comparison and would reach the arithmetic.
 */
function assertSafeYear(subject: string, year: number): void {
	if (!Number.isSafeInteger(year)) {
		throw rangeError(
			"TCT_FIELD_OUT_OF_RANGE",
			`${subject}: year must be a safe integer, received ${year}`,
		);
	}
}

/**
 * Validates a year for the closed-form functions, which need no lunar arithmetic.
 *
 * @remarks
 * Returns Janson's *Y*. The config is still validated — `γ*` is derived from `epochYear`,
 * `epochMonth` and `intercalationIndexAtEpoch`, so a malformed config gives a wrong answer rather
 * than no answer. `scalingFor` is the memoised choke point that does it, and after the first call
 * per config object it costs a `WeakMap` hit.
 *
 * `assertClosedFormYear` runs after `yearFromRoyalEra` converts to Janson's *Y*, since that is the
 * value the closed forms — and the bound itself — are stated in terms of.
 */
function closedFormYear(subject: string, year: number, config: TraditionConfig): number {
	assertSafeYear(subject, year);
	assertTraditionConfig(config);
	const y = yearFromRoyalEra(year);
	assertClosedFormYear(() => subject, y, config);
	return y;
}

/** Builds the public shape for one month, given its true month count. */
function describeMonth(
	scaled: ScaledTradition,
	monthCount: number,
	month: number,
	isLeapMonth: boolean,
): TibetanMonth {
	const firstJulianDay = firstDayOfMonth(scaled, monthCount);
	const lastJulianDay = lastDayOfMonth(scaled, monthCount);
	return {
		month,
		monthCode: monthCodeOf(month, isLeapMonth),
		isLeapMonth,
		days: lastJulianDay - firstJulianDay + 1,
		firstDay: isoFromJulianDayUnchecked(firstJulianDay),
		lastDay: isoFromJulianDayUnchecked(lastJulianDay),
	};
}

/**
 * The months of the Tibetan year beginning at Losar of `year`, in calendar order.
 *
 * @remarks
 * Twelve entries, or thirteen when the year carries a leap month. They tile the year exactly:
 * `monthsFor(y)[0].firstDay` is `losarFor(y).isoDate`, consecutive months abut, and the last ends
 * the day before the next Losar.
 *
 * That the boundaries line up is a consequence of the arithmetic rather than an assumption.
 * Janson §8 defines Losar as one day after the last day of regular month 12 of the preceding year,
 * and consecutive solar months take consecutive true month counts — a leap month takes `rounded − 1`
 * and its twin takes `rounded`, so the sequence has no gap. Losar is therefore the first day of the
 * year's first month, which is leap month 1 where one exists and regular month 1 otherwise. This is
 * why the year 2000, which opens with a leap month 1, needs no special case.
 *
 * `year` is the **royal era**, matching {@link TibetanDate.year}: 2153, not 2026.
 *
 * Read the remarks on {@link TibetanMonth} before iterating one. `days` counts calendar days, not
 * date numbers, and looping `1..days` builds a wrong calendar.
 *
 * @throws RangeError with code `TCT_FIELD_OUT_OF_RANGE` if `year` is not a safe integer, or
 * `TCT_OUTSIDE_EXACT_RANGE` if the year falls beyond where the tradition's arithmetic stays exact.
 *
 * @example
 * ```ts
 * monthsFor(2153).length;                  // 12
 * monthsFor(2153)[0].firstDay.toString();  // "2026-02-18" — Losar
 *
 * const leapYear = monthsFor(2151);
 * leapYear.length;                         // 13
 * leapYear.map((m) => m.monthCode);        // ["M01", …, "M06L", "M06", …, "M12"]
 * ```
 */
export function monthsFor(year: number, config: TraditionConfig = PHUGPA): TibetanMonth[] {
	const scaled = scalingFor(config);
	const subject = () => `monthsFor(${year})`;
	assertSafeYear(subject(), year);
	const y = yearFromRoyalEra(year);

	// Bound the whole year up front, against its own two ends, so a year that is partly outside the
	// exact range is refused rather than answered with a truncated list. The ends are computed
	// through the same route the entries use, so nothing can be evaluated here that is not bounded.
	assertExactJulianDay(
		scaled,
		firstDayOfMonth(scaled, trueMonthCount(config, y - 1, 12) + 1),
		subject,
	);
	assertExactJulianDay(scaled, lastDayOfMonth(scaled, trueMonthCount(config, y, 12)), subject);

	const months: TibetanMonth[] = [];
	for (let month = 1; month <= 12; month++) {
		if (hasLeapTwin(config, y, month)) {
			months.push(describeMonth(scaled, trueMonthCount(config, y, month, true), month, true));
		}
		months.push(describeMonth(scaled, trueMonthCount(config, y, month, false), month, false));
	}
	return months;
}

/**
 * How many **calendar days** a Tibetan month spans: 29 or 30.
 *
 * @remarks
 * Not the highest date number, which is always 30 — see the remarks on {@link TibetanMonth}.
 *
 * There is no correct consumer-side route to this. Differencing `tibetanToIso({ month, day: 1 })`
 * and `{ month, day: 30 }` throws whenever either number is skipped, and is off by one when either
 * is doubled. Janson §8 is explicit that a month's first day must be computed from the previous
 * month's last, never by evaluating date 1.
 *
 * Accepts anything carrying `year`, `month` and optionally `isLeapMonth`, so a {@link TibetanDate}
 * from `isoToTibetan` can be passed straight in.
 *
 * @throws RangeError with code `TCT_FIELD_OUT_OF_RANGE` for a non-integer or out-of-range field;
 * `TCT_INVALID_ARGUMENT` if `month` is not an object naming a Tibetan month — a `Temporal` instance,
 * `null` — or if `isLeapMonth` is present but not `boolean`; `TCT_NO_SUCH_LEAP_MONTH` if
 * `isLeapMonth` is set for a month with no leap twin that year; or `TCT_OUTSIDE_EXACT_RANGE` past
 * the tradition's exact range.
 *
 * @example
 * ```ts
 * daysInMonth({ year: 2151, month: 6, isLeapMonth: true });          // the leap month of 2151
 * daysInMonth(isoToTibetan(Temporal.PlainDate.from("2026-08-12")));  // that day's own month
 * ```
 */
export function daysInMonth(month: TibetanMonthFields, config: TraditionConfig = PHUGPA): number {
	rejectTemporalInstance("daysInMonth", month);
	rejectInvalidLeapFlags("daysInMonth", month);
	const scaled = scalingFor(config);
	const isLeapMonth = month.isLeapMonth ?? false;
	const subject = () =>
		`daysInMonth({ year: ${month.year}, month: ${month.month}` +
		`${isLeapMonth ? ", isLeapMonth: true" : ""} })`;

	assertSafeYear(subject(), month.year);
	if (!Number.isInteger(month.month) || month.month < 1 || month.month > 12) {
		throw rangeError(
			"TCT_FIELD_OUT_OF_RANGE",
			`${subject()}: month must be an integer 1-12, received ${month.month}`,
		);
	}

	const y = yearFromRoyalEra(month.year);
	assertClosedFormYear(subject, y, config);
	if (isLeapMonth && !hasLeapTwin(config, y, month.month)) {
		throw rangeError(
			"TCT_NO_SUCH_LEAP_MONTH",
			`${subject()}: month ${month.month} of ${month.year} has no leap month. Leap months ` +
				"recur roughly every 32 months and fall on a different month number each time; drop " +
				"isLeapMonth, or use monthsFor to see which month of a year is doubled",
		);
	}

	const monthCount = trueMonthCount(config, y, month.month, isLeapMonth);
	assertExactJulianDay(scaled, lastDayOfMonth(scaled, monthCount), subject);
	return daysInMonthCount(scaled, monthCount);
}

/**
 * Whether the Tibetan year `year` contains a leap month.
 *
 * @remarks
 * Named for the leap **month** rather than as `isLeapYear`, because every other `leap` name in this
 * API — {@link TibetanDate.isLeapMonth}, {@link TibetanDate.isLeapDay} — denotes the thing that is
 * duplicated rather than the container holding it. A Tibetan leap year has a thirteenth *month*,
 * not an extra day, and `isLeapYear` invites the Gregorian reading.
 *
 * Janson's closed form, `(24·Y + γ*) mod 65 ≥ 41`. This touches no lunar arithmetic, so unlike
 * {@link monthsFor} it stays exact up to the configured tradition's derivable range and is not
 * bounded by {@link ScaledTradition.exactToJulianDay}. That asymmetry is deliberate: past that
 * bound the month boundaries were never computed, but leap-year-ness still has a correct answer —
 * up until `24·Y` itself would overflow a safe integer, where the arithmetic is refused rather
 * than answered.
 *
 * @throws RangeError with code `TCT_FIELD_OUT_OF_RANGE` if `year` is not a safe integer, or
 * `TCT_OUTSIDE_EXACT_RANGE` if it falls beyond the tradition's derivable range.
 */
export function hasLeapMonth(year: number, config: TraditionConfig = PHUGPA): boolean {
	return isLeapYear(config, closedFormYear(`hasLeapMonth(${year})`, year, config));
}

/**
 * Which month number is doubled in `year`, or `undefined` if the year has no leap month.
 *
 * @remarks
 * The leap month carries this number and precedes the regular month sharing it. Exact up to the
 * configured tradition's derivable range, like {@link hasLeapMonth} and for the same reason.
 *
 * @throws RangeError with code `TCT_FIELD_OUT_OF_RANGE` if `year` is not a safe integer, or
 * `TCT_OUTSIDE_EXACT_RANGE` if it falls beyond the tradition's derivable range.
 *
 * @example
 * ```ts
 * leapMonthOfYear(2153);   // 6
 * leapMonthOfYear(2152);   // undefined
 * ```
 */
export function leapMonthOfYear(
	year: number,
	config: TraditionConfig = PHUGPA,
): number | undefined {
	return leapMonthOfYearY(config, closedFormYear(`leapMonthOfYear(${year})`, year, config));
}

/**
 * How many months the Tibetan year `year` has: 12, or 13 in a year with a leap month.
 *
 * @remarks
 * Equal to `monthsFor(year).length`, and exact up to the configured tradition's derivable range
 * where that is not.
 *
 * @throws RangeError with code `TCT_FIELD_OUT_OF_RANGE` if `year` is not a safe integer, or
 * `TCT_OUTSIDE_EXACT_RANGE` if it falls beyond the tradition's derivable range.
 */
export function monthsInYear(year: number, config: TraditionConfig = PHUGPA): number {
	return isLeapYear(config, closedFormYear(`monthsInYear(${year})`, year, config)) ? 13 : 12;
}
