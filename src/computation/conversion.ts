/**
 * Conversions between `Temporal.PlainDate` and Tibetan dates — Janson §8, "Calendrical functions",
 * and §9, "Day of week".
 *
 * @remarks
 * The forward direction is direct: a Tibetan date names a lunar day, and `⌊true_date⌋` gives the
 * calendar day it ends in. The inverse has no closed form, so it estimates the lunar day count
 * from mean motion and searches a small window — a window whose width is **proved**, not guessed.
 * See {@link isoToTibetan}.
 *
 * @packageDocumentation
 */

import {
	assertSafeIntegerArgument,
	assertSafeYear,
	codedError,
	describe,
	hasCode,
	isPlainObject,
	rangeError,
	thrownDetail,
} from "../errors.js";
import { monthCodeOf } from "../format.js";
import { weekdayNameWithOffset, weekdayOffsetOf } from "../names.js";
import {
	assertIsoCalendar,
	assertTemporalPresent,
	temporalKindOf,
	temporalTypeNameOf,
	toNativePlainDate,
} from "../temporal-kind.js";
import { PHUGPA } from "../traditions/phugpa.js";
import type { TraditionConfig } from "../traditions/types.js";
import type {
	TibetanDate,
	TibetanDateFields,
	TibetanDateSnapshot,
	TibetanMonthSnapshot,
	TibetanWeekday,
} from "../types.js";
import { assertTibetanRanges, assertTibetanShape, SkippedDayError } from "../types.js";
import { floorDiv, mod } from "./arithmetic.js";
import {
	assertMonthCountYear,
	classifyDay,
	losarJulianDay,
	monthFromCount,
	sharesNumberWithLeapMonth,
	trueMonthCount,
} from "./calendar.js";
import { julianDayOfLunarDay } from "./corrections.js";
import { royalEraFromYear, yearFromRoyalEra } from "./epoch.js";
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

/** `1970-01-01`, the anchor for converting between Temporal and Julian day numbers. */
const UNIX_EPOCH = Temporal.PlainDate.from("1970-01-01");

/**
 * Julian day number of `1970-01-01`.
 *
 * @remarks
 * Checks out against Janson's worked value in §3, "Some concepts": 1 January 2007 is JD 2454102,
 * and `2007-01-01` is 13,514 days after the Unix epoch.
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
 *
 * At runtime an ISO string, a `PlainDateTime` or a `ZonedDateTime` is also accepted and narrowed
 * to its date. The result is not bounded by any tradition's exact range.
 *
 * @throws RangeError with code `TCT_INVALID_ARGUMENT` if `date` names no calendar day in the ISO
 * calendar: `null`, a number, a bare `{ year, month, day }` object, a string Temporal cannot read,
 * or a date in another calendar.
 */
export function julianDayFromIso(date: Temporal.PlainDate): number {
	return julianDayFromIsoUnchecked(asPlainDate(date, "julianDayFromIso(date)"));
}

// The engine's own dates are already plain ISO `Temporal.PlainDate`s, built by it or normalised by
// `asPlainDate` at the boundary, so re-normalising them copied every computed day again.
/**
 * Converts a `Temporal.PlainDate` the engine already holds to its Julian day number, without
 * normalising it.
 *
 * @remarks
 * For callers inside this package whose date came from `asPlainDate`, `asWesternDay` or the engine
 * itself; not exported from the package barrel. A caller's date goes through {@link julianDayFromIso}.
 */
export function julianDayFromIsoUnchecked(plain: Temporal.PlainDate): number {
	return JULIAN_DAY_AT_UNIX_EPOCH + plain.since(UNIX_EPOCH, { largestUnit: "day" }).days;
}

// The code is the wrong-kind-of-argument one rather than the range one because none of the refused
// values has a field to be out of a range — they are not Western dates at all. This is the one
// guard every entry point shares, so each states its own name through `subject` rather than
// keeping a copy that names it.
/**
 * Normalises whatever a caller passed into a `Temporal.PlainDate`.
 *
 * @remarks
 * Accepts an ISO string, a `Temporal.PlainDate`, a `PlainDateTime` or a `ZonedDateTime` — all
 * genuine ways to name a calendar day, narrowing a datetime to its date (a `ZonedDateTime` to its
 * own local date) rather than losing anything a caller meant.
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
 * @param subject - The export and argument the caller passed, such as `getObservances(from)`. It
 * opens the message of every refusal.
 * @throws RangeError with code `TCT_INVALID_ARGUMENT` for `null`, a number, a bare fields object, a
 * resolved `TibetanDate`, a `Temporal` type that names no calendar day (`Instant`, `PlainTime` and
 * the rest), a string Temporal cannot read, and a date in a calendar other than ISO.
 */
