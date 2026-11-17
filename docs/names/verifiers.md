# Working on the name verifiers

The operating rules for the five name verifiers (`verify:names` and the four `verify:*-names` scripts): what the copyrighted dictionaries may contribute, which witnesses count, how corrections are held, and the traps in the shared readers.
The sourcing records beside this page say what each verifier decided; this page says how they all work.

## Running the verifiers

**Run the five name verifiers (`verify:names` and the four `verify:*-names` scripts) one at a time.** They share THL's converter, and it answers
with transient 503s when they run in parallel, which reads as a source that moved. A run that fails on
a 503 says nothing about the names: run it again alone.

**`verify:rabjung-names` emits one row per line and Biome reflows it, so run
`npx biome check --write test/fixtures/rabjung-names.ts` after every run.** Skipping it surfaces
as an unattributed formatting diff — `biome
check .` reports it without naming the file, and the obvious suspects are the files you just edited
rather than the one the generator rewrote. Provenance is checked before a release;
integrity is checked on every push.

**A generator's header carries a date stamp that changes on every run, so restore a file that differs
only by it** with `git checkout -- <file>`, unless the file is legitimately regenerated. A stamp-only
diff in a fixture you did not mean to change is churn in review and hides the run that did change
something.

## Copyrighted dictionaries and witnesses

