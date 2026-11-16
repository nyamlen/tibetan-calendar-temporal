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
 * Where it runs: once per config **object**, at the boundary and never on the hot path.
 * {@link validatedTradition} checks the config, takes a private deeply frozen copy and memoises it
 * on a `WeakMap`; every entry point then reads that copy, so a config mutated after first use
 * neither escapes revalidation nor reaches the arithmetic. `scalingFor` is the single choke point
 * for the scaling, and it hands back the copy it derived from.
 *
 * @packageDocumentation
 */

import { assertKnownKeys, describe, rangeError, readingCallersObject } from "../errors.js";
import { deepFreeze } from "../freeze.js";
import type {
	MeanMotion,
	Rational,
	TraditionConfig,
	TraditionMonthAnimals,
	TraditionNaming,
	TraditionNineNumbers,
} from "./types.js";

/** `moonTab` covers arguments 0…7; `sunTab` covers 0…3. Janson §7. */
const MOON_TAB_LENGTH = 8;
const SUN_TAB_LENGTH = 4;

/** The three mean motions, by the field name a message should quote back. */
const MEAN_MOTIONS = ["meanDate", "meanSun", "lunarAnomaly"] as const;

/** The three coefficients each mean motion carries — Janson's `x₁`, `x₂`, `x₀`. */
const COEFFICIENTS = ["perMonth", "perDay", "atEpoch"] as const;

// Each list is a `Record` over the interface's own keys, so adding a field to the type without
// adding it here is a compile error rather than a config that refuses a legitimate key.
const keysOf = <T extends object>(keys: Record<keyof T, true>): readonly string[] =>
	Object.keys(keys);

const CONFIG_KEYS = keysOf<TraditionConfig>({
	id: true,
	name: true,
	epochYear: true,
	epochMonth: true,
	intercalationIndexAtEpoch: true,
	leapIndexThreshold: true,
	leapMonthPosition: true,
	meanDate: true,
	meanSun: true,
	lunarAnomaly: true,
	moonTab: true,
	sunTab: true,
	naming: true,
});
const NAMING_KEYS = keysOf<TraditionNaming>({
	weekdayOffset: true,
	monthAnimals: true,
	nineNumbers: true,
});
const MONTH_ANIMALS_KEYS = keysOf<TraditionMonthAnimals>({ tigerMonth: true, elementRule: true });
const NINE_NUMBERS_KEYS = keysOf<TraditionNineNumbers>({ months: true });

const CODE = "TCT_INVALID_TRADITION_CONFIG";

function invalid(tradition: TraditionConfig, detail: string): Error {
	const id = typeof tradition?.id === "string" ? `"${tradition.id}"` : "<unnamed>";
	return rangeError(
		"TCT_INVALID_TRADITION_CONFIG",
		`TraditionConfig ${id} is malformed: ${detail}. A tradition is built by spreading a shipped ` +
			"config and replacing whole fields — `{ ...PHUGPA, lunarAnomaly: { ... } }` — never by " +
			"supplying a partial one; see docs/architecture.md on adding a tradition",
	);
}

/** A rational must be two numbers with a positive denominator, or the scaling silently degrades. */
function assertRational(
	tradition: TraditionConfig,
	path: string,
	value: Rational | undefined,
): void {
	if (value === null || typeof value !== "object") {
		throw invalid(tradition, `${path} must be a { num, den } object, received ${describe(value)}`);
	}
	if (!Number.isSafeInteger(value.num)) {
		throw invalid(tradition, `${path}.num must be a safe integer, received ${describe(value.num)}`);
	}
	if (!Number.isSafeInteger(value.den) || value.den <= 0) {
		throw invalid(
			tradition,
			`${path}.den must be a positive safe integer, received ${describe(value.den)}`,
		);
	}
}

