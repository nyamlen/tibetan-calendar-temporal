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
- **Position 15: Vṛṣaprajā → Vṛṣabha.** Wikipedia's वृषप्रजा has no English Wiktionary page at all, and a reading no dictionary carries is not a variant worth preserving. Janson has `brisabha` (vrisabha) and Sewell has Vrisha, so the Indic sources point at a bull-name; the Tibetan `khyu mchog` is 'chief bull'. वृषभ is attested and its senses are 'a bull' AND 'the chief, most excellent or eminent', carrying both halves of the Tibetan where Sewell's वृष is only 'man, male, bull'. So Janson's form is taken over Sewell's on attested meaning rather than on preference.
- **Position 37: Śobhakṛt → Śobhana.** Sewell and Janson both have Sobhana, and Wikipedia's शोभकृत् has no English Wiktionary page while शोभन does, glossed 'brilliant, beautiful'. This was left uncorrected until 2026-08-21 on the argument that the Tibetan `mdzes byed` ('beautifying') renders sobhakrit more closely -- but that weighed a translation nuance against two sources plus attestation, which is the wrong way round.
- **Position 6, Wylie: `anggi ra` → `ang gi ra`.** Janson's `anggi ra` does not survive the EWTS round trip: it converts to ཨངགི་ར, which reads back as `angagi ra` -- not a word. `ang gi ra` converts to ཨང་གི་ར and round-trips exactly, both converters agree on it, and THL returns a clean phonetic for it where `anggi ra` returns the `(?)` marker meaning it could not analyse the string. It is also the form the retired bespoke converter hard-coded for this row, and it matches the syllable structure of the Sanskrit it transliterates, Angirasa आङ्गिरस. The likeliest reading is a missing space in the source.

## Discrepancies recorded, not corrected

At such positions the sources disagree and no reading is clearly right, so choosing one would
manufacture authority rather than source it.

**There are none at present**, and how the last two went is worth keeping. Positions 15 and 37 sat here until 2026-08-21, on the argument that Sewell and Janson disagreed with each other at 15 and that the Tibetan sided with Wikipedia at 37. Checking attestation settled both: the Wikipedia forms वृषप्रजा and शोभकृत् have no English Wiktionary page at all, while वृषभ and शोभन both do. A reading that no dictionary carries is not a variant worth preserving, so both became corrections.

## The English columns

They gloss **different names**, which is the point of showing them side by side.

- **English (Tibetan)** is **authored, not sourced.** It glosses the Tibetan name, written for this
  table. No source gives English for these — Sewell & Fleet prints the sixty as bare names against
  Kaliyuga years and fractional day-counts, with no meaning column, checked directly.
- **Sanskrit senses** are **sourced**: every sense English Wiktionary lists for that Devanāgarī
  headword, not just the first. 24 of the 60 have no
  Sanskrit entry, so the column is blank there — sense-sourcing covers rather more than half the
  table, not all of it.
- **Selected** is an **authored choice from those sourced candidates**, and the generator refuses to
  run unless the chosen string appears verbatim among the senses actually fetched. So the editorial
  step is visible and machine-checked; it can select, never invent.

**Why a selection is needed at all.** Entries carry several senses, often from different roots, and
taking the first is an accident rather than a policy. `क्षय` lists "dominion, place of abode" before
"decay, corrosion" — two different words sharing a spelling, and only the second renders `zad pa`.

**Position confirmed** marks rows where Wiktionary's own entry states the cycle position — a third
lineage agreeing on the alignment rather than on the spelling.

## The table

Every column heading names where that column comes from, so no row has to be traced back through
the prose above to know what stands behind it.

