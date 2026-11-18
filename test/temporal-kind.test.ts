import { describe, expect, it } from "vitest";
import {
	attributesFor,
	calendarDayAttributesFor,
	elementalYogaFor,
	lunarDayAttributesFor,
	lunarMansionFor,
	monthAttributesFor,
} from "../src/astrology/index.js";
import { asPlainDate } from "../src/computation/conversion.js";
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
import { EXAMPLE_OBSERVANCES, getObservances, observancesOn } from "../src/observances/index.js";
import { temporalKindOf, temporalTypeNameOf } from "../src/temporal-kind.js";
import { thrownBy } from "./support/thrown.js";

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

	it("converts a throwing toStringTag getter too, without claiming it was a Proxy", () => {
		// Boundary review, 2026-09-23, minor 4: the message said "a revoked Proxy, most likely" for
		// every failed read, and this is a second way to reach it that is no Proxy at all.
		const value = {
			get [Symbol.toStringTag](): string {
				throw new Error("unreadable");
			},
		};
		expect(codeOf(() => temporalTypeNameOf(value))).toBe("TCT_INVALID_ARGUMENT");
		let message = "";
		try {
			temporalTypeNameOf(value);
		} catch (error) {
			message = (error as Error).message;
		}
		expect(message).not.toContain("Proxy");
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
			["observancesOn", (d) => observancesOn(d, EXAMPLE_OBSERVANCES).length],
			["getObservances", (d, s) => getObservances(d, s, EXAMPLE_OBSERVANCES).length],
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

	it("keeps the calendar advice for an ISO string carrying a non-ISO calendar annotation", () => {
		// The string parses, so the refusal comes from the calendar check inside the parse's `try`;
		// it must pass through rather than be rewrapped as an unparseable string. The rewrap appends
		// the original message, so only the message's start tells the two paths apart.
		const call = () => isoToTibetan(`${ISO}[u-ca=hebrew]` as never);
		expect(codeOf(call)).toBe("TCT_INVALID_ARGUMENT");
		expect(thrownBy(call)?.message).toMatch(
			/^received a Temporal\.PlainDate in the hebrew calendar/,
		);
	});

	it("names a Temporal type that carries no calendar day rather than calling it an object", () => {
		const call = () => isoToTibetan(Temporal.PlainTime.from("12:00") as never);
		expect(codeOf(call)).toBe("TCT_INVALID_ARGUMENT");
		expect(thrownBy(call)?.message).toContain("a Temporal.PlainTime, which names no calendar day");
	});

	it("does not read a non-ISO date through its own fields, which is 3,760 years wrong", () => {
		const hebrew = Temporal.PlainDate.from(ISO).withCalendar("hebrew");
		expect(hebrew.year).toBe(5784);
		// Normalising via from({ year, month, day }) would land in 5784 CE. The ISO day is what
		// toString() and withCalendar("iso8601") both preserve.
		expect(hebrew.withCalendar("iso8601").toString()).toBe(ISO);
	});
});

