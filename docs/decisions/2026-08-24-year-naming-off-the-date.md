---
date: 2026-08-24
status: accepted
---

# Year-level naming is not a field on `TibetanDate`

**Decision:** `TibetanDate` carries neither `rabjung` nor `yearName`. Both are reached through
`rabjungFor(date.year)` and `yearNameFor(date.year)`. `weekdayName` stays on the date.
`TibetanMonth.yearName` stays too.

## The rule this follows

**A date carries what it cannot regenerate from itself.**

`yearNameFor` and `rabjungFor` are closed forms over the year alone — three modulos, no lunar
arithmetic — and they take **no `TraditionConfig`**. A `TibetanDate` carries `year`, so both names
are one call away from any date, including one that has been serialised, stored and read back in a
process that never saw a config.

`weekdayNameFor` is different, and that difference is the whole line. It takes a `TraditionConfig`,
because Bhutan names its weekdays one planet ahead of Tibet — day 0 is *spen pa* in Tibet and
*nyi ma* in Bhutan. A serialised date carries no config, so dropping `weekdayName` would make a
Bhutanese date stop describing itself. It stays.

## Why the two that went, went

They are **year** properties sitting on a **day** object, so an array of dates holds one value
repeated 354 or 384 times. Measured on `JSON.stringify`, ordinary year 2153:

| | Bytes | Distinct values in the year |
|---|---|---|
| `yearName` | 90,624 (30.9%) | 1 |
| `rabjung` | 75,756 (25.9%) | 1 |
| `weekdayName` | 41,731 (14.2%) | 7 |

Removing both takes a serialised year from **293,009 to 126,629 bytes, −56.8%**, and a
thirteen-month leap year from 323,576 to 137,336, −57.6%. Those are the figures at the time; the
phonetics moving onto word-separated output took one byte off each day, so the ordinary year is now
126,275 and the leap year 136,952. The current ordinary-year figure is asserted in
`test/serialisation.test.ts`, which is the only place a figure is stated as a number.

The redundancy profile is the argument, not the raw percentage. `weekdayName` is 14.2% of a year
because seven names are amortised across it; `yearName` is 30.9% because **one** name is copied 354
times. A field that is constant across every element of the array it appears in is not paying for
itself.

## What is deliberately not the argument

An earlier draft of this record led on register: the sixty rabjung names are literary vocabulary
rather than everyday speech — the *tshig mdzod chen mo* files `zil gnon`'s year-sense under
མངོན་བརྗོད *ngönjö*, the poetic-synonym register — so few readers would miss them from a date.

That has since been checked properly, and the claim held: 54 of the sixty carry the marker on the
sense that states their year, counted in
[the sourcing document](../names/rabjung-sourcing.md#the-ngönjö-survey-what-register-the-sixty-names-are-in).
It is left out of this record's argument all the same, for two reasons. It is a claim about **audience**, and a calendar library ships plenty its
median user never touches. And the part doing the work — that ordinary speech does not use these
names — is the part that is not sourced. Redundancy and recoverability are checkable by anyone
reading the code; register is not. See `2c0dce7`, which removed a different section for telling a
story it could not source.

## What this cost, and what it did not

It cost one test. `test/cycles.test.ts` asserted that `yearNameFor(y)` agreed with the value a full
mean-astronomy pass had written onto `losarFor(y)`. With the field gone that comparison reads
`yearNameFor(y)` against `yearNameFor(losarFor(y).year)` — a tautology that would pass however wrong
both sides were. It was replaced with the part that still bites, that Losar belongs to the year it
opens. The names are still checked against Janson's own table in
`test/computation/conversion.test.ts`, where the expected values come from a fixture.

It did not cost the capability, and the README should not be read as if it had: `rabjungFor` and
`yearNameFor` were already public, already documented, and already the recommended route for naming
a year without evaluating the calendar. What changed is that they are now the **only** route.

It does not touch which Sanskrit list `RabjungName.sanskrit` carries. `Rabjung`, `RabjungName` and
`SanskritName` remain exported and unchanged. That question is open, and moving the name into a
sixty-row lookup makes it cheaper to answer either way — shipping both lists is now two columns in a
table rather than two objects on every date of every year.

## Breaking change

This removes two fields from the primary return type, so it breaks any consumer reading
`date.yearName` or `date.rabjung`. The package is pre-v1.0.0 and unpublished beyond a placeholder,
which is why it happens now rather than never. Recorded on the pre-v1.0.0 checklist in
`docs/roadmap.md`.
