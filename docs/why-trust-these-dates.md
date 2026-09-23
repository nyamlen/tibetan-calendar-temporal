# Why you can trust these dates

A Tibetan calendar is not a lookup table.
Every date this package returns is computed, and a computed calendar can be wrong in ways that look
entirely plausible — a day number one higher than the almanac prints, a leap month in the wrong
year, a festival on the wrong side of a doubled date.
None of those crash anything.
They simply produce a calendar that is quietly incorrect, which for a calendar people plan practice
around is the expensive kind of error.

This page is the honest account of what has been checked, against what, and over which years.
It assumes no programming knowledge.
If the calendar itself is unfamiliar, read
[how it is calculated](how-it-is-calculated.md)
first.

## Where the arithmetic comes from

The engine implements Svante Janson's *Tibetan Calendar Mathematics*
([arXiv:1401.6285](https://arxiv.org/abs/1401.6285)), a mathematical description of the Phugpa
system and its variants.
It is a clean-room implementation: it was written from that paper alone and shares no code with any
other Tibetan calendar library.

That matters for a reason beyond licensing.
When this engine agrees with another implementation, the agreement means something, because the two
did not arrive at their answer the same way.
Two programs descended from the same source agreeing tells you nothing at all — a point the project
takes seriously enough to organise its sources around, in
[validation sources](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/validation-sources.md#lineage-is-the-thing-that-matters).

## What has been checked, and over what years

The single most important thing on this page is that **every claim of agreement comes with the
range of years it covers.**
Agreement quoted without its window is not evidence; it is advertising.

### How much has actually been checked

Nearly **18,000 rows** of published calendar data are committed to this repository and compared
against the engine on every change. That number is worth breaking down rather than quoting, because
the shape of it matters more than the size:

| What | Rows | Against |
|---|---|---|
| Bhutanese days, 1 Jan 2000 – 2 Apr 2030 | 11,050 | one lineage (Henning's software) |
| Phugpa days, 1 Jan 2022 – 25 Feb 2028 | 6,579 | **four independent sources** |
| Royal Government of Bhutan days, 2025–2026 | 25 | an independent almanac |
| Losar, 1927–2046 | 120 | Janson |
| Leap months across four traditions, 2000–2030 | 124 | Janson (for 2021–2030, Janson's own values from his published source files, which he left out of the printed paper) |
| Astrological attributes | see below | Janson's tables, and FPMT for the mansion and the yoga |

**Two honest qualifications, and they are the reason the table is here rather than a headline
number.**

The 6,579 Phugpa rows are **comparisons, not distinct days**: the four sources overlap only in part
— all four cover the same days only from 1 January 2024 to 31 December 2025 — and between them they
cover **2,247 distinct days**, every day from 1 January 2022 to 25 February 2028.
Four independent sources agreeing on the same day is much stronger evidence than one source checked
on four times as many days, which is exactly why the number is presented this way round.

And the 11,050 Bhutanese rows, though far the largest block, descend from **a single lineage**. They
establish that the engine reproduces Henning's Bhutanese calendar for just over thirty years, from
1 January 2000 to 2 April 2030.
They do not independently establish that the calendar is right, because a shared misreading would
appear in both.
The twenty-five Royal Government rows are the only genuinely independent check on Bhutanese day
numbers, and twenty-five is what it is.

So the useful summary is not "18,000 days verified". It is: **four independent Phugpa sources which
between them cover every day from 1 January 2022 to 25 February 2028, just over thirty years of
Bhutanese dates against one lineage plus twenty-five government-published days, and 120 years of
Losar against Janson.**

### The Tibetan (Phugpa) calendar

Checked **day by day against four independent sources, which between them cover every day from
1 January 2022 to 25 February 2028** — FPMT's own published monthly calendars and three independent
implementations.
Each source covers its own window, and a claim resting on one of them should quote that source's:

| Source | What it is | First day | Last day | Days | Agree |
|---|---|---|---|---|---|
| FPMT monthly calendars | published almanac | 1 Jan 2022 | 31 Dec 2025 | 1,461 | 1,458 — three days differ, explained below |
| Lotsawa House | independent implementation | 21 Feb 2023 | 25 Feb 2028 | 1,831 | all |
| eszthoff | independent implementation | 1 Jan 2023 | 31 Dec 2027 | 1,826 | all |
| christian-steinert | independent implementation | 1 Jan 2024 | 31 Dec 2027 | 1,461 | 1,438 |

- **FPMT's monthly calendars** are the practice calendars the Foundation for the Preservation of the
  Mahayana Tradition publishes each month, prepared from the Men-Tsee-Khang calendar.
  The agreement in this table is on **dates** only; which days carry an observance is a separate
  check, with a narrower window, described under "Observances" below.
- **Lotsawa House** is a library of translated Tibetan Buddhist texts whose website carries a Phugpa
  calendar calculator.
- **eszthoff** is `tibetan-date-calculator`, an openly published calendar library; only the dates it
  computes are used here.
- **christian-steinert** is Christian Steinert's *Tibetan Buddhist Practice Dates* website.
  It differs from the engine on 23 days, each by one number beside a skipped or doubled date,
  because it follows a different rule for which number such a date consumes.

Two of the four, Lotsawa House and eszthoff, agree on every single day in range, including every
doubled date, both leap months and every skipped date.

Outside that window of just over six years the evidence is thinner and differently shaped:

- **Losar, 1927–2046** — Janson prints the Tibetan New Year for 120 consecutive years. The engine
  reproduces all 120.
- **The epoch year, 806** — the founding constants match his to six decimal places.
- **1027–1091** — Janson's own computer search found 16 places where two defensible values of one
  lunar constant give different dates in what he calls the first 65-year cycle.
  The engine reproduces all 16, and his counts for the twentieth and twenty-first centuries too.
  This is the only external check on calendar output before 1927.

The precise statement of what that does and does not establish is at
[testing.md, what that does and does not cover](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/testing.md#what-that-does-and-does-not-cover).

**Full and new moons** are checked against the moon icons FPMT prints on its monthly calendars, from
1 January 2022 to 31 December 2025.
Over those four years FPMT marks 99 full and new moons, and the engine puts 98 of them on the same
day.
The 99th is the new moon of February 2025: day 30 is skipped that month, so the engine places the new
moon on the 27th, and FPMT marks it one day later, on the 28th.
Where FPMT's moon icons come from is not recorded, so this is agreement with FPMT's calendar rather
than with the almanac behind it.

### The Bhutanese calendar

Checked **day by day from 1 January 2000 to 2 April 2030** against calendar data descending from
Edward Henning's Bhutanese calendar software, and separately against **twenty-five days of the Royal
Government of Bhutan's own published calendar** for 2025–2026, including three skipped days, two
doubled days and Losar.

| Source | What it is | First day | Last day | Days | Agree |
|---|---|---|---|---|---|
| Henning's lineage | calendar data from Edward Henning's Bhutanese calendar software | 1 Jan 2000 | 2 Apr 2030 | 11,050 | all, under the Henning variant |
| Royal Government of Bhutan | the government's own published calendar, read by hand | 2 Jan 2025 | 24 Jun 2026 | 25, chosen rather than consecutive | all |

Three qualifications, all of which matter:

- The window ends on **2 April 2030**, not at the end of the year, because the upstream source
  carries one leap month Janson does not list.
- The long day-by-day check validates the *Henning* variant of the Bhutanese configuration, not the
  default one; the two differ on three days inside the window.
- Everything checking Bhutanese **day numbers** except the Royal Government calendar traces back to
  a single lineage. That government calendar is the only genuinely independent check, and it is
  twenty-five days.

### Observances

FPMT's observance set, shipped as `DEFAULT_OBSERVANCES`, is checked against **FPMT's own published
monthly calendars for 2022–2025** — not merely against FPMT's guidance page, but against the
calendars themselves, day by day.

## What is not established

Stating this is the point of the page.

- **Tsurphu and the Mongolian calendar are not shipped.** The engine can express both, and their
  leap months are checked against Janson for 2000–2030 (for 2021–2030, Janson's own values from his
  published source files, which he left out of the printed paper).
  But no Tsurphu or Mongolian *date* has ever been checked against a real almanac, so neither is
  offered. The rule the project holds itself to
  is that a calendar is published only once its dates have been tiled against an external calendar
  day by day.
- **Three days disagree with FPMT**, and they are not smoothed over: 2022-12-03, 2023-11-09 and
  2024-12-08. Each is a one-number difference about which day a skipped or doubled date consumes,
  resolved by the following day. Four explanations were tested and every one ruled out — including
  our own arithmetic, as far as the three other implementations reach: none of them has data for
  2022-12-03, Lotsawa House and eszthoff side with the engine on 2023-11-09, and all three do on
  2024-12-08. The reasoning is set out in full at
  [testing.md, where FPMT's calendars differ](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/testing.md#where-fpmts-calendars-differ).
- **One Bhutanese constant cannot be settled** by any source available today. The dates that would
  decide it have passed or lie decades ahead; the next is in 2047.
- **Observances are not validated for Bhutan.** Asking for FPMT's observances on a Bhutanese
  calendar will produce output, and nothing establishes that output is right. Treat it as out of
  scope.
- **The calendar is usable from 1447**, when the Phugpa system was introduced. Earlier dates are
  computed, and they are a back-projection: the system did not exist, and the year numbering is a
  modern convention applied backwards.
- **The astrological attributes are computed but corroborated much less than the dates.** This said
  "no astrological information is computed" until 2026-09-12, when the `./astrology` subpath landed,
  and the honest version is longer. The cycles — the year's five elements, the month's and lunar
  day's labels, the calendar day's — are closed forms checked against Janson's own printed tables,
  which catches a transcription or formula error and is **not** external corroboration. The **lunar
  mansion** needs real astronomy and agrees with FPMT's published codes on **97.6%** of the 1,459 days
  in 2022–2025 whose code can name one. Henning's published daily calendars, compared once outside the
  test suite, give the same mansion as this engine on all 1,459 of those days and disagree with FPMT
  on the same ones, so the difference is on FPMT's side: its moon runs slightly ahead, mostly on days
  late in a mansion, and far more often in 2025 than in the three years before.
  No cause is established, and **six days in four years fit no pattern at all**. Yoga
  **favorability** is FPMT's convention, and agrees with their printed prefixes on 99.7% of the 1,460
  days whose code can be read.
  A Tibetan dictionary, the *tshig mdzod chen mo*, states the same element pair for each of the ten
  yogas and grades them into four groups, shipped as `auspiciousness`; its grading agrees with
  FPMT's favorable six. That is a check on the ten rows of a table, not on any date, and which yoga
  is in which group is read from the order the dictionary lists them, because it states only how
  many are in each. Month and lunar-day attributes **refuse** for the Bhutanese traditions,
  because no source gives them.
- **Planetary positions and eclipses are not computed**: they are Janson's Appendix D, and
  deliberately out of scope. Nor are two things his main text describes and almanacs print, the
  twenty-seven astronomical yogas and the karaṇas, or half lunar days; those are recorded as possible
  later work. Sources that print any of these are computing something this package does not.

## Why the results are identical everywhere

Two design decisions do most of the work here, and both are structural rather than a matter of
care:

**All the arithmetic is exact.** The engine uses whole numbers throughout, with the astronomical
constants held as exact fractions. No decimals are rounded anywhere. That is what makes the same
date come out identically on every machine, every operating system and every run, rather than
almost identically.

**No sunrise is ever calculated.** The Tibetan day begins at daybreak, about 5 a.m. local mean
solar time. Rather than compute a sunrise — which would need a location, and would make every
answer depend on one — that offset is built into the founding constants once and never applied
again. The consequence is that this calendar is fully determined without knowing where the reader
is.

## How to cite this

Any claim taken from this page should carry its window.
"Agrees with an independent implementation" is true and nearly useless on its own; "agrees with
Lotsawa House's calculator on every day from 21 February 2023 to 25 February 2028" is the claim that
can be checked.

---

Links marked with a full address point into the project's repository on GitHub and are not included
in the published package: the contributor-facing
[testing strategy](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/testing.md),
[validation sources](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/validation-sources.md) and
[traditions](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/traditions.md).
