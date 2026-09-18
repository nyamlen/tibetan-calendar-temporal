/**
 * The comparison the three implementation cross-checks share — all five fields of a day.
 *
 * @remarks
 * Moved here from `test/validation/crosscheck.test.ts` on 2026-09-18 so that
 * `test/why-trust-these-dates.test.ts` can state "agrees on every day" with the **same** predicate
 * the validation suite uses. A second definition of agreement — the day number alone, say — would
 * be weaker, since it cannot see a doubled-flag mismatch, and would make the shipped page and the
 * validation suite two different claims under one word.
 */

import { isoToTibetan } from "../../src/computation/conversion.js";
import type { CrosscheckRow } from "../fixtures/crosscheck-row.js";

/** A row with the optional flags resolved, so a missing flag and an explicit `false` compare equal. */
export interface Resolved {
	iso: string;
	month: number;
	day: number;
	isLeapMonth: boolean;
	isDoubledDay: boolean;
	isLeapDay: boolean;
}

/** The fixtures omit false flags to stay inside the formatter's line limit. */
export function resolve(row: CrosscheckRow): Resolved {
	return {
		iso: row.iso,
		month: row.month,
		day: row.day,
		isLeapMonth: row.isLeapMonth ?? false,
		isDoubledDay: row.isDoubledDay ?? false,
		isLeapDay: row.isLeapDay ?? false,
	};
}

/** The engine's own view of a day, in the fixture's shape, so mismatches diff readably. */
export function computed(row: CrosscheckRow): Resolved {
	const t = isoToTibetan(Temporal.PlainDate.from(row.iso));
	return {
		iso: row.iso,
		month: t.month,
		day: t.day,
		isLeapMonth: t.isLeapMonth,
		isDoubledDay: t.isDoubledDay,
		isLeapDay: t.isLeapDay,
	};
}

/** Every row where the engine and the fixture differ in any of the five fields. */
export function mismatchesIn(rows: readonly CrosscheckRow[]) {
	return rows
		.map((row) => ({ expected: resolve(row), actual: computed(row) }))
		.filter(
			({ expected, actual }) =>
				actual.month !== expected.month ||
				actual.day !== expected.day ||
				actual.isLeapMonth !== expected.isLeapMonth ||
				actual.isDoubledDay !== expected.isDoubledDay ||
				actual.isLeapDay !== expected.isLeapDay,
		);
}
