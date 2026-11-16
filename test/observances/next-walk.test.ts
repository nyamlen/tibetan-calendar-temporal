import { afterEach, describe, expect, it, vi } from "vitest";
import { codedError } from "../../src/errors.js";
import { EXAMPLE_OBSERVANCES, nextObservance } from "../../src/observances/index.js";
import { thrownBy } from "../support/thrown.js";

const occurrences = vi.hoisted(() => ({ code: undefined as string | undefined, calls: 0 }));

vi.mock("../../src/observances/occurrences.js", async (importOriginal) => {
	const original = await importOriginal<typeof import("../../src/observances/occurrences.js")>();
	return {
		...original,
		occurrencesOfRule: (...args: Parameters<typeof original.occurrencesOfRule>) => {
			occurrences.calls += 1;
			if (occurrences.code !== undefined) throw codedError(occurrences.code as never, "injected");
			return original.occurrencesOfRule(...args);
		},
	};
});

describe("nextObservance's search, a failure that is not the range code", () => {
	const from = Temporal.PlainDate.from("2026-01-01");
	const id = EXAMPLE_OBSERVANCES.rules[0]?.id ?? "";

	afterEach(() => {
		occurrences.code = undefined;
		occurrences.calls = 0;
	});

	it("finds the rule normally with the injection off (control)", () => {
		expect(nextObservance(from, id, EXAMPLE_OBSERVANCES)).not.toBeNull();
	});

	it("rethrows it rather than reading it as an empty chunk", () => {
		occurrences.code = "TCT_INTERNAL";
		expect(thrownBy(() => nextObservance(from, id, EXAMPLE_OBSERVANCES))?.code).toBe(
			"TCT_INTERNAL",
		);
	});

	it("still treats the range code as the end of the search, not an error", () => {
		occurrences.code = "TCT_OUTSIDE_EXACT_RANGE";
		expect(nextObservance(from, id, EXAMPLE_OBSERVANCES)).toBeNull();
	});

	it("stops at the first day that meets the range end instead of bisecting every chunk", () => {
		occurrences.code = "TCT_OUTSIDE_EXACT_RANGE";
		expect(nextObservance(from, id, EXAMPLE_OBSERVANCES)).toBeNull();
		// One walk down the first chunk's earlier halves to a single day, then nothing more.
		expect(occurrences.calls).toBeLessThanOrEqual(12);
	});
});
