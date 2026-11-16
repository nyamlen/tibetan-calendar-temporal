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
| `monthsInYear`, `leapMonthNumberFor` (then `leapMonthOfYear`), `isLeapYear` | walk the year with `losarFor`, collect distinct `monthCode`s — correct, just O(365) | internal — **revisited, see below** |

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

## Revisited 2026-08-26: a second consumer spike, and ten changes

**Decision:** the rule is unchanged. Six names are added, four are reshaped or renamed, and the
arithmetic this record could not account for is reconciled.

**The pass itself is not closed, and this section is not its sign-off.** Its closing condition is
a full uncontaminated **re-spike** against a tarball packed from the finished branch: six of the
names below were designed inside this repository by a session that had read every decision record,
and were never shown to a consumer. The gate this pass runs under is that no 1.0.0 ships until a
consumer outside this repository has exercised the public API, and treating these changes as done
would exempt exactly the names the pass added from the only gate that catches API-shape problems.
The roadmap item stays unchecked until that spike runs.

**What the second spike changed, and why a static read could not have.** The first client returned
no API change. The second returned six findings, and the surface moved for all six — which is the
evidence for building against a surface before freezing it, not an argument about taste. The
sharpest was not a missing feature: `weekdayNameFor(date.dayOfWeek)` **compiled**, because both
numberings are fields on the same object, and returned the wrong name. Measured over 70 days: 60
calls silently wrong, 10 throwing. No review pass had seen it.

### The ten changes

**One row below was narrowed the next day, and the table is kept as it stood.** The
`nextFullMoon` / `nextNewMoon` row read `TibetanDateFields` when these ten were taken on
2026-08-26; on 2026-08-27 the parameter became `Temporal.PlainDate | TibetanDate` — a *resolved*
date, not loose fields. See "Revisited — 2026-08-27" below for why. The row is left as written
because what it got wrong is instructive: "purely additive" was true of the type and false of the
contract.

| Change | Judged by |
|---|---|
| `resolveMonth`, `resolveDate` | second test — every comparator makes fields → date first-class, and here it had **no name**: two indirect routes existed and the spike found neither |
| `formatTibetanMonth`, `parseTibetanMonth` | second test — symmetric with the date pair, one obvious semantics, strict grammar |
| `addMonthsToDate` | second test — **reversed** on evidence. Originally refused as "the tradition supplies no answer"; `Temporal` clamps by default with a `reject` opt-out, and `"preceding"` is already this package's own shipped convention for the analogous question (a skipped day 1 has no lower day, so it falls to day 2). A doubled landing day keeps the start's half, by role, and takes the regular half when the start is not doubled |
| `asTibetanWeekday` + the `TibetanWeekday` brand | **first** test — a plausible wrong answer reachable by the most obvious line, which is that test's own criterion |
| `addMonths` narrowed to reject a date | first test — it discarded the day **silently** and returned a month |
| `getObservances` / `observancesOn` to an options bag | coherence — the only two-sequential-optionals defect; free now, breaking after |
| `nextFullMoon` / `nextNewMoon` also accept `TibetanDateFields` | second test — purely additive; navigation is Tibetan-in throughout |
| `leapMonthOfYear` → `leapMonthNumberFor` | the `*For`/`*Of` hazard, last public instance. It stays a **number**: returning a `TibetanMonth` would evaluate `true_date` and shrink the domain, and that wider domain is why 2026-08-13 exported the scalars at all |
| An absent required field throws `TCT_INVALID_ARGUMENT` | not an API-shape question but a **behaviour** change, recorded here because it is breaking |
| Two naming rules, no code change | see [coding-standards.md](../coding-standards.md) |

**One recommendation was withdrawn on examination**, and that matters as much as the nine taken:
the two conversion-naming families were suspected of contradicting each other and do not. Recorded
as a rule rather than "fixed".

### The arithmetic this record could not account for, reconciled

The 2026-08-15 revision says the root export goes "from 14 functions to 25". The root exports **37
runtime names** today, and a surface whose governing record does not reconcile against it is itself
a finding. It reconciles exactly, and the gap was **unit-mixing rather than drift**:

- The record counts **functions**. There are **26** today — its 25, plus `weekdayNameFor`, which
  arrived on 2026-08-16 with the naming layer, after the rescoping.
- 37 counts **all runtime names**: those 26 functions, plus `SkippedDayError`, plus the four
  tradition configs. `typeof` reports a class as `"function"`, so an introspection-based count
  gives 27 functions and that is the same 26 plus the error class.

Neither side was wrong; the two numbers were never the same unit. Say which unit a surface count is
in, or this recurs.

### The settled size

**37 root runtime names and 21 root types; 40 and 31 across both entry points.** The type figures
are three higher than the plan for this pass projected, and the cause is worth recording because it
is the ordinary way a count goes stale: the plan counted `TibetanWeekday` but never propagated the
types its *own* options-bag decisions require — `MonthOverflow`, `AddMonthsToDateOptions` and
`ObservanceQueryOptions`. A consumer annotating a variable needs all three, so they are exported
and the projection was what was wrong.

### What the surface is not

**No namespace object — settled 2026-08-27, on measurement.** It is not a class, so
[2026-08-12-no-tibetan-date-class.md](2026-08-12-no-tibetan-date-class.md) does not cover it; it had
been raised and left open since 2026-08-26, and the flatness of this barrel is the reason two of the
naming rules above exist.

**The ergonomic benefit is already available and costs nothing.** A consumer who wants
namespace-style access writes `import * as tct from 'tibetan-calendar-temporal'` today. Bundled
minimal — one `isoToTibetan` and one `formatTibetanDate` — that is **byte-for-byte identical** to
named imports, because a bundler tree-shakes statically-analysable property access on a namespace
import. So the package shipping one would add no capability a consumer lacks.

**What it would cost is not theoretical.** A shipped object (`export const tibetan = { … }`) holds
live references to every export, which defeats tree-shaking outright. Same minimal consumer:

| Import style | Bundled, minified |
|---|---|
| `import { isoToTibetan, formatTibetanDate }` | 15,462 bytes |
| `import * as tct` (consumer's own choice) | 15,462 bytes — identical |
| via a namespace **object shipped by the package** | 37,418 bytes — **+142%** |

*Method, since this record refuses unsourced numbers from its sources and owes the same of its own:*
esbuild 0.24.0, `--bundle --format=esm --minify`, against the tarball built from `71ec831`,
measured 2026-08-27 on Node v26.7.0. Re-measure rather than quote if the surface grows much.

**And it is the reversible direction.** Adding a namespace object later is a pure addition and
never breaking; removing one always is. Three arguments, all pointing the same way.

*One argument that does **not** support this ruling, recorded because it was made and is wrong:*
that a namespace import defeats tree-shaking on the consumer's side. It does not — the table above
was built to check exactly that and refuted it. The cost lives entirely in the package shipping an
object, not in how a consumer imports.

## Revisited 2026-08-27: the moon pair takes a resolved date, not loose fields

**Decision:** `nextFullMoon` and `nextNewMoon` take `Temporal.PlainDate | TibetanDate`. The
`TibetanDateFields` arm added on 2026-08-26 is withdrawn. A bare `{ year, month, day }` throws
`TCT_INVALID_ARGUMENT` naming `resolveDate` as the remedy.

**The rule this settles, which is the part to carry:** a parameter spanning two calendars accepts
only shapes that *say* which one they mean. A `Temporal` instance says Western by construction; a
resolved `TibetanDate` says Tibetan, because the engine produced it. A bare fields object says
neither — it is a genuine value of both `TibetanDateFields` and Temporal's own fields shape.

This is not a new rule. It is the rule `asPlainDate` has always stated and enforced at every other
entry point. The 2026-08-26 widening overruled it at these two, and its own helper docblock said so
in as many words — *"which is right everywhere else and is exactly what these two functions must now
accept."* Nothing recorded that an override had been taken.

**Why the override did not survive.** The third consumer spike, run uncontaminated against
`0.0.1-2b4e2bb`, reported it as one of two findings: the pair that most invites "just hand it
today's date" was the one place the package resolved calendar ambiguity silently instead of
refusing it. Measured before the change, `nextFullMoon({ year: 2026, month: 1, day: 1 })` meant as a
Western date returned **1899-02-25**.

**Two arguments were weighed and lost, and both are worth keeping.** *That the error is loud* — the
royal-era numbering puts the two readings 127 years apart, and `TibetanDateFields.year`'s docblock
cites that gap as a deliberate mitigation for exactly this confusion. True, and it is why the
finding was a hazard report rather than an incident. It does not answer why the surface should rely
on a numbering accident where a type will do. *That fields-in is the navigation convention* — also
true, and it stays the convention for `addDays`, `daysBetween` and `addMonthsToDate`, none of which
span two calendars and so none of which have an ambiguity to resolve. **Put the guard where the
ambiguity is; uniformity is not the goal.**

**The deciding argument was reversibility**, as it was for the `TibetanWeekday` brand in the batch
before: widening a parameter later is non-breaking, narrowing it is not. `TibetanDate`-now →
`TibetanDateFields`-later stays available; the reverse never does.

**What the narrowing cost, honestly.** One visible call on the loose-fields path —
`nextFullMoon(resolveDate(fields))`. Not extra work: the widened version ran `tibetanToIso`
internally anyway. The conversion moved from hidden to explicit, and the chaining case now skips it
entirely by reading `isoDate` off the resolved date.

**A contract narrowing that came free with it, and must not be re-widened by accident:** a resolved
`TibetanDate` cannot carry an out-of-range field or name a skipped day. So `TCT_FIELD_OUT_OF_RANGE`
and `SkippedDayError` are unreachable through these two functions and belong to `resolveDate` one
call out. The `@throws` says so and `test/navigation.test.ts` asserts it.

**`resolveDate` landed in the same batch as the widening and was never checked as an alternative to
it.** Had it been, the widening would probably not have been proposed. When a batch adds a
composition *and* a convenience that the composition subsumes, check the pair against each other
before both ship.

**Guarded by a `@ts-expect-error` in `test/navigation.test.ts`**, not only by a runtime test:
`tsc` errors on an *unused* directive, so the line fails `npm run typecheck` the moment a bare
fields object starts type-checking again. Proved by running it against the old signature first,
where it reported `TS2578: Unused '@ts-expect-error' directive` — the control that makes it a
tripwire rather than a comment.

## Revisited 2026-09-24: how a tradition is passed

**Decision:** recorded in its own record,
[2026-09-24-how-a-tradition-is-passed.md](2026-09-24-how-a-tradition-is-passed.md), because it is a
rule about every signature rather than a change to the surface's membership. It narrows what
2026-08-26 left implicit. That revision decided the **shape** — two choices go in a bag — and it
holds. It did not decide the **keys**: both bags inherited them from the positional names they
replaced, so `config` named a `TraditionConfig` in `addMonthsToDate`'s bag and an `ObservanceConfig`
in `./observances'` on the same day, by inheritance rather than by choice. The key is now `tradition`
in every bag, and the six functions whose only choice is the tradition take it positionally, which
removes `AstrologyQueryOptions` from the `./astrology` surface.

## Consequences

- Do not export from `src/computation/` to make a test or a sibling module easier. Tests import
  internals directly by path; that is why they can.
- **Do not cite this record to refuse a convenience.** It governs internals and conventions. A
  helper composed of public functions is judged by the second test, and "we might not need it" is
  not a finding under it — the consumer who needed it is the one who does not appear in the issue
  tracker.
- Equally, do not cite the second test to expose something whose semantics are contested. Two
  defensible answers means the question belongs in injected config or in the caller's code, exactly
  as `docs/decisions/2026-11-11-observance-model.md` requires.
- A failure in `test/public-api.test.ts` is not fixed by editing the expected list. It means the
  surface changed — decide whether that was intended, then update the list *and* the README's API
  table together.
- The `./observances` surface is pinned separately. Nothing in the root suite would notice a name
  appearing or vanishing there.
