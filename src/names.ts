/**
 * The Tibetan name vocabulary: weekdays, elements, genders and animals.
 *
 * @remarks
 * Every string here was verified by `scripts/verify-name-sources.mjs` before it was written down,
 * against five independent checks — see `docs/names/vocabulary.md`. `test/fixtures/names.ts` holds the
 * generated copy and the suite asserts this file matches it, so a hand-edit here fails `npm test`
 * even though the generating script needs the network and is not on the CI path.
 *
 * **One correction to the source is applied and is not a typo of ours.** Janson's day-of-week table
 * gives Saturday as `spen ma`; his own Bhutan appendix gives `spen pa` for the same day in Tibet.
 * English Wiktionary has an entry at སྤེན་པ and none at སྤེན་མ, and CLDR's `bo` locale independently
 * gives སྤེན་པ. The correction lives in the script as data carrying that evidence, so it
 * self-invalidates if the situation ever changes.
 *
 * @packageDocumentation
 */

import { assertInternal } from "./errors.js";
import { deepFreeze } from "./freeze.js";
import type {
	TibetanAnimal,
	TibetanElement,
	TibetanGender,
	TibetanName,
	TibetanWeekdayName,
} from "./types.js";

/**
 * Every name object is frozen and shared.
 *
 * @remarks
 * A `TibetanDate` holds a pointer to one of these rather than a copy, which is what keeps
 * `datesFor` over a year cheap — it adds pointer fields, not thousands of strings. Sharing mutable
 * objects would reproduce the bug `CLAUDE.md` records for the `monthsFor` cache: one consumer's
 * write corrupting every other consumer's date. Hence `deepFreeze`, not a convention.
 */
const freeze = <T>(value: T): T => deepFreeze(value);

/**
 * Weekday names, indexed by the **Tibetan** weekday: 0 = Saturday through 6 = Friday.
 *
 * @remarks
 * Not the ISO numbering. `TibetanDate.tibetanWeekday` is the field that indexes this; `dayOfWeek`
 * is ISO and does not.
 */
const WEEKDAYS: readonly TibetanWeekdayName[] = freeze([
	{ tibetan: "སྤེན་པ", wylie: "spen pa", phonetic: "pen pa", planet: "saturn", element: "earth" },
	{ tibetan: "ཉི་མ", wylie: "nyi ma", phonetic: "nyi ma", planet: "sun", element: "fire" },
	{ tibetan: "ཟླ་བ", wylie: "zla ba", phonetic: "da ba", planet: "moon", element: "water" },
	{ tibetan: "མིག་དམར", wylie: "mig dmar", phonetic: "mik mar", planet: "mars", element: "fire" },
	{ tibetan: "ལྷག་པ", wylie: "lhag pa", phonetic: "lhak pa", planet: "mercury", element: "water" },
	{ tibetan: "ཕུར་བུ", wylie: "phur bu", phonetic: "pur bu", planet: "jupiter", element: "wind" },
	{ tibetan: "པ་སངས", wylie: "pa sangs", phonetic: "pa sang", planet: "venus", element: "earth" },
]);

const ELEMENTS: Readonly<Record<TibetanElement, TibetanName>> = freeze({
	wood: { tibetan: "ཤིང", wylie: "shing", phonetic: "shing" },
	fire: { tibetan: "མེ", wylie: "me", phonetic: "mé" },
	earth: { tibetan: "ས", wylie: "sa", phonetic: "sa" },
	iron: { tibetan: "ལྕགས", wylie: "lcags", phonetic: "chak" },
	water: { tibetan: "ཆུ", wylie: "chu", phonetic: "chu" },
});

const GENDERS: Readonly<Record<TibetanGender, TibetanName>> = freeze({
	male: { tibetan: "ཕོ", wylie: "pho", phonetic: "po" },
	female: { tibetan: "མོ", wylie: "mo", phonetic: "mo" },
});

const ANIMALS: Readonly<Record<TibetanAnimal, TibetanName>> = freeze({
	mouse: { tibetan: "བྱི་བ", wylie: "byi ba", phonetic: "ji ba" },
	ox: { tibetan: "གླང", wylie: "glang", phonetic: "lang" },
	tiger: { tibetan: "སྟག", wylie: "stag", phonetic: "tak" },
	rabbit: { tibetan: "ཡོས", wylie: "yos", phonetic: "yö" },
	dragon: { tibetan: "འབྲུག", wylie: "'brug", phonetic: "druk" },
	snake: { tibetan: "སྦྲུལ", wylie: "sbrul", phonetic: "drül" },
	horse: { tibetan: "རྟ", wylie: "rta", phonetic: "ta" },
	sheep: { tibetan: "ལུག", wylie: "lug", phonetic: "luk" },
	monkey: { tibetan: "སྤྲེའུ", wylie: "spre'u", phonetic: "treu" },
	bird: { tibetan: "བྱ", wylie: "bya", phonetic: "ja" },
	dog: { tibetan: "ཁྱི", wylie: "khyi", phonetic: "khyi" },
	pig: { tibetan: "ཕག", wylie: "phag", phonetic: "pak" },
});

/** The whole vocabulary, for the test that pins it against the generated fixture. */
export const NAME_TABLES = freeze({ WEEKDAYS, ELEMENTS, GENDERS, ANIMALS });

/**
 * The Tibetan name of a weekday, by Tibetan weekday number and a naming offset.
 *
 * @remarks
 * Takes a resolved offset rather than a `TraditionConfig`: `weekdayNameFor` in `cycles.ts` is the
 * public entry point, and it reads `tradition.naming?.weekdayOffset ?? 0` before calling here. The
 * offset exists because **Bhutan names its weekdays one planet ahead of Tibet** — day 0 is
 * *spen pa* in Tibet and *nyi ma* in Bhutan. Janson calls this "a unique feature of the Bhutanese
 * calendar", and Unicode CLDR agrees: its `bo` and `dz` locales differ by exactly one planet for
 * the same date.
 *
 * The offset applies to the **name only**. `tibetanWeekday` is `mod(julianDay + 2, 7)` for every
 * tradition, and the Western weekday is correct in both — which is why the difference is invisible
 * when dates are written in English, as Janson notes.
 *
 * @param weekday - Tibetan weekday, 0 = Saturday through 6 = Friday.
 * @param offset - Planets to shift the name by: 0 for every Tibetan version, 1 for Bhutan.
 */
/**
 * The Tibetan name of a weekday, after applying a tradition's planet offset.
 *
 * @remarks
 * **Named for what it does, not `weekdayNameOf`, and the asymmetry with its three siblings below is
 * deliberate.** They are pure table access and take no offset; this one shifts the index, which is
 * the whole Bhutan difference. The old name also sat one character from the public
 * `weekdayNameFor` that calls it — a hazard `docs/coding-standards.md` recorded, because writing
 * the public name where this one belongs **compiles**, both returning `TibetanWeekdayName`, and
 * recurses infinitely rather than failing to typecheck. Renaming removed the last instance of it.
 */
export function weekdayNameWithOffset(weekday: number, offset: number): TibetanWeekdayName {
	const index = (((weekday + offset) % 7) + 7) % 7;
	return assertInternal(
		WEEKDAYS[index],
		`weekday index ${index} is forced into 0..6 and WEEKDAYS has seven entries`,
	);
}

export const elementNameOf = (element: TibetanElement): TibetanName => ELEMENTS[element];
export const genderNameOf = (gender: TibetanGender): TibetanName => GENDERS[gender];
export const animalNameOf = (animal: TibetanAnimal): TibetanName => ANIMALS[animal];
