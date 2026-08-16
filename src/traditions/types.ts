/**
 * The shape of a Tibetan calendar tradition.
 *
 * @remarks
 * Everything that varies by tradition lives here, so that a second tradition is a new
 * {@link TraditionConfig} rather than a change to any computation module. v1 ships
 * {@link ../traditions/phugpa.PHUGPA} only.
 *
 * Note that this is **not** the same claim as "only the constants differ", which an earlier
 * version of this docblock made about Tsurphu and which is false: Tsurphu, the Mongolian and the
 * Bhutanese versions each use a different **leap-month rule**, which is why
 * {@link TraditionConfig.leapIndexThreshold} exists. Bhutan differs further still, in a way no
 * field here expresses — see `docs/traditions.md`.
 *
 * Constants are held as exact {@link Rational}s rather than pre-scaled integers. The scaling
 * denominator is **derived** from them — see `computation/scaling.ts` — because it is not the
 * same for every tradition: Tsurphu's epoch constants carry a second factor of 5 and a fourth
 * factor of 3, giving a denominator fifteen times Phugpa's.
 *
 * @packageDocumentation
 */

/**
 * An exact rational number.
 *
 * @remarks
 * Held unreduced and unnormalised. Nothing here performs gcd reduction: the denominators come
 * from Janson's mixed-radix constants and are already the ones the arithmetic needs.
 */
export interface Rational {
	/** Numerator. May be negative. */
	num: number;
	/** Denominator. Must be positive. */
	den: number;
}

/**
 * The three linear coefficients Janson §7 gives for each mean quantity.
 *
 * @remarks
 * Each mean function has the form `f(d, n) = n · perMonth + d · perDay + atEpoch`, where `n` is
 * the true month count and `d` the lunar day within the month.
 */
export interface MeanMotion {
	/** Increment per month — Janson's `m₁`, `s₁` or `a₁`. */
	perMonth: Rational;
	/** Increment per lunar day — Janson's `m₂`, `s₂` or `a₂`. */
	perDay: Rational;
	/** Value at the epoch — Janson's `m₀`, `s₀` or `a₀`. */
	atEpoch: Rational;
}

/**
 * A complete parameterisation of one Tibetan calendar tradition.
 */
export interface TraditionConfig {
	/** Stable machine identifier, e.g. `"phugpa"`. */
	readonly id: string;

	/** Human-readable name, e.g. `"Phugpa"`. */
	readonly name: string;

	/**
	 * The epoch year — Janson's `Y₀`, in his *Y* numbering, not the royal era.
	 *
	 * @remarks
	 * Phugpa uses E806. That choice matters beyond convention: the true month count `n` is zero
	 * at the epoch, so `n ≥ 0` for every date after 806 CE. A later epoch such as E1987 makes
	 * `n` negative for anything earlier, and negative operands in `mod` and `⌊⌋` are exactly
	 * where Janson twice warns implementations break. Do not switch epochs to get smaller
	 * constants.
	 */
	readonly epochYear: number;

	/**
	 * The epoch month — Janson's `M₀`, always 3 by tradition (*nag pa*, Caitra).
	 *
	 * @remarks
	 * Janson notes this is nominal: because of the rounding rule, the month with true month
	 * count 0 is actually month 2 whenever `intercalationIndexAtEpoch ≥ 48`.
	 */
	readonly epochMonth: number;

	/**
	 * Janson's `β*` — the intercalation index at the epoch.
	 *
	 * @remarks
	 * 61 for Phugpa at E806. This is the single constant that positions the whole leap-month
	 * cycle; `β` and `γ*` are both derived from it.
	 */
	readonly intercalationIndexAtEpoch: number;

