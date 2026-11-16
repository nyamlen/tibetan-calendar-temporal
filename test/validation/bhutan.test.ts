/**
 * The Bhutanese fixture: its own integrity, and the engine's agreement with it.
 *
 * @remarks
 * Two claims, in that order, because the second is worthless without the first.
 *
 * **Integrity.** The properties `scripts/fetch-bhutan-fixtures.mjs` checked at fetch time,
 * re-checked against the committed output, so a hand-edit or a changed upstream is caught by
 * `npm test` rather than by whatever consumes the data next.
 *
 * **Agreement.** Since `TraditionConfig.leapMonthPosition` exists, the engine can be held to a real
 * Bhutanese calendar. What is checked here is the **month sequence** — which numbers appear in what
 * order, and which member of a repeated pair is the leap one. That needs no astronomical constant,
 * so it runs long before Bhutan's `m₀`, `s₀` and `a₀` are reconciled. Day-level tiling waits on
 * those; see `docs/traditions.md`.
 *
 * **This is the test that settles `leapMonthPosition: "after"`, and the round trip is not.**
 * `trueMonthCount` and `monthFromCount` mirrored *consistently but wrongly* invert each other
 * perfectly. Self-consistency proves the pair is a bijection and says nothing about whether it is
 * Bhutan's bijection. Only an external Bhutanese calendar can say that, which is what this is.
 */

import { describe, expect, it } from "vitest";
import { monthFromCount, trueMonthCount } from "../../src/computation/calendar.js";
import { losarFor } from "../../src/computation/conversion.js";
import { BHUTAN_HENNING } from "../../src/traditions/bhutan.js";
import { BHUTAN_DAYS, BHUTAN_END, BHUTAN_START } from "../fixtures/bhutan.js";
import { CROSS_VERSION_LEAP } from "../fixtures/cross-version-leap.js";
import {
	ALL_BLOCKS,
	a2ForkDivergences,
	BLOCKS,
	type Block,
	bhutanDayMismatches,
	TRUSTED_BLOCKS,
	trustedEnd,
	unpairedLeapBlocks,
} from "../support/bhutan.js";
import { VERSION_CONFIGS } from "../support/versions.js";

const start = Temporal.PlainDate.from(BHUTAN_START);
const end = Temporal.PlainDate.from(BHUTAN_END);

/** The Gregorian date of a row, from its index — the rows are consecutive days by construction. */
const dateAt = (index: number): Temporal.PlainDate => start.add({ days: index });

describe("shape", () => {
	it("covers every day of the window exactly once", () => {
		expect(BHUTAN_DAYS).toHaveLength(end.since(start, { largestUnit: "day" }).days + 1);
		expect(dateAt(BHUTAN_DAYS.length - 1).equals(end)).toBe(true);
	});

	it("carries plausible Bhutanese day and month numbers throughout", () => {
		// Collected rather than asserted per row. Eleven thousand rows times six assertions, each
		// building a message from a Temporal date, is enough to kill a vitest worker outright — which
		// it did on the first run of this file.
		const bad: string[] = [];
		for (const [index, [day, month, leap]] of BHUTAN_DAYS.entries()) {
			if (day < 1 || day > 30 || month < 1 || month > 12 || leap < 0 || leap > 12) {
				bad.push(`${dateAt(index)}: ${day}/${month} leap=${leap}`);
			}
		}
		expect(bad).toEqual([]);
	});

	it("advances the day number by 0, 1 or 2 within a month", () => {
		// 0 is a doubled day, 2 is a skipped one. Anything else means the rows are out of order —
		// which is a real hazard here, because the upstream file is *not* in date order.
		const bad: string[] = [];
		for (let i = 1; i < BHUTAN_DAYS.length; i += 1) {
			const previous = BHUTAN_DAYS[i - 1] as readonly [number, number, number];
			const current = BHUTAN_DAYS[i] as readonly [number, number, number];
			if (current[1] !== previous[1] || current[2] !== previous[2]) continue;
			const step = current[0] - previous[0];
			if (step < 0 || step > 2) bad.push(`${dateAt(i)}: step ${step}`);
		}
		expect(bad).toEqual([]);
	});
});

describe("Janson's 2003 anchor", () => {
	// He records that Bhutan's government calendar gives New Year 2003 as 3 March with day 1 of
	// month 1 repeated, while his calculations and Henning's software give 3 March as a repeated
	// day 30 of the last (leap) month of 2002 — "I have no explanation for this discrepancy."
	// This data descends from Henning's software and follows the computed line.
	const rowFor = (iso: string) =>
		BHUTAN_DAYS[Temporal.PlainDate.from(iso).since(start, { largestUnit: "day" }).days];

	it("repeats day 30 of leap month 12 across 2 and 3 March", () => {
		expect(rowFor("2003-03-02")).toEqual([30, 12, 12]);
		expect(rowFor("2003-03-03")).toEqual([30, 12, 12]);
	});

	it("puts New Year on 4 March, not the government calendar's 3 March", () => {
		expect(rowFor("2003-03-04")).toEqual([1, 1, 0]);
	});
});

