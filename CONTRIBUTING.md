# Contributing

Thanks for considering it. Validation data and edge cases are especially welcome — see
[Contributing validation data](#contributing-validation-data).

**Read the clean-room constraint below before writing any code.** It is the one rule that
cannot be fixed after the fact.

## ⚠️ Clean-room constraint

**Do NOT look at or reference the source code of `eszthoff/tibetan-date-calculator` or
`eszthoff/tibetan-calendar-temporal`.**

These repositories have no licence file, which makes their code legally all-rights-reserved.
Any contribution derived from them would compromise this project's MIT licence for everyone.
Our implementation must derive solely from Janson's paper, which is freely available academic
work.

**You MAY:**

- Run those libraries locally and compare *computed outputs* — dates are facts, not
  copyrightable expression
- Read their public README for API design inspiration
- Compare your computed dates against theirs for validation

**You MUST NOT:**

- Copy algorithms, variable names, or code structure from their source
- Use either as a fork base
- Reference their internal implementation decisions

If you have previously read that code closely, please say so in your pull request. It is not
automatically disqualifying, but we need to know.

The commit history is this project's evidence of independent derivation. Keep commits
incremental and tied to the paper's sections rather than squashing large amounts of work into
one commit.

## Development environment

- **Node.js 26 required for development** — Temporal ships enabled by default from 26.0.0
  (released May 2026). It is *Current*, not LTS, until roughly October 2026
- Node 24 can expose Temporal via `node --harmony-temporal`, but that is V8's **in-progress**
  implementation and may not match the shipped spec. Do not validate calendar output against
  it — the whole point of this engine is deterministic, reproducible dates
- Node 22+ works with `temporal-polyfill` if you cannot upgrade
- The *published* package runs anywhere (compiled ESM output; consumers provide Temporal)

```sh
npm install
npm test
```

## Implementing from the paper

Every formula comes from Svante Janson, *Tibetan Calendar Mathematics*
([arXiv:1401.6285](https://arxiv.org/abs/1401.6285)). The source layout mirrors its sections —
see [docs/architecture.md](docs/architecture.md).

Two rules that are easy to violate accidentally:

- **Integer arithmetic only.** All Phugpa math uses integer division with fixed denominators.
  No floating point anywhere — it is what makes results identical across platforms.
- **No hardcoded tradition constants.** Anything Phugpa-specific belongs in a
  `TraditionConfig`, so Tsurphu can be added later without touching the algorithm.

## Contributing validation data

The most useful contribution. Fixtures are JSON files under `test/fixtures/`, cross-checked in
CI on every commit:

```json
// test/fixtures/fpmt-2026.json
[
  { "iso": "2026-02-17", "event": "Losar 2153", "tibYear": 2153, "tibMonth": 1, "tibDay": 1 },
  { "iso": "2026-05-17", "event": "Saka Dawa begins", "tibMonth": 4, "tibDay": 1 }
]
```

When adding fixtures, cite the source in the pull request — ideally a published almanac or an
[FPMT dharma dates](https://fpmt.org/media/resources/dharma-dates/) page. Data traceable to a
recognised authority is worth far more than data from an unattributed calculator.

Full strategy and the list of validation sources: [docs/testing.md](docs/testing.md).

## Repository contents

What belongs in the public repo:

- `README.md` — install, usage, API overview, supported traditions
- `CONTRIBUTING.md` — this file
- `LICENSE`, `CLAUDE.md`
- `docs/` — architecture, testing, roadmap, decision records, generated API reference
- `src/`, `test/`

What stays out: planning artifacts, agent scaffolding (`.kiro/`, `.serena/`), and any document
referencing app monetisation or white-label commercials. Contributors care about the library,
not how it came to be built.

## Conventions

Lowercase for every technical identifier, capitalised for the human-facing brand (`Nyamlen`).
npm rejects uppercase in package names, so this is a hard constraint rather than a style
preference.

| Slot | Form |
|------|------|
| npm package and scope | `nyamlen`, `@nyamlen` |
| GitHub org URL | `github.com/nyamlen` |
| Domains | `nyamlen.app`, `nyamlen.com` |

## Licence

Contributions are accepted under the MIT licence — see [LICENSE](LICENSE). By opening a
pull request you agree your contribution may be distributed under those terms.
