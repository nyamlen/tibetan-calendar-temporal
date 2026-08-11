# Roadmap

## Implementation Phases

| Phase | Scope | Effort |
|-------|-------|--------|
| 0 | Scaffold (npm init, tsup, vitest, fast-check, CI) | 2h |
| 1 | Core computation: Layers 0-3 (Janson §2-8) | 20h |
| 2 | Validation: FPMT fixtures, cross-check against reference implementations | 12h |
| 3 | Practice day logic (config-driven rules, Gelug default config) | 8h |
| 4 | TypeDoc + release workflow + publish v1.0.0 | 6h |

**Safe timeline: 3 weeks** (accounts for debugging edge cases in doubled/skipped day logic)

The layers referenced in Phase 1 are defined in [architecture.md](architecture.md); the
validation sources in Phase 2 are listed in [testing.md](testing.md).

**Decide during Phase 1:** whether anything replaces the dropped Temporal calendar adapter —
most likely a Temporal-shaped `TibetanDate` class with `add` / `until` / `with`. Deferred
deliberately, because defining what `add({months: 1})` means across leap months, doubled days
and skipped days is a domain question best answered once the computation exists. See
[decisions/2026-08-11-temporal-custom-calendars.md](decisions/2026-08-11-temporal-custom-calendars.md).

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
- [x] Cloudflare **auto-renew** confirmed on both domains 2026-08-11 (they expire 2027-08-11).
      Unlike every other item here this has no external signal — registrar auto-renew
      preference is not published in RDAP — so it is recorded on report, not verified
- [x] DNSSEC enabled on both domains — DS records verified live 2026-08-11
- [x] `nyamlen.com` → `nyamlen.app` 301 redirect, path-preserving, apex and www — verified
      2026-08-11
- [ ] **At app launch:** add a proxied `www` CNAME on `nyamlen.app` plus a redirect to the
      apex. The canonical host is `nyamlen.app` without www, but `www.nyamlen.app` currently
      does not resolve at all, so anyone typing it dead-ends
- [ ] Decide whether to register `nyamlen.org` and `nyamlen.dev` (both free as of 2026-08-11)
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
- [x] Grant the `nyamlen:developers` team read-write on the package — done 2026-08-11, verified
      with `npm access list packages nyamlen:developers`. Note the listed **owner** remains
      `boffies`: unscoped packages carry no org affiliation, and npm exposes no self-service
      ownership transfer to an organisation. Team access is the achievable outcome and is
      sufficient — it is what lets CI publish under org-controlled permissions. `npm access
      list collaborators` will not show this; it only lists user-level collaborators
- [ ] Create a **granular access token** for CI, scoped to this package only, read-write, with
      an expiry. npm tokens are always issued by a *user*, never by an org — create it as an
      account with write access. Store it as a GitHub **organisation-level** secret so sibling
      packages can reuse it

**Release workflow (Phase 4)**

- [ ] `.github/workflows/release.yml` publishing on tag, with `permissions: id-token: write`
      and `actions/setup-node` given `registry-url: 'https://registry.npmjs.org'` — that line
      generates the `.npmrc` that reads `NODE_AUTH_TOKEN`; without it the token is ignored and
      the publish goes out anonymous
- [ ] Add `"provenance": true` to `publishConfig` rather than passing `--provenance` at the
      call site
- [ ] Confirm `repository.url` still matches the building repo. Provenance attestation fails if
      they disagree — currently correct, but it would have broken had the repo not been
      transferred to the org before v1
- [ ] Diarise the token expiry. An expired token breaks releases silently, months later

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
