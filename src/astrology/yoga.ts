/**
 * The elemental yoga — the pairing of the weekday's element with the lunar mansion's.
 *
 * @remarks
 * Everything else in `./astrology` is a cycle you could count on your fingers, and the mansion is
 * the one piece that needs real astronomy. This module is where the two meet: Janson defines the
 * yoga as the **unordered pair** of the two elements, which gives exactly ten combinations — four
 * matched and six mixed.
 *
 * **Four sources meet here, and they carry different weights.** Janson defines the pairing and
 * gives the mansion arithmetic. Henning supplies the element each mansion carries *and* the ten
 * names — Janson cites him for both and derives neither. **Favorability is in neither**: FPMT is the
 * witness for `favorable`, through the `FD-`/`UD-` prefix of its published day-quality codes. The
 * *tshig mdzod chen mo*, a Tibetan dictionary outside Henning's lineage, states the same ten element
 * pairs as Henning and grades the ten into four groups, which is `auspiciousness`. See
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
import type { SanskritName, TibetanName, TibetanWeekdayElement } from "../types.js";
import { mansionElement } from "./mansion-elements.js";

/**
 * One of the four groups the *tshig mdzod chen mo* grades the ten yogas into.
 *
 * @remarks
 * The entry closes its list of the ten with "three good, three restorative, three bad, one worst" —
 * *bzang po gsum*, *gso thub gsum*, *ngan gsum*, *tha chad gcig*. The four values are shared frozen
 * objects, so two yogas in one group hold the **same** object.
 */
export interface YogaAuspiciousness {
	/**
	 * The group's name in English, and the key a caller branches on.
	 *
	 * @remarks
	 * The four are sourced at three strengths, and the difference is stated rather than hidden:
	 *
	 * - `"good"` and `"bad"` are printed word for word for the Tibetan: Jäschke p. 496 s.v. *bzang po*,
	 *   p. 126 s.v. *ngan pa*.
	 * - `"worst"` is printed for its Sanskrit equivalent: Das p. 564 gives *adhama* among the Sanskrit
	 *   for *tha chad*, and Monier-Williams p. 19 glosses *adhama* "lowest, vilest, worst". Jäschke's own
	 *   "very bad" (p. 226) is the rejected alternative.
	 * - `"restorative"` is **composed**: no dictionary heads *gso thub*, so it joins *gso ba* "to restore"
	 *   (Jäschke p. 590) and *thub pa* "to be able" (p. 234). Das's "healing" (p. 1312) is the rejected
	 *   alternative, because it drops *thub*.
	 *
	 * `scripts/verify-month-and-yoga-names.mjs` re-checks each on every run.
	 */
	readonly englishName: "good" | "restorative" | "bad" | "worst";
	/** The group's Tibetan name as the entry prints it — script, Wylie and THL phonetics. */
	readonly tibetanName: TibetanName;
}

