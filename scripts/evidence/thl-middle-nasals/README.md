# Evidence: THL's nasal rules and the names they touch

Written 2026-11-15 for [docs/names/phonetics.md](../../../docs/names/phonetics.md), which cites it.
It records where THL's three `middle_nasals` rules were read, and lists every shipped name that meets one.

## What is here

- `middle-nasals.mjs` — lists the junctions between syllables, inside one word of a shipped name, that meet one of the three rules, with the rule and the shipped phonetic.
  It reads `src/`, `scripts/word-boundaries.data.json` and `scripts/nasal-rulings.data.json`, writes nothing and fetches nothing.
  Its repository root comes from its own location, so it runs from any working directory.
  For each junction it also prints the ruling the rulings file holds, and exits 1 for a junction with no ruling or with a ruling that names another rule.
- `thl-source-manifest.json` — the URL of THL's published converter code, with its size in bytes and SHA-256 as downloaded on 2026-11-15.
  **The code itself is not in the repository**: it is third-party code, and the project does not vendor what can be re-fetched.

## Where the rules were read

THL publishes its converter's code as `https://old.thlib.org/static/dls/lingua-bo-wylie.zip`; the converter page says the code is Free Software that may be downloaded.
The three rules were read on 2026-11-15 in `lib/Lingua/BO/Phonetics.pm`, under the option `middle_nasals`, and are stated in [docs/names/phonetics.md](../../../docs/names/phonetics.md) in this project's own words.
The manifest records which download that was.
A later download that differs in size or hash means THL has changed the code, and the rules should be read again before trusting the lists below.

## How to run

From the repository root, in PowerShell:

```powershell
node scripts/evidence/thl-middle-nasals/middle-nasals.mjs
```

It needs only Node.
To check the manifest, download the archive into an **empty scratch directory outside the repository**, never unpack it there and never run anything from it, and compare:

```powershell
curl.exe -sL -o lingua-bo-wylie.zip https://old.thlib.org/static/dls/lingua-bo-wylie.zip
(Get-Item lingua-bo-wylie.zip).Length
(Get-FileHash lingua-bo-wylie.zip -Algorithm SHA256).Hash.ToLower()
```

## What it proves

- **28 junctions in 28 shipped names** meet a rule, and no name meets two.
  The population is enumerated from `src/` and the boundary file, not from a list, so a new name that meets a rule appears here.
- Each junction has a row in `scripts/nasal-rulings.data.json` that names the same rule.
  The guard `test/nasal-rulings.test.ts` holds the same thing on every test run, with its own copy of the three rule shapes.
- It does **not** prove that THL has no fourth rule.
  Both this script and the guard repeat the three rules read on 2026-11-15, so a rule THL adds later is seen by neither; re-read `Phonetics.pm` against the manifest to find out.
