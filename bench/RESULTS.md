# Benchmark results

Status: recorded by hand from `npm run bench`. Re-run it and update this file before a release.

**A number without its harness is unusable**, which is the rule this project applies to every other
figure it publishes and therefore applies to its own. Nothing here may be quoted without the
machine, the runtime and the date below.

## Harness

| | |
|---|---|
| Date | 2026-08-23 |
| CPU | Intel Core i5-7300U @ 2.60 GHz, 4 logical cores |
| Memory | 16 GB |
| OS | Windows 10 (10.0.19045), x64 |
| Node | v26.7.0 |
| Vitest | 4.1.10, `vitest bench --run` |

This is a 2017 dual-core laptop CPU. It is deliberately not a fast machine: a figure that is
comfortable here is comfortable anywhere, and the numbers below should be read as an upper bound on
cost rather than as a best case.

## Results

| Case | Mean | Ops/sec | Note |
|---|---|---|---|
| `isoToTibetan`, one date | 0.0136 ms | 73,709 | ±4.96% over 36,855 samples |
| `isoToTibetan`, one year of days | 5.94 ms | 168 | 366 conversions |
| `monthsFor`, cold — year not seen before | 0.118 ms | 8,502 | ±16.43% |
| `monthsFor`, warm — year already computed | 0.0002 ms | 4,116,231 | **484× faster than cold** |
| `getObservances`, 200 years (the cap then; it is 10 years now) | 268 ms | 3.72 | min 238, max 333 |
| `getObservances`, one year | 1.41 ms | 711 | the realistic case |

## What these confirm, and what they corrected

**The `monthsFor` cache is confirmed.** `CLAUDE.md` argues the memoisation earns its keep because a
repeated year drops from "~180 µs to under 1 µs". Measured: 118 µs cold, 0.2 µs warm. The cold
figure is faster than recorded and the warm figure is well under the claim, so the argument holds
and is now measured rather than asserted.

**The `getObservances` cap figure was wrong and has been corrected.** `src/observances/index.ts`
justified `MAX_SPAN_YEARS` by saying the maximum admissible span "runs in about 190 ms". It runs in
**about 270 ms** here. The docblock was updated to the measured figure, with this harness named.

The correction does not weaken the cap's justification, and that is worth stating so the number is
not quietly re-tuned later. The docblock's argument was never that 190 ms is acceptable and 270 ms
would not be — it is that what the cap guards against is the range *beyond* it. `Temporal.PlainDate`
spans about 547,000 years, so an uncapped span forwarded from user input is three orders of
magnitude larger than the cap, synchronously and without yielding. That argument is indifferent to
whether the cap costs 190 ms or 270 ms. What was wrong was the number, not the reasoning.

**Single-date conversion is the figure the README may quote**: about 74,000 conversions a second on
the machine above, or a full year of days in under 6 ms.

## The `formula` form, 2026-11-11

A second machine, so these figures are **not comparable** with the table above.

| | |
|---|---|
| Date | 2026-11-11 |
| CPU | Intel Core Ultra 7 365, 8 logical cores |
| Memory | 32 GB |
| OS | Windows 11 Pro (10.0.26300), x64 |
| Node | v26.11.1 |
| Vitest | 4.1.10, `vitest bench --run` |

| Case | Mean | Note |
|---|---|---|
| `getObservances`, 200 years (the cap then), `EXAMPLE_OBSERVANCES` | 116 ms | min 110, max 120 |
| `getObservances`, 200 years (the cap then), plus one `formula` rule | 424 ms | min 393, max 573; an earlier run gave 352 ms |

A formula rule tests every calendar day, so it is the one form whose cost is per day and not per
month. It walks months like the others, classifies each day number and tests the formula on the
number and a weekday taken from the Julian day, building a Tibetan date only for its results. Its
first version converted every calendar day (`isoToTibetan`) and took 988 ms here.

## The 10-year cap, 2026-11-11

