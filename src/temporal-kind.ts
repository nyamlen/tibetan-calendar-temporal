/**
 * What a Temporal value **is**, decided by its brand rather than by its identity.
 *
 * @remarks
 * A value is a Temporal value of a kind when `Object.prototype.toString.call(x)` gives
 * `[object Temporal.<Kind>]`, which is the same for an instance from this realm's `Temporal`, a
 * second implementation's (a polyfill, an iframe) and a deliberately disguised object. A bare
 * `{ year, month, day }` gives `[object Object]` and so stays distinguishable, which it must: it is
 * this package's own `TibetanDateFields`.
 *
 * The brand is spoofable. An object carrying `Symbol.toStringTag` `"Temporal.PlainDate"` reads as a
 * `PlainDate` here. {@link toNativePlainDate} then normalises it through its own string form, so it
 * is accepted only if that string is an ISO calendar day, and otherwise refused with a coded error.
 *
 * This is the only file in `src/` that tests `instanceof Temporal`.
 *
 * @packageDocumentation
 */

import { assertInternal, codedError, describe, rangeError, thrownDetail } from "./errors.js";

// Every guard once asked `value instanceof Temporal.PlainDate`, a question about *identity*: true only
// for an instance built by whichever `Temporal` is global at call time. Two implementations meet in
// one page more often than that assumption survives — native Chrome plus a dependency bundling a
// polyfill, Safari with two non-deduplicated copies in `node_modules`, a date arriving from an iframe,
// a polyfill installed after this package was imported. A perfectly ordinary `PlainDate` then failed
// every `instanceof`, and the package either refused a genuine Western date or — worse — let one fall
// through a Tibetan-side guard to be read structurally for `year`/`month`/`day`, which a `PlainDate`
// has, returning a confident wrong answer. `Symbol.toStringTag` is mandated by the Temporal proposal
// on every type, so the boundary tests **kind, not identity**:
// `docs/decisions/2026-09-23-brand-not-identity.md`. On the reject side, over-rejecting a
// deliberately disguised object is harmless; on the accept side `toNativePlainDate` normalises it
// rather than computing on its fields.
//
// `check:conventions` rule 15 refuses `instanceof Temporal` in every other file's code, a checkable
// rule precisely because the home is one named file rather than "the guards". It matches `instanceof`
// against `Temporal` **or any of the three constructor names**, in code lines, so the qualified,
// aliased and destructured forms are all caught — including
// `const { PlainDate } = Temporal; v instanceof PlainDate`, the likeliest accidental one. A
// single-identifier alias (`const P = Temporal.PlainDate; v instanceof P`) and a `getPrototypeOf`
// comparison still pass, needing the checker to resolve bindings: **a ratchet against the accident,
// not a proof that no identity check exists** — do not cite it as one.

/** The Temporal types that name a calendar day, and so can be normalised to one. */
export type TemporalDayKind = "PlainDate" | "PlainDateTime" | "ZonedDateTime";

const TAG_PREFIX = "[object Temporal.";

const DAY_KINDS: ReadonlySet<string> = new Set<TemporalDayKind>([
	"PlainDate",
	"PlainDateTime",
	"ZonedDateTime",
]);

/**
 * Returns the Temporal type name a value carries, or `null` if it carries none.
 *
 * @remarks
 * Returns the suffix of a `[object Temporal.<Name>]` tag — `"PlainDate"`, `"Instant"`, `"Duration"` —
 * whether or not `<Name>` is a real Temporal type, so the caller can *say* what it received. A
 * non-object, a function without such a tag and a plain object answer `null`. `Instant`,
 * `PlainYearMonth`, `PlainMonthDay`, `PlainTime` and `Duration` each carry their own tag and so are
 * named here; none of them names a calendar day, so {@link temporalKindOf} answers `null` for them.
 *
 * @param subject - The export and argument the caller passed, which opens the message when given.
 * @throws A `TCT_INVALID_ARGUMENT` error if the value's own brand cannot be read: a revoked `Proxy`,
 * or an object whose `Symbol.toStringTag` getter throws. The message names neither cause.
 */
