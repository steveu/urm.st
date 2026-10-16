---
project: eddy
number: 9
title: Subscriptions and discovery compose one daily slate
date: 2026-05-22
summary: People you follow and discovery compete in one scored, capped pool. Discovery keeps reserved slots even on busy days, and a thin day stays short rather than padded.
amended: [2026-10-09]
---

The daily discovery run had a gate. Material from people you follow was the main signal, and topic search only filled gaps — it was *skipped entirely* once there was enough from followed people.

The observed failure: on a subscription-heavy morning (an adult with a few dozen items from people they follow), topic search was skipped wholesale, so the feed carried **zero discovery** — no exploration on exactly the days the household was most engaged. Separately, new uploads from followed people never entered the candidate pool at all. They went straight to download and appeared in their own band, so they never competed on score, never went through the guard for the kids, and couldn't take part in composing the day.

The rule: **the daily slate is one scored, capped pool composed into reserved slots — led by subscriptions, with hard floors for back-catalogue and delighters. The cap is a ceiling, not a target. The only kid/adult difference is the guard.**

## Consequences

- **Subscriptions become scored candidates.** New uploads from people you follow go through the same scoring, guard and surfacing as everything else, and are only downloaded if they win a slot. **Following is no longer a bypass** — a followed creator's new upload can be rejected by the guard for a kid. That's the correct safety posture.
- **A slot allocator replaces the gate.** Three buckets make the slate: subscriptions, back-catalogue, and delighters (searches on your declared interests). Two floors are reserved every day, even on a flood day — four back-catalogue, two delighters. Subscriptions fill the rest up to the cap. Spare capacity is *not* padded out: a thin day gives a genuinely short slate, which is a valid state.
- **The numbers are the same for everyone; the guard is the only difference.** Slate size is a per-user setting with a household default of 15. Diversity caps are three per interest and two per channel for everyone — though the per-interest cap doesn't apply to subscriptions, because following a person is an explicit choice an inferred grouping mustn't suppress.
- **Freshness does the ordering.** The score multiplies connection, quality, freshness and rank; new uploads get a freshness boost, so there's no separate recency sort.
- **The daily run polls subscriptions first,** then composes — replacing a drifting six-hourly poller.
- **Provenance stays three-valued:** *you asked*, *follow*, *pick*.

## Considered and rejected

- **Keep the gate.** Rejected: it starves exploration on the household's most active days — the failure that started this.
- **A privileged direct-to-feed path for subscriptions.** Rejected: it breaks composition and, for kids, skips the guard — a safety hole.
- **Smaller numbers for kids** (a 5-vs-15 slate, tighter caps). Rejected: scarcity and breadth are household values, not kid throttles. Kids aren't a throttled adult feed; they're an adult feed *plus the guard*.
- **Pad spare slots to always fill the cap.** Rejected: finishing Today is a valid state. A short slate is the right output when supply is thin.

## Deferred

- **Cold-start delighters** — letting discovery expand to fill the cap for a brand-new user with no follows.
- **Different appetites for differently aged kids,** beyond one household default.
- **A genuine serendipity source** for the delighter slot. Today it's filled by searching declared interests, which is on-topic rather than truly surprising.

## Amendment — 9 October 2026: follows polled through the Data API

When discovery reads from the YouTube Data API ([“Discovery metadata moves to the YouTube Data API”](./discovery-metadata-via-data-api)), the daily follow poll lists each channel's uploads through the official API instead of its RSS feed. Whole RSS passes had been failing quietly, every channel at once, and an upload found days late has already decayed below the slate's score floor, so a missed poll lost it for good. A pass in which every channel fails now logs as an error. The slate rule is unchanged; only the poll's transport moved.
