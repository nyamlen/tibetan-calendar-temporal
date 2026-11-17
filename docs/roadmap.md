# Roadmap

## Implementation Phases

| Phase | Scope | Effort |
|-------|-------|--------|
| 0 | Scaffold (npm init, tsc, vitest, fast-check, biome, CI) — **done** | 2h |
| 1 | Core computation: Layers 0-3 (Janson §2-9) — **done** | 20h |
| 2 | Validation: FPMT fixtures, cross-check against reference implementations — **done** | 12h |
| 3 | Observances: config-driven rules, an example config — **done**; rebuilt in November 2026, see the checklist | 8h |
| 4 | TypeDoc + release workflow + publish v1.0.0 (docblock audit split out — see Phase 4a) | 6h |
| 4a | Code review: 629 docblocks (counted 2026-11-16) verified against behaviour, plus convention and derivation conformance across all of `src/` — see the [Pre-v1.0.0 checklist](#pre-v100-checklist) | 14h |

**Safe timeline: 3 weeks** (accounts for debugging edge cases in doubled/skipped day logic —
predates Phase 4a's addition below and has not been revisited against its extra 10h)

The layers referenced in Phase 1 are defined in [architecture.md](architecture.md); the
validation sources in Phase 2 are listed in [testing.md](testing.md).

**Phase 0 outcome.** Re-reading the package structure before scaffolding was worth it — it
turned up two stale entries. tsup was dropped for plain `tsc`, and TypeScript 7 replaced
TypeScript 5.x because it is the first release to ship `lib.esnext.temporal.d.ts`, which lets
the package expose `Temporal` in its public types with no dependency. Both recorded in
[decisions/2026-08-11-build-tooling.md](decisions/2026-08-11-build-tooling.md).

**Decided at the start of Phase 1, answered in Phase 3.** The dropped Temporal calendar adapter
gets no replacement: there is no Temporal-shaped `TibetanDate` class. The question was deferred so
a real consumer could settle it, and the observance engine settled it by walking months with
`trueMonthCount` and needing no date arithmetic at all. See
[decisions/2026-08-12-no-tibetan-date-class.md](decisions/2026-08-12-no-tibetan-date-class.md).

**Also settled before Phase 1 began:** `year` is the royal-era numbering
([decisions/2026-08-11-year-numbering.md](decisions/2026-08-11-year-numbering.md)); `isSkippedDay`
is dropped from `TibetanDate` and `isLeapDay` added; the epoch stays E806 so that `n ≥ 0` for all
dates after 806 CE. All three correct [architecture.md](architecture.md), which had specified
otherwise.

**Phase 1 outcome.** The engine reproduces all 120 Losar dates in Janson's table for
1927–2046, and year-length frequencies over 10,000 years land inside his independently computed
42/21/3/33/1 per cent. Four things were corrected against the plan while building:

- **The scaling denominator is derived per tradition, not hardcoded.** Tsurphu's epoch constants
  carry factors Phugpa's do not, giving `D = 1,534,755,600` against Phugpa's `102,317,040`. A
  literal would have made Tsurphu unrepresentable and broken the injection rule.
- **`rabjung` is separate from `yearName`.** The Indian and Chinese cycles number a year
  differently — 2026 is Indian 40 but Chinese 43 — so one combined object invited a lookup that
  is wrong in every year of the cycle.
- **Losar is not always day 1.** Where day 1 is skipped it is numbered day 2, as in 1977. This is
  why Losar is computed from the previous year's month 12.
- **2027-01-15 is month 12 day 8**, not month 11 day 27 as the plan and an early draft of the
  year-numbering record both said.

**Phase 2 outcome.** The engine now validates against three independent implementations and
against the almanac, day by day across 1 January 2022 to 25 February 2028 between them — see
[testing.md](testing.md#what-that-does-and-does-not-cover) for what that window does and does not
establish. Four things came out differently from the plan:

- **The `a₂` fork was settled from the paper, not from a purchased almanac.** Janson states that
  calendars use `1/28` "for example in the almanac", and his bibliography resolves that to the
  Men-Tsee-Khang *Tibetan Annual Almanac 2013* — he had already done the check. The default was
  already `1/28` and did not change, but it is now evidenced.
  [decisions/2026-08-12-lunar-anomaly-a2-default.md](decisions/2026-08-12-lunar-anomaly-a2-default.md).
- **The validation sources do not straddle the fork.** `docs/testing.md` claimed Lotsawa House
  and christian-steinert descend from Henning's line; both were checked against Janson's three
  divergence dates and both follow `1/28`. The claim was never tested and was wrong.
- **Practice-day lists cannot settle the fork, and neither can Losar.** The 11 divergences in
  1950–2050 are each self-correcting within a day: the two values disagree about which number is
  doubled or skipped, never about where a month boundary falls. Only a day-by-day grid is
  evidence. This ruled out the discriminator the plan was built on.
- **christian-steinert disagrees on 23 of 1,461 days**, all at skipped dates, all in the same
  direction, with Lotsawa House and eszthoff siding with the engine every time. Janson §6
  decides it in the engine's favour. The disagreement is catalogued in the suite rather than
  asserted away.

Coverage: Lotsawa House 1,831 days and eszthoff 1,826 days, both matching exactly; FPMT's
published holy days, all matching; named Tier 3 instances for every edge-case category.

**Carried into Phase 3.** FPMT publishes the 2024 Chokhor Duchen as "July 9 or July 10", Kopan
observing one and the Liberation Prison Project calendar the other. Both are 4 of leap month 6 —
the institutions differ over which half of a **doubled day** to observe, not over the calendar.
Practice-day logic must therefore make that a caller's choice, not a hardcoded convention.

**Phase 3 outcome.** The observance layer ships on `./observances`, validated against FPMT's own
published calendars rather than against its guidance page. Six things came out differently from
the plan:

- **"Practice days" became "observances".** A practice day asserts something about the
  *practitioner* — whether you keep it depends on your lineage, vows and empowerments — which the
  calendar cannot know. *Observance* names the day, covers Losar and monastic *sojong* alike, and
  does not presume the consumer is a practitioner.
- **The doubled-day rule was documented backwards.** The README and `TibetanDate.isLeapDay` cited
  Janson §11 for "the second of the pair"; §11 says the *first*. The shipped default stays
  `"second"` because that is FPMT's own published rule and what its calendars print — only the
  citation was wrong. The Losar exception was also misattributed: Janson's Losar remark is about
  leap *months*, a separate axis.
- **The `a₂` fork now has the evidence its record said was missing.** That record argued only a
  day-by-day grid printing the doubled number could settle it, and that none was available. FPMT's
  monthly calendars are one, from the Men-Tsee-Khang line: `a₂ = 1/28` diverges on 3 days in
  1,461, Henning's value on 6. The default did not change; it is now measured rather than
  reported.
- **FPMT's calendar is not exactly Phugpa under either value.** Three residual divergences survive,
  each about which number a skipped or doubled date consumes. Four explanations were tested and
  ruled out, including the natural one that FPMT had chosen "more convenient" days — it had not;
  the disagreement is in the day numbering, not in where a label sits. Catalogued in
  [testing.md](testing.md#where-fpmts-calendars-differ).
- **A monthly rule is monthly, and does not follow the doubled/skipped guidance.** The leap-month
  convention applies only to annual observances; FPMT prints tsok on the 10th of both halves of a
  leap pair. And its guidance about doubled and skipped days governs "special days" — the monthly
  cycle instead tracks the printed numbers, so a doubled 8th is labelled twice and a skipped 25th
  is simply not observed.
- **Sojong is not shipped.** A fixed 15th-and-30th rule misses 38 of FPMT's occurrences over four
  years and invents 36. Whatever governs it is not a day number, and an approximate rule is worse
  than none here. The `kind` remains so a caller can supply their own.

Also settled: **no `TibetanDate` class** — the deferred question, answered rather than deferred a
third time — and **what belongs in the public surface**, on the rule that a name goes public when
the consumer-side workaround is wrong or impossible. Root grew by one, `losarFor`, because
`tibetanToIso({ month: 1, day: 1 })` throws in years where day 1 is skipped, so the most-asked
question of a Tibetan calendar had no correct public answer.

## Release Status

| Version | State |
|---------|-------|
| 0.0.1 | Published placeholder — reserves the npm name, exports nothing. **Stays `latest` deliberately**; see below |
| 1.0.0 | Target: full Phugpa implementation, published from CI with npm provenance. **Gated on a client**; see below |

The repository stays private under the `nyamlen` org until v1.0.0, then goes public.

**The next publish is 1.0.0. There is no intermediate `0.x`**, so `0.0.1` remains what npm serves
until then, and its metadata is frozen at what was published on 2026-08-11 — `engines: ">=22"` and
`exports: "./index.js"`, both long since wrong.
That is harmless only because the version exports nothing executable, and its README banner errs in
the conservative direction by telling readers to stay away.
Do not treat the stale page as neglect, and do not try to correct it in isolation: npmjs.com renders
the README of whichever version holds the `latest` dist-tag, so **the banner can only change in a
release that moves `latest`** — a prerelease published on a `next` tag would leave the page exactly
as it is.

### 1.0.0 is gated on a client, not on the implementation

**No 1.0.0 until a consumer outside this repository has exercised the public API.**
The gate exists because two different risks are being retired, and only one of them is already
covered:

| Risk | Retired by |
|------|-----------|
| Does the published artifact work — installs, resolves through `exports`, all three subpaths import? | Largely `scripts/check-pack.mjs`, in CI |
| **Is the API shape right?** | Nothing yet. Only code that has to *make decisions* surfaces it |

The second is the one 1.0.0 freezes permanently, and no test in this repository can see it: every
suite imports from `src/`, so none of them meets the package the way a consumer does.

This **relaxes** the release rather than adding to it.
The 300-docblock audit below does not have to precede the client — docblocks reach the shipped
`.d.ts` and are what editor hover shows, so a consumer reading them in an editor is a better audit
signal than reading 300 blocks in sequence, and the client should therefore run first and inform it.

The gate closes when every item on the client's friction list carries a verdict — **change the API**
(free now, breaking forever after), **fix the documentation**, or **accept and record** — not when
the list merely exists.

**Widened 2026-09-20 (Andreas): the gate spans every client's list, not the first one's.** It was
written when one spike had run and was recorded as closed on 2026-08-23 on that basis. Two further
spikes then ran, on 25 and 27 August, producing **eighteen findings between them, none verdicted** —
among them a README line that could never have run. The gate's purpose is to establish that the API
survived contact with a consumer, and eighteen unanswered consumer findings say it has not. The
ledger holds **32 rows: 18 open on 2026-09-20, 1 open on 2026-09-22** — the sojong finding, blocked
on the paused `./observances` work. It is kept privately; what is checkable here is the discharge.
**Every finding's verdict names the commit in this repository that answered it**, and those commit
bodies name the findings they answer: `90a38ee`, `864f88e`, `6ae4b7e`, `6e5f30d` and `6c5be94` on
26 August, `aef049f` and `b47c853` on the 27th, and `fcfb4cd` and `409fc09` on
2026-09-22 for the four claims the verdict pass found still live. The browser client's list is the
fourth, and it comes in two halves: the polyfill probe's, verdicted on 2026-09-23, and the
navigator's, still to come. The gate does not close until the second half is verdicted too.

**What the 18 turned out to be — 2026-09-22.** Sixteen of them had been answered on 26–27 August, by
commits naming the spike's finding numbers in their own bodies. The ledger had been compiled from
the friction lists **without cross-checking this repository's log**, so `open` meant *nobody has
written a verdict* and was read here as *the API has not survived contact with a consumer*. The
verdict pass answered every row against a packed tarball rather than against `src/`, found **three**
claims still live out of twenty-two, and fixed them in `fcfb4cd`: the README's TypeScript remedy did
not work as written, a `{@link}` to a non-exported constant shipped in a `.d.ts`, and `docs/guide.md`
filed a **shipped** document as repository-only. One row stays open — the sojong finding — and it is
blocked rather than unexamined.

**The order in which the gate closes — agreed 2026-09-20, step 1 amended 2026-09-22.**

1. ~~Documentation-only verdicts and their fixes.~~ **Done 2026-09-22: every row, not the
   documentation ones.** Ledger `7fa0cc0` in `nyamlen`, fixes `fcfb4cd` here.
2. ~~The polyfill probe~~ **Done 2026-09-23.** Run blind against `5c954b3`; its two freeze items
   were fixed in `012468a`..`48cf255`, every other finding was verdicted and the documentation ones
   fixed in `d719dba`..`44c222b`, and the probe was re-run against `48cf255` with the same hash —
   see `docs/testing.md`, *Under a polyfill*. Verdicts in `nyamlen`'s `VERDICTS.md`.
3. **The navigator build** (`nyamlen`, blind) — does not.
4. **The navigator's half of the browser client's friction list** — the probe's half is step 2 —
   plus N10 once `./observances` moves.
5. Freeze, then 1.0.0.

**Why step 1 widened, because an order without its reason gets reordered.** It was written as
documentation-only on the reasoning that *a blind spike should exercise corrected documentation:
while the README ships a line that cannot run, part of a week-long spike's findings goes on
re-reporting what is already known.* **That reasoning had expired when it was written.** The README
line was fixed on 2026-08-26, in `90a38ee`, three weeks before the ordering quoted it as a live
defect. The same is true of the deferral: the API verdicts were held back because *"a second
independent consumer is evidence"*, and that is an argument about a **new** API decision. N3–N6, N8
and N9 had already been decided and shipped — `resolveMonth`, `formatTibetanMonth`/
`parseTibetanMonth`, `addMonthsToDate`, `resolveDate` and the `TibetanWeekday` brand are all on the
surface. A row discharged by shipped code has nothing to wait for.

**The general lesson, which this file has paid for before:** an ordering written as prose goes stale
silently, and so does the justification under it. Nothing checks that a step's reason is still true.

One row waits, and its reason is real: the sojong finding is entangled with the paused
`./observances` work, and verdicting it now would rule on a ruleset that is still moving. The
explanation shipped for it in `864f88e` was itself overturned on 2026-09-19.

**The client is a web app, and it arrives in two parts — decided 2026-09-20.** A one-day **polyfill
probe** gates the API freeze, because the *Beyond v1* entry below requires the polyfill path to be
spiked before the API is frozen and that is the only question which genuinely blocks. The week-long
**navigator** follows and does not gate the freeze; its findings land as 1.x unless one is severe
enough to reopen it, which is a judgement to make at the time. Both are blind builds, the probe
included — it writes into the same codebase as the build that follows, so a contaminated probe
defeats the blind build after it. Briefs: `nyamlen/spikes/polyfill-probe/` and
`nyamlen/spikes/example-site/`.
Note what a first client will *not* reach: `addDays`/`addMonths`/`nextFullMoon`, `parseTibetanDate`,
and tradition switching. Those surfaces are being frozen on lighter evidence, which is a choice
rather than an oversight.

### What the first client found

A smoke client ran on 2026-08-22, working only from the installed tarball's `README.md` and shipped
`.d.ts` files, with the engine's `docs/` and `src/` off limits. Its friction list is held privately;
the six documentation fixes it produced are in this repository's history, dated 2026-08-23. It printed month grids for three probe months and its output matched every expected
value, including that day 20 never appears in 2152 M09, that `isLeapDay` marks the **first** of a
doubled pair, and that Chokhor Duchen falls on the second of 2151 M06L's doubled 4th.

**The headline is that nothing it found requires an API change.** Every item is documentation.
That is the evidence this gate existed to gather: the shape survived contact with a consumer, and
the surface can be frozen.

**Fix the documentation — six items.**

1. **`leapMonthNumberFor`'s docblock is a false contract, and it ships.** `src/months.ts` says the
   engine "does not yet express" where a leap month sits, that it "always" places it before the
   regular month sharing the number, and that "until that is configurable the number here is
   already the Bhutanese one but the position is not". Every clause has been false since
   `leapMonthPosition` landed on 2026-08-16: `monthsFor(2151, BHUTAN)` yields `... M08 M08L ...`.
   It reaches consumers as `dist/months.d.ts`, which is what editor hover shows.
2. **The same docblock's "Bhutanese 10" is misleading rather than wrong.** It holds only when
   `leapIndexThreshold` alone is varied, which is what `test/docblock-examples.test.ts` pins and
   says in a comment — but the shipped `BHUTAN` config gives **8**, and a reader takes "Bhutanese"
   to mean that config. The same figure appears in `CLAUDE.md`. Correct both together, and say
   which constant is being varied.
3. **The README's footgun warning teaches the workaround instead of the API.** The `days` callout
   shows the hand-rolled `firstDay` to `lastDay` walk prominently; the client copied it into every
   grid and never called `datesFor` at all, though the README elsewhere calls that its preferred
   route. A warning that displaces the function it should be recommending.
4. **The `Observance` object's shape is not in the README**, so the client had to open
   `dist/observances/*.d.ts` to learn its field names.
5. **`TibetanDate.weekdayName` is tradition-aware and nothing says so.** The README documents
   `weekdayNameFor` taking a config, but not that the *field* on a date built with `BHUTAN`
   inherits the shift. Confirmed only by experiment.
6. **`formatTibetanDate` does not encode `isDoubledDay`.** True to its stated contract — it is the
   inverse of `parseTibetanDate`, which returns naming fields — but a consumer comparing two dates
   by formatted string gets "identical" where one is the second half of a doubled pair and the
   other an ordinary day. Say so in the docblock; do not widen the format, which would break the
   round-trip identity.

**Accept and record — six items**, none of them the package's doing: `file:` in `package.json`
covers both a tarball and a directory, so the install line does not show which happened;
TypeScript needed an explicit `"types": ["node"]` before `console` resolved; exports were
cross-checked against `.d.ts` out of caution; two probe dates fell in one month and needed
deduping; `.toString()` avoids the documented `PlainDate` logging problem; and the client's first
draft dropped `isFullMoon`/`isNewMoon`, which it recorded as its own mistake.

**Change the API before 1.0.0 — none.**

**All six were fixed on 2026-08-23**, and the gate closed **for that client's list**: every item on
it carries a verdict, and no verdict was "change the API". What shipped as corrections —
`leapMonthNumberFor`'s docblock and its Bhutan figure, the README's month-grid ordering claim, the
`days` callout now recommending `datesFor` instead of teaching the walk that displaced it, the
`Observance` shape, `weekdayName`'s tradition-awareness, and a `@remarks` on `formatTibetanDate`
saying it is not a complete encoding of a resolved date. The suite stayed at 816 tests throughout,
which is the point: none of this was behaviour.

**What the exercise cost, and what it bought.** Under an hour of client work found a false contract
that had been shipping in `dist/months.d.ts` since 2026-08-16 and that three phases of review,
a 300-docblock audit plan, and `check:conventions` had all missed — because none of them reads prose
against behaviour, and the audit had not yet run. That is the argument for doing this before
1.0.0 rather than after, and the argument for the audit being consumer-driven rather than
sequential.

**What the client did not reach**, which makes the "lighter evidence" note above specific: the
whole navigation tier (`addDays`, `addMonths`, `daysBetween`, `monthsBetween`, `lunationFromMonth`,
`monthFromLunation`, `nextFullMoon`, `nextNewMoon`), the reverse path (`tibetanToIso`,
`tibetanDateExists`, `SkippedDayError` — no error path was exercised at all), `parseTibetanDate`,
`getObservances` as a range query, the closed-form name lookups, and any custom `ObservanceConfig`.

**A second client ran on 2026-08-25** against that unreached set, working from the tarball alone —
its friction list held privately, its findings answered by the commits named above, each of which
states the finding it closes. It reached all 25 exports its brief named and returned **sixteen
findings**, of which eight were shipped prose that was false, two were its own mistakes, and six
needed API rulings. Its most consequential single finding was that `README.md` shipped a line that
**could never have run**: `monthsFor(2153).flatMap(datesFor)` throws, because `flatMap` passes the
array index into the optional `config` parameter.

**Writing the brief: a coverage list destroys discoverability testing for everything on it.**
Learned from that run and binding on the next. Naming the exports a spike must reach does stop a
thin spike declaring success after touching eight — but you cannot then learn whether a consumer
*finds* a name, because you handed it over. The first client's sharpest finding was exactly a
discoverability failure: it hand-rolled the month walk and never called `datesFor`, which the README
calls its preferred route. So specify **tasks, not function names**; require the coverage report to
be measured against the tarball's own `.d.ts`, which the spike can enumerate itself; and **never say
which names are new**. Non-use then reads as a finding about the surface rather than a gap in the
brief.

## Outstanding — near term

- [x] **`TibetanDate` shape confirmed** before writing `src/types.ts` — done 2026-08-11. Date
      components stay flat, mirroring `Temporal.PlainDate`; naming systems group under a `*Name`
      field. `rabjung` was split out of `yearName` because the Indian cycle is a numbering and
      the Chinese cycle is a name, and because the two give a year different positions — 2026 is
      Indian 40 but Chinese 43, so holding both in one object invited a lookup that is wrong in
      every year of the cycle. See
      [architecture.md](architecture.md#why-rabjung-is-separate-from-yearname).

Setup work not yet done. None of it blocks Phase 3.

- [x] **Node 26** installed — v26.7.0, verified 2026-08-11 by a Vitest smoke test reading
      `Temporal.PlainDate` with no polyfill present
- [x] GitHub org: display name `Nyamlen`, description, and **2FA required for all members** —
      done 2026-08-11
- [x] Cloudflare **auto-renew** confirmed on both domains 2026-08-11 (they expire 2027-08-11).
      Unlike every other item here this has no external signal — registrar auto-renew
      preference is not published in RDAP — so it is recorded on report, not verified
- [x] DNSSEC enabled on both domains — DS records verified live 2026-08-11
- [x] `nyamlen.com` → `nyamlen.app` 301 redirect, path-preserving, apex and www — verified
      2026-08-11
- [ ] **At app launch:** add a proxied `www` CNAME on `nyamlen.app` plus a redirect to the
      apex. The canonical host is `nyamlen.app` without www, but `www.nyamlen.app` currently
      does not resolve at all, so anyone typing it dead-ends
- [ ] Decide whether to register `nyamlen.org` and `nyamlen.dev` (both free as of 2026-08-11)
- [ ] Record `Melong` as the name of the practice review screen in the app spec
- [x] **Development-tool vulnerabilities.** `npm audit` reported 14 (3 low, 4 moderate, 7 high)
      on 2026-10-16, every one in development tools — the `markdownlint-cli2` chain (`braces`,
      `micromatch`, `js-yaml` and others) and `vitest` with `@vitest/coverage-v8` — and none in
      the published package: `npm audit --omit=dev` found 0. Update them as a change of their own,
      run all ten CI commands, and take anything that needs `npm audit fix --force` (a
      major-version jump) separately. Re-measure the count first; it moves as advisories appear.
      **Updated 2026-11-14:** `npm audit fix` and Vitest 4.1.12 cleared Vite and source-map-js;
      `markdownlint-cli2` 0.19.1 → 0.24.1 cleared `js-yaml` and `markdown-it`, with no new
      `lint:md` findings. **4 low remain, all one KaTeX advisory** (GHSA-238p-pmpm-9mq7) via
      `markdownlint` → `micromark-extension-math@3.1.0` → `katex@0.16.47`. KaTeX 0.19.1 fixes it,
      but the math extension's latest release requires `katex ^0.16.0`, so only an `overrides`
      entry forcing an undeclared major would clear it; `npm audit fix --force` instead proposes
      *downgrading* to `markdownlint-cli2@0.16.0`. **Residual accepted by Andreas, 2026-11-14:**
      low severity, development-only (`npm audit --omit=dev` finds 0), and reachable only if KaTeX
      renders hostile input, where markdownlint parses this repository's own docs. Revisit when
      `micromark-extension-math` widens its `katex` range

## Pre-v1.0.0 checklist

Decisions deliberately deferred during setup, each with the reason it was deferred. Work
through this before publishing v1.0.0 — several are one-way doors once published.

The list is grouped by subject, not by sequence, and one run of items does have a required order.

**The order, as it stands on 2026-11-15:**

1. **`./observances`** — the rule vocabulary, sojong, and the content that ships. **Merged to
   `main` on 2026-11-14** (`0f13d10`; the branch is deleted): it blocked the review passes while its
   content, membership and names could still change, and they have settled.
2. The **Full code review**, under Review passes below. **Merged to `main` on 2026-11-16**
   (`51c7c03`).
3. The **docblock audit** ("Audit and correct all 629 docblocks"), under the rule in
   [decisions/2026-11-15-docblocks-are-for-callers.md](decisions/2026-11-15-docblocks-are-for-callers.md).
   It follows the code review because fixes rewrite docblocks, and auditing first would do those twice.
   The **Security review** runs alongside the end of the code review: its subject is release
   configuration, not `src/`.
4. The **Full adversarial review**, last of the passes, so it sees the final state.
5. The **`docs/` folder restructure**, last of all — every review before it produces documentation
   edits, and moving files once after they have landed is one link-fixing commit instead of four.

Ordered so on 2026-11-15, when the audit was confirmed as a pass of its own: a code review reports
a docblock only when it states something false, never for what it should not contain.

This sentence began *"The rabjung name shape settles first"*, which was true when it was written and
**stale from 2026-08-25**, when that item was ticked — so the stated order opened with a completed
step, and a reading of it on 2026-09-20 duly proposed starting there. Corrected the same day. The
lesson is this file's own: an ordering written as prose goes stale silently, because nothing checks
that its first step is still open.

**API shape**

- [x] **Year-level naming came off `TibetanDate`.** Done 2026-08-24. `rabjung` and `yearName` are
      reached through `rabjungFor(date.year)` and `yearNameFor(date.year)`; `weekdayName` stays,
      because it is the one name a date cannot regenerate from itself — `weekdayNameFor` needs a
      `TraditionConfig` and a serialised date carries none. A **breaking change** to the primary
      return type, taken now because the package is pre-v1.0.0. Took a serialised year from 293,009
      to 126,629 bytes. Constraint and the rule it follows in
      [decisions/2026-08-24-year-naming-off-the-date.md](decisions/2026-08-24-year-naming-off-the-date.md)
- [x] **Make every shipped name follow the names-keyed-by-language rule — decide and fix before
      1.0.0.** [decisions/2026-09-13-names-keyed-by-language.md](decisions/2026-09-13-names-keyed-by-language.md)
      says a name ships as `tibetanName: TibetanName` (script, Wylie, THL phonetics), plus
      `sanskritName` where one is sourced, and S15's rule says keys are English, never ASCII Tibetan.
      A survey on 2026-09-14 found the surface does not hold to either, and **every item below is a
      one-way door at 1.0.0**:
      - **`TibetanTrigram`** (`./astrology`) ships `"li" | "khon" | "dwa" | …` — ASCII Tibetan as
        *keys*, with no `tibetanName` and no verification. Janson's spellings, checked against nothing.
      - **The attribute results** — `YearAttributes`, `MonthAttributes`, `LunarDayAttributes`,
        `CalendarDayAttributes` — carry `animal`, `element` and `gender` as keys only. `TibetanYearName`
        carries `animalName` for the same vocabulary, and nothing public gives a month's or a day's
        animal or element in Tibetan, because `src/names.ts` is internal.
      - **`LunarMansion`** has no name at all (deferred until the 27 names are verified), and
        **`monthNamesFor`** has `sanskritName` only under `sixSeasons` — both within the rule's "where
        sourced", but uneven.
      - **`docs/guide.md`** says "Every name the engine returns carries three renderings", which the
        trigrams and observance names make false; its month-names table prints Wylie only.
      - Not shipped, but the same slip: `test/fixtures/janson-month-names.ts` names a Wylie field
        `tibetan`, where every other fixture means Tibetan script by it.

      Each needs its names verified before it ships — the trigrams have never been through a
      verifier — so this is sourcing work as well as a reshape.
      The evidence and the decisions taken so far — Janson's English words for the trigrams, no
      `englishName` on a mansion — are in [names/mansion-and-trigram-sourcing.md](names/mansion-and-trigram-sourcing.md). Count call sites before each rename
      and say the number in its commit.

      **Scoped to `./astrology` on 2026-09-14.** The survey also found two `./observances` items; they
      moved to the composable-`ObservanceConfig` item below, because both reshape `ObservanceConfig`
      and designing them apart would spend two breaking changes on one type. The guide's "three
      renderings" sentence is therefore not true until both items land.

      **Landed for `./astrology` on 2026-09-15** (branch `feat/mansion-trigram-names`): `TibetanTrigram`
      is Janson's English words, every attribute block carries `tibetanNames`, `LunarMansion` carries
      `tibetanName` and `sanskritName`, the guide's sentence is corrected and names the observance
      exception, its month table prints script and phonetics, and the fixture field is `wylie`. The
      three shapes now in use are recorded in the names-keyed-by-language record.

      **Ruled on 2026-09-17:** `monthNamesFor`'s `mansion` now carries `sanskritName`, and it is the
      **mansion's** name (*maghā*), not the Indian month's (*māgha*) — the two are different words, and a
      name block holds one name in several languages. Month 8's *khrums* names mansions 24 and 25
      together and takes the pair's own name *bhadrapadā*, verified as a stated exception to rule (A);
      no mansion index ships on this member. The `indianMonth` sibling shipped on 2026-09-18 with
      `sanskritName` alone: Monier-Williams' defining entry for each month, month 5 *jyeṣṭha* a stated
      exception on the Vimalaprabhā's evidence — see
      [names/month-and-yoga-sourcing.md](names/month-and-yoga-sourcing.md#the-indian-month-names).
      `fourSeasons` still carries no `sanskritName`, and that is the rule's "where sourced" holding
      rather than a gap: no source gives Sanskrit for the Tibetan season-month compounds.

      **Done — every bullet above is `./astrology`, and the `./observances` two left this item on
      2026-09-14** for the composable-`ObservanceConfig` item below, which is where `ObservanceKind`
      and `ObservanceRule.name` are now tracked. A draft of this line first held the item open for
      them, which would have kept a completed item unticked against work it no longer covers.
- [x] **Join phonetics by word, surface-wide, through THL's word-separated mode.** Decided by
  Andreas 2026-11-11; **done 2026-11-15**. Every shipped multi-syllable `phonetic` is now THL's
  "Words separated by" output: a two-syllable name is one word (*penpa*, *nyima*, *dawa*,
  *rapjung*), and a longer name is split by the markings Andreas ruled in
  `scripts/word-boundaries.data.json` (*chinda rawa*, *saga dawa düchen*, *guru rinpoché*).
  Before it, the item counted 97 multi-syllable names, all spaced ("dru mang po"), so *saga dawa*
  shipped as "sa ga da ba".
  Re-measured 2026-11-15 over every `wylie`/`phonetic` pair in `src/` (a one-off script kept with
  the plan's evidence, not in the repository): 123 distinct multi-syllable Wylie names, 91 of two
  syllables and 32 of three or more, the same figures the design's headword probe gave on
  2026-11-14.
  The shared module `scripts/thl.mjs` holds the THL call, the boundary rule and the word gate, and
  all five name verifiers go through it.
  The gate admits a word that is a headword (with the `-pa`/`-ba` rung) in the Mahāvyutpatti or
  either Tibetan–Tibetan dictionary, a member an enumerating entry spells, or a recorded
  `gateException` (five rows, plus *gso thub*).
  `test/word-boundaries.test.ts` holds `src/` to the boundary file offline, so a new longer name
  without a row fails in CI.
  **Eleven shipped phonetics are Andreas' corrections of THL's output**, each carried as
  self-invalidating data beside THL's own value: *karmapa* and *pandita* (2026-11-11), and
  *lhantsam*, *mintün*, *peln-gyur*, *topden*, *khyunchok*, *lo-ngen*, *namgyur*, *namchang* and
  *yongdzin* (2026-11-15).
  The converter's four word modes, checked 2026-11-11: "Use built-in word list" (`auto`, partial:
  "sa ga dawa"), "Handle each syllable separately" (`none`), "Syllables in a word joined by"
  (`join`, which needs a marker inside words), and "Words separated by" (`sep`), which gives
  "saga dawa" from `sa ga/zla ba` and applies sandhi within a word (*chontrül*).
  A boundary placed wrong is silent — `sa ga zla ba'i dus chen` marked as one word gives
  "sagandawé düchen" — which is why the boundaries are ruled data and the gate checks only that a
  word exists.
  Hyphens as house style were rejected: a published standard governs a shipped column, and a hyphen
  per syllable ("sa-ga-da-ba") does not mark a word.
  It was a one-way door at 1.0.0 and surface-wide, so the fourteen observance names went first
  (2026-11-11) and the rest followed, leaving no inconsistency to ship.
  `scripts/nasal-rulings.data.json` is the table of record for the 28 shipped names that meet one of
  THL's three nasal rules.
  Of the rabjung names Andreas corrected five on 2026-11-15: *khyunchok*, *namgyur*, *namchang* and
  *yongdzin* by the nasal policy, and *lo-ngen*, which is no nasal-rule case but a reading ruling.
  *senchang*, *nyönden*, *kündzin*, *künden* and the season months stand as THL gives them, and
  *dongngen* is a plain join left as THL gives it.
- [ ] **Small findings parked by the pre-1.0.0 code review (2026-11-15).**
  Each scored below 80 by an independent scorer and was not taken; the full text is in the review's
  plans, not in this repository.
  - The year functions `hasLeapMonth`, `leapMonthNumberFor` and `monthsInYear` check the year
    before the tradition, where `monthsFor` checks the tradition first; no ruled order covers
    number-only functions.
  - The `isoToTibetan` search evaluates `trueDate` a little past the exact range's end, where
    3 of 7 values at the `PHUGPA_HENNING` boundary exceed 2⁵³; no wrong date results.
  - `scripts/fetch-fpmt-observances.mjs` never checks that a fetched page is the month it asked for.
  - `scripts/fetch-steinert-fixtures.mjs` checks only the row count, not that dates are consecutive.
  - `scripts/extract-janson-fixtures.mjs` does not check leap-column cells for shape, or that the
    Losar years are contiguous.
  - `scripts/fetch-eszthoff-fixtures.mjs` has no guard against being run from inside the repository.
  - `scripts/fetch-fpmt-observances.mjs`'s month-span guard accepts a caption implying two leap
    pairs, e.g. `6A-7B`; the parser it replaced did too, and the task that rewrote it did not
    take it up.
  - `getObservances`' 10-year span cap reads `to.year - from.year` from the caller's object
    (`src/observances/index.ts`), so a `Temporal.PlainDate` subclass with a lying `year` getter
    bypasses the cap — a cost, not a wrong answer — and can produce a self-contradicting
    `TCT_SPAN_TOO_WIDE` message; compute the span from the Julian days or ISO fields the engine
    already holds.
  - Range-refusal messages at the edge name a lunation as if it were the argument
    (`addMonthsToDate(-3049305) is outside…`), and the lunation-bound message says "this
    tradition's" without naming it; message text, not contract.
- [ ] **Small findings parked by the phonetics-by-word reviews (2026-11-15).**
  None blocks 1.0.0; each is a guard or a comment that could be tighter, found by the task reviews
  and the final review and judged acceptable when the branch merged.
  - `scripts/evidence/observance-names-verifier/harness.sh`: `ONLY` refuses an unknown run name only
    after the batch has run.
  - `scripts/evidence/observance-names-verifier/replay.mjs`: the `record-column` mutant is in
    `mayLeaveUnchanged`, so a no-op edit is caught only by the message assertion.
  - `scripts/verify-month-and-yoga-names.mjs` passes the yoga `enumerated` set for every term,
    months and seasons included; harmless, and scoping it to the yoga ids is tighter.
  - A `${p.id}: ${p.message}` failure can print an id twice ("position 15: correction for
    position 15 …"); cosmetic.
  - The `(?)` refusal lives in `scripts/thl.mjs` and again in the observance verifier, where the
    copy only stops a double report.
  - The `wylie:` regex in `test/word-boundaries.test.ts` also matches inside comments; it can only
    add names, so it fails loudly and never passes silently.
  - The `CORRECTIONS` comment and its id-existence loop are repeated in three verifiers.
  - `docs/names/vocabulary.md`'s template hardcodes "none here" for longer names; not a count, but
    it goes stale if a longer term is ever added.
  - `test/nasal-rulings.test.ts` repeats THL's three nasal rule shapes, so a fourth rule added by
    THL would go unseen; `docs/names/phonetics.md` says where to re-read them.
- [x] **Composable/additive `ObservanceConfig`s — decide before 1.0.0, not after.** Today, a
      consumer combining several institutions' rule sets (e.g. `DEFAULT_OBSERVANCES` plus a `TEACHERS` and a
      `TANTRA` config) hand-rolls
      `{ ...DEFAULT_OBSERVANCES, rules: [...DEFAULT_OBSERVANCES.rules, ...TEACHERS.rules, ...TANTRA.rules] }` and silently
      drops a convention field (`doubledDay`/`skippedDay`/`leapMonth`) wherever two source configs
      disagree on it. Whether this package ships a first-class merge helper is exactly the kind of
      call [decisions/2026-08-12-public-surface.md](decisions/2026-08-12-public-surface.md) governs
      — once `ObservanceConfig` and the shipped configs are frozen at 1.0.0, adding a helper later
      is free, but its *absence* being the sanctioned way to compose configs is what would need
      revisiting, and that is a documentation claim worth getting right now rather than retrofitting.
      Needs its own brainstorm and spec. **Brainstorm started 2026-09-19; its decisions so far —
      one convention layer, JSON-storable configs, config-declared tiers, the subpath name reopened —
      are recorded under the boundary item below.** It was raised alongside the day-quality-code question
      below, in the research that became [almanac-sources.md](almanac-sources.md); that file's
      deliberation was dropped when it moved into this repo on 2026-09-05, because the decisions it
      argued toward are the ones recorded here.

      **Decided 2026-09-27 (Andreas): composition is by JSON-storable layers.** A layer over a base
      config holds rules to add, rules that replace a base rule by id, and ids to remove. Naming an id
      the base lacks is an error rather than ignored, so a typo or a base that renamed a rule fails
      loudly; the cost is that renaming a shipped rule becomes a migration for stored layers.
      Removing a rule changes the config, and is distinct from hiding one, a query-time filter on
      `rule.id`, which is what a front end wants for "I don't keep this" so it can be switched back
      on. The layer's field names and the convention-field conflict above are still to design.

      **Outstanding with it: the observance names break the names-keyed-by-language rule**
      ([decisions/2026-09-13-names-keyed-by-language.md](decisions/2026-09-13-names-keyed-by-language.md)),
      moved here from the item above on 2026-09-14 so the rule shape and the merge shape are decided
      together — the merge helper's semantics depend on what a rule carries. Both are one-way doors at 1.0.0:
      - **`ObservanceKind`** mixes ASCII Tibetan (`"duchen"`, `"sojong"`, `"tsok"`), a loanword
        (`"puja"`) and English (`"anniversary"`) as keys.
      - **`ObservanceRule.name`** is a plain phonetic string (`"Chotrul Duchen"`) with no `tibetanName`.

      Neither term set has been through a verifier, and its sources are FPMT and ordinary Buddhist
      usage rather than Janson or Henning, so this needs its own verifier, not an extension of
      `verify:month-and-yoga-names`.

      **Composed shape, proposed 2026-09-03, subtractive part settled, reconciliation part
      deferred 2026-09-04:**

      ```ts
      composeObservances({
        from: [DEFAULT_OBSERVANCES, TEACHERS, TANTRA],  // merged in order
        omit: ['chotrul-duchen'],          // by id, after merge
        extra: [myRule],                   // added after omit
      });
      ```

      Removal needs **no new API** — `rules` is already a plain array with a stable `id` per rule,
      so `.filter(r => r.id !== 'chotrul-duchen')` already works today; `omit` above is sugar over
      that, not new capability. What the helper actually buys is add + remove + merge in one call.
      **Deferred, explicitly, not left ambiguous:** which config's `doubledDay`/`skippedDay`/
      `leapMonth` wins when two configs in `from` disagree. Decide this when the helper is actually
      designed, not before

      **Done 2026-11-14, on the `observances-1.0` branch.** `composeObservances(base, layer)` ships on
      `./observances`: a layer removes, replaces and adds rules and levels by id, an unknown or repeated
      id is refused, and a layer's conventions replace the base's — which settles the deferred question,
      since a layer has one base and there is no two-config disagreement left to reconcile. The names
      are keyed by language (`englishName`, optional `tibetanName`), `ObservanceKind` went with `kind`,
      and `ObservanceRule.name` became `englishName`; fourteen Tibetan names are checked by
      `verify:observance-names`. The shape is recorded in
      [decisions/2026-11-11-observance-model.md](decisions/2026-11-11-observance-model.md). Where this entry says
      `DEFAULT_OBSERVANCES`, `ObservanceKind` or `composeObservances({ from, omit, extra })`, those are the
      names as they stood: the export is now `EXAMPLE_OBSERVANCES` and the helper takes a base and a layer.
- [x] **New subpath `./astrology`, computing Janson's Appendix E's calculations — placement, scope and
      naming decided 2026-09-03; built 2026-09-12.**

      **Shipped 2026-09-12.** Six `*For` entry points, `elementalYoga` for a bare pair, and the frozen
      yoga table — eight runtime names — on
      `tibetan-calendar-temporal/astrology`: the year's five elements and three numbers, the month's
      and lunar day's labels, the calendar day's own, the lunar mansion, the elemental yoga, and
      `attributesFor` composing the lot. Appendix D (planets) stays out of scope, as the Beyond v1
      entry below records.

      **The mansion tables were deliberately not on the surface, until strand G's review reversed
      that.** `MANSION_ELEMENTS`, `mansionElement` and `MANSION_COUNT` were exported for a few hours
      on 2026-09-12 and withdrawn the same day, after a code review observed that `mansionNumber` was
      not exported with them: a consumer could ask what element mansion 17 carries and never learn
      that today is mansion 17. A dead export cannot be removed after 1.0.0 and exposing the mansion
      later is additive, so withdrawing was the only reversible move. **Exposed for a date on
      2026-09-14** as `lunarMansionFor`, returning `{ index, element }` with the index 0–26 as Janson
      and Henning number it, and as `attributesFor(…).lunarMansion`. **The full table shipped
      2026-09-18** as `LUNAR_MANSIONS` — nine runtime names now — the same `{ index, tibetanName,
      sanskritName, element }` merge `lunarMansionFor` does for one index, run over all 27 and frozen
      like `ELEMENTAL_YOGAS`. The raw source tables (`mansionElement`, `MANSION_ELEMENTS`,
      `MANSION_COUNT`, `mansionNumber`) stay internal; only the merged, verified table is public,
      which is what the 2026-09-12 withdrawal was actually objecting to — a table with no way to
      learn a day's index, not a table at all. The question as it stood — "which mansion is the moon
      in" is something an almanac view prints, and a consumer cannot compute it from anything
      published, which is the wrong-or-impossible test the public-surface record asks for.

      **Two things it does not claim.** The mansion agrees with FPMT on **97.6%** of 1,459 days and the
      residual is characterised rather than excused — six days in four years have no explanation, and
      `docs/testing.md` says so. And nothing here is corroborated the way the *dates* are: every
      attribute check is Janson against Janson, except the mansion and the yoga's favorability, which
      are FPMT.

      **Placement — settled, and it took three tries.** Not `nyamlen` (Andreas: the backend stays
      general-purpose open source; `nyamlen` is a front-end only). Not a sibling npm package
      either, even in the same repo as an npm workspace — that was the working assumption until it
      was checked against why a sibling package looked necessary in the first place, which was the
      sole-source rule (below), and that turned out not to require it. A sibling package would
      have bought nothing this new subpath doesn't already get for free (own module, own docblock,
      no cost to a consumer who doesn't import it — tree-shaking already works this way for
      `./observances`), while costing a second `package.json`, version, `exports` map and release
      step. `./observances` is the precedent: it already cites a source other than Janson (FPMT),
      inside this package, without conflict.

      **The sole-source rule doesn't block this, and conflating it with the clean-room rule was a
      mistake corrected 2026-09-03.** The clean-room constraint is narrowly about two specific
      unlicensed npm packages — evidence of independent derivation, nothing to do with Henning, an
      independently published scholarly source this project already cites elsewhere (day-of-week
      naming, the rabjung table's lineage). Janson's own elemental-yoga section doesn't offer a
      competing formula that Henning's table would contradict — Janson states he doesn't derive the
      mansion-to-element table or the ten yogas' names/favorability himself, and points to Henning
      for both. That's an ordinary citation chain, not two sources disagreeing on one number (which
      *is* the real risk this project polices elsewhere, e.g. the `a₂` fork). Citing Henning for
      that one table is safe and necessary, documented the same way `default-observances.ts` already
      documents its FPMT citation.

      **Scope — Appendix E's calculations, Appendix D explicitly deferred.** Appendix E ("Further
      astrological calculations") defines two things: full year/month/lunar-day/calendar-day
      attribute sets (element, animal, gender, trigram, number — closed-form, cyclic, entirely
      self-derived by Janson, no second source needed) and the "elemental yoga" — the unordered
      pair of a day's weekday element and lunar-mansion element, `C(4,2)+4=10` combinations, found
      2026-08-28 to be *exactly* FPMT's ten FD-*/UD-* day-quality codes (full derivation in
      [almanac-sources.md](almanac-sources.md)'s "What Janson's Appendix E has that FPMT's list does
      not"). Both ship under `./astrology`. **Appendix D ("Planets") does not** — see the Beyond v1
      entry below for what it is and why it's excluded, not merely deferred by inertia.

      **Release — `./astrology` ships in 1.0.0, and that is a choice rather than a constraint.**
      Settled 2026-09-12. Worth stating the second half, because everything around it reads like a
      deadline: **nothing in this work is a breaking change.** A new subpath is additive, the new
      `TraditionNaming` members are additive, and making `weekdayOffset` optional is a widening — so
      the whole layer could ship as 1.1.0 without touching a consumer. It goes in 1.0.0 because the
      release should be complete, not because the timing forces it. What the decision *does* fix is
      that the Bhutan refusal semantics above freeze at 1.0.0, which is why that item is pre-1.0 and
      its sourcing half is not.

      **Naming — `./astrology`, chosen over `./almanac` and `./attributes`.** Matches Janson's own
      section title and stays disjoint from `./observances` (which "almanac" would not — both
      subpaths are almanac content under the definition this project settled on 2026-08-28).

      **Product identity — a narrow fix, not a pitch rewrite.** README.md's pitch (lines 11-13)
      already says "for almanac applications" — apps *using* this as their engine, never claimed
      to *be* one — and survives unchanged; the stale claim is `default-observances.ts`'s docblock
      line "a calendar computation engine, not an almanac," which becomes false and should be
      retired. Add "astrological attributes" to the pitch's capability list the same way
      "observances" is already there — one word, no subpath mechanics in the pitch itself, which
      stays reserved for the install line and one runnable example per
      [decisions/2026-08-23-readme-is-the-landing-page.md](decisions/2026-08-23-readme-is-the-landing-page.md).
      `./astrology`'s own module docblock explains its scope and sourcing, exactly as
      `./observances`'s does, and the API section further down documents the subpath itself.

      **Yoga favorability — settled 2026-09-04: plain exported lookup table, consumer override
      deferred.** The raw attribute computation (element/animal/trigram/number) is a total function
      needing no config at all. The ten yogas' favorability is closer to a cited convention, and
      could in principle be made consumer-overridable the way `ObservanceConfig` is — but a
      lookup table has to exist before there's anything to override, and nothing today argues for
      override at all: unlike observance conventions, there's no known institution-to-institution
      disagreement about yoga favorability for a consumer to need to express. Ship the table;
      revisit override only if a consumer actually asks for it. This matches the existing rule in
      [decisions/2026-08-12-public-surface.md](decisions/2026-08-12-public-surface.md) — expose when
      the workaround is wrong or impossible, not merely to anticipate a need — so it isn't a new
      precedent, just that rule applied here.

      FPMT's list itself still has real sourcing gaps unrelated to this subpath (NWR and Fire Puja
      have no stated days in any source found; the key page has never actually been rendered) — see
      [almanac-sources.md](almanac-sources.md)'s "Open questions." Needs its own implementation plan once
      brainstormed further; not folded into the composable-config item above, which stays
      `./observances`-only

      **Sourcing closed 2026-09-10, and three assumptions in this item were wrong.** Appendix E was
      read in full from the LaTeX. (1) Janson gives the elemental yoga **nine lines** — he defines
      the unordered pair and cites Henning for the mansion-to-element list *and* the ten names, and
      **favorability is not in Janson at all**, so FPMT is its sole witness. (2) The mansion needs
      `true_sun`, which the engine does not have: `trueDate` forms only the *difference* of the two
      equations. (3) The month and lunar-day attributes are a `leapIndexThreshold`-shaped trap —
      Janson gives a different **rule** per tradition, month numbers are Tsurphu-only, and he gives
      **no month-animal list for Bhutan**.

      **Henning turned out to be free and self-published**, at
      [kalacakra.org/calendar/symlst.htm](http://www.kalacakra.org/calendar/symlst.htm) — both
      tables, no book needed. Its traps (28 mansions where Janson numbers 27, three different things
      called "yoga" on one page, HTTP-only with a broken certificate) and the 666-of-670 confirmation
      against FPMT's own calendars are in [almanac-sources.md](almanac-sources.md). The
      reader-facing account of the whole layer is [astrology.md](astrology.md).

      **A comparison target now exists, found 2026-09-10.** [zurkhai.app](https://zurkhai.app/)
      publishes element-animal days, lunar mansions, tithi and day-quality guidance day by day —
      the only second witness to this attribute layer found so far, FPMT's `FD-*`/`UD-*` codes
      being the first. Use it to check computed output once this ships, on the same footing as the
      date cross-checks; **do not seed data from it.** Recorded in
      [almanac-sources.md](almanac-sources.md)'s "Zurkhai" section

- [x] **Decide what `./astrology` does for Bhutan's month and lunar-day attributes.** Janson gives
      no month-animal list for Bhutan, and `BHUTAN`/`BHUTAN_HENNING` are both exported and
      day-validated, so the subpath has to do *something* when handed one. Three options, and only
      one is admissible: refuse with a coded error naming the gap; return an absent or `null` field;
      or silently fall back to Phugpa's list, which would hand one tradition's answers to another and
      is the config-blind-cache failure one level up. **This is a pre-1.0.0 item and not a Beyond v1
      one**, because the answer freezes into the surface at 1.0.0 and is breaking afterwards — the
      *sourcing* half is filed separately under Beyond v1, where it has no deadline.

      **Settled 2026-09-12: coarse refusal — and left unticked deliberately**, because the shape is
      re-confirmed against the real types when the module is built. The decision stands; the box
      closes when it has survived contact with code.

      **Closed 2026-09-12, both halves having survived contact with code.** `monthAttributesFor` and
      `lunarDayAttributesFor` throw `TCT_ATTRIBUTE_NOT_SOURCED` for both Bhutanese configs, and
      `attributesFor` reports `month: null` and `lunarDay: null` while still answering everything
      tradition-free. The refusal needs no "is this Bhutan" check: a tradition nobody has sourced
      simply carries no `naming.monthAnimals` block (`naming.months` until 2026-09-13). Pinned in `test/public-api.test.ts`,
      `test/astrology/index.test.ts` and `test/guide.test.ts`, and the error code is now reachable from
      the public surface rather than sitting in that suite's unreachable list.

      **The ruling:** `monthAttributesFor` and `lunarDayAttributesFor` throw
      a coded error for Bhutan; `attributesFor` returns `null` for those two members and answers the
      rest. Chosen on **reversibility**, not taste — when Bhutan is eventually sourced, a throw
      becoming a return is a widening and breaks nobody, whereas per-field nulls could not be removed
      later without a breaking change and would tax every Phugpa consumer in the meantime.

      **It over-refuses by exactly one field, deliberately.** Only the lunar day's *animal* is
      tradition-free — `(D + 6M + 8) amod 12`, the day and month numbers alone. Its element, trigram
      and number all reach through the month, so three of the four inherit the gap. Refusing the set
      whole is safe and reversible; a seventh tradition-free export for the one computable field was
      considered and rejected under the rule that a surface grows on demonstrated need, not
      anticipation. Full reasoning in
      [decisions/2026-09-12-absent-naming-members-refuse.md](decisions/2026-09-12-absent-naming-members-refuse.md)

- [ ] **Establish Zurkhai's calculation lineage, or record that it cannot be established.** Its
      public pages state "the Phugpa school" and name no scholar, almanac edition or repository, so
      there is no way to tell whether it descends from Henning — which is why it sits in
      [almanac-sources.md](almanac-sources.md) as a comparison target rather than in
      [validation-sources.md](validation-sources.md) as a cross-check. Its December 2026 dates agree
      with ours where checked, including a skipped 15th, but agreement from inside a lineage already
      represented is not evidence. **A negative result is a result**: if the lineage cannot be
      established from public material, write that down in `validation-sources.md`'s tried-and-rejected
      list so the same source is not re-evaluated. Blocks any use of it as a fourth Phugpa cross-check.
      **A lead since 2026-09-24:** its App Store listing names the printed Buryat almanacs it was
      verified against — Yampilov-Galsanov's "Zurkhai-3" and Atsagatsky Datsan publications — which
      says what it was checked against, not how it computes, and a Buryat almanac may follow the
      Mongolian version Janson distinguishes from Phugpa. Details in
      [almanac-sources.md](almanac-sources.md)'s open questions.
      **A second lead, 2026-09-24:** the iOS app's list of Hurals puts four 2027 festivals in the
      months the **Mongolian** version numbers them, a month from Phugpa's, in a stretch where the two
      disagree; three other Hurals fit neither version. Evidence for New Genden against the site's
      own "Phugpa" label, not a settled lineage, and recorded in the same place

- [x] **Read Zurkhai's App Store metadata and complete its
      [other-implementations.md](other-implementations.md) entry.** `apps.apple.com/us/app/id6772695315`
      returned HTTP 429 on both attempts on 2026-09-10, so seller, version, release date and
      description are unknown, and that file's discipline is that every claim carries a source and an
      access date. The entry is written and marked incomplete rather than left out. Small; needs only
      a successful fetch.
      **Done 2026-09-24**, through Apple's lookup API rather than the store page: seller Nikolai
      Tsyrenov, first released 27 May 2026, version 1.5. The description names two printed Buryat
      almanacs the app was "verified against" — recorded as a lead under the lineage item above, not
      as its answer

**Documentation**

- [x] **Split the README into a landing page and a guide.** Done 2026-08-23. The README carries the
      pitch, install line and one runnable example in its first 40 rendered lines; `docs/guide.md`
      takes the long-form material in three sections. Constraint recorded in
      [decisions/2026-08-23-readme-is-the-landing-page.md](decisions/2026-08-23-readme-is-the-landing-page.md)
- [x] **`docs/why-trust-these-dates.md`** — the reader-facing account of what has been validated and
      over which years, written for a non-programmer. It is the only document besides
      [testing.md](testing.md) permitted to quote a validation window; everything else links to it
- [x] **Extend FPMT's calendars through 2026, once December 2026 is published — after the
      why-trust suite, which landed 2026-09-18.** Done 2026-11-08: the generator's baseline run
      reproduced the committed 2022–2025 fixture byte-for-byte, then `2022 2026` added 365 rows (the
      generator now defaults to 2026). The mansion residual came back to 2 in 2026, so 2025 is not a
      trend; the Henning comparison over 2026 agrees on all 362 counted days. The text below is the
      original plan, kept for its reasoning. Run `scripts/fetch-fpmt-observances.mjs` with
      `2022 2026`. Not before: the script takes whole years only, deliberately, since its day-count
      check assumes them and a partial year would let the fixture shrink silently, and months not yet
      past are forecasts FPMT can revise. As of 2026-09-18 it publishes through October 2026.
      The order matters because `test/why-trust-these-dates.test.ts` computes every figure the
      extension moves — the windows, the mansion's 1,459 days and 97.6%, favorability's 1,460 and
      99.7%, the FPMT disagreement dates — so it names each one that needs rewriting rather than leaving
      them to be hunted by hand.
      **Re-run the Henning mansion comparison over 2026 (`kalacakra.org/calendar/tdata/pl_2026.txt`) at
      the same time**: the page ties its "all 1,459 of those days" to the computed mansion day count,
      so the suite fails until the comparison is re-measured and the sentence updated. Worth doing for
      the mansion residual above all, which ran 6, 2, 5 and 22 over 2022–2025: if 2026 keeps rising,
      "the difference is FPMT's" is a trend rather than a figure.
- [x] **`docs/other-implementations.md`** — a survey of the other software that computes Tibetan
      dates, framed as "when to use which" rather than as a comparison. Every claim from public
      metadata, with an access date; no competitor source read
- [x] **Ship the two consumer documents to npm** — `package.json#files` gains `docs/guide.md` and
      `docs/why-trust-these-dates.md`, so condensing the README costs a consumer nothing
      structurally. `docs/other-implementations.md` and every contributor document stay repo-only
- [x] **A benchmark, outside CI.** `npm run bench` joins `coverage`, `verify:names` and
      `verify:rabjung-names` as a release-time check that gates nothing. It exists because two
      numbers were already load-bearing and unmeasured: the `getObservances` span cap, which
      justifies a shipped `TCT_SPAN_TOO_WIDE`, and the `monthsFor` cache. The first turned out to be
      wrong — about 270 ms, not the 190 ms the docblock claimed — and was corrected. Harness in
      `bench/RESULTS.md`; **no figure may be quoted without it**
- [x] **Announce `./astrology` in the README, and decide whether `docs/astrology.md` ships —
      both *after* the subpath's code lands, not before.** Scoped 2026-09-11 when Andreas asked
      whether to do it early, on the reasoning that the module will be built before 1.0.0 anyway.
      That reasoning is sound; the sequencing argument is not about it.

      **Done 2026-09-12, with the subpath.** The README gained a capability row, a usage section and a
      `### tibetan-calendar-temporal/astrology` API section with its own type list, and
      `test/readme.test.ts` asserts every value the usage block prints. Rule 13 was reshaped to three
      barrels and proved by three mutants plus a control — and it immediately earned its keep by
      rejecting two types **declared** in the barrel rather than re-exported, which is how
      `src/astrology/types.ts` came to exist.

      **D7 decided 2026-09-12: `docs/astrology.md` does NOT ship, and `docs/guide.md` carries the
      consumer account instead.** The need is real — a consumer has to know what the attributes mean
      and where each piece comes from — but it is met better by a document already written in the
      consumer register and already covered by `test/guide.test.ts`, which now asserts the new
      section's five values. Shipping the scope document would have meant rewriting it and converting
      six of its seven relative links, for prose a reader reaches from the README by absolute URL
      anyway. **This is reversible and deliberately taken rather than deferred**: adding a file to
      `files` later is additive, so nothing freezes at 1.0.0 either way.

      **Neither change is the one-liner it looks like.**

      The pitch edit is not one word. The API section gains a whole
      `### tibetan-calendar-temporal/astrology` section at the same moment, and the rule 13 reshape
      below is part of the same change. Adding "astrological attributes" to the capability list
      while the API section documents nothing leaves the README internally inconsistent for however
      long implementation takes — and its first 40 rendered lines are the one part of the file
      carrying a rule, per
      [decisions/2026-08-23-readme-is-the-landing-page.md](decisions/2026-08-23-readme-is-the-landing-page.md).

      **Adding `docs/astrology.md` to `package.json#files` would fail `test:pack` today**, and it is
      four changes rather than one: add it to `files`; add it to `scripts/check-pack.mjs`, which
      hardcodes its own `shippedDocs` list; convert its repo-only relative links to absolute URLs —
      **six of its seven**, since only [how-it-is-calculated.md](how-it-is-calculated.md) is in the
      tarball; and delete the "Repo-only" banner the document currently carries. `check-pack` throws
      on a shipped doc that links outside the tarball, which is what makes this a hard failure rather
      than a cosmetic one.

      **And whether it ships at all is an open decision, not a formality.** Three documents ship
      today, each for a stated reason; a fourth is not automatic. The argument for is that a consumer
      using the subpath needs to know what the attributes mean and where they come from, which a
      module docblock cannot carry. The argument against is the real cost: the file is written as a
      **scope document** — status banner, deliberately no API examples — so shipping it means
      rewriting it in the consumer register with **asserted** examples, because a shipped document's
      examples are contract and `test/guide.test.ts` asserts every one that states a value. Budget
      the rewrite or do not ship it; do not ship it unrewritten.

      Also in the same change: **rule 13 in `scripts/check-conventions.mjs` breaks in shape, not in
      size.** It hardcodes `TYPE_BARRELS` as a two-element array and splits the README on a single
      `OBSERVANCES_HEADING` boundary, and one boundary cannot separate three sections. It fails
      **silently** — an unextended rule 13 keeps passing while checking nothing about the new barrel
      — so prove the reshape by mutation rather than by the suite going green

- [ ] **On the 1.0.0 render, confirm npm rewrites the README's relative links** against
      `repository`. If it does not, the `docs/` links in the README need absolute URLs — the two
      shipped documents are unaffected either way, since they are in the tarball
- [ ] **Analyse `docs/` for a folder structure, and do it before 1.0.0 fixes the links.** The folder
      is flat and mixes three audiences: the two consumer documents that ship to npm
      ([guide.md](guide.md), [why-trust-these-dates.md](why-trust-these-dates.md)), contributor
      documents ([coding-standards.md](coding-standards.md), [testing.md](testing.md)), and
      source-and-provenance documents ([validation-sources.md](validation-sources.md),
      [traditions.md](traditions.md), [other-implementations.md](other-implementations.md),
      [names/](names/), [decisions/](decisions/)). Open questions to settle, not assume: where
      [how-it-is-calculated.md](how-it-is-calculated.md) goes — it is read by consumers *and* by
      anyone touching the arithmetic, which is the argument for leaving it at the top level rather
      than filing it under either audience; and whether a `docs/contributing/` folder earns itself
      when `CONTRIBUTING.md` stays at the repo root and would then point sideways into it.
      Three things make the move cheap now and expensive later: `package.json#files` names the two
      shipped documents **by path**, so a move is a tarball-layout change; npm's rewriting of the
      README's relative links is still unconfirmed (item above); and `scripts/check-conventions.mjs`
      hardcodes `docs/coding-standards.md` and `docs/decisions/*.md`, while rule 12's template
      pattern is deliberately path-shaped — a move must keep `check:links` and `check:conventions`
      green **in the same commit**, and CLAUDE.md's own links must move with it

**Package**

- [x] Remove the `STATUS` export from `index.js` — done in Phase 0; `index.js` is gone entirely,
      replaced by `src/index.ts` compiled to `dist/`
- [ ] Remove the placeholder banner from `README.md`, **in the same release that publishes 1.0.0**,
      not as tidy-up beforehand. This is a file edit with a publishing precondition: npmjs.com serves
      the README from the tarball of whichever version holds the `latest` dist-tag, so editing the
      file alone changes nothing a consumer sees. Until that publish the banner is *accurate* — the
      published version really does export nothing — so removing it early would make the repository
      state the false half of the pair. The `description` in `package.json`, which still reads
      "Pre-release placeholder — implementation in development", changes in the same commit
- [x] Revisit `engines: ">=22"` — resolved to `">=26"`, plus a runtime guard.

      The old declaration said Node 22 was supported, so a Node 22 consumer installed the package
      with no warning at all. It then failed on `import`, before any call: `conversion.ts` builds
      its Unix-epoch anchor at module evaluation, which needs Temporal, and Node 22 has none. What
      they saw was `ReferenceError: Temporal is not defined` — naming neither Temporal as a
      requirement nor the polyfill that supplies it.

      Two separate fixes, because they cover different failures. `">=26"` makes the declaration
      true; npm treats `engines` as a warning rather than a block, so a consumer who does supply a
      polyfill is still not locked out. The guard then turns the remaining failure — polyfill
      absent — into a message naming Node 26 and `temporal-polyfill/global`. Neither would have
      surfaced in-repo: CI tests one Node version, and it is 26.

      The consumer-facing half of this landed later, and separately: the guard's message, the
      polyfill's name, the fact that the failure is at *import* time, and the reason
      `--harmony-temporal` is the wrong answer all lived only in `CLAUDE.md`, `CONTRIBUTING.md`
      and this checkbox — none of which ship to npm. `README.md` was at the time the only
      documentation in `package.json#files`, so it took all of it under "Requirements". (That
      changed on 2026-08-23: `files` now also ships `docs/guide.md` and
      `docs/why-trust-these-dates.md`, which is what let the README condense without a consumer
      losing anything. The Requirements material stayed in the README regardless — it is the first
      thing a reader needs and the last thing to move behind a link.)
- [x] **Decided: no `main` field.** `exports` supersedes it on every toolchain that can run this
      package at all, and the only consumer it would serve is one resolving by Node 10 rules —
      which by definition predates `exports`, and cannot run an ESM-only package needing Node 26
      regardless. `attw` reports exactly this as its `node10` row, which is why `check:publish`
      runs it under `--profile esm-only`: the row is the deliberate design, not a defect. Adding
      `main` would make that row green and change nothing real
- [x] Add `types` to the `exports` map once TypeScript declarations are built — done in Phase 0
- [x] Add the `./observances` subpath export once `src/observances/` exists — done in Phase 3.
      Renamed from `./practice`: a "practice day" asserts something about the practitioner that
      the calendar cannot know
- [x] **Decided: the Julian-day helpers stay public** — done in Phase 3's surface review. They
      are not plumbing at the wrong altitude; in calendrical software the Julian day is the domain
      interchange representation, and they are the extension point that stops this being a closed
      box. The altitude complaint was a documentation problem, fixed by grouping them under
      "Interoperability" in the README. See
      [decisions/2026-08-12-public-surface.md](decisions/2026-08-12-public-surface.md), which
      states the rule the decision came from: expose when the consumer-side workaround is wrong or
      impossible, keep internal when it merely costs a loop.

      <details><summary>The original question</summary>

      **Decide whether the Julian-day helpers stay public.** `julianDayFromIso`,
      `isoFromJulianDay` and `tibetanWeekday` sit at a lower altitude than the rest of the
      surface, which is why the question only became visible when the README's API table put all
      ten exports side by side. Once published, removing one is breaking and keeping one is
      permanent.
      - *Keep them.* They are genuinely useful for almanac work, and `tibetanWeekday` is the only
        route to the traditional 0 = Saturday numbering, which `TibetanDate.dayOfWeek`
        deliberately does not expose.
      - *Make them internal.* A tighter surface of seven, all at the same altitude. The almanac
        weekday numbering would then need re-exposing some other way, or dropping.

      Either way, `test/public-api.test.ts` pins the list, so the choice has to be made
      explicitly rather than drifting.

      </details>

- [x] **Export month enumeration** — done 2026-08-13, as five names rather than the three or four
      this item anticipated: `monthsFor`, `daysInMonth`, `hasLeapMonth`, `leapMonthNumberFor` and
      `monthsInYear`.

      Four things came out differently from this item as written.

      - **The list function was the missing piece, and it was not on the list.** This item named
        only scalars, but the ordering — leap month immediately *before* the regular month sharing
        its number — is the part a consumer most easily gets wrong, and no scalar exposes it.
        `monthsFor` does, and carries each month's `firstDay` and `lastDay` because they are
        computed anyway to get `days`.
      - **"They already exist, so this is exporting working code" is not an argument for exporting
        them.** It is an implementation-cost argument, and it carried no weight either way. The
        scalars ship because deriving them from `monthsFor` is *correct and grossly
        disproportionate* — 26 `julianDayOfLunarDay` calls against a five-operation closed form.
        That case was missing from the public-surface rule, which now records it.
      - **`isLeapYear` ships as `hasLeapMonth`.** A Tibetan leap year gains a month, not a day, and
        every other `leap` name here denotes the thing that is duplicated. The internal per-month
        predicate was renamed to `sharesNumberWithLeapMonth` to free the name. See
        [decisions/2026-08-13-api-vocabulary.md](decisions/2026-08-13-api-vocabulary.md).
      - **`days` is a trap worth documenting loudly.** It counts calendar days, 29 or 30, while the
        date numbering always runs 1–30. Looping `1..days` builds a silently wrong grid, so the
        docblock, the README and the type all say so.

      Phase 3's surface review had kept these internal on negative evidence — the observance engine
      never asked — and deferred the call on the tie-breaker that adding later is non-breaking. That
      worked as intended: the decision was made on evidence rather than anticipation. See
      [decisions/2026-08-12-public-surface.md](decisions/2026-08-12-public-surface.md).

- [x] **Add `parseTibetanDate`, the counterpart to `formatTibetanDate`** — done 2026-08-13. Two
      things came out differently.

      - **It returns `TibetanDateFields`, not a resolved date, and takes no config.** `"2150-M12-29"`
        is a well-formed string naming a *skipped* date. Almanacs print such dates — that is why
        `SkippedDayError` exists rather than a `null` return — so a parser that threw on them could
        not read back a published table, which is most of the point of having one.
      - **Closing the round trip meant widening `formatTibetanDate`, not narrowing the parser.**
        The formatter took `TibetanDate` and read its `monthCode`, so `format(parse(s))` did not
        even typecheck and the "symmetry" would have been a four-step pipeline through the
        calendar. It now takes `TibetanDateFields` and derives the month segment, which is
        non-breaking — `TibetanDate` stays assignable — and strictly more robust, since an object
        whose `month` and `monthCode` disagree can no longer render a self-contradicting string.

      That widening also let `SkippedDayError` stop hand-rolling its own rendering. It printed
      `2150-12-29` — no `M`, indistinguishable from an ISO date by eye — and used ` (leap)` for a
      leap *month* where the formatter uses it for a leap *day*. Two incompatible renderings of a
      date inside one package is exactly what `formatTibetanDate` exists to prevent.

      The grammar is strict, on the rule that a parser can be loosened later without breaking anyone
      but cannot be tightened. `tryParseTibetanDate` was considered and dropped for the same reason:
      additive later.

- [x] **Conventions are enforced rather than remembered** — done 2026-08-16.
      `scripts/check-conventions.mjs` gates seven rules nothing previously checked — thirteen as of
      2026-08-26, the later six added as the conventions they enforce were written — Biome bans the
      `Date` global in `src/`, and markdownlint finally runs in CI against the config that had
      existed for weeks unread. CI is nine commands. Every rule and its enforcement status is in
      [coding-standards.md](coding-standards.md), which the guard also validates against reality so
      it cannot drift.

      **That last clause overstated itself, and this sentence proved it.** The guard checks that the
      map names real commands and paths; it does not check a *count*, and Rule 12's hardcoded-count
      rule covers only **generated** documents. So "twelve as of 2026-08-22" survived the addition of
      Rule 13 on 2026-08-26 — in the same commit that updated `CLAUDE.md` and
      [coding-standards.md](coding-standards.md) and missed this line. A count stated in prose is
      unguarded wherever it appears; prefer naming the newest rule over totalling them.

      Three violations existed when the guard first ran: a bare `new Error` in `epoch.ts`, the same
      constraint discharged by a cast in `names.ts`, and seven divisions carrying no statement of
      why they stay exact. All three are fixed; `assertInternal` is now the single idiom for
      discharging a `noUncheckedIndexedAccess` widening.

- [ ] **Audit and correct all 629 docblocks against actual behaviour** — see
      [Phase 4a](#implementation-phases) for the effort estimate.
      **Since 2026-11-15 it also applies a content rule**: a docblock holds what a caller needs, and
      rationale moves to `//` comments, history to commits —
      [decisions/2026-11-15-docblocks-are-for-callers.md](decisions/2026-11-15-docblocks-are-for-callers.md).
      Moving text can exceed the 8,000 changed lines one ultrareview takes, so the audit gets its own
      branch, separate from the code-review fixes. `src/types.ts` (56),
      `src/computation/calendar.ts` (30), `src/observances/types.ts` (28),
      `src/computation/scaling.ts` (22) and `src/navigation.ts` (16) are the concentrations, across
      22 files in `src/` in total.

      **Recount 2026-11-16: 629 docblocks, 6,562 docblock lines, in 44 files of `src/`**, counted as lines
      opening `/**` and the lines up to the closing `*/`.
      The per-file figures and the 22-file total above, and the 10h estimate, are from the 2026-08-15 count.

      **Recount 2026-08-15: 265 became 300.** The navigation and naming work added 35, and the
      10h estimate predates them — it has not been revisited. The new ones are the least likely to
      be stale, having just been written against the behaviour, but they are also where the newest
      contract statements live, so they are not exempt from the audit.

      Docblocks reach the shipped `.d.ts` and are what editor hover shows, so a stale one is a false
      contract statement, not a tidying issue. This review already found three: `hasLeapMonth`,
      `leapMonthNumberFor` and `monthsInYear` promised exactness "for any safe integer year" (corrected
      when the arithmetic was fixed); `getObservances` stated a threat model its guard did not cover
      (Finding 1); and `asPlainDate` argued for a widening that was later removed (Finding 2 — see
      [decisions/2026-08-13-tibetan-date-input-boundary.md](decisions/2026-08-13-tibetan-date-input-boundary.md),
      which records what superseded it). None was caught by lint, typecheck or the suite, because
      nothing checks prose against behaviour.

      Check, in this priority order:

      1. Every factual claim is true of the code as it now stands — bounds, ranges, totality, what
         throws and with which code, what is accepted and what is refused.
      2. Every `@throws` matches the codes actually thrown, including any this plan's Part 1 added.
      3. Every `@example` runs and produces the stated output. **Now automated** —
         `test/docblock-examples.test.ts` asserts all 43 concrete claims across the 30 example
         blocks, so this item is permanently closed. It found one wrong on its first run
         (`leapMonthNumberFor`, documented `2153 → 6` when 2153 has no leap month), and a second
         defect of a different kind: the example was tradition-blind on a config-taking function.
         Check that too — an example states one tradition's answer and must say which.
      4. Every `{@link}` resolves. **Now automated** — `check:conventions` checks all 199 of them
         on every push, so this item is permanently closed rather than closed once.
      5. Citations follow the clean-room rule: by section and content, never by a rendered equation
         or table number.
      6. Only then, prose quality and consistency of voice.

- [ ] **Three refusal messages that misdescribe their own check — found by the docblock audit,
      deliberately not fixed on its comments-only branch, because each is a string literal and
      changing one is a code change.** Messages are not contract, but each is read by a consumer.
      1. **`MANSION_ELEMENTS`'s `assertInternal` message** in `src/astrology/mansion-elements.ts`
         reads "element counts are …, not earth:6 fire:7 water:7 wind:7. Henning's 28 divide seven
         to each element, so the 27 must lose exactly one earth — and that is Abhijit. Any other
         signature means the wrong entry was dropped or the table was mistranscribed".
         The first two sentences are true and the third implies that the right signature proves the
         right entry was dropped, which it does not: dropping any one of the seven earth mansions
         gives `earth:6 fire:7 water:7 wind:7`.
         It should say that the counts catch a mistyped element or a dropped non-earth mansion, and
         that Abhijit itself is pinned by the filter on its name and the length check above it.
         Decided by Andreas, 2026-11-17, as a roadmap entry rather than a fix on that branch.
      2. **`validatedTradition`'s refusal of `meanDate.perMonth` against `meanDate.perDay`** in
         `src/traditions/validate.ts` reads "Janson's m₂ is m₁/30 in every version, and the search
         for a lunar day's date is bounded only while that holds".
         The first clause is false: his original Kālacakra Tantra (*karaṇa*) version gives
         `m₂ = 59/60` beside `m₁ = 29;31,50 ⟨60,60⟩` and does not satisfy it, and the code comment
         above the check already says so.
         It should say that the tradition must have `m₂ = m₁/30`, as the Phugpa version and every
         other modern version he knows of do, and name the bound the search window needs, without
         claiming it of every version.
      3. **`asPlainDate` and `asWesternDay` in `src/computation/conversion.ts`** name no caller in
         two refusals.
         For a `Temporal.PlainDate` in another calendar, or an ISO string carrying one, `asPlainDate`
         refuses with "received a Temporal.PlainDate in the hebrew calendar. The arithmetic here is
         defined on ISO days, so the calendar has to be said explicitly: convert it with
         .withCalendar("iso8601"), which names the same day." and no `f(x):` prefix, where its other
         refusals open with the subject.
         `asWesternDay`, given a string it cannot parse, refuses with "expected a Temporal.PlainDate,
         received "junk": Temporal error: Invalid character while parsing year value." and no
         subject at all, because it passes none for a string.
         Both should open with the caller's name as the other refusals do.
         Reproduce with `asPlainDate(Temporal.PlainDate.from("2007-01-01").withCalendar("hebrew"),
         "f(x)")` and `asWesternDay("f", "junk")` against a build.

- [x] **Decided: `name` is a required field on `Rabjung`.** Free now at `0.0.1`, a breaking change
      after `1.0.0`, and approved on its own against the real, fully-sourced table rather than as a
      rider on the generator work that produced it — see
      [decisions/2026-08-21-rabjung-names-carry-both.md](decisions/2026-08-21-rabjung-names-carry-both.md).
      Optionality was investigated and rejected on evidence: `toEqual` fails on an extra *runtime*
      property regardless of the type, so `name?:` would have saved none of the 14 migrated
      assertion sites while costing permanent narrowing under `exactOptionalPropertyTypes` for a
      field that is total over 1–60.
- [x] **The rabjung name shape — settled 2026-08-25, and the answer was "neither list".**
      `Rabjung.name` — `tibetanName` since 2026-09-13 — is a plain `TibetanName`. The item asked whether `sanskrit` sat at the right
      level; the answer is that it should not be there at all, because the cycle has **two** Sanskrit
      lists carrying different names at 16, 17, 18, 20 and 34, so any type pairing one of them with
      the Tibetan name misnames 8% of years with nothing about the output looking wrong. The
      asymmetry the 2026-08-24 constraint identified is what closed it: only the Indic list has an
      attested Devanāgarī, so only it can carry a sourced gloss, and shipping the pair honestly means
      shipping both with a visible asymmetry rather than one silently. That shape is recorded in
      [decisions/2026-08-25-rabjung-ships-the-tibetan-name-only.md](decisions/2026-08-25-rabjung-ships-the-tibetan-name-only.md)
      so it need not be re-derived, along with the four implications that are why it is not shipping
      now, and the constraint that the trigger for revisiting is a **stated consumer need** rather
      than symmetry. Growing the smaller type into it is additive for readers and breaks only code
      that *constructs* a `Rabjung`; the reverse is breaking outright, which is why the small shape
      goes first.

**Review passes**

Four full-repository reviews, deliberately ordered: the surface is settled before the code is
reviewed against it, the code is settled before it is attacked, and the adversarial pass runs last
so it sees the final state rather than a moving one. The flags recorded here are the ones to use;
where a command is **diff-shaped** that is noted, because running it on a clean `main` reviews
nothing and reports success.

- [x] **Full API surface review** — closed 2026-08-27. The closing condition was met: spike 3 ran
      uncontaminated against a tarball packed from the finished branch, from a brief specifying
      tasks rather than function names. **The six names added on 2026-08-26 drew zero friction** —
      the spike used all of them without incident, which is the result the gate existed to test, and
      it is the item's real outcome rather than the static read it planned.
      **Two findings, and the second moved the surface again.** Nothing shipped stated that the
      *types* need TypeScript 7 — a consumer could satisfy every documented requirement, on Node 26,
      and still not compile a line, since `TS2503: Cannot find namespace 'Temporal'` hits every
      declaration file naming a date. And the moon pair read a bare `{ year, month, day }` as
      Tibetan, inverting `asPlainDate`'s refusal of that shape as ambiguous; measured, it returned a
      day in **1899** for a date meant as 2026. That was ruled a change-the-API item and the
      parameter narrowed to `Temporal.PlainDate | TibetanDate`.
      **The bound was therefore triggered, and escalated rather than iterated** — a fourth spike was
      ruled unnecessary on 2026-08-27, on evidence rather than convenience: the narrowing is a
      partial revert adding **no new name**, its failure mode is a compile error rather than a
      plausible wrong answer, and a migration check against the spike's own CLI cost **one compile
      error fixed by one line**, using `resolveDate`, which that CLI already imported for another
      command.
      **The namespace-object question, open since 2026-08-26, is also settled** — no namespace
      object, on measurement: a consumer's own `import * as` already tree-shakes to a byte-identical
      bundle, while a namespace object *shipped by the package* costs **+142%** on a minimal
      consumer, because the object holds live references to every export.
      **What has landed.** The item planned a *static* read of the barrel with two review commands.
      What settled it was a second **consumer spike** against a packed tarball, in an
      uncontaminated session: six findings, all six moved the surface, and the sharpest was
      invisible to any static pass — `weekdayNameFor(date.dayOfWeek)` compiled and returned the
      wrong name, measured at 60 silently wrong calls in 70 days. Ten changes: six added names
      (`resolveMonth`, `resolveDate`, `formatTibetanMonth`, `parseTibetanMonth`,
      `addMonthsToDate`, `asTibetanWeekday`), four reshaped (`addMonths` narrowed to reject a
      date, `getObservances`/`observancesOn` to an options bag, the moon functions widened —
      **and narrowed again on 2026-08-27, see above** — `leapMonthOfYear` → `leapMonthNumberFor`),
      plus the absent-field error code. Recorded as the fourth and fifth `## Revisited` sections in
      [decisions/2026-08-12-public-surface.md](decisions/2026-08-12-public-surface.md), which also
      reconciles this record's "14 functions to 25" against today's 37 — unit-mixing, not drift.
      **Two things the item did not anticipate.** `test/public-api.test.ts` pins names and
      **kinds**, not signatures, so reshaping `getObservances` broke 16 call sites and **nothing
      reported it as an API change**; it surfaced as ordinary type errors. And one recommendation
      was **withdrawn** on examination — the two conversion-naming families were suspected of
      contradicting each other and do not — which is now a rule rather than a rename.
      **How it was closed, and what the second brief proved.** Re-packed, second brief written,
      Stage 3 re-run in a fresh session on 2026-08-27. The brief differed from the first in three
      ways that were not cosmetic: it specified **tasks, not function names**, so discoverability
      was tested rather than assumed; it measured coverage against the tarball's own `.d.ts`, which
      the spike enumerated itself, so non-use read as a discoverability finding; and it **did not
      say which names were new**. All three earned their keep — the `lunation` finding is a pure
      discoverability result the first brief's format could not have produced, since handing over
      the name is what destroys the measurement. Bounded at this one re-entry; the escalation that
      bound triggered is recorded above.
      **What the residual sweep found**, run over the names and type shapes no consumer has
      exercised: two documentation drifts and no API change, which is the outcome declared likely in
      advance. `docs/architecture.md` showed `TibetanYearName` with **3 of its 6 fields** — the
      three `*Name` fields arrived with the naming layer and the shape was never updated — and
      `TibetanMonthFields` without its `calendarId` phantom. Both are the completeness rule failing
      silently, the same way `TibetanDate` had drifted to 10 of 15. `TibetanDateFields` was missing
      altogether and is now documented beside its month counterpart. `hasLeapMonth` was closed with
      a pointer to [decisions/2026-08-13-api-vocabulary.md](decisions/2026-08-13-api-vocabulary.md),
      which already rules it, and `TibetanWeekdayElement` — which the spike could not place from the
      export list — is kept under the first test: typing it as `TibetanElement` would make `wind`
      unrepresentable, and `wind` is not a year element at all
- [x] **Decide what belongs in this package's general observance layer versus what stays
      FPMT-specific, and validate/document the result — before the code review reaches it.** This
      absorbs two questions that were tracked as separate, cross-referenced items and are now one
      decision, because the second changes the shape of the first.

      **The boundary.** `DEFAULT_OBSERVANCES`'s **ten** shipped rules (four fixed-date duchens, six
      monthly-cycle rules) are enumerated only in `src/observances/default-observances.ts`; no
      consumer-facing document lists them, unlike the config's *absences* (Losar, teacher
      anniversaries, astrological day qualities, sojong), which that file's own docblock documents
      in detail. `DEFAULT_OBSERVANCES` bundles FPMT's specific convention choices (`doubledDay: "second"`,
      `leapMonth: "leap"`) together with its rule set as one object; decide whether any of the
      ten are general enough — true of the tradition rather than particular to this
      institution — to belong somewhere a differently-scoped default could carry, or whether the
      whole set is correctly FPMT-specific and the only fix is documenting it as such.

      **This item said "eleven" from 2026-08-28 until 2026-09-04, and the arithmetic beside it —
      four duchens plus six monthly — always said ten.** The miscount came from counting `id:`
      occurrences in `default-gelug.ts`, of which there are eleven: ten rule ids plus the config's
      own `id` on line 60. `README.md` had said ten correctly the whole time. Caught by an
      architecture review of the rename plan, not by any check — nothing counts a config's rules
      against the prose describing them, which is the same unguarded-prose class as the type-list
      drift recorded under Review passes.

      **Sojong — still wanted, but the one candidate rule found so far is falsified, checked
      2026-09-04.** Andreas: sojong should be included, so this stays open rather than closing as
      "cannot be done." Phase 3 shipped nothing for it — a fixed 15th-and-30th rule misses 38 of
      FPMT's 2022-2025 occurrences and invents 36 (full divergence table and history in the Sojong
      item below). [almanac-sources.md](almanac-sources.md) (moved into this repo 2026-09-05) recorded a candidate from
      an oral teaching — sojong at the end of an odd Tibetan month falls on the 14th, at the end of
      an even month on the 15th — and it has now been run computationally against the roadmap's own
      seven-row divergence table. **Result: 4 of 7 match, 3 mismatch, and the failures are not
      edge-case noise.** Two of the three (2026-06-14/15, an ordinary non-leap month) are a clean
      inversion — the rule predicts sojong on the 30th and none on the 29th; FPMT prints exactly the
      reverse. Two further readings of "which month" were tried — true sequential lunation number,
      and position-within-the-year counted from Losar — both did *worse* (2 of 7 each) than the
      naive nominal-month reading. **Verdict: this specific rule does not verify and must not ship
      as-is.** Either the teaching notes are incomplete (something about waxing/waning
      identification, or an epoch convention, wasn't fully captured — plausible, given the source's
      own disclaimer that transcription errors are the transcriber's), or the "simple" restatement
      the notes give doesn't actually match the fuller rule stated earlier in the same document.
      Sojong inclusion stays open pending a **different or corrected** source — this one is closed,
      not merely unconfirmed.

      **Reversed 2026-09-19: the teaching was right, and the 2026-09-04 test misread it.** "The 14th"
      and "the 15th" count the **days since the previous sojong**, not Tibetan dates 29 and 30 — the
      notes' last line says so: "there are 14 or 15 days between the Sojongs". Read that way, FPMT's
      99 sojongs of 2022–2025 follow it: every waxing fortnight is 15 days, a waning one is 14 at the
      end of an odd month and 15 at the end of an even one, and the 2024 leap month 6 counts as even —
      a 354-day schematic year. A count from 2022-01-02 reproduces **95 of the 98 intervals**. The
      residue is a one-day excursion (2022-03-18, undone at 2022-04-30) and one permanent extra day
      from 2023-01-07, which a 354-day scheme needs every few years to stay with the moon. **Where
      that extra day goes is the one unsourced piece**, and it was put to Ven. Thubten Chöying for
      her teacher on 2026-09-19. **Superseded 2026-09-27: there is no extra day.** Rabten Choeling's
      calendar, 2000–2100, is reproduced in full by re-anchoring the count each year on the month-1
      full moon, and under that rule the 2022-03-18 "excursion" is the anchor and the 2023-01-07
      "extra day" is FPMT undoing a 14-day fortnight it gave month 2 on 2022-04-30. Inferred, not
      sourced; the rule and its limits are in
      [almanac-sources.md](almanac-sources.md#sojong-a-counted-schedule-once-falsified-by-a-misreading).
      Sojong also lands on days 14, 16 and 1, which no day-number rule can
      produce, and it is not the astronomical syzygy either (a 51-hour spread across timezones).
      It is **computation**, so shipping it needs a counted-schedule rule shape the model lacks.

      Two claims this falsifies. FPMT's sojong on the first of the doubled 30 of 2025-11-19 is
      **not** FPMT contradicting its own doubled-day guidance — the count simply lands there. That
      claim is in `src/observances/types.ts`, `src/observances/default-observances.ts`,
      `decisions/2026-08-12-observance-policy.md` (since deleted, and superseded by
      [decisions/2026-11-11-observance-model.md](decisions/2026-11-11-observance-model.md)), the
      Sojong item below, and [almanac-sources.md](almanac-sources.md); all five corrected
      2026-09-19. And almanac-sources.md's "falsified, do not re-test without new material" was the wrong
      instruction: the material was already in hand.

      **The boundary, decided 2026-09-19** (brainstorm in progress, not yet designed):

      - The package is organised **by kind of claim**. Calculations live in the root and
        `./astrology`. Conventions — occasions *and* the almanac's activity-advice codes (NB, NCH,
        GCH, NMP and the rest) — share one convention layer: one config type, one engine, one query.
        Whether that layer keeps the name `./observances` is reopened, to be decided once its scope is
        fixed.
      - **The goal is that the engine can reproduce FPMT's calendar in full.** FPMT's own content —
        its labels, which pujas, its tiers, its anniversaries — is **front-end content**, not the
        package's. A complete FPMT config lives in the **test suite** and a validation suite proves
        day by day that the engine reproduces FPMT; it is not exported. A content pack only if
        several consumers ask. `docs/guide.md` shows a short worked example.
      - **What the package does ship:** content true of the tradition rather than of FPMT — the four
        düchens, sojong's counted schedule once sourced, and **seven** Tibetan-dated lineage
        anniversaries (Milarepa, Guru Rinpoche, Gampopa, the Sixteenth Karmapa, Lama Tsong Khapa,
        Sakya Pandita, Dudjom Rinpoche; Lama Thubten Yeshe, FPMT's founder, stays in the FPMT
        config). The rule model must also express Western-dated anniversaries, periods and an age,
        for a consumer's own. The export may not name FPMT; its `source` cites it.
      - **Tiers stay a concept in the engine**, as a "who it is for" field, but the levels are
        declared by each config rather than fixed at 1-2-3. Only tsok's tier is sourced today.
      - **Configs should stay storable as plain JSON** — validated, frozen, serialisable, never
        executing stored code. The cost is a rule vocabulary rich enough for every FPMT item: day
        lists, month tables, named formulas, counted schedules, periods, Western dates.
      - **Eclipses are not computed** — see the Rahu entry under Beyond v1.

      **Amended 2026-09-20.** Two further decisions, and two consequences they open:

      - **Eclipses are the front end's responsibility, full stop** — not computed, no shipped table,
        no dating. This restates the line above because three options were weighed beside it
        (modern astronomy, Janson's Rahu, a finite table) and all three are rejected; the Rahu entry
        under Beyond v1 is a curiosity, not a deferred plan for FPMT's eclipses. What the front end
        needs to know was measured: FPMT dates them by UTC, 18 of 18 checked, despite its own
        "observe by the date in India" guidance, and it prints eclipses invisible from Asia.
      - **What the package ships as observance content is an *example*, not an authority.** Its
        purpose is to show a consumer how to populate their own config, and
        [guide.md](guide.md) must explain it as such. It follows that the shipped content **must not
        be institution-specific**: an example that is one institution's practice set teaches the
        shape while overclaiming the content. The seven cross-lineage anniversaries above — Gelug,
        Kagyu, Sakya and Nyingma — are the pattern.
      - **Consequence (settled, see the Closed note below): `DEFAULT_OBSERVANCES` still identified itself as FPMT's.** Its
        `id` is `"gelug"` and its `name` is `"Gelug (FPMT)"`, kept deliberately on 2026-09-04 as the
        machine-readable provenance of an FPMT-sourced rule set, and pinned by
        `test/public-api.test.ts` so a later "consistency fix" fails loudly. If the shipped set is a
        non-institutional example, both fields misdescribe it — but `id` is documented as a *stable
        identifier*, so changing it is a migration, and the 2026-09-04 reasoning against
        `id: "default"` still holds. It touched
        [decisions/2026-09-03-no-institution-names-in-exports.md](decisions/2026-09-03-no-institution-names-in-exports.md).
      - **Consequence (settled, see the Closed note below): conventions are institution-specific even when content is not.**
        `doubledDay: "second"`, `skippedDay: "preceding"` and `leapMonth: "leap"` are FPMT's choices,
        and Kopan — also Gelug — prints the opposite `doubledDay` for one 2024 düchen. An example
        config has to set some value for each. Whether it presents them as "one common convention,
        and here is how to change it", or the defaults move elsewhere, is part of the same decision.
      - **What FPMT prints, measured 2026-09-19** over 669 days (January 2025 to October 2026, where
        the engine's Tibetan day matches FPMT's on every day): the Tibetan-day codes (NB, NCE, NF, NG,
        NH, NM, NW, NMP, NCH) and NPF follow the day lists in almanac-sources.md with four exceptions,
        three on one day (2025-04-04) that looks like FPMT's slip; GCH is NCH's complement; Precepts
        is days 8, 15, 30 plus the Buddha days, 213 of 213 in 2022–2025; Naga puja is a fixed
        month-and-day table with three irregular cells; Fire puja matches **(Tibetan day + weekday,
        Sunday 0) mod 4 ∈ {1, 2}**, the Indian *agnivāsa* homa rule, on 97.5% of 1,461 days — which
        needs a Tibetan source before it ships. NWR and the standalone UD look like month-and-day
        tables; PF, PP and VUD show no pattern. Their rules were asked of FPMT's calendar compiler via
        Ven. Chöying. FPMT-specific facts live in [fpmt-calendar.md](fpmt-calendar.md).

      **Amended 2026-09-27: the rule vocabulary is being designed**, in four scopes taken in order —
      (A) what a rule's `when` can say and how each form resolves to days, (A′) a next-occurrence
      query, (B) a rule's metadata, (C) configs and composition, (D) the subpath name. Decided by
      Andreas while scoping (A):

      - **The vocabulary is designed fresh**, keeping today's tested resolution behaviour and the
        existing suites, which must pass with only their `when` literals translated.
      - **A rule is local or bounded-lookback, never unbounded.** A day's observances follow from its
        own calendar facts, or from calendar facts back to an anchor the calendar itself locates
        within a fixed bound — sojong's month-1 full moon, never more than a year back. A count from
        a fixed epoch is refused. This is what makes `observancesOn(date)` and "when is the next
        sojong" answerable from any starting day.
      - **No rule refers to another — provisionally.** Gaye may need it: if it falls on the sojong
        ending the rains retreat, its date comes from the sojong count. Ven. Chöying's answer on
        which sojong gaye replaces decides it. Allowing references later is additive; allowing them
        now and forbidding them later would not be. Tracked under "Awaiting a Tibetan teacher" below.
      - **A rule may list several days or dates**, so Precepts' monthly days or Naga puja's table is
        one rule with one name. Tracked under "Awaiting a Tibetan teacher" below.
      - **A next-occurrence query ships**, on the pattern of `nextFullMoon`. Additive, so it does not
        block 1.0.0.
      - **`decisions/2026-08-12-observance-policy.md` is
        superseded by a new record once (A) to (C) are settled** — [decisions/2026-11-11-observance-model.md](decisions/2026-11-11-observance-model.md), and the old
        record was then deleted — not amended piecemeal: four of its
        five "What this makes true" bullets are overtaken, and its subpath section says nothing in
        the layer is falsifiable, which a counted schedule tiled against Rabten's century is.
      - **Done: an age.** The model had to express "an age" for a consumer's own anniversaries (FPMT
        prints "90th birthday"). It is `ageFromYear` on the `western` form (and on `annual`), reported as
        `Observance.age`, and it is tested externally by FPMT's printed ordinals for the Dalai Lama's and
        Sakya Trichen's birthdays ([fpmt-calendar.md](fpmt-calendar.md)).

      Confirming each surviving rule against FPMT's current guidance is the open item "Confirm each
      example rule against FPMT's current guidance" below.

      **Done 2026-09-05: renamed `GELUG` to `DEFAULT_OBSERVANCES`** (`id` stays `"gelug"` — a data
      field, not an exported identifier, so the naming rule doesn't reach it — file renamed to
      `default-observances.ts`), per the rule decided 2026-09-03: no exported identifier names an
      institution, and `GELUG` overclaimed besides, since Kopan Monastery — also Gelug — prints
      the opposite `doubledDay` for the same date FPMT does. See the rule in
      [CLAUDE.md](../CLAUDE.md)'s Conventions section and its row in
      [coding-standards.md](coding-standards.md). The sweep for any other export or identifier
      named after an institution or organisation, required alongside this rename, is recorded
      below, dated 2026-09-05.

      **The documentation gate, amended and met.** The gate was "add the settled rule list to
      `docs/guide.md` or `docs/architecture.md`", and its purpose was that a reader need not open
      the source file to know what ships. That purpose is met by two documents instead: the README
      names every rule, and it ships to npm, so a consumer sees the list without the repository; and
      [observances.md](observances.md) gives each rule's level and the basis of its level and its English
      name. The guide and the architecture document do not list the rules, and no longer need to. The
      gate also said this blocked the code review; the ruleset has settled, so it no longer does.

      **Still separate:** the composable-config helper and the day-quality-code placement question,
      both recorded in the same nyamlen note, are distinct subsystems needing their own brainstorm
      and spec — not folded into this task. **Superseded 2026-09-19:** the day-quality codes join the
      convention layer (above), so the placement question is answered and the two are one brainstorm.

      **Closed 2026-11-14, on the `observances-1.0` branch**, because the decision this item asked for
      is made and shipped. What ships is `EXAMPLE_OBSERVANCES`: nineteen rules under three levels the
      config declares, `id: "example"`, `englishName: "Example practice calendar"`. The `"gelug"` id and
      `"Gelug (FPMT)"` name are gone, and the doubled-day, skipped-day and leap-month conventions are
      stated in its docblock as FPMT's. FPMT's complete set is a configuration in the test suite, held to
      FPMT's own calendars for 2022-2026 ([fpmt-calendar.md](fpmt-calendar.md)). The rule list is in the
      README, which ships, and the level and name basis of every rule is in
      [observances.md](observances.md). In this entry `DEFAULT_OBSERVANCES` and `default-observances.ts`
      are now `EXAMPLE_OBSERVANCES` and `example-observances.ts`, and the 2026-08-12 policy record was
      superseded by [decisions/2026-11-11-observance-model.md](decisions/2026-11-11-observance-model.md)
      and then deleted; git history holds it. What this decision left to ask, and what it left to
      check, is in the two open items below, which are separate work and not caveats on this one.
- [x] **Sojong, built and validated — moved from Beyond v1 to pre-1.0.0 on 2026-09-19 (Andreas); done
      2026-11-14, on the `observances-1.0` branch.** What this item asked for was a counted-schedule
      rule shape and the data that tests it, and both exist: the `counted` form, used by `sojong` in
      `EXAMPLE_OBSERVANCES`; the generator `scripts/fetch-rabten-sojong.mjs` and its fixture
      `test/fixtures/rabten-sojong.ts`, every sojong Rabten Choeling's calendar prints from 2000 to
      2100; `test/validation/rabten-sojong.test.ts`, which imports the fixture and holds the form to it;
      the window of that agreement in [testing.md](testing.md#rabten-choelings-sojong-schedule); and
      the entry in [validation-sources.md](validation-sources.md) stating that Rabten's lineage is
      unknown, so its agreement with FPMT may be one witness rather than two. The rule is **inferred,
      not sourced**, and the example's docblock, the README and [observances.md](observances.md)
      say so; what is not sourced is the next item. Phase 3 had established that sojong is not a fixed
      day number: against FPMT's calendars for 2022–2025 a 15th-and-30th rule misses 38 occurrences and
      invents 36 ([almanac-sources.md](almanac-sources.md#sojong-a-counted-schedule-once-falsified-by-a-misreading)
      holds the history, including the reading that was falsified and then reversed).
- [ ] **Sojong, what is not sourced — still open.** Four statements are what the repository records,
      and each is checked against
      [almanac-sources.md](almanac-sources.md#sojong-a-counted-schedule-once-falsified-by-a-misreading)
      and [fpmt-calendar.md](fpmt-calendar.md):
      - **Sourced: the count of days between sojongs.** An oral teaching, recorded in unpublished
        personal notes held outside the repository and supplied on 2026-08-28, states that waxing
        sojongs are 15 and that waning ones are 14 at the end of an odd month and 15 at the end of an
        even one, with "14 or 15 days between the Sojongs"; read as a count since the previous
        sojong, it reproduces 95 of the 98 intervals between FPMT's 99 sojongs of 2022–2025; the three it
        does not are 2022-03-02 to 2022-03-18 (16 days), 2022-04-16 to 2022-04-30 (14, in an even
        month) and 2022-12-22 to 2023-01-07 (16).
      - **Inferred, not sourced: the annual re-anchor on the month-1 full moon.** It is the fit that
        reproduces all 2,490 of Rabten Choeling's sojongs for 2000–2100, with none missed and none
        extra; Rabten states no method, so no source states the rule. Against FPMT's 99 sojongs of
        2022–2025 it agrees on 82.
      - **Unanswered: what keeps the count with the moon.** The question put to Ven. Thubten Chöying
        on 2026-09-19 asked where the occasional extra day goes, and the anchor has superseded it. The
        closer question was put to her on 2026-09-27: whether FPMT re-anchors on Chötrul Düchen at all,
        whether it drops a sojong falling on Losar, and whether FPMT's run from 2022-04-30 to
        2022-12-22 is a slip or a rule this package lacks. No document in this repository records an
        answer to either of those; the reply of 2026-09-30 concerned gaye, below.
      - **Untested: FPMT's convention for a skipped or doubled day 15 in month 1**, because none
        occurs in its 2022–2025 window.
- [ ] **Awaiting a Tibetan teacher.** Questions the example's design left open because they are a
      teacher's to answer; none blocks a release, and each says what is known.
      - **Where gaye falls, and whether it replaces a sojong.** As the question stood when the rule
        model was scoped: if gaye falls on a sojong, its date comes from the sojong count, and whether
        a rule may refer to another decides on the answer. Three accounts disagree.
        - **The oral teaching** in [almanac-sources.md](almanac-sources.md) says 24 sojongs occur in a
          normal year and one is replaced by gaye, the end-of-rains-retreat observance.
        - **Ven. Thubten Chöying**, asked on 2026-09-19 (question 1c, recorded as sent in the project's
          correspondence), replied on 2026-09-30: "For the Gaye question, I searched online and found
          that traditionally it is on the full moon of the 6th month, which concurs with how we've done
          it at ILTK recently. I think best to leave Sojong, since most Western centers don't do rains
          retreat, but maybe add Gaye as a possibility for those that want to know." Her reading is that
          gaye does not replace a sojong, and that it could be offered as an optional extra. Her source is
          an online search and her centre's recent practice, so hers is a reply and not an authoritative
          calendar rule.
        - **Monastery pages and a translation, not an almanac, read 2026-11-14:**
          the Mindrolling Monastery site (<https://www.khenchenrinpoche.org/?p=2303>) gives Yarne, the rains
          retreat, "from the 15th day of the 6th lunar month to the 30th day of the 7th lunar month" and
          "one and a half months"; the Amitabha Foundation (<https://amitabhafoundation.us/?p=5984>), in a
          post dated 24 July 2021, has Yarne start on 24 July, "full moon of the sixth month of the lunar
          calendar", held for 45 days, concluding on 6 September, "new moon of the seventh month of lunar
          calendar"; Monlam (<https://monlam.org/activity/monastic-rainy-season-retreat-yarney/>) has it start
          "on the full moon day of the 6th month" and conclude "on the new moon day of the 7th month"; and
          84000's *The Chapter on Lifting Restrictions* (Mūlasarvāstivāda, Toh 1-3, translated by Robert
          Miller; <https://84000.co/translation/toh1-3/UT22084-001-003-introduction>) says the rite is
          "held at the end of the rains retreat as an adjunct to the Rite of Restoration (poṣadha)", and in
          a note dates the Indian rite to the fifteenth of Āśvina or of Kārttika; it does not say that it
          replaces the poṣadha or falls on the same day.
        These do not agree. On the monastery pages the full moon of the 6th month is where Yarne
        **starts**, and the end of the retreat is at the end of month 7, which is where the oral teaching
        and the Vinaya place gaye; Ven. Chöying's full moon of the 6th month is the start. The Vinaya's
        "adjunct" differs from the teaching's "replaced", and from her "does not replace".
        **The question stays open for a teacher or scholar: does gaye fall at the start or the end of
        Yarne, and does it replace a sojong or accompany one?**
      - **Whether a rule may refer to another.** Provisionally none may; allowing references later is
        additive, and forbidding them after allowing them would not be. It decides on the gaye answer, which is not yet settled.
      - **The several-days form for Precepts and Naga puja.** One rule listing several days or dates,
        so Precepts' monthly days or Naga puja's table is one rule with one name. Their rules are not
        known, so both are excluded from the example ([observances.md](observances.md)). What FPMT
        prints is measured under the observance-layer item above: Precepts is days 8, 15, 30 plus the
        Buddha days, 213 of 213 in 2022–2025, and Naga puja is a fixed month-and-day table with three
        irregular cells.
      - **How the fire-puja count treats a doubled or skipped day.** Lama Zopa Rinpoche's advice tells
        the reader to check, and does not explain ([observances.md](observances.md)); a question for a
        Tibetan teacher or scholar. The example's `lunarDayPlusWeekdayMod4` formula agrees with FPMT's
        labels on most days and misses a few dozen, listed in
        `test/validation/fpmt-observances.test.ts`.
      - **Established Tibetan headings for the three levels**, if centres use any
        ([observances.md](observances.md)).
- [x] **Confirm each example rule against FPMT's current guidance — read 2026-11-14.** The example is
      held to FPMT's calendars through 2026, with every residual listed by date in
      `test/validation/fpmt-observances.test.ts`; this item asked for a read of FPMT's current prose
      guidance as well, and that read is done and recorded rule by rule in
      [fpmt-calendar.md](fpmt-calendar.md#fpmts-prose-guidance-against-the-nineteen-rules). Result:
      11 rules agree (`saga-dawa-month` on its first day only, `sojong` as far as "middle and end"),
      1 differs in naming only (`dakini-day`, kept by decision), and **7 have no prose to confirm
      them: `milarepa`, `guru-rinpoche`, `gampopa`, `karmapa-16`, `sakya-pandita`, `dudjom-rinpoche`
      and `fire-puja`. Those seven are not confirmed by this read**; the six anniversaries are held
      by the calendars alone, and the fire puja by its listed residuals. The limits are in that
      section: prose only, pages read through a summarising fetch tool, one PDF blocked, and no
      per-teacher pages found, which is not proof that none exists. The gate was a read of the prose,
      and it was made; that nothing was found for seven rules is a result, tracked for the fire puja
      under "Awaiting a Tibetan teacher" above.
- [x] **Record FPMT's second line of codes and its moon icons in the fixture.** Done 2026-09-19.
      The fixture carries `codes` (verbatim, with FPMT's two misprints `NPG` and `ED-EW` kept as
      printed) and `moon`, an icon rather than a moon. The generator refuses any code its page's own
      key does not define, and each new check was proved by mutation against recorded pages. The
      moons are tested in `test/validation/fpmt-observances.test.ts`: over 2022–2025, 98 of the
      engine's 99 moons fall on a day FPMT marks, the exception being the new moon of February 2025
      at a skipped 30; FPMT also marks the first half of two of the four doubled dates carrying a
      moon. See [testing.md](testing.md#fpmts-moon-icons). The earlier "43 of 46, all at a skipped
      or doubled day 30" was an ad-hoc measurement over 2025–26 and is superseded: one of its three
      was at a doubled 15, and two of the three were not disagreements at all. The advice-code day
      rules are **not** tested here; they wait for the FPMT config (decided 2026-09-19).

      **Sweep run 2026-09-05: clean.** Every export on both barrels
      (`src/index.ts`, `src/observances/index.ts`) was read against the rule in
      [2026-09-03-no-institution-names-in-exports.md](decisions/2026-09-03-no-institution-names-in-exports.md).
      `PHUGPA`, `PHUGPA_HENNING`, `BHUTAN` and `BHUTAN_HENNING` were checked deliberately and are not
      violations — they name calendrical systems Janson describes, not institutions' conventions.
      `DEFAULT_OBSERVANCES` was already renamed. No other offender found.
- [x] **Full code review.** Subject: all of `src/`, plus `scripts/` and the fixture generators,
      which are unreviewed and produce the primary correctness gate. **Command:**
      `/code-review max src/` for a path-scoped pass — note that plain `/code-review` and
      `/code-review ultra` are **diff-shaped**: ultra bundles the current branch against `main`, so
      on a clean `main` there is nothing to review. Either give it a path, or run it from the
      release branch where the diff is real. `--fix` applies findings to the working tree; take the
      findings first and apply deliberately, since several rules here are intentional and will read
      as defects to a reviewer that has not read CLAUDE.md

      **Reviewed 2026-11-15 at `34b8ab4`; fixes outstanding.** Run as twelve sharded Opus and Sonnet
      reviews rather than `/code-review`, then scored by independent agents: 57 findings, 47 kept.
      The fixes go on one branch, reviewed by the one free ultrareview before merging; the false
      docblocks among them go to the docblock audit. The item closes when the fixes merge.

      **Closed 2026-11-16:** every kept finding is fixed or parked with a ruling, merged to `main`
      from `pre-1.0-review-fixes` as `51c7c03`. Each task was reviewed by an independent Opus
      reviewer, the whole branch by a final hostile-input pass, then by the cloud ultrareview, whose
      six findings were fixed before the merge. Parked findings are in the item "Small findings
      parked by the pre-1.0.0 code review".
- [ ] **Security review.** **Run 2026-11-15 at `34b8ab4`:** no high findings. Two medium — the
      `monthsFor` cache grows without bound on the shipped configs, and the CI-token item was stale
      (rewritten under Publishing) — and one low, action pinning by tag. The cache cap goes on the
      code-review fixes branch.
      **Status 2026-11-16:** both merged to `main` (`51c7c03`) — the cache is an LRU of 64 years per
      config, and both CI actions are pinned to commit SHAs.
      Still open: `/security-review` on the release branch's diff. State the honest scope first, or the pass will invent findings: zero
      runtime dependencies, no I/O, no network, no filesystem access, no user-supplied strings
      reaching anything but integer arithmetic. The real attack surface is **supply chain and
      release**, most of it already itemised under Publishing — provenance, the lockfile, token
      expiry, the `repository.url` match. **Command:** `/security-review` is **diff-shaped** (it
      reviews pending changes on the current branch), so for a standing audit use
      `/sc:sc-analyze . --focus security --depth deep`, and run `/security-review` on the release
      branch's diff as the second, narrower pass
- [ ] **Full adversarial review.** Not a code review with a harsher tone: the subject is the
      **claims**, not the code. Every load-bearing assertion this repository makes about itself —
      the validation windows and what they actually cover, "exported means validated", the
      zero-dependency claim through the lockfile and the published `.d.ts`, the clean-room evidence,
      every benchmark figure against `bench/RESULTS.md`, every sourced name against its source — read
      by someone trying to prove it false. **Command:** there is no single flag. Dispatch parallel
      adversarial agents (`superpowers:dispatching-parallel-agents`) with one claim-set each, plus
      `/sc:sc-spec-panel` over the decision records; `/code-review ultra` from the release branch is
      the multi-agent code-shaped half of it. The check that matters: a claim nobody can restate
      from primary evidence is a claim to soften before 1.0.0, not to defend

**Publishing**

- [ ] Publish from **GitHub Actions with npm provenance**, not locally — provenance ties each
      released version to the commit that built it, which reinforces the clean-room record
- [x] Grant the `nyamlen:developers` team read-write on the package — done 2026-08-11, verified
      with `npm access list packages nyamlen:developers`. Note the listed **owner** remains
      `boffies`: unscoped packages carry no org affiliation, and npm exposes no self-service
      ownership transfer to an organisation. Team access is the achievable outcome and is
      sufficient — it is what lets CI publish under org-controlled permissions. `npm access
      list collaborators` will not show this; it only lists user-level collaborators
- [ ] **Configure npm trusted publishing** for this package on npmjs.com, naming this repository
      and `release.yml`. It publishes over OIDC with **no stored token**, and generates provenance
      automatically — but only for a **public** repository and package, so the repository goes
      public before the first publish (see Repository below). It needs npm ≥ 11.5.1 and Node ≥ 22.14.
      Decided 2026-11-15, replacing a stored granular token: the security review found that item
      contradicted itself (a token scoped to one package cannot serve sibling packages, and an
      org-level secret exposes a write credential to every repository), and npm now caps write
      tokens at 90 days and has revoked classic tokens. Verified against
      [npm's trusted-publishers page](https://docs.npmjs.com/trusted-publishers) and GitHub's
      changelogs of [2025-11-05](https://github.blog/changelog/2025-11-05-npm-security-update-classic-token-creation-disabled-and-granular-token-changes/)
      and [2025-12-09](https://github.blog/changelog/2025-12-09-npm-classic-tokens-revoked-session-based-auth-and-cli-token-management-now-available/)
- [ ] **After the first trusted publish**, set the package's publishing access to "Require
      two-factor authentication and disallow tokens", which npm's page strongly recommends; trusted
      publishing keeps working, since it does not use a token
- [ ] **Re-run the polyfill probe on real devices against the release tarball.** The real Safari
      runs — macOS 17.6 and iOS — were against `5c954b3`, before the Temporal boundary was rewritten;
      everything re-run since was in Node, Chrome and Playwright's WebKit, which has a native
      `Temporal` that shipping Safari lacks. Needs Andreas and `nyamlen`'s `serve-lan.mjs`. Include
      **macOS Safari 26**, never run, and read the iOS version from the device's **Settings**, not
      from the user agent, which Safari 26 freezes (it reported iOS 18.7). The gate is one hash
      across every dump, equal to the Node and Chrome runs' for the same tarball
- [ ] **After 1.0.0 ships**, `npm deprecate tibetan-calendar-temporal@0.0.1 "placeholder; use
      1.0.0"`. One command, and it puts a warning in front of anyone who pinned the placeholder.
      Pointless before there is a version to point them at, which is why it is sequenced here
      rather than with the other publishing setup

**Release workflow (Phase 4)**

- [x] **Packaging is verified in CI.** `check:publish` runs `publint` and `attw --pack . --profile
      esm-only`; `test:pack` packs the tarball, installs it into a scratch directory outside the
      repository, and imports all three subpaths as a consumer would. The gap they close is structural
      rather than incidental: every other test imports from `src/`, so nothing else in the suite
      can see a broken `exports` map, a file missing from `files`, or a `dist/` layout that does
      not match what `exports` points at. Those fail only for a consumer, after publishing.
      `publint` and `attw` check the manifest; only `test:pack` proves the built JavaScript runs.
      Writing it immediately found that `./package.json` is not in the `exports` map — correct, as
      it happens, but nothing had established that either way
- [x] **Nothing builds before packing.** **Done 2026-09-24 in `1492210`**: `"prepack": "npm run build"`,
      and `test:pack` now deletes `dist/` and packs without building, so it proves the script on
      every CI run. Proved by mutation — removing the line fails `test:pack` with a message naming
      `prepack`. The original entry follows. There is no `prepack`, `prepare` or `prepublishOnly`
      script, so `npm pack` and `npm publish` both package whatever happens to be sitting in
      `dist/`. CI is covered by accident rather than by design — `check:publish` and `test:pack`
      each run `npm run build` first — but a bare `npm publish` would ship a stale build, silently,
      at the one moment that is expensive to get wrong. Add `"prepack": "npm run build"` rather than
      only building inside `release.yml`: the script protects a local publish too, and the local
      publish is the case with no other guard. Note it also makes `npm pack` slower, which is
      correct — a fast pack of the wrong bytes is the failure being prevented
- [ ] `.github/workflows/release.yml` publishing on tag through trusted publishing, with
      `permissions: id-token: write` and no token; set up `actions/setup-node` as the workflow
      example on npm's trusted-publishers page does. Three safeguards from the security review:
      **pin every action by commit SHA**, with the tag in a trailing comment (CI's own two actions
      are pinned by tag today); **no `cache: npm`** in the job that publishes; and a **protected
      environment or protected tags**, because with trusted publishing anyone who can push a release
      tag can publish
- [x] Add `"provenance": true` to `publishConfig` rather than passing `--provenance` at the
      call site. Done 2026-11-14. It also makes a local `npm publish` refuse, since provenance
      needs a supported CI, which enforces publishing from CI
- [ ] Confirm `repository.url` still matches the building repo. Provenance attestation fails if
      they disagree — currently correct, but it would have broken had the repo not been
      transferred to the org before v1
- [ ] **TypeDoc will not run under TypeScript 7.** TS 7's npm package does not expose the
      classic compiler API — its main export is a version object, the real API sits behind
      `./unstable/sync`. Every tool built on that API (TypeDoc, API Extractor, ts-morph) is
      incompatible until individually ported. `typedoc@0.28.20` peer-caps at `5.0.x–6.0.x`;
      only unreleased `1.0.0-dev.*` builds loosen it. Check for a stable TypeDoc with TS 7
      support first. If there is none, the fallback is a **docs-only `typescript@5.9` devDep
      plus `temporal-spec`** for the TypeDoc pass, leaving build and tests on TS 7 — the two
      are independent. Do **not** pin `typedoc@1.0.0-dev.*`; it is a prerelease on no dist-tag

**npm auth note.** This account uses a **passkey**, not TOTP, so there is no 6-digit code and
`--otp` is not usable. npm falls back to a browser flow: it prints an auth URL and waits at
`Press ENTER to open in the browser…`. The command does nothing until you press ENTER,
authenticate, and let it return — it is easy to assume it failed and move on, leaving the
operation unapplied. CI is unaffected because trusted publishing uses no token. A granular write
token would **not** bypass 2FA unless created with npm's "Bypass 2FA" option, which is unchecked by
default. This sentence read "tokens bypass 2FA entirely" until 2026-11-15.

**Repository**

- [ ] Make the repository **public** — **before the first 1.0.0 publish**, since npm generates
      provenance automatically only for a public repository and package
- [ ] **Resolve the citation trail into `nyamlen` before going public.** Raised 2026-09-20. This
      roadmap cited `nyamlen/spikes/calendar-smoke/` and `nyamlen/spikes/calendar-nav/` **by path**,
      `decisions/2026-08-12-public-surface.md` cites two of that repository's tarballs, and the
      verdict ledger that closes the client gate lives at `nyamlen/spikes/VERDICTS.md`. **Three of
      those citations — the two client sections and the ledger — were restated on 2026-09-22** and no
      longer name a path. **Two remain, and they are blocked rather than deferred**: the briefs at
      `nyamlen/spikes/polyfill-probe/` and `nyamlen/spikes/example-site/` are **working pointers to
      spikes that have not run**, not evidence, and they become evidence citations the moment those
      spikes produce their lists. Restating them before then would be restating them twice. **`nyamlen`
      is private indefinitely** — decided 2026-09-20 — so at 1.0.0 this public document would cite
      evidence nobody can open, for the one claim whose whole point is that it is checkable.

      **Decided 2026-09-22 (Andreas): option 3 — restate the claims here without the paths.** The
      other three were: publish the spikes and the ledger separately; open `nyamlen` after an audit
      of what else is in it; and a fourth proposed and declined the same day, moving the friction
      lists and the ledger into this repository. Both of the publishing options stay **available**,
      which is the point of taking this one: restating is reversible and publishing is not, so
      option 1 remains open if the pitch ever needs the consumer's own prose.

      **What makes it cheap, stated accurately.** The gate's substance is already in *this*
      repository's public history: `90a38ee`, `864f88e`, `6ae4b7e`, `6e5f30d`, `6c5be94`, `aef049f`
      and `fcfb4cd` each describe in their bodies the findings they answer. A reader can open every
      one. So the claim becomes checkable without the private repository, and the friction lists are
      named as **provenance** rather than offered as citations — a path that promises nothing is
      honest; a path that promises evidence nobody can open is this item's defect.

      **That was true on the day this item was raised, and the first draft of this entry claimed
      otherwise** — that the commits had only now made the record public. They are from 26–27
      August, three weeks earlier. What changed on 2026-09-22 is that they were **mapped** to the
      findings, nobody having cross-checked the log before. The option was always this cheap and
      nobody knew, which is the same error the verdict pass had just finished documenting: an
      unrecorded fact read as an absent one. Corrected here rather than left standing, because a
      decision resting on a false "this only became possible" invites re-litigation when someone
      checks the dates.

      **Scope: seven citations, all in this file**, two of them this item, which goes when the work
      lands. No shipped document names a private path — `package.json#files` ships `README.md`,
      `docs/guide.md`, `docs/how-it-is-calculated.md` and `docs/why-trust-these-dates.md`, and none
      of the four cites one. Measured 2026-09-22.

      **Do it in the pre-1.0.0 pass, not before**: the navigator's half of the fourth friction list will add citations, and
      restating twice is waste. Each row verdicted on 2026-09-22 also cites an engine commit from
      inside the private repository, which is why the two publishing options grow more expensive
      with time while this one does not The tarballs are a
      separate matter — they are deliberately untracked, so those two citations name commits that
      resolve in **this** repository and are reproducible with `npm pack`
- [x] **Four minor findings deferred from the 2026-09-23 boundary review**, listed so they are not
      re-derived. An independent reviewer raised them against the branch that made the date boundary
      test kind rather than identity; each was graded Minor **by effect on a consumer**, and none is
      a wrong answer. Recorded here because the review's ledger was scratch and is gone, and an
      unrecorded finding is one the next pass finds again from scratch.
      1. ~~**Rule 15 is evadable, and the docs overstate it.**~~ **Done 2026-09-23.** Both evasions
         were reproduced against the checker before anything was written, and the reach is now
         stated exactly in all five places that describe the rule — `src/temporal-kind.ts` (which
         ships in `dist/`), `docs/coding-standards.md`, `CLAUDE.md`, the decision record and this
         list. **And the pattern WAS widened**, after a second pass measured the evasions against
         the checker rather than reasoning about them: the first attempt declined on the ground that
         "resolving aliases is real work for two shapes nobody writes by accident", which was wrong
         twice — matching the constructor names instead of the namespace costs one character class
         and catches all three, and one of them,
         `const { PlainDate } = Temporal; v instanceof PlainDate`, is idiomatic JavaScript and the
         likeliest accident of the lot. Zero false positives across `src/`; `X10` pins it.
      **Items 2–4 done 2026-09-24**, each with a test that fails without its fix. An adversarial
      review of the plan found item 2's intended fix wrong as well and a fifth defect beside item 3;
      both are recorded under their items.
      2. ~~**`asWesternDay` appends its bare-`{ year, month, day }` paragraph unconditionally.**~~
         **Done in `da1b4af`.** Copying `asPlainDate`'s condition, as proposed below, would not
         have done: it tested `typeof "object"`, so a `Date` and an array got the paragraph there too.
         Both guards now share `isPlainObject` in `src/errors.ts`. So
         `nextFullMoon(null)` is told about an object it did not pass. `asPlainDate` makes the same
         sentence conditional on the argument being an object; the merge of `phaseStart` and `isoOf`
         inherited the unconditional form from `phaseStart` and was the moment to fix it.
      3. ~~**`errors.ts`'s `describe` prints a whole function body, and renders `10n` as `"10"`.**~~
         **Done in `39e7795`.** Beside it the review found that the three options-guard messages
         used `JSON.stringify`, which throws on a bigint, so `getObservances(a, b, 10n)` escaped
         uncoded; and that `month-names.ts` held a fifth copy of the options guard, missing the
         array refusal. Both fixed in `7369ab7`. Its
         docblock promises a value "rendered short enough for a message, and unambiguously — `"3"` is
         not `3`", and a `bigint` is exactly the case that promise names. Pre-existing in all three
         bodies that merged into it, but it is now the single shared renderer, so it is one place.
      4. ~~**The unreadable-brand message names a cause it did not establish.**~~ **Done in
         `bf34781`.** `temporalTypeNameOf`
         says "a revoked Proxy, most likely" for any failure to read `Symbol.toStringTag`, including
         a getter that throws. Coded, so harmless, but it is the project's own rule about asserting a
         mechanism that was not measured.
- [x] **Pass a `TraditionConfig` one way, under one name.** **Done 2026-09-24**, in `807ec71`–`3876e3e`;
      the rule is [decisions/2026-09-24-how-a-tradition-is-passed.md](decisions/2026-09-24-how-a-tradition-is-passed.md),
      and a clean consumer on TypeScript 7.0.2 compiles one example of each shape and rejects both
      old ones. Decided 2026-09-24 (Andreas): the
      tradition was passed four ways — positional `config?` on 22 root functions, `{ overflow?,
      config? }` on `addMonthsToDate`, `{ config?, tradition? }` on `./observances`, and
      `{ tradition? }` on `monthNamesFor` and the five `./astrology` functions — so the key `config`
      named a `TraditionConfig` in one bag and an `ObservanceConfig` in another, and every bag
      accepted unknown keys. From plain JavaScript that gave **silent wrong answers**:
      `addMonthsToDate(f, 0, { tradition: BHUTAN })` and `attributesFor(d, BHUTAN)` both returned
      Phugpa's. The rule adopted: a `TraditionConfig` is always named `tradition`; a function whose
      only choice is the tradition takes it last and positionally; two or more choices go in one bag
      extending `TraditionOptions`; bags refuse unknown keys. A one-way door at 1.0.0, breaking for
      seven functions now and free while nothing is published
- [x] **Sites that put a value into a message without `describe`, and inputs that escape uncoded.**
      **Done 2026-09-24.** `describe` and `isPlainObject` never throw; the options guard refuses an
      unreadable bag with its own code and hands its call sites a snapshot, so a `get` trap or getter
      is read inside it; `asWesternDay` reads `isoDate` under `try`; fourteen sites render through
      `describe`; and `elementalYoga`, which had no guard, refuses a non-element as
      `TCT_INVALID_ARGUMENT` instead of reporting it as `TCT_INTERNAL`. `test/hostile-inputs.test.ts`
      holds every runtime export of the three barrels against twelve values — seven a template cannot
      render and five single-trap Proxies — in argument, field, config and bag positions. The
      `isPlainObject`, snapshot and `isoDate` fixes came from an independent review, which found that
      the table's one revoked Proxy threw at a trap already caught and so hid the rest. Two findings
      from the work are the next two items. **What follows is the item as found, before the fix.**
      Found 2026-09-24 while closing the item above, and left out of it on purpose.
      `isoFromJulianDay(10n)` and `isoFromJulianDay("10")` both said "received 10", and
      `assertSafeYear` interpolates the same way — the ambiguity `describe`'s docblock exists to
      prevent. **This entry first said "Coded, so nothing escapes", which was false the same day**: a
      `Symbol` interpolated into a template literal throws, so `isoFromJulianDay`, `weekdayNameFor`,
      `losarFor`, `monthsFor`, `addDays` and `asTibetanWeekday` given one throw an **uncoded**
      `TypeError`, against the README's every-failure-carries-a-code claim. And `describe` itself
      throws on a revoked `Proxy`, and returns a `Symbol` for an object whose `constructor.name` is
      one. The population is wider than `received ${`: function-name subjects interpolate the raw
      year before the guard runs (`losarFor(10n)` says "losarFor(10): …"). **One more since
      2026-09-24:** the options guard now walks a bag's prototype chain with `Object.keys` and
      `Object.getPrototypeOf`, so a Proxy bag whose `ownKeys` or `getPrototypeOf` trap throws escapes
      uncoded — `addMonthsToDate(d, 1, new Proxy({}, { ownKeys() { throw … } }))` — where before it
      passed the guard and answered.
- [x] **A throw from the caller's own code while the engine reads a config or a fields object
      escapes uncoded, and it no longer does.** **Decided 2026-11-16 by Andreas (option 3): it
      is coded.** Question put to him 2026-11-15, after the post-validation re-read of a config was
      removed: should the validator code errors thrown by the caller's own getters or Proxies at first
      read, and should the fields guards? It overtakes the 2026-09-24 decision that such an error may
      propagate unchanged. A throw while a `TraditionConfig` or an `ObservanceConfig` is read is refused
      with the config's code and the caller's error as `cause`; a throw while a Tibetan date's or
      month's fields are read is refused with `TCT_INVALID_ARGUMENT`, each field read exactly once into
      a frozen snapshot that every later step uses. The same work closed a defect it found: a getter
      answering 8 and then 31 passed validation as 8 and was computed on as 31, a confident wrong
      date from `resolveDate`, `tibetanToIso` and `addDays`. The README's sentence beside its code table
      no longer carries an exception, since every read of a caller's object is guarded, and
      [decisions/2026-08-12-error-codes-not-classes.md](decisions/2026-08-12-error-codes-not-classes.md)
      records it. `test/hostile-inputs.test.ts` no longer leaves a Proxy out of its config rows.
- [x] **The Tibetan date-field guard is written six times.** Answering the review question the `describe`
      item above carried, 2026-09-24: `assertMonthFields` and `assertDateFields` in `navigation.ts`, the
      inline checks in `resolveMonth`, `daysInMonth` and `datesFor` in `months.ts`, and those in
      `tibetanToIso` run the same predicates — safe-integer year, month 1–12, day 1–30 — and differ
      only in how the subject is built and in one extra sentence on `tibetanToIso`'s day message. Rule
      14 cannot see it, since the bodies differ. Merging them into one home beside
      `rejectMissingFields` changes message text across about nine exports, which is why it is not
      folded into the item above.
      **Widened and measured on 2026-09-24, on a fresh build, before any code was written.**
      - **The leap-twin preamble goes with it.** `yearFromRoyalEra` → `assertClosedFormYear` →
        `TCT_NO_SUCH_LEAP_MONTH` → `trueMonthCount` is written five times, in `lunationOf`,
        `resolveMonth`, `datesFor`, `daysInMonth` and `tibetanToIso`, in three wordings.
      - **Seven exports report errors under another function's name.** `monthNamesFor`,
        `monthAttributesFor` and `lunarDayAttributesFor` delegate to `daysInMonth`, so their
        errors say `daysInMonth(`. `resolveDate`, `addDays` and `daysBetween` report the leap twin
        and the exact range as `tibetanToIso(`. `tibetanDateExists` lets `TCT_OUTSIDE_EXACT_RANGE`
        through, also as `tibetanToIso(`.
      - **A lower-bound defect.** `daysInMonth` bounds only the month's last day, and at the
        negative end the first day is the more extreme. Under `PHUGPA_HENNING`, royal year −20652
        month 3, `daysInMonth` answers 30, and so do the three delegators, where `resolveMonth` and
        `datesFor` throw `TCT_OUTSIDE_EXACT_RANGE`.
      - **Three refusal orders**, for a bad tradition plus a bad date. The one in `tibetanToIso` is
        load-bearing: a range check ahead of the tradition check would let
        `tibetanDateExists(badFields, {})` answer `false` for a broken config.
      - **The README's Errors table lists only `tibetanToIso` as throwing `TCT_NO_SUCH_LEAP_MONTH`.**
        About sixteen exports do. Rule 16 checks only the code column, so nothing catches this.

      **Done 2026-09-24**, in `5b64142`, `eb2f73a`, `12e2e21`, `beb24e1` and `ae39e72`, the leap-twin
      cluster folded in:
      - `assertTibetanShape` and `assertTibetanRanges` in `types.ts` are the one field guard; the
        range half returns a subject echoing the call — `daysBetween(to: { … })` — and the shape
        label for the same argument is `daysBetween(to)`. `assertSafeYear` was widened rather than
        copied, so `format.ts`'s "Pass a value returned by …" hint reaches the year message too.
      - `monthCountFor` and `julianDayOfFields` in `computation/conversion.ts` are the leap-twin
        preamble, with one wording, and `tibetanToIso`'s body after its guards. `lunationOf` is gone.
      - `boundedMonth` in `months.ts` guards the month tier, and **bounds both ends of the month**,
        which fixed the lower-bound defect: all six month-tier exports now refuse `PHUGPA_HENNING`
        −20652 month 3.
      - **All seven functions that named another now name themselves**, and `daysBetween` and
        `monthsBetween` name the argument. `test/error-subjects.test.ts` pins every row.
      - **One order flip**: `resolveMonth` and `datesFor` moved from order C to order B, so a call
        with a broken tradition and month 13 reports the tradition. And an out-of-range day passed to
        `lunarDayAttributesFor` — 0, 31, `NaN`, a fraction — is `TCT_FIELD_OUT_OF_RANGE` even in a
        leap month with no twin or past the exact range, where the month's error used to win. `beb24e1`'s
        message says "day 31"; an independent review measured the whole class.
      - The README row now names the month and date tiers.
- [x] **Should the attribute functions be bounded by the exact range at all, and should the three
      refusal orders be unified?** Left open by the field-guard merge on 2026-09-24.
      `monthNamesFor`, `monthAttributesFor` and `lunarDayAttributesFor` never evaluate `true_date` for
      their answer — the names and attributes are closed forms on the month — yet `boundedMonth` refuses
      them past the exact range, because they inherited `daysInMonth`'s guard and the merge kept the
      behaviour. And a call with a bad tradition and a bad date still reports one of two errors
      depending on the export: order A (tradition first) for the seven navigators and
      `monthAttributesFor` and `lunarDayAttributesFor`, order B (shape, tradition, range) for the
      rest. **Order B is load-bearing in `tibetanToIso` and `tibetanDateExists`** — a range check
      ahead of the tradition would let `tibetanDateExists(badFields, {})` answer `false` for a broken
      config — so any unification converges on B. `test/error-subjects.test.ts` pins one doubly-bad
      call per order today.

      **Decided 2026-11-15 by Andreas, and implemented the same day.**
      **The bound stays.** Widening it after 1.0.0 is non-breaking, and narrowing it would not be, so
      the narrow form ships, and every function taking a month refuses the same months.
      **The orders unify on B**, which checks the shape, then the tradition, then the range — the
      argument before the tradition, in parameter order. That is what the shared guards already do,
      so the change deletes each export's leading tradition check.
      The load-bearing claim above was re-read in reaching this. What `tibetanDateExists` needs is the
      tradition checked **before the range**, and order A does that too; the order that was dangerous
      was the earlier "range before tradition" order, retired on 2026-09-24. B was chosen because it is
      the cheaper of two safe orders, not because A was unsafe.
      The change reaches further than the item above lists: fourteen exports checked the tradition first
      — the seven navigators, the moon pair through their shared helper, and five `./astrology`
      exports (`monthAttributesFor`, `lunarDayAttributesFor`, `elementalYogaFor`, `lunarMansionFor`,
      `attributesFor`). In the navigators the check **moved** rather than went: their range check runs
      before anything else validates the tradition, so deleting it would have produced the retired
      order. `test/error-subjects.test.ts` pins every one of them, and failed on all 16 rows before the
      change for the reason it names.
      `monthFromLunation`, `weekdayNameFor` and the closed-form year functions take a number and no
      shape, so the shape-first order says nothing about them, and they are outside this decision:
      `monthFromLunation` checks the tradition before its number, the other two the number first.
      `isoToTibetan` was missed by that change, which counted fourteen exports and not fifteen: it
      checked the tradition before its Western date until a review found it, and now has its row in
      the same table.
- [x] **Decide whether `check:conventions` rule 4 should distinguish an exported `{@link}` target
      from a module-local one.** **Decided 2026-09-23: reject, scoped to docblocks that ship** — those
      of a barrel-exported declaration or of a member of a barrel-exported interface or class, where a
      link must target a barrel export. Internal docblocks keep linking internal helpers. It found
      eleven such links on its first run, all fixed in `23347bb`; row X12 proves it. Found 2026-09-22 by the verdict pass, not by the rule. It requires a
      target to be "declared anywhere in `src/`", so `{@link MAX_SPAN_YEARS}` — a module-local
      `const` — passed while shipping in `dist/observances/index.d.ts`, where a consumer's hover
      renders it as plain text. That is the exact failure the rule's own message describes: "a stale
      link ships in the .d.ts and renders as plain text on hover". The two docblocks were fixed in
      `fcfb4cd`, so **nothing is broken today** and this is about the guard, not the symptom.
      Widening it means deciding what a link to an internal symbol *should* do — reject, or resolve
      only within the module — and writing the failing case before the check, since a guard that has
      never failed proves nothing. A row in `npm run test:conventions` comes with it

- [ ] Set **repository topics** to match `package.json#keywords` — `tibetan`, `calendar`,
      `temporal`, `phugpa`, `buddhist`, `lunisolar`, `losar`, `bhutanese`, `dzongkha`, `mongolian`,
      `tsagaan-sar`, `tsurphu`, `kalacakra`, `rabjung`. Topics drive GitHub search and the topic
      pages, a discovery channel entirely separate from npm, and cost one settings change. The
      keyword list carries the Bhutanese and Mongolian scope that the package *name* deliberately
      does not — see
      [2026-08-16-package-name-and-tradition-scope.md](decisions/2026-08-16-package-name-and-tradition-scope.md)
- [ ] Enable **branch protection** on `main`: require CI to pass, and block force-pushes.
      Force-push protection matters here specifically — the commit history is the clean-room
      evidence of independent derivation, and a rewrite would undermine it
- [ ] Enable **tag protection** for release tags
- [ ] Convert the remaining items here into GitHub issues under a v1.0.0 milestone. A checklist
      in a file is fine for a solo private repo; once there are contributors, issues are better

> Branch, tag and draft-PR features are unavailable on GitHub Free for **private** org repos.
> All of them return at no cost the moment the repository goes public, so the two items above
> are sequenced together deliberately.

## Beyond v1

- **Planetary longitudes (Janson's Appendix D, "Planets") — deferred, and deliberately not part of
  `./astrology`.** Appendix D computes **geocentric longitudes for the five visible planets (Mars,
  Mercury, Jupiter, Venus, Saturn) plus Rahu**, the lunar ascending node — via mean heliocentric
  motion, a slow-longitude correction using an iterative step index, then conversion to geocentric
  position. This is continuous astronomical computation, structurally close to what this project
  already does for the sun and moon (mean motion plus a correction table), extended to five more
  bodies, each needing its own constants and its own accuracy validation against a modern
  ephemeris — a project comparable in size to the existing sun/moon machinery, not an afternoon's
  addition to `./astrology`.

  It exists in Janson because Tibetan astrology uses planetary position for **muhurta-style
  work** — timing an activity (a wedding, a journey, a medical procedure, a ritual) by which
  planet occupies which position or lunar mansion at that moment, the same family of practice as
  the Vedic *muhūrta* मुहूर्त (auspicious-timing) tradition Tibetan astrology inherited alongside
  the calendar itself. That is a narrower, more specialised consumer need than "what element is
  today" — `./astrology`'s attribute layer answers the latter for every day unconditionally;
  planetary longitude only matters to a consumer actually doing this kind of positional timing.
  Decided 2026-09-03 to keep it out of `./astrology` even if it is eventually built: different
  computational character (iterative vs. closed-form), different validation burden, different and
  narrower audience. If it ever ships, it gets its own subpath, its own name, and its own
  brainstorm — not a module bolted onto this one.
  **No name was decided on 2026-09-04.** `./astronomy` was proposed on 2026-09-19, with eclipse
  prediction (below) living there too; settle it in that brainstorm.

- **Eclipse prediction from Rahu — beside Appendix D (proposed `./astronomy`), beyond v1, and measured
  before deferring.**
  Tibetan almanacs predict eclipses from Rahu, the lunar nodes.
  Janson gives Rahu's position (appendix D, "Rahu": a period of exactly 230 lunar months, epoch value
  `rd₀ = 187` for E1927) and cites Henning, *Kālacakra and the Tibetan Calendar*, chapter III, for
  the prediction method, which Janson does not reproduce.
  Measured on 2026-09-19 against the 20 eclipses FPMT printed from January 2022 to October 2026, all
  real astronomical ones, over the 120 new and full moons of that window:

  - **Rahu as Janson gives it does not separate eclipses from other syzygies.** At the 20 eclipses the
    engine's true Sun lies from 0.1° to 24.3° from the nearer node; at the other 100 new and full
    moons, from 6.5°. The two ranges overlap, so no limit works.
    A constant shift of about 12° would separate them cleanly — which is Henning's point, not a
    discovery: he reports the Phugpa Sun-to-node distance drifting, 9.77° too small by 2000.
  - **The traditional correction and limits, as Henning reports Chenrab Norbu's 1927 method, predict
    10 of the 20 and invent none.** Subtract 0;31,41,4,10 mansions (about 7.04°, the value Dharmaśrī
    gave, equal to nine fortnights of Rahu's motion) from the node. A lunar eclipse follows if the
    Moon is within 50 nāḍī of a node. A solar eclipse is "certain" if the Sun is within 50 nāḍī after
    the Head or 40 before the Tail; within 5 before the Head it "should not occur", and within 8 after
    the Tail it is "possible". A nāḍī is a sixtieth of a mansion, 1,620 to the circle.
    The misses are eight solar eclipses and the two slightest lunar ones (25 March and 18 September
    2024). The method classes the total solar eclipse of 8 April 2024 as one that "should not occur".
  - **The shortfall is expected.** Henning: the Tibetan methods lack the theory solar eclipses need,
    and the correction has not been updated since Dharmaśrī. The remaining drift, about 2–3°, is what
    the correction no longer covers.

  So a Tibetan eclipse computation would answer "which eclipses a traditional almanac predicts",
  which is not what FPMT prints: FPMT prints astronomical eclipses, dated by UTC (see
  [fpmt-calendar.md](fpmt-calendar.md#eclipses)), and those come from a modern ephemeris, which this
  package will not include. A front end that shows eclipses sources them itself.
  The measurement used the engine's own true Sun and Janson's Rahu, with the month count converted
  from the engine's E806 epoch to E1927 (`β = 55`, month 3 of 1927). A one-month error in that
  conversion moves Rahu by only 1.6°. Henning's values were read from the OCR text of his chapter III
  (pp. 95–126), which reads prose reliably; the correction is confirmed by its own derivation,
  135 lunar days × 0;0,14,0,12.

- **Appendix E's association tables — not shipped, and recorded so the absence is a decision.**
  Janson prints three lookups beside the attribute calculations: element → colour, trigram → direction
  and associated element, and number → colour, element and direction. `./astrology` computes every
  value those tables are keyed by and ships none of the tables. Two reasons. They are lookups over values
  already returned, so a consumer who wants them loses nothing but a table. And the **colours are
  contested**: Janson's own LaTeX comment beside the colour table cites "Henning p. 167 and 177 for
  different colours", and under this project's rule a convention with two defensible answers belongs in
  injected config or nowhere, not in a fixed export. The directions look uncontested and could ship
  alone; nobody has asked for them. [astrology.md](astrology.md) says the colours and directions are not
  in the output, so a reader of its cycle table does not go looking for them.

- **The almanac's twenty-seven astronomical yogas and eleven karaṇas.** Janson's main text, "Further
  calculations", defines the five daily quantities an almanac prints; `./astrology` computes three —
  the weekday, the lunar day and the lunar mansion. The other two are the **astronomical yoga**
  (*yoga* योग; སྦྱོར་བ *jorwa*), from the summed longitudes of sun and moon, and the **karaṇa**
  (*karaṇa* करण; བྱེད་པ *chépa*), a half lunar day.
  Both would be additive. The only check available today is Henning's daily calendars, which print both
  but are this engine's own lineage, as for the mansion — so shipping either would add a claim
  with less behind it than anything `./astrology` ships now. Until 2026-09-18
  [why-trust-these-dates.md](why-trust-these-dates.md) filed karaṇa under Appendix D, which is wrong.

- **"Some special days": the sun entering a sign, the definition points and their midpoints.** Janson's
  section on the days the mean sun enters each sign, and on the definition points (སྒང *gang*) and
  their midpoints (དབུགས *uk*).
  Calendar astronomy rather than astrology, so if it is ever built it does not belong in `./astrology`.

- **Source Bhutan's month animals and elements.** Janson gives month-animal lists for Phugpa and
  Tsurphu and none for Bhutan, so `./astrology` refuses that attribute for a tradition this package
  otherwise exports and validates day by day. A search on 2026-09-10 found nothing usable —
  BhutanWiki and the general Bhutan calendar pages cover only the *year* cycle — and the negative
  result is recorded in [validation-sources.md](validation-sources.md) so it is not re-walked.

  **It is a deferral rather than a dead end, and the reason is specific.** The source that would
  settle it is the Royal Government's *lo-tho*, which this repository already holds and already
  documents as a scanned PDF with **no text layer** — the reason `test/fixtures/rgob.ts` is
  hand-curated by exception. So the answer is probably in a document we have, behind exactly the OCR
  that exception exists to forbid. The realistic routes are a human reading of the relevant pages,
  or a Bhutanese almanac published with machine-readable text; neither is urgent, because the
  refusal is honest in the meantime. The API-shape half of this question is **not** here — it sits
  in the Pre-v1.0.0 checklist, because it freezes at 1.0.0.

- **An interactive almanac page, not a prose docs site.** A prose documentation site would duplicate
  [guide.md](guide.md), and its examples would sit outside the assertion machinery that makes the
  README's trustworthy — `test/readme.test.ts` and `test/guide.test.ts` assert every example those
  documents state, and a hand-written site would assert none. That is the failure this repository is
  organised against, so a docs site is not the thing to build.

  What a web surface can do that no README can is render a **live month grid** with a tradition
  switcher and observance toggles. The product claim is "dates you can trust", and a rendered almanac
  demonstrates it in one screen where prose only asserts it.

  **Precondition: every date or example it shows is generated from, or asserted by, the test suite —
  never hand-written.** Design it alongside the `tibetan-calendar-story` web publication rather than
  separately; that document is already being written to be publishable as a webpage, and two
  unrelated web surfaces for one project is a maintenance surface nobody asked for. TypeDoc stays
  blocked on TypeScript 7 independently of this.

- **The 60 rabjung cycle names — SHIPPED, Tibetan only.** `rabjungFor(year).tibetanName` carries a
  `TibetanName` at every position — script, Wylie, phonetics. **Neither** of the cycle's two Sanskrit
  lists ships, because they carry different names at 16, 17, 18, 20 and 34 and a type pairing either
  with the Tibetan name would misname 8% of years silently
  ([decisions/2026-08-25-rabjung-ships-the-tibetan-name-only.md](decisions/2026-08-25-rabjung-ships-the-tibetan-name-only.md),
  which also records the shape both lists would take if they return). The Monier-Williams glosses and
  Csoma's columns stay sourced and regenerated in `test/fixtures/rabjung-names.ts` and
  `docs/names/rabjung.md`. `tibetanName` (`name` until 2026-09-13) is a **required** field, decided against the completed table.

  Additive, so not a breaking change. See
  [architecture.md](architecture.md#why-rabjungtibetanname-carries-the-tibetan-name-and-neither-sanskrit-list)
  for the shape and what it does and does not promise,
  [names/rabjung-sourcing.md](names/rabjung-sourcing.md) for the sourcing hunt — every source tried,
  the dead ends with their evidence, and the findings that changed the method — and
  [decisions/2026-08-21-rabjung-names-carry-both.md](decisions/2026-08-21-rabjung-names-carry-both.md)
  for the design decisions and their trade-offs, including why `meaning` is one field rather than
  two despite the fixture distinguishing a verbatim quote from a composed one.

- **Mutation testing with Stryker.** Open question, not a commitment. The argument for it is that
  this project's real risk is semantic — a misread constant, `⌈⌉` for `⌊⌋`, a flipped comparison —
  and mutation testing is the only tool that asks whether the suite would *catch* such a change,
  rather than whether the code looks well formed. Coverage is already 100% of lines, which is
  exactly the condition under which coverage stops being informative and mutation score starts.
  Against it: it adds a devDependency, runs slowly against a suite with several multi-century
  sweeps, and the sweeps themselves may need excluding to keep a run tractable. Evaluate after
  v1.0.0, and judge it on whether it kills mutants in `corrections.ts` and `calendar.ts`
  specifically — those are where a silent wrong answer would come from.

- **CodeQL.** Open question. Free for public repos and GitHub-native, so it costs a workflow file
  and no account, and it would arrive naturally with the repo going public. Be clear about what
  it buys here, which is not much: zero runtime dependencies, no I/O, no network, no filesystem
  access and no user-controlled regex mean there is very little for a SAST tool to find. Treat it
  as supply-chain hygiene and a signal to consumers rather than as a defect-finder. **SonarQube
  was considered and rejected** for this repo: it duplicates Biome and `tsc`, it cannot see the
  semantic errors that actually threaten this project, and it would flag the deliberately
  repetitive generated fixtures as duplication and the correction-table symmetry as complexity.
- **Tsurphu tradition** (Karma Kagyu) via a second `TraditionConfig`.

  **Correction, 2026-08-16: "only the constants differ" was wrong**, and stood here for three
  phases. Janson states a *different leap-month rule* for each version — a leap month is inserted at
  intercalation index 48-or-49 for Phugpa, but **0-or-1 for Tsurphu**, 46-or-47 for the Mongolian
  version and 57-or-58 for the Bhutanese. The rule was hardcoded to Phugpa's, so a Tsurphu config
  built from constants alone would have produced leap months in the wrong years — silently, since
  nothing about the output looks wrong.

  That is now `TraditionConfig.leapIndexThreshold`, and `β` and the true-month rounding rule are
  derived from it rather than written as literals. So the algorithm *does* now support Tsurphu and
  the Mongolian version, and worked configs for both are in [traditions.md](traditions.md) — as
  data, not exports, because expressing a tradition and validating it are different claims.

  **A concrete route for the Mongolian version, scoped 2026-08-23** — now tracked in its own entry,
  *Mongolian tradition*, below. `@hnw/date-tibetan` (MIT, npm)
  ships a `CalendarMongolian` that reproduces Janson's Mongolian leap months for every year checked,
  so a day-by-day fixture could be generated from it exactly as `crosscheck-eszthoff.ts` is. **That
  alone does not clear the export gate**: it derives from Janson as this engine does, so agreement
  establishes the arithmetic rather than the calendar. Bhutan shipped on one implementation lineage
  **plus** twenty-five government-published days, and Mongolian needs the same shape — published
  Tsagaan Sar dates being the obvious second source. Testing it also showed the 1997 decree does
  *not* diverge from computation, which is the obstacle
  [validation-sources.md](validation-sources.md) had recorded; the details are there.

  **Bhutan's leap-month position closed on 2026-08-16**, as `TraditionConfig.leapMonthPosition`. It
  numbers a leap month from the **preceding** month where every other version numbers it from the
  following one, so its leap month falls *after* the regular month sharing its number. The engine's
  month sequence is validated against `test/fixtures/bhutan.ts` at exactly one offset over 375
  months, with the position flipped back to `"before"` matching at none — see
  [traditions.md](traditions.md) for the full account.

  **Two estimates in this entry were wrong, and the shape of the error is the lesson.** It called the
  work "a convention threaded through four functions". Two of those four were right, one was a rename
  only, one (`M06L` in `formatTibetanDate`/`parseTibetanDate`) needed no code change at all — and
  **four others were missed**, all of them consumers rather than definitions: `losarJulianDay` and
  both `monthsFor` bounds spelled "the last month of the year" as `(12, isLeap: false)`, `monthsFor`
  emitted the pair in the wrong order, and `getObservances` located a leap twin by probing
  `monthCount ± 1`. Counting the definitions and forgetting the callers is the error worth
  remembering.

  The entry also predicted the wrong arithmetic: it said the leap adjustment's **sign** flips. It
  does not — the regular month of a twinned pair takes the adjustment instead, and only when it has a
  twin.

  The one **genuine** question it raised did fall out after all: the observance layer's
  `leapMonth: "leap" | "regular"` convention needed nothing, because it branches on the semantic flag
  rather than on position. What did need fixing was how the twin is *found*.

  **Closed, and the way it closed is worth keeping.** This entry read "Still open for Bhutan: a
  runnable config — `m₀`, `s₀` and `a₀` remain unreconciled, so no day-level Bhutanese date is
  claimed and `BHUTAN` is not exported" until 2026-08-21, by which time every clause of it was
  false. `BHUTAN` and `BHUTAN_HENNING` are both exported and deeply frozen, and `BHUTAN_HENNING` is
  validated day by day against Bhutanese calendar data, where `BHUTAN` is checked
  against twenty-five government-published days only — see
  [../src/traditions/bhutan.ts](../src/traditions/bhutan.ts) and
  [testing.md](testing.md) for the window.

  The reconciliation the entry was waiting on turned out not to be needed. It assumed Bhutan's
  epoch had to be recovered from the four-version comparison table by `x₀ = table x₀ − x₁`; in fact
  Janson's Bhutan appendix gives the epoch data directly and states that `m₀` is already "modified
  to yield the JD", the same form `PHUGPA`'s constant takes. So the one-mean-lunar-month trap does
  not arise for Bhutan at all — it still does for Tsurphu and Mongolia, whose epoch data he gives
  *only* in that table. The `moonTab`/`sunTab` worry dissolved the same way: the correction tables
  are defined once, in his astronomical section, and no version appendix restates them.

  Two things the fixture work turned up. The upstream file is **not in date order** — a block of
  early-2002 rows is interleaved and another sits after 2004-02-20 — so anything re-deriving from
  source must sort first. And Janson records that Bhutan's *government calendar* and the *computed*
  result disagree about New Year 2003, saying "I have no explanation for this discrepancy"; the
  fixture follows the computed line, and that is recorded rather than resolved.

  A third turned up when the engine was finally held to the data: the source carries **one leap
  month Janson does not list**, at 2030-04-03, because the upstream leaves its leap flag set a month
  too long. The generator has a fifth check for it, and the fixture now ends the day before (its
  extent is in `docs/testing.md`); asking the generator for a later end refuses to write.

- **Mongolian tradition** (New Genden) via its own `TraditionConfig`. Added as its own entry on
  2026-09-24, at Andreas' request; its route was first scoped inside the Tsurphu entry above, which
  still carries that paragraph. Janson, citing Berzin, gives it as the version of **Mongolia, and of
  the Buryats and Tuvinians** of Siberia; the Kalmyks follow Phugpa and are served already.

  **What exists.** The version is expressible — `leapIndexThreshold: 46` was the only missing rule —
  and its **leap months** are checked against Janson's cross-version table
  (`test/fixtures/cross-version-leap.ts`). The config in `test/support/versions.ts` is `PHUGPA` with
  three fields replaced, so its **astronomy is Phugpa's**: it answers questions about month numbering
  and nothing about day numbers. That is why nothing is exported.

  **What exporting needs**, under
  [decisions/2026-08-16-exported-means-validated.md](decisions/2026-08-16-exported-means-validated.md):

  1. **Its own astronomy.** `m₀`, `s₀` and `a₀` exist only in Janson's four-version comparison
     table, which is stated one mean lunar month from the epoch a config uses — the trap
     [traditions.md](traditions.md) records. Bhutan escaped it because its appendix gives the epoch
     directly; Mongolia does not.
  2. **Its naming.** Janson says Mongolia follows the Chinese rules for the month's animal, gender
     and element, as Tsurphu does, but not Tsurphu's nine month numbers. Whether the weekday names
     and the `./astrology` attributes carry over has to be sourced, not assumed — the lesson of the
     Bhutanese `weekdayOffset`.
  3. **External validation from two lineages**, as Bhutan has: one day by day (`BHUTAN_HENNING`) and
     one a 25-day sample (`BHUTAN`).
     `@hnw/date-tibetan`'s `CalendarMongolian` derives from Janson, so it can confirm the arithmetic and cannot confirm the
     calendar. The independent candidates: published Tsagaan Sar dates; the printed Buryat almanacs
     Zurkhai's App Store listing names (Yampilov-Galsanov's "Zurkhai-3" and Atsagatsky Datsan
     publications); and Zurkhai's own Hural list, whose 2027 dates follow Mongolian month
     numbering — months only, lineage unknown, and three of its Hurals fit neither version. See
     [almanac-sources.md](almanac-sources.md)'s Zurkhai lineage question.
  4. **Observances are a separate question.** Buryat Hurals are their own calendar of holy days,
     not `EXAMPLE_OBSERVANCES`, whose conventions are FPMT's; that belongs to the `./observances` work, not to the
     config.

  **Measured 2026-09-24:** between 2020 and 2033 the two versions give a day a different month label
  on 1,122 of 5,114 days, in five stretches of about seven months — the next from 9 March to 29
  October 2027. Any validation window has to include such a stretch, or it cannot tell the two
  versions apart.

- **Navigation and date arithmetic — shipped 2026-08-15**, so this entry records only what became
  of its open questions. `addDays`, `daysBetween`, `addMonths`, `monthsBetween`,
  `lunationFromMonth`, `monthFromLunation`, `nextFullMoon` and `nextNewMoon` are free functions on
  the root export; no `TibetanDate` class, so
  [decisions/2026-08-12-no-tibetan-date-class.md](decisions/2026-08-12-no-tibetan-date-class.md)
  stands. The reasoning is in
  [decisions/2026-08-15-lunation-arithmetic.md](decisions/2026-08-15-lunation-arithmetic.md).

  - *What "add one month" means across a leap month* — none of skip, land or refuse. A Tibetan month
    is a lunation, so one month after M05 of 2151 is M06L, which is what the calendar counts.
  - *What `addDays` returns when the target date is skipped* — **struck, not answered.** It cannot
    land on one: stepping real days never reaches a label no calendar day carries.
  - *Whether the return is resolved or naming fields* — `addMonths` returns a `TibetanMonth`, which
    is what keeps it total; `addDays` returns a `TibetanDate`.
  - *Whether `daysBetween` takes two Tibetan dates* — it does, and its docblock says when not to use
    it. For two dates this package produced, `a.isoDate.until(b.isoDate)` is better. It is recorded
    as **the first export to cut** if the surface ever needs trimming.

- **A signal when observances go to the leap twin.** `EXAMPLE_OBSERVANCES` sets `leapMonth: "leap"`, so in a leap
  year every annual observance of the doubled month falls in the leap half and the regular twin renders
  with **none of those observances** — 2151's regular M06 is empty while M06L holds Chökhor
  Düchen. That is correct and matches FPMT's published date, but a consumer laying out the regular
  month sees a blank month with nothing to explain it, and `Observance` carries no field naming the
  twin. Behaviour must not change —
  [decisions/2026-11-11-observance-model.md](decisions/2026-11-11-observance-model.md) keeps this
  in injected config — so any fix is additive shape, not logic.

- **`Observance.rule.kind` reads worse than `o.kind`** — **moot since 2026-11-11**: the rebuild dropped
  `kind` altogether, and a result's grouping is `rule.level`.

- **Tibetan-language output — weekday and year naming shipped 2026-08-16.** `TibetanDate` carries
  `weekdayName`; `yearName` carries `elementName`, `genderName` and `animalName`; and
  `weekdayNameFor` is exported. (`elementNameFor`, `genderNameFor` and `animalNameFor` were exported
  too until 2026-08-25, when they came off the surface and out of `cycles.ts` — never argued for,
  and reachable as `yearNameFor(year).elementName`. See
  [decisions/2026-08-12-public-surface.md](decisions/2026-08-12-public-surface.md).) Each name is
  Tibetan script, Wylie and THL Simplified phonetics — no English field, because the string unions
  already carry the English identity and are the i18n contract. See
  [decisions/2026-08-16-names-are-data-not-locales.md](decisions/2026-08-16-names-are-data-not-locales.md).

  The three open questions this entry used to list are answered there: a **structured object**, not a
  locale parameter; **three renderings**, with IAST reserved for the Sanskrit side of the rabjung
  names; and **no `formatTibetanDate` mode**, because its round trip with `parseTibetanDate` is an
  identity that must not acquire one.

  Provenance is machine-checked rather than trusted — [names/vocabulary.md](names/vocabulary.md). Janson
  turned out **not to be self-consistent** here: Saturday is `spen ma` in his day-of-week table and
  `spen pa` in his Bhutan appendix, and the wrong one had been sitting in a shipped docblock. That
  is why the harness exists.

  **Month names — shipped 2026-09-14 as `monthNamesFor`.** The twelve lunar-mansion names are sourced and unambiguous.
  Janson lists **four seasonal identifications**, says "none of them is really used today" while calling one "now used by the Tsurphu tradition" (which Henning disputes), and
  almanacs "often give two or several different versions" at once — so they are **not a per-tradition
  selector**, as this item used to say. Three are fixed functions of the month number; only the one
  anchored on the Tiger month depends on a tradition, through the month-animal rule the config already
  carries. The shape therefore returns every system and chooses none, which needs no seasonal
  member in `naming` at all, and that is what shipped: see
  [decisions/2026-09-14-month-names-return-every-system.md](decisions/2026-09-14-month-names-return-every-system.md).
  The evidence for the names is in [names/month-and-yoga-sourcing.md](names/month-and-yoga-sourcing.md),
  and `npm run verify:month-and-yoga-names` is the verifier that enforces it.

- **Closed 2026-09-23.** The polyfill path was spiked before the freeze, as this entry asked: the
  polyfill probe ran the surface under native and polyfilled `Temporal` in Node, Chrome, WebKit and
  on a real Mac and iPhone, found one defect — a `PlainDate` from a second implementation was refused
  or misread — which is fixed, and the README now says a browser needs the polyfill. The real-device
  re-run against the release is on the pre-1.0.0 checklist. The original entry follows.

  **Safari has not shipped Temporal, so a browser consumer needs a polyfill.** Checked 2026-08-22.
  Temporal ships natively in Chrome 144 (13 January 2026), Firefox 139 and Edge 144, and reached
  TC39 Stage 4 in March 2026 — but Safari has it only in Technology Preview behind a flag, which is
  what is holding Temporal out of Baseline.

  The consequence is specific and slightly awkward: this package's zero-dependency claim is true of
  the package and **not** of a browser consumer on Safari or iOS, who must load
  `temporal-polyfill/global` before importing it. The README's Requirements section already names
  that polyfill for old Node; it does not yet say the same thing about browsers.

  Not a task, because nothing here needs changing until a browser client exists — the engine is
  environment-agnostic and the guard in `conversion.ts` already produces a message naming the
  polyfill. Re-check Safari's status when the Nyamlen client's target platform is decided; if it is
  a web app, spike the polyfill path *before* the API is frozen, since that is the only way to find
  out whether anything in the surface behaves differently under a polyfilled `Temporal`.

- **iCalendar (ICS) export — declined.** `getObservances` returns plain objects; a consumer maps
  them to whatever format they need. Per
  [decisions/2026-08-12-public-surface.md](decisions/2026-08-12-public-surface.md), a name is
  exposed when the consumer-side workaround is wrong or impossible, and stays internal when it
  merely costs a loop — an ICS export is a loop, not a wrong-or-impossible workaround, and it would
  mean owning RFC 5545 escaping, `VTIMEZONE` and folding, none of which is calendrical. An
  `@nyamlen/icalendar` package remains open if one is requested.

- **A phase-time retrospective.** Requested 2026-08-22. **Not here** — and its destination is not
  this file's business either: this repository ships a package, and the retrospective is process,
  being prose, numbers and diagrams about how the package was built.

  Its home, its source material and the rules governing it **moved to the `nyamlen` repository on
  2026-09-20**, where the component roadmap owns them: the four seed insights with their figures,
  the caveat rule that every number travels with its qualification, the two data-quality fixes of
  2026-08-22, and the graph candidates. They had grown into an entry of some sixty lines here, which
  is itself the argument for moving them — a roadmap bullet in a package repository is not where a
  publication's source material belongs.

  It had first been assigned to `tibetan-calendar-story`, which is wrong by that repository's own
  scope: *"A documentary essay on the Tibetan calendar"*, and separately, *"Not a software
  project."*
