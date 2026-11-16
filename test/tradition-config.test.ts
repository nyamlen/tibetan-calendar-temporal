import { describe, expect, it } from "vitest";
import { elementalYogaFor } from "../src/astrology/index.js";
import { isoToTibetan, losarFor, tibetanToIso } from "../src/computation/conversion.js";
import { moonEquation, sunEquation } from "../src/computation/corrections.js";
import { deriveScaling } from "../src/computation/scaling.js";
import { hasLeapMonth, leapMonthNumberFor, monthsFor } from "../src/months.js";
import { lunationFromMonth } from "../src/navigation.js";
import { EXAMPLE_OBSERVANCES, getObservances } from "../src/observances/index.js";
import { BHUTAN, BHUTAN_HENNING } from "../src/traditions/bhutan.js";
import { PHUGPA, PHUGPA_HENNING } from "../src/traditions/phugpa.js";
import type { TraditionConfig } from "../src/traditions/types.js";
import { validatedTradition } from "../src/traditions/validate.js";
import { thrownBy } from "./support/thrown.js";

const iso = (s: string) => Temporal.PlainDate.from(s);

/** A config with one field replaced by something the arithmetic cannot use. */
const broken = (patch: Record<string, unknown>): TraditionConfig =>
	({ ...PHUGPA, ...patch }) as unknown as TraditionConfig;

/**
 * `TraditionConfig` is the documented extension point and was accepted unchecked until now.
 *
 * A missing field surfaced as `Cannot read properties of undefined (reading 'den')` from inside
 * `scaleMeanMotion`, naming neither the field nor the config; a `moonTab` of the wrong length
 * reached an interpolation that indexes past its end and produced `NaN`, which propagates into a
 * date rather than failing. The decision record on the validation boundary already required this
 * check — "integrality, range, **and config shape**" — so these tests close a stated gap.
 */
