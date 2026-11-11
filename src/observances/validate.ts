/**
 * The boundary guard for an {@link ObservanceConfig}.
 *
 * @remarks
 * Internal: the barrel exports nothing from here. `ObservanceConfig` is the documented extension
 * point, and the mean-motion formulas are linear in the lunar day, so they extrapolate past the end
 * of a month rather than failing — `day: 31` once returned the 1st of the *following* month and
 * `day: 0` the 30th of the *previous* one, each labelled `"exact"`. An out-of-range month failed the
 * other way, silently yielding no hits so the observance vanished from the year. Every field is
 * therefore checked, and every object a config contains refuses a key it does not know, because a
 * config written for an earlier shape — `kind`, `tier`, `source`, `name`, or `isLeapMonth` inside a
 * date — would otherwise be half-read and answer confidently.
 *
 * Every problem is `TCT_INVALID_OBSERVANCE_CONFIG`: a bad value, an inapplicable setting, an unknown
 * key, an undeclared level.
 */

import { assertSafeYear, describe, rangeError } from "../errors.js";
import type { FormulaName, ObservanceConfig, ObservanceRule, ObservanceWhen } from "./types.js";

const CODE = "TCT_INVALID_OBSERVANCE_CONFIG";

const DOUBLED_DAY_CHOICES = ["first", "second", "both"];
const SKIPPED_DAY_CHOICES = ["preceding", "following", "omit"];
const LEAP_MONTH_CHOICES = ["leap", "regular", "both"];

const CONFIG_KEYS = [
	"id",
	"englishName",
	"tibetanName",
	"doubledDay",
	"skippedDay",
	"leapMonth",
	"levels",
	"rules",
];
const RULE_KEYS = [
	"id",
	"englishName",
	"tibetanName",
	"level",
	"tags",
	"when",
	"doubledDay",
	"skippedDay",
	"leapMonth",
];
const LEVEL_KEYS = ["id", "englishName", "tibetanName"];
const MONTHLY_KEYS = ["type", "days"];
const YEAR_KEYS = ["fromYear", "untilYear", "ageFromYear"] as const;
const ANNUAL_KEYS = ["type", "dates", ...YEAR_KEYS];
const WESTERN_KEYS = ["type", "month", "day", ...YEAR_KEYS];
const PERIOD_KEYS = ["type", "first", "last"];
const FORMULA_KEYS = ["type", "formula"];
const COUNTED_KEYS = ["type", "anchor", "waxingDays", "waningDays", "exclude"];
const WANING_KEYS = ["oddMonth", "evenMonth"];
const FORMULA_NAMES: readonly FormulaName[] = ["lunarDayPlusWeekdayMod4"];
const DATE_KEYS = ["month", "day"];
const TIBETAN_NAME_KEYS = ["tibetan", "wylie", "phonetic"];

type FormSetting = "doubledDay" | "skippedDay" | "leapMonth";

/**
 * The per-rule settings each form reads, keyed by `when.type`.
 *
 * @remarks
 * A `Record` over the form names, so adding a form without a row is a compile error. A per-rule
 * setting absent from its form's row is refused rather than ignored: a monthly rule has no month,
 * so a `leapMonth` on it would be read by nothing and look as if it had been honoured. Config-level
 * defaults are never refused — a form simply does not read the ones it cannot use.
 */
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

/**
 * Whether a value is a non-null object that is not an array.
 *
 * @remarks
 * An array is an object, so it must be refused by name where a record belongs: `[t].flatMap(f)`
 * hands an array to a parameter nobody meant to be one.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Refuses any own key of `value` that is not in `allowed`, naming it.
 *
 * @remarks
 * A second unknown-key checker beside `assertQueryOptions` in `src/errors.ts`, deliberately: that
 * one guards a function's options bag and throws `TCT_INVALID_ARGUMENT`, while this guards objects
 * inside a config and throws `TCT_INVALID_OBSERVANCE_CONFIG`, so the two differ in code and subject.
 */
function assertKnownKeys(value: object, allowed: readonly string[], subject: string): void {
	for (const key of Object.keys(value)) {
		if (!allowed.includes(key)) {
			throw rangeError(
				CODE,
				`${subject} has no key ${JSON.stringify(key)}; its keys are ${allowed.join(", ")}`,
			);
		}
	}
}

function assertNonEmptyString(value: unknown, subject: string): void {
	if (typeof value !== "string" || value === "") {
		throw rangeError(CODE, `${subject} must be a non-empty string, received ${describe(value)}`);
	}
}

/**
 * Rejects a **required** field that is not one of its documented values, `undefined` included.
 *
 * @remarks
 * The `undefined` case is the whole point of the split from {@link assertOptionalChoice}. The three
 * conventions are required on `ObservanceConfig`, and a missing one used to fall through to
 * whichever branch of the resolver came last.
 */
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
function assertOptionalChoice(value: unknown, allowed: readonly string[], subject: string): void {
	if (value !== undefined) assertChoice(value, allowed, subject);
}

