import { describe, expect, it } from "vitest";
import { isoToTibetan, tibetanDateExists, tibetanToIso } from "../src/computation/conversion.js";
import { yearNameFor } from "../src/cycles.js";
import { datesFor, monthsFor } from "../src/months.js";
import {
	addDays,
	addMonths,
	addMonthsToDate,
	daysBetween,
	lunationFromMonth,
	monthFromLunation,
	monthsBetween,
	nextFullMoon,
	nextNewMoon,
	resolveDate,
} from "../src/navigation.js";
import { BHUTAN } from "../src/traditions/bhutan.js";
import { PHUGPA, PHUGPA_HENNING } from "../src/traditions/phugpa.js";
import { SkippedDayError } from "../src/types.js";
import { thrownBy } from "./support/thrown.js";

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
 * The month coordinate: a Tibetan month is a lunation, and lunations are an unbroken count.
 *
 * These two are the pair `julianDayFromIso` / `isoFromJulianDay` already establishes for days,
 * applied to months. They are the only route to the count a consumer cannot derive, because the
 * intercalation index is not public.
 */
describe("lunationFromMonth and monthFromLunation", () => {
	it("round-trips every month of a leap year and a common one", () => {
		for (const year of [2151, 2153]) {
			for (const month of monthsFor(year)) {
				const n = lunationFromMonth(month);
				const back = monthFromLunation(n);
				expect(back.year, `${year} ${month.monthCode}`).toBe(month.year);
				expect(back.month).toBe(month.month);
				expect(back.isLeapMonth).toBe(month.isLeapMonth);
				expect(back.monthCode).toBe(month.monthCode);
				expect(back.firstDay.toString()).toBe(month.firstDay.toString());
			}
		}
	});

	it("agrees with the lunation the month already carries", () => {
		for (const month of monthsFor(2151)) {
			expect(lunationFromMonth(month)).toBe(month.lunation);
		}
	});

	/**
	 * The case that makes label arithmetic wrong: a leap month is the lunation *before* the regular
	 * month it shares a number with, so `+1` from the leap month lands on its twin.
	 */
	it("numbers a leap month one before its twin", () => {
		const leap = lunationFromMonth({ year: 2151, month: 6, isLeapMonth: true });
		const regular = lunationFromMonth({ year: 2151, month: 6 });
		expect(regular - leap).toBe(1);
		expect(monthFromLunation(leap + 1).monthCode).toBe("M06");
	});

	it("continues across Losar without a gap", () => {
		const lastOf2151 = lunationFromMonth({ year: 2151, month: 12 });
		expect(monthFromLunation(lastOf2151 + 1)).toMatchObject({ year: 2152, month: 1 });
	});

	// A TibetanDate satisfies TibetanMonthFields, so this compiles; the day is deliberately ignored,
	// because a date's lunation is its month's.
	it("reads a TibetanDate as its own month, ignoring the day", () => {
		const date = isoToTibetan(iso("2026-08-12"));
		expect(lunationFromMonth(date)).toBe(date.lunation);
	});

	it("respects the tradition it is given", () => {
		const n = lunationFromMonth({ year: 2226, month: 9 }, PHUGPA_HENNING);
		expect(monthFromLunation(n, PHUGPA_HENNING).firstDay.toString()).toBe("2099-10-14");
		expect(monthFromLunation(n).firstDay.toString()).toBe("2099-10-15");
	});

	it("names a month whose year the caller never supplied", () => {
		// The point of the reverse direction: an integer from storage, with no year in hand.
		const m = monthFromLunation(lunationFromMonth({ year: 2151, month: 6, isLeapMonth: true }));
		expect(m.year).toBe(2151);
		expect(m.yearName).toEqual(yearNameFor(2151));
	});
});

/**
 * The guard table. This project has been bitten twice by a missing input check, so every argument
 * of every new export is asserted here rather than trusted to the shared helpers.
 */
describe("lunation coordinate input guards", () => {
	it.each([
		["a PlainDate", () => lunationFromMonth(iso("2026-08-12") as never)],
		[
			"a PlainDateTime",
			() => lunationFromMonth(Temporal.PlainDateTime.from("2026-08-12T00:00") as never),
		],
		["null", () => lunationFromMonth(null as never)],
		["undefined", () => lunationFromMonth(undefined as never)],
		[
			"a non-boolean isLeapMonth",
			() => lunationFromMonth({ year: 2151, month: 6, isLeapMonth: 1 } as never),
		],
	])("lunationFromMonth rejects %s", (_label, call) => {
		expect(codeOf(call)).toBe("TCT_INVALID_ARGUMENT");
	});

	it.each([
		["month 0", () => lunationFromMonth({ year: 2151, month: 0 })],
		["month 13", () => lunationFromMonth({ year: 2151, month: 13 })],
		["a fractional month", () => lunationFromMonth({ year: 2151, month: 1.5 })],
		["a fractional year", () => lunationFromMonth({ year: 2151.5, month: 1 })],
		["a NaN year", () => lunationFromMonth({ year: Number.NaN, month: 1 })],
	])("lunationFromMonth rejects %s", (_label, call) => {
		expect(codeOf(call)).toBe("TCT_FIELD_OUT_OF_RANGE");
	});

	it.each([
		["a fraction", () => monthFromLunation(1.5)],
		["NaN", () => monthFromLunation(Number.NaN)],
		["Infinity", () => monthFromLunation(Number.POSITIVE_INFINITY)],
		["a string", () => monthFromLunation("7" as unknown as number)],
	])("monthFromLunation rejects %s", (_label, call) => {
		expect(codeOf(call)).toBe("TCT_FIELD_OUT_OF_RANGE");
	});

	/**
	 * `monthFromCount` is the same closed-form family as `solarMonthsSinceEpoch`, which overflowed
	 * 2^53 and returned confident nonsense until a bound was added. An unbounded lunation reaches it
	 * through a new door, so the bound is derived here too — and pinned from both sides, so the
	 * derivation cannot silently become a literal that is merely large.
	 */
	it("bounds a lunation far outside the exact range rather than answering", () => {
		expect(codeOf(() => monthFromLunation(Number.MAX_SAFE_INTEGER))).toBe(
			"TCT_OUTSIDE_EXACT_RANGE",
		);
		expect(codeOf(() => monthFromLunation(-Number.MAX_SAFE_INTEGER))).toBe(
			"TCT_OUTSIDE_EXACT_RANGE",
		);
	});

	/**
	 * A lunation can clear the month-count bound and still land far outside the range where
	 * `true_date` is exact. Before this was guarded, `monthFromLunation(1e10)` threw an **uncoded**
	 * `RangeError: Duration was not valid` straight out of Temporal — a bare throw below the
	 * boundary, which is precisely what `2026-08-12-error-codes-not-classes.md` exists to prevent.
	 */
	it.each([1e10, 1e12, 5e13])("codes the boundary overflow at lunation %i", (n) => {
		expect(codeOf(() => monthFromLunation(n))).toBe("TCT_OUTSIDE_EXACT_RANGE");
	});

	it("answers just inside the bound", () => {
		// Losar 2153 is well inside; the positive case is what stops the bound being over-tightened.
		const n = lunationFromMonth({ year: 2153, month: 1 });
		expect(monthFromLunation(n).monthCode).toBe("M01");
	});

	/**
	 * Without this guard `trueMonthCount(config, y, month, true)` for a month with no twin returns
	 * the *previous* month's count — a wrong answer indistinguishable from a right one, which is
	 * worse than a throw. `daysInMonth` and `tibetanToIso` already refuse the same request.
	 */
	it("refuses a leap month the year does not have", () => {
		expect(codeOf(() => lunationFromMonth({ year: 2153, month: 5, isLeapMonth: true }))).toBe(
			"TCT_NO_SUCH_LEAP_MONTH",
		);
		// The same month without the flag is fine, which is what makes the flag the thing at fault.
		expect(() => lunationFromMonth({ year: 2153, month: 5 })).not.toThrow();
	});

	it("names the function the caller actually called", () => {
		try {
			lunationFromMonth(iso("2026-08-12") as never);
			expect.unreachable("should reject a Temporal instance");
		} catch (error) {
			expect((error as Error).message).toContain("lunationFromMonth");
		}
	});
});

