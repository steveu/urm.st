// The home band's three holes, played. This is the client side only: input, the board,
// the ball in the air, the golfer, the meter and the little theatre around a round. Every
// shot comes from sim.ts and nothing here feeds back into it. The Flic never reaches this
// file except to ask where and when a press fell (stamp), and whether it caught a line of
// the inner voice (catchLine), which only changes what's said, never a shot.
//
// The board is fixed isometric pixel art (pixel.ts). It never follows the ball. In a round
// each hole is framed on its own, filling the board. The walk between them takes the whole
// frame (walk.ts): a longer run of the inner voice on the hole just played, answered with
// the Flic like any other. Choosing and the record show the whole table.

import * as S from './sim';
import type { Vec, Ball, Shot, Situation, Ctx, Sample } from './sim';
import { THOUGHTS } from './thoughts';
import type { Lie, Press } from './record';
import { createBoard, drawMini, holeView, POSES, BALL_DX, lerpPose, puttPose, liftFor, arcAt, crownOver, PLATE, ROPE, OVERVIEW_VIEW, view, type Pose, type Golfer, type GroundMode, type RecordFrame } from './pixel';
import { shownWord } from './numbers';
import { createCutins, XEXAM, ORDINARY, FOLLOW, KEPT, type Cut, type Sit } from './voice';
import { createWalk } from './walk';
import { walkScene, type Went, type MomentKind, type Trouble, type Beat } from './scenes';
import { portraitFrame, galleryFigures, headBox, W as FIG_W, H as FIG_H, type Face as CastFace } from './cast';
import { drawShout, SHOUT_HOLD, type ShoutAnchor } from './lettering';
import { createStage } from './stage';
import * as snd from './sound';

type Club = keyof typeof S.CLUBS;
type Mode = 'idle' | 'intro' | 'aim' | 'swing' | 'flight' | 'settle' | 'walk' | 'putts' | 'holed' | 'between' | 'done';
type HoleN = 1 | 2 | 3;

export type Finish = { end: number; holesPlayed: number; complete: boolean; bounds: number[] };
export type GameOpts = {
  reduce: boolean;
  seed: number;
  status: (text: string) => void;
  onShot: (hole: number, lie: Lie, putt: boolean) => void;
  onFinish: (f: Finish) => void;
  /** A run of the inner voice said its catch, and it went by uncaught */
  onMissed: (hole: number) => void;
  /** A run of the inner voice is under way: the pocket button glows, softly */
  onLive: (on: boolean) => void;
};

const PAR_WORD: Record<number, string> = { 3: 'three', 4: 'four', 5: 'five' };
// Over the ball: lining it up, swinging, watching it fly, or on the green
const OVER: ReadonlySet<Mode> = new Set(['aim', 'swing', 'flight', 'putts']);
// How the status line names a target line
const LINE_WORDS: Record<string, string> = { 'lay up': 'the lay-up', 'take it on': 'the carry', 'the corner': 'the corner', 'out right': 'out to the right' };
const SW = S.SWING;
const PIP_MS = 400;
const BREATH_MS = 800;
// The board's height in its own pixels, whatever the scale
const LH = 174;
// How many times a hole the voices may cut in, between them
const VOICE_BUDGET = 2;
// How many runs of the inner voice a hole may have
const RUNS_A_HOLE = 2;
// The walk between holes: the board going out, and the walk settling before the first line
const CUT_OUT = 380;
const WALK_LEAD = 600;
// What a tap on the key line means, by the thought carried: stamped over the ball, shouted
// on the walk
const STAMP: Record<string, string> = { 'The Heckler': 'got me', 'Commit to the Line': 'decided', 'Pins Are a Psyop': 'boring' };
const SHOUT: Record<string, string> = { 'The Heckler': 'Got me!', 'Commit to the Line': 'Decided!', 'Pins Are a Psyop': 'Boring!' };
// The commit, in so many words, for the line the aim is on
const COMMIT_SAYS: Record<string, string> = {
  'the corner': 'That one. Over the corner.',
  'out right': 'Out right. That’s it.',
  'lay up': 'Lay it up. Done.',
  'take it on': 'Taking it on. Done.',
  'fat of the green': 'Fat of the green. Done.',
  flag: 'At the flag. Decided.',
};

const HECKLES: { q: string; by: string }[] = [
  { q: '“Was that the practice one?”', by: 'from the rope' },
  { q: '“Shot.” … “Well. A shot.”', by: 'from the rope' },
  { q: '“Wants to be a putt, that.”', by: 'the four-ball behind' },
  { q: '“Mind the heron.”', by: 'from the rope' },
  { q: '“Plenty of golf left.”', by: 'the four-ball behind' },
];
const RELITIGATE = ['“Five yards left and that’s on.”', '“Should’ve been the other club.”', '“That kick was rough luck.”', '“You had that, too.”'];

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (t: number) => 1 - (1 - t) ** 2;
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const angOf = (a: Vec, b: Vec) => Math.atan2(b[1] - a[1], b[0] - a[0]);
const toward = (p: Vec, ang: number, d: number): Vec => [p[0] + Math.cos(ang) * d, p[1] + Math.sin(ang) * d];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const DEG = Math.PI / 180;

// A path of samples, walked by distance travelled
function along(samples: readonly Sample[]) {
  const cum = [0];
  for (let i = 1; i < samples.length; i++) cum.push(cum[i - 1] + S.dist(samples[i - 1].p, samples[i].p));
  const total = cum[cum.length - 1];
  return {
    total,
    at(u: number): { p: Vec; z: number } {
      if (samples.length === 1 || total === 0) return { p: samples[samples.length - 1].p, z: samples[samples.length - 1].z };
      const d = clamp(u, 0, 1) * total;
      let i = 1;
      while (i < cum.length - 1 && cum[i] < d) i++;
      const a = samples[i - 1];
      const b = samples[i];
      const t = cum[i] === cum[i - 1] ? 1 : (d - cum[i - 1]) / (cum[i] - cum[i - 1]);
      return { p: [lerp(a.p[0], b.p[0], t), lerp(a.p[1], b.p[1], t)], z: lerp(a.z, b.z, t) };
    },
  };
}

// The flight is sampled evenly in carry, so it's walked by index
function byIndex(samples: readonly Sample[], u: number): { p: Vec; z: number } {
  const n = samples.length - 1;
  if (n <= 0) return { p: samples[0].p, z: samples[0].z };
  const x = clamp(u, 0, 1) * n;
  const i = Math.min(Math.floor(x), n - 1);
  const t = x - i;
  const a = samples[i];
  const b = samples[i + 1];
  return { p: [lerp(a.p[0], b.p[0], t), lerp(a.p[1], b.p[1], t)], z: lerp(a.z, b.z, t) };
}

type Seg = { dur: number; at: (u: number, ms: number) => { p: Vec; z: number; o?: number }; start?: () => void };

