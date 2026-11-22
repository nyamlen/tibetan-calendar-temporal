import { describe, expect, it } from "vitest";
import {
	mansionDenominator,
	mansionNumber,
	moonCalendarDay,
} from "../../src/astrology/mansions.js";
import { scaleTo } from "../../src/computation/arithmetic.js";
import { trueMonthCount } from "../../src/computation/calendar.js";
import { isoToTibetan, julianDayFromIso } from "../../src/computation/conversion.js";
import { sunEquation, trueSun, trueSunDenominator } from "../../src/computation/corrections.js";
import { yearFromRoyalEra } from "../../src/computation/epoch.js";
import { meanSun } from "../../src/computation/mean-astronomy.js";
import { scalingFor } from "../../src/computation/scaling.js";
import { BHUTAN, BHUTAN_HENNING } from "../../src/traditions/bhutan.js";
import { PHUGPA, PHUGPA_HENNING } from "../../src/traditions/phugpa.js";

const scaled = scalingFor(PHUGPA);

/** The true month count for the month an ISO date falls in, and that date's lunar day. */
const resolve = (iso: string) => {
	const date = isoToTibetan(Temporal.PlainDate.from(iso), PHUGPA);
	const month = trueMonthCount(PHUGPA, yearFromRoyalEra(date.year), date.month, date.isLeapMonth);
	return { day: date.day, monthCount: month, jd: julianDayFromIso(date.isoDate) };
};

describe("the denominators are what the derivation says", () => {
	// Pinned because the whole exactness argument rests on them, and because a transcription error
	// in a tradition's constants would move them silently.
	it("puts true_sun over sunTabArgDen · 27 · 60", () => {
		expect(trueSunDenominator(scaled)).toBe(402 * 27 * 60);
		expect(trueSunDenominator(scaled)).toBe(651_240);
	});

	it("puts the mansion over 27 × commonDenominator", () => {
		expect(mansionDenominator(scaled)).toBe(scaled.commonDenominator * 27);
		expect(mansionDenominator(scaled)).toBe(2_762_560_080);
	});

	it("keeps 27 × the denominator a safe integer for every shipped tradition", () => {
		for (const config of [PHUGPA, PHUGPA_HENNING, BHUTAN, BHUTAN_HENNING]) {
			const den = mansionDenominator(scalingFor(config));
			expect(Number.isSafeInteger(den * 27)).toBe(true);
		}
	});
});

describe("true_sun follows Janson rather than the date formula", () => {
	// The regression this pins: `true_date` subtracts sun_equ/60, and reasoning by analogy gives
	// `true_sun = mean_sun + sun_equ/60` or `− sun_equ/60`. Janson divides by 27·60 instead, so the
	// solar equation's contribution here is 27 times smaller than it is to the date.
	it("is exactly mean_sun minus the solar equation, on true_sun's own denominator", () => {
		// The strongest available statement of the formula, and it pins sign AND scale at once:
		//
		//   true_sun − mean_sun ≡ −sun_equ   (all over sunTabArgDen · 27 · 60)
		//
		// `sunEquation` returns `sun_equ · sunTabArgDen`, so dividing by 27·60 is *exactly* the change
		// of denominator and the numerator passes through untouched. Reasoning by analogy with
		// `trueDate`, which divides by 60, breaks this identity by a factor of 27; getting the sign
		// wrong breaks it outright.
		const den = trueSunDenominator(scaled);
		const bad: string[] = [];
		for (let monthCount = -600; monthCount <= 600; monthCount += 7) {
			for (const day of [1, 8, 15, 22, 30]) {
				const mean = scaleTo(meanSun(scaled, day, monthCount), scaled.meanSun.den, den);
				const delta = trueSun(scaled, day, monthCount) - mean;
				const equation = sunEquation(scaled, day, monthCount);
				if (delta !== -equation) bad.push(`${monthCount}/${day}: ${delta} ≠ ${-equation}`);
			}
		}
		expect(bad).toEqual([]);
	});

	it("keeps the correction inside the table's bound", () => {
		// sun_tab is bounded by 11 and `sunEquation` carries a factor of sunTabArgDen, so the whole
		// correction is at most 11 · 402 = 4,422 on this denominator — under 1/147 of a circle. The
		// equation is **signed**, so true_sun sits either side of the mean; an assertion that it is
		// always below is wrong, and was written that way first.
		const den = trueSunDenominator(scaled);
		const deltas: number[] = [];
		for (let monthCount = 0; monthCount < 400; monthCount++) {
			const mean = scaleTo(meanSun(scaled, 15, monthCount), scaled.meanSun.den, den);
			deltas.push(trueSun(scaled, 15, monthCount) - mean);
		}
		expect(Math.max(...deltas.map(Math.abs))).toBeLessThanOrEqual(11 * scaled.sunTabArgDen);
		// Both signs actually occur, so the identity above is not being satisfied trivially.
		expect(deltas.some((d) => d > 0)).toBe(true);
		expect(deltas.some((d) => d < 0)).toBe(true);
	});

	it("is an exact integer for every sampled day", () => {
		for (let monthCount = -200; monthCount <= 200; monthCount += 11) {
			for (const day of [1, 15, 30]) {
				expect(Number.isSafeInteger(trueSun(scaled, day, monthCount))).toBe(true);
			}
		}
	});
});

