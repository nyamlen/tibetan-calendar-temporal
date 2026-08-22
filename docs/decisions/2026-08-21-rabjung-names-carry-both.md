---
date: 2026-08-21
status: accepted
---

# `Rabjung.name` carries the Tibetan tradition's name and the Indic list's name together

**Decision:** `Rabjung` gets a required `name: RabjungName` field. `RabjungName extends TibetanName`
and adds `sanskrit: SanskritName`, where `SanskritName` is `{ devanagari, iast, meaning }`. The
Tibetan tradition's name is the base `TibetanName`; `sanskrit` is the Indic saṃvatsara list's name at
the same position, sourced from Monier-Williams — and is **not** a gloss of the Tibetan name at two
positions where the traditions genuinely diverge.

## Who this is for

The primary actor is someone reproducing or rendering a printed almanac table, not someone reading a
date aloud. That is why the field sits on `Rabjung` — data about the calendar's naming systems —
rather than as a headline identifier on `TibetanDate` itself, and why it is unsurprising that its
evidence tier is weaker than the vocabulary in `names.ts` (see
[2026-08-16-names-are-data-not-locales.md](2026-08-16-names-are-data-not-locales.md), which
anticipated this field but expected it "authored, unsourced" — what shipped is stronger than that:
sourced from Monier-Williams via the Cologne scan, with an authored *selection* where he offers
several senses, not an authored *meaning*).

## `sanskrit` is not the Sanskrit of the Tibetan name at 29 and 52 — do not reconcile them

The Tibetan tradition's Sanskrit (Janson's ASCII, Tibetan-lineage) and the Indic saṃvatsara list
mostly translate each other, but not everywhere. Re-derived against the corrected Indic column:

| # | Janson *(Tibetan lineage)* | Indic | English of the Tibetan | Verdict |
|---|---|---|---|---|
| 20 | `aksaya` | अव्यय/व्यय Avyaya/Vyaya | Inexhaustible | **Not a divergence.** Janson's ASCII matches the *first* alternative of the compound cell, the same reading the Tibetan `mi zad` takes — a within-cell selection question, not two traditions naming different things. |
| 29 | `mada` | मन्मथ Manmatha | Intoxicating | **Divergent.** Intoxication against the god of love; the Tibetan sides with Janson. |
| 39 | `visvabandhu` | विश्वावसु Viśvāvasu | Manifold wealth | **Open.** `dbyig` is wealth — *vasu*, not *bandhu* — so the Tibetan sides with the Indic, suggesting Janson's ASCII is corrupt here rather than that the traditions diverge. |
| 52 | `kaladuti` | कालयुक्त Kālayukta | Messenger of time | **Divergent.** kāla-dūtī against "joined to time"; the Tibetan sides with Janson. |
| 60 | `ksayaka` | क्षय Kṣaya | Exhaustion | **Dissolved.** Both are kṣaya — a correction to the Indic column (अक्षय → क्षय) removed what had been recorded as the table's clearest divergence. |

Two confirmed divergences (29, 52), one dissolved (60), one reclassified (20), one open (39). At 29
and 52 `RabjungName.sanskrit` genuinely names something other than the Tibetan name at that position,
and that is the honest state of the sources — do not attempt to pick a winner or average the two.

**Why this is prose here rather than a `sharesNameWithTibetan` boolean field.** A flag is additive
later and therefore free to defer; shipping one now would bake in an interpretation — "divergence" as
a binary — before the evidence for anything beyond 29 and 52 is settled (20 is reclassified, 39 is
open, and a flag would have to choose how to represent both). Say so where a reader actually meets the
field, too: `RabjungName`'s own docblock in `src/types.ts` carries the same table in miniature, with
29 and 52 as the worked divergence and 40 (parābhava/`zil gnon`) beside them as the ordinary
agreeing case.

## Janson's ASCII is dropped from everything shipped

It is the only mechanical divergence detector — see the table above — which is precisely why it is
useful and precisely why it does not ship: it collides three distinct names onto the literal string
`pramadi` (positions 4, 13, 47), so re-transliterating it into IAST for display would manufacture
authority the source does not have. It stays generator-internal and document-only, in
`docs/names/rabjung.md`'s divergence section, never in `test/fixtures/rabjung-names.ts` and never in
`src/`.

## `extends` rather than nesting the Tibetan half

```ts
interface RabjungName extends TibetanName {
  sanskrit: SanskritName;
}
```

