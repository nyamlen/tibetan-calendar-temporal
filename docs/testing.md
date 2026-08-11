# Testing Strategy

Correctness is this project's entire value proposition — practitioners have to be able to
trust the dates. Three tiers, all run in CI.

## Layout

```text
test/
├── computation/          # one suite per src/computation module
├── fixtures/             # generated from Janson; FPMT data arrives in Phase 2
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

| Source | URL | What it provides |
|--------|-----|-----------------|
| **FPMT Dharma Practice Dates** | <https://fpmt.org/media/resources/dharma-dates/> | Annual published calendar of practice days (Losar, Saka Dawa, Chotrul Duchen, etc.) — the authoritative Gelug reference |
| **Lotsawa House Phugpa Calculator** | <https://www.lotsawahouse.org/Static/tools/phugpa.html> | Interactive web tool — compute any year's dates for spot-checking |
| **christian-steinert TibetanBuddhistPracticeDates** | <https://github.com/christiansteinert/TibetanBuddhistPracticeDates> | Java (GPL-3.0), has ICS export — run locally, compare outputs (code is GPL but *outputs are data*, not derived works) |
| **eszthoff/tibetan-date-calculator** | <https://github.com/eszthoff/tibetan-date-calculator> | TypeScript, Phugpa, implements Janson — run locally to compare computed dates (do NOT copy code, only compare outputs) |
| **lscalendars/tibcalendar** | <https://github.com/lscalendars/tibcalendar> | C library, reference implementation for Tibetan calendrical calculations |

> **Clean-room note.** Running these to compare *outputs* is permitted — dates are facts, not
> copyrightable expression. Reading their source is not. See [CONTRIBUTING.md](../CONTRIBUTING.md).

> **Read this before curating anything.** These sources **straddle a genuine fork in the
> tradition**, so a mixed fixture set is guaranteed to produce failures that look like
> arithmetic bugs and are not.
>
> Janson §7 records two values for the lunar anomaly's daily increment `a₂`: almanacs use
> `1/28`, while Henning uses the exact `3781/105840`. They disagree on roughly one day in 4,100
> — Janson counts 9 divergences in 1900–1999 and 8 in 2000–2099, but 16 in the single cycle
> 1027–1091, so the rate is not uniform and back-projection is worse.
>
> Christian Steinert and Lotsawa House descend from Henning's line; FPMT's published dates
> follow almanac practice. The package ships both as `PHUGPA` (default, `1/28`) and
> `PHUGPA_HENNING`.
>
> **Settle this before curating fixtures, not during.** Janson names three divergence dates —
> **2001-02-10, 2006-05-10, 2025-11-19** — and checking them against a published calendar
> resolves it in minutes. Note that Losar cannot: a test in `conversion.test.ts` confirms both
> values reproduce Janson's entire 1927–2046 Losar table, so that fixture carries no
> information about the fork.

**Fixture format:**

```json
// test/fixtures/fpmt-2026.json
[
  { "iso": "2026-02-18", "event": "Losar 2153", "tibYear": 2153, "tibMonth": 1, "tibDay": 1 },
  { "iso": "2026-05-17", "event": "Saka Dawa begins", "tibMonth": 4, "tibDay": 1 }
]
```

> Losar 2026 is **18 February**, per Janson's table and the engine. An earlier draft of this
> file said 17 February, which is day 30 of the preceding month — the kind of one-day slip that
> is invisible in review and poisons a fixture. Take dates from a source, never from memory.

Curate data for at least 3 years (2024-2026). Run cross-validation in CI on every commit.

## Tier 3: Regression Tests

Specific edge cases:

- Doubled days (two ISO dates → same Tibetan day number)
- Skipped days (Tibetan day number with no corresponding ISO date)
- Leap months (13-month years)
- Month/year boundaries
- Dates near epoch (early years)
