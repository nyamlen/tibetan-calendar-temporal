# tibetan-calendar-temporal

Tibetan calendar computation engine — Phugpa and Bhutanese traditions. Pure TypeScript, zero runtime
dependencies, built on Temporal.

This file states each rule and why it exists, with at most one example.
The incident behind a rule belongs in its commit message or decision record, not here.

- Every rule, and **what fails when you break it**: [docs/coding-standards.md](docs/coding-standards.md) —
  the enforcement map. This file says *why* a rule exists; that one says whether a machine catches it
- **How the calendar works**: [docs/how-it-is-calculated.md](docs/how-it-is-calculated.md) — read it
  before touching the arithmetic or arguing about a divergent date
- Architecture, API design, core types: [docs/architecture.md](docs/architecture.md)
- **Consumer guide**: [docs/guide.md](docs/guide.md) — ships to npm; its examples are contract,
  asserted by `test/guide.test.ts`
- **What is validated, over which years**: [docs/why-trust-these-dates.md](docs/why-trust-these-dates.md)
  — ships to npm. **It and `docs/testing.md` are the only documents that may quote a validation
  window**; everything else links to them
- **FPMT's calendar**: [docs/fpmt-calendar.md](docs/fpmt-calendar.md) — not shipped; FPMT-specific
  validation reports its window there, not in `why-trust-these-dates.md`
- **Observances**: [docs/observances.md](docs/observances.md) — not shipped. Levels are declared by
  the config, there is no `kind`; its practice knowledge is marked as Andreas' and unsourced — keep it marked
- Other implementations: [docs/other-implementations.md](docs/other-implementations.md) — public
  metadata only, **no competitor source is ever read**
- Testing strategy and every validation window: [docs/testing.md](docs/testing.md)
- **Every source checked against, and its lineage**: [docs/validation-sources.md](docs/validation-sources.md)
  — read **before** treating a new source as corroboration. Two sources in one lineage agreeing tells
  you nothing; it also lists rejected sources so dead ends are not re-walked
- What differs between traditions, and two source traps: [docs/traditions.md](docs/traditions.md)
- Provenance of every name string: [docs/names/](docs/names/) — `vocabulary.md`, `rabjung.md`, and a
  sourcing record per verifier (`rabjung-sourcing.md`, `month-and-yoga-sourcing.md`, whose status
  header says which decisions the code enforces, `mansion-and-trigram-sourcing.md`,
  `observance-sourcing.md`). Read the relevant one before treating a new source as corroboration for a name
- **How the name verifiers work**: [docs/names/verifiers.md](docs/names/verifiers.md)
- **How to prove a check, harness, probe or document suite measures anything**:
  [docs/verification-craft.md](docs/verification-craft.md) — read it before touching
  `scripts/check-conventions.mjs`, a generator, a validation predicate or a document suite
- Phases and the **pre-v1.0.0 checklist**: [docs/roadmap.md](docs/roadmap.md) — check before any release
- Contributor rules, dev setup: [CONTRIBUTING.md](CONTRIBUTING.md)
- Decision records: [docs/decisions/](docs/decisions/)

## Clean-room constraint — read this first

**Do NOT read, open, fetch, or reference the source code of `eszthoff/tibetan-date-calculator`
or `eszthoff/tibetan-calendar-temporal`.** The reason is **evidence, not licence risk**: the commit
history is this project's proof of independent derivation from Janson, worth exactly as much as the
claim that nobody here has read the alternative. Reading it cannot be undone or disproved.
Do not argue it from licence: neither repo has a `LICENSE` file, but `tibetan-date-calculator`
declares `"license": "MIT"` in `package.json`, which is a grant.

Permitted: running those libraries locally and comparing *computed dates* (facts) against ours, and
reading their public metadata — the README (for API ideas), npm registry metadata and the published
tarball's file listing, none of which is source. Not permitted: copying algorithms, variable names or code
structure, forking either, or referencing their internal decisions.

