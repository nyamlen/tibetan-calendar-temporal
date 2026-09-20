# Testing Strategy

Correctness is this project's entire value proposition — practitioners have to be able to
trust the dates. Three tiers, all run in CI.

## Layout

```text
test/
├── computation/          # named for a src/computation module, or <module>-<concept>
├── observances/          # named for a src/observances module — index.ts is the engine
├── validation/           # Tier 2, cross-checks against external sources
├── fixtures/             # generated — from Janson, and from external implementations
├── invariants.test.ts    # year lengths, safe-integer bound, §13 period
├── regression.test.ts    # Tier 3, named instances of each edge case
├── navigation.test.ts    # arithmetic, the coordinate, the phases — and the naive versions
├── cycles.test.ts        # the year-name closed forms, including outside the exact range
├── leap-month-position.test.ts  # cross-cutting: calendar, scaling, months, observances
├── tradition-config.test.ts  # cross-cutting: what a config does at the engine's boundary
├── public-api.test.ts    # the export surface, pinned
├── readme.test.ts        # every example the README states
├── smoke.test.ts         # Temporal reachable as a global
└── check-conventions.mutations.ts  # npm run test:conventions only — not part of npm test
```

`check-conventions.mutations.ts` is not a `.test.ts` on purpose, so the default Vitest config never
collects it. Its subject is `scripts/check-conventions.mjs` rather than the engine: it breaks each
convention in a scratch copy of the working tree and asserts the checker reports it. CI runs it on
every push through `vitest.conventions.config.ts`.

Tiers 1 and 3 are interleaved with the unit suites rather than kept in separate directories —
a property and the edge case it generalises belong next to the function they constrain.

**Naming a module suite.** A directory under `test/` that mirrors one under `src/` holds suites
named for the modules in it, optionally narrowed to a concept as `<module>-<concept>` — so
`calendar-leap-index-threshold.test.ts` is a `calendar.ts` suite about one rule, and
`test/observances/index.test.ts` is the suite for the engine in `src/observances/index.ts`. The match is on the
longest module prefix, **not** the first `-`-delimited segment: `mean-astronomy.ts` is the one
hyphenated module, and a segment rule rejects `mean-astronomy.test.ts`, which is already correct.

A suite whose subject spans several modules is not a module suite and belongs at `test/` root
beside `invariants.test.ts`. `leap-month-position.test.ts` is the case: it reaches into `calendar`,
`scaling`, `months` and `observances`, so naming it for any one of them would promise a subject it
does not have — the same false promise the validation-suite rule catches one directory over.

`tradition-config.test.ts` is the second case, moved out of `test/validation/` on 2026-09-12. It
validated **nothing external** — no source, no lineage, no agreement claim — and it imported no
fixture, which is why the naming rule never fired on it and nobody ever recorded it as seen. Its two
halves look separable and are not: the search-window block builds configs with *wider correction
tables* to check that `searchHalfWidth` is **derived from the config rather than hardcoded**, which
is the same question the validation block asks from the other side. One subject — what a
`TraditionConfig` does at the engine's boundary — spanning `traditions/validate` and
`computation/scaling`, so it is named for the concept and lives at the root.

Moving it does not weaken the export gate: every shipped config is imported by other suites in
`test/validation/` — `PHUGPA` by four of them, `PHUGPA_HENNING` by three — so the rule that ties an
exported config to external evidence still holds without it.

**`index` is a valid module name, deliberately.** `src/observances/index.ts` carries the engine
rather than being a bare barrel, so `test/observances/index.test.ts` is the honest name for its
suite; forbidding `index` would leave no legal name and force `observances.test.ts`, a *concept*
name in a module-parity directory — the exact drift this rule exists to catch. It loosens nothing:
in a mirrored directory whose `src/` side holds only `index.ts`, every other suite name is still
rejected. It is also a permission exercised once rather than routinely — `src/astrology/index.ts`
is planned as a pure barrel, with the logic in modules beside it.

**Before renaming or moving a suite, capture the inventory.** Not the count — the inventory:

```sh
npx vitest list --json > tests-before.json
```

A renamed file that stops being collected is silent, and this suite's count has quietly inflated
once already, reporting 669 tests where 641 existed. But a bare count catches only *loss*. It cannot
see **misplacement** — a file that moved somewhere unintended and is still collected keeps the total
identical. Diff the per-file inventory afterwards and expect exactly the moves you made: the
2026-08-17 sweep moved four files and the diff showed four, each with its test count carried across.

One trap worth knowing: **`--reporter=json` is accepted here and silently emits plain text.** It
appears in `vitest list --help` because `list` inherits the shared option set, but `list` has its own
`--json`, which is the flag that works. Nothing warns you; you simply get text where you expected
JSON.

