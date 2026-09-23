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
