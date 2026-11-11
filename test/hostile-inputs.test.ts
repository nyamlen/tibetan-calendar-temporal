import { describe, expect, it } from "vitest";
import {
	attributesFor,
	calendarDayAttributesFor,
	elementalYoga,
	elementalYogaFor,
	lunarDayAttributesFor,
	lunarMansionFor,
	monthAttributesFor,
	yearAttributesFor,
} from "../src/astrology/index.js";
import {
	addDays,
	addMonths,
	addMonthsToDate,
	asTibetanWeekday,
	datesFor,
	daysBetween,
	daysInMonth,
	formatTibetanDate,
	formatTibetanMonth,
	hasLeapMonth,
	isoFromJulianDay,
	isoToTibetan,
	julianDayFromIso,
	leapMonthNumberFor,
	losarFor,
	lunationFromMonth,
	monthFromLunation,
	monthNamesFor,
	monthsBetween,
	monthsFor,
	monthsInYear,
	nextFullMoon,
	nextNewMoon,
	parseTibetanDate,
	parseTibetanMonth,
	rabjungFor,
	resolveDate,
	resolveMonth,
	tibetanDateExists,
	tibetanToIso,
	tibetanWeekday,
	weekdayNameFor,
	yearNameFor,
} from "../src/index.js";
import { EXAMPLE_OBSERVANCES, getObservances, observancesOn } from "../src/observances/index.js";
import { thrownBy } from "./support/thrown.js";

// Part B of the tradition-parameter plan, 2026-09-24. The README promises that every failure
// carries a code, and a value interpolated straight into a message broke that for any input a
// template literal cannot render: a Symbol throws, and so does an object whose `toString` does. A
// bigint rendered as its digits and so could not be told from a number or a string. This table
// enumerates **every runtime export of all three barrels** that takes a scalar, a config or a bag —
// not the list a grep for `received ${` produced, which missed the function-name subjects.
//
// Every call must either answer or throw a coded error. "Answer" is allowed only where the row says
// so: a bag with no prototype is an empty bag, and `tibetanDateExists` reports a bad field as a date
// that does not exist, by its allowlist.
//
// Left out on purpose: a Proxy passed **as a config** — revoked, or with any one trap that throws —
// escapes uncoded from the config validators, which read it field by field. That is the caller's
// own code throwing, which the README says may reach them unchanged — decided 2026-09-24, recorded
// in docs/decisions/2026-08-12-error-codes-not-classes.md — so every Proxy is left out of the config
// rows. Argument and bag guards that already wrap a read do convert one, and are held to it here.

const throwing = () => {
	throw new Error("trap");
};

const revokedProxy = (() => {
	const { proxy, revoke } = Proxy.revocable({}, {});
	revoke();
	return proxy;
})();

const HOSTILE: readonly (readonly [string, unknown])[] = [
	["Symbol", Symbol("x")],
	["bigint", 10n],
	["numeric string", "10"],
	[
		"throwing toString",
		{
			toString() {
				throw new Error("toString");
			},
		},
	],
	["null-prototype object", Object.create(null)],
	["revoked Proxy", revokedProxy],
	["Symbol-named constructor", { constructor: { name: Symbol("x") } }],
	// One throwing trap each. A revoked Proxy throws at the first trap any code reaches, which is
	// usually a guard that already catches it — so on its own it hid a message helper that did not.
	...(["get", "has", "ownKeys", "getOwnPropertyDescriptor", "getPrototypeOf"] as const).map(
		(trap) => [`Proxy throwing from ${trap}`, new Proxy({}, { [trap]: throwing })] as const,
	),
];

const ISO = Temporal.PlainDate.from("2026-02-18");
const LOSAR = { year: 2153, month: 1, day: 1 };
const MONTH = { year: 2153, month: 1 };
const RULE = EXAMPLE_OBSERVANCES.rules[0];
const LEVEL_CONFIG = EXAMPLE_OBSERVANCES;

type Call = (value: unknown) => unknown;
type Row = readonly [shape: string, call: Call, answers?: readonly string[]];

// `as never` throughout: every call here is one TypeScript would refuse, which is the point — these
// are the calls a plain-JavaScript consumer can make.
const v = (value: unknown) => value as never;

