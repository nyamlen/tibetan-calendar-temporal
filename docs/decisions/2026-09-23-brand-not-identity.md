---
date: 2026-09-23
status: accepted
---

# The date boundary tests kind, not identity

**Decision:** every guard that asks "is this a Temporal value?" reads `Symbol.toStringTag` through
`temporalKindOf` in `src/temporal-kind.ts`, never `instanceof Temporal.PlainDate`. A `PlainDate`
from a second Temporal implementation is a Western date at a Western entry point and is normalised;
at a Tibetan entry point it is refused with `TCT_INVALID_ARGUMENT`. `src/temporal-kind.ts` is the
only file in `src/` permitted to say `instanceof Temporal`, and `check:conventions` Rule 15 enforces
that against the literal idiom — see "What Rule 15 does and does not reach" below.

## What a contributor would otherwise do

Write `value instanceof Temporal.PlainDate`. It is the obvious check, TypeScript narrows on it, and
it is what this package did at five sites across three files until 2026-09-23.

It asks the wrong question. `instanceof` is about **identity** — whether the value was built by
whichever `Temporal` is the global object at call time — and this package needs **kind**. Two
Temporal implementations meet in one page routinely:

- native Chrome plus a dependency bundling a polyfill;
- Safari with two non-deduplicated copies in `node_modules`;
- a date arriving from an iframe;
- a polyfill installed after this package was imported.

The first two are the cases actually coming: the first real consumer is nyamlen's own site, which
must run on Safari and therefore ships a polyfill.

## What it cost, measured

A foreign instance fails every `instanceof`, and the two sides of the boundary then failed in
opposite directions — **27 exports** across the three barrels.

At a **Western** entry point the value was rejected: 10 exports refused a genuine calendar day with
a message calling it "the wrong kind of thing". `nextFullMoon(resolveDate({ … }))` after a late
polyfill install is the sharpest case, because there the package refuses a date it produced itself.

At a **Tibetan** entry point the rejection never fired, and the value fell through to being read
structurally for `year`/`month`/`day` — which a `PlainDate` has. 17 exports answered confidently and
wrongly: `tibetanToIso` returned `1897-09-05` for ISO 2024-07-09, having read ISO 2024 as royal-era
2024. `rejectTemporalInstance`'s own docblock names that outcome as the bug it exists to prevent.

## Why the brand rather than duck typing

`Object.prototype.toString.call(x)` returns `[object Temporal.PlainDate]` for a native and a foreign
instance alike, and `[object Object]` for a bare `{ year, month, day }`. That last separation is the
whole reason this works: the bare object is this package's own `TibetanDateFields`, and
`isoToTibetan({ year: 2153, month: 12, day: 8 })` is a genuine value of both types. Duck typing on
fields or methods cannot tell them apart, which is the ambiguity the surface already refuses to
guess at — see [2026-08-12-public-surface.md](2026-08-12-public-surface.md).

`Symbol.toStringTag` is mandated by the Temporal proposal on every type, so it is a specification
guarantee rather than an implementation detail.

## The brand is spoofable, and that was accepted

`{ [Symbol.toStringTag]: "Temporal.PlainDate", year: 1, month: 1, day: 1 }` reads as a `PlainDate`.
This is survivable in both directions. On the reject side, over-rejecting a deliberately disguised
object is harmless. On the accept side, normalisation then fails and throws a coded error rather
than computing. `instanceof` was not strong here either — it is strong about identity, and identity
is the property that turned out not to matter.

## Three failure modes with decided codes

Each of these was specified rather than inherited, because an uncoded error surviving a fix aimed at
uncoded errors is the shape of mistake this file exists to stop.

| Case | Code |
|---|---|
| A revoked `Proxy`, or a throwing `Symbol.toStringTag` getter, where the tag read itself throws — as `instanceof` also does on the first | `TCT_INVALID_ARGUMENT` |
| A Temporal type outside the three: `Instant`, `PlainYearMonth`, `PlainMonthDay`, `PlainTime`, `Duration`. Each carries its own tag, so the predicate sees them; none names a calendar day | `TCT_INVALID_ARGUMENT`, naming what was received |
| `globalThis.Temporal` deleted after import, past the import-time guard that will not run again | `TCT_MISSING_TEMPORAL` |

The message is built from the **tag**, not from `value.constructor.name`. A null-prototype object
carrying the tag has `constructor === undefined`, so that expression threw an uncoded `TypeError` at
the guard. The brand check is what makes that input reachable; `instanceof` did not.

## Normalisation, and the two forms that must not be used

A foreign instance is brought into this realm with `Temporal.PlainDate.from(String(value))` — its
own ISO 8601 serialisation, which every implementation must produce.

- **Not** `from({ year, month, day })`. On a non-ISO calendar it read the hebrew date as the year
  5784, three and a half millennia out, silently. That is the same ambiguity `asPlainDate` refuses at
  its own boundary, reappearing inside the fix.
- **Not** `from(value)`, which reads an unrecognised object's fields. Cross-implementation
  arithmetic was measured working in both directions, but the mechanism behind it was conjecture and
  the same path has a failure mode of its own. Do not build on an unverified mechanism.

## Non-ISO calendars are refused, not converted

`julianDayFromIso(Temporal.PlainDate.from("2024-07-09").withCalendar("hebrew"))` threw an **uncoded**
`RangeError: Mismatched calendars` from `since()`, at a public export, with no foreign implementation
involved at all. It now throws `TCT_INVALID_ARGUMENT` naming the calendar received.

