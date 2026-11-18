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
	monthCountFor,
} from "./computation/conversion.js";
import { yearFromRoyalEra, yearNameFromYear } from "./computation/epoch.js";
import { type ScaledTradition, scalingFor } from "./computation/scaling.js";
import { assertSafeYear, describe } from "./errors.js";
import { monthCodeOf } from "./format.js";
import { deepFreeze } from "./freeze.js";
import { PHUGPA } from "./traditions/phugpa.js";
import type { TraditionConfig } from "./traditions/types.js";
import { validatedTradition } from "./traditions/validate.js";
import type {
	TibetanDate,
	TibetanDateFields,
	TibetanDateSnapshot,
	TibetanMonth,
	TibetanMonthFields,
	TibetanMonthSnapshot,
} from "./types.js";
import { assertTibetanRanges, assertTibetanShape } from "./types.js";

/**
 * Validates a year for the closed-form functions, which need no lunar arithmetic.
 *
 * @returns Janson's *Y* with the validated copy of the config, which the caller reads from and
 * never the one it was handed.
 */
function closedFormYear(
	subject: string,
	year: number,
	tradition: TraditionConfig,
): { y: number; tradition: TraditionConfig } {
	assertSafeYear(subject, year);
	// The config is still validated although no lunar arithmetic runs: `γ*` is derived from
	// `epochYear`, `epochMonth` and `intercalationIndexAtEpoch`, so a malformed config gives a wrong
	// answer rather than no answer. `scalingFor` is the memoised choke point that does it, and after
	// the first call per config object it costs a `WeakMap` hit.
	tradition = validatedTradition(tradition);
	// The bound is checked after the conversion to Janson's *Y*, since that is the value the closed
	// forms, and the bound itself, are stated in terms of.
	const y = yearFromRoyalEra(year);
	assertClosedFormYear(() => subject, y, tradition);
	return { y, tradition };
}

/**
 * Validates a month-tier argument and locates its month, bounded at both ends by the exact range.
 *
 * @remarks
 * The whole guard for every function that answers about one month — `resolveMonth`, `daysInMonth`
 * and `datesFor` here, and `monthNamesFor`, `monthAttributesFor` and `lunarDayAttributesFor`, so
 * each reports errors under its own name. Not exported from the package barrel.
 *
 * The order is the shape, the tradition, the ranges, the leap twin, the exact range — the order every
 * export taking a Tibetan month or date follows.
 *
 * **Both ends are bounded:** the first and the last day of the month must both lie inside the
 * tradition's exact range, so a month straddling either end of it is refused.
 *
 * `shape: "date"` range-checks the day as well, for `lunarDayAttributesFor`, which takes a date but
 * answers about a lunar day rather than a calendar day, and so bounds the month rather than the day.
 */
export function boundedMonth(
	functionName: string,
	month: TibetanMonthFields | TibetanDateFields,
	shape: "month" | "date",
	tradition: TraditionConfig,
): {
	fields: TibetanMonthSnapshot | TibetanDateSnapshot;
	scaled: ScaledTradition;
	monthCount: number;
	first: number;
	last: number;
} {
	const fields = assertTibetanShape(functionName, month, shape);
	const scaled = scalingFor(tradition);
	const subject = assertTibetanRanges(functionName, fields, shape);
	const monthCount = monthCountFor(subject, scaled.tradition, fields);
	const first = firstDayOfMonth(scaled, monthCount);
	const last = lastDayOfMonth(scaled, monthCount);
	// Both ends, because the first day comes from the previous month's last, which nothing else
	// checks. The bound is symmetric in the Julian day, so checking only the last day answered a
	// month straddling the negative end while `resolveMonth` refused it (`PHUGPA_HENNING`, royal
	// year −20652, month 3). At the positive end this check is a no-op: the first day never lies
	// past the last.
	assertExactJulianDay(scaled, first, subject);
	assertExactJulianDay(scaled, last, subject);
	return { fields, scaled, monthCount, first, last };
}

/**
 * Computed months, keyed by config identity and then by royal-era year.
 *
 * @remarks
 * Memoisation of a **pure** function, so it changes cost and nothing else.
 */
