---
date: 2026-09-03
status: accepted
---

# No exported identifier names an institution

**Decision:** An export name states what a thing *is* — its shape, its role in the API — never who
published the convention it encodes.
Provenance goes in the docblock and the documentation; no exported shape carries a `source` field
(`ObservanceRule.source` was removed, and the validators refuse the key).
`GELUG` became `DEFAULT_OBSERVANCES`, and then `EXAMPLE_OBSERVANCES` ([2026-11-11-observance-model.md](2026-11-11-observance-model.md)).

This is a breaking change to the `./observances` surface, taken because the package is
pre-v1.0.0 and the published `0.0.1` exports nothing.

The name was not merely institution-flavoured, it **overclaimed**.
`GELUG` encodes FPMT's specific published convention — `doubledDay: "second"`, `leapMonth: "leap"`,
and one particular rule set — not "the Gelug way".
Kopan Monastery is also Gelug and prints the *opposite* `doubledDay` for the 2024 Chokhor Duchen,
which this repository had already documented before the name was questioned.
So the identifier asserted a universality the project's own data contradicts, and a reader takes a
name at face value in a way they do not take prose.

The rule governs **exported identifiers**, and the shipped config's data now follows it too.
The config's `id` is `"example"` and its `englishName` is `"Example practice calendar"`: the shipped
configuration is an example and claims no lineage, so neither field names an institution.
Whose conventions it follows — FPMT's for doubled days, skipped days and leap months — is stated in
its docblock and in [docs/observances.md](../observances.md), where a citation fits and an
identifier cannot carry one.
FPMT's own complete set is a configuration in the test suite, and that is where an FPMT id belongs.
`id` is documented as a *stable identifier*, so a role-name such as `"default"` would have to
migrate or lie the moment a second config ships; `"example"` names what the object is for and stays
true.
`test/public-api.test.ts` asserts the id, so a later change fails loudly instead of quietly.

An `ObservanceConfig` is a **convention**, where published sources legitimately disagree.
A `TraditionConfig` is a **falsifiable claim** about a calendrical system Janson describes.
That is why `PHUGPA`, `BHUTAN` and the unexported Tsurphu and Mongolian configs keep their names:
they identify an objective system, not one institution's choice among several defensible ones.
Do not "consistency-fix" those to match this rule.

The scope is every exported identifier, not this one config.
When adding an export, name it for its role; if the only accurate name would be an institution's,
that is a signal the thing being exported is a convention that belongs in consumer-supplied config.