/** `{ tibetan, wylie, phonetic }`, three non-empty strings, when present. */
function assertOptionalTibetanName(value: unknown, subject: string): void {
	if (value === undefined) return;
	if (!isRecord(value)) {
		throw rangeError(
			CODE,
			`${subject} must be a { tibetan, wylie, phonetic } object, received ${describe(value)}`,
		);
	}
	assertKnownKeys(value, TIBETAN_NAME_KEYS, subject);
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

/** The shared `TibetanMonthDay` guard: month 1-12 and day 1-30, and no other key. */
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
	assertKnownKeys(date, DATE_KEYS, `${subject}: ${entry}`);
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
		assertKnownKeys(when, MONTHLY_KEYS, `${subject}: when`);
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
		assertKnownKeys(when, ANNUAL_KEYS, `${subject}: when`);
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
		assertKnownKeys(when, PERIOD_KEYS, `${subject}: when`);
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
		assertKnownKeys(when, WESTERN_KEYS, `${subject}: when`);
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
		assertKnownKeys(when, FORMULA_KEYS, `${subject}: when`);
		assertChoice(when.formula, FORMULA_NAMES, `${subject}: when.formula`);
		return;
	}
	if (when.type === "counted") {
		assertKnownKeys(when, COUNTED_KEYS, `${subject}: when`);
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
		assertKnownKeys(waning, WANING_KEYS, `${subject}: when.waningDays`);
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
	throw rangeError(
		CODE,
		`${subject}: when.type must be "monthly", "annual", "period", "western", "formula" or "counted", received ${describe(when.type)}`,
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
 * The likeliest wrong objects in the config position, named for what they are.
 *
 * @remarks
 * A `TraditionConfig` and the `{ config }` bag the signature took until 2026-11-11 are what a
 * caller migrating from the old shape or confusing the two kinds of config passes. Without this a
 * caller is told `epochYear` is an unknown key — a field they never meant to write.
 */
function assertNotAnotherShape(config: Record<string, unknown>): void {
	if (config.id === undefined && "config" in config) {
		throw rangeError(
			CODE,
			"ObservanceConfig expected, received an object like { config }. The config is a required " +
				"positional parameter, as in getObservances(from, to, config, tradition): pass the " +
				"ObservanceConfig itself",
		);
	}
	if (
		"epochYear" in config ||
		"moonTab" in config ||
		("tradition" in config && config.id === undefined)
	) {
		throw rangeError(
			CODE,
			"ObservanceConfig expected, received what looks like a TraditionConfig or a { tradition } " +
				"bag. The tradition is the last parameter, after the config: " +
				"getObservances(from, to, config, tradition)",
		);
	}
}

/**
 * Rejects a config whose rules could not resolve to the days they name.
 *
 * @throws RangeError with code `TCT_INVALID_OBSERVANCE_CONFIG`, naming the offending rule.
 */
function validateObservanceConfig(config: ObservanceConfig): void {
	// The config object itself, before anything dereferences it: `observancesOn(date, null)` once
	// produced a raw uncoded TypeError.
	if (!isRecord(config)) {
		throw rangeError(
			CODE,
			`ObservanceConfig must be an object, received ${describe(config)}. Pass EXAMPLE_OBSERVANCES, ` +
				"or a config spread from it, as the config argument",
		);
	}
	assertNotAnotherShape(config);
	assertKnownKeys(config, CONFIG_KEYS, "ObservanceConfig");

	// `config.id` is interpolated into the messages below, so it is checked before they can quote it.
	assertNonEmptyString(config.id, "observance config id");
	const subject = `observance config "${config.id}"`;
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
			assertKnownKeys(level, LEVEL_KEYS, `${subject}: a level`);
			assertNonEmptyString(level.id, `${subject}: level id`);
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
			`${subject}: rules must be an array. An institution is built by spreading a shipped ` +
				"config — `{ ...EXAMPLE_OBSERVANCES, rules: [...EXAMPLE_OBSERVANCES.rules, mine] }` — " +
				"never by supplying a partial one",
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
		assertKnownKeys(rule, RULE_KEYS, "an observance rule");
		assertNonEmptyString(rule.id, "observance rule id");
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
	}
}

/**
 * Configs already validated, so a config passed on every frame of a UI is checked once.
 *
 * @remarks
 * Keyed on the object, matching `scalingFor`. A consumer who mutates a config in place after first
 * use escapes revalidation, which is the same bargain the scaling cache already makes. The bargain
 * covers **consumer-supplied** configs only: `EXAMPLE_OBSERVANCES` is deeply frozen.
 */
const validatedConfigs = new WeakSet<ObservanceConfig>();

/** Validates `config` once per object. */
export function ensureValidated(config: ObservanceConfig): void {
	if (isRecord(config) && validatedConfigs.has(config)) return;
	validateObservanceConfig(config);
	validatedConfigs.add(config);
}