// Keyed on the **config**, not the year alone. A cache ignoring it would serve one tradition's
// months for another, and the configs do diverge: royal-era 2226 M09 begins 2099-10-15 under
// `PHUGPA` and 2099-10-14 under `PHUGPA_HENNING`, `BHUTAN` and `BHUTAN_HENNING`. Between royal-era
// 1500 and 2500 only a handful of years differ between `PHUGPA` and `PHUGPA_HENNING`, so a
// config-blind cache would pass almost every test written against it, which is what makes it
// worth stating.
// A `WeakMap` on the outside so a caller's throwaway config does not pin its months forever, the
// way `scalingFor` keys its cache. That alone does not bound the shipped configs, which live as
// long as the module, so each inner `Map` is also capped at 64 years and evicts the least recently
// used. Insertion order is the recency order: a hit deletes and re-inserts its year.
// It earns its place because stepping a month grid re-derives neighbouring years constantly:
// advancing twelve months through the obvious consumer-side route costs 24 recomputations of work
// already done.
const monthCache = new WeakMap<TraditionConfig, Map<number, readonly TibetanMonth[]>>();

const MONTH_CACHE_YEARS = 64;

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
	return deepFreeze({
		year,
		lunation: monthCount,
		yearName: yearNameFromYear(yearFromRoyalEra(year)),
		month,
		monthCode: monthCodeOf(month, isLeapMonth),
		isLeapMonth,
		days: lastJulianDay - firstJulianDay + 1,
		firstDay: isoFromJulianDayUnchecked(firstJulianDay),
		lastDay: isoFromJulianDayUnchecked(lastJulianDay),
	});
}

