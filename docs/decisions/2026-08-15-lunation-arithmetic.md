---
date: 2026-08-15
status: accepted
---

# Month arithmetic is lunation arithmetic

**Decision:** navigation happens on the calendar's two integer coordinate lines — the **Julian day**
for solar days, the **lunation** for months — never on the labels. `addMonths` takes a month and
returns a month, so it is total. `addDays` takes a date and returns a date, and is also total. The
label space is where ambiguity comes from, and nothing here does arithmetic in it.

## Why the labels cannot carry arithmetic

`(year, month, isLeapMonth, day)` is deliberately **partial** — a skipped date names no calendar day
— and deliberately **non-injective** — a leap year holds two months numbered 6, a doubled pair holds
two days numbered 30. Neither is a defect; both are what the calendar is.

A coordinate has neither property. A Tibetan month *is* a lunation, so the count rises by one per
month with leap months included and continues across Losar with no gap. "One month later" therefore
means "the next new moon", and `monthsFor(2151)` prints `… M05 M06L M06 M07 …` because that is the
order the moon goes in.

So the question the roadmap recorded — *what does "add one month" mean across a leap month: skip it,
land in it, or refuse?* — has none of those three answers. One lunation after M05 of 2151 is M06L.
Not a convention this package chose; what the calendar counts.

## `addDays` and the skipped-day question that was never real

The roadmap also asked what `addDays` returns when the target date is skipped. **It cannot land on
one.** `isoToTibetan` is total over calendar days, and a skipped date is a *label* that no calendar
day carries, so stepping real days never arrives at one. The question rested on a false premise and
was struck rather than answered. A sweep over 800 consecutive steps through a span containing known
skips and doubles asserts it.

The two failures that do exist already existed: a skipped **starting** date throws `SkippedDayError`
before any arithmetic, and a result leaving the tradition's exact range throws
`TCT_OUTSIDE_EXACT_RANGE`.

## Why `addMonths` and `monthsBetween` are not here — and then were

Both were designed, **cut on 2026-08-14**, and reinstated the next day. The reversal is the useful
part, because the cut was reasoned wrongly in a way that will recur.

**The cut argued they were "two-call compositions over a coordinate shipping in the same release",**
which the public-surface record's then-proposed fourth case did not reach. That is a *cost*
argument, and cost belongs to the third case — disproportionality — which the
[2026-08-15 rescoping](2026-08-12-public-surface.md) declares out of place for conveniences.
Reaching for the cost argument when the wrongness argument fails is exactly the failure that
rescoping names.

**A throwaway grid spike then supplied the wrongness argument, which nobody had looked for.**
Rendering a month grid against the surface without `addMonths`, the naive step a consumer writes is:

```js
monthsFor(year)[month.month]   // index the year's months by month number
```

In a leap year this returns **the month you are already on**, from the leap month onward:

```
2151:  0:M01 1:M02 2:M03 3:M04 4:M05 5:M06L 6:M06 7:M07 …
from M05  → M06L   correct
from M06L → M06    correct
from M06  → M06    itself
from M07  → M07    itself
```

A "next month" control dies halfway through every leap year, returns a perfectly valid
`TibetanMonth`, throws nothing, and works fine the other two years in three. That is a plausible
wrong answer reachable by the most obvious line — the *first* test's own criterion. `addMonths`
would have qualified under the unrescoped rule too, had anyone written the naive version down.

The other two naive forms fail as well, and are pinned as tests: incrementing `month` skips the leap
month entirely, losing thirty days; searching a single year by lunation returns `undefined` at month
12, which is Losar, twelve times a year.

**A third argument was offered for the cut and does not survive.** Routing consumers through
`lunationFromMonth` / `monthFromLunation` "teaches that a month is a lunation", where `addMonths`
lets them keep thinking in labels. Teaching only works on people who read; a correct `addMonths`
works regardless, and the spike shows what the unreading consumer ships.

## The three `addMonths` shapes that stay rejected

A future request will ask for one of these by name. Each was considered and each is refused:

- **Date in, date out.** One line instead of two, but it must decide what "the 8th of next month"
  means when the 8th is skipped in the destination — a few percent of calls — and that decision
  becomes permanent contract.
- **A `skippedDay: 'preceding' | 'omit'` parameter.** That choice is a **convention**: Janson and
  FPMT disagree about it, and [2026-08-12-observance-policy.md](2026-08-12-observance-policy.md)
  exists to keep contested conventions in injected config rather than in the engine.
- **Anything returning a date from a month step.** Same problem as the first, arrived at from a
  different direction.

Month in, month out is total precisely because it never places a day number. "The 8th of next month"
is then a composition over machinery that already exists, and its partiality is the partiality the
package already documents:

```js
const m = addMonths(date, 1);
tibetanDateExists({ ...m, day: 8 });   // the non-throwing route
tibetanToIso({ ...m, day: 8 });        // throws SkippedDayError, as it already does
```

## What this stops a contributor doing

- **Adding a date-in/date-out `addMonths`** as a convenience, or a `skippedDay` option to the
  existing one. Both re-open a convention the tradition does not settle.
- **Deriving month arithmetic from month numbers** anywhere in `src/`. `trueMonthCount` /
  `monthFromCount` are an inverse pair for this reason and `getObservances` already walks months
  that way.
- **Removing `lunationFromMonth` / `monthFromLunation` as redundant** now that the verbs exist. They
  are the only route to the count — it needs the intercalation index — and they are what makes a
  month one sortable integer, which `(year, month, isLeapMonth)` cannot be: a leap month sorts
  *before* its twin and `false` sorts before `true`.
- **Answering the roadmap's skipped-day question for `addDays`.** There is nothing to answer.