// The read is wrapped because a boundary is where an uncoded `TypeError` becomes a coded error. That
// is not a regression: `instanceof` throws on a revoked `Proxy` too. The message names neither cause
// because nothing here establishes which one it was.
export function temporalTypeNameOf(value: unknown, subject?: string): string | null {
	if (value === null || (typeof value !== "object" && typeof value !== "function")) return null;
	let tag: string;
	try {
		tag = Object.prototype.toString.call(value);
	} catch (error) {
		throw rangeError(
			"TCT_INVALID_ARGUMENT",
			`${subject === undefined ? "" : `${subject}: `}received a value whose type cannot be ` +
				"read: reading its Symbol.toStringTag threw. Pass the date itself.",
			error,
		);
	}
	if (!tag.startsWith(TAG_PREFIX) || !tag.endsWith("]")) return null;
	return tag.slice(TAG_PREFIX.length, -1);
}

/**
 * Returns which of the three day-naming Temporal types a value is — `"PlainDate"`,
 * `"PlainDateTime"` or `"ZonedDateTime"` — or `null`.
 *
 * @remarks
 * A kind and not a boolean, because {@link toNativePlainDate} has to know whether to call
 * `.toPlainDate()`, and the entry points accept different subsets of the three.
 *
 * @param subject - As {@link temporalTypeNameOf}'s.
 * @throws A `TCT_INVALID_ARGUMENT` error if the value's own brand cannot be read.
 */
export function temporalKindOf(value: unknown, subject?: string): TemporalDayKind | null {
	const name = temporalTypeNameOf(value, subject);
	return name !== null && DAY_KINDS.has(name) ? (name as TemporalDayKind) : null;
}

/**
 * Throws `TCT_MISSING_TEMPORAL` if the global `Temporal` was deleted after import, and returns
 * nothing otherwise.
 *
 * @remarks
 * The import-time guard in `computation/conversion.ts` has already run and will not run again, so a
 * global deleted after import lands here. A bare `ReferenceError: Temporal is not defined` names
 * neither the requirement nor the fix; this code does. The paths that normalise a caller's date call
 * it first — `toNativePlainDate` and the ISO-string arm of `asPlainDate` — so the `ReferenceError` is
 * not recoded as the caller's fault.
 *
 * @throws A `TCT_MISSING_TEMPORAL` error if the global `Temporal` has been removed since import.
 */
export function assertTemporalPresent(): void {
	if (typeof Temporal === "undefined") {
		// `codedError`, not `rangeError`: the README states that `TCT_MISSING_TEMPORAL` is a plain
		// `Error` deliberately, and one code riding two error types would make that false for
		// whichever site a consumer happened to hit. The import-time guard in `conversion.ts` uses
		// the same constructor.
		throw codedError(
			"TCT_MISSING_TEMPORAL",
			"the global Temporal has been removed since this package was imported, so a date cannot " +
				"be normalised. Restore it, or import a polyfill before this package.",
		);
	}
}

/**
 * Brings a Temporal value of a known kind into **this** realm, as an ISO `Temporal.PlainDate`.
 *
 * @remarks
 * A `PlainDate` from this realm's `Temporal`, a subclass's instance included, is returned as a fresh
 * `Temporal.PlainDate` copied from the date itself, so nothing a subclass overrides is read
 * afterwards.
 * A `PlainDateTime` or `ZonedDateTime` from this realm, a subclass's included, is copied the same
 * way, so the day is the one on its own wall clock, with no time-zone conversion, and an overridden
 * `toPlainDate` is never called. A genuine instance is recognised by its internal slots before its
 * brand is trusted, so one whose `Symbol.toStringTag` names another kind is refused. A
 * `PlainDateTime` or `ZonedDateTime` from a second implementation is narrowed with its own
 * `toPlainDate()`. Any other instance — a second implementation's `PlainDate`
 * — is normalised through `Temporal.PlainDate.from(String(value))`, its own ISO-8601 serialisation,
 * so a disguised object is accepted only if its string form is an ISO calendar day.
 *
 * **Non-ISO calendars are refused, not converted**: the arithmetic here is defined on ISO days, and
 * `.withCalendar("iso8601")` preserves the day exactly, so the refusal costs a caller one call and
 * the message names it.
 *
 * @throws A `TCT_MISSING_TEMPORAL` error if the global `Temporal` has been removed since import.
 * @throws A `TCT_INVALID_ARGUMENT` error if the value cannot be read as an ISO calendar day: a
 * non-ISO calendar, an object whose brand names a kind it is not (no `toPlainDate`, or one that
 * throws), a genuine instance branded as another kind, a prototype that cannot be read, an object
 * created from a Temporal prototype or a Proxy that reports one, or a string form that is not a
 * calendar day. Each message opens with
 * `subject` when one is given.
 */
