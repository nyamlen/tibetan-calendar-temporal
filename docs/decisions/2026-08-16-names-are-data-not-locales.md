---
date: 2026-08-16
status: accepted
---

# Names are data on the value, not a function of a locale

**Decision:** a Tibetan name ships as a `TibetanName` — `{ tibetan, wylie, phonetic }` — grouped
under a `*Name` field on the value it names. There is **no locale parameter** and **no language
field**. The string unions (`TibetanElement`, `TibetanGender`, `TibetanAnimal`, `TibetanPlanet`) are
the internationalisation contract, and localised *weekday* names come from `Intl`.

## The two things this forbids

A contributor will reasonably propose both. Neither is an oversight.

1. **A locale parameter** — `weekdayNameFor(date, "fr")`.
2. **A language field** on `TibetanName` — `english`, `french`, `russian`.

## Why not a locale parameter

**It mis-describes the domain.** Wylie, Tibetan script and THL phonetics are three renderings of
**one** language — script and transcription variance — not three languages. BCP 47 models that
badly: you end up at `bo`, `bo-Latn`, and private-use subtags like `bo-Latn-x-thl`. A locale
parameter would be the wrong abstraction, not merely a heavier one.

**It would create a promise this package cannot keep.** `weekdayNameFor(d, "fr")` *looks* as though
it also returns French element and animal names. It cannot: shipping those would mean authoring
translations in languages nobody here reads, which is the failure mode the sourcing rules exist to
prevent. That leaves three bad answers — ship translations we cannot source, throw on `fr`, or fall
back silently to English. The API shape would have manufactured the expectation.

**Unknown-locale policy has two defensible answers**, and by
[2026-08-12-public-surface.md](2026-08-12-public-surface.md) a thing with two defensible answers
belongs in injected config rather than on the surface.

**A name object is falsifiable; a locale tag is not.** `src/index.ts` states that everything on the
root entry point makes a falsifiable claim. `weekdayName.wylie === "spen pa"` is checkable against a
source — and is checked, five ways, by `scripts/verify-name-sources.mjs`. A locale tag is a
convention.

## Why `TibetanName` carries no English

Not an omission to be helpfully filled in later: **it would be redundant.** `elementName.gloss`
would be `"fire"`, and `TibetanYearName.element` is *already* `"fire"`. Same for the animal, the
gender and the planet.

The English identity lives in the string unions, and that is precisely what makes them usable as
message-catalogue keys. Adding a gloss would duplicate the key beside the thing it keys, and invite
a `french` field next to it.

Where a genuine translation exists and has nowhere else to live — the sixty rabjung names, whose
Tibetan forms are mostly semantic translations of Sanskrit — it belongs on *that* type as an
explicit `meaning`, where its *authored, unsourced* standing can be attached honestly rather than
hidden in a field shared with sourced content.

## What a non-English consumer actually gets

**Weekday names in any locale, free**, because the Tibetan weekday is the same seven-day cycle as
the Western one:

```ts
date.isoDate.toLocaleString("fr", { weekday: "long" }); // "mercredi"
```

Verified on Node v26.7.0 across `fr`, `ru`, `mn`, `de`, `ja`, `bo` and `dz`.

**Everything else through 26 stable identifiers** — five elements, two genders, twelve animals,
seven planets — which a consumer maps in their own catalogue. Their docblocks say they are contract,
so nobody "improves" a member's spelling.

CLDR is a convenience and never this package's authority: it gives the script form only, with a
trailing tsheg this project omits on isolated terms, from whatever ICU build the host happens to
have — the same posture `src/observances/index.ts` already takes toward `localeCompare`.

## Field order is part of the decision

`tibetan` comes first. Field order drives `JSON.stringify` output and editor hover, so it signals
what the package treats as *the name*; Wylie and phonetics are ways of reaching it.

**Shipping script alone was considered and rejected.** Culturally the script is primary, but in this
package's provenance chain the **Wylie is primary** — it is what Janson prints and what the EWTS
converters take as *input*, with the script derived from it. Script-only would ship the
least-sourced representation and discard the most-sourced one. It would also strand phonetics, which
are not consumer-derivable (they need devoicing, tone and sandhi, which is why THL is a published
standard), and degrade to tofu wherever a Tibetan font is missing.

## The one tradition-dependent piece

Weekday *naming* varies: Bhutan names its days one planet ahead of Tibet. That lives in
`TraditionConfig.naming`, a nested optional sub-object rather than a flat field, because nothing in
it is read by the algorithm. Nesting keeps the boundary visible and gives month naming — also
tradition-dependent, and needing four more members — somewhere to go.

When a second member is added, **name it for what the rule does, never for a tradition**. A
`"phugpa" | "tsurphu"` selector inside a tradition-agnostic config is the same anti-pattern as
branching on `config.id`.
