/**
 * The Bhutanese fixture's trusted window, and the two comparisons made over it.
 *
 * @remarks
 * Moved here from `test/validation/bhutan.test.ts` on 2026-09-18, whole, so that the shipped page's
 * "11,050 days", "differs on three days" and "the next is in 2047" are measured by the definitions
 * the validation suites pin. Two definitions of "the trusted window" would be the next drift. The
 * tests pinning where the fixture ends stay in `bhutan.test.ts`; they call {@link unpairedLeapBlocks}.
 */

import { isoToTibetan } from "../../src/computation/conversion.js";
import { BHUTAN, BHUTAN_HENNING } from "../../src/traditions/bhutan.js";
import type { TraditionConfig } from "../../src/traditions/types.js";
import { BHUTAN_DAYS, BHUTAN_START } from "../fixtures/bhutan.js";

export const bhutanStart = Temporal.PlainDate.from(BHUTAN_START);

export interface Block {
	month: number;
	isLeap: boolean;
}

/**
 * The fixture's day rows collapsed to one entry per month, in order.
 *
 * A row is `[day, month, leapMonthNumber]`, where `leapMonthNumber` is 0 in a regular month and
 * otherwise the number of the leap month the day falls in — so it equals `month` exactly when the
 * month is a leap one. A new block starts whenever either changes.
 */
export function fixtureBlocks(): Block[] {
	const blocks: Block[] = [];
	for (const [, month, leapNumber] of BHUTAN_DAYS) {
		const isLeap = leapNumber !== 0;
		const last = blocks[blocks.length - 1];
		if (last === undefined || last.month !== month || last.isLeap !== isLeap) {
			blocks.push({ month, isLeap });
		}
	}
	return blocks;
}

export const ALL_BLOCKS = fixtureBlocks();

/**
 * How many leap months the upstream source carries that Janson does not list.
 *
 * @remarks
 * **A defect in the upstream data, found on 2026-08-16 and recorded rather than smoothed.** The
 * source's leap months reproduce Janson's four-version table exactly for twelve of thirteen —
 * 2000/4, 2002/12, 2005/9, 2008/5, 2011/2, 2013/10, 2016/7, 2019/3, 2021/12, 2024/8, 2027/5,
 * 2030/1. It then carries a **thirteenth he does not list**: a leap month 2 running 2030-04-03 to
 * 2030-05-02, directly after the leap month 1.
 *
 * That year would hold regular 1, leap 1, leap 2, regular 3 — two consecutive leap months, and no
 * regular month 2 at all. No calendar has that. The upstream leaves its leap flag set one month too
 * long.
 *
 * The fixture stops on 2030-04-02, the day before, so **nothing in this repository measures this
 * number any more**: it is a recorded fact about the source, reproduced by
 * `scripts/evidence/bhutan-fixtures/` (the run whose window ends on 2030-04-03 refuses with it), and
 * stated here because the shipped page says "one" and has nothing else to be checked against.
 */
export const UPSTREAM_UNLISTED_LEAP_MONTHS = 1;

/** Every block of the fixture, which ends on the last trusted day. */
export const BLOCKS = ALL_BLOCKS;

export const TRUSTED_BLOCKS = BLOCKS.length;

export const TRUSTED_DAYS = BHUTAN_DAYS.length;

/** The last day of the trusted window, inclusive. */
export const trustedEnd = bhutanStart.add({ days: TRUSTED_DAYS - 1 });

/** Every leap block that does not directly follow its regular twin — the Bhutanese convention. */
export function unpairedLeapBlocks() {
	return ALL_BLOCKS.map((block, index) => ({ block, index })).filter(({ block, index }) => {
		if (!block.isLeap) return false;
		const previous = ALL_BLOCKS[index - 1];
		return previous?.month !== block.month || previous.isLeap;
	});
}

/**
 * Every day of the trusted window whose day, month or leap-month flag the engine computes
 * differently from the fixture, as a readable line.
 */
export function bhutanDayMismatches(config: TraditionConfig = BHUTAN_HENNING): string[] {
	const bad: string[] = [];
	for (const [index, [day, month, leapNumber]] of BHUTAN_DAYS.entries()) {
		if (index >= TRUSTED_DAYS) break;
		const iso = bhutanStart.add({ days: index });
		const date = isoToTibetan(iso, config);
		const expectedLeap = leapNumber !== 0;
		if (date.day !== day || date.month !== month || date.isLeapMonth !== expectedLeap) {
			bad.push(
				`${iso.toString()}: fixture ${day}/${month}${expectedLeap ? "L" : ""}, ` +
					`engine ${date.day}/${date.month}${date.isLeapMonth ? "L" : ""}`,
			);
		}
	}
	return bad;
}

/**
 * Whether `BHUTAN` and `BHUTAN_HENNING` give a different day or month on this date — the `a₂` fork.
 *
 * BHUTAN carries the almanac's rounded a₂ = 1/28; the variant carries Henning's exact (1+a₁)/30.
 */
export function a2ForkDiffers(date: Temporal.PlainDate): boolean {
	const rounded = isoToTibetan(date, BHUTAN);
	const exact = isoToTibetan(date, BHUTAN_HENNING);
	return rounded.day !== exact.day || rounded.month !== exact.month;
}

/**
 * Every date in `[from, to]` on which the fork decides the day, or only the first `limit` of them.
 */
export function a2ForkDivergences(
	from: Temporal.PlainDate,
	to: Temporal.PlainDate,
	limit = Number.POSITIVE_INFINITY,
): string[] {
	const found: string[] = [];
	for (let date = from; Temporal.PlainDate.compare(date, to) <= 0; date = date.add({ days: 1 })) {
		if (a2ForkDiffers(date)) {
			found.push(date.toString());
			if (found.length >= limit) break;
		}
	}
	return found;
}
