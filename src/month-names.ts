/**
 * The names of a Tibetan month: its lunar mansion, its Indian month name, and its season in each of
 * the four seasonal systems Janson enumerates.
 *
 * @remarks
 * **Every system is returned, and none is chosen.** Janson's month-names section says almanacs "often
 * give two or several different versions", and the two authorities who attribute a system to Tsurphu
 * disagree about which one (Janson the late-winter identification, Henning p. 196 the early-spring
 * one). So there is no selector and no tradition default: picking a system is a property read.
 *
 * Every Tibetan string here, and every Indian month name, was verified by
 * `scripts/verify-month-and-yoga-names.mjs` before it was written down — see
 * [`docs/names/month-and-yoga-sourcing.md`](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/names/month-and-yoga-sourcing.md) for the evidence and the variants not chosen.
 *
 * The mansion's Sanskrit comes from the other verifier, `scripts/verify-mansion-and-trigram-names.mjs`,
 * because it is the same string that script emits for the mansion itself; its evidence is in
 * [`docs/names/mansion-and-trigram-sourcing.md`](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/names/mansion-and-trigram-sourcing.md).
 *
 * @packageDocumentation
 */
// `test/month-names.test.ts` holds each table against the month-and-yoga verifier's emitted fixture.
// A default system can be added later as an optional config member without breaking anyone.

import { mod } from "./computation/arithmetic.js";
import { assertInternal } from "./errors.js";
import { deepFreeze } from "./freeze.js";
import { boundedMonth } from "./months.js";
import { PHUGPA } from "./traditions/phugpa.js";
import type { TraditionConfig } from "./traditions/types.js";
import type { SanskritName, TibetanMonthFields, TibetanName } from "./types.js";

/** A month's place in one of the three four-season systems. */
export interface FourSeasonMonthName {
	/** One of the four temperate seasons, Jäschke's *dus* 4. */
	readonly season: "spring" | "summer" | "autumn" | "winter";
	/** Which of the season's three months: Janson's early-, mid- and late-, with *mid* spelled out. */
	readonly part: "early" | "middle" | "late";
	/** The season-month compound, e.g. *dpyid zla ra ba* for early spring. */
	readonly tibetanName: TibetanName;
}

/** A month's place in the six-season system. */
export interface SixSeasonMonthName {
	/**
	 * One of the six Indian seasons, each keyed by Monier-Williams' English for its Sanskrit name.
	 *
	 * @remarks
	 * `cold` is hemanta and `dewy` is śiśira. `spring`, `summer` and `autumn` are also four-season
	 * keys, and **a shared key does not mean the same months**: six-season `summer` is months 5 and 6,
	 * and no four-season system's `summer` is exactly those.
	 */
	readonly season: "spring" | "summer" | "rains" | "autumn" | "cold" | "dewy";
	/** Which of the season's two months. */
	readonly part: "early" | "late";
	/**
	 * The **season's** name, not the month's — *dgun smad*, not a month compound.
	 *
	 * @remarks
	 * No source gives a six-season month compound, so none is composed. The literal sense can clash
	 * with the key: month 1 is `{ season: "dewy", part: "early" }` and its Tibetan, *dgun smad*, reads
	 * "late winter", because the six-season `dewy` is the later half of the Tibetan winter.
	 */
	readonly tibetanName: TibetanName;
	/** The season's Sanskrit name, e.g. *śiśira*. */
	readonly sanskritName: SanskritName;
}

