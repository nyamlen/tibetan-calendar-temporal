import { describe, expect, it } from "vitest";
import {
	attributesFor,
	calendarDayAttributesFor,
	elementalYogaFor,
	lunarDayAttributesFor,
	lunarMansionFor,
	monthAttributesFor,
} from "../src/astrology/index.js";
import {
	addDays,
	addMonths,
	addMonthsToDate,
	datesFor,
	daysBetween,
	daysInMonth,
	formatTibetanDate,
	formatTibetanMonth,
	isoToTibetan,
	julianDayFromIso,
	lunationFromMonth,
	monthNamesFor,
	monthsBetween,
	nextFullMoon,
	nextNewMoon,
	resolveDate,
	resolveMonth,
	tibetanDateExists,
	tibetanToIso,
} from "../src/index.js";
import { getObservances, observancesOn } from "../src/observances/index.js";
import { temporalKindOf, temporalTypeNameOf } from "../src/temporal-kind.js";

/**
 * The boundary tests **kind, not identity**, so a `PlainDate` from a second Temporal
 * implementation is a Western date here.
 *
 * ## What the fake is, and what it cannot prove
 *
 * These suites use a hand-built stand-in rather than a real second implementation, so that no
 * devDependency is added and the zero-dependency claim stays true through the lockfile. It carries
 * `Symbol.toStringTag: "Temporal.PlainDate"` — the spec-mandated brand the predicate reads — plus a
 * real `toString()` and real `year`/`month`/`day` fields, which is enough to drive normalisation
 * end to end. **The normalisation form under test is `Temporal.PlainDate.from(String(value))`**;
 * the fields are carried so that a future change to `from(value)` is exercised by the same fake
 * rather than silently untested, and so that the reject direction has fields to be read structurally
 * if the guard ever stops firing — which is the bug direction A describes.
 *
 * **The limit, stated because a fake that proves everything is a fake nobody checked:** this proves
 * the predicate and the normalisation path, not a real second implementation. That proof is the
 * spike, reproducible from `plans/foreign-temporal-evidence/` outside this repository, against
 * `temporal-polyfill/implementation`.
 */
function foreignPlainDate(iso: string): Temporal.PlainDate {
	const [year, month, day] = iso.split("-").map(Number) as [number, number, number];
	return {
		[Symbol.toStringTag]: "Temporal.PlainDate",
		calendarId: "iso8601",
		year,
		month,
		day,
		toString: () => iso,
	} as unknown as Temporal.PlainDate;
}

function foreign(tag: string, iso: string): Temporal.PlainDate {
	return {
		[Symbol.toStringTag]: tag,
		toString: () => iso,
		toPlainDate: () => foreignPlainDate(iso.slice(0, 10)),
	} as unknown as Temporal.PlainDate;
}

const ISO = "2024-07-09";
const ISO2 = "2024-07-19";
const FOREIGN = foreignPlainDate(ISO);
const FOREIGN2 = foreignPlainDate(ISO2);
const NATIVE = Temporal.PlainDate.from(ISO);
const NATIVE2 = Temporal.PlainDate.from(ISO2);

function codeOf(run: () => unknown): string {
	try {
		const value = run();
		return `no throw: ${String(value)}`;
	} catch (error) {
		return (error as { code?: string }).code ?? `uncoded ${(error as Error).name}`;
	}
}

describe("temporalKindOf", () => {
	it("reads the spec brand, so identity is not what decides", () => {
		expect(temporalKindOf(NATIVE)).toBe("PlainDate");
		expect(temporalKindOf(FOREIGN)).toBe("PlainDate");
		expect(FOREIGN instanceof Temporal.PlainDate).toBe(false);
	});

	it("separates the three day-naming kinds from each other", () => {
		expect(temporalKindOf(Temporal.PlainDateTime.from(`${ISO}T12:00`))).toBe("PlainDateTime");
		expect(temporalKindOf(Temporal.ZonedDateTime.from(`${ISO}T12:00[UTC]`))).toBe("ZonedDateTime");
		expect(temporalKindOf(foreign("Temporal.PlainDateTime", `${ISO}T12:00`))).toBe("PlainDateTime");
	});

	it("does not mistake a bare fields object for a Western date", () => {
		expect(temporalKindOf({ year: 2151, month: 6, day: 4 })).toBeNull();
		expect(temporalKindOf(null)).toBeNull();
		expect(temporalKindOf(ISO)).toBeNull();
		expect(temporalKindOf(17)).toBeNull();
	});

	it("names a Temporal type outside the three rather than answering a kind", () => {
		expect(temporalKindOf(Temporal.Instant.from(`${ISO}T00:00Z`))).toBeNull();
		expect(temporalTypeNameOf(Temporal.Instant.from(`${ISO}T00:00Z`))).toBe("Instant");
		expect(temporalTypeNameOf(Temporal.Duration.from({ days: 1 }))).toBe("Duration");
		expect(temporalKindOf(Temporal.PlainYearMonth.from("2024-07"))).toBeNull();
		expect(temporalTypeNameOf({ year: 1 })).toBeNull();
	});

	it("converts a revoked Proxy into a coded error rather than a bare TypeError", () => {
		const { proxy, revoke } = Proxy.revocable({}, {});
		revoke();
		expect(codeOf(() => temporalKindOf(proxy))).toBe("TCT_INVALID_ARGUMENT");
	});

	it("reads a tag-carrying null-prototype object without throwing an uncoded TypeError", () => {
		const spoof = Object.assign(Object.create(null), {
			[Symbol.toStringTag]: "Temporal.PlainDate",
		});
		expect(spoof.constructor).toBeUndefined();
		expect(temporalKindOf(spoof)).toBe("PlainDate");
	});
});

