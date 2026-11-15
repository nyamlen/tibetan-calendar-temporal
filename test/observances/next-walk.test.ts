import { describe, expect, it, vi } from "vitest";
import { codedError } from "../../src/errors.js";
import { EXAMPLE_OBSERVANCES, nextObservance } from "../../src/observances/index.js";
import { thrownBy } from "../support/thrown.js";

const occurrences = vi.hoisted(() => ({ code: undefined as string | undefined }));

vi.mock("../../src/observances/occurrences.js", async (importOriginal) => {
	const original = await importOriginal<typeof import("../../src/observances/occurrences.js")>();
	return {
		...original,
		occurrencesOfRule: (...args: Parameters<typeof original.occurrencesOfRule>) => {
			if (occurrences.code !== undefined) throw codedError(occurrences.code as never, "injected");
			return original.occurrencesOfRule(...args);
		},
	};
});

describe("nextObservance's search, a failure that is not the range code", () => {
	const from = Temporal.PlainDate.from("2026-01-01");

	it("finds the rule normally with the injection off (control)", () => {
		occurrences.code = undefined;
		expect(
			nextObservance(from, EXAMPLE_OBSERVANCES.rules[0]?.id ?? "", EXAMPLE_OBSERVANCES),
		).not.toBeNull();
	});

	it("rethrows it rather than reading it as an empty chunk", () => {
		occurrences.code = "TCT_INTERNAL";
		const id = EXAMPLE_OBSERVANCES.rules[0]?.id ?? "";
		expect(thrownBy(() => nextObservance(from, id, EXAMPLE_OBSERVANCES))?.code).toBe(
			"TCT_INTERNAL",
		);
		occurrences.code = undefined;
	});

	it("still treats the range code as an empty chunk, not an error", () => {
		occurrences.code = "TCT_OUTSIDE_EXACT_RANGE";
		const id = EXAMPLE_OBSERVANCES.rules[0]?.id ?? "";
		expect(thrownBy(() => nextObservance(from, id, EXAMPLE_OBSERVANCES))?.code).toBeUndefined();
		occurrences.code = undefined;
	});
});
