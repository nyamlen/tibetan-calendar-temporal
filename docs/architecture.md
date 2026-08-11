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

- PDF: <https://www2.math.uu.se/~svantejs/papers/calendars/tibet.pdf>
- arXiv: <https://arxiv.org/abs/1401.6285v1>

**Read the LaTeX source, not the PDF** — see the rule in [CLAUDE.md](../CLAUDE.md). `pdftotext`
drops floor/ceiling brackets, inequalities and Greek constants, and has already produced three
wrong formulas here.

This paper contains every formula needed. The implementation maps to its sections:

- §4: Year numbering and naming — rabjung cycle, element, animal, gender
- §5 + App. C: Month numbering, true month count, leap months, and the inverse problem
- §6: Days — the labelling rule, and where skipped and doubled dates come from
- §7: Mean date, mean sun, lunar anomaly, the correction tables, and true date
- §8: `JD = ⌊true_date⌋`, its inverse, month boundaries and Losar
- §9: Day of week

§2–3 are notation and definitions rather than algorithms; §10–13 and App. D–E cover almanac,
astrological and planetary data that this package does not compute.

**Additional academic reference (2026):** "Possible Reforms of the Tibetan Lunisolar Calendar" (arXiv:2604.01233) — documents seasonal drift. Not needed for implementation but relevant context.

## Layered Computation Model

```text
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
`add` / `until` / `with` — was reconsidered at the start of Phase 1 and **deferred again to
Phase 3**. Phase 1 ships pure functions over plain objects. Defining what `add({months: 1})`
means across leap months, doubled days and skipped days is a domain question, and Phase 3's
practice-day logic is the first consumer that will show which semantics are actually needed.

This does not affect the package's Temporal-native claim. The engine speaks
`Temporal.PlainDate` throughout; it simply is not a registered calendar.

## Package Structure

```text
tibetan-calendar-temporal/
├── src/
│   ├── index.ts              # Public API exports
│   ├── traditions/
│   │   ├── types.ts          # TraditionConfig type
│   │   └── phugpa.ts         # Phugpa constants (epoch, tables)
│   ├── computation/
│   │   ├── arithmetic.ts     # floorDiv, ceilDiv, mod, amod, gcd, lcm, scaleTo (§2)
│   │   ├── scaling.ts        # derives each tradition's exact-integer denominators
│   │   ├── epoch.ts          # Year numbering, rabjung, element/animal (§4)
│   │   ├── mean-astronomy.ts # Mean date, mean sun, lunar anomaly (§7)
│   │   ├── corrections.ts    # moon_tab / sun_tab, true date (§7)
│   │   ├── calendar.ts       # True month count, leap months, day rule (§5-6)
│   │   └── conversion.ts     # ISO ↔ Tibetan bidirectional, weekday (§8-9)
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
  year: number;           // Royal era, 127 BC epoch (e.g. 2153)
  yearStartsIn: number;   // Janson's Y — Gregorian year this Tibetan year begins in (2026)
  rabjung: Rabjung;       // Indian cycle — a numbering
  yearName: TibetanYearName;  // Chinese cycle — a name
  month: number;          // Month number (1-12); a leap month repeats the following month's
  monthCode: string;      // "M06" or "M06L" for leap month
  isLeapMonth: boolean;
  day: number;            // Tibetan day number (1-30)
  isDoubledDay: boolean;  // true on BOTH days sharing this number
  isLeapDay: boolean;     // true only on the first of a doubled pair (almanacs: "Extra")
  isoDate: Temporal.PlainDate;
  dayOfWeek: number;      // 1=Mon, 7=Sun (ISO standard)
}

interface Rabjung {
  cycle: number;          // 17 for 1987-2046
  year: number;           // 1-60 position within the cycle
}