export function createGame(root: HTMLElement, opts: GameOpts) {
  const { reduce } = opts;
  const q = <T extends Element = HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const game = q('[data-game]');
  const scene = q('[data-scene]');
  const cv = q<HTMLCanvasElement>('[data-canvas]');
  const holeEl = q('[data-hole]');
  const holeText = q('[data-hole-text]');
  const miniCv = q<HTMLCanvasElement>('[data-mini]');
  const caddieEl = q('[data-caddie]');
  const caddieQ = caddieEl.querySelector<HTMLElement>('.q')!;
  const bubbleEl = q('[data-bubble]');
  const bubbleQ = bubbleEl.querySelector<HTMLElement>('.q')!;
  const bubbleBy = bubbleEl.querySelector<HTMLElement>('.by')!;
  const wordEl = q('[data-word]');
  const hintEl = q('[data-hint]');
  const meterEl = q('[data-meter]');
  const fillEl = q('[data-fill]');
  const goodEl = q('[data-good]');
  const pureEl = q('[data-pure]');
  const markEl = q('[data-mark]');
  const clubEl = q<HTMLButtonElement>('[data-club]');
  const stepEl = q<HTMLButtonElement>('[data-step]');
  const chipsEl = q('[data-chips]');
  const pips = [...root.querySelectorAll<HTMLElement>('[data-pip]')];
  const pipsEl = q('[data-pips]');
  const srAim = q('[data-sraim]');
  const cutins = createCutins(q('[data-cutin]'), {
    reduce,
    status: (t) => opts.status(t),
    onLive: (on) => opts.onLive(on),
    onRunEnd: (id, offered, caught) => {
      const at = runHole.get(id) ?? hole;
      runHole.delete(id);
      // Caught: the head goes quiet for the rest of the hole
      if (caught) calmHole = at;
      else if (offered) opts.onMissed(at);
    },
  });
  // The walk's stage: the words in their box; the faces are drawn on the board
  const walkStage = createStage(
    { box: q('[data-dialogue]'), tab: q('[data-tab]'), line: q('[data-dline]'), stamp: q('[data-dstamp]') },
    {
      reduce,
      status: (t) => opts.status(t),
      onKey: (caught) => {
        // Caught: quiet on the next tee. Let go: it follows you there, and it's on the card
        if (caught) {
          calmHole = hole + 1;
          nextTee = 'caught';
        } else {
          walkBow = true;
          nextTee = 'follow';
          opts.onMissed(hole);
        }
      },
      onEnd: () => {
        if (cutEnd < 0) cutEnd = gt;
      },
    },
  );

  const board = createBoard(cv);

  // ---------------------------------------------------------------------------------
  // Time: game time stops for a hit-stop; real time never does

  let gt = 0;
  let lastReal = performance.now();
  let freezeUntil = 0;
  const nowG = () => gt + (performance.now() < freezeUntil ? 0 : Math.min(32, performance.now() - lastReal));

  // ---------------------------------------------------------------------------------
  // The board on screen: the largest whole scale that fits, never more than three

  let small = false;
  let focusN = 0;
  let scale = 3;
  let lw = 300;

  const stage = () => root.dataset.stage ?? 'choose';

  // Where the whole table's origin sits: to the left for the record on a wide screen,
  // otherwise in the middle (on a phone it runs off both edges)
  function placeFor(): Vec {
    const oy = 22;
    if (stage() === 'record' && !small && game.clientWidth >= 1100) return [-PLATE.l + 2, oy];
    return [Math.round(lw / 2 - (PLATE.l + PLATE.r) / 2), oy];
  }

  // The view for what's on screen: the hole in play on its own, or the whole table. Placed
  // straight away when the view changes (it dithers in); eased when only the place does
  function show(n: number, animate: boolean) {
    const changed = board.setView(n ? holeView(n, lw, LH) : OVERVIEW_VIEW, gt, animate && !reduce);
    board.setGround(groundMode(), n, gt, animate && !reduce);
    if (n) return;
    const [x, y] = placeFor();
    board.place(x, y, animate && !reduce && !changed ? 800 : 0, gt);
  }

  function groundMode(): GroundMode {
    const s = stage();
    return s === 'round' ? 'play' : s === 'record' ? 'all' : 'quiet';
  }

  /** Size the canvas to the scene, and put the plate where it belongs */
  function layout(animate: boolean) {
    const w = scene.clientWidth || 600;
    small = matchMedia('(max-width: 640px)').matches;
    scale = small ? 2 : w >= 900 ? 3 : 2;
    lw = Math.ceil(w / scale);
    // The panels draw their pixels at the board's scale
    root.style.setProperty('--px', `${scale}px`);
    board.resize(lw, LH, scale);
    cv.style.width = `${lw * scale}px`;
    cv.style.height = `${LH * scale}px`;
    scene.style.height = `${LH * scale}px`;
    // A round always opens on the 1st: frame it straight away, not the whole table first
    show(stage() === 'round' ? focusN || 1 : 0, animate);
    chipsKey = '';
    bubbleKey = '';
    placeBubble();
  }

  function focus(n: number) {
    focusN = n;
    show(n, true);
  }

  // A point on the screen to a point on the course, on the ground
  function pick(clientX: number, clientY: number): Vec | null {
    const r = cv.getBoundingClientRect();
    const [x, y] = board.fromCss(clientX - r.left, clientY - r.top);
    if (x < -10 || x > S.W + 10 || y < -10 || y > S.H + 10) return null;
    return [x, y];
  }

  // ---------------------------------------------------------------------------------
  // The round

  let round = opts.seed >>> 0;
  let staging = S.stagingRng(round);
  let mode: Mode = 'idle';
  let mT = 0;
  let thought = 0;
  let hole: HoleN = 1;
  let ball: Ball = S.startHole(1);
  let swings = 0;
  let strokes: number[] = [0, 0, 0];
  let ctx: Ctx = { hurried: false, breath: false, afterHeckle: false };
  let heckles = 0;
  let heckledEver = false;
  let pool: number[] = [];
  let tuckedSaid = false;
  let firstShot = true;
  let fullShots = 0;
  let lastInputKind: 'mouse' | 'touch' | 'key' = matchMedia('(pointer: coarse)').matches ? 'touch' : 'mouse';
  let trails: { p: Vec; z: number }[][] = [];
  // Each full shot's pattern as it was swung from, for the record
  let patterns: { c: Vec; along: number; across: number; ang: number }[] = [];
  let bounds: number[] = [];
  let record: RecordFrame | null = null;

  // The wind for the shot in hand, and the mind over it
  let wind: S.Wind = S.CALM;
  let aimSets = 0;
  let doubt = false;
  let cloud: { t0: number; doubt: boolean } | null = null;
  // The voices: a seeded stream of their own, a budget a hole, and what's coming
  let voiceRng = S.rng(1);
  let spoken = 0;
  let pendingRun: { at: number; modes: Mode[]; cuts: Cut[] } | null = null;
  let runs = 0;
  let runId = 0;
  let calmHole = 0;
  // The walk: its run, how it was answered, and what that leaves for the next tee
  let walkBow = false;
  let walkU = 0;
  let nextTee: 'none' | 'caught' | 'follow' | 'kept' = 'none';
  // What happened on each hole, for the walk after it: worth keeping, trouble, the
  // targets swung at
  let feats: Set<MomentKind>[] = [new Set(), new Set(), new Set()];
  let trouble: Set<Trouble>[] = [new Set(), new Set(), new Set()];
  // The line up when the Flic went down: a tap is held against it when it's let go
  let armed: Cut | Beat | null = null;
  const walk = createWalk();
  const runHole = new Map<number, number>();
  // A swing ends a run, once the press is long enough to be one
  let swingCleared = false;
  let waitT0 = -1;
  let lastHeckleShot = -1;
  // Nothing said twice in a round, and the hurry-up only once
  let said = new Set<string>();
  // A line from a pool not yet said this round, or none
  const fresh = (pool: readonly string[], pick: number) => {
    for (let i = 0; i < pool.length; i++) {
      const l = pool[(Math.floor(pick * pool.length) + i) % pool.length];
      if (!said.has(l)) return l;
    }
    return null;
  };

  // The notional clock: the phases finished, and the one under way
  let clock = 0;
  let ph: { secs: number; start: number; frac: () => number } | null = null;
  const commit = () => {
    if (ph) clock += ph.secs;
    ph = null;
  };
  const phase = (p: S.Phase, units: number, frac: () => number) => {
    commit();
    ph = { secs: S.phaseSeconds(p, units), start: gt, frac };
  };
  const nowT = () => (ph ? clock + clamp(ph.frac(), 0, 1) * ph.secs : clock);

  // Aim
  let aim: Vec = [0, 0];
  let chips: { name: string; at: Vec; kind: 'flag' | 'fat' | 'line' }[] = [];
  let onChip = -1;
  let club: Club = 'driver';
  let sit: Situation = { nervy: false, approach: false, lines: null, caddie: null };
  let diff = { k: 1, tremble: false, spread: 1 };
  // The pattern as drawn: it eases to the moment rather than jumping
  let shownSpread = 1;
  let lastAim = 0;
  let quietSaid = false;
  // Stepping in: aiming is free until you step in to the ball; then the routine runs and a
  // press is a swing. Step off to think again, though changing the line then is doubt
  let stepped = false;
  let steppedOnce = false;
  let stepT = 0;
  // A club chosen by hand stays chosen while the line moves
  let clubManual = false;
  // A tap behind the ball, carrying Commit to the Line: told if the line moves after it
  let lineWatch: (() => void) | null = null;
  // And the line it decided, inked in brass on the board from then: when, or -1
  let inkT0 = -1;

  // The swing
  let breath = false;
  let swingAt = 0;
  let relMs = -1;
  let shot: Shot | null = null;
  // How high the shot in hand is drawn against the sim's heights (pixel.ts)
  let lift = 1;
  let putts: Shot[] = [];
  let shotWord = '';

  // The golfer: where they stand, which way they face, and their pose
  let golfer: Vec = S.holeDef(1).tee;
  let face: 1 | -1 = 1;
  let walkPath: Vec[] = [];
  let walkDur = 0;
  let walking = false;
  let putter = false;
  let pose: Pose = POSES.addr;
  let poseQ: { to: Pose; dur: number }[] = [];
  let poseTw: { from: Pose; to: Pose; t0: number; dur: number } | null = null;
  let slumped = false;

  // The ball as drawn
  let bp: Vec = S.holeDef(1).tee;
  let bz = 0;
  let bo = 1;
  let sunk = false;
  let track: Seg[] = [];
  let segI = 0;
  let segT0 = 0;
  let trace: { p: Vec; z: number }[] = [];
  let ghost: { p: Vec; z: number }[] | null = null;
  let ghostT0 = 0;

  // The theatre
  let four: Vec[] = [];
  let heronT = -1;
  let galleryBob = -1e9;

  // Captions, one at a time
  let capQueue: { q: string; by: string; ms: number }[] = [];
  let capUntil = 0;
  let bubbleAt: Vec | null = null;

  // ---------------------------------------------------------------------------------
  // Helpers

  const h = () => S.holeDef(hole);
  const isPutt = () => S.isPutt(ball);
  const say = (t: string) => opts.status(t);
  const setMode = (m: Mode) => {
    mode = m;
    mT = gt;
    scene.dataset.mode = m;
    paintStep();
  };

  function caption(qt: string, by: string, ms = 2400, now = false) {
    if (now) {
      capQueue = [];
      capUntil = 0;
    }
    capQueue.push({ q: qt, by, ms });
  }
  function clearCaptions() {
    capQueue = [];
    capUntil = 0;
    caddieEl.classList.remove('on');
    bubbleEl.classList.remove('on');
    bubbleAt = null;
  }

  function word(w: string, cls = '') {
    if (!w) return;
    wordEl.textContent = w;
    wordEl.classList.remove('on', 'gold', 'bad');
    if (cls) wordEl.classList.add(cls);
    const [x, y] = board.toCss(bp);
    wordEl.style.left = `${Math.round(x)}px`;
    wordEl.style.top = `${Math.round(y)}px`;
    void wordEl.offsetWidth;
    wordEl.classList.add('on');
  }

  // Poses: a queue of eased moves between keyframes
  function poseTo(to: Pose, dur: number) {
    poseQ = [];
    if (reduce || dur <= 0) {
      pose = to;
      poseTw = null;
      return;
    }
    poseTw = { from: pose, to, t0: gt, dur };
  }
  /** With reduced motion only one pose is shown: `still`, or else the last */
  function poseSeq(steps: [Pose, number][], still?: Pose) {
    if (reduce) {
      pose = still ?? steps[steps.length - 1][0];
      poseTw = null;
      poseQ = [];
      return;
    }
    const [first, ...rest] = steps;
    poseTw = { from: pose, to: first[0], t0: gt, dur: first[1] };
    poseQ = rest.map(([to, dur]) => ({ to, dur }));
  }

  // Which way the golfer faces a shot: towards the ball, the target into the screen
  function faceFor(from: Vec, to: Vec): 1 | -1 {
    const [x0, y0] = board.toPx(from);
    const [x1, y1] = board.toPx(to);
    const dy = y1 - y0;
    const dx = x1 - x0;
    if (Math.abs(dy) < 2) return dx >= 0 ? -1 : 1;
    return dy < 0 ? 1 : -1;
  }
  // Where the golfer stands to a ball: to the side of it, the club on the ball
  function standAt(b: Vec, to: Vec): Vec {
    face = faceFor(b, to);
    const o = board.offset(-BALL_DX * face, 0);
    return [b[0] + o[0], b[1] + o[1]];
  }

  // ---------------------------------------------------------------------------------
  // The meter: one bar, from nothing to the top and on into the overswing. The sweet spot
  // is marked near the top: gold for pure, pale for good. It narrows with the nerves

  const pct = (ms: number) => `${((clamp(ms, 0, SW.end) / SW.end) * 100).toFixed(2)}%`;
  let mK = 0;
  function paintBands(k: number) {
    if (k === mK) return;
    mK = k;
    goodEl.style.left = pct(SW.centre - SW.good / k);
    goodEl.style.width = `${(((2 * SW.good) / k / SW.end) * 100).toFixed(2)}%`;
    pureEl.style.left = pct(SW.centre - SW.pure / k);
    pureEl.style.width = `${(((2 * SW.pure) / k / SW.end) * 100).toFixed(2)}%`;
  }

  // ---------------------------------------------------------------------------------
  // Aim: click where you want it to go. The club follows the distance

  const clubFor = (p: Vec) => S.suggestClub(ball.at, p, ball.lie) as Club;

  function setAim(p: Vec, why: 'click' | 'key' | 'chip' | 'start' | 'drag') {
    let t = S.clampAim(ball, p);
    // Snap to a target within reach of it
    const near = chips.findIndex((c) => S.dist(c.at, t) < (why === 'key' ? 3 : 8));
    if (near >= 0) t = chips[near].at;
    // Settled on a line, then changed it again: that's doubt, and it costs a notch
    if (why !== 'start' && S.dist(aim, t) >= 1.5) {
      if (steppedOnce && !doubt) {
        doubt = true;
        ctx.doubt = true;
        onDoubt();
      }
      aimSets++;
      lineWatch?.();
      lineWatch = null;
      inkT0 = -1;
    }
    aim = t;
    if (!clubManual) club = clubFor(aim);
    sit = S.situation(ball, aim, ctx);
    const was = onChip;
    onChip = chips.findIndex((c) => S.dist(c.at, aim) < 0.5);
    if (was !== onChip || why === 'start') paintChips(true);
    clubText();
    if (why !== 'start') {
      lastAim = gt;
      breath = false;
      pips.forEach((pp) => pp.classList.remove('lit', 'skipped'));
      // Turn to face the new line
      golfer = standAt(ball.at, aim);
    }
    hush();
    if (why !== 'start' && why !== 'drag') say(`Aiming at ${aimWords()}, ${S.CLUBS[club].tag}.`);
  }

  // Into the ball: the line and the club are set, and the routine starts
  function stepIn() {
    if (mode !== 'aim' || stepped) return;
    stepped = true;
    steppedOnce = true;
    stepT = gt;
    breath = false;
    pips.forEach((pp) => pp.classList.remove('lit', 'skipped'));
    golfer = standAt(ball.at, aim);
    poseTo(POSES.addr, 120);
    snd.click();
    paintStep();
    hint();
    say(`Stepped in, ${S.CLUBS[club].tag}. Hold to swing; Escape steps off.`);
  }
  function stepOff() {
    if (mode !== 'aim' || !stepped) return;
    stepped = false;
    breath = false;
    pips.forEach((pp) => pp.classList.remove('lit', 'skipped'));
    hush();
    paintStep();
    hint();
    say('Stepped off.');
  }
  // The next club in the bag that can be hit from here: down the bag, or up with shift
  function cycleClub(dir: 1 | -1 = 1) {
    if (mode !== 'aim' || stepped || isPutt()) return;
    const bag = S.clubsFor(ball);
    const i = bag.indexOf(club as S.FullClub);
    club = bag[(i + dir + bag.length) % bag.length];
    clubManual = club !== clubFor(aim);
    snd.click();
    clubText();
    say(`${cap(S.CLUBS[club].tag)}.`);
  }
  function paintStep() {
    const on = mode === 'aim' && !isPutt();
    stepEl.disabled = !on;
    stepEl.textContent = stepped ? 'step off' : 'step in';
    stepEl.setAttribute('aria-pressed', String(stepped));
    clubEl.disabled = !on || stepped;
  }

  // The golfer's doubt shows: a thought over their head, and, now and then, the words
  function onDoubt() {
    cloud = { t0: gt, doubt: true };
    if (!planRun(['doubt'], 0, ['aim'])) say('Second thoughts.');
  }

  // The commit in so many words, for whatever the aim is on when it's said
  const commitSays = () => {
    const c = chips[onChip];
    const l = c ? COMMIT_SAYS[c.name] : undefined;
    if (!l || said.has(l)) return null;
    said.add(l);
    return l;
  };

  // A run of testimony from the inner voice, at a moment that matters for the thought
  // carried: two or three lines, at most one of them the catch. Seeded, never a line
  // twice in a round, a run or two a hole, and quiet for the rest of a hole once caught.
  // Returns whether one is coming
  function planRun(sits: (Sit | null)[], delay: number, modes: Mode[]) {
    const book = XEXAM[THOUGHTS[thought].name];
    const sit = sits.find((x): x is Sit => !!x && !!book?.[x]);
    // The same draws every time, whatever happens next, so the stream stays put
    const u = voiceRng();
    const c = voiceRng();
    const len = voiceRng();
    const at = voiceRng();
    const p1 = voiceRng();
    const p2 = voiceRng();
    const p3 = voiceRng();
    if (!sit || !book) return false;
    if (calmHole === hole || runs >= RUNS_A_HOLE || spoken >= VOICE_BUDGET || pendingRun || cutins.inRun) return false;
    const spec = book[sit]!;
    if (u >= spec.p * (runs ? 0.5 : 1)) return false;
    const catchLine = c < spec.catchP ? fresh(spec.catch, p1) : null;
    const n = 2 + (len < (catchLine ? 0.55 : 0.4) ? 1 : 0);
    const cuts: Cut[] = [];
    const foil = fresh(spec.foils, p2);
    if (foil) {
      said.add(foil);
      cuts.push({ who: 'you', expr: spec.expr, line: foil, by: '' });
    }
    while (cuts.length < n - (catchLine ? 1 : 0)) {
      const o = fresh(ORDINARY, p3 + cuts.length * 0.37);
      if (!o) break;
      said.add(o);
      cuts.push({ who: 'you', expr: 'calm', line: o, by: '' });
    }
    // The ordinary line goes in front of the situation's, now and then
    if (cuts.length === 2 && p3 < 0.4) cuts.reverse();
    if (catchLine) {
      said.add(catchLine);
      const commit = THOUGHTS[thought].name === 'Commit to the Line';
      cuts.splice(Math.floor(at * (cuts.length + 1)), 0, { who: 'you', expr: spec.catchExpr, line: catchLine, by: '', catch: true, alt: commit ? commitSays : undefined });
    }
    if (cuts.length < 2) return false;
    pendingRun = { at: gt + delay, modes, cuts };
    return true;
  }

  // What the inner voice might say over the ball, decided as the shot is set up
  function planAimVoice(heckled: boolean) {
    const gallery = heckled || (hole === 2 && ball.strokes === 0);
    const approach = chips.some((c) => c.kind === 'fat');
    planRun([gallery ? 'gallery' : null, approach ? 'approach' : null, chips.length ? 'choice' : null], 900, ['aim']);
  }

  // And on the walk: the gallery, or the last shot, or nothing
  function planWalkVoice(s: Shot, heckled: boolean) {
    const bad = BAD.has(lieOf(s)) || s.grade === 'fat' || s.grade === 'flail' || s.events.includes('treeHit');
    const good = s.grade === 'pure' || s.grade === 'good';
    planRun([heckled ? 'heckled' : null, bad ? 'bad' : null, good && !bad ? 'good' : null], 300, ['walk', 'aim']);
  }

  function clubText() {
    const tag = isPutt() ? 'putter' : S.CLUBS[club].tag;
    clubEl.textContent = tag;
  }

  function aimWords() {
    const c = chips[onChip];
    if (c) return c.kind === 'flag' ? 'the flag' : c.kind === 'fat' ? 'the fat of the green' : (LINE_WORDS[c.name] ?? `the line ${c.name}`);
    const H = h();
    if (S.dist(aim, H.green.c) < H.green.rx + 4) return 'the green';
    const s = S.surfaceAt(H, aim);
    return s === 'fairway' ? 'the fairway' : s === 'water' ? 'the water' : s === 'bunker' ? 'a bunker' : 'the rough';
  }

  let chipsKey = '';
  function paintChips(only = false) {
    if (!only) {
      chipsKey = '';
      chipsEl.innerHTML = chips.map((c, i) => `<button type="button" class="chip" data-chip="${i}" tabindex="-1">${c.name}</button>`).join('');
      srAim.innerHTML = chips.map((c, i) => `<button type="button" data-sr-chip="${i}">aim at ${c.kind === 'flag' ? 'the flag' : c.kind === 'fat' ? 'the fat of the green' : (LINE_WORDS[c.name] ?? c.name)}</button>`).join('');
    }
    chipsEl.querySelectorAll<HTMLElement>('[data-chip]').forEach((el, i) => el.classList.toggle('on', i === onChip));
  }
  // The chip labels follow the board, which only moves on a phone between holes
  function placeChips() {
    const [ox, oy] = board.origin;
    const key = `${chips.length}:${ox.toFixed(1)}:${oy.toFixed(1)}:${scale}:${view.a}:${golfer[0].toFixed(0)}:${golfer[1].toFixed(0)}`;
    if (key === chipsKey) return;
    chipsKey = key;
    chipsEl.querySelectorAll<HTMLElement>('[data-chip]').forEach((el, i) => {
      const c = chips[i];
      if (!c) return;
      const [x, y] = board.toCss(c.at);
      // Labels face away from each other: the left-hand target's label on its left
      const other = chips[1 - i];
      el.classList.toggle('l', !!other && x < board.toCss(other.at)[0]);
      // A label that would sit on the golfer's head goes up and over them
      const [gx, gy] = board.toCss(golfer);
      const clash = Math.abs(x - gx) < 90 && y > gy - 24 * scale && y < gy + 6 * scale;
      el.style.left = `${Math.round(x)}px`;
      el.style.top = `${Math.round(clash ? gy - 26 * scale : y)}px`;
    });
  }

  // Quiet, please: the edges darken on a nervy shot until the breath is taken
  function hush() {
    const on = mode === 'aim' || mode === 'swing' ? sit.nervy && !breath : false;
    setHush(on);
    if (on && !quietSaid) {
      quietSaid = true;
      caption('“Quiet, please.”', hole === 3 ? 'from the rope' : 'your caddie', 2400);
    }
  }

  // The hush and the dusk ease in and out over the board
  let hushOn = false;
  let hushT = -1e9;
  function setHush(on: boolean) {
    if (on === hushOn) return;
    hushOn = on;
    hushT = gt;
    game.classList.toggle('hush', on);
  }
  const hushLevel = () => {
    const u = clamp((gt - hushT) / 600, 0, 1);
    return hushOn ? u : 1 - u;
  };
  let dusk: { on: boolean; t0: number; ms: number } = { on: false, t0: -1e9, ms: 1 };
  const duskLevel = () => {
    const u = clamp((gt - dusk.t0) / dusk.ms, 0, 1);
    return dusk.on ? u : 0;
  };

  // A new round, or a round put away: nothing left over from the last
  function clearShot() {
    puttAt = -1;
    putts = [];
    shot = null;
    track = [];
    trace = [];
    relMs = -1;
  }

  // ---------------------------------------------------------------------------------
  // The flow

  function begin(t: number) {
    thought = t;
    const p = new URLSearchParams(location.search).get('ot-seed');
    round = p != null && /^\d+$/.test(p) ? Number(p) >>> 0 : (Date.now() ^ (t << 8)) >>> 0;
    root.dataset.seed = String(round);
    staging = S.stagingRng(round);
    voiceRng = S.rng((round ^ 0x701ce) >>> 0);
    said = new Set();
    calmHole = 0;
    runHole.clear();
    feats = [new Set(), new Set(), new Set()];
    trouble = [new Set(), new Set(), new Set()];
    nextTee = 'none';
    strokes = [0, 0, 0];
    heckledEver = false;
    pool = [];
    firstShot = true;
    fullShots = 0;
    trails = [];
    patterns = [];
    bounds = [];
    record = null;
    clock = 0;
    ph = null;
    ghost = null;
    heronT = -1;
    clearShot();
    board.clearFx();
    say(`Round started, carrying ${THOUGHTS[t].name}.`);
    intro(1);
  }

  function intro(n: HoleN) {
    if (n > 1) bounds.push(nowT());
    hole = n;
    ball = S.startHole(n);
    swings = 0;
    heckles = 0;
    tuckedSaid = false;
    ctx = { hurried: false, breath: false, afterHeckle: false };
    bp = ball.at;
    bz = 0;
    bo = 1;
    sunk = false;
    ghost = null;
    four = [];
    spoken = 0;
    runs = 0;
    pendingRun = null;
    lastHeckleShot = -1;
    cutins.clear(gt);
    teeLine();
    phase('intro', 0, () => (reduce ? 1 : (gt - mT) / 900));
    setMode('intro');
    const H = h();
    golfer = standAt(ball.at, S.defaultAim(ball));
    walking = false;
    putter = false;
    slumped = false;
    pose = POSES.addr;
    focus(n);
    holeText.innerHTML = `<b>The ${shownWord(n)}</b><span class="hn"> · ${H.name}</span> · par ${PAR_WORD[H.par]}<span class="carrying"> · carrying <i>${THOUGHTS[thought].name}</i></span>`;
    drawMini(miniCv, n);
    holeEl.classList.remove('in');
    void holeEl.offsetWidth;
    holeEl.classList.add('in');
    say(`The ${shownWord(n)}, ${H.name}, par ${PAR_WORD[H.par]}.`);
  }

  function enterAim() {
    if (isPutt()) return startPutts();
    setMode('aim');
    walking = false;
    putter = false;
    sunk = false;
    slumped = false;
    quietSaid = false;
    phase('preShot', 0, () => Math.min((gt - mT) / 6000, 0.95));
    const H = h();
    const d0 = S.defaultAim(ball);
    breath = false;
    ctx.breath = false;
    ctx.hurried = false;
    ctx.doubt = false;
    doubt = false;
    aimSets = 0;
    lineWatch = null;
    inkT0 = -1;
    stepped = false;
    steppedOnce = false;
    clubManual = false;
    wind = S.windFor(round, hole, swings + 1);
    const s0 = S.situation(ball, d0, ctx);
    chips = [];
    if (s0.lines) chips = s0.lines.map((l) => ({ name: l.name, at: l.at, kind: 'line' as const }));
    else if (s0.approach || (hole === 2 && ball.strokes === 0)) {
      chips = [
        { name: 'flag', at: H.cup, kind: 'flag' },
        { name: 'fat of the green', at: H.fat, kind: 'fat' },
      ];
    }
    onChip = -1;
    paintChips();
    lastAim = gt;
    pips.forEach((p) => p.classList.remove('lit', 'skipped'));
    setAim(d0, 'start');
    golfer = standAt(ball.at, aim);
    poseTo(POSES.addr, 0);

    // What the course puts in front of you, whatever you carry
    const first = swings === 0;
    let rope = false;
    if (first && hole === 3) {
      if (!heckledEver) {
        heckledEver = true;
        heckles++;
        ctx.afterHeckle = true;
        fourBall();
        rope = true;
        caption('“Any chance this year?”', 'the four-ball behind', 2600);
        say('The four-ball behind: “Any chance this year?”');
        sit = S.situation(ball, aim, ctx);
      } else fourBall();
    } else if (first && hole === 2 && strokes[0] >= S.PAR[1] + 2) fourBall();
    // Two lines: the caddie cuts in to offer them. Twice a round, and outside the budget,
    // which is the inner voice's and the rope's
    if (s0.lines && H.lines) cutins.say({ who: 'caddie', expr: 'calm', line: `“${H.lines.caddie}”`, by: 'your caddie' }, gt);
    else if (chips.length && !tuckedSaid) {
      tuckedSaid = true;
      caption(`“${S.TUCKED}”`, 'your caddie', 3200);
    }
    hush();
    planAimVoice(rope);
    const capNow = s0.lines ? ` ${H.lines!.caddie}` : '';
    say(`Your shot.${capNow} ${S.windWords(wind, ball.at, aim)} Aiming at ${aimWords()}, ${S.CLUBS[club].tag}.`);
    hint();
  }

  // The four-ball behind, waiting on the tee
  function fourBall() {
    const tee = h().tee;
    const back = angOf(aim, tee);
    four = [0, 1, 2, 3].map((i) => {
      const p = toward(toward(tee, back, 16 + (i % 2) * 4), back + Math.PI / 2, (i - 1.5) * 6);
      return [clamp(p[0], 6, 594), clamp(p[1], 6, 254)] as Vec;
    });
    caption('“No rush. They’re only waving.”', 'your caddie', 2600);
  }

  const pipsLit = () => (stepped ? clamp(Math.floor((gt - stepT) / PIP_MS), 0, 3) : 0);
  // The moment as it stands over the ball: the routine so far, the nerves, the mind
  const liveDiff = () => {
    const lit = pipsLit();
    return S.difficulty(ball, sit, { ...ctx, breath, doubt, beats: lit, hurried: lit < 3 });
  };
  // The pattern on the grass, eased: it tightens as each beat of the routine lands and
  // opens again when the line is changed. In the swing it holds where it was let go from
  let patT = 0;
  function patternNow() {
    const want = mode === 'aim' ? liveDiff().spread : shownSpread;
    const dt = Math.max(0, gt - patT);
    patT = gt;
    shownSpread = reduce || dt > 500 ? want : shownSpread + (want - shownSpread) * (1 - Math.exp(-dt / 140));
    const pt = S.pattern(ball, club as S.FullClub, aim, shownSpread);
    return { ...pt, tremble: sit.nervy && !breath && !reduce };
  }

  // A swing puts the voices away, and whatever was coming
  function endForSwing() {
    if (swingCleared) return;
    swingCleared = true;
    cutins.clear(gt);
    if (pendingRun && !pendingRun.modes.includes('walk')) pendingRun = null;
  }

  // Press and hold: the meter climbs
  function swingStart() {
    if (!stepped) return;
    swingCleared = false;
    setMode('swing');
    swingAt = nowG();
    relMs = -1;
    poseTw = null;
    poseQ = [];
    hint();
  }

  // Let go: a click if it was quick, a swing if not
  function swingEnd(auto = false) {
    if (mode !== 'swing') return;
    const held = nowG() - swingAt;
    // Too short to be a swing: still over the ball
    if (!auto && held < SW.click) {
      setMode('aim');
      pose = POSES.addr;
      hint();
      return;
    }
    lineWatch = null;
    stepped = false;
    const lit = pipsLit();
    const hurried = lit < 3;
    ctx.hurried = hurried;
    ctx.beats = lit;
    ctx.breath = breath;
    ctx.doubt = doubt;
    cloud = null;
    endForSwing();
    diff = S.difficulty(ball, sit, ctx);
    if (hurried) {
      pips.forEach((p, i) => p.classList.toggle('skipped', i >= lit));
      pipsEl.classList.add('rushed');
      window.setTimeout(() => pipsEl.classList.remove('rushed'), 1100);
    }
    phase('shot', 0, () => 0.5);
    swings++;
    relMs = Math.min(held, SW.end);
    const err = auto || held >= SW.end ? null : held - SW.centre;
    patterns.push(S.pattern(ball, club as S.FullClub, aim, diff.spread));
    shot = S.strike(ball, { club, aim, errMs: err, wind }, diff.k, S.shotSeed(round, hole, swings), diff.spread);
    const g = shot.grade;
    lift = liftFor(club as S.FullClub);
    snd.whoosh();
    if (g === 'pure' && !reduce) {
      meterEl.classList.remove('flash');
      void meterEl.offsetWidth;
      meterEl.classList.add('flash');
    }
    // Down and through, by how it was struck: a pure one held in a full finish, a good one
    // let down sooner, a touch early or late in a shorter one, a heavy one left in the
    // ground, a flail thrown off balance and caught. The ball goes at impact, a beat after
    // the release
    const lie0 = ball.lie;
    const at0 = ball.at;
    impactFx = () => {
      snd.contact(g === 'pure' ? 'pure' : g === 'good' || g === 'early' || g === 'late' ? 'good' : 'thin');
      if (g === 'pure' && !reduce) {
        freezeUntil = performance.now() + 80;
        board.burst('gold', at0, gt);
      }
      if (g === 'fat') board.burst('divot', at0, gt, -Math.PI / 2);
      else if (!reduce && lie0 !== 'tee' && lie0 !== 'bunker') board.burst('turf', at0, gt);
      if (lie0 === 'bunker') board.burst('sand', at0, gt);
    };
    const down: [Pose, number] = [POSES.down, DOWN - IMPACT];
    const hit: [Pose, number] = [g === 'fat' ? POSES.dug : POSES.impact, IMPACT];
    const fin = g === 'pure' || g === 'good' ? POSES.finish : g === 'early' || g === 'late' ? POSES.short : g === 'fat' ? POSES.slump : POSES.flail;
    poseSeq(
      g === 'pure'
        ? [down, hit, [POSES.through, 100], [POSES.finish, 240], [POSES.finish, 900]]
        : g === 'good'
          ? [down, hit, [POSES.through, 100], [POSES.finish, 240], [POSES.finish, 200], [POSES.post, 320]]
          : g === 'early' || g === 'late'
            ? [down, hit, [POSES.through, 90], [POSES.short, 200]]
            : g === 'fat'
              ? [down, hit, [POSES.dug, 160], [POSES.slump, 320]]
              : [down, hit, [POSES.flail, 150], [POSES.flail, 140], [POSES.steady, 200]],
      fin,
    );
    launch();
  }
  // The downswing from the release to impact, and the last part of it into the ball
  const DOWN = 110;
  const IMPACT = 50;
  let impactFx: (() => void) | null = null;

  // ---------------------------------------------------------------------------------
  // The ball in the air, as a list of segments

  /** A shot's flight at the heights it's drawn at: the club's drawn peak on the arc (see
   *  arcAt), and lifted all through if that would show it going through a tree the sim
   *  says it cleared. Drawn the same in the air, on the record and as the ghost */
  function drawnFlight(s: S.Shot): S.Sample[] {
    const peak = s.apex * lift;
    const fl = s.flight.map((x) => ({ ...x, z: peak * arcAt(x.s) }));
    let k = 1;
    for (const x of fl) {
      if (x.p === s.treeHit || x.z <= 0) continue;
      const need = crownOver(x.p) / view.zk;
      if (need > 0) k = Math.max(k, need / x.z);
    }
    k = Math.min(k, 1.8);
    return k > 1 ? fl.map((x) => ({ ...x, z: x.z * k })) : fl;
  }

  function launch() {
    if (!shot) return;
    setMode('flight');
    hintEl.classList.remove('on');
    setHush(false);
    const sh0 = shot;
    const putt = sh0.grade === null;
    track = [];
    trace = [];
    const H = h();
    const flight = drawnFlight(sh0);
    const hitIdx = sh0.treeHit ? flight.findIndex((s) => s.p === sh0.treeHit) : -1;
    const air = hitIdx >= 0 ? flight.slice(0, hitIdx + 1) : flight;
    const defl = hitIdx >= 0 ? flight.slice(hitIdx) : [];
    const out = sh0.events.includes('out');
    const wet = sh0.events.includes('water');
    const holed = sh0.next.done && !sh0.next.pickedUp;
    const landP = air[air.length - 1].p;
    const carry = S.dist(sh0.from, landP);
    const finalP: Vec = holed ? H.cup : sh0.next.at;

    if (reduce) {
      track.push({ dur: 300, at: (u) => (u < 0.5 ? { p: sh0.from, z: 0, o: 1 - u * 2 } : { p: finalP, z: 0, o: holed && !putt ? 0 : (u - 0.5) * 2 }) });
      impactFx?.();
      impactFx = null;
      segI = 0;
      segT0 = gt;
      return;
    }

    if (!putt && air.length > 1) {
      const dur = clamp(560 + carry * 8, 750, 1600);
      track.push({ dur, at: (u) => byIndex(air, u) });
    }

    // Through the timber: a clack, a straight drop, then on along the deflection
    if (sh0.treeHit) {
      const hp = sh0.treeHit;
      const hz = air[air.length - 1].z;
      const ti = S.COURSE.holes.flatMap((x) => x.trees.map((t) => t.c)).findIndex((t) => S.dist(t, hp) < 7);
      track.push({
        dur: 380,
        start: () => {
          if (ti >= 0) board.rock(ti, gt);
          snd.knock();
          board.burst('leaves', hp, gt);
          board.burst('clack', hp, gt);
          board.shake(2, gt);
        },
        at: (u) => ({ p: hp, z: u < 0.7 ? hz * (1 - (u / 0.7) ** 2) : 1.6 * Math.sin(((u - 0.7) / 0.3) * Math.PI) }),
      });
      if (defl.length > 1) {
        const dp = along(defl);
        track.push({ dur: clamp(dp.total * 30, 200, 700), at: (u) => ({ p: dp.at(easeOut(u)).p, z: 0 }) });
      }
    }

    if (out) {
      const last = flight[flight.length - 1].p;
      const ang = angOf(sh0.from, last);
      track.push({ dur: 480, start: () => board.shake(3, gt), at: (u) => ({ p: toward(last, ang, u * 6), z: -u * u * 40, o: 1 - u * 0.6 }) });
    }

    // Down: bounce and roll by what it lands on
    if (!out && !sh0.treeHit && sh0.roll.length > 1) {
      const land = S.surfaceAt(H, sh0.roll[0].p);
      const ap = sh0.apex * lift;
      const bounces: [number, number][] = putt
        ? []
        : land === 'green' || land === 'fringe'
          ? [[0.14 * ap, 180]]
          : land === 'rough'
            ? [[0.05 * ap, 140]]
            : [
                [0.22 * ap, 180],
                [0.06 * ap, 110],
              ];
      const bTotal = bounces.reduce((a, b) => a + b[1], 0);
      const rp = along(sh0.roll);
      const dur = putt ? clamp(500 + rp.total * 45, 600, 2000) : Math.max(bTotal + 120, clamp(rp.total * 22, 250, 1300));
      const bzAt = (ms: number) => {
        let t = ms;
        for (const [hh, d] of bounces) {
          if (t < d) return hh * 4 * (t / d) * (1 - t / d);
          t -= d;
        }
        return 0;
      };
      track.push({
        dur,
        start: () => {
          if (!putt) landFx(land, sh0.roll[0].p);
        },
        at: (u, ms) => ({ p: rp.at(putt ? 1 - (1 - u) ** 2.2 : easeOut(u)).p, z: putt ? 0 : bzAt(ms) }),
      });
    } else if (!out && !sh0.treeHit && !putt) {
      // Straight into sand or water, or holed on the full
      track.push({ dur: 1, start: () => landFx(S.surfaceAt(H, landP), landP), at: () => ({ p: landP, z: 0 }) });
    }

    if (wet) {
      const drop = sh0.drop ?? sh0.next.at;
      track.push({ dur: 650, at: () => ({ p: drop, z: 0, o: 0 }) });
      track.push({ dur: 240, at: (u) => ({ p: drop, z: 10 * (1 - u * u), o: 1 }) });
    }
    if (holed) {
      track.push({ dur: 120, at: () => ({ p: H.cup, z: 0, o: 1 }) });
      track.push({ dur: 160, at: (u) => ({ p: H.cup, z: -u * 2, o: 1 - u }) });
    }
    if (!track.length) track.push({ dur: 300, at: (u) => ({ p: sh0.from, z: 0, o: 1 - u }) });
    // A full swing: the ball sits while the club comes down, and goes at impact
    const fx = impactFx;
    impactFx = null;
    if (fx) {
      const first = track[0];
      const go = first.start;
      first.start = () => {
        fx();
        go?.();
      };
      if (!reduce) track.unshift({ dur: DOWN, at: () => ({ p: sh0.from, z: 0 }) });
    }
    segI = 0;
    segT0 = gt;
    track[0].start?.();
  }

  function landFx(land: string, p: Vec) {
    if (land === 'water') snd.splash();
    else if (land === 'bunker') snd.sand();
    else snd.thud();
    if (land === 'water') {
      board.burst('splash', p, gt);
      board.shake(2, gt);
    } else if (land === 'bunker') {
      board.burst('sand', p, gt);
      sunk = true;
    } else if (land === 'rough') {
      board.burst('turf', p, gt);
    } else {
      board.burst('puff', p, gt);
    }
    if (hole === 2 && swings === 1 && heronT < 0 && !reduce) heronT = gt;
  }

  function stepTrack() {
    if (mode !== 'flight') return;
    let seg = track[segI];
    let ms = gt - segT0;
    while (seg && ms >= seg.dur) {
      segI++;
      segT0 += seg.dur;
      ms = gt - segT0;
      seg = track[segI];
      seg?.start?.();
    }
    if (!seg) {
      landed();
      return;
    }
    const r = seg.at(seg.dur ? ms / seg.dur : 1, ms);
    bp = r.p;
    bz = r.z;
    bo = r.o ?? 1;
    if (!reduce && shot && shot.grade !== null && bz > 0.6) {
      trace.push({ p: bp, z: bz });
      if (trace.length > 18) trace.shift();
    }
  }

  // ---------------------------------------------------------------------------------
  // After the shot

  const BAD: ReadonlySet<string> = new Set(['rough', 'bunker', 'water', 'trees', 'out']);

  function lieOf(s: Shot): Lie {
    if (s.events.includes('holed')) return 'holed';
    if (s.events.includes('water')) return 'water';
    if (s.events.includes('out')) return 'out';
    const l = s.next.lie;
    return l === 'tee' ? 'fairway' : l === 'fringe' ? 'green' : l === 'trees' ? 'trees' : l === 'rough' || l === 'bunker' || l === 'green' ? l : 'fairway';
  }

  function whereWords(s: Shot) {
    if (s.events.includes('water')) {
      const p = s.drop ?? s.next.at;
      const name = p[0] < 122 && p[1] > 90 ? 'pond' : 'creek';
      return `Dropped by the ${name}.`;
    }
    if (s.events.includes('out')) return 'Off the table, playing again.';
    const l = s.next.lie;
    return l === 'rough' ? 'In the rough.' : l === 'bunker' ? 'In the bunker.' : l === 'trees' ? 'In the trees.' : l === 'green' ? 'On the green.' : l === 'fringe' ? 'On the fringe.' : 'On the fairway.';
  }

  function wordFor(s: Shot): string {
    const ev = s.events;
    if (ev.includes('pickedUp')) return 'picked up.';
    if (ev.includes('holed')) return 'in.';
    if (ev.includes('water')) return 'wet.';
    if (ev.includes('out')) return 'gone.';
    if (ev.includes('treeHit')) return 'timber.';
    if (ev.includes('bunker')) return 'sand.';
    if (s.grade === null) {
      const cup = h().cup;
      const ang = angOf(s.from, cup);
      const pastBy = (s.next.at[0] - cup[0]) * Math.cos(ang) + (s.next.at[1] - cup[1]) * Math.sin(ang);
      return pastBy > 0 ? 'by.' : 'short.';
    }
    switch (s.grade) {
      case 'pure':
        return 'pure.';
      case 'good':
        return firstShot ? 'good.' : ['good.', 'nicely.', 'fine.'][swings % 3];
      case 'early':
        return 'pulled.';
      case 'late':
        return 'hooked.';
      case 'fat':
        return 'fat.';
      default:
        return 'flailed.';
    }
  }

  function landed() {
    const s = shot!;
    relMs = -1;
    const H = h();
    const putt = s.grade === null;
    // With reduced motion the putter stays through until the ball stops
    if (putt && reduce) poseTo(POSES.addr, 0);
    const fromLie = ball.lie;
    ball = s.next;
    strokes[hole - 1] = ball.strokes;
    if (!putt) fullShots++;
    ctx.afterHeckle = false;
    const holed = ball.done && !ball.pickedUp;
    bp = holed ? H.cup : ball.at;
    bz = 0;
    bo = ball.done ? 0 : 1;
    // Keep the line it flew, at height, for the record
    trails.push([...drawnFlight(s).map((x) => ({ p: x.p, z: x.z })), ...s.roll.map((x) => ({ p: x.p, z: 0 }))]);
    const lie = lieOf(s);
    opts.onShot(hole, lie, putt);
    // Kept for the walk: a pure one, a way out of trouble, a putt or a chip dropping
    const fx = feats[hole - 1];
    if (s.grade === 'pure') fx.add('pure');
    if ((fromLie === 'bunker' || fromLie === 'trees' || fromLie === 'rough') && (lie === 'fairway' || lie === 'green' || lie === 'holed')) fx.add('escape');
    if (holed) fx.add(putt ? (S.dist(s.from, H.cup) > 10 ? 'putt' : 'tidy') : 'chip');
    const tr = trouble[hole - 1];
    if (s.events.includes('water')) tr.add('water');
    if (s.events.includes('out')) tr.add('out');
    if (s.events.includes('treeHit') || lie === 'trees') tr.add('trees');
    if (lie === 'bunker') tr.add('sand');
    if (lie === 'rough') tr.add('rough');
    if (ball.pickedUp) opts.onShot(hole, 'picked', false);

    shotWord = wordFor(s);
    const g = s.grade;
    word(shotWord, g === 'pure' ? 'gold' : BAD.has(lie) || g === 'fat' || g === 'flail' ? 'bad' : '');
    const disaster = s.events.some((e) => e === 'water' || e === 'out' || e === 'treeHit') || g === 'flail';
    if (g === 'flail') board.shake(3, gt);
    if (disaster || g === 'fat') {
      slumped = true;
      poseTo(POSES.slump, 300);
    }
    firstShot = false;
    if (s.events.includes('water') || s.events.includes('out')) clock += S.phaseSeconds('drop');
    commit();

    if (ball.done) {
      say(ball.pickedUp ? 'Picked up.' : 'In.');
      if (holed) {
        snd.cup();
        if (s.events.includes('chipIn') || (putt && S.dist(s.from, H.cup) > 12)) window.setTimeout(snd.applause, 300);
      }
      if (holed && !reduce) board.glowHole(hole, gt, s.events.includes('chipIn') || (putt && S.dist(s.from, H.cup) > 12) ? 2200 : 1300);
      putts = [];
      setMode('holed');
      trace = [];
      return;
    }
    if (putt) {
      // The next putt, after a beat
      say(`${cap(shotWord)}`);
      setMode('putts');
      return;
    }
    say(`${cap(shotWord.replace(/\.$/, ''))}. ${whereWords(s)}`);
    // A gallery that knows a duff when it sees one
    const duffish = s.events.some((e) => e === 'duff' || e === 'water' || e === 'out' || e === 'treeHit');
    if (duffish && heckles < 2) {
      const u = staging();
      if (u < 0.6) {
        if (!pool.length) pool = HECKLES.map((_, i) => i);
        const k = pool.splice(Math.floor(staging() * pool.length), 1)[0];
        const hk = HECKLES[k];
        heckles++;
        heckledEver = true;
        ctx.afterHeckle = true;
        lastHeckleShot = swings;
        if (hk.by === 'from the rope') galleryBob = gt;
        snd.groan();
        // From the rope, the heckler's face cuts in; the worst get a shake
        if (hk.by === 'from the rope' && spoken < VOICE_BUDGET) {
          spoken++;
          const worst = s.events.some((e) => e === 'water' || e === 'out');
          cutins.say({ who: 'heckler', expr: 'calm', line: hk.q, by: hk.by, shake: worst }, gt);
        } else {
          caption(hk.q, hk.by, 2800, true);
          say(`${cap(hk.by)}: ${hk.q}`);
        }
      }
    }
    const ghosted = BAD.has(lie) || s.events.includes('treeHit');
    ghost = ghosted ? drawnFlight(s).map((x) => ({ p: x.p, z: x.z })) : null;
    ghostT0 = gt;
    setMode('settle');
    // The settle lasts longer on a disaster
    settleMs = disaster ? 900 : 550;
  }
  let settleMs = 550;

  function startWalk() {
    const s = shot!;
    const next = S.isPutt(ball) ? h().cup : S.defaultAim(ball);
    const to = standAt(ball.at, next);
    walkPath = [golfer, to];
    const len = S.dist(golfer, to);
    walkDur = 1500 + Math.min(1000, len * 8);
    planWalkVoice(s, lastHeckleShot === swings);
    // A walk with something on it is a little longer, so it can be said
    if (pendingRun || ghost) walkDur = Math.max(walkDur, 2600);
    waitT0 = -1;
    walking = true;
    trace = [];
    setMode('walk');
    ghostT0 = gt;
    phase('walk', len, () => (gt - mT) / walkDur);
    // The caddie relitigates, unless you're already doing it yourself
    if (BAD.has(lieOf(s)) && staging() < 0.5 && !pendingRun && !cutins.inRun) {
      const r = RELITIGATE[Math.floor(staging() * RELITIGATE.length)];
      said.add(r.slice(1, -1));
      caption(r, 'your caddie', Math.max(2400, walkDur));
    }
    hint();
  }

  function arriveWalk() {
    golfer = walkPath[walkPath.length - 1];
    walking = false;
    ghost = null;
    trace = [];
    enterAim();
  }

  // On the green the putts roll out by themselves
  function startPutts() {
    putter = true;
    golfer = standAt(ball.at, h().cup);
    poseTo(POSES.pAddr, 0);
    chips = [];
    paintChips();
    swings++;
    const sit0 = S.situation(ball, h().cup, ctx);
    // Nerves on the green cost a putt now and then, as a rushed window would
    const d0 = S.difficulty(ball, sit0, ctx);
    putts = S.puttOut(ball, d0.tremble ? 1.4 : d0.k, S.shotSeed(round, hole, swings));
    setMode('putts');
    clubText();
    say('On the green.');
    hint();
  }
  function nextPutt() {
    const s = putts.shift();
    if (!s) return;
    phase('prePutt', 0, () => 1);
    commit();
    phase('shot', 0, () => 0.5);
    shot = s;
    golfer = standAt(ball.at, h().cup);
    // The stroke back, then the ball goes as the putter comes through, and it's held there
    // while it rolls. Longer the further it has to go
    lift = 1;
    const k = clamp(0.5 + S.pathLength(s.roll.map((x) => x.p)) / 20, 0.5, 1.6);
    poseSeq([[puttPose(-k), 180], [puttPose(k * 0.8), 160], [puttPose(k * 0.8), 300], [POSES.pAddr, 400]], puttPose(k * 0.8));
    puttAt = gt + (reduce ? 0 : 190);
    window.setTimeout(() => snd.contact('putt'), reduce ? 0 : 190);
  }
  let puttAt = -1;

  // Off the green and on to the next tee, or the clubhouse: the board goes out and the
  // walk takes the whole frame for a scene about the hole just played (scenes.ts), moved on
  // a line at a time by the player. The golfer walks the path unseen too, so a press on
  // the way is marked where it was made
  let cutEnd = -1;
  let walkT0 = -1;
  let walkParts: ReturnType<typeof walkScene> | null = null;
  function startBetween() {
    const path = S.COURSE.walk[hole - 1];
    walkPath = [golfer, ...path.slice(S.dist(golfer, path[0]) < 2 ? 1 : 0)];
    const len = S.pathLength(walkPath);
    walking = true;
    putter = false;
    cutEnd = -1;
    walkBow = false;
    walkU = 0;
    nextTee = 'none';
    clearCaptions();
    cutins.clear(gt);
    pendingRun = null;
    cloud = null;
    walkParts = walkScene(THOUGHTS[thought].name, { hole, went: wentWord(), trouble: trouble[hole - 1], feats: feats[hole - 1] }, voiceRng);
    walkT0 = -1;
    root.dataset.walk = '';
    setMode('between');
    phase('between', len, () => (cutEnd >= 0 ? 1 : walkStage.progress));
  }

  // How the hole just played went, in so many words: never a number
  function wentWord(): Went {
    const n = strokes[hole - 1];
    if (ball.pickedUp || n >= S.PAR[hole] + 2) return 'rough';
    return n <= S.PAR[hole] ? 'well' : 'fine';
  }

  // Onto the next tee: what the walk left. A tell let go by follows you; a catch leaves
  // the head quiet; a moment kept goes with you
  function teeLine() {
    const t = nextTee;
    nextTee = 'none';
    if (t === 'follow') {
      const l = fresh(FOLLOW[THOUGHTS[thought].name] ?? [], S.hash32((round ^ (hole * 0x9e37)) >>> 0) / 4294967296);
      if (l) {
        said.add(l);
        cutins.say({ who: 'you', expr: 'tense', line: l, by: '' }, gt);
      }
    } else if (t === 'caught') cutins.say({ who: 'you', expr: 'settled', line: '…', by: '' }, gt);
    else if (t === 'kept') {
      const l = fresh(KEPT, S.hash32((round ^ (hole * 0x51ed)) >>> 0) / 4294967296);
      if (l) {
        said.add(l);
        cutins.say({ who: 'you', expr: 'settled', line: l, by: '' }, gt);
      }
    }
  }

  function done() {
    commit();
    setMode('done');
    walking = false;
    const f: Finish = { end: clock, holesPlayed: 3, complete: true, bounds: [...bounds] };
    toOverview();
    opts.onFinish(f);
  }

  function toOverview() {
    delete root.dataset.walk;
    clearCaptions();
    cutins.clear(gt);
    pendingRun = null;
    cloud = null;
    setHush(false);
    chips = [];
    paintChips();
    ghost = null;
    four = [];
    focusN = 0;
    hintEl.classList.remove('on');
  }

  // ---------------------------------------------------------------------------------
  // Each frame

  let raf = 0;
  let running = false;
  let walkPh = 0;

  function update() {
    const t = gt - mT;
    switch (mode) {
      case 'intro':
        if (reduce || t >= 900) enterAim();
        break;
      case 'aim': {
        const lit = pipsLit();
        pips.forEach((p, i) => p.classList.toggle('lit', i < lit));
        if (lit >= 3 && !breath && gt - stepT >= 3 * PIP_MS + BREATH_MS) {
          breath = true;
          hush();
          say(sit.nervy ? 'A breath. Steadier.' : 'A breath.');
          if (!reduce) board.burst('puff', golfer, gt);
        }
        // The waggle, while the routine runs
        if (!reduce && !poseTw && lit === 1) pose = Math.floor((gt - stepT - PIP_MS) / 130) & 1 ? POSES.wag : POSES.addr;
        else if (!poseTw && lit >= 2) pose = POSES.addr;
        break;
      }
      case 'swing': {
        // The backswing, driven by the hold: low and slow away, the wrists setting, wound
        // up at the top as the meter gets there, then on past it into the overswing. With
        // less motion it steps: over the ball, halfway, the top
        const held = gt - swingAt;
        if (held >= SW.click) endForSwing();
        const s = Math.max(0, held) / SW.top;
        if (s <= 1) {
          const at = [0, 0.32, 0.66, 1];
          const keys = [POSES.addr, POSES.take, POSES.half, POSES.top];
          const i = s >= at[2] ? 2 : s >= at[1] ? 1 : 0;
          const u = (s - at[i]) / (at[i + 1] - at[i]);
          pose = reduce ? (s < 0.4 ? POSES.addr : s < 0.95 ? POSES.half : POSES.top) : lerpPose(keys[i], keys[i + 1], i === 0 ? u * u : u);
        } else pose = reduce ? POSES.top : lerpPose(POSES.top, POSES.over, clamp((held - SW.top) / (SW.end - SW.top), 0, 1) ** 1.5);
        if (held >= SW.end) swingEnd(true);
        break;
      }
      case 'flight':
        stepTrack();
        break;
      case 'settle':
        if (t >= settleMs) startWalk();
        break;
      case 'walk': {
        const u = clamp(t / walkDur, 0, 1);
        golfer = walkAt(u);
        if (u >= 1) {
          // Stood at the ball, lost in it, until the head's done talking
          walking = false;
          if (waitT0 < 0) waitT0 = gt;
          if ((!pendingRun && !cutins.inRun) || gt - waitT0 > 12000) arriveWalk();
        }
        break;
      }
      case 'putts':
        if (puttAt >= 0) {
          if (gt >= puttAt) {
            puttAt = -1;
            launch();
          }
        } else if (t >= (reduce ? 200 : 650) && putts.length) nextPutt();
        break;
      case 'holed': {
        // The golfer goes to fetch it
        const cup = h().cup;
        if (!walking && t > 200) {
          const o = board.offset(-BALL_DX * face, 0);
          walkPath = [golfer, [cup[0] + o[0], cup[1] + o[1]]];
          walking = true;
        }
        if (walking) golfer = walkAt(clamp((t - 200) / 900, 0, 1));
        if (t >= 1300) startBetween();
        break;
      }
      case 'between': {
        // The golfer along the path, unseen, as far as the scene has got
        walkU += (walkStage.progress - walkU) * 0.05;
        golfer = walkAt(cutEnd >= 0 ? 1 : walkU);
        // The walk in, a beat, then the scene
        if (walkT0 < 0 && t >= (reduce ? 0 : CUT_OUT) + WALK_LEAD && walkParts) {
          walkT0 = gt;
          walkStage.start(walkParts.lead, walkParts.caught, walkParts.missed, gt);
        }
        walkStage.step(gt);
        if (cutEnd >= 0 && gt - cutEnd >= (reduce ? 0 : CUT_OUT)) {
          walking = false;
          walkStage.clear();
          delete root.dataset.walk;
          if (hole < 3) intro((hole + 1) as HoleN);
          else done();
        }
        break;
      }
    }

    // Pose tween, and the next in the queue
    if (poseTw) {
      const u = clamp((gt - poseTw.t0) / poseTw.dur, 0, 1);
      pose = lerpPose(poseTw.from, poseTw.to, easeInOut(u));
      if (u >= 1) {
        const nx = poseQ.shift();
        poseTw = nx ? { from: poseTw.to, to: nx.to, t0: gt, dur: nx.dur } : null;
      }
    }

    // The voices: one waiting for its moment, and the one being said
    if (pendingRun && gt >= pendingRun.at) {
      const pr = pendingRun;
      pendingRun = null;
      if (pr.modes.includes(mode) && spoken < VOICE_BUDGET) {
        spoken++;
        runs++;
        runId++;
        runHole.set(runId, hole);
        cutins.run(runId, pr.cuts, gt);
        if (!cloud) cloud = { t0: gt, doubt: false };
      }
    }
    cutins.step(gt);
    if (cloud && !cutins.showing && gt - cloud.t0 > 1800) cloud = null;

    // Captions: the caddie in their panel, everyone else from where they stand
    if (gt >= capUntil) {
      const next = capQueue.shift();
      caddieEl.classList.remove('on');
      bubbleEl.classList.remove('on');
      bubbleAt = null;
      if (next) {
        if (next.by === 'your caddie') {
          caddieQ.textContent = next.q;
          void caddieEl.offsetWidth;
          caddieEl.classList.add('on');
        } else {
          bubbleQ.textContent = next.q;
          bubbleBy.textContent = next.by;
          bubbleAt = next.by === 'the four-ball behind' && four.length ? four[1] : ROPE[hole - 1][1];
          placeBubble();
          void bubbleEl.offsetWidth;
          bubbleEl.classList.add('on');
        }
        capUntil = gt + next.ms;
      }
    }
  }

  let bubbleKey = '';
  function placeBubble() {
    if (!bubbleAt) return;
    const [x, y] = board.toCss(bubbleAt, 14);
    const w = scene.clientWidth;
    const bw = bubbleEl.offsetWidth || 220;
    // Keep it on the board: a speaker near an edge has the bubble pulled in
    const cx = clamp(x, bw / 2 + 6, w - bw / 2 - 6);
    const key = `${Math.round(cx)}:${Math.round(y)}`;
    if (key === bubbleKey) return;
    bubbleKey = key;
    bubbleEl.style.left = `${Math.round(cx)}px`;
    bubbleEl.style.top = `${Math.round(Math.max(y, 70))}px`;
    bubbleEl.style.setProperty('--tail', `${Math.round(clamp(x - cx, -bw / 2 + 14, bw / 2 - 14))}px`);
  }

  function walkAt(u: number): Vec {
    if (walkPath.length < 2) return walkPath[0] ?? golfer;
    const e = reduce ? u : easeInOut(u) * 0.3 + u * 0.7;
    const total = S.pathLength(walkPath);
    let d = e * total;
    for (let i = 1; i < walkPath.length; i++) {
      const seg = S.dist(walkPath[i - 1], walkPath[i]);
      if (d <= seg || i === walkPath.length - 1) {
        const t = seg ? clamp(d / seg, 0, 1) : 1;
        const a = walkPath[i - 1];
        const b = walkPath[i];
        const dx = board.toPx(b)[0] - board.toPx(a)[0];
        if (Math.abs(dx) >= 1) face = dx < 0 ? -1 : 1;
        return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
      }
      d -= seg;
    }
    return walkPath[walkPath.length - 1];
  }

  function render() {
    // The golfer: over the ball, walking, or stood waiting
    const addr = mode === 'aim' || mode === 'swing' || mode === 'flight' || mode === 'settle' || mode === 'putts';
    const showGolfer = mode !== 'done' && stage() !== 'record';
    if (walking && !reduce) walkPh = Math.floor(gt / 150);
    let st: Golfer;
    if (addr) st = { kind: 'swing', pose: putter && pose === POSES.addr ? POSES.pAddr : pose };
    else st = { kind: 'walk', phase: walking && !reduce ? walkPh : 0, bag: true };
    if (addr && slumped && !poseTw && mode !== 'aim') st = { kind: 'swing', pose: POSES.slump };

    const showBall = mode !== 'idle' && mode !== 'done' && !(ball.done && mode !== 'flight') && stage() === 'round';
    const aiming = mode === 'aim' || mode === 'swing';
    const ghostA = ghost ? (mode === 'walk' ? clamp(1 - (gt - ghostT0) / walkDur, 0, 1) * 0.8 : 0.8) : 0;
    // On the walk the bad one flies again, faintly, as it does in the head
    let ghostBall: { p: Vec; z: number; a: number } | null = null;
    if (ghost && mode === 'walk' && !reduce && ghostA > 0.1) {
      const u = ((gt - ghostT0) % 1500) / 1100;
      if (u <= 1) {
        const at = byIndex(ghost.map((x, i) => ({ ...x, s: i })), u);
        ghostBall = { p: at.p, z: at.z, a: ghostA * 0.8 };
      }
    }
    // The wind across the screen, for the flags and the streaks over the course
    const wx = Math.cos(wind.ang);
    const wy = Math.sin(wind.ang);
    const sx = (wy + wx) * view.a;
    const sy = ((wy - wx) * view.a) / 2;
    const sl = Math.hypot(sx, sy) || 1;
    const live = stage() === 'round' && mode !== 'idle' && mode !== 'done';
    const wLevel = live ? wind.level : 1;

    board.draw({
      now: gt,
      reduce,
      live: stage() === 'round' ? hole : 0,
      golfer: showGolfer && stage() !== 'choose' ? { p: golfer, face, st, bag: addr } : stage() === 'choose' ? { p: golfer, face, st: { kind: 'walk', phase: 0, bag: true }, bag: false } : null,
      ball: showBall ? { p: bp, z: bz, o: bo, sunk: sunk || (mode !== 'flight' && ball.lie === 'bunker'), tuft: mode !== 'flight' && ball.lie === 'rough', trail: trace } : stage() === 'choose' ? { p: S.holeDef(1).tee, z: 0, o: 1, sunk: false, tuft: false, trail: [] } : null,
      aim: aiming ? { from: ball.at, to: aim, dim: mode === 'swing', reduce, pattern: patternNow(), ink: inkT0 >= 0 ? (reduce ? 1 : clamp((gt - inkT0) / 260, 0, 1)) : 0 } : null,
      chips: aiming ? chips.map((c, i) => ({ at: c.at, on: i === onChip })) : [],
      ghost: ghost && ghostA > 0 ? { pts: ghost, alpha: ghostA } : null,
      four,
      party: partyAt(),
      heronT,
      galleryBob,
      record,
      hush: hushLevel(),
      dusk: duskLevel(),
      wind: { dir: live ? (sx >= 0 ? 1 : -1) : 1, level: wLevel, dx: live ? sx / sl : -0.8, dy: live ? sy / sl : 0.6, swirl: live && hole === 2 },
      cloud: live ? cloud : null,
      ghostBall,
      veil: veilLevel(),
      cut: cutFrame(),
    });

    chipsEl.classList.toggle('on', aiming);
    if (aiming) placeChips();
    if (bubbleAt && board.panning) placeBubble();
    renderMeter();
  }

  // Your partner, off to the side of the tee and a little back, until you've played from it
  function partyAt(): Vec[] {
    if (stage() !== 'round' || swings > 0 || !['intro', 'aim', 'swing', 'flight', 'settle'].includes(mode)) return [];
    const tee = h().tee;
    const back = angOf(S.defaultAim(S.startHole(hole)), tee);
    return [toward(toward(tee, back, 6), back - Math.PI / 2, 11)];
  }

  // The board going out between holes, and the walk coming in and going out in its place
  function veilLevel() {
    if (mode !== 'between' || reduce) return 0;
    const t = gt - mT;
    if (t < CUT_OUT) return t / CUT_OUT;
    if (cutEnd >= 0) return clamp((gt - cutEnd) / CUT_OUT, 0, 1);
    return clamp(1 - (t - CUT_OUT) / 300, 0, 1);
  }
  function cutFrame() {
    if (mode !== 'between') return null;
    const t = gt - mT;
    if (!reduce && t < CUT_OUT) return null;
    const u = reduce ? 0.55 : clamp(walkU * 1.1, 0, 1);
    const sp = walkStage.speaker;
    // The walking golfer stays out of the frame while a portrait is up, or you'd be in
    // two places at once; the rope's lines keep them
    const f = { u, n: hole < 3 ? hole + 1 : 0, walking: !reduce && cutEnd < 0, bow: walkBow, cloud: null, top: false, golfer: !sp || sp.who === 'rope' };
    const [shx, shy] = walkStage.shake(gt);
    const flash = walkStage.flash(gt);
    const shout = walkStage.shout(gt);
    return (g: CanvasRenderingContext2D, w: number, hh: number) => {
      g.save();
      g.translate(shx, shy);
      walk.draw(g, w, hh, f, gt, reduce);
      const anchor = sp ? drawStage(g, w, hh, sp) : null;
      g.restore();
      if (shout) drawShout(g, w, hh, shout.word, shout.t, reduce, anchor);
      if (flash > 0) {
        g.fillStyle = `rgba(255,252,240,${flash.toFixed(3)})`;
        g.fillRect(0, 0, w, hh);
      }
    };
  }

  // The stage: one speaker at a time, from the waist up, over the walk dimmed behind them;
  // you a little left looking in, the others a little right looking back. A cut, not a
  // slide, between speakers. They breathe, a pixel up and down; they blink now and then;
  // their mouth goes shut, half, open while their words come; their pose has a second
  // frame that comes and goes (a tap of the finger, a bob, a jitter). The rope is heard
  // from the edge of the frame, a gallery in silhouette against the light. The box at the
  // foot covers the waist, whatever the width. Gives back where the speaker's head is,
  // for the shout to sit beside
  const dialogueEl = q('[data-dialogue]');
  // How far up from the plate's foot the box cuts a portrait, in the plate's pixels: across
  // the chest
  const CHEST = 20;
  function drawStage(g: CanvasRenderingContext2D, w: number, hh: number, sp: { who: string; face: 'normal' | 'pleased' | 'shocked' | 'thinking'; talking: boolean; t0: number }): ShoutAnchor | null {
    // The walk dimmed to dusk behind the speaker
    g.fillStyle = 'rgba(40,30,52,0.56)';
    g.fillRect(0, 0, w, hh);
    if (sp.who === 'rope') {
      drawGallery(g, w, hh, sp.t0);
      return null;
    }
    const who = sp.who as 'you' | 'caddie' | 'partner';
    const you = who === 'you';
    const still = reduce;
    const t = gt - sp.t0;
    const blink = !still && (gt + (you ? 0 : 1300)) % 3400 < 140;
    const beat = Math.floor(t / 90) % 4;
    const mouth = still || !sp.talking ? 0 : ([1, 2, 1, 0] as const)[beat];
    // The shout's face holds through the burst and a beat after, then lands through a
    // frame of the caught-out face before the line's own, rather than a hard cut
    const age = you ? walkStage.shoutAge(gt) : -1;
    const landing = age >= SHOUT_HOLD + 700 && age < SHOUT_HOLD + 950;
    const face: CastFace = age >= 0 && age < SHOUT_HOLD + 700 ? 'shout' : landing ? 'shocked' : sp.face;
    // The pose's second frame: a jitter while caught out, a tap now and then while
    // thinking, a bob while pleased, the arm thrust out as the shout lands
    let frame: 0 | 1 = 0;
    if (!still) {
      if (face === 'shout' || landing) frame = 1;
      else if (face === 'shocked') frame = t < 800 && Math.floor(t / 110) % 2 ? 1 : 0;
      else if (face === 'thinking') frame = t % 900 < 200 ? 1 : 0;
      else if (face === 'pleased') frame = t % 1200 < 300 ? 1 : 0;
    }
    const fig = portraitFrame(who, face, frame, blink, mouth, !you);
    const breathe = still ? 0 : Math.floor(gt / 1100) % 2;
    // Head and shoulders: the box's top edge across the chest, the head clear of the
    // frame's top
    const boxTop = dialogueEl.offsetTop / scale;
    const x = Math.round(w / 2 - FIG_W / 2 + (you ? -1 : 1) * Math.min(w * 0.17, 68));
    const y = Math.max(-40, Math.round(Math.min(boxTop, hh) + CHEST - FIG_H)) + breathe;
    const hb = headBox(who, !you);
    const head: [number, number, number, number] = [x + hb.x, y + hb.y, x + hb.x + hb.w, y + hb.y + hb.h];
    g.imageSmoothingEnabled = false;
    g.drawImage(fig, x, y);
    return { head, waist: Math.round(Math.min(boxTop, hh)) };
  }

  // The gallery at the rope: three of them in silhouette against the low sun (cast.ts),
  // near, in the left third of the frame with the box over their feet, so their heads
  // break the horizon. The one in the cap leans in as the line lands. The rope runs in
  // front of them at waist height across the left third on its posts, the rail catching
  // the sun
  function drawGallery(g: CanvasRenderingContext2D, w: number, hh: number, t0: number) {
    const t = gt - t0;
    const lean = !reduce && t < 450 ? 1 : 0;
    const base = Math.min(Math.round(dialogueEl.offsetTop / scale) + 10, hh);
    const wide = w >= 300;
    const [bobble, cap, scarf] = galleryFigures();
    g.imageSmoothingEnabled = false;
    g.drawImage(bobble, 2, base - bobble.height);
    g.drawImage(cap, (wide ? 22 : 14) + lean, base - cap.height - lean);
    g.drawImage(scarf, wide ? 58 : 40, base - scarf.height);
    // The rope: posts every so far across the left third, the rail sagging a pixel
    // between them, its top edge in the sun
    const end = Math.round(w / 3) + 16;
    const ry = base - 38;
    for (let x = 6; x < end; x += 44) {
      g.fillStyle = '#1c1424';
      g.fillRect(x, ry - 5, 3, base - ry + 5);
      g.fillStyle = '#6e4c66';
      g.fillRect(x + 2, ry - 5, 1, 7);
      g.fillStyle = '#c09aac';
      g.fillRect(x, ry - 5, 3, 1);
    }
    for (let x = 0; x < end; x++) {
      const u = ((x - 6) % 44) / 44;
      const sag = Math.round(Math.sin(Math.PI * u) * 1.5);
      g.fillStyle = '#c09aac';
      g.fillRect(x, ry + sag, 1, 1);
      g.fillStyle = '#1c1424';
      g.fillRect(x, ry + sag + 1, 1, 1);
    }
  }

  function renderMeter() {
    const live = mode === 'aim' || mode === 'swing' || mode === 'flight' || mode === 'settle';
    meterEl.classList.toggle('dim', !(mode === 'aim' || mode === 'swing'));
    const nervy = sit.nervy && !breath;
    const k = mode === 'aim' || mode === 'swing' ? liveDiff().k : diff.k;
    paintBands(k);
    meterEl.classList.toggle('jag', nervy && mode === 'swing' && !reduce);
    let held = 0;
    if (mode === 'swing') held = gt - swingAt;
    else if (live && relMs >= 0) held = relMs;
    fillEl.style.width = pct(held);
    fillEl.classList.toggle('over', held > SW.top);
    markEl.style.left = pct(relMs);
    markEl.classList.toggle('on', relMs >= 0 && mode !== 'swing');
  }

  // The screenshot bot reads what each frame cost
  const costs: number[] = [];
  const timed = new URLSearchParams(location.search).has('ot-seed');
  function loop(real: number) {
    const dtMs = Math.min(32, Math.max(0, real - lastReal));
    lastReal = real;
    const dt = real < freezeUntil ? 0 : dtMs;
    gt += dt;
    const t0 = timed ? performance.now() : 0;
    update();
    render();
    if (timed) {
      costs.push(performance.now() - t0);
      if (costs.length > 600) costs.shift();
    }
    raf = requestAnimationFrame(loop);
  }
  function start() {
    if (running) return;
    running = true;
    lastReal = performance.now();
    raf = requestAnimationFrame(loop);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  // ---------------------------------------------------------------------------------
  // Hints, for the first few shots

  function hint() {
    const show = fullShots < 3 && (mode === 'aim' || mode === 'swing');
    hintEl.classList.toggle('on', show);
    clubText();
    if (!show) return;
    const k = lastInputKind;
    if (stepped) hintEl.textContent = k === 'key' ? 'hold space · let go in the gold · esc steps off' : small ? 'hold · let go in the gold' : 'hold anywhere · let go in the gold · esc steps off';
    else if (k === 'key') hintEl.textContent = 'arrows to aim · c for a club · enter to step in';
    else if (small) hintEl.textContent = `${k === 'touch' ? 'tap' : 'click'} a spot · then step in`;
    else hintEl.textContent = `${k === 'touch' ? 'tap' : 'click'} where you want it · c for a club · step in`;
  }

  // ---------------------------------------------------------------------------------
  // Input: the course is the swing; the Flic is somewhere else entirely

  let pointerId = -1;
  let keyHeld = false;
  let dragging = false;

  function thump() {
    if (mode !== 'walk') return;
    say('A thump.');
    if (reduce) return;
    board.burst('turf', golfer, gt);
  }

  function skip() {
    switch (mode) {
      case 'intro':
        enterAim();
        return true;
      case 'walk':
        golfer = walkPath[walkPath.length - 1];
        arriveWalk();
        return true;
      case 'between':
        // The walk is never skipped: a press there is the Flic's
        return false;
    }
    return false;
  }

  const onGolfer = (cx: number, cy: number) => {
    const r = cv.getBoundingClientRect();
    const [gx, gy] = board.toCss(golfer);
    return Math.abs(cx - r.left - gx) < 7 * scale && cy - r.top < gy + scale && cy - r.top > gy - 19 * scale;
  };

  scene.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || mode === 'idle' || mode === 'done') return;
    // On the walk a press on the scene moves the dialogue on. Never the Flic's job
    if (mode === 'between') {
      e.preventDefault();
      if (!(e.target as Element).closest('button')) walkStage.advance(gt);
      return;
    }
    // A voice being said: off the ball, a press puts it away and nothing else
    if (cutins.showing && mode !== 'aim' && mode !== 'swing') {
      cutins.skip(gt);
      e.preventDefault();
      return;
    }
    const target = e.target as Element;
    lastInputKind = e.pointerType === 'touch' ? 'touch' : 'mouse';
    const chip = target.closest<HTMLElement>('[data-chip]');
    if (mode === 'aim' && chip) {
      setAim(chips[Number(chip.dataset.chip)].at, 'chip');
      e.preventDefault();
      return;
    }
    if (target.closest('button')) return;
    if (mode === 'walk' && onGolfer(e.clientX, e.clientY)) {
      thump();
      return;
    }
    if (mode === 'aim') {
      e.preventDefault();
      pointerId = e.pointerId;
      try {
        scene.setPointerCapture(e.pointerId);
      } catch {
        /* a synthetic pointer can't be captured */
      }
      // Over the ball a press is the swing; behind it, a press puts the target down and a
      // drag moves it
      if (stepped) swingStart();
      else {
        dragging = true;
        const p = pick(e.clientX, e.clientY);
        if (p) setAim(p, 'click');
      }
      return;
    }
    skip();
  });
  scene.addEventListener('pointermove', (e) => {
    if (!dragging || e.pointerId !== pointerId || mode !== 'aim' || stepped) return;
    const p = pick(e.clientX, e.clientY);
    if (p) setAim(p, 'drag');
  });
  scene.addEventListener('pointerup', (e) => {
    if (e.pointerId !== pointerId) return;
    pointerId = -1;
    if (dragging) {
      dragging = false;
      if (mode === 'aim') say(`Aiming at ${aimWords()}, ${S.CLUBS[club].tag}.`);
    }
    if (mode === 'swing' && !keyHeld) swingEnd();
  });
  scene.addEventListener('pointercancel', (e) => {
    if (e.pointerId !== pointerId) return;
    pointerId = -1;
    dragging = false;
    // A cancelled press is never a swing: back to aiming
    if (mode === 'swing' && !keyHeld) {
      pose = POSES.addr;
      setMode('aim');
    }
  });

  scene.addEventListener('keydown', (e) => {
    if (mode === 'idle' || mode === 'done') return;
    const onButton = (e.target as Element).closest('button');
    const k = e.key;
    if (k === ' ' || k === 'Enter') {
      if (onButton) return;
      e.preventDefault();
      if (e.repeat) return;
      lastInputKind = 'key';
      if (mode === 'aim' && !stepped) stepIn();
      else if (mode === 'aim') {
        keyHeld = true;
        swingStart();
      } else if (mode === 'between') walkStage.advance(gt);
      else if (cutins.showing) cutins.skip(gt);
      else skip();
    } else if (k === 'Escape') {
      if (mode === 'aim' && stepped) {
        e.preventDefault();
        stepOff();
      }
    } else if (k === 'c' || k === 'C') {
      lastInputKind = 'key';
      cycleClub(e.shiftKey ? -1 : 1);
    } else if (k.startsWith('Arrow')) {
      if (mode !== 'aim' || stepped) return;
      e.preventDefault();
      lastInputKind = 'key';
      const a = angOf(ball.at, aim);
      const d = S.dist(ball.at, aim);
      const turn = (k === 'ArrowLeft' ? -1 : k === 'ArrowRight' ? 1 : 0) * 3 * DEG;
      const longer = (k === 'ArrowUp' ? 1 : k === 'ArrowDown' ? -1 : 0) * 6;
      // A turn snaps to a target within a few degrees of it
      let p = toward(ball.at, a + turn, Math.max(6, d + longer));
      if (turn) {
        for (const c of chips) if (Math.abs(Math.atan2(Math.sin(angOf(ball.at, c.at) - a - turn), Math.cos(angOf(ball.at, c.at) - a - turn))) < 4 * DEG) p = c.at;
      }
      setAim(p, 'key');
      hint();
    } else if (k === 't' || k === 'T') {
      thump();
    }
  });
  scene.addEventListener('keyup', (e) => {
    if ((e.key === ' ' || e.key === 'Enter') && keyHeld) {
      keyHeld = false;
      if (mode === 'swing') swingEnd();
    }
  });
  // The meter's buttons sit outside the scene; focus goes back to it after either, so space,
  // Escape and C carry on working from there
  clubEl.addEventListener('click', (e) => {
    lastInputKind = (e as PointerEvent).pointerType === 'touch' ? 'touch' : 'mouse';
    cycleClub();
    scene.focus({ preventScroll: true });
  });
  stepEl.addEventListener('click', () => {
    if (stepped) stepOff();
    else stepIn();
    scene.focus({ preventScroll: true });
  });
  srAim.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-sr-chip]');
    if (b && mode === 'aim') setAim(chips[Number(b.dataset.srChip)].at, 'chip');
  });

  // Run only while the band is on screen
  let lastW = 0;
  const ro = new ResizeObserver(() => {
    if (scene.clientWidth === lastW) return;
    lastW = scene.clientWidth;
    layout(false);
  });
  ro.observe(scene);
  let onScreen = false;
  let active = true;
  const sync = () => (onScreen && active ? start() : stop());
  const io = new IntersectionObserver((es) => {
    onScreen = es.some((x) => x.isIntersecting);
    sync();
  });
  io.observe(root);
  layout(false);
  golfer = standAt(ball.at, S.defaultAim(ball));
  render();

  // A read-only window for the screenshot bot, only with a fixed seed in the address
  if (new URLSearchParams(location.search).has('ot-seed')) {
    const toClient = (p: Vec) => {
      const r = cv.getBoundingClientRect();
      const [x, y] = board.toCss(p);
      return [r.left + x, r.top + y];
    };
    (window as unknown as { __ot: unknown }).__ot = {
      mode: () => mode,
      hole: () => hole,
      putt: () => isPutt(),
      strokes: () => [...strokes],
      lie: () => ball.lie,
      ball: () => [...ball.at],
      aim: () => [...aim],
      grade: () => shot?.grade ?? null,
      events: () => [...(shot?.events ?? [])],
      chips: () => chips.map((c) => ({ name: c.name, at: [...c.at] })),
      toClient,
      cup: () => toClient(h().cup),
      golfer: () => toClient(golfer),
      view: () => ({ origin: board.origin, ...board.size }),
      k: () => liveDiff().k,
      spread: () => (mode === 'aim' ? liveDiff().spread : diff.spread),
      wind: () => ({ ...wind }),
      doubt: () => doubt,
      stepped: () => stepped,
      club: () => club,
      voice: () => cutins.line,
      catchUp: () => cutins.catchUp,
      momentUp: () => cutins.momentUp,
      who: () => cutins.face?.who ?? '',
      scene: () => {
        const b = walkStage.current;
        return b ? { who: b.who, text: b.text, key: !!b.key, moment: !!b.moment, done: q('[data-dialogue]').classList.contains('done') } : null;
      },
      inRun: () => cutins.inRun,
      setAimAt: (p: Vec) => setAim(p, 'click'),
      costs: () => costs.splice(0),
    };
  }

  // ---------------------------------------------------------------------------------
  // The page's handle on the game

  return {
    begin,
    layout: () => layout(true),
    /** Draw only while the board can be seen: not under the sealed scene */
    setActive(v: boolean) {
      active = v;
      sync();
    },
    /** The light going, before the round is sealed */
    dusk(on: boolean, ms = 700) {
      dusk = { on, t0: gt, ms: reduce ? 1 : ms };
    },
    get mode() {
      return mode;
    },
    /** The pocket button, gone down: the line up now is the one its tap or hold answers */
    armLine() {
      armed = stage() !== 'round' ? null : mode === 'between' ? walkStage.current : cutins.current;
    },
    /** The pocket button, tapped: whether it caught the line that was up as it went down.
     *  The story only: nothing here reaches a shot */
    catchLine(): boolean {
      if (stage() !== 'round' || mode === 'idle' || mode === 'done') return false;
      const a = armed;
      armed = null;
      const name = THOUGHTS[thought].name;
      if (mode === 'between') {
        if (!walkStage.catchNow(a as Beat | null, SHOUT[name] ?? 'Got me!', gt)) return false;
        walkBow = false;
      } else if (!cutins.catchNow(gt, a as Cut | null, STAMP[name] ?? 'caught')) return false;
      cloud = null;
      say(SHOUT[name] ?? 'Caught.');
      return true;
    },
    /** The pocket button, held: whether it kept the moment the inner voice is on. The
     *  story only, like a catch */
    keepLine(): boolean {
      if (stage() !== 'round' || mode === 'idle' || mode === 'done') return false;
      const a = armed;
      armed = null;
      if (mode === 'between') {
        if (!walkStage.keepNow(a as Beat | null, gt)) return false;
        if (nextTee === 'none') nextTee = 'kept';
      } else if (!cutins.keepNow(gt, a as Cut | null)) return false;
      say('Kept.');
      return true;
    },
    /** A tap behind the ball, carrying Commit to the Line: `moved` is called if the line is
     *  changed after it, before the swing. Nothing else hears of it */
    watchLine(moved: () => void) {
      lineWatch = mode === 'aim' && !stepped && THOUGHTS[thought].name === 'Commit to the Line' ? moved : null;
      if (lineWatch && inkT0 < 0) inkT0 = gt;
    },
    /** Where and when a press fell, for the record */
    stamp(): Press {
      return { t: nowT(), hole, at: [golfer[0], golfer[1]], over: OVER.has(mode) };
    },
    /** End the round early: only the holes started count */
    end(): Finish {
      commit();
      const f: Finish = { end: clock, holesPlayed: hole, complete: false, bounds: [...bounds] };
      clearShot();
      setMode('done');
      walking = false;
      toOverview();
      return f;
    },
    /** The round over: every shot's line up each hole, then every press where it was made */
    reveal(taps: Press[], moments: Press[]) {
      const marks = [...taps.map((x) => ({ ...x, moment: false })), ...moments.map((x) => ({ ...x, moment: true }))]
        .sort((a, b) => a.t - b.t)
        .map((x) => ({ at: x.at as Vec, moment: x.moment, over: x.over }));
      record = { t0: gt, reduce, trails: [...trails], marks, patterns: [...patterns] };
    },
    reset() {
      setMode('idle');
      hole = 1;
      ball = S.startHole(1);
      golfer = standAt(ball.at, S.defaultAim(ball));
      bp = ball.at;
      bz = 0;
      bo = 1;
      walking = false;
      putter = false;
      slumped = false;
      record = null;
      heronT = -1;
      trails = [];
      patterns = [];
      clearShot();
      dusk = { on: false, t0: -1e9, ms: 1 };
      board.clearFx();
      toOverview();
    },
  };
}
