import { describe, expect, it } from "vitest";
import {
	isoToTibetan,
	julianDayFromIso,
	losarFor,
	tibetanWeekday,
} from "../src/computation/conversion.js";
import { rabjungFor, weekdayNameFor, yearNameFor } from "../src/cycles.js";
import { BHUTAN, BHUTAN_HENNING } from "../src/traditions/bhutan.js";
import { PHUGPA, PHUGPA_HENNING } from "../src/traditions/phugpa.js";
import { asTibetanWeekday, type TibetanWeekday } from "../src/types.js";

const iso = (s: string) => Temporal.PlainDate.from(s);

const codeOf = (call: () => unknown): string | undefined => {
	try {
		call();
		return undefined;
	} catch (error) {
		return (error as { code?: string }).code;
	}
};

/**
 * Naming a year, without evaluating the calendar to do it.
 *
 * These are closed forms over the year alone — three modulos — and since year-level naming came off
 * `TibetanDate` they are the only route to it, rather than a cheap alternative to
 * `losarFor(y).yearName`.
 *
 * That removal cost this file a test. It used to assert that the closed form agreed with the value
 * a full mean-astronomy pass had written onto the Losar date; with the field gone the same
 * comparison reads `yearNameFor(y)` against `yearNameFor(losarFor(y).year)`, which is a tautology
 * and would pass however wrong both sides were. What is kept below is the part that still bites —
 * that Losar belongs to the year it opens, which is what made the old comparison meaningful. The
 * names themselves are cross-checked against Janson's own table in
 * `test/computation/conversion.test.ts`, where the expected values come from a fixture rather than
 * from this package.
 */
describe("yearNameFor and rabjungFor", () => {
	it("names the year its Losar opens, across a century", () => {
		for (let year = 2100; year <= 2200; year++) {
			expect(losarFor(year).year, `${year}`).toBe(year);
		}
	});

	it("cycles the elements every ten years and the animals every twelve", () => {
		for (let year = 2100; year <= 2200; year++) {
			expect(yearNameFor(year + 10).element).toBe(yearNameFor(year).element);
			expect(yearNameFor(year + 12).animal).toBe(yearNameFor(year).animal);
			// The full name repeats only every sixty, which is what makes it a sixty-year cycle.
			expect(yearNameFor(year + 60)).toEqual(yearNameFor(year));
		}
	});

	it("alternates gender with the element pairs", () => {
		// Each element holds two consecutive years, one male then one female.
		const first = yearNameFor(2153);
		const second = yearNameFor(2154);
		expect(second.element).toBe(first.element);
		expect(second.gender).not.toBe(first.gender);
	});

	/**
	 * The twelve-year animal return, which is what *lokeg* (ལོ་སྐེག) counts — the obstacle year
	 * falling every twelfth year from birth, at ages 13, 25, 37, 49 and 61.
	 */
	it("returns the birth animal every twelfth year", () => {
		const birth = 2130;
		for (const age of [13, 25, 37, 49, 61]) {
			expect(yearNameFor(birth + age - 1).animal).toBe(yearNameFor(birth).animal);
		}
	});

	it("advances the rabjung cycle every sixty years", () => {
		const here = rabjungFor(2153);
		const later = rabjungFor(2153 + 60);
		expect(later.cycle).toBe(here.cycle + 1);
		expect(later.year).toBe(here.year);
	});

	/**
	 * The reason these are exports rather than a documented `losarFor` hop: being pure modulo
	 * arithmetic they need no calendar, so they answer for years where evaluating one must refuse.
	 */
	it("answers for years where losarFor refuses", () => {
		expect(codeOf(() => losarFor(20_000, PHUGPA_HENNING))).toBe("TCT_OUTSIDE_EXACT_RANGE");
		expect(() => yearNameFor(20_000)).not.toThrow();
		expect(() => rabjungFor(20_000)).not.toThrow();
		expect(yearNameFor(20_000)).toEqual(yearNameFor(20_000 - 60));
	});

	it.each([
		["a fraction", 2153.5],
		["NaN", Number.NaN],
		["Infinity", Number.POSITIVE_INFINITY],
		["past the safe integer range", Number.MAX_SAFE_INTEGER + 2],
	])("rejects %s", (_label, year) => {
		expect(codeOf(() => yearNameFor(year))).toBe("TCT_FIELD_OUT_OF_RANGE");
		expect(codeOf(() => rabjungFor(year))).toBe("TCT_FIELD_OUT_OF_RANGE");
	});

	it("rejects a non-number year", () => {
		expect(codeOf(() => yearNameFor("2153" as unknown as number))).toBe("TCT_FIELD_OUT_OF_RANGE");
	});

	it("names the function the caller called", () => {
		try {
			rabjungFor(1.5);
			expect.unreachable("should reject a fraction");
		} catch (error) {
			expect((error as Error).message).toContain("rabjungFor");
		}
	});
});

