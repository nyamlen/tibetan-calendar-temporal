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
import { rangeError } from "../errors.js";
import { PHUGPA } from "../traditions/phugpa.js";
import type { TraditionConfig } from "../traditions/types.js";
import { assertTraditionConfig } from "../traditions/validate.js";
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
	assertTraditionConfig(config);
	const derived = deriveScaling(config);
	scalingCache.set(config, derived);
	return derived;
}

/**
 * The widest range {@link getObservances} will answer, in years.
 *
 * @remarks
 * Compared as `to.year - from.year`, so 1950 to 2150 is 200 and admissible.
 */
const MAX_SPAN_YEARS = 200;

const DOUBLED_DAY_CHOICES = ["first", "second", "both"];
const SKIPPED_DAY_CHOICES = ["preceding", "omit"];
const LEAP_MONTH_CHOICES = ["leap", "regular", "both"];

/**
 * Rejects a config whose rules could not resolve to the days they name.
 *
 * @remarks
 * `ObservanceConfig` is the documented extension point — the type comments and the docs both push
 * consumers toward `{ ...GELUG, rules: [...] }` — and every field below was previously accepted
 * without a word. The mean-motion formulas are linear in the lunar day, so they extrapolate past
 * the end of a month rather than failing: `day: 31` returned the 1st of the *following* month and
 * `day: 0` the 30th of the *previous* one, each labelled `resolution: "exact"`. An out-of-range
 * `when.month` failed the other way, silently yielding zero hits so the observance vanished from
 * the year. A typo in a downstream rule table shipped a wrong date to practitioners with this
 * library's full authority behind it.
 *
 * The convention fields are checked too. They are type-level only, so a JavaScript consumer — or
 * a TypeScript one whose config came from `JSON.parse` — passing `"1st"` fell through to the
 * `"both"` branch and got two observances where one was meant.
 *
 * @throws RangeError naming the offending rule.
 */
function validateObservanceConfig(config: ObservanceConfig): void {
	assertChoice(config.doubledDay, DOUBLED_DAY_CHOICES, "config doubledDay");
	assertChoice(config.skippedDay, SKIPPED_DAY_CHOICES, "config skippedDay");
	assertChoice(config.leapMonth, LEAP_MONTH_CHOICES, "config leapMonth");

	if (!Array.isArray(config.rules)) {
		throw rangeError(
			"TCT_INVALID_OBSERVANCE_CONFIG",
			`observance config "${config.id}": rules must be an array. An institution is built by ` +
				"spreading a shipped config — `{ ...GELUG, rules: [...GELUG.rules, mine] }` — never by " +
				"supplying a partial one",
		);
	}

	const seen = new Set<string>();
	for (const rule of config.rules) {
		if (typeof rule.id !== "string" || rule.id === "") {
			throw rangeError(
				"TCT_INVALID_OBSERVANCE_CONFIG",
				`observance rule id must be a non-empty string, received ${rule.id}`,
			);
		}
		// Documented as "unique within a config" and never enforced; duplicates silently produced
		// duplicate results, ordered only by the sort's stability.
		if (seen.has(rule.id)) {
			throw rangeError(
				"TCT_INVALID_OBSERVANCE_CONFIG",
				`observance rule id must be unique within a config, "${rule.id}" repeats`,
			);
		}
		seen.add(rule.id);

		const { day } = rule.when;
		if (!Number.isInteger(day) || day < 1 || day > 30) {
			throw rangeError(
				"TCT_INVALID_OBSERVANCE_CONFIG",
				`observance rule "${rule.id}": day must be an integer 1-30, received ${day}. A rule ` +
					"names a Tibetan lunar day, which always runs 1-30; a day that no calendar day " +
					"carries is handled by the skippedDay convention, not by omitting the rule",
			);
		}
		if ("month" in rule.when) {
			const { month } = rule.when;
			if (!Number.isInteger(month) || month < 1 || month > 12) {
				throw rangeError(
					"TCT_INVALID_OBSERVANCE_CONFIG",
					`observance rule "${rule.id}": month must be an integer 1-12, received ${month}. ` +
						"A leap month is selected by the leapMonth convention, not by a thirteenth number",
				);
			}
		}

		assertChoice(rule.doubledDay, DOUBLED_DAY_CHOICES, `observance rule "${rule.id}" doubledDay`);
		assertChoice(rule.skippedDay, SKIPPED_DAY_CHOICES, `observance rule "${rule.id}" skippedDay`);
		assertChoice(rule.leapMonth, LEAP_MONTH_CHOICES, `observance rule "${rule.id}" leapMonth`);
	}
}

/** Rejects an optional convention field that is present but not one of its documented values. */
function assertChoice(value: string | undefined, allowed: string[], subject: string): void {
	if (value !== undefined && !allowed.includes(value)) {
		throw rangeError(
			"TCT_INVALID_OBSERVANCE_CONFIG",
			`${subject} must be one of ${allowed.map((a) => `"${a}"`).join(", ")}, received ` +
				`${JSON.stringify(value)}`,
		);
	}
}

/**
 * Configs already validated, so a config passed on every frame of a UI is checked once.
 *
 * @remarks
 * Keyed on the object, matching {@link scalingFor} above. A consumer who mutates a config in place
 * after first use escapes revalidation, which is the same bargain the scaling cache already makes.
 */
const validatedConfigs = new WeakSet<ObservanceConfig>();

function ensureValidated(config: ObservanceConfig): void {
	if (validatedConfigs.has(config)) return;
	validateObservanceConfig(config);
	validatedConfigs.add(config);
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
 * **The span is capped at {@link MAX_SPAN_YEARS} years.** Cost is linear in the range and the
 * work per month is real — mean motion, two correction tables, and a full `isoToTibetan`
 * inversion per hit — so an unbounded query is minutes of synchronous, non-yielding CPU rather
 * than the milliseconds a day-walker would cost. `Temporal.PlainDate` reaches from -271821 to
 * +275760, which is about 547,000 years, and any service forwarding user-supplied `from`/`to`
 * straight through would hand that to its event loop.
 *
 * The cap is deliberately far beyond real use: the Phugpa tradition dates from 1447, so 200 years
 * exceeds any span an almanac or an application asks for. A caller who genuinely wants a wider
 * table — the whole rabjung era, 1027–2027, is the realistic example — requests it in chunks and
 * concatenates. That is correct because this function is pure and restarts its month walk per
 * call.
 *
 * @param from - First calendar day to include.
 * @param to - Last calendar day to include. Returns `[]` if before `from`.
 * @param config - Which observances, and the conventions for resolving them. Defaults to
 * {@link GELUG}.
 * @param tradition - Astronomical constants. Defaults to `PHUGPA`.
 *
 * @throws RangeError if the span exceeds {@link MAX_SPAN_YEARS}, or if `config` is invalid.
 */
export function getObservances(
	from: Temporal.PlainDate,
	to: Temporal.PlainDate,
	config: ObservanceConfig = GELUG,
	tradition: TraditionConfig = PHUGPA,
): Observance[] {
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

	ensureValidated(config);
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
