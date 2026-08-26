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
 * - {@link hasLeapMonth}, {@link leapMonthNumberFor} and {@link monthsInYear} are closed forms over
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
	isLeapYear,
	lastDayOfMonth,
	lastMonthCountOfYear,
	leapMonthOfYear as leapMonthOfYearY,
	sharesNumberWithLeapMonth,
	trueMonthCount,
} from "./computation/calendar.js";
import {
	assertExactJulianDay,
	isoFromJulianDayUnchecked,
	isoToTibetan,
} from "./computation/conversion.js";
import { yearFromRoyalEra, yearNameFromYear } from "./computation/epoch.js";
import { type ScaledTradition, scalingFor } from "./computation/scaling.js";
import { rangeError } from "./errors.js";
import { monthCodeOf } from "./format.js";
import { PHUGPA } from "./traditions/phugpa.js";
import type { TraditionConfig } from "./traditions/types.js";
import { assertTraditionConfig } from "./traditions/validate.js";
import type { TibetanDate, TibetanMonth, TibetanMonthFields } from "./types.js";
import { rejectInvalidLeapFlags, rejectMissingFields, rejectTemporalInstance } from "./types.js";

/** The two fields {@link TibetanMonthFields} declares required. */
const MONTH_FIELDS = ["year", "month"] as const;

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

/**
 * Computed months, keyed by config identity and then by royal-era year.
 *
 * @remarks
 * Keyed on the **config**, not the year alone. A cache ignoring it would serve one tradition's
 * months for another, and the two shipped configs do diverge — royal-era 2226 M09 begins
 * 2099-10-15 under `PHUGPA` and 2099-10-14 under `PHUGPA_HENNING`. Rare enough (four years between
 * 1500 and 2500) that a config-blind cache would pass almost every test written against it, which
 * is exactly what makes it worth stating.
 *
 * A `WeakMap` on the outside so a caller's throwaway config does not pin its months forever — the
 * same bargain {@link scalingFor} already makes. The inner `Map` is bounded in practice by how many
 * years a consumer asks for, and its entries die with the config.
 *
 * This is memoisation of a **pure** function, so it changes cost and nothing else. It earns its
 * place because stepping a month grid re-derives neighbouring years constantly: advancing twelve
 * months through the obvious consumer-side route costs 24 recomputations of work already done.
 */
const monthCache = new WeakMap<TraditionConfig, Map<number, TibetanMonth[]>>();

/**
 * Builds the public shape for one month, given its true month count.
 *
 * @remarks
 * `year` is the **royal era**, matching the published shape, so callers holding Janson's *Y*
 * convert first. The month count is carried out as {@link TibetanMonth.lunation} rather than
 * recomputed, since it is the value this function was located by.
 */
