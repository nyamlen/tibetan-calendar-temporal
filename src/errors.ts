/**
 * Machine-readable codes carried by every error this package throws.
 *
 * @remarks
 * The convention is Node's own: a built-in error type carrying a stable `code`, rather than a
 * hierarchy of exported error classes. `fs` does not export an `ENOENTError`; it throws with
 * `code: "ENOENT"`. The reasoning is recorded in
 * `docs/decisions/2026-08-12-error-codes-not-classes.md`.
 *
 * `SkippedDayError` is the one exception, and predates this: it is a class because a caller
 * genuinely branches on it at runtime — "that day does not exist, offer the neighbour" is a
 * different response from "your input is malformed". It carries a code too, so a caller can
 * discriminate uniformly without mixing `instanceof` and property tests.
 *
 * @packageDocumentation
 */

/**
 * Every code this package attaches to a thrown error.
 *
 * @remarks
 * Part of the public contract: a code is never removed or repurposed, and every code is asserted
 * in `test/public-api.test.ts`. Message *text* carries no such promise — match on the code, never
 * on the wording.
 *
 * - `TCT_FIELD_OUT_OF_RANGE` — a year, month, day or Julian day is not an integer, or falls
 *   outside its permitted range. The argument was the right *kind* of thing and one of its numbers
 *   was wrong. An absent required field counts, since `undefined` is not an integer, and so does a
 *   non-number where a number belongs: the check is "is this a safe integer", and splitting inside
 *   it would buy a distinction no caller acts on.
 * - `TCT_INVALID_ARGUMENT` — the argument is the wrong *kind of thing*, so no field of it is out of
 *   any range: a `Temporal.PlainDate`/`PlainDateTime`/`ZonedDateTime` passed where a Tibetan-date
 *   input is expected, a bare `{ year, month, day }` object passed where a Western date is expected,
 *   a non-boolean `isLeapMonth`/`isLeapDay`, `null`/`undefined`/a non-object where a date-shaped
 *   input is expected, or a string that is not in the grammar `parseTibetanDate` accepts.
 *
 *   These two used to share `TCT_FIELD_OUT_OF_RANGE`, which named neither a field nor a range for
 *   half its sites. The split is not cosmetic: it is what lets `tibetanDateExists` allowlist the
 *   range code — "that date does not exist" — while a caller who passed a `PlainDate` gets a throw
 *   rather than a `false` they will read as a calendrical fact. See
 *   `docs/decisions/2026-08-15-argument-errors-split.md`.
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
 * - `TCT_SPAN_TOO_WIDE` — `getObservances` was asked for more than 10 years at once.
 * - `TCT_ATTRIBUTE_NOT_SOURCED` — an astrological attribute was asked for in a tradition no source
 *   gives it for. Thrown by the month and lunar-day attributes for the Bhutanese configs, because
 *   Janson tabulates no month-animal list for that version. **Nothing about the caller's input is
 *   wrong** — it is `TCT_INVALID_ARGUMENT`'s neighbour rather than `TCT_FIELD_OUT_OF_RANGE`'s — and
 *   it is deliberately **not** on `tibetanDateExists`'s allowlist: a Bhutanese date exists perfectly
 *   well, only an attribute of it is unsourced.
 * - `TCT_MISSING_TEMPORAL` — the runtime has no `Temporal`. Normally thrown at **import** time,
 *   by the guard in `computation/conversion.ts`. Also thrown at **call** time, by
 *   `temporal-kind.ts`, in the one case the import guard cannot cover: a global deleted after
 *   this package was imported. Both are plain `Error`s, not `RangeError`s.
 * - `TCT_INTERNAL` — an invariant this engine proves for itself did not hold. A bug here rather
 *   than a problem with the caller's input; please report it.
 *
 * That last claim is only true because the boundary keeps it true, and it has been false once. The
 * ±3 search window in `isoToTibetan` was proved from Phugpa's correction tables but the tables are
 * injected, so a consumer's config could break the window and be told the engine was broken and
 * asked to open an issue. The window is now derived per tradition and a config that could not
 * satisfy it is rejected as `TCT_INVALID_TRADITION_CONFIG` instead. Before adding a `TCT_INTERNAL`,
 * check that no consumer-supplied value can reach it.
 */
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
 * A `RangeError` carrying a code.
 *
 * @remarks
 * `RangeError` rather than a subclass so that a consumer's existing
 * `catch (e) { if (e instanceof RangeError) }` keeps working. No caller **inside** this package
 * narrows that way any longer: `tibetanDateExists` swallows by allowlist — one class and two codes,
 * `SkippedDayError` plus `TCT_FIELD_OUT_OF_RANGE` and `TCT_NO_SUCH_LEAP_MONTH`. It was such a
 * caller under the denylist era, which is where this remark's example came from.
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
	return Object.assign(error, { code });
}

