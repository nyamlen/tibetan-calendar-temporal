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
 * import { getObservances, DEFAULT_OBSERVANCES } from "tibetan-calendar-temporal/observances";
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
import { type ScaledTradition, scalingFor } from "../computation/scaling.js";
import { assertQueryOptions, codedError, describe, rangeError } from "../errors.js";
import { PHUGPA } from "../traditions/phugpa.js";
import { DEFAULT_OBSERVANCES } from "./default-observances.js";
import type {
	Observance,
	ObservanceConfig,
	ObservanceQueryOptions,
	ObservanceResolution,
	ObservanceRule,
} from "./types.js";

export { DEFAULT_OBSERVANCES } from "./default-observances.js";
export type {
	DoubledDayChoice,
	LeapMonthChoice,
	Observance,
	ObservanceConfig,
	ObservanceKind,
	ObservanceQueryOptions,
	ObservanceResolution,
	ObservanceRule,
	ObservanceWhen,
	SkippedDayChoice,
} from "./types.js";

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
const OBSERVANCE_KINDS = ["duchen", "sojong", "tsok", "puja", "anniversary"];
const TIERS = [1, 2, 3];

/**
 * Rejects a config whose rules could not resolve to the days they name.
 *
 * @remarks
 * `ObservanceConfig` is the documented extension point — the type comments and the docs both push
 * consumers toward `{ ...DEFAULT_OBSERVANCES, rules: [...] }` — and every field below was
 * previously accepted without a word. The mean-motion formulas are linear in the lunar day, so
 * they extrapolate past the end of a month rather than failing: `day: 31` returned the 1st of the
 * *following* month and `day: 0` the 30th of the *previous* one, each labelled `resolution:
 * "exact"`. An out-of-range `when.month` failed the other way, silently yielding zero hits so the
 * observance vanished from the year. A typo in a downstream rule table shipped a wrong date to
 * practitioners with this library's full authority behind it.
 *
 * The convention fields are checked too, and **required rather than optional**. They are
 * type-level only, so a JavaScript consumer — or a TypeScript one whose config came from
 * `JSON.parse`, or a hand-built config, or a spread of a `Partial<>` — can supply a wrong value or
 * none at all. A wrong one (`"1st"`) was caught; a missing one was not, and missing is the likelier
 * input. All three then resolved to `undefined`, fell through the `if` chains below to whichever
 * branch happened to be last, and produced a wrong date in silence: omitting `leapMonth` put the
 * 2024 Chokhor Duchen in the regular month 6 rather than the leap month FPMT prints, one month off.
 *
 * @throws RangeError naming the offending rule.
 */
