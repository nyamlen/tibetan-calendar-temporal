/**
 * The attributes a *month* carries: an animal, a gender, an element, and — in one tradition only —
 * a number.
 *
 * @remarks
 * **This is where the traditions genuinely fork**, and they fork on the *rules* rather than on
 * constants. Phugpa's month 1 is Dragon and Tsurphu's is Tiger; Phugpa restarts its element run from
 * the year's element every year while Tsurphu lets one cycle run on for ever; only Tsurphu numbers
 * its months at all. So every function here reads `tradition.naming.monthAnimals`, and **refuses** when a
 * tradition has no such block — which is the Bhutanese case, where Janson tabulates no month-animal
 * list and a Phugpa answer would be a confident invention.
 *
 * A **leap month takes the same attributes as the regular month sharing its number**, which Janson
 * states outright. Nothing here takes an `isLeapMonth` flag, therefore, and that is the reason.
 *
 * @packageDocumentation
 */

import { amod, ceilDiv, floorDiv } from "../computation/arithmetic.js";
import { ANIMALS, ELEMENTS, oneBasedAt } from "../cycle-tables.js";
import { assertInternal, rangeError } from "../errors.js";
import { monthsAfterTigerMonth } from "../month-names.js";
import { animalNameOf, elementNameOf, genderNameOf } from "../names.js";
import type { TraditionConfig, TraditionMonthAnimals } from "../traditions/types.js";
import type { TibetanAnimal, TibetanElement, TibetanGender, TibetanName } from "../types.js";

/** Tiger's position in the twelve-animal cycle, which anchors both month rules. */
const TIGER = 3;

/** What a calendar month carries in the Chinese system. */
export interface MonthAttributes {
	/** The month's animal. Phugpa's month 1 is Dragon; Tsurphu's is Tiger. */
	animal: TibetanAnimal;
	/**
	 * The gender of the month's animal: male for odd-numbered months, female for even, in every
	 * attested tradition.
	 */
	gender: TibetanGender;
	/** The month's element, two months to each in Janson's standard order. */
	element: TibetanElement;
	/**
	 * One of the nine numbers, or `null` where the tradition does not number its months.
	 *
	 * @remarks
	 * `null` for Phugpa, and that is a **sourced** answer rather than a gap: Janson states that only
	 * Tsurphu calendars carry it. A tradition whose month attributes are unsourced altogether throws
	 * instead of reporting nulls.
	 */
	number: number | null;
	/** The Tibetan name of every labelled attribute above, keyed by the field it names. */
	tibetanNames: {
		animal: TibetanName;
		gender: TibetanName;
		element: TibetanName;
	};
}

/**
 * Refuses for a tradition with no month-animal block.
 *
 * @throws RangeError with code `TCT_ATTRIBUTE_NOT_SOURCED`, always.
 */
function unsourced(tradition: TraditionConfig): never {
	throw rangeError(
		"TCT_ATTRIBUTE_NOT_SOURCED",
		`${tradition.name} has no sourced month attributes: Janson gives no month-animal list for ` +
			"this version, and the element and number rules follow from that list. Nothing about the " +
			"date you asked about is wrong — the attribute simply has no source. Year and " +
			"calendar-day attributes do not depend on the month-animal list and still answer",
	);
}

/**
 * Whether the tradition's month attributes are sourced: whether it carries a month-animal block.
 *
 * @remarks
 * The one test both refusals here and `attributesFor`'s `null` read, so the two cannot disagree.
 */
export function monthAttributesAreSourced(tradition: TraditionConfig): boolean {
	return tradition.naming?.monthAnimals !== undefined;
}

/**
 * Returns the month-animal block, or refuses naming the tradition that lacks one.
 *
 * @throws RangeError with code `TCT_ATTRIBUTE_NOT_SOURCED` if the tradition has no sourced month
 * attributes — the Bhutanese configs, today.
 */
function monthAnimals(tradition: TraditionConfig): TraditionMonthAnimals {
	if (!monthAttributesAreSourced(tradition)) unsourced(tradition);
	return assertInternal(
		tradition.naming?.monthAnimals,
		"a sourced tradition has naming.monthAnimals",
	);
}

/**
 * Returns the month's animal as Janson numbers it, 1 (Mouse) to 12 (Pig).
 *
 * @remarks
 * Shared with the lunar-day attributes, whose trigram and number are both functions of this number
 * rather than of the month.
 *
 * @throws RangeError with code `TCT_ATTRIBUTE_NOT_SOURCED` if the tradition has no sourced month
 * attributes.
 */
// One definition, so the month and lunar-day attributes cannot drift apart, and it reads the Tiger
// month through `monthsAfterTigerMonth`, which the root's `monthNamesFor` uses too.
export function monthAnimalNumber(tradition: TraditionConfig, month: number): number {
	if (!monthAttributesAreSourced(tradition)) unsourced(tradition);
	const steps = monthsAfterTigerMonth(tradition, month) ?? undefined;
	return amod(assertInternal(steps, "a sourced tradition has a Tiger month") + TIGER, 12);
}

