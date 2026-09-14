---
date: 2026-09-14
status: accepted
---

# Month names return every seasonal system, with no selector and no default

**Decision:** `monthNamesFor` returns the lunar-mansion name and the month's place in all four seasonal systems at once — `fourSeasons.month1LateWinter`, `fourSeasons.month1EarlySpring`, `fourSeasons.tigerEarlySpring` and `sixSeasons.month3EarlySpring` — and takes no system selector. No `TraditionConfig` names a default system. Do not add either until a source settles which system a tradition uses.

## The constraint this protects

Two rules in this repository read, out of context, as calling for a selector, and both would be misapplied here.

- `CLAUDE.md`'s "two defensible answers means it belongs in injected config" applies when a function must return **one** answer. This one returns all of them, so it chooses nothing, and there is nothing for config to decide.
- `docs/roadmap.md` once promised a "seasonal-system selector" on the tradition. That model was wrong: Janson's month-names section enumerates the systems as independent rules, says almanacs "often give two or several different versions", and prints two of them side by side in his own Phugpa table. A tradition does not have *a* seasonal system.

## Why no default either

The two authorities who attribute a system to Tsurphu disagree on which one. Janson calls the month-1-late-winter identification "now used by the Tsurphu tradition"; Henning (p. 196) makes Tsurphu's month 1 early spring, with late winter as one teacher's "Kālacakra point of view". Janson's Bhutan appendix says only that month names "exist as in Tibet … but are usually not used". A default would therefore assert something no source here supports.

Adding a default later is an optional config member, so it is non-breaking; removing one is not.

## Why one composition and no per-system primitive

A per-system function, `monthNameFor(month, { system })`, was considered beside the composition and dropped. Picking a system from the composition is a property read, so the primitive added surface without adding capability — and `monthNameFor`/`monthNamesFor` differ by one letter, the same hazard the `*Of`/`*For` renames removed.