describe("TibetanWeekday brand", () => {
	// The spike's finding 9: the only SILENT wrong answer anywhere on this surface. ISO dayOfWeek
	// runs 1-7 from Monday, Tibetan tibetanWeekday runs 0-6 from Saturday, both are fields on the
	// same object, and passing the wrong one compiled, threw nothing and returned the wrong name
	// six days in seven.
	it("makes weekdayNameFor(date.dayOfWeek) a COMPILE error", () => {
		const date = isoToTibetan(iso("2027-01-15"));
		// @ts-expect-error dayOfWeek is an ISO number, not a TibetanWeekday. tsc errors on an
		// UNUSED @ts-expect-error, so this line fails `npm run typecheck` the moment the brand is
		// widened back to `number` — which is what makes it evidence rather than decoration.
		expect(() => weekdayNameFor(date.dayOfWeek)).not.toThrow();
	});

	it("lets both legitimate sources through untouched", () => {
		const date = isoToTibetan(iso("2027-01-15"));
		expect(weekdayNameFor(date.tibetanWeekday).wylie).toBe(
			weekdayNameFor(tibetanWeekday(julianDayFromIso(date.isoDate))).wylie,
		);
	});

	it("would have been SILENTLY wrong six days in seven, and thrown on the seventh", () => {
		// A measurement of what the slip actually cost, not a claim about types. tibetanWeekday is
		// (dayOfWeek + 1) mod 7, so the two numbers NEVER coincide. On ISO Sunday, dayOfWeek is 7 and
		// the runtime guard rejects it — loudly. On the other six the call succeeds and returns
		// the wrong name. That asymmetry is the finding: six silent, one loud.
		let silentlyWrong = 0;
		let threw = 0;
		const total = 70;
		let day = iso("2027-01-01");
		for (let i = 0; i < total; i++) {
			const date = isoToTibetan(day);
			const correct = weekdayNameFor(date.tibetanWeekday).wylie;
			try {
				const slipped = weekdayNameFor(date.dayOfWeek as unknown as TibetanWeekday).wylie;
				if (slipped !== correct) silentlyWrong++;
			} catch {
				threw++;
			}
			day = day.add({ days: 1 });
		}
		expect(silentlyWrong).toBe((total / 7) * 6);
		expect(threw).toBe(total / 7);
	});

	it("validates on the way in from a number this package did not produce", () => {
		expect(weekdayNameFor(asTibetanWeekday(0)).planet).toBe("saturn");
		for (const bad of [7, -1, 1.5, Number.NaN]) {
			expect(codeOf(() => asTibetanWeekday(bad))).toBe("TCT_FIELD_OUT_OF_RANGE");
		}
	});

	it("erases at runtime, so a branded value is just a number", () => {
		expect(typeof asTibetanWeekday(3)).toBe("number");
		expect(asTibetanWeekday(3) + 1).toBe(4);
		expect(JSON.parse(JSON.stringify({ w: asTibetanWeekday(3) })).w).toBe(3);
	});
});

/**
 * The lowest safe integers, where `yearFromRoyalEra` and the cycle offsets used to push the operand
 * below `Number.MIN_SAFE_INTEGER` before `mod` and `ceilDiv` ran, so the answer was rounding noise.
 *
 * The reference is BigInt, so it shares no arithmetic with the code under test.
 */
