/**
 * Machine-readable codes carried by every error this package throws.
 *
 * @remarks
 * The convention is Node's own: a built-in error type carrying a stable `code`, rather than a
 * hierarchy of exported error classes. `fs` does not export an `ENOENTError`; it throws with
 * `code: "ENOENT"`. The reasoning is recorded in
 * `docs/decisions/2026-08-12-error-codes-not-classes.md`.
 *
 * `SkippedDayError` is the one exported class: a caller genuinely branches on it at runtime —
 * "that day does not exist, offer the neighbour" is a different response from "your input is
 * malformed". It carries a code too, so a caller can discriminate uniformly without mixing
 * `instanceof` and property tests.
 *
 * @packageDocumentation
 */

import { deepFreeze } from "./freeze.js";

/**
 * Every code this package attaches to a thrown error.
 *
 * @remarks
 * Part of the public contract: a code is never removed or repurposed, and every code is asserted
 * in `test/public-api.test.ts`. Message *text* carries no such promise — match on the code, never
 * on the wording.
 *
 * - `TCT_FIELD_OUT_OF_RANGE` — a number is wrong: a year, month, day or Julian day that is a number
 *   but not a safe integer (`NaN`, `1.5`), or falls outside its permitted range (`99` for a day).
 *   **What counts as a number depends on the shape.** In a date or month object, a field that is
 *   absent or is not a number at all (`undefined`, `"5"`, `null`) is `TCT_INVALID_ARGUMENT`, and only
 *   a present number gets this code. Where a function takes a bare number — `yearNameFor`,
 *   `rabjungFor`, `weekdayNameFor`, `asTibetanWeekday` — a value that is not a number is refused with
 *   this code too.
 * - `TCT_INVALID_ARGUMENT` — the argument is the wrong *kind of thing*, so no field of it is out of
 *   any range: a `Temporal.PlainDate`/`PlainDateTime`/`ZonedDateTime` passed where a Tibetan-date
 *   input is expected, a bare `{ year, month, day }` object passed where a Western date is expected,
 *   a non-boolean `isLeapMonth`/`isLeapDay`, `null`/`undefined`/a non-object where a date-shaped
 *   input is expected, a date or month field that is absent or not a number, an options bag that is
 *   not an object or carries a key it does not have, or a string that is not in the grammar
 *   `parseTibetanDate` accepts.
 *
 *   The split decides what `tibetanDateExists` answers: it answers `false` for the range code —
 *   "that date does not exist" — and throws for this one, so a caller who passed a `PlainDate`, or a
 *   date missing its `day`, gets a throw rather than a `false` they would read as a calendrical fact.
 *   See `docs/decisions/2026-08-15-argument-errors-split.md`.
 * - `TCT_NO_SUCH_LEAP_MONTH` — `isLeapMonth` was set for a month that has no leap twin that year.
 * - `TCT_SKIPPED_DAY` — the date is well-formed but no calendar day carries its number. Not an
 *   input error; use `tibetanDateExists` to test first.
 * - `TCT_OUTSIDE_EXACT_RANGE` — the date or year lies beyond where this tradition's integer
 *   arithmetic stays exact. Thrown by conversions and by the closed-form year functions
 *   (`hasLeapMonth`, `leapMonthNumberFor`, `monthsInYear`) alike. Deliberately distinct from
 *   `TCT_SKIPPED_DAY`: past the bound the day was never computed, so reporting it as non-existent
 *   would be a confident false claim.
 * - `TCT_INVALID_TRADITION_CONFIG` — a `TraditionConfig` is malformed.
 * - `TCT_INVALID_OBSERVANCE_CONFIG` — an `ObservanceConfig` or one of its rules is malformed.
 * - `TCT_SPAN_TOO_WIDE` — `getObservances` was asked for a range whose end year is more than 10 years
 *   after its start year.
 * - `TCT_ATTRIBUTE_NOT_SOURCED` — an astrological attribute was asked for in a tradition no source
 *   gives it for. Thrown by the month and lunar-day attributes for `BHUTAN` and `BHUTAN_HENNING`,
 *   because Janson tabulates no month-animal list for that version, and by the elemental yoga under
 *   any config with a nonzero `naming.weekdayOffset`, which both Bhutanese configs have.
 *   **Nothing about the caller's input is wrong** — it is `TCT_INVALID_ARGUMENT`'s neighbour rather
 *   than `TCT_FIELD_OUT_OF_RANGE`'s — and it is deliberately **not** on `tibetanDateExists`'s
 *   allowlist: a Bhutanese date exists perfectly well, only an attribute of it is unsourced.
 * - `TCT_MISSING_TEMPORAL` — the runtime has no `Temporal`. Normally thrown at **import** time,
 *   by the guard in `computation/conversion.ts`. Also thrown at **call** time, by
 *   `temporal-kind.ts`, in the one case the import guard cannot cover: a global deleted after
 *   this package was imported. Both are plain `Error`s, not `RangeError`s.
 * - `TCT_INTERNAL` — an invariant this engine proves for itself did not hold. A bug here rather
 *   than a problem with the caller's input; please report it. A plain `Error`.
 */
