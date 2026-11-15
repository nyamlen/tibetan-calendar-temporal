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

Review, and the docblock audit in `docs/roadmap.md`, which applies it to every docblock in `src/` in one pass.
Nothing mechanical yet.
The candidate is a `check:conventions` rule refusing an ISO date in a docblock's prose, outside code spans and `@example` blocks, which use dates legitimately; it is to be written failing-case first.

**What moving text to `//` costs is Rule 4, and only for `{@link}` references.**
Rule 4 checks that every `{@link X}` in a docblock names a symbol that exists, and in a shipped docblock one an entry point exports.
It checks nothing else: a symbol named in backticks was never checked, in a docblock or out of one.
So the loss is exactly the `{@link}`s in the text that moves, and a rename of their target then leaves the `//` comment stale without failing anything.

The audit therefore does three things with a `{@link}` in moved text:

- **Converts it to the symbol in backticks** — `{@link scalingFor}` becomes `` `scalingFor` `` — since `{@link}` in a `//` comment renders nowhere and Rule 4 does not read it.
- **Counts the conversions and states the number in the commit**, so the loss of checking is measured rather than assumed.
  On 2026-09-23 there were 320 symbol links in `src/`; how many sit in text that moves was not measured.
- **Keeps a `{@link}` in the docblock where the caller needs it** — a link to an exported type is caller information and stays checked.

Extending Rule 4 to backticked names in `//` comments was considered and not taken: a backticked word in a comment is often not a symbol (a field name, a code snippet, an error code), so the rule would need an allowlist larger than the problem.
If a stale `//` reference is ever found by hand, that is the evidence to revisit it.
