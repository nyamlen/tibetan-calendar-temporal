---
date: 2026-09-14
status: accepted
---

# Month names return every seasonal system, with no selector and no default

**Decision:** `monthNamesFor` returns the lunar-mansion name and the month's place in all four seasonal systems at once — `fourSeasons.month1LateWinter`, `fourSeasons.month1EarlySpring`, `fourSeasons.tigerEarlySpring` and `sixSeasons.month3EarlySpring` — and takes no system selector. No `TraditionConfig` names a default system. Do not add either until a source settles which system a tradition uses.

## The constraint this protects

Two rules in this repository read, out of context, as calling for a selector, and both would be misapplied here.

- `CLAUDE.md`'s "two defensible answers means it belongs in injected config" applies when a function must return **one** answer. This one returns all of them, so it chooses nothing, and there is nothing for config to decide.
- `docs/development/roadmap.md` once promised a "seasonal-system selector" on the tradition. That model was wrong: Janson's month-names section enumerates the systems as independent rules, says almanacs "often give two or several different versions", and prints two of them side by side in his own Phugpa table. A tradition does not have *a* seasonal system.

## Why no default either

The two authorities who attribute a system to Tsurphu disagree on which one. Janson calls the month-1-late-winter identification "now used by the Tsurphu tradition"; Henning (p. 196) makes Tsurphu's month 1 early spring, with late winter as one teacher's "Kālacakra point of view". Janson's Bhutan appendix says only that month names "exist as in Tibet … but are usually not used". A default would therefore assert something no source here supports.

Adding a default later is an optional config member, so it is non-breaking; removing one is not.

## Why one composition and no per-system primitive

A per-system function, `monthNameFor(month, { system })`, was considered beside the composition and dropped. Picking a system from the composition is a property read, so the primitive added surface without adding capability — and `monthNameFor`/`monthNamesFor` differ by one letter, the same hazard the `*Of`/`*For` renames removed.

## Amended 2026-09-17: the mansion member's Sanskrit is the mansion's, not the month's

`mansion` gained a `sanskritName`, and it holds the **mansion's** name — *maghā* for month 1, where the Indian month derived from that mansion is *māgha*.

The constraint this protects is the one in
[2026-09-13-names-keyed-by-language.md](2026-09-13-names-keyed-by-language.md): a name block holds one name in several languages, so `tibetanName` and `sanskritName` must render *the same name*. Tibetan uses the bare mansion name as the month name and Sanskrit derives a second word for it, so pairing *mchu* with *māgha* would put two different names in one block. Do not "complete" the block by swapping in the month form.

An Indian month name may still ship, but as a sibling member — working name `indianMonth` — never inside `mansion`. It needs its own sourcing rule: the Mahāvyutpatti's month column prints `jeṣṭhaḥ`, `aśviniḥ` and a marked `mṛgaśīrṣaḥ`/`mārgaśīrṣaḥ` variant, so rule (A) cannot simply be reused, and Janson's column has the typo `Kārtikka`.

## Amended 2026-09-18: `indianMonth` shipped, with `sanskritName` alone

It carries each month's Sanskrit name under Monier-Williams' defining entry, with month 5 *jyeṣṭha* a stated exception; the evidence is in [../names/month-and-yoga-sourcing.md](../names/month-and-yoga-sourcing.md#the-indian-month-names).

**Do not give it a `tibetanName`.** The block rule above applies in reverse: Tibetan has no word for the Indian month apart from the mansion name, so the only Tibetan available is `mansion.tibetanName`, and pairing *mchu* with *māgha* is exactly the two-names-in-one-block error that rule forbids.

Month 8 carries the pair name *bhadrapadā* rather than either member, and there is deliberately **no mansion index on this member** though `LunarMansion` has one: a day is in exactly one mansion, while a month can be named for two. Both, and the evidence, are in
[../names/mansion-and-trigram-sourcing.md](../names/mansion-and-trigram-sourcing.md).
