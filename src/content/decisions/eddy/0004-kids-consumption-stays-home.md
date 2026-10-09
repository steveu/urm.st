---
project: eddy
number: 4
title: Kids’ viewing stays home
date: 2026-04-13
written: 2026-05-16
summary: All AI that touches what the kids watch runs on a local model at home, even though frontier models are better at the task.
amended: [2026-10-09]
---

In 2026 the default for kid-safety classification is to call a frontier model — Claude or GPT are meaningfully better at the task than anything that runs on consumer hardware. Eddy doesn't. Every piece of kid-facing inference — guard triage, discovery scoring, Drift observations, the "why this?" lines — runs against a small local model on the home server. The model will be replaced as better ones ship that fit the hardware; the rule survives the replacement.

The principle is the load-bearing decision, not the model choice. Trust with the kids is the product: they will accept being looked after; they will not accept being watched. Routing watch history, transcripts or borderline judgements through a third-party API breaks that on the inside even if nothing visible changes.

There's a second-order argument too. As AI-generated content volume goes vertical, trusted human judgement becomes the scarce resource. A household-scale system whose intelligence improves on consumer hardware is the right shape for a privacy-first product; one whose intelligence depends on a frontier API has a different posture and a different ceiling on what it can promise.

## Consequences

- Guard quality is bounded by what local models can do on the home server. The guard is measured against parent decisions, and enforcement goes live one source of kid content at a time ([“The guard goes live in stages”](./the-guard-goes-live-in-stages)).
- The adults' AI control plane, when it's built, must pass its responses through a privacy filter that replaces the kids' names with placeholders and strips any viewing detail (titles, creators, watch times), failing closed rather than sending. Neither the control plane nor the filter exists yet. The check that is built today is narrower: the weekly summary never puts a user's identity or real name into its prompt, and its output is checked for household names before it's stored.
- No cloud analytics or external observability service touches the kids' behaviour. Logs containing kid events stay at home.
- Escalating uncertain cases to a frontier model is deferred, not approved. Where a frontier model may touch the guard at all is now settled elsewhere: offline, on public data only ([“Guard training labels come from a frontier teacher on a public pool”](./guard-training-labels-come-from-a-frontier-teacher-on-a-public-pool)), with household decisions used only to measure it ([“The guard judges safety; the family judges taste”](./the-guard-judges-safety-the-family-judges-taste)). Sending a household item to a frontier model at runtime stays out unless it can be done without breaking this rule.
- Adults aren't covered by this rule. They can point a frontier model at their own data if they choose — the boundary is the kids, not the household.

## Amendment — 9 October 2026: live in stages, and a filter not yet built

The original consequences said the guard would run in shadow mode and then go live in one step. It went live in stages instead. Discovery surfacing is enforced: only a clear yes reaches a kid. A kid's slate picks are enforced by a second pass after download. A kid's other requests, such as share-sheet requests, are still scored in shadow mode; enforcing those is next. The original also described the adults' privacy filter as if it existed. It's a requirement on a surface that isn't built yet, and is now worded that way.