export function asPlainDate(date: Temporal.PlainDate, subject: string): Temporal.PlainDate {
	// Declared as `unknown` from here: the parameter's own type says `Temporal.PlainDate`, which is
	// the guarantee a TypeScript caller gets, but this function's job past this line is to accept
	// runtime input that does not honour it and either normalise or reject it.
	const raw: unknown = date;
	const prefix = `${subject}: `;
	// Kind, not identity: a `PlainDate` from a second Temporal implementation is a Western date and
	// is normalised into this realm, rather than refused for having been built elsewhere. See
	// `temporal-kind.ts`, which is the only file in `src/` that asks `instanceof Temporal`.
	const kind = temporalKindOf(raw, subject);
	if (kind !== null) return toNativePlainDate(raw, kind, subject);
	if (typeof raw !== "string") {
		// A Temporal type outside the three — `Instant`, `PlainYearMonth`, `PlainMonthDay`,
		// `PlainTime`, `Duration` — carries its own tag and so is named rather than described as
		// "an object". None of them names a calendar day, so none is normalisable.
		const temporalType = temporalTypeNameOf(raw, subject);
		throw rangeError(
			"TCT_INVALID_ARGUMENT",
			`${prefix}expected a Temporal.PlainDate, an ISO string, a PlainDateTime or a ZonedDateTime, ` +
				`received ${temporalType === null ? describe(raw) : `a Temporal.${temporalType}`}` +
				(temporalType !== null
					? ", which names no calendar day"
					: carriesPlainDate(raw)
						? ". It is a resolved TibetanDate, which names a Tibetan day: its Western day is " +
							"its isoDate field — pass that, or any Temporal instance or ISO string"
						: isPlainObject(raw)
							? ". A bare { year, month, day } object is ambiguous with this package's own " +
								"Tibetan-date shape, so it is rejected rather than guessed at — pass a Temporal " +
								"instance or an ISO string instead"
							: ""),
		);
	}
	assertTemporalPresent();
	try {
		return assertIsoCalendar(Temporal.PlainDate.from(raw), subject);
	} catch (error) {
		if (error instanceof Error && "code" in error) throw error;
		throw rangeError(
			"TCT_INVALID_ARGUMENT",
			`${prefix}expected a Temporal.PlainDate, received ${describe(raw)}` +
				`${error instanceof Error ? `: ${error.message}` : ""}`,
		);
	}
}

/**
 * Whether a value is an object carrying a Temporal `PlainDate` as `isoDate`, as a resolved
 * `TibetanDate` does — read only to word a refusal, so a throwing trap answers `false`.
 */
function carriesPlainDate(raw: unknown): boolean {
	if (raw === null || typeof raw !== "object") return false;
	try {
		return (
			"isoDate" in raw && temporalKindOf((raw as { isoDate: unknown }).isoDate) === "PlainDate"
		);
	} catch {
		return false;
	}
}

/**
 * Normalises either shape of a `Temporal.PlainDate | TibetanDate` parameter to the ISO day it names.
 *
 * @remarks
 * **Both accepted shapes name their own calendar, and that is the entire rule.** A `Temporal`
 * instance says Western by construction; a resolved {@link TibetanDate} says Tibetan, because the
 * engine is what produced it. A bare `{ year, month, day }` says *neither* — it is a genuine value
 * of both {@link TibetanDateFields} and Temporal's own fields shape — so it is refused here on
 * exactly the ground {@link asPlainDate} refuses it at every other entry point. An ISO string,
 * `PlainDateTime` and `ZonedDateTime` are accepted as {@link asPlainDate} accepts them.
 *
 * The Tibetan branch reads `isoDate` rather than re-running {@link tibetanToIso}: a resolved date
 * already carries the answer, so this is a field read and not a conversion, and no
 * `TraditionConfig` is a parameter.
 *
 * @param functionName - The export the caller called, which opens the message.
 * @throws RangeError with code `TCT_INVALID_ARGUMENT` for anything else, including a value whose
 * `isoDate` read throws. Every message opens with `functionName`. It names every shape accepted,
 * except for a string Temporal cannot read and a date in a non-ISO calendar: those messages are
 * {@link asPlainDate}'s, which name only the Western shapes.
 */
