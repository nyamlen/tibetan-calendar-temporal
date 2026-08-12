/**
 * Observances — which days of the Tibetan calendar an institution marks, and why.
 *
 * @remarks
 * This is Layer 4, and the only layer whose content is not derived from Janson. See
 * [types.ts]({@link ./types.js}) for why that difference is load-bearing, and why the conventions
 * are injected data rather than logic.
 *
 * @example
 * ```ts
 * import { getObservances, GELUG } from "tibetan-calendar-temporal/observances";
 *
 * const days = getObservances(
 *   Temporal.PlainDate.from("2026-01-01"),
 *   Temporal.PlainDate.from("2026-12-31"),
 * );
 * days.filter((o) => o.rule.kind === "duchen").map((o) => o.date.isoDate.toString());
 * ```
 *
 * @packageDocumentation
 */

import {
	classifyDay,
	firstDayOfMonth,
	monthFromCount,
	trueMonthCount,
} from "../computation/calendar.js";
import { isoFromJulianDay, isoToTibetan, julianDayFromIso } from "../computation/conversion.js";
import { yearFromRoyalEra } from "../computation/epoch.js";
import { deriveScaling, type ScaledTradition } from "../computation/scaling.js";
import { PHUGPA } from "../traditions/phugpa.js";
import type { TraditionConfig } from "../traditions/types.js";
import { GELUG } from "./default-gelug.js";
import type {
	Observance,
	ObservanceConfig,
	ObservanceResolution,
	ObservanceRule,
} from "./types.js";

export { GELUG } from "./default-gelug.js";
export type {
	DoubledDayChoice,
	LeapMonthChoice,
	Observance,
	ObservanceConfig,
	ObservanceKind,
	ObservanceResolution,
	ObservanceRule,
	ObservanceWhen,
	SkippedDayChoice,
} from "./types.js";

/** Memoised scaling, so a range query does not redo the gcd work per month. */
const scalingCache = new WeakMap<TraditionConfig, ScaledTradition>();

function scalingFor(config: TraditionConfig): ScaledTradition {
	const cached = scalingCache.get(config);
	if (cached !== undefined) return cached;
	const derived = deriveScaling(config);
	scalingCache.set(config, derived);
	return derived;
}

/** The Julian days a rule occupies in one month, with how each was arrived at. */
function resolveInMonth(
	scaled: ScaledTradition,
	monthCount: number,
	day: number,
	rule: ObservanceRule,
	config: ObservanceConfig,
): { julianDay: number; resolution: ObservanceResolution }[] {
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
		if (choice === "first") return [first];
		if (choice === "second") return [second];
		return [first, second];
	}

	// Skipped: no calendar day carries this number.
	if ((rule.skippedDay ?? config.skippedDay) === "omit") return [];

	// The preceding calendar day. Taking it as a Julian day rather than as a day *number* handles
	// day 1 without a special case, where the preceding day belongs to the previous month.
	// Janson's own advice for month boundaries is the same: add or subtract one from the JD
	// rather than reason about numbers that may not exist.
	if (day <= 1)
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

/** Whether a rule applies to this month, given the leap-month convention. */
function appliesToMonth(
	rule: ObservanceRule,
	config: ObservanceConfig,
	month: { month: number; isLeap: boolean },
	yearHasLeapOfThisNumber: boolean,
): boolean {
	// A monthly rule is monthly: it recurs in every month, including both halves of a leap pair.
	// The leap-month convention is about *annual* observances, which have one occurrence a year
	// and therefore a choice to make. FPMT's 2024 calendars show this directly — tsog falls on
	// the 10th of leap month 6 and again on the 10th of the regular month 6 — while the Chokhor
	// Duchen, an annual observance, appears only in the leap month.
	if (!("month" in rule.when)) return true;
	if (rule.when.month !== month.month) return false;
	if (!yearHasLeapOfThisNumber) return true;

	const choice = rule.leapMonth ?? config.leapMonth;
	if (choice === "both") return true;
	return choice === "leap" ? month.isLeap : !month.isLeap;
}