// A bare-number argument that is not a number carries the range code because the check is "is this a
// safe integer", and splitting inside it would buy a distinction no caller acts on:
// `docs/decisions/2026-08-15-argument-errors-split.md`, "What is deliberately not split".
//
// A `TCT_INTERNAL` is only a bug of the engine's while the boundary keeps a consumer-supplied value
// from reaching it. The ±3 search window in `isoToTibetan` was proved from Phugpa's correction
// tables, but the tables are injected, so a consumer's config could break the window and be told the
// engine was broken; the window is now derived per tradition, and a config that could not satisfy it
// is rejected as `TCT_INVALID_TRADITION_CONFIG`. Before adding a `TCT_INTERNAL`, check that no
// consumer-supplied value can reach it.
export type TibetanCalendarErrorCode =
	| "TCT_FIELD_OUT_OF_RANGE"
	| "TCT_INVALID_ARGUMENT"
	| "TCT_NO_SUCH_LEAP_MONTH"
	| "TCT_SKIPPED_DAY"
	| "TCT_OUTSIDE_EXACT_RANGE"
	| "TCT_INVALID_TRADITION_CONFIG"
	| "TCT_INVALID_OBSERVANCE_CONFIG"
	| "TCT_SPAN_TOO_WIDE"
	| "TCT_ATTRIBUTE_NOT_SOURCED"
	| "TCT_MISSING_TEMPORAL"
	| "TCT_INTERNAL";

/** An error carrying a {@link TibetanCalendarErrorCode}. */
export type Coded<E extends Error> = E & { code: TibetanCalendarErrorCode };

/**
 * Every error built by `rangeError` or `codedError`, by identity (`SkippedDayError` is not among
 * them). A `code` is a string a caller can forge on an error of their own, so
 * {@link readingCallersObject} asks this instead.
 */
const ownErrors = new WeakSet<object>();

/**
 * Returns a plain `RangeError` carrying a code.
 *
 * @remarks
 * `RangeError` rather than a subclass so that a consumer's existing
 * `catch (e) { if (e instanceof RangeError) }` keeps working. Nothing inside this package narrows by
 * type: `tibetanDateExists` swallows by allowlist — one class and two codes, `SkippedDayError` plus
 * `TCT_FIELD_OUT_OF_RANGE` and `TCT_NO_SUCH_LEAP_MONTH`.
 *
 * @param cause - The error to carry as `cause`. The property is set whenever this argument is
 * passed, `undefined` included, and is absent otherwise.
 */
export function rangeError(
	code: TibetanCalendarErrorCode,
	message: string,
	...cause: [cause?: unknown]
): Coded<RangeError> {
	// Present only when given, so `"cause" in error` still tells a refusal of the caller's own throw
	// from every other one. `cause` is the caller's error, kept so they can find their own stack.
	const error =
		cause.length === 0 ? new RangeError(message) : new RangeError(message, { cause: cause[0] });
	ownErrors.add(error);
	return Object.assign(error, { code });
}

