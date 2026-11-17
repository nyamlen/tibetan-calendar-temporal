# Sourcing the Tibetan names of fourteen observances

**Status: checked.**
The record was written ahead of the code and has been checked against it: `scripts/verify-observance-names.mjs` re-checks every claim below on each run, and its output is `test/fixtures/observance-names.ts`.
It follows [month-and-yoga-sourcing.md](month-and-yoga-sourcing.md), and the rule it inherits from [validation-sources.md](../validation-sources.md): **agreement is only evidence if the source did not reach its answer the way we did.**

The Tibetan spellings in the tables were proposals from the author's own knowledge and **were never evidence**; each ships only because the checks below found it attested.
A spelling that fails a check does not ship, whatever this page says.
What the run found, per name and per check, is under "Results of the run".

## What ships

The shipped example configuration ([observances.md](../observances.md)) gives a `tibetanName` — script, Wylie and THL phonetics, all three — to **fourteen** of its rules, and to no others.
Every other rule — the Medicine Buddha and Tārā pujas, Heruka Day, Ḍākinī Day and Dharma Protector Day — is **English only**: their names are descriptive or composed here, not headwords, and a composed Tibetan name is not shipped unmarked ([CLAUDE.md](../../CLAUDE.md): a shipped name is printed by a source, or marked authored).

### The seven observances

| Rule | English name | Wylie | Script | Word boundaries marked | THL phonetics, joined by word |
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

