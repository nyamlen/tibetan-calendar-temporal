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

## Beyond v1

- **Tsurphu tradition** (Karma Kagyu) via a second `TraditionConfig` — the algorithm already
  supports it; only the constants differ.
- `@nyamlen/timer` and `@nyamlen/vows` as sibling packages under the org scope.