function assertMeanMotion(
	tradition: TraditionConfig,
	path: string,
	value: MeanMotion | undefined,
): void {
	if (value === null || typeof value !== "object") {
		throw invalid(
			tradition,
			`${path} must be a { perMonth, perDay, atEpoch } object, received ${describe(value)}`,
		);
	}
	for (const coefficient of COEFFICIENTS) {
		assertRational(tradition, `${path}.${coefficient}`, value[coefficient]);
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
	tradition: TraditionConfig,
	path: string,
	value: readonly number[] | undefined,
	length: number,
): void {
	if (!Array.isArray(value)) {
		throw invalid(
			tradition,
			`${path} must be an array of ${length} numbers, received ${describe(value)}`,
		);
	}
	if (value.length !== length) {
		throw invalid(
			tradition,
			`${path} must have exactly ${length} entries, received ${value.length}`,
		);
	}
	for (const [index, entry] of value.entries()) {
		// Safe integer, not merely finite. A fractional entry computes without complaint — the final
		// floorDiv launders the result back to an integer Julian day — so it produces a plausible
		// calendar rather than a failure, which is exactly the error class this project is built to
		// exclude. "No floating point anywhere" is a stated non-negotiable, and these are the values
		// that feed the interpolation. Every other numeric field here already uses this check.
		if (!Number.isSafeInteger(entry)) {
			throw invalid(
				tradition,
				`${path}[${index}] must be a safe integer, received ${describe(entry)}`,
			);
		}
	}
	// Janson's symmetries `tab(m − i) = tab(i)` and `tab(m + i) = −tab(i)`, with m the table's half
	// period, force `tab(m) = tab(0) = −tab(0)`. `moonTabAt` and `sunTabAt` resolve the conflict by
	// returning `+tab(0)` at both, so a non-zero entry gives a calendar that runs and is wrong.
	if (value[0] !== 0) {
		throw invalid(
			tradition,
			`${path}[0] must be 0, received ${describe(value[0])}. The symmetries the table is extended ` +
				"by contradict each other at the half period unless the first entry is zero",
		);
	}
}

function assertInteger(tradition: TraditionConfig, path: string, value: number | undefined): void {
	if (!Number.isSafeInteger(value)) {
		throw invalid(tradition, `${path} must be a safe integer, received ${describe(value)}`);
	}
}

/**
 * `β*` is an intercalation index, and the index is `mod 65`.
 *
 * @remarks
 * A value 65 off is the same leap cycle with the true month count shifted by one lunation: `β` and
 * the rounding term both move by one month while `m₀` stays, so every date moves a month and no leap
 * month does. The values in use are 0, 2, 46 and 61, all inside 0…64.
 */
function assertIntercalationIndexAtEpoch(tradition: TraditionConfig): void {
	const value = tradition.intercalationIndexAtEpoch;
	if (!Number.isSafeInteger(value) || value < 0 || value > 64) {
		throw invalid(
			tradition,
			`intercalationIndexAtEpoch must be an integer in 0…64, received ${describe(value)}. It is ` +
				"an intercalation index, which is taken mod 65: a value outside the range is the same " +
				"leap cycle with every date a whole number of months out",
		);
	}
}

/**
 * The mean date must be a function of the lunar day count `30n + d` alone: `m₁ = 30·m₂`.
 *
 * @remarks
 * `isoToTibetan` seeds its search from `meanDate.perDay`, and the width of the window is proved on
 * the same premise. If `perMonth ≠ 30·perDay` the mean date drifts from the seed by `n·(m₁ − 30·m₂)`,
 * which has no bound, and dates stop converting back. Every version Janson gives satisfies it. Run
 * after the shape checks, so both rationals are known to hold safe integers, and in `BigInt` because
 * the cross-multiplication of two safe integers need not be one.
 *
 * `perDay` must also be positive: it is the divisor of the search window, and a zero or negative one
 * reached `ceilDiv` as an engine fault.
 */
function assertMeanDateRelation(tradition: TraditionConfig): void {
	const { perMonth, perDay } = tradition.meanDate;
	if (perDay.num <= 0) {
		throw invalid(
			tradition,
			`meanDate.perDay must be positive, received ${perDay.num}/${perDay.den}. It is the mean ` +
				"lunar day in calendar days, about 0.98",
		);
	}
	if (
		BigInt(perMonth.num) * BigInt(perDay.den) !==
		30n * BigInt(perDay.num) * BigInt(perMonth.den)
	) {
		throw invalid(
			tradition,
			`meanDate.perMonth (${perMonth.num}/${perMonth.den}) must be 30 times meanDate.perDay ` +
				`(${perDay.num}/${perDay.den}). Janson's m₂ is m₁/30 in every version, and the search ` +
				"for a lunar day's date is bounded only while that holds",
		);
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
function assertLeapIndexThreshold(tradition: TraditionConfig): void {
	const value = tradition.leapIndexThreshold;
	if (!Number.isSafeInteger(value) || value < 0 || value > 63) {
		throw invalid(
			tradition,
			`leapIndexThreshold must be an integer in 0…63, received ${describe(value)}. ` +
				"Janson gives 48 for Phugpa, 0 for Tsurphu, 46 for the Mongolian version and 57 for " +
				"the Bhutanese; there is no default because 48 would silently give Phugpa's leap " +
				"months to another tradition",
		);
	}
}

/**
 * Where a leap month sits relative to the regular month sharing its number.
 *
 * @remarks
 * Absence is checked before the value, and reported differently, for the reason
 * {@link assertLeapIndexThreshold} states: a missing field and a mistyped one are different
 * mistakes with different fixes, and the missing one is likelier for the newest member of an
 * interface.
 *
 * No default, and no derivation from {@link TraditionConfig.leapIndexThreshold} — Janson states
 * Bhutan's leap rule against two different intercalation indices, so `57 ⇒ "after"` would reject a
 * config built from his traditional 59-or-60 formulation, which is correct Bhutan.
 */
function assertLeapMonthPosition(tradition: TraditionConfig): void {
	const value = tradition.leapMonthPosition;
	if (value === undefined) {
		throw invalid(
			tradition,
			'leapMonthPosition is required and was not supplied. Use "before" for Phugpa, Tsurphu and ' +
				'the Mongolian version, "after" for the Bhutanese, which numbers a leap month from the ' +
				"preceding month and so places it after the regular month sharing its number. There is " +
				'no default because "before" would silently give Tibet\'s ordering to a Bhutanese ' +
				"calendar — every date in one lunation a month out, with nothing about the output " +
				"looking wrong",
		);
	}
	if (value !== "before" && value !== "after") {
		throw invalid(
			tradition,
			`leapMonthPosition must be "before" or "after", received ${describe(value)}. It states the ` +
				"leap month's *position*, not the numbering convention Janson describes it by: Bhutan " +
				'numbers from the preceding month, which is "after" here',
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
function assertNaming(tradition: TraditionConfig): void {
	const naming = tradition.naming;
	if (naming === undefined) return;
	if (typeof naming !== "object" || naming === null) {
		throw invalid(tradition, `naming must be an object when present, received ${describe(naming)}`);
	}
	// Before the known-key check, which would otherwise answer a retired name with a bare list of keys.
	if ((naming as { months?: unknown }).months !== undefined) {
		throw invalid(
			tradition,
			"naming.months is no longer read. Its rules are split by naming system: tigerMonth and " +
				"elementRule go in naming.monthAnimals, and a month nine-number rule in " +
				'naming.nineNumbers.months ("descending" for Tsurphu, omitted otherwise)',
		);
	}
	assertKnownKeys(naming, NAMING_KEYS, "TraditionConfig naming", CODE);
	const offset = naming.weekdayOffset;
	if (offset !== undefined && (!Number.isSafeInteger(offset) || offset < 0 || offset > 6)) {
		throw invalid(
			tradition,
			`naming.weekdayOffset must be an integer in 0…6 when present, received ` +
				`${describe(offset)}. It is 0 for every Tibetan version and 1 for Bhutan, and omitting ` +
				"it means 0",
		);
	}
	assertMonthAnimals(tradition, naming.monthAnimals);
	assertNineNumbers(tradition, naming.nineNumbers);
}

/**
 * `naming.monthAnimals` is optional, and absence is a **statement**: nobody has sourced this
 * tradition's month animals, so the astrological layer refuses rather than guessing.
 *
 * @remarks
 * Present-and-partial is the case this exists for. The two fields are one claim — the Tiger month
 * decides the animals *and* anchors the elements, and the lunar day's trigram and number are derived
 * from the month's animal — so a block missing one of them would let a tradition answer some
 * attributes confidently and others wrongly. Required-when-present, therefore, and `undefined` is
 * rejected as CLAUDE.md's rule demands for a declared-required field.
 *
 * A present `naming.months`, this block's name until 2026-09-13, is rejected by {@link assertNaming}
 * with a message of its own rather than as one more unknown key.
 */
function assertMonthAnimals(
	tradition: TraditionConfig,
	animals: TraditionMonthAnimals | undefined,
): void {
	if (animals === undefined) return;
	if (typeof animals !== "object" || animals === null) {
		throw invalid(
			tradition,
			`naming.monthAnimals must be an object when present, received ${describe(animals)}. Omit ` +
				"it entirely to say that this tradition's month animals are not sourced",
		);
	}
	assertKnownKeys(animals, MONTH_ANIMALS_KEYS, "TraditionConfig naming.monthAnimals", CODE);
	const tiger = animals.tigerMonth;
	if (!Number.isSafeInteger(tiger) || tiger < 1 || tiger > 12) {
		throw invalid(
			tradition,
			`naming.monthAnimals.tigerMonth must be an integer in 1…12, received ${describe(tiger)}. ` +
				"It is 11 for Phugpa and 1 for Tsurphu and Mongolia",
		);
	}
	const rule = animals.elementRule;
	if (rule !== "son-of-year" && rule !== "continuous") {
		throw invalid(
			tradition,
			`naming.monthAnimals.elementRule must be "son-of-year" or "continuous", received ` +
				`${describe(rule)}. It names what the rule does, not whose it is: Phugpa restarts the ` +
				"element run from the year's element, Tsurphu runs the cycle on continuously",
		);
	}
}

/**
 * `naming.nineNumbers` is optional and so is each member, and absence means the dominant convention
 * — so only a present-and-wrong value is rejected, the `weekdayOffset` idiom.
 */
function assertNineNumbers(
	tradition: TraditionConfig,
	numbers: TraditionNineNumbers | undefined,
): void {
	if (numbers === undefined) return;
	if (typeof numbers !== "object" || numbers === null) {
		throw invalid(
			tradition,
			`naming.nineNumbers must be an object when present, received ${describe(numbers)}`,
		);
	}
	assertKnownKeys(numbers, NINE_NUMBERS_KEYS, "TraditionConfig naming.nineNumbers", CODE);
	const months = numbers.months;
	if (months !== undefined && months !== "unnumbered" && months !== "descending") {
		throw invalid(
			tradition,
			`naming.nineNumbers.months must be "unnumbered" or "descending" when present, received ` +
				`${describe(months)}. Only Tsurphu calendars number their months, so omitting it means ` +
				'"unnumbered" — which is a sourced fact, not an absence',
		);
	}
}

function assertNonEmptyString(tradition: TraditionConfig, path: string, value: string | undefined) {
	if (typeof value !== "string" || value === "") {
		throw invalid(tradition, `${path} must be a non-empty string, received ${describe(value)}`);
	}
}

/**
 * The private frozen copy of each config already checked, keyed by the object the caller passed.
 * A copy maps to itself, so passing one back is a hit.
 */
const privateCopies = new WeakMap<TraditionConfig, TraditionConfig>();

/**
 * The validated, deeply frozen, private copy of a `TraditionConfig` the engine reads.
 *
 * @remarks
 * Checked and copied once per config **object**, then a `WeakMap` hit. The engine reads the copy
 * and never the caller's object, so mutating a config after first use changes nothing the engine
 * sees: the answers stay those of the config as it was validated, where reading the object live
 * gave an uncoded error, `TCT_INTERNAL`, or a value the validator would have refused. A new
 * object, such as a fresh spread, is checked again.
 *
 * This validates **shape, not astronomy**, plus the few values the arithmetic cannot take at all:
 * `m₁ = 30·m₂`, a table whose first entry is zero, an intercalation index inside 0…64. A config
 * with plausible types and wrong constants passes here and produces a wrong calendar — nothing but a fixture can catch that, which is what
 * `docs/testing.md` is about.
 *
 * @throws RangeError with code `TCT_INVALID_TRADITION_CONFIG`, naming the offending field path.
 */
export function validatedTradition(tradition: TraditionConfig): TraditionConfig {
	// A non-object is refused by the shape check below; `WeakMap.get` would only return undefined.
	if (tradition !== null && typeof tradition === "object") {
		const copy = privateCopies.get(tradition);
		if (copy !== undefined) return copy;
	}
	// The only pass that reads the caller's object, so the only one that can run their code: a getter,
	// or any trap of a Proxy. The copy below is plain data.
	readingCallersObject(CODE, "TraditionConfig", () => assertShape(tradition));
	const copy = deepFreeze(cloneOf(tradition));
	// The copy is checked as a new object: a getter, an inherited field or a non-enumerable one
	// answers differently once cloned, and the copy is what the engine will read.
	assertShape(copy);
	privateCopies.set(tradition, copy);
	privateCopies.set(copy, copy);
	return copy;
}

function cloneOf(tradition: TraditionConfig): TraditionConfig {
	return readingCallersObject(CODE, "TraditionConfig", () => {
		try {
			return structuredClone(tradition);
		} catch (error) {
			if (error instanceof Error && error.name === "DataCloneError") {
				throw rangeError(
					CODE,
					`TraditionConfig ${typeof tradition.id === "string" ? `"${tradition.id}"` : "<unnamed>"} ` +
						"could not be copied, because a field is not plain data; pass plain objects and arrays",
				);
			}
			throw error;
		}
	});
}

function assertShape(tradition: TraditionConfig): void {
	if (tradition === null || typeof tradition !== "object") {
		throw rangeError(
			"TCT_INVALID_TRADITION_CONFIG",
			`TraditionConfig must be an object, received ${describe(tradition)}. Pass PHUGPA, ` +
				"PHUGPA_HENNING, or a config spread from one of them",
		);
	}

	// The likeliest non-config object is the `{ tradition }` bag six functions took until 2026-09-24,
	// when a tradition that is a function's only choice became positional. Without this a migrating
	// caller is told `id` is missing, a field they never meant to write.
	if (tradition.id === undefined && "tradition" in tradition) {
		throw rangeError(
			"TCT_INVALID_TRADITION_CONFIG",
			"TraditionConfig expected, received an object like { tradition }. Where the tradition is " +
				"a function's only choice it is passed positionally: pass the TraditionConfig itself, " +
				"as in attributesFor(date, BHUTAN)",
		);
	}

	assertNonEmptyString(tradition, "id", tradition.id);
	assertNonEmptyString(tradition, "name", tradition.name);
	assertKnownKeys(tradition, CONFIG_KEYS, "TraditionConfig", CODE);
	assertInteger(tradition, "epochYear", tradition.epochYear);
	assertInteger(tradition, "epochMonth", tradition.epochMonth);
	assertIntercalationIndexAtEpoch(tradition);
	assertLeapIndexThreshold(tradition);
	assertLeapMonthPosition(tradition);
	assertNaming(tradition);

	for (const motion of MEAN_MOTIONS) {
		assertMeanMotion(tradition, motion, tradition[motion]);
	}
	assertMeanDateRelation(tradition);

	assertTable(tradition, "moonTab", tradition.moonTab, MOON_TAB_LENGTH);
	assertTable(tradition, "sunTab", tradition.sunTab, SUN_TAB_LENGTH);
}

/**
 * The checks that need derived quantities rather than the raw config.
 *
 * @remarks
 * Split from {@link validatedTradition} because these values do not exist until `deriveScaling`
 * has computed them, not because they are any less part of validating a config — both throw the
 * same code, and both are reached through the same `scalingFor` choke point.
 *
 * Called from `deriveScaling` once the search window is derived.
 *
 * @throws RangeError with code `TCT_INVALID_TRADITION_CONFIG`.
 */
export function assertDerivable(tradition: TraditionConfig, searchHalfWidth: number): void {
	// A general bound on the search window, deliberately not a bound on the tables themselves.
	// `|moonTab| ≤ 25` would hardcode Phugpa's magnitudes into a field the non-negotiables declare
	// injectable, and would have to decide "is this Phugpa" from a consumer-settable `id`. What is
	// genuinely universal is that a tradition whose corrections push the true date a whole month
	// off the mean is not a lunisolar calendar at all. This bounds the work a pathological table
	// can cause without ruling on which traditions are astronomically legitimate.
	if (searchHalfWidth > MAX_SEARCH_HALF_WIDTH) {
		throw invalid(
			tradition,
			`the correction tables imply a search window of ±${searchHalfWidth} lunar days, ` +
				`beyond the ±${MAX_SEARCH_HALF_WIDTH} this engine will search. moonTab and sunTab are ` +
				"equations in sixtieths of a day; entries this large describe no lunisolar calendar",
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
