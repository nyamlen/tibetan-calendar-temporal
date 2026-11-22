/**
 * The canonical string form of a {@link TibetanDate}.
 *
 * @packageDocumentation
 */

// A value-import cycle: `types.ts` imports this file back. It is safe only while every reference
// across it sits inside a function body; a module-level use of either side's exports would hit a
// TDZ `ReferenceError` whose appearance depends on which barrel loads first. See the matching comment there.
import {
	assertTibetanRanges,
	assertTibetanShape,
	type TibetanDateFields,
	type TibetanMonthFields,
} from "./types.js";

/**
 * Formats a month as a Temporal-style code: `"M01"`…`"M12"`, with `L` appended for a leap month.
 *
 * @remarks
 * The **sole** producer of this substring, deliberately: three things render a month this way —
 * `TibetanDate.monthCode`, `TibetanMonth.monthCode` and `formatTibetanDate` — and a second
 * definition is how two of them would come to disagree.
 *
 * Not exported from the package barrel. Being in this file does not make it API; `src/index.ts`
 * decides that.
 */
export function monthCodeOf(month: number, isLeap: boolean): string {
	// It lives in this file rather than beside `isoToTibetan`, its first caller, so that the
	// formatter and both month producers import one definition.
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
 * ## The input shape
 *
 * It takes a {@link TibetanDateFields} rather than a {@link TibetanDate}: `parseTibetanDate`, the
 * inverse, returns fields that name a date without resolving it, so `formatTibetanDate(parse(s))`
 * is an identity, and a `TibetanDate` is accepted too. The month segment is **derived** from
 * `month` and `isLeapMonth`, never read from a `monthCode` the object carries, so an object whose
 * two disagree cannot produce a string contradicting itself.
 *
 * **This is not a complete encoding of a resolved date.** It renders the *naming* fields — the ones
 * {@link parseTibetanDate} returns — so `isLeapMonth` reaches the string as `M06L` and `isLeapDay`
 * as the ` (leap)` suffix, while `isDoubledDay`, `isFullMoon`, `isNewMoon` and `isoDate` do not
 * appear at all. That is exactly right for the round trip and wrong for equality: comparing two
 * dates by their formatted strings reports "same" where one is the second half of a doubled pair
 * and the other an ordinary day. Compare the fields you care about, not the rendering.
 *
 * @throws RangeError with code `TCT_INVALID_ARGUMENT` if `date` is not an object naming a Tibetan
 * date — `null`, a string, a `Temporal` instance, or an object with no numeric `year`, `month` or
 * `day` — or if `isLeapMonth` or `isLeapDay` is present but not `boolean`;
 * `TCT_FIELD_OUT_OF_RANGE` if `year` is not a safe integer, `month` is not an integer in 1–12 or
 * `day` is not an integer in 1–30.
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
 */
export function formatTibetanDate(date: TibetanDateFields): string {
	// Narrowed to `TibetanDate`, this could not consume what `parseTibetanDate` returns, so the round
	// trip would be a four-step pipeline instead of an identity; a `TibetanDate` is assignable to
	// `TibetanDateFields`, so widening lost no caller.
	// Both guards exist because a plausible-but-wrong string is the failure worth preventing:
	// without them `{}` gives "undefined-undefined-undefined", and `{ isLeapMonth: 1, isLeapDay: "x" }`
	// a confident " (leap)" suffix from a truthy string.
	const fields = assertTibetanShape("formatTibetanDate", date, "date", "convert");
	assertTibetanRanges("formatTibetanDate", fields, "date", {
		hint: "Pass a value returned by isoToTibetan, losarFor or parseTibetanDate",
	});
	const day = String(fields.day).padStart(2, "0");
	const monthCode = monthCodeOf(fields.month, fields.isLeapMonth ?? false);
	return `${fields.year}-${monthCode}-${day}${fields.isLeapDay ? " (leap)" : ""}`;
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
 * month — `null`, a `Temporal` instance, or an object with no numeric `year` or `month` — or
 * `isLeapMonth` is present and not a boolean; `TCT_FIELD_OUT_OF_RANGE` if `year` is not a safe
 * integer or `month` is not an integer in 1–12.
 *
 * @example
 * ```ts
 * formatTibetanMonth({ year: 2151, month: 6, isLeapMonth: true });   // "2151-M06L"
 * formatTibetanMonth({ year: 2153, month: 12 });                     // "2153-M12"
 * ```
 */
export function formatTibetanMonth(month: TibetanMonthFields): string {
	const fields = assertTibetanShape("formatTibetanMonth", month, "month", "convert");
	assertTibetanRanges("formatTibetanMonth", fields, "month", {
		hint: "Pass a value returned by monthsFor or resolveMonth",
	});
	return `${fields.year}-${monthCodeOf(fields.month, fields.isLeapMonth ?? false)}`;
}
