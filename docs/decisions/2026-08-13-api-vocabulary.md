---
date: 2026-08-13
status: accepted
---

# Two naming rules the public surface follows

**Decision:** a `leap*` name denotes **the thing that is duplicated**, never the container holding
it — so the year-level predicate is `hasLeapMonth`, not `isLeapYear`. And `*For(year)` returns the
thing while `*InYear` / `*InMonth` returns a count — so the month list is `monthsFor`, not
`monthsOfYear`.

## Why `hasLeapMonth` rather than `isLeapYear`

Every other `leap` name on this surface names what is doubled. `TibetanDate.isLeapMonth` is true of
the month that shares a number with the next; `TibetanDate.isLeapDay` is true of the first calendar
day of a pair sharing a number. `isLeapYear` would be the only one naming the container, and the
thing it would name is not doubled — a Tibetan leap year gains a thirteenth **month**, not an extra
day.

That is not a hypothetical confusion. The leap-month and leap-day axes are separate, and this
project has conflated them before: the doubled-day rule was documented against the wrong section of
Janson for a whole phase, and Janson's Losar remark — which is about leap *months* — was
misattributed to the doubled-day convention. A name importing Gregorian "leap year means an extra
day" intuition works against the distinction the rest of the API is at pains to keep.

**The counter-argument is real and was rejected on merits, not overlooked.** `@hebcal/core` exports
`isLeapYear`, and it means the same extra-month thing there, because the Hebrew calendar is also
lunisolar. So the term does carry the right sense within the lunisolar family, and someone arriving
from another calendar library will reach for it first. Internal consistency won because
`leapMonthOfYear` sits beside it in the same table and makes the concept discoverable either way,
while the vocabulary inconsistency would be permanent.

## Why `monthsFor` rather than `monthsOfYear`

`monthsInYear(2153)` returns `13`. `monthsOfYear(2153)` would return an array. Two exports one
preposition apart, returning different kinds of thing, in the same autocomplete list.

`losarFor(year)` already established `*For(year)` for "the X of royal-era year Y", so `monthsFor`
follows a convention rather than inventing one. `monthsInYear` keeps its name because it pairs with
`daysInMonth`, and both are counts.

## What this stops a contributor doing

- Adding `isLeapYear` as an alias "for familiarity". It reintroduces the inconsistency, and an
  alias is as permanent as the name it duplicates.
- Renaming the internal `hasLeapTwin` back to `hasLeapMonth`. That is the per-**month** predicate —
  "is month M preceded by a leap twin" — and the export is the per-**year** one. Two functions with
  one name answering different questions is worse than either naming problem. `test/public-api.test.ts`
  pins the exported arity for exactly this reason. The phrase "leap twin" is not an invention; it is
  what `errors.ts` and the README already call it.
- Adding `monthsOfYear` beside `monthsInYear`.
