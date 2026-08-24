# How the calendar is calculated

An introduction for readers who have not met the Kālacakra कालचक्र calendar before. No mathematics
beyond arithmetic is assumed. It explains what the calendar has to solve, how it solves it, and where
the genuine uncertainties are — including `a₂`, which is the one most likely to make two calendars
disagree.

Everything here is from Svante Janson, *Tibetan Calendar Mathematics*. Section references are to the
structure of that paper rather than to numbered equations, which are generated at render time.

## The problem the calendar solves

Two natural cycles refuse to divide into each other. The moon takes about **29.53 days** to go from
new moon to new moon. The sun takes about **365.25 days** to return to the same place in the sky.
Twelve lunar months come to roughly 354 days, eleven short of the solar year.

A **lunisolar** calendar insists on keeping both. Months must follow the moon, so that the full moon
falls on the same day number every month. Years must follow the sun, so that a given month stays in
its season. The Tibetan calendar does this, as do the Hebrew and Chinese calendars. The Gregorian
calendar gives up on the moon entirely; the Islamic calendar gives up on the sun.

Keeping both has a price, and the Tibetan calendar pays it in two unusual coins: **leap months**, and
**doubled and skipped days**. Almost everything strange about the calendar follows from those two.

## The 67 : 65 relation

The calendar's foundation is a single approximation, treated as exact:

> **67 lunar months = 65 solar months**

A "solar month" here is a twelfth of a solar year. So 65 twelfths of a year — five years and five
months — contain 67 lunar months. Two more lunar months than the 65 you would otherwise count.

Those two extra months are the **leap months**, and the relation fixes their rhythm precisely: two
leap months per 65 regular ones, spaced alternately 32 and 33 months apart. Since 65 solar months is
not a whole number of years, the pattern takes **65 years** to repeat, and in those 65 years each
month number 1–12 is the leap month exactly twice.

This is why the calendar is not "adjusted" or observed. It is computed, and it repeats.

## Counting months, not dates

The calculations do not work in years and months. They work in a single running count of lunar
months since a fixed starting point — Janson calls it the **true month count**, Tibetan *zla dag*
ཟླ་དག.

Month zero is the epoch. Month 1 is the next lunar month, and so on, without regard to where years
begin or end. Leap months take their place in the count like any other month, so the count simply
increases by one each month forever.

This is the single most useful idea in the whole system. Almost every question becomes easy once you
are counting months rather than naming them:

- *How many months between these two dates?* Subtract the counts.
- *What is the month after this one?* Add one.
- *Where does this month begin?* A formula in the count.

The awkward part is converting between a count and a name like "month 6 of 2151", because leap months
make the naming ambiguous — two months in a year can share the number 6. This package does that
conversion in `trueMonthCount` and `monthFromCount`, which are inverses of each other.

## Leap months, and which twin is the leap one

When a leap month occurs, **two consecutive months carry the same number**. A year with a leap month
6 has two months numbered 6, one after the other.

Which of the two is *the leap one* is a convention, and traditions disagree:

- **Phugpa, Tsurphu, Mongolian** — the leap month comes **first**.
- **Bhutanese** — the leap month comes **second**.

Janson calls this "an important difference" and notes the Bhutanese practice follows the Chinese
system rather than the Indian, and appears to be the original Kālacakra one. It matters because it
decides which physical lunar month a date like "the 15th of month 6" refers to — a whole month's
difference. In this package it is `TraditionConfig.leapMonthPosition`.

## Doubled and skipped days — the part that surprises everyone

Here is the feature with no counterpart in Western calendars.

A **lunar day** (*tithi*, Tibetan *tshes* ཚེས) is not a day. It is one thirtieth of a lunar month —
the time the moon takes to gain 12° on the sun. Because the moon's speed varies, a lunar day is
sometimes a little longer than a civil day and sometimes a little shorter, ranging roughly from 22 to
26 hours.

The rule for naming a calendar day is:

