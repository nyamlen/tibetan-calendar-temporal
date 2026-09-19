/**
 * The comparison against FPMT's day-by-day calendars — month, day and leap month.
 *
 * @remarks
 * Moved here from `test/validation/fpmt.test.ts` on 2026-09-18, for the reason
 * `test/support/crosscheck.ts` gives: the shipped page's "three days disagree with FPMT" must be
 * measured by the predicate the validation suite pins, not by a restatement of it.
 *
 * The doubled- and leap-day flags are deliberately **not** compared. FPMT's grid prints a day number
 * per Gregorian day and nothing that says which half of a doubled date is the intercalated one.
 */

import { isoToTibetan } from "../../src/computation/conversion.js";
import { PHUGPA } from "../../src/traditions/phugpa.js";
import type { TraditionConfig } from "../../src/traditions/types.js";
import { FPMT_OBSERVANCES, type FpmtObservanceRow } from "../fixtures/fpmt-observances.js";

/** Every FPMT row whose month, day or leap-month flag the engine computes differently. */
export function fpmtNumberingMismatches(config: TraditionConfig = PHUGPA) {
	return FPMT_OBSERVANCES.filter((row) => {
		const t = isoToTibetan(Temporal.PlainDate.from(row.iso), config);
		return (
			t.month !== row.month || t.day !== row.day || t.isLeapMonth !== (row.isLeapMonth ?? false)
		);
	});
}

/** A full or new moon placed on one calendar day, by the engine or by an FPMT icon. */
export interface MoonDay {
	iso: string;
	kind: "full" | "new";
}

/** {@link fpmtMoonComparison}'s result: engine moons and icons, sorted by how they pair. */
export interface MoonComparison {
	/** Every day the engine marks `isFullMoon` or `isNewMoon`. */
	engineMoons: MoonDay[];
	/** Every icon FPMT prints. More than the moons: some doubled dates carry one on each half. */
	icons: MoonDay[];
	/** Engine moons with an icon of the same kind on their day, or on that day's doubled twin. */
	matchedEngineMoons: MoonDay[];
	/** Icons matching no engine moon of their kind on their day, directly or through a twin. */
	unmatchedIcons: MoonDay[];
	/** Engine moons with no icon of their kind on their day or its doubled twin. */
	unmatchedEngineMoons: MoonDay[];
	/** Icons that match only through a doubled twin: FPMT's extra marking, kept visible. */
	twinIcons: MoonDay[];
}

/**
 * FPMT's moon icons against the engine's `isFullMoon`/`isNewMoon`, counted as **moons**, not icons.
 *
 * @remarks
 * The engine marks the calendar day in which the phase's instant falls, which on a doubled 15 or
 * 30 is the second half. FPMT prints its icon on that day too, and on some doubled dates also on
 * the first half — 2023-04-05 and 2025-11-19 in 2022-2025, but not 2022-06-28 or 2024-11-30, and no
 * rule for which is known. So an icon matches an engine moon of the **same kind** on its own day or
 * on its doubled twin, and the twin matches are returned separately rather than absorbed.
 *
 * It pairs by calendar day, never by Tibetan date as a key: the fixture has no Tibetan year, so a
 * month, leap flag and day number repeat every year. Twins are found from the engine's own Tibetan
 * dates for the neighbouring days.
 *
 * Both directions are returned. A one-way check sees only one side of the February 2025 new moon,
 * which the engine puts on the 27th (12/29, day 30 skipped) and FPMT on the 28th.
 */
export function fpmtMoonComparison(
	config: TraditionConfig = PHUGPA,
	rows: readonly FpmtObservanceRow[] = FPMT_OBSERVANCES,
): MoonComparison {
	const tibetan = (iso: Temporal.PlainDate) => isoToTibetan(iso, config);
	const engineKind = (iso: Temporal.PlainDate): MoonDay["kind"] | undefined => {
		const t = tibetan(iso);
		return t.isFullMoon ? "full" : t.isNewMoon ? "new" : undefined;
	};
	const twinOf = (iso: Temporal.PlainDate) => {
		const t = tibetan(iso);
		if (!t.isDoubledDay) return undefined;
		return t.isLeapDay ? iso.add({ days: 1 }) : iso.subtract({ days: 1 });
	};
	const iconOn = new Map(rows.filter((r) => r.moon).map((r) => [r.iso, r.moon]));
	const hasIcon = (iso: Temporal.PlainDate, kind: MoonDay["kind"]) =>
		iconOn.get(iso.toString()) === kind;

	const result: MoonComparison = {
		engineMoons: [],
		icons: [],
		matchedEngineMoons: [],
		unmatchedIcons: [],
		unmatchedEngineMoons: [],
		twinIcons: [],
	};
	for (const row of rows) {
		const date = Temporal.PlainDate.from(row.iso);
		const twin = twinOf(date);
		const kind = engineKind(date);
		if (kind !== undefined) {
			const moon = { iso: row.iso, kind };
			result.engineMoons.push(moon);
			const matched = hasIcon(date, kind) || (twin !== undefined && hasIcon(twin, kind));
			(matched ? result.matchedEngineMoons : result.unmatchedEngineMoons).push(moon);
		}
		if (row.moon !== undefined) {
			const icon = { iso: row.iso, kind: row.moon };
			result.icons.push(icon);
			if (kind === row.moon) continue;
			if (twin !== undefined && engineKind(twin) === row.moon) result.twinIcons.push(icon);
			else result.unmatchedIcons.push(icon);
		}
	}
	return result;
}
