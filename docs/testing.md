# Testing Strategy

Correctness is this project's entire value proposition — practitioners have to be able to
trust the dates. Three tiers, all run in CI.

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
| **FPMT Dharma Practice Dates** | https://fpmt.org/media/resources/dharma-dates/ | Annual published calendar of practice days (Losar, Saka Dawa, Chotrul Duchen, etc.) — the authoritative Gelug reference |
| **Lotsawa House Phugpa Calculator** | https://www.lotsawahouse.org/Static/tools/phugpa.html | Interactive web tool — compute any year's dates for spot-checking |
| **christian-steinert TibetanBuddhistPracticeDates** | https://github.com/christiansteinert/TibetanBuddhistPracticeDates | Java (GPL-3.0), has ICS export — run locally, compare outputs (code is GPL but *outputs are data*, not derived works) |
| **eszthoff/tibetan-date-calculator** | https://github.com/eszthoff/tibetan-date-calculator | TypeScript, Phugpa, implements Janson — run locally to compare computed dates (do NOT copy code, only compare outputs) |
| **lscalendars/tibcalendar** | https://github.com/lscalendars/tibcalendar | C library, reference implementation for Tibetan calendrical calculations |

> **Clean-room note.** Running these to compare *outputs* is permitted — dates are facts, not
> copyrightable expression. Reading their source is not. See [CONTRIBUTING.md](../CONTRIBUTING.md).

**Fixture format:**

```json
// test/fixtures/fpmt-2026.json
[
  { "iso": "2026-02-17", "event": "Losar 2153", "tibYear": 2153, "tibMonth": 1, "tibDay": 1 },
  { "iso": "2026-05-17", "event": "Saka Dawa begins", "tibMonth": 4, "tibDay": 1 },
  { "iso": "2026-06-15", "event": "Saka Dawa ends" }
]
```

Curate data for at least 3 years (2024-2026). Run cross-validation in CI on every commit.

## Tier 3: Regression Tests

Specific edge cases:

- Doubled days (two ISO dates → same Tibetan day number)
- Skipped days (Tibetan day number with no corresponding ISO date)
- Leap months (13-month years)
- Month/year boundaries
- Dates near epoch (early years)
