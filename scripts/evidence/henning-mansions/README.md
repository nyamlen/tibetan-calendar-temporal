# Evidence: Henning's daily calendars against the lunar mansion

Written 2026-11-19 for the sentence in `docs/why-trust-these-dates.md` that says Henning's published daily calendars, compared outside the test suite, give the same mansion as this engine on every day FPMT's codes can name one, and disagree with FPMT on the same days.
Until then the comparison had run once, in a session scratchpad, and nothing in the repository could rerun it.

## What is here

- `fetch.mjs <dir>` saves Henning's daily Phugpa calendars for 2021–2027, `http://www.kalacakra.org/calendar/tdata/pl_YYYY.txt`, into `<dir>`, one JSON record per page.
  It fetches over http because the site's HTTPS certificate is wrong.
- `recorded-manifest.json` holds the URL, status, size and SHA-256 of each page of the recording behind the result below.
  **The pages themselves are not kept**: they are Henning's, and can be re-fetched.
- `check-recording.mjs <dir>` compares a directory of recorded pages with the manifest, by status, size and SHA-256 (`--write` rewrites the manifest).
- `compare.mjs <dir>` runs the comparison and exits non-zero unless every expectation holds.
  It imports the built `dist/` and `test/fixtures/fpmt-observances.ts`.
- Nothing a run prints is kept.

## How to run

Build first, because `compare.mjs` imports `dist/`.

Git Bash:

```sh
npm run build
SCRATCH="$(mktemp -d)"
node scripts/evidence/henning-mansions/fetch.mjs "$SCRATCH/henning"
node scripts/evidence/henning-mansions/check-recording.mjs "$SCRATCH/henning"
node scripts/evidence/henning-mansions/compare.mjs "$SCRATCH/henning"
```

PowerShell:

```powershell
npm run build
node scripts/evidence/henning-mansions/fetch.mjs "$env:TEMP\henning"
node scripts/evidence/henning-mansions/check-recording.mjs "$env:TEMP\henning"
node scripts/evidence/henning-mansions/compare.mjs "$env:TEMP\henning"
```

A page `check-recording.mjs` names has changed since the manifest; the comparison may still pass, but it is then over different data.

## What it compares

The days are the ones the shipped sentence names: every day in `test/fixtures/fpmt-observances.ts` whose day-quality code names two elements, one of them the weekday's, so that the other is forced on the lunar mansion.
That is the selection `mansionDays` makes in `test/support/fpmt-yoga.ts`.
That helper imports `src/*.ts`, which Node cannot load, so `compare.mjs` re-implements it over `dist/` and asserts it finds 1,821 days.

Henning's mansion names are mapped to `LUNAR_MANSIONS` indices by this package's Wylie, with one override: Henning prints Śravaṇā as *gro zhin*, where the package has *gro bzhin*.
The script checks that the mapping is one to one over the 27 names that occur.

## What it proved, 2026-11-19

| Check | Expected | Result |
|---|---|---|
| days selected | 1,821 | 1,821 |
| (a) days where Henning's mansion differs from `lunarMansionFor` | 0 | 0 |
| (b) days where FPMT's forced element differs from the engine's | 37 | 37 |
| (b) the same set for Henning's element | the same 37 days | the same 37 days |

Before the *gro zhin* override was added, (a) reported 69 days, every Śravaṇā day in the window, so the check does fail when the mansions disagree.

## What it does not prove

Henning is this engine's own lineage: Janson takes the mansion elements from him.
Agreement locates FPMT's residual on FPMT's side; it does not corroborate the calendar.
The check runs on Phugpa only, over FPMT's window, and says nothing about the eight mid-mansion days beyond that Henning disagrees with FPMT there too.
