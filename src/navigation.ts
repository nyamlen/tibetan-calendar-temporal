/**
 * Moving between Tibetan dates and months: the lunation coordinate, month and day arithmetic, and
 * the moon phases.
 *
 * @remarks
 * ## Two coordinates, and why arithmetic lives in them
 *
 * The calendar has two exact integer lines, and every operation here is `+` on one of them:
 *
 * - the **Julian day**, for solar days — `julianDayFromIso` / `isoFromJulianDay`;
 * - the **lunation**, for months — {@link lunationFromMonth} / {@link monthFromLunation}.
 *
 * Arithmetic on the *labels* — `year`, `month`, `isLeapMonth`, `day` — is where the ambiguities get
 * invented, because the label space is deliberately partial (a skipped date names no day) and
 * non-injective (two months of a leap year share a number, two days of a doubled pair share one).
 * In coordinate space none of that arises: a leap month is simply the next lunation.
 *
 * That is not a convention this package chose. A Tibetan month **is** a lunation, so "one month
 * later" means "the next new moon", and `monthsFor(2151)` prints `… M05 M06L M06 M07 …` because
 * that is the order the moon goes in.
 *
 * @packageDocumentation
 */

import {
	assertLunation,
	assertMonthCountYear,
	firstDayOfMonth,
	lastDayOfMonth,
	monthFromCount,
} from "./computation/calendar.js";
import {
	assertExactJulianDay,
	asWesternDay,
	isoFromJulianDayUnchecked,
	isoToTibetan,
	julianDayFromIso,
	julianDayOfFields,
	monthCountFor,
} from "./computation/conversion.js";
import { julianDayOfLunarDay } from "./computation/corrections.js";
import { royalEraFromYear } from "./computation/epoch.js";
import { scalingFor } from "./computation/scaling.js";
import { assertQueryOptions, codedError, describe, rangeError } from "./errors.js";
import { describeMonth } from "./months.js";
import { PHUGPA } from "./traditions/phugpa.js";
import type { TraditionConfig, TraditionOptions } from "./traditions/types.js";
import { validatedTradition } from "./traditions/validate.js";
import type { TibetanDate, TibetanDateFields, TibetanMonth, TibetanMonthFields } from "./types.js";
import { assertTibetanRanges, assertTibetanShape, SkippedDayError } from "./types.js";

/** Validates a count argument — `months`, `days`, or a `lunation`. */
function assertCount(subject: string, name: string, value: number): void {
	if (!Number.isSafeInteger(value)) {
		throw rangeError(
			"TCT_FIELD_OUT_OF_RANGE",
			`${subject}: ${name} must be a safe integer, received ${describe(value)}. ` +
				"Counting whole months or days, a fraction names nothing.",
		);
	}
}

/**
 * The month's position in the unbroken count of lunations since the tradition's epoch.
 *
 * @remarks
 * Janson calls this the true month count. Every Tibetan month counts once — **leap months
 * included** — so the value rises by exactly one per month and continues across Losar with no gap.
 *
 * This is the only route to that number: it needs the intercalation index, which is not public and
 * cannot be reconstructed from anything that is. {@link TibetanMonth.lunation} and
 * {@link TibetanDate.lunation} carry it on values the package already produced, so reach for this
 * when you have a month you built yourself and no object to read it off.
 *
 * A `TibetanDate` satisfies `TibetanMonthFields`, so passing one compiles and **ignores the day** —
 * a date's lunation is its month's, which is what {@link TibetanDate.lunation} already reports.
 *
 * Closed form: it never evaluates `true_date`, so it answers for months far outside the range where
 * {@link monthFromLunation} can return boundaries. The pair are inverses over the narrower of the
 * two domains, not over this one.
 *
 * @param month - The month to locate. `isLeapMonth` distinguishes the twins of a leap pair.
 * @param tradition - Astronomical constants. Defaults to `PHUGPA`.
 *
 * @throws RangeError with code `TCT_INVALID_ARGUMENT` if `month` is not an object naming a Tibetan
 * month, or `isLeapMonth` is present and not a boolean; `TCT_FIELD_OUT_OF_RANGE` if `year` is not a
 * safe integer or `month` is not an integer 1–12; `TCT_NO_SUCH_LEAP_MONTH` if `isLeapMonth` is set
 * for a month with no leap twin that year; `TCT_OUTSIDE_EXACT_RANGE` past the closed-form bound.
 *
 * @example
 * ```ts
 * const n = lunationFromMonth({ year: 2151, month: 6, isLeapMonth: true });
 * monthFromLunation(n + 1).monthCode;   // "M06" — the leap month's twin, one lunation later
 * ```
 */