/**
 * Returns the months of the Tibetan year beginning at Losar of `year`, in calendar order.
 *
 * @remarks
 * Twelve entries, or thirteen when the year carries a leap month. They tile the year exactly:
 * `monthsFor(y)[0].firstDay` is `losarFor(y).isoDate`, consecutive months abut, and the last ends
 * the day before the next Losar.
 *
 * That the boundaries line up is a consequence of the arithmetic rather than an assumption.
 * Janson §8 defines Losar as one day after the last day of regular month 12 of the preceding year,
 * and consecutive months take consecutive true month counts — a leap month and its twin take
 * `rounded − 1` and `rounded` in the order the tradition's `leapMonthPosition` gives, so the
 * sequence has no gap. Losar is therefore the first day of the year's first month. Under `PHUGPA`
 * and `PHUGPA_HENNING`, where the leap month comes first, that month is leap month 1 where one
 * exists and regular month 1 otherwise: the year beginning 6 February 2000 (royal-era 2127) opens
 * with a leap month 1 and needs no special case. Under `BHUTAN` and `BHUTAN_HENNING` the leap month
 * follows its twin, so the year always opens with regular month 1 and a leap month can end it.
 *
 * `year` is the **royal era**, matching {@link TibetanDate.year}: 2153, not 2026.
 *
 * Read the remarks on {@link TibetanMonth} before iterating one. `days` counts calendar days, not
 * date numbers, and looping `1..days` builds a wrong calendar.
 *
 * @throws RangeError with code `TCT_FIELD_OUT_OF_RANGE` if `year` is not a safe integer, or
 * `TCT_OUTSIDE_EXACT_RANGE` if the year falls beyond where the tradition's arithmetic stays exact;
 * `TCT_INVALID_TRADITION_CONFIG` if `tradition` is not a valid config.
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
export function monthsFor(year: number, tradition: TraditionConfig = PHUGPA): TibetanMonth[] {
	// The validated copy is both what is read and what the cache is keyed on.
	tradition = validatedTradition(tradition);
	const cachedYears = monthCache.get(tradition);
	const cached = cachedYears?.get(year);
	// A fresh array every call, deliberately: the cache holds the computed months, but handing the
	// same array to two callers lets one caller's `sort()` or `splice()` corrupt the other's. The
	// TibetanMonth objects inside are frozen by `describeMonth`, so sharing them is safe.
	if (cachedYears !== undefined && cached !== undefined) {
		cachedYears.delete(year);
		cachedYears.set(year, cached);
		return [...cached];
	}

	const scaled = scalingFor(tradition);
	const subject = () => `monthsFor(${describe(year)})`;
	assertSafeYear(subject(), year);
	const y = yearFromRoyalEra(year);

	// Bound the whole year up front, against its own two ends, so a year that is partly outside the
	// exact range is refused rather than answered with a truncated list. The ends are computed
	// through the same route the entries use, so nothing can be evaluated here that is not bounded.
	// Both ends go through lastMonthCountOfYear rather than `(12, isLeap: false)`, which names the
	// last month only while leap months precede — see its remarks.
	assertExactJulianDay(
		scaled,
		firstDayOfMonth(scaled, lastMonthCountOfYear(tradition, y - 1) + 1),
		subject,
	);
	assertExactJulianDay(scaled, lastDayOfMonth(scaled, lastMonthCountOfYear(tradition, y)), subject);

	const months: TibetanMonth[] = [];
	const leapFirst = tradition.leapMonthPosition === "before";
	for (let month = 1; month <= 12; month++) {
		// Chronological order, which is the order this list documents. Emitting the leap month first
		// unconditionally would put a Bhutanese year's pair the wrong way round — and `lunation` would
		// then decrease across a boundary a consumer is entitled to walk forwards.
		const twin = sharesNumberWithLeapMonth(tradition, y, month);
		const leap = () =>
			months.push(
				describeMonth(scaled, trueMonthCount(tradition, y, month, true), year, month, true),
			);
		if (twin && leapFirst) leap();
		months.push(
			describeMonth(scaled, trueMonthCount(tradition, y, month, false), year, month, false),
		);
		if (twin && !leapFirst) leap();
	}

	let byYear = monthCache.get(tradition);
	if (byYear === undefined) {
		byYear = new Map();
		monthCache.set(tradition, byYear);
	}
	byYear.set(year, months);
	if (byYear.size > MONTH_CACHE_YEARS) {
		const oldest = byYear.keys().next();
		if (oldest.done !== true) byYear.delete(oldest.value);
	}
	return [...months];
}

/**
 * Returns the one {@link TibetanMonth} named by `month`, resolved from its identifying fields.
 *
 * @remarks
 * The month tier's counterpart to {@link resolveDate}, and the named route from a month's
 * **identity** to the month itself. The alternatives are both accidents: `addMonths(month, 0)` — a
 * zero step, which reads as a mistake — and `monthsFor(year).find(…)`, which must match on `month`
 * **and** `isLeapMonth` together and silently returns the wrong half of a leap pair when it
 * matches on the number alone.
 *
 * Equal to the corresponding entry of `monthsFor(month.year)`, computed directly rather than by
 * building the year: one `true_date` pair against the ~26 the whole list costs.
 *
 * **Not named `monthFor`.** That differs from {@link monthsFor} by one letter, takes the same
 * first argument and returns a month-shaped thing — the collision [`docs/coding-standards.md`](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/coding-standards.md)
 * records as compiling silently and recursing.
 *
 * @param month - The month to resolve. `isLeapMonth` defaults to `false`, the regular month.
 * @param tradition - Astronomical constants. Defaults to `PHUGPA`.
 *
 * @throws RangeError with code `TCT_INVALID_ARGUMENT` if `month` is not an object naming a Tibetan
 * month, or its `year` or `month` is absent or not a number, or `isLeapMonth` is present and not a
 * boolean; `TCT_FIELD_OUT_OF_RANGE` for a `year` or `month` that is a number but not an integer or
 * is out of range; `TCT_NO_SUCH_LEAP_MONTH` if `isLeapMonth` is set for a month with no
 * twin that year; `TCT_OUTSIDE_EXACT_RANGE` past the tradition's exact range;
 * `TCT_INVALID_TRADITION_CONFIG` if `tradition` is not a valid config.
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
	tradition: TraditionConfig = PHUGPA,
): TibetanMonth {
	const { fields, scaled, monthCount } = boundedMonth("resolveMonth", month, "month", tradition);
	return describeMonth(scaled, monthCount, fields.year, fields.month, fields.isLeapMonth ?? false);
}
/**
 * Returns how many **calendar days** a Tibetan month spans: 29 or 30.
 *
 * @remarks
 * Not the highest date number, which is always 30 — see the remarks on {@link TibetanMonth}.
 *
 * There is no correct consumer-side route to this. Differencing `tibetanToIso({ month, day: 1 })`
 * and `{ month, day: 30 }` throws whenever either number is skipped, and is off by one when either
 * is doubled. Janson §8 computes a month's first day as one day after the previous month's last,
 * because date 1 can itself be skipped or doubled.
 *
 * Accepts anything carrying `year`, `month` and optionally `isLeapMonth`, so a {@link TibetanDate}
 * from `isoToTibetan` can be passed straight in.
 *
 * @throws RangeError with code `TCT_FIELD_OUT_OF_RANGE` for a `year` or `month` that is a number but
 * not an integer or is out of range;
 * `TCT_INVALID_ARGUMENT` if `month` is not an object naming a Tibetan month — a `Temporal` instance,
 * `null` — or its `year` or `month` is absent or not a number, or if `isLeapMonth` is present but
 * not `boolean`; `TCT_NO_SUCH_LEAP_MONTH` if
 * `isLeapMonth` is set for a month with no leap twin that year; `TCT_OUTSIDE_EXACT_RANGE` past
 * the tradition's exact range; or `TCT_INVALID_TRADITION_CONFIG` if `tradition` is not a valid
 * config.
 *
 * @example
 * ```ts
 * daysInMonth({ year: 2151, month: 6, isLeapMonth: true });          // the leap month of 2151
 * daysInMonth(isoToTibetan(Temporal.PlainDate.from("2026-08-12")));  // that day's own month
 * ```
 */
