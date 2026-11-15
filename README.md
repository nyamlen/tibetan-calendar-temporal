# tibetan-calendar-temporal

> ## ⚠️ Not yet released
>
> **The version on npm does not work.** `0.0.1`, the only one published, exports nothing but a status
> string; it exists to reserve the name while the engine is built.
>
> **This repository does.** The API below is implemented and tested — every example in this file is
> asserted by the test suite — and a tarball packed from this source (`npm pack`) contains it, though
> its `package.json` still says `0.0.1`. It is **not yet published**. Do not depend on the npm package
> until v1.0.0.

Compute Tibetan calendar dates in JavaScript — leap months, doubled and skipped days, moon phases,
year names and observances — for almanac applications, practice calendars, and anything that has to
show a Tibetan date and be right about it.

```sh
npm install tibetan-calendar-temporal
```

```js
import { isoToTibetan, formatTibetanDate, yearNameFor, rabjungFor } from 'tibetan-calendar-temporal';

const day = isoToTibetan(Temporal.PlainDate.from('2026-08-23'));

formatTibetanDate(day);          // "2153-M07-11"
day.weekdayName.phonetic;        // "nyima"       — Sunday, the sun's day
day.isFullMoon;                  // false
yearNameFor(day.year).element;   // "fire"        — Fire Male Horse year
rabjungFor(day.year);            // { cycle: 17, year: 40, … }
```

