/**
 * Conversions between `Temporal.PlainDate` and Tibetan dates — Janson §8 and §9.
 *
 * @remarks
 * The forward direction is direct: a Tibetan date names a lunar day, and `⌊true_date⌋` gives the
 * calendar day it ends in. The inverse has no closed form, so it estimates the lunar day count
 * from mean motion and searches a small window — a window whose width is **proved**, not guessed.
 * See {@link isoToTibetan}.
 *
 * @packageDocumentation
 */

import { codedError, hasCode, rangeError } from "../errors.js";
import { monthCodeOf } from "../format.js";
import { weekdayNameOf } from "../names.js";
import { PHUGPA } from "../traditions/phugpa.js";
import type { TraditionConfig } from "../traditions/types.js";
import type { TibetanDate, TibetanDateFields } from "../types.js";
import { rejectInvalidLeapFlags, rejectTemporalInstance, SkippedDayError } from "../types.js";
import { floorDiv, mod } from "./arithmetic.js";
import {
	assertClosedFormYear,
	classifyDay,
	hasLeapTwin,
	losarJulianDay,
	monthFromCount,
	trueMonthCount,
} from "./calendar.js";
import { julianDayOfLunarDay } from "./corrections.js";
import { rabjungFromYear, royalEraFromYear, yearFromRoyalEra, yearNameFromYear } from "./epoch.js";
import { meanDate } from "./mean-astronomy.js";
import { type ScaledTradition, scalingFor } from "./scaling.js";

// Checked at module evaluation, because the next line already needs Temporal. Without this a
// consumer on a runtime that lacks it gets `ReferenceError: Temporal is not defined` on import,
// before calling anything, naming neither the requirement nor the fix. Every entry point reaches
// here: `./observances` imports this module.
/* c8 ignore start -- unreachable under test: the suite runs on Node 26, where Temporal exists */
if (typeof Temporal === "undefined") {
	throw codedError(
		"TCT_MISSING_TEMPORAL",
		"tibetan-calendar-temporal requires the Temporal API, which is not available in this " +
			"runtime. Temporal ships enabled from Node 26; Node 24 has it behind " +
			"--harmony-temporal. On older runtimes or in a browser, import a polyfill before this " +
			'package: `import "temporal-polyfill/global";`',
	);
}
/* c8 ignore stop */

/** 1970-01-01, the anchor for converting between Temporal and Julian day numbers. */
const UNIX_EPOCH = Temporal.PlainDate.from("1970-01-01");

/**
 * Julian day number of 1970-01-01.
 *
 * @remarks
 * Checks out against Janson's worked value: 1 January 2007 is JD 2454102, and 2007-01-01 is
 * 13,514 days after the Unix epoch.
 */
const JULIAN_DAY_AT_UNIX_EPOCH = 2_440_588;

/**
 * Converts a `Temporal.PlainDate` to a Julian day number.
 *
 * @remarks
 * Exact integer arithmetic via Temporal's own day arithmetic — no `Date`, no milliseconds, no
 * timezone. The Julian day number counts days regardless of when they begin, so no time of day
 * is involved; Janson makes the point that this is precisely why the day *number* rather than
 * the Julian *date* is the right tool for calendars.
 */
export function julianDayFromIso(date: Temporal.PlainDate): number {
	const plain = asPlainDate(date);
	return JULIAN_DAY_AT_UNIX_EPOCH + plain.since(UNIX_EPOCH, { largestUnit: "day" }).days;
}

