# tibetan-calendar-temporal

> ## ⚠️ Placeholder release
>
> **This package does not work yet.** v0.0.1 exports nothing but a status string. It exists to
> reserve the name while the engine is built.
>
> Everything below describes the **planned** API, not shipped behaviour. Do not depend on this
> package until v1.0.0.

A TypeScript library that computes Tibetan calendar dates according to the Phugpa tradition
(Men-Tsee-Khang standard), built on
[Temporal](https://tc39.es/proposal-temporal/docs/).

It converts between Western (ISO) and Tibetan dates, handles leap months and skipped/doubled
days, and determines practice days. Open source, MIT licensed, with zero runtime dependencies.

## Contents

- [Design](#design)
- [Requirements](#requirements)
- [Usage](#usage)
  - [Converting a Western date](#converting-a-western-date)
  - [Day of week](#day-of-week)
  - [Converting back](#converting-back)
  - [Three things that make this calendar hard](#three-things-that-make-this-calendar-hard)
  - [Naming a year](#naming-a-year)
  - [Traditions](#traditions)
  - [Practice days](#practice-days)
- [Why this exists](#why-this-exists)
- [Provenance](#provenance)
- [Project identity](#project-identity)
- [Documentation](#documentation)
- [Licence](#licence)

## Design

- **Temporal-native** — `Temporal.PlainDate` throughout, no legacy `Date`
- **Zero runtime dependencies** — Temporal is a language built-in
- **Integer arithmetic only** — deterministic, cross-platform-identical results
- **Tradition-agnostic** — astronomical constants injected via config; v1 ships Phugpa, the
  algorithm supports Tsurphu
- **Pure stateless functions** — memoizable, safe to offload to a worker
- **ESM only**

## Requirements

Node 26 or later, where `Temporal` is enabled by default. Earlier runtimes need a Temporal
polyfill supplied by you — the package deliberately does not bundle one, which is what keeps it
at zero runtime dependencies.

```sh
npm install tibetan-calendar-temporal
```

## Usage

### Converting a Western date

```js
import { isoToTibetan, formatTibetanDate } from 'tibetan-calendar-temporal';

const date = isoToTibetan(Temporal.PlainDate.from('2026-08-12'));

formatTibetanDate(date);   // "2153-M06-30"
date.month;                // 6
date.day;                  // 30
```

The full object:

```json
{
  "year": 2153,
  "yearStartsIn": 2026,
  "rabjung": { "cycle": 17, "year": 40 },
  "yearName": { "element": "fire", "animal": "horse", "gender": "male" },
  "month": 6,
  "monthCode": "M06",
  "isLeapMonth": false,
  "day": 30,
  "isDoubledDay": false,
  "isLeapDay": false,
  "isoDate": "2026-08-12",
  "dayOfWeek": 3
}
```

> **Printing it in a terminal.** Use `JSON.stringify(date, null, 2)`, as above. Plain
> `console.log` renders `isoDate` as `PlainDate [Temporal.PlainDate] {}` — Temporal exposes its
> data through prototype getters rather than own properties, and Node's inspector prints only own
> properties. The value is intact; `JSON.stringify` shows it because Temporal implements
> `toJSON()`. This affects every Temporal-native library, not just this one.

### Day of week

`dayOfWeek` is **ISO 8601**: `1` = Monday through `7` = Sunday. So `3` above is Wednesday. This
matches `Temporal.PlainDate.prototype.dayOfWeek` exactly, so the two never disagree.

No weekday *name* is included, because `Temporal` already gives you one in the right language:

```js
date.isoDate.toLocaleString('en-GB', { weekday: 'long' });   // "Wednesday"
```

Tibetan almanacs number the week differently — `0` = Saturday through `6` = Friday. If you need
that convention, it is exported separately rather than conflated with the ISO field:

```js
import { julianDayFromIso, tibetanWeekday } from 'tibetan-calendar-temporal';

tibetanWeekday(julianDayFromIso(Temporal.PlainDate.from('2026-08-12')));   // 4 (Wednesday)
```

### Converting back

```js
import { tibetanToIso } from 'tibetan-calendar-temporal';

tibetanToIso({ year: 2153, month: 6, day: 30 }).toString();   // "2026-08-12"
```

`year` is the **royal-era** number an almanac prints (2153), not the Gregorian year the Tibetan
year began in (2026, exposed as `yearStartsIn`). The two differ by 127. Passing 2026 where 2153
is meant returns a date 127 years away rather than failing quietly — loud by design.

### Three things that make this calendar hard

A Tibetan month does not map cleanly onto calendar days, and any code consuming this library has
to handle all three cases. They are common, not exotic: expect roughly one of each every couple
of months.

**Skipped dates** name no calendar day at all, so there is nothing for a conversion to return.
`tibetanToIso` throws; test first if the input is untrusted.

```js
import { tibetanDateExists, SkippedDayError } from 'tibetan-calendar-temporal';

tibetanDateExists({ year: 2150, month: 12, day: 29 });   // false
tibetanToIso({ year: 2150, month: 12, day: 29 });
// SkippedDayError: Tibetan date 2150-12-29 is skipped: no calendar day carries this number.
```

**Doubled dates** are carried by two consecutive calendar days. Both report `isDoubledDay: true`;
`isLeapDay` distinguishes the first from the second, and selects between them on the way back.

```js
isoToTibetan(Temporal.PlainDate.from('2025-11-19')).isLeapDay;   // true  — first
isoToTibetan(Temporal.PlainDate.from('2025-11-20')).isLeapDay;   // false — second

tibetanToIso({ year: 2152, month: 9, day: 30, isLeapDay: true });   // 2025-11-19
tibetanToIso({ year: 2152, month: 9, day: 30 });                    // 2025-11-20
```

Holidays are generally observed on the second day rather than the leap day — but not always, and
institutions differ. FPMT published the 2024 Chokhor Duchen as "July 9 or July 10", which is one
doubled day, not a disagreement about the calendar.

**Leap months** repeat a month number, and the leap month is the **first** of the two. `month`
alone is therefore not a unique key within a year; use `monthCode`, which is.

```js
const leap = isoToTibetan(Temporal.PlainDate.from('2024-07-06'));
leap.monthCode;     // "M06L"
leap.isLeapMonth;   // true

tibetanToIso({ year: 2151, month: 6, day: 1, isLeapMonth: true });   // 2024-07-06
tibetanToIso({ year: 2151, month: 6, day: 1 });                      // 2024-08-05
```

The two cases compose, and that is where mistakes live: 4 of leap month 6 is *also* a doubled
day, so it needs both flags — `{ month: 6, day: 4, isLeapMonth: true, isLeapDay: true }` is
9 July 2024, while dropping `isLeapDay` gives the 10th.

### Naming a year

```js
const losar = isoToTibetan(Temporal.PlainDate.from('2026-02-18'));

formatTibetanDate(losar);   // "2153-M01-01"  — Losar, Tibetan New Year
losar.yearName;             // { element: 'fire', animal: 'horse', gender: 'male' }
losar.rabjung;              // { cycle: 17, year: 40 }
```

`yearName` is the element–animal name practitioners recognise. `rabjung` is the Indian 60-year
cycle, which is a *numbering* rather than a name — and it indexes the year differently, so the
two are kept apart deliberately. See
[docs/architecture.md](docs/architecture.md#why-rabjung-is-separate-from-yearname).

### Traditions

Every function takes an optional `TraditionConfig`, defaulting to `PHUGPA`. Astronomical
constants are injected rather than hardcoded, so Tsurphu can be added without touching the
algorithm.

```js
import { PHUGPA_HENNING } from 'tibetan-calendar-temporal';

const day = Temporal.PlainDate.from('2025-11-19');

formatTibetanDate(isoToTibetan(day));                   // "2152-M09-30 (leap)"
formatTibetanDate(isoToTibetan(day, PHUGPA_HENNING));   // "2152-M09-29"
```

`PHUGPA` uses the lunar anomaly increment `a₂ = 1/28` that almanacs use, and is the right default
for nearly everyone. `PHUGPA_HENNING` uses Henning's exact `3781/105840`. They disagree on about
one day in 4,100 — eleven days between 1950 and 2050 — and `2025-11-19` above is one of them. The
evidence for the default is in
[docs/decisions/2026-08-12-lunar-anomaly-a2-default.md](docs/decisions/2026-08-12-lunar-anomaly-a2-default.md).

### Practice days

Shipping in v1.0.0 via a `tibetan-calendar-temporal/practice` subpath export. Not yet available.

Full API detail: [docs/architecture.md](docs/architecture.md).

## Why this exists

This engine is the computation backend for **Nyamlen**, a Tibetan Buddhist practice calendar
app (integrated modular PWA, separate repo). The app has additional modules — Meditation Timer,
Vow Tracker — but this library is the foundation: it computes what days are significant and
why.

The engine is separate from the app because:

- Other projects can use it (FPMT centres, independent developers)
- It's open source to build trust — practitioners need to trust the dates are correct
- Clean separation enables independent versioning and testing

## Provenance

Implemented from Svante Janson, *Tibetan Calendar Mathematics*
([arXiv:1401.6285](https://arxiv.org/abs/1401.6285)) as a clean-room build. It shares no code
with any existing implementation — see [CONTRIBUTING.md](CONTRIBUTING.md) for the rules that
keep it that way.

## Project identity

| Thing | Name |
|-------|------|
| npm package | `tibetan-calendar-temporal` (unscoped) |
| GitHub/npm org | `nyamlen` |
| Repository | `github.com/nyamlen/tibetan-calendar-temporal` |

**Scoping policy.** The flagship engine stays unscoped — unscoped names rank better in npm
search, and discoverability is this package's job. Everything else in the suite ships scoped:
`@nyamlen/timer`, `@nyamlen/vows`.

## Documentation

| | |
|---|---|
| [docs/architecture.md](docs/architecture.md) | Layered model, API design, package structure, core types, tooling |
| [docs/testing.md](docs/testing.md) | Three-tier testing strategy and validation sources |
| [docs/roadmap.md](docs/roadmap.md) | Implementation phases and release status |
| [docs/decisions/](docs/decisions/) | Decision records |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Clean-room constraint, dev setup, how to add validation data |

## Licence

MIT — see [LICENSE](LICENSE). Fork it, build on it, ship commercial products with it.