export function describeMonth(
	scaled: ScaledTradition,
	monthCount: number,
	year: number,
	month: number,
	isLeapMonth: boolean,
): TibetanMonth {
	const firstJulianDay = firstDayOfMonth(scaled, monthCount);
	const lastJulianDay = lastDayOfMonth(scaled, monthCount);
	return {
		year,
		lunation: monthCount,
		yearName: yearNameFromYear(yearFromRoyalEra(year)),
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
	const cached = monthCache.get(config)?.get(year);
	// A fresh array every call, deliberately: the cache holds the computed months, but handing the
	// same array to two callers lets one caller's `sort()` or `splice()` corrupt the other's. The
	// TibetanMonth objects inside are safe to share — nothing in this package mutates them, and a
	// consumer who does is reaching past a documented shape.
	if (cached !== undefined) return [...cached];

	const scaled = scalingFor(config);
	const subject = () => `monthsFor(${year})`;
	assertSafeYear(subject(), year);
	const y = yearFromRoyalEra(year);

	// Bound the whole year up front, against its own two ends, so a year that is partly outside the
	// exact range is refused rather than answered with a truncated list. The ends are computed
	// through the same route the entries use, so nothing can be evaluated here that is not bounded.
	// Both ends go through lastMonthCountOfYear rather than `(12, isLeap: false)`, which names the
	// last month only while leap months precede — see its remarks.
	assertExactJulianDay(
		scaled,
		firstDayOfMonth(scaled, lastMonthCountOfYear(config, y - 1) + 1),
		subject,
	);
	assertExactJulianDay(scaled, lastDayOfMonth(scaled, lastMonthCountOfYear(config, y)), subject);

	const months: TibetanMonth[] = [];
	const leapFirst = config.leapMonthPosition === "before";
	for (let month = 1; month <= 12; month++) {
		// Chronological order, which is the order this list documents. Emitting the leap month first
		// unconditionally would put a Bhutanese year's pair the wrong way round — and `lunation` would
		// then decrease across a boundary a consumer is entitled to walk forwards.
		const twin = sharesNumberWithLeapMonth(config, y, month);
		const leap = () =>
			months.push(describeMonth(scaled, trueMonthCount(config, y, month, true), year, month, true));
		if (twin && leapFirst) leap();
		months.push(describeMonth(scaled, trueMonthCount(config, y, month, false), year, month, false));
		if (twin && !leapFirst) leap();
	}

	let byYear = monthCache.get(config);
	if (byYear === undefined) {
		byYear = new Map();
		monthCache.set(config, byYear);
	}
	byYear.set(year, months);
	return [...months];
}

/**
 * The one {@link TibetanMonth} named by `month`, resolved from its identifying fields.
 *
 * @remarks
 * The month tier's counterpart to {@link resolveDate}, and the named route from a month's
 * **identity** to the month itself. Before it existed the two available routes were both
 * accidents: `addMonths(month, 0)` — a zero step, which reads as a mistake — and
 * `monthsFor(year).find(…)`, which must match on `month` **and** `isLeapMonth` together and
 * silently returns the wrong half of a leap pair when it matches on the number alone.
 *
 * Equal to the corresponding entry of `monthsFor(month.year)`, computed directly rather than by
 * building the year: one `true_date` pair against the ~26 the whole list costs.
 *
 * **Not named `monthFor`.** That differs from {@link monthsFor} by one letter, takes the same
 * first argument and returns a month-shaped thing — the collision `docs/coding-standards.md`
 * records as compiling silently and recursing.
 *
 * @param month - The month to resolve. `isLeapMonth` defaults to `false`, the regular month.
 * @param config - Astronomical constants. Defaults to `PHUGPA`.
 *
 * @throws RangeError with code `TCT_INVALID_ARGUMENT` if `month` is not an object naming a Tibetan
 * month, or `isLeapMonth` is present and not a boolean; `TCT_FIELD_OUT_OF_RANGE` for a field out of
 * range; `TCT_NO_SUCH_LEAP_MONTH` if `isLeapMonth` is set for a month with no twin that year;
 * `TCT_OUTSIDE_EXACT_RANGE` past the tradition's exact range.
 *
 * @example
 * ```ts
 * const leap = resolveMonth({ year: 2151, month: 6, isLeapMonth: true });
 * leap.monthCode;             // "M06L"
 * leap.firstDay.toString();   // "2024-07-06"
 * leap.days;                  // 30
 * ```
 */
export function resolveMonth(
	month: TibetanMonthFields,
	config: TraditionConfig = PHUGPA,
): TibetanMonth {
	rejectTemporalInstance("resolveMonth", month);
	rejectInvalidLeapFlags("resolveMonth", month);
	rejectMissingFields("resolveMonth", month, MONTH_FIELDS);
	const isLeapMonth = month.isLeapMonth ?? false;
	const subject = () =>
		`resolveMonth({ year: ${month.year}, month: ${month.month}` +
		`${isLeapMonth ? ", isLeapMonth: true" : ""} })`;

	assertSafeYear(subject(), month.year);
	if (!Number.isInteger(month.month) || month.month < 1 || month.month > 12) {
		throw rangeError(
			"TCT_FIELD_OUT_OF_RANGE",
			`${subject()}: month must be an integer 1-12, received ${month.month}`,
		);
	}

	const scaled = scalingFor(config);
	const y = yearFromRoyalEra(month.year);
	assertClosedFormYear(subject, y, config);
	if (isLeapMonth && !sharesNumberWithLeapMonth(config, y, month.month)) {
		throw rangeError(
			"TCT_NO_SUCH_LEAP_MONTH",
			`${subject()}: month ${month.month} of ${month.year} has no leap month. Drop isLeapMonth, ` +
				"or use monthsFor to see which month of a year is doubled.",
		);
	}

	const monthCount = trueMonthCount(config, y, month.month, isLeapMonth);
	assertExactJulianDay(scaled, firstDayOfMonth(scaled, monthCount), subject);
	assertExactJulianDay(scaled, lastDayOfMonth(scaled, monthCount), subject);
	return describeMonth(scaled, monthCount, month.year, month.month, isLeapMonth);
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
	rejectMissingFields("daysInMonth", month, MONTH_FIELDS);
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
	if (isLeapMonth && !sharesNumberWithLeapMonth(config, y, month.month)) {
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
 * The leap month carries this number. Exact up to the configured tradition's derivable range, like
 * {@link hasLeapMonth} and for the same reason.
 *
 * **Which year has a leap month, and which month it doubles, is tradition-specific** — it falls out
 * of `leapIndexThreshold`, so the answer changes with the config and the example below is Phugpa's.
 * Varying that threshold alone over 2151 — Janson's 48, 46, 57 and 0 — gives Phugpa 6, the Mongolian
 * version 5, the Bhutanese 10, and Tsurphu no leap month that year at all.
 *
 * **Those are threshold-only figures, and the shipped `BHUTAN` config is not one of them.** It also
 * sets `leapMonthPosition`, which changes the numbering: `leapMonthNumberFor(2151, BHUTAN)` is **8**,
 * not 10. Quote such a figure with the constant it varies, never as "the Bhutanese answer".
 *
 * Where the leap month *sits* relative to its twin is `TraditionConfig.leapMonthPosition`, settled
 * on 2026-08-16. Phugpa, Tsurphu and the Mongolian version place it **before** the regular month
 * sharing the number; Bhutan numbers from the **preceding** month, so its leap month follows —
 * `monthsFor(2151, BHUTAN)` runs `... M08 M08L ...`. See [traditions.md](../docs/traditions.md).
 *
 * @throws RangeError with code `TCT_FIELD_OUT_OF_RANGE` if `year` is not a safe integer, or
 * `TCT_OUTSIDE_EXACT_RANGE` if it falls beyond the tradition's derivable range.
 *
 * @example
 * ```ts
 * leapMonthNumberFor(2151);   // 6 — Phugpa, the default config
 * leapMonthNumberFor(2153);   // undefined — no leap month that year
 * ```
 */
export function leapMonthNumberFor(
	year: number,
	config: TraditionConfig = PHUGPA,
): number | undefined {
	return leapMonthOfYearY(config, closedFormYear(`leapMonthNumberFor(${year})`, year, config));
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

/**
 * Every calendar day of a Tibetan month, in order, each labelled with its Tibetan date.
 *
 * @remarks
 * The month grid, and the counterpart of {@link monthsFor}: `monthsFor(year)` then `datesFor(month)`
 * lays out a whole year in two calls.
 *
 * **Why this is not `for (let d = 1; d <= month.days; d++)`.** Date numbers always run 1–30 while
 * the span is 29 or 30 *calendar days*, because some numbers are skipped and some are carried by
 * two consecutive days. Counting to `days` therefore produces a grid that is wrong in most months —
 * over 754 months sampled, 708 are missing at least one number. This walks the calendar days
 * instead, which is also the right model for a UI: one cell per day, labelled by conversion.
 *
 * So a doubled number appears **twice**, the first carrying {@link TibetanDate.isLeapDay}, and a
 * skipped number does not appear at all. Both are ordinary — expect roughly one of each every
 * couple of months.
 *
 * Bounded by construction at 29 or 30 entries, so unlike a date *range* it needs no span cap.
 *
 * @param month - The month to lay out. Accepts a {@link TibetanMonth} from `monthsFor` directly, or
 * a hand-built `{ year, month, isLeapMonth }`.
 * @param config - Astronomical constants. Defaults to `PHUGPA`.
 *
 * @throws RangeError with code `TCT_INVALID_ARGUMENT` if `month` is not an object naming a Tibetan
 * month, or `isLeapMonth` is present and not a boolean; `TCT_FIELD_OUT_OF_RANGE` for a field out of
 * range; `TCT_NO_SUCH_LEAP_MONTH` if `isLeapMonth` is set for a month with no twin that year;
 * `TCT_OUTSIDE_EXACT_RANGE` past the tradition's exact range.
 *
 * @example
 * ```ts
 * const [first] = monthsFor(2153);
 * for (const date of datesFor(first)) {
 *   render(date.day, date.isoDate);   // date.day is the number to print in the cell
 * }
 * ```
 */
export function datesFor(
	month: TibetanMonthFields,
	config: TraditionConfig = PHUGPA,
): TibetanDate[] {
	// daysInMonth already carries the whole guard set for a month-shaped argument — shape, fields,
	// the leap twin and the exact range — and reporting under its own name here would be the one
	// thing wrong with delegating, so the guards run first under this function's name.
	rejectTemporalInstance("datesFor", month);
	rejectInvalidLeapFlags("datesFor", month);
	rejectMissingFields("datesFor", month, MONTH_FIELDS);
	assertSafeYear(`datesFor({ year: ${month.year}, month: ${month.month} })`, month.year);
	if (!Number.isInteger(month.month) || month.month < 1 || month.month > 12) {
		throw rangeError(
			"TCT_FIELD_OUT_OF_RANGE",
			`datesFor: month must be an integer 1-12, received ${month.month}`,
		);
	}

	const scaled = scalingFor(config);
	const y = yearFromRoyalEra(month.year);
	const isLeapMonth = month.isLeapMonth ?? false;
	const subject = () => `datesFor({ year: ${month.year}, month: ${month.month} })`;
	assertClosedFormYear(subject, y, config);
	if (isLeapMonth && !sharesNumberWithLeapMonth(config, y, month.month)) {
		throw rangeError(
			"TCT_NO_SUCH_LEAP_MONTH",
			`${subject()}: month ${month.month} of ${month.year} has no leap month. Drop isLeapMonth, ` +
				"or use monthsFor to see which month of a year is doubled.",
		);
	}

	const monthCount = trueMonthCount(config, y, month.month, isLeapMonth);
	const first = firstDayOfMonth(scaled, monthCount);
	const last = lastDayOfMonth(scaled, monthCount);
	assertExactJulianDay(scaled, first, subject);
	assertExactJulianDay(scaled, last, subject);

	const dates: TibetanDate[] = [];
	for (let julianDay = first; julianDay <= last; julianDay++) {
		dates.push(isoToTibetan(isoFromJulianDayUnchecked(julianDay), config));
	}
	return dates;
}
