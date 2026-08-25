# Sourcing the 60 rabjung names

**Status: authored.** The two documents beside this one are generated —
[rabjung.md](rabjung.md) is the table itself and [vocabulary.md](vocabulary.md) is the 27-term
vocabulary. This one is the record of the *hunt*: every source tried for these sixty names, what it
could and could not answer, and why the ones that were rejected were rejected.

It exists for one reason. The work spanned six sessions and several sources were tried, exhausted and
abandoned; without a record the next person re-walks them. [validation-sources.md](../validation-sources.md)
makes that case for calendar dates and states the rule this file follows: **agreement is only evidence
if the source did not reach its answer the way we did**.

## What a complete row needs, and who can answer it

Six columns, and no single source answers more than two. That is the whole difficulty.

| Column | Answered by | Why nothing else can |
|---|---|---|
| Position, Wylie, the two Gregorian years | Janson's LaTeX | The Tibetan lineage, taken from Henning's Appendix I, and the only source this package derives from |
| Tibetan script | `jsewts` + `tibetan-ewts-converter` | Two implementations required to agree and to round-trip back to the Wylie they came from |
| Phonetics | THL's converter | The publisher of the standard |
| Devanāgarī | The Wikipedia saṃvatsara table | The only machine-readable source found carrying the script against the cycle positions |
| IAST | **Derived** from the Devanāgarī | See below — the table's own romanisation is lossy |
| Sanskrit senses | Monier-Williams, via the Cologne scan | The authority itself, uncapped, with a printed page per row |
| Cycle position, as a cross-check | English Wiktionary and the Bṛhat Saṃhitā via wisdomlib | Two lineages independent of Janson and of each other |
| English of the **Tibetan** | Authored | No source gives it. Checked directly — see the dead ends below |

## Sources accepted, and what each is trusted for

**Janson's LaTeX** gives the Wylie, the position and the years. His ASCII Sanskrit column is **not
shipped**: it collides three names onto `pramadi`, carries no Devanāgarī, and he flags its spellings
as varying between sources. It is still extracted, for exactly one purpose — it is the only
mechanical detector of the rows where the two lists carry *different names* rather than different
spellings, and dropping it once took that evidence with it.

**Csoma de Kőrös, *A Grammar of the Tibetan Language* (Calcutta 1834)** gives the list the Tibetan
names translate, twice over: §232 (p. 150) in his own romanisation, with the readings he treats as
alternatives braced to a single Tibetan name, and §233 (pp. 151–152) "as written in the Tibetan
character" — the only script any source attests for that list. He is the witness independent of
Janson, whose table is "taken from [Henning]" by Janson's own LaTeX, and he predates Monier-Williams
by 65 years and Sewell by 90.

He is hand-read from the plates, which cannot be otherwise: the scans carry no Tibetan text layer,
and the braces are typography no OCR reproduces. Every one of the sixty readings is then checked
mechanically against Janson's ASCII and against Csoma's own Roman, neither of which derives from the
script column, so a misread glyph fails the run rather than reaching the table.

**Sewell & Fleet, *The Siddhāntas and the Indian Calendar* (1924)** settles **name identity only** —
which name sits at which position. It cannot settle a spelling, because it carries no IAST diacritics
anywhere: it prints `Sukla`, `Vrisha`, `Kshaya` in 1924 romanisation. Its scan is noisy OCR
(`Ksliaya`, `Manniathn`, `Ahgiras`), so no single occurrence is trusted; the book prints "N Name"
thousands of times across its year-conversion tables, and the modal reading at each position is taken
instead. OCR errors scatter; the true reading does not.

**Monier-Williams, through the Cologne Digital Sanskrit Dictionaries**, gives the senses — 764 across
the sixty rows, each with a printed page number, a stable record ID and his own homonym grouping.

**wisdomlib** gives the Bṛhat Saṃhitā's cycle position, which Varāhamihira states in words beside the
Devanāgarī, and the per-source attribution that says which non-MW lexicons carry a headword. Only the
ordinal is taken, never the prose: a position is a fact, and the surrounding translation is not ours.

**English Wiktionary** attests that a headword exists and often states the cycle position. It is
**not** a sense source, and the reason is the central lesson of this file — see below.

## Three findings that changed the method

### A citation is not a lineage

