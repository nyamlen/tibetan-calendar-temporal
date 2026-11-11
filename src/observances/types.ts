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
 * published calendars. FPMT says the second, and its own calendars place the 2024 Chokhor Duchen
 * there, on 10 July. Kopan Monastery observed the same Chokhor Duchen on the 9th.
 *
 * That is not a defect in the sources. It is what a convention looks like. So this layer holds
 * conventions as **injected data carrying a citation**, never as logic, and ships behind its own
 * subpath so that a consumer wanting only date conversion never inherits anyone's.
 *
 * @packageDocumentation
 */

import type { TibetanDate, TibetanName } from "../types.js";

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
 * - `"following"` — the day after the one carrying the number below the missing one, so a skipped 30
 *   rolls into the next month's first day, and a skipped day followed by a doubled one lands on the
 *   first half of the doubled day. Not sourced by either publication above: it is the choice for a
 *   tradition that moves a skipped observance later.
 * - `"omit"` — no {@link Observance} at all. Correct for a caller who wants only exact matches,
 *   but it makes an annual observance vanish from a year, which no almanac does.
 */
export type SkippedDayChoice = "preceding" | "following" | "omit";

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
 * A Tibetan month and day, the date an annual observance is fixed to.
 *
 * @remarks
 * `month` is the month's number, 1-12; whether a leap month of that number carries the observance
 * is the {@link ObservanceConfig.leapMonth} convention's question, never a field here. A date
 * entry with any other key — `isLeapMonth` above all — is refused rather than read as the month
 * alone.
 */
export type TibetanMonthDay = { readonly month: number; readonly day: number };

/**
 * When an observance falls, as one of a small set of forms discriminated by `type`.
 *
 * @remarks
 * - `"monthly"` — on each of the listed day numbers, every month. A leap month's pair both carry
 *   it, because the leap-month convention is about observances that have one occurrence a year.
 * - `"annual"` — on each of the listed Tibetan month-and-day dates, once a year.
 * - `"western"` — on a Gregorian month and day, once a year: FPMT prints the Dalai Lama's birthday
 *   on 6 July, which is not a Tibetan calendar fact. A 29 February occurs in leap years only and is
 *   not moved in the others. It reads no per-rule setting, and its results are always `"exact"`.
 *
 * `annual` and `western` take a year window, `fromYear` and `untilYear` (both inclusive; absent
 * means unbounded), and `ageFromYear`. **Each counts its own form's calendar**: on `annual` a
 * Tibetan year, numbered as {@link TibetanDate.year} is (2153 is the year that begins on
 * 2026-02-18 CE); on `western` a Western year. The year tested is that of the occurrence's
 * **resolved** date, after the leap-month, doubled-day and skipped-day conventions have chosen the
 * day. A Tibetan month-12 date can therefore fall in January: 2026-01-31 is Tibetan 2152, so
 * `untilYear: 2152` keeps it and `untilYear: 2151` does not, whatever its Western year.
 *
 * **This union is open to additions.** Further forms may be added in a minor release, so a
 * consumer switching on `type` handles an unknown value with a `default` branch.
 */
export type ObservanceWhen =
	| {
			readonly type: "monthly";
			readonly days: readonly number[];
	  }
	| {
			readonly type: "annual";
			readonly dates: readonly TibetanMonthDay[];
			/** First Tibetan year (inclusive) the observance is kept, numbered as `TibetanDate.year`. */
			readonly fromYear?: number;
			/** Last Tibetan year (inclusive) the observance is kept, numbered as `TibetanDate.year`. */
			readonly untilYear?: number;
			/** The Tibetan year counted as age 0; see {@link Observance.age}. */
			readonly ageFromYear?: number;
	  }
	| {
			readonly type: "western";
			/** Gregorian month, 1-12. */
			readonly month: number;
			/** Day of that month; 29 February is accepted and occurs in leap years only. */
			readonly day: number;
			/** First Western year (inclusive) the observance is kept. */
			readonly fromYear?: number;
			/** Last Western year (inclusive) the observance is kept. */
			readonly untilYear?: number;
			/** The Western year counted as age 0; see {@link Observance.age}. */
			readonly ageFromYear?: number;
	  };

