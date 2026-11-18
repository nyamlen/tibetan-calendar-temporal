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

The skipped number can be the 15th, the full moon's own day. Month 11 of 2153 has no 15th, and its
full moon falls on the day numbered 14, 23 December 2026 — so look a full moon up with
`nextFullMoon`, never with `day === 15`:

```js
tibetanDateExists({ year: 2153, month: 11, day: 15 });                    // false
nextFullMoon(Temporal.PlainDate.from('2026-12-22')).isoDate.toString();   // "2026-12-23"
isoToTibetan(Temporal.PlainDate.from('2026-12-23')).day;                  // 14
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

`isLeapDay: true` on a day that is **not** doubled is ignored rather than refused, so a flag carried
over from the previous result does no harm: `{ month: 6, day: 5, isLeapMonth: true, isLeapDay: true }`
is 11 July 2024, exactly as it is without the flag.

### Two more cases: the year's first day, and the range's edges

**A year can open on day 2.**
Day 1 of the first month is skipped in some years, 1928 among them under `PHUGPA`, so Losar is not `{ month: 1, day: 1 }`, which throws there; ask `losarFor`.
Where the first month is doubled, the traditions differ.
Under `PHUGPA` the leap month comes first of its pair, so Losar falls in it; under `BHUTAN` the leap month follows, and Losar stays in the regular month:

```js
formatTibetanDate(losarFor(2211));           // "2211-M01L-02"
formatTibetanDate(losarFor(2027, BHUTAN));   // "2027-M01-01", with M01L after it
```

**The calculation has edges.**
Each tradition's arithmetic is exact over a long but finite range, and these are its first and last whole months:

| Tradition | First whole month | From | Last whole month | To |
|---|---|---|---|---|
| `PHUGPA` | `-245591-M10` | -245737-10-29 | `236420-M09` | +236311-12-11 |
| `PHUGPA_HENNING` | `-20652-M04` | -020781-08-23 | `11482-M03` | +011356-02-16 |
| `BHUTAN` | `-245591-M10` | -245737-10-29 | `236420-M09` | +236311-12-11 |
| `BHUTAN_HENNING` | `-20652-M04` | -020781-08-23 | `11482-M03` | +011356-02-16 |

The years at the edges are only partly computable: `monthsFor` refuses an edge year as a whole, while `resolveMonth` answers each of its months that lies inside the range.
The exact range itself ends inside a partial month, up to 26 days beyond the table depending on the tradition and the direction.
`getObservances` refuses a span that reaches past it, with `TCT_OUTSIDE_EXACT_RANGE`, rather than trimming it.
So a front end that lets a visitor go that far clamps its span to the table, which is always safe.
Nothing exports these bounds.

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

`getObservances`, `observancesOn` and `nextObservance` take **two** configs, and they are unrelated
things that happen to share a word. Getting them the wrong way round is the easiest mistake to
make against this API, so they are contrasted here rather than left to be inferred:

```js
getObservances(from, to, observanceConfig, traditionConfig);
observancesOn(date, observanceConfig, traditionConfig);
nextObservance(from, ruleId, observanceConfig, traditionConfig);
```

Both are positional. The observance config is **required**: no config is the default, because which
days a practice keeps is a convention and the package does not choose one for you, so a call
without one throws `TCT_INVALID_OBSERVANCE_CONFIG`. The tradition is last and optional, defaulting
to `PHUGPA`. Until 2026-11-11 both travelled in one options bag; passing that bag, or a
`TraditionConfig`, where the config belongs throws the same code, and the message names the function
you called and its own signature.

| | `TraditionConfig` | `ObservanceConfig` |
|---|---|---|
| **Answers** | When is Tibetan day *n*? | Which days does an institution mark? |
| **Contains** | Astronomical constants — mean motions, correction tables, epoch | Rules, the levels that group them, and three convention defaults |
| **Import from** | `tibetan-calendar-temporal` | `tibetan-calendar-temporal/observances` |
| **Shipped** | `PHUGPA` (default), `PHUGPA_HENNING`, `BHUTAN`, `BHUTAN_HENNING` | `EXAMPLE_OBSERVANCES` (an example, never a default) |
| **Kind of claim** | **Falsifiable** — checkable against Janson and against an almanac. A disagreement is a bug | **Convention** — published sources legitimately disagree. A difference is a difference, not a bug |
| **Wrong value gives** | A wrong calendar | A different institution's calendar |
| **Named** | `tradition` — the parameter's name everywhere, and the key in every bag | `config` — the second positional parameter of `observancesOn`, the third of `getObservances` and `nextObservance` |

The root export never takes an `ObservanceConfig`, which is the point of the split: a consumer who
only converts dates never inherits anyone's conventions. A `TraditionConfig` is extended by spreading a
shipped one and replacing whole fields; an `ObservanceConfig` by
[a layer](#a-layer-differences-from-a-base). Both are validated on first use, so a mistyped value
like `doubledDay: '1st'` is rejected rather than silently falling through to a branch you did not
mean. An `ObservanceConfig` is validated **whole**, every rule and every level, and not only the
rules a queried day happens to hit: [loading one from JSON](#a-config-from-a-json-file) uses that.

### What kind of day it is

The root export answers *which* day it is. The `./astrology` subpath answers what the day is **held
to be** — the labels an almanac prints beside the date:

```js
import { attributesFor } from 'tibetan-calendar-temporal/astrology';

const day = attributesFor(Temporal.PlainDate.from('2026-09-01'));

