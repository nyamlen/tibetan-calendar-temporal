# Architecture

How `tibetan-calendar-temporal` is built and why.

For what it is and why it exists, see the [README](../README.md).
For the testing approach, see [testing.md](testing.md). For build sequencing, see
[roadmap.md](roadmap.md).

## Key Constraints

- **Clean-room implementation** — do NOT reference or copy code from `eszthoff/tibetan-date-calculator`. That library has no license (legally all-rights-reserved). Implement directly from Janson's paper. Full rules in [CONTRIBUTING.md](../CONTRIBUTING.md).
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

## Layered Computation Model

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

## Public API

Standalone pure functions, framework-agnostic:

```typescript
import { isoToTibetan, tibetanToIso, getPracticeDays } from 'tibetan-calendar-temporal';
```

- Pure functions, work everywhere
- Accept and return Temporal types or plain objects

### No Temporal Calendar Protocol adapter

An earlier version of this spec described a second layer registering a `TibetanCalendar` with
Temporal's calendar protocol. **That is not implementable.** Temporal removed user-defined
calendars before shipping: `Temporal.Calendar` does not exist, and `calendar:` accepts only
built-in CLDR identifiers, which do not include `tibetan`.

See [decisions/2026-08-11-temporal-custom-calendars.md](decisions/2026-08-11-temporal-custom-calendars.md).

Whether anything replaces it — most likely a Temporal-shaped `TibetanDate` class offering
`add` / `until` / `with` — is deferred to Phase 1, once the core computation exists and the
ergonomics consumers actually need are visible.

This does not affect the package's Temporal-native claim. The engine speaks
`Temporal.PlainDate` throughout; it simply is not a registered calendar.

## Package Structure

```
tibetan-calendar-temporal/
├── src/
│   ├── index.ts              # Public API exports
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
├── biome.json
├── vitest.config.ts
├── tsconfig.json          # editor, typecheck, tests (noEmit)
└── tsconfig.build.json    # emit: src/ -> dist/
```

This is the **target** layout. Phase 0 created only `src/index.ts`, `test/smoke.test.ts` and the
config files; the `computation/`, `traditions/`, `practice/` and test subdirectories arrive in
the phase that fills them, rather than as empty stubs.

## Subpath Exports (package.json)

```json
{
  "name": "tibetan-calendar-temporal",
  "type": "module",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "./practice": { "types": "./dist/practice/index.d.ts", "default": "./dist/practice/index.js" }
  },
  "sideEffects": false
}
```

The `./practice` subpath is the target shape. As of Phase 0 only `.` is declared — `src/practice/`
does not exist yet, and an export pointing at a file the build cannot produce would break
`npm pack`. It is added in Phase 3.

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
| TypeScript 7 | Language (strict mode) and build — `tsc` emits ESM + declarations directly |
| Vitest | Test runner |
| fast-check | Property-based testing |
| Biome | Lint + format |
| changesets | Version management + changelog (Phase 4) |
| TypeDoc | API documentation (Phase 4) |
| GitHub Actions | CI/CD with npm provenance |

There is no bundler. `tsc` alone emits the ESM output and declarations, which keeps `dist/`
mirroring `src/` — the structure the `./practice` subpath export depends on. Reasoning:
[decisions/2026-08-11-build-tooling.md](decisions/2026-08-11-build-tooling.md).

### Temporal types

TypeScript 7 ships `lib.esnext.temporal.d.ts`, so `"lib": ["ES2024", "ESNext.Temporal"]`
declares `Temporal` as a **global** namespace. The package therefore needs no Temporal typings
dependency, and neither do consumers — emitted `.d.ts` files reference the global. TypeScript
5.9 and `@types/node` have no Temporal declarations at all, which is why the TypeScript major
is a load-bearing choice rather than a preference.
