---
date: 2026-09-12
status: accepted
---

# An absent month-naming member means refuse, not a Phugpa default

**Decision:** the month members of `TraditionNaming` are optional, and **absence means the attribute
is not sourced for that tradition** — `./astrology` refuses with a coded error rather than falling
back to Phugpa's list.
`weekdayOffset` becomes optional within the same block, defaulting to 0, so a config supplying only
month members need not restate a shift it does not have.

## What a contributor would otherwise do, and why it is wrong

The obvious simplification is to make absence mean *Tibetan defaults*, matching `weekdayOffset`,
whose docblock already says "omitting it means the Tibetan conventions, which is right for every
version but the Bhutanese".
One rule for the whole block, zero configuration for the common case, and no new shape to learn.

It is wrong, and the counter-example is already in this repository.

**Janson states that Mongolia uses Tsurphu's rules for month animal, gender and element**, and
[../traditions.md](../traditions.md) carries worked Tsurphu and Mongolian configs as data.
So under a Phugpa default, promoting either of those to a real config yields Phugpa's month
attributes — silently, with nothing about the output looking wrong.

That is the `leapIndexThreshold` failure repeating verbatim: every constant injected, one rule
quietly hardcoded to Phugpa's, and a config that runs and is wrong.
[../../CLAUDE.md](../../CLAUDE.md) records that the promise "Tsurphu must remain addable without
touching the algorithm" was false for three phases for exactly this reason, and the lesson it draws
is to check that the **rules** are injected, not only the numbers.

## Why these live on `TraditionNaming` rather than in a config of their own

`TraditionNaming`'s docblock already anticipated these members, and it gives a reason that does
**not** cover them: that `weekdayName` is populated inside the conversion, which receives only a
`TraditionConfig`, so a separate config would mean threading two configs in to fill one field.
Month attributes are never populated during conversion, so that argument is silent about them and
citing it would be borrowing a justification.

The reason they belong here anyway is narrower.
`naming` is already the not-read-by-the-algorithm bucket — the one place in the config whose contents
no formula touches — so a second config would duplicate the bucket rather than separate two concerns.
And a caller asking for one tradition's attributes would then have to supply two objects that must
agree about which tradition they describe, with nothing checking that they do.
A `TraditionConfig` whose `naming.months` says Tsurphu while its `leapIndexThreshold` says Phugpa is
at least a single object a validator can see.

## Why the asymmetry with `weekdayOffset` is principled rather than untidy

A default is legitimate where there is **one dominant convention**, and illegitimate where there is
a **genuine fork**.

Every Tibetan version agrees on weekday naming and Bhutan is the single documented exception — Janson
calls it "a unique feature of the Bhutanese calendar" and CLDR agrees — so `weekdayOffset` defaults
honestly.
Month animals fork Dragon against Tiger with no majority and no way to pick one without asserting
something Janson does not.
So there is no honest default available, and inventing one would be a convention dressed as
arithmetic.

This is the same distinction that already separates `TraditionConfig` from `ObservanceConfig`:
inject where the sources legitimately disagree, default where they do not.

## What this costs, and what it buys back

It costs a `naming` block on `PHUGPA` and `PHUGPA_HENNING`, which carry none today, and a hand-built
custom config now refuses month attributes until it opts in.
A config spread from a shipped one is unaffected, because a spread copies `naming`.

What it buys is reversibility.
If Bhutan's month attributes are ever sourced — see the Beyond v1 entry in
[../roadmap.md](../roadmap.md) — `monthAttributesFor` changing from throwing to returning is a
**widening**: non-breaking, and consumer code catching the error still compiles.
The honest answer is therefore also the one that keeps every door open, which is the same asymmetry
that governs the `TibetanWeekday` brand and the `nextFullMoon` narrowing.

## The refusal is coarse on purpose

Only the lunar day's **animal** is tradition-free — `(D + 6M + 8) amod 12`, the day and month
*numbers* alone.
Its element, trigram and number all reach through the month, so three of the four inherit the gap.

Refusing the whole lunar-day set therefore over-refuses by exactly one field, deliberately:
over-refusal is safe and reversible, while per-field nulls would tax every Phugpa consumer with
three narrowings forever, for a case they never meet, and could not be removed later without a
breaking change.
See [../astrology.md](../astrology.md) for the attribute layer this governs.