/**
 * Normalises whatever a caller passed into a `Temporal.PlainDate`.
 *
 * @remarks
 * The date entry points used to duck-type on `.since`, which produced three different failures
 * for three ways of getting the argument wrong: a `PlainDateTime` was silently accepted and
 * truncated, a string threw `date.since is not a function`, and a `ZonedDateTime` threw Temporal's
 * own `Must specify time zone`. None of the three carried a code.
 *
 * This accepts an ISO string, a `Temporal.PlainDate`, a `PlainDateTime` or a `ZonedDateTime` — all
 * genuine ways to name a calendar day, narrowing a datetime to its date rather than losing
 * anything a caller meant.
 *
 * It deliberately does **not** accept a bare `{ year, month, day }` object, even though
 * `Temporal.PlainDate.from` does. That shape is exactly this package's own {@link TibetanDateFields}
 * — `isoToTibetan({ year: 2153, month: 12, day: 8 })` is a genuine value of both types, so nothing
 * about the object itself says which calendar it names. Left accepted, it reads a royal-era
 * Tibetan year as an ISO one, or the reverse, and returns a confident, silently wrong date. A
 * caller who wants a plain-fields object read as a Western date can still write
 * `Temporal.PlainDate.from({ year, month, day })` explicitly, which is unambiguous because the
 * class it is called on says which calendar is meant.
 *
 * What it does not accept is also nonsense: `null`, a number, a bare fields object, or a string
 * Temporal cannot read throw a `RangeError` with `TCT_INVALID_ARGUMENT`, naming this package rather
 * than Temporal's internals. The code is the wrong-kind-of-argument one rather than the range one
 * because none of these has a field to be out of a range — they are not Western dates at all.
 */
export function asPlainDate(date: Temporal.PlainDate): Temporal.PlainDate {
	if (date instanceof Temporal.PlainDate) return date;
	// Declared as `unknown` from here: the parameter's own type says `Temporal.PlainDate`, which is
	// the guarantee a TypeScript caller gets, but this function's job past this line is to accept
	// runtime input that does not honour it and either normalise or reject it.
	const raw: unknown = date;
	if (raw instanceof Temporal.PlainDateTime || raw instanceof Temporal.ZonedDateTime) {
		return raw.toPlainDate();
	}
	if (typeof raw !== "string") {
		throw rangeError(
			"TCT_INVALID_ARGUMENT",
			"expected a Temporal.PlainDate, an ISO string, a PlainDateTime or a ZonedDateTime, " +
				`received ${describeValue(raw)}` +
				(raw !== null && typeof raw === "object"
					? ". A bare { year, month, day } object is ambiguous with this package's own " +
						"Tibetan-date shape, so it is rejected rather than guessed at — pass a Temporal " +
						"instance or an ISO string instead"
					: ""),
		);
	}
	try {
		return Temporal.PlainDate.from(raw);
	} catch (error) {
		throw rangeError(
			"TCT_INVALID_ARGUMENT",
			`expected a Temporal.PlainDate, received ${describeValue(raw)}` +
				`${error instanceof Error ? `: ${error.message}` : ""}`,
		);
	}
}

/** A value rendered short enough for a message, and unambiguously: `"3"` is not `3`. */
function describeValue(value: unknown): string {
	if (typeof value === "string") return JSON.stringify(value);
	if (value !== null && typeof value === "object") return value.constructor?.name ?? "an object";
	return String(value);
}

/**
 * Converts a Julian day number back to a `Temporal.PlainDate`.
 *
 * @remarks
 * Guarded like every other exported function, which it was not: `isoFromJulianDay(0.5)` and
 * `isoFromJulianDay(1e15)` both threw uncoded `RangeError`s whose text named Temporal rather than
 * this package, against the README's blanket claim that every failure carries a code.
 *
 * The range check matters more than the tidier message. This was the one public route that did not
 * apply {@link ScaledTradition.exactToJulianDay}, so it was the way into the range the rest of the
 * API carefully refuses. That bound is a property of the tradition rather than of the package —
 * `PHUGPA_HENNING` runs out around ISO year 11,356 where `PHUGPA` does not — so this takes a
 * config and defaults it like every other entry point.
 *
 * @throws RangeError with code `TCT_FIELD_OUT_OF_RANGE` if `julianDay` is not a safe integer, or
 * `TCT_OUTSIDE_EXACT_RANGE` if it lies past where the tradition's arithmetic stays exact.
 */