/**
 * Returns a plain `Error` carrying a code.
 *
 * @remarks
 * Used for failures that are **not** about the caller's input, which is why the type differs: where
 * every input problem is a `RangeError`, a plain `Error` says at a glance that this one is the
 * engine's fault rather than the caller's. The code, not the type, is the contract.
 *
 * What keeps such a failure out of `tibetanDateExists`'s `false` is the code's absence from that
 * predicate's allowlist — one class and two codes, `SkippedDayError` plus `TCT_FIELD_OUT_OF_RANGE`
 * and `TCT_NO_SUCH_LEAP_MONTH` — not the plain type: `SkippedDayError` is not a `RangeError` and still
 * answers `false`.
 */
export function codedError(code: TibetanCalendarErrorCode, message: string): Coded<Error> {
	const error = new Error(message);
	ownErrors.add(error);
	return Object.assign(error, { code });
}

/**
 * Returns `value`, narrowed from `T | undefined`, for a value this engine has already proved cannot
 * be `undefined`.
 *
 * @remarks
 * Only `undefined` is refused; `null` and other falsy values pass. Use it only where the index is
 * provably in range; where it is not, the caller's input is involved and `rangeError` is the right
 * throw.
 *
 * @param invariant - Why the value cannot be `undefined`; it becomes the error message.
 *
 * @throws A `TCT_INTERNAL` error (a plain `Error`) if the value is `undefined`, which means this
 * engine has a bug.
 */
// `noUncheckedIndexedAccess` widens every array index to `T | undefined`, including the ones a
// preceding `amod` or `%` has forced into range. There are two ways to discharge that, and only one
// is safe: a cast asserts the claim and a bad index then returns `undefined` wearing the element
// type, propagating silently into a name or a date; this throws, and the code says the fault is the
// engine's rather than the caller's. A throw and a cast were both in use for the same constraint;
// this is the one to use.
export function assertInternal<T>(value: T | undefined, invariant: string): T {
	/* c8 ignore next */
	if (value === undefined) throw codedError("TCT_INTERNAL", `${invariant} — please report this.`);
	return value;
}

/**
 * Returns whether a caught value is an `Error` whose `code` is `code`.
 *
 * @remarks
 * What `tibetanDateExists` uses to match the **two codes** on its allowlist,
 * `TCT_FIELD_OUT_OF_RANGE` and `TCT_NO_SUCH_LEAP_MONTH`. The third member of that allowlist,
 * `SkippedDayError`, is matched by class and does not come through here. `nextObservance` also
 * uses it, for `TCT_OUTSIDE_EXACT_RANGE`.
 *
 * It reads the `code` property and nothing else, so an `Error` of the caller's own carrying a
 * forged code matches too. A value that is not an `Error` never matches.
 */
// The error *type* is too coarse for the allowlist: a malformed `TraditionConfig` is a `RangeError`
// like every other input problem, but it is a broken program rather than a date that does not
// exist. It is rethrown by omission — nothing on the allowlist matches it, so it falls through to
// `throw error` — and never reaches this function.
export function hasCode(error: unknown, code: TibetanCalendarErrorCode): boolean {
	return error instanceof Error && (error as Partial<Coded<Error>>).code === code;
}

/**
 * Returns a value rendered short enough for a message, and unambiguously — `"3"` is not `3`.
 *
 * @remarks
 * **Never throws, and always returns a string**, whatever it is handed — which is why a guard may
 * render its raw input here before it knows what that input is, and never with a bare `${}`: a
 * template literal throws on a Symbol, on an object whose `toString` throws and on one with no
 * prototype, and renders `10n` and `"10"` both as `10`.
 *
 * A string is JSON-quoted (`"3"`); an array is `an array of 2`; an object of a named class is that
 * class's name (`Date`) and any other object, a plain or null-prototype one included, is
 * `an object`; a bigint is `10n`; a function is `function name`, or `a function` if it has no
 * string name; anything else is `String(value)`.
 */
