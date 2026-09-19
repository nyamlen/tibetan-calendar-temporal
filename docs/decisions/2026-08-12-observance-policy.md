---
date: 2026-08-12
status: accepted
---

# Observance conventions are injected data, never logic

**Decision:** which days an institution marks, which half of a doubled date it keeps, whether it
observes in a leap month, and what it does with a skipped date are held in an `ObservanceConfig`
that the caller supplies, with a citation required on every rule. None of it is branching inside
the engine, and the layer ships behind the `./observances` subpath rather than on the root export.

## The constraint this exists to protect

It is tempting to read the sources, pick the right answer, and encode it. **There is no right
answer to encode.** The published sources contradict each other, and the primary source
contradicts the calendar it describes:

- **Doubled dates.** Janson's holidays section, following Berzin, says an observance falls on the
  *first* of the pair, the leap day almanacs mark "Extra" — and Janson adds that he has not
  checked those rules against published calendars. FPMT's guidance says the *second*, "but may be
  celebrated on the first day if it is more convenient". Both are cited; they disagree.
- **Institutions of one school disagree.** FPMT's calendars put the 2024 Chokhor Duchen on
  10 July, the second — matching its guidance. Kopan Monastery, also Gelug, observed it on the 9th
  and the Liberation Prison Project calendar on the 10th, which is what "July 9 or July 10" in
  FPMT's own announcement records.
  This bullet said until 2026-09-19 that FPMT also disagrees with itself, by placing *sojong* on
  19 November 2025, the first of a doubled 30.
  It does not: sojong is a count of days since the previous one, not a date, so no doubled-day
  convention applies to it — see the Sojong item in [roadmap.md](../roadmap.md).
- **Leap months.** Janson says observances are "usually not celebrated in leap months". FPMT
  prints the 2024 Chokhor Duchen inside leap month 6, and 4 of the regular month 6 that follows
  carries nothing at all.

Encoding any one of these as engine logic would make the package quietly wrong for everyone who
follows the other, while looking authoritative. That is the failure mode
[CLAUDE.md](../../CLAUDE.md) is written against.

## What this makes true

- **Conventions are config fields with per-rule overrides.** Three axes — `doubledDay`,
  `skippedDay`, `leapMonth` — defaulting on `ObservanceConfig` and overridable on any
  `ObservanceRule`. The per-rule level is not speculative generality: the shipped Gelug config
  needs it, because FPMT's monthly cycle behaves differently from its great days. Its guidance
  governs "special days", so the four duchen follow it, while the monthly practices track the
  printed numbers — a doubled 8th is labelled twice, and a skipped 25th is not observed that
  month rather than moved to the 24th.
- **A monthly rule is monthly.** The leap-month convention applies only to rules with a fixed
  month. A recurring observance happens in both halves of a leap pair; FPMT prints tsok on the
  10th of leap month 6 and again on the 10th of the regular month 6.
- **`source` is required on `ObservanceRule`**, including for caller-supplied rules.
  `CONTRIBUTING.md` asks for a citation per fixture row; putting it in the published type carries
  that outward, so a rule invented from memory is at least conspicuously uncited.
- **An institution differs by spreading the config**, exactly as `PHUGPA_HENNING` is built from
  `PHUGPA` — never by editing the engine, and never by a flag added to `TraditionConfig`, which
  holds astronomical constants only.
- **Nothing is shipped that cannot be cited and checked.** *Sojong* is left out for this reason: a
  fixed 15th-and-30th rule misses 38 of FPMT's occurrences over 2022–2025 and invents 36, mostly
  landing a day early. Whatever governs it is not a day number. An approximate rule is worse than
  no rule in a package whose value is that the dates can be trusted. Teacher anniversaries are
  left out because the data is institution-specific and changes within a decade — and some are
  Gregorian-fixed, which is not a Tibetan calendar fact at all.

## Why a subpath rather than the root

Everything on the root export makes a **falsifiable** claim: a constant checks against Janson, a
date against an almanac, and a disagreement is a bug in one of the two. Nothing in this layer
does. Separate import paths are honest about that difference, and a consumer who wants only date
conversion never loads the rules or inherits anyone's conventions.

This is also why Losar is *not* here. It is a calendar fact — day 1 of month 1, or day 2 where
day 1 is skipped — so it ships as `losarFor` on the root, beside the conversions. See
[2026-08-12-public-surface.md](2026-08-12-public-surface.md).