export function isoFromJulianDay(
	julianDay: number,
	config: TraditionConfig = PHUGPA,
): Temporal.PlainDate {
	if (!Number.isSafeInteger(julianDay)) {
		throw rangeError(
			"TCT_FIELD_OUT_OF_RANGE",
			`isoFromJulianDay: julianDay must be a safe integer, received ${julianDay}. A Julian day ` +
				"number counts whole days, so a fraction names nothing — there is no time of day in it",
		);
	}
	assertExactJulianDay(scalingFor(config), julianDay, () => `isoFromJulianDay(${julianDay})`);
	return isoFromJulianDayUnchecked(julianDay);
}

/**
 * The unguarded conversion, for callers inside this package.
 *
 * @remarks
 * Every internal use already holds a Julian day this package computed and range-checked, so
 * revalidating each one would put a `scalingFor` lookup and a safe-integer test on the hot path of
 * the multi-century sweeps for no gain. {@link describeBound} in particular has to stay unguarded:
 * it formats the exactness bound itself, so checking it against that bound would recurse.
 */
export function isoFromJulianDayUnchecked(julianDay: number): Temporal.PlainDate {
	return UNIX_EPOCH.add({ days: julianDay - JULIAN_DAY_AT_UNIX_EPOCH });
}

/**
 * Renders a caller's input back to them, so a failure identifies the row that produced it.
 *
 * @remarks
 * A caller converting a table of dates gets one throw and needs to know *which* entry caused it.
 * The bad field alone does not say. Optional flags appear only when set, so the common case stays
 * short.
 */
function describeInput(input: TibetanDateFields): string {
	const flags = [
		input.isLeapMonth === true ? "isLeapMonth: true" : undefined,
		input.isLeapDay === true ? "isLeapDay: true" : undefined,
	].filter((f) => f !== undefined);
	const fields = [`year: ${input.year}`, `month: ${input.month}`, `day: ${input.day}`, ...flags];
	return `{ ${fields.join(", ")} }`;
}

/**
 * Rejects a year that is not a safe integer.
 *
 * @remarks
 * One predicate covers fractions, `NaN`, `±Infinity` and 2⁵³ overflow. The bounds checks alone
 * cannot: `NaN` satisfies neither `< 1` nor `> 30`, so it passes every comparison and reaches the
 * arithmetic.
 *
 * This does **not** catch the royal-era confusion — passing Gregorian 2026 where royal-era 2153 is
 * meant. 2026 is a perfectly valid royal-era year (1899 CE), so no guard can distinguish the two,
 * and the conversion returns a well-formed date 127 years away. That is a documentation problem,
 * handled in the README, not something an error message can reach.
 */
function assertSafeYear(subject: string, year: number): void {
	if (!Number.isSafeInteger(year)) {
		throw rangeError(
			"TCT_FIELD_OUT_OF_RANGE",
			`${subject}: year must be a safe integer, received ${year}`,
		);
	}
}

/**
 * Rejects a Julian day past the point where this tradition's arithmetic stays exact.
 *
 * @remarks
 * `true_date` is an integer numerator over `commonDenominator`, so it is roughly `JD · D` and
 * stops being representable at {@link ScaledTradition.exactToJulianDay}. Past that the arithmetic
 * degrades silently rather than refusing, and — worse — a degraded `true_date` misclassifies the
 * day, so 2⁵³ overflow gets reported as a **skipped date**: a specific, confident calendrical
 * claim about a date that was never computed. The correct response to `SkippedDayError` is "fine,
 * that date does not exist"; the correct response here is "your input is out of range". They must
 * not be the same error.
 *
 * Negated comparison so that a `NaN` Julian day fails rather than passes.
 *
 * `subject` is a thunk because this sits on the hot path — `isoToTibetan` is called once per day
 * in the multi-century sweeps — and building the message eagerly would format a date on every
 * successful conversion. It is only ever needed on the throw.
 *
 * The message names the tradition, because the bound is a property of the tradition rather than of
 * the package: `PHUGPA_HENNING`'s common denominator is fifteen times Phugpa's, so it runs out
 * around ISO year 11,356 while Phugpa does not. A caller who hits this on one config and not the
 * other needs to be told which one refused.
 */
