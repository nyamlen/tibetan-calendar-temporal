# Coding standards

Every rule this project holds, and **what fails when you break it**.

That last part is the reason this file exists separately from the others.
[CLAUDE.md](../CLAUDE.md) states each rule together with the failure that produced it, which is what makes the rules persuasive; [CONTRIBUTING.md](../CONTRIBUTING.md) is the on-ramp.
Neither says which rules a machine will catch and which depend on somebody noticing.
This one does, and the honest answer differs by rule.

Read the **Enforced by** column first.
A rule with a command beside it will stop a push. A rule marked **review** will not — those are the ones to hold in your head, and the ones worth automating next.

## Runtime and language

| Rule | Enforced by | Why |
|---|---|---|
| `Temporal.PlainDate` everywhere; never `Date` | `npm run lint` — Biome `noRestrictedGlobals`, scoped to `src/**` | `Date` carries a zone and a time of day, and its arithmetic is not deterministic across platforms |
| ESM only; `"type": "module"`, no dual CJS build | `npm run typecheck`, `npm run check:publish` | [decisions/2026-08-11-build-tooling.md](decisions/2026-08-11-build-tooling.md) |
| Node 26+; the package checks for `Temporal` at import time | `engines` + the runtime guard in `src/computation/conversion.ts` | npm treats `engines` as advisory, so the guard covers the case the declaration cannot |
| Zero runtime dependencies | `npm run check:conventions` | The package's headline claim, and it runs through the lockfile as well as the runtime |
| No bundler; `tsc` alone emits `dist/` | `npm run check:publish`, `npm run test:pack` | The `./observances` subpath needs `dist/` to mirror `src/` |
| Never install Temporal typings — no `temporal-spec`, no `temporal-polyfill` | **review** | TypeScript 7 ships `lib.esnext.temporal.d.ts`; the zero-dependency claim runs through the published `.d.ts` |
| Generation-time packages resolve from the caller's working directory, never from `devDependencies` | **review** | `scripts/verify-name-sources.mjs` and `scripts/fetch-eszthoff-fixtures.mjs` both do this |

## Arithmetic and correctness

| Rule | Enforced by | Why |
|---|---|---|
| Integer arithmetic only; every division outside `src/computation/arithmetic.ts` carries an `exact:` comment saying why it cannot lose precision | `npm run check:conventions` | A float here is not a crash — it is a date that is right on one platform and wrong on another |
| Pure functions, judged by what a **caller** can observe | **review** | Memoising is therefore allowed, and is already done three times |
| A cache keys on the config object, not only the year | **review** | A config-blind cache serves one tradition's answers for another, and would pass nearly every test |
| A cache never hands out shared mutable state | **review** | One consumer's `sort()` otherwise corrupts the next consumer's |

`PHUGPA` and `PHUGPA_HENNING` diverge at month level in only four years between 1500 and 2500, which is why a config-blind cache passes the suite.

## API surface and errors