export function daysInMonth(
	month: TibetanMonthFields,
	tradition: TraditionConfig = PHUGPA,
): number {
	const { first, last } = boundedMonth("daysInMonth", month, "month", tradition);
	return last - first + 1;
}

/**
 * Returns whether the Tibetan year `year` contains a leap month.
 *
 * @remarks
 * Janson's closed form, `(24·Y + γ*) mod 65 ≥ 41`, with `γ*` derived from the config. This touches
 * no lunar arithmetic, so unlike {@link monthsFor} it stays exact up to the configured tradition's
 * derivable range and is not bounded by the tradition's exact range. Past that bound the month
 * boundaries were never computed, but leap-year-ness still has a correct answer — up until `24·Y`
 * itself would overflow a safe integer, where the arithmetic is refused rather than answered.
 *
 * @throws RangeError with code `TCT_FIELD_OUT_OF_RANGE` if `year` is not a safe integer, a value
 * that is not a number included; `TCT_OUTSIDE_EXACT_RANGE` if it falls beyond the tradition's
 * derivable range; `TCT_INVALID_TRADITION_CONFIG` if `tradition` is not a valid config.
 */
export function hasLeapMonth(year: number, tradition: TraditionConfig = PHUGPA): boolean {
	// Named for the leap **month** rather than as `isLeapYear`, because every other `leap` name in
	// this API, `TibetanDate.isLeapMonth` and `TibetanDate.isLeapDay`, denotes the thing that is
	// duplicated rather than the container holding it. A Tibetan leap year has a thirteenth
	// *month*, not an extra day, and `isLeapYear` invites the Gregorian reading.
	const closed = closedFormYear(`hasLeapMonth(${describe(year)})`, year, tradition);
	return isLeapYear(closed.tradition, closed.y);
}

/**
 * Returns which month number is doubled in `year`, or `undefined` if the year has no leap month.
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
 * Where the leap month *sits* relative to its twin is `TraditionConfig.leapMonthPosition`.
 * Phugpa, Tsurphu and the Mongolian version place it **before** the regular month
 * sharing the number; Bhutan numbers from the **preceding** month, so its leap month follows —
 * `monthsFor(2151, BHUTAN)` runs `... M08 M08L ...`. See [traditions.md](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/traditions.md).
 *
 * @throws RangeError with code `TCT_FIELD_OUT_OF_RANGE` if `year` is not a safe integer, a value
 * that is not a number included; `TCT_OUTSIDE_EXACT_RANGE` if it falls beyond the tradition's
 * derivable range; `TCT_INVALID_TRADITION_CONFIG` if `tradition` is not a valid config.
 *
 * @example
 * ```ts
 * leapMonthNumberFor(2151);   // 6 — Phugpa, the default config
 * leapMonthNumberFor(2153);   // undefined — no leap month that year
 * ```
 */
