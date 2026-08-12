# Roadmap

## Implementation Phases

| Phase | Scope | Effort |
|-------|-------|--------|
| 0 | Scaffold (npm init, tsc, vitest, fast-check, biome, CI) — **done** | 2h |
| 1 | Core computation: Layers 0-3 (Janson §2-9) — **done** | 20h |
| 2 | Validation: FPMT fixtures, cross-check against reference implementations — **done** | 12h |
| 3 | Observances: config-driven rules, Gelug default config — **done** | 8h |
| 4 | TypeDoc + release workflow + publish v1.0.0 | 6h |

**Safe timeline: 3 weeks** (accounts for debugging edge cases in doubled/skipped day logic)

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
- [x] Revisit `engines: ">=22"` — resolved to `">=26"`, plus a runtime guard. The engine touches
      Temporal at module evaluation (`conversion.ts` builds its Unix-epoch anchor there), so a
      Node 22 consumer whose install npm had blessed got `ReferenceError: Temporal is not defined`
      on `import`, naming neither Temporal nor the polyfill that fixes it. `">=26"` tells the
      truth and npm treats it as a warning rather than a block, so polyfill consumers are not
      locked out; the guard turns the remaining failure into an actionable message. CI tests one
      Node version, so neither would have surfaced in-repo
- [ ] Decide whether to add a `main` field. `exports` supersedes it on modern toolchains;
      it is only insurance for older bundlers
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

- [ ] **Decide whether month enumeration becomes public.** `monthsInYear`, `leapMonthOfYear` and
      `isLeapYear` are internal, so an app rendering a Tibetan month grid cannot ask "which months
      does this year have". Phase 3's surface review kept them internal on negative evidence — the
      observance engine never asked — and because the workaround is correct if clumsy: walk from
      `losarFor(y)` to `losarFor(y + 1)` collecting distinct `monthCode`s, O(365) rather than O(1).
      Adding them later is non-breaking, which is what makes deferring legitimate; **Nyamlen is
      likely to be the consumer that settles it.** See
      [decisions/2026-08-12-public-surface.md](decisions/2026-08-12-public-surface.md).

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
  Deferred because it is a sourcing problem rather than a coding one: Janson's ASCII list
  collides three distinct Sanskrit names onto `pramadi`, the Hindu saṃvatsara list diverges from
  the Tibetan one in content, and no source has been found giving all 60 in Tibetan script with
  Lhasa phonetics. See
  [architecture.md](architecture.md#why-the-60-rabjung-names-are-not-included).

  **All 60 are now tabulated side by side in [rabjung-names.md](rabjung-names.md)** — Wylie,
  Tibetan script, Lhasa phonetics, IAST, Devanāgarī, Janson's Sanskrit and an English gloss, with
  the provenance and standing of each column stated. Read that before deciding; the columns are
  not of equal weight, and three of the seven are unverified.

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

- **Tsurphu tradition** (Karma Kagyu) via a second `TraditionConfig` — the algorithm already
  supports it; only the constants differ.
