# Name sources

**Status: generated.** Produced by `scripts/verify-name-sources.mjs`; re-run it rather than editing
this file.

## Provenance, column by column

| Column | Source | Standing |
|---|---|---|
| Wylie | Janson's day-of-week table and his ten- and twelve-year cycle tables | **Sourced**, extracted mechanically |
| Tibetan | `jsewts` and `tibetan-ewts-converter`, required to agree | **Derived**, by two independent implementations |
| Phonetic | THL Simplified Phonetic Transcription, from THL's own converter in its "Words separated by" mode: a two-syllable name is one word and is joined, longer names per `scripts/word-boundaries.data.json` (none here) | **Sourced** |
| Planet, element, English | Janson's day-of-week table | **Sourced** |

## What each row survived

1. **Mechanical extraction** from the LaTeX — no hand transcription.
2. **Two EWTS implementations agreeing** on the script. One converter is an opinion; two agreeing
   is a result.
3. **A round trip** back to the same Wylie, which catches a conversion that is self-consistent but
   wrong.
4. **An English Wiktionary entry at exactly that title.** Exact titles, never a search: searching
   `glang` (ox) returns *elephant*, and `bya` (bird) returns *feather*.
5. **CLDR agreement**, for the seven weekdays, from `Intl` with the `bo` locale — a third lineage,
   entirely offline.

**Why check 4 earns its place.** Janson gives Saturday as `spen ma` in the day-of-week table and
`spen pa` in the Bhutan appendix, for the same day in Tibet. EWTS converts both without complaint,
because conversion is mechanical and knows nothing about whether a word exists. Wiktionary has an
entry for one and not the other, and CLDR agrees with it. The slip fails here rather than shipping —
as it previously did, into a docblock, unnoticed for three phases.

## Weekdays

| # | Tibetan | Wylie | THL phonetic |
|---|---|---|---|
| `0` | སྤེན་པ | `spen pa` | *penpa* |
| `1` | ཉི་མ | `nyi ma` | *nyima* |
| `2` | ཟླ་བ | `zla ba` | *dawa* |
| `3` | མིག་དམར | `mig dmar` | *mikmar* |
| `4` | ལྷག་པ | `lhag pa` | *lhakpa* |
| `5` | ཕུར་བུ | `phur bu` | *purbu* |
| `6` | པ་སངས | `pa sangs` | *pasang* |

## Elements

| Element | Tibetan | Wylie | THL phonetic |
|---|---|---|---|
| `wood` | ཤིང | `shing` | *shing* |
| `fire` | མེ | `me` | *mé* |
| `earth` | ས | `sa` | *sa* |
| `iron` | ལྕགས | `lcags` | *chak* |
| `water` | ཆུ | `chu` | *chu* |

## Genders

| Gender | Tibetan | Wylie | THL phonetic |
|---|---|---|---|
| `male` | ཕོ | `pho` | *po* |
| `female` | མོ | `mo` | *mo* |

## Animals

| Animal | Tibetan | Wylie | THL phonetic |
|---|---|---|---|
| `mouse` | བྱི་བ | `byi ba` | *jiwa* |
| `ox` | གླང | `glang` | *lang* |
| `tiger` | སྟག | `stag` | *tak* |
| `rabbit` | ཡོས | `yos` | *yö* |
| `dragon` | འབྲུག | `'brug` | *druk* |
| `snake` | སྦྲུལ | `sbrul` | *drül* |
| `horse` | རྟ | `rta` | *ta* |
| `sheep` | ལུག | `lug` | *luk* |
| `monkey` | སྤྲེའུ | `spre'u` | *treu* |
| `bird` | བྱ | `bya` | *ja* |
| `dog` | ཁྱི | `khyi` | *khyi* |
| `pig` | ཕག | `phag` | *pak* |
