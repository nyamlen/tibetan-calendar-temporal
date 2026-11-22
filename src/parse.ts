/**
 * Reading the canonical string form back — the inverse of `formatTibetanDate`.
 *
 * @packageDocumentation
 */

import { describe, rangeError } from "./errors.js";
import type { TibetanDateFields, TibetanMonthFields } from "./types.js";

/**
 * The canonical form, and only the canonical form.
 *
 * @remarks
 * Each group, and what it refuses:
 *
 * - **Year** `(0|-?[1-9]\d*)` — no leading zeros, no `+`, no `-0`. The formatter emits
 *   `String(year)`, so those forms never come from it.
 * - **Month** `M(0[1-9]|1[0-2])` — always two digits, so `M1` is refused. The `M` is what stops
 *   the result being mistaken for ISO 8601 by eye or by a parser, so it is required.
 * - **Leap month** `(L?)` — uppercase only, matching what the formatter emits.
 * - **Day** `(0[1-9]|[12]\d|30)` — two digits, 01 to 30. Refuses `00` and `31`.
 * - **Leap day** `( \(leap\))?` — exactly one space and lowercase, again as emitted.
 */
// Deliberately strict. A parser can be loosened later without breaking anyone; it cannot be
// tightened. And the failure this package spends most effort preventing is the plausible-but-wrong
// string, so accepting "2153-12-08" — which is not this format, and *is* a well-formed ISO date
// naming a different day — would be the parser's version of that mistake.
// The year and month-code groups are written once and shared with `CANONICAL_MONTH`, so the two
// parsers cannot drift apart: `parseTibetanMonth(formatTibetanMonth(parseTibetanDate(s)))` holds
// for every string the date parser accepts.
const YEAR = String.raw`(0|-?[1-9]\d*)`;
const MONTH_CODE = "M(0[1-9]|1[0-2])(L?)";
const CANONICAL = new RegExp(String.raw`^${YEAR}-${MONTH_CODE}-(0[1-9]|[12]\d|30)( \(leap\))?$`);

/**
 * The year of a canonical string, refused unless it is a safe integer.
 *
 * @throws RangeError with code `TCT_FIELD_OUT_OF_RANGE` if the year is outside the safe-integer
 * range.
 */
function parsedYear(digits: string | undefined, text: string, functionName: string): number {
	const year = Number(digits);
	if (!Number.isSafeInteger(year)) {
		throw rangeError(
			"TCT_FIELD_OUT_OF_RANGE",
			`${functionName}: ${JSON.stringify(text)} names a year outside the safe-integer range`,
		);
	}
	return year;
}

/**
 * Parses the canonical string form of a Tibetan date.
 *
 * @remarks
 * The inverse of `formatTibetanDate`, and an exact one:
 * `formatTibetanDate(parseTibetanDate(s)) === s` for every string this accepts.
 *
 * ## It returns an input shape, not a resolved date
 *
 * It returns {@link TibetanDateFields} — the fields that *name* a date — rather than a
 * {@link TibetanDate}, and takes no `TraditionConfig`. **A skipped date is a well-formed
 * string:** `"2150-M12-29"` names a date that no calendar day carries, so it parses
 * successfully. Such dates appear in written sources and in almanacs, and a parser that threw on
 * them could not read back what a published table prints.
 *
 * Pass the result to `tibetanToIso` to resolve it, or to `tibetanDateExists` to test it first.
 *
 * Both optional flags are **always present** in the result, so the shape is predictable to inspect
 * and to compare.
 *
 * @throws RangeError with code `TCT_INVALID_ARGUMENT` if `text` is not a string, or is a string
 * outside the canonical grammar; `TCT_FIELD_OUT_OF_RANGE` if it parses but names a year outside the
 * safe-integer range. Those two are the only codes it throws — a skipped date parses successfully,
 * because the string is not the thing that is wrong.
 *
 * @example
 * ```ts
 * parseTibetanDate("2153-M12-08");
 * // { year: 2153, month: 12, day: 8, isLeapMonth: false, isLeapDay: false }
 *
 * parseTibetanDate("2127-M01L-01");
 * // { year: 2127, month: 1, day: 1, isLeapMonth: true, isLeapDay: false }
 *
 * parseTibetanDate("2152-M09-30 (leap)");
 * // { year: 2152, month: 9, day: 30, isLeapMonth: false, isLeapDay: true }
 *
 * tibetanToIso(parseTibetanDate("2153-M12-08"));
 * // Temporal.PlainDate 2027-01-15
 * ```
 */
