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

## Phugpa

| Source | Lineage | Format | Coverage | Settles |
|---|---|---|---|---|
| `crosscheck-lotsawa.ts` | independent impl. | HTML grid | 1,831 days, 2023–2027 | day numbers, doubled/skipped marks |
| `crosscheck-steinert.ts` | independent impl. | JSON API | 1,461 days, 2024–2027 | day numbers, doubled + leap-month flags |
| `crosscheck-eszthoff.ts` | independent impl. | npm package, run not read | 1,826 days, 2023–2027 | day numbers |
| `fpmt-observances.ts` | **almanac** (Men-Tsee-Khang) | HTML tables | 1,461 days, 2022–2027 | day numbers — the source that settled `a₂` |
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

## Bhutan

| Source | Lineage | Format | Coverage | Settles |
|---|---|---|---|---|
| `bhutan.ts` | **Henning** | SQL tuples via a WordPress plugin | 11,323 days, 2000 – early 2030 | day numbers, months, leap months |
| `rgob.ts` | **almanac** (Ministry of Home Affairs) | scanned PDF, hand-read | 25 days, 2025–2026 | day numbers, 3 skipped + 2 doubled days, Losar |
| `cross-version-leap.ts` | Janson | LaTeX, generated | 2000–2030 | leap-month numbers and years |

`bhutan.ts` provides the breadth and `rgob.ts` provides the **independence** — it is the only
non-Henning check on Bhutanese day numbers here. Its rows were chosen for the doubled and skipped
days, which is where Janson §8 warns published tables go wrong.

**`a₂` is NOT settled for Bhutan.** `BHUTAN` and `BHUTAN_HENNING` agree on all 25 government-published
days, and the 11,323-day fixture validates `BHUTAN_HENNING` only because it descends from Henning —
which is circular. Settling it needs a Bhutanese day-by-day grid covering **2001-12-10, 2004-04-10 or
2020-04-23**, the three days in the fixture window where the two values disagree.

### The Drukpa Kagyu app — unresolved, and possibly a different calendar

Day numbers from a Drukpa Calendar App were checked on 2026-08-17 against all three divergence dates.
The result does not fit either config, and the file records it rather than forcing it:

- Where our two configs **agree**, the app agrees with them.
- On two divergence dates it matches **`BHUTAN_HENNING`** — 2001-12-10 as day 26, 2004-04-10 as day
  21, where `1/28` gives 25 and 20.
- But its **doubled days sit one number higher and one day later** than either config produces: it
  doubles day 2 across 24–25 April 2020 where we double day 1 across 23–24, and day 7 across 21–22
  December 2001 where we double day 6 across 20–21.

Neither `a₂` value produces that pattern, so the likeliest explanation is that this is **not Bhutan's
state calendar**. Janson, citing Berzin in a passage present only as a LaTeX comment, records that
Drukpa Kagyu follows *Cahtuḥpīṭha-Kālacakra* चतुःपीठ-कालचक्र, a Tsurphu derivative begun by Drugchen
Pemakarpo in the late 16th century — potentially a fourth system, distinct from the calendar the
Ministry of Home Affairs publishes.

**The test that would resolve it** is app data for a date the Royal Government also publishes: if the
app doubles day 21 across 19–20 January 2025, it is the state calendar and `a₂` for Bhutan is settled
in Henning's favour; if it doubles day 22, it is a different system and cannot be used for Bhutan.
Until then, no conclusion is drawn.

## Tsurphu — nothing day-level

Leap months only, via `cross-version-leap.ts`. No date has ever been checked.

The source Janson names is **Rumtek monastery's** published calendar — Rumtek is the Karmapa's main
exile seat, and Tsurphu is the Karma Kagyu system. Note that kalacakra.org also publishes "Open source
Tsurphu calendar software", so any online Tsurphu calendar must be checked for that lineage before
being treated as independent.

Do not use a Drukpa Kagyu source for Tsurphu. Drukpa follows the derivative described above; Drikung
Kagyu follows a Tsurphu/Phugpa hybrid. Neither is Tsurphu.

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

## Sources tried and rejected

Recorded so nobody spends the effort twice.

| Source | Outcome |
|---|---|
| bhutanesecalendar.com | **Same lineage as `bhutan.ts`** — About page: "Bhutanese Calendar data sourced from Open Source Bhutanese Calendar". Cleanly parseable Unicode Tibetan numerals, 1900–2101, and worthless as corroboration. Also carries **no leap-month representation at all**: 12 months, no 13th, no flag. |
| zhemgang.gov.bt | HTTP 403, a WordPress security block, unchanged with a browser user-agent. Not retried further. |
| MoHA calendars before 2025 | Do not exist online. The Ministry publishes 2025 and 2026 only; filenames differ between years (`Calendar_2025.pdf`, `calender-2026.pdf`), so guessing URL patterns fails. The Wayback Machine holds only the 2026 PDF and has no MoHA snapshots for 2019–2021. 2001 and 2004 predate the site. |
| `lscalendars/tibcalendar` | Deferred, not rejected. A fourth implementation of the same paper, needing a C toolchain, adding no independent lineage. |

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