**Never add one of them as a devDependency.** A dependency is read by tooling, diffed in review and
vendored into caches, so "installed but not read" cannot be attested. `scripts/fetch-eszthoff-fixtures.mjs`
resolves the package from the *caller's working directory*, installed in a scratch directory outside
the repo. **That is the rule for any generation-time package** — the EWTS converters, `temporal-polyfill`:
the zero-dependency claim runs through the lockfile as well as the runtime.

Keep `src/` commits incremental and tied to the paper's sections; never squash the build. Docs are
the opposite: batch edits into meaningful units.

### Janson is the sole source for the arithmetic, not for data

Implement the calendar arithmetic — epochs, mean motions, correction tables, leap-month and
skipped-day rules — solely from Svante Janson, "Tibetan Calendar Mathematics" (arXiv:1401.6285).
A second source there means reconciling two formulas for one number, which is how the `a₂` fork and
the mixed-radix traps happened. The rule does **not** govern shipped **data**: observance rules cite
FPMT, names cite Wiktionary, THL, CLDR, Csoma, Monier-Williams and wisdomlib, and Henning's
lunar-mansion element table is an ordinary citation chain, since Janson cites Henning for it.
Do not confuse this rule with the clean-room constraint, which is about two named implementations.

**Read the LaTeX source, never PDF-extracted text.** Fetch with
`curl -L -o 1401.6285.gz https://arxiv.org/e-print/1401.6285`, then `gzip -dc` to `tibet.tex`.
**`-L` is not optional**: without it curl saves a 215-byte redirect page and the failure surfaces
later as "label not found". Keep it outside the repository (arXiv's licence does not grant
redistribution); `.gitignore` ignores `*.tgz` but **deliberately not `*.gz`**, so a stray copy stays
visible in `git status`. Do not "tidy" the two together.

`pdftotext` silently drops `⌊⌋`, `⌈⌉`, `≤`, `≥` and Greek constants, and has produced three wrong
formulas here, each a plausible calendar that is quietly wrong. Derive no formula from PDF text, and
accept no mitigation that depends on "checking the rendered PDF" unless a renderer is installed.
**Janson's LaTeX comments carry worked examples absent from the paper** — the `a₂` fork was settled by
one. When a question looks unanswerable, grep the comments.

**Cite by section and content, never by number.** `T12` and `T60` are LaTeX *labels*, not table
numbers, and equation numbers exist only at render time. Write "§5, the inverse problem" or quote the
constant's mixed-radix form (`m₁ = 29;31,50,0,480 ⟨60,60,6,707⟩`) — both are greppable.

**Janson is not always self-consistent, and not always independent.** His day-of-week table and his
Bhutan appendix disagree on Saturday (`spen ma`/`spen pa`), so for **names** a single Janson table is
not sufficient — the name verifiers require independent checks. His sixty-year table is "taken from
`\cite{Henning}`", so it and Henning are one witness; the independent one is Csoma de Kőrös (1834),
§233. Check a source's lineage, not its title-page date. Corrections live in the verifiers as
self-invalidating data; never patch a name by editing `src/names.ts`.
His mixed-radix notation distinguishes an integer part by **semicolon** from a leading **comma**
(use his six-decimal column as the guard), and his four-version epoch table is **one mean lunar month**
from a `TraditionConfig`'s epoch — both in [docs/traditions.md](docs/traditions.md).

### Fixtures are generated, not transcribed

Every fixture in `test/fixtures/` comes from a script in `scripts/` — the Janson fixtures from
`extract-janson-fixtures.mjs` (which parses the LaTeX), the `crosscheck-*.ts` data, `bhutan.ts` and
`fpmt-observances.ts` from their `fetch-*` scripts, the name fixtures from the five name verifiers.
Re-run the script; never edit the output. Hand-copying is how a one-day error reaches the primary
correctness gate. Parse a source's markup, never a summarised rendering — a summarising fetch misread
FPMT's `Tibetan Months 9-11` caption as two months.

