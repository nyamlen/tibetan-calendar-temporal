---
date: 2026-08-12
status: accepted
---

# `PHUGPA` ships the almanac value of `a₂`, not Henning's

**Decision:** `PHUGPA` keeps `a₂ = 1/28`.
`PHUGPA_HENNING` keeps the exact `(1 + a₁)/30 = 3781/105840` and remains exported.
The default is not a coin toss between two defensible readings — the Men-Tsee-Khang almanac
follows `1/28`, and Janson verified that himself against a printed edition.

## The evidence

Janson §7, in the passage defining the exact value, states it outright:

> Nevertheless, the simpler \eqref{a2} is usually used when calculating calendars, for example
> in the almanac \cite{tib2013}.

`tib2013` resolves in his bibliography to *Tibetan Annual Almanac 2013*, Men-Tsee-Khang, Tibetan
Medical & Astro. Institute, Dharamshala — the authoritative Gelug almanac, and the source FPMT's
published dates are prepared from.

His footnote gives the method: the almanac prints the true day of week to three sexagesimal terms,
which is sensitive enough to separate the two values. Over the 360 lunar days of 2013 he found 134
days identical, 149 differing by ±1 in the third term, 75 by ±2 and 2 by ±3. A worked example,
present in the LaTeX source as a comment and so not visible in the rendered PDF, resolves the
direction:

```text
% Example 30/8 2013 (3 November)
% true date: 1 25 59 (almanac and calculation)
%            1 25 58 (better a_2)
```

The almanac agrees with `1/28` and disagrees with Henning's value. "Better `a₂`" is Janson's label
for the mathematically more natural `3781/105840`, proposed by Minling Lochen Dharmashri
(1654–1717); Henning uses it in his computed calendars.

## Two independent implementations agree

Janson names three dates in the modern era where the two values give different calendars. Both
public tools were checked on all three, by driving their front ends and comparing computed output
only — never their source:

| Date | Almanac line (`1/28`) | Henning (`3781/105840`) | Lotsawa House | christian-steinert |
|---|---|---|---|---|
| 2001-02-10 | 17th; 18th skipped | 18th; 17th skipped | 17th, `19 *` next day | `tibDay 17`, 18 absent |
| 2006-05-10 | 13th, doubled | 12th, doubled | `13 +`, `13 +` | `tibDay 13` repeated 1, 2 |
| 2025-11-19 | 30th, doubled | 29th, doubled | `30 +`, `30 +` | `tibDay 30` repeated 1, 2 |

Both follow `1/28`.

## What this corrects

`docs/testing.md` previously asserted that "Christian Steinert and Lotsawa House descend from
Henning's line". That is **wrong**, and it was load-bearing: it justified a warning that the
validation sources straddle the fork and that a mixed fixture set would fail in ways resembling
arithmetic bugs. They do not straddle it. Both agree with the almanac and with each other, so
fixtures can be curated from all of them together.

The claim's origin is worth naming, because it is the failure mode this project is built to avoid:
Henning's calendar archive is genuinely the best-known public dataset, and the inference "widely
used tool, therefore Henning-derived" was never checked against a divergence date. It cost nothing
to check and it was wrong.

## What does not distinguish the two

Two negative results, both worth keeping so they are not re-derived:

- **Losar cannot distinguish them.** Both values reproduce Janson's entire 1927–2046 Losar table.
  A test in `test/computation/conversion.test.ts` asserts this. It is what makes the 120-date
  table a good correctness gate: it exercises the month count, leap rule and labelling rule
  without being confounded by the fork.
- **Practice-day dates cannot distinguish them either.** Across 1950–2050 there are only 11
  divergences, and each is self-correcting within a day: the two values disagree about *which*
  number is doubled or skipped, not about where the month boundaries fall. On 2025-11-19 the
  observed new-moon day is 20 November under both. A published list of practice days therefore
  carries no information about the fork — only a day-by-day grid showing the doubled number does.

This is why a *list* of practice days cannot settle the question, and why a source must print day
numbers per day to be usable as evidence here.

### The grid was found, and it confirms the default

Phase 3 located exactly that source: FPMT's monthly calendars at
`fpmt.org/resources/calendar/YYYY/Month.php` print a Tibetan day number for every Gregorian day,
and are prepared from the Men-Tsee-Khang calendar. `test/fixtures/fpmt-observances.ts` generates
1,461 days of it, and `test/validation/fpmt.test.ts` measures both values against it:

- `a₂ = 1/28` diverges on **three** days.
- Henning's `3781/105840` diverges on those three **and** on the 2025 cluster — including
  2025-11-19, one of the three dates Janson names — where FPMT sides with the engine.

So the default rests on a direct day-by-day comparison against the almanac line, not only on
Janson's report of having checked a printed edition. An earlier version of this record said FPMT's
calendar could not settle the question; that was true of the prose announcements behind
`fpmt-holy-days.ts` and false of the monthly grids, which had not been found.

Three residual divergences survive under `1/28`, which is to say FPMT's published calendar is not
exactly Phugpa under either value. They are catalogued in
[testing.md](../testing.md#where-fpmts-calendars-differ) with the four explanations that were
tested and ruled out, and they do not bear on this decision: `1/28` is closer on every measure.

## Consequences

- No change to `src/traditions/phugpa.ts`. The default was already `1/28`; it is now evidenced
  rather than assumed.
- The three divergence dates are pinned as regression tests against the almanac line. If a future
  change flips them, the calendar has silently become Henning's.
- `PHUGPA_HENNING` stays exported, but **the two configs make different kinds of claim**, and an
  earlier version of this line got that wrong. It said the Henning variant "is a real tradition
  followed by real calendars". That claims more than the evidence supports: we know Henning's
  *software* uses the exact value and that Dharmashri *proposed* it, and we have no evidence that any
  community's almanac prints it. Under this project's own rule — exported means validated — that
  sentence was unearned.

  What each config actually asserts, and what validates it:

  | Config | Claim | Evidence |
  |---|---|---|
  | `PHUGPA` | **these are the dates Tibetans use** | Men-Tsee-Khang via FPMT's grids, plus two independent implementations |
  | `PHUGPA_HENNING` | **these are the dates Henning's line produces** | Henning's published archives, and the three divergence dates |

  Both are true and both are checkable; they are simply not the same statement. The variant is
  exported as the **diagnostic** for reconciling against a Henning-derived source — which is most
  public Tibetan calendar data — not as a rival answer to "what calendar does my community use". A
  consumer who does not know about the fork uses `PHUGPA` and is right.

  Deleting it would hide the fork rather than resolve it: the three divergence dates would still be
  there, and a user whose source disagreed on one day in 4,100 would have no way to find out why.
  `BHUTAN_HENNING` additionally carries the whole day-by-day Bhutan tiling (its window is in
  `docs/testing.md`), since that fixture
  descends from Henning — removing the variants would delete the main Bhutanese gate.
