/**
 * Declares the shape of a Tibetan calendar tradition.
 *
 * @remarks
 * Everything that varies by tradition lives here, so that a further tradition is a new
 * {@link TraditionConfig} rather than a change to any computation module.
 *
 * Shipped: {@link ../traditions/phugpa.PHUGPA}, `PHUGPA_HENNING`,
 * {@link ../traditions/bhutan.BHUTAN} and `BHUTAN_HENNING`. Tsurphu and the Mongolian version are
 * expressible and documented in `docs/traditions.md`, and deliberately not exported — nothing
 * validates a date for either.
 *
 * More than the constants differ between versions. The Tsurphu, Mongolian and Bhutanese versions
 * each use a different **leap-month rule**, which is why {@link TraditionConfig.leapIndexThreshold}
 * exists. Bhutan also places a leap month *after* rather than *before* the regular month sharing
 * its number — see {@link TraditionConfig.leapMonthPosition}, and `docs/traditions.md` for what a
 * version still has to carry beyond these.
 *
 * Constants are held as exact {@link Rational}s. The scaling denominator is derived from them, in
 * `computation/scaling.ts`, because it differs by tradition.
 *
 * @packageDocumentation
 */

// "A further tradition is a new config, not a change to a computation module" was tested when
// `BHUTAN` was added: it needed two new fields on `TraditionConfig` and no change to any formula.
//
// Constants are exact rationals rather than pre-scaled integers because the scaling denominator is
// not the same for every tradition. Janson's Tsurphu epoch constants (E1732 and E1852, probed) give
// a common denominator of 1,534,755,600 against `PHUGPA`'s 102,317,040: a second factor of 5 and a
// fourth factor of 3, fifteen times as large. `PHUGPA_HENNING` and `BHUTAN_HENNING` are fifteen
// times `PHUGPA`'s too, through `a₂`'s denominator, and `BHUTAN` has `PHUGPA`'s.

// The denominators come from Janson's mixed-radix constants and are already the ones the arithmetic
// needs; `lowestTerms` in `computation/scaling.ts` reduces them when the scaling is derived.
/**
 * An exact rational number.
 *
 * @remarks
 * Held unreduced and unnormalised: nothing here reduces by the gcd.
 */
export interface Rational {
	/** Numerator. May be negative. */
	num: number;
	/** Denominator. Must be positive. */
	den: number;
}

