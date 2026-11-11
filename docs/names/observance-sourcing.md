# Sourcing the Tibetan names of fourteen observances

**Status: proposed, written ahead of the code.**
It records what will be checked and what ships if a check fails, before the verifier that enforces it exists.
That verifier will be `scripts/verify-observance-names.mjs`, and its output `test/fixtures/observance-names.ts`.
It follows [month-and-yoga-sourcing.md](month-and-yoga-sourcing.md), and the rule it inherits from [validation-sources.md](../validation-sources.md): **agreement is only evidence if the source did not reach its answer the way we did.**

**Nothing below has been checked yet.**
The Tibetan spellings in the tables are proposals from the author's own knowledge, put here so that a verifier has something to test, and **they are not evidence**.
A spelling that fails a check does not ship, whatever this page says.

## What ships

The shipped example configuration ([observances.md](../observances.md)) gives a `tibetanName` — script, Wylie and THL phonetics, all three — to **fourteen** of its rules, and to no others.
Every other rule — the Medicine Buddha and Tārā pujas, Heruka Day, Ḍākinī Day and Dharma Protector Day — is **English only**: their names are descriptive or composed here, not headwords, and a composed Tibetan name is not shipped unmarked ([CLAUDE.md](../../CLAUDE.md): a shipped name is printed by a source, or marked authored).

### The seven observances

| Rule | English name | Proposed Wylie | Proposed script | Word boundaries marked | THL phonetics, joined by word |
|---|---|---|---|---|---|
| `chotrul-duchen` | Day of Miracles | `cho 'phrul dus chen` | ཆོ་འཕྲུལ་དུས་ཆེན | `cho 'phrul-dus chen` | *chontrül düchen* |
| `saga-dawa-duchen` | Lord Buddha's birth, enlightenment and parinirvana | `sa ga zla ba dus chen` | ས་ག་ཟླ་བ་དུས་ཆེན | `sa ga-zla ba-dus chen` | *saga dawa düchen* |
| `chokhor-duchen` | Lord Buddha's first teaching | `chos 'khor dus chen` | ཆོས་འཁོར་དུས་ཆེན | `chos 'khor-dus chen` | *chönkhor düchen* |
| `lhabab-duchen` | Lord Buddha's descent from God Realm of Thirty Three | `lha babs dus chen` | ལྷ་བབས་དུས་ཆེན | `lha babs-dus chen` | *lhabap düchen* |
| `saga-dawa-month` | Saga Dawa, Lord Buddha's month | `sa ga zla ba` | ས་ག་ཟླ་བ | `sa ga-zla ba` | *saga dawa* |
| `sojong` | Sojong (vow renewal) | `gso sbyong` | གསོ་སྦྱོང | `gso sbyong` | *sojong* |
| `fire-puja` | Fire puja | `sbyin sreg` | སྦྱིན་སྲེག | `sbyin sreg` | *jinsek* |

### The seven anniversaries

Decided by Andreas on 2026-11-11: the seven lineage anniversaries are **named as FPMT's calendar prints them**, carry the label `anniversary`, and ship a Tibetan name for the person.
The English names are FPMT's labels verbatim — each is a label in its fixture, so they are **cited**, not authored.
The label says only that the day commemorates the person; it does not say whether it is a birth or a passing, and neither does FPMT.

