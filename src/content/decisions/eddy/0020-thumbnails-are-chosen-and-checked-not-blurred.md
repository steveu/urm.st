---
project: eddy
number: 20
title: Thumbnails are chosen and checked, never blurred or hot-linked
date: 2026-09-25
written: 2026-10-09
summary: Every image a kid could see on a card is picked from real frames and checked against the safety rubric before it’s shown, and if nothing passes, the card gets a plain placeholder.
retroactive: true
---

**Status:** built for the feed's video cards. Not covered: the media server's poster image, and the parent's Decisions cards, which show the creator's thumbnail by choice.

A creator's thumbnail is the most clickbait surface on the platform: shocked faces, arrows, garish text. It's also imagery no guard has seen. The guard reads a video's words ([“The model describes; code decides; only an explicit clear yes reaches a kid”](./the-model-describes-code-decides)); a kid's screen shows a picture. So there are two problems: the thumbnail may be ugly, and it may be unsafe.

The first idea was to neutralise every thumbnail with a filter: blur, desaturate, dim. It solves neither problem well. A blurred image reads as broken, and the editorial look the rest of Eddy aims for depends on good imagery, not muted imagery.

The rule: **every image a kid could see on a video card is chosen from real frames and checked against the rubric before it's shown. The bytes checked are the bytes served. If nothing passes, the card gets a neutral placeholder, never the creator's image.**

**The picker** runs on the fetch box after each download, in its own queue, asking the inference box for each judgement over signed internal calls ([“One codebase, two boxes: one moves bytes, one thinks”](./one-box-moves-bytes-one-thinks)). It tries, in order:

1. **The creator's thumbnail**, if the local model judges its composition editorial rather than bait.
2. **The platform's auto-chosen frames**, the first judged editorial.
3. **Frames sampled from the downloaded video**, scored for composition; the best-composed one wins.
4. **A neutral placeholder**: a plain dark image built into the page, so it needs no file and can't go missing.

**The safety floor.** Every image the picker would show is first scored by the local vision model on three rubric dimensions — violence, frightening, sexual — from 0 to 3. Any score above 1 rejects it and the picker moves on. A model error or an unreadable reply is a reject, never a pass, and the worker checks the scores itself rather than trusting a pass flag. Checks per video are capped; once they run out, the placeholder wins. The placeholder is also what shows between download and the picker finishing.

**Never hot-linked.** Every winner, the platform's own images included, is downloaded, checked, converted and served from home. Serving the platform's image link would let a creator swap the picture after it passed. The web app has no fallback to the creator's image: a card without a checked thumbnail shows the placeholder, for everyone.

**Kid search shows no thumbnails.** Search results are raw platform results that nobody has checked. For a kid, search goes through the platform's strict safe-search only; where that isn't available, a kid gets an empty list with a reason, not unfiltered results. Titles still show, and the kid can still ask for a video the normal way.

## Consequences

- **Some cards are plain.** A video whose images all fail, or whose checks run out, shows a dark rectangle. That's the intended outcome: a video whose best images are all over the floor is one to show neutrally.
- **Thumbnails cost inference.** Each check is a vision-model call on the box that also runs the guard. The cap keeps a busy day bounded.
- **The floor uses the rubric's anchors.** The same severity scale as the guard, applied to one still, so "frightening 2" means the same on a thumbnail as in a video.
- **Logs carry counts and scores only**: which option won, how many checks ran and failed. No titles and no model reasons, which would describe the image ([“Kids’ viewing stays home”](./kids-consumption-stays-home)).
- **Thumbnails outlive recycled videos**, so a recycled card stays recognisable.

## Considered and rejected

- **Blur, desaturate or dim every thumbnail.** Rejected: it looks broken, and it softens an unsafe image rather than refusing it.
- **Hot-link the platform's image.** Rejected: the image can change after it was checked.
- **Show the creator's thumbnail while the picker runs.** Rejected: it shows a kid unchecked imagery for exactly the window when the card is new.
- **Fail open on a scoring error.** Rejected: kid safety defaults to refusal. An error costs a nicer picture, nothing more.

## Deferred

- **The media server's poster.** It's still set to the creator's thumbnail at download and isn't updated by the picker, so it's unchecked.
- **Parent screens.** The Decisions cards load the creator's thumbnail from the platform. They're parent-only and the parent is judging the video, so this is deliberate, not an oversight.