**Naming a validation suite.** A test whose subject is the engine's **agreement with an external
source** is named for the fixture — or the fixture **prefix** — it validates, and lives in
`test/validation/`. So `janson-epoch.test.ts` covers one fixture, `fpmt.test.ts` covers the two
`fpmt-*`, `crosscheck.test.ts` covers the three `crosscheck-*`, and `bhutan.test.ts` covers
`bhutan.ts`. The parity is the point: a reader can find the test for a fixture without opening
anything.

**A validation suite is never named for a tradition**, and `bhutan.test.ts` is the trap. It looks
tradition-named, but it is named for `test/fixtures/bhutan.ts` — Bhutan is simply the one tradition
whose fixture happens to carry its name. So the absence of a `phugpa.test.ts` is the rule working,
not a gap: Phugpa has no eponymous fixture, and its day-by-day evidence arrives as `fpmt-*` and
`crosscheck-*`. What holds an exported config to its evidence is the separate rule that every
config exported from the barrel must be *referenced* by some suite in `test/validation/` — `PHUGPA`
is named in five of them.

The exclusion matters as much as the rule. **Using a fixture as input does not make a test a
validation test.** `test/computation/conversion.test.ts` imports `losar` and
`test/computation/epoch.test.ts` imports `sixty-year-cycle`, but their subject is a module, so they
are named for the module and stay where they are. A sweep that moved them would be applying the rule
to the wrong half of the suite.

**That edge case was real, and it is now fixed.** `test/validation/observances.test.ts` imported
`fpmt-observances` while its subject was the observance *engine*. It sat in `validation/` because
`src/observances/` had nowhere else to put a module suite, and it needed a hand-written exemption to
stop the naming rule firing on it — an exemption recorded here, until 2026-09-12, as "seen, not
missed".

The cause was the sanctioned directory set being **hardcoded** as four names, of which only
`computation` was a module-suite mirror. A directory under `test/` now earns its place by
**mirroring one under `src/`**, so the suite could be split along the seam it always had:
`test/validation/fpmt-observances.test.ts` holds the half that checks our labels against FPMT's
printed calendars, and `test/observances/index.test.ts` holds the half whose subject is the engine —
resolution, the span cap, argument and config validation, freezing. The exemption is deleted, and
the rule was proved by mutation to still fire with the allowlist empty, because an allowlist emptied
by a refactor is a standard way to make the rule consulting it vacuous.

`test/bench/` is still rejected, and now for a stated reason rather than by omission from a list:
there is no `src/bench/`, and a benchmark is neither a module suite nor an external-source suite.

**Fixture provenance.** `test/fixtures/losar.ts`, `sixty-year-cycle.ts` and `janson-epoch.ts` are
**generated**, not hand-written: run `node scripts/extract-janson-fixtures.mjs <path-to-tibet.tex>`
to regenerate all three from the paper's LaTeX. Do not edit them by hand. Transcribing 120 dates
manually is precisely how a silent one-day error enters the primary correctness gate.

## Tier 1: Property-Based Tests (fast-check)

Mathematical invariants that must hold for all valid inputs:

- **Round-trip**: `∀ ISO date d: isoToTibetan(d).isoDate === d`
- **Monotonicity**: consecutive ISO dates map to non-decreasing Tibetan day numbers
- **Month bounds**: every Tibetan year has 12 or 13 months
- **Day bounds**: every Tibetan month has 29 or 30 civil days
- **Skipped days are never observance days** — a constraint on the *output*, satisfied by both
  skipped-day conventions
- **Leap month has same number as following main month**

## Tier 2: Fixture Validation

Cross-reference against known-good sources. Curate validation data from multiple independent
sources and assert the engine matches.

**Validation sources:**

| Source | URL | What it provides | Status |
|--------|-----|-----------------|--------|
| **Lotsawa House Phugpa Calculator** | <https://www.lotsawahouse.org/Static/tools/phugpa.html> | Whole-year day-by-day grid, marking skipped (`*`) and doubled (`+`) dates | **In use** — `crosscheck-lotsawa.ts`, 1,831 days, 2023–2027 |
| **christian-steinert TibetanBuddhistPracticeDates** | <https://practicedates.christian-steinert.de> | JSON API `/dates/YYYYMMDD-YYYYMMDD` giving day numbers plus doubled and leap-month flags | **In use** — `crosscheck-steinert.ts`, 1,461 days, 2024–2027 |
| **FPMT Dharma Practice Dates** | <https://fpmt.org/media/resources/dharma-dates/> | Practice days prepared from the Men-Tsee-Khang almanac — the authoritative Gelug reference | Practice days only; see the note on what it cannot settle |
| **eszthoff/tibetan-date-calculator** | <https://www.npmjs.com/package/tibetan-date-calculator> | TypeScript, Phugpa, implements Janson — installed outside the repo and executed, never read | **In use** — `crosscheck-eszthoff.ts`, 1,826 days, 2023–2027 |
| **lscalendars/tibcalendar** | <https://github.com/lscalendars/tibcalendar> | C library, reference implementation for Tibetan calendrical calculations | **Deferred.** A fourth implementation of the same paper, needing a C toolchain, adding no independent tradition line |

