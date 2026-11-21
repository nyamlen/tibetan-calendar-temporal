---
date: 2026-08-13
status: accepted
---

# Tibetan-date and Western-date inputs refuse each other's shape

**Decision:** every Tibetan-date entry point — `tibetanToIso`, `tibetanDateExists`,
`formatTibetanDate`, `daysInMonth` and every later one — refuses a `Temporal.PlainDate`,
`PlainDateTime` or `ZonedDateTime` at runtime, and an `isLeapMonth` or `isLeapDay` that is present
but not a `boolean`, by calling `assertTibetanShape`, the one home for the Tibetan-date shape. Its
helpers `rejectTemporalInstance` and `rejectInvalidLeapFlags` are private to `src/types.ts`. The Western-date
entry point, `asPlainDate`, refuses a bare `{ year, month, day }` object. `calendarId?: never` on
`TibetanDateFields` and `TibetanMonthFields` makes the first refusal a compile-time error too, not
only a runtime one.

> **Updated 2026-08-15.** Two names in this record changed without the decision changing.
> `TibetanDateInput` and `TibetanMonthInput` were renamed `TibetanDateFields` and
> `TibetanMonthFields` before 1.0.0, and the code these refusals throw is now
> `TCT_INVALID_ARGUMENT` rather than `TCT_FIELD_OUT_OF_RANGE` — see
> [2026-08-15-argument-errors-split.md](2026-08-15-argument-errors-split.md). The identifiers below
> are updated so they still resolve; every argument in this record stands as written.

## The shape collision this closes

`TibetanDateFields` and `Temporal.PlainDate` are structurally close enough — both are plain objects
exposing numeric `year`, `month` and `day` — that nothing in the type system stopped a caller
handing one where the other was expected. Nothing crashed either way: `tibetanToIso` read the same
three fields off a `PlainDate` that it would off a real `TibetanDateFields`, and `asPlainDate` read
the same three fields off a `TibetanDateFields` that it would off an intended Western date. Both
directions returned a confident, silently wrong date — a royal-era year read as a Gregorian one, or
the reverse.

`rejectTemporalInstance` closes the Tibetan-date direction: it runs before any field validation,
which would otherwise accept a `PlainDate`'s in-range numeric fields without complaint, and is
shared across all four entry points so the message and the code are one policy rather than four.
`rejectInvalidLeapFlags` closes a narrower version of the same problem — `isLeapMonth` and
`isLeapDay` are read as `value.isLeapMonth ?? false` and used for truthiness, so a non-boolean that
is merely absent-*like* (the string `"false"`, a stray object) silently selects the leap month or
leap day rather than being rejected.

`asPlainDate` closes the Western-date direction by refusing a bare `{ year, month, day }` object,
even though `Temporal.PlainDate.from` itself accepts one. That shape is a genuine value of both
types at once — `isoToTibetan({ year: 2153, month: 12, day: 8 })` type-checks against
`TibetanDateFields` — so nothing about the object itself says which calendar it names.

## Why `calendarId?: never` is load-bearing

All three Temporal classes declare `readonly calendarId: string` (checked against
`lib.esnext.temporal.d.ts` and confirmed at runtime on Node v26.7.0, where all three return
`"iso8601"`). `string` does not satisfy `never`, so a `Temporal.PlainDate` stops being structurally
assignable to `TibetanDateFields` or `TibetanMonthFields` at compile time — closing at the type level
the same confusion `rejectTemporalInstance` closes at runtime.

The field has no reads. Its entire job is to make an *invalid* call fail to typecheck, so it looks
like dead code to a contributor who has not read this record — do not delete it as unused. Without
it, a TypeScript caller who passes a `Temporal.PlainDate` to `tibetanToIso` gets a runtime
`RangeError` instead of a compile error, which is strictly worse for exactly the audience most able
to act on a type error before shipping it.

## What this supersedes

`asPlainDate`'s docblock used to argue for the opposite policy. It said `Temporal.PlainDate.from`
"**widens** the accepted input deliberately" and that this package should inherit that width,
because an ISO string, a `PlainDateTime`, a `ZonedDateTime` **and** a bare `{ year, month, day }`
object "are all meaningful ways to name a calendar day, and Temporal already defines what each one
means."

That argument was sound as far as it went — every one of those shapes genuinely names a *Western*
day when read in isolation. What it missed is that `{ year, month, day }` is simultaneously a
genuine value of this package's own `TibetanDateFields`, so accepting it did not choose between "a
Western day" and "nonsense". It chose between two live, disagreeing readings with nothing in the
object to prefer either, and returned a confident date under whichever reading the code happened to
apply.

This record replaces that argument, and the docblock no longer carries it. Do not reinstate the
widening — accepting a bare `{ year, month, day }` at `asPlainDate` "for symmetry with
`Temporal.PlainDate.from`" — because that symmetry is exactly the ambiguity being refused. A caller
who genuinely means a plain-fields object as a Western date can still write
`Temporal.PlainDate.from({ year, month, day })` explicitly; that call is unambiguous because the
class it is invoked on says which calendar is meant.

## Consequences

- Do not widen `asPlainDate` to accept a bare `{ year, month, day }` object again. If Temporal ever
  adds a shape this package should read as Western, name the case that makes it unambiguous rather
  than restoring the general widening.
- Do not delete `calendarId?: never` from either input type as unused — its value is entirely at
  compile time.
- A new Tibetan-date entry point calls `assertTibetanShape` before any field validation, and never
  the `reject*` helpers directly: they are private, and calling one on the caller's object would read
  its fields a second time, outside the read-once snapshot. See
  [2026-08-12-input-validation-boundary.md](2026-08-12-input-validation-boundary.md) for the
  general rule that every exported function guards its own input; this record is the specific
  policy for the Temporal/Tibetan shape collision within that rule.
