/**
 * The cyclic names of Tibetan time, and the public way to reach them.
 *
 * @remarks
 * Three exports, each naming a position in a cycle: `yearNameFor` for the sixty-year element–animal
 * cycle, `rabjungFor` for the rabjung count that numbers it, and `weekdayNameFor` for the seven-day
 * week. The module is the public face of `names.ts` and `rabjung-names.ts`, which hold the frozen
 * vocabulary itself and stay internal.
 *
 * `yearNameFor` and `rabjungFor` are **closed forms over the year alone** — no lunar arithmetic, no
 * config. They answer for years where evaluating the calendar must refuse (any safe integer), and
 * they cost nothing to call in bulk, which is what a year picker rendering a century does.
 *
 * Those two take the **royal era**, as {@link TibetanDate.year} does, not Janson's *Y*, which is 127
 * lower: Tibetan 2153 is *Y* 2026.
 *
 * @packageDocumentation
 */
// The internals take *Y*; publishing those directly would have put two functions on the surface whose
// year argument silently differed from every neighbour, returning a confident answer about the wrong
// century rather than throwing.

import { rabjungFromRoyalEra, yearNameFromRoyalEra } from "./computation/epoch.js";
import { assertSafeYear, describe, rangeError } from "./errors.js";
import { weekdayNameWithOffset } from "./names.js";
import { PHUGPA } from "./traditions/phugpa.js";
import type { TraditionConfig } from "./traditions/types.js";
import { validatedTradition } from "./traditions/validate.js";
import type { Rabjung, TibetanWeekday, TibetanWeekdayName, TibetanYearName } from "./types.js";

// A safe-integer check and nothing else, deliberately: the naming functions reduce the year modulo
// their cycle before the offset is subtracted (see `yearNameFromRoyalEra`), so every safe integer
// has an exact answer and they need no tradition and no wider bound.
const ROYAL_ERA_HINT =
	". Years here are the royal era, matching TibetanDate.year — 2153, not 2026.";

/**
 * Returns the element–animal name of a Tibetan year.
 *
 * @remarks
 * The sixty-year cycle: five elements, each holding two consecutive years as male then female,
 * against twelve animals. Element and gender repeat every ten years, the animal every twelve, and
 * the whole name every sixty. It needs no calendar, so it answers for every safe integer, where a
 * conversion refuses outside the tradition's exact range.
 *
 * A new object on each call; its `elementName`, `genderName` and `animalName` are frozen and shared.
 *
 * These are **not** the Chinese celestial stems renamed. See {@link TibetanElement}: the Tibetan
 * cycle names the year by element and gender directly, and renders *lcags* as **iron** where the
 * Chinese *wǔxíng* 金 is conventionally metal.
 *
 * @param year - Royal-era year, matching {@link TibetanDate.year}.
 *
 * @throws RangeError with code `TCT_FIELD_OUT_OF_RANGE` if `year` is not a safe integer, a value
 * that is not a number included.
 *
 * @example
 * ```ts
 * yearNameFor(2153);   // { element: "fire", animal: "horse", gender: "male", … }
 *
 * // The animal returns after twelve years, the arithmetic behind the obstacle year (lokek);
 * // the guide gives the custom and its source.
 * yearNameFor(2130 + 12).animal === yearNameFor(2130).animal;   // true
 * ```
 */
export function yearNameFor(year: number): TibetanYearName {
	assertSafeYear("yearNameFor", year, ROYAL_ERA_HINT);
	return yearNameFromRoyalEra(year);
}