/** Every name a Tibetan month carries, one member per naming system. */
export interface MonthNames {
	/**
	 * The lunar mansion the month is named for, where its full moon approximately falls.
	 *
	 * @remarks
	 * Bare, as Janson, Henning and the Mahāvyutpatti all print it — *mchu*, not *mchu zla ba* — which
	 * makes several of them **homographs**: *mchu* is also "lip", and *mgo* and *rgyal* are ordinary
	 * words too. Month 8's *khrums* is not itself a mansion name but the stem the mansions
	 * *khrums stod* and *khrums smad* share.
	 *
	 * `sanskritName` is the **mansion's** name, not the Indian month's: month 1 is *maghā*, where the
	 * month derived from it is *māgha*. Sanskrit has two words where Tibetan has one, and this member
	 * holds the one its `tibetanName` renders; {@link MonthNames.indianMonth} holds the other. Month 8
	 * carries the pair's name *bhadrapadā*, which drops *pūrva* and *uttara* exactly as *khrums* drops
	 * *stod* and *smad*.
	 *
	 * There is no mansion index here, unlike `./astrology`'s `LunarMansion`: month 8's name stands for
	 * two mansions.
	 */
	readonly mansion: { readonly tibetanName: TibetanName; readonly sanskritName: SanskritName };
	/**
	 * The month's own Sanskrit name, as the Indian calendar names it: *māgha* for month 1, where
	 * {@link MonthNames.mansion} carries the mansion *maghā*.
	 *
	 * @remarks
	 * Sanskrit only. Tibetan has no separate word for the month — it calls the month by its mansion,
	 * which `mansion.tibetanName` already carries — and no source prints an English name.
	 *
	 * Each is the name Monier-Williams defines the month by, except **month 5, *jyeṣṭha***, where he
	 * defines *jyaiṣṭha* and gives *jyeṣṭha* only as a variant. It ships as the Vimalaprabhā, Janson and
	 * the Mahāvyutpatti print it — none has the *ai* — and still differs from the mansion, *jyeṣṭhā*.
	 * Month 10 is *kārttika*; *kārtika*, which the Vimalaprabhā also prints, is the same word spelled
	 * without the doubled consonant.
	 */
	readonly indianMonth: { readonly sanskritName: SanskritName };
	/** The three systems naming twelve months as early, middle and late of four seasons. */
	readonly fourSeasons: {
		/** Month 1 is late winter: the original Kālacakra identification, which Janson attributes to Tsurphu. */
		readonly month1LateWinter: FourSeasonMonthName;
		/** Month 1 is early spring: the Phugpa version of the Kālacakra system, Janson's "seasonal I". */
		readonly month1EarlySpring: FourSeasonMonthName;
		/**
		 * The Tiger month is early spring, as in the Chinese calendar — Janson's "seasonal II" under Phugpa.
		 *
		 * @remarks
		 * `null` where the tradition's month animals are unsourced, which is `BHUTAN` and
		 * `BHUTAN_HENNING`: without a Tiger month there is nothing to anchor this system on. The other
		 * members still answer, since none of them depends on the animals.
		 */
		readonly tigerEarlySpring: FourSeasonMonthName | null;
	};
	/** The Indian system of six seasons with two months each. */
	readonly sixSeasons: {
		/** Month 3, *nag pa*, is early spring: Janson's two statements, and Henning pp. 358–359 for all twelve. */
		readonly month3EarlySpring: SixSeasonMonthName;
	};
}

const freeze = <T>(value: T): T => deepFreeze(value);
const tibetan = (script: string, wylie: string, phonetic: string): TibetanName => ({
	tibetan: script,
	wylie,
	phonetic,
});

/**
 * Months 1–12, each with the mansion it is named for in both languages.
 *
 * @remarks
 * The Sanskrit is the mansion's, so eleven of these are the same strings
 * `scripts/verify-mansion-and-trigram-names.mjs` emits for the 27 mansions, and
 * `test/month-names.test.ts` holds them against that fixture by Wylie so the two cannot drift.
 * Month 8 is the twelfth: *khrums* names mansions 24 and 25 together, so it takes the pair's own
 * name, which Monier-Williams prints on p. 746 as "N. of the 3rd and 4th lunar asterisms".
 */
