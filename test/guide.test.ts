import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { attributesFor, ELEMENTAL_YOGAS, monthAttributesFor } from "../src/astrology/index.js";
import {
	isoToTibetan,
	julianDayFromIso,
	tibetanDateExists,
	tibetanToIso,
	tibetanWeekday,
} from "../src/computation/conversion.js";
import { yearNameFor } from "../src/cycles.js";
import { formatTibetanDate } from "../src/format.js";
import { monthNamesFor } from "../src/month-names.js";
import { monthsFor } from "../src/months.js";
import { nextFullMoon } from "../src/navigation.js";
import {
	composeObservances,
	EXAMPLE_OBSERVANCES,
	getObservances,
	nextObservance,
	type ObservanceWhen,
	observancesOn,
} from "../src/observances/index.js";
import { parseTibetanDate } from "../src/parse.js";
import { BHUTAN } from "../src/traditions/bhutan.js";
import { SkippedDayError } from "../src/types.js";
import { getObservancesChunked } from "./support/observances-chunked.js";

const iso = (s: string) => Temporal.PlainDate.from(s);

/**
 * Every claim `docs/guide.md` makes that states a value, asserted exactly as written there.
 *
 * The guide took the long-form material the README shed when it became a landing page, and these
 * cases came with it. They are split out of `test/readme.test.ts` rather than left there because a
 * suite named for one document while guarding another is a suite nobody will think to update: the
 * failure names the wrong file, and the person fixing it edits the wrong prose.
 *
 * The split was per-case, not per-block. The four `describe`s in the README suite did not align
 * with the README/guide boundary at all — its "usage examples" block alone spanned material that
 * landed on both sides — so each `it` was triaged on where its example now lives.
 *
 * `docs/guide.md` ships to npm, so these examples are contract for a consumer exactly as the
 * README's are. If one changes, change the guide in the same commit.
 */
