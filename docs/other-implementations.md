# Other implementations, and when to use them

Status: authored. A survey of the other software that computes Tibetan calendar dates, written so
that someone choosing a library can choose correctly — including choosing something else.

**Nothing here rests on reading anyone's source code.** Every claim comes from the project's own
README, its npm registry metadata, its published tarball's file listing, or its public web pages.
That is partly the same evidence discipline
[validation-sources.md](validation-sources.md) applies to calendar data, and partly a constraint
this project works under: it is a clean-room implementation of Janson's paper, and reading a
competing implementation would compromise that.

All figures accessed **2026-08-23**, except the API-shape comparison below, which was gathered
**2026-08-26**, and the Zurkhai entry, gathered **2026-09-10**; both carry their own dates.
Download counts are the npm registry's last-30-day figures.

## The field is small, and that is worth saying first

The two Tibetan calendar packages on npm serve, between them, under 400 downloads a month.
This is not a market with a winner. It is a small field of people solving a hard problem for a
community that needs the answer to be right, and the useful question is not "which is best" but
"which one answers the question you actually have".

## `tibetan-date-calculator`

- npm `tibetan-date-calculator`, latest **1.2.3**, published 2025-08-25
- MIT, declared in `package.json` on every version since 1.0.0 in June 2019. There is no `LICENSE`
  file in the repository or the tarball, but the manifest field is a licence grant
