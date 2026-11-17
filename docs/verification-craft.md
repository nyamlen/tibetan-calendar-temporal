# Verification craft

How to prove that a check, a harness, a probe or a document suite measures what it claims.
Each rule here was learned from a check in this repository that passed while measuring nothing.
[CLAUDE.md](../CLAUDE.md) holds the project's rules; this page holds the method for working on `scripts/`, `test/` and the shipped documents' suites.

## Mutation and controls

**A check placed after the emit gate cannot fail the run, whatever its comment claims.**
`scripts/verify-rabjung-names.mjs` writes its fixture immediately after the `problems` gate, and the
divergence self-invalidation sat *below* that write — so its promise that "the run fails if his table
no longer says that" had never once been true until a deliberate mutation revealed it. When adding
a check to a generator, put it above the gate and then **prove it by mutation**: break the thing it
guards and watch it refuse to write.

**A mutation harness needs a control, or it proves nothing either.** Mutants that all exit non-zero
can have died on a `SyntaxError` introduced by the mutation itself, or on `ERR_MODULE_NOT_FOUND`
because the mutant was written to a scratch directory while its relative imports resolve against the
file. Both look identical to a guard firing — a non-zero exit and no output you happened to be
grepping for. **So every mutation run includes an unmutated control expected to PASS**, and asserting
on the failure *message*, not the exit code, is what makes the difference visible. The control
failing is the only signal that the harness is measuring nothing.

**The same holds for a single test's RED: read why it failed.** A test that polluted
`Object.prototype` with a non-writable key failed before the fix on `Cannot assign to read only
property 'polluted'`, thrown by Vitest's own machinery rather than the assertion, and failed after it
too. A red test is evidence only when its message is the bug's.
**So never mark an expected-red row `it.fails`.** It passes on any throw, including a `TypeError`
from a typo, so it cannot show the reason. Assert today's wrong message instead, and change the
expectation in the commit that fixes it, so the diff shows the old message against the new one.

**An inequality is the weaker assertion, and for one bug shape it is no assertion at all.** Where a
bug's signature is "two things that should differ stop differing", `expect(a).not.toBe(b)` usually
cannot fail — something *else* already distinguishes them. The doubled-day yoga is the case: the two
halves of a doubled date have different weekday elements whatever the mansion does, so
`expect(first.yoga).not.toBe(second.yoga)` held with the bug reinstated, while 19 of 31
doubled-first days changed. **Pin the value** — and specify it that way in a plan, too. The
inequality's premise was also false: the halves can share a yoga, because the mansion can move with
the weekday — 9 and 10 July 2024 are both *death*. The index test pins both pairs by value, one that
differs and one that does not.

**A comparison that agrees everywhere cannot detect being weakened, so mutate it to disagree.** The
first mutant written for `mismatchesIn` dropped its `isLeapDay` field, and no test
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
failures.** FPMT's moon icon was once read as marking the *Tibetan date*, because both
doubled dates that showed up as mismatches carried an icon on each half. There are **four** doubled
dates carrying a moon in the window, and the other two carry one icon only — invisible to any
mismatch list, because an icon on the engine's own day is not a mismatch. The rule it was taken to
support is false, and the count behind it ("2 of 2") was really 2 of 4. Before explaining a residual
by a rule, list every case the rule covers and check the agreeing ones too.

## Where a guard looks

**A guard can be well-formed, correct, and aimed where the risk is not — and it then reports
"nothing found" for ever.** A check of whether a research document had read a competing
implementation's source classified the document's **code blocks**, and reported no contamination;
the exposure was a 90-line **prose** section with no code fences at all. **Before trusting a guard's
silence, state where the thing it hunts would live and check that the guard looks there.** An
independent review is what finds this; the check's own author tends not to.

**A correction's sweep must cover `test/` too, where a name can assert the thing being corrected.**
A test named `"answers false for exactly three codes"` once sat four lines above the test that pins
the opposite. A test name is read as a statement
of the contract by anyone scanning output, and it is the one place a false claim is printed on every
green run.

