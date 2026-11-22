/**
 * The boundary guard for an {@link ObservanceConfig}.
 *
 * @remarks
 * Internal: the barrel exports nothing from here. `ObservanceConfig` is the documented extension
 * point, so every field is checked, and every object a config contains refuses a key it does not
 * know.
 *
 * Every problem is `TCT_INVALID_OBSERVANCE_CONFIG`: a bad value, an inapplicable setting, an unknown
 * key, an undeclared level.
 */

// Why every field and every key: the mean-motion formulas are linear in the lunar day, so they
// extrapolate past the end of a month rather than failing — `day: 31` returned the 1st of the
// *following* month and `day: 0` the 30th of the *previous* one, each labelled `"exact"`. An
// out-of-range month failed the other way, silently yielding no hits so the observance vanished from
// the year. And a config written for an earlier shape — `kind`, `tier`, `source`, `name`, or
// `isLeapMonth` inside a date — would otherwise be half-read and answer confidently.

import {
	assertKnownKeys,
	assertNonEmptyString as assertNonEmptyStringWithCode,
	assertSafeYear,
	describe,
	isPlainObject,
	isRecord,
	keysOf,
	rangeError,
	validatedPrivateCopy,
} from "../errors.js";
import type { TibetanName } from "../types.js";
import type {
	DoubledDayChoice,
	FormulaName,
	LeapMonthChoice,
	ObservanceConfig,
	ObservanceLevel,
	ObservanceRule,
	ObservanceWhen,
	SkippedDayChoice,
	TibetanMonthDay,
} from "./types.js";

export const CODE = "TCT_INVALID_OBSERVANCE_CONFIG";

/**
 * The exports that take an `ObservanceConfig`, each with its own signature, so a refusal names the
 * function the caller called and never another's.
 */
/** The argument a refusal names: the config, or `composeObservances`' base or layer. */
const ARGUMENTS = {
	getObservances: "getObservances(config)",
	observancesOn: "observancesOn(config)",
	nextObservance: "nextObservance(config)",
	composeObservances: "composeObservances(base)",
	// The config `composeObservances` builds from its layer: a fault there is the layer's.
	composeObservancesLayer: "composeObservances(layer)",
} as const;

/** An export that takes an `ObservanceConfig`, or the layer `composeObservances` validates. */
export type ObservanceCaller = keyof typeof ARGUMENTS;

// No entry for the layer: its shape refusals live in `candidateFrom` (`compose.ts`), and the config
// built from it can reach none of the arms that quote a signature.
const SIGNATURES: Record<Exclude<ObservanceCaller, "composeObservancesLayer">, string> = {
	getObservances: "getObservances(from, to, config, tradition)",
	observancesOn: "observancesOn(date, config, tradition)",
	nextObservance: "nextObservance(from, ruleId, config, tradition)",
	composeObservances: "composeObservances(base, layer)",
};

const configArgument = (caller: ObservanceCaller): string => ARGUMENTS[caller];

// Every list below is tied to the type it mirrors: a key list is `keysOf` a record over the type's
// keys, and a choice list is the keys of a record `satisfies Record<Choice, true>`, so a field or a
// choice added to `./types.ts` without being added here fails to compile instead of being refused at
// runtime. Order is kept as written, which is the order a refusal lists them in.
export const DOUBLED_DAY_CHOICES = Object.keys({
	first: true,
	second: true,
	both: true,
} satisfies Record<DoubledDayChoice, true>);
export const SKIPPED_DAY_CHOICES = Object.keys({
	preceding: true,
	following: true,
	omit: true,
} satisfies Record<SkippedDayChoice, true>);
export const LEAP_MONTH_CHOICES = Object.keys({
	leap: true,
	regular: true,
	both: true,
} satisfies Record<LeapMonthChoice, true>);

type Form<T extends ObservanceWhen["type"]> = Extract<ObservanceWhen, { type: T }>;

