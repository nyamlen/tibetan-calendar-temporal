/**
 * Deep-freezing for the configuration objects this package exports.
 *
 * @remarks
 * `TraditionConfig` and `ObservanceConfig` are `readonly` throughout, which is a **compile-time**
 * claim and nothing more. A JavaScript consumer, a TypeScript one holding the value as `any`, or
 * any transitive dependency reaching the module registry can assign to `PHUGPA.moonTab[4]` or push
 * onto `GELUG.rules`, and "same input, same output, no side effects" stops being true for every
 * caller in the process.
 *
 * That is ordinary hygiene anywhere. Two things make it worth enforcing here.
 *
 * The first is that these are the objects the documentation *tells* consumers to reach for.
 * `{ ...PHUGPA, lunarAnomaly: … }` appears in `CLAUDE.md`, the README, `docs/architecture.md` and
 * three doc comments, so a keystroke away from a spread is an assignment to the shared singleton.
 *
 * The second is that the memoisation hides it. `scalingFor` caches derived scaling on the config
 * **object**, and the two validators memoise on `WeakSet`s keyed the same way, so a mutation after
 * first use is neither revalidated nor rescaled. The result is not "the new constants" but a
 * partially stale mix — a new `moonTab` beside a `commonDenominator` derived from the old one —
 * which is worse than either consistently. The doc comments that call this an accepted bargain are
 * right about consumer-supplied configs and were wrong about ours; freezing is what makes the
 * bargain true as written.
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