const SCALAR: readonly Row[] = [
	["isoFromJulianDay(julianDay)", (x) => isoFromJulianDay(v(x))],
	["isoToTibetan(date)", (x) => isoToTibetan(v(x))],
	["julianDayFromIso(date)", (x) => julianDayFromIso(v(x))],
	["losarFor(year)", (x) => losarFor(v(x))],
	["tibetanWeekday(julianDay)", (x) => tibetanWeekday(v(x))],
	["rabjungFor(year)", (x) => rabjungFor(v(x))],
	["yearNameFor(year)", (x) => yearNameFor(v(x))],
	["weekdayNameFor(weekday)", (x) => weekdayNameFor(v(x))],
	["asTibetanWeekday(value)", (x) => asTibetanWeekday(v(x))],
	["hasLeapMonth(year)", (x) => hasLeapMonth(v(x))],
	["leapMonthNumberFor(year)", (x) => leapMonthNumberFor(v(x))],
	["monthsFor(year)", (x) => monthsFor(v(x))],
	["monthsInYear(year)", (x) => monthsInYear(v(x))],
	["monthFromLunation(lunation)", (x) => monthFromLunation(v(x))],
	["addDays(fields, days)", (x) => addDays(LOSAR, v(x))],
	["addMonths(monthFields, months)", (x) => addMonths(MONTH, v(x))],
	["addMonthsToDate(fields, months)", (x) => addMonthsToDate(LOSAR, v(x))],
	["nextFullMoon(date)", (x) => nextFullMoon(v(x))],
	["nextNewMoon(date)", (x) => nextNewMoon(v(x))],
	["parseTibetanDate(text)", (x) => parseTibetanDate(v(x))],
	["parseTibetanMonth(text)", (x) => parseTibetanMonth(v(x))],
	["yearAttributesFor(year)", (x) => yearAttributesFor(v(x))],
	["calendarDayAttributesFor(date)", (x) => calendarDayAttributesFor(v(x))],
	["elementalYogaFor(date)", (x) => elementalYogaFor(v(x))],
	["lunarMansionFor(date)", (x) => lunarMansionFor(v(x))],
	["attributesFor(date)", (x) => attributesFor(v(x))],
	["elementalYoga(weekdayElement, mansion)", (x) => elementalYoga(v(x), "fire")],
	["elementalYoga(weekdayElement, mansion) second", (x) => elementalYoga("fire", v(x))],
	["getObservances(from, to, config) from", (x) => getObservances(v(x), ISO, EXAMPLE_OBSERVANCES)],
	["getObservances(from, to, config) to", (x) => getObservances(ISO, v(x), EXAMPLE_OBSERVANCES)],
	["observancesOn(date, config)", (x) => observancesOn(v(x), EXAMPLE_OBSERVANCES)],
	// The whole fields argument, where a date or month object belongs.
	["tibetanToIso(fields)", (x) => tibetanToIso(v(x))],
	["tibetanDateExists(fields)", (x) => tibetanDateExists(v(x))],
	["resolveDate(fields)", (x) => resolveDate(v(x))],
	["addDays(fields, days) fields", (x) => addDays(v(x), 1)],
	["daysBetween(from, to) from", (x) => daysBetween(v(x), LOSAR)],
	["addMonthsToDate(fields, months) fields", (x) => addMonthsToDate(v(x), 1)],
	["formatTibetanDate(fields)", (x) => formatTibetanDate(v(x))],
	["lunarDayAttributesFor(fields)", (x) => lunarDayAttributesFor(v(x))],
	["resolveMonth(monthFields)", (x) => resolveMonth(v(x))],
	["daysInMonth(monthFields)", (x) => daysInMonth(v(x))],
	["datesFor(monthFields)", (x) => datesFor(v(x))],
	["lunationFromMonth(monthFields)", (x) => lunationFromMonth(v(x))],
	["addMonths(monthFields, months) month", (x) => addMonths(v(x), 1)],
	["monthsBetween(from, to) from", (x) => monthsBetween(v(x), MONTH)],
	["formatTibetanMonth(monthFields)", (x) => formatTibetanMonth(v(x))],
	["monthNamesFor(monthFields)", (x) => monthNamesFor(v(x))],
	["monthAttributesFor(monthFields)", (x) => monthAttributesFor(v(x))],
];

