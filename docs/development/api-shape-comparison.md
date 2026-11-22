# API shape, compared with other calendar libraries

Evidence gathered on **2026-08-26** for the pre-1.0.0 API surface review, kept as that review's record.
It moved here from [other-implementations.md](../other-implementations.md) on 2026-11-22, because a reader choosing a library does not need it and a contributor weighing a public name does.

**The figures are as they stood on 2026-08-26 and are not re-measured.**
The surface has changed since: on 2026-11-22 the root entry point has **38** runtime exports, not 40, and the package has two subpaths beside it, `./astrology` with 10 and `./observances` with 5 (counted from `dist/` with `Object.keys` of each entry point).
Re-measure the whole table before arguing from it again.

Gathered during the pre-1.0.0 API surface review, because the rule governing what earns a public
slot asks whether "a calendar library of this kind normally provides" a name — and every decision
in that review leaned on that test while nothing in the repository evidenced its premise.

**Sources: published documentation and READMEs only, accessed 2026-08-26**, under the same rule as
[other-implementations.md](../other-implementations.md): no source code was read. `Temporal` was additionally introspected on Node v26.7.0, and this package's
figures come from its own `dist/`; those two are exact. The hebcal figures are read off its
documentation pages and are **approximate** — see the caveat below.

Two general-purpose libraries are included alongside the Tibetan ones because the question is what
a calendar library normally provides, and the two Tibetan packages are far smaller in scope.

| | fields → date | month step from a date | month object | overflow documented? |
|---|---|---|---|---|
| `Temporal` | `PlainDate.from({y,m,d})` | `.add({months:1})` | `PlainYearMonth` | **yes** — `constrain` default, `reject` opt-in |
| `@hebcal/core` | `new HDate(d, m, y)` | `.add(n, 'month')` | — | **no** — absent from its `HDate` page |
| `tibetan-date-calculator` | constructor from `{year, month, isLeapMonth, day, isLeapDay}` | none documented | `TibetanMonth`, instantiable | n/a |
| `@hnw/date-tibetan` | `CalendarTibetan(cycle, year, month, leapMonth, day, leapDay)` | none documented | none | n/a |
| **this package** | `resolveDate(fields)` | `addMonthsToDate(date, n, { overflow })` | `TibetanMonth`, via `resolveMonth` | **yes** — `constrain` default, `reject` opt-in |

**The last row is what the review changed.** Before 2026-08-26 this package was the only one of the
five where reaching a date from its identifying fields had **no name of its own**: two indirect
routes existed — `addDays(x, 0)` and `isoToTibetan(tibetanToIso(x))` — and a consumer spike found
neither, hand-rolling around the gap instead. All four comparators make fields → date first-class,
so that gap was the package being the outlier. A peer *Tibetan* library already shipped an
instantiable month object, which settled the month half the same way.

Month arithmetic cut the other way and is worth recording honestly: **neither Tibetan library ships
it at all**, so "normally provided" fails for that category among the closest peers. What decided it
was that both general-purpose libraries ship it, and that `@hebcal/core` — the closest lunisolar
peer, with variable month lengths and leap months of its own — ships it **without stating what
happens when the day number does not exist in the target month**. That is the specific gap this
package set out not to reproduce, which is why its overflow is an explicit option rather than a
silent clamp.

## Surface size, counted two ways

Two units, because this package is flat functions and the peers are classes: counting only
top-level names flatters them, and counting only members flatters this package.

| Unit A — runtime exports | | | Unit B — total members met | |
|---|---|---|---|---|
| this package | **40** | | `Temporal` | **209** |
| `@hebcal/core` | ~23 | | this package | **78** |
| `Temporal` | **9** | | `@hebcal/core`, `HDate` alone | ~37 |
| `tibetan-date-calculator` | ~3 | | | |
| `@hnw/date-tibetan` | ~3 | | | |

Unit A counts **runtime exports only, on both sides**. An earlier draft compared this package's
runtime names *plus* its types against `Temporal`'s runtime namespaces alone — counting our types
and not theirs, which inflated us against the very comparator the conclusion rests on. `Temporal`
declares `PlainDateLike`, `DurationLike`, `ArithmeticOptions` and more; runtime-only is the
like-for-like unit, and the point survives it.

**The surface only looks large because it is flat.** `Temporal` has roughly four times fewer
top-level names and about 2.7 times the total members: it has namespace objects, and this package is
a bare ESM barrel where every name lands in a consumer's import scope. On the one directly
comparable component this package is **level with** its closest peer — `HDate` carries about 37
members against 31 for `TibetanDate`'s 15 fields plus the 9 navigation and 7 conversion functions.
Unit B for this package counts the 40 runtime exports plus the fields of the five public object
shapes, introspected from `dist/` rather than read off a document. And the two
Tibetan packages are an order of magnitude smaller in Unit A while doing considerably less: no
observances, month grids, navigation tier or name lookups, and one or three traditions rather than
four.

**Caveat on the hebcal figures, and why they are given as "~".** Its documentation index states it
is not a complete enumeration, and the numbers moved between two readings three days apart: on
2026-08-23 the `HDate` page was read as claiming 19 instance methods while listing 22, and on
2026-08-26 it listed 23 with no count claimed at all. Both readings are recorded rather than the
later one silently replacing the earlier, because the disagreement is the reason these are
approximate. A figure here is sourced to a page and a date exactly as every other claim in this
file is; prefer "at least N" to a false precision.
