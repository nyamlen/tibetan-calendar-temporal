/**
 * The attributes a *lunar day* carries — the thirtieth of a lunation, not the sunrise-to-sunrise
 * day.
 *
 * @remarks
 * These are the labels an almanac prints against the Tibetan day **number**, and they are a
 * different set from the ones the calendar day carries. A single printed row shows both, and they
 * disagree; that is not a defect to reconcile. See [`docs/astrology.md`](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/astrology.md).
 *
 * Because a lunar day is identified by its `(month, day)` numbers and nothing else, these answer for
 * a **skipped** lunar day as readily as for any other — the day no calendar day carries still has an
 * animal and an element. That is the reason this layer takes fields rather than a date.
 *
 * Three of the four attributes reach back through the month, so all four refuse for a tradition
 * whose month attributes are unsourced. The refusal is deliberately **coarse**: the animal alone is
 * tradition-free — `(D + 6M + 8) amod 12` reads only the two numbers — and could be answered for
 * the Bhutanese configs.
 *
 * @packageDocumentation
 */

// Why the refusal is coarse: relaxing a throw into a return later is a widening and costs nothing,
// while per-field nulls now would tax every Phugpa consumer with three narrowings for ever, for a
// case they never hit, and removing them later would break. The decision is recorded in
// `docs/decisions/2026-09-12-absent-naming-members-refuse.md`, "The refusal is coarse on purpose".

import { amod } from "../computation/arithmetic.js";
import { ANIMALS, ELEMENTS, oneBasedAt } from "../cycle-tables.js";
import { animalNameOf, elementNameOf } from "../names.js";
import type { TraditionConfig } from "../traditions/types.js";
import type { TibetanAnimal, TibetanElement, TibetanName } from "../types.js";
import { type TibetanTrigram, TRIGRAM_NAMES, TRIGRAMS } from "./calendar-day.js";
import { monthAnimalNumber, monthElementNumber } from "./month.js";

/** What a lunar day carries in the Chinese system. */
export interface LunarDayAttributes {
	/** The day's animal, on the twelve-day cycle. */
	animal: TibetanAnimal;
	/** The day's element, cycling inside the month from the one after the month's own. */
	element: TibetanElement;
	/** The day's trigram, on the eight-day cycle. */
	trigram: TibetanTrigram;
	/** The day's number, 1–9. */
	number: number;
	/** The Tibetan name of every labelled attribute above, keyed by the field it names. */
	tibetanNames: {
		animal: TibetanName;
		element: TibetanName;
		trigram: TibetanName;
	};
}

/**
 * Returns every attribute of lunar day `day` of month `month`, in the Tibetan year beginning in
 * Gregorian year `year`.
 *
 * @remarks
 * Janson gives each as a congruence, with `A` the month's animal number and `x` its element number:
 *
 * ```text
 * animal   (D + 6M + 8) amod 12      element  (x + D) amod 5
 * trigram  (D + 6A + 6) amod 8       number   (D + 3A) amod 9
 * ```
 *
 * Three of them are continuous across ordinary month boundaries — each thirty-day month advances the
 * twelve-cycle by 6, the eight-cycle by 6 and the nine-cycle by 3 — while the **element restarts
 * inside every month**, from the one following the month's own, so it alone jumps at a new month.
 *
 * **Leap months are handled by the month number, not by a flag.** Janson: the animals repeat in the
 * same order in the leap month and the following regular month, with a discontinuity between the two.
 * A leap month shares its number with its regular twin, so these formulas give the pair identical
 * labels — which is exactly the stated rule for a tradition whose leap month *precedes* the regular
 * one. It is not the rule for a tradition whose leap month follows, and that is one of the two
 * reasons the Bhutanese configs refuse here rather than returning something plausible.
 *
 * @example
 * ```ts
 * // Phugpa. Day 1 of month 1 of the year beginning in 2026 — a Dragon month of iron. Tiger,
 * // because every odd month opens on Tiger; water as the element after the month's iron; and
 * // water (Janson's Kham) and 7, which are what he says a Dragon month opens with.
 * const day = lunarDayAttributes(PHUGPA, 2026, 1, 1);
 * // { animal: "tiger", element: "water", trigram: "water", number: 7, tibetanNames: { … } }
 * day.tibetanNames.trigram.wylie; // "kham"
 * ```
 *
 * @throws RangeError with code `TCT_ATTRIBUTE_NOT_SOURCED` if the tradition has no sourced month
 * attributes, since three of the four reach back through the month.
 */
export function lunarDayAttributes(
	tradition: TraditionConfig,
	year: number,
	month: number,
	day: number,
): LunarDayAttributes {
	const animalNumber = monthAnimalNumber(tradition, month);
	const elementNumber = monthElementNumber(tradition, year, month);

	const animal = oneBasedAt(ANIMALS, amod(day + 6 * month + 8, 12), "lunar-day animal");
	const element = oneBasedAt(ELEMENTS, amod(elementNumber + day, 5), "lunar-day element");
	const trigram: TibetanTrigram = oneBasedAt(
		TRIGRAMS,
		amod(day + 6 * animalNumber + 6, 8),
		"lunar-day trigram",
	);

	return {
		animal,
		element,
		trigram,
		number: amod(day + 3 * animalNumber, 9),
		tibetanNames: {
			animal: animalNameOf(animal),
			element: elementNameOf(element),
			trigram: TRIGRAM_NAMES[trigram],
		},
	};
}
