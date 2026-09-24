/**
 * The shape of a Tibetan calendar tradition.
 *
 * @remarks
 * Everything that varies by tradition lives here, so that a second tradition is a new
 * {@link TraditionConfig} rather than a change to any computation module. That held when tested:
 * {@link ../traditions/bhutan.BHUTAN} was added on 2026-08-16 and needed two new fields on this
 * interface and no change to any formula.
 *
 * Shipped: {@link ../traditions/phugpa.PHUGPA}, `PHUGPA_HENNING`,
 * {@link ../traditions/bhutan.BHUTAN} and `BHUTAN_HENNING`. Tsurphu and the Mongolian version are
 * expressible and documented in `docs/traditions.md`, and deliberately not exported — nothing
 * validates a date for either.
 *
 * Note that this is **not** the same claim as "only the constants differ", which an earlier
 * version of this docblock made about Tsurphu and which is false: Tsurphu, the Mongolian and the
 * Bhutanese versions each use a different **leap-month rule**, which is why
 * {@link TraditionConfig.leapIndexThreshold} exists. Bhutan differs further still, placing a leap
 * month *after* rather than *before* the regular month sharing its number — see
 * {@link TraditionConfig.leapMonthPosition}, and `docs/traditions.md` for what a version still has
 * to carry beyond these.
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
	 * rule in the true month count adds `65 − threshold`, since Janson's
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

	/**
	 * Where a leap month sits relative to the regular month sharing its number.
	 *
	 * @remarks
	 * `"before"` for Phugpa, Tsurphu and the Mongolian version; **`"after"` for the Bhutanese**,
	 * alone among the four Janson gives. He calls it "an important difference", notes it is the
	 * Chinese system rather than the Indian, and that it seems to have been the original Kālacakra
	 * कालचक्र system.
	 *
	 * **Two vocabularies describe this, and they invert.** Janson and this project's prose use the
	 * *numbering* framing — Bhutan numbers a leap month from the **preceding** month — while this
	 * field uses the *positional* one. They are the same fact:
	 *
	 * > Bhutan numbers a leap month from the **preceding** month, which places the leap month
	 * > **after** the regular month sharing its number. The two framings are inverses; this field
	 * > states the position.
	 *
	 * The positional framing is the one the field takes because every reader of it computes with
	 * **order** — the sign of the true-month adjustment, which twin a count identifies, which month
	 * a year ends with, the order {@link ../months.monthsFor} emits. None of them needs the
	 * numbering.
	 *
	 * A **numbering convention, not an arithmetic one.** The lunation boundaries are identical
	 * either way; what moves is which of two consecutive months carries the leap flag, and with it
	 * every date in one of them.
	 *
	 * **Required, and deliberately so** — the same reasoning as
	 * {@link TraditionConfig.leapIndexThreshold}, one level out. A default of `"before"` would
	 * silently give Tibet's ordering to a Bhutanese config: no error, no wrong-looking output, just
	 * every date in one lunation a month out. A missing field is the likelier mistake than a wrong
	 * one.
	 *
	 * Not derivable from anything else here, so do not try. It cannot come from
	 * {@link TraditionConfig.leapIndexThreshold} — Janson states Bhutan's rule twice, 57-or-58
	 * against the simplified intercalation index this package computes and 59-or-60 against the
	 * traditional one, so threshold 59 with `"after"` is correct Bhutan and any derivation rule
	 * rejects it. Nor from the config's identity: {@link TraditionConfig.id} is consumer-settable and
	 * must never decide which tradition this is.
	 */
	readonly leapMonthPosition: "before" | "after";

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
	 * Organised **by naming system** — Janson's own enumeration in his month-names section and the
	 * astrological appendix — rather than by calendar unit, so that each system can be sourced, and
	 * refused, on its own.
	 *
	 * Optional, and **absence means different things** depending on the member, because the rules
	 * behind them are different. A default is legitimate where there is one dominant convention and
	 * illegitimate where there is a genuine fork. Every Tibetan version agrees on weekday naming, so
	 * `weekdayOffset` defaults; only Tsurphu numbers its months, so `nineNumbers` defaults to
	 * unnumbered; but the month animals fork Dragon against Tiger with no majority, so an absent
	 * {@link TraditionMonthAnimals} means *not sourced for this tradition*, and the astrological layer
	 * refuses rather than answering.
	 *
	 * Janson's **seasonal** month names need no member here. Almanacs print several of his four
	 * systems at once, so they are not a per-tradition choice; three are fixed functions of the month
	 * number, and the fourth is anchored on the Tiger month `monthAnimals` already carries.
	 *
	 * Nested rather than flat, deliberately. Nothing in here is read by the algorithm, so a flat
	 * field would sit among the constants claiming to be one. Nesting keeps the boundary visible at
	 * the call site — `config.naming.weekdayOffset` reads as a naming concern.
	 *
	 * A separate top-level config was considered and rejected, and the argument is not the one the
	 * `weekdayOffset` docblock gives. That one — `weekdayName` is populated inside the conversion,
	 * which receives only a `TraditionConfig` — does not cover the month members, which are never
	 * populated during conversion. The reason they belong here anyway is that `naming` is already the
	 * not-read-by-the-algorithm bucket, and a second config would have to be threaded into
	 * `./astrology` beside this one for a caller to get one tradition's answers.
	 */
	readonly naming?: TraditionNaming;
}

