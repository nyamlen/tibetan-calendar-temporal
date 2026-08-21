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
| Wikipedia saṃvatsara table | IAST, Devanāgarī | The only machine-readable source found carrying diacritics **and** Devanāgarī together. Sewell has neither | **Sourced**, corrected below |
| Sewell & Fleet, *The Siddhāntas and the Indian Calendar* (1924) | **Name identity only** — which name sits at which position | The authority the IAST column is *cited* to. It cannot check spelling: it prints `Sukla`, `Vrisha`, `Kshaya` in 1924 romanisation with **no IAST diacritics anywhere** | **Sourced**, by majority vote over thousands of OCR reads |
| English Wiktionary | That a Devanāgarī headword exists as a Sanskrit word; the cycle position where the entry states it; the Sanskrit senses | A third lineage independent of both Janson and Sewell, and the only one that names positions outright. Also the only sourced material for an English meaning — Sewell prints none, checked directly | **Sourced** |
| `jsewts` + `tibetan-ewts-converter` | Tibetan script | Two independent implementations required to agree, then to read back as the Wylie they came from | **Derived**, doubly |
| THL phonetics converter | THL Simplified phonetics | The publisher of the standard | **Sourced** |

**Janson's ASCII Sanskrit is deliberately not used.** It collides three names onto `pramadi`,
carries no Devanāgarī, and he flags its spellings as varying between sources. With IAST in hand it
is never needed.

**Why Sewell is consulted by majority vote.** Its scan is OCR and noisy — `Ksliaya`, `Manniathn`,
`Ahgiras`. No single occurrence is trusted. The book prints "N Name" thousands of times across its
year-conversion tables, so the modal spelling at each position over thousands of reads is taken
instead: OCR errors scatter, the true reading does not.

## Corrections applied, with their evidence

The IAST column is cited to Sewell & Fleet but reaches us through the Wikipedia saṃvatsara table,
and the two disagree in two places. Each correction is applied only after the **original is
confirmed still present**, so it self-invalidates: if the table is fixed upstream, the script says so
rather than silently applying a patch that is no longer needed.

- **Position 60: Akshaya → Kshaya.** Sewell & Fleet give Kshaya at position 60 (modal reading, 82% of 49 occurrences) and the string 'Akshaya' appears nowhere in the book. Janson has `ksayaka`, and the Tibetan is `zad pa`, exhaustion -- ksaya, not a-ksaya, which is its opposite. Three lineages against the Wikipedia table's reading.
- **Position 31: Hevilambi → Hemalamba.** Sewell & Fleet give Hemalamba at 31, Janson has `hemalambha`, and English Wiktionary's entry at हेमलम्ब reads 'Name of the 31st year of Jupiter's cycle of 60 years' -- a third lineage naming the position outright.
- **Position 6, Wylie: `anggi ra` → `ang gi ra`.** Janson's `anggi ra` does not survive the EWTS round trip: it converts to ཨངགི་ར, which reads back as `angagi ra` -- not a word. `ang gi ra` converts to ཨང་གི་ར and round-trips exactly, both converters agree on it, and THL returns a clean phonetic for it where `anggi ra` returns the `(?)` marker meaning it could not analyse the string. It is also the form the retired bespoke converter hard-coded for this row, and it matches the syllable structure of the Sanskrit it transliterates, Angirasa आङ्गिरस. The likeliest reading is a missing space in the source.

## Discrepancies recorded, not corrected

At these positions the sources disagree and no reading is clearly right, so choosing one would
manufacture authority rather than source it.

- **Position 15.** Wikipedia has Vrisapraja; Sewell has Vrisha; Janson has `brisabha` (vrisabha); the Tibetan `khyu mchog` is 'chief bull'. Sewell and Janson point at a bull-name and the Tibetan agrees, but they point at two different ones (vrisa against vrisabha), so there is no single corrected reading to apply.
- **Position 37.** Wikipedia has Sobhakrit; Sewell and Janson both have Sobhana. The Tibetan `mdzes byed` is 'beautifying', which renders sobhakrit (making beautiful) more closely than sobhana (beautiful). So the Indic sources agree with each other and the Tibetan agrees with Wikipedia -- a genuine split, not an error to fix.