Considered and rejected: `{ tibetan: TibetanName; sanskrit: SanskritName }`. That would make the
script reachable only as `rabjungFor(2153).name.tibetan.tibetan` — which reads as a typo in every
review, permanently.
[TibetanWeekdayName extends TibetanName](../../src/types.ts) is the precedent this follows.

**A trade-off stated rather than buried.** Extending `TibetanName` privileges the Tibetan as the
identity and makes the Sanskrit an attribute, which runs against the fact that the Sanskrit name
came first historically. It is still right here: this is a Tibetan calendar package and `Rabjung` is
the Tibetan cycle's numbering.

**Do not clone `TibetanName` into a near-identical type to avoid `RabjungName`'s two documented
exceptions to it** (below). Structural typing makes the two interchangeable anyway, so the separation
would be documentation pretending to be enforcement.

## `TibetanName`'s docblock states two things false of this subtype, fixed by adding the exception rather than rewriting the rule

1. *"There is deliberately no English field... the English identity is already carried by the
   sibling union."* For a rabjung name there is no sibling union — the key is a bare integer 1–60 —
   so the rationale does not hold. The English question is answered on `SanskritName.meaning`
   instead, where the English is actually sourced.
2. *"English Wiktionary must have an entry at exactly that title."* That is the vocabulary
   (`names.ts`) standard. The rabjung table's own standard is Monier-Williams via the Cologne scan
   and a stated normalisation ladder — weaker, and named as such rather than silently substituted.

## Script before transliteration, in both new types

```ts
interface SanskritName {
  devanagari: string;
  iast: string;         // derived from devanagari
  meaning: string | null;
}
```

Matches `TibetanName`'s field order — script first, because it is the name; the other renderings are
ways of reaching it. `CLAUDE.md`'s "IAST plus Devanāgarī" convention is a **prose** rule; this is a
**shipped-data** convention. The two are separate axes and both stand: house style cannot be verified
against anything, so it governs prose, while a shipped or tabulated data column is governed by
whatever standard actually produced it — here, `iast` is mechanically derived from `devanagari`, not
independently sourced, so leading with the derived value would misrepresent which one is primary.

## `meaning` is one field, not two, despite the fixture keeping the distinction

`test/fixtures/rabjung-names.ts` distinguishes `selected` (a verbatim quote of one printed
Monier-Williams sense, on 58 of 60 rows) from `composed` (assembled from his entries for a compound's
two parts plus the Tibetan as disambiguator, on the other 2) — a real distinction at the generator
level, load-bearing there because `selected`'s whole guarantee is that it is *always* a verbatim span.

**A first pass shipped both as separate nullable fields on `SanskritName`, carrying that distinction
straight into the public type.** Reversed on review: a consumer of this package wants "the English
gloss for this name," not to learn which of two sourcing mechanisms produced it, and two nullable
fields for something that differs on 2 of 60 rows is public surface earned by our editorial process,
not by the calendar — exactly the class of internal detail `mwPage`, `selectedSenseId` and the rest
of the evidence columns are already kept out of `SanskritName` for. `meaning` is null only where
nothing in Monier-Williams renders the Tibetan name at all; `docs/names/rabjung.md` still shows,
per row, whether a meaning is verbatim or composed, for anyone who wants that provenance.

## The provenance/API boundary

Nothing else added to the fixture crosses into `SanskritName`: `mwPage`, `mwQueriedAs`,
`selectedSenseId`, `brihatSamhitaPosition` and `corroborators` are evidence, not calendar data. Only
the merged `meaning` crosses.

## The one-way door

`name` is **required** on `Rabjung`, decided against the completed, fully-sourced table rather than
in the abstract — free now at `0.0.1`, a breaking change after `1.0.0`. Optionality was investigated
and rejected on evidence: `expect(x).toEqual({ cycle, year })` fails on an extra *runtime* property
regardless of what the type declares, verified directly against vitest, so `name?:` would have saved
none of the 14 migrated assertion sites while costing a permanent narrowing burden under
`exactOptionalPropertyTypes: true` for a field that is total over 1–60.

**A non-enumerable lazy getter** was proposed as a third option once the assertion-migration churn
became visible, and rejected: invisible to `JSON.stringify` and `toEqual`, it buys zero test breakage
by defeating the feature — a consumer persisting a `TibetanDate` would silently lose the name. Lazy
getters remain the escape hatch *if measured serialised size becomes a problem*
(`test/serialisation.test.ts`), which is a different trigger and one nothing has measured as met.
