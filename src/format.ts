/**
 * The canonical string form of a {@link TibetanDate}.
 *
 * @packageDocumentation
 */

import { rangeError } from "./errors.js";
import {
	rejectInvalidLeapFlags,
	rejectMissingFields,
	rejectTemporalInstance,
	type TibetanDateFields,
	type TibetanMonthFields,
} from "./types.js";

/**
 * Formats a month as a Temporal-style code: `"M01"`…`"M12"`, with `L` appended for a leap month.
 *
 * @remarks
 * The **sole** producer of this substring, deliberately. It lives here rather than beside
 * `isoToTibetan`, which was its only caller when it was written, because three things now render a
 * month this way — `TibetanDate.monthCode`, `TibetanMonth.monthCode` and `formatTibetanDate` — and
 * a second definition is how two of them would come to disagree.
 *
 * Not exported from the package barrel. Being in this file does not make it API; `src/index.ts`
 * decides that.
 */
export function monthCodeOf(month: number, isLeap: boolean): string {
	return `M${String(month).padStart(2, "0")}${isLeap ? "L" : ""}`;
}

/**
 * Formats a Tibetan date as `YYYY-MMM-DD`, e.g. `"2153-M12-08"`.
 *
 * @remarks
 * This exists so that `` `${year}-${month}-${day}` `` is never hand-rolled. That naive form
 * produces a well-formed ISO-looking string which is **not** an ISO date, and which silently
 * discards two things that change which day is meant:
 *
 * - whether the month is a leap month, and
 * - which day of a doubled pair this is.
 *
 * The month segment is the Temporal-style month code, so a leap month is visibly `M01L` rather
 * than colliding with the regular `M01`. A leap day is suffixed with `(leap)`. The year is the
 * royal era, and using `M` in the month position means the result can never be mistaken for
 * ISO 8601 by eye or by a parser.
 *
 * ## Why this takes the input shape rather than a `TibetanDate`
 *
 * `parseTibetanDate` is the inverse, and it returns a {@link TibetanDateFields} — a string names a
 * date without resolving it, and resolving would make a skipped date unreadable. Narrowed to
 * {@link TibetanDate}, this function could not consume that, so `formatTibetanDate(parse(s))` would
 * not even typecheck and the round trip would be a four-step pipeline instead of an identity.
 *
 * Widening loses nothing: a `TibetanDate` is assignable to {@link TibetanDateFields}, so every
 * existing call still compiles. It also gains something, because the month segment is now
 * **derived** from `month` and `isLeapMonth` rather than read from the caller's `monthCode`. An
 * object whose two disagree can no longer produce a string contradicting itself, since
 * one internal function is the sole producer of that substring.
 *
 * @remarks
 * **This is not a complete encoding of a resolved date.** It renders the *naming* fields — the ones
 * {@link parseTibetanDate} returns — so `isLeapMonth` reaches the string as `M06L` and `isLeapDay`
 * as the ` (leap)` suffix, while `isDoubledDay`, `isFullMoon`, `isNewMoon` and `isoDate` do not
 * appear at all. That is exactly right for the round trip and wrong for equality: comparing two
 * dates by their formatted strings reports "same" where one is the second half of a doubled pair
 * and the other an ordinary day. Compare the fields you care about, not the rendering.
 *
 * @example
 * ```ts
 * formatTibetanDate(isoToTibetan(Temporal.PlainDate.from("2027-01-15")));
 * // "2153-M12-08"
 *
 * formatTibetanDate(isoToTibetan(Temporal.PlainDate.from("2000-02-06")));
 * // "2127-M01L-01" — Losar 2000, which fell in a leap month
 *
 * formatTibetanDate(parseTibetanDate("2153-M12-08"));
 * // "2153-M12-08" — the round trip, as an identity
 * ```
 *
 * @throws RangeError with code `TCT_INVALID_ARGUMENT` if `date` is not an object naming a Tibetan
 * date at all — `null`, a string, a `Temporal` instance — or if `isLeapMonth`/`isLeapDay` are
 * present but not `boolean`. Handed `{ isLeapMonth: 1, isLeapDay: "x" }` this once produced a
 * confident `" (leap)"` suffix from a truthy string.
 *
 * @throws RangeError with code `TCT_FIELD_OUT_OF_RANGE` if `date` is object-shaped but does not
 * carry an integer year, a month in 1–12 and a day in 1–30. Everything above is an argument that a
 * plausible-but-wrong string is the failure worth preventing, and handed `{}` this produced exactly
 * one: `"undefined-undefined-undefined"`.
 */
