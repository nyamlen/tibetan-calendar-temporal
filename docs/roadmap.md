# Roadmap

## Implementation Phases

| Phase | Scope | Effort |
|-------|-------|--------|
| 0 | Scaffold (npm init, tsup, vitest, fast-check, CI) | 2h |
| 1 | Core computation: Layers 0-3 (Janson §2-8) | 20h |
| 2 | Validation: FPMT fixtures, cross-check against reference implementations | 12h |
| 3 | Practice day logic (config-driven rules, Gelug default config) | 8h |
| 4 | Temporal adapter + TypeDoc + publish v1.0.0 | 8h |

**Safe timeline: 3 weeks** (accounts for debugging edge cases in doubled/skipped day logic)

The layers referenced in Phase 1 are defined in [architecture.md](architecture.md); the
validation sources in Phase 2 are listed in [testing.md](testing.md).

## Release Status

| Version | State |
|---------|-------|
| 0.0.1 | Published placeholder — reserves the npm name, exports nothing |
| 1.0.0 | Target: full Phugpa implementation, published from CI with npm provenance |

The repository stays private under the `nyamlen` org until v1.0.0, then goes public.

## Outstanding — near term

Setup work not yet done. Nothing here blocks starting Phase 1 except the Node upgrade.

- [ ] Install **Node 26** — required for native Temporal before Phase 1 (currently v24.13.1,
      which does not have it enabled)
- [ ] GitHub org: set display name `Nyamlen`, description, and **require 2FA for all members**
- [ ] Cloudflare: confirm **auto-renew** on both domains (they expire 2027-08-11), enable
      **DNSSEC**, add a `nyamlen.com` → `nyamlen.app` redirect rule
- [ ] Decide whether to register `nyamlen.org` and `nyamlen.dev` (both free as of 2026-08-11)
- [ ] Switch the `nyamlen.com` → `nyamlen.app` redirect from **302 to 301** once `nyamlen.app`
      actually serves the app. It is deliberately temporary for now: `nyamlen.app` has no
      A/AAAA records yet, and a 301 to a dead host is cached hard by browsers and awkward to
      undo
- [ ] Record `Melong` as the name of the practice review screen in the app spec

## Pre-v1.0.0 checklist

Decisions deliberately deferred during setup, each with the reason it was deferred. Work
through this before publishing v1.0.0 — several are one-way doors once published.

**Package**

- [ ] Remove the `STATUS` export from `index.js` — placeholder only
- [ ] Remove the placeholder banner from `README.md`
- [ ] Revisit `engines: ">=22"`. Correct for the stub, which needs nothing, but the real engine
      uses Temporal at runtime. Decide whether to require Node 26 or keep it advisory and let
      consumers supply a polyfill
- [ ] Decide whether to add a `main` field. `exports` supersedes it on modern toolchains;
      it is only insurance for older bundlers
- [ ] Add `types` to the `exports` map once TypeScript declarations are built

**Publishing**

- [ ] Publish from **GitHub Actions with npm provenance**, not locally — provenance ties each
      released version to the commit that built it, which reinforces the clean-room record
- [ ] Create an npm **automation token** for CI, and require 2FA for manual publishes

**Repository**

- [ ] Make the repository **public**
- [ ] Enable **branch protection** on `main`: require CI to pass, and block force-pushes.
      Force-push protection matters here specifically — the commit history is the clean-room
      evidence of independent derivation, and a rewrite would undermine it
- [ ] Enable **tag protection** for release tags
- [ ] Convert the remaining items here into GitHub issues under a v1.0.0 milestone. A checklist
      in a file is fine for a solo private repo; once there are contributors, issues are better

> Branch, tag and draft-PR features are unavailable on GitHub Free for **private** org repos.
> All of them return at no cost the moment the repository goes public, so the two items above
> are sequenced together deliberately.

## Beyond v1

- **Tsurphu tradition** (Karma Kagyu) via a second `TraditionConfig` — the algorithm already
  supports it; only the constants differ.
- `@nyamlen/timer` and `@nyamlen/vows` as sibling packages under the org scope.