describe("tradition config validation", () => {
	it("accepts the shipped configs", () => {
		expect(() => validatedTradition(PHUGPA)).not.toThrow();
	});

	it("rejects a missing or non-object config", () => {
		for (const bad of [null, undefined, 42, "phugpa"]) {
			const error = thrownBy(() => validatedTradition(bad as unknown as TraditionConfig));
			expect(error?.code).toBe("TCT_INVALID_TRADITION_CONFIG");
		}
	});

	it("rejects a missing identity field", () => {
		expect(thrownBy(() => validatedTradition(broken({ id: "" })))?.message).toMatch(/id/);
		expect(thrownBy(() => validatedTradition(broken({ name: undefined })))?.message).toMatch(
			/name/,
		);
	});

	it("rejects a non-integer epoch field", () => {
		for (const field of ["epochYear", "epochMonth", "intercalationIndexAtEpoch"]) {
			const error = thrownBy(() => validatedTradition(broken({ [field]: 1.5 })));
			expect(error?.code).toBe("TCT_INVALID_TRADITION_CONFIG");
			expect(error?.message).toContain(field);
		}
	});

	// The failure this was written for: a partial mean motion. `{ ...PHUGPA, lunarAnomaly: { perDay:
	// x } }` is the shape a reader most plausibly writes when adapting a config, and it used to reach
	// `scaleMeanMotion` and die on `undefined.den`.
	it("names the exact path of a malformed mean motion", () => {
		const error = thrownBy(() =>
			validatedTradition(broken({ lunarAnomaly: { perDay: { num: 1, den: 28 } } })),
		);
		expect(error?.code).toBe("TCT_INVALID_TRADITION_CONFIG");
		expect(error?.message).toContain("lunarAnomaly.perMonth");
	});

	it("rejects a mean motion that is not an object", () => {
		for (const bad of [null, 42, "1/28"]) {
			const error = thrownBy(() => validatedTradition(broken({ meanSun: bad })));
			expect(error?.message).toContain("meanSun must be a { perMonth, perDay, atEpoch } object");
		}
	});

	it("rejects a rational with a non-integer numerator", () => {
		const patch = { meanSun: { ...PHUGPA.meanSun, atEpoch: { num: 1.5, den: 60 } } };
		expect(thrownBy(() => validatedTradition(broken(patch)))?.message).toContain(
			"meanSun.atEpoch.num",
		);
	});

	it("rejects a rational with a zero, negative or fractional denominator", () => {
		for (const den of [0, -28, 2.5, Number.NaN]) {
			const patch = { lunarAnomaly: { ...PHUGPA.lunarAnomaly, perDay: { num: 1, den } } };
			const error = thrownBy(() => validatedTradition(broken(patch)));
			expect(error?.message).toContain("lunarAnomaly.perDay.den");
		}
	});

	// Length is not cosmetic. moonTabAt extends the table by symmetries that only hold for eight
	// entries; a shorter one interpolates against `undefined` and yields NaN, and NaN reaches a date.
	it("rejects a correction table of the wrong length", () => {
		expect(thrownBy(() => validatedTradition(broken({ moonTab: [0, 5, 10] })))?.message).toMatch(
			/moonTab must have exactly 8 entries, received 3/,
		);
		expect(
			thrownBy(() => validatedTradition(broken({ sunTab: [0, 6, 10, 11, 12] })))?.message,
		).toMatch(/sunTab must have exactly 4 entries, received 5/);
	});

	it("rejects a non-finite entry inside a correction table", () => {
		const moonTab = [...PHUGPA.moonTab];
		moonTab[3] = Number.NaN;
		expect(thrownBy(() => validatedTradition(broken({ moonTab })))?.message).toContain(
			"moonTab[3]",
		);
	});

	it("tells a caller who passed a { tradition } bag to pass the config itself", () => {
		// Since 2026-09-24 a function whose only choice is the tradition takes it positionally, so the
		// likeliest bad argument from a migrating caller is the old bag. Without this the message was
		// "id must be a non-empty string", which names a field the caller never meant to write.
		const bag = { tradition: PHUGPA } as unknown as TraditionConfig;
		const error = thrownBy(() => validatedTradition(bag));
		expect(error?.code).toBe("TCT_INVALID_TRADITION_CONFIG");
		expect(error?.message).toMatch(/\{ tradition \}/);
		expect(error?.message).toMatch(/itself/);
		// A real config that happens to carry an extra `tradition` key is judged on its fields first,
		// and then refused for the key, like any other unknown one.
		expect(thrownBy(() => validatedTradition(broken({ tradition: PHUGPA })))?.message).toContain(
			'"tradition"',
		);
		expect(thrownBy(() => validatedTradition(broken({ id: "", tradition: 1 })))?.message).toMatch(
			/id must be/,
		);
	});

	it("suggests the spread that fixes it", () => {
		expect(thrownBy(() => validatedTradition(broken({ moonTab: [] })))?.message).toContain(
			"...PHUGPA",
		);
	});

	// Every public entry point derives its scaling through a single memoised choke point, so all of
	// them inherit the check. If one ever stops doing so, this is what notices.
	it("guards every entry point, not just the conversion", () => {
		const bad = broken({ moonTab: [] });
		for (const call of [
			() => isoToTibetan(iso("2026-08-12"), bad),
			() => tibetanToIso({ year: 2153, month: 6, day: 30 }, bad),
			() => losarFor(2153, bad),
			() => getObservances(iso("2026-01-01"), iso("2026-12-31"), EXAMPLE_OBSERVANCES, bad),
		]) {
			expect(thrownBy(call)?.code).toBe("TCT_INVALID_TRADITION_CONFIG");
		}
	});

	// Memoised per object, and a failed validation is never memoised.
	// A second call must still reject rather than sail through on a cache miss turned hit.
	it("stays rejecting on a repeat call", () => {
		const bad = broken({ sunTab: [] });
		expect(thrownBy(() => validatedTradition(bad))?.code).toBe("TCT_INVALID_TRADITION_CONFIG");
		expect(thrownBy(() => validatedTradition(bad))?.code).toBe("TCT_INVALID_TRADITION_CONFIG");
	});

	// Shape, not astronomy. A config with plausible types and wrong constants passes here and yields
	// a wrong calendar -- only a fixture catches that. Stated so nobody reads this suite as a
	// correctness gate.
	it("validates shape and not astronomy", () => {
		// The epoch shifted by exactly one day: every field is the right type and in range, and every
		// date it produces is off by one.
		const atEpoch = PHUGPA.meanDate.atEpoch;
		const plausibleButWrong = broken({
			id: "invented",
			meanDate: { ...PHUGPA.meanDate, atEpoch: { ...atEpoch, num: atEpoch.num + atEpoch.den } },
		});
		expect(() => validatedTradition(plausibleButWrong)).not.toThrow();
		expect(isoToTibetan(iso("2026-08-12"), plausibleButWrong).day).not.toBe(
			isoToTibetan(iso("2026-08-12"), PHUGPA).day,
		);
	});

	// The solar anomaly is mean_sun - 1/4, so the quarter must be exact. The derived denominator is
	// scaled onto lcm(den, 4) rather than refused, so a meanSun over an odd denominator is a config
	// like any other, and the same rationals over any denominator give the same dates.
	it("accepts a meanSun whose reduced denominator has no factor of 4, and dates it as its multiples", () => {
		const over = (den: number, k: number) => ({
			meanSun: {
				perMonth: { num: 65 * k, den },
				perDay: { num: 13 * k, den },
				atEpoch: { num: 743 * k, den },
			},
		});
		const key = (t: ReturnType<typeof isoToTibetan>) =>
			`${t.year}-${t.month}-${t.day}${t.isLeapMonth ? "L" : ""}${t.isLeapDay ? "d" : ""}`;
		const problems: string[] = [];
		for (const [id, patch, reference] of [
			["odd803", over(803, 1), over(803 * 4, 4)],
			[
				"twoQuarters",
				{
					meanSun: {
						perMonth: { num: 2, den: 4 },
						perDay: { num: 2, den: 120 },
						atEpoch: { num: 2, den: 4 },
					},
				},
				{
					meanSun: {
						perMonth: { num: 60, den: 120 },
						perDay: { num: 2, den: 120 },
						atEpoch: { num: 60, den: 120 },
					},
				},
			],
		] as const) {
			const config = broken({ id, ...patch });
			const twin = broken({ id: `${id}-twin`, ...reference });
			const scaled = deriveScaling(config);
			if (scaled.meanSun.den % 4 !== 0) problems.push(`${id}: den ${scaled.meanSun.den}`);
			if (scaled.quarterCircle * 4 !== scaled.meanSun.den) problems.push(`${id}: quarter inexact`);
			for (let d = iso("2026-01-01"); d.year === 2026; d = d.add({ days: 1 })) {
				if (key(isoToTibetan(d, config)) !== key(isoToTibetan(d, twin))) {
					problems.push(`${id}: ${d.toString()} differs`);
				}
			}
		}
		expect(problems).toEqual([]);
	});
});

