---
date: 2026-09-24
status: accepted
---

# How a tradition is passed

**Decision:** seven points, approved by Andreas on 2026-09-24, govern every function that takes a
`TraditionConfig`:

1. A `TraditionConfig` is always named `tradition` — positional parameter or bag key.
2. When the tradition is a function's only choice, it is the last parameter, positional:
   `f(x, tradition?)`.
3. With two or more choices, all of them go in one bag, and that bag extends `TraditionOptions`.
4. `TraditionOptions` holds only `tradition`; any other choice goes on the function's own bag.
5. Bags refuse unknown keys, with `TCT_INVALID_ARGUMENT` naming the key.
6. A new choice is optional, and its default reproduces the previous behaviour, pinned by a test.
7. A one-choice function that gains a second choice converts to a bag — free before 1.0.0, a
   breaking change after it, taken knowingly.

## What it replaced

Until 2026-09-24 the tradition was passed four ways: positional `config?` on 22 root functions;
`{ overflow?, config? }` on `addMonthsToDate`; `{ config?, tradition? }` on `getObservances` and
`observancesOn`; and `{ tradition? }` on `monthNamesFor` and the five `./astrology` functions
(`AstrologyQueryOptions`). Two consequences were defects rather than variety:

- **The key `config` named two types.** In `addMonthsToDate`'s bag it was a `TraditionConfig`; in
  `./observances'` it is an `ObservanceConfig`. Both bags took their keys from the positional names
  they replaced on 2026-08-26, so the collision was inherited, never chosen.
- **From plain JavaScript, a mix-up gave a silent wrong answer.** Every bag ignored unknown keys,
  and a bag function read a positional `TraditionConfig` as an empty bag. Measured on `dist/`:
  `addMonthsToDate(f, 0, { tradition: BHUTAN })`, `attributesFor(d, BHUTAN)` and
  `monthNamesFor(m, BHUTAN)` all answered Phugpa's. TypeScript rejects each of those calls; plain
  JavaScript and a cast do not.

## Why a consumer cannot be asked to know the entry point

An earlier proposal made the rule depend on the entry point — root positional, subpaths always a
bag — on the assumption that `./astrology` would gain choices. Andreas' objection settled it: a
consumer does not know which functions are root and which are subpath, so a rule keyed on that is a
rule they cannot apply. No second choice is foreseen for any one-choice function, and point 7 says
what happens if one arrives.

## Constraints this places on a contributor

- **Do not add a `{ tradition }` bag to a one-choice function**, however consistent it looks beside
  `./observances`. That is the shape removed here, and it is what made the silent answers possible.
- **Do not export `TraditionOptions` alone as a parameter type.** It exists as the base of the
  two-choice bags. It is declared in `src/traditions/types.ts`, outside the barrels, so that
  `check:conventions` rule 13 would see it if it were ever exported.
- **The unknown-key refusal applies to bags, never to a config.** `{ ...PHUGPA, extra }` is a
  supported way to build a `TraditionConfig` and must keep working. `assertQueryOptions` checks
  inherited keys as well as own ones, because the call sites read `options.tradition`, which honours
  an inherited key.
- **`./observances`' `config` key is not settled by this record.** Its name belongs to the
  `./observances` rethink, which is still open.
- **Internal helpers may keep a `config` parameter.** The rule governs the surface; a module-private
  function is not on it.

## Enforcement

By review. `check:conventions` does not hold any of the seven points today. Point 1 is the
mechanically checkable one — an exported function whose signature says `config: TraditionConfig` —
and is the first candidate for a rule if it regresses. Point 5 is held by the tests of
`assertQueryOptions` in `test/errors.test.ts` and by each bag's own suite.