export function formatTibetanDate(date: TibetanDateFields): string {
	rejectTemporalInstance("formatTibetanDate", date);
	// Unconditional, and it carries the null/non-object check for this function as well as the flag
	// checks — which is why the field test below no longer repeats either. Guarding it with its own
	// shape test would make that test the reachable one and this function's shape error would then
	// carry the range code, disagreeing with the other three entry points.
	rejectInvalidLeapFlags("formatTibetanDate", date);
	rejectMissingFields("formatTibetanDate", date, ["year", "month", "day"]);
	if (
		!Number.isSafeInteger(date.year) ||
		!Number.isInteger(date.month) ||
		date.month < 1 ||
		date.month > 12 ||
		!Number.isInteger(date.day) ||
		date.day < 1 ||
		date.day > 30
	) {
		throw rangeError(
			"TCT_FIELD_OUT_OF_RANGE",
			"formatTibetanDate: expected a year, a month 1-12 and a day 1-30, received " +
				`${describe(date)}. Pass a value returned by isoToTibetan, losarFor or parseTibetanDate`,
		);
	}
	const day = String(date.day).padStart(2, "0");
	const monthCode = monthCodeOf(date.month, date.isLeapMonth ?? false);
	return `${date.year}-${monthCode}-${day}${date.isLeapDay ? " (leap)" : ""}`;
}

/**
 * Formats a Tibetan month as `YYYY-MMM`, e.g. `"2151-M06L"`.
 *
 * @remarks
 * The month-tier counterpart of {@link formatTibetanDate}, and the inverse of
 * {@link parseTibetanMonth}. The same argument applies one tier up: `` `${year}-${month}` ``
 * hand-rolled discards `isLeapMonth`, so the two months of a leap pair render identically and a
 * string that looks like a month key silently names the wrong one of the two.
 *
 * The month segment comes from the one internal function producing that substring, so this
 * cannot drift from `TibetanMonth.monthCode`.
 *
 * **A `TibetanDate` is accepted and its day is dropped.** A date is structurally a
 * {@link TibetanMonthFields}, so `formatTibetanMonth(aDate)` compiles and returns that date's
 * month. That is the same deliberate widening {@link daysInMonth} makes — a value from
 * `isoToTibetan` can be passed straight in — and it is stated here rather than left to be
 * discovered, because the string it returns is a *month* and looks nothing like a truncated date.
 *
 * @throws RangeError with code `TCT_INVALID_ARGUMENT` if `month` is not an object naming a Tibetan
 * month, or `isLeapMonth` is present and not a boolean; `TCT_FIELD_OUT_OF_RANGE` if it does not
 * carry an integer year and a month in 1-12.
 *
 * @example
 * ```ts
 * formatTibetanMonth({ year: 2151, month: 6, isLeapMonth: true });   // "2151-M06L"
 * formatTibetanMonth({ year: 2153, month: 12 });                     // "2153-M12"
 * ```
 */
export function formatTibetanMonth(month: TibetanMonthFields): string {
	rejectTemporalInstance("formatTibetanMonth", month);
	rejectInvalidLeapFlags("formatTibetanMonth", month);
	rejectMissingFields("formatTibetanMonth", month, ["year", "month"]);
	if (
		!Number.isSafeInteger(month.year) ||
		!Number.isInteger(month.month) ||
		month.month < 1 ||
		month.month > 12
	) {
		throw rangeError(
			"TCT_FIELD_OUT_OF_RANGE",
			"formatTibetanMonth: expected a year and a month 1-12, received " +
				`${describe(month)}. Pass a value returned by monthsFor or resolveMonth`,
		);
	}
	return `${month.year}-${monthCodeOf(month.month, month.isLeapMonth ?? false)}`;
}

/**
 * The object rendered short enough for a message, by the keys it does carry.
 *
 * @remarks
 * Takes `object` rather than `unknown` because by its only call site it cannot be anything else:
 * `rejectInvalidLeapFlags` runs first and rejects `null`, `undefined`, strings and numbers, so the
 * field check below it only ever describes a real object. It used to branch on all three, and
 * coverage showed those branches dead as soon as the shape guard moved above them — the parameter
 * type is what stops them being written back.
 */
function describe(value: object): string {
	const keys = Object.keys(value);
	return keys.length === 0 ? "{}" : `an object with keys ${keys.join(", ")}`;
}