/** One of the ten pairings, with its names and how auspicious it is held to be. */
export interface ElementalYoga {
	/**
	 * The yoga's name in English — eight of the ten Henning's translation (p. 204), two a dictionary's.
	 *
	 * @remarks
	 * The third rendering of one name, beside {@link ElementalYoga.tibetanName} and
	 * {@link ElementalYoga.sanskritName} — not the meaning of the mansion or of anything else. First,
	 * because it is the key a reader recognises.
	 *
	 * **Every one is printed word for word by a public-domain dictionary.** Eight are Henning's
	 * translation: seven printed by Monier-Williams under the Sanskrit name, *excellence* by Jäschke
	 * under *phun sum tshogs*. **Two replace his**, because no dictionary consulted prints his word:
	 * *increase* for his *progress* (Jäschke p. 357, s.v. *'phel-ba*; Das p. 849 agrees), and
	 * *opposition* for his *discord* (Monier-Williams p. 661, s.v. *pratikūla*). See
	 * `docs/names/month-and-yoga-sourcing.md`.
	 */
	readonly englishName: string;
	/**
	 * The Tibetan name — script, Wylie and THL phonetics.
	 *
	 * @remarks
	 * Henning's, with two of his spellings corrected: *mi 'phrod* where he prints *mi phrod*, and
	 * *bsreg pa* where he prints *sreg pa*. Both follow how the *tshig mdzod chen mo*'s own enumeration
	 * of the ten spells them, which `scripts/verify-month-and-yoga-names.mjs` checks for every name. He
	 * prints no Tibetan script; the script here is derived from the Wylie and verified.
	 */
	readonly tibetanName: TibetanName;
	/**
	 * The Sanskrit name, in Henning's spelling.
	 *
	 * @remarks
	 * Nine of the ten are Monier-Williams headwords. **`pragati` is Henning's alone**: it is the stem,
	 * and no Cologne dictionary carries it — not Monier-Williams 1899 or 1872, Böhtlingk and Roth, Apte
	 * or Cappeller. Shipped as he prints it rather than replaced, because the two candidates found are
	 * each worse: *pragamana* is paired with `'phel 'gyur` by no source, and *vṛddhi* is the name of
	 * an unrelated astronomical yoga. See `docs/names/month-and-yoga-sourcing.md`.
	 */
	readonly sanskritName: SanskritName;
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
	/**
	 * Whether the day is held favorable — six of the ten are.
	 *
	 * @remarks
	 * **FPMT's claim, not Janson's and not Henning's.** It is the `FD-`/`UD-` prefix of the codes in
	 * their published monthly calendars, which `test/validation/fpmt-observances.test.ts` checks day
	 * by day. Nothing in the paper ranks the ten.
	 *
	 * Independent of {@link ElementalYoga.auspiciousness} — neither is computed from the other — and
	 * the two agree: the six favorable yogas are exactly the *good* and *restorative* ones.
	 */
	readonly favorable: boolean;
	/**
	 * Which of the *tshig mdzod chen mo*'s four groups the yoga is in.
	 *
	 * @remarks
	 * **Read from list order, not stated.** The entry lists the ten and then says how many are in each
	 * group — three, three, three, one — but never which yoga is in which. So the first three it lists
	 * are taken as *good*, the next three as *restorative*, and so on. That order is not the order of
	 * {@link ELEMENTAL_YOGAS}, which is Henning's.
	 *
	 * **The list has a second order, and it could be the one that matters.** The entry puts the four
	 * same-element pairs first. If that is why they come first, the cut between *good* and
	 * *restorative* is structure rather than rank, and **wind + wind, *phun tshogs* "excellence"** —
	 * *restorative* here — would be *good*. That row is the one to check if a source ever states the
	 * groups' members.
	 *
	 * Agrees with FPMT's independent {@link ElementalYoga.favorable} on all ten, and with Henning's one
	 * statement on the matter, that earth + earth "is considered highly auspicious" (p. 204).
	 */
	readonly auspiciousness: YogaAuspiciousness;
}

/**
 * The four elements in the order this module normalises a pair into.
 *
 * @remarks
 * Janson's day-of-week element table order. Nothing traditional rests on it — it exists so that
 * {@link elementalYoga} returns one tuple per yoga rather than two.
 */
const ELEMENT_ORDER: readonly TibetanWeekdayElement[] = ["earth", "water", "fire", "wind"];

const GOOD: YogaAuspiciousness = deepFreeze({
	englishName: "good",
	tibetanName: { tibetan: "བཟང་པོ", wylie: "bzang po", phonetic: "zang po" },
});
const RESTORATIVE: YogaAuspiciousness = deepFreeze({
	englishName: "restorative",
	tibetanName: { tibetan: "གསོ་ཐུབ", wylie: "gso thub", phonetic: "so tup" },
});
const BAD: YogaAuspiciousness = deepFreeze({
	englishName: "bad",
	tibetanName: { tibetan: "ངན", wylie: "ngan", phonetic: "ngen" },
});
const WORST: YogaAuspiciousness = deepFreeze({
	englishName: "worst",
	tibetanName: { tibetan: "ཐ་ཆད", wylie: "tha chad", phonetic: "ta ché" },
});

/**
 * All ten yogas, Henning's table in his own columns.
 *
 * @remarks
 * Frozen, like every other shipped table here: it is the object a consumer is pointed at, so it is
 * the one a keystroke off a spread would mutate.
 *
 * Six favorable against four unfavorable, and the division is FPMT's. The four unfavorable ones are
 * the pairs that mix elements held to fight: earth with wind, water with wind, earth with fire, and
 * fire with water — *maraṇa*, "death", which the *tshig mdzod chen mo* puts alone in its lowest group.
 */
