import { describe, expect, it } from "vitest";
import { lunarMansionFor } from "../../src/astrology/index.js";
import { mansionElement } from "../../src/astrology/mansion-elements.js";
import {
	mansionDenominator,
	mansionNumber,
	moonCalendarDay,
} from "../../src/astrology/mansions.js";
import { elementalYoga } from "../../src/astrology/yoga.js";
import { trueMonthCount } from "../../src/computation/calendar.js";
import { isoToTibetan } from "../../src/computation/conversion.js";
import { yearFromRoyalEra } from "../../src/computation/epoch.js";
import { scalingFor } from "../../src/computation/scaling.js";
import { weekdayNameFor } from "../../src/cycles.js";
import { getObservances } from "../../src/observances/index.js";
import { PHUGPA } from "../../src/traditions/phugpa.js";
import type { TibetanWeekdayElement } from "../../src/types.js";
import { FPMT_OBSERVANCES } from "../fixtures/fpmt-observances.js";

const iso = (s: string) => Temporal.PlainDate.from(s);

/**
 * FPMT's printed label, and the rule ids that should produce it.
 *
 * Only the labels the shipped config claims. FPMT prints others — "Precepts", "Fire puja", "Naga
 * puja", eclipses, teacher anniversaries — which are deliberately not shipped, so asserting on
 * them would be asserting on absence rather than on the engine.
 */
const LABEL_TO_IDS: Record<string, readonly string[]> = {
	Tsog: ["tsok-10", "tsok-25"],
	"Protector puja": ["protector-29"],
	"Tara puja": ["tara-8"],
	"Medicine Buddha": ["medicine-buddha-8", "medicine-buddha-15"],
};

/**
 * The three days where the engine and FPMT disagree about the Tibetan day *number* — nothing to
 * do with observances. Catalogued in `fpmt.test.ts` and docs/testing.md; an observance sitting on
 * one of them inherits the disagreement, so it is excluded here rather than double-counted.
 */
const NUMBERING_DIVERGENCES = new Set(["2022-12-02", "2022-12-03", "2024-12-08", "2024-02-08"]);

// Tier 2. The engine's rules are checked against the calendars FPMT actually publishes, which is
// what makes them a tested claim rather than a transcription -- the failure mode CLAUDE.md
// records for an early draft of docs/testing.md, which put Losar 2026 a day out.

describe("observances against FPMT's published calendars, 2022-2025", () => {
	const emitted = getObservances(iso("2022-01-01"), iso("2025-12-31"));

	const byDate = new Map<string, Set<string>>();
	for (const o of emitted) {
		const key = o.date.isoDate.toString();
		if (!byDate.has(key)) byDate.set(key, new Set());
		byDate.get(key)?.add(o.rule.id);
	}

	it("reproduces every label it claims, and invents none", () => {
		const wrong: string[] = [];
		for (const row of FPMT_OBSERVANCES) {
			if (NUMBERING_DIVERGENCES.has(row.iso)) continue;
			const printed = new Set(row.labels ?? []);
			const ours = byDate.get(row.iso) ?? new Set<string>();
			for (const [label, ids] of Object.entries(LABEL_TO_IDS)) {
				const they = printed.has(label);
				const we = ids.some((id) => ours.has(id));
				if (they !== we) wrong.push(`${row.iso} (day ${row.day}) ${label}: fpmt ${they}, us ${we}`);
			}
		}
		expect(wrong).toEqual([]);
	});

	it("emits something on a useful number of days", () => {
		// A guard against the suite passing because the engine returned almost nothing.
		expect(emitted.length).toBeGreaterThan(300);
	});
});

