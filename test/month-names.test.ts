import { describe, expect, it } from "vitest";
import { monthNamesFor } from "../src/month-names.js";
import { BHUTAN } from "../src/traditions/bhutan.js";
import { PHUGPA } from "../src/traditions/phugpa.js";
import { HENNING_SIX_SEASONS } from "./fixtures/henning-six-seasons.js";
import { JANSON_MONTH_NAMES, JANSON_SEASONAL_STATEMENTS } from "./fixtures/janson-month-names.js";
import { MANSION_NAMES, MANSION_PAIR_STEMS } from "./fixtures/mansion-names.js";
import {
	FOUR_SEASON_MONTH_NAMES,
	INDIAN_MONTH_NAMES,
	KALACAKRA_SEASON_MONTHS,
	MANSION_MONTH_NAMES,
	SIX_SEASON_NAMES,
} from "./fixtures/month-names.js";
import { thrownBy } from "./support/thrown.js";
import { VERSION_CONFIGS } from "./support/versions.js";

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const namesOf = (month: number, tradition = PHUGPA) =>
	monthNamesFor({ year: 2153, month }, { tradition });

/** Janson writes "mid-spring"; the key spells the part out. */
const jansonWords = (entry: { season: string; part: string } | null) =>
	entry === null ? null : `${entry.part === "middle" ? "mid" : entry.part}-${entry.season}`;

/**
 * Henning's English for the six seasons, onto the keys. This bridge is authored, and it is the whole
 * of the test's trust in it: his "pre-winter" is hemanta and his "winter" śiśira, per the sourcing
 * record's six-season table.
 */
const HENNING_SEASON_KEY: Record<string, string> = {
	spring: "spring",
	summer: "summer",
	rains: "rains",
	autumn: "autumn",
	"pre-winter": "cold",
	winter: "dewy",
};
const fromHenning = (words: string) => {
	const match = words.toLowerCase().match(/^(early|late)-(.+)$/);
	const [part, season] = [match?.[1], match?.[2]];
	if (part === undefined || season === undefined) {
		throw new Error(`unparsable season words: ${words}`);
	}
	return { season: HENNING_SEASON_KEY[season], part };
};

describe("the lunar-mansion names", () => {
	it("are the verified fixture's, month by month", () => {
		const bad = MONTHS.filter((month) => {
			const row = MANSION_MONTH_NAMES.find((r) => r.month === month);
			const { tibetan, wylie, phonetic } = row ?? {};
			return (
				JSON.stringify(namesOf(month).mansion.tibetanName) !==
				JSON.stringify({ tibetan, wylie, phonetic })
			);
		});
		expect(bad).toEqual([]);
	});

	it("spell Janson's month-names table", () => {
		expect(MONTHS.map((month) => namesOf(month).mansion.tibetanName.wylie)).toEqual(
			JANSON_MONTH_NAMES.map((row) => row.wylie),
		);
	});

	/**
	 * The Sanskrit is the mansion's own, never the Indian month's — *maghā*, not *māgha*. Eleven
	 * months name a mansion outright and are checked against the verified 27-name table by Wylie, so
	 * the two tables cannot drift apart. Month 8 is the exception and has its own case below.
	 */
	it("carry the mansion's Sanskrit, taken from the verified 27-name table", () => {
		const bad = MONTHS.filter((month) => {
			const { tibetanName, sanskritName } = namesOf(month).mansion;
			const row = MANSION_NAMES.find((r) => r.wylie === tibetanName.wylie);
			if (row === undefined) return month !== 8;
			return (
				JSON.stringify(sanskritName) !==
				JSON.stringify({ iast: row.iast, devanagari: row.devanagari })
			);
		});
		expect(bad).toEqual([]);
	});

	/**
	 * *khrums* is the stem shared by mansions 24 and 25, so no single mansion's Sanskrit fits it.
	 * Sanskrit drops *pūrva* and *uttara* exactly as Tibetan drops *stod* and *smad*, and
	 * Monier-Williams p. 746 prints the result with the pair sense.
	 */
	it("give month 8 the pair's name, because khrums names two mansions", () => {
		const stem = MANSION_PAIR_STEMS.find((row) => row.wylie === "khrums");
		if (stem === undefined) throw new Error("the verifier emitted no khrums stem");
		expect(namesOf(8).mansion.sanskritName).toEqual({
			iast: stem.iast,
			devanagari: stem.devanagari,
		});
		expect(namesOf(8).mansion.tibetanName.wylie).toBe(stem.wylie);
		expect(MANSION_NAMES.filter((r) => r.wylie.startsWith("khrums")).map((r) => r.index)).toEqual(
			stem.members,
		);
	});

	it("freezes the Sanskrit it hands out", () => {
		expect(MONTHS.filter((month) => !Object.isFrozen(namesOf(month).mansion.sanskritName))).toEqual(
			[],
		);
	});
});

