# Traditions

**Status: reference, not shipped data.** Nothing in `src/` or `test/` reads this file. `PHUGPA` and
`PHUGPA_HENNING` remain the only exported configs.

It exists because the project's founding promise — that a second tradition is a new
`TraditionConfig` rather than a change to any computation module — was believed rather than tested,
and because the roadmap carried a claim about Tsurphu that turned out to be false.

## The claim that was wrong

`docs/roadmap.md` said for three phases that Tsurphu "differs solely in the constants". It does not.
Janson states a **different leap-month rule for each version**:

| Tradition | Leap month when the intercalation index is | Janson's β\* at that version's epoch |
|---|---|---|
| Phugpa | 48 or 49 | 61 (E806) |
| Tsurphu | 0 or 1 | 59 (E1732), 0 counting back to 806 |
| Mongolian (New Genden) | 46 or 47 | 10 at its epoch, 46 counting back to 806 |
| Bhutanese | 57 or 58 *(simplified)*, 59 or 60 *(traditional)* | 2 (E1754) |

That rule was hardcoded to Phugpa's until 2026-08-16. A Tsurphu config built from constants alone
would have placed leap months in the wrong years — with no error and nothing about the output
looking wrong. It is now `TraditionConfig.leapIndexThreshold`.

Janson gives the Bhutanese rule twice because the traditional intercalation index runs two higher
than the simplified one this package computes. **Use the simplified value**, 57.

## What is derived from the threshold

Two quantities, neither of which may be written as a literal:

- **The rounding term** in `trueMonthCount` is `65 − threshold`. Janson's familiar `+17` is `65 − 48`.
- **β** is `67·M₀ − β* − (65 − threshold)`.

This reproduces every value Janson publishes, which is what makes it his formula rather than a
plausible one. Checked in `test/computation/leap-index-threshold.test.ts`:

| Tradition | β\* | threshold | derived β | Janson's β | γ\* derived | Janson's γ\* |
|---|---|---|---|---|---|---|
| Phugpa (E806) | 61 | 48 | **123** | 123 | **33** | 33 |
| Tsurphu (E806) | 0 | 0 | **136** | 142 at E1732 — congruent mod 65 | **20** | 20 |
| Mongolian (E806) | 46 | 46 | **136** | 172 at its epoch — congruent mod 65 | **20** | 20 |
| Bhutanese (E1754) | 2 | 57 | **191** | 191 | **28** | 28 |

β is only ever used modulo 65, which is why the congruent rows are agreement rather than
discrepancy — Janson himself publishes two different β for two Tsurphu epochs, differing by 65.

Note that Tsurphu and the Mongolian version land on the **same β mod 65**, which independently
reproduces his statement that the two have the same leap months despite different epochs and
different β\*.

## Janson's four-version epoch data

From his versions-comparison section, the table of epoch data for JD 2015531 (23 March 806), in his
mixed-radix notation with the exact fractions derived from it. Every fraction was checked against
the six-decimal value he prints beside it — all twelve agree.

`m₀` uses radices ⟨60,60,6,707⟩ and is given **modulo 7**; `s₀` uses ⟨27,60,60,6,67⟩; `a₀` uses
⟨28,126⟩.

| | Phugpa | Tsurphu | Mongolian | Bhutanese |
|---|---|---|---|---|
| `m₀` | 2;22,34,2,518 | 2;25,20,2,352 | 2;25,6,3,327 | 2;24,37,5,431 |
| | 240/101 | 18496003/7635600 | 13679/5656 | 6817/2828 |
| `s₀` | 0,8,3,3,33 | 0,29,34,5,37 | 0,38,17,0,6 | 0,28,12,3,15 |
| | 1/201 | 991/54270 | 19/804 | 7/402 |
| `a₀` | 5,98 | 5,112 | 5,101 | 6,22 |
| | 13/63 | 53/252 | 731/3528 | 389/1764 |

**A notation trap, which cost a wrong first reading here.** A semicolon marks an integer part; a
leading comma means there is none and every digit is fractional. `m₀` is `2;…` and has an integer
part 2; `s₀` and `a₀` are `0,…` and `5,…` and do not — `5,98 ⟨28,126⟩` is `5/28 + 98/3528`, not
five-and-a-fraction. Janson's six-decimal column is the guard, and it caught the mistake
immediately. Do not transcribe these without checking against it.

## Why there are no drop-in configs here