const MANSIONS: readonly {
	readonly tibetanName: TibetanName;
	readonly sanskritName: SanskritName;
}[] = freeze(
	(
		[
			[tibetan("མཆུ", "mchu", "chu"), "maghā", "मघा"],
			[tibetan("དབོ", "dbo", "wo"), "uttaraphalgunī", "उत्तरफल्गुनी"],
			[tibetan("ནག་པ", "nag pa", "nakpa"), "citrā", "चित्रा"],
			[tibetan("ས་ག", "sa ga", "saga"), "viśākhā", "विशाखा"],
			[tibetan("སྣྲོན", "snron", "nön"), "jyeṣṭhā", "ज्येष्ठा"],
			[tibetan("ཆུ་སྟོད", "chu stod", "chutö"), "pūrvāṣāḍhā", "पूर्वाषाढा"],
			[tibetan("གྲོ་བཞིན", "gro bzhin", "drozhin"), "śravaṇā", "श्रवणा"],
			[tibetan("ཁྲུམས", "khrums", "trum"), "bhadrapadā", "भद्रपदा"],
			[tibetan("ཐ་སྐར", "tha skar", "takar"), "aśvinī", "अश्विनी"],
			[tibetan("སྨིན་དྲུག", "smin drug", "mindruk"), "kṛttikā", "कृत्तिका"],
			[tibetan("མགོ", "mgo", "go"), "mṛgaśiras", "मृगशिरस्"],
			[tibetan("རྒྱལ", "rgyal", "gyel"), "puṣya", "पुष्य"],
		] as const
	).map(([tibetanName, iast, devanagari]) => ({ tibetanName, sanskritName: { iast, devanagari } })),
);

/**
 * Months 1–12, each with the Indian month's Sanskrit name.
 *
 * @remarks
 * Verified by `scripts/verify-month-and-yoga-names.mjs` and held against its fixture by
 * `test/month-names.test.ts`; the rule, the month-5 exception and both witnesses' divergences are in
 * [`docs/names/month-and-yoga-sourcing.md`](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/names/month-and-yoga-sourcing.md).
 */
const INDIAN_MONTHS: readonly { readonly sanskritName: SanskritName }[] = freeze(
	(
		[
			["māgha", "माघ"],
			["phālguna", "फाल्गुन"],
			["caitra", "चैत्र"],
			["vaiśākha", "वैशाख"],
			["jyeṣṭha", "ज्येष्ठ"],
			["āṣāḍha", "आषाढ"],
			["śrāvaṇa", "श्रावण"],
			["bhādrapada", "भाद्रपद"],
			["āśvina", "आश्विन"],
			["kārttika", "कार्त्तिक"],
			["mārgaśīrṣa", "मार्गशीर्ष"],
			["pauṣa", "पौष"],
		] as const
	).map(([iast, devanagari]) => ({ sanskritName: { iast, devanagari } })),
);

/** Early spring first, then every later month of the four-season year. */
const FOUR_SEASONS: readonly FourSeasonMonthName[] = freeze([
	{
		season: "spring",
		part: "early",
		tibetanName: tibetan("དཔྱིད་ཟླ་ར་བ", "dpyid zla ra ba", "chinda rawa"),
	},
	{
		season: "spring",
		part: "middle",
		tibetanName: tibetan("དཔྱིད་ཟླ་འབྲིང་པོ", "dpyid zla 'bring po", "chinda dringpo"),
	},
	{
		season: "spring",
		part: "late",
		tibetanName: tibetan("དཔྱིད་ཟླ་ཐ་ཆུང", "dpyid zla tha chung", "chinda tachung"),
	},
	{
		season: "summer",
		part: "early",
		tibetanName: tibetan("དབྱར་ཟླ་ར་བ", "dbyar zla ra ba", "yanda rawa"),
	},
	{
		season: "summer",
		part: "middle",
		tibetanName: tibetan("དབྱར་ཟླ་འབྲིང་པོ", "dbyar zla 'bring po", "yanda dringpo"),
	},
	{
		season: "summer",
		part: "late",
		tibetanName: tibetan("དབྱར་ཟླ་ཐ་ཆུང", "dbyar zla tha chung", "yanda tachung"),
	},
	{
		season: "autumn",
		part: "early",
		tibetanName: tibetan("སྟོན་ཟླ་ར་བ", "ston zla ra ba", "tönda rawa"),
	},
	{
		season: "autumn",
		part: "middle",
		tibetanName: tibetan("སྟོན་ཟླ་འབྲིང་པོ", "ston zla 'bring po", "tönda dringpo"),
	},
	{
		season: "autumn",
		part: "late",
		tibetanName: tibetan("སྟོན་ཟླ་ཐ་ཆུང", "ston zla tha chung", "tönda tachung"),
	},
	{
		season: "winter",
		part: "early",
		tibetanName: tibetan("དགུན་ཟླ་ར་བ", "dgun zla ra ba", "günda rawa"),
	},
	{
		season: "winter",
		part: "middle",
		tibetanName: tibetan("དགུན་ཟླ་འབྲིང་པོ", "dgun zla 'bring po", "günda dringpo"),
	},
	{
		season: "winter",
		part: "late",
		tibetanName: tibetan("དགུན་ཟླ་ཐ་ཆུང", "dgun zla tha chung", "günda tachung"),
	},
]);