export function lunationFromMonth(
	month: TibetanMonthFields,
	tradition: TraditionConfig = PHUGPA,
): number {
	const fields = assertTibetanShape("lunationFromMonth", month, "month");
	tradition = validatedTradition(tradition);
	return monthCountFor(
		assertTibetanRanges("lunationFromMonth", fields, "month"),
		tradition,
		fields,
	);
}

/**
 * The month at a given lunation — the inverse of {@link lunationFromMonth}.
 *
 * @remarks
 * Takes an integer with no year in hand, which is the direction a stored coordinate needs: a month
 * persisted as one sortable number comes back as a fully named `TibetanMonth`, year included.
 *
 * **Its domain is narrower than its inverse's.** This returns
 * {@link TibetanMonth.firstDay} and {@link TibetanMonth.lastDay}, so it evaluates `true_date` and is
 * bounded by the tradition's exact range — where `lunationFromMonth`, a closed form, is not. Round
 * trips hold over the narrower domain.
 *
 * @param lunation - The count, zero at the epoch and negative before it.
 * @param tradition - Astronomical constants. Defaults to `PHUGPA`.
 *
 * @throws RangeError with code `TCT_FIELD_OUT_OF_RANGE` if `lunation` is not a safe integer;
 * `TCT_OUTSIDE_EXACT_RANGE` past where the arithmetic stays exact.
 *
 * @example
 * ```ts
 * const n = lunationFromMonth({ year: 2151, month: 12 });
 * monthFromLunation(n + 1);   // month 1 of 2152 — the count crosses Losar with no gap
 * ```
 */
export function monthFromLunation(
	lunation: number,
	tradition: TraditionConfig = PHUGPA,
): TibetanMonth {
	tradition = validatedTradition(tradition);
	assertCount("monthFromLunation", "lunation", lunation);
	return monthAt("monthFromLunation", lunation, tradition);
}

/** The month at an already-validated lunation, reporting under the caller's name. */
function monthAt(name: string, lunation: number, tradition: TraditionConfig): TibetanMonth {
	const subject = () => `${name}(${lunation})`;
	// Before monthFromCount, not after: it multiplies by 65 first, so an unbounded count loses
	// precision and returns an identity built from noise rather than throwing.
	assertLunation(subject, lunation, tradition);

	const identity = monthFromCount(tradition, lunation);
	assertMonthCountYear(subject, identity.year, tradition);

	const scaled = scalingFor(tradition);
	// Bound both ends before describeMonth renders them. assertLunation above only keeps the *month
	// count* arithmetic exact; the boundaries come from true_date, whose range is far narrower, and
	// without this a lunation in between produced an uncoded `RangeError: Duration was not valid`
	// straight out of Temporal — a bare throw below the boundary, which is the shape the
	// error-codes record exists to prevent.
	assertExactJulianDay(scaled, firstDayOfMonth(scaled, lunation), subject);
	assertExactJulianDay(scaled, lastDayOfMonth(scaled, lunation), subject);

	return describeMonth(
		scaled,
		lunation,
		royalEraFromYear(identity.year),
		identity.month,
		identity.isLeap,
	);
}

