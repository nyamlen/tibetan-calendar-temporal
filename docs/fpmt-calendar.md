# FPMT's calendar: what it prints, and how it is dated

FPMT publishes a monthly Tibetan calendar at `fpmt.org/resources/calendar/YYYY/Month.php`.
This document records facts about that calendar that are specific to FPMT and that this package does not ship: how FPMT dates eclipses, which anniversaries it prints on which dates, and where its sojong departs from the counted schedule.
It is not shipped, and its figures are not validation claims about the package — those are in [why-trust-these-dates.md](why-trust-these-dates.md).

Every Western date below is a Western (Gregorian) date, and every "month" and "day" is Tibetan, Phugpa tradition.
The observations cover FPMT's calendars from January 2022 to December 2026, all in `test/fixtures/fpmt-observances.ts`. The 2026 pages were first read by hand on 2026-09-19, January to October, and generated into the fixture on 2026-11-08, once December had been published.
What each of FPMT's codes means, and where it is sourced, is in [almanac-sources.md](almanac-sources.md).

## Eclipses

FPMT prints solar and lunar eclipses, 20 of them in this window.
They are real astronomical eclipses, including ones not visible from Asia.

### FPMT dates eclipses by UTC, not by the date in India

FPMT's own guidance is to observe auspicious days by the date in India, following Ven. Choden Rinpoche.
Its eclipse dates do not follow that.
For 18 of the 20 eclipses, FPMT's date was compared with the date of the nearest new or full moon, computed with the lunar-phase algorithm in Meeus, *Astronomical Algorithms*, chapter 49, in several timezones:

| Timezone | FPMT's date matches |
|---|---|
| UTC | 18 of 18 |
| New York | 17 of 18 |
| India | 14 of 18 |
| US Pacific | 14 of 18 |

The four India misses are all eclipses in the UTC evening, whose date in India is the next day: 30 April 2022, 28 October 2023, 2 October 2024 and 21 September 2025.
The two eclipses not checked, 12 and 28 August 2026, fell outside the range of the check, not outside its agreement.
The comparison uses the instant of new or full moon rather than the eclipse maximum, which can differ by up to about an hour; none of the 18 is that close to midnight in UTC.

So a calendar reproducing FPMT's eclipse dates dates them by UTC.
An application could instead date them by the user's own timezone, or by India's to follow FPMT's guidance, and on the four dates above those choices give a different day.
Which one FPMT intends is an open question, put to Ven. Thubten Chöying.

### The Tibetan eclipse method does not reproduce these dates

Tibetan almanacs predict eclipses from Rahu, the lunar nodes.
Janson gives Rahu's position (appendix D, "Rahu"), and Henning, *Kālacakra and the Tibetan Calendar*, chapter III, gives the prediction method.
Henning reports that the Phugpa calculation's Sun-to-node distance has drifted — 9.77° too small by 2000 — and that the almanacs correct it by 0;31,41,4,10, the value Dharmaśrī gave and Chenrab Norbu kept unchanged for his 1927 epoch.

Applied to the 120 new and full moons of this window, Chenrab Norbu's correction and limits predict 10 of FPMT's 20 eclipses and none that did not happen.
The misses are eight solar eclipses and two very slight lunar ones, 25 March and 18 September 2024.
The method classes the total solar eclipse of 8 April 2024 as a "contrary" case, in which "an eclipse should not occur".
Henning says as much: the Tibetan methods lack the theory solar eclipses need, and the correction has not been updated since Dharmaśrī.

So the package does not compute eclipses.
A front end that shows them sources them from an astronomical ephemeris.
A Tibetan eclipse computation would belong beside Janson's Appendix D, in a subpath of its own beyond v1 (`./astronomy` is proposed, not decided); the full measurement is recorded in [roadmap.md](roadmap.md#beyond-v1).

## Anniversaries

FPMT prints teacher and lineage anniversaries of two kinds, which behave differently.

### On a fixed Tibetan date

These fall on the same Tibetan date every year, so their Western date moves.

| Anniversary | Tibetan date | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---|---|---|---|---|---|
| Lama Thubten Yeshe | 1st month, 1st day | 3 Mar | 21 Feb | 10 Feb | 28 Feb | 18 Feb |
| Milarepa | 1st month, 14th day | 17 Mar | 6 Mar | 23 Feb | 13 Mar | 2 Mar |
| Guru Rinpoche | 5th month, 10th day | 9 Jul | 28 Jun | 16 Jun | 5 Jul | 24 Jun |
| Gampopa | 6th month, 15th day | 12 Aug | 1 Aug | 21 Jul | 9 Aug | 29 Jul |
| Sixteenth Karmapa | 9th month, 9th day | 2 Nov | 23 Oct | 10 Nov | 30 Oct | 19 Oct |
| Lama Tsong Khapa | 10th month, 25th day | 18 Dec | 7 Dec | 25 Dec | 14 Dec | 3 Dec |
| Sakya Pandita | 11th month, 14th day | 16 Jan | 5 Jan | — | 12 Jan | 2 Jan |
| Dudjom Rinpoche | 11th month, 18th day | 20 Jan | 9 Jan | — | 16 Jan | 6 Jan |

