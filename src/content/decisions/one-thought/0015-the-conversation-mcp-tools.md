---
project: one-thought
number: 15
title: "The conversation: tools for the player’s own AI"
date: 2026-09-18
summary: Rather than putting a chatbot in the app, One Thought will offer tools so a golfer’s own AI can talk a round through with them — starting with the research served openly, and syncing rounds only once there’s evidence it helps.
amended: [2026-09-18]
---

Two findings from my own rounds.

**Moments go un-noted.** Moments get saved mid-round, mostly where something went badly. The read happens at the seal, often with no time to go through them. Notes can already be added to a sealed round, so a later review exists mechanically — but nothing pulls the player back to it.

**Talking clarifies; the form doesn't.** My thinking about a round gets sharpened by talking it through with an AI, not by what I write at the read. The conversation that prompted this record shaped a candidate thought, and it used no round data at all. What it did use was the thought dossiers — which is how it could say "this may just be The Heckler" and "a swing-side thought gives no protection on the walk". The ideal: the AI uses round data to ask questions, and the questions uncover memory and feel.

The glossary had already reserved an "AI tier" as a discovery-spotter and thought-drafter. This record widens it: the AI is someone to talk the round through with, and a discovery is one thing that talk can produce.

The decision: the app offers **MCP tools** so the player's own AI — whichever one they already use — can hold that conversation. No AI runs inside the app, and I pay for no inference.

1. **The research, open.** A public connector with no sign-in, serving the thought dossiers, the plain rules behind them (a count must mean something on its own; taps are recorded on the walk; thoughts are meant to be outgrown), and **the research** itself: the checked findings, checked quotes and *dropped* claims, already held as structured data. Lookup only. A question the research can't answer is logged, and that log becomes the research list.
2. **Rounds, by opt-in.** A player who signs in syncs their sealed rounds. What leaves the phone is **derived data only**: the thought, each tap's hole and time, each moment's hole, time and note, feel, score, verdict and the composed sentence. **Fixes never leave the phone** — the location permission wording stays true, and the fix type stays impossible to export. Position within a hole might later be sent as a coarse derivation (a rounded distance, a broad position), never fine enough to reconstruct the fix. It's left out of the first build because most taps are recorded on the walk, not where the ball lay.
3. **One write: the moment note.** The AI offers a note in the player's words; the player confirms in the conversation; it lands in the book the next time the app opens. The conversation *is* the later review — no second review surface gets built. The count and the composed sentence of a sealed round are never touched.

The app works in full with no account. Both steps were to be built before the first release, beside the course service.

## Consequences

- The product now has an account, a server holding player data, and me as data controller under UK GDPR, with deletion and export to honour. The app's privacy manifest and the App Store privacy label must describe the sync; the location wording doesn't change.
- Sync is two-way for one field. The phone is no longer the sole author of a moment's note.
- This serves the few: adding a connector to your AI is a power-user act today. Accepted — the groundwork of accounts, sync and derived round data is what any later in-app conversation would need too.
- The server is the checkpoint for anything an AI writes: plain text, strict lengths, the player's own account only. Player-written content is never shown to another player; if thoughts ever become shareable, this decision must be revisited first.
- The research becomes something to keep current. The short attributed book quotes want a rights check before being served at volume.

## Amendment — 18 September 2026: step 2 waits for evidence

The decision's last line — both steps built before the first release — is withdrawn. An outside review of the plan the same day made the case, and I accepted it.

**What the evidence supports.** The motivating conversation used the dossiers and my memory, and no round data. That supports step 1, the research served openly. That connected rounds add something is a separate, untested claim; that saving notes automatically adds something is a third.

**Filling the book isn't the goal.** The rejection of the copy-as-text option below rests on "the book stays blank". But if a conversation changes how someone plays their next round, it has worked whether or not anything was saved. So that option is reopened as the *test* for step 2: a hand-made export of a real round, pasted into a conversation, before any sync is built.

**A mismatch in the one write.** The conversation can turn up something useful without any marked moment — the motivating one did — yet the only thing it may write is a moment's note. A player who marked nothing has nowhere to put the result. Step 2's write is narrower than its own use case, and that needs settling before it's built (a note on the round, perhaps — undecided).

**The order now.** Nothing in this decision blocks the release. TestFlight, a round on the wrist, and two golfers outside my circle come first. Step 1 may run in parallel. Step 2 waits for those golfers and for the export test. The earlier plan already records a test release overtaken by more building ([“First release at the maps-free loop”](./first-release-maps-free-loop)); this amendment is there to stop that repeating.

**Still owed when step 2 is taken up:** what happens when the phone and the conversation edit the same note, and whether the earlier wording can be recovered; how confirmation is established beyond an AI saying it happened; what is logged when the research can't answer; whether deleting an account is safe against a phone that reconnects later; and a privacy explanation that doesn't lean on "fixes never leave the phone" alone — course, hole numbers, times and notes still describe where someone was and what they felt, and the player's AI is a further recipient. The app also can't control the tone or discipline of someone else's AI, so I need to decide which promises are One Thought's to make.

## Considered and rejected

- **Copy the round as text** and paste it into any AI. No server, no account. Rejected: no write-back, so the clarity stays in the chat and the book stays blank. (Reopened by the amendment above as the test for step 2.)
- **Local only, for me first.** Rejected as the destination, not as a practice — I want this for every player, and I can still talk my own rounds through against the code and a copy of the database in the meantime.
- **A chat inside the app.** Rejected: the app is free and nothing funds the inference, and the player's own AI already knows them.
- **Send the fixes.** Rejected: the conversation needs the hole, not the coordinate, and the promise is worth more kept.
- **Let the player's AI research the web and store the results in the app.** Rejected: links from a poisoned page would sit in the app looking trusted, and citations from an AI's memory can't be checked.
- **Run the research on my own server.** Rejected: it moves the same exposure onto a server holding my keys, costs money per thought, and needs quotas and background jobs. Lookup against research that's already checked gives the control without the cost.

## Deferred

- **Thought proposals.** [“Defer discovery promotion past the map work”](./defer-discovery-promotion)'s deferral stands. When it lifts, this is the shape:
  - **The source is the conversation**, built with awareness of the player's rounds and the research. No moment is required; moments are a signal. This replaces the older idea of "a moment promoted".
  - **A proposal, accepted in the app.** The AI's second write proposes a thought — name, family, polarity, coaching line, tap rule, count phrases. It arrives shown as it would be carried, and the player accepts it or lets it go, away from an agreeable chat. Accepted thoughts sit on the player's own shelf, apart from the curated six.
  - **Research travels as references only.** A proposal's research is a list of references into the checked research — never a web address, never free text from outside. Every citation is real by construction, and no foreign link can enter the app. Where the research has nothing, the verdict says so.
  - **The verdict advises; the player decides** — the same right I used to overrule the research on *Ancient History*. The app never calls a player's thought research-backed in its own voice.
  - Owed when it's built: count phrases stored as data rather than code keyed by thought name.
