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
| What earns a public slot is decided by a rule with a scope | [decisions/2026-08-12-public-surface.md](decisions/2026-08-12-public-surface.md) — **review** | The **wrong-or-impossible** test governs computation internals and contested conventions; a thin composition over public functions is judged differently. The record was misapplied once and cost the surface four functions |
| Errors carry codes; throw through `rangeError`, `codedError` or `assertInternal` in `src/errors.ts` | `npm run check:conventions` | The code is the part consumers branch on, and a bare construction silently omits it |
| `SkippedDayError` is the only error class and stays the only one | **review** | [decisions/2026-08-12-error-codes-not-classes.md](decisions/2026-08-12-error-codes-not-classes.md) |
| `TCT_FIELD_OUT_OF_RANGE` for a wrong **number**; `TCT_INVALID_ARGUMENT` for the wrong **kind of thing** | **review** | Only the first is on `tibetanDateExists`'s allowlist, which is what makes a caller's type confusion throw rather than be reported as a date that does not exist — [decisions/2026-08-15-argument-errors-split.md](decisions/2026-08-15-argument-errors-split.md) |
| `tibetanDateExists` swallows by **allowlist**, never denylist | **review** | As a denylist, one bare `RangeError` in `scaleTo` made it report that Losar 2026 does not exist |
| Codes are contract; message text is not | `test/public-api.test.ts` asserts the codes | Assert on the code in tests, and never tell a consumer to match wording |
| `noUncheckedIndexedAccess` is discharged with `assertInternal`, not a cast | `npm run check:conventions` (the cast route needs no `new Error`, so this is partly **review**) | A cast lets a bad index return `undefined` wearing the element type |

## Configuration and extension

| Rule | Enforced by | Why |
|---|---|---|
| Tradition constants are injected via `TraditionConfig`, never hardcoded | `test/validation/tradition-config.test.ts`, `test/traditions/` | v1 ships Phugpa only, but Tsurphu must be addable without touching the algorithm |
| The **rules** are injected too, not only the numbers | `test/computation/leap-index-threshold.test.ts` | This promise was false until 2026-08-16: every constant was injected while the leap-month rule was hardcoded to Phugpa's 48/49 |
| A bound proved from a config's numbers is **derived** from that config | **review** | The `±3` search window was proved from Phugpa's tables and written as a literal, then broke 8% of days for a wider table. It is now `ScaledTradition.searchHalfWidth` |
| Every consumer config gets a validator, memoised per object | `src/traditions/validate.ts`, `src/observances/types.ts` — **review** for new config types | `TraditionConfig` went unchecked for three phases because the failure looked like a language error |
| A field the type declares **required** is rejected when absent, not merely when wrong | **review** | `undefined` is the likelier input, and it silently inherited whichever branch came last |
| An internal caller skipping a guard gets a separate name, like `isoFromJulianDayUnchecked` | **review** | The boundary is the whole exported surface; leaving the export bare removes it |
| The shipped configs are deeply frozen | `test/public-api.test.ts`, `test/validation/observances.test.ts` | Scaling and validation are both memoised on the config object, so a post-freeze mutation yields neither the old constants nor the new ones but a stale mix |

## Tests and fixtures

| Rule | Enforced by | Why |
|---|---|---|
| Fixtures are generated by a committed script, not transcribed | `npm run check:conventions` | Hand-copying 120 dates is how a silent one-day error reaches the primary correctness gate |
| `test/fixtures/fpmt-holy-days.ts` is the sole hand-curated exception | `npm run check:conventions` (allowlisted by name) | FPMT publishes those in prose with no feed to parse; every row carries its source URL |
| Test files must not export; a shared helper goes in `test/support/` | `npm run lint` — Biome `noExportsInTest` | An import across test files makes vitest re-run the imported file; the suite once reported 669 tests where 641 existed |
| In a sweep over thousands of rows, collect violations and assert once | **review** | Eleven thousand rows times six assertions killed a vitest worker, reported only as `Worker exited unexpectedly` |
| Any multi-century test carries an explicit timeout | **review** | The 200-year moon-phase sweep runs in under a second bare and 5–8 seconds under v8 instrumentation, against vitest's 5s default — `test` passed while `coverage` failed, for an unknown stretch |
| README examples stay true | `test/readme.test.ts` | Change an example, update the test in the same commit |

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
| Docblocks are contract — they reach the shipped `.d.ts` | `npm run check:conventions` checks `{@link}` targets; the rest is **review** | A stale docblock is a false contract statement, not a tidying issue |

### Sanskrit and Tibetan terminology

These govern the prose in `docs/` and `README.md`, and the phonetic columns of `docs/rabjung-names.md`.
All **review**.

- Sanskrit terms carry full IAST diacritics plus Devanāgarī, with no comma between them.
- Tibetan terms are formatted `English term (IAST Devanāgarī; Tibetan script pronunciation)`.
- Phonetic renderings are italicised, lowercase except for proper nouns, and reflect spoken Lhasa dialect rather than Wylie — devoicing, tonal register, lost prefixes and superscripts, and the sandhi rules including final ས → n before a vowel-initial syllable.
- Omit the final tsheg on isolated terms, and prefer canonical Tibetan terms.

The Wylie and Tibetan-script columns of the shipped vocabulary are **not** governed by this — they are generated and verified by `npm run verify:names`.

## Sources and provenance

| Rule | Enforced by | Why |
|---|---|---|
| The clean-room constraint — never read `eszthoff/*` source, never add either as a dependency | **review**, and the commit history is the evidence | Neither has a licence file, so both are all-rights-reserved |
| Janson's LaTeX source, never PDF-extracted text | **review** | `pdftotext` has already produced three wrong formulas here, none of which crash |
| Cite by section and content, never by a rendered equation or table number | **review** | `T12` and `T60` are labels, not table numbers |
| A name needs five independent checks, not one Janson table | `npm run verify:names`, whose committed output `test/fixtures/names.ts` the suite reads | His weekday table gives Saturday as `spen ma`; his own Bhutan appendix gives `spen pa` |
| Corrections to a name live in `scripts/verify-name-sources.mjs` as data carrying their evidence | **review** | Do not patch a name by editing `src/names.ts` |
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

### Two release-time checks, deliberately outside CI

| Command | Why it cannot gate a push |
|---|---|
| `npm run verify:names` | Needs the network and two EWTS converters installed outside the repo. What gates a push is its committed output; provenance is checked before a release, integrity on every push |
| `npm run coverage` | Not gated by anything, and was broken on `main` for an unknown stretch. Run it before a release, and run it for what it *reports* — an unreachable-line report is how a redundant config check was found |

## Adding a rule

If you find a convention worth holding, add it here **with its enforcement column filled in**, even if the answer is **review**.
A rule that is not in this table is not a rule anybody can be held to, and a **review** row is a visible backlog item rather than a silent gap.

If the rule is mechanically checkable, it belongs in `scripts/check-conventions.mjs`.
Write the failing case first and confirm the check reports it — a guard that has never failed proves nothing.
That script also verifies this document against reality: every `npm run` command and every path it names must exist, so the map cannot quietly drift the way a prose restatement would.
