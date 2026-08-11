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

Node 26 is required for native Temporal. Node 24 does not have it enabled — use
`temporal-polyfill` in tests if running on 24. The *published* package needs neither;
consumers supply Temporal.

## Conventions

Technical identifiers are lowercase (`nyamlen`, `@nyamlen`); the brand is capitalised
(`Nyamlen`). npm rejects uppercase package names, so this is a constraint, not a preference.
