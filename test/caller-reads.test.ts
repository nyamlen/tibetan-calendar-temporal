import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as astrologyApi from "../src/astrology/index.js";
import {
	attributesFor,
	calendarDayAttributesFor,
	elementalYogaFor,
	lunarDayAttributesFor,
	lunarMansionFor,
	monthAttributesFor,
} from "../src/astrology/index.js";
import * as rootApi from "../src/index.js";
import {
	addDays,
	addMonths,
	addMonthsToDate,
	datesFor,
	daysBetween,
	daysInMonth,
	formatTibetanDate,
	formatTibetanMonth,
	isoToTibetan,
	lunationFromMonth,
	monthNamesFor,
	monthsBetween,
	nextFullMoon,
	nextNewMoon,
	PHUGPA,
	resolveDate,
	resolveMonth,
	SkippedDayError,
	tibetanDateExists,
	tibetanToIso,
} from "../src/index.js";
import * as observancesApi from "../src/observances/index.js";
import { EXAMPLE_OBSERVANCES, observancesOn } from "../src/observances/index.js";
import { thrownBy } from "./support/thrown.js";

// What a caller's own code can do while this package reads their argument: a getter that answers
// differently each time, a getter or a Proxy trap that throws. Every export taking a Tibetan date or
// month is held to reading each field once, so what was validated is what is computed on.

const LOSAR = { year: 2153, month: 1, day: 1 };
const MONTH = { year: 2153, month: 1 };
const ISO = Temporal.PlainDate.from("2026-02-18");

type DateField = "year" | "month" | "day" | "isLeapMonth" | "isLeapDay";
type Shape = "date" | "month";

const FIELDS: Record<Shape, readonly DateField[]> = {
	date: ["year", "month", "day", "isLeapMonth", "isLeapDay"],
	month: ["year", "month", "isLeapMonth", "isLeapDay"],
};

const VALID: Record<DateField, unknown> = {
	year: 2153,
	month: 12,
	day: 8,
	isLeapMonth: false,
	isLeapDay: false,
};

// `fields` names which fields it carries, and `behave` decides what each read answers.
const counting = (
	fields: readonly DateField[],
	behave: (field: DateField, reads: number) => unknown,
) => {
	const reads: Record<string, number> = {};
	const object = {} as Record<string, unknown>;
	for (const field of fields) {
		reads[field] = 0;
		Object.defineProperty(object, field, {
			enumerable: true,
			get() {
				reads[field] = (reads[field] ?? 0) + 1;
				return behave(field, reads[field] ?? 0);
			},
		});
	}
	return { object, reads };
};

type Call = (first: unknown, second?: unknown) => unknown;

// Every export of the three barrels that takes a Tibetan date or month, with the shape it reads and
// which positions are such a value. Enumerated from the parameter types `TibetanDateFields` and
// `TibetanMonthFields` across src/, so a new one is added here by hand: a missed *call site* inside an
// export is what the branded snapshot type refuses at compile time, and a missing *export* is this list.
const v = (value: unknown) => value as never;
const EXPORTS: readonly (readonly [name: string, shape: Shape, positions: number, call: Call])[] = [
	["tibetanToIso", "date", 1, (a) => tibetanToIso(v(a))],
	["tibetanDateExists", "date", 1, (a) => tibetanDateExists(v(a))],
	["resolveDate", "date", 1, (a) => resolveDate(v(a))],
	["addDays", "date", 1, (a) => addDays(v(a), 1)],
	["addMonthsToDate", "date", 1, (a) => addMonthsToDate(v(a), 1)],
	["daysBetween", "date", 2, (a, b) => daysBetween(v(a), v(b ?? LOSAR))],
	["formatTibetanDate", "date", 1, (a) => formatTibetanDate(v(a))],
	["lunarDayAttributesFor", "date", 1, (a) => lunarDayAttributesFor(v(a))],
	["resolveMonth", "month", 1, (a) => resolveMonth(v(a))],
	["daysInMonth", "month", 1, (a) => daysInMonth(v(a))],
	["datesFor", "month", 1, (a) => datesFor(v(a))],
	["lunationFromMonth", "month", 1, (a) => lunationFromMonth(v(a))],
	["addMonths", "month", 1, (a) => addMonths(v(a), 1)],
	["monthsBetween", "month", 2, (a, b) => monthsBetween(v(a), v(b ?? MONTH))],
	["formatTibetanMonth", "month", 1, (a) => formatTibetanMonth(v(a))],
	["monthNamesFor", "month", 1, (a) => monthNamesFor(v(a))],
	["monthAttributesFor", "month", 1, (a) => monthAttributesFor(v(a))],
];

