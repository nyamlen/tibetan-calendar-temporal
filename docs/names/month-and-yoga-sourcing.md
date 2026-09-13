# Sourcing the month names, the season names and the elemental yogas

**Status: authored, and partly ahead of the code.**
It records the evidence and the decisions for three sets of names, and was written before the verifier that enforces them, so that the verifier was built from a record rather than from memory.
That verifier is now [scripts/verify-month-and-yoga-names.mjs](../../scripts/verify-month-and-yoga-names.mjs), and its output is `test/fixtures/month-names.ts` and `test/fixtures/yoga-names.ts`.
**The yoga names ship** — corrected, with Tibetan script and Devanāgarī — and `ELEMENTAL_YOGAS` is held against the fixture.
**The month and season names do not ship yet**; `monthNamesFor` is the next step.
It follows [rabjung-sourcing.md](rabjung-sourcing.md), and the rule it inherits from [validation-sources.md](../validation-sources.md): **agreement is only evidence if the source did not reach its answer the way we did.**

The three sets:

1. The twelve **lunar-mansion month names** — *mchu*, *dbo*, *nag pa* … — which Janson's month-names section lists and which Henning (p. 194) describes as the principal way almanacs identify a month.
2. The **seasonal month names**, in the four systems Janson's month-names section enumerates — three on four seasons and one on six (listed [below](#the-four-seasonal-systems)).
3. The ten **elemental yogas** that `ELEMENTAL_YOGAS` already ships in `./astrology` on Henning's authority alone, which [CLAUDE.md](../../CLAUDE.md) does not accept for a name.

## Why the existing verifier's checks were not enough

`scripts/verify-name-sources.mjs` proves a term exists by finding an English Wiktionary entry at exactly its Tibetan title.
For these terms that check fails in both directions:

- **It misses real terms.**
  Nine of the twelve mansion month names and every season-month compound (*dpyid zla ra ba* …) have no entry.
- **It passes wrong senses.**
  The three mansion names it does find are homographs: *mchu* is "lip", *mgo* "head", *rgyal* "victory".
  An entry's presence says nothing about the calendar sense — the same trap the rabjung work met at *rab byung* and on the Sanskrit side.

So existence is attested by dictionaries instead, read for sense, with the public-domain ones quoted and the copyrighted ones used only as gates.

The **script** checks carry over unchanged and every chosen form passes them: two EWTS converters (`jsewts` and `tibetan-ewts-converter`) produce identical script, the script converts back to the Wylie it came from, and it contains no discouraged vowel sign.
**Phonetics** come from THL's own converter, as for the shipped vocabulary.

## Sources, and what each is trusted for

| Source | Standing | Trusted for |
|---|---|---|
| **Mahāvyutpatti** महाव्युत्पत्ति (the 9th-century canonical Sanskrit–Tibetan lexicon) | Public domain; **independent of Janson and Henning** | The six seasons with their Sanskrit; eleven of the twelve months named by season, part *and* mansion, with the Sanskrit month; the mansion names as nakṣatras |
| **Jäschke**, *A Tibetan-English Dictionary* (1881) | Public domain, quotable by page | The four temperate seasons, and the six Indian seasons with their Western months (p. 255, s.v. *dus* 4); *dpyid-zla* (p. 328); *'phel-ba* (p. 357) |
| **Das**, *A Tibetan-English Dictionary* (1902) | Public domain, quotable by page; **partly dependent** — see below | Season-month compounds with their Sanskrit months (p. 268 winter, p. 554 autumn); *dbo zla ba* (p. 913) |
| **Monier-Williams**, *A Sanskrit-English Dictionary* (1899), via the Cologne scan | Public domain, quotable by page | The months most Indian seasons comprise; the English season words; the Sanskrit of the yogas |
| **Henning**, *Kālacakra and the Tibetan Calendar* (2007) | In copyright: facts and page citations only | The six-season list by month (pp. 358–359); the ten yogas (p. 204); the month identifications of Phugpa and Tsurphu (pp. 195–196) |
| ***tshig mdzod chen mo*** (1985), ***dung dkar tshig mdzod chen mo*** (2002) | Copyrighted, Tibetan–Tibetan: **gate only** | That a headword exists; the spelling of each member of a set an entry enumerates |
| Ives Waldo, Rangjung Yeshe | Copyrighted: **gate only**, and close to **one** witness between them | That a headword exists |

