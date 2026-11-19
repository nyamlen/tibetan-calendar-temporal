import { describe, expect, it } from "vitest";
import { trueSunDenominator } from "../../src/computation/corrections.js";
import { deriveScaling } from "../../src/computation/scaling.js";
import { BHUTAN, BHUTAN_HENNING } from "../../src/traditions/bhutan.js";
import { PHUGPA, PHUGPA_HENNING } from "../../src/traditions/phugpa.js";
import type { TraditionConfig } from "../../src/traditions/types.js";
import { COARSE } from "../support/coarse-tradition.js";

// Janson App. A.2. Tsurphu shares Phugpa's mean motions but has different epoch values, and
// theirs carry denominators Phugpa's do not. Only the fields that affect scaling are given —
// this is a scaling fixture, not a usable Tsurphu configuration, and it is here to prove that
// the derived denominator really is tradition-dependent.
const TSURPHU_E1732_SCALING_ONLY: TraditionConfig = {
	...PHUGPA,
	id: "tsurphu-e1732-partial",
	name: "Tsurphu E1732 (scaling fixture only)",
	meanDate: {
		...PHUGPA.meanDate,
		atEpoch: { num: 2_353_745 * 7_635_600 + 1_795_153, den: 7_635_600 },
	},
	meanSun: { ...PHUGPA.meanSun, atEpoch: { num: -5983, den: 108_540 } },
	lunarAnomaly: { ...PHUGPA.lunarAnomaly, atEpoch: { num: 207, den: 392 } },
};

describe("deriveScaling for Phugpa", () => {
	const scaled = deriveScaling(PHUGPA);

	it("reproduces the denominators Janson's constants imply", () => {
		expect(scaled.meanDate.den).toBe(11_312); // 2^4·7·101
		expect(scaled.meanSun.den).toBe(4824); // 2^3·3^2·67
		expect(scaled.lunarAnomaly.den).toBe(3528); // 2^3·3^2·7^2
		expect(scaled.moonTabArgDen).toBe(126);
		expect(scaled.sunTabArgDen).toBe(402);
	});

	it("derives D = 102,317,040", () => {
		expect(scaled.commonDenominator).toBe(102_317_040);
		// 2^4·3^3·5·7·67·101 — the lcm of 11312, 126·60 and 402·60.
		expect([11_312, 7560, 24_120].reduce((a, b) => (a * b) / gcdOf(a, b))).toBe(102_317_040);
	});

	it("scales the constants without loss", () => {
		// m2 = 11135/11312 is already on the mean-date denominator.
		expect(scaled.meanDate.perDay).toBe(11_135);
		// m1 = 167025/5656 doubles onto 11312.
		expect(scaled.meanDate.perMonth).toBe(167_025 * 2);
		// Recovering the original rational must be exact.
		expect(scaled.meanSun.perMonth / scaled.meanSun.den).toBeCloseTo(65 / 804, 12);
		expect(scaled.lunarAnomaly.atEpoch / scaled.lunarAnomaly.den).toBeCloseTo(475 / 3528, 12);
	});

	it("expresses a quarter circle exactly on the mean-sun denominator", () => {
		expect(scaled.quarterCircle).toBe(4824 / 4);
	});

	it("stays exact far past any date the calendar is used for", () => {
		expect(scaled.exactToJulianDay).toBeGreaterThan(8.7e7);
		// Today is JD ~2.46e6, so the margin is about 36x.
		expect(scaled.commonDenominator * 2_460_000).toBeLessThan(Number.MAX_SAFE_INTEGER);
	});
});