// An export taking two such values, called with the counting object second.
const secondOf = (name: string, shape: Shape, call: Call) =>
	(name === "daysBetween" || name === "monthsBetween") &&
	((x: unknown) => call(shape === "date" ? LOSAR : MONTH, x));

const show = (value: unknown) => JSON.stringify(value);

describe("every field of a Tibetan date or month is read exactly once", () => {
	it("holds for every export, at every position", () => {
		const wrong: string[] = [];
		for (const [name, shape, positions, call] of EXPORTS) {
			for (let position = 0; position < positions; position++) {
				const { object, reads } = counting(FIELDS[shape], (field) => VALID[field]);
				const second = secondOf(name, shape, call);
				const error = thrownBy(() => (position === 0 ? call(object) : (second as Call)(object)));
				if (error !== undefined) wrong.push(`${name}[${position}] threw ${error.message}`);
				for (const field of FIELDS[shape]) {
					if (reads[field] !== 1) wrong.push(`${name}[${position}] read ${field} ${reads[field]}×`);
				}
			}
		}
		expect(wrong).toEqual([]);
	});

	it("never reads a day for a month-shaped argument", () => {
		const wrong: string[] = [];
		for (const [name, , , call] of EXPORTS.filter(([, shape]) => shape === "month")) {
			const { object, reads } = counting([...FIELDS.month, "day"], (field) => VALID[field]);
			call(object);
			if (reads.day !== 0) wrong.push(`${name} read day ${reads.day}×`);
		}
		expect(wrong).toEqual([]);
	});
});

describe("a getter that answers differently on a later read", () => {
	// 8 for the first two reads and 31 after: validation saw 8, and the arithmetic used to see 31 —
	// a confident wrong date, 2027-02-07 where 8 is 2027-01-15.
	const SHIFTED: Record<DateField, [unknown, unknown]> = {
		year: [2153, 2154],
		month: [12, 11],
		day: [8, 31],
		isLeapMonth: [false, true],
		isLeapDay: [false, true],
	};

	it("is answered for the value it first gave, or refused, by every export", () => {
		const wrong: string[] = [];
		for (const [name, shape, positions, call] of EXPORTS) {
			for (const field of FIELDS[shape]) {
				for (let position = 0; position < positions; position++) {
					const [first, later] = SHIFTED[field];
					const { object } = counting(FIELDS[shape], (f, reads) =>
						f === field && reads > 2 ? later : f === field ? first : VALID[f],
					);
					const steady = { ...VALID, [field]: first } as Record<string, unknown>;
					const plain = Object.fromEntries(FIELDS[shape].map((f) => [f, steady[f]]));
					const second = secondOf(name, shape, call);
					const run = (value: unknown) => (position === 0 ? call(value) : (second as Call)(value));
					let expected: string;
					try {
						expected = show(run(plain));
					} catch {
						expected = "throws";
					}
					let actual: string;
					try {
						actual = show(run(object));
					} catch {
						actual = "throws";
					}
					if (actual !== expected && actual !== "throws") {
						wrong.push(
							`${name}[${position}] ${field}: ${actual.slice(0, 60)} ≠ ${expected.slice(0, 60)}`,
						);
					}
				}
			}
		}
		expect(wrong).toEqual([]);
	});

	it("pins the reported case by value: resolveDate answers 2027-01-15, not the 31", () => {
		const { object } = counting(FIELDS.date, (f, reads) =>
			f === "day" ? (reads <= 2 ? 8 : 31) : VALID[f],
		);
		expect(String(resolveDate(v(object)).isoDate)).toBe("2027-01-15");
		const second = counting(FIELDS.date, (f, reads) =>
			f === "day" ? (reads <= 2 ? 8 : 31) : VALID[f],
		);
		expect(String(tibetanToIso(v(second.object)))).toBe("2027-01-15");
		const third = counting(FIELDS.date, (f, reads) =>
			f === "day" ? (reads <= 2 ? 8 : 31) : VALID[f],
		);
		expect(String(addDays(v(third.object), 1).isoDate)).toBe("2027-01-16");
	});
});

