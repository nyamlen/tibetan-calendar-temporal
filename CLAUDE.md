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

Permitted: running those libraries locally and comparing *computed dates* against ours. Dates
are facts, not copyrightable expression. Reading their public README for API-design ideas is
also fine.

Not permitted: copying algorithms, variable names, or code structure; forking either as a base;
referencing their internal implementation decisions.

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