| Rule | Enforced by | Why |
|---|---|---|
| Only the barrel in `src/index.ts` makes a name public | `test/public-api.test.ts` pins the list and each name's kind | Exporting from a module under `src/` does not publish it — that is how `describeMonth` and `asPlainDate` are shared without being API |
| The `*For` accessors in `cycles.ts` wrap the `*Of` lookups in `names.ts`, one character apart | **review** — deliberately not renamed | `elementNameFor` calls `elementNameOf` on the same line. Writing the public name where the internal one belongs **compiles**, since both return `TibetanName`, and recurses infinitely rather than failing to typecheck. Judged not worth the churn on 2026-08-17 once the modules stopped sharing a name; recorded so the hazard is known rather than rediscovered |
| What earns a public slot is decided by a rule with a scope | [decisions/2026-08-12-public-surface.md](decisions/2026-08-12-public-surface.md) — **review** | The **wrong-or-impossible** test governs computation internals and contested conventions; a thin composition over public functions is judged differently. The record was misapplied once and cost the surface four functions |
| A **tradition config** is exported only once its dates are validated day by day against an external calendar | `npm run check:conventions` (every exported config must be **imported** by a suite in `test/validation/`), plus [decisions/2026-08-16-exported-means-validated.md](decisions/2026-08-16-exported-means-validated.md) | A config is a factual claim about a calendar, not an API-design question. Tsurphu and the Mongolian version are fully expressible with validated leap months and stay unexported, because nothing checks a *date* |
| Imported, not mentioned — a comment or a `describe` title does not evidence a config | `npm run check:conventions` (namespace and default imports are deliberately not matched, and would fail loudly rather than pass silently) | The rule grepped concatenated suite text until 2026-08-17, so deleting a suite's assertions while leaving the prose behind kept it green |
| Errors carry codes; throw through `rangeError`, `codedError` or `assertInternal` in `src/errors.ts` | `npm run check:conventions` | The code is the part consumers branch on, and a bare construction silently omits it |
| `SkippedDayError` is the only error class and stays the only one | **review** | [decisions/2026-08-12-error-codes-not-classes.md](decisions/2026-08-12-error-codes-not-classes.md) |
| `TCT_FIELD_OUT_OF_RANGE` for a wrong **number**; `TCT_INVALID_ARGUMENT` for the wrong **kind of thing** | **review** | Only the first is on `tibetanDateExists`'s allowlist, which is what makes a caller's type confusion throw rather than be reported as a date that does not exist — [decisions/2026-08-15-argument-errors-split.md](decisions/2026-08-15-argument-errors-split.md) |
| `tibetanDateExists` swallows by **allowlist**, never denylist | **review** | As a denylist, one bare `RangeError` in `scaleTo` made it report that Losar 2026 does not exist |
| Codes are contract; message text is not | `test/public-api.test.ts` asserts the codes | Assert on the code in tests, and never tell a consumer to match wording |
| Every `TCT_` code named in `src/` — in a `@throws` or a `codedError` call — is a real union member | `npm run check:conventions` | Both are string literals, so a typo is not a type error: it sends a consumer branching on a code that is never thrown |
| `noUncheckedIndexedAccess` is discharged with `assertInternal`, not a cast | `npm run check:conventions` (the cast route needs no `new Error`, so this is partly **review**) | A cast lets a bad index return `undefined` wearing the element type |

## Configuration and extension

| Rule | Enforced by | Why |
|---|---|---|
| Tradition constants are injected via `TraditionConfig`, never hardcoded | `test/validation/tradition-config.test.ts`, `test/validation/cross-version-leap.test.ts` | Tested rather than asserted: Bhutan was added on 2026-08-16 with two new config fields and no change to any formula. Tsurphu and the Mongolian version must stay equally addable |
| The **rules** are injected too, not only the numbers | `test/computation/calendar-leap-index-threshold.test.ts` | This promise was false until 2026-08-16: every constant was injected while the leap-month rule was hardcoded to Phugpa's 48/49 |
| A bound proved from a config's numbers is **derived** from that config | **review** | The `±3` search window was proved from Phugpa's tables and written as a literal, then broke 8% of days for a wider table. It is now `ScaledTradition.searchHalfWidth` |
| Every consumer config gets a validator, memoised per object | `src/traditions/validate.ts`, `src/observances/types.ts` — **review** for new config types | `TraditionConfig` went unchecked for three phases because the failure looked like a language error |
| A field the type declares **required** is rejected when absent, not merely when wrong | **review** | `undefined` is the likelier input, and it silently inherited whichever branch came last |
| An internal caller skipping a guard gets a separate name, like `isoFromJulianDayUnchecked` | **review** | The boundary is the whole exported surface; leaving the export bare removes it |
| The shipped configs are deeply frozen | `test/public-api.test.ts`, `test/validation/observances.test.ts` | Scaling and validation are both memoised on the config object, so a post-freeze mutation yields neither the old constants nor the new ones but a stale mix |

## Tests and fixtures

