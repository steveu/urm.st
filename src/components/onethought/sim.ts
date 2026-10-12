// The three holes, and the golf they play. Pure: no DOM, no clock, no Math.random. The
// same ball, swing and seed always give the same shot, so a round can be replayed and
// tested. Course units throughout: the plate is 600 by 260, and one unit is 1.8 yards.
// Yards are never shown. Nothing here is a real course.
//
// The Flic never reaches this file. A press is recorded by the page; it can't touch a
// shot.

import type { Mapping } from './read';

export type Vec = readonly [number, number];
export type Surface = 'tee' | 'fairway' | 'fringe' | 'green' | 'rough' | 'bunker' | 'trees' | 'water' | 'out';
export type ClubId = 'driver' | 'wood' | 'iron' | 'wedge' | 'putter';
export type Ellipse = { c: Vec; rx: number; ry: number };
export type Capsule = { pts: Vec[]; r: number };
export type Tree = { c: Vec; r: number; h: number };
export type Line = { name: string; at: Vec };
export type HoleDef = {
  n: 1 | 2 | 3;
  name: string;
  par: 3 | 4 | 5;
  tee: Vec;
  fairway: Capsule | null;
  green: Ellipse;
  cup: Vec;
  fat: Vec;
  bunkers: Ellipse[];
  water: (Ellipse | Capsule)[];
  trees: Tree[];
  lines?: { stroke: number; when?: (b: Ball) => boolean; options: [Line, Line]; caddie: string };
  frame: [number, number, number, number];
};

export const YD = 1.8 as const;
export const W = 600;
export const H = 260;
export const PAR: Record<1 | 2 | 3, number> = { 1: 4, 2: 3, 3: 5 };

export type FullClub = Exclude<ClubId, 'putter'>;
export const CLUBS: Record<FullClub, { tag: string; max: number; errDeg: number; apex: number; roll: number }> = {
  driver: { tag: 'driver', max: 125, errDeg: 10, apex: 22, roll: 0.18 },
  wood: { tag: 'three wood', max: 108, errDeg: 9, apex: 20, roll: 0.12 },
  iron: { tag: 'seven iron', max: 80, errDeg: 8, apex: 26, roll: 0.08 },
  wedge: { tag: 'wedge', max: 52, errDeg: 6, apex: 32, roll: 0.03 },
};

/** The swing, one gesture: hold and the meter climbs to the top in TOP ms, then on into
 *  the overswing until it lets go by itself at END. The sweet spot is CENTRE; a release
 *  within GOOD of it is a good one, within PURE a pure one. A press shorter than CLICK
 *  isn't a swing at all, it's a click to aim. Distance never comes from the release:
 *  it comes from where you aimed. The release only adds error. */
export const SWING = { top: 1100, centre: 1000, end: 1450, click: 200, good: 120, pure: 40, fat: 320 } as const;

/** The swing as long as the shot: SWING above is the yardstick, and a swing is that, scaled
 *  so it takes TOP ms to get to the top. The sweet spot sits at the same share of it, and
 *  the windows scale with it, so the meter reads the same at any length; the club's WINDOW
 *  then loosens or tightens them a touch. CLICK is a press too quick to be a swing. */
export type Tempo = { top: number; centre: number; end: number; click: number; good: number; pure: number; fat: number };
// To the top on a full swing, by club, in ms. A shot asks for its share of the club's
// reach, and the swing shrinks towards a chip as the share does, never below TEMPO_MIN
export const TEMPO_FULL: Record<FullClub, number> = { driver: 1300, wood: 1220, iron: 1080, wedge: 900 };
export const TEMPO_MIN = 420;
// How much of the full swing even the shortest shot keeps, before TEMPO_MIN
const TEMPO_FLOOR = 0.4;
// The windows by club: the driver's a touch tighter, the wedge's a touch wider
export const WINDOW: Record<FullClub, number> = { driver: 0.9, wood: 0.95, iron: 1, wedge: 1.1 };

/** The swing for a club and a shot asking `share` of what the club goes at most */
export function tempo(club: FullClub, share: number): Tempo {
  const u = Math.max(0, Math.min(1, share));
  const top = Math.max(TEMPO_MIN, TEMPO_FULL[club] * (TEMPO_FLOOR + (1 - TEMPO_FLOOR) * u));
  const s = top / SWING.top;
  const w = s * WINDOW[club];
  const centre = SWING.centre * s;
  return {
    top,
    centre,
    end: SWING.end * s,
    // Never more than under half the way to the sweet spot, so a chip's still a swing
    click: Math.min(SWING.click, 0.45 * centre),
    good: SWING.good * w,
    pure: SWING.pure * w,
    fat: SWING.fat * w,
  };
}
/** The yardstick swing, as a tempo: the full swing as it was before swings had lengths */
export const TEMPO_STD: Tempo = { ...SWING };

// Tuning, checked against bots that let go with human jitter (scratchpad simcheck).
// Degrees of plain scatter on a full shot, by strike: a pure one goes where it's aimed
const LATERAL_SD: Record<Grade, number> = { pure: 0.8, good: 2.4, early: 3.2, late: 3.2, fat: 3.5, flail: 3 };
// The most the lie can tighten the swing's window
const K_MAX = 1.6;
// What each lie tightens it by
export const TIGHT = { rough: 1.15, bunker: 1.2, trees: 1.15 } as const;
// The mind widens the pattern instead, and the pattern is drawn, so it's never a secret.
// The routine, by how many of its three beats were let run: none, one, two, all
export const ROUTINE = [1.6, 1.4, 1.2, 1] as const;
// And the rest of the moment: nerves (water near, or the rope), a changed mind, a breath
export const WIDEN = { nerves: 1.35, doubt: 1.25, breath: 0.85 } as const;
const SPREAD_MAX = 2.4;
// The pattern drawn is where most good strikes land: this many deviations out
const PATTERN_SD = 2;
// A shot aimed this close to water, or across it, is a nervy one
const NERVY_NEAR = 8;
// The least scatter a full-swing shot has, in course units, however short it is
const SHORT_FLOOR = 2.4;
const CHIP_IN = 0.35; // how close a rolling ball must pass the cup
const CHIP_ROLL = 2; // and how little roll it may have left

