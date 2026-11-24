# Other implementations, and when to use them

Status: authored. A survey of the other software that computes Tibetan calendar dates, written so
that someone choosing a library can choose correctly — including choosing something else.

**Nothing here rests on reading anyone's source code.** Every claim comes from the project's own
README, its npm registry metadata, its published tarball's file listing, or its public web pages.
That is partly the same evidence discipline
[validation-sources.md](sources/validation-sources.md) applies to calendar data, and partly a constraint
this project works under: it is a clean-room implementation of Janson's paper, and reading a
competing implementation would compromise that.

Figures accessed **2026-08-23**, except the npm versions and download counts, re-measured
**2026-11-22**, the Zurkhai entry, gathered **2026-09-10** and **2026-09-24**, and the Rabten Choeling
entry, gathered **2026-09-24**; each carries its own date.
Download counts are the npm registry's last-30-day figures.
How this package's API compares with these and with general-purpose calendar libraries is recorded for
contributors in [api-shape-comparison.md](development/api-shape-comparison.md).

## The field is small, and that is worth saying first

There are two other Tibetan calendar packages on npm, and their download counts are no measure of
their users: in the 30 days to 2026-11-22 one recorded 708 and the other 543,230, up from 146 in
August. A rise of that size cannot be a Tibetan-calendar audience, and its cause is not investigated
here.
This is not a market with a winner. It is a small field of people solving a hard problem for a
community that needs the answer to be right, and the useful question is not "which is best" but
"which one answers the question you actually have".

## `tibetan-date-calculator`

- npm `tibetan-date-calculator`, latest **1.2.3**, published 2025-08-25 (still latest on 2026-11-22)
- MIT, declared in `package.json` on every version since 1.0.0 in June 2019. There is no `LICENSE`
  file in the repository or the tarball, but the manifest field is a licence grant
- Zero runtime dependencies; repository now at
  [gitlab.com/TibetanCalendar/TibetanDateCalcualtor](https://gitlab.com/TibetanCalendar/TibetanDateCalcualtor)
- 708 downloads in the 30 days to 2026-11-22 (~228 a month in August)

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

- npm `@hnw/date-tibetan`, latest **1.0.2**, published 2025-05-17 (still latest on 2026-11-22)
- MIT, with a `LICENSE` file
- One runtime dependency: `astronomia`
- 543,230 downloads in the 30 days to 2026-11-22, against ~146 a month in August (see above); 4 stars on 2026-08-23

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
- Covers Phugpa, Tsurphu and the "Error Correction" system of Zhönnu Pal, plus a separate
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
- The App Store names the seller and developer as **Nikolai Tsyrenov**, with `https://zurkhai.app` as
  the seller's site
- Listed as "Zurkhai: Tibetan Calendar", genre Reference, first released **27 May 2026**; version
  **1.5**, released 8 September 2026
- The store lists English and Russian only, against the website's three languages, and mentions a
  "single optional one-time purchase" beside "no subscriptions"

The website figures were accessed **2026-09-10**. The App Store figures come from Apple's lookup API,
[`itunes.apple.com/lookup?id=6772695315&country=us`](https://itunes.apple.com/lookup?id=6772695315&country=us),
accessed **2026-09-24**, after `apps.apple.com` returned HTTP 429 on both attempts on 2026-09-10.

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

**Where this package differs.** Its website states one methodological fact — *"The calculations on
this site follow the Phugpa school"* — and cites no scholar, almanac edition or validated range, while
telling the reader that *"Exact dates vary by lineage; confirm with a published almanac."* Its App
Store description goes further and names editions: *"Calculations verified against printed Buryat
almanacs (Yampilov-Galsanov "Zurkhai-3", Atsagatsky Datsan publications)."* It states no range for
that verification. That is honest about the problem and says little about the answer. This package's whole claim is the opposite trade:
fewer features, and a stated window for every one of them.

Its attribute layer is recorded in [almanac-sources.md](sources/almanac-sources.md) as a comparison target
for the `./astrology` attributes. It is deliberately **not** in
[validation-sources.md](sources/validation-sources.md): the almanacs named in its App Store listing are what
it was checked *against*, not how it computes, so there is still no way to tell whether it descends
from Henning, and agreement from within a lineage already represented is not evidence.

## Rabten Choeling's calendar: a calendar to read, not a library

- [rabten.eu/en/calendar](https://www.rabten.eu/en/calendar), published by Rabten Choeling, Centre
  for Higher Tibetan Studies, Le Mont-Pèlerin, Switzerland; also offered as a "Tibetan Calendar" app
  for iOS and Android
- Day, month and year views in eight languages; day-level data for 2000–2100, year names for
  1900–2100
- No method, source, author or licence stated for the calendar, on the calendar pages, the editorial
  page or the apps page

Accessed **2026-09-24**.

**Like Zurkhai, it is listed as something to read, not something to install.** It is a well-made
Phugpa calendar for Rabten's own community: each day's Tibetan date, month starts, moon phases,
sojong, the weekday–mansion element pair, and the Gelug and Rabten-lineage anniversaries and birthdays
its centres keep, beside the Western feasts. Anyone who wants that calendar should use it.

**Where this package differs.** Rabten's conventions are fixed — which holidays appear, which `a₂`
value is used — where this package takes a tradition and an observance convention as configuration.
It computes with Henning's `a₂`, so on eight days between 2001 and 2099 its Tibetan date differs from
`PHUGPA`'s by one, including 19 November 2025, where FPMT's printed calendar agrees with `PHUGPA`. The
measurement, and why it is not corroboration, is in
[validation-sources.md](sources/validation-sources.md#rabten-choelings-calendar-hennings-lunar-anomaly-value-method-unstated).

## When to use which

| If you need | Use |
|---|---|
| An astrological almanac — planets, lunar mansions, eclipses | Henning's software |
| A calendar to read rather than compute with, on a phone | Zurkhai |
| A calendar to read with the Gelug and Rabten-lineage anniversaries, 2000–2100 | Rabten Choeling's calendar |
| A Mongolian date, today | `@hnw/date-tibetan` |
| A Tibetan date in a few lines, on legacy `Date` | `tibetan-date-calculator` |
| A calendar application: month grids, observances, year names, Bhutan | this package |
| Dates you can cite a validated range for | this package |

## What this package does not claim

It is the newest of the implementations here, first released as 1.0.0 in 2026 — so it has no track record,
no users, and none of the incidental robustness that comes from years of people finding edge cases
in public. It requires Node 26 or a polyfill, which none of the others do. And its astrological layer
is a fraction of Henning's: attributes, the mansion and the yoga, with no planets and no eclipses.

What it does offer that the others do not is an observance layer whose conventions are configuration
rather than assumption, tradition constants injected as data rather than hardcoded, and — the part
that matters most — a statement, for every claim it makes, of the range of years over which that
claim has been checked. See [why you can trust these dates](why-trust-these-dates.md).