function validateObservanceConfig(config: ObservanceConfig): void {
	// The config object itself, before anything dereferences it. `assertTraditionConfig` has covered
	// this since it was written; this validator was modelled on it and stopped short, so
	// `observancesOn(date, null)` produced a raw uncoded TypeError and a consumer's
	// `catch (e) { if (e.code === …) }` fell through to its generic branch.
	if (config === null || typeof config !== "object") {
		throw rangeError(
			"TCT_INVALID_OBSERVANCE_CONFIG",
			`ObservanceConfig must be an object, received ${describe(config)}. Pass DEFAULT_OBSERVANCES, ` +
				"or a config spread from it",
		);
	}

	// `config.id` is interpolated into the messages below, so it is checked before they can quote it.
	assertNonEmptyString(config.id, "observance config id");
	assertNonEmptyString(config.name, `observance config "${config.id}": name`);

	assertChoice(config.doubledDay, DOUBLED_DAY_CHOICES, "config doubledDay");
	assertChoice(config.skippedDay, SKIPPED_DAY_CHOICES, "config skippedDay");
	assertChoice(config.leapMonth, LEAP_MONTH_CHOICES, "config leapMonth");

	if (!Array.isArray(config.rules)) {
		throw rangeError(
			"TCT_INVALID_OBSERVANCE_CONFIG",
			`observance config "${config.id}": rules must be an array. An institution is built by ` +
				"spreading a shipped config — `{ ...DEFAULT_OBSERVANCES, " +
				"rules: [...DEFAULT_OBSERVANCES.rules, mine] }` — never by " +
				"supplying a partial one",
		);
	}

	const seen = new Set<string>();
	for (const rule of config.rules) {
		if (rule === null || typeof rule !== "object") {
			throw rangeError(
				"TCT_INVALID_OBSERVANCE_CONFIG",
				`observance config "${config.id}": every rule must be an object, received ` +
					`${describe(rule)}`,
			);
		}
		if (typeof rule.id !== "string" || rule.id === "") {
			throw rangeError(
				"TCT_INVALID_OBSERVANCE_CONFIG",
				`observance rule id must be a non-empty string, received ${describe(rule.id)}`,
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

		assertNonEmptyString(rule.name, `observance rule "${rule.id}": name`);
		assertChoice(rule.kind, OBSERVANCE_KINDS, `observance rule "${rule.id}" kind`);
		if (!TIERS.includes(rule.tier)) {
			throw rangeError(
				"TCT_INVALID_OBSERVANCE_CONFIG",
				`observance rule "${rule.id}": tier must be 1, 2 or 3, received ${describe(rule.tier)}. ` +
					"It says who may keep the observance — 1 universal, 2 general practice, 3 requires " +
					"empowerment — and a consumer filters on it",
			);
		}
		// An empty string satisfies the type but not the intent. The field exists so that "a rule
		// invented from memory is at least conspicuously uncited", which "" defeats exactly.
		assertNonEmptyString(
			rule.source,
			`observance rule "${rule.id}": source`,
			"Every rule carries where it comes from, consumer-supplied rules included, so that one " +
				"invented from memory is conspicuously uncited",
		);

		if (rule.when === null || typeof rule.when !== "object") {
			throw rangeError(
				"TCT_INVALID_OBSERVANCE_CONFIG",
				`observance rule "${rule.id}": when must be a { month?, day } object, received ` +
					`${describe(rule.when)}`,
			);
		}

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

		assertOptionalChoice(
			rule.doubledDay,
			DOUBLED_DAY_CHOICES,
			`observance rule "${rule.id}" doubledDay`,
		);
		assertOptionalChoice(
			rule.skippedDay,
			SKIPPED_DAY_CHOICES,
			`observance rule "${rule.id}" skippedDay`,
		);
		assertOptionalChoice(
			rule.leapMonth,
			LEAP_MONTH_CHOICES,
			`observance rule "${rule.id}" leapMonth`,
		);
	}
}

/**
 * Rejects a **required** field that is not one of its documented values, `undefined` included.
 *
 * @remarks
 * The `undefined` case is the whole point of the split from {@link assertOptionalChoice}. These
 * fields are declared required on `ObservanceConfig`, and a missing one used to fall through to
 * whichever branch of `resolveInMonth` or `appliesToMonth` came last.
 */
function assertChoice(value: unknown, allowed: readonly string[], subject: string): void {
	if (typeof value !== "string" || !allowed.includes(value)) {
		throw rangeError(
			"TCT_INVALID_OBSERVANCE_CONFIG",
			`${subject} must be one of ${allowed.map((a) => `"${a}"`).join(", ")}, received ` +
				`${describe(value)}`,
		);
	}
}

/**
 * Rejects a per-rule override that is present but not one of its documented values.
 *
 * @remarks
 * Absent is legitimate here and only here: an override that is missing means "use the config's
 * default", which is what {@link ObservanceRule.doubledDay} and its two siblings document.
 */
function assertOptionalChoice(value: unknown, allowed: readonly string[], subject: string): void {
	if (value !== undefined) assertChoice(value, allowed, subject);
}

/** A non-empty string, with an optional sentence explaining why the field matters. */
function assertNonEmptyString(value: unknown, subject: string, why?: string): void {
	if (typeof value !== "string" || value === "") {
		throw rangeError(
			"TCT_INVALID_OBSERVANCE_CONFIG",
			`${subject} must be a non-empty string, received ${describe(value)}` +
				(why === undefined ? "" : `. ${why}`),
		);
	}
}

/**
 * Configs already validated, so a config passed on every frame of a UI is checked once.
 *
 * @remarks
 * Keyed on the object, matching {@link scalingFor} above. A consumer who mutates a config in place
 * after first use escapes revalidation, which is the same bargain the scaling cache already makes.
 *
 * The bargain covers **consumer-supplied** configs only: {@link DEFAULT_OBSERVANCES} is deeply
 * frozen, so the object a reader is most likely to mutate cannot reach the stale-cache state at
 * all.
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
 * @param from - First calendar day to include. Accepts a `Temporal.PlainDate`, an ISO string, a
 * `PlainDateTime` or a `ZonedDateTime` — normalised the same way as every other date entry point,
 * via `asPlainDate`.
 * @param to - Last calendar day to include, accepting the same shapes as `from`. Returns `[]` if
 * before `from`.
 * @param options - `config` (which observances) and `tradition` (astronomical constants).
 *
 * @throws RangeError with code `TCT_INVALID_ARGUMENT` if `from` or `to` is not a value
 * `asPlainDate` accepts, or if `options` is not an object or carries a key other than `config` and
 * `tradition`; `TCT_SPAN_TOO_WIDE` if the span exceeds 200 years; or
 * `TCT_INVALID_OBSERVANCE_CONFIG` if `config` is invalid.
 */
export function getObservances(
	from: Temporal.PlainDate,
	to: Temporal.PlainDate,
	options: ObservanceQueryOptions = {},
): Observance[] {
	assertQueryOptions("getObservances", ["config", "tradition"], options);
	// Not `?? DEFAULT_OBSERVANCES`: nullish-coalescing treats an explicit `null` as absent, so a
	// caller passing `{ config: null }` would silently get the default instead of the coded
	// rejection the positional signature gave them. Only `undefined` means "omitted"; everything
	// else is the caller's value and goes to the validator.
	const config = options.config === undefined ? DEFAULT_OBSERVANCES : options.config;
	const tradition = options.tradition === undefined ? PHUGPA : options.tradition;
	// Normalised before anything else touches from/to: Temporal.PlainDate.compare and the span-cap
	// comparison below both accept a raw string without complaint, which let a string range slip
	// past the cap (NaN > 200 is false) and let null/number arguments reach Temporal as uncoded
	// TypeErrors instead of this package's coded RangeError.
	from = asPlainDate(from);
	to = asPlainDate(to);

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
		const yearHasLeapOfThisNumber = sharesNumberWithLeapMonth(tradition, month.year, month.month);

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
			date = isoToTibetan(isoFromJulianDayUnchecked(hit.julianDay), tradition);
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
	options: ObservanceQueryOptions = {},
): Observance[] {
	assertQueryOptions("observancesOn", ["config", "tradition"], options);
	return getObservances(date, date, options);
}
