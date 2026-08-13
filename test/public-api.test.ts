import { describe, expect, it } from "vitest";
import * as api from "../src/index.js";
import * as observances from "../src/observances/index.js";

/**
 * The package's runtime export surface, pinned.
 *
 * The published API is a one-way door: once v1.0.0 is out, removing or renaming any of these is
 * a breaking change, and adding one is a commitment to keep it. This suite exists so that
 * happens deliberately rather than as a side effect of an `export` added while editing a module.
 *
 * The list is also what the README's API table documents. If this fails, update both, or revert
 * the export.
 *
 * Type-only exports are absent by design — they are erased at runtime, so there is nothing here
 * to assert. `tsc` covers those.
 */
const EXPECTED_EXPORTS = [
	"PHUGPA",
	"PHUGPA_HENNING",
	"SkippedDayError",
	"daysInMonth",
	"formatTibetanDate",
	"hasLeapMonth",
	"isoFromJulianDay",
	"isoToTibetan",
	"julianDayFromIso",
	"leapMonthOfYear",
	"losarFor",
	"monthsFor",
	"monthsInYear",
	"parseTibetanDate",
	"tibetanDateExists",
	"tibetanToIso",
	"tibetanWeekday",
] as const;

describe("public API surface", () => {
	it("exports exactly the documented names", () => {
		expect(Object.keys(api).sort()).toEqual([...EXPECTED_EXPORTS]);
	});

	it("exports the documented kind for each name", () => {
		const kinds = Object.fromEntries(Object.entries(api).map(([key, v]) => [key, typeof v]));
		expect(kinds).toEqual({
			// Tradition configs are plain data, so that a consumer can spread one to make a variant.
			PHUGPA: "object",
			PHUGPA_HENNING: "object",
			// A class, hence "function".
			SkippedDayError: "function",
			daysInMonth: "function",
			formatTibetanDate: "function",
			hasLeapMonth: "function",
			isoFromJulianDay: "function",
			isoToTibetan: "function",
			julianDayFromIso: "function",
			leapMonthOfYear: "function",
			losarFor: "function",
			monthsFor: "function",
			monthsInYear: "function",
			parseTibetanDate: "function",
			tibetanDateExists: "function",
			tibetanToIso: "function",
			tibetanWeekday: "function",
		});
	});

	/**
	 * The rename's one real hazard. `hasLeapMonth` was the internal per-month predicate taking
	 * `(config, year, month)`; the export is the per-year one taking `(year, config?)`. An import
	 * resolving to the wrong one would still be callable — the first argument would be a config
	 * where a year is expected, coerce to `NaN`, and be rejected only by the safe-integer guard.
	 * Pinning the arity and the answer is cheaper than relying on that.
	 */
	it("exports the per-year hasLeapMonth, not the internal per-month one", () => {
		// One required parameter — `length` stops at the first default, and `config` has one. The
		// internal predicate takes three required arguments, so this alone separates them.
		expect(api.hasLeapMonth.length).toBe(1);
		expect(api.hasLeapMonth(2151)).toBe(true);
		expect(api.hasLeapMonth(2153)).toBe(false);
		expect(api.hasLeapMonth(2151, api.PHUGPA)).toBe(true);
	});

	/**
	 * The pair the roadmap called write-only. The formatter takes the input shape precisely so this
	 * composes as an identity rather than as a four-step pipeline through the calendar.
	 */
	it("round-trips the canonical string form", () => {
		const text = api.formatTibetanDate(api.isoToTibetan(Temporal.PlainDate.from("2027-01-15")));
		expect(text).toBe("2153-M12-08");
		expect(api.formatTibetanDate(api.parseTibetanDate(text))).toBe(text);
		expect(api.tibetanToIso(api.parseTibetanDate(text)).toString()).toBe("2027-01-15");
	});

	it("ships both tradition configs, differing only in the lunar anomaly", () => {
		expect(api.PHUGPA.id).toBe("phugpa");
		expect(api.PHUGPA_HENNING.id).toBe("phugpa-henning");
		expect(api.PHUGPA.lunarAnomaly.perDay).toEqual({ num: 1, den: 28 });
		expect(api.PHUGPA_HENNING.lunarAnomaly.perDay).toEqual({ num: 3781, den: 105_840 });

		// Everything else must match, or the two are not the same tradition with one value changed.
		const { lunarAnomaly: _a, id: _b, name: _c, ...phugpa } = api.PHUGPA;
		const { lunarAnomaly: _d, id: _e, name: _f, ...henning } = api.PHUGPA_HENNING;
		expect(henning).toEqual(phugpa);
	});

	/**
	 * The shipped configs are the objects the docs tell consumers to spread, so they are the ones a
	 * keystroke off `{ ...PHUGPA, … }` mutates — for the whole process, and invisibly, because the
	 * derived scaling and the validation are both memoised on the object and would not rerun.
	 *
	 * Free to do now and breaking to do later: a consumer shipping `PHUGPA.moonTab.sort()` against
	 * v1.0.0 would break on the release that adds this.
	 */
	it("freezes the shipped configs, correction tables included", () => {
		for (const config of [api.PHUGPA, api.PHUGPA_HENNING]) {
			expect(Object.isFrozen(config)).toBe(true);
			expect(Object.isFrozen(config.moonTab)).toBe(true);
			expect(Object.isFrozen(config.sunTab)).toBe(true);
			expect(Object.isFrozen(config.meanDate)).toBe(true);
			expect(Object.isFrozen(config.meanDate.perDay)).toBe(true);
		}

		// Strict mode -- which an ES module always is -- makes these throw rather than fail silently.
		expect(() => {
			(api.PHUGPA.moonTab as number[])[4] = 0;
		}).toThrow(TypeError);
		expect(() => {
			(api.PHUGPA as { id: string }).id = "not-phugpa";
		}).toThrow(TypeError);
	});

	it("keeps the observance layer off the root, so a date consumer never loads it", () => {
		expect(Object.keys(api)).not.toContain("getObservances");
		expect(Object.keys(api)).not.toContain("GELUG");
	});

	it("makes SkippedDayError catchable as an Error subclass", () => {
		const error = new api.SkippedDayError({ year: 2150, month: 12, day: 29 });
		expect(error).toBeInstanceOf(Error);
		expect(error.name).toBe("SkippedDayError");
		expect(error.requested).toEqual({ year: 2150, month: 12, day: 29 });
		expect(error.code).toBe("TCT_SKIPPED_DAY");
	});
});

