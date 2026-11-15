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

Docblocks here had drifted the other way, carrying the project's reasoning and its dates into a consumer's editor.
`monthNamesFor`'s `@throws` said "since 2026-09-24, when the tradition became positional", and `boundedMonth`'s remarks recorded that its callers "used to borrow `daysInMonth`'s" guard.

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

**Moving text to `//` takes it out of Rule 4's reach**, which checks `{@link}` targets only in docblocks.
A `//` comment naming a symbol is a plain word, so a rename leaves it stale without failing anything; name symbols in `//` comments in backticks so a grep finds them.
