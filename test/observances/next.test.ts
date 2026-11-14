import { describe, expect, it } from "vitest";
import { isoToTibetan } from "../../src/computation/conversion.js";
import {
	EXAMPLE_OBSERVANCES,
	getObservances,
	nextObservance,
} from "../../src/observances/index.js";
import type { Observance, ObservanceConfig } from "../../src/observances/types.js";
import { PHUGPA } from "../../src/traditions/phugpa.js";
import { thrownBy } from "../support/thrown.js";

const iso = (s: string) => Temporal.PlainDate.from(s);

// `Temporal` objects have no own enumerable fields, so `toEqual` on two `Observance`s compares every
// date as equal. Everything here compares this projection instead.
const key = (o: Observance) =>
	[
		o.rule.id,
		o.date.isoDate.toString(),
		o.date.isLeapDay,
		o.resolution,
		o.age,
		o.period?.first.isoDate.toString(),
		o.period?.last.isoDate.toString(),
	].join("|");

const INVALID_ARGUMENT = "TCT_INVALID_ARGUMENT";

const SOJONG_WHEN = {
	type: "counted",
	anchor: { month: 1, day: 15 },
	waxingDays: 15,
	waningDays: { oddMonth: 14, evenMonth: 15 },
	exclude: [{ month: 1, day: 1 }],
};

const withRules = (rules: Record<string, unknown>[]): ObservanceConfig =>
	({
		id: "next",
		englishName: "Next",
		doubledDay: "second",
		skippedDay: "preceding",
		leapMonth: "leap",
		rules: rules.map((rule) => ({ englishName: "R", ...rule })),
	}) as unknown as ObservanceConfig;

const EVERY_FORM = withRules([
	{ id: "monthly", when: { type: "monthly", days: [8, 15, 30] } },
	{ id: "annual", when: { type: "annual", dates: [{ month: 4, day: 15 }], ageFromYear: 2000 } },
	{
		id: "period",
		when: { type: "period", first: { month: 4, day: 1 }, last: { month: 4, day: 15 } },
	},
	{ id: "western", when: { type: "western", month: 3, day: 21 } },
	{ id: "formula", when: { type: "formula", formula: "lunarDayPlusWeekdayMod4" } },
	{
		id: "sojong",
		doubledDay: "first",
		skippedDay: "following",
		leapMonth: "leap",
		when: SOJONG_WHEN,
	},
]);

/** What feeding each result's date back in visits, from before `from` up to `to`. */
const chain = (
	from: string,
	to: string,
	ruleId: string,
	config: ObservanceConfig,
): Observance[] => {
	const visited: Observance[] = [];
	const last = iso(to);
	let at = iso(from).subtract({ days: 1 });
	for (;;) {
		const next = nextObservance(at, ruleId, config);
		if (next === null || Temporal.PlainDate.compare(next.date.isoDate, last) > 0) break;
		// A result that does not advance would loop for ever, so it ends the walk and fails the caller's
		// comparison instead.
		if (Temporal.PlainDate.compare(next.date.isoDate, at) <= 0) {
			visited.push(next, next);
			break;
		}
		visited.push(next);
		at = next.date.isoDate;
	}
	return visited;
};

const ofRule = (found: Observance[], ruleId: string) => found.filter((o) => o.rule.id === ruleId);

describe("nextObservance, strictly after", () => {
	it("returns the following occurrence when `from` is itself one", () => {
		expect(
			nextObservance(
				iso("2026-03-03"),
				"chotrul-duchen",
				EXAMPLE_OBSERVANCES,
			)?.date.isoDate.toString(),
		).toBe("2027-02-20");
		expect(
			nextObservance(
				iso("2026-03-02"),
				"chotrul-duchen",
				EXAMPLE_OBSERVANCES,
			)?.date.isoDate.toString(),
		).toBe("2026-03-03");
	});

	it("accepts the date shapes getObservances accepts", () => {
		const viaString = nextObservance("2026-03-02" as never, "chotrul-duchen", EXAMPLE_OBSERVANCES);
		expect(viaString?.date.isoDate.toString()).toBe("2026-03-03");
	});
});

