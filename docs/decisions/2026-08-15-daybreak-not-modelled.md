---
date: 2026-08-15
status: accepted
---

# The daybreak boundary is inside the arithmetic, not on the API

**Decision:** the package models no instants. Every result labels a whole proleptic-Gregorian
calendar day and picks no time zone. There is no daybreak field on `TraditionConfig`, no
instant-to-date helper, and no sunrise calculation anywhere. A consumer needing a sub-day boundary
applies their own rule to the returned `isoDate`.

## Where the boundary actually is

Verified against Janson's LaTeX source, his remark on when the day starts:

> We do not have to worry about when the day starts; the calendar day is from dawn to dawn, but the
> formulas take this into account (at least theoretically), and no further modification is done. In
> particular, **no calculation of sunrise is required** (as it is in Indian calendar calculations).
> Thus the `true_date` should be regarded as a kind of local Julian date that is offset from the
> standard astronomical one which assumes integer values at noon UT, so that it instead assumes
> integer values at **local (mean) dawn**.

So the offset was fixed once, when the epoch constants were chosen. `true_date`'s origin *is* the
boundary. Nothing downstream applies it, and `julianDayOfLunarDay` returning `⌊true_date⌋` lands on
the right civil day only because of where that origin sits.

Janson attributes the value to Henning: **mean daybreak = 5 a.m. local mean solar time**. Lhasa's
longitude of 91° is 6h04m, so that is about −1 UT — 23:00 UT the preceding day.

## Why there is no `TraditionConfig` field for it

Because there is no hour in the algorithm for a field to feed. A daybreak field would be a
documentation value wearing a constant's clothes: nothing would read it, and changing it would
change nothing. Shifting the boundary genuinely means shifting the epoch constants, which is a
different tradition, not a different setting.

`TraditionConfig` holds astronomical constants only — the same rule that keeps observance
conventions in `ObservanceConfig` rather than there.

## Why seasonal dawn would be less faithful, not more

The obvious objection to a fixed 5 a.m. is that real dawn moves. Two answers, and the first is the
one that settles it:

- Henning specifies **mean** daybreak. *Mean* is doing the same work it does in "mean solar time" —
  it is a deliberate idealisation, not an approximation of an observation. Computing seasonal dawn
  would answer a question this calendar does not ask.
- It would also cost the package its guarantees. Seasonal dawn needs observer latitude and
  longitude, a solar-position algorithm, and a choice among sunrise, civil twilight and nautical
  twilight, with refraction. That is irreducibly iterative floating-point work, against a rule that
  forbids floating point anywhere and a dependency count of zero. The absence of sunrise from this
  calendar is a property of it, and one of the reasons results are identical across platforms.

## Why no instant-to-date helper

A helper taking a `ZonedDateTime` must choose between the viewer's local daybreak and the Tibetan
meridian's, and whichever it defaults to it takes a side. Practice is not uniform: Western sangha
overwhelmingly read the printed almanac against their local civil date.

That is the shape of question
[2026-11-11-observance-model.md](2026-11-11-observance-model.md) exists to keep out of the engine
— a contested convention belongs in caller-supplied config or in the caller's own code, not in
logic that looks authoritative.

If one is ever wanted, the version that survives these objections takes the daybreak hour **from the
caller** and does pure arithmetic: shift the instant back, take the civil date, convert. It computes
no astronomy and defaults to no convention. It was not added because the consumer-side form of that
is about two lines.

## What this stops a contributor doing

- Adding `daybreakHour` or similar to `TraditionConfig`. Nothing would read it.
- Adding sunrise or twilight computation, in any form. It would be the first floating point in the
  package and the first thing needing a location.
- "Correcting" the README to say a Tibetan date starts at midnight. It does not — the tradition's
  boundary is dawn. What is true is that the package models no instants at all, which is a different
  and weaker claim, and the one the README makes.
- Treating this as the sunset boundary a Jewish or Islamic calendar library handles. Sunset moves
  with latitude and season and needs a place; daybreak here is a fixed convention on a fixed
  meridian, so this calendar is fully determined without one.
