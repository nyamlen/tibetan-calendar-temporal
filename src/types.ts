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
	 * names which this package does **not** currently expose; see the package README and
	 * `docs/architecture.md` for why. Do not assume it indexes the element–animal name — it
	 * does not, and the offset is three.
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
	 * Holidays are generally observed on the second day, not the leap day, but the Tibetan New
	 * Year is an exception — see Janson §11.
	 */
	isLeapDay: boolean;

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
	 */
	isLeapDay?: boolean;
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
 */
export class SkippedDayError extends Error {
	/** The date that was requested and does not exist. */
	readonly requested: TibetanDateInput;

	constructor(requested: TibetanDateInput) {
		const leap = requested.isLeapMonth ? " (leap)" : "";
		super(
			`Tibetan date ${requested.year}-${requested.month}${leap}-${requested.day} is skipped: ` +
				"no calendar day carries this number.",
		);
		this.name = "SkippedDayError";
		this.requested = requested;
	}
}
