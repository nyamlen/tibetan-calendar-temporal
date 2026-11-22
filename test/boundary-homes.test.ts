import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { yearAttributesFor } from "../src/astrology/index.js";
import { rabjungFor, yearNameFor } from "../src/index.js";

const SRC = join(import.meta.dirname, "..", "src");

const sources = (dir: string): string[] =>
	readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
		entry.isDirectory()
			? sources(join(dir, entry.name))
			: entry.name.endsWith(".ts")
				? [join(dir, entry.name)]
				: [],
	);

const filesContaining = (needle: RegExp): string[] =>
	sources(SRC)
		.filter((file) => needle.test(readFileSync(file, "utf8")))
		.map((file) => file.slice(SRC.length + 1).replaceAll("\\", "/"))
		.sort();

describe("one home for each guard and table", () => {
	it("writes the year guard's message in src/errors.ts only", () => {
		// The year guard is assertSafeIntegerArgument with the noun "year"; its full text is pinned below.
		expect(
			filesContaining(/year must be a safe integer|\$\{noun\} must be a safe integer/),
		).toEqual(["errors.ts"]);
	});

	it("writes the non-empty-string guard's message in src/errors.ts only", () => {
		expect(filesContaining(/must be a non-empty string, received/)).toEqual(["errors.ts"]);
	});

	it("writes the Tibetan weekday guard's message in src/types.ts only", () => {
		expect(filesContaining(/0 is Saturday/)).toEqual(["types.ts"]);
	});

	it("leaves no hand-rolled safe-integer argument guard outside assertSafeIntegerArgument", () => {
		expect(
			filesContaining(
				/Number\.isSafeInteger\((julianDay|value)\)\) \{\n\t\tthrow rangeError\(\n\t\t\t"TCT_FIELD_OUT_OF_RANGE"/,
			),
		).toEqual([]);
	});

	it("declares the twelve-animal order once", () => {
		expect(filesContaining(/"mouse",\s*"ox",\s*"tiger"/)).toEqual(["cycle-tables.ts"]);
	});

	it("declares the five-element order once", () => {
		expect(filesContaining(/\["wood", "fire", "earth", "iron", "water"\]/)).toEqual([
			"cycle-tables.ts",
		]);
	});

	it("writes the one-based accessor once", () => {
		expect(filesContaining(/oneBased: number, what: string/)).toEqual(["cycle-tables.ts"]);
	});

	// M3.5: a date's weekday name and weekdayNameFor's must read the offset by one rule.
	it("reads a tradition's weekday offset in src/names.ts only", () => {
		expect(filesContaining(/naming\?\.weekdayOffset/)).toEqual(["names.ts"]);
	});

	// M3.6: the hint was copied word for word into a second module.
	it("writes the royal-era hint in src/errors.ts only", () => {
		expect(filesContaining(/Years here are the royal era, matching TibetanDate\.year/)).toEqual([
			"errors.ts",
		]);
	});
});

describe("each year-taking export names itself and the royal era", () => {
	it.each([
		["yearAttributesFor", () => yearAttributesFor(1.5)],
		["yearNameFor", () => yearNameFor(1.5)],
		["rabjungFor", () => rabjungFor(1.5)],
	])("%s", (name, call) => {
		expect(call).toThrow(
			expect.objectContaining({
				code: "TCT_FIELD_OUT_OF_RANGE",
				message: expect.stringMatching(
					new RegExp(
						`^${name}: year must be a safe integer, received 1.5. Years here are the royal era, matching TibetanDate.year — 2153, not 2026.$`,
					),
				),
			}),
		);
	});
});