> A calendar day takes the number of the lunar day **that ends during it**.

Now consider what happens when lunar days drift against civil days:

- If a lunar day is short, **two** of them can end within one calendar day. The calendar day takes
  one number, and the other number is never used at all. That number is **skipped** — day 6 might
  simply not exist in a given month.
- If a lunar day is long, it can span a whole calendar day so that **no** lunar day ends during it.
  That day cannot take a new number, so it repeats the previous one. The number is **doubled** —
  day 21 occurs twice.

This is not an error or a correction. It is what the rule produces, and Tibetan almanacs print it
plainly. Roughly a quarter of all months contain one. A month therefore has 29 or 30 *calendar* days
while always having exactly 30 *lunar* days.

It matters enormously in practice, because a practice day tied to "the 10th" either happens twice, or
does not happen, in the months where the 10th is doubled or skipped. This package exposes it as
`isLeapDay` on a date, and `ObservanceConfig` carries the convention for which member of a doubled
pair an observance falls on.

## Mean motion, then corrections

The calculation of a date has two stages, and it is worth seeing the shape of it.

**Stage one: mean motion.** Three quantities advance at perfectly steady rates, each described by
three numbers — a value at the epoch, an increment per month, and an increment per day:

| Quantity | What it tracks | Janson's constants |
|---|---|---|
| *mean date* | roughly, the day the lunar day would end if everything were uniform | `m₀`, `m₁`, `m₂` |
| *mean sun* | the sun's position around the year | `s₀`, `s₁`, `s₂` |
| *lunar anomaly* | where the moon is in its cycle of speeding up and slowing down | `a₀`, `a₁`, `a₂` |

**Stage two: corrections.** The moon and sun do not move uniformly, so two corrections are added.
Each is read from a small table of integers — `moon_tab` with eight entries, `sun_tab` with four —
extended by symmetry and interpolated between. The moon's correction can reach 25/60 of a day, the
sun's 11/60.

The corrected result is the **true date**: the exact moment a given lunar day ends, from which the
calendar day, the doubling and the skipping all follow.

Everything is exact integer arithmetic with fixed denominators. Nothing is rounded, nothing uses
floating point, and the answer is identical on every machine — which is the whole reason this package
is built the way it is.

## What `a₂` is, and why there are two of them

Now the thing that causes real disagreements between real calendars.

`a₂` is one of the nine constants above: **how far the moon's anomaly advances in one day**. The
anomaly is the moon's position in its speeding-up-and-slowing-down cycle, and it is what feeds the
moon correction — so `a₂` helps decide the exact moment a lunar day ends.

The moon's anomaly completes a full circle in slightly *less* than one lunar month. Divide that by
the 30 lunar days in a month and you get the exact daily figure:

```text
exact:    (1 + a₁)/30 = 3781/105840
rounded:         1/28 = 3780/105840
```

They differ by **one part in 105,840 of a circle per day** — a hair. `1/28` is a rounded convenience,
much easier to work with by hand, and it is what Tibetan almanacs use. The exact value was proposed
by **Minling Lochen Dharmashri** ལྷ་མིང་བློ་གྲོས (1654–1717), and Edward Henning uses it in his
computed calendars.

Why does a hair matter? Because of doubled and skipped days. Almost always, the hair changes nothing
— the lunar day still ends comfortably inside the same calendar day, and both values give the same
answer. But occasionally a lunar day ends within that hair's breadth of midnight, and then the two
values fall on **opposite sides of the boundary**. The consequence is that *a different day number
gets doubled or skipped*.

The effect is therefore:

- Rare — about **one day in 4,100**. Janson counts 9 divergences in 1900–1999 and 8 in 2000–2099.
- Never large — it moves a day number by one, and **never** moves a month boundary.
- Self-correcting — the calendars are back in step within a day.

But it is real, and if you compare two Tibetan calendars from different sources and find they
disagree on one date in a decade, `a₂` is very likely why.

