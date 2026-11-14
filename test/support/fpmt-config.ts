import { EXAMPLE_OBSERVANCES, getObservances } from "../../src/observances/index.js";
import type { Observance, ObservanceConfig } from "../../src/observances/types.js";
import { FPMT_OBSERVANCES, type FpmtObservanceRow } from "../fixtures/fpmt-observances.js";

/**
 * The example's rules under FPMT's labels, plus the rows FPMT prints that the example does not ship.
 *
 * Test-only, and the configuration the FPMT validation suite holds. Lama Thubten Yeshe is FPMT's
 * founder, so his day belongs here and not in the neutral example; the four `western` rules are
 * dated by the Gregorian calendar, which FPMT prints.
 *
 * - Lama Zopa Rinpoche's birthday has **no window**: FPMT prints it every year 2022-2026, after his
 *   passing too (checked 2026-11-11).
 * - His passing, 13 April, carries `fromYear: 2024`, the external test of a window: FPMT begins to
 *   print it in 2024.
 * - The Dalai Lama's and Sakya Trichen's birthdays carry `ageFromYear`, the external test of `age`:
 *   FPMT prints the ordinal of each, which the suite matches against the result's `age`.
 *
 * `saga-dawa-month` has **no FPMT label**, so it appears in no list below and FPMT validates nothing
 * about it.
 */
export const FPMT_CONFIG: ObservanceConfig = {
	...EXAMPLE_OBSERVANCES,
	id: "fpmt-test",
	englishName: "The example's rules under FPMT's labels",
	rules: [
		...EXAMPLE_OBSERVANCES.rules,
		{
			id: "lama-yeshe",
			englishName: "Lama Thubten Yeshe",
			when: { type: "annual", dates: [{ month: 1, day: 1 }] },
		},
		{
			id: "lama-zopa-birthday",
			englishName: "Lama Zopa Rinpoche's birthday",
			when: { type: "western", month: 12, day: 3 },
		},
		{
			id: "lama-zopa-passing",
			englishName: "Lama Zopa Rinpoche",
			when: { type: "western", month: 4, day: 13, fromYear: 2024 },
		},
		{
			id: "dalai-lama-birthday",
			englishName: "H.H. the Dalai Lama's birthday",
			when: { type: "western", month: 7, day: 6, ageFromYear: 1935 },
		},
		{
			id: "sakya-trichen-birthday",
			englishName: "H.H. Sakya Trichen's birthday",
			when: { type: "western", month: 9, day: 7, ageFromYear: 1945 },
		},
	],
};

/** The rules that carry one of FPMT's labels, and every spelling of that label. */
export interface FpmtLabelGroup {
	readonly ids: readonly string[];
	readonly labels: readonly string[];
}

/**
 * FPMT's labels against the rules that produce them, spelling variants included.
 *
 * Every variant is one the fixture carries. FPMT prints the Dalai Lama's and Sakya Trichen's
 * birthdays with the ordinal, one of them with a misprint ("Sajkya") and one without the title.
 * "Tsog" is one label on two rules, the 10th and the 25th: FPMT does not say which practice either
 * day is, so the pair is compared as one. A rule absent here is one FPMT does not label, and the
 * suite says nothing about it.
 */
