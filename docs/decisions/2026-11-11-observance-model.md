---
date: 2026-11-11
status: accepted
---

# Observances are resolved from a named configuration, in a vocabulary the engine owns

**Decision:** every observance query names its `ObservanceConfig`; there is no default.
A configuration is plain JSON: rules whose `when` is one of the engine's six forms, the three conventions for doubled days, skipped days and leap months, and optionally the levels it groups its rules into.
The engine owns the arithmetic of every form and chooses no institution's answer; the configuration owns every convention, every level and every name.
The shipped configuration is an **example**, named as one, and FPMT's own set lives in the test suite.
It replaces the 2026-08-12 observance-policy record, which is removed and kept in git history, and keeps that record's core: conventions are injected data, never logic.

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

**A setting a form cannot use is refused, and so is a value that would leave a schedule undefined.**
Which forms use `doubledDay`, `skippedDay` and `leapMonth` is fixed per form: `monthly` does not use `leapMonth`, `western` and `formula` use none, and `period` uses only `leapMonth`.
A valid value on a form that does not use it throws, so a setting never looks effective while doing nothing; an invalid value keeps its own message, because the value is checked before its applicability.
`skippedDay: "omit"` is refused on a `counted` rule, set on the rule or inherited from the configuration's default.
A counted schedule is anchored on a resolved calendar day each year, and an omitted anchor leaves that year with no anchor and the schedule undefined, so a query's answer would depend on where its range starts.
For the same reason **an unknown key is refused** on a configuration, a rule, a level, a `when` and a layer: a misspelt field is a setting that does nothing.

**A query is bounded: one 10-year cap, which is also the `nextObservance` horizon, and a budget per view.**
`getObservances` refuses a range of more than 10 years, `to.year - from.year > 10`, with `TCT_SPAN_TOO_WIDE`, and `nextObservance` searches the 10 years after its starting day and answers `null` beyond them.
It is one number for both, so a consumer who learns one knows the other, and it is the widest range the engine has promised to answer.
A day, month, year or planning view needs at most about two years; a wider table is requested in chunks and concatenated, which is correct because every query is pure and restarts its month walk.
The cap exists because `Temporal.PlainDate` spans about 547,000 years, so a service forwarding user-supplied bounds would otherwise hand its event loop a synchronous computation four orders of magnitude larger than any view needs.
`null` from `nextObservance` means none within the horizon, not never.
The approved budgets are **5 ms for a day, 10 ms for a month, 50 ms for a year and 100 ms for a planning chunk** of two years, for a configuration holding one rule of each form.
A budget is judged only on figures measured on the machine recorded beside them in `bench/RESULTS.md`, with its OS, Node version and date: a figure from another machine, or an extrapolation, is not evidence for or against one.
Do not raise the cap, or add a form whose cost breaks a budget, without re-measuring there; `bench` is deliberately outside CI, because a threshold on a shared runner fires on the runner and not on the change.

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
The shipped example gives Tibetan names only where the name verifier finds two independent witnesses, as [docs/names/observance-sourcing.md](../names/observance-sourcing.md) records; the four Rigpa Wiki passages among them are human-supplied data, not fetched.

**A configuration differs from another by a layer, not by an edit.**
A layer is JSON listing rules and levels removed, replaced and added by id, and any convention changed; combining it with a base yields a new, validated, frozen configuration and leaves the base untouched.
A layer can replace a level as well as a rule, so a centre can rename a level or give it a Tibetan name while every rule naming it, and every consumer filtering by its id, keeps working.
Rules and levels are changed in that order, remove then replace then add, and a replacement keeps the position of what it replaces.
An id the base does not have, an id the base has being added, an id appearing more than once across a layer's remove, replace and add lists (and likewise across `removeLevels`, `replaceLevels` and `addLevels`), or a level removed while a rule still names it is refused: a difference that silently does nothing is the failure this prevents.
The once-only rule is strict on purpose: removing a rule and adding it back would silently move it to the end, `replace` exists to change a rule and keep its place, and loosening a refusal later breaks nobody.
`replaceLevels` exists for the same reason: without it a layer could rename a level or give it a Tibetan name only by changing its id.

**A year field says which calendar it counts.**
`fromYear`, `untilYear` and `ageFromYear` are Tibetan years on `annual` and Western years on `western`, and each docblock says so where the field is declared.

**The shipped configuration is an example and claims no lineage.**
`EXAMPLE_OBSERVANCES`, `id: "example"`, `englishName: "Example practice calendar"`; its docblock states that its doubled-day and leap-month conventions are FPMT's and that Kopan answers the doubled day the other way.
FPMT's complete set, Lama Thubten Yeshe's anniversary among it, is a configuration in the test suite, where its agreement with FPMT's calendars is measured.

**The three observance functions take the same dates, and `nextObservance` does not take a resolved `TibetanDate`.**
`getObservances`, `observancesOn` and `nextObservance` normalise their dates through `asPlainDate`, which accepts a `Temporal` instance or an ISO string and never a `TibetanDate`.
`nextFullMoon` and `nextNewMoon` accept one because chaining their own result was the reason to widen them ([public-surface.md](2026-08-12-public-surface.md)); each observance result carries `isoDate`, so a chain passes `result.date.isoDate`.
Widening `nextObservance` alone would make the subpath inconsistent and need a second guard beside the shared one, and widening all three would change every entry point's contract; widening later breaks nothing, narrowing never can.

**A config loaded from JSON is checked by using it, and no validator is exported.**
Every entry point validates the whole config on first use, and `composeObservances(config, { id, englishName })` validates it without a date and returns a frozen clone, so both routes give a consumer a coded `TCT_INVALID_OBSERVANCE_CONFIG`.
An exported guard would freeze a choice between throwing and answering a boolean, and would invite the same for `TraditionConfig`; add one when a consumer's need shows which.

## Why a subpath rather than the root

Everything on the root makes a claim that is falsifiable against Janson or an almanac.
Part of this layer now is too — a counted schedule can be tiled against Rabten Choeling's published century — but its conventions are not, and a consumer who wants only date conversion should not load the rules or inherit anyone's choices.
Losar stays on the root as `losarFor`: it is a calendar fact, not an observance.