> **Clean-room note.** Running these to compare *outputs* is permitted — dates are facts, not
> copyrightable expression. Reading their source is not. See [CONTRIBUTING.md](../CONTRIBUTING.md).

> **The `a₂` fork is settled — these sources do not straddle it.** Resolved 2026-08-12; see
> [decisions/2026-08-12-lunar-anomaly-a2-default.md](decisions/2026-08-12-lunar-anomaly-a2-default.md).
>
> Janson §7 records two values for the lunar anomaly's daily increment `a₂`: almanacs use
> `1/28`, while Henning uses the exact `3781/105840`. They disagree on roughly one day in 4,100 days
> — Janson counts 9 divergences in 1900–1999 and 8 in 2000–2099, but 16 in the single cycle
> 1027–1091, so the rate is not uniform and back-projection is worse.
>
> An earlier draft of this file claimed Christian Steinert and Lotsawa House descend from
> Henning's line. **Both were checked against Janson's three divergence dates — 2001-02-10,
> 2006-05-10, 2025-11-19 — and both follow `1/28`**, agreeing with the Men-Tsee-Khang almanac
> and with each other. Fixtures may be curated from all these sources together.
>
> Two things that carry **no** information about the fork, so do not reach for them: Janson's
> Losar table, which both values reproduce in full, and any list of *practice days*. The 11
> divergences in 1950–2050 are each self-correcting within a day — the two values disagree
> about which number is doubled or skipped, never about where a month boundary falls. Only a
> day-by-day grid printing the doubled number is evidence.

### Non-Phugpa traditions: leap months only, and that is not a hedge

Every source above is Phugpa. Since 2026-08-16 there is one external check covering the other three
versions — `test/validation/cross-version-leap.test.ts`, against Janson's four-version leap-month
table, extracted mechanically into `test/fixtures/cross-version-leap.ts`.

It is possible because **leap months depend on nothing astronomical.** The intercalation index is
built from the epoch year, the epoch month and the tradition's `leapIndexThreshold` alone, so a
tradition's leap months can be checked without any of its mean-motion constants — which are exactly
what this project cannot yet safely transcribe for them.

| | Window | Result |
|---|---|---|
| Phugpa, Tsurphu, Mongolian, Bhutanese | **2000–2020**, the years Janson prints | All four reproduced exactly, 21 years |
| The same four | **2021–2030**, present only in his LaTeX comments | All four reproduced exactly, 10 years |

The second tier is kept separate on purpose: those rows are Janson's own computed values but are
not in the rendered paper, so a claim resting on them must say so and must never be described as
published.

**What this establishes:** which month number is the leap month, and in which years, for all four
versions across 2000–2030. It also reproduces from first principles his prose statement that
Tsurphu and the Mongolian version share leap months — from two configs differing in *both* β\* and
threshold, which is a stronger check than reading one column.

**What it does not establish:** any day-level date for any tradition but Phugpa. The three
non-Phugpa configs in that test carry Phugpa's `m₀`, `s₀` and `a₀`, so any date they produce is
Phugpa's. The test asserts that explicitly, so the file cannot quietly be cited for more than it
shows.

**Bhutan needs one more caveat**, because the agreement is easy to over-read. Janson's simplified
Bhutanese rule identifies the regular month *followed by* a leap month, and the leap month takes
that number — so the number this engine reports is already the Bhutanese one. What remains
unmodelled is the leap month's **position**: in Bhutan it falls after the regular month sharing its
number, everywhere else before. That shifts day-level dates and the true month count. See
[traditions.md](traditions.md).

### Results

| Source | Range | Agreement |
|--------|-------|-----------|
| Lotsawa House | 21 Feb 2023 – 25 Feb 2028, 1,831 days | **all** |
| eszthoff | 1 Jan 2023 – 31 Dec 2027, 1,826 days | **all** |
| christian-steinert | 1 Jan 2024 – 31 Dec 2027, 1,461 days | 1,438 — see below |
| FPMT monthly calendars | 1 Jan 2022 – 31 Dec 2025, 1,461 days | 1,458 — see below |