The IAST column was cited to Sewell & Fleet and *reached us through the Wikipedia saṃvatsara table*.
Nobody had opened Sewell. When someone did, he disagreed at four positions — and at position 60 the
disagreement was total: he gives `Kshaya`, the string `Akshaya` appears **nowhere in his book**, and
Janson and the Tibetan `zad pa` both agree with him. What had been recorded for months as a
Tibetan-versus-Indic *divergence* was our own column being wrong.

### A divergence between traditions was, for the third time, our own reading

Positions 29 and 52 were recorded for months as the two places where the Tibetan and Indic lists
*genuinely* name different things. They do not. Csoma prints two readings at each, braced to one
Tibetan name — *Mada or Manmatha*, *Kāladūtī or Kālayukta* — so the pair is attested as a pair, and
the only question is which reading a tradition took. Six further positions carry such a pair and
never looked divergent, because there the Indic list happens to hold the reading the Tibetan does.

The same witness then showed where the lists *do* differ, and it was nowhere anybody had looked:
**16, 17, 18, 20 and 34**. At 34 the Indic Śārvarī, "belonging to night", stands against *kun ldan*,
all-endowed, which renders *sarvapati* — and nothing had ever flagged it, because the divergence
table only ever examined rows somebody already suspected. Janson's Sanskrit column had been in the
input the whole time and was never diffed against the Indic one over all sixty rows.

This has the shape of the two findings above, and it is the third instance: what looked like a fact
about the sources was a fact about our reading of them. The lesson each time is the same — an
invariant over the whole table finds what a hand-curated list of suspicions cannot.

### Wiktionary's Sanskrit senses *are* Monier-Williams

They were used as the sense column on the strength of being "a third lineage independent of Janson
and Sewell" — true of them, and silent about MW. Pulling खर from Wiktionary and from the Cologne scan
gives the same gloss sequence, verbatim. So corroborating that column with any MW-derived source
would have been Monier-Williams agreeing with himself. Corroboration is now counted only from
lexicons that are **not** MW: Shabda-Sagara, Benfey, Yates, Apte, Edgerton.

Worse, the Wiktionary extractor capped senses at eight and read a fixed 3000-character window, and
**three authored notes in the shipped table rested on that cap**. खर was said to list "no sense
resembling the Tibetan at all… neither is a donkey"; it lists 27, one of which is "a donkey" and
another of which states the 25th year outright. प्लव was said to offer nothing meaning leaping; it
offers "jumping, leaping, plunging". सौम्य was said to omit "gentle, mild"; MW carries "placid,
gentle, mild". An artefact of our own extractor had been written up as a fact about Sanskrit
lexicography.

## Why the IAST column is derived rather than sourced

The saṃvatsara table's romanisation disagrees with its own Devanāgarī at **twelve** positions. It
drops the macron on `-in` stems, prints `Raudri` for रौद्र, and romanises anusvāra spellings as the
clusters they stand for. Worst, a correction of this project's own making had written Sewell's 1924
`Kshaya` into a column headed *IAST*, on the same page that says he carries no diacritics.

So the column is computed from the Devanāgarī. The printed value is kept as a **signal**: each of the
twelve disagreements is recorded with its reason, and a thirteenth fails the run.

**But a consistency check between two columns from one source cannot catch a shared error**, and four
rows proved it — 45, 58, 4 and 9 each had *both* columns wrong together, so nothing internal
contradicted anything. Only external attestation found them. That is why the lookup, not the
comparison, is what catches this class.

## The lookup ladder, and why it is not a correction list

Monier-Williams files a word under a headword form, which is not always how the saṃvatsara list
spells the name. Sent to Cologne exactly as printed, 49 of the 60 resolve; the other eleven are not
missing from MW at all, but filed under a different form of the same word.

**A rung changes only what is *queried*; a correction changes what the table *prints* and carries
authored evidence.** Eleven rows are grammar — `-in` stems printed in the nominative, anusvāra
against cluster in both directions, a missing virāma, a Vedic ḷ — and an early draft was going to
write all eleven up as editorial judgements.

Two refinements were forced by real failures, both of which had put a *different word's* meaning in
the table:

- The entry must be **headed by the form queried**. क्रोधी resolved to क्रोध's page — the noun "anger" —
  where क्रोधी appears only as the name of a musical *śruti*. Testing whether *any* sense begins with
  the word is too weak; it accepted exactly that case.
- The entry must **gloss the word**, not merely name the year it labels. सर्वधारी stopped at an entry
  MW knows only as a year-name, while the stem one entry away reads "'all-holder'".

