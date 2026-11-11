import { describe, expect, it } from "vitest";
import { getObservances } from "../../src/observances/index.js";
import type { ObservanceConfig } from "../../src/observances/types.js";
import { PHUGPA, PHUGPA_HENNING } from "../../src/traditions/phugpa.js";
import { RABTEN_SOJONG } from "../fixtures/rabten-sojong.js";

// The sojong schedule inferred from Rabten Choeling's calendar, held against Rabten's own days.
// The rule is a fit to one source and is not sourced from it: Rabten states no method. Agreement is
// stated over Rabten's day-level range, 2000-02-19 (its first sojong) to its last date in the
// fixture, and the window is recorded in docs/testing.md.

const SOJONG: ObservanceConfig = {
	id: "rabten-sojong",
	englishName: "Sojong, as counted from Rabten Choeling",
	doubledDay: "first",
	skippedDay: "following",
	leapMonth: "leap",
	rules: [
		{
			id: "sojong",
			englishName: "Sojong",
			when: {
				type: "counted",
				anchor: { month: 1, day: 15 },
				waxingDays: 15,
				waningDays: { oddMonth: 14, evenMonth: 15 },
				exclude: [{ month: 1, day: 1 }],
			},
		},
	],
};

const FIRST = RABTEN_SOJONG[0]?.iso as string;
const LAST = RABTEN_SOJONG.at(-1)?.iso as string;

describe("Rabten Choeling's sojong schedule, counted from an annual anchor", () => {
	it("is in the fixture's range, starting on Rabten's first anchor", () => {
		expect(FIRST).toBe("2000-02-19");
		expect(RABTEN_SOJONG).toHaveLength(2490);
	});

	it.each([
		["PHUGPA_HENNING", PHUGPA_HENNING],
		["PHUGPA", PHUGPA],
	])(
		"yields exactly Rabten's days under %s, in both directions",
		(_name, tradition) => {
			const engine = new Set(
				getObservances(
					Temporal.PlainDate.from(FIRST),
					Temporal.PlainDate.from(LAST),
					SOJONG,
					tradition,
				).map((o) => o.date.isoDate.toString()),
			);
			const rabten = new Set(RABTEN_SOJONG.map((r) => r.iso));
			const missing = [...rabten].filter((d) => !engine.has(d));
			const invented = [...engine].filter((d) => !rabten.has(d));
			expect({ missing, invented }).toEqual({ missing: [], invented: [] });
		},
		30_000,
	);
});
