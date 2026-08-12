---
date: 2026-08-12
status: accepted
---

# Validation lives at the public boundary, and the observance span is capped

**Decision:** every exported function validates its own input — integrality, range, and config
shape — and everything under `src/computation/` assumes that work is already done. `getObservances`
additionally refuses spans wider than 200 years.

## Add a guard when you add a public function

The boundary is the exported surface: `tibetanToIso`, `losarFor`, `isoToTibetan`, `getObservances`,
`observancesOn`. Below it, nothing re-checks, and nothing should — duplicating the guards on the hot
path costs real time in the multi-century sweeps and gives nothing back.

The rule exists because the opposite state is not obviously broken. Before this, the engine defended
its integer-arithmetic premise rigorously everywhere except where untrusted values enter, so
`tibetanToIso({ year: 2153, month: 3, day: 15.5 })` returned a well-formed `PlainDate` one day off,
with no throw and no warning. `NaN` passed too, satisfying neither `< 1` nor `> 30`. A plausible
calendar that is quietly wrong is the most expensive failure mode this project has, and it was
reachable from the primary public entry point by any JavaScript consumer, or any TypeScript consumer
whose input came from `JSON.parse` or a form field.

Validation had to land before v1.0.0. Adding it afterwards turns working consumer code into throwing
consumer code.

## Out-of-exact-range is not a skipped date

Past [`ScaledTradition.exactToJulianDay`](../../src/computation/scaling.ts) the arithmetic stops
being exact. Do not let that surface as `SkippedDayError`. A degraded `true_date` misclassifies the
day, so overflow used to be reported as a specific, confident claim that a date does not exist —
when in truth it was never computed. The correct response to `SkippedDayError` is "fine, that date
does not exist"; to an exact-range failure it is "my input is out of range".

Check the bound **before** `classifyDay`, not after: by then the precision is already gone. The
check uses the mean date, which is within 0.6 days of the true date and whose denominator divides
`commonDenominator`, so it stays exact over a wider range than the quantity it guards.

This is not theoretical. `PHUGPA_HENNING`'s common denominator is 15× Phugpa's, putting its exact
limit near year 11,356 — reachable inside `Temporal.PlainDate`'s own range, which reaches +275760.

## Predicates catch narrowly

`tibetanDateExists` catches `SkippedDayError` and `RangeError` and rethrows everything else. Do not
widen it back to a bare `catch`. It is the oracle for the Tier 1 property that skipped days are
never observance days, so a swallowed internal failure would make that property pass *more* easily
rather than fail.

Two exclusions ride on top of that, because the error *type* alone is too coarse. The internal
invariant violation in `isoToTibetan` is a plain `Error` rather than a `RangeError`, so the branch
never sees it. A malformed `TraditionConfig` *is* a `RangeError` — it is genuinely bad input — and
is excluded by **code** instead, via `hasCode`. See
[the error-code record](2026-08-12-error-codes-not-classes.md).

## The 200-year span cap is deliberate, and is a one-way door

Do not remove it, and do not raise it without treating that as a breaking change.

`getObservances` is linear in the requested range, and the work per month is real — mean motion, two
correction tables, and a full `isoToTibetan` inversion per hit. `Temporal.PlainDate` spans about
547,000 years, which is roughly ten minutes of synchronous, non-yielding CPU. Any service forwarding
user-supplied `from`/`to` hands that to its event loop.

Two things to know about the number:

- It is **measured as `to.year - from.year`**, not as elapsed days, so the invariant suite's
  1950-01-01 → 2150-12-31 sweep — 201 calendar years — remains admissible. A day-counted cap breaks
  a passing test.
- 200 is a judgment, not a derivation. It is far beyond real use: the Phugpa tradition dates from
  1447, and a caller wanting more chunks the range and concatenates, which is correct because the
  function is pure and restarts its month walk per call.

Worth recording that a numeric span cap is **not** a common library pattern. Services cap result
count instead (`maxResults`); date libraries mostly do not cap at all, and the nearest precedent is
`rrule.js` refusing `.all()` on an infinite rule. The justification specific to this library is the
per-month cost above, which is orders of magnitude beyond a day-walker like `eachDayOfInterval`.

## Consumer configs are validated once per object

**Both** config types, on the same pattern: checked rather than trusted, memoised on a `WeakSet`
keyed by the config object — the same bargain `scalingFor` already makes with its `WeakMap`. A
consumer who mutates a config in place after first use escapes revalidation; that is accepted, not
overlooked.

`ObservanceConfig` is validated by `validateObservanceConfig` in `src/observances/index.ts`;
`TraditionConfig` by [`assertTraditionConfig`](../../src/traditions/validate.ts), called from both
`scalingFor` functions, which are the single choke point every public entry reaches. Because the
scaling derivation is already memoised per object, the check costs nothing after the first call —
which is what lets it be thorough without touching the hot path.

Add a config type, and it gets a validator. `TraditionConfig` went unchecked for a while despite
this record already requiring "integrality, range, **and config shape**", and the gap was invisible
because the failure looked like a language error rather than a missing feature: a partial mean
motion surfaced as `Cannot read properties of undefined (reading 'den')` from inside
`scaleMeanMotion`, naming neither the field nor the config, and a `moonTab` of the wrong length
reached an interpolation that indexed past its end and returned `NaN` — which propagates into a
date rather than failing.

Both validators check **shape, not astronomy**. Plausible constants that are wrong pass and produce
a plausible calendar that is wrong; only a fixture catches that. Do not let the presence of a
validator suggest otherwise in a docblock.

The mean-motion formulas are linear in the lunar day, so an unvalidated rule did not fail, it
extrapolated: `when: { day: 31 }` returned the 1st of the *following* month labelled
`resolution: "exact"`, while an out-of-range `when.month` matched nothing and the observance vanished
from the year. Both ship a wrong date to practitioners with the library's full authority behind it.