describe("nextObservance, chained", () => {
	it("reproduces getObservances over 2026 for each rule of EXAMPLE_OBSERVANCES", () => {
		const range = getObservances(iso("2026-01-01"), iso("2026-12-31"), EXAMPLE_OBSERVANCES);
		const bad: string[] = [];
		for (const rule of EXAMPLE_OBSERVANCES.rules) {
			const want = ofRule(range, rule.id).map(key);
			const got = chain("2026-01-01", "2026-12-31", rule.id, EXAMPLE_OBSERVANCES).map(key);
			if (want.length === 0)
				bad.push(`${rule.id}: the range holds nothing, so this proves nothing`);
			if (JSON.stringify(want) !== JSON.stringify(got)) bad.push(rule.id);
		}
		expect(bad).toEqual([]);
	});

	it("reproduces getObservances over 2026 for one rule of each form", () => {
		const range = getObservances(iso("2026-01-01"), iso("2026-12-31"), EVERY_FORM);
		const bad: string[] = [];
		for (const rule of EVERY_FORM.rules) {
			const want = ofRule(range, rule.id).map(key);
			const got = chain("2026-01-01", "2026-12-31", rule.id, EVERY_FORM).map(key);
			if (want.length === 0)
				bad.push(`${rule.id}: the range holds nothing, so this proves nothing`);
			if (JSON.stringify(want) !== JSON.stringify(got)) bad.push(rule.id);
		}
		expect(bad).toEqual([]);
	});

	it("carries age and the period bounds exactly as the range query does", () => {
		const annual = nextObservance(iso("2026-01-01"), "annual", EVERY_FORM);
		expect(annual?.date.isoDate.toString()).toBe("2026-05-31");
		expect(annual?.age).toBe(153);
		const period = nextObservance(iso("2026-01-01"), "period", EVERY_FORM);
		expect(period?.period?.first.isoDate.toString()).toBe("2026-05-17");
		expect(period?.period?.last.isoDate.toString()).toBe("2026-05-31");
	});

	describe("a doubled day under doubledDay: both", () => {
		const both = withRules([
			{ id: "twenty-fifth", doubledDay: "both", when: { type: "monthly", days: [25] } },
		]);

		it("visits each half exactly once", () => {
			// Tibetan 25 of 2153 month 1 is doubled: 11 and 12 February 2026.
			const days = chain("2026-02-01", "2026-02-28", "twenty-fifth", both).map(
				(o) => `${o.date.isoDate.toString()} ${o.resolution}`,
			);
			expect(days).toEqual(["2026-02-11 firstOfDoubled", "2026-02-12 secondOfDoubled"]);
			expect(nextObservance(iso("2026-02-11"), "twenty-fifth", both)?.date.isoDate.toString()).toBe(
				"2026-02-12",
			);
			expect(nextObservance(iso("2026-02-12"), "twenty-fifth", both)?.date.isoDate.toString()).toBe(
				"2026-03-13",
			);
		});
	});
});

describe("nextObservance, a period rule", () => {
	const saga = withRules([
		{
			id: "saga",
			when: { type: "period", first: { month: 4, day: 1 }, last: { month: 4, day: 30 } },
		},
	]);

	it("steps by day inside a span, carrying the span's bounds", () => {
		const next = nextObservance(iso("2026-06-01"), "saga", saga);
		expect(next?.date.isoDate.toString()).toBe("2026-06-02");
		expect(next?.resolution).toBe("inPeriod");
		expect(next?.period?.first.isoDate.toString()).toBe("2026-05-17");
		expect(next?.period?.last.isoDate.toString()).toBe("2026-06-15");
	});

	it("gives the first day of the next span from outside one, and from a span's last day", () => {
		for (const from of ["2026-05-16", "2026-08-01"]) {
			const next = nextObservance(iso(from), "saga", saga);
			expect(next?.date.isoDate.toString(), from).toBe(
				from === "2026-05-16" ? "2026-05-17" : "2027-06-05",
			);
		}
		const lastDay = nextObservance(iso("2026-06-15"), "saga", saga);
		expect(lastDay?.date.isoDate.toString()).toBe("2027-06-05");
		expect(lastDay?.period?.last.isoDate.toString()).toBe("2027-07-04");
	});
});