export function assertExactJulianDay(
	scaled: ScaledTradition,
	julianDay: number,
	subject: () => string,
): void {
	if (!(Math.abs(julianDay) <= scaled.exactToJulianDay)) {
		throw rangeError(
			"TCT_OUTSIDE_EXACT_RANGE",
			`${subject()} is outside the range where the ${scaled.config.name} tradition's arithmetic ` +
				`stays exact: |JD| must be at most ${scaled.exactToJulianDay}` +
				`${describeBound(scaled.exactToJulianDay)}, received ${julianDay}`,
		);
	}
}

/**
 * The exactness bound as an ISO year, parenthesised, or `""` when it has none.
 *
 * @remarks
 * A raw Julian day in the tens of millions is not a number anyone can act on. The ISO year is, and
 * it is what makes the `PHUGPA_HENNING` limit legible as "about year 11,356" rather than as
 * `4295220`. Some bounds fall outside `Temporal.PlainDate`'s own ±273,972-year range, so this
 * degrades to nothing rather than throwing a second error while reporting the first.
 */
function describeBound(exactToJulianDay: number): string {
	try {
		return ` (about ISO year ${isoFromJulianDayUnchecked(exactToJulianDay).year})`;
		/* c8 ignore next 3 -- only reachable for a tradition whose bound exceeds Temporal's range */
	} catch {
		return "";
	}
}

/**
 * `(JD + 2) mod 7`, with no validation.
 *
 * @remarks
 * For Julian days this package computed and has already bounded. The exported
 * {@link tibetanWeekday} is the guarded entry point, named per the convention
 * `isoFromJulianDayUnchecked` set: an internal caller that has done the checking gets its own name
 * rather than the boundary quietly losing a guard.
 */
function tibetanWeekdayUnchecked(julianDay: number): number {
	return mod(julianDay + 2, 7);
}

/**
 * The Tibetan day of week, 0 = Saturday through 6 = Friday — Janson's day-of-week section.
 *
 * @remarks
 * `(JD + 2) mod 7`. Each weekday corresponds to one of the seven "planets" and takes its name from
 * that planet, as in Latin and several modern European languages; the correspondence reached Tibet
 * from India and goes back to Roman astrology. The cycle is identical to the Western one, so this
 * is a renumbering rather than a different week.
 *
 * {@link TibetanDate.dayOfWeek} exposes the **ISO** numbering instead, matching
 * `Temporal.PlainDate.dayOfWeek`. {@link TibetanDate.tibetanWeekday} carries *this* numbering as a
 * field, which is what to reach for when a `TibetanDate` is already in hand — this function is for
 * callers working from a Julian day directly.
 */
export function tibetanWeekday(julianDay: number): number {
	// The guard this function most needed, and the one it did not have. It returns a plain `number`
	// with no other signal, and every plausible consumer feeds that straight into a lookup table of
	// weekday names — so `tibetanWeekday(1.5)` returning `3.5` is an out-of-bounds index at best and
	// a blank cell in a rendered calendar at worst. `NaN` in gave `NaN` out; a string gave `NaN` too.
	if (!Number.isSafeInteger(julianDay)) {
		throw rangeError(
			"TCT_FIELD_OUT_OF_RANGE",
			`tibetanWeekday: julianDay must be a safe integer, received ${describeValue(julianDay)}`,
		);
	}
	return tibetanWeekdayUnchecked(julianDay);
}

/** The lunar day whose end is the full moon, and the one whose end is the new moon — Janson §6. */
const FULL_MOON_LUNAR_DAY = 15;
const NEW_MOON_LUNAR_DAY = 30;