/**
 * The error codes, pinned like the export list above and for the same reason.
 *
 * A code is the discriminator a consumer branches on, so it is as much a one-way door as an
 * exported name: removing or repurposing one breaks their `switch`. Message text carries no such
 * promise and is deliberately not pinned here.
 *
 * This suite also enforces the two directions that keep the list honest — every documented code is
 * reachable from the public API, and no call throws a code that is not documented.
 */
const EXPECTED_ERROR_CODES = [
	"TCT_FIELD_OUT_OF_RANGE",
	"TCT_INTERNAL",
	"TCT_INVALID_OBSERVANCE_CONFIG",
	"TCT_INVALID_TRADITION_CONFIG",
	"TCT_MISSING_TEMPORAL",
	"TCT_NO_SUCH_LEAP_MONTH",
	"TCT_OUTSIDE_EXACT_RANGE",
	"TCT_SKIPPED_DAY",
	"TCT_SPAN_TOO_WIDE",
] as const;

describe("error codes", () => {
	const iso = (s: string) => Temporal.PlainDate.from(s);

	const codeOf = (call: () => unknown): string | undefined => {
		try {
			call();
			return undefined;
		} catch (error) {
			return (error as { code?: string }).code;
		}
	};

	/**
	 * One reachable call per code, except the two that are unreachable by construction.
	 *
	 * `TCT_MISSING_TEMPORAL` fires at import time on a runtime without Temporal, and the suite runs
	 * on Node 26. `TCT_INTERNAL` guards an invariant this engine proves for itself; reaching it
	 * would be the bug it reports. Both are covered by the union type and by the README's table
	 * rather than by a call here.
	 */
	const REACHABLE: Record<string, () => unknown> = {
		TCT_FIELD_OUT_OF_RANGE: () => api.tibetanToIso({ year: 2153, month: 13, day: 1 }),
		TCT_NO_SUCH_LEAP_MONTH: () =>
			api.tibetanToIso({ year: 2153, month: 5, day: 1, isLeapMonth: true }),
		TCT_SKIPPED_DAY: () => api.tibetanToIso({ year: 2150, month: 12, day: 29 }),
		TCT_OUTSIDE_EXACT_RANGE: () => api.isoToTibetan(iso("+012000-01-01"), api.PHUGPA_HENNING),
		TCT_INVALID_TRADITION_CONFIG: () =>
			api.isoToTibetan(iso("2026-08-12"), { ...api.PHUGPA, moonTab: [] }),
		// Cast because the value is deliberately invalid: the check exists for the JavaScript
		// consumer, and for the TypeScript one whose config came from JSON.parse or a form field.
		TCT_INVALID_OBSERVANCE_CONFIG: () =>
			observances.observancesOn(iso("2026-08-12"), {
				...observances.GELUG,
				doubledDay: "1st" as observances.DoubledDayChoice,
			}),
		TCT_SPAN_TOO_WIDE: () => observances.getObservances(iso("1500-01-01"), iso("2500-01-01")),
	};

	it("throws each reachable code from the public API", () => {
		for (const [code, call] of Object.entries(REACHABLE)) {
			expect(codeOf(call), code).toBe(code);
		}
	});

	it("throws no code that is not documented", () => {
		for (const call of Object.values(REACHABLE)) {
			expect(EXPECTED_ERROR_CODES).toContain(codeOf(call));
		}
	});

	it("documents no code beyond the two that are unreachable by construction", () => {
		const unreachable = EXPECTED_ERROR_CODES.filter((c) => !(c in REACHABLE));
		expect([...unreachable]).toEqual(["TCT_INTERNAL", "TCT_MISSING_TEMPORAL"]);
	});

	/**
	 * The four exports the boundary decision record forgot.
	 *
	 * `docs/decisions/2026-08-12-input-validation-boundary.md` says "**every** exported function
	 * validates its own input" and then enumerated five of the eleven. The other four behaved as
	 * unguarded code does: `tibetanWeekday(1.5)` returned a fractional weekday `3.5`,
	 * `julianDayFromIso(null)` threw a `TypeError` about `.since`, and `formatTibetanDate({})`
	 * returned `"undefined-undefined-undefined"` — from the one function whose entire docblock is an
	 * argument against producing plausible-but-wrong strings.
	 */
	it.each([
		["tibetanWeekday, fractional", () => api.tibetanWeekday(1.5)],
		["tibetanWeekday, NaN", () => api.tibetanWeekday(Number.NaN)],
		["tibetanWeekday, string", () => api.tibetanWeekday("x" as unknown as number)],
		["isoFromJulianDay, fractional", () => api.isoFromJulianDay(0.5)],
		["isoFromJulianDay, NaN", () => api.isoFromJulianDay(Number.NaN)],
		["julianDayFromIso, null", () => api.julianDayFromIso(null as unknown as Temporal.PlainDate)],
		["julianDayFromIso, number", () => api.julianDayFromIso(7 as unknown as Temporal.PlainDate)],
		["formatTibetanDate, empty object", () => api.formatTibetanDate({} as never)],
		["formatTibetanDate, null", () => api.formatTibetanDate(null as never)],
		["isoToTibetan, garbage string", () => api.isoToTibetan("not-a-date" as never)],
	])("codes the failure of %s", (_label, call) => {
		expect(codeOf(call)).toBe("TCT_FIELD_OUT_OF_RANGE");
	});

	// The one route that did not apply the exactness bound, so it was the way into the range the
	// rest of the API refuses. 1e15 is inside Number.isSafeInteger and far outside every tradition.
	it("bounds isoFromJulianDay by the tradition's exact range", () => {
		expect(codeOf(() => api.isoFromJulianDay(1e15))).toBe("TCT_OUTSIDE_EXACT_RANGE");
	});

	/**
	 * Accepting a `PlainDateTime` is now deliberate rather than accidental.
	 *
	 * It used to work by duck-typing on `.since` and truncating silently, while a string threw
	 * `date.since is not a function` and a `ZonedDateTime` threw Temporal's `Must specify time
	 * zone`. One `Temporal.PlainDate.from` replaced all three, which widens the accepted input:
	 * these are calendar-day operations, so narrowing a datetime to its date is the right reading.
	 */
	it("accepts every Temporal shape that names a calendar day", () => {
		const expected = api.isoToTibetan(iso("2026-08-12"));
		for (const input of [
			Temporal.PlainDateTime.from("2026-08-12T13:45:00"),
			"2026-08-12",
			{ year: 2026, month: 8, day: 12 },
		]) {
			expect(api.isoToTibetan(input as never)).toEqual(expected);
		}
	});
});