export const FPMT_LABEL_GROUPS: readonly FpmtLabelGroup[] = [
	{ ids: ["chotrul-duchen"], labels: ["Day of Miracles"] },
	{
		ids: ["saga-dawa-duchen"],
		labels: [
			"Lord Buddha's birth, enlightenment and parinirvana",
			"Lord Buddha's birth, Enlightenment and parinirvana",
		],
	},
	{ ids: ["chokhor-duchen"], labels: ["Lord Buddha's first teaching"] },
	{
		ids: ["lhabab-duchen"],
		labels: [
			"Lord Buddha's descent from God Realm of Thirty Three",
			"Lord Buddha's Descent from God Realm of 33",
		],
	},
	{ ids: ["milarepa"], labels: ["Milarepa"] },
	{ ids: ["guru-rinpoche"], labels: ["Guru Rinpoche"] },
	{ ids: ["gampopa"], labels: ["Gampopa"] },
	{ ids: ["karmapa-16"], labels: ["Sixteenth Karmapa"] },
	{ ids: ["tsongkhapa"], labels: ["Lama Tsong Khapa"] },
	{ ids: ["sakya-pandita"], labels: ["Sakya Pandita"] },
	{ ids: ["dudjom-rinpoche"], labels: ["Dudjom Rinpoche"] },
	{ ids: ["sojong"], labels: ["Sojong"] },
	{ ids: ["medicine-buddha"], labels: ["Medicine Buddha"] },
	{ ids: ["tara"], labels: ["Tara puja"] },
	{ ids: ["fire-puja"], labels: ["Fire puja"] },
	{ ids: ["heruka-day", "dakini-day"], labels: ["Tsog"] },
	{ ids: ["dharma-protector-day"], labels: ["Protector puja"] },
	{ ids: ["lama-yeshe"], labels: ["Lama Thubten Yeshe"] },
	{ ids: ["lama-zopa-birthday"], labels: ["Lama Zopa Rinpoche's birthday"] },
	{ ids: ["lama-zopa-passing"], labels: ["Lama Zopa Rinpoche"] },
	{
		ids: ["dalai-lama-birthday"],
		labels: [
			"His Holiness the Dalai Lama's 87th birthday",
			"His Holiness the Dalai Lama's 88th birthday",
			"His Holiness the Dalai Lama's 89th birthday",
			"His Holiness the Dalai Lama's 90th birthday",
			"His Holiness the Dalai Lama's 91st birthday",
		],
	},
	{
		ids: ["sakya-trichen-birthday"],
		labels: [
			"His Holiness Sakya Trichen's 77th birthday",
			"Sakya Trichen's 78th birthday",
			"Sakya Trichen's 79th birthday",
			"His Holiness the Sajkya Trichen's 80th birthday",
			"His Holiness Sakya Trichen's 81st birthday",
		],
	},
];

/** The ordinal in a printed birthday label, or `undefined` where the label carries none. */
export const printedAge = (label: string): number | undefined => {
	const match = /(\d+)(?:st|nd|rd|th) birthday$/.exec(label);
	return match === null ? undefined : Number(match[1]);
};

/** The result of {@link fpmtLabelComparison}. */
export interface FpmtLabelComparison {
	/** Every observance the config produces over the rows' window. */
	readonly emitted: readonly Observance[];
	/**
	 * Each disagreement, as `"<iso> <rule ids joined by +>: fpmt"` for a label the engine does not put
	 * on that day, `": engine"` for a day it marks that FPMT does not, or `": printed age N, engine M"`.
	 */
	readonly residuals: readonly string[];
}

/**
 * Compares a config's observances with FPMT's printed labels, day by day and in both directions.
 *
 * The one definition of "agrees" for labels: the validation suite and the shipped page's suite both
 * call it, so neither can measure a weaker claim under the same word. The window is the rows' own, so
 * extending the fixture cannot leave rows beyond the range being emitted.
 */
export function fpmtLabelComparison(
	config: ObservanceConfig = FPMT_CONFIG,
	rows: readonly FpmtObservanceRow[] = FPMT_OBSERVANCES,
): FpmtLabelComparison {
	const first = rows[0]?.iso ?? "";
	const last = rows.at(-1)?.iso ?? "";
	const emitted = getObservances(
		Temporal.PlainDate.from(first),
		Temporal.PlainDate.from(last),
		config,
	);
	const byDate = new Map<string, Observance[]>();
	for (const o of emitted) {
		const key = o.date.isoDate.toString();
		byDate.set(key, [...(byDate.get(key) ?? []), o]);
	}
	// Collected and asserted once by the caller, never per row.
	const residuals: string[] = [];
	for (const row of rows) {
		const printed = new Set(row.labels ?? []);
		for (const group of FPMT_LABEL_GROUPS) {
			const label = group.labels.find((l) => printed.has(l));
			const ours = (byDate.get(row.iso) ?? []).filter((o) => group.ids.includes(o.rule.id));
			const key = group.ids.join("+");
			if ((label !== undefined) !== ours.length > 0) {
				residuals.push(`${row.iso} ${key}: ${label !== undefined ? "fpmt" : "engine"}`);
			} else if (label !== undefined) {
				const age = printedAge(label);
				if (age !== undefined && ours[0]?.age !== age) {
					residuals.push(`${row.iso} ${key}: printed age ${age}, engine ${String(ours[0]?.age)}`);
				}
			}
		}
	}
	return { emitted, residuals };
}
