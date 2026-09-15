import { describe, expect, it } from "vitest";
import { lunarDayAttributes } from "../../src/astrology/lunar-day.js";
import { monthAttributes } from "../../src/astrology/month.js";
import { BHUTAN, BHUTAN_HENNING } from "../../src/traditions/bhutan.js";
import { PHUGPA } from "../../src/traditions/phugpa.js";
import { thrownBy } from "../support/thrown.js";
import { VERSION_CONFIGS } from "../support/versions.js";

/**
 * The lunar day's four labels, against the statements Janson makes *beside* his formulas.
 *
 * Those statements are the real check here, because there is no printed table to compare against.
 * He says which animal every odd and even month opens on, which trigram each month animal opens on,
 * and which of the nine numbers each month animal opens on — three claims he derives from the cycles
 * rather than from the congruences, so a misphased congruence fails them.
 */

const TSURPHU = VERSION_CONFIGS.tsurphu;

const ELEMENTS = ["wood", "fire", "earth", "iron", "water"] as const;

const ANIMALS = [
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
] as const;

const animalIndex = (animal: string) => ANIMALS.indexOf(animal as (typeof ANIMALS)[number]);

const monthOf = (month: number, year = 2026) =>
	Array.from({ length: 30 }, (_, i) => lunarDayAttributes(PHUGPA, year, month, i + 1));

describe("the lunar-day animal", () => {
	it("opens every odd month on Tiger and every even month on Monkey", () => {
		// Janson states exactly this, and it is independent of the congruence: 30 ≡ 6 (mod 12), so the
		// twelve-cycle lands six animals on from one month's start to the next.
		const bad: string[] = [];
		for (let month = 1; month <= 12; month++) {
			const first = lunarDayAttributes(PHUGPA, 2026, month, 1).animal;
			const expected = month % 2 === 1 ? "tiger" : "monkey";
			if (first !== expected) bad.push(`month ${month} opens on ${first}, not ${expected}`);
		}
		expect(bad).toEqual([]);
	});

	it("is the same in every tradition, because it reads only the two numbers", () => {
		// `(D + 6M + 8) amod 12`. The animal is the one lunar-day attribute with no tradition input —
		// which is why refusing it for Bhutan is a deliberate over-refusal rather than an oversight.
		const bad: string[] = [];
		for (let month = 1; month <= 12; month++) {
			for (let day = 1; day <= 30; day++) {
				const phugpa = lunarDayAttributes(PHUGPA, 2026, month, day).animal;
				const tsurphu = lunarDayAttributes(TSURPHU, 2026, month, day).animal;
				if (phugpa !== tsurphu) bad.push(`${month}-${day}: ${phugpa} vs ${tsurphu}`);
			}
		}
		expect(bad).toEqual([]);
	});

	it("runs continuously across an ordinary month boundary", () => {
		const bad: string[] = [];
		for (let month = 1; month <= 11; month++) {
			const last = monthOf(month)[29]?.animal ?? "";
			const next = lunarDayAttributes(PHUGPA, 2026, month + 1, 1).animal;
			if ((animalIndex(next) - animalIndex(last) + 12) % 12 !== 1) {
				bad.push(`${month}→${month + 1}: ${last}→${next}`);
			}
		}
		expect(bad).toEqual([]);
	});
});

describe("the lunar-day element", () => {
	it("opens each month on the element after the month's own", () => {
		// Janson: the cycle begins "with the element following the element of the month". This is the
		// one attribute that restarts every month, and so the one that jumps at a boundary.
		const bad: string[] = [];
		for (let year = 2020; year <= 2030; year++) {
			for (let month = 1; month <= 12; month++) {
				const monthElement = monthAttributes(PHUGPA, year, month).element;
				const son = ELEMENTS[(ELEMENTS.indexOf(monthElement) + 1) % 5];
				const got = lunarDayAttributes(PHUGPA, year, month, 1).element;
				if (got !== son) bad.push(`${year}-${month}: day 1 is ${got}, month is ${monthElement}`);
			}
		}
		expect(bad).toEqual([]);
	});

	it("steps one element a day, without the doubling the years and months use", () => {
		const bad: string[] = [];
		for (let month = 1; month <= 12; month++) {
			const days = monthOf(month);
			for (let i = 1; i < days.length; i++) {
				const here = ELEMENTS.indexOf(days[i - 1]?.element ?? "wood");
				const next = ELEMENTS.indexOf(days[i]?.element ?? "wood");
				if ((next - here + 5) % 5 !== 1) bad.push(`month ${month} day ${i + 1}`);
			}
		}
		expect(bad).toEqual([]);
	});
});