| Rule | English name (FPMT's label) | Wylie | Script | Word boundaries marked | THL phonetics, joined by word |
|---|---|---|---|---|---|
| `milarepa` | Milarepa | `mi la ras pa` | མི་ལ་རས་པ | `mi la ras pa` | *milarepa* |
| `guru-rinpoche` | Guru Rinpoche | `gu ru rin po che` | གུ་རུ་རིན་པོ་ཆེ | `gu ru-rin po che` | *guru rinpoché* |
| `gampopa` | Gampopa | `sgam po pa` | སྒམ་པོ་པ | `sgam po pa` | *gampopa* |
| `karmapa-16` | Sixteenth Karmapa | `rgyal dbang karma pa bcu drug pa` | རྒྱལ་དབང་ཀརྨ་པ་བཅུ་དྲུག་པ | `rgyal dbang-karma pa-bcu drug pa` | *gyelwang karmapa chudrukpa* (a correction: THL returns *gyelwang kama(?)pa chudrukpa*) |
| `tsongkhapa` | Lama Tsong Khapa | `rje tsong kha pa` | རྗེ་ཙོང་ཁ་པ | `rje-tsong kha pa` | *jé tsongkhapa* |
| `sakya-pandita` | Sakya Pandita | `sa skya paN+Di ta` | ས་སྐྱ་པཎྜི་ཏ | `sa skya-paN+Di ta` | *sakya pandita* (a correction: THL returns *sakya pandi(?)ta*) |
| `dudjom-rinpoche` | Dudjom Rinpoche | `bdud 'joms rin po che` | བདུད་འཇོམས་རིན་པོ་ཆེ | `bdud 'joms-rin po che` | *dünjom rinpoché* |

The last column in both tables is what THL's converter returned on 2026-11-11 for the marked Wylie in "Words separated by" mode; the verifier reproduces it on every run, and a different result is a finding.

**Two of THL's results carry its own uncertainty marker, "(?)":** *kama(?)pa* and *pandi(?)ta*.
THL's converter page says its output cannot be 100% accurate and that someone who understands the text should check it.
Andreas checked them on 2026-11-11 and is sure of *karmapa* and *pandita*, so **these two phonetics are corrections to THL's output**, not THL's output.
They are held as data in the verifier, in the pattern of the other corrections in this project ([verifiers.md](verifiers.md#corrections)): each states the value THL is expected to return (*gyelwang kama(?)pa chudrukpa* and *sakya pandi(?)ta*) and the value it is corrected to, and **the run refuses if THL no longer returns the expected value**, so a correction cannot outlive its reason.
The evidence for each is Andreas' own knowledge of the pronunciation, which is a witness of a different kind from a dictionary, and the record says so rather than presenting it as sourced.
Nothing else is corrected: the other twelve phonetics are THL's output unchanged.

## Spelling questions, settled

These were open when the record was written; the evidence has settled them, and nothing is awaiting a ruling.

- **`cho 'phrul` or `chos 'phrul`: `cho 'phrul`.**
  The *dung dkar* heads `cho 'phrul dus chen` as a whole term; the *tshig mdzod chen mo* and Jäschke (p. 161, *čo-ʼprúl*) head `cho 'phrul`; no accepted source heads `chos 'phrul`, which appears only in the Jäschke *index*, and the finding under Results is that the index is not evidence.
  The Rigpa Wiki page prints `cho 'phrul dus chen`.
- **`sa ga zla ba dus chen` and not the genitive.**
  No dictionary the verifier reads heads either form as a whole term.
  Andreas read the Rigpa Wiki page in his own browser: it prints the Tibetan *ས་ག་ཟླ་བ་དུས་ཆེན་* and the Wylie `sa ga zla ba dus chen`, **not** the genitive.
- **`chos 'khor dus chen` stands as printed.**
  The *tshig mdzod chen mo* heads `chos 'khor bskor ba'i dus chen`, and Jäschke (p. 163) prints `chos 'khor` as "prayer-mill"; but the Rigpa Wiki page prints the Tibetan *ཆོས་འཁོར་དུས་ཆེན་* and the Wylie `chos 'khor dus chen`, the whole term, as shipped.
- **Whether each compound is a headword in its own right.**
  `cho 'phrul dus chen` and `lha babs dus chen` are (in the *dung dkar*); the other two düchens are not headwords in any dictionary read, so the four pass on the head word *dus chen* and on the Rigpa Wiki passages.
- **FPMT's "Lama Tsong Khapa": `rje tsong kha pa` or a `bla ma` form.**
  Settled in item 8 under "For Andreas to approve": `rje tsong kha pa`.
- **The Sixteenth Karmapa's form** is settled in items 9 to 11 under "For Andreas to approve": `rgyal dbang karma pa bcu drug pa`, with two witnesses.

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

**For the seven persons a further kind of source is needed, and the Buddhist Digital Resource Center was accepted for it on 2026-11-11.**
The public-domain dictionaries are from 1881 and 1902, so they can carry the historical figures — Milarepa, Guru Rinpoche, Gampopa, Sakya Pandita, Tsong Khapa — but **cannot carry the two modern ones**, the Sixteenth Karmapa (1924–1981) and Dudjom Rinpoche (1904–1987).
The Buddhist Digital Resource Center's person records are accepted as a biographical authority; they are readable by the verifier and state Wylie names, not script.

**Andreas ruled on 2026-11-11, after the first run, on what may count as a witness:**

- **A headword of the *tshig mdzod chen mo* or the *dung dkar tshig mdzod chen mo* may count as a witness**, for a term and for a person.
  It stays gate only: the fact taken is that a headword exists, and nothing from either dictionary is quoted or stored.
  The two are one group, never two witnesses, because both are modern Tibetan–Tibetan compilations.
- **A person's name may not drop an honorific** (*rje*, *rgyal dbang*, *rin po che*).
  A witness must state the proposed spelling itself, equal to it or opening with it as whole words (BDRC's *sgam po pa bsod nams rin chen* states *sgam po pa*).
- **The Sixteenth Karmapa was first `rgyal ba karma pa bcu drug pa`, and is now `rgyal dbang karma pa bcu drug pa`** (Andreas, 2026-11-11, after the earlier form found one witness only).
  Both end in *karma pa bcu drug pa*, "the sixteenth Karmapa".
  BDRC's numeric *karma pa 16 pa* is not an acceptable spelling for the shipped name.

**Andreas approved these further witness types on 2026-11-11:**

- a **Lotsawa House** Tibetan page heading for the master, **and the title of a work's own page** there (for a person);
- a **Tibetan Wikipedia** article title (a redirect counts) or an item of its list of Tibetan scholars — a title and a list item are **one** group, being one site (for a person);
- a **published title naming the person with the exact spelling**, as a library catalogue records it: a **Google Books** record whose title opens with the spelling (for a person).
  It is a catalogue record, **not a headword**; it is read from the page's `<title>`, and what it shows is that a published work is titled with the name, not that any dictionary heads it;
- **Rigpa Wiki**, for a term, as a whole-term witness, by Andreas supplying four of its pages (the four düchens).
  Rigpa Wiki answers the verifier with a Cloudflare challenge (403), so the passages were **read in a browser and pasted by Andreas, and are held as data, not fetched**; see "The four Rigpa Wiki passages" under Results.
  Rigpa Wiki is wiki text whose lineage is not independent of THL-style transcriptions, so it counts as **one** group, and the dictionary head word is another.

A person passes with two independent groups stating the spelling, BDRC's record being the identity anchor (it must be the right person and carry the name's core).
A source that prints a near spelling — another honorific, a numeral, a different word division — is not a witness.
If a name cannot be attested by two groups, it ships English only, and Andreas decides.

## The checks

Every one of the fourteen names must pass all of them, or it ships **English only**:

1. **Script from two independent converters.**
   `jsewts` and `tibetan-ewts-converter`, resolved from a scratch directory outside the repository, produce identical script from the Wylie.
2. **A round trip.**
   The script converts back to the Wylie it came from.
3. **Two independent witnesses.**
   **A term:** its head word (the whole term where it is a single word), with the page or entry cited, in two of the groups: a Jäschke page read from the image, the Mahāvyutpatti's pairing, a headword of the *tshig mdzod chen mo* or *dung dkar* (gate only; both together are one group, per Andreas' ruling), and — for the four düchens — a Rigpa Wiki passage printing the whole term (one group; human-supplied, not fetched).
   Das counts only where a page was read, and none was.
   Das against the Mahāvyutpatti is one witness where both attest, since Das partly rests on the canonical lexicons.
   **A person:** two independent groups, each stating the **proposed spelling itself** — equal to it or opening with it as whole words, honorifics kept — from BDRC's person record, a gate-only headword, Lotsawa House (a master's heading or a work's title page; one group), Tibetan Wikipedia (title and list are one group), or a Google Books catalogue record whose title opens with it; BDRC's record must also be the right person.
   **There is no exception:** every name meets the same rule.
4. **The sense is read, not the presence.**
   A headword's entry must state the calendar, ritual or biographical sense, not merely exist: `dus chen` and `zla ba` have other senses, and the homograph trap is the one [month-and-yoga-sourcing.md](month-and-yoga-sourcing.md) records.
5. **THL phonetics from the converter's word-separated mode, with the word boundaries marked** (Andreas, 2026-11-11), as in the tables: "Words separated by" joins the syllables of each word and applies THL's own sandhi (*chönkhor*, *chontrül*), where syllable-by-syllable output gives "so jong" and "dü chen".
   **The boundaries are a judgement, so they are checked**: each marked word must be a headword exactly, or through the `-pa`/`-ba` rung on either side, in the Mahāvyutpatti or either Tibetan–Tibetan dictionary, or carry a recorded `gateException` in `scripts/word-boundaries.data.json` (the one case here is *lha babs*, whose whole-name headword and Rigpa Wiki passage are the evidence); the gate decides whether a word exists and never where a boundary falls, so a boundary placed wrongly is silent — `sa ga zla ba'i dus chen` marked as one word gives "sagandawé düchen".
   **A phonetic containing THL's "(?)" marker fails this check, unless a recorded correction (the two above) replaces it.**
   These fourteen were the first shipped names to use this mode; the other multi-syllable names followed on 2026-11-15, through the shared module `scripts/thl.mjs`, so every shipped multi-syllable phonetic is now THL's word-separated output.

The verifier refuses to emit if any check fails, and a check placed after the emit gate cannot fail the run, so each is placed above it and proved by mutation of its **input**, with an unmutated control.

## What this record does not claim

- That any of the fourteen names is *correct* Tibetan: it claims only that a name which passes the checks is attested by the sources named, in the form given.
- That the English names for the observances are translations. They are cited to FPMT's calendar labels, verbatim, or marked authored, as [observances.md](../observances.md) records; the three monthly-day names are authored, composed from dedications in Cornu's *Tibetan Astrology*.
- That the two corrected phonetics of the observance names are THL's: they are Andreas' corrections of THL's output, and the verifier says so.
  Nine further corrections of THL's output, ruled by Andreas on 2026-11-15, live in the other verifiers: four in the mansion and month-and-yoga verifiers (*lhantsam*, *mintün*, *peln-gyur*, *topden*) and five in the rabjung verifier (*khyunchok*, *namgyur*, *namchang*, *yongdzin*, *lo-ngen*), so eleven shipped phonetics in all are corrections.
- That an anniversary is a birth or a passing. The `anniversary` label does not say, and FPMT does not either; an event type could be added later as a further label.
- That a Tibetan teacher agrees with the choice of name for a festival. Whether centres use these spellings, and the established Tibetan headings for the three levels, are questions for a teacher.

## For Andreas to approve

1. The fourteen rules above are the only ones that ship a Tibetan name.
2. The five checks, and that a name failing any of them ships English only.
3. That the spelling variants above are settled by the checks and not by this page.
4. **Decided 2026-11-11:** the two "(?)" phonetics are corrected as self-invalidating data, to *gyelwang karmapa chudrukpa* (for the Karmapa's current form; first *gyelwa karmapa chudrukpa*) and *sakya pandita* (Andreas: "use karmapa and pandita; I am sure of this").
5. **Decided 2026-11-11:** the Buddhist Digital Resource Center's person records are the source for the persons' names, to be checked when the verifier is written.
6. **Decided 2026-11-11, after the first run:** a copyrighted-dictionary headword may count as a witness (gate only, one group); a person's name may not drop an honorific; BDRC's numeric Karmapa form is not a spelling that ships.
7. **Approved 2026-11-11:** Lotsawa House's Tibetan page headings and Tibetan Wikipedia's article titles and list of Tibetan scholars as witness types for a person's name.
8. **Decided 2026-11-11, Tsong Khapa: no change.**
   The Tibetan stays `rje tsong kha pa`, marked `rje-tsong kha pa`, and the phonetic stays *jé tsongkhapa*, which is what THL returns for that marking; the English name stays "Lama Tsong Khapa".
   Andreas' "one word, not two" meant *tsongkhapa* joined, and not *tsong kha pa* split.
9. **Decided 2026-11-11: the Sixteenth Karmapa's spelling changed to `rgyal dbang karma pa bcu drug pa`**; the earlier `rgyal ba karma pa bcu drug pa` found one witness only.
10. **Approved 2026-11-11:** a Google Books catalogue record whose published title opens with the exact spelling, as a witness type (a catalogue record, not a headword), by Andreas supplying the Sixteenth Karmapa's collected works.
11. **Approved 2026-11-11:** a Lotsawa House **work's title page** as a witness type, which gives the Sixteenth Karmapa a second independent group (the prayer titled *རྒྱལ་དབང་ཀརྨ་པ་བཅུ་དྲུག་པ་ཆེན་པོའི་ཞབས་བརྟན།*).
    **The single-witness exception for the Karmapa that item 9's round had set up is therefore removed entirely**: verifier data, fixture marker, header and mutants.
    Every name now meets the same two-group rule.
12. **Decided 2026-11-11, the düchens: no spelling change.**
    Andreas read four Rigpa Wiki pages in his own browser and pasted what they print: each prints the whole term, with exactly our Tibetan and Wylie, including `sa ga zla ba dus chen` (not the genitive) and `chos 'khor dus chen`.
    Supplying them **approves Rigpa Wiki as a witness type**, as a whole-term witness, counted as one group; the four passages are held as human-supplied data in `scripts/observance-name-rigpa-passages.data.json`, not fetched.

## Results of the run

**Run of 2026-11-11, after Andreas' rulings (`npm run verify:observance-names`): all 14 names pass the same rule, and the verifier wrote `test/fixtures/observance-names.ts`.**
The first run, before the rulings, passed 5 of 14; the second passed 13; the third passed 14 with one name under an exception, which the approvals of items 11 and 12 then removed.

| Rule | 1 script | 2 round trip | 3 witnesses | 4 sense | 5 phonetics |
|---|---|---|---|---|---|
| the four düchens | pass | pass | pass | pass | pass |
| `saga-dawa-month`, `sojong`, `fire-puja` | pass | pass | pass | pass | pass |
| `milarepa`, `guru-rinpoche`, `gampopa`, `tsongkhapa`, `dudjom-rinpoche`, `karmapa-16` | pass | pass | pass | biographical by kind | pass (the Karmapa's corrected) |
| `sakya-pandita` | pass | pass | pass | biographical by kind | pass (corrected) |

**Check 4 for a person is not a sense-read.**
A BDRC person record is biographical by kind, so the verifier records it as the sense and reads nothing more; the sense checks that read printed text are the six terms'.

### What the all-pass table does not say

- **The four Rigpa Wiki passages are human-supplied and cannot be re-fetched here.**
  Each düchen's whole-term witness rests on a page Andreas read in a browser and pasted; the verifier checks the committed strings against the name and refuses if they differ or the file is missing, but it makes no live fetch, so **the baseline cannot detect the page changing**.
  Rigpa Wiki is wiki text whose lineage is not independent of THL-style transcriptions, so it is counted as one group beside the dictionary head word.
- **Two düchens are not headwords anywhere the verifier reads.**
  `chos 'khor dus chen` and `sa ga zla ba dus chen` pass on the head word *dus chen* (Jäschke p. 255 and a *tshig mdzod chen mo* headword, with the sense "festival" read) and on their Rigpa Wiki passages.
  Jäschke p. 163 gives `chos 'khor` as "prayer-mill", and the *tshig mdzod chen mo* heads the festival as `chos 'khor bskor ba'i dus chen`; Andreas' reading of Rigpa Wiki settles the shipped form (see "Spelling questions, settled").
- **The witnesses for `guru-rinpoche` and `dudjom-rinpoche` are weak**, and `tsongkhapa`'s BDRC record does not state its spelling; see the persons table.

### A finding about the sources, which changed the check

**The aggregate's Jäschke and Das indexes are not evidence that a headword is printed.**
The Jäschke index lists *bdud 'joms rin po che* at a page of a book published in 1881, and lists *gu ru rin po che* at p. 69, where the page image prints only *gú-ru*, "spiritual teacher".
The earlier verifiers use those indexes only to re-check a page read from an image, which stays sound; used as a headword test they overstate.
So a Jäschke witness here is a row read from the page image and carried as data, and the index is used only to re-check its page to within two.
Das has no such rows, so **Das is not counted**; its index lists *sbyin sreg* (p. 940), and no page was read.

### Jäschke pages read (archive.org `tibetanenglishdi00jsuoft`, image n = printed page + 25)

- p. 255, *dus-čén* under *dus* (Comp.): "festival".
- p. 161, *čo-ʼprúl*: "magical trick, jugglery" — states no festival sense.
- p. 163, *čos-ʼkór* under *čos* (Comp.): "prayer-mill" — not the wheel of the teaching; the homograph trap, found.
- p. 570, *sá-ga*: one of the lunar mansions, "and hence also n. of a month, part of March and April"; the same page prints *sa-skyá pandi-ta*, "a famous Lama, born 1180", a variant spelling of *sa skya paN+Di ta*.
- p. 490, *zlá-ba*: "moon … temporal moon or month".
- p. 590, *yso-sbyoń-ba* (*gso sbyong ba*; Jäschke prints *g* as *y*): "to get quit of sin by confession to a priest … a renewal of obligations".
- p. 69: no *gu ru rin po che*.

### The four Rigpa Wiki passages

Held in `scripts/observance-name-rigpa-passages.data.json`, **read in a browser and pasted by Andreas on 2026-11-11, not fetched by the verifier**, with each page's URL and the Tibetan and Wylie it prints and nothing else of the page.
The file lives in `scripts/`, beside `rabjung-names.data.json`, and not in `test/fixtures/`: it is verifier input and no test reads it, so the rule that every file in `test/fixtures/` imports only from `test/fixtures/` is untouched.

| Rule | Page | Prints |
|---|---|---|
| `chotrul-duchen` | `rigpawiki.org/index.php?title=Chotrul_D%C3%BCchen` | ཆོ་འཕྲུལ་དུས་ཆེན་ — `cho 'phrul dus chen` |
| `saga-dawa-duchen` | `rigpawiki.org/index.php?title=Saga_Dawa_D%C3%BCchen` | ས་ག་ཟླ་བ་དུས་ཆེན་ — `sa ga zla ba dus chen` |
| `chokhor-duchen` | `rigpawiki.org/index.php?title=Ch%C3%B6khor_D%C3%BCchen` | ཆོས་འཁོར་དུས་ཆེན་ — `chos 'khor dus chen` |
| `lhabab-duchen` | `rigpawiki.org/index.php?title=Lha_Bab_D%C3%BCchen` | ལྷ་བབས་དུས་ཆེན་ — `lha babs dus chen` |

The verifier refuses if the file is missing or unreadable, if a düchen has no entry, or if an entry's Tibetan (less its trailing tsheg) or Wylie differs from the name's own.

### The terms

- **The four düchens** pass on their head word *dus chen* — Jäschke p. 255, and a headword of the *tshig mdzod chen mo* (gate only) — and on their Rigpa Wiki passage, a third group.
  Without the gate-only ruling and the Rigpa passages each had one witness: the Mahāvyutpatti lacks *dus chen*, and Das's index lists only the compound *dus chen dge ba 'bum 'gyur*.
  Whole terms: the *dung dkar* has *cho 'phrul dus chen* and *lha babs dus chen* as headwords; no public-domain source has the other two.
- **`saga-dawa-month`** passes on its head word *zla ba*: Jäschke p. 490, and the Mahāvyutpatti pairs it with *māsa* (month) beside *soma*; Monier-Williams p. 814 prints *māsa* as "a month or the 12th part of the Hindū year".
  *sa ga* is Jäschke p. 570 and the Mahāvyutpatti's *viśākhā*.
- **`sojong`** passes: Jäschke p. 590 (*gso sbyong ba*) and the Mahāvyutpatti's *gso sbyong|poṣadhaḥ*.
  Monier-Williams does not head *poṣadha*, so its sense rests on the Mahāvyutpatti's pairing.
- **`fire-puja`** passes: the Mahāvyutpatti pairs *sbyin sreg* with *homa* (Monier-Williams p. 1306: "oblation with fire"), and the *tshig mdzod chen mo* and *dung dkar* head it (gate only).

### The persons

BDRC is reachable and states names mechanically: `https://purl.bdrc.io/resource/P…` answers with JSON-LD (`Accept: application/ld+json`), whose labels are Wylie (`bo-x-ewts`) with a trailing `/`.
It states Wylie only, not script.
Its search needs a credential that its web page embeds, which this verifier does not use; the identifiers were found through Wikidata's BDRC property and each record is read from BDRC itself.

| Rule | BDRC record | Witnesses stating the proposed spelling |
|---|---|---|
| `milarepa` | P1853 | BDRC (`mi la ras pa`); *tshig mdzod chen mo* headword (gate); Tibetan Wikipedia title |
| `guru-rinpoche` | P4956 | BDRC (`gu ru rin po che`); Tibetan Wikipedia title *གུ་རུ་རིན་པོ་ཆེ་*, **a redirect** to the Padmasambhava article |
| `gampopa` | P1844 | BDRC (`sgam po pa bsod nams rin chen`); *dung dkar* headword `sgam po pa` (gate) |
| `karmapa-16` | P865 | the Google Books catalogue record `id=s61Sj5amlx0C` (below); and Lotsawa House's title page for the prayer *རྒྱལ་དབང་ཀརྨ་པ་བཅུ་དྲུག་པ་ཆེན་པོའི་ཞབས་བརྟན།*; BDRC states only the numeral form |
| `tsongkhapa` | P64 | *dung dkar* headword `rje tsong kha pa blo bzang grags pa` (gate; opens with the name); Lotsawa House heading *རྗེ་ཙོང་ཁ་པ།*; BDRC states `tsong kha pa blo bzang grags pa` and `rje rin po che blo bzang grags pa`, **not** the proposed form |
| `sakya-pandita` | P1056 | BDRC (`sa skya paN+Di ta kun dga' rgyal mtshan`); *dung dkar* headword `sa skya paN+Di ta` (gate) |
| `dudjom-rinpoche` | P736 | Lotsawa House heading *བདུད་འཇོམས་རིན་པོ་ཆེ།*; Tibetan Wikipedia's list of Tibetan scholars; BDRC states `bdud 'joms 'jigs bral ye shes rdo rje`, **not** the proposed form |

Tibetan Wikipedia's list of Tibetan scholars was read at revision 130662 (9 January 2016, the latest revision on 2026-11-11), so Dudjom's list witness is not at risk of a recent edit.
A Wikipedia title and a list item count as **one** witness group, being one site and one editing community.

Two witnesses are weak and are recorded as such: *guru-rinpoche*'s second witness is a Wikipedia redirect title, and *dudjom-rinpoche*'s two are web pages, a heading and a list.
For `tsongkhapa` and `dudjom-rinpoche` BDRC is the identity anchor and **not** a witness to the spelling, which is what keeping the honorific costs.

### The Sixteenth Karmapa

**The first form, `rgyal ba karma pa bcu drug pa`, found one witness only** (Tibetan Wikipedia's list of Tibetan scholars) and was replaced, by Andreas' ruling, with `rgyal dbang karma pa bcu drug pa` (item 9).
The converters agree on its script, which reads back exactly; THL returns *gyelwang kama(?)pa chudrukpa* for the marked Wylie `rgyal dbang-karma pa-bcu drug pa`, which is corrected to *gyelwang karmapa chudrukpa*.

It has **two independent witnesses**, and meets the rule with no exception:

- The Google Books catalogue record `books.google.com/books/about/x.html?id=s61Sj5amlx0C`.
  Its page title is *རྒྱལ་དབང་ཀརྨ་པ་བཅུ་དྲུག་པ་ཆེན་པོའི་གསུང་འབུམ།* ("Collected Works of the Great Sixteenth Karmapa"), which opens with the spelling followed by *ཆེན་པོའི་*.
  Its record fields: *Volume 2*; contributor the Buddhist Digital Resource Center; publisher Tsurphu Labrang and the Amnye Machen Institute, 2016; digitised by Google on 31 October 2025. *Volume 2*, the publisher and 2016 are in the recorded response; the contributor and the digitising date were read on the live page on 2026-11-11 and are not in the recorded response.
  It is a catalogue record, not a headword.
- Lotsawa House's Tibetan page for Dudjom Rinpoche's short prayer for the Sixteenth Karmapa's long life, whose title is *རྒྱལ་དབང་ཀརྨ་པ་བཅུ་དྲུག་པ་ཆེན་པོའི་ཞབས་བརྟན།*, a work's title page (the type approved in item 11).

Not found, for the record: BDRC person record P865 (its Wylie names are *karma pa 16 pa*, *karma pa 16 rang byung rig pa'i rdo rje* and *rang byung rig pa'i rdo rje*); a headword in the *tshig mdzod chen mo*, the *dung dkar* or the Mahāvyutpatti (they head *karma pa* alone); a Tibetan Wikipedia article titled with it; Lotsawa House's heading for the master himself, *ཀརྨ་པ་རང་བྱུང་རིག་པའི་རྡོ་རྗེ།*.
Sources Andreas supplied that could not be read: `rywiki.tsadra.org` (titled *skyabs rje kar ma pa bcu drug pa*, a different spelling), `buddhanature.tsadra.org` and Rigpa Wiki's pages for him answer the verifier with a Cloudflare challenge (403), and none was worked around; `library.bdrc.io/show/bdr:MW1KG3815_8ABDB7` is part 12 of a work titled *chos rje byang chub rdo rje'i rnam thar mdor bsdus* and prints no *karma pa bcu drug pa*.

### The corrections

Both expected values were returned by THL on this run, so both corrections stand.
The Sixteenth Karmapa: expected *gyelwang kama(?)pa chudrukpa*, corrected to *gyelwang karmapa chudrukpa*.
Sakya Pandita: expected *sakya pandi(?)ta*, corrected to *sakya pandita*.
Both are Andreas' corrections of 2026-11-11.
The other twelve phonetics are THL's output unchanged and equal the tables above; none carries "(?)".

### Proved by mutation

A scratch copy of the verifier, with its own `scripts/` and `test/fixtures/`, was run against **recorded** responses (40 recorded during the real run that wrote the fixture); each mutant alters one served response, one converter output or the Rigpa data file as the verifier reads it (three mutants alter two responses), and every mutant is asserted on its failure **message**, with no fixture written.
The control is unmutated, exits 0 and writes the fixture, and was run first and last.
There are **17 mutants** beside the control: the 14 in the table below, and three added when the phonetics step moved to the shared module (`record-column`, `boundary-row-missing`, `gate-exception-stale`), which the harness README lists with the messages they assert.
The harness, the replay preload, the recording preload, and a manifest of the 40 responses (URL and SHA-256, not the third-party pages themselves) are in [scripts/evidence/observance-names-verifier/](../../scripts/evidence/observance-names-verifier/README.md), with a README that says how to record the sources again and run them.

| Mutant | Check | Message asserted |
|---|---|---|
| control | none | exit 0, fixture written |
| converter returns an extra tsheg for `gso sbyong` | 1 | `EWTS converters disagree on "gso sbyong"` |
| `toWylie` reads back `sbyin sreg x` | 2 | `which reads back as "sbyin sreg x"` |
| Jäschke index moves `dus chen` to a leaf 200 pages away | 4 | `Jäschke's index puts "dus chen" at p. 454, not p. 255` |
| Mahāvyutpatti pairs `sbyin sreg` with `homa` | 4 | `the Mahāvyutpatti no longer pairs "sbyin sreg" with homaḥ` |
| Monier-Williams entry for *homa* loses "oblation with fire" | 4 | `no Monier-Williams entry headed homa prints "oblation with fire"` |
| both Tibetan–Tibetan dictionaries lose `sbyin sreg` | 3, terms | `head word "sbyin sreg" has 1 independent witness group(s) read, not 2` |
| the *tshig mdzod chen mo* and the Jäschke page lose `dus chen`, leaving Rigpa alone | 3, terms | `head word "dus chen" has 1 independent witness group(s) read, not 2` |
| the Rigpa data file prints `chos 'khor dus chens` | 3, the Rigpa path | `the Rigpa Wiki passage for chokhor-duchen prints` |
| the Rigpa data file is missing | 3, the Rigpa path | `the Rigpa Wiki witness file is missing or unreadable` |
| the Google Books title loses its first letter | 3, `karmapa-16` needs both | `"rgyal dbang karma pa bcu drug pa" has 1 independent witness(es) stating that spelling, not 2 (Lotsawa House)` |
| the Lotsawa House work title loses its spelling | 3, `karmapa-16` needs both | `"rgyal dbang karma pa bcu drug pa" has 1 independent witness(es) stating that spelling, not 2 (Google Books record)` |
| `milarepa` loses BDRC and the dictionary and gains both a Wikipedia title and a list item | 3, Wikipedia is one group | `"mi la ras pa" has 1 independent witness(es) stating that spelling, not 2 (Tibetan Wikipedia)` |
| the dictionaries lose `bdud 'joms`, which only the Jäschke index still lists | 5, a marked word must be an exact headword in a dictionary check 3 accepts | `word "bdud 'joms" of "bdud 'joms-rin po che" is no headword in` |
| THL returns *karmapa* for the Karmapa | 5, correction | `correction for karmapa-16 is no longer justified` |

The emit path is proved by the same table: every mutant leaves no fixture, and the control writes one.
**Baseline:** the control's fixture, formatted by `npx biome check --write` on a file inside the repository, is byte-identical to the committed fixture, which came from the real run.
(Biome's `--stdin-file-path` mangles Tibetan combining marks on this machine and must not be used for the comparison.)
The Rigpa passages are read from a committed file, so the baseline reproduces them by construction and says nothing about the live pages.
Not proved by mutation: check 5's "(?)" marker and the BDRC label check for persons were proved in an earlier round on live responses, before the check-3 rewrite; the Lotsawa House heading check and the Wikipedia title check have no mutant of their own beyond those above.
