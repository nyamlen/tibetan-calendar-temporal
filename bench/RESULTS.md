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
| `getObservances`, 200 years (the cap) | 268 ms | 3.72 | min 238, max 333 |
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
| `getObservances`, 200 years, `EXAMPLE_OBSERVANCES` | 116 ms | min 110, max 120 |
| `getObservances`, 200 years, plus one `formula` rule | 424 ms | min 393, max 573; an earlier run gave 352 ms |

A formula rule tests every calendar day, so it is the one form whose cost is per day and not per
month. It walks months like the others, classifies each day number and tests the formula on the
number and a weekday taken from the Julian day, building a Tibetan date only for its results. Its
first version converted every calendar day (`isoToTibetan`) and took 988 ms here, about 2 s on the
machine in the first table.

## What is deliberately not here

No regression thresholds, and `bench` is **not** in CI. Shared runners vary enough that a threshold
would fire on the runner rather than on the change, and this project holds that a guard which fires
wrongly is worse than none — the same reasoning that leaves the validation-suite rule unguarded in
`scripts/check-conventions.mjs`.

`npm run bench` sits with `npm run coverage`, `verify:names`, `verify:rabjung-names`,
`verify:month-and-yoga-names` and `verify:mansion-and-trigram-names`: release-time
checks that gate nothing and are listed in
[docs/roadmap.md](../docs/roadmap.md).
