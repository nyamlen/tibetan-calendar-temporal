# tibetan-calendar-temporal

> ## ⚠️ Placeholder release
>
> **This package does not work yet.** v0.0.1 exports nothing but a status string. It exists to
> reserve the name while the engine is built.
>
> Everything below describes the **planned** API, not shipped behaviour. Do not depend on this
> package until v1.0.0.

A Tibetan calendar computation engine for the Phugpa tradition (Men-Tsee-Khang standard),
built on [Temporal](https://tc39.es/proposal-temporal/docs/).

Converts between Western (ISO) and Tibetan dates, handles leap months and skipped/doubled
days, and determines practice days.

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

An optional Temporal Calendar Protocol adapter is exposed at
`tibetan-calendar-temporal/temporal`.

## Provenance

Implemented from Svante Janson, *Tibetan Calendar Mathematics*
([arXiv:1401.6285](https://arxiv.org/abs/1401.6285)) as a clean-room build. It shares no code
with any existing implementation.

## Requirements

Node 26 for native Temporal. Earlier versions need a polyfill supplied by the consumer.

## Licence

MIT — see [LICENSE](LICENSE). Fork it, build on it, ship commercial products with it.

Full specification: [PROJECT.md](PROJECT.md).