const LONGEST_FIRST: FullClub[] = ['driver', 'wood', 'iron', 'wedge'];
const SHORTEST_FIRST: FullClub[] = ['wedge', 'iron', 'wood', 'driver'];

// ---------------------------------------------------------------------------------------
// The course: three holes in a low corner of the land, where a creek comes out of a pond
// and wanders off. The long fourth falls left to a green with the pond short of it, the
// short third crosses the creek to a wide shallow green, and the fifth bends left with
// the creek down its left side and across the front of its green.

const tree = (x: number, y: number, r = 5, h = 20): Tree => ({ c: [x, y], r, h });

// The pond by the first green, and the creek out of it: in front of the second green,
// down the left of the third and across the front of its green, then off the table
const POND: Ellipse = { c: [103, 103], rx: 10, ry: 12 };
const CREEK: Capsule = {
  pts: [[106, 94], [114, 82], [150, 80], [172, 86], [204, 84], [230, 92], [260, 102], [310, 110], [380, 116], [444, 114], [476, 104], [486, 84], [492, 60], [498, 0]],
  r: 4,
};

export const TUCKED = "Flag's tucked. Plenty of green the other side.";

const HOLES: HoleDef[] = [
  {
    n: 1,
    name: 'The Slope',
    par: 4,
    tee: [36, 244],
    fairway: { pts: [[36, 244], [80, 208], [108, 178], [118, 150], [122, 122]], r: 14 },
    green: { c: [126, 98], rx: 13, ry: 10 },
    // Front left, by the pond
    cup: [117, 104],
    fat: [130, 99],
    bunkers: [{ c: [140, 87], rx: 5, ry: 3.5 }],
    water: [POND, CREEK],
    trees: [tree(56, 198), tree(80, 172), tree(96, 150), tree(140, 196), tree(146, 166)],
    lines: {
      stroke: 1,
      options: [
        { name: 'the corner', at: [104, 170] },
        { name: 'out right', at: [117, 186] },
      ],
      caddie: 'Cut the corner, or out right and a longer one in. Your call.',
    },
    frame: [14, 70, 170, 256],
  },
  {
    n: 2,
    name: 'The Bank',
    par: 3,
    tee: [178, 132],
    fairway: null,
    // Wide and shallow, across the line of play, over the creek
    green: { c: [190, 70], rx: 15, ry: 6 },
    // Front right, just over the creek: short is wet
    cup: [201, 73.5],
    fat: [191, 69],
    bunkers: [
      { c: [180, 78], rx: 4, ry: 1.8 },
      { c: [178, 62], rx: 5, ry: 2.4 },
      { c: [202, 62], rx: 5, ry: 2.4 },
    ],
    water: [CREEK, POND],
    trees: [tree(158, 50), tree(228, 54)],
    frame: [156, 40, 228, 142],
  },
  {
    n: 3,
    name: 'The Bend',
    par: 5,
    tee: [286, 138],
    fairway: { pts: [[286, 138], [330, 146], [372, 149], [410, 141], [438, 126]], r: 12 },
    green: { c: [508, 78], rx: 13, ry: 9 },
    cup: [500, 82],
    fat: [510, 77],
    bunkers: [
      { c: [518, 65], rx: 6, ry: 3 },
      { c: [524, 89], rx: 4, ry: 3.5 },
      { c: [384, 166], rx: 7, ry: 4 },
    ],
    water: [CREEK],
    trees: [tree(346, 127, 4, 18), tree(330, 170), tree(410, 172), tree(456, 152)],
    lines: {
      stroke: 2,
      when: (b) => b.lie === 'fairway' && b.at[0] < 436,
      options: [
        { name: 'lay up', at: [428, 134] },
        { name: 'take it on', at: [506, 79] },
      ],
      caddie: 'Lay up short of the creek, or take it on.',
    },
    frame: [272, 54, 536, 184],
  },
];

export const COURSE: {
  holes: HoleDef[];
  water: (Ellipse | Capsule)[];
  creek: Capsule;
  decor: Vec[];
  pines: Vec[];
  blooms: Vec[];
  bridge: Vec;
  gallery: Vec[];
  heron: Vec;
  terrace: Vec;
  walk: Vec[][];
} = {
  holes: HOLES,
  // Every body of water once, for drawing; the holes list what's in play on each
  water: [POND, CREEK],
  creek: CREEK,
  decor: [[20, 120], [60, 40], [250, 30], [330, 40], [420, 40], [560, 24], [580, 96], [584, 160], [520, 230], [440, 236], [360, 240], [290, 214], [230, 236], [150, 250], [240, 180]],
  // Pines, tall and dark, lining the holes; they don't take a ball
  pines: [[30, 200], [44, 160], [62, 124], [84, 84], [168, 36], [224, 38], [250, 54], [310, 86], [400, 96], [540, 50], [560, 124], [480, 172]],
  // Flowering bushes on the bank behind the short hole's green, and a pair by the last
  blooms: [[166, 57], [175, 53], [185, 51], [195, 51], [205, 52], [214, 55], [222, 60], [532, 60], [536, 94]],
  // A small stone footbridge where the walk to the last tee crosses the creek
  bridge: [212, 86.5],
  gallery: [[196, 146], [204, 150], [212, 147]],
  heron: [92, 114],
  terrace: [548, 168],
  // Green to the next tee, and the last green to the terrace
  walk: [
    [[126, 98], [150, 118], [178, 132]],
    [[190, 70], [206, 78], [212, 86.5], [240, 116], [286, 138]],
    [[508, 78], [530, 110], [546, 146], [548, 168]],
  ],
};

