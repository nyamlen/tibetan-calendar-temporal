# Traditions

**Status: reference, not shipped data.** Nothing in `src/` or `test/` reads this file.

**Exported means day-by-day validated.** `PHUGPA`, `PHUGPA_HENNING`, `BHUTAN` and `BHUTAN_HENNING`
are exported because each has been tiled against an external calendar day by day. Tsurphu and the
Mongolian version are documented here and *not* exported, and the difference is evidence rather than
effort: their leap months are validated against Janson, their dates against nothing. That is the
rule, not an accident of what got written first — see "Why there are no drop-in configs here".

It exists because the project's founding promise — that a second tradition is a new
`TraditionConfig` rather than a change to any computation module — was believed rather than tested,
and because the roadmap carried a claim about Tsurphu that turned out to be false.

The promise has since survived two real tests: the leap-month **rule** became
`leapIndexThreshold`, and the leap month's **position** became `leapMonthPosition`. Neither was a
constant, both had been hardcoded to Phugpa's, and neither would have announced itself.

## The claim that was wrong

`docs/roadmap.md` said for three phases that Tsurphu "differs solely in the constants". It does not.
Janson states a **different leap-month rule for each version**:

| Tradition | Leap month when the intercalation index is | Janson's β\* at that version's epoch | `leapMonthPosition` |
|---|---|---|---|
| Phugpa | 48 or 49 | 61 (E806) | `"before"` |
| Tsurphu | 0 or 1 | 59 (E1732), 0 counting back to 806 | `"before"` |
| Mongolian (New Genden) | 46 or 47 | 10 at its epoch, 46 counting back to 806 | `"before"` |
| Bhutanese | 57 or 58 *(simplified)*, 59 or 60 *(traditional)* | 2 (E1754) | `"after"` |

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
- *Its **dates** are right* — established for Phugpa and, since 2026-08-16, for Bhutan. Not for
  Tsurphu or the Mongolian version, and that is why neither is exported.

**Bhutan needed none of this reconciliation, and the reason is worth knowing before anyone repeats
the work.** The offset above is a property of the *comparison table*, not of Janson's paper. His
Bhutan appendix gives the epoch data directly — JD 2361807, Monday 22 April 1754 — and states that
`m₀` there is already "modified to yield the JD", which is the form a `TraditionConfig` wants. So
`BHUTAN` is built from the appendix and the table is not involved. Check the appendices before
reaching for the comparison table; Tsurphu and Mongolia are the versions that genuinely need it.

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
Bhutan being solved. It was not, and this table is not what solved it. Janson's simplified Bhutanese
rule identifies the regular month *followed by* a leap month, and the leap month takes that number —
so the number this engine reports was already the Bhutanese one while its **position** was still
Tibet's. Position is what moves dates, and it is checked below rather than here.

## What would establish the third claim

Janson's versions-comparison section carries two further cross-version tables not yet extracted:
New Year dates over a range of years, and every repeated and skipped day in 2012 — a day-level
check, for a year he picks precisely because no version has a leap month in it. Both need the
astronomical constants, so both wait on the epoch offset above being reconciled.

## Bhutan's leap-month position, and how it was closed

**A leap month takes the number of the preceding month**, so it falls *after* the regular month
sharing its number. In Phugpa, Tsurphu and the Mongolian version it falls before. Janson calls this
"an important difference", notes it is the Chinese system rather than the Indian, and that it seems
to have been the original Kālacakra कालचक्र system.

This is `TraditionConfig.leapMonthPosition` since 2026-08-16. Two things about the closing are worth
keeping, because both were got wrong first.

**The adjustment is not a sign flip.** The obvious reading — `trueMonthCount` subtracts one for a
leap month, so Bhutan adds one — is wrong, and a draft of this file said it. A twinned pair always
occupies the counts `rounded − 1` and `rounded`; only the label moves. Under `"after"` the leap month
keeps `rounded` and it is the **regular** month that takes `rounded − 1`, *and only when it has a
twin*. The `+1` form leaves a gap of two before every pair and a collision after it, which stops the
count being a bijection. `test/computation/leap-month-position.test.ts` sweeps 1900–2100 asserting
the count advances by exactly one per month; the rejected form fails it 222 times.

**"Before" was built into more places than the four this file used to list.** The four were
`trueMonthCount`, `monthFromCount`, `sharesNumberWithLeapMonth` (then `hasLeapTwin`, whose *name*
asserted a direction its predicate does not) and the `M06L` semantics — of which the last needed no
code change at all, since `formatTibetanDate` and `parseTibetanDate` handle the code lexically. The
four that were missed all mattered more:

