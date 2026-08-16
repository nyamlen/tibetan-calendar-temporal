/**
 * Year numbering and naming, from Janson §4.
 *
 * @remarks
 * Three independent systems name the same Tibetan year, and this module keeps them apart:
 *
 * 1. **Janson's *Y*** — the Gregorian year the Tibetan year begins in. Every formula in the
 *    paper and every function under `computation/` is written in terms of *Y*.
 * 2. **The royal era** — *Y* + 127, the number almanacs print. Applied only at the public
 *    boundary; see {@link royalEraFromYear}.
 * 3. **The two 60-year cycles** — the Indian rabjung, which is a *numbering*
 *    ({@link rabjungFromYear}), and the Chinese element–animal, which is a *name*
 *    ({@link yearNameFromYear}). They assign a year different positions, three apart.
 *
 * None of these is tradition-dependent: Phugpa and Tsurphu number and name **years** identically,
 * so nothing here takes a `TraditionConfig`.
 *
 * That is a claim about years specifically, and it does not extend to naming in general. **Weekday
 * naming is tradition-dependent** — Bhutan names its days one planet ahead — which is why
 * `weekdayName` is built in `conversion.ts`, where the config is in hand, rather than here. Month
 * naming will be too, if it is ever added.
 *
 * @packageDocumentation
 */

import { animalNameOf, elementNameOf, genderNameOf } from "../names.js";
import type { Rabjung, TibetanAnimal, TibetanElement, TibetanYearName } from "../types.js";
import { amod, ceilDiv } from "./arithmetic.js";

/**
 * The five elements in the order of Janson's ten-year cycle table (§4), indexed from 1.
 *
 * @remarks
 * Each occupies two consecutive years of the ten-year cycle, male then female.
 */
const ELEMENTS: readonly TibetanElement[] = ["wood", "fire", "earth", "iron", "water"];

/** The twelve animals in the order of Janson's twelve-year cycle table (§4), indexed from 1. */
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

/**
 * Offset between the royal-era numbering and Janson's *Y*.
 *
 * @remarks
 * The traditional ascent of the first Tibetan king, 127 BC. Janson §4 records that this
 * numbering has been used only since the second half of the twentieth century, and that epochs
 * of 255 and 1027 have also been used — so for historical dates it is a modern label applied
 * backwards.
 */
const ROYAL_ERA_OFFSET = 127;

/** Year in which the first rabjung cycle began, and hence the origin of the cycle numbering. */
const FIRST_RABJUNG_YEAR = 1027;

/**
 * Offset of the Chinese cycle from the Indian one.
 *
 * @remarks
 * Janson §4: "The cycles start 3 years before the Indian ones, so the first year (Prabhava) in
 * the Indian cycle is the fourth year (Fire–female–Rabbit) in the Chinese cycle." This is why
 * the two cycles cannot share an index.
 */
const CHINESE_CYCLE_ORIGIN = 3;

/**
 * Converts Janson's *Y* to the royal-era year that almanacs print.
 *
 * @param year - Janson's *Y*, the Gregorian year the Tibetan year begins in.
 * @returns The royal-era year, counting from the 127 BC epoch.
 *
 * @example
 * ```ts
 * royalEraFromYear(2026); // 2153
 * ```
 */
export function royalEraFromYear(year: number): number {
	return year + ROYAL_ERA_OFFSET;
}

/**
 * Converts a royal-era year to Janson's *Y*.
 *
 * @remarks
 * The inverse of {@link royalEraFromYear}. This is the only point at which public input is
 * translated into the numbering the computation layer uses.
 */
export function yearFromRoyalEra(royalEraYear: number): number {
	return royalEraYear - ROYAL_ERA_OFFSET;
}

/**
 * Position of a year in the Indian 60-year cycle — the rabjung (*rab byung*).
 *
 * @remarks
 * Janson §4, the rabjung numbering formulas:
 *
 * ```text
 * n = (Y − 1026) amod 60
 * m = ⌈(Y − 1026) / 60⌉
 * ```
 *
 * `amod` rather than `mod` is essential: the 60th year of a cycle would otherwise report as
 * position 0. Both operations are correct for years before 1027, where the argument is
 * negative and the cycle number is zero or below.
 *
 * This is a **numbering**, not a name — see {@link yearNameFromYear} for the name, and note
 * that the position returned here does not index it.
 *
 * @param year - Janson's *Y*.
 *
 * @example
 * ```ts
 * rabjungFromYear(2007); // { cycle: 17, year: 21 } — Janson's worked example
 * ```
 */
export function rabjungFromYear(year: number): Rabjung {
	const elapsed = year - (FIRST_RABJUNG_YEAR - 1);
	return { cycle: ceilDiv(elapsed, 60), year: amod(elapsed, 60) };
}

/**
 * The element–animal–gender name of a year, from the Chinese 60-year cycle.
 *
 * @remarks
 * Janson §4. With `z = (Y − 3) amod 10` the element is `⌈z / 2⌉`, and the animal is
 * `(Y − 3) amod 12`. The gender alternates with the year, so it is the parity of `z`: odd is
 * male, even is female.
 *
 * Because 10 and 12 share a factor of 2, only 30 of the 60 possible element–animal pairs occur,
 * and the full cycle is 60 years rather than 120.
 *
 * @param year - Janson's *Y*.
 *
 * @example
 * ```ts
 * yearNameFromYear(2007).element; // 'fire'
 * yearNameFromYear(2007).animal;  // 'pig'
 * yearNameFromYear(2007).gender;  // 'female'
 * yearNameFromYear(2007).animalName.wylie; // 'phag'
 * ```
 */
export function yearNameFromYear(year: number): TibetanYearName {
	const elapsed = year - CHINESE_CYCLE_ORIGIN;
	const tenYearPosition = amod(elapsed, 10);
	const element = ELEMENTS[ceilDiv(tenYearPosition, 2) - 1];
	const animal = ANIMALS[amod(elapsed, 12) - 1];
	// Both indices are derived from amod results in 1..10 and 1..12, so neither can miss. The
	// assertion exists only to satisfy noUncheckedIndexedAccess without widening the type.
	/* c8 ignore next */
	if (element === undefined || animal === undefined) throw new Error("unreachable");
	const gender = tenYearPosition % 2 === 1 ? "male" : "female";
	return {
		element,
		animal,
		gender,
		elementName: elementNameOf(element),
		genderName: genderNameOf(gender),
		animalName: animalNameOf(animal),
	};
}