export const holeDef = (n: number): HoleDef => HOLES[n - 1];

// ---------------------------------------------------------------------------------------
// Geometry

export const dist = (a: Vec, b: Vec) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const angleOf = (a: Vec, b: Vec) => Math.atan2(b[1] - a[1], b[0] - a[0]);
const toward = (p: Vec, ang: number, d: number): Vec => [p[0] + Math.cos(ang) * d, p[1] + Math.sin(ang) * d];
const RAD = Math.PI / 180;

export function pathLength(pts: readonly Vec[]) {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += dist(pts[i - 1], pts[i]);
  return s;
}

function segDist(p: Vec, a: Vec, b: Vec) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

const inEllipse = (e: Ellipse, p: Vec, grow = 0) =>
  ((p[0] - e.c[0]) / (e.rx + grow)) ** 2 + ((p[1] - e.c[1]) / (e.ry + grow)) ** 2 <= 1;

function inCapsule(c: Capsule, p: Vec) {
  for (let i = 1; i < c.pts.length; i++) if (segDist(p, c.pts[i - 1], c.pts[i]) <= c.r) return true;
  return false;
}

const isCapsule = (w: Ellipse | Capsule): w is Capsule => 'pts' in w;
const inShape = (w: Ellipse | Capsule, p: Vec) => (isCapsule(w) ? inCapsule(w, p) : inEllipse(w, p));

const INSET = 2;
const onPlate = (p: Vec) => p[0] >= INSET && p[0] <= W - INSET && p[1] >= INSET && p[1] <= H - INSET;

const ALL_TREES: Tree[] = HOLES.flatMap((h) => h.trees);
const ALL_BUNKERS: Ellipse[] = HOLES.flatMap((h) => h.bunkers);
const TEE_BOX = 6;

const inWater = (p: Vec) => COURSE.water.some((w) => inShape(w, p));

/** The ground under a point, for hole h. Trees are never returned: a tree lie comes only from hitting one */
export function surfaceAt(h: HoleDef, p: Vec): Surface {
  if (!onPlate(p)) return 'out';
  if (inWater(p)) return 'water';
  if (ALL_BUNKERS.some((b) => inEllipse(b, p))) return 'bunker';
  if (inEllipse(h.green, p)) return 'green';
  if (inEllipse(h.green, p, 4)) return 'fringe';
  if (dist(p, h.tee) <= TEE_BOX) return 'tee';
  // Another hole's short grass plays as fairway
  for (const o of HOLES) {
    if (o.fairway && inCapsule(o.fairway, p)) return 'fairway';
    if (o !== h && inEllipse(o.green, p, 4)) return 'fairway';
  }
  if (HOLES.some((o) => o !== h && dist(p, o.tee) <= TEE_BOX)) return 'fairway';
  return 'rough';
}

// A bunker whose centre is near the green is a greenside one
function greenside(h: HoleDef, p: Vec) {
  return ALL_BUNKERS.some((b) => inEllipse(b, p) && dist(b.c, h.green.c) <= 20);
}

