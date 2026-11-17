---
date: 2026-08-16
status: accepted
---

# The leap month's position is a required config field, derived from nothing

**Decision:** `TraditionConfig.leapMonthPosition` is **required**, with no default, and is **not**
derived from `leapIndexThreshold`, from `id`, or from any other field.

## Why required rather than optional

The test is whether omission can produce a wrong **date**.

`TraditionNaming.weekdayOffset` is optional and that is correct: get it wrong and a label reads
oddly, while the date is untouched. `leapMonthPosition` moves dates by a whole month, silently, with
well-formed output — the failure class `leapIndexThreshold` exists to close, one level further out.
A default of `"before"` would hand Tibet's ordering to a Bhutanese config and every date in one
lunation would come out a month wrong, with nothing about the output looking wrong.

`undefined` is the likelier mistake than a wrong string, so the validator rejects absence separately
and with its own message. Both are `TCT_INVALID_TRADITION_CONFIG`; assert on the code, never the
wording.

## Why it cannot be derived from `leapIndexThreshold`

A rule of the form "threshold 57 ⇒ `"after"`" would put `57` in shared code, and `57` is a
tradition-specific literal — the same class as the hardcoded leap rule and the literal `±3` search
window.
The threshold is also not one number with one meaning.
Janson publishes the Bhutanese leap rule **twice**: 57-or-58 against the simplified intercalation
index this package computes, and 59-or-60 against the traditional index, which is that index
increased by 2 for the leap month and all later months until it passes 65 (his `β* = 2`).
A threshold of 59 alone does not state the second rule: `{ ...BHUTAN, leapIndexThreshold: 59 }` is a
different calendar from `BHUTAN`, differing on 177 of the 3,650 days from 2020-01-01, the first being
2022-02-02.
So the field takes a value relative to the index the engine computes, and what a value pairs with is
a fact about a tradition, not about a number.
The pairing is asserted in `test/validation/bhutan.test.ts` instead, where tradition-specific
assertions belong.

## Why it cannot be derived from the config's identity

There is no tradition enum to switch on. `PHUGPA`, `PHUGPA_HENNING`, `BHUTAN` and `BHUTAN_HENNING`
are configs, not members of a closed set, and consumers are documented as building their own.

The only candidate discriminator is `id`, which `TraditionConfig`'s own docblock rules out:
branching on it is the anti-pattern a `"phugpa" | "tsurphu"` selector would be, because `id` is
**consumer-settable**. `{ ...PHUGPA, id: "my-almanac" }` is a documented use.

## What this stops a contributor doing

- Adding a default "so existing configs keep working". Pre-1.0 is when that break is spent, and the
  break is a validator error naming the field rather than a wrong calendar.
- Adding a cross-field check between the position and the threshold "for safety". It would write
  which threshold values go with which position into shared code, a tradition-specific literal.
- Reading the field's `"before"`/`"after"` as Janson's vocabulary. **The two framings invert.**
  He says a leap month "takes the number of the *preceding* month", which places it **after** the
  regular month sharing that number. The field states position; his prose states numbering.

## Consequences that were not obvious

Threading the field through the engine touched **eight** sites, not the four the roadmap predicted,
and the four it missed were all *consumers* rather than definitions — `losarJulianDay`, both
`monthsFor` bounds, the `monthsFor` emission order, and the twin probe in `getObservances`. Counting
the definitions and forgetting the callers is the error worth remembering.

The arithmetic was also not what it looked like. The adjustment is **not a sign flip**: a twinned
pair always occupies the counts `rounded − 1` and `rounded`, and under `"after"` the **regular**
month takes the adjustment, only when it has a twin. See `trueMonthCount`'s remarks.
