# How the shipped phonetics are produced

**Status: checked.**
Most claims below are held by a script or a test named beside it.
Two rest on evidence kept outside the repository: that 114 of the 123 multi-syllable names are headwords whole, and the comparison with the Lotsawa House tool's *mitrö*.
The phonetic of a multi-syllable name is **THL's** output from its converter in the "Words separated by" mode, with eleven recorded corrections of it.
Nothing in this document is a second source for a phonetic; it records the method, and what to change where.
The decision it rests on is [decisions/2026-11-15-phonetics-by-word.md](../decisions/2026-11-15-phonetics-by-word.md).

## How a phonetic is produced

Five verifiers emit the name fixtures: `verify:names`, `verify:rabjung-names`, `verify:month-and-yoga-names`, `verify:mansion-and-trigram-names` and `verify:observance-names`.
They share `scripts/thl.mjs` for the phonetics, so a Wylie is marked the same way on every surface.

1. The Wylie is **marked**: its syllables are separated by a space, and where a name holds more than one word the words are parted by a hyphen.
   `sa ga zla ba dus chen` is marked `sa ga-zla ba-dus chen`.
2. THL's converter is asked for that marked text with `words=sep` and `sep_join=-`.
   It joins the syllables of each word, parts the words with a space, and returns the phonetic: *saga dawa düchen*.
3. Each word is **gated**: it must exist in a dictionary the project accepts.
4. If a correction is recorded for the name, and THL still returns the value the correction expects, the corrected value is shipped.
   The fixture row then carries `thlPhonetic` and `phoneticCorrected: true` beside the shipped `phonetic`.
5. The verifier writes the fixture, and a test holds `src/` to it.

## The boundary rule

- A name of **one syllable** has no boundary to decide.
- A name of **two syllables** is one word and needs no row: *nyi ma* is *nyima*.
- A name of **three or more syllables** needs a row in `scripts/word-boundaries.data.json`, holding the marking and the ruling that decided it.
  There are 32 such names among the 123 distinct multi-syllable names shipped (re-measured 2026-11-15); the other 91 have two syllables.

The boundary file is **authored** and the rulings are Andreas'.
A row looks like this:

```json
"sa ga zla ba dus chen": {
  "marked": "sa ga-zla ba-dus chen",
  "ruling": "Andreas, 2026-11-15"
}
```

`test/word-boundaries.test.ts` fails for a name of three or more syllables without a row, for a row naming no shipped name, for a marking that does not unmark to its Wylie, and for a row without a ruling.
It also pins each row's ruling date and the rows that carry a `gateException`.
It guards the file against `src/` and is not evidence for any boundary: where a word ends is a judgement, and no source in the project decides it.

## The gate

The gate answers whether a word exists, and **never where it ends**.
The dictionaries list phrases and single syllables alike (114 of the 123 multi-syllable names are headwords whole, counted outside the repository, and `nyi ma` and `nyi-ma` both pass a headword test), so a lookup cannot choose between two markings.

A word passes if any of these holds:

- It is an exact headword in the **Mahāvyutpatti**, the *tshig mdzod chen mo* or the *dung dkar tshig mdzod chen mo*.
  Jäschke and Das are not accepted: they are read elsewhere, for other checks.
- It is a headword after the `-pa`/`-ba` rung: the same word with a nominalising ending added or removed, so *bcu drug pa* is found under *bcu drug*.
  The rung is a rule of Tibetan spelling true of every word it touches; it changes what is looked up and nothing that is printed.
- It is a **member an enumerating entry spells**.
  The *tshig mdzod chen mo*'s entry for *'phrod sbyor* lists the ten yogas, and the month-and-yoga verifier reads their spellings from it.
- Its boundary row carries a recorded **`gateException`**: the word, the evidence, and the headwords the exception requires.
  The module re-checks those headwords on every run, so an exception that stops holding fails instead of lingering.

Six rows carry an exception, and the evidence differs:

| Row | Word | Evidence |
|---|---|---|
| `dus kyi pho nya` | *dus kyi* | The two-word phrase is no headword in the three dictionaries; the *tshig mdzod chen mo* has the whole name as a headword |
| `ston zla ra ba`, `ston zla 'bring po`, `ston zla tha chung` | *ston zla* | The dictionaries print the whole month name as a headword; *ston zla* alone is none, though the other three seasons' *zla* words are |
| `lha babs dus chen` | *lha babs* | The *dung dkar tshig mdzod chen mo* has the whole name as a headword, and the Rigpa Wiki passage for the düchen, read in a browser and supplied by Andreas, prints the same spelling; it is human-supplied and was never fetched by a script |
| `gso thub` | *gso thub* | A group label, not a headword: the closing sentence of the *tshig mdzod chen mo*'s *'phrod sbyor* entry groups the ten yogas as three good, three restorative, three bad and one worst, and the verifier re-reads that sentence on every run |

Each exception is Andreas' ruling of 2026-11-15, and a copyrighted dictionary's headword gates and is never quoted.

## The eleven corrections

A correction states the value it expects THL to return and the value to ship, with its evidence.
It refuses to run if THL no longer returns the expected value.
The first two (*karmapa*, *pandita*) are in `scripts/verify-observance-names.mjs`; *lhantsam* is in `scripts/verify-mansion-and-trigram-names.mjs`; *mintün*, *peln-gyur* and *topden* are in `scripts/verify-month-and-yoga-names.mjs`; *khyunchok*, *namgyur*, *namchang*, *yongdzin* and *lo-ngen* are in `scripts/verify-rabjung-names.mjs`.

| Shipped | THL returns | Name | Evidence |
|---|---|---|---|
| *gyelwang karmapa chudrukpa* | *gyelwang kama(?)pa chudrukpa* | `rgyal dbang karma pa bcu drug pa` | Andreas, 2026-11-11: sure of *karmapa*; THL marks its own *kama(?)pa* |
| *sakya pandita* | *sakya pandi(?)ta* | `sa skya paN+Di ta` | Andreas, 2026-11-11: sure of *pandita*; THL marks its own *pandi(?)ta* |
| *lhantsam* | *lhamtsam* | `lha mtshams` | Andreas, 2026-11-15: *lhantsam* |
| *mintün* | *mimtün* | `mi mthun` | Andreas, 2026-11-15: *mintün* |
| *peln-gyur* | *pengyur* | `'phel 'gyur` | Andreas, 2026-11-15: *peln-gyur*; the hyphen is deliberate, and separates the n from the g because the sound is not the *ng* a reader would otherwise take them for |
| *topden* | *tonden* | `stobs ldan` | Andreas, 2026-11-15: *topden* |
| *khyunchok* | *khyumchok* | `khyu mchog` | Andreas, 2026-11-15, policy P1 below |
| *namgyur* | *nangyur* | `rnam 'gyur` | Andreas, 2026-11-15, policy P3 below: a nasal final is kept; his earlier approval of THL's *nangyur* was given before he heard it and is withdrawn |
| *namchang* | *nanchang* | `rnam 'phyang` | Andreas, 2026-11-15, policy P3 below |
| *yongdzin* | *yondzin* | `yongs 'dzin` | Andreas, 2026-11-15, policy P3 below |
| *lo-ngen* | *longen* | `blo ngan` | Andreas, 2026-11-15: *longen* can be read *lon-gen*, so *lo-ngen* separates the syllables |

The corrections are Andreas' hearing of Central Tibetan and are marked as his: nothing in a dictionary or in THL's code states them.
`gdong ngan` stays *dongngen*, a plain join that cannot be read two ways.

## THL's nasal rules