export function asWesternDay(
	functionName: string,
	date: Temporal.PlainDate | TibetanDate,
): Temporal.PlainDate {
	const raw: unknown = date;
	if (typeof raw === "string" || temporalKindOf(raw, functionName) !== null) {
		return asPlainDate(date as Temporal.PlainDate, functionName);
	}
	if (raw !== null && typeof raw === "object") {
		// Read under `try`, as `temporalKindOf` reads a tag: the `in` runs a Proxy's `has` trap and
		// the read its `get`, and a throw from either would escape uncoded.
		let isoDate: unknown;
		try {
			isoDate = "isoDate" in raw ? (raw as { isoDate: unknown }).isoDate : undefined;
		} catch (error) {
			throw rangeError(
				"TCT_INVALID_ARGUMENT",
				`${functionName}: received a value that cannot be read — reading its isoDate threw ` +
					`${thrownDetail(error)}. Pass the date itself.`,
				error,
			);
		}
		// Still normalised, because a resolved date may have been built under a different Temporal
		// implementation from the one now global.
		if (temporalKindOf(isoDate, functionName) === "PlainDate") {
			return asPlainDate(isoDate as Temporal.PlainDate, functionName);
		}
	}
	throw rangeError(
		"TCT_INVALID_ARGUMENT",
		`${functionName}: expected a Temporal.PlainDate, an ISO string, a PlainDateTime, a ` +
			`ZonedDateTime, or a resolved TibetanDate, received ${describe(raw)}` +
			(isPlainObject(raw)
				? ". A bare { year, month, day } object names no calendar — it is a genuine value of " +
					"both this package's Tibetan date shape and Temporal's own — so it is refused rather " +
					"than guessed at. Pass resolveDate({ ... }) for a Tibetan date, or " +
					"Temporal.PlainDate.from({ ... }) for a Western one"
				: ""),
	);
}

/**
 * Converts a Julian day number back to a `Temporal.PlainDate`.
 *
 * @remarks
 * A Julian day number counts whole days, so a fraction names nothing. The range bound is a property
 * of the tradition rather than of the package, so this takes a config and defaults it like every
 * other entry point: the arithmetic stays exact from about ISO year −245,737 to 236,312 under
 * `PHUGPA` and `BHUTAN`, and only from about −20,781 to 11,356 under `PHUGPA_HENNING` and
 * `BHUTAN_HENNING`, whose common denominator is fifteen times larger. For any tradition the range
 * ends inside Temporal's own, so a day this accepts always converts.
 *
 * @throws RangeError with code `TCT_FIELD_OUT_OF_RANGE` if `julianDay` is not a safe integer,
 * `TCT_OUTSIDE_EXACT_RANGE` if it lies past where the tradition's arithmetic stays exact, or
 * `TCT_INVALID_TRADITION_CONFIG` if `tradition` is malformed.
 */
export function isoFromJulianDay(
	julianDay: number,
	tradition: TraditionConfig = PHUGPA,
): Temporal.PlainDate {
	// Before the number: a bare number has no shape, so the tradition comes first.
	const scaled = scalingFor(tradition);
	assertSafeIntegerArgument(
		"isoFromJulianDay",
		"julianDay",
		julianDay,
		". A Julian day number counts whole days, so a fraction names nothing — there is no time of day in it",
	);
	assertExactJulianDay(scaled, julianDay, () => `isoFromJulianDay(${julianDay})`);
	return isoFromJulianDayUnchecked(julianDay);
}

// Every internal use already holds a Julian day this package computed and range-checked, so
// revalidating each one would put a `scalingFor` lookup and a safe-integer test on the hot path of
// the multi-century sweeps for no gain. `describeBound` in particular has to stay unguarded: it
// formats the exactness bound itself, so checking it against that bound would recurse.
/**
 * Converts a Julian day number to a `Temporal.PlainDate` without validating it.
 *
 * @remarks
 * For callers inside this package that already hold a range-checked Julian day; not exported from
 * the package barrel. A fraction, or a day past Temporal's own range, raises Temporal's `RangeError`,
 * which carries no code.
 */
export function isoFromJulianDayUnchecked(julianDay: number): Temporal.PlainDate {
	return UNIX_EPOCH.add({ days: julianDay - JULIAN_DAY_AT_UNIX_EPOCH });
}

