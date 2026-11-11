# Sourcing the Tibetan names of seven observances

**Status: proposed, written ahead of the code.**
It records what will be checked and what ships if a check fails, before the verifier that enforces it exists.
That verifier will be `scripts/verify-observance-names.mjs`, and its output `test/fixtures/observance-names.ts`.
It follows [month-and-yoga-sourcing.md](month-and-yoga-sourcing.md), and the rule it inherits from [validation-sources.md](../validation-sources.md): **agreement is only evidence if the source did not reach its answer the way we did.**

**Nothing below has been checked yet.**
The Tibetan spellings in the table are proposals from the author's own knowledge, put here so that a verifier has something to test, and **they are not evidence**.
A spelling that fails a check does not ship, whatever this page says.

## What ships

The shipped example configuration ([observances.md](../observances.md)) gives a `tibetanName` — script, Wylie and THL phonetics — to **seven** of its rules, and to no others:

| Rule | English name | Proposed Wylie | Proposed script | Word boundaries marked | THL phonetics, joined by word |
|---|---|---|---|---|---|
| `chotrul-duchen` | Day of Miracles | `cho 'phrul dus chen` | ཆོ་འཕྲུལ་དུས་ཆེན | `cho 'phrul-dus chen` | *chontrül düchen* |
| `saga-dawa-duchen` | Lord Buddha's birth, enlightenment and parinirvana | `sa ga zla ba dus chen` | ས་ག་ཟླ་བ་དུས་ཆེན | `sa ga-zla ba-dus chen` | *saga dawa düchen* |
| `chokhor-duchen` | Lord Buddha's first teaching | `chos 'khor dus chen` | ཆོས་འཁོར་དུས་ཆེན | `chos 'khor-dus chen` | *chönkhor düchen* |
| `lhabab-duchen` | Lord Buddha's descent from God Realm of Thirty Three | `lha babs dus chen` | ལྷ་བབས་དུས་ཆེན | `lha babs-dus chen` | *lhabap düchen* |
| `saga-dawa-month` | Saga Dawa, Lord Buddha's month | `sa ga zla ba` | ས་ག་ཟླ་བ | `sa ga-zla ba` | *saga dawa* |
| `sojong` | Sojong (vow renewal) | `gso sbyong` | གསོ་སྦྱོང | `gso sbyong` | *sojong* |
| `fire-puja` | Fire puja | `sbyin sreg` | སྦྱིན་སྲེག | `sbyin sreg` | *jinsek* |

The last column is what THL's converter returned on 2026-11-11 for the marked Wylie in "Words separated by" mode; the verifier must reproduce it, and a different result is a finding.

Every other rule — the Medicine Buddha and Tārā pujas, Heruka Day, Ḍākinī Day, Dharma Protector Day and the seven anniversaries — is **English only**.
Their names are descriptive or composed here, not dictionary headwords, and a composed Tibetan name is not shipped unmarked ([CLAUDE.md](../../CLAUDE.md): a shipped name is printed by a source, or marked authored).

**Open spelling questions the checks must settle, not this page:**

- Whether the Day of Miracles is spelled `cho 'phrul` or `chos 'phrul` in the dictionaries.
- Whether the Saga Dawa festival is `sa ga zla ba dus chen` or carries the genitive, `sa ga zla ba'i dus chen`.
- Whether each compound is a headword in its own right or only its last part is (`dus chen`), in which case the name ships only if the head word is found and the sense is read.

## Sources, and what each is trusted for

The same sources the other name verifiers already read, through [scripts/tibetan-dictionary.mjs](../../scripts/tibetan-dictionary.mjs) and the public aggregate it reads from; no new source is introduced.

| Source | Standing | Trusted for |
|---|---|---|
| **Jäschke**, *A Tibetan-English Dictionary* (1881) | Public domain, quotable by page | That a headword exists and its sense |
| **Das**, *A Tibetan-English Dictionary* (1902) | Public domain, quotable by page; **partly dependent** on the canonical lexicons | The same; corroboration, not a second witness, where it agrees with the Mahāvyutpatti |
| **Mahāvyutpatti** महाव्युत्पत्ति | Public domain; independent of Janson and Henning | Whether a term is attested with a Sanskrit counterpart (for *sojong*, *poṣadha*) |
| **Monier-Williams** (1899), via the Cologne scan, read with `entriesHeadedBy` | Public domain | The Sanskrit sense where one is cited |
| ***tshig mdzod chen mo***, ***dung dkar tshig mdzod chen mo*** | Copyrighted: **gate only** | That a headword exists; never quoted |
| THL's own phonetics converter | A published standard | The `phonetic` field, verbatim |

## The checks

Every one of the seven names must pass all of them, or it ships **English only**:

1. **Script from two independent converters.**
   `jsewts` and `tibetan-ewts-converter`, resolved from a scratch directory outside the repository, produce identical script from the Wylie.
2. **A round trip.**
   The script converts back to the Wylie it came from.
3. **A headword in at least two public-domain sources**, for the whole term or, for a compound, for its head word, with the page or entry cited.
   Where the two sources are not independent (Das against the Mahāvyutpatti) they count as one witness.
4. **The sense is read, not the presence.**
   A headword's entry must state the calendar or ritual sense, not merely exist: `dus chen` and `zla ba` have other senses, and the homograph trap is the one [month-and-yoga-sourcing.md](month-and-yoga-sourcing.md) records.
5. **THL phonetics from the converter's word-separated mode, with the word boundaries marked** (Andreas, 2026-11-11), as in the table: "Words separated by" joins the syllables of each word and applies THL's own sandhi (*chönkhor*, *chontrül*), where the syllable-by-syllable mode the other shipped names use gives "so jong" and "dü chen".
   **The boundaries are a judgement, so they are checked**: each marked word must be a headword (or part of one) found by check 3, and a boundary placed wrongly is silent — `sa ga zla ba'i dus chen` marked as one word gives "sagandawé düchen".
   These seven are the first shipped names to use this mode; the other 97 stay spaced until the surface-wide roadmap item lands, so for now the package is inconsistent on purpose.

The verifier refuses to emit if any check fails, and a check placed after the emit gate cannot fail the run, so each is placed above it and proved by mutation of its **input**, with an unmutated control.

## What this record does not claim

- That any of the seven names is *correct* Tibetan: it claims only that a name which passes the checks is attested by the sources named, in the form given.
- That the English names are translations. They are cited to FPMT's calendar labels or to Cornu's *Tibetan Astrology*, or marked authored, as [observances.md](../observances.md) records.
- That a Tibetan teacher agrees with the choice of name for a festival. Whether centres use these spellings, and the established Tibetan headings for the three levels, are questions for a teacher.

## For Andreas to approve

1. The seven rules above are the only ones that ship a Tibetan name.
2. The five checks, and that a name failing any of them ships English only.
3. That the spelling variants above are settled by the checks and not by this page.