/**
 * The month `months` lunations after this one. Negative counts step backwards.
 *
 * @remarks
 * **Month in, month out — and therefore total.** It never places a day number, so it never meets a
 * skipped one, and there is no convention to choose. That is the whole reason it takes a month
 * rather than a date: `addMonths(someDate, 1)` would have to decide what "the 8th of next month"
 * means when the 8th is skipped there.
 *
 * **A date no longer compiles here — narrowed 2026-08-26.** It used to: a `TibetanDate` satisfies
 * `TibetanMonthFields`, so `addMonths(aDate, 1)` silently discarded the day and returned a *month*.
 * With {@link addMonthsToDate} existing that would be two names one word apart, taking the same
 * argument and returning different types, with declaration order the only thing telling them
 * apart. The `day?: never` is the same mechanism {@link TibetanMonthFields.calendarId} already uses
 * to reject a `Temporal` instance, so the call now fails to compile and the error points at the
 * right function. Reach for {@link addMonthsToDate} for a date, or drop the day yourself.
 *
 * ## What the naive versions do
 *
 * This exists because the obvious consumer-side step is wrong, and wrong quietly. Indexing the
 * year's months by month number — `monthsFor(year)[month.month]` — returns **the month you are
 * already on** from the leap month onward, so a "next month" control dies halfway through every
 * leap year while returning a perfectly valid `TibetanMonth` and throwing nothing. Incrementing
 * `month` instead skips the leap month entirely, losing a whole thirty days. Searching a single
 * year by lunation returns nothing at month 12, which is Losar, twelve times a year.
 *
 * In lunation space none of that arises: `+1` from a leap month is its twin, because that is the
 * order the moon goes in.
 *
 * @param month - The month to step from. `isLeapMonth` distinguishes the twins of a leap pair.
 * @param months - How many lunations to move. May be negative or zero.
 * @param tradition - Astronomical constants. Defaults to `PHUGPA`.
 *
 * @throws RangeError with the codes {@link lunationFromMonth} and {@link monthFromLunation} throw;
 * `TCT_FIELD_OUT_OF_RANGE` if `months` is not a safe integer.
 *
 * @example
 * ```ts
 * addMonths({ year: 2151, month: 5 }, 1).monthCode;   // "M06L" — into the leap month
 * addMonths({ year: 2151, month: 5 }, 2).monthCode;   // "M06"  — and out of it
 * addMonths({ year: 2151, month: 12 }, 1).year;       // 2152   — across Losar
 * ```
 */
export function addMonths(
	month: TibetanMonthFields & { day?: never },
	months: number,
	tradition: TraditionConfig = PHUGPA,
): TibetanMonth {
	const fields = assertTibetanShape("addMonths", month, "month");
	tradition = validatedTradition(tradition);
	const subject = assertTibetanRanges("addMonths", fields, "month");
	assertCount("addMonths", "months", months);
	return monthAt("addMonths", monthCountFor(subject, tradition, fields) + months, tradition);
}

/**
 * How many lunations separate two months, signed.
 *
 * @remarks
 * Positive when `to` follows `from`, matching `getObservances(from, to)`. Counting **lunations**
 * rather than month labels is what makes a leap year come out right: from month 5 to month 7 of a
 * year whose month 6 is doubled is three months, not two, because three new moons pass.
 *
 * A `TibetanDate` satisfies `TibetanMonthFields`, so passing dates compiles and **ignores the
 * days** — this measures the months they fall in, so two dates in the same month are zero apart.
 *
 * Both arguments are validated separately, and the message names which one failed.
 *
 * @throws RangeError with the codes {@link lunationFromMonth} throws, for either argument.
 *
 * @example
 * ```ts
 * monthsBetween({ year: 2151, month: 5 }, { year: 2151, month: 7 });   // 3 — 2151 doubles month 6
 * monthsBetween({ year: 2153, month: 5 }, { year: 2153, month: 7 });   // 2 — 2153 does not
 * ```
 */
export function monthsBetween(
	from: TibetanMonthFields,
	to: TibetanMonthFields,
	tradition: TraditionConfig = PHUGPA,
): number {
	// Named per argument, because "monthsBetween: expected an object" would not say which of the two
	// the caller got wrong — and these are the first two-month exports on this surface.
	const fromFields = assertTibetanShape("monthsBetween(from)", from, "month");
	const toFields = assertTibetanShape("monthsBetween(to)", to, "month");
	tradition = validatedTradition(tradition);
	const fromSubject = assertTibetanRanges("monthsBetween", fromFields, "month", {
		parameter: "from",
	});
	const toSubject = assertTibetanRanges("monthsBetween", toFields, "month", { parameter: "to" });
	return (
		monthCountFor(toSubject, tradition, toFields) -
		monthCountFor(fromSubject, tradition, fromFields)
	);
}

