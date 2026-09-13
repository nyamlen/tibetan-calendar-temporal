# Sourcing the month names, the season names and the elemental yogas

**Status: authored, and ahead of the code.**
Nothing described here ships yet.
It records the evidence and the decisions for three sets of names before the verifier that will enforce them is written, so that verifier is built from a record rather than from memory.
It follows [rabjung-sourcing.md](rabjung-sourcing.md), and the rule it inherits from [validation-sources.md](../validation-sources.md): **agreement is only evidence if the source did not reach its answer the way we did.**

The three sets:

1. The twelve **lunar-mansion month names** — *mchu*, *dbo*, *nag pa* … — which Janson's month-names section lists and which Henning (p. 194) describes as the principal way almanacs identify a month.
2. The **seasonal month names**, in four systems: three on four seasons and one on six.
3. The ten **elemental yogas** that `ELEMENTAL_YOGAS` already ships in `./astrology` on Henning's authority alone, which [CLAUDE.md](../../CLAUDE.md) does not accept for a name.

## Why the existing verifier's checks were not enough

`scripts/verify-name-sources.mjs` proves a term exists by finding an English Wiktionary entry at exactly its Tibetan title.
For these terms that check fails in both directions:

- **It misses real terms.**
  Ten of the twelve mansion month names and every season-month compound (*dpyid zla ra ba* …) have no entry.
- **It passes wrong senses.**
  The three mansion names it finds are homographs: *mchu* is "lip", *mgo* "head", *rgyal* "victory".
  An entry's presence says nothing about the calendar sense — the same trap the rabjung work met at *rab byung* and on the Sanskrit side.

So existence is attested by dictionaries instead, read for sense, with the public-domain ones quoted and the copyrighted ones used only as gates.

The **script** checks carry over unchanged and every chosen form passes them: two EWTS converters (`jsewts` and `tibetan-ewts-converter`) produce identical script, the script converts back to the Wylie it came from, and it contains no discouraged vowel sign.
**Phonetics** come from THL's own converter, as for the shipped vocabulary.

## Sources, and what each is trusted for

| Source | Standing | Trusted for |
|---|---|---|
| **Mahāvyutpatti** (महाव्युत्पत्ति; the 9th-century canonical Sanskrit–Tibetan lexicon) | Public domain; **independent of Janson and Henning** | The six seasons with their Sanskrit; all twelve months named by season, part *and* mansion, with the Sanskrit month; the mansion names as nakṣatras |
| **Jäschke**, *A Tibetan-English Dictionary* (1881) | Public domain, quotable by page | The four temperate seasons and the six Indian seasons (p. 255, s.v. *dus* 4); *dpyid-zla* (p. 328); *'phel-ba* (p. 357) |
| **Das**, *A Tibetan-English Dictionary* (1902) | Public domain, quotable by page | Season-month compounds with their Sanskrit months (p. 268 winter, p. 554 autumn); *dbo zla ba* = Phālguna (p. 913) |
| **Monier-Williams**, *A Sanskrit-English Dictionary* (1899), via the Cologne scan | Public domain, quotable by page | The months each Indian season comprises; the English season words; the Sanskrit of the yogas |
| **Henning**, *Kālacakra and the Tibetan Calendar* (2007) | In copyright: facts and page citations only | The six-season list by month (pp. 358–359); the ten yogas (p. 204); Tsurphu's month identification (p. 196) |
| ***tshig mdzod chen mo***, ***dung dkar tshig mdzod chen mo*** | Copyrighted, Tibetan–Tibetan: **gate only** | That a headword exists; the spelling of each member of a set an entry enumerates |
| Ives Waldo, Rangjung Yeshe | Copyrighted: **gate only**, and close to **one** witness between them | That a headword exists |

The dictionaries come from the aggregate [scripts/tibetan-dictionary.mjs](../../scripts/tibetan-dictionary.mjs) already reads, including its Mahāvyutpatti files and the page indexes into the Jäschke and Das scans.

