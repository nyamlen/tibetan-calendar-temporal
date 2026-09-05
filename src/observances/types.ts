/**
 * The shapes of the observance layer: {@link ObservanceRule}, the {@link ObservanceConfig} that
 * collects them, and the {@link Observance} a query returns.
 *
 * @remarks
 * ## Why this is a separate entry point
 *
 * Everything under `computation/` makes a **falsifiable** claim. A constant checks against
 * Janson's paper; a date checks against an almanac; a disagreement is a bug in one of the two.
 *
 * Nothing here does. Which days an institution observes, which half of a doubled day it keeps,
 * and whether it observes at all in a leap month are **conventions**, and the published sources
 * disagree about them. Janson's holidays section, following Berzin, says an observance falling on
 * a doubled date is kept on the first of the pair — while noting he had not checked that against
 * published calendars. FPMT says the second. FPMT's own calendars then place the 2024 Chokhor
 * Duchen on the second, agreeing with its guidance, and place *sojong* on the first of the
 * 19-20 November 2025 pair, disagreeing with it.
 *
 * That is not a defect in the sources. It is what a convention looks like. So this layer holds
 * conventions as **injected data carrying a citation**, never as logic, and ships behind its own
 * subpath so that a consumer wanting only date conversion never inherits anyone's.
 *
 * @packageDocumentation
 */

import type { TraditionConfig } from "../traditions/types.js";
import type { TibetanDate } from "../types.js";

/**
 * Which calendar day carries an observance whose date is doubled.
 *
 * @remarks
 * A doubled date is one number shared by two consecutive calendar days, the first of which
 * almanacs mark "Extra". Both are the same Tibetan date, so this is not a question the arithmetic
 * can answer — Janson says so explicitly, and the institutions differ in practice.
 *
 * - `"first"` — the leap day. Janson's holidays section, citing Berzin. Kopan Monastery observed
 *   the 2024 Chokhor Duchen this way, on 9 July.
 * - `"second"` — the ordinary day. FPMT's published guidance, and what its own calendars print;
 *   the Liberation Prison Project calendar observed the same 2024 Chokhor Duchen on 10 July.
 * - `"both"` — emit an {@link Observance} for each. The honest option for a display that does not
 *   want to choose on the reader's behalf, and the one that reproduces FPMT's "July 9 or July 10".
 */
export type DoubledDayChoice = "first" | "second" | "both";

/**
 * What happens when an observance's date is skipped that month.
 *
 * @remarks
 * A skipped date is a number no calendar day carries. The two published sources agree here, which
 * they do not on doubled days: both Janson's holidays section and FPMT's guidance say the
 * observance moves to the **preceding** day.
 *
 * - `"preceding"` — the day before the missing number. Principled as well as sourced: the skipped
 *   number's lunar day begins and ends inside the calendar day numbered one lower, so that day
 *   does carry it astronomically even though it is not named for it.
 * - `"omit"` — no {@link Observance} at all. Correct for a caller who wants only exact matches,
 *   but it makes an annual observance vanish from a year, which no almanac does.
 */
export type SkippedDayChoice = "preceding" | "omit";

/**
 * Which of two months sharing a number carries an observance, in a year that has a leap month.
 *
 * @remarks
 * Janson's holidays section says observances are "usually not celebrated in leap months", with
 * the New Year the stated exception. FPMT's calendars do the opposite for the case this
 * repository has evidence for: the 2024 Chokhor Duchen is printed in leap month 6, and 4 of the
 * regular month 6 that follows carries no observance at all.
 *
 * Hence a setting rather than a rule. `"regular"` follows Janson, `"leap"` follows FPMT, and
 * `"both"` observes in each.
 */
export type LeapMonthChoice = "regular" | "leap" | "both";

/**
 * What kind of occasion an observance is.
 *
 * @remarks
 * The tradition's own categories, kept rather than flattened into one undifferentiated list,
 * because a consumer filtering for "the four great days" should not have to match on names.
 *
 * - `"duchen"` — a great occasion (*düchen* དུས་ཆེན་), commemorating an event in the Buddha's
 *   life. Merit is traditionally held to be multiplied on these.
 * - `"sojong"` — vow renewal (*sojong* གསོ་སྦྱོང་; Sanskrit *poṣadha* पोषध), on the full and new
 *   moon.
 * - `"tsok"` — a *tsok* ཚོགས་ offering (Sanskrit *gaṇacakra* गणचक्र), on the 10th and 25th.
 * - `"puja"` — a recurring dedicated practice, such as the Medicine Buddha and Tārā pujas on the
 *   8th or the protector puja on the 29th.
 * - `"anniversary"` — a teacher or lineage anniversary. **No data of this kind ships**; the kind
 *   exists so a caller can supply their own. See {@link ObservanceConfig}.
 */
export type ObservanceKind = "duchen" | "sojong" | "tsok" | "puja" | "anniversary";

/**
 * When an observance falls: a fixed date each year, or a day number every month.
 *
 * @remarks
 * These are the only two shapes the sources use. A Gregorian-fixed anniversary — FPMT prints the
 * Dalai Lama's birthday on 6 July — is deliberately not expressible: it is not a Tibetan calendar
 * fact, and a consumer already has `Temporal.PlainDate` for it.
 */