Refusing is the narrow arm, and narrowing later is the move that is never free. `.withCalendar(
"iso8601")` preserves the day exactly, so the refusal costs a caller one call and the message says
so. Accepting these remains open and would be purely additive.

## Three policies, one predicate

The predicate returns a **kind** and not a boolean, because the entry points accept different subsets,
and a value from a second implementation is narrowed by its kind's `.toPlainDate()` (a genuine
instance of this realm's three types is recognised by its slots first and copied, never asked).
Written on top of it:

| Policy | Where |
|---|---|
| Refuse a Temporal value where a Tibetan date is expected | `assertTibetanShape` (its private `rejectTemporalInstance`) |
| Normalise a Western-date input to `PlainDate` | `asPlainDate` |
| Discriminate the `PlainDate \| TibetanDate` union | `asWesternDay` |

The third existed **twice** — as `phaseStart` in `navigation.ts` and `isoOf` in
`astrology/index.ts` — and Rule 14 could not see the pair, because the bodies and the arity differed.
Both had drifted into shipping a message that misdescribed its own function, in opposite directions:
`nextFullMoon` named two of the four shapes it accepts, and `attributesFor` named four while never
mentioning the resolved `TibetanDate` it takes.

### Merging the two copies narrowed one accept-set, deliberately

The two copies did not accept the same things, and unifying them had to pick one. `phaseStart`
required `isoDate` to be a `PlainDate`; `isoOf` accepted any object with an `isoDate` **key** and
handed the value to `asPlainDate`, so `{ isoDate: "2024-07-09" }` and
`{ isoDate: <PlainDateTime> }` were accepted by `./astrology` and refused by `nextFullMoon`.

`asWesternDay` takes the narrower set. Measured 2026-09-23 against `dist/`: both of those now throw
`TCT_INVALID_ARGUMENT` at `attributesFor`, `calendarDayAttributesFor`, `elementalYogaFor` and
`lunarMansionFor`, where before only `navigation.ts`'s pair refused them.

Three reasons, in order of weight. Neither shape is a `TibetanDate` — the parameter's declared type
is `Temporal.PlainDate | TibetanDate`, and a hand-built object with a string in `isoDate` satisfies
neither, so nothing that compiled against the types is affected. Narrowing before 1.0.0 is a
correction and after it is a breaking change, which is the same reasoning the whole record rests on.
And the wider arm was never a decision: it was what `"isoDate" in candidate` happened to admit.

**Widening it again is free, so this is the reversible direction.** A consumer who genuinely wants
`{ isoDate: "2024-07-09" }` read as a Western date can pass the string itself, which
`asWesternDay` accepts.

## The anchor is rebuilt when the global changes

`src/computation/conversion.ts` captures `UNIX_EPOCH` at module evaluation, the only module-level
`Temporal` capture in `src/`. After a late `installImplementation()` the anchor and the global are
different implementations, so normalising an incoming date would achieve nothing — the two would
meet again one line later.

Measured 2026-09-23, the arithmetic survives that mixture in both directions, so this is about not
depending on a measurement whose mechanism is unverified rather than about a live break. Two
alternatives were put and lost: leaving it and pinning the mixture with a test, and dropping the
anchor for a closed-form Julian-day computation. The third is the tidiest end state and is the one to
revisit if the anchor ever causes trouble; it was not taken because it replaces a core conversion for
a problem that is currently theoretical.

**The first justification offered for this was withdrawn.** It argued that the cached anchor is a
memoisation of the same kind as `scalingFor` and `monthsFor`. It is not: those key on a value the
caller passed, and this keys on mutable global state, which is precisely what "same input, same
output as a caller observes" excludes. The decision stands on one implementation per arithmetic
operation, not on that analogy.

## What Rule 15 does and does not reach

It matches the literal `instanceof Temporal…` idiom, in code lines only. Comment lines are exempt so
that the docblock explaining the rule may name it — the rule's first run flagged exactly that, which
is how a rule teaches people to ignore it.

It matches `instanceof` against `Temporal` **or against any of the three constructor names**, so
all of these are caught:

```ts
v instanceof Temporal.PlainDate;
v instanceof globalThis.Temporal.PlainDate;
const T = Temporal;
v instanceof T.PlainDate;
const { PlainDate } = Temporal;
v instanceof PlainDate; // idiomatic, and so the likeliest accident
```

**The first three were not**, until the pattern was widened on 2026-09-23. It had been written as a
literal `instanceof Temporal`, from the shape this codebase happened to contain; a review found two
of the gaps and the destructured one surfaced only when the forms were run past the checker rather
than reasoned about. The widening is one character class and produces zero false positives across
`src/`.

What still passes is a single-identifier alias (`const P = Temporal.PlainDate; v instanceof P`), a
comma expression, and a `getPrototypeOf` comparison. Each needs the checker to resolve bindings, and
none is written by accident. So the rule is a **ratchet against the accident**, not a proof that no
identity check exists in `src/`. Four documents said "anywhere else" for a day, which is the broader
claim. Do not cite the rule as evidence of absence.

## Why this was settled before 1.0.0 and not after

Which inputs throw is part of the `error.code` contract, and
[2026-08-15-argument-errors-split.md](2026-08-15-argument-errors-split.md) turns on that
distinction. Recognising foreign instances changes which inputs throw at 27 exports. Before 1.0.0
that is a correction; after it, a breaking change.