describe("nextObservance, null", () => {
	it("is null once an annual or western window has ended", () => {
		const ended = withRules([
			{
				id: "annual",
				when: { type: "annual", dates: [{ month: 4, day: 15 }], untilYear: 2020 },
			},
			{ id: "western", when: { type: "western", month: 3, day: 21, untilYear: 2020 } },
		]);
		expect(nextObservance(iso("2026-01-01"), "annual", ended)).toBeNull();
		expect(nextObservance(iso("2026-01-01"), "western", ended)).toBeNull();
	});

	it("looks 10 years ahead and no further", () => {
		const beyond = (fromYear: number) =>
			withRules([{ id: "w", when: { type: "western", month: 3, day: 21, fromYear } }]);
		expect(nextObservance(iso("2026-01-01"), "w", beyond(2036))).toBeNull();
		expect(nextObservance(iso("2026-01-01"), "w", beyond(2031))?.date.isoDate.toString()).toBe(
			"2031-03-21",
		);
		expect(nextObservance(iso("2026-01-01"), "w", beyond(2035))?.date.isoDate.toString()).toBe(
			"2035-03-21",
		);
	});

	it("finds a 29 February seven years on, across the 2100 gap", () => {
		const leapDay = withRules([{ id: "leap", when: { type: "western", month: 2, day: 29 } }]);
		expect(nextObservance(iso("2097-02-28"), "leap", leapDay)?.date.isoDate.toString()).toBe(
			"2104-02-29",
		);
	});
});

describe("nextObservance, the end of the computable range", () => {
	/** The last ISO day PHUGPA converts, found by the conversion's own refusal. */
	const lastConvertible = (() => {
		let ok = iso("2026-01-01");
		let bad = iso("+275760-01-01");
		while (ok.until(bad, { largestUnit: "days" }).days > 1) {
			const middle = ok.add({ days: Math.floor(ok.until(bad, { largestUnit: "days" }).days / 2) });
			if (thrownBy(() => isoToTibetan(middle, PHUGPA)) === undefined) ok = middle;
			else bad = middle;
		}
		return ok;
	})();
	const march = withRules([{ id: "w", when: { type: "western", month: 3, day: 1 } }]);

	it("finds the end through the refusal", () => {
		expect(thrownBy(() => isoToTibetan(lastConvertible, PHUGPA))).toBeUndefined();
		expect(thrownBy(() => isoToTibetan(lastConvertible.add({ days: 1 }), PHUGPA))?.code).toBe(
			"TCT_OUTSIDE_EXACT_RANGE",
		);
	});

	it("is null when the next occurrence would fall beyond the end", () => {
		const from = lastConvertible.subtract({ days: 3 });
		expect(from.year).toBe(lastConvertible.year);
		// The same rule, one year earlier, does find its day: the null is the range's doing.
		const earlier = lastConvertible.subtract({ years: 1, days: 3 });
		expect(nextObservance(earlier, "w", march)?.date.isoDate.toString()).toBe(
			`+${lastConvertible.year - 1}-03-01`,
		);
		expect(nextObservance(from, "w", march)).toBeNull();
	});

	it("is null for a monthly rule asked on the last convertible day", () => {
		const monthly = withRules([{ id: "m", when: { type: "monthly", days: [8, 15] } }]);
		expect(nextObservance(lastConvertible, "m", monthly)).toBeNull();
	});

	it("throws TCT_OUTSIDE_EXACT_RANGE for a `from` beyond the end", () => {
		const error = thrownBy(() => nextObservance(lastConvertible.add({ days: 1 }), "w", march));
		expect(error?.code).toBe("TCT_OUTSIDE_EXACT_RANGE");
	});
});

/** The first and last ISO days PHUGPA converts, each found by the conversion's own refusal. */
const convertibleEnds = (() => {
	const converts = (d: Temporal.PlainDate) => thrownBy(() => isoToTibetan(d, PHUGPA)) === undefined;
	const days = (a: Temporal.PlainDate, b: Temporal.PlainDate) =>
		Math.abs(a.until(b, { largestUnit: "days" }).days);
	const bisect = (ok0: Temporal.PlainDate, bad0: Temporal.PlainDate) => {
		let ok = ok0;
		let bad = bad0;
		while (days(ok, bad) > 1) {
			const step = Math.floor(days(ok, bad) / 2);
			const middle =
				Temporal.PlainDate.compare(bad, ok) > 0
					? ok.add({ days: step })
					: ok.subtract({ days: step });
			if (converts(middle)) ok = middle;
			else bad = middle;
		}
		return ok;
	};
	return {
		first: bisect(iso("2026-01-01"), iso("-271821-04-19")),
		last: bisect(iso("2026-01-01"), iso("+275760-01-01")),
	};
})();

