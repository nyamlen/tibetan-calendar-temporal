# Tibetan Calendar Engine — Project Specification

## What This Is

A TypeScript library that computes Tibetan calendar dates according to the Phugpa tradition (Men-Tsee-Khang standard). It converts between Western (ISO) dates and Tibetan dates, handles leap months, skipped/doubled days, and determines practice days.

This is an open-source npm package (`tibetan-calendar-engine`), MIT licensed, designed as a standalone computation library with zero runtime dependencies.

## Key Constraints

- **Clean-room implementation** — do NOT reference or copy code from `eszthoff/tibetan-date-calculator`. That library has no license (legally all-rights-reserved). Implement directly from Janson's paper.
- **Temporal-native** — use `Temporal.PlainDate` (ES2026 standard) for date representation. No legacy `Date` objects anywhere.
- **Zero runtime dependencies** — Temporal is a language built-in. The engine depends on nothing.
- **Integer arithmetic only** — all Phugpa calendar math uses integer division with fixed denominators. No floating point. This ensures deterministic, cross-platform-identical results.
- **Tradition-agnostic architecture** — astronomical constants are injected via a `TraditionConfig` type, not hardcoded. v1 ships only `PHUGPA` config, but the algorithm supports future addition of Tsurphu (Karma Kagyu) via a different config set.
- **ESM-only** — `"type": "module"` in package.json. No dual CJS/ESM builds needed (Node.js 26+ can `require()` ESM).
- **Stateless pure functions** — same input always gives same output, no side effects. Enables memoization and web worker offloading by consumers.

## Mathematical Reference

**Primary source:** Svante Janson, "Tibetan Calendar Mathematics" (arXiv:1401.6285)
- PDF: https://www2.math.uu.se/~svantejs/papers/calendars/tibet.pdf
- arXiv: https://arxiv.org/abs/1401.6285v1

This paper contains every formula needed. The implementation maps to its sections:
- §2: Epoch (year 806) and year/month numbering
- §3: Mean astronomy (mean sun, mean moon, mean weekday)
- §4-5: True corrections (correction to mean values via sine interpolation tables)
- §6-7: Calendar assembly (leap months, skipped/doubled days)
- §8: Conversions (Tibetan ↔ Western date mapping)

**Additional academic reference (2026):** "Possible Reforms of the Tibetan Lunisolar Calendar" (arXiv:2604.01233) — documents seasonal drift. Not needed for implementation but relevant context.

## Architecture

### Layered Computation Model

```
┌─────────────────────────────────────────────┐
│  Layer 4: Practice Day Logic                │
│  (Config-driven rules: which days special)  │
├─────────────────────────────────────────────┤
│  Layer 3: Calendar Assembly                 │
│  (Months, years, leap insertion, day skip)  │
├─────────────────────────────────────────────┤
│  Layer 2: True Date / True Month            │
│  (Corrections to mean values via tables)    │
├─────────────────────────────────────────────┤
│  Layer 1: Mean Astronomy                    │
│  (Mean sun, mean moon, mean weekday)        │
├─────────────────────────────────────────────┤
│  Layer 0: Epoch & Constants                 │
│  (Year 806, tradition-specific parameters)  │
└─────────────────────────────────────────────┘
```

### Two-Layer API

**Level 1: Standalone functions (framework-agnostic)**
```typescript
import { isoToTibetan, tibetanToIso, getPracticeDays } from 'tibetan-calendar-engine';
```
- Pure functions, works everywhere
- Accepts/returns Temporal types or plain objects

**Level 2: Temporal Calendar Protocol adapter (optional)**
```typescript
import { TibetanCalendar } from 'tibetan-calendar-engine/temporal';
const date = Temporal.PlainDate.from({ year: 2153, month: 6, day: 15, calendar: new TibetanCalendar() });
```
- Wraps Level 1 in Temporal's Calendar Protocol
- Optional subpath export — consumers who don't need it don't import it

### Package Structure

```
tibetan-calendar-engine/
├── src/
│   ├── index.ts              # Public API exports
│   ├── temporal.ts           # Temporal Calendar Protocol adapter
│   ├── traditions/
│   │   ├── types.ts          # TraditionConfig type
│   │   └── phugpa.ts         # Phugpa constants (epoch, tables)
│   ├── computation/
│   │   ├── epoch.ts          # Year 806, year/month numbering (§2)
│   │   ├── mean-astronomy.ts # Mean sun, moon, weekday (§3)
│   │   ├── corrections.ts    # True date, true month, sine tables (§4-5)
│   │   ├── calendar.ts       # Leap months, skip/double days (§6-7)
│   │   └── conversion.ts     # ISO ↔ Tibetan bidirectional (§8)
│   ├── practice/
│   │   ├── index.ts          # Practice day logic
│   │   ├── types.ts          # Practice, PracticeDay, CalendarConfig
│   │   └── default-gelug.ts  # Default Gelug practice day config
│   └── types.ts              # TibetanDate, TibetanMonth, TibetanYear
├── test/
│   ├── properties/           # Property-based tests (fast-check)
│   ├── fixtures/             # FPMT validation data (JSON)
│   └── regression/           # Edge case tests
├── package.json
├── tsup.config.ts
├── vitest.config.ts
└── tsconfig.json
```

### Subpath Exports (package.json)

```json
{
  "name": "tibetan-calendar-engine",
  "type": "module",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "./temporal": { "types": "./dist/temporal.d.ts", "default": "./dist/temporal.js" },
    "./practice": { "types": "./dist/practice/index.d.ts", "default": "./dist/practice/index.js" }
  },
  "sideEffects": false
}
```

## Core Types

