# Roadmap

## Implementation Phases

| Phase | Scope | Effort |
|-------|-------|--------|
| 0 | Scaffold (npm init, tsc, vitest, fast-check, biome, CI) — **done** | 2h |
| 1 | Core computation: Layers 0-3 (Janson §2-9) — **done** | 20h |
| 2 | Validation: FPMT fixtures, cross-check against reference implementations — **done** | 12h |
| 3 | Observances: config-driven rules, an example config — **done**; rebuilt in November 2026, see the checklist | 8h |
| 4 | TypeDoc + release workflow + publish v1.0.0 (docblock audit split out — see Phase 4a) | 6h |
| 4a | Code review: 629 docblocks (counted 2026-11-16) verified against behaviour, plus convention and derivation conformance across all of `src/` — **done** (code review merged 2026-11-16, docblock audit 2026-11-17); see the [Pre-v1.0.0 checklist](#pre-v100-checklist) | 14h |

**Safe timeline: 3 weeks** (accounts for debugging edge cases in doubled/skipped day logic —
predates Phase 4a's addition below and has not been revisited against its extra 10h)

The layers referenced in Phase 1 are defined in [architecture.md](architecture.md); the
validation sources in Phase 2 are listed in [testing.md](testing.md).

**Phase 0 outcome.** Re-reading the package structure before scaffolding was worth it — it
turned up two stale entries. tsup was dropped for plain `tsc`, and TypeScript 7 replaced
TypeScript 5.x because it is the first release to ship `lib.esnext.temporal.d.ts`, which lets
the package expose `Temporal` in its public types with no dependency. Both recorded in
[decisions/2026-08-11-build-tooling.md](../decisions/2026-08-11-build-tooling.md).

**Decided at the start of Phase 1, answered in Phase 3.** The dropped Temporal calendar adapter
gets no replacement: there is no Temporal-shaped `TibetanDate` class. The question was deferred so
a real consumer could settle it, and the observance engine settled it by walking months with
`trueMonthCount` and needing no date arithmetic at all. See
[decisions/2026-08-12-no-tibetan-date-class.md](../decisions/2026-08-12-no-tibetan-date-class.md).

**Also settled before Phase 1 began:** `year` is the royal-era numbering
([decisions/2026-08-11-year-numbering.md](../decisions/2026-08-11-year-numbering.md)); `isSkippedDay`
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
against the almanac, day by day — see
[testing.md](testing.md#what-that-does-and-does-not-cover) for the window and what it does and does
not establish. Four things came out differently from the plan:

- **The `a₂` fork was settled from the paper, not from a purchased almanac.** Janson states that
  calendars use `1/28` "for example in the almanac", and his bibliography resolves that to the
  Men-Tsee-Khang *Tibetan Annual Almanac 2013* — he had already done the check. The default was
  already `1/28` and did not change, but it is now evidenced.
  [decisions/2026-08-12-lunar-anomaly-a2-default.md](../decisions/2026-08-12-lunar-anomaly-a2-default.md).
- **The validation sources do not straddle the fork.** `docs/development/testing.md` claimed Lotsawa House
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
| 1.0.0 | Target: full Phugpa implementation, published from CI with npm provenance. **Publishes once the `docs/` restructure is done**; see below |

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

### 1.0.0 publishes once the `docs/` restructure is done

**Decided 2026-11-22 (Andreas): the client gate is closed, and 1.0.0 publishes as soon as the `docs/` restructure is done.**

The gate required a consumer outside this repository to exercise the public API before the freeze.
It existed because every suite here imports from `src/`, so none meets the package the way a consumer does, and only code that has to make decisions shows whether the API's shape is right.
Four blind clients ran against packed tarballs, working from the tarball's README and `.d.ts` files alone:

| Client | Ran | Answered in |
|--------|-----|-------------|
| Smoke client | 2026-08-22 | Six documentation fixes, 2026-08-23; no API change |
| Second client | 2026-08-25 | `90a38ee`, `864f88e`, `6ae4b7e`, `6e5f30d`, `6c5be94` (26 August), `aef049f`, `b47c853` (27 August) |
| Spike 3 | 2026-08-27 | Closed the API surface review; the six names added the day before drew no friction |
| Browser client: polyfill probe | 2026-09-23, against `5c954b3`, re-run against `48cf255` | `012468a`..`48cf255`, `d719dba`..`44c222b`; see `docs/development/testing.md`, *Under a polyfill* |
| Browser client: navigator | 2026-11-17, against `61847df` | `8ebf6ea`, `2f9aa85`, `c361f33`, `2ccf9da`, `8bd0356`, `7b8f7fc`, `0d60ef5`, `46938af`, `1d24a74` |

A verdict pass on 2026-09-22 answered the remaining rows against a packed tarball and fixed the three claims still live in `fcfb4cd` and `409fc09`.
Every finding carries a verdict, and each commit above names in its body the findings it answers; the friction lists and the verdict ledger are kept privately, as provenance rather than citations.
The navigator produced one API change: the `conventions` key on `ObservanceLayer`.

**The navigator is accepted as sufficient although `src/` changed after it.**
The adversarial-review and maintainability fixes changed 38 files of `src/` after `61847df`.
They changed no computed date, the maintainability fixes changed nothing on the public surface, and the adversarial fixes made three behaviour changes that raise no error (a returned `TibetanDate` is frozen, a `PlainDateTime` or `ZonedDateTime` subclass is read from its slots, and six-season month names list `part` second).
No further blind build runs before 1.0.0.
Surfaces no client reached are frozen on lighter evidence, and that is a choice rather than an oversight.

**After 1.0.0, the next client is the `nyamlen` website**, built against the published package.
Its findings land as later releases: a fix or an addition as a 1.x, and an API change that breaks a consumer only in a major version.

**Pending rows in the verdict ledger:** the README banner and the package description change in the release commit (the item *Remove the placeholder banner from `README.md`*), and one row in the private client repository's own instructions is due before its next blind run.

**Writing a brief for a blind client: a coverage list destroys discoverability testing for everything on it.**
Naming the exports a client must reach stops a thin run declaring success after touching eight, but you then cannot learn whether a consumer *finds* a name, because you handed it over.
The first client's sharpest finding was a discoverability failure: it hand-rolled the month walk and never called `datesFor`, which the README calls its preferred route.
So specify **tasks, not function names**; require the coverage report to be measured against the tarball's own `.d.ts`, which the client can enumerate itself; and **never say which names are new**.
Non-use then reads as a finding about the surface rather than a gap in the brief.

## Outstanding — near term

- [x] **`TibetanDate` shape confirmed** before writing `src/types.ts` — done 2026-08-11. Date
      components stay flat, mirroring `Temporal.PlainDate`; naming systems group under a `*Name`
      field. `rabjung` was split out of `yearName` because the Indian cycle is a numbering and the
      Chinese cycle is a name. See
      [architecture.md](architecture.md#why-rabjung-is-separate-from-yearname).

Setup work, all done. The two app-launch items (the `www` CNAME and the extra domains) are under "Does not gate a release" in the checklist below.

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
- [x] **Development-tool vulnerabilities.** `npm audit` reported 14 on 2026-10-16, all in
      development tools, none in the published package (`npm audit --omit=dev` finds 0). Cleared
      2026-11-14 by `npm audit fix`, Vitest 4.1.12 and `markdownlint-cli2` 0.24.1.
      **4 low remain, all one KaTeX advisory** (GHSA-238p-pmpm-9mq7) via `markdownlint` →
      `micromark-extension-math@3.1.0` → `katex@0.16.47`. Only an `overrides` entry forcing an
      undeclared KaTeX major would clear it, and `npm audit fix --force` proposes downgrading
      `markdownlint-cli2` instead. **Residual accepted by Andreas, 2026-11-14:** low severity,
      development-only, reachable only if KaTeX renders hostile input, where markdownlint parses
      this repository's own docs. Revisit when `micromark-extension-math` widens its `katex` range.

## Pre-v1.0.0 checklist

Decisions deliberately deferred during setup, each with the reason it was deferred.
Work through this before publishing v1.0.0; several are one-way doors once published.

Ticked items are one line each.
Their full text as it stood before the cleanup of 2026-11-22 is `git show 7e72472:docs/roadmap.md`; what a decision still constrains lives in [decisions/](../decisions/).

### The pre-release gate

Seven passes were set for 1.0.0, and all seven are done.
**Ruled by Andreas on 2026-11-22: the passes as run are sufficient.** No further review runs, the docblock audit is accepted as it stands, and the navigator is accepted as the client build.
That holds although `src/` changed after the docblock audit (`2d0dbbf`) and the navigator's tarball (`61847df`): 38 files and about 1,500 lines, the adversarial and maintainability fixes.

| # | Pass | State | What is left |
|---|------|-------|--------------|
| 1 | Source code review | **Done** 2026-11-15 to 2026-11-16 at `34b8ab4`; fixes merged `51c7c03` | None |
| 2 | Security review | **Done**: first pass 2026-11-15; second pass 2026-11-22 over `34b8ab4..55b8e70` | None: no further review (Andreas, 2026-11-22) |
| 3 | Ultrareview | **Ran once** (the free one), over `pre-1.0-review-fixes`, 2026-11-16; six findings fixed | None: no further review (Andreas, 2026-11-22) |
| 4 | Docblock audit | **Done** 2026-11-17 (`2d0dbbf`) | None: accepted as it stands (Andreas, 2026-11-22), although about 480 docblock lines in `src/` changed since |
| 5 | Client build from a fresh tarball | **Done**: the navigator, 2026-11-17, against `61847df` | None: accepted as sufficient (Andreas, 2026-11-22); see Release Status |
| 6 | Adversarial review | **Done** 2026-11-18 to 2026-11-19; merged `5bd5d1e`; maintainability pass merged `e79731e` | None |
| 7 | `docs/` restructure | **Done** 2026-11-22; merged `0b5e062` | None |

The release is next.

### Open, grouped by what it blocks

**Blocks the release**

- [x] **Analyse `docs/` for a folder structure, and do it before 1.0.0 fixes the links.** Done
      2026-11-22: consumer documents stay at the top of `docs/`, contributor documents moved to
      `docs/development/` and provenance to `docs/sources/`, indexed in [docs/README.md](../README.md).
      Nothing that ships moved. `check:links` now also resolves this repository's absolute
      `blob/main` URLs, which every published tarball freezes

- [ ] Remove the placeholder banner from `README.md`, **in the same release that publishes 1.0.0**,
      not as tidy-up beforehand. This is a file edit with a publishing precondition: npmjs.com serves
      the README from the tarball of whichever version holds the `latest` dist-tag, so editing the
      file alone changes nothing a consumer sees. Until that publish the banner is *accurate* — the
      published version really does export nothing — so removing it early would make the repository
      state the false half of the pair. The `description` in `package.json`, which still reads
      "Pre-release placeholder — implementation in development", changes in the same commit, and so
      does the sentence in [other-implementations.md](../other-implementations.md) calling this package
      "at the time of writing, unreleased".
      That commit discharges the navigator's friction 2, two rows of the private verdict ledger,
      which Andreas ruled on 2026-11-18 land here rather than earlier

- [x] Make the repository **public** — **before the first 1.0.0 publish**, since npm generates
      provenance automatically only for a public repository and package. Done 2026-11-22 by Andreas,
      with private vulnerability reporting switched on and Issues left on, so `package.json#bugs` resolves

- [x] **Add a `SECURITY.md`** (Andreas, 2026-11-22) saying that vulnerabilities are reported through
      GitHub's private vulnerability reporting, which is switched on, and which versions receive fixes.
      Done 2026-11-22: fixes go to the latest release only; a wrong date is an issue, not a vulnerability

- [ ] **Keep a `CHANGELOG.md` from 1.0.0.** Andreas, 2026-11-21: the first entry is 1.0.0 itself, and
      nothing that changed before it is recorded, because no released version behaved otherwise. From
      1.0.0 on, an entry for every release states each change a consumer can see, with a behaviour
      change that raises no error flagged as such. Decide where it ships (`package.json#files`) and
      whether `check-pack` asserts it, in the same commit that adds it.

**Release machinery** — all of it needs the repository public first

- [ ] Publish from **GitHub Actions with npm provenance**, not locally — provenance ties each
      released version to the commit that built it, which reinforces the clean-room record

- [ ] **Configure npm trusted publishing** for this package on npmjs.com, naming this repository,
      `release.yml` and the environment `npm`; npm does not check the entry when it is saved, and
      an entry expires unless its first publish succeeds within two days, so create it just before tagging. It publishes over OIDC with **no stored token**, and generates provenance
      automatically — but only for a **public** repository and package, so the repository goes
      public before the first publish (see Repository below). It needs npm ≥ 11.5.1 and Node ≥ 22.14.
      Decided 2026-11-15, replacing a stored granular token: the security review found that item
      contradicted itself (a token scoped to one package cannot serve sibling packages, and an
      org-level secret exposes a write credential to every repository), and npm now caps write
      tokens at 90 days and has revoked classic tokens. Verified against
      [npm's trusted-publishers page](https://docs.npmjs.com/trusted-publishers) and GitHub's
      changelogs of [2025-11-05](https://github.blog/changelog/2025-11-05-npm-security-update-classic-token-creation-disabled-and-granular-token-changes/)
      and [2025-12-09](https://github.blog/changelog/2025-12-09-npm-classic-tokens-revoked-session-based-auth-and-cli-token-management-now-available/)

- [ ] `.github/workflows/release.yml` publishing on tag through trusted publishing, with
      `permissions: id-token: write` and no token; set up `actions/setup-node` as the workflow
      example on npm's trusted-publishers page does. Three safeguards from the security review:
      **pin every action by commit SHA**, with the tag in a trailing comment; **no `cache: npm`** in
      the job that publishes; and a **protected environment or protected tags**, because with trusted
      publishing anyone who can push a release tag can publish.
      Written 2026-11-22: it runs `ci.yml` on the tagged commit, refuses a tag that does not match
      `package.json#version` or a commit not on `main`, and publishes from the environment `npm`.
      **Open until that environment exists** (Settings → Environments → `npm`: Andreas as required
      reviewer, deployment tags `v*` only) and the trusted-publisher entry names it. The procedure is
      in CONTRIBUTING.md, "Releasing"

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

**After 1.0.0 ships**

- [ ] **After the first trusted publish**, set the package's publishing access to "Require
      two-factor authentication and disallow tokens", which npm's page strongly recommends; trusted
      publishing keeps working, since it does not use a token

- [ ] **After 1.0.0 ships**, `npm deprecate tibetan-calendar-temporal@0.0.1 "placeholder; use
      1.0.0"`. One command, and it puts a warning in front of anyone who pinned the placeholder.
      Pointless before there is a version to point them at, which is why it is sequenced here
      rather than with the other publishing setup

- [ ] **On the 1.0.0 render, confirm npm rewrites the README's relative links** against
      `repository`. If it does not, the `docs/` links in the README need absolute URLs — the two
      shipped documents are unaffected either way, since they are in the tarball

**GitHub settings**

- [ ] Set **repository topics** to match `package.json#keywords` — `tibetan`, `calendar`,
      `temporal`, `phugpa`, `buddhist`, `lunisolar`, `losar`, `bhutanese`, `dzongkha`, `mongolian`,
      `tsagaan-sar`, `tsurphu`, `kalacakra`, `rabjung`. Topics drive GitHub search and the topic
      pages, a discovery channel entirely separate from npm, and cost one settings change. The
      keyword list carries the Bhutanese and Mongolian scope that the package *name* deliberately
      does not — see
      [2026-08-16-package-name-and-tradition-scope.md](../decisions/2026-08-16-package-name-and-tradition-scope.md)

- [x] A **branch ruleset** on `main` (Settings → Rules → Rulesets): *Restrict deletions* and *Block
      force pushes*, no bypass. Created by Andreas, 2026-11-22. Force-push protection matters here specifically — the commit history
      is the clean-room evidence of independent derivation, and a rewrite would undermine it. Leave
      *Require linear history* off (branches merge with `--no-ff`) and *Require signed commits* off

- [ ] **Require the three `verify` checks on `main`** in that ruleset — `verify (ubuntu-latest)`,
      `verify (windows-latest)`, `verify (macos-latest)` — **when the first outside pull request
      arrives, or when work moves to pull requests**, with the maintainer on the bypass list
      (Andreas, 2026-11-22). Not before: a required check rejects a direct push to `main`, so it
      forces every change through a pull request, which protects nothing while one person pushes

- [x] A **tag ruleset** for `v*` before the first release tag: *Restrict updates*, *Restrict
      deletions* and *Block force pushes*, no bypass; *Restrict creations* off, or no release tag
      can be pushed. Created by Andreas, 2026-11-22. npm never republishes a version, and provenance records the commit that
      built it, so a moved or recreated release tag would contradict the published record (and could
      re-run the release workflow). A mistaken tag is then fixed only by disabling the ruleset, so
      the release procedure tags the commit being published and checks it before pushing

- [ ] Convert the remaining items here into GitHub issues under a v1.0.0 milestone. A checklist
      in a file is fine for a solo private repo; once there are contributors, issues are better

> Rulesets and draft pull requests are unavailable on GitHub Free for **private** org repos; the
> repository went public on 2026-11-22, so all of them are available now.

**Does not gate a release**

- [ ] **Establish Zurkhai's calculation lineage, or record that it cannot be established.** Its
      public pages state "the Phugpa school" and name no scholar, almanac edition or repository, so
      there is no way to tell whether it descends from Henning — which is why it sits in
      [almanac-sources.md](../sources/almanac-sources.md) as a comparison target rather than in
      [validation-sources.md](../sources/validation-sources.md) as a cross-check. Its December 2026 dates agree
      with ours where checked, including a skipped 15th, but agreement from inside a lineage already
      represented is not evidence. **A negative result is a result**: if the lineage cannot be
      established from public material, write that down in `validation-sources.md`'s tried-and-rejected
      list so the same source is not re-evaluated. Blocks any use of it as a fourth Phugpa cross-check.
      **A lead since 2026-09-24:** its App Store listing names the printed Buryat almanacs it was
      verified against — Yampilov-Galsanov's "Zurkhai-3" and Atsagatsky Datsan publications — which
      says what it was checked against, not how it computes, and a Buryat almanac may follow the
      Mongolian version Janson distinguishes from Phugpa. Details in
      [almanac-sources.md](../sources/almanac-sources.md)'s open questions.
      **A second lead, 2026-09-24:** the iOS app's list of Hurals puts four 2027 festivals in the
      months the **Mongolian** version numbers them, a month from Phugpa's, in a stretch where the two
      disagree; three other Hurals fit neither version. Evidence for New Genden against the site's
      own "Phugpa" label, not a settled lineage, and recorded in the same place

- [ ] **Sojong, what is not sourced — still open.** Four statements are what the repository records,
      and each is checked against
      [almanac-sources.md](../sources/almanac-sources.md#sojong-a-counted-schedule-once-falsified-by-a-misreading)
      and [fpmt-calendar.md](../sources/fpmt-calendar.md):
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
        - **The oral teaching** in [almanac-sources.md](../sources/almanac-sources.md) says 24 sojongs occur in a
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
        known, so both are excluded from the example ([observances.md](../observances.md)). What FPMT
        prints is measured under the observance-layer item above: Precepts is days 8, 15, 30 plus the
        Buddha days, 213 of 213 in 2022–2025, and Naga puja is a fixed month-and-day table with three
        irregular cells.
      - **How the fire-puja count treats a doubled or skipped day.** Lama Zopa Rinpoche's advice tells
        the reader to check, and does not explain ([observances.md](../observances.md)); a question for a
        Tibetan teacher or scholar. The example's `lunarDayPlusWeekdayMod4` formula agrees with FPMT's
        labels on most days and misses a few dozen, listed in
        `test/validation/fpmt-observances.test.ts`.
      - **Established Tibetan headings for the three levels**, if centres use any
        ([observances.md](../observances.md)).

### Done, by subject

**API shape**

- [x] **Year-level naming came off `TibetanDate`.** Done 2026-08-24, a breaking change taken
      before 1.0.0: `rabjungFor(date.year)` and `yearNameFor(date.year)` replace the fields, and
      a serialised year fell from 293,009 to 126,629 bytes.
      [decisions/2026-08-24-year-naming-off-the-date.md](../decisions/2026-08-24-year-naming-off-the-date.md)
- [x] **Make every shipped name follow the names-keyed-by-language rule.** Done: the 2026-09-14
      survey's items for `./astrology` landed 2026-09-15 (trigrams as Janson's English words,
      `tibetanNames` on every attribute block, `tibetanName` and `sanskritName` on `LunarMansion`),
      the month-names rulings 2026-09-17 and the `indianMonth` sibling 2026-09-18. The
      `./observances` items moved to the observance-layer decision. Rule:
      [decisions/2026-09-13-names-keyed-by-language.md](../decisions/2026-09-13-names-keyed-by-language.md);
      evidence: [names/mansion-and-trigram-sourcing.md](../names/mansion-and-trigram-sourcing.md) and
      [names/month-and-yoga-sourcing.md](../names/month-and-yoga-sourcing.md#the-indian-month-names).
- [x] **Join phonetics by word, surface-wide, through THL's word-separated mode.** Decided by
  Andreas 2026-11-11; **done 2026-11-15**, merged to `main` as `05077b9`. Every shipped
  multi-syllable `phonetic` is THL's "Words separated by" output, with longer names split by
  the boundaries Andreas ruled in `scripts/word-boundaries.data.json` and the 28 names meeting a
  nasal rule held in `scripts/nasal-rulings.data.json`. Eleven phonetics are Andreas' corrections
  of THL, carried as self-invalidating data beside THL's value. Rule and reasoning:
  [decisions/2026-11-15-phonetics-by-word.md](../decisions/2026-11-15-phonetics-by-word.md).
- [x] **Small findings parked by the pre-1.0.0 reviews — one list, each with a decision.**
  The code review (2026-11-15), the phonetics-by-word reviews (2026-11-15), the docblock audit
  (2026-11-17), the adversarial-review fixes branch (2026-11-21) and the maintainability-fixes
  branch (2026-11-22) each parked small findings; Andreas ruled on every one.
  **Every Fix entry is done** (merged as `1417e1b`, `eac11ed` and `e79731e`); the fix text and
  each fix's commit are in the pre-cleanup roadmap, `git show 7e72472:docs/roadmap.md`.
  A later review that parks a finding adds it here and unticks this item until it is decided
  and, if marked fix, done. Limits of throwaway plan tooling that never ships are not tracked.

  **Accepted** (Andreas, 2026-11-17 unless dated) — left as they are, with the reason:
  - Message text, not contract: range-refusal messages at the edge name a lunation as if it were
    the argument (`addMonthsToDate(-3049305) is outside…`) and the lunation-bound message says
    "this tradition's" without naming it; rule 18 names "a stray opener above it" as the cause
    even for a `//` line with no gutter.
  - No wrong date results: the `isoToTibetan` search evaluates `trueDate` a little past the exact
    range's end, where 3 of 7 values at the `PHUGPA_HENNING` boundary exceed 2⁵³.
  - Release-time generator guards, each fixture reviewed as a diff when regenerated:
    `fetch-fpmt-observances.mjs` never checks a fetched page is the month it asked for and
    accepts a caption implying two leap pairs (`6A-7B`); `fetch-steinert-fixtures.mjs` checks
    only the row count, not that dates are consecutive; `extract-janson-fixtures.mjs` does not
    check leap-column cells for shape or that the Losar years are contiguous;
    `fetch-eszthoff-fixtures.mjs` has no guard against being run from inside the repository.
  - From the phonetics-by-word reviews, none affecting a shipped name and each failing loudly:
    `harness.sh`'s `ONLY` refuses an unknown run name only after the batch has run; `replay.mjs`'s
    `record-column` mutant sits in `mayLeaveUnchanged`; `verify-month-and-yoga-names.mjs` passes
    the yoga `enumerated` set for every term; a `${p.id}: ${p.message}` failure can print an id
    twice; the `(?)` refusal lives in `scripts/thl.mjs` and again in the observance verifier; the
    `wylie:` regex in `test/word-boundaries.test.ts` also matches inside comments; the
    `CORRECTIONS` comment and id-existence loop are repeated in three verifiers;
    `test/nasal-rulings.test.ts` repeats THL's three nasal rule shapes.
  - From the docblock audit: rule 17 is a documented ratchet (it lets through a date after a stray
    backtick, in a fence outside `@example`, or split across a line wrap); rule 4 leaves a
    docblock's links unchecked when a `//` and then a second docblock follow it (already stated
    as a reach limit in the docblocks decision record); `yearStartsIn`'s rule "from 1 January to
    the day before Losar" is loose for a year whose Losar falls in December (the next paragraph
    states the case); a `//` in `src/observances/formulas.ts` repeats "39 of the 40 days", a
    figure owned by `docs/why-trust-these-dates.md` and asserted by the test it cites;
    `src/astrology/types.ts` cites Henning's Appendix I (index column from 0) beside his web list
    (Abhijit is the 23rd entry), consistent on a careful read; row X13 sits before X12 in
    `test/check-conventions.mutations.ts`.
- [x] **Composable/additive `ObservanceConfig`s — decide before 1.0.0, not after.** Done: a
      configuration differs from another by a layer, validated and frozen, with no silent drop of
      a convention field. The names in the original entry (`DEFAULT_OBSERVANCES`, `ObservanceKind`,
      `composeObservances({ from, omit, extra })`) are superseded:
      [decisions/2026-11-11-observance-model.md](../decisions/2026-11-11-observance-model.md).
- [x] **New subpath `./astrology`, computing Janson's Appendix E's calculations.** Placement,
      scope and naming decided 2026-09-03; built 2026-09-12. It is a subpath of this package, not
      a sibling package and not `nyamlen`, because the sole-source rule does not require a second
      package. Nine runtime names by 2026-09-18, including `lunarMansionFor` (exposed 2026-09-14)
      and the frozen `LUNAR_MANSIONS` table; the raw mansion tables stay internal. The mansion's
      agreement with FPMT and its unexplained residual are stated in
      [why-trust-these-dates.md](../why-trust-these-dates.md); every other
      attribute check is Janson against Janson — see `docs/development/testing.md`. Appendix D (planets) is out
      of scope, as Beyond v1 records. Account: [astrology.md](../astrology.md).

- [x] **Decide what `./astrology` does for Bhutan's month and lunar-day attributes.** Decided
      2026-09-12: refuse with `TCT_ATTRIBUTE_NOT_SOURCED` rather than fall back to Phugpa's list.
      [decisions/2026-09-12-absent-naming-members-refuse.md](../decisions/2026-09-12-absent-naming-members-refuse.md)

- [x] **Read Zurkhai's App Store metadata and complete its
      [other-implementations.md](../other-implementations.md) entry.** Done 2026-09-24, through
      Apple's lookup API: seller Nikolai Tsyrenov, first released 27 May 2026, version 1.5. The
      description names two printed Buryat almanacs, recorded as a lead under the open lineage
      item, not as its answer.

**Documentation**

- [x] **Split the README into a landing page and a guide.** Done 2026-08-23. The README carries the
      pitch, install line and one runnable example in its first 40 rendered lines; `docs/guide.md`
      takes the long-form material in three sections. Constraint recorded in
      [decisions/2026-08-23-readme-is-the-landing-page.md](../decisions/2026-08-23-readme-is-the-landing-page.md)
- [x] **`docs/why-trust-these-dates.md`** — the reader-facing account of what has been validated and
      over which years, written for a non-programmer. It is the only document besides
      [testing.md](testing.md) permitted to quote a validation window; everything else links to it
- [x] **Extend FPMT's calendars through 2026, once December 2026 is published.** Done
      2026-11-08: the generator reproduced the committed 2022–2025 fixture byte-for-byte, then
      added 365 rows for 2026. The mansion residual came back to 2 in 2026, and the Henning
      comparison over 2026 agrees on all 362 counted days. Windows:
      [testing.md](testing.md); FPMT: [fpmt-calendar.md](../sources/fpmt-calendar.md).
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
- [x] **Announce `./astrology` in the README, and decide whether `docs/astrology.md` ships.**
      Done 2026-09-12, with the subpath: the README gained a capability row, a usage section and an
      API section, asserted by `test/readme.test.ts`, and rule 13 was reshaped to three barrels.
      **Decided 2026-09-12: `docs/astrology.md` does not ship**; `docs/guide.md` carries the
      consumer account. Reversible: adding a file to `files` later is additive, but it must be
      rewritten in the consumer register with asserted examples, and its repo-only links made
      absolute, or `test:pack` fails.

**Package**

- [x] Remove the `STATUS` export from `index.js` — done in Phase 0; `index.js` is gone entirely,
      replaced by `src/index.ts` compiled to `dist/`
- [x] Revisit `engines: ">=22"` — resolved to `">=26"`, plus a runtime guard at import
      (`conversion.ts` touches `Temporal` at module evaluation). Both are kept; see CLAUDE.md's
      Environment section.
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
- [x] **Decided: the Julian-day helpers stay public** — done in Phase 3's surface review. In
      calendrical software the Julian day is the domain interchange representation, and the
      helpers are the extension point; the altitude complaint was a documentation problem, fixed
      by grouping them under "Interoperability" in the README.
      [decisions/2026-08-12-public-surface.md](../decisions/2026-08-12-public-surface.md)

- [x] **Export month enumeration** — done 2026-08-13, as five names: `monthsFor`, `daysInMonth`,
      `hasLeapMonth`, `leapMonthNumberFor` and `monthsInYear`.
      [decisions/2026-08-12-public-surface.md](../decisions/2026-08-12-public-surface.md)

- [x] **Add `parseTibetanDate`, the counterpart to `formatTibetanDate`** — done 2026-08-13. It
      returns `TibetanDateFields`, not a resolved date, and takes no config, because a
      well-formed string can name a skipped date. The grammar is strict: a parser can be loosened
      later but never tightened. `tryParseTibetanDate` was dropped for the same reason.

- [x] **Conventions are enforced rather than remembered** — done 2026-08-16:
      `scripts/check-conventions.mjs`, the Biome ban on `Date`, and markdownlint in CI. Every rule
      and its enforcement status is in [coding-standards.md](coding-standards.md);
      `assertInternal` is the single idiom for discharging a `noUncheckedIndexedAccess` widening.

- [x] **Audit and correct all 629 docblocks against actual behaviour.** Merged to `main` on
      2026-11-17 (`2d0dbbf`): every docblock in `src/` checked against the code, comments only,
      guarded since by `check:conventions` rules 17 and 18 and rule 4's `//` skip.
      [decisions/2026-11-15-docblocks-are-for-callers.md](../decisions/2026-11-15-docblocks-are-for-callers.md)

- [x] **Three refusal messages that misdescribe their own check** — found by the docblock
      audit and fixed in `61c4d80` (the `MANSION_ELEMENTS` assertion, the `meanDate` refusal, and
      `asPlainDate`'s subject).

- [x] **Decided: `name` is a required field on `Rabjung`**, free at `0.0.1` and breaking after
      1.0.0.
      [decisions/2026-08-21-rabjung-names-carry-both.md](../decisions/2026-08-21-rabjung-names-carry-both.md)
- [x] **The rabjung name shape — settled 2026-08-25: "neither list".** `Rabjung` carries the
      Tibetan name only, because the cycle has two Sanskrit lists that differ at 16, 17, 18, 20
      and 34, and any type pairing one of them with the Tibetan name misnames 8% of years.
      [decisions/2026-08-25-rabjung-ships-the-tibetan-name-only.md](../decisions/2026-08-25-rabjung-ships-the-tibetan-name-only.md)

**Review passes**

Four full-repository reviews, deliberately ordered: the surface is settled before the code is
reviewed against it, the code is settled before it is attacked, and the adversarial pass runs last
so it sees the final state rather than a moving one. The flags recorded here are the ones to use;
where a command is **diff-shaped** that is noted, because running it on a clean `main` reviews
nothing and reports success.

- [x] **Full API surface review** — closed 2026-08-27, when spike 3 ran uncontaminated against a
      tarball packed from the finished branch. The six names added on 2026-08-26 drew zero
      friction. [decisions/2026-08-12-public-surface.md](../decisions/2026-08-12-public-surface.md)
- [x] **Decide what belongs in this package's general observance layer versus what stays
      FPMT-specific.** Closed 2026-11-14 on the `observances-1.0` branch. The package ships
      `EXAMPLE_OBSERVANCES` (nineteen rules under three levels the config declares, `id:
      "example"`); FPMT's complete set is a configuration in the test suite, held to FPMT's
      calendars for 2022–2026 ([fpmt-calendar.md](../sources/fpmt-calendar.md)); eclipses are the front
      end's responsibility. The rule list is in the README and the basis of each level and name in
      [observances.md](../observances.md). Reasoning, the sojong history and the superseded
      2026-08-12 policy record:
      [decisions/2026-11-11-observance-model.md](../decisions/2026-11-11-observance-model.md) and
      [almanac-sources.md](../sources/almanac-sources.md#sojong-a-counted-schedule-once-falsified-by-a-misreading).
- [x] **Sojong, built and validated** — done 2026-11-14 on the `observances-1.0` branch: the
      `counted` rule form, `scripts/fetch-rabten-sojong.mjs` and `test/fixtures/rabten-sojong.ts`
      (every sojong Rabten Choeling's calendar prints, 2000–2100). Inferred, not sourced; history
      and limits in
      [almanac-sources.md](../sources/almanac-sources.md#sojong-a-counted-schedule-once-falsified-by-a-misreading).
- [x] **Confirm each example rule against FPMT's current guidance — read 2026-11-14,** and
      recorded rule by rule in
      [fpmt-calendar.md](../sources/fpmt-calendar.md#fpmts-prose-guidance-against-the-nineteen-rules).
      Seven rules found no prose guidance; that is a result, tracked for the fire puja under
      "Awaiting a Tibetan teacher" below.
- [x] **Record FPMT's second line of codes and its moon icons in the fixture.** Done
      2026-09-19: `codes` verbatim (FPMT's misprints `NPG` and `ED-EW` kept as printed) and
      `moon`, an icon rather than a moon, tested in `test/validation/fpmt-observances.test.ts`.
      The sweep for exported identifiers naming an institution found none beyond the renamed
      `GELUG`.
- [x] **Full code review.** Reviewed 2026-11-15 at `34b8ab4` as twelve sharded Opus and Sonnet
      reviews scored by independent agents (57 findings, 47 kept). Closed 2026-11-16: every kept
      finding fixed or parked with a ruling, merged as `51c7c03`, after a per-task Opus review, a
      whole-branch hostile-input pass and the cloud ultrareview, whose six findings were fixed
      before the merge. Diff-shaped commands (`/code-review ultra`, `/security-review`) review
      nothing on a clean `main`: give a path or run from a branch.
- [x] **Security review.** First pass 2026-11-15 at `34b8ab4`, over release configuration and
      denial of service: no high findings; the unbounded `monthsFor` cache became an LRU of 64
      years per config and both CI actions were pinned to commit SHAs (`51c7c03`). **Second pass
      run 2026-11-22 over `34b8ab4..55b8e70 -- src/`**, a vulnerability review of the package:
      one finding, fixed — a typed array assigned the expected keys passed validation and
      escaped as an uncoded `TypeError` when its private copy was frozen; `validatedPrivateCopy`
      now freezes inside the guarded read, pinned in `test/hostile-inputs.test.ts`. `npm audit`
      unchanged (the accepted KaTeX residual; 0 with `--omit=dev`).
- [x] **Full adversarial review** — the subject is the repository's claims, not its code. Run
      2026-11-18 to 2026-11-19 (code shards X1/X2/L1–L4 and claim-sets 1–7); every finding has a
      decision, merged to `main` 2026-11-21 as `5bd5d1e`, with its seven parked findings fixed
      (`eac11ed`). The maintainability pass (2026-11-21 to 2026-11-22: six Opus shards M1–M6 and
      one Sonnet agent P1) produced 37 findings, all fixed on `maintainability-fixes` (merged
      `e79731e`) with no change to the public surface or to any computed date. Triage and rulings
      are in the plans directory (`adversarial-review-2026-11/`, `maintainability-fixes.md`).

**Publishing**

- [x] Grant the `nyamlen:developers` team read-write on the package — done 2026-08-11, verified
      with `npm access list packages nyamlen:developers`. The listed owner remains `boffies`: npm
      has no self-service transfer to an organisation, and team access is what lets CI publish.

**Release workflow (Phase 4)**

- [x] **Packaging is verified in CI.** `check:publish` runs `publint` and `attw --pack .
      --profile esm-only`; `test:pack` packs the tarball, installs it outside the repository and
      imports every declared subpath. Only `test:pack` proves the built JavaScript runs.
- [x] **Nothing builds before packing.** Done 2026-09-24 in `1492210`: `"prepack": "npm run
      build"`, and `test:pack` deletes `dist/` and packs without building, so CI proves the script
      on every run. It also protects a local publish.
- [x] Add `"provenance": true` to `publishConfig` rather than passing `--provenance` at the
      call site. Done 2026-11-14. It also makes a local `npm publish` refuse, since provenance
      needs a supported CI, which enforces publishing from CI
- [x] **Re-run the polyfill probe on real devices against the release tarball — decided not to,
      2026-11-22 (Andreas).** The limit stands as stated: the real Safari runs (macOS 17.6 and iOS)
      were against `5c954b3`, before the Temporal boundary was rewritten, and every run since was in
      Node, Chrome and Playwright's WebKit, which has a native `Temporal` that shipping Safari lacks.
      macOS Safari 26 was never run. A Safari defect found later lands as a 1.x.

**Boundary and guard fixes**

- [x] **Four minor findings deferred from the 2026-09-23 boundary review.** All four done:
      rule 15's evasions (the pattern was widened to the constructor names, row X10), `asWesternDay`'s
      unconditional paragraph (`da1b4af`, with `isPlainObject` shared in `src/errors.ts`),
      `describe` rendering a function body and `10n` (`39e7795`, `7369ab7`), and the
      unreadable-brand message asserting a cause it had not measured (`bf34781`).
- [x] **Pass a `TraditionConfig` one way, under one name.** Done 2026-09-24 in
      `807ec71`–`3876e3e`, breaking for seven functions and free while nothing is published.
      [decisions/2026-09-24-how-a-tradition-is-passed.md](../decisions/2026-09-24-how-a-tradition-is-passed.md)
- [x] **Sites that put a value into a message without `describe`, and inputs that escape
      uncoded.** Done 2026-09-24: `describe` and `isPlainObject` never throw, fourteen sites render
      through `describe`, and `elementalYoga` gained a guard. `test/hostile-inputs.test.ts` holds
      every export to never escaping uncoded.
- [x] **A throw from the caller's own code while the engine reads a config or a fields object**
      is now coded. Decided 2026-11-16 by Andreas (option 3), overtaking the 2026-09-24 decision
      that such an error may escape.
      [decisions/2026-08-12-error-codes-not-classes.md](../decisions/2026-08-12-error-codes-not-classes.md)
- [x] **The Tibetan date-field guard is written six times.** Done 2026-09-24 in `5b64142`,
      `eb2f73a`, `12e2e21`, `beb24e1` and `ae39e72`: `assertTibetanShape`, `assertTibetanRanges`,
      `monthCountFor`, `julianDayOfFields` and `boundedMonth` are the guard homes listed in
      CLAUDE.md. `boundedMonth` bounds both ends of a month, which fixed a lower-bound defect
      under `PHUGPA_HENNING`, and seven functions that reported errors under another function's
      name now name themselves, pinned by `test/error-subjects.test.ts`.
- [x] **Should the attribute functions be bounded by the exact range at all, and should the
      three refusal orders be unified?** Decided 2026-11-15 by Andreas and implemented the same
      day: the bound stays, and the order is shape, then tradition, then range (bare-number exports
      check the tradition first, 2026-11-18).
      [decisions/2026-11-15-attribute-functions-share-the-exact-range.md](../decisions/2026-11-15-attribute-functions-share-the-exact-range.md)
- [x] **Decide whether `check:conventions` rule 4 should distinguish an exported `{@link}` target
      from a module-local one.** Decided 2026-09-23: reject, scoped to docblocks that ship (those
      of a barrel-exported declaration). Eleven links fixed in `23347bb`; row X12 proves it.

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
  [fpmt-calendar.md](../sources/fpmt-calendar.md#eclipses)), and those come from a modern ephemeris, which this
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
  alone; nobody has asked for them. [astrology.md](../astrology.md) says the colours and directions are not
  in the output, so a reader of its cycle table does not go looking for them.

- **The almanac's twenty-seven astronomical yogas and eleven karaṇas.** Janson's main text, "Further
  calculations", defines the five daily quantities an almanac prints; `./astrology` computes three —
  the weekday, the lunar day and the lunar mansion. The other two are the **astronomical yoga**
  (*yoga* योग; སྦྱོར་བ *jorwa*), from the summed longitudes of sun and moon, and the **karaṇa**
  (*karaṇa* करण; བྱེད་པ *chépa*), a half lunar day.
  Both would be additive. The only check available today is Henning's daily calendars, which print both
  but are this engine's own lineage, as for the mansion — so shipping either would add a claim
  with less behind it than anything `./astrology` ships now. Until 2026-09-18
  [why-trust-these-dates.md](../why-trust-these-dates.md) filed karaṇa under Appendix D, which is wrong.

- **"Some special days": the sun entering a sign, the definition points and their midpoints.** Janson's
  section on the days the mean sun enters each sign, and on the definition points (སྒང *gang*) and
  their midpoints (དབུགས *uk*).
  Calendar astronomy rather than astrology, so if it is ever built it does not belong in `./astrology`.

- **Source Bhutan's month animals and elements.** Janson gives month-animal lists for Phugpa and
  Tsurphu and none for Bhutan, so `./astrology` refuses that attribute for a tradition this package
  otherwise exports and validates day by day. A search on 2026-09-10 found nothing usable —
  BhutanWiki and the general Bhutan calendar pages cover only the *year* cycle — and the negative
  result is recorded in [validation-sources.md](../sources/validation-sources.md) so it is not re-walked.

  **It is a deferral rather than a dead end, and the reason is specific.** The source that would
  settle it is the Royal Government's *lo-tho*, which this repository already holds and already
  documents as a scanned PDF with **no text layer** — the reason `test/fixtures/rgob.ts` is
  hand-curated by exception. So the answer is probably in a document we have, behind exactly the OCR
  that exception exists to forbid. The realistic routes are a human reading of the relevant pages,
  or a Bhutanese almanac published with machine-readable text; neither is urgent, because the
  refusal is honest in the meantime. The API-shape half of this question is **not** here — it sits
  in the Pre-v1.0.0 checklist, because it freezes at 1.0.0.

- **An interactive almanac page, not a prose docs site.** A prose documentation site would duplicate
  [guide.md](../guide.md), and its examples would sit outside the assertion machinery that makes the
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

  If the reference site is not built, add a CI-tested runnable example to this repository instead.

- **The 60 rabjung cycle names — SHIPPED, Tibetan only.** `rabjungFor(year).tibetanName` carries a
  `TibetanName` at every position — script, Wylie, phonetics. **Neither** of the cycle's two Sanskrit
  lists ships, because they carry different names at 16, 17, 18, 20 and 34 and a type pairing either
  with the Tibetan name would misname 8% of years silently
  ([decisions/2026-08-25-rabjung-ships-the-tibetan-name-only.md](../decisions/2026-08-25-rabjung-ships-the-tibetan-name-only.md),
  which also records the shape both lists would take if they return). The Monier-Williams glosses and
  Csoma's columns stay sourced and regenerated in `test/fixtures/rabjung-names.ts` and
  `docs/names/rabjung.md`. `tibetanName` (`name` until 2026-09-13) is a **required** field, decided against the completed table.

  Additive, so not a breaking change. See
  [architecture.md](architecture.md#why-rabjungtibetanname-carries-the-tibetan-name-and-neither-sanskrit-list)
  for the shape and what it does and does not promise,
  [names/rabjung-sourcing.md](../names/rabjung-sourcing.md) for the sourcing hunt — every source tried,
  the dead ends with their evidence, and the findings that changed the method — and
  [decisions/2026-08-21-rabjung-names-carry-both.md](../decisions/2026-08-21-rabjung-names-carry-both.md)
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
  the Mongolian version, and worked configs for both are in [traditions.md](../sources/traditions.md) — as
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
  [validation-sources.md](../sources/validation-sources.md) had recorded; the details are there.

  **Bhutan's leap-month position closed on 2026-08-16**, as `TraditionConfig.leapMonthPosition`. It
  numbers a leap month from the **preceding** month where every other version numbers it from the
  following one, so its leap month falls *after* the regular month sharing its number. The engine's
  month sequence is validated against `test/fixtures/bhutan.ts` at exactly one offset over 375
  months, with the position flipped back to `"before"` matching at none — see
  [traditions.md](../sources/traditions.md) for the full account.

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
  [../src/traditions/bhutan.ts](../../src/traditions/bhutan.ts) and
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
  extent is in `docs/development/testing.md`); asking the generator for a later end refuses to write.

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
  [decisions/2026-08-16-exported-means-validated.md](../decisions/2026-08-16-exported-means-validated.md):

  1. **Its own astronomy.** `m₀`, `s₀` and `a₀` exist only in Janson's four-version comparison
     table, which is stated one mean lunar month from the epoch a config uses — the trap
     [traditions.md](../sources/traditions.md) records. Bhutan escaped it because its appendix gives the epoch
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
     [almanac-sources.md](../sources/almanac-sources.md)'s Zurkhai lineage question.
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
  [decisions/2026-08-12-no-tibetan-date-class.md](../decisions/2026-08-12-no-tibetan-date-class.md)
  stands. The reasoning is in
  [decisions/2026-08-15-lunation-arithmetic.md](../decisions/2026-08-15-lunation-arithmetic.md).

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
  [decisions/2026-11-11-observance-model.md](../decisions/2026-11-11-observance-model.md) keeps this
  in injected config — so any fix is additive shape, not logic.

- **`Observance.rule.kind` reads worse than `o.kind`** — **moot since 2026-11-11**: the rebuild dropped
  `kind` altogether, and a result's grouping is `rule.level`.

- **Tibetan-language output — weekday and year naming shipped 2026-08-16.** `TibetanDate` carries
  `weekdayName`; `yearName` carries `elementName`, `genderName` and `animalName`; and
  `weekdayNameFor` is exported. (`elementNameFor`, `genderNameFor` and `animalNameFor` were exported
  too until 2026-08-25, when they came off the surface and out of `cycles.ts` — never argued for,
  and reachable as `yearNameFor(year).elementName`. See
  [decisions/2026-08-12-public-surface.md](../decisions/2026-08-12-public-surface.md).) Each name is
  Tibetan script, Wylie and THL Simplified phonetics — no English field, because the string unions
  already carry the English identity and are the i18n contract. See
  [decisions/2026-08-16-names-are-data-not-locales.md](../decisions/2026-08-16-names-are-data-not-locales.md).

  The three open questions this entry used to list are answered there: a **structured object**, not a
  locale parameter; **three renderings**, with IAST reserved for the Sanskrit side of the rabjung
  names; and **no `formatTibetanDate` mode**, because its round trip with `parseTibetanDate` is an
  identity that must not acquire one.

  Provenance is machine-checked rather than trusted — [names/vocabulary.md](../names/vocabulary.md). Janson
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
  [decisions/2026-09-14-month-names-return-every-system.md](../decisions/2026-09-14-month-names-return-every-system.md).
  The evidence for the names is in [names/month-and-yoga-sourcing.md](../names/month-and-yoga-sourcing.md),
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
  [decisions/2026-08-12-public-surface.md](../decisions/2026-08-12-public-surface.md), a name is
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