**Three exceptions are hand-curated**, and the test is narrow: the authority publishes **nothing
usable to parse**, so a generator could only wrap a lossy reading. "Inconvenient to parse" is not the
test. They are `fpmt-holy-days.ts` (prose announcements), `rgob.ts` (a scanned PDF with no text layer,
the only non-Henning Bhutanese source, its numerals **read by a human on purpose**) and
`henning-six-seasons.ts` (a scan whose OCR shifts columns against rows, pairing confirmed by eye).
Each file's header holds its justification. **Do not regenerate, extend from a machine reading, or
delete any of them.**

`test/fixtures/crosscheck-row.ts` declares only types, so it has no provenance to check;
`check:conventions` tests this **before** the generator lookup, or it would pass by coincidence.
Do not widen that category to a file declaring a `const`. It stays in `test/fixtures/` because
**every file there imports only from `test/fixtures/`** — that closure makes "fixtures do not depend
on the engine" true by inspection, and
[docs/decisions/2026-08-16-exported-means-validated.md](docs/decisions/2026-08-16-exported-means-validated.md)
rests on it.

`scripts/rabjung-names.data.json` holds the one **authored** column of `docs/names/rabjung.md` and is
not a fixture; keep it out of `test/fixtures/` and every other column generated, so sourced and
authored columns stay distinguishable. `word-boundaries.data.json` and `nasal-rulings.data.json` are
authored guards, not evidence. **House conventions govern prose; a published standard (THL
Simplified) governs a shipped or tabulated data column**, because house style cannot be verified.

### Quote the right window

Validation windows live in `docs/testing.md`; cite the window whenever citing an agreement, and
never quote one from this file. Three windows must not be confused:

- **Dates** — the union of the external sources.
- **Observances, and full and new moons** — narrower: only `fpmt-observances.ts` carries labels and
  moon icons. Moon agreement is with FPMT's icons, whose own source is unrecorded; count moons, not icons.
  Sojong is the exception: Rabten's schedule checks it over a wider window of its own.
- **`./astrology` attributes** — neither. The cycles are checked only against Janson's own tables (not
  external corroboration); the lunar mansion and yoga favourability are checked for Phugpa only, with their own agreement figures
  and an unexplained residual; the yoga grading's membership is inferred from list order. Never call
  the mansion "validated" without its figure and residual.

When a layer lands, check `docs/why-trust-these-dates.md` for a sentence it has made false.
Before explaining a residual by a formula, check whether the source uses the same formula.

## Non-negotiable technical rules

- **Temporal only.** `Temporal.PlainDate` everywhere. Never `Date`.
- **Integer arithmetic only.** Integer division with fixed denominators; no floating point anywhere —
  it is what makes results deterministic across platforms.
