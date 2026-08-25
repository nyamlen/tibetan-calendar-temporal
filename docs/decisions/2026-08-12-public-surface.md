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

## Revisited 2026-08-15: the rule has a scope, and it was being applied outside it

Adding a **fourth** case was drafted and rejected. Three exceptions to a two-way test is the signal
that the test is being asked the wrong question, not that it needs another branch.

**What the rule is actually for.** Every candidate it has correctly decided —
`classifyDay`, `trueMonthCount`, `firstDayOfMonth`, the observance conventions, `losarFor`,
`isFullMoon` — is either a **computation internal** or a **contested convention**. There the
failure mode is a *plausible wrong answer*, this package's worst outcome, and "can the consumer get
a correct answer without us?" is exactly the right question. That is the rule's home ground and it
is not weakened here.

**Where it was misapplied.** A thin composition over functions that are *already public* cannot
produce a wrong answer that the documented consumer-side version would not produce equally.
`datesFor(month)` is the loop the README already prints, in a docblock. The risk such a name
carries is surface size, not wrongness — so testing it for wrongness routes it to "internal" every
time, however useful it is. That is a category error, and it is how five convenience candidates were
each argued down individually while the aggregate went unexamined.

**The asymmetry that made this hard to see.** The cost of *inclusion* is visible and lands on the
maintainer: another name to document, test and never break. The cost of *omission* is invisible and
lands on the consumer: someone who needs "the days of this month" and does not find it writes their
own, or leaves. They file no issue either way. A rule that weighs only the visible side will
under-expose while feeling rigorous.

**The comparison is worth stating plainly.** `@hebcal/core` ships `add`, `subtract`, `before`,
`onOrAfter`, `nearest`, `next`, `prev` and `deltaDays` on `HDate` alone. None was gated on a
demonstrated consumer; they exist because a calendar library is expected to do calendar things.
Temporal, Luxon and date-fns are the same. **We are the outlier, not them** — which is defensible
for semantics and was never argued for conveniences.

**So the rule is scoped, not relaxed:**

| Candidate is… | Test |
|---|---|
| a computation internal, or a contested convention | **Wrong or impossible**, with the third case above for correct-but-grossly-disproportionate. Unchanged. |
| a thin composition over already-public functions | Does a calendar library of this kind normally provide it, **and** does it have one obvious correct semantics? |

The second test's two halves are both required. "Normally provided" alone would license
`addMonths(date, n)` returning a date, which has no obvious semantics across a leap month — and
that is refused for the same reason it always was.

### What the rescoping licensed, and what it cost

Stated plainly, because a rule change whose consequences are not written down gets re-litigated by
whoever next finds the surface large. The root export goes from **14 functions to 25**:

| Added | Judged by |
|---|---|
| `addDays`, `daysBetween` | second test — universally provided, one semantics (solar days) |
| `addMonths`, `monthsBetween` | second test — month-in/month-out, so one semantics (next lunation) |
| `lunationFromMonth`, `monthFromLunation` | **first** test — impossible consumer-side, needs the intercalation index |
| `nextFullMoon`, `nextNewMoon` | **first** test — the obvious shortcut `day === 15` is *wrong* when 15 is skipped |
| `yearNameFor`, `rabjungFor` | second test — naming a year is a headline feature of any sexagenary calendar |
| `datesFor` | second test — the weakest of the set, kept because rendering a month is the commonest thing anyone does |

**Two of these were decided wrongly first, and both errors ran the same way.** `addMonths` and
`monthsBetween` were cut as "two-call compositions"; `yearNameFor` and `rabjungFor` were dropped
because `losarFor(y).yearName` measured at 31 µs. Both arguments are *cost* arguments — the third
case's territory — applied to convenience questions the second test governs. Reaching for the
cost argument when the wrongness argument fails is the failure mode this scoping exists to name.

**A throwaway spike settled `addMonths` on evidence rather than argument.** Rendering a month grid
against the surface without it, the naive step a consumer writes is
`monthsFor(year)[month.month]` — which returns **the same month** from the leap month onward. A
"next month" button dies halfway through every leap year, returns a valid `TibetanMonth`, throws
nothing, and works perfectly the other two years in three. Incrementing `month` skips the leap month
entirely; searching one year by lunation returns `undefined` at Losar. That is a plausible wrong
answer reachable by the most obvious line, which is the first test's own criterion — so `addMonths`
would have qualified under the *old* rule too, had anyone written the naive version down.

**Build the thing before deciding what it needs.** That spike cost fifteen minutes and overturned
two decisions taken across two review passes. Prefer it to another round of argument.

## Revisited 2026-08-25: three vocabulary lookups removed

`elementNameFor`, `genderNameFor` and `animalNameFor` are **off the surface.** `weekdayNameFor`
stays.

They were never argued for. The 2026-08-15 rescoping above lists every function it licensed, with
the test each one passed; these three are not among them. They arrived the next day with the naming
layer, in the same commit as `weekdayNameFor`, and shipped **by symmetry with it** — no decision
record, no roadmap argument, nothing in the commit message.

They also fail the second test on its merits. Both halves are required, and "does a calendar library
of this kind normally provide it" is the half that fails: `yearNameFor` and `rabjungFor` passed it
because *naming a year is a headline feature of any sexagenary calendar*, and naming a bare element
is a headline feature of nothing.

The decisive point is narrower. **`yearNameFor(year)` already returns `elementName`, `genderName`
and `animalName`, populated.** So the only consumer these three served is one holding a bare
`TibetanElement` with no year in hand — and that consumer was *half*-served, because the string
unions are not enumerable at runtime and no array of the five elements is exported. The one scenario
they existed for, they did not complete.

**This is not the failure mode the rescoping named.** `addMonths` and `yearNameFor` were cut wrongly
on **cost** arguments — a µs measurement, "it's a two-call composition" — which is the third case's
territory applied to a convenience question. No cost argument is made here; the argument is the
second test's own half, and the alternative route is one property access rather than a
reimplementation.

They were deleted from `cycles.ts` too, not merely unexported, and that was a separate call:
**nothing in `src/` called them.** `epoch.ts` builds `TibetanYearName` from `names.ts` directly, so
the wrappers had no internal user, and `requireName` — which existed only to serve them — went with
them. Keeping them would have been dead code carrying a live hazard: `docs/coding-standards.md`
records `*For`/`*Of` being one character apart as a trap that **compiles** and recurses infinitely,
and this removes three of its four instances. Restoring one is three lines if a real consumer ever
appears.

## Consequences

- Do not export from `src/computation/` to make a test or a sibling module easier. Tests import
  internals directly by path; that is why they can.
- **Do not cite this record to refuse a convenience.** It governs internals and conventions. A
  helper composed of public functions is judged by the second test, and "we might not need it" is
  not a finding under it — the consumer who needed it is the one who does not appear in the issue
  tracker.
- Equally, do not cite the second test to expose something whose semantics are contested. Two
  defensible answers means the question belongs in injected config or in the caller's code, exactly
  as `docs/decisions/2026-08-12-observance-policy.md` requires.
- A failure in `test/public-api.test.ts` is not fixed by editing the expected list. It means the
  surface changed — decide whether that was intended, then update the list *and* the README's API
  table together.
- The `./observances` surface is pinned separately. Nothing in the root suite would notice a name
  appearing or vanishing there.
