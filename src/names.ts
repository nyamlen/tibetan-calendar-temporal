/**
 * The Tibetan name vocabulary: weekdays, elements, genders and animals.
 *
 * @remarks
 * Every string here was verified by `scripts/verify-name-sources.mjs` before it was written down,
 * against five independent checks — see `docs/names/vocabulary.md`.
 *
 * **One correction to the source is applied and is not a typo of ours.** Janson's day-of-week table
 * gives Saturday as `spen ma`; his own Bhutan appendix gives `spen pa` for the same day in Tibet.
 * English Wiktionary has an entry at སྤེན་པ and none at སྤེན་མ, and CLDR's `bo` locale independently
 * gives སྤེན་པ.
 *
 * @packageDocumentation
 */

import { mod } from "./computation/arithmetic.js";
import { assertInternal } from "./errors.js";
import { deepFreeze } from "./freeze.js";
import type {
	TibetanAnimal,
	TibetanElement,
	TibetanGender,
	TibetanName,
	TibetanWeekdayName,
} from "./types.js";

// `test/fixtures/names.ts` holds the generated copy and the suite asserts this file matches it, so a
// hand-edit here fails `npm test` even though the generating script needs the network and is not on
// the CI path. The Saturday correction lives in the script as data carrying its evidence, so it
// self-invalidates if the situation ever changes.

/**
 * Deep-freezes a name table, so that every name object is frozen and shared.
 *
 * @remarks
 * A `TibetanDate`'s `weekdayName` is a pointer to one of these rather than a copy, and so are the
 * name members of a `TibetanYearName`.
 */
// Sharing keeps a date cheap — it adds a pointer field, not a string copy — and sharing mutable
// objects would reproduce the bug `CLAUDE.md` records for the `monthsFor` cache: one
// consumer's write corrupting every other consumer's date. Hence `deepFreeze`, not a convention.
const freeze = <T>(value: T): T => deepFreeze(value);

/**
 * Weekday names, in Tibetan weekday order: 0 = Saturday through 6 = Friday.
 *
 * @remarks
 * Not the ISO numbering. `TibetanDate.tibetanWeekday`, plus the tradition's `weekdayOffset`, indexes
 * this; `dayOfWeek` is ISO and does not.
 */
const WEEKDAYS: readonly TibetanWeekdayName[] = freeze([
	{ tibetan: "སྤེན་པ", wylie: "spen pa", phonetic: "penpa", planet: "saturn", element: "earth" },
	{ tibetan: "ཉི་མ", wylie: "nyi ma", phonetic: "nyima", planet: "sun", element: "fire" },
	{ tibetan: "ཟླ་བ", wylie: "zla ba", phonetic: "dawa", planet: "moon", element: "water" },
	{ tibetan: "མིག་དམར", wylie: "mig dmar", phonetic: "mikmar", planet: "mars", element: "fire" },
	{ tibetan: "ལྷག་པ", wylie: "lhag pa", phonetic: "lhakpa", planet: "mercury", element: "water" },
	{ tibetan: "ཕུར་བུ", wylie: "phur bu", phonetic: "purbu", planet: "jupiter", element: "wind" },
	{ tibetan: "པ་སངས", wylie: "pa sangs", phonetic: "pasang", planet: "venus", element: "earth" },
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
	mouse: { tibetan: "བྱི་བ", wylie: "byi ba", phonetic: "jiwa" },
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
 * Returns the Tibetan name of a weekday, after shifting it by a tradition's planet offset.
 *
 * @remarks
 * The **whole weekday** moves: name, `planet` and `element` are all the shifted weekday's row, so
 * with an offset of 1 weekday 0 is *nyi ma*, the sun, fire, where offset 0 gives *spen pa*, Saturn,
 * earth. Takes a resolved offset rather than a `TraditionConfig`: `weekdayNameFor` is the public entry
 * point and reads `tradition.naming?.weekdayOffset ?? 0` before calling here.
 *
 * Nothing is validated: `weekday + offset` wraps modulo seven, so any integer is accepted
 * (`weekdayNameWithOffset(7, 0)` is weekday 0). A non-integer sum is an internal fault.
 *
 * @param weekday - Tibetan weekday, 0 = Saturday through 6 = Friday.
 * @param offset - Planets to shift the name by: 0 for every Tibetan version, 1 for Bhutan.
 *
 * @throws A `TCT_INTERNAL` error if `weekday + offset` is not an integer.
 */
// Bhutan names its weekdays one planet ahead of Tibet — day 0 is *spen pa* in Tibet and *nyi ma* in
// Bhutan. `tibetanWeekday` itself is `mod(julianDay + 2, 7)` for every tradition, and the Western
// weekday is correct in both, which is why the difference is invisible when dates are written in
// English, as Janson notes. That the name and planet move is evidenced: Janson writes "A unique feature
// of the Bhutanese calendar is that its day of week differs by one day from Tibet (and the rest of the
// world, see [his figure of the weekday–planet correspondence])" and "day 0 (Saturday) is *spen pa* in
// Tibet but *nyi ma* (really meaning sun) in Bhutan"; Henning's Bhutanese data labels the same date
// with the next weekday; and Unicode CLDR's `bo` and `dz` locales differ by exactly one planet for the
// same date. That the **element** moves with them is an inference no source states, ruled by the
// maintainer; because no source says what the elemental yoga's weekday element is under such a shift,
// the yoga is refused there: see `elementalYogaFor`.
//
// Named for what it does, not `weekdayNameOf`, and the asymmetry with its three siblings below is
// deliberate: they are pure table access and take no offset, and this one shifts the index, which is
// the whole Bhutan difference. The old name sat one character from the public `weekdayNameFor` that
// calls it, a hazard `docs/coding-standards.md` records, because writing the public name where this
// one belongs compiles and recurses infinitely.
export function weekdayNameWithOffset(weekday: number, offset: number): TibetanWeekdayName {
	const index = mod(weekday + offset, 7);
	return assertInternal(
		WEEKDAYS[index],
		`weekday index ${index} is forced into 0..6 and WEEKDAYS has seven entries`,
	);
}

export const elementNameOf = (element: TibetanElement): TibetanName => ELEMENTS[element];
export const genderNameOf = (gender: TibetanGender): TibetanName => GENDERS[gender];
export const animalNameOf = (animal: TibetanAnimal): TibetanName => ANIMALS[animal];