**Lineage cautions.**
Jäschke and Das were 19th-century lexicographers who drew on the canonical lexicons, so agreement between them and the Mahāvyutpatti is weaker than three independent witnesses.
Henning cites no source for his English season words, and Janson cites Henning for the complete six-season list, so those two are one witness there.

**How the Jäschke and Das pages were read.**
Their archive.org OCR is unusable as text — [rabjung-sourcing.md](rabjung-sourcing.md) records Jäschke returning 0 of 60 — so the OCR was used **only to find the page**, and every entry cited below was read from the page image.
Two traps met on the way: the scan index in the aggregate is approximate, and archive.org's `page_numbers.json` maps printed page *n* to a leaf **one higher** than the image that actually carries it.

**Henning's copy is a scan with an OCR text layer**, and that layer scrambles tables — columns slide against rows.
His month table and his yoga spellings were therefore confirmed by Andreas reading the scanned pages, not taken from the text.

## The seasons

### Four seasons

Jäschke p. 255, s.v. *dus*, sense 4: "Here Tibetans, of course, distinguish the four seasons of the temperate zone, *dpyid* spring, *dbyar* summer, *ston* autumn, *dgun* winter."

| Season | Tibetan | Wylie | THL phonetic |
|---|---|---|---|
| spring | དཔྱིད | dpyid | *chi* |
| summer | དབྱར | dbyar | *yar* |
| autumn | སྟོན | ston | *tön* |
| winter | དགུན | dgun | *gün* |

A season's three months are its *ra ba* ར་བ (*ra ba*, early), *'bring po* འབྲིང་པོ (*dring po*, middle) and *tha chung* ཐ་ཆུང (*ta chung*, late), joined by *zla* ཟླ, "month": *dgun zla ra ba*, the early winter month.

**Chosen: *tha chung***, not *tha chungs*.
Das writes *tha-chuṅ* throughout, and the Mahāvyutpatti uses both spellings.

### The Kālacakra-original system is attested outside Janson's lineage

The Mahāvyutpatti names all twelve months by season, part and mansion, with the Sanskrit month:

| Sanskrit month | Mahāvyutpatti | Das 1902 |
|---|---|---|
| Phālguna | *dpyid zla ra ba gre can* | — |
| Caitra | *dpyid zla 'bring po nag pa* | — |
| Vaiśākha | *dpyid zla tha chungs sa ga* | — |
| Jyaiṣṭha | *dbyar zla ra ba snron* | — |
| Āṣāḍha | *dbyar zla 'bring po chu stod* | — |
| Śrāvaṇa | *dbyar zla tha chung gro bzhin* | — |
| Bhādrapada | *ston zla ra ba* | *ston-zla ra-wa* भाद्रपद, p. 554 |
| Āśvina | *ston zla 'bring po tha skar* | *ston-zla 'bring-po* आश्विन, p. 554 |
| Kārttika | *ston zla tha chungs smin drug* | *ston-zla tha-chuṅ* कार्त्तिक, p. 554 |
| Mārgaśīrṣa | *dgun zla ra ba mgo* | *dgun-zla ra-wa* मार्गशीर्ष, p. 268 |
| Pauṣa | *dgun zla 'bring po rgyal* | *dgun-zla 'bring-po* पौष, p. 268 |
| Māgha | *dgun zla tha chung mchu* | *dgun-zla tha-chuṅ* माघ, p. 268 |

Month 1 (*mchu*) is late winter and month 3 (*nag pa*) mid-spring — exactly the identification Janson's month-names section calls "the original Kālacakra identification, now used by the Tsurphu tradition".
Janson and Henning give it, but a 9th-century lexicon and Das give it too, from outside their lineage.

The two authorities differ on **whose** system it is.
Henning (p. 196) makes Tsurphu's month 1 *early spring*, and reports late winter only as Karma Ngelek Tendzin's reading from the Kālacakra standpoint.
That disagreement is one reason `monthNamesFor` carries no tradition default.

### Six seasons