// Past the bound the arithmetic degrades silently rather than refusing, and a degraded `true_date`
// misclassifies the day, so 2⁵³ overflow would be reported as a **skipped date**: a specific,
// confident calendrical claim about a date that was never computed. The correct response to
// `SkippedDayError` is "fine, that date does not exist"; the correct response here is "your input
// is out of range". They must not be the same error.
//
// `subject` is a thunk because this sits on the hot path — `isoToTibetan` is called once per day in
// the multi-century sweeps — and building the message eagerly would format a date on every
// successful conversion.
/**
 * Rejects a Julian day past the point where this tradition's arithmetic stays exact.
 *
 * @remarks
 * `true_date` is an integer numerator over `commonDenominator`, so it is roughly `JD · D` and
 * stops being representable at {@link ScaledTradition.exactToJulianDay}. The bound is symmetric in
 * the Julian day, and its ISO-year equivalents for the four shipped configs are those listed on
 * `isoFromJulianDay`.
 *
 * The message names the tradition, because the bound is a property of the tradition rather than of
 * the package: a caller who hits it on one config and not another needs to be told which one
 * refused. It also names the end of the range on the side the refused value lies on.
 *
 * @param subject - Builds the subject the message opens with; called only when it throws.
 * @throws RangeError with code `TCT_OUTSIDE_EXACT_RANGE` if `|julianDay|` exceeds the bound, or is
 * `NaN`.
 */
export function assertExactJulianDay(
	scaled: ScaledTradition,
	julianDay: number,
	subject: () => string,
): void {
	// Negated comparison so that a `NaN` Julian day fails rather than passes.
	if (!(Math.abs(julianDay) <= scaled.exactToJulianDay)) {
		const below = julianDay < 0;
		const bound = below ? -scaled.exactToJulianDay : scaled.exactToJulianDay;
		// `deriveScaling` clamps the safe-integer bound to Temporal's range; when it did, exactness is
		// not what refused the day.
		// exact: the same floored quotient `deriveScaling` takes, compared with its result, not used.
		const clamped =
			scaled.exactToJulianDay < Math.floor(Number.MAX_SAFE_INTEGER / scaled.commonDenominator);
		throw rangeError(
			"TCT_OUTSIDE_EXACT_RANGE",
			`${subject()} is outside the range where the ${scaled.tradition.name} tradition's arithmetic ` +
				`stays exact${clamped ? " and Temporal can name the day" : ""}: ` +
				`JD must be ${below ? "at least" : "at most"} ${bound}` +
				`${describeBound(bound)}, received ${julianDay}`,
		);
	}
}

/**
 * The exactness bound as an ISO year, parenthesised.
 *
 * @remarks
 * A raw Julian day in the tens of millions is not a number anyone can act on. The ISO year is, and
 * it is what makes the `PHUGPA_HENNING` limit legible as "about year 11,356" rather than as
 * `5868816`. The bound never passes `Temporal.PlainDate`'s own range — `deriveScaling` clamps it —
 * so the conversion cannot throw.
 */
function describeBound(signedBound: number): string {
	return ` (about ISO year ${isoFromJulianDayUnchecked(signedBound).year})`;
}

/**
 * Returns `(JD + 2) mod 7` without validating `julianDay`.
 *
 * @remarks
 * For Julian days this package computed and has already bounded. The exported
 * {@link tibetanWeekday} is the guarded entry point; an internal caller that has done the checking
 * gets its own name rather than the boundary quietly losing a guard.
 */
function tibetanWeekdayUnchecked(julianDay: number): TibetanWeekday {
	// The one place the brand is applied without asTibetanWeekday, and it is sound by construction:
	// `mod` is the flooring modulus, so the result is in 0…6 for every integer input. Routing this
	// through the validator would re-check a bound the arithmetic already guarantees, on the hottest
	// path in the package — every date built calls it.
	return mod(julianDay + 2, 7) as TibetanWeekday;
}

/**
 * Returns the Tibetan day of week, 0 = Saturday through 6 = Friday — Janson §9, "Day of week".
 *
 * @remarks
 * `(JD + 2) mod 7`. Each weekday corresponds to one of the seven "planets" and takes its name from
 * that planet, as in Latin and several modern European languages; the correspondence reached Tibet
 * from India and goes back to Roman astrology. The cycle is identical to the Western one, so this
 * is a renumbering rather than a different week.
 *
 * The number is the same under every tradition. Bhutan shifts the weekday's *name* by one planet
 * (`TibetanDate.weekdayName`), not the number, and no date moves.
 *
 * {@link TibetanDate.dayOfWeek} exposes the **ISO** numbering instead, matching
 * `Temporal.PlainDate.dayOfWeek`. {@link TibetanDate.tibetanWeekday} carries *this* numbering as a
 * field, which is what to reach for when a `TibetanDate` is already in hand — this function is for
 * callers working from a Julian day directly.
 *
 * @throws RangeError with code `TCT_FIELD_OUT_OF_RANGE` if `julianDay` is not a safe integer.
 */