// The object branch names a **named** class because the wrong argument a consumer actually passes is
// `new Date()`, and "an object" would hide it. The `constructor?.name` reading was dropped once on
// the belief that `temporalTypeNameOf` already names a `Temporal.PlainDate` — true for `asPlainDate`,
// which consults it, and false for `asWesternDay` and `parse.ts`, which do not — so it is kept, and a
// plain object is still "an object" because "Object" says strictly less. It lives here because every
// caller is building a coded error.
export function describe(value: unknown): string {
	if (typeof value === "string") return JSON.stringify(value);
	if (value !== null && typeof value === "object") {
		// **This never throws and always returns a string**, because every guard renders its input
		// here: a throw, or a non-string for the caller's template to throw on, would be an uncoded
		// escape from all of them at once. An object can run code on every read — a revoked Proxy
		// throws from `Array.isArray` itself, a Proxy's `get` trap from `.constructor` — so the
		// object branch reads nothing outside the `try`.
		try {
			if (Array.isArray(value)) return `an array of ${value.length}`;
			// A **named** class is worth naming, and a plain object is not. `Temporal only. Never
			// Date.` is this package's first rule, so `new Date()` is the wrong argument a consumer
			// actually passes — and the first version of this merged function rendered it "an
			// object", hiding what they gave and then offering them a paragraph about
			// `{ year, month, day }`. "an object" stays for a plain one, where "Object" would say
			// strictly less and where the ambiguity note that follows it is the useful half of the
			// message. `typeof === "string"` rather than `!== undefined`: `{ constructor: { name:
			// Symbol() } }` otherwise returned the Symbol.
			const className: unknown = value.constructor?.name;
			return typeof className === "string" && className !== "" && className !== "Object"
				? className
				: "an object";
		} catch {
			return "an object";
		}
	}
	// `String` renders `10n` as "10", which is the ambiguity this function exists to avoid, and a
	// function as its whole source text.
	if (typeof value === "bigint") return `${value}n`;
	if (typeof value === "function") {
		// The same hazard as the object branch: `name` can be a throwing getter, a Symbol, or a read
		// through a Proxy trap, so it is read inside a `try` and used only if it is a string.
		try {
			const name: unknown = value.name;
			return typeof name === "string" && name !== "" ? `function ${name}` : "a function";
		} catch {
			return "a function";
		}
	}
	return String(value);
}

/**
 * Returns whether a value is a plain object — one whose prototype is `Object.prototype` or `null`,
 * the one shape that could be a bare `{ year, month, day }`.
 *
 * @remarks
 * Total: a value whose prototype cannot be read (a Proxy whose trap throws, a revoked one) is not
 * plain. The date guards append a paragraph explaining why a bare fields object is refused only when
 * this is true, so a class instance or an array is named by {@link describe} and nothing more.
 */
export function isPlainObject(value: unknown): boolean {
	if (value === null || typeof value !== "object") return false;
	// Total, like {@link describe}, because both guards call it while building a message they have
	// already decided to throw: a Proxy whose `getPrototypeOf` trap throws otherwise escaped uncoded
	// from eleven exports, found by review on 2026-09-24. Such a value is not a bare fields object.
	try {
		const prototype = Object.getPrototypeOf(value);
		return prototype === Object.prototype || prototype === null;
	} catch {
		return false;
	}
}

/**
 * Refuses any own enumerable string key of `value` that is not in `allowed`, naming it.
 *
 * @remarks
 * Beside `assertQueryOptions`, deliberately: that one guards a function's options bag, checks
 * inherited keys too and throws `TCT_INVALID_ARGUMENT`, while this guards objects inside a config,
 * checks own keys only and throws the config code its caller passes — `TCT_INVALID_OBSERVANCE_CONFIG`
 * or `TCT_INVALID_TRADITION_CONFIG` — so the two differ in code and subject.
 *
 * @throws A `RangeError` with `code`, naming the first key not in `allowed`.
 */