| # *(Janson)* | Tibetan *(two EWTS)* | Wylie *(Janson)* | Phonetic *(THL)* | Devanāgarī *(saṃvatsara)* | IAST *(saṃvatsara)* | English of the Tibetan **(authored)** | Sanskrit senses *(Wiktionary)* | Selected **(authored)** | Position *(Wiktionary)* | Years *(Janson + saṃvatsara)* |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | རབ་བྱུང | `rab byung` | *rap jung* | प्रभव | Prabhava | Arising | prominent, excelling, distinguished; production, source, origin, cause of existence (as father or; name of Vishnu; name of the first or 35th year in a 60 years' cycle of Jupit | production, source, origin, cause of existence (as father or mother, also ‘the Creator’), birthplace (often ifc., with f( आ)., springing or rising or derived from, belonging to) | yes | 1927, 1987 |
| 2 | རྣམ་བྱུང | `rnam byung` | *nam jung* | विभव | Vibhava | Full arising | powerful, rich; being everywhere, omnipresence; development, evolution (with वैष्णवs ‘the evolution of the S; power, might, greatness, exalted position, rank, dignity, ma; name of the 2nd year in Jupiter's cycle of 60 years | development, evolution (with वैष्णवs ‘the evolution of the Supreme Being into secondary forms’) | yes | 1928, 1988 |
| 3 | དཀར་པོ | `dkar po` | *kar po* | शुक्ल | Śukla | White | the bright half of a lunar month or any day in it; the month वैशाख; white (the colour); mucus, saliva ( शुक्लं-√कृ, to spit at); ricinus or white ricinus; the 37th (or 3rd) year of Jupiter's cycle of 60 years; the 24th of the astronomical Yogas; white or candied sugar | white (the colour) | yes | 1929, 1989 |
| 4 | རབ་མྱོས | `rab myos` | *rap nyö* | प्रमोदूत | Pramodūta | Elated | *no Sanskrit entry* | — | — | 1930, 1990 |
| 5 | སྐྱེས་བདག | `skyes bdag` | *kyé dak* | प्रजापति | Prajāpati | Lord of creatures | a deity later identified with Brahma; a creator god; father; king | a creator god | — | 1931, 1991 |
| 6 | ཨང་གི་ར | `ang gi ra` | *ang gi ra* | आङ्गिरस | Āṅgirasa | Aṅgirasa — a ṛṣi's name, transliterated not translated | *no Sanskrit entry* | — | — | 1932, 1992 |
| 7 | དཔལ་གདོང | `dpal gdong` | *pel dong* | श्रीमुख | Śrīmukha | Glorious face | a beautiful face; the word written on the back of a letter; name of the 7th (or 41st) year of Jupiter's cycle of 60 year | a beautiful face | yes | 1933, 1993 |
| 8 | དངོས་པོ | `dngos po` | *ngö po* | भाव | Bhāva | Entity | becoming; being, existing, occurring, appearance; turning or transition into; continuance; state; condition; rank; true condition or state; truth; reality; manner of being; nature; temperament; character; manner of acting; conduct; behaviour; any state of mind or body; way of thinking or feeling; senti | becoming; being, existing, occurring, appearance | yes | 1934, 1994 |
| 9 | ན་ཚོད་ལྡན | `na tshod ldan` | *na tsö den* | युव | Yuva | Youthful | you both | — | — | 1935, 1995 |
| 10 | འཛིན་བྱེད | `'dzin byed` | *dzin jé* | धातृ | Dhātṛ | Holder | creator, founder; maintainer, supporter; the god who is responsible for the creation and maintenance  | maintainer, supporter | — | 1936, 1996 |
| 11 | དབང་ཕྱུག | `dbang phyug` | *wang chuk* | ईश्वर | Īśvara | Mighty lord | able to do, capable of; liable, exposed to; master, lord, prince, king q\|feminine; a husband; God, the Supreme Being; an epithet of Shiva; an epithet of Vishnu | — | — | 1937, 1997 |
| 12 | འབྲུ་མང་པོ | `'bru mang po` | *dru mang po* | बहुधान्य | Bahudhānya | Much grain | ‘abounding in corn’; name of the 12th or 46th year in a 60 years' cycle of Jupite | ‘abounding in corn’ | yes | 1938, 1998 |
| 13 | མྱོས་ལྡན | `myos ldan` | *nyö den* | प्रमाथी | Pramāthi | Intoxicated | *no Sanskrit entry* | — | — | 1939, 1999 |
| 14 | རྣམ་གནོན | `rnam gnon` | *nam nön* | विक्रम | Vikrama | Overcoming | a step, stride, pace; going, proceeding, walking, motion, gait; course, way, manner ( अनुक्रम-विक्रमेण = अनुक्रमेण, in regul; valour, courage, heroism, power, strength; intensity, high degree; stability, duration (opp. to ‘cessation’); a kind of grave accent; non-change of the विसर्ग into an ऊष्मन् | valour, courage, heroism, power, strength | yes | 1940, 2000 |
| 15 | ཁྱུ་མཆོག | `khyu mchog` | *khyu chok* | वृषभ | Vṛṣabha | Chief bull | a bull; the chief, most excellent or eminent, lord or best among (in; the zodiacal sign Taurus; a particular drug (described as a root brought from the Hima; manly, mighty, vigorous, strong | the chief, most excellent or eminent, lord or best among (in later language mostly at the end of a compound, or with genitive) | — | 1941, 2001 |
| 16 | སྣ་ཚོགས | `sna tshogs` | *na tsok* | चित्रभानु | Citrabhānu | Variegated | of variegated lustre, shining with light; name of fire; the 16th year in the 60 years' cycle of Jupiter | of variegated lustre, shining with light | yes | 1942, 2002 |
| 17 | ཉི་མ | `nyi ma` | *nyi ma* | स्वभानु | Svabhānu | Sun | *no Sanskrit entry* | — | — | 1943, 2003 |
| 18 | ཉི་སྒྲོལ་བྱེད | `nyi sgrol byed` | *nyi dröl jé* | तारण | Tāraṇa | Sun-freeing | crossing, safe passage; conquering (difficulties); carrying across, liberating, saving; the 3rd year of the 4th Jupiter cycle | carrying across, liberating, saving | — | 1944, 2004 |
| 19 | ས་སྐྱོང | `sa skyong` | *sa kyong* | पार्थिव | Pārthiva | Earth-protector | earthly, earthen; of the earth | earthly, earthen; of the earth | — | 1945, 2005 |
| 20 | མི་ཟད | `mi zad` | *mi zé* | अव्यय/व्यय | Avyaya/Vyaya | Inexhaustible | *no Sanskrit entry* | — | — | 1946, 2006 |
| 21 | ཐམས་ཅད་འདུལ | `thams cad 'dul` | *tam ché dül* | सर्वजित् | Sarvajit | All-taming | all-conquering; conquering all (three) humours; all-surpassing, excellent; a particular (, , ); the 21st year of Jupiter's cycle of 60 years | — | yes | 1947, 2007 |
| 22 | ཀུན་འཛིན | `kun 'dzin` | *kün dzin* | सर्वधारी | Sarvadhārī | All-holding | Name of the 22nd year of the Jovian cycle | — | — | 1948, 2008 |
| 23 | འགལ་བ | `'gal ba` | *gel ba* | विरोधी | Virodhī | Opposition | *no Sanskrit entry* | — | — | 1949, 2009 |
| 24 | རྣམ་འགྱུར | `rnam 'gyur` | *nam gyur* | विकृति | Vikṛti | Transformed | transformation; alteration; change; modification; variation;; apparition; spectre | transformation; alteration; change; modification; variation; changed condition | — | 1950, 2010 |
| 25 | བོང་བུ | `bong bu` | *bong bu* | खर | Khara | Donkey | hard, harsh, rough, sharp, pungent, acid; solid; dense (clouds); sharp, hot (wind); hurtful, injurious, cutting (as speech or word); sharp-edged; cruel; osprey | — | yes | 1951, 2011 |
| 26 | དགའ་བ | `dga' ba` | *ga ba* | नन्दन | Nandana | Joy | *no Sanskrit entry* | — | — | 1952, 2012 |
| 27 | རྣམ་རྒྱལ | `rnam rgyal` | *nam gyel* | विजय | Vijaya | Complete victory | leading to victory, proclaiming victory; contest for victory, conquest, triumph, superiority, etc. (f; the prize of victory, booty; a kind of flute; Vijaya, one of the two gatekeepers of Vishnu, cursed to be b | contest for victory, conquest, triumph, superiority, etc. (fig. applied to the ‘sword’ and to ‘punishment’) | — | 1953, 2013 |
| 28 | རྒྱལ་བ | `rgyal ba` | *gyel ba* | जय | Jaya | Victory | conquest, victory, triumph, winning, being victorious (in ba; name of particular verses causing victory (personified as de; or; a yellow variety of ( <= ); name of the 3rd year of the 6th lustrum of the bṛhaspati cyc; a kind of flute; a kind of measure; the sun | conquest, victory, triumph, winning, being victorious (in battle or in playing with dice or in a lawsuit) | — | 1954, 2014 |
| 29 | མྱོས་བྱེད | `myos byed` | *nyö jé* | मन्मथ | Manmatha | Intoxicating | love or the god of love, amorous passion or desire; wood apple (Limonia acidissima L.); the 29th (3rd) year in a 60-year cycle of Jupiter; name of a physician and various other men | love or the god of love, amorous passion or desire | yes | 1955, 2015 |
| 30 | གདོང་ངན | `gdong ngan` | *dong ngen* | दुर्मुख | Durmukha | Ill-faced | *no Sanskrit entry* | — | — | 1956, 2016 |
| 31 | གསེར་འཕྱང | `gser 'phyang` | *ser chang* | हेमलम्ब | Hemalamba | Hanging gold | Name of the 31st year of Jupiter's cycle of 60 years | — | yes | 1957, 2017 |
| 32 | རྣམ་འཕྱང | `rnam 'phyang` | *nam chang* | विळम्बि | Vilambi | Hanging down | *no Sanskrit entry* | — | — | 1958, 2018 |
| 33 | སྒྱུར་བྱེད | `sgyur byed` | *gyur jé* | विकारि | Vikāri | Transforming | *no Sanskrit entry* | — | — | 1959, 2019 |
| 34 | ཀུན་ལྡན | `kun ldan` | *kün den* | शार्वरी | Śārvarī | All-possessing | *no Sanskrit entry* | — | — | 1960, 2020 |
| 35 | འཕར་བ | `'phar ba` | *par ba* | प्लव | Plava | Leaping | swimming, floating ṠāṅkhGṛ. Suṡr; sloping towards, inclined Hariv. Var. Hcat. (in astrol. appl; transient MuṇḍUp; a float, raft, boat, small ship RV. &c; a kind of aquatic bird (= गात्र-सम्प्लव, कारण्डव, जल-वायस, ज; a snare or basket of wicker-work for catching fish; the 35th (or 9th) year in a cycle of Jupiter; swimming; bathing | — | — | 1961, 2021 |
| 36 | དགེ་བྱེད | `dge byed` | *gé jé* | शुभकृत् | Śubhakṛt | Virtue-making | *no Sanskrit entry* | — | — | 1962, 2022 |
| 37 | མཛེས་བྱེད | `mdzes byed` | *dzé jé* | शोभन | Śobhana | Beautifying | brilliant, beautiful | brilliant, beautiful | — | 1963, 2023 |
| 38 | ཁྲོ་མོ | `khro mo` | *tro mo* | क्रोधी | Krodhī | Wrathful — feminine, against 59 | *no Sanskrit entry* | — | — | 1964, 2024 |
| 39 | སྣ་ཚོགས་དབྱིག | `sna tshogs dbyig` | *na tsok yik* | विश्वावसु | Viśvāvasu | Manifold wealth | *no Sanskrit entry* | — | — | 1965, 2025 |
| 40 | ཟིལ་གནོན | `zil gnon` | *zil nön* | पराभव | Parābhava | Overwhelming | vanishing, disappearance, dissolution, separation; overthrow, defeat, humiliation, mortification, contempt, inj; name of the 40th (or 14th) year in Jupiter's cycle of 60 yea | overthrow, defeat, humiliation, mortification, contempt, injury, destruction, ruin | yes | 1966, 2026 |
| 41 | སྤྲེའུ | `spre'u` | *treu* | प्लवङ्ग | Plavaṅga | Monkey | *no Sanskrit entry* | — | — | 1967, 2027 |
| 42 | ཕུར་བུ | `phur bu` | *pur bu* | कीलक | Kīlaka | Peg | a pin, bolt, wedge; a splint (for confining a broken bone); a kind of tumour (having the form of a pin); a kind of pillar for cows &c. to rub themselves against, or ; name of the forty-second year of the sixty years' cycle of J; name of the inner syllables of a mantra | a pin, bolt, wedge | — | 1968, 2028 |
| 43 | ཞི་བ | `zhi ba` | *zhi ba* | सौम्य | Saumya | Peaceful | related or pertaining to Soma; cool and moist; northern; resembling the moon; auspicious; happy, pleasant, cheerful | — | — | 1969, 2029 |
| 44 | ཐུན་མོང | `thun mong` | *tün mong* | साधारण | Sādhāraṇa | Common | common, ordinary; "having or resting on the same support or basis", belonging ; like, equal or similar to (instrumental or compound); behaving alike; having something of two opposite properties, occupying a mid; belonging to more than the one instance alleged (one of the ; generic; name of the 44th (or 18th) year of Jupiter's cycle of 60 yea | common, ordinary | yes | 1970, 2030 |
| 45 | འགལ་བྱེད | `'gal byed` | *gel jé* | विरोधकृत | Virodhakṛta | Opposition-making | *no Sanskrit entry* | — | — | 1971, 2031 |
| 46 | ཡོངས་འཛིན | `yongs 'dzin` | *yong dzin* | परिधावी | Paridhāvi | Wholly-holding | *no Sanskrit entry* | — | — | 1972, 2032 |
| 47 | བག་མེད | `bag med` | *bak mé* | प्रमादी | Pramādi | Heedless | *no Sanskrit entry* | — | — | 1973, 2033 |
| 48 | ཀུན་དགའ | `kun dga'` | *kün ga* | आनंद | Ānanda | Complete joy | *no Sanskrit entry* | — | — | 1974, 2034 |
| 49 | སྲིན་བུ | `srin bu` | *sin bu* | राक्षस | Rākṣasa | Demon | pertaining to, characteristic of, or produced by a demon, de; a demon in general, an evil or malignant demon | a demon in general, an evil or malignant demon | — | 1975, 2035 |
| 50 | མེ | `me` | *mé* | नल/अनल | Nala/Anala | Fire | *no Sanskrit entry* | — | — | 1976, 2036 |
| 51 | དམར་སེར་ཅན | `dmar ser can` | *mar ser chen* | पिंगल | Piṅgala | Tawny — reddish-yellow | *no Sanskrit entry* | — | — | 1977, 2037 |
| 52 | དུས་ཀྱི་ཕོ་ཉ | `dus kyi pho nya` | *dü kyi po nya* | कालयुक्त | Kālayukta | Messenger of time | fit for the (present) time, seasonable; Name of the 52nd year in the sixty years' cycle of Jupiter | fit for the (present) time, seasonable | yes | 1978, 2038 |
| 53 | དོན་གྲུབ | `don grub` | *dön drup* | सिद्धार्थी | Siddhārthi | Aim accomplished | *no Sanskrit entry* | — | — | 1979, 2039 |
| 54 | དྲག་པོ | `drag po` | *drak po* | रौद्र | Raudri | Fierce | relating or belonging to or coming from Rudra or the Rudras,; bringing or betokening misfortune, inauspicious R. Var; a descendant of Rudra; a worshipper of Rudra; (pl., or sg. with गण) a class of evil spirits Hariv; (scil. रस) the sentiment of wrath or fury Sāh. Pratāp; the cold season of the year, winter L; name of the 54th year of the Jupiter cycle of 60 years ib | — | yes | 1980, 2040 |
| 55 | བློ་ངན | `blo ngan` | *lo ngen* | दुर्मति | Durmati | Ill-minded | weak-minded, silly, ignorant (rarely ‘malicious’, ‘wicked’); bad disposition of mind, envy, hatred RV. VS. AV; false opinion or notions Cāṇ; fool, blockhead (rarely ‘scoundrel’, ‘villain’) Mn. MBh. &c; name of the 55th year of the cycle of Jupiter (lasting 60 ye | weak-minded, silly, ignorant (rarely ‘malicious’, ‘wicked’) | yes | 1981, 2041 |
| 56 | རྔ་ཆེན | `rnga chen` | *nga chen* | दुन्दुभी | Dundubhi | Great drum | name of a Gandharvī; a particular throw of the dice in gambling | — | — | 1982, 2042 |
| 57 | ཁྲག་སྐྱུག | `khrag skyug` | *trak kyuk* | रूधिरोद्गारी | Rudhirodgāri | Blood-spitting | *no Sanskrit entry* | — | — | 1983, 2043 |
| 58 | མིག་དམར | `mig dmar` | *mik mar* | रक्ताक्षि | Raktākṣi | Red-eyed | *no Sanskrit entry* | — | — | 1984, 2044 |
| 59 | ཁྲོ་བོ | `khro bo` | *tro bo* | क्रोधन | Krodhana/Manyu | Wrathful — masculine, against 38 | inclined to wrath, passionate, angry; the 59th year in the sixty years' बृहस्पति cycle; name of a son of कौशिक and pupil of गर्ग; name of a son of अ-युत and father of देवातिथि; name of a शाक्त author of मन्त्रs; name of one of the mothers in स्कन्द's retinue; name of a योगिनी; ‘the being angry, anger’, only ifc. स-क्र्° (q.v.) | inclined to wrath, passionate, angry | yes | 1985, 2045 |
| 60 | ཟད་པ | `zad pa` | *zé pa* | क्षय | Kshaya | Exhaustion | dominion; place of abode, seat, house; dwelling, residing; decay, corrosion; ruin, destruction; diminution, decline, wasting away; fall (as of prices, opposed to वृद्धि); removal | decay, corrosion | — | 1986, 2046 |
