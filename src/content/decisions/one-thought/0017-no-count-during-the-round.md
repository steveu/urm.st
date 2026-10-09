---
project: one-thought
number: 17
title: No count during the round
date: 2026-06-12
summary: The phone and the watch never show a running tally mid-round, because adding up while you’re still playing is the very habit one of the thoughts exists to break — the count waits for the read afterwards.
retroactive: true
---

Every press of the button records a tap, so a live counter on the round screen would have been the easiest thing in the app to build. It isn't there, and it was never going to be.

One of the thoughts I drafted is *The Accountant* (it’s on the bench, not the menu): "They total the card while you're still playing it." A running tally on the round screen is exactly that — the app doing the Accountant's job for them. The count is for the read after the round.

So the round screen has no counter. Opening the phone at the turn shows the same static page you put in your pocket on the first tee: the thought, its tap rule, and a quiet way to end the round. While the feel-test was being built, verification of the counting lived in a hidden ledger behind a debug door — never in the experience.

## Consequences

- **The round page is deliberately empty of progress.** No live stats, no hole-by-hole tracking, no maps, no timers, no progress indicators.
- **It cost nothing to accept the button's delay.** The Flic's own SDK holds a single click briefly to tell it apart from other presses. With no live count to update, that delay was invisible — and dropping the double-click later removed it altogether ([“The button speaks two words: no double-click take-back”](./button-speaks-two-words)).
- **The wrist follows the same law.** When the watch joined as a second counter, it answered each act with a mark rather than a number — a ring for a tap, a stamped diamond for a moment — and no count ever appears on its glass ([“The wrist: a watch app as a second counter”](./the-wrist-second-counter)).
- **The same worry came back for sharing.** On the planned postcard, not yet built, the thought's arc will be declared by the app and never composed by the golfer, because a falling count the golfer could see and shape would be the first feature to reward under-tapping ([“The share layer: postcards from the book”](./share-layer-postcards)).
