---
project: eddy
number: 21
title: A pick is explained or not shown; the creator’s title leads
date: 2026-05-16
written: 2026-10-09
summary: Nothing reaches the feed without a one-line reason in Eddy’s voice, and the card itself leads with the creator’s own title, never a rewritten hook.
retroactive: true
---

**Status:** built. The filter catches a missing reason and one that only repeats the title; it doesn't yet catch a generic one.

Eddy puts a short slate in front of each person every day ([“Subscriptions and discovery compose one daily slate”](./subscriptions-and-discovery-compose-one-slotted-slate)). A recommendation with no visible reason is the thing Eddy exists to avoid: it asks to be trusted without saying why. So every surfaced item needs a one-sentence reason in Eddy's voice, written when discovery scores it.

The early design went further and gave every card a generated hook: a rewritten headline under, or instead of, the creator's title. It was dropped. Written from a title and description alone, a hook guesses: it states specifics the model doesn't know, which is clickbait's mechanism in Eddy's voice. An honest hook would need the transcript, so it could only be written after download, as an extra inference pass per card. And the creator's title is the honest anchor: it's what they called the video, what search matches, and how a kid finds it again.

The rule: **an item with no usable reason doesn't surface. The reason sits outside the card, in Eddy's voice; the card leads with the creator's own title, unedited.**

**The filter.** Scoring asks the local model for one warm, specific sentence per candidate, tied to the person's taste. Nothing is stored when the sentence is empty or just repeats the title, and surfacing requires a stored reason for every source: a followed creator's upload, a back-catalogue pick and an interest search are held to the same bar. No reason, no surfacing.

**The layout.** In the day's feed the reason sits above its card as a separate line, and the card's headline is the creator's title. The video's detail sheet shows the same sentence under "Why this video". Items that weren't discovered — a kid's own request, a video a parent sent — get a plain line in the detail sheet instead: who asked, or who sent it.

## Consequences

- **A failed reason costs a pick.** If scoring can't explain an item, the slate is shorter that day. A short slate is valid.
- **The title is the creator's.** Eddy never rewrites it. Clickbait in a title is handled by scoring, which marks bait down on quality, not by covering it up.
- **The reason is the only generated copy beside a card.** That keeps model-written text in one clearly separate place, in one voice, where a reader can tell it apart from the creator's words.
- **The reason is about the video and the person.** The prompt asks for the video's concrete value tied to the person's taste, and to mention a followed creator only when their style matters, so a follow isn't presented as a reason in itself.

## Considered and rejected

- **A generated hook leading each card.** Rejected, as above: it guesses from too little, an honest one costs an inference pass after download, and it demotes the creator's title.
- **Tap to reveal the reason.** Built first, then reversed to inline text once the detail sheet existed to hold it without crowding the feed.
- **A generic fallback reason** ("you might like this") when scoring produced none. Rejected: a generic reason is no reason, and treating it as one would hide the failure.

## Deferred

- **Catch generic reasons.** Today the filter rejects only an empty reason or one identical to the title. A vague sentence that names nothing concrete still surfaces; detecting it isn't built.
