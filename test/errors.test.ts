import { describe, expect, it } from "vitest";
import { assertQueryOptions, describe as describeValue } from "../src/errors.js";
import { addMonthsToDate } from "../src/index.js";
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
	])("refuses a bigint in %s with a code", (_, call) => {
		expect(thrownBy(call)?.code).toBe("TCT_INVALID_ARGUMENT");
	});
});

describe("assertQueryOptions refuses keys it does not recognise", () => {
	// Decided 2026-09-24 with the tradition-parameter pattern: every bag accepted unknown keys, so
	// `addMonthsToDate(f, 0, { tradition: BHUTAN })` — then a key the bag did not have — answered
	// Phugpa's date silently. Bags only: a TraditionConfig or ObservanceConfig may carry extra keys.
	const refuse = (options: unknown) => thrownBy(() => assertQueryOptions("f", ["a", "b"], options));

	it("names the unknown key and builds the shape from the allowed list", () => {
		const error = refuse({ a: 1, c: 2 });
		expect(error?.code).toBe("TCT_INVALID_ARGUMENT");
		expect(error?.message).toContain('"c"');
		expect(error?.message).toContain("{ a, b }");
		// The non-object message uses the same built shape, so the two cannot drift apart.
		expect(refuse(null)?.message).toContain("{ a, b }");
	});

	it("refuses an unknown key whatever its value, undefined included", () => {
		expect(refuse({ c: undefined })?.code).toBe("TCT_INVALID_ARGUMENT");
	});

	it("refuses an inherited enumerable key, which a read of options.c would honour", () => {
		expect(refuse(Object.create({ c: 1 }))?.code).toBe("TCT_INVALID_ARGUMENT");
	});

	it("ignores a key some other library made enumerable on Object.prototype", () => {
		// Found by the branch's final review, 2026-09-24: a bare `for…in` visits Object.prototype too,
		// so one polluting dependency made every bag function throw — even called with no options,
		// since the default `{}` inherits the key. The walk stops there; a caller's own prototype is
		// still checked, which is what refuses `Object.create({ config })`.
		Object.defineProperty(Object.prototype, "polluted", {
			value: 1,
			enumerable: true,
			configurable: true,
			writable: true,
		});
		try {
			expect(refuse({})).toBeUndefined();
			expect(refuse({ a: 1 })).toBeUndefined();
			expect(refuse(Object.create({ c: 1 }))?.code).toBe("TCT_INVALID_ARGUMENT");
		} finally {
			delete (Object.prototype as Record<string, unknown>).polluted;
		}
	});

	it("ignores symbol keys, which no caller writes by mistake", () => {
		expect(refuse({ a: 1, [Symbol("c")]: 2 })).toBeUndefined();
	});

	it("accepts the allowed keys, an empty bag, and a bag with no prototype", () => {
		expect(refuse({ a: 1, b: 2 })).toBeUndefined();
		expect(refuse({})).toBeUndefined();
		expect(refuse(Object.assign(Object.create(null), { a: 1 }))).toBeUndefined();
	});
});