/**
 * The naming conventions of a tradition, one member per naming system.
 *
 * @remarks
 * Every member names what the rule **does**, never a tradition — a `"phugpa" | "tsurphu"` selector
 * inside a tradition-agnostic config is the same anti-pattern as branching on `config.id`, which is
 * consumer-settable and must not decide "is this Phugpa". Janson describes the month-element rules
 * functionally, as the *son* of the year's element against a continuous cycle, which is why
 * {@link TraditionMonthAnimals.elementRule} spells them `"son-of-year" | "continuous"`.
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
	 *
	 * **Optional within `naming`, defaulting to 0**, so a config supplying only the other members
	 * need not restate a shift it does not have. Absent `naming` already means offset 0, so this
	 * makes the block internally consistent with the rule that governs it.
	 */
	readonly weekdayOffset?: number;

	/**
	 * The **animal cycle** as this tradition applies it to months, or absent if nobody has sourced it.
	 *
	 * @remarks
	 * Present for `PHUGPA` and `PHUGPA_HENNING`, and **absent for `BHUTAN` and `BHUTAN_HENNING`** —
	 * Janson gives no month-animal list for the Bhutanese version, so there is nothing to put here
	 * and the astrological layer refuses the month and lunar-day attributes instead.
	 *
	 * Absence is never a Phugpa fallback, and the reason is a tradition nobody has built yet: Janson
	 * states that Mongolia uses **Tsurphu's** rules for the month animal, gender and element, and
	 * worked Tsurphu and Mongolian configs already exist in `docs/traditions.md` as data. Defaulting
	 * would hand whoever promotes one of those to a real config Phugpa's month attributes, silently,
	 * with nothing about the output looking wrong — which is the `leapIndexThreshold` failure
	 * verbatim.
	 */
	readonly monthAnimals?: TraditionMonthAnimals;

	/**
	 * Which units this tradition gives one of the **nine numbers** (*mewa*), and by what rule.
	 *
	 * @remarks
	 * Optional, and absence means **the dominant convention**, not "unsourced": Janson states that
	 * "only Tsurphu calendars give one of the 9 numbers to each month", so every other version is
	 * unnumbered by his own statement. `PHUGPA` therefore carries no `nineNumbers` block at all.
	 *
	 * A separate member from {@link TraditionMonthAnimals} because it is a separate system: Janson's
	 * month-number formula, `(3 − (12Y + M)) amod 9`, reads the year and month number and never the
	 * Tiger month. Tsurphu's calendar days follow a nine-number rule of their own, from the solstices,
	 * which is not modelled and would belong here beside the month rule.
	 */
	readonly nineNumbers?: TraditionNineNumbers;
}