// One field of a fields object, the others valid.
const dateFieldRows = (field: string): Row[] => {
	const at = (x: unknown) => v({ ...LOSAR, [field]: x });
	return [
		[`tibetanToIso({ ${field} })`, (x) => tibetanToIso(at(x))],
		// Allowlisted: a field out of range is a date that does not exist, so `false` is its answer.
		[`tibetanDateExists({ ${field} })`, (x) => tibetanDateExists(at(x)), ["false"]],
		[`resolveDate({ ${field} })`, (x) => resolveDate(at(x))],
		[`addDays({ ${field} }, 1)`, (x) => addDays(at(x), 1)],
		[`daysBetween({ ${field} }, fields)`, (x) => daysBetween(at(x), LOSAR)],
		[`addMonthsToDate({ ${field} }, 1)`, (x) => addMonthsToDate(at(x), 1)],
		[`formatTibetanDate({ ${field} })`, (x) => formatTibetanDate(at(x))],
		[`lunarDayAttributesFor({ ${field} })`, (x) => lunarDayAttributesFor(at(x))],
	];
};
const monthFieldRows = (field: string): Row[] => {
	const at = (x: unknown) => v({ ...MONTH, [field]: x });
	return [
		[`resolveMonth({ ${field} })`, (x) => resolveMonth(at(x))],
		[`daysInMonth({ ${field} })`, (x) => daysInMonth(at(x))],
		[`datesFor({ ${field} })`, (x) => datesFor(at(x))],
		[`lunationFromMonth({ ${field} })`, (x) => lunationFromMonth(at(x))],
		[`addMonths({ ${field} }, 1)`, (x) => addMonths(at(x), 1)],
		[`monthsBetween({ ${field} }, monthFields)`, (x) => monthsBetween(at(x), MONTH)],
		[`formatTibetanMonth({ ${field} })`, (x) => formatTibetanMonth(at(x))],
		[`monthNamesFor({ ${field} })`, (x) => monthNamesFor(at(x))],
		[`monthAttributesFor({ ${field} })`, (x) => monthAttributesFor(at(x))],
	];
};
const FIELD: readonly Row[] = [
	...["year", "month", "day", "isLeapMonth", "isLeapDay"].flatMap(dateFieldRows),
	...["year", "month", "isLeapMonth"].flatMap(monthFieldRows),
];

// The tradition, passed positionally where it is the only choice.
const CONFIG: readonly Row[] = [
	["isoFromJulianDay(2461000, tradition)", (x) => isoFromJulianDay(2461000, v(x))],
	["isoToTibetan(date, tradition)", (x) => isoToTibetan(ISO, v(x))],
	["tibetanToIso(fields, tradition)", (x) => tibetanToIso(LOSAR, v(x))],
	["tibetanDateExists(fields, tradition)", (x) => tibetanDateExists(LOSAR, v(x))],
	["losarFor(year, tradition)", (x) => losarFor(2153, v(x))],
	["weekdayNameFor(weekday, tradition)", (x) => weekdayNameFor(v(0), v(x))],
	["monthsFor(year, tradition)", (x) => monthsFor(2153, v(x))],
	["resolveMonth(monthFields, tradition)", (x) => resolveMonth(MONTH, v(x))],
	["daysInMonth(monthFields, tradition)", (x) => daysInMonth(MONTH, v(x))],
	["hasLeapMonth(year, tradition)", (x) => hasLeapMonth(2153, v(x))],
	["leapMonthNumberFor(year, tradition)", (x) => leapMonthNumberFor(2153, v(x))],
	["monthsInYear(year, tradition)", (x) => monthsInYear(2153, v(x))],
	["datesFor(monthFields, tradition)", (x) => datesFor(MONTH, v(x))],
	["resolveDate(fields, tradition)", (x) => resolveDate(LOSAR, v(x))],
	["addDays(fields, 1, tradition)", (x) => addDays(LOSAR, 1, v(x))],
	["daysBetween(fields, fields, tradition)", (x) => daysBetween(LOSAR, LOSAR, v(x))],
	["addMonths(monthFields, 1, tradition)", (x) => addMonths(MONTH, 1, v(x))],
	["monthsBetween(monthFields, monthFields, tradition)", (x) => monthsBetween(MONTH, MONTH, v(x))],
	["lunationFromMonth(monthFields, tradition)", (x) => lunationFromMonth(MONTH, v(x))],
	["monthFromLunation(0, tradition)", (x) => monthFromLunation(0, v(x))],
	["nextFullMoon(date, tradition)", (x) => nextFullMoon(ISO, v(x))],
	["nextNewMoon(date, tradition)", (x) => nextNewMoon(ISO, v(x))],
	["monthNamesFor(monthFields, tradition)", (x) => monthNamesFor(MONTH, v(x))],
	["monthAttributesFor(monthFields, tradition)", (x) => monthAttributesFor(MONTH, v(x))],
	["lunarDayAttributesFor(fields, tradition)", (x) => lunarDayAttributesFor(LOSAR, v(x))],
	["elementalYogaFor(date, tradition)", (x) => elementalYogaFor(ISO, v(x))],
	["lunarMansionFor(date, tradition)", (x) => lunarMansionFor(ISO, v(x))],
	["attributesFor(date, tradition)", (x) => attributesFor(ISO, v(x))],
	// Inside a bag: addMonthsToDate's tradition. ./observances takes both choices positionally.
	[
		"addMonthsToDate(fields, 1, { tradition })",
		(x) => addMonthsToDate(LOSAR, 1, v({ tradition: x })),
	],
	["getObservances(from, to, config)", (x) => getObservances(ISO, ISO, v(x))],
	[
		"getObservances(from, to, config, tradition)",
		(x) => getObservances(ISO, ISO, EXAMPLE_OBSERVANCES, v(x)),
	],
	["observancesOn(date, config)", (x) => observancesOn(ISO, v(x))],
	["observancesOn(date, config, tradition)", (x) => observancesOn(ISO, EXAMPLE_OBSERVANCES, v(x))],
];

