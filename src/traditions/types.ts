/**
 * The shape of a Tibetan calendar tradition.
 *
 * @remarks
 * Every constant the algorithm needs lives here, so that a second tradition is a new
 * {@link TraditionConfig} rather than a change to any computation module. v1 ships
 * {@link ../traditions/phugpa.PHUGPA} only, but Tsurphu (Janson App. A.2) differs solely in
 * these values.
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
}
