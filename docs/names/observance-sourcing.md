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
| `karmapa-16` | Sixteenth Karmapa | `rgyal ba karma pa bcu drug pa` | རྒྱལ་བ་ཀརྨ་པ་བཅུ་དྲུག་པ | `rgyal ba-karma pa-bcu drug pa` | *gyelwa karmapa chudrukpa* (a correction: THL returns *gyelwa kama(?)pa chudrukpa*) |
| `tsongkhapa` | Lama Tsong Khapa | `rje tsong kha pa` | རྗེ་ཙོང་ཁ་པ | `rje-tsong kha pa` | *jé tsongkhapa* |
| `sakya-pandita` | Sakya Pandita | `sa skya paN+Di ta` | ས་སྐྱ་པཎྜི་ཏ | `sa skya-paN+Di ta` | *sakya pandita* (a correction: THL returns *sakya pandi(?)ta*) |
| `dudjom-rinpoche` | Dudjom Rinpoche | `bdud 'joms rin po che` | བདུད་འཇོམས་རིན་པོ་ཆེ | `bdud 'joms-rin po che` | *dünjom rinpoché* |

The last column in both tables is what THL's converter returned on 2026-11-11 for the marked Wylie in "Words separated by" mode; the verifier reproduces it on every run, and a different result is a finding.

**Two of THL's results carry its own uncertainty marker, "(?)":** *kama(?)pa* and *pandi(?)ta*.
THL's converter page says its output cannot be 100% accurate and that someone who understands the text should check it.
Andreas checked them on 2026-11-11 and is sure of *karmapa* and *pandita*, so **these two phonetics are corrections to THL's output**, not THL's output.
They are held as data in the verifier, in the pattern of the other corrections in this project ([CLAUDE.md](../../CLAUDE.md)): each states the value THL is expected to return (*gyelwa kama(?)pa chudrukpa* and *sakya pandi(?)ta*) and the value it is corrected to, and **the run refuses if THL no longer returns the expected value**, so a correction cannot outlive its reason.
The evidence for each is Andreas' own knowledge of the pronunciation, which is a witness of a different kind from a dictionary, and the record says so rather than presenting it as sourced.
Nothing else is corrected: the other twelve phonetics are THL's output unchanged.

## Spelling questions, and what the sources say

These were open when the record was written.
The facts below are headword existence only, from the sources the verifier reads; the decisions are Andreas'.

- **`cho 'phrul` or `chos 'phrul`.**
  The *dung dkar* heads `cho 'phrul dus chen` as a whole term; the *tshig mdzod chen mo* and Jäschke (p. 161, *čo-ʼprúl*) head `cho 'phrul`; no accepted source heads `chos 'phrul`, which appears only in the Jäschke *index*, and the record's finding below is that the index is not evidence.
  The sources support `cho 'phrul`.
- **`sa ga zla ba dus chen`, or the genitive `sa ga zla ba'i dus chen`.**
  No accepted source heads either form as a whole term; the Tibetan–Tibetan dictionaries head `sa ga zla ba` alone.
  The name passes check 3 on its head word *dus chen* only, and **the sources do not settle which form is right**: this is Andreas' to decide.
- **`chos 'khor dus chen`.**
  The *tshig mdzod chen mo* heads `chos 'khor bskor ba'i dus chen` ("the festival of turning the wheel"), not `chos 'khor dus chen`; Jäschke (p. 163) prints `chos 'khor` as "prayer-mill".
  The name passes check 3 on its head word *dus chen* only, and **the attested whole form differs from the shipped one**: this is Andreas' to decide.
- **Whether each compound is a headword in its own right or only its last part is.**
  Only `cho 'phrul dus chen` and `lha babs dus chen` are (in the *dung dkar*); the other two düchens pass on the head word *dus chen* and the sense read from Jäschke p. 255.
- **FPMT's "Lama Tsong Khapa": `rje tsong kha pa` or a `bla ma` form.**
  Settled in item 8 under "For Andreas to approve": `rje tsong kha pa`.
- **The Sixteenth Karmapa's form** is settled for now in item 6 and item 9 under "For Andreas to approve".

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
- **A person's name may not drop an honorific** (*rje*, *rgyal ba*, *rin po che*).
  A witness must state the proposed spelling itself, equal to it or opening with it as whole words (BDRC's *sgam po pa bsod nams rin chen* states *sgam po pa*).
- **The Sixteenth Karmapa stays `rgyal ba karma pa bcu drug pa`**, whose last words *karma pa bcu drug pa* mean the sixteenth Karmapa.
  BDRC's numeric *karma pa 16 pa* is not an acceptable spelling for the shipped name, and a source printing *karma pa bcu drug pa* under a different honorific (*rgyal dbang*, *'jig rten dbang phyug*) is not a witness to it.

