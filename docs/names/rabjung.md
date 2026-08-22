# The 60 rabjung year names

**Status: generated.** Produced by `scripts/verify-rabjung-names.mjs`; re-run it rather than
editing this file. `test/fixtures/rabjung-names.ts` is generated from the same run and is what the
suite reads.

## The sources, and why each one

Each source is here because it is the only thing that can answer a particular question. Where two
could answer the same question, both are used and required to agree — one source is an opinion, two
agreeing independently is a result.

| Source | Answers | Why this one | Standing |
|---|---|---|---|
| Janson, *Tibetan Calendar Mathematics* (LaTeX) | Wylie, cycle position, the two Gregorian years | The Tibetan lineage — he takes the table from Henning's Appendix I — and the only source this package derives from, per the clean-room constraint | **Sourced**, extracted mechanically |
| Wikipedia saṃvatsara table | Devanāgarī | The only machine-readable source found carrying the script against the cycle positions. Its **IAST is no longer used**: it disagrees with its own Devanāgarī at 9 positions, so the IAST column below is derived instead | **Sourced**, corrected below |
| Sewell & Fleet, *The Siddhāntas and the Indian Calendar* (1924) | **Name identity only** — which name sits at which position | The authority the Indic column was originally cited to. It cannot check spelling: it prints `Sukla`, `Vrisha`, `Kshaya` in 1924 romanisation with **no IAST diacritics anywhere** | **Sourced**, by majority vote over thousands of OCR reads |
| Monier-Williams, via the Cologne Digital Sanskrit Dictionaries | The Sanskrit senses | The authority itself, from the scan: uncapped, citing a printed page, and carrying MW's own homonym grouping | **Sourced**, with a page citation per row |
| wisdomlib | The Bṛhat Saṃhitā's cycle position; which **other** lexicons carry a headword | Varāhamihira names the position in words beside the Devanāgarī — a primary Indic astronomical witness, independent of Janson, Sewell and Wiktionary. Only the position is taken, never the prose | **Sourced**, where present |
| English Wiktionary | That a Devanāgarī headword exists; the cycle position where its entry states it | A second lexicographic witness. **Not a sense source**: its Sanskrit senses *are* Monier-Williams, verbatim, so it is not a lineage independent of MW | **Sourced** |
| `jsewts` + `tibetan-ewts-converter` | Tibetan script | Two independent implementations required to agree, then to read back as the Wylie they came from | **Derived**, doubly |
| THL phonetics converter | THL Simplified phonetics | The publisher of the standard | **Sourced** |

**Janson's ASCII Sanskrit is not shipped, and is extracted for exactly one purpose.** It collides
three names onto `pramadi`, carries no Devanāgarī, and he flags its spellings as varying between
sources, so it is unfit as a name column. But it is the **only mechanical detector** of the rows
where the two traditions carry different names rather than different spellings, so it is read for the
divergence table below and never written to the fixture or to `src/`.

**Why Sewell is consulted by majority vote.** Its scan is OCR and noisy — `Ksliaya`, `Manniathn`,
`Ahgiras`. No single occurrence is trusted. The book prints "N Name" thousands of times across its
year-conversion tables, so the modal spelling at each position over thousands of reads is taken
instead: OCR errors scatter, the true reading does not.

## Why the IAST column is derived

It is computed from the Devanāgarī, not taken from the saṃvatsara table, because that table's
romanisation is lossy in ways that are invisible until they are checked. It drops the macron on
`-in` stems — प्रमाथी printed as *Pramāthi* — and it prints *Raudri* for रौद्र. An earlier correction
of this document's own making wrote Sewell's 1924 `Kshaya` into a column headed IAST, on the same
page that says Sewell carries no diacritics anywhere.

The printed value is kept as a signal rather than discarded: **9 positions
disagree with their own Devanāgarī**, each recorded with its reason, and a disagreement that is not
on that list fails the run.

- **13.** प्रमाथी is pramāthī; the table drops the final macron.
- **32.** विळम्बि carries Vedic ळ, which the table romanises as plain l.
- **46.** परिधावी is paridhāvī; the table drops the final macron.
- **47.** प्रमादी is pramādī; the table drops the final macron.
- **48.** आनंद is ānaṃda; the table romanises the anusvāra as the cluster it stands for.
- **51.** पिंगल is piṃgala; same anusvāra convention.
- **53.** सिद्धार्थी is siddhārthī; the table drops the final macron.
- **54.** रौद्र is raudra; the table prints Raudri, an -i stem the Devanagari does not carry.
- **59.** the IAST cell offers two readings, Krodhana/Manyu, where the Devanagari gives one.

## Corrections applied, with their evidence

Each correction is applied only after **both originals are confirmed still present**, so it
self-invalidates: if the saṃvatsara table is fixed upstream, the script says so rather than silently
applying a patch that is no longer needed.

A correction changes what this table **prints** and carries authored evidence. It is not the same as
a rung of the lookup ladder, which changes only what is **queried** and states a rule of orthography
or morphology — seven rows that look like errors are `-in` stems printed in the nominative, or
anusvāra spellings, and those are grammar rather than judgement.

- **Position 60: अक्षय → क्षय** *(sewell)*. Sewell & Fleet give Kshaya at position 60 (modal reading, 82% of 49 occurrences) and the string 'Akshaya' appears nowhere in the book. Janson has `ksayaka`, and the Tibetan is `zad pa`, exhaustion -- ksaya, not a-ksaya, which is its opposite. Three lineages against the Wikipedia table's reading. The IAST that follows is `Kṣaya`, not Sewell's `Kshaya`: he settles which name sits here and can never settle a spelling, carrying no diacritics at all.
- **Position 31: हेविळम्बि → हेमलम्ब** *(sewell)*. Sewell & Fleet give Hemalamba at 31, Janson has `hemalambha`, and English Wiktionary's entry at हेमलम्ब reads 'Name of the 31st year of Jupiter's cycle of 60 years' -- a third lineage naming the position outright.
- **Position 15: वृषप्रजा → वृषभ** *(attestation)*. Wikipedia's वृषप्रजा is unattested, and a reading no dictionary carries is not a variant worth preserving. Janson has `brisabha` (vrisabha) and Sewell has Vrisha, so the Indic sources point at a bull-name; the Tibetan `khyu mchog` is 'chief bull'. वृषभ is attested and its senses are 'a bull' AND 'the chief, most excellent or eminent', carrying both halves of the Tibetan where Sewell's वृष is only 'man, male, bull'. So Janson's form is taken over Sewell's on attested meaning rather than on preference.
- **Position 37: शोभकृत् → शोभन** *(attestation)*. Sewell and Janson both have Sobhana, and Wikipedia's शोभकृत् is unattested while शोभन is, glossed 'brilliant, beautiful'. This was left uncorrected until 2026-08-21 on the argument that the Tibetan `mdzes byed` ('beautifying') renders sobhakrit more closely -- but that weighed a translation nuance against two sources plus attestation, which is the wrong way round.
- **Position 4: प्रमोदूत → प्रमोद** *(monier-williams)*. प्रमोदूत resolves nowhere. प्रमोद does, and its entry states 'the 4th year in a 60 years' cycle of Jupiter' outright, glossing it 'excessive joy, delight, gladness' -- which is the Tibetan `rab myos`. The lengthened -uta is not a rung of the ladder, because no rule of Sanskrit derives it; it is a variant of the name, and the attested one is taken.
- **Position 9: युव → युवन्** *(homograph)*. युव resolves, but to the wrong word: it is the base of the second-person dual pronoun, and the sense that came back was 'you both'. That is the homograph trap this table already documents at क्षय, caught here by reading the sense rather than the presence of an entry. The samvatsara is युवन्, 'young', which the Tibetan `na tshod ldan` renders.
- **Position 56: दुन्दुभी → दुन्दुभि** *(homograph)*. The feminine दुन्दुभी is a Gandharvi's name and a throw of the dice -- neither is a drum. The masculine दुन्दुभि is the kettledrum, which is the Tibetan `rnga chen`, 'great drum'. The printed IAST `Dundubhi` transliterates the masculine, so the table's own two columns disagreed here before the Devanagari became the source of the IAST.
- **Position 58: रक्ताक्षि → रक्ताक्ष** *(monier-williams)*. रक्ताक्षि is a stub in Monier-Williams -- the whole entry reads "m. , Cat.", a headword with no gloss at all -- while रक्ताक्ष reads "red-eyed, having red or blood-shot eyes", which is the Tibetan `mig dmar` exactly. This is the case the IAST check cannot reach: both columns agree on Raktākṣi, so nothing internal contradicts anything, and only attestation shows the printed form is the wrong one.
- **Position 57: रूधिरोद्गारी → रुधिरोद्गारी** *(typo)*. रूधिर with a long u is not a word; blood is रुधिर, short. The table's own IAST says so -- it prints `Rudhirodgāri`, which transliterates the short vowel -- so this is a typo the source contradicts itself about, not a variant. Corrected here, and the `-in` stem that Cologne lemmatises under (रुधिरोद्गारिन्) is then reached by the ladder rather than by a second correction.
- **Position 6, Wylie: `anggi ra` → `ang gi ra`.** Janson's `anggi ra` does not survive the EWTS round trip: it converts to ཨངགི་ར, which reads back as `angagi ra` -- not a word. `ang gi ra` converts to ཨང་གི་ར and round-trips exactly, both converters agree on it, and THL returns a clean phonetic for it where `anggi ra` returns the `(?)` marker meaning it could not analyse the string. It is also the form the retired bespoke converter hard-coded for this row, and it matches the syllable structure of the Sanskrit it transliterates, Angirasa आङ्गिरस. The likeliest reading is a missing space in the source.

## How a headword is looked up

Monier-Williams is a dictionary, so finding a word means naming the **headword form** he files it
under — and that is not always how the saṃvatsara list spells the name. Sent to Cologne exactly as
printed, 45 of the 60 headwords resolve.
The other 15 do not, and none of them is missing from Monier-Williams:
he has every one, under a different form of the same word.

So the lookup walks a **ladder**: the printed spelling first, then each transformation below, then
the pairs that compose. Every rung states a rule of Sanskrit orthography or morphology, which is what
separates it from a correction — **a rung changes only what is *queried*, while a correction changes
what this table *prints* and carries authored evidence**. The Devanāgarī column still shows the
source's own spelling at every one of these rows; the ladder simply knows where Monier-Williams keeps
it. Collapsing the two would turn 15 points of grammar into 15 editorial judgements.

| Rung | Rows | Why it is a rule rather than a judgement | Where it applied |
|---|---|---|---|
| `-in stem` | 7 | The list prints the nominative singular; Monier-Williams lemmatises the stem. | 13 प्रमाथी → प्रमाथिन्; 22 सर्वधारी → सर्वधारिन्; 23 विरोधी → विरोधिन्; 33 विकारि → विकारिन्; 46 परिधावी → परिधाविन्; 47 प्रमादी → प्रमादिन्; 57 रुधिरोद्गारी → रुधिरोद्गारिन् |
| `ḷ → l + -in stem` | 1 | ळ is Vedic and Marathi rather than standard Sanskrit, and this row needs the stem rule on top of it — the rungs compose. | 32 विळम्बि → विलम्बिन् |
| `cross-reference from शुभकृत्` | 1 |  | 36 शुभकृत् → शुभकर |
| `cross-reference from क्रोधिन्` | 1 |  | 38 क्रोधी → क्रोधालु |
| `cluster → anusvāra` | 1 | The same rule in reverse — he files this one under the anusvāra, so the ladder tries both directions. | 41 प्लवङ्ग → प्लवंग |
| `final virāma` | 1 | A missing virāma leaves a spurious inherent *a*, so the word queried is not the word meant. | 45 विरोधकृत → विरोधकृत् |
| `anusvāra → cluster` | 2 | One word, two conventions for the same nasal. Monier-Williams files these under the cluster. | 48 आनंद → आनन्द; 51 पिंगल → पिङ्गल |
| `cross-reference from सिद्धार्थिन्` | 1 |  | 53 सिद्धार्थी → सिद्धार्थ |

## Where the two traditions name different things

The Tibetan names are mostly translations of the Sanskrit, but not everywhere. These are the
positions where Janson's Tibetan-lineage Sanskrit and the Indic list carry **different names** rather
than different spellings — the distinction that decides whether the two columns of a row can be read
as one name.

| # | Janson *(Tibetan lineage)* | Indic | English of the Tibetan | Verdict | Why |
|---|---|---|---|---|---|
| 13 | `pramadi` | प्रमाथी Pramāthī | Intoxicated | **Senses diverge** | A different kind of divergence from the rest of this table, and worth separating. The two lists agree on the NAME here -- both are Pramāthin -- and disagree on what it means: Monier-Williams glosses it "stirring about, tearing, rending", agitation, while the Tibetan `myos ldan` is intoxication. Janson's ASCII cannot corroborate either way, because `pramadi` is the form he collides onto positions 4, 13 and 47 alike. So the Sanskrit sense is selected as the Sanskrit's own, and the Tibetan gloss stands beside it unreconciled. |
| 20 | `aksaya` | अव्यय/व्यय Avyaya/Vyaya | Inexhaustible | **Not a divergence** | Janson's `aksaya` matches the FIRST alternative of the compound cell अव्यय/व्यय, which is the reading the Tibetan `mi zad` (inexhaustible) also takes. This is a within-cell selection question, not two traditions naming different things. |
| 29 | `mada` | मन्मथ Manmatha | Intoxicating | **Divergent** | Intoxication against मन्मथ, the god of love. The Tibetan `myos byed` ('intoxicating') sides with Janson, so the two lists carry different names at this index. |
| 39 | `visvabandhu` | विश्वावसु Viśvāvasu | Manifold wealth | **Open** | vasu ('wealth') against bandhu ('kinsman'). The Tibetan `sna tshogs dbyig` -- dbyig is wealth -- sides with the INDIC विश्वावसु, not with Janson, which suggests his ASCII is corrupt here rather than that the traditions diverge. Recorded rather than decided. |
| 52 | `kaladuti` | कालयुक्त Kālayukta | Messenger of time | **Divergent** | kāla-dūtī, 'messenger of time', against कालयुक्त, 'joined to time'. The Tibetan `dus kyi pho nya` is the messenger, so it sides with Janson. |
| 60 | `ksayaka` | क्षय Kṣaya | Exhaustion | **Dissolved** | Both are kṣaya. This was recorded for months as the clearest divergence -- `zad pa` (exhaustion) against *Akshaya* (imperishable), two opposite names at one index -- and the correction above removed it. The Indic cell said अक्षय; Sewell, Janson and the Tibetan all say क्षय. |

## The English columns

They gloss **different names**, which is the point of showing them side by side.

- **English of the Tibetan** is **authored, not sourced.** It glosses the Tibetan name, written for
  this table. No source gives English for these — Sewell & Fleet prints the sixty as bare names
  against Kaliyuga years and fractional day-counts, with no meaning column, checked directly.
- **Sanskrit senses** are **sourced**: every sense Monier-Williams lists for that headword, uncapped
  — 781 of them across the sixty rows.
  The table shows the first; the rest are in the detail section below, untruncated.
- **Selected** is an **authored choice from those sourced candidates**, and the generator refuses to
  run unless the chosen gloss appears verbatim inside the sense carrying its recorded Cologne ID, and
  unless it carries at most two gloss units. So the editorial step is visible and machine-checked; it
  can select, never invent. 58 of the 60 carry one.

**Why a selection is needed at all.** Entries carry many senses, often from different roots, and
taking the first is an accident rather than a policy. `क्षय` opens with a cross-reference and then
"dominion" — from *kṣi*, to rule — where the sense that renders `zad pa` is "destruction, decay",
from a different *kṣi* meaning to destroy. Monier-Williams marks these as separate numbered
headwords, which is one of the reasons the sense column comes from him.

## The table

Every column heading names where that column comes from, so no row has to be traced back through
the prose above to know what stands behind it. **Evidence** states the standing of that row in
particular, rather than one claim standing for all sixty.

**‡ marks a meaning **composed** from the entries for a compound's parts** rather than quoted from
one printed sense. It is a weaker tier, kept visibly separate: Monier-Williams has no entry for the
whole word but glosses both halves, and the Tibetan name is what fixes which reading of the compound
is meant. The parts and the senses they were taken from are listed in the detail section below.

**† marks a value that did *not* come from the source its heading names** — it came from a
correction above, with its evidence. Position 60 is the case to have in mind: it reads क्षय under a
column headed *saṃvatsara*, when the saṃvatsara table says अक्षय. 19 cells are marked,
at 10 positions: 4, 6, 9, 15, 31, 37, 56, 57, 58, 60.