| Sanskrit | Months (Monier-Williams) | Mahāvyutpatti | Jäschke p. 255 | Das p. 268 | **Chosen** |
|---|---|---|---|---|---|
| vasanta वसन्त | Caitra, Vaiśākha (p. 930) | *dpyid* | *dpyid* "spring" | — | *dpyid* |
| grīṣma ग्रीष्म | Jyeṣṭha, Āṣāḍha (p. 374) | *sos ka*, *so ka* | *sos-ka* "hot season" | — | ***sos ka*** |
| varṣā वर्षा | "the rains", under *varṣa* (p. 926) | *dbyar* | *dbyar* "rainy season" | — | *dbyar* |
| śarad शरद् | Bhādra and Āśvina, **or** Āśvina and Kārttika by region (p. 1057) | *ston* | *ston* "damp season" | — | *ston* |
| hemanta हेमन्त | Agrahāyaṇa (= Mārgaśīrṣa), Pauṣa (p. 1304) | *dgun* | *dgun-stod* "first part of winter" | *dgun-stod* | ***dgun stod*** |
| śiśira शिशिर | Māgha, Phālguna (p. 1076) | *dgun smad* | *dgun-smad* "last part of winter" | *dgun-smad* | *dgun smad* |

**Why *dgun stod* over the Mahāvyutpatti's *dgun*.**
Jäschke and Das agree, and *dgun* alone is already the four-season *winter*, so a six-season result and a four-season result would print the same word for different spans.

**Why *sos ka*.**
The Mahāvyutpatti gives both spellings and Jäschke gives *sos-ka*.

**The six seasons by month** come from Henning's Appendix I, "The Indian months", pp. 358–359, confirmed against the scanned pages by eye:

