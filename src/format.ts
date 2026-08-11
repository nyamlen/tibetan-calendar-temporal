/**
 * The canonical string form of a {@link TibetanDate}.
 *
 * @packageDocumentation
 */

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
 */
export function formatTibetanDate(date: TibetanDate): string {
	const day = String(date.day).padStart(2, "0");
	return `${date.year}-${date.monthCode}-${day}${date.isLeapDay ? " (leap)" : ""}`;
}
