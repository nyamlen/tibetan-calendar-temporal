---
title: "Naming Brainstorm: npm Package, Org, and App"
created: 2026-08-10
status: in-progress
participants: Carson (brainstorming), Sophia (storyteller), Victor (innovation strategist)
---

# Naming Brainstorm: npm Package, Org, and App

_Session date: 2026-08-10_

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

---

## Decision 2: GitHub/npm Org Name

**Status: LEANING — `nyamlen` (practice)**

### Leading Candidate: `nyamlen`

- Tibetan: ཉམས་ལེན། (nyams len) — "practice" (the act of practicing)
- **Available on both GitHub and npm** (confirmed via 404 checks)
- Semantically covers all planned tools: calendar, timer, vows — they all support practice
- Short (7 chars), pronounceable by English speakers
- Authentic, insider-legible to Tibetan Buddhist practitioners
- Works as an npm scope: `@nyamlen/practice-days`

### Alternatives Considered

| Name | Why set aside |
|------|--------------|
| kartsi | "Star calculation" — too narrow once timer + vows entered scope |
| tibcal | Too narrow (calendar only) |
| phugpa | Tradition name — slightly academic for an org housing consumer apps |
| gomkhor | "Meditation cycle" — harder to spell/remember |
| thunlab | "Session lab" — less cultural resonance |
| dharma-dev | Too broad, likely taken |

### Open Question

If the app gets a separate name (see Decision 3), does `nyamlen` still feel right as the *org* name? Current thinking: yes — "practice" as the umbrella, with a more brandable app name underneath.

---

## Decision 3: App Name

**Status: EXPLORING — top two candidates**

### Finalist 1: `Nyamlen`

- Same as org name (the Vercel/Supabase pattern)
- Meaning: "Practice" — every tap is an act of practice
- Honest, daily, grounded
- Teachers say it: "The point is nyamlen — just keep practicing"
- Risk: less visually distinctive as a brand vs. the alternative

### Finalist 2: `Melong`

- Tibetan: མེ་ལོང། (me long) — "mirror"
- Metaphor: the app reflects your practice back to you — your days, sessions, vows
- Design language built in: reflection, clarity, seeing yourself clearly
- More consumer-brandable, more visual identity potential
- Distinct from org name — gives separation between the developer layer and the product layer

### Emerging Pairing

**Org = Nyamlen (practice), App = Melong (mirror)**

- The org answers "what do you make?" → "Practice tools"
- The app answers "what does it do for me?" → "Shows you your practice"
- The user sees the mirror; the developer sees the practice
- `github.com/nyamlen/melong` reads naturally

### Sanskrit Names Considered (didn't displace top two)

| Name | Meaning | Why not |
|------|---------|---------|
| Sādhana | Daily practice | Almost certainly taken everywhere |
| Tithi | Lunar day | Too calendar-specific |
| Samaya | Sacred bond | Skews too vow-heavy |
| Muhūrta | Auspicious moment | Competes with Hindu astrology apps |
| Darpana | Mirror (= melong in Sanskrit) | Melong sounds better to English ears |

---

## Open Actions

- [ ] Verify `melong` availability on GitHub and npm
- [ ] Final decision: app name (Nyamlen vs Melong)
- [ ] Final decision: org name (confirm Nyamlen if app becomes Melong)
- [ ] Register GitHub org once decided
- [ ] Register npm org once decided
- [ ] Publish placeholder `tibetan-calendar-temporal` v0.0.1 to claim npm name

---

## Summary of Likely Final State

| Thing | Name | Status |
|-------|------|--------|
| npm package | `tibetan-calendar-temporal` | ✅ Decided |
| GitHub/npm org | `nyamlen` | Leaning (confirmed available) |
| App | `melong` or `nyamlen` | Exploring |