/**
 * The Tibetan date `days` **solar days** after this one. Negative counts step backwards.
 *
 * @remarks
 * Solar days, not lunar ones, and the distinction is the whole point. A Tibetan date *number* is a
 * lunar day — one thirtieth of a lunation, varying between about 21.5 and 25.7 hours — which is why
 * some numbers are skipped and some carried by two days. Elapsed-time reckonings count solar days:
 * the forty-nine days of the *bardo*, the weekly pujas after a death. That is what this counts.
 *
 * **Total.** `isoToTibetan` is total over calendar days, and a skipped date is a *label* no calendar
 * day carries — so stepping real days can never arrive at one. There is no skipped-day case to
 * decide here, only the two failures that already exist: a skipped **starting** date throws
 * `SkippedDayError` before any arithmetic, and leaving the tradition's exact range throws
 * `TCT_OUTSIDE_EXACT_RANGE`.
 *
 * @param date - The date to step from.
 * @param days - How many solar days to move. May be negative or zero.
 * @param tradition - Astronomical constants. Defaults to `PHUGPA`.
 *
 * @throws SkippedDayError if `date` itself names no calendar day.
 * @throws RangeError with code `TCT_INVALID_ARGUMENT` for a wrong-kind argument;
 * `TCT_FIELD_OUT_OF_RANGE` if a field or `days` is out of range; `TCT_NO_SUCH_LEAP_MONTH` if
 * `isLeapMonth` is set for a month with no leap twin that year; `TCT_OUTSIDE_EXACT_RANGE` if the
 * date or the result lies outside the range where the arithmetic stays exact.
 *
 * @example
 * ```ts
 * addDays({ year: 2153, month: 12, day: 8 }, 49).isoDate;   // 49 calendar days later
 * ```
 */
export function addDays(
	date: TibetanDateFields,
	days: number,
	tradition: TraditionConfig = PHUGPA,
): TibetanDate {
	const fields = assertTibetanShape("addDays", date, "date");
	tradition = validatedTradition(tradition);
	const subject = assertTibetanRanges("addDays", fields, "date");
	assertCount("addDays", "days", days);

	const scaled = scalingFor(tradition);
	const target = julianDayOfFields(subject, tradition, fields) + days;
	// The starting date was inside the range or julianDayOfFields would have refused it, but the *result*
	// need not be: Julian-day arithmetic walks straight out of it. Without this the conversion below
	// would either throw uncoded from Temporal or answer from degraded arithmetic.
	assertExactJulianDay(scaled, target, () => `addDays(…, ${days})`);
	return isoToTibetan(isoFromJulianDayUnchecked(target), tradition);
}

/**
 * The one {@link TibetanDate} named by `date`, resolved from its identifying fields.
 *
 * @remarks
 * The named route from a date's **identity** to the date itself, and the counterpart of
 * {@link resolveMonth} one tier down. Before it existed the two available routes were both
 * accidents of other functions: `addDays(date, 0)` — a zero step, which reads as a mistake — and
 * `isoToTibetan(tibetanToIso(date))`, which announces a round trip through the Western calendar
 * to answer a Tibetan question.
 *
 * **Two passes, not a lookup.** It is exactly that round trip, named: fields to a Julian day and
 * back. Reach for it to *resolve* an identity, not inside a loop over a month — {@link datesFor}
 * walks the calendar days once and is the right shape there.
 *
 * @param date - The date to resolve. `isLeapMonth` and `isLeapDay` default to `false`: an unmarked
 * identity names the regular unit and the extra one must be marked. For a day, the regular half of
 * a doubled pair is the calendar day in which its lunar day ends, and the leap half borrows the
 * number (Janson, "a lunar day gives its number to the calendar day in which it ends").
 * @param tradition - Astronomical constants. Defaults to `PHUGPA`.
 *
 * @throws {@link SkippedDayError} — code `TCT_SKIPPED_DAY` — if no calendar day carries `date`.
 * Use {@link tibetanDateExists} to test first.
 * @throws RangeError with code `TCT_INVALID_ARGUMENT` if `date` is not an object naming a Tibetan
 * date, or a leap flag is present and not a boolean; `TCT_FIELD_OUT_OF_RANGE` for a field out of
 * range; `TCT_NO_SUCH_LEAP_MONTH` if `isLeapMonth` is set for a month with no leap twin that year;
 * `TCT_OUTSIDE_EXACT_RANGE` past the tradition's exact range.
 *
 * @example
 * ```ts
 * const date = resolveDate({ year: 2153, month: 12, day: 8 });
 * date.isoDate.toString();   // "2027-01-15"
 * ```
 */
