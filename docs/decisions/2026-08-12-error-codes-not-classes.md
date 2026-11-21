---
date: 2026-08-12
status: accepted
---

# Errors carry codes; only skipped days get a class

**Decision:** every error this package throws carries a stable `code` from
[`TibetanCalendarErrorCode`](../../src/errors.ts). `SkippedDayError` is the only exported error
class and no more will be added. Construct errors through `rangeError` or `codedError`, never with
a bare `new RangeError(...)`.

## Do not add an error class

The temptation is real — an `OutOfExactRangeError` reads better at a throw site than a string
constant. Resist it. Every exported class is permanent: removing one is a breaking change, so the
test for adding one is not "is this a distinct failure" but **"will a consumer branch on this at
runtime?"**

Sorted by that test, the failures divide cleanly:

| Failure | Who reacts | Branches at runtime |
|---|---|---|
| The date is skipped | The end user — "that day does not exist, here is the neighbour" | **Yes** |
| A field is out of range | Form validation, or a programmer | Sometimes |
| Outside the exactness bound | Nobody. The bound is beyond any date the calendar is applied to | No |
| A config is malformed | A programmer, in development, once | No |

Only the first is reliably branched on, and it already has a class — which is *why* it has one.
Four classes to discriminate cases nobody discriminates is surface with no caller.

The convention here is Node's own. `fs` does not export an `ENOENTError`; it throws a built-in
error type carrying `code: "ENOENT"`. That is the shape a JavaScript consumer already knows, and it
is asymmetric in the right direction: adding a code later is additive, while removing an exported
class is not.

## Throw the type that matches the *kind* of failure, not the severity

- **`RangeError`** for anything wrong with the caller's input, including a malformed config. Bad
  input is bad input.
- **`Error`** for a broken invariant this engine proves for itself — `TCT_INTERNAL` — and for
  the missing-Temporal guard, which is about the runtime rather than a call.

The distinction is load-bearing rather than stylistic. `tibetanDateExists` must not report "that
date does not exist" when the truth is that the engine broke — it is the oracle for the suite's
strongest property, where masking a failure makes that property pass more easily rather than fail.
Typing an internal violation as a `RangeError` puts it one `catch` away from that. It was a
`RangeError` once, and the docblock claiming otherwise was wrong for as long as it was.

The **type** is only half of it, and relying on the type alone failed. `tibetanDateExists` used to
report `false` for every `RangeError` bar one excluded code, which meant a bare
`new RangeError` anywhere below the boundary became "that date does not exist" — and `scaleTo`
had one, reachable through `deriveScaling` from a consumer's config. The predicate now works from
an **allowlist** of one class and two codes and rethrows the rest, so a new failure mode is loud by default
instead of silently absorbed. That is the argument for coding every throw: a code makes the
allowlist possible, and a bare construction silently opts the failure out of it.

## Codes are contract; messages are not

A code is never removed or repurposed. `test/public-api.test.ts` pins the list in both directions —
every documented code is reachable from the public API, and no call throws an undocumented one —
and the README publishes it as a table.

Message *text* carries no such promise, and deliberately so: the messages are meant to keep
improving. Do not assert on wording in a test where a code would do, and do not tell a consumer to
match on it.

## An error the caller's own code throws while this package reads their argument is coded

Added 2026-09-24 as "it may propagate unchanged", amended 2026-11-15, and **decided the other way on
2026-11-16 by Andreas** (option 3 of the question put to him on 2026-11-15, whether the config
validators and the date-field guards should code a throw from the caller's own getters and
Proxies): a throw from the caller's own code — a getter, a `Proxy` trap, a revoked `Proxy`, a method
the engine calls on a value — while the engine reads an argument is refused with a code, and the
caller's original error is kept as `cause`. **Every read the engine makes of an object a caller
passed is guarded**, and the README's "every failure about your input … carries a code" holds with no
exception for it.

- **A config.** `TraditionConfig` and `ObservanceConfig` are each read from the caller's object in
  exactly one place, the validator's first pass, and then copied with `structuredClone`; the engine
  reads the private frozen copy and never the caller's object again. That first pass and the copy
  are one guarded read, `readingCallersObject` in `src/errors.ts`, and a throw from it is refused with
  `TCT_INVALID_TRADITION_CONFIG` or `TCT_INVALID_OBSERVANCE_CONFIG`. `composeObservances` reads its
  layer the same way. The guard lets through only an error this package constructed, decided by
  identity, because a `code` is a string a caller can forge on an error of their own.
