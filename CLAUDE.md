# tibetan-calendar-temporal

Tibetan calendar (Phugpa tradition) computation engine. Pure TypeScript, zero runtime
dependencies, built on Temporal.

- Architecture, API design, core types: [docs/architecture.md](docs/architecture.md)
- Testing strategy and validation sources: [docs/testing.md](docs/testing.md)
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

**Fixtures are generated, not transcribed.** `test/fixtures/losar.ts` and `sixty-year-cycle.ts`
come from `scripts/extract-janson-fixtures.mjs`, which parses the LaTeX; the three
`crosscheck-*.ts` files come from their own `scripts/fetch-*-fixtures.mjs`. Re-run those rather
than editing the output. Hand-copying 120 dates is how a silent one-day error reaches the primary
correctness gate — and an early draft of `docs/testing.md` did exactly that, dating Losar 2026 to
17 February instead of 18.

The one deliberate exception is `test/fixtures/fpmt-holy-days.ts`, which is hand-curated because
FPMT publishes its dates in prose announcements with no feed to parse. Do not "fix" it by trying
to generate it, and do not delete it for breaking the rule. Its safeguards are that it is short
enough to check by eye, every row carries its source URL, and every row was confirmed against
three independent implementations first. See `docs/testing.md`.

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
- **Pure stateless functions.** Same input, same output, no side effects.
- **Tradition constants are injected** via `TraditionConfig`, never hardcoded. v1 ships
  `PHUGPA` only, but Tsurphu must remain addable without touching the algorithm.

## Environment

Node 26 required for development — Temporal ships enabled by default from 26.0.0. Verified
working on v26.7.0. The *published* package needs no particular version; consumers supply
Temporal.

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
the structure the `./practice` subpath export needs. Do not add tsup or similar. Both decisions:
[docs/decisions/2026-08-11-build-tooling.md](docs/decisions/2026-08-11-build-tooling.md).

## Commands

`npm run lint`, `check:links`, `typecheck`, `build`, `test` — CI runs all five in that order.

`check:links` validates relative markdown links and `#fragments` against the filesystem. Docs
here cross-reference heavily, so renaming or deleting one breaks inbound links silently; fix them
in the same commit.

## Conventions

Technical identifiers are lowercase (`nyamlen`, `@nyamlen`); the brand is capitalised
(`Nyamlen`). npm rejects uppercase package names, so this is a constraint, not a preference.

Markdown uses semantic line breaks — one sentence or clause per line, so diffs stay limited to
the sentence that changed. `.markdownlint.jsonc` disables the rules that fight this (`MD013`
above all). Do not re-wrap prose to satisfy a linter, and do not remove those exclusions.

Decision records document a **constraint a contributor would otherwise violate**, not a replay of
how a choice was weighed. Records that only narrate deliberation get deleted — planning artifacts
stay out of the repo, as `CONTRIBUTING.md` already states.

Their format is fixed: filename `YYYY-MM-DD-slug.md`, YAML front matter carrying only `date` and
`status` (`accepted` / `superseded` / `deprecated`), a single H1 title, then a bold `**Decision:**`
line stating the outcome before any reasoning. Do not put `title` in the front matter — it
duplicates the H1 and makes markdownlint read the file as having two titles.
