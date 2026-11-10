# Observances

What a Tibetan Buddhist calendar marks on a day **as a practice day** — the great occasions, vow renewal, the monthly pujas and offerings, anniversaries — and how a calendar decides which days those are.

Written for someone building a practice calendar: the reader who has a date already and needs to know what is kept on it, and by whom.

**Status: designed, not yet built (2026-11-10).**
The `tibetan-calendar-temporal/observances` subpath ships today with an earlier, smaller model; this document describes the redesign decided for 1.0.0, whose open points are listed at the end.
Like [astrology.md](astrology.md), it explains the *system* and deliberately states **no API examples**: signatures belong in the README and [guide.md](guide.md), which ship and have their values asserted.
What FPMT's own calendar prints, practice by practice, is in [fpmt-calendar.md](fpmt-calendar.md).

**Repo-only.** Not in `package.json#files`, so its relative links need not resolve inside the tarball.

## What an observance is

A calendar prints two different kinds of fact about a day.
Its **date** is arithmetic: the same for everyone who uses the tradition, and checkable.
Its **observances** are a convention: which practices fall on the day, according to one institution or teacher.
Two centres of the same lineage can print different days for the same occasion — Kopan Monastery and FPMT, both Gelug, put the 2024 Chokhor Düchen on opposite halves of a doubled day — and both are right by their own convention.

So the package computes dates and **resolves** observances: a configuration states the conventions, and the engine finds the days they name.
It never chooses one institution's answer, and nothing it exports is named after one ([the decision record](decisions/2026-09-03-no-institution-names-in-exports.md)).

## How a calendar fixes a practice day

Every practice day found in the calendars examined so far is fixed in one of six ways.

- **A day of every month.** Medicine Buddha on the 8th, tsok on the 10th and 25th.
  When the day number is doubled or skipped, the convention says which calendar day keeps it.
- **A date each year.** The four great occasions (དུས་ཆེན *düchen*) and anniversaries on a Tibetan date, such as Lama Tsongkhapa's on the 25th of the 10th month.
  When the month is doubled by a leap month, the convention says which month keeps it.
- **A span within a year.** Saga Dawa, the whole 4th month; the Miracle days, the 1st to the 15th of the 1st month.
- **A counted schedule.** Vow renewal (*poṣadha* पोषध; གསོ་སྦྱོང *sojong*) is not a date number: it is counted in alternating fortnights of fourteen and fifteen days from an anchor each year, so it does not follow any one date number.
  The counted reading reproduces Rabten Choeling's published schedule; its anchor and Losar rule are inferred from that schedule, not sourced.
- **A test applied to each day.** Whether a day suits a fire offering (*homa* होम; སྦྱིན་སྲེག *jinsek*) is decided by the day's date number and weekday together.
  The rule is Lama Zopa Rinpoche's advice as published by FPMT; [fpmt-calendar.md](fpmt-calendar.md) and the design notes record how closely FPMT's printed days follow it.
- **A Western date.** Birthdays and passings of living or recent teachers, which communities keep by the Western calendar — H.H. the Dalai Lama's birthday on 6 July.
  Such an anniversary begins in a stated year: a passing anniversary must not appear in the years before the passing.

## Who a practice is for

Not every practice day is for everyone.
A great occasion is for anyone; a Medicine Buddha or Tārā puja asks no initiation; a tsok is a commitment of those who hold a Highest Yoga Tantra empowerment (*anuttarayogatantra* अनुत्तरयोगतन्त्र; རྣལ་འབྱོར་བླ་ན་མེད་པའི་རྒྱུད *naljor lana mepé gyü*).
A calendar for a mixed audience has to show all of them, and an app can do better: show each person what they keep, and let them hide what they do not.

### Levels group the practices; each person chooses within them

Each practice in a configuration may carry a **level** saying who it is for, and the levels are **declared by the configuration**, not fixed in the engine (decided 2026-11-10).
A front end groups practices by level and gives each one a switch, so a person can hide a single practice or a whole level.
That combines Ven. Thubten Chöying's suggestion of 2026-09-30 — display everything, and let each person switch off what they do not want to see — with a grouping that keeps the list manageable.

Why the configuration declares them:

- **Who may keep a practice is a claim about initiation, and it differs between traditions and institutions.** A scale built into the engine would make one community's division true for every user of the package, which is the overclaim the no-institution-names rule exists to prevent.
- **Three levels may not be enough.** Where a practice needing a lower-tantra empowerment or a permission (*anujñā* अनुज्ञा; རྗེས་གནང *jenang*) belongs is unanswered, and a declared scale can add a level without a release.
- **A level's names and order come from the data**, so a front end gets its group headings, in English and Tibetan, without a lookup table of its own.

The cost is one block in each configuration listing its levels, checked when the configuration is first used, and a rule that a practice may only name a level its configuration declares.

### There is no separate "kind" of observance

An earlier model also gave every practice a *kind* — great occasion, vow renewal, offering, puja, anniversary.
It is **dropped** (decided 2026-11-10).
Kind and level are different questions — what a practice is, and who it is for — and kind does not predict level: a puja can be open or require an empowerment, and so can a day labelled with an offering.
Nothing the engine computes depended on it, and the grouping a calendar's reader needs is the level.
The one job it did, picking out the four great occasions, still needs a home; that is open.

### Where a level can be sourced: the practice text, not the day