All the dictionaries come from the public aggregate that [scripts/tibetan-dictionary.mjs](../../scripts/tibetan-dictionary.mjs) reads from; that script itself reads only three of them, and the Mahāvyutpatti, *dung dkar* and the page indexes into the Jäschke and Das scans were read from the same aggregate for this work.

**Lineage cautions.**

- **Das is not independent of the canonical lexicons.**
  Jäschke and Das were 19th-century lexicographers who drew on them, and Das cites his source outright at p. 913 ("S. Lex.").
  Agreement between Das and the Mahāvyutpatti is corroboration, not a second witness.
- **The two Tibetan–Tibetan dictionaries are assumed, not shown, to be independent.**
  The *dung dkar* postdates the *tshig mdzod chen mo* by seventeen years, and nothing here establishes that it did not draw on it.
- **Henning's English season words are his own**, and Janson cites Henning for the complete six-season list, so those two are one witness there.

**How the Jäschke and Das pages were read.**
Their archive.org OCR is unusable as text — [rabjung-sourcing.md](rabjung-sourcing.md) records Jäschke returning 0 of 60 — so the OCR was used **only to find the page**, and every entry cited below was read from the page image.
Two traps met on the way: the scan index in the aggregate is approximate, and archive.org's `page_numbers.json` maps printed page *n* to a leaf **one higher** than the image that actually carries it.

**Henning's copy is a scan with an OCR text layer**, and that layer scrambles tables — columns slide against rows.
His month table and his yoga spellings were therefore confirmed by Andreas reading the scanned pages, not taken from the text.

## The four seasonal systems

Janson's month-names section gives four ways of naming the months by season.
Each is a fixed rule, and `monthNamesFor` computes all four and returns them side by side, because almanacs print several at once and no source makes one of them a tradition's only answer.