export function leapMonthNumberFor(
	year: number,
	tradition: TraditionConfig = PHUGPA,
): number | undefined {
	const closed = closedFormYear(`leapMonthNumberFor(${describe(year)})`, year, tradition);
	return leapMonthOfYearY(closed.tradition, closed.y);
}

/**
 * Returns how many months the Tibetan year `year` has: 12, or 13 in a year with a leap month.
 *
 * @remarks
 * Equal to `monthsFor(year).length`, and exact up to the configured tradition's derivable range
 * where that is not.
 *
 * @throws RangeError with code `TCT_FIELD_OUT_OF_RANGE` if `year` is not a safe integer, a value
 * that is not a number included; `TCT_OUTSIDE_EXACT_RANGE` if it falls beyond the tradition's
 * derivable range; `TCT_INVALID_TRADITION_CONFIG` if `tradition` is not a valid config.
 */
export function monthsInYear(year: number, tradition: TraditionConfig = PHUGPA): number {
	const closed = closedFormYear(`monthsInYear(${describe(year)})`, year, tradition);
	return isLeapYear(closed.tradition, closed.y) ? 13 : 12;
}

/**
 * Returns every calendar day of a Tibetan month, in order, each labelled with its Tibetan date.
 *
 * @remarks
 * The month grid, and the counterpart of {@link monthsFor}: `monthsFor(year)` then `datesFor(month)`
 * lays out a whole year in two calls.
 *
 * **Why this is not `for (let d = 1; d <= month.days; d++)`.** Date numbers always run 1–30 while
 * the span is 29 or 30 *calendar days*, because some numbers are skipped and some are carried by
 * two consecutive days. Counting to `days` therefore produces a grid that is wrong in most months —
 * under `PHUGPA`, 2,333 of the 2,473 months of Tibetan 2000–2199 (1873–2073 CE), 94%, lack at least
 * one number. This walks the calendar days instead, which is also the right model for a UI: one
 * cell per day, labelled by conversion.
 *
 * So a doubled number appears **twice**, the first carrying {@link TibetanDate.isLeapDay}, and a
 * skipped number does not appear at all. Both are ordinary: over the same months, 94% skip a
 * number and 64% carry a doubled one.
 *
 * Bounded by construction at 29 or 30 entries, so unlike a date *range* it needs no span cap.
 *
 * @param month - The month to lay out. Accepts a {@link TibetanMonth} from `monthsFor` directly, or
 * a hand-built `{ year, month, isLeapMonth }`.
 * @param tradition - Astronomical constants. Defaults to `PHUGPA`.
 *
 * @throws RangeError with code `TCT_INVALID_ARGUMENT` if `month` is not an object naming a Tibetan
 * month, or its `year` or `month` is absent or not a number, or `isLeapMonth` is present and not a
 * boolean; `TCT_FIELD_OUT_OF_RANGE` for a `year` or `month` that is a number but not an integer or
 * is out of range; `TCT_NO_SUCH_LEAP_MONTH` if `isLeapMonth` is set for a month with no
 * twin that year; `TCT_OUTSIDE_EXACT_RANGE` past the tradition's exact range;
 * `TCT_INVALID_TRADITION_CONFIG` if `tradition` is not a valid config.
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
	tradition: TraditionConfig = PHUGPA,
): TibetanDate[] {
	const { first, last } = boundedMonth("datesFor", month, "month", tradition);

	const dates: TibetanDate[] = [];
	for (let julianDay = first; julianDay <= last; julianDay++) {
		dates.push(isoToTibetan(isoFromJulianDayUnchecked(julianDay), tradition));
	}
	return dates;
}
