---
project: eddy
number: 19
title: Guard changes must beat the incumbent on a replay of parent decisions
date: 2026-10-02
written: 2026-10-09
summary: A new prompt, rubric or model replaces the current guard only if it does better on the videos a parent has already judged, scored against labels that are never overwritten.
retroactive: true
amended: [2026-10-18]
---

**Status:** the harness is built, with one configuration wired in: the rubric guard ([“The model describes; code decides; only an explicit clear yes reaches a kid”](./the-model-describes-code-decides)). The rule applies to guard changes from here on; the switch to the rubric prompt was made before the harness existed, on a re-run of parked candidates.

A guard change — a new prompt, a rubric edit, a different model — is easy to judge by impression: run it on a handful of videos, like what comes back, ship it. On a kid-safety boundary that's how a regression gets in unnoticed. Once parent decisions existed ([“The guard goes live in stages”](./the-guard-goes-live-in-stages)), there was a better test: what would this configuration have said about the videos a parent has already judged?

The rule: **a guard configuration replaces the incumbent only if it beats it on a replay of parent decisions, measured on clear-yes precision, clear-no precision and the uncertain rate. The labels that replay is scored against are kept clean: append-only, stored apart from any model run, and free of anything the guard never judged.**

**The harness** has three steps:

- **Snapshot** freezes parent decisions into a dataset, through a read-only connection that never writes to the live database. Each item carries a best-effort reconstruction of what the guard saw when the parent decided, including the kid's history with that channel up to then. It isn't exact: it reads today's video details and counts history from today's records, so a later refresh or a deleted request can shift an input. Exact historical replay is future work.
- **Run** replays the dataset through a configuration, one model call per item and nothing written anywhere. Results are cached against the prompt and rubric versions, so an edit re-evaluates instead of resuming over stale answers, and an item the model never answered is retried, never cached as a verdict.
- **Report** scores verdicts against labels: counts and metrics only, never content ([“Kids’ viewing stays home”](./kids-consumption-stays-home)).

**Only safety labels count.** Allow is a clear yes. Unsafe is a clear no. Not for us, and an older Block with no kind recorded, are left out of the safety metrics and counted separately ([“The guard judges safety; the family judges taste”](./the-guard-judges-safety-the-family-judges-taste)).

**A fixed holdout.** A salted hash of each decision puts a stable fifth of them in a holdout — the same decisions in every snapshot, whatever else it contains — so the test set doesn't shift as labels accumulate.

**Labels are kept clean at the source.** A parent's decision is a label about a video for a kid, not about one model run: a video can carry several verdicts (the live one, re-runs, the second pass), so labels live on their own and every configuration is scored against the same ones. When a parent changes their mind, the change is a new revision; the first answer stays as recorded, and the latest revision is the current label.

**Parent picks never become labels.** A video a parent sends to a kid skips the guard, because the parent's choice is the approval. It's left out of spot checks, of the channel history and of every signal that reads a request as the kid's own interest. It still obeys blocked channels: a parent pick from a blocked channel is refused.

## Consequences

- **"Better" has a number.** A change argues from the three metrics on the same labels, not from examples.
- **The incumbent can miss the targets and still be the incumbent.** Beating it is the bar for replacement; meeting the targets in [“The guard goes live in stages”](./the-guard-goes-live-in-stages) is the bar for enforcing a new source. They're separate tests.
- **Household results are evidence for this household.** They measure the guard on one family's videos, so they decide changes here but aren't a general benchmark. A benchmark anyone can check is meant to come from the public pool in [“Guard training labels come from a frontier teacher on a public pool”](./guard-training-labels-come-from-a-frontier-teacher-on-a-public-pool).
- **Labels can be audited.** Because revisions never overwrite, the dataset has both the first answer and the current one, and how often a parent changed their mind is visible.
- **The same harness will judge the planned classifier.** A trained model, when one exists, is adopted on the same terms.

## Considered and rejected

- **Tune by impression.** Rejected: it can't see regressions on videos nobody re-checked.
- **Overwrite a label when the parent changes their mind.** Rejected: it loses what the parent first said, and silently changes the test set under every earlier result.
- **Tie a label to the model run the parent was shown.** Rejected: one video carries several runs, and older verdicts didn't record the kid. A label tied to one run can't score the next configuration.
- **Include parent picks as labels.** Rejected: the guard never judged them, so they measure nothing about it, and a parent's send isn't evidence of what the kid would have been shown.

## Deferred

- **More configurations.** Only the rubric guard is wired in; the older verdict prompt and off-the-shelf baseline models are next.
- **Retrieved precedents.** Showing the guard past decisions as examples is designed, not built. The holdout is never to be used as precedent, so it stays an honest test.

## Amendment — 18 October 2026: the holdout scored, and two gaps in the measurement closed

The first Deferred list included scoring the holdout separately. The report now does: every figure is given for the holdout and the rest beside the overall one, with 95% confidence intervals throughout.

Two gaps in the measurement are closed alongside it. Decided videos whose details had since been pruned used to drop out of the snapshot. Their title and channel are now fetched back from YouTube's Data API and kept in a file beside the database, and the snapshot rebuilds those items from it, reported separately, because a title or channel can have changed since the parent decided. And the harness can now score the verdict the guard actually gave at the time against today's labels, with no model calls. That gives precision for clear verdicts only: every escalation gets a parent's decision, but clear verdicts are only sampled, so the uncertain rate comes from the verdicts recorded over the last 14 days instead. Those include offline re-runs of parked videos, which can't be told apart from live traffic, so the figure is labelled as all recorded verdicts. Nothing else in the decision changes.