| System | Rule | Result property | Evidence |
|---|---|---|---|
| Original Kālacakra | Month 1 = late winter | `fourSeasons.month1LateWinter` | Janson; the Mahāvyutpatti and Das — [below](#the-original-kālacakra-system-is-attested-outside-jansons-lineage) |
| Phugpa's | Month 1 = early spring | `fourSeasons.month1EarlySpring` | Janson's month-names table; Henning p. 195 |
| Anchored on the animals | The Tiger month = early spring | `fourSeasons.tigerEarlySpring` | Janson; the tradition's `monthAnimals` decides which month is Tiger, so it is `null` where that is unsourced |
| Six seasons | Month 3 = early spring, two months to a season | `sixSeasons.month3EarlySpring` | Henning pp. 358–359 — [below](#six-seasons) |

The options bag's `tradition` defaults to `PHUGPA`, as it does everywhere on the surface.
That is **not** a default *system*: the tradition only decides which month is Tiger, and every system is always returned.
That no system is a tradition's default is deliberate — the authorities disagree about whose system is whose ([below](#the-original-kālacakra-system-is-attested-outside-jansons-lineage)).

## The seasons

### Four seasons

Jäschke p. 255, s.v. *dus*, sense 4: "Here Tibetans, of course, distinguish the four seasons of the temperate zone, *dpyid* spring, *dbyar* summer, *ston* autumn, *dgun* winter."

| Season | Tibetan | Wylie | THL phonetic |
|---|---|---|---|
| spring | དཔྱིད | dpyid | *chi* |
| summer | དབྱར | dbyar | *yar* |
| autumn | སྟོན | ston | *tön* |
| winter | དགུན | dgun | *gün* |

A season's three months are its early month ར་བ (Wylie `ra ba`; *ra ba*), its middle month འབྲིང་པོ (`'bring po`; *dring po*) and its late month ཐ་ཆུང (`tha chung`; *ta chung*), joined by ཟླ (`zla`, "month"): `dgun zla ra ba`, the early winter month.

**Chosen: `tha chung`**, not `tha chungs`.
Das writes *tha-chuṅ* throughout, and the Mahāvyutpatti uses both spellings.

### The original Kālacakra system is attested outside Janson's lineage

The Mahāvyutpatti names the months by season and part, and for eleven of them also by mansion, with the Sanskrit month:

| Sanskrit month | Mahāvyutpatti | Das 1902 |
|---|---|---|
| Phālguna फाल्गुन | `dpyid zla ra ba gre can` | — |
| Caitra चैत्र | `dpyid zla 'bring po nag pa` | — |
| Vaiśākha वैशाख | `dpyid zla tha chungs sa ga` | — |
| Jyaiṣṭha ज्यैष्ठ | `dbyar zla ra ba snron` | — |
| Āṣāḍha आषाढ | `dbyar zla 'bring po chu stod` | — |
| Śrāvaṇa श्रावण | `dbyar zla tha chung gro bzhin` | — |
| Bhādrapada भाद्रपद | `ston zla ra ba`, **with no mansion**; a separate entry gives `khrum smad` | *ston-zla ra-wa* भाद्रपद, p. 554 |
| Āśvina आश्विन | `ston zla 'bring po tha skar` | *ston-zla 'bring-po* आश्विन, p. 554 |
| Kārttika कार्त्तिक | `ston zla tha chungs smin drug` | *ston-zla tha-chuṅ* कार्त्तिक, p. 554 |
| Mārgaśīrṣa मार्गशीर्ष | `dgun zla ra ba mgo` | *dgun-zla ra-wa* मार्गशीर्ष, p. 268 |
| Pauṣa पौष | `dgun zla 'bring po rgyal` | *dgun-zla 'bring-po* पौष, p. 268 |
| Māgha माघ | `dgun zla tha chung mchu` | *dgun-zla tha-chuṅ* माघ, p. 268 |

Month 1 (`mchu`) is late winter and month 3 (`nag pa`) mid-spring — exactly the identification Janson's month-names section calls "the original Kālacakra identification, now used by the Tsurphu tradition".
The Mahāvyutpatti gives it from outside Janson's and Henning's lineage; Das agrees, but as corroboration, since he drew on the canonical lexicons.

The Bhādrapada row carries a small disagreement to keep: the Mahāvyutpatti's `khrum smad` is the *Uttara*bhadrapadā mansion, where Henning's month table pairs the month with *Pūrva*bhadrapadā.

The authorities differ on **whose** system this is.
Henning (p. 195) makes Tsurphu's month 1 *early spring*, and reports late winter only as Karma Ngelek Tendzin's reading from the Kālacakra standpoint.

### Six seasons

| Sanskrit | Months (Monier-Williams) | Months (Jäschke p. 255) | Mahāvyutpatti | Jäschke p. 255 | Das p. 268 | **Chosen** |
|---|---|---|---|---|---|---|
| vasanta वसन्त | Caitra, Vaiśākha (p. 930) | March, April | `dpyid` | *dpyid* "spring" | — | `dpyid` |
| grīṣma ग्रीष्म | Jyeṣṭha, Āṣāḍha (p. 374) | May, June | `sos ka`, `so ka` | *sos-ka* "hot season" | — | **`sos ka`** |
| varṣā वर्षा | none given; "the rains" under *varṣa* (p. 926) | July, August | `dbyar` | *dbyar* "rainy season" | — | `dbyar` |
| śarad शरद् | Bhādra and Āśvina, **or** Āśvina and Kārttika by region (p. 1057) | September, October | `ston` | *ston* "damp season" | — | `ston` |
| hemanta हेमन्त | Agrahāyaṇa (= Mārgaśīrṣa), Pauṣa (p. 1304) | November, December | `dgun` | *dgun-stod* "first part of winter" | *dgun-stod*; bare *dgun* glossed शिशिर | **`dgun stod`** |
| śiśira शिशिर | Māgha, Phālguna (p. 1076) | January, February | `dgun smad` | *dgun-smad* "last part of winter" | *dgun-smad* शिशिर | `dgun smad` |

**Why `dgun stod` over the Mahāvyutpatti's `dgun`.**
Jäschke and Das agree on `dgun stod` for hemanta, and bare `dgun` is ambiguous between the sources: the Mahāvyutpatti glosses it hemanta, while Das p. 268 glosses it शिशिर, the *other* half of winter.

**Why `sos ka`.**
The Mahāvyutpatti gives both spellings and Jäschke gives *sos-ka*.

**The six seasons by month** come from Henning's Appendix I, "The Indian months", pp. 358–359, confirmed against the scanned pages by eye:

| Month | Mansion name | Six-season (Henning's English) |
|---|---|---|
| 3 | `nag pa` | early spring |
| 4 | `sa ga` | late spring |
| 5 | `snron` | early summer |
| 6 | `chu stod` | late summer |
| 7 | `gro bzhin` | early rains |
| 8 | `khrums` | late rains |
| 9 | `tha skar` | early autumn |
| 10 | `smin drug` | late autumn |
| 11 | `mgo` | early pre-winter |
| 12 | `rgyal` | late pre-winter |
| 1 | `mchu` | early winter |
| 2 | `dbo` | late winter |

**How far the other sources bear it out, stated narrowly.**

- **Monier-Williams** gives months for four of the six seasons that match this table exactly (vasanta, grīṣma, hemanta, śiśira).
  It gives none for varṣā, and for śarad it gives two regional reckonings, of which Henning follows Āśvina and Kārttika.
  Its own entry for Āśvina (p. 159) calls it "a month in the rainy season", which sits against Henning's early autumn.
- **Jäschke** gives Western months for all six, and they line up with this table once each Tibetan month is read as roughly the Western month it mostly falls in.
- **Janson** states months 1 and 3 in prose and cites Henning for the complete list, and Ginzel (§75, pp. 345–346) and Richards (p. 195) for the system — two sources not consulted here.
- **Henning p. 196** gives months 1–4 from Jamgön Kongtrul, which is his own report and so not independent of the table.

Henning's English words are his own: he says (p. 196) that he adapted them from Indian usage in preference to translating the Tibetan terms.
So they are **not** used as keys — see below.

## The keys a consumer maps from

`monthNamesFor` returns stable English keys, like every other identifier this package ships (`"iron"`, `"mouse"`), plus the Tibetan name.
The keys are contract.

| Result | `season` | `part` | Source of the English |
|---|---|---|---|
| each of the three `fourSeasons` systems | `spring` `summer` `autumn` `winter` | `early` `middle` `late` | Jäschke p. 255; Janson's early-/mid-/late- (the key spells *mid* out as `middle`) |
| `sixSeasons` | `spring` `summer` `rains` `autumn` `cold` `dewy` | `early` `late` | Monier-Williams, one page per season, as below |

| Key | Monier-Williams |
|---|---|
| `spring` | vasanta वसन्त, p. 930: "spring" |
| `summer` | grīṣma ग्रीष्म, p. 374: "the summer, hot season" |
| `rains` | *varṣa* वर्ष (plural), p. 926: "the rains", cross-referred to varṣā वर्षा |
| `autumn` | śarad शरद्, p. 1057: "autumn" |
| `cold` | hemanta हेमन्त, p. 1304: "winter, the cold season" |
| `dewy` | śiśira शिशिर, p. 1076: "the cool or dewy season" |

For month 1 of royal-era year 2153 (the Tibetan year that began at Losar 2026), with the default `PHUGPA`, the month is `mchu`:

```ts
monthNamesFor({ year: 2153, month: 1 }).sixSeasons.month3EarlySpring;
// { season: "dewy", part: "early",
//   tibetanName: { tibetan: "དགུན་སྨད", wylie: "dgun smad", phonetic: "gün mé" },
//   sanskritName: { iast: "śiśira", devanagari: "शिशिर" } }
// — the first month of the dewy season, under the six-season system that puts early spring at month 3
```

The six-season Tibetan is the season's name alone.
No source gives a six-season month compound — there is no attested `dgun smad zla ra ba` — so none is composed.

### Why these six words, and not the alternatives

**`part` names a month within its season**, and each six-season season has two, so `part` is `early` or `late`.
That is what rules out naming the two halves of winter *as* halves of winter: a key set containing `early-winter` and `late-winter` gives Mārgaśīrṣa `{ season: "early-winter", part: "early" }` — "the early month of early winter" — and the doubling is structural, whatever other words the set uses.

| Candidate | Doubled early/late | Keeps spring, summer, autumn | Source of the English | Rejected because |
|---|---|---|---|---|
| Sanskrit in ASCII (`vasanta` … `shishira`) | No | No | Three sources agree | Breaks the English-key convention; the ASCII spelling of ś and ṣ is a house choice |
| Henning's (`pre-winter`, `winter`) | No | Yes | Henning alone | Authored, and contradicted by Monier-Williams, who calls hemanta winter |
| Jäschke's (`hot`, `rainy`, `damp`, first and last part of winter) | **Yes** | No | Jäschke alone | Still splits winter in two, and "damp" for śarad is his alone |
| `early-winter` / `late-winter` | **Yes** | Yes | Monier-Williams, Jäschke, Das | Clumsy: "the early month of early winter" |
| **Monier-Williams (`cold`, `dewy`)** | No | Yes | **Monier-Williams for all six** | — chosen |

`cold` is the second of Monier-Williams' two phrases for hemanta; his first, "winter", would collide with the four-season key.

**A shared key spans different months in each system**, and the docs of `monthNamesFor` must say so.
`summer` is Jyaiṣṭha and Āṣāḍha in `sixSeasons`, and three months — which three depends on the system — in each `fourSeasons` system.
The Tibetan repeats the same way: `dpyid` and `ston` name a season in both, and `dbyar` is four-season summer but six-season rains.

## The lunar-mansion month names

The Mahāvyutpatti lists the 28 nakṣatras, and eleven of the twelve month names are nakṣatra names as listed: `mchu` Maghā, `dbo` Uttaraphalgunī, `nag pa` Citrā, `sa ga` Viśākhā, `snron` Jyeṣṭhā, `chu stod` Pūrvāṣāḍhā, `gro bzhin` Śravaṇā, `tha skar` Aśvinī, `smin drug` Kṛttikā, `mgo` Mṛgaśirāḥ, `rgyal` Puṣya.
The twelfth, **`khrums`, is not a nakṣatra name as it stands**: the list has `khrums stod` Pūrvabhadrapadā and `khrums smad` Uttarabhadrapadā, and month 8's name is their shared stem.
This bears out Henning's remark (p. 358) that Tibetan uses the same names for the months and their mansions while Sanskrit does not: Tibetan `mchu` is both, while Sanskrit distinguishes Maghā, the mansion, from Māgha माघ, the month.
Monier-Williams gives each Sanskrit month with the nakṣatra its full moon falls in (Māgha p. 805, Caitra p. 402, Mārgaśīrṣa p. 812 …).
Henning (p. 357) notes that `gro bzhin` is given both for Śravaṇā and for Abhijit, where the Mahāvyutpatti has `byi bzhin` for Abhijit.

**Shipped bare** — `mchu`, not `mchu zla ba`.
Only the bare form is attested uniformly: Janson, Henning and the Mahāvyutpatti's nakṣatra list all give it (with `khrums` the stem of a pair), while the dictionaries' month compounds vary (`sa ga zla ba`, but `mchu zla` and `dbo zla`).
The cost is that a bare name is a homograph — `mchu` is also "lip" — which the docblock must state.

**Month 2 is `dbo`, and `gre can` is a documented variant.**
Janson and Henning give `dbo` (Uttaraphalgunī).
Das p. 913 has it in full as "*dwo-zla-wa* the 11th month of the Tibetan calendar corresponding to फाल्गुन of the Hindus (S. Lex.)" — the same month and the same Sanskrit, but numbered 11, as his p. 268 numbers the winter months 10 to 12; his numbering is not Phugpa's, and his source is a Sanskrit lexicon, so this is dependent corroboration.
The Mahāvyutpatti's month list gives `gre can` for Phālguna; its nakṣatra list spells that mansion `gre` (Pūrvaphalgunī).

**The Sanskrit month names follow the Tibetan** in a later step, as the rabjung names did, once the verifier settles spellings the sources vary on.
Henning (p. 359) prints *Kārtikka* and notes that the Vimalaprabhā usually has *Kārtika*, and uses both *Puṣya* and *Pauṣa*; Monier-Williams heads the month *Kārttika*.
That is three spellings of one month.
The Mahāvyutpatti has *jeṣṭhaḥ*, *aśviniḥ*, and *mṛgaśīrṣaḥ* beside *mārgaśīrṣaḥ*.

## The elemental yogas

Henning, p. 204, gives the ten with Tibetan, Sanskrit and English.
Two Tibetan–Tibetan dictionaries enumerate the set under a headword of their own — `'phrod sbyor` in the *tshig mdzod chen mo* and `'phrod sbyor bcu` in the *dung dkar tshig mdzod chen mo*.
The *tshig mdzod chen mo* names all ten; the *dung dkar* names eight, so **three names rest on one list**.
The two are not shown to be independent (see the lineage cautions above).

Forms are recorded exactly as each entry prints them: every name is followed by *sbyor*, "conjunction", and the *dung dkar* joins two of them to it with a genitive particle.

| Henning's Wylie | *tshig mdzod chen mo* | *dung dkar* | Henning's Sanskrit | Monier-Williams |
|---|---|---|---|---|
| dngos grub | `dngos grub sbyor` | `dngos grub sbyor` | siddhi सिद्धि | p. 1216: "accomplishment" — **not** the sense "a partic. Yoga (either the 16th or 19th)", and Henning's own list of astronomical yogas also has a Siddhi |
| bdud rtsi | `bdud rtsi sbyor` | `bdud rtsi sbyor` | amṛta अमृत | p. 82: "the nectar" |
| lang tsho | `lang tsho sbyor` | — | yauvana यौवन | p. 859: "youth" |
| 'phel 'gyur | `'phel 'gyur sbyor` | `'phel 'gyur sbyor` | pragati | **Not a headword** — see below |
| phun tshogs | `phun tshogs sbyor` | `tshogs sbyor` | saṃpanna सम्पन्न | *sam-panna*, p. 1172: "perfect, excellent" |
| stobs ldan | `stobs ldan sbyor` | — | balayukta बलयुक्त | p. 723: "powerful" |
| mi phrod | `mi 'phrod sbyor` | `mi 'phrod sbyor` | alābha अलाभ | p. 95: "non-acquirement" |
| mi mthun | `mi mthun sbyor` | `mi mthun sbyor` | pratikūla प्रतिकूल | p. 661: "contrary, adverse"; the Mahāvyutpatti pairs `mi mthun pa` with pratikūla |
| sreg pa | `bsreg sbyor` | `bsreg pa'i sbyor` | dahana दहन | p. 473: "burning" |
| 'chi ba | `'chi sbyor` | `'chi ba'i sbyor` | maraṇa मरण | p. 789: "death" |

**Two corrections, to be carried as self-invalidating data** on the `spen ma` → `spen pa` pattern.
Andreas confirmed against the scan that Henning prints `mi phrod` and `sreg pa`.

- **`mi phrod` → `mi 'phrod`.**
  Both enumerations print `mi 'phrod`, and `mi phrod` is a headword in none of the dictionaries swept.
  The Mahāvyutpatti does have `mi 'phrod pa`, but as prativāṇi, "contradiction" — a different sense, so it attests the spelling and nothing about the yoga.
- **`sreg pa` → `bsreg pa`**, correcting the prefix and nothing else.
  The two enumerations differ in form but not in the word.
  The *tshig mdzod chen mo* compounds every name directly onto *sbyor*, and a Tibetan compound drops the `-pa`/`-ba` nominaliser, so its `bsreg sbyor` and `'chi sbyor` are the compound forms of `bsreg pa` and `'chi ba`.
  The *dung dkar* keeps the full word and joins it with the genitive: `bsreg pa'i sbyor`, `'chi ba'i sbyor`.
  Read that way, both print `bsreg pa`, and they part from Henning only in the prefix — so the prefix is all the correction changes.
  It keeps the shipped names in one style, since `'chi ba` stays exactly as Henning prints it.
  `bsreg pa` is also a headword in Jäschke, Das, the *tshig mdzod chen mo*, Rangjung Yeshe and Ives Waldo.
  Unprefixed `sreg pa` is itself a Mahāvyutpatti headword (as havana, oblation, and as tittiri, the partridge), so its existence says nothing either way.
  Decided on 2026-09-13, after an earlier summary had wrongly reported bare `bsreg` in both enumerations.

The corrected `mi 'phrod` sounds the same as the original — both are *mi trö* — so that change is visible in script only: མི་འཕྲོད, not མི་ཕྲོད.
`bsreg pa` བསྲེག་པ is *sek pa*, the same as `sreg pa` སྲེག་པ, so it too changes only the script.

`'chi ba` needs no correction: the dictionaries' `'chi sbyor` and `'chi ba'i sbyor` are the compound and genitive forms of exactly the name that ships.

**What `'phel 'gyur` means.**
Jäschke p. 357, s.v. *'phel-ba*: "to increase, augment, multiply, enlarge … to improve, to grow better", its root glossed as Sanskrit वृध *vṛdh*.
`'gyur` is the verb of change: the Mahāvyutpatti pairs `'gyur ba'i sdug bsngal` with vipariṇāmaduḥkhatā विपरिणामदुःखता, the suffering of change.
So the name reads roughly "growing, becoming greater", which Henning renders "progress".

**Why *pragati* ships marked as Henning's alone.**
It is not a declension miss: Cologne is keyed by stem, and *pragati* is the stem.
It is absent from all five Cologne dictionaries tried — Monier-Williams 1899 and 1872, Böhtlingk and Roth, Apte, and Cappeller.
Two replacements were rejected.
*pragamana* प्रगमन, which Monier-Williams glosses "progress, advance" on Wilson's authority alone, is paired with `'phel 'gyur` by no source, so using it would be a correction without authored evidence.
*vṛddhi* वृद्धि fits Jäschke's root, but the only pairing found is Henning's (p. 359) of `'phel ba` with Vṛddhi **as the eleventh astronomical yoga** — a different set, and exactly the homograph a verifier would wrongly match.

**The licence line, widened by one fact.**
The copyrighted dictionaries may gate and may never be quoted, and [scripts/tibetan-dictionary.mjs](../../scripts/tibetan-dictionary.mjs) lists the facts that may be taken.
The yoga check needs one more: **the spelling of each member of a set that an entry enumerates** — which is what the table above records.
Approved on 2026-09-13; still never a gloss, and now in that table.
The same enumerations also pair each name with its elements and group the ten by favorability; neither is taken, since neither is on the list.

## Still open

- **The English of the yogas.**
  `ELEMENTAL_YOGAS` also ships Henning's English glosses (*accomplishment*, *deficiency*, *discord* …), and nothing here verifies them; they remain single-source.
  The Monier-Williams senses in the yoga table already match nine of them, all but *progress*, so the yoga verifier can check that match mechanically, as the rabjung verifier does.
- **Janson's other six-season sources**, Ginzel and Richards, which he cites for the system and which were not consulted.
- **The Tibetan and Sanskrit of the six-season *system*** as Kongtrul names it in Kālacakra usage.
  Henning prints no Tibetan for it, so the six-season Tibetan above rests on the general lexicons, not on a Kālacakra text.
- **Mahāvyutpatti citation.**
  It is cited here, and in the verifier's output, by entry — the Tibetan and Sanskrit exactly as the aggregate prints them.
  The aggregate's `63-Mahavyutpatti-Scan-1989` gives page references into a 1989 edition that is still not identified, and no section numbers were found, so none are claimed.
- **Sanskrit month names**, pending the spellings listed above.
