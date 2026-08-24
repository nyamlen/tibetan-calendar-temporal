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

1. **`leapMonthOfYear`'s docblock is a false contract, and it ships.** `src/months.ts` says the
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
`leapMonthOfYear`'s docblock and its Bhutan figure, the README's month-grid ordering claim, the
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
The `RabjungName` shape settles first, because it is free now and breaking later and it changes what
an API review is looking at. Then the four **Review passes** below, in the order given there. The
`docs/` folder restructure goes **last of all** — every review before it produces documentation
edits, and moving files once after they have landed is one link-fixing commit instead of four.

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
      this item anticipated: `monthsFor`, `daysInMonth`, `hasLeapMonth`, `leapMonthOfYear` and
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
      `scripts/check-conventions.mjs` gates seven rules nothing previously checked — twelve as of
      2026-08-22, the later five added as the conventions they enforce were written — Biome bans the
      `Date` global in `src/`, and markdownlint finally runs in CI against the config that had
      existed for weeks unread. CI is nine commands. Every rule and its enforcement status is in
      [coding-standards.md](coding-standards.md), which the guard also validates against reality so
      it cannot drift.

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
      `leapMonthOfYear` and `monthsInYear` promised exactness "for any safe integer year" (corrected
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
         (`leapMonthOfYear`, documented `2153 → 6` when 2153 has no leap month), and a second
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
- [ ] **Re-open `RabjungName`'s shape: `sanskrit` sits at the same level as `tibetan`, `wylie` and
      `phonetic`.** This *was* argued when the type was created — see
      [decisions/2026-08-21-rabjung-names-carry-both.md](decisions/2026-08-21-rabjung-names-carry-both.md),
      "`extends` rather than nesting the Tibetan half": `RabjungName extends TibetanName` was chosen
      because the rejected alternative `{ tibetan: TibetanName; sanskrit: SanskritName }` makes the
      script reachable only as `rabjungFor(2153).name.tibetan.tibetan`, which reads as a typo
      permanently. The record also states the trade-off it accepts — extending `TibetanName` makes
      the Tibetan the identity and the Sanskrit an attribute, which runs against the Sanskrit name
      being historically first. So this item is not "was it discussed" but "does the accepted
      trade-off still look right at 1.0.0": the three flat siblings are three *renderings of one
      name* (script, transliteration, transcription) and `sanskrit` is a **different name** at a
      different level of the tree — at positions 16, 17, 18, 20 and 34 provably naming something
      else, since it belongs to a different Sanskrit list (29 and 52, which this item originally
      cited, turned out to be one year with two attested readings rather than a divergence). The
      alternatives worth weighing are keeping it as shipped, a third shape that nests only the
      Sanskrit (`{ tibetan, wylie, phonetic, sanskrit: { … } }` is already that — so the question is
      whether the *docblock* carries the asymmetry loudly enough), and renaming the field to say it
      is the Indic list's name rather than a translation. Breaking after 1.0.0, free now.

      **A constraint found on 2026-08-24 that narrows this, and should be settled before the shape
      is.** Now that both lists exist in the fixture, "ship the list the Tibetan actually translates
      instead" is a live option — and it cannot carry a `meaning`. Every gloss in this package is a
      Monier-Williams lookup keyed on **Devanāgarī**, and that list has no Devanāgarī: its attested
      script is Tibetan, and no source enumerates it in Devanāgarī at all (the Vimalaprabhā discusses
      the cycle without listing the names). Producing one would be the back-transliteration this
      project already refuses for Janson's ASCII, on the ground that it manufactures authority the
      source does not have. So the three shipping options are **not** symmetric: the Indic list can
      carry script, transliteration and a sourced gloss; the other can carry script and
      transliteration only. Decide what `meaning` is *for* before deciding which list `sanskrit` is

**Review passes**

Four full-repository reviews, deliberately ordered: the surface is settled before the code is
reviewed against it, the code is settled before it is attacked, and the adversarial pass runs last
so it sees the final state rather than a moving one. The flags recorded here are the ones to use;
where a command is **diff-shaped** that is noted, because running it on a clean `main` reviews
nothing and reports success.

- [ ] **Full API surface review.** Subject: every name in `src/index.ts`, judged against
      [decisions/2026-08-12-public-surface.md](decisions/2026-08-12-public-surface.md) and its
      2026-08-15 rescoping — the wrong-or-impossible test for computation internals and contested
      conventions, the "does a calendar library normally provide it, and does it have one obvious
      correct semantics" test for thin compositions. Check the type shapes too, not only the
      function list: this is where the `RabjungName` item above gets settled, and the last item that
      belongs on the pre-1.0.0 surface is the one nobody thought to look for.
      **Command:** `/code-review max src/index.ts` for the barrel, then
      `/sc:sc-analyze src --focus architecture --depth deep` for the shapes behind it.
      `test/public-api.test.ts` pins the list, so any change it prompts fails there first — which is
      the intended signal, not a nuisance
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

- **The 60 rabjung cycle names — SHIPPED.** `rabjung.name` carries a `RabjungName` at every
  position: the Tibetan tradition's name, plus the Indic saṃvatsara list's name in `sanskrit`, whose
  `meaning` is sourced from Monier-Williams (58 of 60 rows verbatim, 2 composed from his entries for
  a compound's parts) and null only where nothing in his dictionary renders the Tibetan name at all.
  `name` is a **required** field, decided against the completed, fully-sourced table.

  Additive, so not a breaking change. See
  [architecture.md](architecture.md#why-rabjungname-carries-both-traditions-and-what-it-does-not-promise)
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
  `src/observances/default-gelug.ts` should say so rather than leaving it open.

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

- **A signal when observances go to the leap twin.** `GELUG` sets `leapMonth: "leap"`, so in a leap
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
  `weekdayNameFor`, `elementNameFor`, `genderNameFor` and `animalNameFor` are exported. Each name is
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
