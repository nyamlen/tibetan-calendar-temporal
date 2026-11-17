import { floorDiv } from "../computation/arithmetic.js";
import { asPlainDate, isoToTibetan, julianDayFromIso } from "../computation/conversion.js";
import type { ScaledTradition } from "../computation/scaling.js";
import { scalingFor } from "../computation/scaling.js";
import { describe, hasCode, rangeError } from "../errors.js";
import { PHUGPA } from "../traditions/phugpa.js";
import type { TraditionConfig } from "../traditions/types.js";
import { validatedTradition } from "../traditions/validate.js";
import {
	MAX_SPAN_YEARS,
	occurrencesOfRule,
	type TibetanDateOfDay,
	tibetanDateMemo,
} from "./occurrences.js";
import type { Observance, ObservanceConfig, ObservanceRule, ObservanceWhen } from "./types.js";
import { ensureValidated } from "./validate.js";

/** How many days the first search chunk spans, by form: about the form's largest gap. */
// A monthly rule recurs within about two months, an annual one within a year, or two under
// `skippedDay: "omit"`, a counted one within 30 days, and a 29 February within eight years, because
// 1900 and 2100 are not leap years. A formula holds within a few days, and a period begins again
// within a year, with nothing to find inside a span but the next day. Each chunk that finds nothing
// is followed by one twice as long, so a rule with a longer gap costs a few more walks and not a
// wrong answer.
const FIRST_CHUNK_DAYS: Record<ObservanceWhen["type"], number> = {
	monthly: 62,
	annual: 731,
	period: 62,
	western: 2922,
	formula: 31,
	counted: 31,
};

/** What a chunk search found, and whether it met the upper end of the tradition's exact range. */
interface ChunkResult {
	readonly found: Observance[];
	readonly metEnd: boolean;
}

/** The results of one rule over a chunk, or what lies before the first day it cannot answer. */
// A form whose result needs more than its own day, a period's whole span or a counted rule's
// anchors up to a year either side, cannot be built for a day whose span or anchors lie outside the
// exact range. That is only true of the days that need the far side, so a chunk that fails is halved
// and its earlier half searched first, down to one day.
//
// What a failing day means depends on which end it is near. Near the **upper** bound the search has
// met the end, and every day after it fails too, so the later half is skipped once the earlier one
// has met it. Near the **lower** bound the day's span or anchors begin out of range and the days
// after it may be fine: there is no occurrence there, and the search goes on. The range is symmetric
// about zero, so the day's half of it says which end. Only `TCT_OUTSIDE_EXACT_RANGE` is read this
// way, whichever form throws it.
function firstWithin(
	rule: ObservanceRule,
	start: number,
	end: number,
	config: ObservanceConfig,
	scaled: ScaledTradition,
	tibetanDateOf: TibetanDateOfDay,
): ChunkResult {
	try {
		return {
			found: occurrencesOfRule(rule, start, end, config, scaled, tibetanDateOf),
			metEnd: false,
		};
	} catch (error) {
		if (!hasCode(error, "TCT_OUTSIDE_EXACT_RANGE")) throw error;
		if (start === end) {
			// The exact range is symmetric about zero (`Math.abs(julianDay) <= exactToJulianDay` in
			// conversion.ts), so a failing day with a positive Julian day is at the upper end.
			return { found: [], metEnd: start > 0 };
		}
		const middle = start + floorDiv(end - start, 2);
		const earlier = firstWithin(rule, start, middle, config, scaled, tibetanDateOf);
		if (earlier.found.length > 0 || earlier.metEnd) return earlier;
		return firstWithin(rule, middle + 1, end, config, scaled, tibetanDateOf);
	}
}

