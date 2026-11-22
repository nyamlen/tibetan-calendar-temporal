/**
 * Validates the shape of a consumer-supplied {@link TraditionConfig}.
 *
 * @remarks
 * A config is checked once per config **object**, at the boundary and never on the hot path.
 * {@link validatedTradition} checks it, takes a private deeply frozen copy and memoises it on a
 * `WeakMap`; every entry point then reads that copy, so a config mutated after first use changes
 * nothing the engine sees. `scalingFor` is the single choke point for the scaling, and it hands back
 * the copy it derived from.
 *
 * @packageDocumentation
 */

// `TraditionConfig` is the documented extension point — the README, `docs/architecture.md` and the
// type comments all push a reader toward `{ ...PHUGPA, lunarAnomaly: … }` for Tsurphu — so the config
// is checked like every other boundary: `docs/decisions/2026-08-12-input-validation-boundary.md`
// requires every exported function to validate "integrality, range, **and config shape**".
//
// Without it a missing field surfaces as `Cannot read properties of undefined (reading 'den')` from
// inside `scaleMeanMotion`, which names neither the field nor the config, and a `moonTab` of the
// wrong length reaches an interpolation that indexes past its end.

// A value-import cycle: `computation/scaling.ts` imports this file back. It is safe only while every reference
// across it sits inside a function body; a module-level use of either side's exports would hit a
// TDZ `ReferenceError` whose appearance depends on which barrel loads first. See the matching comment there.
import { deriveScaling, type ScaledMeanMotion } from "../computation/scaling.js";
import {
	assertKnownKeys,
	assertNonEmptyString,
	describe,
	isRecord,
	rangeError,
	validatedPrivateCopy,
} from "../errors.js";
import type {
	MeanMotion,
	Rational,
	TraditionConfig,
	TraditionMonthAnimals,
	TraditionNaming,
	TraditionNineNumbers,
} from "./types.js";

/**
 * The number of entries `moonTab` (arguments 0…7) and `sunTab` (arguments 0…3) must have, from the
 * tables of Janson's astronomical-functions section (§7).
 */
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

const malformed = (tradition: TraditionConfig): string =>
	`TraditionConfig ${typeof tradition?.id === "string" ? `"${tradition.id}"` : "<unnamed>"} is malformed`;

// Points at docs/guide.md's heading "Two kinds of config", which ships; a rename of that heading
// must be followed here (message strings are invisible to check:links).
const HOW_TO_BUILD =
	". A tradition is built by spreading a shipped config and replacing whole fields — " +
	"`{ ...PHUGPA, lunarAnomaly: { ... } }` — never by supplying a partial one; see " +
	'"Two kinds of config" in docs/guide.md';

function invalid(tradition: TraditionConfig, detail: string): Error {
	return rangeError(
		"TCT_INVALID_TRADITION_CONFIG",
		`${malformed(tradition)}: ${detail}${HOW_TO_BUILD}`,
	);
}

/**
 * Refuses a rational that is not a `{ num, den }` object of safe integers with a positive `den`.
 *
 * @throws RangeError with code `TCT_INVALID_TRADITION_CONFIG`.
 */
