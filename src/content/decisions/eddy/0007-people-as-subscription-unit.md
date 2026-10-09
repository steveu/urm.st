---
project: eddy
number: 7
title: People are the subscription unit
date: 2026-04-16
written: 2026-05-16
summary: You follow a person, not a channel, so one follow covers everything they make and everything they recommend carries their name.
amended: [2026-10-09]
---

Every other media product organises around channels (YouTube), feeds (RSS), shows (podcasts) or topics (TikTok). Eddy's subscription unit is the **Person** — an individual creator, duo or studio treated as one identity across all their **Outputs**: YouTube channel, newsletter, podcast, books, blog. Following a person subscribes to all of their outputs in one action, and their **Recommendations** — pointers to things they didn't make — surface with the recommender's name attached.

The decision rests on a bet about what's becoming scarce. As AI-generated content volume goes vertical, the scarce resource stops being content and starts being *trusted human judgement*. Making the person the first-class concept, and media types secondary, keeps that trust visible on every surface. Channels-as-unit would have shipped faster, but it would have collapsed trust into a content signal and made following someone across media a future bolt-on rather than the data model.

## Consequences

- Pulling recommendations out of a followed person's writing is designed into the data model from day one; the pipeline that does it isn't built yet. The rule "no automated recommendation without a visible reason" routes through a person wherever possible: *"recommended twice in the last six months by someone you follow."*
- People are the first-class entity and outputs join to them. A new source for a person is a new output row, not a new subscription.
- What the kids see about a person is qualitative and observational, never counted or ranked. The person view is a reflective surface, not a discovery one.
- A type flag (individual, duo, group, studio) handles family channels and studios. The mechanics don't change with type; only the presentation may.
- For kids, most followed people have a single output — their YouTube channel. The data model is the same at every age; the kids' interface is deliberately thin. As a kid grows into other media, the infrastructure is already there.

## Amendment — 9 October 2026: the model is real, the reach isn't yet

The data model is built; the reach across media isn't. People and their outputs are separate tables, and every output today is a YouTube channel. A newsletter or a podcast would be a new output with its own fetcher, not a re-architecture. The recommendation pipeline has a table reserved for it and no code that fills it, so the first consequence overstated it and has been corrected.