Two things to read from it.
Gampopa's 2024 date is in the **leap** 6th month, the same choice FPMT makes for the düchen that year.
And the 11th-month anniversaries are missing twice: in the Tibetan year that ran from February 2023 to February 2024 they fell on 25 and 29 December 2023, and in the year that began in February 2026 on 23 and 26 December 2026, and FPMT printed neither either time.
The Western year 2024 contains neither of the first pair, which is why that column is empty.
Lama Thubten Yeshe's day is the 1st of the 1st month because he passed away on 3 March 1984, which was Losar that year; the engine gives that date as the 1st month, 1st day.

### On a fixed Western date

These fall on the same Western date every year.

| Anniversary | Western date | Printed |
|---|---|---|
| H.H. the Dalai Lama's birthday | 6 July | 2022–2026, with his age |
| H.H. Sakya Trichen's birthday | 7 September | 2022–2026, with his age |
| Lama Zopa Rinpoche's birthday | 3 December | 2022–2026, after his passing too |
| Lama Zopa Rinpoche | 13 April | 2024–2026, after his passing in 2023 |
| Karma Rishi | 9–15 September | 2026 only, a seven-day period |

This list is the part that changes: in five years an anniversary began beside a birthday that continued, and a period appeared.

## The FPMT configuration the test suite holds

`test/support/fpmt-config.ts` is the example's rules under FPMT's labels, plus what FPMT prints that the neutral example does not ship: Lama Thubten Yeshe on the 1st day of the 1st month, and four dates on the Western calendar.
Lama Zopa Rinpoche's birthday, 3 December, carries no window, because FPMT prints it in every year of the fixture, after his passing too.
His passing, 13 April, carries `fromYear: 2024`, which is where FPMT begins to print it, so it is the external test of a window.
The Dalai Lama's birthday, 6 July, and Sakya Trichen's, 7 September, carry `ageFromYear` 1935 and 1945, and FPMT prints the ordinal of each, 87th to 91st and 77th to 81st, so the suite matches the printed ordinal against the result's `age`: the external test of `age`.
The `saga-dawa-month` rule has no FPMT label, so FPMT validates nothing about it.

**The window** is the fixture's own: 1 January 2022 to 31 December 2026, 1,826 days.
`test/validation/fpmt-observances.test.ts` compares every label in both directions and fails on any residual not listed there by date.
Measured 2026-11-14, the residuals are:

| Residual | Days | Reading |
|---|---|---|
| Sojong | 34 | FPMT's 17 sojongs from 2022-04-30 to 2022-12-22, each a day before the engine's 17 (2022-05-01 to 2022-12-23); 2026 agrees fully |
| Anniversaries FPMT omits | 4 | Sakya Pandita and Dudjom Rinpoche on 2023-12-25 and 2023-12-29, in Tibetan 2150, and on 2026-12-23 and 2026-12-26, in Tibetan 2153; each the engine's day and not FPMT's |
| The Sixteenth Karmapa, doubled 9/9 | 2 | FPMT keeps 2026-10-19, the first half; the example's `doubledDay: "second"` gives 2026-10-20 |
| Day number | 3 | 2022-12-03 (the Tsog) and 2024-12-08 (the Medicine Buddha and Tara pujas, two labels), where FPMT's day number is not the engine's; the third such day, 2023-11-09, produces no residual |
| Fire puja | 40 | the formula's misses, 21 on FPMT's side and 19 on the engine's, listed by date in the suite |

Everything else agrees, including every `age` and the window of Lama Zopa Rinpoche's passing.
Whether the omissions are a rule or a slip is not known.
When the fixture is extended to FPMT's 2027 calendars the suite fails on every new residual, by design: re-measure, add each one to the list by date in the same commit as the fixture, and say here whether it is explained.

## Sojong: one 17-day departure from the counted schedule

FPMT prints 124 sojongs from 2022 to 2026, 99 of them in 2022-2025 and 25 in 2026 (counted over the days of its labels in the fixture).
Rabten Choeling's calendar follows a counted schedule re-anchored every year on the month-1 full moon, the rule set out in [almanac-sources.md](almanac-sources.md#sojong-a-counted-schedule-once-falsified-by-a-misreading); FPMT agrees with it on 107 of the 124, which is 82 of the 99 in 2022-2025 and all 25 in 2026.
The other 17 are one run, 30 April 2022 to 22 December 2022, every one a day earlier than the rule.
It opens with a 14-day waning fortnight in the 2nd month, which is even and gives 15 under the rule, and it closes on 7 January 2023 with a 16-day waxing fortnight in the 11th month.
FPMT therefore came back into step two months before the 2023 anchor would have forced it to.

