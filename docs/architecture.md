# Architecture

How `tibetan-calendar-temporal` is built and why.

For what it is and why it exists, see the [README](../README.md).
For the testing approach, see [testing.md](testing.md). For build sequencing, see
[roadmap.md](roadmap.md).

## Key Constraints

- **Clean-room implementation** — do NOT reference or copy code from `eszthoff/tibetan-date-calculator`. The commit history is this project's evidence of independent derivation, and reading an alternative implementation cannot be undone or disproved afterwards. Implement directly from Janson's paper. Full rules in [CONTRIBUTING.md](../CONTRIBUTING.md).
- **Temporal-native** — use `Temporal.PlainDate` for date representation. No legacy `Date` objects anywhere. Temporal is a **finished (stage 4) TC39 proposal**, expected in ES2027 — [tc39/proposals lists it under finished proposals](https://github.com/tc39/proposals/blob/main/finished-proposals.md), with 2027 in the expected-publication column. It was described here as "ES2026 standard" until 2026-08-23, which was wrong. Why Temporal rather than `Date` is argued in [guide.md](guide.md#why-temporalplaindate-and-never-date).
- **Zero runtime dependencies** — Temporal is a language built-in. The engine depends on nothing.
- **Integer arithmetic only** — all Phugpa calendar math uses integer division with fixed denominators. No floating point. This ensures deterministic, cross-platform-identical results.
- **Tradition-agnostic architecture** — astronomical constants are injected via a `TraditionConfig` type, not hardcoded. v1 ships four configs — `PHUGPA`, `PHUGPA_HENNING`, `BHUTAN` and `BHUTAN_HENNING` — and the algorithm supports adding Tsurphu (Karma Kagyu) and the Mongolian version as further configs.
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

§2–3 are notation and definitions rather than algorithms; §10–13 and App. D cover almanac and
planetary data this package does not compute. **App. E it does**, as of 2026-09-12, under the
`./astrology` subpath — the attribute cycles, the lunar mansion and the elemental yoga.

**Additional academic reference (2026):** "Possible Reforms of the Tibetan Lunisolar Calendar" (arXiv:2604.01233) — documents seasonal drift. Not needed for implementation but relevant context.

## Layered Computation Model

```text
┌─────────────────────────────────────────────┐
│  Layer 4: Observances                        │
│  (Injected rules: which days are marked)    │
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
import { isoToTibetan, tibetanToIso, losarFor, monthsFor } from 'tibetan-calendar-temporal';
import { getObservances } from 'tibetan-calendar-temporal/observances';
```

- Pure functions, work everywhere
- Accept and return Temporal types or plain objects

The root surface is grouped as the README's API section heads it: conversion, months, navigation,
year names, month names, formatting, interoperability, tradition configs, errors and types; the
`./observances` and `./astrology` subpaths are sections of their own.
What earns a place on it is decided by
[decisions/2026-08-12-public-surface.md](decisions/2026-08-12-public-surface.md), and pinned by
`test/public-api.test.ts`.

The month tier splits along a line worth knowing. `monthsFor` and `daysInMonth` compute month
boundaries, so they evaluate `true_date` and are bounded by the tradition's exact range;
`hasLeapMonth`, `leapMonthNumberFor` and `monthsInYear` are closed forms over the year alone, cost a
handful of integer operations, and stay exact far past that range — including years the first two
refuse — up to the bound `leapYearLimit` derives from the config (about 3.7 × 10¹⁴ for the shipped
configs), past which they refuse with `TCT_OUTSIDE_EXACT_RANGE`.

### No Temporal Calendar Protocol adapter

An earlier version of this spec described a second layer registering a `TibetanCalendar` with
Temporal's calendar protocol. **That is not implementable.** Temporal removed user-defined
calendars before shipping: `Temporal.Calendar` does not exist, and `calendar:` accepts only
built-in CLDR identifiers, which do not include `tibetan`.

See [decisions/2026-08-11-temporal-custom-calendars.md](decisions/2026-08-11-temporal-custom-calendars.md).

Whether anything replaced it — most likely a Temporal-shaped `TibetanDate` class offering
`add` / `until` / `with` — was deferred to Phase 3 so that a real consumer could answer it.
**Phase 3 answered it: no.** The observance engine is month-indexed, walking `trueMonthCount`
rather than doing date arithmetic, and needed none of it. See
[decisions/2026-08-12-no-tibetan-date-class.md](decisions/2026-08-12-no-tibetan-date-class.md).

This does not affect the package's Temporal-native claim. The engine speaks
`Temporal.PlainDate` throughout; it simply is not a registered calendar.

## Package Structure

```text
tibetan-calendar-temporal/
├── src/
│   ├── index.ts                    # Public API exports
│   ├── temporal-kind.ts            # temporalKindOf — the ONLY instanceof Temporal in src/
│   ├── traditions/
│   │   ├── types.ts                # TraditionConfig type
│   │   ├── validate.ts             # validatedTradition — shape check and frozen copy at the boundary
│   │   ├── phugpa.ts               # PHUGPA and PHUGPA_HENNING (epoch, tables)
│   │   └── bhutan.ts               # BHUTAN and BHUTAN_HENNING
│   ├── computation/
│   │   ├── arithmetic.ts           # floorDiv, ceilDiv, mod, amod, gcd, lcm, scaleTo (§2)
│   │   ├── scaling.ts              # derives each tradition's exact-integer denominators
│   │   ├── epoch.ts                # Year numbering, rabjung, element/animal (§4)
│   │   ├── mean-astronomy.ts       # Mean date, mean sun, lunar anomaly (§7)
│   │   ├── corrections.ts          # moon_tab / sun_tab, true date (§7)
│   │   ├── calendar.ts             # True month count, leap months, day rule (§5-6)
│   │   └── conversion.ts           # ISO ↔ Tibetan bidirectional, weekday (§8-9) — a boundary file
│   ├── observances/
│   │   ├── index.ts                # getObservances, observancesOn, and the barrel (Layer 4)
│   │   ├── types.ts                # the shapes below: ObservanceRule, ObservanceConfig, ObservanceLayer, Observance
│   │   ├── compose.ts              # composeObservances: a base config plus a layer of differences
│   │   ├── next.ts                 # nextObservance: the first occurrence of one rule after a day
│   │   ├── validate.ts             # the config guard and frozen copy, memoised per config (internal)
│   │   ├── forms.ts                # how each form of `when` lands on a day (internal)
│   │   ├── formulas.ts             # the registry of named formulas (internal)
│   │   ├── occurrences.ts          # one rule over a range of days; the 10-year span cap (internal)
│   │   └── example-observances.ts  # EXAMPLE_OBSERVANCES — nineteen rules under FPMT's conventions, as an example
│   ├── astrology/                  # Janson's Appendix E (Layer 4) — one concern per file
│   │   ├── index.ts                # the six *For entry points and the composition
│   │   ├── types.ts                # DayAttributes, LunarMansion — the surface's own
│   │   ├── year.ts                 # the year's five elements and three numbers
│   │   ├── month.ts                # the month's animal, gender, element; Tsurphu's number
│   │   ├── lunar-day.ts            # the lunar day's animal, element, trigram, number
│   │   ├── calendar-day.ts         # congruences on the Julian day; Tsurphu's number unmodelled
│   │   ├── mansions.ts             # trueSun, moonCalendarDay, mansionNumber — the astronomy
│   │   ├── mansion-elements.ts     # HENNING's 28 reduced to Janson's 27, with the drop asserted
│   │   ├── mansion-names.ts        # the 27 mansions' Tibetan and Sanskrit names
│   │   └── yoga.ts                 # the ten pairings; names Henning's, favorability FPMT's, grading a dictionary's
│   ├── errors.ts                   # Error codes, the constructors that attach them, the boundary homes
│   ├── freeze.ts                   # deepFreeze — how the shipped configs are frozen
│   ├── format.ts                   # formatTibetanDate, monthCodeOf — the canonical string form
│   ├── parse.ts                    # parseTibetanDate — its inverse
│   ├── months.ts                   # monthsFor, datesFor, daysInMonth, the three closed-form scalars
│   ├── month-names.ts              # monthNamesFor — the mansion, the Indian month and all four seasonal systems;
│   │                               #   also the Tiger-month reader ./astrology shares
│   ├── navigation.ts               # the lunation coordinate, day and month arithmetic, the phases
│   ├── cycles.ts                   # the cyclic names: year, rabjung, weekday, element, gender, animal
│   ├── cycle-tables.ts             # the element and animal orderings Janson's tables index, and their one-based reader (internal)
│   ├── names.ts                    # the frozen name vocabulary — internal; cycles.ts, epoch.ts,
│   │                               #   conversion.ts and the astrology modules read it
│   ├── rabjung-names.ts            # the 60 rabjung names, Tibetan only — a weaker
│   │                               #   evidence tier than names.ts, so its own module
│   └── types.ts                    # TibetanDate, TibetanMonth, their field shapes, SkippedDayError
├── test/
│   ├── computation/                # named for a computation module, or <module>-<concept>
│   ├── fixtures/                   # Janson's tables, then FPMT data in Phase 2
│   └── invariants.test.ts          # Year lengths, safe-integer bound, §13 period
├── package.json
├── biome.json
├── vitest.config.ts
├── tsconfig.json          # editor, typecheck, tests (noEmit)
└── tsconfig.build.json    # emit: src/ -> dist/
```

Phase 1 built everything except `observances/`, which arrived in Phase 3. Directories are created
in the phase that fills them rather than as empty stubs.

Constants are held as exact `Rational`s and scaled onto a common denominator derived per
tradition by `scaling.ts` — never hardcoded, because the denominator is not the same for every
tradition. See
[decisions/2026-08-11-integer-arithmetic-strategy.md](decisions/2026-08-11-integer-arithmetic-strategy.md).

## Subpath Exports (package.json)

```json
{
  "name": "tibetan-calendar-temporal",
  "type": "module",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "./observances": { "types": "./dist/observances/index.d.ts", "default": "./dist/observances/index.js" },
    "./astrology": { "types": "./dist/astrology/index.d.ts", "default": "./dist/astrology/index.js" }
  },
  "sideEffects": false
}
```

All three are declared. `./observances` was added in Phase 3 and `./astrology` on 2026-09-12, each
when its directory came to exist — an export pointing at a file the build cannot produce breaks
`npm pack`, so the entry and the directory land together. `npm pack --dry-run` is the check, and
`npm run test:pack` imports all three as a consumer would.

The split is not packaging convenience. `./observances` holds conventions that published sources
disagree about, and the root does not. See [decisions/2026-11-11-observance-model.md](decisions/2026-11-11-observance-model.md).

What separates the root from `./astrology` is **what a thing is for**, not how it is sourced. The
root says *which* year, month or day something is — its date and its names — and `./astrology` what
that year, month or day carries. `monthNamesFor` is on the root on that reasoning, parallel to
`yearNameFor` against `yearAttributesFor`, although its six-season list is Henning's and its season
terms come from dictionaries rather than Janson; that provenance lives in its docblock and in
[names/month-and-yoga-sourcing.md](names/month-and-yoga-sourcing.md) rather than in the import line.

`./astrology` does still carry a sourcing boundary worth keeping visible. Its pieces do not carry equal weight: Janson gives every cycle and the mansion arithmetic,
Henning gives the element each mansion carries and the ten yoga names — which Janson cites and does
not derive — and **favorability is in neither**, FPMT being its witness, with the *tshig mdzod chen
mo* a second witness for the yoga pairs and the source of their four-way grading. A subpath keeps that
boundary visible at the import line. See [astrology.md](astrology.md).

## Core Types

The shapes below are **complete** — every field of each type, not a selection. They drifted into
being an abridgement once, with `TibetanDate` showing 10 of its 15 fields and nothing saying so,
which is worse than an obvious summary because a reader diffs against it and concludes a field does
not exist. `check:conventions` rule 13 compares the README's *type lists* against the barrels but
cannot see a field, so this stays a hand sweep.

```typescript
interface Rational { num: number; den: number }

interface MeanMotion {
  perMonth: Rational;     // Janson's m1 / s1 / a1
  perDay: Rational;       // m2 / s2 / a2
  atEpoch: Rational;      // m0 / s0 / a0
}

interface TraditionConfig {
  readonly id: string;                          // 'phugpa'
  readonly name: string;                        // 'Phugpa' — a display label, not a name keyed by language
  readonly epochYear: number;                   // Y0 — 806, in Janson's Y numbering
  readonly epochMonth: number;                  // M0 — 3 by tradition
  readonly intercalationIndexAtEpoch: number;   // beta* — 61; beta and gamma* derive from it
  readonly leapIndexThreshold: number;          // 48 Phugpa, 0 Tsurphu, 46 Mongolian, 57 Bhutanese
  readonly leapMonthPosition: 'before'|'after'; // 'after' for Bhutan alone
  readonly meanDate: MeanMotion;
  readonly meanSun: MeanMotion;
  readonly lunarAnomaly: MeanMotion;
  readonly moonTab: readonly number[];          // 8 values, extended by symmetry to period 28
  readonly sunTab: readonly number[];           // 4 values, extended to period 12
  readonly naming?: TraditionNaming;            // Naming only, never the date
}

interface TraditionNaming {
  weekdayOffset?: number;              // Absent means 0 — Tibet's naming; Bhutan is 1
  monthAnimals?: TraditionMonthAnimals; // Absent means NOT SOURCED, and the astrology refuses
  nineNumbers?: TraditionNineNumbers;  // Absent means unnumbered — Janson: "only Tsurphu"
}

interface TraditionMonthAnimals {
  tigerMonth: number;                  // 11 Phugpa, 1 Tsurphu/Mongolia — anchors animal AND element
  elementRule: "son-of-year" | "continuous";  // Restart from the year's element, or run on
}

interface TraditionNineNumbers {
  months?: "unnumbered" | "descending"; // Default "unnumbered"; "descending" is Tsurphu's
}

interface TibetanDate {             // every returned date is frozen; spread to change one
  readonly year: number;           // Royal era, 127 BC epoch (e.g. 2153)
  readonly yearStartsIn: number;   // Janson's Y — Gregorian year this Tibetan year begins in (2026)
  readonly month: number;          // Month number (1-12); a leap month repeats the following month's, except
                          // under Bhutan, where it repeats the preceding one
  readonly monthCode: string;      // "M06" or "M06L" for leap month
  readonly isLeapMonth: boolean;
  readonly day: number;            // Tibetan day number (1-30)
  readonly isDoubledDay: boolean;  // true on BOTH days sharing this number
  readonly isLeapDay: boolean;     // true only on the first of a doubled pair (almanacs: "Extra")
  readonly isFullMoon: boolean;    // Do NOT test day === 15; when 15 is skipped the full moon is on 14
  readonly isNewMoon: boolean;     // Likewise not day === 30
  readonly isoDate: Temporal.PlainDate;
  readonly dayOfWeek: number;      // 1=Mon, 7=Sun (ISO standard)
  readonly tibetanWeekday: TibetanWeekday;  // 0=Sat..6=Fri — BRANDED, so dayOfWeek cannot be passed for it
  readonly weekdayName: TibetanWeekdayName; // The one name a date cannot regenerate: it needs the config
  readonly lunation: number;       // Unbroken month count; the date's month as a single sortable integer
}

interface TibetanMonth {
  readonly year: number;           // Royal era, so the month identifies itself without its producer
  readonly lunation: number;       // Unbroken count since the epoch; +1 per month, leap months included
  readonly yearName: TibetanYearName;  // On the month, not the date: 13 of these a year rather than 354
  readonly month: number;          // 1-12; shared with its twin in a leap year
  readonly monthCode: string;      // "M06" or "M06L" — unique within the year, unlike `month`
  readonly isLeapMonth: boolean;
  readonly days: number;           // CALENDAR days, 29 or 30 — not the date numbering, which runs 1-30
  readonly firstDay: Temporal.PlainDate;
  readonly lastDay: Temporal.PlainDate;
}

interface TibetanMonthFields {
  year: number;           // Royal era, like TibetanDate.year
  month: number;          // 1-12
  isLeapMonth?: boolean;
  calendarId?: never;     // always absent; present only to reject Temporal instances at compile time
}

interface TibetanDateFields {
  year: number;           // Royal era, like TibetanDate.year
  month: number;          // 1-12
  day: number;            // 1-30
  isLeapMonth?: boolean;  // select the leap month when two share a number
  isLeapDay?: boolean;    // select the first when two calendar days share a number
  calendarId?: never;     // as above
}

interface Rabjung {
  cycle: number;          // 17 for 1987-2046
  year: number;           // 1-60 position within the cycle
  tibetanName: TibetanName; // the Tibetan name only — neither Sanskrit list ships
}

interface MonthNames {
  mansion: {
    tibetanName: TibetanName;    // mchu … rgyal, bare — mchu is also "lip"
    sanskritName: SanskritName;  // the mansion's: maghā, not the month māgha. No index: month 8 names two
  };
  indianMonth: {
    sanskritName: SanskritName;  // the month's: māgha. No Tibetan (the month is called by its mansion); month 5 jyeṣṭha
  };
  fourSeasons: {
    month1LateWinter: FourSeasonMonthName;         // the original Kālacakra identification
    month1EarlySpring: FourSeasonMonthName;        // Phugpa's; Janson's "seasonal I"
    tigerEarlySpring: FourSeasonMonthName | null;  // counts from the Tiger month; null for Bhutan
  };
  sixSeasons: {
    month3EarlySpring: SixSeasonMonthName;         // Henning pp. 358–359
  };
}

interface FourSeasonMonthName {
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  part: 'early' | 'middle' | 'late';
  tibetanName: TibetanName;  // དཔྱིད་ཟླ་ར་བ *dpyid zla ra ba* for early spring
}

interface SixSeasonMonthName {
  season: 'spring' | 'summer' | 'rains' | 'autumn' | 'cold' | 'dewy';
  part: 'early' | 'late';
  tibetanName: TibetanName;    // the season's name — དགུན་སྨད *dgun smad* for dewy
  sanskritName: SanskritName;  // śiśira शिशिर
}

interface TibetanYearName {
  element: TibetanElement;  // 'wood' | 'fire' | 'earth' | 'iron' | 'water'
  animal: TibetanAnimal;    // 'mouse' | 'ox' | 'tiger' | ... | 'pig'
  gender: TibetanGender;    // 'male' | 'female' — redundant with animal, stored as printed
  elementName: TibetanName; // ཤིང *shing* for wood, མེ *me* for fire
  genderName: TibetanName;  // ཕོ *pho* for male, མོ *mo* for female
  animalName: TibetanName;  // རྟ *rta* for horse, སྟག *stag* for tiger
}

interface TibetanName {
  tibetan: string;   // Tibetan script, no final tsheg
  wylie: string;     // Extended Wylie
  phonetic: string;  // THL Simplified Phonetic
}

interface SanskritName {
  iast: string;        // IAST with full diacritics
  devanagari: string;  // transliterated from the IAST by a verifier, never typed
}

type TibetanElement = 'wood' | 'fire' | 'earth' | 'iron' | 'water';
type TibetanAnimal = 'mouse' | 'ox' | 'tiger' | 'rabbit' | 'dragon' | 'snake'
                   | 'horse' | 'sheep' | 'monkey' | 'bird' | 'dog' | 'pig';
type TibetanGender = 'male' | 'female';
type TibetanWeekday = number & { readonly __tibetanWeekday: unique symbol };   // 0=Sat..6=Fri, branded
type TibetanTrigram = 'fire' | 'earth' | 'iron' | 'sky' | 'water' | 'mountain' | 'wood' | 'wind';
type TibetanCalendarErrorCode =   // what each means: the README's error table
  | 'TCT_FIELD_OUT_OF_RANGE' | 'TCT_INVALID_ARGUMENT' | 'TCT_NO_SUCH_LEAP_MONTH' | 'TCT_SKIPPED_DAY'
  | 'TCT_OUTSIDE_EXACT_RANGE' | 'TCT_INVALID_TRADITION_CONFIG' | 'TCT_INVALID_OBSERVANCE_CONFIG'
  | 'TCT_SPAN_TOO_WIDE' | 'TCT_ATTRIBUTE_NOT_SOURCED' | 'TCT_MISSING_TEMPORAL' | 'TCT_INTERNAL';
type TibetanPlanet = 'saturn' | 'sun' | 'moon' | 'mars' | 'mercury' | 'jupiter' | 'venus';
type TibetanWeekdayElement = 'earth' | 'fire' | 'water' | 'wind';

interface TibetanWeekdayName extends TibetanName {
  planet: TibetanPlanet;            // shifted with the name by weekdayOffset
  element: TibetanWeekdayElement;   // the day's astrological element; `wind` is possible
}

interface TraditionOptions {
  readonly tradition?: TraditionConfig;   // defaults to PHUGPA
}

type MonthOverflow = 'constrain' | 'reject';   // Temporal's own option name and values

interface AddMonthsToDateOptions extends TraditionOptions {
  overflow?: MonthOverflow;   // defaults to 'constrain'
}

interface TibetanMonthDay {
  month: number;   // 1-12; a leap month is chosen by the leapMonth convention
  day: number;     // 1-30
}

interface ObservanceLevel {
  id: string;            // named by a rule's `level`; unique within a config
  englishName: string;
  tibetanName?: TibetanName;
}

type DoubledDayChoice = 'first' | 'second' | 'both';
type SkippedDayChoice = 'preceding' | 'following' | 'omit';
type LeapMonthChoice = 'regular' | 'leap' | 'both';
type FormulaName = 'lunarDayPlusWeekdayMod4';   // open to additions in a minor release

type ObservanceWhen =                    // open to additions: a consumer handles an unknown `type` with a default branch
  | { type: 'monthly'; days: readonly number[] }                       // every month
  | { type: 'annual'; dates: readonly TibetanMonthDay[];              // once a year
      fromYear?: number; untilYear?: number;                           // Tibetan years, as TibetanDate.year
      ageFromYear?: number }                                           // the Tibetan year counted as age 0
  | { type: 'period'; first: TibetanMonthDay; last: TibetanMonthDay } // every day from first to last, within one Tibetan year
  | { type: 'western'; month: number; day: number;                     // a Gregorian date, once a year
      fromYear?: number; untilYear?: number;                           // Western years
      ageFromYear?: number }                                           // the Western year counted as age 0
  | { type: 'formula'; formula: FormulaName }                          // every calendar day for which the formula holds
  | { type: 'counted'; anchor: TibetanMonthDay;                        // a schedule counted from an annual anchor
      waxingDays: number;                                              // 13-16
      waningDays: { oddMonth: number; evenMonth: number };             // each 13-16
      exclude?: readonly TibetanMonthDay[] };                          // counted occurrences on these resolved days are dropped

interface ObservanceRule {
  id: string;                             // unique within a config
  englishName: string;
  tibetanName?: TibetanName;
  level?: string;                         // the id of one of the config's levels
  tags?: readonly string[];               // distinct, non-empty; the engine never acts on one
  when: ObservanceWhen;
  doubledDay?: DoubledDayChoice;          // each of the three overrides the config default for this rule alone
  skippedDay?: SkippedDayChoice;
  leapMonth?: LeapMonthChoice;
}

interface ObservanceConfig {
  id: string;
  englishName: string;
  tibetanName?: TibetanName;
  doubledDay: DoubledDayChoice;           // required: no config is the default
  skippedDay: SkippedDayChoice;
  leapMonth: LeapMonthChoice;
  levels?: readonly ObservanceLevel[];
  rules: readonly ObservanceRule[];       // their order is the order of same-day results
}

interface ObservanceLayer {            // the differences composeObservances applies to a base config
  id: string;                          // id, englishName and tibetanName name the result, never read from the base
  englishName: string;
  tibetanName?: TibetanName;
  remove?: readonly string[];          // ids of base rules to drop
  replace?: readonly ObservanceRule[]; // take the position of the base rule with the same id
  add?: readonly ObservanceRule[];     // appended after the base's, in the order given
  removeLevels?: readonly string[];    // ids of base levels to drop; refused while a remaining rule names one
  replaceLevels?: readonly ObservanceLevel[]; // take the position of the base level with the same id
  addLevels?: readonly ObservanceLevel[];     // appended after the base's remaining ones
  conventions?: readonly {             // per base rule, in place; the rule's other fields stay the base's
    id: string;                        // a base rule; once across remove, replace, add and conventions
    doubledDay?: DoubledDayChoice;     // at least one of the three; any other key refused
    skippedDay?: SkippedDayChoice;
    leapMonth?: LeapMonthChoice;
  }[];
  doubledDay?: DoubledDayChoice;       // each convention replaces the base's; absent means no change
  skippedDay?: SkippedDayChoice;
  leapMonth?: LeapMonthChoice;
}

type ObservanceResolution =              // open to additions in a minor release: a consumer keeps a fallback
  | 'exact' | 'dayBeforeSkipped' | 'dayAfterSkipped' | 'firstOfDoubled' | 'secondOfDoubled'
  | 'inPeriod'                         // a day of a `period` rule's span
  | 'counted';                         // a landing of a `counted` rule; its anchor keeps its own resolution

interface Observance {                 // one occurrence of one rule on one calendar day
  date: TibetanDate;                   // always a real calendar day
  rule: ObservanceRule;                // the engine's frozen copy of the config's rule, not the caller's object
  resolution: ObservanceResolution;
  age?: number;                        // years since the rule's ageFromYear, in the form's own calendar (an annual date's Tibetan year is the one it stands for); absent without one
  period?: { first: TibetanDate; last: TibetanDate };  // a `period` rule's whole span; absent on every other form
}

interface YearAttributes {
  cyclePosition: number;   // 1-60 in the Chinese cycle
  animal: TibetanAnimal;
  power: TibetanElement;   // the one the year's NAME carries
  life: TibetanElement;    // srog, fixed by the animal
  body: TibetanElement;    // lus, on a 30-year cycle
  fortune: TibetanElement; // klung rta; never earth
  spirit: TibetanElement;  // bla, the element preceding life
  central: number;         // 1-9
  lifeNumber: number;      // 1-9
  powerNumber: number;     // 1-9
  tibetanNames: { animal, power, life, body, fortune, spirit: TibetanName };  // last, keyed by the field named
}

interface MonthAttributes {
  animal: TibetanAnimal;
  gender: TibetanGender;
  element: TibetanElement;
  number: number | null;   // null where the tradition does not number months — Phugpa
  tibetanNames: { animal, gender, element: TibetanName };
}

interface LunarDayAttributes {
  animal: TibetanAnimal;
  element: TibetanElement;
  trigram: TibetanTrigram; // Janson's English: fire earth iron sky water mountain wood wind
  number: number;          // 1-9
  tibetanNames: { animal, element, trigram: TibetanName };
}

interface CalendarDayAttributes {
  element: TibetanElement;
  gender: TibetanGender;
  animal: TibetanAnimal;
  trigram: TibetanTrigram;
  number: number;          // 1-9
  elements: Pick<YearAttributes, 'life' | 'body' | 'fortune' | 'spirit'>;
  tibetanNames: { element, gender, animal, trigram, life, body, fortune, spirit: TibetanName };
}

interface ElementalYoga {
  englishName: string;        // the yoga's name in English, Henning's translation — first, as the key
  tibetanName: TibetanName;   // Henning's, two spellings corrected; script derived and verified
  sanskritName: SanskritName; // Henning's IAST, with Devanāgarī transliterated from it
  elements: readonly [TibetanWeekdayElement, TibetanWeekdayElement];  // as Henning prints the pair
  favorable: boolean;      // FPMT's claim, in neither Janson nor Henning
  auspiciousness: YogaAuspiciousness;  // the tshig mdzod chen mo's grading; membership read by list order
}

interface YogaAuspiciousness {
  englishName: 'good' | 'restorative' | 'bad' | 'worst';  // good, bad printed; worst via Sanskrit adhama; restorative composed
  tibetanName: TibetanName;   // bzang po, gso thub, ngan, tha chad, as the entry prints them
}

interface DayAttributes {
  date: TibetanDate;
  year: YearAttributes;
  month: MonthAttributes | null;       // null for the Bhutanese configs
  lunarDay: LunarDayAttributes | null; // likewise
  calendarDay: CalendarDayAttributes;
  lunarMansion: LunarMansion;
  yoga: ElementalYoga | null;          // null where the weekday is shifted (the Bhutanese configs)
}

interface LunarMansion {
  index: number;                  // 0-26, Aśvinī to Revatī; Janson's 27, Henning's 28 without Abhijit
  tibetanName: TibetanName;       // the Mahāvyutpatti's; no englishName, because no source prints one
  sanskritName: SanskritName;     // the Mahāvyutpatti's form as a stem; 22 and 23 paired as Das pairs them
  element: TibetanWeekdayElement; // Henning's table
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
- **Naming systems group under a `*Name` field.** Stated that way the rule extends to any name a
  date carries. It no longer predicts `monthName` and `dayName` on the date: year naming came off
  `TibetanDate` on 2026-08-24, and month naming shipped as the lookup `monthNamesFor` for the same
  reason (below).

Grouping everything — `year.number`, `month.code`, `day.isLeap` — was rejected. It is more
uniform, but `d.month` as an object where `PlainDate.month` is a number generates silent
failures: `d.month === 11` is quietly false and `${d.month}` renders `[object Object]`. That is
the same failure class the [year numbering decision](decisions/2026-08-11-year-numbering.md)
exists to eliminate.

### Why year-level naming is not on `TibetanDate`

Both cycles name a **year**, so on a date they are one value repeated across all 354, 355, 383, 384 or 385 days of it — together more than half of a serialised year.
`yearNameFor(year)` and `rabjungFor(year)` are closed forms over the year alone, so nothing is lost: a date carries `year`, and both are one call away.
`TibetanMonth` keeps `yearName`, where the repetition is thirteen-fold rather than 354-fold and the `monthsFor` → `datesFor` path wants it to hand.

**Month names follow the same rule.** `monthNamesFor(month)` needs only the month number (and, for
`tigerEarlySpring`, the tradition), so a date repeating them thirty times would cost bytes and buy
nothing. And there are five of them per month — one per naming system — which is five fields no single
`monthName` could hold without choosing a system. See
[decisions/2026-09-14-month-names-return-every-system.md](decisions/2026-09-14-month-names-return-every-system.md).

`weekdayName` stays on the date, and the line is not arbitrary: it is the only name a date cannot
regenerate from itself, because `weekdayNameFor` takes a `TraditionConfig` and a serialised date
carries none. See
[decisions/2026-08-24-year-naming-off-the-date.md](decisions/2026-08-24-year-naming-off-the-date.md).

### Why `rabjung` is separate from `yearName`

They are two different 60-year cycles, and Janson §4 is explicit that they are different *kinds*
of system:

- The **Indian** cycle is a **numbering** — cycles are numbered, and cycle plus position
  identifies a year unambiguously. This is `rabjung`.
- The **Chinese** cycle is a **name** — "the Chinese cycles are not numbered in the Tibetan
  calendar". This is `yearName`.

They also give a year *different positions*. 2026 is year **40** of the Indian cycle and year
**43** of the Chinese (Janson's table of the sixty-year cycle). Holding both in one object put `40` directly beside
`Fire–Horse`, which it does not index — position 40 indexes *parābhava*. Anyone building a
60-entry lookup keyed on that number would be wrong in every year of the cycle, because the two
positions differ by a constant three. Splitting them makes the mistake unbuildable.

`rabjung` is grouped rather than two flat scalars because its two numbers are only meaningful
together — unlike `year` and `yearStartsIn`, each of which stands alone — and because it is where
the Indian cycle names will go if they are ever added.

### Why `rabjung.tibetanName` carries the Tibetan name and neither Sanskrit list

`rabjung.year` is a position in two 60-year Sanskrit lists — the one Janson's Tibetan-lineage table
descends from and the Indic saṃvatsara list — which carry **different names** at 16, 17, 18, 20 and
34, the Tibetan following the second every time. At 34 the Indic Śārvarī, "belonging to night",
stands against *kun ldan*, all-endowed, which renders *sarvapati*.

`rabjung.tibetanName` therefore exposes **neither**: a type pairing one list with the Tibetan name would be
naming something the Tibetan does not render at five of every sixty positions, and the only defence
would be a docblock the reader has to have read. Both lists stay tabulated in
[names/rabjung.md](names/rabjung.md), with [names/rabjung-sourcing.md](names/rabjung-sourcing.md) for
how they were arrived at. The decision, and the shape they would take if they ever return, is
[decisions/2026-08-25-rabjung-ships-the-tibetan-name-only.md](decisions/2026-08-25-rabjung-ships-the-tibetan-name-only.md),
which supersedes
[decisions/2026-08-21-rabjung-names-carry-both.md](decisions/2026-08-21-rabjung-names-carry-both.md).

This section used to be titled "why the 60 rabjung names are not included," and recorded three
reasons for deferring them. Two turned out to be wrong, and the third was resolved by sourcing work
rather than by a design change, which is why none of them constrain the shipped shape:

- *"No source carries all 60 in Tibetan script with Lhasa phonetics."* Two independent EWTS
  implementations agree on the script for all sixty and round-trip every one back to its Wylie, and
  THL's converter supplies the phonetics. The Lhasa requirement itself was **retired**: house
  conventions govern prose, a published standard governs a shipped data column.
- *"Janson's ASCII collides three names onto `pramadi`."* True, and the reason his Sanskrit column
  is not shipped as a name. It is still read, as one of two detectors of the rows where the lists
  carry different *names* rather than different spellings — and Csoma separates the three collided
  rows (Pramodi, Pramáthi, Pramádi), so the collision no longer blocks anything.
- *"The traditions diverge in content — Tibetan 20 is akṣaya where the Hindu list has vyaya, and
  akṣaya sits at 60."* **The example was wrong and the framing was too**, and both survived here for
  months. Position 60's Indic cell said अक्षय; Sewell, Janson, Csoma and the Tibetan `zad pa` all say
  क्षय. And what looked like traditions diverging is two Sanskrit **lists** for one cycle: they carry
  different names at 16, 17, 18, 20 and 34, while 29 and 52 — long recorded as the clearest
  divergences — are one year with a pair of readings that Csoma prints braced together, of which the
  Tibetan takes the one the Indic list did not.

Henning's book has transliterations but is a copyrighted secondary source, which is why the script
column is derived rather than transcribed.

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

## Input validation

**Public entry points validate; internals assume validated input.**
The boundary is the exported surface — `tibetanToIso`, `losarFor`, `isoToTibetan`, `getObservances`
and `observancesOn`.
The internals under `src/computation/` below that line may assume their arguments are already
integers in range, and are free not to re-check. `computation/conversion.ts` is the exception: it
holds root exports and the boundary homes `asWesternDay`, `monthCountFor` and `julianDayOfFields`, so
its guards are the boundary, not redundant copies.

Add a guard when you add a public function.
The engine's determinism rests entirely on integer arithmetic, and that premise was previously
defended everywhere except where untrusted values enter: a fractional `day` passed every bound check
and returned a confident, well-formed, wrong `PlainDate`, and `NaN` passed too, since it satisfies
neither `< 1` nor `> 30`.
A plausible calendar that is quietly wrong is the most expensive failure this project has.

Seven rules follow from that:

- **A date argument is tested by kind, not identity.** `temporalKindOf` reads
  `Symbol.toStringTag`; `instanceof Temporal.PlainDate` is refused everywhere but
  `src/temporal-kind.ts`, by `check:conventions` Rule 15. `instanceof` asks which realm built
  the value, and a `PlainDate` from a second Temporal implementation — a bundled polyfill, two
  copies in `node_modules`, an iframe — fails it. That was 27 exports wrong in two directions:
  17 read a foreign Western date as a Tibetan one and answered, 10 refused a genuine Western
  date. See [decisions/2026-09-23-brand-not-identity.md](decisions/2026-09-23-brand-not-identity.md).
- **Integrality is checked before range.** `Number.isSafeInteger` for years, which covers fractions,
  `NaN`, the infinities and 2⁵³ overflow in one predicate; `Number.isInteger` for fields whose
  bounds already confine them.
- **Out-of-exact-range is its own error.** Past
  [`ScaledTradition.exactToJulianDay`](../src/computation/scaling.ts) the arithmetic degrades
  silently, and a degraded `true_date` misclassifies the day — so overflow surfaced as
  `SkippedDayError`, a confident calendrical claim about a date that was never computed. A caller's
  correct response to `SkippedDayError` is "fine, that date does not exist"; to this it is "my input
  is out of range". They must stay distinguishable.
- **Predicates catch by allowlist.** `tibetanDateExists` answers `false` for exactly **one class and
  two codes** — `SkippedDayError` matched by class, plus `TCT_FIELD_OUT_OF_RANGE` and
  `TCT_NO_SUCH_LEAP_MONTH` — and rethrows everything else, so an internal violation, a malformed
  config, or a date past the exact range reaches the caller rather than being reported as a missing
  date. `TCT_SKIPPED_DAY` is not matched as a code, so an error carrying it without the class is
  rethrown. It was a denylist and lost: an uncoded `RangeError` from the scaling derivation came
  back as "Losar 2026 does not exist". A denylist has to anticipate every failure anyone will ever
  add; an allowlist names only the three things that are answers about the input.
- **Both consumer configs are validated once per object, and the engine reads a private frozen
  copy of what was validated.** The copy is memoised on a `WeakMap` keyed by the object the caller
  passed, so a config mutated after first use changes nothing the engine sees. It is not the
  bargain `scalingFor` makes, whose cache keeps serving stale but consistent constants: without the
  copy the engine re-read the caller's object on every call, unvalidated.
  `ObservanceConfig` is checked and copied by `ensureValidated` (`src/observances/validate.ts`),
  `TraditionConfig` by [`validatedTradition`](../src/traditions/validate.ts), which every entry point
  and `scalingFor` read the tradition through. Both check **shape, not astronomy**, and both refuse
  a key they do not have; `TraditionConfig` also refuses the values its arithmetic cannot take
  (`m₁ ≠ 30·m₂`, a table whose first entry is not zero, an intercalation index outside 0…64).
- **A wrong-kind argument is not a field out of range.** `TCT_FIELD_OUT_OF_RANGE` means a number is
  wrong; `TCT_INVALID_ARGUMENT` means the argument is the wrong sort of thing — a `Temporal`
  instance where a Tibetan date belongs, a non-boolean leap flag, `null`. They are handled
  differently by a consumer (bad data to show a user, against a bug in their own code), and only the
  first is on the allowlist above. See
  [decisions/2026-08-15-argument-errors-split.md](decisions/2026-08-15-argument-errors-split.md).
- **Every error carries a code**, and `SkippedDayError` is the only error class — including a throw
  from the caller's own getter or `Proxy` trap while an argument is read, which is refused with a code
  and kept as `cause`, as the README states. Construct through
  `rangeError`/`codedError` in [`src/errors.ts`](../src/errors.ts) rather than with a bare
  `new RangeError`, so the code is never omitted. Codes are contract; message text is not. See
  [decisions/2026-08-12-error-codes-not-classes.md](decisions/2026-08-12-error-codes-not-classes.md).

## The day boundary

The engine returns whole proleptic-Gregorian calendar days and models no instants. The calendar's
own boundary is **daybreak**, and it is already inside the arithmetic: Janson's `true_date` is a
local Julian date whose integer values fall at mean dawn rather than at noon UT, so the offset was
fixed with the epoch constants and is never re-applied. No sunrise is computed anywhere, which is
part of why results are deterministic and need no location.

There is therefore no daybreak field on `TraditionConfig` — nothing would read it — and no
instant-to-date helper, because such a helper must choose between local and Tibetan-meridian
daybreak and practice is not uniform. See
[decisions/2026-08-15-daybreak-not-modelled.md](decisions/2026-08-15-daybreak-not-modelled.md).

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
mirroring `src/` — the structure the `./observances` subpath export depends on. Reasoning:
[decisions/2026-08-11-build-tooling.md](decisions/2026-08-11-build-tooling.md).

### Temporal types

TypeScript 7 ships `lib.esnext.temporal.d.ts`, so `"lib": ["ES2024", "ESNext.Temporal"]`
declares `Temporal` as a **global** namespace. The package therefore needs no Temporal typings
dependency, and neither do consumers — emitted `.d.ts` files reference the global. TypeScript
5.9 and `@types/node` have no Temporal declarations at all, which is why the TypeScript major
is a load-bearing choice rather than a preference.