Same machine as the `formula` section above (Intel Core Ultra 7 365, Windows 11 Pro 10.0.26300,
Node v26.11.1, Vitest 4.1.10, `vitest bench --run`), run with nothing else running.
`MAX_SPAN_YEARS` is now 10, so the 200-year rows above describe the cap as it was.
"Every form" is a config holding one rule each of `monthly`, `annual`, `period`, `western` and
`formula`; the `counted` form is not in it and is measured with its own task.

| Case | Mean | Budget | Note |
|---|---|---|---|
| `getObservances`, 10 years (the cap), every form | 21.6 ms | | min 17.3, max 29.1; 24 samples |
| `getObservances`, 10 years (the cap), `EXAMPLE_OBSERVANCES` | 6.5 ms | | min 4.9, max 16.6 |
| `getObservances`, 2 years, every form (planning chunk) | 4.16 ms | 100 ms | min 3.2, max 13.9 |
| `getObservances`, 1 year, every form (year view) | 2.23 ms | 50 ms | min 1.7, max 12.5 |
| `getObservances`, 1 month, every form (month view) | 0.53 ms | 10 ms | min 0.41, max 35.5 |
| `observancesOn`, 1 day, every form (day view) | 0.39 ms | 5 ms | min 0.32, max 33.4 |
| `getObservances`, 1 year, `EXAMPLE_OBSERVANCES` | 0.65 ms | | min 0.49, max 9.1 |

The 10-year worst case is under the year-view budget, and every view is well inside its budget.

## The `counted` form, 2026-11-11

Same machine and harness as the 10-year cap section (Intel Core Ultra 7 365, Windows 11 Pro
10.0.26300, Node v26.11.1, Vitest 4.1.10, `vitest bench --run`), run with nothing else running.
The rule is Rabten-shaped: anchor 1/15, 15 waxing, 14 and 15 waning, `exclude` 1/1. A counted rule
widens the month walk to the Tibetan year before the range and the one after it, so a day view walks
about three years. "And the five other forms" is the `every form` config of the cap section plus
the counted rule.

| Case | Mean, counted alone | Mean, counted and the five other forms | Budget |
|---|---|---|---|
| `observancesOn`, 1 day (day view) | 0.042 ms | 0.95 ms | 5 ms |
| `getObservances`, 1 month (month view) | 0.052 ms | 1.07 ms | 10 ms |
| `getObservances`, 1 year (year view) | 0.25 ms | 2.82 ms | 50 ms |
| `getObservances`, 2 years (planning chunk) | 0.46 ms | 4.92 ms | 100 ms |
| `getObservances`, 10 years (the cap) | 2.40 ms | 22.1 ms | |

Every view is well inside its budget, and no cache is needed for the form.

## `nextObservance`, 2026-11-11

Same machine and harness as the 10-year cap section (Intel Core Ultra 7 365, Windows 11 Pro
10.0.26300, Node v26.11.1, Vitest 4.1.10, `vitest bench --run`), run with nothing else running.
Each config holds the one rule alone, from `2026-08-12`, under `doubledDay: "first"`,
`skippedDay: "following"` and `leapMonth: "leap"`. The planning budget is 100 ms.

| Case | Mean | Budget | Note |
|---|---|---|---|
| `monthly`, the next occurrence is near | 0.122 ms | 100 ms | max 8.3 |
| `annual`, the next occurrence is near | 0.055 ms | 100 ms | max 9.4 |
| `period`, the next occurrence is near | 0.240 ms | 100 ms | max 9.7 |
| `western`, the next occurrence is near | 0.130 ms | 100 ms | max 35.1 |
| `formula`, the next occurrence is near | 0.606 ms | 100 ms | max 75.6 |
| `counted`, the next occurrence is near | 0.082 ms | 100 ms | max 75.1 |
| `annual`, window ended: `null` after the full 10-year horizon | 0.192 ms | 100 ms | max 7.8 |
| `western`, window ended: `null` after the full 10-year horizon | 0.153 ms | 100 ms | max 23.4 |
| `western`, window starts beyond the horizon: `null` | 0.188 ms | 100 ms | max 54.2 |

