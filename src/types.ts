/**
 * The public data shapes: {@link TibetanDate}, its input counterpart
 * {@link TibetanDateInput}, and {@link SkippedDayError}.
 *
 * @remarks
 * ## How this shape is organised
 *
 * Two axes, and the distinction between them is load-bearing:
 *
 * - **Date components are flat**, because `Temporal.PlainDate` is flat — `.year`, `.month`,
 *   `.day`, `.monthCode`. This package is Temporal-native, and a consumer moving between a
 *   `TibetanDate` and a `Temporal.PlainDate` should not have to learn a second access
 *   pattern.
 * - **Naming systems are grouped under a `*Name` field.** Today that is
 *   {@link TibetanYearName}. If Janson's Appendix E month-level and day-level naming is ever
 *   added, it lands as `monthName` and `dayName` — parallel, and a non-breaking addition.
 *
 * Grouping everything instead — `year.number`, `month.code`, `day.isLeap` — was considered and
 * rejected. It is more uniform, but it makes `month` an object where `Temporal.PlainDate.month`
 * is a number, which fails silently: `date.month === 11` is quietly `false` and
 * `` `${date.month}` `` renders `[object Object]`.
 *
 * @packageDocumentation
 */

import { rangeError, type TibetanCalendarErrorCode } from "./errors.js";
import { formatTibetanDate } from "./format.js";

/**
 * The five elements of the 60-year cycle, in the order of Janson's ten-year cycle table (§4).
 *
 * @remarks
 * Each element occupies two consecutive years of the ten-year cycle, one male and one female.
 *
 * These are **not** simply the Chinese celestial stems renamed. The Chinese cycle names years by
 * ten stems (*jiǎ*, *yǐ*, *bǐng*, …), each of which merely associates with an element and a
 * gender; Janson notes that "in the Tibetan calendar, the element and gender are used to name
 * the year; the Chinese celestial stems are usually not used". The values also differ in
 * rendering: the Chinese *wǔxíng* 金 is conventionally *metal*, where the Tibetan
 * (*lcags* ལྕགས) is **iron**. Hence `Tibetan`, not `Chinese`, in the name.
 */
export type TibetanElement = "wood" | "fire" | "earth" | "iron" | "water";

/**
 * The twelve animals of the 60-year cycle, in the order of Janson's twelve-year cycle table (§4).
 *
 * @remarks
 * Unlike {@link TibetanElement}, this cycle *is* one-to-one with the Chinese one — same twelve
 * animals, same order, same phase; Janson calls it "the well-known cycle of animals found in the
 * Chinese and many other Asian calendars". The prefix is for consistency with the rest of the
 * package rather than to claim a distinct cycle.
 *
 * The English renderings are Janson's, following Henning. Common variants are Mouse/Rat,
 * Bird/Rooster and Sheep/Goat.
 *
 * These are the *year* animals, which Phugpa and Tsurphu share. The traditions disagree about
 * animal names for **months** — Phugpa sets month 11 = Tiger, Tsurphu month 1 = Tiger — but
 * month naming is not computed by this package.
 */
export type TibetanAnimal =
	| "mouse"
	| "ox"
	| "tiger"
	| "rabbit"
	| "dragon"
	| "snake"
	| "horse"
	| "sheep"
	| "monkey"
	| "bird"
	| "dog"
	| "pig";

/** The alternating gender of the 60-year cycle — Chinese *yin* and *yang*. */
export type TibetanGender = "male" | "female";

/**
 * Position in the rabjung (*rab byung*), the Indian 60-year cycle.
 *
 * @remarks
 * This is a **numbering**, not a name — the distinction that keeps it separate from
 * {@link TibetanYearName}. Janson §4 is explicit: the Indian cycles are numbered, so cycle plus
 * position identifies a year unambiguously, whereas "the Chinese cycles are not numbered in the
 * Tibetan calendar" and are used only as names.
 *
 * Keeping the two apart is not tidiness. The cycles assign a year **different positions**:
 * 2026 is year 40 of the Indian cycle but year 43 of the Chinese one (Janson App. B, the 60-year cycle table). Held in
 * one object, the number 40 would sit directly beside `fire`/`horse` without indexing it —
 * position 40 indexes *parābhava*. A 60-entry lookup keyed on that number is wrong for 57 of
 * every 60 years, and wrong quietly.
 *
 * The two fields are grouped rather than flattened to `rabjungCycle` / `rabjungYear` because
 * they are only meaningful together — unlike `year` and `yearStartsIn`, each of which stands
 * alone — and because this object is where the cycle's names will go if they are added later.
 *
 * @see {@link TibetanYearName} for the element–animal name, which is what practitioners
 * normally use.
 */
