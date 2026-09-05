---
date: 2026-09-03
status: accepted
---

# No exported identifier names an institution

**Decision:** An export name states what a thing *is* — its shape, its role in the API — never who
published the convention it encodes.
Provenance goes in a `source` field and the docblock.
`GELUG` becomes `DEFAULT_OBSERVANCES`.

The name was not merely institution-flavoured, it **overclaimed**.
`GELUG` encodes FPMT's specific published convention — `doubledDay: "second"`, `leapMonth: "leap"`,
and one particular rule set — not "the Gelug way".
Kopan Monastery is also Gelug and prints the *opposite* `doubledDay` for the 2024 Chokhor Duchen,
which this repository had already documented before the name was questioned.
So the identifier asserted a universality the project's own data contradicts, and a reader takes a
name at face value in a way they do not take prose.

The rule governs **exported identifiers**, not data.
`config.id` stays `"gelug"` and `config.name` stays `"Gelug (FPMT)"`, deliberately: a reader takes
an identifier in their import scope at face value in a way they do not take a field value, and
those two fields are the only machine-readable statement of whose convention this is.
Naming a role in an export is safe because an export can be repointed; `id` is documented as a
*stable identifier*, so a role-name there would have to migrate or lie the moment a second config
ships.
The export name and the id therefore disagree on purpose — that is not drift to tidy.

An `ObservanceConfig` is a **convention**, where published sources legitimately disagree.
A `TraditionConfig` is a **falsifiable claim** about a calendrical system Janson describes.
That is why `PHUGPA`, `BHUTAN` and the unexported Tsurphu and Mongolian configs keep their names:
they identify an objective system, not one institution's choice among several defensible ones.
Do not "consistency-fix" those to match this rule.

The scope is every exported identifier, not this one config.
When adding an export, name it for its role; if the only accurate name would be an institution's,
that is a signal the thing being exported is a convention that belongs in consumer-supplied config.
