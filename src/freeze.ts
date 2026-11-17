/**
 * Deep-freezing for the configuration objects this package exports, and for every `TibetanMonth` it
 * returns, which `describeMonth` freezes because `monthsFor` hands the same objects to every caller.
 *
 * @remarks
 * `TraditionConfig` and `ObservanceConfig` are `readonly` throughout, which is a **compile-time**
 * claim and nothing more; freezing makes a write to a shipped config, such as `PHUGPA.moonTab[4]` or
 * `EXAMPLE_OBSERVANCES.rules.push`, throw in strict mode instead of changing what every later
 * caller in the process sees. The engine reads a private frozen copy of any config it validates, so
 * a consumer's own object cannot reach it.
 *
 * @packageDocumentation
 */
// A JavaScript consumer, a TypeScript one holding the value as `any`, or any transitive dependency
// reaching the module registry can otherwise assign to a shipped config, and "same input, same
// output, no side effects" stops being true for every caller in the process. Two things make it
// worth enforcing. These are the objects the documentation *tells* consumers to
// reach for — the README shows `{ ...PHUGPA, … }` as the way to build a config — so a keystroke away
// from a spread is an assignment to the shared singleton. And they are shared
// singletons: a mutation of `PHUGPA` itself would be seen by every later spread, and by the copy of
// every config spread from it afterwards.

/**
 * Recursively freezes an object and every object reachable from it through own string-keyed
 * properties.
 *
 * @remarks
 * Idempotent, and it does **not descend into an object that is already frozen**, so an object frozen
 * shallowly keeps its unfrozen children. That is what lets `PHUGPA_HENNING`, which spreads `PHUGPA`,
 * share its frozen correction tables by reference. Functions and symbol-keyed properties are left
 * alone; a getter is invoked and its result frozen; a `Map` or `Set` is frozen as a shell, not its
 * entries; a non-empty typed array throws `TypeError`, as `Object.freeze` does.
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
