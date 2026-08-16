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

The project-wide coding rules are in [docs/coding-standards.md](docs/coding-standards.md), which
also states, for each rule, whether a machine will catch a violation or whether it depends on
somebody noticing. Read the enforcement column before assuming CI has your back.

- **Node.js 26 required for development** — Temporal ships enabled by default from 26.0.0
  (released May 2026). It is *Current*, not LTS, until roughly October 2026
- Node 24 can expose Temporal via `node --harmony-temporal`, but that is V8's **in-progress**
  implementation and may not match the shipped spec. Do not validate calendar output against
  it — the whole point of this engine is deterministic, reproducible dates
- Node 22+ works with `temporal-polyfill` if you cannot upgrade, though `npm install` will warn:
  `package.json` declares `engines: ">=26"`, which npm treats as advisory unless `engine-strict`
  is set
- The *published* package is compiled ESM and runs anywhere Temporal exists. It does **not** ship
  a polyfill; it checks for `Temporal` at import time and throws a message naming Node 26 and
  `temporal-polyfill/global` if it is missing

```sh
npm install
npm test
```

CI runs `lint`, `lint:md`, `check:links`, `check:conventions`, `typecheck`, `build`, `test`,
`check:publish` and `test:pack`. All nine run locally with the same commands.

`check:conventions` covers the rules that lint, typecheck and the suite cannot see — the
zero-dependency claim, integer-only arithmetic, coded errors, `{@link}` targets, the
decision-record format and fixture provenance. Each of those fails *silently* rather than loudly,
which is why it needed its own gate; before it existed, nothing checked any of them.

The last two check the *published* package rather than the source. Everything else imports from
`src/`, which means nothing else can see a broken `exports` map, a file missing from `files`, or a
`dist/` layout that does not match what `exports` points at — those fail only for a consumer, after
publishing. `check:publish` runs `publint` and `attw` against the manifest; `test:pack` packs the
tarball, installs it into a scratch directory outside the repository, and imports both subpaths the
way a consumer would. Run them before touching `exports`, `files`, or the build output layout.

`attw` runs under `--profile esm-only`, which ignores its `node10` and `node16-cjs` rows. Both are
the deliberate design — no `main` field, no CJS build — not defects. Do not add a `main` field to
turn a row green; see [docs/roadmap.md](docs/roadmap.md).

`npm run check:links` validates every relative link in the markdown — the target file must
exist, and a `#fragment` must match a heading. Docs here cross-reference heavily, so a renamed
or deleted file breaks inbound links silently; the check exists because that has happened.
External URLs are deliberately not checked, since reaching the validation sources in
[docs/testing.md](docs/testing.md) from CI would only make the build flaky.

It lists candidates with `git ls-files --cached --others --exclude-standard`, not a directory walk —
`--others --exclude-standard` covers a brand-new file that has not been `git add`-ed yet, while
still respecting `.gitignore` so `node_modules` and `dist` are never walked. A file the check
should genuinely skip belongs in `.gitignore`, not in an untracked-but-uncommitted limbo.

**Two things in the docs are enforced by tests, not by review.** Every example in the README is
asserted in `test/readme.test.ts`, and the package's export surface is pinned in
`test/public-api.test.ts` against the API table the README publishes. Change a README example or
add an `export`, and update the matching test in the same commit — otherwise CI fails, which is
the point. See [docs/testing.md](docs/testing.md#contract-tests).

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

The most useful contribution. Fixtures are TypeScript modules under `test/fixtures/`,
cross-checked in CI on every commit:

```ts
// test/fixtures/fpmt-holy-days.ts
{ event: "Losar", iso: "2026-02-18", month: 1, day: 1, source: "https://fpmt.org/..." },
{ event: "Saka Dawa begins", iso: "2026-05-17", month: 4, day: 1, source: "https://fpmt.org/..." },
```

**Losar 2153 is 18 February 2026, not the 17th.** An earlier version of this file said the 17th,
which is day 30 of the *preceding* month — a date that looks entirely reasonable and is wrong.
Take dates from a source, never from memory, and check them against the engine before opening the
pull request.

Nearly all fixtures are **generated by a script rather than written by hand**, and the script is
committed alongside the output — `scripts/extract-janson-fixtures.mjs` for the paper's tables,
`scripts/fetch-*-fixtures.mjs` for the cross-check sources. If your source can be parsed or
queried, add a generator; hand-transcription is how a silent one-day error gets in.
`test/fixtures/fpmt-holy-days.ts` is the sole exception, because FPMT publishes prose.

When adding fixtures, cite the source **per row**, not just in the pull request — ideally a
published almanac or an [FPMT dharma dates](https://fpmt.org/media/resources/dharma-dates/) page.
Data traceable to a recognised authority is worth far more than data from an unattributed
calculator.

Full strategy and the list of validation sources: [docs/testing.md](docs/testing.md).

## Repository contents

What belongs in the public repo:

- `README.md` — install, usage, API overview, supported traditions
- `CONTRIBUTING.md` — this file
- `LICENSE`, `CLAUDE.md`
- `docs/` — architecture, testing, roadmap, decision records, generated API reference
- `src/`, `test/`
- `scripts/` — the fixture generators, and the link checker CI runs. Each generator is committed
  with the fixture it produces; that pairing is the provenance record

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