/** Spring first; each season covers two consecutive months, `early` then `late`. */
const SIX_SEASONS: readonly Omit<SixSeasonMonthName, "part">[] = freeze([
	{
		season: "spring",
		tibetanName: tibetan("དཔྱིད", "dpyid", "chi"),
		sanskritName: { iast: "vasanta", devanagari: "वसन्त" },
	},
	{
		season: "summer",
		tibetanName: tibetan("སོས་ཀ", "sos ka", "söka"),
		sanskritName: { iast: "grīṣma", devanagari: "ग्रीष्म" },
	},
	{
		season: "rains",
		tibetanName: tibetan("དབྱར", "dbyar", "yar"),
		sanskritName: { iast: "varṣā", devanagari: "वर्षा" },
	},
	{
		season: "autumn",
		tibetanName: tibetan("སྟོན", "ston", "tön"),
		sanskritName: { iast: "śarad", devanagari: "शरद्" },
	},
	{
		season: "cold",
		tibetanName: tibetan("དགུན་སྟོད", "dgun stod", "güntö"),
		sanskritName: { iast: "hemanta", devanagari: "हेमन्त" },
	},
	{
		season: "dewy",
		tibetanName: tibetan("དགུན་སྨད", "dgun smad", "günmé"),
		sanskritName: { iast: "śiśira", devanagari: "शिशिर" },
	},
]);

/** The two halves of each six-season season, precomputed so a call hands out only frozen leaves. */
const SIX_SEASON_MONTHS: readonly SixSeasonMonthName[] = freeze(
	// Built field by field, not spread, so the keys print in the interface's order.
	SIX_SEASONS.flatMap((s) =>
		(["early", "late"] as const).map((part) => ({
			season: s.season,
			part,
			tibetanName: s.tibetanName,
			sanskritName: s.sanskritName,
		})),
	),
);

const at = <T>(table: readonly T[], index: number, what: string): T =>
	assertInternal(table[index], `${what}: index ${index} is outside the table`);

/**
 * Returns how many months month `month` lies after the tradition's Tiger month, 0–11, or `null`
 * where the tradition has no sourced month-animal list.
 *
 * @remarks
 * Internal, and shared with `./astrology`'s month attribute (`astrology/month.ts`), so the two layers
 * read the Tiger month through one definition. **It does not refuse**: `./astrology` throws
 * `TCT_ATTRIBUTE_NOT_SOURCED` for a tradition without the list, while {@link monthNamesFor} reports
 * `null` for the one system that needs it. The refusal stays in `./astrology`.
 */
export function monthsAfterTigerMonth(tradition: TraditionConfig, month: number): number | null {
	const animals = tradition.naming?.monthAnimals;
	return animals === undefined ? null : mod(month - animals.tigerMonth, 12);
}

