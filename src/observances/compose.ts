/**
 * Composing an {@link ObservanceConfig} from a base and a layer of differences.
 *
 * @remarks
 * Internal apart from {@link composeObservances}, which the barrel exports. The guards are the
 * validator's own, exported from `validate.ts`: a second copy of any of them would drift.
 */

import {
	assertKnownKeys,
	describe,
	rangeError,
	readingCallersObject,
	validatedPrivateCopy,
} from "../errors.js";
import type {
	ObservanceConfig,
	ObservanceLayer,
	ObservanceLevel,
	ObservanceRule,
} from "./types.js";
import {
	assertNonEmptyString,
	assertOptionalChoice,
	assertOptionalTibetanName,
	CODE,
	DOUBLED_DAY_CHOICES,
	ensureValidated,
	isRecord,
	LEAP_MONTH_CHOICES,
	looksLikeTradition,
	SKIPPED_DAY_CHOICES,
} from "./validate.js";

const SUBJECT = "composeObservances(layer)";

const LAYER_KEYS = [
	"id",
	"englishName",
	"tibetanName",
	"remove",
	"replace",
	"add",
	"removeLevels",
	"replaceLevels",
	"addLevels",
	"conventions",
	"doubledDay",
	"skippedDay",
	"leapMonth",
];

const CONVENTION_KEYS = ["id", "doubledDay", "skippedDay", "leapMonth"];

/** The conventions one `conventions` entry gives, those left `undefined` omitted. */
type Conventions = Partial<Pick<ObservanceRule, "doubledDay" | "skippedDay" | "leapMonth">>;

/** Checks one `conventions` entry and returns the conventions it gives. */
function conventionsOf(id: string, item: Record<string, unknown>, label: string): Conventions {
	const subject = `${label}: conventions entry "${id}"`;
	assertKnownKeys(item, CONVENTION_KEYS, subject, CODE);
	const doubledDay = item.doubledDay;
	const skippedDay = item.skippedDay;
	const leapMonth = item.leapMonth;
	assertOptionalChoice(doubledDay, DOUBLED_DAY_CHOICES, `${subject}: doubledDay`);
	assertOptionalChoice(skippedDay, SKIPPED_DAY_CHOICES, `${subject}: skippedDay`);
	assertOptionalChoice(leapMonth, LEAP_MONTH_CHOICES, `${subject}: leapMonth`);
	const given = {
		...(doubledDay === undefined ? {} : { doubledDay }),
		...(skippedDay === undefined ? {} : { skippedDay }),
		...(leapMonth === undefined ? {} : { leapMonth }),
	} as Conventions;
	// Refused rather than ignored: an entry that changes nothing is a typo's shape, and accepting it
	// later is free where refusing it after 1.0.0 is not.
	if (Object.keys(given).length === 0) {
		throw rangeError(CODE, `${subject} sets nothing; give doubledDay, skippedDay or leapMonth`);
	}
	return given;
}

const conventionsCopies = new WeakMap<object, object>();

/**
 * The `conventions` entries as `{ id, given }`, read from a validated private copy of the array.
 */
// A `conventions` entry, unlike a `replace` or `add` rule, never reaches the candidate the validator
// copies, so it is copied here: the copy refuses a Proxy (even one with no traps) as every other part
// of a config does, keeps own enumerable data only, and is the only thing applied, so a getter
// answering differently later reaches the result only as a value the checks have seen.
function conventionsFrom(value: unknown, label: string): { id: string; given: Conventions }[] {
	if (value === undefined) return [];
	const entries = (list: unknown) =>
		idsOf(list, "conventions").map(({ id, item }) => ({
			id,
			given: conventionsOf(id, item as Record<string, unknown>, label),
		}));
	const copy = validatedPrivateCopy(value as object, {
		cache: conventionsCopies,
		code: CODE,
		what: `${label}: conventions`,
		isCandidate: (candidate) => Array.isArray(candidate),
		validate: (candidate) => {
			entries(candidate);
		},
		uncopyable: () =>
			`${label}: conventions could not be copied, because it or an entry is not plain data ` +
			"(a Proxy, for one); pass plain objects",
	});
	return entries(copy);
}

/** A layer field that is an array of the right kind of thing, or `[]` when absent. */
function arrayField(value: unknown, field: string): readonly unknown[] {
	if (value === undefined) return [];
	if (!Array.isArray(value)) {
		throw rangeError(CODE, `${SUBJECT}: ${field} must be an array, received ${describe(value)}`);
	}
	return value;
}

