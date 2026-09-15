/**
 * The attributes a *year* carries: five elements and three numbers.
 *
 * @remarks
 * A year's name gives one element — Fire Horse — and that is only the **power** element. Four more
 * sit behind it, each on its own cycle, and they routinely disagree with the name and with each
 * other. Janson's Appendix E derives all five in closed form.
 *
 * **Nothing here takes a `TraditionConfig`.** Every formula is a function of the Gregorian year
 * alone, so the answers are the same in every tradition — which is why these can be asked for years
 * where evaluating the calendar itself must refuse.
 *
 * @packageDocumentation
 */

import { amod, ceilDiv, mod } from "../computation/arithmetic.js";
import { assertInternal } from "../errors.js";
import { animalNameOf, elementNameOf } from "../names.js";
import type { TibetanAnimal, TibetanElement, TibetanName } from "../types.js";

/**
 * The five elements in Janson's standard order — his Table 5, and the order every cycle here runs
 * in. `TibetanElement`'s declaration order is the same, deliberately.
 */
const ELEMENTS: readonly TibetanElement[] = ["wood", "fire", "earth", "iron", "water"];

/** The twelve animals in Janson's standard order, matching `TibetanAnimal`'s declaration. */
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
 * Life element by position in the twelve-year cycle — Janson's Table of life elements.
 *
 * @remarks
 * The one table here that is transcribed rather than derived. Janson describes its shape in prose —
 * every third year is earth, the remaining four repeat two years each in cyclic order — but the
 * phase is not stated in a form that yields a closed expression, so twelve values are written out.
 * `test/validation/janson-attributes.test.ts` holds them against the generated fixture, which is
 * what makes the transcription checkable rather than trusted.
 */
const LIFE_BY_POSITION: readonly TibetanElement[] = [
	"water", // mouse
	"earth", // ox
	"wood", // tiger
	"wood", // rabbit
	"earth", // dragon
	"fire", // snake
	"fire", // horse
	"earth", // sheep
	"iron", // monkey
	"iron", // bird
	"earth", // dog
	"water", // pig
];

/** Fortune element on its four-year cycle. Earth never appears, which Janson states explicitly. */
const FORTUNE_BY_POSITION: readonly TibetanElement[] = ["wood", "water", "iron", "fire"];

/**
 * The intermediate element Janson calls `x`, on a six-year cycle, used only for the body element.
 *
 * @remarks
 * He gives it no name — "I do not know any name for this intermediate element" — and it exists only
 * to be subtracted from the power element.
 */
const BODY_INTERMEDIATE: readonly TibetanElement[] = [
	"wood",
	"wood",
	"water",
	"water",
	"iron",
	"iron",
];

/** Body element by `y − x mod 5`, Janson's final step. Note this is **not** the standard order. */
const BODY_BY_DIFFERENCE: readonly TibetanElement[] = ["iron", "water", "fire", "earth", "wood"];

/** The five elements a year carries, and the three numbers that go with them. */
export interface YearAttributes {
	/** Position in the Chinese sixty-year cycle, 1–60. */
	cyclePosition: number;
	/** The year's animal. */
	animal: TibetanAnimal;
	/** Power element *dbang thang* — the one that appears in the year's name. */
	power: TibetanElement;
	/** Life element *srog*, fixed by the animal. */
	life: TibetanElement;
	/** Body element *lus*, on a thirty-year cycle. */
	body: TibetanElement;
	/** Fortune element *klung rta*; earth never appears. */
	fortune: TibetanElement;
	/** Spirit element *bla*, the element preceding the life element. */
	spirit: TibetanElement;
	/** Central number, also called the body or birth number, 1–9. */
	central: number;
	/** Life number, 1–9. */
	lifeNumber: number;
	/** Power number, 1–9. */
	powerNumber: number;
	/** The Tibetan name of every labelled attribute above, keyed by the field it names. */
	tibetanNames: {
		animal: TibetanName;
		power: TibetanName;
		life: TibetanName;
		body: TibetanName;
		fortune: TibetanName;
		spirit: TibetanName;
	};
}

const at = <T>(table: readonly T[], oneBased: number, what: string): T =>
	assertInternal(table[oneBased - 1], `${what}: index ${oneBased} is outside the cycle`);

/**
 * Every attribute of the Gregorian year `year`.
 *
 * @remarks
 * Janson's `Y`. The year is the **Gregorian** year the Tibetan year begins in, not the royal era —
 * callers on the public surface convert first, as `yearNameFor` does.
 *
 * **The elements repeat every 60 years and the numbers every 9, so the whole set only returns after
 * 180.** A sweep over one sixty-year cycle will look exhaustive and prove nothing about the
 * numbers.
 */
export function yearAttributes(year: number): YearAttributes {
	// Janson: year Y sits at (Y − 3) amod 60 in the Chinese cycle.
	const cyclePosition = amod(year - 3, 60);

	// ⌈(Y − 3)/2⌉ amod 5 — the celestial stem's element, two years to each.
	const power = at(ELEMENTS, amod(ceilDiv(year - 3, 2), 5), "power element");
	const animal = at(ANIMALS, amod(cyclePosition, 12), "animal");
	const life = at(LIFE_BY_POSITION, amod(cyclePosition, 12), "life element");

	// The element *preceding* the life element in the standard order, wrapping.
	const spirit = at(ELEMENTS, amod(ELEMENTS.indexOf(life), 5), "spirit element");

	const fortune = at(FORTUNE_BY_POSITION, amod(cyclePosition, 4), "fortune element");

	// Body: count the steps from the intermediate element x to the power element y.
	//
	// `mod`, not `amod`. Janson indexes this final table from **zero** — `y − x mod 5` where 0 means
	// iron — while every other cycle here is one-based. Using amod sends the zero case to the far
	// end of the table and returns wood, which is a plausible element and the wrong one.
	const intermediate = at(BODY_INTERMEDIATE, amod(cyclePosition, 6), "body intermediate");
	const difference = mod(ELEMENTS.indexOf(power) - ELEMENTS.indexOf(intermediate), 5);
	const body = at(BODY_BY_DIFFERENCE, difference + 1, "body element");

	return {
		cyclePosition,
		animal,
		power,
		life,
		body,
		fortune,
		spirit,
		central: amod(2 - year, 9),
		lifeNumber: amod(8 - year, 9),
		powerNumber: amod(5 - year, 9),
		tibetanNames: {
			animal: animalNameOf(animal),
			power: elementNameOf(power),
			life: elementNameOf(life),
			body: elementNameOf(body),
			fortune: elementNameOf(fortune),
			spirit: elementNameOf(spirit),
		},
	};
}