| Rule | Enforced by | Why |
|---|---|---|
| Fixtures are generated by a committed script, not transcribed | `npm run check:conventions` | Hand-copying 120 dates is how a silent one-day error reaches the primary correctness gate |
| `test/fixtures/fpmt-holy-days.ts` and `test/fixtures/rgob.ts` are the only hand-curated fixtures | `npm run check:conventions` (allowlisted by name) | Both earn it the same narrow way — the source has **no markup at all**, so a generator could only wrap a lossy reading. FPMT publishes in prose; the Royal Government of Bhutan publishes a scanned PDF with no text layer. "Parsing it is inconvenient" is not the test |
| A fixture declaring only types is exempt from provenance, and is checked **before** the generator lookup | `npm run check:conventions` | `crosscheck-row.ts` has nothing to transcribe. Checked first because the generators emit an import naming it, so it would otherwise pass by accident — a provenance rule passing for the wrong reason is worse than one that fails |
| Every file in `test/fixtures/` imports only from `test/fixtures/` | **review** | That closure is what lets "fixtures do not depend on the engine" be true by inspection. `test/support/` is not engine-free — `versions.ts` imports from `src/` — so a shared fixture type belongs in `fixtures/`, not `support/` |
| Test files must not export; a shared helper goes in `test/support/` | `npm run lint` — Biome `noExportsInTest` | An import across test files makes vitest re-run the imported file; the suite once reported 669 tests where 641 existed |
| An unused import fails the build | `npm run lint` — Biome `noUnusedImports`, **escalated to `error`** | It is recommended but defaults to `warn`, and `biome check` passes on warnings. Escalated so Rule 10 cannot be satisfied by an import left behind after its assertions were deleted |
| A validation suite is named for the fixture, or fixture prefix, it validates, and lives in `test/validation/` | `npm run check:conventions` (`test/validation/observances.test.ts` allowlisted by name) | Parity is what lets a reader find the test for a fixture without opening anything. It drifted: a suite called `bhutan-fixture.test.ts` sat under a third test directory of its own invention |
| Taking a fixture as *input* does not make a test a validation suite | `npm run check:conventions` — the rule is deliberately blind outside `test/validation/` | `test/computation/conversion.test.ts` imports `losar` and is named for its module, correctly. This is the half a later sweep gets wrong |
| A suite in `test/computation/` is named for a `src/computation/` module, optionally narrowed as `<module>-<concept>` | `npm run check:conventions` (longest-prefix, **not** first `-` segment — that rejects `mean-astronomy.test.ts`, which is already correct) | Two suites were named for a *concept* instead. A suite spanning several modules is not a computation suite: `leap-month-position.test.ts` touches four and belongs at `test/` root |
| A generated document may not hardcode a count the generator computes | `npm run check:conventions` — a literal English number-word in the same **sentence** as a `${}` interpolation, in the markdown template a generator emits | `docs/names/rabjung.md` read "Four values are marked, at positions 6, 15, 31, 37, 60" for three commits: the list is interpolated, the word is a literal, and there were five positions and nine marked cells. Digits are not flagged — `${n} of the 60` is legitimate — and the sentence boundary is load-bearing, or the rule fires on a pronoun two sentences away |
| The checker's own predicates are proved before any rule runs | `npm run check:conventions` — `selfTest()`, on every invocation, reporting "the checker itself is broken" rather than a violation | Eleven rules and nothing proved any fired. The Rule 11 predicate was wrong once and was caught by reading. Invariants derived from the tree and literal cases catch **disjoint** failures: the first-segment bug fails the invariant and passes all three literal cases |
| In a sweep over thousands of rows, collect violations and assert once | **review** | Eleven thousand rows times six assertions killed a vitest worker, reported only as `Worker exited unexpectedly` |
| Any multi-century test carries an explicit timeout | **review** | The 200-year moon-phase sweep runs in under a second bare and 5–8 seconds under v8 instrumentation, against vitest's 5s default — `test` passed while `coverage` failed, for an unknown stretch |
| README examples stay true | `test/readme.test.ts` | Change an example, update the test in the same commit |
| Guide examples stay true | `test/guide.test.ts` | `docs/guide.md` ships to npm, so its examples are contract exactly as the README's are. A suite named for one document while guarding another is one nobody thinks to update |
| The README is a landing page: pitch, install line and one runnable example in its first 40 rendered lines | **review**, and [decisions/2026-08-23-readme-is-the-landing-page.md](decisions/2026-08-23-readme-is-the-landing-page.md) | It reached 950 lines by accretion, each addition justified, with the install command at line 103 and the trust argument at 903. Nothing mechanical catches a document getting worse one reasonable commit at a time |
| A validation window is stated in `docs/testing.md`, quoted only by `docs/why-trust-these-dates.md`, and linked to by everything else | **review** | Five copies of a number is a number that will drift. Deliberately unguarded: every available predicate fires on `docs/validation-sources.md` itself and on any honest limitations section, and a guard that fires wrongly is worse than none |