day.year.power;      // 'fire'
day.year.body;       // 'water' — each of the five elements runs on its own cycle
day.year.tibetanNames.body.wylie;  // 'chu' — every block names its labels in Tibetan
day.lunarMansion.index;              // 26 — where the moon is that morning
day.lunarMansion.sanskritName.iast;  // 'revatī'
day.lunarMansion.tibetanName.wylie;  // 'nam gru'
day.lunarMansion.element;            // 'water'
day.yoga?.englishName;       // 'death'
day.yoga?.sanskritName.iast; // 'maraṇa'
day.yoga?.favorable;  // false
day.yoga?.auspiciousness.englishName;  // 'worst'
```

**What `yoga` is.** The day's *elemental yoga*: the pairing of two elements from the Indian set of
four. One is the **weekday's** element — Tuesday is fire. The other is the element of the **lunar
mansion** the moon is in at the start of the day — Revatī, water. The pair is unordered, so there are
ten possible combinations, and each has a name: fire with water is *maraṇa*, "death". *Yoga* here
means a union or combination, as in Monier-Williams' astronomical sense "conjunction, lucky
conjuncture" (p. 856) — not the practice. `englishName`, `tibetanName` and `sanskritName` are the
combination's one name in three languages.

The ten, in the order the package ships them — a pair in either order is the same yoga:

| Pair | `englishName` | Tibetan | Wylie | Phonetic | Sanskrit | Devanāgarī | `favorable` | `auspiciousness` |
|---|---|---|---|---|---|---|---|---|
| earth + earth | accomplishment | དངོས་གྲུབ | dngos grub | ngödrup | siddhi | सिद्धि | yes | good (བཟང་པོ) |
| water + water | nectar | བདུད་རྩི | bdud rtsi | dütsi | amṛta | अमृत | yes | good (བཟང་པོ) |
| earth + water | youth | ལང་ཚོ | lang tsho | langtso | yauvana | यौवन | yes | restorative (གསོ་ཐུབ) |
| fire + fire | increase | འཕེལ་འགྱུར | 'phel 'gyur | peln-gyur | pragati | प्रगति | yes | good (བཟང་པོ) |
| wind + wind | excellence | ཕུན་ཚོགས | phun tshogs | püntsok | saṃpanna | संपन्न | yes | restorative (གསོ་ཐུབ) |
| fire + wind | powerful | སྟོབས་ལྡན | stobs ldan | topden | balayukta | बलयुक्त | yes | restorative (གསོ་ཐུབ) |
| earth + wind | deficiency | མི་འཕྲོད | mi 'phrod | mintrö | alābha | अलाभ | no | bad (ངན) |
| water + wind | opposition | མི་མཐུན | mi mthun | mintün | pratikūla | प्रतिकूल | no | bad (ངན) |
| earth + fire | burning | བསྲེག་པ | bsreg pa | sekpa | dahana | दहन | no | bad (ངན) |
| fire + water | death | འཆི་བ | 'chi ba | chiwa | maraṇa | मरण | no | worst (ཐ་ཆད) |

The English is Henning's translation except *increase* and *opposition*, which replace his *progress*
and *discord* because no dictionary prints those; every English name here is printed word for word
by Monier-Williams, Jäschke or Das — the `englishName` column, that is; the `auspiciousness` names are covered below. Two of the Tibetan spellings correct his, following the
Tibetan dictionaries' own lists of the ten. `favorable` is FPMT's convention, not Henning's or
Janson's.

`auspiciousness` is the grading the *tshig mdzod chen mo*, a Tibetan dictionary, gives in the same entry that lists the ten: three good, three restorative, three bad and one worst.
**It says how many are in each group, not which**, so the groups here are read from the order it lists the yogas in — which is not the order above.
That reading has a rival: the entry lists the four same-element pairs first, so the split between good and restorative could be structural, in which case wind + wind, *excellence*, would be good.
The group names are sourced unevenly.
*good* and *bad* are printed for the Tibetan by Jäschke.
*worst* is Monier-Williams' word for *adhama*, which Das gives as the Sanskrit for *tha chad*; Jäschke's own word is "very bad".
*restorative* is composed, because no dictionary heads *gso thub*: *gso ba* is "to restore", *thub* "to be able".
The grading agrees with `favorable` on all ten, although neither is derived from the other.
The evidence for every cell is in
[names/month-and-yoga-sourcing.md](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/names/month-and-yoga-sourcing.md).

This is **not** the other yoga an almanac prints. Almanacs also give one of 27 *astronomical* yogas,
found from the sum of the sun's and moon's longitudes, with a different list of names; that one is not
computed here. The sun plays no part in the elemental yoga.

**Three things about this layer are worth knowing before you display any of it.**

*A day carries two sets of labels that disagree, and that is the calendar rather than a bug.* The
lunar day is a thirtieth of a lunation; the calendar day runs sunrise to sunrise. So `lunarDay` and
`calendarDay` give different animals for the same date, and an almanac prints both. On a **doubled**
date the two halves share `year`, `month` and `lunarDay` — there is one lunar day — while
`calendarDay` differs, because there are two calendar days. `yoga` and `lunarMansion` can differ
too: the weekday element changes and the moon moves between their mornings, though the two can
still land on the same yoga.

*The sourcing is not uniform, and the package does not pretend otherwise.* The cycles are Janson's,
and so are the trigrams' English words — `'fire'`, `'earth'`, `'iron'`, `'sky'`, `'water'`,
`'mountain'`, `'wood'`, `'wind'` — five of which are also element words, naming a different attribute.
The element each lunar mansion carries and the ten yoga names are **Henning's**, which Janson cites
and does not derive. The mansions' names are the Mahāvyutpatti's, checked against Das, Jäschke and
Monier-Williams, and a mansion has **no English name**, because no source prints one. The names are checked against Tibetan dictionaries, which correct two of his
spellings, and every Sanskrit name but *pragati* is a Monier-Williams headword. Whether a yoga is favorable is **FPMT's** convention and appears in neither of
them; the four-way `auspiciousness` grading is a Tibetan dictionary's, read by list order. What is checked against what, over which years, is in
[why-trust-these-dates.md](why-trust-these-dates.md).

*Two traditions answer and two refuse.* Janson tabulates no month-animal list for the Bhutanese
version, so `month` and `lunarDay` are `null` under `BHUTAN` and `BHUTAN_HENNING` rather than quietly
carrying Phugpa's answers. So is `yoga`: Bhutan shifts the weekday by one day, and no source says what
the yoga's weekday element is then. The mansion, the year and the calendar day still answer.
The primitives throw `TCT_ATTRIBUTE_NOT_SOURCED` where the composition
reports `null`: a specific question with no answer is an error, while "what is known about this day"
is not.

```js
attributesFor(date, BHUTAN).month;  // null
monthAttributesFor({ year: 2153, month: 1 }, BHUTAN);  // throws
```

The tradition is the last argument, passed positionally, exactly as on the root — the tradition is
this layer's only choice, and a function with one choice takes it that way. There is no observance
config here: nothing in this layer is an institution's convention except favorability, which ships
as a table rather than as configuration, because no source disagrees with FPMT about it yet.

### Customising observances

An `ObservanceConfig` is plain data, so it can live in a JSON file: rules, the three convention
defaults below, and optionally the **levels** the rules are grouped under.
Every call names one — there is no default — so write the config argument in every call:

```js
import { getObservances, observancesOn, composeObservances, nextObservance, EXAMPLE_OBSERVANCES }
  from 'tibetan-calendar-temporal/observances';

