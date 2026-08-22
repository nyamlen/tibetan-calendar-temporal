# tibetan-calendar-temporal

Tibetan calendar computation engine — Phugpa and Bhutanese traditions. Pure TypeScript, zero runtime
dependencies, built on Temporal.

- Every rule, and **what fails when you break it**: [docs/coding-standards.md](docs/coding-standards.md) —
  the enforcement map. This file says *why* a rule exists; that one says whether a machine catches it
- **How the calendar works, for anyone who has not met it**:
  [docs/how-it-is-calculated.md](docs/how-it-is-calculated.md) — leap months, doubled and skipped
  days, and what `a₂` is. Read it before touching the arithmetic or arguing about a divergent date
- Architecture, API design, core types: [docs/architecture.md](docs/architecture.md)
- Testing strategy: [docs/testing.md](docs/testing.md)
- **Every source checked against, and its lineage**:
  [docs/validation-sources.md](docs/validation-sources.md) — read this **before** treating any new
  source as corroboration. Agreement is only evidence if the source did not reach its answer the way
  we did, and two sources in one lineage agreeing tells you nothing. It also lists what has been
  tried and rejected, with reasons, so the same dead ends are not re-walked
- What differs between traditions, and the two source traps found while working it out:
  [docs/traditions.md](docs/traditions.md)
- Provenance of every Tibetan name string: [docs/names/vocabulary.md](docs/names/vocabulary.md)
- Implementation phases and the **pre-v1.0.0 checklist**: [docs/roadmap.md](docs/roadmap.md) —
  check it before any release; it holds deliberately deferred decisions
- Contributor rules, dev setup: [CONTRIBUTING.md](CONTRIBUTING.md)
- Decision records: [docs/decisions/](docs/decisions/)

## Clean-room constraint — read this first

**Do NOT read, open, fetch, or reference the source code of `eszthoff/tibetan-date-calculator`
or `eszthoff/tibetan-calendar-temporal`.** Neither has a licence file, which makes them legally
all-rights-reserved. Any code derived from them would poison this project's MIT licence.

Implement solely from Svante Janson, "Tibetan Calendar Mathematics" (arXiv:1401.6285).

**Read the LaTeX source, never PDF-extracted text.**
Fetch it with `curl -L -o 1401.6285.gz https://arxiv.org/e-print/1401.6285`, then `gzip -dc` it to
`tibet.tex`. **`-L` is not optional**: arXiv redirects `/e-print/` to `/src/`, so without it curl
saves a 215-byte redirect page, `gzip -dc` produces an empty file, and the failure surfaces much
later as "label not found" rather than as a download error. Found by following these instructions on
2026-08-21 and getting an empty file.
Keep it outside the repository: arXiv's default submission licence grants arXiv distribution
rights, not third-party redistribution, so vendoring a copy here would raise exactly the licence
question this project exists to avoid.

`pdftotext` silently drops `⌊⌋`, `⌈⌉`, `≤`, `≥` and Greek constants, and it has already produced
three wrong formulas in this project: `⌊⌋` where Janson has `⌈⌉` in the month inversion, `≤ 41`
where he has `≥ 41` in the leap-year rule, and a swallowed `β` in the definition of γ.
None of these crash — they yield a plausible calendar that is quietly wrong, which is the most
expensive kind of error here.
Do not derive any formula from PDF text, and do not accept a mitigation that depends on
"checking the rendered PDF" unless a renderer is actually installed.

There is a second, positive reason to read the source: **Janson's LaTeX comments carry worked
examples that are absent from the rendered paper.** The `a₂` fork was settled by one of them — a
commented three-line comparison showing the Men-Tsee-Khang almanac's printed true date agreeing
with `1/28` and disagreeing with Henning's value. No PDF, however well rendered, contains it.
When a question looks unanswerable from the published text, grep the comments before concluding
the paper is silent.