/**
 * The ±3 search window in `isoToTibetan`, which is derived from the tradition rather than written
 * at the loop.
 *
 * Two assertions with different jobs. The Phugpa-specific ones below pin the paper's constants and
 * the window they prove, and would fire on a mistyped table entry in `phugpa.ts` — where today a
 * one-digit error would quietly produce a different calendar. The general one is in the shipped
 * validator, because it has to hold for a tradition nobody has written yet.
 */
describe("derived search window", () => {
	it("reproduces the proved ±3 for the shipped traditions", () => {
		expect(deriveScaling(PHUGPA).searchHalfWidth).toBe(3);
		expect(deriveScaling(PHUGPA_HENNING).searchHalfWidth).toBe(3);
	});

	// The two numbers the written proof rests on: |true_date - mean_date| <= (25 + 11)/60 = 0.6
	// days. Pinned here so the proof and the tables cannot drift apart silently.
	it("pins the table magnitudes the proof quotes", () => {
		expect(Math.max(...PHUGPA.moonTab.map(Math.abs))).toBe(25);
		expect(Math.max(...PHUGPA.sunTab.map(Math.abs))).toBe(11);
	});

	it("widens the window for a tradition with larger corrections", () => {
		const wide = broken({ moonTab: [0, 50, 100, 150, 190, 220, 240, 250] });
		expect(deriveScaling(wide).searchHalfWidth).toBeGreaterThan(3);
	});

	// The finding this closes. A well-formed but non-Phugpa-shaped config passed validation and then
	// broke the hardcoded window: 88 days of 2026 threw TCT_INTERNAL -- blaming the engine for the
	// caller's config -- and 22 more converted to a date that did not convert back, with no throw at
	// all. Every other config test here checks that a *malformed* config is rejected; this is the
	// one that checks a *different* one computes, which is the whole point of injecting them.
	it("round-trips every day of a year under a wider correction table", () => {
		const wide = broken({ moonTab: [0, 50, 100, 150, 190, 220, 240, 250] });
		const mismatches: string[] = [];

		for (let d = iso("2026-01-01"); d.year === 2026; d = d.add({ days: 1 })) {
			const tibetan = isoToTibetan(d, wide);
			const back = tibetanToIso(
				{
					year: tibetan.year,
					month: tibetan.month,
					day: tibetan.day,
					isLeapMonth: tibetan.isLeapMonth,
					isLeapDay: tibetan.isLeapDay,
				},
				wide,
			);
			if (!back.equals(d)) mismatches.push(`${d.toString()} -> ${back.toString()}`);
		}

		expect(mismatches).toEqual([]);
	});

	// The general bound, which is on the derived window rather than on the tables. A magnitude limit
	// would hardcode Phugpa's 25 and 11 into a field the non-negotiables declare injectable, and
	// would have to decide "is this Phugpa" from a consumer-settable `id`.
	it("rejects tables whose implied window exceeds a lunar month", () => {
		const absurd = broken({ moonTab: [0, 500, 1000, 1500, 1900, 2200, 2400, 2500] });
		const error = thrownBy(() => isoToTibetan(iso("2026-08-12"), absurd));
		expect(error?.code).toBe("TCT_INVALID_TRADITION_CONFIG");
		expect(error?.message).toContain("search window");
	});
});
/**
 * The `naming` block, which carries two kinds of optionality on purpose.
 *
 * `weekdayOffset` absent means 0 — every Tibetan version agrees on weekday naming and Bhutan is the
 * documented exception, so a default is honest. `months` absent means **not sourced**, and the
 * astrological layer refuses rather than answering: the month animals fork Dragon against Tiger with
 * no majority, so there is no honest default to pick. The validator has to enforce both, and a
 * present-but-partial `months` is the case these tests exist for.
 */
