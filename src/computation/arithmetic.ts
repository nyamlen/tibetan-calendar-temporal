/**
 * Integer primitives from Janson §2.
 *
 * @remarks
 * Every quantity in the Phugpa computation is a rational with a denominator known in
 * advance, so the whole engine runs on exact integer arithmetic. Nothing here uses
 * floating point, and nothing here may start to.
 *
 * Janson warns twice (§2) that implementations break on negative operands. Both traps
 * are real in JavaScript: `%` is a remainder rather than a modulo, so `-7 % 3` is `-1`
 * where Janson's `mod` requires `2`; and truncating division is not floor division, so
 * `(-7 / 2) | 0` is `-3` where {@link floorDiv} gives `-4`. The month count and the
 * intercalation index both feed negative values through these operations for dates
 * before the epoch, where a sign error produces a plausible calendar that is wrong.
 *
 * Every guard here throws a `TCT_INTERNAL` plain `Error`: each is an invariant the engine proves for
 * itself. No function here checks
 * that an operand is an integer, and none checks that a result stays within the safe-integer range.
 *
 * @packageDocumentation
 */

import { codedError } from "../errors.js";

// Every `throw` here goes through `codedError` rather than a bare construction, so
// each carries the `code` a consumer branches on. Every guard here is an invariant this engine
// proves for itself, so each is a `TCT_INTERNAL` plain `Error` that `tibetanDateExists` must not
// swallow. That includes `scaleTo`'s: a config's denominators are refused before they reach it, by
// `assertMeanMotionExact` and `assertCommonDenominatorExact` from `deriveScaling`, and every
// `scaleTo` call divides by construction (onto an lcm that includes its source), so reaching one of
// its guards is an engine fault, not a malformed config.

/**
 * Floor division — the largest integer `q` with `q * divisor <= dividend`.
 *
 * @remarks
 * Exact for every pair of safe integers, although the division is a floating-point one.
 *
 * @param dividend - May be negative.
 * @param divisor - Must be non-zero.
 * @returns `⌊dividend / divisor⌋`, exact for all safe-integer inputs.
 * @throws Error with code `TCT_INTERNAL` if `divisor` is zero. Every divisor here is derived from
 * a tradition's constants, so a zero is a broken invariant rather than bad input.
 *
 * @example
 * ```ts
 * floorDiv(-7, 2); // -4, where truncation would give -3
 * ```
 */
export function floorDiv(dividend: number, divisor: number): number {
	// "Exact for all safe-integer inputs" is a real claim, not a hopeful one, even though
	// `Math.floor(a / b)` performs a floating-point divide first. For `|a| < 2⁵³` the exact quotient
	// `a/b` is at least `1/b` away from the next integer, while the half-ulp rounding error of the
	// divide is at most `a / (b · 2⁵³) < 1/b`. The error is therefore always smaller than the
	// distance to the boundary, so the divide can never round across one and the floor cannot land
	// on the wrong integer. This is why the module needs no `BigInt` and why the whole engine can
	// claim identical results across platforms.
	if (divisor === 0) throw codedError("TCT_INTERNAL", "floorDiv: divisor must be non-zero");
	return Math.floor(dividend / divisor);
}

/**
 * Ceiling division — the smallest integer `q` with `q * divisor >= dividend`.
 *
 * @remarks
 * Janson's month inversion (§5, "The inverse problem") is a **ceiling**: `x = ⌈(65n + β)/67⌉`.
 * This function exists so that the distinction from {@link floorDiv} is explicit at the call
 * site.
 *
 * @param dividend - May be negative.
 * @param divisor - Must be non-zero.
 * @throws Error with code `TCT_INTERNAL` if `divisor` is zero.
 *
 * @example
 * ```ts
 * ceilDiv(-7, 2); // -3
 * ```
 */
export function ceilDiv(dividend: number, divisor: number): number {
	// Text extracted from the PDF renders the ceiling in the month inversion as a floor, which
	// shifts the month by one at boundaries without ever throwing.
	if (divisor === 0) throw codedError("TCT_INTERNAL", "ceilDiv: divisor must be non-zero");
	return Math.ceil(dividend / divisor);
}

