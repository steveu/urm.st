---
project: eddy
number: 18
title: The guard goes live in stages, and its labels come from real parent decisions
date: 2026-09-25
written: 2026-10-09
summary: Enforcement switches on one source of kid content at a time, never by relaxing the targets, and the labels that measure the guard come from decisions a parent makes anyway.
retroactive: true
---

**Status:** discovery surfacing and a kid's slate picks are enforced. A kid's own requests (from the share sheet or search) and the interests a kid types are still scored in shadow mode; enforcing requests is next.

The plan was simple: run the guard in shadow mode, scoring every kid request while downloads went ahead regardless; label its verdicts by hand through a command-line tool; switch enforcement on once the labels showed the guard met three targets:

- **clear-yes precision of at least 95%**: a wrong yes is unsafe content reaching a kid
- **clear-no precision of at least 90%**: a wrong no is good content wrongly withheld
- **an uncertain rate between 10% and 30%**: higher overloads the parent, lower means the guard is overconfident

Two things broke the plan. Discovery arrived, and a kid's slate couldn't wait for the targets: a surfaced pick is something Eddy chose to put in front of a kid, not something the kid asked for. And labelling from the command line never became a habit, so almost no labels existed. Lowering the bar to fit the labels on hand was the obvious way out.

The rule: **enforcement goes live by source, as each source can be enforced safely, and never by relaxing the targets. The labels that measure the guard come from parent decisions made in the normal course of using Eddy, not from a separate labelling chore.**

**Discovery surfacing is enforced.** A kid sees only candidates with an explicit clear yes ([“The model describes; code decides; only an explicit clear yes reaches a kid”](./the-model-describes-code-decides)). An uncertain candidate is parked as an escalation for a parent; a clear no is rejected.

**A kid's slate picks are enforced after download.** A pick passed the guard on its title and description alone. When it downloads it stays hidden while a second pass checks it again with the captions that came with the download, so there's no extra request upstream ([“Downloads are budgeted, demand-driven and stop when blocked”](./downloads-are-budgeted-and-stop-when-blocked)). Only a clear yes makes the card visible. A yes that the transcript contradicts, a missing verdict or any failure parks the pick as an escalation, with its file kept. A blocked channel, or a parent's block on that video, is checked before the model runs and again after, so a block made while the guard ran still wins.

**A kid's other requests stay in shadow mode.** They're scored and logged, and the download goes ahead whatever the verdict. A kid's typed interests are scored the same way, with no effect. Enforcing requests is next.

**Labels come from a Decisions screen.** It combines two streams:

- **Escalations:** the guard's parked uncertain items, shown with its verdict and reason. Answering one is a decision the parent had to make anyway.
- **Spot checks:** a small blind daily sample of the guard's clear verdicts, mostly yeses with some noes. The guard's verdict stays hidden until the parent answers.

A parent answers Allow, Unsafe or Not for us ([“The guard judges safety; the family judges taste”](./the-guard-judges-safety-the-family-judges-taste)). The daily notification says only how many decisions are waiting: no titles, no channels. Each answer takes effect at once and is recorded as a label about a video for a kid, apart from any one model run ([“Guard changes must beat the incumbent on replay”](./guard-changes-must-beat-the-incumbent-on-replay)).

## Consequences

- **Enforcement is uneven, on purpose.** What Eddy chooses to show a kid is held to the guard now; what a kid asks for directly isn't yet. Until requests are enforced, a kid's share-sheet request can reach their feed with a clear no on its record. That's the known gap, and it's the next stage.
- **Spot checks on shadow requests record a label only.** The video is already downloaded and visible; the answer measures the guard without changing the feed.
- **The parent's backlog is bounded.** The daily queue is capped, escalations first, and older escalations wait for a catch-up session instead of piling onto today.
- **Labels accumulate as a side effect of use.** They arrive slowly, so a precision figure takes weeks to firm up, and catch-up sessions are how a parent speeds that.
- **Family decisions measure the guard; they never train it.** That boundary is [“Guard training labels come from a frontier teacher on a public pool”](./guard-training-labels-come-from-a-frontier-teacher-on-a-public-pool)'s, and staging doesn't change it.

## Considered and rejected

- **Relax the thresholds** so enforcement could start on the labels that existed. Rejected: the targets are the definition of "safe enough", and moving them to fit thin data inverts the order.
- **Fetch a transcript for every candidate** before surfacing. Rejected: a request per candidate multiplies upstream traffic for videos most kids never see. The second pass gets captions free with the download.
- **A third-party transcript service.** Rejected: it would receive video ids derived from a kid's interests, which is household data leaving home ([“Kids’ viewing stays home”](./kids-consumption-stays-home)).
- **Show the guard's verdict on a spot check before the parent answers.** Rejected: it anchors the answer, and a label that agrees with the guard because it was shown the guard measures nothing.
- **Keep labelling from the command line.** Rejected on the evidence: it didn't happen.

## Deferred

- **Enforce kid requests.** The next stage. How a held request reaches the parent isn't built yet.
- **A push for each escalation.** Not built; the daily count is the only nudge.
