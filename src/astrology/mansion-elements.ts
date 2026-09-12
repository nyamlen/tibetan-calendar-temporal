/**
 * The element each lunar mansion carries, in the Indian system.
 *
 * @remarks
 * **This table is Henning's, not Janson's**, and that distinction is the reason this module is
 * separate. Janson defines the elemental yoga and then says he does not derive this list, pointing
 * to Henning for it. Citing Henning there is an ordinary citation chain rather than two sources
 * competing to define one number — see [../../docs/astrology.md](../../docs/astrology.md), which
 * records why the sole-source rule does not reach it.
 *
 * Source: Edward Henning, "Symbolic details of the Kālacakra calendar",
 * `http://www.kalacakra.org/calendar/symlst.htm`, last updated 3 February 2010, accessed
 * 2026-09-10. The site is HTTP-only — its certificate is for another domain — and its author died
 * in 2016, so [../../docs/almanac-sources.md](../../docs/almanac-sources.md) carries a Wayback
 * snapshot beside the live URL.
 *
 * **The elements are the Indian four, not the Chinese five.** Earth, fire, water and *wind* —
 * `wood` and `iron` never appear here, and `wind` is not a year element at all. That is why the
 * type below is {@link TibetanWeekdayElement}, which already exists for the weekday half of the
 * same pairing.
 *
 * @packageDocumentation
 */

import { assertInternal } from "../errors.js";
import type { TibetanWeekdayElement } from "../types.js";
import { MANSION_COUNT } from "./mansions.js";

/**
 * Henning's list **as he prints it** — twenty-eight entries, including *Abhijit*.
 *
 * @remarks
 * Kept whole rather than pre-trimmed, so the drop below is visible as an operation rather than
 * baked into a literal. Trimming it here would make the twenty-seven look like the source's own
 * count, which it is not.
 */
const HENNING_28: readonly { readonly name: string; readonly element: TibetanWeekdayElement }[] = [
	{ name: "Aśvinī", element: "wind" },
	{ name: "Bharaṇī", element: "fire" },
	{ name: "Kṛittikā", element: "fire" },
	{ name: "Rohiṇī", element: "earth" },
	{ name: "Mṛigaśiras", element: "wind" },
	{ name: "Ārdrā", element: "water" },
	{ name: "Punarvasu", element: "wind" },
	{ name: "Puṣya", element: "fire" },
	{ name: "Āśleṣā", element: "water" },
	{ name: "Maghā", element: "fire" },
	{ name: "Pūrvaphalgunī", element: "fire" },
	{ name: "Uttaraphalgunī", element: "wind" },
	{ name: "Hastā", element: "wind" },
	{ name: "Citrā", element: "wind" },
	{ name: "Svātī", element: "wind" },
	{ name: "Viśākhā", element: "fire" },
	{ name: "Anurādhā", element: "earth" },
	{ name: "Jyeṣṭha", element: "earth" },
	{ name: "Mūla", element: "water" },
	{ name: "Pūrvāṣhāḍhā", element: "water" },
	{ name: "Uttarāṣāḍhā", element: "earth" },
	{ name: "Śravaṇa", element: "earth" },
	{ name: "Abhijit", element: "earth" },
	{ name: "Dhaniṣṭhā", element: "water" },
	{ name: "Śatabhiṣaj", element: "earth" },
	{ name: "Pūrvabhādrapāda", element: "fire" },
	{ name: "Uttarabhādrapāda", element: "water" },
	{ name: "Revatī", element: "water" },
];

/** The one mansion Janson's numbering omits. Traditionally intercalated rather than counted. */
const INTERCALATED = "Abhijit";

/**
 * The element of each mansion, indexed **0 to 26** as Janson numbers them.
 *
 * @remarks
 * **Twenty-seven from twenty-eight, and the drop is asserted rather than assumed.** Henning prints
 * 28 including *Abhijit* at position 23; Janson numbers the mansions 0–26. Drop the wrong one and
 * every element from *Dhaniṣṭhā* onward shifts by one — silently, producing a real element for
 * every day and the wrong one for a third of them.
 *
 * The check that makes the drop verifiable: Henning's 28 divide **exactly evenly**, seven to each of
 * the four elements. Removing Abhijit, which is earth, must therefore leave six earth against seven
 * of each other. No other single removal produces that signature, so the assertion below pins which
 * entry left.
 */
export const MANSION_ELEMENTS: readonly TibetanWeekdayElement[] = (() => {
	const kept = HENNING_28.filter((mansion) => mansion.name !== INTERCALATED);

	assertInternal(
		kept.length === MANSION_COUNT || undefined,
		`MANSION_ELEMENTS: dropping ${INTERCALATED} left ${kept.length} mansions, not ${MANSION_COUNT}`,
	);

	const counts = new Map<TibetanWeekdayElement, number>();
	for (const mansion of kept) counts.set(mansion.element, (counts.get(mansion.element) ?? 0) + 1);

	const signature = [...counts.entries()]
		.map(([element, count]) => `${element}:${count}`)
		.sort()
		.join(" ");
	assertInternal(
		signature === "earth:6 fire:7 water:7 wind:7" || undefined,
		`MANSION_ELEMENTS: element counts are ${signature}, not earth:6 fire:7 water:7 wind:7. ` +
			"Henning's 28 divide seven to each element, so the 27 must lose exactly one earth — and " +
			"that is Abhijit. Any other signature means the wrong entry was dropped or the table was " +
			"mistranscribed",
	);

	return kept.map((mansion) => mansion.element);
})();

/** The element of mansion `index`, which {@link mansionNumber} numbers 0 to 26. */
export function mansionElement(index: number): TibetanWeekdayElement {
	return assertInternal(
		MANSION_ELEMENTS[index],
		`mansionElement: ${index} is outside 0…${MANSION_COUNT - 1}`,
	);
}