describe("the naming block", () => {
	it("accepts a config with no naming at all", () => {
		const { naming: _naming, ...bare } = PHUGPA;
		expect(() => validatedTradition(bare)).not.toThrow();
	});

	it("accepts a naming block that omits weekdayOffset", () => {
		// PHUGPA itself is this case: it carries month naming and no offset, because an explicit 0
		// would be noise in the config the docs point at for spreading.
		expect(PHUGPA.naming?.weekdayOffset).toBeUndefined();
		expect(() => validatedTradition(PHUGPA)).not.toThrow();
	});

	it("rejects a weekdayOffset that is present and wrong", () => {
		for (const offset of [-1, 7, 1.5, "1", null]) {
			const error = thrownBy(() =>
				validatedTradition(broken({ naming: { weekdayOffset: offset } })),
			);
			expect(error?.code, `${offset}`).toBe("TCT_INVALID_TRADITION_CONFIG");
			expect(error?.message).toContain("naming.weekdayOffset");
		}
	});

	it("rejects a naming block that is present and not an object", () => {
		for (const naming of [null, 5, "naming"]) {
			const error = thrownBy(() => validatedTradition(broken({ naming })));
			expect(error?.code, `${naming}`).toBe("TCT_INVALID_TRADITION_CONFIG");
			expect(error?.message, `${naming}`).toContain("naming must be an object when present");
		}
	});

	it("accepts a config whose monthAnimals block is simply absent", () => {
		const error = thrownBy(() => validatedTradition(broken({ naming: { weekdayOffset: 1 } })));
		expect(error).toBeUndefined();
	});

	it("rejects the pre-2026-09-13 months block rather than ignoring it", () => {
		// The retired name gets a message saying where its rules went, rather than the bare unknown-key
		// refusal every other stray key gets; a config spreading PHUGPA.naming and adding Tsurphu's rules
		// under it would otherwise keep Phugpa's animals.
		const months = { tigerMonth: 1, elementRule: "continuous", numbers: true };
		const naming = { ...PHUGPA.naming, months };
		const error = thrownBy(() => validatedTradition(broken({ naming })));
		expect(error?.code).toBe("TCT_INVALID_TRADITION_CONFIG");
		expect(error?.message).toContain("naming.monthAnimals");
		expect(error?.message).toContain("naming.nineNumbers.months");
	});

	it("rejects a monthAnimals block that is present and not an object", () => {
		for (const monthAnimals of [null, 11, "phugpa"]) {
			const error = thrownBy(() => validatedTradition(broken({ naming: { monthAnimals } })));
			expect(error?.code, `${monthAnimals}`).toBe("TCT_INVALID_TRADITION_CONFIG");
			expect(error?.message).toContain("naming.monthAnimals");
		}
	});

	it("rejects a monthAnimals block missing either of its two fields", () => {
		// CLAUDE.md's rule: a field the type declares required is rejected when **absent**, not merely
		// when wrong. The block is the unit of "this tradition's month animals are sourced", so a
		// half-filled one would let a tradition answer some attributes confidently and others wrongly.
		const full = { tigerMonth: 11, elementRule: "son-of-year" };
		for (const field of ["tigerMonth", "elementRule"] as const) {
			const monthAnimals: Record<string, unknown> = { ...full };
			delete monthAnimals[field];
			const error = thrownBy(() => validatedTradition(broken({ naming: { monthAnimals } })));
			expect(error?.code, field).toBe("TCT_INVALID_TRADITION_CONFIG");
			expect(error?.message, field).toContain(`naming.monthAnimals.${field}`);
		}
	});

	it("rejects a tigerMonth outside 1…12 and a non-integer one", () => {
		for (const tigerMonth of [0, 13, 11.5, "11"]) {
			const monthAnimals = { tigerMonth, elementRule: "son-of-year" };
			const error = thrownBy(() => validatedTradition(broken({ naming: { monthAnimals } })));
			expect(error?.code, `${tigerMonth}`).toBe("TCT_INVALID_TRADITION_CONFIG");
			expect(error?.message).toContain("naming.monthAnimals.tigerMonth");
		}
	});

	it("rejects an element rule it does not know", () => {
		// Including a tradition name, which is the anti-pattern the field spelling exists to prevent.
		for (const elementRule of ["phugpa", "tsurphu", "son of year", ""]) {
			const monthAnimals = { tigerMonth: 11, elementRule };
			const error = thrownBy(() => validatedTradition(broken({ naming: { monthAnimals } })));
			expect(error?.code, elementRule).toBe("TCT_INVALID_TRADITION_CONFIG");
			expect(error?.message).toContain("naming.monthAnimals.elementRule");
		}
	});

	it("accepts an absent nineNumbers block and an absent months member, which mean unnumbered", () => {
		for (const naming of [{}, { nineNumbers: {} }, { nineNumbers: { months: "descending" } }]) {
			expect(thrownBy(() => validatedTradition(broken({ naming })))).toBeUndefined();
		}
	});

	it("rejects a nineNumbers block or months rule that is present and wrong", () => {
		for (const nineNumbers of [null, true, "descending"]) {
			const error = thrownBy(() => validatedTradition(broken({ naming: { nineNumbers } })));
			expect(error?.code, `${nineNumbers}`).toBe("TCT_INVALID_TRADITION_CONFIG");
			expect(error?.message).toContain("naming.nineNumbers");
		}
		// Including the old boolean, and a tradition name.
		for (const months of [true, false, null, "tsurphu", "ascending"]) {
			const naming = { nineNumbers: { months } };
			const error = thrownBy(() => validatedTradition(broken({ naming })));
			expect(error?.code, `${months}`).toBe("TCT_INVALID_TRADITION_CONFIG");
			expect(error?.message).toContain("naming.nineNumbers.months");
		}
	});
});