## The two English columns

They gloss **different names**, and that is the point of showing both.

- **English (Tibetan)** is **authored, not sourced.** It glosses the Tibetan name, written for this
  table. No source gives English for these — Sewell & Fleet prints the sixty as bare names against
  Kaliyuga years and fractional day-counts, with no meaning column, checked directly.
- **Sanskrit sense** is the first sense of the Devanāgarī headword on English Wiktionary. **Sourced,
  but a selection**: entries carry several senses, often from different roots, so which one applies
  is an editorial judgement. `क्षय` offers "decay, corrosion" alongside "dominion, place of abode".

**Position confirmed** marks rows where Wiktionary's own entry states the cycle position, which is
a third lineage agreeing on the alignment rather than on the spelling.

## The table

| # | Tibetan | Wylie | THL | Devanāgarī | IAST | English (Tibetan, authored) | Sanskrit sense (sourced) | Position confirmed | Years |
|---|---|---|---|---|---|---|---|---|---|
| 1 | རབ་བྱུང | `rab byung` | *rap jung* | प्रभव | Prabhava | Arising | prominent, excelling, distinguished | yes | 1927, 1987 |
| 2 | རྣམ་བྱུང | `rnam byung` | *nam jung* | विभव | Vibhava | Full arising | powerful, rich | yes | 1928, 1988 |
| 3 | དཀར་པོ | `dkar po` | *kar po* | शुक्ल | Śukla | White | the bright half of a lunar month or any day in it | yes | 1929, 1989 |
| 4 | རབ་མྱོས | `rab myos` | *rap nyö* | प्रमोदूत | Pramodūta | Elated |  | — | 1930, 1990 |
| 5 | སྐྱེས་བདག | `skyes bdag` | *kyé dak* | प्रजापति | Prajāpati | Lord of creatures | , a deity later identified with Brahma. | — | 1931, 1991 |
| 6 | ཨང་གི་ར | `ang gi ra` | *ang gi ra* | आङ्गिरस | Āṅgirasa | Aṅgirasa — a ṛṣi's name, transliterated not translated |  | — | 1932, 1992 |
| 7 | དཔལ་གདོང | `dpal gdong` | *pel dong* | श्रीमुख | Śrīmukha | Glorious face | a beautiful face | yes | 1933, 1993 |
| 8 | དངོས་པོ | `dngos po` | *ngö po* | भाव | Bhāva | Entity | becoming; being, existing, occurring, appearance | yes | 1934, 1994 |
| 9 | ན་ཚོད་ལྡན | `na tshod ldan` | *na tsö den* | युव | Yuva | Youthful | ; you both | — | 1935, 1995 |
| 10 | འཛིན་བྱེད | `'dzin byed` | *dzin jé* | धातृ | Dhātṛ | Holder | creator, founder | — | 1936, 1996 |
| 11 | དབང་ཕྱུག | `dbang phyug` | *wang chuk* | ईश्वर | Īśvara | Mighty lord | able to do, capable of | — | 1937, 1997 |
| 12 | འབྲུ་མང་པོ | `'bru mang po` | *dru mang po* | बहुधान्य | Bahudhānya | Much grain | ‘abounding in corn’ | yes | 1938, 1998 |
| 13 | མྱོས་ལྡན | `myos ldan` | *nyö den* | प्रमाथी | Pramāthi | Intoxicated |  | — | 1939, 1999 |
| 14 | རྣམ་གནོན | `rnam gnon` | *nam nön* | विक्रम | Vikrama | Overcoming | a step, stride, pace | yes | 1940, 2000 |
| 15 | ཁྱུ་མཆོག | `khyu mchog` | *khyu chok* | वृषप्रजा | Vṛṣaprajā | Chief bull |  | — | 1941, 2001 |
| 16 | སྣ་ཚོགས | `sna tshogs` | *na tsok* | चित्रभानु | Citrabhānu | Variegated | of variegated lustre, shining with light | yes | 1942, 2002 |
| 17 | ཉི་མ | `nyi ma` | *nyi ma* | स्वभानु | Svabhānu | Sun |  | — | 1943, 2003 |
| 18 | ཉི་སྒྲོལ་བྱེད | `nyi sgrol byed` | *nyi dröl jé* | तारण | Tāraṇa | Sun-freeing | crossing, safe passage | — | 1944, 2004 |
| 19 | ས་སྐྱོང | `sa skyong` | *sa kyong* | पार्थिव | Pārthiva | Earth-protector | earthly, earthen; of the earth | — | 1945, 2005 |
| 20 | མི་ཟད | `mi zad` | *mi zé* | अव्यय/व्यय | Avyaya/Vyaya | Inexhaustible |  | — | 1946, 2006 |
| 21 | ཐམས་ཅད་འདུལ | `thams cad 'dul` | *tam ché dül* | सर्वजित् | Sarvajit | All-taming | all-conquering () | yes | 1947, 2007 |
| 22 | ཀུན་འཛིན | `kun 'dzin` | *kün dzin* | सर्वधारी | Sarvadhārī | All-holding | Name of the 22nd year of the Jovian cycle. | — | 1948, 2008 |
| 23 | འགལ་བ | `'gal ba` | *gel ba* | विरोधी | Virodhī | Opposition |  | — | 1949, 2009 |
| 24 | རྣམ་འགྱུར | `rnam 'gyur` | *nam gyur* | विकृति | Vikṛti | Transformed | transformation; alteration; change; modification; variation; changed c | — | 1950, 2010 |
| 25 | བོང་བུ | `bong bu` | *bong bu* | खर | Khara | Donkey | hard, harsh, rough, sharp, pungent, acid | yes | 1951, 2011 |
| 26 | དགའ་བ | `dga' ba` | *ga ba* | नन्दन | Nandana | Joy |  | — | 1952, 2012 |
| 27 | རྣམ་རྒྱལ | `rnam rgyal` | *nam gyel* | विजय | Vijaya | Complete victory | leading to victory, proclaiming victory | — | 1953, 2013 |
| 28 | རྒྱལ་བ | `rgyal ba` | *gyel ba* | जय | Jaya | Victory | conquest, victory, triumph, winning, being victorious (in battle or in | — | 1954, 2014 |
| 29 | མྱོས་བྱེད | `myos byed` | *nyö jé* | मन्मथ | Manmatha | Intoxicating | love or the god of love, amorous passion or desire | yes | 1955, 2015 |
| 30 | གདོང་ངན | `gdong ngan` | *dong ngen* | दुर्मुख | Durmukha | Ill-faced |  | — | 1956, 2016 |
| 31 | གསེར་འཕྱང | `gser 'phyang` | *ser chang* | हेमलम्ब | Hemalamba | Hanging gold | Name of the 31st year of Jupiter's cycle of 60 years. | yes | 1957, 2017 |
| 32 | རྣམ་འཕྱང | `rnam 'phyang` | *nam chang* | विळम्बि | Vilambi | Hanging down |  | — | 1958, 2018 |
| 33 | སྒྱུར་བྱེད | `sgyur byed` | *gyur jé* | विकारि | Vikāri | Transforming |  | — | 1959, 2019 |
| 34 | ཀུན་ལྡན | `kun ldan` | *kün den* | शार्वरी | Śārvarī | All-possessing |  | — | 1960, 2020 |
| 35 | འཕར་བ | `'phar ba` | *par ba* | प्लव | Plava | Leaping | swimming, floating ṠāṅkhGṛ. Suṡr. | — | 1961, 2021 |
| 36 | དགེ་བྱེད | `dge byed` | *gé jé* | शुभकृत् | Śubhakṛt | Virtue-making |  | — | 1962, 2022 |
| 37 | མཛེས་བྱེད | `mdzes byed` | *dzé jé* | शोभकृत् | Śobhakṛt | Beautifying |  | — | 1963, 2023 |
| 38 | ཁྲོ་མོ | `khro mo` | *tro mo* | क्रोधी | Krodhī | Wrathful — feminine, against 59 |  | — | 1964, 2024 |
| 39 | སྣ་ཚོགས་དབྱིག | `sna tshogs dbyig` | *na tsok yik* | विश्वावसु | Viśvāvasu | Manifold wealth |  | — | 1965, 2025 |
| 40 | ཟིལ་གནོན | `zil gnon` | *zil nön* | पराभव | Parābhava | Overwhelming | vanishing, disappearance, dissolution, separation | yes | 1966, 2026 |
| 41 | སྤྲེའུ | `spre'u` | *treu* | प्लवङ्ग | Plavaṅga | Monkey |  | — | 1967, 2027 |
| 42 | ཕུར་བུ | `phur bu` | *pur bu* | कीलक | Kīlaka | Peg | a pin, bolt, wedge | — | 1968, 2028 |
| 43 | ཞི་བ | `zhi ba` | *zhi ba* | सौम्य | Saumya | Peaceful | related or pertaining to Soma | — | 1969, 2029 |
| 44 | ཐུན་མོང | `thun mong` | *tün mong* | साधारण | Sādhāraṇa | Common | common, ordinary | yes | 1970, 2030 |
| 45 | འགལ་བྱེད | `'gal byed` | *gel jé* | विरोधकृत | Virodhakṛta | Opposition-making |  | — | 1971, 2031 |
| 46 | ཡོངས་འཛིན | `yongs 'dzin` | *yong dzin* | परिधावी | Paridhāvi | Wholly-holding |  | — | 1972, 2032 |
| 47 | བག་མེད | `bag med` | *bak mé* | प्रमादी | Pramādi | Heedless |  | — | 1973, 2033 |
| 48 | ཀུན་དགའ | `kun dga'` | *kün ga* | आनंद | Ānanda | Complete joy |  | — | 1974, 2034 |
| 49 | སྲིན་བུ | `srin bu` | *sin bu* | राक्षस | Rākṣasa | Demon | pertaining to, characteristic of, or produced by a demon, demoniacal | — | 1975, 2035 |
| 50 | མེ | `me` | *mé* | नल/अनल | Nala/Anala | Fire |  | — | 1976, 2036 |
| 51 | དམར་སེར་ཅན | `dmar ser can` | *mar ser chen* | पिंगल | Piṅgala | Tawny — reddish-yellow |  | — | 1977, 2037 |
| 52 | དུས་ཀྱི་ཕོ་ཉ | `dus kyi pho nya` | *dü kyi po nya* | कालयुक्त | Kālayukta | Messenger of time | fit for the (present) time, seasonable. | yes | 1978, 2038 |
| 53 | དོན་གྲུབ | `don grub` | *dön drup* | सिद्धार्थी | Siddhārthi | Aim accomplished |  | — | 1979, 2039 |
| 54 | དྲག་པོ | `drag po` | *drak po* | रौद्र | Raudri | Fierce | relating or belonging to or coming from Rudra or the Rudras, Rudra-lik | yes | 1980, 2040 |
| 55 | བློ་ངན | `blo ngan` | *lo ngen* | दुर्मति | Durmati | Ill-minded | weak-minded, silly, ignorant (rarely ‘malicious’, ‘wicked’) | yes | 1981, 2041 |
| 56 | རྔ་ཆེན | `rnga chen` | *nga chen* | दुन्दुभी | Dundubhi | Great drum | name of a Gandharvī () | — | 1982, 2042 |
| 57 | ཁྲག་སྐྱུག | `khrag skyug` | *trak kyuk* | रूधिरोद्गारी | Rudhirodgāri | Blood-spitting |  | — | 1983, 2043 |
| 58 | མིག་དམར | `mig dmar` | *mik mar* | रक्ताक्षि | Raktākṣi | Red-eyed |  | — | 1984, 2044 |
| 59 | ཁྲོ་བོ | `khro bo` | *tro bo* | क्रोधन | Krodhana/Manyu | Wrathful — masculine, against 38 | inclined to wrath, passionate, angry | yes | 1985, 2045 |
| 60 | ཟད་པ | `zad pa` | *zé pa* | क्षय | Kshaya | Exhaustion | dominion | — | 1986, 2046 |
