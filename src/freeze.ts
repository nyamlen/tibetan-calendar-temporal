/**
 * Deep-freezing for the configuration objects this package exports, and for every `TibetanMonth` it
 * returns, which `describeMonth` freezes because `monthsFor` hands the same objects to every caller.
 *
 * @remarks
 * `TraditionConfig` and `ObservanceConfig` are `readonly` throughout, which is a **compile-time**
 * claim and nothing more. A JavaScript consumer, a TypeScript one holding the value as `any`, or
 * any transitive dependency reaching the module registry can assign to `PHUGPA.moonTab[4]` or push
 * onto `EXAMPLE_OBSERVANCES.rules`, and "same input, same output, no side effects" stops being
 * true for every caller in the process.
 *
 * That is ordinary hygiene anywhere. Two things make it worth enforcing here.
 *
 * The first is that these are the objects the documentation *tells* consumers to reach for.
 * `{ ...PHUGPA, lunarAnomaly: … }` appears in `CLAUDE.md`, the README, `docs/architecture.md` and
 * three doc comments, so a keystroke away from a spread is an assignment to the shared singleton.
 *
 * The second is that these are shared singletons. The engine reads a private frozen copy of any
 * config it validates, so a consumer's own object cannot reach it; but a mutation of `PHUGPA`
 * itself would be seen by every later spread, and by the copy of every config spread from it
 * afterwards. Freezing is what stops the shared object being written to at all.
 *
 * Free now, breaking later: a consumer who ships `PHUGPA.moonTab.sort()` against v1.0.0 would
 * break on the release that adds this.
 *
 * @packageDocumentation
 */

/**
 * Recursively freezes an object and every plain object and array reachable from it.
 *
 * @remarks
 * Idempotent, and skips anything already frozen — which matters because `PHUGPA_HENNING` spreads
 * `PHUGPA` and therefore shares its frozen correction tables by reference.
 *
 * @returns The same object, so this reads as a wrapper at the point of definition.
 */
export function deepFreeze<T>(value: T): T {
	if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
	Object.freeze(value);
	for (const key of Object.getOwnPropertyNames(value)) {
		deepFreeze((value as Record<string, unknown>)[key]);
	}
	return value;
}
