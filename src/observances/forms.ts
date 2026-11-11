/**
 * How each form of {@link ObservanceWhen} lands on calendar days.
 *
 * @remarks
 * Internal. `occurrencesInMonth` is the one dispatch on `when.type`; a further form is a further
 * case here and a further arm of the validator, and nothing in the query changes.
 */

import {
	classifyDay,
	firstDayOfMonth,
	sharesNumberWithLeapMonth,
	trueMonthCount,
} from "../computation/calendar.js";
import { julianDayFromIso } from "../computation/conversion.js";
import type { ScaledTradition } from "../computation/scaling.js";
import { codedError } from "../errors.js";
import { formulaHolds } from "./formulas.js";
import type {
	ObservanceConfig,
	ObservanceResolution,
	ObservanceRule,
	ObservanceWhen,
} from "./types.js";

/** The Julian day a rule occupies, with how it was arrived at. */
export interface Occurrence {
	readonly julianDay: number;
	readonly resolution: ObservanceResolution;
	/** For a period: the Julian days of the whole span's first and last calendar days. */
	readonly span?: { readonly first: number; readonly last: number };
}

/** The Julian days one day number occupies in one month, with how each was arrived at. */
function resolveInMonth(
	scaled: ScaledTradition,
	monthCount: number,
	day: number,
	rule: ObservanceRule,
	config: ObservanceConfig,
): Occurrence[] {
	const classification = classifyDay(scaled, day, monthCount);

	if (classification.kind === "normal")
		return [{ julianDay: classification.julianDay as number, resolution: "exact" }];

	if (classification.kind === "doubled") {
		const choice = rule.doubledDay === undefined ? config.doubledDay : rule.doubledDay;
		const first = {
			julianDay: classification.leapJulianDay as number,
			resolution: "firstOfDoubled" as const,
		};
		const second = {
			julianDay: classification.julianDay as number,
			resolution: "secondOfDoubled" as const,
		};
		// Explicit rather than positional. `return [first, second]` as a bare fall-through meant any
		// value that was not "first" or "second" — `undefined` above all — silently inherited the
		// "both" branch and emitted two observances where one was meant. The validator now excludes
		// that, and this makes a future fourth choice fail loudly rather than inherit a neighbour's
		// behaviour.
		if (choice === "first") return [first];
		if (choice === "second") return [second];
		if (choice === "both") return [first, second];
		/* c8 ignore next */
		throw codedError("TCT_INTERNAL", `unhandled doubledDay choice ${JSON.stringify(choice)}`);
	}

	// Skipped: no calendar day carries this number.
	const skipped = rule.skippedDay === undefined ? config.skippedDay : rule.skippedDay;
	if (skipped === "omit") return [];
	if (skipped === "preceding") return [precedingDay(scaled, monthCount, day)];
	if (skipped === "following") return [followingDay(scaled, monthCount, day)];
	/* c8 ignore next */
	throw codedError("TCT_INTERNAL", `unhandled skippedDay choice ${JSON.stringify(skipped)}`);
}

/**
 * The calendar day before a skipped number, taken as a Julian day rather than a day number, so
 * day 1 needs no special case beyond reading the month's first day: its predecessor belongs to
 * the previous month. Janson's own advice for month boundaries is the same.
 *
 * The number below is never also skipped: that would need three lunar day ends inside one
 * calendar day, so two consecutive lunar days totalling under 24 hours against a 21.5-hour
 * minimum. So one step back always lands on a real day.
 */
function precedingDay(scaled: ScaledTradition, monthCount: number, day: number): Occurrence {
	// Exactly 1, not `<= 1`: day is validated to 1-30 before it reaches here, so the wider guard
	// only ever hid an invalid rule behind a plausible-looking result.
	if (day === 1)
		return { julianDay: firstDayOfMonth(scaled, monthCount) - 1, resolution: "dayBeforeSkipped" };
	const before = classifyDay(scaled, day - 1, monthCount);
	const julianDay = before.julianDay ?? before.leapJulianDay;
	/* c8 ignore next */
	if (julianDay === undefined) throw codedError("TCT_INTERNAL", `no day carries ${day - 1}`);
	return { julianDay, resolution: "dayBeforeSkipped" };
}

