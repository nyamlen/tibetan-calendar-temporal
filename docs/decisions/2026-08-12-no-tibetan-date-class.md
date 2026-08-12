---
date: 2026-08-12
status: accepted
---

# No Temporal-shaped `TibetanDate` class

**Decision:** the package ships free functions only. There is no `TibetanDate` class with
`add` / `until` / `with`, and no day-arithmetic helpers either. This answers the question deferred
twice — at the start of Phase 1 and again into Phase 3 — rather than deferring it a third time.

## Why the deferral ended here

[2026-08-11-temporal-custom-calendars.md](2026-08-11-temporal-custom-calendars.md) deferred it on
the grounds that "Phase 3's practice-day logic is the first real consumer that can answer it", and
that designing it earlier would mean designing against an imagined API.

The consumer arrived, and its answer is that it does not need date arithmetic. `getObservances`
is **month-indexed**: it walks the linear true month count with `n++`, converts back through
`monthFromCount`, and resolves a day number inside a month with `classifyDay`. That is exactly
what `trueMonthCount` and `monthFromCount` are an inverse pair for — leap months need no special
case. At no point does it add a month to a date.

## Why `add` is not merely unneeded but ill-defined

Only **day** arithmetic is well defined, being Julian day ± n. Month and year arithmetic are not:

- **Leap months.** 15 of month 4 plus one month, in a year with a leap month 5 — leap-5/15 or
  regular-5/15? Both are defensible and the tradition supplies no answer.
- **`overflow: "constrain"`.** Temporal clamps to the last valid day of the target month. A
  Tibetan month's day numbers are not a contiguous range, so "last valid" needs a full existence
  scan, and the clamp target may itself be skipped.
- **`until` across a leap month.** Counting month *labels* and counting lunations give different
  totals.

A class implementing only the defined subset is worse than none. `add()` that throws on
`{months: 1}` is a partial implementation of a standard interface, and anyone arriving from
Temporal will write it and hit a runtime error. Decisively, [CLAUDE.md](../../CLAUDE.md) lists
**pure stateless functions** among the non-negotiable rules, and the whole package is free
functions; a class for two well-defined operations trades an architectural rule for autocomplete.

## The cost, accepted knowingly

If a class is ever added it will duplicate the free functions permanently — two ways to do
everything, `isoToTibetan()` and `TibetanDate.from()`. That is the real price of waiting, and it
is smaller than the price of baking in arithmetic semantics that the tradition does not license
and that publishing makes unfixable.

Day-arithmetic helpers are not added speculatively either.
`isoFromJulianDay(julianDayFromIso(d.isoDate) + 7)` works today with public functions, which is
part of why those helpers stay public — see
[2026-08-12-public-surface.md](2026-08-12-public-surface.md).

## Consequences

- Do not add `add`, `until`, `with`, `since` or a `TibetanDate` class without a consumer
  requirement that defines the leap-month and overflow semantics. "Consumers will want it" is not
  that requirement; a stated answer to the three questions above is.
- `Temporal.PlainDate` remains the only date object the package returns.