/**
 * Returns the first observance of one rule strictly after a day, or `null` if none lies within 10 years.
 *
 * @remarks
 * What a "next occurrence" screen wants, without computing every rule over a long range: only the
 * rule named is evaluated. The result is exactly what {@link getObservances} gives for that rule —
 * the same one result per calendar day, the same `age` and `period` — so a loop feeding each result's
 * date back in reproduces the range query, here until 2030:
 *
 * ```ts
 * const found: Observance[] = [];
 * let next = nextObservance(from, "chotrul-duchen", EXAMPLE_OBSERVANCES);
 * while (next !== null && next.date.isoDate.year < 2030) {
 *   found.push(next);
 *   next = nextObservance(next.date.isoDate, "chotrul-duchen", EXAMPLE_OBSERVANCES);
 * }
 * ```
 *
 * **Strictly after `from`**: a `from` that is itself an occurrence returns the following one. Under
 * `doubledDay: "both"` the two halves of a doubled day are two calendar days, so chaining visits
 * each exactly once.
 *
 * **A `period` rule steps by day.** Inside a span the next occurrence is tomorrow, and outside one it
 * is the span's first day. {@link Observance.period} carries the span's bounds either way, so the
 * start of the following span is one call from `period.last`.
 *
 * **`null` means none within the horizon, not never.** The search covers the 10 years after `from`
 * (the same 10 as {@link getObservances}'s span cap) and stops at the end of the tradition's
 * computable range. A rule whose window has ended, a `western` rule beginning more than 10 years
 * away, and a search that meets the end of the range all answer `null`. That includes a `period`
 * whose span ends past the end of the range, because the result would have to carry a bound that
 * cannot be computed; {@link getObservances} and {@link observancesOn} refuse that case with
 * `TCT_OUTSIDE_EXACT_RANGE`, since they cannot answer a day without its span.
 *
 * **Near the lower end the search skips instead.** A `period` whose span begins before the start of
 * the range has no occurrence there that can be built, and the search goes on to the days after it;
 * {@link getObservances} and {@link observancesOn} refuse such a day with
 * `TCT_OUTSIDE_EXACT_RANGE`.
 *
 * Arguments are checked in a fixed order, as in {@link getObservances}: `from`, then the config,
 * then the tradition, then `ruleId`.
 *
 * @param from - The day to search after. Accepts the same shapes as `getObservances`' dates.
 * @param ruleId - The `id` of a rule in `config`.
 * @param config - Which observances, and the conventions for resolving them. Required.
 * @param tradition - Astronomical constants. Defaults to `PHUGPA`.
 *
 * @throws RangeError with code `TCT_INVALID_ARGUMENT` if `from` is not one of those shapes, or
 * `ruleId` is not a string or names no rule of `config`; `TCT_INVALID_OBSERVANCE_CONFIG`
 * if `config` is missing or invalid; `TCT_INVALID_TRADITION_CONFIG` if `tradition` is invalid; or
 * `TCT_OUTSIDE_EXACT_RANGE` if `from` lies beyond where the tradition's arithmetic stays exact.
 */
export function nextObservance(
	from: Temporal.PlainDate,
	ruleId: string,
	config: ObservanceConfig,
	tradition?: TraditionConfig,
): Observance | null {
	from = asPlainDate(from, "nextObservance(from)");

	config = ensureValidated(config, "nextObservance");
	// Not `?? PHUGPA`: an explicit `null` is a rejection, and only `undefined` means omitted.
	let resolvedTradition = tradition === undefined ? PHUGPA : tradition;
	resolvedTradition = validatedTradition(resolvedTradition);

	if (typeof ruleId !== "string") {
		throw rangeError(
			"TCT_INVALID_ARGUMENT",
			`nextObservance(ruleId): expected a rule id string, received ${describe(ruleId)}`,
		);
	}
	const rule = config.rules.find((candidate) => candidate.id === ruleId);
	if (rule === undefined) {
		throw rangeError(
			"TCT_INVALID_ARGUMENT",
			`nextObservance(ruleId): config ${describe(config.id)} has no rule with id ${describe(ruleId)}`,
		);
	}

	// Refuses a `from` past the exact range with TCT_OUTSIDE_EXACT_RANGE, as the range query does.
	isoToTibetan(from, resolvedTradition);

	const scaled = scalingFor(resolvedTradition);
	const fromJd = julianDayFromIso(from);
	const lastJd = Math.min(
		julianDayFromIso(from.add({ years: MAX_SPAN_YEARS })),
		scaled.exactToJulianDay,
	);

	const tibetanDateOf = tibetanDateMemo(scaled);
	let start = fromJd + 1;
	let size = FIRST_CHUNK_DAYS[rule.when.type];
	while (start <= lastJd) {
		const end = Math.min(start + size - 1, lastJd);
		const { found, metEnd } = firstWithin(rule, start, end, config, scaled, tibetanDateOf);
		if (found[0] !== undefined) return found[0];
		if (metEnd) return null;
		start = end + 1;
		size *= 2;
	}
	return null;
}