/**
 * Four values the validator used to accept that no tradition can mean: each ran, and gave a calendar
 * that was wrong with nothing to say so.
 */
describe("values the arithmetic cannot take", () => {
	// β* is an intercalation index, and the index is mod 65. A value 65 off is the same leap cycle with
	// the month count shifted by one lunation: every date moves a month, no leap month moves.
	it("rejects an intercalationIndexAtEpoch outside 0…64", () => {
		for (const value of [-4, 65, 126]) {
			const error = thrownBy(() =>
				validatedTradition(broken({ intercalationIndexAtEpoch: value })),
			);
			expect(error?.code, `${value}`).toBe("TCT_INVALID_TRADITION_CONFIG");
			expect(error?.message).toContain("intercalationIndexAtEpoch");
		}
		for (const value of [0, 61, 64]) {
			expect(
				thrownBy(() => validatedTradition(broken({ intercalationIndexAtEpoch: value }))),
			).toBeUndefined();
		}
	});

	// The tables extend by tab(14 − i) = tab(i) and tab(14 + i) = −tab(i); together they force
	// tab(14) = tab(0) = −tab(0), so entry 0 is zero — and the sun table's at 6.
	it("rejects a correction table whose entry 0 is not zero", () => {
		const moonTab = [3, 5, 10, 15, 19, 22, 24, 25];
		const sunTab = [3, 6, 10, 11];
		for (const [field, patch] of [
			["moonTab", { moonTab }],
			["sunTab", { sunTab }],
		] as const) {
			const error = thrownBy(() => validatedTradition(broken(patch)));
			expect(error?.code, field).toBe("TCT_INVALID_TRADITION_CONFIG");
			expect(error?.message).toContain(`${field}[0]`);
		}
	});

	it("refuses a meanDate.perDay that is zero or negative as a config fault, not an engine bug", () => {
		for (const num of [0, -11_135]) {
			const meanDate = { ...PHUGPA.meanDate, perDay: { num, den: 11_312 } };
			const error = thrownBy(() => isoToTibetan(iso("2026-01-01"), broken({ meanDate })));
			expect(error?.code, `${num}`).toBe("TCT_INVALID_TRADITION_CONFIG");
			expect(error?.message).toContain("meanDate.perDay");
		}
	});

	// The search window is proved from the mean date being a function of the lunar day count
	// l = 30n + d alone, which is m₁ = 30·m₂. Break it and the mean date drifts from the seed by
	// n·(m₁ − 30m₂), without bound.
	it("refuses a meanDate whose perMonth is not 30 times its perDay", () => {
		const meanDate = { ...PHUGPA.meanDate, perMonth: { num: 167_125, den: 5656 } };
		const error = thrownBy(() => isoToTibetan(iso("2026-01-01"), broken({ meanDate })));
		expect(error?.code).toBe("TCT_INVALID_TRADITION_CONFIG");
		expect(error?.message).toContain("meanDate.perMonth");
		// The same rational over another denominator is the same relation and is accepted.
		const same = {
			...PHUGPA.meanDate,
			perMonth: { num: 167_025 * 3, den: 5656 * 3 },
			perDay: { num: 11_135 * 5, den: 11_312 * 5 },
		};
		expect(thrownBy(() => validatedTradition(broken({ meanDate: same })))).toBeUndefined();
	});

	// `{ ...BHUTAN, naming: { weekdayOfset: 1 } }` named 2026-03-01 `nyi ma` where BHUTAN gives
	// `zla ba`, and a top-level `nineNumbers` lost Tsurphu's month numbers the same silent way.
	it("refuses an unknown key in a config, its naming block and the blocks inside it", () => {
		const cases: [string, Record<string, unknown>][] = [
			["weekdayOfset", { naming: { weekdayOfset: 1 } }],
			["nineNumbers", { nineNumbers: { months: "descending" } }],
			["weekdayOffset", { weekdayOffset: 1 }],
			[
				"elementrule",
				{
					naming: { monthAnimals: { tigerMonth: 11, elementRule: "son-of-year", elementrule: 1 } },
				},
			],
			["month", { naming: { nineNumbers: { month: "descending" } } }],
		];
		for (const [key, patch] of cases) {
			const error = thrownBy(() => validatedTradition(broken(patch)));
			expect(error?.code, key).toBe("TCT_INVALID_TRADITION_CONFIG");
			expect(error?.message, key).toContain(JSON.stringify(key));
		}
		// Every shipped config, and a config spread from one, still passes.
		for (const config of [PHUGPA, PHUGPA_HENNING, BHUTAN, BHUTAN_HENNING]) {
			expect(thrownBy(() => validatedTradition({ ...config, id: "mine" }))).toBeUndefined();
		}
	});
});