describe("the Indian month names", () => {
	it("are the verified fixture's, month by month", () => {
		const bad = MONTHS.filter((month) => {
			const row = INDIAN_MONTH_NAMES.find((r) => r.month === month);
			return (
				JSON.stringify(namesOf(month).indianMonth.sanskritName) !==
				JSON.stringify({ iast: row?.iast, devanagari: row?.devanagari })
			);
		});
		expect(bad).toEqual([]);
	});

	it("name the month, not its mansion: māgha beside maghā", () => {
		const names = namesOf(1);
		expect(names.indianMonth.sanskritName).toEqual({ iast: "māgha", devanagari: "माघ" });
		expect(names.mansion.sanskritName.iast).toBe("maghā");
	});

	/**
	 * The one stated exception to the rule. Monier-Williams defines the month as *jyaiṣṭha*; the
	 * Vimalaprabhā, Janson and the Mahāvyutpatti all lack the *ai*, and the verifier holds the pointer
	 * and the definition it departs from.
	 */
	it("give month 5 as jyeṣṭha, departing from Monier-Williams' jyaiṣṭha", () => {
		expect(namesOf(5).indianMonth.sanskritName).toEqual({ iast: "jyeṣṭha", devanagari: "ज्येष्ठ" });
		expect(INDIAN_MONTH_NAMES.filter((r) => r.definedAs !== null)).toEqual([
			expect.objectContaining({ month: 5, definedAs: { iast: "jyaiṣṭha", page: 427 } }),
		]);
		expect(namesOf(5).mansion.sanskritName.iast).toBe("jyeṣṭhā");
	});

	it("give month 10 as kārttika, not Janson's Kārtikka", () => {
		expect(namesOf(10).indianMonth.sanskritName).toEqual({
			iast: "kārttika",
			devanagari: "कार्त्तिक",
		});
	});

	it("freezes the Sanskrit it hands out", () => {
		expect(
			MONTHS.filter((month) => !Object.isFrozen(namesOf(month).indianMonth.sanskritName)),
		).toEqual([]);
	});
});

