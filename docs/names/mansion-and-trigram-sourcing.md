# Sourcing the lunar-mansion names and the trigram names

**Status: authored, and ahead of the code.**
It records the evidence and the decisions for two sets of names that `./astrology` will carry once they are verified, written before the verifier so that the verifier is built from a record rather than from memory.
Nothing described here ships yet: `LunarMansion` is `{ index, element }` and `TibetanTrigram` is still Janson's ASCII spellings.
It follows [month-and-yoga-sourcing.md](month-and-yoga-sourcing.md), whose source table, lineage cautions and page-reading method apply here unchanged, and the rule both inherit from [validation-sources.md](../validation-sources.md): **agreement is only evidence if the source did not reach its answer the way we did.**

The two sets:

1. The eight **trigrams** (*spar kha* སྤར་ཁ), which `CalendarDayAttributes.trigram` and `LunarDayAttributes.trigram` return.
2. The 27 **lunar mansions** (*rgyu skar* རྒྱུ་སྐར), which `lunarMansionFor` returns by index 0–26.

## How the pages were read

Every dictionary entry cited below was read from the page image, never from OCR text, which was used only to find a page.
Jäschke is `tibetanenglishdi00jsuoft`, where image `nN` carries printed page N − 25; Das is `tibetanenglishdi00dassuoft`, where `nN` carries printed page N − 39.
Page numbers below are **printed** pages.
Monier-Williams was read from the Cologne 2020 digitisation, whose entries carry the printed page.
Henning is in copyright, so only facts and page numbers are taken from him.

Two sources are new here, both printings of the Mahāvyutpatti:

| Source | Standing | Trusted for |
|---|---|---|
| **Mahāvyutpatti**, ed. Sakaki Ryōzaburō, *Bon-Zō-Kan-Wa shiyaku taikō* (Kyoto 1916), vol. 1 | Public domain; archive.org `kanwashiyakutaik01mahauoft`, printed pp. 225–226 are images `n293`–`n294` | The printed text behind the aggregate's `21-Mahavyutpatti-Skt`: §CLXVI *Aṣṭāviṃśati-nakṣatrāṇi*, entries 3187–3214 |
| **Mahāvyutpatti**, ed. Mironov (St Petersburg 1910–11), Bibliotheca Buddhica XIII | Public domain; archive.org `mahavyutpatti00minauoft`, printed p. 47 is image `n54` | The Sanskrit alone, edited from manuscripts whose readings its footnotes cite: §१६५, the 28 nakṣatras numbered 1–28, with no Tibetan |

It settles whether a disagreement in the aggregate is the source's or the digitisation's.
For the 28 nakṣatras it is the source's: Sakaki prints every pair the aggregate does, including the two below that disagree with every other witness.

## The trigrams

### The English key: Janson's words

Decided by Andreas on 2026-09-15.
`TibetanTrigram` becomes `"fire" | "earth" | "iron" | "sky" | "water" | "mountain" | "wood" | "wind"`, in the King Wen order and Janson's numbering 1–8, with the Tibetan carried under `tibetanNames.trigram`.

| Janson | Tibetan | Das p. 798 | English chosen | Evidence for the English |
|---|---|---|---|---|
| 1 | *li* | fire | fire | Printed for the trigram, Das p. 798 |
| 2 | *khon* | earth | earth | Printed for the trigram, Das p. 798 |
| 3 | *dwa* | iron | iron | Printed for the trigram, Das p. 798 |
| 4 | *khen* | sky | sky | Printed for the trigram, Das p. 798 |
| 5 | *kham* | water | water | Printed for the trigram, Das p. 798 |
| 6 | *gin* | **hill** | **mountain** | By chain: Das p. 798 gives *gin* = རི, and རི is "1. mountain, hill" (Jäschke p. 525) and "a mountain, a hill" (Das p. 1172) |
| 7 | *zin* | **tree** | **wood** | By chain: Das p. 798 gives *zin* = ཤིང, and ཤིང is "1. tree … 2. wood" (Jäschke p. 558) and "1. a tree … 2. wood, timber" (Das p. 1233) |
| 8 | *zon* | wind | wind | Printed for the trigram, Das p. 798 |

