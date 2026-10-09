---
project: one-thought
number: 8
title: The design-system specimen is the paper register’s authority
date: 2026-07-03
summary: One design specimen became the single authority for how the app’s screens look and move, rebuilt by hand in Swift rather than imported, so three drifting colour palettes stopped multiplying.
amended: [2026-07-04, 2026-08-21]
---

One Thought has two visual registers: **paper** — the app's screens, flat and typeset — and **object** — the penny, the icon, rendered material. On 3 July a design-system specimen for the paper register came over from the project in Claude Design (which stays the source of truth; the copy in the repo is a mirror). It's a field manual: one principle (*brass is the hand*), a unified token set, named type roles, the marks, component renderings, assembly patterns, a motion table and voice plates.

The app's hand-built design system predated it and had drifted. Three dark "patina" palettes now existed — the specimen's `#1B1612`/`#C7A14E`, an earlier web palette, and the app's own brass at `#C9A64E`. The hairline rule disagreed, 16% against 18%. The specimen named roles and marks the app lacked. And it rendered, ahead of the build, exactly the components the next milestone needed: the verdict, the feel rating, the score field, the bookplate.

The decision: **the specimen is the design authority for the paper register, and the iOS app mines it** — tokens and components re-expressed by hand in Swift. No code generation, no web views, no CSS import. Authority is layered: the glossary still beats the specimen on naming, the voice guide on words, and the registers doc on the paper/object split. The specimen rules on how the paper register *looks and moves*.

The mining has one build-facing artefact: a platform-neutral design file, the specimen abstracted off its web CSS (pixels read as points), which is what an agent builds from. Where it and the specimen disagree on a value, the specimen wins and the file is re-derived. The refusals below are applied *inside* that file, so builds never meet the refused words.

## Mined now

