---
date: 2026-08-11
status: accepted
---

# Fixed common denominator, plain `number`, no rational type

**Decision:** every quantity in the Phugpa computation is held as an integer scaled by one fixed
denominator, `D = 102_317_040`. Plain `number` is exact throughout — no `bigint`, no floats, and
no general rational type with gcd normalisation.

## Why this denominator

Janson's formulas produce rationals whose denominators are fixed and known in advance:

```text
mean_date     den 11312 = 2^4 · 7 · 101
moon_equ / 60 den  7560 = 2^3 · 3^3 · 5 · 7     (moon_tab argument has den 126, then ÷60)
sun_equ  / 60 den 24120 = 2^3 · 3^2 · 5 · 67    (sun_tab argument has den 402, then ÷60)

D = lcm = 2^4 · 3^3 · 5 · 7 · 67 · 101 = 102_317_040
```

`true_date = mean_date + moon_equ/60 − sun_equ/60`, so `true_date · D` is an integer. Scaling to
`D` makes every addition exact with no normalisation step, which is what "integer arithmetic with
fixed denominators" in [CLAUDE.md](../../CLAUDE.md) means in practice.

## Why plain `number` is safe

At JD ≈ 2.46 × 10⁶ the scaled numerator is ≈ 2.5 × 10¹⁴, against
`Number.MAX_SAFE_INTEGER` ≈ 9.0 × 10¹⁵ — a margin of about 36×. Exactness holds to
**JD ≈ 8.8 × 10⁷**, roughly the year 240,000.

Do not switch to `bigint` for safety. It is slower, it spreads through every signature, and the
bound above is asserted by a test rather than assumed.

## Consequences a contributor would otherwise trip over

- **Do not introduce a `Rational { num, den }` arithmetic type.** Per-operation gcd normalisation
  is slower and buys nothing: the denominators are known at compile time.
- **Do not use floating point "just for the correction tables".** The table interpolation is
  exact integer arithmetic — `moon_tab` arguments have denominator 126, `sun_tab` 402.
- **`floorDiv` and `mod` must be correct for negative operands.** Janson warns about this twice
  (§2). JS `%` is remainder, not modulo, and `Math.floor` on a negative quotient is not the same
  as truncation. `amod` is `1 + (m − 1) mod n`.
- **The epoch stays E806.** `n = 0` there, so `n ≥ 0` for every date after 806 CE. E1987 would
  make `n` negative for anything earlier — precisely the sign case above. Smaller constants are
  not worth that class of bug.
- **The §13 period invariant cannot be tested end to end.** The calendar repeats after
  705,012,525 days, which exceeds the JD bound. Test it at month-count level instead.

## Inversion uses a proved window, not a guess

`isoToTibetan` estimates the lunar day count from mean motion and scans neighbours. The scan
width is not arbitrary: `|true_date − mean_date| = |moon_equ − sun_equ| / 60 ≤ (25 + 11)/60 = 0.6`
days, and no true lunar day is shorter than ≈ 0.897 days, so the estimate is within 2 of the
truth. **Scanning ±3 is provably sufficient**; a property test asserts it. Do not widen the
window to "be safe" — if a date is not found within it, the bug is elsewhere.