const day = observancesOn(Temporal.PlainDate.from('2026-03-03'), EXAMPLE_OBSERVANCES);
day.map((o) => o.rule.id);   // [ 'chotrul-duchen', 'sojong', 'fire-puja', 'medicine-buddha' ]
const duchen = day.find((o) => o.rule.tags?.includes('duchen'));
duchen.rule.id;              // 'chotrul-duchen'
duchen.rule.level;           // 'everyone'
```

`tags` is an array of strings, each its own entry, and the engine never acts on one — it is yours to
filter by. Write `rule.tags?.includes('duchen')` rather than splitting a string: a string given where
the array belongs is refused. A rule's `level` names one of the config's `levels`, which the config
declares in display order, so a front end can group a month and give each practice its own switch:

```js
const month = getObservances(
  Temporal.PlainDate.from('2026-03-01'),
  Temporal.PlainDate.from('2026-03-31'),
  EXAMPLE_OBSERVANCES,
);
const hidden = new Set(['dharma-protector-day']);       // a person's per-practice switches
const shown = month.filter((o) => !hidden.has(o.rule.id));
const groups = [
  ...(EXAMPLE_OBSERVANCES.levels ?? []).map((level) => ({
    title: level.englishName,                               // one heading per level
    items: shown.filter((o) => o.rule.level === level.id),
  })),
  { title: 'Other', items: shown.filter((o) => o.rule.level === undefined) },
];
```

A rule's `level` is optional, and so is `levels` on the config.
**A rule with no level belongs to no group**: the engine never acts on a level, so it is only what you
show a rule under, and a loop over the levels alone drops every such rule without a word.
Every rule of `EXAMPLE_OBSERVANCES` has a level, so `Other` is empty above, but a config of your own
may leave some without one, and the last group is what keeps them on the screen.

#### The shape of a config

An `ObservanceConfig` is this much data, and it is a complete one — it can be saved as a JSON file as
it stands:

```json
{
  "id": "my-centre",
  "englishName": "My centre",
  "doubledDay": "second",
  "skippedDay": "preceding",
  "leapMonth": "leap",
  "levels": [{ "id": "everyone", "englishName": "Open to all" }],
  "rules": [
    {
      "id": "tara",
      "englishName": "Tara puja",
      "level": "everyone",
      "tags": ["puja"],
      "when": { "type": "monthly", "days": [8] }
    },
    {
      "id": "open-day",
      "englishName": "Open day",
      "when": { "type": "western", "month": 3, "day": 21 }
    }
  ]
}
```

| Field of the config | Required | |
|---|---|---|
| `id`, `englishName` | yes | A stable identifier and an English name |
| `doubledDay`, `skippedDay`, `leapMonth` | yes | [The three conventions](#the-three-conventions), the defaults for every rule |
| `rules` | yes | The rules, in the order a day's list should open with: results come back in date order and, within one day, in the order of the rules |
| `levels` | no | The groups rules may name; a rule naming one that is not declared is refused |
| `tibetanName` | no | A `TibetanName`, as everywhere else |

| Field of a rule | Required | |
|---|---|---|
| `id`, `englishName`, `when` | yes | `id` is unique within the config; `when` is one of six forms, below |
| `level` | no | The `id` of one of the config's `levels`; a rule without one belongs to no group |
| `tags` | no | An array of distinct, non-empty strings the engine never acts on |
| `doubledDay`, `skippedDay`, `leapMonth` | no | This rule's own value in place of the config's default |
| `tibetanName` | no | A `TibetanName` |

A key that is not in these tables is refused by name rather than ignored.
A rule's `when` is `monthly` (`days`), `annual` (`dates`, with optional `fromYear`, `untilYear` and
`ageFromYear`), `western` (`month`, `day` and the same three optional fields), `period` (`first`,
`last`), `formula` (`formula`) or `counted` (`anchor`, `waxingDays`, `waningDays`, optional `exclude`);
the examples in this section use the first three.

A `period` in a year with a leap month runs *between* its two endpoints, and `leapMonth` chooses which
month of that number each endpoint means.
In Tibetan 2143, which has leap month 4, a period from 4/1 to 4/30 covers 29 days under `'regular'`, 30
under `'leap'` and 59 under `'both'`; a period from 4/28 to 5/5 covers 8, 37 and 37 days, because under
`'leap'` it starts on leap 4/28 and has to cross all of regular month 4 to reach 5/5.
A whole month, such as Saga Dawa, is what the three values say; a part of a month is a choice to make
deliberately.

#### A config from a JSON file

A config read from a file is `unknown` to TypeScript, and the package exports no function that checks
one — the check is the first query.
It is not a lazy one: **the whole config is validated, every rule and every level, on the first call
that receives it**, so a misspelt `level` on a rule that does not occur on the day you asked about is
refused all the same, with `TCT_INVALID_OBSERVANCE_CONFIG`.
Ask one question of a config you did not write, inside a `try`, and you have loaded it:

```ts
import { readFileSync } from 'node:fs';
import { observancesOn, type ObservanceConfig } from 'tibetan-calendar-temporal/observances';