**Cite by section and content, never by number.** `T12` and `T60` in the LaTeX are *labels*, not
table numbers — `T12` is the twelve-animal cycle, which prints as Table 3, while the 60-year
cycle table is a different one entirely. Equation numbers are generated at render time and
cannot be checked without a renderer, which is not installed. Write "§5, the inverse problem" or
quote the constant's mixed-radix form (`m₁ = 29;31,50,0,480 ⟨60,60,6,707⟩`) — both are greppable
in the source, which is the whole point.

**Janson is the sole source, and he is not always self-consistent.** His day-of-week table gives
Saturday as `spen ma`; his own Bhutan appendix gives `spen pa` for the same day in Tibet. The wrong
one reached a shipped docblock and sat there for three phases. So for **names**, a single Janson
table is not sufficient evidence — `scripts/verify-name-sources.mjs` puts every term through five
independent checks and refuses to emit if any fails. Corrections to the source live in that script
as data carrying their evidence, and self-invalidate; do not patch a name by editing `src/names.ts`.

Two further traps of the same class, both found in his tables and both documented in
[docs/traditions.md](docs/traditions.md): his mixed-radix notation distinguishes an integer part by
**semicolon** from a leading **comma** that has none, and his four-version epoch table is stated
**exactly one mean lunar month** away from the epoch a `TraditionConfig` uses. Either misread yields
a calendar that runs and is wrong. His six-decimal column is the guard against the first — use it.

**Fixtures are generated, not transcribed.** `test/fixtures/losar.ts`, `sixty-year-cycle.ts`,
`janson-epoch.ts` and `cross-version-leap.ts` come from `scripts/extract-janson-fixtures.mjs`, which
parses the LaTeX; the three `crosscheck-*.ts` **data** files come from their own
`scripts/fetch-*-fixtures.mjs` — `crosscheck-row.ts` is not one of them, and is covered below;
`names.ts` from `scripts/verify-name-sources.mjs`; `bhutan.ts` from
`scripts/fetch-bhutan-fixtures.mjs`. Re-run those rather than editing the output. Hand-copying 120 dates is how a silent one-day error reaches the primary
correctness gate — and an early draft of `docs/testing.md` did exactly that, dating Losar 2026 to
17 February instead of 18.

`test/fixtures/fpmt-observances.ts` comes from `scripts/fetch-fpmt-observances.mjs`, which parses
FPMT's monthly calendars at `fpmt.org/resources/calendar/YYYY/Month.php`. Those are HTML tables
mapping each Gregorian day to its Tibetan day number and observance labels, so they are the only
**day-by-day almanac** source here — which is what makes them able to settle the `a₂` fork, where a
list of observance dates cannot. Parse the markup, never a summarised rendering: a summarising
fetch got the month-span caption wrong, reading the range `Tibetan Months 9-11` as two months
rather than three. This is the same failure the LaTeX rule exists to prevent.

There are **two** deliberate exceptions to the generated rule, and the test for both is narrow: the
authority publishes the data with **nothing to parse**, so a generator could only wrap a lossy
reading. "Parsing it is inconvenient" is not the test.

`test/fixtures/fpmt-holy-days.ts` is hand-curated because FPMT publishes *those* dates in prose
announcements with no feed. Its safeguards are that it is short enough to check by eye, every row
carries its source URL, and every row was confirmed against three independent implementations first.

`test/fixtures/rgob.ts` is hand-curated because the Royal Government of Bhutan publishes its calendar
as a **scanned PDF with no text layer** — `pdftotext` returns nothing — so a generator would be OCR,
and an OCR misread of a Tibetan numeral is a plausible wrong date. It earns the exception by being
the only Bhutanese source here that is *not* Henning's lineage: `test/fixtures/bhutan.ts` descends
from his "Open Source Bhutanese Calendar" software, and so does every other one found. **Its numerals
were read by a human on purpose** — a machine reading of the same document misread three cells in
nineteen, all `༠` against `༤` or `༥` against `༆`. Do not regenerate it, and do not extend it from a
machine reading.

