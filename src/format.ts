/**
 * The canonical string form of a {@link TibetanDate}.
 *
 * @packageDocumentation
 */

import { rangeError } from "./errors.js";
import type { TibetanDate } from "./types.js";

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
 * The month segment is the Temporal-style {@link TibetanDate.monthCode}, so a leap month is
 * visibly `M01L` rather than colliding with the regular `M01`. A leap day is suffixed with
 * `(leap)`. The year is the royal era, and using `M` in the month position means the result can
 * never be mistaken for ISO 8601 by eye or by a parser.
 *
 * @example
 * ```ts
 * formatTibetanDate(isoToTibetan(Temporal.PlainDate.from("2027-01-15")));
 * // "2153-M12-08"
 *
 * formatTibetanDate(isoToTibetan(Temporal.PlainDate.from("2000-02-06")));
 * // "2153-M01L-01" — Losar 2000, which fell in a leap month
 * ```
 *
 * @throws RangeError with code `TCT_FIELD_OUT_OF_RANGE` if `date` is not a {@link TibetanDate}.
 * Everything above is an argument that a plausible-but-wrong string is the failure worth
 * preventing, and handed `{}` this produced exactly one: `"undefined-undefined-undefined"`.
 */
export function formatTibetanDate(date: TibetanDate): string {
	if (
		date === null ||
		typeof date !== "object" ||
		!Number.isSafeInteger(date.year) ||
		typeof date.monthCode !== "string" ||
		!Number.isSafeInteger(date.day)
	) {
		throw rangeError(
			"TCT_FIELD_OUT_OF_RANGE",
			"formatTibetanDate: expected a TibetanDate with year, monthCode and day, received " +
				`${describe(date)}. Pass a value returned by isoToTibetan or losarFor`,
		);
	}
	const day = String(date.day).padStart(2, "0");
	return `${date.year}-${date.monthCode}-${day}${date.isLeapDay ? " (leap)" : ""}`;
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