**Andreas approved two further witness types on 2026-11-11, both for a person's name:** a **Lotsawa House** Tibetan page heading for the master, and a **Tibetan Wikipedia** article title (a redirect counts) or an item of its list of Tibetan scholars.
Neither is lexicography: each is a published page naming the person, and the verifier takes only that the page prints the spelling, as a heading, a title or a list item.
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
   **A term:** its head word (the whole term where it is a single word), with the page or entry cited, in two of three groups: a Jäschke page read from the image, the Mahāvyutpatti's pairing, and a headword of the *tshig mdzod chen mo* or *dung dkar* (gate only; both together are one group, per Andreas' ruling).
   Das counts only where a page was read, and none was.
   Das against the Mahāvyutpatti is one witness where both attest, since Das partly rests on the canonical lexicons.
   **A person:** two independent groups, each stating the **proposed spelling itself** — equal to it or opening with it as whole words, honorifics kept — from BDRC's person record, a gate-only headword, Lotsawa House's Tibetan page heading, or Tibetan Wikipedia; BDRC's record must also be the right person.
   **One named exception**, decided by Andreas on 2026-11-11: the Sixteenth Karmapa ships on a single witness, held as data in the verifier and applying to no other name.
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
6. **Decided 2026-11-11, after the first run:** a copyrighted-dictionary headword may count as a witness (gate only, one group); a person's name may not drop an honorific; the Sixteenth Karmapa stays `rgyal ba karma pa bcu drug pa`, not BDRC's numeric form.
7. **Approved 2026-11-11:** Lotsawa House's Tibetan page headings and Tibetan Wikipedia's article titles and list of Tibetan scholars as witness types for a person's name.
8. **Decided 2026-11-11, Tsong Khapa: no change.**
   The Tibetan stays `rje tsong kha pa`, marked `rje-tsong kha pa`, and the phonetic stays *jé tsongkhapa*, which is what THL returns for that marking; the English name stays "Lama Tsong Khapa".
   Andreas' "one word, not two" meant *tsongkhapa* joined, and not *tsong kha pa* split.
9. **Decided 2026-11-11, an explicit exception:** the Sixteenth Karmapa ships on **one** witness, Tibetan Wikipedia's list of Tibetan scholars (Andreas: "maybe accept one witness for this one").
   It is held as data in the verifier, naming the rule, the one witness allowed and why; it applies to no other name, and it refuses to run if that witness stops stating the spelling or a second one appears.
   The fixture row carries `singleWitness: true`.
   Rigpa Wiki is **not** an approved witness type.

## Results of the run

**Run of 2026-11-11, after Andreas' rulings (`npm run verify:observance-names`): all 14 names pass, the Sixteenth Karmapa under the single-witness exception of item 9 above, and the verifier wrote `test/fixtures/observance-names.ts`.**
The first run, before the rulings, passed 5 of 14; the second passed 13.

| Rule | 1 script | 2 round trip | 3 witnesses | 4 sense | 5 phonetics |
|---|---|---|---|---|---|
| the four düchens | pass | pass | pass | pass | pass |
| `saga-dawa-month`, `sojong`, `fire-puja` | pass | pass | pass | pass | pass |
| `milarepa`, `guru-rinpoche`, `gampopa`, `tsongkhapa`, `dudjom-rinpoche` | pass | pass | pass | biographical by kind | pass |
| `sakya-pandita` | pass | pass | pass | biographical by kind | pass (corrected) |
| `karmapa-16` | pass | pass | **one witness, by exception** | biographical by kind | pass (corrected) |

**Check 4 for a person is not a sense-read.**
A BDRC person record is biographical by kind, so the verifier records it as the sense and reads nothing more; the sense checks that read printed text are the six terms'.

### What the all-pass table does not say

- **Two düchens pass on their head word alone.**
  `chos 'khor dus chen` and `sa ga zla ba dus chen` are not headwords anywhere the verifier reads; they pass because *dus chen* has two witness groups (Jäschke p. 255, and a *tshig mdzod chen mo* headword) and a read sense, "festival".
  Jäschke p. 163 gives `chos 'khor` as "prayer-mill", not the wheel of the teaching, and the *tshig mdzod chen mo* heads the whole festival as `chos 'khor bskor ba'i dus chen`.