/**
 * A plain `Error` carrying a code.
 *
 * @remarks
 * Used for failures that are **not** about the caller's input, which is why the type differs.
 *
 * The reason is the *signal*, not the mechanism, and this remark used to give the mechanism and get
 * it wrong. What keeps an internal invariant violation out of `tibetanDateExists`'s `false` is that
 * `TCT_INTERNAL` is absent from that predicate's allowlist — one class and two codes,
 * `SkippedDayError` plus `TCT_FIELD_OUT_OF_RANGE` and `TCT_NO_SUCH_LEAP_MONTH` — and not that it is
 * a plain `Error`. The predicate has never reported `false` for every `RangeError` since the
 * allowlist landed, and `SkippedDayError` is not a `RangeError` at all yet answers `false`.
 *
 * The type earns its place one level out, for consumers: a code is contract and a class is not, but
 * a plain `Error` where every input problem is a `RangeError` says at a glance that this one is the
 * engine's fault rather than theirs.
 */
export function codedError(code: TibetanCalendarErrorCode, message: string): Coded<Error> {
	return Object.assign(new Error(message), { code });
}

/**
 * Narrows a value this engine has already proved cannot be absent.
 *
 * @remarks
 * `noUncheckedIndexedAccess` widens every array index to `T | undefined`, including the ones a
 * preceding `amod` or `%` has forced into range. There are two ways to discharge that, and only
 * one of them is safe: a cast asserts the claim and a bad index then returns `undefined` wearing
 * the element type, propagating silently into a name or a date; this throws, and the code says the
 * fault is the engine's rather than the caller's.
 *
 * Both idioms were in use — a throw in `epoch.ts`, a cast in `names.ts` — for the same constraint.
 * This is the one to use. Reach for it only where the index is provably in range and say why at the
 * call site; where it is *not* provable, the caller's input is involved and the error belongs to
 * them, so `rangeError` is the right throw.
 *
 * @throws A `TCT_INTERNAL` error if the value is absent, which means this engine has a bug.
 */
export function assertInternal<T>(value: T | undefined, invariant: string): T {
	/* c8 ignore next */
	if (value === undefined) throw codedError("TCT_INTERNAL", `${invariant} — please report this.`);
	return value;
}

/**
 * Whether a caught value carries a particular code.
 *
 * @remarks
 * The narrowing a consumer would write, and what `tibetanDateExists` uses to match the **two codes**
 * on its allowlist, `TCT_FIELD_OUT_OF_RANGE` and `TCT_NO_SUCH_LEAP_MONTH`. The third member of that
 * allowlist, `SkippedDayError`, is matched by class and does not come through here.
 *
 * The error *type* is too coarse to do that job: a malformed `TraditionConfig` is a `RangeError`
 * like every other input problem, but it is a broken program rather than a date that does not
 * exist. It is rethrown by **omission** — nothing on the allowlist matches it, so it falls through
 * to `throw error` — and never reaches this function. An earlier version of this remark named that
 * rethrow as the one case this function serves, which was the inverse of the truth.
 */
export function hasCode(error: unknown, code: TibetanCalendarErrorCode): boolean {
	return error instanceof Error && (error as Partial<Coded<Error>>).code === code;
}