/**
 * The three linear coefficients Janson's astronomical-functions section (§7) gives for each mean
 * quantity.
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
	 * `PHUGPA` uses E806 and `BHUTAN` 1754. The true month count `n` is 0 for the month that begins
	 * at the epoch, so `n ≥ 0` for every later date — for Phugpa, every date after 806 CE. A later
	 * epoch such as E1987 makes `n` negative for earlier dates, and negative operands in `mod` and
	 * `⌊⌋` are where Janson warns that implementations go wrong. Do not switch epochs to get
	 * smaller constants.
	 */
	readonly epochYear: number;

	/**
	 * The epoch month — Janson's `M₀`, always 3 by tradition (*nag pa*, Caitra).
	 *
	 * @remarks
	 * Janson notes this is nominal: because of the rounding rule, the month with true month count 0
	 * is not always month 3. Which month it is depends on `intercalationIndexAtEpoch` (`β*`)
	 * against `leapIndexThreshold`, and on `leapMonthPosition`. For `epochMonth` 3:
	 *
	 * - `"before"`: month 3 for `β*` below the threshold, leap month 3 for `β*` equal to the
	 *   threshold or one more, and month 2 for `β*` two or more above the threshold.
	 * - `"after"`: month 3 for `β*` below the threshold plus 2, leap month 2 for `β*` equal to the
	 *   threshold plus 2 or plus 3, and month 2 for `β*` four or more above the threshold.
	 *
	 * `PHUGPA` (`β*` 61, threshold 48) has count 0 on month 2 of the year beginning in 806 CE;
	 * `BHUTAN` (`β*` 2, threshold 57) has it on month 3 of the year beginning in 1754 CE.
	 */
	readonly epochMonth: number;

	// A value 65 off is the same leap cycle with every true month count shifted by one (probed): the
	// leap rule reads the index mod 65, so no leap month moves, while `β` moves by 65 and `m₀` stays,
	// so every date moves a whole month. Hence the refusal rather than a normalisation.
	/**
	 * Janson's `β*` — the intercalation index at the epoch.
	 *
	 * @remarks
	 * 61 for `PHUGPA` at E806 and 2 for `BHUTAN`. With `leapIndexThreshold` it positions the whole
	 * leap-month cycle, and `β` and `γ*` are derived from these and the epoch.
	 *
	 * An integer in 0…64, because it is an index taken mod 65; any other value is refused with
	 * `TCT_INVALID_TRADITION_CONFIG`.
	 */
	readonly intercalationIndexAtEpoch: number;

	// Why the field is required: a default of 48 would silently give Phugpa's leap placement to a
	// Tsurphu config — no error, no wrong-looking output, a calendar whose leap months fall in the
	// wrong years. A missing field is the likelier mistake than a wrong one.
	//
	// The two derived quantities reproduce every value Janson publishes: the rounding term is his
	// `+17` for Phugpa (`65 − 48`), and `β = 67·M₀ − β* − (65 − threshold)` gives 123 for Phugpa,
	// 172 for Mongolia, 191 for Bhutan and 77 for Tsurphu, congruent mod 65 to his 142 — the only
	// sense in which `β` is determined.
	//
	// Janson's traditional index is the simplified one increased by 2 from the leap month onward,
	// until the index passes 65, so his 59-or-60 is not the simplified rule with the threshold moved
	// by 2. Measured (probe):
	// `{ ...BHUTAN, leapIndexThreshold: 59 }` differs from `BHUTAN` on 177 of the 3,650 days from
	// 2020-01-01 (CE), the first on 2022-02-02.
	/**
	 * The intercalation index at which a leap month is inserted — Janson's leap-month rule.
	 *
	 * @remarks
	 * A month number has a leap month when its intercalation index is **this value or this value
	 * plus one**. Janson states the rule separately for each version, and the values differ:
	 *
	 * | Tradition | threshold |
	 * |-----------|-----------|
	 * | Phugpa    | 48        |
	 * | Tsurphu   | 0         |
	 * | Mongolian | 46        |
	 * | Bhutanese | 57        |
	 *
	 * An integer in 0…63: the index is taken mod 65, the rule matches the threshold plus one as well,
	 * and it does not wrap, so a threshold of 64 would leave that second value unreachable. Janson
	 * writes Tsurphu's as 0-or-1, never as 64-or-0. Any other value is refused with
	 * `TCT_INVALID_TRADITION_CONFIG`.
	 *
	 * The rounding term of the true month count, `65 − threshold`, and `β` are derived from this
	 * field and are not set separately. **Required**: there is no default.
	 *
	 * The Bhutanese value is the *simplified* index this package computes, not the traditional one an
	 * almanac prints. Janson also gives the rule against the traditional index, as 59-or-60, but that
	 * index is the simplified one raised by 2 for a leap month and the months after it, until the index
	 * passes 65, not a uniform shift of this threshold: `{ ...BHUTAN, leapIndexThreshold: 59 }` is a
	 * different calendar, not Bhutan under the traditional index. Bhutan additionally numbers a leap
	 * month from the **preceding** month rather than the following one, which this field does
	 * **not** express; see `leapMonthPosition` and `docs/traditions.md`.
	 */
	readonly leapIndexThreshold: number;

	// The positional framing is the one the field takes because every reader of it computes with
	// order — the sign of the true-month adjustment, which twin a count identifies, which month a
	// year ends with, the order `monthsFor` emits. None of them needs the numbering.
	//
	// Why it is required: a default of "before" would silently give Tibet's ordering to a Bhutanese
	// config — no error, no wrong-looking output, every date in one lunation a month out. A missing
	// field is the likelier mistake than a wrong one (the `leapIndexThreshold` reasoning, one level out).
	//
	// Why it is not derived from the threshold: the two are independent fields, and any threshold is
	// accepted with either position (`{ ...PHUGPA, leapIndexThreshold: 57 }` and
	// `{ ...BHUTAN, leapMonthPosition: "before" }` both validate, probed). A rule such as
	// `57 ⇒ "after"` would fit the four shipped configs and say nothing about a config built from other
	// numbers. Janson states Bhutan's rule against two different indices — 57-or-58 simplified, 59-or-60
	// traditional — so the number does not even identify the version. Nor is `id` a basis:
	// `TraditionConfig.id` is consumer-settable and must never decide which tradition this is.
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
	 * A **numbering convention, not an arithmetic one.** The lunation boundaries are identical
	 * either way; what moves is which of two consecutive months carries the leap flag, and with it
	 * every date in one of them.
	 *
	 * **Required**: there is no default. It is independent of
	 * {@link TraditionConfig.leapIndexThreshold} and is not derived from it, nor from the config's
	 * {@link TraditionConfig.id}: supply both fields.
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
	 * The moon equation table of Janson's astronomical-functions section (§7), for arguments 0…7.
	 *
	 * @remarks
	 * Extended by the symmetries `tab(14 − i) = tab(i)` and `tab(14 + i) = −tab(i)`, giving
	 * period 28, with linear interpolation between integer arguments.
	 */
	readonly moonTab: readonly number[];

	/**
	 * The sun equation table of Janson's astronomical-functions section (§7), for arguments 0…3.
	 *
	 * @remarks
	 * Extended by `tab(6 − i) = tab(i)` and `tab(6 + i) = −tab(i)`, giving period 12, with
	 * linear interpolation.
	 */
	readonly sunTab: readonly number[];

	// Nested rather than flat because nothing in `naming` is read by the algorithm, so a flat field
	// would sit among the constants claiming to be one; nesting keeps the boundary visible at the call
	// site — `tradition.naming.weekdayOffset` reads as a naming concern.
	//
	// A separate top-level config was considered and rejected. The argument that the weekday name is
	// filled in during conversion, which receives only a `TraditionConfig`, covers `weekdayOffset` and
	// not the month members, which are never populated during conversion. They belong here anyway
	// because `naming` is already the not-read-by-the-algorithm bucket, and a second config would have
	// to be threaded into `./astrology` beside this one for a caller to get one tradition's answers.
	/**
	 * How this tradition *names* things, as distinct from how it computes them.
	 *
	 * @remarks
	 * Organised **by naming system** — Janson's own enumeration in his month-names section and the
	 * astrological appendix — rather than by calendar unit, so that each system can be sourced, and
	 * refused, on its own.
	 *
	 * Optional, and **absence means different things** depending on the member. A default is
	 * legitimate where there is one dominant convention and illegitimate where there is a genuine
	 * fork. Every version but Bhutan's names weekdays alike, so `weekdayOffset` defaults to 0; only
	 * Tsurphu numbers its months, so `nineNumbers` defaults to unnumbered; but the month animals fork
	 * — month 1 is Dragon in Phugpa and Tiger in Tsurphu — so an absent {@link TraditionMonthAnimals}
	 * means *not sourced for this tradition*, and the astrological layer refuses rather than
	 * answering.
	 *
	 * Janson's **seasonal** month names need no member here. Almanacs print several of his four
	 * systems at once, so they are not a per-tradition choice; three are fixed functions of the month
	 * number, and the fourth is anchored on the Tiger month `monthAnimals` already carries.
	 */
	readonly naming?: TraditionNaming;
}

