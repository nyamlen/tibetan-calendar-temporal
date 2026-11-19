---
date: 2026-08-12
status: accepted
---

# Validation lives at the public boundary, and the observance span is capped

**Decision:** every exported function validates its own input — integrality, range, and config
shape — and the internals under `src/computation/` assume that work is already done. The exception
is `src/computation/conversion.ts`, which is itself a boundary file: it holds root exports
(`isoToTibetan`, `tibetanToIso`, `losarFor` and others) and the boundary homes `asWesternDay`,
`monthCountFor` and `julianDayOfFields`, so its guards are not redundant. `getObservances`
additionally refuses spans wider than 10 years.

## Add a guard when you add a public function

The boundary is **the whole exported surface**: every runtime export of the three barrels, which
`test/hostile-inputs.test.ts` enumerates and holds to never escaping uncoded. The list is not
repeated here, because a copy is what went stale before (see below).
Below it, nothing re-checks, and nothing should — duplicating the guards on the hot path costs real
time in the multi-century sweeps and gives nothing back. Where an internal caller needs an unguarded
version, give it its own name rather than skipping the guard on the exported one:
`isoFromJulianDayUnchecked` is the example.

The enumeration used to list five, and that omission was the whole bug. `tibetanWeekday(1.5)`
returned a fractional weekday `3.5`, `julianDayFromIso(null)` threw an uncoded `TypeError`, and
`formatTibetanDate({})` returned `"undefined-undefined-undefined"` — from the one function whose
docblock is an argument against producing plausible-but-wrong strings. **A list of five in a record
whose rule says "every" is how four exports go unguarded**, so if this list and the export list ever
disagree, the export list wins.

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

## Predicates catch by allowlist, never by denylist

`tibetanDateExists` answers `false` for exactly **one class and two codes** — `SkippedDayError`
matched by class, plus `TCT_FIELD_OUT_OF_RANGE` and `TCT_NO_SUCH_LEAP_MONTH` — and rethrows
everything else. `TCT_SKIPPED_DAY` is deliberately not matched as a code, so an error carrying it
without the class is rethrown; do not restate this as "three codes".
Do not widen it back to a bare `catch`, and **do not turn it back into a denylist**. It is the
oracle for the Tier 1 property that skipped days are never observance days, so a swallowed failure
would make that property pass *more* easily rather than fail.

It was a denylist — every `RangeError` except one excluded code — and that lost. `scaleTo` threw an
uncoded `RangeError` for a config whose denominators the derivation could not use, and this function
reported that Losar 2026 does not exist. A denylist has to anticipate every failure anyone will ever
add; an allowlist only has to name the three things that are genuinely answers about the input.

`TCT_OUTSIDE_EXACT_RANGE` is deliberately on the throwing side. Past that bound the day was never
computed, so `false` would be a confident claim about arithmetic that was refused rather than
performed — the same reasoning that gives it a code separate from `TCT_SKIPPED_DAY` above. See
[the error-code record](2026-08-12-error-codes-not-classes.md).

## The 10-year span cap is deliberate, and its value is chosen small

`getObservances` refuses a range with `to.year - from.year > 10` (`MAX_SPAN_YEARS`, internal), so
2020-01-01 to 2030-12-31 is admitted and 2031-01-01 is not, with `TCT_SPAN_TOO_WIDE`. It is
compared as year numbers, not elapsed days, after the dates are normalised, so the cap holds for
every accepted date shape. There is one cap, with no per-config value.

**Why it exists.** `getObservances` is the one function whose work scales with an input range, and
the work per month is real. `Temporal.PlainDate` spans about 547,000 years, so a service forwarding
user-supplied `from`/`to` hands its event loop work thousands of times larger than the cap admits, synchronously and without yielding. No other
function needs a cap: the engine beneath it loops only over bounds that are constants. The
justification is the range beyond the cap, not the cap itself, and a docblock that implies
otherwise is overselling it.

**Why 10.** A day, month, year or planning view needs at most about two years. The approved budgets
are 5 ms for a day, 10 ms for a month, 50 ms for a year and 100 ms for a planning chunk over about
ten rules; `bench/RESULTS.md` records the measured figures with their harness, and a new form is
measured against them.

**The direction rule.** Raising the cap later is free, because no caller can depend on a refusal
being absent. Lowering it after 1.0.0 is a breaking change, because working calls start throwing.
So the value is chosen small, and the way to widen it without breaking anyone is an optional input
rather than a larger constant.

A caller wanting a wider range chunks it and concatenates, which is correct because the function is
pure and restarts its month walk per call. The test suite does this through `getObservancesChunked`
in `test/support/`.

A numeric span cap is not a common library pattern: services cap result count instead, and date
libraries mostly do not cap at all. The justification specific to this library is the per-month
cost, far beyond a day-walker like `eachDayOfInterval`.

