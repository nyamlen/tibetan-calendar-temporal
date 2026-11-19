# Validation sources

**What data this project checks itself against, where each source comes from, and what each one can
and cannot settle.** New to the calendar? Read [how-it-is-calculated.md](how-it-is-calculated.md)
first — this file assumes leap months, doubled and skipped days, and `a₂`.

This exists because the same three mistakes kept recurring, all of them made in a single session on
2026-08-16:

1. **Concluding a source does not exist** after looking at part of it. The Royal Government of
   Bhutan's calendar was dismissed as a holiday list; pages 5–16 of the same PDF are a day-by-day
   almanac.
2. **Treating a derived source as independent.** bhutanesecalendar.com looked like a second witness
   for Bhutan. One line on its About page says its data comes from the same software our existing
   fixture does.
3. **Hand-reading numerals from a scan.** Three cells in nineteen were misread, and each error
   *looked* like a calendar disagreement.

So the first question about any source is never "what does it say" but **"where did it get it"**.

## Lineage is the thing that matters

Agreement is only evidence if the source did not get its answer the same way we did. Four lineages
appear here, and two sources in the same lineage agreeing tells you nothing you did not already know.

| Lineage | What it means |
|---|---|
| **Janson** | Derived from *Tibetan Calendar Mathematics*, the paper this engine implements. Checks the implementation, not the interpretation. |
| **Henning** | Derived from Edward Henning's software or its published archives, directly or at several removes. The most common lineage by far, and the easiest to mistake for independent. |
| **Almanac** | Traceable to a printed almanac produced by a traditional authority — Men-Tsee-Khang for Tibet, the Ministry of Home Affairs for Bhutan. The strongest kind. |
| **Independent implementation** | Someone else's code from the same or similar sources. Catches our bugs; cannot catch a shared misreading. |

**Janson's sixty-year name table is Henning's lineage, not his own.** His LaTeX says the table is
"taken from [Henning]", so his Sanskrit column and Henning's are one witness, not two — which mattered
on 2026-08-24, when the question was whether anything corroborated the Sanskrit names independently.
What does is **Csoma de Kőrös, *A Grammar of the Tibetan Language* (Calcutta 1834)**, printed 65 years
before Monier-Williams and 90 before Sewell, and reached from the Tibetan side rather than the Indic
one. He is a fifth lineage, and the names work is where he is used — see
[names/rabjung-sourcing.md](names/rabjung-sourcing.md). Access: archive.org item
`korosi-csoma-a-grammar-of-the-tibetan-language-in-english-1834`, plates read 2026-08-24.

### A citation is not a lineage — check that the source says what it is cited for

The rabjung table's IAST column was cited to Sewell & Fleet (1924) and *reached us through the
Wikipedia saṃvatsara table*. Nobody had opened Sewell. When someone did, on 2026-08-21, he
disagreed at four positions — and at position 60 the disagreement was total: he gives `Kshaya`,
the string `Akshaya` appears **nowhere in his book**, and Janson and the Tibetan `zad pa` both
agree with him. What had been recorded for months as a Tibetan-versus-Indic *divergence* was our
own column being wrong.

So a provenance note naming a book is a claim about lineage, not evidence of it. Open the book. If
it cannot be opened, say the column came from the intermediary, because that is what is true.

**The same lesson, one level up: English Wiktionary's Sanskrit senses *are* Monier-Williams.** They
were used as the rabjung table's sense column on the strength of being "a third lineage independent
of both Janson and Sewell", which is true of them — and says nothing about MW. Pulling खर from
Wiktionary and from the Cologne scan gives the same gloss sequence, verbatim. So corroborating that
column with any MW-derived source would have been Monier-Williams agreeing with itself. The column
now comes from Cologne directly, which is the authority rather than an unattributed copy of it, and
corroboration is counted only from lexicons that are **not** MW — Shabda-Sagara, Benfey, Yates, Apte,
Edgerton.

Two sources were added on 2026-08-21 and are worth stating separately, because they answer different
questions:

| Source | Lineage | What it answers | Standing |
|---|---|---|---|
| Cologne Digital Sanskrit Dictionaries (Monier-Williams 1899) | The lexicon itself | Sanskrit senses, uncapped, with a printed page number, a stable per-sense record ID, and MW's own homonym grouping | **Sourced.** MW is public domain; the scan is a digitisation of it |
| wisdomlib | Bṛhat Saṃhitā of Varāhamihira, plus per-source lexicon attribution | The cycle position, named in words beside the Devanāgarī; and which non-MW lexicons carry a headword | **Sourced, where present.** About a quarter of rows carry no position. Only the ordinal is taken, never the prose — a position is a fact, and the surrounding translation is not ours to copy |

**wisdomlib rate-limits, and this is a property of the source rather than of a bad run.** A full
sixty-row pass tripped it, after which it answered `403` to every User-Agent alike, a browser string
included. Changing the User-Agent is not the fix, and would be the same working-around of a site's
access decision this file already records declining for Rangjung Yeshe Wiki. The generator now sends
one request before sixty and aborts the whole run if the source is down, because an empty
corroboration column would otherwise be written into the document as a finding about Sanskrit
lexicography when it is a fact about our request volume.

**And check what the cited source can actually answer.** Sewell carries **no IAST diacritics at
all** — he prints `Sukla`, `Vrisha`, `Kshaya` in 1924 romanisation — so he can settle *which name
sits at which position* and can never settle a spelling. Re-sourcing the column from him would have
replaced diacritics with their absence while appearing to strengthen the provenance.

## Phugpa

