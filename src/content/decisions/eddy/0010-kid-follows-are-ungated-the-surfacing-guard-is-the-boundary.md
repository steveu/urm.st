---
project: eddy
number: 10
title: Kid follows are ungated; the guard at surfacing is the boundary
date: 2026-05-31
summary: Kids can follow creators without asking, because nothing a follow brings in reaches them without passing the guard first.
---

Eddy started suggesting creators to follow — people you've watched or saved but don't follow yet. For a kid's profile, that raised a question: should a kid following someone need a parent's approval? Kid safety is the top non-negotiable, and the obvious reflex is to gate the act of following.

Three models were on the table:

- **(A)** The kid asks to follow, and a parent approves through an escalation.
- **(B)** The kid follows immediately, like an adult.
- **(C)** Suggestions are for parents only; the kid never sees them and a parent follows on their behalf.

The deciding observation is that **a follow opens no unguarded pipe**. Everything a follow can bring in — a new upload, a back-catalogue video, a result from an inferred interest — lands in the candidate pool and must pass surfacing, which for a kid hard-requires a clear-yes from the guard. Anything not yet checked doesn't surface. And every creator in the suggestions is one the kid *already watched*, so each already cleared the guard once. Following changes only the weighting and composition among candidates that have already earned a clear-yes.

The rule: **a kid following a creator is ungated. The per-video guard check at surfacing — not the follow — is the kid-safety boundary. A follow reweights and reorders already-cleared candidates; it never bypasses the guard.**

## Consequences

- **Following works the same for everyone.** No PIN, no pending state, no escalation for the follow itself.
- **The safety guarantee lives entirely in the surfacing step,** which already covers every source. This decision names it as the boundary — weakening it is the change that would make ungated follows unsafe.
- **A follow still amplifies** — it seeds inferred interests and back-catalogue — but every amplified candidate is guarded before a kid sees it.
- **No parental approval of who a kid follows, by design.** The per-video guard is judged sufficient, and a kid's agency in building their own roster of trusted people is judged worth keeping.
- **Testable without a kid profile.** Nothing in the follow path depends on role, so it's unit-testable on its own; the kid-specific behaviour stays in the already-tested guard.

## Considered and rejected

- **(A) Parent approval.** Rejected: it invents a new pending object and approve/deny endpoints to guard an act the surfacing gate already makes safe — machinery with no safety payoff.
- **(C) Parent-only suggestions.** Rejected: no kid agency at all — a kid can't say "I want more of this person" — and more paternalistic than the per-video guard warrants.
- **A PIN gate.** Rejected: Eddy has no PIN anywhere. A parent's say happens through escalations, not on-device codes.

## Deferred

- **Revisit if the guard proves insufficient in practice.** If real-world guard quality shows that following meaningfully worsens a kid's exposure despite per-video checks, model (A) is the fallback.
- **A read-only view for parents** of who each kid follows, with an unfollow option. Compatible with this decision; not built yet.