/** Assembles the public shape from a resolved lunar day. */
function buildDate(
	scaled: ScaledTradition,
	monthCount: number,
	year: number,
	month: number,
	isLeapMonth: boolean,
	day: number,
	isDoubledDay: boolean,
	isLeapDay: boolean,
	julianDay: number,
): TibetanDate {
	const isoDate = isoFromJulianDayUnchecked(julianDay);
	return {
		year: royalEraFromYear(year),
		yearStartsIn: year,
		rabjung: rabjungFromYear(year),
		yearName: yearNameFromYear(year),
		month,
		monthCode: monthCodeOf(month, isLeapMonth),
		isLeapMonth,
		day,
		isDoubledDay,
		isLeapDay,
		// The phase instants end lunar days 15 and 30, so the day carrying one is the day that
		// lunar day ends in — which is what labels every day anyway. Deriving it this way rather
		// than from `day` is what makes it correct when 15 or 30 is skipped.
		//
		// The `day` guard is an optimisation, and a sound one: the phase lands on the day numbered
		// 15 (or 30), or on 14 (or 29) when that number is skipped, and never earlier. Skipping
		// two consecutive numbers would need three lunar day ends inside one calendar day, so two
		// consecutive lunar days totalling under 24 hours, where the minimum length is 21.5 each.
		// Without it, every conversion pays for two extra true-date evaluations.
		isFullMoon:
			(day === FULL_MOON_LUNAR_DAY || day === FULL_MOON_LUNAR_DAY - 1) &&
			julianDayOfLunarDay(scaled, FULL_MOON_LUNAR_DAY, monthCount) === julianDay,
		isNewMoon:
			(day === NEW_MOON_LUNAR_DAY || day === NEW_MOON_LUNAR_DAY - 1) &&
			julianDayOfLunarDay(scaled, NEW_MOON_LUNAR_DAY, monthCount) === julianDay,
		isoDate,
		dayOfWeek: isoDate.dayOfWeek,
		// From the Julian day already in hand rather than from isoDate, which would mean converting
		// back out of Temporal to get the number this function was given.
		tibetanWeekday: tibetanWeekdayUnchecked(julianDay),
		// Built here rather than in epoch.ts because it is the one part of naming that varies by
		// tradition — Bhutan names its weekdays one planet ahead — and this is where the config is.
		weekdayName: weekdayNameOf(
			tibetanWeekdayUnchecked(julianDay),
			scaled.config.naming?.weekdayOffset ?? 0,
		),
		// The month count this date was located by, carried out rather than made rediscoverable.
		lunation: monthCount,
	};
}

/**
 * Converts a Tibetan date to the Western calendar day carrying it.
 *
 * @remarks
 * Total for every input that names a real day. A **skipped** date names no day at all, and
 * throws — use {@link tibetanDateExists} to test first.
 *
 * `year` is the royal-era numbering, not Janson's *Y*. Passing 2026 where 2153 is meant returns
 * a date 127 years away rather than failing quietly.
 *
 * For dates before 1447 the result is a back-projection of a tradition that did not yet exist;
 * before 1582 the `Temporal.PlainDate` is proleptic Gregorian where historical sources are
 * Julian. Neither is an error, but neither is what a contemporary would have written.
 *
 * @throws SkippedDayError if the date is skipped.
 * @throws RangeError with code `TCT_FIELD_OUT_OF_RANGE` if `year`, `month` or `day` is not an
 * integer or is out of range; `TCT_INVALID_ARGUMENT` if `input` is not an object naming a Tibetan
 * date — a `Temporal` instance, `null` — or if `isLeapMonth`/`isLeapDay` are present but not
 * `boolean`; `TCT_NO_SUCH_LEAP_MONTH` if a leap month is requested for a month that has none; or
 * `TCT_OUTSIDE_EXACT_RANGE` if the date falls outside the range where the arithmetic stays exact —
 * see {@link ScaledTradition.exactToJulianDay}.
 *
 * @example
 * ```ts
 * tibetanToIso({ year: 2153, month: 12, day: 8 });
 * // Temporal.PlainDate 2027-01-15
 * ```
 */