export const ELEMENTAL_YOGAS: readonly ElementalYoga[] = deepFreeze([
	{
		englishName: "accomplishment",
		tibetanName: { tibetan: "དངོས་གྲུབ", wylie: "dngos grub", phonetic: "ngö drup" },
		sanskritName: { iast: "siddhi", devanagari: "सिद्धि" },
		elements: ["earth", "earth"],
		favorable: true,
		auspiciousness: GOOD,
	},
	{
		englishName: "nectar",
		tibetanName: { tibetan: "བདུད་རྩི", wylie: "bdud rtsi", phonetic: "dü tsi" },
		sanskritName: { iast: "amṛta", devanagari: "अमृत" },
		elements: ["water", "water"],
		favorable: true,
		auspiciousness: GOOD,
	},
	{
		englishName: "youth",
		tibetanName: { tibetan: "ལང་ཚོ", wylie: "lang tsho", phonetic: "lang tso" },
		sanskritName: { iast: "yauvana", devanagari: "यौवन" },
		elements: ["earth", "water"],
		favorable: true,
		auspiciousness: RESTORATIVE,
	},
	{
		englishName: "increase",
		tibetanName: { tibetan: "འཕེལ་འགྱུར", wylie: "'phel 'gyur", phonetic: "pel gyur" },
		sanskritName: { iast: "pragati", devanagari: "प्रगति" },
		elements: ["fire", "fire"],
		favorable: true,
		auspiciousness: GOOD,
	},
	{
		englishName: "excellence",
		tibetanName: { tibetan: "ཕུན་ཚོགས", wylie: "phun tshogs", phonetic: "pün tsok" },
		sanskritName: { iast: "saṃpanna", devanagari: "संपन्न" },
		elements: ["wind", "wind"],
		favorable: true,
		auspiciousness: RESTORATIVE,
	},
	{
		englishName: "powerful",
		tibetanName: { tibetan: "སྟོབས་ལྡན", wylie: "stobs ldan", phonetic: "top den" },
		sanskritName: { iast: "balayukta", devanagari: "बलयुक्त" },
		elements: ["fire", "wind"],
		favorable: true,
		auspiciousness: RESTORATIVE,
	},
	{
		englishName: "deficiency",
		tibetanName: { tibetan: "མི་འཕྲོད", wylie: "mi 'phrod", phonetic: "mi trö" },
		sanskritName: { iast: "alābha", devanagari: "अलाभ" },
		elements: ["earth", "wind"],
		favorable: false,
		auspiciousness: BAD,
	},
	{
		englishName: "opposition",
		tibetanName: { tibetan: "མི་མཐུན", wylie: "mi mthun", phonetic: "mi tün" },
		sanskritName: { iast: "pratikūla", devanagari: "प्रतिकूल" },
		elements: ["water", "wind"],
		favorable: false,
		auspiciousness: BAD,
	},
	{
		englishName: "burning",
		tibetanName: { tibetan: "བསྲེག་པ", wylie: "bsreg pa", phonetic: "sek pa" },
		sanskritName: { iast: "dahana", devanagari: "दहन" },
		elements: ["earth", "fire"],
		favorable: false,
		auspiciousness: BAD,
	},
	{
		englishName: "death",
		tibetanName: { tibetan: "འཆི་བ", wylie: "'chi ba", phonetic: "chi ba" },
		sanskritName: { iast: "maraṇa", devanagari: "मरण" },
		elements: ["fire", "water"],
		favorable: false,
		auspiciousness: WORST,
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
 * **The one primitive in this subpath exported alongside its `*For` sibling, deliberately.** Every
 * other pair here — `monthAttributes`/`monthAttributesFor`, `yearAttributes`/`yearAttributesFor` and
 * so on — keeps the primitive internal, because the `*For` wrapper validates a raw number against a
 * real range. This primitive takes two {@link TibetanWeekdayElement}s, a four-member closed union
 * TypeScript already fully constrains at the call site, so there is no validation for a wrapper to be
 * doing on its behalf — and exporting it lets a caller build the weekday×mansion matrix without
 * reimplementing the unordered-pair lookup. Decided 2026-09-18, on Andreas' reasoning that a consumer
 * may want to enumerate it directly.
 *
 * @example
 * ```ts
 * // 1 September 2026 is a Tuesday, whose element is fire; the mansion that morning carries water.
 * elementalYoga("fire", "water").sanskritName.iast;   // "maraṇa"
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