const FORM_CONFIGS: readonly (readonly [string, ObservanceConfig, string])[] = [
	["no rules", withRules([]), ""],
	[
		"a western-only config",
		withRules([{ id: "r", when: { type: "western", month: 3, day: 1 } }]),
		"r",
	],
	["a monthly config", withRules([{ id: "r", when: { type: "monthly", days: [8, 15] } }]), "r"],
	["a counted config", withRules([{ id: "r", when: SOJONG_WHEN }]), "r"],
	[
		"a formula config",
		withRules([{ id: "r", when: { type: "formula", formula: "lunarDayPlusWeekdayMod4" } }]),
		"r",
	],
];

describe("a range end refused whatever the config holds", () => {
	const { first, last } = convertibleEnds;
	const OUTSIDE = "TCT_OUTSIDE_EXACT_RANGE";

	it("finds both ends through the conversion's refusal", () => {
		expect(thrownBy(() => isoToTibetan(first, PHUGPA))).toBeUndefined();
		expect(thrownBy(() => isoToTibetan(first.subtract({ days: 1 }), PHUGPA))?.code).toBe(OUTSIDE);
		expect(thrownBy(() => isoToTibetan(last.add({ days: 1 }), PHUGPA))?.code).toBe(OUTSIDE);
	});

	describe.each(FORM_CONFIGS)("getObservances with %s", (_label, config) => {
		it("refuses a `from` before the range", () => {
			const from = first.subtract({ days: 1 });
			expect(thrownBy(() => getObservances(from, first.add({ days: 5 }), config))?.code).toBe(
				OUTSIDE,
			);
		});
		it("refuses a `from` after the range", () => {
			const from = last.add({ days: 1 });
			expect(thrownBy(() => getObservances(from, from.add({ days: 5 }), config))?.code).toBe(
				OUTSIDE,
			);
		});
		it("refuses a `to` before the range", () => {
			const to = first.subtract({ days: 1 });
			expect(thrownBy(() => getObservances(to.subtract({ days: 5 }), to, config))?.code).toBe(
				OUTSIDE,
			);
		});
		it("refuses a `to` after the range", () => {
			const to = last.add({ days: 1 });
			expect(thrownBy(() => getObservances(last.subtract({ days: 5 }), to, config))?.code).toBe(
				OUTSIDE,
			);
		});
	});

	describe.each(FORM_CONFIGS.filter(([, , id]) => id !== ""))(
		"nextObservance with %s",
		(_label, config, id) => {
			it("refuses a `from` before the range", () => {
				expect(thrownBy(() => nextObservance(first.subtract({ days: 1 }), id, config))?.code).toBe(
					OUTSIDE,
				);
			});
			it("refuses a `from` after the range", () => {
				expect(thrownBy(() => nextObservance(last.add({ days: 1 }), id, config))?.code).toBe(
					OUTSIDE,
				);
			});
		},
	);
});

const EXPECTED_AT_THE_END: Record<string, string[]> = {
	monthly: ["a day", "null"],
	annual: ["null"],
	period: ["null"],
	counted: ["a day", "null"],
	formula: ["a day", "null"],
};