## Documentation

| Rule | Enforced by | Why |
|---|---|---|
| Relative links and `#fragments` resolve | `npm run check:links` | Docs here cross-reference heavily, so a rename breaks inbound links silently |
| Markdown structure | `npm run lint:md` | Rule exclusions and their reasoning live in `.markdownlint.jsonc` |
| **Semantic line breaks** — one sentence or clause per line | **review** | Markdownlint has no rule for this, and `MD013` is switched off precisely because it fights the convention. Diffs stay limited to the sentence that changed |
| Decision records: `YYYY-MM-DD-slug.md`, front matter of only `date` and `status`, one H1, a bold `**Decision:**` line before any reasoning | `npm run check:conventions` | A `title` key duplicates the H1 and makes markdownlint read two titles |
| A decision record documents a **constraint a contributor would otherwise violate** | **review** | Records that only narrate deliberation get deleted — planning artifacts stay out of the repo |
| Comments only for non-obvious logic or architectural constraints | **review** | |
| Lowercase technical identifiers; capitalised `Nyamlen` brand | **review** | npm rejects uppercase package names, so this is a constraint rather than a preference |
| Docblocks are contract — they reach the shipped `.d.ts` | `npm run check:conventions` checks `{@link}` targets; `test/docblock-examples.test.ts` asserts every `@example` stating a value; prose claims are **review** | A stale docblock is a false contract statement, not a tidying issue. The example suite found `leapMonthOfYear` documenting `2153 → 6` when 2153 has no leap month at all |

### Sanskrit and Tibetan terminology

These govern the **prose** in `docs/` and `README.md`. All **review**.

They do **not** govern a tabulated or shipped data column. Those follow a published standard —
THL Simplified for phonetics — because house style cannot be verified against anything, and a
column nothing can check is a column nothing can defend. `docs/names/rabjung.md`'s phonetic column
was house style until 2026-08-21 and is now THL, generated rather than written.

- Sanskrit terms carry full IAST diacritics plus Devanāgarī, with no comma between them.
- Tibetan terms are formatted `English term (IAST Devanāgarī; Tibetan script pronunciation)`.
- Phonetic renderings are italicised, lowercase except for proper nouns, and reflect spoken Lhasa dialect rather than Wylie — devoicing, tonal register, lost prefixes and superscripts, and the sandhi rules including final ས → n before a vowel-initial syllable.
- Omit the final tsheg on isolated terms, and prefer canonical Tibetan terms.

The Wylie and Tibetan-script columns of the shipped vocabulary are **not** governed by this — they are generated and verified by `npm run verify:names`.

## Sources and provenance