function idList(value: unknown, field: string): string[] {
	const items = arrayField(value, field);
	for (const item of items) assertNonEmptyString(item, `${SUBJECT}: every ${field} entry`);
	return items as string[];
}

/** The ids of an array of rules or levels, each checked to be an object with a non-empty id. */
function idsOf(value: unknown, field: string): { id: string; item: unknown }[] {
	return arrayField(value, field).map((item) => {
		if (!isRecord(item)) {
			throw rangeError(
				CODE,
				`${SUBJECT}: every ${field} entry must be an object, received ${describe(item)}`,
			);
		}
		// Read once, so the id checked is the id returned: a getter can answer differently the second
		// time. (`conventions` is also read from a private copy; see `conventionsFrom`.)
		const id = item.id;
		assertNonEmptyString(id, `${SUBJECT}: every ${field} entry's id`);
		return { id: id as string, item };
	});
}

/** Refuses an id that appears twice across the given lists, naming it and the lists it is in. */
// Strict on purpose: an id in `remove` and `add` would silently move a rule to the end, which
// `replace` exists to avoid, and loosening later is free where tightening after 1.0.0 is not.
function assertNoRepeats(lists: readonly (readonly [string, readonly string[]])[], label: string) {
	const where = new Map<string, string[]>();
	for (const [field, ids] of lists) {
		for (const id of ids) where.set(id, [...(where.get(id) ?? []), field]);
	}
	for (const [id, fields] of where) {
		if (fields.length > 1) {
			throw rangeError(
				CODE,
				`${label}: "${id}" appears ${fields.length} times, in ${fields.join(" and ")}; ` +
					"an id may appear once in a layer",
			);
		}
	}
}

/**
 * Returns a new, validated, deeply frozen {@link ObservanceConfig}: `base` with the differences in `layer`.
 *
 * @remarks
 * A centre that differs from a base configuration writes only its differences. Kopan keeps the
 * example's rules and moves the doubled day of every rule that does not set its own to the first of
 * the two:
 *
 * ```ts
 * const kopan = composeObservances(EXAMPLE_OBSERVANCES, {
 *   id: "kopan",
 *   englishName: "Kopan",
 *   doubledDay: "first",
 * });
 * ```
 *
 * The result's `id`, `englishName` and `tibetanName` are the **layer's**, never the base's, so a
 * name pair is never mismatched; with no `tibetanName` on the layer the result has none.
 * `doubledDay`, `skippedDay` and `leapMonth` are the layer's where it gives one, else the base's.
 *
 * A default reaches only the rules that do not set their own value. To change one convention of a
 * rule that does, without copying the rule, name it in `conventions` with any of `doubledDay`,
 * `skippedDay` and `leapMonth`; the rule's other fields stay the base's, and it keeps its place:
 *
 * ```ts
 * const taraFirstHalf = composeObservances(EXAMPLE_OBSERVANCES, {
 *   id: "tara-first-half",
 *   englishName: "Tara on the first half of a doubled day",
 *   conventions: [{ id: "tara", doubledDay: "first" }],
 * });
 * ```
 *
 * **Rules** are changed in the order remove, replace, add: the layer's `remove` ids are dropped,
 * each `replace` rule takes the position of the base rule with the same id, and `add` rules follow,
 * in the order given. `replace` takes complete rules, and a `conventions` entry changes its rule in
 * place. An id may appear **once** in a layer, across `remove`, `replace`, `add` and `conventions`
 * together: removing a rule and adding it back is refused, because it would silently move the rule
 * to the end, and `replace` is how to change a rule and keep its place. `add` refuses an id the
 * base has. The result's rule order is therefore the base's, minus what was removed, with replaced
 * and changed rules in place and added ones appended in the layer's order — and that order is the
 * order of same-day results in {@link getObservances}.
 *
 * **Levels** are changed in the same order as rules: the base's order minus `removeLevels`, each
 * `replaceLevels` entry taking the position of the base level with the same id, then `addLevels` in
 * the order given. There is no reordering. A level id may appear **once** across `removeLevels`,
 * `replaceLevels` and `addLevels` together, and a level a remaining rule still names cannot be
 * removed. `replaceLevels` is how to rename a level or give it a Tibetan name: the id is unchanged,
 * so every rule that names it stays valid and a consumer's filter by id keeps working.
 *
 * **Nothing the caller passed in is changed or frozen**, however deep: the result is built from
 * copies, so a base the caller owns stays theirs to edit, and an object in the layer is never an
 * object in the result. Composing is a configuration-time operation, not one for every render.
 *
 * @param base - A complete configuration, shipped or the caller's own.
 * @param layer - The differences; its keys are those of {@link ObservanceLayer} and no others.
 * @throws RangeError with code `TCT_INVALID_OBSERVANCE_CONFIG`, naming the offending id or key, for
 *   a `base` or `layer` that is not an object or is malformed; an unknown layer key; a `remove`,
 *   `replace` or `conventions` entry naming a rule the base does not have; an `add` naming a rule
 *   the base has; a `conventions` entry with a key other than `id`, `doubledDay`, `skippedDay` and
 *   `leapMonth`, or one that sets none of the three; a rule id appearing twice across `remove`,
 *   `replace`, `add` and `conventions`, whether in one list or two; a
 *   `removeLevels` or `replaceLevels` naming an undeclared level; a level id appearing twice across
 *   `removeLevels`, `replaceLevels` and `addLevels`, whether in one list or two; an added level the
 *   base declares; a level removed while a remaining rule names
 *   it; a rule naming a level that is not declared; a `conventions` entry giving a convention its
 *   rule's form does not read, or `skippedDay: "omit"` to a `counted` rule, each refused naming the
 *   rule; and any rule or level the validator refuses.
 */
