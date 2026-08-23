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
[how it is calculated](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/how-it-is-calculated.md)
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

### The Tibetan (Phugpa) calendar

Checked **day by day, every day, against four independent sources** over **2022–2027** — Lotsawa
House, christian-steinert, the eszthoff library, and FPMT's own published monthly calendars.
Two of the four agree on every single day in range, including every doubled date, both leap months
and every skipped date.
The full results table is at
[testing.md, Results](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/testing.md#results).

Outside those six years the evidence is thinner and differently shaped:

- **Losar, 1927–2046** — Janson prints the Tibetan New Year for 120 consecutive years. The engine
  reproduces all 120.
- **The epoch year, 806** — the founding constants match his to six decimal places.
- **1027–1091** — Janson's own computer search found 16 places where two defensible values of one
  lunar constant give different dates in the first sixty-year cycle. The engine reproduces all 16,
  and his counts for the twentieth and twenty-first centuries too. This is the only external check
  on calendar output before 1927.

The precise statement of what that does and does not establish is at
[testing.md, what that does and does not cover](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/testing.md#what-that-does-and-does-not-cover).

### The Bhutanese calendar

Checked **day by day over 2000 to early 2030** against calendar data descending from Edward
Henning's Bhutanese calendar software, and separately against **twenty-five days of the Royal
Government of Bhutan's own published calendar** for 2025–2026, including three skipped days, two
doubled days and Losar.

Three qualifications, all of which matter:

- The window ends in **early 2030**, not at the end of it, because the upstream source carries one
  leap month Janson does not list.
- The long day-by-day check validates the *Henning* variant of the Bhutanese configuration, not the
  default one; the two differ on three days inside the window.
- Everything checking Bhutanese **day numbers** except the Royal Government calendar traces back to
  a single lineage. That government calendar is the only genuinely independent check, and it is
  twenty-five days.

### Observances

The shipped Gelug observance set is checked against **FPMT's own published monthly calendars for
2022–2025** — not merely against FPMT's guidance page, but against the calendars themselves, day by
day.

## What is not established

Stating this is the point of the page.

- **Tsurphu and the Mongolian calendar are not shipped.** The engine can express both, and their
  leap months are checked against Janson for 2000–2030. But no Tsurphu or Mongolian *date* has ever
  been checked against a real almanac, so neither is offered. The rule the project holds itself to
  is that a calendar is published only once its dates have been tiled against an external calendar
  day by day.
- **Three days disagree with FPMT**, and they are not smoothed over: 2022-12-03, 2023-11-09 and
  2024-12-08. Each is a one-number difference about which day a skipped or doubled date consumes,
  resolved by the following day. Four explanations were tested and every one ruled out — including
  our own arithmetic, since the three other implementations side with the engine on each of these
  days. The reasoning is set out in full at
  [testing.md, where FPMT's calendars differ](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/testing.md#where-fpmts-calendars-differ).
- **One Bhutanese constant cannot be settled** by any source available today. The dates that would
  decide it have passed or lie decades ahead; the next is in 2047.
- **Observances are not validated for Bhutan.** Asking for Gelug observances on a Bhutanese
  calendar will produce output, and nothing establishes that output is right. Treat it as out of
  scope.
- **The calendar is usable from 1447**, when the Phugpa system was introduced. Earlier dates are
  computed, and they are a back-projection: the system did not exist, and the year numbering is a
  modern convention applied backwards.
- **No astrological information is computed** — no lunar mansions, no planetary positions, no
  elemental day qualities, no yoga or karana. Sources that print those are computing something this
  package does not.

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
"Agrees with three independent implementations" is true and nearly useless on its own; "agrees with
three independent implementations, day by day, over 2022–2027" is the claim that can be checked.

---

Links marked with a full address point into the project's repository on GitHub and are not included
in the published package: the contributor-facing
[testing strategy](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/testing.md),
[validation sources](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/validation-sources.md),
[traditions](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/traditions.md) and
[how it is calculated](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/how-it-is-calculated.md).