The worst case, `null` after the whole horizon, is the slowest of the `annual` and `western` rows
and still about 500 times under the budget. The `formula` form is the slowest "near" case because it
tests every calendar day of its chunk. A `max` far above the mean is a single collection pause, not
the typical call.

`nextObservance` walks one rule's months, so `getObservances` now does the same once per rule rather
than walking each month once for every rule. Re-measured the same day, with the cases of the 10-year
cap section: 10 years, every form, 28.9 ms (min 23.0, max 40.9; 18 samples); 2 years, every form,
5.38 ms; 1 year, 3.30 ms; 1 month, 0.60 ms; 1 day, 0.50 ms. Every view is inside its budget (100, 50,
10 and 5 ms), though the 10-year figure is above the 21.6 ms the cap section recorded, so the
per-rule walk costs something on a config with many rules.

## Re-recorded, 2026-11-14

The full `npm run bench` run after the observance rebuild, so its `EXAMPLE_OBSERVANCES` rows are the
19-rule example, which holds a `counted` rule and a `formula` rule. It supersedes the figures above
that describe the same cases. Quote these.

| | |
|---|---|
| Date | 2026-11-14 |
| CPU | Intel Core Ultra 7 365, 8 logical cores |
| Memory | 32 GB |
| OS | Windows 11 Pro (10.0.26300), x64 |
| Node | v26.11.1 |
| Vitest | 4.1.12, `vitest bench --run` |

Run with nothing else running. The whole file was run once, and each mean is that run's.

| Case | Mean | Budget | Note |
|---|---|---|---|
| `isoToTibetan`, one date | 0.0068 ms | | 73,806 samples |
| `isoToTibetan`, one year of days | 2.98 ms | | 168 samples |
| `monthsFor`, cold | 0.0456 ms | | |
| `monthsFor`, warm | 0.0001 ms | | **567x faster than cold** |
| `getObservances`, 10 years (the cap), every form | 28.5 ms | | min 22.7, max 40.2; 18 samples |
| `getObservances`, 10 years (the cap), `EXAMPLE_OBSERVANCES` | 33.6 ms | | min 25.6, max 47.2; 15 samples |
| `getObservances`, 2 years, every form (planning chunk) | 5.03 ms | 100 ms | min 3.80, max 16.2 |
| `getObservances`, 1 year, every form (year view) | 2.54 ms | 50 ms | min 2.00, max 12.3 |
| `getObservances`, 1 month, every form (month view) | 0.533 ms | 10 ms | min 0.431, max 5.45 |
| `observancesOn`, 1 day, every form (day view) | 0.347 ms | 5 ms | min 0.312, max 1.69 |
| `getObservances`, 1 year, `EXAMPLE_OBSERVANCES` | 3.12 ms | 50 ms | min 2.53, max 12.4 |
| `getObservances`, 10 years, counted and the five other forms | 26.9 ms | | 19 samples |
| `getObservances`, 2 years, counted and the five other forms | 5.11 ms | 100 ms | |
| `getObservances`, 1 year, counted and the five other forms | 2.78 ms | 50 ms | |
| `getObservances`, 1 month, counted and the five other forms | 0.542 ms | 10 ms | |
| `observancesOn`, 1 day, counted and the five other forms | 0.374 ms | 5 ms | |
| `getObservances`, 10 years, counted alone | 2.83 ms | | |
| `getObservances`, 1 year, counted alone | 0.307 ms | | |
| `nextObservance`, the next occurrence is near | 0.049 to 0.409 ms | 100 ms | `formula` the slowest at 0.409 ms, `annual` the fastest at 0.049 ms |
| `nextObservance`, `null` after the full 10-year horizon | 0.132 to 0.165 ms | 100 ms | `annual` 0.165 ms, `western` 0.132 ms |

