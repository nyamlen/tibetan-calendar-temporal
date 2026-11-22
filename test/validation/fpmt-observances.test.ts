import { describe, expect, it } from "vitest";
import { lunarMansionFor } from "../../src/astrology/index.js";
import { mansionElement } from "../../src/astrology/mansion-elements.js";
import { mansionNumber } from "../../src/astrology/mansions.js";
import { isoToTibetan } from "../../src/computation/conversion.js";
import { datesFor } from "../../src/months.js";
import { formulaHolds } from "../../src/observances/formulas.js";
import { EXAMPLE_OBSERVANCES, getObservances } from "../../src/observances/index.js";
import { PHUGPA } from "../../src/traditions/phugpa.js";
import { FPMT_OBSERVANCES } from "../fixtures/fpmt-observances.js";
import { fpmtMoonComparison } from "../support/fpmt.js";
import { FPMT_LABEL_GROUPS, fpmtLabelComparison } from "../support/fpmt-config.js";
import {
	favorabilityDays,
	favorabilityDisagreements,
	mansionDays,
	mansionDisagreements,
	scaled,
	yogaDays,
} from "../support/fpmt-yoga.js";

const iso = (s: string) => Temporal.PlainDate.from(s);

/**
 * The fire puja formula's misses against FPMT's "Fire puja" labels, by date and in both directions:
 * `fpmt` is a day FPMT labels that the engine's formula does not hold on, `engine` a day the formula
 * holds on that FPMT does not label. 21 and 19.
 *
 * Measured on the engine's own Tibetan date for each day and not on the day number FPMT prints: the
 * two differ on three days (2022-12-03, 2023-11-09, 2024-12-08), and the claim is about the engine.
 * A literal captured from a run, so a change in either the formula or the arithmetic shows as a named
 * date.
 */
const FIRE_PUJA_RESIDUALS: readonly string[] = [
	"2022-03-12 fire-puja: fpmt",
	"2022-03-15 fire-puja: engine",
	"2022-04-14 fire-puja: engine",
	"2022-04-15 fire-puja: fpmt",
	"2022-04-17 fire-puja: fpmt",
	"2022-06-22 fire-puja: fpmt",
	"2022-08-05 fire-puja: engine",
	"2022-08-14 fire-puja: engine",
	"2022-11-17 fire-puja: fpmt",
	"2022-11-21 fire-puja: engine",
	"2022-11-23 fire-puja: engine",
	"2022-11-24 fire-puja: engine",
	"2023-04-04 fire-puja: fpmt",
	"2023-05-05 fire-puja: fpmt",
	"2023-05-11 fire-puja: engine",
	"2023-05-12 fire-puja: fpmt",
	"2023-05-19 fire-puja: fpmt",
	"2023-05-26 fire-puja: fpmt",
	"2024-01-05 fire-puja: engine",
	"2024-01-06 fire-puja: fpmt",
	"2024-01-07 fire-puja: engine",
	"2024-03-14 fire-puja: engine",
	"2024-03-15 fire-puja: fpmt",
	"2024-03-16 fire-puja: engine",
	"2024-03-31 fire-puja: engine",
	"2024-05-18 fire-puja: fpmt",
	"2024-06-15 fire-puja: fpmt",
	"2024-08-01 fire-puja: fpmt",
	"2024-09-14 fire-puja: engine",
	"2025-02-04 fire-puja: engine",
	"2025-02-16 fire-puja: fpmt",
	"2025-03-16 fire-puja: engine",
	"2025-04-04 fire-puja: fpmt",
	"2025-04-13 fire-puja: fpmt",
	"2025-08-02 fire-puja: fpmt",
	"2026-04-10 fire-puja: fpmt",
	"2026-07-22 fire-puja: fpmt",
	"2026-07-23 fire-puja: engine",
	"2026-10-07 fire-puja: engine",
	"2026-11-01 fire-puja: engine",
];

const FIRE_PUJA_MISSES: readonly string[] = FIRE_PUJA_RESIDUALS.map((r) => r.slice(0, 10));