const CONFIG_KEYS = keysOf<ObservanceConfig>({
	id: true,
	englishName: true,
	tibetanName: true,
	doubledDay: true,
	skippedDay: true,
	leapMonth: true,
	levels: true,
	rules: true,
});
const RULE_KEYS = keysOf<ObservanceRule>({
	id: true,
	englishName: true,
	tibetanName: true,
	level: true,
	tags: true,
	when: true,
	doubledDay: true,
	skippedDay: true,
	leapMonth: true,
});
const LEVEL_KEYS = keysOf<ObservanceLevel>({ id: true, englishName: true, tibetanName: true });
const MONTHLY_KEYS = keysOf<Form<"monthly">>({ type: true, days: true });
// A deliberate subset: the year window and age fields `annual` and `western` share, which
// `assertYearFields` walks. Checked against both forms' keys.
const YEAR_KEYS = ["fromYear", "untilYear", "ageFromYear"] as const satisfies readonly (keyof Form<
	"annual" | "western"
>)[];
const ANNUAL_KEYS = keysOf<Form<"annual">>({
	type: true,
	dates: true,
	fromYear: true,
	untilYear: true,
	ageFromYear: true,
});
const WESTERN_KEYS = keysOf<Form<"western">>({
	type: true,
	month: true,
	day: true,
	fromYear: true,
	untilYear: true,
	ageFromYear: true,
});
const PERIOD_KEYS = keysOf<Form<"period">>({ type: true, first: true, last: true });
const FORMULA_KEYS = keysOf<Form<"formula">>({ type: true, formula: true });
const COUNTED_KEYS = keysOf<Form<"counted">>({
	type: true,
	anchor: true,
	waxingDays: true,
	waningDays: true,
	exclude: true,
});
const WANING_KEYS = keysOf<Form<"counted">["waningDays"]>({ oddMonth: true, evenMonth: true });
const FORMULA_NAMES = Object.keys({
	lunarDayPlusWeekdayMod4: true,
} satisfies Record<FormulaName, true>);
const DATE_KEYS = keysOf<TibetanMonthDay>({ month: true, day: true });
const TIBETAN_NAME_KEYS = keysOf<TibetanName>({ tibetan: true, wylie: true, phonetic: true });

type FormSetting = "doubledDay" | "skippedDay" | "leapMonth";

/**
 * The per-rule settings each form reads, keyed by `when.type`.
 *
 * @remarks
 * A per-rule setting absent from its form's row is refused rather than ignored: a monthly rule has
 * no month, so a `leapMonth` on it would be read by nothing and look as if it had been honoured.
 * Config-level defaults are never refused — a form simply does not read the ones it cannot use.
 */
// A `Record` over the form names, so adding a form without a row is a compile error.
const SETTINGS_BY_FORM: Record<ObservanceWhen["type"], readonly FormSetting[]> = {
	monthly: ["doubledDay", "skippedDay"],
	annual: ["doubledDay", "skippedDay", "leapMonth"],
	period: ["leapMonth"],
	western: [],
	formula: [],
	counted: ["doubledDay", "skippedDay", "leapMonth"],
};

/** Days in each Gregorian month in a leap year, the most any year gives it. */
const WESTERN_MONTH_LENGTHS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** The observance validator's non-empty-string check, refusing with its config code. */
export function assertNonEmptyString(value: unknown, subject: string): asserts value is string {
	assertNonEmptyStringWithCode(value, subject, CODE);
}

/** Rejects a **required** field that is not one of its documented values, `undefined` included. */
// The `undefined` case is the whole point of the split from `assertOptionalChoice`. The three
// conventions are required on `ObservanceConfig`, and a missing one would fall through to whichever
// branch of the resolver came last.
function assertChoice(value: unknown, allowed: readonly string[], subject: string): void {
	if (typeof value !== "string" || !allowed.includes(value)) {
		throw rangeError(
			CODE,
			`${subject} must be one of ${allowed.map((a) => `"${a}"`).join(", ")}, received ` +
				`${describe(value)}`,
		);
	}
}