| Rule | Enforced by | Why |
|---|---|---|
| The clean-room constraint — never read `eszthoff/*` source, never add either as a dependency | **review**, and the commit history is the evidence | The history is the proof of independent derivation, and it is worth what the claim that nobody read the alternative is worth. Not a licence argument: `tibetan-date-calculator` declares MIT in `package.json` and has since 2019, though no repository or tarball carries a `LICENSE` file |
| Janson's LaTeX source, never PDF-extracted text | **review** | `pdftotext` has already produced three wrong formulas here, none of which crash |
| Cite by section and content, never by a rendered equation or table number | **review** | `T12` and `T60` are labels, not table numbers |
| A name needs five independent checks, not one Janson table | `npm run verify:names`, whose committed output `test/fixtures/names.ts` the suite reads | His weekday table gives Saturday as `spen ma`; his own Bhutan appendix gives `spen pa` |
| Corrections to a name live in `scripts/verify-name-sources.mjs` as data carrying their evidence | **review** | Do not patch a name by editing `src/names.ts` |
| Check whose **lineage** a source is before citing it as corroboration | **review** | Janson's sixty-year name table is "taken from [Henning]" by his own LaTeX, so his Sanskrit column and Henning's are one witness, not two. It was treated as the Tibetan-lineage authority for months. The independent witness is Csoma de Kőrös (Calcutta 1834) |
| A check in a generator goes **above** the emit gate, and is proved by mutation | **review** — nothing can see an unreachable guard | `verify-rabjung-names.mjs` writes its fixture straight after the `problems` gate, and the divergence self-invalidation sat below that write. Its comment promised the run would fail; it never could, and only a deliberate mutation revealed it |
| A hand-read source is checked mechanically, not trusted | `npm run verify:rabjung-names` | Csoma's sixty Tibetan-script readings cannot be OCR'd — no text layer, and the braces are typography. Each is reduced to a consonant skeleton that must match Janson's ASCII or Csoma's own Roman, so a misread glyph fails the run. `test/fixtures/rgob.ts` earns the same exception and has no such check, which is the difference to keep in mind |
| Commits are incremental and tied to the paper's sections in `src/`, batched in `docs/` | **review** | Granular commits earn their place where they show derivation; in docs they are noise |

## Required checks

CI runs these nine, in this order, on Ubuntu, Windows and macOS.
All nine run locally with the same commands.

```sh
npm run lint
npm run lint:md
npm run check:links
npm run check:conventions
npm run typecheck
npm run build
npm test
npm run check:publish
npm run test:pack
```

The last two are the only checks that see the **published** package.
Every test imports from `src/`, so a broken `exports` map, a file missing from `files`, or a `dist/` layout that does not match `exports` is invisible to the suite and fails only for a consumer, after publishing.

`attw` runs under `--profile esm-only`. Its `node10` and `node16-cjs` rows are the deliberate design, not defects — there is no `main` field and no CJS build.

### Three release-time checks, deliberately outside CI

| Command | Why it cannot gate a push |
|---|---|
| `npm run verify:names` | Needs the network and two EWTS converters installed outside the repo. What gates a push is its committed output; provenance is checked before a release, integrity on every push |
| `npm run coverage` | Not gated by anything, and was broken on `main` for an unknown stretch. Run it before a release, and run it for what it *reports* — an unreachable-line report is how a redundant config check was found |
| `npm run bench` | Shared runners are noisy enough that a threshold would fire on the runner rather than on the change, and a guard that fires wrongly is worse than none. Run it before a release and record the harness in `bench/RESULTS.md`; it already corrected a shipped figure, the `getObservances` span cap's cost |

**A performance number may be quoted only with its harness.** The project refuses unsourced numbers from its calendar sources, and the rule applies to its own: machine, OS, Node version and date, as `bench/RESULTS.md` records them. `CLAUDE.md`'s `monthsFor` cache figures were asserted for months before anything measured them.

## Adding a rule

If you find a convention worth holding, add it here **with its enforcement column filled in**, even if the answer is **review**.
A rule that is not in this table is not a rule anybody can be held to, and a **review** row is a visible backlog item rather than a silent gap.

If the rule is mechanically checkable, it belongs in `scripts/check-conventions.mjs`.
Write the failing case first and confirm the check reports it — a guard that has never failed proves nothing.
That script also verifies this document against reality: every `npm run` command and every path it names must exist, so the map cannot quietly drift the way a prose restatement would.