Whether the run is a slip or a rule this package lacks is not known.
It was put to Ven. Thubten Chöying on 2026-09-27, with whether FPMT re-anchors on Chötrul Düchen at all and whether it drops a sojong falling on Losar.
The window has no month-1 day 15 that is skipped or doubled, so FPMT's choice for those two cases is untested.

## What FPMT's guidance page dates, and what it leaves undated

FPMT's "Dates Explained" page (`fpmt.org/media/resources/dharma-dates/dates-explained/`, read 2026-09-19) dates the monthly practices, and it is the source the calendar's labels follow.

- **Tsog offering:** "10th and 25th of every Tibetan month", with Lama Zopa Rinpoche's note that those with a Highest Yoga Tantra initiation have a commitment to perform tsog on these days.
  It is the only practice the page ties to an initiation.
- **Protector puja:** "29th of every Tibetan month", and nothing more — no requirement is stated either way.
- **Guru Puja** (*Lama Chöpa*) appears only as a link to its practice text, with no date, and the calendars never print it as a label.
  In Gelug centres Guru Puja is the usual way the tsog of the 10th and 25th is offered, but that is practice knowledge, not something FPMT's page or calendar states: "Tsog" names the offering, not the practice.

So the tiers this repository once assigned — tier 3 for tsog, tier 2 for the Protector puja, tier 1 for the Medicine Buddha and Tārā pujas — rest on this page only for tsog.
The rest were authored, and the question of which practice "Tsog" means, and who each day is for, was put to Ven. Thubten Chöying on 2026-09-19.
Her reply on 2026-09-30 answered that section with a different proposal — let each user hide what they do not keep, instead of tiers — and did not say which practice "Tsog" means.

### The labels mark a date, not a practice

FPMT's calendars label every day numbered 10 or 25 "Tsog" and every day numbered 29 "Protector puja", without exception and without naming a practice.
Counted over the fixture's 1,826 days, 2022 to 2026: "Tsog" on all 62 days numbered 10 and all 60 numbered 25, never on the 29th; "Protector puja" on all 60 days numbered 29.

