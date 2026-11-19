---
date: 2026-09-13
status: accepted
---

# An object carrying names keys each language explicitly

**Decision:** a shipped object that carries a name holds it as `tibetanName: TibetanName` and, where a
sourced Sanskrit name exists, `sanskritName: SanskritName` beside it — never a bare `name`, never a
language code. `SanskritName` is `{ iast, devanagari }`, with no `meaning`, and its Devanāgarī is
transliterated from the IAST by a verifier rather than typed. `ElementalYoga` follows this, and
`Rabjung.name` was renamed `tibetanName` to follow it.
An object that *is* a name rather than carrying one — `TibetanWeekdayName extends TibetanName` — stays
flat, and so does `TibetanYearName`, whose `elementName`, `genderName` and `animalName` are the precedent.

**Amended 2026-09-14, two rules added:**

- **The key comes first.** In every shipped object, the English key a reader recognises precedes the
  name objects it identifies — `{ season, part, tibetanName }`, `{ englishName, tibetanName,
  sanskritName, … }`. A global rule, not a yoga one: an English word printed after two name blocks
  reads as describing the second of them.
- **A name's English rendering is `englishName`.** Where the English is a translation of the name
  itself — a yoga's *siddhi* as "accomplishment" — it ships as `englishName: string` beside
  `tibetanName` and `sanskritName`, first by the rule above. It replaced `ElementalYoga.english`.
  `meaning` was rejected because it reads as the meaning of something else. A key that is not a
  translation of a name — `season`, `part` — keeps its own word.

**Amended 2026-09-15: three shapes, and which one applies.** Decided by Andreas while applying the rule
to `./astrology`.

| Shape | When | Precedent |
|---|---|---|
| Flat sibling fields — `element` + `elementName` | An object that **is** a name, whose parts are each named | `TibetanYearName` |
| Nested `{ englishName, tibetanName, … }` | A value with its own name, inside an object that has its own `tibetanName` | `ElementalYoga`, `ElementalYoga.auspiciousness` |
| A `tibetanNames` object, last, keyed by the English fields it names | A block of **several labels** that are not names of the block itself | `YearAttributes`, `MonthAttributes`, `LunarDayAttributes`, `CalendarDayAttributes` |

The third was chosen over sibling fields (`animalName`, `powerName`, …) because an English reader sees
the block unchanged, a Tibetan reader looks a label up by the same word, and the year would otherwise
have gained `powerName` and `lifeName`, which read as "the name of the power". Its cost is a one-letter
neighbour: `yoga.tibetanName` is the yoga's own name and `month.tibetanNames` is a set of names for the
month's labels. And because nothing ties the two halves of a block together, **a label added without
its Tibetan entry would ship unnamed** — `test/astrology/index.test.ts` derives each block's labels
from its own string fields and fails on any mismatch, and was proved by mutation.

A value that has an English name in no source ships **without** `englishName` rather than with an
authored one, when an identifier already keys it: `LunarMansion` carries `index`, `tibetanName` and
`sanskritName`. The evidence is in
[names/mansion-and-trigram-sourcing.md](../names/mansion-and-trigram-sourcing.md).

**Amended 2026-11-19, two clarifications.** Decided by Andreas after the adversarial review.

- **`TraditionConfig.name` is a display label, not a name keyed by language.** It holds whatever form
  the config's author chooses (`"Phugpa"`, `"Bhutanese (Henning a₂)"`) and is used in messages to say
  which tradition refused. "Phugpa" is a Tibetan word, so `englishName` would be false, and the field
  carries no sourcing. It is the one bare `name` this rule allows; a sourced `tibetanName` can be
  added beside it later without breaking a config.
- **A composed name is a kind of authored name.** An English name joined from dictionary glosses, each
  re-checked by a verifier — `"restorative"` from *gso ba* "to restore" and *thub pa* "to be able" — is
  authored, and its docblock keeps the word "composed" because that says how it was authored.

## What a contributor would otherwise do

**Add a field called `name`.** It reads naturally and it is what `Rabjung` had. It is wrong once a
second language can exist: `name` beside `sanskrit` makes the Tibetan the unmarked default and the
Sanskrit an attribute, and it says nothing about which language `name` is in.

**Key the languages by code — `bo` and `sa`.** Short and standard, and rejected for four reasons:

1. A language-keyed object reads as a **localisation map**, the way `Intl` and CLDR use one, inviting
   `names[locale]` and an expected `en` sibling. These objects hold one name and its renderings; the
   English lives in `season`, `englishName` and the other keys.
2. **`bo` is the wrong code.** In CLDR it is modern Standard Tibetan. These are Classical Tibetan
   calendrical terms, ISO 639-3 `xct`, and Bhutan writes the same vocabulary under `dz`.
3. **A language code does not say which script.** Sanskrit is attested in Tibetan script for the
   rabjung names. Saying Devanāgarī and IAST precisely takes BCP 47 script subtags, which do not work
   as keys.
4. `bo: TibetanName` names one thing in two vocabularies on one line.

**Nest the renderings as `tibetan: TibetanName`.** Rejected in
[2026-08-21-rabjung-names-carry-both.md](2026-08-21-rabjung-names-carry-both.md) and still rejected:
the script would be `x.tibetan.tibetan`. `tibetanName.tibetan` does not have that problem.

**Flatten the Tibetan renderings onto the owning object.** Considered for the yogas as "shape ii", and
rejected once the Sanskrit was decided to ship: the Tibetan would sit at one depth (`x.wylie`) and the
Sanskrit at another (`x.sanskritName.iast`), where nesting puts both names at the same depth.

## Why `SanskritName` has no `meaning`

Every object that carries one already has exactly one English meaning beside it — `season` for a
six-season name, `englishName` for a yoga — and a second can disagree with the first, forcing someone to
decide which is authoritative. For a name in the lunar-mansion system the meaning would be circular
("the month Māgha"), and *pragati* has no Monier-Williams entry to take one from. Adding the field later
breaks nobody; removing it breaks everyone, and it has come off once already, with the rabjung Sanskrit.

## Why the Devanāgarī follows the IAST

Transliterating one from the other means the two fields always spell the same word. Where
Monier-Williams heads the word differently — *saṃpanna* संपन्न against his सम्पन्न — the dictionary is
reached through a stated normalisation rule, and the name is not changed to match the dictionary.

## Scope

This governs names. It does not reach the rabjung's two Sanskrit lists, which are not a
`SanskritName` and would return, if ever, in the structure recorded in
[2026-08-25-rabjung-ships-the-tibetan-name-only.md](2026-08-25-rabjung-ships-the-tibetan-name-only.md).
