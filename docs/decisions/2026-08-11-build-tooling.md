---
date: 2026-08-11
status: accepted
---

# Build tooling: TypeScript 7 and no bundler

**Decision:** the build uses TypeScript 7 with `"lib": ["ES2024", "ESNext.Temporal"]`, and no
bundler — `tsc` emits ESM and declarations directly. Taken during the Phase 0 scaffold.

Two entries in the architecture tooling table were written before the project's constraints
settled, and re-reading them before scaffolding — as the roadmap instructed — showed both were
wrong. Recording the reasoning so neither is re-litigated.

## TypeScript 7, not 5.x

`Temporal` is in this package's public type surface: `TibetanDate.isoDate` is a
`Temporal.PlainDate`. Something has to declare that type.

Nothing in the obvious places does. Verified by unpacking the published tarballs:

- **TypeScript 5.9.3** — no `Temporal` in any `lib.*.d.ts`. Its `lib.esnext.*` set has no
  temporal entry.
- **`@types/node` 26.2.0** — nothing. Temporal is a language builtin, not a Node API, so this
  is correct behaviour rather than an omission.
- **TypeScript 7.0.2** — ships `lib.esnext.temporal.d.ts`, referenced from `lib.esnext.d.ts`.

Note that TS 7's lib files are **not** in the `typescript` package itself. That package is a
365 KB wrapper; the compiler and its libs are delivered through 20 platform-specific
`optionalDependencies` (`@typescript/typescript-linux-x64` and friends). Looking only at the
wrapper suggests, wrongly, that TS 7 has no Temporal either.

So the choice was:

| Option | Cost |
|--------|------|
| **TS 7** | New (weeks old). Breaks TypeDoc. |
| TS 5.9 + `temporal-spec` | A types-only devDep as a second source of truth for Temporal's shape, free to drift from what V8 actually implements. |
| TS 5.9 + hand-written ambient declaration | Hand-maintained, and collides with any consumer that declares its own global `Temporal`. |

TS 7 wins because `"lib": ["ES2024", "ESNext.Temporal"]` declares `Temporal` as a **global**.
Emitted `.d.ts` files reference the global, so consumers install nothing — the zero-dependency
property holds all the way through the public types, which neither alternative achieves.

Verified after install: `npm ls` shows no `temporal-*` package anywhere, and both typecheck and
the Vitest smoke test pass.

### What this costs

TypeScript 7's npm package does not expose the classic compiler API. Anything built on it —
TypeDoc, API Extractor, ts-morph — cannot run until individually ported. Vitest and Biome are
unaffected (esbuild transform and a Rust parser respectively; neither depends on `typescript`),
so Phases 0–3 are clear. **TypeDoc in Phase 4 is the live problem**, tracked in
[roadmap.md](../roadmap.md) with a fallback: a docs-only `typescript@5.9` plus `temporal-spec`
for the TypeDoc pass, leaving build and tests on TS 7.

The `ESNext.Temporal` lib also sits under `esnext`, which TypeScript may change in any minor
release. Mild — it tracks a stage-3 proposal that has already shipped in engines.

## `tsc`, not tsup

tsup entered the tooling table with no recorded rationale. It is the conventional default for
TypeScript libraries because it does bundling, dual CJS/ESM output, and `.d.ts` generation from
one config.

Each of those is cancelled by a rule this project already holds:

- **Bundling** — there is nothing to bundle. Zero runtime dependencies.
- **Dual CJS/ESM** — explicitly ruled out. ESM only.
- **One-config `.d.ts`** — `tsc`'s declaration emit is the reference implementation. When the
  public type surface is a core deliverable, generating it with the compiler rather than a
  wrapper is the lower-risk option.

The `./practice` subpath export also wants `dist/` to *mirror* `src/` rather than be flattened,
which is `tsc`'s default behaviour and something a bundler has to be configured not to undo.
Speed was tsup's remaining advantage, and TS 7's native compiler largely erases it.

This is **not** a zero-dependency argument. That rule governs runtime dependencies only;
devDependencies are unconstrained. The argument is that tsup adds a layer that buys nothing here.

Costs accepted: `dist/` publishes more files than a bundle would, and there is no minification —
both irrelevant for a library. If a browser bundle or CJS build is ever wanted, a bundler comes
back; architecture.md currently rules both out.

## Also decided

- **`noUncheckedIndexedAccess`** is on. The Kālacakra sine tables are fixed-length arrays indexed
  by computed values, where an unchecked index yields a silently wrong date rather than a crash —
  precisely the failure this project cannot afford.
- **`.gitattributes` normalises to LF.** Biome formats to LF, and with `core.autocrlf=true` a
  Windows checkout would fail `npm run lint` locally while passing in CI.
- **Changesets and TypeDoc are deferred to Phase 4**, where the roadmap already places release
  work.
