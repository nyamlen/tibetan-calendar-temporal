# Documentation

The documents are grouped by who reads them.
The project's landing page is the [README](../README.md) at the repository root.

## Using the library

The first three ship to npm with the package.

- [guide.md](guide.md) — the long-form companion to the README: everything that needs more than a snippet
- [why-trust-these-dates.md](why-trust-these-dates.md) — what the dates are checked against, and over which years
- [how-it-is-calculated.md](how-it-is-calculated.md) — how the calendar works, for readers new to it
- [astrology.md](astrology.md) — what an almanac prints about a day besides its date, and how favourable the day is held to be
- [observances.md](observances.md) — which practice days a calendar marks, and how it decides them
- [other-implementations.md](other-implementations.md) — the other software that computes Tibetan dates, and when to use it instead; from public metadata only

## Developing the engine

How to contribute, including the clean-room constraint, is in [CONTRIBUTING.md](../CONTRIBUTING.md) at the repository root.

- [development/architecture.md](development/architecture.md) — how the engine is built, and why
- [development/coding-standards.md](development/coding-standards.md) — every rule the project holds, and what fails when you break it
- [development/testing.md](development/testing.md) — the testing strategy and every validation window
- [development/verification-craft.md](development/verification-craft.md) — how to prove a check, harness, probe or document suite measures what it claims
- [development/roadmap.md](development/roadmap.md) — phases, release status and what is still open

## Sources and provenance

- [sources/validation-sources.md](sources/validation-sources.md) — every source the dates are checked against, and the lineage of each
- [sources/traditions.md](sources/traditions.md) — what differs between traditions, and two traps in the sources
- [sources/almanac-sources.md](sources/almanac-sources.md) — where the observance and day-attribute data comes from
- [sources/fpmt-calendar.md](sources/fpmt-calendar.md) — what FPMT's calendar prints, and how it is dated
- [names/](names/) — the provenance of every name string, and how the name verifiers work
- [decisions/](decisions/) — decision records: constraints a contributor would otherwise break
