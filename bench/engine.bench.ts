import { bench, describe } from "vitest";
import { isoToTibetan } from "../src/computation/conversion.js";
import { monthsFor } from "../src/months.js";
import { getObservances } from "../src/observances/index.js";
import { PHUGPA } from "../src/traditions/phugpa.js";

/**
 * Release-time benchmarks. Not in CI, and deliberately not a regression gate — shared runners are
 * noisy enough that a threshold would fire on the runner rather than on the change, and a guard
 * that fires wrongly is worse than none.
 *
 * Each case exists because a number is already load-bearing somewhere and nothing measures it:
 *
 * - `getObservances` over its maximum admissible span justifies `MAX_SPAN_YEARS`, and therefore
 *   the `TCT_SPAN_TOO_WIDE` error a consumer can hit. `src/observances/index.ts` puts it at
 *   "about 190 ms". A materially different figure is a finding about that cap, not a benchmark to
 *   tune.
 * - `monthsFor`'s cache is the one memoisation whose keep is argued from a number (`CLAUDE.md`:
 *   "~180 µs to under 1 µs"), and that number has never had a harness.
 * - Single-date conversion is the only figure the README quotes, so it is the only one that has to
 *   be reproducible by a reader.
 *
 * Record results in `bench/RESULTS.md` with the machine, OS and Node version. A number without its
 * harness is what this project treats as unusable, and that applies to its own numbers first.
 */

const iso = (s: string) => Temporal.PlainDate.from(s);

describe("conversion", () => {
	const date = iso("2026-08-12");

	bench("isoToTibetan, one date", () => {
		isoToTibetan(date);
	});

	bench("isoToTibetan, one year of days", () => {
		let day = iso("2026-01-01");
		const end = iso("2026-12-31");
		while (Temporal.PlainDate.compare(day, end) <= 0) {
			isoToTibetan(day);
			day = day.add({ days: 1 });
		}
	});
});

describe("monthsFor cache", () => {
	// The cold case must not be allowed to hit the cache, so each iteration asks for a year no
	// previous iteration used. Reusing one year would measure the warm path twice and report the
	// cache as free.
	let cold = 3000;

	bench("cold — a year not seen before", () => {
		monthsFor(cold++, PHUGPA);
	});

	bench("warm — a year already computed", () => {
		monthsFor(2153, PHUGPA);
	});
});

describe("getObservances", () => {
	bench("the maximum admissible span, 200 years", () => {
		getObservances(iso("1900-01-01"), iso("2099-12-31"));
	});

	bench("one year, the realistic case", () => {
		getObservances(iso("2026-01-01"), iso("2026-12-31"));
	});
});
