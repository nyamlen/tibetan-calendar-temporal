---
date: 2026-08-23
status: accepted
---

# The README is a landing page, and validation windows have one home

**Decision:** The README's first 40 rendered lines carry the pitch, the install line and one
runnable example, and nothing else precedes them; new consumer prose goes in `docs/guide.md`. And
`docs/development/testing.md` states the validation windows, `docs/why-trust-these-dates.md` is the only other
document that may quote them, and everything else links to that page rather than restating a
number.

## Why the README needs a rule at all

It reached 950 lines by accretion, each addition individually justified, and ended up doing two
incompatible jobs: landing page and reference manual. The result was that the install command sat
at line 103, the first runnable code at 147, and the entire trust argument — the reason a
practitioner would choose this library — at line 903, below the whole API reference.

Nothing catches that happening. It is not a lint failure or a broken test; it is a document that
became worse one reasonable commit at a time.

**The constraint is the first 40 lines, deliberately, and not a ceiling on the file.** A whole-file
line limit sounds tighter and is worse: it creates pressure to trim whichever section is easiest to
cut, which is never the one that should go. `docs/development/roadmap.md` records a closed decision that put the
Temporal polyfill material into the README precisely because the README was the only file reaching
npm — a total-length rule would put that back at risk, while a first-screen rule does not touch it.

**The pitch includes the one-line summary of the three entry points; the table of contents comes
after the example.** Which entry points exist is part of what the package is, and a visitor needs
it before installing, so the summary is pitch and not a breach. The table of contents is for a
reader who has already decided to read on, so it does not spend the first screen. The summary
stays one line per entry point; where each one's claims come from belongs under "Why you can trust
the dates", not here.

`docs/guide.md` carries three sections — understanding the calendar, working with the library,
running it anywhere — and a fourth becoming tempting is the signal that the guide is turning into a
second README.

## Why validation windows need one home

The project's governing rule, from `docs/sources/validation-sources.md`, is that agreement cited without
its range is not evidence. Adding a reader-facing trust page and an institutional pitch would have
put the same windows in five documents, and five copies of a number is a number that will drift.

The chain is one hop:

- `docs/development/testing.md` states the **agreement** windows. `docs/sources/validation-sources.md` states
  **per-source coverage** — a different claim about a different thing, which is why both stay.
- `docs/why-trust-these-dates.md` is the only other document that quotes either, and cites their
  anchors.
- Everything else — the README, any pitch, any future web page — links to that page and states no
  year range at all. Two window statements in the README were deleted when this landed, for exactly
  that reason.

**There is deliberately no `check:conventions` rule for this.** Every predicate available is
shape-fragile: a year range near the word "validated" fires on `docs/sources/validation-sources.md` itself
and on any honest limitations section. `CLAUDE.md` already establishes that a vacuous or fragile
guard is worse than none, and the validation-suite rule is the precedent for leaving one unguarded
rather than writing a check that passes for the wrong reason.

What is mechanically checked is the cheap half: `check:links` verifies that the anchors those
citations point at still exist.

## What this does not decide

Whether documentation ships to npm is a separate question, settled by `package.json#files`:
`docs/guide.md` and `docs/why-trust-these-dates.md` do, so that condensing the README costs a
consumer nothing structurally rather than because the condensation was done carefully.
`docs/other-implementations.md` and every contributor document do not.
