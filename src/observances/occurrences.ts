import {
	lastMonthCountOfYear,
	monthFromCount,
	sharesNumberWithLeapMonth,
	trueMonthCount,
} from "../computation/calendar.js";
import { isoFromJulianDayUnchecked, isoToTibetan } from "../computation/conversion.js";
import { yearFromRoyalEra } from "../computation/epoch.js";
import type { ScaledTradition } from "../computation/scaling.js";
import { codedError } from "../errors.js";
import type { TibetanDate } from "../types.js";
import {
	type CountedAnchor,
	countedMonthDays,
	countedSchedule,
	type Occurrence,
	occurrencesInMonth,
	westernOccurrences,
} from "./forms.js";
import type {
	Observance,
	ObservanceConfig,
	ObservanceResolution,
	ObservanceRule,
} from "./types.js";

/**
 * The widest range {@link getObservances} will answer, in years, and how far `nextObservance` looks.
 *
 * @remarks
 * Compared as `to.year - from.year`, so 2020-01-01 to 2030-12-31 is 10 and admissible.
 */
export const MAX_SPAN_YEARS = 10;

/**
 * Which of two results for one rule on one calendar day is kept: lower wins.
 *
 * @remarks
 * An exact landing beats a doubled half, which beats a day shifted off a skipped number, because
 * the first is what the rule says, the second is what the almanac prints, and the third is a
 * substitute for a day that does not exist.
 */
const PRECEDENCE: Record<ObservanceResolution, number> = {
	exact: 0,
	firstOfDoubled: 1,
	secondOfDoubled: 1,
	// Never competes within one rule: a period rule emits only this, and a day appears once in it.
	inPeriod: 1,
	dayBeforeSkipped: 2,
	dayAfterSkipped: 2,
	// Last: a counted day is derived from an anchor, so any claim to the same day that names the
	// day itself outranks it. It never ties within one rule, since a count drops the days near an
	// anchor, but the order is stated rather than left to that.
	counted: 3,
};

function precedence(resolution: ObservanceResolution): number {
	return PRECEDENCE[resolution];
}

/** A function from a Julian day to its Tibetan date, remembering what it has converted. */
export type TibetanDateOfDay = (julianDay: number) => TibetanDate;

/**
 * A fresh memo over `isoToTibetan` for one tradition.
 *
 * @remarks
 * One per query rather than module state: a 15th carries several rules, so a query over many rules
 * shares one memo, and nothing outlives the call.
 */
export function tibetanDateMemo(scaled: ScaledTradition): TibetanDateOfDay {
	const dates = new Map<number, TibetanDate>();
	return (julianDay) => {
		let date = dates.get(julianDay);
		if (date === undefined) {
			date = isoToTibetan(isoFromJulianDayUnchecked(julianDay), scaled.tradition);
			dates.set(julianDay, date);
		}
		return date;
	};
}

/**
 * Every result of one rule between two Julian days, inclusive, in date order.
 *
 * @remarks
 * The whole-range reduction for one rule: one result per calendar day, across the range and not per
 * month, because a skipped day 1 shifts onto the previous month's last day, which the same rule may
 * already hold exactly. Entries that land together reduce to the best claim. The caller guarantees
 * `firstJd <= lastJd` and that both lie inside the tradition's exact range.
 *
 * Shared by `getObservances`, which calls it once per rule, and `nextObservance`, which calls it for
 * the one rule asked about.
 */