	/**
	 * The intercalation index at which a leap month is inserted — Janson's leap-month rule.
	 *
	 * @remarks
	 * A month is a leap month when its intercalation index is **this value or this value plus
	 * one**. Janson states the rule separately for each version, and the values differ:
	 *
	 * | Tradition | threshold |
	 * |-----------|-----------|
	 * | Phugpa    | 48        |
	 * | Tsurphu   | 0         |
	 * | Mongolian | 46        |
	 * | Bhutanese | 57        |
	 *
	 * Two other quantities are derived from it and must not be written as literals. The rounding
	 * rule in {@link ../computation/calendar.trueMonthCount} adds `65 − threshold`, since Janson's
	 * `+17` for Phugpa is `65 − 48`. And `β` is `67·M₀ − β* − (65 − threshold)`, which reproduces
	 * every value Janson publishes: 123 for Phugpa, 172 for Mongolia, 191 for Bhutan, and 77 for
	 * Tsurphu — congruent mod 65 to his 142, which is the only sense in which β is determined.
	 *
	 * **Required, and deliberately so.** A default of 48 would silently give Phugpa's leap
	 * placement to a Tsurphu config: no error, no wrong-looking output, just a calendar whose leap
	 * months fall in the wrong years. That is the failure this package is built to prevent, and a
	 * missing field is the likelier mistake than a wrong one.
	 *
	 * The Bhutanese value is the *simplified* index this package computes, not the traditional one
	 * an almanac prints — Janson gives the rule both ways, as 59-or-60 traditional and 57-or-58
	 * simplified. Bhutan additionally numbers a leap month from the **preceding** month rather than
	 * the following one, which this field does **not** express; see `docs/traditions.md`.
	 */
	readonly leapIndexThreshold: number;

	/** Mean date — Janson's `m₁`, `m₂`, `m₀`. Yields a Julian day number when `m₀` includes the
	 * epoch's JD offset. */
	readonly meanDate: MeanMotion;

	/** Mean solar longitude — Janson's `s₁`, `s₂`, `s₀`, in units of full circles. */
	readonly meanSun: MeanMotion;

	/** Lunar anomaly — Janson's `a₁`, `a₂`, `a₀`, in units of full circles. */
	readonly lunarAnomaly: MeanMotion;

	/**
	 * The moon equation table, Janson §7, for arguments 0…7.
	 *
	 * @remarks
	 * Extended by the symmetries `tab(14 − i) = tab(i)` and `tab(14 + i) = −tab(i)`, giving
	 * period 28, with linear interpolation between integer arguments.
	 */
	readonly moonTab: readonly number[];

	/**
	 * The sun equation table, Janson §7, for arguments 0…3.
	 *
	 * @remarks
	 * Extended by `tab(6 − i) = tab(i)` and `tab(6 + i) = −tab(i)`, giving period 12, with
	 * linear interpolation.
	 */
	readonly sunTab: readonly number[];

	/**
	 * How this tradition *names* things, as distinct from how it computes them.
	 *
	 * @remarks
	 * Optional; omitting it means the Tibetan conventions, which is right for every version but the
	 * Bhutanese.
	 *
	 * Nested rather than flat, deliberately. Nothing in here is read by the algorithm, so a flat
	 * field would sit among the constants claiming to be one. Nesting keeps the boundary visible at
	 * the call site — `config.naming.weekdayOffset` reads as a naming concern — and gives the known
	 * future members somewhere to go: month naming is also tradition-dependent, and needs four more
	 * (an animal offset, an element-rule selector, a seasonal-system selector, and a Tsurphu-only
	 * number flag).
	 *
	 * A separate top-level config was considered and rejected: `weekdayName` is populated inside the
	 * conversion, which receives only a `TraditionConfig`, so separating it would mean passing two
	 * configs to fill one field.
	 */
	readonly naming?: TraditionNaming;
}

/**
 * The naming conventions of a tradition.
 *
 * @remarks
 * When a second member is added, name it for what the rule **does**, never for a tradition — a
 * `"phugpa" | "tsurphu"` selector inside a tradition-agnostic config is the same anti-pattern as
 * branching on `config.id`, which is consumer-settable and must not decide "is this Phugpa".
 * Janson describes the month-element rules functionally, as the *son* of the year's element against
 * a continuous cycle, so `"son-of-year" | "continuous"` is available and honest.
 */
export interface TraditionNaming {
	/**
	 * How far this tradition's weekday **names** are shifted from Tibet's, in whole days.
	 *
	 * @remarks
	 * 0 for every Tibetan version. **1 for Bhutan**, where day 0 is *nyi ma* rather than *spen pa* —
	 * Janson calls it "a unique feature of the Bhutanese calendar", and Unicode CLDR agrees: its
	 * `bo` and `dz` locales give names one planet apart for the same date.
	 *
	 * Applies to the **name only**. The weekday *number* is `mod(julianDay + 2, 7)` for every
	 * tradition and the Western weekday is correct in both, which is why the difference is invisible
	 * when dates are written in English.
	 */
	readonly weekdayOffset: number;
}