/**
 * Two configs holding the same rationals over different denominators are the same calendar. The
 * table-argument denominators once assumed 28 divided the anomaly's and 12 the mean sun's, so a
 * coefficient written in lowest terms changed the calendar with no error.
 */
describe("denominator independence", () => {
	// A toy anomaly and mean sun, written in lowest terms and over a multiple of 28 and 12 — the same
	// rationals. 28 does not divide 14, nor 12 divide 8, so the first form hit the old gcd path.
	const lowestTerms = broken({
		lunarAnomaly: {
			perMonth: { num: 1, den: 14 },
			perDay: { num: 1, den: 14 },
			atEpoch: { num: 3, den: 14 },
		},
		meanSun: {
			perMonth: { num: 1, den: 8 },
			perDay: { num: 1, den: 8 },
			atEpoch: { num: 1, den: 8 },
		},
	});
	const multiples = broken({
		lunarAnomaly: {
			perMonth: { num: 2, den: 28 },
			perDay: { num: 2, den: 28 },
			atEpoch: { num: 6, den: 28 },
		},
		meanSun: {
			perMonth: { num: 3, den: 24 },
			perDay: { num: 3, den: 24 },
			atEpoch: { num: 3, den: 24 },
		},
	});

	// Multiplying every coefficient's numerator and denominator by k leaves the rationals, so the
	// calendar and the range it is exact over must not change. Denominators as written once fed the
	// common denominator, so k = 5 cut Henning's exact range from JD 5,868,816 to 117 and refused 1900.
	it("keeps the exact range and the dates when every rational is multiplied through", () => {
		const multiplied = (config: TraditionConfig, k: number): TraditionConfig => {
			const scale = (r: { num: number; den: number }) => ({ num: r.num * k, den: r.den * k });
			const motion = (m: TraditionConfig["meanDate"]) => ({
				perMonth: scale(m.perMonth),
				perDay: scale(m.perDay),
				atEpoch: scale(m.atEpoch),
			});
			return {
				...config,
				meanDate: motion(config.meanDate),
				meanSun: motion(config.meanSun),
				lunarAnomaly: motion(config.lunarAnomaly),
			};
		};
		const key = (t: ReturnType<typeof isoToTibetan>) =>
			`${t.year}-${t.month}-${t.day}${t.isLeapMonth ? "L" : ""}${t.isLeapDay ? "d" : ""}`;
		const problems: string[] = [];
		for (const config of [PHUGPA, PHUGPA_HENNING, BHUTAN, BHUTAN_HENNING]) {
			const base = deriveScaling(config);
			for (const k of [5, 7]) {
				const other = multiplied(config, k);
				const scaled = deriveScaling(other);
				if (scaled.exactToJulianDay !== base.exactToJulianDay) {
					problems.push(
						`${config.id} x${k}: range ${scaled.exactToJulianDay} != ${base.exactToJulianDay}`,
					);
				}
				for (const day of ["1900-01-01", "2026-08-12", "+011000-01-01"]) {
					const date = iso(day);
					if (key(isoToTibetan(date, other)) !== key(isoToTibetan(date, config))) {
						problems.push(`${config.id} x${k}: ${day} differs`);
					}
				}
			}
		}
		expect(problems).toEqual([]);
	});

	it("reduces both forms to denominators the old derivation could not cancel", () => {
		for (const config of [lowestTerms, multiples]) {
			expect(deriveScaling(config).lunarAnomaly.den % 28).not.toBe(0);
			expect(deriveScaling(config).meanSun.den % 12).not.toBe(0);
			expect(deriveScaling(config).lunarAnomaly.den).toBe(14);
			expect(deriveScaling(config).meanSun.den).toBe(8);
		}
	});

	it("gives the same Tibetan date for every day of 2026 whichever form is used", () => {
		const differing: string[] = [];
		for (let d = iso("2026-01-01"); d.year === 2026; d = d.add({ days: 1 })) {
			const a = isoToTibetan(d, lowestTerms);
			const b = isoToTibetan(d, multiples);
			const key = (t: typeof a) =>
				`${t.year}-${t.month}-${t.day}${t.isLeapMonth ? "L" : ""}${t.isLeapDay ? "d" : ""}`;
			if (key(a) !== key(b)) differing.push(`${d.toString()} ${key(a)} ${key(b)}`);
		}
		expect(differing).toEqual([]);
	});

	// By hand, lunar day 1 of month count 0: anomaly = 1/14 · 0 + 1/14 · 1 + 3/14 = 4/14, so the moon
	// table's argument is 28 · 4/14 = 8 and moon_tab(8) = moon_tab(14 − 8 = 6) = 24.
	// The factor multiplies a numerator, so the config is refused where that could leave the safe
	// integers within the date range, rather than computing a wrong date.
	it("refuses anomaly coefficients too large for their argument to stay exact", () => {
		const lunarAnomaly = {
			perMonth: { num: 4_000_000_000_000_000, den: 14 },
			perDay: { num: 1, den: 14 },
			atEpoch: { num: 3, den: 14 },
		};
		const error = thrownBy(() => isoToTibetan(iso("2026-01-01"), broken({ lunarAnomaly })));
		expect(error?.code).toBe("TCT_INVALID_TRADITION_CONFIG");
		expect(error?.message).toContain("lunarAnomaly");
		const meanSun = {
			perMonth: { num: 4_000_000_000_000_000, den: 8 },
			perDay: { num: 1, den: 8 },
			atEpoch: { num: 1, den: 8 },
		};
		expect(thrownBy(() => isoToTibetan(iso("2026-01-01"), broken({ meanSun })))?.message).toContain(
			"meanSun",
		);
	});

	// By hand, lunar day 5 of month count 3: mean sun = 3/8 + 5/8 + 1/8 = 9/8 circles, the solar anomaly
	// is 9/8 − 1/4 = 7/8, and the sun table's argument is 12 · 7/8 = 10.5. sun_tab(10) = −sun_tab(2) =
	// −10 and sun_tab(11) = −sun_tab(1) = −6, so halfway between them the equation is −8.
	it("reads the sun table at 12 times the solar anomaly", () => {
		for (const config of [lowestTerms, multiples]) {
			const scaled = deriveScaling(config);
			expect(sunEquation(scaled, 5, 3) / scaled.sunTabArgDen).toBe(-8);
		}
	});

	it("reads the moon table at 28 times the anomaly", () => {
		for (const config of [lowestTerms, multiples]) {
			const scaled = deriveScaling(config);
			expect(moonEquation(scaled, 1, 0) / scaled.moonTabArgDen).toBe(24);
		}
	});
});