// The string form is the one every implementation must produce and this one must read. Two
// alternatives were rejected: `from(value)` reads an unrecognised object's *fields*, a path whose
// behaviour across implementations is not established here, and `from({ year, month, day })` is
// silently catastrophic on a non-ISO calendar, reading a hebrew-calendar day as the year 5784 — three
// and a half millennia out, with nothing about the output looking wrong. The string carries the
// calendar annotation, which is what makes the refusal possible at all. Every arithmetic operation
// downstream then runs inside one implementation: `julianDayFromIso` subtracts a module-level anchor
// captured from whichever `Temporal` was global at import. Refusing non-ISO calendars with a code was
// the narrow arm — it replaced an uncoded `RangeError: Mismatched calendars` from `since()` — and
// narrowing later is never free, so accepting them remains open.
export function toNativePlainDate(
	value: unknown,
	kind: TemporalDayKind,
	subject?: string,
): Temporal.PlainDate {
	assertTemporalPresent();
	const prefix = subject === undefined ? "" : `${subject}: `;
	// Asked before the brand is trusted: the tag is the caller's to set, so a subclass that rewrites
	// it would otherwise steer itself onto a path that calls its own `toPlainDate` or `toString`.
	const genuine = genuineKindOf(value);
	if (genuine !== null) {
		if (genuine !== kind) {
			throw rangeError(
				"TCT_INVALID_ARGUMENT",
				`${prefix}received a value branded Temporal.${kind} that is a Temporal.${genuine}, so its ` +
					`brand cannot be trusted: ${describe(value)}. Pass the date itself.`,
			);
		}
		// A genuine instance, whatever its prototype says. `Temporal.PlainDate.from` copies it from its
		// slots — a `PlainDateTime`'s day, a `ZonedDateTime`'s wall-clock day — and keeps the calendar,
		// so nothing a subclass overrides is read and the ISO check reads the true calendar. The copy is
		// what the engine reads, so a subclass's `year` or `since` never is.
		return assertIsoCalendar(
			Temporal.PlainDate.from(
				value as Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime,
			),
			subject,
		);
	}
	// No slot of this realm's Temporal. Something that still reports this realm's prototype —
	// `Object.create(Temporal.PlainDate.prototype)`, or a Proxy around a real date, which `instanceof`
	// accepts through its trap — is refused: `Temporal.PlainDate.from` reads a forwarding Proxy's
	// *fields*, and a Tishrei date's fields read as ISO 5785-01-03.
	assertNotPosingAs(value, kind, prefix);
	if (kind !== "PlainDate") {
		// A second implementation's instance, or a spoofed brand. Guarded, because the brand is
		// spoofable and the narrowing call is not. An object carrying `Temporal.ZonedDateTime` and
		// nothing else threw an **uncoded** `TypeError: value.toPlainDate is not a function` — at the
		// one boundary whose stated job is to convert uncoded TypeErrors into coded errors, and on the
		// exact branch the spoofing argument above rests on. A `toPlainDate` that throws on its own
		// escaped the same way.
		let narrow: unknown;
		try {
			narrow = (value as { toPlainDate?: unknown }).toPlainDate;
		} catch (error) {
			throw rangeError(
				"TCT_INVALID_ARGUMENT",
				`${prefix}received a value branded Temporal.${kind} whose toPlainDate could not be read: ` +
					`${describe(value)} (${thrownDetail(error)})`,
				error,
			);
		}
		if (typeof narrow !== "function") {
			throw rangeError(
				"TCT_INVALID_ARGUMENT",
				`${prefix}received a value branded Temporal.${kind} with no toPlainDate method, so it cannot ` +
					`name a calendar day: ${describe(value)}`,
			);
		}
		let narrowed: unknown;
		try {
			narrowed = narrow.call(value);
		} catch (error) {
			throw rangeError(
				"TCT_INVALID_ARGUMENT",
				`${prefix}received a value branded Temporal.${kind} whose toPlainDate failed: ` +
					`${describe(value)} (${thrownDetail(error)})`,
				error,
			);
		}
		return toNativePlainDate(narrowed, "PlainDate", subject);
	}
	let normalised: Temporal.PlainDate;
	try {
		normalised = Temporal.PlainDate.from(String(value));
	} catch (error) {
		throw rangeError(
			"TCT_INVALID_ARGUMENT",
			`${prefix}received a value branded Temporal.${kind} that does not serialise to a calendar day: ` +
				`${describe(value)} (${thrownDetail(error)})`,
			error,
		);
	}
	return assertIsoCalendar(normalised, subject);
}