**And check which module a probe is importing from before reading what it reports.** A probe that
called `observancesOn` and `attributesFor` off the **root** barrel, which exports neither, printed
`THROW TypeError (no code)` for one — read as a defect — and `OK undefined` through `?.()` for the
other — read as a pass. A row that says `THROW` and a row that says `OK` both look like measurements.

**A sweep whose calling convention is wrong reports agreement, which is indistinguishable from a
passing check.** A sweep of 27 exports called every multi-argument one as `fn(date, date)` — so `addDays`, `addMonths`, `addMonthsToDate`, `daysBetween` and `monthsBetween`
received a date where a **count** belongs. They threw for that reason, matched the control, and read
as unaffected. Called properly, all five were defective: `addDays(foreignDate, 1)` returned a
confident wrong Tibetan date, and nothing about the output looked wrong. **State what a sweep's
arguments mean before trusting what it agrees about**, and prefer a sweep that names
each call's argument shape in its output, so a wrong convention is visible rather than silent.

## Shipped instructions, trackers and findings

**A shipped instruction is contract exactly as a shipped example is, and this project's own setup is
the worst possible evidence for one.** `test/docblock-examples.test.ts` and `test/guide.test.ts`
assert every *example* that states a value; nothing asserts an *instruction* that tells a consumer
how to configure their project. The README once said **"No `"lib"` setting is needed —
TypeScript 7's default already carries it"**, and a consumer following it got
`TS2503: Cannot find namespace 'Temporal'` on the whole surface.

**`tsconfig.json` here sets `target: ES2024` *and* `lib: ["ES2024", "ESNext.Temporal"]`** — exactly
the pair where the explicit lib is **required**, so `npm run typecheck` stays green whatever the
README tells a consumer. A repository's configuration is
written by people who already know the answer, so it is systematically biased towards masking this
class of defect; `test:pack` cannot catch it either, because it imports and computes rather than
type-checking. `docs/guide.md` **prints a working `tsconfig.json`** instead of describing one. Prescribe by printing something runnable, and run it in
a clean consumer before shipping it.

**The status in a tracking document describes the tracker, not the thing tracked**, and the two get
confused in the direction that invents work. `nyamlen/spikes/VERDICTS.md` once listed eighteen
rows as `open` — meaning *nobody has written a verdict here* — and was restated as *the API has not
survived contact with a consumer*, when sixteen had been answered by commits naming the finding
numbers in their bodies. **An unrecorded fact is not an absent one**: cross-check this repository's
log before treating a tracker's status as the state of the work.

**A finding is not one claim, and the commit that answers it is not a reading of it.** Decompose a
source's report from **its own text** before reading whatever discharged it — a commit body
*describes* the finding it answers, and a description is not the finding. `friction-list.md`'s
finding 13 makes three claims and `864f88e` answers one.

**And a closure can be honest and still wrong.** It can document a **remedy that does not work** —
only running a consumer's typecheck shows it — or its **subject can move underneath it**, as when the
sojong model a closure cited was overturned and the correction missed the README paragraph it had
written. **Re-check a closed item when
its subject moves**, and do it by re-reading the finding rather than the verdict.

**An ordering written as prose goes stale silently, because nothing checks that its first step is
still open.** The pre-1.0.0 checklist's preamble once read "The rabjung name shape settles first" a
month after that item was ticked, and a reading of it proposed starting there. A `[x]` beside an
item does not reach the prose that names it, in `CLAUDE.md` or anywhere else: when you tick an item, grep for
its name.

## Mutation harness hygiene

**And restore the mutant from a copy, never with `git checkout` — which silently cannot restore a file
that is not yet tracked.** On an untracked file `git checkout <path>` fails with `pathspec did not
match any file` while the loop carries on, so the next mutant runs on top of the previous one. The tell was a run reporting
*more* failures than the mutation could explain — not an error, and not a pass. `cp` the file aside
first, restore from that, and re-run the control after every restore.

