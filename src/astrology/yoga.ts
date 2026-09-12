/**
 * The elemental yoga — the pairing of the weekday's element with the lunar mansion's.
 *
 * @remarks
 * Everything else in `./astrology` is a cycle you could count on your fingers, and the mansion is
 * the one piece that needs real astronomy. This module is where the two meet: Janson defines the
 * yoga as the **unordered pair** of the two elements, which gives exactly ten combinations — four
 * matched and six mixed.
 *
 * **Three sources meet here, and they carry different weights.** Janson defines the pairing and
 * gives the mansion arithmetic. Henning supplies the element each mansion carries *and* the ten
 * names — Janson cites him for both and derives neither. **Favorability is in neither**: FPMT is its
 * sole witness, through the `FD-`/`UD-` prefix of its published day-quality codes. See
 * [docs/astrology.md](../../docs/astrology.md) for the reader-facing account and
 * [docs/almanac-sources.md](../../docs/almanac-sources.md) for the sourcing.
 *
 * **The elements are the Indian four, not the Chinese five** — earth, fire, water and wind. `wood`
 * and `iron` never appear, which is why this uses {@link TibetanWeekdayElement} rather than
 * `TibetanElement`.
 *
 * @packageDocumentation
 */

import { assertInternal } from "../errors.js";
import { deepFreeze } from "../freeze.js";
import type { TibetanWeekdayElement } from "../types.js";
import { mansionElement } from "./mansion-elements.js";

/** One of the ten pairings, with its names and whether it is held favorable. */
export interface ElementalYoga {
	/**
	 * The two elements, **as Henning prints the pair** — not in the order they were supplied.
	 *
	 * @remarks
	 * The pair is unordered: a fire weekday with a water mansion and a water weekday with a fire
	 * mansion are one yoga, not two. {@link elementalYoga} returns the **same frozen object** either
	 * way round, so two days sharing a yoga share its identity, and nothing here has to normalise a
	 * tuple to make them comparable. Deliberately not re-sorted into an internal canonical order,
	 * which would print a pair Henning's table does not.
	 */
	readonly elements: readonly [TibetanWeekdayElement, TibetanWeekdayElement];
	/** Henning's Sanskrit name, in his IAST spelling. */
	readonly sanskrit: string;
	/** Henning's Tibetan name, in his Wylie. No Tibetan script: he prints none. */
	readonly wylie: string;
	/** Henning's English gloss. */
	readonly english: string;
	/**
	 * Whether the day is held favorable — six of the ten are.
	 *
	 * @remarks
	 * **FPMT's claim, not Janson's and not Henning's.** It is the `FD-`/`UD-` prefix of the codes in
	 * their published monthly calendars, which `test/validation/fpmt-observances.test.ts` checks day
	 * by day. Nothing in the paper ranks the ten.
	 */
	readonly favorable: boolean;
}

/**
 * The four elements in the order this module normalises a pair into.
 *
 * @remarks
 * Janson's day-of-week element table order. Nothing traditional rests on it — it exists so that
 * {@link elementalYoga} returns one tuple per yoga rather than two.
 */
const ELEMENT_ORDER: readonly TibetanWeekdayElement[] = ["earth", "water", "fire", "wind"];

/**
 * All ten yogas, Henning's table in his own columns.
 *
 * @remarks
 * Frozen, like every other shipped table here: it is the object a consumer is pointed at, so it is
 * the one a keystroke off a spread would mutate.
 *
 * Six favorable against four unfavorable, and the division is FPMT's. The four unfavorable ones are
 * the pairs that mix elements held to fight: earth with wind, water with wind, earth with fire, and
 * fire with water — *maraṇa*, "death", the most inauspicious of the ten.
 */
export const ELEMENTAL_YOGAS: readonly ElementalYoga[] = deepFreeze([
	{
		elements: ["earth", "earth"],
		sanskrit: "siddhi",
		wylie: "dngos grub",
		english: "accomplishment",
		favorable: true,
	},
	{
		elements: ["water", "water"],
		sanskrit: "amṛta",
		wylie: "bdud rtsi",
		english: "nectar",
		favorable: true,
	},
	{
		elements: ["earth", "water"],
		sanskrit: "yauvana",
		wylie: "lang tsho",
		english: "youth",
		favorable: true,
	},
	{
		elements: ["fire", "fire"],
		sanskrit: "pragati",
		wylie: "'phel 'gyur",
		english: "progress",
		favorable: true,
	},
	{
		elements: ["wind", "wind"],
		sanskrit: "saṃpanna",
		wylie: "phun tshogs",
		english: "excellence",
		favorable: true,
	},
	{
		elements: ["fire", "wind"],
		sanskrit: "balayukta",
		wylie: "stobs ldan",
		english: "powerful",
		favorable: true,
	},
	{
		elements: ["earth", "wind"],
		sanskrit: "alābha",
		wylie: "mi phrod",
		english: "deficiency",
		favorable: false,
	},
	{
		elements: ["water", "wind"],
		sanskrit: "pratikūla",
		wylie: "mi mthun",
		english: "discord",
		favorable: false,
	},
	{
		elements: ["earth", "fire"],
		sanskrit: "dahana",
		wylie: "sreg pa",
		english: "burning",
		favorable: false,
	},
	{
		elements: ["fire", "water"],
		sanskrit: "maraṇa",
		wylie: "'chi ba",
		english: "death",
		favorable: false,
	},
] as ElementalYoga[]);

/** `"earth+water"`, with the two elements in {@link ELEMENT_ORDER}, whichever way they arrived. */
function key(first: TibetanWeekdayElement, second: TibetanWeekdayElement): string {
	return [first, second]
		.sort((a, b) => ELEMENT_ORDER.indexOf(a) - ELEMENT_ORDER.indexOf(b))
		.join("+");
}

const BY_PAIR = new Map(
	ELEMENTAL_YOGAS.map((yoga) => [key(yoga.elements[0], yoga.elements[1]), yoga]),
);

/**
 * The yoga of a weekday element paired with a mansion element.
 *
 * @remarks
 * Order-insensitive, which is Janson's definition rather than a convenience: he says outright that
 * "the order of these two elements does not matter and the combination is regarded as an unordered
 * pair". So this is symmetric in its arguments — it returns the **same object** for `(fire, water)`
 * and `(water, fire)`, which is what makes two days' yogas comparable by identity.
 *
 * @example
 * ```ts
 * // 1 September 2026 is a Tuesday, whose element is fire; the mansion that morning carries water.
 * elementalYoga("fire", "water").sanskrit;   // "maraṇa"
 * elementalYoga("water", "fire").favorable;  // false — and the same yoga, either way round
 * ```
 */
export function elementalYoga(
	weekdayElement: TibetanWeekdayElement,
	mansion: TibetanWeekdayElement,
): ElementalYoga {
	return assertInternal(
		BY_PAIR.get(key(weekdayElement, mansion)),
		`elementalYoga: ${weekdayElement} + ${mansion} is not one of the ten pairings, which cannot ` +
			"happen for two of the four Indian elements",
	);
}

/**
 * The yoga of the calendar day in lunar mansion `mansionIndex`, whose weekday element is
 * `weekdayElement`.
 *
 * @remarks
 * A thin composition over {@link elementalYoga} and `mansionElement`, kept here so that a caller
 * holding a mansion **number** — which is what `mansionNumber` returns — does not have to know that
 * the element table is Henning's and lives in its own module.
 */
export function yogaForMansion(
	weekdayElement: TibetanWeekdayElement,
	mansionIndex: number,
): ElementalYoga {
	return elementalYoga(weekdayElement, mansionElement(mansionIndex));
}
