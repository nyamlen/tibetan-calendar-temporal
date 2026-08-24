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

- **Rangjung Yeshe Wiki** — behind a Cloudflare interstitial that returns 403 to any programmatic
  request, with a declared User-Agent or a browser one alike. An earlier note calling it
  "machine-fetchable" was wrong. This is a deliberate access decision by the site; do not work around
  it.
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

## Operational notes

**wisdomlib rate-limits.** A full sixty-row pass trips it, after which it answers `403` to every
User-Agent alike, a browser string included. Changing the User-Agent is not the fix and would be the
same working-around declined for Rangjung Yeshe Wiki. The generator sends one request before sixty
and aborts the whole run if the source is down, because an empty corroboration column would otherwise
be written into the table as a finding about Sanskrit rather than about our request volume.

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