- **Two spellings are not settled by the sources** and ship anyway pending Andreas: the Saga Dawa Düchen's form (`sa ga zla ba dus chen` against the genitive, which the sources do not settle) and the Chokhor Düchen's (`chos 'khor dus chen` against the attested `chos 'khor bskor ba'i dus chen`).
  The sources do support `cho 'phrul` against `chos 'phrul`, under "Spelling questions" above.
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
- p. 163, *čos-ʼkór* under *čos* (Comp.): "prayer-mill" — **not** the wheel of the teaching, so Jäschke does not support the *chos 'khor* of *chos 'khor dus chen*; the homograph trap, found.
- p. 570, *sá-ga*: one of the lunar mansions, "and hence also n. of a month, part of March and April"; the same page prints *sa-skyá pandi-ta*, "a famous Lama, born 1180", a variant spelling of *sa skya paN+Di ta*.
- p. 490, *zlá-ba*: "moon … temporal moon or month".
- p. 590, *yso-sbyoń-ba* (*gso sbyong ba*; Jäschke prints *g* as *y*): "to get quit of sin by confession to a priest … a renewal of obligations".
- p. 69: no *gu ru rin po che*.

### The terms

- **The four düchens** pass on their head word *dus chen*: Jäschke p. 255, and a headword of the *tshig mdzod chen mo* (gate only), which is the second group the ruling made available.
  Without that ruling each had one witness: the Mahāvyutpatti lacks *dus chen*, and Das's index lists only the compound *dus chen dge ba 'bum 'gyur*.
  Whole terms: the *dung dkar* has *cho 'phrul dus chen* and *lha babs dus chen* as headwords; no public-domain source has *sa ga zla ba dus chen*, *chos 'khor dus chen* or *lha babs dus chen*.
  *chos 'phrul* was not settled by the sources: the *tshig mdzod chen mo* and the Das index have *cho 'phrul*; *chos 'phrul* appears only in the Jäschke index, which is not evidence.
  The genitive *sa ga zla ba'i dus chen* was not searched for.
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
| `karmapa-16` | P865 | **only** Tibetan Wikipedia's list of Tibetan scholars, which prints *རྒྱལ་བ་ཀརྨ་པ་བཅུ་དྲུག་པ།* (the single-witness exception) |
| `tsongkhapa` | P64 | *dung dkar* headword `rje tsong kha pa blo bzang grags pa` (gate; opens with the name); Lotsawa House heading *རྗེ་ཙོང་ཁ་པ།*; BDRC states `tsong kha pa blo bzang grags pa` and `rje rin po che blo bzang grags pa`, **not** the proposed form |
| `sakya-pandita` | P1056 | BDRC (`sa skya paN+Di ta kun dga' rgyal mtshan`); *dung dkar* headword `sa skya paN+Di ta` (gate) |
| `dudjom-rinpoche` | P736 | Lotsawa House heading *བདུད་འཇོམས་རིན་པོ་ཆེ།*; Tibetan Wikipedia's list of Tibetan scholars; BDRC states `bdud 'joms 'jigs bral ye shes rdo rje`, **not** the proposed form |

Tibetan Wikipedia's list of Tibetan scholars was read at revision 130662 (9 January 2016, the latest revision on 2026-11-11), so the Karmapa's and Dudjom's list witnesses are not at risk of a recent edit.
A Wikipedia title and a list item count as **one** witness group, being one site and one editing community.

Two witnesses are weak and are recorded as such: *guru-rinpoche*'s second witness is a Wikipedia redirect title, and *dudjom-rinpoche*'s two are web pages, a heading and a list.
For `tsongkhapa` and `dudjom-rinpoche` BDRC is the identity anchor and **not** a witness to the spelling, which is what keeping the honorific costs.

### The Sixteenth Karmapa: what was searched, and the exception

`rgyal ba karma pa bcu drug pa` has one witness, and ships under the exception of item 9.
Searched, with the spelling as proposed, and **not found**:

