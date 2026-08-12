# Testing Strategy

Correctness is this project's entire value proposition — practitioners have to be able to
trust the dates. Three tiers, all run in CI.

## Layout

```text
test/
├── computation/          # one suite per src/computation module
├── validation/           # Tier 2, cross-checks against external sources
├── fixtures/             # generated — from Janson, and from external implementations
├── invariants.test.ts    # year lengths, safe-integer bound, §13 period
└── regression.test.ts    # Tier 3, named instances of each edge case
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
| **eszthoff/tibetan-date-calculator** | <https://www.npmjs.com/package/tibetan-date-calculator> | TypeScript, Phugpa, implements Janson — installed outside the repo and executed, never read | **In use** — `crosscheck-eszthoff.ts`, 1,826 days, 2023–2027 |
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

### Results

| Source | Range | Agreement |
|--------|-------|-----------|
| Lotsawa House | 2023–2027, 1,831 days | **all** |
| eszthoff | 2023–2027, 1,826 days | **all** |
| christian-steinert | 2024–2027, 1,461 days | 1,438 — see below |

Two of the three agree with the engine on every single day, including every doubled date, both
leap months, and every skipped-date gap.

### Where christian-steinert differs

Against christian-steinert the engine matches 1,438 of 1,461 days; the 23 exceptions are a real,
one-directional rule difference, and
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
- `scripts/fetch-eszthoff-fixtures.mjs` → `test/fixtures/crosscheck-eszthoff.ts`

> **eszthoff is executed, never read, and never installed into this repository.** It has no
> licence file, so it is all-rights-reserved — the reason `CLAUDE.md` forbids reading it at all.
> Its generator resolves the package from the *current working directory*, so install it in a
> scratch directory outside the repo and run the script from there. Do not add it as a
> devDependency: that puts its code in the tree, which is the thing being avoided. If a
> disagreement ever needs explaining, explain it from Janson — that is how the 23-day
> christian-steinert divergence was resolved.

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

### The FPMT fixture

`test/fixtures/fpmt-holy-days.ts` is the only fixture taken from the **almanac** rather than from
someone's implementation of Janson, and it tests a different thing: not "do we compute what other
engines compute" but "do our day numbers land on the days people actually observe". Each great
holy day has a fixed Tibetan date, so each published Gregorian date is a direct assertion.

It is **hand-curated**, the one exception to this directory's generated-only rule, because FPMT
publishes these in prose announcements with no feed to parse. What keeps it safe: the list is
short enough to check by eye, every row carries its source URL, and every row was confirmed
against all three cross-check implementations before being written down. Rows whose source could
not be named were left out rather than filled in from memory.

Its best row is the 2024 Chokhor Duchen. FPMT writes that it "takes place this year on July 9 or
July 10 depending on the various Tibetan calendars", with Kopan Monastery observing the 9th and
the Liberation Prison Project calendar the 10th. Both dates are the **same** Tibetan date — 4 of
the leap month 6 — so the institutions are not disagreeing about the calendar at all. They are
choosing which half of a doubled day to observe, which Janson §11 discusses and no arithmetic can
settle. That single row exercises a leap month and a doubled day at once, from an almanac-line
source, and it is the concrete reason Phase 3 must let the caller choose rather than hardcoding a
convention.

## Tier 3: Regression Tests

Phase 1's suites prove these categories occur and behave consistently. `test/regression.test.ts`
pins **named instances** of each, taken from sources rather than from the engine's own output —
because "some day this decade is doubled" survives a systematic one-day error and "9 and 10 July
2024 are both 4 of leap month 6, and FPMT says so" does not.

- Doubled days — 2025-11-19/20 as 30 of month 9; 2024-07-09/10 as 4 of leap month 6
- Skipped days — 29 of month 12 (2024-02-08) and 20 of month 9 (2025-11-10), one skipping the
  higher number and one the lower, since which disappears is decided by the astronomy
- Leap months — 2024 M06L from 6 July, 2027 M02L from 9 March, and the main month that follows
- Month/year boundaries — the day before Losar 2026, and the royal-era year across 1 January
- Dates near the epoch — round-trips through the first sixty days after E806
