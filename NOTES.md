# Swing pass: golfer, swing, ball flight

First pass on the golfer sprite, the swing motion and the ball flight. Cut scenes, course edges and the walk sprite (used by the cut scenes) are untouched. `sim.ts` and `read.ts` are unchanged.

## What to look at first

1. The pose sheet, every frame big: `sheet-final.png` (before: `sheet-before.png`).
2. A wedge, swing and flight at zoom: `swing-wedge.png`, and the flight before and after: `before-wedge.png` against `after3-wedge.png`.
3. A flail around the auto-release: `flail-iron.png`.

Screenshots are in `/private/tmp/claude-501/-Users-steveu-code-urm-st/e6af49c7-8165-4d33-8d8a-49faa7bd1734/scratchpad/night/swing-opus/`.

## What changed

### The golfer (pixel.ts)
- Still about 18px and the same palette (cap, red jumper, white collar, cream trousers), but now drawn as a body rather than a fixed figure with one arm on a stick. The view is down the line, from behind the ball, which is what the board's facing logic already implied.
- A `Pose` is now hands and clubhead plus `bend` (over the ball, or below 0 falling back), `turn` (chest to us at the top, side on at address, back to us at the finish), `wt` (weight back or through; through brings the back heel up) and `up` (eyes on the ball, or up after it).
- From those the drawing works out flexed knees and the seat going back at address, the back knee kicking in on the toe at the finish, a lead arm that stays straight and a trail arm that folds at the elbow, the collar V at the top, the back of the head at the finish, and what is drawn in front of what (the club goes behind the head at the top, the arms go behind the body once it has turned through).
- Between poses the club now swings round the hands the short way, so it no longer slides through the body.
- The walking golfer is drawn exactly as before. walk.ts and ending.ts use it.
- The bag stands 2px further from the golfer so the backswing doesn't run into it.

### The swing (play.ts)
- Backswing, driven by the hold as before, now runs through address, takeaway, halfway and the top. The takeaway is eased in, so it starts low and slow, and the top lands as the meter gets there. The overswing past the top drops the club down the back.
- On release: the downswing (hands drop, club lags behind them), then impact. **The ball now leaves at impact, 110ms after the release, not on the release itself.** The contact sound, the pure hit-stop, the gold burst and the divot and turf all fire at impact. The whoosh and the meter flash stay on the release.
- Finishes by strike: pure or good holds a full finish (back to us, up on the toe). Early or late gets a three-quarter finish. Fat leaves the club in the ground, then slumps. Flail falls back off it, with the weight on the back foot, the front foot up and the club wrapped round low.
- Putts get a stroke from the shoulders (`puttPose`), longer for a longer putt. It holds through while the ball rolls, then goes back to address.
- With reduced motion, the backswing steps through address, halfway and the top with no tweening, the release goes straight to the finish, and the ball goes as it did before (no downswing beat).

### The ball flight (pixel.ts, play.ts)
- The cause, as far as I can tell: the sim's apexes are tall for their carries (wedge 32 units on a 52 carry, driver 22 on 125). Drawn upright on a fairway that runs away up the screen at half scale, that made a wedge climb like a rocket.
- The fix is in the render only: `PEAK` in pixel.ts gives each club the height its flight is drawn to (driver 17, wood 16, iron 15.5, wedge 14 units, which is about where real ones peak). `liftFor(club)` scales the sim's z by that. The sim's own heights still decide tree strikes and wind drift.
- The scale is applied once in play.ts, so the ball in the air, its trace, the bounces, the ghost on the walk and the record's trails all use the same drawn heights.
- The ball's shadow is now drawn under everything that stands, and the low sun throws it to the left, the same way as the trees' long shadows (`RAKE = 1.1`). It slides away as the ball climbs and comes back in to meet it on landing. It also fades a little with height. It isn't drawn off the island.

## Open questions
- **The shadow's direction.** I went with raking it to match the trees, so the world's lighting is consistent. The usual iso convention is straight under the ball, which shows the ground line better. Setting `RAKE = 0` gives you that; it's a one-constant change.
- **Delaying the ball to impact** changes the feel of the release by about a tenth of a second. It reads better to me, but it's yours to judge. `DOWN` in play.ts sets it.
- The three-quarter finish (`short`) is the frame I'm least sure of: it can read as arms raised.
- The `PEAK` heights are a guess at what looks right, not something I tuned. The wood and the driver now fly only a little higher than the wedge, and the length of the flight is what tells the clubs apart.
- The sim is unchanged. If you would rather fix the heights at the source, the same numbers would go into `CLUBS.apex`. That would change tree strikes and wind drift, so it's a balancing change.

## Checks
- `npm run build`: passes, 0 errors.
- `read.ts`: unchanged against 3fae718. `sim.ts`: unchanged.
- Bot rounds: `a1440` (1440, seed 7) and `a390` (390, seed 11). Both play all three holes, reach the record and seal, with no sideways scroll and no page errors. Both logs show nine 403s. These are font files served through `@fs` from the symlinked node_modules, outside Vite's allow list in this worktree, so they're environmental and not caused by this pass. Logs: `a1440.log`, `a390.log`; screenshots `a1440-*.png`, `a390-*.png`.
- Reduced motion swing: `reduce-wedge.png`.
- The capture scripts are in the same folder: `sheet.mjs` (the pose sheet) and `shot.mjs` (one tee shot on the 11th: `node shot.mjs <width> <dist> <tag> [hold] [reduce]`, with env `AT`, `KEEP`, `ZX`, `ZY`, `ZK`, `FX`).