/** This realm's constructor for a day kind, read at call time (see {@link genuineKindOf}). */
function nativeClassOf(
	kind: TemporalDayKind,
): typeof Temporal.PlainDate | typeof Temporal.PlainDateTime | typeof Temporal.ZonedDateTime {
	if (kind === "PlainDate") return Temporal.PlainDate;
	return kind === "PlainDateTime" ? Temporal.PlainDateTime : Temporal.ZonedDateTime;
}

/**
 * Which of this realm's three day types `value` genuinely is, by its slots, or `null`.
 *
 * @remarks
 * Each type's intrinsic `calendarId` getter reads the receiver's own internal slot and throws for
 * anything without one: a subclass's instance has it whatever its prototype or tag says, and a Proxy
 * or an object created from a prototype does not. No code of the caller's runs.
 */
// Read at call time rather than at module scope: touching `Temporal` at import would pre-empt the
// import-time guard's message about a missing `Temporal`.
function genuineKindOf(value: unknown): TemporalDayKind | null {
	if (value === null || typeof value !== "object") return null;
	for (const kind of DAY_KINDS as ReadonlySet<TemporalDayKind>) {
		const getter = assertInternal(
			Object.getOwnPropertyDescriptor(nativeClassOf(kind).prototype, "calendarId")?.get,
			`Temporal.${kind}.prototype has no calendarId getter`,
		);
		try {
			getter.call(value);
			return kind;
		} catch {
			// Not this kind; try the next.
		}
	}
	return null;
}

/**
 * Refuses a value without a slot that still reports this realm's prototype for `kind`.
 *
 * @remarks
 * `instanceof` walks the prototype chain, which a Proxy answers with its own trap, so it is guarded
 * like every other read of the caller's value.
 */
function assertNotPosingAs(value: unknown, kind: TemporalDayKind, prefix: string): void {
	let posing: boolean;
	try {
		posing = value instanceof nativeClassOf(kind);
	} catch (error) {
		throw rangeError(
			"TCT_INVALID_ARGUMENT",
			`${prefix}received a value branded Temporal.${kind} whose prototype cannot be read: ` +
				`${describe(value)} (${thrownDetail(error)})`,
			error,
		);
	}
	if (posing) {
		throw rangeError(
			"TCT_INVALID_ARGUMENT",
			`${prefix}received a value that passes as a Temporal.${kind} but is not itself one — an ` +
				"object created from its prototype, or a Proxy around one — so it cannot name a " +
				`calendar day: ${describe(value)}. Pass the date itself.`,
		);
	}
}

/**
 * Returns `date` if it is in the ISO 8601 calendar and refuses it otherwise.
 *
 * @remarks
 * Exported because {@link toNativePlainDate} is not the only way a `PlainDate` arrives: an ISO
 * string may carry a `[u-ca=hebrew]` annotation, and `asPlainDate` parses those itself.
 *
 * @param subject - The export and argument the caller passed, which opens the message when given.
 * @throws A `TCT_INVALID_ARGUMENT` error naming the calendar received and the conversion that
 * preserves the day.
 */
export function assertIsoCalendar(date: Temporal.PlainDate, subject?: string): Temporal.PlainDate {
	if (date.calendarId === "iso8601") return date;
	throw rangeError(
		"TCT_INVALID_ARGUMENT",
		`${subject === undefined ? "" : `${subject}: `}received a Temporal.PlainDate in the ${date.calendarId} calendar. The arithmetic here is ` +
			`defined on ISO days, so the calendar has to be said explicitly: convert it with ` +
			`.withCalendar("iso8601"), which names the same day.`,
	);
}