export function parseTibetanDate(text: string): TibetanDateFields {
	// No `TraditionConfig`, and fields rather than a resolved date, for two reasons beside the
	// skipped date: parsing is a string operation and resolving needs the calendar, so making the
	// parser consult it would be the wrong dependency; and the formatter likewise takes no config,
	// which keeps the pair symmetric. A skipped date is also why `SkippedDayError` exists rather
	// than a `null` return.
	if (typeof text !== "string") {
		throw rangeError(
			"TCT_INVALID_ARGUMENT",
			`parseTibetanDate: expected a string, received ${describe(text)}`,
		);
	}

	// Failing the grammar is TCT_INVALID_ARGUMENT rather than TCT_FIELD_OUT_OF_RANGE: the parse
	// never reached a field, so nothing here is a field out of a range. Some rejected strings do
	// name an out-of-range number — "2153-M13-01" — but the pattern refuses the whole string before
	// any group is read, so the split follows the boundary the parser actually draws.
	const match = CANONICAL.exec(text);
	if (match === null) {
		throw rangeError(
			"TCT_INVALID_ARGUMENT",
			`parseTibetanDate: ${JSON.stringify(text)} is not a Tibetan date in the canonical form ` +
				'YYYY-MMM-DD, as produced by formatTibetanDate — for example "2153-M12-08", ' +
				'"2127-M01L-01" for a leap month, or "2152-M09-30 (leap)" for the first day of a ' +
				"doubled pair. The month is two digits after an M, and the day is two digits, 01-30",
		);
	}

	// Non-null throughout: every group but the two optional ones is required by the pattern, and
	// the optional ones are read via the match's own truthiness rather than captured text.
	const year = parsedYear(match[1], text, "parseTibetanDate");

	return {
		year,
		month: Number(match[2]),
		day: Number(match[4]),
		isLeapMonth: match[3] === "L",
		isLeapDay: match[5] !== undefined,
	};
}

/**
 * The canonical month form, and only the canonical form.
 *
 * @remarks
 * `CANONICAL` without the day and leap-day groups, so it refuses `"2151-06"`.
 */
// Strict for the same reasons as `CANONICAL`: a parser loosens without breaking anyone and tightens
// by breaking everyone, and "2151-06" is a plausible-but-wrong string this must refuse rather than
// guess at.
const CANONICAL_MONTH = new RegExp(`^${YEAR}-${MONTH_CODE}$`);

/**
 * Parses the canonical string form of a Tibetan month.
 *
 * @remarks
 * The inverse of {@link formatTibetanMonth}, and an exact one:
 * `formatTibetanMonth(parseTibetanMonth(s)) === s` for every string this accepts.
 *
 * Returns {@link TibetanMonthFields} and takes no `TraditionConfig`, for the reasons
 * {@link parseTibetanDate} gives: naming a month is a string operation, resolving one needs the
 * calendar, and the pair stays symmetric. A string naming a leap month that its year does not have
 * parses successfully — the string is not the thing that is wrong. Pass the result to
 * {@link resolveMonth} to resolve it, which is where that becomes `TCT_NO_SUCH_LEAP_MONTH`.
 *
 * `isLeapMonth` is **always present** in the result, so the shape is predictable to inspect and to
 * compare.
 *
 * @throws RangeError with code `TCT_INVALID_ARGUMENT` if `text` is not a string, or is a string
 * outside the canonical grammar; `TCT_FIELD_OUT_OF_RANGE` if it parses but names a year outside the
 * safe-integer range.
 *
 * @example
 * ```ts
 * parseTibetanMonth("2151-M06L");
 * // { year: 2151, month: 6, isLeapMonth: true }
 *
 * resolveMonth(parseTibetanMonth("2151-M06L")).days;   // 30
 * ```
 */
export function parseTibetanMonth(text: string): TibetanMonthFields {
	if (typeof text !== "string") {
		throw rangeError(
			"TCT_INVALID_ARGUMENT",
			`parseTibetanMonth: expected a string, received ${describe(text)}`,
		);
	}

	const match = CANONICAL_MONTH.exec(text);
	if (match === null) {
		throw rangeError(
			"TCT_INVALID_ARGUMENT",
			`parseTibetanMonth: ${JSON.stringify(text)} is not a Tibetan month in the canonical form ` +
				'YYYY-MMM, as produced by formatTibetanMonth — for example "2153-M12", or ' +
				'"2151-M06L" for a leap month. The month is two digits after an M',
		);
	}

	const year = parsedYear(match[1], text, "parseTibetanMonth");

	return { year, month: Number(match[2]), isLeapMonth: match[3] === "L" };
}