describe("the four-season systems", () => {
	it("month1EarlySpring is Janson's seasonal I column", () => {
		expect(
			MONTHS.map((month) => jansonWords(namesOf(month).fourSeasons.month1EarlySpring)),
		).toEqual(JANSON_MONTH_NAMES.map((row) => row.seasonalI));
	});

	it("tigerEarlySpring under Phugpa is Janson's seasonal II column", () => {
		expect(MONTHS.map((month) => jansonWords(namesOf(month).fourSeasons.tigerEarlySpring))).toEqual(
			JANSON_MONTH_NAMES.map((row) => row.seasonalII),
		);
	});

	it("month1LateWinter is the Mahāvyutpatti's season-months, which Janson's table does not carry", () => {
		expect(
			MONTHS.map((month) => {
				const { season, part } = namesOf(month).fourSeasons.month1LateWinter;
				return { month, season, part };
			}),
		).toEqual(KALACAKRA_SEASON_MONTHS.map(({ month, season, part }) => ({ month, season, part })));
	});

	it("agree with Janson's prose for months 1 and 3", () => {
		for (const system of ["month1LateWinter", "month1EarlySpring"] as const) {
			expect(
				JANSON_SEASONAL_STATEMENTS[system].map(({ month }) => ({
					month,
					wylie: namesOf(month).mansion.tibetanName.wylie,
					season: jansonWords(namesOf(month).fourSeasons[system]),
				})),
			).toEqual(JANSON_SEASONAL_STATEMENTS[system]);
		}
	});

	it("carry the verified season-month compounds", () => {
		const bad: string[] = [];
		for (const month of MONTHS) {
			const systems = namesOf(month).fourSeasons;
			for (const entry of [
				systems.month1LateWinter,
				systems.month1EarlySpring,
				systems.tigerEarlySpring,
			]) {
				if (entry === null) throw new Error("Phugpa has a Tiger month");
				const row = FOUR_SEASON_MONTH_NAMES.find(
					(r) => r.season === entry.season && r.part === entry.part,
				);
				const { tibetan, wylie, phonetic } = row ?? {};
				if (JSON.stringify(entry.tibetanName) !== JSON.stringify({ tibetan, wylie, phonetic })) {
					bad.push(`month ${month}: ${entry.season}/${entry.part}`);
				}
			}
		}
		expect(bad).toEqual([]);
	});
});

describe("the six-season system", () => {
	it("is Henning's list, pp. 358–359", () => {
		expect(
			HENNING_SIX_SEASONS.map(({ month }) => {
				const { season, part } = namesOf(month).sixSeasons.month3EarlySpring;
				return { month, season, part };
			}),
		).toEqual(HENNING_SIX_SEASONS.map(({ month, season }) => ({ month, ...fromHenning(season) })));
	});

	it("agrees with Janson's two statements, which cite Henning", () => {
		expect(
			JANSON_SEASONAL_STATEMENTS.sixSeasons.map(({ month, wylie, season }) => ({
				month,
				wylie,
				expected: fromHenning(season),
			})),
		).toEqual(
			JANSON_SEASONAL_STATEMENTS.sixSeasons.map(({ month }) => {
				const { season, part } = namesOf(month).sixSeasons.month3EarlySpring;
				return {
					month,
					wylie: namesOf(month).mansion.tibetanName.wylie,
					expected: { season, part },
				};
			}),
		);
	});

	it("carries the verified season names in Tibetan and Sanskrit", () => {
		const bad = MONTHS.filter((month) => {
			const entry = namesOf(month).sixSeasons.month3EarlySpring;
			const row = SIX_SEASON_NAMES.find((r) => r.season === entry.season);
			if (row === undefined) return true;
			return (
				JSON.stringify({ ...entry.tibetanName, ...entry.sanskritName }) !==
				JSON.stringify({
					tibetan: row.tibetan,
					wylie: row.wylie,
					phonetic: row.phonetic,
					iast: row.iast,
					devanagari: row.devanagari,
				})
			);
		});
		expect(bad).toEqual([]);
	});

	it("gives month 1 the key dewy and the Tibetan for late winter, as decided", () => {
		const entry = namesOf(1).sixSeasons.month3EarlySpring;
		expect([entry.season, entry.part, entry.tibetanName.wylie]).toEqual([
			"dewy",
			"early",
			"dgun smad",
		]);
	});
});

