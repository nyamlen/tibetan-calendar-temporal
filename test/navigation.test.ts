import { describe, expect, it } from "vitest";
import { isoToTibetan, losarFor } from "../src/computation/conversion.js";
import { monthsFor } from "../src/months.js";
import {
	addMonths,
	lunationFromMonth,
	monthFromLunation,
	monthsBetween,
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
