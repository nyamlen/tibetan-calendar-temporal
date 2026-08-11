---
title: "Naming Brainstorm: npm Package, Org, and App"
created: 2026-08-10
updated: 2026-08-11
status: decided
participants: Carson (brainstorming), Sophia (storyteller), Victor (innovation strategist)
---

# Naming Brainstorm: npm Package, Org, and App

_Session date: 2026-08-10 — resolved 2026-08-11_

---

## Final State

| Thing | Name | Status |
|-------|------|--------|
| npm package (engine) | `tibetan-calendar-temporal` | ✅ Decided |
| GitHub/npm org | `nyamlen` | ✅ Decided |
| App | `Nyamlen` | ✅ Decided |
| Apple subtitle | `Tibetan Meditation & Vows` | ✅ Decided |

Org and app share one name.
The English descriptor lockup carries discoverability; the name carries meaning.

---

## Context

Three naming decisions are interconnected:

1. **npm package name** — the standalone Tibetan calendar computation engine (Temporal-native, MIT, clean-room rebuild from Janson's paper)
2. **GitHub/npm org name** — umbrella for the full suite: calendar engine, meditation timer, vow tracker, and potentially the app itself
3. **App name** — the integrated consumer product (PWA) combining calendar + timer + vows

### Constraints Established

- Must be findable (npm search, Google, app store)
- Should signal "developer tool" (for the package) AND "cultural resonance" (for the app)
- Languages considered: English, Tibetan, Sanskrit
- The org must be broad enough to house calendar + meditation timer + vow tracker
- Tradition: Gelug/Phugpa primarily, potentially white-label for others later

### Audience (established 2026-08-11)

**Insider-first.**
The primary audience is existing Tibetan Buddhist practitioners — FPMT centres, Gelug sangha, people who already know what Saka Dawa is.
Distribution is expected to run through centres and word of mouth.
Cultural authenticity therefore outranks mass-market legibility, and a genuine Tibetan term is an asset rather than a tax.

---

## Decision 1: npm Package Name

**Status: DECIDED**

### Resolution: `tibetan-calendar-temporal`

### Rationale

- All three search keywords present: "tibetan" + "calendar" + "temporal"
- Natural word order: "a Tibetan calendar, built on Temporal"
- Maximum discoverability for developers searching "tibetan calendar javascript" or "temporal calendar"
- Differentiates from the dead `tibetan-date-calculator` library
- Signals this is not a legacy Date-based implementation
- The name is **confirmed available on npm** (404 on npmjs.com)
- The abandoned GitHub repo `eszthoff/tibetan-calendar-temporal` was never published to npm — different namespace, no conflict

### Alternatives Considered

| Name | Why not |
|------|---------|
| tibetan-calendar-engine | Doesn't signal Temporal-native advantage |
| tibetan-calendar-core | Generic, no tech differentiator |
| phugpa-calendar | Too niche for discoverability |
| kartsi | Culturally rich but not findable by devs searching "tibetan calendar" |
| @tibetan/temporal-calendar | Scoped — requires claiming `@tibetan` scope, presumptuous for personal project |

### Scoping Policy

The flagship engine stays **unscoped** for discoverability.
Everything else in the suite ships **scoped** under the org: `@nyamlen/timer`, `@nyamlen/vows`.

### ✅ Resolved: Spec Reconciled

The engine spec formerly at `tibetan-calendar-engine-project-spec.md` still named the package `tibetan-calendar-engine` in five places.
Renamed to [PROJECT.md](PROJECT.md) and corrected on 2026-08-11.

---

## Decision 2: GitHub/npm Org Name

**Status: DECIDED — `nyamlen`**

### Resolution: `nyamlen`

practice (ཉམས་ལེན *nyamlen*)

- Wylie: `nyams len`; full grammatical form ཉམས་སུ་ལེན་པ
- Glossed as "practice; spiritual practice, Dharma practice; application; praxis (non-theoretical)" — [Rangjung Yeshe Wiki](https://rywiki.tsadra.org/index.php/nyams_len)
- Semantically covers all planned tools: calendar, timer, vows — they all support practice
- Short (7 chars), tradition-neutral, non-restricted vocabulary
- Authentic and insider-legible to Tibetan Buddhist practitioners
- Works as an npm scope: `@nyamlen/vows`

### Alternatives Considered

| Name | Why set aside |
|------|--------------|
| kartsi | "Star calculation" — too narrow once timer + vows entered scope |
| tibcal | Too narrow (calendar only) |
| phugpa | Tradition name — slightly academic for an org housing consumer apps |
| gomkhor | "Meditation cycle" — harder to spell/remember |
| thunlab | "Session lab" — less cultural resonance |
| dharma-dev | Too broad, likely taken |

---

## Decision 3: App Name

**Status: DECIDED — `Nyamlen` (same as org)**

The org and the app share one name, in the Vercel/Supabase pattern.

### Rationale

- **Namespace.** `nyamlen` is clean across GitHub, npm, `.com`, `.app`, `.org` and `.dev` — and no existing person, brand or product called Nyamlen appears in any index checked. An empty global namespace is rare and worth protecting.
- **Semantic fit.** Practice is both the umbrella and the daily act. It covers calendar, timer and vows without strain.
- **One brand, not two.** A single maintainer sustaining two brand identities is unnecessary overhead. YAGNI applies to brand portfolios.
- **Discoverability is not the name's job.** See Decision 4 — the descriptor fields carry the search terms, which frees the name to carry meaning. This dissolves the original "findable vs. resonant" tension, which had wrongly assumed both had to fit in one slot.

### Known Weaknesses (accepted)

- English has no initial *ny-*; speakers will approximate ("nee-am-len" / "nyam-len"). Survivable — cf. Nyingma.
- *nyam* carries a "food/eating" sense in Akan and Caribbean English ([Nyam](https://en.wikipedia.org/wiki/Nyam)). Irrelevant to the target audience.
- ཉམས་ alone can mean meditative experience, and ཉམས་པ means degenerate/decline. The compound ཉམས་ལེན is unambiguous.

### Melong — Rejected

mirror (ādarśa आदर्श; མེ་ལོང *melong*)

The strongest metaphor in the session, rejected on practical grounds:

- `github.com/melong` is **taken** (existing user account, id 4204301); `melong.com` and `melong.app` are both **registered**
- The search field is owned by dharma-goods retailers selling physical ritual mirrors ([Etsy](https://www.etsy.com/market/melong_mirror), [Tibetan Spirit](https://tibetanspirit.com/products/melong-with-hrih-syllable), [Enlightenment Thangka](https://enlightenmentthangka.com/products/tibetan-melong-mirror)) — directly against the "must be findable" constraint
- English-language connotations skew Bön, shamanic and **divinatory** — scrying and prophecy ([Melong](https://en.wikipedia.org/wiki/Melong), [WYTCH](https://www.wytch.co.uk/shop/p/682wooql6pmyrzgm53m97cqmqeslqf)). The project's trust proposition is computational rigour under Gelug/Phugpa; divination associations work against it.

**The metaphor survives as a screen name.**
The practice review/statistics view is called **Melong**, with textual warrant: the classic *dran pa dang shes bzhin gyi gdams pa me long ma* — "**The Mirror**: Advice on Presence and Awareness" ([ResearchGate](https://www.researchgate.net/publication/269740877_The_Mirror_Advice_on_Presence_and_Awareness_dran_pa_dang_shes_bzhin_gyi_gdams_pa_me_long_ma)).
The mirror is the traditional image for reflecting practice back to the practitioner, and the design language — reflection, clarity, seeing clearly — is retained.

### Other Candidates Generated and Rejected

| Candidate | Reading | Why not |
|---|---|---|
| **drenshe** | mindfulness and awareness (smṛti स्मृति + saṃprajanya संप्रजन्य; དྲན་ཤེས *drenshé*) | Best semantic fit found — the two faculties that remember practice days, sustain sessions, and guard vows, i.e. all three modules. Rejected because it needs a footnote to land: the contraction of དྲན་པ + ཤེས་བཞིན is not self-evident, and the initial *dr-* is awkward. **A name that needs explaining is not doing its job.** |
| **gyunkhyer** | daily practice, lit. "continuous practice" (རྒྱུན་ཁྱེར *gyünkhyer*) | The most precisely apt term in the language — the standing genre-name for a daily practice text ([Tsadra, Khyentse Lineage](https://khyentselineage.tsadra.org/index.php/Category:Daily_Practice_-_rgyun_khyer)). Rejected on the *khy* cluster (unpronounceable to English speakers) and because its English-language footprint skews Nyingma. |
| **duchen** | great occasion, festival day (དུས་ཆེན *düchen*) | The exact term for the four great festival days the app computes. GitHub name taken, and searches collide hard with Duchenne muscular dystrophy. |
| **lotho** | almanac (ལོ་ཐོ *lotho*) | The authentic word for the published Tibetan almanac. Too calendar-narrow once timer + vows entered scope; GitHub name taken; reads poorly in English. |
| **drubpa** | accomplishment, practice (སྒྲུབ་པ *drubpa*) | Sādhana-coded, and one letter from the Drukpa (འབྲུག་པ) lineage — a live confusion risk. |
| **dompa** | vow (སྡོམ་པ *dompa*) | Vow-only, too narrow. npm name taken. |
| **thunkor** | round of sessions (ཐུན་སྐོར *thünkor*) | Timer-only, too narrow. |

### Excluded on Cultural-Appropriateness Grounds

Deliberately not used, regardless of availability:

- **Kālacakra** (kālacakra कालचक्र; དུས་འཁོར *dünkhor*) — the Phugpa system derives from it, but naming a consumer product after a restricted highest-yoga-tantra system is presumptuous.
- **Samaya** (samaya समय; དམ་ཚིག *damtsik*) — tantric-coded and vow-heavy.
- Any deity name or empowerment-gated term.

All names carried forward — ཉམས་ལེན, མེ་ལོང — are ordinary, non-restricted, publicly-used vocabulary.

### English-Only Names — Considered and Rejected

Evaluated at the user's request:

| Candidate | Problem |
|---|---|
| Practice Days | Clearest of the set (`practicedays.app` free, `.com` taken). But descriptive names are unownable — untrademarkable, and trivially cloned. Excellent subtitle, poor name. |
| Unbroken | From རྒྱུན་ཆད་མེད་པ. Evocative but reads as generic self-help; saturated. |
| Four Sessions | A real insider phrase (ཐུན་བཞི *thünzhi*), but names the timer only. |
| Dharma Days | Insider-legible and alliterative; almost certainly taken across app stores. |

The pattern: English yields either flatly descriptive or generically inspirational.
For an insider-first audience neither beats a real Tibetan term, which is the one element signalling the product was built from inside the tradition.

---

## Decision 4: Descriptor Lockup and Store Metadata

**Status: DECIDED**

### The Principle

Discoverability and meaning were never competing for the same slot.
Every distribution surface provides a separate, indexed descriptor field alongside the name.
Keywords live there; the name is free to be evocative.

### Field Allocation

| Surface | Text | Length |
|---|---|---|
| Name (all surfaces) | `Nyamlen` | 7 |
| PWA `short_name` | `Nyamlen` | 7 |
| Web `<title>`, Play short description, GitHub/npm description | `Tibetan Buddhist meditation timer, practice calendar & vow tracker` | 66 |
| Apple subtitle | `Tibetan Meditation & Vows` | 25 / 30 |
| Apple keywords (indexed, never displayed) | `calendar, days, buddhist, losar, sojong, dharma, retreat, mantra, gelug` | ≤100 |

Field limits: Apple name 30 / subtitle 30 / keywords 100.
Google Play title 30 / short description 80 / full description 4000.

### Why "Tibetan Meditation & Vows"

The three concepts that must be **visible** are meditation (highest search volume), Tibetan (identity and search), and vows (a differentiating module no competitor has).
"Calendar" and "days" are recovered at no visible cost via the hidden keywords field.
25 characters leaves 5 of headroom.

### Rejected: Abbreviating to Buy Characters

Abbreviating "Calendar" to "Cal" was considered and rejected.
App Store search expands a *query* into indexed terms, not the reverse: indexing "Cal" ranks for the query "cal", not for "calendar".
Truncation therefore spends visible characters and buys no search volume, while reading as though the line ran out of room.
The hidden keywords field achieves the same goal for free.
(Apple does not publish its matching rules; treat this as strong ASO convention rather than certainty.)

### Note

Apple's 30-character cage is a **future** constraint.
The product ships as a PWA first, where the live fields are `<title>` and the manifest `description` — neither tightly capped.

---

## Availability Verification

Checked 2026-08-11. ✅ = available.

| Candidate | GitHub | npm | `.com` | `.app` |
|---|---|---|---|---|
| **nyamlen** | ✅ | ✅ | ✅ | ✅ (`.org`, `.dev` ✅) |
| gyunkhyer | ✅ | ✅ | ✅ | ✅ |
| drenshe | ✅ | ✅ | ✅ | ✅ |
| thunkor | ✅ | ✅ | — | ✅ |
| drubpa | ✅ | ✅ | — | — |
| melong | ❌ | ✅ | ❌ | ❌ |
| duchen | ❌ | ✅ | — | — |
| lotho | ❌ | ✅ | — | — |
| drenpa | ❌ | ✅ | ❌ | ✅ |
| dompa | — | ❌ | — | — |

Methods: GitHub via `api.github.com/users/<name>` and `github.com/<name>` HTTP status; npm via `registry.npmjs.org/<pkg>`; domains via RDAP.
npm **org/scope** availability could not be verified programmatically (npmjs.com returns 403 to non-browser clients) — confirm `@nyamlen` manually at registration.

---

## Open Actions

- [x] Register GitHub org `nyamlen` — done 2026-08-11
- [x] Register npm org / claim `@nyamlen` scope — done 2026-08-11, 2FA enabled
- [x] Register `nyamlen.app` (primary) and `nyamlen.com` (defensive) — done 2026-08-11
- [x] Reconcile the engine spec — renamed to `PROJECT.md` and corrected 2026-08-11
- [ ] Transfer the repo from `boffies` to the `nyamlen` org (stays private until v1)
- [ ] Publish placeholder `tibetan-calendar-temporal` v0.0.1 to claim the npm name
- [ ] Record `Melong` as the name of the practice review screen in the app spec