**Take the original from a pristine copy made before the harness exists, and refuse to start if the
live file differs from it.** A harness that writes mutants in place restores in a `finally` that an
interrupted run never reaches — closing the Claude pane in VS Code kills the session's background
shells, and once left `verify-month-and-yoga-names.mjs` carrying a mutant. A harness that copies the
live file as its "original" on the next start makes such a mutant permanent. After any interruption, compare the files a harness edits against the saved copies
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
that moved. `scripts/fetch-fpmt-observances.mjs` was proved this way.

**A harness a shipped document cites lives in `scripts/evidence/<name>/`, and it keeps neither the
pages it replays nor its own output.** A reader of a public repository cannot follow a path into
`~/.claude`, so a document that says "proved by mutation" needs the proof beside it. Third-party pages
are not vendored — a manifest of URL and SHA-256 plus the recorder replaces them, and the two
copyrighted dictionaries are stored as headwords only. A run's output goes to a scratch directory
outside the tree, because anything the harness regenerates is churn in review and a ready home for a
local path. `scripts/evidence/observance-names-verifier/` is the model, and its README says how to
re-record and run.

**Mutate a guard's input, not the predicate it calls, or a self-test answers instead of the guard.**
A mutant for the yoga verifier's "group counts sum to ten" check that edited the count table
`statedGrouping` reads was rejected first by the script's own predicate proof — exit 2, "the checker itself
is broken" — so the run-level guard was never reached, and a harness asserting only "non-zero exit"
would have counted it proved. Asserting on the expected message is what exposed it. The re-run
altered the dictionary text the predicate is handed (`tha chad gcig` → `gnyis`) and the guard refused
as intended. A generator that proves its predicates up front needs its mutants aimed downstream of
that proof.

## Generators and one-off checks

**And run the generator unchanged *before* you edit it.** A baseline that reproduces the committed
fixture byte-for-byte is what makes any later diff attributable to your change rather than to a
source that has moved since the last run — these generators read five live sources, and none of them
is pinned. Without it a single altered cell is unattributable, and the temptation is to assume it was
yours. It costs one full pass, about four minutes for `verify:rabjung-names`. Remember that the
comparison only means anything **after** `npx biome check --write` on the emitted fixture: the raw run
differs from the committed file by roughly +60/−3148 lines purely through reflow, which looks like a
catastrophe and is not. Establish that the instrument reads zero before you measure with it.

**A live source that has moved lands as its own commit, before the change it would contaminate.**
These generators read live pages, so a run made for one change can carry a second: wisdomlib stopped
listing a Wilson entry for *Rākṣasa*, and it showed up as one line in the rabjung fixture during a
phonetics run. Committed with the phonetics, that line is attributed to a change that did not cause it.

**That applies to a throwaway check just as much as to a generator, which is easy to forget because
a one-off script feels too small to need proving.** An ad-hoc comparison of every shape block in
`docs/architecture.md` against `src/` reported three drifted types —
`TraditionConfig`, `ObservanceRule`, `ObservanceConfig` — and all three were **false**: the field
extractor did not skip `readonly`, so it read those interfaces as having no fields at all. The two
*real* drifts it found were real, which is what makes this the dangerous shape of error — a
believable result mixed with noise. The tell was `src=0`, an impossible reading nobody had thought
to assert on. Give a one-off check a case whose answer you already know before you trust the cases
whose answers you do not.

## The conventions checker

**`check:conventions` proves its own predicates on every run**, before any rule, reporting "the
checker itself is broken" rather than a violation — a naming rule that split a suite name on its
first `-` would reject the correct `mean-astronomy.test.ts`. Two kinds of check catch **disjoint**
failures, so write both. An **invariant derived from the tree**
catches what nobody thought of: "every module's own name is an acceptable suite name" fails the
segment-splitting predicate immediately and mentions no filename. A **literal case** catches what
the invariant cannot see: an equality-only predicate satisfies that invariant and still rejects
`calendar-leap-index-threshold`.

