/**
 * The names of the 27 lunar mansions, in Tibetan and Sanskrit.
 *
 * @remarks
 * **Separate from the element table because the sources are.** The elements are Henning's; these
 * names were verified by `scripts/verify-mansion-and-trigram-names.mjs` against the Mahāvyutpatti,
 * Das, Jäschke, the two Tibetan–Tibetan dictionaries and Monier-Williams, and the suite holds this
 * table against that script's fixture. The evidence and the decisions are in
 * `docs/names/mansion-and-trigram-sourcing.md`.
 *
 * - **The Tibetan** is the Mahāvyutpatti's, at the position Jäschke's list — numbered from 0, as the
 *   engine numbers — gives it.
 * - **The Sanskrit** is the Mahāvyutpatti's form reduced to its stem, each a Monier-Williams headword
 *   naming a nakṣatra or printed inside one. At 22 and 23 the pairing follows Das, not the
 *   Mahāvyutpatti, which lists Śatabhiṣā before Dhaniṣṭhā.
 * - **There is no English name.** No source prints one for a mansion, and a translation of either name
 *   would pair English with a Tibetan word it does not render — *mchu* is "lip", Maghā "bounty".
 *
 * Indexed 0–26 like `mansionNumber`, without *Abhijit*.
 *
 * @packageDocumentation
 */

import { assertInternal } from "../errors.js";
import { deepFreeze } from "../freeze.js";
import type { SanskritName, TibetanName } from "../types.js";
import { MANSION_COUNT } from "./mansions.js";

/** One mansion's names. Frozen and shared, like every name object. */
export interface MansionNames {
	readonly tibetanName: TibetanName;
	readonly sanskritName: SanskritName;
}

