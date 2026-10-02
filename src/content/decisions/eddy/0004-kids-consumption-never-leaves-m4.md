---
project: eddy
number: 4
title: Kids’ viewing never leaves the house
date: 2026-04-13
written: 2026-05-16
summary: All AI that touches what the kids watch runs on a local model at home, even though frontier models are better at the task.
---

In 2026 the default for kid-safety classification is to call a frontier model — Claude or GPT are meaningfully better at the task than anything that runs on consumer hardware. Eddy doesn't. Every piece of kid-facing inference — guard triage, discovery scoring, Drift observations, the "why this?" lines — runs against a local model on the M4. Today that's Gemma 4 E4B, served by Ollama. The model will be replaced as better ones ship that fit the hardware; the rule survives the replacement.

The principle is the load-bearing decision, not the model choice. Trust with the kids is the product: they will accept being looked after; they will not accept being watched. Routing watch history, transcripts or borderline judgements through a third-party API breaks that on the inside even if nothing visible changes.

There's a second-order argument too. As AI-generated content volume goes vertical, trusted human judgement becomes the scarce resource. A household-scale system whose intelligence improves on consumer hardware is the right shape for a privacy-first product; one whose intelligence depends on a frontier API has a different posture and a different ceiling on what it can promise.

## Consequences

- Guard quality is bounded by what local models can do on the M4. The guard ran in shadow mode first, to measure the gap before going live.
- The adults' AI control plane passes through a privacy filter that replaces the kids' names with placeholders and strips any viewing detail (titles, creators, watch times). It's covered by integration tests, and a failure throws rather than sends.
- No cloud analytics or external observability service touches the kids' behaviour. Logs containing kid events stay on the M4.
- Escalating uncertain cases to a frontier model is deferred, not approved. The open question is whether that can be done *without* breaking this rule — for example parent-approved escalation per case, or de-identified prompts. It won't be reopened until there are a couple of hundred parent decisions to show the real quality gap.
- Adults aren't covered by this rule. They can point a frontier model at their own data if they choose — the boundary is the kids, not the household.