**A throw inside the checker must not cost the report, and a rule must not be able to vanish.**
One unreadable file — a deletion staged on one side only — must not crash the run on `ENOENT` and
discard every finding already collected. Each rule is a function in `RULES`, run
under its own guard; each shared corpus is built under its own; a backstop prints what was collected
before rethrowing anything else; and `tracked()` reports a path the index holds but the disk does not
instead of handing it to a rule. The registry is itself a silent failure — an unregistered rule
collects nothing and the run reads "All conventions hold" — so the self-test refuses a registry
missing any rule number or pairing one with another rule's function. Every one of those is a row in
`npm run test:conventions`, which is what keeps them proved rather than recorded once in a commit.

**A guard must not share its predicate with the thing it guards.** Rule 12 matches the markdown
template a generator writes, and the invariant proving that rule is not passing vacuously used a
second copy of the same path pattern. Moving the documents into `docs/names/` would have stopped
both matching at the same moment — the rule checking nothing, and the invariant written to catch
exactly that reporting nothing wrong. The guard is a deliberately cruder, independent signal, so
a break in the precise pattern still surfaces.

**And the opposite failure exists, so the rule above is not "never share".** Rule 15's self-test
asserts that its exempt file still *contains* the check it exempts. Reading the **whole file**, it
was satisfied by `src/temporal-kind.ts`'s own docblock, which says `instanceof Temporal` three
times: deleting the single real check left it green, and the vitest suite too, because a native
`PlainDate` then takes the `from(String(x))` path and answers identically. So rule 15 and its
self-test share **one** predicate — the move the rule above warns against — because here the hazard
runs the other way. Rule 12's danger was two copies
drifting into agreeing wrongly; this one's was a checker reading *more* than the rule does, and
being satisfied by text the rule deliberately ignores. **Ask which direction the hazard runs**: if
the guard could pass by reading something the rule would never act on, sharing the predicate is the
fix, not the bug.

Not every predicate can have an invariant, and a vacuous one is worse than none because it reads as
coverage. The validation-suite rule deliberately has no invariant: the obvious one is symmetric in
its arguments, so it holds under the correct comparison and a reversed one alike, and reversal is
the only interesting way that rule breaks.

## Documents and the suites that guard them

**A suite guarding a document reads it; it never restates it.** A hand copy of a table or a figure
passes while the document drifts, which is the failure the suite exists to prevent — so parse the
table out of the markdown and regex the figure out of the prose, as `test/guide.test.ts` does.
An assertion against a restated copy compares the copy against itself.

**And it measures with the validation suites' own predicates, from `test/support/`.** "Agrees",
"differs" and "the trusted window" each have one definition, and the why-trust suite calls it: a
second definition — the day number alone, say — is a weaker claim under the same word, and cannot see
a doubled-flag mismatch behind "agrees on every day". Moving a comparison into `test/support/` is a
refactor to prove by mutation in **both** suites that call it.

**A guard comparing two documents is no guard if they share an error.** Anchor every figure to data,
and treat document-against-document agreement as a secondary check. `docs/testing.md` carried the
same window errors as the page it was meant to check — Lotsawa House's window given in rounded years
that the fixture's own first and last rows contradict — so equality between them would have passed.
This is the lineage rule applied to the project's own documents.

**Inventory a document line by line, not figure by figure.** On why-trust-these-dates the claims that
were false were as often **quantifiers** as numbers — "the three other implementations side with the
engine on each of these days" (none has data for the first), four sources that "overlap across the
same period" (all four share only two years), "the first sixty-year cycle" (Janson's is 65) — and a
hunt for figures walks past every one of them. The suite fails on any digit or number word not
inside a claim, asserted or listed with its reason, which closes for that document the gap the
docblock suite still has.

