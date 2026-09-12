# Roadmap

## Implementation Phases

| Phase | Scope | Effort |
|-------|-------|--------|
| 0 | Scaffold (npm init, tsc, vitest, fast-check, biome, CI) — **done** | 2h |
| 1 | Core computation: Layers 0-3 (Janson §2-9) — **done** | 20h |
| 2 | Validation: FPMT fixtures, cross-check against reference implementations — **done** | 12h |
| 3 | Observances: config-driven rules, Gelug default config — **done** | 8h |
| 4 | TypeDoc + release workflow + publish v1.0.0 (docblock audit split out — see Phase 4a) | 6h |
| 4a | Code review: 300 docblocks verified against behaviour, plus convention and derivation conformance across all of `src/` — see the [Pre-v1.0.0 checklist](#pre-v100-checklist) | 14h |

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
  is wrong for 57 of every 60 years.
- **Losar is not always day 1.** Where day 1 is skipped it is numbered day 2, as in 1977. This is
  why Losar is computed from the previous year's month 12.
- **2027-01-15 is month 12 day 8**, not month 11 day 27 as the plan and an early draft of the
  year-numbering record both said.

**Phase 2 outcome.** The engine now validates against three independent implementations and
against the almanac, day by day across 2022–2027 — see
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
| Does the published artifact work — installs, resolves through `exports`, both subpaths import? | Largely `scripts/check-pack.mjs`, in CI |
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
Note what a first client will *not* reach: `addDays`/`addMonths`/`nextFullMoon`, `parseTibetanDate`,
and tradition switching. Those surfaces are being frozen on lighter evidence, which is a choice
rather than an oversight.

### What the first client found

A smoke client ran on 2026-08-22 in `nyamlen/spikes/calendar-smoke/`, working only from the
installed tarball's `README.md` and shipped `.d.ts` files, with the engine's `docs/` and `src/`
off limits. It printed month grids for three probe months and its output matched every expected
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

**All six were fixed on 2026-08-23**, and the gate is closed: every item on the client's list
carries a verdict, and no verdict was "change the API". What shipped as corrections —
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

**A second client ran on 2026-08-25** against that unreached set — `nyamlen/spikes/calendar-nav/`,
working from the tarball alone. It reached all 25 exports its brief named and returned **sixteen
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
      Indian 40 but Chinese 43, so holding both in one object invited a lookup that is wrong for
      57 of every 60 years. See
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

## Pre-v1.0.0 checklist

Decisions deliberately deferred during setup, each with the reason it was deferred. Work
through this before publishing v1.0.0 — several are one-way doors once published.

The list is grouped by subject, not by sequence, and one run of items does have a required order.
The rabjung name shape settles first, because it is free now and breaking later and it changes what
an API review is looking at. Then the four **Review passes** below, in the order given there. The
`docs/` folder restructure goes **last of all** — every review before it produces documentation
edits, and moving files once after they have landed is one link-fixing commit instead of four.

**API shape**

- [x] **Year-level naming came off `TibetanDate`.** Done 2026-08-24. `rabjung` and `yearName` are
      reached through `rabjungFor(date.year)` and `yearNameFor(date.year)`; `weekdayName` stays,
      because it is the one name a date cannot regenerate from itself — `weekdayNameFor` needs a
      `TraditionConfig` and a serialised date carries none. A **breaking change** to the primary
      return type, taken now because the package is pre-v1.0.0. Took a serialised year from 293,009
      to 126,629 bytes. Constraint and the rule it follows in
      [decisions/2026-08-24-year-naming-off-the-date.md](decisions/2026-08-24-year-naming-off-the-date.md)
- [ ] **Composable/additive `ObservanceConfig`s — decide before 1.0.0, not after.** Today, a
      consumer combining several institutions' rule sets (e.g. `DEFAULT_OBSERVANCES` plus a `TEACHERS` and a
      `TANTRA` config) hand-rolls
      `{ ...DEFAULT_OBSERVANCES, rules: [...DEFAULT_OBSERVANCES.rules, ...TEACHERS.rules, ...TANTRA.rules] }` and silently
      drops a convention field (`doubledDay`/`skippedDay`/`leapMonth`) wherever two source configs
      disagree on it. Whether this package ships a first-class merge helper is exactly the kind of
      call [decisions/2026-08-12-public-surface.md](decisions/2026-08-12-public-surface.md) governs
      — once `ObservanceConfig` and the shipped configs are frozen at 1.0.0, adding a helper later
      is free, but its *absence* being the sanctioned way to compose configs is what would need
      revisiting, and that is a documentation claim worth getting right now rather than retrofitting.
      Needs its own brainstorm and spec. It was raised alongside the day-quality-code question
      below, in the research that became [almanac-sources.md](almanac-sources.md); that file's
      deliberation was dropped when it moved into this repo on 2026-09-05, because the decisions it
      argued toward are the ones recorded here.

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
- [ ] **New subpath `./astrology`, computing Janson's Appendix E in full — placement, scope and
      naming decided 2026-09-03; the module itself is not yet built.**

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

      **Scope — Appendix E in full, Appendix D explicitly deferred.** Appendix E ("Further
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

- [ ] **Decide what `./astrology` does for Bhutan's month and lunar-day attributes.** Janson gives
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
      list so the same source is not re-evaluated. Blocks any use of it as a fourth Phugpa cross-check

- [ ] **Read Zurkhai's App Store metadata and complete its
      [other-implementations.md](other-implementations.md) entry.** `apps.apple.com/us/app/id6772695315`
      returned HTTP 429 on both attempts on 2026-09-10, so seller, version, release date and
      description are unknown, and that file's discipline is that every claim carries a source and an
      access date. The entry is written and marked incomplete rather than left out. Small; needs only
      a successful fetch

**Documentation**

- [x] **Split the README into a landing page and a guide.** Done 2026-08-23. The README carries the
      pitch, install line and one runnable example in its first 40 rendered lines; `docs/guide.md`
      takes the long-form material in three sections. Constraint recorded in
      [decisions/2026-08-23-readme-is-the-landing-page.md](decisions/2026-08-23-readme-is-the-landing-page.md)
- [x] **`docs/why-trust-these-dates.md`** — the reader-facing account of what has been validated and
      over which years, written for a non-programmer. It is the only document besides
      [testing.md](testing.md) permitted to quote a validation window; everything else links to it
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
- [ ] **Announce `./astrology` in the README, and decide whether `docs/astrology.md` ships —
      both *after* the subpath's code lands, not before.** Scoped 2026-09-11 when Andreas asked
      whether to do it early, on the reasoning that the module will be built before 1.0.0 anyway.
      That reasoning is sound; the sequencing argument is not about it.

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

- [ ] **Audit and correct all 300 docblocks against actual behaviour** — see
      [Phase 4a](#implementation-phases) for the effort estimate. `src/types.ts` (56),
      `src/computation/calendar.ts` (30), `src/observances/types.ts` (28),
      `src/computation/scaling.ts` (22) and `src/navigation.ts` (16) are the concentrations, across
      22 files in `src/` in total.

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

- [x] **Decided: `name` is a required field on `Rabjung`.** Free now at `0.0.1`, a breaking change
      after `1.0.0`, and approved on its own against the real, fully-sourced table rather than as a
      rider on the generator work that produced it — see
      [decisions/2026-08-21-rabjung-names-carry-both.md](decisions/2026-08-21-rabjung-names-carry-both.md).
      Optionality was investigated and rejected on evidence: `toEqual` fails on an extra *runtime*
      property regardless of the type, so `name?:` would have saved none of the 14 migrated
      assertion sites while costing permanent narrowing under `exactOptionalPropertyTypes` for a
      field that is total over 1–60.
- [x] **The rabjung name shape — settled 2026-08-25, and the answer was "neither list".**
      `Rabjung.name` is a plain `TibetanName`. The item asked whether `sanskrit` sat at the right
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
- [ ] **Decide what belongs in this package's general observance layer versus what stays
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
      FPMT's 2022-2025 occurrences and invents 36 (full divergence table and history under Sojong,
      Beyond v1, below). [almanac-sources.md](almanac-sources.md) (moved into this repo 2026-09-05) recorded a candidate from
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

      Once both are settled: confirm each surviving rule's day, tier and source against FPMT's
      current guidance rather than trusting the 2022-2025 fixture check alone to still hold.

      **Done 2026-09-05: renamed `GELUG` to `DEFAULT_OBSERVANCES`** (`id` stays `"gelug"` — a data
      field, not an exported identifier, so the naming rule doesn't reach it — file renamed to
      `default-observances.ts`), per the rule decided 2026-09-03: no exported identifier names an
      institution, and `GELUG` overclaimed besides, since Kopan Monastery — also Gelug — prints
      the opposite `doubledDay` for the same date FPMT does. See the rule in
      [CLAUDE.md](../CLAUDE.md)'s Conventions section and its row in
      [coding-standards.md](coding-standards.md). The sweep for any other export or identifier
      named after an institution or organisation, required alongside this rename, is recorded
      below, dated 2026-09-05.

      **Still open:** add the settled rule list to `docs/guide.md` or `docs/architecture.md`, so a
      reader is not required to open `default-observances.ts` to know what ships. **Blocks the item
      below**: a code review that reads a ruleset which may still change content, membership or
      name is reviewing a moving target.

      **Still separate:** the composable-config helper and the day-quality-code placement question,
      both recorded in the same nyamlen note, are distinct subsystems needing their own brainstorm
      and spec — not folded into this task.

      **Sweep run 2026-09-05: clean.** Every export on both barrels
      (`src/index.ts`, `src/observances/index.ts`) was read against the rule in
      [2026-09-03-no-institution-names-in-exports.md](decisions/2026-09-03-no-institution-names-in-exports.md).
      `PHUGPA`, `PHUGPA_HENNING`, `BHUTAN` and `BHUTAN_HENNING` were checked deliberately and are not
      violations — they name calendrical systems Janson describes, not institutions' conventions.
      `DEFAULT_OBSERVANCES` was already renamed. No other offender found.
- [ ] **Full code review.** Subject: all of `src/`, plus `scripts/` and the fixture generators,
      which are unreviewed and produce the primary correctness gate. **Command:**
      `/code-review max src/` for a path-scoped pass — note that plain `/code-review` and
      `/code-review ultra` are **diff-shaped**: ultra bundles the current branch against `main`, so
      on a clean `main` there is nothing to review. Either give it a path, or run it from the
      release branch where the diff is real. `--fix` applies findings to the working tree; take the
      findings first and apply deliberately, since several rules here are intentional and will read
      as defects to a reviewer that has not read CLAUDE.md
- [ ] **Security review.** State the honest scope first, or the pass will invent findings: zero
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
- [ ] Create a **granular access token** for CI, scoped to this package only, read-write, with
      an expiry. npm tokens are always issued by a *user*, never by an org — create it as an
      account with write access. Store it as a GitHub **organisation-level** secret so sibling
      packages can reuse it
- [ ] **After 1.0.0 ships**, `npm deprecate tibetan-calendar-temporal@0.0.1 "placeholder; use
      1.0.0"`. One command, and it puts a warning in front of anyone who pinned the placeholder.
      Pointless before there is a version to point them at, which is why it is sequenced here
      rather than with the other publishing setup

**Release workflow (Phase 4)**

- [x] **Packaging is verified in CI.** `check:publish` runs `publint` and `attw --pack . --profile
      esm-only`; `test:pack` packs the tarball, installs it into a scratch directory outside the
      repository, and imports both subpaths as a consumer would. The gap they close is structural
      rather than incidental: every other test imports from `src/`, so nothing else in the suite
      can see a broken `exports` map, a file missing from `files`, or a `dist/` layout that does
      not match what `exports` points at. Those fail only for a consumer, after publishing.
      `publint` and `attw` check the manifest; only `test:pack` proves the built JavaScript runs.
      Writing it immediately found that `./package.json` is not in the `exports` map — correct, as
      it happens, but nothing had established that either way
- [ ] **Nothing builds before packing.** There is no `prepack`, `prepare` or `prepublishOnly`
      script, so `npm pack` and `npm publish` both package whatever happens to be sitting in
      `dist/`. CI is covered by accident rather than by design — `check:publish` and `test:pack`
      each run `npm run build` first — but a bare `npm publish` would ship a stale build, silently,
      at the one moment that is expensive to get wrong. Add `"prepack": "npm run build"` rather than
      only building inside `release.yml`: the script protects a local publish too, and the local
      publish is the case with no other guard. Note it also makes `npm pack` slower, which is
      correct — a fast pack of the wrong bytes is the failure being prevented
- [ ] `.github/workflows/release.yml` publishing on tag, with `permissions: id-token: write`
      and `actions/setup-node` given `registry-url: 'https://registry.npmjs.org'` — that line
      generates the `.npmrc` that reads `NODE_AUTH_TOKEN`; without it the token is ignored and
      the publish goes out anonymous
- [ ] Add `"provenance": true` to `publishConfig` rather than passing `--provenance` at the
      call site
- [ ] Confirm `repository.url` still matches the building repo. Provenance attestation fails if
      they disagree — currently correct, but it would have broken had the repo not been
      transferred to the org before v1
- [ ] Diarise the token expiry. An expired token breaks releases silently, months later
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
operation unapplied. CI is unaffected: tokens bypass 2FA entirely.

**Repository**

- [ ] Make the repository **public**
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

- **The 60 rabjung cycle names — SHIPPED, Tibetan only.** `rabjungFor(year).name` carries a
  `TibetanName` at every position — script, Wylie, phonetics. **Neither** of the cycle's two Sanskrit
  lists ships, because they carry different names at 16, 17, 18, 20 and 34 and a type pairing either
  with the Tibetan name would misname 8% of years silently
  ([decisions/2026-08-25-rabjung-ships-the-tibetan-name-only.md](decisions/2026-08-25-rabjung-ships-the-tibetan-name-only.md),
  which also records the shape both lists would take if they return). The Monier-Williams glosses and
  Csoma's columns stay sourced and regenerated in `test/fixtures/rabjung-names.ts` and
  `docs/names/rabjung.md`. `name` is a **required** field, decided against the completed table.

  Additive, so not a breaking change. See
  [architecture.md](architecture.md#why-rabjungname-carries-the-tibetan-name-and-neither-sanskrit-list)
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
- **Sojong**, once its rule can be sourced. Additive — `ObservanceConfig.rules` is an array, so a
  row can be added without a breaking change. Phase 3 established that it is **not** a fixed day
  number: against FPMT's calendars for 2022–2025, a 15th-and-30th rule misses 38 occurrences and
  invents 36, and the misses are not random. It lands a day early in some months and not others:

  | Date | Tibetan day | Sojong printed? |
  |------|-------------|-----------------|
  | 2022-01-31 | 29 | yes |
  | 2022-02-01 | 30 | no |
  | 2024-08-04 | 30 | yes |
  | 2025-11-19 | 30, first of a doubled pair | yes |
  | 2025-11-20 | 30, second of the pair | no |
  | 2026-06-14 | 29 | yes |
  | 2026-06-15 | 30 | no |

  Note the 2025 row: sojong goes on the **first** of a doubled 30, where FPMT's own guidance and
  its placement of the great days both say the second. So it does not follow the config's
  `doubledDay` axis either.

  **The question to put to FPMT:** what determines whether sojong falls on the 29th or the 30th,
  and why does it take the first of a doubled day where the duchen take the second? If the answer
  is that it is scheduled by each community rather than computed, that is a publishable finding
  too — it would mean sojong belongs in caller-supplied rules permanently, and the docblock in
  `src/observances/default-observances.ts` should say so rather than leaving it open.

  **A candidate answer surfaced 2026-08-28, outside this repo, and was falsified 2026-09-04.**
  [almanac-sources.md](almanac-sources.md) records an oral-teaching source (Geshe Gyaltsen, translated by
  Geshe Graham, notes by Thubten Chöying) giving an actual rule rather than a fixed day: sojong at
  the end of an **odd** Tibetan month falls on the 14th, at the end of an **even** month on the
  15th. Run against the table above (`isoToTibetan` on all seven dates, checked under three
  readings of "which month" — nominal month number, true sequential lunation, and position since
  Losar): the best of the three, nominal month number, matches only 4 of 7, with the 2026-06-14/15
  pair a clean inversion rather than an edge case. **This candidate does not reproduce the table and
  should not ship.** Sojong stays open pending a different or corrected source — the notes' own
  disclaimer that transcription errors are the transcriber's is the likeliest explanation, not a
  flaw in this table.

  That note also opens two follow-on design questions, and **neither is beyond-v1 any more**: the
  composable/additive `ObservanceConfig` helper (e.g. `DEFAULT_OBSERVANCES + TEACHERS + TANTRA`) and the
  day-quality-code placement question are both now tracked under the Pre-v1.0.0 checklist's API
  shape section above, since both bear on this package's stated scope and surface before that
  freezes. Both still need their own brainstorm and spec, in that order; see
  [almanac-sources.md](almanac-sources.md).

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

  **A concrete route for the Mongolian version, scoped 2026-08-23.** `@hnw/date-tibetan` (MIT, npm)
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
  false. `BHUTAN` and `BHUTAN_HENNING` are both exported and deeply frozen, and the config is
  validated day by day against Bhutanese calendar data for 2000–2030 — see
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

  A third turned up when the engine was finally held to the data: the fixture carries **one leap
  month Janson does not list**, at 2030-04-03, because the upstream leaves its leap flag set a month
  too long. The generator has a fifth check for it now, and **will refuse to rewrite the committed
  window until the source is fixed**.

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

- **A signal when observances go to the leap twin.** `DEFAULT_OBSERVANCES` sets `leapMonth: "leap"`, so in a leap
  year every observance of the doubled month falls in the leap half and the regular twin renders
  with **no tier-1 observances at all** — 2151's regular M06 is empty while M06L holds Chökhor
  Düchen. That is correct and matches FPMT's published date, but a consumer laying out the regular
  month sees a blank month with nothing to explain it, and `Observance` carries no field naming the
  twin. Behaviour must not change —
  [decisions/2026-08-12-observance-policy.md](decisions/2026-08-12-observance-policy.md) keeps this
  in injected config — so any fix is additive shape, not logic.

- **`Observance.rule.kind` reads worse than `o.kind`** for what is arguably the observance's own
  primary attribute. Cosmetic, on a subpath surface, and breaking to change, so it is a note rather
  than a task.

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

  **Still outstanding: month names.** The twelve lunar-mansion names are sourced, unambiguous, and
  could ship alone on the existing `TibetanName` shape and harness. What blocks the rest is that the
  animal and seasonal systems are **tradition-dependent** — Phugpa sets month 11 = Tiger against
  Tsurphu's month 1 = Tiger — and Janson lists **four competing seasonal identifications**, none of
  which he reports as current usage. Choosing among them is a contested convention, which by the
  public-surface record belongs in injected config. Four `naming` members would be needed: an animal
  offset, an element-rule selector, a seasonal-system selector, and a Tsurphu-only number flag. Name
  any selector for what the rule *does*, as Janson describes them — never for a tradition, which
  would reintroduce the `config.id` anti-pattern.

- **Safari has not shipped Temporal, so a browser consumer needs a polyfill.** Checked 2026-08-22.
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

- **A phase-time retrospective, published in the `tibetan-calendar-story` repository.** Requested
  2026-08-22. Not here: this repository ships a package, and the retrospective is prose, numbers and
  diagrams — which is exactly what that repository is for. Its diagram rule applies, so every chart
  is authored Mermaid or hand-written SVG under `diagrams/`, never a bitmap, so one source serves
  both the webpage and the deck.

  The data lives outside both repositories, in the tracker at
  `~/.claude/projects/h--repositories-tibetan-calendar-temporal/time-tracking/` — `phases.json`
  holds one row per work window with a note recording what happened, and `report.mjs` prints the
  table and an idle-threshold sensitivity breakdown.

  **Insights already found, and worth checking before more are hunted.** These came out of a review
  of the rows on 2026-08-22 and are the seed, not the whole set:

  - **Responding to reviews cost more than building the calendar.** Adversarial-review remediation
    totals 7.7h against 7.6h for Phases 1, 2 and 3 combined — the core computation, the validation
    layer and the observance engine together — and the roadmap budgeted **zero** for it.
  - **Sourcing names cost more than every budgeted phase put together.** The rabjung names (10.8h)
    and the naming layer (4.4h) come to 15.2h, against 13.4h for all five estimated phases. The
    expensive part of this project was provenance, not arithmetic.
  - **Every estimate was high, and by a consistent factor.** 48h estimated across Phases 0–4 against
    13.4h measured. That is a statement about the estimating model, not about the work: the
    estimates were hand-written for human effort and the tracker measures agent-session wall-time,
    so the honest finding is that the two are not comparable — which is itself the insight.
  - **Elapsed dwarfs active on the long phases.** Part 5 spans 47.9h of calendar time for 10.8h of
    active work. Worth pairing with the sensitivity table, which shows the same rows never
    plateau.

  **Every number must travel with its caveat**, in the same sentence or the one after. Active time
  is session wall-clock including model latency and reading, gaps over fifteen minutes are dropped,
  and for the three longest phases the figure never plateaus as the threshold widens — so those are
  upper bounds, not measurements. A retrospective that prints them bare would assert a precision the
  data does not have, which is the same failure [testing.md](testing.md) exists to prevent for
  validation windows.

  **Two data-quality bugs were fixed on 2026-08-22 and both predate the numbers above**, so any
  chart built from an older export is wrong: commit counts ignored excluded windows entirely (one
  consolidated row claimed 47 commits against 11), and one row was nested inside another with no
  exclusion, billing roughly 1.3h and 8 commits twice. A nesting check over all rows now passes.

  Graph candidates: estimate against actual for the five budgeted phases; budgeted against
  unbudgeted work as a share of the total; a timeline of phases showing where remediation
  interleaved with delivery; and active against elapsed per phase. The first is the one that carries
  the argument, and it needs the caveat printed beside it rather than in a footnote.