describe("D is tradition-dependent, not a constant", () => {
	it("gives Tsurphu a denominator fifteen times Phugpa's", () => {
		const tsurphu = deriveScaling(TSURPHU_E1732_SCALING_ONLY);
		expect(tsurphu.commonDenominator).toBe(1_534_755_600);
		expect(tsurphu.commonDenominator).not.toBe(deriveScaling(PHUGPA).commonDenominator);
		expect(tsurphu.meanDate.den).toBe(7_635_600);
	});

	it("keeps Tsurphu exact well beyond any real date, though with less headroom", () => {
		const tsurphu = deriveScaling(TSURPHU_E1732_SCALING_ONLY);
		// ~5.9e6, roughly the year 11,000 — thin next to Phugpa's 8.8e7 but sufficient.
		expect(tsurphu.exactToJulianDay).toBeGreaterThan(5.8e6);
		expect(tsurphu.commonDenominator * 2_460_000).toBeLessThan(Number.MAX_SAFE_INTEGER);
	});

	it("absorbs the a2 fork without any other change", () => {
		const almanac = deriveScaling(PHUGPA);
		const henning = deriveScaling(PHUGPA_HENNING);
		// Henning's 3781/105840 enlarges the anomaly denominator by a factor of 30.
		expect(henning.lunarAnomaly.den).toBe(105_840);
		expect(henning.moonTabArgDen).toBe(3780);
		expect(henning.commonDenominator).not.toBe(almanac.commonDenominator);
		expect(henning.commonDenominator % almanac.commonDenominator).toBe(0);
		// Still exact for every plausible date.
		expect(henning.exactToJulianDay).toBeGreaterThan(2.9e6);
	});
});

describe("deriveScaling for the four shipped configs", () => {
	// The figures the `ScaledTradition` docblocks state per config.
	const rows = [
		{ config: PHUGPA, moonArgDen: 126, common: 102_317_040, exact: 88_032_250 },
		{ config: BHUTAN, moonArgDen: 126, common: 102_317_040, exact: 88_032_250 },
		{ config: PHUGPA_HENNING, moonArgDen: 3780, common: 1_534_755_600, exact: 5_868_816 },
		{ config: BHUTAN_HENNING, moonArgDen: 3780, common: 1_534_755_600, exact: 5_868_816 },
	];

	it.each(rows)("derives the stated figures for $config.id", ({ config, ...expected }) => {
		const scaled = deriveScaling(config);
		expect(scaled.meanDate.den).toBe(11_312);
		expect(scaled.moonTabArgDen).toBe(expected.moonArgDen);
		expect(scaled.moonTabArgFactor).toBe(1);
		expect(scaled.sunTabArgDen).toBe(402);
		expect(scaled.sunTabArgFactor).toBe(1);
		expect(scaled.commonDenominator).toBe(expected.common);
		expect(scaled.exactToJulianDay).toBe(expected.exact);
		expect(scaled.searchHalfWidth).toBe(3);
		expect(trueSunDenominator(scaled)).toBe(651_240);
		expect(trueSunDenominator(scaled)).toBe(scaled.meanSun.den * 135);
	});

	it.each(rows)("shares the 25 and 11 table maxima for $config.id", ({ config }) => {
		expect(Math.max(...config.moonTab.map(Math.abs))).toBe(25);
		expect(Math.max(...config.sunTab.map(Math.abs))).toBe(11);
	});
});

function gcdOf(a: number, b: number): number {
	return b === 0 ? a : gcdOf(b, a % b);
}

describe("the exact range never passes Temporal's", () => {
	it("clamps a coarse consumer config to Temporal's smaller end", () => {
		expect(deriveScaling(COARSE).exactToJulianDay).toBe(97_559_412);
		expect(
			Math.floor(Number.MAX_SAFE_INTEGER / deriveScaling(COARSE).commonDenominator),
		).toBeGreaterThan(97_559_412);
	});

	it("leaves the four shipped configs' bounds where the safe-integer limit puts them", () => {
		const moved = [PHUGPA, PHUGPA_HENNING, BHUTAN, BHUTAN_HENNING]
			.map((tradition) => deriveScaling(tradition))
			.filter(
				(s) => s.exactToJulianDay !== Math.floor(Number.MAX_SAFE_INTEGER / s.commonDenominator),
			)
			.map((s) => s.tradition.id);
		expect(moved).toEqual([]);
	});
});
