# Astrological attributes

What a Tibetan almanac prints about a day **besides its date** — the elements, animal, gender,
trigram and number it carries, and whether the day is held favorable.

Written for someone building an almanac view: the reader who has a date already and needs to know
what else the day is held to be.

**Status: partly built, and nothing is exported yet.**
As of 2026-09-12 the engine computes the year, month, lunar-day and calendar-day attributes, the
lunar mansion, and the element each mansion carries — and it refuses the month and lunar-day
attributes for the Bhutanese configs, as the gap below describes. The yoga's names and favorability
and the `./astrology` barrel itself are still to come, so **no consumer can reach any of this**; see
[roadmap.md](roadmap.md)'s Pre-v1.0.0 checklist.
This document explains the *system*, which is stable knowledge independent of our implementation.
It deliberately states **no API examples** — no function names, no call signatures — because a
shipped example is contract here (see [../CLAUDE.md](../CLAUDE.md)) and there is nothing yet to hold
to it. Those arrive with the module.

**Worked examples of the system are a different thing and are included**, below.
They commit no signature: they are facts from Janson and Henning, checkable against the sources
today, and they are what turns the abstractions here — five elements, a 180-year return, a magic
square — into something a reader can verify rather than take on trust.

**Repo-only.** Not in `package.json#files`, so its relative links need not resolve inside the
tarball.

## The one-sentence version

The engine already answers *which day it is*; this layer answers *what kind of day it is*, by
attaching labels that repeat on fixed cycles — plus one label that does not repeat at all, because
it depends on where the moon actually is.

Nothing here changes a single date.
Every attribute is computed **from** a date the engine already produces.

## The four cycles

Almost everything below is one of four cycles, borrowed into Tibetan practice from Chinese
astrology, turning independently like odometer wheels.

| Cycle | Length | Members |
|---|---|---|
| Animals | 12 | mouse, ox, tiger, rabbit, dragon, snake, horse, sheep, monkey, bird, dog, pig |
| Elements | 5 | wood, fire, earth, iron, water |
| Trigrams | 8 | the *I Ching* three-line figures — li, khon, dwa, khen, kham, gin, zin, zon |
| Numbers | 9 | 1–9, each carrying a colour and a compass direction |

Two traps sit in that table, and both are live.

**The five elements are not the four elements.**
A second, *Indian* set of four — earth, fire, water and **wind** — governs the weekdays and the
lunar mansions, and drives the elemental yoga below.
`wind` is not a member of the five and never appears as a year element; `wood` and `iron` never
appear as weekday elements.
The repository already encodes this split as `TibetanWeekdayElement`, separate from
`TibetanElement`, precisely so that `wind` cannot be typed away.

**The nine numbers are not a ranking.**
They arrange into a 3×3 magic square whose rows, columns and diagonals all sum to 15, and each
number carries a direction from that square.
The apparently jumbled order of directions is the square, not an error.

## The four units of time

The same cycles are applied to four *different* units, which is what makes the system look larger
than it is.

### Years — five elements at once, not one

The package already gives a year its name: **Fire Horse**, say.
That "Fire" is only the first of five elements a year carries, and the other four are routinely
different.

| Element | What it describes | Repeats every |
|---|---|---|
| Power *dbang thang* | the year's headline element — the one in its name | 10 years |
| Life *srog* | fixed by the animal | 12 years |
| Body *lus* | derived from the power element and the animal together | 30 years |
| Fortune *klung rta* | uses only four elements; earth never appears | 4 years |
| Spirit *bla* | the element preceding the life element | 12 years |

Because the periods all divide 60, the five line up again every sixty years — which is why one
table can print all five against the sixty-year cycle.

A year also carries **three numbers** from the nine: the **central** number (also called the body or
birth number), the **life** number and the **power** number.
These count *backwards* by one each year, so they repeat every nine years — and nine does not divide
sixty, so the numbers and the elements together only return after **180 years**.

These are the attributes used for a person born in that year, which is why an almanac prints them
at all.

### Months — animal, gender, element, and sometimes a number

Each of the twelve months takes an animal, and with it a gender: odd months male, even months
female, following the general principle that odd numbers are *yang* and even are *yin*.

**Which animal starts the year is tradition-dependent, and this is the sharpest fork in the whole
layer.**
In Phugpa, month 1 is the Dragon month.
In Tsurphu, month 1 is the Tiger month — matching the Chinese calendar, where the Tiger month is
the first.
The Phugpa Tiger month is month **11 of the preceding year**, which is why its element formula
carries a branch that Tsurphu's does not.