**A third provenance category, which is not a third exception.** A file in `test/fixtures/` that
declares **no data at all** — only types — is exempt, because there is nothing to transcribe and so
the error the rule prevents cannot occur in it. `test/fixtures/crosscheck-row.ts` is the only one:
the row type its three sibling fixtures share. `check:conventions` tests this **before** the
generator lookup, deliberately, because the three generators emit an import naming that file and the
provenance check cannot tell an import line from a generator's output — so it would otherwise pass
by coincidence, and a provenance rule that passes for the wrong reason is worse than one that fails.
Do not widen the category to a file that declares a `const`.

It lives in `test/fixtures/` rather than `test/support/` for a reason that is easy to undo: **every
file in `test/fixtures/` imports only from `test/fixtures/`**, and that closure is what lets
"fixtures do not depend on the engine" be true by inspection rather than by audit.
`test/support/versions.ts` imports from `src/`, so moving a shared fixture type there would quietly
end that. The independence is load-bearing —
[docs/decisions/2026-08-16-exported-means-validated.md](docs/decisions/2026-08-16-exported-means-validated.md)
rests on it.

Neither justification extends to the calendars above. Do not "fix" either by trying to generate it,
and do not delete either for breaking the rule. See `docs/testing.md`, which also states the window
each agreement actually covers — Phugpa's day-by-day external validation spans 2022–2027 against a
documented range starting 1447, and Bhutan's spans 2000 to early 2030 against one lineage plus
twenty-five government-published days — so cite the window whenever citing the agreement.

`scripts/rabjung-names.data.json` is **not** a second exception, because it is not a fixture: no
test reads it, and nothing in `src/` depends on it. It holds the one **authored** column of
`docs/names/rabjung.md` — English glosses of the Tibetan names. Keep it out of `test/fixtures/`, and
keep every other column of that document generated: the whole value of the table is that a reader
can tell sourced columns from authored ones at a glance, and it now prints both an authored English
gloss of the Tibetan and a sourced Sanskrit sense side by side precisely so the difference is
visible rather than asserted.

Its Lhasa-phonetic column was retired on 2026-08-21 when THL Simplified phonetics replaced it. That
is the general rule, not a one-off: **house conventions govern prose, a published standard governs a
shipped or tabulated data column**, because house style cannot be verified against anything.

Permitted: running those libraries locally and comparing *computed dates* against ours. Dates
are facts, not copyrightable expression. Reading their public README for API-design ideas is
also fine.

Not permitted: copying algorithms, variable names, or code structure; forking either as a base;
referencing their internal implementation decisions.

**Never add one of them as a devDependency**, however convenient it looks for regenerating a
fixture. That puts all-rights-reserved code in the tree and in the lockfile, which is the exact
thing being avoided. `scripts/fetch-eszthoff-fixtures.mjs` resolves the package from the
*caller's working directory* instead, so it is installed in a scratch directory outside the repo
and the script is run from there.

**That pattern is the rule for any generation-time package, not just the unlicensed ones.**
`scripts/verify-name-sources.mjs` needs two EWTS converters (`jsewts` and `tibetan-ewts-converter`)
and resolves both the same way. Nothing that exists only to build a fixture belongs in this
package's dependency tree — the zero-dependency claim runs through the lockfile as well as the
runtime.

The commit history is the evidence of independent derivation. Keep commits incremental and
tied to the paper's sections — do not squash the build into a single large commit.

This cuts the opposite way for documentation: batch doc edits into meaningful units rather
than committing each one. Granular commits earn their place in `src/`, where they show
derivation; in `docs/` they are just noise.

## Non-negotiable technical rules

- **Temporal only.** `Temporal.PlainDate` everywhere. Never `Date`.
- **Integer arithmetic only.** All Phugpa math uses integer division with fixed denominators.
  No floating point anywhere — it is what makes results deterministic and identical across
  platforms.