describe("the phenomena a day-level check needs", () => {
	it("contains doubled and skipped days in quantity", () => {
		let doubled = 0;
		let skipped = 0;
		for (let i = 1; i < BHUTAN_DAYS.length; i += 1) {
			const [prevDay] = BHUTAN_DAYS[i - 1] as readonly [number, number, number];
			const [day] = BHUTAN_DAYS[i] as readonly [number, number, number];
			if (day === prevDay) doubled += 1;
			if (day === prevDay + 2) skipped += 1;
		}
		expect(doubled).toBeGreaterThan(200);
		expect(skipped).toBeGreaterThan(350);
	});

	it("contains leap months across the window", () => {
		const leapYears = new Set(
			BHUTAN_DAYS.map((row, index) => (row[2] === 0 ? undefined : dateAt(index).year)).filter(
				(year) => year !== undefined,
			),
		);
		expect(leapYears.size).toBeGreaterThanOrEqual(12);
	});
});

/**
 * The leap-rule-only Bhutanese config: Phugpa's astronomy with Bhutan's epoch index, threshold and
 * position. Used for the month-sequence check below, which depends on nothing astronomical, so that
 * the check stays independent of whether the shipped constants are right.
 */
const BHUTAN_RULES = VERSION_CONFIGS.bhutanese;

/** The engine's own month sequence, `length` months starting at true month count `from`. */
function engineBlocks(from: number, length: number): Block[] {
	const blocks: Block[] = [];
	for (let n = from; n < from + length; n += 1) {
		const identity = monthFromCount(BHUTAN_RULES, n);
		blocks.push({ month: identity.month, isLeap: identity.isLeap });
	}
	return blocks;
}

const same = (a: Block[], b: Block[]) =>
	a.length === b.length && a.every((x, i) => x.month === b[i]?.month && x.isLeap === b[i]?.isLeap);

// The window opens on 2000-01-01, inside the Tibetan year that began in 1999. Searching two years
// either side of that is generous and still narrow enough that a match is meaningful.
const SEARCH_CENTRE = trueMonthCount(BHUTAN_RULES, 1999, 1);
const SEARCH_RADIUS = 30;

function matchingOffsets(): number[] {
	const found: number[] = [];
	for (let from = SEARCH_CENTRE - SEARCH_RADIUS; from <= SEARCH_CENTRE + SEARCH_RADIUS; from += 1) {
		if (same(BLOCKS, engineBlocks(from, BLOCKS.length))) found.push(from);
	}
	return found;
}

describe("the upstream anomaly this file works around", () => {
	// Pinned precisely, so it cannot drift and cannot be forgotten. If a re-fetch fixes the upstream
	// these fail, and TRUSTED_BLOCKS should then be raised to cover the whole window.
	it("is a single spurious leap month, and it is the last one", () => {
		const unpairedLeap = unpairedLeapBlocks();
		expect(unpairedLeap).toHaveLength(1);
		expect(unpairedLeap[0]?.index).toBe(TRUSTED_BLOCKS);
		expect(unpairedLeap[0]?.block).toEqual({ month: 2, isLeap: true });
	});

	it("leaves every earlier block trustworthy", () => {
		expect(ALL_BLOCKS.length).toBeGreaterThan(TRUSTED_BLOCKS);
		expect(BLOCKS).toHaveLength(TRUSTED_BLOCKS);
	});
});

describe("the fixture reduces to a month sequence worth checking", () => {
	it("covers 2000 to early 2030 as a few hundred consecutive months", () => {
		expect(BHUTAN_START).toBe("2000-01-01");
		expect(BLOCKS.length).toBeGreaterThan(370);
		expect(BLOCKS.length).toBeLessThan(400);
	});

	it("contains leap months, and each shares its number with a neighbour", () => {
		// Guards the reduction itself. If `leapMonthNumber` were being misread, the leap blocks would
		// either vanish or fail to pair up, and every assertion below would pass vacuously.
		const leapIndices = BLOCKS.map((block, index) => (block.isLeap ? index : -1)).filter(
			(index) => index >= 0,
		);
		expect(leapIndices.length).toBeGreaterThanOrEqual(11);

		const unpaired = leapIndices.filter((index) => {
			const previous = BLOCKS[index - 1];
			const next = BLOCKS[index + 1];
			return previous?.month !== BLOCKS[index]?.month && next?.month !== BLOCKS[index]?.month;
		});
		expect(unpaired).toEqual([]);
	});

	it("puts every leap month *after* its twin, which is the Bhutanese convention", () => {
		// Read straight off the fixture, with no engine involved — this is the claim the engine is
		// about to be held to, established independently first.
		const bad: string[] = [];
		BLOCKS.forEach((block, index) => {
			if (!block.isLeap) return;
			const previous = BLOCKS[index - 1];
			if (previous?.month !== block.month || previous.isLeap) {
				bad.push(`block ${index}: leap month ${block.month} is not preceded by its regular twin`);
			}
		});
		expect(bad).toEqual([]);
	});
});

