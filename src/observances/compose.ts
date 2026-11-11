/**
 * Composing an {@link ObservanceConfig} from a base and a layer of differences.
 *
 * @remarks
 * Internal apart from {@link composeObservances}, which the barrel exports. The guards are the
 * validator's own, exported from `validate.ts`: a second copy of any of them would drift.
 */

import { describe, rangeError } from "../errors.js";
import { deepFreeze } from "../freeze.js";
import type {
	ObservanceConfig,
	ObservanceLayer,
	ObservanceLevel,
	ObservanceRule,
} from "./types.js";
import {
	assertKnownKeys,
	assertNonEmptyString,
	assertOptionalChoice,
	assertOptionalTibetanName,
	DOUBLED_DAY_CHOICES,
	ensureValidated,
	isRecord,
	LEAP_MONTH_CHOICES,
	SKIPPED_DAY_CHOICES,
} from "./validate.js";

const CODE = "TCT_INVALID_OBSERVANCE_CONFIG";
const SUBJECT = "composeObservances(layer)";

const LAYER_KEYS = [
	"id",
	"englishName",
	"tibetanName",
	"remove",
	"replace",
	"add",
	"removeLevels",
	"addLevels",
	"doubledDay",
	"skippedDay",
	"leapMonth",
];

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
		assertNonEmptyString(item.id, `${SUBJECT}: every ${field} entry's id`);
		return { id: item.id as string, item };
	});
}

/**
 * Refuses an id that appears twice across the given lists, naming it and the lists it is in.
 *
 * @remarks
 * Strict on purpose: an id in `remove` and `add` would silently move a rule to the end, which
 * `replace` exists to avoid, and loosening later is free where tightening after 1.0.0 is not.
 */
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
 * A new, validated, deeply frozen {@link ObservanceConfig}: `base` with the differences in `layer`.
 *
 * @remarks
 * A centre that differs from a base configuration writes only its differences. Kopan keeps FPMT's
 * rules and moves doubled days to the first of the two:
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
 * **Rules** are changed in the order remove, replace, add: the layer's `remove` ids are dropped,
 * each `replace` rule takes the position of the base rule with the same id, and `add` rules follow,
 * in the order given. An id may appear **once** in a layer, across `remove`, `replace` and `add`
 * together: removing a rule and adding it back is refused, because it would silently move the rule
 * to the end, and `replace` is how to change a rule and keep its place. `add` refuses an id the
 * base has.
 *
 * **Levels** keep the base's order minus `removeLevels`, then `addLevels` follow in the order given.
 * There is no reordering. A level id may appear once across `removeLevels` and `addLevels`, and a
 * level a remaining rule still names cannot be removed. A layer therefore cannot rename or edit a
 * level, deliberately: there is no `replaceLevels`, so keep the level, or remove it and `replace`
 * the rules that name it.
 *
 * **Nothing the caller passed in is changed or frozen**, however deep: the result is built from
 * copies, so a base the caller owns stays theirs to edit, and an object in the layer is never an
 * object in the result. Composing is a configuration-time operation, not one for every render.
 *
 * @param base - A complete configuration, shipped or the caller's own.
 * @param layer - The differences; its keys are those of {@link ObservanceLayer} and no others.
 * @throws RangeError with code `TCT_INVALID_OBSERVANCE_CONFIG`, naming the offending id or key, for
 *   a `base` or `layer` that is not an object or is malformed; an unknown layer key; a `remove` or
 *   `replace` naming a rule the base does not have; an `add` naming a rule the base has; a rule
 *   id appearing twice across `remove`, `replace` and `add`, whether in one list or two; a
 *   `removeLevels` naming an undeclared level; a level id appearing twice across `removeLevels` and
 *   `addLevels`; an added level the base declares; a level removed while a remaining rule names
 *   it; a rule naming a level that is not declared; and any rule or level the validator refuses.
 */
export function composeObservances(
	base: ObservanceConfig,
	layer: ObservanceLayer,
): ObservanceConfig {
	ensureValidated(base);
	if (!isRecord(layer)) {
		throw rangeError(CODE, `${SUBJECT}: the layer must be an object, received ${describe(layer)}`);
	}
	assertKnownKeys(layer, LAYER_KEYS, SUBJECT);
	assertNonEmptyString(layer.id, `${SUBJECT}: id`);
	const label = `composeObservances(layer "${layer.id}")`;
	assertNonEmptyString(layer.englishName, `${label}: englishName`);
	assertOptionalTibetanName(layer.tibetanName, `${label}: tibetanName`);
	assertOptionalChoice(layer.doubledDay, DOUBLED_DAY_CHOICES, `${label}: doubledDay`);
	assertOptionalChoice(layer.skippedDay, SKIPPED_DAY_CHOICES, `${label}: skippedDay`);
	assertOptionalChoice(layer.leapMonth, LEAP_MONTH_CHOICES, `${label}: leapMonth`);

	const remove = idList(layer.remove, "remove");
	const replace = idsOf(layer.replace, "replace");
	const add = idsOf(layer.add, "add");
	const removeLevels = idList(layer.removeLevels, "removeLevels");
	const addLevels = idsOf(layer.addLevels, "addLevels");
	assertNoRepeats(
		[
			["remove", remove],
			["replace", replace.map((r) => r.id)],
			["add", add.map((r) => r.id)],
		],
		label,
	);
	assertNoRepeats(
		[
			["removeLevels", removeLevels],
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
	for (const { id } of add) {
		if (baseRuleIds.has(id)) {
			throw rangeError(
				CODE,
				`${label}: add names "${id}", which the base already has; use replace to change it`,
			);
		}
	}

	const baseLevels = base.levels ?? [];
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
	for (const { id } of addLevels) {
		if (baseLevelIds.has(id)) {
			throw rangeError(CODE, `${label}: addLevels names "${id}", which the base already declares`);
		}
	}

	const replacements = new Map(replace.map(({ id, item }) => [id, item as ObservanceRule]));
	const rules: ObservanceRule[] = [
		...base.rules
			.filter((rule) => !removed.has(rule.id))
			.map((rule) => replacements.get(rule.id) ?? rule),
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

	const levels: ObservanceLevel[] | undefined =
		base.levels === undefined && addLevels.length === 0
			? undefined
			: [
					...baseLevels.filter((level) => !removedLevels.has(level.id)),
					...addLevels.map(({ item }) => item as ObservanceLevel),
				];

	// Validated before it is copied: `structuredClone` throws an uncoded error on a function or a
	// Symbol, and only a value the validator has accepted is safe to hand it.
	const candidate: ObservanceConfig = {
		id: layer.id,
		englishName: layer.englishName,
		...(layer.tibetanName === undefined ? {} : { tibetanName: layer.tibetanName }),
		doubledDay: layer.doubledDay === undefined ? base.doubledDay : layer.doubledDay,
		skippedDay: layer.skippedDay === undefined ? base.skippedDay : layer.skippedDay,
		leapMonth: layer.leapMonth === undefined ? base.leapMonth : layer.leapMonth,
		...(levels === undefined ? {} : { levels }),
		rules,
	};
	ensureValidated(candidate);

	// `deepFreeze` recurses, so freezing anything that still shares an object with a caller's input
	// would freeze the caller's own object.
	const result = deepFreeze(structuredClone(candidate));
	ensureValidated(result);
	return result;
}
