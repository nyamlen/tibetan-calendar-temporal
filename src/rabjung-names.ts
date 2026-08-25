/**
 * The 60 rabjung cycle names: the Tibetan tradition's name at each position.
 *
 * @remarks
 * A weaker evidence tier than `names.ts`'s vocabulary — see {@link TibetanName} — so it lives in its
 * own module rather than joining that table, keeping one module per evidence standard and one
 * generator per fixture.
 *
 * Every row was verified by `scripts/verify-rabjung-names.mjs` before it was written down, against
 * five independent sources — see `docs/names/rabjung.md` and `docs/names/rabjung-sourcing.md`.
 * `test/fixtures/rabjung-names.ts` holds the generated copy and the suite asserts this file matches
 * it, so a hand-edit here fails `npm test` even though the generating script needs the network and
 * is not on the CI path.
 *
 * **Neither of the cycle's two Sanskrit lists ships here**, and the fixture is deliberately fuller
 * than this file: it keeps `devanagari`, `iast`, the Monier-Williams senses and Csoma's two columns,
 * because they are what would make a later change cheap and because they are the evidence for the
 * rows that do ship. The suite therefore asserts this file against a **subset** of the fixture; that
 * asymmetry is deliberate and is not drift. See
 * `docs/decisions/2026-08-25-rabjung-ships-the-tibetan-name-only.md`.
 *
 * @packageDocumentation
 */

import { assertInternal } from "./errors.js";
import { deepFreeze } from "./freeze.js";
import type { TibetanName } from "./types.js";

/**
 * All sixty names, indexed by position **minus one** — `RABJUNG_NAMES[0]` is position 1.
 *
 * @remarks
 * Frozen and shared, matching `names.ts`'s `NAME_TABLES`: a `Rabjung` holds a pointer to one of
 * these rather than a copy, so `datesFor` over a year adds pointer fields, not sixty-row copies.
 */
