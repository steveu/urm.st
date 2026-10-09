---
project: one-thought
number: 6
title: "Location capture: one fix per tap, never continuous tracking"
date: 2026-06-27
summary: The app records your location only at the instant you press the button, never as a continuous track, so it knows only the places you chose to mark and barely touches the battery.
amended: [2026-06-28, 2026-07-03, 2026-07-04]
---

Map Moments ([“The round-end Record: the full three-page read, map Moments included”](./record-full-three-page)) and the after-the-fact matching ([“Course coverage: any course, after the fact, degrading gracefully”](./course-coverage-any-course)) need each tap — and each moment — to have a location. There are two possible shapes: a single GPS fix attached to each tap, or a continuous background track for the whole round.

The project's settled position was already **taps only**. A location is recorded "only at the moments you choose to mark" — that's the privacy line. It costs almost no battery. And "the continuous trace is Arccos's product, not ours". Continuous logging was explicitly parked as a fallback to be earned from real rounds, not pre-built.

The decision: **capture a single GPS fix per tap.** Each tap requests one fix and attaches it to that tap's row. **No continuous track.** Course identification and tap-to-hole matching run on those per-tap fixes plus the round's time order. The permission posture is minimal: location only as needed to stamp a tap, with background Bluetooth waking the app for the press — When-In-Use, not Always. Continuous or coarse periodic logging stays a **deferred fallback**, taken up only if field tests show that cold per-tap fixes are too slow or too coarse.

## Consequences

- The privacy line holds: a location is recorded only at a tap you chose to make.
- Negligible battery cost — no continuous GPS over a four-hour round.
- Parallel holes, where the out and back run side by side, are told apart by time order, since there's no continuous trace.
- A known risk: a cold first fix from a sleeping phone can be slow or coarse. It's a field-test item, and the deferred fallback exists if it bites.

## Amendment — 28 June 2026: a moment is not a tap

The model was corrected: **a moment is not a tap.** It shares the per-tap fix mechanism — this decision is unchanged — but it's modelled as its own located event, not as a kind of tap. The earlier "a moment is a held, located tap" framing is superseded.

## Amendment — 3 July 2026: the round session

The decision stands: one fix per tap, When-In-Use, never Always, no stored track. What the original text underspecified is *how* a When-In-Use app takes a fix while the phone sleeps in a pocket. The background Bluetooth wake that delivers a press does **not** let a When-In-Use app *start* location services from the background. Starting needs the app to be in use — or a background location session already running.

The mechanism is iOS 17's `CLBackgroundActivitySession`, tied to the active round. It begins at Begin round — while the app is in use, in the player's hand — and is held for the round's whole life. That keeps the When-In-Use grant usable from the background, so a press's single fix can be taken with the phone pocketed. It's invalidated when the round ends, and recreated first thing on any relaunch with a round in flight (the OS requires prompt recreation to carry the entitlement across a background relaunch). The session shows the system's location indicator for the round's duration — an honest tell that matches the promise made when the round began.

Per press, the fix is a live location update raced against a clock. The freshest warm reading stands in if it can — under about 10 seconds from the press and under about 20 metres of doubt — otherwise one fresh request with a join window of about 15 seconds that a burst of presses shares. The tap row is always written before location is touched. A timeout, a denial, or a press delivered too long after it happened leaves the location empty: no fix on this tap, but the count still stands.

The privacy posture is unchanged: When-In-Use, never Always. Between requests no updates flow, so there's no track to store — the session merely keeps the grant warm — and fixes never leave the device ([“OpenStreetMap architecture: hosted course catalogue, matching on the phone”](./osm-architecture-hosted-geometry)).

## Amendment — 4 July 2026: one fix at Begin round, for the course

The map work adds **one further capture point**. At Begin round — the same in-use moment that starts the round session — the app takes a single fix, rounds it **on the device to two decimal places (about a kilometre)**, and uses that rounded pair as the coarse lookup key against the hosted catalogue, prefetching the hole geometry before the first tee.

This was chosen because a sealed sentence never recomposes. Fetching only at the read would let a hole with no signal at the 18th cost the round its hole-specific wording forever — and the car park usually has the signal the course lacks.

The precise fix is discarded once rounded. Only the candidate courses — and, once settled, the chosen course — persist with the round. If the prefetch fails (offline at the tee), the read retries the same lookup from the first tap with a fix, and failing that the round is composed from time alone, the lowest coverage tier. Per-tap fixes still never leave the device; the only thing that ever does is the rounded pair.

## Considered and rejected

- **A continuous background track.** The simplest matching, but it contradicts the privacy and battery stance and is unnecessary — a moment, like a tap, needs only a single fix. Rejected; this decision corrected an earlier draft that had specified it.
- **Coarse periodic logging.** The middle option. Kept as the deferred fallback, not built.
