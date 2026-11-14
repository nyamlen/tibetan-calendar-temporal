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

import {
	assertSafeYear,
	codedError,
	describe,
	hasCode,
	isPlainObject,
	rangeError,
	thrownDetail,
} from "../errors.js";
import { monthCodeOf } from "../format.js";
import { weekdayNameWithOffset } from "../names.js";
import {
	assertIsoCalendar,
	temporalKindOf,
	temporalTypeNameOf,
	toNativePlainDate,
} from "../temporal-kind.js";
import { PHUGPA } from "../traditions/phugpa.js";
import type { TraditionConfig } from "../traditions/types.js";
import type {
	TibetanDate,
	TibetanDateFields,
	TibetanMonthFields,
	TibetanWeekday,
} from "../types.js";
import { assertTibetanRanges, assertTibetanShape, SkippedDayError } from "../types.js";
import { floorDiv, mod } from "./arithmetic.js";
import {
	assertClosedFormYear,
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
 *
 * `subject` names the export and argument the caller passed, such as `getObservances(from)`, and
 * opens the message when given: this is the one guard every entry point shares, so each states its
 * own name through it rather than keeping a copy that names it.
 */
export function asPlainDate(date: Temporal.PlainDate, subject?: string): Temporal.PlainDate {
	// Declared as `unknown` from here: the parameter's own type says `Temporal.PlainDate`, which is
	// the guarantee a TypeScript caller gets, but this function's job past this line is to accept
	// runtime input that does not honour it and either normalise or reject it.
	const raw: unknown = date;
	const prefix = subject === undefined ? "" : `${subject}: `;
	// Kind, not identity: a `PlainDate` from a second Temporal implementation is a Western date and
	// is normalised into this realm, rather than refused for having been built elsewhere. See
	// `temporal-kind.ts`, which is the only file in `src/` that asks `instanceof Temporal`.
	const kind = temporalKindOf(raw);
	if (kind !== null) return toNativePlainDate(raw, kind);
	if (typeof raw !== "string") {
		// A Temporal type outside the three — `Instant`, `PlainYearMonth`, `PlainMonthDay`,
		// `PlainTime`, `Duration` — carries its own tag and so is named rather than described as
		// "an object". None of them names a calendar day, so none is normalisable.
		const temporalType = temporalTypeNameOf(raw);
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
	try {
		return assertIsoCalendar(Temporal.PlainDate.from(raw));
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
 * exactly the ground {@link asPlainDate} refuses it at every other entry point.
 *
 * **This existed twice**, as `phaseStart` in `navigation.ts` and `isoOf` in `astrology/index.ts`,
 * written months apart because each subsystem needed a boundary helper and neither had one to
 * import. `check:conventions` rule 14 could not see the pair — the bodies differed and so did the
 * arity — and both copies had drifted into shipping a message that misdescribed its own function:
 * `nextFullMoon` named two of the four shapes it accepts, and `attributesFor` named four while
 * never mentioning the resolved `TibetanDate` it takes. One message, named shapes, one home.
 *
 * The Tibetan branch reads `isoDate` rather than re-running {@link tibetanToIso}: a resolved date
 * already carries the answer, so this is a field read and not a conversion — which is why no
 * `TraditionConfig` is a parameter here. It is still normalised, because a resolved date may have
 * been built under a different Temporal implementation from the one now global.
 *
 * @throws A `TCT_INVALID_ARGUMENT` error naming every shape it accepts.
 */
export function asWesternDay(
	functionName: string,
	date: Temporal.PlainDate | TibetanDate,
): Temporal.PlainDate {
	const raw: unknown = date;
	if (typeof raw === "string" || temporalKindOf(raw) !== null) {
		return asPlainDate(date as Temporal.PlainDate);
	}
	if (raw !== null && typeof raw === "object") {
		// Read under `try`, as `temporalKindOf` reads a tag: the `in` runs a Proxy's `has` trap and
		// the read its `get`, and a throw from either escaped uncoded until review on 2026-09-24.
		let isoDate: unknown;
		try {
			isoDate = "isoDate" in raw ? (raw as { isoDate: unknown }).isoDate : undefined;
		} catch (error) {
			throw rangeError(
				"TCT_INVALID_ARGUMENT",
				`${functionName}: received a value that cannot be read — reading its isoDate threw ` +
					`${thrownDetail(error)}. Pass the date itself.`,
			);
		}
		if (temporalKindOf(isoDate) === "PlainDate") return asPlainDate(isoDate as Temporal.PlainDate);
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
 * Guarded like every other exported function, which it was not: `isoFromJulianDay(0.5)` and
 * `isoFromJulianDay(1e15)` both threw uncoded `RangeError`s whose text named Temporal rather than
 * this package, against the README's blanket claim that every failure carries a code.
 *
 * The range check matters more than the tidier message. This was the one public route that did not
 * apply the tradition's exact-range bound, so it was the way into the range the rest of the
 * API carefully refuses. That bound is a property of the tradition rather than of the package —
 * `PHUGPA_HENNING` runs out around ISO year 11,356 and `PHUGPA` around 236,312, both inside
 * Temporal's own range — so this takes a config and defaults it like every other entry point.
 *
 * @throws RangeError with code `TCT_FIELD_OUT_OF_RANGE` if `julianDay` is not a safe integer, or
 * `TCT_OUTSIDE_EXACT_RANGE` if it lies past where the tradition's arithmetic stays exact.
 */
export function isoFromJulianDay(
	julianDay: number,
	tradition: TraditionConfig = PHUGPA,
): Temporal.PlainDate {
	if (!Number.isSafeInteger(julianDay)) {
		throw rangeError(
			"TCT_FIELD_OUT_OF_RANGE",
			`isoFromJulianDay: julianDay must be a safe integer, received ${describe(julianDay)}. A Julian day ` +
				"number counts whole days, so a fraction names nothing — there is no time of day in it",
		);
	}
	assertExactJulianDay(scalingFor(tradition), julianDay, () => `isoFromJulianDay(${julianDay})`);
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
 * the package: `PHUGPA_HENNING`'s common denominator is fifteen times Phugpa's, so its range is a
 * fifteenth as wide — about ISO years −20,781 to 11,356, where Phugpa's is about −245,737 to
 * 236,312. Both lie inside Temporal's own range. A caller who hits this on one config and not the
 * other needs to be told which one refused.
 *
 * The bound is symmetric in the Julian day, so the message names the end on the side the refused
 * value lies on: an ISO year of 236,312 is no help to someone refusing a date in −250,000.
 */
export function assertExactJulianDay(
	scaled: ScaledTradition,
	julianDay: number,
	subject: () => string,
): void {
	if (!(Math.abs(julianDay) <= scaled.exactToJulianDay)) {
		const below = julianDay < 0;
		const bound = below ? -scaled.exactToJulianDay : scaled.exactToJulianDay;
		throw rangeError(
			"TCT_OUTSIDE_EXACT_RANGE",
			`${subject()} is outside the range where the ${scaled.tradition.name} tradition's arithmetic ` +
				`stays exact: JD must be ${below ? "at least" : "at most"} ${bound}` +
				`${describeBound(bound)}, received ${julianDay}`,
		);
	}
}

/**
 * The exactness bound as an ISO year, parenthesised, or `""` when it has none.
 *
 * @remarks
 * A raw Julian day in the tens of millions is not a number anyone can act on. The ISO year is, and
 * it is what makes the `PHUGPA_HENNING` limit legible as "about year 11,356" rather than as
 * `5868816`. A bound may fall outside `Temporal.PlainDate`'s own range, ISO years −271,821 to
 * 275,760, so this degrades to nothing rather than throwing a second error while reporting the
 * first. No shipped tradition's does.
 */
function describeBound(signedBound: number): string {
	try {
		return ` (about ISO year ${isoFromJulianDayUnchecked(signedBound).year})`;
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
function tibetanWeekdayUnchecked(julianDay: number): TibetanWeekday {
	// The one place the brand is applied without asTibetanWeekday, and it is sound by construction:
	// `mod` is the flooring modulus, so the result is in 0…6 for every integer input. Routing this
	// through the validator would re-check a bound the arithmetic already guarantees, on the hottest
	// path in the package — every date built calls it.
	return mod(julianDay + 2, 7) as TibetanWeekday;
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
export function tibetanWeekday(julianDay: number): TibetanWeekday {
	// The guard this function most needed, and the one it did not have. It returns a plain `number`
	// with no other signal, and every plausible consumer feeds that straight into a lookup table of
	// weekday names — so `tibetanWeekday(1.5)` returning `3.5` is an out-of-bounds index at best and
	// a blank cell in a rendered calendar at worst. `NaN` in gave `NaN` out; a string gave `NaN` too.
	if (!Number.isSafeInteger(julianDay)) {
		throw rangeError(
			"TCT_FIELD_OUT_OF_RANGE",
			`tibetanWeekday: julianDay must be a safe integer, received ${describe(julianDay)}`,
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
		weekdayName: weekdayNameWithOffset(
			tibetanWeekdayUnchecked(julianDay),
			scaled.tradition.naming?.weekdayOffset ?? 0,
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
 * a bound derived from the tradition's constants.
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
	assertTibetanShape("tibetanToIso", input, "date");
	// The tradition between the shape and the range, the order tibetanDateExists depends on.
	scalingFor(tradition);
	const subject = assertTibetanRanges("tibetanToIso", input, "date");
	return isoFromJulianDayUnchecked(julianDayOfFields(subject, tradition, input));
}

/**
 * The true month count of an already range-checked month, refusing a leap month with no twin.
 *
 * @remarks
 * The leap-twin preamble every month- and date-tier entry point runs: `yearFromRoyalEra`, the
 * closed-form year bound, the `TCT_NO_SUCH_LEAP_MONTH` refusal, then `trueMonthCount`. It was
 * written out five times with three wordings, two of which built a subject omitting the very flag
 * that was wrong. `subject` is the echo `assertTibetanRanges` returned, so the refusal names the
 * function the caller called.
 *
 * **It does not bound the exact range**, because `lunationFromMonth` and `addMonths` are closed
 * forms and bounding them here would narrow them. Callers that go on to evaluate `true_date` bound
 * what they evaluate.
 */
export function monthCountFor(
	subject: () => string,
	tradition: TraditionConfig,
	month: TibetanMonthFields,
): number {
	const year = yearFromRoyalEra(month.year);
	assertClosedFormYear(subject, year, tradition);
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
 * The Julian day an already range-checked Tibetan date names, reporting under the caller's subject.
 *
 * @remarks
 * `tibetanToIso`'s body after its guards, shared so that `resolveDate`, `addDays`, `daysBetween` and
 * `tibetanDateExists` report their own name rather than `tibetanToIso`'s. Not exported from the
 * package barrel.
 *
 * Throws {@link SkippedDayError} carrying the caller's own object, since `docs/guide.md` promises
 * that `error.requested` is the input that was passed.
 */
export function julianDayOfFields(
	subject: () => string,
	tradition: TraditionConfig,
	date: TibetanDateFields,
): number {
	const scaled = scalingFor(tradition);
	const monthCount = monthCountFor(subject, tradition, date);

	// Bound before classifying, not after. Past the exact limit classifyDay's arithmetic has
	// already lost precision, and it reports the damage as a skipped date. The mean date is within
	// 0.6 days of the true date and is exact over a wider range — its denominator divides
	// `commonDenominator` — so it is the right quantity to test the limit with.
	// The bound is this day's, not the month's, so it can accept day 30 of a month whose day 1 it
	// refuses — where `resolveMonth` and `datesFor` refuse the whole month. That is deliberate.
	assertExactJulianDay(
		scaled,
		floorDiv(meanDate(scaled, date.day, monthCount), scaled.meanDate.den),
		subject,
	);

	const classification = classifyDay(scaled, date.day, monthCount);

	if (classification.kind === "skipped") throw new SkippedDayError(date);
	if (classification.kind === "doubled" && (date.isLeapDay ?? false)) {
		return classification.leapJulianDay as number;
	}
	return classification.julianDay as number;
}

/**
 * Whether a Tibetan date names a real calendar day.
 *
 * @remarks
 * The predicate counterpart to {@link tibetanToIso}. It answers `false` in the three cases a caller
 * means by "this date is not real": the date is **skipped**, so no calendar day carries its number;
 * a present field is out of range or not an integer; and `isLeapMonth` names a month with no leap
 * twin that year. All three are ordinary answers about the input, which is what makes this safe to
 * point at user input.
 *
 * It deliberately does **not** swallow anything else. A predicate that reports "this date does not
 * exist" when the truth is "the engine broke" is worse than a throw, and this one is used as an
 * oracle by the suite's strongest property, where masking a failure would make that property pass
 * more easily rather than fail.
 *
 * So the `catch` is an **allowlist**, and it matches **one class and two codes**, never three
 * codes: `SkippedDayError` by class, plus `TCT_FIELD_OUT_OF_RANGE` and `TCT_NO_SUCH_LEAP_MONTH`.
 * Everything else propagates. `TCT_SKIPPED_DAY` is deliberately **not** matched as a code, so an
 * error carrying that code without the class would be rethrown rather than swallowed — the class is
 * what a caller branches on and what the rest of this package throws.
 *
 * It was a denylist — every `RangeError` bar one code answered `false` — and that lost the race,
 * because a config whose denominators `deriveScaling` could not work with threw an uncoded
 * `RangeError` from three frames down and this function reported that Losar does not exist. A
 * denylist has to anticipate every failure that will ever be added; an allowlist only has to name
 * the three things that are genuinely answers about the input.
 *
 * `TCT_OUTSIDE_EXACT_RANGE` is on the throwing side on purpose. Past that bound the day was never
 * computed, so `false` would be a confident claim about arithmetic that was refused rather than
 * performed — which is the same reason that code exists separately from `TCT_SKIPPED_DAY`.
 *
 * `TCT_INVALID_ARGUMENT` is on the throwing side for the same kind of reason: a `Temporal.PlainDate`
 * or a non-boolean `isLeapMonth` is a confusion in the caller's code, not a date that does not
 * exist, and answering `false` would let that confusion look like a calendrical fact.
 *
 * ## A missing or wrong-typed field throws — changed 2026-08-26
 *
 * **This is a behaviour change, and a migration note for anyone passing unvalidated input.** A
 * required field that is absent, `null`, or not a number now raises `TCT_INVALID_ARGUMENT` rather
 * than answering `false`:
 *
 * ```ts
 * tibetanDateExists({ year: 2153, month: 1 });                     // throws — day forgotten
 * tibetanDateExists({ year: 2151, month: 6, isLeapMonth: true });  // throws — that is a MONTH
 * ```
 *
 * Both used to answer `false`, reporting the caller's type confusion as a calendrical fact — the
 * exact outcome the two-code split exists to prevent. A **present** number that is out of range,
 * fractional or `NaN` is unchanged and still answers `false`; the line is presence, not validity.
 * Validate shape before calling if you were relying on `false` for arbitrary input.
 */
export function tibetanDateExists(
	input: TibetanDateFields,
	tradition: TraditionConfig = PHUGPA,
): boolean {
	// The same order as tibetanToIso, under this function's own name. The shape and the tradition
	// are checked outside the `try`, so a Temporal instance or a broken config throws rather than
	// answering `false`; the range is checked inside it, and only after the tradition — checked
	// first, a range error would be swallowed and a broken config reported as a missing date.
	assertTibetanShape("tibetanDateExists", input, "date");
	scalingFor(tradition);
	try {
		julianDayOfFields(assertTibetanRanges("tibetanDateExists", input, "date"), tradition, input);
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
 * data. The derivation and the proof are on the internal scaled tradition's `searchHalfWidth`.
 *
 * Do not widen the window at the call site "to be safe" — if a date is not found inside it, the
 * fault is elsewhere.
 *
 * @throws RangeError with code `TCT_OUTSIDE_EXACT_RANGE` if the date falls outside the range where
 * the arithmetic stays exact. This is reachable inside `Temporal.PlainDate`'s own range:
 * `PHUGPA_HENNING` is exact only from about year −20,781 to 11,356, and `PHUGPA` from about
 * −245,737 to 236,312. `TCT_INVALID_ARGUMENT` if `date` is not a
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
	tradition: TraditionConfig = PHUGPA,
): TibetanDate {
	const scaled = scalingFor(tradition);
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
		// A plain Error, not a RangeError, and `codedError` is what makes that true. What keeps this
		// out of `tibetanDateExists`'s `false` is TCT_INTERNAL's absence from that function's
		// allowlist — one class and two codes — and not its type: the predicate has not swallowed
		// every RangeError since the allowlist landed. Reporting this as "that date does not exist"
		// would be the opposite of the truth, in the oracle for the suite's strongest property. See
		// the remarks on that function.
		throw codedError(
			"TCT_INTERNAL",
			`no Tibetan date found for ${date.toString()} within the proved search window; ` +
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
export function losarFor(year: number, tradition: TraditionConfig = PHUGPA): TibetanDate {
	const scaled = scalingFor(tradition);
	assertSafeYear(`losarFor(${describe(year)})`, year);
	const julianDay = losarJulianDay(scaled, tradition, yearFromRoyalEra(year));
	assertExactJulianDay(scaled, julianDay, () => `losarFor(${year})`);
	return isoToTibetan(isoFromJulianDayUnchecked(julianDay), tradition);
}