export function tibetanWeekday(julianDay: number): TibetanWeekday {
	// The guard this function most needed, and the one it did not have. It returns a plain `number`
	// with no other signal, and every plausible consumer feeds that straight into a lookup table of
	// weekday names — so `tibetanWeekday(1.5)` returning `3.5` is an out-of-bounds index at best and
	// a blank cell in a rendered calendar at worst. `NaN` in gave `NaN` out; a string gave `NaN` too.
	assertSafeIntegerArgument("tibetanWeekday", "julianDay", julianDay);
	return tibetanWeekdayUnchecked(julianDay);
}

/**
 * The lunar day whose end is the full moon, and the one whose end is the new moon — Janson §6,
 * "Days".
 */
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
	return Object.freeze({
		year: royalEraFromYear(year),
		yearStartsIn: year,
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
		// consecutive lunar days totalling under 24 hours, where no lunar day is shorter than about
		// 21.5 hours (Janson §6; 21.53 and 21.55 are the shortest the four shipped configs produce).
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
		weekdayName: weekdayNameWithOffset(
			tibetanWeekdayUnchecked(julianDay),
			weekdayOffsetOf(scaled.tradition),
		),
		// The month count this date was located by, carried out rather than made rediscoverable.
		lunation: monthCount,
	});
}

/**
 * Converts a Tibetan date to the Western calendar day carrying it.
 *
 * @remarks
 * Returns a day for every date that names one. A **skipped** date names no day at all, and
 * throws — use {@link tibetanDateExists} to test first.
 *
 * `year` is the royal-era numbering, not Janson's *Y*. Passing 2026 where 2153 is meant returns
 * a date 127 years earlier, without an error.
 *
 * A result before 1447 CE is a back-projection of a tradition that did not yet exist; before 1582
 * CE the `Temporal.PlainDate` is proleptic Gregorian where historical sources are Julian. Neither
 * is an error, but neither is what a contemporary would have written.
 *
 * @throws SkippedDayError if the date is skipped.
 * @throws RangeError with code `TCT_FIELD_OUT_OF_RANGE` if `year`, `month` or `day` is a number
 * that is not an integer or is out of range; `TCT_INVALID_ARGUMENT` if `input` is not an object
 * naming a Tibetan date — a `Temporal` instance, `null` — if a required field is absent or not a
 * number, or if `isLeapMonth`/`isLeapDay` are present but not `boolean`; `TCT_NO_SUCH_LEAP_MONTH`
 * if a leap month is requested for a month that has none; `TCT_OUTSIDE_EXACT_RANGE` if the date
 * falls outside the range where the arithmetic stays exact — a bound derived from the tradition's
 * constants; or `TCT_INVALID_TRADITION_CONFIG` if `tradition` is malformed.
 *
 * @example
 * ```ts
 * tibetanToIso({ year: 2153, month: 12, day: 8 });
 * // Temporal.PlainDate 2027-01-15
 * ```
 */
export function tibetanToIso(
	input: TibetanDateFields,
	tradition: TraditionConfig = PHUGPA,
): Temporal.PlainDate {
	const fields = assertTibetanShape("tibetanToIso", input, "date", "swap");
	// The tradition between the shape and the range, the order tibetanDateExists depends on.
	tradition = scalingFor(tradition).tradition;
	const subject = assertTibetanRanges("tibetanToIso", fields, "date");
	return isoFromJulianDayUnchecked(julianDayOfFields(subject, tradition, fields));
}

/**
 * Returns the true month count of an already range-checked month, refusing a leap month with no
 * twin.
 *
 * @remarks
 * The leap-twin preamble every month- and date-tier entry point runs: `yearFromRoyalEra`, the
 * closed-form year bound, the `TCT_NO_SUCH_LEAP_MONTH` refusal, then `trueMonthCount`.
 *
 * **It does not bound the exact range of `true_date`**, because `lunationFromMonth` and `addMonths`
 * are closed forms and bounding them here would narrow them; the year bound it applies is
 * {@link assertMonthCountYear}'s. Callers that go on to evaluate `true_date` bound what they
 * evaluate.
 *
 * @param subject - The echo `assertTibetanRanges` returned, so a refusal names the function the
 * caller called.
 * @throws RangeError with code `TCT_OUTSIDE_EXACT_RANGE` if the year is past the month-count bound,
 * or `TCT_NO_SUCH_LEAP_MONTH` if `isLeapMonth` names a month with no leap twin that year.
 */
