# tibetan-calendar-temporal

Tibetan calendar computation engine — Phugpa and Bhutanese traditions. Pure TypeScript, zero runtime
dependencies, built on Temporal.

- Every rule, and **what fails when you break it**: [docs/coding-standards.md](docs/coding-standards.md) —
  the enforcement map. This file says *why* a rule exists; that one says whether a machine catches it
- **How the calendar works, for anyone who has not met it**:
  [docs/how-it-is-calculated.md](docs/how-it-is-calculated.md) — leap months, doubled and skipped
  days, and what `a₂` is. Read it before touching the arithmetic or arguing about a divergent date
- Architecture, API design, core types: [docs/architecture.md](docs/architecture.md)
- **The long-form consumer companion to the README**: [docs/guide.md](docs/guide.md) — the hard
  cases, where a day begins, the two kinds of config, and running outside Node 26. **It ships to
  npm**, so its examples are contract; `test/guide.test.ts` asserts every one that states a value
- **What a reader is owed about correctness**: [docs/why-trust-these-dates.md](docs/why-trust-these-dates.md)
  — the reader-facing account of what is validated and over which years. **It is the only document
  besides `docs/testing.md` that may quote a validation window**; the README and any pitch link to
  it rather than restating a number. It ships to npm too
- **FPMT's calendar, specifically**: [docs/fpmt-calendar.md](docs/fpmt-calendar.md) — **not shipped**.
  What FPMT prints that the package does not claim: eclipses dated by UTC against FPMT's own "date in
  India" guidance, and its anniversaries by Tibetan and Western date. Decided 2026-09-19 that
  FPMT-specific validation — the FPMT config the test suite will hold — reports its window **here**,
  not in `why-trust-these-dates.md`, which states only what the package itself claims
- What else computes Tibetan dates, and when to use it instead:
  [docs/other-implementations.md](docs/other-implementations.md) — every claim from public metadata
  with an access date, and **no competitor source is ever read**
- Testing strategy: [docs/testing.md](docs/testing.md)
- **Every source checked against, and its lineage**:
  [docs/validation-sources.md](docs/validation-sources.md) — read this **before** treating any new
  source as corroboration. Agreement is only evidence if the source did not reach its answer the way
  we did, and two sources in one lineage agreeing tells you nothing. It also lists what has been
  tried and rejected, with reasons, so the same dead ends are not re-walked
- What differs between traditions, and the two source traps found while working it out:
  [docs/traditions.md](docs/traditions.md)
- Provenance of every name string, grouped in [docs/names/](docs/names/):
  [vocabulary.md](docs/names/vocabulary.md) for the 27 shipped terms,
  [rabjung.md](docs/names/rabjung.md) for the 60-name table, and
  **[rabjung-sourcing.md](docs/names/rabjung-sourcing.md) for the hunt behind it** — every source
  tried, the dead ends with their evidence, and the two findings that changed the method. Read the
  last one before treating any new source as corroboration for a name.
  **[month-and-yoga-sourcing.md](docs/names/month-and-yoga-sourcing.md)** is the same record for the
  lunar-mansion and seasonal month names and the ten elemental yogas — written **ahead of the code**,
  so it holds decisions (variants, season keys, two yoga corrections) that nothing enforces yet
  **[mansion-and-trigram-sourcing.md](docs/names/mansion-and-trigram-sourcing.md)** is the same for the
  eight trigrams and the 27 lunar mansions, and it holds the table of
  every English candidate for a mansion behind the decision that none ships
- Implementation phases and the **pre-v1.0.0 checklist**: [docs/roadmap.md](docs/roadmap.md) —
  check it before any release; it holds deliberately deferred decisions
- Contributor rules, dev setup: [CONTRIBUTING.md](CONTRIBUTING.md)
- Decision records: [docs/decisions/](docs/decisions/)

## Clean-room constraint — read this first

**Do NOT read, open, fetch, or reference the source code of `eszthoff/tibetan-date-calculator`
or `eszthoff/tibetan-calendar-temporal`.** The reason is **evidence, not licence risk**: the commit
history is this project's proof of independent derivation from Janson, and that proof is worth
exactly as much as the claim that nobody here has read the alternative. Reading it cannot be undone
and cannot be disproved afterwards.

Do not restate the older rationale, which was wrong and was corrected on 2026-08-23. It ran: neither
repository carries a `LICENSE` file, therefore the code is all-rights-reserved, therefore reading it
would poison this project's MIT licence. The premise is checkable and true — there is no `LICENSE`
file on GitHub, on the current GitLab home, or in the published tarball. The conclusion does not
follow: `tibetan-date-calculator` declares `"license": "MIT"` in `package.json`, and has on every
version since 1.0.0 in June 2019, which is a licence grant. The constraint is unchanged; only its
justification is, and the new one does not depend on anybody's licence.

Implement solely from Svante Janson, "Tibetan Calendar Mathematics" (arXiv:1401.6285).

**That rule governs the calendar arithmetic, and it is narrower than it looks.** It is about the
*algorithm* — epochs, mean motions, correction tables, leap-month and skipped-day rules — where a
second source means reconciling two formulas for one number, which is how the `a₂` fork and the
mixed-radix traps happened. It has never governed the **data** this package ships alongside the
arithmetic, and the repository already proves that: `DEFAULT_OBSERVANCES`'s observance rules cite **FPMT**, and the
Tibetan and rabjung names cite Wiktionary, THL, CLDR, Csoma, Monier-Williams and wisdomlib — five
independent checks, because for a name a single Janson table is explicitly *not* sufficient.

State this because the flat reading cost real time on 2026-09-03: scoping the `./astrology` work,
the sole-source line was read as forbidding Henning's lunar-mansion element table, and a sibling npm
package was designed to escape a constraint that does not apply. Janson himself does not derive that
table — he cites Henning for it — so using it is an ordinary citation chain, not two sources
disagreeing. **Do not confuse this rule with the clean-room constraint above**, which is a different
thing entirely: that one names two specific unlicensed implementations and is about evidence of
independent derivation, not about which scholarship may be cited.

**Read the LaTeX source, never PDF-extracted text.**
Fetch it with `curl -L -o 1401.6285.gz https://arxiv.org/e-print/1401.6285`, then `gzip -dc` it to
`tibet.tex`. **`-L` is not optional**: arXiv redirects `/e-print/` to `/src/`, so without it curl
saves a 215-byte redirect page, `gzip -dc` produces an empty file, and the failure surfaces much
later as "label not found" rather than as a download error. Found by following these instructions on
2026-08-21 and getting an empty file.
Keep it outside the repository: arXiv's default submission licence grants arXiv distribution
rights, not third-party redistribution, so vendoring a copy here would raise exactly the licence
question this project exists to avoid.
**`.gitignore` therefore ignores `*.tgz` but deliberately not `*.gz`** — a stray copy of the source
must stay visible in `git status` as the licence problem it is, and an ignore rule would turn it
into an invisible one. Do not "tidy" the two together.

`pdftotext` silently drops `⌊⌋`, `⌈⌉`, `≤`, `≥` and Greek constants, and it has already produced
three wrong formulas in this project: `⌊⌋` where Janson has `⌈⌉` in the month inversion, `≤ 41`
where he has `≥ 41` in the leap-year rule, and a swallowed `β` in the definition of γ.
None of these crash — they yield a plausible calendar that is quietly wrong, which is the most
expensive kind of error here.
Do not derive any formula from PDF text, and do not accept a mitigation that depends on
"checking the rendered PDF" unless a renderer is actually installed.

There is a second, positive reason to read the source: **Janson's LaTeX comments carry worked
examples that are absent from the rendered paper.** The `a₂` fork was settled by one of them — a
commented three-line comparison showing the Men-Tsee-Khang almanac's printed true date agreeing
with `1/28` and disagreeing with Henning's value. No PDF, however well rendered, contains it.
When a question looks unanswerable from the published text, grep the comments before concluding
the paper is silent.

**Cite by section and content, never by number.** `T12` and `T60` in the LaTeX are *labels*, not
table numbers — `T12` is the twelve-animal cycle, which prints as Table 3, while the 60-year
cycle table is a different one entirely. Equation numbers are generated at render time and
cannot be checked without a renderer, which is not installed. Write "§5, the inverse problem" or
quote the constant's mixed-radix form (`m₁ = 29;31,50,0,480 ⟨60,60,6,707⟩`) — both are greppable
in the source, which is the whole point.

**Janson is the sole source, and he is not always self-consistent.** His day-of-week table gives
Saturday as `spen ma`; his own Bhutan appendix gives `spen pa` for the same day in Tibet. The wrong
one reached a shipped docblock and sat there for three phases. So for **names**, a single Janson
table is not sufficient evidence — `scripts/verify-name-sources.mjs` puts every term through five
independent checks and refuses to emit if any fails.

**And his sixty-year name table is not independent evidence at all**: his own LaTeX says it is
"taken from `\cite{Henning}`", so his Sanskrit column and Henning's are one witness rather than two.
That went unnoticed for months while the table was treated as the Tibetan-lineage authority. The
independent witness is **Csoma de Kőrös, *A Grammar of the Tibetan Language* (Calcutta 1834)**, whose
§233 plates print the Sanskrit in Tibetan script — the only script any source attests for that list.
Before citing a source as corroboration for a name, check whose lineage it is; the date on the title
page is not the answer. Corrections to the source live in that script
as data carrying their evidence, and self-invalidate; do not patch a name by editing `src/names.ts`.

Two further traps of the same class, both found in his tables and both documented in
[docs/traditions.md](docs/traditions.md): his mixed-radix notation distinguishes an integer part by
**semicolon** from a leading **comma** that has none, and his four-version epoch table is stated
**exactly one mean lunar month** away from the epoch a `TraditionConfig` uses. Either misread yields
a calendar that runs and is wrong. His six-decimal column is the guard against the first — use it.

**Fixtures are generated, not transcribed.** `test/fixtures/losar.ts`, `sixty-year-cycle.ts`,
`janson-epoch.ts` and `cross-version-leap.ts` come from `scripts/extract-janson-fixtures.mjs`, which
parses the LaTeX; the three `crosscheck-*.ts` **data** files come from their own
`scripts/fetch-*-fixtures.mjs` — `crosscheck-row.ts` is not one of them, and is covered below;
`names.ts` from `scripts/verify-name-sources.mjs`; `bhutan.ts` from
`scripts/fetch-bhutan-fixtures.mjs`. Re-run those rather than editing the output. Hand-copying 120 dates is how a silent one-day error reaches the primary
correctness gate — and an early draft of `docs/testing.md` did exactly that, dating Losar 2026 to
17 February instead of 18.

`test/fixtures/fpmt-observances.ts` comes from `scripts/fetch-fpmt-observances.mjs`, which parses
FPMT's monthly calendars at `fpmt.org/resources/calendar/YYYY/Month.php`. Those are HTML tables
mapping each Gregorian day to its Tibetan day number and observance labels, so they are the only
**day-by-day almanac** source here — which is what makes them able to settle the `a₂` fork, where a
list of observance dates cannot. Parse the markup, never a summarised rendering: a summarising
fetch got the month-span caption wrong, reading the range `Tibetan Months 9-11` as two months
rather than three. This is the same failure the LaTeX rule exists to prevent.

There are **three** deliberate exceptions to the generated rule, and the test for all of them is
narrow: the authority publishes the data with **nothing usable to parse**, so a generator could only
wrap a lossy reading. "Parsing it is inconvenient" is not the test.