export function tibetanToIso(
	input: TibetanDateFields,
	config: TraditionConfig = PHUGPA,
): Temporal.PlainDate {
	rejectTemporalInstance("tibetanToIso", input);
	rejectInvalidLeapFlags("tibetanToIso", input);
	const scaled = scalingFor(config);
	const isLeapMonth = input.isLeapMonth ?? false;

	// Integrality before range: the whole determinism argument rests on integer arithmetic, and a
	// fractional value passes every bound check below and comes out as a confident wrong date.
	// NaN in particular satisfies neither `< 1` nor `> 30`, so the bounds alone let it through.
	const subject = () => `tibetanToIso(${describeInput(input)})`;
	assertSafeYear(subject(), input.year);
	if (!Number.isInteger(input.month) || input.month < 1 || input.month > 12) {
		throw rangeError(
			"TCT_FIELD_OUT_OF_RANGE",
			`${subject()}: month must be an integer 1-12, received ${input.month}`,
		);
	}
	if (!Number.isInteger(input.day) || input.day < 1 || input.day > 30) {
		throw rangeError(
			"TCT_FIELD_OUT_OF_RANGE",
			`${subject()}: day must be an integer 1-30, received ${input.day}. Note that Tibetan ` +
				"months run to 30 even when fewer calendar days carry those numbers — a skipped date " +
				"is still 1-30, and reports itself as SkippedDayError rather than as out of range",
		);
	}

	const year = yearFromRoyalEra(input.year);
	assertClosedFormYear(subject, year, config);
	if (isLeapMonth && !hasLeapTwin(config, year, input.month)) {
		throw rangeError(
			"TCT_NO_SUCH_LEAP_MONTH",
			`${subject()}: month ${input.month} of ${input.year} has no leap month. Leap months ` +
				"recur roughly every 32 months and fall on a different month number each time; drop " +
				"isLeapMonth, or use isoToTibetan to discover which month of a year is doubled",
		);
	}

	const monthCount = trueMonthCount(config, year, input.month, isLeapMonth);

	// Bound before classifying, not after. Past the exact limit classifyDay's arithmetic has
	// already lost precision, and it reports the damage as a skipped date. The mean date is within
	// 0.6 days of the true date and is exact over a wider range — its denominator divides
	// `commonDenominator` — so it is the right quantity to test the limit with.
	assertExactJulianDay(
		scaled,
		floorDiv(meanDate(scaled, input.day, monthCount), scaled.meanDate.den),
		subject,
	);

	const classification = classifyDay(scaled, input.day, monthCount);

	if (classification.kind === "skipped") throw new SkippedDayError(input);
	if (classification.kind === "doubled" && (input.isLeapDay ?? false)) {
		return isoFromJulianDayUnchecked(classification.leapJulianDay as number);
	}
	return isoFromJulianDayUnchecked(classification.julianDay as number);
}

/**
 * Whether a Tibetan date names a real calendar day.
 *
 * @remarks
 * The predicate counterpart to {@link tibetanToIso}. It answers `false` in the two cases a caller
 * means by "this date is not real": the date is **skipped**, so no calendar day carries its
 * number, and the input is out of range or not an integer. Both are ordinary answers about the
 * input, which is what makes this safe to point at user input.
 *
 * It deliberately does **not** swallow anything else. A predicate that reports "this date does not
 * exist" when the truth is "the engine broke" is worse than a throw, and this one is used as an
 * oracle by the suite's strongest property, where masking a failure would make that property pass
 * more easily rather than fail.
 *
 * So the `catch` is an **allowlist**: three named codes answer `false` and everything else
 * propagates. It was a denylist — every `RangeError` bar one code answered `false` — and that lost
 * the race, because a config whose denominators `deriveScaling` could not work with threw an
 * uncoded `RangeError` from three frames down and this function reported that Losar does not
 * exist. A denylist has to anticipate every failure that will ever be added; an allowlist only has
 * to name the three that are genuinely answers about the input.
 *
 * `TCT_OUTSIDE_EXACT_RANGE` is on the throwing side on purpose. Past that bound the day was never
 * computed, so `false` would be a confident claim about arithmetic that was refused rather than
 * performed — which is the same reason that code exists separately from `TCT_SKIPPED_DAY`.
 *
 * `TCT_INVALID_ARGUMENT` is on the throwing side for the same kind of reason: a `Temporal.PlainDate`
 * or a non-boolean `isLeapMonth` is a confusion in the caller's code, not a date that does not
 * exist, and answering `false` would let that confusion look like a calendrical fact.
 */
