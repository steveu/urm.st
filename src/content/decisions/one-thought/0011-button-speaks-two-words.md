---
project: one-thought
number: 11
title: "The button speaks two words: no double-click take-back"
date: 2026-07-03
summary: The pocket button does just two things — a press counts, a hold marks a moment — with no double-click to undo, because a round isn’t something to edit from your pocket.
---

The button's grammar had moved three times. The first decision was click only. A design sheet on 12 June settled a three-word grammar: a click counts, a double-click takes the newest count back, a hold marks a moment. The feel-test spec recorded that change, and the app was built to the three words — the round page said "Tap twice to take one back", a simulator control faked the double-click, and the store carried a take-back verb.

Then the settled canon quietly went back to two. The glossary's Device vocabulary spoke only of *press, hold, pair, battery*, and translated **press → tap, hold → moment** — no double-click, no take-back — and the project overview matched. But no document had recorded the removal as a decision, so the plan kept a take-back aside and the app kept the feature. I confirmed the removal mid-build on 3 July. This record is its write-up, made after the fact, so the reasoning is kept spare.

The decision: **the button speaks two words.** A press counts the thought you're carrying; a hold marks a moment. There is no take-back gesture and no editing the round from your pocket. A stray tap is noise the read absorbs, and the ledger keeps whatever was recorded.

Carried through:

- The round page drops "Tap twice to take one back."
- The simulator's double-click control goes, and the store's take-back verb with it.
- The Device boundary — the single funnel for presses from [“App structure: refine in place”](./app-structure-refine-in-place) — models click and hold only.
- The `taken_back` database column **stays**. Migrations are frozen history, and the ledger reports the schema honestly: every cell now reads "no", and a moment's cell stays a dash.

## Consequences

- A Flic that isn't listening for a double-click delivers single clicks without the disambiguation delay. Counts register faster, which suits a phone-in-pocket ceremony.
- The superseded design documents keep their three-word text as historical record; the plan is corrected.
- If a take-back ever returns, it returns as a considered surface — a correction on the Record side, say — not as a pocket gesture. The dormant column is ready.

## Considered and rejected

- **Keep the double-click.** Rejected. It invites editing a round the ceremony wants left alone, costs every single click the disambiguation delay, and asks a fumbling glove to perform a precise gesture mid-hole.