export interface Rabjung {
	/**
	 * Which rabjung cycle, counting the cycle beginning in 1027 CE as 1.
	 *
	 * @remarks
	 * Cycle 17 runs 1987–2046. Computed as `⌈(Y − 1026) / 60⌉` where `Y` is
	 * {@link TibetanDate.yearStartsIn}.
	 */
	cycle: number;

	/**
	 * Position within the cycle, 1–60, where 1 is *rab byung* (Prabhava) itself.
	 *
	 * @remarks
	 * Computed as `(Y − 1026) amod 60`. This is an index into a list of 60 Tibetan and Sanskrit
	 * names which this package does **not** currently expose, because Janson's transliterations
	 * collide (three distinct names render as `pramadi`) and the Hindu saṃvatsara list diverges
	 * from the Tibetan one in content rather than only spelling. See "Why the 60 rabjung names
	 * are not included" in `docs/architecture.md`.
	 *
	 * Do not assume this indexes the element–animal name — it does not, and the offset is three.
	 */
	year: number;
}

/**
 * The name of a Tibetan year in the Chinese 60-year cycle: element, gender and animal.
 *
 * @remarks
 * This is what practitioners actually recognise — "Fire–Horse" — and is a **name**, not a
 * numbering. It is valid from 1027 CE onward, which makes it the culturally correct label for
 * historical dates where {@link TibetanDate.year}'s royal-era numbering is a modern
 * back-projection.
 *
 * The gender is often omitted in speech, "Fire–Horse" being used for "Fire–male–Horse".
 */
export interface TibetanYearName {
	/** One of the five elements. Computed as `⌈z / 2⌉` where `z = (Y − 3) amod 10`. */
	element: TibetanElement;

	/** One of the twelve animals. Computed as `(Y − 3) amod 12`. */
	animal: TibetanAnimal;

	/**
	 * The year's gender.
	 *
	 * @remarks
	 * Redundant, and deliberately so. Janson notes the gender is the year modulo 2 and is
	 * therefore already determined by the animal — every Horse year is male, every Sheep year
	 * female. It is stored anyway because almanacs print it as part of the name and because
	 * recomputing it at every call site is worse than one derived field. This interface models a
	 * name as printed, not a minimal encoding.
	 */
	gender: TibetanGender;
}

/**
 * A single day in the Tibetan calendar, as produced by `isoToTibetan`.
 *
 * @remarks
 * Every instance describes a **real calendar day**. Skipped dates — numbers that no calendar
 * day carries — can never be represented here; that is why there is no `isSkippedDay` field.
 * See {@link SkippedDayError}.
 *
 * Do not format this by hand as `` `${year}-${month}-${day}` ``. That produces a well-formed
 * ISO-looking string which is not an ISO date, and which silently loses leap-month and
 * doubled-day information. Use the package's formatting function.
 */
export interface TibetanDate {
	/**
	 * The year in the royal-era numbering, counting from the 127 BC epoch.
	 *
	 * @remarks
	 * This is the number Tibetan almanacs print — 2153, not 2026. It is **not** Janson's *Y*;
	 * see {@link TibetanDate.yearStartsIn} for that, and do not "correct" this field to match
	 * the paper. The relationship is `year = yearStartsIn + 127`, applied only at the public
	 * boundary; everything under `computation/` works in *Y*.
	 *
	 * For historical dates this is a modern label applied backwards. The royal-era count is a
	 * convention of the second half of the twentieth century, and Janson records that epochs of
	 * 255 and 1027 have also been used. It is not wrong, but it asserts a numbering that nobody
	 * alive at the time used — {@link TibetanDate.yearName} is the culturally correct label for
	 * such dates.
	 */
	year: number;

	/**
	 * Janson's *Y*: the Gregorian year in which this Tibetan year begins.
	 *
	 * @remarks
	 * Exposed for cross-referencing the paper and other implementations, which are uniformly
	 * written in terms of *Y*. Because a Tibetan year starts in February or early March, this
	 * differs from `isoDate.year` for dates in January and February.
	 */
	yearStartsIn: number;

	/** Position in the Indian 60-year cycle. A numbering — see {@link Rabjung}. */
	rabjung: Rabjung;