describe("a native subclass is read from its slots", () => {
	// A subclass of this realm's PlainDate passes every brand check, so before the copy each later
	// read of it — `since` in julianDayFromIso, `year` in getObservances' span cap, `calendarId` in the
	// ISO check — was the caller's answer rather than the date's.
	class LyingSince extends Temporal.PlainDate {
		override since(): Temporal.Duration {
			return Temporal.Duration.from({ days: 0 });
		}
	}
	class LyingCalendar extends Temporal.PlainDate {
		override get calendarId(): string {
			return "iso8601";
		}
	}

	it("answers for the date, not for an overridden since", () => {
		const lying = isoToTibetan(new LyingSince(2024, 7, 9));
		const honest = isoToTibetan(NATIVE);
		expect([lying.year, lying.monthCode, lying.day, lying.isoDate.toString()]).toEqual([
			honest.year,
			honest.monthCode,
			honest.day,
			ISO,
		]);
		expect([honest.year, honest.monthCode]).toEqual([2151, "M06L"]);
	});

	it("refuses a non-ISO date whose calendarId getter claims ISO", () => {
		expect(codeOf(() => isoToTibetan(new LyingCalendar(2024, 7, 9, "hebrew")))).toBe(
			"TCT_INVALID_ARGUMENT",
		);
	});

	it("hands the engine a plain Temporal.PlainDate, never the caller's subclass", () => {
		// Compared as a boolean: Vitest's diff of two prototypes calls a Temporal method on one.
		const prototype = Object.getPrototypeOf(asPlainDate(new LyingSince(2024, 7, 9)));
		expect(prototype === Temporal.PlainDate.prototype).toBe(true);
	});

	// Copying alone is not enough: `Temporal.PlainDate.from` on a forwarding Proxy, which passes
	// `instanceof`, reads its fields rather than its slots, and a Tishrei date's fields read as ISO
	// 5785-01-03. The calendar must be read through the intrinsic getter first.
	it("refuses a forwarding Proxy around a non-ISO date rather than reading its fields", () => {
		const tishrei = Temporal.PlainDate.from("2024-10-05").withCalendar("hebrew");
		const forwarding = new Proxy(tishrei, {
			get: (target, key) => {
				const value = Reflect.get(target, key, target);
				return typeof value === "function" ? value.bind(target) : value;
			},
		});
		expect(codeOf(() => isoToTibetan(forwarding))).toBe("TCT_INVALID_ARGUMENT");
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

describe("a brand with nothing behind it", () => {
	it("refuses a PlainDateTime or ZonedDateTime tag with no toPlainDate, with a code", () => {
		// The one hole a code review found in the "spoofing is survivable" argument: the narrowing
		// call was unguarded, so these two threw an uncoded TypeError at the very boundary this file
		// exists to convert uncoded TypeErrors into coded errors.
		for (const tag of ["Temporal.PlainDateTime", "Temporal.ZonedDateTime"]) {
			const spoof = { [Symbol.toStringTag]: tag } as unknown as Temporal.PlainDate;
			expect(codeOf(() => julianDayFromIso(spoof))).toBe("TCT_INVALID_ARGUMENT");
		}
	});

	it("refuses one whose toPlainDate throws, rather than letting it escape", () => {
		const spoof = {
			[Symbol.toStringTag]: "Temporal.ZonedDateTime",
			toPlainDate: () => {
				throw new TypeError("no");
			},
		} as unknown as Temporal.PlainDate;
		expect(codeOf(() => julianDayFromIso(spoof))).toBe("TCT_INVALID_ARGUMENT");
	});

	it("refuses one whose toPlainDate returns something that is not a date", () => {
		const spoof = {
			[Symbol.toStringTag]: "Temporal.PlainDateTime",
			toPlainDate: () => 17,
		} as unknown as Temporal.PlainDate;
		expect(codeOf(() => julianDayFromIso(spoof))).toBe("TCT_INVALID_ARGUMENT");
	});
});

describe("describing what was received", () => {
	it("names a Date, the likeliest wrong argument in a package that forbids Date", () => {
		// `Temporal only. Never Date.` is rule one here, so `new Date()` is the mistake a consumer
		// actually makes. Merging the value-describers briefly rendered it "an object", which hides
		// what they passed and then offers them a paragraph about { year, month, day }.
		for (const call of [
			() => julianDayFromIso(new Date() as unknown as Temporal.PlainDate),
			() => nextFullMoon(new Date() as unknown as Temporal.PlainDate),
		]) {
			let message = "";
			try {
				call();
			} catch (error) {
				message = (error as Error).message;
			}
			expect(message).toMatch(/received Date/);
		}
	});

	it("still says 'an object' for a plain one, where naming Object would say less", () => {
		let message = "";
		try {
			julianDayFromIso({ year: 2024, month: 7, day: 9 } as unknown as Temporal.PlainDate);
		} catch (error) {
			message = (error as Error).message;
		}
		expect(message).toContain("an object");
	});

	it("explains the bare-fields refusal only to a plain object, through both guards", () => {
		// Boundary review, 2026-09-23, minor 2: asWesternDay appended the paragraph unconditionally
		// and asPlainDate for anything typeof "object", so null, a Date and an array were all told
		// about { year, month, day } they had not passed.
		const messageOf = (run: () => unknown): string => {
			try {
				run();
			} catch (error) {
				expect(codeOf(() => run())).toBe("TCT_INVALID_ARGUMENT");
				return (error as Error).message;
			}
			throw new Error("expected a throw");
		};
		const guards = [
			(v: unknown) => julianDayFromIso(v as Temporal.PlainDate),
			(v: unknown) => nextFullMoon(v as Temporal.PlainDate),
		];
		for (const guard of guards) {
			for (const value of [null, new Date(), [2024, 7, 9], 42]) {
				expect(messageOf(() => guard(value))).not.toContain("{ year, month, day }");
			}
			for (const value of [{ year: 2024, month: 7, day: 9 }, Object.create(null)]) {
				expect(messageOf(() => guard(value))).toContain("{ year, month, day }");
			}
		}
	});
});

describe("the two merged copies' accept-sets", () => {
	it("refuses a hand-built isoDate that is not a PlainDate, in both of them", () => {
		// `isoOf` accepted any object with an `isoDate` KEY and handed the value to asPlainDate, so
		// ./astrology took these two and navigation refused them. Unifying on the narrower set is a
		// behaviour change at a public export, recorded in
		// docs/decisions/2026-09-23-brand-not-identity.md; this pins it so that "both refuse" cannot
		// quietly become "one refuses" again.
		const cases = [
			{ isoDate: "2024-07-09" },
			{ isoDate: Temporal.PlainDateTime.from("2024-07-09T12:00") },
		];
		const accepted: string[] = [];
		for (const value of cases) {
			for (const [name, call] of [
				["attributesFor", () => attributesFor(value as never)],
				["nextFullMoon", () => nextFullMoon(value as never)],
			] as const) {
				if (codeOf(call) !== "TCT_INVALID_ARGUMENT") {
					accepted.push(`${name}(${String(value.isoDate)})`);
				}
			}
		}
		expect(accepted).toEqual([]);
	});

	it("still accepts a resolved TibetanDate, which is what the parameter is for", () => {
		const resolved = resolveDate({ year: 2151, month: 6, day: 4, isLeapMonth: true });
		expect(nextFullMoon(resolved).isoDate.toString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		expect(typeof attributesFor(resolved).calendarDay.element).toBe("string");
	});
});

describe("a Temporal type that names no calendar day, where a Tibetan month or date belongs", () => {
	const instances: [string, unknown][] = [
		["PlainYearMonth", Temporal.PlainYearMonth.from("2026-03")],
		["PlainMonthDay", Temporal.PlainMonthDay.from("03-05")],
		["PlainTime", Temporal.PlainTime.from("10:30")],
		["Instant", Temporal.Instant.from("2026-03-05T10:30:00Z")],
		["Duration", Temporal.Duration.from({ days: 3 })],
	];
	// A hand-built stand-in for a second implementation's instance, carrying the fields a Tibetan
	// month has: it is what a `PlainYearMonth` from another realm looks like to this package.
	const foreignYearMonth = {
		[Symbol.toStringTag]: "Temporal.PlainYearMonth",
		year: 2026,
		month: 3,
	};
	const monthTier: [string, (v: never) => unknown][] = [
		["daysInMonth", (v) => daysInMonth(v)],
		["resolveMonth", (v) => resolveMonth(v)],
		["datesFor", (v) => datesFor(v)],
		["formatTibetanMonth", (v) => formatTibetanMonth(v)],
		["lunationFromMonth", (v) => lunationFromMonth(v)],
		["monthNamesFor", (v) => monthNamesFor(v)],
		["addMonths", (v) => addMonths(v, 0)],
		["monthsBetween(from)", (v) => monthsBetween(v, { year: 2153, month: 1 })],
		["monthsBetween(to)", (v) => monthsBetween({ year: 2153, month: 1 }, v)],
		["monthAttributesFor", (v) => monthAttributesFor(v)],
	];
	const dateTier: [string, (v: never) => unknown][] = [
		["tibetanToIso", (v) => tibetanToIso(v)],
		["tibetanDateExists", (v) => tibetanDateExists(v)],
		["formatTibetanDate", (v) => formatTibetanDate(v)],
		["resolveDate", (v) => resolveDate(v)],
		["addDays", (v) => addDays(v, 1)],
		["addMonthsToDate", (v) => addMonthsToDate(v, 1)],
	];

	it.each(instances)(
		"a real %s is refused at every month- and date-tier export",
		(_kind, value) => {
			const wrong = [...monthTier, ...dateTier]
				.map(([name, run]) => [name, codeOf(() => run(value as never))] as const)
				.filter(([, code]) => code !== "TCT_INVALID_ARGUMENT");
			expect(wrong).toEqual([]);
		},
	);

	it("a second implementation's PlainYearMonth is refused too, by its brand", () => {
		const wrong = monthTier
			.map(([name, run]) => [name, codeOf(() => run(foreignYearMonth as never))] as const)
			.filter(([, code]) => code !== "TCT_INVALID_ARGUMENT");
		expect(wrong).toEqual([]);
	});

	it("names the type received and does not call it a Western calendar day", () => {
		const message = thrownBy(() => daysInMonth(instances[0]?.[1] as never))?.message ?? "";
		expect(message).toContain("Temporal.PlainYearMonth");
		expect(message).not.toContain("names a Western calendar day");
	});

	it("still names a PlainDate as a Western calendar day, with the advice that works", () => {
		const message = thrownBy(() => tibetanToIso(NATIVE as never))?.message ?? "";
		expect(message).toContain("names a Western calendar day");
		expect(message).toContain("isoToTibetan(date)");
	});

	it("a plain { year, month } object is still a Tibetan month", () => {
		expect(daysInMonth({ year: 2153, month: 1 })).toBeGreaterThan(0);
	});
});

describe("a forged brand and a hostile throw, at the normalising boundary", () => {
	const revoked = (() => {
		const { proxy, revoke } = Proxy.revocable({}, {});
		revoke();
		return proxy;
	})();
	const throwsRevoked = () => {
		throw revoked;
	};

	// `instanceof` is true for an object built on the prototype, and the brand check is native: the
	// first read of `calendarId` threw an uncoded TypeError from every Western-date export.
	it("a forged PlainDate is refused with a code at every Western-date export", () => {
		const forged = Object.create(Temporal.PlainDate.prototype) as Temporal.PlainDate;
		const cases: [string, () => unknown][] = [
			["isoToTibetan", () => isoToTibetan(forged)],
			["julianDayFromIso", () => julianDayFromIso(forged)],
			["nextFullMoon", () => nextFullMoon(forged)],
			["attributesFor", () => attributesFor(forged)],
		];
		const wrong = cases
			.map(([name, run]) => [name, thrownBy(run)?.code] as const)
			.filter(([, code]) => code !== "TCT_INVALID_ARGUMENT");
		expect(wrong).toEqual([]);
	});

	it("a toPlainDate that throws a revoked Proxy is refused with a code", () => {
		const spoof = {
			[Symbol.toStringTag]: "Temporal.ZonedDateTime",
			toPlainDate: throwsRevoked,
		} as unknown as Temporal.PlainDate;
		expect(thrownBy(() => julianDayFromIso(spoof))?.code).toBe("TCT_INVALID_ARGUMENT");
	});

	it("a PlainDate-branded object whose toString throws a revoked Proxy is refused with a code", () => {
		const spoof = {
			[Symbol.toStringTag]: "Temporal.PlainDate",
			toString: throwsRevoked,
		} as unknown as Temporal.PlainDate;
		expect(thrownBy(() => julianDayFromIso(spoof))?.code).toBe("TCT_INVALID_ARGUMENT");
	});

	it("an Error whose message getter throws is refused with a code", () => {
		const hostile = new Error("x");
		Object.defineProperty(hostile, "message", { get: throwsRevoked });
		const spoof = {
			[Symbol.toStringTag]: "Temporal.ZonedDateTime",
			toPlainDate() {
				throw hostile;
			},
		} as unknown as Temporal.PlainDate;
		expect(thrownBy(() => julianDayFromIso(spoof))?.code).toBe("TCT_INVALID_ARGUMENT");
	});
});

describe("the global Temporal deleted after import", () => {
	it("reports TCT_MISSING_TEMPORAL for an ISO string, as it does for a PlainDate", () => {
		const plain = Temporal.PlainDate.from(ISO);
		const original = Object.getOwnPropertyDescriptor(globalThis, "Temporal");
		let fromString: (Error & { code?: string }) | undefined;
		let fromPlain: (Error & { code?: string }) | undefined;
		try {
			Reflect.deleteProperty(globalThis, "Temporal");
			fromString = thrownBy(() => isoToTibetan(ISO as never));
			fromPlain = thrownBy(() => isoToTibetan(plain));
		} finally {
			if (original) Object.defineProperty(globalThis, "Temporal", original);
		}
		expect(fromPlain?.code).toBe("TCT_MISSING_TEMPORAL");
		expect(fromString?.code).toBe("TCT_MISSING_TEMPORAL");
		expect(fromString).not.toBeInstanceOf(RangeError);
	});
});
