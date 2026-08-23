# Other implementations, and when to use them

Status: authored. A survey of the other software that computes Tibetan calendar dates, written so
that someone choosing a library can choose correctly — including choosing something else.

**Nothing here rests on reading anyone's source code.** Every claim comes from the project's own
README, its npm registry metadata, its published tarball's file listing, or its public web pages.
That is partly the same evidence discipline
[validation-sources.md](validation-sources.md) applies to calendar data, and partly a constraint
this project works under: it is a clean-room implementation of Janson's paper, and reading a
competing implementation would compromise that.

All figures accessed **2026-08-23**. Download counts are the npm registry's last-30-day figures.

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

**If you need a Mongolian date today, use this.** That is not a hedge; it is the honest answer.

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
package computes none of that.** Anyone who needs an astrological almanac rather than a calendar
should start here, and there is nothing else to point them to.

It is also the ancestor of the Bhutanese calendar data this project validates against, and thereby
of most Bhutanese calendar applications in circulation.

**Where this package differs.** It is a program, not a library: it writes text files to disk, so
consuming it from an application means parsing its output or porting its arithmetic. It is Windows
and C. And being unmaintained, it will not change again.

## When to use which

| If you need | Use |
|---|---|
| An astrological almanac — planets, lunar mansions, eclipses | Henning's software |
| A Mongolian date, today | `@hnw/date-tibetan` |
| A Tibetan date in a few lines, on legacy `Date` | `tibetan-date-calculator` |
| A calendar application: month grids, observances, year names, Bhutan | this package |
| Dates you can cite a validated range for | this package |

## What this package does not claim

It is the newest of the four and, at the time of writing, unreleased — so it has no track record,
no users, and none of the incidental robustness that comes from years of people finding edge cases
in public. It requires Node 26 or a polyfill, which none of the others do. And it computes no
astrological information at all.

What it does offer that the others do not is an observance layer whose conventions are configuration
rather than assumption, tradition constants injected as data rather than hardcoded, and — the part
that matters most — a statement, for every claim it makes, of the range of years over which that
claim has been checked. See [why you can trust these dates](why-trust-these-dates.md).