describe("moon_calendar_day is reduced before it is scaled", () => {
	it("always lands in [0, denominator)", () => {
		const den = mansionDenominator(scaled);
		const bad: string[] = [];
		for (let monthCount = -2000; monthCount <= 2000; monthCount += 13) {
			for (const day of [1, 7, 15, 23, 30]) {
				const value = moonCalendarDay(scaled, day, monthCount);
				if (!(value >= 0 && value < den)) bad.push(`${monthCount}/${day} → ${value}`);
			}
		}
		expect(bad).toEqual([]);
	});

	it("stays exact far outside the calendar's useful range", () => {
		// The point of reducing first: the bound does not depend on the year. monthCount 30,000 is
		// about 2,400 years from the epoch, well beyond anything the calendar is applied to.
		for (const monthCount of [-30_000, -1, 0, 1, 30_000]) {
			expect(Number.isSafeInteger(moonCalendarDay(scaled, 15, monthCount))).toBe(true);
		}
	});
});

describe("mansionNumber", () => {
	it("is always one of the 27", () => {
		const bad: string[] = [];
		for (let monthCount = -1000; monthCount <= 1000; monthCount += 3) {
			for (const day of [1, 5, 11, 19, 27, 30]) {
				const mansion = mansionNumber(scaled, day, monthCount);
				if (!Number.isInteger(mansion) || mansion < 0 || mansion > 26) {
					bad.push(`${monthCount}/${day} → ${mansion}`);
				}
			}
		}
		expect(bad).toEqual([]);
	});

	it("advances by 0, 1 or 2 a day — never backwards, and mostly by 1", () => {
		// The moon covers roughly one mansion per day, so this is the check that catches a wrong scale
		// factor: the 27·60 divisor in true_sun, or the /27 on FRAC(true_date). Get either wrong and
		// the steps scatter across the whole range instead of clustering on 1.
		//
		// **A step of 0 is expected, and 2 as well.** As the lunar day advances, `d/30` adds 1/30 while
		// `−FRAC(true_date)/27` moves by up to ±1/27, so the net change spans about −0.004 to +0.070
		// against a mansion width of 1/27 ≈ 0.037. Standing still and skipping one are both ordinary;
		// going backwards is not, and that is the real assertion here.
		const steps = new Map<number, number>();
		for (let monthCount = 1600; monthCount < 1700; monthCount++) {
			for (let day = 1; day < 30; day++) {
				const step =
					(mansionNumber(scaled, day + 1, monthCount) -
						mansionNumber(scaled, day, monthCount) +
						27) %
					27;
				steps.set(step, (steps.get(step) ?? 0) + 1);
			}
		}
		expect([...steps.keys()].sort((a, b) => a - b)).toEqual([0, 1, 2]);

		// And 1 dominates. A wrong divisor still produces *some* small steps by luck; it does not
		// produce this shape.
		const total = [...steps.values()].reduce((a, b) => a + b, 0);
		expect((steps.get(1) ?? 0) / total).toBeGreaterThan(0.8);
	});

	it("is deterministic", () => {
		const { day, monthCount } = resolve("2026-09-01");
		expect(mansionNumber(scaled, day, monthCount)).toBe(mansionNumber(scaled, day, monthCount));
	});
});