	/** The element–animal name from the Chinese 60-year cycle. See {@link TibetanYearName}. */
	yearName: TibetanYearName;

	/**
	 * Month number, 1–12.
	 *
	 * @remarks
	 * A leap month carries the **same number as the month that follows it**, so in a leap year
	 * two months share a number and the first of them is the leap month. The number alone is
	 * therefore not a unique key within a year; pair it with {@link TibetanDate.isLeapMonth}, or
	 * use {@link TibetanDate.monthCode}.
	 */
	month: number;

	/**
	 * The month as a Temporal-style code: `"M01"` through `"M12"`, with an `L` suffix for a leap
	 * month, e.g. `"M01L"`.
	 *
	 * @remarks
	 * Unlike {@link TibetanDate.month} this is unique within a year, which makes it the safe key
	 * for grouping or sorting.
	 */
	monthCode: string;

	/** Whether this is a leap month — the first of the two months sharing this number. */
	isLeapMonth: boolean;

	/**
	 * Day number within the month, 1–30.
	 *
	 * @remarks
	 * Numbered by the lunar day current at the calendar day's start, so the sequence is not
	 * always contiguous: a number may be skipped, or carried by two consecutive calendar days.
	 */
	day: number;

	/**
	 * Whether this day's number is shared with an adjacent calendar day.
	 *
	 * @remarks
	 * `true` on **both** days of the pair. To distinguish them, use
	 * {@link TibetanDate.isLeapDay} or the differing {@link TibetanDate.dayOfWeek}.
	 */
	isDoubledDay: boolean;

	/**
	 * Whether this is the **first** day of a doubled pair — the one almanacs mark "Extra".
	 *
	 * @remarks
	 * Always `false` when {@link TibetanDate.isDoubledDay} is `false`. Two booleans are needed
	 * rather than one because a consumer must be able to answer both "is this number shared" and
	 * "which of the two is this", and no single flag says both.
	 *
	 * Which of the two an observance falls on is a **convention, and the sources disagree**. FPMT's
	 * dharma-dates guidance says such days are "usually celebrated on the second day, but may be
	 * celebrated on the first day if it is more convenient". Janson §11, holidays, following Berzin,
	 * gives the opposite rule — the first, this leap day — while noting he has not checked it
	 * against published calendars. Neither is derivable from the arithmetic, so this package makes
	 * it a caller's choice rather than picking one.
	 *
	 * The Tibetan New Year is **not** an exception to this. Janson's Losar remark concerns leap
	 * *months* — Losar is the first day of the year even when that year opens with a leap month 1,
	 * where other observances are usually not kept in a leap month at all. That is a separate axis
	 * from which half of a doubled day an observance falls on, and conflating the two is easy.
	 */
	isLeapDay: boolean;

	/**
	 * Whether the true full moon falls in this calendar day.
	 *
	 * @remarks
	 * Janson §6 defines the full moon as the instant ending lunar day 15, so the calendar day
	 * carrying it is `⌊true_date(15, n)⌋` — the same expression that labels every other day. Do
	 * **not** substitute `day === 15`: that is right only when 15 is not skipped, and wrong
	 * precisely in the months where it is.
	 *
	 * When 15 is skipped, lunar days 14 and 15 both end in one calendar day, which by the labelling
	 * rule takes the earlier name. The full moon is then carried by the day numbered **14**.
	 *
	 * Janson notes the true elongation differs from the astronomical value by about 2°, roughly
	 * four hours, so this usually — but not always — agrees with the astronomical full moon.
	 */
	isFullMoon: boolean;

	/**
	 * Whether the true new moon falls in this calendar day.
	 *
	 * @remarks
	 * The counterpart of {@link TibetanDate.isFullMoon}: the new moon is the instant ending lunar
	 * day 30, which is also where the lunar month ends. The same caveats apply — `day === 30` is
	 * wrong when 30 is skipped, and when 30 is doubled the new moon falls in the **second** of the
	 * pair, not the leap day.
	 */
	isNewMoon: boolean;

	/**
	 * The corresponding Western calendar day.
	 *
	 * @remarks
	 * Proleptic Gregorian, because that is what `Temporal.PlainDate` is. The civil Gregorian
	 * calendar begins in 1582, so for earlier dates this is a third back-projection alongside
	 * the royal-era numbering and Phugpa itself: historical sources give Julian dates, which
	 * diverge by about ten days at 1582 and more before that.
	 */
	isoDate: Temporal.PlainDate;