**`verify:rabjung-names` also gates the authored English on Tibetan-dictionary facts, and the
licence line there is narrow.** The copyrighted dictionaries — Ives Waldo, Rangjung Yeshe and the *tshig
mdzod chen mo* here, and the *dung dkar tshig mdzod chen mo* in `verify:month-and-yoga-names` and `verify:mansion-and-trigram-names` — may **gate** and may never be **quoted** — they are modern copyrighted works, so exactly four
facts are taken: that a headword exists, the cycle position an entry states, the element–animal
year an entry states, and the register tag on a sense — plus three approved for the elemental-yoga
check and listed in the script's table: the spelling of each member of a set an entry enumerates,
**the element pair an enumeration assigns each member, and the grouping it states** — the *tshig mdzod chen mo*'s `'phrod sbyor` closes "three good,
three restorative, three bad, one worst". **The grouping gives sizes, never members**, so which yoga is
in which group is not a taken fact but an inference from list order, and it is marked as one in the
fixture, the `auspiciousness` docblock and the guide. The script's table is the authoritative list
of taken facts; do not restate its count here. **No gloss text is stored, printed or emitted**, and the year is computed from
the cycle and never read off a dictionary, which is what stops the check being circular. The reading
logic lives in `scripts/tibetan-dictionary.mjs`, shared with `scripts/survey-ngonjo.mjs` and both
newer verifiers — including `fetchAggregate`, which refuses the 469-byte error page
the aggregate's host serves with a 200 rather than reading it as a dictionary with no headwords — and carries
the traps that logic exists to avoid — chief among them that **a register tag has two scopes** and
that **the prefix before an entry's first numbered sense is a sense**, not merely where a tag lives.
The second was live through the whole ngönjö survey and cost nothing there, because the *tshig mdzod
chen mo*'s prefix is a bare tag; Ives Waldo puts the entire gloss there, so the same code discarded
the text being checked. A rule that is harmless on the source it was written against is the failure
mode to expect here.

**A copyrighted dictionary's headword may count as a witness, and it still only gates.**
`verify:observance-names` accepts a headword of the *tshig mdzod chen mo* or the *dung dkar tshig
mdzod chen mo* as one witness for a term or a person: the fact taken is that a headword exists, and
nothing from either is quoted or stored. **The two together are one group, never two witnesses**,
because both are modern Tibetan–Tibetan compilations. Without the allowance a name meets a
two-independent-witnesses rule only by a loosening of the rule, which is the wrong end to give way.
A witness must state the proposed spelling itself, equal to it or opening with it as whole words —
BDRC's *sgam po pa bsod nams rin chen* states *sgam po pa* — and a near spelling, another honorific or
a different word division, is not a witness.

**A witness the verifier cannot fetch is held as a data file marked human-supplied, and is never
described as fetched.** Rigpa Wiki answers the verifier with a Cloudflare challenge (403), so its four
düchen passages were read in a browser and pasted by a person, and are held in
`scripts/observance-name-rigpa-passages.data.json`. The verifier checks the committed strings against
the name and refuses if they differ or the file is missing; it makes no fetch, so **its baseline
cannot detect the page changing**. Wherever the verifier's evidence is described — a record, a docblock,
a report — say that these passages are human-supplied. Do not work around the 403.

**The approved witness types are a short list, and each counts once as a group.** For a person: BDRC's
person record (identity anchor, and a spelling witness only where it states the proposed spelling), a
gate-only headword, a Lotsawa House page heading or a work's own title page (one group), Tibetan
Wikipedia's title or list (one group), and a Google Books catalogue record whose published title
opens with the exact spelling. For a term: a dictionary head word read from a page image or entry, the
Mahāvyutpatti's pairing, and Rigpa Wiki as a whole-term witness, human-supplied. Check 5 tests each word of a
marked name whole against the headwords of the Mahāvyutpatti and the two Tibetan–Tibetan dictionaries, through
one rung of Tibetan morphology, an ordinal or agent ending (`-pa`, `-ba`) that may be absent from the
headword carrying the stem (*bcu drug pa* is found under *bcu drug*), or by a recorded `gateException` in
`scripts/word-boundaries.data.json`. Check 3 has the opposite
ladder beside it, `forms()` in `scripts/verify-observance-names.mjs`, which adds the endings *ba* and *pa* as separate
syllables on the dictionary side. Both are rules of Tibetan spelling true of every word they touch, so each changes
what is looked up and nothing the table prints.

## Corrections

**Both verifiers carry corrections to their sources as data, and a correction must self-invalidate.**
It states the value it expects to find and refuses to run if the source no longer says it, so a
correction that stops being needed fails loudly instead of silently patching a source that has since
been fixed. There is one in the vocabulary — `spen ma` → `spen pa` — and nine in the rabjung names,
resting on three different kinds of evidence: Sewell & Fleet read directly (60 अक्षय → क्षय, 31
हेविळम्बि → हेमलम्ब), attestation (15, 37), Monier-Williams resolving a headword the table's spelling
does not reach (4 प्रमोदूत → प्रमोद), a homograph caught by reading the *sense* rather than the
presence of an entry (9 युव, the dual pronoun, → युवन्; 56 दुन्दुभी, a Gandharvī's name, → दुन्दुभि), and a
typo the source contradicts itself about (57 रूधिर → रुधिर), and an entry that is a bare stub where a
near neighbour is glossed (58 रक्ताक्षि → रक्ताक्ष). Do not patch a name by editing the output.

The phonetics carry eleven more, each Andreas' correction of THL's output, held as self-invalidating data
with `thlPhonetic` and `phoneticCorrected: true` in the fixture: *karmapa* and *pandita* in the
observance names, *lhantsam* in the mansion names, *mintün*, *peln-gyur* and *topden* in the
month-and-yoga names, and *khyunchok*, *namgyur*, *namchang*, *yongdzin* and *lo-ngen* in the rabjung
names (the hyphen in *peln-gyur* is deliberate). Every multi-syllable phonetic is THL's "Words separated by" output through
`scripts/thl.mjs`, a longer name split by `scripts/word-boundaries.data.json`. THL's nasal rules are
held by a policy and a ruling per name: an `m` prefix assimilates (P1), a pronounced final plus an added
`n` before `g` is hyphenated (P2), and a silent final is replaced by THL's `n` as THL gives it while a
pronounced or nasal final is kept (P3), in `docs/names/phonetics.md`.

**THL's output depends on a default option its web form hides, so the generation instrument is part of
the claim.** `middle_nasals` is on in THL's scheme and off in the Padmakara and Rigpa schemes, and the
form offers no way to change it. *khyu mchog* gives *khyumchok* with it on, and a comparison against a
tool run with it off disagrees for a reason that is not an error in either.

**A correction that rests on a dictionary *lacking* a sense is the least reliable kind, so write it as
self-invalidating data before anyone decides it.** Mansion 21 was once decided as *śravaṇa*
because Monier-Williams, read by hand, gave *śravaṇā* only as "a female monk or nun" — the rabjung 9
and 56 trap. The correction's own check refused on its first run: a separate entry on p. 1097 gives
*śravaṇā* as the nakṣatra, and the hand reading had seen two of five entries. An absence is established only by a reader that sees every entry, and the verifier's
"a headword **whose entry names the sense**" check, not the headword's presence, is what caught it.

## The Monier-Williams reader

**That reader is `entriesHeadedBy` in `scripts/cologne.mjs`, and it is the only one that sees every
entry.** Every Monier-Williams check in the mansion and month-and-yoga verifiers goes through it;
`verify-rabjung-names.mjs` keeps its own. A reader that took the **first** entry Cologne returned
shipped two wrong citations in fixtures. The yoga *siddhi* was cited at p. 1215, which is *1. siddhi* "driving off",
a homograph, while its own English was cited from p. 1216. The rains were routed through *varṣa*
under the stated belief that no entry is headed *varṣā*, and p. 927 heads it with "the rains,
rainy season". **Choose a page by the sense it prints, never by
position**: the first entry headed *varṣā* is a bare "See p. 927".

The shared reader's head-splitting has been wrong twice, and each time on a head shape nobody had
listed. The first time, it did not end a headword at a gender mark carrying its feminine
(`māgha mf( ī )n.`), so the head ran on into the definition. Here that
failed closed — four month names read as absent — but the same bug can make a word printed in a
definition ("relating to the constellation Maghā") count as a headword, which passes silently. The
second time, it missed a form headed **inside another record**, after a sense boundary:
`prati —kūlam ind. … [ ID=131428 ] prati —kūla n. inverted order, opposition`. Give every new head shape a self-proof case.

## Lookup rungs and the six mechanisms

**A correction is not a lookup rung, and conflating them inflates both.** A correction changes what
the rabjung table in [rabjung.md](rabjung.md) *prints* and needs authored evidence; a rung of the ladder in `scripts/indic.ts` changes
only what is *queried* and states a rule of Sanskrit — the `-in` stems printed in the nominative, the
anusvāra spellings, a missing virāma. Eleven of the sixty rows resolve only through a rung; none of
them is an editorial judgement.

**There are six ways a value reaches that table, and they are deliberately separate because they
carry different weights of evidence.** Collapsing any two inflates the weaker one:

| Mechanism | Changes | Standard it must meet |
|---|---|---|
| Correction | what is **printed** | Authored evidence, and the original must still be present |
| Lookup rung | what is **queried** | A rule of Sanskrit orthography or morphology, true of every row it touches |
| Preferred alternative | which reading of a compound **cell** is looked up | The Tibetan decides; the cell still prints both |
| Sense cross-reference | which **entry** is read | Monier-Williams' own pointer — "= -कर" — re-checked before it is followed |
| Abbreviation expansion | an entry's **text** | His ˚ convention, with the element resolved and its gloss verbatim |
| Composed meaning | a value **he never prints** | Both halves glossed by him, cited, and the Tibetan disambiguating the compound |

Only the first two change what a reader sees as sourced-verbatim. The last two produce a **weaker
tier**, marked ‡ in the table and held in its own field, because `selected`'s whole guarantee is that
it is a verbatim span of one printed sense. A composed gloss is offered rather than a blank because
returning nothing says "this name has no meaning", which for an ordinary transparent compound is
false — but it is never allowed to look like a quotation.

## Matching words

**`\b` does not bound a Sanskrit word in IAST, because JavaScript's `\b` treats a diacritic letter as
a non-word character.** `/\bmāsa\b/` matches inside *ṣaṇmāsa*: `\b` sees a boundary after *ṇ*. Use
`(?<!\p{L})…(?!\p{L})` with the `u` flag. Prove the predicate with a case that actually separates the
two: the first one written here, *samāsa*, has a plain *a* before *māsa*, so both regexes rejected it
and the mutant passed.

**A probe that predicts a check must use the same dictionaries as the check.** A probe that counted
the Jäschke and Das indexes found 3 failing words where the gate's dictionary arm, which excludes them, found 7,
each counted once per name: the extra sources admitted four word-in-name cases the gate refuses, and
the probe's reassurance was about a gate that does not exist.