/**
 * Rejects a per-rule override that is present but not one of its documented values.
 *
 * @remarks
 * Absent is legitimate here and only here: a missing override means "use the config's default".
 */
export function assertOptionalChoice(
	value: unknown,
	allowed: readonly string[],
	subject: string,
): void {
	if (value !== undefined) assertChoice(value, allowed, subject);
}

/** Checks that a name, when present, is `{ tibetan, wylie, phonetic }`: three non-empty strings. */
export function assertOptionalTibetanName(value: unknown, subject: string): void {
	if (value === undefined) return;
	if (!isRecord(value)) {
		throw rangeError(
			CODE,
			`${subject} must be a { tibetan, wylie, phonetic } object, received ${describe(value)}`,
		);
	}
	assertKnownKeys(value, TIBETAN_NAME_KEYS, subject, CODE);
	for (const part of TIBETAN_NAME_KEYS) {
		assertNonEmptyString(value[part], `${subject}.${part}`);
	}
}

function assertIntegerInRange(
	value: unknown,
	min: number,
	max: number,
	subject: string,
	why: string,
): void {
	if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
		throw rangeError(
			CODE,
			`${subject} must be an integer ${min}-${max}, received ${describe(value)}. ${why}`,
		);
	}
}

/**
 * Checks the year window and age origin shared by `annual` and `western`, whose calendar differs
 * but whose checks do not. Each must be a safe integer, and a window must not end before it starts.
 */
function assertYearFields(when: Record<string, unknown>, subject: string): void {
	for (const field of YEAR_KEYS) {
		if (when[field] !== undefined) {
			assertSafeYear(`${subject}: when.${field}`, when[field], "", CODE);
		}
	}
	if (
		when.fromYear !== undefined &&
		when.untilYear !== undefined &&
		(when.fromYear as number) > (when.untilYear as number)
	) {
		throw rangeError(
			CODE,
			`${subject}: when.fromYear (${when.fromYear}) is after when.untilYear (${when.untilYear}), ` +
				"so the rule could never occur",
		);
	}
}

const DAY_WHY =
	"A rule names a Tibetan lunar day, which always runs 1-30; a day that no calendar day carries " +
	"is handled by the skippedDay convention, not by omitting the rule";
const FORTNIGHT_WHY =
	"A step of a counted schedule is a fortnight's, 13-16 days; a wider value cannot be a half-month schedule";
const MONTH_WHY =
	"A leap month is selected by the leapMonth convention, not by a thirteenth number";

/** Checks a `TibetanMonthDay`: month 1-12 and day 1-30, and no other key; the guard every form shares. */
function assertMonthDay(
	date: unknown,
	subject: string,
	entry: string,
): asserts date is { month: number; day: number } {
	if (!isRecord(date)) {
		throw rangeError(
			CODE,
			`${subject}: ${entry} must be a { month, day } object, received ${describe(date)}`,
		);
	}
	assertKnownKeys(date, DATE_KEYS, `${subject}: ${entry}`, CODE);
	assertIntegerInRange(date.month, 1, 12, `${subject}: month`, MONTH_WHY);
	assertIntegerInRange(date.day, 1, 30, `${subject}: day`, DAY_WHY);
}

