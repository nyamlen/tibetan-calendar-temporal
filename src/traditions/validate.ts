/**
 * Shape validation for a consumer-supplied {@link TraditionConfig}.
 *
 * @remarks
 * `TraditionConfig` is the documented extension point — the README, `docs/architecture.md` and the
 * type comments all push a reader toward `{ ...PHUGPA, lunarAnomaly: … }` for Tsurphu — and until
 * now nothing checked it. A missing field surfaced as `Cannot read properties of undefined
 * (reading 'den')` from inside `scaleMeanMotion`, which names neither the field nor the config,
 * and a `moonTab` of the wrong length reached an interpolation that indexes past its end.
 *
 * `docs/decisions/2026-08-12-input-validation-boundary.md` already requires this: every exported
 * function validates "integrality, range, **and config shape**". This closes that gap rather than
 * deciding anything new.
 *
 * Where it runs is the same bargain `validateObservanceConfig` strikes — once per config **object**,
 * memoised on a `WeakSet`, at the boundary and never on the hot path. `scalingFor` is the single
 * choke point: every public function derives its scaling through it, and the derivation is already
 * memoised per object, so the validation rides along at no additional lookup.
 *
 * @packageDocumentation
 */

import { rangeError } from "../errors.js";
import type { MeanMotion, Rational, TraditionConfig } from "./types.js";

/** `moonTab` covers arguments 0…7; `sunTab` covers 0…3. Janson §7. */
const MOON_TAB_LENGTH = 8;
const SUN_TAB_LENGTH = 4;

/** The three mean motions, by the field name a message should quote back. */
const MEAN_MOTIONS = ["meanDate", "meanSun", "lunarAnomaly"] as const;

/** The three coefficients each mean motion carries — Janson's `x₁`, `x₂`, `x₀`. */
const COEFFICIENTS = ["perMonth", "perDay", "atEpoch"] as const;

function invalid(config: TraditionConfig, detail: string): Error {
	const id = typeof config?.id === "string" ? `"${config.id}"` : "<unnamed>";
	return rangeError(
		"TCT_INVALID_TRADITION_CONFIG",
		`TraditionConfig ${id} is malformed: ${detail}. A tradition is built by spreading a shipped ` +
			"config and replacing whole fields — `{ ...PHUGPA, lunarAnomaly: { ... } }` — never by " +
			"supplying a partial one; see docs/architecture.md on adding a tradition",
	);
}

/** A rational must be two numbers with a positive denominator, or the scaling silently degrades. */
function assertRational(config: TraditionConfig, path: string, value: Rational | undefined): void {
	if (value === null || typeof value !== "object") {
		throw invalid(config, `${path} must be a { num, den } object, received ${describe(value)}`);
	}
	if (!Number.isSafeInteger(value.num)) {
		throw invalid(config, `${path}.num must be a safe integer, received ${describe(value.num)}`);
	}
	if (!Number.isSafeInteger(value.den) || value.den <= 0) {
		throw invalid(
			config,
			`${path}.den must be a positive safe integer, received ${describe(value.den)}`,
		);
	}
}

function assertMeanMotion(
	config: TraditionConfig,
	path: string,
	value: MeanMotion | undefined,
): void {
	if (value === null || typeof value !== "object") {
		throw invalid(
			config,
			`${path} must be a { perMonth, perDay, atEpoch } object, received ${describe(value)}`,
		);
	}
	for (const coefficient of COEFFICIENTS) {
		assertRational(config, `${path}.${coefficient}`, value[coefficient]);
	}
}

/**
 * A correction table must have exactly its documented length and hold only integers.
 *
 * @remarks
 * Length is not incidental. `moonTabAt` extends the table by the symmetries `tab(14 − i) = tab(i)`
 * and `tab(14 + i) = −tab(i)`, which are only meaningful for eight entries; a shorter table
 * interpolates against `undefined` and yields `NaN`, and `NaN` propagates into a date rather than
 * failing. The two `throw`s guarding this inside `corrections.ts` are the last line of defence and
 * become genuinely unreachable once this runs.
 */