function loadConfig(path: string): ObservanceConfig {
  const config = JSON.parse(readFileSync(path, 'utf8')) as ObservanceConfig;   // nothing has checked it yet
  try {
    observancesOn(Temporal.PlainDate.from('2026-01-01'), config);               // validates all of it
  } catch (error) {
    if ((error as { code?: string }).code === 'TCT_INVALID_OBSERVANCE_CONFIG') {
      throw new Error(`${path} is not a usable observance config: ${(error as Error).message}`);
    }
    throw error;
  }
  return config;
}
```

A config is checked **once per object**, and the package keeps a private frozen copy of what it
checked: a later edit in place is ignored, and every answer stays that of the config as first
checked. Build a new object rather than changing a loaded one.
The package does not freeze the object it was handed, and the config that
[`composeObservances`](#a-layer-differences-from-a-base) returns is a new, frozen one.

#### The rules the example ships

`EXAMPLE_OBSERVANCES` holds these nineteen rules, in this order.
The ids are what a layer's `remove`, `replace` and `conventions` take, and *own settings* are the conventions a rule carries itself, which the config's defaults do not reach.

| id | English name | form | level | tags | own settings |
|---|---|---|---|---|---|
| `chotrul-duchen` | Day of Miracles | `annual` | `everyone` | `duchen`, `merit-multiplying` |  |
| `saga-dawa-duchen` | Lord Buddha's birth, enlightenment and parinirvana | `annual` | `everyone` | `duchen`, `merit-multiplying` |  |
| `chokhor-duchen` | Lord Buddha's first teaching | `annual` | `everyone` | `duchen`, `merit-multiplying` |  |
| `lhabab-duchen` | Lord Buddha's descent from God Realm of Thirty Three | `annual` | `everyone` | `duchen`, `merit-multiplying` |  |
| `milarepa` | Milarepa | `annual` | `everyone` | `anniversary` |  |
| `guru-rinpoche` | Guru Rinpoche | `annual` | `everyone` | `anniversary` |  |
| `gampopa` | Gampopa | `annual` | `everyone` | `anniversary` |  |
| `karmapa-16` | Sixteenth Karmapa | `annual` | `everyone` | `anniversary` |  |
| `tsongkhapa` | Lama Tsong Khapa | `annual` | `everyone` | `anniversary` |  |
| `sakya-pandita` | Sakya Pandita | `annual` | `everyone` | `anniversary` |  |
| `dudjom-rinpoche` | Dudjom Rinpoche | `annual` | `everyone` | `anniversary` |  |
| `saga-dawa-month` | Saga Dawa, Lord Buddha's month | `period` | `everyone` | `merit-multiplying` |  |
| `sojong` | Sojong (vow renewal) | `counted` | `no-empowerment` | `practice` | `doubledDay: first`, `skippedDay: following` |
| `fire-puja` | Fire puja | `formula` | `no-empowerment` | `from-restricted-practice`, `practice` |  |
| `medicine-buddha` | Medicine Buddha puja | `monthly` | `no-empowerment` | `practice` | `doubledDay: both`, `skippedDay: omit` |
| `tara` | Tara puja | `monthly` | `no-empowerment` | `practice` | `doubledDay: both`, `skippedDay: omit` |
| `heruka-day` | Heruka Day | `monthly` | `no-empowerment` | `tsok`, `practice` | `doubledDay: both`, `skippedDay: omit` |
| `dakini-day` | Ḍākinī Day | `monthly` | `no-empowerment` | `tsok`, `practice` | `doubledDay: both`, `skippedDay: omit` |
| `dharma-protector-day` | Dharma Protector Day | `monthly` | `empowerment` | `tsok`, `practice` | `doubledDay: both`, `skippedDay: omit` |

#### A layer: differences from a base

A centre that differs from another writes only what differs, as a **layer**, and combines it with the
base using `composeObservances`.
**A layer always states its own `id` and `englishName`**, which name the result and are never read
from the base: without them `composeObservances` throws `TCT_INVALID_OBSERVANCE_CONFIG`.
Kopan keeps the example's rules and moves the doubled day of every rule that does not set its own to
its first half:

```js
const kopan = composeObservances(EXAMPLE_OBSERVANCES, {
  id: 'kopan',
  englishName: 'Kopan',
  doubledDay: 'first',
});
observancesOn(Temporal.PlainDate.from('2024-07-09'), kopan);
// Chokhor Duchen, 'firstOfDoubled' — where the shipped example puts it on 10 July
```

**A default reaches only the rules that do not set their own value.**
In `EXAMPLE_OBSERVANCES` six rules do: `sojong` carries `doubledDay: 'first'` and
`skippedDay: 'following'`, and `medicine-buddha`, `tara`, `heruka-day`, `dakini-day` and
`dharma-protector-day` carry `doubledDay: 'both'` and `skippedDay: 'omit'`.
Kopan's layer above therefore moves the annual days, Chokhor Duchen among them, and leaves those six
as they were: on 15 and 16 May 2024, a doubled eighth, `tara` still falls on both days.

To change a rule that carries its own value, name it in **`conventions`** with the convention to change.
The rule keeps its place and every other field of the base's, so it still follows later corrections to the example:

```js
const taraFirstHalf = composeObservances(EXAMPLE_OBSERVANCES, {
  id: 'tara-first-half',
  englishName: 'Tara on the first half of a doubled day',
  conventions: [{ id: 'tara', doubledDay: 'first' }],
});
// 15 May 2024: 'firstOfDoubled'. 16 May 2024: no tara.
```

A `conventions` entry takes `id` and at least one of `doubledDay`, `skippedDay` and `leapMonth`, and nothing else.
To change anything other than those three, use `replace`, which takes complete rules, not a set of changed fields: spread the base rule and override what differs.

A layer can also remove, replace and add rules and levels, each by `id` (`remove`, `replace` and `add` for rules, `removeLevels`, `replaceLevels` and `addLevels` for levels), and they are changed in that order: removed, then replaced (a replacement keeps the position of what it replaces), then added at the end; a `conventions` entry changes its rule in place.
That is also the order of same-day results.
An `id` may appear **once** in a layer's rule lists (`remove`, `replace`, `add` and `conventions`), and once in its level lists, so a rule is never removed and added back to land at the end — `replace` is how to change a rule and keep its place.
A name the base does not have in `remove`, `replace` or `conventions`, or one it does have in `add`, is refused, as is a key the layer does not have: a misspelt `doubleDay` throws `TCT_INVALID_OBSERVANCE_CONFIG` naming it rather than doing nothing.

```js
const myCentre = composeObservances(EXAMPLE_OBSERVANCES, {
  id: 'my-centre',
  englishName: 'My centre',
  replaceLevels: [{ id: 'everyone', englishName: 'Open to all' }],   // renamed, same id
  addLevels: [{ id: 'centre', englishName: 'Our centre' }],
  remove: ['fire-puja'],
  add: [
    {
      id: 'founder-birthday',
      englishName: 'Founder’s birthday',
      level: 'centre',
      when: { type: 'western', month: 7, day: 6, ageFromYear: 1950 },
    },
    {
      id: 'founding-day',
      englishName: 'Founding day',
      level: 'centre',
      when: { type: 'annual', dates: [{ month: 4, day: 15 }], ageFromYear: 2113 },
      skippedDay: 'following',   // optional; falls back to the config default
    },
  ],
});
```

The result is a new, validated, deeply frozen config; the base and the layer are left as they were.

#### Which calendar a year counts

`fromYear`, `untilYear` and `ageFromYear` count the **calendar of their own form**: Western years on
`western`, Tibetan years on `annual`. Tibetan years are numbered as `TibetanDate.year` is — 2153 is the
year that begins on 2026-02-18 — so they run about 127 ahead of the Western ones.
The founder's birthday above is a Western date, born in 1950, so on 6 July 2026 it reports `age: 76`.
The founding day is on a Tibetan date, so its `ageFromYear` is a Tibetan year: `2113` gives `age: 40`
for 2026's, which falls in Tibetan year 2153. Give it `1950`, a Western year, and the age comes out as
203, with no error — a number plausible only to someone who knows which calendar it counts.
An annual date is counted in the Tibetan year it stands for, not the year of the day it lands on:
where `skippedDay` shifts a skipped 1/1 back onto the last day of the year before, that day still
counts as the new year's, in the window and in the age.

```js
const birthday = observancesOn(Temporal.PlainDate.from('2026-07-06'), myCentre)
  .find((o) => o.rule.id === 'founder-birthday');