- Zero runtime dependencies; repository now at
  [gitlab.com/TibetanCalendar/TibetanDateCalcualtor](https://gitlab.com/TibetanCalendar/TibetanDateCalcualtor)
- ~228 downloads a month

**Its strengths.** It is the established Tibetan calendar library for JavaScript, it has been
available for seven years, and it too is built on Janson's paper. Its API is a small, immediately
legible set of three classes — `TibetanDate`, `TibetanMonth`, `TibetanYear` — that mirror the
shapes of the calendar itself, so a month is an object you ask for its days. It handles the genuinely
hard parts: leap months, doubled days and skipped days. Its published tarball ships a test suite
with snapshots. If you want a Tibetan date in a few lines and you are already working with
JavaScript `Date` objects, it will give you one.

**Where this package differs.** It is built on the legacy `Date` object — its own README warns that
passing date strings "can create bugs when run in different timezones" — where this package uses
`Temporal.PlainDate` throughout and models no instants at all. It covers Phugpa only. It carries no
observance layer, and states no range over which its output has been checked against an almanac.

**A note on our relationship to it.** This project runs `tibetan-date-calculator` to generate one of
its cross-check fixtures, and it is one of the four sources this engine is checked against day by
day — see [why you can trust these dates](why-trust-these-dates.md) for the window that covers.
Computed dates are facts rather than copyrightable expression, which is what makes that comparison
legitimate while reading the code is not.

## `@hnw/date-tibetan`

- npm `@hnw/date-tibetan`, latest **1.0.2**, published 2025-05-17
- MIT, with a `LICENSE` file
- One runtime dependency: `astronomia`
- ~146 downloads a month, 4 stars

**Its strengths.** It is the only other library covering more than one tradition: Tibetan (Phugpa),
Mongolian and Bhutanese, as three classes. It converts to and from Gregorian dates and Julian Day
numbers, tracks the sixty-year rabjung cycle, and is the most direct route to a Mongolian date in
JavaScript — something this package can express but deliberately does not ship, because no Mongolian
date here has been checked against an almanac. It is also small and unfussy.

**Where this package differs.** Its calendar object is a six-element tuple —
`[cycle, year, month, leapMonth, day, leapDay]` — so the almanac information a calendar
application actually displays is not there: no year name, no weekday, no moon phase, no observances.
Its three traditions are three fixed classes rather than injectable configuration, so a fourth is a
code change. It depends on `astronomia` for its date conversions, which means floating-point
arithmetic, where this package is integer-only by design. And it states no validated range.

**One concrete API difference, found by running it.** Its calendar tuple has no way to say "the
first day of the year" when that day is skipped. Mongolian month 1 of 2025 begins on 1 March
numbered **day 2**, because day 1 is skipped — so a caller scanning for `{month: 1, day: 1}` finds
nothing and concludes the year has no new year. This package has `losarFor` for exactly that reason.
The difference is not a defect in either library; it is what a six-element tuple can and cannot
express.

**If you need a Mongolian date today, use this.** That is not a hedge; it is the honest answer —
this package can express the Mongolian calendar and deliberately does not ship it, because nothing
has validated a Mongolian date here. `@hnw/date-tibetan` reproduces Janson's Mongolian leap months
for every year checked, so it is a faithful implementation of the same paper.

## Edward Henning's open-source calendar software

- C source plus a Win32 command-line program, at
  [kalacakra.org](http://www.kalacakra.org/calendar/os_cal.htm)
- MIT, stated on the download page
- Covers Phugpa, Tsurphu and the "Error Correction" system of Zhonnu Pal, plus a separate
  Kālacakra कालचक्र *karaṇa* calendar
- Version 1.20. Edward Henning died in 2016; the software is unmaintained by necessity

**Its strengths, and they are considerable.** This is the work of the leading Western authority on
Kālacakra कालचक्र and the Tibetan calendar, refined over thirty years, and it computes far more than
this package does. Its output carries planetary longitudes both heliocentric and geocentric, the
lunar mansion and the time at which it changes, the Svarodaya स्वरोदय emblems, earth-lord movements,
trigrams, cyclic animals for the solar day, and the data needed for eclipse prediction. **This
package computes a small part of that and no more**: since 2026-09-12 its `./astrology` subpath gives
the attribute cycles, the lunar mansion and the elemental yoga, and it computes no planetary
longitude, no eclipse, and no emblem. Anyone who needs an astrological almanac rather than a calendar
should start here, and there is nothing else to point them to.

It is also the ancestor of the Bhutanese calendar data this project validates against, and thereby
of most Bhutanese calendar applications in circulation.

**Where this package differs.** It is a program, not a library: it writes text files to disk, so
consuming it from an application means parsing its output or porting its arithmetic. It is Windows
and C. And being unmaintained, it will not change again.

## Zurkhai — an end-user app, not a library

- [zurkhai.app](https://zurkhai.app/), website plus iOS app (`id6772695315`); Android in a closed
  beta
- Free, "fully offline, no ads"; English, Russian and Mongolian
- No developer name, copyright line, licence, repository or API stated anywhere on the public site
- Version, seller and release date **not established** — `apps.apple.com` returned HTTP 429 on both
  attempts, 2026-09-10

All figures accessed **2026-09-10**.

**It is listed here for the opposite reason to the others.** The three above are libraries a
developer might install instead of this one; Zurkhai is a finished consumer product and cannot be
imported. Someone arriving from a search for "Tibetan calendar" will meet it first, so the useful
thing this entry does is say plainly that it is not an alternative to a package — and that if what
you want is a calendar to *read* rather than one to *compute with*, it is very likely the better
answer.

**What it covers that no library here does.** Day-quality guidance for twelve named activities —
haircut, travel, business, medical treatment, moving house and more — alongside element-animal days,
lunar mansions and the sixty-year cycle. That is almanac territory, and among the software surveyed
here only Henning's reaches it.

**Where this package differs.** It states one methodological fact — *"The calculations on this site
follow the Phugpa school"* — and cites no scholar, almanac edition or validated range, while telling
the reader that *"Exact dates vary by lineage; confirm with a published almanac."* That is honest
about the problem and silent about the answer. This package's whole claim is the opposite trade:
fewer features, and a stated window for every one of them.

Its attribute layer is recorded in [almanac-sources.md](almanac-sources.md) as a comparison target
for the deferred `./astrology` work. It is deliberately **not** in
[validation-sources.md](validation-sources.md): with no stated lineage there is no way to tell
whether it descends from Henning, and agreement from within a lineage already represented is not
evidence.

## API shape, compared — added 2026-08-26

Gathered during the pre-1.0.0 API surface review, because the rule governing what earns a public
slot asks whether "a calendar library of this kind normally provides" a name — and every decision
in that review leaned on that test while nothing here evidenced its premise.

**Sources: published documentation and READMEs only, accessed 2026-08-26**, under the same rule as
the rest of this file. `Temporal` was additionally introspected on Node v26.7.0, and this package's
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

### Surface size, counted two ways

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

## When to use which

| If you need | Use |
|---|---|
| An astrological almanac — planets, lunar mansions, eclipses | Henning's software |
| A calendar to read rather than compute with, on a phone | Zurkhai |
| A Mongolian date, today | `@hnw/date-tibetan` |
| A Tibetan date in a few lines, on legacy `Date` | `tibetan-date-calculator` |
| A calendar application: month grids, observances, year names, Bhutan | this package |
| Dates you can cite a validated range for | this package |

## What this package does not claim

It is the newest of the four and, at the time of writing, unreleased — so it has no track record,
no users, and none of the incidental robustness that comes from years of people finding edge cases
in public. It requires Node 26 or a polyfill, which none of the others do. And its astrological layer
is a fraction of Henning's: attributes, the mansion and the yoga, with no planets and no eclipses.

What it does offer that the others do not is an observance layer whose conventions are configuration
rather than assumption, tradition constants injected as data rather than hardcoded, and — the part
that matters most — a statement, for every claim it makes, of the range of years over which that
claim has been checked. See [why you can trust these dates](why-trust-these-dates.md).
