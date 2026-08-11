---
title: "No Temporal Calendar Protocol adapter"
date: 2026-08-11
status: decided
---

# No Temporal Calendar Protocol adapter

**Decision:** the planned "Level 2" API — registering a `TibetanCalendar` with Temporal's
calendar protocol — is dropped. It is not implementable. Any replacement is deferred to Phase 1.

## What the spec assumed

The original specification described a two-layer API. Level 2 was to expose a custom calendar
object:

```typescript
import { TibetanCalendar } from 'tibetan-calendar-temporal/temporal';
const date = Temporal.PlainDate.from({ year: 2153, month: 6, day: 15, calendar: new TibetanCalendar() });
```

## Why it cannot be built

Temporal removed user-defined calendars before shipping. Verified on Node v26.7.0 with native
Temporal, no flags:

```text
Temporal.Calendar exists?  undefined

custom calendar object REJECTED:
  TypeError: Temporal error: Calendar must be string or calendared Temporal object.

built-in calendars: iso8601 ✓  chinese ✓  hebrew ✓  indian ✓  japanese ✓
                    islamic ✗  tibetan ✗
```

`Temporal.Calendar` no longer exists, `calendar:` accepts only built-in CLDR identifiers, and
`tibetan` is not among them. There is no registration mechanism and no extension point.

## Consequences

- Removed from the architecture: `src/temporal.ts`, the `./temporal` subpath export, and the
  Two-Layer API section
- Phase 4 shrinks — it was scoped as "Temporal adapter + TypeDoc + publish"
- **Level 1 is unaffected**, and it was always the layer consumers would actually use: pure
  functions accepting and returning `Temporal.PlainDate`

## The package name remains accurate

`tibetan-calendar-temporal` was chosen to signal a Temporal-native implementation rather than a
legacy `Date`-based one. That is still exactly what it is — the engine speaks
`Temporal.PlainDate` throughout. It simply is not a *registered calendar*, which was never what
the name claimed.

## Deferred

Whether anything replaces Level 2 is a Phase 1 decision. The likely candidate is a
Temporal-shaped `TibetanDate` class exposing `add` / `subtract` / `until` / `with` / `toString`
— familiar ergonomics without pretending to be a registered calendar.

Deferred deliberately: defining what `add({months: 1})` means across leap months, doubled days
and skipped days is a domain question, and it should be answered once the core computation
exists rather than designed against an imagined API.

## Why TC39 removed it

Not a design preference — engine implementers pushed back on **code size**. Temporal's scope
was cut at the [June 2024 TC39 meeting](https://github.com/tc39/proposal-temporal/issues/2854)
at their request, over the cost of shipping it to limited-capacity devices such as low-end
Android phones and the Apple Watch.

The calendar and time zone protocols were targeted because they gave the largest complexity
reduction for the smallest loss of use cases:

- **Callable hooks were what implementations were most uncomfortable with.** A custom calendar
  means arbitrary user JS running inside date arithmetic, in an observable sequence, which
  blocks engine optimisation.
- **The efficiency assumption behind the design did not hold.** The protocol assumed computing
  each calendar property separately would be cheap. In practice it was not.
- **A Stage 3 change had already undermined it.** Global registration of custom calendar IDs
  was removed earlier, and that was the feature that made the rest coherent. What remained was
  a very large surface area serving a use case it could no longer serve properly.

## Will it return?

Left explicitly open, with no timeline or design: *"A future proposal could design a custom
calendar implementation that requires much less code size."* Do not plan around it.

Two points matter more than that possibility:

- **The champions committed to a proof-of-concept showing custom calendars polyfilled by
  wrapping or monkeypatching Temporal.** The use case was moved outside the standard, not
  abandoned. That is a direct endorsement of the wrapper approach deferred to Phase 1 — a
  `TibetanDate` class is the sanctioned path, not a workaround.
- **A built-in `tibetan` calendar would arrive through CLDR/ICU, not through Temporal** — the
  route `chinese`, `hebrew` and `indian` took. A different mechanism entirely, and nothing this
  package ships could influence it.