/**
 * A value rendered short enough for a message, and unambiguously — `"3"` is not `3`.
 *
 * @remarks
 * **Never throws, and always returns a string**, whatever it is handed — which is why a guard may
 * render its raw input here before it knows what that input is, and never with a bare `${}`: a
 * template literal throws on a Symbol, on an object whose `toString` throws and on one with no
 * prototype, and renders `10n` and `"10"` both as `10`. Until 2026-09-24 fourteen sites did exactly
 * that, and the escape was an uncoded `TypeError` from the guard meant to report the problem.
 *
 * Lives here because every caller is building a coded error, and because it existed **twice**,
 * character-identical, in `traditions/validate.ts` and `observances/index.ts` until 2026-09-23.
 * Both copies were written by whoever needed a value rendered next to a `rangeError`, which is
 * this module — so this is where the one copy belongs.
 *
 * **The three near-siblings converged here on 2026-09-23**: `describeValue` in
 * `computation/conversion.ts`, `describeFlagValue` in `types.ts` and another `describe` in
 * `parse.ts`. Merging them changed message text, which is why it waited for the boundary
 * consolidation rather than riding along with the mechanical move. The union body is this one and
 * not `describeValue`'s: its `constructor?.name` branch existed to name a `Temporal.PlainDate`,
 * and `temporalTypeNameOf` now does that from the brand. **That justification held only for
 * `asPlainDate`**, which consults `temporalTypeNameOf`; `asWesternDay` and `parse.ts` never do, so
 * for them the branch was doing a second job — naming a `Date` — that the merge briefly lost. It is
 * back, narrowed: a plain object is still "an object", because "Object" says strictly less.
 * `format.ts` kept a `describe` of its own, listing an object's keys, until 2026-09-24, when its
 * field check moved to `assertTibetanRanges` in `types.ts` and the message began echoing the fields
 * instead.
 */
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
 * Whether a value is a plain object — the one shape that could be a bare `{ year, month, day }`.
 *
 * @remarks
 * The two date guards append a paragraph explaining why such an object is refused, and until
 * 2026-09-24 they appended it for anything `typeof "object"`: `nextFullMoon(new Date())` and an
 * array were both told about fields they had not passed. A class instance or an array is not
 * ambiguous between calendars, so it is named by {@link describe} and nothing more.
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
 * Refuses any own key of `value` that is not in `allowed`, naming it.
 *
 * @remarks
 * Beside `assertQueryOptions`, deliberately: that one guards a function's options bag and throws
 * `TCT_INVALID_ARGUMENT`, while this guards objects inside a config and throws the config code its
 * caller passes — `TCT_INVALID_OBSERVANCE_CONFIG` or `TCT_INVALID_TRADITION_CONFIG` — so the two
 * differ in code and subject.
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
 * Rejects an options bag that is not an object, or that carries a key the bag does not have.
 *
 * @remarks
 * New boundary, new guard — CLAUDE.md requires one per exported argument shape, and reshaping
 * `getObservances`/`observancesOn` to a bag on 2026-08-26 created one. Without it
 * `observancesOn(date, null)` reads `.config` off `null` and throws a raw uncoded `TypeError`,
 * which is the exact failure the config validators were added to end: a consumer's
 * `catch (e) { if (e.code === …) }` falls through it.
 *
 * `TCT_INVALID_ARGUMENT` rather than a config code: the bag is the wrong *kind* of thing, and no
 * config has been reached yet. A bag carrying a bad `config` still gets the config code, from the
 * validator that has always owned it.
 *
 * **Unknown keys are refused since 2026-09-24**, the fifth point of the tradition-parameter pattern
 * (`docs/decisions/2026-09-24-how-a-tradition-is-passed.md`). Every bag used to ignore them, so
 * `addMonthsToDate(f, 0, { tradition: BHUTAN })` — `tradition` then being a key that bag lacked —
 * answered Phugpa's date without a word. Three choices here are deliberate:
 *
 * - A key is refused **whatever its value**, `undefined` included: `{ config: undefined }` is still
 *   a caller writing a key that does nothing.
 * - **Inherited** enumerable keys are checked as well as own ones, because the call sites read
 *   `options.tradition`, which honours an inherited key. An own-keys check would let
 *   `Object.create({ config: BHUTAN })` through after a rename. The walk stops at
 *   `Object.prototype`, whose keys belong to whatever library polluted it, not to the caller.
 * - **Symbol keys are ignored.** Nobody writes one by mistake, and `Object.keys` does not list them.
 *
 * This applies to **bags only**. A `TraditionConfig` and an `ObservanceConfig` refuse unknown keys
 * through their own validators, with their own codes, for the same reason.
 *
 * `allowed` is the bag's key list, and the shape shown to the caller is **built from it** — until
 * 2026-09-24 each call site passed a hand-written shape string, which could name a key the bag no
 * longer had.
 *
 * **It returns a snapshot of the allowed keys**, read inside the same guard, and the call sites read
 * that rather than the caller's object — so a Proxy trap or a getter that throws is refused here with
 * a code, where before a `get` trap passed the walk and escaped at the call site's read.
 *
 * @throws A `TCT_INVALID_ARGUMENT` error if `options` is `null`, not an object, an array, cannot be
 * read (a Proxy whose trap throws, a revoked one, or a getter that throws), or carries an enumerable
 * string key not in `allowed`.
 */
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
 * everything after it reads a private copy. The guard's own refusals carry `code` already and pass
 * through unchanged, so a bad field is still reported as one. `what` names the object in the message.
 * A thrown value that cannot even be inspected is treated as the caller's, since a Proxy thrown as
 * the error makes `instanceof` itself throw.
 *
 * @throws An error with `code` — the guard's own, or one wrapping the caller's.
 */
