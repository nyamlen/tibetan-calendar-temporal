import { bench, describe } from "vitest";
import { isoToTibetan } from "../src/computation/conversion.js";
import { monthsFor } from "../src/months.js";
import { EXAMPLE_OBSERVANCES, getObservances, observancesOn } from "../src/observances/index.js";
import { PHUGPA } from "../src/traditions/phugpa.js";

/**
 * Release-time benchmarks. Not in CI, and deliberately not a regression gate — shared runners are
 * noisy enough that a threshold would fire on the runner rather than on the change, and a guard
 * that fires wrongly is worse than none.
 *
 * Each case exists because a number is already load-bearing somewhere and nothing measures it:
 *
 * - `getObservances` over its maximum admissible span, 10 years, justifies `MAX_SPAN_YEARS`, and
 *   therefore the `TCT_SPAN_TOO_WIDE` error a consumer can hit. The day, month, year and two-year
 *   cases are the approved budgets of 5, 10, 50 and 100 ms, which the figures in `RESULTS.md` are
 *   compared against. A materially different figure is a finding about that cap, not a benchmark to
 *   tune.
 * - `monthsFor`'s cache is the one memoisation whose keep is argued from a number (`CLAUDE.md`:
 *   "~180 µs to under 1 µs"), and that number has never had a harness.
 * - Single-date conversion is the only figure the README quotes, so it is the only one that has to
 *   be reproducible by a reader.
 *
 * Record results in `bench/RESULTS.md` with the machine, OS and Node version. A number without its
 * harness is what this project treats as unusable, and that applies to its own numbers first.
 */

const iso = (s: string) => Temporal.PlainDate.from(s);

describe("conversion", () => {
	const date = iso("2026-08-12");

	bench("isoToTibetan, one date", () => {
		isoToTibetan(date);
	});

	bench("isoToTibetan, one year of days", () => {
		let day = iso("2026-01-01");
		const end = iso("2026-12-31");
		while (Temporal.PlainDate.compare(day, end) <= 0) {
			isoToTibetan(day);
			day = day.add({ days: 1 });
		}
	});
});

describe("monthsFor cache", () => {
	// The cold case must not be allowed to hit the cache, so each iteration asks for a year no
	// previous iteration used. Reusing one year would measure the warm path twice and report the
	// cache as free.
	let cold = 3000;

	bench("cold — a year not seen before", () => {
		monthsFor(cold++, PHUGPA);
	});

	bench("warm — a year already computed", () => {
		monthsFor(2153, PHUGPA);
	});
});

describe("getObservances", () => {
	// One rule of each form that exists, so the figures cover the dearest of each: monthly and
	// annual and period walk months, western walks days of the Western calendar, and a formula rule
	// tests every calendar day, which is the one form whose cost is not per month.
	const everyForm = {
		id: "every-form",
		englishName: "One rule of each form",
		doubledDay: "both" as const,
		skippedDay: "preceding" as const,
		leapMonth: "leap" as const,
		rules: [
			{
				id: "monthly",
				englishName: "Monthly",
				when: { type: "monthly" as const, days: [8, 15, 30] },
			},
			{
				id: "annual",
				englishName: "Annual",
				when: { type: "annual" as const, dates: [{ month: 4, day: 15 }] },
			},
			{
				id: "period",
				englishName: "Period",
				when: {
					type: "period" as const,
					first: { month: 4, day: 1 },
					last: { month: 4, day: 15 },
				},
			},
			{
				id: "western",
				englishName: "Western",
				when: { type: "western" as const, month: 3, day: 21 },
			},
			{
				id: "formula",
				englishName: "Formula",
				when: { type: "formula" as const, formula: "lunarDayPlusWeekdayMod4" as const },
			},
		],
	};

	// The cap's worst case: `MAX_SPAN_YEARS` in `src/observances/index.ts`, 10 years, over every
	// existing form at once.
	bench("the maximum admissible span, 10 years, every form", () => {
		getObservances(iso("2020-01-01"), iso("2030-12-31"), everyForm);
	});

	bench("the maximum admissible span, 10 years, EXAMPLE_OBSERVANCES", () => {
		getObservances(iso("2020-01-01"), iso("2030-12-31"), EXAMPLE_OBSERVANCES);
	});

	bench("two years, every form (the planning chunk)", () => {
		getObservances(iso("2026-01-01"), iso("2027-12-31"), everyForm);
	});

	bench("one year, every form (the year view)", () => {
		getObservances(iso("2026-01-01"), iso("2026-12-31"), everyForm);
	});

	bench("one month, every form (the month view)", () => {
		getObservances(iso("2026-08-01"), iso("2026-08-31"), everyForm);
	});

	bench("one day, every form (the day view)", () => {
		observancesOn(iso("2026-08-12"), everyForm);
	});

	bench("one year, EXAMPLE_OBSERVANCES, the realistic case", () => {
		getObservances(iso("2026-01-01"), iso("2026-12-31"), EXAMPLE_OBSERVANCES);
	});
});

describe("getObservances, a counted (sojong) rule", () => {
	// The Rabten-shaped rule: a count walks the whole range from its anchors, and the month walk
	// widens to the Tibetan year either side of the range, so it is the form whose cost differs most
	// between a day view and a year view.
	const counted = {
		id: "sojong",
		englishName: "Sojong",
		when: {
			type: "counted" as const,
			anchor: { month: 1, day: 15 },
			waxingDays: 15,
			waningDays: { oddMonth: 14, evenMonth: 15 },
			exclude: [{ month: 1, day: 1 }],
		},
	};
	const alone = {
		id: "counted-alone",
		englishName: "A counted rule alone",
		doubledDay: "first" as const,
		skippedDay: "following" as const,
		leapMonth: "leap" as const,
		rules: [counted],
	};
	const withFive = {
		...alone,
		id: "counted-and-five",
		englishName: "A counted rule with one of each other form",
		rules: [
			...[
				{ id: "monthly", when: { type: "monthly" as const, days: [8, 15, 30] } },
				{ id: "annual", when: { type: "annual" as const, dates: [{ month: 4, day: 15 }] } },
				{
					id: "period",
					when: {
						type: "period" as const,
						first: { month: 4, day: 1 },
						last: { month: 4, day: 15 },
					},
				},
				{ id: "western", when: { type: "western" as const, month: 3, day: 21 } },
				{
					id: "formula",
					when: { type: "formula" as const, formula: "lunarDayPlusWeekdayMod4" as const },
				},
			].map((rule) => ({ ...rule, englishName: rule.id })),
			counted,
		],
	};

	for (const [label, config] of [
		["counted alone", alone],
		["counted and the five other forms", withFive],
	] as const) {
		bench(`10 years, ${label}`, () => {
			getObservances(iso("2020-01-01"), iso("2030-12-31"), config);
		});
		bench(`2 years, ${label}`, () => {
			getObservances(iso("2026-01-01"), iso("2027-12-31"), config);
		});
		bench(`1 year, ${label}`, () => {
			getObservances(iso("2026-01-01"), iso("2026-12-31"), config);
		});
		bench(`1 month, ${label}`, () => {
			getObservances(iso("2026-08-01"), iso("2026-08-31"), config);
		});
		bench(`1 day, ${label}`, () => {
			observancesOn(iso("2026-08-12"), config);
		});
	}
});