export type ObservanceWhen =
	| { readonly month: number; readonly day: number }
	| { readonly day: number };

/** One observance rule. */
export interface ObservanceRule {
	/** Stable identifier, e.g. `"chokhor-duchen"`. Unique within a config. */
	readonly id: string;

	/** English name, as the source gives it. */
	readonly name: string;

	/** What kind of occasion this is. */
	readonly kind: ObservanceKind;

	/**
	 * Who may keep it: 1 universal, 2 general practice, 3 requires empowerment.
	 *
	 * @remarks
	 * Advisory metadata for a consumer to filter on. The calendar cannot know what a given
	 * practitioner holds, which is why this is a property of the observance rather than a
	 * judgement about the reader.
	 */
	readonly tier: 1 | 2 | 3;

	/** A fixed month and day each year, or a day number recurring every month. */
	readonly when: ObservanceWhen;

	/** Overrides the config's {@link ObservanceConfig.doubledDay} for this rule alone. */
	readonly doubledDay?: DoubledDayChoice;

	/** Overrides the config's {@link ObservanceConfig.skippedDay} for this rule alone. */
	readonly skippedDay?: SkippedDayChoice;

	/** Overrides the config's {@link ObservanceConfig.leapMonth} for this rule alone. */
	readonly leapMonth?: LeapMonthChoice;

	/**
	 * Where this rule comes from.
	 *
	 * @remarks
	 * Required, and required for consumer-supplied rules too. `CONTRIBUTING.md` asks for a
	 * citation per fixture row; putting it in the published type carries that discipline outward,
	 * so a rule invented from memory is at least conspicuously uncited.
	 */
	readonly source: string;
}

/**
 * A named set of observance rules with the conventions to resolve them.
 *
 * @remarks
 * Plain data, like `PHUGPA`, so an institution that differs spreads one rather than subclassing:
 *
 * ```ts
 * const kopan = { ...DEFAULT_OBSERVANCES, id: "kopan", doubledDay: "first" as const };
 * ```
 *
 * **Teacher anniversaries are not shipped.** {@link ObservanceKind} includes `"anniversary"` so a
 * caller can add them, but the data is institution-specific and changes within a decade — a new
 * spiritual director adds a row — and a zero-dependency computation engine should not need a
 * release when it does.
 */
export interface ObservanceConfig {
	/** Stable identifier, e.g. `"gelug"`. */
	readonly id: string;

	/** Human-readable name. */
	readonly name: string;

	/** The rules. Order does not matter; results are returned in date order. */
	readonly rules: readonly ObservanceRule[];

	/** Default for rules that do not set {@link ObservanceRule.doubledDay}. */
	readonly doubledDay: DoubledDayChoice;

	/** Default for rules that do not set {@link ObservanceRule.skippedDay}. */
	readonly skippedDay: SkippedDayChoice;

	/** Default for rules that do not set {@link ObservanceRule.leapMonth}. */
	readonly leapMonth: LeapMonthChoice;
}

/**
 * How an observance came to land on the day it did.
 *
 * @remarks
 * Reported so a consumer can show the almanac-style footnote rather than presenting a moved date
 * as if it were exact. `"shiftedFromSkipped"` in particular is worth surfacing: the observance is
 * a day earlier than its nominal date, and a practitioner will want to know why.
 */
export type ObservanceResolution =
	| "exact"
	| "shiftedFromSkipped"
	| "firstOfDoubled"
	| "secondOfDoubled";

/** One occurrence of one rule on one calendar day. */
export interface Observance {
	/** The day it falls on. Always a real calendar day. */
	readonly date: TibetanDate;

	/**
	 * The rule that produced it.
	 *
	 * @remarks
	 * The **same object** the config holds, not a copy — so for a consumer-supplied config,
	 * mutating this mutates their own rule table. `readonly` says so at compile time; the shipped
	 * `DEFAULT_OBSERVANCES` is deeply frozen, so this aliases a frozen object there.
	 */
	readonly rule: ObservanceRule;

	/** How it landed here. */
	readonly resolution: ObservanceResolution;
}

/**
 * Options for {@link getObservances} and {@link observancesOn}.
 *
 * @remarks
 * A bag rather than two sequential optional parameters, which is what these took until
 * 2026-08-26. That shape made a caller wanting a custom tradition with the default observances
 * write `getObservances(from, to, undefined, myTradition)` — passing `undefined` positionally to
 * reach past a parameter they had no opinion about. It was the only two-sequential-optionals
 * defect on the surface, and free to fix before 1.0.0.
 *
 * {@link addMonthsToDate} takes the same shape, which makes the bag this surface's stated pattern
 * for a function with two axes of choice rather than a one-off exception to uniformity.
 */
export interface ObservanceQueryOptions {
	/**
	 * Which observances, and the conventions for resolving them.
	 * Defaults to {@link DEFAULT_OBSERVANCES}.
	 */
	config?: ObservanceConfig;

	/** Astronomical constants. Defaults to `PHUGPA`. */
	tradition?: TraditionConfig;
}
