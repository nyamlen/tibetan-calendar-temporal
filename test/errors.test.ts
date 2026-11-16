import { describe, expect, it } from "vitest";
import {
	assertQueryOptions,
	describe as describeValue,
	type PrivateCopySpec,
	rangeError,
	validatedPrivateCopy,
} from "../src/errors.js";
import { addMonthsToDate } from "../src/index.js";
import { getObservances } from "../src/observances/index.js";
import { thrownBy } from "./support/thrown.js";

const LOSAR = { year: 2153, month: 1, day: 1 };
const ISO = Temporal.PlainDate.from("2026-02-18");

const throwing = () => {
	throw new Error("trap");
};
const revokedProxy = () => {
	const { proxy, revoke } = Proxy.revocable({}, {});
	revoke();
	return proxy;
};

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

	// Part B of the tradition-parameter plan, 2026-09-24: every guard renders its input through
	// this, so a throw here — or a non-string return, which the caller's template then throws on —
	// is an uncoded escape from every one of them at once.
	it.each([
		["a revoked Proxy", revokedProxy],
		["a Proxy whose get trap throws", () => new Proxy({}, { get: throwing })],
		[
			"an object whose constructor.name is a Symbol",
			() => ({ constructor: { name: Symbol("x") } }),
		],
		["an object with no prototype", () => Object.create(null)],
	])("renders %s as a string without throwing", (_, make) => {
		const value: unknown = make();
		let rendered: unknown;
		expect(() => {
			rendered = describeValue(value);
		}).not.toThrow();
		expect(rendered).toBe("an object");
	});

	it.each([
		[
			"a function whose name getter throws",
			() =>
				Object.defineProperty(() => 1, "name", {
					get() {
						throw new Error("n");
					},
				}),
		],
		[
			"a function whose name is a Symbol",
			() => Object.defineProperty(() => 1, "name", { value: Symbol("x") }),
		],
		["a function Proxy whose get trap throws", () => new Proxy(() => 1, { get: throwing })],
		[
			"a revoked function Proxy",
			() => {
				const { proxy, revoke } = Proxy.revocable(() => 1, {});
				revoke();
				return proxy;
			},
		],
	])("renders %s as a string without throwing", (_, make) => {
		const value: unknown = make();
		let rendered: unknown;
		expect(() => {
			rendered = describeValue(value);
		}).not.toThrow();
		expect(rendered).toBe("a function");
	});

	it("renders a Symbol by its description, which a template literal cannot", () => {
		expect(describeValue(Symbol("x"))).toBe("Symbol(x)");
	});
});

describe("the options guards' messages", () => {
	// Found by review 2026-09-24: each built its message with JSON.stringify, which throws on a
	// bigint, so these escaped as an uncoded TypeError instead of the guard's own code.
	it.each([
		["addMonthsToDate's bag", () => addMonthsToDate(LOSAR, 1, 10n as never)],
		["addMonthsToDate's overflow", () => addMonthsToDate(LOSAR, 1, { overflow: 10n as never })],
	])("refuses a bigint in %s with a code", (_, call) => {
		expect(thrownBy(call)?.code).toBe("TCT_INVALID_ARGUMENT");
	});
});

describe("the observance config guard's message", () => {
	// A bigint in the config position was a bag-guard case until 2026-11-11, when the config became
	// a required positional parameter; it is now the config validator's, which renders through
	// `describe` and so must not throw on a bigint either.
	it("refuses a bigint in getObservances' config position with its own code", () => {
		expect(thrownBy(() => getObservances(ISO, ISO, 10n as never))?.code).toBe(
			"TCT_INVALID_OBSERVANCE_CONFIG",
		);
	});
});