export function tibetanDateExists(
	input: TibetanDateFields,
	config: TraditionConfig = PHUGPA,
): boolean {
	// These duplicate the same two guards inside tibetanToIso, and the reason is the *message*, not
	// the behaviour. Both throw TCT_INVALID_ARGUMENT, which is absent from the allowlist below, so
	// deleting these would still propagate rather than answer `false`. What would change is the
	// wording: tibetanToIso names itself, so a caller who wrote tibetanDateExists(plainDate) would
	// be told about a function they never called. The error-codes record asks a message to echo the
	// call that was made, so the guards run here under this function's own name.
	//
	// Before the code split this duplication was load-bearing for correctness too — one code covered
	// both meanings, so a Temporal instance caught inside the try was swallowed into `false`.
	rejectTemporalInstance("tibetanDateExists", input);
	rejectInvalidLeapFlags("tibetanDateExists", input);
	try {
		tibetanToIso(input, config);
		return true;
	} catch (error) {
		// Matched by class first, as before: SkippedDayError carries TCT_SKIPPED_DAY too, but the
		// class is what a caller branches on and what the rest of this package throws.
		if (error instanceof SkippedDayError) return false;
		if (hasCode(error, "TCT_FIELD_OUT_OF_RANGE")) return false;
		if (hasCode(error, "TCT_NO_SUCH_LEAP_MONTH")) return false;
		throw error;
	}
}

/**
 * Converts a Western calendar day to its Tibetan date.
 *
 * @remarks
 * There is no closed-form inverse, so this estimates and searches. The estimate comes from mean
 * motion over the linear lunar day count `l = 30n + d`, and the search window is provably wide
 * enough — ±3 for Phugpa, from `|true_date − mean_date| ≤ (25 + 11)/60 = 0.6` days.
 *
 * That bound is **derived from the tradition, not written down here**: `25` and `11` are
 * `moonTab`'s and `sunTab`'s largest entries, which are injected config rather than constants, so
 * a `3` at the loop below would hardcode Phugpa's tables into a computation over a consumer's
 * data. {@link ScaledTradition.searchHalfWidth} carries the derivation and the proof.
 *
 * Do not widen the window at the call site "to be safe" — if a date is not found inside it, the
 * fault is elsewhere.
 *
 * @throws RangeError with code `TCT_OUTSIDE_EXACT_RANGE` if the date falls outside the range where
 * the arithmetic stays exact. This is reachable inside `Temporal.PlainDate`'s own range:
 * `PHUGPA_HENNING` is exact only to about year 11,356. `TCT_INVALID_ARGUMENT` if `date` is not a
 * value `asPlainDate` accepts — notably a bare `{ year, month, day }` object, which is ambiguous
 * with this package's own Tibetan-date shape.
 *
 * Counting matches inside the window classifies the day directly, which is why no separate pass
 * is needed: one lunar day ending here is the ordinary case; two means the second's number is
 * skipped and this day takes the first's name; none means this day is the first of a doubled
 * pair and takes the name of the day after.
 *
 * @example
 * ```ts
 * const date = isoToTibetan(Temporal.PlainDate.from("2027-01-15"));
 * date.year;         // 2153 — royal era, not 2027
 * date.yearStartsIn; // 2026 — Janson's Y
 * date.month;        // 12
 * date.day;          // 8
 * ```
 */
