---
date: 2026-11-11
status: accepted
---

# Observances are resolved from a named configuration, in a vocabulary the engine owns

**Decision:** every observance query names its `ObservanceConfig`; there is no default.
A configuration is plain JSON: rules whose `when` is one of the engine's six forms, the three conventions for doubled days, skipped days and leap months, and optionally the levels it groups its rules into.
The engine owns the arithmetic of every form and chooses no institution's answer; the configuration owns every convention, every level and every name.
The shipped configuration is an **example**, named as one, and FPMT's own set lives in the test suite.
This supersedes [2026-08-12-observance-policy.md](2026-08-12-observance-policy.md), whose core — conventions are injected data, never logic — it keeps.

## The constraint this exists to protect

There is still no right answer to encode.
Janson, following Berzin, puts an observance on the first of a doubled date; FPMT's guidance puts it on the second; Kopan Monastery and FPMT, both Gelug, kept the 2024 Chokhor Düchen on opposite days.
Janson says observances are "usually not celebrated in leap months"; FPMT printed that düchen inside leap month 6.
Who may keep a practice is a claim about initiation, and it differs between traditions and between centres of one tradition.
Anything the engine decides on any of these questions becomes a quiet, authoritative-looking wrong answer for everyone who follows the other.

## What this makes true

**A query names its configuration.**
`observancesOn(date, config, tradition?)`, `getObservances(from, to, config, tradition?)` and `nextObservance(from, ruleId, config, tradition?)` take the configuration positionally and the tradition last, under [2026-09-24-how-a-tradition-is-passed.md](2026-09-24-how-a-tradition-is-passed.md).
Do not add a default configuration: it makes the shipped example the package's silent answer, which is the institutional claim this record exists to prevent.
Making the configuration optional later would be additive; removing a default would not.

**`when` is a tagged union of six forms, and a new kind of rule is a new form in the engine.**
`monthly`, `annual`, `period`, `counted`, `formula` and `western`, told apart by `type`, never by which keys are present.
No form takes code, and the `formula` registry is a closed union implemented, documented and tested in the engine; a configuration names an entry and supplies no constants, because a formula with a free parameter is the start of an expression language.
A formula is named for its arithmetic, never for an identification a source does not make: the first entry is `lunarDayPlusWeekdayMod4`, not *agnivāsa*.

**Every rule is local or bounded, and no rule refers to another.**
A day's observances follow from that day's calendar facts, or from facts out to anchors the calendar locates within a fixed bound — back to the latest one and, for a counted schedule, forward to the next, which decides whether a day just before it is dropped.
That is what lets `observancesOn` agree with any slice of `getObservances`, and lets `nextObservance` search forward at all.
The ban on references is provisional; if one is ever needed, it is restricted references — acyclic, within one configuration, with bounds adding along a chain — never a rule defined by another's results.

**A setting a form cannot use is refused.**
Which forms use `doubledDay`, `skippedDay` and `leapMonth` is fixed per form; `monthly` does not use `leapMonth`, and `western` uses none.
A valid value on a form that does not use it throws, so a setting never looks effective while doing nothing; an invalid value keeps its own message, because the value is checked before its applicability.
For the same reason **an unknown key is refused** on a configuration, a rule, a level and a `when`: a misspelt field is a setting that does nothing.

**Levels are declared by the configuration, never fixed in the engine.**
A configuration may declare levels in display order, each `{ id, englishName, tibetanName? }`, and a rule may name one; both are optional, and a rule naming an undeclared level is refused.
Do not add a fixed scale, however obvious three levels look: it would make one community's division of practice true for every user.
There is no `kind`: what a practice is does not predict who it is for.

**`tags` is an array of strings the engine never acts on.**
It marks the great occasions, tsok days and a practice derived from a restricted one, and whatever else a configuration wants to group by.
It is never a delimited string; a string in place of the array is refused.
Do not give a tag meaning in the engine — that turns a label into an undeclared convention.

**A rule has no source field.**
A centre is the authority on its own practice days, and provenance is not for the person reading the calendar.
The package's own claims about its example are cited where a reviewer reads them, in [docs/observances.md](../observances.md) and the example's docblock.

**Names follow [2026-09-13-names-keyed-by-language.md](2026-09-13-names-keyed-by-language.md).**
A rule, a level and a configuration carry `englishName`, required and first, and an optional `tibetanName`; there is no `sanskritName`.
The shipped example gives Tibetan names only where a dictionary attests them, checked by the name verifier.

**A configuration differs from another by a layer, not by an edit.**
A layer is JSON listing rules and levels removed, replaced and added by id, and any convention changed; combining it with a base yields a new, validated, frozen configuration and leaves the base untouched.
Rules and levels are changed in that order, remove then replace then add, and a replacement keeps the position of what it replaces.
An id the base does not have, an id the base has being added, an id appearing more than once across a layer's remove, replace and add lists (and likewise across `removeLevels`, `replaceLevels` and `addLevels`), or a level removed while a rule still names it is refused: a difference that silently does nothing is the failure this prevents.
The once-only rule is strict on purpose: removing a rule and adding it back would silently move it to the end, `replace` exists to change a rule and keep its place, and loosening a refusal later breaks nobody.
`replaceLevels` exists for the same reason: without it a layer could not rename a level or give it a Tibetan name without changing its id.

**A year field says which calendar it counts.**
`fromYear`, `untilYear` and `ageFromYear` are Tibetan years on `annual` and Western years on `western`, and each docblock says so where the field is declared.

**The shipped configuration is an example and claims no lineage.**
`EXAMPLE_OBSERVANCES`, `id: "example"`, `englishName: "Example practice calendar"`; its docblock states that its doubled-day and leap-month conventions are FPMT's and that Kopan answers the doubled day the other way.
FPMT's complete set, Lama Thubten Yeshe's anniversary among it, is a configuration in the test suite, where its agreement with FPMT's calendars is measured.

## Why a subpath rather than the root

Everything on the root makes a claim that is falsifiable against Janson or an almanac.
Part of this layer now is too — a counted schedule can be tiled against Rabten Choeling's published century — but its conventions are not, and a consumer who wants only date conversion should not load the rules or inherit anyone's choices.
Losar stays on the root as `losarFor`: it is a calendar fact, not an observance.
