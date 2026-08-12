import { describe, expect, it } from "vitest";
import {
	isoFromJulianDay,
	isoToTibetan,
	julianDayFromIso,
} from "../../src/computation/conversion.js";
import { lunarAnomaly, meanDate, meanSun } from "../../src/computation/mean-astronomy.js";
import { deriveScaling } from "../../src/computation/scaling.js";
import { PHUGPA, PHUGPA_HENNING } from "../../src/traditions/phugpa.js";
import {
	A2_DIVERGENCE_COUNTS,
	A2_DIVERGENCE_DATES,
	JANSON_EPOCH,
} from "../fixtures/janson-epoch.js";

const scaled = deriveScaling(PHUGPA);

/**
 * Janson states these at the **nominal** epoch, the beginning of month 3 of 806.
 *
 * That is true month count **1** here, not 0: Phugpa's intercalation index at the epoch is 61, and
 * 61 >= 48 puts the month with count 0 at month 2 of 806 instead. Comparing against
 * `meanDate.atEpoch` directly is off by exactly one lunation, which is the trap this constant
 * exists to name.
 */
const NOMINAL_EPOCH_MONTH = 1;

describe("Janson's epoch values, 806 CE", () => {
	// Checks m0 and m1 together against a printed six-decimal value, 1,121 years before the Losar
	// table starts. Nothing else in the suite reaches this far back with an external number.
	it("reproduces the mean date at the nominal epoch to six decimals", () => {
		const value = meanDate(scaled, 0, NOMINAL_EPOCH_MONTH) / scaled.meanDate.den;
		expect(value).toBeCloseTo(JANSON_EPOCH.julianDayOffset + JANSON_EPOCH.meanDate, 6);
	});

	it("puts the epoch's mean new moon on Janson's Julian day", () => {
		const value = meanDate(scaled, 0, NOMINAL_EPOCH_MONTH) / scaled.meanDate.den;
		expect(Math.floor(value)).toBe(JANSON_EPOCH.julianDay);
	});

	it("reproduces the mean sun and lunar anomaly there to six decimals", () => {
		const sun = meanSun(scaled, 0, NOMINAL_EPOCH_MONTH) / scaled.meanSun.den;
		const anomaly = lunarAnomaly(scaled, 0, NOMINAL_EPOCH_MONTH) / scaled.lunarAnomaly.den;
		// Both are longitudes in circles, so only the fractional part is meaningful.
		expect(sun % 1).toBeCloseTo(JANSON_EPOCH.meanSun, 6);
		expect(anomaly % 1).toBeCloseTo(JANSON_EPOCH.lunarAnomaly, 6);
	});

	// Janson gives the date as Julian-calendar, which is the right convention for 806 and not what
	// Temporal produces. Asserting the Julian day rather than the rendering keeps the fixture
	// honest about which calendar it is speaking.
	it("keeps the Julian-calendar rendering out of the comparison", () => {
		expect(JANSON_EPOCH.julianCalendarDate).toBe("23 March 806");
		// Proleptic Gregorian runs four days ahead of Julian in 806.
		expect(isoFromJulianDay(JANSON_EPOCH.julianDay).toString()).toBe("0806-03-27");
	});
});

/** The Tibetan date under a tradition, including which of a doubled pair this is. */
const key = (jd: number, config: typeof PHUGPA) => {
	const d = isoToTibetan(isoFromJulianDay(jd), config);
	return `${d.month}${d.isLeapMonth ? "L" : ""}-${d.day}${d.isLeapDay ? "b" : ""}`;
};

const differs = (jd: number) => key(jd, PHUGPA) !== key(jd, PHUGPA_HENNING);

/**
 * Divergence **events** in a window of Gregorian years, not differing days.
 *
 * A divergence is a skipped or doubled day shifting by one, which surfaces as one or two
 * *consecutive* differing calendar days; Janson counts each run as a single example. Counting raw
 * days gives 15, 12 and 24 against his 9, 8 and 16 — the same phenomenon, tallied differently.
 */
function countEvents(from: number, to: number): number {
	const pad = (y: number) => String(y).padStart(4, "0");
	const end = julianDayFromIso(Temporal.PlainDate.from(`${pad(to)}-12-31`));
	let events = 0;
	let previous = false;
	for (let jd = julianDayFromIso(Temporal.PlainDate.from(`${pad(from)}-01-01`)); jd <= end; jd++) {
		const now = differs(jd);
		if (now && !previous) events++;
		previous = now;
	}
	return events;
}

// The a2 fork decided which value this package ships. Janson's own computer search over three
// windows is an independent tally of where the two disagree, and the package ships both — so
// these are claims about the pair, falsifiable without picking a winner.
describe("where the two candidate values of a2 disagree", () => {
	it("diverges on every date Janson lists, and agrees with him on the Julian day", () => {
		for (const row of A2_DIVERGENCE_DATES) {
			expect(julianDayFromIso(Temporal.PlainDate.from(row.iso))).toBe(row.julianDay);
			expect(differs(row.julianDay)).toBe(true);
		}
		expect(A2_DIVERGENCE_DATES).toHaveLength(3);
	});

	it.each(A2_DIVERGENCE_COUNTS)(
		"finds Janson's $count divergences in $from-$to",
		({ from, to, count }) => {
			expect(countEvents(from, to)).toBe(count);
		},
		30_000,
	);
});