/**
 * Month arithmetic, and the three naive versions it exists to replace.
 *
 * A throwaway grid spike wrote each of them against the surface before these shipped. All three
 * are wrong, and the second is wrong *silently*, which is what settled the question.
 */
describe("addMonths", () => {
	it("steps into the leap month and then out of it", () => {
		const may = { year: 2151, month: 5 };
		expect(addMonths(may, 1).monthCode).toBe("M06L");
		expect(addMonths(may, 2).monthCode).toBe("M06");
		expect(addMonths(may, 3).monthCode).toBe("M07");
	});

	/**
	 * The naive step a consumer actually writes is `monthsFor(year)[month.month]`, indexing the
	 * array by month number. In a leap year that returns **the month you are already on** from the
	 * leap month onward — a dead "next month" button, returning a valid object and throwing
	 * nothing, in one year out of three. This is the case that argues the export into existence.
	 */
	it("advances past the leap month where indexing by month number stalls", () => {
		const months = monthsFor(2151);
		const june = months.find((m) => m.monthCode === "M06");
		if (june === undefined) expect.unreachable("2151 has a regular M06");

		// The naive version, reproduced so the failure is on the record rather than in a comment.
		expect(months[june.month]?.monthCode).toBe("M06");
		// What it should be.
		expect(addMonths(june, 1).monthCode).toBe("M07");
	});

	it("crosses Losar, where searching a single year returns nothing", () => {
		expect(addMonths({ year: 2151, month: 12 }, 1)).toMatchObject({ year: 2152, month: 1 });
		expect(addMonths({ year: 2152, month: 1 }, -1)).toMatchObject({ year: 2151, month: 12 });
	});

	it("steps backwards as far as it steps forwards", () => {
		// The hand-rolled version searched one year either side, so its range was silently
		// asymmetric: +20 worked from M05 and -20 threw.
		const may = { year: 2151, month: 5 };
		expect(addMonths(may, 20).year).toBe(2152);
		expect(addMonths(may, -20).year).toBe(2149);
	});

	it("is the identity at zero and composes", () => {
		const m = { year: 2151, month: 6, isLeapMonth: true };
		expect(addMonths(m, 0).monthCode).toBe("M06L");
		expect(addMonths(addMonths(m, 3), -3).monthCode).toBe("M06L");
	});

	it("refuses a TibetanDate at COMPILE time, so the day cannot be silently discarded", () => {
		const date = isoToTibetan(iso("2026-08-12"));
		// @ts-expect-error a date carries a day, and `day?: never` is what rejects it. tsc errors on
		// an UNUSED @ts-expect-error, so this line fails typecheck the moment the narrowing is lost.
		// It used to compile and return a month, discarding the day in silence.
		expect(() => addMonths(date, 1)).not.toThrow();
		// The day is what is refused, not the value: dropping it compiles and still steps correctly.
		expect(
			addMonths({ year: date.year, month: date.month, isLeapMonth: date.isLeapMonth }, 1).lunation,
		).toBe(date.lunation + 1);
		// addMonthsToDate is the route for a date, and it agrees about the month.
		expect(addMonthsToDate(date, 1).lunation).toBe(date.lunation + 1);
	});
});

describe("monthsBetween", () => {
	it("counts lunations, so a leap month counts as one", () => {
		expect(monthsBetween({ year: 2151, month: 5 }, { year: 2151, month: 7 })).toBe(3);
		expect(monthsBetween({ year: 2153, month: 5 }, { year: 2153, month: 7 })).toBe(2);
	});

	it("is signed and antisymmetric", () => {
		const a = { year: 2151, month: 5 };
		const b = { year: 2152, month: 3 };
		expect(monthsBetween(a, b)).toBe(-monthsBetween(b, a));
		expect(monthsBetween(a, a)).toBe(0);
	});

	it("inverts addMonths", () => {
		const a = { year: 2151, month: 5 };
		const b = { year: 2152, month: 3 };
		expect(addMonths(a, monthsBetween(a, b)).monthCode).toBe(
			monthFromLunation(lunationFromMonth(b)).monthCode,
		);
	});

	it("distinguishes the halves of a leap pair", () => {
		const leap = { year: 2151, month: 6, isLeapMonth: true };
		const regular = { year: 2151, month: 6 };
		expect(monthsBetween(leap, regular)).toBe(1);
	});
});