**A second trap, and the reason this file stops short of runnable literals.** The epoch data above
is *not* interchangeable with a `TraditionConfig`'s epoch, even for Phugpa:

```text
shipped PHUGPA m₀ as JD : 2015501.845651
comparison-table m₀ as JD : 2015531.376238
difference                : 29.530587  = exactly m₁, one mean lunar month
```

The comparison table is stated one lunar month away from the epoch the shipped config uses. Dropping
its values into a config with `epochYear: 806, epochMonth: 3` would therefore produce a calendar
shifted by a month — the exact failure this package exists to prevent, arrived at by way of a table
that looks like it was made for the purpose.

Reconciling that offset is required before any of these becomes a config, and doing it *without*
validation data would only move the guess. **Three claims must be kept apart:**

- *This tradition is expressible in `TraditionConfig`* — true for Tsurphu and the Mongolian version,
  since the leap rule was the only thing missing.
- *Its **leap months** are right* — **now established** for all four versions. See below.
- *Its **dates** are right* — not established for any tradition but Phugpa.

## What is now validated: leap months, all four versions

`test/validation/cross-version-leap.test.ts` checks all four against Janson's leap-month table,
extracted mechanically into `test/fixtures/cross-version-leap.ts`.

This is possible because **leap months depend on nothing astronomical**: the intercalation index is
built from the epoch year, the epoch month and the threshold alone. So the part of a tradition that
cannot yet be safely transcribed — `m₀`, `s₀`, `a₀` — is not needed to check the part that can.

| Window | Standing | Result |
|---|---|---|
| 2000–2020 | printed in the paper | all four reproduced exactly |
| 2021–2030 | present only in his LaTeX comments | all four reproduced exactly |

β\* at the common epoch E806 is 61 for Phugpa, **0 for Tsurphu** and **46 for the Mongolian**
version — both of which Janson states, since counting back to the Kālacakra epoch *nag pa* 806
yields those indices. The **Bhutanese β\* at E806 is not stated**; 0 is what his E1754 value of 2
implies, and 31 years of agreement is the evidence for it.

**A precision worth keeping.** The Bhutanese column agrees, and it would be easy to read that as
Bhutan being solved. It is not. Janson's simplified Bhutanese rule identifies the regular month
*followed by* a leap month, and the leap month takes that number — so the number this engine reports
is already the Bhutanese one. The leap month's **position** is still unmodelled, and that is what
moves dates.

## What would establish the third claim

Janson's versions-comparison section carries two further cross-version tables not yet extracted:
New Year dates over a range of years, and every repeated and skipped day in 2012 — a day-level
check, for a year he picks precisely because no version has a leap month in it. Both need the
astronomical constants, so both wait on the epoch offset above being reconciled.

## Bhutan is a step further back

No field here expresses the Bhutanese difference: **a leap month takes the number of the preceding
month**, so it falls *after* the regular month sharing its number. In Phugpa, Tsurphu and the
Mongolian version it falls before. Janson calls this "an important difference", notes it is the
Chinese system rather than the Indian, and that it seems to have been the original Kālacakra
कालचक्र system.

"Before" is currently built into the shape of four functions — `trueMonthCount` (which subtracts one
for a leap month, where Bhutan needs the opposite sign), `monthFromCount` (whose `mod 67 ∈ {1,2}`
test identifies the earlier twin), `hasLeapTwin` (whose predicate inverts), and the `M06L` semantics
shared by `formatTibetanDate` and `parseTibetanDate`. The observance layer's `leapMonth` convention
would also select a different one of the pair.

Bhutan additionally names its **weekdays one planet ahead** of Tibet — Saturday is *nyi ma* there
where Tibet has *spen pa* — which is a naming concern rather than a calendrical one, and does not
affect any date.

## Who uses which

Janson, citing Berzin:

- **Tibet** — Phugpa is the most widely used, and the one the Dalai Lama follows. Tsurphu is the
  Karma Kagyu system.
- **Bhutan** — its own version, as an official state calendar, in Dzongkha.
- **Mongolia** — the New Genden version. Also followed by the **Buryats and Tuvinians** of Siberia.
- **Russia** — the **Kalmyks** follow **Phugpa**, so they are served by what ships today.
- **Inner Mongolia**, in China, uses the Chinese "yellow system" instead, which is not a version of
  the Tibetan calendar and is out of scope here.