**The element follows from the year's.**
The Tiger month takes the element *after* the year's in the standard order — its "son", wood → fire
→ earth → iron → water → wood.
From there the months run two to an element, the first male and the second female, exactly as years
do.
That is the whole rule; the awkward branch above exists only because Phugpa's Tiger month sits in
the *preceding* year, so months 1–10 are governed by one year's element and months 11–12 by the next.
Tsurphu, whose Tiger month is month 1, needs no branch.

The **number** is Tsurphu-only.
Phugpa almanacs do not give months a number at all, so this is an attribute that is genuinely
absent rather than merely different.

### Lunar days — animal, element, trigram, number

The numbered Tibetan days, 1 to 30.
Their animals run continuously across month boundaries, because thirty days is a whole number of
twelve-cycles plus six; the sequence breaks only at a leap month, where the leap month and the
regular month sharing its number repeat the same run.

The element cycles within each month, starting from the element after the month's own — so there is
usually a visible jump at the start of a month rather than a smooth run.

The **trigram** and the **number** behave like the animal: continuous cycles of 8 and 9, broken only
at a leap month.
Both are anchored to the Tiger month, which begins with trigram *li* and with number 1 — so where
each month starts depends on **which animal that month carries**, and that is the
tradition-dependent part.
Tiger, Horse and Dog months open with *li*; Rabbit, Sheep and Pig with *zin*; Mouse, Dragon and
Monkey with *kham*; Ox, Snake and Bird with *dwa*.

So three of the four lunar-day attributes inherit the month's tradition-dependence — element through
the month's element, trigram and number through its animal.
**Only the animal does not**: it falls out of the day and month *numbers* alone.
That asymmetry is why the Bhutan gap below refuses the lunar-day set as a whole rather than field by
field.

### Calendar days — the same cycles again, on a different clock

A *calendar day* is an actual sunrise-to-sunrise day; a *lunar day* is an astronomical division that
does not align with it, which is the whole reason this calendar has doubled and skipped days at all
(see [how-it-is-calculated.md](how-it-is-calculated.md)).

Calendar days carry their own element, gender, animal, trigram and number, and these run straight
off the **Julian day number** — meaning they are completely independent of the Tibetan calendar, and
identical in every tradition.
Gender is simply whether the Julian day number is odd.

They need no more explanation than that, and the brevity is deliberate rather than an omission: each
is a single cycle counted off one number, with none of the anchoring that makes the month and
lunar-day rules awkward.
Where a year needs a table because it carries five elements at once, a calendar day carries one of
each.

**So a single day carries two sets of labels that disagree**, one for the lunar day and one for the
calendar day.
That is not a defect to reconcile; almanacs print both, and a consumer needs to know which is which.

Calendar days also pick up the same four derived elements as years — life, fortune, body and spirit
— cycling every sixty days against the very same sixty-row table used for years.

## The elemental yoga — the one that needs astronomy

Everything above can be worked out with a calculator and a table.
This cannot.

A day's **elemental yoga** (*khams kyi sbyor ba*, also *'byung 'phrod*) is the pairing of two
elements from the Indian set of four:

1. **the weekday's element** — Saturday earth, Sunday fire, Monday water, Tuesday fire, Wednesday
   water, Thursday wind, Friday earth.
   Note that wind falls on Thursday alone.
2. **the element of the lunar mansion** — which of the 27 star-groups along the ecliptic the moon
   occupies at the start of the calendar day.
   This is real astronomy, derived from the true solar and lunar longitudes the engine already
   computes.

**There are 27 mansions here and 28 in the source, and the difference is a trap rather than a
detail.**
Henning's published list — the same page the table below comes from — prints **28**, including
*Abhijit* at position 23; Janson numbers the mansions 0–26, so reaching 27 means dropping Abhijit.
Its elements run seven each across the 28, so dropping it leaves six earth against seven of each
other, which is how the drop can be checked rather than assumed.
Drop the wrong one and every element from *Dhaniṣṭhā* onward shifts by one, silently, with nothing
about the output looking wrong.

The order of the pair does not matter, so there are exactly **ten** combinations: four matched pairs
and six mixed.
Each has a name, and six are held favorable against four unfavorable.

| Pair | Sanskrit | Tibetan | English |
|---|---|---|---|
| earth + earth | siddhi | dngos grub | accomplishment |
| water + water | amṛta | bdud rtsi | nectar |
| earth + water | yauvana | lang tsho | youth |
| fire + fire | pragati | 'phel 'gyur | progress |
| wind + wind | saṃpanna | phun tshogs | excellence |
| fire + wind | balayukta | stobs ldan | powerful |
| earth + wind | alābha | mi phrod | deficiency |
| water + wind | pratikūla | mi mthun | discord |
| earth + fire | dahana | sreg pa | burning |
| fire + water | maraṇa | 'chi ba | death |