`test/fixtures/fpmt-holy-days.ts` is hand-curated because FPMT publishes *those* dates in prose
announcements with no feed. Its safeguards are that it is short enough to check by eye, every row
carries its source URL, and every row was confirmed against three independent implementations first.

`test/fixtures/rgob.ts` is hand-curated because the Royal Government of Bhutan publishes its calendar
as a **scanned PDF with no text layer** — `pdftotext` returns nothing — so a generator would be OCR,
and an OCR misread of a Tibetan numeral is a plausible wrong date. It earns the exception by being
the only Bhutanese source here that is *not* Henning's lineage: `test/fixtures/bhutan.ts` descends
from his "Open Source Bhutanese Calendar" software, and so does every other one found. **Its numerals
were read by a human on purpose** — a machine reading of the same document misread three cells in
nineteen, all `༠` against `༤` or `༥` against `༆`. Do not regenerate it, and do not extend it from a
machine reading.

`test/fixtures/henning-six-seasons.ts` is hand-curated because its only full source, Henning's list
of the Indian months (*Kālacakra and the Tibetan Calendar*, pp. 358–359), exists here as a **scanned
book whose OCR layer shifts the table's columns against its rows** — so unlike `rgob.ts` there *is*
text, and it is the wrong text: a generator would pair months with the wrong seasons, and nothing
about the output would look wrong. Janson gives months 1 and 3 of the system and cites Henning for
the rest, so his two statements check the file without being a second witness. **The pairing was
confirmed against the scanned pages by eye**, it is twelve rows, and every row cites a page — taken
from the OCR layer's placement, which was **not** checked by eye, as the file says. Added
2026-09-14; `npm run test:conventions` row X8 proves it passes Rule 7 by the allowlist rather than by a
script happening to mention its name. Do not regenerate it from the OCR.

**A further provenance category, which is not an exception.** A file in `test/fixtures/` that
declares **no data at all** — only types — is exempt, because there is nothing to transcribe and so
the error the rule prevents cannot occur in it. `test/fixtures/crosscheck-row.ts` is the only one:
the row type its three sibling fixtures share. `check:conventions` tests this **before** the
generator lookup, deliberately, because the three generators emit an import naming that file and the
provenance check cannot tell an import line from a generator's output — so it would otherwise pass
by coincidence, and a provenance rule that passes for the wrong reason is worse than one that fails.
Do not widen the category to a file that declares a `const`.

It lives in `test/fixtures/` rather than `test/support/` for a reason that is easy to undo: **every
file in `test/fixtures/` imports only from `test/fixtures/`**, and that closure is what lets
"fixtures do not depend on the engine" be true by inspection rather than by audit.
`test/support/versions.ts` imports from `src/`, so moving a shared fixture type there would quietly
end that. The independence is load-bearing —
[docs/decisions/2026-08-16-exported-means-validated.md](docs/decisions/2026-08-16-exported-means-validated.md)
rests on it.

None of these justifications extends to the calendars above. Do not "fix" any of the three by trying
to generate it, and do not delete one for breaking the rule. See `docs/testing.md`, which also states the window
each agreement actually covers — Phugpa's day-by-day external validation spans 1 January 2022 to
25 February 2028, between four sources, against a documented range starting 1447, and Bhutan's spans
1 January 2000 to 2 April 2030 against one lineage plus
twenty-five government-published days — so cite the window whenever citing the agreement.

**The observance window is narrower than the date window, and quoting the wrong one is a live
trap.** 1 January 2022 to 25 February 2028 is the *union* of four sources and covers **dates**. The only source carrying
observance labels is `test/fixtures/fpmt-observances.ts`, and it runs **2022–2025** — so a claim
about which days carry a puja has three fewer years behind it than a claim about which Tibetan day a
date is. `docs/why-trust-these-dates.md` states both correctly; the trap is that this file states
only the wider one, and an agent answering an observance question reaches for what it read here.
Done on 2026-09-10, answering which days carried Tara puja in late 2026: the dates were corroborated
by three external calendars and the *labels* by nothing, and the reply claimed FPMT coverage that
stops a year earlier. Cite 2022–2025 for an observance, 1 January 2022 to 25 February 2028 for a date.
**A full or new moon has the observance window too**, 2022–2025, from the same fixture's moon icons
since 2026-09-19 — and it is agreement with FPMT's icons, whose own source is unrecorded, not with
the almanac. Count moons, not icons: FPMT marks both halves of some doubled dates, and those extra
icons are recorded in `docs/testing.md`, deliberately not on the shipped page.

**Before calling a source falsified, test every reading its words allow — and read it to the end.**
The sojong teaching said sojong "at the end of the odd months" is "the 14th". On 2026-09-04 that was
tested as Tibetan date 29 against 30, failed, and was recorded as falsified with an instruction not
to re-test it without new material. On 2026-09-19 it turned out to mean the **14th day counted since
the previous sojong** — the notes' own last line says "14 or 15 days between the Sojongs" — and read
that way it reproduces 96 of FPMT's 98 intervals. Three readings of "which month" had been tried and
none of "which day". Two habits come out of it. A number in a rule can be a **label or a count**, and
a test of one says nothing about the other. And a source that seems to **contradict itself** — FPMT
putting sojong on the first of a doubled day while keeping düchens on the second, which reached two
shipped docblocks and three documents as evidence that the convention is inconsistent — is first evidence that the
model of the item is wrong: sojong was never a date, so no doubled-day convention applied to it.
Never write "do not re-test" into a verdict; record which readings were tested instead.

**Since 2026-09-12 there is a third tier, and it is the weakest of the three.** The `./astrology`
attributes are **not** covered by either figure above, and the differences are not about years:

- The attribute **cycles** — the year's five elements, the month's and lunar day's labels, the
  calendar day's — are checked against **Janson's own printed tables and his prose, and nothing
  else**. He computed those tables from the formulas implemented here, so agreement catches a
  transcription or formula error and is **not external corroboration**. There is no window to quote,
  because there is no external source.
- The **lunar mansion** agrees with FPMT on **97.6%** of 1,459 days, 2022–2025, Phugpa only — and the
  residual is characterised rather than excused. **It is FPMT's, not the arithmetic's**: Henning's daily
  Phugpa calendars match this engine on all 1,459 days and fail on the same 35. The 35 are one-sided
  (FPMT gives the *next* mansion late in a mansion), cluster in 2025, have no established cause, and
  **six of them fit no pattern**. This replaced, on 2026-09-14, an explanation blaming Janson's `/27`
  approximation — which he gives as the almanac's own method, so it could never have separated the two.
  Before explaining a residual by a formula, check whether the source uses the same formula.
- **Yoga favorability** agrees with FPMT's printed prefixes on 99.7% of **its own 1,460 days** — every
  day whose code has a readable prefix and pair, one more than the mansion's, because 2024-09-12's
  `UD-EW` names no yoga and so cannot force a mansion element but is still a favorability claim. That
  check is independent of the mansion because it reads FPMT's own pair letters.