/**
 * The elemental yoga, and the only external check the mansion arithmetic has.
 *
 * FPMT's day-quality code names the **unordered pair** of the weekday's element and the lunar
 * mansion's. The weekday half is a bare congruence on the Julian day, so subtracting it **forces**
 * the mansion's element — which turns a published almanac code into a day-by-day test of astronomy
 * nothing else here can reach.
 *
 * Three sources meet: Janson gives the mansion number, Henning the element each mansion carries,
 * FPMT the pair. None derives from another, so agreement means something.
 *
 * ## What the measured 97.6% actually says
 *
 * 1,424 of 1,459 days agree. **The residual is on FPMT's side, not in this arithmetic**: Henning's own
 * daily Phugpa calendars (`kalacakra.org/calendar/tdata/pl_YYYY.txt`) give the same mansion as this
 * engine on all 1,459 days, and fail against FPMT on exactly the same 35. Henning is this engine's
 * lineage, so that is a check on the implementation rather than corroboration of the calendar.
 *
 * **The 35 are one-sided.** 28 sit in the last 15% of the moon's mansion, and on 27 of those FPMT's
 * element is the *next* mansion's; one sits at the start of a mansion; six are mid-mansion. FPMT's
 * moon runs slightly ahead of the one Janson describes the almanac computing. And the failures are
 * **not spread evenly over time**: 2022, 2023 and 2024 have 6, 2 and 5, and 2025 has 22.
 *
 * **Not Janson's approximation.** `moon_calendar_day` treats the moon as circling in 27 days, but
 * Janson gives that as the almanac's own method, and Henning uses it too, so it cannot separate an
 * almanac from this engine. Also ruled out, 2026-09-14, recorded in `docs/validation-sources.md`: the
 * karaṇa moon longitude almanacs also print, a constant offset, a later time of day, and the other
 * value of `a₂`.
 *
 * The six mid-mansion days fit neither pattern. The calendar is hand-prepared and already carries
 * four provably impossible codes, so ordinary mistakes are the likeliest reading — but they are
 * recorded as unexplained rather than dismissed.
 *
 * **The shape is asserted, not just the score.** A bare threshold would keep passing if a real bug
 * appeared and moved the failures elsewhere. Pinning where they sit is what makes this a test rather
 * than a tolerance, and it fails if FPMT's data or this arithmetic changes.
 */

/** E earth, W water, F fire, A air — air being Janson's *wind*. */
const ELEMENT_LETTERS: Record<string, TibetanWeekdayElement> = {
	E: "earth",
	W: "water",
	F: "fire",
	A: "wind",
};

const scaled = scalingFor(PHUGPA);

/** Every day carrying a code, with the element the code forces on the mansion. */
const yogaDays = FPMT_OBSERVANCES.flatMap((row) => {
	if (!row.dayQuality) return [];
	const date = isoToTibetan(iso(row.iso), PHUGPA);
	const weekday = weekdayNameFor(date.tibetanWeekday, PHUGPA).element;
	const pair = row.dayQuality
		.slice(-2)
		.split("")
		.map((letter) => ELEMENT_LETTERS[letter]);
	if (pair.some((element) => element === undefined)) return [];

	// `isLeapMonth` is not optional here. `trueMonthCount` defaults it to false, and a leap month
	// shares its number with a regular twin — so omitting it silently reads the twin's month and
	// was worth 22 spurious failures, all in leap month 6 of 2024, before this was caught.
	const monthCount = trueMonthCount(
		PHUGPA,
		yearFromRoyalEra(date.year),
		date.month,
		date.isLeapMonth,
	);
	return [
		{
			iso: row.iso,
			code: row.dayQuality,
			weekday,
			pair: pair as TibetanWeekdayElement[],
			date,
			monthCount,
		},
	];
});

