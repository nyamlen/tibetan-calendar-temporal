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

### Why `Temporal.PlainDate`, and never `Date`

**Temporal is not an alternative to `Date`; it is its replacement.** It is a finished TC39 proposal
— stage 4, listed among [tc39's finished proposals](https://github.com/tc39/proposals/blob/main/finished-proposals.md)
with an expected publication year of 2027 — and MDN states plainly that it "is designed as a full
replacement for the [`Date`] object". MDN is equally plain about why a replacement was wanted: the
`Date` API "is based on the poorly designed `java.util.Date` class from Java, which was replaced in
the early 2010s; but, because of JavaScript's goal of backward compatibility, `Date` sticks around
in the language". Using Temporal is therefore the ordinary choice for new code, made early rather
than eccentrically; `Date` is the legacy path.

**The disqualifying reason is narrower and decisive.** Among the shortcomings MDN lists for `Date`
is that "you can only work with the Gregorian calendar model". A library whose entire purpose is a
non-Gregorian calendar cannot be built on a type that knows only one calendar. Everything below is
a further reason; that one is on its own sufficient.

**And a `Date` is not a date.** It is a timestamp — a count of milliseconds — and it always
carries a time and a UTC offset whether you wanted them or not. `new Date('2026-02-18')` is parsed
as midnight UTC, so a reader in Los Angeles asking what day that is gets 17 February. The other
Tibetan calendar library for JavaScript is built on `Date`, and its own README warns that passing
date strings this way "can create bugs when run in different timezones".

For most Western calendar work that is an annoyance you route around. Here it is a wrong answer,
and a quiet one, because of what a Tibetan date actually is.

**A Tibetan date labels a whole day.** Its boundary is daybreak, and that offset is already inside
the epoch constants — see [where a day begins](#where-a-day-begins). The engine therefore has
exactly one thing to say about any date: which proleptic-Gregorian calendar day it is. It has no
opinion about instants, and no way to form one, because it never learns a location. A type that
insists on carrying a time forces every caller to invent an answer to a question the calendar does
not ask, and different callers invent different ones.

`Temporal.PlainDate` is that type: a calendar day, no time, no zone. The commonest bug in date
handling cannot be expressed with it.

Three further consequences follow, and each of them is load-bearing rather than incidental:

- **Immutability.** `Date` is mutable, so handing one out means handing out something a caller can
  alter under everybody else. `PlainDate` cannot be modified, which is what lets this library share
  frozen name objects across a whole year of dates rather than copying them.
- **Correct arithmetic.** `date.add({ days: 1 })` means the next calendar day. The `Date` idiom —
  adding 86,400,000 milliseconds — is wrong twice a year in any zone with daylight saving, and the
  failure is a one-day calendar error, which is the only kind that matters here.
- **Zero dependencies.** Temporal is part of the language. Being Temporal-native is precisely what
  lets this package do calendar arithmetic while depending on nothing — a date library would have
  been the one runtime dependency it could not avoid.

**The cost, stated honestly.** Temporal is not yet everywhere. MDN still marks it "not Baseline
because it does not work in some of the most widely-used browsers" — Safari being the one that
matters — so a web application needs the polyfill today, and Node needs version 26 or the same
polyfill. See [running it anywhere](#running-it-anywhere).

That is a real price, and it is the deliberate trade: a dependency you can delete once Safari
ships, in exchange for a class of wrong dates that can never occur. The alternative — building on
`Date` — would have meant a permanent bug surface in return for a temporary convenience, on a
type that cannot represent this calendar anyway.

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

### Printing a date in a terminal

> **Printing it in a terminal.** Use `JSON.stringify(date, null, 2)`, as above. Plain
> `console.log` renders `isoDate` as `PlainDate [Temporal.PlainDate] {}` — Temporal exposes its
> data through prototype getters rather than own properties, and Node's inspector prints only own
> properties. The value is intact; `JSON.stringify` shows it because Temporal implements
> `toJSON()`. This affects every Temporal-native library, not just this one.

### A month as one sortable integer

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

### The Sanskrit beside a year name is not always its translation

`rabjungFor(year).name` carries the Tibetan name of the year and a `sanskrit` field beside it. Those
are **two different lists** of sixty names for the one cycle, not two renderings of one: `sanskrit`
is the Indic saṃvatsara list's name at that position, and at five positions — 16, 17, 18, 20 and 34 —
it is a different name from the one the Tibetan translates. At 34 the Tibetan *kun ldan*, all-endowed,
sits beside शार्वरी *Śārvarī*, "belonging to night".

So `sanskrit.meaning` glosses the Sanskrit name, and is not a translation of the Tibetan one. See
[how-it-is-calculated.md](how-it-is-calculated.md#the-sixty-year-cycle-one-cycle-two-reckonings-two-name-lists)
for what the cycle is and why two lists exist.

### The cost of a year

**A year of dates, serialised, is about 293 KB** (354 days, ordinary year 2153) or **324 KB** for a
thirteen-month leap year like 2151 — measured, not assumed, in `test/serialisation.test.ts`. Every
`TibetanDate` in that array holds a *pointer* to a shared, frozen name object rather than a copy —
there are only seven weekday names, five elements, two genders, twelve animals and sixty rabjung
names in the whole process — so the in-memory cost of a year is those pointer fields, not thousands
of string copies. `JSON.stringify` cannot see that sharing, and expands every pointer to its full
object; the figures above are what a consumer actually pays to persist or transmit a year, not what
the engine holds in memory.

### Handling errors

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

The full code list is in the [API section](../README.md#errors) below.

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