/**
 * The `./observances` subpath, pinned separately.
 *
 * It is a second one-way door and needs its own list: nothing in the root suite above would
 * notice a name appearing or vanishing here. The split is deliberate — everything on the root
 * makes a falsifiable claim, checkable against Janson or an almanac, while this layer encodes
 * conventions that published sources disagree about. See `src/observances/types.ts`.
 */
const EXPECTED_OBSERVANCE_EXPORTS = ["GELUG", "getObservances", "observancesOn"] as const;

describe("observances API surface", () => {
	it("exports exactly the documented names", () => {
		expect(Object.keys(observances).sort()).toEqual([...EXPECTED_OBSERVANCE_EXPORTS]);
	});

	it("ships the Gelug config as spreadable plain data, like a tradition config", () => {
		expect(typeof observances.GELUG).toBe("object");
		expect(observances.GELUG.id).toBe("gelug");
		// An institution differs by spreading, never by subclassing.
		const kopan = { ...observances.GELUG, id: "kopan", doubledDay: "first" as const };
		expect(kopan.rules).toBe(observances.GELUG.rules);
		expect(kopan.doubledDay).not.toBe(observances.GELUG.doubledDay);
	});

	it("cites a source for every shipped rule", () => {
		for (const rule of observances.GELUG.rules) {
			expect(rule.source).toMatch(/^https:\/\/fpmt\.org\//);
		}
	});

	// The shipped config must satisfy the rules imposed on consumer configs. Without this, GELUG
	// could drift out of its own contract and only a consumer would ever find out.
	it("passes the validation it imposes on consumer configs", () => {
		const day = Temporal.PlainDate.from("2026-01-01");
		expect(() => observances.getObservances(day, day, observances.GELUG)).not.toThrow();

		const ids = observances.GELUG.rules.map((r) => r.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const rule of observances.GELUG.rules) {
			expect(rule.when.day).toBeGreaterThanOrEqual(1);
			expect(rule.when.day).toBeLessThanOrEqual(30);
			if ("month" in rule.when) {
				expect(rule.when.month).toBeGreaterThanOrEqual(1);
				expect(rule.when.month).toBeLessThanOrEqual(12);
			}
		}
	});

	// Shipping an anniversary would put institution-specific data on a release cycle it does not
	// belong on -- a new spiritual director should not need a package publish.
	it("ships no teacher anniversaries, only the shape for a caller to supply them", () => {
		expect(observances.GELUG.rules.some((r) => r.kind === "anniversary")).toBe(false);
	});
});
