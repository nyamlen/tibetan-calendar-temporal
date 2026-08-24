/**
 * The 60 rabjung cycle names: the Tibetan tradition's name at each position, plus the Indic
 * saṃvatsara list's name at the same position.
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
 * Two Sanskrit lists exist for this cycle, and the `sanskrit` field carries the Indic one; at
 * positions 16, 17, 18, 20 and 34 that is a different name from the one the Tibetan translates. See
 * {@link RabjungName}'s own docblock, not this one, since that is where a reader meets the field.
 *
 * @packageDocumentation
 */

import { assertInternal } from "./errors.js";
import { deepFreeze } from "./freeze.js";
import type { RabjungName } from "./types.js";

/**
 * All sixty names, indexed by position **minus one** — `RABJUNG_NAMES[0]` is position 1.
 *
 * @remarks
 * Frozen and shared, matching `names.ts`'s `NAME_TABLES`: a `Rabjung` holds a pointer to one of
 * these rather than a copy, so `datesFor` over a year adds pointer fields, not sixty-row copies.
 */
export const RABJUNG_NAMES: readonly RabjungName[] = deepFreeze([
	{
		tibetan: "རབ་བྱུང",
		wylie: "rab byung",
		phonetic: "rap jung",
		sanskrit: { devanagari: "प्रभव", iast: "Prabhava", meaning: "production, source" },
	}, // 1
	{
		tibetan: "རྣམ་བྱུང",
		wylie: "rnam byung",
		phonetic: "nam jung",
		sanskrit: { devanagari: "विभव", iast: "Vibhava", meaning: "development, evolution" },
	}, // 2
	{
		tibetan: "དཀར་པོ",
		wylie: "dkar po",
		phonetic: "kar po",
		sanskrit: { devanagari: "शुक्ल", iast: "Śukla", meaning: "white (the colour)" },
	}, // 3
	{
		tibetan: "རབ་མྱོས",
		wylie: "rab myos",
		phonetic: "rap nyö",
		sanskrit: { devanagari: "प्रमोद", iast: "Pramoda", meaning: "excessive joy, delight" },
	}, // 4
	{
		tibetan: "སྐྱེས་བདག",
		wylie: "skyes bdag",
		phonetic: "kyé dak",
		sanskrit: { devanagari: "प्रजापति", iast: "Prajāpati", meaning: "lord of creatures" },
	}, // 5
	{
		tibetan: "ཨང་གི་ར",
		wylie: "ang gi ra",
		phonetic: "ang gi ra",
		sanskrit: { devanagari: "आङ्गिरस", iast: "Āṅgirasa", meaning: "a descendant of Aṅgiras" },
	}, // 6
	{
		tibetan: "དཔལ་གདོང",
		wylie: "dpal gdong",
		phonetic: "pel dong",
		sanskrit: { devanagari: "श्रीमुख", iast: "Śrīmukha", meaning: "a beautiful face" },
	}, // 7
	{
		tibetan: "དངོས་པོ",
		wylie: "dngos po",
		phonetic: "ngö po",
		sanskrit: { devanagari: "भाव", iast: "Bhāva", meaning: "becoming, being" },
	}, // 8
	{
		tibetan: "ན་ཚོད་ལྡན",
		wylie: "na tshod ldan",
		phonetic: "na tsö den",
		sanskrit: { devanagari: "युवन्", iast: "Yuvan", meaning: "young, youthful" },
	}, // 9
	{
		tibetan: "འཛིན་བྱེད",
		wylie: "'dzin byed",
		phonetic: "dzin jé",
		sanskrit: { devanagari: "धातृ", iast: "Dhātṛ", meaning: "bearer, supporter" },
	}, // 10
	{
		tibetan: "དབང་ཕྱུག",
		wylie: "dbang phyug",
		phonetic: "wang chuk",
		sanskrit: { devanagari: "ईश्वर", iast: "Īśvara", meaning: "master, lord" },
	}, // 11
	{
		tibetan: "འབྲུ་མང་པོ",
		wylie: "'bru mang po",
		phonetic: "dru mang po",
		sanskrit: { devanagari: "बहुधान्य", iast: "Bahudhānya", meaning: "abounding in corn" },
	}, // 12
	{
		tibetan: "མྱོས་ལྡན",
		wylie: "myos ldan",
		phonetic: "nyö den",
		sanskrit: { devanagari: "प्रमाथी", iast: "Pramāthī", meaning: "stirring about" },
	}, // 13
	{
		tibetan: "རྣམ་གནོན",
		wylie: "rnam gnon",
		phonetic: "nam nön",
		sanskrit: { devanagari: "विक्रम", iast: "Vikrama", meaning: "valour, courage" },
	}, // 14
	{
		tibetan: "ཁྱུ་མཆོག",
		wylie: "khyu mchog",
		phonetic: "khyu chok",
		sanskrit: { devanagari: "वृषभ", iast: "Vṛṣabha", meaning: "the chief, most excellent" },
	}, // 15
	{
		tibetan: "སྣ་ཚོགས",
		wylie: "sna tshogs",
		phonetic: "na tsok",
		sanskrit: { devanagari: "चित्रभानु", iast: "Citrabhānu", meaning: "of variegated lustre" },
	}, // 16
	{
		tibetan: "ཉི་མ",
		wylie: "nyi ma",
		phonetic: "nyi ma",
		sanskrit: { devanagari: "स्वभानु", iast: "Svabhānu", meaning: "self-luminous" },
	}, // 17
	{
		tibetan: "ཉི་སྒྲོལ་བྱེད",
		wylie: "nyi sgrol byed",
		phonetic: "nyi dröl jé",
		sanskrit: { devanagari: "तारण", iast: "Tāraṇa", meaning: "liberating, saving" },
	}, // 18
	{
		tibetan: "ས་སྐྱོང",
		wylie: "sa skyong",
		phonetic: "sa kyong",
		sanskrit: { devanagari: "पार्थिव", iast: "Pārthiva", meaning: "a lord of the earth" },
	}, // 19
	{
		tibetan: "མི་ཟད",
		wylie: "mi zad",
		phonetic: "mi zé",
		sanskrit: {
			devanagari: "अव्यय/व्यय",
			iast: "Avyaya/Vyaya",
			meaning: "not liable to change, imperishable",
		},
	}, // 20
	{
		tibetan: "ཐམས་ཅད་འདུལ",
		wylie: "thams cad 'dul",
		phonetic: "tam ché dül",
		sanskrit: { devanagari: "सर्वजित्", iast: "Sarvajit", meaning: "all-conquering" },
	}, // 21
	{
		tibetan: "ཀུན་འཛིན",
		wylie: "kun 'dzin",
		phonetic: "kün dzin",
		sanskrit: { devanagari: "सर्वधारी", iast: "Sarvadhārī", meaning: "all-holder" },
	}, // 22
	{
		tibetan: "འགལ་བ",
		wylie: "'gal ba",
		phonetic: "gel ba",
		sanskrit: { devanagari: "विरोधी", iast: "Virodhī", meaning: "opposing, hindering" },
	}, // 23
	{
		tibetan: "རྣམ་འགྱུར",
		wylie: "rnam 'gyur",
		phonetic: "nam gyur",
		sanskrit: { devanagari: "विकृति", iast: "Vikṛti", meaning: "change, alteration" },
	}, // 24
	{
		tibetan: "བོང་བུ",
		wylie: "bong bu",
		phonetic: "bong bu",
		sanskrit: { devanagari: "खर", iast: "Khara", meaning: "a donkey" },
	}, // 25
	{
		tibetan: "དགའ་བ",
		wylie: "dga' ba",
		phonetic: "ga ba",
		sanskrit: { devanagari: "नन्दन", iast: "Nandana", meaning: "rejoicing, gladdening" },
	}, // 26
	{
		tibetan: "རྣམ་རྒྱལ",
		wylie: "rnam rgyal",
		phonetic: "nam gyel",
		sanskrit: { devanagari: "विजय", iast: "Vijaya", meaning: "victory, conquest" },
	}, // 27
	{
		tibetan: "རྒྱལ་བ",
		wylie: "rgyal ba",
		phonetic: "gyel ba",
		sanskrit: { devanagari: "जय", iast: "Jaya", meaning: "conquest, victory" },
	}, // 28
	{
		tibetan: "མྱོས་བྱེད",
		wylie: "myos byed",
		phonetic: "nyö jé",
		sanskrit: { devanagari: "मन्मथ", iast: "Manmatha", meaning: "love or the god of love" },
	}, // 29
	{
		tibetan: "གདོང་ངན",
		wylie: "gdong ngan",
		phonetic: "dong ngen",
		sanskrit: { devanagari: "दुर्मुख", iast: "Durmukha", meaning: "ugly-faced" },
	}, // 30
	{
		tibetan: "གསེར་འཕྱང",
		wylie: "gser 'phyang",
		phonetic: "ser chang",
		sanskrit: { devanagari: "हेमलम्ब", iast: "Hemalamba", meaning: "hanging gold" },
	}, // 31
	{
		tibetan: "རྣམ་འཕྱང",
		wylie: "rnam 'phyang",
		phonetic: "nam chang",
		sanskrit: { devanagari: "विळम्बि", iast: "Viḷambi", meaning: "hanging down, pendulous" },
	}, // 32
	{
		tibetan: "སྒྱུར་བྱེད",
		wylie: "sgyur byed",
		phonetic: "gyur jé",
		sanskrit: { devanagari: "विकारि", iast: "Vikāri", meaning: "liable to change, changeable" },
	}, // 33
	{
		tibetan: "ཀུན་ལྡན",
		wylie: "kun ldan",
		phonetic: "kün den",
		sanskrit: { devanagari: "शार्वरी", iast: "Śārvarī", meaning: "belonging to night, nocturnal" },
	}, // 34
	{
		tibetan: "འཕར་བ",
		wylie: "'phar ba",
		phonetic: "par ba",
		sanskrit: { devanagari: "प्लव", iast: "Plava", meaning: "jumping, leaping" },
	}, // 35
	{
		tibetan: "དགེ་བྱེད",
		wylie: "dge byed",
		phonetic: "gé jé",
		sanskrit: { devanagari: "शुभकृत्", iast: "Śubhakṛt", meaning: "causing welfare, auspicious" },
	}, // 36
	{
		tibetan: "མཛེས་བྱེད",
		wylie: "mdzes byed",
		phonetic: "dzé jé",
		sanskrit: { devanagari: "शोभन", iast: "Śobhana", meaning: "brilliant, splendid" },
	}, // 37
	{
		tibetan: "ཁྲོ་མོ",
		wylie: "khro mo",
		phonetic: "tro mo",
		sanskrit: { devanagari: "क्रोधी", iast: "Krodhī", meaning: "passionate, violent" },
	}, // 38
	{
		tibetan: "སྣ་ཚོགས་དབྱིག",
		wylie: "sna tshogs dbyig",
		phonetic: "na tsok yik",
		sanskrit: { devanagari: "विश्वावसु", iast: "Viśvāvasu", meaning: "beneficent to all" },
	}, // 39
	{
		tibetan: "ཟིལ་གནོན",
		wylie: "zil gnon",
		phonetic: "zil nön",
		sanskrit: { devanagari: "पराभव", iast: "Parābhava", meaning: "overthrow, defeat" },
	}, // 40
	{
		tibetan: "སྤྲེའུ",
		wylie: "spre'u",
		phonetic: "treu",
		sanskrit: { devanagari: "प्लवङ्ग", iast: "Plavaṅga", meaning: "a monkey" },
	}, // 41
	{
		tibetan: "ཕུར་བུ",
		wylie: "phur bu",
		phonetic: "pur bu",
		sanskrit: { devanagari: "कीलक", iast: "Kīlaka", meaning: "a pin, bolt" },
	}, // 42
	{
		tibetan: "ཞི་བ",
		wylie: "zhi ba",
		phonetic: "zhi ba",
		sanskrit: { devanagari: "सौम्य", iast: "Saumya", meaning: "placid, gentle" },
	}, // 43
	{
		tibetan: "ཐུན་མོང",
		wylie: "thun mong",
		phonetic: "tün mong",
		sanskrit: {
			devanagari: "साधारण",
			iast: "Sādhāraṇa",
			meaning: "belonging or applicable to many",
		},
	}, // 44
	{
		tibetan: "འགལ་བྱེད",
		wylie: "'gal byed",
		phonetic: "gel jé",
		sanskrit: { devanagari: "विरोधकृत", iast: "Virodhakṛta", meaning: "causing dissension" },
	}, // 45
	{
		tibetan: "ཡོངས་འཛིན",
		wylie: "yongs 'dzin",
		phonetic: "yong dzin",
		sanskrit: { devanagari: "परिधावी", iast: "Paridhāvī", meaning: "running round" },
	}, // 46
	{
		tibetan: "བག་མེད",
		wylie: "bag med",
		phonetic: "bak mé",
		sanskrit: { devanagari: "प्रमादी", iast: "Pramādī", meaning: "negligent, careless" },
	}, // 47
	{
		tibetan: "ཀུན་དགའ",
		wylie: "kun dga'",
		phonetic: "kün ga",
		sanskrit: { devanagari: "आनंद", iast: "Ānaṃda", meaning: "happiness, joy" },
	}, // 48
	{
		tibetan: "སྲིན་བུ",
		wylie: "srin bu",
		phonetic: "sin bu",
		sanskrit: { devanagari: "राक्षस", iast: "Rākṣasa", meaning: "an evil or malignant demon" },
	}, // 49
	{
		tibetan: "མེ",
		wylie: "me",
		phonetic: "mé",
		sanskrit: { devanagari: "नल/अनल", iast: "Nala/Anala", meaning: "fire" },
	}, // 50
	{
		tibetan: "དམར་སེར་ཅན",
		wylie: "dmar ser can",
		phonetic: "mar ser chen",
		sanskrit: { devanagari: "पिंगल", iast: "Piṃgala", meaning: "reddish-brown, tawny" },
	}, // 51
	{
		tibetan: "དུས་ཀྱི་ཕོ་ཉ",
		wylie: "dus kyi pho nya",
		phonetic: "dü kyi po nya",
		sanskrit: { devanagari: "कालयुक्त", iast: "Kālayukta", meaning: "fit for the (present) time" },
	}, // 52
	{
		tibetan: "དོན་གྲུབ",
		wylie: "don grub",
		phonetic: "dön drup",
		sanskrit: {
			devanagari: "सिद्धार्थी",
			iast: "Siddhārthī",
			meaning: "one who has accomplished an aim",
		},
	}, // 53
	{
		tibetan: "དྲག་པོ",
		wylie: "drag po",
		phonetic: "drak po",
		sanskrit: { devanagari: "रौद्र", iast: "Raudra", meaning: "savageness, fierceness" },
	}, // 54
	{
		tibetan: "བློ་ངན",
		wylie: "blo ngan",
		phonetic: "lo ngen",
		sanskrit: { devanagari: "दुर्मति", iast: "Durmati", meaning: "weak-minded, silly" },
	}, // 55
	{
		tibetan: "རྔ་ཆེན",
		wylie: "rnga chen",
		phonetic: "nga chen",
		sanskrit: { devanagari: "दुन्दुभि", iast: "Dundubhi", meaning: "a sort of large kettledrum" },
	}, // 56
	{
		tibetan: "ཁྲག་སྐྱུག",
		wylie: "khrag skyug",
		phonetic: "trak kyuk",
		sanskrit: { devanagari: "रुधिरोद्गारी", iast: "Rudhirodgārī", meaning: "emitting blood" },
	}, // 57
	{
		tibetan: "མིག་དམར",
		wylie: "mig dmar",
		phonetic: "mik mar",
		sanskrit: { devanagari: "रक्ताक्ष", iast: "Raktākṣa", meaning: "red-eyed" },
	}, // 58
	{
		tibetan: "ཁྲོ་བོ",
		wylie: "khro bo",
		phonetic: "tro bo",
		sanskrit: { devanagari: "क्रोधन", iast: "Krodhana", meaning: "inclined to wrath, passionate" },
	}, // 59
	{
		tibetan: "ཟད་པ",
		wylie: "zad pa",
		phonetic: "zé pa",
		sanskrit: { devanagari: "क्षय", iast: "Kṣaya", meaning: "destruction, decay" },
	}, // 60
]);

/**
 * The Tibetan and Sanskrit name at a rabjung position.
 *
 * @param position - 1–60. Every caller here has already computed this via `(Y − 1026) amod 60`,
 * which is always in range, so an out-of-range position is an internal bug, not user input.
 */
export function rabjungNameOf(position: number): RabjungName {
	return assertInternal(
		RABJUNG_NAMES[position - 1],
		`rabjung position ${position} is forced into 1..60 by amod and RABJUNG_NAMES has sixty entries`,
	);
}