// A consumer's ObservanceConfig, whose rule fields the validator renders. `LEVEL_CONFIG` declares a
// level so that a rule's `level` is a value under test rather than always undeclared.
const withRule = (patch: object) =>
	v({
		...LEVEL_CONFIG,
		levels: [{ id: "lv", englishName: "Level" }],
		rules: [{ ...RULE, ...patch }],
	});
// A non-empty string is a valid id, name or tag, so the one hostile value that is one answers.
const STRING_OK = ["numeric string"];
const withWhen = (when: unknown) => withRule({ when });
const RULE_FIELD: readonly Row[] = [
	[
		"getObservances(…, config) monthly days entry",
		(x) => getObservances(ISO, ISO, withWhen({ type: "monthly", days: [x] })),
	],
	[
		"getObservances(…, config) when.type",
		(x) => getObservances(ISO, ISO, withWhen({ type: x, days: [1] })),
	],
	[
		"getObservances(…, config) annual dates entry month",
		(x) => getObservances(ISO, ISO, withWhen({ type: "annual", dates: [{ month: x, day: 1 }] })),
	],
	[
		"getObservances(…, config) annual dates entry day",
		(x) => getObservances(ISO, ISO, withWhen({ type: "annual", dates: [{ month: 1, day: x }] })),
	],
	[
		"getObservances(…, config) tags element",
		(x) => getObservances(ISO, ISO, withRule({ tags: [x] })),
		STRING_OK,
	],
	["getObservances(…, config) rule level", (x) => getObservances(ISO, ISO, withRule({ level: x }))],
	[
		"getObservances(…, config) levels entry id",
		(x) => getObservances(ISO, ISO, v({ ...LEVEL_CONFIG, levels: [{ id: x, englishName: "L" }] })),
		STRING_OK,
	],
	...["tibetan", "wylie", "phonetic"].map(
		(part): Row => [
			`getObservances(…, config) tibetanName.${part}`,
			(x) =>
				getObservances(
					ISO,
					ISO,
					withRule({ tibetanName: { tibetan: "a", wylie: "a", phonetic: "a", [part]: x } }),
				),
			STRING_OK,
		],
	),
	[
		"getObservances(…, config) rule id",
		(x) => getObservances(ISO, ISO, withRule({ id: x })),
		STRING_OK,
	],
	[
		"getObservances(…, config) rule englishName",
		(x) => getObservances(ISO, ISO, withRule({ englishName: x })),
		STRING_OK,
	],
];

// Where a whole object belongs, so a Proxy is the caller's own code throwing and is left out.
const RULE_OBJECT: readonly Row[] = [
	[
		"getObservances(…, config) monthly days",
		(x) => getObservances(ISO, ISO, withWhen({ type: "monthly", days: x })),
	],
	["getObservances(…, config) when", (x) => getObservances(ISO, ISO, withWhen(x))],
	[
		"getObservances(…, config) annual dates entry",
		(x) => getObservances(ISO, ISO, withWhen({ type: "annual", dates: [x] })),
	],
	["getObservances(…, config) tags", (x) => getObservances(ISO, ISO, withRule({ tags: x }))],
	[
		"getObservances(…, config) levels entry",
		(x) => getObservances(ISO, ISO, v({ ...LEVEL_CONFIG, levels: [x] })),
	],
	[
		"getObservances(…, config) levels",
		(x) => getObservances(ISO, ISO, v({ ...LEVEL_CONFIG, levels: x })),
	],
	[
		"getObservances(…, config) tibetanName",
		(x) => getObservances(ISO, ISO, withRule({ tibetanName: x })),
	],
	[
		"getObservances(…, config) rule",
		(x) => getObservances(ISO, ISO, v({ ...LEVEL_CONFIG, rules: [x] })),
	],
];