| Month | Mansion name | Six-season (Henning's English) |
|---|---|---|
| 3 | *nag pa* | early spring |
| 4 | *sa ga* | late spring |
| 5 | *snron* | early summer |
| 6 | *chu stod* | late summer |
| 7 | *gro bzhin* | early rains |
| 8 | *khrums* | late rains |
| 9 | *tha skar* | early autumn |
| 10 | *smin drug* | late autumn |
| 11 | *mgo* | early pre-winter |
| 12 | *rgyal* | late pre-winter |
| 1 | *mchu* | early winter |
| 2 | *dbo* | late winter |

It is the standard Indian grouping: every pair matches the months Monier-Williams gives for the corresponding season.
Two things corroborate it without being independent of it — Janson's prose (months 1 and 3) cites Henning, and Henning's p. 196 gives months 1–4 from Jamgön Kongtrul.
Monier-Williams' caveat stands beside it: *śarad* is Bhādra and Āśvina in some regions, and Henning follows the other reckoning.

Henning's English words are his own: he says (p. 196) that he adapted them from Indian usage in preference to translating the Tibetan terms.
So they are **not** used as keys — see below.

## The keys a consumer maps from

`monthNamesFor` returns stable English keys, like every other identifier this package ships (`"iron"`, `"mouse"`), plus the Tibetan name.
The keys are contract.

| Key set | `season` | `part` | Source of the English |
|---|---|---|---|
| `fourSeasons` | `spring` `summer` `autumn` `winter` | `early` `middle` `late` | Jäschke p. 255; Janson's early-/mid-/late- |
| `sixSeasons` | `spring` `summer` `rains` `autumn` `cold` `dewy` | `early` `late` | Monier-Williams, one page per season, as below |

| Key | Monier-Williams |
|---|---|
| `spring` | vasanta, p. 930: "spring" |
| `summer` | grīṣma, p. 374: "the summer, hot season" |
| `rains` | *varṣa* (plural), p. 926: "the rains", cross-referred to *varṣā* |
| `autumn` | śarad, p. 1057: "autumn" |
| `cold` | hemanta, p. 1304: "winter, the cold season" |
| `dewy` | śiśira, p. 1076: "the cool or dewy season" |

For Phugpa month 1, *mchu*:

```ts
monthNamesFor({ year: 2153, month: 1 }).sixSeasons;
// { season: "dewy", part: "early", name: { tibetan: "དགུན་སྨད", wylie: "dgun smad", phonetic: "gün mé" } }
// — the first month of the dewy season
```

The six-season Tibetan is the season's name alone.
No source gives a six-season month compound — there is no attested *dgun smad zla ra ba* — so none is composed.

### Why these six words, and not the alternatives

**`part` names a month within its season**, and each six-season season has two, so `part` is `early` or `late`.
That is what rules out naming the two halves of winter *as* halves of winter: a key set containing `early-winter` and `late-winter` gives Mārgaśīrṣa `{ season: "early-winter", part: "early" }` — "the early month of early winter" — and the doubling is structural, whatever other words the set uses.

| Candidate | Doubled early/late | Keeps spring, summer, autumn | Source of the English | Rejected because |
|---|---|---|---|---|
| Sanskrit in ASCII (`vasanta` … `shishira`) | No | No | Three sources agree | Breaks the English-key convention; the ASCII spelling of ś and ṣ is a house choice |
| Henning's (`pre-winter`, `winter`) | No | Yes | Henning alone | Authored, and contradicted by Monier-Williams, who calls *hemanta* winter |
| Jäschke's (`hot`, `rainy`, `damp`, first and last part of winter) | **Yes** | No | Jäschke alone | Still splits winter in two, and "damp" for *śarad* is his alone |
| `early-winter` / `late-winter` | **Yes** | Yes | Monier-Williams, Jäschke, Das | Clumsy: "the early month of early winter" |
| **Monier-Williams (`cold`, `dewy`)** | No | Yes | **Monier-Williams for all six** | — chosen |

`cold` is the second of Monier-Williams' two phrases for *hemanta*; his first, "winter", would collide with the four-season key.

**A shared key spans different months in each system**, and the docs of `monthNamesFor` must say so.
`summer` is Jyeṣṭha and Āṣāḍha in `sixSeasons`, and three months — which three depends on the system — in `fourSeasons`.

## The lunar-mansion month names

The Mahāvyutpatti lists the 28 nakṣatras, and the twelve month names are twelve of them: *mchu* Maghā, *dbo* Uttaraphalgunī, *nag pa* Citrā, *sa ga* Viśākhā, *snron* Jyeṣṭhā, *chu stod* Pūrvāṣāḍhā, *gro bzhin* Śravaṇā, *khrums* Bhadrapadā, *tha skar* Aśvinī, *smin drug* Kṛttikā, *mgo* Mṛgaśirāḥ, *rgyal* Puṣya.
This bears out Henning's remark (p. 358) that Tibetan uses the same names for the months and their mansions while Sanskrit does not: Tibetan *mchu* is both, while Sanskrit distinguishes Maghā, the mansion, from Māgha, the month.
Monier-Williams gives each Sanskrit month with the nakṣatra its full moon falls in (Māgha p. 805, Caitra p. 402, Mārgaśīrṣa p. 812 …).

**Shipped bare** — *mchu*, not *mchu zla ba*.
Only the bare form is attested uniformly: Janson, Henning and the Mahāvyutpatti's nakṣatra list all give it, while the dictionaries' month compounds vary (*sa ga zla ba*, but *mchu zla* and *dbo zla*).
The cost is that a bare name is a homograph — *mchu* is also "lip" — which the docblock must state.

**Month 2 is *dbo*, and *gre can* is a documented variant.**
Janson, Henning and Das (p. 913: *dbo zla ba* "corresponding to फाल्गुन of the Hindus") give *dbo* (Uttaraphalgunī).
The Mahāvyutpatti's month list gives *gre can* (Pūrvaphalgunī) for Phālguna.

**The Sanskrit month names follow the Tibetan** in a later step, as the rabjung names did, once the verifier settles spellings the sources vary on: Henning notes *Kārtika* against *Kārttika*, and *Puṣya* beside *Pauṣa*; the Mahāvyutpatti has *jeṣṭhaḥ*, *aśviniḥ*, and *mṛgaśīrṣaḥ* beside *mārgaśīrṣaḥ*.

## The elemental yogas

Henning, p. 204, gives the ten with Tibetan, Sanskrit and English.
Two Tibetan–Tibetan dictionaries each enumerate the set under its own headword — *'phrod sbyor* in the *tshig mdzod chen mo* and *'phrod sbyor bcu* in the *dung dkar tshig mdzod chen mo* — so each name can be checked against two independent lists.

| Henning's Wylie | Both dictionaries' enumerations | Henning's Sanskrit | Monier-Williams |
|---|---|---|---|
| dngos grub | = | siddhi | p. 1216: "accomplishment" — **not** the sense "a partic. Yoga (either the 16th or 19th)", which is the astronomical yoga |
| bdud rtsi | = | amṛta | p. 82: "the nectar" |
| lang tsho | = (*tshig mdzod*) | yauvana | p. 859: "youth" |
| 'phel 'gyur | = | pragati | **Not a headword** — see below |
| phun tshogs | = (*tshig mdzod*) | saṃpanna | *sam-panna*, p. 1172: "perfect, excellent" |
| stobs ldan | = (*tshig mdzod*) | balayukta | p. 723: "powerful" |
| mi phrod | ***mi 'phrod*** in both | alābha | p. 95: "non-acquirement" |
| mi mthun | = in both; the Mahāvyutpatti has *mi mthun pa* = pratikūla | pratikūla | p. 661: "contrary, adverse" |
| sreg pa | ***bsreg*** in both | dahana | p. 473: "burning" |
| 'chi ba | *'chi* in both | maraṇa | p. 789: "death" |

**Two corrections, to be carried as self-invalidating data** on the `spen ma` → `spen pa` pattern.
Andreas confirmed against the scan that Henning prints *mi phrod* and *sreg pa*; both dictionaries print *mi 'phrod* and *bsreg*; *mi 'phrod pa* is also a Mahāvyutpatti headword, and *mi phrod* is a headword in none of the dictionaries swept.
The corrected pair sounds the same — both *mi phrod* and *mi 'phrod* are *mi trö* — so the change is visible in script only: མི་འཕྲོད, not མི་ཕྲོད.

**What *'phel 'gyur* means.**
Jäschke p. 357, s.v. *'phel-ba*: "to increase, augment, multiply, enlarge … to improve, to grow better", its root glossed as Sanskrit वृध *vṛdh*.
*'gyur* is "to become" (the Mahāvyutpatti pairs *'gyur ba* with *vartate*).
So the name reads roughly "becoming greater, growth", which Henning renders "progress".

