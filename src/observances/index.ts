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

import {
	monthFromCount,
	sharesNumberWithLeapMonth,
	trueMonthCount,
} from "../computation/calendar.js";
import {
	asPlainDate,
	isoFromJulianDayUnchecked,
	isoToTibetan,
	julianDayFromIso,
} from "../computation/conversion.js";
import { yearFromRoyalEra } from "../computation/epoch.js";
import { scalingFor } from "../computation/scaling.js";
import { rangeError } from "../errors.js";
import { PHUGPA } from "../traditions/phugpa.js";
import type { TraditionConfig } from "../traditions/types.js";
import { assertTraditionConfig } from "../traditions/validate.js";
import { type Occurrence, occurrencesInMonth } from "./forms.js";
import type {
	Observance,
	ObservanceConfig,
	ObservanceResolution,
	ObservanceRule,
} from "./types.js";
import { ensureValidated } from "./validate.js";

export { EXAMPLE_OBSERVANCES } from "./example-observances.js";
export type {
	DoubledDayChoice,
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
 * The widest range {@link getObservances} will answer, in years.
 *
 * @remarks
 * Compared as `to.year - from.year`, so 1950 to 2150 is 200 and admissible.
 */
const MAX_SPAN_YEARS = 200;

/**
 * Which of two results for one rule on one calendar day is kept: lower wins.
 *
 * @remarks
 * An exact landing beats a doubled half, which beats a day shifted off a skipped number, because
 * the first is what the rule says, the second is what the almanac prints, and the third is a
 * substitute for a day that does not exist.
 */
function precedence(resolution: ObservanceResolution): number {
	if (resolution === "exact") return 0;
	if (resolution === "dayBeforeSkipped" || resolution === "dayAfterSkipped") return 2;
	return 1;
}

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
 * **The span is capped at 200 years** (`MAX_SPAN_YEARS`, an internal constant). Cost is linear
 * in the range, and what the cap guards against is not the cap itself — the maximum admissible
 * span runs in about 270 ms on the machine recorded in `bench/RESULTS.md`, a 2017 dual-core
 * laptop — but the range beyond it. `Temporal.PlainDate` reaches from -271821 to +275760, about
 * 547,000 years, so a service forwarding user-supplied `from`/`to` straight through would hand
 * its event loop three orders of magnitude more than that, synchronously and without yielding.
 *
 * The cap is deliberately far beyond real use: the Phugpa tradition dates from 1447, so 200 years
 * exceeds any span an almanac or an application asks for. A caller who genuinely wants a wider
 * table — the whole rabjung era, 1027–2027, is the realistic example — requests it in chunks and
 * concatenates. That is correct because this function is pure and restarts its month walk per
 * call.
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
 * exceeds 200 years.
 */
export function getObservances(
	from: Temporal.PlainDate,
	to: Temporal.PlainDate,
	config: ObservanceConfig,
	tradition?: TraditionConfig,
): Observance[] {
	// Normalised before anything else touches from/to: Temporal.PlainDate.compare and the span-cap
	// comparison below both accept a raw string without complaint, which let a string range slip
	// past the cap (NaN > 200 is false) and let null/number arguments reach Temporal as uncoded
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
	// keeps the invariant suite's 1950-01-01 to 2150-12-31 sweep -- 201 calendar years -- admissible.
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

	// Walk months linearly by true month count, which needs no special case for leap months —
	// that is exactly what trueMonthCount and monthFromCount are an inverse pair for. Start a
	// month early and end a month late so a rule shifted off a skipped date cannot be missed.
	const startYear = yearFromRoyalEra(isoToTibetan(from, resolvedTradition).year);
	const endYear = yearFromRoyalEra(isoToTibetan(to, resolvedTradition).year);
	const firstMonth = trueMonthCount(resolvedTradition, startYear, 1) - 1;
	const lastMonth = trueMonthCount(resolvedTradition, endYear + 1, 1) + 1;

	const bestByRule = new Map<ObservanceRule, Map<number, Occurrence>>();

	for (let monthCount = firstMonth; monthCount <= lastMonth; monthCount++) {
		const month = monthFromCount(resolvedTradition, monthCount);
		// Whether this year holds two months of this number, which is what makes the leap-month
		// convention bite.
		//
		// Asked of the month directly rather than by probing the neighbour at `monthCount ± 1`, which
		// is what this did until 2026-08-16. That probe assumed a leap month's twin sits at `+1` and a
		// regular month's at `−1` — true only while leap months precede, and exactly inverted under
		// `leapMonthPosition: "after"`. The failure was not a mirrored answer but a missed one: the
		// probe found no twin, `yearHasLeapOfThisNumber` went false, `appliesToMonth` returned early,
		// and the `leapMonth` convention was bypassed altogether — firing the observance in *both*
		// months rather than the selected one. `sharesNumberWithLeapMonth` is directionless and
		// answers the same question without knowing where to look.
		const yearHasLeapOfThisNumber = sharesNumberWithLeapMonth(
			resolvedTradition,
			month.year,
			month.month,
		);

		for (const rule of config.rules) {
			const hits: Occurrence[] = occurrencesInMonth(
				rule,
				config,
				scaled,
				monthCount,
				month,
				yearHasLeapOfThisNumber,
			);
			for (const hit of hits) {
				if (hit.julianDay < firstJd || hit.julianDay > lastJd) continue;
				// One result per rule per calendar day, across the whole range and not per month: a
				// skipped day 1 shifts onto the previous month's last day, which the same rule may
				// already hold exactly. Entries that land together reduce to the best claim.
				let held = bestByRule.get(rule);
				if (held === undefined) {
					held = new Map();
					bestByRule.set(rule, held);
				}
				const incumbent = held.get(hit.julianDay);
				if (
					incumbent === undefined ||
					precedence(hit.resolution) < precedence(incumbent.resolution)
				) {
					held.set(hit.julianDay, hit);
				}
			}
		}
	}

	const found: { julianDay: number; rule: ObservanceRule; resolution: ObservanceResolution }[] = [];
	for (const [rule, held] of bestByRule) {
		for (const hit of held.values()) found.push({ ...hit, rule });
	}

	// Code-unit comparison, not localeCompare: that reads the host's default locale and ICU build,
	// so two machines could order the same input differently. "Pure stateless functions, same
	// input same output" is a stated non-negotiable, and a consumer config -- the documented use --
	// with accented or mixed-case ids is where it would have bitten. The shipped ASCII ids sort
	// identically either way, so nothing here would ever have caught it.
	found.sort(
		(a, b) =>
			a.julianDay - b.julianDay || (a.rule.id < b.rule.id ? -1 : a.rule.id > b.rule.id ? 1 : 0),
	);

	// Convert once per distinct day rather than once per hit: a 15th carries several rules.
	const dates = new Map<number, ReturnType<typeof isoToTibetan>>();
	return found.map((hit) => {
		let date = dates.get(hit.julianDay);
		if (date === undefined) {
			date = isoToTibetan(isoFromJulianDayUnchecked(hit.julianDay), resolvedTradition);
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