	/**
	 * ISO day of week: 1 = Monday through 7 = Sunday.
	 *
	 * @remarks
	 * Deliberately the ISO numbering rather than Janson's, which runs 0 = Saturday through
	 * 6 = Friday. The Tibetan and Western weekdays are the same seven-day cycle, so no
	 * information is lost, and matching `Temporal.PlainDate.dayOfWeek` avoids an off-by-two that
	 * would be invisible in most tests.
	 */
	dayOfWeek: number;
}

/**
 * One month of a Tibetan year, as produced by `monthsFor`.
 *
 * @remarks
 * Every instance describes a real, contiguous span of calendar days. The months of a year tile it
 * exactly: the first begins at Losar and the last ends the day before the next Losar, with no gap
 * and no overlap.
 *
 * Three things about this shape mislead if skimmed, and each is a way to build a wrong calendar.
 *
 * **{@link TibetanMonth.days} counts calendar days, not date numbers.** The numbering always runs
 * 1–30; the *span* is 29 or 30 days, because some numbers are skipped and some are carried by two
 * consecutive days. So `for (let d = 1; d <= days; d++)` is wrong and produces a silently bad grid.
 * Walk {@link TibetanMonth.firstDay} to {@link TibetanMonth.lastDay} and call `isoToTibetan` on
 * each — which is also the right model for a UI, since a grid holds one cell per calendar day.
 *
 * **{@link TibetanMonth.month} is not a unique key within the year.** In a leap year two months
 * share a number. {@link TibetanMonth.monthCode} is the unique one.
 *
 * **The year is Tibetan, not Gregorian.** It opens in February or early March, so it straddles two
 * ISO years.
 */
export interface TibetanMonth {
	/**
	 * Month number, 1–12.
	 *
	 * @remarks
	 * A leap month carries the same number as the month that follows it, so in a leap year this
	 * appears twice and the leap one comes first.
	 */
	month: number;

	/**
	 * The month as a Temporal-style code: `"M01"` through `"M12"`, with an `L` suffix for a leap
	 * month. Unique within the year, unlike {@link TibetanMonth.month}.
	 */
	monthCode: string;

	/** Whether this is the leap month — the first of the two sharing this number. */
	isLeapMonth: boolean;

	/**
	 * How many **calendar days** this month spans: 29 or 30.
	 *
	 * @remarks
	 * Not the highest date number, which is always 30. See the remarks on {@link TibetanMonth}.
	 */
	days: number;

	/**
	 * The Western calendar day this month begins on.
	 *
	 * @remarks
	 * Computed from the previous month's last day rather than by evaluating date 1, because date 1
	 * may be skipped or doubled. Janson §8 notes that evaluating it directly is the source of errors
	 * in published tables.
	 */
	firstDay: Temporal.PlainDate;

	/** The Western calendar day this month ends on. */
	lastDay: Temporal.PlainDate;
}

/**
 * Rejects a `Temporal.PlainDate`, `PlainDateTime` or `ZonedDateTime` passed where a Tibetan-date
 * input is expected.
 *
 * @remarks
 * `TibetanDateInput` and `Temporal.PlainDate` are structurally close enough — both are plain
 * objects exposing numeric `year`, `month` and `day` — that nothing stops a caller from handing a
 * Western date to a Tibetan-date entry point. Nothing crashes: `tibetanToIso` reads the same three
 * fields off a `PlainDate` that it would off a real `TibetanDateInput`, and returns a confident,
 * silently wrong Tibetan date. This check runs before any field validation, which would otherwise
 * accept a `PlainDate`'s in-range numeric fields without complaint.
 *
 * The runtime half of the defence; {@link TibetanDateInput.calendarId} and
 * {@link TibetanMonthInput.calendarId} are the compile-time half, for callers who stay inside the
 * type system. This half is what catches JavaScript callers, `any`, and casts.
 *
 * Shared across every Tibetan-date entry point — `tibetanToIso`, `tibetanDateExists`,
 * `formatTibetanDate`, `daysInMonth` — so the message and the code are one policy rather than four.
 * `tibetanDateExists` calls this itself, before its own `try`, in addition to `tibetanToIso`
 * calling it again internally: `TCT_FIELD_OUT_OF_RANGE` is on that function's allowlist for
 * answering `false`, so a Temporal instance caught inside the `try` would be swallowed into
 * "that date does not exist" rather than thrown out to the caller who confused the two APIs.
 */