describe("month arithmetic input guards", () => {
	it.each([
		["addMonths, a PlainDate", () => addMonths(iso("2026-08-12") as never, 1)],
		["addMonths, null", () => addMonths(null as never, 1)],
		[
			"monthsBetween, a PlainDate as from",
			() => monthsBetween(iso("2026-08-12") as never, { year: 2151, month: 1 }),
		],
		[
			"monthsBetween, a PlainDate as to",
			() => monthsBetween({ year: 2151, month: 1 }, iso("2026-08-12") as never),
		],
		["monthsBetween, null as to", () => monthsBetween({ year: 2151, month: 1 }, null as never)],
	])("rejects %s", (_label, call) => {
		expect(codeOf(call)).toBe("TCT_INVALID_ARGUMENT");
	});

	it.each([
		["a fractional count", () => addMonths({ year: 2151, month: 5 }, 1.5)],
		["NaN", () => addMonths({ year: 2151, month: 5 }, Number.NaN)],
		["Infinity", () => addMonths({ year: 2151, month: 5 }, Number.POSITIVE_INFINITY)],
		["month 13 in the argument", () => addMonths({ year: 2151, month: 13 }, 1)],
	])("addMonths rejects %s", (_label, call) => {
		expect(codeOf(call)).toBe("TCT_FIELD_OUT_OF_RANGE");
	});

	/**
	 * Both arguments are guarded, separately, and the message says which one failed. These are the
	 * first two-date exports on this surface, and checking only the first is the obvious omission.
	 */
	it("names which of monthsBetween's two arguments was wrong", () => {
		try {
			monthsBetween({ year: 2151, month: 1 }, iso("2026-08-12") as never);
			expect.unreachable("should reject the second argument");
		} catch (error) {
			expect((error as Error).message).toMatch(/^monthsBetween\(to\): /);
		}
	});

	it("bounds a count that would leave the exact range", () => {
		expect(codeOf(() => addMonths({ year: 2151, month: 5 }, Number.MAX_SAFE_INTEGER))).toBe(
			"TCT_OUTSIDE_EXACT_RANGE",
		);
	});
});

/**
 * Day arithmetic, in **solar** days.
 *
 * The unit matters: a Tibetan date number is a lunar day, and lunar days vary between about 21.5
 * and 25.7 hours, which is why some numbers are skipped and some carried by two days. Elapsed-time
 * reckonings — the 49-day bardo count, the weekly pujas after a death — are counted in solar days,
 * and that is what these do.
 */
describe("addDays", () => {
	/**
	 * The roadmap asked what `addDays` returns when the target date is skipped. The question rests
	 * on a false premise: `isoToTibetan` is total, so every calendar day has a Tibetan date, and
	 * stepping real days can never arrive at a label no day carries.
	 */
	it("never lands on a date that does not exist", { timeout: 30_000 }, () => {
		// A span holding known skips and doubles — 2151 doubles a day and skips two in month 5 alone.
		const start = { year: 2151, month: 1, day: 1 };
		for (let n = 0; n < 800; n++) {
			const result = addDays(start, n);
			expect(tibetanDateExists(result), `+${n} -> ${result.monthCode}-${result.day}`).toBe(true);
		}
	});

	it("counts solar days, so 49 days is 49 calendar days", () => {
		const from = { year: 2153, month: 12, day: 8 };
		const iso49 = tibetanToIso(from).add({ days: 49 });
		expect(addDays(from, 49).isoDate.toString()).toBe(iso49.toString());
	});

	it("steps backwards and is the identity at zero", () => {
		const d = { year: 2153, month: 6, day: 30 };
		expect(addDays(d, 0).isoDate.toString()).toBe(tibetanToIso(d).toString());
		expect(addDays(addDays(d, 40), -40).isoDate.toString()).toBe(tibetanToIso(d).toString());
	});

	it("crosses a skipped number without stalling on it", () => {
		// Month 5 of 2151 skips 17 and 28: stepping through must simply not produce them.
		const dates = [...Array(30).keys()].map((n) => addDays({ year: 2151, month: 5, day: 1 }, n));
		const numbers = dates.filter((d) => d.month === 5 && !d.isLeapMonth).map((d) => d.day);
		expect(numbers).not.toContain(17);
		expect(new Set(numbers).size).toBeLessThan(numbers.length + 1);
	});

	it("throws for a skipped starting date rather than guessing", () => {
		expect(codeOf(() => addDays({ year: 2150, month: 12, day: 29 }, 1))).toBe("TCT_SKIPPED_DAY");
	});
});

describe("daysBetween", () => {
	it("is signed, antisymmetric and zero on itself", () => {
		const a = { year: 2153, month: 1, day: 1 };
		const b = { year: 2153, month: 6, day: 30 };
		expect(daysBetween(a, b)).toBeGreaterThan(0);
		expect(daysBetween(b, a)).toBe(-daysBetween(a, b));
		expect(daysBetween(a, a)).toBe(0);
	});

	it("inverts addDays", () => {
		const a = { year: 2153, month: 1, day: 1 };
		const b = { year: 2154, month: 3, day: 12 };
		expect(addDays(a, daysBetween(a, b)).isoDate.toString()).toBe(tibetanToIso(b).toString());
	});

	it("agrees with Temporal on the same two days", () => {
		const a = { year: 2153, month: 1, day: 1 };
		const b = { year: 2153, month: 6, day: 30 };
		expect(daysBetween(a, b)).toBe(tibetanToIso(b).since(tibetanToIso(a)).days);
	});

	it("throws for a skipped endpoint, which names no day to count from", () => {
		const skipped = { year: 2150, month: 12, day: 29 };
		expect(codeOf(() => daysBetween(skipped, { year: 2153, month: 1, day: 1 }))).toBe(
			"TCT_SKIPPED_DAY",
		);
		expect(codeOf(() => daysBetween({ year: 2153, month: 1, day: 1 }, skipped))).toBe(
			"TCT_SKIPPED_DAY",
		);
	});
});