describe("a tradition mutated after its first use", () => {
	const spread = (): TraditionConfig => ({
		...PHUGPA,
		id: "mutated-after-use",
		moonTab: [...PHUGPA.moonTab],
		sunTab: [...PHUGPA.sunTab],
	});
	const day = iso("2026-08-12");
	// Every seventh day across about eight years, so a mutated constant that moves one month shows.
	const project = (t: TraditionConfig) => {
		const out: string[] = [];
		for (let i = 0; i < 400; i++) {
			const d = isoToTibetan(day.add({ days: i * 7 }), t);
			out.push(`${d.year}-${d.month}${d.isLeapMonth ? "L" : ""}-${d.day}`);
		}
		return out.join(" ");
	};

	it("keeps converting with the tables it was validated with", () => {
		const t = spread();
		const first = project(t);
		(t.moonTab as number[]).length = 2;
		expect(thrownBy(() => project(t))?.code).toBeUndefined();
		expect(project(t)).toBe(first);
	});

	it("does not take a threshold the validator would have refused", () => {
		const t = spread();
		const first = project(t);
		(t as { leapIndexThreshold: number }).leapIndexThreshold = 64;
		expect(hasLeapMonth(2153, t)).toBe(hasLeapMonth(2153, spread()));
		expect(leapMonthNumberFor(2153, t)).toBe(leapMonthNumberFor(2153, spread()));
		expect(project(t)).toBe(first);
	});

	it("does not mix a stale search window with replaced tables", () => {
		const t = spread();
		const first = project(t);
		(t as unknown as { moonTab: number[] }).moonTab = PHUGPA.moonTab.map((n) => n * 10);
		expect(thrownBy(() => project(t))?.code).toBeUndefined();
		expect(project(t)).toBe(first);
	});

	it("reads the validated copy through months, navigation and cycles as well", () => {
		const t = spread();
		const month = { year: 2153, month: 6 };
		const lunation = lunationFromMonth(month, t);
		(t as { epochYear: number }).epochYear = 1;
		(t as { intercalationIndexAtEpoch: number }).intercalationIndexAtEpoch = 3;
		expect(lunationFromMonth(month, t)).toBe(lunation);
		expect(monthsFor(2153, t).length).toBe(monthsFor(2153, spread()).length);
		expect(thrownBy(() => leapMonthNumberFor(2153, t))?.code).toBeUndefined();
	});
});

