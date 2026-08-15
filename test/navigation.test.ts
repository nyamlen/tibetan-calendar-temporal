import { describe, expect, it } from "vitest";
import {
	isoToTibetan,
	losarFor,
	tibetanDateExists,
	tibetanToIso,
} from "../src/computation/conversion.js";
import { monthsFor } from "../src/months.js";
import {
	addDays,
	addMonths,
	daysBetween,
	lunationFromMonth,
	monthFromLunation,
	monthsBetween,
	nextFullMoon,
	nextNewMoon,
} from "../src/navigation.js";
import { PHUGPA_HENNING } from "../src/traditions/phugpa.js";

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
		expect(m.yearName).toEqual(losarFor(2151).yearName);
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

	it("accepts a TibetanDate, ignoring the day", () => {
		const date = isoToTibetan(iso("2026-08-12"));
		expect(addMonths(date, 1).lunation).toBe(date.lunation + 1);
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
			expect((error as Error).message).toContain("monthsBetween");
			expect((error as Error).message).toContain("to");
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
			expect((error as Error).message).toContain("daysBetween");
			expect((error as Error).message).toContain("to");
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
	 * full moon of 2153 M11 on the day numbered **14**. Measured over 2500 lunations, 56 of them —
	 * about one in forty-five — put the full moon on 14 rather than 15, and 48 put the new moon on 29
	 * rather than 30. A consumer testing the number is silently wrong that often.
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

	it("puts the new moon on the second of a doubled 30, not the leap day", () => {
		let cursor = iso("2020-01-01");
		for (let i = 0; i < 80; i++) {
			const moon = nextNewMoon(cursor);
			if (moon.isDoubledDay) expect(moon.isLeapDay).toBe(false);
			cursor = moon.isoDate;
		}
	});

	it.each([
		["a bare fields object", () => nextFullMoon({ year: 2026, month: 8, day: 12 } as never)],
		["null", () => nextNewMoon(null as never)],
		["a number", () => nextFullMoon(42 as never)],
	])("rejects %s", (_label, call) => {
		expect(codeOf(call)).toBe("TCT_INVALID_ARGUMENT");
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