function assertTable(
	config: TraditionConfig,
	path: string,
	value: readonly number[] | undefined,
	length: number,
): void {
	if (!Array.isArray(value)) {
		throw invalid(
			config,
			`${path} must be an array of ${length} numbers, received ${describe(value)}`,
		);
	}
	if (value.length !== length) {
		throw invalid(config, `${path} must have exactly ${length} entries, received ${value.length}`);
	}
	for (const [index, entry] of value.entries()) {
		// Safe integer, not merely finite. A fractional entry computes without complaint — the final
		// floorDiv launders the result back to an integer Julian day — so it produces a plausible
		// calendar rather than a failure, which is exactly the error class this project is built to
		// exclude. "No floating point anywhere" is a stated non-negotiable, and these are the values
		// that feed the interpolation. Every other numeric field here already uses this check.
		if (!Number.isSafeInteger(entry)) {
			throw invalid(
				config,
				`${path}[${index}] must be a safe integer, received ${describe(entry)}`,
			);
		}
	}
}

function assertInteger(config: TraditionConfig, path: string, value: number | undefined): void {
	if (!Number.isSafeInteger(value)) {
		throw invalid(config, `${path} must be a safe integer, received ${describe(value)}`);
	}
}

/**
 * The leap-month rule matches an intercalation index of `threshold` **or `threshold + 1`**, and the
 * index is `mod 65`, so both must be attainable: 64 would leave the second value unreachable and
 * halve the leap months — a calendar that runs, and is wrong. The rule does not wrap; Janson writes
 * Tsurphu's as 0-or-1, never as 64-or-0.
 *
 * Checked separately from {@link assertInteger} rather than folded into it, because `undefined` and
 * an out-of-range number are different mistakes and deserve different messages. A missing field is
 * the likelier of the two, since this is the newest member of the interface.
 */
function assertLeapIndexThreshold(config: TraditionConfig): void {
	const value = config.leapIndexThreshold;
	if (!Number.isSafeInteger(value) || value < 0 || value > 63) {
		throw invalid(
			config,
			`leapIndexThreshold must be an integer in 0…63, received ${describe(value)}. ` +
				"Janson gives 48 for Phugpa, 0 for Tsurphu, 46 for the Mongolian version and 57 for " +
				"the Bhutanese; there is no default because 48 would silently give Phugpa's leap " +
				"months to another tradition",
		);
	}
}

/**
 * `naming` is optional, so absence is fine — but a present-and-wrong value is not.
 *
 * @remarks
 * The asymmetry matters. A required field is checked for absence because `undefined` is the likelier
 * mistake; an optional one is checked for *shape*, because a consumer who supplied it meant
 * something by it and a silently ignored typo is worse than a throw.
 */
function assertNaming(config: TraditionConfig): void {
	const naming = config.naming;
	if (naming === undefined) return;
	if (typeof naming !== "object" || naming === null) {
		throw invalid(config, `naming must be an object when present, received ${describe(naming)}`);
	}
	const offset = naming.weekdayOffset;
	if (!Number.isSafeInteger(offset) || offset < 0 || offset > 6) {
		throw invalid(
			config,
			`naming.weekdayOffset must be an integer in 0…6, received ${describe(offset)}. ` +
				"It is 0 for every Tibetan version and 1 for Bhutan",
		);
	}
}

function assertNonEmptyString(config: TraditionConfig, path: string, value: string | undefined) {
	if (typeof value !== "string" || value === "") {
		throw invalid(config, `${path} must be a non-empty string, received ${describe(value)}`);
	}
}

/** A value rendered short enough for a message, and unambiguously — `"3"` is not `3`. */
function describe(value: unknown): string {
	if (typeof value === "string") return JSON.stringify(value);
	if (Array.isArray(value)) return `an array of ${value.length}`;
	if (value !== null && typeof value === "object") return "an object";
	return String(value);
}

/** Configs already checked, keyed by object — the pattern `validatedConfigs` uses for observances. */
const validated = new WeakSet<TraditionConfig>();

/**
 * Rejects a `TraditionConfig` whose shape the arithmetic cannot work with.
 *
 * @remarks
 * Idempotent and memoised per object. A consumer who mutates a config in place after first use
 * escapes revalidation; that is the same accepted bargain the scaling cache and the observance
 * validator already make, and it is what keeps the check off the hot path.
 *
 * The bargain covers **consumer-supplied** configs only. `PHUGPA` and `PHUGPA_HENNING` are deeply
 * frozen, so the objects a reader is most likely to mutate — they are the ones the docs point at
 * for `{ ...PHUGPA, … }` — cannot reach the stale-cache state at all.
 *
 * This validates **shape, not astronomy**. A config with plausible types and wrong constants passes
 * here and produces a wrong calendar — nothing but a fixture can catch that, which is what
 * `docs/testing.md` is about.
 *
 * @throws RangeError with code `TCT_INVALID_TRADITION_CONFIG`, naming the offending field path.
 */