describe("day arithmetic input guards", () => {
	it.each([
		["addDays, a PlainDate", () => addDays(iso("2026-08-12") as never, 1)],
		["addDays, null", () => addDays(null as never, 1)],
		[
			"addDays, a non-boolean isLeapDay",
			() => addDays({ year: 2153, month: 1, day: 1, isLeapDay: "x" } as never, 1),
		],
		[
			"daysBetween, a PlainDate as from",
			() => daysBetween(iso("2026-08-12") as never, { year: 2153, month: 1, day: 1 }),
		],
		[
			"daysBetween, a PlainDate as to",
			() => daysBetween({ year: 2153, month: 1, day: 1 }, iso("2026-08-12") as never),
		],
	])("rejects %s", (_label, call) => {
		expect(codeOf(call)).toBe("TCT_INVALID_ARGUMENT");
	});

	it.each([
		["a fractional count", () => addDays({ year: 2153, month: 1, day: 1 }, 1.5)],
		["NaN", () => addDays({ year: 2153, month: 1, day: 1 }, Number.NaN)],
		["Infinity", () => addDays({ year: 2153, month: 1, day: 1 }, Number.POSITIVE_INFINITY)],
		["day 31", () => addDays({ year: 2153, month: 1, day: 31 }, 1)],
		["day 0", () => addDays({ year: 2153, month: 1, day: 0 }, 1)],
		["month 13", () => addDays({ year: 2153, month: 13, day: 1 }, 1)],
		["a fractional year", () => addDays({ year: 2153.5, month: 1, day: 1 }, 1)],
		["a NaN year", () => addDays({ year: Number.NaN, month: 1, day: 1 }, 1)],
	])("addDays rejects %s", (_label, call) => {
		expect(codeOf(call)).toBe("TCT_FIELD_OUT_OF_RANGE");
	});

	it("names which of daysBetween's two arguments was wrong", () => {
		try {
			daysBetween({ year: 2153, month: 1, day: 1 }, iso("2026-08-12") as never);
			expect.unreachable("should reject the second argument");
		} catch (error) {
			expect((error as Error).message).toMatch(/^daysBetween\(to\): /);
		}
	});

	// Julian-day arithmetic can leave the exact range even when the starting date is well inside it.
	it("bounds a result that leaves the exact range", () => {
		expect(codeOf(() => addDays({ year: 2153, month: 1, day: 1 }, Number.MAX_SAFE_INTEGER))).toBe(
			"TCT_OUTSIDE_EXACT_RANGE",
		);
	});
});

/**
 * Phase navigation.
 *
 * These earn their place on the wrong-answer criterion rather than on cost. The obvious
 * consumer-side shortcut is `day === 15`, and it is wrong whenever 15 is skipped: the full moon is
 * then carried by the day numbered 14. When 30 is doubled the new moon is on the **second** of the
 * pair, not the leap day.
 */
describe("nextFullMoon and nextNewMoon", () => {
	it("finds a phase strictly after the given day", () => {
		const from = iso("2026-01-01");
		const full = nextFullMoon(from);
		expect(full.isFullMoon).toBe(true);
		expect(Temporal.PlainDate.compare(full.isoDate, from)).toBeGreaterThan(0);

		const dark = nextNewMoon(from);
		expect(dark.isNewMoon).toBe(true);
		expect(Temporal.PlainDate.compare(dark.isoDate, from)).toBeGreaterThan(0);
	});

	it("does not return the given day even when it is itself a phase", () => {
		const full = nextFullMoon(iso("2026-01-01"));
		const after = nextFullMoon(full.isoDate);
		expect(Temporal.PlainDate.compare(after.isoDate, full.isoDate)).toBeGreaterThan(0);
		expect(after.isFullMoon).toBe(true);
	});

	/**
	 * The oracle. `test/invariants.test.ts` already proves exactly one full and one new moon per
	 * month by walking every calendar day; this asserts the O(1) lookup agrees with that walk, so
	 * a reimplementation that quietly became a day-walk — or quietly became `day === 15` — fails.
	 */
	it("agrees with a day-by-day walk over four years", { timeout: 30_000 }, () => {
		let cursor = iso("2024-01-01");
		const end = iso("2028-01-01");
		while (Temporal.PlainDate.compare(cursor, end) < 0) {
			const expected = nextFullMoon(cursor);
			// Walk forward one day at a time until isFullMoon, which is how a consumer would do it.
			let probe = cursor.add({ days: 1 });
			while (!isoToTibetan(probe).isFullMoon) probe = probe.add({ days: 1 });
			expect(expected.isoDate.toString(), `from ${cursor}`).toBe(probe.toString());
			cursor = probe;
		}
	});

	/**
	 * The case `day === 15` gets wrong, with a real date rather than a scan: 2026-12-23 carries the
	 * full moon of 2153 M11 on the day numbered **14**. Measured under `PHUGPA` over 2,500
	 * lunations from month 1 of Tibetan 2000 (1873 CE) to month 2 of 2202 (2075 CE), 57 of them —
	 * about one in forty-four — put the full moon on 14 rather than 15, and 58 put the new moon on 29
	 * rather than 30. A consumer testing the number is silently wrong that often.
	 * "over the sample the docblocks quote" asserts those figures, which the docblocks of
	 * `nextFullMoon` and `nextNewMoon` ship.
	 */
	it("finds the full moon on a day numbered 14, where 15 is skipped", () => {
		const moon = nextFullMoon(iso("2026-12-01"));
		expect(moon.isoDate.toString()).toBe("2026-12-23");
		expect(moon.day).toBe(14);
		expect(moon.isFullMoon).toBe(true);
	});

	it("finds the new moon on a day numbered 29, where 30 is skipped", () => {
		const moon = nextNewMoon(iso("2025-02-01"));
		expect(moon.isoDate.toString()).toBe("2025-02-27");
		expect(moon.day).toBe(29);
		expect(moon.isNewMoon).toBe(true);
	});

	it("over the sample the docblocks quote, 57 full moons fall on 14, 58 new moons on 29", {
		timeout: 30_000,
	}, () => {
		const first = lunationFromMonth({ year: 2000, month: 1 });
		expect(datesFor(monthFromLunation(first))[0]?.isoDate.toString()).toBe("1873-02-28");
		expect(monthFromLunation(first + 2499).monthCode).toBe("M02");
		expect(monthFromLunation(first + 2499).year).toBe(2202);
		let fullOn14 = 0;
		let newOn29 = 0;
		for (let n = first; n < first + 2500; n++) {
			const days = datesFor(monthFromLunation(n));
			if (days.find((d) => d.isFullMoon)?.day === 14) fullOn14++;
			if (days.find((d) => d.isNewMoon)?.day === 29) newOn29++;
		}
		expect([fullOn14, newOn29]).toEqual([57, 58]);
	});

	it("puts the new moon on the second of a doubled 30, not the leap day", () => {
		let cursor = iso("2020-01-01");
		for (let i = 0; i < 80; i++) {
			const moon = nextNewMoon(cursor);
			if (moon.isDoubledDay) expect(moon.isLeapDay).toBe(false);
			cursor = moon.isoDate;
		}
	});

	// A bare { year, month, day } was widened ONTO this parameter on 2026-08-26 and narrowed back
	// OFF it on 2026-08-27. It is refused rather than read as either calendar, because nothing about
	// the object says which one it names — the ground asPlainDate has always refused it on.
	it.each([
		["null", () => nextNewMoon(null as never)],
		["a number", () => nextFullMoon(42 as never)],
		["a boolean", () => nextNewMoon(true as never)],
		["a bare fields object", () => nextFullMoon({ year: 2026, month: 8, day: 12 } as never)],
	])("rejects %s", (_label, call) => {
		expect(codeOf(call)).toBe("TCT_INVALID_ARGUMENT");
	});

	it("names resolveDate in the message, so the refusal states its own remedy", () => {
		let message = "";
		try {
			nextFullMoon({ year: 2153, month: 8, day: 12 } as never);
		} catch (error) {
			message = (error as Error).message;
		}
		expect(message).toContain("resolveDate");
	});

	it("accepts the Temporal shapes that name a calendar day", () => {
		const expected = nextFullMoon(iso("2026-01-01")).isoDate.toString();
		expect(nextFullMoon("2026-01-01" as never).isoDate.toString()).toBe(expected);
		expect(
			nextFullMoon(Temporal.PlainDateTime.from("2026-01-01T13:00") as never).isoDate.toString(),
		).toBe(expected);
	});

	it("refuses a starting day outside the exact range", () => {
		expect(codeOf(() => nextFullMoon(iso("+012000-01-01"), PHUGPA_HENNING))).toBe(
			"TCT_OUTSIDE_EXACT_RANGE",
		);
	});

	/**
	 * The second bound, and it is not the same check as the first. `PHUGPA_HENNING` runs out of
	 * exactness at +011356-03-03, so a day a fortnight earlier is itself perfectly computable while
	 * the next full moon after it is not. Without the guard on the *result*, that case would answer
	 * from arithmetic the tradition refuses rather than throwing.
	 */
	it("refuses a phase that falls past the bound although the starting day does not", () => {
		// +011356-03-02 is the last day PHUGPA_HENNING can compute; the full moon after it is not.
		expect(codeOf(() => nextFullMoon(iso("+011356-03-02"), PHUGPA_HENNING))).toBe(
			"TCT_OUTSIDE_EXACT_RANGE",
		);
		// One day earlier the phase lands exactly on the bound and is answerable, which is what makes
		// the line above the *result* guard rather than the input one.
		expect(nextFullMoon(iso("+011356-03-01"), PHUGPA_HENNING).isoDate.toString()).toBe(
			"+011356-03-02",
		);
		// And the same day is fine under PHUGPA, whose range is far wider — so this is the tradition's
		// bound biting, not a broken date.
		expect(() => nextFullMoon(iso("+011356-03-02"))).not.toThrow();
	});
});