Das p. 798, s.v. *spar-kha*: "*spar-brgyad* the eight diagrams of Chinese divination represented by the names of elements and certain other things: *li* = མེ fire, *khon* = ས earth, *dva* = ལྕགས iron, *khen* = གནམ sky, *kham* = ཆུ water, *gin* = རི hill *zin* = ཤིང tree, and *zan* = རླུང wind."
Jäschke p. 330, s.v. *spar-kha*, names none of the eight: "the pah kwah, or eight diagrams of Chinese science".

**Why *tree* is Das's word and not a choice about the trigram.**
Das p. 291, s.v. *hgog-ku*: "Acc. to the Chinese the fundamental elements are tree, fire, earth, iron, and water."
*Tree* is how Das renders the element ཤིང throughout, and p. 798 uses his element words.
The engine already ships ཤིང as the element `wood`, so *tree* would give one Tibetan word two English renderings on one surface.

**Why *hill* has no such explanation.**
རི is not an element, and Das's own entry (p. 1172) puts *mountain* first.
Nothing on p. 798 says why he took the second sense.

**The collision that remains.**
Five of the eight words are also `TibetanElement` values — fire, earth, iron, water, wood — so a lunar day can carry `element: "water"` beside `trigram: "fire"`.
The two are typed differently and mean different things; Das's words would have reused four of them, so the collision is in the vocabulary rather than in the choice.

### The Tibetan spellings

Janson's spellings are *li khon dwa khen kham gin zin zon*.
The *tshig mdzod chen mo*, s.v. *spar kha*, contains all eight in those spellings.
The *dung dkar tshig mdzod chen mo*, s.v. *spar kha brgyad*, numbers them *lis, khod, dwa, khyen, kham, gin, zin, zon* — variants at 1, 2 and 4, recorded and not chosen.
Only the spelling of each member was taken from either, the fifth takeable fact in [scripts/tibetan-dictionary.mjs](../../scripts/tibetan-dictionary.mjs).
Das romanises two of the names differently, *dva* and *zan*, and prints no Tibetan script for the names themselves.

## The lunar mansions

### Which name belongs at which index

The engine computes an index, 0–26, and the question is which names belong there — a question of **sequence**, not of translation.

| # | Tibetan | Sanskrit | Sakaki entry | Das entry |
|---|---|---|---|---|
| 0 | *tha skar* | Aśvinī | 3213 | p. 563 |
| 1 | *bra nye* | Bharaṇī | 3214 | p. 894 |
| 2 | *smin drug* | Kṛttikā | 3187 | p. 991, as "the Pleiades", no Sanskrit |
| 3 | *snar ma* | Rohiṇī | 3188 | p. 770 |
| 4 | *mgo* | Mṛgaśiras | 3189 | p. 284 |
| 5 | *lag* | Ārdrā | 3190 | p. 1203 (gives Hastā *and* Ārdrā) |
| 6 | *nabs so* | Punarvasu | 3191 | p. 736 |
| 7 | *rgyal* | Puṣya | 3192 | p. 310, Sanskrit not read |
| 8 | *skag* | Āśleṣā | 3193 | p. 82, no Sanskrit |
| 9 | *mchu* | Maghā | 3194 | p. 435 |
| 10 | *gre* | Pūrvaphalgunī | 3195 | p. 248 |
| 11 | *dbo* | Uttaraphalgunī | 3196 (also *sbo*) | p. 913 |
| 12 | *me bzhi* | Hastā | 3197 | p. 972 |
| 13 | *nag pa* | Citrā | 3198 | p. 730 |
| 14 | *sa ri* | Svātī | 3199 | p. 1263 |
| 15 | *sa ga* | Viśākhā | 3200 | p. 1262 |
| 16 | *lha mtshams* | Anurādhā | 3201 | not read |
| 17 | *snron* | Jyeṣṭhā | 3202 | p. 773 |
| 18 | *snrubs* | Mūla | 3203 | p. 772 |
| 19 | *chu stod* | Pūrvāṣāḍhā | 3204 | not read |
| 20 | *chu smad* | Uttarāṣāḍhā | 3205 | not read |
| 21 | *gro bzhin* | Śravaṇā | 3206 | p. 249 |
| (21) | *byi bzhin* | Abhijit, not in the 27 | 3207 | p. 887 |
| 22 | *mon gre* | **Dhaniṣṭhā**, but Sakaki **Śatabhiṣā** | 3208 | p. 976, as *mon-dre* धनिष्ठा |
| 23 | *mon gru* | **Śatabhiṣaj**, but Sakaki **Dhaniṣṭhā** | 3209 | p. 976, शतभिषा |
| 24 | *khrums stod* | Pūrvabhādrapadā | 3210 | p. 173 |
| 25 | *khrums smad* | Uttarabhādrapadā | 3211 | p. 173 |
| 26 | *nam gru* | Revatī | 3212 | p. 738 |