birthday.age;   // 76
```

#### The three conventions

Three convention fields decide what happens when a rule's day is not an ordinary one.
Each can be set on the config as a default and overridden per rule, and each is used only by the
forms it makes sense for — a value a rule's form does not use is refused, so a setting never looks
effective while doing nothing:

| Field | Values | Value in `EXAMPLE_OBSERVANCES` | Decides |
|---|---|---|---|
| `doubledDay` | `'first'` `'second'` `'both'` | `'second'` | Which half of a doubled day carries the observance, or both |
| `skippedDay` | `'preceding'` `'following'` `'omit'` | `'preceding'` | Whether a skipped day moves to the day before, the day after, or vanishes that month. `'omit'` is refused on a `counted` rule |
| `leapMonth` | `'leap'` `'regular'` `'both'` | `'leap'` | Which of two months sharing a number an annual rule falls in |

Every result carries a `resolution` saying how it got there — one of `"exact"`,
`"firstOfDoubled"`, `"secondOfDoubled"`, `"dayBeforeSkipped"`, `"dayAfterSkipped"`, `"inPeriod"` or
`"counted"` — so a display can show the almanac's footnote rather than presenting a moved date as an
exact one. The list is **open**: a later release may add a value, so a table of labels keyed on
`resolution` needs a fallback for one it does not know.

#### Reading a config that is not yours

A rule's `when` has a `type`, and the set of types is **open**: a later release may add one, so a
consumer that *reads* a config and switches on `type` handles an unknown value with a `default`
branch.
The same holds for `formula` names.

```ts
import { EXAMPLE_OBSERVANCES, type ObservanceWhen } from 'tibetan-calendar-temporal/observances';

function describeWhen(when: ObservanceWhen): string {
  switch (when.type) {
    case 'monthly': return `days ${when.days.join(', ')} of every month`;
    case 'annual': return 'once a year, on a Tibetan date';
    case 'period': return 'every day of a stretch';
    case 'western': return 'once a year, on a Western date';
    case 'formula': return 'on the days a formula selects';
    case 'counted': return 'on a count from an anchor';
    default: return `a form this release does not know: ${String((when as { type?: unknown }).type)}`;
  }
}
describeWhen(EXAMPLE_OBSERVANCES.rules.find((r) => r.id === 'tara')!.when);   // 'days 8 of every month'
```

Once all six forms have a `case`, TypeScript narrows `when` to `never` in the `default` branch, and
`when.type` there is the error `Property 'type' does not exist on type 'never'`: read it through a
cast, as above, which is also what a form from a later release looks like at run time.

**Handling an unknown form is only half of it, because the library will not query one.**
A config with a rule whose `when.type` this release does not know is refused **as a whole**, its valid
rules included, with `TCT_INVALID_OBSERVANCE_CONFIG`; the message says so.
A consumer that must read configs written for a newer release removes the rules it does not
understand before it queries:

```js
const known = ['monthly', 'annual', 'period', 'western', 'formula', 'counted'];
const usable = { ...config, rules: config.rules.filter((r) => known.includes(r.when?.type)) };
```

`usable` is a new object, so it is validated afresh; a rule with an unknown `formula` name is
refused the same way and wants the same treatment.

`nextObservance(from, ruleId, config)` finds the first occurrence of one rule strictly after a day, and
chaining it walks a rule through a year, such as sojong.
**Which year** is a choice the loop makes in its stopping test, and the two give different counts.
A Western year stops on `isoDate.year`:

```js
const found = [];
let next = nextObservance(Temporal.PlainDate.from('2025-12-31'), 'sojong', EXAMPLE_OBSERVANCES);
while (next !== null && next.date.isoDate.year === 2026) {
  found.push(next);
  next = nextObservance(next.date.isoDate, 'sojong', EXAMPLE_OBSERVANCES);
}
found.length;   // 25 — 3 January to 23 December 2026
```

A Tibetan year stops on `date.year`, and starts from the day before its Losar:

```js
const tibetan = [];
const start = losarFor(2153).isoDate.subtract({ days: 1 });   // `losarFor` is on the root export
let following = nextObservance(start, 'sojong', EXAMPLE_OBSERVANCES);
while (following !== null && following.date.year === 2153) {
  tibetan.push(following);
  following = nextObservance(following.date.isoDate, 'sojong', EXAMPLE_OBSERVANCES);
}
tibetan.length;   // 24 — 3 March 2026 to 5 February 2027
```

Either way the loop makes one call more than it keeps, because it stops on the first result outside
the year; `null` is never the end of a year, only of ten.

It answers `null` when nothing lies within ten years after `from`, which is also the widest range
`getObservances` accepts in one call; a wider table is requested in chunks and concatenated.
The rule is on calendar years, `to.year - from.year` at most 10, and not on elapsed time:
`getObservances` accepts 2020-01-01 to 2030-12-31 and refuses 2020-12-31 to 2031-01-01.

A `period` result carries the bounds of its whole span.
Where a span ends past the end of the tradition's exact range, the last weeks before the end, a day
inside it cannot be answered: `getObservances` and `observancesOn` throw `TCT_OUTSIDE_EXACT_RANGE` for
it, and `nextObservance` answers `null`.

Losar is deliberately *not* here: it is a calendar fact rather than a convention, so it is
`losarFor` on the root export. The shipped anniversaries are seven persons' days on Tibetan dates;
a Western-dated birthday, or a centre's own founder, is a rule of your own, as above.

Calendar export (ICS) is deliberately out of scope: `getObservances` returns plain objects that a
consumer maps to whatever format they need.

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
planet's: `0` Saturn (*spen pa*), `1` Sun (*nyi ma*), `2` Moon (*zla ba*), `3` Mars (*mig dmar*),
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

**A `lunation` is only meaningful beside the config that produced it.** The count runs from *that
tradition's* epoch, and the four shipped configs do not share one: month 1 of 2151 is lunation
`15064` under `PHUGPA` and `3337` under `BHUTAN`. So if you store the integer as a key — which is
what it is for — store the tradition with it, exactly as you would store a currency beside an
amount. A column holding the bare integer is ambiguous in any application that offers more than
one tradition, and this package ships four.

### Naming a month

A Tibetan month has more than one name, and an almanac often prints several.
`monthNamesFor` returns all of them at once: the lunar mansion the month is named for, the Indian month's Sanskrit name, and the month's place in each of four seasonal systems.

```js
const names = monthNamesFor({ year: 2153, month: 1 });