export function resolveDate(
	date: TibetanDateFields,
	tradition: TraditionConfig = PHUGPA,
): TibetanDate {
	const fields = assertTibetanShape("resolveDate", date, "date");
	tradition = validatedTradition(tradition);
	const subject = assertTibetanRanges("resolveDate", fields, "date");
	return isoToTibetan(
		isoFromJulianDayUnchecked(julianDayOfFields(subject, tradition, fields)),
		tradition,
	);
}

/**
 * How {@link addMonthsToDate} resolves a day number the target month does not carry.
 *
 * @remarks
 * Named for `Temporal`'s own option of the same name, which faces the identical problem —
 * `PlainDate.from("2024-01-31").add({ months: 1 })` is `2024-02-29` — and offers the same two
 * answers. Matching its vocabulary means a consumer already knows what these mean.
 */
export type MonthOverflow = "constrain" | "reject";

/**
 * Options for {@link addMonthsToDate}: the overflow convention and the tradition.
 *
 * @remarks
 * The tradition's key was `config` until 2026-09-24, and is now `tradition`, as in every bag.
 */
export interface AddMonthsToDateOptions extends TraditionOptions {
	/**
	 * What to do when the target month does not carry the starting day's number.
	 *
	 * @defaultValue `"constrain"` — fall to the nearest **lower** number the month does carry, or to
	 * day 2 when day 1 is the skipped one. A doubled number is not missing, so `"reject"` accepts it.
	 */
	overflow?: MonthOverflow;
}

/**
 * The date `months` lunations after `date`, keeping the day number where the month carries it.
 *
 * @remarks
 * The date-tier counterpart of {@link addMonths}, and the answer to "the same day next month" —
 * which is the question a calendar UI's next-month control actually asks. {@link addMonths} cannot
 * answer it: it is month in, month out, and deliberately so.
 *
 * ## Why this exists when `addMonths` refuses the question
 *
 * `addMonths`'s docblock argues that the tradition supplies no answer for "the 8th of next month"
 * when the 8th is skipped there. **Two things say otherwise**, and it was reversed on 2026-08-26.
 *
 * `Temporal` faces the identical problem and does not refuse:
 * `PlainDate.from("2024-01-31").add({ months: 1 })` is `2024-02-29`, clamping by default and
 * offering `overflow: "reject"`. So the host language this package is built on has a settled,
 * overridable convention.
 *
 * And the tradition *does* answer the analogous question. Falling to the nearest lower existing
 * day is `"preceding"` — already the shipped convention on `/observances` for an observance whose
 * date is skipped, and what Janson and FPMT agree on. The default here is therefore not invented,
 * except in one case: when day 1 itself is skipped there is no lower day, and the fall to day 2 is
 * `"following"`, this function's own rule and not a convention the tradition states.
 *
 * **The overflow is explicit because the convention is contested.** A silent clamp would bake a
 * choice into the root export; naming it puts the choice in the caller's hands, which is what the
 * public-surface record requires. `@hebcal/core` — the closest lunisolar peer, with variable month
 * lengths and leap months — ships month arithmetic without documenting its overflow anywhere. That
 * is the gap this must not reproduce.
 *
 * ## What "nearest lower" means here
 *
 * Tibetan day numbers always run 1–30 while the month spans 29 or 30 *calendar days*, so some
 * numbers are skipped: 2153 M03 carries no 5 and no 29. Stepping onto one of those under
 * `"constrain"` lands on 4 and 28 respectively. It falls to the nearest lower day, or to day 2 when
 * day 1 itself is skipped (2154 M08), so a step never moves later than day 2.
 *
 * ## Which half of a doubled day
 *
 * A doubled number is carried by two calendar days: the **leap** half, the first, which almanacs
 * mark "Extra", and the **regular** half, the second. Both are named by role and not by position,
 * because `isLeapDay` is the field that says which.
 *
 * - **The requested number is doubled in the target month.** A start on a leap half lands on the
 *   target's leap half, and a start on a regular half on its regular half, so
 *   `addMonthsToDate(d, 0)` returns `d` itself. A start that is not doubled lands on the **regular**
 *   half: the calendar day in which that lunar day ends, which is the day an ordinary start is
 *   already on. The leap half is a day in which no lunar day ends and which borrows the number.
 *   That is thirty lunar days, exactly, from the day one lunar day ends to the day the same-numbered
 *   one ends next month.
 * - **The requested number is skipped.** The start's half then means nothing. Falling down onto a
 *   lower number that is doubled lands on its **regular** half, the calendar day just before where
 *   the requested number would have been. Falling from a skipped day 1 onto a doubled day 2 (2104
 *   M01) lands on its **leap** half, the month's real first calendar day.
 * - **`isLeapDay` on a start that is not doubled** is ignored, as it is everywhere a
 *   {@link TibetanDateFields} is read.
 *
 * **Stepping is not associative under `"constrain"`, and that is inherent rather than a defect.**
 * Constraining loses the original day number, so `addMonthsToDate(d, 1)` twice can differ from
 * `addMonthsToDate(d, 2)` — exactly as it does in `Temporal`. Step from the original date each
 * time if you want the day number preserved.
 *
 * @param date - The date to step from.
 * @param months - How many lunations to move. May be negative or zero.
 * @param options - `overflow` and `tradition`. A bag because the function has two choices, which is
 * this surface's rule: one choice is positional, two or more go in one bag.
 *
 * @throws {@link SkippedDayError} — code `TCT_SKIPPED_DAY` — under `overflow: "reject"` when the
 * target month does not carry the day number. Also thrown, under either setting, if `date` itself
 * names a day no calendar day carries.
 * @throws RangeError with the codes {@link addMonths} throws, plus `TCT_INVALID_ARGUMENT` if
 * `options` is `null`, not an object, or an array — the last being what a point-free `flatMap`
 * passes — if it carries a key other than `overflow` and `tradition`, `config` included, or if
 * `overflow` is neither `"constrain"` nor `"reject"`.
 *
 * @example
 * ```ts
 * // 2153 M03 carries no day 5 — it is skipped.
 * addMonthsToDate({ year: 2153, month: 2, day: 5 }, 1).day;                        // 4
 * addMonthsToDate({ year: 2153, month: 2, day: 5 }, 1, { overflow: "reject" });    // throws
 * ```
 */
