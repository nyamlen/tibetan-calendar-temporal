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
| `monthsInYear`, `leapMonthOfYear`, `isLeapYear` | walk the year with `losarFor`, collect distinct `monthCode`s — correct, just O(365) | internal |

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

## Consequences

- Do not export from `src/computation/` to make a test or a sibling module easier. Tests import
  internals directly by path; that is why they can.
- A failure in `test/public-api.test.ts` is not fixed by editing the expected list. It means the
  surface changed — decide whether that was intended, then update the list *and* the README's API
  table together.
- The `./observances` surface is pinned separately. Nothing in the root suite would notice a name
  appearing or vanishing there.