Two of the three implementations agree with the engine on every single day, including every
doubled date, both leap months, and every skipped-date gap. The fourth source is not an
implementation at all — see below.

#### What that does and does not cover

Day-by-day external agreement spans **1 January 2022 to 25 February 2028**, just over six years —
the union of the four sources' windows, each of which is narrower; the table above gives each.
Add Janson's Losar table and the epoch-era worked values and the *externally checked* evidence
becomes 1927–2046 at one day per year, plus the epoch itself, plus that window in full.

| Check | Range | Source |
|-------|-------|--------|
| Cross-check fixtures, day by day | 1 Jan 2022 – 25 Feb 2028, between them | three implementations + FPMT |
| Full and new moons, day by day | 1 Jan 2022 – 31 Dec 2025 | FPMT's moon icons — see [below](#fpmts-moon-icons) |
| Losar table, one day per year | 1927–2046 | Janson |
| Epoch constants to six decimals | 806 | Janson |
| `a₂` divergence dates | 2001, 2006, 2025 | Janson |
| `a₂` divergence counts | 1027–1091, 1900–1999, 2000–2099 | Janson |

**The astrological attributes have a third window, narrower than either, and confusing them is a
live trap.** Dates are validated from 1 January 2022 to 25 February 2028 and observances only
2022–2025; the attribute layer is
narrower still.