Henning's Appendix I (pp. 356–357) gives the same 27 with the same indices, Śravaṇa and Abhijit both at 21.
He notes that some sources give *gro bzhin* for Abhijit rather than Śravaṇa, and follows the Vimalaprabhā; the Mahāvyutpatti agrees with him.

**The Tibetan at every index is settled by a Tibetan astronomical ordering that carries no Sanskrit.**
Jäschke p. 111, s.v. *rgyu-skar*, lists the mansions "acc. to Wdk. and others" — presumably the *Vaiḍūrya dkar po*, not checked against his list of abbreviations — numbered in Tibetan numerals **from ༠**, the engine's own indexing: ༠ *ta-skar* … ༢༡ *gro-bzhin* and *byi-bzhin* "(considered as one constellation)", ༢༢ *mon-gre, mon-dre*, ༢༣ *mon-gru, sgrog* … ༢༦ *nam-gru*.
The Mahāvyutpatti puts *mon gre* 22nd and *mon gru* 23rd as well, so no witness disagrees about the Tibetan.

**The Sanskrit at 22 and 23 is a genuine disagreement, and it is in the printed Mahāvyutpatti.**
Sakaki prints 3208 (22) *Çata-bhiṣā* — *Mon-gre, Mon-dre* and 3209 (23) *Dhaniṣṭhā* — *Mon-gru*.
Mironov prints the Sanskrit in the same order, with no variant reading noted: श्रवणाः ।२० अभिजित् ।२१ शतभिषा ।२२ धनिष्ठा ।२३ (p. 47, §१६५).
So the order is the Mahāvyutpatti's own and not a slip of one edition, though the two are not shown to be independent: Sakaki's edition is the later, and may have used Mironov's.
Mironov carries no Tibetan, so he attests the Sanskrit **order** only; the pairing of *mon gre* with Śatabhiṣā rests on Sakaki.
Against it: Henning, Das p. 976, and the Indian order Monier-Williams states — Śravaṇa "the 20th (or 23rd) Nakṣatra" (p. 1097), Dhaniṣṭhā "24th lunar mansion" (p. 509) — all put Dhaniṣṭhā directly after Śravaṇa.
Two cautions on weighing them.
The Mahāvyutpatti is the stronger authority for which Tibetan word translates which Sanskrit word, being the 9th-century translators' own glossary.
And Henning and Das cannot be shown to be independent of each other: Henning names a source only for the *gro bzhin* question, and Das cites Jäschke and, for these two entries, a source he abbreviates *Rtsii.*, so they count as one witness, not two.
Monier-Williams' order is Indian astronomy's, not a Tibetan source's.

**Decided by Andreas on 2026-09-15: Dhaniṣṭhā at 22 and Śatabhiṣaj at 23, following Das.**
`sanskritName` names the mansion at a computed position, so it follows the order that fixes the position: the Tibetan ordering puts *mon gre* at 22, and Indian order puts Dhaniṣṭhā directly after Śravaṇa.
A glossary's list order is not an order of mansions in the sky, so the Mahāvyutpatti's is recorded here as its own attested order, not as an error and not as the pairing that ships.
The **spelling** of 23 is still to settle: Das prints शतभिषा *śatabhiṣā*, as the Mahāvyutpatti does, and Henning *Śatabhiṣaj*.

