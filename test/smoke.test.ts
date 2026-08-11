import { describe, expect, it } from "vitest";

// Everything in Phase 1 rests on native Temporal being reachable from a test run.
// If this fails, the Node version or the tsconfig `lib` setting is wrong — not the
// calendar maths.
describe("environment", () => {
	it("exposes Temporal as a global", () => {
		expect(typeof Temporal).toBe("object");
	});

	it("round-trips a PlainDate through ISO 8601", () => {
		expect(Temporal.PlainDate.from("2026-02-17").toString()).toBe("2026-02-17");
	});
});
