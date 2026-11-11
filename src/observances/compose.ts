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

function assertDistinct(ids: readonly string[], field: string): void {
	const seen = new Set<string>();
	for (const id of ids) {
		if (seen.has(id)) {
			throw rangeError(CODE, `${SUBJECT}: ${field} names "${id}" twice`);
		}
		seen.add(id);
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
 * in the order given. `add` is checked against the base **after** `remove`, so a rule removed in
 * a layer may be added back in it; `replace` is how to change a rule that stays.
 *
 * **Levels** keep the base's order minus `removeLevels`, then `addLevels` follow in the order given.
 * There is no reordering. A level a remaining rule still names cannot be removed.
 *
 * **Nothing the caller passed in is changed or frozen**, however deep: the result is built from
 * copies, so a base the caller owns stays theirs to edit, and an object in the layer is never an
 * object in the result. Composing is a configuration-time operation, not one for every render.
 *
 * @param base - A complete configuration, shipped or the caller's own.
 * @param layer - The differences; its keys are those of {@link ObservanceLayer} and no others.
 * @throws RangeError with code `TCT_INVALID_OBSERVANCE_CONFIG`, naming the offending id or key, for
 *   a `base` or `layer` that is not an object or is malformed; an unknown layer key; a `remove` or
 *   `replace` naming a rule the base does not have; an `add` naming a rule it keeps; an id
 *   twice in one list; a `removeLevels` naming an undeclared level; a level removed while a
 *   remaining rule names it; a rule naming a level that is not declared; an added level that
 *   exists; and any rule or level the validator refuses.
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
	assertDistinct(remove, "remove");
	assertDistinct(
		replace.map((r) => r.id),
		"replace",
	);
	assertDistinct(
		add.map((r) => r.id),
		"add",
	);
	assertDistinct(removeLevels, "removeLevels");
	assertDistinct(
		addLevels.map((l) => l.id),
		"addLevels",
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
		if (removed.has(id)) {
			throw rangeError(CODE, `${label}: "${id}" is both removed and replaced`);
		}
	}
	for (const { id } of add) {
		if (baseRuleIds.has(id) && !removed.has(id)) {
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
		if (baseLevelIds.has(id) && !removedLevels.has(id)) {
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
	const readded = new Set(addLevels.map(({ id }) => id));
	for (const rule of rules) {
		if (
			typeof rule.level === "string" &&
			removedLevels.has(rule.level) &&
			!readded.has(rule.level)
		) {
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
