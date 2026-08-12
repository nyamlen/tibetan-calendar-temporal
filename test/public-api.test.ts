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
	"formatTibetanDate",
	"isoFromJulianDay",
	"isoToTibetan",
	"julianDayFromIso",
	"losarFor",
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
			formatTibetanDate: "function",
			isoFromJulianDay: "function",
			isoToTibetan: "function",
			julianDayFromIso: "function",
			losarFor: "function",
			tibetanDateExists: "function",
			tibetanToIso: "function",
			tibetanWeekday: "function",
		});
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

	it("keeps the observance layer off the root, so a date consumer never loads it", () => {
		expect(Object.keys(api)).not.toContain("getObservances");
		expect(Object.keys(api)).not.toContain("GELUG");
	});

	it("makes SkippedDayError catchable as an Error subclass", () => {
		const error = new api.SkippedDayError({ year: 2150, month: 12, day: 29 });
		expect(error).toBeInstanceOf(Error);
		expect(error.name).toBe("SkippedDayError");
		expect(error.requested).toEqual({ year: 2150, month: 12, day: 29 });
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

	// Shipping an anniversary would put institution-specific data on a release cycle it does not
	// belong on -- a new spiritual director should not need a package publish.
	it("ships no teacher anniversaries, only the shape for a caller to supply them", () => {
		expect(observances.GELUG.rules.some((r) => r.kind === "anniversary")).toBe(false);
	});
});
