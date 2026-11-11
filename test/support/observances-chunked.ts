import type { TraditionConfig } from "../../src/index.js";
import type { Observance, ObservanceConfig } from "../../src/observances/index.js";
import { getObservances } from "../../src/observances/index.js";

/**
 * The widest span `getObservances` admits, in years, as the test suite knows it.
 *
 * @remarks
 * The cap is internal to `src/observances/index.ts` and not exported, so this is a copy, and
 * `test/observances/index.test.ts` asserts that a range of exactly this many years is admitted and
 * one year more is refused, so the two cannot drift apart silently.
 */
export const OBSERVANCE_SPAN_CAP_YEARS = 10;

/**
 * `getObservances` over any range, by splitting it into consecutive admissible spans.
 *
 * @remarks
 * Takes the arguments of `getObservances` and returns what one wide call would. Each chunk runs
 * from a given day to 31 December of the year `OBSERVANCE_SPAN_CAP_YEARS` later, and the next
 * begins on the following day, so a day belongs to exactly one chunk: nothing is duplicated or lost
 * at a boundary, including both halves of a doubled day under `doubledDay: "both"`.
 * `test/observances/chunked.test.ts` proves that against a single call.
 */
export function getObservancesChunked(
	from: Temporal.PlainDate,
	to: Temporal.PlainDate,
	config: ObservanceConfig,
	tradition?: TraditionConfig,
): Observance[] {
	const found: Observance[] = [];
	let start = from;
	while (Temporal.PlainDate.compare(start, to) <= 0) {
		const limit = Temporal.PlainDate.from({
			year: start.year + OBSERVANCE_SPAN_CAP_YEARS,
			month: 12,
			day: 31,
		});
		const end = Temporal.PlainDate.compare(limit, to) < 0 ? limit : to;
		found.push(...getObservances(start, end, config, tradition));
		start = end.add({ days: 1 });
	}
	return found;
}