/**
 * Every residual between the example's rules, under FPMT's labels, and FPMT's calendars, by date and
 * in both directions: `fpmt` is a label the engine does not put on that day, `engine` a day the engine
 * marks that FPMT does not. The suite below stops on any residual not here.
 *
 * - **Annual.** 2023-12-25 and 2023-12-29 are the 11th-month anniversaries FPMT omits in Tibetan 2150
 *   (February 2023 to February 2024), and 2026-12-23 and 2026-12-26 the same two in Tibetan 2153.
 *   2026-10-19 and 2026-10-20 are the Sixteenth Karmapa on the first half of a doubled 9/9, where FPMT
 *   keeps the first and the example's `doubledDay: "second"` gives the second. Whether FPMT's omissions
 *   are a rule or a slip is unknown.
 * - **Day number.** FPMT's printed day number differs from the engine's on three days, and a label tied
 *   to a day number inherits it: 2022-12-03 is FPMT's 10th and the engine's 11th, and 2024-12-08
 *   FPMT's 7th and the engine's 8th, so the engine misses the Tsog and puts the 8th's two pujas a day
 *   early. 2023-11-09 produces no residual. `docs/development/testing.md` records the three days.
 * - **Sojong.** FPMT's 17 sojongs from 2022-04-30 to 2022-12-22 each fall one day before the engine's
 *   17, 2022-05-01 to 2022-12-23, which follow Rabten Choeling's counted schedule. FPMT agrees with the
 *   engine on every other sojong, 2026 included. Unexplained: a slip, or a rule the form lacks.
 * - **Fire puja.** {@link FIRE_PUJA_RESIDUALS}, the formula's misses: 40 days.
 *
 * ## When the fixture is extended
 *
 * FPMT's 2027 calendars will fail this suite on every new residual, by design. Re-measure, add each
 * residual to the list below **by date, in the same commit as the fixture**, and say in this comment
 * whether it is explained or unexplained. Do not widen a category's wording to cover a date without
 * checking the date.
 */
const RESIDUALS: readonly string[] = [
	"2022-04-30 sojong: fpmt",
	"2022-05-01 sojong: engine",
	"2022-05-15 sojong: fpmt",
	"2022-05-16 sojong: engine",
	"2022-05-29 sojong: fpmt",
	"2022-05-30 sojong: engine",
	"2022-06-13 sojong: fpmt",
	"2022-06-14 sojong: engine",
	"2022-06-28 sojong: fpmt",
	"2022-06-29 sojong: engine",
	"2022-07-13 sojong: fpmt",
	"2022-07-14 sojong: engine",
	"2022-07-27 sojong: fpmt",
	"2022-07-28 sojong: engine",
	"2022-08-11 sojong: fpmt",
	"2022-08-12 sojong: engine",
	"2022-08-26 sojong: fpmt",
	"2022-08-27 sojong: engine",
	"2022-09-10 sojong: fpmt",
	"2022-09-11 sojong: engine",
	"2022-09-24 sojong: fpmt",
	"2022-09-25 sojong: engine",
	"2022-10-09 sojong: fpmt",
	"2022-10-10 sojong: engine",
	"2022-10-24 sojong: fpmt",
	"2022-10-25 sojong: engine",
	"2022-11-08 sojong: fpmt",
	"2022-11-09 sojong: engine",
	"2022-11-22 sojong: fpmt",
	"2022-11-23 sojong: engine",
	"2022-12-07 sojong: fpmt",
	"2022-12-08 sojong: engine",
	"2022-12-22 sojong: fpmt",
	"2022-12-23 sojong: engine",
	"2022-12-03 heruka-day+dakini-day: fpmt",
	"2023-12-25 sakya-pandita: engine",
	"2023-12-29 dudjom-rinpoche: engine",
	"2024-12-08 medicine-buddha: engine",
	"2024-12-08 tara: engine",
	"2026-10-19 karmapa-16: fpmt",
	"2026-10-20 karmapa-16: engine",
	"2026-12-23 sakya-pandita: engine",
	"2026-12-26 dudjom-rinpoche: engine",
	...FIRE_PUJA_RESIDUALS,
];

