# Evidence: the observance-name verifier's mutation proof

Written 2026-11-11 for `scripts/verify-observance-names.mjs`, and moved into this repository on 2026-11-12 because [docs/names/observance-sourcing.md](../../../docs/names/observance-sourcing.md) cites it.
It proves that each check of the verifier fails, with its own message, when its input is altered, and that the verifier writes no fixture when it fails.

## What is here

- `harness.sh` — the runner.
  It copies the shipped verifier, its two readers and the Rigpa data file into a scratch tree with its own `test/fixtures/`, runs an unmutated **control**, fourteen **mutants**, and the control again.
  It refuses to start if the scratch copy differs from the repository's file, and it never writes into the repository.
- `replay.mjs` — a `node --import` preload that replaces `globalThis.fetch` and serves recorded responses, applying one edit per mutant (some mutants edit two or three responses of one name).
  It wraps the `jsewts` converter for the two converter mutants and `fs.readFileSync` for the two mutants of the Rigpa data file, which the verifier reads from disk.
  A mutant whose edit changes nothing aborts the run, so a mutant cannot pass by doing nothing.
- `record.mjs` — the preload that records the responses during a real run of the verifier.
  It stores the two copyrighted dictionaries (`25-tshig-mdzod-chen-mo-Tib`, `34-dung-dkar-tshig-mdzod-chen-mo-Tib`) as headwords only, because the project may gate on those dictionaries and never store their text.
- `recorded-manifest.json` — the URL, request body, status, size and SHA-256 of each of the 40 responses of the run that wrote the committed fixture.
  **The responses themselves are not in the repository**: they are third-party pages, and the project does not vendor what can be re-fetched.
- `check-recording.mjs` — compares a directory of recorded responses with the manifest and names every one that is missing or has changed.
- Nothing it prints is kept: each run writes to `$CONV/out/` (`out-<mutant>.txt`, `harness.log` if you redirect it, and the raw control fixture), which the next run recreates.

## How to run

1. In a scratch directory outside the repository: `npm init -y && npm install jsewts tibetan-ewts-converter`.
   Call it `$CONV`.
2. Record the sources: from the repository root, `REC_DIR=$CONV/recorded node --import file:///<repository>/scripts/evidence/observance-names-verifier/record.mjs scripts/verify-observance-names.mjs`.
   Run it with the converters resolvable from the working directory, as `npm run verify:names` does.
   It needs the network and rewrites `test/fixtures/observance-names.ts`; discard that change with `git checkout test/fixtures/observance-names.ts` if the sources have moved.
3. `node check-recording.mjs $CONV/recorded`.
   If it names a changed response, a source has moved since that run, and a mutant that edits that response may abort with "changes nothing" instead of failing for its reason.
4. `CONV=$CONV bash harness.sh` (Git Bash on Windows).
   About eight minutes: each run loads about 17 MB of dictionary text and runs the verifier's own predicate proofs first.
5. Expect `pass 16 fail 0` (two controls and fourteen mutants).

## The baseline

The control writes a raw fixture, `$CONV/out/control-fixture-raw.ts`.
To compare it with the committed `test/fixtures/observance-names.ts`: copy it to a file **inside the repository**, run `npx biome check --write` on that file, `cmp` it with the committed fixture, and delete it.
**Do not use `biome format --stdin-file-path`**: on the machine this was written on, it strips Tibetan combining marks, and the output differs from the fixture.

## What it proved

| Mutant | Check | Message asserted |
|---|---|---|
| `converter-disagree` | 1 script | `EWTS converters disagree on "gso sbyong"` |
| `roundtrip` | 2 round trip | `which reads back as "sbyin sreg x"` |
| `jaeschke-index` | 4 sense (the Jäschke page re-check) | `Jäschke's index puts "dus chen" at p. 454, not p. 255` |
| `mvy-pair` | 4 | `the Mahāvyutpatti no longer pairs "sbyin sreg" with homaḥ` |
| `mw-sense` | 4 | `no Monier-Williams entry headed homa prints "oblation with fire"` |
| `term-one-witness` | 3, terms (both Tibetan–Tibetan dictionaries lose `sbyin sreg`) | `head word "sbyin sreg" has 1 independent witness group(s) read, not 2` |
| `duchen-rigpa-alone` | 3, terms (the dictionary and the Jäschke page lose `dus chen`, leaving Rigpa) | `head word "dus chen" has 1 independent witness group(s) read, not 2` |
| `rigpa-string` | 3, the Rigpa data file prints a different Wylie | `the Rigpa Wiki passage for chokhor-duchen prints` |
| `rigpa-missing` | 3, the Rigpa data file is absent | `the Rigpa Wiki witness file is missing or unreadable` |
| `karmapa-google-removed` | 3, `karmapa-16` needs both witnesses | `… not 2 (Lotsawa House)` |
| `karmapa-lotsawa-removed` | 3, `karmapa-16` needs both witnesses | `… not 2 (Google Books record)` |
| `wikipedia-one-group` | 3, a Wikipedia title and list item are one group | `… not 2 (Tibetan Wikipedia)` |
| `check5-index-only` | 5, a marked word needs a headword check 3 accepts | `marked word "bdud 'joms" is part of no headword that check 3 accepts` |
| `thl-correction` | 5, a correction self-invalidates | `correction for karmapa-16 is no longer justified` |

Every mutant exits non-zero and leaves no fixture; the control exits 0 and writes one, which is how the emit path is proved.

## What it did not prove

The `(?)` marker check on the rewritten code, the BDRC label check for persons, the Lotsawa House heading check and the Wikipedia title check have no mutant here beyond those above.
The four Rigpa Wiki passages are read from a committed file, so the control reproduces them by construction and says nothing about the live pages.
