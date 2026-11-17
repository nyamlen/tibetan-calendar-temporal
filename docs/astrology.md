# Astrological attributes

What a Tibetan almanac prints about a day **besides its date** — the elements, animal, gender,
trigram and number it carries, and how favorable the day is held to be.

Written for someone building an almanac view: the reader who has a date already and needs to know
what else the day is held to be.

**Status: built and exported as of 2026-09-12.**
The whole layer is on the `tibetan-calendar-temporal/astrology` subpath: the year, month, lunar-day
and calendar-day attributes, the lunar mansion, the element each mansion carries, and the elemental
yoga with its names, favorability and four-way grading. The month and lunar-day attributes **refuse** for the Bhutanese
configs, as the gap below describes, and so does the yoga, because Bhutan shifts the weekday.
This document explains the *system*, which is stable knowledge independent of our implementation.
It deliberately states **no API examples** — no function names, no call signatures — and that is now a
division of labour rather than a wait: the consumer account lives in
[guide.md](guide.md#what-kind-of-day-it-is) and the signatures in the README, both of which ship to
npm and have their values asserted. **This file deliberately does not ship** (decided 2026-09-12, in
[roadmap.md](roadmap.md)): it is the account of the system and its sourcing, reached from the README
by absolute URL, and keeping it repo-only is what lets it stay free of contract examples.

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
| Trigrams | 8 | the *I Ching* three-line figures, keyed by Janson's English — fire, earth, iron, sky, water, mountain, wood, wind; in Tibetan *li, khon, dwa, khen, kham, gin, zin, zon* |
| Numbers | 9 | 1–9, each carrying a colour and a compass direction in Janson's tables — neither of which is in the output |

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

Each of the twelve months takes an animal, and with it the gender of that animal: odd animal numbers
male, even female, following the general principle that odd numbers are *yang* and even are *yin*.
In both attested versions the Tiger month is odd, so this comes to odd months male and even months
female.

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
Both are anchored to the Tiger month, which begins with trigram *li* (`"fire"`) and with number 1 — so where
each month starts depends on **which animal that month carries**, and that is the
tradition-dependent part.
Tiger, Horse and Dog months open with *li*, `"fire"`; Rabbit, Sheep and Pig with *zin*, `"wood"`;
Mouse, Dragon and Monkey with *kham*, `"water"`; Ox, Snake and Bird with *dwa*, `"iron"`.

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
off the **Julian day number** — meaning they are completely independent of the Tibetan calendar.
The element, gender, animal and trigram are identical in every version Janson gives.
The **number** is not: Janson remarks that Tsurphu calendars restart it from the solstices — 5 on the first Wood–Mouse day after the true astronomical winter solstice, counting up, and 4 after the summer solstice, counting down — and that rule is not modelled.
Every shipped tradition uses the Julian-day number.
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
elements from the Indian set of four.
*Yoga* (योग) here is a union or combination — Monier-Williams p. 856, "any junction, union,
combination", and in astronomy "conjunction, lucky conjuncture" — and the Mahāvyutpatti pairs it with
Tibetan *sbyor ba*, joining.
It names **the pairing**, not either half: the mansion is one input, not the thing named.

**It is not the yoga of the "five components".** An almanac also prints one of 27 *astronomical*
yogas, found from the sum of the sun's and the moon's longitudes, under a different list of names
(Viṣkambha … Vaidhṛti); that one is not computed here, and the sun plays no part in the elemental
yoga. Both are called *yoga*, and both lists contain a Siddhi, which is the homograph a verifier must
not match.

The two elements are:

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
other, which catches a mistyped element or a drop of a mansion of another element, though not which
earth mansion left: dropping any of the seven earth ones gives the same counts, so the table
drops Abhijit by name.
Drop a different one and the mansions between it and Abhijit's place each read a neighbour's element,
silently, with nothing about the output looking wrong.
Keeping Abhijit and dropping *Revatī* shifts every element from *Dhaniṣṭhā* onward by one.

The order of the pair does not matter, so there are exactly **ten** combinations: four matched pairs
and six mixed.
Each has a name, and six are held favorable against four unfavorable.

| Pair | Sanskrit | Tibetan | English | Grading |
|---|---|---|---|---|
| earth + earth | siddhi | dngos grub | accomplishment | good |
| water + water | amṛta | bdud rtsi | nectar | good |
| earth + water | yauvana | lang tsho | youth | restorative |
| fire + fire | pragati | 'phel 'gyur | increase | good |
| wind + wind | saṃpanna | phun tshogs | excellence | restorative |
| fire + wind | balayukta | stobs ldan | powerful | restorative |
| earth + wind | alābha | mi 'phrod | deficiency | bad |
| water + wind | pratikūla | mi mthun | opposition | bad |
| earth + fire | dahana | bsreg pa | burning | bad |
| fire + water | maraṇa | 'chi ba | death | worst |

The table is Henning's columns, with two of his English words replaced — *increase* for *progress*
and *opposition* for *discord*, since no dictionary prints his — and two of his Tibetan spellings corrected — he prints *mi phrod* and
*sreg pa*, and both Tibetan–Tibetan dictionaries that enumerate the ten attest *mi 'phrod* and *bsreg pa* (the *tshig mdzod chen mo* in the compound *bsreg sbyor*, read as the sourcing record explains).
The package carries each name in Tibetan script, Wylie and THL phonetics and in IAST and
Devanāgarī, generated and verified by a script rather than typed; the evidence is in
[names/month-and-yoga-sourcing.md](names/month-and-yoga-sourcing.md).

The grading column is the *tshig mdzod chen mo*'s, from the same entry that spells the ten, and ships as `auspiciousness`.
The entry lists the ten by element pair — the same pairs as Henning, for all ten — and closes "three good, three restorative, three bad, one worst", in Tibetan *bzang po*, *gso thub*, *ngan* and *tha chad*.
**It gives each group's size and never its members**, so the column applies the sizes to the entry's own order: *dngos grub*, *bdud rtsi*, *'phel 'gyur*, *phun tshogs*, *lang tsho*, *stobs ldan*, *mi 'phrod*, *mi mthun*, *bsreg*, *'chi*.
That order has a second explanation — the four same-element pairs come first — under which wind + wind, *excellence*, would be good rather than restorative; if a source ever names the members, check that row first.
The grading agrees with FPMT's favorable six on all ten without either being derived from the other.

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
| Calendar-day attributes | Janson, Appendix E | Closed forms from the Julian day number; no tradition involved, except Tsurphu's unmodelled number |
| Month and lunar-day attributes | Janson, Appendix E | Closed forms, but with a **different rule per tradition** |
| Mansion arithmetic | Janson, "Further calculations" | Derived from longitudes this engine already produces |
| Mansion-to-element table | **Henning** | A list, cited by Janson rather than derived by him |
| The ten yoga names | **Henning**, verified | Likewise cited; two spellings corrected by the *tshig mdzod chen mo*'s own list of the ten, and every Sanskrit name but *pragati* a Monier-Williams headword |
| Favorability | **FPMT** | Not in Janson at all; a convention, not arithmetic |
| Pairs and grading, second witness | ***tshig mdzod chen mo*** | A Tibetan dictionary outside Henning's lineage; its grading's membership is read by list order |

The last four matter.
Janson is this project's sole source for the calendar *arithmetic*, and deliberately so — but he is
explicit that he does not derive the mansion-to-element table or the yoga names, and points to
Henning for both.
Citing Henning there is an ordinary citation chain rather than two sources competing to define one
number, which is the risk that rule actually guards against.
Favorability comes from neither: Janson never states it, so FPMT is the witness for the binary `favorable`, exactly as it already is for the observance layer.
The *tshig mdzod chen mo* is the fourth source: it states the ten element pairs, which corroborates Henning's, and grades the ten, which ships beside FPMT's binary rather than replacing it.

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

The year and calendar-day attributes are the same everywhere.
The **month** and **lunar-day** attributes depend on the tradition.
So does the yoga, in two ways: through the mansion, which the engine computes
from each tradition's own constants, and through the weekday element, which depends on whether the
tradition shifts its weekday.

**Bhutan is an open gap.**
Janson gives month-animal lists for Phugpa and Tsurphu and **none for Bhutan**, even though
`BHUTAN` and `BHUTAN_HENNING` are both exported configs.
A search for a published Bhutanese month attribution found nothing usable.
The Royal Government's calendars, read page by page, print no month animal, and Henning's Bhutanese
calendar files apply Phugpa's rules through code shared with his Tibetan program, so they are his
default rather than Bhutanese evidence — see [validation-sources.md](validation-sources.md), under "Bhutan's month attributes".
An independent Bhutanese source is required.

Until it is sourced, the behaviour is to **refuse rather than guess**: Bhutan gets the year
attributes, the calendar-day attributes and the lunar mansion, and a coded error for the month and
lunar-day attributes naming the gap.
That is implemented as of 2026-09-12 — `TCT_ATTRIBUTE_NOT_SOURCED`, thrown because a tradition whose
month attributes nobody has sourced carries no month-naming block at all, rather than because any
code asks "is this Bhutan"; see
[decisions/2026-09-12-absent-naming-members-refuse.md](decisions/2026-09-12-absent-naming-members-refuse.md).
Silently falling back to Phugpa's list would hand one tradition's answers to another, which is the
failure this repository is most careful about.

**The yoga is refused under Bhutan for a different reason.**
Bhutan shifts the whole weekday by one day — name, planet and element — and no source says what the
yoga pairs the mansion with after the shift; that the element moves is an inference, Andreas' ruling
of 2026-11-16.
The refusal is reached through the config's nonzero weekday offset, not by asking "is this Bhutan",
and the composition reports the yoga as unsourced rather than refusing the whole day.
