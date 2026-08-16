# tibetan-calendar-temporal

Tibetan calendar (Phugpa tradition) computation engine. Pure TypeScript, zero runtime
dependencies, built on Temporal.

- Every rule, and **what fails when you break it**: [docs/coding-standards.md](docs/coding-standards.md) —
  the enforcement map. This file says *why* a rule exists; that one says whether a machine catches it
- Architecture, API design, core types: [docs/architecture.md](docs/architecture.md)
- Testing strategy and validation sources: [docs/testing.md](docs/testing.md)
- What differs between traditions, and the two source traps found while working it out:
  [docs/traditions.md](docs/traditions.md)
- Provenance of every Tibetan name string: [docs/name-sources.md](docs/name-sources.md)
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
Fetch `https://arxiv.org/e-print/1401.6285` — a gzipped `tibet.tex` — and read it with `gzip -dc`.
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
parses the LaTeX; the three `crosscheck-*.ts` files come from their own
`scripts/fetch-*-fixtures.mjs`; `names.ts` from `scripts/verify-name-sources.mjs`; `bhutan.ts` from
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

The one deliberate exception to the generated rule is `test/fixtures/fpmt-holy-days.ts`, which is
hand-curated because FPMT publishes *those* dates in prose announcements with no feed to parse.
That justification is narrower than it looks and does not extend to the calendars above. Do not
"fix" it by trying to generate it, and do not delete it for breaking the rule. Its safeguards are
that it is short enough to check by eye, every row carries its source URL, and every row was
confirmed against three independent implementations first. See `docs/testing.md`, which also states
the window that agreement actually covers — day-by-day external validation spans 2022–2027, against
a documented range starting 1447, so cite the window whenever citing the agreement.

`scripts/rabjung-names.data.json` is **not** a second exception, because it is not a fixture: no
test reads it, and nothing in `src/` depends on it. It holds the hand-written Lhasa-phonetic and
English columns of `docs/rabjung-names.md`, a reference table built to decide what `rabjung.name`
should carry. Keep it out of `test/fixtures/`, and keep the generated columns of that document
generated — the whole value of the table is that a reader can tell sourced columns from authored
ones at a glance.

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
- **Tradition constants are injected** via `TraditionConfig`, never hardcoded. v1 ships
  `PHUGPA` only, but Tsurphu must remain addable without touching the algorithm.

  **That promise was false until 2026-08-16, and the way it was false is the lesson.** Every
  *constant* was injected, but the **leap-month rule itself** was hardcoded to Phugpa's — Janson
  states a different one for each version (48/49 Phugpa, 0/1 Tsurphu, 46/47 Mongolian, 57/58
  Bhutanese). A Tsurphu config built from constants alone would have placed leap months in the wrong
  years, with no error and nothing about the output looking wrong. It is now
  `leapIndexThreshold`, and `β` and the true-month rounding term derive from it. When adding a
  tradition, check that the *rules* are injected too, not only the numbers.
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
  `test/public-api.test.ts` pins the list and each name's kind; a failure there means the surface
  changed, so decide whether that was intended before editing the list.
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

**No bundler.** `tsc` alone emits ESM and declarations, which keeps `dist/` mirroring `src/` —
the structure the `./observances` subpath export needs. Do not add tsup or similar. Both decisions:
[docs/decisions/2026-08-11-build-tooling.md](docs/decisions/2026-08-11-build-tooling.md).

## Commands

`npm run lint`, `lint:md`, `check:links`, `check:conventions`, `typecheck`, `build`, `test`,
`check:publish`, `test:pack` — CI runs all nine in that order.

**`check:conventions` enforces the rules in this file that lint, typecheck and the suite cannot
see**, which before it existed was all of them: the zero-dependency claim, integer-only arithmetic,
coded errors, `{@link}` targets, the reality of every `TCT_` code named in a `@throws`, the
decision-record format, fixture provenance, and whether
[docs/coding-standards.md](docs/coding-standards.md) still names real commands and paths. Each of
those fails silently rather than loudly. When you add a rule here, check whether
`scripts/check-conventions.mjs` can hold it, and write the failing case before the check — a guard
that has never failed proves nothing.

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

**Two commands are deliberately outside CI, and both are release-time checks.** `npm run coverage`
(below) and `npm run verify:names`, which re-derives the whole Tibetan name vocabulary from Janson
and re-checks it against Wiktionary, THL and CLDR. It needs the network and two converters installed
outside the repo, so it cannot gate a push — what gates a push is its committed output,
`test/fixtures/names.ts`, which the suite reads. Provenance is checked before a release; integrity
is checked on every push.

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