describe("resolveDate", () => {
	it("resolves identifying fields to the date they name", () => {
		expect(resolveDate({ year: 2153, month: 12, day: 8 }).isoDate.toString()).toBe("2027-01-15");
	});

	it("agrees with the round trip it replaces, across a month", () => {
		for (const date of datesFor({ year: 2153, month: 1 })) {
			expect(
				resolveDate({
					year: date.year,
					month: date.month,
					day: date.day,
					isLeapMonth: date.isLeapMonth,
					isLeapDay: date.isLeapDay,
				}),
			).toEqual(date);
		}
	});

	it("throws an actual SkippedDayError on a date no day carries", () => {
		let thrown: unknown;
		try {
			resolveDate({ year: 2150, month: 12, day: 29 });
		} catch (error) {
			thrown = error;
		}
		expect(thrown).toBeInstanceOf(SkippedDayError);
		expect((thrown as SkippedDayError).code).toBe("TCT_SKIPPED_DAY");
	});

	it("carries the same field guards addDays does", () => {
		expect(codeOf(() => resolveDate({ year: 2153, month: 12, day: 31 }))).toBe(
			"TCT_FIELD_OUT_OF_RANGE",
		);
		expect(codeOf(() => resolveDate({ year: 2153, month: 13, day: 1 }))).toBe(
			"TCT_FIELD_OUT_OF_RANGE",
		);
	});
});

