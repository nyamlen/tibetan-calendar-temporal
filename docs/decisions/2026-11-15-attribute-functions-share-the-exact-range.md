---
date: 2026-11-15
status: accepted
---

# Every function taking a month refuses the same months, and checks the shape, then the tradition, then the range

**Decision:** `monthNamesFor`, `monthAttributesFor` and `lunarDayAttributesFor` stay bounded by the tradition's exact range, although their answers are closed forms on the month and never evaluate `true_date`.
Every export taking a month, a date or a Western date refuses an argument in this order: the shape, then the tradition, then the range.
Every export taking a bare number has no shape, so it checks the tradition first (`test/error-subjects.test.ts` pins all of them).

## The constraint this exists to protect

**The bound is the narrow form, and narrowing is the breaking direction.**
Widening a bound after 1.0.0 is non-breaking; narrowing it is not.
The three attribute functions inherited `daysInMonth`'s guard through `boundedMonth`.
Keeping it means a consumer can hold one rule — a month outside the exact range is refused everywhere — instead of learning which exports tolerate it.

**The tradition is checked before the range, and that order is load-bearing.**
`tibetanDateExists(badFields, {})` must refuse a broken config; a range check ahead of the tradition would answer `false` for it.
The order that was dangerous, "range before tradition", was retired on 2026-09-24.
Shape-then-tradition-then-range was chosen over tradition-first-everywhere because it is the cheaper of two safe orders and follows parameter order, not because tradition-first is unsafe.

## What this makes true

- Fourteen exports used to check the tradition first: the seven navigators, the moon pair through their shared helper, and `monthAttributesFor`, `lunarDayAttributesFor`, `elementalYogaFor`, `lunarMansionFor` and `attributesFor`.
  All now check the shape first.
  In the navigators the tradition check **moved** rather than went, because their range check runs before anything else validates the tradition; deleting it would have reproduced the retired order.
- `isoToTibetan` is the fifteenth, missed by the first count until a review found it.
- The bare-number exports (`monthFromLunation`, `weekdayNameFor`, `isoFromJulianDay` and the closed-form year functions) check the tradition first, ruled on 2026-11-18 so that every function taking a tradition validates it before its other arguments when there is no shape to check.
- A new export taking a month, a date or a tradition adds a row to `test/error-subjects.test.ts`; a failure there means the order changed.
