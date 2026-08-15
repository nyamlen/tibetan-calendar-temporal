---
date: 2026-08-15
status: accepted
---

# A wrong-kind argument is not a field out of a range

**Decision:** `TCT_FIELD_OUT_OF_RANGE` means a number is wrong — not an integer, or outside its
permitted range. Everything that is the wrong *kind* of argument carries `TCT_INVALID_ARGUMENT`
instead: a `Temporal` instance where a Tibetan date belongs, a bare `{ year, month, day }` where a
Western date belongs, a non-boolean `isLeapMonth`/`isLeapDay`, `null`/`undefined`/a non-object, and
a string outside `parseTibetanDate`'s grammar. Both stay `RangeError`.

## Why one code was not enough

The code is the part a consumer branches on, and one code was answering two questions with different
answers. A month of `13` is **bad data** — surface it to whoever typed it. A `Temporal.PlainDate`
passed to `tibetanToIso` is a **bug in the calling code** — no message to a user helps, and showing
them one is worse than useless. A single code made those indistinguishable at the only place a
consumer can act.

The name had also stopped being true. Of sixteen throw sites, six named neither a field nor a range:
nothing about `null`, or about `"2153-12-08"`, is a field that is out of anything.

## The evidence was structural, not aesthetic

`tibetanDateExists` answers `false` from an **allowlist** of codes and rethrows the rest. While the
shape failures shared the range code, they were on that allowlist — so a caller who passed a
`PlainDate` was told *that date does not exist*, which is a confident calendrical claim about a
confusion in their own code.

The workaround was to hoist `rejectTemporalInstance` and `rejectInvalidLeapFlags` out of the
predicate's `try` and call them again there, ahead of the allowlist. That duplication **was** this
split, implemented by hand and depending on a subtle ordering to stay correct. Giving the shape
failures their own code makes the ordering irrelevant: `TCT_INVALID_ARGUMENT` is simply absent from
the allowlist.

## The duplicated guards stay, for a different reason

They were expected to delete once the ordering stopped mattering. They do not, and the reason is
worth recording so nobody deletes them believing the split made them dead.

`tibetanToIso` names *itself* in its guards. Remove the copies from `tibetanDateExists` and a caller
who wrote `tibetanDateExists(plainDate)` is told about `tibetanToIso`, a function they never called
— against [2026-08-12-error-codes-not-classes.md](2026-08-12-error-codes-not-classes.md)'s
requirement that a message echo the call that was made.

So the guards now exist for the **message**, not the behaviour, and the comment at the call site
says so. Deleting them would not break the predicate; it would degrade the error.

## What is deliberately *not* split

`Number.isSafeInteger` conflates "not an integer" with "not a number at all", so
`tibetanWeekday("x")` carries the range code even though a string is arguably the wrong kind of
thing. Splitting inside that check would mean a `typeof` test at eight sites to buy a distinction no
caller acts on — both are "this argument's number is unusable", and both are fixed the same way.

`parseTibetanDate` draws its line where its parser does. A string failing the grammar is
`TCT_INVALID_ARGUMENT`, **including** `"2153-M13-01"`, which does name an out-of-range month: the
pattern refuses the whole string before any group is read, so there is no field to report. A string
that parses and then names an unrepresentable year is `TCT_FIELD_OUT_OF_RANGE`, because by then the
grammar was satisfied and the failure really is about a value.

## What this stops a contributor doing

- **Reusing `TCT_FIELD_OUT_OF_RANGE` for a new shape check** because it is the code already
  imported. New entry points reject wrong-kind arguments with `TCT_INVALID_ARGUMENT`.
- **Adding `TCT_INVALID_ARGUMENT` to `tibetanDateExists`'s allowlist** to make the predicate total.
  It is on the throwing side for the same reason `TCT_OUTSIDE_EXACT_RANGE` is: `false` would be a
  claim about the calendar in answer to a question about the caller's code.
- **Deleting the duplicated guards in `tibetanDateExists`** as redundant. See above.
- **Promoting either to a `TypeError`.** [2026-08-12-error-codes-not-classes.md](2026-08-12-error-codes-not-classes.md)
  types by kind of failure, not by severity: `RangeError` for anything wrong with the caller's
  input, plain `Error` only for what is not about the call. A wrong-kind argument is still the
  caller's input. That record is not reopened here.
