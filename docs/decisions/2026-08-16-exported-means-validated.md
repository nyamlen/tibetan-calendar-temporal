---
date: 2026-08-16
status: accepted
---

# A tradition config is exported only when its dates are validated day by day

**Decision:** a `TraditionConfig` reaches `src/index.ts` only once the engine has been tiled against
an **external** calendar for that tradition, day by day. Expressing a tradition, validating its leap
months, and validating its dates are three separate claims, and only the third earns an export.

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
| Phugpa | yes | yes | yes — three implementations + FPMT, 2022–2027 | **yes** |
| Bhutanese | yes | yes — Janson's table, 2000–2030 | yes — Henning's data, 2000 to early 2030 | **yes** |
| Tsurphu | yes | yes — Janson's table, 2000–2030 | **no** | no |
| Mongolian | yes | yes — Janson's table, 2000–2030 | **no** | no |

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
