/**
 * Resolves which days of the Tibetan calendar an institution marks as practice days.
 *
 * @remarks
 * Unlike the date arithmetic, nothing here is derived from Janson, and no almanac settles it: which
 * days a centre observes is a convention the published sources disagree about. So the conventions
 * are injected as data, in an {@link ObservanceConfig}, and never fixed in the engine.
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
 * days.filter((o) => o.rule.tags?.includes("duchen")).map((o) => o.date.isoDate.toString());
 * ```
 *
 * @packageDocumentation
 */

import { asPlainDate, julianDayFromIsoUnchecked } from "../computation/conversion.js";
import { scalingFor } from "../computation/scaling.js";
import { rangeError } from "../errors.js";
import { PHUGPA } from "../traditions/phugpa.js";
import type { TraditionConfig } from "../traditions/types.js";
import { validatedTradition } from "../traditions/validate.js";
import { MAX_SPAN_YEARS, occurrencesOfRule, tibetanDateMemo } from "./occurrences.js";
import type { Observance, ObservanceConfig } from "./types.js";
import { ensureValidated } from "./validate.js";

export { composeObservances } from "./compose.js";
export { EXAMPLE_OBSERVANCES } from "./example-observances.js";
export { nextObservance } from "./next.js";
export type {
	DoubledDayChoice,
	FormulaName,
	LeapMonthChoice,
	Observance,
	ObservanceConfig,
	ObservanceLayer,
	ObservanceLevel,
	ObservanceResolution,
	ObservanceRule,
	ObservanceWhen,
	SkippedDayChoice,
	TibetanMonthDay,
} from "./types.js";