describe("the elemental yoga against FPMT's day-quality codes", () => {
	it("always names the weekday's element as one of the pair", () => {
		// The half needing no mansion arithmetic, and the observation that first identified these
		// codes as Janson's elemental yoga. Four days fail, and all four are FPMT's own errors.
		const bad = yogaDays
			.filter((day) => !day.pair.includes(day.weekday))
			.map((day) => `${day.iso} ${day.code} weekday=${day.weekday}`);
		expect(bad).toEqual(
			[
				// UD-EW is not one of the ten at all: earth + water is *yauvana*, favorable, and printed
				// FD-EW everywhere else in the same calendars.
				"2024-09-12 UD-EW weekday=wind",
				// Three days printed UD-EF against a weekday element in neither position — two of them
				// adjacent, which cannot happen, since the weekday element changes daily.
				"2026-04-22 UD-EF weekday=water",
				"2026-04-23 UD-EF weekday=wind",
				"2026-04-29 UD-EF weekday=water",
			].filter((entry) => yogaDays.some((day) => entry.startsWith(day.iso))),
		);
	});

	it("puts the mansion in the element the code forces, on at least 97% of days", () => {
		const disagreements = mansionDisagreements();
		const agreed = yogaDays.length - disagreements.length;
		expect(agreed / yogaDays.length).toBeGreaterThan(0.97);
	});

	it("puts its disagreements at the late edge of a mansion, on one side only", () => {
		// The structural claim, and the one that would break if the arithmetic were actually wrong:
		// a real bug scatters failures, while FPMT's moon running slightly ahead crowds them against
		// the END of a mansion and not its start. Pinned by value — the fixture is static.
		const disagreements = mansionDisagreements();
		expect({
			late: disagreements.filter((d) => d.position > 0.85).length,
			early: disagreements.filter((d) => d.position < 0.15).length,
			middle: disagreements.filter((d) => d.position >= 0.15 && d.position <= 0.85).length,
		}).toEqual({ late: 28, early: 1, middle: 6 });
	});

	it("leaves only a handful of days unexplained by either", () => {
		const stranded = mansionDisagreements().filter((d) => d.position >= 0.15 && d.position <= 0.85);
		// Pinned rather than bounded loosely: if this grows, something changed and wants looking at.
		expect(stranded.length).toBeLessThanOrEqual(6);
	});

	it("validates what the export returns, not only the internals", () => {
		// The 97.6% is measured on `mansionNumber`, which needs internal inputs to report a position.
		// `lunarMansionFor` is what a consumer calls, so it must return the same mansion on every day
		// measured — or the published figure describes a function nobody can reach.
		const bad = yogaDays
			.filter((day) => {
				const index = mansionNumber(scaled, day.date.day, day.monthCount, day.date.isLeapDay);
				const exported = lunarMansionFor(iso(day.iso), { tradition: PHUGPA });
				return exported.index !== index || exported.element !== mansionElement(index);
			})
			.map((day) => day.iso);
		expect(bad).toEqual([]);
	});

	it("covers a useful number of days", () => {
		// Guards every sweep above against passing because almost nothing carried a code.
		expect(yogaDays.length).toBeGreaterThan(1400);
	});
});

/** Days where the computed mansion's element is not the one FPMT's code forces. */
function mansionDisagreements() {
	const denominator = mansionDenominator(scaled);
	const out: { iso: string; position: number }[] = [];
	for (const day of yogaDays) {
		if (!day.pair.includes(day.weekday)) continue;
		const remaining = [...day.pair];
		remaining.splice(remaining.indexOf(day.weekday), 1);
		const forced = remaining[0];

		const mansion = mansionNumber(scaled, day.date.day, day.monthCount, day.date.isLeapDay);
		if (mansionElement(mansion) === forced) continue;

		// How far through the mansion the moon sits: 0 just entered, 1 about to leave.
		const position =
			((moonCalendarDay(scaled, day.date.day, day.monthCount, day.date.isLeapDay) * 27) %
				denominator) /
			denominator;
		out.push({ iso: day.iso, position });
	}
	return out;
}

/**
 * The yoga's **favorability** against FPMT's `FD-`/`UD-` prefix — the one day-by-day check the
 * favorability table has.
 *
 * Janson ranks none of the ten and Henning's page carries the names rather than the judgement, so
 * this is FPMT against our transcription of FPMT. The *tshig mdzod chen mo*'s grading agrees on all
 * ten rows (`test/astrology/yoga.test.ts`), but it is a separate claim over a table, not a check on
 * any day. What makes it a
 * real check rather than a tautology is that it reads **FPMT's own two letters** and not our mansion
 * arithmetic: the 2.4% mansion residual cannot reach it, so a disagreement here is a disagreement
 * about the table and nothing else.
 *
 * Four days disagree, and all four are **single-day prefix flips**: each names a pair that FPMT
 * itself prints with the opposite prefix on more than a hundred other days in the same fixture. That
 * asymmetry is the evidence, and it is asserted below rather than asserted about — a table that had
 * a row's favorability backwards would disagree on *every* day carrying that pair, not on one.
 *
 * Three of the four were found by this suite on 2026-09-12 and are new:
 * [almanac-sources.md](../../docs/almanac-sources.md) already recorded 2024-09-12 among four errors
 * found by a different check, over a different window.
 */

