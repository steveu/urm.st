# Night pass: the cut scenes between holes

First pass on the walks between holes as a courtroom-game cut scene: the cast, the box, the
pacing, the shout. Four small commits on top of `3fae718`; `read.ts` and `sim.ts` untouched.

## What changed

**`cast.ts` (rewritten).** The portraits are now 128 by 144, from the waist up, with arms,
and the box at the foot of the frame covers their waist. The material system is the same
(four tones lit from the right, a rim, a line on the shaded edges, textures), with a new
`capsule` for arms and fingers that casts a short shadow on what it lies over, so an arm
reads against a jumper of the same wool. Every expression is a pose as much as a face:

- you: hands in pockets · thumb in the bag strap · hands up, head back · knuckle to the
  chin, finger tapping · the shout (arm thrust out, eyes screwed shut, mouth wide)
- caddie: arms folded · a thumb up, no more · a shrug · stroking the beard
- partner: hands on hips · a belly laugh, shoulders going · both hands to the hat · a
  scratch under the brim

Each pose has a second frame (`f1` nudges) that the stage swaps in: a jitter while caught
out, a tap while thinking, a bob while pleased, the arm out as the shout lands. Blink and
the talking mouth are as before. A `shout` face exists only on the stage side; the scene
data still uses the four faces.

**`play.ts`.** `drawStage` places the figure with its waist at the box's top edge, at the
board's own pixel (no more 2× head on wide screens). The veil behind the speaker is a
lighter wash so the walk shows. When the rope speaks, `drawGallery` draws three figures in
silhouette at the left edge, backlit, the rope in front of them, one with a hand cupped to
their mouth that rises as the line lands. Faces and the gallery are still never seen as
faces: the rope has no portrait.

**`stage.ts`.** Typing now pauses on punctuation (a beat on a comma, longer on a full stop,
longer still on an ellipsis); the rope types quicker, a thought slower. Lines in brackets
(thought) are shown without the brackets in their own colour, the way the courtroom marks a
thought; the status line keeps the brackets.

**`OneThoughtRound.astro`.** The dialogue box is a dusk-dark panel with a cream line and
stepped corners (`--pp-stage` nine-slice), cream serif text, the name plate in the
speaker's own colour (jumper red, beanie green, pink, rope brown) over the top edge, a
cream next-arrow. Thought lines sage green, the rope's amber italic.

**`lettering.ts`.** The shout burst sits a little right of centre on wide frames so the
shouter shows beside it.

**`scenes.ts`.** A light tightening pass: filler cut ("to be honest", "to be fair"), the
rope punchier, the caddie shorter. Structure, key lines, branches and moments unchanged.

## Look at this first

Screenshots in `/private/tmp/claude-501/-Users-steveu-code-urm-st/e6af49c7-8165-4d33-8d8a-49faa7bd1734/scratchpad/night/scenes-fable/`:

- `sheet2.png`: the whole cast, every pose, both frames (the quality bar)
- `w2-h1-*.png`: one scene at 1440 line by line; `*-key-shout.png` is the catch
- `m2-h1-*.png`: the same at 390
- `rope2-1440.png`, `rope2-390.png`: the gallery at the rope
- `final/a1440-*`, `final/a390-*`, `final/r390-*`: the bot rounds (the third is
  reduced motion)

Before: `../../seq/m1440-cut1.png`, `../../seq/m390-cut2.png` (the old 2× heads).

The cast sheet page (`lab/cast.astro` in the same scratchpad dir) is not committed; drop
it into `src/pages/lab/` to look at the sheet again at `/lab/cast`.

## Open questions

- The partner's hands-on-hat pose is gangly (long upper arms to the frame's edge). A
  tighter version with the elbows in would be better.
- The rope's gallery is procedural rects; a hand-placed pixel patch would be finer.
- The cut-in portraits during play (`portrait.ts`, 48 px) are still the old style; out of
  scope here but now the odd one out.
- The dialogue pass was deliberately light. The lines were already good; happy to go
  further if you want more bite.
- Dev-server note: this worktree's `node_modules` is a symlink into the main repo, which
  Vite's fs guard refuses for font files (403s in the console, fallback fonts in
  screenshots). I ran the server with an override config (`astro.config.dev.mjs` in the
  scratchpad dir, `--config astro.config.dev.mjs --ignore-lock`). The build is unaffected.