describe("a getter or a Proxy trap that throws while a date or month is read", () => {
	const callerError = new TypeError("the caller's own getter");

	it("is refused with TCT_INVALID_ARGUMENT and the caller's error as the cause, for every field", () => {
		const wrong: string[] = [];
		for (const [name, shape, positions, call] of EXPORTS) {
			for (const field of FIELDS[shape]) {
				for (let position = 0; position < positions; position++) {
					const { object } = counting(FIELDS[shape], (f) => {
						if (f === field) throw callerError;
						return VALID[f];
					});
					const second = secondOf(name, shape, call);
					const error = thrownBy(() => (position === 0 ? call(object) : (second as Call)(object)));
					if (error?.code !== "TCT_INVALID_ARGUMENT" || error.cause !== callerError) {
						wrong.push(
							`${name}[${position}] ${field}: ${error?.constructor?.name} ${error?.code} cause ${String(error?.cause)}`,
						);
					}
				}
			}
		}
		expect(wrong).toEqual([]);
	});

	it("is rethrown by tibetanDateExists, not answered false", () => {
		const { object } = counting(FIELDS.date, (f) => {
			if (f === "day") throw callerError;
			return VALID[f];
		});
		const error = thrownBy(() => tibetanDateExists(v(object)));
		expect(error?.code).toBe("TCT_INVALID_ARGUMENT");
		expect(error?.cause).toBe(callerError);
	});

	it.each(["get", "has", "ownKeys", "getOwnPropertyDescriptor"] as const)(
		"is refused by every export when a Proxy's %s trap throws, with the trap's error as the cause",
		(trap) => {
			const wrong: string[] = [];
			for (const [name, shape, , call] of EXPORTS) {
				const target = Object.fromEntries(FIELDS[shape].map((f) => [f, VALID[f]]));
				const proxy = new Proxy(target, {
					[trap]: () => {
						throw callerError;
					},
				});
				const error = thrownBy(() => call(proxy));
				// A trap that a plain field read never reaches leaves the call answering.
				if (error === undefined) {
					if (trap === "get") wrong.push(`${name} answered`);
				} else if (error.code !== "TCT_INVALID_ARGUMENT" || error.cause !== callerError) {
					wrong.push(`${name}: ${error.code} cause ${String(error.cause)}`);
				}
			}
			expect(wrong).toEqual([]);
		},
	);

	it("is refused for a revoked Proxy", () => {
		const { proxy, revoke } = Proxy.revocable({}, {});
		revoke();
		expect(thrownBy(() => resolveDate(v(proxy)))?.code).toBe("TCT_INVALID_ARGUMENT");
	});
});

describe("the date a SkippedDayError carries", () => {
	it("is the fields that were read, equal to what was passed", () => {
		const skipped = { year: 2150, month: 12, day: 29 };
		const error = thrownBy(() => tibetanToIso(skipped));
		expect(error).toBeInstanceOf(SkippedDayError);
		expect((error as SkippedDayError).requested).toEqual(skipped);
	});
});

