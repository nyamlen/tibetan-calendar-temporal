# tibetan-calendar-temporal

> ## ⚠️ Placeholder release
>
> **This package does not work yet.** v0.0.1 exports nothing but a status string. It exists to
> reserve the name while the engine is built.
>
> Everything below describes the **planned** API, not shipped behaviour. Do not depend on this
> package until v1.0.0.

A TypeScript library that computes Tibetan calendar dates according to the Phugpa tradition
(Men-Tsee-Khang standard), built on
[Temporal](https://tc39.es/proposal-temporal/docs/).

It converts between Western (ISO) and Tibetan dates, handles leap months and skipped/doubled
days, and determines practice days. Open source, MIT licensed, with zero runtime dependencies.

## Design

- **Temporal-native** — `Temporal.PlainDate` throughout, no legacy `Date`
- **Zero runtime dependencies** — Temporal is a language built-in
- **Integer arithmetic only** — deterministic, cross-platform-identical results
- **Tradition-agnostic** — astronomical constants injected via config; v1 ships Phugpa, the
  algorithm supports Tsurphu
- **Pure stateless functions** — memoizable, safe to offload to a worker
- **ESM only**

## Planned API

```js
import { isoToTibetan, tibetanToIso, getPracticeDays } from 'tibetan-calendar-temporal';
```

Full detail: [docs/architecture.md](docs/architecture.md).

## Requirements

Node 26 for native Temporal. Earlier versions need a polyfill supplied by the consumer.

## Why this exists

This engine is the computation backend for **Nyamlen**, a Tibetan Buddhist practice calendar
app (integrated modular PWA, separate repo). The app has additional modules — Meditation Timer,
Vow Tracker — but this library is the foundation: it computes what days are significant and
why.

The engine is separate from the app because:

- Other projects can use it (FPMT centres, independent developers)
- It's open source to build trust — practitioners need to trust the dates are correct
- Clean separation enables independent versioning and testing
- White-label apps can use the same engine with different practice day configs

## Provenance

Implemented from Svante Janson, *Tibetan Calendar Mathematics*
([arXiv:1401.6285](https://arxiv.org/abs/1401.6285)) as a clean-room build. It shares no code
with any existing implementation — see [CONTRIBUTING.md](CONTRIBUTING.md) for the rules that
keep it that way.

## Project identity

| Thing | Name |
|-------|------|
| npm package | `tibetan-calendar-temporal` (unscoped) |
| GitHub/npm org | `nyamlen` |
| Repository | `github.com/nyamlen/tibetan-calendar-temporal` |
| App (separate repo) | `Nyamlen` |

**Scoping policy.** The flagship engine stays unscoped — unscoped names rank better in npm
search, and discoverability is this package's job. Everything else in the suite ships scoped:
`@nyamlen/timer`, `@nyamlen/vows`.

## Documentation

| | |
|---|---|
| [docs/architecture.md](docs/architecture.md) | Layered model, API design, package structure, core types, tooling |
| [docs/testing.md](docs/testing.md) | Three-tier testing strategy and validation sources |
| [docs/roadmap.md](docs/roadmap.md) | Implementation phases and release status |
| [docs/decisions/](docs/decisions/) | Decision records — naming, licensing |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Clean-room constraint, dev setup, how to add validation data |

## Licence

MIT — see [LICENSE](LICENSE). Fork it, build on it, ship commercial products with it.

Reasoning behind the choice, including why GPL/AGPL and MPL-2.0 were set aside:
[docs/decisions/2026-08-11-licensing.md](docs/decisions/2026-08-11-licensing.md).