// Tier 2. The engine's rules are checked against the calendars FPMT actually publishes, which is
// what makes them a tested claim rather than a transcription -- the failure mode CLAUDE.md
// records for an early draft of docs/development/testing.md, which put Losar 2026 a day out.

describe("the example's rules against FPMT's published calendars, under FPMT's labels", () => {
	// The comparison is `fpmtLabelComparison`'s, shared with the shipped page's suite, and its window is
	// the fixture's own.
	const { emitted, residuals } = fpmtLabelComparison();

	it("reproduces every label it claims and invents none, but for the residuals listed by date", () => {
		// A residual in neither list shows here by name and date, in the direction it runs.
		expect([...residuals].sort()).toEqual([...RESIDUALS].sort());
	});

	it("emits something on a useful number of days", () => {
		// A guard against the suite passing because the engine returned almost nothing.
		expect(emitted.length).toBeGreaterThan(300);
	});

	it("puts the day-number residuals on days where FPMT's day number is not the engine's", () => {
		const differing = FPMT_OBSERVANCES.filter(
			(row) => isoToTibetan(iso(row.iso), PHUGPA).day !== row.day,
		).map((row) => row.iso);
		expect(differing).toEqual(["2022-12-03", "2023-11-09", "2024-12-08"]);
		const numbering = [
			"2022-12-03 heruka-day+dakini-day: fpmt",
			"2024-12-08 medicine-buddha: engine",
			"2024-12-08 tara: engine",
		];
		expect(numbering.filter((r) => !differing.includes(r.slice(0, 10)))).toEqual([]);
		expect(numbering.filter((r) => !residuals.includes(r))).toEqual([]);
	});

	it("keeps sojong's 17 departures as pairs one day apart, FPMT's day first, and 2026 in full agreement", () => {
		const fpmtOnly = residuals
			.filter((r) => r.endsWith(" sojong: fpmt"))
			.map((r) => r.slice(0, 10));
		const engineOnly = residuals
			.filter((r) => r.endsWith(" sojong: engine"))
			.map((r) => r.slice(0, 10));
		expect([fpmtOnly.length, engineOnly.length]).toEqual([17, 17]);
		expect([fpmtOnly[0], fpmtOnly.at(-1)]).toEqual(["2022-04-30", "2022-12-22"]);
		expect([engineOnly[0], engineOnly.at(-1)]).toEqual(["2022-05-01", "2022-12-23"]);
		const apart = fpmtOnly.map(
			(d, i) => iso(engineOnly[i] ?? "").since(iso(d), { largestUnit: "day" }).days,
		);
		expect(apart).toEqual(new Array(17).fill(1));
		expect(residuals.filter((r) => r.startsWith("2026") && r.includes(" sojong:"))).toEqual([]);
		// There is something to agree about: FPMT prints sojong on days of 2026.
		const printed2026 = FPMT_OBSERVANCES.filter(
			(row) => row.iso.startsWith("2026") && (row.labels ?? []).includes("Sojong"),
		);
		expect(printed2026.length).toBeGreaterThan(20);
	});

	it("misses exactly the fire puja formula's 40 days, 21 on FPMT's side and 19 on the engine's", () => {
		const fire = residuals.filter((r) => r.includes(" fire-puja: "));
		expect(fire.map((r) => r.slice(0, 10))).toEqual([...FIRE_PUJA_MISSES]);
		expect([
			fire.filter((r) => r.endsWith("fpmt")).length,
			fire.filter((r) => r.endsWith("engine")).length,
		]).toEqual([21, 19]);
	});

	it("exercises a window and an age against FPMT's printed rows", () => {
		// The comparison above would pass vacuously if these rules emitted nothing and FPMT printed
		// nothing, so pin what each side holds.
		const days = (id: string) =>
			emitted.filter((o) => o.rule.id === id).map((o) => `${o.date.isoDate} ${String(o.age)}`);
		expect(days("lama-zopa-passing")).toEqual([
			"2024-04-13 undefined",
			"2025-04-13 undefined",
			"2026-04-13 undefined",
		]);
		expect(days("lama-zopa-birthday")).toHaveLength(5);
		expect(days("dalai-lama-birthday")).toEqual([
			"2022-07-06 87",
			"2023-07-06 88",
			"2024-07-06 89",
			"2025-07-06 90",
			"2026-07-06 91",
		]);
		expect(days("sakya-trichen-birthday")).toEqual([
			"2022-09-07 77",
			"2023-09-07 78",
			"2024-09-07 79",
			"2025-09-07 80",
			"2026-09-07 81",
		]);
	});

	it("leaves the Saga Dawa month to the engine alone, FPMT printing no label for it", () => {
		// Nothing in FPMT's calendars names a month-long period, so no group above holds it and no
		// agreement is claimed. Its days are asserted in the observances suite.
		const covered = new Set(FPMT_LABEL_GROUPS.flatMap((g) => g.ids));
		expect(covered.has("saga-dawa-month")).toBe(false);
		expect(emitted.some((o) => o.rule.id === "saga-dawa-month")).toBe(true);
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
 * ## What the measured 98.0% actually says
 *
 * 1,784 of 1,821 days agree. **The residual is on FPMT's side, not in this arithmetic**: Henning's own
 * daily Phugpa calendars (`kalacakra.org/calendar/tdata/pl_YYYY.txt`) give the same mansion as this
 * engine on all 1,821 days, and fail against FPMT on exactly the same 37. Henning is this engine's
 * lineage, so that is a check on the implementation rather than corroboration of the calendar.
 *
 * **The 37 are one-sided.** 28 sit in the last 15% of the moon's mansion, and on 27 of those FPMT's
 * element is the *next* mansion's; one sits at the start of a mansion; eight are mid-mansion. FPMT's
 * moon runs slightly ahead of the one Janson describes the almanac computing. And the failures are
 * **not spread evenly over time**: 2022, 2023 and 2024 have 6, 2 and 5, 2025 has 22, and 2026 has 2.
 *
 * **Not Janson's approximation.** `moon_calendar_day` treats the moon as circling in 27 days, but
 * Janson gives that as the almanac's own method, and Henning uses it too, so it cannot separate an
 * almanac from this engine. Also ruled out, 2026-09-14, recorded in `docs/sources/validation-sources.md`: the
 * karaṇa moon longitude almanacs also print, a constant offset, a later time of day, and the other
 * value of `a₂`.
 *
 * The eight mid-mansion days fit neither pattern. The calendar is hand-prepared and already carries
 * four provably impossible codes, so ordinary mistakes are the likeliest reading — but they are
 * recorded as unexplained rather than dismissed.
 *
 * **The shape is asserted, not just the score.** A bare threshold would keep passing if a real bug
 * appeared and moved the failures elsewhere. Pinning where they sit is what makes this a test rather
 * than a tolerance, and it fails if FPMT's data or this arithmetic changes.
 */

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
		const agreed = mansionDays.length - disagreements.length;
		expect(agreed / mansionDays.length).toBeGreaterThan(0.97);
		// Measured over the days whose code can force a mansion element, and pinned by value: the
		// fixture is static, and the shipped page quotes both numbers.
		expect({ agreed, of: mansionDays.length }).toEqual({ agreed: 1784, of: 1821 });
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
		}).toEqual({ late: 28, early: 1, middle: 8 });
	});

	it("leaves only a handful of days unexplained by either", () => {
		const stranded = mansionDisagreements().filter((d) => d.position >= 0.15 && d.position <= 0.85);
		// Pinned rather than bounded loosely: if this grows, something changed and wants looking at.
		expect(stranded.length).toBeLessThanOrEqual(8);
	});

	it("validates what the export returns, not only the internals", () => {
		// The mansion figure is measured on `mansionNumber`, which needs internal inputs to report a
		// position.
		// `lunarMansionFor` is what a consumer calls, so it must return the same mansion on every day
		// measured — or the published figure describes a function nobody can reach.
		const bad = yogaDays
			.filter((day) => {
				const index = mansionNumber(scaled, day.date.day, day.monthCount, day.date.isLeapDay);
				const exported = lunarMansionFor(iso(day.iso), PHUGPA);
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

/**
 * The yoga's **favorability** against FPMT's `FD-`/`UD-` prefix — the one day-by-day check the
 * favorability table has.
 *
 * Janson ranks none of the ten and Henning's page carries the names rather than the judgement, so
 * this is FPMT against our transcription of FPMT. The *tshig mdzod chen mo*'s grading agrees on all
 * ten rows (`test/astrology/yoga.test.ts`), but it is a separate claim over a table, not a check on
 * any day. What makes it a
 * real check rather than a tautology is that it reads **FPMT's own two letters** and not our mansion
 * arithmetic: the mansion residual cannot reach it, so a disagreement here is a disagreement
 * about the table and nothing else.
 *
 * Four days disagree, and all four are **single-day prefix flips**: each names a pair that FPMT
 * itself prints with the opposite prefix on more than a hundred other days in the same fixture. That
 * asymmetry is the evidence, and it is asserted below rather than asserted about — a table that had
 * a row's favorability backwards would disagree on *every* day carrying that pair, not on one.
 *
 * Three of the four were found by this suite on 2026-09-12 and are new:
 * [almanac-sources.md](../../docs/sources/almanac-sources.md) already recorded 2024-09-12 among four errors
 * found by a different check, over a different window.
 */

describe("the yoga's favorability against FPMT's published prefixes", () => {
	const disagreements = favorabilityDisagreements;

	it("agrees on every day but the four FPMT contradicts itself about", () => {
		expect(disagreements.map((day) => `${day.iso} ${day.code}`)).toEqual([
			// fire + fire is *pragati*, favorable, printed FD-FF on a hundred other days.
			"2024-01-21 UD-FF",
			// fire + wind is *balayukta*, favorable, printed FD-FA on a hundred and seventy others.
			"2024-02-27 UD-FA",
			// water + wind is *pratikūla*, unfavorable, printed UD-WA on a hundred and sixty others.
			"2024-03-18 FD-WA",
			// earth + water is *yauvana*, favorable, printed FD-EW on nearly two hundred others. The
			// one of the four already recorded in docs/sources/almanac-sources.md.
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

// The first external check of `isFullMoon`/`isNewMoon`, and through them `nextFullMoon` and
// `nextNewMoon`. Counted as moons, not icons: see `fpmtMoonComparison` for why an icon on the first
// half of a doubled date is a match through its twin rather than a disagreement.
describe("the full and new moons against FPMT's moon icons, 2022-2026", () => {
	const moons = fpmtMoonComparison();

	it("puts 123 of its 124 moons on a day FPMT marks with an icon of the same kind", () => {
		expect(moons.engineMoons).toHaveLength(124);
		// The shipped page says "on the same day", so that is the figure it takes: every match today
		// is on the moon's own day, and a twin-only match would have to change the sentence.
		expect(moons.sameDayEngineMoons).toHaveLength(123);
		expect(moons.matchedEngineMoons).toEqual(moons.sameDayEngineMoons);
	});

	it("differs by a day only on the new moon of February 2025, where day 30 is skipped", () => {
		// The engine's new moon ends lunar day 30, which is skipped, so it falls in the day numbered
		// 12/29. FPMT's icon is on the next day, 1/1. The only skipped-30 new moon in the window, so
		// one case cannot say whether it is a convention or a slip. Catalogued, not fitted. The full
		// moon of 2026-12-23, on a skipped 15 (the day numbered 11/14), is inside the window and
		// agrees: FPMT's icon is on the engine's day.
		expect(moons.unmatchedEngineMoons).toEqual([{ iso: "2025-02-27", kind: "new" }]);
		expect(moons.unmatchedIcons).toEqual([{ iso: "2025-02-28", kind: "new" }]);
		const [engine, icon] = [isoToTibetan(iso("2025-02-27")), isoToTibetan(iso("2025-02-28"))];
		expect([engine.month, engine.day, icon.month, icon.day]).toEqual([12, 29, 1, 1]);
	});

	it("marks the first half of two of the four doubled dates carrying a moon, and not the other two", () => {
		// The evidence the twin rule rests on, and the reason it is a rule about FPMT's practice, not
		// about the Tibetan date: the icon is always on the engine's day, the second half, and only
		// sometimes on the first as well. If this changes, re-examine the rule.
		const doubled = moons.engineMoons
			.filter((moon) => isoToTibetan(iso(moon.iso)).isDoubledDay)
			.map((moon) => {
				const first = iso(moon.iso).subtract({ days: 1 }).toString();
				const icons = moons.icons.map((i) => i.iso);
				return {
					pair: `${first}/${moon.iso}`,
					firstHalf: icons.includes(first),
					secondHalf: icons.includes(moon.iso),
				};
			});
		expect(doubled).toEqual([
			{ pair: "2022-06-28/2022-06-29", firstHalf: false, secondHalf: true },
			{ pair: "2023-04-05/2023-04-06", firstHalf: true, secondHalf: true },
			{ pair: "2024-11-30/2024-12-01", firstHalf: false, secondHalf: true },
			{ pair: "2025-11-19/2025-11-20", firstHalf: true, secondHalf: true },
		]);
		expect(moons.twinIcons).toEqual([
			{ iso: "2023-04-05", kind: "full" },
			{ iso: "2025-11-19", kind: "new" },
		]);
	});

	it("accounts for every icon: 126 of them, 63 full and 63 new, marking 124 moons", () => {
		const count = (kind: string) => moons.icons.filter((i) => i.kind === kind).length;
		expect([moons.icons.length, count("full"), count("new")]).toEqual([126, 63, 63]);
		// The two directions reconcile: the icons left after the twins and the unmatched one are the
		// same moons the engine side counts as matched on their own day. Subtracting the pinned counts
		// from the pinned total would only be arithmetic.
		const direct = moons.icons.length - moons.twinIcons.length - moons.unmatchedIcons.length;
		expect(direct).toBe(moons.sameDayEngineMoons.length);
		expect([moons.twinIcons.length, moons.unmatchedIcons.length]).toEqual([2, 1]);
	});

	it("separates a moon marked only on its doubled twin from one marked on its own day", () => {
		// FPMT marks the engine's own day for all four doubled pairs, so the real rows cannot show that
		// "on the same day" — the shipped page's words — is a narrower claim than "matched". Dropping
		// one second-half icon leaves that moon matched through its twin and no longer same-day.
		// The key is removed rather than set to undefined: `exactOptionalPropertyTypes` treats those as
		// different types, and the fixture's own rows omit the field where there is no icon.
		const moved = FPMT_OBSERVANCES.map((row) => {
			if (row.iso !== "2023-04-06") return row;
			const { moon: _dropped, ...withoutIcon } = row;
			return withoutIcon;
		});
		expect(FPMT_OBSERVANCES.find((row) => row.iso === "2023-04-06")?.moon).toBe("full");
		const result = fpmtMoonComparison(PHUGPA, moved);
		expect(result.matchedEngineMoons).toHaveLength(123);
		expect(result.sameDayEngineMoons).toHaveLength(122);
		expect(result.unmatchedEngineMoons).toEqual(moons.unmatchedEngineMoons);
	});

	it("matches an icon only to a moon of its own kind", () => {
		// FPMT's data never puts a full-moon icon on a new moon, so the real rows cannot show whether
		// the kind is compared at all. One swapped row can.
		const swapped = FPMT_OBSERVANCES.map((row) =>
			row.iso === "2022-01-17" ? { ...row, moon: "new" as const } : row,
		);
		expect(FPMT_OBSERVANCES.find((row) => row.iso === "2022-01-17")?.moon).toBe("full");
		const result = fpmtMoonComparison(PHUGPA, swapped);
		expect(result.unmatchedIcons).toContainEqual({ iso: "2022-01-17", kind: "new" });
		expect(result.unmatchedEngineMoons).toContainEqual({ iso: "2022-01-17", kind: "full" });
	});
});

describe("FPMT's advice codes, as recorded", () => {
	const row = (date: string) => FPMT_OBSERVANCES.find((r) => r.iso === date);

	it("keeps both of FPMT's misprints as printed", () => {
		// A regenerated fixture that dropped or corrected either would fail here, not silently.
		expect(row("2022-05-31")?.codes).toContain("NPG");
		expect(row("2022-07-11")?.codes?.[0]).toBe("ED-EW");
		expect(row("2022-07-11")?.dayQuality).toBeUndefined();
	});

	it("carries codes on nearly every day", () => {
		expect(FPMT_OBSERVANCES.filter((r) => r.codes !== undefined)).toHaveLength(1772);
	});
});

describe('the fire puja formula against FPMT\'s "Fire puja" labels, 2022-2026', () => {
	const MISSES = FIRE_PUJA_MISSES;

	const measured = FPMT_OBSERVANCES.map((row) => {
		const date = isoToTibetan(iso(row.iso), PHUGPA);
		const labelled = (row.labels ?? []).includes("Fire puja");
		return {
			iso: row.iso,
			date,
			agrees:
				formulaHolds("lunarDayPlusWeekdayMod4", date.day, date.isoDate.dayOfWeek % 7) === labelled,
		};
	});
	const first = FPMT_OBSERVANCES[0]?.iso ?? "";
	const last = FPMT_OBSERVANCES.at(-1)?.iso ?? "";
	const misses = measured.filter((m) => !m.agrees);

	it("agrees on 1,786 of 1,826 days", () => {
		expect(measured).toHaveLength(1826);
		expect(measured.length - misses.length).toBe(1786);
		expect(misses.map((m) => m.iso)).toEqual(MISSES);
	});

	// The shipped path, which walks months and classifies day numbers, over the whole window: it
	// crosses every month boundary and every skipped day in 2022-2026, which the two-month suite in
	// test/observances/formulas.test.ts does not.
	const shipped = getObservances(iso(first), iso(last), {
		...EXAMPLE_OBSERVANCES,
		id: "formula-sweep",
		rules: [
			{
				id: "f",
				englishName: "F",
				when: { type: "formula", formula: "lunarDayPlusWeekdayMod4" },
			},
		],
	}).map((o) => o.date.isoDate.toString());

	it("returns, through getObservances, exactly the days the per-day conversion says hold", () => {
		const expected = measured
			.filter((m) =>
				formulaHolds("lunarDayPlusWeekdayMod4", m.date.day, m.date.isoDate.dayOfWeek % 7),
			)
			.map((m) => m.iso);
		expect(shipped).toEqual(expected);
	});

	it("agrees with FPMT's Fire puja labels through getObservances on 1,786 days, missing the same 40", () => {
		const held = new Set(shipped);
		const missed = FPMT_OBSERVANCES.filter(
			(row) => held.has(row.iso) !== (row.labels ?? []).includes("Fire puja"),
		).map((row) => row.iso);
		expect(FPMT_OBSERVANCES.length - missed.length).toBe(1786);
		expect(missed).toEqual(MISSES);
	});

	it("counts the misses lying in a month holding a doubled or skipped day", () => {
		const irregular = (m: (typeof measured)[number]) => {
			const days = datesFor(
				{ year: m.date.year, month: m.date.month, isLeapMonth: m.date.isLeapMonth },
				PHUGPA,
			);
			return days.some((d) => d.isDoubledDay) || new Set(days.map((d) => d.day)).size < 30;
		};
		expect(misses.filter(irregular)).toHaveLength(39);
	});
});