| Rule | English name (FPMT's label) | Proposed Wylie | Proposed script | Word boundaries marked | THL phonetics, joined by word |
|---|---|---|---|---|---|
| `milarepa` | Milarepa | `mi la ras pa` | མི་ལ་རས་པ | `mi la ras pa` | *milarepa* |
| `guru-rinpoche` | Guru Rinpoche | `gu ru rin po che` | གུ་རུ་རིན་པོ་ཆེ | `gu ru-rin po che` | *guru rinpoché* |
| `gampopa` | Gampopa | `sgam po pa` | སྒམ་པོ་པ | `sgam po pa` | *gampopa* |
| `karmapa-16` | Sixteenth Karmapa | `rgyal ba karma pa bcu drug pa` | རྒྱལ་བ་ཀརྨ་པ་བཅུ་དྲུག་པ | `rgyal ba-karma pa-bcu drug pa` | *gyelwa karmapa chudrukpa* (a correction: THL returns *gyelwa kama(?)pa chudrukpa*) |
| `tsongkhapa` | Lama Tsong Khapa | `rje tsong kha pa` | རྗེ་ཙོང་ཁ་པ | `rje-tsong kha pa` | *jé tsongkhapa* |
| `sakya-pandita` | Sakya Pandita | `sa skya paN+Di ta` | ས་སྐྱ་པཎྜི་ཏ | `sa skya-paN+Di ta` | *sakya pandita* (a correction: THL returns *sakya pandi(?)ta*) |
| `dudjom-rinpoche` | Dudjom Rinpoche | `bdud 'joms rin po che` | བདུད་འཇོམས་རིན་པོ་ཆེ | `bdud 'joms-rin po che` | *dünjom rinpoché* |

The last column in both tables is what THL's converter returned on 2026-11-11 for the marked Wylie in "Words separated by" mode; the verifier must reproduce it, and a different result is a finding.

**Two of THL's results carry its own uncertainty marker, "(?)":** *kama(?)pa* and *pandi(?)ta*.
THL's converter page says its output cannot be 100% accurate and that someone who understands the text should check it.
Andreas checked them on 2026-11-11 and is sure of *karmapa* and *pandita*, so **these two phonetics are corrections to THL's output**, not THL's output.
They are held as data in the verifier, in the pattern of the other corrections in this project ([CLAUDE.md](../../CLAUDE.md)): each states the value THL is expected to return (*gyelwa kama(?)pa chudrukpa* and *sakya pandi(?)ta*) and the value it is corrected to, and **the run refuses if THL no longer returns the expected value**, so a correction cannot outlive its reason.
The evidence for each is Andreas' own knowledge of the pronunciation, which is a witness of a different kind from a dictionary, and the record says so rather than presenting it as sourced.
Nothing else is corrected: the other twelve phonetics are THL's output unchanged.

**Open spelling questions the checks must settle, not this page:**

- Whether the Day of Miracles is spelled `cho 'phrul` or `chos 'phrul` in the dictionaries.
- Whether the Saga Dawa festival is `sa ga zla ba dus chen` or carries the genitive, `sa ga zla ba'i dus chen`.
- Whether each compound is a headword in its own right or only its last part is (`dus chen`), in which case the name ships only if the head word is found and the sense is read.
- Whether FPMT's "Lama Tsong Khapa" should be `rje tsong kha pa` (the lord) or carry `bla ma` in the Tibetan, and whether the Sixteenth Karmapa is attested as `rgyal ba karma pa bcu drug pa` or by his personal name.

## Sources, and what each is trusted for

The same sources the other name verifiers already read, through [scripts/tibetan-dictionary.mjs](../../scripts/tibetan-dictionary.mjs) and the public aggregate it reads from.

| Source | Standing | Trusted for |
|---|---|---|
| **Jäschke**, *A Tibetan-English Dictionary* (1881) | Public domain, quotable by page | That a headword exists and its sense |
| **Das**, *A Tibetan-English Dictionary* (1902) | Public domain, quotable by page; **partly dependent** on the canonical lexicons | The same; corroboration, not a second witness, where it agrees with the Mahāvyutpatti |
| **Mahāvyutpatti** महाव्युत्पत्ति | Public domain; independent of Janson and Henning | Whether a term is attested with a Sanskrit counterpart (for *sojong*, *poṣadha*) |
| **Monier-Williams** (1899), via the Cologne scan, read with `entriesHeadedBy` | Public domain | The Sanskrit sense where one is cited |
| ***tshig mdzod chen mo***, ***dung dkar tshig mdzod chen mo*** | Copyrighted: **gate only** | That a headword exists; never quoted |
| THL's own phonetics converter | A published standard | The `phonetic` field |

**For the seven persons a further source is needed, and the Buddhist Digital Resource Center was accepted for it on 2026-11-11.**
The public-domain dictionaries are from 1881 and 1902, so they can carry the historical figures — Milarepa, Guru Rinpoche, Gampopa, Sakya Pandita, Tsong Khapa — but **cannot carry the two modern ones**, the Sixteenth Karmapa (1924–1981) and Dudjom Rinpoche (1904–1987).
The natural witness for a person's name in Tibetan script is a biographical authority, and the Buddhist Digital Resource Center's person records are accepted as it; **whether they are available to the verifier, and what they state for each of the seven, has not been checked** and is the first thing the verifier's author does.
If a modern person's name cannot be attested by two sources, it ships English only.

## The checks

Every one of the fourteen names must pass all of them, or it ships **English only**:

1. **Script from two independent converters.**
   `jsewts` and `tibetan-ewts-converter`, resolved from a scratch directory outside the repository, produce identical script from the Wylie.
2. **A round trip.**
   The script converts back to the Wylie it came from.
3. **A headword in at least two public-domain sources**, for the whole term or, for a compound, for its head word, with the page or entry cited; **for a person, a biographical authority and one published source naming the person with that spelling**, as above.
   Where two sources are not independent (Das against the Mahāvyutpatti) they count as one witness.
4. **The sense is read, not the presence.**
   A headword's entry must state the calendar, ritual or biographical sense, not merely exist: `dus chen` and `zla ba` have other senses, and the homograph trap is the one [month-and-yoga-sourcing.md](month-and-yoga-sourcing.md) records.
5. **THL phonetics from the converter's word-separated mode, with the word boundaries marked** (Andreas, 2026-11-11), as in the tables: "Words separated by" joins the syllables of each word and applies THL's own sandhi (*chönkhor*, *chontrül*), where the syllable-by-syllable mode the other shipped names use gives "so jong" and "dü chen".
   **The boundaries are a judgement, so they are checked**: each marked word must be a headword (or part of one) found by check 3, and a boundary placed wrongly is silent — `sa ga zla ba'i dus chen` marked as one word gives "sagandawé düchen".
   **A phonetic containing THL's "(?)" marker fails this check, unless a recorded correction (the two above) replaces it.**
   These fourteen are the first shipped names to use this mode; the other 97 stay spaced until the surface-wide roadmap item lands, so for now the package is inconsistent on purpose.

The verifier refuses to emit if any check fails, and a check placed after the emit gate cannot fail the run, so each is placed above it and proved by mutation of its **input**, with an unmutated control.

## What this record does not claim

- That any of the fourteen names is *correct* Tibetan: it claims only that a name which passes the checks is attested by the sources named, in the form given.
- That the English names for the observances are translations. They are cited to FPMT's calendar labels or to Cornu's *Tibetan Astrology*, or marked authored, as [observances.md](../observances.md) records.
- That the two corrected phonetics are THL's: they are Andreas' corrections of THL's output, and the verifier says so.
- That an anniversary is a birth or a passing. The `anniversary` label does not say, and FPMT does not either; an event type could be added later as a further label.
- That a Tibetan teacher agrees with the choice of name for a festival. Whether centres use these spellings, and the established Tibetan headings for the three levels, are questions for a teacher.

## For Andreas to approve

1. The fourteen rules above are the only ones that ship a Tibetan name.
2. The five checks, and that a name failing any of them ships English only.
3. That the spelling variants above are settled by the checks and not by this page.
4. **Decided 2026-11-11:** the two "(?)" phonetics are corrected to *gyelwa karmapa chudrukpa* and *sakya pandita*, as self-invalidating data (Andreas: "use karmapa and pandita; I am sure of this").
5. **Decided 2026-11-11:** the Buddhist Digital Resource Center's person records are the source for the persons' names, to be checked when the verifier is written.

## Results of the run

**Run of 2026-11-11 (`npm run verify:observance-names`): 5 of the 14 names passed all five checks, so the verifier refused to emit and `test/fixtures/observance-names.ts` does not exist.**
Which names ship English only is Andreas' decision; this section records what the sources say.

| Rule | 1 script | 2 round trip | 3 witnesses | 4 sense | 5 phonetics |
|---|---|---|---|---|---|
| `chotrul-duchen`, `saga-dawa-duchen`, `chokhor-duchen`, `lhabab-duchen` | pass | pass | **fail** | pass | pass |
| `saga-dawa-month` | pass | pass | pass | pass | pass |
| `sojong` | pass | pass | pass | pass | pass |
| `fire-puja` | pass | pass | **fail** | pass | pass |
| `milarepa` | pass | pass | pass | pass | pass |
| `guru-rinpoche` | pass | pass | **fail** | pass | pass |
| `gampopa` | pass | pass | pass | pass | pass |
| `karmapa-16` | pass | pass | **fail** | not read | pass (corrected) |
| `tsongkhapa` | pass | pass | **fail** | not read | pass |
| `sakya-pandita` | pass | pass | pass | pass | pass (corrected) |
| `dudjom-rinpoche` | pass | pass | **fail** | not read | pass |

### A finding about the sources, which changed the check

**The aggregate's Jäschke and Das indexes are not evidence that a headword is printed.**
The Jäschke index lists *bdud 'joms rin po che* at a page of a book published in 1881, and lists *gu ru rin po che* at p. 69, where the page image prints only *gú-ru*, "spiritual teacher".
The earlier verifiers use those indexes to re-check a page that was read from an image, which stays sound; used as a headword test they overstate.
So a Jäschke witness here is a row read from the page image and carried as data, and the index is used only to re-check its page to within two.
Das has no such rows, so **Das is not counted as a witness**; its index lists *sbyin sreg* (p. 940), and no page was read.

### Jäschke pages read (archive.org `tibetanenglishdi00jsuoft`, image n = printed page + 25)

- p. 255, *dus-čén* under *dus* (Comp.): "festival".
- p. 161, *čo-ʼprúl*: "magical trick, jugglery" — states no festival sense.
- p. 163, *čos-ʼkór* under *čos* (Comp.): "prayer-mill" — **not** the wheel of the teaching, so Jäschke does not support the *chos 'khor* of *chos 'khor dus chen*; the homograph trap, found.
- p. 570, *sá-ga*: one of the lunar mansions, "and hence also n. of a month, part of March and April"; the same page prints *sa-skyá pandi-ta*, "a famous Lama, born 1180", a variant spelling of *sa skya paN+Di ta*.
- p. 490, *zlá-ba*: "moon … temporal moon or month".
- p. 590, *yso-sbyoń-ba* (*gso sbyong ba*; Jäschke prints *g* as *y*): "to get quit of sin by confession to a priest … a renewal of obligations".
- p. 69: no *gu ru rin po che*.

### The terms

- **The four düchens** fail check 3 on their head word: *dus chen* has Jäschke (p. 255) and no second public-domain witness (the Mahāvyutpatti lacks it; Das's index lists only the compound *dus chen dge ba 'bum 'gyur*).
  The whole terms: the *dung dkar* has *cho 'phrul dus chen* and *lha babs dus chen* as headwords (gate only, never a witness); no public-domain source has *sa ga zla ba dus chen*, *chos 'khor dus chen* or *lha babs dus chen*.
  *chos 'phrul* was not settled: the *tshig mdzod chen mo* and the Jäschke and Das indexes have *cho 'phrul*; *chos 'phrul* appears only in the Jäschke index.
  The genitive *sa ga zla ba'i dus chen* was not searched for; the spelling without it is what the checks above read.
- **`saga-dawa-month`** passes on its head word *zla ba*: Jäschke p. 490, and the Mahāvyutpatti pairs it with *māsa* (month) beside *soma*; Monier-Williams p. 814 prints *māsa* as "a month or the 12th part of the Hindū year".
  *sa ga* is Jäschke p. 570 and the Mahāvyutpatti's *viśākhā*.
- **`sojong`** passes: Jäschke p. 590 (*gso sbyong ba*) and the Mahāvyutpatti's *gso sbyong|poṣadhaḥ*.
  Monier-Williams does not head *poṣadha*, so its sense rests on the Mahāvyutpatti's pairing.
- **`fire-puja`** fails check 3: the Mahāvyutpatti pairs *sbyin sreg* with *homa* (Monier-Williams p. 1306: "oblation with fire"), and no Jäschke page was found; Das's index lists it unread.

### The persons, through BDRC

BDRC is reachable and states names mechanically: `https://purl.bdrc.io/resource/P…` answers with JSON-LD (`Accept: application/ld+json`), whose labels are Wylie (`bo-x-ewts`) with a trailing `/`.
It does **not** state the Tibetan script, only Wylie.
Its search needs a credential that its web page embeds, which this verifier does not use; the identifiers were found through Wikidata's BDRC property and each record is read from BDRC itself.
The check is that a name label equals the Wylie or opens with it as whole words.

| Rule | BDRC record | Names the record states that matter | Second source |
|---|---|---|---|
| `milarepa` | P1853 | `mi la ras pa` | *tshig mdzod chen mo* headword |
| `guru-rinpoche` | P4956 | `gu ru rin po che` | **none** (Jäschke prints only *gu-ru*) |
| `gampopa` | P1844 | `sgam po pa bsod nams rin chen` | *dung dkar* headword `sgam po pa` |
| `karmapa-16` | P865 | **no match**: `karma pa 16 pa`, `karma pa 16 rang byung rig pa'i rdo rje` | **none** |
| `tsongkhapa` | P64 | **no match** for `rje tsong kha pa`: `tsong kha pa blo bzang grags pa`, `rje rin po che blo bzang grags pa` | **none** (the *dung dkar* has `rje tsong kha pa blo bzang grags pa` and `tsong kha pa`, not the shorter whole) |
| `sakya-pandita` | P1056 | `sa skya paN+Di ta kun dga' rgyal mtshan` | *dung dkar* headword `sa skya paN+Di ta` |
| `dudjom-rinpoche` | P736 | **no match** for `bdud 'joms rin po che`: `bdud 'joms 'jigs bral ye shes rdo rje` | **none** |

The persons that pass do so with a gate-only headword as their second source, which the record allowed for a person ("one published source naming the person with that spelling") and which Andreas has not been asked about.
A second source that is public-domain exists for none of the seven.

### The corrections

Both expected values were returned by THL on this run, so both corrections stand.
The Sixteenth Karmapa: expected *gyelwa kama(?)pa chudrukpa*, corrected to *gyelwa karmapa chudrukpa*.
Sakya Pandita: expected *sakya pandi(?)ta*, corrected to *sakya pandita*.
Both are Andreas' corrections of 2026-11-11.
The other twelve phonetics are THL's output unchanged and equal the tables above; none carries "(?)".

### Proved by mutation

The served responses were altered one at a time, each against the unmutated run as control: THL returning *gyelwa karmapa chudrukpa* makes the run say "correction for karmapa-16 is no longer justified: it expects THL to return …"; THL returning *mila(?)repa* fails check 5 naming the marker; a BDRC record whose label reads *mi la ras ba* fails check 3 for `milarepa`.
The converter, round-trip and sense checks were not proved by mutation, and no run could emit, so the emitted fixture's byte-for-byte reproduction is untested.
