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
| 0.0.1 | Published placeholder — reserves the npm name, exports nothing |
| 1.0.0 | Target: full Phugpa implementation, published from CI with npm provenance |

The repository stays private under the `nyamlen` org until v1.0.0, then goes public.

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

**Package**

- [x] Remove the `STATUS` export from `index.js` — done in Phase 0; `index.js` is gone entirely,
      replaced by `src/index.ts` compiled to `dist/`
- [ ] Remove the placeholder banner from `README.md`
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
      and this checkbox — none of which ship to npm. `README.md` is the only documentation in
      `package.json#files`, and it now carries all of it under "Requirements"
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
      `scripts/check-conventions.mjs` gates seven rules nothing previously checked, Biome bans the
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

- **The 60 rabjung cycle names**, landing at `rabjung.name` — additive, so not a breaking change.
  Deferred as a sourcing problem rather than a coding one. See
  [architecture.md](architecture.md#why-the-60-rabjung-names-are-not-included).

  **Two of the three stated blockers fell on 2026-08-16, and the entry should be re-argued rather
  than re-deferred.** The naming work proved out machinery that did not exist when this was written:

  - *"No source gives all 60 in Tibetan script"* — two independent EWTS implementations (`jsewts`
    and `tibetan-ewts-converter`) agree on all 27 vocabulary terms and round-trip every one back to
    its Wylie, and THL's converter supplies THL Simplified phonetics for any Wylie. Both are wired
    into `scripts/verify-name-sources.mjs` already. The script column is no longer a search for a
    source; it is a run of that harness over 60 more rows.
  - *"Janson's ASCII collides three names onto `pramadi`"* — an artefact of using **his** Sanskrit.
    The Indic IAST already tabulated in [rabjung-names.md](rabjung-names.md) is collision-free.

  The **content divergence** was long recorded as rows 20, 29, 52 and 60, where the Tibetan and Indic
  lists were said to carry different names rather than different spellings. **Re-derived on
  2026-08-21, that set is wrong in three of its four entries**, and the corrected table with its
  evidence lives in [rabjung-names.md](rabjung-names.md):

  - **60 dissolved.** It was the clearest case — `zad pa`, exhaustion, against *Akshaya*,
    imperishable — and the correction of the saṃvatsara table's अक्षय to क्षय removed it. Both are
    kṣaya. Janson, Sewell and the Tibetan all agreed against the Indic cell, which was simply wrong.
  - **20 reclassified.** Janson's `aksaya` matches the *first* alternative of the compound cell
    अव्यय/व्यय, which is also the reading `mi zad` takes. That is a within-cell selection question,
    not two traditions naming different things.
  - **29 and 52 confirmed**, and they are the whole of it: *mada* against मन्मथ, and *kāla-dūtī*
    against कालयुक्त. The Tibetan sides with Janson at both.
  - **39 is a new candidate nobody had considered** — *visvabandhu* against विश्वावसु, where `dbyig`
    (wealth) sides with the *Indic*, suggesting Janson's ASCII is corrupt rather than divergent.
    Recorded as open.

  The proposal was to stop choosing between them: make `rabjung.name` carry **both**, each
  attributed, so the divergence becomes recorded data rather than a blocker. That remains the plan,
  now against two confirmed rows rather than four.

  **The evidence for this nearly went missing, and how is the lesson.** Janson's ASCII Sanskrit is
  the only mechanical detector of the divergence, and dropping it from the shipped table also dropped
  it from the document, leaving the four-row claim alive here with no way to re-derive it — for long
  enough that its position-60 half became false without anything noticing. It is now extracted by the
  generator for the divergence table alone, and never written to the fixture or to `src/`.

  **That premise was checked on 2026-08-21 and it fails.** Sewell & Fleet, *The Siddhāntas and the
  Indian Calendar* (1924), prints the sixty saṃvatsaras as **bare names against numeric columns** —
  Kaliyuga years and fractional day-counts — in its tables of the sixty-saṃvatsara cycle of Jupiter.
  There is no meaning column, and no gloss vocabulary anywhere near the names; every occurrence of
  "translation" in the book refers to translations of Siddhānta texts. That fits what the work is:
  a book about *computing* which saṃvatsara a year falls in, not about what the names mean. Rao
  (2000) is in copyright and was not reachable, but it is cited for the same list in the same
  literature, so the premise is treated as answered rather than half-open.

  **That conclusion — "English for the Sanskrit names is not sourceable" — was overturned on
  2026-08-21.** It was true of Sewell and of Rao, which is what had been checked; it was never true
  of the lexicographers. Monier-Williams glosses every one of the sixty headwords, and the Cologne
  scan serves them with a printed page citation. The rabjung table now carries 764 sourced senses
  across the sixty rows.

  What remains is not "find the source" but the narrower editorial question, and it now has an
  answer with a machine-checked shape: **which** of many senses is the name's meaning is authored,
  because no source makes that choice, but the choice can only ever be a verbatim span of a sourced
  sense, pinned to its record ID and limited to two gloss units. So `meaning` ships as an authored
  selection from sourced candidates, labelled as such — not as free text, and not omitted.

  One thing the check turned up for free: Sewell gives **Vyaya at 20 and Parābhava at 40**,
  corroborating the Indic side of the divergence rows from a source outside the Wikipedia
  saṃvatsara table that [rabjung-names.md](rabjung-names.md) draws on.

  **A search for an independent Tibetan-language witness, 2026-08-21. Recorded so it is not
  repeated.** Everything in the table descends from Henning's Appendix I through Janson, so a second
  lineage would have to be Tibetan-language and not calendrical software. Three leads, no witness:

  - **Rangjung Yeshe Wiki** (`rywiki.tsadra.org`) — **unavailable, and this is settled rather than
    untested.** It sits behind a Cloudflare interstitial that returns 403 to any programmatic
    request, with a declared User-Agent or a browser one alike. An earlier note calling it
    "machine-fetchable" was wrong. Do not try to work around the challenge; it is a deliberate
    access decision by the site.
  - **BDRC** (`ldspdi.bdrc.io`) — **a live lead, unrealised.** It exposes a full-text search over
    open-access Unicode Tibetan etexts, filtered in the query itself to `AccessOpen` and
    `StatusReleased`. `Etexts_count` works; **ten chunks contain both དུས་ཀྱི་ཕོ་ཉ (52) and
    ཁྲག་སྐྱུག (57)**, two names distinctive enough that co-occurrence implies a list of the sixty. So
    a machine-readable Tibetan witness very likely exists. What blocked it was retrieval, not
    access: `Etexts_chunks` returned its parameter metadata and no result rows for any pagination
    spelling tried. **The concrete next step is that one API call**, not another search.
  - **THL** (`thlib.org`) — not reached inside the time box. Its calendar converter renders script
    as images, and its calendrical lineage is unstated, so it may fail the not-downstream-of-Henning
    test anyway. Its Tibetan-language reference collections are the part worth trying.

  **BDRC chunk counts were considered as an attestation check and rejected, on a negative control.**
  They tempt, because they work on the multi-word names — `དུས་ཀྱི་ཕོ་ཉ` scores 232,
  `སྣ་ཚོགས་དབྱིག` 68 — where an exact-title Wiktionary lookup cannot. But **སྤེན་མ scores 108**,
  and that is the Saturday form this project *rejected* in the naming work on lexical grounds. A
  corpus count measures string occurrence, not lexical existence: a string can appear inside a longer
  construction, as a variant, or as a name. Adopting it as a gate would have quietly replaced the
  standard with one that passes the exact form the repo threw out. A nonsense Tibetan string scores
  0, so the check does discriminate — it just does not discriminate for the property that matters.

  **Ten rows carry no selected Sanskrit meaning, and four of them could.** Checked against Cologne on
  2026-08-22 and recorded rather than applied, because two of the four need new generator behaviour
  rather than a data record:

  - **50** `me`, fire — the compound cell offers नल/अनल and the lookup takes the first that resolves,
    which is नल, "a species of reed". अनल is "fire", which is what the Tibetan says. A correction.
  - **58** `mig dmar`, red-eyed — रक्ताक्षि is a stub in MW ("m., Cat."), while रक्ताक्ष reads
    "red-eyed, having red or blood-shot eyes". A correction, and one the IAST check cannot find,
    because both columns agree on the wrong form — the shared-error case that only attestation sees.
  - **36** `dge byed` — MW writes only "= -कर", so following **his own explicit cross-reference** to
    शुभकर gives "causing welfare, auspicious". Needs a cross-reference-following step.
  - **57** `khrag skyug` — the single sense reads "'emitting b˚'", where `˚` stands for the headword's
    first element. Expanding it gives "emitting blood". Needs abbreviation expansion, which is a small
    act of interpretation and should be argued before it is built.

  **6 was wrongly written off here as "a proper name has no meaning", and it is selectable today.**
  Monier-Williams glosses आङ्गिरस as "**descended from** or belonging or referring to the Aṅgirases" —
  a patronymic does have a meaning, and that is it. It needs no new mechanism, only a selection.
  **Pending a decision** rather than applied.

  Of the rest: **13** is a real semantic mismatch between the traditions and is itself a finding;
  **22**, **31** and **53** carry only "N. of the Nth year of Jupiter's cycle", which would restate
  the position column rather than say what the name means — the gloss a reader wants for those three
  ("All-holding", "Hanging gold", "Aim accomplished") is already in the authored English-of-the-Tibetan
  column, because composing it from the compound's parts is analysis rather than sourcing. **38** is
  two problems at once: the query resolves to क्रोध's page, where क्रोधी appears only as the name of a
  musical *śruti*, and the stem क्रोधिन् reads "mfn. **id.**" — MW's *idem*, a pointer with no text.
  Taking क्रोध's "anger, wrath" would attribute a noun's gloss to an adjective, which is the homograph
  error that put "you both" on position 9.

  **One display defect, found in the 2026-08-22 sweep and not yet fixed.** The table shows each row's
  first *substantive* sense, skipping Monier-Williams' bare cross-references — but the filter matches
  only "See under" and "See col.", not "See √". So position 60, the table's flagship correction, shows
  `क्षय See √ 1. 2. and 4. क्षि` where it should show "destruction, decay". Widening the pattern is a
  one-line change in `senseCell`; it is recorded rather than applied because changing the generator
  without regenerating would leave the two disagreeing.

  **Behind 50 and 38 sits one weakness worth fixing first.** The lookup ladder accepts the first form
  that returns *any* entry, rather than one whose entry actually glosses the word — which is how 50
  landed on the reed and 38 landed on क्रोध's page via क्रोधी. Preferring a form that yields a usable
  sense would fix both without a single authored correction.

  **All 60 are now tabulated side by side in [rabjung-names.md](rabjung-names.md)** — Wylie, Tibetan
  script, THL phonetics, Devanāgarī, a derived IAST, an authored English gloss of the Tibetan, and
  the Monier-Williams senses with an authored selection from them. Read that before deciding. Every
  column states its provenance, and each **row** now states its own evidence tier — which rung of the
  lookup ladder reached its entry, whether a non-MW lexicon corroborates it, and whether Wiktionary
  or the Bṛhat Saṃhitā confirms its position — because one standing claimed for all sixty was
  exactly what let three artefacts of a truncated fetch be written up as findings.

  **Sourcing re-checked 2026-08-12.** Four findings, none of which unblocks this on its own:

  - **Janson's 60-year-cycle name table already carries a Tibetan (Wylie) column and a Sanskrit
    column, and
    `extract-janson-fixtures.mjs` discards both** — its row regex swallows them in a `.*&`.
    Capturing them is a one-regex change needing no new source and raising no clean-room
    question, since a name list is a fact like the dates.
  - **The Wylie column is a usable key; Janson's Sanskrit is not.** Verified against the source:
    60 rows, 60 distinct Wylie names, no duplicates — while `pramadi` covers `rab myos` (4),
    `myos ldan` (13) and `bag med` (47). Any keying or round-tripping must go through the
    Tibetan, not the Sanskrit.
  - **Devanāgarī and IAST exist for the *Indian* list**, complete for all 60 (Wikipedia's
    saṃvatsara table carries IAST plus Devanāgarī, Tamil, Telugu and Kannada). This does not
    dissolve the divergence above — it is the Indic canonical form, so `śukla`, `pramoda`,
    `āṅgirasa`, `bahudhānya` against Janson's `suklata`, `pramadi`, `ankira`, `vahudhvanya`.
    Choosing it means shipping names a Tibetan almanac does not print; choosing Janson's means
    bare ASCII with no Devanāgarī and spellings he himself flags as varying by source.
  - **The authority is Henning, *Kālacakra and the Tibetan Calendar*, Appendix I: The Sixty-Year
    Cycles** — the source Janson cites for that table. A Columbia UP book, so not fetchable and not
    generatable; consulting it is the way to settle the Tibetan-script and phonetics gap.

  **On English names, which were asked about directly:** no source found gives them, including
  Janson, the saṃvatsara tables and the Tibetan references. But the Tibetan names are mostly
  *semantic translations* rather than transliterations, so they encode the meaning already —
  `dkar po` = "white" for *śukla*, `'bru mang po` = "much grain" for *bahudhānya*, `dpal gdong`
  = "glorious face" for *śrīmukha*, `skyes bdag` = "lord of beings" for *prajāpati*. A few are
  transliterations of proper names instead (`aṃ gi ra` for *aṅgiras*) and have no meaning to
  give. So English is derivable from the Tibetan by translation — which is editorial work, not
  extraction, and would be the first fixture content this project authored rather than sourced.

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

  Provenance is machine-checked rather than trusted — [name-sources.md](name-sources.md). Janson
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

- **iCalendar (ICS) export — declined.** `getObservances` returns plain objects; a consumer maps
  them to whatever format they need. Per
  [decisions/2026-08-12-public-surface.md](decisions/2026-08-12-public-surface.md), a name is
  exposed when the consumer-side workaround is wrong or impossible, and stays internal when it
  merely costs a loop — an ICS export is a loop, not a wrong-or-impossible workaround, and it would
  mean owning RFC 5545 escaping, `VTIMEZONE` and folding, none of which is calendrical. An
  `@nyamlen/icalendar` package remains open if one is requested.