describe("addMonthsToDate", () => {
	// 2153 M03 carries no 5 and no 29; 2153 M05 carries no 2 and no 25. Verified by datesFor below,
	// so the probe fails loudly if the arithmetic moves rather than testing a stale assumption.
	it("names months that really do skip the numbers this suite probes", () => {
		const skipped = (month: number) => {
			const present = new Set(datesFor({ year: 2153, month }).map((d) => d.day));
			return [...Array(30).keys()].map((i) => i + 1).filter((d) => !present.has(d));
		};
		expect(skipped(3)).toEqual([5, 29]);
		expect(skipped(5)).toEqual([2, 25]);
	});

	it("keeps the day number when the target month carries it", () => {
		const stepped = addMonthsToDate({ year: 2153, month: 2, day: 8 }, 1);
		expect(stepped.month).toBe(3);
		expect(stepped.day).toBe(8);
	});

	it("constrains to the nearest LOWER existing day by default", () => {
		expect(addMonthsToDate({ year: 2153, month: 2, day: 5 }, 1).day).toBe(4);
		expect(addMonthsToDate({ year: 2153, month: 2, day: 29 }, 1).day).toBe(28);
		expect(addMonthsToDate({ year: 2153, month: 4, day: 2 }, 1).day).toBe(1);
		expect(addMonthsToDate({ year: 2153, month: 4, day: 25 }, 1).day).toBe(24);
	});

	it("throws SkippedDayError under overflow: reject", () => {
		let thrown: unknown;
		try {
			addMonthsToDate({ year: 2153, month: 2, day: 5 }, 1, { overflow: "reject" });
		} catch (error) {
			thrown = error;
		}
		expect(thrown).toBeInstanceOf(SkippedDayError);
	});

	// M4.4: the candidate is resolved through the internal path, not the public resolveDate; the
	// error's `requested` must still be the candidate, frozen, as SkippedDayError promises.
	it("reports the skipped candidate, frozen, as the error's requested fields", () => {
		const thrown = thrownBy(() =>
			addMonthsToDate({ year: 2153, month: 2, day: 5 }, 1, { overflow: "reject" }),
		);
		expect(thrown).toBeInstanceOf(SkippedDayError);
		const requested = (thrown as SkippedDayError).requested;
		expect(requested).toEqual({
			year: 2153,
			month: 3,
			day: 5,
			isLeapMonth: false,
			isLeapDay: false,
		});
		expect(Object.isFrozen(requested)).toBe(true);
	});

	it("lands on day 2 when the target month's day 1 is skipped (2154 M08)", () => {
		expect(datesFor({ year: 2154, month: 8 })[0]?.day).toBe(2);
		const stepped = addMonthsToDate({ year: 2154, month: 7, day: 1 }, 1);
		expect([stepped.year, stepped.month, stepped.day]).toEqual([2154, 8, 2]);
	});

	// 2104 M01 skips day 1 and doubles day 2: 1977-02-19 is its leap half, 1977-02-20 its regular half.
	it("falls from a skipped day 1 onto the FIRST half of a doubled day 2, the month's first calendar day (2104 M01)", () => {
		const stepped = addMonthsToDate({ year: 2103, month: 12, day: 1 }, 1);
		expect([stepped.year, stepped.month, stepped.day]).toEqual([2104, 1, 2]);
		expect(stepped.isLeapDay).toBe(true);
		expect(stepped.isoDate.toString()).toBe("1977-02-19");
	});

	it("lands a day-2 start on the REGULAR half of the doubled day 2 — day 2 is carried, not a fallback (2104 M01)", () => {
		const stepped = addMonthsToDate({ year: 2103, month: 12, day: 2 }, 1);
		expect([stepped.year, stepped.month, stepped.day]).toEqual([2104, 1, 2]);
		expect(stepped.isLeapDay).toBe(false);
		expect(stepped.isoDate.toString()).toBe("1977-02-20");
	});

	describe("which half of a doubled day it lands on", () => {
		const leapStartOf = (year: number, month: number, day: number) => ({
			year,
			month,
			day,
			isLeapDay: true,
		});
		const landing = (
			from: { year: number; month: number; day: number; isLeapDay?: boolean },
			months: number,
			tradition = PHUGPA,
		) => {
			const stepped = addMonthsToDate(from, months, { tradition });
			return `${stepped.year}-${stepped.month}${stepped.isLeapMonth ? "L" : ""}-${stepped.day} ${stepped.isLeapDay ? "leap" : "regular"} ${stepped.isoDate}`;
		};

		it("returns the start itself when adding 0 to a leap half (2104 M02 day 7)", () => {
			expect(landing(leapStartOf(2104, 2, 7), 0)).toBe("2104-2-7 leap 1977-03-26");
			expect(landing({ year: 2104, month: 2, day: 7 }, 0)).toBe("2104-2-7 regular 1977-03-27");
			expect(landing(leapStartOf(2102, 11, 7), 0, BHUTAN)).toBe("2102-11-7 leap 1975-12-09");
		});

		it("lands a leap-half start on the leap half of a doubled target", () => {
			expect(landing(leapStartOf(2100, 7, 6), 3)).toBe("2100-10-6 leap 1973-11-30");
			expect(landing(leapStartOf(2102, 11, 7), 4, BHUTAN)).toBe("2103-2-7 leap 1976-04-06");
		});

		it("lands a regular-half start on the regular half of a doubled target", () => {
			expect(landing({ year: 2100, month: 7, day: 6 }, 3)).toBe("2100-10-6 regular 1973-12-01");
			expect(landing({ year: 2102, month: 11, day: 7 }, 4, BHUTAN)).toBe(
				"2103-2-7 regular 1976-04-07",
			);
		});

		it("lands an ordinary start on the regular half of a doubled target", () => {
			expect(landing({ year: 2100, month: 1, day: 24 }, 1)).toBe("2100-2-24 regular 1973-04-27");
			expect(landing({ year: 2100, month: 1, day: 19 }, 1, BHUTAN)).toBe(
				"2100-2-19 regular 1973-03-23",
			);
		});

		it("reads isLeapDay on an ordinary start as absent, as every TibetanDateFields does", () => {
			expect(landing(leapStartOf(2100, 1, 24), 1)).toBe("2100-2-24 regular 1973-04-27");
		});

		it("lands a leap-half start on the single day of a target that is not doubled", () => {
			expect(landing(leapStartOf(2100, 7, 6), 1)).toBe("2100-8-6 regular 1973-10-02");
			expect(landing(leapStartOf(2102, 11, 7), 1, BHUTAN)).toBe("2102-11L-7 regular 1976-01-08");
		});

		it("falls down from a skipped number onto the SECOND half of a doubled lower day", () => {
			expect(landing({ year: 2104, month: 9, day: 25 }, 1)).toBe("2104-10-24 regular 1977-12-05");
			expect(landing({ year: 2106, month: 6, day: 8 }, 1, BHUTAN)).toBe(
				"2106-7-7 regular 1979-08-30",
			);
		});

		it("refuses only a missing number under overflow: reject, never a doubled one", () => {
			expect(
				addMonthsToDate(leapStartOf(2100, 7, 6), 3, { overflow: "reject" }).isoDate.toString(),
			).toBe("1973-11-30");
			expect(
				addMonthsToDate({ year: 2100, month: 1, day: 24 }, 1, {
					overflow: "reject",
				}).isoDate.toString(),
			).toBe("1973-04-27");
			expect(
				thrownBy(() =>
					addMonthsToDate({ year: 2103, month: 12, day: 1 }, 1, { overflow: "reject" }),
				),
			).toBeInstanceOf(SkippedDayError);
		});
	});

	// Tibetan 2027 to 2227 is 1900 to 2101 CE; the first assertion in each sweep pins that.
	// Per tradition: steps from an ordinary day, those whose target carries the number, and those
	// of the latter that hit a doubled target. PHUGPA's last two are the figures quoted in
	// src/navigation.ts.
	for (const [name, tradition, expectedSteps, expectedCarrying, expectedDoubled] of [
		["PHUGPA", PHUGPA, 70119, 67321, 1631],
		["BHUTAN", BHUTAN, 70135, 67328, 1639],
	] as const) {
		it(`${name}: a +1 month step from an ordinary day elapses 29 or 30 days and keeps the number or its skip fallback, over Tibetan 2027-2227`, () => {
			const months: ReturnType<typeof datesFor>[] = [];
			for (let year = 2027; year <= 2227; year++) {
				for (const month of monthsFor(year, tradition)) months.push(datesFor(month, tradition));
			}
			expect(months[0]?.[0]?.isoDate.year).toBe(1900);
			expect(months.at(-1)?.at(-1)?.isoDate.year).toBe(2101);

			const bad: string[] = [];
			let steps = 0;
			let carrying = 0;
			let doubledTargets = 0;
			for (let i = 0; i < months.length - 1; i++) {
				const here = months[i] as ReturnType<typeof datesFor>;
				const next = months[i + 1] as ReturnType<typeof datesFor>;
				const present = new Set(next.map((d) => d.day));
				const doubled = new Set(next.filter((d) => d.isDoubledDay).map((d) => d.day));
				for (const start of here) {
					if (start.isDoubledDay) continue;
					steps++;
					const stepped = addMonthsToDate(start, 1, { tradition });
					let expected = start.day;
					while (expected > 1 && !present.has(expected)) expected--;
					if (!present.has(expected)) expected = 2;
					const days = start.isoDate.until(stepped.isoDate, { largestUnit: "day" }).days;
					const where = `${start.isoDate} (${start.day}) -> ${stepped.isoDate} (${stepped.day})`;
					if (stepped.day !== expected) bad.push(`${where}: expected day ${expected}`);
					if (days !== 29 && days !== 30) bad.push(`${where}: elapsed ${days}`);
					if (start.day === expected) carrying++;
					if (start.day === expected && doubled.has(expected)) {
						doubledTargets++;
						if (days !== 30 || stepped.isLeapDay) bad.push(`${where}: doubled target not regular`);
					}
				}
			}
			expect(bad).toEqual([]);
			expect([steps, carrying, doubledTargets]).toEqual([
				expectedSteps,
				expectedCarrying,
				expectedDoubled,
			]);
		}, 120_000);
	}

	it("still refuses a skipped day 1 under overflow: reject", () => {
		const thrown = thrownBy(() =>
			addMonthsToDate({ year: 2154, month: 7, day: 1 }, 1, { overflow: "reject" }),
		);
		expect(thrown).toBeInstanceOf(SkippedDayError);
		expect(thrown?.code).toBe("TCT_SKIPPED_DAY");
	});

	it("refuses a skipped STARTING date under both overflow settings", () => {
		for (const overflow of ["constrain", "reject"] as const) {
			const thrown = thrownBy(() =>
				addMonthsToDate({ year: 2153, month: 3, day: 5 }, 1, { overflow }),
			);
			expect(thrown, overflow).toBeInstanceOf(SkippedDayError);
			expect(thrown?.code, overflow).toBe("TCT_SKIPPED_DAY");
		}
		expect(thrownBy(() => addMonthsToDate({ year: 2153, month: 3, day: 5 }, 0))?.code).toBe(
			"TCT_SKIPPED_DAY",
		);
	});

	it("refuses an overflow value it does not know rather than defaulting", () => {
		expect(
			codeOf(() =>
				addMonthsToDate({ year: 2153, month: 2, day: 8 }, 1, {
					overflow: "clamp" as never,
				}),
			),
		).toBe("TCT_INVALID_ARGUMENT");
	});

	it("steps across a leap month in lunation order, like addMonths", () => {
		const from = { year: 2151, month: 5, day: 10 };
		expect(addMonthsToDate(from, 1).isLeapMonth).toBe(true);
		expect(addMonthsToDate(from, 1).month).toBe(6);
		expect(addMonthsToDate(from, 2).isLeapMonth).toBe(false);
		expect(addMonthsToDate(from, 2).month).toBe(6);
	});

	it("agrees with addMonths about which month it lands in, over a leap year", () => {
		const bad: string[] = [];
		for (let step = -13; step <= 13; step++) {
			const date = addMonthsToDate({ year: 2151, month: 1, day: 10 }, step);
			const month = addMonths({ year: 2151, month: 1 }, step);
			if (date.month !== month.month || date.isLeapMonth !== month.isLeapMonth) {
				bad.push(`${step}: ${date.monthCode} vs ${month.monthCode}`);
			}
		}
		expect(bad).toEqual([]);
	});

	it("takes the tradition through the options bag rather than defaulting to PHUGPA", () => {
		// Threaded, not ignored: the answer must track addMonths under the SAME config. Asserting a
		// literal here would pass just as well with the config dropped, since the two traditions
		// agree on every month's first day in all but four Tibetan years between 1500 and 2500
		// (1373 to 2373 CE), and on every month boundary in all but five.
		const bad: string[] = [];
		for (const tradition of [PHUGPA, PHUGPA_HENNING]) {
			for (let step = -6; step <= 6; step++) {
				const date = addMonthsToDate({ year: 2151, month: 1, day: 10 }, step, { tradition });
				const month = addMonths({ year: 2151, month: 1 }, step, tradition);
				if (date.monthCode !== month.monthCode || date.year !== month.year) {
					bad.push(`${tradition === PHUGPA ? "PHUGPA" : "HENNING"} ${step}`);
				}
			}
		}
		expect(bad).toEqual([]);
	});

	it("names the key `tradition`, as every other bag does", () => {
		// Until 2026-09-24 this bag's key was `config`, while ./observances' `config` is an
		// ObservanceConfig — and `{ tradition: BHUTAN }`, the key everywhere else, was silently
		// ignored. Tibetan 2150 M01 day 10 is 2023-03-01 under Phugpa and 2023-03-02 under Bhutan.
		const date = { year: 2150, month: 1, day: 10 };
		expect(String(addMonthsToDate(date, 0).isoDate)).toBe("2023-03-01");
		expect(String(addMonthsToDate(date, 0, { tradition: BHUTAN }).isoDate)).toBe("2023-03-02");
	});

	it("is a no-op at zero on a date that exists", () => {
		expect(addMonthsToDate({ year: 2153, month: 12, day: 8 }, 0).isoDate.toString()).toBe(
			"2027-01-15",
		);
	});
});