describe("direction B: a foreign PlainDate is a Western date", () => {
	it("isoToTibetan answers, and answers what the native date answers", () => {
		const native = isoToTibetan(NATIVE);
		const foreignAnswer = isoToTibetan(FOREIGN);
		expect(`${foreignAnswer.year}-${foreignAnswer.monthCode}-${foreignAnswer.day}`).toBe(
			"2151-M06L-4",
		);
		expect(foreignAnswer.isoDate.toString()).toBe(native.isoDate.toString());
	});

	it("agrees with the native date at every Western entry point", () => {
		const cases: [string, (date: Temporal.PlainDate, second: Temporal.PlainDate) => unknown][] = [
			["julianDayFromIso", (d) => julianDayFromIso(d)],
			["isoToTibetan", (d) => isoToTibetan(d).isoDate.toString()],
			["nextFullMoon", (d) => nextFullMoon(d).isoDate.toString()],
			["nextNewMoon", (d) => nextNewMoon(d).isoDate.toString()],
			["observancesOn", (d) => observancesOn(d).length],
			["getObservances", (d, s) => getObservances(d, s).length],
			["attributesFor", (d) => attributesFor(d).calendarDay.element],
			["calendarDayAttributesFor", (d) => calendarDayAttributesFor(d).element],
			["elementalYogaFor", (d) => elementalYogaFor(d).englishName],
			["lunarMansionFor", (d) => lunarMansionFor(d).index],
		];
		const disagree = cases.filter(
			([, call]) =>
				JSON.stringify(call(NATIVE, NATIVE2)) !== JSON.stringify(call(FOREIGN, FOREIGN2)),
		);
		expect(disagree.map(([name]) => name)).toEqual([]);
	});

	it("accepts a foreign PlainDateTime and ZonedDateTime, narrowing each to its day", () => {
		expect(julianDayFromIso(foreign("Temporal.PlainDateTime", `${ISO}T13:45:00`))).toBe(
			julianDayFromIso(NATIVE),
		);
		expect(julianDayFromIso(foreign("Temporal.ZonedDateTime", `${ISO}T13:45:00+00:00[UTC]`))).toBe(
			julianDayFromIso(NATIVE),
		);
	});
});

describe("direction A: a foreign PlainDate is not a Tibetan date", () => {
	it("refuses it with a code at every Tibetan entry point", () => {
		const month = { year: 2151, month: 6, isLeapMonth: true };
		const cases: [string, () => unknown][] = [
			["tibetanToIso", () => tibetanToIso(FOREIGN as never)],
			["tibetanDateExists", () => tibetanDateExists(FOREIGN as never)],
			["formatTibetanDate", () => formatTibetanDate(FOREIGN as never)],
			["formatTibetanMonth", () => formatTibetanMonth(FOREIGN as never)],
			["daysInMonth", () => daysInMonth(FOREIGN as never)],
			["datesFor", () => datesFor(FOREIGN as never)],
			["resolveDate", () => resolveDate(FOREIGN as never)],
			["resolveMonth", () => resolveMonth(FOREIGN as never)],
			["monthNamesFor", () => monthNamesFor(FOREIGN as never)],
			["lunationFromMonth", () => lunationFromMonth(FOREIGN as never)],
			["addDays", () => addDays(FOREIGN as never, 1)],
			["addMonths", () => addMonths(FOREIGN as never, 1)],
			["addMonthsToDate", () => addMonthsToDate(FOREIGN as never, 1)],
			["daysBetween", () => daysBetween(FOREIGN as never, FOREIGN2 as never)],
			["monthsBetween", () => monthsBetween(FOREIGN as never, month as never)],
			["lunarDayAttributesFor", () => lunarDayAttributesFor(FOREIGN as never)],
			["monthAttributesFor", () => monthAttributesFor(FOREIGN as never)],
		];
		const wrong = cases
			.map(([name, run]) => [name, codeOf(run)] as const)
			.filter(([, code]) => code !== "TCT_INVALID_ARGUMENT");
		expect(wrong).toEqual([]);
	});

	it("tibetanToIso no longer reads ISO 2024 as royal-era 2024", () => {
		// The silently wrong answer this replaces: 1897-09-05, a confident date 127 years out.
		expect(codeOf(() => tibetanToIso(FOREIGN as never))).toBe("TCT_INVALID_ARGUMENT");
	});

	it("gives advice that works: the message names isoToTibetan, and isoToTibetan answers", () => {
		let message = "";
		try {
			tibetanToIso(FOREIGN as never);
		} catch (error) {
			message = (error as Error).message;
		}
		expect(message).toContain("isoToTibetan(date)");
		// The round trip is the single end-to-end check that both directions were fixed as one:
		// before this change the guard's own advice also failed for a foreign date.
		expect(isoToTibetan(FOREIGN).monthCode).toBe("M06L");
	});
});