Every view is inside its budget. The 19-rule example costs more than the one-rule-per-form config
over ten years (33.6 ms against 28.5 ms) because it holds a `counted` rule and a `formula` rule
beside eleven annual, five monthly and one period rule. The earlier 6.5 ms and 0.65 ms rows for
`EXAMPLE_OBSERVANCES` measured it before it held the `counted` and `formula` rules, and are
superseded.

## The `PlainDate` copy, 2026-11-18

A Western date is now copied into a plain `Temporal.PlainDate` before the engine reads it, so a
subclass's overridden `since` or `year` cannot answer for it.
Measured on the 2026-11-14 harness above (same machine, Node v26.11.1, Vitest 4.1.12), each column
one run of the whole file. Means per operation; "before" is the code without the copy, run twice
to rule out drift between runs.

| Case | Before | Before, again | Copy on every call | Copy at the boundary only |
|---|---|---|---|---|
| `isoToTibetan`, one date | 6.7 µs | 6.5 µs | 7.4 µs | 6.6 µs |
| `observancesOn`, 1 day, every form | 0.386 ms | 0.387 ms | 0.416 ms | 0.379 ms |
| `getObservances`, 1 month, every form | 0.545 ms | 0.547 ms | 0.606 ms | 0.482 ms |
| `getObservances`, 1 year, every form | 2.54 ms | 2.60 ms | 2.95 ms | 1.89 ms |
| `getObservances`, 1 year, `EXAMPLE_OBSERVANCES` | 3.11 ms | 3.11 ms | 3.56 ms | 2.24 ms |
| `getObservances`, 10 years (the cap), every form | 26.95 ms | 26.64 ms | 30.12 ms | 17.68 ms |
| `getObservances`, 1 year, counted alone | 0.309 ms | 0.309 ms | 0.347 ms | 0.210 ms |
| `nextObservance`, annual, the next occurrence is near | 0.053 ms | 0.053 ms | 0.060 ms | 0.033 ms |
| `monthsFor`, warm (no Western date) | 0.2 µs | 0.2 µs | 0.2 µs | 0.2 µs |

**Copy on every call** was the first version: the engine's own loops (`datesFor`, the observance
month walk, `losarFor`, the navigation functions) called the public `isoToTibetan` with dates they
had just built, so each computed day was normalised and copied twice, 10% to 17% slower than before.
**Copy at the boundary only** is what shipped: those loops call `tibetanFromJulianDay` and
`julianDayFromIsoUnchecked`, which skip the normalisation the engine's own dates do not need, so a
caller's date is copied once where it enters.
That made multi-day queries 25% to 37% faster than **before** the copy existed, because the old
internal route had run the full boundary check on every day too.
A single conversion still pays its one copy, within the run-to-run spread of about ±6%.
In the one run, three rows came out slower: `getObservances`, 1 month, counted and the five other forms (+24%), and two `nextObservance` rows that return `null`.
A second run gave 0.522 ms, 0.093 ms and 0.066 ms for those, against 0.575 ms, 0.106 ms and 0.069 ms before, so they were noise.
The test *a date the engine made is not copied again* in `test/temporal-kind.test.ts` holds the
boundary-only property: before the change, `datesFor` made 58 copies for a 29-day month.

## What is deliberately not here

No regression thresholds, and `bench` is **not** in CI. Shared runners vary enough that a threshold
would fire on the runner rather than on the change, and this project holds that a guard which fires
wrongly is worse than none — the same reasoning that leaves the validation-suite rule unguarded in
`scripts/check-conventions.mjs`.

`npm run bench` sits with `npm run coverage`, `verify:names`, `verify:rabjung-names`,
`verify:month-and-yoga-names`, `verify:mansion-and-trigram-names` and `verify:observance-names`: release-time
checks that gate nothing and are listed in
[docs/roadmap.md](../docs/roadmap.md).