export function rejectTemporalInstance(functionName: string, value: unknown): void {
	if (
		value instanceof Temporal.PlainDate ||
		value instanceof Temporal.PlainDateTime ||
		value instanceof Temporal.ZonedDateTime
	) {
		throw rangeError(
			"TCT_FIELD_OUT_OF_RANGE",
			`${functionName}: received a Temporal.${value.constructor.name}, which names a Western ` +
				"calendar day, not a Tibetan one. Did you mean isoToTibetan(date)?",
		);
	}
}

/** A value rendered short enough for a message, and unambiguously: `"3"` is not `3`. */
function describeFlagValue(value: unknown): string {
	if (typeof value === "string") return JSON.stringify(value);
	return String(value);
}

/**
 * Rejects an `isLeapMonth` or `isLeapDay` flag that is present but not a boolean.
 *
 * @remarks
 * Both flags are read as `value.isLeapMonth ?? false` / `value.isLeapDay ?? false` and then used
 * for truthiness, so a non-boolean that is merely *absent-like* — the string `"false"`, the
 * number `0`'s sibling `1`, a stray object — is truthy and silently selects the leap month or
 * leap day. `0` and `""` would happen to fall out falsy and do the right thing by accident; `1`,
 * `"false"` and everything else would not, and the failure is silent because nothing throws.
 *
 * `undefined` is deliberately still accepted here: the fields are optional and default to
 * `false`, and this check only narrows their *type* when present, not their *presence*.
 *
 * Also the null/non-object guard for the three entry points that lacked one: `tibetanToIso`,
 * `daysInMonth` and `tibetanDateExists` (via delegation) all read a field off their input before
 * this function returned, so `null` or `undefined` reached `input.year` and threw an uncoded
 * native `TypeError` instead of this package's `TCT_FIELD_OUT_OF_RANGE` — `formatTibetanDate` was
 * the only one of the four that already guarded this. Checking it here, once, closes it for all
 * three at the shared point rather than adding the same guard three times.
 *
 * Shared across the same four entry points as {@link rejectTemporalInstance}, for the same
 * reason: one policy for the message and the code rather than four. `tibetanDateExists` calls
 * this itself, before its own `try`, in addition to `tibetanToIso` calling it again internally —
 * `TCT_FIELD_OUT_OF_RANGE` is on that function's allowlist for answering `false`, so a bad-typed
 * flag caught inside the `try` would be swallowed into "that date does not exist" rather than
 * thrown out to the caller who passed the wrong type.
 */
export function rejectInvalidLeapFlags(
	functionName: string,
	value: { isLeapMonth?: unknown; isLeapDay?: unknown } | null | undefined,
): void {
	if (value === null || typeof value !== "object") {
		throw rangeError(
			"TCT_FIELD_OUT_OF_RANGE",
			`${functionName}: expected an object naming a Tibetan date, received ${describeFlagValue(value)}`,
		);
	}
	for (const field of ["isLeapMonth", "isLeapDay"] as const) {
		const flag = value[field];
		if (flag !== undefined && typeof flag !== "boolean") {
			const noun = field === "isLeapMonth" ? "month" : "day";
			throw rangeError(
				"TCT_FIELD_OUT_OF_RANGE",
				`${functionName}: ${field} must be a boolean or omitted, received ${describeFlagValue(flag)}. ` +
					`A string like "false" is truthy, so a non-boolean here would silently select the leap ${noun} ` +
					"instead of being rejected.",
			);
		}
	}
}

/**
 * The identifying fields needed to name a Tibetan month, as accepted by `daysInMonth`.
 *
 * @remarks
 * Both {@link TibetanDate} and {@link TibetanDateInput} are assignable to this, so a value from
 * `isoToTibetan` can be passed straight in — the extra `day` is simply ignored.
 */
export interface TibetanMonthInput {
	/** Royal-era year, matching {@link TibetanDate.year}. Not Janson's *Y*. */
	year: number;

	/** Month number, 1–12. Pair with `isLeapMonth` in a leap year. */
	month: number;

	/**
	 * Select the leap month when two months share this number.
	 *
	 * @defaultValue `false` — the regular month, which is the second of the two.
	 */
	isLeapMonth?: boolean;