describe("non-ISO calendars", () => {
	it("refuses with a code rather than Temporal's uncoded Mismatched calendars", () => {
		const hebrew = Temporal.PlainDate.from(ISO).withCalendar("hebrew");
		expect(codeOf(() => julianDayFromIso(hebrew))).toBe("TCT_INVALID_ARGUMENT");
		expect(codeOf(() => isoToTibetan(hebrew))).toBe("TCT_INVALID_ARGUMENT");
	});

	it("names the conversion that preserves the day", () => {
		const hebrew = Temporal.PlainDate.from(ISO).withCalendar("hebrew");
		let message = "";
		try {
			julianDayFromIso(hebrew);
		} catch (error) {
			message = (error as Error).message;
		}
		expect(message).toContain('withCalendar("iso8601")');
		expect(julianDayFromIso(hebrew.withCalendar("iso8601"))).toBe(julianDayFromIso(NATIVE));
	});

	it("does not read a non-ISO date through its own fields, which is 3,760 years wrong", () => {
		const hebrew = Temporal.PlainDate.from(ISO).withCalendar("hebrew");
		expect(hebrew.year).toBe(5784);
		// Normalising via from({ year, month, day }) would land in 5784 CE. The ISO day is what
		// toString() and withCalendar("iso8601") both preserve.
		expect(hebrew.withCalendar("iso8601").toString()).toBe(ISO);
	});
});

describe("the union discriminator", () => {
	it("accepts a resolved TibetanDate whose isoDate is foreign", () => {
		const resolved = { ...resolveDate({ year: 2151, month: 6, day: 4, isLeapMonth: true }) };
		const rebuilt = { ...resolved, isoDate: foreignPlainDate(resolved.isoDate.toString()) };
		expect(nextFullMoon(rebuilt as never).isoDate.toString()).toBe(
			nextFullMoon(resolved as never).isoDate.toString(),
		);
		expect(attributesFor(rebuilt as never).calendarDay.element).toBe(
			attributesFor(resolved as never).calendarDay.element,
		);
	});

	it("names every shape it accepts, in both of the two functions that share it", () => {
		const loose = { year: 2151, month: 6, day: 4 };
		for (const call of [() => nextFullMoon(loose as never), () => attributesFor(loose as never)]) {
			let message = "";
			try {
				call();
			} catch (error) {
				message = (error as Error).message;
			}
			// Each copy used to misdescribe its own contract, in opposite directions: navigation's
			// named two of the four shapes it accepts, astrology's never mentioned the resolved
			// TibetanDate it takes.
			for (const shape of ["PlainDate", "ISO string", "PlainDateTime", "ZonedDateTime"]) {
				expect(message).toContain(shape);
			}
			expect(message).toContain("resolveDate");
		}
	});
});

describe("a spoofed brand", () => {
	it("throws a coded error rather than computing, which is why spoofing is survivable", () => {
		// The decision record's claim: over-rejecting a disguised object is harmless on the reject
		// side, and on the accept side normalisation fails and throws a code. This is that second
		// half — the tag says PlainDate, nothing else does, and no date comes out.
		const spoof = {
			[Symbol.toStringTag]: "Temporal.PlainDate",
			year: 1,
			month: 1,
			day: 1,
			toString: () => "not a date at all",
		} as unknown as Temporal.PlainDate;
		expect(temporalKindOf(spoof)).toBe("PlainDate");
		expect(codeOf(() => julianDayFromIso(spoof))).toBe("TCT_INVALID_ARGUMENT");
		expect(codeOf(() => isoToTibetan(spoof))).toBe("TCT_INVALID_ARGUMENT");
	});

	it("is refused on the Tibetan side, where over-rejecting costs nothing", () => {
		const spoof = {
			[Symbol.toStringTag]: "Temporal.PlainDate",
			year: 2151,
			month: 6,
			day: 4,
		} as unknown as Temporal.PlainDate;
		expect(codeOf(() => tibetanToIso(spoof as never))).toBe("TCT_INVALID_ARGUMENT");
	});
});