describe("guide examples", () => {
	const date = isoToTibetan(iso("2026-08-12"));

	// The date's route back to its own month, and the invariant that makes it usable: the number on
	// the date is the number on the month containing it.
	it("carries the lunation of the month containing it", () => {
		const month = monthsFor(date.year).find((m) => m.monthCode === date.monthCode);
		expect(date.lunation).toBe(month?.lunation);
		expect(month?.yearName).toEqual(yearNameFor(date.year));
	});

	it("numbers the weekday as ISO 8601 and names it through Temporal", () => {
		expect(date.dayOfWeek).toBe(3);
		expect(date.isoDate.dayOfWeek).toBe(3);
		expect(date.isoDate.toLocaleString("en-GB", { weekday: "long" })).toBe("Wednesday");
		// The Tibetan numbering, 0 = Saturday, kept separate from the ISO field. Available both as
		// a field and from a Julian day, and the two must agree.
		expect(date.tibetanWeekday).toBe(4);
		expect(tibetanWeekday(julianDayFromIso(iso("2026-08-12")))).toBe(4);
	});

	it("numbers lunations consecutively, with the leap month before its twin", () => {
		const lunations = monthsFor(2151).map((m) => m.lunation);
		for (let i = 1; i < lunations.length; i++) {
			expect(lunations[i]).toBe((lunations[i - 1] ?? Number.NaN) + 1);
		}
		const months = monthsFor(2151);
		const leap = months.find((m) => m.monthCode === "M06L");
		const regular = months.find((m) => m.monthCode === "M06");
		expect(leap?.lunation).toBe((regular?.lunation ?? Number.NaN) - 1);
	});

	it("reads the documented dates back, including a skipped one", () => {
		expect(parseTibetanDate("2153-M12-08")).toEqual({
			year: 2153,
			month: 12,
			day: 8,
			isLeapMonth: false,
			isLeapDay: false,
		});
		expect(tibetanToIso(parseTibetanDate("2153-M12-08")).toString()).toBe("2027-01-15");
		expect(formatTibetanDate(parseTibetanDate("2152-M09-30 (leap)"))).toBe("2152-M09-30 (leap)");

		const skipped = parseTibetanDate("2150-M12-29");
		expect(tibetanDateExists(skipped)).toBe(false);

		for (const rejected of ["2153-M12-8", "2153-m12-08", "2153-12-08"]) {
			try {
				parseTibetanDate(rejected);
				expect.unreachable(`${rejected} should be refused`);
			} catch (error) {
				expect((error as { code?: string }).code, rejected).toBe("TCT_INVALID_ARGUMENT");
			}
		}
	});

	// The message text is pinned here only because the README prints it. Everywhere else the suite
	// asserts on `error.code`, which is the contract; wording is not and may change.
	it("reports and throws on the documented skipped date", () => {
		expect(tibetanDateExists({ year: 2150, month: 12, day: 29 })).toBe(false);
		expect(() => tibetanToIso({ year: 2150, month: 12, day: 29 })).toThrow(SkippedDayError);
		expect(() => tibetanToIso({ year: 2150, month: 12, day: 29 })).toThrow(
			"Tibetan date 2150-M12-29 is skipped: no calendar day carries it.",
		);
	});

	it("puts the full moon on the 14th of the documented month that skips its 15th", () => {
		// The window 1 January 2022 to 25 February 2028 holds exactly one such month; the polyfill
		// probe named the case as one its run could not reach.
		expect(tibetanDateExists({ year: 2153, month: 11, day: 15 })).toBe(false);
		expect(nextFullMoon(iso("2026-12-22")).isoDate.toString()).toBe("2026-12-23");
		const day = isoToTibetan(iso("2026-12-23"));
		expect([day.year, day.month, day.day, day.isFullMoon]).toEqual([2153, 11, 14, true]);
	});

	it("distinguishes the halves of the documented doubled date", () => {
		expect(isoToTibetan(iso("2025-11-19")).isLeapDay).toBe(true);
		expect(isoToTibetan(iso("2025-11-20")).isLeapDay).toBe(false);
		expect(isoToTibetan(iso("2025-11-19")).isDoubledDay).toBe(true);
		expect(tibetanToIso({ year: 2152, month: 9, day: 30, isLeapDay: true }).toString()).toBe(
			"2025-11-19",
		);
		expect(tibetanToIso({ year: 2152, month: 9, day: 30 }).toString()).toBe("2025-11-20");
	});

	it("selects the documented leap month", () => {
		const leap = isoToTibetan(iso("2024-07-06"));
		expect(leap.monthCode).toBe("M06L");
		expect(leap.isLeapMonth).toBe(true);
		expect(tibetanToIso({ year: 2151, month: 6, day: 1, isLeapMonth: true }).toString()).toBe(
			"2024-07-06",
		);
		expect(tibetanToIso({ year: 2151, month: 6, day: 1 }).toString()).toBe("2024-08-05");
	});

	// The composed case the README warns about, and the one that caught the drafting error.
	it("needs both flags where a leap month and a doubled day coincide", () => {
		expect(
			tibetanToIso({
				year: 2151,
				month: 6,
				day: 4,
				isLeapMonth: true,
				isLeapDay: true,
			}).toString(),
		).toBe("2024-07-09");
		expect(tibetanToIso({ year: 2151, month: 6, day: 4, isLeapMonth: true }).toString()).toBe(
			"2024-07-10",
		);
	});

	it("ignores isLeapDay on a day that is not doubled", () => {
		const fields = { year: 2151, month: 6, day: 5, isLeapMonth: true };
		expect(isoToTibetan(iso("2024-07-11")).isDoubledDay).toBe(false);
		expect(tibetanToIso({ ...fields, isLeapDay: true }).toString()).toBe("2024-07-11");
		expect(tibetanToIso(fields).toString()).toBe("2024-07-11");
	});

	it("reads a day by id, level and tags, as the guide's first example does", () => {
		const day = observancesOn(iso("2026-03-03"), EXAMPLE_OBSERVANCES);
		expect(day.map((o) => o.rule.id)).toEqual([
			"chotrul-duchen",
			"fire-puja",
			"medicine-buddha",
			"sojong",
		]);
		const duchen = day.find((o) => o.rule.tags?.includes("duchen"));
		expect(duchen?.rule.id).toBe("chotrul-duchen");
		expect(duchen?.rule.level).toBe("everyone");
	});

	it("groups a month by the config's levels, one heading per level, with per-practice switches", () => {
		const month = getObservances(iso("2026-03-01"), iso("2026-03-31"), EXAMPLE_OBSERVANCES);
		const hidden = new Set(["dharma-protector-day"]);
		const shown = month.filter((o) => !hidden.has(o.rule.id));
		const levels = EXAMPLE_OBSERVANCES.levels ?? [];
		expect(levels.map((l) => l.id)).toEqual(["everyone", "no-empowerment", "empowerment"]);
		const grouped = levels.flatMap((level) => shown.filter((o) => o.rule.level === level.id));
		expect(grouped).toHaveLength(shown.length);
		expect(month.length).toBeGreaterThan(shown.length);
	});

	it("moves the 2024 Chokhor Duchen to 9 July under the guide's Kopan layer", () => {
		const kopan = composeObservances(EXAMPLE_OBSERVANCES, {
			id: "kopan",
			englishName: "Kopan",
			doubledDay: "first",
		});
		const onNinth = observancesOn(iso("2024-07-09"), kopan).filter(
			(o) => o.rule.id === "chokhor-duchen",
		);
		expect(onNinth.map((o) => o.resolution)).toEqual(["firstOfDoubled"]);
		const shipped = observancesOn(iso("2024-07-10"), EXAMPLE_OBSERVANCES).filter(
			(o) => o.rule.id === "chokhor-duchen",
		);
		expect(shipped.map((o) => o.resolution)).toEqual(["secondOfDoubled"]);
	});

	it("refuses a misspelt layer key by name, with the documented code", () => {
		let thrown: { code?: string; message?: string } | undefined;
		try {
			composeObservances(EXAMPLE_OBSERVANCES, {
				id: "x",
				englishName: "X",
				doubleDay: "first",
			} as never);
		} catch (error) {
			thrown = error as { code?: string; message?: string };
		}
		expect(thrown?.code).toBe("TCT_INVALID_OBSERVANCE_CONFIG");
		expect(thrown?.message).toContain("doubleDay");
	});

	// The README prints the three convention fields, their allowed values and EXAMPLE_OBSERVANCES's defaults as a
	// table. A default changing there and not here would put a wrong date in front of a reader.
	it("documents EXAMPLE_OBSERVANCES's convention defaults correctly", () => {
		expect(EXAMPLE_OBSERVANCES.doubledDay).toBe("second");
		expect(EXAMPLE_OBSERVANCES.skippedDay).toBe("preceding");
		expect(EXAMPLE_OBSERVANCES.leapMonth).toBe("leap");
	});

	// The list of `resolution` values reads as exhaustive, and once was not -- it omitted
	// "firstOfDoubled", which any config setting `doubledDay: 'first'` produces. Asserting the set
	// rather than a sample is the point.
	it("produces every resolution the README lists, and no other", () => {
		// Read from the guide, so a list that drifts from what the engine produces fails here.
		const guide = readFileSync(new URL("../docs/guide.md", import.meta.url), "utf8");
		const paragraph = guide
			.split("\n\n")
			.find((p) => p.startsWith("Every result carries a `resolution`"));
		expect(paragraph).toBeDefined();
		const documented = [...(paragraph ?? "").matchAll(/`"(\w+)"`/g)].map((m) => m[1]).sort();
		expect(documented).toHaveLength(7);
		const seen = new Set<string>();
		for (const doubledDay of ["first", "second", "both"] as const) {
			const config = { ...EXAMPLE_OBSERVANCES, id: `readme-${doubledDay}`, doubledDay };
			// A wide window on purpose: "exact" and the two doubled cases appear within months, but a
			// rule's own day being skipped is rarer than a skipped day, so a few years would not
			// exercise "dayBeforeSkipped" and the assertion would pass for the wrong reason.
			for (const o of getObservancesChunked(iso("2010-01-01"), iso("2030-12-31"), config)) {
				seen.add(o.resolution);
			}
		}
		expect([...seen].sort()).toEqual(documented);
	});

	// The guide's `myCentre` layer, written as it is there.
	const myCentre = composeObservances(EXAMPLE_OBSERVANCES, {
		id: "my-centre",
		englishName: "My centre",
		replaceLevels: [{ id: "everyone", englishName: "Open to all" }],
		addLevels: [{ id: "centre", englishName: "Our centre" }],
		remove: ["fire-puja"],
		add: [
			{
				id: "founder-birthday",
				englishName: "Founder’s birthday",
				level: "centre",
				when: { type: "western", month: 7, day: 6, ageFromYear: 1950 },
			},
			{
				id: "founding-day",
				englishName: "Founding day",
				level: "centre",
				when: { type: "annual", dates: [{ month: 4, day: 15 }], ageFromYear: 2113 },
				skippedDay: "following",
			},
		],
	});

	it("applies the documented layer: renamed level, removed rule, added rules, base untouched", () => {
		expect(myCentre.levels?.map((l) => [l.id, l.englishName])).toEqual([
			["everyone", "Open to all"],
			["no-empowerment", "Practitioners, no empowerment needed"],
			["empowerment", "Practitioners, empowerment required"],
			["centre", "Our centre"],
		]);
		expect(myCentre.rules.some((r) => r.id === "fire-puja")).toBe(false);
		expect(EXAMPLE_OBSERVANCES.rules.some((r) => r.id === "fire-puja")).toBe(true);
		expect(Object.isFrozen(myCentre)).toBe(true);
	});

	it("reports the founder's Western birthday age as the guide states", () => {
		const birthday = observancesOn(iso("2026-07-06"), myCentre).find(
			(o) => o.rule.id === "founder-birthday",
		);
		expect(birthday?.age).toBe(76);
	});

	it("counts an annual rule's ageFromYear in Tibetan years, and a Western year there gives 203", () => {
		const founding = (config: typeof myCentre) =>
			getObservances(iso("2026-01-01"), iso("2026-12-31"), config).filter(
				(o) => o.rule.id === "founding-day",
			);
		const [occurrence] = founding(myCentre);
		expect(occurrence?.date.year).toBe(2153);
		expect(occurrence?.age).toBe(40);
		const wrong = composeObservances(myCentre, {
			id: "wrong",
			englishName: "Wrong",
			replace: [
				{
					id: "founding-day",
					englishName: "Founding day",
					level: "centre",
					when: { type: "annual", dates: [{ month: 4, day: 15 }], ageFromYear: 1950 },
					skippedDay: "following",
				},
			],
		});
		expect(founding(wrong)[0]?.age).toBe(203);
	});

	it("describes a rule's form with a default branch, as the guide's switch does", () => {
		const describeWhen = (when: ObservanceWhen): string => {
			switch (when.type) {
				case "monthly":
					return `days ${when.days.join(", ")} of every month`;
				case "annual":
					return "once a year, on a Tibetan date";
				default:
					return `a ${when.type} rule`;
			}
		};
		const tara = EXAMPLE_OBSERVANCES.rules.find((r) => r.id === "tara");
		expect(tara && describeWhen(tara.when)).toBe("days 8 of every month");
	});

	it("chains nextObservance through 2026's sojong days, as the guide does", () => {
		const found = [];
		let next = nextObservance(iso("2025-12-31"), "sojong", EXAMPLE_OBSERVANCES);
		while (next !== null && next.date.isoDate.year === 2026) {
			found.push(next);
			next = nextObservance(next.date.isoDate, "sojong", EXAMPLE_OBSERVANCES);
		}
		expect(found).toHaveLength(25);
	});

	it("reports the documented skipped date with the documented code", () => {
		let thrown: unknown;
		try {
			tibetanToIso({ year: 2150, month: 12, day: 29 });
		} catch (error) {
			thrown = error;
		}
		expect(thrown).toBeInstanceOf(SkippedDayError);
		expect((thrown as { code?: string }).code).toBe("TCT_SKIPPED_DAY");
		expect((thrown as SkippedDayError).requested).toEqual({ year: 2150, month: 12, day: 29 });
	});
	/**
	 * The `./astrology` section, added 2026-09-12. Every value it prints, asserted — `docs/guide.md`
	 * ships in the tarball, so its examples are contract exactly as the README's are.
	 */
	describe("what kind of day it is", () => {
		const day = attributesFor(iso("2026-09-01"));

		it("states the year's power and body elements correctly", () => {
			expect(day.year.power).toBe("fire");
			expect(day.year.body).toBe("water");
		});

		it("states a block's Tibetan label correctly", () => {
			expect(day.year.tibetanNames.body.wylie).toBe("chu");
		});

		it("states the lunar mansion correctly", () => {
			expect(day.lunarMansion.index).toBe(26);
			expect(day.lunarMansion.sanskritName.iast).toBe("revatī");
			expect(day.lunarMansion.tibetanName.wylie).toBe("nam gru");
			expect(day.lunarMansion.element).toBe("water");
		});

		it("states the yoga and its favorability correctly", () => {
			expect(day.yoga.englishName).toBe("death");
			expect(day.yoga.sanskritName.iast).toBe("maraṇa");
			expect(day.yoga.favorable).toBe(false);
			expect(day.yoga.auspiciousness.englishName).toBe("worst");
		});

		it("is right that the yoga is Tuesday's fire paired with the water of Revatī", () => {
			expect(day.date.isoDate.dayOfWeek).toBe(2);
			expect(day.date.weekdayName.element).toBe("fire");
			expect(day.lunarMansion.element).toBe("water");
			expect(day.lunarMansion.sanskritName.iast).toBe("revatī");
			expect([...day.yoga.elements].sort()).toEqual(["fire", "water"]);
		});

		it("prints every cell of the ten-yoga table as the package ships it", () => {
			// Read from the document: ninety cells restated here would pass while the guide drifted.
			const header =
				"| Pair | `englishName` | Tibetan | Wylie | Phonetic | Sanskrit | Devanāgarī | `favorable` | `auspiciousness` |";
			const lines = readFileSync(new URL("../docs/guide.md", import.meta.url), "utf8").split(
				String.fromCharCode(10),
			);
			const start = lines.indexOf(header);
			expect(start).toBeGreaterThan(-1);
			const printed = lines.slice(start + 2, start + 12).map((line) =>
				line
					.split("|")
					.slice(1, -1)
					.map((cell) => cell.trim()),
			);
			const shipped = ELEMENTAL_YOGAS.map((yoga) => [
				yoga.elements.join(" + "),
				yoga.englishName,
				yoga.tibetanName.tibetan,
				yoga.tibetanName.wylie,
				yoga.tibetanName.phonetic,
				yoga.sanskritName.iast,
				yoga.sanskritName.devanagari,
				yoga.favorable ? "yes" : "no",
				`${yoga.auspiciousness.englishName} (${yoga.auspiciousness.tibetanName.tibetan})`,
			]);
			expect(printed).toEqual(shipped);
		});

		it("is right that the lunar day and the calendar day disagree", () => {
			expect(day.lunarDay?.animal).not.toBe(day.calendarDay.animal);
		});

		it("is right about what a doubled date shares and what it does not", () => {
			const first = attributesFor(iso("2024-05-15"));
			const second = attributesFor(iso("2024-05-16"));
			expect(first.lunarDay).toEqual(second.lunarDay);
			expect(first.month).toEqual(second.month);
			expect(first.calendarDay).not.toEqual(second.calendarDay);
			expect(first.yoga).not.toBe(second.yoga);
			// "can differ", so pinned on a pair where it does, by value.
			expect([first.lunarMansion.index, second.lunarMansion.index]).toEqual([7, 8]);
		});

		it("is right that Bhutan reports null and the primitive throws", () => {
			expect(attributesFor(iso("2026-09-01"), BHUTAN).month).toBeNull();
			let thrown: unknown;
			try {
				monthAttributesFor({ year: 2153, month: 1 }, BHUTAN);
			} catch (error) {
				thrown = error;
			}
			expect((thrown as { code?: string }).code).toBe("TCT_ATTRIBUTE_NOT_SOURCED");
		});
	});

	describe("naming a month", () => {
		it("prints the example's values", () => {
			const names = monthNamesFor({ year: 2153, month: 1 });
			expect(names.mansion.tibetanName.wylie).toBe("mchu");
			expect(names.mansion.sanskritName.iast).toBe("maghā");
			expect(names.indianMonth.sanskritName.iast).toBe("māgha");
			expect(names.fourSeasons.month1EarlySpring.season).toBe("spring");
			expect(names.fourSeasons.month1EarlySpring.tibetanName.wylie).toBe("dpyid zla ra ba");
			expect(names.sixSeasons.month3EarlySpring.sanskritName.iast).toBe("śiśira");
		});

		it("prints every cell of the month-by-month table as the engine computes it", () => {
			// Read from the document rather than restated here: there are too many cells to
			// keep in step by hand, and a restated copy would pass while the guide drifted.
			const header =
				"| Month | `mansion` | Tibetan | Phonetic | Sanskrit | `indianMonth` | `month1LateWinter` | `month1EarlySpring` | `tigerEarlySpring`, Phugpa | `sixSeasons.month3EarlySpring` |";
			const lines = readFileSync(new URL("../docs/guide.md", import.meta.url), "utf8").split("\n");
			const start = lines.indexOf(header);
			expect(start).toBeGreaterThan(-1);
			const printed = lines.slice(start + 2, start + 14).map((line) =>
				line
					.split("|")
					.slice(1, -1)
					.map((cell) => cell.trim()),
			);

			const words = (entry: { season: string; part: string } | null) =>
				entry === null ? "null" : `${entry.part} ${entry.season}`;
			const computed = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => {
				const { mansion, indianMonth, fourSeasons, sixSeasons } = monthNamesFor({
					year: 2153,
					month,
				});
				return [
					String(month),
					mansion.tibetanName.wylie,
					mansion.tibetanName.tibetan,
					mansion.tibetanName.phonetic,
					`*${mansion.sanskritName.iast}*`,
					`*${indianMonth.sanskritName.iast}*`,
					words(fourSeasons.month1LateWinter),
					words(fourSeasons.month1EarlySpring),
					words(fourSeasons.tigerEarlySpring),
					words(sixSeasons.month3EarlySpring),
				];
			});
			expect(printed).toEqual(computed);
		});

		it("is right about spring's months in three columns, and Bhutan's null", () => {
			const springs = (pick: (month: number) => { season: string }) =>
				[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((month) => pick(month).season === "spring");
			const of = (month: number) => monthNamesFor({ year: 2153, month });
			expect(springs((m) => of(m).fourSeasons.month1LateWinter)).toEqual([2, 3, 4]);
			expect(springs((m) => of(m).fourSeasons.month1EarlySpring)).toEqual([1, 2, 3]);
			expect(springs((m) => of(m).sixSeasons.month3EarlySpring)).toEqual([3, 4]);
			expect(
				monthNamesFor({ year: 2153, month: 1 }, BHUTAN).fourSeasons.tigerEarlySpring,
			).toBeNull();
			const month1 = of(1).sixSeasons.month3EarlySpring;
			expect([month1.season, month1.part, month1.tibetanName.wylie]).toEqual([
				"dewy",
				"early",
				"dgun smad",
			]);
		});
	});
});