export function assertKnownKeys(
	value: object,
	allowed: readonly string[],
	subject: string,
	code: TibetanCalendarErrorCode,
): void {
	for (const key of Object.keys(value)) {
		if (!allowed.includes(key)) {
			throw rangeError(
				code,
				`${subject} has no key ${JSON.stringify(key)}; its keys are ${allowed.join(", ")}`,
			);
		}
	}
}

/**
 * Guards an options bag and returns a snapshot of its allowed keys.
 *
 * @remarks
 * Refuses a bag that is not an object, an array, or one that carries a key not in `allowed`.
 * `TCT_INVALID_ARGUMENT` rather than a config code: the bag is the wrong *kind* of thing, and no
 * config has been reached yet.
 *
 * - A key not in `allowed` is refused **whatever its value**, `undefined` included.
 * - **Inherited** enumerable keys are checked as well as own ones, because the call sites read
 *   `options.tradition`, which honours an inherited key. The walk stops at `Object.prototype`, whose
 *   keys belong to whatever library polluted it, not to the caller.
 * - **Symbol keys are ignored.**
 *
 * The result is a fresh plain object with one own property per entry of `allowed`, `undefined` where
 * the caller gave none, read once inside the guard. Call sites read it rather than the caller's
 * object, so a getter cannot answer differently twice. This applies to **bags only**: a
 * `TraditionConfig` and an `ObservanceConfig` refuse unknown keys through their own validators, with
 * their own codes.
 *
 * @param functionName - Named in the message.
 * @param allowed - The bag's key list; the shape shown to the caller is built from it.
 *
 * @throws A `TCT_INVALID_ARGUMENT` error if `options` is `null`, not an object, an array, cannot be
 * read (a Proxy whose trap throws, a revoked one, or a getter that throws), or carries an enumerable
 * string key not in `allowed`.
 */
// A bag is a new argument boundary and needs its own guard: without one `addMonthsToDate(f, 0, null)`
// reads a property off `null` and throws a raw uncoded `TypeError`, which is the failure the config
// validators exist to end: a consumer's `catch (e) { if (e.code === …) }` falls through it. Unknown keys are refused because every bag once ignored them, so
// `addMonthsToDate(f, 0, { config: BHUTAN })` answered Phugpa's date without a word; the fifth point of
// the tradition-parameter pattern, `docs/decisions/2026-09-24-how-a-tradition-is-passed.md`. An
// own-keys check would let `Object.create({ config: BHUTAN })` through, which is why inherited keys
// are walked. Symbol keys are ignored because nobody writes one by mistake and `Object.keys` does not
// list them.
export function assertQueryOptions<O extends object>(
	functionName: string,
	allowed: readonly (keyof O & string)[],
	options: unknown,
): Partial<O> {
	const shape = `{ ${allowed.join(", ")} }`;
	// `=== undefined`, never `??`, at the call sites that read this bag: nullish-coalescing would
	// read an explicit `{ tradition: null }` as absent and silently substitute a default, losing the
	// validation a positional parameter had.
	const notABag = () =>
		rangeError(
			"TCT_INVALID_ARGUMENT",
			`${functionName}: options must be an object like ${shape} or omitted, received ` +
				`${describe(options)}`,
		);
	if (options === null || typeof options !== "object") throw notABag();
	// Everything in the `try` can run a Proxy's traps or a getter — `Array.isArray` throws on a
	// revoked Proxy, the walk calls `ownKeys`, `getOwnPropertyDescriptor` and `getPrototypeOf`, and
	// the snapshot calls `get` — so a bag that cannot be read is refused with this guard's code
	// rather than escaping as the trap's own error. Nothing is thrown *inside* it, so an unreadable
	// bag and an array or unknown key are never mistaken for one another.
	let isArray = false;
	let unknownKey: string | undefined;
	const snapshot: Record<string, unknown> = {};
	try {
		// An array is an object, and it is exactly what a point-free `map` or `flatMap` passes as
		// the second or third argument, so it is refused by name rather than read as a bag of
		// defaults.
		isArray = Array.isArray(options);
		// The prototype chain is walked by hand rather than with `for…in`, to stop at
		// `Object.prototype`: a key some other library made enumerable there would otherwise make
		// every bag function throw, even one called with no options, since the default `{}`
		// inherits it.
		walk: for (
			let level: object | null = isArray ? null : options;
			level !== null && level !== Object.prototype;
			level = Object.getPrototypeOf(level)
		) {
			for (const key of Object.keys(level)) {
				if (!(allowed as readonly string[]).includes(key)) {
					unknownKey = key;
					break walk;
				}
			}
		}
		if (!isArray && unknownKey === undefined) {
			for (const key of allowed) snapshot[key] = (options as Record<string, unknown>)[key];
		}
	} catch (error) {
		throw rangeError(
			"TCT_INVALID_ARGUMENT",
			`${functionName}: options could not be read — reading it threw ${thrownDetail(error)}. ` +
				`options must be an object like ${shape} or omitted`,
			error,
		);
	}
	if (isArray) throw notABag();
	if (unknownKey !== undefined) {
		throw rangeError(
			"TCT_INVALID_ARGUMENT",
			`${functionName}: unknown option ${JSON.stringify(unknownKey)}. options is an object like ` +
				`${shape}; a key it does not have would otherwise be ignored silently`,
		);
	}
	// A fresh plain object carrying only the allowed keys, which is what the call sites read — so
	// they never touch the caller's object again, and a getter cannot answer differently twice.
	return snapshot as Partial<O>;
}