THL's converter has an option, `middle_nasals`, documented in its code as nasalizing a-chungs in subsequent syllables, as in `mkha' 'gro'` becoming *kan dro*.
It is **on** in THL's own scheme and **off** in the Padmakara and Rigpa schemes of the same code, which is why the Lotsawa House tool, in its Padmakara mode, gives *mitrö* where THL gives *mintrö*.
The converter's web form does not expose the option, so a verifier cannot switch it off, and the instrument that generated a phonetic is part of the claim.

Inside one word, the converter looks at the spelling of the **next** syllable, and in three cases changes the one before it.
In each case it looks only at the spelling and not at the sound that follows:

1. **The next syllable has an a-chung prefix** (`'`): the previous syllable's final is replaced by *n*, or by *m* before *b* or *ph*.
2. **The next syllable has an `m` prefix**: the previous syllable gains an *m*, unless it already ends in *m*, *n* or *ng*.
   No assimilation to the following consonant is applied.
3. **The next syllable begins `ld`, `lt`, `lj` or `zl`**: the previous syllable gains an *n*, unless it already ends in a nasal.
   A final that is not a nasal is replaced, so *stobs ldan* gives *tonden*.

The rules were read on 2026-11-15 from THL's published code, `lib/Lingua/BO/Phonetics.pm`, option `middle_nasals`.
The code is third-party and is not in the repository; [scripts/evidence/thl-middle-nasals/](../../scripts/evidence/thl-middle-nasals/README.md) says which download it was, by URL, size and SHA-256.

## The policy

Andreas ruled on 2026-11-11 and 2026-11-15, name by name, which of THL's outputs to keep and which to correct.
The policy is what those rulings share, so a correction is a rule's consequence and a new name is not argued afresh.
**P0:** THL's output ships unchanged unless P1, P2 or P3 applies or Andreas rules a correction for the name.

- **P1, an `m` prefix assimilates.**
  Where THL adds an *m* before a syllable with an `m` prefix, the *m* becomes *n* before a non-labial onset (*ch*, *ts*, *th* and the like) and stays before a labial (*p*, *b*, *ph*): *lhantsam*, *mintün*, *khyunchok*.
- **P2, a kept pronounced final plus an added `n` before `g` is hyphenated.**
  The hyphen stops the pair being read as *ng*: *peln-gyur*.
- **P3, a silent final may be replaced by THL's `n`; a pronounced or nasal final is kept.**
  *chos*, *bdud*, *gser*, *myos*, *dpyid* and *dbyar* lose a final that is silent in Central Tibetan, as THL has it: *chönkhor*, *dünjom*, *senchang*.
  *'phel* and *stobs* have a pronounced final, which is kept: *peln-gyur*, *topden*.
  A nasal final (*m*, *ng*) is kept too, and THL's replacement of it by *n* is corrected: *namgyur*, *namchang*, *yongdzin*.
  Andreas first approved THL's *nangyur* on 2026-11-15, before he had heard it, and withdrew that after hearing the three.

## The rulings file

`scripts/nasal-rulings.data.json` holds one row for every shipped name with a junction that meets one of the three rules, and is the table of record: its 28 rows are not repeated here, because a copy would drift.
Each row gives the rule, the phonetic shipped, the disposition (`thl` or `corrected`) and the ruling.
20 dispositions are THL's output and 8 are corrected; the file is authored, and no row is evidence.

```json
"khyu mchog": { "rule": 2, "shipped": "khyunchok", "disposition": "corrected", "ruling": "Andreas, 2026-11-15" }
"rnam 'gyur": { "rule": 1, "shipped": "namgyur", "disposition": "corrected", "ruling": "Andreas, 2026-11-15" }
"kun ldan":   { "rule": 3, "shipped": "künden", "disposition": "thl", "ruling": "Andreas, 2026-11-15" }
```

`test/nasal-rulings.test.ts` fails for a name with a junction and no row, for a row naming no junction or the wrong rule, for a shipped value that differs from the row, and for a disposition other than the two.
It repeats the three rules' shapes, so a fourth rule added by THL would go unseen; the evidence folder above says which code to re-read.

## What this does not claim

- That the phonetics are a rendering of spoken Lhasa Tibetan: they are THL Simplified Phonetic Transcription, which is a published standard and not the house rendering used in prose.
- That a boundary or a correction is **sourced**: each is Andreas' ruling, recorded with its date, and the gate shows only that every word exists.
- That THL's code has no other rule that changes a syllable by the one beside it: three were read.
