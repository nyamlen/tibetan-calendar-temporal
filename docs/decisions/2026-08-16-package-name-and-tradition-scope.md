---
date: 2026-08-16
status: accepted
---

# The package keeps the name `tibetan-calendar-temporal`, and traditions never become packages

**Decision:** the package name stays `tibetan-calendar-temporal` even as the engine grows to cover
the Tsurphu, Bhutanese and Mongolian variants. The wider scope is carried by `keywords`, the
`description`, the README and the GitHub topics — the fields search actually indexes — not by a
rename. And if this project ever splits into multiple packages, it splits **by concern**, never by
tradition.

## Why the name is not the place to put the scope

The name is the only irreversible part. `keywords` and `description` can change at any version;
a published name cannot, without a deprecation, a redirect package and a permanently split search
surface. So the scope belongs in the reversible fields.

Three arguments against a rename, in order of weight:

- **"Tibetan calendar" is the field's own name for the family, not a Tibet-centric imposition.**
  Janson — the sole source this engine derives from — writes in his introduction that "Bhutan and
  Mongolia also use versions of the Tibetan calendar", opens his Bhutan appendix "Bhutan uses a
  version of the Tibetan calendar as an official calendar", and opens his Mongolia appendix "The
  Mongolian calendar is a version of the Tibetan." The framing is citable rather than asserted.
- **`-temporal` is the differentiator** against every other Tibetan calendar package on npm. It says
  what makes this one different, in the name, for free. It must survive any future rename.
- **A brand name would forfeit discovery.** `@nyamlen/calendar` is neutral across traditions and has
  no search volume. Nobody looks for "nyamlen"; people look for "tibetan calendar".

**Do not reopen this on the grounds that the package now covers four traditions.** That is precisely
the case this record answers.

## What the family term actually is

There is an accurate family-level name: the **Kālacakra कालचक्र calendar**. All four versions descend
from that system — Janson distinguishes the Phugpa-type calculations as *siddhānta* सिद्धान्त
(གྲུབ་རྩིས་ *drubtsi*) against the older *karaṇa* करण (བྱེད་རྩིས་ *jetsi*) reckoning.

It belongs in the README as the name of the family, and **not** as the package name: to most
searchers "Kālacakra" names the deity practice, so it would attract the wrong audience and miss the
right one.

## The hospitality obligation this creates

Naming the family after one of its members puts an obligation on the documentation, which the README
now discharges: a short section stating why the name says Tibetan, citing Janson, naming the
Kālacakra family term, and noting what is distinctly Bhutanese and Mongolian — Bhutan's is an
official state calendar in Dzongkha with its own leap-month and weekday conventions; Mongolia's
carries two national holidays and dates its constitution by the sixty-year cycle.

Do not delete that section as padding. Absent it, the name reads as absorbing two national calendars
without comment.

## Traditions are data; splits are by concern

**There must never be a `bhutanese-calendar` or `mongolian-calendar` package.** Traditions are
`TraditionConfig` — the founding architectural rule, which exists so that a second tradition is new
data rather than a change to any computation module. A per-tradition package would fork the
algorithm, which is the outcome the injection design was built to prevent.

If a split is ever warranted it follows the existing seam — engine, observances, and a possible
`@nyamlen/icalendar` — the same reasoning as
[2026-08-12-public-surface.md](2026-08-12-public-surface.md) applied to packaging.

Publishing stub packages under other names that redirect here is also excluded. It is not a
findability strategy; it is registry spam, and npm treats it as such.

## What was true when this was decided

The package exists on npm at `0.0.1` as a **placeholder that exports nothing but a status string** —
it reserves the name while the engine is built, and the README says so. So the name is registered
but nothing depends on it: a rename would have cost only the registration, which is why the decision
could be taken freely now and cannot be later.