describe("assertQueryOptions refuses keys it does not recognise", () => {
	// Decided 2026-09-24 with the tradition-parameter pattern: every bag accepted unknown keys, so
	// `addMonthsToDate(f, 0, { tradition: BHUTAN })` — then a key the bag did not have — answered
	// Phugpa's date silently. This guard is for bags; a TraditionConfig and an ObservanceConfig refuse
	// unknown keys through their own validators.
	const refuse = (options: unknown) =>
		thrownBy(() => assertQueryOptions<{ a?: unknown; b?: unknown }>("f", ["a", "b"], options));

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

	// Found by Part A's final review, 2026-09-24: the key walk calls a Proxy's ownKeys and
	// getPrototypeOf traps, so a bag whose trap throws escaped uncoded where before it answered.
	it.each([
		["ownKeys", { ownKeys: throwing }],
		["getPrototypeOf", { getPrototypeOf: throwing }],
		["getOwnPropertyDescriptor", { getOwnPropertyDescriptor: throwing }],
	])("refuses with a code a Proxy bag whose %s trap throws", (_, handler) => {
		expect(refuse(new Proxy({ a: 1 }, handler))?.code).toBe("TCT_INVALID_ARGUMENT");
	});

	// Found by the Part B review, 2026-09-24: the walk never calls `get`, so a bag whose `get` trap
	// or allowed-key getter throws passed the guard and escaped when the call site read it. The guard
	// now reads the allowed keys itself and hands back a snapshot.
	it.each([
		["a Proxy whose get trap throws", () => new Proxy({ a: 1 }, { get: throwing })],
		[
			"an allowed key whose getter throws",
			() => ({
				get a() {
					return throwing();
				},
			}),
		],
	])("refuses with a code %s", (_, make) => {
		expect(refuse(make())?.code).toBe("TCT_INVALID_ARGUMENT");
	});

	it("returns a snapshot of the allowed keys, inherited ones included", () => {
		const snapshot = assertQueryOptions<{ a?: unknown; b?: unknown }>(
			"f",
			["a", "b"],
			Object.create({ a: 1 }),
		);
		expect(snapshot).toEqual({ a: 1, b: undefined });
		expect(Object.getPrototypeOf(snapshot)).toBe(Object.prototype);
	});

	it("refuses with a code a revoked Proxy as the bag", () => {
		expect(refuse(revokedProxy())?.code).toBe("TCT_INVALID_ARGUMENT");
	});

	it("keeps the error the caller's code threw in its message", () => {
		const message = refuse(new Proxy({ a: 1 }, { ownKeys: throwing }))?.message ?? "";
		expect(message).toContain("trap");
	});

	it("refuses with a code a trap that throws a revoked Proxy rather than an Error", () => {
		const thrower = new Proxy(
			{ a: 1 },
			{
				ownKeys: () => {
					throw revokedProxy();
				},
			},
		);
		expect(refuse(thrower)?.code).toBe("TCT_INVALID_ARGUMENT");
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

describe("validatedPrivateCopy", () => {
	const CODE = "TCT_INVALID_ARGUMENT";
	const spec = (
		over: Partial<PrivateCopySpec<{ n: number }>> = {},
	): PrivateCopySpec<{ n: number }> => ({
		cache: new WeakMap(),
		code: CODE,
		what: "the thing",
		isCandidate: () => true,
		validate: (value) => {
			if (value.n !== 1) throw rangeError(CODE, "bad n");
		},
		uncopyable: () => "could not be copied",
		...over,
	});

	it("reads the cache lookup under the guard, so a throwing candidate test is coded with its cause", () => {
		const boom = new Error("lookup");
		const error = thrownBy(() =>
			validatedPrivateCopy(
				{ n: 1 },
				spec({
					isCandidate: () => {
						throw boom;
					},
				}),
			),
		);
		expect(error?.code).toBe(CODE);
		expect(error?.message).toMatch(/^the thing could not be read/);
		expect(error?.cause).toBe(boom);
	});

	it("recodes a DataCloneError and passes any other clone failure through under the guard", () => {
		const error = thrownBy(() => validatedPrivateCopy({ n: 1, f: () => 1 } as never, spec()));
		expect(error?.code).toBe(CODE);
		expect(error?.message).toBe("could not be copied");
	});

	it("returns a frozen copy, caches it for both objects, and does not cache a refusal", () => {
		const options = spec();
		const config = { n: 1 };
		const copy = validatedPrivateCopy(config, options);
		expect(copy).not.toBe(config);
		expect(Object.isFrozen(copy)).toBe(true);
		expect(validatedPrivateCopy(config, options)).toBe(copy);
		expect(validatedPrivateCopy(copy, options)).toBe(copy);
		const bad = { n: 2 };
		expect(thrownBy(() => validatedPrivateCopy(bad, options))?.message).toBe("bad n");
		expect(options.cache.has(bad)).toBe(false);
	});

	it("does not cache a config whose copy is refused, and refuses it again", () => {
		const options = spec();
		let reads = 0;
		const config = {
			get n() {
				return reads++ === 0 ? 1 : 2;
			},
		};
		expect(thrownBy(() => validatedPrivateCopy(config, options))?.message).toBe("bad n");
		expect(options.cache.has(config)).toBe(false);
		expect(thrownBy(() => validatedPrivateCopy(config, options))?.message).toBe("bad n");
	});
});
