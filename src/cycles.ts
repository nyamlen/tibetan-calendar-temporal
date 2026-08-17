/**
 * The cyclic names of Tibetan time, and the public way to reach them.
 *
 * @remarks
 * Every export here names a position in a cycle: the sixty-year element–animal cycle and the
 * rabjung count that numbers it, the seven-day week, and the five elements, two genders and twelve
 * animals the year name is built from. The module is the public face of `names.ts`, which holds the
 * frozen vocabulary itself and stays internal.
 *
 * `yearNameFor` and `rabjungFor` are **closed forms over the year alone** — three modulos, no lunar
 * arithmetic, no config. That is what makes them worth exporting rather than reachable: they answer
 * for years where evaluating the calendar must refuse, and they cost nothing to call in bulk, which
 * is what a year picker rendering a century does.
 *
 * Those two take the **royal era**, like every other public function here, not Janson's *Y*. The
 * internals take *Y*, which is 127 lower; publishing those directly would have put two functions on
 * the surface whose year argument silently differed from every neighbour, returning a confident
 * answer about the wrong century rather than throwing.
 *
 * @packageDocumentation
 */

import { rabjungFromYear, yearFromRoyalEra, yearNameFromYear } from "./computation/epoch.js";
import { rangeError } from "./errors.js";
import { animalNameOf, elementNameOf, genderNameOf, weekdayNameOf } from "./names.js";
import { PHUGPA } from "./traditions/phugpa.js";
import type { TraditionConfig } from "./traditions/types.js";
import { assertTraditionConfig } from "./traditions/validate.js";
import type {
	Rabjung,
	TibetanAnimal,
	TibetanElement,
	TibetanGender,
	TibetanName,
	TibetanWeekdayName,
	TibetanYearName,
} from "./types.js";

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

/**
 * The Tibetan name of a weekday, for a tradition.
 *
 * @remarks
 * Takes the config because **Bhutan names its weekdays one planet ahead of Tibet**: day 0 is
 * *spen pa* in Tibet and *nyi ma* in Bhutan. The three lookups below take none, because element,
 * gender and animal vocabulary is shared by every version.
 *
 * For a weekday name in a Western language, use `Intl` on the date's `isoDate` instead — this
 * package ships the Tibetan name and no translations. See the README's Internationalisation
 * section.
 *
 * @param weekday - Tibetan weekday, **0 = Saturday through 6 = Friday**. This is
 * `TibetanDate.tibetanWeekday`, not the ISO `dayOfWeek`.
 * @param config - Tradition; defaults to Phugpa.
 *
 * @throws RangeError with code `TCT_FIELD_OUT_OF_RANGE` if `weekday` is not an integer in 0–6.
 *
 * @example
 * ```ts
 * weekdayNameFor(0).wylie;    // 'spen pa'
 * weekdayNameFor(0).planet;   // 'saturn'
 * ```
 */
export function weekdayNameFor(
	weekday: number,
	config: TraditionConfig = PHUGPA,
): TibetanWeekdayName {
	if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
		throw rangeError(
			"TCT_FIELD_OUT_OF_RANGE",
			`weekdayNameFor: weekday must be an integer in 0…6, received ${weekday}. ` +
				"This is the Tibetan numbering — 0 is Saturday — not the ISO dayOfWeek",
		);
	}
	assertTraditionConfig(config);
	return weekdayNameOf(weekday, config.naming?.weekdayOffset ?? 0);
}

/** The Tibetan name of one of the five elements. */
export function elementNameFor(element: TibetanElement): TibetanName {
	return requireName(elementNameOf(element), "elementNameFor", element);
}

/** The Tibetan name of a year's gender. */
export function genderNameFor(gender: TibetanGender): TibetanName {
	return requireName(genderNameOf(gender), "genderNameFor", gender);
}

/** The Tibetan name of one of the twelve animals. */
export function animalNameFor(animal: TibetanAnimal): TibetanName {
	return requireName(animalNameOf(animal), "animalNameFor", animal);
}

/**
 * Rejects a member that is not in the union.
 *
 * @remarks
 * The unions are the package's i18n contract — a consumer's message catalogue keys off them — so a
 * caller reaching here with `"Fire"` or `"rooster"` has a real bug that a silent `undefined` would
 * hide until it surfaced as a missing translation.
 *
 * `TCT_INVALID_ARGUMENT`, not `TCT_FIELD_OUT_OF_RANGE`, and the distinction is the one
 * `docs/decisions/2026-08-15-argument-errors-split.md` draws: a month of `13` is bad data worth
 * surfacing to whoever typed it, while `"Fire"` is a bug in the calling code, exactly like the
 * string outside `parseTibetanDate`'s grammar that the record already assigns this code. Nobody
 * types an element name into a form — these members are written by the consumer's own source.
 */
function requireName(name: TibetanName | undefined, subject: string, member: string): TibetanName {
	if (name === undefined) {
		throw rangeError(
			"TCT_INVALID_ARGUMENT",
			`${subject}: unknown member ${JSON.stringify(member)}`,
		);
	}
	return name;
}