// Without the check the scaling silently degrades.
function assertRational(
	tradition: TraditionConfig,
	path: string,
	value: Rational | undefined,
): void {
	if (!isRecord(value)) {
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

const bigGcd = (a: bigint, b: bigint): bigint => (b === 0n ? (a < 0n ? -a : a) : bigGcd(b, a % b));

function assertMeanMotion(
	tradition: TraditionConfig,
	path: string,
	value: MeanMotion | undefined,
): void {
	if (!isRecord(value)) {
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
 * Refuses a mean motion whose coefficients cannot be put over one safe-integer denominator that
 * `alsoDivides` also divides.
 *
 * @remarks
 * Called from `deriveScaling` immediately before it scales the motion, with the same `alsoDivides`
 * the scaling uses, so the lcm checked here is the lcm the scaling computes. Precondition: the
 * shape checks have run, so every coefficient is a rational of safe integers.
 *
 * @throws RangeError with code `TCT_INVALID_TRADITION_CONFIG`, naming the motion.
 */
export function assertMeanMotionExact(
	tradition: TraditionConfig,
	path: (typeof MEAN_MOTIONS)[number],
	alsoDivides: number,
): void {
	const value = tradition[path];
	// The coefficients are put over the lcm of their reduced denominators and of `alsoDivides`, and
	// `lcm` multiplies in doubles: past 2^53 it rounds, and the failure surfaces late from `scaleTo`
	// naming neither this field nor the config. `alsoDivides` is 4 for `meanSun`, whose solar anomaly
	// subtracts 1/4, so an odd denominator above MAX_SAFE_INTEGER / 4 is already out.
	let common = BigInt(alsoDivides);
	for (const coefficient of COEFFICIENTS) {
		const { num, den } = value[coefficient];
		// exact: BigInt, and a gcd divides both its arguments.
		const reduced = BigInt(den) / bigGcd(BigInt(num), BigInt(den));
		// exact: as above.
		common = (common / bigGcd(common, reduced)) * reduced;
	}
	if (common > BigInt(Number.MAX_SAFE_INTEGER)) {
		throw invalid(
			tradition,
			`${path}'s denominators have a least common multiple of ${common}${
				alsoDivides > 1 ? ` with ${alsoDivides}` : ""
			}, beyond 2^53 - 1, so its coefficients cannot be put over one denominator exactly`,
		);
	}
}

/**
 * Refuses a correction table that is not an array of exactly its documented length of safe integers
 * whose first entry is 0.
 *
 * @throws RangeError with code `TCT_INVALID_TRADITION_CONFIG`.
 */
// Length is not incidental. `moonTabAt` extends the table by the symmetries `tab(14 − i) = tab(i)`
// and `tab(14 + i) = −tab(i)`, which are only meaningful for eight entries, and `sunTabAt` likewise
// for four. The `assertInternal` guard in each is the last line of defence and is unreachable once
// this runs.
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
 * Refuses an `intercalationIndexAtEpoch` that is not an integer in 0…64.
 *
 * @throws RangeError with code `TCT_INVALID_TRADITION_CONFIG`.
 */
// `β*` is an intercalation index, so it is taken mod 65. A value 65 off is the same leap cycle with
// every true month count shifted by one while `m₀` stays, so every date moves a month and no leap
// month does (probed). The values Janson gives, in the epochs the configs use — 61 for `PHUGPA`, 2 for
// `BHUTAN`, and 0 and 46 for Tsurphu and the Mongolian version counted back to E806 — are all
// inside 0…64.
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
 * Refuses a `meanDate` whose `perMonth` is not 30 times its `perDay`, or whose `perDay` is not
 * positive.
 *
 * @remarks
 * The mean date must be a function of the lunar day count `30n + d` alone: `m₁ = 30·m₂`.
 *
 * @throws RangeError with code `TCT_INVALID_TRADITION_CONFIG`.
 */
// `isoToTibetan` seeds its search from `meanDate.perDay`, and the width of the window is proved on
// the same premise. If `perMonth ≠ 30·perDay` the mean date drifts from the seed by
// `n·(m₁ − 30·m₂)`, which has no bound, and dates stop converting back. `perDay` is also the divisor
// of the search window, so it must be positive.
//
// Janson states `m₂ = m₁/30` for the Phugpa version and for every other modern version he knows of.
// Not every version he describes satisfies it: the original Kālacakra Tantra (*karaṇa*) version,
// which he says is not used to produce calendars today, gives `m₂ = 59/60` beside
// `m₁ = 29;31,50 ⟨60,60⟩`, and the earlier historical versions use rounded `m₂` and `s₂` too. This
// refuses them.
//
// Run after the shape checks, so both rationals are known to hold safe integers, and in `BigInt`
// because the cross-multiplication of two safe integers need not be one.
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
				`(${perDay.num}/${perDay.den}), m₂ = m₁/30, as in the Phugpa version and every other ` +
				"modern version Janson knows of. isoToTibetan seeds its search from perDay, and the " +
				"search window is bounded only while that holds: otherwise the seed drifts from the " +
				"true day by n·(m₁ − 30·m₂), without limit",
		);
	}
}

/**
 * Refuses a `leapIndexThreshold` that is not an integer in 0…63.
 *
 * @throws RangeError with code `TCT_INVALID_TRADITION_CONFIG`.
 */
// The leap-month rule matches an intercalation index of `threshold` **or `threshold + 1`**, and the
// index is `mod 65`, so both must be attainable: 64 would leave the second value unreachable and
// halve the leap months — a calendar that runs, and is wrong. The rule does not wrap; Janson writes
// Tsurphu's as 0-or-1, never as 64-or-0.
//
// Separate from `assertInteger` because the range differs. A missing field and an out-of-range one
// get the same message with a different "received" value (probed); `assertLeapMonthPosition` words
// a missing field apart.
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
 * Refuses a `leapMonthPosition` that is absent, or is neither `"before"` nor `"after"`.
 *
 * @remarks
 * There is no default, and the position is not derived from
 * {@link TraditionConfig.leapIndexThreshold}.
 *
 * @throws RangeError with code `TCT_INVALID_TRADITION_CONFIG`.
 */
// Absence is checked before the value and worded apart, because a missing field and a mistyped one
// have different fixes and the missing one is likelier for the newest member of an interface.
//
// No derivation from the threshold: the two fields are independent, and any threshold validates with
// either position. `57 ⇒ "after"` would fit the four shipped configs and say nothing of a config
// built from other numbers. Janson states Bhutan's rule against two different intercalation
// indices — 57-or-58 simplified, 59-or-60 traditional — and the traditional one is the simplified
// index raised by 2 from the leap month onward, until the index passes 65, so
// `{ ...BHUTAN, leapIndexThreshold: 59 }` is a different calendar from `BHUTAN`, not Bhutan stated
// the traditional way (177 of 3,650 days from 2020-01-01 differ, probed).
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
 * Refuses a present `naming` that is not an object, uses a retired or unknown key, or holds a bad
 * member; an absent `naming` is accepted.
 *
 * @throws RangeError with code `TCT_INVALID_TRADITION_CONFIG`.
 */
// A required field is checked for absence because `undefined` is the likelier mistake; an optional
// one is checked for *shape*, because a consumer who supplied it meant something by it and a
// silently ignored typo is worse than a throw.
function assertNaming(tradition: TraditionConfig): void {
	const naming = tradition.naming;
	if (naming === undefined) return;
	// `as unknown` so the guard refuses without narrowing `naming` away from its declared type.
	if (!isRecord(naming as unknown)) {
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
 * Refuses a present `naming.monthAnimals` that is not an object or lacks a valid `tigerMonth` or
 * `elementRule`; an absent one is accepted.
 *
 * @remarks
 * Absence is a **statement**: nobody has sourced this tradition's month animals, so the
 * astrological layer refuses rather than guessing. A present block must be complete.
 *
 * @throws RangeError with code `TCT_INVALID_TRADITION_CONFIG`.
 */
// Present-and-partial is the case this exists for. The two fields are one claim — the Tiger month
// decides the animals *and* anchors the elements, and the lunar day's trigram and number are derived
// from the month's animal — so a block missing one of them would let a tradition answer some
// attributes confidently and others wrongly. `undefined` is rejected for a field the type declares
// required.
//
// The retired `naming.months` is refused by `assertNaming` with a message of its own rather than as
// one more unknown key.
function assertMonthAnimals(
	tradition: TraditionConfig,
	animals: TraditionMonthAnimals | undefined,
): void {
	if (animals === undefined) return;
	if (!isRecord(animals)) {
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
 * Refuses a present `naming.nineNumbers` that is not an object or whose `months` is neither
 * `"unnumbered"` nor `"descending"`; absence of the block or of `months` is accepted.
 *
 * @throws RangeError with code `TCT_INVALID_TRADITION_CONFIG`.
 */
// Absence means the dominant convention, so only a present-and-wrong value is rejected — the
// `weekdayOffset` idiom.
function assertNineNumbers(
	tradition: TraditionConfig,
	numbers: TraditionNineNumbers | undefined,
): void {
	if (numbers === undefined) return;
	if (!isRecord(numbers)) {
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
 * sees: the answers stay those of the config as it was validated. A new object, such as a fresh
 * spread, is checked again.
 *
 * This validates **shape, not astronomy**, plus the few values the arithmetic cannot take at all:
 * `m₁ = 30·m₂`, a table whose first entry is zero, an intercalation index inside 0…64. A config
 * with plausible types and wrong constants passes here and produces a wrong calendar; only a
 * fixture can catch that, which is what [`docs/testing.md`](https://github.com/nyamlen/tibetan-calendar-temporal/blob/main/docs/testing.md) is about.
 *
 * @throws RangeError with code `TCT_INVALID_TRADITION_CONFIG`, naming the offending field path
 * where there is one. The same code answers a value that is not an object, a getter or Proxy that
 * throws while the config is read, and a config that cannot be copied because a field is not plain
 * data.
 */
export function validatedTradition(tradition: TraditionConfig): TraditionConfig {
	return validatedPrivateCopy(tradition, {
		cache: privateCopies,
		code: CODE,
		what: "TraditionConfig",
		// A non-object is refused by the shape check; `WeakMap.get` would only return undefined.
		isCandidate: (value) => value !== null && typeof value === "object",
		validate: assertValid,
		uncopyable: (value) =>
			`TraditionConfig ${typeof value.id === "string" ? `"${value.id}"` : "<unnamed>"} ` +
			"could not be copied, because a field is not plain data; pass plain objects and arrays",
	});
}

/**
 * Runs the shape checks, then derives the scaling so the checks that need derived values run too.
 *
 * @throws RangeError with code `TCT_INVALID_TRADITION_CONFIG`.
 */
// A config must not pass one export and fail another, and the derived checks — the four called from
// `deriveScaling`: `assertMeanMotionExact`, `assertCommonDenominatorExact`, `assertDerivable` and
// `assertArgumentsFit` — would otherwise run only on the exports that reach `scalingFor`. Deriving here, on the caller's object and then on the copy,
// refuses a config that cannot be derived on its first call to anything; `scalingFor` derives the
// copy once more and memoises it.
function assertValid(tradition: TraditionConfig): void {
	assertShape(tradition);
	deriveScaling(tradition);
}

function assertShape(tradition: TraditionConfig): void {
	if (!isRecord(tradition)) {
		throw rangeError(
			"TCT_INVALID_TRADITION_CONFIG",
			`TraditionConfig must be an object, received ${describe(tradition)}. Pass PHUGPA, ` +
				"PHUGPA_HENNING, or a config spread from one of them",
		);
	}

	// The likeliest non-config object is a `{ tradition }` bag, the shape a function took before its
	// only choice, the tradition, became a positional parameter. Without this a migrating caller is
	// told `id` is missing, a field they never meant to write.
	if (tradition.id === undefined && "tradition" in tradition) {
		throw rangeError(
			"TCT_INVALID_TRADITION_CONFIG",
			"TraditionConfig expected, received an object like { tradition }. Where the tradition is " +
				"a function's only choice it is passed positionally: pass the TraditionConfig itself, " +
				"as in attributesFor(date, BHUTAN)",
		);
	}

	assertNonEmptyString(tradition.id, `${malformed(tradition)}: id`, CODE, HOW_TO_BUILD);
	assertNonEmptyString(tradition.name, `${malformed(tradition)}: name`, CODE, HOW_TO_BUILD);
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
 * Refuses a tradition whose common denominator, the lcm of `denominators`, is not a safe integer.
 *
 * @remarks
 * The common denominator is the one the scaled arithmetic puts every quantity over; a safe integer
 * leaves at least one Julian day of exact range. `deriveScaling` passes the mean date's
 * denominator and the denominators of the two correction-table arguments times 60.
 *
 * @throws RangeError with code `TCT_INVALID_TRADITION_CONFIG`.
 */
// Each mean motion can be scalable on its own while the lcm of those three denominators is not;
// `lcm` multiplies in doubles, so past 2^53 the result is rounded and the failure surfaces late,
// from `scaleTo`, or as an exact range of no days. The lcm is taken here in `BigInt`.
export function assertCommonDenominatorExact(
	tradition: TraditionConfig,
	denominators: readonly number[],
): void {
	let common = 1n;
	for (const den of denominators) {
		const d = BigInt(den);
		// exact: BigInt, and a gcd divides both its arguments.
		common = (common / bigGcd(common, d)) * d;
	}
	// A range of at least one day is what `exactToJulianDay = min(floor(MAX_SAFE / common), Temporal's
	// bound)` needs.
	if (common > BigInt(Number.MAX_SAFE_INTEGER)) {
		throw invalid(
			tradition,
			`the common denominator of its mean motions and correction tables is ${common}, beyond ` +
				"2^53 - 1, so no Julian day can be computed exactly. Shrink the denominators of meanDate, " +
				"meanSun and lunarAnomaly",
		);
	}
}

/**
 * Refuses a tradition whose correction tables imply a search window wider than the engine will
 * search.
 *
 * @remarks
 * Called from `deriveScaling` once the search window is derived. It throws the same code as
 * {@link validatedTradition}, which runs the derivation, so every export refuses such a config on
 * its first call.
 *
 * @throws RangeError with code `TCT_INVALID_TRADITION_CONFIG`.
 */
// Split from `validatedTradition` because these values do not exist until `deriveScaling` has
// computed them, not because they are any less part of validating a config.
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
 * The widest search window, in lunar days either side, this engine will accept from a tradition's
 * correction tables.
 *
 * @remarks
 * A full lunar month. Each of the four shipped configs derives 3; anything approaching a month
 * describes no lunisolar calendar and is a typo in a table.
 */
const MAX_SEARCH_HALF_WIDTH = 30;

/**
 * Refuses a config whose table-argument numerators could leave the safe-integer range.
 *
 * @remarks
 * Called from `deriveScaling` once the exact range is derived. Checks the lunar anomaly's and the
 * mean sun's argument numerators over the exact range of Julian days, `exactToJulianDay` either
 * side of zero.
 *
 * @throws RangeError with code `TCT_INVALID_TRADITION_CONFIG`, naming the coefficient set.
 */
export function assertArgumentsFit(
	tradition: TraditionConfig,
	exactToJulianDay: number,
	meanDate: ScaledMeanMotion,
	arguments_: readonly { motion: ScaledMeanMotion; factor: number; name: string }[],
): void {
	// Why the factors need this at all: the argument numerator is the evaluated numerator of its
	// mean motion times a factor of at most 28 (anomaly) or 12 (solar anomaly), and the
	// multiplication is what they introduce. The bound is derived from the config and computed in
	// `BigInt` so the check cannot overflow itself. The largest lunar day count `l` in the exact
	// range satisfies `l · perDay/den ≤ exactToJulianDay + |m₀|`, so
	// `l ≤ (exactToJulianDay · den + |atEpoch|)/perDay + 31`, and the month count is at most
	// `l/30 + 2`. The mean motion's numerator `n · perMonth + d · perDay + atEpoch`, with `d ≤ 30`,
	// is then at most `|atEpoch| + (l/30 + 2) · |perMonth| + 30 · |perDay|`, and the argument's is
	// that times the factor. Against 9 · 10¹⁵ the larger of the two bounds is about 1.2 · 10⁹ for
	// `PHUGPA` and `BHUTAN` and about 2.0 · 10⁹ and 2.1 · 10⁹ for the Henning pair.
	const abs = (n: bigint) => (n < 0n ? -n : n);
	const reach = BigInt(exactToJulianDay) * BigInt(meanDate.den) + abs(BigInt(meanDate.atEpoch));
	// exact: BigInt division truncates, which under-counts by less than one day; the `+ 31` absorbs it.
	const days = reach / BigInt(meanDate.perDay) + 31n;
	for (const { motion, factor, name } of arguments_) {
		// exact: truncation under-counts the month count by less than one; the `+ 2` absorbs it.
		const months = days / 30n + 2n;
		const numerator =
			abs(BigInt(motion.atEpoch)) +
			months * abs(BigInt(motion.perMonth)) +
			30n * abs(BigInt(motion.perDay));
		if (numerator * BigInt(factor) > BigInt(Number.MAX_SAFE_INTEGER)) {
			throw invalid(
				tradition,
				`${name}'s coefficients are so large over their common denominator that its ` +
					"correction-table argument could leave the exactly representable integers within the " +
					"supported date range. Write them over a smaller denominator",
			);
		}
	}
}
