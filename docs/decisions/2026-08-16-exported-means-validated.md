---
date: 2026-08-16
status: accepted
---

# A tradition config is exported only when its dates are checked externally, and its docblock says how

**Decision:** a `TraditionConfig` reaches `src/index.ts` only once its **dates** have been checked
against an **external** calendar, and its docblock states exactly what was checked. Expressing a
tradition, validating its leap months, and validating its dates are three separate claims, and only
the third earns an export. A day-by-day tiling is the strongest form of the third claim, and a
config that has it may say "validated day by day". A config that has only a sample of externally
published days is still exported, but its docblock says it is a sample, names the days, and names the
config that holds the sweep. `BHUTAN_HENNING` has the sweep: 11,050 days against Henning's lineage in
`test/validation/bhutan.test.ts`. `BHUTAN` has 25 government-published days in
`test/validation/rgob.test.ts` and no sweep, and is exported on that. Windows live in
`docs/testing.md`.

## Why this is a separate rule from the public-surface record

[2026-08-12-public-surface.md](2026-08-12-public-surface.md) governs **functions**, and its tests —
wrong-or-impossible, or "does a calendar library normally provide it" — are about API design. A
config is not an API-design question. It is a **factual claim about a calendar**, and shipping one
asserts that dates computed with it are that tradition's real dates.

That claim fails differently from a badly-scoped function. A missing helper is an inconvenience a
consumer routes around. A config whose constants are plausible and wrong produces a well-formed
calendar that is quietly incorrect — the failure this package exists to prevent.

## What the rule licenses today

| Tradition | Expressible | Leap months validated | Dates validated | Exported |
|---|---|---|---|---|
| Phugpa | yes | yes | yes — day by day, four sources; window in [testing.md](../testing.md) | **yes** |
| Bhutanese, `BHUTAN_HENNING` | yes | yes — Janson's table | yes — day by day over Henning's data; window in [testing.md](../testing.md) | **yes** |
| Bhutanese, `BHUTAN` | yes | yes — Janson's table | sample only — 25 days of the Royal Government's calendar, no sweep; window in [testing.md](../testing.md) | **yes** |
| Tsurphu | yes | yes — Janson's table | **no** | no |
| Mongolian | yes | yes — Janson's table | **no** | no |

Tsurphu and the Mongolian version are fully expressible and their leap months are checked against
Janson. They are still not exported, and that gap is the rule doing its work rather than unfinished
business: nothing checks a Tsurphu *date* against anything.

`docs/traditions.md` carries worked constants for both, as data. A contributor may use them; the
package does not vouch for them.

## What this stops a contributor doing

- Exporting `TSURPHU` because the config in `docs/traditions.md` "obviously works". Its leap months
  do. Its dates are unchecked, and `m₀`, `s₀` and `a₀` for that version still need the epoch-offset
  reconciliation `docs/traditions.md` describes.
- Treating self-consistency as validation. A round trip proves the arithmetic inverts itself; it
  cannot detect a shared misreading of the paper. This bit during the Bhutan work — the inverse-pair
  round trip passed under a labelling that was consistently wrong, and only external data settled it.
- Exporting on the strength of a **month-level** check. Leap months depend on nothing astronomical,
  so agreement there says nothing about `m₀`, `s₀` or `a₀`.

## Enforcement

`npm run check:conventions` requires every config exported from `src/index.ts` to be exercised by a
suite in `test/validation/`. That is a weaker statement than the rule — a test could reference a
config without validating much — but it is the part a machine can see, and it fails loudly on the
mistake the rule is actually about: adding an export without adding evidence.

The window each config is validated over belongs in `docs/testing.md`, and citing agreement without
citing the window is what that file exists to prevent.