// ---------------------------------------------------------------------------------------
// Randomness: mulberry32, seeded per shot from the round

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** murmur3's fmix32 */
export function hash32(x: number) {
  let h = x >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

export function shotSeed(round: number, hole: number, stroke: number) {
  return hash32((round ^ Math.imul(hole, 0x9e3779b1) ^ Math.imul(stroke, 0x85ebca6b)) >>> 0);
}

/** The staging stream (heckles, caddie lines): one draw per decision */
export const stagingRng = (round: number) => rng((round ^ 0x4ec) >>> 0);

// Box-Muller from two uniforms, both always drawn
function normal(r: () => number) {
  const u1 = Math.max(r(), 1e-12);
  const u2 = r();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ---------------------------------------------------------------------------------------
// The ball, the situation and the swing

export type Ball = {
  hole: 1 | 2 | 3;
  at: Vec;
  lie: Surface;
  strokes: number;
  done: boolean;
  pickedUp: boolean;
  stuckUsed: boolean;
  puttsThisHole: number;
};
/** The moment over the ball. beats: how much of the routine ran, 0 to 3 (hurried is
 *  fewer than three). doubt: the aim was changed again after it was set */
export type Ctx = { hurried: boolean; breath: boolean; afterHeckle: boolean; doubt?: boolean; beats?: number };
export type Situation = { nervy: boolean; approach: boolean; lines: [Line, Line] | null; caddie: string | null };
export type Grade = 'pure' | 'good' | 'early' | 'late' | 'fat' | 'flail';
/** errMs: release minus the sweet spot; null when it let go by itself at the end */
export type Swing = { club: FullClub; aim: Vec; errMs: number | null; wind?: Wind; tempo?: Tempo };
export type Sample = { p: Vec; z: number; s: number };
export type ShotEvent =
  | 'pure' | 'duff' | 'flyer' | 'treeHit' | 'water' | 'out' | 'drop' | 'bunker' | 'stuckInBunker'
  | 'rough' | 'fairway' | 'fringe' | 'green' | 'trees' | 'chipIn' | 'holed' | 'pickedUp';
export type Shot = {
  from: Vec;
  next: Ball;
  grade: Grade | null;
  flight: Sample[];
  roll: Sample[];
  events: ShotEvent[];
  drop?: Vec;
  treeHit?: Vec;
  apex: number;
};

export function startHole(n: 1 | 2 | 3): Ball {
  return { hole: n, at: HOLES[n - 1].tee, lie: 'tee', strokes: 0, done: false, pickedUp: false, stuckUsed: false, puttsThisHole: 0 };
}

/** On the green, or on the fringe (which is never more than 4 from it): the putts roll out by themselves */
export const isPutt = (b: Ball) => b.lie === 'green' || b.lie === 'fringe';

// What the lie does to a full shot
function lieMul(lie: Surface) {
  return lie === 'rough' ? 0.85 : lie === 'bunker' ? 0.7 : 1;
}

// The longest a club can go from here, before roll
function reach(b: Ball, club: FullClub) {
  const h = HOLES[b.hole - 1];
  const max = CLUBS[club].max;
  if (b.lie === 'trees') return 0.4 * max;
  if (b.lie === 'bunker' && greenside(h, b.at)) return Math.min(30, max);
  return max * lieMul(b.lie);
}

const allowed = (lie: Surface) => (lie === 'tee' ? LONGEST_FIRST : LONGEST_FIRST.slice(1));
/** The clubs that can be hit from here, longest first */
export const clubsFor = (b: Ball): FullClub[] => allowed(b.lie);

/** Where a good strike with this club finishes, aimed here: the aim, or as far along its
 *  line as the club goes. More club than the number is swung easy and finishes the same */
export function finishFor(b: Ball, club: FullClub, aim: Vec): Vec {
  const most = reach(b, club) * (1 + CLUBS[club].roll * (b.lie === 'rough' ? 0.5 : 1));
  return dist(b.at, aim) <= most ? aim : toward(b.at, angleOf(b.at, aim), most);
}

// The aim along the hole: walk forward from the ball's nearest point on the centreline
function alongHole(h: HoleDef, from: Vec, d: number): Vec {
  const pts: Vec[] = [...(h.fairway?.pts ?? [h.tee]), h.green.c];
  // Where the ball sits along the line
  let best = { i: 0, t: 0, d: Infinity };
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((from[0] - a[0]) * dx + (from[1] - a[1]) * dy) / l2));
    const q: Vec = [a[0] + t * dx, a[1] + t * dy];
    const e = dist(from, q);
    if (e < best.d) best = { i, t, d: e };
  }
  // Step forward until the straight distance from the ball reaches d
  for (let i = best.i; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const t0 = i === best.i ? best.t : 0;
    const n = Math.max(1, Math.ceil(dist(a, b)));
    for (let k = Math.ceil(t0 * n); k <= n; k++) {
      const t = k / n;
      const q: Vec = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      if (dist(from, q) >= d) return q;
    }
  }
  return h.green.c;
}

function linesFor(b: Ball): HoleDef['lines'] | null {
  const l = HOLES[b.hole - 1].lines;
  if (!l || b.strokes + 1 !== l.stroke) return null;
  if (l.when && !l.when(b)) return null;
  return l;
}

// The best a full club could do from here, plus a little
function isApproach(b: Ball) {
  if (isPutt(b)) return false;
  const h = HOLES[b.hole - 1];
  return dist(b.at, h.green.c) <= reach(b, allowed(b.lie)[0]) + 10;
}

export function defaultAim(b: Ball): Vec {
  const h = HOLES[b.hole - 1];
  if (isPutt(b)) return h.cup;
  const l = linesFor(b);
  if (l) return l.options[0].at;
  // The flag is where they want you to aim
  if (isApproach(b)) return h.cup;
  return alongHole(h, b.at, reach(b, allowed(b.lie)[0]) * 0.95);
}

export function suggestClub(from: Vec, aim: Vec, lie: Surface): ClubId {
  if (lie === 'green' || lie === 'fringe') return 'putter';
  const h = nearestHole(from);
  const b: Ball = { hole: h.n, at: from, lie, strokes: 0, done: false, pickedUp: false, stuckUsed: false, puttsThisHole: 0 };
  const d = dist(from, aim);
  const ok = allowed(lie);
  for (const c of SHORTEST_FIRST) if (ok.includes(c) && reach(b, c) * (1 + CLUBS[c].roll) >= d) return c;
  return ok[0];
}

function nearestHole(p: Vec): HoleDef {
  let best = HOLES[0];
  let bd = Infinity;
  for (const h of HOLES) {
    const pts: Vec[] = [...(h.fairway?.pts ?? [h.tee]), h.green.c];
    let d = Infinity;
    for (let i = 1; i < pts.length; i++) d = Math.min(d, segDist(p, pts[i - 1], pts[i]));
    if (d < bd) {
      bd = d;
      best = h;
    }
  }
  return best;
}

// Does the straight line out to the aim, as far as the club goes, cross water?
function overWater(b: Ball, aim: Vec) {
  const club = suggestClub(b.at, aim, b.lie);
  if (club === 'putter') return false;
  const ang = angleOf(b.at, aim);
  const d = Math.min(dist(b.at, aim), CLUBS[club].max);
  for (let s = 2; s <= d; s += 1) if (inWater(toward(b.at, ang, s))) return true;
  return false;
}

// The nearest water to a point, as far as `max`
function waterWithin(p: Vec, max: number) {
  for (let d = 0; d <= max; d += 1)
    for (let a = 0; a < 16; a++) if (inWater(toward(p, (a / 16) * Math.PI * 2, d))) return true;
  return false;
}

