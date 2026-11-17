---
date: 2026-11-15
status: accepted
---

# Docblocks are written for callers

**Decision:** A `/** */` docblock says what a caller needs and nothing else.
Rationale for maintainers goes in `//` comments at the code, and history goes in commit messages and decision records.

## Why the line falls there

`tsc` copies every `/** */` docblock into the shipped `.d.ts`, where an editor shows it on hover, and drops every `//` comment.
Checked on 2026-11-15: `dist/months.d.ts` carries `boundedMonth`'s docblock, while the `//` comment "Validated first, so a bad tradition…" in `src/astrology/index.ts` is absent from `dist/astrology/index.d.ts`.
So the comment syntax already decides who reads a sentence, and the rule only makes the choice deliberate.

It is the [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)'s rule, under *JSDoc versus comments*: "Use `/** JSDoc */` comments for documentation, i.e. comments a user of the code should read", and "Use `// line comments` for implementation comments, i.e. comments that only concern the implementation of the code itself."
[Google's code-review guide](https://google.github.io/eng-practices/review/reviewer/looking-for.html) draws the same line: documentation of a function should "express the purpose of a piece of code, how it should be used, and how it behaves when used", and a comment holds "the reasoning behind a decision".

This is the industry convention, and nothing in `CLAUDE.md` or `docs/coding-standards.md` ever said otherwise: both treat a docblock as contract, which is the same view from the other side.
What departed from it was **practice**.
Docblocks drifted into carrying the project's reasoning and its dates into a consumer's editor, because a docblock was the nearest place to write something down.
`monthNamesFor`'s `@throws` said "since 2026-09-24, when the tradition became positional", and `boundedMonth`'s remarks recorded that its callers "used to borrow `daysInMonth`'s" guard.

**Provenance a caller relies on stays in the docblock.**
`CLAUDE.md` and the no-institution-names record put provenance "in the docblock and the docs", and that is consistent with this rule: whose conventions `EXAMPLE_OBSERVANCES` follows, or which source a name comes from, changes whether a caller can use the value for their purpose.
The story of how the source was found does not, and moves out.

## The rule

1. **A docblock holds behaviour, bounds, defaults, what throws and with which code, and examples.**
   A *why* stays only when it changes how a caller would call the function — `nextFullMoon` refusing loose `{ year, month, day }` fields because that shape names two calendars is one.
2. **The summary is a verb phrase in the third person** ("Returns the…"), followed by TSDoc's blocks: `@remarks`, `@param`, `@returns`, `@throws`, `@example`.
3. **No restating a parameter's name and type**, which the signature already says.
4. **Maintainer rationale moves to a `//` comment beside the code it explains.**
   It is moved, never deleted: the proofs, bounds and traps the docblocks carry are the project's memory, and losing them is the failure this rule must not cause.
5. **History moves out:** dates, "used to", "until", and who found what belong in the commit message or a decision record.
   History a consumer needs — a behaviour change — goes in a changelog from 1.0.0, which does not exist yet.
   No published guide fetched states this point outright; it follows from version control holding history.
6. **Barrel exports come first.**
   An internal function's docblock reaches `dist/` too, but no entry point exports it, so a consumer cannot import it or hover it through the package.

## What enforces it

Review, the docblock audit in `docs/roadmap.md` that applied the rule to every docblock in `src/` in one pass, and three `check:conventions` guards.
Each was written failing-case first, in the `npm run test:conventions` mutation suite.
Of the three, only Rule 17's message states where its reach ends, as a ratchet; the reach of Rules 4 and 18 is stated in this record, below.

**History in prose: Rule 17, a ratchet and not enforcement of rule 5.**
It refuses `20\d\d-\d\d-\d\d` in a docblock's prose, outside backtick code spans and outside `@example` blocks, which use dates legitimately.
A date a caller needs, such as the bound of a range, goes in a code span.
History written as "used to", "until it was bounded" or "since the tradition became positional" carries no ISO date and passes, as does a date in another century or in another format.
Review remains the check for those.
Proved by row R17, whose mutant puts a violating line beside a date in a code span, one in an `@example` and one in a `//` comment, and asserts that only the first is reported.

**What moving text to `//` costs, and the two traps of the move.**
`tsc` drops a `//` comment, so moving a docblock's rationale there also moves it out of reach of every check that reads docblocks.

- **Rule 4 reads only `{@link}`.**
  It checks that every `{@link X}` in a docblock names a symbol that exists, and in a shipped docblock one an entry point exports.
  A symbol named in backticks was never checked, in a docblock or out of one.
  So the loss is exactly the `{@link}`s in the text that moves, and a rename of their target then leaves the `//` comment stale without failing anything.
  The audit therefore converts a `{@link}` in moved text to the symbol in backticks, states the number converted in the commit, and keeps a `{@link}` to an exported type in the docblock where a caller needs it.
  Rule 4 has a second reach limit: a `//` comment followed by a second docblock leaves the first docblock's links unchecked, because the rule skips only blank lines and `//` lines, so the line it reaches is the second docblock's opener, which declares nothing, and the first docblock is read as internal.
  Extending Rule 4 to backticked names in `//` comments was considered and not taken: a backticked word in a comment is often not a symbol (a field name, a code snippet, an error code), so the rule would need an allowlist larger than the problem.
  If a stale `//` reference is ever found by hand, that is the evidence to revisit it.
- **A `//` between a public docblock and its declaration hid the docblock from Rule 4.**
  The rule decided whether a docblock ships from the first non-blank line after its closer, so a maintainer note placed there made a public docblock look internal and its links went unchecked.
  TypeScript attaches the docblock across the note, so Rule 4 now skips `//` lines as it skips blanks.
  Proved by row X13, which restores X12's bad link on a published interface member and puts a `//` between the docblock and the member.
- **A lone opener above `//` lines swallows them.**
  A line holding only the opening marker, followed by `//` lines and then a docblock's own opener, is one block to TypeScript: the `//` lines and the next docblock's text ship as the first block's.
  It happened in `src/computation/conversion.ts`.
  The comments-only build check of the audit cannot see it, because that build strips every comment before comparing; counting the openers in each `.d.ts` with comments kept did.
  Rule 18 refuses a `//` line or a second opener inside a docblock, since a docblock line carries its `*` gutter.
  Proved by row R18, a lone opener, a `//` line and a real docblock; the checker's self-test adds the clean case, a docblock whose example holds a `//` after its gutter.

Rules 17 and 18 share one reader of a docblock, `docblocksOf`, which ends a block at the first closer exactly as `publicDocblockLinks` does, so a stray opener is seen as TypeScript sees it.