export function isoToTibetan(
	date: Temporal.PlainDate,
	config: TraditionConfig = PHUGPA,
): TibetanDate {
	const scaled = scalingFor(config);
	// Normalised once here rather than relying on julianDayFromIso alone, so the error message below
	// quotes the date the caller meant rather than whatever they passed.
	const plain = asPlainDate(date);
	const target = julianDayFromIso(plain);
	assertExactJulianDay(scaled, target, () => plain.toString());

	// Invert the mean date over the linear lunar day count l = 30n + d.
	const { den, perDay, atEpoch } = scaled.meanDate;
	// exact: this is a *search seed*, not a result. The loop below walks ±searchHalfWidth around it
	// and every candidate is then tested with integer-only arithmetic, so a seed off by one changes
	// which candidate is found first and nothing else. `assertExactJulianDay` above has already
	// bounded `target · den` inside the safe range.
	const estimate = Math.round((target * den - atEpoch) / perDay);

	// Collect every lunar day in the window that ends on the target calendar day, plus the
	// first that ends after it — needed for the doubled case, where none ends on it.
	let named: { day: number; monthCount: number } | undefined;
	let following: { day: number; monthCount: number } | undefined;

	for (let l = estimate - scaled.searchHalfWidth; l <= estimate + scaled.searchHalfWidth; l++) {
		const monthCount = floorDiv(l - 1, 30);
		const day = l - 30 * monthCount;
		const julianDay = julianDayOfLunarDay(scaled, day, monthCount);
		if (julianDay === target && named === undefined) named = { day, monthCount };
		if (julianDay > target && following === undefined) following = { day, monthCount };
	}

	// No lunar day ends on this calendar day, so it is the first of a doubled pair and takes
	// the name of the following day.
	const resolved = named ?? following;
	/* c8 ignore next */
	if (resolved === undefined) {
		// A plain Error, not a RangeError, and the distinction is load-bearing: `tibetanDateExists`
		// reports `false` for a RangeError, so as one of those this would have been swallowed into
		// "that date does not exist" — the opposite of the truth, and in the oracle for the suite's
		// strongest property. See the remarks on that function.
		throw codedError(
			"TCT_INTERNAL",
			`no Tibetan date found for ${date.toString()} within the proved search window; ` +
				"this indicates a bug in the mean-motion estimate, not an unsupported date. " +
				"Please report it at https://github.com/nyamlen/tibetan-calendar-temporal/issues",
		);
	}

	const month = monthFromCount(config, resolved.monthCount);
	const classification = classifyDay(scaled, resolved.day, resolved.monthCount);
	const isDoubledDay = classification.kind === "doubled";

	return buildDate(
		scaled,
		resolved.monthCount,
		month.year,
		month.month,
		month.isLeap,
		resolved.day,
		isDoubledDay,
		isDoubledDay && classification.leapJulianDay === target,
		target,
	);
}

/**
 * Losar, the Tibetan New Year, for a given royal-era year.
 *
 * @remarks
 * Losar cannot be obtained as `tibetanToIso({ month: 1, day: 1 })`. Where day 1 is skipped the
 * year begins on the day numbered **2** — 1977 is the case in range — and that call throws
 * {@link SkippedDayError} instead of returning the new year. Where the year opens with a leap
 * month 1, which happens twice per 65-year cycle and last did in 2000, the year begins in the
 * leap month rather than the regular one.
 *
 * Janson computes it as one day after the last day of the preceding year, which sidesteps both
 * cases rather than special-casing them, and confirms in the Losar remark that the new year is the
 * first day of the year even when that day falls in a leap month — unlike other observances, which
 * are usually not kept in leap months.
 *
 * `year` is the royal-era numbering, matching {@link TibetanDate.year}: 2153, not 2026.
 *
 * **So `monthCode` is not always `"M01"`.** In a year opening with a leap month it is `"M01L"` —
 * `losarFor(2146)` is one. Anything reading more than the date off this must expect that; for the
 * year's *name* alone, {@link yearNameFor} and {@link rabjungFor} answer without evaluating the
 * calendar at all.
 *
 * @example
 * ```ts
 * losarFor(2153).isoDate;     // 2026-02-18
 * losarFor(2104).day;         // 2 — day 1 is skipped in 1977
 * losarFor(2146).monthCode;   // "M01L" — the year opens in a leap month
 * ```
 *
 * @throws RangeError with code `TCT_FIELD_OUT_OF_RANGE` if `year` is not a safe integer, or
 * `TCT_OUTSIDE_EXACT_RANGE` if it falls outside the range where the arithmetic stays exact.
 */
export function losarFor(year: number, config: TraditionConfig = PHUGPA): TibetanDate {
	const scaled = scalingFor(config);
	assertSafeYear(`losarFor(${year})`, year);
	const julianDay = losarJulianDay(scaled, config, yearFromRoyalEra(year));
	assertExactJulianDay(scaled, julianDay, () => `losarFor(${year})`);
	return isoToTibetan(isoFromJulianDayUnchecked(julianDay), config);
}
