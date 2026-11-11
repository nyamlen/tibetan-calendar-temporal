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
 * import { getObservances, EXAMPLE_OBSERVANCES } from "tibetan-calendar-temporal/observances";
 *
 * const days = getObservances(
 *   Temporal.PlainDate.from("2026-01-01"),
 *   Temporal.PlainDate.from("2026-12-31"),
 *   EXAMPLE_OBSERVANCES,
 * );
 * days.filter((o) => o.rule.id.endsWith("-duchen")).map((o) => o.date.isoDate.toString());
 * ```
 *
 * @packageDocumentation
 */

import { asPlainDate, julianDayFromIso } from "../computation/conversion.js";
import { scalingFor } from "../computation/scaling.js";
import { rangeError } from "../errors.js";
import { PHUGPA } from "../traditions/phugpa.js";
import type { TraditionConfig } from "../traditions/types.js";
import { assertTraditionConfig } from "../traditions/validate.js";
import { MAX_SPAN_YEARS, occurrencesOfRule, tibetanDateMemo } from "./occurrences.js";
import type { Observance, ObservanceConfig } from "./types.js";
import { ensureValidated } from "./validate.js";

export { EXAMPLE_OBSERVANCES } from "./example-observances.js";
export { nextObservance } from "./next.js";
export type {
	DoubledDayChoice,
	FormulaName,
	LeapMonthChoice,
	Observance,
	ObservanceConfig,
	ObservanceLevel,
	ObservanceResolution,
	ObservanceRule,
	ObservanceWhen,
	SkippedDayChoice,
	TibetanMonthDay,
} from "./types.js";

/**
 * Every observance falling between two dates, inclusive, in date order.
 *
 * @remarks
 * One query rather than one per category: a consumer's question is "what is significant about
 * this day", and the categories overlap. Filter {@link Observance.rule} by `level` or `tags` for a
 * subset.
 *
 * Both bounds are inclusive. Results for one day may be several, and on a doubled date under
 * `"both"` the same rule appears twice with different {@link Observance.resolution} values. A rule
 * gives **one result per calendar day**: where two of its entries land on the same day — a rule
 * naming days 29 and 30 in a month whose 30th is skipped — the exact landing is kept, then a
 * doubled half, then a shifted day.
 *
 * **The span is capped at 10 years** (`MAX_SPAN_YEARS`, an internal constant), compared as
 * `to.year - from.year`, so 2020-01-01 to 2030-12-31 is admitted and 2031-01-01 is not. Cost is
 * linear in the range, and what the cap guards against is the range beyond it: `Temporal.PlainDate`
 * reaches from -271821 to +275760, about 547,000 years, so a service forwarding user-supplied
 * `from`/`to` straight through would hand its event loop four orders of magnitude more than the
 * cap admits, synchronously and without yielding. A day, month, year or planning view needs at most
 * about two years. Measured on the machine recorded in `bench/RESULTS.md`, the 10-year worst case
 * over a config holding one rule of each form but `counted` takes about 22 ms, and two years about
 * 4 ms.
 *
 * A caller who genuinely wants a wider table — the whole rabjung era, 1027–2027, is the realistic
 * example — requests it in chunks and concatenates. That is correct because this function is pure
 * and restarts its month walk per call, and consecutive chunks that cut on a day boundary lose and
 * repeat nothing.
 *
 * Arguments are checked in a fixed order: the dates, then the config, then the tradition, and only
 * then the empty-range shortcut — so a reversed range with no config still throws.
 *
 * @param from - First calendar day to include. Accepts a `Temporal.PlainDate`, an ISO string, a
 * `PlainDateTime` or a `ZonedDateTime` — normalised the same way as every other date entry point,
 * via `asPlainDate`.
 * @param to - Last calendar day to include, accepting the same shapes as `from`. Returns `[]` if
 * before `from`.
 * @param config - Which observances, and the conventions for resolving them. Required.
 * @param tradition - Astronomical constants. Defaults to `PHUGPA`.
 *
 * @throws RangeError with code `TCT_INVALID_ARGUMENT` if `from` or `to` is not a value
 * `asPlainDate` accepts; `TCT_INVALID_OBSERVANCE_CONFIG` if `config` is missing or invalid;
 * `TCT_INVALID_TRADITION_CONFIG` if `tradition` is invalid; or `TCT_SPAN_TOO_WIDE` if the span
 * exceeds 10 years.
 */
export function getObservances(
	from: Temporal.PlainDate,
	to: Temporal.PlainDate,
	config: ObservanceConfig,
	tradition?: TraditionConfig,
): Observance[] {
	// Normalised before anything else touches from/to: Temporal.PlainDate.compare and the span-cap
	// comparison below both accept a raw string without complaint, which let a string range slip
	// past the cap (NaN > 10 is false) and let null/number arguments reach Temporal as uncoded
	// TypeErrors instead of this package's coded RangeError.
	from = asPlainDate(from);
	to = asPlainDate(to);

	ensureValidated(config);
	// Not `?? PHUGPA`: nullish-coalescing treats an explicit `null` as absent, so a caller passing
	// `null` would silently get the default instead of the coded rejection. Only `undefined` means
	// "omitted".
	const resolvedTradition = tradition === undefined ? PHUGPA : tradition;
	assertTraditionConfig(resolvedTradition);

	if (Temporal.PlainDate.compare(from, to) > 0) return [];

	// Compared as year numbers rather than elapsed days, which is how the docblock reads and what
	// keeps a range ending on 31 December ten years on -- 11 calendar years -- admissible.
	if (to.year - from.year > MAX_SPAN_YEARS) {
		throw rangeError(
			"TCT_SPAN_TOO_WIDE",
			`observance range must span at most ${MAX_SPAN_YEARS} years, received ` +
				`${from.toString()} to ${to.toString()} (${to.year - from.year} years); request it in ` +
				"chunks instead — the function is pure and restarts its month walk per call, so " +
				"concatenating the results is correct",
		);
	}

	const scaled = scalingFor(resolvedTradition);
	const firstJd = julianDayFromIso(from);
	const lastJd = julianDayFromIso(to);

	// One memo across the rules: a 15th carries several, and each needs the day's Tibetan date.
	const tibetanDateOf = tibetanDateMemo(scaled);
	// Both ends are converted whatever the config holds, so a range outside the tradition's exact
	// arithmetic is refused with TCT_OUTSIDE_EXACT_RANGE even when no rule would convert a day: a
	// config with no rules, or only `western` rules, otherwise answered `[]` for any such range.
	tibetanDateOf(firstJd);
	tibetanDateOf(lastJd);
	const found: { julianDay: number; observance: Observance }[] = [];
	for (const rule of config.rules) {
		for (const observance of occurrencesOfRule(
			rule,
			firstJd,
			lastJd,
			config,
			scaled,
			tibetanDateOf,
		)) {
			found.push({ julianDay: julianDayFromIso(observance.date.isoDate), observance });
		}
	}

	// Code-unit comparison, not localeCompare: that reads the host's default locale and ICU build,
	// so two machines could order the same input differently. "Pure stateless functions, same
	// input same output" is a stated non-negotiable, and a consumer config -- the documented use --
	// with accented or mixed-case ids is where it would have bitten. The shipped ASCII ids sort
	// identically either way, so nothing here would ever have caught it.
	found.sort(
		(a, b) =>
			a.julianDay - b.julianDay ||
			(a.observance.rule.id < b.observance.rule.id
				? -1
				: a.observance.rule.id > b.observance.rule.id
					? 1
					: 0),
	);
	return found.map((entry) => entry.observance);
}

/**
 * Every observance falling on one calendar day.
 *
 * @remarks
 * The single-day case of {@link getObservances}, which is what a "what is today" screen wants.
 *
 * @param date - The calendar day.
 * @param config - Which observances, and the conventions for resolving them. Required.
 * @param tradition - Astronomical constants. Defaults to `PHUGPA`.
 */
export function observancesOn(
	date: Temporal.PlainDate,
	config: ObservanceConfig,
	tradition?: TraditionConfig,
): Observance[] {
	return getObservances(date, date, config, tradition);
}
