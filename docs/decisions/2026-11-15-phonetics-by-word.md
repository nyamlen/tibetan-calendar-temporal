---
date: 2026-11-15
status: accepted
---

# Phonetics are THL's word-separated output, with boundaries and corrections held as data

**Decision:** every shipped multi-syllable `phonetic` is THL's "Words separated by" output, produced by `scripts/thl.mjs`.
A two-syllable name is one word and is joined.
A name of three or more syllables is split by a row in `scripts/word-boundaries.data.json`, and the split is Andreas' ruling, not a computation.
No dictionary check decides where a word ends.
A correction of THL's output is data in the verifier that emits the fixture, and a name meeting one of THL's three nasal rules needs a ruling in `scripts/nasal-rulings.data.json`.
The method is in [docs/names/phonetics.md](../names/phonetics.md).

## Constraints this places on a contributor

- **Do not decide a boundary by looking a candidate up.**
  The dictionaries list phrases and single syllables alike: 114 of the 123 multi-syllable shipped names are headwords whole, and both `nyi-ma` and `nyi ma` pass a headword test.
  A headword check can say that a word exists and cannot say where a word ends, so the gate only confirms that each ruled word exists.
- **Do not widen the gate to make a name pass.**
  A word that no accepted dictionary or enumeration admits needs a `gateException` in its boundary row, stating its evidence and the headwords it requires.
  The module re-checks those headwords on every run, so an exception that stops being needed fails instead of lingering.
- **Do not edit a fixture or `src/` to change a phonetic.**
  A correction of THL's output is an entry in its verifier's `CORRECTIONS` (`PHONETIC_CORRECTIONS` in the rabjung verifier) carrying `thlExpected`, `correctedTo` and its evidence.
  The run refuses if THL no longer returns `thlExpected`, and the fixture row records both values, so a reader can see which phonetics are THL's and which are not.
- **A name meeting one of THL's nasal rules needs a ruling.**
  THL's output depends on its `middle_nasals` option, which its web form does not expose and which is on by default.
  `test/nasal-rulings.test.ts` fails for a shipped name with a junction and no row in `scripts/nasal-rulings.data.json`, for a row naming no such junction, and for a shipped value that differs from the ruling.
  The three rules and the policy applied to them are in [docs/names/phonetics.md](../names/phonetics.md).
- **A silent final is replaced by THL's `n` as THL gives it; a pronounced or nasal final is kept.**
  *chönkhor*, *dünjom* and *senchang* stand as THL gives them, and *peln-gyur*, *topden*, *namgyur*, *namchang* and *yongdzin* keep the final THL would replace.
  There are eleven corrections of THL's output in all, each carried in its verifier.
- **Run the five name verifiers one at a time.**
  They share THL's converter, which answers with transient 503s when they run in parallel.

## Why it cannot wait until after 1.0.0

A phonetic is a shipped string, and a consumer who displays one or keys on it sees the change.
Where a word ends decides how a reader sees the name (*saga dawa düchen* is three words), so the rule is fixed before the first release rather than after.
Changing a ruled boundary or a correction later is a change to shipped strings, taken knowingly.

## Enforcement

`test/word-boundaries.test.ts` holds the boundary file against `src/`: a name of three or more syllables without a row, a row naming no shipped name, a marking that does not unmark to its Wylie, and the pinned exception rows and ruling dates.
`test/nasal-rulings.test.ts` holds the rulings file as described above.
Each verifier refuses to write its fixture when a check fails, and an outdated correction fails the same way.
What no test sees is a fourth nasal rule added by THL: [scripts/evidence/thl-middle-nasals/](../../scripts/evidence/thl-middle-nasals/README.md) says which of THL's code the three were read from.
