import { describe, expect, it } from "vitest";
import { isoToTibetan } from "../../src/computation/conversion.js";
import { GELUG, getObservances, observancesOn } from "../../src/observances/index.js";
import { FPMT_OBSERVANCES } from "../fixtures/fpmt-observances.js";

const iso = (s: string) => Temporal.PlainDate.from(s);

/**
 * FPMT's printed label, and the rule ids that should produce it.
 *
 * Only the labels the shipped config claims. FPMT prints others — "Precepts", "Fire puja", "Naga
 * puja", eclipses, teacher anniversaries — which are deliberately not shipped, so asserting on
 * them would be asserting on absence rather than on the engine.
 */
const LABEL_TO_IDS: Record<string, readonly string[]> = {
	Tsog: ["tsok-10", "tsok-25"],
	"Protector puja": ["protector-29"],
	"Tara puja": ["tara-8"],
	"Medicine Buddha": ["medicine-buddha-8", "medicine-buddha-15"],
};

/**
 * The three days where the engine and FPMT disagree about the Tibetan day *number* — nothing to
 * do with observances. Catalogued in `fpmt.test.ts` and docs/testing.md; an observance sitting on
 * one of them inherits the disagreement, so it is excluded here rather than double-counted.
 */
const NUMBERING_DIVERGENCES = new Set(["2022-12-02", "2022-12-03", "2024-12-08", "2024-02-08"]);

// Tier 2. The engine's rules are checked against the calendars FPMT actually publishes, which is
// what makes them a tested claim rather than a transcription -- the failure mode CLAUDE.md
// records for an early draft of docs/testing.md, which put Losar 2026 a day out.
describe("observances against FPMT's published calendars, 2022-2025", () => {
	const emitted = getObservances(iso("2022-01-01"), iso("2025-12-31"));

	const byDate = new Map<string, Set<string>>();
	for (const o of emitted) {
		const key = o.date.isoDate.toString();
		if (!byDate.has(key)) byDate.set(key, new Set());
		byDate.get(key)?.add(o.rule.id);
	}

	it("reproduces every label it claims, and invents none", () => {
		const wrong: string[] = [];
		for (const row of FPMT_OBSERVANCES) {
			if (NUMBERING_DIVERGENCES.has(row.iso)) continue;
			const printed = new Set(row.labels ?? []);
			const ours = byDate.get(row.iso) ?? new Set<string>();
			for (const [label, ids] of Object.entries(LABEL_TO_IDS)) {
				const they = printed.has(label);
				const we = ids.some((id) => ours.has(id));
				if (they !== we) wrong.push(`${row.iso} (day ${row.day}) ${label}: fpmt ${they}, us ${we}`);
			}
		}
		expect(wrong).toEqual([]);
	});

	it("emits something on a useful number of days", () => {
		// A guard against the suite passing because the engine returned almost nothing.
		expect(emitted.length).toBeGreaterThan(300);
	});
});

describe("observance resolution", () => {
	// The row docs/testing.md calls the fixture's most informative: a leap month and a doubled day
	// at once, from an almanac-line source, and the case FPMT itself published two dates for.
	it("puts the 2024 Chokhor Duchen on 10 July by default, the second of the doubled pair", () => {
		const found = observancesOn(iso("2024-07-10")).filter((o) => o.rule.id === "chokhor-duchen");
		expect(found).toHaveLength(1);
		expect(found[0]?.resolution).toBe("secondOfDoubled");
		expect(observancesOn(iso("2024-07-09")).some((o) => o.rule.id === "chokhor-duchen")).toBe(
			false,
		);
	});

	// Janson's holidays section, following Berzin, says the first. Kopan Monastery observed the
	// 9th. An institution follows that line by spreading the config, never by editing the engine.
	it("puts it on 9 July under Janson's rule, reached by spreading the config", () => {
		const kopan = { ...GELUG, id: "kopan", doubledDay: "first" as const };
		const found = observancesOn(iso("2024-07-09"), kopan).filter(
			(o) => o.rule.id === "chokhor-duchen",
		);
		expect(found).toHaveLength(1);
		expect(found[0]?.resolution).toBe("firstOfDoubled");
	});

	it("emits both halves under 'both', reproducing FPMT's own 'July 9 or July 10'", () => {
		const config = { ...GELUG, doubledDay: "both" as const };
		const days = getObservances(iso("2024-07-01"), iso("2024-07-31"), config)
			.filter((o) => o.rule.id === "chokhor-duchen")
			.map((o) => o.date.isoDate.toString());
		expect(days).toEqual(["2024-07-09", "2024-07-10"]);
	});

	// Janson says observances are usually not kept in leap months; FPMT does the opposite here,
	// and 4 of the regular month 6 that follows carries nothing at all.
	it("keeps the 2024 Chokhor Duchen in the leap month, not the regular month 6", () => {
		const inRegular = observancesOn(iso("2024-08-08")).some((o) => o.rule.id === "chokhor-duchen");
		expect(inRegular).toBe(false);
		expect(isoToTibetan(iso("2024-08-08")).isLeapMonth).toBe(false);
	});

	// A monthly observance recurs in *both* halves of a leap pair; only annual ones choose.
	it("recurs monthly through both months of a leap pair", () => {
		const leap = observancesOn(iso("2024-07-16")).some((o) => o.rule.id === "tsok-10");
		const regular = observancesOn(iso("2024-08-14")).some((o) => o.rule.id === "tsok-10");
		expect({ leap, regular }).toEqual({ leap: true, regular: true });
	});

	it("reports how each observance landed", () => {
		const kinds = new Set(
			getObservances(iso("2022-01-01"), iso("2025-12-31")).map((o) => o.resolution),
		);
		// "shiftedFromSkipped" is absent from the shipped config by design: the four great days
		// use it, but none of them met a skipped date in this window.
		expect(kinds.has("exact")).toBe(true);
		expect(kinds.has("secondOfDoubled")).toBe(true);
	});

	it("returns nothing for a reversed range", () => {
		expect(getObservances(iso("2026-01-02"), iso("2026-01-01"))).toEqual([]);
	});

	it("returns results in date order", () => {
		const days = getObservances(iso("2026-01-01"), iso("2026-12-31")).map((o) =>
			o.date.isoDate.toString(),
		);
		expect([...days].sort()).toEqual(days);
	});
});