describe("nextObservance, month walks that cross the end of the range", () => {
	const { last } = convertibleEnds;
	const forms: readonly (readonly [string, Record<string, unknown>])[] = [
		["monthly", { type: "monthly", days: [8, 15] }],
		["annual", { type: "annual", dates: [{ month: 1, day: 15 }] }],
		["period", { type: "period", first: { month: 11, day: 1 }, last: { month: 11, day: 20 } }],
		["counted", SOJONG_WHEN],
		["formula", { type: "formula", formula: "lunarDayPlusWeekdayMod4" }],
	];

	it.each(forms)(
		"%s answers null or a day on or before the end, or throws a coded range error",
		(_form, when) => {
			const config = withRules([{ id: "r", when }]);
			const bad: string[] = [];
			const outcomes = new Set<string>();
			for (let back = 40; back >= 0; back--) {
				const from = last.subtract({ days: back });
				let found: Observance | null = null;
				const error = thrownBy(() => {
					found = nextObservance(from, "r", config);
				});
				if (error !== undefined) {
					outcomes.add(`threw ${error.code}`);
					if (error.code !== "TCT_OUTSIDE_EXACT_RANGE")
						bad.push(`${from.toString()}: threw ${error.code}`);
					continue;
				}
				const result = found as Observance | null;
				outcomes.add(result === null ? "null" : "a day");
				if (result !== null && Temporal.PlainDate.compare(result.date.isoDate, last) > 0) {
					bad.push(`${from.toString()}: ${result.date.isoDate.toString()} is past the end`);
				}
			}
			expect(bad).toEqual([]);
			// What actually happens, pinned: the walk past the edge neither throws nor finds a day beyond it.
			expect([...outcomes].sort()).toEqual(EXPECTED_AT_THE_END[_form] ?? []);
		},
	);
});

describe("nextObservance, a hit on the first day of a later search chunk", () => {
	// The search starts the day after `from`, spans FIRST_CHUNK_DAYS[form] days, then doubles, so the
	// second chunk's first day is `from` + size + 1 and the third's is `from` + 3 * size + 1. A hit on
	// exactly those days is found only if the search does not drop a chunk's first day. Monthly,
	// formula and counted rules recur within 31 days, so no chunk of theirs is ever empty and no
	// pin can sit on an edge for them; western (2922), annual (731) and period (62) can.
	const fromOffset = (target: string, offset: number) => iso(target).subtract({ days: offset });
	const at = (from: Temporal.PlainDate, id: string, config: ObservanceConfig) =>
		nextObservance(from, id, config)?.date.isoDate.toString();

	it("western: the second chunk's first day, 2923 days on", () => {
		const config = withRules([
			{ id: "w", when: { type: "western", month: 3, day: 21, fromYear: 2030, untilYear: 2030 } },
		]);
		expect(at(fromOffset("2030-03-21", 2923), "w", config)).toBe("2030-03-21");
		expect(at(fromOffset("2030-03-21", 2922), "w", config)).toBe("2030-03-21");
		expect(at(fromOffset("2030-03-21", 2924), "w", config)).toBe("2030-03-21");
	});

	it("annual: the second chunk's first day, 732 days on, and the third's, 2193", () => {
		const config = withRules([
			{
				id: "a",
				when: { type: "annual", dates: [{ month: 4, day: 15 }], fromYear: 2153, untilYear: 2153 },
			},
		]);
		for (const offset of [731, 732, 733, 2192, 2193, 2194]) {
			expect(at(fromOffset("2026-05-31", offset), "a", config), String(offset)).toBe("2026-05-31");
		}
	});

	it("period: a span's first day on the second and third chunks' first days", () => {
		const config = withRules([
			{
				id: "p",
				when: { type: "period", first: { month: 4, day: 1 }, last: { month: 4, day: 30 } },
			},
		]);
		for (const offset of [62, 63, 64, 186, 187, 188]) {
			const next = nextObservance(fromOffset("2026-05-17", offset), "p", config);
			expect(next?.date.isoDate.toString(), String(offset)).toBe("2026-05-17");
			expect(next?.period?.last.isoDate.toString(), String(offset)).toBe("2026-06-15");
		}
	});

	it("period: a span cut by a chunk's end still carries its whole bounds", () => {
		const config = withRules([
			{
				id: "p",
				when: { type: "period", first: { month: 4, day: 1 }, last: { month: 4, day: 30 } },
			},
		]);
		// From 2026-03-24 the first chunk is 2026-03-25..2026-05-25, which ends inside the span.
		const next = nextObservance(iso("2026-03-24"), "p", config);
		expect(next?.date.isoDate.toString()).toBe("2026-05-17");
		expect(next?.period?.first.isoDate.toString()).toBe("2026-05-17");
		expect(next?.period?.last.isoDate.toString()).toBe("2026-06-15");
	});

	it("doubledDay both: a pair whose halves straddle a chunk edge is visited once each", () => {
		// Tibetan 25 of month 12 of 2152 is doubled: 11 and 12 February 2026.
		const config = withRules([
			{
				id: "d",
				doubledDay: "both",
				when: { type: "annual", dates: [{ month: 12, day: 25 }], fromYear: 2152, untilYear: 2152 },
			},
		]);
		// 731 days on is the first half, the last day of the first chunk; the second half then opens
		// the second chunk. One day sooner both halves open it.
		for (const offset of [731, 732, 733]) {
			expect(at(fromOffset("2026-02-11", offset), "d", config), String(offset)).toBe("2026-02-11");
		}
		const visited = chain("2024-02-11", "2026-03-31", "d", config).map(
			(o) => `${o.date.isoDate.toString()} ${o.resolution}`,
		);
		expect(visited).toEqual(["2026-02-11 firstOfDoubled", "2026-02-12 secondOfDoubled"]);
		expect(at(fromOffset("2026-02-12", 731), "d", config)).toBe("2026-02-11");
	});
});