/**
 * Returns the month's element as Janson numbers it, 1 (wood) to 5 (water).
 *
 * @remarks
 * Janson gives one formula per version. Written here with the Tiger month as a parameter, since that
 * is the one fact the two arms differ on:
 *
 * ```text
 * son-of-year   M ≥ tigerMonth:  (⌈Y/2⌉     + ⌊(M − tigerMonth)/2⌋)      amod 5
 *               M < tigerMonth:  (⌈(Y−1)/2⌉ + ⌊(M + 12 − tigerMonth)/2⌋) amod 5
 * continuous                     (Y − 2     + ⌊(M − tigerMonth)/2⌋)      amod 5
 * ```
 *
 * With `tigerMonth = 11` the first two lines are Janson's Phugpa formula exactly — `⌊(M−11)/2⌋` for
 * the `M ≥ tigerMonth` arm and `⌊(M+1)/2⌋` for the other, in that order. With `tigerMonth = 1` the
 * third is his Tsurphu formula exactly, `⌊(M−1)/2⌋`.
 *
 * Only `tigerMonth` values of 1 and 11 are attested. The continuous arm is stated by Janson for the
 * version whose Tiger month is month 1; written against the Tiger month it degenerates correctly
 * there, and no shipped config combines `"continuous"` with any other Tiger month.
 *
 * @throws RangeError with code `TCT_ATTRIBUTE_NOT_SOURCED` if the tradition has no sourced month
 * attributes.
 */
export function monthElementNumber(
	tradition: TraditionConfig,
	year: number,
	month: number,
): number {
	const { elementRule } = monthAnimals(tradition);
	// The Tiger month is read only through `monthsAfterTigerMonth`, the definition the month animal
	// and `monthNamesFor` share. `steps` is `mod(month − tigerMonth, 12)`, so it is `month − tigerMonth`
	// exactly when `month ≥ tigerMonth` — which `steps < month` decides — and `month + 12 − tigerMonth`
	// otherwise.
	const steps = assertInternal(
		monthsAfterTigerMonth(tradition, month) ?? undefined,
		"a sourced tradition has a Tiger month",
	);
	const opensThisYear = steps < month;

	// The two-arm split is not a year-boundary special case. Phugpa's Tiger month is month 11 of the
	// *preceding* Gregorian year, so months 1–10 belong to a run that started last year and months
	// 11–12 open the next one.
	//
	// The year's power element is `⌈(Y−3)/2⌉`. The son of year `Y`'s is `⌈(Y−1)/2⌉`, which starts
	// the run that opened in month 11 of the year before; the son of year `Y + 1`'s is `⌈Y/2⌉`,
	// which starts the run opening in month 11 of year `Y`.
	//
	// The continuous arm's `⌊(M − tigerMonth)/2⌋` is `⌊steps/2⌋ − 6` before the Tiger month, where
	// `M − tigerMonth = steps − 12`; written so, it gives the same answer for every Tiger month.
	if (elementRule === "continuous") {
		return amod(year - 2 + floorDiv(steps, 2) - (opensThisYear ? 0 : 6), 5);
	}
	return amod((opensThisYear ? ceilDiv(year, 2) : ceilDiv(year - 1, 2)) + floorDiv(steps, 2), 5);
}

/**
 * Returns every attribute of month `month` in the Tibetan year beginning in Gregorian year `year`.
 *
 * @remarks
 * `year` is Janson's `Y` — the Gregorian year the Tibetan year begins in, not the royal era. The
 * public surface converts first, as `yearNameFor` does.
 *
 * The gender is the gender of the month's animal, as Janson states it, and an odd animal number is
 * male. For both attested Tiger months, 11 and 1, that comes to "odd months male, even months
 * female" — the general Chinese principle that odd numbers are *yang* — but it is computed from the
 * animal, so a config with an even Tiger month still gives each month its own animal's gender.
 *
 * @example
 * ```ts
 * // Phugpa, whose Tiger month is month 11. Month 1 of the Fire Horse year beginning in 2026 —
 * // iron, because the run opened with earth in month 11 of 2025, the son of 2026's fire.
 * monthAttributes(PHUGPA, 2026, 1);
 * // { animal: "dragon", gender: "male", element: "iron", number: null }
 * ```
 *
 * @throws RangeError with code `TCT_ATTRIBUTE_NOT_SOURCED` if the tradition has no sourced month
 * attributes. Never a silent fallback to Phugpa's.
 */
export function monthAttributes(
	tradition: TraditionConfig,
	year: number,
	month: number,
): MonthAttributes {
	const numbered = tradition.naming?.nineNumbers?.months === "descending";
	const animalNumber = monthAnimalNumber(tradition, month);
	const animal = oneBasedAt(ANIMALS, animalNumber, "month animal");
	// Janson: each month takes the gender of its animal, and odd animal numbers are male. "Odd months
	// are male" is his shortcut for the attested Tiger months, 11 and 1, both odd.
	const gender: TibetanGender = animalNumber % 2 === 1 ? "male" : "female";
	const element = oneBasedAt(ELEMENTS, monthElementNumber(tradition, year, month), "month element");

	return {
		animal,
		gender,
		element,
		// Janson: the number decreases by 1 each month, and so by 12 ≡ 3 (mod 9) each year.
		//
		// **The `3` is an absolute phase, and it is the one value here not derived from `tigerMonth`.**
		// Janson states the formula for the version that numbers its months — Tsurphu, whose Tiger month
		// is month 1 — so the anchor is attested for `tigerMonth: 1` and unverified for any other. No
		// exported config numbers its months, so nothing reaches it today; the tests check the −1 a
		// month and −3 a year steps, which hold at any phase, and **no source checks the phase itself**.
		// The formula never reads the Tiger month, which is why `nineNumbers` is a member of its own;
		// but if a config ever pairs `"descending"` with a different Tiger month, find a source for the
		// phase rather than trusting this literal.
		number: numbered ? amod(3 - (12 * year + month), 9) : null,
		tibetanNames: {
			animal: animalNameOf(animal),
			gender: genderNameOf(gender),
			element: elementNameOf(element),
		},
	};
}