export const MANSION_NAMES: readonly MansionNames[] = deepFreeze([
	{
		tibetanName: { tibetan: "ཐ་སྐར", wylie: "tha skar", phonetic: "takar" },
		sanskritName: { iast: "aśvinī", devanagari: "अश्विनी" },
	},
	{
		tibetanName: { tibetan: "བྲ་ཉེ", wylie: "bra nye", phonetic: "dranyé" },
		sanskritName: { iast: "bharaṇī", devanagari: "भरणी" },
	},
	{
		tibetanName: { tibetan: "སྨིན་དྲུག", wylie: "smin drug", phonetic: "mindruk" },
		sanskritName: { iast: "kṛttikā", devanagari: "कृत्तिका" },
	},
	{
		tibetanName: { tibetan: "སྣར་མ", wylie: "snar ma", phonetic: "narma" },
		sanskritName: { iast: "rohiṇī", devanagari: "रोहिणी" },
	},
	{
		tibetanName: { tibetan: "མགོ", wylie: "mgo", phonetic: "go" },
		sanskritName: { iast: "mṛgaśiras", devanagari: "मृगशिरस्" },
	},
	{
		tibetanName: { tibetan: "ལག", wylie: "lag", phonetic: "lak" },
		sanskritName: { iast: "ārdrā", devanagari: "आर्द्रा" },
	},
	{
		tibetanName: { tibetan: "ནབས་སོ", wylie: "nabs so", phonetic: "napso" },
		sanskritName: { iast: "punarvasu", devanagari: "पुनर्वसु" },
	},
	{
		tibetanName: { tibetan: "རྒྱལ", wylie: "rgyal", phonetic: "gyel" },
		sanskritName: { iast: "puṣya", devanagari: "पुष्य" },
	},
	{
		tibetanName: { tibetan: "སྐག", wylie: "skag", phonetic: "kak" },
		sanskritName: { iast: "aśleṣā", devanagari: "अश्लेषा" },
	},
	{
		tibetanName: { tibetan: "མཆུ", wylie: "mchu", phonetic: "chu" },
		sanskritName: { iast: "maghā", devanagari: "मघा" },
	},
	{
		tibetanName: { tibetan: "གྲེ", wylie: "gre", phonetic: "dré" },
		sanskritName: { iast: "pūrvaphalgunī", devanagari: "पूर्वफल्गुनी" },
	},
	{
		tibetanName: { tibetan: "དབོ", wylie: "dbo", phonetic: "wo" },
		sanskritName: { iast: "uttaraphalgunī", devanagari: "उत्तरफल्गुनी" },
	},
	{
		tibetanName: { tibetan: "མེ་བཞི", wylie: "me bzhi", phonetic: "mezhi" },
		sanskritName: { iast: "hastā", devanagari: "हस्ता" },
	},
	{
		tibetanName: { tibetan: "ནག་པ", wylie: "nag pa", phonetic: "nakpa" },
		sanskritName: { iast: "citrā", devanagari: "चित्रा" },
	},
	{
		tibetanName: { tibetan: "ས་རི", wylie: "sa ri", phonetic: "sari" },
		sanskritName: { iast: "svātī", devanagari: "स्वाती" },
	},
	{
		tibetanName: { tibetan: "ས་ག", wylie: "sa ga", phonetic: "saga" },
		sanskritName: { iast: "viśākhā", devanagari: "विशाखा" },
	},
	{
		tibetanName: { tibetan: "ལྷ་མཚམས", wylie: "lha mtshams", phonetic: "lhamtsam" },
		sanskritName: { iast: "anurādhā", devanagari: "अनुराधा" },
	},
	{
		tibetanName: { tibetan: "སྣྲོན", wylie: "snron", phonetic: "nön" },
		sanskritName: { iast: "jyeṣṭhā", devanagari: "ज्येष्ठा" },
	},
	{
		tibetanName: { tibetan: "སྣྲུབས", wylie: "snrubs", phonetic: "nup" },
		sanskritName: { iast: "mūla", devanagari: "मूल" },
	},
	{
		tibetanName: { tibetan: "ཆུ་སྟོད", wylie: "chu stod", phonetic: "chutö" },
		sanskritName: { iast: "pūrvāṣāḍhā", devanagari: "पूर्वाषाढा" },
	},
	{
		tibetanName: { tibetan: "ཆུ་སྨད", wylie: "chu smad", phonetic: "chumé" },
		sanskritName: { iast: "uttarāṣāḍhā", devanagari: "उत्तराषाढा" },
	},
	{
		tibetanName: { tibetan: "གྲོ་བཞིན", wylie: "gro bzhin", phonetic: "drozhin" },
		sanskritName: { iast: "śravaṇā", devanagari: "श्रवणा" },
	},
	{
		tibetanName: { tibetan: "མོན་གྲེ", wylie: "mon gre", phonetic: "möndré" },
		sanskritName: { iast: "dhaniṣṭhā", devanagari: "धनिष्ठा" },
	},
	{
		tibetanName: { tibetan: "མོན་གྲུ", wylie: "mon gru", phonetic: "möndru" },
		sanskritName: { iast: "śatabhiṣā", devanagari: "शतभिषा" },
	},
	{
		tibetanName: { tibetan: "ཁྲུམས་སྟོད", wylie: "khrums stod", phonetic: "trumtö" },
		sanskritName: { iast: "pūrvabhadrapadā", devanagari: "पूर्वभद्रपदा" },
	},
	{
		tibetanName: { tibetan: "ཁྲུམས་སྨད", wylie: "khrums smad", phonetic: "trummé" },
		sanskritName: { iast: "uttarabhadrapadā", devanagari: "उत्तरभद्रपदा" },
	},
	{
		tibetanName: { tibetan: "ནམ་གྲུ", wylie: "nam gru", phonetic: "namdru" },
		sanskritName: { iast: "revatī", devanagari: "रेवती" },
	},
]);

/** The names of mansion `index`, 0–26. */
export function mansionNames(index: number): MansionNames {
	return assertInternal(
		MANSION_NAMES.length === MANSION_COUNT ? MANSION_NAMES[index] : undefined,
		`mansionNames: no mansion ${index} in a table of ${MANSION_NAMES.length}`,
	);
}