- **Zero runtime dependencies.** Temporal is a language built-in; the engine depends on nothing.
- **ESM only.** `"type": "module"`. No dual CJS build.
- **Pure stateless functions.** Same input, same output, no side effects — measured by what a
  **caller** can observe, not by whether a module holds a variable. Memoising a pure function is
  therefore allowed and already done three times: `scalingFor` on a `WeakMap`, the config validators
  on a `WeakSet`, and `monthsFor` on a per-`(config, year)` cache. Do not delete one for offending
  the word "stateless"; `monthsFor` earns its keep because stepping a month grid re-derives
  neighbouring years constantly, and caching cuts a repeated year from ~180 µs to under 1 µs.

  Two things a cache here must get right, both of which a naive one gets wrong. **Key on the config,
  not just the year** — a config-blind cache serves one tradition's answers for another, and would
  pass nearly every test, since `PHUGPA` and `PHUGPA_HENNING` diverge at month level in only four
  years between 1500 and 2500. And **never hand out shared mutable state**: return a fresh array, or
  one consumer's `sort()` corrupts the next consumer's.
- **Tradition constants are injected** via `TraditionConfig`, never hardcoded. v1 ships `PHUGPA`,
  `PHUGPA_HENNING`, `BHUTAN` and `BHUTAN_HENNING`; Tsurphu and the Mongolian version must remain
  addable without touching the algorithm, and the promise is no longer theoretical — Bhutan was added
  that way on 2026-08-16, and it took two new config fields and no change to any formula.

  **That promise was false until 2026-08-16, and the way it was false is the lesson.** Every
  *constant* was injected, but the **leap-month rule itself** was hardcoded to Phugpa's — Janson
  states a different one for each version (48/49 Phugpa, 0/1 Tsurphu, 46/47 Mongolian, 57/58
  Bhutanese). A Tsurphu config built from constants alone would have placed leap months in the wrong
  years, with no error and nothing about the output looking wrong. It is now
  `leapIndexThreshold`, and `β` and the true-month rounding term derive from it. When adding a
  tradition, check that the *rules* are injected too, not only the numbers.
  **It extends to the docblocks as well as the code**, which is subtler and was live until
  2026-08-16. `leapMonthOfYear` takes a config and its example read `leapMonthOfYear(2151) // 6`
  — true for Phugpa and for nothing else: Mongolian gives 5, Bhutanese 10, and Tsurphu has no leap
  month that year at all. The same docblock stated that a leap month "precedes the regular month
  sharing it", which holds for every version Janson gives **except Bhutan**, where it follows — the
  position gap [docs/traditions.md](docs/traditions.md) records as unmodelled. So a docblock on a
  config-taking function was promising something the engine does not do. If a function takes a
  `TraditionConfig`, its examples state **one** tradition's answer and must say which, and any
  structural claim has to be checked against Bhutan specifically, which is where the versions
  diverge most. `test/docblock-examples.test.ts` pins the thresholds; a third instance of the
  "precedes" claim survives in `src/types.ts` on `lunation`, where it explains tuple sort order,
  and needs revisiting when `leapMonthPosition` lands.

  This extends to anything **derived from** those constants. The `±3` search window in
  `isoToTibetan` was proved from `(25 + 11)/60` — Phugpa's largest `moonTab` and `sunTab` entries —
  and written at the loop as a literal `3`, so a wider table passed validation and then broke the
  window on 8% of days, half of them by returning a date that did not convert back. It is now
  `ScaledTradition.searchHalfWidth`, computed per tradition. If a bound is proved from a config's
  numbers, derive it from that config; assertions specific to Phugpa's values belong in the test
  suite, where they also catch a mistyped transcription.
- **The shipped configs are deeply frozen.** `PHUGPA`, `PHUGPA_HENNING` and `GELUG` go through
  `deepFreeze` in `src/freeze.ts`. They are the objects the docs point at for `{ ...PHUGPA, … }`,
  so they are the ones a keystroke off a spread mutates — and because scaling and validation are
  both memoised on the config object, a mutation after first use yields neither the old constants
  nor the new ones but a stale mix. Do not unfreeze one to make a test easier.