/**
 * A named grouping of rules, declared once on the config and named by each rule's
 * {@link ObservanceRule.level}.
 *
 * @remarks
 * The engine never acts on a level. It is a label a consumer filters or groups by, declared so that
 * a rule naming one that does not exist is an error rather than a silent typo.
 */
export interface ObservanceLevel {
	/** Identifier a rule names in {@link ObservanceRule.level}. Unique within a config. */
	readonly id: string;

	/** English name. */
	readonly englishName: string;

	/** The Tibetan name, where there is one. */
	readonly tibetanName?: TibetanName;
}

/** One observance rule. */
export interface ObservanceRule {
	/** Stable identifier, e.g. `"chokhor-duchen"`. Unique within a config. */
	readonly id: string;

	/** English name. */
	readonly englishName: string;

	/** The Tibetan name, where there is one. */
	readonly tibetanName?: TibetanName;

	/** The id of one of the config's {@link ObservanceConfig.levels}. */
	readonly level?: string;

	/**
	 * Free labels for a consumer to filter on, distinct and non-empty. The engine never acts on one.
	 */
	readonly tags?: readonly string[];

	/** When the observance falls. */
	readonly when: ObservanceWhen;

	/** Overrides the config's {@link ObservanceConfig.doubledDay} for this rule alone. */
	readonly doubledDay?: DoubledDayChoice;

	/** Overrides the config's {@link ObservanceConfig.skippedDay} for this rule alone. */
	readonly skippedDay?: SkippedDayChoice;

	/** Overrides the config's {@link ObservanceConfig.leapMonth} for this rule alone. */
	readonly leapMonth?: LeapMonthChoice;
}

/**
 * A named set of observance rules with the conventions to resolve them.
 *
 * @remarks
 * Plain data, like `PHUGPA`, so an institution that differs spreads one rather than subclassing:
 *
 * ```ts
 * const kopan = { ...EXAMPLE_OBSERVANCES, id: "kopan", doubledDay: "first" as const };
 * ```
 *
 * It is a required argument of every query: no config is the default, because which days a
 * practice keeps is a convention and the package does not choose one for a caller.
 *
 * **An object carrying a key this type does not have is refused**, naming the key, so a config
 * written for an earlier shape fails rather than being half-read.
 */
export interface ObservanceConfig {
	/** Stable identifier, e.g. `"example"`. */
	readonly id: string;

	/** English name. */
	readonly englishName: string;

	/** The Tibetan name, where there is one. */
	readonly tibetanName?: TibetanName;

	/** Default for rules that do not set {@link ObservanceRule.doubledDay}. */
	readonly doubledDay: DoubledDayChoice;

	/** Default for rules that do not set {@link ObservanceRule.skippedDay}. */
	readonly skippedDay: SkippedDayChoice;

	/** Default for rules that do not set {@link ObservanceRule.leapMonth}. */
	readonly leapMonth: LeapMonthChoice;

	/** The levels rules may name. A rule naming a level not declared here is refused. */
	readonly levels?: readonly ObservanceLevel[];

	/** The rules. Order does not matter; results are returned in date order. */
	readonly rules: readonly ObservanceRule[];
}

/**
 * How an observance came to land on the day it did.
 *
 * @remarks
 * Reported so a consumer can show the almanac-style footnote rather than presenting a moved date
 * as if it were exact. `"dayBeforeSkipped"` and `"dayAfterSkipped"` in particular are worth surfacing: the
 * observance is a day away from its nominal date, and a practitioner will want to know why.
 */
export type ObservanceResolution =
	| "exact"
	| "dayBeforeSkipped"
	| "dayAfterSkipped"
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
	 * `EXAMPLE_OBSERVANCES` is deeply frozen, so this aliases a frozen object there.
	 */
	readonly rule: ObservanceRule;

	/** How it landed here. */
	readonly resolution: ObservanceResolution;

	/**
	 * Years since the rule's `ageFromYear`: the occurrence's year minus it, in the form's own
	 * calendar — Tibetan years on `annual`, Western on `western`. Absent when the rule names no
	 * `ageFromYear`, and absent rather than negative before it.
	 */
	readonly age?: number;
}