/** `FD-` is favorable, `UD-` unfavorable. Anything else is not one of FPMT's day-quality codes. */
const PREFIX_FAVORABLE: Record<string, boolean> = { "FD-": true, "UD-": false };

/** Every day whose code parses into a prefix and a pair of known element letters. */
const favorabilityDays = FPMT_OBSERVANCES.flatMap((row) => {
	if (!row.dayQuality) return [];
	const favorable = PREFIX_FAVORABLE[row.dayQuality.slice(0, 3)];
	const pair = row.dayQuality
		.slice(-2)
		.split("")
		.map((letter) => ELEMENT_LETTERS[letter]);
	if (favorable === undefined || pair.some((element) => element === undefined)) return [];
	return [{ iso: row.iso, code: row.dayQuality, favorable, pair: pair as TibetanWeekdayElement[] }];
});

describe("the yoga's favorability against FPMT's published prefixes", () => {
	/** Days where our table and FPMT's prefix disagree about the same pair. */
	const disagreements = favorabilityDays.filter((day) => {
		const first = day.pair[0];
		const second = day.pair[1];
		if (first === undefined || second === undefined) return false;
		return elementalYoga(first, second).favorable !== day.favorable;
	});

	it("agrees on every day but the four FPMT contradicts itself about", () => {
		expect(disagreements.map((day) => `${day.iso} ${day.code}`)).toEqual([
			// fire + fire is *pragati*, favorable, printed FD-FF on a hundred other days.
			"2024-01-21 UD-FF",
			// fire + wind is *balayukta*, favorable, printed FD-FA on a hundred and seventy others.
			"2024-02-27 UD-FA",
			// water + wind is *pratikūla*, unfavorable, printed UD-WA on a hundred and sixty others.
			"2024-03-18 FD-WA",
			// earth + water is *yauvana*, favorable, printed FD-EW on nearly two hundred others. The
			// one of the four already recorded in docs/almanac-sources.md.
			"2024-09-12 UD-EW",
		]);
	});

	it("finds each of those four contradicted by the same calendar on a hundred other days", () => {
		// The argument that these are FPMT's typos and not our table's errors, made as a test. A wrong
		// row would disagree on every day carrying its pair; each of these is outvoted by its own
		// source, and by three orders of magnitude.
		const thin: string[] = [];
		for (const day of disagreements) {
			const sameLetters = favorabilityDays.filter((other) =>
				other.code.endsWith(day.code.slice(-2)),
			);
			const otherWay = sameLetters.filter((other) => other.favorable !== day.favorable);
			if (sameLetters.length - otherWay.length !== 1 || otherWay.length < 100) {
				thin.push(
					`${day.iso} ${day.code}: ${otherWay.length} the other way, ${sameLetters.length} in all`,
				);
			}
		}
		expect(thin).toEqual([]);
	});

	it("agrees on better than 99.7% of the days carrying a code", () => {
		const agreed = favorabilityDays.length - disagreements.length;
		expect(agreed / favorabilityDays.length).toBeGreaterThan(0.997);
	});

	it("uses all ten codes, so no row of the table is untested", () => {
		// A favorability table can only be validated on pairs the source actually prints. All ten
		// appear, so every row is exercised; if a future fixture window lost one, this says so rather
		// than quietly reducing the check to nine.
		const codes = new Set(favorabilityDays.map((day) => day.code.slice(-2)));
		expect(codes.size).toBe(10);
	});

	it("covers a useful number of days", () => {
		expect(favorabilityDays.length).toBeGreaterThan(1400);
	});
});
