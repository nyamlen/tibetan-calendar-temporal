/**
 * Naming a Tibetan year: the element–animal cycle and the rabjung numbering.
 *
 * @remarks
 * Both are **closed forms over the year alone** — three modulos, no lunar arithmetic, no config.
 * That is what makes them worth exporting rather than reachable: they answer for years where
 * evaluating the calendar must refuse, and they cost nothing to call in bulk, which is what a year
 * picker rendering a century does.
 *
 * They take the **royal era**, like every other public function here, not Janson's *Y*. The
 * internals take *Y*, which is 127 lower; publishing those directly would have put two functions on
 * the surface whose year argument silently differed from every neighbour, returning a confident
 * answer about the wrong century rather than throwing.
 *
 * @packageDocumentation
 */

import { rabjungFromYear, yearFromRoyalEra, yearNameFromYear } from "./computation/epoch.js";
import { rangeError } from "./errors.js";
import type { Rabjung, TibetanYearName } from "./types.js";

/**
 * Validates a year for the naming functions.
 *
 * @remarks
 * A safe-integer check and nothing else, deliberately. These evaluate no `true_date` and reach no
 * closed form on the *absolute* year large enough to overflow, so they need neither
 * `assertClosedFormYear` nor a tradition — and adding a bound they do not require would be a
 * refusal to answer a question this arithmetic can answer perfectly well.
 */
function assertYear(subject: string, year: number): void {
	if (!Number.isSafeInteger(year)) {
		throw rangeError(
			"TCT_FIELD_OUT_OF_RANGE",
			`${subject}: year must be a safe integer, received ${year}. ` +
				"Years here are the royal era, matching TibetanDate.year — 2153, not 2026.",
		);
	}
}

/**
 * The element–animal name of a Tibetan year.
 *
 * @remarks
 * The sixty-year cycle: five elements, each holding two consecutive years as male then female,
 * against twelve animals. Element and gender repeat every ten years, the animal every twelve, and
 * the whole name every sixty.
 *
 * Previously reachable only as `losarFor(year).yearName`, which computes the year's Losar — a full
 * mean-astronomy pass with two correction-table lookups — to read a value that needs no calendar at
 * all, and which refuses outside the tradition's exact range where this does not.
 *
 * These are **not** the Chinese celestial stems renamed. See {@link TibetanElement}: the Tibetan
 * cycle names the year by element and gender directly, and renders *lcags* as **iron** where the
 * Chinese *wǔxíng* 金 is conventionally metal.
 *
 * @param year - Royal-era year, matching {@link TibetanDate.year}.
 *
 * @throws RangeError with code `TCT_FIELD_OUT_OF_RANGE` if `year` is not a safe integer.
 *
 * @example
 * ```ts
 * yearNameFor(2153);   // { element: "fire", animal: "horse", gender: "male" }
 *
 * // The twelve-year animal return — lokeg, the obstacle year, at ages 13, 25, 37, 49, 61.
 * yearNameFor(2130 + 12).animal === yearNameFor(2130).animal;   // true
 * ```
 */
export function yearNameFor(year: number): TibetanYearName {
	assertYear("yearNameFor", year);
	return yearNameFromYear(yearFromRoyalEra(year));
}

/**
 * A Tibetan year's position in the rabjung — the sixty-year cycle counted from 1027 CE.
 *
 * @remarks
 * A **numbering**, not a name: `{ cycle, year }`, where `year` runs 1–60. Distinct from
 * {@link yearNameFor}, which gives the element–animal *name*; the two cycles are both sixty years
 * long and assign a given year different positions, three apart.
 *
 * Same closed form and same reason for existing as {@link yearNameFor}: previously reachable only
 * through `losarFor(year).rabjung`.
 *
 * @param year - Royal-era year, matching {@link TibetanDate.year}.
 *
 * @throws RangeError with code `TCT_FIELD_OUT_OF_RANGE` if `year` is not a safe integer.
 *
 * @example
 * ```ts
 * rabjungFor(2153);        // { cycle: 17, year: 40 }
 * rabjungFor(2153 + 60);   // { cycle: 18, year: 40 } — one cycle on, same position
 * ```
 */
export function rabjungFor(year: number): Rabjung {
	assertYear("rabjungFor", year);
	return rabjungFromYear(yearFromRoyalEra(year));
}