/**
 * Returns a Tibetan year's position in the rabjung — the sixty-year cycle counted from 1027 CE.
 *
 * @remarks
 * A **numbering** plus the Tibetan name at that position: `{ cycle, year, tibetanName }`, where
 * `year` runs 1–60 and `cycle` is 0 or below for years before 1027 CE. Distinct from
 * {@link yearNameFor}, which gives the element–animal *name*; the two cycles are both sixty years
 * long and assign a given year different positions, three apart. A closed form over the year, like
 * {@link yearNameFor}, so it answers for every safe integer.
 *
 * @param year - Royal-era year, matching {@link TibetanDate.year}.
 *
 * @throws RangeError with code `TCT_FIELD_OUT_OF_RANGE` if `year` is not a safe integer, a value
 * that is not a number included.
 *
 * @example
 * ```ts
 * rabjungFor(2153).cycle;            // 17
 * rabjungFor(2153).year;             // 40
 * rabjungFor(2153 + 60).cycle;       // 18 — one cycle on, same position
 * rabjungFor(2153 + 60).year;        // 40
 *
 * // The Tibetan name only. The cycle has two Sanskrit name lists and neither ships on this type
 * // — see Rabjung's own docblock, and docs/names/rabjung.md, which tabulates both.
 * rabjungFor(2153).tibetanName.tibetan;     // ཟིལ་གནོན
 * rabjungFor(2153).tibetanName.wylie;       // "zil gnon"
 * ```
 */
export function rabjungFor(year: number): Rabjung {
	assertSafeYear("rabjungFor", year, ROYAL_ERA_HINT);
	return rabjungFromRoyalEra(year);
}

/**
 * Returns the Tibetan name of a weekday, for a tradition.
 *
 * @remarks
 * Takes the config because **Bhutan names its weekdays one planet ahead of Tibet**: day 0 is
 * *spen pa* in Tibet and *nyi ma* in Bhutan, under `BHUTAN` and `BHUTAN_HENNING`, and *spen pa*
 * under `PHUGPA` and `PHUGPA_HENNING`. The whole weekday moves, so the result's `planet` and
 * `element` are the shifted weekday's too. The vocabulary of elements, genders and animals is shared
 * by every version.
 *
 * For a weekday name in a Western language, use `Intl` on the date's `isoDate` instead — this
 * package ships the Tibetan name and no translations. See the README's Internationalisation
 * section.
 *
 * ## The parameter is branded, and `date.dayOfWeek` does not compile
 *
 * The two numberings differ — ISO runs 1 = Monday through 7 = Sunday, Tibetan 0 = Saturday
 * through 6 = Friday — and both are fields on {@link TibetanDate}. {@link TibetanWeekday} makes
 * `weekdayNameFor(date.dayOfWeek)` a compile error; from JavaScript it returns the wrong name on six
 * days of seven and throws on ISO Sunday (7), under every config. Pass
 * {@link TibetanDate.tibetanWeekday} or {@link tibetanWeekday}, both of which are already branded,
 * or {@link asTibetanWeekday} for a number from outside this package.
 *
 * The range is checked at runtime as well, since types erase.
 *
 * @param weekday - Tibetan weekday, **0 = Saturday through 6 = Friday**. This is
 * {@link TibetanDate.tibetanWeekday}, not the ISO `dayOfWeek`.
 * @param tradition - Tradition; defaults to Phugpa. `null` is refused, not defaulted.
 *
 * @throws RangeError with code `TCT_FIELD_OUT_OF_RANGE` if `weekday` is not an integer in 0–6, a
 * value that is not a number included; `TCT_INVALID_TRADITION_CONFIG` if `tradition` is not a valid
 * config. The weekday is checked first.
 *
 * @example
 * ```ts
 * weekdayNameFor(asTibetanWeekday(0)).wylie;    // 'spen pa'
 * weekdayNameFor(asTibetanWeekday(0)).planet;   // 'saturn'
 *
 * const date = isoToTibetan(Temporal.PlainDate.from("2027-01-15"));
 * weekdayNameFor(date.tibetanWeekday).wylie;    // already branded, no conversion
 * ```
 */
export function weekdayNameFor(
	weekday: TibetanWeekday,
	tradition: TraditionConfig = PHUGPA,
): TibetanWeekdayName {
	if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
		throw rangeError(
			"TCT_FIELD_OUT_OF_RANGE",
			`weekdayNameFor: weekday must be an integer in 0…6, received ${describe(weekday)}. ` +
				"This is the Tibetan numbering — 0 is Saturday — not the ISO dayOfWeek",
		);
	}
	tradition = validatedTradition(tradition);
	return weekdayNameWithOffset(weekday, tradition.naming?.weekdayOffset ?? 0);
}