describe("month 1 in three traditions", () => {
	const summary = (tradition: typeof PHUGPA) => {
		const { fourSeasons, sixSeasons, mansion } = namesOf(1, tradition);
		return {
			month1LateWinter: jansonWords(fourSeasons.month1LateWinter),
			month1EarlySpring: jansonWords(fourSeasons.month1EarlySpring),
			tigerEarlySpring: jansonWords(fourSeasons.tigerEarlySpring),
			sixSeasons: jansonWords(sixSeasons.month3EarlySpring),
			mansion: mansion.tibetanName.wylie,
		};
	};

	it("Phugpa, whose Tiger month is month 11", () => {
		expect(summary(PHUGPA)).toEqual({
			month1LateWinter: "late-winter",
			month1EarlySpring: "early-spring",
			tigerEarlySpring: "late-spring",
			sixSeasons: "early-dewy",
			mansion: "mchu",
		});
	});

	it("Tsurphu, whose Tiger month is month 1, so two systems coincide", () => {
		expect(summary(VERSION_CONFIGS.tsurphu)).toEqual({
			month1LateWinter: "late-winter",
			month1EarlySpring: "early-spring",
			tigerEarlySpring: "early-spring",
			sixSeasons: "early-dewy",
			mansion: "mchu",
		});
	});

	// Janson's Bhutan appendix: "The months in Bhutan are numbered, as in Tibet. (Names exist as in
	// Tibet, see [his month-names section], but are usually not used.)" It does not say which seasonal
	// version, which is why nothing here defaults one.
	it("Bhutan, whose Tiger month no independent source gives", () => {
		expect(summary(BHUTAN)).toEqual({
			month1LateWinter: "late-winter",
			month1EarlySpring: "early-spring",
			tigerEarlySpring: null,
			sixSeasons: "early-dewy",
			mansion: "mchu",
		});
	});
});

describe("a leap month", () => {
	it("takes its regular month's names", () => {
		// 2151 has a leap month 6 under Phugpa.
		expect(monthNamesFor({ year: 2151, month: 6, isLeapMonth: true })).toEqual(
			monthNamesFor({ year: 2151, month: 6 }),
		);
	});

	it("is still validated against the year", () => {
		expect(thrownBy(() => monthNamesFor({ year: 2153, month: 5, isLeapMonth: true }))?.code).toBe(
			"TCT_NO_SUCH_LEAP_MONTH",
		);
	});
});

describe("the guard", () => {
	it.each([
		[
			"null options",
			() => monthNamesFor({ year: 2153, month: 1 }, null as never),
			"TCT_INVALID_ARGUMENT",
		],
		[
			"non-object options",
			() => monthNamesFor({ year: 2153, month: 1 }, 5 as never),
			"TCT_INVALID_ARGUMENT",
		],
		[
			"a null tradition",
			// Reaches the config validator rather than being replaced by PHUGPA — the `=== undefined` read.
			() => monthNamesFor({ year: 2153, month: 1 }, { tradition: null as never }),
			"TCT_INVALID_TRADITION_CONFIG",
		],
		[
			"a Temporal date",
			() => monthNamesFor(Temporal.PlainDate.from("2026-02-18") as never),
			"TCT_INVALID_ARGUMENT",
		],
		["a missing month", () => monthNamesFor({ year: 2153 } as never), "TCT_INVALID_ARGUMENT"],
		["month 13", () => monthNamesFor({ year: 2153, month: 13 }), "TCT_FIELD_OUT_OF_RANGE"],
	])("rejects %s", (_, call, code) => {
		expect(thrownBy(call)?.code).toBe(code);
	});
});

describe("what a call hands out", () => {
	it("shares only frozen leaves, so one caller cannot corrupt the next", () => {
		const names = namesOf(1);
		expect(Object.isFrozen(names.mansion.tibetanName)).toBe(true);
		expect(Object.isFrozen(names.fourSeasons.month1EarlySpring)).toBe(true);
		expect(Object.isFrozen(names.sixSeasons.month3EarlySpring.sanskritName)).toBe(true);

		(names.fourSeasons as { month1LateWinter: unknown }).month1LateWinter = "overwritten";
		expect(namesOf(1).fourSeasons.month1LateWinter.season).toBe("winter");
	});
});
