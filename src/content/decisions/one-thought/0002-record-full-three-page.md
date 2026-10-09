---
project: one-thought
number: 2
title: "The round-end Record: the full three-page read, map Moments included"
date: 2026-06-27
summary: The first version shows each moment you marked on a drawing of the hole it happened on, even though that’s the hardest part to build, because the moments are the heart of reading a round.
---

The Record is what you read after the round. It splits into a part that needs no maps — the **Cover** (the timeline of taps, a composed sentence about the round, and how it felt, the score and your verdict on the thought) and **Sealed** (the closing page that binds the round into your book) — and a part that does: **Moments**.

A *tap* is one press of the button in your pocket, counting the thought you're carrying. A *moment* is a separate thing — a hold of the button, marking a point in the round you want to remember. On the Moments page each one is resolved *on a drawing of its hole*, which needs hole geometry from OpenStreetMap, a GPS fix with each tap, and matching each tap to a hole.

The prototype is emphatic that "moments live in space — each belongs to its hole", so the Moments page is plausibly the heart of the read, not a nice-to-have. It's also by far the heaviest, riskiest lift.

The decision: **the first version ships the full three-page Record, map Moments included.** The maps-free loop (Cover and Sealed) becomes an internal milestone, not the endpoint.

## Consequences

- It pulls the OpenStreetMap and GPS course layer into core scope ([“Course coverage: any course, after the fact, degrading gracefully”](./course-coverage-any-course), [“OpenStreetMap architecture: hosted course catalogue, matching on the phone”](./osm-architecture-hosted-geometry)) and needs a GPS fix per tap ([“Location capture: one fix per tap, never continuous tracking”](./location-capture-per-tap)).
- A longer road to the public release, accepted deliberately for the read's emotional core.
- Moments are still captured, as a located list, from the maps-free milestone onwards, then resolved on the map once the course layer lands.

## Considered and rejected

- **Cover and Sealed first, Moments later.** The fastest complete loop, and it defers the OpenStreetMap risk, but the first version would lack the spatial moment the prototype treats as the heart. Rejected for the first version; kept as the internal milestone.
- **A static, pre-rendered hole image.** Resolve moments against a baked picture of the hole, with no live map or course-history machinery. A middle path; rejected because Course History — the per-hole history across every round you play — wants the live geometry anyway.