/**
 * Every observance falling between two dates, inclusive, in date order.
 *
 * @remarks
 * One query rather than one per category: a consumer's question is "what is significant about
 * this day", and the categories overlap — Ganden Ngamchö is a teacher anniversary falling on the
 * 25th, which is also a *tsok* day. Filter {@link Observance.rule} by `kind` or `tier` for a
 * subset.
 *
 * Both bounds are inclusive. Results for one day may be several, and on a doubled date under
 * `"both"` the same rule appears twice with different {@link Observance.resolution} values.
 *
 * @param from - First calendar day to include.
 * @param to - Last calendar day to include. Returns `[]` if before `from`.
 * @param config - Which observances, and the conventions for resolving them. Defaults to
 * {@link GELUG}.
 * @param tradition - Astronomical constants. Defaults to `PHUGPA`.
 */
export function getObservances(
	from: Temporal.PlainDate,
	to: Temporal.PlainDate,
	config: ObservanceConfig = GELUG,
	tradition: TraditionConfig = PHUGPA,
): Observance[] {
	if (Temporal.PlainDate.compare(from, to) > 0) return [];

	const scaled = scalingFor(tradition);
	const firstJd = julianDayFromIso(from);
	const lastJd = julianDayFromIso(to);

	// Walk months linearly by true month count, which needs no special case for leap months —
	// that is exactly what trueMonthCount and monthFromCount are an inverse pair for. Start a
	// month early and end a month late so a rule shifted off a skipped date cannot be missed.
	const startYear = yearFromRoyalEra(isoToTibetan(from, tradition).year);
	const endYear = yearFromRoyalEra(isoToTibetan(to, tradition).year);
	const firstMonth = trueMonthCount(tradition, startYear, 1) - 1;
	const lastMonth = trueMonthCount(tradition, endYear + 1, 1) + 1;

	const found: { julianDay: number; rule: ObservanceRule; resolution: ObservanceResolution }[] = [];

	for (let monthCount = firstMonth; monthCount <= lastMonth; monthCount++) {
		const month = monthFromCount(tradition, monthCount);
		// Whether this year holds two months of this number, which is what makes the leap-month
		// convention bite. Cheap to answer from the neighbouring month.
		const neighbour = monthFromCount(tradition, monthCount + (month.isLeap ? 1 : -1));
		const yearHasLeapOfThisNumber =
			neighbour.month === month.month &&
			neighbour.year === month.year &&
			neighbour.isLeap !== month.isLeap;

		for (const rule of config.rules) {
			if (!appliesToMonth(rule, config, month, yearHasLeapOfThisNumber)) continue;
			for (const hit of resolveInMonth(scaled, monthCount, rule.when.day, rule, config)) {
				if (hit.julianDay < firstJd || hit.julianDay > lastJd) continue;
				found.push({ ...hit, rule });
			}
		}
	}

	found.sort((a, b) => a.julianDay - b.julianDay || a.rule.id.localeCompare(b.rule.id));

	// Convert once per distinct day rather than once per hit: a 15th carries several rules.
	const dates = new Map<number, ReturnType<typeof isoToTibetan>>();
	return found.map((hit) => {
		let date = dates.get(hit.julianDay);
		if (date === undefined) {
			date = isoToTibetan(isoFromJulianDay(hit.julianDay), tradition);
			dates.set(hit.julianDay, date);
		}
		return { date, rule: hit.rule, resolution: hit.resolution };
	});
}

/**
 * Every observance falling on one calendar day.
 *
 * @remarks
 * The single-day case of {@link getObservances}, which is what a "what is today" screen wants.
 */
export function observancesOn(
	date: Temporal.PlainDate,
	config: ObservanceConfig = GELUG,
	tradition: TraditionConfig = PHUGPA,
): Observance[] {
	return getObservances(date, date, config, tradition);
}