**A level belongs to a practice text, not to a deity or a calendar day.**
One deity can have an open practice and a restricted one: a practice in which the deity is visualised in front of oneself (front-generation) is generally open, while one in which oneself is generated as the deity (self-generation) requires an empowerment (*abhiṣeka* अभिषेक; དབང *wang*).
Publishers state this per text.
FPMT's Foundation Store prints a requirement in the description of many of its texts, and where it does, that statement is the citable source for a level (read 2026-11-10):

| Text, as FPMT's store lists it | Requirement printed |
|---|---|
| *Medicine Buddha: The Wish-Granting Sovereign*, the Fifth Dalai Lama's extensive rite (Sinhalese edition's listing) | "Anyone with faith can perform this practice." |
| *Medicine Buddha Long Retreat Sadhana* | "restricted to only those with the appropriate tantric empowerment" |
| *A Short Practice of Green Tara* | a Kriya Tantra empowerment for self-generation; "one can do this practice without such an empowerment as long as one does not generate oneself as the deity" |
| *The Beacon of the Blazing Wisdom Light: Cittamani Tara Fire Puja* | "restricted to only those with the appropriate tantric empowerment" |
| *Praises to the Twenty-One Taras* | none found in its description |

Two limits follow.
A calendar label rarely names its text — FPMT's "Medicine Buddha" and "Tara puja" days do not — so a level cited from a text is sourced only if the configuration says which text it means.
And a missing notice is not a statement that a text is open.

### The levels in the shipped example

The package ships one configuration as an **example** of how to populate one, not as any institution's calendar.
Its levels are three, named here by intent: **universal**, **open practice**, and **initiated practice**; the exact names are not yet settled.

| Practice | Level | Basis |
|---|---|---|
| The four great occasions | universal | authored |
| Anniversaries | universal | authored |
| Vow renewal | open practice | authored |
| Medicine Buddha puja | open practice | cited, if the example names *The Wish-Granting Sovereign*: "Anyone with faith can perform this practice" |
| Tārā puja | open practice | cited, if the example names a front-generation text such as *A Short Practice of Green Tara*; authored otherwise |
| Fire offering | **contested**: open practice by Andreas' first assignment, but both FPMT fire-offering manuals found are restricted | to be decided |
| Naga puja | open practice | authored: FPMT prints it on its open calendar; no text found |
| Tsok, 10th and 25th | initiated practice | cited: FPMT's "Dates Explained", a commitment for Highest Yoga Tantra initiates |
| Protector puja, 29th | initiated practice | authored: see the next section |

**Cited** means a published statement of the requirement exists and is quoted.
**Authored** means assigned by judgement, by Andreas and this project, with no such statement found.
An authored level is not arbitrary — each has a reason — but a reader cannot check it, which is why every level says which kind it is, and why a cited one is preferred wherever a publisher states the requirement.

## Tsok, the protector puja, and what a calendar label means

FPMT's calendars label every 10th and 25th "Tsog" and every 29th "Protector puja", and never say which practice is meant ([the counts](fpmt-calendar.md#the-labels-mark-a-date-not-a-practice)).
The labels name a **date that several practices share**, not a practice.

What follows is practice knowledge stated by Andreas on 2026-11-10; no published source in this repository confirms it, and it is recorded so the example's choices can be checked against it.

- A tsok (*gaṇacakra* गणचक्र; ཚོགས *tsok*) is always offered within a sādhana (*sādhana* साधन; སྒྲུབ་ཐབས *druptap*), never on its own.
  So "tsok on the 10th" means a whole practice that includes a tsok, such as Guru Puja (*Lama Chöpa*) or Yamāntaka.
- Not every puja includes a tsok.
  The higher tantric practices almost always do; a common Tārā puja, such as the Praises to the Twenty-One Tārās, uses ordinary offerings.
- The Yamāntaka practice (*Yamāntaka* यमान्तक; གཤིན་རྗེ་གཤེད *shinjé shé*), a protector practice, carries a tsok commitment.
  A day labelled "Protector puja" can therefore be a tsok day as well, which is why the example gives the 29th the same level as the 10th and 25th.
- Across Highest Yoga Tantra lineages the 10th (the Heruka day) and the 25th (the Ḍākinī day) are the baseline tsok days, and someone holding several empowerments can meet all their tsok commitments there with one practice, such as Guru Puja.
- Centres adjust: because the 25th and 29th are four days apart, some combine their monthly practices or move them to the nearest weekend.
- Kālacakra (*Kālacakra* कालचक्र; དུས་ཀྱི་འཁོར་ལོ *dükyin khorlo*) centres, such as Jonang or Rimé groups, often hold tsok on the full moon, the new moon and during eclipses.

The last two points are why practice days are configuration and not engine: the same lineage keeps the same practice on different days in different places, and a configuration is where a community says which.

## What is still open

- **The names of the three example levels.** The intent is fixed; the words are not.
- **The fire offering's level.** Andreas assigned it to open practice; both FPMT fire-offering manuals found are restricted to those with the appropriate empowerment. FPMT's "Fire puja" label marks a day suited to the offering, and does not say who makes it.
- **Which text each example practice names**, so that its level can be cited rather than authored.
- **Where the four great occasions are marked**, now that kind is gone. The suggestion on the table is an optional list of labels on each practice, with the great occasions carrying one.
- **Which practice the 10th, 25th and 29th name** in the example, since FPMT's labels do not say. The example should not invent one.
- **Naga puja's three dates that appear only in some years**, and the remaining FPMT labels whose rules are unsourced.
- **How a fire offering's count treats a doubled or skipped day**, which Lama Zopa Rinpoche's advice tells the reader to check and does not explain; a question for a Tibetan teacher or scholar.
