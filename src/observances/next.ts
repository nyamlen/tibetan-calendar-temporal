import { asPlainDate, isoToTibetan, julianDayFromIso } from "../computation/conversion.js";
import { scalingFor } from "../computation/scaling.js";
import { describe, hasCode, rangeError } from "../errors.js";
import { PHUGPA } from "../traditions/phugpa.js";
import type { TraditionConfig } from "../traditions/types.js";
import { assertTraditionConfig } from "../traditions/validate.js";
import { MAX_SPAN_YEARS, occurrencesOfRule, tibetanDateMemo } from "./occurrences.js";
import type { Observance, ObservanceConfig, ObservanceWhen } from "./types.js";
import { ensureValidated } from "./validate.js";

/**
 * How many days the first search chunk spans, by form: about the form's largest gap.
 *
 * @remarks
 * A monthly rule recurs within about two months, an annual one within a year, or two under
 * `skippedDay: "omit"`, a counted one within 30 days, and a 29 February within eight years, because
 * 1900 and 2100 are not leap years. A formula holds within a few days, and a period begins again
 * within a year, with nothing to find inside a span but the next day. Each chunk that finds nothing
 * is followed by one twice as long, so a rule with a longer gap costs a few more walks and not a
 * wrong answer.
 */
const FIRST_CHUNK_DAYS: Record<ObservanceWhen["type"], number> = {
	monthly: 62,
	annual: 731,
	period: 62,
	western: 2922,
	formula: 31,
	counted: 31,
};

/**
 * The first observance of one rule strictly after a day, or `null` if none lies within 10 years.
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
 * Arguments are checked in a fixed order, as in {@link getObservances}: `from`, then the config,
 * then the tradition, then `ruleId`.
 *
 * @param from - The day to search after. Accepts the same shapes as `getObservances`' dates,
 * normalised through `asPlainDate`.
 * @param ruleId - The `id` of a rule in `config`.
 * @param config - Which observances, and the conventions for resolving them. Required.
 * @param tradition - Astronomical constants. Defaults to `PHUGPA`.
 *
 * @throws RangeError with code `TCT_INVALID_ARGUMENT` if `from` is not a value `asPlainDate`
 * accepts, or `ruleId` is not a string or names no rule of `config`; `TCT_INVALID_OBSERVANCE_CONFIG`
 * if `config` is missing or invalid; `TCT_INVALID_TRADITION_CONFIG` if `tradition` is invalid; or
 * `TCT_OUTSIDE_EXACT_RANGE` if `from` lies beyond where the tradition's arithmetic stays exact.
 */
export function nextObservance(
	from: Temporal.PlainDate,
	ruleId: string,
	config: ObservanceConfig,
	tradition?: TraditionConfig,
): Observance | null {
	from = asPlainDate(from);

	ensureValidated(config);
	// Not `?? PHUGPA`: an explicit `null` is a rejection, and only `undefined` means omitted.
	const resolvedTradition = tradition === undefined ? PHUGPA : tradition;
	assertTraditionConfig(resolvedTradition);

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
		let found: Observance[];
		try {
			found = occurrencesOfRule(rule, start, end, config, scaled, tibetanDateOf);
		} catch (error) {
			// A period's result carries its whole span's bounds, so a span ending past the exact range
			// cannot be built for any of its days: the search has met the end. Only this code, and only
			// here, which is the one site a span's last day is converted from inside the range.
			if (hasCode(error, "TCT_OUTSIDE_EXACT_RANGE")) return null;
			throw error;
		}
		const [first] = found;
		if (first !== undefined) return first;
		start = end + 1;
		size *= 2;
	}
	return null;
}