The table is Henning's, reproduced in his columns and his spellings — Sanskrit in IAST, Tibetan in
Wylie.
No Devanāgarī or Tibetan script is attached, because he prints none and this repository does not
add a rendering it cannot verify; the same discipline
[almanac-sources.md](almanac-sources.md) already applies to its own terms.

**These ten are exactly FPMT's `FD-*` and `UD-*` day-quality codes**, where `E`, `W`, `F` and `A`
stand for earth, water, fire and air — air being wind.
That correspondence was found from Janson in August 2026 and independently confirmed in September
against Henning and against FPMT's own published calendars; the evidence is in
[almanac-sources.md](almanac-sources.md).

## Three worked examples

Facts, not API. Each is checkable against the source named beside it.

**A year's five elements.** The first row of Janson's sixty-year table, Wood–Mouse:

| Power | Life | Body | Fortune | Spirit |
|---|---|---|---|---|
| wood | water | iron | wood | iron |

Four of the five disagree with the name, which is the point of the section above.

**A weekday's element.**
1 September 2026 has Julian day 2,461,285, and `(JD + 2) mod 7 = 3` — Tuesday, whose element is fire.

**A yoga, end to end.**
FPMT printed `UD-FW` for that same day: fire + water, *maraṇa*, "death", the most inauspicious of
the ten.
One half of the pair is the weekday element just computed, so the other half is forced — the mansion
the moon occupied that morning must carry **water**.
That is the whole chain in one day: weekday element from the Julian day, mansion element from the
moon, and the pair read off the table.

## Where each piece comes from

The pieces do **not** carry equal evidentiary weight, and flattening them would misrepresent the
layer.

| Piece | Source | Character |
|---|---|---|
| Year attributes | Janson, Appendix E | Closed forms he derives himself, from the year number alone |
| Calendar-day attributes | Janson, Appendix E | Closed forms from the Julian day number; no tradition involved |
| Month and lunar-day attributes | Janson, Appendix E | Closed forms, but with a **different rule per tradition** |
| Mansion arithmetic | Janson, "Further calculations" | Derived from longitudes this engine already produces |
| Mansion-to-element table | **Henning** | A list, cited by Janson rather than derived by him |
| The ten yoga names | **Henning** | Likewise cited, not derived |
| Favorability | **FPMT** | Not in Janson at all; a convention, not arithmetic |

The last three matter.
Janson is this project's sole source for the calendar *arithmetic*, and deliberately so — but he is
explicit that he does not derive the mansion-to-element table or the yoga names, and points to
Henning for both.
Citing Henning there is an ordinary citation chain rather than two sources competing to define one
number, which is the risk that rule actually guards against.
Favorability comes from neither: Janson never states it, so FPMT is the sole witness, exactly as it
already is for the observance layer.

## What is deliberately excluded

**Planetary positions.**
Janson's Appendix D computes geocentric longitudes for the five visible planets and Rāhu राहु, by
iterative astronomy rather than closed form.
It serves *muhūrta* मुहूर्त-style work — timing an activity by which planet stands where — which is a
narrower need than "what kind of day is this", and it carries its own accuracy-validation burden
against a modern ephemeris.
It is a project comparable in size to the existing sun-and-moon machinery, and it is recorded under
Beyond v1 in [roadmap.md](roadmap.md).

**Prescriptive guidance.**
The layer reports what an almanac attributes to a day.
It does not tell anyone what to do about it.

## What varies between traditions, and one gap

Only the **month** and **lunar-day** attributes are tradition-dependent; the year and calendar-day
attributes are the same everywhere, and the yoga varies only through the mansion, which the engine
computes from each tradition's own constants.

**Bhutan is an open gap.**
Janson gives month-animal lists for Phugpa and Tsurphu and **none for Bhutan**, even though
`BHUTAN` and `BHUTAN_HENNING` are both exported, validated configs.
A search for a published Bhutanese month attribution found nothing usable; the one source that would
settle it is the Royal Government's *lo-tho*, which this repository already knows to be a scanned
PDF with no text layer.
So the answer probably exists in a document we hold and cannot machine-read, which is a different
problem from an unfindable one — see [validation-sources.md](validation-sources.md).

Until it is sourced, the behaviour is to **refuse rather than guess**: Bhutan gets the year
attributes, the calendar-day attributes and the yoga, and a coded error for the month and lunar-day
attributes naming the gap.
That is implemented as of 2026-09-12 — `TCT_ATTRIBUTE_NOT_SOURCED`, thrown because a tradition whose
month attributes nobody has sourced carries no month-naming block at all, rather than because any
code asks "is this Bhutan"; see
[decisions/2026-09-12-absent-naming-members-refuse.md](decisions/2026-09-12-absent-naming-members-refuse.md).
Silently falling back to Phugpa's list would hand one tradition's answers to another, which is the
failure this repository is most careful about.