describe("nextFullMoon / nextNewMoon accept a Tibetan date too", () => {
	it("agrees with the Temporal form across a leap month", () => {
		const bad: string[] = [];
		// 2151 carries the leap M06, so this window straddles it.
		for (const month of monthsFor(2151)) {
			for (const date of datesFor(month)) {
				for (const [name, fn] of [
					["nextFullMoon", nextFullMoon],
					["nextNewMoon", nextNewMoon],
				] as const) {
					const viaIso = fn(date.isoDate);
					const viaTibetan = fn(date);
					if (!viaIso.isoDate.equals(viaTibetan.isoDate)) {
						bad.push(`${name} ${date.isoDate.toString()}`);
					}
				}
			}
		}
		expect(bad).toEqual([]);
	});

	it("chains without a round trip through .isoDate", () => {
		const first = nextFullMoon(iso("2026-01-01"));
		const second = nextFullMoon(first);
		expect(second.isoDate.toString()).toBe(nextFullMoon(first.isoDate).isoDate.toString());
		expect(Temporal.PlainDate.compare(second.isoDate, first.isoDate)).toBe(1);
	});

	/**
	 * The compile-time half of the narrowing, and the half that actually does the work: the runtime
	 * guard catches a JavaScript caller, but a TypeScript one should never reach it.
	 *
	 * `tsc` errors on an UNUSED `@ts-expect-error`, so this line fails `npm run typecheck` the moment
	 * a bare fields object starts type-checking again — which is what makes it a tripwire rather
	 * than a comment. Nothing here runs; the assertion is the directive.
	 */
	it("refuses a bare fields object at compile time", () => {
		const call = () =>
			// @ts-expect-error a bare { year, month, day } names no calendar — pass resolveDate(...)
			nextFullMoon({ year: 2026, month: 8, day: 12 });
		expect(call).toBeTypeOf("function");
	});

	it("still takes every Western form it took before", () => {
		const expected = nextFullMoon(iso("2026-01-01")).isoDate.toString();
		expect(nextFullMoon("2026-01-01" as unknown as Temporal.PlainDate).isoDate.toString()).toBe(
			expected,
		);
		expect(
			nextFullMoon(
				Temporal.PlainDateTime.from("2026-01-01T12:00") as unknown as Temporal.PlainDate,
			).isoDate.toString(),
		).toBe(expected);
	});

	// Narrowing the parameter to a RESOLVED date shrank this pair's error surface, and that is a
	// contract change rather than a detail: a TibetanDate cannot carry an out-of-range field or name
	// a skipped day, because the engine is what produced it. So both of those codes became
	// unreachable HERE and moved one call out, to resolveDate. Asserted so the narrower @throws is
	// checked rather than merely believed.
	it("refuses an unresolved object outright rather than field-checking it", () => {
		expect(codeOf(() => nextFullMoon({ year: 2153, month: 13, day: 1 } as never))).toBe(
			"TCT_INVALID_ARGUMENT",
		);
		expect(codeOf(() => nextFullMoon(null as never))).toBe("TCT_INVALID_ARGUMENT");
		expect(codeOf(() => nextFullMoon(42 as never))).toBe("TCT_INVALID_ARGUMENT");
	});

	it("leaves SkippedDayError to resolveDate, which is where the skipped day is now named", () => {
		let thrown: unknown;
		try {
			nextFullMoon(resolveDate({ year: 2150, month: 12, day: 29 }));
		} catch (error) {
			thrown = error;
		}
		expect(thrown).toBeInstanceOf(SkippedDayError);
	});
});