function assertWhen(when: unknown, subject: string): void {
	if (!isRecord(when)) {
		throw rangeError(
			CODE,
			`${subject}: when must be an object with a type, received ${describe(when)}`,
		);
	}
	if (when.type === "monthly") {
		assertKnownKeys(when, MONTHLY_KEYS, `${subject}: when`, CODE);
		const days = when.days;
		if (!Array.isArray(days) || days.length === 0) {
			throw rangeError(
				CODE,
				`${subject}: when.days must be a non-empty array of day numbers, received ${describe(days)}`,
			);
		}
		for (const day of days) {
			assertIntegerInRange(day, 1, 30, `${subject}: day`, DAY_WHY);
		}
		if (new Set(days).size !== days.length) {
			throw rangeError(CODE, `${subject}: when.days must not repeat a day`);
		}
		return;
	}
	if (when.type === "annual") {
		assertKnownKeys(when, ANNUAL_KEYS, `${subject}: when`, CODE);
		const dates = when.dates;
		if (!Array.isArray(dates) || dates.length === 0) {
			throw rangeError(
				CODE,
				`${subject}: when.dates must be a non-empty array of { month, day }, received ` +
					describe(dates),
			);
		}
		const seen = new Set<string>();
		for (const date of dates) {
			assertMonthDay(date, subject, "every when.dates entry");
			const key = `${date.month}-${date.day}`;
			if (seen.has(key)) {
				throw rangeError(
					CODE,
					`${subject}: when.dates repeats month ${date.month} day ${date.day}`,
				);
			}
			seen.add(key);
		}
		assertYearFields(when, subject);
		return;
	}
	if (when.type === "period") {
		assertKnownKeys(when, PERIOD_KEYS, `${subject}: when`, CODE);
		const { first, last } = when;
		assertMonthDay(first, subject, "when.first");
		assertMonthDay(last, subject, "when.last");
		if (first.month > last.month) {
			throw rangeError(
				CODE,
				`${subject}: a period may not cross the new year, but when.first is in month ` +
					`${first.month} and when.last in month ${last.month}`,
			);
		}
		if (first.month === last.month && first.day > last.day) {
			throw rangeError(
				CODE,
				`${subject}: when.first (month ${first.month} day ${first.day}) is after when.last ` +
					`(day ${last.day}), so the period would be empty`,
			);
		}
		return;
	}
	if (when.type === "western") {
		assertKnownKeys(when, WESTERN_KEYS, `${subject}: when`, CODE);
		assertIntegerInRange(
			when.month,
			1,
			12,
			`${subject}: month`,
			"A western rule names a Gregorian month",
		);
		const longest = WESTERN_MONTH_LENGTHS[(when.month as number) - 1] as number;
		assertIntegerInRange(
			when.day,
			1,
			longest,
			`${subject}: day`,
			`Gregorian month ${when.month} has at most ${longest} days`,
		);
		assertYearFields(when, subject);
		return;
	}
	if (when.type === "formula") {
		assertKnownKeys(when, FORMULA_KEYS, `${subject}: when`, CODE);
		assertChoice(when.formula, FORMULA_NAMES, `${subject}: when.formula`);
		return;
	}
	if (when.type === "counted") {
		assertKnownKeys(when, COUNTED_KEYS, `${subject}: when`, CODE);
		assertMonthDay(when.anchor, subject, "when.anchor");
		assertIntegerInRange(when.waxingDays, 13, 16, `${subject}: when.waxingDays`, FORTNIGHT_WHY);
		const waning = when.waningDays;
		if (!isRecord(waning)) {
			throw rangeError(
				CODE,
				`${subject}: when.waningDays must be an { oddMonth, evenMonth } object, received ` +
					describe(waning),
			);
		}
		assertKnownKeys(waning, WANING_KEYS, `${subject}: when.waningDays`, CODE);
		for (const key of WANING_KEYS) {
			assertIntegerInRange(
				waning[key],
				13,
				16,
				`${subject}: when.waningDays.${key}`,
				FORTNIGHT_WHY,
			);
		}
		if (when.exclude !== undefined) {
			if (!Array.isArray(when.exclude)) {
				throw rangeError(
					CODE,
					`${subject}: when.exclude must be an array of { month, day }, received ` +
						describe(when.exclude),
				);
			}
			for (const date of when.exclude) assertMonthDay(date, subject, "every when.exclude entry");
		}
		return;
	}
	// The forms are listed from `SETTINGS_BY_FORM`, whose keys the compiler holds to the union, so a
	// new form is named here without anyone remembering to.
	const forms = Object.keys(SETTINGS_BY_FORM).map((form) => `"${form}"`);
	throw rangeError(
		CODE,
		`${subject}: when.type must be ${forms.slice(0, -1).join(", ")} or ${forms.at(-1)}, received ${describe(when.type)}. ` +
			"A config written for a newer release may use a form this release does not know: " +
			"the config is refused as a whole, so remove the rules with an unknown form before querying",
	);
}

