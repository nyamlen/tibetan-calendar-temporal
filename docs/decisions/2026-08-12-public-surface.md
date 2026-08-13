---
date: 2026-08-12
status: accepted
---

# What goes in the public surface

**Decision:** a name becomes public when the consumer-side workaround is **wrong or impossible**.
It stays internal when the workaround merely costs a loop. Adding an `export` to a module under
`src/computation/` does not make it API; only the barrel in `src/index.ts` does, and
`test/public-api.test.ts` pins both that list and the `./observances` one.

## The constraint this exists to protect

"Useful" is too weak a test — everything in `computation/` is useful, which is how a surface
bloats until every internal is a compatibility obligation. "Minimal" is also wrong: hiding the
only route to a capability forces consumers to reimplement it, and they reimplement it wrongly.

The discriminator is whether a consumer can get a **correct** answer without us.

| Candidate | Consumer-side workaround | Outcome |
|---|---|---|
| `losarFor` | `tibetanToIso({ month: 1, day: 1 })` — **throws** where day 1 is skipped, as in 1977 | public |
| `isFullMoon` / `isNewMoon` | `day === 15` — **wrong** in months where 15 is skipped | public, as fields |
| `tibetanWeekday` | none; `dayOfWeek` is deliberately ISO, so the almanac's 0 = Saturday has no other route | public |
| `julianDayFromIso`, `isoFromJulianDay` | none for converting to any other calendar | public |
| `monthsInYear`, `leapMonthOfYear`, `isLeapYear` | walk the year with `losarFor`, collect distinct `monthCode`s — correct, just O(365) | internal — **revisited, see below** |

## Two findings that fell out of applying it

**The Julian-day helpers are not plumbing.** The pre-v1 checklist recorded them as sitting "at a
lower altitude than the rest of the surface", which is how they read when the README listed them
under "Julian day numbers" beside `isoToTibetan`. But in calendrical software the Julian day *is*
the domain interchange representation — it is how any two calendars are converted between, and it
is how Janson's paper is written. They are the extension point that stops this being a closed box,
they are two trivially stable pure functions, and the altitude complaint was a documentation
problem. They are now grouped under "Interoperability" with a sentence saying what they are for.

**Month enumeration failed on negative evidence, not absence of thought.** Phase 3 deliberately
delayed this decision until the observance engine existed, on the grounds that a real consumer of
`computation/` would show what should be public. It reached for `classifyDay`, `trueMonthCount`,
`monthFromCount`, `firstDayOfMonth` and `deriveScaling` — and never once asked which months a year
has. Exposing `losarFor` also makes the workaround feasible, since `losarFor(y)` to
`losarFor(y + 1)` bounds a year. Adding these later is non-breaking; adding them now is permanent,
and that asymmetry decides a tie.

## Revisited 2026-08-13: the rule needs a third case

The month row above is now wrong in both halves, and the way it was wrong is the useful part.

**The rule stands.** It is what narrowed five candidate names to the ones that ship, and it is why
`monthsFor` and `daysInMonth` were never in doubt: there is no correct consumer-side route to a
month's boundaries. Differencing `tibetanToIso({ month, day: 1 })` against `{ month, day: 30 }`
throws whenever either number is skipped and is off by one when either is doubled, and Janson §8 is
explicit that a month's first day must come from the previous month's last.

**But the dichotomy was too coarse.** "Wrong or impossible" against "merely costs a loop" has no
case for a workaround that is **correct and grossly disproportionate**, and the scalars are exactly
that. `monthsFor(y).length === 13` runs 26 `julianDayOfLunarDay` calls and allocates 26
`Temporal.PlainDate`s to answer a question whose closed form, `(24·Y + γ*) mod 65 ≥ 41`, is about
five integer operations. A year picker rendering a century would do thousands of `true_date`
evaluations to learn a hundred booleans. Add that third case when applying the rule.

Two things also came out of it that the original assessment missed:

- **The cost estimate was wrong, not just the conclusion.** "O(365)" described walking days with
  `losarFor`; the actual workaround, once `monthsFor` exists, is O(26) — but each of those 26 is a
  full mean-astronomy pass with two correction-table lookups, against five integer operations. The
  complexity class was never the point.
- **The scalars are exact over a wider domain than the list.** They never evaluate `true_date`, so
  they answer for years where `monthsFor` must throw `TCT_OUTSIDE_EXACT_RANGE`. That is not a
  quirk to hide — it moves those names from "costs a loop" toward "impossible", which is the rule's
  own criterion.

The tie-breaker the original record leaned on — "adding later is non-breaking; adding now is
permanent" — is what was being cashed in, and it worked as intended: the decision was deferred
until a real consumer existed, and then made on evidence rather than on anticipation.

## Consequences

- Do not export from `src/computation/` to make a test or a sibling module easier. Tests import
  internals directly by path; that is why they can.
- A failure in `test/public-api.test.ts` is not fixed by editing the expected list. It means the
  surface changed — decide whether that was intended, then update the list *and* the README's API
  table together.
- The `./observances` surface is pinned separately. Nothing in the root suite would notice a name
  appearing or vanishing there.
