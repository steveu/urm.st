---
project: one-thought
number: 19
title: An off-the-shelf button, not a bespoke brass penny
date: 2026-06-15
summary: I parked the brass penny for a certified off-the-shelf Flic, because about 80% of the cost and complexity came from sealing a radio and battery inside metal.
retroactive: true
---

The counter was first imagined as **the penny**: a brass worry-coin you carry in your pocket and press, with the whole logger built inside the sealed brass body. It is where the brass full stop in the wordmark comes from.

The design moved quickly over three days. Brass kills 2.4 GHz Bluetooth, so on 13 June the connected penny dropped the radio: it would log presses to onboard flash and be read over NFC by tapping it to the phone at the end of the round, with a Flic 2 button standing in during development. On 14 June it was resettled around a snap caseback, a steel snap-dome that was both the click and the switch, and a CR2032 cell in a 32 × 10 mm body.

Then a rough supplier read put the integrated coin in the **several-hundred-pounds** range at the volumes I'd actually run. A critical pass traced the cost, and nearly every flaw, to a single decision: **powering a radio and a replaceable battery inside sealed metal**. That one constraint forced the RF window through the metal and its ferrite, the button-cell securement problem, a 0.2 mm machined diaphragm, the snap caseback and its flex tether, and a roughly three-year consumable inside an object sold as a forever heirloom — about 80% of the cost and complexity for little a user can feel.

The decision: **stop forcing electronics into brass.** The connected counter is a Flic button — a certified, shipping Bluetooth device that already carries the button, battery, counting, background sync and all the compliance — optionally dressed in a brass cap for heft. The Flic is the hardware, not a stand-in.

## Consequences

- **The app's Bluetooth path is the product path.** Presses arrive over Bluetooth, live or buffered while out of range and delivered on reconnect, so background sync is real rather than a feel-test concession. The app pairs with the button itself through the first-party SDK; the official Flic app is not in the runtime path.
- **Two objects, two names.** The connected counter is **the button**, named as the physical thing you press. **The penny** survives only as an idea, a solid-brass keepsake with no electronics.
- **The bespoke build is parked, not deleted.** Its 3D model, cross-section and engineering brief are kept, with the critical pass's known issues written down so a revisit starts from them and not from the brief's prose. Among them: a coin-pry snap-fit is in real tension with UL 4200A and Reese's Law, which want a button cell secured by a tool; a leaded brass alloy on a constantly handled, child-reachable object runs into REACH and CPSIA lead limits; and hollowing the coin for electronics cuts it to about 35–45 g against roughly 68 g for a solid disc, when heft was a core goal.
- **The companion question narrowed.** With one off-the-shelf device in hand, what remained was Flic or Apple Watch, settled Flic-first ([“Companion device: Flic first, Apple Watch deferred”](./companion-device-flic-first)).

## Considered and rejected

- **Bluetooth inside the brass.** Brass blocks the radio.
- **An NFC logger in brass, read at the end of the round.** It solved the radio but kept the sealed battery, the window in the metal and the cost.

## Deferred

- **The integrated penny.** Revisit if volumes and budget rise enough to absorb the one-off engineering cost — a custom board, on-metal NFC qualification, compliance testing — or if the Flic with a brass cap fails the totem test and an integrated object proves worth its cost.