- **The yoga table's element pairs and its grading** have, since 2026-09-14, a Tibetan witness outside
  Henning: the *tshig mdzod chen mo*'s `'phrod sbyor` states the same pair for all ten, and grades the
  ten into good, restorative, bad and worst, which ships as `auspiciousness`. It is a check on **ten
  table rows**, not on days, so it has no window. **The grading's membership is inferred from list
  order** — the entry gives each group's size and never its members — and `favorable` agreeing with it
  on all ten is two claims coinciding, not a validation of either.

So never answer an attribute question with the date window, and never call the mansion "validated"
without the 97.6% and its six unexplained days. `docs/testing.md` holds the table;
`docs/why-trust-these-dates.md` states the consumer-facing version, and the bullet there that used to
read "no astrological information is computed" is the shape of error to expect when a layer lands.

`scripts/rabjung-names.data.json` is **not** a second exception, because it is not a fixture: no
test reads it, and nothing in `src/` depends on it. It holds the one **authored** column of
`docs/names/rabjung.md` — English glosses of the Tibetan names. Keep it out of `test/fixtures/`, and
keep every other column of that document generated: the whole value of the table is that a reader
can tell sourced columns from authored ones at a glance, and it now prints both an authored English
gloss of the Tibetan and a sourced Sanskrit sense side by side precisely so the difference is
visible rather than asserted.

Its Lhasa-phonetic column was retired on 2026-08-21 when THL Simplified phonetics replaced it. That
is the general rule, not a one-off: **house conventions govern prose, a published standard governs a
shipped or tabulated data column**, because house style cannot be verified against anything.

Permitted: running those libraries locally and comparing *computed dates* against ours. Dates
are facts, not copyrightable expression. Reading their public README for API-design ideas is
also fine.

Not permitted: copying algorithms, variable names, or code structure; forking either as a base;
referencing their internal implementation decisions.

**Never add one of them as a devDependency**, however convenient it looks for regenerating a
fixture. That puts a competing implementation's code in the tree and in the lockfile, which is the
exact thing being avoided — a dependency is read by tooling, diffed in review and vendored into
caches, so "installed but not read" is not a state anyone can attest to afterwards. `scripts/fetch-eszthoff-fixtures.mjs` resolves the package from the
*caller's working directory* instead, so it is installed in a scratch directory outside the repo
and the script is run from there.

**That pattern is the rule for any generation-time package, not just the unlicensed ones.**
`scripts/verify-name-sources.mjs` needs two EWTS converters (`jsewts` and `tibetan-ewts-converter`)
and resolves both the same way. Nothing that exists only to build a fixture belongs in this
package's dependency tree — the zero-dependency claim runs through the lockfile as well as the
runtime.

The commit history is the evidence of independent derivation. Keep commits incremental and
tied to the paper's sections — do not squash the build into a single large commit.

This cuts the opposite way for documentation: batch doc edits into meaningful units rather
than committing each one. Granular commits earn their place in `src/`, where they show
derivation; in `docs/` they are just noise.

## Non-negotiable technical rules

- **Temporal only.** `Temporal.PlainDate` everywhere. Never `Date`.
- **Integer arithmetic only.** All Phugpa math uses integer division with fixed denominators.
  No floating point anywhere — it is what makes results deterministic and identical across
  platforms.
- **Zero runtime dependencies.** Temporal is a language built-in; the engine depends on nothing.
- **ESM only.** `"type": "module"`. No dual CJS build.
- **A new subsystem duplicates the boundary code it cannot import, and it has done so twice.**
  When `./astrology` landed on 2026-09-12 it wrote its own `isoOf`, duplicating `navigation.ts`'s
  private `phaseStart`, and its own `assertQueryOptions`, duplicating `./observances`'. Neither was
  carelessness: the existing helpers were **private to another module**, so there was nothing to
  import and nowhere obvious to look. Both copies then drifted, and each shipped an error message
  that misdescribes its own function — `nextFullMoon` naming two accepted shapes while accepting
  four, `attributesFor` naming four while never mentioning the resolved `TibetanDate` it takes.
  A sweep on 2026-09-23 found **four** duplicate clusters across 172 functions, one of which this
  file already documented and nobody had cleaned up.

  So **boundary and guard code has one named home**, and `check:conventions` rule 14 refuses two
  functions in `src/` that share a body. **Rule 14 catches copy-paste and cannot catch this** —
  `phaseStart` and `isoOf` differ in body and in arity, so no predicate groups them. What catches
  it is a question at review, when a new subsystem lands: **which boundary helpers did you write,
  and did one already exist?** Ask it about guards, normalisers, validators and value-renderers
  specifically; those are what every subsystem needs and what nobody thinks to look for.

  **All four clusters were closed on 2026-09-23**, so this passage is now a record of what was
  found rather than a list of open debt. `assertSafeYear` and `describe` went to `src/errors.ts`
  in `8f28389`; `assertQueryOptions` joined them, taking its message's shape example as a
  parameter, which was the **only** thing the two copies differed in; the three value-describers —
  `describeValue`, `describeFlagValue` and a third `describe` in `parse.ts` — merged into
  `errors.ts`'s, whose body won because `describeValue`'s `constructor?.name` branch existed to
  name a `Temporal.PlainDate` and the brand predicate now does that. `format.ts` keeps a `describe`
  of its own: it lists an object's keys, a different function wearing the same name.
  `phaseStart` and `isoOf` became `asWesternDay` in `computation/conversion.ts`.

  **And the class rule 14 cannot see now has a rule of its own for the case that caused it.**
  Rule 15 refuses `instanceof Temporal` anywhere in `src/` but `src/temporal-kind.ts`. That is
  checkable precisely because the home is **one named file**; a rule saying "outside the guards"
  would need the checker to know which functions count as guards. It does not generalise — rule 15
  is about one idiom, and the review question above is still what catches the rest.
- **Pure stateless functions.** Same input, same output, no side effects — measured by what a
  **caller** can observe, not by whether a module holds a variable. Memoising a pure function is
  therefore allowed and already done three times: `scalingFor` on a `WeakMap`, the config validators
  on a `WeakSet`, and `monthsFor` on a per-`(config, year)` cache. Do not delete one for offending
  the word "stateless"; `monthsFor` earns its keep because stepping a month grid re-derives
  neighbouring years constantly, and caching cuts a repeated year from ~180 µs to under 1 µs.

  Two things a cache here must get right, both of which a naive one gets wrong. **Key on the config,
  not just the year** — a config-blind cache serves one tradition's answers for another, and would
  pass nearly every test, since `PHUGPA` and `PHUGPA_HENNING` diverge at month level in only four
  years between 1500 and 2500. And **never hand out shared mutable state**: return a fresh array, or
  one consumer's `sort()` corrupts the next consumer's.
- **Tradition constants are injected** via `TraditionConfig`, never hardcoded. v1 ships `PHUGPA`,
  `PHUGPA_HENNING`, `BHUTAN` and `BHUTAN_HENNING`; Tsurphu and the Mongolian version must remain
  addable without touching the algorithm, and the promise is no longer theoretical — Bhutan was added
  that way on 2026-08-16, and it took two new config fields and no change to any formula.

  **That promise was false until 2026-08-16, and the way it was false is the lesson.** Every
  *constant* was injected, but the **leap-month rule itself** was hardcoded to Phugpa's — Janson
  states a different one for each version (48/49 Phugpa, 0/1 Tsurphu, 46/47 Mongolian, 57/58
  Bhutanese). A Tsurphu config built from constants alone would have placed leap months in the wrong
  years, with no error and nothing about the output looking wrong. It is now
  `leapIndexThreshold`, and `β` and the true-month rounding term derive from it. When adding a
  tradition, check that the *rules* are injected too, not only the numbers.
  **It extends to the docblocks as well as the code**, which is subtler and was live until
  2026-08-16. `leapMonthNumberFor` (then `leapMonthOfYear`) takes a config and its example read
  `leapMonthOfYear(2151) // 6`
  — true for Phugpa and for nothing else: varying `leapIndexThreshold` alone gives Mongolian 5 and
  Bhutanese 10 (the shipped `BHUTAN` config, which also sets `leapMonthPosition`, gives **8** — quote
  such a figure with the constant it varies), and Tsurphu has no leap
  month that year at all. The same docblock stated that a leap month "precedes the regular month
  sharing it", which holds for every version Janson gives **except Bhutan**, where it follows — the
  position gap [docs/traditions.md](docs/traditions.md) records as unmodelled. So a docblock on a
  config-taking function was promising something the engine does not do. If a function takes a
  `TraditionConfig`, its examples state **one** tradition's answer and must say which, and any
  structural claim has to be checked against Bhutan specifically, which is where the versions
  diverge most. `test/docblock-examples.test.ts` pins the thresholds; a third instance of the
  "precedes" claim survives in `src/types.ts` on `lunation`, where it explains tuple sort order,
  and was made tradition-aware when `leapMonthPosition` landed; the stale claim that survived instead
  was on `leapMonthNumberFor`, corrected 2026-08-23 after a smoke client found it shipping in
  `dist`. It was `leapMonthOfYear` until 2026-08-26, when it was renamed as the last public `*Of`.

  This extends to anything **derived from** those constants. The `±3` search window in
  `isoToTibetan` was proved from `(25 + 11)/60` — Phugpa's largest `moonTab` and `sunTab` entries —
  and written at the loop as a literal `3`, so a wider table passed validation and then broke the
  window on 8% of days, half of them by returning a date that did not convert back. It is now
  `ScaledTradition.searchHalfWidth`, computed per tradition. If a bound is proved from a config's
  numbers, derive it from that config; assertions specific to Phugpa's values belong in the test
  suite, where they also catch a mistyped transcription.
- **The shipped configs are deeply frozen.** All five — `PHUGPA`, `PHUGPA_HENNING`, `BHUTAN`,
  `BHUTAN_HENNING` and `DEFAULT_OBSERVANCES` — go through `deepFreeze` in `src/freeze.ts`. This rule named only
  three until 2026-08-26; the two Bhutanese configs were frozen from the day they landed and the
  rule simply was not updated with them. They are the objects the docs point at for `{ ...PHUGPA, … }`,
  so they are the ones a keystroke off a spread mutates — and because scaling and validation are
  both memoised on the config object, a mutation after first use yields neither the old constants
  nor the new ones but a stale mix. Do not unfreeze one to make a test easier.
- **What goes on the public surface is decided by a rule, and the rule has a scope.** Only the
  barrel in `src/index.ts` makes a name API — exporting from a module under `src/` does not, which
  is how `describeMonth` and `asPlainDate` are shared without being published.
  [docs/decisions/2026-08-12-public-surface.md](docs/decisions/2026-08-12-public-surface.md) governs
  the decision, and its 2026-08-15 revision is the part to read: the **wrong-or-impossible** test
  applies to computation internals and contested conventions, where the failure mode is a plausible
  wrong answer. A thin composition over already-public functions is judged instead by whether a
  calendar library normally provides it **and** whether it has one obvious correct semantics.

  Do not cite that record to refuse a convenience — it was misapplied that way and cost the surface
  four functions that had to be added back. Equally, do not cite the second test to expose something
  whose semantics are contested: two defensible answers means it belongs in injected config.
  `test/public-api.test.ts` pins the list and each name's kind, and `test/docblock-examples.test.ts`
  asserts every `@example` in `src/` that states a value — docblocks compile into `dist/*.d.ts`, so
  a stale one ships as contract. **That suite is maintained by hand and nothing checks it is
  complete**: `monthNamesFor`'s `mansion.sanskritName` example line went unasserted from 2026-09-17
  until a code review found it on 2026-09-18. Adding an `@example` line means adding its `expect` in
  the same commit. A failure in the first means the surface
  changed, so decide whether that was intended before editing the list.

  **But it sees runtime exports only, and a type is not one.** It reads `Object.keys(api)` and
  `typeof`, so removing an exported *interface* or *type alias* passes it — proved on 2026-08-25,
  when `RabjungName` and `SanskritName` came off the surface and the only thing that caught the
  now-false type list in `README.md` was a grep.

  **`check:conventions` rule 13 now closes the list half**, comparing all three barrels' `export type`
  blocks against `README.md`'s three "Type-only exports" lists as sets, so ordering within a list is
  free. It held **two** barrels and a single boundary string until 2026-09-12, and a third entry point
  broke the *shape* rather than the list: one boundary cannot separate three sections, and the failure
  was silent — the unextended rule kept passing while checking nothing about `./astrology`. Each
  barrel now declares the README heading its section opens with, and the rule refuses to guess if a
  heading is missing or out of order. **A type declared in a barrel is invisible to it**, because it
  reads `export type { … } from` blocks: that is why `DayAttributes` and `AstrologyQueryOptions` live
  in `src/astrology/types.ts` rather than in the barrel, and the rule is what found them there. **It does
  not close the prose half.** A sentence describing a type's *fields* is still unguarded: the same
  README called `rabjungFor`'s `name` "the Tibetan and Sanskrit name" for hours after the Sanskrit
  came off, and the grep that found the stale list named the removed types rather than the field, so
  it sailed past. Removing or renaming a type therefore still needs the hand sweep for everything
  except the list — `docs/architecture.md`'s shapes (**26** exported types defined as interface
  blocks, plus `SanskritName`, `TibetanAnimal`, `TibetanElement`, `TibetanGender`, `TibetanName`, `TibetanWeekday`,
  `TibetanWeekdayName` and `TibetanYearName` named in field positions), `docs/guide.md` (4), and any
  docblock naming it. This figure read 7 until 2026-08-26, 10 until 2026-08-27, and moved twice on
  2026-09-12 — 13 when `TraditionNaming` and `TraditionMonthNaming` gained shapes, then 20 with the
  seven `./astrology` ones — and to 21 on 2026-09-13, when `TraditionMonthNaming` split into
  `TraditionMonthAnimals` and `TraditionNineNumbers`, and to 24 on 2026-09-14 with `monthNamesFor`'s three result types, then 25 with `LunarMansion`, and to 26 with `YogaAuspiciousness`; it moves whenever
  a shape is added, so **re-count it rather than trusting the number written here** — the count is
  `grep -c '^interface ' docs/architecture.md`.

  Those shapes are **complete** — every field, not a selection — and that is the rule that keeps
  failing silently. `TibetanDate` had drifted to 10 of its 15 fields with nothing saying so; the
  2026-08-27 sweep then found `TibetanYearName` at **3 of 6**, the three `*Name` fields having
  arrived with the naming layer on 2026-08-16 without the shape being touched, and
  `TibetanMonthFields` missing its `calendarId` phantom. Nothing mechanical sees any of this. When
  you add a field to an exported type, the shape in `docs/architecture.md` is part of the change.

  **And a signature is not a runtime export either.** The suite pins *names* and *kinds* —
  `Object.keys` and `typeof` — so changing a function's parameters passes every one of the ten
  commands as a **surface** check. When the reshape of `getObservances(from, to, config?,
  tradition?)` to an options bag was actually done on 2026-08-26 it broke **16 call sites**, one of
  them production code (`src/observances/index.ts`, where `observancesOn` delegates), and nothing
  reported it as an API change — it surfaced as ordinary type errors scattered across suites, which
  is what a *typo* looks like too. When changing a signature, count the call sites first and say the
  number in the commit message; the compiler will find them, but only after you have decided the
  change was small.

  **That number was written here as 21 before the work was done, and it was wrong.** The estimate
  counted every *occurrence* of the two names; only the calls actually passing a config or tradition
  positionally break, and `(from, to)` calls still compile. The lesson is not the arithmetic: **a
  figure recorded in this file before the work is an estimate, and must be re-measured and corrected
  when the work lands**, because everything else here reads as measured. Found by the doc-drift
  sweep, not by any check.

  **A widening is not "purely additive" if the added arm is structurally ambiguous with an existing
  one.** `nextFullMoon` was widened on 2026-08-26 to take `TibetanDateFields` beside
  `Temporal.PlainDate`, judged additive because it removed nothing. It was additive in the *type*
  and breaking in the *contract*: a bare `{ year, month, day }` is a genuine value of both, so the
  parameter silently resolved a calendar ambiguity that `asPlainDate` refuses everywhere else, and
  `nextFullMoon({ year: 2026, month: 1, day: 1 })` meant as a Western date returned a day in
  **1899**. Narrowed back on 2026-08-27; both the rule and the two arguments that lost are in
  [docs/decisions/2026-08-12-public-surface.md](docs/decisions/2026-08-12-public-surface.md).

  The rule that came out of it: **a parameter spanning two calendars accepts only shapes that say
  which one they mean** — a `Temporal` instance or a resolved `TibetanDate`, never loose fields.
  It does **not** generalise to the fields-in convention elsewhere: `addDays`, `daysBetween` and
  `addMonthsToDate` take one calendar, so they have no ambiguity and keep taking loose fields.
  **Put the guard where the ambiguity is; uniformity is not the goal.**

  Two corollaries worth having before the next such change. Reversibility cuts the same way it does
  for the `TibetanWeekday` brand — widening later is free, narrowing never is — so ship the narrow
  arm and widen on demand. And when a batch adds a **composition** and a **convenience the
  composition subsumes**, check the pair against each other before both ship: `resolveDate` landed
  in the same batch as this widening and was never compared with it, and
  `nextFullMoon(resolveDate(x))` is what the widening was avoiding.

  **A `TraditionConfig` is judged by a different rule, because it is a different kind of claim.**
  That record is about API design; a config asserts that dates computed with it are a real
  tradition's real dates. So it is exported only once the engine has been tiled against an
  **external** calendar for that tradition, day by day —
  [docs/decisions/2026-08-16-exported-means-validated.md](docs/decisions/2026-08-16-exported-means-validated.md),
  enforced by `check:conventions`, which requires a suite in `test/validation/` to **import** the
  config. Naming it in a comment or a `describe` title does not count — that grep-shaped version of
  the rule stayed green when a suite's assertions were deleted and its prose left behind.
  Expressing a tradition, validating its leap months and validating
  its dates are three claims, not one: **Tsurphu and the Mongolian version are fully expressible and
  their leap months are checked against Janson, and both stay unexported**, because nothing checks a
  Tsurphu date. Self-consistency is not a substitute — the Bhutan work's inverse-pair round trip
  passed under a labelling that was consistently wrong, and only external data caught it. Record the
  window in `docs/testing.md`; agreement cited without its window is what that file exists to
  prevent.