export function readingCallersObject<T>(
	code: TibetanCalendarErrorCode,
	what: string,
	read: () => T,
): T {
	try {
		return read();
	} catch (error) {
		let own = false;
		try {
			own = hasCode(error, code);
		} catch {
			// Not inspectable, so not ours.
		}
		if (own) throw error;
		throw rangeError(
			code,
			`${what} could not be read — reading it threw ${thrownDetail(error)}. ${what} is plain ` +
				"data: pass an object whose fields can be read without running code",
			error,
		);
	}
}

/**
 * What a caller's code threw while a guard read their argument — a Proxy trap or a getter — for a
 * message: the class and its message. Total, like {@link describe}, because it runs inside the
 * `catch` that exists to stop such a throw escaping.
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
 * One predicate covers fractions, `NaN`, `±Infinity` and 2⁵³ overflow — the bounds checks alone
 * cannot, since `NaN` satisfies no comparison and would reach the arithmetic.
 *
 * This does **not** catch the royal-era confusion — passing Gregorian 2026 where royal-era 2153 is
 * meant. 2026 is a perfectly valid royal-era year (1899 CE), so no guard can distinguish the two,
 * and the conversion returns a well-formed date 127 years away. That is a documentation problem,
 * handled in the README, not something an error message can reach.
 *
 * Also existed twice, character-identical, in `months.ts` and `computation/conversion.ts` until
 * 2026-09-23 — with *different* docblocks, so each copy carried half the reasoning above. That is
 * the quieter cost of a duplicate: not the repeated code, but the knowledge that ends up in only
 * one of the two places a reader might look.
 *
 * `subject` may be a thunk, so a caller whose subject echoes the whole call builds it only on the
 * throw; `suffix` is appended to the message, which is how `assertTibetanRanges`' `hint` reaches the
 * year as well as the month and the day.
 *
 * `code` is the code the refusal carries, `TCT_FIELD_OUT_OF_RANGE` unless the subject is a config
 * field: the observance validator passes `TCT_INVALID_OBSERVANCE_CONFIG`, so a bad year window is a
 * config problem like every other one there, without a second copy of this predicate. `year` is
 * `unknown` so a validator can hand it a value it has not yet type-checked.
 */
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