The first of these immediately caught a row nobody suspected: **23 was not missing a meaning, it had
the wrong one** — "opposition, hostility" is विरोध, the noun, reached the same way.

## Dead ends, so they are not re-walked

**An independent Tibetan-language witness.** Everything in the table descends from Henning's Appendix
I through Janson, so a second lineage would have to be Tibetan-language and not calendrical software.
Three leads, no witness:

- **Rangjung Yeshe Wiki** — the *site* is behind a Cloudflare interstitial that returns 403 to any
  programmatic request, with a declared User-Agent or a browser one alike. That is a deliberate
  access decision; do not work around it. **But the dictionary is not the site, and that distinction
  was missed until 2026-08-25** — this entry read "unavailable, settled" while the same corpus was
  being published elsewhere in a form nothing had to be worked around. See the section below.
- **BDRC** — a live lead, unrealised. Its full-text search over open-access Unicode Tibetan etexts
  works: ten chunks contain both དུས་ཀྱི་ཕོ་ཉ (52) and ཁྲག་སྐྱུག (57), two names distinctive enough that
  co-occurrence implies a list of the sixty. What blocked it was retrieval, not access —
  `Etexts_chunks` returned parameter metadata and no rows for every pagination spelling tried. **The
  concrete next step is that one API call**, not another search.
- **THL** — reachable and un-blocked, but its dictionary is a React SPA with no server-rendered
  endpoint, the legacy `translate.php` ignores query parameters, and the Mandala backend returns
  bot-interstitial `202`s. Its phonetics converter remains fully usable and is what both verifiers
  depend on.

**BDRC chunk counts as an attestation check — rejected on a negative control.** They tempt, because
they work on multi-word names where an exact-title lookup cannot: དུས་ཀྱི་ཕོ་ཉ scores 232,
སྣ་ཚོགས་དབྱིག 68. But **སྤེན་མ scores 108**, and that is the Saturday form this project *rejected* on
lexical grounds. A corpus count measures string occurrence, not lexical existence: a string can
appear inside a longer construction, as a variant, or as a name. Adopting it would have quietly
replaced the standard with one that passes the exact form the repo threw out.

**English for the Sanskrit names, from the calendrical literature.** Sewell & Fleet prints the sixty
as bare names against Kaliyuga years and fractional day-counts — no meaning column, no gloss
vocabulary anywhere near the names, and every occurrence of "translation" in the book refers to
translations of Siddhānta texts. That fits what the work is: a book about *computing* which
saṃvatsara a year falls in. Rao (2000) is in copyright and was not reachable, but is cited for the
same list in the same literature.

**This was recorded as "English is not sourceable" and that conclusion was wrong** — it was true of
Sewell and of Rao, which is what had been checked, and never true of the lexicographers.
Monier-Williams glosses every one of the sixty headwords.

## The Tibetan-side English lead: reachable, quotable only in part

`docs/names/rabjung.md` says of the **English of the Tibetan** column that "no source gives English
for these", justified by checking Sewell & Fleet. That is true of *Sewell*, who is a Sanskrit-calendar
source. Nobody had asked a **Tibetan dictionary**, and the answer changes what that column can claim.

A Wylie-keyed aggregate at `github.com/christiansteinert/tibetan-dictionary` publishes several as
pipe-separated files (`_input/dictionaries/public/`). Coverage of the sixty Tibetan names, measured:

| Source | Headword | States this cycle position |
|---|---|---|
| Ives Waldo | **60/60** | 42/60 |
| Rangjung Yeshe | 57/60 | 38/60 |
| *tshig mdzod chen mo* (Tibetan–Tibetan) | 58/60 | — (defines in Tibetan) |
| 84000 | 31/60 | — |
| Jäschke 1881, scan index | 31/60 → printed page | — |
| Chandra Das 1902, scan index | 31/60 → printed page | — |

They do not merely gloss the word; many name the year outright — `mi zad | inexhaustible; ... me pho
khyi lo` at 20, `kun ldan | Sarwadin, 34'th year male iron mouse`. **That yields a mechanical check
the generator can run:** these entries state the element–animal year, which the generator computes
independently, so a source's own identification can be verified rather than trusted — the Tibetan-side
analogue of the Bṛhat Saṃhitā position check.