export function composeObservances(
	base: ObservanceConfig,
	layer: ObservanceLayer,
): ObservanceConfig {
	base = ensureValidated(base, "composeObservances");
	// The layer, and the rules and levels it adds or replaces, are the caller's objects and are read
	// here and in the validation that follows. Each read that can run their code is guarded, and a
	// throw from it is refused with the config code.
	const candidate = readingCallersObject(CODE, "composeObservances: the layer", () =>
		candidateFrom(base, layer),
	);
	// The validated copy is private and deeply frozen, and none of it is shared with a caller's input,
	// which is why `candidate` need not be copied again: its rules and levels are the base's and the
	// layer's own objects until the validator clones them.
	return ensureValidated(candidate, "composeObservances");
}

/** The unvalidated config `layer` makes of `base`, refusing a malformed layer. */
function candidateFrom(base: ObservanceConfig, layer: ObservanceLayer): ObservanceConfig {
	if (!isRecord(layer)) {
		throw rangeError(CODE, `${SUBJECT}: the layer must be an object, received ${describe(layer)}`);
	}
	if (looksLikeTradition(layer)) {
		throw rangeError(
			CODE,
			`${SUBJECT}: expected an ObservanceLayer, received what looks like a TraditionConfig or a ` +
				"{ tradition } bag. composeObservances(base, layer) takes no tradition: a layer is " +
				"{ id, englishName } with the differences to make, such as add, remove or replace",
		);
	}
	// The id first, so the unknown-key refusal below can name the layer it is in.
	assertNonEmptyString(layer.id, `${SUBJECT}: id`);
	const label = `composeObservances(layer "${layer.id}")`;
	assertKnownKeys(layer, LAYER_KEYS, label, CODE);
	assertNonEmptyString(layer.englishName, `${label}: englishName`);
	assertOptionalTibetanName(layer.tibetanName, `${label}: tibetanName`);
	assertOptionalChoice(layer.doubledDay, DOUBLED_DAY_CHOICES, `${label}: doubledDay`);
	assertOptionalChoice(layer.skippedDay, SKIPPED_DAY_CHOICES, `${label}: skippedDay`);
	assertOptionalChoice(layer.leapMonth, LEAP_MONTH_CHOICES, `${label}: leapMonth`);

	const remove = idList(layer.remove, "remove");
	const replace = idsOf(layer.replace, "replace");
	const add = idsOf(layer.add, "add");
	const conventions = conventionsFrom(layer.conventions, label);
	const removeLevels = idList(layer.removeLevels, "removeLevels");
	const replaceLevels = idsOf(layer.replaceLevels, "replaceLevels");
	const addLevels = idsOf(layer.addLevels, "addLevels");
	assertNoRepeats(
		[
			["remove", remove],
			["replace", replace.map((r) => r.id)],
			["add", add.map((r) => r.id)],
			["conventions", conventions.map((c) => c.id)],
		],
		label,
	);
	assertNoRepeats(
		[
			["removeLevels", removeLevels],
			["replaceLevels", replaceLevels.map((l) => l.id)],
			["addLevels", addLevels.map((l) => l.id)],
		],
		label,
	);

	const baseRuleIds = new Set(base.rules.map((rule) => rule.id));
	for (const id of remove) {
		if (!baseRuleIds.has(id)) {
			throw rangeError(CODE, `${label}: remove names "${id}", which the base does not have`);
		}
	}
	const removed = new Set(remove);
	for (const { id } of replace) {
		if (!baseRuleIds.has(id)) {
			throw rangeError(CODE, `${label}: replace names "${id}", which the base does not have`);
		}
	}
	for (const { id } of conventions) {
		if (!baseRuleIds.has(id)) {
			throw rangeError(CODE, `${label}: conventions names "${id}", which the base does not have`);
		}
	}
	for (const { id } of add) {
		if (baseRuleIds.has(id)) {
			throw rangeError(
				CODE,
				`${label}: add names "${id}", which the base already has; use replace to change it`,
			);
		}
	}

	// Only here is it known that the object came from `replace`, so only here can a refusal say that
	// `replace` takes complete rules; the validator would name the first missing field and stop. After
	// the repeat and base checks, so a wrong id is refused for that, not sent to `conventions`.
	for (const { id, item } of replace) {
		const entry = item as Record<string, unknown>;
		const missing = ["englishName", "when"].filter((field) => entry[field] === undefined);
		if (missing.length > 0) {
			throw rangeError(
				CODE,
				`${label}: replace entry "${id}" lacks ${missing.join(", ")}; replace takes complete ` +
					"rules, so spread the base rule and override what differs, or use conventions to " +
					"change only doubledDay, skippedDay or leapMonth",
			);
		}
	}

	const baseLevels = base.levels === undefined ? [] : base.levels;
	const baseLevelIds = new Set(baseLevels.map((level) => level.id));
	for (const id of removeLevels) {
		if (!baseLevelIds.has(id)) {
			throw rangeError(
				CODE,
				`${label}: removeLevels names "${id}", which the base does not declare`,
			);
		}
	}
	const removedLevels = new Set(removeLevels);
	for (const { id } of replaceLevels) {
		if (!baseLevelIds.has(id)) {
			throw rangeError(
				CODE,
				`${label}: replaceLevels names "${id}", which the base does not declare`,
			);
		}
	}
	for (const { id } of addLevels) {
		if (baseLevelIds.has(id)) {
			throw rangeError(CODE, `${label}: addLevels names "${id}", which the base already declares`);
		}
	}

	const replacements = new Map(replace.map(({ id, item }) => [id, item as ObservanceRule]));
	const changed = new Map(conventions.map(({ id, given }) => [id, given]));
	// A convention a rule's form does not read, and `skippedDay: "omit"` on a `counted` rule, are
	// refused by the validator that runs on this candidate, naming the rule; not checked twice here.
	const rules: ObservanceRule[] = [
		...base.rules
			.filter((rule) => !removed.has(rule.id))
			.map((rule) => {
				const given = changed.get(rule.id);
				return given === undefined ? (replacements.get(rule.id) ?? rule) : { ...rule, ...given };
			}),
		...add.map(({ item }) => item as ObservanceRule),
	];
	for (const rule of rules) {
		if (typeof rule.level === "string" && removedLevels.has(rule.level)) {
			throw rangeError(
				CODE,
				`${label}: removeLevels names "${rule.level}", which rule "${rule.id}" still names`,
			);
		}
	}

	const levelReplacements = new Map(
		replaceLevels.map(({ id, item }) => [id, item as ObservanceLevel]),
	);
	const levels: ObservanceLevel[] | undefined =
		base.levels === undefined && addLevels.length === 0
			? undefined
			: [
					...baseLevels
						.filter((level) => !removedLevels.has(level.id))
						.map((level) => levelReplacements.get(level.id) ?? level),
					...addLevels.map(({ item }) => item as ObservanceLevel),
				];

	// Validated before it is copied: `structuredClone` throws an uncoded error on a function or a
	// Symbol, and only a value the validator has accepted is safe to hand it.
	return {
		id: layer.id,
		englishName: layer.englishName,
		...(layer.tibetanName === undefined ? {} : { tibetanName: layer.tibetanName }),
		doubledDay: layer.doubledDay === undefined ? base.doubledDay : layer.doubledDay,
		skippedDay: layer.skippedDay === undefined ? base.skippedDay : layer.skippedDay,
		leapMonth: layer.leapMonth === undefined ? base.leapMonth : layer.leapMonth,
		...(levels === undefined ? {} : { levels }),
		rules,
	};
}