export function monthCountFor(
	subject: () => string,
	tradition: TraditionConfig,
	month: TibetanMonthSnapshot,
): number {
	const year = yearFromRoyalEra(month.year);
	assertMonthCountYear(subject, year, tradition);
	const isLeapMonth = month.isLeapMonth ?? false;
	// Without this, asking for a leap month that does not exist returns the *previous* month's count
	// rather than refusing — a wrong answer indistinguishable from a right one.
	if (isLeapMonth && !sharesNumberWithLeapMonth(tradition, year, month.month)) {
		throw rangeError(
			"TCT_NO_SUCH_LEAP_MONTH",
			`${subject()}: month ${month.month} of ${month.year} has no leap month. Leap months ` +
				"recur roughly every 32 months and fall on a different month number each time; drop " +
				"isLeapMonth, or call leapMonthNumberFor to find which month of a year is doubled",
		);
	}
	return trueMonthCount(tradition, year, month.month, isLeapMonth);
}

/**
 * Returns the Julian day an already range-checked Tibetan date names, reporting under the caller's
 * subject.
 *
 * @remarks
 * `tibetanToIso`'s body after its guards, shared so that `resolveDate`, `addDays`, `daysBetween` and
 * `tibetanDateExists` report their own name rather than `tibetanToIso`'s. Not exported from the
 * package barrel.
 *
 * @throws SkippedDayError if the date is skipped, carrying the snapshot of the fields the caller
 * passed as `requested`, which equals the input in value.
 * @throws RangeError with code `TCT_OUTSIDE_EXACT_RANGE` if the date, or the day it resolves to,
 * is past where the tradition's arithmetic stays exact, or `TCT_NO_SUCH_LEAP_MONTH` if
 * `isLeapMonth` names a month with no leap twin that year.
 */
export function julianDayOfFields(
	subject: () => string,
	tradition: TraditionConfig,
	date: TibetanDateSnapshot,
): number {
	const scaled = scalingFor(tradition);
	const monthCount = monthCountFor(subject, tradition, date);

	// Bound before classifying, not after. Past the exact limit classifyDay's arithmetic has
	// already lost precision, and it reports the damage as a skipped date. The mean date is within
	// 0.6 days of the true date — (25 + 11)/60, the largest `moonTab` and `sunTab` entries, which
	// all four shipped configs share — and is exact over a wider range: its denominator divides
	// `commonDenominator`. So it is the right quantity to test the limit with. A config with larger
	// tables has a larger bound, which `ScaledTradition.searchHalfWidth` derives.
	// The bound is this day's, not the month's, so it can accept day 30 of a month whose day 1 it
	// refuses — where `resolveMonth` and `datesFor` refuse the whole month. That is deliberate.
	assertExactJulianDay(
		scaled,
		floorDiv(meanDate(scaled, date.day, monthCount), scaled.meanDate.den),
		subject,
	);

	const classification = classifyDay(scaled, date.day, monthCount);

	// `date` is the snapshot of the caller's fields, which `docs/guide.md` promises `error.requested`
	// equals in value.
	if (classification.kind === "skipped") throw new SkippedDayError(date);
	const julianDay =
		classification.kind === "doubled" && (date.isLeapDay ?? false)
			? classification.leapJulianDay
			: classification.julianDay;
	// The mean date above is within 0.6 days of the true date (for all four shipped configs, whose
	// tables are shared), so the day returned can lie just past the bound the mean date passed,
	// where `isoToTibetan` refuses it.
	assertExactJulianDay(scaled, julianDay, subject);
	return julianDay;
}