describe("a config whose own code throws while the validator reads it", () => {
	const callerError = new TypeError("the caller's own getter");
	const throwingTrap = () => {
		throw callerError;
	};
	const withGetter = <T extends object>(base: T, path: readonly string[]): T => {
		const copy = structuredClone(base) as Record<string, unknown>;
		let holder = copy;
		for (const key of path.slice(0, -1)) holder = holder[key] as Record<string, unknown>;
		Object.defineProperty(holder, path[path.length - 1] as string, {
			enumerable: true,
			configurable: true,
			get: throwingTrap,
		});
		return copy as T;
	};
	const revoked = (() => {
		const { proxy, revoke } = Proxy.revocable({}, {});
		revoke();
		return proxy;
	})();
	const useTradition = (tradition: unknown) => isoToTibetan(ISO, v(tradition));
	const useObservances = (config: unknown) => observancesOn(ISO, v(config));

	it.each([
		["a getter on a top-level field", () => withGetter(PHUGPA, ["epochYear"])],
		["a getter on a nested field", () => withGetter(PHUGPA, ["meanSun", "perDay", "num"])],
		["a getter inside a table", () => withGetter(PHUGPA, ["moonTab", "3"])],
		["a Proxy throwing from get", () => new Proxy(structuredClone(PHUGPA), { get: throwingTrap })],
		["a Proxy throwing from has", () => new Proxy({}, { has: throwingTrap })],
		[
			"a Proxy throwing from ownKeys",
			() => new Proxy(structuredClone(PHUGPA), { ownKeys: throwingTrap }),
		],
		[
			"a Proxy throwing from getOwnPropertyDescriptor",
			() => new Proxy(structuredClone(PHUGPA), { getOwnPropertyDescriptor: throwingTrap }),
		],
		["a revoked Proxy", () => revoked],
	])("TraditionConfig: %s is refused with its config code", (_, make) => {
		const error = thrownBy(() => useTradition(make()));
		expect(error?.code).toBe("TCT_INVALID_TRADITION_CONFIG");
		if (_ !== "a revoked Proxy") expect(error?.cause).toBeDefined();
	});

	it("TraditionConfig: the caller's own error is the cause of a getter's refusal", () => {
		const error = thrownBy(() => useTradition(withGetter(PHUGPA, ["epochYear"])));
		expect(error?.cause).toBe(callerError);
	});

	it.each([
		["a getter on a top-level field", () => withGetter(EXAMPLE_OBSERVANCES, ["englishName"])],
		[
			"a getter on a rule's field",
			() => withGetter(EXAMPLE_OBSERVANCES, ["rules", "0", "englishName"]),
		],
		["a getter on a rule's when", () => withGetter(EXAMPLE_OBSERVANCES, ["rules", "0", "when"])],
		[
			"a Proxy throwing from get",
			() => new Proxy(structuredClone(EXAMPLE_OBSERVANCES), { get: throwingTrap }),
		],
		["a Proxy throwing from has", () => new Proxy({}, { has: throwingTrap })],
		[
			"a Proxy throwing from ownKeys",
			() => new Proxy(structuredClone(EXAMPLE_OBSERVANCES), { ownKeys: throwingTrap }),
		],
		[
			"a Proxy throwing from getOwnPropertyDescriptor",
			() =>
				new Proxy(structuredClone(EXAMPLE_OBSERVANCES), { getOwnPropertyDescriptor: throwingTrap }),
		],
		["a revoked Proxy", () => revoked],
	])("ObservanceConfig: %s is refused with its config code", (_, make) => {
		const error = thrownBy(() => useObservances(make()));
		expect(error?.code).toBe("TCT_INVALID_OBSERVANCE_CONFIG");
	});

	it("ObservanceConfig: the caller's own error is the cause of a getter's refusal", () => {
		const error = thrownBy(() => useObservances(withGetter(EXAMPLE_OBSERVANCES, ["englishName"])));
		expect(error?.cause).toBe(callerError);
	});
});