- **`losarJulianDay`** and both bounds of `monthsFor` spelled "the last month of the year" as
  `(12, isLeap: false)`. Under `"after"` a year can *close* with a leap month 12, so New Year came
  back one lunation early — in exactly the year this file's Bhutanese anchor falls in. Now one
  derivation, `lastMonthCountOfYear`.
- **`monthsFor`** emitted the leap month first unconditionally, returning a year whose `lunation`
  steps backwards mid-list.
- **`getObservances`** located a leap twin by probing `monthCount ± 1`, which points the wrong way
  under `"after"`. The failure was a *missed* twin rather than a mirrored one, so the `leapMonth`
  convention was bypassed and observances fired in **both** months of the pair.

The observance layer's `leapMonth: "leap" | "regular"` convention itself needed nothing: it branches
on the semantic flag, so "leap" means the leap month wherever it sits.

### What validates it

`test/validation/bhutan.test.ts`, against `test/fixtures/bhutan.ts` — day-by-day Bhutanese dates
descending from Henning's software, reduced to a month sequence. The engine reproduces it at
**exactly one** offset across 375 months, and flipping the position back to `"before"` matches at
**no** offset, which is the control that makes the first number mean something.

The check is deliberately about **months, not dates**, and that is what let it run now: the sequence
depends on the epoch, the threshold and the position alone. Bhutan's `m₀`, `s₀` and `a₀` are still
unreconciled, so no day-level Bhutanese date is claimed here.

### A defect in the fixture, recorded not smoothed

Its leap months reproduce Janson's four-version table exactly for twelve of thirteen, then carry a
thirteenth he does not list: a leap month 2 from 2030-04-03, directly after the leap month 1 he does.
That year would hold regular 1, leap 1, leap 2, regular 3 — two consecutive leap months and no
regular month 2. The upstream leaves its leap flag set one month too long, once.

`scripts/fetch-bhutan-fixtures.mjs` now carries a fifth check requiring every leap month to be paired
with a regular month of the same number immediately before it. Validation runs up to the anomaly and
the anomaly is pinned exactly, so a corrected re-fetch fails the test and reopens the window rather
than leaving a narrower check than the data supports.

**One consequence to know before re-running that script: it will now refuse to write this window.**
The committed fixture predates the fifth check and does not satisfy it.

### The a₂ fork is one fork, not one per tradition

Janson states that `a₂` is the same in every version, and his Remark 30 explains the split: `1/28` is
a rounded value used "for convenience", while Henning uses the exact `(1 + a₁)/30 = 3781/105840`,
proposed by Minling Lochen Dharmashri (1654–1717). So the choice is between **almanac practice and
Henning's computed calendars**, across all four versions at once — not between Tibet and Bhutan.

`BHUTAN` therefore keeps the rounded value, exactly as `PHUGPA` does, and `BHUTAN_HENNING` carries
the exact one. They differ on **three days in 11,050** — 2001-12-10, 2004-04-10 and 2020-04-23 —
about one in 3,700, matching the rate Janson gives for Tibet.

**Which side the validation data sits on, stated plainly.** The only day-by-day Bhutanese calendar
available descends from Henning's own software, so it follows Henning's `a₂` and validates
`BHUTAN_HENNING`. Reading that as evidence about what *Bhutanese almanacs* print would be circular,
and Janson gives no Bhutanese statement on the fork. The default follows almanac practice for
consistency with Phugpa, and this is the open question a Bhutanese almanac would settle.

### Observances are not validated for Bhutan

`getObservances(from, to, BHUTAN, GELUG)` type-checks the moment `BHUTAN` is exported, and nothing
establishes it. `GELUG` is FPMT's Tibetan-practice observance calendar; Bhutan's state calendar has
its own holidays, including a winter solstice computed at mean solar longitude 250° that has no
counterpart in `GELUG` at all. Treat that pairing as out of scope.

### Still Bhutan's, and still not modelled

Bhutan names its **weekdays one planet ahead** of Tibet — Saturday is *nyi ma* there where Tibet has
*spen pa*. That is `TraditionNaming.weekdayOffset`, a naming concern rather than a calendrical one,
and it affects no date.

## Who uses which

Janson, citing Berzin:

- **Tibet** — Phugpa is the most widely used, and the one the Dalai Lama follows. Tsurphu is the
  Karma Kagyu system.
- **Bhutan** — its own version, as an official state calendar, in Dzongkha.
- **Mongolia** — the New Genden version. Also followed by the **Buryats and Tuvinians** of Siberia.
- **Russia** — the **Kalmyks** follow **Phugpa**, so they are served by what ships today.
- **Inner Mongolia**, in China, uses the Chinese "yellow system" instead, which is not a version of
  the Tibetan calendar and is out of scope here.