- **What goes on the public surface is decided by a rule, and the rule has a scope.** Only the
  barrel in `src/index.ts` makes a name API — exporting from a module under `src/` does not, which
  is how `describeMonth` and `asPlainDate` are shared without being published.
  [docs/decisions/2026-08-12-public-surface.md](docs/decisions/2026-08-12-public-surface.md) governs
  the decision, and its 2026-08-15 revision is the part to read: the **wrong-or-impossible** test
  applies to computation internals and contested conventions, where the failure mode is a plausible
  wrong answer. A thin composition over already-public functions is judged instead by whether a
  calendar library normally provides it **and** whether it has one obvious correct semantics.

  Do not cite that record to refuse a convenience — it was misapplied that way and cost the surface
  four functions that had to be added back. Equally, do not cite the second test to expose something
  whose semantics are contested: two defensible answers means it belongs in injected config.
  `test/public-api.test.ts` pins the list and each name's kind, and `test/docblock-examples.test.ts`
  asserts every `@example` in `src/` that states a value — docblocks compile into `dist/*.d.ts`, so
  a stale one ships as contract. A failure in the first means the surface
  changed, so decide whether that was intended before editing the list.

  **A `TraditionConfig` is judged by a different rule, because it is a different kind of claim.**
  That record is about API design; a config asserts that dates computed with it are a real
  tradition's real dates. So it is exported only once the engine has been tiled against an
  **external** calendar for that tradition, day by day —
  [docs/decisions/2026-08-16-exported-means-validated.md](docs/decisions/2026-08-16-exported-means-validated.md),
  enforced by `check:conventions`, which requires a suite in `test/validation/` to **import** the
  config. Naming it in a comment or a `describe` title does not count — that grep-shaped version of
  the rule stayed green when a suite's assertions were deleted and its prose left behind.
  Expressing a tradition, validating its leap months and validating
  its dates are three claims, not one: **Tsurphu and the Mongolian version are fully expressible and
  their leap months are checked against Janson, and both stay unexported**, because nothing checks a
  Tsurphu date. Self-consistency is not a substitute — the Bhutan work's inverse-pair round trip
  passed under a labelling that was consistently wrong, and only external data caught it. Record the
  window in `docs/testing.md`; agreement cited without its window is what that file exists to
  prevent.
- **Errors carry codes; do not add an error class.** Throw through `rangeError`/`codedError` in
  `src/errors.ts`, never a bare `new RangeError` — the code is the part consumers branch on, and a
  bare construction silently omits it. `SkippedDayError` is the only class and stays the only one.
  `check:conventions` now enforces this; the one bare `new Error` that predated it sat in
  `epoch.ts` discharging a `noUncheckedIndexedAccess` widening. That is what `assertInternal` is
  for, and it is the required idiom — the alternative, a cast, lets a bad index return `undefined`
  wearing the element type, which is how the same constraint was discharged two different ways in
  the same codebase.
  Codes are contract and message text is not, so assert on the code in tests and never tell a
  consumer to match wording. `tibetanDateExists` swallows errors by **allowlist** — three codes
  answer `false`, everything else rethrows — and must not go back to a denylist: as one, a single
  bare `RangeError` in `scaleTo` made it report that Losar 2026 does not exist. Both rules and the
  message-writing guidance:
  [docs/decisions/2026-08-12-error-codes-not-classes.md](docs/decisions/2026-08-12-error-codes-not-classes.md).

  Two codes, not one, for bad input: `TCT_FIELD_OUT_OF_RANGE` means a **number** is wrong;
  `TCT_INVALID_ARGUMENT` means the argument is the wrong **kind of thing** — a `Temporal` instance
  where a Tibetan date belongs, a non-boolean leap flag, `null`. Only the first is on the allowlist,
  which is what makes a caller's type confusion throw instead of being reported as a date that does
  not exist. A new shape check uses the second, never the first:
  [docs/decisions/2026-08-15-argument-errors-split.md](docs/decisions/2026-08-15-argument-errors-split.md).