// A bag with nothing to read is empty, and so answers: no prototype, or a Proxy over `{}` whose only
// trap is one reading an empty object never calls.
const EMPTY_BAGS = [
	"null-prototype object",
	"Proxy throwing from has",
	"Proxy throwing from getOwnPropertyDescriptor",
];

// The bag itself, and its other key.
const BAG: readonly Row[] = [
	["addMonthsToDate(fields, 1, options)", (x) => addMonthsToDate(LOSAR, 1, v(x)), EMPTY_BAGS],
	[
		"addMonthsToDate(fields, 1, { overflow })",
		(x) => addMonthsToDate(LOSAR, 1, v({ overflow: x })),
	],
];

/**
 * What a call did with one hostile value: `null` if acceptable, otherwise a description of the
 * escape. `answers` lists the value names, or the literal result `"false"`, allowed to return.
 */
const escapeOf = (call: Call, name: string, value: unknown, answers: readonly string[]) => {
	let result: unknown;
	const error = thrownBy(() => {
		result = call(value);
	});
	if (error === undefined) {
		return answers.includes(name) || answers.includes(String(result))
			? null
			: `${name}: answered instead of throwing`;
	}
	return typeof error.code === "string" && error.code.startsWith("TCT_")
		? null
		: `${name}: escaped uncoded — ${error.constructor?.name}: ${error.message}`;
};

const table = (label: string, rows: readonly Row[], values: typeof HOSTILE) =>
	describe(label, () => {
		it.each(rows.map((row) => [row[0], row] as const))("%s never escapes uncoded", (_, row) => {
			const [, call, answers = []] = row;
			const escapes = values
				.map(([name, value]) => escapeOf(call, name, value, answers))
				.filter((found) => found !== null);
			expect(escapes).toEqual([]);
		});
	});

const NOT_A_PROXY = HOSTILE.filter(([name]) => !name.includes("Proxy"));

table("a hostile value as the argument", SCALAR, HOSTILE);
table("a hostile value as one field", FIELD, HOSTILE);
table("a hostile value as the tradition or config", CONFIG, NOT_A_PROXY);
table("a hostile value in a consumer's observance rule", RULE_FIELD, HOSTILE);
table("a hostile object in a consumer's observance rule", RULE_OBJECT, NOT_A_PROXY);
table("a hostile value as the options bag", BAG, HOSTILE);

describe('a message tells 10n, the string "10" and the number 10 apart', () => {
	// `describe` in src/errors.ts exists for exactly this, and these sites bypassed it: both said
	// "received 10", and `losarFor(10n)` introduced itself as "losarFor(10)".
	it.each([
		["isoFromJulianDay(julianDay)", (x: unknown) => isoFromJulianDay(v(x))],
		["losarFor(year)", (x: unknown) => losarFor(v(x))],
		["monthsFor(year)", (x: unknown) => monthsFor(v(x))],
		["hasLeapMonth(year)", (x: unknown) => hasLeapMonth(v(x))],
		["rabjungFor(year)", (x: unknown) => rabjungFor(v(x))],
		["weekdayNameFor(weekday)", (x: unknown) => weekdayNameFor(v(x))],
		["asTibetanWeekday(value)", (x: unknown) => asTibetanWeekday(v(x))],
		["addDays(fields, days)", (x: unknown) => addDays(LOSAR, v(x))],
		["yearAttributesFor(year)", (x: unknown) => yearAttributesFor(v(x))],
	])("%s", (_, call) => {
		const bigint = thrownBy(() => call(10n))?.message ?? "";
		const string = thrownBy(() => call("10"))?.message ?? "";
		expect(bigint).toContain("10n");
		expect(string).toContain('"10"');
		expect(bigint).not.toMatch(/\(10\)|received 10(?!n)/);
		expect(string).not.toMatch(/\(10\)|received 10\b/);
	});
});
