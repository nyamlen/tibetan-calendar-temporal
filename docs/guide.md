# Guide

The long-form companion to the [README](../README.md).
The README shows what the library does and gives four canonical examples; this covers the parts
that need more than a snippet.

Three sections, and a question belongs to exactly one of them:

- **[Understanding the calendar](#understanding-the-calendar)** — what the arithmetic has to cope
  with, and where a day begins. No API.
- **[Working with the library](#working-with-the-library)** — tasks: reading dates back, choosing
  between the two kinds of config, customising observances.
- **[Running it anywhere](#running-it-anywhere)** — Node versions, polyfills, browsers, and
  displaying Tibetan names.

If a fourth section ever seems necessary, this guide is turning into a second README.

## Understanding the calendar

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

### Where a day begins

Every result labels a **whole proleptic-Gregorian calendar day**. The package models no instants
and picks no time zone, so there is no moment at which a returned date "starts".

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

## Working with the library

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

**`formatTibetanDate` does not encode `isDoubledDay`.** It is an exact inverse of
`parseTibetanDate`, which is a narrower guarantee than "encodes everything about the date": a
doubled day is a fact about a *resolved* date rather than a naming field. Comparing two dates by
their formatted strings will therefore report two calendars as agreeing when one has the date as
the second half of a doubled pair and the other has it as an ordinary day. Compare the flags too.

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
| **Shipped** | `PHUGPA` (default), `PHUGPA_HENNING`, `BHUTAN`, `BHUTAN_HENNING` | `GELUG` (default) |
| **Kind of claim** | **Falsifiable** — checkable against Janson and against an almanac. A disagreement is a bug | **Convention** — published sources legitimately disagree. A difference is a difference, not a bug |
| **Wrong value gives** | A wrong calendar | A different institution's calendar |
| **Position** | Last argument | Before the tradition |

The root export never takes an `ObservanceConfig`, which is the point of the split: a consumer who
only converts dates never inherits anyone's conventions. Both are extended the same way — spread a
shipped default and replace whole fields — and both are validated on first use, so a mistyped value
like `doubledDay: '1st'` is rejected rather than silently falling through to a branch you did not
mean.

### Customising observances

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

## Running it anywhere

### Node, and the failure mode worth knowing in advance

**Node 26 or later**, where `Temporal` is enabled by default. The package does not bundle a
polyfill — that is what keeps it at zero runtime dependencies — so on any older runtime, and in a
browser, you supply one.

The failure mode if you do not is **not** a helpful `TypeError` at the call that needed a date. The
engine touches `Temporal` while the module is evaluating, to build its Unix-epoch anchor, so a
runtime without it fails on `import`, before your code has called anything:

```js
import 'tibetan-calendar-temporal';
// Error: tibetan-calendar-temporal requires the Temporal API, which is not available in this
// runtime. Temporal ships enabled from Node 26; Node 24 has it behind --harmony-temporal. On
// older runtimes or in a browser, import a polyfill before this package:
// `import "temporal-polyfill/global";`
```

That message is a guard the package raises deliberately. Without it you would get a bare
`ReferenceError: Temporal is not defined` naming neither the requirement nor the fix.

### Using a polyfill

Install [`temporal-polyfill`](https://www.npmjs.com/package/temporal-polyfill) and import it once,
before this package, anywhere in your app's entry module:

```js
import 'temporal-polyfill/global';
import { isoToTibetan } from 'tibetan-calendar-temporal';
```

The same applies in a browser. `Temporal` ships in Chrome, Edge and Firefox but not yet in Safari,
so a web application targeting Safari or iOS needs the polyfill regardless of its build target.

`package.json` declares `engines: { "node": ">=26" }`, which npm treats as **advisory**: you get a
warning on install, not a block, so a polyfilled Node 22 or 24 project works fine. The declaration
is there to tell the truth about the default path rather than to lock anyone out. Set
`engine-strict=true` in `.npmrc` if you want it enforced.

### Node 24 has `--harmony-temporal`, and you should not use it here

That flag exposes V8's in-progress implementation, which may not match the shipped specification.
The point of this engine is deterministic dates that are identical everywhere; a date computed
against a moving implementation is not that. Use the polyfill instead.

### Displaying Tibetan names

Every name the engine returns carries three renderings — Tibetan script, Wylie transliteration and
a phonetic form — so a consumer chooses which to display rather than transliterating themselves.

```js
const date = isoToTibetan(Temporal.PlainDate.from('2026-08-12'));
date.weekdayName.tibetan;    // Tibetan script
date.weekdayName.wylie;      // Wylie transliteration
date.weekdayName.phonetic;   // spoken form
```

`weekdayNameFor` is the only naming lookup that takes a tradition config, because Bhutan names its
weekdays one planet ahead of Tibet. A `TibetanDate` produced with a non-default config already
carries the shifted name on its `weekdayName` field — you do not need to look it up again.

**What deliberately does not ship:** translations into any other language. The names are the
calendar's own vocabulary, not user-interface strings, and an application supplying French or
German labels for `kind: 'duchen'` is doing something the package should not guess at. The stable
keys — `element`, `animal`, `kind`, `resolution` — are what a translation table keys on.

---

Contributor-facing documentation lives in the repository rather than in the published package:
[architecture](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/architecture.md),
[testing strategy](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/testing.md),
[traditions](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/traditions.md) and
[how it is calculated](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/how-it-is-calculated.md).
