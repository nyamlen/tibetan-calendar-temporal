/**
 * What a Temporal value **is**, decided by its brand rather than by its identity.
 *
 * @remarks
 * ## Why this file exists
 *
 * Every guard in this package used to ask `value instanceof Temporal.PlainDate`, which is a
 * question about *identity*: it is true only for an instance built by whichever `Temporal` is the
 * global object at call time. Two Temporal implementations meet in one page more often than that
 * assumption survives — native Chrome plus a dependency bundling a polyfill, Safari with two
 * non-deduplicated copies in `node_modules`, a date arriving from an iframe, or a polyfill
 * installed after this package was imported. In each of those a perfectly ordinary `PlainDate`
 * fails every `instanceof`, and this package then did one of two wrong things: refused a genuine
 * Western date at ten exports, or — worse — let a Western date fall through a Tibetan-side guard
 * and be read structurally for `year`/`month`/`day`, which a `PlainDate` has, returning a
 * confident wrong answer at seventeen more.
 *
 * `Symbol.toStringTag` is what separates them, and the Temporal proposal mandates it on every
 * type. `Object.prototype.toString.call(x)` gives `[object Temporal.PlainDate]` for a native and a
 * foreign instance alike, and `[object Object]` for a bare `{ year, month, day }` — which is the
 * shape that must stay distinguishable, since it is this package's own `TibetanDateFields`. So the
 * boundary tests **kind, not identity**, and `docs/decisions/2026-09-23-brand-not-identity.md`
 * records that as the constraint it is.
 *
 * ## The brand is spoofable, and that is survivable in both directions
 *
 * `{ [Symbol.toStringTag]: "Temporal.PlainDate", year: 1, month: 1, day: 1 }` reads as a
 * `PlainDate` here. On the *reject* side, over-rejecting a deliberately disguised object is
 * harmless — nobody writes that by accident. On the *accept* side, {@link toNativePlainDate} then
 * fails to normalise it and throws a coded error rather than computing on it. `instanceof` was not
 * strong here either: it is strong about identity, and this package needs kind.
 *
 * ## This is the only file in `src/` allowed to say `instanceof Temporal`
 *
 * Five identity checks accumulated across three files with nothing watching, and two of the five
 * were a second copy of a policy that already existed elsewhere. `check:conventions` rule 15 now
 * refuses `instanceof Temporal` anywhere else, which is a checkable rule precisely because the home
 * is one named file rather than "the guards".
 *
 * @packageDocumentation
 */

import { describe, rangeError } from "./errors.js";

/** The Temporal types that name a calendar day, and so can be normalised to one. */
export type TemporalDayKind = "PlainDate" | "PlainDateTime" | "ZonedDateTime";

const TAG_PREFIX = "[object Temporal.";

const DAY_KINDS: ReadonlySet<string> = new Set<TemporalDayKind>([
	"PlainDate",
	"PlainDateTime",
	"ZonedDateTime",
]);

/**
 * The Temporal type name a value carries, or `null` if it carries none.
 *
 * @remarks
 * Returns the tag's suffix — `"PlainDate"`, `"Instant"`, `"Duration"` — rather than a boolean,
 * because a caller needs to *say* what it received. `Instant`, `PlainYearMonth`, `PlainMonthDay`,
 * `PlainTime` and `Duration` each carry their own tag and so reach this function; none of them
 * names a calendar day, so {@link temporalKindOf} answers `null` for them while this one names
 * them for the message.
 *
 * **The read is wrapped**, because `Object.prototype.toString.call` throws on a revoked `Proxy`.
 * That is not a regression — `instanceof` throws on one too — but a boundary is where an uncoded
 * `TypeError` becomes a coded error, so it is converted here rather than left to escape.
 *
 * @throws A `TCT_INVALID_ARGUMENT` error if the value's own brand cannot be read.
 */
export function temporalTypeNameOf(value: unknown): string | null {
	if (value === null || (typeof value !== "object" && typeof value !== "function")) return null;
	let tag: string;
	try {
		tag = Object.prototype.toString.call(value);
	} catch {
		throw rangeError(
			"TCT_INVALID_ARGUMENT",
			"received a value whose type cannot be read — a revoked Proxy, most likely. Pass the " +
				"date itself rather than a proxy for it.",
		);
	}
	if (!tag.startsWith(TAG_PREFIX) || !tag.endsWith("]")) return null;
	return tag.slice(TAG_PREFIX.length, -1);
}