- **Errors carry codes; do not add an error class.** Throw through `rangeError`/`codedError` in
  `src/errors.ts`, never a bare `new RangeError` — the code is the part consumers branch on, and a
  bare construction silently omits it. `SkippedDayError` is the only class and stays the only one.
  `check:conventions` now enforces this; the one bare `new Error` that predated it sat in
  `epoch.ts` discharging a `noUncheckedIndexedAccess` widening. That is what `assertInternal` is
  for, and it is the required idiom — the alternative, a cast, lets a bad index return `undefined`
  wearing the element type, which is how the same constraint was discharged two different ways in
  the same codebase.
  Codes are contract and message text is not, so assert on the code in tests and never tell a
  consumer to match wording. `tibetanDateExists` swallows errors by **allowlist** — **one class and
  two codes**: `SkippedDayError` matched by class, plus `TCT_FIELD_OUT_OF_RANGE` and
  `TCT_NO_SUCH_LEAP_MONTH`; everything else rethrows — and must not go back to a denylist: as one, a
  single bare `RangeError` in `scaleTo` made it report that Losar 2026 does not exist.

  **This sentence read "three codes answer `false`" until 2026-09-23, which was wrong**, and it was
  the **eighth** site saying so: the nyamlen polyfill probe found the rule stated two ways in
  `dist`, an adversarial review found three more, a spec panel found a seventh in an inline comment,
  and the doc-drift sweep before clearing that session found this one. `TCT_SKIPPED_DAY` is **not**
  matched as a code at all, so an error carrying it without the class would rethrow. The lesson is
  not the miscount: it is that the rule book itself drifts with the code, and that a claim repeated
  in N places is corrected in N places or not at all — **and N is never the number last written
  down**. This passage said eight, twice, and was stale within the day: the sweep that closed it
  found seven more in `src/` and three in `docs/`, the latter missed by a first pass that cleared
  `docs/` on a phrase-grep where only a name-grep reaches them. Count again; do not quote this
  sentence's number. Both rules and the message-writing
  guidance:
  [docs/decisions/2026-08-12-error-codes-not-classes.md](docs/decisions/2026-08-12-error-codes-not-classes.md).

  **A third semantics arrived with `./astrology` on 2026-09-12, and it is neither of the two below.**
  `TCT_ATTRIBUTE_NOT_SOURCED` means the caller's input is **fine** and no source gives the answer —
  the Bhutanese month and lunar-day attributes, which Janson does not tabulate. It is
  `TCT_INVALID_ARGUMENT`'s neighbour rather than `TCT_FIELD_OUT_OF_RANGE`'s, it is deliberately
  **off** `tibetanDateExists`'s allowlist (a Bhutanese date exists; only an attribute of it is
  unsourced), and the refusal is reached by a tradition carrying no `naming.monthAnimals` block rather than
  by any code asking "is this Bhutan". A **composition** may report it as `null` where a primitive
  throws — `attributesFor` does — on the reasoning that a specific question with no answer is an
  error while "what is known about this day" is not. Reach for this code, not the range one, when the
  gap is in the sources.

  Two codes, not one, for bad input: `TCT_FIELD_OUT_OF_RANGE` means a **number** is wrong;
  `TCT_INVALID_ARGUMENT` means the argument is the wrong **kind of thing** — a `Temporal` instance
  where a Tibetan date belongs, a non-boolean leap flag, `null`. Only the first is on the allowlist,
  which is what makes a caller's type confusion throw instead of being reported as a date that does
  not exist. A new shape check uses the second, never the first:
  [docs/decisions/2026-08-15-argument-errors-split.md](docs/decisions/2026-08-15-argument-errors-split.md).
- **A function with two axes of choice takes an options bag** — not two sequential optional
  parameters, which made a caller wanting a custom tradition with the default observances write
  `getObservances(from, to, undefined, tradition)`. `getObservances`, `observancesOn` and
  `addMonthsToDate` all take one as of 2026-08-26, so it is the surface's stated pattern rather
  than a one-off. **Two things a bag gets wrong, both hit while building the first one.** It is a
  **new argument boundary and needs its own guard** — without one `observancesOn(date, null)` reads
  a property off `null` and throws an uncoded `TypeError`, which is precisely the failure the
  config validators exist to end, one level further out. And **read it with `=== undefined`, never
  `??`**: nullish-coalescing treats an explicit `null` as absent, so `{ config: null }` silently
  becomes the default where the positional signature had rejected it — a validation quietly lost in
  a refactor that looked like a pure move.
- **Every consumer config gets a validator, and every export gets a guard.** `TraditionConfig` and
  `ObservanceConfig` are both documented extension points, so both are checked at the boundary and
  memoised per object. Add a config type, add a validator — `TraditionConfig` went unchecked for
  three phases because the failure looked like a language error (`Cannot read properties of
  undefined`) rather than a missing feature. Two corollaries, each of which was violated:
  a field the type declares **required** must be rejected when absent, not merely when wrong
  (`undefined` is the likelier input, and it silently inherited whichever branch came last); and
  the boundary is the **whole** exported surface, so when an internal caller needs to skip a guard,
  give it a separate name like `isoFromJulianDayUnchecked` rather than leaving the export bare.

## Environment

Node 26 required for development — Temporal ships enabled by default from 26.0.0. Verified
working on v26.7.0.

The *published* package declares `engines: ">=26"` and **checks at import time**. `conversion.ts`
touches `Temporal` at module evaluation to build its Unix-epoch anchor, so a runtime without
Temporal fails on `import`, before any call. The guard above that line turns what was a bare
`ReferenceError: Temporal is not defined` into a message naming Node 26, `--harmony-temporal`, and
`temporal-polyfill/global`. A consumer supplying a polyfill still works — npm treats `engines` as a
warning — so do not "simplify" either the declaration or the guard away; they cover different
failures.

**Testing against a polyfill needs `installImplementation()`, and two of `temporal-polyfill`'s three
entry points cannot test anything here.** `temporal-polyfill/global` installs **only where no native
`Temporal` exists**, so on Node 26 and current Chrome it is a no-op — and so, measured 2026-09-23, is
its **main export**: `import { Temporal } from "temporal-polyfill"` returns objects for which
`x instanceof globalThis.Temporal.PlainDate` is `true`. A first attempt to reproduce a
cross-implementation defect used the main export, saw every call behave correctly, and would have
reported the defect as unreproducible.

So: `temporal-polyfill/implementation` for a genuinely **second** class, and `installImplementation()`
from `temporal-polyfill/shim` to force the polyfill **over** a native global. Neither belongs in this
package's dependency tree — resolve them from a scratch directory outside the repo, the same way
`scripts/fetch-eszthoff-fixtures.mjs` resolves its package. The evidence that the surface agrees
under a polyfill is the nyamlen polyfill probe of 2026-09-23: **fourteen dumps byte-identical**,
including real iOS Safari 26.6 and Safari 17.6.

**Temporal has no user-defined calendars.** `Temporal.Calendar` does not exist and `calendar:`
accepts only built-in CLDR identifiers, which exclude `tibetan`. Do not attempt a calendar
adapter — see [docs/decisions/2026-08-11-temporal-custom-calendars.md](docs/decisions/2026-08-11-temporal-custom-calendars.md).

**TypeScript 7 is load-bearing.** It is the first release shipping `lib.esnext.temporal.d.ts`,
which is why `tsconfig.json` sets `"lib": ["ES2024", "ESNext.Temporal"]` and `Temporal` resolves
as a global. Do **not** downgrade TypeScript, and do **not** install `temporal-spec`,
`temporal-polyfill` or any other Temporal typings package to fix a `Temporal` type error — the
zero-dependency claim runs through the published `.d.ts`, which references the global. TypeScript
5.9 and `@types/node` carry no Temporal declarations at all.

**VS Code reports four false errors in `tsconfig.json` and `tsconfig.build.json`, and they are the
editor's fault.** Its bundled JSON schema predates TypeScript 7, so it rejects `ES2024` as a target,
`ES2024` and `ESNext.Temporal` as libs, and `nodenext` as a module — the last through a plain bug in
its own pattern, which spells NodeNext with a fourth character class of `[Ed]`, so neither casing can
match. `tsc` accepts all four. Both configs name schemastore's schema, which knows them, and
`.vscode/settings.json` (gitignored, so local) points the editor there. **Do not edit the configs to
satisfy a stale schema** — the lib is what makes `Temporal` resolve as a global.