**The licence gate, and what survives it.** The aggregate's README states, in capitals, that *"THE
COPYRIGHT OF THE DICTIONARY DATA IS WITH THE RESPECTIVE AUTHORS"*, with no per-dictionary terms; the
GPL there covers the code only. Waldo, Rangjung Yeshe and the *tshig mdzod chen mo* are modern
copyrighted works. So they may **gate** and may never be **quoted** — exactly the standing wisdomlib
already has here ("only the position is taken, never the prose"), and the split this repository
already draws for competing implementations: *dates are facts, not copyrightable expression*.

| Takeable — fact | Not takeable — expression |
|---|---|
| That a headword exists at this Wylie | The wording of any gloss |
| The cycle position the entry states | The phrasing of a definition |
| The element–animal year it states | |

**The public-domain route was tested and is weaker than it looks.** Jäschke (1881) and Das (1902) are
quotable with a page citation, but their archive.org OCR is not usable as text. Jäschke returned
**0/60** — his romanisation is idiosyncratic (`khyon-idom`, `kyom-khyom`) and the Tibetan script is
dropped entirely, so he is a *page pointer* and nothing more. Das is partially reachable, **21/60** on
a naive hyphen-join, and the misses are his own conventions rather than absences — he writes `'` as
`h` (`hdsin` for `'dzin`, `rgyal-pohi` for `rgyal po'i`) and OCR loses his diacritics, so a
Das-convention ladder would recover most of the rest. Sewell's majority-vote trick does not transfer:
it works because the book prints each name thousands of times, and a dictionary headword appears once.

**Lineage caution, which is the usual trap here.** Ives Waldo and Rangjung Yeshe are overlapping
modern compilations, so under this document's own rule they are close to **one** witness, not two.
The independent legs are the *tshig mdzod chen mo*, Jäschke and Das by printed page, and Csoma.

**And the homograph trap is present**, as it was on the Sanskrit side at युव and दुन्दुभी: position 1
`rab byung` glosses first as *ordination, renunciate* — the Buddhist sense, not "arising". Read the
sense, never the presence of an entry.

## The ngönjö survey: what register the sixty names are in

**Counted, not sampled.** An earlier note recorded that two of two names sampled carried the
མངོན་བརྗོད *ngönjö* marker and warned that this was a hint rather than a result. It has now been run
across all sixty by `scripts/survey-ngonjo.mjs`, against the *tshig mdzod chen mo*.

The *tshig mdzod chen mo* tags a sense `(mngon)` when it belongs to the *mngon brjod* register — the
poetic-synonym vocabulary of verse and almanacs rather than of speech. It is one of a small set of
register tags the dictionary uses, and the inventory is what makes the tag legible at all:
`(mngon)` 3520, `(rnying)` archaic 1731, `(yul)` dialect 1156, `(legs)` *legs sbyar* — Sanskrit — 457,
`(rgya)` 215, `(sog)` Mongolian 58.

| | of 60 |
|---|---|
| A sense states the year this name carries | **57** |
| That sense is tagged `(mngon)` | **54** |
| Tagged something else | 2 |
| Stated but untagged | 1 |
| No sense states the year | 3 |

**The year is computed from the cycle and never read off the dictionary**, so what is being counted
is the source agreeing with an independently derived fact — the Tibetan-side analogue of the Bṛhat
Saṃhitā position check. Fifty-seven agreements out of sixty is itself the evidence that the matching
is sound; a wrong sign arithmetic would have missed nearly all of them.

**So the sixty are literary vocabulary, and that is now sourced rather than assumed.** It is
deliberately **not** load-bearing for any decision here — see
[the year-naming record](../decisions/2026-08-24-year-naming-off-the-date.md), which argues
redundancy and recoverability instead, precisely because register is a claim about audience.

### The six rows that are not a plain `(mngon)`, which is where the interest is

- **1 `rab byung`** states its year and carries no tag at all. The cycle's own name is ordinary
  vocabulary — consistent with the homograph trap already recorded here, where it glosses first as
  *ordination*.
- **6 `ang gi ra`** is tagged `(legs)`, Sanskrit, not `(mngon)`. That is independent corroboration of
  Csoma's declared exception 6, which reads his entry as **transliterating rather than translating**.
  Two sources reaching that from different directions, and neither was looking for it.
- **12 `'bru mang po`** is filed one syllable short, as `'bru mang`, and tagged `(mong)` — a **hapax**
  in a 5.6 MB file, beside 3520 `(mngon)`. Its sense states `sa stag lo`, exactly the year we compute.
  Whether `(mong)` is a slip for `(mngon)` cannot be settled from this source, and is not asserted;
  the file carries two other one-off tags (`(tnying)`, `(rnging)`) that plainly are slips.