function assertTags(tags: unknown, subject: string): void {
	if (tags === undefined) return;
	if (!Array.isArray(tags)) {
		throw rangeError(
			CODE,
			`${subject}: tags must be an array of strings, received ${describe(tags)}. A single ` +
				'string is refused: a JSON array is `["tsok"]`, not `"tsok"`',
		);
	}
	for (const tag of tags) assertNonEmptyString(tag, `${subject}: a tag`);
	if (new Set(tags).size !== tags.length) {
		throw rangeError(CODE, `${subject}: tags must be distinct`);
	}
}

/**
 * Refuses a per-rule setting the rule's form does not read, once its value has been checked.
 *
 * @remarks
 * Called after the value checks, so `leapMonth: "bogus"` reports the bad value rather than its
 * inapplicability.
 */
function assertSettingsApplicable(rule: Record<string, unknown>, ruleSubject: string): void {
	const form = (rule.when as ObservanceRule["when"]).type;
	const used = SETTINGS_BY_FORM[form];
	for (const setting of ["doubledDay", "skippedDay", "leapMonth"] as const) {
		if (rule[setting] !== undefined && !used.includes(setting)) {
			throw rangeError(
				CODE,
				`${ruleSubject}: ${setting} does not apply to a "${form}" rule, which reads ` +
					(used.length === 0 ? "no per-rule settings" : used.join(" and ")),
			);
		}
	}
}

/**
 * Refuses a value a form cannot use, once the effective setting is known.
 *
 * @remarks
 * A `counted` rule refuses `skippedDay: "omit"`, whether set on the rule or inherited from the
 * config's default, which has already been validated by now.
 */
// Why: an omitted anchor removes that year's anchor, and two in a row leave a gap wider than the
// lookback, so the schedule is undefined there and a query's answer would depend on where its range
// starts.
function assertFormValues(
	rule: Record<string, unknown>,
	config: ObservanceConfig,
	ruleSubject: string,
): void {
	if ((rule.when as ObservanceRule["when"]).type !== "counted") return;
	const own = rule.skippedDay !== undefined;
	const effective = own ? rule.skippedDay : config.skippedDay;
	if (effective === "omit") {
		throw rangeError(
			CODE,
			`${ruleSubject}: a "counted" rule does not accept skippedDay "omit", set ${
				own ? "on the rule" : "by the config default, which the rule inherits"
			}: an omitted anchor leaves that year with no schedule. Use "preceding" or "following"` +
				(own ? "" : ", on the rule or as the config default"),
		);
	}
}

/**
 * Returns whether an object looks like a `TraditionConfig`, or a `{ tradition }` bag, rather than anything
 * an observance export takes.
 *
 * @remarks
 * Shared by the config position here and the layer position in `composeObservances`: a caller
 * confusing the two kinds of config can put it in either.
 */
export function looksLikeTradition(value: Record<string, unknown>): boolean {
	return (
		"epochYear" in value || "moonTab" in value || ("tradition" in value && value.id === undefined)
	);
}