| Check | Range | Source | What it settles |
|-------|-------|--------|-----------------|
| Year and calendar-day attributes | all 60 cycle positions | Janson's own Table 60e | transcription and formula error — **not** external corroboration, since he computed it from the same formulas |
| Month attributes: animal, gender | all 12 months, Phugpa **and** Tsurphu | Janson's own month-animal table | the same: transcription and formula error, not corroboration |
| Month attributes: element | 1900–2100, both element rules | Janson's **prose**, there being no printed table | that the Tiger month takes the son of the year's element, that each element runs two months, and that Phugpa restarts annually where Tsurphu does not |
| Lunar-day attributes | every day of every month | Janson's **prose** | the opening animal of odd and even months, and the opening trigram and number he names for each month animal |
| Lunar mansion, day by day | 2022–2025, Phugpa only | FPMT's day-quality codes | the mansion arithmetic, at **97.6%** — see below |
| Yoga favorability, day by day | 2022–2025, and tradition-free | FPMT's `FD-`/`UD-` prefixes | the favorability table, at **99.7%** — it reads FPMT's own pair letters, so the mansion residual cannot reach it, and the four disagreements are days FPMT contradicts itself on |
| Yoga element pairs and grading | the ten rows; no window | the *tshig mdzod chen mo*'s `'phrod sbyor`, through `verify:month-and-yoga-names` | that Henning's ten pairs are the dictionary's, and that `auspiciousness` is its grading — **membership read by list order**, since it states group sizes only. `test/astrology/yoga.test.ts` pins that good + restorative are exactly the favorable six |

**That 97.6% is a characterised figure, not a tolerance.** 1,424 of 1,459 days agree — a **2.4%**
residual, re-measured 2026-09-12 rather than carried over: the plan's working figure of 3.9% predated
both the doubled-day rule and a leap-month fix in the cross-check itself, and two files had inherited
it. **All 31 doubled-first days now agree**, where before the doubled-day rule 19 of them did not.

**The residual is FPMT's, not this arithmetic's.** Henning's daily Phugpa calendars give the same
mansion as this engine on **all 1,459 days** and disagree with FPMT on exactly the same 35. That is
the engine's own lineage, so it proves the implementation rather than the calendar — but it does
locate the difference. Measured 2026-09-14.

**And the 35 are one-sided.** 28 sit in the last 15% of the moon's mansion, and on 27 of those FPMT's
element is the *next* mansion's; one sits at the start of a mansion; six are mid-mansion. FPMT's
moon runs slightly ahead, and not by a constant amount: 2022, 2023 and 2024 have 6, 2 and 5
disagreements, 2025 has 22. No cause is established. Ruled out — the karaṇa moon longitude, a
constant offset, a later time of day, the other `a₂` — with the measurements in
[validation-sources.md](validation-sources.md). **This corrects an earlier explanation** that blamed
Janson's `/27` approximation of the moon's motion: Janson gives that approximation as the almanac's
own method, and Henning uses it too, so it cannot be what separates an almanac from this engine.

The six mid-mansion days fit neither pattern and are recorded as unexplained rather than dismissed;
FPMT's calendars already carry four provably impossible codes. The suite **pins where the 35 sit**,
not merely the score: a bare threshold would keep passing if a real bug scattered them elsewhere.

**Three of those rows are checked against prose rather than a table, and that is weaker in a specific
way.** Janson prints no month-element table and no lunar-day table, so what the suites hold are the
statements he makes *beside* the formulas — which catch a misphased congruence, since a shifted cycle
stops opening on the value he names, but cannot catch a claim he states wrongly in both places. Two
of them paid for themselves on first run: the lunar day's trigram and number came out as Kham and 7
for a Dragon month, which is what he says a Dragon month opens with, from a formula transcribed
independently of that sentence.

**Quote the right window.** A claim about a Tibetan date has just over six years behind it, about an observance
four, and about a mansion four *for Phugpa alone* — Bhutan's attributes have no external check at all.
Of the rows above, the three **cycle** rows are Janson against Janson and are not external
corroboration; only the **mansion** and the **yoga's favorability** have an outside witness over
days, and that witness is FPMT in both cases. The yoga table's pairs and grading also have the *tshig
mdzod chen mo*, but over ten rows rather than any span of dates. An earlier draft of this sentence said every row was Janson against
Janson, which contradicted the table two lines above it.

Those are all **Phugpa**. Bhutan has a window of its own, and a wider one:

| Check | Range | Source |
|-------|-------|--------|
| `BHUTAN_HENNING`, day by day | 1 Jan 2000 – 2 Apr 2030 | Henning's software, via `test/fixtures/bhutan.ts` |
| Month sequence, at one unique offset | 1 Jan 2000 – 2 Apr 2030 | the same, reduced to months |
| Leap months | 2000–2030 | Janson's four-version table — a separate lineage |
| Losar 2003 | 2003 | Janson's Bhutan appendix |
| `BHUTAN`, twenty-five days | 2025-2026 | **the Royal Government of Bhutan's own calendar**, via `test/fixtures/rgob.ts` |

Three things to keep straight about that window. It ends on **2 April 2030**, not at the end of 2030,
because the source carries one leap month Janson does not list — see the remarks in
`test/validation/bhutan.test.ts`. It validates **`BHUTAN_HENNING`**, not `BHUTAN`: the data descends
from Henning's software and so follows his `a₂`, and the two differ on three days in the window. And
the first four rows are **one lineage** for the *dates* — Janson's leap-month table is genuinely
independent, but everything checking Bhutanese *day numbers* traces to Henning's software.

The last row is the exception, and it is why it exists. `test/fixtures/rgob.ts` is the Royal
Government's own published calendar, so it is the only non-Henning check on Bhutanese day numbers
here. Twenty-five rows against eleven thousand — breadth is not the contribution, independence is — and
it deliberately includes Losar and a **skipped day**, which a wrong epoch would not survive.

It also bears on Janson's unexplained 2003 divergence between Bhutan's government calendar and the
computed line: nothing in 2026 reproduces it. State that as "isolated on this evidence", not as
resolved. And note what it cannot do — `BHUTAN` and `BHUTAN_HENNING` agree on all twenty-five days, so
it does not discriminate the `a₂` fork. That needs a year holding 2001-12-10, 2004-04-10 or
2020-04-23; the Ministry publishes only 2025 and 2026, and the Wayback Machine holds only 2026.

The bottom three rows are `test/fixtures/janson-epoch.ts`, generated by the same script as the
Losar table.
The three divergence dates were already cited in the note above; they are now extracted
mechanically and asserted rather than quoted.

The 1027–1091 count is the only external check on *calendar output* before 1927, and it is a real
one: Janson's computer search found 16 divergence events in the first 65-year cycle, where
`a₂ = 1/28` and Henning's `a₂` give different Tibetan dates, and the engine reproduces all 16 —
along with his 9 in 1900–1999 and 8 in 2000–2099.
Because the package ships both values, this is falsifiable without either being privileged, and
Janson notes the occurrences are irregular, so the three counts are not a single fact restated.

Count **events, not days**: a divergence is a skipped or doubled day shifting by one, so it shows
as one or two *consecutive* differing days, and Janson tallies each run once.
Raw days give 15, 12 and 24 against his 9, 8 and 16 — the same phenomenon, counted differently.

The engine is documented as usable from 1447 and as a back-projection before that, so state the
claim precisely: "agrees with three independent implementations" is true, and it is a statement
about a six-year window, not about the whole range.
Outside it the checks are internal self-consistency — round-trips, year-length frequencies, period
arithmetic — and those can only catch an inconsistency, never a shared misreading of the paper.
`test/invariants.test.ts` probes year 700 deliberately and asserts only that the month is 1–12 and
the ISO date round-trips: well-formedness, not correctness.

This is a known and accepted limit, not an oversight. The cheapest way to narrow it further is more
worked values from Janson outside 1927–2046, extracted rather than transcribed.

### Where FPMT's calendars differ

`test/fixtures/fpmt-observances.ts` is the only **day-by-day** almanac source here: FPMT's monthly
calendars print a Tibetan day number for every Gregorian day, and are prepared from the
Men-Tsee-Khang calendar. That makes it the one fixture capable of carrying information about the
`a₂` fork, which needs a grid showing *which* number is doubled — see
[decisions/2026-08-12-lunar-anomaly-a2-default.md](decisions/2026-08-12-lunar-anomaly-a2-default.md),
written when no such source was to hand.

**It decides for the shipped default.** Against 1,461 days, `PHUGPA` (`a₂ = 1/28`) diverges on
three; `PHUGPA_HENNING` diverges on those three *and* the 2025 cluster Janson names, where FPMT
sides with the engine.

The three residual divergences are 2022-12-03, 2023-11-09 and 2024-12-08. Each is a difference
about which number a skipped or doubled date consumes, one number apart, resolved again by the
next day:

| Date | Engine | FPMT |
|------|--------|------|
| 2022-12-03 | 11 of month 10; 10 skipped | 10 of month 10; 11 skipped |
| 2023-11-09 | second 26 of month 9; 26 doubled | first 27 of month 9; 27 doubled |
| 2024-12-08 | 8 of month 10; 7 skipped | 7 of month 10; 8 skipped |

Stated in terms of the number consumed, FPMT is one higher every time — the same direction as
christian-steinert's 23, though not the same rule, since FPMT agrees on the other 1,458 days where
Steinert's rule would diverge far more often.

Four explanations were tested and each is ruled out:

- **Not our arithmetic.** Lotsawa House, eszthoff and christian-steinert all side with the engine
  on every one of these days that falls in their range.
- **Not the `a₂` fork.** No value in `[0.0345, 0.037]` reproduces FPMT exactly, and none beats
  `1/28`, which remains the best fit at three.
- **Not a near-tie in the labelling rule.** The margin to a day boundary at these points runs
  0.010–0.050 of a day, while 2025-11-19 — where every source agrees — sits 0.00026 away, forty
  times closer. Proximity to a boundary does not predict divergence.
- **Not a choice of "more convenient" days.** FPMT's guidance does allow moving an *observance*
  between the halves of a doubled day, but that is a claim about where a label sits on a fixed
  calendar. These three are disagreements about the day *numbering* itself — the number printed
  against a Gregorian date, on days that mostly carry no observance at all.

So this is a property of the published calendar rather than of the engine, and
`test/validation/fpmt.test.ts` catalogues the three rather than asserting them away. As with
Steinert, what is pinned is the **shape**: never in the month, never in the leap-month flag, never
more than one in the day number, always resolved by the next day. That is what would change if the
cause were something other than a one-off difference in which number a date consumes.

### FPMT's moon icons

The same pages print a full- or new-moon icon in the day's cell. They are the first external check
of the `isFullMoon` and `isNewMoon` fields, and through them of `nextFullMoon` and `nextNewMoon`.
Where the icons come from is not known —
[validation-sources.md](validation-sources.md#fpmts-moon-icons-lineage-unknown) — so this is
agreement with FPMT's icons, not with the almanac.

**The unit is the moon, not the icon.** Over 1 January 2022 to 31 December 2025 the engine computes
**99** full and new moons and FPMT prints **101** icons, 50 full and 51 new. **98 of the 99 moons**
fall on a day FPMT marks with an icon of the same kind. The other is the new moon of February 2025:
day 30 is skipped that month, so the engine's new moon falls in the day numbered 29, 27 February,
and FPMT marks 28 February, the first of the next month. It is the only skipped-30 new moon in
January 2022 to October 2026, so one case cannot say whether it is a convention or a slip; the
next moon on a skipped day is the full moon of 23 December 2026, a skipped 15.

**The two extra icons are FPMT's practice on doubled dates, not disagreements.** Four doubled dates
carry a moon in the window, and FPMT marks each on the engine's day, the second half. On two it
also marks the first half:

| Doubled pair | Tibetan date | Icon on first half | Icon on second half |
|---|---|---|---|
| 2022-06-28 / 29 | 4/30 | no | yes |
| 2023-04-05 / 06 | 2/15 | yes | yes |
| 2024-11-30 / 12-01 | 9/30 | no | yes |
| 2025-11-19 / 20 | 9/30 | yes | yes |

No rule for which doubled dates get the second icon is known. An earlier reading, that the icon
marks the Tibetan date rather than the calendar day, fitted the two both-halves pairs and is
falsified by the other two — which were invisible to a list of mismatches, because they are not
mismatches. So the comparison matches an icon to an engine moon of its kind on the icon's own day
**or on that day's doubled twin**, and reports the twin matches separately rather than absorbing
them. Decided with Andreas, 2026-09-19: these two are recorded here, and the consumer-facing page
counts moons without mentioning them.

`fpmtMoonComparison` in `test/support/fpmt.ts` is the one definition, shared with the page's suite,
and it returns both directions — a one-way check sees only one side of February 2025.
`test/validation/fpmt-observances.test.ts` pins every agreement figure above and the four doubled
dates by value. The two dates either side of them — that February 2025 is the only skipped-30 new
moon in the pages held, and that 23 December 2026 is the next moon on a skipped day — are measured
rather than asserted, and are stated here as measurements. FPMT's data never puts an icon on a moon of the other kind, so the real rows cannot show that
the kind is compared at all; one test swaps a row to show it.

### Where christian-steinert differs

Against christian-steinert the engine matches 1,438 of 1,461 days; the 23 exceptions are a real,
one-directional rule difference, and
`test/validation/crosscheck.test.ts` catalogues them rather than asserting them away.

In all 23, Steinert's number is exactly one higher than ours, and in all 23 Lotsawa House sides
with the engine. Every one sits at a **skipped** date. Take 8 February 2024: both sources agree
7 February is the 27th and 9 February is the 30th, so a single calendar day carries one of 28/29.
We number it 28 and skip 29; Steinert numbers it 29 and skips 28.

Janson's day-labelling rule, §6, decides it:

> if two lunar days end the same calendar day, then the calendar day gets the name of the first
> of them

Lunar days 28 and 29 both end on 8 February 2024, so the calendar day takes the **first** name,
28, and 29 is skipped. That is what the engine and Lotsawa House do.

Do not "fix" the engine towards Steinert, and do not delete the fixture because it disagrees.
The disagreement is the finding. It is also why the suite asserts the *shape* of the difference
— never in the month number, never in the leap-month flag, never more than one in the day number
— because that is what would change if the cause were something other than this rule.

**Fixture provenance.** Every cross-check fixture is generated by a committed script and carries
its source and tradition line in a header:

- `scripts/fetch-lotsawa-fixtures.mjs` → `test/fixtures/crosscheck-lotsawa.ts`
- `scripts/fetch-steinert-fixtures.mjs` → `test/fixtures/crosscheck-steinert.ts`
- `scripts/fetch-eszthoff-fixtures.mjs` → `test/fixtures/crosscheck-eszthoff.ts`
- `scripts/extract-janson-fixtures.mjs` → `test/fixtures/losar.ts`, `sixty-year-cycle.ts`,
  `janson-epoch.ts`

> **eszthoff is executed, never read, and never installed into this repository.** Running it and
> comparing computed dates is fine — dates are facts. Reading it is what `CLAUDE.md` forbids, and
> the reason is evidence rather than licence: the commit history is this project's proof of
> independent derivation. (It declares MIT in `package.json`, though no repository or tarball
> carries a `LICENSE` file. That was misread as all-rights-reserved until 2026-08-23, and the
> constraint is unchanged either way.)
> Its generator resolves the package from the *current working directory*, so install it in a
> scratch directory outside the repo and run the script from there. Do not add it as a
> devDependency: that puts its code in the tree, which is the thing being avoided. If a
> disagreement ever needs explaining, explain it from Janson — that is how the 23-day
> christian-steinert divergence was resolved.

Output is committed so CI never depends on a third party's uptime, and so a diff after
regeneration is a finding to investigate rather than noise. Re-run the scripts deliberately; do
not edit the fixtures by hand.

> Two conventions bit during Phase 2 and will bite again. Both Lotsawa's `(+)` and Steinert's
> `repeatedTibMonth` mean "**this month number occurs twice**", not "this is the leap month" —
> the leap month is the *first* of the pair. Mapping either flag straight to `isLeapMonth`
> mislabels about thirty days per leap year, and it looks like an engine bug rather than a
> fixture bug. `fetch-steinert-fixtures.mjs` walks the runs to resolve this, and
> `fetch-lotsawa-fixtures.mjs` re-derives the doubled flags and fails if they disagree with the
> page's own markers.

> Losar 2026 is **18 February**, per Janson's table and the engine. An earlier draft of this
> file said 17 February, which is day 30 of the preceding month — the kind of one-day slip that
> is invisible in review and poisons a fixture. Take dates from a source, never from memory.

### The FPMT fixture

`test/fixtures/fpmt-holy-days.ts` is the only fixture taken from the **almanac** rather than from
someone's implementation of Janson, and it tests a different thing: not "do we compute what other
engines compute" but "do our day numbers land on the days people actually observe". Each great
holy day has a fixed Tibetan date, so each published Gregorian date is a direct assertion.

It is **hand-curated**, one of three exceptions to this directory's generated-only rule, because FPMT
publishes these in prose announcements with no feed to parse. What keeps it safe: the list is
short enough to check by eye, every row carries its source URL, and every row was confirmed
against all three cross-check implementations before being written down. Rows whose source could
not be named were left out rather than filled in from memory.

Its best row is the 2024 Chokhor Duchen. FPMT writes that it "takes place this year on July 9 or
July 10 depending on the various Tibetan calendars", with Kopan Monastery observing the 9th and
the Liberation Prison Project calendar the 10th. Both dates are the **same** Tibetan date — 4 of
the leap month 6 — so the institutions are not disagreeing about the calendar at all. They are
choosing which half of a doubled day to observe, which Janson §11 discusses and no arithmetic can
settle. That single row exercises a leap month and a doubled day at once, from an almanac-line
source, and it is the concrete reason Phase 3 must let the caller choose rather than hardcoding a
convention.

## Tier 3: Regression Tests

Phase 1's suites prove these categories occur and behave consistently. `test/regression.test.ts`
pins **named instances** of each, taken from sources rather than from the engine's own output —
because "some day this decade is doubled" survives a systematic one-day error and "9 and 10 July
2024 are both 4 of leap month 6, and FPMT says so" does not.

- Doubled days — 2025-11-19/20 as 30 of month 9; 2024-07-09/10 as 4 of leap month 6
- Skipped days — 29 of month 12 (2024-02-08) and 20 of month 9 (2025-11-10), one skipping the
  higher number and one the lower, since which disappears is decided by the astronomy
- Leap months — 2024 M06L from 6 July, 2027 M02L from 9 March, and the main month that follows
- Month/year boundaries — the day before Losar 2026, and the royal-era year across 1 January
- Dates near the epoch — round-trips through the first sixty days after E806

## Contract tests

Not a tier — these constrain what the package *promises* rather than what it computes. All three
exist because the thing they guard is invisible until it has already broken.

**`test/readme.test.ts` asserts every example the README states.** Prose examples rot silently:
nothing compiles them, and a reader who copies one that no longer works concludes the library is
broken. This is what lets the README print concrete outputs instead of hedging.

> **If you change a README example, change this test in the same commit** — and run it before
> believing the example. Writing it caught an error already in the draft: the leap-month example
> claimed `{ month: 6, day: 4, isLeapMonth: true }` gave 9 July 2024, when it gives the 10th,
> because that date is *also* a doubled day and needs `isLeapDay`. It read perfectly plausibly.

**`test/public-api.test.ts` pins the export surface.** After v1.0.0 the published API is a one-way
door: removing a name is breaking, and adding one is a permanent commitment. Without this, an
`export` added while editing a module becomes public API by accident. It also asserts that the two
tradition configs are identical apart from the lunar anomaly, which is the property making
`PHUGPA_HENNING` a variant rather than a second tradition.

A failure here is not a bug to fix by editing the expected list. It means the surface changed —
decide whether that was intended, then update the list *and* the README's API table together.

**`test/docblock-examples.test.ts` asserts every `@example` in `src/` that states a value.** The
same job `readme.test.ts` does for the README, for the 30 example blocks in the source — and they
are more exposed than the README's, because docblocks are compiled into `dist/*.d.ts` and are what
editor hover renders. A stale one is a false contract statement a consumer never had reason to
doubt.

> It found one on its first run. `leapMonthNumberFor` documented `2153 → 6`; 2153 has no leap month at
> all, and 2151 is the year whose month 6 is doubled. The neighbouring examples in the same file
> already used 2151 correctly, so it was a stale year rather than a misunderstanding — invisible
> to lint, typecheck and every other test, and already shipped in the type declarations.
>
> The same review found the example was **tradition-blind** in a second way: `leapMonthNumberFor`
> takes a config, and for 2151 Phugpa gives 6, Mongolian 5 and Bhutanese 10, while Tsurphu has no
> leap month that year. A docblock on a config-taking function states one tradition's answer, so it
> has to say which. The test now pins all four thresholds.

`{@link}` targets and the reality of every `TCT_` code are checked separately, by
`npm run check:conventions` — see [coding-standards.md](coding-standards.md).