export const RABJUNG_NAMES: readonly TibetanName[] = deepFreeze([
	{
		tibetan: "རབ་བྱུང",
		wylie: "rab byung",
		phonetic: "rap jung",
	}, // 1
	{
		tibetan: "རྣམ་བྱུང",
		wylie: "rnam byung",
		phonetic: "nam jung",
	}, // 2
	{
		tibetan: "དཀར་པོ",
		wylie: "dkar po",
		phonetic: "kar po",
	}, // 3
	{
		tibetan: "རབ་མྱོས",
		wylie: "rab myos",
		phonetic: "rap nyö",
	}, // 4
	{
		tibetan: "སྐྱེས་བདག",
		wylie: "skyes bdag",
		phonetic: "kyé dak",
	}, // 5
	{
		tibetan: "ཨང་གི་ར",
		wylie: "ang gi ra",
		phonetic: "ang gi ra",
	}, // 6
	{
		tibetan: "དཔལ་གདོང",
		wylie: "dpal gdong",
		phonetic: "pel dong",
	}, // 7
	{
		tibetan: "དངོས་པོ",
		wylie: "dngos po",
		phonetic: "ngö po",
	}, // 8
	{
		tibetan: "ན་ཚོད་ལྡན",
		wylie: "na tshod ldan",
		phonetic: "na tsö den",
	}, // 9
	{
		tibetan: "འཛིན་བྱེད",
		wylie: "'dzin byed",
		phonetic: "dzin jé",
	}, // 10
	{
		tibetan: "དབང་ཕྱུག",
		wylie: "dbang phyug",
		phonetic: "wang chuk",
	}, // 11
	{
		tibetan: "འབྲུ་མང་པོ",
		wylie: "'bru mang po",
		phonetic: "dru mang po",
	}, // 12
	{
		tibetan: "མྱོས་ལྡན",
		wylie: "myos ldan",
		phonetic: "nyö den",
	}, // 13
	{
		tibetan: "རྣམ་གནོན",
		wylie: "rnam gnon",
		phonetic: "nam nön",
	}, // 14
	{
		tibetan: "ཁྱུ་མཆོག",
		wylie: "khyu mchog",
		phonetic: "khyu chok",
	}, // 15
	{
		tibetan: "སྣ་ཚོགས",
		wylie: "sna tshogs",
		phonetic: "na tsok",
	}, // 16
	{
		tibetan: "ཉི་མ",
		wylie: "nyi ma",
		phonetic: "nyi ma",
	}, // 17
	{
		tibetan: "ཉི་སྒྲོལ་བྱེད",
		wylie: "nyi sgrol byed",
		phonetic: "nyi dröl jé",
	}, // 18
	{
		tibetan: "ས་སྐྱོང",
		wylie: "sa skyong",
		phonetic: "sa kyong",
	}, // 19
	{
		tibetan: "མི་ཟད",
		wylie: "mi zad",
		phonetic: "mi zé",
	}, // 20
	{
		tibetan: "ཐམས་ཅད་འདུལ",
		wylie: "thams cad 'dul",
		phonetic: "tam ché dül",
	}, // 21
	{
		tibetan: "ཀུན་འཛིན",
		wylie: "kun 'dzin",
		phonetic: "kün dzin",
	}, // 22
	{
		tibetan: "འགལ་བ",
		wylie: "'gal ba",
		phonetic: "gel ba",
	}, // 23
	{
		tibetan: "རྣམ་འགྱུར",
		wylie: "rnam 'gyur",
		phonetic: "nam gyur",
	}, // 24
	{
		tibetan: "བོང་བུ",
		wylie: "bong bu",
		phonetic: "bong bu",
	}, // 25
	{
		tibetan: "དགའ་བ",
		wylie: "dga' ba",
		phonetic: "ga ba",
	}, // 26
	{
		tibetan: "རྣམ་རྒྱལ",
		wylie: "rnam rgyal",
		phonetic: "nam gyel",
	}, // 27
	{
		tibetan: "རྒྱལ་བ",
		wylie: "rgyal ba",
		phonetic: "gyel ba",
	}, // 28
	{
		tibetan: "མྱོས་བྱེད",
		wylie: "myos byed",
		phonetic: "nyö jé",
	}, // 29
	{
		tibetan: "གདོང་ངན",
		wylie: "gdong ngan",
		phonetic: "dong ngen",
	}, // 30
	{
		tibetan: "གསེར་འཕྱང",
		wylie: "gser 'phyang",
		phonetic: "ser chang",
	}, // 31
	{
		tibetan: "རྣམ་འཕྱང",
		wylie: "rnam 'phyang",
		phonetic: "nam chang",
	}, // 32
	{
		tibetan: "སྒྱུར་བྱེད",
		wylie: "sgyur byed",
		phonetic: "gyur jé",
	}, // 33
	{
		tibetan: "ཀུན་ལྡན",
		wylie: "kun ldan",
		phonetic: "kün den",
	}, // 34
	{
		tibetan: "འཕར་བ",
		wylie: "'phar ba",
		phonetic: "par ba",
	}, // 35
	{
		tibetan: "དགེ་བྱེད",
		wylie: "dge byed",
		phonetic: "gé jé",
	}, // 36
	{
		tibetan: "མཛེས་བྱེད",
		wylie: "mdzes byed",
		phonetic: "dzé jé",
	}, // 37
	{
		tibetan: "ཁྲོ་མོ",
		wylie: "khro mo",
		phonetic: "tro mo",
	}, // 38
	{
		tibetan: "སྣ་ཚོགས་དབྱིག",
		wylie: "sna tshogs dbyig",
		phonetic: "na tsok yik",
	}, // 39
	{
		tibetan: "ཟིལ་གནོན",
		wylie: "zil gnon",
		phonetic: "zil nön",
	}, // 40
	{
		tibetan: "སྤྲེའུ",
		wylie: "spre'u",
		phonetic: "treu",
	}, // 41
	{
		tibetan: "ཕུར་བུ",
		wylie: "phur bu",
		phonetic: "pur bu",
	}, // 42
	{
		tibetan: "ཞི་བ",
		wylie: "zhi ba",
		phonetic: "zhi ba",
	}, // 43
	{
		tibetan: "ཐུན་མོང",
		wylie: "thun mong",
		phonetic: "tün mong",
	}, // 44
	{
		tibetan: "འགལ་བྱེད",
		wylie: "'gal byed",
		phonetic: "gel jé",
	}, // 45
	{
		tibetan: "ཡོངས་འཛིན",
		wylie: "yongs 'dzin",
		phonetic: "yong dzin",
	}, // 46
	{
		tibetan: "བག་མེད",
		wylie: "bag med",
		phonetic: "bak mé",
	}, // 47
	{
		tibetan: "ཀུན་དགའ",
		wylie: "kun dga'",
		phonetic: "kün ga",
	}, // 48
	{
		tibetan: "སྲིན་བུ",
		wylie: "srin bu",
		phonetic: "sin bu",
	}, // 49
	{
		tibetan: "མེ",
		wylie: "me",
		phonetic: "mé",
	}, // 50
	{
		tibetan: "དམར་སེར་ཅན",
		wylie: "dmar ser can",
		phonetic: "mar ser chen",
	}, // 51
	{
		tibetan: "དུས་ཀྱི་ཕོ་ཉ",
		wylie: "dus kyi pho nya",
		phonetic: "dü kyi po nya",
	}, // 52
	{
		tibetan: "དོན་གྲུབ",
		wylie: "don grub",
		phonetic: "dön drup",
	}, // 53
	{
		tibetan: "དྲག་པོ",
		wylie: "drag po",
		phonetic: "drak po",
	}, // 54
	{
		tibetan: "བློ་ངན",
		wylie: "blo ngan",
		phonetic: "lo ngen",
	}, // 55
	{
		tibetan: "རྔ་ཆེན",
		wylie: "rnga chen",
		phonetic: "nga chen",
	}, // 56
	{
		tibetan: "ཁྲག་སྐྱུག",
		wylie: "khrag skyug",
		phonetic: "trak kyuk",
	}, // 57
	{
		tibetan: "མིག་དམར",
		wylie: "mig dmar",
		phonetic: "mik mar",
	}, // 58
	{
		tibetan: "ཁྲོ་བོ",
		wylie: "khro bo",
		phonetic: "tro bo",
	}, // 59
	{
		tibetan: "ཟད་པ",
		wylie: "zad pa",
		phonetic: "zé pa",
	}, // 60
]);

/**
 * The Tibetan name at a rabjung position.
 *
 * @param position - 1–60. Every caller here has already computed this via `(Y − 1026) amod 60`,
 * which is always in range, so an out-of-range position is an internal bug, not user input.
 */
export function rabjungNameOf(position: number): TibetanName {
	return assertInternal(
		RABJUNG_NAMES[position - 1],
		`rabjung position ${position} is forced into 1..60 by amod and RABJUNG_NAMES has sixty entries`,
	);
}