/**
 * Returns every name of a Tibetan month: its lunar mansion, its Indian month name, and its season in
 * each seasonal system.
 *
 * @remarks
 * **All four seasonal systems at once**, because almanacs print several side by side and no source
 * makes one of them a tradition's only answer. Read the one you want. The same `season` key names
 * different months in different systems — under Phugpa, month 1 is `winter` in one, `spring` in two, and `dewy` in
 * the six-season list — so a key is only meaningful together with the system it came from.
 *
 * **A leap month takes its regular month's names**, in every system. `isLeapMonth` is still validated
 * by the month tier's guard, like everything else here: the year, the month number, the leap flag
 * against that year's actual leap month, and the tradition's exact range are all checked, although no
 * name depends on the year.
 *
 * **`tradition` defaults to `PHUGPA`**, as everywhere in this package, and a `TibetanMonthFields`
 * carries no tradition of its own. So a Bhutanese caller who omits it gets Phugpa's
 * `tigerEarlySpring` rather than `null`, and a Bhutanese leap month can fail Phugpa's leap check. Pass
 * the tradition. Janson's Bhutan appendix says only that month names "exist as in Tibet, … but are
 * usually not used", and does not say which seasonal version.
 *
 * The result and its `fourSeasons` and `sixSeasons` groups are new objects on each call; the name
 * entries inside them (`mansion`, `indianMonth` and each season entry) are frozen and shared between
 * calls.
 *
 * @throws RangeError with code `TCT_FIELD_OUT_OF_RANGE` for a `year` or `month` that is a number but
 * not an integer or is out of range;
 * `TCT_INVALID_ARGUMENT` if `month` is not an object naming a Tibetan month, or its `year` or
 * `month` is absent or not a number, or `isLeapMonth` is not a boolean;
 * `TCT_INVALID_TRADITION_CONFIG` if `tradition` is not a valid config — `null` and a
 * `{ tradition }` bag included; `TCT_NO_SUCH_LEAP_MONTH` if `isLeapMonth` is set for a month with no
 * leap twin that year; or `TCT_OUTSIDE_EXACT_RANGE` past the tradition's exact range.
 *
 * @example
 * ```ts
 * // Phugpa. Month 1 of the Fire Horse year beginning in 2026.
 * const names = monthNamesFor({ year: 2153, month: 1 });
 * names.mansion.tibetanName.wylie;                   // "mchu"
 * names.mansion.sanskritName.iast;                   // "maghā" — the mansion
 * names.indianMonth.sanskritName.iast;               // "māgha" — the month named for it
 * names.fourSeasons.month1LateWinter.season;         // "winter"
 * names.fourSeasons.month1EarlySpring.tibetanName.wylie;   // "dpyid zla ra ba"
 * names.fourSeasons.tigerEarlySpring?.part;          // "late" — Phugpa's Tiger month is month 11
 * names.sixSeasons.month3EarlySpring.season;         // "dewy"
 *
 * monthNamesFor({ year: 2153, month: 1 }, BHUTAN).fourSeasons.tigerEarlySpring;
 * // null
 * ```
 */
export function monthNamesFor(
	month: TibetanMonthFields,
	tradition: TraditionConfig = PHUGPA,
): MonthNames {
	// Validates the tradition too, so it runs before the Tiger month is read off it.
	const { fields, scaled } = boundedMonth("monthNamesFor", month, "month", tradition);

	const m = fields.month;
	const tigerSteps = monthsAfterTigerMonth(scaled.tradition, m);

	return {
		mansion: at(MANSIONS, m - 1, "mansion"),
		indianMonth: at(INDIAN_MONTHS, m - 1, "indianMonth"),
		fourSeasons: {
			month1LateWinter: at(FOUR_SEASONS, mod(m - 2, 12), "month1LateWinter"),
			month1EarlySpring: at(FOUR_SEASONS, mod(m - 1, 12), "month1EarlySpring"),
			tigerEarlySpring:
				tigerSteps === null ? null : at(FOUR_SEASONS, tigerSteps, "tigerEarlySpring"),
		},
		sixSeasons: {
			month3EarlySpring: at(SIX_SEASON_MONTHS, mod(m - 3, 12), "month3EarlySpring"),
		},
	};
}