**Why *pragati* ships marked as Henning's alone.**
It is not a declension miss: Cologne is keyed by stem, and *pragati* is the stem.
It is absent from all five Cologne dictionaries tried — Monier-Williams 1899 and 1872, Böhtlingk and Roth, Apte, and Cappeller — and is an ordinary word in modern Hindi, प्रगति.
Two replacements were rejected.
*pragamana*, which Monier-Williams glosses "progress, advance" on Wilson's authority alone, pairs with *'phel 'gyur* in no source, so using it would be a correction without authored evidence.
*vṛddhi*, which fits Jäschke's root, pairs with nothing either, and *Vṛddhi* is also the eleventh astronomical yoga — a homograph waiting to be matched.

**The licence line, widened by one fact.**
The copyrighted dictionaries may gate and may never be quoted, and [scripts/tibetan-dictionary.mjs](../../scripts/tibetan-dictionary.mjs) lists exactly which facts may be taken.
The yoga check needs a fifth: **the spelling of each member of a set that an entry enumerates**.
Approved on 2026-09-13; still never a gloss, and to be added to that table when the verifier is built.

## Still open

- **Mahāvyutpatti citation.**
  The pages above are from the 1989 edition's scan index in the aggregate, and the edition itself is not yet identified; the verifier needs its section numbers, not file lines.
- **The Tibetan and Sanskrit of the six-season *system*** as Kongtrul names it in Kālacakra usage.
  Henning prints no Tibetan for it, so the six-season Tibetan above rests on the general lexicons, not on a Kālacakra text.
- **Sanskrit month names**, pending the variants listed above.