- **Every consumer config gets a validator, and every export gets a guard.** `TraditionConfig` and
  `ObservanceConfig` are both documented extension points, so both are checked at the boundary and
  memoised per object. Add a config type, add a validator — `TraditionConfig` went unchecked for
  three phases because the failure looked like a language error (`Cannot read properties of
  undefined`) rather than a missing feature. Two corollaries, each of which was violated:
  a field the type declares **required** must be rejected when absent, not merely when wrong
  (`undefined` is the likelier input, and it silently inherited whichever branch came last); and
  the boundary is the **whole** exported surface, so when an internal caller needs to skip a guard,
  give it a separate name like `isoFromJulianDayUnchecked` rather than leaving the export bare.

## Environment

Node 26 required for development — Temporal ships enabled by default from 26.0.0. Verified
working on v26.7.0.

The *published* package declares `engines: ">=26"` and **checks at import time**. `conversion.ts`
touches `Temporal` at module evaluation to build its Unix-epoch anchor, so a runtime without
Temporal fails on `import`, before any call. The guard above that line turns what was a bare
`ReferenceError: Temporal is not defined` into a message naming Node 26, `--harmony-temporal`, and
`temporal-polyfill/global`. A consumer supplying a polyfill still works — npm treats `engines` as a
warning — so do not "simplify" either the declaration or the guard away; they cover different
failures.

**Temporal has no user-defined calendars.** `Temporal.Calendar` does not exist and `calendar:`
accepts only built-in CLDR identifiers, which exclude `tibetan`. Do not attempt a calendar
adapter — see [docs/decisions/2026-08-11-temporal-custom-calendars.md](docs/decisions/2026-08-11-temporal-custom-calendars.md).

**TypeScript 7 is load-bearing.** It is the first release shipping `lib.esnext.temporal.d.ts`,
which is why `tsconfig.json` sets `"lib": ["ES2024", "ESNext.Temporal"]` and `Temporal` resolves
as a global. Do **not** downgrade TypeScript, and do **not** install `temporal-spec`,
`temporal-polyfill` or any other Temporal typings package to fix a `Temporal` type error — the
zero-dependency claim runs through the published `.d.ts`, which references the global. TypeScript
5.9 and `@types/node` carry no Temporal declarations at all.

**VS Code reports four false errors in `tsconfig.json` and `tsconfig.build.json`, and they are the
editor's fault.** Its bundled JSON schema predates TypeScript 7, so it rejects `ES2024` as a target,
`ES2024` and `ESNext.Temporal` as libs, and `nodenext` as a module — the last through a plain bug in
its own pattern, which spells NodeNext with a fourth character class of `[Ed]`, so neither casing can
match. `tsc` accepts all four. Both configs name schemastore's schema, which knows them, and
`.vscode/settings.json` (gitignored, so local) points the editor there. **Do not edit the configs to
satisfy a stale schema** — the lib is what makes `Temporal` resolve as a global.

**`scripts/indic.ts` may use only erasable TypeScript syntax.** It is shared between an `.mjs`
generator, which loads it under Node's **erase-only** type stripping, and a `.ts` test; a parameter
property, an enum or a namespace fails at import with `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`.
`erasableSyntaxOnly` in `tsconfig.json` makes that a typecheck error instead of a runtime one, and
`allowImportingTsExtensions` is what lets the test name the module by its real filename — legal only
under `noEmit`, which is why `tsconfig.build.json` turns it back off.

**No bundler.** `tsc` alone emits ESM and declarations, which keeps `dist/` mirroring `src/` —
the structure the `./observances` subpath export needs. Do not add tsup or similar. Both decisions:
[docs/decisions/2026-08-11-build-tooling.md](docs/decisions/2026-08-11-build-tooling.md).

## Commands

`npm run lint`, `lint:md`, `check:links`, `check:conventions`, `typecheck`, `build`, `test`,
`check:publish`, `test:pack` — CI runs all nine in that order.

