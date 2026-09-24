import { describe, expect, it } from "vitest";
import { describe as describeValue } from "../src/errors.js";
import { addMonthsToDate, monthNamesFor } from "../src/index.js";
import { getObservances } from "../src/observances/index.js";
import { thrownBy } from "./support/thrown.js";

const LOSAR = { year: 2153, month: 1, day: 1 };
const ISO = Temporal.PlainDate.from("2026-02-18");

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

describe("the options guards' messages", () => {
	// Found by review 2026-09-24: each built its message with JSON.stringify, which throws on a
	// bigint, so these escaped as an uncoded TypeError instead of the guard's own code.
	it.each([
		["addMonthsToDate's bag", () => addMonthsToDate(LOSAR, 1, 10n as never)],
		["addMonthsToDate's overflow", () => addMonthsToDate(LOSAR, 1, { overflow: 10n as never })],
		["getObservances' bag", () => getObservances(ISO, ISO, 10n as never)],
		["monthNamesFor's bag", () => monthNamesFor({ year: 2153, month: 1 }, 10n as never)],
	])("refuses a bigint in %s with a code", (_, call) => {
		expect(thrownBy(call)?.code).toBe("TCT_INVALID_ARGUMENT");
	});
});
