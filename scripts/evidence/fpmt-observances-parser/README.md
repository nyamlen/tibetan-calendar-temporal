# Evidence: the FPMT observance parser's month-span proof

Written 2026-11-16 for `scripts/fetch-fpmt-observances.mjs`, after a review found that `parseMonthSpan` read the middle month of a three-month span opening in a `B` month wrongly (`Tibetan Months 6B-8` gave 6, 8 leap, 8 instead of 6, 7, 8) because it tested `/B/` on the whole caption.
It proves the old parser mis-reads such a caption, the fixed one reads it correctly, and the fixed one refuses a caption whose inferred middle does not run from the first month to the last.

## What is here

- `record.mjs` — a `node --import` preload that saves every response of a real run of the generator.
- `replay.mjs` — a preload that serves the saved responses, applying one edit per mutant to the December 2024 page's caption (`Tibetan Months 9-11`).
  A mutant whose edit changes nothing aborts the run.
- `harness.sh` — copies the shipped generator, and the pre-fix generator from git (`OLD_REV`, default `8a330a5`), into scratch trees with their own `test/fixtures/`, and runs them against the replay.
  It never writes into the repository.
- `recorded-manifest.json` — URL, status, size and SHA-256 of each of the 60 pages of the run that reproduced the committed fixture.
  **The pages themselves are not kept**: they are FPMT's, and can be re-fetched.
- `check-recording.mjs` — compares a directory of recorded pages with the manifest (`--write` rewrites the manifest).
- Nothing a run prints is kept: it goes to `$CONV/out/`.

## How to run

1. Record: `REC_DIR=$CONV/recorded node --import file:///<repository>/scripts/evidence/fpmt-observances-parser/record.mjs <scratch>/scripts/fetch-fpmt-observances.mjs`, where `<scratch>` is a copy of the generator in its own tree with a `test/fixtures/` directory.
   The generator computes its output path from its own location, so never record from the repository's copy.
   It needs the network and takes about a minute.
2. `node check-recording.mjs $CONV/recorded`.
   A named page means FPMT has changed it since the manifest.
3. `CONV=$CONV bash harness.sh` (Git Bash on Windows).
   Expect `pass 7 fail 0`.

## The baseline

The control's raw fixture is `$CONV/out/control-fixture-raw-start.ts`.
Copy it over `test/fixtures/fpmt-observances.ts`, run `npx biome check --write` on it, and `git diff` must be empty.
(The fixture has its own Biome line-width override, so the comparison has to be made on that path.)
The generator writes no date stamp, so the raw output differs from the committed file only by Biome's reflow.

## What it proved

| Run | Parser | Result asserted |
|---|---|---|
| control (start and end) | fixed | exit 0, fixture written, both controls byte-identical |
| `b-first` (`6B-8`) | fixed | 2024-12-02 is month 7, not leap |
| `b-first` | before the fix | 2024-12-02 is month 8, leap (the defect, reproduced) |
| `middle-does-not-lead` (`5-8`) | fixed | exit non-zero, no fixture, `has three months, but the middle one inferred (6) does not run from the first to the last` |
| `middle-does-not-lead` | before the fix | exit 0, fixture written (it had no guard) |

## What it did not prove

The `5-6B` shape (a leap month before the regular month sharing its number) has no mutant here and the recorded pages carry no three-month caption of it; the fix leaves its branch unchanged.