Zero runtime dependencies, MIT licensed, built on [Temporal](https://tc39.es/proposal-temporal/docs/).
Every date it returns can be traced to a source and a range of years —
see [why you can trust these dates](docs/why-trust-these-dates.md).

## Contents

- [What you get](#what-you-get)
- [Why you can trust the dates](#why-you-can-trust-the-dates)
- [How this compares](#how-this-compares)
- [Requirements](#requirements)
- [Usage](#usage)
  - [Converting a Western date](#converting-a-western-date)
  - [Converting back](#converting-back)
  - [Building a month grid](#building-a-month-grid)
  - [Naming a year](#naming-a-year)
  - [Errors and validation](#errors-and-validation)
  - [Traditions](#traditions)
  - [Observances](#observances)
  - [Astrological attributes](#astrological-attributes)
- [API](#api)
- [Internationalisation](#internationalisation)
- [Why this exists](#why-this-exists)
- [Provenance](#provenance)
- [Project identity](#project-identity)
- [Documentation](#documentation)
- [Licence](#licence)

## What you get

| | |
|---|---|
| **Conversion, both ways** | Western ↔ Tibetan, total in both directions. Every calendar day has a Tibetan date; a Tibetan date that no day carries is reported rather than guessed |
| **The hard cases, handled** | Leap months, doubled days and skipped days — the three things that make this calendar a calculation rather than a lookup. Roughly one of each every couple of months |
| **Month grids** | A year's months in calendar order with their boundaries, and one entry per calendar day of a month, so a grid needs no arithmetic of its own |
| **A full almanac row** | Fifteen fields per date: royal-era year, month code, day, true full and new moon, ISO and Tibetan weekday with its planet and element. The element–animal year name and the rabjung cycle position are properties of the *year*, so they are closed-form lookups rather than one value repeated on all 354 days |
| **Names in three renderings** | Tibetan script, Wylie, and THL Simplified phonetics for every weekday, element, gender, animal and rabjung year — each verified against five independent sources before it shipped |
| **Observances** | The great holy days and the monthly cycle, as configurable rules. Each result says *how* it landed on its day, so a display can show the almanac's footnote instead of presenting a moved date as an exact one |
| **Astrological attributes** | What kind of day it is, not just which day: the year's five elements, the month's and lunar day's labels, the calendar day's own, and the elemental yoga — which needs the moon's real position, not a cycle. A separate subpath, sourced piece by piece |
| **Four traditions** | Phugpa and Bhutanese, each in two parameterisations. Constants and rules are injected as data, so a further tradition is a config object rather than a code change |
| **Date arithmetic** | Add days or months, count between two dates, find the next true full or new moon, and reduce a month to one sortable integer for a database key |

Everything is a pure function over plain objects. No classes, no instances, no hidden state.

**Why `Temporal.PlainDate`, and never `Date`.** Temporal is the language's replacement for `Date` —
a finished (stage 4) TC39 proposal, expected in ES2027, already shipping in Node 26, Chrome and
Firefox. MDN describes it as "designed as a full replacement for the `Date` object", and is blunt
about why one was needed: `Date` copies `java.util.Date`, a class Java itself replaced in the early
2010s, and survives only because JavaScript does not break backwards compatibility. So this is not
an exotic choice; it is the standard one, taken early.

It is also the only workable one here. `Date` can express **only the Gregorian calendar** — and
this package's entire job is a calendar that is not Gregorian. Beyond that, a `Date` is not a date
at all: it is a timestamp, and it always carries a time and an offset. Ask it for
"18 February 2026" and what you get is an instant, which lands on a different calendar day
depending on where the user is sitting.
For a Western calendar that is a nuisance; for this one it is a wrong answer, because a Tibetan
date labels a **whole day** whose boundary is already fixed in the arithmetic. `PlainDate` is
precisely that type — a calendar day, no time, no zone — so the commonest bug in date handling
cannot be expressed. It is also immutable, so a date this library hands you cannot be altered
underneath another caller, and it is a language built-in, which is how the package has zero
dependencies while still doing calendar arithmetic. [More on the day
boundary](docs/guide.md#where-a-day-begins).

## Why you can trust the dates

The engine is a clean-room implementation of Svante Janson's *Tibetan Calendar Mathematics*, and
every claim it makes about agreement comes with the range of years over which that agreement was
checked. Agreement quoted without its window is not evidence.

It also states what is *not* established — which traditions are expressible but unshipped, where it
differs from a published almanac and why, and which questions no available source can settle.

**[Read the full account →](docs/why-trust-these-dates.md)**

## How this compares

| | `tibetan-date-calculator` | `@hnw/date-tibetan` | Henning's software | this package |
|---|---|---|---|---|
| Date type | legacy `Date` | `Date` + Julian day | writes text files | `Temporal.PlainDate` |
| Traditions | Phugpa | 3, as fixed classes | Phugpa, Tsurphu, Zhonnu Pal | 4 configs, more addable as data |
| What a date carries | ~9 properties | a 6-element tuple | text columns | 15 fields, names in three scripts |
| Observances | — | — | hardcoded columns | configurable, with resolutions |
| Astrological data | — | — | **planets, lunar mansions, eclipses** | attributes and the yoga; no planets or eclipses |
| Stated validated range | — | — | — | every claim carries its window |

Henning's software computes a full astrological almanac — planets and eclipses included — which this
package does not attempt, and
`@hnw/date-tibetan` is the shortest route to a Mongolian date. **[When to use which
→](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/other-implementations.md)**

## Requirements

**Node 26 or later**, where `Temporal` is enabled by default. The package does not bundle a
polyfill — that is what keeps it at zero runtime dependencies — so on any older runtime, and in a
browser, you supply one.

The failure mode if you do not is **not** a helpful `TypeError` at the call that needed a date. The
engine touches `Temporal` while the module is evaluating, so a runtime without it fails on
`import`, before your code has called anything:

```js
import 'tibetan-calendar-temporal';
// Error: tibetan-calendar-temporal requires the Temporal API, which is not available in this
// runtime. Temporal ships enabled from Node 26; Node 24 has it behind --harmony-temporal. On
// older runtimes or in a browser, import a polyfill before this package:
// `import "temporal-polyfill/global";`
```

That message is a guard the package raises deliberately. Without it you would get a bare
`ReferenceError: Temporal is not defined` naming neither the requirement nor the fix.

**Using a polyfill.** Install [`temporal-polyfill`](https://www.npmjs.com/package/temporal-polyfill)
and import it once, before this package, in your app's entry module:

```js
import 'temporal-polyfill/global';
import { isoToTibetan } from 'tibetan-calendar-temporal';
```

The same applies in a browser: `Temporal` ships in Chrome, Edge and Firefox but not yet in Safari.
`temporal-polyfill/global` installs nothing where `Temporal` already exists, so a test suite on
Node 26 that imports it has not tested the polyfill; [the guide](docs/guide.md#using-a-polyfill)
shows how to force it.

**Node 24 has `--harmony-temporal`, and you should not use it here.** That flag exposes V8's
unfinished implementation — it is behind a flag because it is not done — and nothing here has been
run against it. A polyfill is an implementation too, and the reason to prefer it is evidence rather
than principle: this package's output under `temporal-polyfill` and `@js-temporal/polyfill` has been
compared with its output under the built-in `Temporal` and found identical — see
[why you can trust these dates](docs/why-trust-these-dates.md#why-the-results-are-identical-everywhere).
Use the polyfill.

`engines` declares `">=26"`, which npm treats as **advisory** — a warning on install, not a block —
so a polyfilled Node 22 or 24 project works fine. See
[the guide](docs/guide.md#running-it-anywhere) for `engine-strict` and the rest.

**TypeScript 7 or later, if you type-check.** This is a *separate* requirement from the runtime one
above and is not implied by it. The ambient `Temporal` namespace type ships in TypeScript's own lib
files only from 7.0 (`lib.esnext.temporal.d.ts`), so on the 5.x line every declaration file here
that mentions a date fails with `TS2503: Cannot find namespace 'Temporal'` — which is all of them,
because dates are the product. **You can satisfy every runtime requirement on this page, on Node 26,
and still not compile a line.** If you see that error, this is the axis to check.

```sh
npm i -D typescript@^7
```

No `"lib"` setting is needed **if your `target` is `ESNext`** — that is what carries
`lib.esnext.temporal.d.ts`. Under `nodenext` with no `target` set, TypeScript 7.0.2 still reports
`TS2503` against this package. Set `"target": "ESNext"`, as
[the guide's tsconfig](docs/guide.md#type-checking-needs-typescript-7-which-the-runtime-requirement-does-not-imply)
does, or add `"lib": ["ES2024", "ESNext.Temporal"]`. And do **not** install
`temporal-polyfill`, `temporal-spec` or any other typings package to fix it: they are unnecessary
here, and the published `.d.ts` references the global deliberately. `engines` constrains only
`node`; npm has no field for the TypeScript version a package's *types* require, which is why this
lives in prose.

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
  "month": 6,
  "monthCode": "M06",
  "isLeapMonth": false,
  "day": 30,
  "isDoubledDay": false,
  "isLeapDay": false,
  "isFullMoon": false,
  "isNewMoon": true,
  "isoDate": "2026-08-12",
  "dayOfWeek": 3,
  "tibetanWeekday": 4,
  "weekdayName": { "tibetan": "ལྷག་པ", "wylie": "lhag pa", "phonetic": "lhakpa",
                   "planet": "mercury", "element": "water" },
  "lunation": 15094
}
```

### Converting back

```js
import { tibetanToIso } from 'tibetan-calendar-temporal';

tibetanToIso({ year: 2153, month: 6, day: 30 }).toString();   // "2026-08-12"
```

`year` is the **royal-era** number an almanac prints (2153), not the Gregorian year the Tibetan
year began in (2026, exposed as `yearStartsIn`). The two differ by 127.

> **This is the one mistake the library cannot catch for you.** Passing Gregorian 2026 where
> royal-era 2153 is meant returns a well-formed date in **1899** — because 2026 *is* a valid
> royal-era year. No guard can tell the two apart, so nothing throws. If your years come from user
> input or another system, convert explicitly and sanity-check the result:
>
> ```js
> const tibetanYear = gregorianYear + 127;
> const date = tibetanToIso({ year: tibetanYear, month: 6, day: 30 });
> // Or check after the fact, which also catches an off-by-one at a year boundary:
> isoToTibetan(date).yearStartsIn;   // should be the Gregorian year you started from
> ```

### Building a month grid

`monthsFor` gives a year's months in calendar order, and where a leap month sits depends on the
tradition: under `PHUGPA` — the default, and the example below — it sits immediately **before** the
regular month it shares a number with, while `BHUTAN` numbers from the preceding month, so its leap
month **follows** its twin. Reconstructing that ordering yourself is the part most easily got wrong,
which is why `monthsFor` and `datesFor` exist; prefer them to a hand-rolled walk.

**A tradition's months are not the other's renumbered, and the leap pair is not even in the same
place.** Switching config does not just flip the pair around; it changes which lunation is doubled
and renumbers everything after it. For 2151 the thirteen lunations are the same thirteen, but:

```text
PHUGPA  M01 M02 M03 M04 M05 M06L M06 M07 M08  M09  M10 M11 M12
BHUTAN  M01 M02 M03 M04 M05 M06  M07 M08 M08L M09  M10 M11 M12
```

`leapMonthNumberFor(2151)` is **6** under `PHUGPA` and **8** under `BHUTAN`, and Phugpa's `M06L` is
Bhutan's `M06`. So a month identified as `(year, month, isLeapMonth)` under one tradition names a
different month under the other — always pair a stored month with the config it came from.

```js
import { monthsFor, hasLeapMonth, leapMonthNumberFor } from 'tibetan-calendar-temporal';

const months = monthsFor(2151);
months.length;                                 // 13
months.map((m) => m.monthCode).join(' ');
// "M01 M02 M03 M04 M05 M06L M06 M07 M08 M09 M10 M11 M12"

hasLeapMonth(2151);                            // true
leapMonthNumberFor(2151);                         // 6
```

Each month carries its own boundaries, so a grid needs no further conversion to lay out:

`lunation` is also on every `TibetanDate`, carrying the month that date falls in — so a date has a
direct route back to its own month rather than needing a two-key search that is easy to get wrong
across a leap pair.

```js
const month = monthsFor(2153)[0];
month.year;                      // 2153
month.yearName;                  // { element: 'fire', animal: 'horse', gender: 'male' }
month.monthCode;                 // "M01"
month.days;                      // 29
month.firstDay.toString();       // "2026-02-18" — Losar
month.lastDay.toString();        // "2026-03-18"
```

A month identifies itself, so it can be passed on without the year travelling separately:

```js
daysInMonth(month);                       // 29 — a TibetanMonth is accepted directly
tibetanDateExists({ ...month, day: 8 });  // true
```

> **`days` counts calendar days, not date numbers.** Date numbers always run 1–30; the span is 29 or
> 30, because some numbers are skipped and some are carried by two days. So `for (d = 1; d <= days;
> d++)` builds a **wrong** grid.
>
> **Use `datesFor`.** It walks the month and hands back one `TibetanDate` per calendar day, each
> carrying both the number to print and the ISO date it falls on, so there is no walk to get wrong:
>
> ```js
> for (const date of datesFor(month)) {
>   render(date.day, date.isoDate);   // date.day is the number to print — never the loop index
> }
> ```

A grid usually needs cells on either side of the month — the days that finish the previous month and
start the next, so the first row can begin on the right weekday. Those are not this month's days, so
`datesFor` does not produce them: step **ISO** days and convert each one. `isoToTibetan` is total, so
the walk never has to know where the neighbouring month began or whether it was a leap month, and
each result carries the month it belongs to.

```js
let day = month.firstDay.subtract({ days: 3 });

for (let i = 0; i < 3; i++, day = day.add({ days: 1 })) {
  const date = isoToTibetan(day);
  formatTibetanDate(date);   // "2152-M12-28", then "2152-M12-29", then "2152-M12-30"
}
```

Use it only for the cells outside the month: inside it, `datesFor` is what keeps a doubled or
skipped date number right.

`hasLeapMonth`, `leapMonthNumberFor` and `monthsInYear` are closed forms over the year and never touch
lunar arithmetic, so reach for them rather than for `monthsFor(y).length` when the months themselves
are not wanted.

`datesFor` lays out one month's calendar days; combine it with `monthsFor` to build a whole year —
`monthsFor(2153).flatMap((month) => datesFor(month))` gives 354 entries.
[The guide](docs/guide.md#the-cost-of-a-year) records what a year costs to serialise.

**Wrap the callback; do not pass one of these functions to `map` or `flatMap` point-free.**
`flatMap` calls back with `(value, index, array)`, and the second parameter of every function here
that takes a `TraditionConfig` is that config — so the array index lands in the config slot and the
call throws `TCT_INVALID_TRADITION_CONFIG`. TypeScript refuses it outright; JavaScript gets a throw
rather than a wrong calendar. A function whose signature ends at its first parameter survives
point-free use, `yearNameFor` and `rabjungFor` among them; wrapping costs nothing and is never wrong,
so wrap.

### Naming a year

```js
const losar = isoToTibetan(Temporal.PlainDate.from('2026-02-18'));

formatTibetanDate(losar);        // "2153-M01-01"  — Losar, Tibetan New Year
yearNameFor(losar.year);         // { element: 'fire', animal: 'horse', gender: 'male' }
rabjungFor(losar.year);          // { cycle: 17, year: 40, tibetanName: { … } }
```

**Year naming is a lookup, not a field on the date.** Both are closed forms over the year alone —
three modulos, no lunar arithmetic — so they take a year number and never a date. Putting them on
every date would repeat one value across all 354 days of the year, which was more than half of what
a serialised year cost.

`yearNameFor` gives the element–animal name practitioners recognise. `rabjungFor` gives the Indian
60-year cycle, which is a *numbering* rather than a name — and it indexes the year differently, so
the two are kept apart deliberately. See
[docs/architecture.md](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/architecture.md#why-rabjung-is-separate-from-yearname).

### Errors and validation

Two failure kinds, and telling them apart matters because they call for different responses.

**A skipped date is not an error in your code.** It is a fact about the calendar, and the right
response is usually to show the user something rather than to log a bug. It arrives as
`SkippedDayError`, the only error class this package exports.

**Every other failure about your input is a `RangeError`** carrying a machine-readable `code`; the
two that are not about your input are plain `Error`s, listed in the [API section](#errors). Branch on `error.code`,
never on the message text — codes are part of the API and never change; wording is not and may
improve in any release.

```js
tibetanDateExists({ year: 2150, month: 12, day: 29 });   // false — skipped
tibetanDateExists({ year: 2153, month: 13, day: 1 });    // false — no such month
```

`tibetanDateExists` is `false` exactly where `tibetanToIso` throws for a reason about the *date*.
It deliberately still throws on a malformed `TraditionConfig`, because that is a bug in your program
rather than a statement about a date. The full code list is in the [API section](#errors); the
worked `switch` over every code is in [the guide](docs/guide.md#handling-errors).

### Traditions

**v1 ships two calendars in four configurations.** Phugpa (*phug pa*) is the Men-Tsee-Khang
standard and the basis of the almanacs most practitioners use; Bhutanese is the calendar of the
Royal Government of Bhutan. Each ships twice, because each has two defensible parameterisations:

```js
import { PHUGPA, PHUGPA_HENNING, BHUTAN, BHUTAN_HENNING } from 'tibetan-calendar-temporal';

const day = Temporal.PlainDate.from('2025-11-19');

formatTibetanDate(isoToTibetan(day));                   // "2152-M09-30 (leap)"
formatTibetanDate(isoToTibetan(day, PHUGPA_HENNING));   // "2152-M09-29"
```

The two differ in exactly one constant, the lunar anomaly increment `a₂`, and are otherwise
identical — a test asserts that. `PHUGPA` uses `a₂ = 1/28`, the value almanacs use, and is the
right default for nearly everyone. `PHUGPA_HENNING` uses Henning's exact `3781/105840`.
`BHUTAN` and `BHUTAN_HENNING` split the same way. Bhutan also places its leap month *after* the
regular month sharing its number, where every other version places it before, and names its weekdays
one planet ahead of Tibet — both are configuration, not special cases in the arithmetic.

They disagree on about **one day in 4,100 days** — nine days in the twentieth century and eight in
the twenty-first, `2025-11-19` above being one of them. That is a long-run average rather than a
schedule, and the divergences cluster: Janson counts sixteen in the 65 years from 1027, so
back-projection is worse than the headline rate suggests. All three counts are reproduced by the
engine and asserted in `test/computation/conversion.test.ts`. The evidence for the default is in
[docs/decisions/2026-08-12-lunar-anomaly-a2-default.md](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/decisions/2026-08-12-lunar-anomaly-a2-default.md).

**The other real tradition is Tsurphu** (*mtshur phu*), the Karma Kagyu system, and it is **not
shipped**. It is not shipped because nothing here has been validated against a Tsurphu almanac,
and an unvalidated calendar published with this library's authority is exactly the failure this
project exists to avoid — not because the algorithm cannot express it.

It can. Every astronomical constant is injected through a `TraditionConfig` rather than hardcoded,
including the scaling denominator, which is *derived* from the constants rather than fixed — Phugpa
gives 102,317,040 and Tsurphu gives 1,534,755,600. So adding Tsurphu is a new config object, from
Janson's Appendix A.2, and no change to any computation module:

```js
const TSURPHU = { ...PHUGPA, id: 'tsurphu', name: 'Tsurphu', /* …Janson App. A.2 constants… */ };

isoToTibetan(Temporal.PlainDate.from('2026-08-12'), TSURPHU);
```

Configs are validated when first used, so a partial or mistyped one is rejected with the offending
field named rather than failing somewhere inside the arithmetic. Every field is documented where your
editor shows it, on the `TraditionConfig` type in the package's own declarations; the design behind
them is in
[docs/architecture.md](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/architecture.md#core-types). Note that validation checks **shape, not
astronomy** — plausible constants that are wrong will produce a plausible calendar that is wrong,
which is what [docs/testing.md](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/testing.md) exists to catch.

### Observances

Which days an institution marks — the great holy days and the monthly cycle — ship behind a
separate subpath:

```js
import { getObservances, observancesOn, EXAMPLE_OBSERVANCES } from 'tibetan-calendar-temporal/observances';

const duchen = getObservances(
  Temporal.PlainDate.from('2026-01-01'),
  Temporal.PlainDate.from('2026-12-31'),
  EXAMPLE_OBSERVANCES,
).filter((o) => o.rule.tags?.includes('duchen'));

duchen.map((o) => `${o.rule.englishName}: ${o.date.isoDate}`);
// [ "Day of Miracles: 2026-03-03",
//   "Lord Buddha's birth, enlightenment and parinirvana: 2026-05-31",
//   "Lord Buddha's first teaching: 2026-07-18",
//   "Lord Buddha's descent from God Realm of Thirty Three: 2026-11-01" ]
```

Each `Observance` has three fields that are always there — `date`, the `TibetanDate` it falls on and
always a real calendar day; `rule`, the rule that produced it, carrying `id`, `englishName`, and the
`level` and `tags` the config gave it; and `resolution`, how it landed there — and two that appear only
where they apply: `age`, the years since a rule's `ageFromYear`, and `period`, the first and last
calendar days of the whole span a `period` rule's day belongs to. The `rule` is the **same object** the config holds rather than a copy, so for a
config you supplied, mutating it mutates your own rule table; the shipped `EXAMPLE_OBSERVANCES` is deeply frozen.

**`EXAMPLE_OBSERVANCES` ships nineteen rules**, as an example of how to populate a config and not as any
institution's calendar: the four great days (tagged `duchen`), seven persons' days (tagged `anniversary`),
the whole of Saga Dawa, sojong, the fire puja, and the monthly Medicine Buddha, Tara, Heruka, Ḍākinī and
Dharma Protector days. Each rule names a `level` the config declares, so a front end can group what is for
everyone apart from what needs an empowerment, and fourteen carry a verified Tibetan name.
Sojong is a **counted schedule** — each Tibetan year's count starts on the full moon of month 1, and a fortnight
is 14 or 15 days — inferred from one published calendar that states no method; the fire puja is a formula
over the day number and the weekday. Neither is the tradition's own statement of a rule, and
[what each is checked against](docs/why-trust-these-dates.md)
is stated there, with its window.

It is a separate import for a reason. Everything on the root export makes a **falsifiable** claim:
a constant checks against Janson, a date against an almanac, and a disagreement is a bug. Nothing
here does. Which half of a doubled day an observance falls on, and whether it is kept in a leap
month at all, are **conventions**, and the published sources disagree — Janson, following Berzin,
says the first of a doubled pair; FPMT says the second. So the conventions are injected data,
cited in its docblocks and docs, never logic, and a consumer who only wants date conversion never
inherits anyone's.

### Astrological attributes

*What kind of day is this?* — the question an almanac view asks after it has the date. A separate
subpath, so a consumer who only converts dates never loads it.

```ts
import { attributesFor } from "tibetan-calendar-temporal/astrology";

const day = attributesFor(Temporal.PlainDate.from("2026-09-01"));

day.year.power;          // "fire" — 2026 is a Fire Horse year
day.year.life;           // "fire", and body, fortune and spirit each run on their own cycle
day.calendarDay.animal;  // the sunrise-to-sunrise day's animal
day.lunarDay?.animal;    // the lunar day's, which is a different label for the same date
day.yoga.englishName;    // "death" — the least auspicious of the ten
day.yoga.favorable;      // false
```

**A day carries two sets of labels that disagree, and almanacs print both.** The lunar day is the
thirtieth of a lunation; the calendar day runs sunrise to sunrise. On a doubled date the two halves
share `year`, `month` and `lunarDay` and differ in `calendarDay`, and can differ in `yoga` and
`lunarMansion` — that is the calendar, not a bug.

**`month` and `lunarDay` are `null` for the Bhutanese traditions.** Janson tabulates no month-animal
list for that version, so the package refuses rather than handing over Phugpa's answers; the
primitives throw `TCT_ATTRIBUTE_NOT_SOURCED` where the composition reports `null`.

Favorability is FPMT's convention and is in neither Janson nor Henning; `auspiciousness` is a Tibetan
dictionary's four-way grading of the same ten yogas, with its groups read from the order it lists them in. What is validated, over which
years, and against what, is in
[docs/why-trust-these-dates.md](docs/why-trust-these-dates.md).

## API

The complete surface, across all three entry points. Everything is a pure function over plain objects —
same input, same output, no side effects. Wherever a `tradition?` parameter appears below it is a
`TraditionConfig` defaulting to `PHUGPA`, passed last and positionally; a function with a second
choice takes both in an `options?` bag instead, whose tradition key is also `tradition`.
A signature below with neither `tradition?` nor `options?` takes no tradition at all: what it
computes is the same in every shipped tradition.

The type declarations under `dist/` also describe internal modules; the `exports` map refuses a deep
import of them, so what is listed here is the whole of what can be imported.

### `tibetan-calendar-temporal`

#### Conversion

| Export | Signature | Notes |
|---|---|---|
| `isoToTibetan` | `(date: Temporal.PlainDate, tradition?) => TibetanDate` | Total; every calendar day has a Tibetan date |
| `tibetanToIso` | `(input: TibetanDateFields, tradition?) => Temporal.PlainDate` | Throws `SkippedDayError`, or `RangeError` on out-of-range input |
| `tibetanDateExists` | `(input: TibetanDateFields, tradition?) => boolean` | The predicate counterpart. `false` for a skipped date, an out-of-range field or a missing leap month; **throws** for anything else, including a date past the exact range — where the day was never computed, so `false` would be a claim about arithmetic that was refused |
| `losarFor` | `(year: number, tradition?) => TibetanDate` | Tibetan New Year. Not `{ month: 1, day: 1 }` — that throws where day 1 is skipped |

#### Months

`year` here is the royal era, matching `TibetanDate.year` — 2153, not 2026.

The first two compute month boundaries, so they evaluate the calendar and are bounded by the
tradition's exact range. The last three are closed forms over the year alone: no lunar arithmetic,
a handful of integer operations, and exact for any year — including ones where `monthsFor` refuses.

| Export | Signature | Notes |
|---|---|---|
| `monthsFor` | `(year: number, tradition?) => TibetanMonth[]` | The year's months in calendar order, 12 or 13. Tiles Losar to the day before the next Losar, leap month first of its pair |
| `resolveMonth` | `(month: TibetanMonthFields, tradition?) => TibetanMonth` | A month's identity to the month itself. Replaces `addMonths(m, 0)` and the `monthsFor().find()` search, which returns the wrong half of a leap pair when it matches on the number alone |
| `resolveDate` | `(date: TibetanDateFields, tradition?) => TibetanDate` | The same one tier down, replacing `addDays(d, 0)`. Throws `SkippedDayError` if no calendar day carries the date. Two passes, not a lookup |
| `daysInMonth` | `(month: TibetanMonthFields, tradition?) => number` | **Calendar days**, 29 or 30 — not the highest date number, which is always 30. Accepts a `TibetanDate` directly |
| `hasLeapMonth` | `(year: number, tradition?) => boolean` | Whether the year has a thirteenth month. Not called `isLeapYear`: a Tibetan leap year gains a *month*, not a day |
| `leapMonthNumberFor` | `(year: number, tradition?) => number \| undefined` | Which month number is doubled, or `undefined` |
| `monthsInYear` | `(year: number, tradition?) => number` | 12 or 13 |
| `datesFor` | `(month: TibetanMonthFields, tradition?) => TibetanDate[]` | The month's calendar days, labelled — one entry per day, so a doubled number appears twice and a skipped one not at all. Bounded at 29 or 30 |

#### Navigation

Arithmetic happens on the calendar's two **integer coordinate lines** — the Julian day for solar
days, the lunation for months — never on the labels. Labels are partial (a skipped date names no
day) and non-injective (a leap year has two months numbered 6), which is where ambiguity comes
from; in coordinate space a leap month is simply the next lunation.

| Export | Signature | Notes |
|---|---|---|
| `addDays` | `(date: TibetanDateFields, days: number, tradition?) => TibetanDate` | **Solar** days, the unit elapsed-time reckonings use. Total — it can never land on a skipped date, because stepping real days never reaches a label no day carries |
| `daysBetween` | `(from: TibetanDateFields, to: TibetanDateFields, tradition?) => number` | Signed. If both dates came from this package, `a.isoDate.until(b.isoDate)` is the better route; this is for dates you built yourself |
| `addMonths` | `(month: TibetanMonthFields & { day?: never }, months: number, tradition?) => TibetanMonth` | Month in, month out, so **total**. `+1` from a leap month is its twin. A `TibetanDate` does **not** compile — it would discard the day silently; use `addMonthsToDate` |
| `addMonthsToDate` | `(date: TibetanDateFields, months: number, options?) => TibetanDate` | "The same day next month". `options` is `{ overflow?, tradition? }` — the key was `config` until 2026-09-24, and any other key is refused; `overflow` is `"constrain"` (default — fall to the nearest **lower** existing day) or `"reject"` |
| `monthsBetween` | `(from: TibetanMonthFields, to: TibetanMonthFields, tradition?) => number` | Signed, counted in **lunations** — month 5 to month 7 is three in a year that doubles month 6, two otherwise |
| `lunationFromMonth` | `(month: TibetanMonthFields, tradition?) => number` | The month as one sortable integer, for a database or cache key. No consumer-side route: it needs the intercalation index |
| `monthFromLunation` | `(lunation: number, tradition?) => TibetanMonth` | The inverse, for a stored coordinate with no year in hand. Narrower domain than its inverse — it returns boundaries, so it evaluates the calendar |
| `nextFullMoon` | `(date: Temporal.PlainDate \| TibetanDate, tradition?) => TibetanDate` | Strictly after. **Not** `day === 15`: when 15 is skipped the full moon is on the day numbered 14, about one month in forty-five. Takes a *resolved* date, so it chains — a bare `{ year, month, day }` names no calendar and is refused; pass `resolveDate(…)` |
| `nextNewMoon` | `(date: Temporal.PlainDate \| TibetanDate, tradition?) => TibetanDate` | Strictly after. On a doubled 30 it is the **second** of the pair, not the leap day |

These two chain with themselves: the resolved date they return is a date they accept.

```js
let moon = nextFullMoon(Temporal.PlainDate.from('2026-01-01'));
moon = nextFullMoon(moon);   // the one after that — no .isoDate needed
```

This is the only parameter in the package spanning two calendars, so it takes only shapes that say
which one they mean — a `Temporal` instance, or a resolved `TibetanDate`. A bare
`{ year, month, day }` is a genuine value of both this package's Tibetan shape and Temporal's own,
so it names neither and is refused rather than guessed at. Pass `resolveDate({ … })` for a Tibetan
date, or `Temporal.PlainDate.from({ … })` for a Western one.

#### Year names

Closed forms over the year alone — no lunar arithmetic, no config, and exact for any safe integer
year, including ones where `losarFor` must refuse.

| Export | Signature | Notes |
|---|---|---|
| `yearNameFor` | `(year: number) => TibetanYearName` | `{ element, animal, gender }`. Element and gender repeat every ten years, the animal every twelve, the whole name every sixty; plus `elementName`, `genderName` and `animalName` in Tibetan script, Wylie and phonetics — which is why there are no separate lookups for those three |
| `rabjungFor` | `(year: number) => Rabjung` | `{ cycle, year, tibetanName }` — `cycle`/`year` are the sixty-year numbering from 1027 CE, a *numbering* rather than a name (the two cycles sit three apart), and `tibetanName` is the **Tibetan** name at that position. No Sanskrit: the cycle has two Sanskrit name lists disagreeing at five positions, so pairing either with the Tibetan would misname 8% of years — see [docs/how-it-is-calculated.md](docs/how-it-is-calculated.md) |
| `weekdayNameFor` | `(weekday: number, tradition?) => TibetanWeekdayName` | Tibetan name of a weekday. Takes the **Tibetan** numbering, 0 = Saturday. Takes a tradition because Bhutan names its days one planet ahead. `monthNamesFor` takes one too; `yearNameFor` and `rabjungFor` take none |
| `asTibetanWeekday` | `(value: number) => TibetanWeekday` | Validates 0–6 and brands. The way in for a number this package did not produce — parsed JSON, a form field. `weekdayNameFor(date.dayOfWeek)` is a **compile error**: ISO runs 1–7 from Monday, Tibetan 0–6 from Saturday |

A year picker is a loop over these plus `hasLeapMonth`; there is no range function, because building
the list is the consumer's business and nothing about it can go wrong.

```js
const years = [];
for (let y = 2140; y <= 2160; y++) {
  years.push({ year: y, name: yearNameFor(y), rabjung: rabjungFor(y), leap: hasLeapMonth(y) });
}
```

#### Month names

| Export | Signature | Notes |
|---|---|---|
| `monthNamesFor` | `(month: TibetanMonthFields, tradition?) => MonthNames` | The month's lunar-mansion name, its Indian month name (`indianMonth`, Sanskrit: *māgha* for month 1, where the mansion is *maghā*), and its season in **all four** seasonal systems at once — `fourSeasons.month1LateWinter`, `fourSeasons.month1EarlySpring`, `fourSeasons.tigerEarlySpring` and `sixSeasons.month3EarlySpring` — because almanacs print several and no source makes one a tradition's only answer. The same `season` key names different months in different systems. `tigerEarlySpring` is `null` for a tradition without a sourced Tiger month (Bhutan). A leap month takes its regular month's names. See [the guide](docs/guide.md#naming-a-month) for the month-by-month table |

#### Formatting

The two are exact inverses: `formatTibetanDate(parseTibetanDate(s)) === s`. Neither takes a config,
because naming a date needs no calendar.

| Export | Signature | Notes |
|---|---|---|
| `formatTibetanDate` | `(date: TibetanDateFields) => string` | `"2153-M06-30"`, with `L` on a leap month and a trailing `(leap)` on a leap day. A `TibetanDate` is assignable, so pass one straight in |
| `parseTibetanDate` | `(text: string) => TibetanDateFields` | Strict — the canonical form only. Returns the naming fields rather than a resolved date, so a **skipped** date parses rather than throwing; pass it to `tibetanToIso` or `tibetanDateExists` |
| `formatTibetanMonth` | `(month: TibetanMonthFields) => string` | `"2151-M06L"` for a leap month, `"2151-M06"` for its twin. A `TibetanDate` is accepted and its day dropped, as `daysInMonth` also does |
| `parseTibetanMonth` | `(text: string) => TibetanMonthFields` | The inverse, and strict for the same reason. Compose with `resolveMonth` to resolve it |

#### Interoperability

The Julian day number is the interchange representation of calendrical computing — it is how you
convert between any two calendars, and how Janson's paper is written. These are the extension
point, not internals that leaked.

**These are Julian day *numbers*, not Julian *dates*.** The distinction bites when wiring this to
an astronomy library. A Julian Date (JD) is a real number whose integer values fall at **noon UT**,
so JD 2440588.0 is 1970-01-01 12:00. A Julian Day Number (JDN) is the integer naming a whole day.
This package uses JDN only — integers throughout, no fractions, which is the same no-floating-point
rule that makes every result identical across platforms. Passing a fractional JD throws
`TCT_FIELD_OUT_OF_RANGE` rather than silently truncating; floor it, and mind the half-day offset in
whichever direction you are converting.

| Export | Signature | Notes |
|---|---|---|
| `julianDayFromIso` | `(date: Temporal.PlainDate) => number` | Also accepts a `PlainDateTime`, a `ZonedDateTime`, or an ISO string — but not a bare `{ year, month, day }` object, which is ambiguous with this package's own Tibetan-date input. A `PlainDate` from a **second Temporal implementation** is accepted: every date argument on the surface is tested by brand, not by `instanceof`. The calendar must be `iso8601` — convert with `.withCalendar("iso8601")`, which names the same day |
| `isoFromJulianDay` | `(julianDay: number, tradition?) => Temporal.PlainDate` | Takes a tradition because the exact-range bound it enforces belongs to the tradition |
| `tibetanWeekday` | `(julianDay: number) => number` | The Tibetan day of week, `0` = Saturday, one per planet — not the ISO `dayOfWeek` field. Also on every `TibetanDate` as `tibetanWeekday`, which is what to use when you have one |

#### Tradition configs

Two traditions, Phugpa and Bhutanese, each in two parameterisations. See
[Traditions](#traditions) above.

| Export | Notes |
|---|---|
| `PHUGPA` | The default. Lunar anomaly increment `a₂ = 1/28`, as almanacs use |
| `PHUGPA_HENNING` | Identical but for `a₂`, Henning's exact `3781/105840`. Differs on ~1 day in 4,100 days |
| `BHUTAN` | The Bhutanese calendar, with `a₂ = 1/28` as `PHUGPA` has. Its own epoch and constants, so its leap month is usually a different month of the same year, and now and then falls a year apart; it places a leap month after the regular month sharing its number, and names weekdays one planet ahead |
| `BHUTAN_HENNING` | Identical to `BHUTAN` but for `a₂`, as `PHUGPA_HENNING` is to `PHUGPA` |

#### Errors

`SkippedDayError` is the only exported error class, and carries the offending input as
`.requested`. Every failure about your **input** is a `RangeError`; the two that are not about your
input — `TCT_INTERNAL` and `TCT_MISSING_TEMPORAL` — are plain `Error`s, deliberately, as the
at-a-glance signal that the fault is not yours. What actually keeps `tibetanDateExists` from
reporting either as "that date does not exist" is their **absence from its allowlist**, which is one
class and two codes; the type is the weaker, wider claim, and saying the type is the mechanism was
wrong for as long as it stood. Every one of them carries
a `code`, which is what to branch on rather than the type:

| `error.code` | Thrown by | Meaning |
|---|---|---|
| `TCT_SKIPPED_DAY` | `tibetanToIso` | The date is well-formed but no calendar day carries its number. Not a bug in your code — see [Errors and validation](#errors-and-validation) |
| `TCT_FIELD_OUT_OF_RANGE` | every function taking a date, a year or a Julian day | A year, month, day or Julian day is not an integer, or is outside 1–12 / 1–30. The argument was the right kind of thing and one of its numbers was wrong — so this is the one to surface to a user |
| `TCT_INVALID_ARGUMENT` | the same functions, plus `parseTibetanDate`, and `nextObservance` for a `ruleId` that is not a string or names no rule | The argument is the wrong *kind* of thing, so nothing in it is a field out of a range: a `Temporal.PlainDate` where a Tibetan date is expected, a bare `{ year, month, day }` where a Western date is expected, a non-boolean `isLeapMonth`/`isLeapDay`, `null`/`undefined`, a string outside `parseTibetanDate`'s grammar, an options bag that is not an object, cannot be read, or carries a key it does not have, or an element passed to `elementalYoga` that is not one of the four. A bug in the calling code rather than bad data |
| `TCT_NO_SUCH_LEAP_MONTH` | every function taking a Tibetan month's or date's **fields**, except `tibetanDateExists`, which answers `false`, and the two formatters | `isLeapMonth: true` for a month with no leap twin that year |
| `TCT_OUTSIDE_EXACT_RANGE` | any conversion, `getObservances` and `observancesOn` for a range reaching past the end **or a day inside a `period` whose span ends past it**, `nextObservance` for a `from` past the end, and the closed-form year functions `hasLeapMonth`, `leapMonthNumberFor`, `monthsInYear` | Beyond where this tradition's integer arithmetic stays exact. For a conversion, `PHUGPA` and `BHUTAN` are exact from about ISO year −245,737 to 236,312; `PHUGPA_HENNING` and `BHUTAN_HENNING` from about −20,781 to 11,356. Both ranges end inside Temporal's own. A `period` result carries the bounds of its whole span, so a day of a span that ends past the end of the range cannot be answered even though the day is inside it; only the last weeks before the end are reached, and `nextObservance` answers `null` there instead. The three year functions are closed forms with a bound of their own, far wider: `hasLeapMonth(300000)` answers |
| `TCT_INVALID_TRADITION_CONFIG` | any function taking a tradition | The `TraditionConfig` is malformed, or is not one at all — `null`, or a `{ tradition }` bag passed where the config itself belongs. The message names the field |
| `TCT_INVALID_OBSERVANCE_CONFIG` | `getObservances`, `observancesOn`, `nextObservance`, `composeObservances` | The `ObservanceConfig`, one of its rules, levels or `when` forms, or a `composeObservances` layer is malformed — an unknown key, a setting the rule's form does not use, a rule naming a level the config does not declare, or a layer naming an id the base does not have. The message names the field or id |
| `TCT_SPAN_TOO_WIDE` | `getObservances` | `to.year - from.year` is more than 10: the rule is on calendar years, so 2020-01-01 to 2030-12-31 is admitted and 2020-12-31 to 2031-01-01 is not. Chunk it; the function is pure, so concatenating is correct |
| `TCT_ATTRIBUTE_NOT_SOURCED` | `monthAttributesFor`, `lunarDayAttributesFor` | Your input is fine; no source gives this attribute for this tradition. Thrown under `BHUTAN` and `BHUTAN_HENNING`, whose month animals Janson does not tabulate. `attributesFor` reports the same gap as `null` instead |
| `TCT_MISSING_TEMPORAL` | the `import` itself, and any date entry point if the global `Temporal` is deleted afterwards | No `Temporal` in this runtime — see [Requirements](#requirements) |
| `TCT_INTERNAL` | `isoToTibetan`, and the arithmetic primitives beneath it | An invariant the engine proves for itself did not hold. A bug here rather than in your input; please [report it](https://github.com/nyamlen/tibetan-calendar-temporal/issues) |

The codes cover the errors this package throws. An error **your own code** throws while the engine
reads your argument — a getter, or a `Proxy` trap — is yours, and may reach you unchanged, without a
code: reading a `TraditionConfig`, an `ObservanceConfig` or a date's fields does not catch it. A few
argument checks do wrap one, as `TCT_INVALID_ARGUMENT`, where they already guard the read.

Codes are stable and part of the API. Message text is not — match on the code.

#### Types

Type-only exports, erased at runtime: `TibetanDate`, `TibetanDateFields`, `TibetanMonth`,
`TibetanMonthFields`, `TibetanYearName`, `Rabjung`, `TibetanName`, `SanskritName`,
`TibetanWeekdayName`, `TibetanWeekdayElement`, `TibetanWeekday`, `TibetanPlanet`, `TibetanElement`,
`TibetanAnimal`,
`TibetanGender`, `TraditionConfig`, `TraditionNaming`, `TraditionMonthAnimals`, `TraditionNineNumbers`, `MeanMotion`, `Rational`,
`TibetanCalendarErrorCode`, `MonthOverflow`, `AddMonthsToDateOptions`, `MonthNames`,
`FourSeasonMonthName`, `SixSeasonMonthName`.

### `tibetan-calendar-temporal/observances`

A separate subpath, so a consumer who only converts dates never loads it. `config` here is a required
`ObservanceConfig`, and `tradition` is the `TraditionConfig`, defaulting to `PHUGPA`; both are
positional, config first — see [Two kinds of config](docs/guide.md#two-kinds-of-config).

| Export | Signature | Notes |
|---|---|---|
| `getObservances` | `(from: Temporal.PlainDate, to: Temporal.PlainDate, config: ObservanceConfig, tradition?: TraditionConfig) => Observance[]` | Date order, and within a day the order of the rules in the config. Returns `[]` if `to` precedes `from`; throws when `to.year - from.year` is above 10 |
| `observancesOn` | `(date: Temporal.PlainDate, config: ObservanceConfig, tradition?: TraditionConfig) => Observance[]` | The single-day case; results in the order of the config's rules |
| `nextObservance` | `(from: Temporal.PlainDate, ruleId: string, config: ObservanceConfig, tradition?: TraditionConfig) => Observance \| null` | The first occurrence of one rule strictly after `from`. `null` means none within 10 years, or before the end of the computable range, not never |
| `composeObservances` | `(base: ObservanceConfig, layer: ObservanceLayer) => ObservanceConfig` | A base and a layer of differences give a new validated, frozen configuration; the inputs are never changed |
| `EXAMPLE_OBSERVANCES` | | An example config. Its practice days follow FPMT's published calendars, which [what is validated](docs/why-trust-these-dates.md) says how far; its sojong is inferred from Rabten Choeling's schedule, and its Heruka, Ḍākinī and Dharma Protector day names are authored from Cornu's dedications. It claims no lineage |

Type-only exports: `Observance`, `ObservanceConfig`, `ObservanceRule`, `ObservanceWhen`,
`ObservanceLayer`, `ObservanceLevel`, `TibetanMonthDay`, `FormulaName`, `ObservanceResolution`, `DoubledDayChoice`,
`SkippedDayChoice`, `LeapMonthChoice`.

Note that `SkippedDayError` is exported from the **root** only. Nothing in this layer throws it —
a skipped day is handled by the `skippedDay` convention instead.

Full detail: [docs/architecture.md](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/architecture.md).

### `tibetan-calendar-temporal/astrology`

A separate subpath, like `./observances`. `tradition?` is a `TraditionConfig`, defaulting to `PHUGPA`,
passed last and positionally as on the root: `attributesFor(date, BHUTAN)`.

| Export | Signature | Notes |
|---|---|---|
| `attributesFor` | `(date: Temporal.PlainDate \| TibetanDate, tradition?) => DayAttributes` | Everything about one day. `month` and `lunarDay` are `null` where unsourced |
| `yearAttributesFor` | `(year: number) => YearAttributes` | Royal era, and no tradition: closed forms on the year alone |
| `monthAttributesFor` | `(month: TibetanMonthFields, tradition?) => MonthAttributes` | Throws `TCT_ATTRIBUTE_NOT_SOURCED` for the Bhutanese configs |
| `lunarDayAttributesFor` | `(date: TibetanDateFields, tradition?) => LunarDayAttributes` | Tibetan fields in, so a **skipped** lunar day can be asked about. Throws `TCT_ATTRIBUTE_NOT_SOURCED` for the Bhutanese configs |
| `calendarDayAttributesFor` | `(date: Temporal.PlainDate \| TibetanDate) => CalendarDayAttributes` | Congruences on the Julian day; the number differs in Tsurphu calendars, which is not modelled |
| `lunarMansionFor` | `(date: Temporal.PlainDate \| TibetanDate, tradition?) => LunarMansion` | `{ index, tibetanName, sanskritName, element }`, index 0–26 as Janson and Henning number them, and no English name, because no source prints one. Needs the moon's real position; a published almanac sometimes prints the next mansion, late in a mansion — how often is in [why-trust-these-dates.md](docs/why-trust-these-dates.md). |
| `elementalYogaFor` | `(date: Temporal.PlainDate \| TibetanDate, tradition?) => ElementalYoga` | The weekday's element paired with the lunar mansion's |
| `elementalYoga` | `(a: TibetanWeekdayElement, b: TibetanWeekdayElement) => ElementalYoga` | The pair alone, order-insensitive |
| `ELEMENTAL_YOGAS` | | The ten, frozen: Henning's names, FPMT's favorability, and the *tshig mdzod chen mo*'s four-way grading as `auspiciousness` |
| `LUNAR_MANSIONS` | | All 27, frozen, in index order — the table `lunarMansionFor` looks a day up in |

Type-only exports: `DayAttributes`, `YearAttributes`, `MonthAttributes`, `LunarDayAttributes`,
`CalendarDayAttributes`, `ElementalYoga`, `YogaAuspiciousness`, `TibetanTrigram`, `LunarMansion`.

A date argument is a `Temporal.PlainDate` or a resolved `TibetanDate` — never loose
`{ year, month, day }`, which is a value of both calendars and would make the ambiguity silent.
`monthAttributesFor` and `lunarDayAttributesFor` are the exceptions, and the reason is that their
argument is Tibetan-only: there is nothing to disambiguate, and fields are what lets a skipped lunar
day be named at all.

## Internationalisation

**What ships:** the *Tibetan* name of a thing — Tibetan script, Wylie, and THL Simplified Phonetic
Transcription — on `weekdayName`, and on `elementName` / `genderName` / `animalName` under the
`TibetanYearName` that `yearNameFor` returns; and on every member of `monthNamesFor`'s result
except `indianMonth`, which is the Indian month's Sanskrit name and has no Tibetan of its own.

**What deliberately does not ship:** translations into any other language. What ships instead is a
stable key your own i18n layer maps from — `TibetanElement`, `TibetanGender`, `TibetanAnimal` and
`TibetanPlanet` are lowercase identifiers and are **contract**, twenty-six in total.

Western weekday names need nothing from this package: the Tibetan week is the same seven-day cycle,
so `date.isoDate.toLocaleString('fr', { weekday: 'long' })` covers every locale CLDR carries.

Every Tibetan string was verified before it was written down — two independent EWTS implementations
must agree on the script, it must read back as the same Wylie, and Wiktionary must carry an entry at
exactly that title. That check earns its keep: Janson gives Saturday as `spen ma` in his
day-of-week table and `spen pa` in his Bhutan appendix, and this package ships `spen pa`. See
[docs/names/vocabulary.md](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/names/vocabulary.md).

[The guide](docs/guide.md#displaying-tibetan-names) covers the Bhutanese weekday shift, the CLDR
curiosities, and localising observance labels.

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
with any existing implementation — see [CONTRIBUTING.md](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/CONTRIBUTING.md) for the rules that
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

<details>
<summary><strong>Why the name says "Tibetan" when Bhutan and Mongolia have their own calendars</strong></summary>

Because that is how the field describes the family, not because their calendars are treated as
lesser. Svante Janson — whose *Tibetan Calendar Mathematics* this engine is derived from — writes
that "Bhutan and Mongolia also use versions of the Tibetan calendar", opens his Bhutan appendix
"Bhutan uses a version of the Tibetan calendar as an official calendar", and opens his Mongolia
appendix "The Mongolian calendar is a version of the Tibetan."

All of them descend from the Kālacakra कालचक्र system, which is the honest name for the family;
"Tibetan calendar" is the name people search for. Bhutan's is an official state calendar in
Dzongkha with its own eighteenth-century description and its own leap-month and weekday
conventions; Mongolia's carries two national holidays and dates its constitution by the sixty-year
cycle. Neither is a dialect of the other.

Traditions here are **data, not packages** — a variant is a `TraditionConfig`, never a separate
install.

</details>

## Documentation

| | |
|---|---|
| [docs/how-it-is-calculated.md](docs/how-it-is-calculated.md) | **Start here if the calendar is new to you.** What a lunisolar calendar has to solve, leap months, why days are doubled and skipped, and what `a₂` is |
| [docs/guide.md](docs/guide.md) | The long-form companion to this file: the calendar's hard cases, where a day begins, working with the two configs, and running it outside Node 26 |
| [docs/why-trust-these-dates.md](docs/why-trust-these-dates.md) | What has been validated, against what, and over which years — and what has not. Written for a non-programmer |
| [docs/other-implementations.md](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/other-implementations.md) | The other software that computes Tibetan dates, and when to use it instead |
| [docs/architecture.md](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/architecture.md) | Layered model, API design, package structure, core types, tooling |
| [docs/testing.md](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/testing.md) | Three-tier testing strategy and validation sources |
| [docs/validation-sources.md](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/validation-sources.md) | Every source checked against, its **lineage**, what it settles, and what has been tried and rejected |
| [docs/roadmap.md](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/roadmap.md) | Implementation phases and release status |
| [docs/names/rabjung.md](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/names/rabjung.md) | The 60 rabjung year names, with the provenance of every column |
| [docs/decisions/](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/decisions/) | Decision records |
| [CONTRIBUTING.md](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/CONTRIBUTING.md) | Clean-room constraint, dev setup, how to add validation data |

## Licence

MIT — see [LICENSE](LICENSE). Fork it, build on it, ship commercial products with it.