// The suite's strongest property uses this as an oracle, where masking a failure would make that
// property pass more easily rather than fail.
//
// The `catch` is an **allowlist**, and it matches **one class and two codes**, never three codes:
// `SkippedDayError` by class, plus `TCT_FIELD_OUT_OF_RANGE` and `TCT_NO_SUCH_LEAP_MONTH`. Everything
// else propagates. `TCT_SKIPPED_DAY` is deliberately **not** matched as a code, so an error carrying
// that code without the class is rethrown rather than swallowed — the class is what a caller
// branches on and what the rest of this package throws. A denylist has to anticipate every failure
// that will ever be added; an allowlist only has to name the three things that are genuinely answers
// about the input. See docs/decisions/2026-08-12-error-codes-not-classes.md.
/**
 * Returns whether a Tibetan date names a real calendar day.
 *
 * @remarks
 * The predicate counterpart to {@link tibetanToIso}. It answers `false` in the three cases a caller
 * means by "this date is not real": the date is **skipped**, so no calendar day carries its number;
 * a present field is out of range or not an integer; and `isLeapMonth` names a month with no leap
 * twin that year. All three are ordinary answers about the input, which is what makes this safe to
 * point at user input.
 *
 * It deliberately does **not** swallow anything else. A predicate that reports "this date does not
 * exist" when the truth is "the engine broke" is worse than a throw.
 * `TCT_OUTSIDE_EXACT_RANGE` throws because past that bound the day was never computed, so `false`
 * would be a confident claim about arithmetic that was refused rather than performed.
 * `TCT_INVALID_ARGUMENT` throws because a `Temporal.PlainDate` or a non-boolean `isLeapMonth` is a
 * confusion in the caller's code, not a date that does not exist.
 *
 * **A missing or wrong-typed field throws.** A required field that is absent, `null`, or not a
 * number raises `TCT_INVALID_ARGUMENT` rather than answering `false`:
 *
 * ```ts
 * tibetanDateExists({ year: 2153, month: 1 });                     // throws — day forgotten
 * tibetanDateExists({ year: 2151, month: 6, isLeapMonth: true });  // throws — that is a MONTH
 * ```
 *
 * A **present** number that is out of range, fractional or `NaN` still answers `false`; the line is
 * presence, not validity. A caller passing unvalidated input checks its shape first.
 *
 * @throws RangeError with code `TCT_INVALID_ARGUMENT` for a required field that is absent or not a
 * number, a `Temporal` instance or other non-date, or a non-boolean leap flag;
 * `TCT_OUTSIDE_EXACT_RANGE` if the date falls outside the range where the arithmetic stays exact;
 * or `TCT_INVALID_TRADITION_CONFIG` if `tradition` is malformed.
 */