describe("the lunar-day trigram and number, against the lists Janson spells out", () => {
	it("opens each month on the trigram he names for its animal", () => {
		// "Months Tiger, Horse, Dog begin with Li; Rabbit, Sheep, Pig begin with Zin; Mouse, Dragon,
		// Monkey begin with Kham; Ox, Snake, Bird begin with Dwa." He names them in Tibetan; the
		// package keys them by his table's English — Li fire, Zin wood, Kham water, Dwa iron — and the
		// Tibetan is checked through tibetanNames below, so the quotation is tested as he wrote it.
		const opening: Record<string, [string, string]> = {
			tiger: ["fire", "li"],
			horse: ["fire", "li"],
			dog: ["fire", "li"],
			rabbit: ["wood", "zin"],
			sheep: ["wood", "zin"],
			pig: ["wood", "zin"],
			mouse: ["water", "kham"],
			dragon: ["water", "kham"],
			monkey: ["water", "kham"],
			ox: ["iron", "dwa"],
			snake: ["iron", "dwa"],
			bird: ["iron", "dwa"],
		};
		const bad: string[] = [];
		for (const config of [PHUGPA, TSURPHU]) {
			for (let month = 1; month <= 12; month++) {
				const animal = monthAttributes(config, 2026, month).animal;
				const day = lunarDayAttributes(config, 2026, month, 1);
				const [english, wylie] = opening[animal] ?? [];
				if (day.trigram !== english || day.tibetanNames.trigram.wylie !== wylie) {
					bad.push(
						`${config.id} month ${month} (${animal}) opens on ${day.trigram} / ${day.tibetanNames.trigram.wylie}`,
					);
				}
			}
		}
		expect(bad).toEqual([]);
	});

	it("opens each month on the number he names for its animal", () => {
		// "Months Tiger, Snake, Monkey, Pig begin with 1 (white); Mouse, Rabbit, Horse, Bird begin with
		// 4 (green); Ox, Dragon, Sheep, Dog begin with 7 (red)."
		const opening: Record<string, number> = {
			tiger: 1,
			snake: 1,
			monkey: 1,
			pig: 1,
			mouse: 4,
			rabbit: 4,
			horse: 4,
			bird: 4,
			ox: 7,
			dragon: 7,
			sheep: 7,
			dog: 7,
		};
		const bad: string[] = [];
		for (const config of [PHUGPA, TSURPHU]) {
			for (let month = 1; month <= 12; month++) {
				const animal = monthAttributes(config, 2026, month).animal;
				const got = lunarDayAttributes(config, 2026, month, 1).number;
				if (got !== opening[animal]) {
					bad.push(`${config.id} month ${month} (${animal}) opens on ${got}`);
				}
			}
		}
		expect(bad).toEqual([]);
	});

	it("runs the nine-number cycle continuously across an ordinary month boundary", () => {
		// 30 ≡ 3 (mod 9) and the cycle lands exactly one step on, which is what makes it continuous
		// rather than per-month.
		const bad: string[] = [];
		for (let month = 1; month <= 11; month++) {
			const last = monthOf(month)[29];
			const next = lunarDayAttributes(PHUGPA, 2026, month + 1, 1);
			if (last === undefined) continue;
			if (((next.number - last.number + 9) % 9 || 9) !== 1) {
				bad.push(`${month}→${month + 1}: number ${last.number}→${next.number}`);
			}
		}
		expect(bad).toEqual([]);
	});
});

describe("a leap month and the regular month sharing its number", () => {
	it("break the continuous cycle rather than extending it", () => {
		// Janson: the animals "are repeated in the same order in the leap month and the following
		// regular month and there is a discontinuity between the two months". Nothing here reads a leap
		// flag — a leap month shares its twin's number, so the congruences hand the pair identical rows
		// by construction. What is worth asserting is the consequence: the day after the thirtieth of
		// the first of the pair is the *first* of the repeat, which is not one step on in the cycle.
		const days = monthOf(4);
		const afterThirtieth = ANIMALS[(animalIndex(days[29]?.animal ?? "mouse") + 1) % 12];
		expect(days[0]?.animal).not.toBe(afterThirtieth);
		// And the labels depend on the month *number*, never on the year the month sits in, which is
		// what makes the twins identical in the first place. Asserting the pair equal to itself would
		// prove nothing; asserting the number is the only input does.
		expect(monthOf(4, 2027).map((day) => day.animal)).toEqual(days.map((day) => day.animal));
	});
});

describe("a tradition whose month attributes are unsourced refuses", () => {
	it("throws TCT_ATTRIBUTE_NOT_SOURCED for both Bhutanese configs", () => {
		for (const config of [BHUTAN, BHUTAN_HENNING]) {
			const error = thrownBy(() => lunarDayAttributes(config, 2026, 1, 1));
			expect(error?.code).toBe("TCT_ATTRIBUTE_NOT_SOURCED");
		}
	});

	it("refuses all four attributes, including the animal it could answer", () => {
		// The refusal is coarse on purpose: relaxing a throw into a return later is a widening, while
		// per-field nulls would tax every Phugpa consumer for ever with a gap that may close. So there
		// is no partial answer to test — the call itself throws.
		expect(thrownBy(() => lunarDayAttributes(BHUTAN, 2026, 7, 15))?.code).toBe(
			"TCT_ATTRIBUTE_NOT_SOURCED",
		);
	});
});

describe("every lunar day number answers, skipped ones included", () => {
	it("covers 1 to 30 of every month with no gaps", () => {
		// Deliberate, and the reason this layer takes numbers rather than a resolved date: a skipped
		// lunar day is still a lunar day, and an almanac prints its labels. `TibetanDate` cannot
		// represent one, so nothing downstream could ask this question through a date.
		const bad: string[] = [];
		for (let month = 1; month <= 12; month++) {
			for (let day = 1; day <= 30; day++) {
				const attributes = lunarDayAttributes(PHUGPA, 2026, month, day);
				if (attributes.number < 1 || attributes.number > 9) {
					bad.push(`${month}-${day}: number ${attributes.number}`);
				}
				if (!ANIMALS.includes(attributes.animal)) bad.push(`${month}-${day}: ${attributes.animal}`);
			}
		}
		expect(bad).toEqual([]);
	});
});
