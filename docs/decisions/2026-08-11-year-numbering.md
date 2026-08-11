---
date: 2026-08-11
status: accepted
---

# `TibetanDate.year` is the royal-era numbering

**Decision:** `year` carries the 127 BC epoch numbering that almanacs print — 2153, not 2026.
Janson's *Y* is exposed separately as `yearStartsIn`. The engine computes in *Y* internally and
converts only at the public boundary. Do not "correct" `year` to match the paper.

## The constraint

Every formula in Janson is written in terms of *Y*, the Gregorian year a Tibetan year begins in.
A contributor reading the paper alongside `conversion.ts` will find `year: 2153` where the paper
says 2026 and reasonably conclude it is a bug. It is not.

```typescript
isoToTibetan(Temporal.PlainDate.from('2027-01-15'))
// year: 2153          royal era — what an almanac prints
// yearStartsIn: 2026   Janson's Y — for cross-referencing the paper
```

Both name the same Tibetan year. The conversion is `royal = Y + 127`, and it happens in exactly
two places: `isoToTibetan` on the way out, `tibetanToIso` on the way in. Nothing in
`computation/` sees the royal era.

## Why not Janson's Y in the public type

**`{ year: 2026, month: 11, day: 27 }` describes no date in any system.** It pairs a
Gregorian-derived index with a Tibetan month and day. Formatted the obvious way it yields
`"2026-11-27"` — well-formed ISO, pointing at 27 November 2026, when the actual day is 15 January
2027. Nothing about that string looks wrong, and it will end up in logs, filenames and
comparisons. `"2153-11-27"` cannot be misread that way.

**Temporal numbers every non-ISO calendar by its own year** — Hebrew gives 5786, Islamic 1447,
not a Gregorian index. This package is Temporal-native; matching that convention is the
consistent choice, and Hebrew's Anno Mundi is just as much a scholarly construct as the Tibetan
royal era.

**The remaining mistake is the loud kind.** Passing 2026 where 2153 is expected returns a date
127 years away, caught by the first test or the first render. A Gregorian-linked `year` fails by
six weeks every January — plausible, silent, and it ships.

## Consequences

- Cross-checking against Janson or another implementation goes through `yearStartsIn`. This costs
  most during Phase 2 validation, where every comparison is in *Y*.
- The royal era is a second-half-of-the-20th-century convention, and Janson notes epochs 255 and
  1027 were also used. For dates before roughly 1950 it is a modern label applied backwards —
  documented in TSDoc, alongside the two other back-projections (Phugpa before 1447, proleptic
  Gregorian before 1582).
- `yearName` — element, animal, gender, rabjung cycle and year — is what practitioners actually
  recognise, and is valid from 1027. For historical dates it is the correct label, not `year`.
- `TibetanDate` needs a documented string form so `${year}-${month}-${day}` is never hand-rolled.

Related: [no Temporal Calendar Protocol adapter](2026-08-11-temporal-custom-calendars.md), whose
deferred `TibetanDate` class would expose this same `year`.
