# Decision drawings

Each project's chapter on /work shows three of its decisions, each with a small drawing:
Eddy's in `src/components/eddy/figures/`, One Thought's in `src/components/onethought/figures/`.
These are the rules all six follow. Eddy and One Thought look different, but each three is a
set, and the two sets share the rules underneath.

## What a drawing is for

A drawing makes one decision legible in a few seconds: what was decided, and the tension it
resolved. It's an argument, not decoration. If a label or a shape doesn't help that argument,
it goes.

## Words

- Labels are fragments: lowercase except names, six words at most, no full stops.
- Every claim is supported by the decision itself (`src/content/decisions/<project>/`). Use the
  decision's real numbers where it has them, and never invent precision: "about half" doesn't
  become a 50 / 46 / 4 bar.
- The decision's `summary` is written for the site and can change: one or two sentences, at most
  30 words, saying what was decided and why. The title and body mirror the project's own ADR, so
  they change there first.
- `ALT` in each drawing says what the drawing says, in one or two sentences.
- British English. No names of people, courses, hardware or hosts.

## Look

Shared:

- Fits 340px wide and 150 to 200px tall, and works in the 358px column of a 390px phone.
- No well or frame round the drawing; it sits on the band, left-aligned with the words below.
- One focal element. One use of the accent (gold or brass) for the line the decision draws, and
  at most one other meaningful colour, only when the meaning needs it.
- Labels 11 to 13px. A large numeral only where the number is the point.
- No icon sets, no emoji. At most one soft shadow, under the one real object.

Eddy, on the dark teal band (`--ink`, `--soft`, `--faint`, `--ring`, `--risk`, `--eddy-gold`,
`--hair`): Mulish labels at 12px in `--faint` or `--soft`, mono at 11px for tags and counts.
Colour is content (thumbnails, slots); structure is hairline. Filled shapes with small radii (4
to 6px), containers at about 20px.

One Thought, on the cream band (`--ink`, `--soft`, `--faint`, `--brass`, `--gold`, `--hair`):
ink line drawing, 1.6px main and 1px thin at 0.4. Petrona: names 13px at 600, notes 11.5px
italic. One touch of brass per drawing. Solid things get a faint ink fill, 0.06 at most.

## Motion

Each drawing plays in once, when 60% of it is on screen: `figures/play.ts` lifts `[data-wait]`.
The start state lives under `.fig[data-wait]`, where every transition is turned off, so holding
back is instant and only the way in moves. Keep that rule.

- Animate only `transform`, `opacity` and `stroke-dashoffset`, plus one colour change where
  something lights up. Never layout properties, blur or shadows.
- First movement within 120ms. At rest by 1600ms at most; aim for 1100 to 1400.
- Durations from the tokens in `global.css`: `--fig-fast` (420ms) for small things and fades,
  `--fig-base` (640ms) for moves, `--fig-slow` (900ms) for a line drawn or a fill across.
- Stagger by `--fig-step` (70ms); 40ms or less when there are more than a dozen items, and no
  more than 500ms between the first and the last.
- Easing has physics behind it. Movement uses `--fig-settle`, a critically damped spring that
  never passes its mark. `--fig-spring`, which passes by about 4% and comes back, is for the one
  thing per drawing that lands. Fades use `--ease-out`, never a spring, and run shorter than the
  move they go with, about 60% of its length, so a thing is visible before it arrives.
- Small distances: translate 4 to 12px, scale up from 0.94 to 0.98 (never from 0), rotate 3°
  at most. Direction means something: in from outside, along the diagram's flow, or settling
  down under its own weight.
- Mass: bigger things move less and more slowly than small ones. Lines draw at a speed
  proportional to their length.
- Order tells the story: context first, then the tension, then the decision's answer. A label
  arrives with or just after the thing it names, never before.
- Nothing loops and nothing moves once at rest. With reduced motion the final state shows and
  nothing moves (the motion rules sit inside `prefers-reduced-motion: no-preference`).
- CSS transitions only, with per-element delays from custom properties such as `--i`.
