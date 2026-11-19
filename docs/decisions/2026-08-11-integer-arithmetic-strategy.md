---
date: 2026-08-11
status: accepted
---

# Fixed common denominator, plain `number`, no rational type

**Decision:** every quantity is held as an integer scaled by one common denominator `D`, and `D`
is **derived from the tradition's own constants**, never hardcoded. Plain `number` is exact
throughout — no floats, no general rational type with gcd normalisation, and no `bigint` in any
calendar quantity or signature. `bigint` appears only in one-time config checks (the validator's and
`deriveScaling`'s overflow guards), which run once per config and return nothing the arithmetic
carries.

## Why this denominator

Janson's formulas produce rationals whose denominators are fixed and known in advance. For
Phugpa:

```text
mean_date     den 11312 = 2^4 · 7 · 101
moon_equ / 60 den  7560 = 2^3 · 3^3 · 5 · 7     (moon_tab argument has den 126, then ÷60)
sun_equ  / 60 den 24120 = 2^3 · 3^2 · 5 · 67    (sun_tab argument has den 402, then ÷60)

D = lcm = 2^4 · 3^3 · 5 · 7 · 67 · 101 = 102_317_040
```

`true_date = mean_date + moon_equ/60 − sun_equ/60`, so `true_date · D` is an integer. Scaling to
`D` makes every addition exact with no normalisation step, which is what "integer arithmetic with
fixed denominators" in [CLAUDE.md](../../CLAUDE.md) means in practice.

## `D` is tradition-dependent — do not hardcode it

This is the constraint most likely to be violated. `102_317_040` looks like a universal constant
and is not. Tsurphu (Janson App. A.2) shares Phugpa's mean-motion constants but has different
epoch values, and theirs carry factors Phugpa's do not: `m₀ = 2353745 + 1795153/7635600` brings a
second factor of 5, and `s₀ = −5983/108540` brings a fourth factor of 3.

```text
Phugpa   D = 2^4 · 3^3 · 5   · 7 · 67 · 101 =   102,317,040
Tsurphu  D = 2^4 · 3^4 · 5^2 · 7 · 67 · 101 = 1,534,755,600
```

Baking Phugpa's `D` into the arithmetic layer would make Tsurphu's constants inexpressible, and
`scaleTo` would reject them — or worse, silently truncate if the guard were ever removed. `D` is
computed per tradition with `lcm` over the config's actual denominators. This is what lets
[CLAUDE.md](../../CLAUDE.md)'s "Tsurphu must remain addable without touching the algorithm" hold.

## Why plain `number` is safe

The largest intermediate is approximately `JD · D`.

| Tradition | `D` | numerator at JD ≈ 2.46 × 10⁶ | headroom | exact to |
|---|---|---|---|---|
| Phugpa | 1.02 × 10⁸ | 2.5 × 10¹⁴ | 35.8× | JD 8.8 × 10⁷ |
| Tsurphu | 1.53 × 10⁹ | 3.8 × 10¹⁵ | 2.4× | JD 5.9 × 10⁶ |

Against `Number.MAX_SAFE_INTEGER` ≈ 9.0 × 10¹⁵. Tsurphu's margin is thin but sufficient — JD
5.9 × 10⁶ is roughly the year 11,000 — so `number` remains correct for any date either tradition
is meaningfully applied to. The bound is asserted by a per-tradition test rather than assumed.

Do not switch the arithmetic to `bigint` for safety. It is slower and it spreads through every
signature; the overflow guards may use it because they run once per config and hand back nothing but
a refusal or a pass. If a
future tradition ever did exceed the bound, the cheaper fix is to split each quantity into whole
days plus a fractional numerator below `D`, which caps every intermediate near 10¹³ regardless of
`D` — not to change the numeric type.

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
