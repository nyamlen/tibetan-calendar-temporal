# Almanac sources

Where the **observance and day-attribute** data comes from — the layer beyond the date itself.

[validation-sources.md](validation-sources.md) is the companion for calendar *dates*: what the
arithmetic was checked against, and whose lineage each source belongs to.
This file covers the other half of an almanac — which days carry an observance, and what attributes
a day is held to have — because those are **conventions and citations rather than falsifiable
arithmetic**, and the evidence for them is weighed differently.

Read [roadmap.md](roadmap.md)'s Pre-v1.0.0 checklist for what is *decided*; this file records what
is *known*, and how well.

**Repo-only.** Not in `package.json#files`, so its relative links need not resolve inside the
tarball.

## What is shipped, what is a candidate, and what is recorded only

Recording a source here is not a commitment to compute it.
Three tiers, and they should not be collapsed:

| Tier | Content | Status |
|---|---|---|
| **Shipped** | The four duchens and the six monthly-cycle rules in `src/observances/default-observances.ts` | Validated against `test/fixtures/fpmt-observances.ts` for 2022–2025 |
| **Candidate** | Sojong; the elemental yoga (FPMT's FD-\*/UD-\* codes); Janson's year/month/lunar-day/calendar-day attribute sets | Sourced below. **Partly computed since 2026-09-12** — year and calendar-day attributes, the mansion and its element — and nothing exported. The attribute sets are the scope of the `./astrology` subpath |
| **Recorded only** | The hair-cutting table; NB/NCE/NF/NG/NH/NCH/NMP/NM/NPF/NWR; the Eight Mahayana Precepts; the omen window | Provenance captured so it is not re-researched. **Shipping any of it would mean this package asserts religious and astrological prescription, which is a scope decision nobody has taken** |

## Sources, and their evidentiary weight

These are not one tier of evidence.
Two are FPMT-published web pages; one is an FPMT-published PDF with a named colophon; one is
personal notes from an oral teaching, explicitly flagged by its own transcriber as possibly
containing errors; one is the paper the engine's arithmetic already comes from; one is a scholar's
own website carrying the tables that paper cites him for; and one is a third-party app that is a
comparison target rather than a source at all.
Keep them distinguishable in whatever consumes this document — do not flatten them into one
undifferentiated "FPMT says" citation.

| Source | Kind | Accessed |
|---|---|---|
| [fpmt.org/media/resources/dharma-dates/](https://fpmt.org/media/resources/dharma-dates/) | Web page, "the key" | 2026-08-28 |
| [fpmt.org/media/resources/dharma-dates/dates-explained/](https://fpmt.org/media/resources/dharma-dates/dates-explained/) | Web page, full explanations | 2026-08-28 |
| [cutting_hair_advice_lzr08.pdf](https://fpmt.org/wp-content/uploads/teachers/zopa/advice/pdf/cutting_hair_advice_lzr08.pdf) | FPMT-published PDF, translated text with colophon | 2026-08-28 |
| "Tibetan Calendar calculation of Sojong" | Unpublished personal notes from an oral teaching, held outside this repo | Supplied privately, 2026-08-28 |
| Svante Janson, "Tibetan Calendar Mathematics" (arXiv:1401.6285), Appendix E | The engine's own source, read from the LaTeX per the clean-room rule in [../CLAUDE.md](../CLAUDE.md), never PDF-extracted | 2026-08-28 |
| [zurkhai.app](https://zurkhai.app/) | Third-party consumer app and website, public pages only — **a comparison target, never a source**; see [Zurkhai](#zurkhai-a-second-witness-to-the-attribute-layer) | 2026-09-10 |
| [kalacakra.org/calendar/symlst.htm](http://www.kalacakra.org/calendar/symlst.htm) ([2021 snapshot](https://web.archive.org/web/20210515040534/http://kalacakra.org/calendar/symlst.htm)) | Edward Henning's own website, "Symbolic details of the Kālacakra calendar", last updated 3 February 2010 — the reference tables Janson cites his 2007 book for, published free by their author | 2026-09-10 |

**The key page was finally rendered on 2026-09-10, and the answer was better than expected.**
`fpmt.org/media/resources/dharma-dates/` is indeed a client-rendered shell with no legend text, as
recorded here since 2026-08-28.
What it does carry is a grid that loads the **monthly pages** at
`fpmt.org/resources/calendar/YYYY/Month.php` — the very files
`scripts/fetch-fpmt-observances.mjs` already parses.
Those cells carry the day-quality codes day by day:

```text
1  19  UD-FW GCH NM  Fire puja
2  21  UD-WA NCH NG  Naga puja
3  22  FD-FA GCH NB NMP NWR  Fire puja  Naga puja
```

So the codes were never behind a render at all — our own generator has been discarding them.
The open question this file carried ("the key page has never actually been read") is closed, and so
is the sourcing problem behind it: the external day-by-day witness for the elemental yoga needs no
new source, only a widened parser.

## The key: every day-type FPMT names

### Auspicious days

| Code | Name | When | What FPMT says |
|---|---|---|---|
| B | Buddha Day | Days 1–15 of month 1 (15th = Day of Miracles), day 15 of month 4, day 4 of month 6, day 22 of month 9 | "Karmic results are multiplied by one hundred million" |
| — | Eclipse | Astronomical, not a fixed calendar day | Solar eclipse multiplies karmic results ×100,000,000; lunar eclipse ×700,000 |
| — | Eight Mahayana Precepts | Buddha days, days 8, 15, 30 of every month, plus eclipses | Recommended for taking 24-hour vows on days of multiplied karmic effect |
| FD-EE | Favorable Day (Earth-Earth) | — | "Most auspicious" for starting activities, especially construction |
| FD-WW | Favorable Day (Water-Water) | — | "Very auspicious" for weddings, long-life rituals, increasing activities |
| FD-EW | Favorable Day (Earth-Water) | — | "Very auspicious" for joyful events — weddings, promotions |
| FD-FF | Favorable Day (Fire-Fire) | — | "Auspicious" for wealth rituals and activities providing material support |
| FD-AA | Favorable Day (Air-Air) | — | "Auspicious" for starting a spiritual practice or a journey |
| FD-FA | Favorable Day (Fire-Air) | — | "Auspicious" for hanging prayer flags (except on NPF days) and spiritual practice |
| — | Fire Puja | Multiple monthly days | "Wrong days can cause sickness and obstacles" — the source names no specific day list |
| — | Full Moon | Day 15 | "Good for practice" |
| — | Medicine Buddha Puja | Days 8 or 15 of every month | Recommended |
| — | Naga Puja | "One or more days in most months" | Good for naga pujas — no day numbers given |
| — | New Moon | Day 30 | "Good for practice" |
| PF | Prayer Flags | — | Good for hanging prayer flags |
| PP | Prayers and Practices | — | Good for spiritual practice |
| — | Protector Puja | Day 29 of every month | — |
| — | Sojong | "Usually falls at middle and end of every Tibetan month" | See [Sojong](#sojong-the-one-candidate-rule-so-far-is-falsified) — the site names no rule for *which* |
| — | Tara Puja | Day 8 of every month | Recommended |
| — | Tsog Offering | Days 10 and 25 of every month | A commitment for anyone with a Highest Yoga Tantra initiation |

### Inauspicious days

Recorded only — see the tier table above.

| Code | Name | Days |
|---|---|---|
| NB | No Starting New Business Activity | 2, 12, 22 |
| NCE | No Community Event | 10, 20, 30 |
| NF | No Funeral or Cremation | 8, 18, 28 |
| NG | No Inviting Guests for Party | 1, 11, 21 |
| NH | No Starting to Build New House | 6, 16, 26 |
| NCH | No Cutting Hair | 1, 2, 6, 7, 12, 16, 17, 20, 21, 24, 25, 28, 29, 30 |
| NMP | No Medical Procedure | 4, 8, 11, 15, 18, 22, 25, 29 |
| NM | No Memorial or Wake | 9, 19, 29 |
| NW | No Wedding | 7, 17, 27 |
| NWR | No Wealth Ritual | **Not a fixed-day rule at all** — see [NWR and GCH](#nwr-and-gch-two-codes-the-day-lists-do-not-explain) |
| UD | Unfavorable Day | Not good for starting important activities |
| UD-EA | Unfavorable Day (Earth-Air) | Can decline wealth and property; risk of shortened life span or sickness |
| UD-WA | Unfavorable Day (Water-Air) | Can harm or sever relationships; risk of disagreement and disharmony |
| UD-EF | Unfavorable Day (Earth-Fire) | Can cause suffering; risk of trouble and unhappiness |
| UD-FW | Unfavorable Day (Fire-Water) | "Most inauspicious" — can weaken vitality |
| VUD | Very Unfavorable Day | Not good for starting important activities or medical procedures |

### FD-\*/UD-\* is Janson's "elemental yoga," exactly

Found 2026-08-28 from the LaTeX source: Janson's Appendix E, §"Elemental yoga," gives a formula that
reproduces these ten codes exactly.
Each day of week carries one of four elements (`{earth, fire, water, wind}`; his day-of-week table
gives Sat=earth, Sun=fire, Mon=water, Tue=fire, Wed=water, Thu=wind, Fri=earth, from
`(JD+2) mod 7`), and each of the 27 lunar mansions also carries one of those four.
A calendar day's yoga is the **unordered pair** of the two — `C(4,2) + 4 = 10` possible pairs.

FPMT's ten codes are precisely those ten pairs: the four same-element pairs (FD-EE, FD-WW, FD-FF,
FD-AA) are all favorable, and of the six mixed pairs, FD-EW and FD-FA are favorable while UD-EA,
UD-WA, UD-EF and UD-FW are not.

**What is computable, and the one real gap.**
The weekday element and its formula are Janson's own, and the lunar-mansion number
(`⌊27 × moon_calendar_day⌋`) derives from true lunar and solar longitudes this engine already
produces.
But two pieces are Janson's by *citation* rather than derivation: the table mapping each of the 27
mansions to one of the four elements, and the names and favorability of the ten yogas, are both
cited to Henning.

**This is not a clean-room or sole-source problem, and reading it as one cost time on 2026-09-03.**
Henning is independently published scholarship this repository already cites elsewhere, and Janson
offers no competing version of that table — he states he does not derive it.
That is an ordinary citation chain, not two sources disagreeing about one number.
See [../CLAUDE.md](../CLAUDE.md), where the sole-source rule is now scoped to the arithmetic
explicitly for this reason.
The real cost is narrower: the table has to be transcribed from a second work, with its own
provenance recorded, before FD-\*/UD-\* can ship.

**Both pieces were sourced on 2026-09-10, and not from the book.**
Henning published them himself at
[kalacakra.org/calendar/symlst.htm](http://www.kalacakra.org/calendar/symlst.htm): the
mansion-to-element list, explicitly "from the Indian system — this is different in the Chinese
tradition", and the ten elemental yogas with their Tibetan, Sanskrit and English names.
The ten are reproduced in [astrology.md](astrology.md), which is the reader-facing account of the
whole attribute layer.
**Favorability is in neither Janson nor Henning** — Henning gives names and senses, not a verdict —
so FPMT remains the sole witness for which pairs are favorable, exactly as it already is for the
observance rules.

Three traps in that page, all of which would produce a plausible wrong answer:

- **It lists 28 mansions, not 27.** Abhijit sits at position 23, and Janson numbers the mansions
  0–26. The elements run 7/7/7/7 across the 28, so dropping Abhijit (earth) leaves 6 earth against 7
  of each other — the drop is identifiable and must be asserted rather than assumed, because getting
  it wrong shifts every element from Dhaniṣṭhā onward with nothing looking wrong.
- **Three different things on that one page are called "yoga"**: the 27 sun-plus-moon-longitude
  yogas, the 28 weekday×mansion yogas, and the 10 elemental yogas. Janson separately warns that the
  first two get confused.
- **The site is HTTP-only.** Its TLS certificate is for `*.your-server.de`, so every HTTPS fetch
  fails outright. Henning died in 2016 and the page was last updated in 2010, so treat it as at
  risk: the source table above therefore carries a **Wayback snapshot from 15 May 2021** beside the
  live URL, checked on 2026-09-12 to still contain both the mansion list and the ten yogas. Cite the
  live page, and fall back to the snapshot if it goes.

**The correspondence was then confirmed against FPMT's own calendars, and it found errors in them.**
For every day of 2024 and 2026 carrying a code, the weekday element computed from the Julian day
should be one of the two elements the code names.
670 days carried a code and **666 matched**.
The four exceptions are errors in FPMT's calendar rather than in the model:

| Date | Printed | Why it cannot be right |
|---|---|---|
| 2024-09-12 | `UD-EW` | Not one of the ten at all — earth + water is *yauvana*, favorable, printed elsewhere as `FD-EW` |
| 2026-04-22 | `UD-EF` | Weekday element is water, in neither position |
| 2026-04-23 | `UD-EF` | Weekday element is wind; also the second of two consecutive identical codes, which is impossible because the weekday element changes daily |
| 2026-04-29 | `UD-EF` | Weekday element is water, in neither position |

That these are *findable* is the strongest argument for computing the layer rather than
transcribing it, and it is why the validation suite needs a known-source-errors allowlist rather
than a tolerance — asserted exhaustive, so a further divergence fails loudly instead of quietly
joining a list of excuses.

**A second, independent check found three more, 2026-09-12.** The check above tests the *pair*; this
one tests the **prefix**. `FD-` means favorable and `UD-` unfavorable, so each of the ten pairs should
always carry the same prefix — and in 2022–2025 four days break that, each contradicted by its own
calendar:

| Date | Printed | The same pair elsewhere in the same fixture |
|---|---|---|
| 2024-01-21 | `UD-FF` | `FD-FF` on 101 days — fire + fire is *pragati*, favorable |
| 2024-02-27 | `UD-FA` | `FD-FA` on 172 days — fire + wind is *balayukta*, favorable |
| 2024-03-18 | `FD-WA` | `UD-WA` on 161 days — water + wind is *pratikūla*, unfavorable |
| 2024-09-12 | `UD-EW` | `FD-EW` on 196 days — earth + water is *yauvana*, favorable; the one already in the table above |

**The asymmetry is what makes this a finding about FPMT rather than about us.** A favorability table
with a row backwards would disagree on *every* day carrying that pair; each of these is outvoted by
more than a hundred occurrences in the same source. `test/validation/fpmt-observances.test.ts`
asserts that ratio rather than merely excusing the four, so a genuine table error cannot hide in the
allowlist.

It also reaches where the mansion check cannot: it reads FPMT's own two letters, so the 3.9% mansion
residual has no bearing on it, and the favorability table is the one piece of this layer with an
external agreement better than 99.7%.

### NWR and GCH: two codes the day lists do not explain

**NWR (No Wealth Ritual) is not a fixed-day rule, which is why no day list was ever found.**
This file recorded it as "the site names the code but not the days — unresolved".
Across 2025 and 2026 NWR lands on **17 distinct Tibetan day numbers** (1–11, 16, 19, 21, 22, 23,
29), which no monthly rule of the NB/NCE/NF shape can produce.
So the question was mis-framed rather than unanswered: NWR is computed per day, like the yoga, and
finding it needs the attribute layer rather than another page of the website.
The same reasoning applies to Fire Puja, whose "multiple monthly days" have never resolved either.

**GCH is a code this repository had never recorded, and FPMT defines it nowhere.**
It appears **166 times in 2026** and on no key page or explanation page.
Its day set across 2025–26 is the complement of NCH's forbidden list bar a single stray 20, and it
matches the positive rows of the hair-cutting table below almost exactly.
The obvious reading is "good day for cutting hair" — but **that is a hypothesis, not a definition**,
and it is recorded here as one. Nothing may ship on it until FPMT states it.

### NPF — No Prayer Flags, the one code with a full month table

Recorded only.
Hanging prayer flags on the wrong day is said to bring continuous obstacles, and unlike NWR the site
does give the day list, grouped by month-mod-4:

| Months | Prohibited days |
|---|---|
| 1, 5, 9 | 10, 22 |
| 2, 6, 10 | 7, 19 |
| 3, 7, 11 | 4, 16, 28 |
| 4, 8, 12 | 1, 13, 25 |

### The bad/good omen window

Recorded only.

- **Nine Bad Omens** — begins noon on day 6 of month 11, ends noon on day 7.
  Traditionally inappropriate for starting projects or retreats; Tibetans customarily play games
  instead.
- **Ten Good Omens** — the following 24 hours, noon on day 7 to noon on day 8 of month 11.
  "Very auspicious for starting projects, retreat, etc."

### Calendar mechanics FPMT states

"Special days which fall on double days are usually celebrated on the second day, but may be
celebrated on the first day if it is more convenient. Special days which fall on missing days are
usually celebrated on the preceding day."

This is the convention `DEFAULT_OBSERVANCES` encodes as `doubledDay: "second"` / `skippedDay: "preceding"` — and
the Phase 3 finding stands: the *monthly cycle* rules (Tara, Medicine Buddha, Tsog, Protector) do
not follow this guidance in FPMT's own printed calendars, which instead track the printed day number
literally, so a doubled 8th is observed twice and a skipped 25th is simply not observed that month.
Assume the same of every monthly-cycle row above until checked against a rendered calendar.

## What Janson's Appendix E has that FPMT's list does not

FPMT's list is a narrow, practice-oriented slice of a much larger Sino-Tibetan and Indian
astrological attribute system that Janson describes in full and — with the elemental-yoga exception
above — derives entirely himself, in closed form rather than as tables to transcribe.
None of the following appears anywhere on fpmt.org.

| Attribute set | What it carries | Computable from Janson alone? |
|---|---|---|
| **Year** | Power, life, body, fortune and (sometimes) spirit element; central, life and power number | Yes — closed forms from the Gregorian year number |
| **Month** | Animal, gender, element, number | Yes — cyclic, closed forms |
| **Lunar day** | Animal, element, trigram, number | Yes — cyclic within each month, closed forms |
| **Calendar (solar) day** | Element, gender, animal, trigram, number | Yes — closed forms from the Julian day number |
| **Elemental yoga (= FPMT's FD-\*/UD-\*)** | One of 10 favorable or unfavorable pairings | Partially — the mansion-to-element table and the yoga names are Henning's |

This attribute system is the scope of the planned `./astrology` subpath; see
[roadmap.md](roadmap.md)'s Pre-v1.0.0 checklist.
**Janson's Appendix D ("Planets") is deliberately excluded** from it — planetary longitudes are
continuous, iterative astronomy serving muhurta-style timing work, a different undertaking with its
own validation burden, recorded under Beyond v1.

## Sojong: the one candidate rule so far is falsified

Sojong (*sojong* གསོ་སྦྱོང་; Sanskrit *poṣadha* पोषध) is deliberately unshipped.
A fixed 15th-and-30th rule misses 38 of FPMT's printed occurrences over 2022–2025 and invents 36.

An oral teaching supplied on 2026-08-28 gave, for the first time, a *rule* rather than a fixed day:

- 24 Sojongs occur in a normal year; one is replaced by *gaye*, the end-of-rains-retreat observance,
  leaving 23.
- Every waxing (full-moon) Sojong is a **15th**.
- Of the twelve waning (dark-moon) Sojongs, six are 15th and six are 14th.
- The simple form: **Sojong at the end of an odd month falls on the 14th; at the end of an even
  month, on the 15th.**
- The reason given for 14 versus 15: a lunar day is not a solar day, which is the same difference
  the doubled and skipped day mechanism already models.

**Run against the seven-row divergence table in [roadmap.md](roadmap.md) on 2026-09-04, it fails.**
`isoToTibetan` was used to resolve each date, and the rule was tested under three readings of "which
month":

| Reading of "month" | Rows matched |
|---|---|
| Nominal month number | 4 of 7 |
| True sequential lunation | 2 of 7 |
| Position within the year, counted from Losar | 2 of 7 |

The failures are not edge cases.
The 2026-06-14/15 pair is an ordinary non-leap month where the rule predicts Sojong on the 30th and
none on the 29th, and FPMT prints exactly the reverse.

**Verdict: this candidate does not reproduce FPMT's calendar and must not ship.**
The likeliest explanation is that the notes are incomplete — their transcriber
(Thubten Chöying / Sarah Brooks) states plainly that any errors are hers, and the "simple form"
above may not match the fuller rule stated earlier in the same document.
Sojong remains wanted; it needs a different or corrected source.

## No cutting hair: the day-by-day table

Recorded only.
FPMT's NCH code gives only which days are *forbidden*; this is a different and richer source — Lama
Zopa Rinpoche's translation of "the Sutra Chapter of Bodhisattva's Hair," giving a stated
*consequence* for each of the 30 days, for monastics and lay people alike.

| Day | Result | Day | Result |
|---|---|---|---|
| 1 | Short life | 16 | Thirst |
| 2 | Many diseases | 17 | Flesh will turn blue |
| 3 | Wealth will come | 18 | Will receive possessions |
| 4 | Good complexion | 19 | Will meet good people |
| 5 | Possessions will increase | 20 | Hunger and thirst |
| 6 | Will be sued (court case) | 21 | Diseases |
| 7 | Complexion will disappear | 22 | Will find food and water |
| 8 | Long life | 23 | Good will come |
| 9 | Will meet youthful people | 24 | Eye pain |
| 10 | Great power | 25 | Contagious diseases |
| 11 | Sharp intelligence | 26 | Will always be happy |
| 12 | Danger to one's life | 27 | Virtue will increase |
| 13 | Good for all living beings | 28 | Fighting and quarrelling |
| 14 | Will become wealthy | 29 | Life/spirit potential will wander |
| 15 | Auspicious | 30 | Will meet the dead reborn as spirits in human form |

**This does not agree with the NCH code list**, which names 14 forbidden days (1, 2, 6, 7, 12, 16,
17, 20, 21, 24, 25, 28, 29, 30).
Day 21 is plainly negative here and is not on NCH's list; day 9 is neutral-to-positive and is not
forbidden either.
The two are different framings — a flat prohibited/permitted code, and a table of stated
consequences — and must not be silently merged into one rule if either is ever computed.

Colophon, in full: translated by Lama Zopa Rinpoche, Crestone, Colorado, June 2008; scribed by Ven.
Holly Ansett; lightly edited and formatted by Ven. Gyalten Mindrol, FPMT Education Services,
September 2008.

## Zurkhai: a second witness to the attribute layer

[zurkhai.app](https://zurkhai.app/) is a free consumer calendar — website plus an iOS app
(`id6772695315`), with Android in a closed beta — published in English, Russian and Mongolian.
It matters here because it publishes, day by day, most of the layer this file otherwise has only
FPMT for: element-animal per day, lunar mansions, tithi, the sixty-year cycle, and day-quality
guidance for twelve named activities.
Until now the elemental attributes had exactly one witness, and that witness was FPMT's
`FD-*`/`UD-*` codes.

**It is a comparison target, not a source, and the distinction is the whole entry.**
Janson's Appendix E stays the source for anything this engine computes.
What Zurkhai offers is something to check computed output *against* once `./astrology` exists —
the same footing as the date cross-checks in
[validation-sources.md](validation-sources.md), where computed dates are compared and no code is
read.
Seeding data from its day-quality tables would be something else entirely: a curated list of which
days suit cutting hair is closer to a compilation than to a fact, the app states no licence, and it
is someone else's work.

**What it states about its own method, in full.**
One sentence: *"The calculations on this site follow the Phugpa school, the standard for most of
these traditions."*
On the hard cases it says the count is *"read from the Phugpa almanac rather than computed by
simple counting"*, and elsewhere that *"Exact dates vary by lineage; confirm with a published
almanac."*
It names no scholar, no almanac edition, no repository and no API.
That is a tradition, not a provenance — which is why it is recorded here and **not** in
[validation-sources.md](validation-sources.md): agreement is only evidence if the source did not
reach its answer the way an existing one did, and nothing published tells us whether this descends
from Henning.
A fourth Phugpa cross-check in Henning's lineage would add a row and no confidence.

**Its dates agree with ours where checked**, which is worth recording even though it cannot count as
corroboration.
Its December 2026 page gives 16 December as lunar day 7 and 17 December as day 8 of month 11,
marks the 17th as a Medicine Buddha day, and shows 23 December as day 14 against 24 December as day
16 — the skipped 15th this engine also computes.
Checked 2026-09-10, prompted by a secondhand claim that Tara puja fell on 16 December; three
existing cross-check fixtures say the same thing, and this was the only one of the four that also
carried the observance label.

Two things are unresolved and are tracked in [roadmap.md](roadmap.md): its App Store metadata, which
rate-limited on both attempts, and its lineage.

## Open questions

- **What determines an NWR or a Fire Puja day.**
  Both were recorded here as "the site names the code but not the days".
  That framing is now known to be wrong for NWR — it is not a fixed-day rule, so no list exists to
  find, and the same is likely true of Fire Puja.
  Answering either needs the computed attribute layer, not another page of the website.
- **What GCH means.** Undocumented by FPMT and used 166 times in 2026; the "good day for cutting
  hair" reading above is a hypothesis this repository has not confirmed.
- **NCH and the hair-cutting table disagree in scope**, as above.
- **Sojong needs a different or corrected source.**
  The 2026-08-28 candidate is falsified, not merely unconfirmed; do not re-test it without new
  material.
- **Zurkhai's lineage is unknown**, and that is what keeps it out of
  [validation-sources.md](validation-sources.md).
  It states "the Phugpa school" and cites no scholar, almanac edition or repository.
  Establishing it would promote a comparison target to a possible cross-check; failing to establish
  it is itself a result worth writing down, not a reason to use it anyway.
- **Zurkhai's App Store metadata has never been read.**
  Two fetches of `apps.apple.com/us/app/id6772695315` returned HTTP 429 on 2026-09-10, so the
  seller, version and release date are unknown, and
  [other-implementations.md](other-implementations.md)'s entry is incomplete without them.
- **Tibetan-script sourcing here is deliberately thin.**
  Only *sojong* carries a script rendering, taken from [../CLAUDE.md](../CLAUDE.md), which sources
  it independently.
  Every other Tibetan term is left in English or in the phonetic spelling its source used, rather
  than attaching a rendering this document cannot verify — this repository's rule that a single
  source is not sufficient evidence for a name applies here too.