/**
 * Returns every observance falling between two dates, inclusive, in date order.
 *
 * @remarks
 * One query rather than one per category: a consumer's question is "what is significant about
 * this day", and the categories overlap. Filter {@link Observance.rule} by `level` or `tags` for a
 * subset.
 *
 * **Order.** Results are in date order, and results on the same day follow the order of the rules in
 * `config.rules`: the first rule listed comes first. That is a contract, so a config's author
 * chooses what a day's list opens with, and {@link composeObservances} states how a layer changes
 * the order.
 *
 * Both bounds are inclusive. Results for one day may be several, and on a doubled date under
 * `"both"` the same rule appears twice with different {@link Observance.resolution} values. A rule
 * gives **one result per calendar day**: where two of its entries land on the same day — a rule
 * naming days 29 and 30 in a month whose 30th is skipped — the exact landing is kept, then a
 * doubled half, then a shifted day.
 *
 * **The span is capped at 10 years.** The rule is on calendar years, `to.year - from.year <= 10`,
 * not on elapsed time: `2020-01-01` to `2030-12-31` is admitted, though it touches 11 calendar years and
 * runs almost 11, and `2020-12-31` to `2031-01-01` is refused, though it is 10 years and 2 days. Cost is
 * linear in the range. A day, month, year or planning view needs at most about two years. Measured
 * on the machine recorded in
 * [`bench/RESULTS.md`](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/bench/RESULTS.md),
 * 10 years over a config holding one rule of each
 * form but `counted` takes about 18 ms on average (the slowest sample about 25 ms), and two
 * years about 4 ms; the figures are the latest run recorded there.
 *
 * A caller who genuinely wants a wider table — the whole rabjung era, 1027–2027 CE, is the realistic
 * example — requests it in chunks and concatenates. That is correct because this function is pure
 * and restarts its month walk per call, and consecutive chunks that cut on a day boundary lose and
 * repeat nothing. A service forwarding user-supplied `from` and `to` gets `TCT_SPAN_TOO_WIDE` for a
 * wider range rather than a long synchronous computation.
 *
 * **A `period` whose span ends past the end of the tradition's exact range** makes a day inside it
 * throw `TCT_OUTSIDE_EXACT_RANGE`, though the day itself is inside the range: each result carries
 * the bounds of its whole span, and the last of them cannot be computed. It reaches only the last
 * days before the end, as far back as the span is long, and no day is dropped quietly instead.
 * {@link nextObservance} answers `null` there.
 *
 * Arguments are checked in a fixed order: the dates, then the config, then the tradition, and only
 * then the empty-range shortcut — so a reversed range with no config still throws.
 *
 * @param from - First calendar day to include. Accepts a `Temporal.PlainDate`, an ISO string, a
 * `PlainDateTime` or a `ZonedDateTime` — normalised the same way as every other date entry point.
 * @param to - Last calendar day to include, accepting the same shapes as `from`. Returns `[]` if
 * before `from`.
 * @param config - Which observances, and the conventions for resolving them. Required.
 * @param tradition - Astronomical constants. Defaults to `PHUGPA`.
 *
 * @throws RangeError with code `TCT_INVALID_ARGUMENT` if `from` or `to` is not one of the shapes
 * above; `TCT_INVALID_OBSERVANCE_CONFIG` if `config` is missing or invalid;
 * `TCT_INVALID_TRADITION_CONFIG` if `tradition` is invalid; `TCT_SPAN_TOO_WIDE` if `to.year -
 * from.year` exceeds 10; or `TCT_OUTSIDE_EXACT_RANGE` if either end, or the span of a `period`
 * result, lies beyond where the tradition's arithmetic stays exact.
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
	from = asPlainDate(from, "getObservances(from)");
	to = asPlainDate(to, "getObservances(to)");

	config = ensureValidated(config, "getObservances");
	// Not `?? PHUGPA`: nullish-coalescing treats an explicit `null` as absent, so a caller passing
	// `null` would silently get the default instead of the coded rejection. Only `undefined` means
	// "omitted".
	let resolvedTradition = tradition === undefined ? PHUGPA : tradition;
	resolvedTradition = validatedTradition(resolvedTradition);

	if (Temporal.PlainDate.compare(from, to) > 0) return [];

	// Compared as year numbers rather than elapsed days, which is how the docblock reads and what
	// keeps a range ending on 31 December ten years on -- 11 calendar years -- admissible.
	//
	// Why a cap at all: cost is linear in the range, and what it guards against is the range beyond
	// it. `Temporal.PlainDate` reaches from -271821 to +275760, about 547,000 years, so a service
	// forwarding user-supplied `from`/`to` straight through would hand its event loop four orders of
	// magnitude more than the cap admits, synchronously and without yielding. `MAX_SPAN_YEARS` is the
	// constant, shared with `nextObservance`'s horizon.
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
	const firstJd = julianDayFromIsoUnchecked(from);
	const lastJd = julianDayFromIsoUnchecked(to);

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
			found.push({ julianDay: julianDayFromIsoUnchecked(observance.date.isoDate), observance });
		}
	}

	// By day alone. Results are pushed rule by rule in the order of `config.rules`, and a rule gives
	// one result per calendar day, so the sort is stable and two results on one day come from two
	// rules, left in the config's order, which is the documented same-day order. No tie-break:
	// none could ever compare equal.
	found.sort((a, b) => a.julianDay - b.julianDay);
	return found.map((entry) => entry.observance);
}

/**
 * Returns every observance falling on one calendar day.
 *
 * @remarks
 * The single-day case of {@link getObservances}, which is what a "what is today" screen wants.
 * Results follow the order of the rules in `config.rules`.
 *
 * @param date - The calendar day.
 * @param config - Which observances, and the conventions for resolving them. Required.
 * @param tradition - Astronomical constants. Defaults to `PHUGPA`.
 *
 * @throws The same codes as {@link getObservances} except `TCT_SPAN_TOO_WIDE`, which a single day
 * cannot reach; `TCT_OUTSIDE_EXACT_RANGE` includes a day in a `period` whose span ends past the end
 * of the exact range.
 */
export function observancesOn(
	date: Temporal.PlainDate,
	config: ObservanceConfig,
	tradition?: TraditionConfig,
): Observance[] {
	// Checked here as well, in `getObservances`' order, so a refusal of the date or the config names
	// `observancesOn`; both are then answered from the memo when `getObservances` repeats them.
	const day = asPlainDate(date, "observancesOn(date)");
	config = ensureValidated(config, "observancesOn");
	return getObservances(day, day, config, tradition);
}