- **A Tibetan date or month.** `assertTibetanShape` in `src/types.ts` reads each field **exactly
  once** — `year`, `month`, `day` where the shape has one, `isLeapMonth`, `isLeapDay` — inside a
  guard that refuses a throwing read with `TCT_INVALID_ARGUMENT`, and returns a frozen snapshot.
  `assertTibetanRanges`, `monthCountFor`, `julianDayOfFields` and every export take the snapshot and
  never the caller's object again; their types are branded, so a call site that still passes the
  argument does not compile. Before this, `day` was read four times per `resolveDate`: a getter
  answering 8 and then 31 passed validation as 8 and was computed on as 31, a confident wrong date.
  A month reads `isLeapDay` only to refuse a non-boolean one, and drops it.
- **A Western date, an options bag, and a resolved `TibetanDate`'s `isoDate`.** The brand read
  (`Symbol.toStringTag`), the `isoDate` read, the intrinsic `calendarId` getters that recognise a
  genuine instance of this realm's three day types by its slots, the `instanceof` checks against
  them (which a Proxy answers with its `getPrototypeOf` trap) and the options bag's own keys are each
  read inside a guard. A genuine instance is then copied from its slots, so its own `toPlainDate`,
  `toString` or getters are never called. Only a value with no such slot — a second
  implementation's instance, or a spoofed brand — has its `toPlainDate` property, its call and its
  `toString` read, each inside a guard.
- **The code is `TCT_INVALID_ARGUMENT`, never `TCT_FIELD_OUT_OF_RANGE`**, for a throwing read of a
  date's fields. The range code is on `tibetanDateExists`'s allowlist and would turn a caller's
  throwing getter into "that date does not exist"; `tibetanDateExists` rethrows this one.
- **Where this is held.** `test/caller-reads.test.ts` counts the reads of every export that takes a
  date or month, takes that list from the sources so a missing export fails, and checks that each
  refusal carries the caller's error as `cause`; `test/hostile-inputs.test.ts` holds every config row
  to the same with every Proxy trap, one at a time.

Three rules from the earlier version still hold, each of which was broken before it was written down:

- **Rendering a value must never throw.** A message is built after the decision to throw, so a
  renderer that throws turns a coded error into an uncoded one. Use `describe` in `src/errors.ts`,
  which is total, never a bare `${}` on a value not yet proved a number.
- **A guard that wraps a read uses `TCT_INVALID_ARGUMENT`**, as `temporalTypeNameOf`, the options
  guard, `asWesternDay` and the fields guard do — **never** `TCT_FIELD_OUT_OF_RANGE`.
- **Widening the promise later is additive; narrowing it is not.** The promise now covers every read
  of a caller's object. Taking a code away once consumers branch on it is a breaking change, so a new
  site that reads a caller's object is guarded and passes the caught error as `cause`, not left to
  propagate.

A getter that throws on the first read and answers on the second is refused on the first, so the
guard does not need to know whether a getter is deterministic: it reads once, and what it read is
what the arithmetic uses.

## What a message should contain

The guidance the current messages follow, in case a new throw site needs one:

- **The call, with its input echoed** — `tibetanToIso({ year: 2153, month: 13, day: 4 })`. A caller
  converting a table gets one throw and has to find the row; the bad field alone does not say
  which.
- **The offending value**, rendered unambiguously — `"3"` is not `3`.
- **The tradition, where the limit is a property of the tradition** rather than of the package.
  `PHUGPA_HENNING` runs out of exactness fifteen times sooner than `PHUGPA`, so a caller who hits
  it on one config and not the other has to be told which refused.
- **A number the caller can act on.** A raw Julian day in the tens of millions is not one; its ISO
  year is.
- **The fix, when there is a single likely one** — which spread to write, which flag to drop.

Build the message lazily where the check sits on the hot path. `assertExactJulianDay` takes a thunk
for exactly this reason: `isoToTibetan` runs once per day across multi-century sweeps, and
formatting a date on every *successful* conversion would be real time spent on a string nobody
reads.
