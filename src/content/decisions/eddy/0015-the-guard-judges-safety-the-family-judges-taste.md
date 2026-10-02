---
project: eddy
number: 15
title: The guard judges safety; the family judges taste
date: 2026-10-02
summary: A 51% precision score turned out to be measuring two things at once. The guard is now judged only on safety, and “not for us” becomes the family’s own signal.
---

The Decisions screen gave a parent two answers for any video: Allow or Block. The first replay of the guard's test harness scored the current candidate prompt against those answers and reported a clear-yes precision of **51%**, against a target of at least 95%.

Splitting the result showed the number was measuring two different things. Of the 169 videos the guard approved and the parent blocked, 86 scored zero on every rubric dimension — and looking at those 86, most weren't unsafe at all. Forty-one were one coaching channel's sales Shorts, and most of the rest were mainstream explainers, gaming and sport creators the parent simply didn't want. About six were genuine safety misses, and every one was a *knowledge* gap rather than a judgement error: sexual slang in a game-mod title, an alcoholic drink brand, card-pack openings.

A parent's Block meant either **unsafe for this kid** or **not for us** — quality, taste, relevance, a channel the family doesn't care for. The guard was being scored against both, and no threshold could fix that. Re-deriving verdicts from the cached scores under stricter rules barely moved precision, because the model had correctly found nothing unsafe in videos the parent rejected on taste.

The rule: **the guard decides one question — whether a video is unsafe for this kid's age — and is measured only on that. Whether a video is right for this family is the parent's call, recorded as Not for us. It's a preference signal for the feed, never a guard label, and it never changes a profile or channel on its own.**

## Consequences

- **Block splits into Unsafe and Not for us** wherever a parent decides. Both do exactly what Block does today: the video leaves, or never reaches, that kid's feed. Only the meaning of the label differs.
- **The eval measures the guard on Unsafe only.** Not for us and older unlabelled Blocks are reported separately, outside the safety metrics. This narrows [“Guard training labels come from a frontier teacher on a public pool”](./guard-training-labels-come-from-a-frontier-teacher-on-a-public-pool): household decisions are evaluation data, and now only their safety half is evidence about the guard.
- **The rubric stays a safety rubric.** Taste dimensions — quality, clickbait, "brainrot", sales content — aren't added to the guard to win back precision.
- **Not for us feeds the slate, within the existing guardrails.** It joins the negative ranking signals. It may *suggest* a change, such as offering to block a channel after repeated Not for us answers, but it never applies one without the parent's tap.
- **The parent's safety role remains, and narrows.** Uncertain verdicts still escalate, and spot checks still sample approvals. With taste out of the measure, the remaining misses are the knowledge gaps a small local model is expected to have — slang, brands, niche gaming culture. That's the argument for the frontier teacher and a rubric glossary, not for making the parent the safety backstop for everything.
- **Kid-safety defaults don't change.** Both labels block, the guard still escalates when uncertain, and nothing here lets an uncertain item through.

## Considered and rejected

- **Teach the guard taste.** Rejected: taste is per family and changes week to week. A small model would learn this household's topics rather than any standard — and it would blur the one guarantee the guard exists to give.
- **Keep one Block and infer the kind from reason chips.** Rejected: chips are optional and rarely used (26 of the 169 disagreements had any), and the kind is the one thing the eval can't do without.
- **Tighten the verdict rules until precision passes.** Rejected: on the replay, no stricter rule reached the target. The strictest pushed the live uncertain rate to 44% while leaving precision on hard cases at 35%, because the shortfall was in what the labels meant, not in the thresholds.

## Deferred

- **Not for us from the kid's feed as a parent sees it.** Parents currently meet most videos in Decisions, so that's where the split lands first.
- **Revisit if Unsafe-only precision still misses.** Then the gap is real safety error, and the responses are a better model, richer input, or more escalation — in that order.