export function addMonthsToDate(
	date: TibetanDateFields,
	months: number,
	options: AddMonthsToDateOptions = {},
): TibetanDate {
	const bag = assertQueryOptions<AddMonthsToDateOptions>(
		"addMonthsToDate",
		["overflow", "tradition"],
		options,
	);
	let tradition = bag.tradition === undefined ? PHUGPA : bag.tradition;
	const overflow = bag.overflow === undefined ? "constrain" : bag.overflow;
	if (overflow !== "constrain" && overflow !== "reject") {
		throw rangeError(
			"TCT_INVALID_ARGUMENT",
			`addMonthsToDate: overflow must be "constrain" or "reject", received ${describe(overflow)}`,
		);
	}
	const fields = assertTibetanShape("addMonthsToDate", date, "date");
	tradition = validatedTradition(tradition);
	const subject = assertTibetanRanges("addMonthsToDate", fields, "date");
	assertCount("addMonthsToDate", "months", months);

	const target = monthAt(
		"addMonthsToDate",
		monthCountFor(subject, tradition, fields) + months,
		tradition,
	);
	// Deliberately after the target: a skipped start whose target lies beyond the exact range reports
	// the range error here, unlike addDays, which reports the skipped start. Checking first would
	// change which failure that call names.
	// Resolved, not read off `date`: a leap flag on a day that is not doubled is ignored there, so
	// only the resolved start says whether it is the leap half of a doubled pair.
	const startsOnLeapHalf = isoToTibetan(
		isoFromJulianDayUnchecked(julianDayOfFields(subject, tradition, fields)),
		tradition,
	).isLeapDay;

	// Walk down from the requested number rather than reading the month's day list: the list costs
	// a conversion per calendar day, and the overwhelming case is that the first try succeeds.
	// The leap flag is passed only for the requested number itself; a number reached by falling down
	// takes the regular half, the calendar day just before where the requested one would have been.
	//
	// Why a start that is not doubled lands on the regular half of a doubled target: Janson, "a
	// lunar day gives its number to the calendar day in which it ends". The regular half is the day
	// lunar day N ends; the leap half is a day in which no lunar day ends and which borrows N. An
	// ordinary start is also the day its lunar day ends, so the regular half steps from "the day N
	// ends" to "the day N ends next month", thirty lunar days. Measured on Phugpa over Tibetan
	// 2027-2227 (1900-2101 CE): every "+1 month, same number" step from an ordinary day elapses 29
	// or 30 calendar days, never 28 or 31; of 67,321 such steps (an ordinary start, a target that
	// carries the number) 1,631 hit a doubled target, and the regular half gives 30 for every one.
	// test/navigation.test.ts re-measures this for PHUGPA and BHUTAN, whose doubled days also put
	// the leap half first.
	for (let day = fields.day; day >= 1; day--) {
		const candidate: TibetanDateFields = {
			year: target.year,
			month: target.month,
			day,
			isLeapMonth: target.isLeapMonth,
			isLeapDay: day === fields.day && startsOnLeapHalf,
		};
		try {
			return resolveDate(candidate, tradition);
		} catch (error) {
			if (!(error instanceof SkippedDayError)) throw error;
			if (overflow === "reject") throw error;
		}
	}

	// Day 1 itself can be the one skipped number (2154 M08), so there is no lower day to fall to.
	// Day 2 is then the nearest, and a month cannot skip both: it carries at least 29 of its 30.
	// Where day 2 is doubled (2104 M01) it is the month's first calendar day, its leap half.
	try {
		return resolveDate(
			{
				year: target.year,
				month: target.month,
				day: 2,
				isLeapMonth: target.isLeapMonth,
				isLeapDay: true,
			},
			tradition,
		);
	} catch (error) {
		if (!(error instanceof SkippedDayError)) throw error;
	}
	throw codedError(
		"TCT_INTERNAL",
		`addMonthsToDate: ${target.year}-${target.monthCode} carries neither day 1 nor day 2. ` +
			"A month carries at least 29 of its 30 numbers, so this cannot happen for a sound tradition",
	);
}

