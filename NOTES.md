# Night pass: the cut scenes between holes

The walks between holes as a courtroom-game cut scene: the cast, the box, the pacing, the
shout. Two passes on top of `3fae718` (a build, a critique, a second pass acting on it);
`read.ts` and `sim.ts` untouched.

Screenshots are in
`/private/tmp/claude-501/-Users-steveu-code-urm-st/e6af49c7-8165-4d33-8d8a-49faa7bd1734/scratchpad/night/scenes-fable/`
(all paths below are relative to it).

## Look at first

1. `sheet4.png`: the whole cast, every pose, both frames. This is the quality bar.
2. `w3-h1-10-you-key-shout.png` then `w3-h1-10-you-key-shout2.png` (1440): the catch. The
   burst sits beside the head, the shout face holds through it, the arm stays out.
   `m3-h1-10-you-key-shout.png` is the same at 390, burst over the chest.
3. `w3-h1-03-caddie.png`, `m3-h1-03-caddie.png`: the beard, after.
4. `w3-h1-02-partner.png`, `w3-h1-04-partner-moment-kept.png`: the laugh and the
   hands-to-hat, with the Kept stamp on the corner.
5. `w3-h1-01-rope.png`, `m3-h1-01-rope.png`: the gallery at the rope.
6. `final3/a1440.log`, `final3/a390.log`, `final3/r1440.log`: the bot rounds (the third
   is reduced motion), screenshots alongside.

Before: `../../seq/m1440-cut1.png`, `../../seq/m390-cut2.png` (the old 2× heads). After
the first pass, before the critique: `sheet2.png`, `w2-h1-*.png`, `m2-h1-*.png`.

## First pass

**`cast.ts` (rewritten).** The portraits are 128 by 144, from the waist up, with arms, and
the box at the foot of the frame covers their waist. The material system is the same (four
tones lit from the right, a rim, a line, textures), with a `capsule` for arms and fingers
that casts a short shadow on what it lies over. Every expression is a pose as much as a
face:

- you: hands in pockets · thumb in the bag strap · hands up, head back · knuckle to the
  chin, finger tapping · the shout (arm thrust out, eyes screwed shut, mouth wide)
- caddie: arms folded · a thumb up, no more · a shrug · stroking the beard
- partner: hands on hips · a laugh · both hands to the hat · a scratch under the brim

Each pose has a second frame (`f1` nudges) the stage swaps in: a jitter while caught out, a
tap while thinking, a bob while pleased, the arm out as the shout lands. Blink and the
talking mouth as before. A `shout` face exists only on the stage side; the scene data still
uses the four faces.

**`play.ts`.** `drawStage` places the figure with its waist at the box's top edge, at the
board's own pixel. When the rope speaks, `drawGallery` draws three figures in silhouette at
the left edge, the rope in front of them. The rope has no portrait.

**`stage.ts`.** Typing pauses on punctuation (a beat on a comma, longer on a full stop,
longer still on an ellipsis); the rope types quicker, a thought slower. Bracketed lines
(thought) are shown without the brackets in their own colour.

**`OneThoughtRound.astro`.** The dialogue box is a dusk-dark panel with a cream line and
stepped corners (`--pp-stage` nine-slice), cream serif text, the name plate in the
speaker's own colour over the top edge, a cream next-arrow. Thought lines sage green, the
rope's amber italic.

**`scenes.ts`.** A light tightening pass: filler cut, the rope punchier, the caddie shorter.

## Second pass (after the critique, `CRITIQUE.md`)

Acted on all eight points. By commit:

**`7ca5ff3` cast.ts.** The caddie's beard follows the jaw, leaves skin between it and the
ear and round the mouth, runs longer than the skull and breaks into tufts, with a moustache
of its own. The caddie and the partner get a lower lip under the talking mouth and the
moustache lifts as it opens. The partner's fists come up to the waist above the box line,
the laugh is a hand on the chest with the other held out palm up, and the hands-to-hat pose
tucks the elbows. The resting brow lifts a pixel. The dark line goes all round where a
shape meets the air (the rim one pixel inside it), so a figure holds against the sky.
`galleryFigures()` and `headBox()` are new exports: three hand-placed silhouettes for the
rope, cached like `portraitFrame`, and the head rect for the shout to sit beside.

**`fb824b1` play.ts, lettering.ts, stage.ts, walk.ts.** `drawStage` returns a
`ShoutAnchor` and `drawShout` takes it: beside the head where there's room, over the chest
at 390. The shout face holds through the burst and 700 ms after, then lands through a
frame of the caught-out pose (`stage.shoutAge`). Veil 0.42 → 0.56 with a dithered band
behind the head. The walking golfer stays out of the frame while a portrait is up
(`WalkFrame.golfer`); the rope's lines keep them. The gallery is drawn from `cast.ts` with
a rail at waist height on three posts across the left third. Ellipsis pause 320 → 450 ms.

**`988b312` OneThoughtRound.astro.** Panel fill 0.88 → 0.95. Plate 17 px (14 px on a
phone) with a 1 px drop, straddling the line. The Kept stamp straddles the box's top right
corner. The rope's words come in from the left, where the gallery is.

**`209116a` scenes.ts.** The key lines cut to the punch (`My face is going.`, `My own
partner. Right.`, `Champ. All night, that.`). `Fair question, that` → `They've a point`.
The three-shout rope line calmed. `Straight into {trouble}` for every trouble word. The
caddie's missed line back to `I can see it`. The partner's `Show-off` is pleased, not
shocked.

### Where I disagree with the critique

- **Gallery faint behind the other speakers on The Heckler's walks (5, last bullet).** Not
  done. The figure stands left of centre at 1440 and the gallery lives in the left third,
  so they'd overlap; at 390 there is no room at all. And cutting to the gallery is the
  courtroom idiom: the gallery is a cut, not a set. Easy to revisit if the morning
  disagrees.
- **Burst over the chest at 390.** The burst's lower spikes run behind the name plate (the
  plate is HTML over the canvas, so it wins). Lifting the burst clear would put it over
  the mouth. Left as is; the plate-over-burst layering reads as deliberate.

## Open questions

- The cut-in portraits during play (`portrait.ts`, 48 px) are still the old style; out of
  scope here but now the odd one out.
- The "you" resting face is still a touch stern even with the lifted brow. A pixel more
  of inner arch would soften it; held back so the shout and the thinking knit keep their
  contrast.
- The dialogue pass was deliberately light. Happy to go further if you want more bite.
- Dev-server note: this worktree's `node_modules` is a symlink into the main repo, which
  Vite's fs guard refuses for font files (403s in the console, fallback fonts in
  screenshots). Run the server with the override config in the scratchpad dir
  (`astro.config.dev.mjs`, `--config astro.config.dev.mjs --ignore-lock`). The build is
  unaffected. The cast sheet page (`lab/cast.astro` in the scratchpad dir) is not
  committed; drop it into `src/pages/lab/` to see the sheet at `/lab/cast`.