Read as practice knowledge, which Andreas stated on 2026-11-10 and no published source here confirms, those labels name the date that several practices share, not any one of them.
A tsok is always offered within a sādhana, and the Yamāntaka practice — a protector practice — carries a tsok commitment, so a day labelled "Protector puja" can be a tsok day too.
An open calendar printing "Tsog" tells an initiate the day and tells someone uninitiated nothing about what to do.
**So neither label identifies a practice, and neither says who the day is for.**
What this means for a configuration, and the levels that replaced the tiers, is in [observances.md](observances.md#who-a-practice-is-for).

## FPMT's prose guidance against the nineteen rules

Read on 2026-11-14.
The question is whether each rule of `EXAMPLE_OBSERVANCES` says what FPMT's own written guidance says, as distinct from what its calendars print, which the section "The FPMT configuration the test suite holds" and `test/validation/fpmt-observances.test.ts` cover.
Only short phrases are quoted, and only ones read on the page.

**Limits.**
This is a read of prose and not of the calendar fixture.
The pages were read through a fetch tool that summarises them, not as raw markup, so a phrase is as that tool returned it.
FPMT's 2023 Liberation calendar PDF could not be fetched (HTTP 403) and nothing from it is relied on.
Whether FPMT has per-teacher pages for the six anniversaries without prose was searched for on fpmt.org and not found, which is not proof that none exists.
Three more FPMT pages, the Saka Dawa notices for 2024, 2025 and 2026, were read for the Saga Dawa row only.
FPMT's levels, who may do what, were checked only where a page states one: tsog needs a Highest Yoga Tantra initiation.

Pages: A = <https://fpmt.org/media/resources/dharma-dates/dates-explained/>; B = <https://fpmt.org/teachers/zopa/advice/practice-on-the-four-great-holy-days/>; D = <https://fpmt.org/teachers/zopa/advice/lamatsongkhapa/>; E = <https://fpmt.org/edu-news/vajrayogini-and-guru-yoga-materials/>; F = <https://fpmt.org/edu-news/saka-dawa-duchen-2026-sunday-may-31/> (2026).

| Rule id | What the example says | What FPMT's prose says | Verdict |
|---|---|---|---|
| `chotrul-duchen` | annual, month 1 day 15 | B: "Day 15 is called Chotrul Duchen", of month 1 | AGREES |
| `saga-dawa-duchen` | annual, month 4 day 15 | B: day 15 of month 4, "birth, enlightenment, and parinirvana" | AGREES |
| `chokhor-duchen` | annual, month 6 day 4 | B: day 4 of month 6, "first teaching" | AGREES |
| `lhabab-duchen` | annual, month 9 day 22 | B: day 22 of month 9, the return "from the God Realm of the Thirty-Three" | AGREES |
| `tsongkhapa` | annual, month 10 day 25 | D: "on the twenty-fifth day of the tenth month of the Tibetan calendar" | AGREES |
| `milarepa` | annual, month 1 day 14 | A has a "BIRTHDAYS AND ANNIVERSARIES OF HOLY BEINGS" heading whose entries are Lord Buddha's only | NO GUIDANCE FOUND |
| `guru-rinpoche` | annual, month 5 day 10 | none on the pages read | NO GUIDANCE FOUND |
| `gampopa` | annual, month 6 day 15 | none on the pages read | NO GUIDANCE FOUND |
| `karmapa-16` | annual, month 9 day 9 | none on the pages read | NO GUIDANCE FOUND |
| `sakya-pandita` | annual, month 11 day 14 | none on the pages read | NO GUIDANCE FOUND |
| `dudjom-rinpoche` | annual, month 11 day 18 | none on the pages read | NO GUIDANCE FOUND |
| `saga-dawa-month` | period, month 4 day 1 to month 4 day 30 | F calls May 17, 2026 "the first day of holy Saka Dawa month" and gives no end; A does not name Saka Dawa; B and the 2024 and 2025 Saka Dawa pages treat it as a single day | AGREES on the first day only; no span stated |
| `sojong` | counted from month 1 day 15, with its own conventions | A: the confession ceremony "usually falls at middle and end of every Tibetan month"; no day counts, no doubled-day rule, no level | AGREES as far as "middle and end", nothing on the count or conventions |
| `fire-puja` | formula over day number and weekday | A: "Many days every month are good for fire pujas"; no formula and no fixed days | NO GUIDANCE FOUND |
| `medicine-buddha` | monthly, days 8 and 15 | A: "8th or 15th of every Tibetan month" | AGREES |
| `tara` | monthly, day 8 | A: "8th of every Tibetan month" | AGREES |
| `heruka-day` | monthly, day 10, named "Heruka Day" | A: tsog "10th and 25th of every Tibetan month"; E: tsog "on dakini days on the Tibetan calendar 10th and 25th"; neither page uses the name "Heruka Day" | AGREES on the day; the name is the example's own |
| `dakini-day` | monthly, day 25, named "Ḍākinī Day" | E: "dakini days on the Tibetan calendar 10th and 25th", so FPMT calls both days dakini days | DIFFERS in naming only: the day numbers agree |
| `dharma-protector-day` | monthly, day 29, level empowerment | A: Protector puja "29th of every Tibetan month"; nothing on a level | AGREES on the day; level not addressed |

**Counts, re-checked against the example's source:** 11 AGREE (two of them partly: `saga-dawa-month` on its first day only and `sojong` as far as "middle and end"), 1 DIFFERS, 7 have NO GUIDANCE FOUND.
The seven are `milarepa`, `guru-rinpoche`, `gampopa`, `karmapa-16`, `sakya-pandita`, `dudjom-rinpoche` and `fire-puja`: FPMT's holy-beings section lists only the Buddha's days for the six anniversaries, and for the fire puja it gives no formula.
An earlier read of the first pages alone counted `saga-dawa-month` as an eighth rule without guidance; the 2026 Saka Dawa notice's phrase moved it.
Where the calendars, not the prose, state these six anniversaries, the section "Anniversaries" above records their dates.

### The dakini days: the day numbers agree and the naming differs

FPMT calls both the 10th and the 25th dakini days.
The example names the 25th "Ḍākinī Day" and the 10th "Heruka Day", both authored names composed from dedications Cornu gives ([observances.md](observances.md#the-basis-of-each-english-name-in-the-example)).
The names are kept by decision, and no FPMT page fetched uses "Heruka Day".

### Doubled and skipped days

A says special days on doubled days are "usually celebrated on the second day", and on missing days "usually celebrated on the preceding day".
The example's config follows that for the great days and the anniversaries, which take the config's `doubledDay: "second"` and `skippedDay: "preceding"`.
The five monthly rules override both to `"both"` and `"omit"`.
A does not say whether a monthly puja is a "special day" and, under its tsog, Medicine Buddha, Tara and Protector headings, gives only the day numbers, so its prose neither confirms nor contradicts those overrides.
They rest on the calendar fixture.

Two leads came from search-result summaries of the blocked 2023 PDF and were **not** read on any page: that on a doubled date tsog is "always on the first day", and that Naga, Medicine Buddha, Tara and Protector pujas may be done on both days.
They are **unverified leads**, not findings; when A was asked directly it did not address tsog on doubled days.
