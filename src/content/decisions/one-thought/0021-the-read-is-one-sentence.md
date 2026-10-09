---
project: one-thought
number: 21
title: The read is one sentence, and a sealed one never changes
date: 2026-07-04
summary: After the round the app writes a single plain sentence with at most one fact about where or when the taps fell, chosen by a fixed rule, and once the round is sealed those words are kept exactly as they were.
retroactive: true
---

Under everything the read shows after a round sits a machine-composed sentence:

`[Thought]: [count, one clause]. Felt [n]/5 present. [Shot n.] [Keeping/Dropping] the thought.`

For example: "Full Routine: lost it 7 times, mostly after the 7th. Felt 4/5 present. Shot 84. Keeping the thought." On a clean round nothing beats it: "Full Routine: not once. Felt 5/5 present. Shot 79. Keeping."

The sentence is the floor of the read — not the whole of it, but not negotiable — and its printed caption. The rule for choosing its clause was drafted on 3 July, and I ratified it the next day.

**Exactly one clause, or none.** There are ten candidate clauses, tried in a fixed order; the first whose trigger fires wins. Five need the taps placed on holes ("three on the 14th", "none on the par threes", "four on the back nine"). Five need only the times ("three inside twenty minutes", "none in the last hour", "spread across the round"). The last is the bare count, always true. Clauses are never combined, softened or annotated.

The order rests on four principles:

1. **The sharper location wins.** One clause is all the sentence gets, so it carries the most precisely located true fact — a hole beats a run of holes, which beats a par class, then a nine, then a third of the afternoon.
2. **Space beats time.** Holes are the round's own names; "the 14th" is how a golfer remembers. Every time clause is a hole clause before it has met its map, so hole clauses rank above time clauses even where the time pattern is numerically stronger.
3. **A zero is the sharpest number.** Absence beats presence at equal strength.
4. **Late beats early.** Ties resolve towards the round's business end, where the pressure is.

**The clause states a located fact and nothing else** — no praise, no warning, no coaching verbs. Whether "none on the par threes" is good news depends on the thought ([“Count the catch, not the crime”](./count-the-catch-not-the-crime)), and that judgement happens in the reader, not the machine. Direction enters only through each thought's authored count phrase ("lost it 7 times", "9 taps") and whether it takes a clause at all: the rep-log thoughts take none, ever, because any locating clause would read a rep log as a score.

**Composition is deterministic.** No randomness, ever. Rounding is honest by direction: a burst's window rounds *up*, so the stated window is wider than the truth; a quiet stretch rounds *down*, so it is never longer than the truth.

**A sealed round keeps its words.** The rule first carried this by determinism: the same inputs always recompose to the same sentence. That wasn't enough. Course geometry can arrive after a round was sealed without a map, and the cached geometry can be overwritten by a later fetch. So the seal stores the sentence itself, and the sealed page reads it back verbatim. The words are what the book keeps.

## Consequences

- **The rule degrades by coverage, never blocks.** A round with good maps and par can use all ten clauses; one without par skips the par clause; one with no usable map composes from times alone; one with no pattern gets the bare count. A round sealed time-only keeps that sentence forever — no rewrite when maps arrive.
- **Thresholds can be tuned; the shape can't.** The constants (what counts as a majority, a burst window, a quiet gap) may change after field use without re-ratifying. The inventory, the order and the tie-breaks may not.
- **Clock words stay in two clauses.** Once hole drawings land, the list of moments drops wall-clock times for hole names, leaving the burst and quiet-stretch clauses as the only clock-speak in the voice.
- **The book may learn more without the words changing.** A round sealed during a catalogue outage is later matched to its course so it can be shelved — but its sentence and its read are never recomposed. Sealed protects the words, not the bookkeeping.

## Considered and rejected

- **A ledger, a richer page, a carry-over view, or a moment-led page alone.** Four directions were explored for the read. It became a composite of three pages, with this sentence as the floor; the bare ledger was retired to a debug door.
- **Charts, trends and per-hole drill-down.** The second look should be re-reading the page, not mining it.
- **Longitudinal clauses, cross-thought comparison and pairing taps with the score.** Trajectory belongs to the tallies and history, not to a sentence about one round. Different thoughts' counts are different currencies. And pairing taps with outcomes is the lesson that removed *No Heroes* ([“Remove No Heroes from the thought menu”](./remove-no-heroes)).

## Deferred

- **A true record of which holes were played.** The rule infers the holes played from the highest hole an event was matched to. An outside review found the counterexample: a round started on the 10th would count the front nine as played and silent, and could state more than the data holds. A likely repair — span from the lowest to the highest matched hole — isn't yet checked against every clause, and a round that wraps from the 18th to the 1st defeats it too. The real fix is a true record of the holes played — a question at the seal, or inference from the geometry — and that is a schema change.
