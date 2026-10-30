---
project: eddy
number: 17
title: The model describes; code decides; only an explicit clear yes reaches a kid
date: 2026-09-25
written: 2026-10-09
summary: The local model scores a video against a safety rubric and never gives a verdict. A versioned table turns the scores into one for each age band, and every failure lands short of a yes.
retroactive: true
---

**Status:** built for discovery candidates and the second pass after download, behind a switch that isn't yet the default. A kid's own requests and the interests a kid types still use an older verdict prompt, in shadow mode.

The first guard prompts asked a small local model for a verdict (clear yes, uncertain or clear no), a one-sentence reason and a confidence figure. That shape has two faults. The age limits live inside the model's head, so changing what an age band may see means rewording a prompt and hoping. And the confidence figure is self-reported: it can't be thresholded, and nothing in Eddy ever used it to decide anything. A safety boundary needs a rule someone can read, test and version.

The rule: **the model describes a video and never judges it. It scores the rubric; a pure, versioned function turns those scores into a verdict for the kid's age band. A kid's surface shows only an explicit clear yes, and every failure lands short of one.**

**What the model returns.** For each of eight rubric dimensions — language, violence, frightening, sexual, substances, dangerous acts, commercial, attitude — a severity from 0 to 3. For each hard stop — self-harm, hate, sexualisation of children, misogyny as a worldview — none, suspected or clear. Two flags: an adult-rated franchise, and loot-box mechanics. And one short reason. No verdict, no confidence. The prompt asks how strong the content is, not whether a child may watch it, and the age band isn't in the prompt at all.

**What code does with it.** A per-band limits table decides:

- every dimension within its limit is a clear yes
- one level over on any dimension, or a suspected hard stop, is at best uncertain
- two or more levels over, or a clear hard stop, is a clear no
- flags can only tighten: discovery never surfaces a flagged video

Each step can only make the verdict stricter, and a missing or unknown age band maps to the strictest one. The verdict carries what moved it off a clear yes, by rubric dimension and score, so a parent sees why without the model having said so. The rubric and its limits share one version, the prompt is generated from the rubric, and every verdict records both versions.

**Failure never passes.** A model error, an unreadable answer or a crash is uncertain. Prompt truncation is turned off, so a prompt too long for the model is an error, and so uncertain, rather than a silently cut rubric with a well-formed answer. A video the platform itself age-restricts is a clear no without asking the model. Wherever the guard is enforced for a kid, uncertain parks the item as an escalation for a parent, and it's never shown while it waits.

**Only an explicit clear yes surfaces.** The surfacing step requires a clear yes and excludes channels a parent has blocked; a video that was never checked has no verdict and doesn't surface. This is the boundary [“Kid follows are ungated; the guard at surfacing is the boundary”](./kid-follows-are-ungated-the-surfacing-guard-is-the-boundary) names.

## Consequences

- **Age policy is a table, not a prompt.** Moving a limit is a one-line change with a test, which fails if the code drifts from the published rubric, and stored scores can be re-banded without asking the model again.
- **Scores are stored, not just verdicts.** A stricter or looser rule can be replayed over past scores, which is how [“The guard judges safety; the family judges taste”](./the-guard-judges-safety-the-family-judges-taste) showed that tightening the rules couldn't fix a label problem.
- **One rubric serves every reader.** The guard prompt and the parent's reason chips read the same versioned rubric, and the planned teacher in [“Guard training labels come from a frontier teacher on a public pool”](./guard-training-labels-come-from-a-frontier-teacher-on-a-public-pool) is designed to read it too, so they can't drift apart.
- **Two prompts coexist for now.** The older verdict prompt is still the code default and the fallback. A kid's requests and typed interests still use a verdict prompt, but both run in shadow mode ([“The guard goes live in stages”](./the-guard-goes-live-in-stages)), so none of those verdicts decides what a kid sees.
- **A safety miss is a scoring miss.** If a video reaches a kid that shouldn't have, the question is which dimension the model under-scored, and the stored scores answer it. It's never "the model felt confident".

## Considered and rejected

- **The model returns a verdict and a confidence.** The old shape. Rejected: the limits are invisible and untestable, a band change means a prompt change, and the confidence is self-reported and uncalibrated.
- **Per-kid thresholds.** Rejected: limits are per age band, so a sibling's settings follow from their age, and there's one table to read and test.
- **Fail open.** Treating a model error as a pass, or showing an unchecked item while the guard catches up. Rejected: kid safety defaults to escalation. A failure costs a pick, not a kid's exposure.
- **The age band in the prompt.** Rejected: it invites the model to apply its own idea of what suits an age on top of the table, so the same video would score differently for each kid, and stored scores couldn't be re-banded.

## Deferred

- **Retire the old prompt.** Make the rubric prompt the default and remove the switch once the harness ([“Guard changes must beat the incumbent on replay”](./guard-changes-must-beat-the-incumbent-on-replay)) has nothing left to compare it with.
- **Kid requests and typed interests** still use a verdict prompt. Moving them onto the rubric is undecided.
- **Calibrated scores.** A score read from the model's own token probabilities could be thresholded where a self-reported number can't. Not built in the live guard. Since 18 October the replay harness can read how the model's probability is spread over 0–3 for each dimension, and measure a threshold on the chance that a score is over its limit. It can only make a verdict stricter, and adopting it is a decision for [“Guard changes must beat the incumbent on replay”](./guard-changes-must-beat-the-incumbent-on-replay).