/**
 * Runs a guard's read of an object the caller built, refusing whatever the caller's own code throws
 * during it — a getter, or any trap of a Proxy, a revoked one included — with `code` and the caller's
 * error as `cause`.
 *
 * @remarks
 * The one home for the config validators' first pass, the only one that touches the caller's object:
 * everything after it reads a private copy. An error built by `rangeError` or `codedError` passes
 * through unchanged, with its own code, so a bad field is still reported as one; that is decided by
 * identity, because a `code` is a string a caller can forge. Anything else, a forged code included, is
 * the caller's and is wrapped.
 *
 * @param what - Names the object in the message.
 * @param read - The read to run; its result is returned.
 *
 * @throws The package's own error unchanged (its own code), or a `RangeError` carrying `code` that
 * wraps whatever else `read` threw.
 */
export function readingCallersObject<T>(
	code: TibetanCalendarErrorCode,
	what: string,
	read: () => T,
): T {
	try {
		return read();
	} catch (error) {
		// Identity, not the `code` property: a caller's own error can carry any string.
		if (typeof error === "object" && error !== null && ownErrors.has(error)) throw error;
		throw rangeError(
			code,
			`${what} could not be read — reading it threw ${thrownDetail(error)}. ${what} is plain ` +
				"data: pass an object whose fields can be read without running code",
			error,
		);
	}
}

/** What {@link validatedPrivateCopy} needs to know about one kind of config. */
export interface PrivateCopySpec<T extends object> {
	/** The private copies already made, keyed by the caller's object; a copy maps to itself. */
	readonly cache: WeakMap<T, T>;
	readonly code: TibetanCalendarErrorCode;
	/** Names the caller's object in the message of a refused read. */
	readonly what: string;
	/** Whether a value may be looked up at all; a `WeakMap` refuses a primitive as a key. */
	readonly isCandidate: (value: unknown) => boolean;
	/** Throws a coded error for a value that is not a valid config; runs on the caller's object, then on the copy. */
	readonly validate: (value: T) => void;
	/** The message for a config `structuredClone` refuses. Runs inside the guarded read. */
	readonly uncopyable: (value: T) => string;
}