- **The one rule — brass is the hand.** Brass is for choosing, counting and the caddie's voice, and nothing else. It became the review gate for every new surface: one brass action per page; when in doubt, take the brass away.
- **The ink ramp.** One ink, thinned: 100%, 62%, 40% and 26%, with rules at 16% and 12%. The app gains the 40% step; the hairline retunes from 18% to 16%; the highlight from 28% to 30%.
- **Brass deep**, `#A87E2F`, for the pressed state of the primary button.
- **Patina, settled.** The deferred dark set resolves to the specimen: paper `#1B1612`, ink `#EFE7D4`, brass `#C7A14E`, highlight at 40%.
- **Named type roles** — eyebrow (Petrona small caps), title, body, record (mono, tabular figures), **caddie** (Petrona italic in brass, a role the app lacked) and quiet. The caddie speaks in the same Petrona, no separate hand.
- **The marks** — the pressmark (the printer's device: app icon, plate mark, and twin of the back button); the figure (a roman die for stamping, an italic hand in the app); the five-bar tally gates (already built, confirmed against the specimen); and the **polarity badge**, a small turned square, solid or open, for menu rows.
- **The motion table** — page turn 220ms in and 150ms out (matching the app's existing transition exactly, so ratified rather than changed); tally bump 240ms ease-out; highlight draw around 300ms; sheet rise 360ms; live-mark sonar 2.4s. Reduced motion drops the travel and keeps the page; the resting state is always the finished one.
- **The components the next milestone needs.** The Cover's questions build to the specimen: the verdict as a highlight sweep over *Keep it*; feel as **five written rungs, not stars**; the score as a number with a cycled unit. The Sealed page builds to the bookplate.
- **Layout grammar** — a generous page margin, a held reading measure of about 30em, one hairline where a list divides; groups separated by air and a small-caps label, never boxes or cards.

## Superseded

- **The Sealed page is the Low Sun close, not the bookplate** (my ruling, 4 July). The prototype imported that day closes the round on a warm full-bleed scene — a low sun over the last green, the pennant in a slow breeze, the composed sentence, "the thought carries" with its tally, and one quiet door, "done for today" — and names it the settled composition. I ruled it the plan. The bookplate component isn't withdrawn; it just no longer closes the round.
- **The highlight is drawn by hand again.** The specimen's sweep is a marker stroke pulled tip to tail, never the same line twice — a slight tilt, rise and pressure each time. That overturned a retirement a week earlier which had made the highlight "a plain typographic device". The retirement was aimed at the Caveat handwriting face and the conceit of a hand writing on the printing; the sweep is the hand doing its one sanctioned job, choosing. Caveat stays retired.

## Refused, with reasons

- **The word "pins".** The specimen captioned kept moments as "37 PINS" and drew pins on course rows. The glossary forbids it: a moment is never "a pin" — the pin is the flag (*Pins Are a Psyop*). The brass diamond mark is taken; the words come from the glossary.
- **"Do / avoid" as the polarity labels.** The badge is taken; its words are the canon's **doing / quieting**.
- **The account door.** The specimen's sheet opens "a quiet door to the account". There is no account in the product.
- **"The live tally on the wrist."** A specimen slip — the Watch stayed deferred ([“Companion device: Flic first, Apple Watch deferred”](./companion-device-flic-first)).
- **The wash palette** — turf, green, sand, water — is recorded but dormant. It enters with the hole drawings and never touches UI chrome, as the specimen itself insists.

## Consequences

- The app's palette, typography and components gain and retune per the mined list — small mechanical diffs riding with each slice of work, not a big-bang restyle.
- The Cover and Sealed pages have their component language decided before they're built, so the remaining design risk in that milestone shrinks to the rule for choosing the sentence's clause.
- The patina theme is no longer "deferred, set to be decided": the settings work builds to known tokens.
- On any re-sync from Claude Design, the refusals still apply — a fresh mirror doesn't re-import "pins", do/avoid, the account door or the wrist, and the design file is re-derived with the refusals re-applied.

## Amendment — 21 August 2026: the brand sheet, and what the specimen no longer wins on

Four things the original text no longer covers.

**A fourth authority, named.** A brand sheet, imported on 11 July from the same Claude Design project, rules on the **identity** — the pressmark, the app icon and its treatments, the wordmark lockups, the clear space — as the specimen rules on the paper register. It sits beside the other authorities, not over them: the glossary still beats it on naming, the voice guide on words, the registers doc on the paper/object split. It settles one thing this record left implicit. "The marks" gives the pressmark the app icon; the sheet says *how* — the **dark plate**, lit brass on a near-black radial ground, carried in light mode too, because the dark ground makes the thin gold lines glow instead of fade. Brass on white is the light alternate. Its re-sync rule is this record's: the Design project is the source of truth, the folder a mirror.

**What the specimen no longer wins on.** The consequences carry the five *refusals* forward across a re-sync. That's too narrow: my rulings have since overturned specimen positions, and a fresh mirror overwritten in place would quietly restore them. The list, dated, to be re-applied alongside the refusals:

- The Sealed page is the Low Sun close, not the bookplate (4 July).
- The highlight is drawn by hand, not "a plain typographic device" (3 July).
- The Colophon, the settings page, turns in sideways as an ordinary leaf; it doesn't rise (6 July).
- The one rising surface is the moment note sheet, and the motion table's **sheet rise** belongs to it (6 July).

**The wrist refusal, re-grounded.** "The live tally on the wrist" is still refused, but no longer because the Watch is deferred — [“The wrist: a watch app as a second counter”](./the-wrist-second-counter) lifted that, and the wrist is built. The refusal now stands on that decision's own law: no count on the screen, on the phone or the watch. A small seal-point acknowledges every press, and verification lives in a hidden ledger. Better grounds than the ones they replace — the wrist exists and still refuses the tally.

**The marker stroke, downgraded to intent.** The Superseded section promises a sweep that's "never the same line twice". As built, the highlight takes no parameters and draws one fixed stroke everywhere it's used. I ruled on 21 August that the built state is the canon: the stand-in stroke is what ships, and the per-pick variation is **recorded intent**, revisited after TestFlight. What the Superseded section decided is untouched — the highlight is the hand's, and Caveat stays retired. Only the promise of variation is demoted from assertion to plan.

## Considered and rejected

- **Import rather than mine** — a web view, or generated tokens. Rejected: it re-platforms the design system by stealth and breaks the app's held architecture. The app's surfaces are SwiftUI, and the specimen is a document, not a runtime.
- **Treat the specimen as advisory.** Rejected: three patina palettes had already drifted apart, and without a named authority the drift compounds with every new surface.
- **Adopt it wholesale, naming included.** Rejected: the glossary is the single source of truth for naming, and "pins" would poison the moment vocabulary at exactly the point the Record starts speaking.
