---
project: eddy
number: 6
title: Agents are infrastructure, not interface
date: 2026-05-16
summary: No chat in front of the kids. AI works inside existing features or as calm, infrequent interjections; conversation is only for adults doing admin.
---

By 2026 the AI-native default for a smart family media product is a conversational agent — open-ended chat in front of every user, lean-forward, infinite. Eddy doesn't have that surface and isn't going to. The kids' main surface is a short daily set of cards; the adults' is the same plus a magazine-style weekly read. The only conversational surface in the system is the adults' control plane through Claude, behind the privacy filter, because conversation is the right register for admin work.

The principle has two halves and they're inseparable.

The rejected half: no chat in front of kids, and no conversation as the main surface for the daily read. Chat is dopamine-shaped by default — open-ended, lean-forward, infinite — and Eddy exists to *replace* that loop, not to import it under a smarter brand.

The affirmed half: smart features go *inside* existing features — the guard's reasoning, discovery's "why this" line, Drift's observations, the balance prompt — or arrive as new *calm interjections*: slow, specific, infrequent, with no expectation of a conversation back. Any new interjection has to be quieter than what came before, not chattier.

## Consequences

- Conversation only in the adults' control plane. A new conversational surface is a violation, however capable the model becomes.
- New smart features default to interjection, not surface. If a feature can't fit inside an existing one or as a calm interjection, the design gets reshaped before it's built.
- A smarter model changes the *contents* of a call — richer borderline judgements, sharper observations — not the shape of the surfaces. There is no future "go AI-native" phase; the current plan already is the AI-native plan, run against better models over time.

## Deferred

- **Reasoning loops instead of one-shot inference.** The guard and discovery score items in batches. A future feature might benefit from multi-step loops (search, evaluate, search again). Revisit when a specific feature hits a wall that one-shot inference can't clear.
- **The local model's ceiling.** This assumes Gemma-class models keep improving on consumer hardware. If that bet sours, frontier escalation for the guard is the existing fallback, reconciled with [decision 4](./0004-kids-consumption-never-leaves-m4) case by case.