export function occurrencesOfRule(
	rule: ObservanceRule,
	firstJd: number,
	lastJd: number,
	config: ObservanceConfig,
	scaled: ScaledTradition,
	tibetanDateOf: TibetanDateOfDay = tibetanDateMemo(scaled),
): Observance[] {
	const tradition = scaled.tradition;
	const when = rule.when;
	const held = new Map<number, Occurrence>();
	const claim = (hit: Occurrence): void => {
		if (hit.julianDay < firstJd || hit.julianDay > lastJd) return;
		const incumbent = held.get(hit.julianDay);
		if (incumbent === undefined || precedence(hit.resolution) < precedence(incumbent.resolution)) {
			held.set(hit.julianDay, hit);
		}
	};

	if (when.type === "western") {
		const firstYear = isoFromJulianDayUnchecked(firstJd).year;
		const lastYear = isoFromJulianDayUnchecked(lastJd).year;
		for (const hit of westernOccurrences(when, firstYear, lastYear)) claim(hit);
	} else {
		// Walk months linearly by true month count, which needs no special case for leap months —
		// that is exactly what trueMonthCount and monthFromCount are an inverse pair for. Start a
		// month early and end a month late so a rule shifted off a skipped date cannot be missed.
		const startYear = yearFromRoyalEra(tibetanDateOf(firstJd).year);
		const endYear = yearFromRoyalEra(tibetanDateOf(lastJd).year);
		// A counted rule needs the anchors on both sides of the range, up to a year each way: the
		// latest anchor on or before `firstJd` is at most 385 days back, and the first one after
		// `lastJd` decides which of the last days before it the count keeps. So its walk covers the
		// whole Tibetan year before the range and after it; the other forms are filtered to the range
		// by `claim`.
		const counted = when.type === "counted";
		const firstMonth = counted
			? trueMonthCount(tradition, startYear - 1, 1) - 1
			: trueMonthCount(tradition, startYear, 1) - 1;
		const lastMonth = counted
			? lastMonthCountOfYear(tradition, endYear + 1) + 1
			: trueMonthCount(tradition, endYear + 1, 1) + 1;

		const anchors: CountedAnchor[] = [];
		const excluded = new Set<number>();

		for (let monthCount = firstMonth; monthCount <= lastMonth; monthCount++) {
			const month = monthFromCount(tradition, monthCount);
			// Whether this year holds two months of this number, which is what makes the leap-month
			// convention bite.
			//
			// Asked of the month directly rather than by probing the neighbour at `monthCount ± 1`,
			// which assumed a leap month's twin sits at `+1` and a regular month's at `−1` — true only
			// while leap months precede, and exactly inverted under `leapMonthPosition: "after"`. The
			// failure was not a mirrored answer but a missed one: the probe found no twin, so the
			// `leapMonth` convention was bypassed altogether and the observance fired in *both*
			// months. `sharesNumberWithLeapMonth` is directionless and answers the question without
			// knowing where to look.
			const yearHasLeapOfThisNumber = sharesNumberWithLeapMonth(tradition, month.year, month.month);

			if (when.type === "counted") {
				const here = countedMonthDays(
					rule,
					when,
					config,
					scaled,
					monthCount,
					month,
					yearHasLeapOfThisNumber,
				);
				anchors.push(...here.anchors);
				for (const day of here.excluded) excluded.add(day);
				continue;
			}
			for (const hit of occurrencesInMonth(
				rule,
				config,
				scaled,
				monthCount,
				month,
				yearHasLeapOfThisNumber,
			)) {
				claim(hit);
			}
		}

		if (when.type === "counted") {
			for (const hit of countedSchedule(
				when,
				tradition,
				scaled,
				anchors,
				excluded,
				firstJd,
				lastJd,
			)) {
				claim(hit);
			}
		}
	}

	const results: Observance[] = [];
	for (const hit of [...held.values()].sort((a, b) => a.julianDay - b.julianDay)) {
		const date = tibetanDateOf(hit.julianDay);
		if (when.type === "monthly" || when.type === "formula" || when.type === "counted") {
			results.push({ date, rule, resolution: hit.resolution });
			continue;
		}
		if (when.type === "period") {
			/* c8 ignore next */
			if (hit.span === undefined) throw codedError("TCT_INTERNAL", "a period day carries no span");
			results.push({
				date,
				rule,
				resolution: hit.resolution,
				period: {
					first: tibetanDateOf(hit.span.first),
					last: tibetanDateOf(hit.span.last),
				},
			});
			continue;
		}
		/* c8 ignore next */
		if (when.type !== "annual" && when.type !== "western") {
			throw codedError("TCT_INTERNAL", `unhandled when type ${JSON.stringify(when)}`);
		}
		// The occurrence's own year, of the resolved day: a Tibetan month-12 date can fall in January,
		// where its Tibetan year and its Western year differ.
		const year =
			when.type === "western" ? isoFromJulianDayUnchecked(hit.julianDay).year : date.year;
		if (when.fromYear !== undefined && year < when.fromYear) continue;
		if (when.untilYear !== undefined && year > when.untilYear) continue;
		const age = when.ageFromYear === undefined ? -1 : year - when.ageFromYear;
		results.push(
			age < 0
				? { date, rule, resolution: hit.resolution }
				: { date, rule, resolution: hit.resolution, age },
		);
	}
	return results;
}
