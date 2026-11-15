import { describe, expect, it } from "vitest";
import {
	isoToTibetan,
	losarFor,
	tibetanDateExists,
	tibetanToIso,
} from "../src/computation/conversion.js";
import { moonEquation } from "../src/computation/corrections.js";
import { deriveScaling } from "../src/computation/scaling.js";
import { EXAMPLE_OBSERVANCES, getObservances } from "../src/observances/index.js";
import { BHUTAN, BHUTAN_HENNING } from "../src/traditions/bhutan.js";
import { PHUGPA, PHUGPA_HENNING } from "../src/traditions/phugpa.js";
import type { TraditionConfig } from "../src/traditions/types.js";
import { assertTraditionConfig } from "../src/traditions/validate.js";
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
		expect(() => assertTraditionConfig(PHUGPA)).not.toThrow();
	});

	it("rejects a missing or non-object config", () => {
		for (const bad of [null, undefined, 42, "phugpa"]) {
			const error = thrownBy(() => assertTraditionConfig(bad as unknown as TraditionConfig));
			expect(error?.code).toBe("TCT_INVALID_TRADITION_CONFIG");
		}
	});

	it("rejects a missing identity field", () => {
		expect(thrownBy(() => assertTraditionConfig(broken({ id: "" })))?.message).toMatch(/id/);
		expect(thrownBy(() => assertTraditionConfig(broken({ name: undefined })))?.message).toMatch(
			/name/,
		);
	});

	it("rejects a non-integer epoch field", () => {
		for (const field of ["epochYear", "epochMonth", "intercalationIndexAtEpoch"]) {
			const error = thrownBy(() => assertTraditionConfig(broken({ [field]: 1.5 })));
			expect(error?.code).toBe("TCT_INVALID_TRADITION_CONFIG");
			expect(error?.message).toContain(field);
		}
	});

	// The failure this was written for: a partial mean motion. `{ ...PHUGPA, lunarAnomaly: { perDay:
	// x } }` is the shape a reader most plausibly writes when adapting a config, and it used to reach
	// `scaleMeanMotion` and die on `undefined.den`.
	it("names the exact path of a malformed mean motion", () => {
		const error = thrownBy(() =>
			assertTraditionConfig(broken({ lunarAnomaly: { perDay: { num: 1, den: 28 } } })),
		);
		expect(error?.code).toBe("TCT_INVALID_TRADITION_CONFIG");
		expect(error?.message).toContain("lunarAnomaly.perMonth");
	});

	it("rejects a mean motion that is not an object", () => {
		for (const bad of [null, 42, "1/28"]) {
			const error = thrownBy(() => assertTraditionConfig(broken({ meanSun: bad })));
			expect(error?.message).toContain("meanSun must be a { perMonth, perDay, atEpoch } object");
		}
	});

	it("rejects a rational with a non-integer numerator", () => {
		const patch = { meanSun: { ...PHUGPA.meanSun, atEpoch: { num: 1.5, den: 60 } } };
		expect(thrownBy(() => assertTraditionConfig(broken(patch)))?.message).toContain(
			"meanSun.atEpoch.num",
		);
	});

	it("rejects a rational with a zero, negative or fractional denominator", () => {
		for (const den of [0, -28, 2.5, Number.NaN]) {
			const patch = { lunarAnomaly: { ...PHUGPA.lunarAnomaly, perDay: { num: 1, den } } };
			const error = thrownBy(() => assertTraditionConfig(broken(patch)));
			expect(error?.message).toContain("lunarAnomaly.perDay.den");
		}
	});

	// Length is not cosmetic. moonTabAt extends the table by symmetries that only hold for eight
	// entries; a shorter one interpolates against `undefined` and yields NaN, and NaN reaches a date.
	it("rejects a correction table of the wrong length", () => {
		expect(thrownBy(() => assertTraditionConfig(broken({ moonTab: [0, 5, 10] })))?.message).toMatch(
			/moonTab must have exactly 8 entries, received 3/,
		);
		expect(
			thrownBy(() => assertTraditionConfig(broken({ sunTab: [0, 6, 10, 11, 12] })))?.message,
		).toMatch(/sunTab must have exactly 4 entries, received 5/);
	});

	it("rejects a non-finite entry inside a correction table", () => {
		const moonTab = [...PHUGPA.moonTab];
		moonTab[3] = Number.NaN;
		expect(thrownBy(() => assertTraditionConfig(broken({ moonTab })))?.message).toContain(
			"moonTab[3]",
		);
	});

	it("tells a caller who passed a { tradition } bag to pass the config itself", () => {
		// Since 2026-09-24 a function whose only choice is the tradition takes it positionally, so the
		// likeliest bad argument from a migrating caller is the old bag. Without this the message was
		// "id must be a non-empty string", which names a field the caller never meant to write.
		const bag = { tradition: PHUGPA } as unknown as TraditionConfig;
		const error = thrownBy(() => assertTraditionConfig(bag));
		expect(error?.code).toBe("TCT_INVALID_TRADITION_CONFIG");
		expect(error?.message).toMatch(/\{ tradition \}/);
		expect(error?.message).toMatch(/itself/);
		// A real config that happens to carry an extra `tradition` key is judged on its fields first,
		// and then refused for the key, like any other unknown one.
		expect(thrownBy(() => assertTraditionConfig(broken({ tradition: PHUGPA })))?.message).toContain(
			'"tradition"',
		);
		expect(
			thrownBy(() => assertTraditionConfig(broken({ id: "", tradition: 1 })))?.message,
		).toMatch(/id must be/);
	});

	it("suggests the spread that fixes it", () => {
		expect(thrownBy(() => assertTraditionConfig(broken({ moonTab: [] })))?.message).toContain(
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

	// Memoised per object, the same bargain the scaling cache and the observance validator make.
	// A second call must still reject rather than sail through on a cache miss turned hit.
	it("stays rejecting on a repeat call", () => {
		const bad = broken({ sunTab: [] });
		expect(thrownBy(() => assertTraditionConfig(bad))?.code).toBe("TCT_INVALID_TRADITION_CONFIG");
		expect(thrownBy(() => assertTraditionConfig(bad))?.code).toBe("TCT_INVALID_TRADITION_CONFIG");
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
		expect(() => assertTraditionConfig(plausibleButWrong)).not.toThrow();
		expect(isoToTibetan(iso("2026-08-12"), plausibleButWrong).day).not.toBe(
			isoToTibetan(iso("2026-08-12"), PHUGPA).day,
		);
	});

	// The solar anomaly is mean_sun - 1/4, so 4 must divide the *derived* meanSun denominator -- the
	// lcm of its three coefficient denominators, not any one of them. Unchecked, this reached
	// `scaleTo` and threw an uncoded RangeError from three frames down, which `tibetanDateExists`
	// read as "that date does not exist" and reported `false` for Losar.
	it("rejects a meanSun denominator that cannot express a quarter", () => {
		// All three coefficients, because the derived denominator is their lcm: leaving any one of
		// Phugpa's own (804, 4824) in place reintroduces the factor of 4 and the config is fine.
		const patch = {
			meanSun: {
				perMonth: { num: 65, den: 803 },
				perDay: { num: 13, den: 803 },
				atEpoch: { num: 743, den: 803 },
			},
		};
		for (const call of [
			() => isoToTibetan(iso("2026-02-18"), broken(patch)),
			() => tibetanToIso({ year: 2153, month: 1, day: 1 }, broken(patch)),
			() => tibetanDateExists({ year: 2153, month: 1, day: 1 }, broken(patch)),
		]) {
			expect(thrownBy(call)?.code).toBe("TCT_INVALID_TRADITION_CONFIG");
		}
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
		expect(() => assertTraditionConfig(bare)).not.toThrow();
	});

	it("accepts a naming block that omits weekdayOffset", () => {
		// PHUGPA itself is this case: it carries month naming and no offset, because an explicit 0
		// would be noise in the config the docs point at for spreading.
		expect(PHUGPA.naming?.weekdayOffset).toBeUndefined();
		expect(() => assertTraditionConfig(PHUGPA)).not.toThrow();
	});

	it("rejects a weekdayOffset that is present and wrong", () => {
		for (const offset of [-1, 7, 1.5, "1", null]) {
			const error = thrownBy(() =>
				assertTraditionConfig(broken({ naming: { weekdayOffset: offset } })),
			);
			expect(error?.code, `${offset}`).toBe("TCT_INVALID_TRADITION_CONFIG");
			expect(error?.message).toContain("naming.weekdayOffset");
		}
	});

	it("rejects a naming block that is present and not an object", () => {
		for (const naming of [null, 5, "naming"]) {
			const error = thrownBy(() => assertTraditionConfig(broken({ naming })));
			expect(error?.code, `${naming}`).toBe("TCT_INVALID_TRADITION_CONFIG");
			expect(error?.message, `${naming}`).toContain("naming must be an object when present");
		}
	});

	it("accepts a config whose monthAnimals block is simply absent", () => {
		const error = thrownBy(() => assertTraditionConfig(broken({ naming: { weekdayOffset: 1 } })));
		expect(error).toBeUndefined();
	});

	it("rejects the pre-2026-09-13 months block rather than ignoring it", () => {
		// Nothing rejects an unknown key, so without this a config spreading PHUGPA.naming and adding
		// Tsurphu's rules under the old name would keep Phugpa's animals — a plausible wrong answer.
		const months = { tigerMonth: 1, elementRule: "continuous", numbers: true };
		const naming = { ...PHUGPA.naming, months };
		const error = thrownBy(() => assertTraditionConfig(broken({ naming })));
		expect(error?.code).toBe("TCT_INVALID_TRADITION_CONFIG");
		expect(error?.message).toContain("naming.monthAnimals");
		expect(error?.message).toContain("naming.nineNumbers.months");
	});

	it("rejects a monthAnimals block that is present and not an object", () => {
		for (const monthAnimals of [null, 11, "phugpa"]) {
			const error = thrownBy(() => assertTraditionConfig(broken({ naming: { monthAnimals } })));
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
			const error = thrownBy(() => assertTraditionConfig(broken({ naming: { monthAnimals } })));
			expect(error?.code, field).toBe("TCT_INVALID_TRADITION_CONFIG");
			expect(error?.message, field).toContain(`naming.monthAnimals.${field}`);
		}
	});

	it("rejects a tigerMonth outside 1…12 and a non-integer one", () => {
		for (const tigerMonth of [0, 13, 11.5, "11"]) {
			const monthAnimals = { tigerMonth, elementRule: "son-of-year" };
			const error = thrownBy(() => assertTraditionConfig(broken({ naming: { monthAnimals } })));
			expect(error?.code, `${tigerMonth}`).toBe("TCT_INVALID_TRADITION_CONFIG");
			expect(error?.message).toContain("naming.monthAnimals.tigerMonth");
		}
	});

	it("rejects an element rule it does not know", () => {
		// Including a tradition name, which is the anti-pattern the field spelling exists to prevent.
		for (const elementRule of ["phugpa", "tsurphu", "son of year", ""]) {
			const monthAnimals = { tigerMonth: 11, elementRule };
			const error = thrownBy(() => assertTraditionConfig(broken({ naming: { monthAnimals } })));
			expect(error?.code, elementRule).toBe("TCT_INVALID_TRADITION_CONFIG");
			expect(error?.message).toContain("naming.monthAnimals.elementRule");
		}
	});

	it("accepts an absent nineNumbers block and an absent months member, which mean unnumbered", () => {
		for (const naming of [{}, { nineNumbers: {} }, { nineNumbers: { months: "descending" } }]) {
			expect(thrownBy(() => assertTraditionConfig(broken({ naming })))).toBeUndefined();
		}
	});

	it("rejects a nineNumbers block or months rule that is present and wrong", () => {
		for (const nineNumbers of [null, true, "descending"]) {
			const error = thrownBy(() => assertTraditionConfig(broken({ naming: { nineNumbers } })));
			expect(error?.code, `${nineNumbers}`).toBe("TCT_INVALID_TRADITION_CONFIG");
			expect(error?.message).toContain("naming.nineNumbers");
		}
		// Including the old boolean, and a tradition name.
		for (const months of [true, false, null, "tsurphu", "ascending"]) {
			const naming = { nineNumbers: { months } };
			const error = thrownBy(() => assertTraditionConfig(broken({ naming })));
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
				assertTraditionConfig(broken({ intercalationIndexAtEpoch: value })),
			);
			expect(error?.code, `${value}`).toBe("TCT_INVALID_TRADITION_CONFIG");
			expect(error?.message).toContain("intercalationIndexAtEpoch");
		}
		for (const value of [0, 61, 64]) {
			expect(
				thrownBy(() => assertTraditionConfig(broken({ intercalationIndexAtEpoch: value }))),
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
			const error = thrownBy(() => assertTraditionConfig(broken(patch)));
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
		expect(thrownBy(() => assertTraditionConfig(broken({ meanDate: same })))).toBeUndefined();
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
			const error = thrownBy(() => assertTraditionConfig(broken(patch)));
			expect(error?.code, key).toBe("TCT_INVALID_TRADITION_CONFIG");
			expect(error?.message, key).toContain(JSON.stringify(key));
		}
		// Every shipped config, and a config spread from one, still passes.
		for (const config of [PHUGPA, PHUGPA_HENNING, BHUTAN, BHUTAN_HENNING]) {
			expect(thrownBy(() => assertTraditionConfig({ ...config, id: "mine" }))).toBeUndefined();
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

	it("starts from denominators the old derivation could not cancel", () => {
		expect(deriveScaling(lowestTerms).lunarAnomaly.den % 28).not.toBe(0);
		expect(deriveScaling(lowestTerms).meanSun.den % 12).not.toBe(0);
		expect(deriveScaling(multiples).lunarAnomaly.den % 28).toBe(0);
		expect(deriveScaling(multiples).meanSun.den % 12).toBe(0);
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

	it("reads the moon table at 28 times the anomaly", () => {
		for (const config of [lowestTerms, multiples]) {
			const scaled = deriveScaling(config);
			expect(moonEquation(scaled, 1, 0) / scaled.moonTabArgDen).toBe(24);
		}
	});
});
