# Testing Strategy

Correctness is this project's entire value proposition — practitioners have to be able to
trust the dates. Three tiers, all run in CI.

## Layout

```text
test/
├── computation/          # one suite per src/computation module
├── validation/           # Tier 2, cross-checks against external sources
├── fixtures/             # generated — from Janson, and from external implementations
├── invariants.test.ts    # year lengths, safe-integer bound, §13 period
├── regression.test.ts    # Tier 3, named instances of each edge case
├── navigation.test.ts    # arithmetic, the coordinate, the phases — and the naive versions
├── naming.test.ts        # the year-name closed forms, including outside the exact range
├── public-api.test.ts    # the export surface, pinned
├── readme.test.ts        # every example the README states
└── smoke.test.ts         # Temporal reachable as a global
```

Tiers 1 and 3 are interleaved with the unit suites rather than kept in separate directories —
a property and the edge case it generalises belong next to the function they constrain.

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
versions — `test/traditions/cross-version-leap.test.ts`, against Janson's four-version leap-month
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
| Lotsawa House | 2023–2027, 1,831 days | **all** |
| eszthoff | 2023–2027, 1,826 days | **all** |
| christian-steinert | 2024–2027, 1,461 days | 1,438 — see below |
| FPMT monthly calendars | 2022–2025, 1,461 days | 1,458 — see below |

Two of the three implementations agree with the engine on every single day, including every
doubled date, both leap months, and every skipped-date gap. The fourth source is not an
implementation at all — see below.

#### What that does and does not cover

Day-by-day external agreement spans **2022–2027**, six years.
Add Janson's Losar table and the epoch-era worked values and the *externally checked* evidence
becomes 1927–2046 at one day per year, plus the epoch itself, plus those six years in full.

| Check | Range | Source |
|-------|-------|--------|
| Cross-check fixtures, day by day | 2022–2027 | three implementations + FPMT |
| Losar table, one day per year | 1927–2046 | Janson |
| Epoch constants to six decimals | 806 | Janson |
| `a₂` divergence dates | 2001, 2006, 2025 | Janson |
| `a₂` divergence counts | 1027–1091, 1900–1999, 2000–2099 | Janson |

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

> **eszthoff is executed, never read, and never installed into this repository.** It has no
> licence file, so it is all-rights-reserved — the reason `CLAUDE.md` forbids reading it at all.
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

It is **hand-curated**, the one exception to this directory's generated-only rule, because FPMT
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

> It found one on its first run. `leapMonthOfYear` documented `2153 → 6`; 2153 has no leap month at
> all, and 2151 is the year whose month 6 is doubled. The neighbouring examples in the same file
> already used 2151 correctly, so it was a stale year rather than a misunderstanding — invisible
> to lint, typecheck and every other test, and already shipped in the type declarations.
>
> The same review found the example was **tradition-blind** in a second way: `leapMonthOfYear`
> takes a config, and for 2151 Phugpa gives 6, Mongolian 5 and Bhutanese 10, while Tsurphu has no
> leap month that year. A docblock on a config-taking function states one tradition's answer, so it
> has to say which. The test now pins all four thresholds.

`{@link}` targets and the reality of every `TCT_` code are checked separately, by
`npm run check:conventions` — see [coding-standards.md](coding-standards.md).
