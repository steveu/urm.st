---
project: one-thought
number: 14
title: "The wrist: a watch app as a second counter"
date: 2026-07-11
written: 2026-08-21
summary: An Apple Watch app joined as a second way to count, for golfers who’d rather wear a watch than carry a button — but it only relays presses, and the phone still keeps the round.
amended: [2026-08-21]
---

[“Companion device: Flic first, Apple Watch deferred”](./companion-device-flic-first) chose the Flic button and deferred Apple Watch to a conditional later phase, as "a whole second platform plus cross-device sync". The design work arrived first: on 11 July the watch face was drawn in the design canvas as one screen with two states — a sleeping complication at rest, a live counting surface during a round. I commissioned the build the same day. That commission was the revisit the Flic-first decision asked for.

The decision: build the wrist as a **second counter, not a second book**. One watchOS target, one screen, no store, no router, no persistence.

- **The phone owns the round.** The watch can't begin, end or read one. State crosses from phone to wrist as WatchConnectivity's application context — is a round open, the carried thought's name, its tap rule — latest wins, pushed on every change of round or thought, surviving a relaunch on either side.
- **Events cross from wrist to phone and stop at the funnel.** A tap on the screen counts; a hold marks a moment. The shared wire vocabulary stops at the two link boundaries, one on each device. The phone side borrows the button's two words — a tap arrives at the button service as a click, a hold as a hold — so the wrist and the button share one path into the book, including the location fix taken after the row is written ([“Location capture: one fix per tap, never continuous tracking”](./location-capture-per-tap)).
- **Delivery follows the Flic's queued discipline.** When the phone is reachable, an event crosses live (`sendMessage`, which also wakes a dead phone app in the background, as a Bluetooth press does). When it isn't — or if the live send errors — the event queues (`transferUserInfo`), stamped with the instant it happened on the watch, and arrives flagged as queued: it lands in whichever round held that instant, or is absorbed as noise if none did. A live send whose error handler fires after the message has in fact landed would cross twice, so the phone admits each event once by its identity (kind plus instant). That guard is in memory, and a duplicate that straddles a process death is accepted as noise the read absorbs.
- **No count on the screen.** The phone's round page shows no live tally, and the wrist follows the same law. A seal-point answers every act — a ring bloom for a tap, a stamped diamond for a moment — and verification lives in the hidden ledger.
- **Two words only** ([“The button speaks two words: no double-click take-back”](./button-speaks-two-words)). No take-back gesture on the wrist.
- **The wrist wears patina, flat.** A watch face is lit glass in the dark, so the tokens are the dark palette's values without light/dark switching, and the same Petrona and Plex Mono faces ship in the watch bundle.

## Consequences

- Connect stays the button's door. A Button-or-Watch choice at Connect is deferred: the wrist needs no pairing ceremony, so nothing blocks a round.
- The name `Watch` was already taken by the database observation wrapper, so the new code says **wrist** throughout.
- The watch app had no icon yet; TestFlight day would want one cut from the pressmark.
- A separate run script drives the paired simulators; the phone-only one is untouched.

## Addition — 21 August 2026: the release line, and two counters at once

Two rulings the decision left unsaid. Neither changes what was built.

**The wrist ships in build 1.** It sits in front of the release line, not behind it: every archive carries two binaries, and the first upload is the phone and the wrist together. [“First release at the maps-free loop”](./first-release-maps-free-loop) is amended to match — its first release was drawn as one platform proving the pocket loop; it now carries the wrist as well, with matching versions across the two bundles (1.0, build 1). The wrist's strings fall inside build 1's copy review, written by me like the round flow they count through. Two gates followed, and one was cleared the same day: the icon was cut from the pressmark into the watch bundle. An embedded app with no asset catalogue fails App Store Connect validation outright, so it was never a cosmetic gap. That left one: a round played on real hardware — which is what the phone's own counting had to earn before it shipped. On 23 August that round moved to after the archive, played from the TestFlight build: a build only I can see ships to nobody else, and a bad round then costs a fix and a build 2, not a recall.

**One counter per round is the golfer's choice; the app doesn't arbitrate.** Nothing stops a golfer wearing the watch and carrying the button in the same round, and if both are used, the same shot counts twice. The phone admits each wrist event once by its identity, but that guard is keyed on the wrist's instants and is structurally blind to a Flic press arriving at the same funnel. That's the golfer's to avoid, not the app's to referee. No chooser at Connect, no debounce across the two adapters, no "active counter" state — an arbitrating app would have to decide which instrument the golfer meant, and it can't know. Written down so the next reader sees a ruling rather than an oversight.