/**
 * The month-animal rules Janson's astrological appendix needs, none of which the calendar reads.
 *
 * @remarks
 * Two members rather than one selector, because Janson states two independent things and a
 * tradition can differ on either. Mongolia shares both with Tsurphu; Bhutan has neither sourced.
 *
 * Every field is required **once the block is present**. The block is the unit of "this tradition's
 * month animals are sourced": a half-filled one would be a claim nobody can make, since the Tiger
 * month decides the animals *and* anchors the elements, and the lunar day's trigram and number are
 * derived from the month's animal.
 */
export interface TraditionMonthAnimals {
	/**
	 * Which numbered month is the **Tiger** month — 11 in Phugpa, 1 in Tsurphu and Mongolia.
	 *
	 * @remarks
	 * Janson states it exactly this way: "Phugpa almanacs set month 11 = Tiger, while Tsurphu
	 * almanacs set month 1 = Tiger (as in the Chinese calendar)". Expressed as the Tiger month rather
	 * than as an animal offset because the **element** rule hangs off the same fact — the Tiger month
	 * is the one that takes the son of the year's element, and the twelve-month run of elements
	 * starts there — so one field decides both and they cannot drift apart.
	 *
	 * Phugpa's value crossing a year boundary is not an accident of the number: its Tiger month is
	 * month 11 of the **preceding** Gregorian year, which is why its element formula has two arms.
	 */
	readonly tigerMonth: number;

	/**
	 * Whether the month elements restart from the year's element annually, or run on continuously.
	 *
	 * @remarks
	 * `"son-of-year"` is Phugpa: the Tiger month takes the *son* of the year's element — the next one
	 * in the standard order — and the following twelve months repeat each element twice from there,
	 * so the sequence restarts every year. `"continuous"` is Tsurphu and Mongolia: the same
	 * ten-element cycle simply runs on, month after month, year after year, exactly as in the Chinese
	 * calendar.
	 *
	 * The two agree on the *shape* — two months per element, in Janson's standard order — and differ
	 * only on whether the year's element re-enters the computation.
	 */
	readonly elementRule: "son-of-year" | "continuous";
}

/**
 * The nine-number rules a tradition applies. Every member is optional and defaults to the dominant
 * convention.
 */
export interface TraditionNineNumbers {
	/**
	 * Whether months carry a nine number, and how it runs.
	 *
	 * @remarks
	 * `"unnumbered"` — the default — for every version but Tsurphu: "only Tsurphu calendars give one
	 * of the 9 numbers to each month". `"descending"` is Tsurphu's rule: the number decreases by one
	 * each month, leap months excepted, and therefore by three each year.
	 *
	 * Named for what the rule does rather than as a boolean, so that a second numbering rule, if a
	 * source ever gives one, is an added value rather than a changed type.
	 *
	 * @defaultValue `"unnumbered"`
	 */
	readonly months?: "unnumbered" | "descending";
}

/**
 * The tradition, as a key of an options bag.
 *
 * @remarks
 * The base of every bag that carries a tradition — `AddMonthsToDateOptions` and
 * `ObservanceQueryOptions` — so the key's name and type are declared once and a new bag cannot
 * drift from them. Until 2026-09-24 they had drifted: `addMonthsToDate`'s key was `config`, the
 * word `./observances` uses for an `ObservanceConfig`.
 *
 * **Only the tradition goes here.** A function whose only choice is the tradition takes it as its
 * last positional parameter instead, so no function takes this type on its own; any other choice
 * goes on that function's own bag. See `docs/decisions/2026-09-24-how-a-tradition-is-passed.md`.
 *
 * Not exported from a barrel, because no consumer holds a bag of this type alone. It is declared
 * outside the barrels so that `check:conventions` rule 13 would see it if it ever were.
 */
export interface TraditionOptions {
	/** Astronomical constants and naming rules. Defaults to `PHUGPA`. */
	readonly tradition?: TraditionConfig;
}