export function situation(b: Ball, aim: Vec, ctx: Ctx): Situation {
  const l = linesFor(b);
  const approach = isApproach(b);
  const nervy = ctx.afterHeckle || (!isPutt(b) && (overWater(b, aim) || waterWithin(aim, NERVY_NEAR)));
  return { nervy, approach, lines: l ? l.options : null, caddie: l ? l.caddie : approach ? TUCKED : null };
}

/** What the lie does to the swing's window (k, never past K_MAX), and what the moment does
 *  to the pattern (spread: 1 is a full routine, calm). tremble: the nerves are on */
export function difficulty(b: Ball, s: Situation, ctx: Ctx): { k: number; tremble: boolean; spread: number } {
  let k = 1;
  if (b.lie === 'rough') k *= TIGHT.rough;
  if (b.lie === 'bunker') k *= TIGHT.bunker;
  if (b.lie === 'trees') k *= TIGHT.trees;
  const nerves = s.nervy && !ctx.breath;
  const beats = ctx.beats ?? (ctx.hurried ? 0 : 3);
  let spread = ROUTINE[Math.max(0, Math.min(3, beats))];
  if (nerves) spread *= WIDEN.nerves;
  if (ctx.doubt) spread *= WIDEN.doubt;
  if (ctx.breath) spread *= WIDEN.breath;
  return { k: Math.min(K_MAX, k), tremble: nerves, spread: Math.min(SPREAD_MAX, spread) };
}

// A full shot's scatter, before the strike: how far its carry wanders, and its line
function scatter(b: Ball, want: number, pure: boolean) {
  const gs = b.lie === 'bunker' && greenside(HOLES[b.hole - 1], b.at);
  const sigma = (b.lie === 'rough' ? 0.11 : b.lie === 'bunker' ? (gs ? 0.22 : 0.12) : b.lie === 'trees' ? 0.09 : 0.075) * (pure ? 0.4 : 1);
  // A short one is never as precise as its length says: there's a floor to the scatter
  const floor = pure ? SHORT_FLOOR * 0.5 : SHORT_FLOOR;
  return { gs, carrySd: Math.max(want * sigma, floor), floor };
}

/** Where a good strike with this club lands, for the moment as it stands: an oval on the
 *  aim, `along` the line and `across` it, in course units, and the line's angle */
export function pattern(b: Ball, club: FullClub, aim: Vec, spread: number): { c: Vec; along: number; across: number; ang: number } {
  const want = carryFor(b, club, aim);
  const { carrySd, floor } = scatter(b, want, false);
  const latSd = Math.max(LATERAL_SD.good, floor / Math.max(want, 1) / RAD);
  const across = Math.max(1.5, Math.tan(latSd * spread * PATTERN_SD * RAD) * want);
  const along = Math.max(2, carrySd * spread * PATTERN_SD);
  return { c: finishFor(b, club, aim), along, across, ang: angleOf(b.at, aim) };
}

/** The furthest a shot from here can be aimed: the longest club's carry and roll */
export function maxReach(b: Ball) {
  const c = allowed(b.lie)[0];
  return reach(b, c) * (1 + CLUBS[c].roll * (b.lie === 'rough' ? 0.5 : 1));
}

/** A point clicked on the course, as a target: on the table, and no further than reach */
export function clampAim(b: Ball, p: Vec): Vec {
  const q: Vec = [Math.max(INSET + 2, Math.min(W - INSET - 2, p[0])), Math.max(INSET + 2, Math.min(H - INSET - 2, p[1]))];
  const d = dist(b.at, q);
  const max = maxReach(b);
  if (d < 6) return toward(b.at, d > 0.01 ? angleOf(b.at, q) : -Math.PI / 2, 6);
  return d > max ? toward(b.at, angleOf(b.at, q), max) : q;
}

/** The carry this club needs to finish at the aim, roll included, as far as it can go */
export function carryFor(b: Ball, club: FullClub, aim: Vec) {
  const h = HOLES[b.hole - 1];
  const onGreen = inEllipse(h.green, aim);
  const roll = (CLUBS[club].roll * (b.lie === 'rough' ? 0.5 : 1)) / (onGreen ? 1.2 : 1);
  return Math.min(dist(b.at, aim) / (1 + roll), reach(b, club));
}

/** The swing this shot asks for: its carry as a share of the most the club goes */
export function tempoFor(b: Ball, club: FullClub, aim: Vec): Tempo {
  return tempo(club, carryFor(b, club, aim) / CLUBS[club].max);
}

const GRADES: Record<Grade, { carry: number; apex: number; roll: number }> = {
  pure: { carry: 1, apex: 1, roll: 1 },
  good: { carry: 1, apex: 1, roll: 1 },
  early: { carry: 0.86, apex: 0.95, roll: 1 },
  late: { carry: 1.08, apex: 0.85, roll: 1.5 },
  fat: { carry: 0.45, apex: 0.6, roll: 0.5 },
  flail: { carry: 0.65, apex: 0.35, roll: 2.2 },
};

/** Release timing to a grade, and which way it goes. Early is pulled: it starts left and
 *  flies straight. Late is hooked: it starts on line and turns left. Both by up to `mag`
 *  of the club's error, and never at all for a pure one */
