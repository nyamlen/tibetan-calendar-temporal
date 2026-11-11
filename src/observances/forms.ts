/**
 * How each form of {@link ObservanceWhen} lands on calendar days.
 *
 * @remarks
 * Internal. `occurrencesInMonth` is the one dispatch on `when.type`; a further form is a further
 * case here and a further arm of the validator, and nothing in the query changes.
 */

import { classifyDay, firstDayOfMonth } from "../computation/calendar.js";
import type { ScaledTradition } from "../computation/scaling.js";
import { codedError } from "../errors.js";
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
		const choice = rule.doubledDay ?? config.doubledDay;
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
	const skipped = rule.skippedDay ?? config.skippedDay;
	if (skipped === "omit") return [];
	/* c8 ignore next */
	if (skipped !== "preceding") {
		/* c8 ignore next */
		throw codedError("TCT_INTERNAL", `unhandled skippedDay choice ${JSON.stringify(skipped)}`);
	}

	// The preceding calendar day. Taking it as a Julian day rather than as a day *number* handles
	// day 1 without a special case, where the preceding day belongs to the previous month.
	// Janson's own advice for month boundaries is the same: add or subtract one from the JD
	// rather than reason about numbers that may not exist.
	//
	// Exactly 1, not `<= 1`: day is validated to 1-30 before it reaches here, so the wider guard
	// only ever hid an invalid rule behind a plausible-looking result.
	if (day === 1)
		return [
			{ julianDay: firstDayOfMonth(scaled, monthCount) - 1, resolution: "shiftedFromSkipped" },
		];

	// The number below is never also skipped: that would need three lunar day ends inside one
	// calendar day, so two consecutive lunar days totalling under 24 hours against a 21.5-hour
	// minimum. So one step back always lands on a real day.
	const preceding = classifyDay(scaled, day - 1, monthCount);
	const julianDay = preceding.julianDay ?? preceding.leapJulianDay;
	/* c8 ignore next */
	if (julianDay === undefined) return [];
	return [{ julianDay, resolution: "shiftedFromSkipped" }];
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
	const choice = rule.leapMonth ?? config.leapMonth;
	if (choice === "both") return true;
	if (choice === "leap") return month.isLeap;
	if (choice === "regular") return !month.isLeap;
	/* c8 ignore next */
	throw codedError("TCT_INTERNAL", `unhandled leapMonth choice ${JSON.stringify(choice)}`);
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
	month: { month: number; isLeap: boolean },
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
		default:
			/* c8 ignore next */
			throw codedError("TCT_INTERNAL", `unhandled when type ${JSON.stringify(when)}`);
	}
}