```typescript
interface TraditionConfig {
  name: string;           // 'phugpa' | 'tsurphu'
  epoch: number;          // Year 806 for Phugpa
  meanSunCoefficients: { numerator: number; denominator: number }[];
  meanMoonCoefficients: { numerator: number; denominator: number }[];
  sineTable: number[];    // 6 values from Kālacakra tradition
  // ... additional tradition-specific constants
}

interface TibetanDate {
  year: number;           // Tibetan year (e.g., 2153)
  month: number;          // Month ordinal (1-13)
  monthCode: string;      // "M06" or "M06L" for leap month
  day: number;            // Tibetan day (1-30)
  isLeapMonth: boolean;
  isDoubledDay: boolean;
  isSkippedDay: boolean;
  isoDate: Temporal.PlainDate;
  rabjungCycle: number;
  rabjungYear: number;
  animal: string;
  element: string;
  dayOfWeek: number;      // 1=Mon, 7=Sun (ISO standard)
}

interface Practice {
  type: string;           // 'tara', 'guru-puja', 'protector', etc.
  name: string;
  tier: 1 | 2 | 3;       // Universal, General Practice, Empowerment-Required
  description?: string;
}

interface CalendarConfig {
  tradition: TraditionConfig;
  practiceDays: PracticeDayRule[];
  teachers: TeacherConfig[];
}
```

## Tooling

| Tool | Purpose |
|------|---------|
| TypeScript 5.x | Language (strict mode) |
| tsup | Bundler (ESM output + declarations) |
| Vitest | Test runner |
| fast-check | Property-based testing |
| Biome | Lint + format |
| changesets | Version management + changelog |
| TypeDoc | API documentation |
| GitHub Actions | CI/CD with npm provenance |

## Testing Strategy

### Tier 1: Property-Based Tests (fast-check)

Mathematical invariants that must hold for all valid inputs:

- **Round-trip**: `∀ ISO date d: isoToTibetan(d).isoDate === d`
- **Monotonicity**: consecutive ISO dates map to non-decreasing Tibetan day numbers
- **Month bounds**: every Tibetan year has 12 or 13 months
- **Day bounds**: every Tibetan month has 29 or 30 civil days
- **Skipped days are never practice days**
- **Leap month has same number as following main month**

### Tier 2: Fixture Validation (cross-reference against known-good sources)

Curate validation data from multiple independent sources and assert the engine matches:

**Validation sources:**

| Source | URL | What it provides |
|--------|-----|-----------------|
| **FPMT Dharma Practice Dates** | https://fpmt.org/media/resources/dharma-dates/ | Annual published calendar of practice days (Losar, Saka Dawa, Chotrul Duchen, etc.) — the authoritative Gelug reference |
| **Lotsawa House Phugpa Calculator** | https://www.lotsawahouse.org/Static/tools/phugpa.html | Interactive web tool — compute any year's dates for spot-checking |
| **christian-steinert TibetanBuddhistPracticeDates** | https://github.com/christiansteinert/TibetanBuddhistPracticeDates | Java (GPL-3.0), has ICS export — run locally, compare outputs (code is GPL but *outputs are data*, not derived works) |
| **eszthoff/tibetan-date-calculator** | https://github.com/eszthoff/tibetan-date-calculator | TypeScript, Phugpa, implements Janson — run locally to compare computed dates (do NOT copy code, only compare outputs) |
| **lscalendars/tibcalendar** | https://github.com/lscalendars/tibcalendar | C library, reference implementation for Tibetan calendrical calculations |

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

### Tier 3: Regression Tests

Specific edge cases:
- Doubled days (two ISO dates → same Tibetan day number)
- Skipped days (Tibetan day number with no corresponding ISO date)
- Leap months (13-month years)
- Month/year boundaries
- Dates near epoch (early years)

## Development Environment

- **Node.js 26** recommended (native Temporal — no polyfill needed in tests)
- Node 22+ works with `temporal-polyfill` if needed
- The *published* package runs anywhere (compiled ESM output, consumers provide Temporal)

## Implementation Phases

| Phase | Scope | Effort |
|-------|-------|--------|
| 0 | Scaffold (npm init, tsup, vitest, fast-check, CI) | 2h |
| 1 | Core computation: Layers 0-3 (Janson §2-8) | 20h |
| 2 | Validation: FPMT fixtures, cross-check against reference implementations | 12h |
| 3 | Practice day logic (config-driven rules, Gelug default config) | 8h |
| 4 | Temporal adapter + TypeDoc + publish v1.0.0 | 8h |

**Safe timeline: 3 weeks** (accounts for debugging edge cases in doubled/skipped day logic)

## Context: Why This Exists

This engine is the computation backend for a Tibetan Buddhist practice calendar app (integrated modular PWA). The app has additional modules (Meditation Timer, Vow Tracker) but this library is the foundation — it computes what days are significant and why.

The engine is separate from the app because:
- Other projects can use it (FPMT centers, independent developers)
- It's open-source to build trust (practitioners need to trust the dates are correct)
- Clean separation enables independent versioning and testing
- White-label apps can use the same engine with different practice day configs

## Important: Clean-Room Constraint

**Do NOT look at or reference the source code of `eszthoff/tibetan-date-calculator` or `eszthoff/tibetan-calendar-temporal`.** These repos have no license file, making their code legally all-rights-reserved. Our implementation must be derived solely from Janson's paper (which is freely available academic work).

You MAY:
- Run the existing library locally to compare *outputs* (dates are facts, not copyrightable)
- Read its README for API design inspiration (public documentation)
- Compare your computed dates against its computed dates for validation

You MUST NOT:
- Copy algorithms, variable names, or code structure from its source
- Use it as a fork base
- Reference its internal implementation decisions