interface TibetanYearName {
  element: TibetanElement;  // 'wood' | 'fire' | 'earth' | 'iron' | 'water'
  animal: TibetanAnimal;    // 'mouse' | 'ox' | 'tiger' | ... | 'pig'
  gender: TibetanGender;    // 'male' | 'female'
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

### Why `year` is the royal era

`year` is the 127 BC epoch numbering that almanacs print, not Janson's *Y*. See
[decisions/2026-08-11-year-numbering.md](decisions/2026-08-11-year-numbering.md) — the engine
computes in *Y* internally and converts only at the public boundary. Do not "correct" `year` to
match the paper.

### Why the shape is flat except for naming systems

Settled at the start of Phase 1. The rule is two-axis:

- **Date components stay flat**, because `Temporal.PlainDate` is flat — `.year`, `.month`,
  `.day`, `.monthCode`. This package is Temporal-native and a consumer moving between the two
  should not learn a second access pattern.
- **Naming systems group under a `*Name` field.** Stated that way the rule extends: if Janson
  App. E month-level and day-level naming is ever added, it lands as `monthName` and `dayName`,
  parallel and non-breaking.

Grouping everything — `year.number`, `month.code`, `day.isLeap` — was rejected. It is more
uniform, but `d.month` as an object where `PlainDate.month` is a number generates silent
failures: `d.month === 11` is quietly false and `${d.month}` renders `[object Object]`. That is
the same failure class the [year numbering decision](decisions/2026-08-11-year-numbering.md)
exists to eliminate.

### Why `rabjung` is separate from `yearName`

They are two different 60-year cycles, and Janson §4 is explicit that they are different *kinds*
of system:

- The **Indian** cycle is a **numbering** — cycles are numbered, and cycle plus position
  identifies a year unambiguously. This is `rabjung`.
- The **Chinese** cycle is a **name** — "the Chinese cycles are not numbered in the Tibetan
  calendar". This is `yearName`.

They also give a year *different positions*. 2026 is year **40** of the Indian cycle and year
**43** of the Chinese (Janson Table 12). Holding both in one object put `40` directly beside
`Fire–Horse`, which it does not index — position 40 indexes *parābhava*. Anyone building a
60-entry lookup keyed on that number would be wrong for 57 of every 60 years. Splitting them
makes the mistake unbuildable.

`rabjung` is grouped rather than two flat scalars because its two numbers are only meaningful
together — unlike `year` and `yearStartsIn`, each of which stands alone — and because it is where
the Indian cycle names will go if they are ever added.

### Why the 60 rabjung names are not included

`rabjung.year` is a position in a list of 60 Tibetan and Sanskrit names, and v1 exposes the
position without the name. That is deliberate: sourcing the names is a research task, not a data
entry task.

Janson's Table 12 ASCII column is lossy. Positions 4, 13 and 47 all read `pramadi`, where the
actual names are three different words — *pramodūta* प्रमोदूत, *pramāthi* प्रमाथी and
*pramādi* प्रमादी. The Hindu saṃvatsara list cannot simply be substituted either: the traditions
diverge in content, not only spelling, with Tibetan position 20 being *akṣaya* अक्षय where the
Hindu list has *vyaya* व्यय and puts *akṣaya* at 60. Resolving each entry is a per-item
scholarly judgement.

No source has been found carrying all 60 in Tibetan script with Lhasa phonetics, which
[CLAUDE.md](../CLAUDE.md)'s terminology conventions require; Henning's book has transliterations
but is a copyrighted secondary source. Adding them later at `rabjung.name` is additive and
breaks nothing, which is what makes deferring legitimate rather than merely convenient.

### Why `gender` is kept although it is derivable

Janson notes the gender is the year mod 2 and is therefore already determined by the animal —
every Horse year is male, every Sheep year female. It is stored anyway because almanacs print it
as part of the name, and because recomputing it at every call site is worse than one redundant
field. `TibetanYearName` is a name as printed, not a minimal encoding.

### Why there is no `isSkippedDay`

A skipped date is a *number that no calendar day carries* (Janson §6). `isoToTibetan` only ever
returns a real calendar day, so such a field would be unconditionally `false`. The question
belongs to the input side: `tibetanDateExists(...)` answers it, and `tibetanToIso` throws
`SkippedDayError`.

Doubled days need two flags rather than one, because a consumer must know both that a number is
shared and which of the two days this is. `tibetanToIso` therefore accepts `isLeapDay` as optional
input; without it, a doubled date is ambiguous.

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