describe("nextObservance, a counted rule", () => {
	const sojong = withRules([
		{ id: "s", doubledDay: "first", skippedDay: "following", leapMonth: "leap", when: SOJONG_WHEN },
	]);

	it("agrees with the range query from the day before every sojong of 2026-2027", () => {
		const range = getObservances(iso("2025-06-01"), iso("2028-06-01"), sojong);
		const bad: string[] = [];
		let checked = 0;
		for (const found of range) {
			const before = found.date.isoDate.subtract({ days: 1 });
			if (before.year < 2026 || before.year > 2027) continue;
			checked++;
			// The nearest sojong after `before` is `found` itself, since nothing lies between.
			const got = nextObservance(before, "s", sojong);
			if (got === null || key(got) !== key(found)) {
				bad.push(`${before.toString()}: ${got === null ? "null" : key(got)} against ${key(found)}`);
			}
		}
		expect(checked).toBeGreaterThan(40);
		expect(bad).toEqual([]);
	});

	it("gives the 2026 anchor from the day before it", () => {
		const range = getObservances(iso("2026-01-01"), iso("2026-12-31"), sojong);
		const anchor = range.find((o) => o.resolution !== "counted");
		expect(anchor?.date.isoDate.toString()).toBe("2026-03-03");
		expect(nextObservance(iso("2026-03-02"), "s", sojong)?.date.isoDate.toString()).toBe(
			"2026-03-03",
		);
	});
});

describe("nextObservance, its arguments", () => {
	it("throws TCT_INVALID_ARGUMENT for a rule id the config does not have", () => {
		expect(
			thrownBy(() => nextObservance(iso("2026-01-01"), "nope", EXAMPLE_OBSERVANCES))?.code,
		).toBe(INVALID_ARGUMENT);
	});

	it("throws TCT_INVALID_ARGUMENT for a rule id that is not a string", () => {
		for (const bad of [undefined, null, 15, 10n, {}, ["tara"], Symbol("tara")]) {
			expect(
				thrownBy(() => nextObservance(iso("2026-01-01"), bad as never, EXAMPLE_OBSERVANCES))?.code,
			).toBe(INVALID_ARGUMENT);
		}
	});

	it("throws TCT_INVALID_ARGUMENT for a resolved TibetanDate, and does not call it a bare fields object", () => {
		const resolved = isoToTibetan(iso("2026-01-01"));
		const thrown = thrownBy(() => nextObservance(resolved as never, "tara", EXAMPLE_OBSERVANCES));
		expect(thrown?.code).toBe(INVALID_ARGUMENT);
		// Wording is not contract. This pins only that a resolved date is not misdescribed, and that
		// the caller is pointed at the field that works.
		expect(thrown?.message).not.toContain("bare");
		expect(thrown?.message).toContain("isoDate");
		expect(nextObservance(resolved.isoDate, "tara", EXAMPLE_OBSERVANCES)).not.toBeNull();
		const bare = thrownBy(() =>
			nextObservance({ year: 2026, month: 1, day: 1 } as never, "tara", EXAMPLE_OBSERVANCES),
		);
		expect(bare?.code).toBe(INVALID_ARGUMENT);
		expect(bare?.message).toContain("bare");
	});

	it("checks the config before the rule id", () => {
		expect(
			thrownBy(() => nextObservance(iso("2026-01-01"), "nope", undefined as never))?.code,
		).toBe("TCT_INVALID_OBSERVANCE_CONFIG");
	});
});