/** Refuses the likeliest wrong objects in the config position, naming each for what it is. */
// A `TraditionConfig` and a `{ config }` bag are what a caller confusing the two kinds of config
// passes, and a `Date` is the likeliest wrong object in a package whose first rule is Temporal.
// Without this a caller is told `epochYear` is an unknown key, or that `id` is undefined — a field
// they never meant to write. Each message names the export that was called and its own signature,
// because the guard is shared and a message naming another function's signature sends the caller to
// the wrong place.
function assertNotAnotherShape(config: Record<string, unknown>, caller: ObservanceCaller): void {
	// The layer's own shape refusals live in `candidateFrom` (`compose.ts`), which refuses a layer that
	// is not an object or looks like a tradition before building this config; the config it builds is
	// a plain object with a string `id`, so none of the arms below can fire for it.
	if (caller === "composeObservancesLayer") return;
	const subject = configArgument(caller);
	const signature = SIGNATURES[caller];
	if (config.id === undefined && "config" in config) {
		throw rangeError(
			CODE,
			`${subject}: expected an ObservanceConfig, received an object like { config }. The config ` +
				`is a positional argument, as in ${signature}: pass the ObservanceConfig itself`,
		);
	}
	if (looksLikeTradition(config)) {
		throw rangeError(
			CODE,
			`${subject}: expected an ObservanceConfig, received what looks like a TraditionConfig or a ` +
				"{ tradition } bag. " +
				(caller === "composeObservances"
					? `${signature} takes no tradition: pass an ObservanceConfig as the base`
					: `A tradition is a separate parameter, not the config, as in ${signature}`),
		);
	}
	if (config.id === undefined && !isPlainObject(config)) {
		throw rangeError(
			CODE,
			`${subject}: expected an ObservanceConfig, received ${describe(config)}. Pass ` +
				"EXAMPLE_OBSERVANCES, or a config made with composeObservances or written out in full",
		);
	}
}

/**
 * Rejects a config whose rules could not resolve to the days they name.
 *
 * @throws RangeError with code `TCT_INVALID_OBSERVANCE_CONFIG`, naming the offending rule.
 */
