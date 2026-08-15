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

## Amended 2026-08-15: the arithmetic shipped, the class did not

Free-function navigation now exists — `addDays`, `daysBetween`, `addMonths`, `monthsBetween`,
`lunationFromMonth`, `monthFromLunation`, `nextFullMoon`, `nextNewMoon`. This record's escape clause
required "a stated answer to the three questions above" before that, and
[2026-08-15-lunation-arithmetic.md](2026-08-15-lunation-arithmetic.md) states them. **The class
ruling is not reopened**, and a future reader should know which of the arguments below still carry
it, because two of the three are now answered:

- **Leap-month ambiguity in `add`** — answered. Lunation stepping has one outcome, not three. A
  Tibetan month is a lunation, so one month after leap-5 is regular-5.
- **`until` counting labels against lunations** — answered. Lunations are what is counted, which is
  why `monthsBetween` gives 3 from month 5 to month 7 in a year that doubles month 6.
- **`overflow: "constrain"` against non-contiguous day numbers** — **survives untouched.** A Tibetan
  month's day numbers are still not a contiguous range, "last valid day" still needs an existence
  scan, and the clamp target may still itself be skipped.

And the decisive argument is not merely intact but strengthened by what shipped. This record says
"a class implementing only the defined subset is worse than none" — and `addMonths` returning a
**month** is precisely a refusal to implement `add({ months })` in Temporal's shape, because
returning a *date* would require answering the skipped-day question the design declines. So a
Temporal-shaped class remains unimplementable in full, on top of
[CLAUDE.md](../../CLAUDE.md)'s non-negotiable "pure stateless functions".

Say this plainly, because **twenty-five root functions is the surface size at which the next
reviewer reaches for a class.** The answer is not "we never got round to it"; it is that the shape
cannot be honoured and a partial one is worse than none.

## Consequences

- Do not add a `TibetanDate` **class**, or `with` / a Temporal-shaped `add` / `until` on one. The
  free functions that ship do not license it: they exist *because* the shape cannot be honoured, and
  a class carrying only the honourable subset is worse than no class.
- `Temporal.PlainDate` remains the only date object the package returns.
- The free-function arithmetic is settled by
  [2026-08-15-lunation-arithmetic.md](2026-08-15-lunation-arithmetic.md), which also lists the three
  `addMonths` shapes that stay rejected. A request for one of them meets that record, not this one.