/**
 * Janson's `mod` (§2): the representative of `m` modulo `n` in `[0, n)`.
 *
 * @remarks
 * This is not JavaScript's `%`. For negative `m` the two disagree, and every use in this
 * package needs the non-negative result.
 *
 * @param m - May be of any sign.
 * @param n - Must be positive; Janson defines the operation only for `n > 0`.
 * @throws Error with code `TCT_INTERNAL` if `n` is zero or negative. A `NaN` modulus is not
 * refused and gives `NaN`.
 *
 * @example
 * ```ts
 * -7 % 3;      // -1
 * mod(-7, 3);  //  2
 * ```
 */
export function mod(m: number, n: number): number {
	if (n <= 0) throw codedError("TCT_INTERNAL", "mod: modulus must be positive");
	return ((m % n) + n) % n;
}

/**
 * Janson's `amod` (§2): the representative of `m` modulo `n` in `(0, n]`.
 *
 * @remarks
 * Identical to {@link mod} except when `n` divides `m`, where `mod` gives `0` and this
 * gives `n`. That case is not an edge case here — it is month 12 and the 60th year of a
 * rabjung cycle, both of which occur constantly.
 *
 * @param n - Must be positive.
 * @throws Error with code `TCT_INTERNAL` if `n` is not positive.
 */
export function amod(m: number, n: number): number {
	return 1 + mod(m - 1, n);
}

/**
 * Greatest common divisor, by the Euclidean algorithm. Operands are treated as magnitudes.
 */
export function gcd(a: number, b: number): number {
	let x = Math.abs(a);
	let y = Math.abs(b);
	while (y !== 0) [x, y] = [y, x % y];
	return x;
}

/**
 * Least common multiple.
 *
 * @remarks
 * Divides before multiplying so that the intermediate stays as small as possible — this
 * is used to derive scaling denominators in the 10⁹ range, where `a * b` would be near
 * the safe-integer limit before the reduction.
 *
 * @returns The non-negative least common multiple, or `0` if either operand is `0`.
 */
export function lcm(a: number, b: number): number {
	if (a === 0 || b === 0) return 0;
	return Math.abs((a / gcd(a, b)) * b);
}

/**
 * Re-expresses the rational `num / den` as an integer numerator over `commonDenominator`.
 *
 * @remarks
 * This is the whole of the scaled-integer strategy: rather than a general rational type
 * with per-operation gcd normalisation, every quantity is lifted onto one denominator
 * once, after which addition and subtraction are plain integer operations.
 *
 * The common denominator is **derived from the tradition's own constants** via {@link lcm}, never
 * hardcoded: `PHUGPA`'s and `BHUTAN`'s is 102,317,040 and the Henning pair's is 1,534,755,600.
 * The result is not checked to be a safe integer.
 *
 * @param num - Numerator of the source rational; may be negative.
 * @param den - Denominator of the source rational; must be positive and must divide
 * `commonDenominator`.
 * @param commonDenominator - The scaling denominator, typically derived per tradition.
 * @throws Error with code `TCT_INTERNAL` if `den` is not positive, or does not divide
 * `commonDenominator`, which would make the result inexact. Neither is reachable from a validated
 * config.
 *
 * @example
 * ```ts
 * scaleTo(1, 2, 12); // 6, i.e. 1/2 expressed as 6/12
 * ```
 */
export function scaleTo(num: number, den: number, commonDenominator: number): number {
	// A constant baked in here would make a further tradition unrepresentable, and silently. The
	// guards are internal: see the comment at the top of this module.
	if (den <= 0) {
		throw codedError("TCT_INTERNAL", `scaleTo: denominator must be positive, received ${den}`);
	}
	if (commonDenominator % den !== 0) {
		throw codedError(
			"TCT_INTERNAL",
			`scaleTo: ${den} does not divide ${commonDenominator}; the result would be inexact`,
		);
	}
	return num * (commonDenominator / den);
}
