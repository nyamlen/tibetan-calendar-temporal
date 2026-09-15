---
date: 2026-08-25
status: accepted
---

# `Rabjung.name` carries the Tibetan name and neither Sanskrit list

**Decision:** `Rabjung.name` is a plain `TibetanName` — script, Wylie, phonetic. Neither Sanskrit
list ships in the type. `RabjungName` and `SanskritName` come off the public surface, and
`SanskritName.meaning` with them. Both lists stay in full in
[names/rabjung.md](../names/rabjung.md), in `test/fixtures/rabjung-names.ts` and in
`scripts/verify-rabjung-names.mjs`. This supersedes
[2026-08-21-rabjung-names-carry-both.md](2026-08-21-rabjung-names-carry-both.md).
**Amended 2026-09-13, corrected 2026-09-14:** the field is now `Rabjung.tibetanName`, and if the Sanskrit returns it sits beside that field in the two-list shape below — see [the amendment](#amended-2026-09-13-the-field-is-tibetanname-and-the-two-lists-would-sit-beside-it).

## The rule this follows

**A published type must not be able to mislead a consumer who has not read a document.**

There are two Sanskrit lists for this one cycle, and they carry different names at 16, 17, 18, 20
and 34. Any type that ships one of them beside the Tibetan name is a type in which those five rows
pair a Tibetan name with a Sanskrit name it does not render — 8% of years, silently, with nothing
about the output looking wrong. The 2026-08-21 shape defended that with a docblock saying `sanskrit`
is "not reliably a gloss of the Tibetan name". That defence requires the reader to have read it,
which is exactly the safety this project refuses elsewhere — see
[2026-08-12-public-surface.md](2026-08-12-public-surface.md), whose **wrong-or-impossible** test
covers contested conventions, and two lists for one cycle is a contested convention by construction.

The Tibetan name is not contested. Csoma's §232 column agrees with all sixty Wylie strings under a
rule, with four declared exceptions. So the type ships the part two independent witnesses agree on
and stops there.

## What this costs, stated rather than buried

A consumer cannot print "Year 40 of cycle 17 — *Parābhava*" from shipped data alone. That is a real
thing an almanac renderer wants, and it is the whole argument on the other side. It is accepted
because **the smaller type can grow into the larger one without breaking anybody, and the larger one
cannot shrink**. Nothing sourced is lost from the project: `docs/names/rabjung.md` ships to npm and
carries both lists with a verdict per divergent row.

## The growth path, which is why this shape and not a smaller one

`name` stays a **nested object** rather than being flattened onto `Rabjung` as `nameTibetan`,
`nameWylie`, `namePhonetic`. That is the one deliberate concession to a future in which the Sanskrit
returns: adding a field to the object `name` already is, is additive; growing three sibling fields
into six is not.

**Do not reserve the slot in the type system.** `interface RabjungName extends TibetanName {}` with
no members, kept so that a later field has somewhere to go, does not merely buy nothing — it creates
a migration hazard that its absence makes impossible. Compiled both ways before this was written:

| Consumer code | plain `TibetanName` → C | reserved empty interface → C |
|---|---|---|
| Reads: `r.name.tibetan`, destructuring, spreading, `<T extends TibetanName>` | compiles | compiles |
| `const t: TibetanName = r.name` | compiles | compiles |
| **Constructs** a `Rabjung` — a mock, a test double | breaks | breaks |
| `(n: TibetanName): RabjungName => n` | **cannot be written** | compiles today, **breaks** later |

The last row is the finding. An empty extension is interchangeable with its base, so publishing the
name invites a consumer to write exactly the code a later `sanskrit` field invalidates; with no
`RabjungName` exported, that code cannot exist. The third row is unavoidable under any route to C —
adding a required field breaks object literals — and so is not an argument either way.

## If it does come back, it comes back as both lists, in this shape

Shipping one list is the thing this record rejects; shipping both is the shape that would be
correct. Recorded here so that the work of designing it is not redone, and so that a contributor
proposing "just add `sanskrit` back" can see what they are actually proposing:

```ts
export interface RabjungName extends TibetanName {
  sanskrit: {
    /** Varāhamihira's saṃvatsara list. Devanāgarī is its attested script. */
    indic: { devanagari: string; iast: string; meaning: string | null };

    /** The name the Tibetan renders. Tibetan script is the only script attested for it. */
    rendered: { tibetanScript: string; roman: string };

    /** The two are different names at this position — true at 16, 17, 18, 20 and 34. */
    diverge: boolean;
  };
}
```

Three things that shape gets right, and they are requirements on any replacement, not decoration:

- **`meaning` sits only on `indic`.** Only that list has an attested Devanāgarī, so only it has a
  Monier-Williams key. The other list's attested script is Tibetan, and no source enumerates it in
  Devanāgarī — producing one would be the back-transliteration this project refuses. The asymmetry
  belongs in the type, where it is visible, rather than in prose.
- **`rendered` is populated at all sixty positions**, from Csoma's §233 plates, so nullability is not
  overloaded to mean "same as the other one".
- **`diverge` is explicit**, not left to the reader to derive by comparing two names.

And four implications a contributor must weigh before proposing it, because they are why it is not
being shipped today:

1. The access path becomes four levels — `rabjungFor(2153).name.sanskrit.indic.meaning` — and every
   `@example` in `src/cycles.ts` grows with it.
2. `name.tibetan` is the Tibetan name while `name.sanskrit.rendered.tibetanScript` is Sanskrit
   written in Tibetan script. Two Tibetan-script fields in one object; the second needs a sentence of
   explanation wherever it appears. `sanskrit.tibetanScript` directly is worse and was rejected for
   reading as a typo, the same objection that killed `name.tibetan.tibetan` in 2026-08-21.
3. `diverge` is a flag whose job is to warn a consumer about the type's own structure. That is a
   smell, and it is load-bearing here rather than avoidable.
4. A consumer cannot tell whether to reach for `indic` or `rendered` without understanding a
   two-list distinction that took six sessions to establish. Compare the rule that a consumer should
   not need to know how a value was sourced to pick the right field — that rule is about mechanism
   and this split is about two genuinely different names, so it does not forbid the shape, but the
   confusion it warns of is present all the same.

**The trigger for revisiting is a stated consumer need**, not tidiness and not symmetry with the
rest of the naming layer. Symmetry is how `sanskrit` arrived in the first place, and how
`elementNameFor`, `genderNameFor` and `animalNameFor` arrived before being removed on 2026-08-25 for
never having been argued for.

## What must not be deleted as newly unused

The data is what keeps the path above cheap, and none of it is reachable from `src/` any more:

- `test/fixtures/rabjung-names.ts` keeps **every** column — `devanagari`, `iast`, `senses`,
  `selected`, `composed`, `csomaTibetan`, `csomaRoman` and the evidence fields. The fixture is
  deliberately fuller than the shipped type; that is not drift.
- `scripts/verify-rabjung-names.mjs` keeps re-deriving all of it, and its nine corrections keep
  self-invalidating.
- `docs/names/rabjung.md` keeps tabulating both lists, and
  [names/rabjung-sourcing.md](../names/rabjung-sourcing.md) keeps the hunt.

A test comparing `src/` against the fixture now asserts a **subset** of it. That is deliberate and
must stay deliberate: do not "fix" the asymmetry by trimming the fixture to match the type.

## A shipped document's stated reason goes stale with this

`package.json#files` ships [how-it-is-calculated.md](../how-it-is-calculated.md), and the reason
recorded on 2026-08-24 was that the shipped types carry a claim a consumer cannot evaluate without
it — that `RabjungName.sanskrit` is one of two Sanskrit lists. Under this decision no such claim
ships. The document stays shipped, because its two-lists section and its register section are the
only place a consumer learns why a Tibetan year name is not a translation of the Sanskrit one they
may know. **Rewrite the reason; do not leave it standing and false.**

## Amended 2026-09-13: the field is `tibetanName`, and the two lists would sit beside it

`Rabjung.name` became `Rabjung.tibetanName` when the month-names work fixed one rule for the whole
surface: an object carrying names keys each language explicitly, as `TibetanYearName` already does
with `elementName` and `animalName`.
A bare `name` holding specifically the Tibetan name was the one exception.
This is not the `name.tibetan.tibetan` path the 2026-08-21 record rejected as reading like a typo:
the script is reached as `tibetanName.tibetan`.

**Nothing about what ships changes.** Neither Sanskrit list is on the type, for the reasons above.

**What changes is where the two-list shape would go if it returns.**
The growth path above put it *inside* the name object, as `name.sanskrit`, because that object was
the one place a field could be added without breaking anybody.
With the object now called `tibetanName`, a Sanskrit field inside it would be Sanskrit filed under
the Tibetan name, so it would sit on `Rabjung` beside `tibetanName` instead — still additive, and still
without flattening the Tibetan renderings onto `Rabjung`, which is the part of that section that stands.
The shape is otherwise exactly the one recorded above, and every requirement on it still holds:

```ts
// position 34, where the two lists name different things
{
  cycle: 17,
  year: 34,
  tibetanName: { tibetan: "ཀུན་ལྡན", wylie: "kun ldan", phonetic: "kün den" },
  samvatsaraNames: {
    indic:    { devanagari: "शार्वरी", iast: "Śārvarī", meaning: "belonging to night, nocturnal" },
    rendered: { tibetanScript: "སརྦཔཏི", roman: "Sarvapati" },
    diverge:  true,
  },
}
```

Measured against the four implications listed above, the placement helps with two and leaves two:

1. **The path shortens by a level**, to `samvatsaraNames.indic.meaning`.
2. **The two Tibetan-script fields no longer share an object**: the Tibetan name is `tibetanName.tibetan`,
   and the Sanskrit written in Tibetan script is `samvatsaraNames.rendered.tibetanScript`.
3. `diverge` is still a flag warning about the type's own structure.
4. A consumer still has to understand the two-list distinction to choose between `indic` and `rendered`.

**It is not a `SanskritName`.** `SanskritName`, which joined the root barrel on 2026-09-13 for the yogas and
the six seasons, is `{ iast, devanagari }`. It cannot carry this shape: `rendered` has no attested
Devanāgarī, only `indic` has a Monier-Williams `meaning`, and `diverge` belongs to neither list.
Reusing `SanskritName` for a rabjung would mean shipping one list, which is the thing this record rejects.

**The key is `samvatsaraNames`**, decided by Andreas on 2026-09-15. It names what the object holds — this position's name in each of the two saṃvatsara lists — where the working name before it, `sanskritByList`, named only how the object is laid out.

**It is a deliberate exception to "keys are English, never ASCII Sanskrit"** (2026-09-13), and the exception is narrow.
*Samvatsara* is the word English writing on the Indian calendar uses for this cycle, in the same way `rabjung` is already an identifier on this surface (`Rabjung`, `rabjungFor`): a loanword naming a calendrical system that has no English name.
It does not license an ASCII Sanskrit or Tibetan key for a *value* — a trigram, an observance kind — where an English word exists.

**The plural keeps the objection that sank `sanskritNames`**: it reads as several names for one thing, which is the misreading the two lists invite at 16, 17, 18, 20 and 34, where they are different names.
The key alone does not guard against that; `diverge` does, and it must stay on the shape for as long as this key does.

Rejected along the way: `sanskritNames`, for the plural above with nothing to say which system; `sanskritLists`, which names the structure but claims to hold the lists rather than one entry from each (used in the first version of this correction, 2026-09-14); `sanskritListEntries`, accurate and too long; `sanskritReadings`, because "reading" already means one of Csoma's braced alternatives at 29 and 52, which is a different thing; and `sanskritByList`, the working name until 2026-09-15.

**Corrected 2026-09-14.** The first version of this amendment said the Sanskrit "would return as a sibling
`sanskritName` on `Rabjung`", implying the new `SanskritName` type. That silently replaced the two-list
shape above with one that cannot express it, and it was written during an overnight session without
being put to Andreas. The placement beside `tibetanName` stands; the claim that it would be a
`SanskritName` was wrong, and the trigger for revisiting is unchanged — a stated consumer need.