names.mansion.tibetanName.wylie;                        // "mchu"
names.mansion.sanskritName.iast;                        // "maghā" — the mansion
names.indianMonth.sanskritName.iast;                    // "māgha" — the month named for it
names.fourSeasons.month1EarlySpring.season;             // "spring"
names.fourSeasons.month1EarlySpring.tibetanName.wylie;  // "dpyid zla ra ba"
names.sixSeasons.month3EarlySpring.sanskritName.iast;   // "śiśira"
```

**Choose a system; the package does not choose one for you.**
The seasonal names have been matched to the months in several ways, the sources disagree about which one a tradition uses, and so there is no default.
Each system is named for the rule that defines it:

| Month | `mansion` | Tibetan | Phonetic | Sanskrit | `indianMonth` | `month1LateWinter` | `month1EarlySpring` | `tigerEarlySpring`, Phugpa | `sixSeasons.month3EarlySpring` |
|---|---|---|---|---|---|---|---|---|---|
| 1 | mchu | མཆུ | chu | *maghā* | *māgha* | late winter | early spring | late spring | early dewy |
| 2 | dbo | དབོ | wo | *uttaraphalgunī* | *phālguna* | early spring | middle spring | early summer | late dewy |
| 3 | nag pa | ནག་པ | nakpa | *citrā* | *caitra* | middle spring | late spring | middle summer | early spring |
| 4 | sa ga | ས་ག | saga | *viśākhā* | *vaiśākha* | late spring | early summer | late summer | late spring |
| 5 | snron | སྣྲོན | nön | *jyeṣṭhā* | *jyeṣṭha* | early summer | middle summer | early autumn | early summer |
| 6 | chu stod | ཆུ་སྟོད | chutö | *pūrvāṣāḍhā* | *āṣāḍha* | middle summer | late summer | middle autumn | late summer |
| 7 | gro bzhin | གྲོ་བཞིན | drozhin | *śravaṇā* | *śrāvaṇa* | late summer | early autumn | late autumn | early rains |
| 8 | khrums | ཁྲུམས | trum | *bhadrapadā* | *bhādrapada* | early autumn | middle autumn | early winter | late rains |
| 9 | tha skar | ཐ་སྐར | takar | *aśvinī* | *āśvina* | middle autumn | late autumn | middle winter | early autumn |
| 10 | smin drug | སྨིན་དྲུག | mindruk | *kṛttikā* | *kārttika* | late autumn | early winter | late winter | late autumn |
| 11 | mgo | མགོ | go | *mṛgaśiras* | *mārgaśīrṣa* | early winter | middle winter | early spring | early cold |
| 12 | rgyal | རྒྱལ | gyel | *puṣya* | *pauṣa* | middle winter | late winter | middle spring | late cold |

Three things that table makes easy to get wrong:

- **The same key names different months in different systems.** `spring` is months 2–4 under `month1LateWinter`, 1–3 under `month1EarlySpring`, and 3–4 under `sixSeasons`. A `season` is only meaningful together with the system it came from.
- **`tigerEarlySpring` depends on the tradition**, because it counts from the Tiger month: Phugpa's is month 11, Tsurphu's month 1. It is `null` under `BHUTAN`, whose Tiger month no independent source gives. The column above is Phugpa's.
- **The six-season Tibetan is the season's name, not the month's**, and can read against the key: month 1 is `{ season: "dewy", part: "early" }`, and its Tibetan *dgun smad* means "late winter", because *dewy* (śiśira) is the later half of the Tibetan winter.

A leap month takes the names of the regular month sharing its number, in every system.
The mansion names are printed bare — *mchu*, not *mchu zla ba* — as every source prints them, which makes some of them ordinary words too: *mchu* is also "lip".
The Sanskrit column is the **mansion's** name and not the Indian month's: month 1 is *maghā*, and the month named after that mansion is *māgha*.
Sanskrit has two words where Tibetan has one, so `mansion` holds the one its Tibetan renders and `indianMonth` holds the other.
`indianMonth` has no Tibetan of its own, because Tibetan calls the month by its mansion.
Its names are the ones Monier-Williams defines each month by, except month 5: he defines *jyaiṣṭha*, and it ships as *jyeṣṭha*, the form the Kālacakra's own commentary, the Vimalaprabhā, prints.
Month 8 is the exception that proves the rule — *khrums* names mansions 24 and 25 together, so it carries the pair's own name *bhadrapadā*, which drops *pūrva* and *uttara* exactly as *khrums* drops *stod* and *smad*.
There is no mansion index here, though a day's `lunarMansion` has one: a day is in exactly one mansion, while a month can be named for two.
The sources and the variants not chosen are in [names/month-and-yoga-sourcing.md](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/names/month-and-yoga-sourcing.md).

### The year name you may know in Sanskrit is not shipped, and that is deliberate

`rabjungFor(year).tibetanName` carries the Tibetan name of the year — script, Wylie and phonetics — and
nothing else. If you were expecting *Prabhava* or *Parābhava* beside it, here is why they are absent.

There are **two different lists** of sixty Sanskrit names for the one cycle, not two renderings of
one. At five positions — 16, 17, 18, 20 and 34 — they carry different names, and the Tibetan follows
the second list every time. At 34 the Tibetan *kun ldan*, all-endowed, renders *sarvapati*, while the
Indic saṃvatsara list has शार्वरी *Śārvarī*, "belonging to night". A type that put one list beside the
Tibetan name would therefore be naming something the Tibetan does not render, on 8% of years, with
nothing about the output looking wrong.

Both lists are tabulated in full, with a verdict for every divergent row, in
[names/rabjung.md](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/names/rabjung.md).
See [how-it-is-calculated.md](how-it-is-calculated.md#the-sixty-year-cycle-one-cycle-two-reckonings-two-name-lists)
for what the cycle is and why two lists exist.

### The obstacle year, and counting twelve from birth

*Lokek* (ལོ་སྐེག) is the obstacle year, the custom of treating the year whose animal matches the year of one's birth as a hazardous one.
Berzin's glossary on studybuddhism.com lists the term as "lo-kag | obstacle year".
Men-Tsee-Khang, in [The special amulet for obstacle years](https://mentseekhang.org/amulets/), gives the ages:

> obstacle years of 13, 25, 37, 49, 61, 73, 85 etc according to the Tibetan calendar.
> Obstacle years are nothing but when individual's birth year sign matches the year sign of the present year.

The package does not ship the custom, because it is a practice and not a computation, but the arithmetic is two calls to `yearNameFor`.
The ages are in the Tibetan count, where a person is 1 at birth, so a person of age *a* is living in year `born + a - 1`.
The animal advances one step a year and returns after twelve, which is why 13 is the first age that matches and each later one is twelve years after the last.
Under a Western count, where a person is 0 at birth, the same years fall at ages 12, 24, 36 and so on.

```js
import { yearNameFor } from 'tibetan-calendar-temporal';