	/**
	 * Always absent. Present only to reject `Temporal.PlainDate`, `PlainDateTime` and
	 * `ZonedDateTime` at compile time.
	 *
	 * @remarks
	 * All three classes declare `readonly calendarId: string` (checked against
	 * `lib.esnext.temporal.d.ts` and confirmed at runtime on Node v26.7.0, where all three return
	 * `"iso8601"`). `string` does not satisfy `never`, so a `Temporal.PlainDate` stops being
	 * structurally assignable to this type — closing the compile-time half of the confusion that
	 * {@link rejectTemporalInstance} closes at runtime. Do not delete this as an unused field: it
	 * has no reads because its entire job is to make an *invalid* call fail to typecheck.
	 */
	calendarId?: never;
}

/**
 * The identifying fields needed to name a Tibetan date, as accepted by `tibetanToIso`.
 *
 * @remarks
 * A {@link TibetanDate} is assignable to this type, so a value obtained from `isoToTibetan` can
 * be passed straight back in.
 */
export interface TibetanDateInput {
	/**
	 * Royal-era year, matching {@link TibetanDate.year}.
	 *
	 * @remarks
	 * Not Janson's *Y*. Passing 2026 where 2153 is meant yields a date 127 years away — an error
	 * loud enough to be caught immediately, which is part of why this numbering was chosen.
	 */
	year: number;

	/** Month number, 1–12. Pair with `isLeapMonth` in a leap year. */
	month: number;

	/** Day number, 1–30. */
	day: number;

	/**
	 * Select the leap month when two months share this number.
	 *
	 * @defaultValue `false` — the regular month, which is the second of the two.
	 */
	isLeapMonth?: boolean;

	/**
	 * Select the first day when two calendar days share this number.
	 *
	 * @defaultValue `false` — the ordinary second day. Without this, a doubled date would be
	 * ambiguous and the conversion would have to guess.
	 *
	 * @remarks
	 * **Ignored on a day that is not doubled**, which returns that day as though the flag were
	 * absent rather than throwing. This is deliberate: a caller iterating dates and setting the
	 * flag from a previous result should not have to check whether each target happens to be
	 * doubled, and unlike a skipped date there is no ambiguity to resolve — the day exists and
	 * exactly one calendar day carries it.
	 */
	isLeapDay?: boolean;

	/**
	 * Always absent. Present only to reject `Temporal.PlainDate`, `PlainDateTime` and
	 * `ZonedDateTime` at compile time.
	 *
	 * @remarks
	 * See {@link TibetanMonthInput.calendarId} — the same field, for the same reason. Do not
	 * delete this as an unused field: it has no reads because its entire job is to make an
	 * *invalid* call fail to typecheck.
	 */
	calendarId?: never;
}

/**
 * Thrown by `tibetanToIso` when the requested date is a **skipped** date.
 *
 * @remarks
 * A skipped date is a number that no calendar day carries: it happens when a lunar day begins
 * and ends inside a single calendar day, so the labelling rule of Janson §6 never assigns its
 * number. Such dates appear in written sources and in user input, but they correspond to no
 * day, so there is nothing for a conversion to return.
 *
 * This is an error rather than a `null` return because a skipped date is almost always a data
 * problem worth surfacing. Callers who want to test first should use `tibetanDateExists`.
 *
 * The only error class this package exports. Everything else discriminates on
 * {@link SkippedDayError.code} and its siblings — see `src/errors.ts` for why.
 */
export class SkippedDayError extends Error {
	/** The date that was requested and does not exist. */
	readonly requested: TibetanDateInput;

	/**
	 * Always `"TCT_SKIPPED_DAY"`.
	 *
	 * @remarks
	 * Redundant with `instanceof SkippedDayError`, and present so that a caller handling several
	 * failure kinds can switch on `error.code` throughout rather than mixing the two styles.
	 */
	readonly code: TibetanCalendarErrorCode = "TCT_SKIPPED_DAY";

	constructor(requested: TibetanDateInput) {
		// Through the canonical formatter, not hand-rolled. This message used to print
		// `2150-12-29` — no `M`, so indistinguishable from an ISO date by eye — and used the
		// ` (leap)` suffix for a leap *month* where `formatTibetanDate` uses it for a leap *day*.
		// Two incompatible renderings of a date inside one package is exactly what that function's
		// docblock argues against, and this was the second one.
		super(`Tibetan date ${formatTibetanDate(requested)} is skipped: no calendar day carries it.`);
		this.name = "SkippedDayError";
		this.requested = requested;
	}
}