export function tibetanDateExists(
	input: TibetanDateFields,
	tradition: TraditionConfig = PHUGPA,
): boolean {
	// The same order as tibetanToIso, under this function's own name. The shape and the tradition
	// are checked outside the `try`, so a Temporal instance or a broken config throws rather than
	// answering `false`; the range is checked inside it, and only after the tradition — checked
	// first, a range error would be swallowed and a broken config reported as a missing date.
	const fields = assertTibetanShape("tibetanDateExists", input, "date", "swap");
	tradition = scalingFor(tradition).tradition;
	try {
		julianDayOfFields(assertTibetanRanges("tibetanDateExists", fields, "date"), tradition, fields);
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
 * enough — ±3 lunar days for all four shipped configs, from
 * `|true_date − mean_date| ≤ (25 + 11)/60 = 0.6` days.
 *
 * Counting matches inside the window classifies the day directly, which is why no separate pass
 * is needed: one lunar day ending here is the ordinary case; two means the second's number is
 * skipped and this day takes the first's name; none means this day is the first of a doubled
 * pair and takes the name of the day after.
 *
 * @throws RangeError with code `TCT_OUTSIDE_EXACT_RANGE` if the date falls outside the range where
 * the arithmetic stays exact. This is reachable inside `Temporal.PlainDate`'s own range: the range
 * is about ISO years −245,737 to 236,312 under `PHUGPA` and `BHUTAN`, and only about −20,781 to
 * 11,356 under `PHUGPA_HENNING` and `BHUTAN_HENNING`. `TCT_INVALID_ARGUMENT` if `date` is not a
 * `Temporal.PlainDate`, ISO string, `PlainDateTime` or `ZonedDateTime` — notably a bare
 * `{ year, month, day }` object, which is ambiguous with this package's own Tibetan-date shape.
 * `TCT_INVALID_TRADITION_CONFIG` if `tradition` is malformed.
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
	tradition: TraditionConfig = PHUGPA,
): TibetanDate {
	// The shape, then the tradition, then the range: the one order every other Western-date export
	// reports a doubly-bad call in.
	// Normalised once here, so the error message below quotes the date the caller meant rather than
	// whatever they passed.
	const plain = asPlainDate(date, "isoToTibetan(date)");
	const scaled = scalingFor(tradition);
	const target = julianDayFromIsoUnchecked(plain);
	assertExactJulianDay(scaled, target, () => plain.toString());
	return tibetanAtJulianDay(scaled, target);
}

/**
 * The Tibetan date of a Julian day the engine computed, refused past the tradition's exact range.
 *
 * @remarks
 * For callers inside this package that hold a Julian day rather than a caller's date; not exported
 * from the package barrel. It skips the boundary's normalisation, which has nothing to normalise
 * here, and keeps the range check, which several callers rely on to refuse a result Julian-day
 * arithmetic walked out of the range. Its refusal names the day as {@link isoToTibetan}'s does.
 *
 * @throws RangeError with code `TCT_OUTSIDE_EXACT_RANGE` past the exact range, or
 * `TCT_INVALID_TRADITION_CONFIG` if `tradition` is malformed.
 */
export function tibetanFromJulianDay(julianDay: number, tradition: TraditionConfig): TibetanDate {
	const scaled = scalingFor(tradition);
	assertExactJulianDay(scaled, julianDay, () => isoFromJulianDayUnchecked(julianDay).toString());
	return tibetanAtJulianDay(scaled, julianDay);
}

// The search itself, shared by the two entry points above. Precondition: each caller has bounded
// `target` with `assertExactJulianDay`, which is what keeps `target · den` a safe integer below.
function tibetanAtJulianDay(scaled: ScaledTradition, target: number): TibetanDate {
	const tradition = scaled.tradition;

	// Invert the mean date over the linear lunar day count l = 30n + d.
	const { den, perDay, atEpoch } = scaled.meanDate;
	// exact: this is a *search seed*, not a result. The loop below walks ±searchHalfWidth around it
	// and every candidate is then tested with integer-only arithmetic, so a seed off by one changes
	// which candidate is found first and nothing else. Each caller has bounded `target` with
	// `assertExactJulianDay`, so `target · den` is safe.
	const estimate = Math.round((target * den - atEpoch) / perDay);

	// The window is `searchHalfWidth`, derived from the tradition's own tables rather than written
	// down here: `25` and `11` are `moonTab`'s and `sunTab`'s largest entries, which are injected
	// config rather than constants, so a literal `3` here would hardcode Phugpa's tables into a
	// computation over a consumer's data. The derivation and the proof are on
	// `ScaledTradition.searchHalfWidth`. Do not widen it at this site "to be safe" — if a date is
	// not found inside it, the fault is elsewhere.
	//
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
		// A plain Error, not a RangeError, and `codedError` is what makes that true. What keeps this
		// out of `tibetanDateExists`'s `false` is TCT_INTERNAL's absence from that function's
		// allowlist — one class and two codes — and not its type: the predicate has not swallowed
		// every RangeError since the allowlist landed. Reporting this as "that date does not exist"
		// would be the opposite of the truth, in the oracle for the suite's strongest property. See
		// the remarks on that function.
		throw codedError(
			"TCT_INTERNAL",
			`no Tibetan date found for ${isoFromJulianDayUnchecked(target).toString()} within the ` +
				"proved search window; " +
				"this indicates a bug in the mean-motion estimate, not an unsupported date. " +
				"Please report it at https://github.com/nyamlen/tibetan-calendar-temporal/issues",
		);
	}

	const month = monthFromCount(tradition, resolved.monthCount);
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
 * year begins on the day numbered **2** — the year beginning in 1977 is one — and that call throws
 * {@link SkippedDayError} instead of returning the new year. Where the year opens with a leap
 * month 1, which happens twice per 65-year cycle under `PHUGPA` and `PHUGPA_HENNING` — the years
 * beginning in 2000 and 2019 CE are two — the year begins in the leap month rather than the
 * regular one.
 * Under `BHUTAN` and
 * `BHUTAN_HENNING`, whose leap months follow their twins, a year never opens with one.
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
 * @throws RangeError with code `TCT_FIELD_OUT_OF_RANGE` if `year` is not a safe integer,
 * `TCT_OUTSIDE_EXACT_RANGE` if it falls outside the range where the arithmetic stays exact, or
 * `TCT_INVALID_TRADITION_CONFIG` if `tradition` is malformed.
 */
export function losarFor(year: number, tradition: TraditionConfig = PHUGPA): TibetanDate {
	const scaled = scalingFor(tradition);
	tradition = scaled.tradition;
	assertSafeYear(`losarFor(${describe(year)})`, year);
	const julianDay = losarJulianDay(scaled, tradition, yearFromRoyalEra(year));
	assertExactJulianDay(scaled, julianDay, () => `losarFor(${year})`);
	return tibetanFromJulianDay(julianDay, tradition);
}