describe("addMonthsToDate's options bag", () => {
	// Found by the final review of the polyfill-probe close-out, 2026-09-23. The function had no
	// options guard at all, so `[t].flatMap(addMonthsToDate)` — index in the count slot, the array in
	// the options slot — returned a confident wrong date instead of the throw the README promises for
	// point-free use. An array is an object, so the shared guard had to refuse it by name.
	const codeOf = (run: () => unknown) => {
		try {
			run();
		} catch (error) {
			return (error as { code?: unknown }).code;
		}
		return "no throw";
	};
	const date = resolveDate({ year: 2153, month: 1, day: 1 });

	it("refuses the array a point-free flatMap passes", () => {
		// TypeScript refuses this outright; the test is for the JavaScript caller, who gets no warning.
		// @ts-expect-error -- the point-free form is the wrong call, which is what is under test
		expect(codeOf(() => [date, date].flatMap(addMonthsToDate))).toBe("TCT_INVALID_ARGUMENT");
	});

	it("refuses null with a code rather than a TypeError", () => {
		// @ts-expect-error -- null is the wrong kind of thing, which is what is under test
		expect(codeOf(() => addMonthsToDate(date, 1, null))).toBe("TCT_INVALID_ARGUMENT");
	});

	it("refuses an explicit null field rather than reading it as absent", () => {
		// Until 2026-09-23 the bag was read with `??`, so an explicit null became the default, losing the
		// validation CLAUDE.md's options-bag rule says a bag must keep. Only `undefined` means "not
		// given". The tradition's key was `config` then; it is `tradition` since 2026-09-24.
		// @ts-expect-error -- null is not a TraditionConfig, which is what is under test
		expect(codeOf(() => addMonthsToDate(date, 1, { tradition: null }))).toBe(
			"TCT_INVALID_TRADITION_CONFIG",
		);
		// @ts-expect-error -- null is not an overflow mode, which is what is under test
		expect(codeOf(() => addMonthsToDate(date, 1, { overflow: null }))).toBe("TCT_INVALID_ARGUMENT");
	});

	it("refuses the old `config` key rather than silently answering Phugpa's date", () => {
		// @ts-expect-error -- `config` is not a key of this bag since 2026-09-24, which is under test
		const error = thrownBy(() => addMonthsToDate(date, 0, { config: BHUTAN }));
		expect(error?.code).toBe("TCT_INVALID_ARGUMENT");
		expect(error?.message).toContain('"config"');
		expect(error?.message).toContain("{ overflow, tradition }");
	});

	it("refuses an unknown key through a variable, which TypeScript does not check", () => {
		// Excess-property checking applies to a literal only; `tsc` accepts this call, measured
		// 2026-09-24, so the runtime refusal is the only guard a TypeScript caller has here too.
		const options = { config: BHUTAN, overflow: "reject" as const };
		expect(codeOf(() => addMonthsToDate(date, 1, options))).toBe("TCT_INVALID_ARGUMENT");
	});

	it("refuses an unknown key whatever its value, and wherever it is inherited from", () => {
		expect(codeOf(() => addMonthsToDate(date, 1, { bogus: 1 } as never))).toBe(
			"TCT_INVALID_ARGUMENT",
		);
		expect(codeOf(() => addMonthsToDate(date, 1, { config: undefined } as never))).toBe(
			"TCT_INVALID_ARGUMENT",
		);
		// An inherited `config` was honoured before the rename; after it, only a refusal stops an
		// inherited key from quietly bringing Phugpa back.
		expect(codeOf(() => addMonthsToDate(date, 1, Object.create({ config: BHUTAN })))).toBe(
			"TCT_INVALID_ARGUMENT",
		);
	});

	it("still accepts an omitted bag and a plain one", () => {
		expect(addMonthsToDate(date, 1).month).toBe(2);
		expect(addMonthsToDate(date, 1, { overflow: "reject" }).month).toBe(2);
	});
});
