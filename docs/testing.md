# Testing Strategy

Correctness is this project's entire value proposition — practitioners have to be able to
trust the dates. Three tiers, all run in CI.

## Layout

```text
test/
├── computation/          # one suite per src/computation module
├── validation/           # Tier 2, cross-checks against external sources
├── fixtures/             # generated — from Janson, and from external implementations
└── invariants.test.ts    # year lengths, safe-integer bound, §13 period
```

Tiers 1 and 3 are interleaved with the unit suites rather than kept in separate directories —
a property and the edge case it generalises belong next to the function they constrain.

**Fixture provenance.** `test/fixtures/losar.ts` and `sixty-year-cycle.ts` are **generated**,
not hand-written: run `node scripts/extract-janson-fixtures.mjs <path-to-tibet.tex>` to
regenerate them from the paper's LaTeX. Do not edit them by hand. Transcribing 120 dates
manually is precisely how a silent one-day error enters the primary correctness gate.

## Tier 1: Property-Based Tests (fast-check)

Mathematical invariants that must hold for all valid inputs:

- **Round-trip**: `∀ ISO date d: isoToTibetan(d).isoDate === d`
- **Monotonicity**: consecutive ISO dates map to non-decreasing Tibetan day numbers
- **Month bounds**: every Tibetan year has 12 or 13 months
- **Day bounds**: every Tibetan month has 29 or 30 civil days
- **Skipped days are never practice days**
- **Leap month has same number as following main month**

## Tier 2: Fixture Validation

Cross-reference against known-good sources. Curate validation data from multiple independent
sources and assert the engine matches.

**Validation sources:**

| Source | URL | What it provides | Status |
|--------|-----|-----------------|--------|
| **Lotsawa House Phugpa Calculator** | <https://www.lotsawahouse.org/Static/tools/phugpa.html> | Whole-year day-by-day grid, marking skipped (`*`) and doubled (`+`) dates | **In use** — `crosscheck-lotsawa.ts`, 1,831 days, 2023–2027 |
| **christian-steinert TibetanBuddhistPracticeDates** | <https://practicedates.christian-steinert.de> | JSON API `/dates/YYYYMMDD-YYYYMMDD` giving day numbers plus doubled and leap-month flags | **In use** — `crosscheck-steinert.ts`, 1,461 days, 2024–2027 |
| **FPMT Dharma Practice Dates** | <https://fpmt.org/media/resources/dharma-dates/> | Practice days prepared from the Men-Tsee-Khang almanac — the authoritative Gelug reference | Practice days only; see the note on what it cannot settle |
| **eszthoff/tibetan-date-calculator** | <https://github.com/eszthoff/tibetan-date-calculator> | TypeScript, Phugpa, implements Janson — run locally to compare computed dates (do NOT copy code, only compare outputs) | Not yet used |
| **lscalendars/tibcalendar** | <https://github.com/lscalendars/tibcalendar> | C library, reference implementation for Tibetan calendrical calculations | **Deferred.** A fourth implementation of the same paper, needing a C toolchain, adding no independent tradition line |

> **Clean-room note.** Running these to compare *outputs* is permitted — dates are facts, not
> copyrightable expression. Reading their source is not. See [CONTRIBUTING.md](../CONTRIBUTING.md).

> **The `a₂` fork is settled — these sources do not straddle it.** Resolved 2026-08-12; see
> [decisions/2026-08-12-lunar-anomaly-a2-default.md](decisions/2026-08-12-lunar-anomaly-a2-default.md).
>
> Janson §7 records two values for the lunar anomaly's daily increment `a₂`: almanacs use
> `1/28`, while Henning uses the exact `3781/105840`. They disagree on roughly one day in 4,100
> — Janson counts 9 divergences in 1900–1999 and 8 in 2000–2099, but 16 in the single cycle
> 1027–1091, so the rate is not uniform and back-projection is worse.
>
> An earlier draft of this file claimed Christian Steinert and Lotsawa House descend from
> Henning's line. **Both were checked against Janson's three divergence dates — 2001-02-10,
> 2006-05-10, 2025-11-19 — and both follow `1/28`**, agreeing with the Men-Tsee-Khang almanac
> and with each other. Fixtures may be curated from all these sources together.
>
> Two things that carry **no** information about the fork, so do not reach for them: Janson's
> Losar table, which both values reproduce in full, and any list of *practice days*. The 11
> divergences in 1950–2050 are each self-correcting within a day — the two values disagree
> about which number is doubled or skipped, never about where a month boundary falls. Only a
> day-by-day grid printing the doubled number is evidence.

### Where christian-steinert differs

The engine matches **Lotsawa House on all 1,831 days** of 2023–2027, including every doubled
date, both leap months, and every skipped-date gap. Against christian-steinert it matches 1,438
of 1,461 days; the 23 exceptions are a real, one-directional rule difference, and
`test/validation/crosscheck.test.ts` catalogues them rather than asserting them away.

In all 23, Steinert's number is exactly one higher than ours, and in all 23 Lotsawa House sides
with the engine. Every one sits at a **skipped** date. Take 8 February 2024: both sources agree
7 February is the 27th and 9 February is the 30th, so a single calendar day carries one of 28/29.
We number it 28 and skip 29; Steinert numbers it 29 and skips 28.

Janson's day-labelling rule, §6, decides it:

> if two lunar days end the same calendar day, then the calendar day gets the name of the first
> of them

Lunar days 28 and 29 both end on 8 February 2024, so the calendar day takes the **first** name,
28, and 29 is skipped. That is what the engine and Lotsawa House do.

Do not "fix" the engine towards Steinert, and do not delete the fixture because it disagrees.
The disagreement is the finding. It is also why the suite asserts the *shape* of the difference
— never in the month number, never in the leap-month flag, never more than one in the day number
— because that is what would change if the cause were something other than this rule.

**Fixture provenance.** Every cross-check fixture is generated by a committed script and carries
its source and tradition line in a header:

- `scripts/fetch-lotsawa-fixtures.mjs` → `test/fixtures/crosscheck-lotsawa.ts`
- `scripts/fetch-steinert-fixtures.mjs` → `test/fixtures/crosscheck-steinert.ts`

Output is committed so CI never depends on a third party's uptime, and so a diff after
regeneration is a finding to investigate rather than noise. Re-run the scripts deliberately; do
not edit the fixtures by hand.

> Two conventions bit during Phase 2 and will bite again. Both Lotsawa's `(+)` and Steinert's
> `repeatedTibMonth` mean "**this month number occurs twice**", not "this is the leap month" —
> the leap month is the *first* of the pair. Mapping either flag straight to `isLeapMonth`
> mislabels about thirty days per leap year, and it looks like an engine bug rather than a
> fixture bug. `fetch-steinert-fixtures.mjs` walks the runs to resolve this, and
> `fetch-lotsawa-fixtures.mjs` re-derives the doubled flags and fails if they disagree with the
> page's own markers.

> Losar 2026 is **18 February**, per Janson's table and the engine. An earlier draft of this
> file said 17 February, which is day 30 of the preceding month — the kind of one-day slip that
> is invisible in review and poisons a fixture. Take dates from a source, never from memory.

## Tier 3: Regression Tests

Specific edge cases:

- Doubled days (two ISO dates → same Tibetan day number)
- Skipped days (Tibetan day number with no corresponding ISO date)
- Leap months (13-month years)
- Month/year boundaries
- Dates near epoch (early years)