// A `"phugpa" | "tsurphu"` selector inside a tradition-agnostic config is the same anti-pattern as
// branching on `tradition.id`, which is consumer-settable and must not decide "is this Phugpa".
// Janson describes the month-element rules functionally, as the *son* of the year's element against
// a continuous cycle.
/**
 * The naming conventions of a tradition, one member per naming system.
 *
 * @remarks
 * Every member names what the rule **does**, never a tradition: the month-element rules are
 * `"son-of-year" | "continuous"` in {@link TraditionMonthAnimals.elementRule}, not tradition names.
 */
export interface TraditionNaming {
	// Optional within `naming` so a config supplying only the other members need not restate a shift
	// it does not have; an absent `naming` already means offset 0, so this keeps the block consistent
	// with that rule.
	/**
	 * How far this tradition's weekday is shifted from Tibet's, in whole days.
	 *
	 * @remarks
	 * 0 for `PHUGPA` and for every version Janson gives but Bhutan's. **1 for Bhutan**, where day 0
	 * is *nyi ma* rather than *spen pa* — Janson calls it "a unique feature of the Bhutanese
	 * calendar", and Unicode CLDR agrees: its `bo` and `dz` locales give names one planet apart for
	 * the same date.
	 *
	 * Moves the **whole weekday**: the name, its `planet` and its `element` are all the shifted
	 * weekday's. That the element moves is an inference no source states. Because of it, a
	 * tradition with a nonzero offset has **no sourced elemental yoga**, which pairs the weekday's
	 * element with the mansion's: `elementalYogaFor` throws `TCT_ATTRIBUTE_NOT_SOURCED` and
	 * `attributesFor` reports `null`. The weekday *number* is `mod(julianDay + 2, 7)` for every
	 * tradition and the Western weekday is correct in both, which is why the difference is invisible
	 * when dates are written in English.
	 *
	 * An integer in 0…6. **Optional within `naming`, defaulting to 0**, as an absent `naming` does.
	 */
	readonly weekdayOffset?: number;

