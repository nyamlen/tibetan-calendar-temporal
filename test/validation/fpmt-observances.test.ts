import { describe, expect, it } from "vitest";
import { getObservances } from "../../src/observances/index.js";
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