- **Zero runtime dependencies.** Temporal is a built-in; the engine depends on nothing.
- **ESM only.** `"type": "module"`. No dual CJS build.
- **Boundary and guard code has one named home; a new subsystem must not write its own.** Copies drift
  (shipping messages that misdescribe their own function) or are borrowed (an export reporting errors
  under another's name, pinned by `test/error-subjects.test.ts`). The homes: `assertSafeYear`,
  `assertSafeIntegerArgument`, `assertNonEmptyString`, `isRecord`, `assertQueryOptions`,
  `assertKnownKeys`, `readingCallersObject`, `validatedPrivateCopy`, `describe` and `ROYAL_ERA_HINT` in
  `src/errors.ts`; `assertTibetanShape`, `assertTibetanRanges` and `assertTibetanWeekday` in
  `src/types.ts`; `weekdayOffsetOf` in `src/names.ts`;
  `asWesternDay`, `monthCountFor` and `julianDayOfFields` in `src/computation/conversion.ts`;
  `boundedMonth` and `boundedMonthDays` in `src/months.ts`. Rule 14 catches copy-paste, not re-implementation, so at review
  ask: **which boundary helpers did you write, and did one already exist?**
- **`assertTibetanShape` reads each field of the caller's date or month once** and returns a frozen,
  branded snapshot; everything after it takes the snapshot. A getter can answer differently the
  second time. A read that throws is `TCT_INVALID_ARGUMENT`. A new export taking a date or month goes
  in `test/caller-reads.test.ts`'s table.
- **A caller's Western date is copied, never used as handed in.** `toNativePlainDate` reads the
  calendar through the intrinsic `calendarId` getter, then returns `Temporal.PlainDate.from` of it:
  a subclass's `since`, `year` or `calendarId` would otherwise answer for the date, and copying
  first is wrong too, because `from` reads a forwarding Proxy's *fields*. Pinned in
  `test/temporal-kind.test.ts`.
- **Identity checks against `Temporal` live only in `src/temporal-kind.ts`** (rule 15). The rule
  catches the idiom, not every alias — a ratchet, not a proof. That file must keep a literal
  `instanceof Temporal.<Type>` in code, which the checker's self-test anchors on; routing every check
  through a helper makes `check:conventions` refuse to run.
- **Pure stateless functions**, measured by what a **caller** can observe. Memoising is allowed
  (`scalingFor`, the config validators, `monthsFor`); do not delete a cache for offending the word
  "stateless". A cache must **key on the config, not just the year**; **never hand out shared mutable
  state** (return fresh arrays of frozen elements — every `TibetanMonth` is frozen by `describeMonth`, every `TibetanDate` by `buildDate`);
  and **be bounded** (`monthsFor` keeps 64 years per config, LRU, pinned by identity in
  `test/months.test.ts`).
- **Tradition constants are injected** via `TraditionConfig`, never hardcoded. v1 ships `PHUGPA`,
  `PHUGPA_HENNING`, `BHUTAN` and `BHUTAN_HENNING`; Tsurphu and Mongolian must stay addable without
  touching the algorithm. **Inject the rules, not only the numbers** — the leap-month rule is
  `leapIndexThreshold`, and a hardcoded rule yields wrong leap months with no error. **Anything derived
  from the constants is derived per config** (`ScaledTradition.searchHalfWidth`, not a literal `3`);
  Phugpa-specific assertions belong in tests.
- **A docblock example on a function taking a `TraditionConfig` states one tradition's answer and says
  which.** Check structural claims against Bhutan, where versions diverge most (a Bhutanese leap month
  *follows* its regular month). Quote a varied figure with the constant it varies:
  `leapMonthNumberFor(2151)` is 6 for Phugpa, and varying `leapIndexThreshold` alone gives Bhutanese 10,
  while the shipped `BHUTAN` gives 8.
- **A rule that walks outward from a date needs a stated bound under every convention value**, and a
  refusal is a legitimate bound. Pin it with a test naming the setting.
- **A new layer reusing an existing accessor inherits its tradition-dependence.** Ask which comes with
  the call and whether a source establishes it; where none does, refuse — as the elemental yoga does
  under a nonzero `naming.weekdayOffset`.
- **The shipped configs are deeply frozen** — `PHUGPA`, `PHUGPA_HENNING`, `BHUTAN`, `BHUTAN_HENNING`,
  `EXAMPLE_OBSERVANCES` through `deepFreeze` in `src/freeze.ts` — because a spread a keystroke off
  mutates the singleton for everyone. Do not unfreeze one to ease a test.

### The public surface

- **Only the barrels make a name API.** Exporting from a module under `src/` does not.
  [docs/decisions/2026-08-12-public-surface.md](docs/decisions/2026-08-12-public-surface.md) governs:
  the **wrong-or-impossible** test applies to computation internals and contested conventions; a thin
  composition over public functions is judged by whether calendar libraries normally provide it **and**
  it has one obvious semantics. Do not cite the record to refuse a convenience; two defensible answers
  means injected config.
- `test/public-api.test.ts` pins runtime names and kinds; a failure means the surface changed — decide
  whether that was intended. `test/docblock-examples.test.ts` asserts every valued `@example`, **is
  maintained by hand and nothing checks it is complete**: add the `expect` in the same commit as the example.
- **Types and signatures are invisible to those suites.** Rules 13 and 16 hold barrels against the
  README's lists ([docs/coding-standards.md](docs/coding-standards.md)); each barrel declares the README
  heading its section opens with, and the rules refuse to guess if one is missing or out of order.
  **A type declared in a barrel's body is invisible to them** — they read `export type { … } from`
  blocks — so declare types in a module and re-export them (`DayAttributes` lives in
  `src/astrology/types.ts`). Prose describing a type's fields is unguarded. Removing or renaming a type needs a hand sweep of `docs/architecture.md`,
  `docs/guide.md` and docblocks (re-count the shapes with `grep -c '^interface ' docs/architecture.md`). **`docs/architecture.md`'s shapes are complete — every field**; adding
  a field to an exported type includes its shape there.
- **Before changing a signature, count the call sites that actually break and put the number in the
  commit message.** The compiler finds them only after you have decided the change was small.
  A figure written here before the work is an estimate; re-measure it when the work lands.
- **A widening is not additive if the new arm is structurally ambiguous with an existing one.** A
  parameter spanning two calendars accepts only shapes that say which they mean — a `Temporal` instance
  or a resolved `TibetanDate`, never loose fields. One-calendar functions (`addDays`, `daysBetween`,
  `addMonthsToDate`) keep loose fields: **put the guard where the ambiguity is**. Ship narrow; widening
  later is free, narrowing never is.
- **A `TraditionConfig` is exported only once its dates are checked against an external calendar**,
  and its docblock says what that check was (a day-by-day tiling vs a sample). A suite in
  `test/validation/` must **import** it — rule 10, which matches only `export … from "./traditions/…"`
  in `src/index.ts`. It does not see `ObservanceConfig` or the `./observances` and `./astrology` barrels;
  their runtime exports (`EXAMPLE_OBSERVANCES`, `ELEMENTAL_YOGAS`, `LUNAR_MANSIONS`) are held by
  `test/public-api.test.ts` and rule 16. Expressing a tradition, validating its leap months and
  validating its dates are three claims: Tsurphu and Mongolian stay unexported. Self-consistency is not
  a substitute.
  [docs/decisions/2026-08-16-exported-means-validated.md](docs/decisions/2026-08-16-exported-means-validated.md).

### Errors

- **Errors carry codes; do not add an error class.** Throw through `rangeError`/`codedError` in
  `src/errors.ts`, never a bare `new RangeError`. `SkippedDayError` is the only class. Discharge a
  `noUncheckedIndexedAccess` widening with `assertInternal`, never a cast. **A code has one error type**:
  throwing an existing code from a new site, use the constructor its first site used.
- Codes are contract, message text is not: assert on codes. `tibetanDateExists` swallows by
  **allowlist** — `SkippedDayError` by class, plus `TCT_FIELD_OUT_OF_RANGE` and `TCT_NO_SUCH_LEAP_MONTH`;
  everything else rethrows, `TCT_SKIPPED_DAY` without the class included. Never a denylist. This rule is
  stated in many places: find them by the export's **name**, never by a phrase.
  [docs/decisions/2026-08-12-error-codes-not-classes.md](docs/decisions/2026-08-12-error-codes-not-classes.md).
- `TCT_FIELD_OUT_OF_RANGE`: a **number** is wrong. `TCT_INVALID_ARGUMENT`: the argument is the wrong
  **kind of thing**; a new shape check uses this one. The exception is deliberate: a bare-number
  argument that is not a number keeps the range code (`tibetanWeekday(null)`), and only a field of a
  date or month object, or a shape, gets the argument code ("What is deliberately *not* split").
  [docs/decisions/2026-08-15-argument-errors-split.md](docs/decisions/2026-08-15-argument-errors-split.md).
  `TCT_ATTRIBUTE_NOT_SOURCED`: the input is fine and **no source gives the answer** — off the allowlist,
  reached by a tradition with no `naming.monthAnimals` (month and lunar-day attributes) or a nonzero
  `naming.weekdayOffset` (the yoga), never by asking "is this Bhutan".
  A composition may report it as `null` (`attributesFor` does).
- **With two bad arguments the refusal order is the shape, then the tradition, then the range**;
  a bare number has no shape, so the tradition comes first, and an options bag is read before the
  tradition it carries. Which code wins is contract, and `tibetanDateExists` depends on it.
  `test/error-subjects.test.ts` holds one row per export; a new export taking a tradition adds one.

### How a tradition is passed: seven points, approved by Andreas

(1) A `TraditionConfig` is always named `tradition`. (2) As a function's only choice, it is the last
positional parameter: `f(x, tradition?)`. (3) With two or more choices, all go in one bag extending
`TraditionOptions`. (4) `TraditionOptions` holds only `tradition`. (5) Bags refuse unknown keys,
`TCT_INVALID_ARGUMENT` naming the key. (6) A new choice is optional and its default reproduces the old
behaviour, pinned by a test. (7) A one-choice function gaining a second converts to a bag — breaking
after 1.0.0. A consumer cannot be asked to know which entry point a function is on.
`./observances` takes the `ObservanceConfig` positionally, so no bag carries both.
[docs/decisions/2026-09-24-how-a-tradition-is-passed.md](docs/decisions/2026-09-24-how-a-tradition-is-passed.md).

**A bag is a new argument boundary and needs its own guard**; read it with `=== undefined`, never `??`
(which silently turns an explicit `null` into the default); and **refuse an array**, as
`assertQueryOptions` does. `test/navigation.test.ts` pins both null fields, `{ tradition: null }` and
`{ overflow: null }`.

### Validators and guards

**Every consumer config gets a validator, and every export gets a guard.** A field declared
**required** is rejected when absent, not merely when wrong. The whole exported surface is the
boundary: an internal caller that skips a guard uses a separate name (`isoFromJulianDayUnchecked`,
`julianDayFromIsoUnchecked`, `tibetanFromJulianDay`). **Engine loops never call the public
`isoToTibetan` or `julianDayFromIso` on a date or Julian day they built**: each such call copies the
day again, which cost 10–17% across the observance benches; `test/temporal-kind.test.ts` counts
the copies.
**A closed-union parameter still needs its guard** — JavaScript callers exist. Render an unchecked value
through `describe`, never a bare `${}`. `test/hostile-inputs.test.ts` holds every export to never
escaping uncoded; probe with **one throwing trap at a time**.

## Environment

Node 26 required — Temporal is enabled by default from 26.0.0.

**On Windows, run Vitest and `npm` from PowerShell, not Git Bash's `/d/…` path.** From Git Bash every
test file fails at collection with `Cannot read properties of undefined (reading 'config')`. A total
failure naming no assertion is the tell.

The published package declares `engines: ">=26"` **and** guards at import time (`conversion.ts` touches
`Temporal` at module evaluation), with a message naming Node 26, `--harmony-temporal` and
`temporal-polyfill/global`. They cover different failures; keep both.

**Testing under a polyfill needs `installImplementation()`** from `temporal-polyfill/shim` (or
`temporal-polyfill/implementation` for a genuinely second class): `/global` and the main export are
no-ops beside a native `Temporal`. Resolve them from a scratch directory outside the repo. Playwright's
WebKit has a native `Temporal` and shipping Safari does not. Evidence: `docs/testing.md`, *Under a polyfill*.

**Temporal has no user-defined calendars**; do not attempt a calendar adapter —
[docs/decisions/2026-08-11-temporal-custom-calendars.md](docs/decisions/2026-08-11-temporal-custom-calendars.md).

**TypeScript 7 is load-bearing**: it ships `lib.esnext.temporal.d.ts`, hence
`"lib": ["ES2024", "ESNext.Temporal"]`. Do not downgrade it or install any Temporal typings package —
the published `.d.ts` references the global. **VS Code's four errors in the tsconfigs are its stale
schema**; both configs name schemastore's schema, and a local, gitignored `.vscode/settings.json` points
the editor there. Do not edit the configs to satisfy it.

**`scripts/indic.ts` may use only erasable TypeScript syntax**: an `.mjs` generator loads it under
Node's erase-only type stripping (`erasableSyntaxOnly` catches violations at typecheck); `allowImportingTsExtensions` is legal only under `noEmit`, which is why `tsconfig.build.json` turns it off.

**No bundler.** `tsc` alone, so `dist/` mirrors `src/` for the subpath exports —
[docs/decisions/2026-08-11-build-tooling.md](docs/decisions/2026-08-11-build-tooling.md).

## Commands

`npm run lint`, `lint:md`, `check:links`, `check:conventions`, `test:conventions`, `typecheck`,
`build`, `test`, `check:publish`, `test:pack` — CI runs all ten in that order.

- **`check:conventions`** enforces the rules lint, typecheck and the suite cannot see; what each rule
  covers is in [docs/coding-standards.md](docs/coding-standards.md). When you add a rule here, check
  whether the script can hold it, and write the failing case first.
- **`test:conventions`** is the only proof `check:conventions` still reports: one mutation row per
  rule, after an unmutated control. Not in `npm test`; run it when you touch the checker **or a file
  a row mutates** (`src/temporal-kind.ts`, the guards in `src/errors.ts`), because a row whose target
  moved fails only here. "Mutation target not found" means a commit moved the row's text — repoint
  the row. A new rule needs a new row. It lives at `test/` root, not `scripts/`, because Rule 7 accepts a fixture any script names, and the harness names `fixtures/bhutan.js`.
- **`lint:md`** does not check semantic line breaks.
- **`check:publish` and `test:pack` are the only checks that see the published package.** `test:pack`
  packs without building (proving `prepack`), installs outside the repo and asserts values through all
  three subpaths. `attw` runs `--profile esm-only`: do not add `main` to green a row.
- **`check:links`** validates relative links and fragments; fix inbound links in the same commit.
  **Never put an em dash in a heading you link to** — this checker's slug and GitHub's differ for it.

**Seven release-time commands are outside CI**: `coverage`, `bench`, and the five name verifiers
(`verify:names`, `verify:rabjung-names`, `verify:month-and-yoga-names`,
`verify:mansion-and-trigram-names`, `verify:observance-names`). The verifiers need the network and
converters installed outside the repo; their committed fixtures are what gate a push. **Run them one
at a time** (THL answers parallel runs with 503s), **run Biome on their output after every run**, and
restore a fixture that differs only by its date stamp. Details: [docs/names/verifiers.md](docs/names/verifiers.md).

- **`coverage`** is ungated, and slow tests can pass `test` and time out under it: give any
  multi-century test an explicit timeout. Read what it *reports* — an unreachable line or uncovered
  branch is a finding.
- **`bench`** lives in `bench/`, not `test/`: a directory under `test/` must mirror one under `src/`
  (plus `validation`, `fixtures`, `support`). **A performance number may be quoted only with its
  harness** in `bench/RESULTS.md`. **The README, the guide's "The cost in time" and `getObservances`'
  docblock quote the latest re-record**: a re-record updates all three. Compare a before and after
  with a second before run, so drift between runs is not read as a cost. No regression threshold, not in CI. `package.json#files` excludes `bench/`; `tsconfig.json` and
  `biome.json` include it deliberately.

## Documents

- **The README is a landing page**; new consumer prose goes in `docs/guide.md`.
  [docs/decisions/2026-08-23-readme-is-the-landing-page.md](docs/decisions/2026-08-23-readme-is-the-landing-page.md).
- `package.json#files` ships `docs/guide.md`, `docs/why-trust-these-dates.md` and
  `docs/how-it-is-calculated.md`, so **their examples are contract**. Each has its own suite reading
  only its own document; a document joining `files` gets its suite in the same commit. A suite reads
  the document and never restates it.
- **A shipped sentence that quantifies — every tradition, both edges, any year — is asserted over
  every case it names**, not one: a test that tries only the case where it holds passes a false
  sentence. Check it against Bhutan, where the traditions diverge most.
- A shipped document's relative links must resolve in the tarball (`check-pack` enforces it); link
  repo-only files by absolute URL, and never link a shipped file by absolute URL. A docblock ships
  too, in the `.d.ts`: it names an unshipped file only by absolute URL (rule 19).
- **A year here is Tibetan unless it says otherwise**; state any measured window in both eras.
- **A shipped instruction is contract like an example** — print a runnable config and run it in a clean
  consumer; this repo's own tsconfig masks the defect.

## Conventions

**No exported identifier names an institution.** A name states what a thing *is*; provenance goes in
the docblock and docs. `GELUG` overclaimed: it was FPMT's convention, and Kopan, also Gelug, prints the
opposite `doubledDay`. `EXAMPLE_OBSERVANCES` has `id: "example"`, asserted by
`test/public-api.test.ts`. This is distinct from `PHUGPA`/`BHUTAN`, which name a falsifiable
calendrical system Janson describes.
[docs/decisions/2026-09-03-no-institution-names-in-exports.md](docs/decisions/2026-09-03-no-institution-names-in-exports.md).

**A shipped name is keyed by language, and the key comes first**: `englishName`, `tibetanName`, and
where sourced `sanskritName` — never `name`, a language code or `meaning`. Three shapes are in use, set
out in the record's amendment; a label added to a `tibetanNames` block fails
`test/astrology/index.test.ts` until its Tibetan name is added.
**A shipped English name is printed word for word by a public-domain dictionary, or is a cited source's
own wording verbatim (with the printing's year where it varies), or is marked as authored.**
[docs/decisions/2026-09-13-names-keyed-by-language.md](docs/decisions/2026-09-13-names-keyed-by-language.md).

Technical identifiers are lowercase (`nyamlen`); the brand is capitalised (`Nyamlen`) — npm rejects
uppercase package names.

Markdown uses semantic line breaks; `.markdownlint.jsonc` disables the rules that fight it (`MD013`
above all). Do not re-wrap prose for a linter, and do not remove those exclusions. **Two guards were investigated and rejected — do not propose them again**: a
semantic-line-break check (fires thousands of times; no document is clean enough to ratchet from) and
a path-liveness check over this file (it drifts in counts and rule descriptions, not paths).

**A docblock is written for the caller; reasoning goes in a `//` comment.** `tsc` ships `/** */` and
drops `//`. Move proofs and traps to `//`, never delete them; dates go in commit messages.
[docs/decisions/2026-11-15-docblocks-are-for-callers.md](docs/decisions/2026-11-15-docblocks-are-for-callers.md).

**Test files must not export**; shared helpers go in `test/support/`. Importing a test file re-runs
its tests inside the importer.

**In a sweep over thousands of rows, collect violations and assert once** —
`expect(bad).toEqual([])`. Per-row `expect` with a `Temporal`-built message kills the worker.

`biome.json` raises `lineWidth` to 250 for `test/fixtures/fpmt-observances.ts` so its rows stay one per
line. Measure with Biome (a tab counts as `indentWidth`), raise it when a field is added, never remove it.

**A review that parks a finding records it in the roadmap's "Small findings parked by the pre-1.0.0
reviews" item, marked Fix or Accepted with the reason — never in a private ledger or an undecided
list.** A finding with no recorded decision is one nobody will ever close. Limits of throwaway plan
tooling that never ships are not tracked.

**Decision records** document a constraint a contributor would otherwise violate, not deliberation.
Format: `YYYY-MM-DD-slug.md`, front matter with only `date` and `status`
(`accepted`/`superseded`/`deprecated`), one H1, then a bold `**Decision:**` line. No `title` in front
matter. **When a decision changes, rewrite the whole section stating it**, then grep the record for
every figure and name the change touched.