/**
 * Validates a config once per object and returns the private, deeply frozen copy the engine reads.
 *
 * @remarks
 * The one home for the protocol both config validators follow. Every read of the caller's object —
 * the cache lookup, the first validation, the clone — is inside {@link readingCallersObject}. The
 * copy is validated again as a new object, since a getter, an inherited field or a non-enumerable one
 * answers differently once cloned, and the cache records it only after that: a refused config is never
 * cached, and a copy maps to itself so passing one back is a hit. A value `structuredClone` refuses
 * (a function or a Symbol in it) is refused with `spec.code` and the message `spec.uncopyable` gives.
 *
 * @throws A `RangeError` with `spec.code` for a config that fails validation, cannot be copied, or
 * cannot be read; an error built by `rangeError` or `codedError` inside `spec.validate` passes through
 * with its own code.
 */
// The lookup itself (`WeakMap.get`) runs no code of the caller's, but the caller-supplied
// `isCandidate` can, which is why it sits inside the guard too. Validation runs before the clone
// because `structuredClone` throws an uncoded `DataCloneError` on a function or a Symbol, which is
// recoded to the config's code.
export function validatedPrivateCopy<T extends object>(config: T, spec: PrivateCopySpec<T>): T {
	const { cache, code, what, isCandidate, validate, uncopyable } = spec;
	const hit = readingCallersObject(code, what, () =>
		isCandidate(config) ? cache.get(config) : undefined,
	);
	if (hit !== undefined) return hit;
	readingCallersObject(code, what, () => validate(config));
	const copy = deepFreeze(
		readingCallersObject(code, what, () => {
			try {
				return structuredClone(config);
			} catch (error) {
				if (error instanceof Error && error.name === "DataCloneError") {
					throw rangeError(code, uncopyable(config));
				}
				throw error;
			}
		}),
	);
	validate(copy);
	cache.set(config, copy);
	cache.set(copy, copy);
	return copy;
}

/**
 * Returns what a caller's code threw while a guard read their argument — a Proxy trap or a getter —
 * for a message: the class and its message, as `TypeError: "boom"`, or `describe` of a value that is
 * not an `Error`. Total, like {@link describe}.
 */
export function thrownDetail(error: unknown): string {
	try {
		if (error instanceof Error)
			return `${describe(error)}: ${JSON.stringify(String(error.message))}`;
	} catch {
		// A revoked Proxy thrown as the error makes `instanceof` itself throw; describe it instead.
	}
	return describe(error);
}

/**
 * Rejects a year that is not a safe integer.
 *
 * @remarks
 * One predicate covers fractions, `NaN`, `±Infinity`, 2⁵³ overflow and any value that is not a
 * number at all (`"5"`, `null`, `undefined`), all with the same code, `TCT_FIELD_OUT_OF_RANGE` by
 * default.
 *
 * It checks the number and nothing about the era: passing Gregorian 2026 where royal-era 2153 is
 * meant is a valid year to it.
 *
 * @param subject - Names the call in the message; a thunk is called only on the throw.
 * @param year - Typed `unknown` so a validator can hand it a value it has not yet type-checked.
 * @param suffix - Appended to the message.
 * @param code - The code the refusal carries; the observance validator passes
 * `TCT_INVALID_OBSERVANCE_CONFIG`.
 *
 * @throws A `RangeError` with `code` if `year` is not a safe integer.
 */
// One predicate rather than bounds checks alone, since `NaN` satisfies no comparison and would reach
// the arithmetic. No guard can catch the royal-era confusion: 2026 is a perfectly valid royal-era year
// (1899 CE), so the conversion returns a well-formed date 127 years away; that is a documentation
// problem, handled in the README. One copy lives here because the two copies that once existed had
// different docblocks, so each carried half the reasoning, and `suffix` is how `assertTibetanRanges`'
// `hint` reaches the year as well as the month and the day.
export function assertSafeYear(
	subject: string | (() => string),
	year: unknown,
	suffix = "",
	code: TibetanCalendarErrorCode = "TCT_FIELD_OUT_OF_RANGE",
): asserts year is number {
	if (!Number.isSafeInteger(year)) {
		throw rangeError(
			code,
			`${typeof subject === "string" ? subject : subject()}: year must be a safe integer, ` +
				`received ${describe(year)}${suffix}`,
		);
	}
}