**Which value is right depends on whose calendar you want**, which is why this package ships both and
defaults to almanac practice. See [traditions.md](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/traditions.md) for what is established about each,
and [validation-sources.md](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/validation-sources.md) for the evidence and its limits.

## Where traditions differ, in summary

| | Differs by | Effect |
|---|---|---|
| Epoch constants | `m₀`, `s₀`, `a₀`, and the epoch date | Everything shifts |
| Leap-month rule | which intercalation index triggers a leap month | Leap months fall in different years |
| Leap-month position | whether the leap month precedes or follows its twin | A date can be a month out |
| `a₂` | rounded or exact | About one day in 4,100 |
| Weekday naming | Bhutan names the days one planet ahead | Names only; no date moves |

The mean motion rates `m₁`, `s₁`, `a₁` and the correction tables are **shared** by every version
Janson documents. The traditions are closer than the list suggests — but each difference is enough to
produce a calendar that looks entirely reasonable and is wrong for its intended community, which is
why this package injects all of them as configuration rather than assuming any.

## The sixty-year cycle: one cycle, two reckonings, two name lists

The years also carry a name from a sixty-year cycle, and the vocabulary around it is genuinely
confusing, because three different things are involved and one word gets used for all of them.

| Term | What it is |
|---|---|
| **Vṛhaspati / Bṛhaspati chakra** | The **cycle**. Jupiter takes almost twelve years to orbit the sun; a twelfth of that is a "Jovian year", and the Indian tradition gives each a name from a list of sixty, so the names repeat over five revolutions. |
| **saṃvatsara** | **One year** of that cycle. Hence "the saṃvatsara list" for the sixty names. |
| **jyotiṣa** | The **discipline** — Indian astral science. Not a cycle, and not a name for either list. |
| **Kālacakra** | Not a cycle either: the **system that carried this one to Tibet** in the 11th century, and the source of the epoch that anchors the count. |
| **rabjung** (*rab byung*) | The same cycle under its **Tibetan name**, taken from the name of its first year — Sanskrit *prabhava*, Tibetan *rab byung* — plus something India does not do: the cycles are **numbered**. |

### The two reckonings, and why Tibet matches the southern one

Because the names track Jupiter's computed position, a solar year occasionally gets no name at all
and one is **expunged** from the sequence — every 85 or 86 years. That is the northern, or true,
reckoning.

Southern India stopped expunging. Sewell puts it precisely: expunction was "neglected from, and
including, the cycle beginning in A.D. 900", after which the southern reckoning is a plain sixty-year
rotation. Csoma's own heading says which side Tibet is on — his table gives the years "as they are
reckoned **south of the river Nermada**, in India, and in Tibet".

That is why the Tibetan and southern Indian answers to "which year is this?" agree rather than merely
resemble each other. **1027 CE is Prabhava in both.** Tibet did not choose a phase; it inherited one,
and added the numbering — which is what makes the rabjung an *era* rather than a rotation, since a
cycle number plus a position names a year unambiguously where a bare name repeats every sixty years.

### Two Sanskrit name lists, for the one cycle

There are two lists of sixty Sanskrit names in play, and this package ships one of them.

- The **Indic saṃvatsara list** — Varāhamihira's lineage, attested name by name in Monier-Williams
  and corroborated by Sewell. This is what `RabjungName.sanskrit` carries.
- The list **the Tibetan names translate**, witnessed by Csoma de Kőrös (1834) and by Janson, whose
  table is Henning's.

They agree at most positions and carry **different names** at five — 16, 17, 18, 20 and 34 — where
the Tibetan follows the second list every time. So a Tibetan year name is not always a translation of
the Sanskrit name printed beside it. [names/rabjung.md](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/names/rabjung.md) tabulates both lists with a
verdict for every row where they differ, and [names/rabjung-sourcing.md](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/names/rabjung-sourcing.md)
records how that was established.