const born = 2130;   // Tibetan year of birth, royal era
yearNameFor(born + 13 - 1).animal === yearNameFor(born).animal;   // true: age 13
yearNameFor(born + 12 - 1).animal === yearNameFor(born).animal;   // false: age 12
```

The birth sign is the Tibetan year of birth, not the Western one, so it depends on whether the birth fell before or after Losar.
A person born in the weeks between 1 January and Losar belongs to the previous Tibetan year, and `isoToTibetan` gives the year to use.

```js
import { isoToTibetan } from 'tibetan-calendar-temporal';

isoToTibetan(Temporal.PlainDate.from('2003-01-01')).year;   // 2129, before Losar
isoToTibetan(Temporal.PlainDate.from('2003-06-01')).year;   // 2130, after it
```

### The cost of a year

**A year of dates, serialised, is about 126 KB** (354 days, ordinary year 2153) or **137 KB** for a
thirteen-month leap year like 2151 — measured, not assumed, in `test/serialisation.test.ts`.

Those figures used to be 293 KB and 324 KB. **Year-level naming is no longer a field on a date**: the
element–animal name and the rabjung position describe the *year*, so on a date they were one value
repeated across all 354 days, and together they were more than half of a serialised year. Reach them
with `yearNameFor(date.year)` and `rabjungFor(date.year)`, which are closed forms and touch no lunar
arithmetic. `TibetanMonth` still carries `yearName`, so the `monthsFor` → `datesFor` path keeps it
one hop away.

`weekdayName` stays on the date, and it is the one naming field that has to: `weekdayNameFor` needs
the `TraditionConfig`, because Bhutan names its weekdays one planet ahead of Tibet, and a serialised
date carries no config. It is also the only one that *varies* within a year — seven values across
the 354 days rather than one repeated.

Each `TibetanDate` holds a *pointer* to a shared, frozen weekday-name object rather than a copy, so
the in-memory cost is a pointer field, not thousands of string copies. `JSON.stringify` cannot see
that sharing and expands every pointer to its full object; the figures above are what a consumer
actually pays to persist or transmit a year, not what the engine holds in memory.

### Handling errors

Two failure kinds, and telling them apart matters because they call for different responses.

**A skipped date is not an error in your code.** It is a fact about the calendar, and the right
response is usually to show the user something rather than to log a bug. It arrives as
`SkippedDayError`, the only error class this package exports.

**Every other failure about your input is a `RangeError`** carrying a machine-readable `code`; the
two that are not about your input, `TCT_INTERNAL` and `TCT_MISSING_TEMPORAL`, are plain `Error`s.
Branch on `error.code`,
never on the message text — codes are part of the API and never change; wording is not and may
improve in any release.

```js
import { tibetanToIso, SkippedDayError } from 'tibetan-calendar-temporal';