- **15 `khyu mchog`** is tagged `(mngon)` and assigns itself to `chu rta` — the **water-horse** year,
  which is position **16**, where `sna tshogs` also sits. So the dictionary disagrees with our
  position for 15, and 16 is one of the five positions at which the two Sanskrit lists diverge. Left
  as a recorded divergence, not a correction: our 15 is वृष *Vṛṣa*, the bull, which `khyu mchog`
  renders exactly.
- **39 `sna tshogs dbyig`** has no headword.
- **49 `srin bu`** has a headword with ordinary senses only.

For 15, 39 and 49 the dictionary was swept **whole**, not just at our headword: no `(mngon)`-tagged
entry anywhere in it states `lcags sbrul`, `shing sbrul` or `shing yos`. Those are gaps in the source,
not lookup failures.

### What the survey may take, and what it may not

The same gate as the rest of this section: the dictionary is a modern copyrighted work and may
**gate** but never be **quoted**. Three facts are taken — that a headword exists, that a sense carries
a tag, and the element–animal a sense states. No gloss text is stored, printed or written to any file,
and the script emits no fixture.

**Chandra Das uses the same marker**, `(Mnon.)`, which would give the finding a public-domain second
witness. That is **not** counted above and should not be quoted as if it were: the aggregate carries
Das as a scan index — page pointers with no text — so his marker cannot be swept the way this one was.

### Three ways it went wrong before it went right

Each is recorded because each is a live trap for anyone extending this, and each moved the count by
double figures:

1. **The marker has two scopes.** `{(mngon)} 1) {…} 2) {…}` tags the whole entry; `4) {(mngon) …}`
   tags that sense alone. Reading "the entry contains `(mngon)`" conflates them, and counts entries
   whose *year* sense is ordinary vocabulary.
2. **The year is not written the way the calendar writes it.** The dictionary drops the gender and
   abbreviates the animal — `me byi lo`, not `me pho byi ba` — and spells the monkey three ways
   (`spre`, `sprel`, `spre'u`). Matching the calendar's spelling scored **8/60** against the true 57,
   which looks like a finding about the source and is a finding about the query.
3. **A reverse sweep looks stronger and is worse.** Searching the whole dictionary for each year
   string returns mostly biographies — "born in the water-horse year" — and requiring the trailing
   `lo` those sentences carry drops the entries that write the year bare, `zil gnon` among them.

The script proves its own sign arithmetic against four publicly known years before judging any
source, and refuses to run if the dictionary no longer says what the counts above rest on — the
`(mngon)` volume, `(mong)` being a singleton, and `ang gi ra` carrying `(legs)`. All four refusals
were proved by mutation rather than assumed.

## Tier A: the authored English is now gated on facts

**Built 2026-08-25.** The lead above is closed. `docs/names/rabjung.md`'s **English of the Tibetan**
column reads **(authored, checked)**, and `verify-rabjung-names.mjs` refuses to write if the check
fails.

**What is checked is not the gloss.** No source publishes English for these sixty that may be
reproduced here, so the wording stays authored. What is verified is that **the word being glossed is
the word we think it is** — that a Tibetan dictionary carries the headword, and that its entry names
the same year this table gives it. The year is computed from the cycle and never read off a
dictionary, so a source's own identification is verified rather than trusted, which is what stops the
check being circular.

That catches the failure that actually happens. Position 1 `rab byung` opens as *ordination* — the
everyday Buddhist sense — so a gloss written from an entry's first sense would gloss a homograph.

| Source | Lineage | Headword | States our year | States our position |
|---|---|---|---|---|
| Ives Waldo | modern compilation | 60/60 | 58/60 | 51/60 |
| Rangjung Yeshe | modern compilation | 60/60 | 53/60 | 52/60 |
| *tshig mdzod chen mo* | Tibetan–Tibetan | 59/60 | 57/60 | — |

**Every one of the sixty** is confirmed by at least one source; **57** by both lineages. The
*tshig mdzod chen mo* states no cycle positions at all — it identifies a year by its element–animal
name — so that column is empty for it rather than failing.

The generator gates on three things, each mutation-proved: an **undeclared** year disagreement fails
the run; a **declared** one that no longer matches the source fails it; and headword coverage below a
floor fails it as a broken download rather than as sixty absent names.

### The position-15 divergence, now resolved to one source against four