export function assertTraditionConfig(config: TraditionConfig): void {
	if (validated.has(config)) return;

	if (config === null || typeof config !== "object") {
		throw rangeError(
			"TCT_INVALID_TRADITION_CONFIG",
			`TraditionConfig must be an object, received ${describe(config)}. Pass PHUGPA, ` +
				"PHUGPA_HENNING, or a config spread from one of them",
		);
	}

	assertNonEmptyString(config, "id", config.id);
	assertNonEmptyString(config, "name", config.name);
	assertInteger(config, "epochYear", config.epochYear);
	assertInteger(config, "epochMonth", config.epochMonth);
	assertInteger(config, "intercalationIndexAtEpoch", config.intercalationIndexAtEpoch);
	assertLeapIndexThreshold(config);
	assertNaming(config);

	for (const motion of MEAN_MOTIONS) {
		assertMeanMotion(config, motion, config[motion]);
	}

	assertTable(config, "moonTab", config.moonTab, MOON_TAB_LENGTH);
	assertTable(config, "sunTab", config.sunTab, SUN_TAB_LENGTH);

	validated.add(config);
}

/**
 * The checks that need derived quantities rather than the raw config.
 *
 * @remarks
 * Split from {@link assertTraditionConfig} because these values do not exist until `deriveScaling`
 * has computed them, not because they are any less part of validating a config — both throw the
 * same code, and both are reached through the same `scalingFor` choke point.
 *
 * Called from the **middle** of `deriveScaling`, after the mean motions are scaled and before
 * `quarterCircle` is formed. The order is load-bearing: `scaleTo(1, 4, meanSun.den)` carries the
 * same code, so putting this after it would leave the check unreachable and hand the consumer a
 * message naming two integers instead of the field to fix.
 *
 * @throws RangeError with code `TCT_INVALID_TRADITION_CONFIG`.
 */
export function assertDerivable(
	config: TraditionConfig,
	meanSunDen: number,
	searchHalfWidth: number,
): void {
	// A general bound on the search window, deliberately not a bound on the tables themselves.
	// `|moonTab| ≤ 25` would hardcode Phugpa's magnitudes into a field the non-negotiables declare
	// injectable, and would have to decide "is this Phugpa" from a consumer-settable `id`. What is
	// genuinely universal is that a tradition whose corrections push the true date a whole month
	// off the mean is not a lunisolar calendar at all. This bounds the work a pathological table
	// can cause without ruling on which traditions are astronomically legitimate.
	if (searchHalfWidth > MAX_SEARCH_HALF_WIDTH) {
		throw invalid(
			config,
			`the correction tables imply a search window of ±${searchHalfWidth} lunar days, ` +
				`beyond the ±${MAX_SEARCH_HALF_WIDTH} this engine will search. moonTab and sunTab are ` +
				"equations in sixtieths of a day; entries this large describe no lunisolar calendar",
		);
	}

	// `deriveScaling` forms the solar anomaly as `mean_sun − 1/4`, so 4 must divide the *derived*
	// mean-sun denominator — the lcm of the three coefficient denominators, not any one of them —
	// or `scaleTo(1, 4, meanSun.den)` cannot represent the quarter exactly. It holds for every
	// tradition Janson gives and went unchecked, so a config that failed it threw from three frames
	// down with no code at all, and `tibetanDateExists` read that as "the date does not exist".
	if (meanSunDen % 4 !== 0) {
		throw invalid(
			config,
			`the derived meanSun denominator ${meanSunDen} is not divisible by 4. The solar ` +
				"anomaly is mean_sun − 1/4, so a denominator that cannot express a quarter exactly " +
				"makes the derivation inexact; it is the lcm of meanSun's three coefficient " +
				"denominators, so it is one of those that needs the factor of 4",
		);
	}
}

/**
 * The widest search window this engine will accept from a tradition's correction tables.
 *
 * @remarks
 * A full lunar month. Phugpa derives 3; anything approaching a month describes no lunisolar
 * calendar and is a typo in a table.
 */
const MAX_SEARCH_HALF_WIDTH = 30;
