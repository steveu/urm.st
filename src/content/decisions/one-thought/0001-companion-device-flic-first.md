---
project: one-thought
number: 1
title: "Companion device: Flic first, Apple Watch deferred"
date: 2026-06-27
summary: The first version counts with a single off-the-shelf Flic button in your pocket, because building for Apple Watch as well would mean a whole second platform for one developer.
amended: [2026-07-11]
---

One Thought is a golf app built around a single swing thought: you choose one before the round, count it on a small counter in your pocket while the phone stays put, and read the round afterwards. The early prototype made Apple Watch a first-class companion — its own counter surface, marked moments, the round's state on the wrist. The feel-test spec had listed Apple Watch as a non-goal, though, and the build declared no watchOS target. The connected device had already pivoted to an off-the-shelf Flic button; a bespoke brass "penny" with the electronics sealed inside was parked.

This was the single biggest scope lever for a solo developer. A Watch path is a whole second platform plus cross-device sync.

The decision: **the first version's companion is the Flic button only.** The Apple Watch path is deferred to a conditional later phase.

## Consequences

- Connect, the screen where you pair before the first tee, is a single-device pair-or-skip, not a choice between Button and Watch.
- One platform to build and ship; no WatchConnectivity in the first version.
- The brass-object thread is kept — the heirloom penny, and an optional brass cap for the button — and golfers without a watch are included.
- The data model shouldn't *preclude* a later watch (the round's state already lives off the phone conceptually), but no watch-shaped code is written now.

## Amendment — 11 July 2026: the deferral lifted

The revisit this record made a condition arrived on 11 July 2026: the watch face was drawn, I commissioned the build the same day, and [“The wrist: a watch app as a second counter”](./the-wrist-second-counter) lifts the deferral. This record is amended, not superseded — the decision it turns on, Flic first, is untouched. It was ratified into the first release on 21 August: the wrist ships in build 1.

What dies with the deferral:

- "One platform to build and ship; no WatchConnectivity in the first version." There are two binaries in the archive, and WatchConnectivity now carries the round's context out to the watch and the wrist's taps back.
- "No watch-shaped code is written now." The watch app is watch-shaped by construction — one screen, no store, no router, no persistence.
- The conditional later phase this record pointed at, which was rewritten to describe what was built rather than what was sketched.

What survives it:

- **The Flic remains the first counter.** The wrist is a second one, for the golfer who wears a watch rather than carrying a button — not a replacement, and not a peer at Connect, which stays the button's door. The first consequence above holds as written: a single-device pair-or-skip, never a Button-or-Watch choice. The wrist needs no pairing ceremony, so nothing there had to change.
- **The phone remains the record.** "The data model shouldn't preclude a later watch" was the right half of that consequence, and it paid: the wrist can neither begin, end nor read a round, no count appears on its screen, and the book is the phone's.
- The brass-object thread, and golfers without a watch. Neither the penny nor the button lost anything to the wrist.

## Considered and rejected

- **Watch and Flic as peers in the first version.** Matches the prototype and needs no extra hardware for watch owners, but doubles the surface area and front-loads sync. Rejected as too much for a solo first version.
- **Watch only, drop the Flic.** The simplest hardware story, but it abandons the brass object and excludes golfers who don't wear a watch. Rejected.
