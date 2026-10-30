---
project: eddy
number: 15
title: The guard judges safety; the family judges taste
date: 2026-10-02
summary: A 51% precision score was mixing unsafe with not for us. Block now splits in two, and judged on Unsafe alone, the same guard scores 96.6%.
amended: [2026-10-09, 2026-10-30]
---

The Decisions screen gave a parent two answers for any video: Allow or Block. The first replay of the guard's test harness scored the current candidate prompt against those answers and reported a clear-yes precision of **51%**, against a target of at least 95%.

Splitting the result showed the number was measuring two different things. Of the videos the guard approved and the parent blocked, about half scored zero on every rubric dimension — and looking at those, most weren't unsafe at all. Roughly half of them came from a single channel's sales videos, and most of the rest were mainstream creators the parent simply didn't want. Only a few percent of the blocks were genuine safety misses, and every one was a *knowledge* gap rather than a judgement error: slang, brand names and trends the model didn't recognise.

A parent's Block meant either **unsafe for this kid** or **not for us** — quality, taste, relevance, a channel the family doesn't care for. The guard was being scored against both, and no threshold could fix that. Re-deriving verdicts from the cached scores under stricter rules barely moved precision, because the model had correctly found nothing unsafe in videos the parent rejected on taste.

The rule: **the guard decides one question — whether a video is unsafe for this kid's age — and is measured only on that. Whether a video is right for this family is the parent's call, recorded as Not for us. It's a preference signal for the feed, never a guard label, and it never changes a profile or channel on its own.**

## Consequences

- **Block splits into Unsafe and Not for us** wherever a parent decides. Both do exactly what Block did: the video leaves, or never reaches, that kid's feed. Only the meaning of the label differs.
- **The eval measures the guard on Unsafe only.** Not for us and older unlabelled Blocks are reported separately, outside the safety metrics. This narrows [“Guard training labels come from a frontier teacher on a public pool”](./guard-training-labels-come-from-a-frontier-teacher-on-a-public-pool): household decisions are evaluation data, and now only their safety half is evidence about the guard.
- **The rubric stays a safety rubric.** Taste dimensions — quality, clickbait, "brainrot", sales content — aren't added to the guard to win back precision.
- **Not for us is meant to feed the slate, within the existing guardrails.** It belongs with the negative ranking signals, but nothing in ranking reads it yet: today Unsafe and Not for us have the same effect at home, and only Unsafe counts against the guard. It may *suggest* a change, such as offering to block a channel after repeated Not for us answers, but it never applies one without the parent's tap.
- **The parent's safety role remains, and narrows.** Uncertain verdicts still escalate, and spot checks still sample approvals. With taste out of the measure, the remaining misses are the knowledge gaps a small local model is expected to have — slang, brands, niche subcultures. That's the argument for the frontier teacher and a rubric glossary, not for making the parent the safety backstop for everything.
- **Kid-safety defaults don't change.** Both labels block, the guard still escalates when uncertain, and nothing here lets an uncertain item through.

## Considered and rejected

- **Teach the guard taste.** Rejected: taste is per family and changes week to week. A small model would learn this household's topics rather than any standard — and it would blur the one guarantee the guard exists to give.
- **Keep one Block and infer the kind from reason chips.** Rejected: chips are optional and rarely used, and the kind is the one thing the eval can't do without.
- **Tighten the verdict rules until precision passes.** Rejected: on the replay, no stricter rule reached the target. The strictest pushed the live uncertain rate to 44% while leaving precision on hard cases at 35%, because the shortfall was in what the labels meant, not in the thresholds.

## Deferred

- **Not for us from the kid's feed as a parent sees it.** Parents currently meet most videos in Decisions, so that's where the split lands first.
- **Revisit if Unsafe-only precision still misses.** Then the gap is real safety error, and the responses are a better model, richer input, or more escalation — in that order.

## Amendment — 9 October 2026: intended, not yet wired

The original said Not for us feeds the slate. That's the intent, but no ranking code reads the label yet, so the consequence now says so. Nothing else in the decision changes.

## Amendment — 30 October 2026: the Unsafe-only number

The Deferred list said to revisit if Unsafe-only precision still missed the target. On the 18 October replay it doesn't. Scored on Allow against Unsafe alone, the same guard the 51% was measured on has a clear-yes precision of **96.6%** on the held-out decisions (134 videos, 95% confidence interval 91.6–98.7%) and 97.9% on the rest (526 videos). That meets the 95% target, though the held-out interval still reaches below it, so the item stays open until the lower bound clears too. The two runs used different snapshots — the later one has more decisions, revised labels and recovered videos ([“Guard changes must beat the incumbent on replay”](./guard-changes-must-beat-the-incumbent-on-replay)) — so the gap between 51% and 96.6% comes from what was measured and on which videos, not from a change in the guard. Nothing else in the decision changes.
