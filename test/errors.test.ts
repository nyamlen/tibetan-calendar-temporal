import { describe, expect, it } from "vitest";
import { describe as describeValue } from "../src/errors.js";

describe("describe", () => {
	// Boundary review, 2026-09-23, minor 3: its promise is "unambiguously — `"3"` is not `3`", and
	// a bigint rendered through String() broke exactly that promise.
	it("keeps a bigint distinct from a number and a string", () => {
		expect(describeValue(10n)).toBe("10n");
		expect(describeValue(10)).toBe("10");
		expect(describeValue("10")).toBe('"10"');
	});

	it("names a function rather than printing its source", () => {
		function namedGuard() {
			return "source text that must not reach a message";
		}
		expect(describeValue(namedGuard)).toBe("function namedGuard");
		expect(describeValue([() => 1][0])).toBe("a function");
	});
});