function validateObservanceConfig(config: ObservanceConfig, caller: ObservanceCaller): void {
	// The config object itself, before anything dereferences it: `observancesOn(date, null)` once
	// produced a raw uncoded TypeError.
	if (!isRecord(config)) {
		throw rangeError(
			CODE,
			`${configArgument(caller)}: expected an ObservanceConfig, received ${describe(config)}. ` +
				"Pass EXAMPLE_OBSERVANCES, or a config made with composeObservances or written out in full",
		);
	}
	assertNotAnotherShape(config, caller);
	// `config.id` is interpolated into the messages below, so it is checked before they can quote it,
	// the unknown-key refusal among them.
	assertNonEmptyString(config.id, "observance config id");
	const subject = `observance config "${config.id}"`;
	assertKnownKeys(config, CONFIG_KEYS, subject, CODE);
	assertNonEmptyString(config.englishName, `${subject}: englishName`);
	assertOptionalTibetanName(config.tibetanName, `${subject}: tibetanName`);

	assertChoice(config.doubledDay, DOUBLED_DAY_CHOICES, "config doubledDay");
	assertChoice(config.skippedDay, SKIPPED_DAY_CHOICES, "config skippedDay");
	assertChoice(config.leapMonth, LEAP_MONTH_CHOICES, "config leapMonth");

	const levelIds = new Set<string>();
	if (config.levels !== undefined) {
		if (!Array.isArray(config.levels)) {
			throw rangeError(
				CODE,
				`${subject}: levels must be an array, received ${describe(config.levels)}`,
			);
		}
		for (const level of config.levels) {
			if (!isRecord(level)) {
				throw rangeError(
					CODE,
					`${subject}: every level must be an object, received ${describe(level)}`,
				);
			}
			// The id first, so the unknown-key refusal below can name the level it is in.
			assertNonEmptyString(level.id, `${subject}: level id`);
			assertKnownKeys(level, LEVEL_KEYS, `${subject}: level "${level.id}"`, CODE);
			if (levelIds.has(level.id as string)) {
				throw rangeError(CODE, `${subject}: level id must be unique, "${level.id}" repeats`);
			}
			levelIds.add(level.id as string);
			assertNonEmptyString(level.englishName, `${subject}: level "${level.id}": englishName`);
			assertOptionalTibetanName(level.tibetanName, `${subject}: level "${level.id}": tibetanName`);
		}
	}

	if (!Array.isArray(config.rules)) {
		throw rangeError(
			CODE,
			`${subject}: rules must be an array, received ${describe(config.rules)}. A config is ` +
				"written out in full, or built from another with composeObservances(base, layer), " +
				"never supplied in part",
		);
	}

	const seen = new Set<string>();
	for (const rule of config.rules) {
		if (!isRecord(rule)) {
			throw rangeError(
				CODE,
				`${subject}: every rule must be an object, received ${describe(rule)}`,
			);
		}
		// The id first, so the unknown-key refusal below can name the rule it is in: in a file of a
		// dozen added rules a misspelt key is the commonest mistake.
		assertNonEmptyString(rule.id, "observance rule id");
		assertKnownKeys(rule, RULE_KEYS, `observance rule "${rule.id}"`, CODE);
		// Documented as "unique within a config" and never enforced; duplicates silently produced
		// duplicate results, ordered only by the sort's stability.
		if (seen.has(rule.id as string)) {
			throw rangeError(
				CODE,
				`observance rule id must be unique within a config, "${rule.id}" repeats`,
			);
		}
		seen.add(rule.id as string);

		const ruleSubject = `observance rule "${rule.id}"`;
		assertNonEmptyString(rule.englishName, `${ruleSubject}: englishName`);
		assertOptionalTibetanName(rule.tibetanName, `${ruleSubject}: tibetanName`);

		if (rule.level !== undefined) {
			assertNonEmptyString(rule.level, `${ruleSubject}: level`);
			if (!levelIds.has(rule.level as string)) {
				throw rangeError(
					CODE,
					`${ruleSubject}: level "${rule.level}" is not declared in the config's levels`,
				);
			}
		}
		assertTags(rule.tags, ruleSubject);
		assertWhen(rule.when, ruleSubject);

		assertOptionalChoice(rule.doubledDay, DOUBLED_DAY_CHOICES, `${ruleSubject} doubledDay`);
		assertOptionalChoice(rule.skippedDay, SKIPPED_DAY_CHOICES, `${ruleSubject} skippedDay`);
		assertOptionalChoice(rule.leapMonth, LEAP_MONTH_CHOICES, `${ruleSubject} leapMonth`);

		assertSettingsApplicable(rule, ruleSubject);
		assertFormValues(rule, config, ruleSubject);
	}
}

/**
 * The private frozen copy of each config already validated, keyed by the object the caller passed.
 * A copy maps to itself, so passing one back is a hit.
 */
const privateCopies = new WeakMap<ObservanceConfig, ObservanceConfig>();

/**
 * Validates `config` once per object and returns the private, deeply frozen copy the engine reads.
 *
 * @remarks
 * The engine never reads the caller's object after this, so a config mutated after first use
 * changes nothing it sees: a monthly `days: [31]` set afterwards cannot bring back the day-31
 * extrapolation the validator exists to stop, and a `rules` set to `null` cannot escape as an
 * uncoded `TypeError`. A new object, such as a fresh spread, is validated again.
 *
 * @param caller - The export that was called, so a refusal of the config names it.
 */
// Validation runs before the copy because `structuredClone` throws an uncoded error on a function or
// a Symbol, and the copy is validated as a new object because a getter, an inherited field or a
// non-enumerable one answers differently once cloned.
export function ensureValidated(
	config: ObservanceConfig,
	caller: ObservanceCaller,
): ObservanceConfig {
	return validatedPrivateCopy(config, {
		cache: privateCopies,
		code: CODE,
		what: `${configArgument(caller)}: the config`,
		isCandidate: isRecord,
		validate: (value) => validateObservanceConfig(value, caller),
		uncopyable: () =>
			`${configArgument(caller)}: the config could not be copied, because a rule, level or ` +
			"name in it is not plain data (a Proxy, for one); pass plain objects",
	});
}
