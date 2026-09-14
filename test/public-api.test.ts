import { describe, expect, it } from "vitest";
import * as astrology from "../src/astrology/index.js";
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
	"BHUTAN",
	"BHUTAN_HENNING",
	"PHUGPA",
	"PHUGPA_HENNING",
	"SkippedDayError",
	"addDays",
	"addMonths",
	"addMonthsToDate",
	"asTibetanWeekday",
	"datesFor",
	"daysBetween",
	"daysInMonth",
	"formatTibetanDate",
	"formatTibetanMonth",
	"hasLeapMonth",
	"isoFromJulianDay",
	"isoToTibetan",
	"julianDayFromIso",
	"leapMonthNumberFor",
	"losarFor",
	"lunationFromMonth",
	"monthFromLunation",
	"monthNamesFor",
	"monthsBetween",
	"monthsFor",
	"monthsInYear",
	"nextFullMoon",
	"nextNewMoon",
	"parseTibetanDate",
	"parseTibetanMonth",
	"rabjungFor",
	"resolveDate",
	"resolveMonth",
	"tibetanDateExists",
	"tibetanToIso",
	"tibetanWeekday",
	"weekdayNameFor",
	"yearNameFor",
] as const;

describe("public API surface", () => {
	it("exports exactly the documented names", () => {
		expect(Object.keys(api).sort()).toEqual([...EXPECTED_EXPORTS]);
	});

	it("exports the documented kind for each name", () => {
		const kinds = Object.fromEntries(Object.entries(api).map(([key, v]) => [key, typeof v]));
		expect(kinds).toEqual({
			// Tradition configs are plain data, so that a consumer can spread one to make a variant.
			BHUTAN: "object",
			BHUTAN_HENNING: "object",
			PHUGPA: "object",
			PHUGPA_HENNING: "object",
			// A class, hence "function".
			SkippedDayError: "function",
			addDays: "function",
			addMonths: "function",
			addMonthsToDate: "function",
			asTibetanWeekday: "function",
			datesFor: "function",
			daysBetween: "function",
			daysInMonth: "function",
			formatTibetanDate: "function",
			formatTibetanMonth: "function",
			hasLeapMonth: "function",
			isoFromJulianDay: "function",
			isoToTibetan: "function",
			julianDayFromIso: "function",
			leapMonthNumberFor: "function",
			losarFor: "function",
			lunationFromMonth: "function",
			monthFromLunation: "function",
			monthNamesFor: "function",
			monthsBetween: "function",
			monthsFor: "function",
			monthsInYear: "function",
			nextFullMoon: "function",
			nextNewMoon: "function",
			parseTibetanDate: "function",
			parseTibetanMonth: "function",
			rabjungFor: "function",
			resolveDate: "function",
			resolveMonth: "function",
			tibetanDateExists: "function",
			tibetanToIso: "function",
			tibetanWeekday: "function",
			weekdayNameFor: "function",
			yearNameFor: "function",
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

	it.each([
		["phugpa", () => api.PHUGPA, () => api.PHUGPA_HENNING],
		["bhutan", () => api.BHUTAN, () => api.BHUTAN_HENNING],
	])("ships %s as a pair differing only in the lunar anomaly", (id, base, variant) => {
		expect(base().id).toBe(id);
		expect(variant().id).toBe(`${id}-henning`);
		// The default is almanac practice for every tradition, and the variant is Henning's exact
		// value. One fork, not one per tradition: Janson states a₂ is the same in every version.
		expect(base().lunarAnomaly.perDay).toEqual({ num: 1, den: 28 });
		expect(variant().lunarAnomaly.perDay).toEqual({ num: 3781, den: 105_840 });

		// Everything else must match, or the two are not the same tradition with one value changed.
		const { lunarAnomaly: _a, id: _b, name: _c, ...standard } = base();
		const { lunarAnomaly: _d, id: _e, name: _f, ...henning } = variant();
		expect(henning).toEqual(standard);
	});

	it("keeps the two traditions distinct where Janson says they differ", () => {
		// Guards against BHUTAN being an accidental alias of PHUGPA, which a spread makes easy.
		expect(api.BHUTAN.epochYear).toBe(1754);
		expect(api.BHUTAN.leapIndexThreshold).toBe(57);
		expect(api.BHUTAN.leapMonthPosition).toBe("after");
		expect(api.PHUGPA.leapMonthPosition).toBe("before");
		// And against them drifting apart where he says they agree.
		expect(api.BHUTAN.moonTab).toEqual(api.PHUGPA.moonTab);
		expect(api.BHUTAN.sunTab).toEqual(api.PHUGPA.sunTab);
		expect(api.BHUTAN.meanDate.perMonth).toEqual(api.PHUGPA.meanDate.perMonth);
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
		expect(Object.keys(api)).not.toContain("DEFAULT_OBSERVANCES");
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
	"TCT_ATTRIBUTE_NOT_SOURCED",
	"TCT_FIELD_OUT_OF_RANGE",
	"TCT_INTERNAL",
	"TCT_INVALID_ARGUMENT",
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
		TCT_INVALID_ARGUMENT: () => api.tibetanToIso(iso("2026-08-12") as never),
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
				config: {
					...observances.DEFAULT_OBSERVANCES,
					doubledDay: "1st" as observances.DoubledDayChoice,
				},
			}),
		TCT_SPAN_TOO_WIDE: () => observances.getObservances(iso("1500-01-01"), iso("2500-01-01")),
		// Reachable as of 2026-09-12, when ./astrology landed. Before that it sat in the unreachable
		// list below: the code existed and the modules threw it, but nothing exported them.
		TCT_ATTRIBUTE_NOT_SOURCED: () =>
			astrology.monthAttributesFor({ year: 2153, month: 1 }, { tradition: api.BHUTAN }),
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
	])("codes the failure of %s", (_label, call) => {
		expect(codeOf(call)).toBe("TCT_FIELD_OUT_OF_RANGE");
	});

	/**
	 * The other half of that same set, after the code split.
	 *
	 * These fail because the argument is the wrong *kind of thing*, not because a number is out of
	 * range: `null` is not a date, `7` is not a `PlainDate`, `"not-a-date"` is not a date string.
	 * `TCT_FIELD_OUT_OF_RANGE` named neither a field nor a range for any of them, which is what
	 * `docs/decisions/2026-08-15-argument-errors-split.md` records.
	 *
	 * `formatTibetanDate({})` moved here on 2026-08-26. It used to carry the range code on the
	 * reasoning that `{}` is an object, so it clears the shape guard and fails on `year` not being a
	 * safe integer. That put an ABSENT required field on `tibetanDateExists`'s swallow-allowlist,
	 * which is how `tibetanDateExists({ year, month })` with the day forgotten answered `false`
	 * instead of throwing. Presence is a wrong *kind* of argument; only a present-but-bad number is
	 * a range failure.
	 */
	it.each([
		["julianDayFromIso, null", () => api.julianDayFromIso(null as unknown as Temporal.PlainDate)],
		["julianDayFromIso, number", () => api.julianDayFromIso(7 as unknown as Temporal.PlainDate)],
		["formatTibetanDate, null", () => api.formatTibetanDate(null as never)],
		["formatTibetanDate, empty object", () => api.formatTibetanDate({} as never)],
		[
			"tibetanDateExists, a month object",
			() => api.tibetanDateExists({ year: 2151, month: 6 } as never),
		],
		[
			"tibetanDateExists, day forgotten",
			() => api.tibetanDateExists({ year: 2153, month: 1 } as never),
		],
		[
			"tibetanToIso, day as a string",
			() => api.tibetanToIso({ year: 2153, month: 1, day: "5" } as never),
		],
		["isoToTibetan, garbage string", () => api.isoToTibetan("not-a-date" as never)],
		// The three Tibetan-date entry points that lacked formatTibetanDate's null/non-object guard:
		// rejectInvalidLeapFlags dereferenced `value[field]` with no shape check first, so these threw
		// an uncoded native TypeError before the guard was added.
		["tibetanToIso, null", () => api.tibetanToIso(null as never)],
		["tibetanToIso, undefined", () => api.tibetanToIso(undefined as never)],
		["daysInMonth, null", () => api.daysInMonth(null as never)],
		["daysInMonth, undefined", () => api.daysInMonth(undefined as never)],
		["tibetanDateExists, null", () => api.tibetanDateExists(null as never)],
	])("codes the wrong-argument failure of %s", (_label, call) => {
		expect(codeOf(call)).toBe("TCT_INVALID_ARGUMENT");
	});

	// The one route that did not apply the exactness bound, so it was the way into the range the
	// rest of the API refuses. 1e15 is inside Number.isSafeInteger and far outside every tradition.
	it("bounds isoFromJulianDay by the tradition's exact range", () => {
		expect(codeOf(() => api.isoFromJulianDay(1e15))).toBe("TCT_OUTSIDE_EXACT_RANGE");
	});

	/**
	 * Accepting a `PlainDateTime` or `ZonedDateTime` is deliberate rather than accidental.
	 *
	 * It used to work by duck-typing on `.since` and truncating silently, while a string threw
	 * `date.since is not a function` and a `ZonedDateTime` threw Temporal's `Must specify time
	 * zone`. These are calendar-day operations, so narrowing a datetime to its date is the right
	 * reading — but this stops short of a bare `{ year, month, day } object`, which is covered
	 * separately below, because that shape is ambiguous with this package's own Tibetan-date input.
	 */
	it("accepts every Temporal shape that names a calendar day", () => {
		const expected = api.isoToTibetan(iso("2026-08-12"));
		for (const input of [
			Temporal.PlainDateTime.from("2026-08-12T13:45:00"),
			Temporal.ZonedDateTime.from("2026-08-12T13:45:00+00:00[UTC]"),
			"2026-08-12",
		]) {
			expect(api.isoToTibetan(input as never)).toEqual(expected);
		}
	});

	/**
	 * Finding 2, part B. `{ year: 2153, month: 12, day: 8 }` is a genuine value of both
	 * `TibetanDateFields` and the shape `Temporal.PlainDate.from` accepts, so
	 * `isoToTibetan({ year: 2153, month: 12, day: 8 })` used to read a royal-era Tibetan year as
	 * an ISO one — the specific confusion the royal-era numbering argument was supposed to make
	 * loud, quietly defeated by the very same object shape being accepted on both sides.
	 * `julianDayFromIso` shares the same entry point (`asPlainDate`), so it is covered too.
	 */
	it.each([
		["isoToTibetan", () => api.isoToTibetan({ year: 2153, month: 12, day: 8 } as never)],
		["julianDayFromIso", () => api.julianDayFromIso({ year: 2026, month: 8, day: 12 } as never)],
	])("rejects a bare { year, month, day } object at %s", (_label, call) => {
		expect(codeOf(call)).toBe("TCT_INVALID_ARGUMENT");
	});

	/**
	 * Finding 2, part A. `Temporal.PlainDate` and `TibetanDateFields` are structurally close enough
	 * — both expose numeric `year`/`month`/`day` — that the four Tibetan-date entry points used to
	 * accept a Temporal instance silently: `tibetanToIso(pd)` read `pd.year/.month/.day` as though
	 * they were royal-era fields and returned a confident, wrong Tibetan date.
	 *
	 * `tibetanDateExists` is asserted to *throw*, not answer `false`. Before the code split this
	 * needed the guard hoisted out of the predicate's `try`, because `TCT_FIELD_OUT_OF_RANGE` is on
	 * its allowlist and would have swallowed a Temporal instance into "that date does not exist".
	 * `TCT_INVALID_ARGUMENT` is not on that allowlist, so the guard now works from inside the `try`
	 * and the hoisted copy is gone — this assertion is what proves the behaviour survived the move.
	 */
	it.each([
		["tibetanToIso, PlainDate", () => api.tibetanToIso(iso("2026-08-12") as never)],
		[
			"tibetanToIso, PlainDateTime",
			() => api.tibetanToIso(Temporal.PlainDateTime.from("2026-08-12T00:00") as never),
		],
		[
			"tibetanToIso, ZonedDateTime",
			() => api.tibetanToIso(Temporal.ZonedDateTime.from("2026-08-12T00:00+00:00[UTC]") as never),
		],
		["tibetanDateExists, PlainDate", () => api.tibetanDateExists(iso("2026-08-12") as never)],
		[
			"tibetanDateExists, PlainDateTime",
			() => api.tibetanDateExists(Temporal.PlainDateTime.from("2026-08-12T00:00") as never),
		],
		[
			"tibetanDateExists, ZonedDateTime",
			() =>
				api.tibetanDateExists(Temporal.ZonedDateTime.from("2026-08-12T00:00+00:00[UTC]") as never),
		],
		["formatTibetanDate, PlainDate", () => api.formatTibetanDate(iso("2026-08-12") as never)],
		[
			"formatTibetanDate, PlainDateTime",
			() => api.formatTibetanDate(Temporal.PlainDateTime.from("2026-08-12T00:00") as never),
		],
		[
			"formatTibetanDate, ZonedDateTime",
			() =>
				api.formatTibetanDate(Temporal.ZonedDateTime.from("2026-08-12T00:00+00:00[UTC]") as never),
		],
		["daysInMonth, PlainDate", () => api.daysInMonth(iso("2026-08-12") as never)],
		[
			"daysInMonth, PlainDateTime",
			() => api.daysInMonth(Temporal.PlainDateTime.from("2026-08-12T00:00") as never),
		],
		[
			"daysInMonth, ZonedDateTime",
			() => api.daysInMonth(Temporal.ZonedDateTime.from("2026-08-12T00:00+00:00[UTC]") as never),
		],
	])("rejects a Temporal instance at %s", (_label, call) => {
		expect(codeOf(call)).toBe("TCT_INVALID_ARGUMENT");
	});

	it("tibetanDateExists throws for a Temporal instance rather than answering false", () => {
		expect(() => api.tibetanDateExists(iso("2026-08-12") as never)).toThrow();
	});

	it("tibetanDateExists throws for null rather than answering false", () => {
		expect(() => api.tibetanDateExists(null as never)).toThrow();
		expect(codeOf(() => api.tibetanDateExists(null as never))).toBe("TCT_INVALID_ARGUMENT");
	});

	/**
	 * Finding 5. Both flags used to be read as `?? false` and used for truthiness, so a
	 * non-boolean — a string from a form field, a stray `1` — was silently coerced into "leap"
	 * instead of being rejected. `"false"` is the sharpest case: it reads as a rejection in
	 * prose and is truthy in JavaScript.
	 */
	it.each([
		[
			"tibetanToIso, isLeapMonth: 1",
			() => api.tibetanToIso({ year: 2153, month: 6, day: 1, isLeapMonth: 1 } as never),
		],
		[
			"tibetanToIso, isLeapDay: 'x'",
			() => api.tibetanToIso({ year: 2153, month: 1, day: 1, isLeapDay: "x" } as never),
		],
		[
			"tibetanToIso, isLeapMonth: 'false'",
			() => api.tibetanToIso({ year: 2153, month: 6, day: 1, isLeapMonth: "false" } as never),
		],
		[
			"formatTibetanDate, isLeapMonth: 1",
			() => api.formatTibetanDate({ year: 2153, month: 6, day: 1, isLeapMonth: 1 } as never),
		],
		[
			"formatTibetanDate, isLeapDay: 'x'",
			() => api.formatTibetanDate({ year: 2153, month: 1, day: 1, isLeapDay: "x" } as never),
		],
		[
			"formatTibetanDate, isLeapMonth: 'false'",
			() => api.formatTibetanDate({ year: 2153, month: 6, day: 1, isLeapMonth: "false" } as never),
		],
		[
			"daysInMonth, isLeapMonth: 1",
			() => api.daysInMonth({ year: 2153, month: 6, isLeapMonth: 1 } as never),
		],
		[
			"daysInMonth, isLeapDay: 'x'",
			() => api.daysInMonth({ year: 2153, month: 1, isLeapDay: "x" } as never),
		],
		[
			"daysInMonth, isLeapMonth: 'false'",
			() => api.daysInMonth({ year: 2153, month: 6, isLeapMonth: "false" } as never),
		],
	])("rejects a non-boolean leap flag at %s", (_label, call) => {
		expect(codeOf(call)).toBe("TCT_INVALID_ARGUMENT");
	});

	// The review's exact reproduction: this used to return "2153-M01L-01 (leap)" instead of
	// throwing, because both flags were read with `?? false` and used for truthiness.
	it("rejects the review's reproduction case instead of formatting a wrong string", () => {
		expect(
			codeOf(() =>
				api.formatTibetanDate({
					year: 2153,
					month: 1,
					day: 1,
					isLeapMonth: 1,
					isLeapDay: "x",
				} as never),
			),
		).toBe("TCT_INVALID_ARGUMENT");
	});

	it("tibetanDateExists throws for a non-boolean leap flag rather than answering false", () => {
		expect(() =>
			api.tibetanDateExists({ year: 2153, month: 6, day: 1, isLeapMonth: 1 } as never),
		).toThrow();
		expect(
			codeOf(() =>
				api.tibetanDateExists({ year: 2153, month: 6, day: 1, isLeapMonth: 1 } as never),
			),
		).toBe("TCT_INVALID_ARGUMENT");
	});

	it("still accepts undefined and real booleans for both leap flags", () => {
		// undefined (genuinely absent) still defaults to "not leap" and does not throw.
		expect(() => api.tibetanToIso({ year: 2153, month: 1, day: 1 })).not.toThrow();
		expect(() => api.formatTibetanDate({ year: 2153, month: 1, day: 1 })).not.toThrow();
		expect(() => api.daysInMonth({ year: 2153, month: 1 })).not.toThrow();

		// explicit true/false still work. 2151 month 6 is a genuine leap month
		// (leapMonthNumberFor(2151) === 6).
		expect(() =>
			api.tibetanToIso({ year: 2151, month: 6, day: 1, isLeapMonth: true }),
		).not.toThrow();
		expect(() =>
			api.tibetanToIso({ year: 2153, month: 6, day: 1, isLeapMonth: false }),
		).not.toThrow();
		expect(
			api.formatTibetanDate({ year: 2153, month: 1, day: 1, isLeapMonth: false, isLeapDay: true }),
		).toBe("2153-M01-01 (leap)");
		expect(() => api.daysInMonth({ year: 2151, month: 6, isLeapMonth: true })).not.toThrow();
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
const EXPECTED_OBSERVANCE_EXPORTS = [
	"DEFAULT_OBSERVANCES",
	"getObservances",
	"observancesOn",
] as const;

describe("observances API surface", () => {
	it("exports exactly the documented names", () => {
		expect(Object.keys(observances).sort()).toEqual([...EXPECTED_OBSERVANCE_EXPORTS]);
	});

	it("ships the default observance config (id `gelug`) as spreadable plain data, like a tradition config", () => {
		expect(typeof observances.DEFAULT_OBSERVANCES).toBe("object");
		expect(observances.DEFAULT_OBSERVANCES.id).toBe("gelug");
		// An institution differs by spreading, never by subclassing.
		const kopan = { ...observances.DEFAULT_OBSERVANCES, id: "kopan", doubledDay: "first" as const };
		expect(kopan.rules).toBe(observances.DEFAULT_OBSERVANCES.rules);
		expect(kopan.doubledDay).not.toBe(observances.DEFAULT_OBSERVANCES.doubledDay);
	});

	it("cites a source for every shipped rule", () => {
		for (const rule of observances.DEFAULT_OBSERVANCES.rules) {
			expect(rule.source).toMatch(/^https:\/\/fpmt\.org\//);
		}
	});

	// The shipped config must satisfy the rules imposed on consumer configs. Without this, DEFAULT_OBSERVANCES
	// could drift out of its own contract and only a consumer would ever find out.
	it("passes the validation it imposes on consumer configs", () => {
		const day = Temporal.PlainDate.from("2026-01-01");
		expect(() =>
			observances.getObservances(day, day, { config: observances.DEFAULT_OBSERVANCES }),
		).not.toThrow();

		const ids = observances.DEFAULT_OBSERVANCES.rules.map((r) => r.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const rule of observances.DEFAULT_OBSERVANCES.rules) {
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
		expect(observances.DEFAULT_OBSERVANCES.rules.some((r) => r.kind === "anniversary")).toBe(false);
	});

	/**
	 * Finding 2, part B, inherited rather than implemented directly here: both functions call
	 * `asPlainDate` as their first statement, so narrowing that helper to reject a bare
	 * `{ year, month, day }` object closes this hole at both entry points without either function
	 * needing its own check.
	 */
	it("rejects a bare { year, month, day } object at getObservances and observancesOn", () => {
		const bare = { year: 2026, month: 8, day: 12 } as never;
		const codeOf = (call: () => unknown): string | undefined => {
			try {
				call();
				return undefined;
			} catch (error) {
				return (error as { code?: string }).code;
			}
		};
		expect(codeOf(() => observances.getObservances(bare, bare))).toBe("TCT_INVALID_ARGUMENT");
		expect(codeOf(() => observances.observancesOn(bare))).toBe("TCT_INVALID_ARGUMENT");
	});
});

/**
 * The `./astrology` subpath, pinned separately for the same reason `./observances` is.
 *
 * A third one-way door, and the one whose sourcing is least uniform: Janson gives the cycles and the
 * mansion arithmetic, Henning the mansion elements and the yoga names, and FPMT the favorability
 * alone. That is why it is a subpath rather than part of the root — the root's claims are all
 * checkable against Janson.
 */
const EXPECTED_ASTROLOGY_EXPORTS = [
	"ELEMENTAL_YOGAS",
	"attributesFor",
	"calendarDayAttributesFor",
	"elementalYoga",
	"elementalYogaFor",
	"lunarDayAttributesFor",
	"lunarMansionFor",
	"monthAttributesFor",
	"yearAttributesFor",
] as const;

/**
 * What each name is, not only that it exists.
 *
 * @remarks
 * The root surface has asserted kinds from the start; this subpath listed names only until a code
 * review pointed out the gap on 2026-09-12. A function silently becoming an object — a barrel line
 * changed from `export { f }` to `export { f as default }`, say — passes a name list and fails this.
 */
const ASTROLOGY_KINDS: Record<string, string> = {
	ELEMENTAL_YOGAS: "object",
	attributesFor: "function",
	calendarDayAttributesFor: "function",
	elementalYoga: "function",
	elementalYogaFor: "function",
	lunarDayAttributesFor: "function",
	lunarMansionFor: "function",
	monthAttributesFor: "function",
	yearAttributesFor: "function",
};

describe("astrology API surface", () => {
	const day = Temporal.PlainDate.from("2026-09-01");

	it("exports exactly the documented names", () => {
		expect(Object.keys(astrology).sort()).toEqual([...EXPECTED_ASTROLOGY_EXPORTS]);
	});

	it("exports each of them as the kind it is documented to be", () => {
		const bad: string[] = [];
		for (const [name, kind] of Object.entries(ASTROLOGY_KINDS)) {
			const actual = typeof (astrology as unknown as Record<string, unknown>)[name];
			if (actual !== kind) bad.push(`${name}: ${actual}, expected ${kind}`);
		}
		expect(bad).toEqual([]);
		expect(Object.keys(ASTROLOGY_KINDS).sort()).toEqual([...EXPECTED_ASTROLOGY_EXPORTS]);
	});

	it("exposes the mansion only for a date, never its tables", () => {
		// `mansionElement` and `MANSION_ELEMENTS` shipped briefly and were withdrawn the same day: with
		// no exported way to learn today's mansion NUMBER, a consumer could ask what element mansion 17
		// carries and never learn that today is mansion 17. `lunarMansionFor` now answers for a date,
		// which gives the index and element together; the bare tables stay off the surface.
		for (const name of ["mansionElement", "MANSION_ELEMENTS", "MANSION_COUNT", "mansionNumber"]) {
			expect(name in astrology, name).toBe(false);
		}
	});

	it("keeps every name off the root export", () => {
		// The subpath exists so a date-only consumer never loads the mansion arithmetic or Henning's
		// tables. A re-export from the root would quietly undo that.
		for (const name of EXPECTED_ASTROLOGY_EXPORTS) {
			expect(name in api, name).toBe(false);
		}
	});

	it("ships the ten yogas frozen, like every other table the docs point at", () => {
		expect(Object.isFrozen(astrology.ELEMENTAL_YOGAS)).toBe(true);
		expect(astrology.ELEMENTAL_YOGAS).toHaveLength(10);
	});

	it("answers the whole row for one day", () => {
		const attributes = astrology.attributesFor(day);
		expect(attributes.year.power).toBe("fire");
		expect(attributes.yoga.englishName).toBe("death");
		expect(attributes.month).not.toBeNull();
		expect(attributes.lunarDay).not.toBeNull();
		expect(attributes.date.isoDate.toString()).toBe("2026-09-01");
	});

	it("reports the Bhutanese gap as null rather than refusing the whole day", () => {
		const attributes = astrology.attributesFor(day, { tradition: api.BHUTAN });
		expect(attributes.month).toBeNull();
		expect(attributes.lunarDay).toBeNull();
		// Everything tradition-free still answers, which is the point of reporting rather than throwing.
		expect(attributes.calendarDay.animal).toBeDefined();
		expect(attributes.yoga.sanskritName.iast).toBeDefined();
		expect(attributes.year.power).toBeDefined();
	});

	it("throws from the primitives where the composition reports null", () => {
		const codeOf = (call: () => unknown) => {
			try {
				call();
				return undefined;
			} catch (error) {
				return (error as { code?: string }).code;
			}
		};
		expect(
			codeOf(() =>
				astrology.monthAttributesFor({ year: 2153, month: 1 }, { tradition: api.BHUTAN }),
			),
		).toBe("TCT_ATTRIBUTE_NOT_SOURCED");
		expect(
			codeOf(() =>
				astrology.lunarDayAttributesFor(
					{ year: 2153, month: 1, day: 1 },
					{ tradition: api.BHUTAN },
				),
			),
		).toBe("TCT_ATTRIBUTE_NOT_SOURCED");
	});

	it("rejects a bare { year, month, day } where a calendar day is meant", () => {
		// The nextFullMoon rule: a parameter spanning two calendars accepts only shapes that say which
		// one they mean. `{ year: 2026, month: 9, day: 1 }` is a genuine value of both.
		const codeOf = (call: () => unknown) => {
			try {
				call();
				return undefined;
			} catch (error) {
				return (error as { code?: string }).code;
			}
		};
		const bare = { year: 2026, month: 9, day: 1 } as unknown as Temporal.PlainDate;
		expect(codeOf(() => astrology.attributesFor(bare))).toBe("TCT_INVALID_ARGUMENT");
		expect(codeOf(() => astrology.calendarDayAttributesFor(bare))).toBe("TCT_INVALID_ARGUMENT");
		expect(codeOf(() => astrology.elementalYogaFor(bare))).toBe("TCT_INVALID_ARGUMENT");
	});

	it("guards the options bag itself, and reads it with === undefined", () => {
		const codeOf = (call: () => unknown) => {
			try {
				call();
				return undefined;
			} catch (error) {
				return (error as { code?: string }).code;
			}
		};
		// `null` options is a malformed argument, not an absent one — the failure `??` would hide.
		expect(codeOf(() => astrology.attributesFor(day, null as never))).toBe("TCT_INVALID_ARGUMENT");
		// An explicit `{ tradition: null }` must reach the config validator rather than defaulting.
		expect(codeOf(() => astrology.attributesFor(day, { tradition: null as never }))).toBe(
			"TCT_INVALID_TRADITION_CONFIG",
		);
	});

	it("accepts a resolved TibetanDate as well as a PlainDate, and agrees with itself", () => {
		const resolved = api.isoToTibetan(day);
		expect(astrology.attributesFor(resolved).yoga).toBe(astrology.attributesFor(day).yoga);
		expect(astrology.calendarDayAttributesFor(resolved)).toEqual(
			astrology.calendarDayAttributesFor(day),
		);
	});

	it("takes the royal era for a year, matching yearNameFor", () => {
		// 2153, not 2026. The two eras differ by 127, so a caller passing the Gregorian year gets a
		// plausible wrong answer — which is why this is asserted rather than left to the docblock.
		expect(astrology.yearAttributesFor(2153).power).toBe(api.yearNameFor(2153).element);
	});
});