### The English: none ships

Decided by Andreas on 2026-09-15: **`LunarMansion` carries no `englishName`.**
It will carry `index`, `tibetanName`, `sanskritName` and `element`.

The table below is the research behind that decision: for each mansion, what the public-domain dictionaries print that could have served as an English name.
**P** is printed for this word; **C** is composed from the name's parts, with "(unread)" where a part's entry was not read; **—** means the dictionary prints only "n. of a lunar mansion" or "N. of a Nakṣatra".
J is Jäschke, D is Das, MW is Monier-Williams.

| # | Tibetan | Sanskrit | 1. Sanskrit word sense (MW) | 2. Tibetan word sense (J / D) | 3. Stars or figure |
|---|---|---|---|---|---|
| 0 | tha skar | aśvinī | P aśvin "possessed of horses" p. 116 | — (J p. 226 "a certain star"; D p. 563) | "three stars in the Ram's head" J p. 111; "the head of Aries" MW p. 116; "a woman on horseback" D p. 563 |
| 1 | bra nye | bharaṇī | P bharaṇa "bearing, maintaining" p. 747 | — (J p. 379; D p. 894) | "the image of the yoni" J p. 111; "figured by the pudendum muliebre" MW p. 747 |
| 2 | smin drug | kṛttikā | — p. 304 | P "the Pleiades" J p. 427; C smin-pa "to ripen" J p. 427 + drug (unread) | "the Pleiades" J p. 111, D p. 991, MW p. 304; "a flame or else … a razor or knife" D p. 991 |
| 3 | snar ma | rohiṇī | P "a red cow" p. 890 | — (D p. 770) | "five stars … the figure of a chariot" D p. 770 |
| 4 | mgo | mṛgaśiras | P "figured by an antelope's head" p. 828 (a figure, not a word sense) | P "1. head" J p. 90 | "stars resembling head of an antelope" D p. 284; "λ Orionis" MW p. 828 |
| 5 | lag | ārdrā | P ārdra "wet, moist, damp" p. 152 | P "1. hand, arm" J p. 541 | — |
| 6 | nabs so | punarvasu | P "'restoring goods'" p. 634 | — (J p. 303; D p. 736) | — |
| 7 | rgyal | puṣya | P "nourishment" p. 640 | P "1. victory" J p. 108 | — |
| 8 | skag | āśleṣā | P ā-śleṣa "intimate connection, contact" p. 159 | P "an evil star. 2. mischief; bad luck" D p. 82 | — |
| 9 | mchu | maghā | P magha "a gift, reward, bounty" p. 772 | P "1. lip" J p. 165 | "with Regulus its brightest star" J p. 111, D p. 316 |
| 10 | gre | pūrvaphalgunī | P "'the first Phalgunī'" p. 643; phalguna "reddish, red" p. 718 | — (J p. 78; D p. 248) | — |
| 11 | dbo | uttaraphalgunī | C uttara (unread) + phalguna "reddish, red" p. 718 | — (D p. 913); J p. 389 has an unrelated sense 2, "the belly-side of fur" | — |
| 12 | me bzhi | hasta | P "the hand" p. 1294 | — (D p. 972); C me + bzhi (unread) | — |
| 13 | nag pa | citrā | P citra "conspicuous, excellent, distinguished" p. 396 | P "black" J p. 300 | "with Spica" J p. 111, D p. 316; "Spica virginis" MW p. 396 |
| 14 | sa ri | svāti | — "of unknown derivation" p. 1283 | — (J p. 570; D p. 1263) | "the star Arcturus" MW p. 1283 |
| 15 | sa ga | viśākhā | P vi-śākha "branched, forked" p. 952 | — (J p. 570; D p. 1262) | "figured by a decorated arch" MW p. 952 |
| 16 | lha mtshams | anurādhā | — p. 37; C anu + rādhā (unread) | C lha + mtshams (unread) | "described as a line of oblations" MW p. 37 |
| 17 | snron | jyeṣṭhā | P jyeṣṭha "most excellent, pre-eminent, first, chief" p. 426 | — (J p. 320; D p. 773) | "with Antares" J p. 111, D p. 316 |
| 18 | snrubs | mūla | P "a root" p. 826 | — (J p. 320; D p. 772) | — |
| 19 | chu stod | pūrvāṣāḍhā | C pūrva (unread) + a-ṣāḍha "not to be overcome, invincible" p. 116 | C chu + stod (unread) | — |
| 20 | chu smad | uttarāṣāḍhā | C uttara (unread) + a-ṣāḍha p. 116 | C chu + smad (unread) | — |
| 21 | gro bzhin | śravaṇa | P "the act of hearing" p. 1096, but MW files the nakṣatra under the homonym "limping, lame" p. 1097 | — (D p. 249); C gro + bzhin (unread) | "containing the three stars α, β …" MW p. 1097 |
| 22 | mon gre | dhaniṣṭhā | P dhaniṣṭha "very swift" p. 509 | — (D p. 976, as *mon-dre*) | — |
| 23 | mon gru | śatabhiṣaj | C śata "a hundred" p. 1048 + bhiṣaj "curing, healing" p. 757 | — (D p. 976) | — |
| 24 | khrums stod | pūrvabhādrapadā | P proṣṭhapada "'the foot of a stool'" p. 714; bhadra "blessed, auspicious" p. 745 | — (D p. 173); C khrums + stod (unread) | — |
| 25 | khrums smad | uttarabhādrapadā | as 24 | — (D p. 173); C khrums + smad (unread) | "figured by a conch, and comprehending two stars, of which one is Andromeda" D p. 173 |
| 26 | nam gru | revatī | P revat "wealthy, opulent, rich" p. 888 | — (D p. 738); C nam + gru (unread) | "two elliptical groups of thirty-two stars" D p. 738 |

