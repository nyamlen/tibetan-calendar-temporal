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
		if (!Number.isFinite(entry)) {
			throw invalid(
				config,
				`${path}[${index}] must be a finite number, received ${describe(entry)}`,
			);
		}
	}
}

function assertInteger(config: TraditionConfig, path: string, value: number | undefined): void {
	if (!Number.isSafeInteger(value)) {
		throw invalid(config, `${path} must be a safe integer, received ${describe(value)}`);
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

	for (const motion of MEAN_MOTIONS) {
		assertMeanMotion(config, motion, config[motion]);
	}

	assertTable(config, "moonTab", config.moonTab, MOON_TAB_LENGTH);
	assertTable(config, "sunTab", config.sunTab, SUN_TAB_LENGTH);

	validated.add(config);
}