describe("the extreme safe integers", () => {
	const floorBig = (a: bigint, b: bigint) => (a - (((a % b) + b) % b)) / b;
	const amodBig = (a: bigint, b: bigint) => ((((a - 1n) % b) + b) % b) + 1n;
	const window = (): number[] => {
		const out: number[] = [];
		for (let k = 0; k < 3000; k++) {
			out.push(Number.MIN_SAFE_INTEGER + k, Number.MAX_SAFE_INTEGER - k);
		}
		return out;
	};

	it("rabjungFor agrees with a BigInt reference over 3,000 safe integers at each end", () => {
		const bad: string[] = [];
		for (const year of window()) {
			const elapsed = BigInt(year) - 127n - 1026n;
			const cycle = -floorBig(-elapsed, 60n);
			const position = amodBig(elapsed, 60n);
			const got = rabjungFor(year);
			if (BigInt(got.cycle) !== cycle || BigInt(got.year) !== position) {
				bad.push(`${year}: got ${got.cycle}/${got.year}, expected ${cycle}/${position}`);
			}
		}
		expect(bad).toEqual([]);
	});

	it("yearNameFor agrees with a BigInt reference over 3,000 safe integers at each end", () => {
		const elements = ["wood", "fire", "earth", "iron", "water"];
		const animals = [
			"mouse",
			"ox",
			"tiger",
			"rabbit",
			"dragon",
			"snake",
			"horse",
			"sheep",
			"monkey",
			"bird",
			"dog",
			"pig",
		];
		const bad: string[] = [];
		for (const year of window()) {
			const elapsed = BigInt(year) - 127n - 3n;
			const ten = Number(amodBig(elapsed, 10n));
			const expected = {
				element: elements[Math.ceil(ten / 2) - 1],
				animal: animals[Number(amodBig(elapsed, 12n)) - 1],
				gender: ten % 2 === 1 ? "male" : "female",
			};
			const got = yearNameFor(year);
			if (
				got.element !== expected.element ||
				got.animal !== expected.animal ||
				got.gender !== expected.gender
			) {
				bad.push(`${year}: got ${got.element}/${got.animal}/${got.gender}`);
			}
		}
		expect(bad).toEqual([]);
	});

	it("pins the value at the bottom: rabjungFor(MIN_SAFE_INTEGER) is cycle -150119987579035, year 16", () => {
		const got = rabjungFor(Number.MIN_SAFE_INTEGER);
		expect(got.cycle).toBe(-150119987579035);
		expect(got.year).toBe(16);
	});

	it("pins the value at the top: rabjungFor(MAX_SAFE_INTEGER) is cycle 150119987578998, year 18", () => {
		const got = rabjungFor(Number.MAX_SAFE_INTEGER);
		expect(got.cycle).toBe(150119987578998);
		expect(got.year).toBe(18);
	});

	it("reduces by 60, and no smaller divisor of 60 does", () => {
		const names = (y: number) => JSON.stringify(yearNameFor(y));
		const positions = (y: number) => rabjungFor(y).year;
		const sixty: string[] = [];
		for (let y = 1900; y < 2400; y++) {
			if (names(y) !== names(y + 60) || positions(y) !== positions(y + 60)) sixty.push(String(y));
		}
		expect(sixty).toEqual([]);
		for (const d of [1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30]) {
			let differs = false;
			for (let y = 1900; y < 1960 && !differs; y++) differs = names(y) !== names(y + d);
			expect(differs, `period ${d}`).toBe(true);
		}
	});
});

describe("Bhutan's weekday offset moves the whole weekday", () => {
	// Before 2026-11-16 the offset moved the name only and these pinned `saturn`/`earth` for a
	// Bhutanese Saturday; the ruling is now that name, planet and element all move together.
	const SATURDAY = "2026-02-14";
	const SUN_ROW = { wylie: "nyi ma", planet: "sun", element: "fire" };
	const SATURN_ROW = { wylie: "spen pa", planet: "saturn", element: "earth" };
	const brief = (n: { wylie: string; planet: string; element: string }) => ({
		wylie: n.wylie,
		planet: n.planet,
		element: n.element,
	});

	it("gives a Bhutanese Saturday nyi ma, the sun and fire, under both Bhutanese configs", () => {
		for (const tradition of [BHUTAN, BHUTAN_HENNING]) {
			const date = isoToTibetan(iso(SATURDAY), tradition);
			expect(brief(date.weekdayName), tradition.name).toEqual(SUN_ROW);
			expect(brief(weekdayNameFor(date.tibetanWeekday, tradition)), tradition.name).toEqual(
				SUN_ROW,
			);
		}
	});

	it("leaves Saturday spen pa, Saturn and earth under Phugpa", () => {
		expect(brief(isoToTibetan(iso(SATURDAY), PHUGPA).weekdayName)).toEqual(SATURN_ROW);
		expect(brief(weekdayNameFor(asTibetanWeekday(0), PHUGPA))).toEqual(SATURN_ROW);
	});

	it("shifts name, planet and element together on 14 consecutive days, as the next row of the table", () => {
		const bad: string[] = [];
		let day = iso("2026-02-09");
		for (let i = 0; i < 14; i++) {
			const date = isoToTibetan(day, BHUTAN);
			const next = weekdayNameFor(asTibetanWeekday((date.tibetanWeekday + 1) % 7), PHUGPA);
			for (const [source, name] of [
				["weekdayNameFor", weekdayNameFor(date.tibetanWeekday, BHUTAN)],
				["TibetanDate", date.weekdayName],
			] as const) {
				if (JSON.stringify(name) !== JSON.stringify(next)) {
					bad.push(`${day} ${source}: ${name.wylie}/${name.planet}/${name.element}`);
				}
			}
			day = day.add({ days: 1 });
		}
		expect(bad).toEqual([]);
	});
});
