# FPMT's calendar: what it prints, and how it is dated

FPMT publishes a monthly Tibetan calendar at `fpmt.org/resources/calendar/YYYY/Month.php`.
This document records facts about that calendar that are specific to FPMT and that this package does not ship: how FPMT dates eclipses, and which anniversaries it prints on which dates.
It is not shipped, and its figures are not validation claims about the package — those are in [why-trust-these-dates.md](why-trust-these-dates.md).

Every Western date below is a Western (Gregorian) date, and every "month" and "day" is Tibetan, Phugpa tradition.
The observations cover FPMT's calendars from January 2022 to October 2026: `test/fixtures/fpmt-observances.ts` for 2022–2025, and the published monthly pages for January to October 2026, read on 2026-09-19.
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

### On a fixed Western date

These fall on the same Western date every year.

| Anniversary | Western date | Printed |
|---|---|---|
| H.H. the Dalai Lama's birthday | 6 July | 2022–2026, with his age |
| H.H. Sakya Trichen's birthday | 7 September | 2022–2026, with his age |
| Lama Zopa Rinpoche's birthday | 3 December | 2022–2025 |
| Lama Zopa Rinpoche | 13 April | 2024–2026, after his passing in 2023 |
| Karma Rishi | 9–15 September | 2026 only, a seven-day period |

This list is the part that changes: in five years a birthday stopped, an anniversary began, and a period appeared.