The ngönjö survey found the *tshig mdzod chen mo* filing `khyu mchog` under the **water-horse** year,
which is position **16**. Tier A settles what that is worth: **Ives Waldo states the fifteenth year
and `lcags mo sbrul` outright, Rangjung Yeshe states the fifteenth**, and Csoma and Janson both place
it at 15. So it is one source against four, and it is recorded as a declared divergence rather than
acted on. Position 16 is also one of the five where the two Sanskrit lists differ, which is why it
stays visible rather than being filed away.

**A lineage observation worth keeping.** Ives Waldo's entry for `khyu mchog` carries the
*tshig mdzod chen mo*'s water-horse reading as well as its own fifteenth-year one — so on that row
Waldo is partly downstream of the source it appears to corroborate. Independence has to be checked
per row, not assumed from a source list.

### Two bugs found by building it, both of the same shape

**A prefix is a sense.** The sense splitter returned the text before an entry's first numbered sense
only as a place to look for a register tag, discarding it otherwise. In the *tshig mdzod chen mo*
that prefix is usually a bare `{(mngon)}` and dropping it costs nothing, which is how it survived the
ngönjö survey unnoticed. Ives Waldo puts the **entire English gloss** there and only a Tibetan
quotation after `1)`, so the splitter was discarding the very text being checked — and position 15
was reported as disagreeing with a source that in fact agreed. The ngönjö count is unaffected: it is
still 54 of 60 after the fix, re-run to confirm.

**Shortening a headword can land on a different name.** Position 12 is filed as `'bru mang`, one
syllable short of `'bru mang po`, so the lookup falls back to a shortened form. Unguarded, that turns
position 39 `sna tshogs dbyig` into `sna tshogs` — which is **position 16**, a different name in the
same list, and it silently reported a headword that was not there. The fallback now refuses any
shortened form that is itself one of the sixty.

Both are the same failure: a rule that is harmless on the source it was written against, and wrong on
the next one. Neither was caught by a count looking plausible.

## Operational notes

**wisdomlib rate-limits.** A full sixty-row pass trips it, after which it answers `403` to every
User-Agent alike, a browser string included. Changing the User-Agent is not the fix and would be the
same working-around declined for Rangjung Yeshe Wiki. The generator sends one request before sixty
and aborts the whole run if the source is down, because an empty corroboration column would otherwise
be written into the table as a finding about Sanskrit rather than about our request volume.

**Csoma's plates, with no PDF renderer installed.** `pdftoppm` is absent, so the Read tool cannot
rasterise the PDF. Use archive.org's page images instead —
`https://archive.org/download/dli.pahar.0168/page/nNNN.jpg`, where **printed page = N − 14**, so
§232's p. 150 is `n164` and §233 runs `n165`–`n166`. At full size §232's Roman is legible directly;
§233's Tibetan script needs cropping and upscaling 3–5× (PIL is available). Read §232 for anything
that can be read there: it is ordinary Latin type and carries none of the Tibetan-glyph misread risk
that `test/fixtures/rgob.ts` exists to warn about. Read §233 to settle the rows where his Roman slips,
which it does at 8 and 38.

**Run the generator unchanged before editing it.** A baseline that reproduces the committed fixture
byte-for-byte — after `npx biome check --write`, which the raw output needs — is what makes a later
diff attributable to your change rather than to a source that has moved since the last run. It costs
one full pass, about four minutes, and without it a single altered cell is unattributable. This is the
same principle as proving a guard by mutation, one step earlier: establish that the instrument reads
zero before you measure with it.

**archive.org serves Sewell intermittently.** It answered a 500 page three times in a row during one
session, which `curl -sL` saves silently — the same trap the arXiv `-L` rule exists for. The
generator now diagnoses a Sewell text that yields readings for fewer than 30 of 60 positions as a
broken download rather than as a source that disagrees.

## What is still open

One row of sixty carries no Sanskrit meaning, and it is closed rather than unfinished. **38 क्रोधी**:
its adjective sense is a bare "id." — MW's *idem*, a pointer with no text — and its noun senses are
"a buffalo", "a dog", "a rhinoceros". Resolving the pointer needs the entry printed immediately
before it, and that was tested: Cologne's `getword.php` is keyed by headword only, there is no lookup
by record ID, and none of the plausible preceding headwords exists. Borrowing position 59's "inclined
to wrath" is rejected — क्रोधन is a different headword, and that is the error that put "you both" on
position 9 and "opposition, hostility" on 23.