- BDRC person record P865: its Wylie names are *karma pa 16 pa*, *karma pa 16 rang byung rig pa'i rdo rje* and *rang byung rig pa'i rdo rje* (its Tibetan-script labels, read through Wikidata's mirror, are the same names); the numeric form is ruled out.
- The *tshig mdzod chen mo*, *dung dkar*, the Mahāvyutpatti and the Jäschke and Das indexes: no headword of that spelling or opening with it; the dictionaries head *karma pa* alone.
- Lotsawa House's Tibetan page for the Sixteenth Karmapa: titled *ཀརྨ་པ་རང་བྱུང་རིག་པའི་རྡོ་རྗེ།*, and printing *karma pa bcu drug pa* only after *rgyal dbang* and *'jig rten dbang phyug*.
- Tibetan Wikipedia: no article titled with it, and among thirty full-text hits for *karma pa bcu drug pa* none prints the spelling.
- Wikidata's Tibetan labels for the BDRC record: *ཀརྨ་པ ༡༦* and the personal name.
- Sources Andreas supplied: `rywiki.tsadra.org/index.php/skyabs_rje_kar_ma_pa_bcu_drug_pa` (titled *skyabs rje kar ma pa bcu drug pa*, a different spelling; copyrighted dictionary text, so a headword's existence would be the only fact taken); `buddhanature.tsadra.org/index.php/Karma_pa_bcu_drug_pa`; and Rigpa Wiki pages for him — **all three answer the verifier with a Cloudflare challenge (403) on every request tried, and none was worked around, so what they print is unknown**.
  A web search for the exact spelling on Rigpa Wiki returned no page.
  If Rigpa Wiki prints the exact spelling it would be a candidate only; it is not an approved witness type.
- `library.bdrc.io/show/bdr:MW1KG3815_8ABDB7`, read through BDRC's record `purl.bdrc.io/resource/MW1KG3815_8ABDB7`: part 12 of a work, pp. 388–400, whose only title is *chos rje byang chub rdo rje'i rnam thar mdor bsdus*; it prints no *karma pa bcu drug pa* at all.
- *Found:* only the list of Tibetan scholars in Tibetan Wikipedia (the article བོད་ཀྱི་མཁས་དབང་།), which prints it exactly.

### The corrections

Both expected values were returned by THL on this run, so both corrections stand.
The Sixteenth Karmapa: expected *gyelwa kama(?)pa chudrukpa*, corrected to *gyelwa karmapa chudrukpa*.
Sakya Pandita: expected *sakya pandi(?)ta*, corrected to *sakya pandita*.
Both are Andreas' corrections of 2026-11-11.
The other twelve phonetics are THL's output unchanged and equal the tables above; none carries "(?)".

### Proved by mutation

A scratch copy of the verifier, with its own `test/fixtures/`, was run against **recorded** responses (38 recorded during the real run that wrote the fixture); each mutant alters one served response or one converter output (two mutants alter two or three responses of one name), and every mutant is asserted on its failure **message**, with no fixture written.
The control is unmutated, exits 0 and writes the fixture, and was run first and last.
There are **12 mutants** beside the control.
The harness, the replay preload, the recorded responses and the run outputs are kept in `~/.claude/projects/d--dev-tibetan-calendar-temporal/plans/evidence/observance-names-verifier/`, with a README that says how to run them.

| Mutant | Check | Message asserted |
|---|---|---|
| control | none | exit 0, fixture written |
| converter returns an extra tsheg for `gso sbyong` | 1 | `EWTS converters disagree on "gso sbyong"` |
| `toWylie` reads back `sbyin sreg x` | 2 | `which reads back as "sbyin sreg x"` |
| Jäschke index moves `dus chen` to a leaf 200 pages away | 4 | `Jäschke's index puts "dus chen" at p. 454, not p. 255` |
| Mahāvyutpatti pairs `sbyin sreg` with `homa` | 4 | `the Mahāvyutpatti no longer pairs "sbyin sreg" with homaḥ` |
| Monier-Williams entry for *homa* loses "oblation with fire" | 4 | `no Monier-Williams entry headed homa prints "oblation with fire"` |
| the *tshig mdzod chen mo* loses `dus chen` | 3, terms | `head word "dus chen" has 1 independent witness group(s) read, not 2` |
| the Wikipedia list loses the Karmapa's item | 3, exception | `the single-witness exception for karmapa-16 expects exactly "Tibetan Wikipedia" and no other group, but no group states the spelling` |
| BDRC's record gains the exact spelling | 3, exception | `a second witness exists, so the exception is no longer needed` |
| `milarepa` loses BDRC and the dictionary, keeping only a Wikipedia title | 3, the exception cannot reach another name | `"mi la ras pa" has 1 independent witness(es) stating that spelling, not 2` |
| `milarepa` loses BDRC and the dictionary and gains both a Wikipedia title and a list item | 3, Wikipedia is one group | `"mi la ras pa" has 1 independent witness(es) stating that spelling, not 2 (Tibetan Wikipedia)` |
| the *tshig mdzod chen mo* loses `bdud 'joms`, which only the Jäschke index still lists | 5, a marked word needs a headword check 3 accepts | `marked word "bdud 'joms" is part of no headword that check 3 accepts` |
| THL returns *karmapa* for the Karmapa | 5, correction | `correction for karmapa-16 is no longer justified` |

The emit path is proved by the same table: every mutant leaves no fixture, and the control writes one.
**Baseline:** the control's fixture, formatted by `npx biome check --write` on a file inside the repository, is byte-identical to the committed fixture, which came from the real run.
(Biome's `--stdin-file-path` mangles Tibetan combining marks on this machine and must not be used for the comparison.)
Not proved by mutation: check 5's "(?)" marker and the BDRC label check for persons were proved in an earlier round on live responses, before the check-3 rewrite; the Lotsawa House heading check and the Wikipedia title check have no mutant of their own beyond those above.
