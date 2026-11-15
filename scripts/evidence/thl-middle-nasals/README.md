# Evidence: where THL's nasal rules were read

Written 2026-11-15 for [docs/names/phonetics.md](../../../docs/names/phonetics.md), which cites it.
It records where THL's three `middle_nasals` rules were read.

## What is here

- `thl-source-manifest.json` — the URL of THL's published converter code, with its size in bytes and SHA-256 as downloaded on 2026-11-15.
  **The code itself is not in the repository**: it is third-party code, and the project does not vendor what can be re-fetched.

## Where the rules were read

THL publishes its converter's code as `https://old.thlib.org/static/dls/lingua-bo-wylie.zip`; the converter page says the code is Free Software that may be downloaded.
The three rules were read on 2026-11-15 in `lib/Lingua/BO/Phonetics.pm`, under the option `middle_nasals`, and are stated in [docs/names/phonetics.md](../../../docs/names/phonetics.md) in this project's own words.
The manifest identifies which download that was, by URL, size and SHA-256.
A later download that differs in size or hash means THL has changed the code, and the rules should be read again.

## The live check

Every junction that meets a rule is checked on each test run by `test/nasal-rulings.test.ts` against `scripts/nasal-rulings.data.json`.
That test holds its own copy of the three rule shapes.
It does **not** prove that THL has no fourth rule: a rule THL adds later is seen by nobody until `Phonetics.pm` is read again against the manifest.

## How to check the manifest

Download the archive into an **empty scratch directory outside the repository**, never unpack it there and never run anything from it, and compare, in PowerShell:

```powershell
curl.exe -sL -o lingua-bo-wylie.zip https://old.thlib.org/static/dls/lingua-bo-wylie.zip
(Get-Item lingua-bo-wylie.zip).Length
(Get-FileHash lingua-bo-wylie.zip -Algorithm SHA256).Hash.ToLower()
```