| Source | Lineage | Format | Coverage | Settles |
|---|---|---|---|---|
| `crosscheck-lotsawa.ts` | independent impl. | HTML grid | 1,831 days, 21 Feb 2023 – 25 Feb 2028 | day numbers, doubled/skipped marks |
| `crosscheck-steinert.ts` | independent impl. | JSON API | 1,461 days, 1 Jan 2024 – 31 Dec 2027 | day numbers, doubled + leap-month flags |
| `crosscheck-eszthoff.ts` | independent impl. | npm package, run not read | 1,826 days, 1 Jan 2023 – 31 Dec 2027 | day numbers |
| `fpmt-observances.ts` | **almanac** (Men-Tsee-Khang) | HTML tables | 1,826 days, 2022–2026 | day numbers — the source that settled `a₂`; since 2026-09-12 also the **lunar mansion**, via the day-quality codes; since 2026-09-19 the **full and new moons**, via its moon icons, whose own lineage is unknown — see [below](#fpmts-moon-icons-lineage-unknown) |
| `fpmt-holy-days.ts` | almanac, via prose | hand-curated | selected days | observance placement only |
| `losar.ts`, `janson-epoch.ts`, `sixty-year-cycle.ts` | Janson | LaTeX, generated | 1927–2046 Losar; epoch | month count, leap rule, year naming |

**`a₂` is settled for Phugpa: `1/28`.** Three lines of evidence, in
[decisions/2026-08-12-lunar-anomaly-a2-default.md](decisions/2026-08-12-lunar-anomaly-a2-default.md).
Janson states the almanac uses it, citing the *Tibetan Annual Almanac 2013*; Lotsawa House and
christian-steinert both follow it on all three divergence dates; and FPMT's monthly grids side with it
day by day.

**What cannot settle `a₂`, so do not reach for it again:** Losar dates (both values reproduce
Janson's whole 1927–2046 table) and any list of *practice days* (the 11 divergences in 1950–2050 are
each self-correcting within a day). Only a **day-by-day grid printing the doubled or skipped number**
is evidence.

### FPMT's moon icons: lineage unknown

FPMT prints a full- or new-moon icon in the day's cell, and since 2026-09-19 the fixture records it.
**Nothing on the pages says where the icons come from.** They may be copied from the Men-Tsee-Khang
almanac with the day numbers, or added by FPMT from astronomical tables, and the two would be
different evidence: the first checks the engine against the tradition, the second against astronomy.

There is one piece of evidence, and it is an **inference, not a measurement**. `isFullMoon`'s docblock
records, after Janson, that the Tibetan true phase differs from the astronomical one by about four
hours. A four-hour shift moves a phase across a day boundary whenever it falls within four hours of
one, so of the 99 moons in 2022–2025 something like a sixth — on the order of fifteen — would be
expected to land on a different calendar day if the icons were placed astronomically. One does, the
new moon of February 2025.
That suggests the icons are computed the Tibetan way, and that February 2025 — the only skipped-30
new moon in the window — may be the one place they are not. Nothing here has timed a moon
astronomically, so treat this as a direction for the next check, not a finding.

Until it is settled, the agreement figures in [testing.md](testing.md) are agreement **with FPMT's
icons**, not with the almanac.

## Bhutan

| Source | Lineage | Format | Coverage | Settles |
|---|---|---|---|---|
| `bhutan.ts` | **Henning** | SQL tuples via a WordPress plugin | a day-by-day sweep of the whole file, window in [testing.md](testing.md) | day numbers, months, leap months |
| `rgob.ts` | **almanac** (Ministry of Home Affairs) | scanned PDF, hand-read | 25 government-published days, no day-by-day sweep | day numbers, 3 skipped + 2 doubled days, Losar |
| `cross-version-leap.ts` | Janson | LaTeX, generated | 2000–2030 | leap-month numbers and years |

`bhutan.ts` provides the breadth and `rgob.ts` provides the **independence** — it is the only
non-Henning check on Bhutanese day numbers here. Its rows were chosen for the doubled and skipped
days, which is where Janson §8 warns published tables go wrong.

**`a₂` is NOT settled for Bhutan, and no source available today can settle it.** `BHUTAN` and
`BHUTAN_HENNING` agree on all 25 government-published days, and the fixture's trusted days validate
`BHUTAN_HENNING` only because it descends from Henning — which is circular. Settling it needs a
**Bhutanese state** day-by-day grid covering a date where the two values disagree. The Ministry
publishes 2025 and 2026 only, neither of which contains one, and the Drukpa calendar is a different
system (below).

### The dates that would settle it

Computed from the two configs, so this list is exact rather than a search hint. Within the fixture
window there are three, all now in the past:

| Date | `BHUTAN` (`1/28`) | `BHUTAN_HENNING` |
|---|---|---|
| 2001-12-10 | 10/25 | 10/26 |
| 2004-04-10 | 2/20 | 2/21 |
| 2020-04-23 | 3/1, doubled | 2/30 |

**The first future one is 2047-07-02**, and there are only two before 2075 — the other is 2049-03-27
(1/23 against 1/24). The rate is nominally about one day in 4,100, but Janson notes it is not uniform,
and this stretch is unusually quiet.

2047 is a **good** test to read off a printed grid, because the disagreement is about *which day is
skipped* rather than a bare number:

```text
2047-07-01    day 8     day 8
2047-07-02    day 9     day 10     <-- the test
2047-07-03    day 11    day 11
```

So `BHUTAN` skips day 10 that month and Henning's value skips day 9. Either the printed calendar has
no day 10 or it has no day 9, and that settles it outright.

**Twenty-one years is a long wait, which makes the historic dates the better target.** A printed
Bhutanese calendar for 2001, 2004 or 2020 — from an archive, a library, a monastery, or anyone who
kept one — resolves the question now. The Ministry's website does not go back that far and the Wayback
Machine has nothing, so this is a paper-archive question rather than a web one.

Note what this does *not* undermine: everything except `a₂` is validated for Bhutan, over Henning's
lineage by `BHUTAN_HENNING`'s day-by-day sweep and over the government's own calendar by `BHUTAN`'s
twenty-five days. The open question is a choice between two values that differ on about
one day in 4,100, and `BHUTAN` resolves it the same way Phugpa's evidence does — toward almanac
practice.

### The Drukpa Kagyu app is a different calendar — and it nearly produced a wrong answer

Resolved 2026-08-17. **A Drukpa Calendar App is not Bhutan's state calendar**, and must not be used
as Bhutanese evidence. The overlap test settles it, on a date the Royal Government also publishes:

| Date | Royal Government | `BHUTAN` and `BHUTAN_HENNING` | Drukpa app |
|---|---|---|---|
| 2026-02-18 | day 1 | 1/1 | 1/1 |
| 2025-01-19 | day 21 | 11/21, doubled | day 21 |
| **2025-01-20** | **day 21** | **11/21** | **day 22** |
| 2025-01-21 | — | 11/22 | day 22, doubled |

The app doubles day 22 across 20–21 January where the state calendar doubles day 21 across 19–20 —
one number higher and one day later, the same offset it shows in 2001, 2004 and 2020. Both our configs
agree with the government; the app agrees with neither.

The difference is **narrow and specific**: Losar and the month structure match, so the divergence is
in the day-level corrections rather than the month arithmetic. That is consistent with Janson's note,
citing Berzin in a passage present only as a LaTeX comment, that Drukpa Kagyu follows
*Cahtuḥpīṭha-Kālacakra* चतुःपीठ-कालचक्र, a Tsurphu derivative begun by Drugchen Pemakarpo in the late
16th century. Modelling it is out of scope; recognising it is not.

**Why this entry is the most useful one in the file.** Before the overlap test, the app matched
`BHUTAN_HENNING` on two of the three `a₂` divergence dates — 2001-12-10 as day 26 and 2004-04-10 as
day 21, where `1/28` gives 25 and 20. Taken at face value that was evidence that Bhutan follows
Dharmashri's exact value, and it would have justified changing a shipped default. It was
**coincidence**: a systematic one-day offset landing on Henning's number twice.

Two sources agreeing on a handful of dates is not evidence that they are the same calendar. Ask what
system a source computes *before* asking what it says, and test it where a known authority overlaps.

## Tsurphu — nothing day-level

Leap months only, via `cross-version-leap.ts`. No date has ever been checked.

The source Janson names is **Rumtek monastery's** published calendar — Rumtek is the Karmapa's main
exile seat, and Tsurphu is the Karma Kagyu system. Note that kalacakra.org also publishes "Open source
Tsurphu calendar software", so any online Tsurphu calendar must be checked for that lineage before
being treated as independent.

Do not use a Drukpa Kagyu source for Tsurphu. Drukpa follows the derivative described above; Drikung
Kagyu follows a Tsurphu/Phugpa hybrid. Neither is Tsurphu.

**A day-by-day Tsurphu source exists, and has not been obtained.** The Nitartha calendar from Nalandabodhi
prints in every day's cell the Tsurluk (Tsurphu) month and lunar day, beside the Phugpa month and day.
Its publications manager answered on 2026-10-22 that the Tsurphu data is computed by hand by Lama Tenzin
Namdak, who studied with Dr. Karma Drubgyu — **not** with Henning's software. That is the publisher's own
statement of lineage, and nothing here has checked it; the lineage rule above applies until it has.
It would settle **dates** only. By the same reply it prints **no** daily or monthly nine number, includes
no seasonal month names, and takes the solstices it does print from the Gregorian calendar, so it does not
answer the nine-number questions above, and the solstice question stays open.
The store that sells it has not yet said whether the current edition or back issues can be bought.

**The calendar day's nine number needs day-level data too, and more of it than a date check.** Janson
remarks that Tsurphu calendars restart it from the solstices — 5 on the first Wood–Mouse day after the
true astronomical winter solstice, counting up, 4 after the summer solstice, counting down. Modelling it
needs an almanac that settles what the remark leaves open: whether the solstice is astronomical or the
calendar's own, for which meridian its date is fixed, and whether a Wood–Mouse day falling *on* the
solstice counts. A printed number on a few days either side of a solstice answers all three.

## Mongolian — nothing day-level, and a structural obstacle

Leap months only, via `cross-version-leap.ts`.

Searched on 2026-08-17 without success: no machine-readable day-by-day Mongolian almanac was found.
Public Mongolian calendars are overwhelmingly *Tsagaan Sar* announcements — one date per year, which
by the argument above carries no information about `a₂` and little about anything else.

**A structural obstacle worth knowing before spending effort here.** The Mongolian calendar is not
purely computed. In 1997 the **Abbot of Gandantegchinlen decided** to insert an intercalary month,
placing Tsagaan Sar on 27 February 1998. Where a calendar is settled partly by authority, a computed
config may fail to match the official calendar *by construction*, and no choice of constants fixes
that. Establish how far the official calendar is computed before treating disagreement as a bug.

**Tested 2026-08-23, and the obstacle is softer than that paragraph implies.** `@hnw/date-tibetan`
(MIT, npm) ships a `CalendarMongolian` derived from the same Janson paper. Run from a scratch
directory outside this repo, it computes Tsagaan Sar 1998 as **27 February** — the decreed date. So
at the one point where authority is recorded as having intervened, computation and decree agree.
That does not prove there is no obstacle; it proves the obstacle is not demonstrated at the only
place this file cited for it. Two further checks the same day: 2024 comes out at 10 February, and
2025's month 1 begins on 1 March with **day 1 skipped**, both matching publicly reported Tsagaan Sar
dates.

**A candidate day-level source, and why it does not close the gate on its own.** That same library
reproduces Janson's Mongolian leap months for **all 12** of the years in
[cross-version-leap.ts](../test/fixtures/cross-version-leap.ts) where he gives a value, so it is a
faithful implementation and a fixture could be generated from it exactly as
`crosscheck-eszthoff.ts` is. But it is **the same lineage as this engine** — both derive from
Janson — so agreement would establish that the arithmetic is implemented correctly, not that the
dates match the calendar Mongolians use. Compare Bhutan, whose `BHUTAN_HENNING` was exported on one
implementation lineage and whose `BHUTAN` rests on twenty-five days of a government-published almanac.

So the realistic route to exporting a Mongolian config is: tile against `@hnw/date-tibetan` day by
day for the arithmetic, **and** find a Mongolian equivalent of `rgob.ts` — a run of officially
published Tsagaan Sar dates would be the obvious candidate, being the Mongolian fact that is
actually published. One without the other does not meet the bar
[decisions/2026-08-16-exported-means-validated.md](decisions/2026-08-16-exported-means-validated.md)
sets.

## Sources tried and rejected

Recorded so nobody spends the effort twice.

### bhutanesecalendar.com — Henning's lineage, verified rather than assumed

Checked 2026-08-23. The site's own About page states that its "Bhutanese Calendar data sourced from
Open Source Bhutanese Calendar" — Henning's software. It is a PHP site rendering **data**, not an
application running a calendar library: the only scripts it loads are jQuery and its own stylesheet.

So it is the **same lineage** as [bhutan.ts](../test/fixtures/bhutan.ts), which reaches Henning
through the `wp-plugins/bhutanese-calendar` mirror, and adds no independent evidence about Bhutanese
day numbers. `rgob.ts` remains the only non-Henning check. Worth recording because a site with its
own domain and no visible attribution looks like a second source until its About page is read.

| Source | Outcome |
|---|---|
| bhutanesecalendar.com | **Same lineage as `bhutan.ts`** — About page: "Bhutanese Calendar data sourced from Open Source Bhutanese Calendar". Cleanly parseable Unicode Tibetan numerals, 1900–2101, and worthless as corroboration. Also carries **no leap-month representation at all**: 12 months, no 13th, no flag. |
| zhemgang.gov.bt | HTTP 403, a WordPress security block, unchanged with a browser user-agent. Not retried further. |
| MoHA calendars before 2025 | Do not exist online. The Ministry publishes 2025 and 2026 only; filenames differ between years (`Calendar_2025.pdf`, `calender-2026.pdf`), so guessing URL patterns fails. The Wayback Machine holds only the 2026 PDF and has no MoHA snapshots for 2019–2021. 2001 and 2004 predate the site. |
| `lscalendars/tibcalendar` | Deferred, not rejected. A fourth implementation of the same paper, needing a C toolchain, adding no independent lineage. |
| Rangjung Yeshe Wiki (`rywiki.tsadra.org`) | **The site is unavailable; the dictionary is not.** Corrected 2026-08-25 — the same corpus is published as Wylie-keyed data elsewhere, so "settled unavailable" was a fact about this route and not about the source. See [names/rabjung-sourcing.md](names/rabjung-sourcing.md). As for this site: Behind a Cloudflare interstitial returning 403 to any programmatic request, with a declared User-Agent or a browser one alike. An earlier note calling it "machine-fetchable" was wrong. Do not work around the challenge; it is a deliberate access decision by the site. |
| BDRC etext search (`ldspdi.bdrc.io`) | **A live lead, unrealised.** Full-text search over open-access Unicode Tibetan etexts, filtered in the query to `AccessOpen`/`StatusReleased`. `Etexts_count` works — ten chunks contain two rabjung names distinctive enough that co-occurrence implies a list of the sixty, so a machine-readable Tibetan witness very likely exists. `Etexts_chunks` returned parameter metadata and no rows for every pagination spelling tried. The next step is that one API call, not another search. |
| THL (`thlib.org`) as a *witness* | Reachable and un-blocked, but the dictionary is a React SPA with no server-rendered endpoint, the legacy `translate.php` ignores query parameters, and the Mandala backend returns bot-interstitial `202`s. Its **phonetics converter** remains fully usable and is what `verify:names` and `verify:rabjung-names` depend on. |
| Sanskrit meanings from Sewell & Fleet | **Not there.** He prints the sixty saṃvatsaras as bare names against Kaliyuga years and fractional day-counts. No meaning column, and every occurrence of "translation" in the book refers to translating Siddhānta texts. It is a book about *computing* which saṃvatsara a year falls in. |

### Rabten Choeling's calendar: Henning's lunar anomaly value, method unstated

Checked 2026-09-24, after Ven. Thubten Chöying pointed to it:
[rabten.eu/en/calendar](https://www.rabten.eu/en/calendar), published by Rabten Choeling, a Gelug
centre in Switzerland. A day-by-day Phugpa grid printing each day's Tibetan number, month starts,
moon phases, sojong and the weekday–mansion element pair, in cleanly parseable HTML.

**It computes with Henning's value of `a₂`, not `1/28`.** Between 2000 and 2100, `PHUGPA` and
`PHUGPA_HENNING` give a different day number on **eight days**, in seven years, and a different
doubled-day flag alone on four more. All seven years were compared in full, with six others, 4,748
days in all: Rabten agrees with `PHUGPA_HENNING` on every day, and with `PHUGPA` on every day but
those eight — so the eight are the whole century's disagreement, not a sample of it. Only day numbers
were compared, so the four flag-only days say nothing either way. One of the eight is
**2025-11-19**, where FPMT's almanac grid, Lotsawa House, christian-steinert and eszthoff all print
9/30 doubled and Rabten prints 29. Its element pairs agree with the engine on all 4,748 days, which is
Henning's computation agreeing with itself, as with his `pl_YYYY.txt` files above.

Its editorial and app pages state no method, source or author for the calendar, so whether it
descends from Henning's software or is an independent implementation that chose his `a₂` is unknown.
Either way it adds nothing to the `PHUGPA` window, and on the only fork date the almanac covers, it
takes the side the almanac does not.

**Its day-level range is 2000–2100, not the 1900–2100 its year list suggests**, and it does not say
so. The month view silently answers a year outside that range with the nearest year inside it, and
the single-day view ignores an out-of-range date and shows today. The first pass of this comparison
reported 1900 and 1950 as compared; both pages held 2000. Check that each fetched page holds the year
requested.

**Its sojong schedule, measured 2026-09-27 over all 101 years, is the first sojong source outside
FPMT**, and it settled the counted schedule's missing piece as a candidate: every one of its 2,490
sojongs follows from a count re-anchored each year on the month-1 full moon, with no sojong on
Losar. The rule, and FPMT's 17-day departure from it in 2022, are in
[almanac-sources.md](almanac-sources.md#sojong-a-counted-schedule-once-falsified-by-a-misreading).
**Its lineage matters more here than for the day numbers.** For day numbers Rabten is Henning's
arithmetic agreeing with itself; for sojong, nothing says where its schedule comes from, so its
agreement with FPMT on 82 of 99 sojongs counts as independent only if the two do not copy one
almanac — which is unknown. The rule is fitted to Rabten, not sourced from it.

Its sojong days are now a generated fixture, `test/fixtures/rabten-sojong.ts`, and
`test/validation/rabten-sojong.test.ts` holds the `counted` form to them; the window is in
[testing.md](testing.md#rabten-choelings-sojong-schedule).
The generator found that the page marks today's day with an extra attribute after its label, which a
pattern ending at the label's closing quote silently skips.

### Bhutan's month attributes — a negative result, recorded so it is not re-walked

Searched 2026-09-10, for the animal and element each **month** of the Bhutanese year carries.
Janson gives month-animal lists for Phugpa and Tsurphu and none for Bhutan, even though `BHUTAN` and
`BHUTAN_HENNING` are both exported and day-validated, so the gap is real rather than an artefact of
not looking.

| Source | Outcome |
|---|---|
| BhutanWiki, *Bhutanese Astrology* and *Bhutanese Astrology and Divination* | Cover the 12-animal/5-element **year** cycle and the *kartsi*/*nagtsi* split. Say nothing about month attribution, and cite nothing that does. |
| General Bhutan calendar and tourism pages | The same year-cycle material, less carefully. No month attribution anywhere. |
| The Royal Government's calendars, 2025 and 2026 (the PDFs [rgob.ts](../test/fixtures/rgob.ts) cites) | **No month animal printed.** Checked 2026-09-13. Every month header read — two pages of 2025 by eye, one page of 2026 from the extracted page image — follows one template: the year's name and the span of Tibetan dates the Gregorian month covers. |
| Henning's Bhutanese calendar files (`kalacakra.org/calendar/tdata/bh_YYYY.txt`) | **Agree with Phugpa's month rules, and are not Bhutanese evidence.** Checked 2026-09-13: 332 month headers across 27 years, 12 of them leap months, all match Janson's Phugpa animal, gender and element rules, and two negative controls (the Tsurphu animal, a shifted element) each fail as they should. But the program that writes them applies those rules with no Bhutan-specific branch, beside a comment reading `HAVE NOT CHECKED THAT THIS WORKS FOR TSHUR LUGS` — which only makes sense in code written for the Tibetan versions — while code that *is* Bhutan-specific elsewhere in the same file is marked `FOR BHUTAN ONLY`. So the files show Henning's default carried over, not what a Bhutanese almanac prints. His C source (`calendar/tcb1111.zip`) was read for that provenance question only. |

**An earlier version of this section said the answer "probably exists in a document we hold"**, behind
the Royal Government PDF's missing text layer. It does not: the pages carry no month animal to read.
This is a dead end in the documents held, not a deferral.

**Nor is a Phugpa default safe by elimination.** Janson has a commented-out line in his Bhutan appendix,
citing Berzin, that the Bhutanese version follows a derivative of the **Tsurphu** system — and Tsurphu
puts the Tiger at month 1 where Phugpa puts it at month 11. His published text says only that Bhutan's
months are "numbered, as in Tibet" and that names "exist as in Tibet", which does not say which Tibet.
An independent Bhutanese source is required, and Henning's software is not one.

The consequence is recorded in [astrology.md](astrology.md) — Bhutan refuses the month and lunar-day
attributes with a coded error rather than inheriting Phugpa's.

### The lunar-mansion residual — where it is, and five explanations that fail

Measured 2026-09-14, against the 1,459 days of `fpmt-observances.ts` that carry a usable
day-quality code. The engine's mansion agrees with the element FPMT's code forces on 1,424 of them.

**Where the difference is.** Henning's daily Phugpa calendars, `kalacakra.org/calendar/tdata/pl_YYYY.txt`,
print each day's mansion and its element pair. Their mansion equals this engine's on **all 1,459
days**, and they disagree with FPMT on exactly the same 35. Henning is this engine's lineage — the
same computation Janson describes — so this is not corroboration of the calendar. It **locates** the
difference: it is not in this implementation.
The comparison is now a rerunnable harness,
[`scripts/evidence/henning-mansions/`](../scripts/evidence/henning-mansions/README.md); its current
figures are in [testing.md](testing.md).

**What the 35 look like.** The moon sits in the last 15% of its mansion on 28 of them, and on 27 of
those FPMT's element is the *next* mansion's. One sits in the first 15%; six are mid-mansion. Where the
previous mansion has a different element and the moon is in the first 10% of its own, FPMT agrees
with the engine on all 101 such days. By year: 6, 2, 5 and **22** for 2022–2025. FPMT's moon runs
ahead of the siddhānta computation, rarely before 2025 and often in it.

**Extended 2026-11-08, once FPMT had published 2026.** The same measurement over 2022–2026 is 1,784 of
1,821 days, with Henning's mansion equal to this engine's on all 1,821 and the residual now 37. The two
new days, 26 June and 17 July 2026, are mid-mansion (positions 0.56 and 0.46), so eight days fit no
pattern, not six. By year the residual is 6, 2, 5, 22 and **2**: 2026 returns to the level of 2023, so
the 2025 cluster is not a trend. Henning's file spells one mansion *gro zhin*, which this engine spells
*gro bzhin*; it is the same mansion.

| Explanation | Test | Result |
|---|---|---|
| Janson's `/27` approximation of the moon's motion | Read Janson | **Fails in principle.** He gives `moon_calendar_day = moon_lunar_day − FRAC(true_date)/27` as the almanac's own computation, and Henning uses it. It cannot separate the two. The docs blamed it until this date. |
| The karaṇa (*byed rtsis*) moon longitude, which almanacs also print | Janson's appendix on the Kālacakra Tantra version: `m₁ = 10631/360`, `s₁ = 1277/15795`, `a₁` unchanged, `m₂ = m₁/30`, `s₂ = s₁/30`, `a₂ = 1/28`, epoch values `m₀ = 2015531 + 1/2`, `s₀ = 809/810`, `a₀ = 53/252`, computed for the correct calendar day | **Fails: 29.6%**, about chance. It runs 1.13–1.32 mansions ahead of the siddhānta value. On the 35 it matches FPMT on 9. The implementation reproduces one of Janson's two commented 2013 almanac values exactly (`11 37 36`) and the other to 10 units in the third place (`21 24 52` against `21 24 42`), so the result is not an implementation slip. |
| A constant forward offset | Best offset per year, in steps of 0.005 mansion | **Fails.** 2022–2024: best offset is zero. 2025: +0.05 gives 350/365, still 15 disagreements. |
| The moon taken later in the calendar day | `moon_lunar_day − k · FRAC(true_date)/27` for `k` from 1 (start of day) down to 0 (end of lunar day) | **Fails.** `k = 1` is best for 2022–2024 and every smaller `k` is worse. 2025 peaks near `k = 0.8` at 96.2%, below the other years at `k = 1`. |
| The other value of `a₂` | `PHUGPA_HENNING` | **No change** on any year. |
| Codes copied from a neighbouring row | Code equal to the previous or next day's | **Weak.** 7 of 35 equal the previous day's and 7 the next day's, against a 9.3% base rate. Suggestive of some transcription, too few to explain the pattern. |

**Sources that could settle it, and why they did not.** FPMT's monthly pages state no source or
method for the codes, and their layout is unchanged between 2024 and 2025. Men-Tsee-Khang, whose
almanac FPMT is taken to follow, sells its almanac, pocket diary and desk calendar and publishes no daily
data. The Tibetan Nuns Project's calendars take their dates from Men-Tsee-Khang but print holy days
only. **The next step is a printed 2025 Men-Tsee-Khang almanac, or asking FPMT** where the codes come
from and whether anything changed for 2025.

### Corpus occurrence is not lexical existence

BDRC's chunk counts look like a better attestation check than an exact-title dictionary lookup,
because they work on multi-word names where a headword lookup cannot — `དུས་ཀྱི་ཕོ་ཉ` scores 232.
They were **rejected on a negative control**: `སྤེན་མ` scores 108, and that is the Saturday form
this project rejected on lexical grounds in the naming work. A count measures how often a string
appears in a corpus, which a string can do inside a longer construction, as a variant, or as a
name. A nonsense Tibetan string scores 0, so the check discriminates — just not for the property
that matters.

Any attestation check needs an **anchor that can fail**. A lookup returning "not attested" for every
row is indistinguishable from a broken HTTP client, and would be recorded as a fact about the
language rather than about our code.

## Practical notes for anyone adding a source

- **Establish lineage first.** Read the About or credits page before reading the data. One sentence
  saved a day's work here, and its absence cost one.
- **Parse markup, never a summarised rendering.** A summarising fetch misread a month-span caption
  as two months rather than three. If the source is a scan, a human reads it — OCR of a Tibetan
  numeral produces a plausible wrong date, which is worse than no data.
- **Look at the whole document.** Twelve of sixteen pages were the actual almanac.
- **Prefer irregularities.** A run of ordinary consecutive days agrees under almost any epoch error.
  One doubled day is worth a month of ordinary ones.
- **Cite the window.** Agreement without its range is the thing [testing.md](testing.md) exists to
  prevent.