Rows 22 and 23 give the Sanskrit in the Henning and Das pairing; the Mahāvyutpatti's swaps them, as above.

**What the table shows, and why no column became `englishName`.**

1. **No source prints an English name for a mansion.**
   All three dictionaries give "n. of a lunar mansion" or "N. of a Nakṣatra"; every candidate above is either a sense of the word or a description of the stars.
2. **Column 1 is the fullest — 19 of 27 printed — and pairs English with a Tibetan name it does not render.**
   *mchu* "lip" would sit beside "a gift, reward, bounty", and *nag pa* "black" beside "conspicuous, excellent".
   That is the failure [2026-08-25-rabjung-ships-the-tibetan-name-only.md](../decisions/2026-08-25-rabjung-ships-the-tibetan-name-only.md) refuses: a type that silently pairs a Tibetan name with a name it does not translate.
   Some senses would also read as nonsense for a mansion — *dhaniṣṭha* "very swift", and Śravaṇa filed under "limping, lame".
3. **Column 2 is printed for 7 of 27.**
   Most Tibetan mansion names are words with no other sense in either dictionary, and where one exists it rarely matches the Sanskrit: *lag* "hand" at Ārdrā "moist", while the mansion whose Sanskrit means "hand", Hastā, is *me bzhi*.
4. **Column 3 covers 14 of 27** and describes stars rather than translating a name, so it is not what `englishName` means.
   If it ever ships it belongs in a field of its own.
5. **A mansion does not need an English key.**
   The trigram did, because its key is a string and internationalisation needs that string in English; a mansion is keyed by `index`, which is language-neutral.
6. **Adding `englishName` later breaks nobody; removing it would break everyone.**

Rejected before the table was built: the Sanskrit name itself as English usage writes it (*Hasta*, *Rohini*).

## Still open

- **The Sanskrit spellings**, which the verifier settles as it did for the months: at 23 *śatabhiṣā* (Das, the Mahāvyutpatti) against *Śatabhiṣaj* (Henning), and the forms Sakaki and Monier-Williams head differently elsewhere.
- **The THL phonetics** for the eight trigram names and the 27 mansion names, from THL's converter as for the shipped vocabulary.
- **The unread parts in column 2**, marked (unread) above; they decide nothing now, since no column ships.
- **The verifier** that carries all of this as data and fails when a source moves, in the pattern of `verify:month-and-yoga-names`.