| # *(Janson)* | Tibetan *(two EWTS)* | Wylie *(Janson)* | Phonetic *(THL)* | Devanāgarī *(saṃvatsara)* | IAST *(derived)* | English of the Tibetan **(authored)** | Sanskrit senses *(Monier-Williams)* | Selected **(authored)** | Evidence | Years *(Janson + saṃvatsara)* |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | རབ་བྱུང | `rab byung` | *rap jung* | प्रभव | Prabhava | Arising | प्र-भव mfn. prominent, excelling, distinguished, RV. ([+7 more](#sanskrit-senses-at-position-1)) | production, source | MW as printed; Wiktionary; 4 other lexicon(s); position: Wiktionary + Bṛhat Saṃhitā | 1927, 1987 |
| 2 | རྣམ་བྱུང | `rnam byung` | *nam jung* | विभव | Vibhava | Full arising | वि-भव mfn. powerful, rich, MBh. xiii, 802 ([+12 more](#sanskrit-senses-at-position-2)) | development, evolution | MW as printed; Wiktionary; 5 other lexicon(s); position: Wiktionary + Bṛhat Saṃhitā | 1928, 1988 |
| 3 | དཀར་པོ | `dkar po` | *kar po* | शुक्ल | Śukla | White | शुक्ल mf( आ )n. (later form of शुक्र , for which it is sometimes w.r. ) bright, light (with पक्ष = शुक्ल-प् ॰ , q.v. ), KātyŚr. ; Mn. ; MBh. &c. ([+30 more](#sanskrit-senses-at-position-3)) | white (the colour) | MW as printed; Wiktionary; 4 other lexicon(s); position: Wiktionary + Bṛhat Saṃhitā | 1929, 1989 |
| 4 | རབ་མྱོས | `rab myos` | *rap nyö* | प्रमोद † | Pramoda † | Elated | प्र-मोद m. (also pl. ; ifc. f( आ ). ) excessive joy, delight, gladness, VS. ; Up. ; MBh. &c. ([+11 more](#sanskrit-senses-at-position-4)) | excessive joy, delight | MW as printed; Wiktionary; 5 other lexicon(s); position: Wiktionary | 1930, 1990 |
| 5 | སྐྱེས་བདག | `skyes bdag` | *kyé dak* | प्रजापति | Prajāpati | Lord of creatures | प्रजा —पति ( ॰जा- ), m. ‘lord of creatures’, N. of Savitṛ , Soma , Agni , Indra &c., RV. ; AV. ([+11 more](#sanskrit-senses-at-position-5)) | lord of creatures | MW as printed; Wiktionary; 4 other lexicon(s); position: Bṛhat Saṃhitā | 1931, 1991 |
| 6 | ཨང་གི་ར | `ang gi ra †` | *ang gi ra* | आङ्गिरस | Āṅgirasa | Aṅgirasa — a ṛṣi's name, transliterated not translated | आङ्गिरस mf( ई )n. descended from or belonging or referring to the Aṅgirases or to Aṅgiras , AV. ; VS. &c. ([+5 more](#sanskrit-senses-at-position-6)) | a descendant of Aṅgiras | MW as printed; 5 other lexicon(s); position: Bṛhat Saṃhitā | 1932, 1992 |
| 7 | དཔལ་གདོང | `dpal gdong` | *pel dong* | श्रीमुख | Śrīmukha | Glorious face | श्री —मुख n. a beautiful face, MW. ([+4 more](#sanskrit-senses-at-position-7)) | a beautiful face | MW as printed; Wiktionary; 2 other lexicon(s); position: Wiktionary + Bṛhat Saṃhitā | 1933, 1993 |
| 8 | དངོས་པོ | `dngos po` | *ngö po* | भाव | Bhāva | Entity | भाव m. (√ भू ) becoming, being, existing, occurring, appearance, ŚvetUp. ; KātyŚr. &c. ([+31 more](#sanskrit-senses-at-position-8)) | becoming, being | MW as printed; Wiktionary; 5 other lexicon(s); position: Wiktionary + Bṛhat Saṃhitā | 1934, 1994 |
| 9 | ན་ཚོད་ལྡན | `na tshod ldan` | *na tsö den* | युवन् † | Yuvan † | Youthful | युवन् mf( यूनी , or युवती or युवति , q.v. )n. ( prob. fr. √ 2. यु ) young, youthful, adult (applied to men and animals), strong, good, healthy, RV. &c. &c. ([+4 more](#sanskrit-senses-at-position-9)) | young, youthful | MW as printed; Wiktionary; 4 other lexicon(s); position: Wiktionary + Bṛhat Saṃhitā | 1935, 1995 |
| 10 | འཛིན་བྱེད | `'dzin byed` | *dzin jé* | धातृ | Dhātṛ | Holder | धातृ m. establisher, founder, creator, bearer, supporter ( cf. वसु- ), orderer, arranger, RV. &c. &c. ([+8 more](#sanskrit-senses-at-position-10)) | bearer, supporter | MW as printed; Wiktionary; 4 other lexicon(s); position: Bṛhat Saṃhitā | 1936, 1996 |
| 11 | དབང་ཕྱུག | `dbang phyug` | *wang chuk* | ईश्वर | Īśvara | Mighty lord | ईश्वर mfn. able to do, capable of (with gen. of Vedic inf. , or with common inf. ), liable, exposed to, AV. ; TS. ; ŚBr. ; AitBr. ; Kum. ; Hit. &c. ([+14 more](#sanskrit-senses-at-position-11)) | master, lord | MW as printed; Wiktionary; 4 other lexicon(s); position: Bṛhat Saṃhitā | 1937, 1997 |
| 12 | འབྲུ་མང་པོ | `'bru mang po` | *dru mang po* | बहुधान्य | Bahudhānya | Much grain | बहु —धान्य m. ‘abounding in corn’, N. of the 12th or 46th year in a 60 years' cycle of Jupiter, Var. | abounding in corn | MW as printed; Wiktionary; position: Wiktionary + Bṛhat Saṃhitā | 1938, 1998 |
| 13 | མྱོས་ལྡན | `myos ldan` | *nyö den* | प्रमाथी | Pramāthī | Intoxicated | प्र- ॰माथिन् mfn. stirring about, tearing, rending, troubling, harassing, destroying, MBh. ; Kāv. &c. ([+7 more](#sanskrit-senses-at-position-13)) | stirring about | MW via -in stem; position: Bṛhat Saṃhitā | 1939, 1999 |
| 14 | རྣམ་གནོན | `rnam gnon` | *nam nön* | विक्रम | Vikrama | Overcoming | 1. वि —क्रम m. (for 2. See वि- √क्रम् ) the absence of the Krama-pāṭha ( q.v. ), RPrāt. ([+21 more](#sanskrit-senses-at-position-14)) | valour, courage | MW as printed; Wiktionary; 4 other lexicon(s); position: Wiktionary + Bṛhat Saṃhitā | 1940, 2000 |
| 15 | ཁྱུ་མཆོག | `khyu mchog` | *khyu chok* | वृषभ † | Vṛṣabha † | Chief bull | वृषभ mfn. ( cf. ऋषभ ) manly, mighty, vigorous, strong (applied like वृषन् to animate and inanimate objects), RV. ; AV. ([+18 more](#sanskrit-senses-at-position-15)) | the chief, most excellent | MW as printed; Wiktionary; 4 other lexicon(s); position: unstated | 1941, 2001 |
| 16 | སྣ་ཚོགས | `sna tshogs` | *na tsok* | चित्रभानु | Citrabhānu | Variegated | चित्र —भानु ( ॰त्र- ), mfn. of variegated lustre, shining with light, RV. ; AV. iv, 25, 3 ; xiii, 3, 10 ; TBr. ii f. ; Kauś. ; MBh. i, 722 ([+8 more](#sanskrit-senses-at-position-16)) | of variegated lustre | MW as printed; Wiktionary; 5 other lexicon(s); position: Wiktionary + Bṛhat Saṃhitā | 1942, 2002 |
| 17 | ཉི་མ | `nyi ma` | *nyi ma* | स्वभानु | Svabhānu | Sun | स्व —भानु ( स्व- ), mfn. self-luminous, RV. | self-luminous | MW as printed; position: Bṛhat Saṃhitā | 1943, 2003 |
| 18 | ཉི་སྒྲོལ་བྱེད | `nyi sgrol byed` | *nyi dröl jé* | तारण | Tāraṇa | Sun-freeing | तारण mf( ई )n. causing or enabling to cross, helping over a difficulty, liberating, saving, MBh. xiii, 1232 (Śiva ) and 6986 (Viṣṇu ), Hariv. 7022 and 7941 ; Kathās. lxvii, 1 ([+7 more](#sanskrit-senses-at-position-18)) | liberating, saving | MW as printed; Wiktionary; 5 other lexicon(s); position: Bṛhat Saṃhitā | 1944, 2004 |
| 19 | ས་སྐྱོང | `sa skyong` | *sa kyong* | पार्थिव | Pārthiva | Earth-protector | पार्थिव mf( ई or आ ; cf. Pāṇ. iv, 1, 85 , Vārtt. 2)n. ( fr. पृथिवी f. of पृथु ) earthen, earthy, earthly, being in or relating to or coming from the earth, terrestrial, RV. &c. &c. ([+13 more](#sanskrit-senses-at-position-19)) | a lord of the earth | MW as printed; Wiktionary; 4 other lexicon(s); position: Bṛhat Saṃhitā | 1945, 2005 |
| 20 | མི་ཟད | `mi zad` | *mi zé* | अव्यय/व्यय | Avyaya/Vyaya | Inexhaustible | 1. अव्यय or rarely अव्यय [only RV. viii, 97, 2 and ix, 86, 34 ] mfn. ( अवि ) made of sheep's skin (as the woollen Soma strainer), RV. ([+9 more](#sanskrit-senses-at-position-20)) | not liable to change, imperishable | MW as printed; Wiktionary; 4 other lexicon(s); position: unstated | 1946, 2006 |
| 21 | ཐམས་ཅད་འདུལ | `thams cad 'dul` | *tam ché dül* | सर्वजित् | Sarvajit | All-taming | सर्व —जित् mfn. all-conquering, L. ([+6 more](#sanskrit-senses-at-position-21)) | all-conquering | MW as printed; Wiktionary; 4 other lexicon(s); position: Wiktionary + Bṛhat Saṃhitā | 1947, 2007 |
| 22 | ཀུན་འཛིན | `kun 'dzin` | *kün dzin* | सर्वधारी | Sarvadhārī | All-holding | सर्व —धारिन् m. ‘all-holder’, N. of Śiva , MBh. ([+1 more](#sanskrit-senses-at-position-22)) | all-holder | MW via -in stem; Wiktionary; 3 other lexicon(s); position: Wiktionary | 1948, 2008 |
| 23 | འགལ་བ | `'gal ba` | *gel ba* | विरोधी | Virodhī | Opposition | वि-रोधिन् mfn. opposing, hindering, preventing, obstructing, excluding, disturbing, Gobh. ; Mn. &c. ([+10 more](#sanskrit-senses-at-position-23)) | opposing, hindering | MW via -in stem; 4 other lexicon(s); position: Bṛhat Saṃhitā | 1949, 2009 |
| 24 | རྣམ་འགྱུར | `rnam 'gyur` | *nam gyur* | विकृति | Vikṛti | Transformed | वि-कृति f. change, alteration, modification, variation, changed condition (of body or mind; acc. with √ गम् , या , व्रज् , or प्र- √पद् , to undergo a change, be changed), MBh. ; Kāv. &c. ([+14 more](#sanskrit-senses-at-position-24)) | change, alteration | MW as printed; Wiktionary; 3 other lexicon(s); position: Bṛhat Saṃhitā | 1950, 2010 |
| 25 | བོང་བུ | `bong bu` | *bong bu* | खर | Khara | Donkey | खर mf( आ )n. hard, harsh, rough, sharp, pungent, acid (opposed to मृदु and श्लक्ष्ण ), MBh. ; R. &c. ([+26 more](#sanskrit-senses-at-position-25)) | a donkey | MW as printed; Wiktionary; 5 other lexicon(s); position: Wiktionary + Bṛhat Saṃhitā | 1951, 2011 |
| 26 | དགའ་བ | `dga' ba` | *ga ba* | नन्दन | Nandana | Joy | नन्दन mf( आ )n. (the initial न् is not changeable to ण् , g. क्षुभ्ना दि ) rejoicing, gladdening ( cf. ॰दक ), MBh. ; Var. ; Pañc. ([+17 more](#sanskrit-senses-at-position-26)) | rejoicing, gladdening | MW as printed; 4 other lexicon(s); position: Bṛhat Saṃhitā | 1952, 2012 |
| 27 | རྣམ་རྒྱལ | `rnam rgyal` | *nam gyel* | विजय | Vijaya | Complete victory | वि-जय m. contest for victory, victory, conquest, triumph, superiority, RV. &c. &c. ( fig. applied to ‘the sword’ and to ‘punishment’, MBh. xii, 6204 ; 4428 ) ([+60 more](#sanskrit-senses-at-position-27)) | victory, conquest | MW as printed; Wiktionary; 5 other lexicon(s); position: Bṛhat Saṃhitā | 1953, 2013 |
| 28 | རྒྱལ་བ | `rgyal ba` | *gyel ba* | जय | Jaya | Victory | जय mfn. (√ जि ) ifc. conquering, winning See ऋतं- , कृतं- , धनं-जय , पुरं- , शत्रुं- ([+38 more](#sanskrit-senses-at-position-28)) | conquest, victory | MW as printed; Wiktionary; 5 other lexicon(s); position: Wiktionary + Bṛhat Saṃhitā | 1954, 2014 |
| 29 | མྱོས་བྱེད | `myos byed` | *nyö jé* | मन्मथ | Manmatha | Intoxicating | मन्मथ m. (either an Intens. form fr. √ मथ् , or fr. मन् = मनस् + मथ , ‘agitating’; cf. मन्देह and मन्धातृ ) love or the god of love, amorous passion or desire ( ifc. f( आ ). ), MBh. ; Kāv. &c. ([+4 more](#sanskrit-senses-at-position-29)) | love or the god of love | MW as printed; Wiktionary; 3 other lexicon(s); position: Wiktionary + Bṛhat Saṃhitā | 1955, 2015 |
| 30 | གདོང་ངན | `gdong ngan` | *dong ngen* | दुर्मुख | Durmukha | Ill-faced | दुर् —मुख mf( ई )n. ugly-faced, MBh. ; R. &c. ([+12 more](#sanskrit-senses-at-position-30)) | ugly-faced | MW as printed; 4 other lexicon(s); position: Bṛhat Saṃhitā | 1956, 2016 |
| 31 | གསེར་འཕྱང | `gser 'phyang` | *ser chang* | हेमलम्ब † | Hemalamba † | Hanging gold | हेम —लम्ब or हेम —लम्॰बक , m. N. of the 31st (or 5th) year of Jupiter's cycle of 60 years, VarBṛS. | hanging gold ‡ | MW as printed; Wiktionary; position: Wiktionary | 1957, 2017 |
| 32 | རྣམ་འཕྱང | `rnam 'phyang` | *nam chang* | विळम्बि | Viḷambi | Hanging down | वि- ॰लम्बिन् mfn. hanging down, pendulous, hanging to or from, leaning against ( loc. or comp. ), Kāv. ; VarBṛS. ; Suśr. &c. ([+3 more](#sanskrit-senses-at-position-32)) | hanging down, pendulous | MW via ḷ → l + -in stem; position: unstated | 1958, 2018 |
| 33 | སྒྱུར་བྱེད | `sgyur byed` | *gyur jé* | विकारि | Vikāri | Transforming | वि- ॰कारिन् mfn. liable to change, changeable, variable, VPrāt. ; MBh. ; Suśr. ([+6 more](#sanskrit-senses-at-position-33)) | liable to change, changeable | MW via -in stem; 4 other lexicon(s); position: Bṛhat Saṃhitā | 1959, 2019 |
| 34 | ཀུན་ལྡན | `kun ldan` | *kün den* | शार्वरी | Śārvarī | All-possessing | शार्वरी mf( ई )n. ( fr. शर्वरी ) belonging to night, nocturnal, Kād. ; Hcar. ; Vās. ([+3 more](#sanskrit-senses-at-position-34)) | belonging to night, nocturnal | MW as printed; 4 other lexicon(s); position: unstated | 1960, 2020 |
| 35 | འཕར་བ | `'phar ba` | *par ba* | प्लव | Plava | Leaping | प्लव mf( आ )n. swimming, floating, ŚāṅkhGṛ. ; Suśr. ([+25 more](#sanskrit-senses-at-position-35)) | jumping, leaping | MW as printed; Wiktionary; 4 other lexicon(s); position: Wiktionary + Bṛhat Saṃhitā | 1961, 2021 |
| 36 | དགེ་བྱེད | `dge byed` | *gé jé* | शुभकृत् | Śubhakṛt | Virtue-making | शुभ —कर mfn. causing welfare, auspicious, fortunate, VarBṛS. ([+1 more](#sanskrit-senses-at-position-36)) | causing welfare, auspicious | MW via cross-reference from शुभकृत्; 1 other lexicon(s); position: unstated | 1962, 2022 |
| 37 | མཛེས་བྱེད | `mdzes byed` | *dzé jé* | शोभन † | Śobhana † | Beautifying | शोभन mf( आ or ई )n. brilliant, splendid, beautiful (at end of comp. = ‘beautiful by reason of’), ŚBr. ; Kauś. ; MBh. &c. ([+21 more](#sanskrit-senses-at-position-37)) | brilliant, splendid | MW as printed; Wiktionary; 5 other lexicon(s); position: Bṛhat Saṃhitā | 1963, 2023 |
| 38 | ཁྲོ་མོ | `khro mo` | *tro mo* | क्रोधी | Krodhī | Wrathful — feminine, against 59 | क्रोधालु mfn. passionate, violent, Suśr. vi. | passionate, violent | MW via cross-reference from क्रोधिन्; 2 other lexicon(s); position: Bṛhat Saṃhitā | 1964, 2024 |
| 39 | སྣ་ཚོགས་དབྱིག | `sna tshogs dbyig` | *na tsok yik* | विश्वावसु | Viśvāvasu | Manifold wealth | विश्वा —वसु ( विश्वा- ), mfn. beneficent to all (said of Viṣṇu ), MBh. ([+12 more](#sanskrit-senses-at-position-39)) | beneficent to all | MW as printed; 4 other lexicon(s); position: Bṛhat Saṃhitā | 1965, 2025 |
| 40 | ཟིལ་གནོན | `zil gnon` | *zil nön* | पराभव | Parābhava | Overwhelming | परा-भव m. vanishing, disappearance, dissolution, separation, R. ([+2 more](#sanskrit-senses-at-position-40)) | overthrow, defeat | MW as printed; Wiktionary; 3 other lexicon(s); position: Wiktionary + Bṛhat Saṃhitā | 1966, 2026 |
| 41 | སྤྲེའུ | `spre'u` | *treu* | प्लवङ्ग | Plavaṅga | Monkey | प्लव —ं-ग mfn. ‘moving by jumps’, flickering (said of fire), MBh. ([+4 more](#sanskrit-senses-at-position-41)) | a monkey | MW via cluster → anusvāra; 3 other lexicon(s); position: Bṛhat Saṃhitā | 1967, 2027 |
| 42 | ཕུར་བུ | `phur bu` | *pur bu* | कीलक | Kīlaka | Peg | कीलक m. a pin, bolt, wedge, Pañcat. ; Hit. ([+7 more](#sanskrit-senses-at-position-42)) | a pin, bolt | MW as printed; Wiktionary; 3 other lexicon(s); position: Wiktionary + Bṛhat Saṃhitā | 1968, 2028 |
| 43 | ཞི་བ | `zhi ba` | *zhi ba* | सौम्य | Saumya | Peaceful | सौम्य mf( ई or आ )n. mf( ई later आ ; once in RV. सौम्या )n. (once in AV. सौम्य ) relating or belonging to Soma (the juice or the sacrifice or the moon-god), connected or dealing with Soma , having his nature or qualities &c., RV. &c. &c. ([+36 more](#sanskrit-senses-at-position-43)) | placid, gentle | MW as printed; Wiktionary; 4 other lexicon(s); position: Bṛhat Saṃhitā | 1969, 2029 |
| 44 | ཐུན་མོང | `thun mong` | *tün mong* | साधारण | Sādhāraṇa | Common | सा धारण mf( ई or आ )n. ‘having or resting on the same support or basis’, belonging or applicable to many or all, general, common to all, universal, common to ( gen. dat. instr. with and without सह , or comp. ), RV. &c. &c. ([+13 more](#sanskrit-senses-at-position-44)) | belonging or applicable to many | MW as printed; Wiktionary; 4 other lexicon(s); position: Wiktionary + Bṛhat Saṃhitā | 1970, 2030 |
| 45 | འགལ་བྱེད | `'gal byed` | *gel jé* | विरोधकृत | Virodhakṛta | Opposition-making | वि-रोध —कृत् mfn. causing dissension or revolt, Yājñ., Sch. ([+2 more](#sanskrit-senses-at-position-45)) | causing dissension | MW via final virāma; position: Bṛhat Saṃhitā | 1971, 2031 |
| 46 | ཡོངས་འཛིན | `yongs 'dzin` | *yong dzin* | परिधावी | Paridhāvī | Wholly-holding | परि-धाविन् m. ‘running round’, N. of the 46th (or 20th) of the 60 years' cycle of Jupiter, Var. | running round | MW via -in stem; position: unstated | 1972, 2032 |
| 47 | བག་མེད | `bag med` | *bak mé* | प्रमादी | Pramādī | Heedless | प्र- ॰मादिन् mfn. negligent, careless, incautious, indifferent, MBh. ; Kāv. &c. ([+4 more](#sanskrit-senses-at-position-47)) | negligent, careless | MW via -in stem; 4 other lexicon(s); position: Bṛhat Saṃhitā | 1973, 2033 |
| 48 | ཀུན་དགའ | `kun dga'` | *kün ga* | आनंद | Ānaṃda | Complete joy | आ-नन्द अस् , m. happiness, joy, enjoyment, sensual pleasure, RV. ; AV. ; VS. ; R. ; Ragh. &c. ([+17 more](#sanskrit-senses-at-position-48)) | happiness, joy | MW via anusvāra → cluster; 5 other lexicon(s); position: Bṛhat Saṃhitā | 1974, 2034 |
| 49 | སྲིན་བུ | `srin bu` | *sin bu* | राक्षस | Rākṣasa | Demon | राक्षस mf( ई )n. ( fr. रक्षस् ) belonging to or like a Rakṣas , demoniacal, infested by demons, AitBr. &c. &c. (with विवाह , or धर्म or विधि m. ‘one of the 8 forms of marriage’, the violent seizure or rape of a girl after the defeat or destruction of her relatives, see Mn. iii, 33 ) ([+15 more](#sanskrit-senses-at-position-49)) | an evil or malignant demon | MW as printed; Wiktionary; 5 other lexicon(s); position: Bṛhat Saṃhitā | 1975, 2035 |
| 50 | མེ | `me` | *mé* | नल/अनल | Nala/Anala | Fire | 1. अनल m. (√ अन् ), fire ([+13 more](#sanskrit-senses-at-position-50)) | fire | MW as printed; Wiktionary; 5 other lexicon(s); position: Wiktionary + Bṛhat Saṃhitā | 1976, 2036 |
| 51 | དམར་སེར་ཅན | `dmar ser can` | *mar ser chen* | पिंगल | Piṃgala | Tawny — reddish-yellow | पिङ्गल mf( आ and ई )n. ( cf. g. गौरा दि and कडारा दि ), reddish-brown, tawny, yellow, gold-coloured, AV. &c. &c., ([+35 more](#sanskrit-senses-at-position-51)) | reddish-brown, tawny | MW via anusvāra → cluster; 5 other lexicon(s); position: Bṛhat Saṃhitā | 1977, 2037 |
| 52 | དུས་ཀྱི་ཕོ་ཉ | `dus kyi pho nya` | *dü kyi po nya* | कालयुक्त | Kālayukta | Messenger of time | काल —युक्त m. n. the fifty-second year in the sixty years' cycle of Jupiter, VarBṛS. ([+1 more](#sanskrit-senses-at-position-52)) | fit for the (present) time | MW as printed; Wiktionary; position: Wiktionary + Bṛhat Saṃhitā | 1978, 2038 |
| 53 | དོན་གྲུབ | `don grub` | *dön drup* | सिद्धार्थी | Siddhārthī | Aim accomplished | सिद्धा र्थ mf( आ )n. one who has accomplished an aim or object, successful, prosperous, MBh. ; Kāv. &c. ([+16 more](#sanskrit-senses-at-position-53)) | one who has accomplished an aim | MW via cross-reference from सिद्धार्थिन्; position: unstated | 1979, 2039 |
| 54 | དྲག་པོ | `drag po` | *drak po* | रौद्र | Raudra | Fierce | रौद्र or रौद्र , mf( आ or ई )n. ( fr. रुद्र ) relating or belonging to or coming from Rudra or the Rudra s, Rudra -like, violent, impetuous, fierce, wild ( अम् ind. ), RV. &c. &c. ([+24 more](#sanskrit-senses-at-position-54)) | savageness, fierceness | MW as printed; Wiktionary; 5 other lexicon(s); position: Wiktionary + Bṛhat Saṃhitā | 1980, 2040 |
| 55 | བློ་ངན | `blo ngan` | *lo ngen* | दुर्मति | Durmati | Ill-minded | दुर् —मति f. bad disposition of mind, envy, hatred, RV. ; VS. ; AV. ([+6 more](#sanskrit-senses-at-position-55)) | weak-minded, silly | MW as printed; Wiktionary; 5 other lexicon(s); position: Wiktionary + Bṛhat Saṃhitā | 1981, 2041 |
| 56 | རྔ་ཆེན | `rnga chen` | *nga chen* | दुन्दुभि † | Dundubhi † | Great drum | दुन्दुभि m. f. a sort of large kettledrum, RV. ; Br. ; MBh. ; Kāv. &c. ([+10 more](#sanskrit-senses-at-position-56)) | a sort of large kettledrum | MW as printed; Wiktionary; 5 other lexicon(s); position: Bṛhat Saṃhitā | 1982, 2042 |
| 57 | ཁྲག་སྐྱུག | `khrag skyug` | *trak kyuk* | रुधिरोद्गारी † | Rudhirodgārī † | Blood-spitting | रुधिरो द्गारिन् mf( इणी )n. ‘emitting b˚ ’, N. of the 57th year in Jupiter's cycle of 60 years, Cat. | emitting blood ‡ | MW via -in stem; position: unstated | 1983, 2043 |
| 58 | མིག་དམར | `mig dmar` | *mik mar* | रक्ताक्ष † | Raktākṣa † | Red-eyed | रक्ता क्ष mf( ई )n. red-eyed, having red or blood-shot eyes, R. ; BhP. ( -ता f. , Dharmaś. ) ([+9 more](#sanskrit-senses-at-position-58)) | red-eyed | MW as printed; Wiktionary; 3 other lexicon(s); position: Wiktionary | 1984, 2044 |
| 59 | ཁྲོ་བོ | `khro bo` | *tro bo* | क्रोधन | Krodhana | Wrathful — masculine, against 38 | क्रोधन mf( आ )n. ( Pāṇ. iii, 2, 151 ) inclined to wrath, passionate, angry (with loc. Yājñ. i, 333 ), MBh. &c. ([+9 more](#sanskrit-senses-at-position-59)) | inclined to wrath, passionate | MW as printed; Wiktionary; 4 other lexicon(s); position: Wiktionary + Bṛhat Saṃhitā | 1985, 2045 |
| 60 | ཟད་པ | `zad pa` | *zé pa* | क्षय † | Kṣaya † | Exhaustion | 1. क्षय m. ‘dominion’, Sāy. (on, RV. vii, 46, 2 ). ([+19 more](#sanskrit-senses-at-position-60)) | destruction, decay | MW as printed; Wiktionary; 5 other lexicon(s); position: unstated | 1986, 2046 |

## The senses in full

Every sense Monier-Williams gives, with its Cologne record ID and homonym group, and the printed page
the entry sits on. **The selected gloss is bolded** in its sense, so the editorial choice can be
checked against everything it was chosen from rather than taken on trust.

### Sanskrit senses at position 1

प्रभव Prabhava

Monier-Williams, printed page 683, queried as `प्रभव` (as printed). Also carried by Shabda-Sagara, Benfey, Yates, Apte.

- प्र-भव &c. See under प्र- √भू . *(H1 · 135404)*
- प्र-भव mfn. prominent, excelling, distinguished, RV. *(H2 · 135529)*
- **प्र-भव m. production, source, origin, cause of existence (as father or mother, also ‘the Creator’), birthplace (often ifc. , with f( आ ). , springing or rising or derived from, belonging to), Up. ; Mn. ; MBh. &c.** *(H2 · 135530)*
- प्र-भव m. might, power (= प्र-भाव ), L. *(H2 · 135531)*
- N. of a Sādhya , Hariv. *(H2 · 135532)*
- of Viṣṇu , A. *(H2 · 135533)*
- of sev. men, HPariś. *(H2 · 135534)*
- N. of the first or 35th year in a 60 years' cycle of Jupiter, Var. *(H2 · 135535)*

### Sanskrit senses at position 2

विभव Vibhava

Monier-Williams, printed page 977, queried as `विभव` (as printed). Also carried by Shabda-Sagara, Benfey, Yates, Edgerton, Wilson.

- वि-भव &c. See under वि- √भू . *(H1 · 198262)*
- वि-भव mfn. powerful, rich, MBh. xiii, 802 *(H2 · 198398)*
- वि-भव m. being everywhere, omnipresence, Kaṇ. *(H2 · 198399)*
- **development, evolution (with Vaiṣṇava s ‘the evolution of the Supreme Being into secondary forms’), Sarvad.** *(H2 · 198400)*
- power, might, greatness, exalted position, rank, dignity, majesty, dominion, R. ; Kālid. ; VarBṛS. &c. ( ifc. with loc. , ‘one whose power consists in’, Gīt. ) *(H2 · 198401)*
- influence upon ( loc. ), ŚāṅkhŚr. *(H2 · 198402)*
- (also pl. ) wealth, money, property, fortune, MBh. ; Kāv. &c. *(H2 · 198403)*
- luxury, anything sumptuary or superfluous, Hcar. *(H2 · 198404)*
- magnanimity, lofty-mindedness, W. *(H2 · 198405)*
- emancipation from existence, Inscr. ; BhP. *(H2 · 198406)*
- N. of the 2nd year in Jupiter's cycle of 60 years, VarBṛS. *(H2 · 198407)*
- destruction (of the world), Buddh. *(H2 · 198408)*
- (in music) a kind of measure *(H2 · 198409)*

### Sanskrit senses at position 3

शुक्ल Śukla

Monier-Williams, printed page 1080, queried as `शुक्ल` (as printed). Also carried by Shabda-Sagara, Benfey, Yates, Edgerton.

- शुक्ल mf( आ )n. (later form of शुक्र , for which it is sometimes w.r. ) bright, light (with पक्ष = शुक्ल-प् ॰ , q.v. ), KātyŚr. ; Mn. ; MBh. &c. *(H2 · 219024)*
- white, whitish, AitBr. &c. &c. *(H2 · 219025)*
- pure, spotless, unsullied, MBh. ; Kāv. &c. *(H2 · 219026)*
- also for शुक्र , Venus *(H2 · 219026)*
- शुक्ल m. the bright half of a lunar month or any day in it, GṛŚrS. ; Mn. ; MBh. &c. *(H2 · 219027)*
- the month Vaiśākha , BhP. ( Sch. ) *(H2 · 219028)*
- **white (the colour), L.** *(H2 · 219029)*
- mucus, saliva ( शुक्लं- √कृ , to spit at), AV. *(H2 · 219030)*
- ricinus or white r˚ L. *(H2 · 219031)*
- Mimusops Hexandra , L. *(H2 · 219032)*
- the 37th (or 3rd) year of Jupiter's cycle of 60 years, VarBṛS. *(H2 · 219033)*
- the 24th of the astronomical, Yogas. ; L. *(H2 · 219034)*
- N. of Śiva , MBh. *(H2 · 219035)*
- of Viṣṇu , BhP. *(H2 · 219036)*
- of a son of Havir-dhāna ( cf. शुक्र ), Hariv. *(H2 · 219037)*
- of a Muni , Cat. *(H2 · 219038)*
- of a king, Buddh. *(H2 · 219039)*
- of a mountain, BhP. *(H2 · 219040)*
- शुक्ला ( आ ), f. a white cow, KātyŚr. *(H2B · 219041)*
- white or candied sugar, L. *(H2B · 219042)*
- Euphorbia Antiquorum , L. *(H2B · 219043)*
- = काकौली and विदारी , L. *(H2B · 219044)*
- N. of Sarasvatī , L. *(H2B · 219045)*
- of a daughter of Siṃha-hanu , Buddh. *(H2B · 219046)*
- of a river, BhP. *(H2B · 219047)*
- शुक्ल n. brightness, light, MaitrUp. *(H2B · 219048)*
- a white spot, white substance, anything white, AV. ; ŚBr. ; ChUp. *(H2B · 219049)*
- the white of the eye, ŚBr. ; R. ; Suśr. *(H2B · 219050)*
- a disease of the cornea or white part of the eye (opacity, albugo; cf. शुक्र ), L. *(H2B · 219051)*
- silver, L. *(H2B · 219052)*
- fresh butter, L. *(H2B · 219053)*

### Sanskrit senses at position 4

प्रमोद Pramoda

Monier-Williams, printed page 686, queried as `प्रमोद` (as printed). Also carried by Shabda-Sagara, Benfey, Yates, Edgerton, Wilson.

- **प्र-मोद m. (also pl. ; ifc. f( आ ). ) excessive joy, delight, gladness, VS. ; Up. ; MBh. &c.** *(H2 · 136015)*
- (also n. ) one of the 8 Sāṃkhya perfections, Tattvas. ; Sāṃkhyak. , Sch. *(H2 · 136016)*
- (with Jaina s) joy as exhibited in the virtuous, HYog. *(H2 · 136017)*
- Pleasure personified, Hariv. (as a child of Brahmā , VP. ) *(H2 · 136018)*
- the 4th year in a 60 years' cycle of Jupiter, VarBṛS. viii, 29 *(H2 · 136019)*
- a strong perfume, BhP. *(H2 · 136020)*
- a kind of rice, Gal. *(H2 · 136021)*
- N. of a being attendant upon Skanda , MBh. *(H2 · 136022)*
- of a Nāga , ib. *(H2 · 136023)*
- of an author, Cat. *(H2 · 136024)*
- of sev. men, VP. ; Rājat. *(H2 · 136025)*
- प्र-मोद &c. See प्र- √मुद् . *(H1 · 136130)*

### Sanskrit senses at position 5

प्रजापति Prajāpati

Monier-Williams, printed page 658, queried as `प्रजापति` (as printed). Also carried by Shabda-Sagara, Benfey, Yates, Edgerton.

- **प्रजा —पति ( ॰जा- ), m. ‘lord of creatures’, N. of Savitṛ , Soma , Agni , Indra &c., RV. ; AV.** *(H3 · 130885)*
- **( ॰जा- ) a divinity presiding over procreation, protector of life, ib. ; VS. ; Mn. ; Suśr. ; BhP.** *(H3 · 130885)*
- **( ॰जा- ) lord of creatures, creator, RV. &c. &c. ( N. of a supreme god above or among the Vedic deities [ RV. (only x, 21, 10 ); AV. ; VS. ; Br. ] but in later times also applied to Viṣṇu , Śiva , Time personified, the sun, fire, &c., and to various progenitors, esp. to the 10 lords of created beings first created by Brahmā , viz. Marīci , Atri , Aṅgiras , Pulastya , Pulaka , Kratu , Vasiṣṭha , Pracetas or Dakṣa , Bhṛgu , Nārada [ Mn. i, 34 ; cf. IW. 206 n. 1 ], of whom some authorities count only the first 7, others the last 3)** *(H3 · 130885)*
- **( ॰जा- ) a father, L.** *(H3 · 130885)*
- **( ॰जा- ) a king, prince, L.** *(H3 · 130885)*
- **( ॰जा- ) a son-in-law, L.** *(H3 · 130885)*
- **( ॰जा- ) the planet Mars, a partic. star, δ Aurigae, Sūryas.** *(H3 · 130885)*
- **( ॰जा- ) (in astrol. ) = 2. काल-नर , q.v.** *(H3 · 130885)*
- **( ॰जा- ) a species of insect, L.** *(H3 · 130885)*
- **( ॰जा- ) N. of sev. men and authors, Cat.** *(H3 · 130885)*
- **प्रजा —पती ( ॰जा- ), f. a matron, lady, Divyāv.** *(H3B · 130885)*
- **N. of Gautama Buddha 's aunt and nurse (with the patr. Gautamī , the first woman who assented to his doctrines), Lalit.** *(H3B · 130885)*

### Sanskrit senses at position 6

आङ्गिरस Āṅgirasa

Monier-Williams, printed page 131, queried as `आङ्गिरस` (as printed). Also carried by Shabda-Sagara, Benfey, Yates, Edgerton, Wilson.

- आङ्गिरस mf( ई )n. descended from or belonging or referring to the Aṅgirases or to Aṅgiras , AV. ; VS. &c. *(H1 · 22843)*
- **आङ्गिरस ( अस् ), m. a descendant of Aṅgiras (as Bṛhatsāman [ AV. ], Cyavana [ ŚBr. iv ], Ayāsya [ ŚBr. xiv ], &c.), RV. ; AV. &c.** *(H1 · 22844)*
- especially N. of Bṛhaspati , RV. ; AV. &c. *(H1 · 22845)*
- the planet Bṛhaspati i.e. Jupiter *(H1 · 22846)*
- (also) m. a partic. magical implement, Kauś. *(H1 · 22846)*
- आङ्गिरसी ( ई ), f. a female descendant of Aṅgiras , MBh. i, 6908 ; iii, 14128. *(H1B · 22847)*

### Sanskrit senses at position 7

श्रीमुख Śrīmukha

Monier-Williams, printed page 1099, queried as `श्रीमुख` (as printed). Also carried by Shabda-Sagara, Yates.

- **श्री —मुख n. a beautiful face, MW.** *(H3 · 223180)*
- श्री —मुख m. the word Śrī written on the back of a letter, ib. *(H3 · 223181)*
- the 7th (or 41st) year of Jupiter's cycle of 60 years, VarBṛS. *(H3 · 223182)*
- N. of a medical author ( cf. श्री-सुख ), Cat. *(H3 · 223183)*
- श्री —मुखी f. See next. *(H3B · 223184)*

### Sanskrit senses at position 8

भाव Bhāva

Monier-Williams, printed page 754, queried as `भाव` (as printed). Also carried by Shabda-Sagara, Benfey, Yates, Edgerton, Wilson.

- **भाव m. (√ भू ) becoming, being, existing, occurring, appearance, ŚvetUp. ; KātyŚr. &c.** *(H1 · 150178)*
- turning or transition into ( loc. or comp. ), MBh. ; RPrāt. *(H1 · 150179)*
- continuance ( opp. to cessation; एको ति-भाव , continuity of the thread of existence through successive births, Buddh. , wrongly translated under एको ति-भ् ॰ ), MBh. *(H1 · 150180)*
- state, condition, rank (with स्थाविर , old age; अन्यम् भावम् आपद्यते , euphem. = he dies; state of being anything, esp. ifc. , e.g. बालभाव , the state of being a child, childhood = बालता or -त्व ; sometimes added pleonastically to an abstract noun, e.g. तनुता-भाव , the state of thinness), Up. ; ŚrS. ; MBh. &c. *(H1 · 150181)*
- true condition or state, truth, reality ( ibc. and ॰वेन ind. really, truly), MBh. ; Hariv. *(H1 · 150182)*
- manner of being, nature, temperament, character ( एको भावः or एक-भ् ॰ , a simple or artless nature; भावो भावं निगच्छति = birds of a feather flock together), MBh. ; Kāv. &c. *(H1 · 150183)*
- manner of acting, conduct, behaviour, Kāv. ; Sāh. *(H1 · 150184)*
- any state of mind or body, way of thinking or feeling, sentiment, opinion, disposition, intention ( यादृशेन भावेन , with whatever disposition of mind; भावम् अमङ्गलं- √कृ , with loc. , to be ill disposed against; भावं दृढं- √कृ , to make a firm resolution), Mn. ; MBh. &c. *(H1 · 150185)*
- (in rhet. ) passion, emotion (2 kinds of Bhāva s are enumerated, the स्थायिन् or primary, and व्यभिचारिन् or subordinate; the former are 8 or 9 according as the Rasa s or sentiments are taken to be 8 or 9; the latter 33 or 34), Kāv. ; Sāh. ; Pratāp. &c. *(H1 · 150186)*
- conjecture, supposition, Mn. ; Pañcat. *(H1 · 150187)*
- purport, meaning, sense ( इति भावः , ‘such is the sense’ = इत्य् अर्थः or इत्य् अभिप्रा यः , constantly used by commentators at the end of their explanations) *(H1 · 150188)*
- love, affection, attachment ( भावं- √कृ , with loc. , to feel an affection for), MBh. ; Kāv. &c. *(H1 · 150189)*
- the seat of the feelings or affections, heart, soul, mind ( परितुष्टेन भावेन , with a pleased mind), ŚvetUp. ; Mn. ; MBh. &c. *(H1 · 150190)*
- that which is or exists, thing or substance, being or living creature ( सर्व-भावाः , all earthly objects; भावाः स्थावर-जङ्गमाः , plants and animals), MuṇḍUp. ; MBh. &c. *(H1 · 150191)*
- (in dram. ) a discreet or learned man (as a term of address = respected sir), Mṛcch. ; Mālav. ; Mālatīm. *(H1 · 150192)*
- (in astron. ) the state or condition of a planet, L. *(H1 · 150193)*
- an astrological house or lunar mansion, ib. *(H1 · 150194)*
- N. of the 27th Kalpa ( s.v. ), ib. *(H1 · 150195)*
- of the 8th (42nd) year in Jupiter's cycle of 60 years, VarBṛS. *(H1 · 150196)*
- (in gram. ) the fundamental notion of the verb, the sense conveyed by the abstract noun ( esp. as a term for an impersonal passive or neuter verb having neither agent nor object expressed, e.g. पच्यते , ‘there is cooking’ or ‘cooking is going on’), Pāṇ. iii, 1, 66 ; 107 &c. *(H1 · 150197)*
- N. of the author of the Bhāvaprakāśa (= मिश्र-भाव ), Cat. *(H1 · 150198)*
- wanton sport, dalliance, L. *(H1 · 150199)*
- birth, L. *(H1 · 150200)*
- place of birth, the womb, L. *(H1 · 150201)*
- the world, universe, L. *(H1 · 150202)*
- an organ of sense, L. *(H1 · 150203)*
- superhuman power, L. *(H1 · 150204)*
- the Supreme Being, L. *(H1 · 150205)*
- advice, instruction, L. *(H1 · 150206)*
- contemplation, meditation, L. ( cf. -समन्वित ). *(H1 · 150207)*
- भावेन ind. , really, truly *(H1C · 150207)*
- भाव &c. See p. 754 &c. *(H2 · 151460)*

### Sanskrit senses at position 9

युवन् Yuvan

Monier-Williams, printed page 855, queried as `युवन्` (as printed). Also carried by Shabda-Sagara, Benfey, Yates, Wilson.

- **युवन् mf( यूनी , or युवती or युवति , q.v. )n. ( prob. fr. √ 2. यु ) young, youthful, adult (applied to men and animals), strong, good, healthy, RV. &c. &c.** *(H1 · 172161)*
- युवन् m. a youth, young man, young animal (in Veda often applied to gods, esp. to Indra , Agni , and the Marut s), ib. *(H1 · 172162)*
- (in gram. ) the younger descendant of any one (an elder being still alive), Pāṇ. i, 2, 65 , &c. *(H1 · 172163)*
- N. of the ninth year in Jupiter's cycle of 60 years, Jyot. ; an elephant 60 years old, Gal. *(H1 · 172164)*
- युवन् [ cf. Lat. juvenis , juventa ; Slav. junǔ ; Lith. jáunas ; Goth. juggs ; Germ. junc , jung ; Angl.Sax. geong ; Eng. young .] *(H1 · 172164)*

### Sanskrit senses at position 10

धातृ Dhātṛ

Monier-Williams, printed page 514, queried as `धातृ` (as printed). Also carried by Shabda-Sagara, Benfey, Yates, Edgerton.

- **धातृ m. establisher, founder, creator, bearer, supporter ( cf. वसु- ), orderer, arranger, RV. &c. &c.** *(H2 · 100718)*
- N. of a divine being who personifies these functions (in Vedic times presiding over generation, matrimony, health, wealth, time and season, and associated or identified with Savitṛ , Prajā-pati , Tvaṣṭṛ , Bṛhaspati , Mitra , Aryaman , Viṣṇu &c., RV. x ; AV. ; TS. ; ŚBr. &c.; later chiefly the creator and maintainer of the world = Brahmā or Prajā-pati , MBh. ; Kāv. ; Pur. ; in ep. one of the 12 Āditya s and brother of Vi-dhātṛ and Lakṣmī , son of Brahmā , MBh. ; or of Bhṛgu and Khyāti , Pur. ; Fate personified, Kāv. ) *(H2 · 100719)*
- one of the 49 winds, VahniP. *(H2 · 100720)*
- paramour, adulterer, Daś. *(H2 · 100721)*
- the 10th or 44th year in the cycle of Jupiter, Cat. *(H2 · 100722)*
- N. of a Ṛṣi in the 4th Manv-antara , Hariv. ( C. धामन् ) *(H2 · 100723)*
- of an author, Cat. ; ( त्री ) f. See धात्री . *(H2 · 100724)*
- धातृ [ cf. Zd. dātar ; Gk. θετήρ ; Slav. děteli .] *(H2 · 100724)*
- धातृ , धात्री , &c. See col. 1 . *(H1 · 100907)*

### Sanskrit senses at position 11

ईश्वर Īśvara

Monier-Williams, printed page 171, queried as `ईश्वर` (as printed). Also carried by Shabda-Sagara, Benfey, Yates, Edgerton.

- ईश्वर mfn. able to do, capable of (with gen. of Vedic inf. , or with common inf. ), liable, exposed to, AV. ; TS. ; ŚBr. ; AitBr. ; Kum. ; Hit. &c. *(H2 · 29881)*
- **ईश्वर mf( ई ). master, lord, prince, king, mistress, queen, AV. ; ŚBr. ; Ragh. ; Mn. &c.** *(H2 · 29882)*
- ईश्वर ( अस् ), m. a husband, MBh. *(H2 · 29883)*
- God *(H2 · 29884)*
- the Supreme Being, Mn. ; Suśr. ; Yājñ. &c. *(H2 · 29885)*
- the supreme soul ( आत्मन् ) *(H2 · 29886)*
- Śiva *(H2 · 29887)*
- one of the Rudra s *(H2 · 29888)*
- the god of love *(H2 · 29889)*
- N. of a prince *(H2 · 29890)*
- the number ‘eleven’ *(H2 · 29891)*
- ईश्वरा ( आ or ई ), f. N. of Durgā *(H2B · 29892)*
- of Lakṣmī *(H2B · 29893)*
- of any other of the Śakti s or female energies of the deities *(H2B · 29894)*
- N. of several plants, L. *(H2B · 29895)*

### Sanskrit senses at position 12

बहुधान्य Bahudhānya

Monier-Williams, printed page 725, queried as `बहुधान्य` (as printed).

- **बहु —धान्य m. ‘abounding in corn’, N. of the 12th or 46th year in a 60 years' cycle of Jupiter, Var.** *(H3 · 143644)*

### Sanskrit senses at position 13

प्रमाथी Pramāthī

Monier-Williams, printed page 685, queried as `प्रमाथिन्` (-in stem).

- **प्र- ॰माथिन् mfn. stirring about, tearing, rending, troubling, harassing, destroying, MBh. ; Kāv. &c.** *(H3 · 135703)*
- striking off, used for striking off, MBh. *(H3 · 135704)*
- (in med. ) throwing out i.e. producing secretion of the vessels, Car. ; Bhpr. *(H3 · 135705)*
- प्र- ॰माथिन् m. N. of the 13th (47th) year of a 60 years' cycle of Jupiter, Var. (also w.r. for प्र-मादिन् ) *(H3 · 135706)*
- of a Rākṣasa , MBh. *(H3 · 135707)*
- of a son of Dhṛtarāṣṭra , ib. *(H3 · 135708)*
- of a monkey, R. *(H3 · 135709)*
- प्र- ॰माथिनी f. N. of an Apsaras , MBh. ; Hariv. *(H3B · 135710)*

### Sanskrit senses at position 14

विक्रम Vikrama

Monier-Williams, printed page 950, queried as `विक्रम` (as printed). Also carried by Shabda-Sagara, Benfey, Yates, Edgerton.

- 1\. वि —क्रम m. (for 2. See वि- √क्रम् ) the absence of the Krama-pāṭha ( q.v. ), RPrāt. *(H3 · 192937)*
- 2\. वि-क्रम m. (for 1. See p. 950 , col. 1 ) a step, stride, pace, ŚBr. &c. &c. *(H2 · 194158)*
- going, proceeding, walking, motion, gait, MBh. , Kāś. &c. *(H2 · 194159)*
- course, way, manner ( अनुक्रम-विक्रमेण = अनुक्रमेण , in regular order), MBh. *(H2 · 194160)*
- **valour, courage, heroism, power, strength, ib. ; Kāv. &c. ( ॰मं-√कृ , to display prowess, use one's strength)** *(H2 · 194161)*
- force, forcible means, ib. ( ॰मात् ind. by force; ना स्ति विक्रमेण , it cannot be done by force) *(H2 · 194162)*
- intensity, high degree, VarBṛS. *(H2 · 194163)*
- stability, duration ( opp. to ‘cessation’), BhP. *(H2 · 194164)*
- a kind of grave accent, TPrāt. *(H2 · 194165)*
- non-change of the Visarga into an Ūṣman , RPrāt. *(H2 · 194166)*
- the 14th year in the 60 years cycle of Jupiter, VarBṛS. *(H2 · 194167)*
- the 3rd astrological house, ib. *(H2 · 194168)*
- a foot, L. *(H2 · 194169)*
- N. of Viṣṇu , MBh. *(H2 · 194170)*
- of the son of Vasu , Kathās. *(H2 · 194171)*
- of a son of Vatsa-prī , MārkP. *(H2 · 194172)*
- of a son of Kanaka , Cat. *(H2 · 194173)*
- of various authors (also with भट्ट ), Cat. *(H2 · 194174)*
- = चन्द्रगुप्त , ib. *(H2 · 194175)*
- = विक्रमा दित्य , Pañcad. *(H2 · 194176)*
- N. of a town, Cat. *(H2 · 194177)*
- वि-क्रमात् ind. , by force *(H2C · 194177)*

### Sanskrit senses at position 15

वृषभ Vṛṣabha

Monier-Williams, printed page 1012, queried as `वृषभ` (as printed). Also carried by Shabda-Sagara, Benfey, Yates, Wilson.

- वृषभ mfn. ( cf. ऋषभ ) manly, mighty, vigorous, strong (applied like वृषन् to animate and inanimate objects), RV. ; AV. *(H2 · 205067)*
- वृषभ m. ( ifc. f( आ ). ) a bull (in Veda epithet of various gods, as of Indra , Bṛhas-pati , Parjanya &c.; according to Sāy. = वर्षयितृ , ‘a showerer of bounties, benefactor’), RV. &c. *(H2 · 205068)*
- **वृषभ m. the chief, most excellent or eminent, lord or best among (in later language mostly ifc. , or with gen. ), ib.** *(H2 · 205069)*
- the zodiacal sign Taurus, VarBṛS. *(H2 · 205070)*
- a partic. drug (described as a root brought from the Himālaya mountains, resembling the horn of a bull, of cooling and tonic properties, and serviceable in catarrh and consumption), Bhpr. *(H2 · 205071)*
- the hollow or orifice of the ear, L. *(H2 · 205072)*
- N. of Daśad-yu , RV. *(H2 · 205073)*
- of an Asura slain by Viṣṇu , Hariv. ( v.l. ऋष् ॰ ) *(H2 · 205074)*
- of one of the sons of the 10th Manu , MārkP. *(H2 · 205075)*
- of a warrior, MBh. *(H2 · 205076)*
- of a son of Kuśāgra , Hariv. ( v.l. ऋष् ॰ ) *(H2 · 205077)*
- of a son of Kārtavīrya , BhP. *(H2 · 205078)*
- (with Jaina s) of the first Arhat of the present Avasarpiṇī , Col. *(H2 · 205079)*
- of a mountain in Giri-vraja , MBh. ; Hariv. &c. *(H2 · 205080)*
- (in astron. ) of the 28th Muhūrta *(H2 · 205081)*
- वृषभा ( आ ), f. N. of the three lunar mansions ( viz. of Maghā , Pūrva-phalgunī , and Uttaraphalgunī ), VP. ( cf. वीथि ) *(H2B · 205082)*
- of a river, MBh. *(H2B · 205083)*
- वृषभी ( ई ), f. a widow, L. *(H2B · 205083)*
- Mucuna Pruriens , L. *(H2B · 205084)*

### Sanskrit senses at position 16

चित्रभानु Citrabhānu

Monier-Williams, printed page 396, queried as `चित्रभानु` (as printed). Also carried by Shabda-Sagara, Benfey, Yates, Edgerton, Wilson.

- **चित्र —भानु ( ॰त्र- ), mfn. of variegated lustre, shining with light, RV. ; AV. iv, 25, 3 ; xiii, 3, 10 ; TBr. ii f. ; Kauś. ; MBh. i, 722** *(H3 · 73817)*
- **N. of fire, MBh. ; Hariv. ; R. ; BhP. ; Sāh.** *(H3 · 73817)*
- **= ॰त्रा र्चिस् , L.** *(H3 · 73817)*
- **Plumbago zeylanica , L.** *(H3 · 73817)*
- **Calotropis gigantea , L.** *(H3 · 73817)*
- **the 16th year in the 60 years' cycle of Jupiter, VarBṛS. viii, 35 ; Romakas.** *(H3 · 73817)*
- **N. of Bhairava , L.** *(H3 · 73817)*
- **of a prince, VP. iv, 16, 2 ( v.l. )** *(H3 · 73817)*
- **of Bāṇa (-bhaṭṭa )'s father.** *(H3 · 73817)*

### Sanskrit senses at position 17

स्वभानु Svabhānu

Monier-Williams, printed page 1276, queried as `स्वभानु` (as printed).

- **स्व —भानु ( स्व- ), mfn. self-luminous, RV.** *(H3 · 258037)*

### Sanskrit senses at position 18

तारण Tāraṇa

Monier-Williams, printed page 444, queried as `तारण` (as printed). Also carried by Shabda-Sagara, Benfey, Yates, Edgerton, Wilson.

- **तारण mf( ई )n. causing or enabling to cross, helping over a difficulty, liberating, saving, MBh. xiii, 1232 (Śiva ) and 6986 (Viṣṇu ), Hariv. 7022 and 7941 ; Kathās. lxvii, 1** *(H2 · 84334)*
- तारण m. a float, raft, L. *(H2 · 84335)*
- तारण n. crossing, safe passage *(H2 · 84336)*
- conquering (difficulties), MBh. iv , xiv ; R. &c. *(H2 · 84337)*
- carrying across, liberating, saving, MBh. i , iii , ix *(H2 · 84338)*
- N. of a Sāman *(H2 · 84339)*
- the 3rd year of the 4th Jupiter cycle, VarBṛS. viii, 3 ; Sūryas. ; Jyot. *(H2 · 84340)*
- pl. N. of a family, Pravar. ii, 3, 6. *(H2 · 84341)*

### Sanskrit senses at position 19

पार्थिव Pārthiva

Monier-Williams, printed page 621, queried as `पार्थिव` (as printed). Also carried by Shabda-Sagara, Benfey, Yates, Wilson.

- पार्थिव mf( ई or आ ; cf. Pāṇ. iv, 1, 85 , Vārtt. 2)n. ( fr. पृथिवी f. of पृथु ) earthen, earthy, earthly, being in or relating to or coming from the earth, terrestrial, RV. &c. &c. *(H2 · 122894)*
- पार्थिव mf( ई )n. (from m. below) fit for kings or princes, royal, princely, MBh. ; Hariv. *(H2 · 122895)*
- पार्थिव m. an inhabitant of the earth, RV. ; AV. *(H2 · 122896)*
- **a lord of the earth, king, prince, warrior, Mn. ; MBh. &c.** *(H2 · 122897)*
- an earthen vessel, L. *(H2 · 122898)*
- a partic. Agni , Gṛhyās. *(H2 · 122899)*
- the 19th (or 53rd) year in Jupiter's cycle of 60 years, Var. *(H2 · 122900)*
- ( pl. ) N. of a family belonging to the Kauśika s, Hariv. *(H2 · 122901)*
- पार्थिवी ( ई ), f. ‘earth-born’, N. of Sītā , Ragh. *(H2B · 122902)*
- of Lakṣmī , L. *(H2B · 122903)*
- (with शान्ति ) N. of wk. *(H2B · 122904)*
- पार्थिव n. ( pl. ) the regions of the earth, RV. *(H2B · 122905)*
- an earthy substance, Hariv. ( v.l. ॰थवि ), Suśr. *(H2B · 122906)*
- Tabernaemontana Coronaria , L. *(H2B · 122907)*

### Sanskrit senses at position 20

अव्यय/व्यय Avyaya/Vyaya

Monier-Williams, printed page 111, queried as `अव्यय` (as printed). Also carried by Shabda-Sagara, Benfey, Yates, Wilson.

- 1\. अव्यय or rarely अव्यय [only RV. viii, 97, 2 and ix, 86, 34 ] mfn. ( अवि ) made of sheep's skin (as the woollen Soma strainer), RV. *(H1 · 19307)*
- belonging to or consisting of sheep, RV. viii, 97, 2. *(H1 · 19307)*
- **2\. अ-व्यय mf( आ )n. not liable to change, imperishable, undecaying, Up. ; Mn. &c.** *(H1 · 19308)*
- ‘not spending’, parsimonious *(H1 · 19309)*
- अ-व्यय m. N. of Viṣṇu or Śiva , L. *(H1 · 19310)*
- of a son of Manu Raivata , Hariv. 433 *(H1 · 19311)*
- of a Nāga demon, MBh. i, 2157 ( ed. Bomb. ) *(H1 · 19312)*
- the non-spending, parsimony *(H1 · 19313)*
- अ-व्यय n. [or m. , L. ] an indeclinable word, particle, Pāṇ. ; APrāt. &c. *(H1 · 19314)*
- अ-व्यय n. (in Vedānta ) a member or corporeal part of an organized body, L. *(H1 · 19315)*

### Sanskrit senses at position 21

सर्वजित् Sarvajit

Monier-Williams, printed page 1185, queried as `सर्वजित्` (as printed). Also carried by Shabda-Sagara, Benfey, Yates, Wilson.

- **सर्व —जित् mfn. all-conquering, L.** *(H3 · 238261)*
- conqu˚ all (three) humours, Car. *(H3 · 238262)*
- all-surpassing, excellent, W. *(H3 · 238263)*
- सर्व —जित् m. death, Car. *(H3 · 238264)*
- a partic. Ekāha , PañcavBr. ; KātyŚr. ; Vait. *(H3 · 238265)*
- the 21st year of Jupiter's cycle of 60 years, VarBṛS. *(H3 · 238266)*
- N. of a man, KauṣUp. *(H3 · 238267)*

### Sanskrit senses at position 22

सर्वधारी Sarvadhārī

Monier-Williams, printed page 1186, queried as `सर्वधारिन्` (-in stem). Also carried by Shabda-Sagara, Yates, Wilson.

- **सर्व —धारिन् m. ‘all-holder’, N. of Śiva , MBh.** *(H3 · 238402)*
- of the 22nd year of Jupiter's cycle of 60 years (also ॰धारी f. accord. to some), VarBṛS. *(H3 · 238403)*

### Sanskrit senses at position 23

विरोधी Virodhī

Monier-Williams, printed page 984, queried as `विरोधिन्` (-in stem). Also carried by Shabda-Sagara, Benfey, Yates, Wilson.

- **वि-रोधिन् mfn. opposing, hindering, preventing, obstructing, excluding, disturbing, Gobh. ; Mn. &c.** *(H2 · 199449)*
- obstructive (see अ-व् ॰ ), besieging, blockading, W. *(H2 · 199450)*
- dispelling, removing, Śak. ( v.l. ) *(H2 · 199451)*
- adverse, hostile, inimical (often ifc. = foe or enemy of), MBh. ; Kāv. &c. *(H2 · 199452)*
- disagreeing (as food), Bhpr. *(H2 · 199453)*
- opposed, contradictory, inconsistent, Kaṇ. ; MBh. ; Rājat. *(H2 · 199454)*
- rivalling with, equalling, Kāvyād. *(H2 · 199455)*
- contentious, quarrelsome, W. *(H2 · 199456)*
- वि-रोधिन् m. N. of the 25th year of Jupiter's cycle of 60 years, VarBṛS. *(H2 · 199457)*
- वि-रोधिनी ( ई ), f. a woman who causes enmity or promotes quarrel (between husband and wife &c.), MW. *(H2B · 199458)*
- N. of a female demon (daughter of Duḥsaha ), MārkP. *(H2B · 199459)*

### Sanskrit senses at position 24

विकृति Vikṛti

Monier-Williams, printed page 954, queried as `विकृति` (as printed). Also carried by Shabda-Sagara, Benfey, Yates.

- **वि-कृति f. change, alteration, modification, variation, changed condition (of body or mind; acc. with √ गम् , या , व्रज् , or प्र- √पद् , to undergo a change, be changed), MBh. ; Kāv. &c.** *(H2 · 194023)*
- sickness, disease, L. *(H2 · 194024)*
- perturbation, agitation, emotion, MBh. ; Kathās. &c. *(H2 · 194025)*
- alienation, hostility, defection, Kām. ; Pañcat. *(H2 · 194026)*
- a verse changed in a partic. manner, ŚBr. ; KātyŚr. *(H2 · 194027)*
- an apparition, phantom, spectre, Kathās. *(H2 · 194028)*
- any production ( ifc. anything made of), MBh. ; Suśr. *(H2 · 194029)*
- (in Sāṃkhya ) = 2. वि-कार *(H2 · 194030)*
- (in gram. ) a derivative, Nir. *(H2 · 194031)*
- formation, growth, development, AitBr. *(H2 · 194032)*
- abortion, Suśr. ( v.l. वैकृत ) *(H2 · 194033)*
- = डिम्ब , L. *(H2 · 194034)*
- = प्रलाप , Harav. , Sch. *(H2 · 194035)*
- N. of a class of metres, Piṅg. *(H2 · 194036)*
- वि-कृति m. N. of a son of Jīmūta , VP. *(H2 · 194037)*

### Sanskrit senses at position 25

खर Khara

Monier-Williams, printed page 337, queried as `खर` (as printed). Also carried by Shabda-Sagara, Benfey, Yates, Edgerton, Wilson.

- खर mf( आ )n. hard, harsh, rough, sharp, pungent, acid (opposed to मृदु and श्लक्ष्ण ), MBh. ; R. &c. *(H1 · 61341)*
- solid (opposed to द्रव , fluid), Pāṇ. vii, 3, 69 ; Pat. , Kāś. on Pāṇ. ii, 1, 35 and iv, 2, 16 *(H1 · 61342)*
- dense (clouds), R. vi, 87, 3 *(H1 · 61343)*
- sharp, hot (wind), Suśr. i, 20, 22 *(H1 · 61344)*
- hurtful, injurious, cutting (as speech or word), MBh. ; R. &c. *(H1 · 61345)*
- sharp-edged, L. *(H1 · 61346)*
- cruel, W. *(H1 · 61347)*
- **खर m. a donkey (so called from his cry), KātyŚr. ; Mn. ; MBh. &c.** *(H1 · 61348)*
- a mule, L. *(H1 · 61349)*
- an osprey, L. *(H1 · 61350)*
- a heron, L. *(H1 · 61351)*
- a crow, L. *(H1 · 61352)*
- a thorny plant (sort of prickly nightshade or perhaps Alhagi Maurorum ), L. *(H1 · 61353)*
- N. of a fragrant substance, Gal. *(H1 · 61354)*
- a quadrangular mound of earth for receiving the sacrificial vessels ( cf. ἐσχάρα ), ŚBr. v, 1, 2, 15 *(H1 · 61355)*
- xiv ; ĀśvŚr. ; KātyŚr. *(H1 · 61356)*
- a place arranged for building a house upon, N. of the 25th year of the sixty years' Bṛhaspati cycle, VarBṛS. *(H1 · 61357)*
- a Daitya or demon, L. *(H1 · 61358)*
- N. of the Asura Dhenuka , Hariv. 3114 ; BhP. ii, 7, 34 *(H1 · 61359)*
- N. of a Rakṣas slain by Rāma (younger brother of Rāvaṇa ), MBh. iii, 15896 ; R. ; BhP. ; Ragh. *(H1 · 61360)*
- N. of an attendant [of the Sun (= Dharma ), L. ; of Śiva , L. ] *(H1 · 61361)*
- of a Rudra (?), Hariv. ( v.l. ) *(H1 · 61362)*
- खरम् ind. in a sharp way, R. iii, 29, 9 *(H1C · 61363)*
- खरा f. Andropogon serratus , L. *(H1B · 61364)*
- खरी f. ( Pāṇ. iii, 2, 30 ; Siddh. ) a she-ass, Kathās. lxiii *(H1B · 61365)*
- ‘a she-mule’, see खरी-वात्सल्य *(H1B · 61366)*
- N. of one of the mothers in Skanda 's retinue, MBh. ix, 2624. *(H1B · 61367)*

### Sanskrit senses at position 26

नन्दन Nandana

Monier-Williams, printed page 526, queried as `नन्दन` (as printed). Also carried by Shabda-Sagara, Benfey, Yates, Edgerton.

- **नन्दन mf( आ )n. (the initial न् is not changeable to ण् , g. क्षुभ्ना दि ) rejoicing, gladdening ( cf. ॰दक ), MBh. ; Var. ; Pañc.** *(H2 · 103509)*
- नन्दन m. a son, Yājñ. ; MBh. ; Kāv. &c. ( ifc. also ॰नक , MBh. ) *(H2 · 103510)*
- a frog ( cf. ॰दक ), L. *(H2 · 103511)*
- नन्दन m. a kind of poisonous plant, Śuśr. (also f. Sch. ) *(H2 · 103512)*
- नन्दन m. a partic. form of temple, Var. *(H2 · 103513)*
- (in music) a kind of measure *(H2 · 103514)*
- N. of Viṣṇu or Śiva , MBh. *(H2 · 103515)*
- of an attendant of Skanda , ib. *(H2 · 103516)*
- of a Siddha , BhP. *(H2 · 103517)*
- of a Buddh. deity, Lalit. ( v.l. नन्द ) *(H2 · 103518)*
- (with Jaina s) of the 7th of the 9 white Bala s *(H2 · 103519)*
- of a mountain, Pur. *(H2 · 103520)*
- of sev. authors (also -भट्टा चार्य and -मिश्र ), Cat. *(H2 · 103521)*
- of the 26th year in a Jupiter cycle of 60 years, Var. *(H2 · 103522)*
- नन्दना f. daughter ( cf. कुल- ) *(H2B · 103523)*
- नन्दन n. gladdening or gladness, MBh. a divine garden, ( esp. ) Indra 's paradise, MBh. ; Kāv. &c. *(H2B · 103524)*
- N. of a sword, R. ( cf. ॰दक ) *(H2B · 103525)*
- N. of a metre, Col. *(H2B · 103526)*

### Sanskrit senses at position 27

विजय Vijaya

Monier-Williams, printed page 960, queried as `विजय` (as printed). Also carried by Shabda-Sagara, Benfey, Yates, Edgerton, Wilson.

- **वि-जय m. contest for victory, victory, conquest, triumph, superiority, RV. &c. &c. ( fig. applied to ‘the sword’ and to ‘punishment’, MBh. xii, 6204 ; 4428 )** *(H2 · 194989)*
- the prize of victory, booty, KātyŚr. *(H2 · 194990)*
- N. of a partic. hour of the day ( esp. the 17th, and the hour of Kṛṣṇa 's birth accord. to some the 11th Muhūrta ), MBh. ; Hariv. &c. *(H2 · 194991)*
- the third month, L. *(H2 · 194992)*
- the 27th (or first) year of Jupiter's cycle, VarBṛS. *(H2 · 194993)*
- a kind of military array, Kām. *(H2 · 194994)*
- a province, district, HPariś. *(H2 · 194995)*
- (in music) a kind of flute, Saṃgīt. *(H2 · 194996)*
- a kind of measure, ib. *(H2 · 194997)*
- a kind of composition, ib. *(H2 · 194998)*
- a divine car, chariot of the gods (?), L. *(H2 · 194999)*
- N. of Yama , L. *(H2 · 195000)*
- of a son of Jayanta (son of Indra ), Hariv. *(H2 · 195001)*
- of a son of Vasu-deva , ib. *(H2 · 195002)*
- of a son of Kṛṣṇa , BhP. *(H2 · 195003)*
- of an attendant of Viṣṇu , ib. *(H2 · 195004)*
- of an attendant of Padmapāṇi , W. *(H2 · 195005)*
- of a son of Sva-rocis , MārkP. *(H2 · 195006)*
- of a Muni , Hariv. *(H2 · 195007)*
- of a prince, MBh. *(H2 · 195008)*
- of a son of Dhṛtarāṣṭra (?), ib. *(H2 · 195009)*
- of a warrior on the side of the Pāṇḍava s, ib. *(H2 · 195010)*
- of one of the eight councillors of Daśaratha , R. *(H2 · 195011)*
- of Arjuna , MBh. ; BhP. *(H2 · 195012)*
- of a son of Jaya , Hariv. ; Pur. *(H2 · 195013)*
- of a son of Cañcu or Cuñcu , ib. *(H2 · 195014)*
- of a son of Saṃjaya , VP. *(H2 · 195015)*
- of a son of Su-deva , BhP. *(H2 · 195016)*
- of a son of Purūravas , ib. *(H2 · 195017)*
- of a son (or grandson) of Bṛhan-manas , Hariv. ; Pur. *(H2 · 195018)*
- of a son of Yajña-śrī , Pur. *(H2 · 195019)*
- of the founder of Buddhist civilisation in Ceylon, MW. *(H2 · 195020)*
- (with Jaina s) N. of one of the 9 white Bala s and of one of the 5 Anuttara s *(H2 · 195021)*
- of the 20th Arhat of the future and of the father of the 21st Arhat of the present Avasarpiṇī *(H2 · 195022)*
- of the attendant of the 8th Arhat of the same *(H2 · 195023)*
- of a son of Kalki , KalkiP. *(H2 · 195024)*
- of a son of Kalpa , KālP. *(H2 · 195025)*
- of a hare, Kathās. *(H2 · 195026)*
- of the lance of Rudra (personified), MBh. *(H2 · 195027)*
- ( pl. ) of a people, MBh. *(H2 · 195028)*
- वि-जया ( आ ), f. N. of various plants (accord to, L. Terminalia Chebula ; Sesbania Aegyptiaca ; Vitex Negundo ; Rubia Munjista ; Premna Spinosa ; a kind of hemp; a kind of शमी ; = वचा ), VarBṛS. ; Suśr. &c. *(H2B · 195029)*
- of a partic. Tithi or lunar day (the 12th day in the light half of Śrāvaṇa i.e. Kṛṣṇa 's birthday, the 10th in that of Āśvina , being a festival in honour of Durgā , and the 7th in that of Bhādrapada , if it falls on a Sunday; also the 7th night in the Karma-māsa ), VarBṛS. ; BhP. &c. *(H2B · 195030)*
- of a partic. magical formula, Bhaṭṭ. *(H2B · 195031)*
- N. of Durgā , MBh. ; Hariv. *(H2B · 195032)*
- of a female friend of Durgā , Mudr. *(H2B · 195033)*
- of the wife of Yama , L. *(H2B · 195034)*
- of another goddess, Cat. *(H2B · 195035)*
- of a Yoginī , Hcat. *(H2B · 195036)*
- of a Surāṅganā , Siṃhās. *(H2B · 195037)*
- of the mother of the 2nd Arhat of the present Avasarpiṇī , L. *(H2B · 195038)*
- of a daughter of Dakṣa , R. *(H2B · 195039)*
- of the mother of various Su -hotra s, MBh. *(H2B · 195040)*
- of Kṛṣṇa 's garland, MBh. *(H2B · 195041)*
- of a Kumārī ( i.e. small flag-staff) on Indra 's banner, VarBṛS. *(H2B · 195042)*
- of a partic. spear, R. *(H2B · 195043)*
- वि-जय n. the poisonous root of the plant Vijayā , Suśr. *(H2B · 195044)*
- a royal tent, Vāstuv. *(H2B · 195045)*
- a kind of pavilion, ib. *(H2B · 195046)*
- N. of a sacred district in Kaśmīra , Kathās. ( cf. -क्षेत्र ) *(H2B · 195047)*
- वि-जय mfn. leading to victory, proclaiming victory, MBh. *(H2B · 195048)*
- victorious, triumphant, L. *(H2B · 195049)*

### Sanskrit senses at position 28

जय Jaya

Monier-Williams, printed page 412, queried as `जय` (as printed). Also carried by Shabda-Sagara, Benfey, Yates, Edgerton, Wilson.

- जय mfn. (√ जि ) ifc. conquering, winning See ऋतं- , कृतं- , धनं-जय , पुरं- , शत्रुं- *(H1 · 77322)*
- **जय m. ( Pāṇ. iii, 3, 56 , Kāś. ) conquest, victory, triumph, winning, being victorious (in battle or in playing with dice or in a lawsuit), AV. vii, 50, 8 ; ŚBr. vi ; Mn. vii ( इन्द्रियाणांज् ॰ victory over or restraint of the senses) & x ; MBh. &c.** *(H1 · 77323)*
- cf. आत्म- , प्रा ण- , रुग्- *(H1 · 77324)*
- जय m. pl. ( parox. ) N. of particular verses causing victory (personified as deities, VāyuP. ii, 6, 4 ff. ), MaitrS. i, 4, 14 ; TS. iii ; PārGṛ. i, 5 ; Nyāyam. iii, 4, 24 *(H1 · 77325)*
- जय m. sg. Premna spinosa or longifolia , L. *(H1 · 77326)*
- a yellow variety of Phaseolus Mungo , L. *(H1 · 77327)*
- N. of the 3rd year of the 6th lustrum of the Bṛhaspati cycle, VarBṛS. viii, 38 *(H1 · 77328)*
- a kind of flute *(H1 · 77329)*
- (in music) a kind of measure *(H1 · 77330)*
- the sun, MBh. iii, 154 *(H1 · 77331)*
- Arjuna (son of Pāṇḍu ), 266, 7 and iv, 5, 35 *(H1 · 77332)*
- Indra , L. *(H1 · 77333)*
- N. of a Ṛṣi (author of RV. x, 180 ; son of Aṅgiras [ RAnukr. ] or of Indra ; living under the 10th Manu , BhP. viii, 13, 22 ) *(H1 · 77334)*
- of a spirit, VarBṛS. liii, 48 ; Hcat. i, 9, 149 and 172 *(H1 · 77335)*
- of an attendant of Viṣṇu , BhP. iii, 16, 2 *(H1 · 77336)*
- of a Nāga , MBh. v, 3632 ; ix, 2554 *(H1 · 77337)*
- of a Dānava , Hariv. 13093 *(H1 · 77338)*
- of a son (of Dhṛtarāṣṭra , MBh. i , vii ; of Sṛñjaya , Hariv. 1514 ; of Suśruta , VP. iv, 5, 12 ; of Sruta , BhP. ix, 13, 25 ; of Saṃjaya , 17, 16 ; of Saṃkṛti , 18 ; of Mañju , 21, 1 ; of Yuyudhāna , 24, 13 ; of Kaṅka , 43 ; of Kṛṣṇa , x, 61, 17 ; of Vatsara by Svar-vīthi , iv, 13, 12 ; of Viśvāmitra , Hariv. 1462 ; BhP. ix, 16, 36 ; of Purūravas by Urvaśī , 15, 1 f. ) *(H1 · 77339)*
- of an ancient king (11th Cakravartin in Bhārata , L. ), MBh. ii, 326 *(H1 · 77340)*
- of a Pāṇḍava hero, vii, 6911 *(H1 · 77341)*
- of Yudhiṣṭhira at Virāṭa 's court, iv, 176 *(H1 · 77342)*
- of Aśoka in a former birth, Divyāv. xxvi, 336 f. *(H1 · 77343)*
- of a carpenter, Rājat. iii, 351 *(H1 · 77344)*
- जया ( आ ), f. Sesbania aegyptiaca , L. *(H1B · 77345)*
- Premna spinosa or longifolia , L. *(H1B · 77346)*
- Terminalia Chebula , L. *(H1B · 77347)*
- नील-दूर्वा , L. *(H1B · 77348)*
- for जपा , Kathās. lxvii, 32 *(H1B · 77349)*
- N. of a narcotic substance, W. *(H1B · 77350)*
- the 3rd or 8th or 13th day of either half-month, Sūryapr. ; cf. Hcat. i, 3, 360 and Nirṇayas. i, 391/392 *(H1B · 77351)*
- one of the 7 flag-sticks of Indra 's banner, VarBṛS. xliii, 40 *(H1B · 77352)*
- N. of the सौरा धर्माः , BhavP. i *(H1B · 77353)*
- of Durgā , MBh. iv , vi ; Hariv. ; Kathās. liii, 170 *(H1B · 77354)*
- of a daughter of Dakṣa (wife of Śiva , MatsyaP. xiii, 32 ; tutelary deity of the Ārtabhāga s, BrahmaP. ii, 18, 19 ), R. i, 23, 14 *(H1B · 77355)*
- of a Yoginī , Hcat. ii, 1, 694 ( v.l. लया ) *(H1B · 77356)*
- of a Śakti , i, 5, 200 *(H1B · 77357)*
- of a handmaid of Durgā (wife of Puṣpa-danta , Kathās. i, 52 ; vii, 107 ; of Hariś-candra , ŚivaP. ) *(H1B · 77358)*
- (= तारा ) N. of a Buddh. deity, L. *(H1B · 77359)*
- of the mother of the 12th Arhat of the present Avasarpiṇī , L. *(H1B · 77360)*

### Sanskrit senses at position 29

मन्मथ Manmatha

Monier-Williams, printed page 788, queried as `मन्मथ` (as printed). Also carried by Shabda-Sagara, Benfey, Yates.

- **मन्मथ m. (either an Intens. form fr. √ मथ् , or fr. मन् = मनस् + मथ , ‘agitating’; cf. मन्देह and मन्धातृ ) love or the god of love, amorous passion or desire ( ifc. f( आ ). ), MBh. ; Kāv. &c.** *(H1 · 157922)*
- Feronia Elephantum , L. *(H1 · 157923)*
- the 29th (3rd) year in a 60 years' cycle of Jupiter, VarBṛS. *(H1 · 157924)*
- N. of a physician and various other men, Cat. *(H1 · 157925)*
- मन्मथा f. N. of Dākṣāyaṇī , ib. *(H1B · 157926)*

### Sanskrit senses at position 30

दुर्मुख Durmukha

Monier-Williams, printed page 486, queried as `दुर्मुख` (as printed). Also carried by Shabda-Sagara, Benfey, Yates, Edgerton.

- **दुर् —मुख mf( ई )n. ugly-faced, MBh. ; R. &c.** *(H3 · 94214)*
- foul-mouthed, abusive, scurrilous, Bhartṛ. ii, 59 *(H3 · 94215)*
- दुर् —मुख m. a horse, L. *(H3 · 94216)*
- a serpent, L. *(H3 · 94217)*
- N. of the 29th year of the cycle of Jupiter (lasting 60 years), Var. ; Sūryas. *(H3 · 94218)*
- of a prince of the Pañcāla s, AitBr. viii, 23 *(H3 · 94219)*
- of a son of Dhṛtarāṣṭra , MBh. i &c. *(H3 · 94220)*
- of an astronomer, L. *(H3 · 94221)*
- of a serpent-demon, MBh. ; Hariv. *(H3 · 94222)*
- of a Rakṣas , R. ; BhP. *(H3 · 94223)*
- of a Yakṣa , BrahmaP. *(H3 · 94224)*
- of a monkey, R. *(H3 · 94225)*
- of a general of the Asura Mahiṣa , L. *(H3 · 94226)*

### Sanskrit senses at position 31

हेमलम्ब Hemalamba

Monier-Williams, printed page 1304, queried as `हेमलम्ब` (as printed).

**Composed meaning ‡** — "hanging gold", from हेमन् "gold" (page 1299, 264121) + लम्ब "hanging down" (page 897, 181489). Monier-Williams has no entry for the whole word.

- हेम —लम्ब or हेम —लम्॰बक , m. N. of the 31st (or 5th) year of Jupiter's cycle of 60 years, VarBṛS. *(H3 · 264236)*

### Sanskrit senses at position 32

विळम्बि Viḷambi

Monier-Williams, printed page 985, queried as `विलम्बिन्` (ḷ → l + -in stem).

- **वि- ॰लम्बिन् mfn. hanging down, pendulous, hanging to or from, leaning against ( loc. or comp. ), Kāv. ; VarBṛS. ; Suśr. &c.** *(H3 · 199632)*
- ( ifc. ) hung with, that from which anything hangs or falls down, MBh. ; Pur. *(H3 · 199633)*
- tarrying, delaying, slow, reluctant, Śak. ( v.l. ), Gīt. *(H3 · 199634)*
- वि- ॰लम्बिन् m. n. the 32nd year in the 60 years' cycle of Jupiter, VarBṛS. *(H3 · 199635)*

### Sanskrit senses at position 33

विकारि Vikāri

Monier-Williams, printed page 954, queried as `विकारिन्` (-in stem). Also carried by Shabda-Sagara, Benfey, Yates, Edgerton.

- **वि- ॰कारिन् mfn. liable to change, changeable, variable, VPrāt. ; MBh. ; Suśr.** *(H3 · 193975)*
- undergoing a change, changed into ( comp. ), Bhag. *(H3 · 193976)*
- feeling emotion, falling in love, Mālatīm. *(H3 · 193977)*
- inconstant, disloyal, rebellious (see अ-व् ॰ ) *(H3 · 193978)*
- altered or changed for the worse, spoiled, corrupted, Suśr. *(H3 · 193979)*
- producing a change for the worse, corrupting (the mind), Hit. *(H3 · 193980)*
- वि- ॰कारिन् m. n. the 33rd year in Jupiter's cycle of 60 years, VarBṛS. *(H3 · 193981)*

### Sanskrit senses at position 34

शार्वरी Śārvarī

Monier-Williams, printed page 1067, queried as `शार्वरी` (as printed). Also carried by Shabda-Sagara, Benfey, Yates, Wilson.

- **शार्वरी mf( ई )n. ( fr. शर्वरी ) belonging to night, nocturnal, Kād. ; Hcar. ; Vās.** *(H1 · 215920)*
- pernicious, murderous, L. *(H1 · 215921)*
- शार्वरी f. night, Vcar. ; ŚārṅgP. *(H1 · 215922)*
- शार्वरी n. ( L. also m. ) darkness, gloom, BhP. *(H1 · 215923)*

### Sanskrit senses at position 35

प्लव Plava

Monier-Williams, printed page 715, queried as `प्लव` (as printed). Also carried by Shabda-Sagara, Benfey, Yates, Wilson.

- प्लव प्लवक &c. See col. 2 . *(H1 · 141442)*
- प्लव mf( आ )n. swimming, floating, ŚāṅkhGṛ. ; Suśr. *(H2 · 141469)*
- sloping towards, inclined, Hariv. ; Var. ; Hcat. (in astrol. applied to a constellation situated in the quarter ruled by its planetary regent, Var. , Sch. ) *(H2 · 141470)*
- transient, MuṇḍUp. *(H2 · 141471)*
- प्लव m. n. ( ifc. f( आ ). ) a float, raft, boat, small ship, RV. &c. &c. *(H2 · 141472)*
- प्लव m. a kind of aquatic bird (= गात्र-सम्प्लव , कारण्डव , जल-वायस , जल-काक or जल-कुक्कुट , L. ), VS. &c. &c. *(H2 · 141473)*
- a frog, L. *(H2 · 141474)*
- a monkey, L. *(H2 · 141475)*
- & sheep, L. an arm, L. *(H2 · 141476)*
- a Caṇḍāla , L. *(H2 · 141477)*
- an enemy, L. *(H2 · 141478)*
- Ficus Infectoria , L. *(H2 · 141479)*
- a snare or basket of wicker-work for catching fish, L. *(H2 · 141480)*
- the 35th (or 9th) year in a cycle of Jupiter, VarBṛS. *(H2 · 141481)*
- प्लव m. swimming, bathing ( ifc. f( आ ). ), MBh. ; R. ; Kathās. *(H2 · 141482)*
- प्लव m. flooding, a flood, the swelling of a river, MBh. ; MārkP. *(H2 · 141483)*
- the prolated utterance of a vowel (= प्लुति ), L. *(H2 · 141484)*
- protraction of a sentence through 3 or more Śloka s (= कुलक ), L. *(H2 · 141485)*
- sloping down or towards, proclivity, inclination, L. *(H2 · 141486)*
- (in astrol. ) = प्लव-त्व , VarBṛS. , Sch. *(H2 · 141487)*
- a kind of metre, Col. *(H2 · 141488)*
- N. of a Sāman (also with वसिष्ठस्य ), ĀrṣBr. *(H2 · 141489)*
- **jumping, leaping, plunging, going by leaps or plunges, R. ( cf. comp. below)** *(H2 · 141490)*
- returning, L. *(H2 · 141491)*
- urging on L. *(H2 · 141492)*
- प्लव n. Cyperus Rotundus or a species of fragrant grass, Suśr. [ cf. Gk. πλόος for πλοϝος , πλοῖον ] *(H2 · 141493)*

### Sanskrit senses at position 36

शुभकृत् Śubhakṛt

Monier-Williams, printed page 1083, queried as `शुभकर` (cross-reference from शुभकृत्). Also carried by Yates.

- **शुभ —कर mfn. causing welfare, auspicious, fortunate, VarBṛS.** *(H3 · 219651)*
- शुभ —करी ( ई ), f. Prosopis Spicigera , L. *(H3B · 219652)*

### Sanskrit senses at position 37

शोभन Śobhana

Monier-Williams, printed page 1092, queried as `शोभन` (as printed). Also carried by Shabda-Sagara, Benfey, Yates, Edgerton, Wilson.

- **शोभन mf( आ or ई )n. brilliant, splendid, beautiful (at end of comp. = ‘beautiful by reason of’), ŚBr. ; Kauś. ; MBh. &c.** *(H2 · 221607)*
- excellent, glorious, magnificent, distinguished in or by ( instr. or comp. ), MBh. ; Kāv. &c. *(H2 · 221608)*
- ( ifc. ) superior to, better than, BhP. propitious, auspicious, VarBṛS. ; Rājat. *(H2 · 221609)*
- virtuous, moral (see comp. ) *(H2 · 221610)*
- correct, right, Sarvad. *(H2 · 221611)*
- शोभन m. N. of Agni at the Śuṅgā-karman , Gṛhyās. *(H2 · 221612)*
- of Śiva , MBh. *(H2 · 221613)*
- a burnt offering for auspicious results, W. *(H2 · 221614)*
- the fifth of the astron. Yoga s, L. *(H2 · 221615)*
- a planet, L. *(H2 · 221616)*
- the eleventh year of Jupiter's cycle, MW. *(H2 · 221617)*
- शोभना ( आ ), f. a beautiful woman (often in voc. ), MBh. ; Kāv. &c. *(H2B · 221618)*
- turmeric, L. *(H2B · 221619)*
- the yellow pigment Go-rocanā , L. *(H2B · 221620)*
- N. of one of the Mātṛ s attending on Skanda , MBh. *(H2B · 221621)*
- शोभन ( अम् ), n. the act of adorning, causing to look beautiful, MW. *(H2B · 221622)*
- an ornament (see कर्ण-श् ॰ ) *(H2B · 221623)*
- anything propitious or auspicious, welfare, prosperity, R. ; Pur. *(H2B · 221624)*
- moral good, virtue, ib. brilliance, MW. *(H2B · 221625)*
- a lotus, L. *(H2B · 221626)*
- tin, L. *(H2B · 221627)*
- (with कश्यपस्य ) N. of a Sāman , ĀrṣBr. *(H2B · 221628)*

### Sanskrit senses at position 38

क्रोधी Krodhī

Monier-Williams, printed page 322, queried as `क्रोधालु` (cross-reference from क्रोधिन्). Also carried by Shabda-Sagara, Yates.

- **क्रोधालु mfn. passionate, violent, Suśr. vi.** *(H2 · 58286)*

### Sanskrit senses at position 39

विश्वावसु Viśvāvasu

Monier-Williams, printed page 994, queried as `विश्वावसु` (as printed). Also carried by Shabda-Sagara, Benfey, Yates, Wilson.

- **विश्वा —वसु ( विश्वा- ), mfn. beneficent to all (said of Viṣṇu ), MBh.** *(H3 · 201536)*
- **विश्वा —वसु m. N. of a Gandharva (regarded as the author of the hymn, RV. x, 139 ), RV. ; AV. ; VS. &c.** *(H3 · 201536)*
- **of a Sādhya , Hariv.** *(H3 · 201536)*
- **of a Marut-vat , ib.** *(H3 · 201536)*
- **of a son of Purū-ravas (said to be one of the Viśve Devāḥ ), ib. ; VP.** *(H3 · 201536)*
- **of a prince of the Siddha s, Kathās. ; Nāg.** *(H3 · 201536)*
- **of a son of Jamad-agni , MBh.** *(H3 · 201536)*
- **of one of the Manu s, Uṇ., Sch.** *(H3 · 201536)*
- **of a poet, Cat.** *(H3 · 201536)*
- **of the 39th year in Jupiter's cycle of 60 years, VarBṛS.** *(H3 · 201536)*
- **of the 7th Muhūrta , AV. ; Jyot.** *(H3 · 201536)*
- **विश्वा —वसु f. night, L.** *(H3 · 201536)*
- **N. of a partic. night, W.** *(H3 · 201536)*

### Sanskrit senses at position 40

पराभव Parābhava

Monier-Williams, printed page 590, queried as `पराभव` (as printed). Also carried by Shabda-Sagara, Benfey, Yates.

- परा-भव m. vanishing, disappearance, dissolution, separation, R. *(H3 · 116877)*
- **overthrow, defeat, humiliation, mortification, contempt, injury, destruction, ruin, ŚBr. ; MBh. ; Kāv. &c.** *(H3 · 116878)*
- N. of the 40th (or 14th) year in Jupiter's cycle of 60 years, Var. ( cf. परावसु ) *(H3 · 116879)*

### Sanskrit senses at position 41

प्लवङ्ग Plavaṅga

Monier-Williams, printed page 715, queried as `प्लवंग` (cluster → anusvāra). Also carried by Shabda-Sagara, Benfey, Yates.

- प्लव —ं-ग mfn. ‘moving by jumps’, flickering (said of fire), MBh. *(H3 · 141504)*
- **प्लव —ं-ग m. a monkey, ib. ; Ṛtus.** *(H3 · 141505)*
- a deer, L. *(H3 · 141506)*
- Ficus Infectoria , L. *(H3 · 141507)*
- N. of the 41st (15th) year in a sixty years' cycle of Jupiter, Var. *(H3 · 141508)*

### Sanskrit senses at position 42

कीलक Kīlaka

Monier-Williams, printed page 285, queried as `कीलक` (as printed). Also carried by Shabda-Sagara, Benfey, Yates.

- **कीलक m. a pin, bolt, wedge, Pañcat. ; Hit.** *(H2 · 50866)*
- a splint (for confining a broken bone), Suśr. *(H2 · 50867)*
- a kind of tumour (having the form of a pin), L. *(H2 · 50868)*
- (= शिवक ) a kind of pillar for cows &c. to rub themselves against, or one to which they are tied, L. *(H2 · 50869)*
- N. of the forty-second year of the sixty years' cycle of Jupiter, VarBṛS. *(H2 · 50870)*
- कीलक m. pl. N. of certain Ketu s, ib. *(H2 · 50871)*
- कीलिका f. a pin, bolt, Pañcat. ; Hcat. *(H2B · 50872)*
- कीलक n. N. of the inner syllables of a Mantra . *(H2B · 50873)*

### Sanskrit senses at position 43

सौम्य Saumya

Monier-Williams, printed page 1254, queried as `सौम्य` (as printed). Also carried by Shabda-Sagara, Benfey, Yates, Wilson.

- **सौम्य mf( ई or आ )n. mf( ई later आ ; once in RV. सौम्या )n. (once in AV. सौम्य ) relating or belonging to Soma (the juice or the sacrifice or the moon-god), connected or dealing with Soma , having his nature or qualities &c., RV. &c. &c.** *(H2 · 253659)*
- **cool and moist ( opp. to आग्नेय , ‘hot and dry’), Br. ; Hariv. ; Suśr.** *(H2 · 253659)*
- **northern ( एन , ‘to the north’), Hariv. ; VarBṛS.** *(H2 · 253659)*
- **‘resembling the moon’, placid, gentle, mild ( सौम्य voc. = ‘O gentle Sir!’ ‘O good Sir!’ ‘O excellent man!’ as the proper mode of addressing a Brāhman , Mn. ii, 125 ), ŚBr. &c. &c.** *(H2 · 253659)*
- **auspicious (said of birds, planets &c.; esp. of the Nakṣatra s Mṛga-śiras , Citrā , Anurādhā , and Revatī ), R. ; VarBṛS. ; Hariv. ; ŚārṅgS.** *(H2 · 253659)*
- **happy, pleasant, cheerful, MW.** *(H2 · 253659)*
- **सौम्य m. a Soma sacrifice, L.** *(H2 · 253659)*
- **an adherent, worshipper, BhP.** *(H2 · 253659)*
- **a Brāhman , L.** *(H2 · 253659)*
- **patr. of Budha or the planet Mercury, VarBṛS.** *(H2 · 253659)*
- **of the Vedic Ṛṣi Budha (author of RV. x, 1 ), RAnukr.** *(H2 · 253659)*
- **the left hand, Hcat.** *(H2 · 253659)*
- **Ficus Glomerata , L.** *(H2 · 253659)*
- **the fifteenth cubit ( अरत्नि ) from the bottom or the third from the top of the sacrificial post, L.** *(H2 · 253659)*
- **(in anat. ) the blood before it becomes red, serum, W.** *(H2 · 253659)*
- **the gastric juice, MW.** *(H2 · 253659)*
- **the month Mārgaśīrṣa , Hcat.** *(H2 · 253659)*
- **N. of the 43rd (or 17th) year in the 60 years' cycle of Jupiter, VarBṛS.** *(H2 · 253659)*
- **( pl. ) the people of Soma , ŚāṅkhGṛ.** *(H2 · 253659)*
- **a partic. class of deceased ancestors, Mn. iii, 199** *(H2 · 253659)*
- **सौम्य m. n. a partic. penance (see -कृच्छ्र ), Yājñ. ; GāruḍaP.** *(H2 · 253659)*
- **सौम्य m. N. of a Dvīpa of the earth or of Bharatavarṣa , Pur.** *(H2 · 253659)*
- **of the 7th astrol. Yuga , Jyot.** *(H2 · 253659)*
- **सौम्या ( या ), f. N. of various plants ( Abrus Precatorius ; Glycine Debilis ; Ruta Graveolens &c.), L.** *(H2B · 253659)*
- **a pearl, L.** *(H2B · 253659)*
- **the Nakṣatra Mṛga-śiras , Hariv.** *(H2B · 253659)*
- **N. of the five stars in Orion's head (also called इल्वल , q.v. ), W.** *(H2B · 253659)*
- **a species of the Āryā metre, Col.** *(H2B · 253659)*
- **N. of Durgā , Cat.** *(H2B · 253659)*
- **सौम्यी ( ई ), f. moonshine, MBh.** *(H2B · 253659)*
- **सौम्य ( अम् ), n. the nature or condition of Soma , AV.** *(H2B · 253659)*
- **gentleness, MBh. ; Pañcat. the Nakṣatra Mṛga-śiras (presided over by the Moon), MaitrUp. ; Hariv. ( accord. to Nīlak. ‘Wednesday’)** *(H2B · 253659)*
- **the left eye, L.** *(H2B · 253659)*
- **the middle of the hand, L.** *(H2B · 253659)*
- **N. of the fifth Muhūrta , Cat.** *(H2B · 253659)*
- **( scil. अद्भुत ) a partic. kind of omen or prodigy (occurring in the Diva or sky), MW.** *(H2B · 253659)*
- सौम्य &c. See col. 1 . *(H1 · 253751)*

### Sanskrit senses at position 44

साधारण Sādhāraṇa

Monier-Williams, printed page 1202, queried as `साधारण` (as printed). Also carried by Shabda-Sagara, Benfey, Yates, Wilson.

- **सा धारण mf( ई or आ )n. ‘having or resting on the same support or basis’, belonging or applicable to many or all, general, common to all, universal, common to ( gen. dat. instr. with and without सह , or comp. ), RV. &c. &c.** *(H2 · 241813)*
- like, equal or similar to ( instr. or comp. ), Hariv. ; Kālid. *(H2 · 241814)*
- behaving alike, Dhūrtas. *(H2 · 241815)*
- having something of two opposite properties, occupying a middle position, mean (between two extremes, e.g. ‘neither too dry nor too wet’, ‘neither too cool nor too hot’), Suśr. ; Kām. ; VarBṛS. *(H2 · 241816)*
- (in logic) belonging to more than the one instance alleged (one of the three divisions of the fallacy called अनैकान्तिक , q.v. ) *(H2 · 241817)*
- generic, W. *(H2 · 241818)*
- सा धारण m. N. of the 44th (or 18th) year of Jupiter's cycle of 60 years, VarBṛS. *(H2 · 241819)*
- सा धारणी ( ई ), f. a key, L. *(H2B · 241820)*
- a twig of bamboo (perhaps used as a bolt), MW. *(H2B · 241821)*
- सा धारण m. or n. (?) N. of a Nyāya wk. by Gāda-dhara *(H2B · 241822)*
- सा धारण ( अम् ), n. something in common, a league or alliance with ( comp. ), Subh. *(H2B · 241823)*
- a common rule or one generally applicable, W. *(H2B · 241824)*
- a generic property, a character common to all the individuals of a species or to all the species of a genus &c., ib. *(H2B · 241825)*
- सा धारणम् ( अम् ), ind. commonly, generally, L. *(H2C · 241826)*

### Sanskrit senses at position 45

विरोधकृत Virodhakṛta

Monier-Williams, printed page 984, queried as `विरोधकृत्` (final virāma).

- **वि-रोध —कृत् mfn. causing dissension or revolt, Yājñ., Sch.** *(H3 · 199414)*
- वि-रोध —कृत् m. an enemy, MW. *(H3 · 199415)*
- the 45th year in Jupiter's cycle of 60 years, Cat. *(H3 · 199416)*

### Sanskrit senses at position 46

परिधावी Paridhāvī

Monier-Williams, printed page 596, queried as `परिधाविन्` (-in stem).

- **परि-धाविन् m. ‘running round’, N. of the 46th (or 20th) of the 60 years' cycle of Jupiter, Var.** *(H3 · 117789)*

### Sanskrit senses at position 47

प्रमादी Pramādī

Monier-Williams, printed page 685, queried as `प्रमादिन्` (-in stem). Also carried by Shabda-Sagara, Benfey, Yates, Wilson.

- **प्र- ॰मादिन् mfn. negligent, careless, incautious, indifferent, MBh. ; Kāv. &c.** *(H3 · 135768)*
- drunken, intoxicated, W. *(H3 · 135769)*
- insane, ib. *(H3 · 135770)*
- ( -ता f. , Jātakam. ) *(H3 · 135771)*
- प्र- ॰मादिन् n. N. of the 47th (21st) year of a 60 years' cycle of Jupiter, L. ( cf. प्र-नाथिन् ). *(H3 · 135772)*

### Sanskrit senses at position 48

आनंद Ānaṃda

Monier-Williams, printed page 139, queried as `आनन्द` (anusvāra → cluster). Also carried by Shabda-Sagara, Benfey, Yates, Edgerton, Wilson.

- **आ-नन्द अस् , m. happiness, joy, enjoyment, sensual pleasure, RV. ; AV. ; VS. ; R. ; Ragh. &c.** *(H2 · 24352)*
- आ-नन्द ( अस् ), m. and ( अम् ), n. ‘pure happiness’, one of the three attributes of Ātman or Brahman in the Vedānta philosophy, Vedāntas. &c. *(H2 · 24353)*
- आ-नन्द ( अस् ), m. (in dram. ) the thing wished for, the end of the drama [ e.g. the VIth Act in the Veṇīs. ], Sāh. 399 *(H2 · 24354)*
- a kind of flute *(H2 · 24355)*
- the sixteenth Muhūrta *(H2 · 24356)*
- N. of Śiva *(H2 · 24357)*
- of a Lokeśvara ( Buddh. ) *(H2 · 24358)*
- of a Bala ( Jain. ), L. *(H2 · 24359)*
- of several men *(H2 · 24360)*
- आनन्द (also) N. of one of the chief disciples of Gautama Buddha , MWB. 47 &c. *(H2 · 24360)*
- आनन्द N. of various authors &c., Cat. *(H2 · 24360)*
- of a country *(H2 · 24361)*
- आ-नन्द m. and ( अम् ), n. N. of the forty-eighth year of the cycle of Jupiter *(H2 · 24362)*
- आ-नन्दा ( आ and ई ) f. N. of two plants, L. *(H2B · 24363)*
- आ-नन्दी ( आ and ई ), f. N. of two plants, L. *(H2B · 24363)*
- आ-नन्दा ( आ ), f. N. of Gaurī , L. *(H2B · 24364)*
- आ-नन्द ( अम् ), n. a kind of house *(H2B · 24365)*
- आनन्द (often at the beginning and end of proper names.) *(H2B · 24366)*

### Sanskrit senses at position 49

राक्षस Rākṣasa

Monier-Williams, printed page 871, queried as `राक्षस` (as printed). Also carried by Shabda-Sagara, Benfey, Yates, Edgerton, Wilson.

- राक्षस mf( ई )n. ( fr. रक्षस् ) belonging to or like a Rakṣas , demoniacal, infested by demons, AitBr. &c. &c. (with विवाह , or धर्म or विधि m. ‘one of the 8 forms of marriage’, the violent seizure or rape of a girl after the defeat or destruction of her relatives, see Mn. iii, 33 ) *(H1 · 176053)*
- **राक्षस m. a Rakṣas or demon in general, an evil or malignant demon (the Rākṣasa s are sometimes regarded as produced from Brahmā 's foot, sometimes with Rāvaṇa as descendants of Pulastya , elsewhere they are styled children of Khasā or Su-rasa ; according to some they are distinguishable into 3 classes, one being of a semi-divine benevolent nature and ranking with Yakṣa s &c.; another corresponding to Titans or relentless enemies of the gods; and a third answering more to nocturnal demons, imps, fiends, goblins, going about at night, haunting cemeteries, disturbing sacrifices and even devouring human beings; this last class is the one most commonly mentioned; their chief place of abode was Laṅkā in Ceylon; in R. v, 10, 17 &c. they are fully described; cf. also, IW. 310 ; RTL. 237 ), Kauś. ; Up. &c.** *(H1 · 176054)*
- a king of the Rakṣas g. पर्श्व्-आदि *(H1 · 176055)*
- (with Jaina s) one of the 8 classes of Vyantara s, L. *(H1 · 176056)*
- N. of the 30th Muhūrta , L. *(H1 · 176057)*
- of one of the astronomical, Yogas. ; Col. *(H1 · 176058)*
- of a minister of Nanda , Mudr. *(H1 · 176059)*
- of a poet, Cat. ( cf. below) *(H1 · 176060)*
- राक्षस m. n. the 49th year in the Jupiter cycle of 60 years, VarBṛS. *(H1 · 176061)*
- राक्षसी ( ई ), f. a Rākṣasī or female demon, MBh. ; Kāv. ; Kathās. *(H1B · 176062)*
- the island of the Rākṣasa s, i.e. Laṅkā or Ceylon, Buddh. *(H1B · 176063)*
- N. of a malignant spirit supposed to haunt the four corners of a house, VarBṛS. *(H1B · 176064)*
- of a Yoginī , Hcat. *(H1B · 176065)*
- night, L. *(H1B · 176066)*
- a kind of plant (= चण्डा ), L. *(H1B · 176067)*
- a large tooth, tusk, L. *(H1B · 176068)*

### Sanskrit senses at position 50

नल/अनल Nala/Anala

Monier-Williams, printed page 26, queried as `अनल` (as printed). Also carried by Shabda-Sagara, Benfey, Yates, Edgerton, Wilson.

- **1\. अनल m. (√ अन् ), fire** *(H1 · 5252)*
- the god of fire, digestive power, gastric juice *(H1 · 5253)*
- bile, L. *(H1 · 5254)*
- wind, L. *(H1 · 5255)*
- N. of Vasudeva *(H1 · 5256)*
- of a Muni *(H1 · 5257)*
- of one of the eight Vasu s *(H1 · 5258)*
- of a monkey *(H1 · 5259)*
- of various plants ( Plumbago Zeylanica and Rosea ; Semecarpus Anacardium ) *(H1 · 5260)*
- the letter र् *(H1 · 5261)*
- the number three *(H1 · 5262)*
- (in astron. ) the fiftieth year of Bṛhaspati 's cycle *(H1 · 5263)*
- the third lunar mansion or Kṛttikā (?). *(H1 · 5264)*
- 2\. अनल Nom. P. ॰लति , to become fire, Subh. *(H1 · 5271)*

### Sanskrit senses at position 51

पिंगल Piṃgala

Monier-Williams, printed page 624, queried as `पिङ्गल` (anusvāra → cluster). Also carried by Shabda-Sagara, Benfey, Yates, Edgerton, Wilson.

- **पिङ्गल mf( आ and ई )n. ( cf. g. गौरा दि and कडारा दि ), reddish-brown, tawny, yellow, gold-coloured, AV. &c. &c.,** *(H2 · 123605)*
- (in alg. also as N. of the 10th unknown quantity) *(H2 · 123606)*
- having r˚ - b˚ eyes, KātyŚr. , Sch. *(H2 · 123607)*
- पिङ्गल m. yellow colour, W. *(H2 · 123608)*
- fire, L. *(H2 · 123609)*
- an ape, L. *(H2 · 123610)*
- an ichneumon, L. *(H2 · 123611)*
- a small kind of owl, L. *(H2 · 123612)*
- a small kind of lizard, L. *(H2 · 123613)*
- a species of snake, Suśr. *(H2 · 123614)*
- a partic. vegetable poison, L. *(H2 · 123615)*
- (with Jaina s) N. of a treasure *(H2 · 123616)*
- the 51st (or 25th) year in a 60 years' cycle of Jupiter, Var. *(H2 · 123617)*
- N. of Śiva or a kindred being, GṛS. ; Gaut. &c. *(H2 · 123618)*
- of an attendant of Śiva , Kathās. *(H2 · 123619)*
- of an attendant of the Sun, L. *(H2 · 123620)*
- of a Rudra , VP. *(H2 · 123621)*
- of a Yakṣa , MBh. *(H2 · 123622)*
- of a Dānava , Kathās. *(H2 · 123623)*
- of a Nāga or serpent-demon, MBh. i, 1554 (the supposed author of the Chandas or treatise on metre regarded as one of the Vedāṅga s, identified by some with Patañjali , author of the Mahā-bhāṣya ) *(H2 · 123624)*
- of sev. ancient sages, MBh. ; R. &c. *(H2 · 123625)*
- पिङ्गल m. pl. N. of a people, MārkP. *(H2 · 123626)*
- पिङ्गला ( आ ), f. a species of bird, L. *(H2B · 123627)*
- a kind of owl, Var. *(H2B · 123628)*
- Dalbergia Sissoo , L. *(H2B · 123629)*
- = कर्णिका , L. *(H2B · 123630)*
- a kind of brass, L. *(H2B · 123631)*
- a partic. vessel of the body (the right of 3 tubular vessels which according to the Yoga philosophy are the chief passages of breath and air; cf. ChUp. viii, 6, 1 ) *(H2B · 123632)*
- a kind of yellow pigment (= गो-रोचना ), L. *(H2B · 123633)*
- N. of Lakṣmī , Gal. *(H2B · 123634)*
- of a courtezan who became remarkable for her piety, MBh. *(H2B · 123635)*
- of the female elephant of the South quarter, L. *(H2B · 123636)*
- of an astrological house or period, W. *(H2B · 123637)*
- heart-pea, W. *(H2B · 123638)*
- पिङ्गल n. a partic. metal, L. *(H2B · 123639)*
- yellow orpiment, L. *(H2B · 123640)*

### Sanskrit senses at position 52

कालयुक्त Kālayukta

Monier-Williams, printed page 278, queried as `कालयुक्त` (as printed).

- **काल —युक्त m. n. the fifty-second year in the sixty years' cycle of Jupiter, VarBṛS.** *(H3 · 49496)*
- **काल —युक्त ( Bcar. ), mfn. fit for the (present) time, seasonable** *(H3 · 49496)*

### Sanskrit senses at position 53

सिद्धार्थी Siddhārthī

Monier-Williams, printed page 1215, queried as `सिद्धार्थ` (cross-reference from सिद्धार्थिन्).

- सिद्धा र्थ . See col. 3 . *(H1 · 244296)*
- **सिद्धा र्थ mf( आ )n. one who has accomplished an aim or object, successful, prosperous, MBh. ; Kāv. &c.** *(H3 · 244502)*
- leading to the goal, efficient, efficacious, Hariv. ; R. *(H3 · 244503)*
- one whose aim or intention is known, L. *(H3 · 244504)*
- सिद्धा र्थ m. ‘he who has fulfilled the object (of his coming)’, N. of the great Buddha (Gautama or Śākya-muni , founder of Buddhism), MWB. 43 *(H3 · 244505)*
- of a Māra-putra , Lalit. *(H3 · 244506)*
- of a Dānava , Kathās. *(H3 · 244507)*
- of one of Skanda 's attendants, MBh. *(H3 · 244508)*
- of a king, ib. *(H3 · 244509)*
- of a councillor of Daśa-ratha , R. *(H3 · 244510)*
- of the father of Mahā-vīra (the 24th Arhat of the present Avasarpiṇī ), Kathās. *(H3 · 244511)*
- of a poet, Subh. *(H3 · 244512)*
- सिद्धा र्था ( आ ), f. N. of the mother of the 4th Arhat of the present Avasarpiṇī , L. *(H3B · 244513)*
- white mustard, Suśr. ; VarBṛS. &c. *(H3B · 244514)*
- the Indian fig-tree, L. *(H3B · 244515)*
- the 53rd year in Jupiter's cycle of 60 years, VarBṛS. *(H3B · 244516)*
- सिद्धा र्थ n. ( scil. वास्तु ) a building with two halls (one to the west, and one to the south), VarBṛS. *(H3B · 244517)*

### Sanskrit senses at position 54

रौद्र Raudra

Monier-Williams, printed page 891, queried as `रौद्र` (as printed). Also carried by Shabda-Sagara, Benfey, Yates, Edgerton, Wilson.

- **रौद्र or रौद्र , mf( आ or ई )n. ( fr. रुद्र ) relating or belonging to or coming from Rudra or the Rudra s, Rudra -like, violent, impetuous, fierce, wild ( अम् ind. ), RV. &c. &c.** *(H1 · 180197)*
- **bringing or betokening misfortune, inauspicious, R. ; Var.** *(H1 · 180197)*
- **रौद्र m. a descendant of Rudra , MBh.** *(H1 · 180197)*
- **a worshipper of Rudra , W.** *(H1 · 180197)*
- **( pl. , or sg. with गण ) a class of evil spirits, Hariv.** *(H1 · 180197)*
- **( scil. रस ) the sentiment of wrath or fury, Sāh. ; Pratāp.** *(H1 · 180197)*
- **N. of Yama , L.** *(H1 · 180197)*
- **the cold season of the year, winter, L.** *(H1 · 180197)*
- **a partic. Ketu , VarBṛS.** *(H1 · 180197)*
- **N. of the 54th year of the Jupiter cycle of 60 years, ib.** *(H1 · 180197)*
- **( pl. ) N. of a people, MBh.** *(H1 · 180197)*
- **रौद्र m. n. heat, warmth, sunshine, L.** *(H1 · 180197)*
- **रौद्र mf( ई )n. N. of the Nakṣatra Ārdrā when under Rudra , VarBṛS.** *(H1 · 180197)*
- **रौद्री ( ई ), f. N. of Gaurī , L.** *(H1B · 180197)*
- **one of the 9 Samidh s, Gṛhyās.** *(H1B · 180197)*
- **a partic. Śakti , Hcat.** *(H1B · 180197)*
- **(in music.) a partic. Śruti , Saṃgīt.** *(H1B · 180197)*
- **a partic. Mūrchanā , ib.** *(H1B · 180197)*
- **a species of creeper, L.** *(H1B · 180197)*
- **N. of the Comms. on the Tattva-cintāmaṇi-dīdhiti and the Nyāya-siddhānta-muktāvalī by Rudra Bhaṭṭācārya** *(H1B · 180197)*
- **(with मेघ-माला and शान्ति ) of two older works.** *(H1B · 180197)*
- **रौद्र n. savageness, fierceness, formidableness, Kathās. ; Suśr.** *(H1B · 180197)*
- **N. of a Liṅga , Cat.** *(H1B · 180197)*
- **of various Sāman s, ĀrṣBr.** *(H1B · 180197)*
- **रौद्रम् अम् , ind.** *(H1C · 180197)*

### Sanskrit senses at position 55

दुर्मति Durmati

Monier-Williams, printed page 486, queried as `दुर्मति` (as printed). Also carried by Shabda-Sagara, Benfey, Yates, Edgerton, Wilson.

- दुर् —मति f. bad disposition of mind, envy, hatred, RV. ; VS. ; AV. *(H3 · 94156)*
- false opinion or notions, Cāṇ. *(H3 · 94157)*
- **दुर् —मति mfn. weak-minded, silly, ignorant (rarely ‘malicious’, ‘wicked’)** *(H3 · 94158)*
- **दुर् —मति m. fool, blockhead (rarely ‘scoundrel’, ‘villain’), Mn. ; MBh. &c.** *(H3 · 94158)*
- N. of the 55th year of the cycle of Jupiter (lasting 60 years), Var. ; Sūryas. *(H3 · 94159)*
- of a demon, Lalit. *(H3 · 94160)*
- of a blockhead, Bharat . *(H3 · 94161)*

### Sanskrit senses at position 56

दुन्दुभि Dundubhi

Monier-Williams, printed page 484, queried as `दुन्दुभि` (as printed). Also carried by Shabda-Sagara, Benfey, Yates, Edgerton, Wilson.

- **दुन्दुभि m. f. a sort of large kettledrum, RV. ; Br. ; MBh. ; Kāv. &c.** *(H1 · 93585)*
- a sort of poison, L. *(H1 · 93586)*
- N. of the 56th year in the Jupiter cycle of 60 years, Var. ; Sūryas. *(H1 · 93587)*
- of Kṛṣṇa , MBh. xii, 1511 *(H1 · 93588)*
- of Varuṇa , L. *(H1 · 93589)*
- of Asura s, a Rakṣas , a Yakṣa &c., R. ; Hariv. ; Kathās. *(H1 · 93590)*
- of a son of Andhaka and grandson of Anu &c., Pur. *(H1 · 93591)*
- दुन्दुभि f. a drum, AV. vi, 38, 4 (also ॰भी , MBh. iii, 786 ) *(H1 · 93592)*
- दुन्दुभी ( ई ), f. a partic. throw of the dice in gambling, L. *(H1B · 93593)*
- N. of a Gandharvī , MBh. *(H1B · 93594)*
- दुन्दुभि n. N. of a partic. Varṣa in Krauñca-dvīpa , VP. *(H1B · 93595)*

### Sanskrit senses at position 57

रुधिरोद्गारी Rudhirodgārī

Monier-Williams, printed page 884, queried as `रुधिरोद्गारिन्` (-in stem).

**Composed meaning ‡** — "emitting blood", from रुधिर "blood" (page 884, 178827). Monier-Williams has no entry for the whole word.

- रुधिरो द्गारिन् mf( इणी )n. ‘emitting b˚ ’, N. of the 57th year in Jupiter's cycle of 60 years, Cat. *(H3 · 178853)*

### Sanskrit senses at position 58

रक्ताक्ष Raktākṣa

Monier-Williams, printed page 862, queried as `रक्ताक्ष` (as printed). Also carried by Shabda-Sagara, Yates, Edgerton.

- **रक्ता क्ष mf( ई )n. red-eyed, having red or blood-shot eyes, R. ; BhP. ( -ता f. , Dharmaś. )** *(H3 · 173666)*
- fearful, dreadful, L. *(H3 · 173667)*
- रक्ता क्ष m. a buffalo, L. *(H3 · 173668)*
- Perdix Rufa , L. *(H3 · 173669)*
- a pigeon, L. *(H3 · 173670)*
- the Indian crane, L. *(H3 · 173671)*
- N. of a sorcerer, Buddh. *(H3 · 173672)*
- N. of the minister of an owl-king, Kathās. ; Pañcat. *(H3 · 173673)*
- रक्ता क्ष n. N. of the fifty-eighth year in a Jupiter's cycle of sixty years, VarBṛS. (also ॰क्षि m. or ॰क्षिन् m. , Cat. ) *(H3 · 173674)*
- रक्ता क्षी f. N. of a Yoginī , Hcat. *(H3B · 173675)*

### Sanskrit senses at position 59

क्रोधन Krodhana

Monier-Williams, printed page 322, queried as `क्रोधन` (as printed). Also carried by Shabda-Sagara, Benfey, Yates, Edgerton.

- **क्रोधन mf( आ )n. ( Pāṇ. iii, 2, 151 ) inclined to wrath, passionate, angry (with loc. Yājñ. i, 333 ), MBh. &c.** *(H2 · 58274)*
- क्रोधन m. (= क्रोध ) the 59th year in the sixty years' Bṛhaspati cycle, Romakas. *(H2 · 58275)*
- N. of a son of Kauśika and pupil of Garga , Hariv. 1189. *(H2 · 58276)*
- of a son of A-yuta and father of Devātithi , BhP. ix, 22, 11 *(H2 · 58277)*
- of a man, Kathās. lviii, 84 *(H2 · 58278)*
- of a Śākta author of Mantra s *(H2 · 58279)*
- क्रोधना f. a passionate woman, vixen, L. *(H2B · 58280)*
- N. of one of the mothers in Skanda 's retinue, MBh. ix, 2624 *(H2B · 58281)*
- of a Yoginī , Hcat. *(H2B · 58282)*
- क्रोधन n. ‘the being angry, anger’, only ifc. स-क्र् ॰ ( q.v. ) *(H2B · 58283)*

### Sanskrit senses at position 60

क्षय Kṣaya

Monier-Williams, printed page 327, queried as `क्षय` (as printed). Also carried by Shabda-Sagara, Benfey, Yates, Edgerton, Wilson.

- क्षय See √ 1. 2. and 4. क्षि . *(H1 · 59135)*
- 1\. क्षय m. ‘dominion’, Sāy. (on, RV. vii, 46, 2 ). *(H2 · 59267)*
- 2\. क्षय mfn. dwelling, residing, RV. iii, 2, 13 ; viii, 64, 4 *(H2 · 59273)*
- क्षय m. an abode, dwelling-place, seat, house ( cf. उरु- and सु-क्षय , रथ- , दिविक्षय ), RV. ; VS. v, 38 ; TS. ; Pāṇ. ; MBh. ; R. ; BhP. *(H2 · 59274)*
- the house of Yama ( cf. यम-क्ष् ॰ , वैवस्वत-क्ष् ॰ ) *(H2 · 59275)*
- abode in Yama 's dominion Comm. on R. (ed. Bomb.) ii, 109, 11 *(H2 · 59276)*
- (= क्षिति ) family, race, RV. i, 123, 1. *(H2 · 59277)*
- **3\. क्षय (the accent is on the last syllable in the sense ‘destruction’, accord. to Pāṇ. iii, 3, 56 and vi, 1, 63 .) m. ( Pāṇ. vi, 1, 201 ) loss, waste, wane, diminution, destruction, decay, wasting or wearing away (often ifc. ), Mn. ; MBh. &c.** *(H2 · 59377)*
- fall (as of prices, opposed to वृद्धि , e.g. क्षयो वृद्धिश् च पण्यानाम् , ‘the fall and rise in the price of commodities’), Yājñ. ii, 258 *(H2 · 59378)*
- removal, W. *(H2 · 59379)*
- end, termination ( e.g. निद्रा-क्ष् ॰ , the end of sleep, R. vi, 105, 14 ; दिन-क्षये , at the end of day, MBh. i, 699 ; R. iv, 3, 10 ; जीवित-क्षये , at the end of life, Daś. ; आयुषः क्ष् ॰ id. , Ragh. ; क्षयं √गम् , √ या , √ इ , or उप √इ , to become less, be diminished, go to destruction, come to an end, perish, Nal. ; R. ; Suśr. ; VarBṛS. ; Daś. ; Amar. ; Hit. ; क्षयं √नी , to destroy, R. v, 36, 51 ) *(H2 · 59380)*
- consumption, phthisis pulmonalis, Suśr. ; Hcat. *(H2 · 59381)*
- sickness in general, L. *(H2 · 59382)*
- the destruction of the universe, Pañcat. *(H2 · 59383)*
- (in alg. ) a negative quantity, minus, Āryabh. *(H2 · 59384)*
- = -मास , Jyot. *(H2 · 59385)*
- = क्षया ह , Gaṇit. *(H2 · 59386)*
- N. of a prince, VP. *(H2 · 59387)*
- क्षया ( आ ), f. N. of a Yoginī , Hcat. *(H2B · 59388)*
- क्षय ( अम् ), n. N. of the last year in the sixty years' Bṛhaspati cycle, VarBṛS. *(H2B · 59389)*