**A percentage names its day set, and two figures may not share "of those days" unless they are
measured over the same days.** The lunar mansion's agreement is over the days whose FPMT code can
force a mansion element; yoga favorability's is over a slightly larger set, because a few codes name
no yoga consistent with their weekday but are still favorability claims. The two sets happen to give
the same rounded favorability figure; keep naming the set regardless. The figures and both day counts
are in `docs/testing.md`.

**Prose windows are as exact as the table beside them; only durations are rounded.** A window written
as a span of whole years, or as "early" in a year, cannot be checked by the reader the page is written
for, and two such windows once hid an error: one was a union of years no single source reaches, and
the other's table count included days no test compares. A window from first date to last date is as
safe, being true, and checkable.

## Independent review

**An independent review of a plan finds what its author's passes do not** — a fresh agent given
only the plan and the repository, after two self-reviews and a simulated panel, has found errors
no earlier pass could see. For a plan whose output is a claim to readers, run one before building.

**The same holds for code, task by task.** Building the observance rebuild with a fresh reviewer
after every task found a real defect in most of them: duplicate results across month boundaries,
a guard silently dropped when a function was extracted, a stale "200 years" in a README row. The
implementer's own self-review had passed each one. Do not let a task's green suite stand in for the
review. **A last pass over the whole branch that runs hostile and edge inputs finds what every task
review passed**: five Important findings, among them a `period` whose span runs past the tradition's
exact range, which made queries on in-range days throw. Give it the plan, the specs and the branch
and nothing else, and have it reproduce each finding with a command.

## Reading a source, and a guard's reach

**Before calling a source falsified, test every reading its words allow — and read it to the end.**
The sojong teaching said sojong "at the end of the odd months" is "the 14th". Tested as Tibetan date
29 against 30, it failed and was recorded as falsified; it means the **14th day counted since the
previous sojong** — the notes' own last line says "14 or 15 days between the Sojongs" — and read that
way it reproduces 95 of FPMT's 98 intervals. A number in a rule can be a **label or a count**, and a
test of one says nothing about the other. And a source that seems to **contradict itself** — FPMT
putting sojong on the first of a doubled day while keeping düchens on the second — is first evidence
that the model of the item is wrong: sojong was never a date, so no doubled-day convention applied to it.
Never write "do not re-test" into a verdict; record which readings were tested instead.

**A justification for dropping a branch has to hold for every caller, not the one you are looking
at.** Merging the describers dropped a `constructor?.name` arm because `temporalTypeNameOf` now
names a `Temporal.PlainDate` — true for `asPlainDate`, which consults it, and false for
`asWesternDay` and `parse.ts`, which do not. So `new Date()` — the likeliest wrong argument in a
package whose first rule is *Temporal only* — rendered as "an object". The arm stays, narrowed to a
*named* class so a plain object is still "an object". Nothing in the suite could fail, because
message text is not contract.

**Before deciding a guard's reach is good enough, write down the forms the thing it hunts can take
and run each one past it.** Rule 15's first pattern was written from the shape the codebase
happened to contain and missed the destructured form — idiomatic JavaScript, and therefore the
*likeliest* accidental one. It surfaced only when the evasions were **measured against the
checker** instead of reasoned about. "Nobody would write that" is an assumption about other people.

**A year in this repository is a Tibetan year unless it says otherwise, and a prose window must say
which era it is.** `monthsFor(1900)` is Tibetan 1900, which begins in 1773 CE, and Tibetan 1900–2100 runs from **1773-02-22 to 1974-02-21 CE**.
A sweep written as "1900–2100" and described in a shipped document as "the two centuries 1900–2100"
therefore measures one window and claims another. **No measurement can catch this**:
both windows round to the same 94% and 64%, so the mutant that swapped them passed. What catches it
is stating the window **twice, in both eras**, and having the test check the correspondence — that
Tibetan 2027 begins in 1900 CE and 2227 ends in 2101. Do that for any measured figure in a document.
