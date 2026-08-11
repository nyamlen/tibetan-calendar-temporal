---
title: "Licence: MIT"
date: 2026-08-11
status: decided
---

# Licence: MIT

**Decision:** MIT, `Copyright (c) 2026 Andreas Bothner`.

## Rationale

Recorded so it is not re-litigated.

- Correctness is this engine's trust proposition, and the fastest route to correctness is wide adoption putting eyes on the dates. MIT has the least friction of any option.
- A calendar engine is not a competitive moat worth defending with copyleft.
- **GPL/AGPL were rejected outright.** Either would force the Nyamlen app itself to be GPL. The sole-copyright-holder exception that avoids this only holds while 100% of the copyright is owned, which means a CLA for every outside contribution — working directly against the "please fork this" posture.
- **MPL-2.0 was the considered alternative.** File-level copyleft is the only way to *require* that engine improvements come back. Set aside because contribution here will be driven by community norms rather than licence terms.
- Relicensing future versions stays possible while copyright is undivided.

## Options Considered

| Licence | Others can build closed apps? | Must publish engine changes? | Ecosystem fit |
|---|---|---|---|
| **MIT** ✅ chosen | Yes | No | The npm default; zero friction |
| Apache-2.0 | Yes | No (but must *state* changes) | Adds express patent grant |
| MPL-2.0 | Yes | **Yes** — file-level copyleft | Rarer in npm; some corporate policies flag any copyleft |
| GPL-3.0 | **No** | Yes | Would infect any app built on it |
| AGPL-3.0 | **No**, incl. network use | Yes | Strongest; closes the SaaS loophole |

## Consequences

**Forking is not a licence feature.** Any public repo can be forked regardless of licence;
what drives contributions back is a good CONTRIBUTING guide and responsive maintainership.
Don't conflate the two.

**White-labelling depends on this choice.** Shipping the same codebase under a centre's own
branding, tradition config and teacher list only works commercially with a permissive engine —
copyleft would force every deployment open. MIT and white-labelling point the same way.

**The app's licence is a separate decision** belonging to the app repo. MIT here creates no
obligation to open-source the app.

## Copyright Holder

Held personally. A GitHub org is a namespace, not a legal person, so `nyamlen` cannot hold
copyright unless an entity is later incorporated. Assignable later if one is.

Not legal advice — standard open-source practice.