/**
 * Which of the three day-naming Temporal types a value is, or `null`.
 *
 * @remarks
 * A kind and not a boolean, because both callers need the distinction: {@link toNativePlainDate}
 * has to know whether to call `.toPlainDate()`, and the entry points accept different subsets. A
 * boolean predicate could serve neither.
 *
 * @throws A `TCT_INVALID_ARGUMENT` error if the value's own brand cannot be read.
 */
export function temporalKindOf(value: unknown): TemporalDayKind | null {
	const name = temporalTypeNameOf(value);
	return name !== null && DAY_KINDS.has(name) ? (name as TemporalDayKind) : null;
}

/**
 * Brings a Temporal value of a known kind into **this** realm, as a `Temporal.PlainDate`.
 *
 * @remarks
 * A foreign instance is normalised through `Temporal.PlainDate.from(String(value))` — its own
 * ISO-8601 serialisation, which every implementation must produce and this one must read. Two
 * alternatives were rejected. `from(value)` reads an unrecognised object's *fields*, which is a
 * path whose behaviour across implementations is not established here; `from({ year, month, day })`
 * is silently catastrophic on a non-ISO calendar, reading a hebrew-calendar day as the year 5784 —
 * three and a half millennia out, with nothing about the output looking wrong. The string form
 * carries the calendar annotation, which is what makes the refusal below possible at all.
 *
 * Every arithmetic operation downstream then runs inside one implementation, which is the point:
 * `julianDayFromIso` subtracts a module-level anchor captured from whichever `Temporal` was global
 * at import, and mixing implementations across that subtraction is a dependence nothing here wants
 * to rest on.
 *
 * ## Non-ISO calendars are refused, not converted
 *
 * `julianDayFromIso(Temporal.PlainDate.from("2024-07-09").withCalendar("hebrew"))` threw an
 * **uncoded** `RangeError: Mismatched calendars` from `since()`, at a public export, with no
 * foreign implementation involved at all. Refusing with a code is the narrow arm, and narrowing
 * later is the move that is never free: `.withCalendar("iso8601")` preserves the day exactly, so
 * the refusal costs a caller one call and the message names it. Accepting these remains open.
 *
 * @throws A `TCT_MISSING_TEMPORAL` error if the global `Temporal` has been removed since import.
 * @throws A `TCT_INVALID_ARGUMENT` error if the value cannot be read as an ISO calendar day.
 */
export function toNativePlainDate(value: unknown, kind: TemporalDayKind): Temporal.PlainDate {
	if (typeof Temporal === "undefined") {
		// The import-time guard in `computation/conversion.ts` has already run and will not run
		// again, so a global deleted after import lands here. A bare `ReferenceError: Temporal is
		// not defined` names neither the requirement nor the fix; this code does.
		throw rangeError(
			"TCT_MISSING_TEMPORAL",
			"the global Temporal has been removed since this package was imported, so a date cannot " +
				"be normalised. Restore it, or import a polyfill before this package.",
		);
	}
	if (kind !== "PlainDate") {
		const narrowed: unknown = (value as { toPlainDate: () => unknown }).toPlainDate();
		return toNativePlainDate(narrowed, "PlainDate");
	}
	if (value instanceof Temporal.PlainDate) return assertIsoCalendar(value);
	let normalised: Temporal.PlainDate;
	try {
		normalised = Temporal.PlainDate.from(String(value));
	} catch (error) {
		throw rangeError(
			"TCT_INVALID_ARGUMENT",
			`received a value branded Temporal.${kind} that does not serialise to a calendar day: ` +
				`${describe(value)}${error instanceof Error ? ` (${error.message})` : ""}`,
		);
	}
	return assertIsoCalendar(normalised);
}

/**
 * Refuses a `PlainDate` that is not in the ISO 8601 calendar.
 *
 * @remarks
 * Exported because {@link toNativePlainDate} is not the only way one arrives: an ISO string may
 * carry a `[u-ca=hebrew]` annotation, and `asPlainDate` parses those itself.
 *
 * @throws A `TCT_INVALID_ARGUMENT` error naming the calendar received and the conversion that
 * preserves the day.
 */
export function assertIsoCalendar(date: Temporal.PlainDate): Temporal.PlainDate {
	if (date.calendarId === "iso8601") return date;
	throw rangeError(
		"TCT_INVALID_ARGUMENT",
		`received a Temporal.PlainDate in the ${date.calendarId} calendar. The arithmetic here is ` +
			`defined on ISO days, so the calendar has to be said explicitly: convert it with ` +
			`.withCalendar("iso8601"), which names the same day.`,
	);
}
