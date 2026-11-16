/**
 * The element and animal orderings Janson's tables index into, and the one reader of them.
 *
 * @remarks
 * Internal. `epoch.ts` and the four year, month, lunar-day and calendar-day modules of
 * `./astrology` share one copy of each ordering, so that a table indexed by his one-based number
 * cannot be read against a different order in one place than in another. A name string is not held
 * here: the vocabulary is `names.ts`.
 */
import { assertInternal } from "./errors.js";
import type { TibetanAnimal, TibetanElement } from "./types.js";

/**
 * The five elements in Janson's standard order, his Table 5, which every cycle here indexes into.
 * One-based when indexed as he indexes it; `TibetanElement`'s declaration order is the same.
 */
export const ELEMENTS: readonly TibetanElement[] = ["wood", "fire", "earth", "iron", "water"];

/**
 * The twelve animals in Janson's standard order, his twelve-animal table, matching
 * `TibetanAnimal`'s declaration. One-based when indexed as he indexes it; tiger is number 3.
 */
export const ANIMALS: readonly TibetanAnimal[] = [
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

/** Reads a table by Janson's one-based number, refusing a number outside it as an internal fault. */
export const oneBasedAt = <T>(table: readonly T[], oneBased: number, what: string): T =>
	assertInternal(table[oneBased - 1], `${what}: index ${oneBased} is outside the cycle`);