**`check:conventions` enforces the rules in this file that lint, typecheck and the suite cannot
see**, which before it existed was all of them: the zero-dependency claim, integer-only arithmetic,
coded errors, `{@link}` targets, the reality of every `TCT_` code named in a `@throws`, the
decision-record format, fixture provenance, whether
[docs/coding-standards.md](docs/coding-standards.md) still names real commands and paths, that a
validation suite is named for the fixture it validates, that an exported config is imported by one,
that a suite in `test/computation/` is named for a module there, and that **a generated document does
not hardcode a count its generator computes** — `docs/names/rabjung.md` read "Four values are marked,
at positions …" beside an interpolated list for three commits, and there were five positions and nine
cells. Each of those fails silently
rather than loudly. When you add a rule here, check whether `scripts/check-conventions.mjs` can hold
it, and write the failing case before the check — a guard that has never failed proves nothing.

**The script now proves its own predicates on every run**, before any rule, reporting "the checker
itself is broken" rather than a violation. That is not decoration: the `test/computation/` naming
rule was first written to split a suite name on its first `-`, which rejects
`mean-astronomy.test.ts` — a file that was already correct — and only reading caught it. Two kinds
of check, catching **disjoint** failures, so write both. An **invariant derived from the tree**
catches what nobody thought of: "every module's own name is an acceptable suite name" fails the
segment-splitting predicate immediately and mentions no filename. A **literal case** catches what
the invariant cannot see: an equality-only predicate satisfies that invariant and still rejects
`calendar-leap-index-threshold`. When this was demonstrated by mutation, the invariant caught the
real bug and all three literal cases passed.

Not every predicate can have an invariant, and a vacuous one is worse than none because it reads as
coverage. The validation-suite rule deliberately has no invariant: the obvious one is symmetric in
its arguments, so it holds under the correct comparison and a reversed one alike, and reversal is
the only interesting way that rule breaks.

`lint:md` runs markdownlint against `.markdownlint.jsonc`. It does **not** check semantic line
breaks; markdownlint has no such rule, and `MD013` is off because it fights the convention.

The last two are the only checks that see the **published** package. Every test imports from
`src/`, so a broken `exports` map, a file missing from `files`, or a `dist/` layout that does not
match `exports` is invisible to the suite and fails only for a consumer, after publishing.
`check:publish` runs publint and attw against the manifest; `test:pack` packs the tarball, installs
it into a scratch directory **outside** the repository — a `node_modules` copy inside the working
tree would be picked up by Biome, the link checker and Vitest — and imports both subpaths.

`attw` runs under `--profile esm-only`. Its `node10` and `node16-cjs` rows are the deliberate
design, not defects: there is no `main` field and no CJS build. Do not add `main` to make a row
green.

