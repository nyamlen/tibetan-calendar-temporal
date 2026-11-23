# Changelog

Every release states each change a consumer can see.
A change in behaviour that raises no error is marked **Silent change**, because nothing in your code will tell you about it.

## 1.0.4 — 2026-11-23

Package metadata only; no code changed.

- The package description now says it is for JavaScript and names the observances, the lunar mansion and elemental yoga, the names in Tibetan script with phonetics, that dates are checked against independent published calendars, and that it has zero dependencies.
- Removed keywords: `mongolian` and `tsurphu`. Neither calendar is included yet; each keyword returns in the release that exports its calendar.

## 1.0.3 — 2026-11-23

Documentation only; no code changed.

- The README's Provenance section says who built the package and over what period, and how many tests its suite holds.

## 1.0.2 — 2026-11-22

Documentation and package metadata only; no code changed.

- The README says the Phugpa calendar is the basis of the almanacs most Tibetans use, and that the Tsurphu and Mongolian calendars will be exported once their dates have been checked against an almanac of their own.
- The README's Provenance section says how the package was built: with Claude Code, under the maintainer's direction and review.
- The README, the guide and why-trust-these-dates.md no longer describe how the project's own API or documents changed before 1.0.0, which no released version ever exposed.
- New keyword: `lunisolar-calendar`.

## 1.0.1 — 2026-11-22

Documentation only; no code changed.

- The README now says at the top which calendars the package computes, Phugpa (the default) and Bhutanese, and that the Tsurphu and Mongolian calendars are not included.

## 1.0.0 — 2026-11-22

The first release.
Nothing earlier is recorded: the only version before it, 0.0.1, was a placeholder that exported nothing.

What it contains is described in the [README](README.md) and the [guide](docs/guide.md); what its dates are checked against is in [why-trust-these-dates.md](docs/why-trust-these-dates.md).
