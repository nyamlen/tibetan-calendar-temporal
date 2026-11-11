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
| Lama Tsong Khapa | 10th month, 25th day | 18 Dec | 7 Dec | 25 Dec | 14 Dec | — |
| Sakya Pandita | 11th month, 14th day | 16 Jan | 5 Jan | — | 12 Jan | 2 Jan |
| Dudjom Rinpoche | 11th month, 18th day | 20 Jan | 9 Jan | — | 16 Jan | 6 Jan |

Two things to read from it.
Gampopa's 2024 date is in the **leap** 6th month, the same choice FPMT makes for the düchen that year.
And the 11th-month anniversaries are missing once: in the Tibetan year that ran from February 2023 to February 2024 they fell on 25 and 29 December 2023, and FPMT printed neither.
The Western year 2024 contains neither date, which is why that column is empty.
Lama Tsong Khapa Day 2026 is 3 December, which FPMT had not yet published when this was read.
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

## Sojong: one 17-day departure from the counted schedule

FPMT prints 99 sojongs from 2022 to 2025.
Rabten Choeling's calendar follows a counted schedule re-anchored every year on the month-1 full moon, the rule set out in [almanac-sources.md](almanac-sources.md#sojong-a-counted-schedule-once-falsified-by-a-misreading); FPMT agrees with it on 82 of the 99.
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
