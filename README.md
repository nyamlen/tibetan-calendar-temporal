# tibetan-calendar-temporal

> ## ⚠️ Placeholder release
>
> **The published package does not work yet.** v0.0.1 exports nothing but a status string. It
> exists to reserve the name while the engine is built.
>
> The API below is implemented and tested — every example in this file is asserted by the test
> suite — but it is **not yet published**. Do not depend on this package until v1.0.0.

A TypeScript library that computes Tibetan calendar dates according to the Phugpa tradition
(Men-Tsee-Khang standard), built on
[Temporal](https://tc39.es/proposal-temporal/docs/).

It converts between Western (ISO) and Tibetan dates, handles leap months and skipped/doubled
days, and determines observances. Open source, MIT licensed, with zero runtime dependencies.

## Contents

- [Design](#design)
- [Requirements](#requirements)
- [Usage](#usage)
  - [Converting a Western date](#converting-a-western-date)
  - [Day of week](#day-of-week)
  - [Converting back](#converting-back)
  - [Building a month grid](#building-a-month-grid)
  - [Reading a date back](#reading-a-date-back)
  - [Three things that make this calendar hard](#three-things-that-make-this-calendar-hard)
  - [Naming a year](#naming-a-year)
  - [Errors and validation](#errors-and-validation)
  - [Traditions](#traditions)
  - [Observances](#observances)
  - [Two kinds of config](#two-kinds-of-config)
- [API](#api)
- [Why this exists](#why-this-exists)
- [Provenance](#provenance)
- [Project identity](#project-identity)
- [Documentation](#documentation)
- [Licence](#licence)

## Design

- **Temporal-native** — `Temporal.PlainDate` throughout, no legacy `Date`
- **Zero runtime dependencies** — Temporal is a language built-in
- **Integer arithmetic only** — deterministic, cross-platform-identical results
- **Tradition-agnostic** — astronomical constants injected via config. v1 ships Phugpa only;
  Tsurphu is addable as data rather than as a code change
- **Pure stateless functions** — memoizable, safe to offload to a worker
- **ESM only**

The engine is usable from 1447, and documented as a back-projection before that.
Day-by-day external agreement with three independent implementations covers 2022–2027 — six
years, a window rather than the whole range; see
[docs/testing.md](docs/testing.md#what-that-does-and-does-not-cover) for what that window does
and does not establish.
Outside it, correctness rests on internal consistency (round-trips, year-length frequencies) and
on Janson's own worked values — the Losar table, 1927–2046 — rather than on external day-by-day
agreement.
**The day boundary.** Every result labels a **whole proleptic-Gregorian calendar day**. The package
models no instants and picks no time zone, so there is no moment at which a returned date "starts".

The calendar's own rule is that a day takes the number of the lunar day running at **daybreak** —
about 5 a.m. Tibetan local mean solar time, which Henning specifies and Janson reports. That offset
is already inside the arithmetic: Janson's `true_date` is a local Julian date whose integer values
fall at mean dawn rather than at noon UT, so the boundary was fixed once when the epoch constants
were chosen and is never re-applied. No sunrise is calculated anywhere, which is one reason the
results are deterministic.

For most uses that is the whole story, because almanacs print one grid and a civil date is what you
want to display. Where it matters is observance: Mahayana precepts and other one-day vows are taken
at daybreak and held until the next, so someone at 2 a.m. is still on the previous Tibetan date. A
consumer who needs that precision applies their own daybreak rule to the returned `isoDate` — the
package will not guess a location for you.

This is **not** the sunset boundary a reader arriving from a Jewish or Islamic calendar library will
expect. Sunset moves with latitude and season and cannot be resolved without a place; daybreak here
is a fixed convention on a fixed meridian, so this calendar is fully determined without one.

## Requirements

```sh
npm install tibetan-calendar-temporal
```

**Node 26 or later**, where `Temporal` is enabled by default. The package does not bundle a
polyfill — that is what keeps it at zero runtime dependencies — so on any older runtime, and in a
browser, you supply one.

The failure mode if you do not is worth knowing in advance, because it is **not** a helpful
`TypeError` at the call that needed a date. The engine touches `Temporal` while the module is
evaluating, to build its Unix-epoch anchor, so a runtime without it fails on `import`, before your
code has called anything:

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
and import it once, before this package, anywhere in your app's entry module:

```js
import 'temporal-polyfill/global';
import { isoToTibetan } from 'tibetan-calendar-temporal';
```

`package.json` declares `engines: { "node": ">=26" }`, which npm treats as **advisory**: you get a
warning on install, not a block, so a polyfilled Node 22 or 24 project works fine. The declaration
is there to tell the truth about the default path rather than to lock anyone out. Set
`engine-strict=true` in `.npmrc` if you want it enforced.

**Node 24 has `--harmony-temporal`, and you should not use it here.** That flag exposes V8's
in-progress implementation, which may not match the shipped specification. The point of this
engine is deterministic dates that are identical everywhere; a date computed against a moving
implementation is not that. Use the polyfill instead.

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
  "isFullMoon": false,
  "isNewMoon": true,
  "isoDate": "2026-08-12",
  "dayOfWeek": 3,
  "tibetanWeekday": 4
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

The Tibetan week is numbered differently — `0` = Saturday through `6` = Friday. It is the same
seven-day cycle, renumbered, and it is kept in a separate field rather than conflated with the ISO
one:

```js
date.tibetanWeekday;   // 4 — Wednesday, in the Tibetan numbering
```

Each day corresponds to one of the seven planets, and the Tibetan name of the day is essentially the
planet's: `0` Saturn (*spen ma*), `1` Sun (*nyi ma*), `2` Moon (*zla ba*), `3` Mars (*mig dmar*),
`4` Mercury (*lhag pa*), `5` Jupiter (*phur bu*), `6` Venus (*pa sangs*). That correspondence
reached Tibet from India and goes back to Roman astrology, which is why it lines up with the Latin
and English names.

It is worth more than display. Janson notes that a date and its weekday are usually given together
because that **resolves the ambiguity when days are repeated** — both halves of a doubled pair carry
the same `day`, and the weekday is what tells them apart.

The same numbering is available from a Julian day, for callers who have one but no `TibetanDate`:

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

`monthsFor` gives a year's months in calendar order, with the leap month sitting immediately before
the regular month it shares a number with. Reconstructing that ordering yourself is the part most
easily got wrong.

```js
import { monthsFor, hasLeapMonth, leapMonthOfYear } from 'tibetan-calendar-temporal';

const months = monthsFor(2151);
months.length;                                 // 13
months.map((m) => m.monthCode).join(' ');
// "M01 M02 M03 M04 M05 M06L M06 M07 M08 M09 M10 M11 M12"

hasLeapMonth(2151);                            // true
leapMonthOfYear(2151);                         // 6
```

Each month carries its own boundaries, so a grid needs no further conversion to lay out:

```js
const month = monthsFor(2153)[0];
month.year;                      // 2153
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

It also carries `lunation`, its position in the unbroken count of lunations since the tradition's
epoch. Every Tibetan month is one lunation and every month counts once, leap months included, so
this rises by exactly one per month and continues across Losar without a gap. That makes it the
month's identity as a **single sortable integer** — useful as a database or cache key, where
`(year, month, isLeapMonth)` cannot serve, because a leap month comes *before* the regular month it
shares a number with and `false` sorts before `true`.

```js
monthsFor(2151).map((m) => m.lunation);
// consecutive integers — M06L is one less than M06, which is the ordering a tuple sort gets wrong
```

> **`days` counts calendar days, not date numbers.** Date numbers always run 1–30; the span is 29 or
> 30, because some numbers are skipped and some are carried by two days. So `for (d = 1; d <= days;
> d++)` builds a **wrong** grid. Walk the calendar days instead — one cell per day, labelled by
> conversion:
>
> ```js
> for (let day = month.firstDay; Temporal.PlainDate.compare(day, month.lastDay) <= 0;
>      day = day.add({ days: 1 })) {
>   const date = isoToTibetan(day);   // date.day is the number to print in the cell
> }
> ```

`hasLeapMonth`, `leapMonthOfYear` and `monthsInYear` are closed forms over the year and never touch
lunar arithmetic, so reach for them rather than for `monthsFor(y).length` when the months themselves
are not wanted.

### Reading a date back

`parseTibetanDate` is the inverse of `formatTibetanDate`, and an exact one.

```js
import { formatTibetanDate, parseTibetanDate, tibetanToIso } from 'tibetan-calendar-temporal';

parseTibetanDate('2153-M12-08');
// { year: 2153, month: 12, day: 8, isLeapMonth: false, isLeapDay: false }

tibetanToIso(parseTibetanDate('2153-M12-08')).toString();   // "2027-01-15"

formatTibetanDate(parseTibetanDate('2152-M09-30 (leap)'));  // "2152-M09-30 (leap)"
```

It returns the fields that *name* a date rather than a resolved one, which is what lets it read a
**skipped** date — a well-formed string that no calendar day carries. Almanacs print such dates, so
a parser that threw on them could not read back a published table.

```js
const skipped = parseTibetanDate('2150-M12-29');   // parses fine
tibetanDateExists(skipped);                        // false
```

The grammar is strict: the canonical form only. `'2153-M12-8'`, `'2153-m12-08'` and the ISO-looking
`'2153-12-08'` are all rejected with `TCT_INVALID_ARGUMENT`.

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
// SkippedDayError: Tibetan date 2150-M12-29 is skipped: no calendar day carries it.
```

**Doubled dates** are carried by two consecutive calendar days. Both report `isDoubledDay: true`;
`isLeapDay` distinguishes the first from the second, and selects between them on the way back.

```js
isoToTibetan(Temporal.PlainDate.from('2025-11-19')).isLeapDay;   // true  — first
isoToTibetan(Temporal.PlainDate.from('2025-11-20')).isLeapDay;   // false — second

tibetanToIso({ year: 2152, month: 9, day: 30, isLeapDay: true });   // 2025-11-19
tibetanToIso({ year: 2152, month: 9, day: 30 });                    // 2025-11-20
```

Which of the two an observance falls on is a convention, not a calculation, and the published
sources disagree. [FPMT's dharma-dates guidance](https://fpmt.org/media/resources/dharma-dates/dates-explained/)
says such days are "usually celebrated on the second day, but may be celebrated on the first day if
it is more convenient"; Janson §11, holidays, following Berzin, gives the opposite rule — the
first, the leap day, the one almanacs mark "Extra". Janson adds that he has not checked those rules
against published calendars.

FPMT published the 2024 Chokhor Duchen as "July 9 or July 10", which is one doubled day, not a
disagreement about the calendar — and its own hedge is why.

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

### Errors and validation

Two failure kinds, and telling them apart matters because they call for different responses.

**A skipped date is not an error in your code.** It is a fact about the calendar, and the right
response is usually to show the user something rather than to log a bug. It arrives as
`SkippedDayError`, the only error class this package exports.

**Everything else is a `RangeError`** carrying a machine-readable `code`. Branch on `error.code`,
never on the message text — codes are part of the API and never change; wording is not and may
improve in any release.

```js
import { tibetanToIso, SkippedDayError } from 'tibetan-calendar-temporal';

try {
  tibetanToIso(fromUserInput);
} catch (error) {
  switch (error.code) {
    case 'TCT_SKIPPED_DAY':
      // error instanceof SkippedDayError, and error.requested is the input you passed
      return `${format(error.requested)} is not a day in this calendar`;
    case 'TCT_FIELD_OUT_OF_RANGE':
      // A number is wrong: month 13, day 31, a year that is not an integer.
    case 'TCT_NO_SUCH_LEAP_MONTH':
      return 'Please check the date';
    case 'TCT_INVALID_ARGUMENT':
      // Not bad data — a bug in the calling code. A Temporal.PlainDate where a Tibetan
      // date belongs, a non-boolean isLeapMonth, null. Do not show this to a user.
      throw error;
    default:
      throw error;
  }
}
```

If you would rather test than catch, `tibetanDateExists` is the predicate, and it is `false`
exactly where `tibetanToIso` throws for a reason about the *date*:

```js
tibetanDateExists({ year: 2150, month: 12, day: 29 });   // false — skipped
tibetanDateExists({ year: 2153, month: 13, day: 1 });    // false — no such month
```

It deliberately still throws on a malformed `TraditionConfig`, because that is a bug in your
program rather than a statement about a date, and answering `false` would hide it.

The full code list is in the [API section](#errors) below.

### Traditions

**v1 ships one tradition: Phugpa** (*phug pa*), the Men-Tsee-Khang standard and the basis of the
almanacs most practitioners use. What it ships *twice* is a parameterisation of that one tradition:

```js
import { PHUGPA, PHUGPA_HENNING } from 'tibetan-calendar-temporal';

const day = Temporal.PlainDate.from('2025-11-19');

formatTibetanDate(isoToTibetan(day));                   // "2152-M09-30 (leap)"
formatTibetanDate(isoToTibetan(day, PHUGPA_HENNING));   // "2152-M09-29"
```

The two differ in exactly one constant, the lunar anomaly increment `a₂`, and are otherwise
identical — a test asserts that. `PHUGPA` uses `a₂ = 1/28`, the value almanacs use, and is the
right default for nearly everyone. `PHUGPA_HENNING` uses Henning's exact `3781/105840`.

They disagree on about **one day in 4,100 days** — nine days in the twentieth century and eight in
the twenty-first, `2025-11-19` above being one of them. That is a long-run average rather than a
schedule, and the divergences cluster: Janson counts sixteen in the 65 years from 1027, so
back-projection is worse than the headline rate suggests. All three counts are reproduced by the
engine and asserted in `test/computation/conversion.test.ts`. The evidence for the default is in
[docs/decisions/2026-08-12-lunar-anomaly-a2-default.md](docs/decisions/2026-08-12-lunar-anomaly-a2-default.md).

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
field named rather than failing somewhere inside the arithmetic. Field-by-field documentation is in
[docs/architecture.md](docs/architecture.md#core-types). Note that validation checks **shape, not
astronomy** — plausible constants that are wrong will produce a plausible calendar that is wrong,
which is what [docs/testing.md](docs/testing.md) exists to catch.

### Observances

Which days an institution marks — the great holy days and the monthly cycle — ship behind a
separate subpath:

```js
import { getObservances, observancesOn, GELUG } from 'tibetan-calendar-temporal/observances';

const duchen = getObservances(
  Temporal.PlainDate.from('2026-01-01'),
  Temporal.PlainDate.from('2026-12-31'),
).filter((o) => o.rule.kind === 'duchen');

duchen.map((o) => `${o.rule.name}: ${o.date.isoDate}`);
// [ "Chotrul Duchen: 2026-03-03", "Saka Dawa Duchen: 2026-05-31",
//   "Chokhor Duchen: 2026-07-18", "Lhabab Duchen: 2026-11-01" ]
```

It is a separate import for a reason. Everything on the root export makes a **falsifiable** claim:
a constant checks against Janson, a date against an almanac, and a disagreement is a bug. Nothing
here does. Which half of a doubled day an observance falls on, and whether it is kept in a leap
month at all, are **conventions**, and the published sources disagree — Janson, following Berzin,
says the first of a doubled pair; FPMT says the second. So the conventions are injected data
carrying a citation, never logic, and a consumer who only wants date conversion never inherits
anyone's.

Institutions differ by spreading the config, the same way `PHUGPA_HENNING` is built from `PHUGPA`:

```js
const kopan = { ...GELUG, id: 'kopan', doubledDay: 'first' };
observancesOn(Temporal.PlainDate.from('2024-07-09'), kopan);
// Chokhor Duchen — where the default GELUG config puts it on 10 July
```

Three convention fields decide what happens when a rule's day is not an ordinary one. Each can be
set on the config as a default and overridden per rule:

| Field | Values | Default in `GELUG` | Decides |
|---|---|---|---|
| `doubledDay` | `'first'` `'second'` `'both'` | `'second'` | Which half of a doubled day carries the observance, or both |
| `skippedDay` | `'preceding'` `'omit'` | `'preceding'` | Whether a skipped day moves to the day before, or vanishes that month |
| `leapMonth` | `'leap'` `'regular'` `'both'` | `'leap'` | Which of two months sharing a number an annual rule falls in |

To add your own days, extend `rules` rather than replacing it:

```js
const myCentre = {
  ...GELUG,
  id: 'my-centre',
  rules: [
    ...GELUG.rules,
    {
      id: 'founder-anniversary',
      name: 'Founder’s anniversary',
      kind: 'anniversary',
      tier: 2,
      when: { month: 4, day: 15 },
      source: 'https://example.org/calendar',
      skippedDay: 'preceding',   // optional; falls back to the config default
    },
  ],
};
```

Every result carries a `resolution` saying how it got there — one of `"exact"`,
`"firstOfDoubled"`, `"secondOfDoubled"` or `"shiftedFromSkipped"` — so a display can show the
almanac's footnote rather than presenting a moved date as an exact one.

Losar is deliberately *not* here: it is a calendar fact rather than a convention, so it is
`losarFor` on the root export. Teacher anniversaries are not shipped either — that data is
institution-specific and changes within a decade — but `kind: 'anniversary'` exists so you can
supply your own, as above.

Calendar export (ICS) is deliberately out of scope: `getObservances` returns plain objects that a
consumer maps to whatever format they need, and an `@nyamlen/icalendar` package remains open if
one is requested.

### Two kinds of config

Both `getObservances` and `observancesOn` take **two** optional configs, and they are unrelated
things that happen to share a word. Getting them the wrong way round is the easiest mistake to
make against this API, so they are contrasted here rather than left to be inferred:

```js
getObservances(from, to, observanceConfig, traditionConfig);
observancesOn(date, observanceConfig, traditionConfig);
```

| | `TraditionConfig` | `ObservanceConfig` |
|---|---|---|
| **Answers** | When is Tibetan day *n*? | Which days does an institution mark? |
| **Contains** | Astronomical constants — mean motions, correction tables, epoch | Rules, each with a source URL, plus three convention defaults |
| **Import from** | `tibetan-calendar-temporal` | `tibetan-calendar-temporal/observances` |
| **Shipped** | `PHUGPA` (default), `PHUGPA_HENNING` | `GELUG` (default) |
| **Kind of claim** | **Falsifiable** — checkable against Janson and against an almanac. A disagreement is a bug | **Convention** — published sources legitimately disagree. A difference is a difference, not a bug |
| **Wrong value gives** | A wrong calendar | A different institution's calendar |
| **Position** | Last argument | Before the tradition |

The root export never takes an `ObservanceConfig`, which is the point of the split: a consumer who
only converts dates never inherits anyone's conventions. Both are extended the same way — spread a
shipped default and replace whole fields — and both are validated on first use, so a mistyped value
like `doubledDay: '1st'` is rejected rather than silently falling through to a branch you did not
mean.

## API

The complete surface, across both entry points. Everything is a pure function over plain objects —
same input, same output, no side effects. Wherever a `config?` parameter appears below it is a
`TraditionConfig` defaulting to `PHUGPA`. Four take none, because naming or renumbering a date needs
no calendar: `formatTibetanDate`, `parseTibetanDate`, `julianDayFromIso` and `tibetanWeekday`.

### `tibetan-calendar-temporal`

#### Conversion

| Export | Signature | Notes |
|---|---|---|
| `isoToTibetan` | `(date: Temporal.PlainDate, config?) => TibetanDate` | Total; every calendar day has a Tibetan date |
| `tibetanToIso` | `(input: TibetanDateFields, config?) => Temporal.PlainDate` | Throws `SkippedDayError`, or `RangeError` on out-of-range input |
| `tibetanDateExists` | `(input: TibetanDateFields, config?) => boolean` | The predicate counterpart. `false` for a skipped date, an out-of-range field or a missing leap month; **throws** for anything else, including a date past the exact range — where the day was never computed, so `false` would be a claim about arithmetic that was refused |
| `losarFor` | `(year: number, config?) => TibetanDate` | Tibetan New Year. Not `{ month: 1, day: 1 }` — that throws where day 1 is skipped |

#### Months

`year` here is the royal era, matching `TibetanDate.year` — 2153, not 2026.

The first two compute month boundaries, so they evaluate the calendar and are bounded by the
tradition's exact range. The last three are closed forms over the year alone: no lunar arithmetic,
a handful of integer operations, and exact for any year — including ones where `monthsFor` refuses.

| Export | Signature | Notes |
|---|---|---|
| `monthsFor` | `(year: number, config?) => TibetanMonth[]` | The year's months in calendar order, 12 or 13. Tiles Losar to the day before the next Losar, leap month first of its pair |
| `daysInMonth` | `(month: TibetanMonthFields, config?) => number` | **Calendar days**, 29 or 30 — not the highest date number, which is always 30. Accepts a `TibetanDate` directly |
| `hasLeapMonth` | `(year: number, config?) => boolean` | Whether the year has a thirteenth month. Not called `isLeapYear`: a Tibetan leap year gains a *month*, not a day |
| `leapMonthOfYear` | `(year: number, config?) => number \| undefined` | Which month number is doubled, or `undefined` |
| `monthsInYear` | `(year: number, config?) => number` | 12 or 13 |

#### Formatting

The two are exact inverses: `formatTibetanDate(parseTibetanDate(s)) === s`. Neither takes a config,
because naming a date needs no calendar.

| Export | Signature | Notes |
|---|---|---|
| `formatTibetanDate` | `(date: TibetanDateFields) => string` | `"2153-M06-30"`, with `L` on a leap month and a trailing `(leap)` on a leap day. A `TibetanDate` is assignable, so pass one straight in |
| `parseTibetanDate` | `(text: string) => TibetanDateFields` | Strict — the canonical form only. Returns the naming fields rather than a resolved date, so a **skipped** date parses rather than throwing; pass it to `tibetanToIso` or `tibetanDateExists` |

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
| `julianDayFromIso` | `(date: Temporal.PlainDate) => number` | Also accepts a `PlainDateTime`, a `ZonedDateTime`, or an ISO string — but not a bare `{ year, month, day }` object, which is ambiguous with this package's own Tibetan-date input |
| `isoFromJulianDay` | `(julianDay: number, config?) => Temporal.PlainDate` | Takes a config because the exact-range bound it enforces belongs to the tradition |
| `tibetanWeekday` | `(julianDay: number) => number` | The Tibetan day of week, `0` = Saturday, one per planet — not the ISO `dayOfWeek` field. Also on every `TibetanDate` as `tibetanWeekday`, which is what to use when you have one |

#### Tradition configs

Two parameterisations of one tradition, Phugpa — not two traditions. See
[Traditions](#traditions) above.

| Export | Notes |
|---|---|
| `PHUGPA` | The default. Lunar anomaly increment `a₂ = 1/28`, as almanacs use |
| `PHUGPA_HENNING` | Identical but for `a₂`, Henning's exact `3781/105840`. Differs on ~1 day in 4,100 days |

#### Errors

`SkippedDayError` is the only exported error class, and carries the offending input as
`.requested`. Every failure about your **input** is a `RangeError`; the two that are not about your
input — `TCT_INTERNAL` and `TCT_MISSING_TEMPORAL` — are plain `Error`s, deliberately, so that
`tibetanDateExists` cannot mistake either for "that date does not exist". Every one of them carries
a `code`, which is what to branch on rather than the type:

| `error.code` | Thrown by | Meaning |
|---|---|---|
| `TCT_SKIPPED_DAY` | `tibetanToIso` | The date is well-formed but no calendar day carries its number. Not a bug in your code — see [Errors and validation](#errors-and-validation) |
| `TCT_FIELD_OUT_OF_RANGE` | every function taking a date, a year or a Julian day | A year, month, day or Julian day is not an integer, or is outside 1–12 / 1–30. The argument was the right kind of thing and one of its numbers was wrong — so this is the one to surface to a user |
| `TCT_INVALID_ARGUMENT` | the same functions, plus `parseTibetanDate` | The argument is the wrong *kind* of thing, so nothing in it is a field out of a range: a `Temporal.PlainDate` where a Tibetan date is expected, a bare `{ year, month, day }` where a Western date is expected, a non-boolean `isLeapMonth`/`isLeapDay`, `null`/`undefined`, or a string outside `parseTibetanDate`'s grammar. A bug in the calling code rather than bad data |
| `TCT_NO_SUCH_LEAP_MONTH` | `tibetanToIso` | `isLeapMonth: true` for a month with no leap twin that year |
| `TCT_OUTSIDE_EXACT_RANGE` | any conversion, and the closed-form year functions `hasLeapMonth`, `leapMonthOfYear`, `monthsInYear` | Beyond where this tradition's integer arithmetic stays exact. `PHUGPA_HENNING` runs out around ISO year 11,356; `PHUGPA` does not, within Temporal's own range |
| `TCT_INVALID_TRADITION_CONFIG` | any function taking a config | The `TraditionConfig` is malformed. The message names the field |
| `TCT_INVALID_OBSERVANCE_CONFIG` | `getObservances`, `observancesOn` | The `ObservanceConfig` or one of its rules is malformed |
| `TCT_SPAN_TOO_WIDE` | `getObservances` | More than 200 years requested at once. Chunk it; the function is pure, so concatenating is correct |
| `TCT_MISSING_TEMPORAL` | the `import` itself | No `Temporal` in this runtime — see [Requirements](#requirements) |
| `TCT_INTERNAL` | `isoToTibetan`, and the arithmetic primitives beneath it | An invariant the engine proves for itself did not hold. A bug here rather than in your input; please [report it](https://github.com/nyamlen/tibetan-calendar-temporal/issues) |

Codes are stable and part of the API. Message text is not — match on the code.

#### Types

Type-only exports, erased at runtime: `TibetanDate`, `TibetanDateFields`, `TibetanMonth`,
`TibetanMonthFields`, `TibetanYearName`, `Rabjung`, `TibetanElement`, `TibetanAnimal`,
`TibetanGender`, `TraditionConfig`, `MeanMotion`, `Rational`, `TibetanCalendarErrorCode`.

### `tibetan-calendar-temporal/observances`

A separate subpath, so a consumer who only converts dates never loads it. `config` here is an
`ObservanceConfig` defaulting to `GELUG`, and `tradition` is the `TraditionConfig` — see
[Two kinds of config](#two-kinds-of-config).

| Export | Signature | Notes |
|---|---|---|
| `getObservances` | `(from: Temporal.PlainDate, to: Temporal.PlainDate, config?, tradition?) => Observance[]` | Date order. Returns `[]` if `to` precedes `from`; throws above a 200-year span |
| `observancesOn` | `(date: Temporal.PlainDate, config?, tradition?) => Observance[]` | The single-day case |
| `GELUG` | | The default config, sourced from FPMT with a URL on every rule |

Type-only exports: `Observance`, `ObservanceConfig`, `ObservanceRule`, `ObservanceKind`,
`ObservanceWhen`, `ObservanceResolution`, `DoubledDayChoice`, `SkippedDayChoice`,
`LeapMonthChoice`.

Note that `SkippedDayError` is exported from the **root** only. Nothing in this layer throws it —
a skipped day is handled by the `skippedDay` convention instead.

Full detail: [docs/architecture.md](docs/architecture.md).

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
| [docs/rabjung-names.md](docs/rabjung-names.md) | The 60 rabjung year names, with the provenance of every column |
| [docs/decisions/](docs/decisions/) | Decision records |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Clean-room constraint, dev setup, how to add validation data |

## Licence

MIT — see [LICENSE](LICENSE). Fork it, build on it, ship commercial products with it.
