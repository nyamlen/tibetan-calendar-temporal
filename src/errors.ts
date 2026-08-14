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
 *   outside its permitted range; or the argument's shape or type is wrong even where numeric
 *   fields would be in range — a `Temporal.PlainDate`/`PlainDateTime`/`ZonedDateTime` passed where
 *   a Tibetan-date input is expected, a non-boolean `isLeapMonth`/`isLeapDay`, a bare
 *   `{ year, month, day }` object passed where a Western date is expected, or `null`/`undefined`/a
 *   non-object passed where a date-shaped input is expected. A data problem in the caller's input.
 * - `TCT_NO_SUCH_LEAP_MONTH` — `isLeapMonth` was set for a month that has no leap twin that year.
 * - `TCT_SKIPPED_DAY` — the date is well-formed but no calendar day carries its number. Not an
 *   input error; use `tibetanDateExists` to test first.
 * - `TCT_OUTSIDE_EXACT_RANGE` — the date or year lies beyond where this tradition's integer
 *   arithmetic stays exact. Thrown by conversions and by the closed-form year functions
 *   (`hasLeapMonth`, `leapMonthOfYear`, `monthsInYear`) alike. Deliberately distinct from
 *   `TCT_SKIPPED_DAY`: past the bound the day was never computed, so reporting it as non-existent
 *   would be a confident false claim.
 * - `TCT_INVALID_TRADITION_CONFIG` — a `TraditionConfig` is malformed.
 * - `TCT_INVALID_OBSERVANCE_CONFIG` — an `ObservanceConfig` or one of its rules is malformed.
 * - `TCT_SPAN_TOO_WIDE` — `getObservances` was asked for more than 200 years at once.
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
	| "TCT_NO_SUCH_LEAP_MONTH"
	| "TCT_SKIPPED_DAY"
	| "TCT_OUTSIDE_EXACT_RANGE"
	| "TCT_INVALID_TRADITION_CONFIG"
	| "TCT_INVALID_OBSERVANCE_CONFIG"
	| "TCT_SPAN_TOO_WIDE"
	| "TCT_MISSING_TEMPORAL"
	| "TCT_INTERNAL";

/** An error carrying a {@link TibetanCalendarErrorCode}. */
export type Coded<E extends Error> = E & { code: TibetanCalendarErrorCode };

/**
 * A `RangeError` carrying a code.
 *
 * @remarks
 * `RangeError` rather than a subclass so that existing `catch (e) { if (e instanceof RangeError) }`
 * keeps working — `tibetanDateExists` is one such caller, inside this package.
 */
export function rangeError(code: TibetanCalendarErrorCode, message: string): Coded<RangeError> {
	return Object.assign(new RangeError(message), { code });
}

/**
 * A plain `Error` carrying a code.
 *
 * @remarks
 * Used for failures that are **not** about the caller's input, which is why the type differs.
 * `tibetanDateExists` reports `false` for a `RangeError` and rethrows everything else, so an
 * internal invariant violation must not be a `RangeError` or the predicate would answer "that date
 * does not exist" when the truth is "the engine broke".
 */
export function codedError(code: TibetanCalendarErrorCode, message: string): Coded<Error> {
	return Object.assign(new Error(message), { code });
}

/**
 * Whether a caught value carries a particular code.
 *
 * @remarks
 * The narrowing a consumer would write, used internally by `tibetanDateExists` for the one case
 * where the error *type* is too coarse: a malformed `TraditionConfig` is a `RangeError`, like every
 * other input problem, but it is a broken program rather than a date that does not exist, so the
 * predicate must rethrow it rather than answer `false`.
 */
export function hasCode(error: unknown, code: TibetanCalendarErrorCode): boolean {
	return error instanceof Error && (error as Partial<Coded<Error>>).code === code;
}