	// Defaulting would hand whoever promotes one of those to a real config Phugpa's month
	// attributes, silently, with nothing about the output looking wrong — the `leapIndexThreshold`
	// failure verbatim.
	/**
	 * The **animal cycle** as this tradition applies it to months, or absent if nobody has sourced it.
	 *
	 * @remarks
	 * Present for `PHUGPA` and `PHUGPA_HENNING`, and **absent for `BHUTAN` and `BHUTAN_HENNING`** —
	 * Janson gives no month-animal list for the Bhutanese version, so there is nothing to put here
	 * and the astrological layer refuses the month and lunar-day attributes instead.
	 *
	 * Absence is never a Phugpa fallback: Janson states that Mongolia uses **Tsurphu's** rules for
	 * the month animal, gender and element, and Tsurphu and Mongolian configs exist in
	 * `docs/traditions.md` as data.
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
	 * Janson's month-number formula, `(3 − (12Y + M)) amod 9`, reads the year and month number and
	 * never the Tiger month, so this is separate from {@link TraditionMonthAnimals}. Tsurphu's
	 * calendar days follow a nine-number rule of their own, from the solstices, which is not modelled
	 * and would belong here beside the month rule.
	 */
	readonly nineNumbers?: TraditionNineNumbers;
}

// A half-filled block would be a claim nobody can make, since the Tiger month decides the animals
// *and* anchors the elements, and the lunar day's trigram and number are derived from the month's
// animal.
/**
 * The month-animal rules Janson's astrological appendix needs, none of which the calendar reads.
 *
 * @remarks
 * Two members, because Janson states two independent things and a tradition can differ on either.
 * Mongolia shares both with Tsurphu; Bhutan has neither sourced.
 *
 * Every field is required **once the block is present**: the block is the unit of "this tradition's
 * month animals are sourced", and a missing field is refused with `TCT_INVALID_TRADITION_CONFIG`.
 */
export interface TraditionMonthAnimals {
	// Expressed as the Tiger month rather than as an animal offset because the element rule hangs off
	// the same fact — the Tiger month is the one that takes the son of the year's element, and the
	// twelve-month run of elements starts there — so one field decides both and they cannot drift apart.
	/**
	 * Which numbered month is the **Tiger** month — 11 in Phugpa, 1 in Tsurphu and Mongolia.
	 *
	 * @remarks
	 * Janson states it exactly this way: "Phugpa almanacs set month 11 = Tiger, while Tsurphu
	 * almanacs set month 1 = Tiger (as in the Chinese calendar)". An integer in 1…12.
	 *
	 * Phugpa's Tiger month is month 11 of the **preceding** year, which is why its element formula
	 * has two arms.
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
	// Named for what the rule does rather than as a boolean, so that a second numbering rule, if a
	// source ever gives one, is an added value rather than a changed type.
	/**
	 * Whether months carry a nine number, and how it runs.
	 *
	 * @remarks
	 * `"unnumbered"` — the default — for every version but Tsurphu: "only Tsurphu calendars give one
	 * of the 9 numbers to each month". `"descending"` is Tsurphu's rule: the number decreases by one
	 * each month, leap months excepted, and therefore by three each year.
	 *
	 * @defaultValue `"unnumbered"`
	 */
	readonly months?: "unnumbered" | "descending";
}

/**
 * The tradition, as a key of an options bag.
 *
 * @remarks
 * The base of every options bag that carries a tradition — `AddMonthsToDateOptions` is the only one
 * — so the key's name and type are declared once and a new bag cannot drift from them. The key is
 * `tradition`, never `config`, which `./observances` uses for an `ObservanceConfig`.
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