// Where an export takes a date or month, found by reading the sources rather than by remembering:
// `export function name(params)` whose parameters name the type, kept where the name is a runtime
// export of one of the three barrels. A missing row is what the branded snapshot cannot see.
const SRC = join(import.meta.dirname, "..", "src");
const sourcesUnder = (dir: string): string[] =>
	readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
		entry.isDirectory()
			? sourcesUnder(join(dir, entry.name))
			: entry.name.endsWith(".ts")
				? [join(dir, entry.name)]
				: [],
	);
const BARRELS = new Set([
	...Object.keys(rootApi),
	...Object.keys(astrologyApi),
	...Object.keys(observancesApi),
]);
// The parameter list is read by matching parentheses, so a type such as `(x: T) => U` inside it
// does not end the list early.
const parametersAt = (text: string, open: number): string => {
	let depth = 0;
	for (let i = open; i < text.length; i++) {
		if (text[i] === "(") depth++;
		else if (text[i] === ")" && --depth === 0) return text.slice(open + 1, i);
	}
	throw new Error(`unbalanced parameter list at offset ${open}`);
};
const declaredFunctions = (): Map<string, string> => {
	const found = new Map<string, string>();
	for (const file of sourcesUnder(SRC)) {
		const text = readFileSync(file, "utf8");
		for (const match of text.matchAll(/export (?:async )?function (\w+)\s*(?:<[^(]*>)?\(/g)) {
			const open = match.index + match[0].length - 1;
			found.set(match[1] as string, parametersAt(text, open));
		}
	}
	return found;
};
const DECLARED = declaredFunctions();
const exportsTaking = (type: RegExp): string[] =>
	[...DECLARED]
		.filter(([name, parameters]) => BARRELS.has(name) && type.test(parameters))
		.map(([name]) => name)
		.sort();

describe("the scan for exports that take a date or month cannot pass by not seeing one", () => {
	const barrelValues = (api: Record<string, unknown>) =>
		Object.entries(api).filter(([, value]) => typeof value === "function");
	const classNames = new Set(
		sourcesUnder(SRC).flatMap((file) =>
			[...readFileSync(file, "utf8").matchAll(/export class (\w+)/g)].map((m) => m[1] as string),
		),
	);

	it("sees a declaration of every function the three barrels export", () => {
		const unseen = [rootApi, astrologyApi, observancesApi]
			.flatMap((api) => barrelValues(api as Record<string, unknown>))
			.map(([name]) => name)
			.filter((name) => !DECLARED.has(name) && !classNames.has(name));
		expect(unseen).toEqual([]);
	});

	it("reads a parameter list that holds its own parentheses", () => {
		const text = "export function f(a: (x: number) => string, b: TibetanDateFields): void {}";
		expect(parametersAt(text, text.indexOf("("))).toBe(
			"a: (x: number) => string, b: TibetanDateFields",
		);
	});
});

describe("the table of exports covers every export that takes a date or month", () => {
	it("is the set of barrel exports with a TibetanDateFields or TibetanMonthFields parameter", () => {
		expect([...new Set(EXPORTS.map(([name]) => name))].sort()).toEqual(
			exportsTaking(/\bTibetan(Date|Month)Fields\b/),
		);
	});
});

describe("a resolved TibetanDate is read once, for its isoDate", () => {
	const names = exportsTaking(/\bTibetanDate\b(?!Fields|Snapshot)/);
	const calls: Record<string, (date: unknown) => unknown> = {
		nextFullMoon: (d) => nextFullMoon(v(d)),
		nextNewMoon: (d) => nextNewMoon(v(d)),
		calendarDayAttributesFor: (d) => calendarDayAttributesFor(v(d)),
		elementalYogaFor: (d) => elementalYogaFor(v(d)),
		lunarMansionFor: (d) => lunarMansionFor(v(d)),
		attributesFor: (d) => attributesFor(v(d)),
	};

	it("has a row for each such export", () => {
		expect(Object.keys(calls).sort()).toEqual(names);
	});

	it("reads isoDate once, and refuses a throwing getter with the caller's error as cause", () => {
		const wrong: string[] = [];
		const cause = new TypeError("mine");
		for (const [name, call] of Object.entries(calls)) {
			let reads = 0;
			const counted = {
				get isoDate() {
					reads++;
					return ISO;
				},
			};
			call(counted);
			if (reads !== 1) wrong.push(`${name} read isoDate ${reads}x`);
			const error = thrownBy(() =>
				call({
					get isoDate() {
						throw cause;
					},
				}),
			);
			if (error?.code !== "TCT_INVALID_ARGUMENT" || error.cause !== cause) {
				wrong.push(`${name}: ${error?.code} cause ${String(error?.cause)}`);
			}
		}
		expect(wrong).toEqual([]);
	});
});

describe("the caller's error is the cause of every refusal of a throw", () => {
	const cause = new TypeError("mine");
	const throws = (): never => {
		throw cause;
	};
	const brandedProxy = () =>
		new Proxy(
			{},
			{
				get: (_, key) => (key === Symbol.toStringTag ? "Temporal.PlainDate" : undefined),
				getPrototypeOf: throws,
			},
		);
	const rows: readonly (readonly [string, () => unknown])[] = [
		[
			"an options bag getter",
			() =>
				addMonthsToDate(LOSAR, 1, {
					get tradition(): never {
						return throws();
					},
				}),
		],
		[
			"an options bag ownKeys trap",
			() => addMonthsToDate(LOSAR, 1, new Proxy({}, { ownKeys: throws })),
		],
		[
			"a date's Symbol.toStringTag getter",
			() =>
				resolveDate(
					v({
						...LOSAR,
						get [Symbol.toStringTag](): never {
							return throws();
						},
					}),
				),
		],
		[
			"a PlainDate argument's Symbol.toStringTag getter",
			() =>
				isoToTibetan(
					v({
						get [Symbol.toStringTag](): never {
							return throws();
						},
					}),
				),
		],
		[
			"a Proxy get trap on a date",
			() => observancesOn(v(new Proxy({}, { get: throws })), EXAMPLE_OBSERVANCES),
		],
		[
			"a spoofed ZonedDateTime whose toPlainDate getter throws",
			() =>
				isoToTibetan(
					v({
						[Symbol.toStringTag]: "Temporal.ZonedDateTime",
						get toPlainDate(): never {
							return throws();
						},
					}),
				),
		],
		[
			"a spoofed ZonedDateTime whose toPlainDate throws",
			() =>
				isoToTibetan(v({ [Symbol.toStringTag]: "Temporal.ZonedDateTime", toPlainDate: throws })),
		],
		[
			"a spoofed PlainDate whose toString throws",
			() => isoToTibetan(v({ [Symbol.toStringTag]: "Temporal.PlainDate", toString: throws })),
		],
		[
			"a PlainDate-branded Proxy whose getPrototypeOf throws, at isoToTibetan",
			() => isoToTibetan(v(brandedProxy())),
		],
		[
			"a PlainDate-branded Proxy whose getPrototypeOf throws, at observancesOn",
			() => observancesOn(v(brandedProxy()), EXAMPLE_OBSERVANCES),
		],
		[
			"a PlainDate-branded Proxy whose getPrototypeOf throws, at nextFullMoon",
			() => nextFullMoon(v(brandedProxy())),
		],
	];

	it.each(rows)("%s is TCT_INVALID_ARGUMENT with the error as cause", (_, call) => {
		const error = thrownBy(call);
		expect(error?.code).toBe("TCT_INVALID_ARGUMENT");
		expect(error?.cause).toBe(cause);
	});

	it("a thrown object forging a config code is still wrapped, not passed through", () => {
		const forged = Object.assign(new TypeError("forged"), { code: "TCT_INVALID_TRADITION_CONFIG" });
		const config = structuredClone(PHUGPA);
		Object.defineProperty(config, "epochYear", {
			enumerable: true,
			get() {
				throw forged;
			},
		});
		const error = thrownBy(() => isoToTibetan(ISO, v(config)));
		expect(error).toBeInstanceOf(RangeError);
		expect(error?.cause).toBe(forged);
	});
});