**Three commands are deliberately outside CI, and all are release-time checks.** `npm run coverage`
(below), `npm run verify:names`, which re-derives the whole Tibetan name vocabulary from Janson and
re-checks it against Wiktionary, THL and CLDR, and `npm run verify:rabjung-names`, which does the
same for the sixty rabjung year names against Janson, the Indic saṃvatsara list, Sewell & Fleet,
**Monier-Williams via the Cologne scan** (the Sanskrit senses, uncapped and citing a printed page),
**wisdomlib** (the Bṛhat Saṃhitā's cycle position, and which non-MW lexicons carry a headword) and
Wiktionary — which is now only a second attestation, never the sense source, because its Sanskrit
senses **are** Monier-Williams verbatim and corroborating it with anything MW-derived would be MW
agreeing with itself. Both need the network and two converters installed outside the repo, so neither
can gate a push — what gates a push is their committed output, `test/fixtures/names.ts` and
`test/fixtures/rabjung-names.ts`, which the suite reads.

**`verify:rabjung-names` emits one row per line and Biome reflows it, so run
`npx biome check --write test/fixtures/rabjung-names.ts` after every run.** This has always been
required and was never written down, and it surfaces as an unattributed formatting diff — `biome
check .` reports it without naming the file, and the obvious suspects are the files you just edited
rather than the one the generator rewrote. Provenance is checked before a release;
integrity is checked on every push.

**Both verifiers carry corrections to their sources as data, and a correction must self-invalidate.**
It states the value it expects to find and refuses to run if the source no longer says it, so a
correction that stops being needed fails loudly instead of silently patching a source that has since
been fixed. There is one in the vocabulary — `spen ma` → `spen pa` — and eight in the rabjung names,
resting on three different kinds of evidence: Sewell & Fleet read directly (60 अक्षय → क्षय, 31
हेविळम्बि → हेमलम्ब), attestation (15, 37), Monier-Williams resolving a headword the table's spelling
does not reach (4 प्रमोदूत → प्रमोद), a homograph caught by reading the *sense* rather than the
presence of an entry (9 युव, the dual pronoun, → युवन्; 56 दुन्दुभी, a Gandharvī's name, → दुन्दुभि), and a
typo the source contradicts itself about (57 रूधिर → रुधिर). Do not patch a name by editing the output.

**A correction is not a lookup rung, and conflating them inflates both.** A correction changes what
the table *prints* and needs authored evidence; a rung of the ladder in `scripts/indic.ts` changes
only what is *queried* and states a rule of Sanskrit — the `-in` stems printed in the nominative, the
anusvāra spellings, a missing virāma. Eleven of the sixty rows resolve only through a rung, and an
earlier draft was going to write all of them up as editorial judgements.

**`npm run coverage` is not one of the nine, so nothing gates it.** It was broken on `main` for an
unknown stretch and nobody noticed: the 200-year moon-phase sweep runs in well under a second bare
but takes 5–8 seconds under v8 instrumentation, against Vitest's 5s default, so `test` passed while
`coverage` failed. The long sweeps now carry explicit timeouts. Run it before a release, and give
any new multi-century test an explicit timeout rather than discovering this again.

Run it for what it *reports*, not only to keep it passing. An unreachable-line report is how the
2026-08-13 review pass found that a new config check sat after the `scaleTo` call that already
guarded the same condition — the test passed, because both throws carry the same code, and only
coverage showed the check could never run.

`check:links` validates relative markdown links and `#fragments` against the filesystem. Docs
here cross-reference heavily, so renaming or deleting one breaks inbound links silently; fix them
in the same commit.

## Conventions

Technical identifiers are lowercase (`nyamlen`, `@nyamlen`); the brand is capitalised
(`Nyamlen`). npm rejects uppercase package names, so this is a constraint, not a preference.

Markdown uses semantic line breaks — one sentence or clause per line, so diffs stay limited to
the sentence that changed. `.markdownlint.jsonc` disables the rules that fight this (`MD013`
above all). Do not re-wrap prose to satisfy a linter, and do not remove those exclusions.

**Test files must not export, and a shared helper goes in `test/support/`.** Biome enforces the
first; the second is what it forces. This is not cosmetic — `names.test.ts` briefly imported a guard
from `unicode-tibetan.test.ts`, which made vitest **re-run that file's 28 tests** as part of the
importer. The suite reported 669 tests where 641 existed. A count that quietly inflates is worse
than a lint error.

**In a sweep over thousands of fixture rows, collect violations and assert once.** Do not call
`expect` per row with a message built from a `Temporal` date: eleven thousand rows times six
assertions killed a vitest worker outright, reported only as `Worker exited unexpectedly`. Push
failures onto an array and `expect(bad).toEqual([])` — one assertion, and the message names every
offending date instead of only the first.

`biome.json` carries one formatter override, raising `lineWidth` for
`test/fixtures/fpmt-observances.ts`. Its rows run to 174 characters because they carry observance
labels, and at the default width Biome explodes each into eight lines — turning a reviewable
one-row-per-line fixture into a 12k-line one. `scripts/fixture-row.mjs` documents the same problem
for the cross-check fixtures, which avoid it by staying short. Do not remove the override.

Decision records document a **constraint a contributor would otherwise violate**, not a replay of
how a choice was weighed. Records that only narrate deliberation get deleted — planning artifacts
stay out of the repo, as `CONTRIBUTING.md` already states.

Their format is fixed: filename `YYYY-MM-DD-slug.md`, YAML front matter carrying only `date` and
`status` (`accepted` / `superseded` / `deprecated`), a single H1 title, then a bold `**Decision:**`
line stating the outcome before any reasoning. Do not put `title` in the front matter — it
duplicates the H1 and makes markdownlint read the file as having two titles.
