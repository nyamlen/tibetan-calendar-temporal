/**
 * The attributes a *month* carries: an animal, a gender, an element, and — in one tradition only —
 * a number.
 *
 * @remarks
 * **This is where the traditions genuinely fork**, and they fork on the *rules* rather than on
 * constants. Phugpa's month 1 is Dragon and Tsurphu's is Tiger; Phugpa restarts its element run from
 * the year's element every year while Tsurphu lets one cycle run on for ever; only Tsurphu numbers
 * its months at all. So every function here reads `config.naming.monthAnimals`, and **refuses** when a
 * tradition has no such block — which is the Bhutanese case, where Janson tabulates no month-animal
 * list and a Phugpa answer would be a confident invention.
 *
 * A **leap month takes the same attributes as the regular month sharing its number**, which Janson
 * states outright. Nothing here takes an `isLeapMonth` flag, therefore, and that is the reason.
 *
 * @packageDocumentation
 */

import { amod, ceilDiv, floorDiv } from "../computation/arithmetic.js";
import { assertInternal, rangeError } from "../errors.js";
import { monthsAfterTigerMonth } from "../month-names.js";
import { animalNameOf, elementNameOf, genderNameOf } from "../names.js";
import type { TraditionConfig, TraditionMonthAnimals } from "../traditions/types.js";
import type { TibetanAnimal, TibetanElement, TibetanGender, TibetanName } from "../types.js";

/** Janson's standard element order, his Table 5. One-based when indexed as he indexes it. */
const ELEMENTS: readonly TibetanElement[] = ["wood", "fire", "earth", "iron", "water"];

/** Janson's standard animal order, his twelve-animal table. Tiger is number 3. */
const ANIMALS: readonly TibetanAnimal[] = [
	"mouse",
	"ox",
	"tiger",
	"rabbit",
	"dragon",
	"snake",
	"horse",
	"sheep",
	"monkey",
	"bird",
	"dog",
	"pig",
];

/** Tiger's position in the twelve-animal cycle, which anchors both month rules. */
const TIGER = 3;

const at = <T>(table: readonly T[], oneBased: number, what: string): T =>
	assertInternal(table[oneBased - 1], `${what}: index ${oneBased} is outside the cycle`);

/** What a calendar month carries in the Chinese system. */
export interface MonthAttributes {
	/** The month's animal. Phugpa's month 1 is Dragon; Tsurphu's is Tiger. */
	animal: TibetanAnimal;
	/** Male for odd-numbered months, female for even. The same in every tradition. */
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
 * The refusal for a tradition with no month-animal block.
 *
 * @throws RangeError with code `TCT_ATTRIBUTE_NOT_SOURCED`, always.
 */
function unsourced(config: TraditionConfig): never {
	throw rangeError(
		"TCT_ATTRIBUTE_NOT_SOURCED",
		`${config.name} has no sourced month attributes: Janson gives no month-animal list for ` +
			"this version, and the element and number rules follow from that list. Nothing about the " +
			"date you asked about is wrong — the attribute simply has no source. Year and " +
			"calendar-day attributes do not depend on the month-animal list and still answer",
	);
}

/**
 * The month-animal block, or a refusal naming the tradition that lacks one.
 *
 * @throws RangeError with code `TCT_ATTRIBUTE_NOT_SOURCED` if the tradition has no sourced month
 * attributes — the Bhutanese configs, today.
 */
function monthAnimals(config: TraditionConfig): TraditionMonthAnimals {
	const animals = config.naming?.monthAnimals;
	return animals === undefined ? unsourced(config) : animals;
}

/**
 * The month's animal as Janson numbers it, 1 (Mouse) to 12 (Pig).
 *
 * @remarks
 * Internal, and shared with the lunar-day attributes, whose trigram and number are both functions of
 * this number rather than of the month. One definition, so the two cannot drift apart — and it reads
 * the Tiger month through `monthsAfterTigerMonth`, which the root's `monthNamesFor` uses too.
 *
 * @throws RangeError with code `TCT_ATTRIBUTE_NOT_SOURCED` if the tradition has no sourced month
 * attributes.
 */
export function monthAnimalNumber(config: TraditionConfig, month: number): number {
	const steps = monthsAfterTigerMonth(config, month);
	return amod((steps === null ? unsourced(config) : steps) + TIGER, 12);
}

/**
 * The month's element as Janson numbers it, 1 (wood) to 5 (water).
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
 * the `M ≥ tigerMonth` arm and `⌊(M+1)/2⌋` for the other, in that order; with `tigerMonth = 1` the third is his Tsurphu formula exactly, `⌊(M−1)/2⌋`. **The
 * two-arm split is not a year-boundary special case** — it is that Phugpa's Tiger month is month 11
 * of the *preceding* Gregorian year, so months 1–10 belong to a run that started last year and
 * months 11–12 open the next one.
 *
 * `⌈Y/2⌉` is the son of year `Y + 1`'s power element: the power element is `⌈(Y−3)/2⌉`, so its
 * successor is `⌈(Y−1)/2⌉`, and the run opening in year `Y` is labelled for year `Y + 1`.
 *
 * Only `tigerMonth` values of 1 and 11 are attested. The continuous arm is stated by Janson for the
 * version whose Tiger month is month 1; written against the Tiger month it degenerates correctly
 * there, and no shipped config combines `"continuous"` with any other Tiger month.
 *
 * @throws RangeError with code `TCT_ATTRIBUTE_NOT_SOURCED` if the tradition has no sourced month
 * attributes.
 */
export function monthElementNumber(config: TraditionConfig, year: number, month: number): number {
	const { tigerMonth, elementRule } = monthAnimals(config);
	const stepsFromTiger = (offset: number) => floorDiv(month - tigerMonth + offset, 2);

	if (elementRule === "continuous") return amod(year - 2 + stepsFromTiger(0), 5);

	return month >= tigerMonth
		? amod(ceilDiv(year, 2) + stepsFromTiger(0), 5)
		: amod(ceilDiv(year - 1, 2) + stepsFromTiger(12), 5);
}

/**
 * Every attribute of month `month` in the Tibetan year beginning in Gregorian year `year`.
 *
 * @remarks
 * `year` is Janson's `Y` — the Gregorian year the Tibetan year begins in, not the royal era. The
 * public surface converts first, as `yearNameFor` does.
 *
 * The gender needs no tradition: both versions assign each month the gender of its animal, and
 * because the two animal lists are an even number of steps apart this always comes to "odd months
 * male, even months female" — which is also the general Chinese principle that odd numbers are
 * *yang*.
 *
 * @example
 * ```ts
 * // Phugpa, whose Tiger month is month 11. Month 1 of the Fire Horse year beginning in 2026 —
 * // iron, because the run opened with earth in month 11 of 2025, the son of that year's fire.
 * monthAttributes(PHUGPA, 2026, 1);
 * // { animal: "dragon", gender: "male", element: "iron", number: null }
 * ```
 *
 * @throws RangeError with code `TCT_ATTRIBUTE_NOT_SOURCED` if the tradition has no sourced month
 * attributes. Never a silent fallback to Phugpa's.
 */
export function monthAttributes(
	config: TraditionConfig,
	year: number,
	month: number,
): MonthAttributes {
	const numbered = config.naming?.nineNumbers?.months === "descending";
	const animal = at(ANIMALS, monthAnimalNumber(config, month), "month animal");
	const gender: TibetanGender = month % 2 === 1 ? "male" : "female";
	const element = at(ELEMENTS, monthElementNumber(config, year, month), "month element");

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