/**
 * The calendar day after the one carrying the number below a skipped one, by Julian day.
 *
 * `julianDay` of d - 1 is the later half when d - 1 is doubled, so one step on is always the day
 * that follows. It is not `julianDay ?? leapJulianDay` of d + 1, which picks the second half of a
 * doubled d + 1 and leaves its first half between. A skipped 30 rolls into the next month's first
 * day. A skipped day 1 means the month opens on day 2, so the day after is that first day.
 */
function followingDay(scaled: ScaledTradition, monthCount: number, day: number): Occurrence {
	if (day === 1)
		return { julianDay: firstDayOfMonth(scaled, monthCount), resolution: "dayAfterSkipped" };
	const carrying = classifyDay(scaled, day - 1, monthCount).julianDay;
	/* c8 ignore next */
	if (carrying === undefined) throw codedError("TCT_INTERNAL", `no day carries ${day - 1}`);
	return { julianDay: carrying + 1, resolution: "dayAfterSkipped" };
}

/** Whether an annual rule applies to this month, given the leap-month convention. */
function appliesToMonth(
	rule: ObservanceRule,
	config: ObservanceConfig,
	month: { month: number; isLeap: boolean },
	dateMonth: number,
	yearHasLeapOfThisNumber: boolean,
): boolean {
	if (dateMonth !== month.month) return false;
	if (!yearHasLeapOfThisNumber) return true;

	// Explicit rather than positional, for the same reason as resolveInMonth's branches: `"regular"`
	// was the fall-through, so a missing `leapMonth` put an annual observance in the regular month
	// with no error — one month off what FPMT prints for the 2024 Chokhor Duchen.
	const choice = rule.leapMonth === undefined ? config.leapMonth : rule.leapMonth;
	if (choice === "both") return true;
	if (choice === "leap") return month.isLeap;
	if (choice === "regular") return !month.isLeap;
	/* c8 ignore next */
	throw codedError("TCT_INTERNAL", `unhandled leapMonth choice ${JSON.stringify(choice)}`);
}

/**
 * The true month count an endpoint of a period means in a year, given the leap-month convention.
 *
 * @remarks
 * Where the year has two months of the number, `"leap"` and `"regular"` pick one and `"both"` puts
 * `first` on the earlier twin and `last` on the later, so the span covers both. "Earlier" is by
 * count and not by which twin is the leap one, because that order is the tradition's.
 */
function periodEndpointCount(
	scaled: ScaledTradition,
	choice: string,
	year: number,
	month: number,
	end: "first" | "last",
): number {
	const tradition = scaled.tradition;
	const regular = trueMonthCount(tradition, year, month, false);
	if (!sharesNumberWithLeapMonth(tradition, year, month)) return regular;
	const leap = trueMonthCount(tradition, year, month, true);
	if (choice === "leap") return leap;
	if (choice === "regular") return regular;
	if (choice === "both") return end === "first" ? Math.min(regular, leap) : Math.max(regular, leap);
	/* c8 ignore next */
	throw codedError("TCT_INTERNAL", `unhandled leapMonth choice ${JSON.stringify(choice)}`);
}

/**
 * Every calendar day of a period, resolved once, from the visit to the month the span opens in.
 *
 * @remarks
 * A membership test: each day number from the first endpoint's to the last's, in month order,
 * contributes the calendar days that carry it — both halves of a doubled number, none of a skipped
 * one — so neither `doubledDay` nor `skippedDay` is consulted. Emitting the whole span at its first
 * month, and nothing at the others, keeps each span from being found once per month it covers.
 * A span cannot cross the new year, so the year of the visited month is the span's year.
 */
function periodOccurrences(
	rule: ObservanceRule,
	config: ObservanceConfig,
	scaled: ScaledTradition,
	monthCount: number,
	year: number,
	when: Extract<ObservanceWhen, { type: "period" }>,
): Occurrence[] {
	const choice = rule.leapMonth === undefined ? config.leapMonth : rule.leapMonth;
	const start = periodEndpointCount(scaled, choice, year, when.first.month, "first");
	if (monthCount !== start) return [];
	const end = periodEndpointCount(scaled, choice, year, when.last.month, "last");

	const days: number[] = [];
	for (let count = start; count <= end; count++) {
		const lowest = count === start ? when.first.day : 1;
		const highest = count === end ? when.last.day : 30;
		for (let day = lowest; day <= highest; day++) {
			const found = classifyDay(scaled, day, count);
			if (found.kind === "skipped") continue;
			if (found.kind === "doubled") days.push(found.leapJulianDay as number);
			days.push(found.julianDay as number);
		}
	}
	const first = days[0];
	const last = days[days.length - 1];
	if (first === undefined || last === undefined) return [];
	const span = { first, last };
	return days.map((julianDay) => ({ julianDay, resolution: "inPeriod" as const, span }));
}

