---
project: eddy
number: 14
title: Guard training labels come from a frontier teacher on a public pool
date: 2026-09-25
summary: A frontier model labels public videos to train a small local guard; the family’s own decisions are used only to measure it, never to train it.
---

The guard's long-term shape is a small local classifier — one head per **Rubric** dimension on a shared small backbone — scoring severities that the rubric's age-band limits then turn into a verdict. Training it needs thousands of labels in the rubric's shape.

The household can't produce them. One parent labelling one family's traffic yields hundreds, skewed to whatever the kids are into this term, and a model trained on that learns their topics rather than the parent's standards. So training labels come from a **frontier model acting as an offline teacher**, labelling a **public pool** of YouTube videos against the rubric. I audit a sample of the teacher's labels, and the rubric is revised until we agree.

**The pool never touches Eddy's data.** It's sampled from public YouTube, seeded from generic genre lists and public research datasets — never from anything derived from a household member. The pool builder can't even import Eddy's database client; the boundary is enforced by the code's dependency graph, not by convention. What reaches the frontier model is public metadata about public videos, with nothing about who in the house might watch them. That's why this sits outside [“Kids’ viewing never leaves the house”](./kids-consumption-never-leaves-m4) rather than bending it.

**Household decisions are evaluation data, never training data.** Parent escalations and spot checks measure every guard configuration — today's Gemma prompt, off-the-shelf baseline models, the trained classifier — and may later serve as retrieved precedents. They're never sent to the teacher and never used to train. A held-out slice is never used as precedent either, so the whole stack can be scored honestly.

**This isn't frontier AI at runtime.** The teacher is an offline labelling job over public data. Live verdicts stay local: Gemma today, the trained classifier if it wins on the benchmark.

## Consequences

- **The training data has to match what the guard sees live.** Transcripts only exist for videos that have been downloaded, so the classifier needs a metadata-only path for candidates and a metadata-plus-transcript path after download.
- **The pool fetches no transcripts.** That would add download traffic from the home IP ([“Downloads are budgeted, demand-driven and residential”](./ytdlp-exposure-is-budgeted-slate-bound-and-residential)). Transcripts come only from public datasets that already include them.
- **The rubric becomes load-bearing.** The guard prompt, the teacher prompt, the parent's reason chips and the classifier's outputs all read one versioned rubric. Changing it means relabelling, so every label records its rubric version.
- **"No frontier model anywhere in Eddy" stops being true.** The accurate claim is: no frontier model ever sees household data, and none runs at request time.

## Considered and rejected

- **Train on household labels.** Too few, one labeller, and it overfits the kids' current topics. Kept for evaluation, where a few hundred labels are enough to measure precision within a few points.
- **Train on public research datasets directly.** They label for toddlers and the "Elsagate" era; their "suitable" class excludes most of what an older kid actually watches. Useful as hard examples in the pool and as a public baseline, not as the label source.
- **A large local teacher.** The M4 has 16 GB and already holds Gemma; no strong large open model fits beside it. A rented GPU would keep everything self-controlled, but a frontier teacher on public data carries no household data and is simpler to run.
- **Hosted classifier APIs at runtime.** Kids' requests would leave the house. Their *shape* is the target; their hosted products aren't.