**`scripts/indic.ts` may use only erasable TypeScript syntax.** It is shared between an `.mjs`
generator, which loads it under Node's **erase-only** type stripping, and a `.ts` test; a parameter
property, an enum or a namespace fails at import with `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`.
`erasableSyntaxOnly` in `tsconfig.json` makes that a typecheck error instead of a runtime one, and
`allowImportingTsExtensions` is what lets the test name the module by its real filename — legal only
under `noEmit`, which is why `tsconfig.build.json` turns it back off.

**No bundler.** `tsc` alone emits ESM and declarations, which keeps `dist/` mirroring `src/` —
the structure the `./observances` and `./astrology` subpath exports need. Do not add tsup or similar. Both decisions:
[docs/decisions/2026-08-11-build-tooling.md](docs/decisions/2026-08-11-build-tooling.md).

## Commands

`npm run lint`, `lint:md`, `check:links`, `check:conventions`, `test:conventions`, `typecheck`,
`build`, `test`, `check:publish`, `test:pack` — CI runs all ten in that order.

**`test:conventions` is the only thing that proves `check:conventions` still reports.** It breaks
each convention in a scratch copy of the working tree — one row per rule, plus the containment
cases — and asserts on exit code **and** message, after an unmutated control. It is deliberately
**not** part of `npm test`: its subject is one script, so running it on every local test run costs
time for a result that changes only when the checker does. Run it locally when you touch
`scripts/check-conventions.mjs`; CI runs it on every push, because several rows edit specific text
(a README type name, a generator's template) and an ordinary commit can move it. That surfaces as
"mutation target not found" — point the row at the new text; the checker is not broken. A new rule
needs a new row: the suite holds its rows against the checker's `RULES` registry. It lives at
`test/` root rather than in `scripts/` for a reason that is easy to undo: Rule 7 accepts a fixture if
any script's source names it, and the harness names `fixtures/bhutan.js`.

**`check:conventions` enforces the rules in this file that lint, typecheck and the suite cannot
see**, which before it existed was all of them: the zero-dependency claim, integer-only arithmetic,
coded errors, `{@link}` targets, the reality of every `TCT_` code named in a `@throws`, the
decision-record format, fixture provenance, whether
[docs/coding-standards.md](docs/coding-standards.md) still names real commands and paths, that a
validation suite is named for the fixture it validates, that an exported **tradition** config is
imported by one — rule 10 matches only `export … from "./traditions/…"` in `src/index.ts`, so it
does **not** see `ObservanceConfig` or anything on the `./observances` or `./astrology` barrels, and
rule 13 is type-only, so neither guards a runtime value export on either — `DEFAULT_OBSERVANCES`,
`ELEMENTAL_YOGAS` and `LUNAR_MANSIONS` are held by `test/public-api.test.ts` alone, which is also the
only thing that noticed `./astrology` had shipped three mansion names nobody could use —
that a suite in `test/<name>/` is named for a module in `src/<name>/`, and that **a generated document does
not hardcode a count its generator computes** — `docs/names/rabjung.md` read "Four values are marked,
at positions …" beside an interpolated list for three commits, and there were five positions and nine
cells. Each of those fails silently
rather than loudly. When you add a rule here, check whether `scripts/check-conventions.mjs` can hold
it, and write the failing case before the check — a guard that has never failed proves nothing.

**A check placed after the emit gate cannot fail the run, whatever its comment claims.**
`scripts/verify-rabjung-names.mjs` writes its fixture immediately after the `problems` gate, and the
divergence self-invalidation sat *below* that write — so its promise that "the run fails if his table
no longer says that" had never once been true, and nothing revealed it until a deliberate mutation
did. When adding a check to a generator, put it above the gate and then **prove it by mutation**:
break the thing it guards and watch it refuse to write. This is the same rule as "a guard that has
never failed proves nothing", one level up — the guard existed, was correct, and was unreachable.

**A mutation harness needs a control, or it proves nothing either.** This is the same rule as
"a guard that has never failed proves nothing", one level further up, and it cost three false proofs
on 2026-08-25 alone. Twice a set of mutants all exited non-zero and were read as refusals; they had
died on a `SyntaxError` introduced by the mutation itself, and then on `ERR_MODULE_NOT_FOUND`,
because the mutant was written to a scratch directory while its relative imports resolve against the
file. Both look identical to a guard firing — a non-zero exit and no output you happened to be
grepping for. **So every mutation run includes an unmutated control expected to PASS**, and asserting
on the failure *message*, not the exit code, is what makes the difference visible. The control
failing is the only signal that the harness is measuring nothing.

**An inequality is the weaker assertion, and for one bug shape it is no assertion at all.** Where a
bug's signature is "two things that should differ stop differing", `expect(a).not.toBe(b)` usually
cannot fail — something *else* already distinguishes them. The doubled-day yoga is the case: the two
halves of a doubled date have different weekday elements whatever the mansion does, so
`expect(first.yoga).not.toBe(second.yoga)` held with the bug reinstated, and deleting the fix left 990
tests green while changing 19 of 31 doubled-first days. **Pin the value.** The plan that specified the
inequality had the same blind spot, so this is a rule about the instruction as much as the test.

**A comparison that agrees everywhere cannot detect being weakened, so mutate it to disagree.** The
first mutant written for `mismatchesIn` on 2026-09-18 dropped its `isLeapDay` field, and no test
could fail: against Lotsawa House and eszthoff it already reports nothing, and a predicate that
compares less can only report less. The mutant that proved it **inverted** the field instead. The
same fact limits what the suites claim: "agrees on every day" guards against a predicate that
fabricates mismatches, and nothing today would notice one quietly narrowed to the day number. The
fields a shared predicate compares are held by review and by its docblock, not by a test.

**Where the data cannot exercise a distinction, hand the predicate its rows and inject a
counterexample.** That last sentence is now less true than it was: `fpmtMoonComparison` takes
`(config, rows)`, defaulting to the fixture, and two suites pass a modified copy — one swapping an
icon's full/new kind, one moving an icon to the first half of a doubled date. FPMT's real rows never
put an icon on a moon of the other kind and never omit the second half of a doubled pair, so both
distinctions are invisible to the fixture and a mutant is the only other way to reach them. **A
mutant proves a predicate once; an injected row proves it on every run.** Each injection asserts the
unmodified row's value first, so the counterexample self-invalidates if the fixture changes under it.

**A list of mismatches says nothing about the cases that agree, so enumerate the population, not the
failures.** FPMT's moon icon was read on 2026-09-19 as marking the *Tibetan date*, because both
doubled dates that showed up as mismatches carried an icon on each half. There are **four** doubled
dates carrying a moon in the window, and the other two carry one icon only — invisible to any
mismatch list, because an icon on the engine's own day is not a mismatch. The rule it was taken to
support is false, and the count behind it ("2 of 2") was really 2 of 4. Before explaining a residual
by a rule, list every case the rule covers and check the agreeing ones too; a spec-panel review found
this and no amount of staring at the mismatch list would have.

**A guard can be well-formed, correct, and aimed where the risk is not — and it then reports
"nothing found" for ever.** This is the sibling of "a guard that has never failed proves nothing":
that one is about a guard nobody has tested, this one about a guard whose *search space* excludes
what it was built to find. On 2026-09-20 the question was whether a pre-project research document
had read a competing implementation's source. The check classified the document's **code blocks** by
heading and language tag, found them all proposing architecture for this engine, and reported no
contamination. The exposure was a **90-line prose section** headed "Architecture & API Surface",
"Mathematical Foundation", "Test Coverage" — containing **no code fences at all**, the first being
290 lines later. A check aimed at fenced regions could not fire on it, whatever it found. The
verdict was reported as reassurance and had to be withdrawn. **Before trusting a guard's silence,
state where the thing it hunts would live and check that the guard looks there.** An independent
review found this; three passes by the check's own author did not.

**A sweep whose calling convention is wrong reports agreement, which is indistinguishable from a
passing check.** Sweeping all 27 affected exports on 2026-09-23, every multi-argument one was called
as `fn(date, date)` — so `addDays`, `addMonths`, `addMonthsToDate`, `daysBetween` and `monthsBetween`
received a date where a **count** belongs. They threw for that reason, matched the control, and read
as unaffected. Called properly, all five were defective: `addDays(foreignDate, 1)` returned a
confident wrong Tibetan date. **Five of seventeen findings were invisible**, and nothing about the
output looked wrong.

This is the measurement-shaped sibling of the guard rule above, and the same session produced three
more instances — a phrase-grep that could not reach the docblocks it was hunting, a two-site reading
of a five-site problem, and a test fake too thin to exercise the path it was written for. **State
what a sweep's arguments mean before trusting what it agrees about**, and prefer a sweep that names
each call's argument shape in its output, so a wrong convention is visible rather than silent.

**A shipped instruction is contract exactly as a shipped example is, and this project's own setup is
the worst possible evidence for one.** `test/docblock-examples.test.ts` and `test/guide.test.ts`
assert every *example* that states a value; nothing asserts an *instruction* that tells a consumer
how to configure their project, and one shipped wrong for a month. The README said **"No `"lib"`
setting is needed — TypeScript 7's default already carries it"**. Measured 2026-09-22 on
typescript@7.0.2 with `module`/`moduleResolution: nodenext` and `strict`: **twelve
`TS2503: Cannot find namespace 'Temporal'`**, which is the whole surface, because dates are the
product.

**`tsconfig.json` here sets `target: ES2024` *and* `lib: ["ES2024", "ESNext.Temporal"]`** — exactly
the pair where the explicit lib is **required**. So `npm run typecheck` was green forever while a
consumer following the landing page could not compile a line. A repository's configuration is
written by people who already know the answer, so it is systematically biased towards masking this
class of defect; `test:pack` did not catch it either, because it imports and computes rather than
type-checking. `docs/guide.md` was right for a reason worth copying: it **printed a working
`tsconfig.json`** instead of describing one. Prescribe by printing something runnable, and run it in
a clean consumer before shipping it.

**The status in a tracking document describes the tracker, not the thing tracked**, and the two get
confused in the direction that invents work. `nyamlen/spikes/VERDICTS.md` was built on 2026-09-20 by
enumerating three friction lists **without cross-checking this repository's log**, so all eighteen
rows read `open` — meaning *nobody has written a verdict here*. Both roadmaps then restated it as
*the API has not survived contact with a consumer*, and an ordering was built on top of it that put
a documentation pass in front of a release. Sixteen of the eighteen had been answered on 26–27
August, by commits naming the spike's finding numbers in their own bodies. **An unrecorded fact is
not an absent one.** The error is available even to a session that has just finished documenting it:
hours later, the same session argued for a decision on the ground that the public record "only now"
existed, when those commits predated the claim by three weeks.

**A finding is not one claim, and the commit that answers it is not a reading of it.** Decompose a
source's report from **its own text** before reading whatever discharged it — a commit body
*describes* the finding it answers, and a description is not the finding. `friction-list.md`'s
finding 13 makes three claims and `864f88e` answers one; closing the row on that commit would have
shipped two reproducible defects as the evidence closing a 1.0.0 gate. Eighteen rows held
twenty-two claims once decomposed.

**And a closure can be honest and still wrong, in two ways this pass found.** `aef049f` closed a
finding correctly and documented a **remedy that does not work** — only running a consumer's
typecheck showed it. `864f88e` closed one correctly and its **subject moved underneath it**: the
sojong model it cited was overturned on 2026-09-19, and the correction reached four files but not
the README paragraph that commit had written. Nothing in that paragraph was false, which is what
made it survive; it had simply stopped where the source now goes on. **Re-check a closed item when
its subject moves**, and do it by re-reading the finding rather than the verdict.

**An ordering written as prose goes stale silently, because nothing checks that its first step is
still open.** The pre-1.0.0 checklist's preamble read "The rabjung name shape settles first" — true
when written, and stale from 2026-08-25 when that item was ticked. On 2026-09-20 a reading of it
duly proposed starting there, a month after the step was finished. The same failure is available to
every ordering and count in this file: a `[x]` beside an item does not reach the prose that names
it. When you tick an item, grep for its name. This file is full of prose orderings and measured
figures, and it says so about itself elsewhere — this is the instance that was actually paid for.

**A new layer that reuses an existing accessor inherits its tradition-dependence, whether or not a
source licenses that.** The elemental yoga read `weekdayNameFor(weekday, tradition)` for its weekday
element, which applies `naming.weekdayOffset` — so Bhutan silently got a different yoga on 12 of 14
consecutive days, from a naming fact Janson states separately and never connects to the yoga. Two
shipped claims said it could not happen, including `weekdayOffset`'s own "applies to the name only".
External validation is Phugpa-only, so nothing could catch it. When a new module reaches into the
naming or config layer, ask which tradition-dependence comes with the call, and whether any source
establishes it; the default is the table the paper actually prints.

**And restore the mutant from a copy, never with `git checkout` — which silently cannot restore a file
that is not yet tracked.** Proved on 2026-09-12: two mutations of a brand-new `src/astrology/` module
were "reverted" by `git checkout <path>`, which failed with `pathspec did not match any file` while
the loop carried on, so the next mutant ran on top of the previous one. The tell was a run reporting
*more* failures than the mutation could explain — not an error, and not a pass. `cp` the file aside
first, restore from that, and re-run the control after every restore.

**Take the original from a pristine copy made before the harness exists, and refuse to start if the
live file differs from it.** A harness that writes mutants in place restores in a `finally` that an
interrupted run never reaches. On 2026-09-18 the Claude pane in VS Code hung and was closed mid-run,
which kills the session's background shells, and `verify-month-and-yoga-names.mjs` was left carrying
a mutant. A harness that copied the live file as its "original" on the next start would have made that
mutant permanent. After any interruption, compare the files a harness edits against the saved copies
before doing anything else. Run long harnesses in the foreground, in batches under the tool's
10-minute limit.

**Never mutate a fixture generator in place: it writes into the repository.** Each one computes its
output path from its own location, so the control run — and any mutant a guard fails to catch —
overwrites the committed fixture with the mutant's data, which is the failure the harness exists to
detect, committed. Copy the generator into a scratch tree with its own `test/fixtures/` and run it
from there. **Mutate its input, not its code**: a preload passed with `node --import` (a `file://`
URL on Windows) replaces `globalThis.fetch` and serves saved pages, one edit per mutant, so the
generator under test is the shipped file unchanged. **Record those pages during the byte-identical
baseline run**, with a second preload that saves every response — then the control is served exactly
what the baseline read, every run is offline and repeatable, and a diff cannot be blamed on a source
that moved. `scripts/fetch-fpmt-observances.mjs` was proved this way on 2026-09-19, 15 mutants and a
control that reproduced the committed fixture before and after.

**`\b` does not bound a Sanskrit word in IAST, because JavaScript's `\b` treats a diacritic letter as
a non-word character.** `/\bmāsa\b/` matches inside *ṣaṇmāsa*: `\b` sees a boundary after *ṇ*. Use
`(?<!\p{L})…(?!\p{L})` with the `u` flag. Prove the predicate with a case that actually separates the
two: the first one written here, *samāsa*, has a plain *a* before *māsa*, so both regexes rejected it
and the mutant passed.

**Mutate a guard's input, not the predicate it calls, or a self-test answers instead of the guard.**
On 2026-09-14 a mutant for the yoga verifier's "group counts sum to ten" check edited the count table
`statedGrouping` reads. The script's own predicate proof rejected it first — exit 2, "the checker itself
is broken" — so the run-level guard was never reached, and a harness asserting only "non-zero exit"
would have counted it proved. Asserting on the expected message is what exposed it. The re-run
altered the dictionary text the predicate is handed (`tha chad gcig` → `gnyis`) and the guard refused
as intended. A generator that proves its predicates up front needs its mutants aimed downstream of
that proof.

**And run the generator unchanged *before* you edit it.** A baseline that reproduces the committed
fixture byte-for-byte is what makes any later diff attributable to your change rather than to a
source that has moved since the last run — these generators read five live sources, and none of them
is pinned. Without it a single altered cell is unattributable, and the temptation is to assume it was
yours. It costs one full pass, about four minutes for `verify:rabjung-names`. Remember that the
comparison only means anything **after** `npx biome check --write` on the emitted fixture: the raw run
differs from the committed file by roughly +60/−3148 lines purely through reflow, which looks like a
catastrophe and is not. Same principle as proving a guard by mutation, one step earlier — establish
that the instrument reads zero before you measure with it.

**That applies to a throwaway check just as much as to a generator, which is easy to forget because
a one-off script feels too small to need proving.** An ad-hoc comparison of every shape block in
`docs/architecture.md` against `src/` reported three drifted types on 2026-08-27 —
`TraditionConfig`, `ObservanceRule`, `ObservanceConfig` — and all three were **false**: the field
extractor did not skip `readonly`, so it read those interfaces as having no fields at all. The two
*real* drifts it found were real, which is what makes this the dangerous shape of error — a
believable result mixed with noise. The tell was `src=0`, an impossible reading nobody had thought
to assert on. Give a one-off check a case whose answer you already know before you trust the cases
whose answers you do not.

**The script now proves its own predicates on every run**, before any rule, reporting "the checker
itself is broken" rather than a violation. That is not decoration: the `test/computation/` naming
rule was first written to split a suite name on its first `-`, which rejects
`mean-astronomy.test.ts` — a file that was already correct — and only reading caught it. Two kinds
of check, catching **disjoint** failures, so write both. An **invariant derived from the tree**
catches what nobody thought of: "every module's own name is an acceptable suite name" fails the
segment-splitting predicate immediately and mentions no filename. A **literal case** catches what
the invariant cannot see: an equality-only predicate satisfies that invariant and still rejects
`calendar-leap-index-threshold`. When this was demonstrated by mutation, the invariant caught the
real bug and all three literal cases passed.

**A throw inside the checker must not cost the report, and a rule must not be able to vanish.**
Until 2026-09-12 one unreadable file — a deletion staged on one side only — crashed the run on
`ENOENT` and discarded every finding already collected. Each rule is now a function in `RULES`, run
under its own guard; each shared corpus is built under its own; a backstop prints what was collected
before rethrowing anything else; and `tracked()` reports a path the index holds but the disk does not
instead of handing it to a rule. The registry is the new silent failure — an unregistered rule
collects nothing and the run reads "All conventions hold" — so the self-test refuses a registry
missing any rule number or pairing one with another rule's function. Every one of those is a row in
`npm run test:conventions`, which is what keeps them proved rather than recorded once in a commit.

**A guard must not share its predicate with the thing it guards.** Rule 12 matches the markdown
template a generator writes, and the invariant proving that rule is not passing vacuously used a
second copy of the same path pattern. Moving the documents into `docs/names/` would have stopped
both matching at the same moment — the rule checking nothing, and the invariant written to catch
exactly that reporting nothing wrong. The guard is now a deliberately cruder, independent signal, so
a break in the precise pattern still surfaces. Found by making the move, not by reading.

Not every predicate can have an invariant, and a vacuous one is worse than none because it reads as
coverage. The validation-suite rule deliberately has no invariant: the obvious one is symmetric in
its arguments, so it holds under the correct comparison and a reversed one alike, and reversal is
the only interesting way that rule breaks.

`lint:md` runs markdownlint against `.markdownlint.jsonc`. It does **not** check semantic line
breaks; markdownlint has no such rule, and `MD013` is off because it fights the convention.

The last two are the only checks that see the **published** package. Every test imports from
`src/`, so a broken `exports` map, a file missing from `files`, or a `dist/` layout that does not
match `exports` is invisible to the suite and fails only for a consumer, after publishing.
`check:publish` runs publint and attw against the manifest; `test:pack` packs the tarball, installs
it into a scratch directory **outside** the repository — a `node_modules` copy inside the working
tree would be picked up by Biome, the link checker and Vitest — and imports all three subpaths,
asserting real values through each so a compilation that damaged the arithmetic is caught rather than
just a module that loaded.

`attw` runs under `--profile esm-only`. Its `node10` and `node16-cjs` rows are the deliberate
design, not defects: there is no `main` field and no CJS build. Do not add `main` to make a row
green.

**Six commands are deliberately outside CI, and all are release-time checks.** `npm run coverage`
(below), `npm run bench` (below), `npm run verify:names`, which re-derives the whole Tibetan name vocabulary from Janson and
re-checks it against Wiktionary, THL and CLDR, and `npm run verify:rabjung-names`, which does the
same for the sixty rabjung year names against Janson, the Indic saṃvatsara list, Sewell & Fleet,
**Monier-Williams via the Cologne scan** (the Sanskrit senses, uncapped and citing a printed page),
**wisdomlib** (the Bṛhat Saṃhitā's cycle position, and which non-MW lexicons carry a headword) and
Wiktionary — which is now only a second attestation, never the sense source, because its Sanskrit
senses **are** Monier-Williams verbatim and corroborating it with anything MW-derived would be MW
agreeing with itself — and `npm run verify:month-and-yoga-names`, which verifies the mansion month names,
the season names, the ten elemental yogas and the twelve Indian month names against the Mahāvyutpatti, Das, Jäschke, the two
Tibetan–Tibetan dictionaries and Monier-Williams, built from
[docs/names/month-and-yoga-sourcing.md](docs/names/month-and-yoga-sourcing.md) — and
`npm run verify:mansion-and-trigram-names`, which does the same for the 27 lunar-mansion names and the
eight trigram names, built from
[docs/names/mansion-and-trigram-sourcing.md](docs/names/mansion-and-trigram-sourcing.md). The four verifiers need the
network and two converters installed outside the repo, so none can gate a push — what gates a push is
their committed output, `test/fixtures/names.ts`, `test/fixtures/rabjung-names.ts`,
`test/fixtures/month-names.ts`, `test/fixtures/yoga-names.ts`, `test/fixtures/mansion-names.ts` and
`test/fixtures/trigram-names.ts`, which the suite reads. **Run Biome on the last four after every run**, for the same reason as below.

**`verify:rabjung-names` emits one row per line and Biome reflows it, so run
`npx biome check --write test/fixtures/rabjung-names.ts` after every run.** This has always been
required and was never written down, and it surfaces as an unattributed formatting diff — `biome
check .` reports it without naming the file, and the obvious suspects are the files you just edited
rather than the one the generator rewrote. Provenance is checked before a release;
integrity is checked on every push.

**`verify:rabjung-names` also gates the authored English on Tibetan-dictionary facts, and the
licence line there is narrow.** The copyrighted dictionaries — Ives Waldo, Rangjung Yeshe and the *tshig
mdzod chen mo* here, and the *dung dkar tshig mdzod chen mo* in `verify:month-and-yoga-names` and `verify:mansion-and-trigram-names` — may **gate** and may never be **quoted** — they are modern copyrighted works, so exactly four
facts are taken: that a headword exists, the cycle position an entry states, the element–animal
year an entry states, and the register tag on a sense — and a fifth, the spelling of each member of a
set an entry enumerates, approved on 2026-09-13 for the elemental-yoga check and now in the script's
table. A sixth and seventh were approved on 2026-09-14: **the element pair an enumeration assigns each
member, and the grouping it states** — the *tshig mdzod chen mo*'s `'phrod sbyor` closes "three good,
three restorative, three bad, one worst". **The grouping gives sizes, never members**, so which yoga is
in which group is not a taken fact but an inference from list order, and it is marked as one in the
fixture, the `auspiciousness` docblock and the guide. This sentence said "three" while the script said
four. **No gloss text is stored, printed or emitted**, and the year is computed from
the cycle and never read off a dictionary, which is what stops the check being circular. The reading
logic lives in `scripts/tibetan-dictionary.mjs`, shared with `scripts/survey-ngonjo.mjs` and both
newer verifiers — including, since 2026-09-15, `fetchAggregate`, which refuses the 469-byte error page
the aggregate's host serves with a 200 rather than reading it as a dictionary with no headwords — and carries
the traps that logic exists to avoid — chief among them that **a register tag has two scopes** and
that **the prefix before an entry's first numbered sense is a sense**, not merely where a tag lives.
The second was live through the whole ngönjö survey and cost nothing there, because the *tshig mdzod
chen mo*'s prefix is a bare tag; Ives Waldo puts the entire gloss there, so the same code discarded
the text being checked. A rule that is harmless on the source it was written against is the failure
mode to expect here.

**Both verifiers carry corrections to their sources as data, and a correction must self-invalidate.**
It states the value it expects to find and refuses to run if the source no longer says it, so a
correction that stops being needed fails loudly instead of silently patching a source that has since
been fixed. There is one in the vocabulary — `spen ma` → `spen pa` — and nine in the rabjung names,
resting on three different kinds of evidence: Sewell & Fleet read directly (60 अक्षय → क्षय, 31
हेविळम्बि → हेमलम्ब), attestation (15, 37), Monier-Williams resolving a headword the table's spelling
does not reach (4 प्रमोदूत → प्रमोद), a homograph caught by reading the *sense* rather than the
presence of an entry (9 युव, the dual pronoun, → युवन्; 56 दुन्दुभी, a Gandharvī's name, → दुन्दुभि), and a
typo the source contradicts itself about (57 रूधिर → रुधिर), and an entry that is a bare stub where a
near neighbour is glossed (58 रक्ताक्षि → रक्ताक्ष). Do not patch a name by editing the output.

**A correction that rests on a dictionary *lacking* a sense is the least reliable kind, so write it as
self-invalidating data before anyone decides it.** On 2026-09-15 mansion 21 was decided as *śravaṇa*
because Monier-Williams, read by hand, gave *śravaṇā* only as "a female monk or nun" — the rabjung 9
and 56 trap. The correction's own check refused on its first run: a separate entry on p. 1097 gives
*śravaṇā* as the nakṣatra, and the hand reading had seen two of five entries. The decision was taken
back. An absence is established only by a reader that sees every entry, and the verifier's
"a headword **whose entry names the sense**" check, not the headword's presence, is what caught it.

**That reader is `entriesHeadedBy` in `scripts/cologne.mjs`, shared since 2026-09-18, and it is the
only one that sees every entry.** Every Monier-Williams check in the mansion and month-and-yoga
verifiers now goes through it; `verify-rabjung-names.mjs` keeps its own. The six-season and yoga checks were the last to move, on 2026-09-18, off an older
reader that took the **first** entry Cologne returned, and the move found two wrong citations that
had shipped in fixtures. The yoga *siddhi* was cited at p. 1215, which is *1. siddhi* "driving off",
a homograph, while its own English was cited from p. 1216. The rains were routed through *varṣa*
under the stated belief that no entry is headed *varṣā*, and p. 927 heads it with "the rains,
rainy season". Nothing had flagged either one. **Choose a page by the sense it prints, never by
position**: the first entry headed *varṣā* is a bare "See p. 927".

The shared reader's head-splitting has been wrong twice, and each time on a head shape nobody had
listed. The first time, it did not end a headword at a gender mark carrying its feminine
(`māgha mf( ī )n.`), so the head ran on into the definition. Here that
failed closed — four month names read as absent — but the same bug can make a word printed in a
definition ("relating to the constellation Maghā") count as a headword, which passes silently. The
second time, it missed a form headed **inside another record**, after a sense boundary:
`prati —kūlam ind. … [ ID=131428 ] prati —kūla n. inverted order, opposition`. The old whole-text
search had found "opposition" there only by accident. Give every new head shape a self-proof case.

**A correction is not a lookup rung, and conflating them inflates both.** A correction changes what
the table *prints* and needs authored evidence; a rung of the ladder in `scripts/indic.ts` changes
only what is *queried* and states a rule of Sanskrit — the `-in` stems printed in the nominative, the
anusvāra spellings, a missing virāma. Eleven of the sixty rows resolve only through a rung, and an
earlier draft was going to write all of them up as editorial judgements.

**There are now six ways a value reaches that table, and they are deliberately separate because they
carry different weights of evidence.** Collapsing any two inflates the weaker one:

| Mechanism | Changes | Standard it must meet |
|---|---|---|
| Correction | what is **printed** | Authored evidence, and the original must still be present |
| Lookup rung | what is **queried** | A rule of Sanskrit orthography or morphology, true of every row it touches |
| Preferred alternative | which reading of a compound **cell** is looked up | The Tibetan decides; the cell still prints both |
| Sense cross-reference | which **entry** is read | Monier-Williams' own pointer — "= -कर" — re-checked before it is followed |
| Abbreviation expansion | an entry's **text** | His ˚ convention, with the element resolved and its gloss verbatim |
| Composed meaning | a value **he never prints** | Both halves glossed by him, cited, and the Tibetan disambiguating the compound |

Only the first two change what a reader sees as sourced-verbatim. The last two produce a **weaker
tier**, marked ‡ in the table and held in its own field, because `selected`'s whole guarantee is that
it is a verbatim span of one printed sense. A composed gloss is offered rather than a blank because
returning nothing says "this name has no meaning", which for an ordinary transparent compound is
false — but it is never allowed to look like a quotation.

**`npm run bench` lives in `bench/` at the repo root, not under `test/`, and that is not a
preference.** A directory under `test/` earns its place by **mirroring one under `src/`** — plus
`test/validation/` and the two infrastructure directories, `fixtures` and `support` — and
`check:conventions` scans **every** `.ts` beneath it. So `test/bench/` is rejected because there is
no `src/bench/`, which is the reason rather than an omission from a list: the rule's own message says
a suite is either about a module or about an external source, and a benchmark is neither. A benchmark
is not a test.

**That set was four hardcoded names until 2026-09-12, and this passage stated the count as a fact.**
Of the four, two held no suites and one was the external-source home, so exactly one — `computation` —
was a module-suite mirror. The list went stale the moment `src/` grew a second subsystem, leaving
`src/observances/` with nowhere to put a module suite and an exemption in the checker to hide it.
Deriving the set from `src/` fixed that; **the count in this file was left behind**, which is this
file's own warning about prose counts biting the file that gives it.
`package.json#files` already excludes `bench/`, and `tsconfig.json` and `biome.json` include it
deliberately so it is not an unchecked corner.

It exists because two numbers were load-bearing and unmeasured, and it corrected one on its first
run: the `getObservances` span cap — which justifies a shipped `TCT_SPAN_TOO_WIDE` — costs about
**270 ms**, not the 190 ms its docblock claimed. **A performance number may be quoted only with its
harness**, recorded in `bench/RESULTS.md`: machine, OS, Node version, date. The project refuses
unsourced numbers from its calendar sources and the same rule applies to its own. Deliberately no
regression threshold and not in CI — shared runners would fire on the runner rather than on the
change, and a guard that fires wrongly is worse than none.

**The README is a landing page, and `docs/guide.md` is where new consumer prose goes.** Its first 40
rendered lines carry the pitch, the install line and one runnable example, and nothing else precedes
them; the guide takes the long form in three sections. Related and load-bearing: **a validation
window is stated in `docs/testing.md`, quoted only by `docs/why-trust-these-dates.md`, and linked to
by everything else** — five copies of a number is a number that will drift. Deliberately unguarded
by `check:conventions`, because every available predicate fires on `docs/validation-sources.md`
itself; `test/why-trust-these-dates.test.ts` guards the two documents allowed to state one, against
the fixtures, and nothing guards the rest. Both in
[docs/decisions/2026-08-23-readme-is-the-landing-page.md](docs/decisions/2026-08-23-readme-is-the-landing-page.md).
`package.json#files` ships `docs/guide.md`, `docs/why-trust-these-dates.md` and — since 2026-08-24 —
`docs/how-it-is-calculated.md`, so **their examples are contract exactly as the README's are**.

**One suite per shipped document, and each now has one.** This passage read "`test/guide.test.ts`
asserts every one that states a value" until 2026-09-17, which was true of `docs/guide.md` and of
nothing else: that suite reads only its own document, by deliberate design — "a suite named for one
document while guarding another names the wrong file when it fails". So `docs/how-it-is-calculated.md`
went unasserted from the day it shipped, and it cost a figure — it said a doubled or skipped day
occurs in "roughly a quarter of all months" where the true rate is **94% skipped, 64% doubled**, a
claim that also contradicted the arithmetic the same document teaches. It now has
`test/how-it-is-calculated.test.ts`. `docs/why-trust-these-dates.md` had none until 2026-09-18,
the worst of the three to leave, since its whole content is windows and agreement percentages; building
`test/why-trust-these-dates.test.ts` found **four false statements** on the page.
When a document joins `files`, it needs its own suite in the same commit.

**A suite guarding a document reads it; it never restates it.** A hand copy of a table or a figure
passes while the document drifts, which is the failure the suite exists to prevent — so parse the
table out of the markdown and regex the figure out of the prose, as `test/guide.test.ts` does. A
first draft of the how-it-is-calculated suite restated twelve rows and two percentages, and a code
review caught it; two of its assertions were comparing the copy against itself.

**And it measures with the validation suites' own predicates, from `test/support/`.** "Agrees",
"differs" and "the trusted window" each have one definition, and the why-trust suite calls it: a
second definition — the day number alone, say — is a weaker claim under the same word, and cannot see
a doubled-flag mismatch behind "agrees on every day". Moving a comparison into `test/support/` is a
refactor to prove by mutation in **both** suites that call it.

**A guard comparing two documents is no guard if they share an error.** Anchor every figure to data,
and treat document-against-document agreement as a secondary check. `docs/testing.md` carried the
same window errors as the page it was meant to check — Lotsawa House's window given as 2023–2027 where
the fixture runs 21 February 2023 to 25 February 2028 — so equality between them would have passed.
This is the lineage rule applied to the project's own documents.

**Inventory a document line by line, not figure by figure.** On why-trust-these-dates the claims that
were false were as often **quantifiers** as numbers — "the three other implementations side with the
engine on each of these days" (none has data for the first), four sources that "overlap across the
same period" (all four share only two years), "the first sixty-year cycle" (Janson's is 65) — and a
hunt for figures walked past every one of them. The suite now fails on any digit or number word not
inside a claim, asserted or listed with its reason, which closes for that document the gap the
docblock suite still has.

**A percentage names its day set, and two figures may not share "of those days" unless they are
measured over the same days.** The mansion's 97.6% is over the 1,459 days whose code can force a
mansion element; favorability's 99.7% is over its own 1,460, because 2024-09-12's `UD-EW` names no
yoga but is still a favorability claim. The page said "99.7% of those days" beside the 1,459, where
the figure over those days is 99.8%, and the mansion computation was quietly counting that day as an
agreement.

**Prose windows are as exact as the table beside them; only durations are rounded.** "2022–2027" and
"early 2030" could not be checked by the reader the page is written for, and both hid an error:
2022–2027 was a union no single source reaches, and the early-2030 table count included 273 days no
test compares. "1 January 2022 to 25 February 2028" is as safe, being true, and checkable.

**An independent review of a plan finds what its author's passes do not.** The why-trust plan had
two self-reviews and a simulated expert panel behind it; a fresh agent given only the plan and the
repository then found six errors, one of which (the mansion's day set) no earlier pass had any way
to see. For a plan whose output is a claim to readers, run one before building.

**A year in this repository is a Tibetan year unless it says otherwise, and a prose window must say
which era it is.** `monthsFor(1900)` is Tibetan 1900, which runs from **1773-02-22 to 1974-02-21 CE**.
A sweep written as "1900–2100" and described in a shipped document as "the two centuries 1900–2100"
therefore measured one window and claimed another, on 2026-09-17. **No measurement can catch this**:
both windows round to the same 94% and 64%, so the mutant that swapped them passed. What catches it
is stating the window **twice, in both eras**, and having the test check the correspondence — that
Tibetan 2027 begins in 1900 CE and 2227 ends in 2101. Do that for any measured figure in a document.

The third document joined them to answer a
question the shipped types raise and cannot answer: a `Rabjung` carries a Tibetan year name and **no**
Sanskrit one, and a consumer who expected *Prabhava* beside it needs to be told that the cycle has
**two** Sanskrit name lists which disagree at five positions, so pairing either with the Tibetan name
would misname 8% of years. That reason replaced an earlier one on 2026-08-25, when the Sanskrit came
off the type — the document is shipped for what it explains, not for a field that no longer exists. A shipped document's relative links must resolve inside
the tarball, which `check-pack` enforces, so anything repo-only is linked by absolute URL — that is
why that file's four internal links are absolute and the others' are not.

**`npm run coverage` is not one of the ten, so nothing gates it.** It was broken on `main` for an
unknown stretch and nobody noticed: the 200-year moon-phase sweep runs in well under a second bare
but takes 5–8 seconds under v8 instrumentation, against Vitest's 5s default, so `test` passed while
`coverage` failed. The long sweeps now carry explicit timeouts. Run it before a release, and give
any new multi-century test an explicit timeout rather than discovering this again.

Run it for what it *reports*, not only to keep it passing. An unreachable-line report is how the
2026-08-13 review pass found that a new config check sat after the `scaleTo` call that already
guarded the same condition — the test passed, because both throws carry the same code, and only
coverage showed the check could never run. It paid again on 2026-09-12, on code written the same
hour: an **uncovered branch** in `./astrology`'s options guard was the `undefined` arm of its error
message, unreachable because every caller defaults the parameter to `{}`. `./observances`' copy of
that guard still carries the arm, which is how it got there.

`check:links` validates relative markdown links and `#fragments` against the filesystem. Docs
here cross-reference heavily, so renaming or deleting one breaks inbound links silently; fix them
in the same commit.

**Its anchors and GitHub's disagree for a heading holding an em dash, so do not put one in a heading
you link to.** `slugify` collapses each run of whitespace to a single `-`, while GitHub emits one
`-` per space — so `### FPMT's moon icons — lineage unknown` anchors as `…-icons-lineage-unknown`
here and `…-icons--lineage-unknown` there, and whichever you write, one of the two is wrong. The
collapse is deliberate, for the emoji case its comment documents, so it is the **heading** that has
to change: a colon reads the same and slugs identically under both. Found 2026-09-19, when
`check:links` rejected a link that GitHub would have accepted; the reverse — a link this checker
accepts and GitHub 404s — is the silent direction.

## Conventions

**No exported identifier names an institution.** An export name states what a thing *is* — its
shape, its role in the API — never who published the convention it encodes. `GELUG`, the observance
config's export name until it was renamed to `DEFAULT_OBSERVANCES` on 2026-09-05 (decided
2026-09-03), violated this: it was FPMT's specific published convention (`doubledDay: "second"`,
`leapMonth: "leap"`, plus its particular rule set), not "the Gelug way" — Kopan Monastery, also
Gelug, prints the *opposite* `doubledDay` for the 2024 Chokhor Duchen. Naming the export after an
institution therefore didn't just look institution-specific, it overclaimed a universality the
data itself contradicted. See
[docs/decisions/2026-09-03-no-institution-names-in-exports.md](docs/decisions/2026-09-03-no-institution-names-in-exports.md).
Provenance belongs in a `source` field and the docblock, which can carry a URL and a citation;
an identifier cannot, and readers take a name at face value in a way they do not take prose.

**The rule governs exported identifiers, not data fields, and the two deliberately disagree.**
Settled 2026-09-04: `config.id` stays `"gelug"` and `config.name` stays `"Gelug (FPMT)"` even as the
export becomes `DEFAULT_OBSERVANCES`. Those fields are values inside a config object, read as data,
and they are the only machine-readable statement of whose convention it is — deleting that buys
nothing and loses the provenance the rule says to keep. The asymmetry is also load-bearing in one
direction only: an **export name** may name a role, because it can be repointed at whatever plays
that role, but `id` is documented as a *stable identifier*, so `id: "default"` would have to migrate
to another object — breaking that stability — or sit on an object that is no longer the default the
moment a second config ships. `test/public-api.test.ts` asserts the id explicitly so a later
"consistency fix" fails loudly rather than quietly.
Decided 2026-09-03, after Andreas asked that nothing in the package be named after an institution
(FPMT was the example) while scoping the astrological-attributes work; `GELUG` was the first
casualty. This is distinct from
`PHUGPA`/`TSURPHU`/`BHUTAN`-style names on a `TraditionConfig`, which name an objective, falsifiable
calendrical system Janson describes — not one institution's convention among several that legitimately
disagree — see the "Kind of claim" distinction between `TraditionConfig` and `ObservanceConfig`
already drawn elsewhere in this file.

**A shipped name is keyed by language, and the key comes first.** An object carrying a name holds
`englishName` (a translation of the name itself), `tibetanName: TibetanName` and, where sourced,
`sanskritName: SanskritName` — never a bare `name`, a language code, or `meaning` — and the English key
precedes the name objects it identifies, because an English word printed after two name blocks reads
as describing the second. Both rules are surface-wide and one-way doors at 1.0.0:
[docs/decisions/2026-09-13-names-keyed-by-language.md](docs/decisions/2026-09-13-names-keyed-by-language.md).
The surface does not yet hold to them everywhere — `ObservanceKind` uses ASCII Tibetan as keys and
`ObservanceRule.name` is a bare string — which the pre-1.0.0 checklist in [docs/roadmap.md](docs/roadmap.md)
tracks; `./astrology` has held to them since 2026-09-15. **Three shapes are in use, and the record's
2026-09-15 amendment says which applies where**: sibling `*Name` fields for an object that is a name
(`TibetanYearName`), a nested `{ englishName, tibetanName }` for a value inside an object with its own
name (`yoga.auspiciousness`), and a trailing `tibetanNames` block for a block of labels (the four
attribute results). The third has nothing structural tying a label to its name, so
`test/astrology/index.test.ts` derives each block's labels from its own string fields — **add a label
to one of those blocks and the test fails until its Tibetan name is added too**. **A shipped English name must be printed word for word by a
public-domain dictionary, or be marked as authored**; `ELEMENTAL_YOGAS` meets that through
`verify:month-and-yoga-names`, two of Henning's words having been replaced where no dictionary prints
them.

Technical identifiers are lowercase (`nyamlen`, `@nyamlen`); the brand is capitalised
(`Nyamlen`). npm rejects uppercase package names, so this is a constraint, not a preference.

Markdown uses semantic line breaks — one sentence or clause per line, so diffs stay limited to
the sentence that changed. `.markdownlint.jsonc` disables the rules that fight this (`MD013`
above all). Do not re-wrap prose to satisfy a linter, and do not remove those exclusions.

**Two guards have been investigated and rejected, both with measurements, so neither is proposed
again.** A **semantic-line-break check** is easy to write — a sentence terminator followed by a
capital, mid-line — and fires **2,221 times across 41 files**, with this file third on the list at
182. The convention is real but observed unevenly, no document is clean enough to ratchet from, and
adopting it would mean reflowing every document in one unreviewable diff. A **path-liveness check
over `CLAUDE.md`**, extending the one Rule 6 already runs over
[docs/coding-standards.md](docs/coding-standards.md), fires exactly twice — on `test/bench/` and
`src/bench/`, both named here precisely to say they must *not* exist — and would have caught **none**
of the six drift findings a review turned up on 2026-09-12, because those were a stated count and a
rule description rather than dead paths. Both measured 2026-09-12. This is the same
"deliberately unguarded, and here is why" note the validation-window rule already carries.

**Test files must not export, and a shared helper goes in `test/support/`.** Biome enforces the
first; the second is what it forces. This is not cosmetic — `names.test.ts` briefly imported a guard
from `unicode-tibetan.test.ts`, which made vitest **re-run that file's 28 tests** as part of the
importer. The suite reported 669 tests where 641 existed. A count that quietly inflates is worse
than a lint error.

**In a sweep over thousands of fixture rows, collect violations and assert once.** Do not call
`expect` per row with a message built from a `Temporal` date: eleven thousand rows times six
assertions killed a vitest worker outright, reported only as `Worker exited unexpectedly`. Push
failures onto an array and `expect(bad).toEqual([])` — one assertion, and the message names every
offending date instead of only the first.

`biome.json` carries one formatter override, raising `lineWidth` for
`test/fixtures/fpmt-observances.ts`. Its rows run to 238 characters because they carry observance
labels, advice codes and moon icons, and at the default width Biome explodes each into eight lines — turning a reviewable
one-row-per-line fixture into a 12k-line one. `scripts/fixture-row.mjs` documents the same problem
for the cross-check fixtures, which avoid it by staying short. Do not remove the override.
It is 250 since 2026-09-19, when the codes and icons were added. **Measure with Biome, not with a
character count**: it counts the leading tab as `indentWidth`, so the longest row is 238 characters
and 239 by its measure, and an override set to the character count has no headroom at all — the
first extra code on that day explodes the row, surfacing as an unattributed formatting diff. Raise
it when a field is added, and never remove it.

Decision records document a **constraint a contributor would otherwise violate**, not a replay of
how a choice was weighed. Records that only narrate deliberation get deleted — planning artifacts
stay out of the repo, as `CONTRIBUTING.md` already states.

Their format is fixed: filename `YYYY-MM-DD-slug.md`, YAML front matter carrying only `date` and
`status` (`accepted` / `superseded` / `deprecated`), a single H1 title, then a bold `**Decision:**`
line stating the outcome before any reasoning. Do not put `title` in the front matter — it
duplicates the H1 and makes markdownlint read the file as having two titles.