/**
 * How many **solar days** separate two Tibetan dates, signed.
 *
 * @remarks
 * Positive when `to` follows `from`, matching `getObservances(from, to)`.
 *
 * **If both dates came from this package, prefer Temporal.** `a.isoDate.until(b.isoDate)` is
 * Temporal-native, does the same arithmetic, and needs nothing from here. This function earns its
 * place for dates a caller **built themselves** — where there is no `isoDate` to subtract — and
 * those are also the ones that may name no calendar day at all. Saying so is more useful than
 * pretending this is always the right tool.
 *
 * Both endpoints must resolve, so a skipped date throws rather than counting from a day that does
 * not exist. Both arguments are validated separately and the message names which one failed.
 *
 * @throws SkippedDayError if either endpoint names no calendar day.
 * @throws RangeError with the codes {@link addDays} throws, for either argument.
 *
 * @example
 * ```ts
 * daysBetween({ year: 2153, month: 1, day: 1 }, { year: 2153, month: 6, day: 30 });
 * ```
 */
export function daysBetween(
	from: TibetanDateFields,
	to: TibetanDateFields,
	tradition: TraditionConfig = PHUGPA,
): number {
	const fromFields = assertTibetanShape("daysBetween(from)", from, "date");
	const toFields = assertTibetanShape("daysBetween(to)", to, "date");
	tradition = validatedTradition(tradition);
	const fromSubject = assertTibetanRanges("daysBetween", fromFields, "date", {
		parameter: "from",
	});
	const toSubject = assertTibetanRanges("daysBetween", toFields, "date", { parameter: "to" });
	return (
		julianDayOfFields(toSubject, tradition, toFields) -
		julianDayOfFields(fromSubject, tradition, fromFields)
	);
}

/** The lunar days whose ends are the full moon and the new moon — Janson's day-classification rule. */
const FULL_MOON = 15;
const NEW_MOON = 30;

/**
 * The next moon phase strictly after a given calendar day.
 *
 * @remarks
 * An O(1) lookup rather than a search: `julianDayOfLunarDay(scaled, 15, n)` gives the full moon of
 * lunation `n` directly, so this locates the containing month, asks for its phase, and steps one
 * lunation if that has already passed.
 */
/**
 * Normalises either accepted input to the ISO day the phase search starts from.
 *
 * @remarks
 * The policy itself lives in {@link asWesternDay}, shared with `./astrology`, which is where the
 * rule — both accepted shapes name their own calendar, a bare `{ year, month, day }` names
 * neither — is stated in full.
 *
 * **This pair accepted that bare object between 2026-08-26 and 2026-08-27 and no longer does.** The
 * widening bought chaining, which a resolved date gives just as well; what it cost was the only
 * parameter on the surface where one value could mean two calendars, silently resolved in favour of
 * Tibetan. `nextFullMoon({ year: 2026, month: 1, day: 1 })` meant as a Western date returned a day
 * in 1899. Narrowing keeps the chaining and returns the refusal.
 */
