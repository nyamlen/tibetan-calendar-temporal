/**
 * The elemental yoga's two checks against FPMT's day-quality codes: the mansion and the favorability.
 *
 * @remarks
 * Moved here from `test/validation/fpmt-observances.test.ts` on 2026-09-18, so that the shipped
 * page's 97.6%, 99.7%, per-year residuals and six unexplained days are measured by the computation
 * the validation suite pins rather than by a second one. What each measured figure means is recorded
 * at the tests, which stay in that suite.
 */

import { mansionElement } from "../../src/astrology/mansion-elements.js";
import {
	mansionDenominator,
	mansionNumber,
	moonCalendarDay,
} from "../../src/astrology/mansions.js";
import { elementalYoga } from "../../src/astrology/yoga.js";
import { trueMonthCount } from "../../src/computation/calendar.js";
import { isoToTibetan } from "../../src/computation/conversion.js";
import { yearFromRoyalEra } from "../../src/computation/epoch.js";
import { scalingFor } from "../../src/computation/scaling.js";
import { weekdayNameFor } from "../../src/cycles.js";
import { PHUGPA } from "../../src/traditions/phugpa.js";
import type { TibetanWeekdayElement } from "../../src/types.js";
import { FPMT_OBSERVANCES } from "../fixtures/fpmt-observances.js";

/** E earth, W water, F fire, A air — air being Janson's *wind*. */
const ELEMENT_LETTERS: Record<string, TibetanWeekdayElement> = {
	E: "earth",
	W: "water",
	F: "fire",
	A: "wind",
};

export const scaled = scalingFor(PHUGPA);

/** Every day carrying a code, with the element the code forces on the mansion. */
export const yogaDays = FPMT_OBSERVANCES.flatMap((row) => {
	if (!row.dayQuality) return [];
	const date = isoToTibetan(Temporal.PlainDate.from(row.iso), PHUGPA);
	const weekday = weekdayNameFor(date.tibetanWeekday, PHUGPA).element;
	const pair = row.dayQuality
		.slice(-2)
		.split("")
		.map((letter) => ELEMENT_LETTERS[letter]);
	if (pair.some((element) => element === undefined)) return [];

	// `isLeapMonth` is not optional here. `trueMonthCount` defaults it to false, and a leap month
	// shares its number with a regular twin — so omitting it silently reads the twin's month and
	// was worth 22 spurious failures, all in leap month 6 of 2024, before this was caught.
	const monthCount = trueMonthCount(
		PHUGPA,
		yearFromRoyalEra(date.year),
		date.month,
		date.isLeapMonth,
	);
	return [
		{
			iso: row.iso,
			code: row.dayQuality,
			weekday,
			pair: pair as TibetanWeekdayElement[],
			date,
			monthCount,
		},
	];
});

/**
 * The days whose code can say anything about the mansion: those naming the weekday's element as one
 * of the pair, so that the other is forced on the mansion.
 *
 * @remarks
 * One day with a code is not among them, 2024-09-12, printed `UD-EW` on a wind weekday — not one of
 * the ten yogas at all. Until 2026-09-18 it was counted in the denominator and so as a mansion
 * *agreement*, by accident, which put the mansion over 1,460 days while every document said 1,459.
 * Its prefix is still a readable favorability claim, so {@link favorabilityDays} keeps it: each check
 * is measured over exactly the days that can bear on it.
 */
export const mansionDays = yogaDays.filter((day) => day.pair.includes(day.weekday));

/** Days where the computed mansion's element is not the one FPMT's code forces. */
export function mansionDisagreements() {
	const denominator = mansionDenominator(scaled);
	const out: { iso: string; position: number }[] = [];
	for (const day of mansionDays) {
		const remaining = [...day.pair];
		remaining.splice(remaining.indexOf(day.weekday), 1);
		const forced = remaining[0];

		const mansion = mansionNumber(scaled, day.date.day, day.monthCount, day.date.isLeapDay);
		if (mansionElement(mansion) === forced) continue;

		// How far through the mansion the moon sits: 0 just entered, 1 about to leave.
		const position =
			((moonCalendarDay(scaled, day.date.day, day.monthCount, day.date.isLeapDay) * 27) %
				denominator) /
			denominator;
		out.push({ iso: day.iso, position });
	}
	return out;
}

/** `FD-` is favorable, `UD-` unfavorable. Anything else is not one of FPMT's day-quality codes. */
const PREFIX_FAVORABLE: Record<string, boolean> = { "FD-": true, "UD-": false };

/** Every day whose code parses into a prefix and a pair of known element letters. */
export const favorabilityDays = FPMT_OBSERVANCES.flatMap((row) => {
	if (!row.dayQuality) return [];
	const favorable = PREFIX_FAVORABLE[row.dayQuality.slice(0, 3)];
	const pair = row.dayQuality
		.slice(-2)
		.split("")
		.map((letter) => ELEMENT_LETTERS[letter]);
	if (favorable === undefined || pair.some((element) => element === undefined)) return [];
	return [{ iso: row.iso, code: row.dayQuality, favorable, pair: pair as TibetanWeekdayElement[] }];
});

/** Days where our table and FPMT's prefix disagree about the same pair. */
export const favorabilityDisagreements = favorabilityDays.filter((day) => {
	const first = day.pair[0];
	const second = day.pair[1];
	if (first === undefined || second === undefined) return false;
	return elementalYoga(first, second).favorable !== day.favorable;
});