describe("the engine reproduces it", () => {
	it("matches at exactly one offset", () => {
		// Uniqueness is the substance. A labelling that puts the leap month on the wrong side, or a
		// count off by a lunation, matches at no offset; a coincidence would have to reproduce 31
		// years of irregular leap placement.
		expect(matchingOffsets()).toHaveLength(1);
	});

	it("names that offset the month the fixture opens in", () => {
		// Ties the match to the year numbering rather than leaving it a bare integer. The first row is
		// day 25 of month 11, in the Tibetan year that began in 1999.
		const [offset] = matchingOffsets();
		expect(offset).toBe(trueMonthCount(BHUTAN_RULES, 1999, 11));
	});

	it("agrees on every month, reported together rather than one at a time", () => {
		const [offset] = matchingOffsets();
		expect(offset).toBeDefined();
		const engine = engineBlocks(offset as number, BLOCKS.length);
		const bad: string[] = [];
		BLOCKS.forEach((block, index) => {
			const mine = engine[index] as Block;
			if (mine.month !== block.month || mine.isLeap !== block.isLeap) {
				bad.push(
					`block ${index}: fixture ${block.month}${block.isLeap ? "L" : ""}, ` +
						`engine ${mine.month}${mine.isLeap ? "L" : ""}`,
				);
			}
		});
		expect(bad).toEqual([]);
	});
});

describe("it disagrees with Tibet's ordering, which is the point", () => {
	it("fails to match when the position is flipped to before", () => {
		// The negative control. Without this the suite could not distinguish "Bhutan's ordering is
		// right" from "the fixture is insensitive to ordering".
		const flipped = { ...BHUTAN_RULES, leapMonthPosition: "before" as const };
		const found: number[] = [];
		for (
			let from = SEARCH_CENTRE - SEARCH_RADIUS;
			from <= SEARCH_CENTRE + SEARCH_RADIUS;
			from += 1
		) {
			const blocks: Block[] = [];
			for (let n = from; n < from + BLOCKS.length; n += 1) {
				const identity = monthFromCount(flipped, n);
				blocks.push({ month: identity.month, isLeap: identity.isLeap });
			}
			if (same(BLOCKS, blocks)) found.push(from);
		}
		expect(found).toEqual([]);
	});
});

describe("the runnable Bhutanese config, day by day", () => {
	// The claim the month sequence above cannot make. That check needs no astronomical constant and
	// so says nothing about m₀, s₀ or a₀; this one is about nothing else. A failure here is the
	// epoch data, because the convention is already settled.
	it("reproduces every day of the fixture", () => {
		const bad = bhutanDayMismatches(BHUTAN_HENNING);
		// Collected, not asserted per row: eleven thousand rows times three assertions each, with a
		// message built from a Temporal date, is enough to kill a vitest worker.
		expect(bad.slice(0, 20)).toEqual([]);
		expect(bad).toEqual([]);
	}, 30_000);

	it("differs from the shipped default on exactly three days, which is the a₂ fork", () => {
		// The reason BHUTAN and BHUTAN_HENNING both exist, stated as data rather than as prose.
		//
		// BHUTAN carries the almanac's rounded a₂ = 1/28, matching what PHUGPA defaults to; the
		// variant carries Henning's exact (1+a₁)/30. The fixture descends from Henning's own software
		// and so follows his value — which is why it validates the variant and not the default. Three
		// misses in 11,050 days is about one in 3,700 in this window, against the nominal one in
		// 4,100 PHUGPA's docblock records for this fork. Concluding from this which value Bhutanese *almanacs* print would be circular.
		const differing = a2ForkDivergences(start, trustedEnd);
		expect(differing).toEqual(["2001-12-10", "2004-04-10", "2020-04-23"]);
	}, 30_000);

	it("puts Losar 2003 on 4 March, after the repeated day 30 of the leap month", () => {
		// Janson's own Bhutanese anchor, and the case that breaks a year-end computed as
		// (12, isLeap: false). His government-calendar disagreement is recorded above and not ours to
		// resolve; this follows the computed line, as the fixture does.
		const losar = losarFor(2003 - 1096 + 1223, BHUTAN_HENNING);
		expect(losar.isoDate.toString()).toBe("2003-03-04");
	});
});

describe("the leap months agree with Janson independently", () => {
	it("puts a leap month in the years his four-version table says, and no others", () => {
		// A second, unrelated source for the same window. The fixture descends from Henning's
		// software; this column is extracted from Janson's LaTeX. They share no lineage, so agreement
		// between the engine and both is stronger than agreement with either.
		const [offset] = matchingOffsets();
		const engine = engineBlocks(offset as number, BLOCKS.length);
		const leapNumbers = new Set(engine.filter((block) => block.isLeap).map((block) => block.month));
		const janson = new Set(
			CROSS_VERSION_LEAP.map((row) => row.bhutanese).filter((month) => month !== undefined),
		);
		// Every leap-month *number* Janson lists for Bhutan in this window appears in the sequence.
		for (const month of janson) expect(leapNumbers).toContain(month);
	});
});
