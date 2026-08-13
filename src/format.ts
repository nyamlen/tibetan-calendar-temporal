/**
 * The canonical string form of a {@link TibetanDate}.
 *
 * @packageDocumentation
 */

import { rangeError } from "./errors.js";
import type { TibetanDateInput } from "./types.js";

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
 * `parseTibetanDate` is the inverse, and it returns a {@link TibetanDateInput} — a string names a
 * date without resolving it, and resolving would make a skipped date unreadable. Narrowed to
 * {@link TibetanDate}, this function could not consume that, so `formatTibetanDate(parse(s))` would
 * not even typecheck and the round trip would be a four-step pipeline instead of an identity.
 *
 * Widening loses nothing: a `TibetanDate` is assignable to {@link TibetanDateInput}, so every
 * existing call still compiles. It also gains something, because the month segment is now
 * **derived** from `month` and `isLeapMonth` rather than read from the caller's `monthCode`. An
 * object whose two disagree can no longer produce a string contradicting itself, since
 * {@link monthCodeOf} is the sole producer of that substring.
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
 * @throws RangeError with code `TCT_FIELD_OUT_OF_RANGE` if `date` does not carry an integer year,
 * a month in 1–12 and a day in 1–30. Everything above is an argument that a plausible-but-wrong
 * string is the failure worth preventing, and handed `{}` this produced exactly one:
 * `"undefined-undefined-undefined"`.
 */
export function formatTibetanDate(date: TibetanDateInput): string {
	if (
		date === null ||
		typeof date !== "object" ||
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

/** A value rendered short enough for a message, and unambiguously: `"3"` is not `3`. */
function describe(value: unknown): string {
	if (typeof value === "string") return JSON.stringify(value);
	if (value !== null && typeof value === "object") {
		const keys = Object.keys(value);
		return keys.length === 0 ? "{}" : `an object with keys ${keys.join(", ")}`;
	}
	return String(value);
}