describe("elementalYogaFor reads the validated copy", () => {
	const day = iso("2026-09-01");
	const fresh = (): TraditionConfig => ({
		...PHUGPA,
		id: "yoga-mutated-after-use",
		moonTab: [...PHUGPA.moonTab],
		sunTab: [...PHUGPA.sunTab],
		naming: { ...PHUGPA.naming },
	});

	it("keeps answering when weekdayOffset is changed after first use", () => {
		const t = fresh();
		const first = elementalYogaFor(day, t);
		(t.naming as { weekdayOffset?: number }).weekdayOffset = 1;
		const after = thrownBy(() => elementalYogaFor(day, t));
		expect(after?.code).toBeUndefined();
		expect(elementalYogaFor(day, t)).toEqual(first);
	});

	it("refuses a revoked Proxy with the config's code and the caller's error as cause", () => {
		const { proxy, revoke } = Proxy.revocable(fresh(), {});
		revoke();
		const error = thrownBy(() => elementalYogaFor(day, proxy));
		expect(error?.code).toBe("TCT_INVALID_TRADITION_CONFIG");
		expect(error?.cause).toBeInstanceOf(TypeError);
	});
});

describe("a tradition structuredClone cannot copy", () => {
	it("is refused with the config's code, not a DOMException", () => {
		// A Proxy with no traps passes every read the validator makes, then the copy refuses it.
		const proxied = new Proxy({ ...PHUGPA, id: "proxied" }, {}) as TraditionConfig;
		const error = thrownBy(() => isoToTibetan(iso("2026-08-12"), proxied));
		expect(error?.code).toBe("TCT_INVALID_TRADITION_CONFIG");
		expect(error?.message).toMatch(/could not be copied/);
	});
});

describe("validatedTradition's private copy", () => {
	const spread = (): TraditionConfig => ({
		...PHUGPA,
		id: "copy-protocol",
		moonTab: [...PHUGPA.moonTab],
		sunTab: [...PHUGPA.sunTab],
		naming: { ...PHUGPA.naming },
	});
	// Valid for its first read and `undefined` for every later one: the first validation reads it once,
	// the clone reads it again, and the copy is then plain data holding the invalid value.
	const answersOnce = (): TraditionConfig => {
		const config = spread();
		let reads = 0;
		Object.defineProperty(config, "epochYear", {
			enumerable: true,
			configurable: true,
			get: () => (reads++ === 0 ? PHUGPA.epochYear : undefined),
		});
		return config;
	};

	it("is deeply frozen and is never the caller's object", () => {
		const config = spread();
		const copy = validatedTradition(config);
		expect(copy).not.toBe(config);
		expect(Object.isFrozen(copy)).toBe(true);
		expect(Object.isFrozen(copy.moonTab)).toBe(true);
		expect(Object.isFrozen(copy.naming)).toBe(true);
		expect(Object.isFrozen(config)).toBe(false);
	});

	it("answers the same copy for the caller's object and for the copy itself", () => {
		const config = spread();
		const copy = validatedTradition(config);
		expect(validatedTradition(config)).toBe(copy);
		expect(validatedTradition(copy)).toBe(copy);
	});

	it("refuses a config that is valid when read and invalid once copied", () => {
		const error = thrownBy(() => validatedTradition(answersOnce()));
		expect(error?.code).toBe("TCT_INVALID_TRADITION_CONFIG");
		expect(error?.message).toMatch(/epochYear must be a safe integer/);
	});

	it("does not cache a refusal", () => {
		const config = answersOnce();
		const first = thrownBy(() => validatedTradition(config));
		expect(first?.message).toMatch(/epochYear must be a safe integer/);
		const second = thrownBy(() => validatedTradition(config));
		expect(second?.code).toBe("TCT_INVALID_TRADITION_CONFIG");
		expect(second?.message).toMatch(/epochYear must be a safe integer/);
	});
});