export function grade(errMs: number | null, k: number, t: Tempo = TEMPO_STD): { grade: Grade; start: number; curve: number } {
  if (errMs == null) return { grade: 'flail', start: 0, curve: 0 };
  // Measured against this swing's windows, so a miss is the same share of any swing
  const e = (errMs * k * SWING.good) / t.good;
  const a = Math.abs(e);
  const g: Grade = a <= SWING.pure ? 'pure' : a <= SWING.good ? 'good' : e < -SWING.fat ? 'fat' : e < 0 ? 'early' : 'late';
  const mag = a <= SWING.pure ? 0 : a <= SWING.good ? (0.25 * (a - SWING.pure)) / (SWING.good - SWING.pure) : Math.min(2, 0.25 + (a - SWING.good) / 100);
  return e < 0 ? { grade: g, start: -mag, curve: 0 } : { grade: g, start: 0, curve: -mag };
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const ROLL_COST: Partial<Record<Surface, number>> = { fairway: 1, tee: 1, fringe: 1, green: 1.2, rough: 4 };

type Rolled = { end: Vec; samples: Sample[]; stop: Surface | null; holed: boolean; lastDry: Vec };

// Roll a ball along a line, spending budget by the ground it crosses. Sand, water and
// the edge stop it at once
function roll(h: HoleDef, from: Vec, ang: number, budget: number, costs: Partial<Record<Surface, number>>, chip: boolean): Rolled {
  const samples: Sample[] = [{ p: from, z: 0, s: 0 }];
  let p = from;
  let left = budget;
  let travelled = 0;
  let lastDry = from;
  let i = 0;
  while (left > 0 && i < 4000) {
    i++;
    const q = toward(p, ang, 0.5);
    const surf = surfaceAt(h, q);
    if (surf === 'water' || surf === 'out' || surf === 'bunker') {
      samples.push({ p: q, z: 0, s: 1 });
      return { end: q, samples, stop: surf, holed: false, lastDry: p };
    }
    left -= 0.5 * (costs[surf] ?? 1);
    travelled += 0.5;
    p = q;
    lastDry = p;
    if (chip && left < CHIP_ROLL && dist(p, h.cup) <= CHIP_IN) {
      samples.push({ p: h.cup, z: 0, s: 1 });
      return { end: h.cup, samples, stop: null, holed: true, lastDry: p };
    }
    if (i % 2 === 0) samples.push({ p, z: 0, s: 0 });
  }
  samples.push({ p, z: 0, s: 1 });
  const total = Math.max(travelled, 1e-9);
  // s along the roll, 0 to 1
  let run = 0;
  for (let j = 1; j < samples.length; j++) {
    run += dist(samples[j - 1].p, samples[j].p);
    samples[j] = { ...samples[j], s: Math.min(1, run / total) };
  }
  return { end: p, samples, stop: null, holed: false, lastDry };
}

// A drop: back from the last dry spot towards where the shot came from, until it's dry
function dropFrom(h: HoleDef, lastDry: Vec, origin: Vec): Vec {
  const ang = angleOf(lastDry, origin);
  const span = dist(lastDry, origin);
  for (let d = 4; d <= span; d += 1) {
    const q = toward(lastDry, ang, d);
    const s = surfaceAt(h, q);
    if (s !== 'water' && s !== 'out' && s !== 'bunker') return q;
  }
  return origin;
}

const restingEvent = (s: Surface): ShotEvent =>
  s === 'tee' ? 'fairway' : s === 'trees' ? 'trees' : s === 'water' ? 'water' : s === 'out' ? 'out' : s;

// Count the shot, and pick up at par plus four
function finishBall(h: HoleDef, next: Ball, events: ShotEvent[]): Ball {
  const cap = h.par + 4;
  if (!next.done && next.strokes >= cap) {
    events.push('pickedUp');
    return { ...next, strokes: cap, done: true, pickedUp: true };
  }
  return next.strokes > cap ? { ...next, strokes: cap } : next;
}

const TREE_GRACE = 14;

// ---------------------------------------------------------------------------------------
// The wind: a direction and a strength for each shot, from the seed. The golfer reads it
// off the sock as one of four strengths and aims off for it. On the short hole it swirls,
// so what it really does can differ from what the sock said.

/** ang: where it blows to, in course radians. level: what the sock shows, 0 (still) to 3
 *  (strong). realAng and realK: what it actually does to this shot */
export type Wind = { ang: number; level: 0 | 1 | 2 | 3; realAng: number; realK: number };
// Drift, in course units per hundred of carry, at each level
const WIND_UNITS = [0, 5, 10, 15] as const;
type WindSpec = { spread: number; levels: [number, number, number, number]; swirl: number; gust: [number, number] };
// The prevailing wind blows across the corner, away to the left of the board
const WIND_BASE = Math.atan2(-1, -1);
const WINDS: Record<1 | 2 | 3, WindSpec> = {
  1: { spread: 50, levels: [0.1, 0.4, 0.35, 0.15], swirl: 8, gust: [0.85, 1.15] },
  // In the low corner it swirls: stronger, any way at all, and not always what the sock says
  2: { spread: 180, levels: [0, 0.2, 0.45, 0.35], swirl: 40, gust: [0.6, 1.5] },
  3: { spread: 60, levels: [0.1, 0.4, 0.35, 0.15], swirl: 10, gust: [0.85, 1.15] },
};
export const CALM: Wind = { ang: 0, level: 0, realAng: 0, realK: 0 };

export function windFor(round: number, hole: 1 | 2 | 3, stroke: number): Wind {
  const r = rng(hash32(shotSeed(round, hole, stroke) ^ 0x2c1b3c6d));
  const spec = WINDS[hole];
  const uDir = r();
  const uLevel = r();
  const uSwirl = r();
  const uGust = r();
  const ang = WIND_BASE + (uDir * 2 - 1) * spec.spread * RAD;
  let level = 0;
  for (let acc = 0, i = 0; i < 4; i++) {
    acc += spec.levels[i];
    if (uLevel < acc) {
      level = i;
      break;
    }
    level = i;
  }
  return { ang, level: level as Wind['level'], realAng: ang + (uSwirl * 2 - 1) * spec.swirl * RAD, realK: spec.gust[0] + uGust * (spec.gust[1] - spec.gust[0]) };
}

// What the wind does to a shot of this carry and height, at landing
function drift(w: Wind | undefined, carry: number, apex: number, real: boolean): Vec {
  if (!w || w.level === 0) return [0, 0];
  const m = WIND_UNITS[w.level] * (real ? w.realK : 1) * (carry / 100) * (0.6 + (0.4 * apex) / 26);
  const a = real ? w.realAng : w.ang;
  return [Math.cos(a) * m, Math.sin(a) * m];
}

/** What the sock says the wind will do to a full shot at this aim: for aiming off */
export function windDrift(b: Ball, club: FullClub, aim: Vec, w: Wind): Vec {
  return drift(w, carryFor(b, club, aim), CLUBS[club].apex, false);
}

/** The wind in words, against the line of the shot, for the status line */
export function windWords(w: Wind, from: Vec, aim: Vec): string {
  if (w.level === 0) return 'Still.';
  const f = angleOf(from, aim);
  const along = Math.cos(w.ang - f);
  // Left of the line, for a shot going away: the course's (y, -x) turn
  const cross = Math.cos(w.ang) * Math.sin(f) - Math.sin(w.ang) * Math.cos(f);
  const how = ['', 'A light wind', 'A fresh wind', 'A strong wind'][w.level];
  const way = along > 0.6 ? 'behind you' : along < -0.6 ? 'into you' : cross > 0 ? 'right to left' : 'left to right';
  return `${how}, ${way}.`;
}

/** A full shot. Every draw is made every time, in a fixed order, so the seed alone decides it */
export function strike(b: Ball, sw: Swing, k: number, seed: number, spread = 1): Shot {
  const h = HOLES[b.hole - 1];
  const r = rng(seed);
  const nLat = normal(r);
  const nCarry = normal(r);
  const uSpecial = r();
  const uTree = r();
  const uRoll = r();
  const nFlail = normal(r);

  const club = CLUBS[sw.club];
  const { grade: g, start, curve } = grade(sw.errMs, k, sw.tempo);
  const G = GRADES[g];
  const events: ShotEvent[] = [];
  if (g === 'pure') events.push('pure');
  if (g === 'fat' || g === 'flail') events.push('duff');

  const want = carryFor(b, sw.club, sw.aim);
  const { gs, carrySd, floor } = scatter(b, want, g === 'pure');
  // The moment widens the pattern: a rushed routine, nerves, a changed mind
  let carry = want * G.carry + nCarry * carrySd * spread;
  let rollMul = b.lie === 'rough' ? 0.5 : 1;
  let stuckUsed = b.stuckUsed;
  if (b.lie === 'rough' && uSpecial < 0.1) {
    carry *= 1.12;
    events.push('flyer');
  }
  if (gs) carry = Math.min(carry, 30);
  if (b.lie === 'trees') carry = Math.min(carry, 0.4 * club.max);
  if (gs && !b.stuckUsed && uSpecial < 0.18) {
    carry = 2;
    stuckUsed = true;
    events.push('stuckInBunker');
  }
  carry = Math.max(1, carry);
  const apex = b.lie === 'trees' ? 6 : club.apex * G.apex;

  const aimAng = angleOf(b.at, sw.aim);
  // A flail goes anywhere; everything else by its start line and its turn
  const startOff = g === 'flail' ? nFlail * 9 : start * club.errDeg;
  const latSd = Math.max(LATERAL_SD[g], floor / Math.max(want, 1) / RAD);
  const dev = startOff + (g === 'flail' ? nLat * 8 : curve * club.errDeg * 1.2 + nLat * latSd * spread);
  const angAt = (s: number) => aimAng + (startOff + (dev - startOff) * smoothstep(0.4, 1, s)) * RAD;
  const zAt = (s: number) => {
    const u = s ** 0.9;
    return 4 * apex * u * (1 - u);
  };

  // The wind carries it off its line, more the longer it's up
  const wd = drift(sw.wind, carry, apex, true);

  // Fly it, every 2 units
  const n = Math.max(2, Math.ceil(carry / 2));
  const flight: Sample[] = [{ p: b.at, z: 0, s: 0 }];
  let treeHit: Vec | undefined;
  let hitAt = -1;
  let wentOut = false;
  for (let i = 1; i <= n; i++) {
    const s = i / n;
    const q = toward(b.at, angAt(s), carry * s);
    const ws = s ** 1.6;
    const p: Vec = [q[0] + wd[0] * ws, q[1] + wd[1] * ws];
    const z = zAt(s);
    flight.push({ p, z, s });
    if (!onPlate(p)) {
      wentOut = true;
      break;
    }
    if (carry * s > TREE_GRACE && ALL_TREES.some((t) => dist(p, t.c) < t.r && z < t.h)) {
      treeHit = p;
      hitAt = s;
      break;
    }
  }

  let at: Vec = flight[flight.length - 1].p;
  let rollSamples: Sample[] = [];
  let lie: Surface;
  let penalty = 0;
  let drop: Vec | undefined;
  let holed = false;
  const lastDryFlight = (): Vec => {
    for (let i = flight.length - 1; i >= 0; i--) if (!inWater(flight[i].p) && onPlate(flight[i].p)) return flight[i].p;
    return b.at;
  };

  if (treeHit) {
    events.push('treeHit');
    // Off the timber, on along a new line at ground level for a third of what was left
    const heading = angAt(hitAt) + (uTree * 2 - 1) * 60 * RAD;
    const on = 0.3 * carry * (1 - hitAt);
    const m = Math.max(1, Math.ceil(on / 2));
    for (let j = 1; j <= m; j++) {
      const p = toward(treeHit, heading, (on * j) / m);
      flight.push({ p, z: 0, s: 1 });
      if (!onPlate(p)) break;
    }
    at = flight[flight.length - 1].p;
    const ground = surfaceAt(h, at);
    if (ground === 'out' || ground === 'water') lie = ground;
    else if (ALL_TREES.some((t) => dist(at, t.c) <= 4)) lie = 'trees';
    else lie = ground;
  } else if (wentOut) {
    lie = 'out';
  } else {
    const land = surfaceAt(h, at);
    if (land === 'water' || land === 'out' || land === 'bunker') lie = land;
    else if (dist(at, h.cup) <= CHIP_IN) {
      holed = true;
      lie = 'green';
    } else {
      const R = carry * club.roll * G.roll * rollMul * (0.85 + 0.3 * uRoll);
      // On along the line it came down on, wind and all
      const fl = flight.length;
      const landAng = fl > 1 && dist(flight[fl - 2].p, at) > 0.01 ? angleOf(flight[fl - 2].p, at) : angAt(1);
      const rolled = roll(h, at, landAng, R, ROLL_COST, true);
      rollSamples = rolled.samples;
      if (rolled.holed) {
        holed = true;
        at = h.cup;
        lie = 'green';
      } else if (rolled.stop) {
        lie = rolled.stop;
        at = rolled.end;
        if (lie === 'water') {
          // Rolled in: drop back from where it was last dry
          drop = dropFrom(h, rolled.lastDry, b.at);
        }
      } else {
        at = rolled.end;
        lie = surfaceAt(h, at);
      }
    }
  }

  if (lie === 'water') {
    penalty = 1;
    events.push('water', 'drop');
    drop ??= dropFrom(h, lastDryFlight(), b.at);
    at = drop;
    lie = surfaceAt(h, at);
    if (lie === 'water' || lie === 'out') {
      at = b.at;
      lie = b.lie;
    }
  } else if (lie === 'out') {
    // Off the edge of the table: play again from the same spot
    penalty = 1;
    events.push('out');
    at = b.at;
    lie = b.lie;
  } else if (holed) {
    events.push('chipIn', 'holed');
  } else {
    events.push(restingEvent(lie));
  }

  const next: Ball = {
    ...b,
    at,
    lie,
    strokes: b.strokes + 1 + penalty,
    done: holed,
    stuckUsed,
  };
  return { from: b.at, next: finishBall(h, next, events), grade: g, flight, roll: rollSamples, events, drop, treeHit, apex };
}

/** On the green the putts roll out by themselves: one, two or three, by the length of
 *  the first and a little by the nerves, all from the seed. Each is a shot of its own */
export function puttOut(b: Ball, k: number, seed: number): Shot[] {
  const h = HOLES[b.hole - 1];
  const r = rng(seed);
  const cup = h.cup;
  const d = dist(b.at, cup);
  const u = r();
  const uNerve = r();
  let n = d < 2.5 ? (u < 0.42 ? 1 : 2) : d < 6 ? (u < 0.1 ? 1 : u < 0.95 ? 2 : 3) : d < 14 ? (u < 0.04 ? 1 : u < 0.9 ? 2 : 3) : u < 0.02 ? 1 : u < 0.8 ? 2 : 3;
  if (k > 1.05 && n < 3 && uNerve < 0.25) n++;
  const shots: Shot[] = [];
  let ball = b;
  for (let i = 0; i < n && !ball.done; i++) {
    const last = i === n - 1;
    const from = ball.at;
    const ang = dist(from, cup) > 0.01 ? angleOf(from, cup) : 0;
    // A miss finishes short or by, a little off the line
    const leave = last ? 0 : (i === 0 ? 1.4 + r() * 2.6 : 0.7 + r() * 1.2) * (r() < 0.55 ? 1 : -1);
    const side = last ? 0 : (r() - 0.5) * 1.6;
    const to: Vec = last ? cup : [cup[0] + Math.cos(ang) * leave - Math.sin(ang) * side, cup[1] + Math.sin(ang) * leave + Math.cos(ang) * side];
    const len = dist(from, to);
    const m = Math.max(2, Math.ceil(len / 0.5));
    const roll: Sample[] = Array.from({ length: m + 1 }, (_, j) => ({ p: [from[0] + ((to[0] - from[0]) * j) / m, from[1] + ((to[1] - from[1]) * j) / m] as Vec, z: 0, s: j / m }));
    const events: ShotEvent[] = [last ? 'holed' : 'green'];
    const next: Ball = { ...ball, at: to, lie: 'green', strokes: ball.strokes + 1, done: last, puttsThisHole: ball.puttsThisHole + 1 };
    const shot: Shot = { from, next: finishBall(h, next, events), grade: null, flight: [{ p: from, z: 0, s: 0 }], roll, events, apex: 0 };
    shots.push(shot);
    ball = shot.next;
  }
  return shots;
}

// ---------------------------------------------------------------------------------------
// The notional clock and the record

export type Phase = 'intro' | 'preShot' | 'prePutt' | 'shot' | 'walk' | 'between' | 'drop';

/** Seconds of a notional real round, so three holes come to about forty-five minutes */
export function phaseSeconds(p: Phase, units = 0): number {
  switch (p) {
    case 'intro':
      return 120;
    case 'preShot':
      return 75;
    case 'prePutt':
      return 30;
    case 'shot':
      return 5;
    case 'walk':
      return units * YD;
    case 'between':
      return units * YD * 0.8;
    case 'drop':
      return 60;
  }
}

/** The composer's mapping: holes are 1 to holesPlayed, par from the card */
export function mapping(tapHoles: number[], holesPlayed: number): Mapping {
  return { holes: tapHoles, par: { ...PAR }, holesPlayed };
}