function phaseStart(name: string, date: Temporal.PlainDate | TibetanDate): Temporal.PlainDate {
	return asWesternDay(name, date);
}

function nextPhase(
	name: string,
	lunarDay: number,
	date: Temporal.PlainDate | TibetanDate,
	tradition: TraditionConfig,
): TibetanDate {
	const from = phaseStart(name, date);
	const scaled = scalingFor(tradition);
	tradition = scaled.tradition;
	const target = julianDayFromIso(from);
	assertExactJulianDay(scaled, target, () => `${name}(${from.toString()})`);

	let lunation = isoToTibetan(from, tradition).lunation;
	let julianDay = julianDayOfLunarDay(scaled, lunarDay, lunation);
	if (julianDay <= target) {
		lunation += 1;
		julianDay = julianDayOfLunarDay(scaled, lunarDay, lunation);
	}
	assertExactJulianDay(scaled, julianDay, () => `${name}(${from.toString()})`);
	return isoToTibetan(isoFromJulianDayUnchecked(julianDay), tradition);
}

/**
 * The next full moon strictly after `date`.
 *
 * @remarks
 * **Do not test for this with `day === 15`.** The full moon is the *end* of the fifteenth lunar
 * day, and when the number 15 is skipped that instant falls on the day numbered 14 — so the naive
 * check misses the full moon entirely in those months, silently. Measured over 2500 lunations, 56
 * of them do this: about one month in forty-five. 2026-12-23 is one, carrying the full moon of
 * 2153 M11 on the day numbered 14. {@link TibetanDate.isFullMoon} is derived correctly and is what
 * to read when you already have a date.
 *
 * **They chain directly, and they take a resolved date rather than loose fields.** This is the one
 * parameter on the surface that spans two calendars, so it accepts only shapes that *say* which one
 * they mean: a `Temporal` instance, or a {@link TibetanDate} the engine produced. A bare
 * `{ year, month, day }` names neither and is refused — call {@link resolveDate} on it first.
 * Widened to accept loose fields on 2026-08-26 and narrowed back on 2026-08-27, when a consumer
 * spike found it the only place a value could silently mean the wrong calendar.
 *
 * @throws RangeError with code `TCT_INVALID_ARGUMENT` if `date` is neither a value `asPlainDate`
 * accepts nor a resolved {@link TibetanDate}; `TCT_OUTSIDE_EXACT_RANGE` if the phase lies past
 * where the arithmetic stays exact.
 *
 * @remarks
 * The error surface is narrower than it looks, and deliberately: a resolved `TibetanDate` cannot
 * carry an out-of-range field or name a skipped day, so `TCT_FIELD_OUT_OF_RANGE` and
 * {@link SkippedDayError} are unreachable here and belong to {@link resolveDate} one call out.
 *
 * @example
 * ```ts
 * let moon = nextFullMoon(Temporal.PlainDate.from("2026-01-01"));
 * moon = nextFullMoon(moon);           // the one after that — no .isoDate needed
 * ```
 */
export function nextFullMoon(
	date: Temporal.PlainDate | TibetanDate,
	tradition: TraditionConfig = PHUGPA,
): TibetanDate {
	return nextPhase("nextFullMoon", FULL_MOON, date, tradition);
}

/**
 * The next new moon strictly after `date`.
 *
 * @remarks
 * The new moon ends lunar day 30 and so ends the month. Two reasons not to test the number: when 30
 * is **doubled** the instant falls on the *second* of the pair rather than on the leap day, and when
 * 30 is **skipped** it falls on the day numbered 29 — 48 times in 2500 lunations, 2025-02-27 among
 * them. {@link TibetanDate.isNewMoon} is the field form.
 *
 * @throws The codes {@link nextFullMoon} throws.
 */
export function nextNewMoon(
	date: Temporal.PlainDate | TibetanDate,
	tradition: TraditionConfig = PHUGPA,
): TibetanDate {
	return nextPhase("nextNewMoon", NEW_MOON, date, tradition);
}