try {
  tibetanToIso(fromUserInput);
} catch (error) {
  switch (error.code) {
    case 'TCT_SKIPPED_DAY':
      // error instanceof SkippedDayError, and error.requested is a frozen copy of the date fields you passed
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

The full code list is in the README's [API section](../README.md#errors).

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

**`temporal-polyfill/global` installs nothing where `Temporal` already exists** — Node 26, Chrome,
Edge, Firefox. That is what it is for, and it has a consequence worth knowing: a test suite that
imports it on Node 26 runs every test against the built-in `Temporal`, and has not tested the
polyfill your Safari users will run. To test under the polyfill anyway, force it over the built-in
one, and load this package only afterwards:

```js
// Test your app under the polyfill even where Temporal is native.
// temporal-polyfill/global installs nothing if a native Temporal exists.
import { installImplementation } from 'temporal-polyfill/shim';
installImplementation();
const { isoToTibetan } = await import('tibetan-calendar-temporal');
```

The dynamic `import()` is the point. A static `import` of this package is evaluated before any
statement in the module that imports it, so it would load against the built-in `Temporal`, and
every date it returned would be a built-in one. That still works — see the next section — but it is
not a test of the polyfill.

The default entry point is enough. `temporal-polyfill/full` adds calendars other than ISO 8601, and
this package accepts only `iso8601` dates, so it gains nothing here.

This package's output under `temporal-polyfill` and `@js-temporal/polyfill` has been compared with
its output under the built-in `Temporal`, and was identical;
[why you can trust these dates](why-trust-these-dates.md#why-the-results-are-identical-everywhere)
says what that does and does not show.

`package.json` declares `engines: { "node": ">=26" }`, which npm treats as **advisory**: you get a
warning on install, not a block, so a polyfilled Node 22 or 24 project works fine. The declaration
is there to tell the truth about the default path rather than to lock anyone out. Set
`engine-strict=true` in `.npmrc` if you want it enforced.

### Two Temporal implementations in one page is fine

You do not have to make sure every date reaches this package from the same `Temporal` you imported.
A `Temporal.PlainDate` built by a bundled polyfill, by a second non-deduplicated copy in
`node_modules`, or in an iframe is accepted at every date entry point, and answers the same as one
built by the global.

This is worth saying because the obvious check would not do it. `instanceof Temporal.PlainDate` asks
which implementation *built* the value, so it is `false` for all three of those; every guard here
reads `Symbol.toStringTag` instead, which the Temporal specification mandates on every type. The
distinction the package does still enforce is the one that matters — a bare `{ year, month, day }`
object is refused wherever a Western date is expected, because it is a genuine value of this
package's own Tibetan-date shape too and nothing about it says which calendar it means.

One restriction: the calendar has to be `iso8601`. A `PlainDate` carrying another calendar is
refused with `TCT_INVALID_ARGUMENT` rather than silently reinterpreted; `date.withCalendar('iso8601')`
names the same day and is accepted.

### Node 24 has `--harmony-temporal`, and you should not use it here

That flag exposes V8's unfinished implementation — it is behind a flag because it is not done — and
nothing here has been run against it. A polyfill is an implementation too; the reason to prefer it is
that this package's output under the polyfill has been compared with its output under the built-in
`Temporal` and found identical, which no one has done for the flag. Use the polyfill.

### Type-checking needs TypeScript 7, which the runtime requirement does not imply

Everything above is about *running* the code. Type-checking it is a second requirement, and the two
are independent — which is worth stating plainly, because satisfying the runtime one completely
leaves the other unmet and the symptom does not point at it.

The ambient `Temporal` namespace type ships in TypeScript's own lib files only from **7.0**, as
`lib.esnext.temporal.d.ts`. TypeScript 5.x has no such lib file at any `"lib"` setting, and neither
`@types/node` nor any other typings package supplies one. So on 5.x every declaration file in this
package that mentions a date fails:

```text
node_modules/tibetan-calendar-temporal/dist/computation/conversion.d.ts:12:34
  error TS2503: Cannot find namespace 'Temporal'.
```

That is not a corner of the API. Every function signature naming `Temporal.PlainDate` is unusable
until it resolves, which is all of them, because dates are what the package returns. **You can be on
Node 26 with `Temporal` working perfectly at runtime and still not compile a single line.**

The whole fix is the TypeScript version:

```sh
npm i -D typescript@^7 @types/node
```

No `"lib"` setting is needed **if your `target` is `ESNext`**, which is what carries
`lib.esnext.temporal.d.ts`.
With `module` set to `NodeNext` and no `target`, TypeScript 7.0.2 reports `TS2503: Cannot find
namespace 'Temporal'` against this package's declarations, so set the `target` as below, or leave it
out and add `"lib": ["ES2024", "ESNext.Temporal"]`.

A `tsconfig.json` for a Node project that only type-checks, and that reads a file with `node:fs`,
type-checks against the package as this does:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noEmit": true,
    "types": ["node"]
  }
}
```

`noEmit` keeps `tsc` from writing a `.js` file beside every source file, which it does by default;
drop it, and set `outDir`, if you compile with `tsc`.
`types` is needed only for code that uses a Node built-in such as `node:fs`, and it needs `@types/node`
installed: TypeScript 7 does not pick up `@types` packages on its own, so without the entry `node:fs`
is `TS2591: Cannot find name 'node:fs'` even with `@types/node` present.
Leave both out of a browser project.

**Do not install `temporal-polyfill`, `temporal-spec` or any other Temporal typings package to make
the error go away.** They are unnecessary once TypeScript is current, and the published `.d.ts`
references the global on purpose — the zero-dependency claim runs through the type declarations as
well as the runtime. The polyfill is for *runtimes* without `Temporal`, and installing it changes
nothing about this error.

Why this has to live in prose: `engines` in `package.json` constrains only `node`. npm has no
equivalent field for the TypeScript version a package's types require, so there is nothing
mechanical to declare it with.

### Displaying Tibetan names

Every Tibetan name the engine returns is a `TibetanName` with three renderings — Tibetan script,
Wylie transliteration and THL phonetics — so a consumer chooses which to display rather than
transliterating themselves.
An observance's rule, level and config carry an `englishName` first and an optional `tibetanName`
of the same shape; fourteen of `EXAMPLE_OBSERVANCES`' rules have one, and the rest are English only.

In `./astrology` an English label and its Tibetan name sit side by side: every attribute block has a
`tibetanNames` object keyed by the field it names, so `day.calendarDay.tibetanNames.trigram` is the
Tibetan for `day.calendarDay.trigram`.

```js
const date = isoToTibetan(Temporal.PlainDate.from('2026-08-12'));
date.weekdayName.tibetan;    // Tibetan script
date.weekdayName.wylie;      // Wylie transliteration
date.weekdayName.phonetic;   // spoken form
```

`weekdayNameFor` takes a tradition because Bhutan names its weekdays one planet ahead of Tibet.
`monthNamesFor` takes one too, for the Tiger month and the leap-month check; `yearNameFor` and
`rabjungFor` take none. A `TibetanDate` produced with a non-default config already
carries the shifted name on its `weekdayName` field — you do not need to look it up again.
The whole weekday moves: name, `planet` and `element` are the next weekday's, so a Bhutanese
Saturday is *nyi ma*, the Sun, fire. Janson and Henning's Bhutanese data bear out the name and
planet; that the element moves with them is an inference no source states.

**What deliberately does not ship:** translations into any other language. The names are the
calendar's own vocabulary, not user-interface strings, and an application supplying French or
German labels for `level: 'everyone'` is doing something the package should not guess at. The stable
keys — `element`, `animal`, a rule's `id` and `level`, `resolution` — are what a translation table keys on.
Give the table a default entry for `resolution`, and for a rule's `when.type`: both are open to additions
in a minor release, so an unknown value is a label to fall back on and not an error.

---

Contributor-facing documentation lives in the repository rather than in the published package:
[architecture](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/architecture.md),
[testing strategy](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/testing.md) and
[traditions](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/traditions.md).
`how-it-is-calculated.md` is not one of them — it ships, and is linked relatively above.
