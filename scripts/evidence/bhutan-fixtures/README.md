# Evidence: the Bhutan fixture generator's check 5

Written 2026-11-16 for `scripts/fetch-bhutan-fixtures.mjs`, after a review found that check 5 read `row.bhutaneseMonth`, a field its rows do not have, so the half of the check that says a leap month takes the number of the month before it never fired.
Correcting the field made the generator refuse the live source for seven leap runs, six of them in years outside the fixture, and the window was narrowed to end on 2030-04-02, the day before the one inside it, with check 5 reading the emitted rows only.

## What is here

- `record.mjs` — a `node --import` preload that saves every response of a real run of the generator.
- `replay.mjs` — a preload that serves the saved response, applying one edit per mutant to the recorded source (the tuples of `data.txt`).
  A mutant whose edit changes nothing aborts the run.
- `harness.sh` — copies the shipped generator into a scratch tree with its own `test/fixtures/`, makes a second copy with only the K1 field reverted, and runs both against the replay.
  It never writes into the repository.
- `recorded-manifest.json` — URL, status, size and SHA-256 of the source of the run that gave the baseline.
  **The source itself is not kept**: it is a GPL plugin's data file of 4.4 MB and can be re-fetched.
- `check-recording.mjs` — compares a directory of recorded pages with the manifest (`--write` rewrites the manifest).
- Nothing a run prints is kept: it goes to `$CONV/out/`.

## How to run

1. Record: `REC_DIR=$CONV/recorded node --import file:///<repository>/scripts/evidence/bhutan-fixtures/record.mjs <scratch>/scripts/fetch-bhutan-fixtures.mjs`, where `<scratch>` is a copy of the generator in its own tree with a `test/fixtures/` directory.
   The generator computes its output path from its own location, so never record from the repository's copy.
   It needs the network and takes seconds.
   A generator that refuses the source has still fetched it, so the recording does not need a passing run.
2. `node check-recording.mjs $CONV/recorded`.
   A named page means the source has changed since the manifest.
3. `CONV=$CONV bash harness.sh` (Git Bash on Windows).
   Expect `pass 10 fail 0`.

## The baseline

The control's rows are compared with the fixture as committed at `BASE_REV` (default `94f1fae`, the last revision before the change), which the harness reads with `git show` into `$CONV/out/`.
Comparing with the working tree's fixture would be circular, since that file is the control's own output.
The generated fixture's tuples must equal that fixture's first rows, the window must read 2000-01-01 to 2030-04-02, and the two measurements the fixture records must read as below.
The tuples are one per line, so Biome does not reflow them.
The generator's header carries no date stamp.

## What it proved

| Run | Generator | Result asserted |
|---|---|---|
| control (start and end) | shipped | exit 0, fixture written, rows equal the committed fixture's first 11,050, both controls identical |
| `leap-wrong-number` (2000's leap month 4 renumbered 5) | shipped | exit non-zero, no fixture, `is not preceded by a regular month 5; the month before it is 4` |
| `leap-wrong-number` | K1 reverted | exit 0, fixture written: the dead half, reproduced |
| `defect-gone-from-2030` (the leap flag cleared on 2030-04-03 and 04-04) | shipped | exit 0, same window, and the fixture now reports the first unpaired leap month after it as 2049-04-03 and none in Janson's years: the recorded measurements follow the source |
| `leap-after-leap` (2011's regular month 3 made leap 3 after leap 2) | shipped and K1 reverted | both refuse, `(also leap)`: the half K1 left alive |
| window ending 2030-04-03 | shipped | refused, `leap month 2 beginning 2030-04-03` |
| window ending 2030-04-02 (the default) | shipped | accepted, although the source holds the defect on the next day |

## What it did not prove

The K1-reverted generator is the shipped one with two lines changed, not the generator as committed before the fix, which refuses the source outright for the six defects outside the window and so cannot be run against it.
The six defects outside the window (1900, 1919, 1965, 1984, 2049, 2095) are not exercised by any run here: they are out of the window by construction.
