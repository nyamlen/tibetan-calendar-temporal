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
 * - `TCT_SPAN_TOO_WIDE` — `getObservances` was asked for more than 200 years at once.
 * - `TCT_ATTRIBUTE_NOT_SOURCED` — an astrological attribute was asked for in a tradition no source
 *   gives it for. Thrown by the month and lunar-day attributes for the Bhutanese configs, because
 *   Janson tabulates no month-animal list for that version. **Nothing about the caller's input is
 *   wrong** — it is `TCT_INVALID_ARGUMENT`'s neighbour rather than `TCT_FIELD_OUT_OF_RANGE`'s — and
 *   it is deliberately **not** on `tibetanDateExists`'s allowlist: a Bhutanese date exists perfectly
 *   well, only an attribute of it is unsourced.
 * - `TCT_MISSING_TEMPORAL` — the runtime has no `Temporal`. Thrown at **import** time.
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
export function rangeError(code: TibetanCalendarErrorCode, message: string): Coded<RangeError> {
	return Object.assign(new RangeError(message), { code });
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
 * Lives here because every caller is building a coded error, and because it existed **twice**,
 * character-identical, in `traditions/validate.ts` and `observances/index.ts` until 2026-09-23.
 * Both copies were written by whoever needed a value rendered next to a `rangeError`, which is
 * this module — so this is where the one copy belongs.
 *
 * **Three near-siblings remain, deliberately not merged here yet**: `describeValue` in
 * `computation/conversion.ts`, `describeFlagValue` in `types.ts`, and another `describe` in
 * `parse.ts`. Their bodies differ, so merging them changes error message text, which is a
 * behaviour change with its own tests to update rather than the mechanical move this was. They
 * converge as part of the boundary consolidation; this note is here so the next person to add a
 * fourth finds the debt instead of the pattern.
 */
export function describe(value: unknown): string {
	if (typeof value === "string") return JSON.stringify(value);
	if (Array.isArray(value)) return `an array of ${value.length}`;
	if (value !== null && typeof value === "object") return "an object";
	return String(value);
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
 */
export function assertSafeYear(subject: string, year: number): void {
	if (!Number.isSafeInteger(year)) {
		throw rangeError(
			"TCT_FIELD_OUT_OF_RANGE",
			`${subject}: year must be a safe integer, received ${year}`,
		);
	}
}