## Consumer configs are validated once per object

**Both** config types, on the same pattern: checked rather than trusted, validated once per config
**object**, and the engine reads a **private, deeply frozen copy** made at that moment — never the
caller's object. The copy is memoised on a `WeakMap` keyed by the object the caller passed, and
maps to itself, so passing a copy back is a hit. A consumer who mutates a config in place after
first use therefore changes nothing the engine sees: the answers stay those of the config as it was
validated.

That is not the bargain `scalingFor`'s cache makes, and the two must not be confused. The scaling
cache derives its constants once and keeps serving them, so a mutated config gets stale answers
that are still internally consistent. Validation without a copy was worse: `getObservances` and
the calendar functions re-read `rules`, `when`, `moonTab`, `leapIndexThreshold` and the other
fields from the caller's object on every call, so a mutation after first use got **unvalidated**
reads — a `days: [31]` that extrapolated into the next month, a `rules: null` that escaped as an
uncoded `TypeError`, a table of the wrong length that surfaced as `TCT_INTERNAL`, which tells the
consumer to report the engine's bug for their own mistake. Reading a validated copy closes all of
those at once, and `scalingFor` now derives from the same copy, so the scaling and the fields the
arithmetic reads can no longer disagree.

The copy is made by `structuredClone` after the check and checked again as a new object, because a
getter, an inherited field or a non-enumerable one answers differently once cloned. A value
`structuredClone` cannot copy is refused with the config's own code, not a `DOMException`. A new
object — a fresh `{ ...PHUGPA, … }` — is validated and copied again, which is what makes it the
way to change a config. Two consequences follow. `Observance.rule` is the copy's rule object, not
the caller's, and it is frozen. And a config's identity is not preserved: the engine's copy is never
`===` the object a consumer passed, shipped configs included.

`PHUGPA`, `PHUGPA_HENNING`, `BHUTAN`, `BHUTAN_HENNING` and `EXAMPLE_OBSERVANCES` are still deeply
frozen, because they are the objects the docs point a reader at for `{ ...PHUGPA, … }` and so the
ones a keystroke off a spread mutates: freezing stops the mutation reaching the shared singleton
itself, where the copy only protects the engine. Keep them frozen.

`ObservanceConfig` is validated by `ensureValidated` in `src/observances/validate.ts`, which
returns the copy; `TraditionConfig` by [`validatedTradition`](../../src/traditions/validate.ts),
which returns the copy and which every entry point and `scalingFor` read the tradition through.
`composeObservances` returns the validated copy of its candidate, so composing from a result
as a base finds it already in the map.

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

A required field is required of the **validator**, not only of the type. `ObservanceConfig` declares
`doubledDay`, `skippedDay` and `leapMonth` non-optional, and the check began `if (value !== undefined
&& …)`, so all three passed when absent and then fell through the resolution branches to whichever
came last. Omitting `leapMonth` put the 2024 Chokhor Duchen one month off what FPMT prints, silently.
`undefined` is the likelier bad input, not the rarer one: it is what a config written before a field
existed, a hand-built config, or a spread of a `Partial<>` all produce. The per-rule overrides keep
the `undefined` escape, because for them absent genuinely means "use the config default", and they
have their own `assertOptionalChoice` so the difference is visible at the call site.

## A bound proved for one tradition is derived, never written down

The `±3` search window in `isoToTibetan` was proved from `(25 + 11)/60 = 0.6` days — Phugpa's
largest `moonTab` and `sunTab` entries. Those are **injected config**, so the literal `3` was a
Phugpa constant hardcoded into a computation over data a consumer supplies. A wider table passed
validation and then broke the window on 8% of days, half of them by returning a date that did not
convert back.

The window now derives from the tradition in
[`deriveScaling`](../../src/computation/scaling.ts), and the general check in the validator bounds
the **derived window** rather than the table magnitudes. The validator runs that derivation, so a
config whose window or common denominator cannot be derived is refused by every export on its first
call, never by only the exports that reach the scaling. Bounding the tables instead would mean
writing `|moonTab| ≤ 25` — hardcoding Phugpa's numbers into the injectable field all over again —
and deciding "is this Phugpa" from a consumer-settable `id`. Phugpa-specific assertions belong in
the test suite, where `deriveScaling(PHUGPA).searchHalfWidth === 3` also guards the tables against a
mistyped transcription. Apply the same split to any other constant proved from a tradition's own
numbers.

The mean-motion formulas are linear in the lunar day, so an unvalidated rule did not fail, it
extrapolated: `when: { day: 31 }` returned the 1st of the *following* month labelled
`resolution: "exact"`, while an out-of-range `when.month` matched nothing and the observance vanished
from the year. Both ship a wrong date to practitioners with the library's full authority behind it.