/**
 * The calendar days of one month a `formula` form holds on.
 *
 * @remarks
 * A formula is a property of a calendar day, so each day number is classified and every calendar
 * day it occupies is tested on its own: both halves of a doubled number, none of a skipped one.
 * The weekday comes from the Julian day, which is a Monday at 0 modulo 7, so Sunday counts 0 as
 * `(julianDay + 1) % 7`; no Tibetan date is built until a day is a result. Always `"exact"`.
 */
function formulaOccurrences(
	when: Extract<ObservanceWhen, { type: "formula" }>,
	scaled: ScaledTradition,
	monthCount: number,
): Occurrence[] {
	const found: Occurrence[] = [];
	for (let day = 1; day <= 30; day++) {
		const classification = classifyDay(scaled, day, monthCount);
		if (classification.kind === "skipped") continue;
		const days =
			classification.kind === "doubled"
				? [classification.leapJulianDay as number, classification.julianDay as number]
				: [classification.julianDay as number];
		for (const julianDay of days) {
			if (formulaHolds(when.formula, day, (julianDay + 1) % 7)) {
				found.push({ julianDay, resolution: "exact" });
			}
		}
	}
	return found;
}

/**
 * The occurrences of one rule in one month, in the order its entries are listed.
 *
 * @remarks
 * A monthly rule is monthly: it recurs in every month, including both halves of a leap pair. The
 * leap-month convention is about *annual* observances, which have one occurrence a year and
 * therefore a choice to make. FPMT's 2024 calendars show this directly — tsog falls on the 10th of
 * leap month 6 and again on the 10th of the regular month 6 — while the Chokhor Duchen, an annual
 * observance, appears only in the leap month.
 *
 * Two entries of one rule can land on the same calendar day; the query keeps one.
 */
export function occurrencesInMonth(
	rule: ObservanceRule,
	config: ObservanceConfig,
	scaled: ScaledTradition,
	monthCount: number,
	month: { year: number; month: number; isLeap: boolean },
	yearHasLeapOfThisNumber: boolean,
): Occurrence[] {
	const when: ObservanceWhen = rule.when;
	switch (when.type) {
		case "monthly":
			return when.days.flatMap((day) => resolveInMonth(scaled, monthCount, day, rule, config));
		case "annual":
			return when.dates.flatMap((date) =>
				appliesToMonth(rule, config, month, date.month, yearHasLeapOfThisNumber)
					? resolveInMonth(scaled, monthCount, date.day, rule, config)
					: [],
			);
		case "period":
			return periodOccurrences(rule, config, scaled, monthCount, month.year, when);
		case "western":
			// Fixed to the Gregorian calendar, so it is not found by walking Tibetan months; see
			// `westernOccurrences`.
			return [];
		case "formula":
			return formulaOccurrences(when, scaled, monthCount);
		default:
			/* c8 ignore next */
			throw codedError("TCT_INTERNAL", `unhandled when type ${JSON.stringify(when)}`);
	}
}

/**
 * The Julian days a `western` form falls on in each Western year from `firstYear` to `lastYear`.
 *
 * @remarks
 * A 29 February has no day in a common year and is skipped there rather than moved: a Gregorian
 * anniversary on 29 February is kept in leap years only. Always `"exact"`.
 */
export function westernOccurrences(
	when: Extract<ObservanceWhen, { type: "western" }>,
	firstYear: number,
	lastYear: number,
): Occurrence[] {
	const found: Occurrence[] = [];
	for (let year = firstYear; year <= lastYear; year++) {
		if (Temporal.PlainDate.from({ year, month: when.month, day: 1 }).daysInMonth < when.day)
			continue;
		const date = Temporal.PlainDate.from({ year, month: when.month, day: when.day });
		found.push({ julianDay: julianDayFromIso(date), resolution: "exact" });
	}
	return found;
}
