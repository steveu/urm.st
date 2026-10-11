// The board in pixels. The holes are drawn isometric on a small canvas and scaled up by
// a whole number, so every pixel stays square. The plate is turned a quarter so the 1st
// tee is nearest: across the screen is the course's y, and up it is 600 - x.
//
// The projection is a view the board sets: the whole table at OVERVIEW for choosing and
// for the record, and in a round each hole on its own, fitted to the board (holeView), as
// an island that falls away into the band. Same angle every time; only the density moves.
//
// The ground (grass, sand, water, the plate's sides and the long shadows) is drawn once a
// view into its own canvas and only redrawn when the light or the view changes. Each frame
// blits it, then draws what stands up off it, back to front. Nothing here knows the rules
// of golf; play.ts says where things are.

import { COURSE, CLUBS, W, H, type Vec, type Ellipse, type Capsule, type FullClub } from './sim';

/** The whole table: pixels per course unit across the plate, and of height */
export const OVERVIEW = { a: 0.3, zk: 0.5 } as const;
/** The projection in use. The board sets it; everything reads it live */
export const view = { a: OVERVIEW.a as number, zk: OVERVIEW.zk as number };
/** The height a flight is drawn at, against the sim's. The sim's apexes are its own, for
 *  the trees and the wind; drawn as they are, a wedge goes up a foreshortened fairway like
 *  a rocket. A real one peaks at much the same height whatever the club, the long ones a
 *  touch higher, so each club is drawn to its own peak and only the length tells them apart */
const PEAK: Record<FullClub, number> = { driver: 17, wood: 16, iron: 15.5, wedge: 14 };
export const liftFor = (club: FullClub) => PEAK[club] / CLUBS[club].apex;
const T = 8; // the plate's thickness
/** How far off a ball's shadow falls for each pixel it's up: 1.1 rakes it with the trees'
 *  long shadows, 0 would put it straight under */
const RAKE = 1.1;

type RGB = readonly [number, number, number];
type Ctx = CanvasRenderingContext2D;

/** A course point to the plate's own pixels: the far corner (600, 0) is the origin */
export const isoX = (x: number, y: number) => (y - (W - x)) * view.a;
export const isoY = (x: number, y: number) => ((y + (W - x)) * view.a) / 2;
/** And back, on the ground */
export function unIso(px: number, py: number): Vec {
  const a = px / view.a;
  const b = (py * 2) / view.a;
  return [W - (b - a) / 2, (a + b) / 2];
}
/** The plate's extent in its own pixels at the overview, sides included */
export const PLATE = { l: -180, r: 78, t: 0, b: 129 + T };

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mul = (a: RGB, k: number): RGB => [a[0] * k, a[1] * k, a[2] * k];
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
export function hash(x: number, y: number, z = 0) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
// Ordered dither, for every soft edge: light pools, fades
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const bayer = (x: number, y: number) => BAYER[(y & 3) * 4 + (x & 3)];
// A 4 by 4 tile with `level` of its 16 pixels set, in Bayer order: for fades and veils
const tiles: HTMLCanvasElement[] = [];
export function ditherCanvas(level: number, col = '#000') {
  const k = `${level}:${col}`;
  const hit = tiles.find((t) => t.dataset.k === k);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 4;
  c.dataset.k = k;
  const g = c.getContext('2d')!;
  g.fillStyle = col;
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (bayer(x, y) < level / 16) g.fillRect(x, y, 1, 1);
  tiles.push(c);
  return c;
}

// ---------------------------------------------------------------------------------------
// The palette: the band's creams, the low sun's gold, soft greens and brown soil

export const P = {
  ink: '#26211a',
  cream: '#fff6dc',
  paper: '#f7f1e1',
  gold: '#e3b84f',
  brass: '#c9a24a',
  brassDk: '#8a6d34',
  white: '#ffffff',
  shade: 'rgba(36,44,22,0.26)',
};

const G = {
  rough: [[150, 164, 98], [156, 170, 104]] as RGB[],
  roughDk: [136, 152, 88] as RGB,
  roughLt: [170, 182, 118] as RGB,
  fair: [[128, 190, 82], [140, 201, 92]] as RGB[],
  fairEdge: [92, 146, 62] as RGB,
  fringe: [120, 182, 78] as RGB,
  green: [[110, 192, 86], [120, 201, 95]] as RGB[],
  greenEdge: [74, 140, 58] as RGB,
  tee: [146, 208, 104] as RGB,
  sand: [238, 221, 172] as RGB,
  sandDk: [226, 206, 152] as RGB,
  sandLip: [184, 156, 104] as RGB,
  water: [[100, 160, 164], [108, 168, 170]] as RGB[],
  waterEdge: [62, 110, 116] as RGB,
  path: [176, 180, 126] as RGB,
  pave: [228, 216, 188] as RGB,
  paveDk: [206, 192, 162] as RGB,
  haze: [200, 190, 160] as RGB,
};

// ---------------------------------------------------------------------------------------
// Shapes, for telling grass from sand

const isCapsule = (w: Ellipse | Capsule): w is Capsule => 'pts' in w;
const inEllipse = (e: Ellipse, p: Vec, grow = 0) => ((p[0] - e.c[0]) / (e.rx + grow)) ** 2 + ((p[1] - e.c[1]) / (e.ry + grow)) ** 2 <= 1;
function segDist(p: Vec, a: Vec, b: Vec) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2, 0, 1);
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}
function lineDist(p: Vec, pts: readonly Vec[]) {
  let d = Infinity;
  for (let i = 1; i < pts.length; i++) d = Math.min(d, segDist(p, pts[i - 1], pts[i]));
  return d;
}
const inShape = (w: Ellipse | Capsule, p: Vec) => (isCapsule(w) ? lineDist(p, w.pts) <= w.r : inEllipse(w, p));
const onPlate = (p: Vec) => p[0] >= 0 && p[0] < W && p[1] >= 0 && p[1] < H;

// What each pixel is, and how high it sits: an edge is drawn where a pixel meets lower ground
const RANK: Record<string, number> = { r: 0, p: 0, e: 1, a: 1, t: 2, f: 2, g: 3, b: 4, w: 4 };
function surface(p: Vec): string {
  if (COURSE.water.some((w) => inShape(w, p))) return 'w';
  for (const h of COURSE.holes) if (h.bunkers.some((b) => inEllipse(b, p))) return 'b';
  for (const h of COURSE.holes) if (inEllipse(h.green, p)) return 'g';
  for (const h of COURSE.holes) if (inEllipse(h.green, p, 4)) return 'f';
  for (const h of COURSE.holes) if (Math.abs(p[0] - h.tee[0]) <= 7 && Math.abs(p[1] - h.tee[1]) <= 5) return 't';
  for (const h of COURSE.holes) if (h.fairway && lineDist(p, h.fairway.pts) <= h.fairway.r) return 'a';
  const [tx, ty] = COURSE.terrace;
  if (Math.abs(p[0] - tx) <= 20 && Math.abs(p[1] - ty) <= 7) return 'e';
  if (COURSE.walk.some((w) => lineDist(p, w) <= 1.7)) return 'p';
  return 'r';
}

// ---------------------------------------------------------------------------------------
// Sprites that never change, drawn once

export function canvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}
export type Sprite = { c: HTMLCanvasElement; ax: number; ay: number };

// A round tree, lit from the right: an outline where it turns from the sun
function oak(r: number, seed: number): Sprite {
  const w = r * 2 + 3;
  const hgt = r * 2 + 6;
  const [c, g] = canvas(w, hgt);
  const cx = r + 1;
  const cy = r + 1;
  const px = (x: number, y: number, col: string) => {
    g.fillStyle = col;
    g.fillRect(x, y, 1, 1);
  };
  // The trunk
  g.fillStyle = '#5a3d24';
  g.fillRect(cx, cy + r - 1, 1, 4);
  g.fillStyle = '#7b5634';
  g.fillRect(cx + 1, cy + r, 1, 3);
  const R2 = r * r + r * 0.7;
  for (let dy = -r - 1; dy <= r + 1; dy++)
    for (let dx = -r - 1; dx <= r + 1; dx++) {
      const d2 = dx * dx + dy * dy;
      if (d2 > R2) continue;
      const nb = (dx - 1) ** 2 + dy ** 2 > R2 || (dx + 1) ** 2 + dy ** 2 > R2 || dx ** 2 + (dy - 1) ** 2 > R2 || dx ** 2 + (dy + 1) ** 2 > R2;
      // A ragged rim
      if (nb && hash(dx + seed * 7, dy + seed * 13) > 0.8) continue;
      const n = (dx / r) * 0.65 - (dy / r) * 0.75;
      let col = n > 0.45 ? '#8fc463' : n > -0.2 ? '#5c9b45' : '#43803a';
      if (nb && (dx < 0 || dy > 0)) col = '#2f5e2c';
      if (!nb && hash(dx + seed, dy - seed) > 0.86) col = n > 0.1 ? '#a6d47a' : '#4d8c3d';
      px(cx + dx, cy + dy, col);
    }
  px(cx + Math.ceil(r * 0.45), cy - Math.ceil(r * 0.55), '#c2e08f');
  return { c, ax: cx, ay: cy + r + 3 };
}

// A pine, in tiers
function pine(r: number): Sprite {
  const hgt = r * 3 + 5;
  const w = r * 2 + 3;
  const [c, g] = canvas(w, hgt);
  const cx = r + 1;
  g.fillStyle = '#5a3d24';
  g.fillRect(cx, hgt - 3, 1, 3);
  const top = 0;
  const n = hgt - 3;
  for (let y = top; y < n; y++) {
    const t = (y - top) / (n - 1);
    // Three tiers, each wider at its foot
    const tier = (t * 3) % 1;
    const half = Math.round(r * (0.3 + 0.7 * t) * (0.55 + 0.45 * tier));
    for (let dx = -half; dx <= half; dx++) {
      const edge = dx === -half || y === n - 1;
      g.fillStyle = edge ? '#2c5530' : dx > 0 ? (dx === 1 && tier < 0.4 ? '#7fb365' : '#4f8a47') : '#376b39';
      g.fillRect(cx + dx, y, 1, 1);
    }
  }
  g.fillStyle = '#9cc97a';
  g.fillRect(cx + 1, 2, 1, 1);
  return { c, ax: cx, ay: hgt - 1 };
}

// A flowering bush: a dark mound, lit on the right, thick with pink
function blossom(seed: number): Sprite {
  const [c, g] = canvas(9, 7);
  for (let y = 0; y < 7; y++)
    for (let x = 0; x < 9; x++) {
      const nx = (x - 4) / 4.4;
      const ny = (y - 4) / 3.2;
      if (nx * nx + ny * ny > 1) continue;
      const rim = (x - 4) ** 2 / 19 + (y - 4) ** 2 / 10 > 0.62;
      let col = nx > 0.3 ? '#4f8a47' : '#2f5e2c';
      if (rim && (nx < 0 || ny > 0)) col = '#24452a';
      const h = hash(x + seed * 5, y - seed * 3, 11);
      if (y < 5 && h > 0.42) col = h > 0.86 ? '#fbd3e2' : nx > 0 ? '#ec6fa0' : '#c94c80';
      g.fillStyle = col;
      g.fillRect(x, y, 1, 1);
    }
  return { c, ax: 4, ay: 6 };
}

// The footbridge: a low stone arch, its deck running across the creek
function bridge(): Sprite {
  const [c, g] = canvas(11, 8);
  const px = (x: number, y: number, col: string, w = 1, h = 1) => {
    g.fillStyle = col;
    g.fillRect(x, y, w, h);
  };
  // The deck, falling to the right, a parapet on its far side, the arch's shade under
  for (let i = 0; i <= 8; i++) {
    const y = 1 + Math.round(i * 0.5);
    px(i + 1, y, '#efe4c8');
    px(i + 1, y + 1, i > 5 ? '#d8cba8' : '#e6dabb');
    px(i + 1, y + 2, i > 1 && i < 7 ? '#3e5a5a' : '#b8aa88');
    if (i % 2 === 0) px(i + 1, y - 1, '#c9bc98');
  }
  px(0, 1, '#8c8270', 1, 3);
  px(10, 5, '#8c8270', 1, 3);
  return { c, ax: 5, ay: 5 };
}

// Digits in three by five, for the tee signs
const DIGITS: Record<string, string[]> = {
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['##.', '..#', '.#.', '#..', '###'],
  '3': ['##.', '..#', '.#.', '..#', '##.'],
};
/** A tee sign: a small white board on a post with the hole's number */
export function teeSign(n: number): Sprite {
  const t = String(n);
  const w = t.length * 4 + 3;
  const [c, g] = canvas(w, 11);
  g.fillStyle = '#26211a';
  g.fillRect(0, 0, w, 8);
  g.fillStyle = '#fbf6ea';
  g.fillRect(1, 1, w - 2, 6);
  g.fillStyle = '#d9d0bc';
  g.fillRect(1, 6, w - 2, 1);
  [...t].forEach((d, k) =>
    DIGITS[d].forEach((r, j) =>
      [...r].forEach((ch, i) => {
        if (ch !== '#') return;
        g.fillStyle = '#26211a';
        g.fillRect(2 + k * 4 + i, 1 + j, 1, 1);
      }),
    ),
  );
  g.fillStyle = '#5a3d24';
  g.fillRect(Math.floor(w / 2), 8, 1, 3);
  return { c, ax: Math.floor(w / 2), ay: 10 };
}

/** A thought, over the golfer's head: two rising dots and a cloud, a question in it when
 *  they've changed their mind */
export function drawCloud(g: Ctx, x: number, y: number, age: number, doubt: boolean, reduce: boolean) {
  const step = reduce ? 3 : Math.min(3, Math.floor(age / 90));
  const ink = 'rgba(38,33,26,0.75)';
  const dot = (dx: number, dy: number, r: number) => {
    g.fillStyle = ink;
    g.fillRect(x + dx - 1, y + dy - 1, r + 2, r + 2);
    g.fillStyle = '#fffaf0';
    g.fillRect(x + dx, y + dy, r, r);
  };
  if (step >= 1) dot(2, -2, 1);
  if (step >= 2) dot(4, -6, 2);
  if (step < 3) return;
  // The cloud: three bumps on a flat base
  const cx = x + 4;
  const cy = y - 16;
  const rows = ['..####.###..', '.#######-##.', '############', '############', '.##########.'];
  rows.forEach((r, j) =>
    [...r].forEach((ch, i) => {
      if (ch === '.') return;
      g.fillStyle = ink;
      g.fillRect(cx + i - 1, cy + j, 3, 1);
      g.fillRect(cx + i, cy + j - 1, 1, 3);
    }),
  );
  rows.forEach((r, j) =>
    [...r].forEach((ch, i) => {
      if (ch === '.') return;
      g.fillStyle = j === 0 || ch === '-' ? '#ffffff' : '#fffaf0';
      g.fillRect(cx + i, cy + j, 1, 1);
    }),
  );
  g.fillStyle = '#26211a';
  if (doubt) {
    // A question mark
    for (const [i, j] of [[5, 0], [6, 0], [7, 1], [6, 2], [6, 4]]) g.fillRect(cx + i - 1, cy + j, 1, 1);
  } else {
    for (const i of [3, 6, 9]) g.fillRect(cx + i - 1, cy + 2, 1, 1);
  }
}

// The clubhouse on the terrace: two walls, a roof, the windows lit for the evening
export function house(): Sprite {
  const [c, g] = canvas(30, 24);
  const px = (x: number, y: number, col: string, w = 1, h = 1) => {
    g.fillStyle = col;
    g.fillRect(x, y, w, h);
  };
  // The front corner at (12, 21). Left wall runs up-left, right wall up-right
  const fx = 12;
  const fy = 21;
  const a = 14; // right wall, along the slope
  const b = 9; // left wall
  const h = 8;
  for (let j = 0; j <= a; j++) {
    const top = fy - Math.round(j / 2) - h;
    px(fx + j, top, '#f6ecd2', 1, h + 1);
  }
  for (let i = 1; i <= b; i++) {
    const top = fy - Math.round(i / 2) - h;
    px(fx - i, top, '#dccaa4', 1, h + 1);
  }
  // Windows, warm
  for (const j of [3, 7, 11]) px(fx + j, fy - Math.round(j / 2) - 6, '#f4c45a', 2, 3);
  px(fx - 5, fy - 3 - 5, '#e6b04a', 2, 3);
  // The door
  px(fx - 2, fy - 1 - 5, '#6b4a2b', 1, 5);
  // The roof: a ridge along the long wall, eaves over both
  for (let j = -1; j <= a + 1; j++) {
    const base = fy - Math.round(j / 2) - h - 1;
    px(fx + j, base - 4, '#a24b2c', 1, 5);
    px(fx + j, base - 5, '#c4643c', 1, 1);
  }
  for (let i = 1; i <= b + 1; i++) {
    const base = fy - Math.round(i / 2) - h - 1;
    const rise = Math.min(4, Math.round((b + 1 - i) * 0.9));
    px(fx - i, base - rise, '#7f3a22', 1, rise + 1);
  }
  px(fx + 9, fy - 4 - h - 8, '#8a7a68', 2, 3); // chimney
  return { c, ax: fx, ay: fy };
}

// ---------------------------------------------------------------------------------------
// The golfer: a flat cap, a red jumper over a white collar, cream trousers. Seen from
// behind, down the line, facing the ball on the right; mirrored to face left. Feet at
// (0, 0); the ball sits at (6, 0).
//
// A pose is where the hands and the clubhead are, and what the body does round them: how
// far it's bent over the ball, how far it has turned (the chest to us at the top of the
// swing, the back to us at the finish), where the weight is, and whether the eyes have
// come up after the ball.
export type Pose = {
  h: Vec;
  c: Vec;
  bend: number; // 0 stood up, 1 over the ball, below 0 falling back off it
  turn: number; // -1 chest to us, 0 side on, 1 back to us
  wt: number; // -1 on the back foot, 1 through on the front with the back heel up
  up: number; // 0 eyes on the ball, 1 up after it
  putter?: boolean;
  step?: number; // the front foot put down this far forward, catching a fall
};
export const BALL_DX = 6;
const pose = (h: Vec, c: Vec, bend: number, turn = 0, wt = 0, up = 0): Pose => ({ h, c, bend, turn, wt, up });
/** The putting stroke from the shoulders, the hands quiet: x is -1 back, 0 at the ball,
 *  1 through; a long putt takes it further */
export const puttPose = (x: number): Pose => ({
  ...pose([4 + x * 0.7, -6 - Math.abs(x) * 0.3], [5 + x * 2.6, Math.abs(x) > 1.1 ? -1 : 0], 1),
  putter: true,
});
export const POSES = {
  addr: pose([4, -6], [6, 0], 1),
  wag: pose([4, -6], [8, -2], 1),
  // Low and slow away, the turn starting
  take: pose([1, -7], [-5, -8], 1, -0.35, -0.3),
  // The wrists set, the club straight up
  half: pose([-2, -10], [-3, -17], 1, -0.7, -0.5),
  // Wound up, chest to us, the club across behind the head at the target
  top: pose([-3, -15], [5, -17], 0.9, -1, -0.6),
  // Past it: the arms give and the club drops past level
  over: pose([-4, -14], [-7, -12], 0.7, -1, -0.9),
  // On the way down the hands drop first and the club lags behind them
  down: pose([-1, -9], [-7, -11], 1, -0.4, 0.3),
  impact: pose([5, -6], [6, 0], 1, 0.35, 0.6),
  through: pose([6, -12], [2, -20], 0.6, 0.75, 0.85, 0.6),
  // Up on the front foot, back to us, the hands by the ear and the club down the back: held
  finish: pose([-2, -15], [-7, -10], 0, 1, 1, 1),
  // Three quarters, for a strike a touch early or late: held off, the club up and back
  short: pose([5, -13], [0, -19], 0.3, 0.8, 0.8, 1),
  // Thrown at it: the weight falls back and the club wraps round low
  flail: pose([1, -13], [-7, -7], -0.8, 0.55, -1, 1),
  // And the front foot comes down a step on, to catch it
  steady: { ...pose([2, -11], [-5, -6], -0.4, 0.5, -0.5, 1), step: 1 },
  // Heavy: the club stays in the ground
  dug: pose([5, -5], [7, 1], 1, 0.2, 0.3),
  slump: pose([3, -7], [8, -1], 1),
  // A good one let go of: the club down in front, watching it
  post: pose([5, -10], [9, -4], 0.2, 0.6, 0.8, 1),
  pAddr: puttPose(0),
  pBack: puttPose(-1),
  pThru: puttPose(1),
} satisfies Record<string, Pose>;
export type PoseName = keyof typeof POSES;
const mixN = (a: number, b: number, t: number) => a + (b - a) * t;
/** Between two poses the club swings round the hands, the short way, rather than sliding
 *  through the body */
export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const h: Vec = [mixN(a.h[0], b.h[0], t), mixN(a.h[1], b.h[1], t)];
  const ra = Math.atan2(a.c[1] - a.h[1], a.c[0] - a.h[0]);
  const rb = Math.atan2(b.c[1] - b.h[1], b.c[0] - b.h[0]);
  const turn = Math.atan2(Math.sin(rb - ra), Math.cos(rb - ra));
  const r = ra + turn * t;
  const len = mixN(Math.hypot(a.c[0] - a.h[0], a.c[1] - a.h[1]), Math.hypot(b.c[0] - b.h[0], b.c[1] - b.h[1]), t);
  return {
    h,
    c: [h[0] + Math.cos(r) * len, h[1] + Math.sin(r) * len],
    bend: mixN(a.bend, b.bend, t),
    turn: mixN(a.turn, b.turn, t),
    wt: mixN(a.wt, b.wt, t),
    up: mixN(a.up, b.up, t),
    putter: a.putter,
    step: t < 0.5 ? a.step : b.step,
  };
}

const K = {
  cap: '#7a6447',
  capLt: '#957b58',
  capDk: '#4e3f2b',
  skin: '#ebc39b',
  skinDk: '#c99a74',
  hair: '#4a3626',
  collar: '#fbf6ea',
  jump: '#c0452b',
  jumpLt: '#df6a43',
  jumpDk: '#8f2f1c',
  belt: '#4a3626',
  trou: '#f1e9d3',
  trouDk: '#cdbf9c',
  shoe: '#3a2a1e',
  glove: '#fbf8ee',
  shaft: '#a49f92',
  head: '#4e4a43',
  bag: '#7a4a24',
  bagDk: '#56331a',
  bagLt: '#9a6436',
  line: '#33401f',
};

export type Golfer =
  | { kind: 'swing'; pose: Pose }
  | { kind: 'walk'; phase: number; bag: boolean; bow?: boolean };

type Put = (dx: number, dy: number, col: string, w?: number, h?: number) => void;
type Draw = (x0: number, y0: number, x1: number, y1: number, col: string) => void;

// The head under a flat cap, its crown at (hx, hy): side on, the brim tipped down when the
// eyes are on the ball; or from behind, looking off after it
function head(px: Put, hx: number, hy: number, down: number, back: boolean) {
  if (back) {
    // The back of the head is hair under the cap, an ear at the edge as it turns to look
    // after the ball, and the neck
    px(hx - 1, hy, K.hair, 4, 2);
    px(hx + 2, hy + 1, K.skin);
    px(hx - 1, hy + 2, K.hair);
    px(hx, hy + 2, K.skinDk, 2, 1);
  } else {
    px(hx - 1, hy, K.hair, 1, 3);
    px(hx, hy, K.skinDk, 1, 3);
    px(hx + 1, hy, K.skin, 2, 3);
    px(hx + 3, hy + 1, K.skin);
    px(hx + 2, hy + 1, K.hair);
  }
  px(hx - 1, hy - 1, K.cap, 4, 1);
  px(hx, hy - 2, K.capLt, 3, 1);
  // From behind, the crown wider and the brim's tip past it
  if (back) {
    px(hx - 2, hy - 1, K.capDk);
    px(hx - 1, hy - 2, K.cap);
    px(hx + 3, hy - 1, K.capDk);
  }
  else px(hx + 3, hy - 1 + down, K.capDk, 2, 1);
}

// The golfer over the ball, in a pose
function swinger(px: Put, line: Draw, p: Pose) {
  const r = Math.round;
  const b = clamp(p.bend, -1, 1);
  const t = clamp(p.turn, -1, 1);
  const w = clamp(p.wt, -1, 1);

  // Legs: knees flexed at the ball. The weight going through kicks the back knee in and
  // brings its heel up; going back, the front knee comes in
  const heel = w > 0.55;
  // Fallen back on the back foot, the front one comes up off the ground
  const lift = w < -0.9;
  // Each leg in three pairs of rows, two wide: thigh, knee, shin. Over the ball the seat
  // goes back and the thighs with it, the shins stood over the feet
  const bk = r(Math.max(0, b) * 0.7);
  const leg = (thigh: number, knee: number, ankle: number, col: string, toe = false) => {
    px(thigh, -6, col, 2, 2);
    px(r(knee), -4, col, 2, 2);
    px(ankle, -2, col, 2, toe ? 1 : 2);
  };
  px(-bk, -6, K.trouDk, 1, 2);
  const st = p.step ?? 0;
  leg(1 - bk, 1 + Math.max(0, -w) * 1.2 + st / 2, (lift ? 2 : 1) + st, K.trou, lift);
  leg(-2 - bk, -2 + Math.max(0, w) * 2.6, heel ? 0 : -2, K.trouDk, heel);
  // Up on the toe of the back foot, or flat
  if (heel) px(0, -1, K.shoe, 2, 1);
  else px(-3, 0, K.shoe, 3, 1);
  if (lift) px(2, -1, K.shoe, 3, 1);
  else px(1 + st, 0, K.shoe, 3, 1);
  px(-2 - bk, -7, K.belt, 5, 1);

  // The spine tips over the ball: the shoulders are a row lower and two along when bent
  const sY = -12 - r((1 - Math.abs(b)) * 2);
  const along = (y: number) => r((b * 2 * (-8 - y)) / (-8 - sY));
  const top = along(sY);
  const wide = Math.abs(t) > 0.45;
  // The shoulders: side on, one behind the other; turned, spread across
  const lead: Vec = [top + 0.5 - 1.5 * t, sY + 1];
  const trail: Vec = [top + 0.5 + 1.5 * t, sY + 1];
  const h: Vec = [r(p.h[0]), r(p.h[1])];
  const c: Vec = [r(p.c[0]), r(p.c[1])];

  const club = () => {
    line(h[0], h[1], c[0], c[1], K.shaft);
    if (p.putter) px(c[0] - 1, c[1], K.head, 3, 1);
    else if (c[1] >= -2) px(c[0], c[1], K.head, 2, 1);
    else px(c[0], c[1] - 1, K.head, 1, 2);
  };
  // An arm, straight when it can reach, the elbow folding down when it can't
  const arm = (s: Vec, col: string, give: boolean) => {
    const dx = h[0] - s[0];
    const dy = h[1] - s[1];
    const d = Math.hypot(dx, dy);
    const L = 3.4;
    if (!give || d >= 2 * L - 0.6 || d < 0.5) {
      line(s[0], s[1], h[0], h[1], col);
      return;
    }
    const m = Math.sqrt(Math.max(0, L * L - (d / 2) ** 2));
    const n: Vec = dx / d >= 0 ? [-dy / d, dx / d] : [dy / d, -dx / d];
    const e: Vec = [s[0] + dx / 2 + n[0] * m, s[1] + dy / 2 + n[1] * m];
    line(s[0], s[1], e[0], e[1], col);
    line(e[0], e[1], h[0], h[1], col);
  };
  const leadArm = () => arm(lead, K.jumpDk, false);
  const trailArm = () => arm(trail, K.jump, true);

  // What's behind the body goes down first: at the top and the finish the club, across
  // behind the head; turned through, the arms, out in front of a chest we can't see
  if (t < -0.55 || t > 0.7) club();
  if (t > 0.3) {
    leadArm();
    trailArm();
  } else if (t >= -0.3) leadArm();

  // The jumper
  for (let y = -8; y >= sY; y--) {
    const d = along(y);
    const x0 = d - 2;
    const x1 = d + (wide ? 2 : 1);
    // Turned away, the side from the sun is wider in shade
    const dk = t > 0.45 ? x0 + 1 : x0;
    for (let x = x0; x <= x1; x++) px(x, y, x <= dk ? K.jumpDk : x === x1 ? K.jumpLt : K.jump);
  }
  // The collar: a V at the front, the band round the neck side on, none from behind
  if (t < -0.45) {
    px(top - 1, sY, K.collar, 3, 1);
    px(top, sY + 1, K.collar);
  } else if (t <= 0.45 || p.up <= 0.5) px(top, sY, K.collar, 2, 1);

  // The head stays where it was over the ball until the swing's gone through
  const back = t > 0.45 && p.up > 0.5;
  head(px, top, sY - 3, p.up > 0.5 ? 0 : r(Math.max(0, b)), back);

  if (t >= -0.55 && t <= 0.7) club();
  if (t < -0.3) {
    leadArm();
    trailArm();
  } else if (t <= 0.3) trailArm();
  // The hands on the grip
  px(h[0], h[1], K.glove);
  px(h[0], h[1] + 1, K.skin);
}

export function drawGolfer(g: Ctx, x: number, y: number, face: 1 | -1, st: Golfer) {
  // Pixels by position, later ones over earlier ones; then an outline round the lot
  const pix = new Map<number, string>();
  const key = (dx: number, dy: number) => (dy + 64) * 256 + (dx + 128);
  const px = (dx: number, dy: number, col: string, w = 1, h = 1) => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) pix.set(key(Math.round(dx) + i, Math.round(dy) + j), col);
  };
  const line = (x0: number, y0: number, x1: number, y1: number, col: string) => {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (let i = 0; i < 64; i++) {
      px(x0, y0, col);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e;
      if (e2 >= dy) {
        e += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        e += dx;
        y0 += sy;
      }
    }
  };

  if (st.kind === 'swing') swinger(px, line, st.pose);
  else {
    // Walking with the head down: leaning in, as over a ball, and the arm hanging
    const bow = st.bow;
    const b = bow ? 1 : 0;
    const ph = st.phase & 3;
    const o = ph === 1 || ph === 3 ? -1 : 0;
    // The bag over the shoulder goes behind everything
    if (st.bag) {
      line(-3, -14 + o, -5, -5 + o, K.bagDk);
      line(-2, -14 + o, -4, -5 + o, K.bag);
      px(-4, -9 + o, K.bagLt);
      px(-3, -15 + o, K.head);
      px(-2, -16 + o, K.shaft);
      px(-4, -16 + o, K.head);
    }
    // Legs, striding
    const s = ph === 1 ? 1 : ph === 3 ? -1 : 0;
    line(-1, -6 + o, -1 - s * 2, -1, K.trouDk);
    line(0, -6 + o, -s * 2, -1, K.trouDk);
    line(1, -6 + o, 1 + s * 2, -1, K.trou);
    line(2, -6 + o, 2 + s * 2, -1, K.trou);
    px(-2 - s * 2, 0, K.shoe, 2, 1);
    px(1 + s * 2, 0, K.shoe, 3, 1);
    px(-2, -7 + o, K.belt, 5, 1);
    // The jumper
    px(-2, -9 + o, K.jumpDk, 1, 2);
    px(-1, -9 + o, K.jump, 3, 2);
    px(2, -9 + o, K.jumpLt, 1, 2);
    px(-2 + b, -12 + o, K.jumpDk, 1, 3);
    px(-1 + b, -12 + o, K.jump, 3, 3);
    px(2 + b, -12 + o, K.jumpLt, 1, 3);
    px(0 + b, -12 + o, K.collar, 2, 1);
    head(px, b ? 2 : 0, (b ? -15 : -16) + o, b, false);
    // The near arm swings
    const a = bow ? 0 : s;
    line(1, -11 + o, 1 + a, -8 + o, K.jumpDk);
    px(1 + a, -7 + o, K.skin);
  }

  const X = (dx: number) => (face > 0 ? x + dx : x - dx);
  // The outline: every empty neighbour of the figure, once
  g.fillStyle = 'rgba(40,46,22,0.6)';
  const done = new Set<number>();
  for (const k of pix.keys()) {
    const dx = (k % 256) - 128;
    const dy = Math.floor(k / 256) - 64;
    for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nk = key(dx + ax, dy + ay);
      if (pix.has(nk) || done.has(nk)) continue;
      done.add(nk);
      g.fillRect(X(dx + ax), y + dy + ay, 1, 1);
    }
  }
  for (const [k, col] of pix) {
    const dx = (k % 256) - 128;
    const dy = Math.floor(k / 256) - 64;
    g.fillStyle = col;
    g.fillRect(X(dx), y + dy, 1, 1);
  }
}

/** The bag, stood up behind the golfer while they play */
export function drawBag(g: Ctx, x: number, y: number) {
  g.fillStyle = 'rgba(40,46,22,0.6)';
  g.fillRect(x - 1, y - 8, 5, 9);
  g.fillStyle = K.bagDk;
  g.fillRect(x, y - 7, 1, 8);
  g.fillStyle = K.bag;
  g.fillRect(x + 1, y - 7, 2, 8);
  g.fillStyle = K.bagLt;
  g.fillRect(x, y - 4, 3, 1);
  g.fillStyle = K.head;
  g.fillRect(x, y - 9, 1, 2);
  g.fillRect(x + 2, y - 8, 1, 1);
  g.fillStyle = K.shaft;
  g.fillRect(x + 1, y - 10, 1, 3);
}

// A small figure: the gallery, the four-ball
export function drawPerson(g: Ctx, x: number, y: number, body: string, lift = 0, wave = -1) {
  const px = (dx: number, dy: number, col: string, w = 1, h = 1) => {
    g.fillStyle = col;
    g.fillRect(x + dx, y + dy - lift, w, h);
  };
  g.fillStyle = 'rgba(38,44,24,0.45)';
  g.fillRect(x - 2, y - 6 - lift, 5, 7);
  px(-1, -1, '#3a3530', 1, 2);
  px(1, -1, '#3a3530', 1, 2);
  px(-1, -4, body, 3, 3);
  px(1, -4, 'rgba(255,240,210,0.25)', 1, 3);
  px(0, -6, '#ebc39b', 1, 2);
  px(-1, -6, '#4a3626', 1, 1);
  if (wave >= 0) px(2, wave ? -7 : -5, '#ebc39b', 1, 2);
}

export function drawHeron(g: Ctx, x: number, y: number, frame: number) {
  const px = (dx: number, dy: number, col: string, w = 1, h = 1) => {
    g.fillStyle = col;
    g.fillRect(x + dx, y + dy, w, h);
  };
  if (frame < 0) {
    // Standing in the shallows
    px(0, -3, '#56514b', 1, 3);
    px(-1, -6, '#8f989b', 4, 3);
    px(0, -6, '#b4bcbe', 3, 1);
    px(2, -9, '#c3c9cb', 1, 3);
    px(2, -10, '#dfe3e4', 2, 1);
    px(4, -10, '#d8a23a', 2, 1);
    px(-2, -5, '#6c767a', 1, 2);
    return;
  }
  // In flight: wings up, then down
  px(-2, -2, '#8f989b', 5, 2);
  px(3, -3, '#c3c9cb', 2, 1);
  px(5, -3, '#d8a23a', 1, 1);
  px(-4, -1, '#56514b', 2, 1);
  if (frame % 2) {
    px(-1, -5, '#7d878b', 2, 3);
    px(0, -6, '#9aa3a6', 2, 1);
  } else {
    px(-1, 0, '#7d878b', 3, 2);
  }
}

// The flag, flapping on three frames
const FLAG_FRAMES = [
  ['####.', '#####', '##+..'],
  ['###..', '#####', '##++.'],
  ['####.', '####+', '#+...'],
];
export function drawFlag(g: Ctx, x: number, y: number, frame: number, live: boolean, dir: 1 | -1 = 1) {
  g.fillStyle = 'rgba(38,44,24,0.5)';
  g.fillRect(x - 1, y - 12, 1, 12);
  g.fillStyle = '#f4efe0';
  g.fillRect(x, y - 12, 1, 12);
  g.fillStyle = '#d5cfbd';
  g.fillRect(x, y - 4, 1, 4);
  const rows = FLAG_FRAMES[frame % 3];
  const hi = live ? '#e0461c' : '#c9512f';
  const lo = live ? '#a8300f' : '#9a4a33';
  rows.forEach((r, j) =>
    [...r].forEach((ch, i) => {
      if (ch === '.') return;
      g.fillStyle = ch === '#' ? hi : lo;
      g.fillRect(dir > 0 ? x + 1 + i : x - 1 - i, y - 12 + j, 1, 1);
    }),
  );
  g.fillStyle = '#26301c';
  g.fillRect(x - 1, y, 3, 1);
}

// ---------------------------------------------------------------------------------------
// The board

export type GroundMode = 'quiet' | 'play' | 'all';
type Particle = { x: number; y: number; z: number; vx: number; vy: number; vz: number; t0: number; life: number; col: string; drag?: number };
type Ring = { x: number; y: number; t0: number; life: number; r0: number; r1: number; col: string };

const TREES: Vec[] = COURSE.holes.flatMap((h) => h.trees.map((t) => t.c));
export const HAZARD_TREES = TREES;

// ---------------------------------------------------------------------------------------
// Views: the table as a whole, or one hole framed to fill the board

/** A hole's island, in the plate's pixels: the ground within r of its spine (tee, down the
 *  fairway, to the green), fading out short of the board's edges (l, t, w, h) */
export type Island = { spine: Vec[]; r: number; l: number; t: number; w: number; h: number };
export type View = { key: string; n: number; a: number; zk: number; island: Island | null; origin: Vec | null };

export const OVERVIEW_VIEW: View = { key: 'all', n: 0, a: OVERVIEW.a, zk: OVERVIEW.zk, island: null, origin: null };

// The rope: where the gallery stands on each hole, off the line of play. The 12th's is
// the course's own
export const ROPE: readonly (readonly Vec[])[] = [
  [[140, 122], [146, 127], [142, 132]],
  COURSE.gallery,
  [[356, 176], [364, 180], [372, 177]],
];

// The island: its rim hazed, then dithered away. 0 on the spine, 1 where it's gone
const PAD = 12; // ground round a hole, in board pixels, for the rim to fade in
const HEAD = 16; // room over a hole for the trees, the flags and a ball in the air
const EDGE = 30; // the ground thins out this far in from the board's edges
const SPREAD = 1.45; // the most one hole may be drawn denser than the least dense
const A_MAX = 1.8;
function isleD(i: Island, px: number, py: number) {
  const m = Math.min(px - i.l, i.l + i.w - px, py - i.t, i.t + i.h - py);
  return Math.max(lineDist([px, py], i.spine) / i.r, 1 - m / EDGE);
}

// What a hole needs in view, in iso units at a density of one
type UBox = { l: number; r: number; t: number; b: number };
const uboxes = new Map<number, UBox>();
function ubox(n: number): UBox {
  const hit = uboxes.get(n);
  if (hit) return hit;
  const h = COURSE.holes[n - 1];
  const b = { l: Infinity, r: -Infinity, t: Infinity, b: -Infinity };
  const add = (p: Vec, r = 0) => {
    const X = p[1] - (W - p[0]);
    const Y = (p[1] + (W - p[0])) / 2;
    const e = r * Math.SQRT2;
    b.l = Math.min(b.l, X - e);
    b.r = Math.max(b.r, X + e);
    b.t = Math.min(b.t, Y - e / 2);
    b.b = Math.max(b.b, Y + e / 2);
  };
  // The tee, with the four-ball waiting behind it
  add(h.tee, 22);
  add(h.green.c, Math.hypot(h.green.rx, h.green.ry) + 6);
  if (h.fairway) for (const p of h.fairway.pts) add(p, h.fairway.r + 4);
  for (const k of h.bunkers) add(k.c, Math.max(k.rx, k.ry) + 3);
  for (const t of h.trees) add(t.c, t.r + 3);
  for (const o of h.lines?.options ?? []) add(o.at, 8);
  for (const p of ROPE[n - 1]) add(p, 6);
  uboxes.set(n, b);
  return b;
}

/** Hole n on its own: as dense as fits the board, but never much denser than the others,
 *  so the short hole doesn't loom; centred, with room over it */
export function holeView(n: number, lw: number, lh: number): View {
  const fit = (k: number) => {
    const b = ubox(k);
    return Math.min((lw - 2 * PAD - 2) / (b.r - b.l), (lh - HEAD - 2 * PAD) / (b.b - b.t));
  };
  const least = Math.min(fit(1), fit(2), fit(3));
  const a = Math.min(fit(n), least * SPREAD, A_MAX);
  const b = ubox(n);
  const cx = ((b.l + b.r) * a) / 2;
  const cy = ((b.t + b.b) * a) / 2;
  const origin: Vec = [Math.round(lw / 2 - cx), Math.round(HEAD + (lh - HEAD) / 2 - cy)];
  // The spine, and far enough round it for everything on the hole to stand clear of the rim
  const h = COURSE.holes[n - 1];
  const px = (p: Vec): Vec => [(p[1] - (W - p[0])) * a, ((p[1] + (W - p[0])) * a) / 2];
  const spine = [h.tee, ...(h.fairway ? h.fairway.pts.slice(1) : []), h.green.c].map(px);
  let r = 0;
  const reach = (p: Vec, rr: number) => (r = Math.max(r, lineDist(px(p), spine) + rr * a));
  reach(h.green.c, Math.max(h.green.rx, h.green.ry) + 6);
  for (const k of h.bunkers) reach(k.c, Math.max(k.rx, k.ry) + 3);
  for (const t of h.trees) reach(t.c, t.r + 3);
  for (const o of h.lines?.options ?? []) reach(o.at, 8);
  for (const p of ROPE[n - 1]) reach(p, 6);
  r = Math.max(r + PAD, 40) / 0.8;
  // The ground stops short of the top, for what stands up there, and of the foot, for the hint
  const island = { spine, r, l: -origin[0], t: -origin[1] + HEAD - 6, w: lw, h: lh - HEAD + 6 - 8 };
  // A ball in the air rises with the density, a little less than the ground does
  return { key: `${n}:${lw}x${lh}`, n, a, zk: Math.max(OVERVIEW.zk, a * 0.85), island, origin };
}

// ---------------------------------------------------------------------------------------
// The mini map in the hole panel: the three holes, a few pixels each, the one in play lit

const MINI_A = 0.034;
export const MINI = { w: Math.ceil(860 * MINI_A) + 2, h: Math.ceil(430 * MINI_A) + 2 };
export function drawMini(cv: HTMLCanvasElement, current: number) {
  if (cv.width !== MINI.w) {
    cv.width = MINI.w;
    cv.height = MINI.h;
  }
  const g = cv.getContext('2d')!;
  const img = g.createImageData(MINI.w, MINI.h);
  const d = img.data;
  const ox = W * MINI_A + 1;
  // Which hole a point belongs to: the nearest whose frame holds it
  const owner = (p: Vec) => {
    let best = 0;
    let bd = Infinity;
    COURSE.holes.forEach((h, i) => {
      const f = h.frame;
      if (p[0] < f[0] || p[0] > f[2] || p[1] < f[1] || p[1] > f[3]) return;
      const dd = Math.hypot(p[0] - (f[0] + f[2]) / 2, p[1] - (f[1] + f[3]) / 2);
      if (dd < bd) {
        bd = dd;
        best = i + 1;
      }
    });
    return best;
  };
  for (let y = 0; y < MINI.h; y++)
    for (let x = 0; x < MINI.w; x++) {
      const a = (x + 0.5 - ox) / MINI_A;
      const b = ((y + 0.5 - 1) * 2) / MINI_A;
      const p: Vec = [W - (b - a) / 2, (a + b) / 2];
      if (!onPlate(p)) continue;
      // Pale land, the holes on it in green, grown so each is a pixel or two wide; the
      // one in play darker, the others faded
      const k = owner(p);
      const on = k === current;
      let col: RGB = (x + y) & 1 ? [226, 219, 188] : [221, 214, 182];
      if (COURSE.water.some((w) => (isCapsule(w) ? lineDist(p, w.pts) <= w.r + 4 : inEllipse(w, p, 4)))) col = on ? [84, 146, 152] : [150, 184, 180];
      else
        for (const h of COURSE.holes) {
          const fair = h.fairway ? lineDist(p, h.fairway.pts) <= h.fairway.r + 4 : lineDist(p, [h.tee, h.green.c]) <= 7;
          if (inEllipse(h.green, p, 8)) col = on ? [62, 140, 52] : [158, 182, 128];
          else if (fair) col = on ? [104, 172, 70] : [178, 196, 146];
          else continue;
          break;
        }
      const i = (y * MINI.w + x) * 4;
      d[i] = col[0];
      d[i + 1] = col[1];
      d[i + 2] = col[2];
      d[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  // The flag on the hole in play
  const h = COURSE.holes[current - 1];
  if (h) {
    const fx = Math.round(ox + (h.cup[1] - (W - h.cup[0])) * MINI_A);
    const fy = Math.round(1 + ((h.cup[1] + (W - h.cup[0])) * MINI_A) / 2);
    g.fillStyle = '#e0461c';
    g.fillRect(fx, fy - 3, 2, 1);
    g.fillStyle = '#26211a';
    g.fillRect(fx, fy - 3, 1, 3);
  }
}

export function createBoard(cv: HTMLCanvasElement) {
  const g = cv.getContext('2d', { alpha: true })!;
  // The ground's own canvas, with the plate's origin at (GX, GY); for a hole, just its
  // island. The view it was drawn for, and the island, if there is one
  let GX = 182;
  let GY = 2;
  let GW = 262;
  let GH = 142;
  let [ground, gg] = canvas(GW, GH);
  let [prev, pg] = canvas(GW, GH);
  let isle: Island | null = null;
  let viewKey = 'all';
  // A new view dithers in over the old one's going
  let viewT0 = -1e9;
  let fade = { t0: -1e9, ms: 700 };
  let lw = 300;
  let lh = 174;
  let scale = 3;
  // The plate's origin in the canvas, and its eased moves
  let ox = 150;
  let oy = 22;
  let pan: { fx: number; fy: number; tx: number; ty: number; t0: number; ms: number } | null = null;
  let shakeT0 = -1e9;
  let shakeAmp = 0;

  const oaks = [oak(3, 1), oak(4, 2), oak(5, 3), oak(4, 5)];
  const pines = [pine(3), pine(4)];
  const houseSp = house();
  // Decor that would stand in front of a tee is left out, so the golfer is never hidden
  const decor = COURSE.decor.filter((d) => COURSE.holes.every((h) => Math.hypot(d[0] - h.tee[0], d[1] - h.tee[1]) > 44));
  const tallPines = [pine(4), pine(5)];
  const allTrees: Vec[] = [...TREES, ...decor, ...COURSE.pines];
  // Every tree, and which sprite it gets: hazard trees are round, the decor mixes in
  // pines, and the tall pines line the holes
  const treeSp: Sprite[] = [
    ...TREES.map((_, i) => oaks[i % 3]),
    ...decor.map((_, i) => (i % 3 === 1 ? pines[i % 2] : oaks[(i + 1) % 4])),
    ...COURSE.pines.map((_, i) => tallPines[i % 2]),
  ];
  const bloomSp = [blossom(1), blossom(2), blossom(3)];
  const bridgeSp = bridge();
  const signs = COURSE.holes.map((h) => teeSign(h.n + 10));

  // Water pixels, for the shimmer
  let waterPx: number[] = [];

  // On a hole's island: whether the ground at a plate pixel is drawn, dithered at the rim
  const shown = (px: number, py: number, x: number, y: number) => !isle || clamp((1 - isleD(isle, px, py)) / 0.12, 0, 1) > bayer(x, y);
  // And whether something standing there is: all of it or none, short of the rim
  const standsAt = (px: number, py: number) => !isle || isleD(isle, px, py) < 0.9;
  // The gallery for the view: the hole's own rope, or the course's on the whole table
  let ropeN = 0;
  const gallery = () => (ropeN ? ROPE[ropeN - 1] : COURSE.gallery);

  /** Draw the ground: the surfaces, the light on the hole in play, the sides, the shadows */
  function renderGround(mode: GroundMode, focus: number) {
    pg.clearRect(0, 0, GW, GH);
    pg.drawImage(ground, 0, 0);
    const img = gg.createImageData(GW, GH);
    const d = img.data;
    const code = new Array<string>(GW * GH);
    const pts = new Array<Vec | null>(GW * GH);
    for (let y = 0; y < GH; y++)
      for (let x = 0; x < GW; x++) {
        const p = unIso(x - GX + 0.5, y - GY + 0.5);
        const i = y * GW + x;
        if (onPlate(p) && shown(x - GX + 0.5, y - GY + 0.5, x, y)) {
          pts[i] = p;
          code[i] = surface(p);
        } else {
          pts[i] = null;
          code[i] = '';
        }
      }
    const fr = focus ? COURSE.holes[focus - 1].frame : null;
    waterPx = [];
    for (let y = 0; y < GH; y++)
      for (let x = 0; x < GW; x++) {
        const i = y * GW + x;
        const p = pts[i];
        let col: RGB | null = null;
        if (p) {
          const c = code[i];
          const rk = RANK[c];
          const lower = (j: number) => j >= 0 && j < GW * GH && code[j] !== '' && RANK[code[j]] < rk;
          const edge = rk > 0 && (lower(i - 1) || lower(i + 1) || lower(i - GW) || lower(i + GW));
          const stripe = Math.floor((p[0] + p[1]) / 14) & 1;
          switch (c) {
            case 'w': {
              col = edge ? G.waterEdge : G.water[Math.floor((p[0] - p[1] * 0.4) / 9) & 1];
              if (!edge) waterPx.push(x, y);
              break;
            }
            case 'b':
              col = edge ? G.sandLip : hash(x, y) > 0.82 ? G.sandDk : G.sand;
              // The lip on the sunny side throws a little shade into the sand
              if (!edge && code[i - 1] !== 'b' && code[i - 1] !== undefined) col = G.sandDk;
              break;
            case 'g':
              col = edge ? G.greenEdge : G.green[Math.floor((p[0] + p[1]) / 6) & 1];
              break;
            case 'f':
              col = edge ? G.fairEdge : G.fringe;
              break;
            case 't':
              col = edge ? G.fairEdge : (x + y) & 1 ? G.tee : mul(G.tee, 0.96);
              break;
            case 'a':
              col = edge ? G.fairEdge : G.fair[stripe];
              break;
            case 'e':
              col = (Math.floor(p[0] / 4) + Math.floor(p[1] / 3)) & 1 ? G.pave : G.paveDk;
              break;
            case 'p':
              col = (x + y) % 4 === 0 ? G.rough[stripe] : G.path;
              break;
            default: {
              col = G.rough[stripe];
              const n = hash(x, y);
              if (n > 0.9) col = G.roughDk;
              else if (n < 0.06) col = G.roughLt;
            }
          }
          // The first hole falls away from its tee: lit at the top, a shade lower by the pond
          if (c !== 'w' && p[0] < 176 && p[1] > 70) {
            const h1 = COURSE.holes[0];
            const t = clamp((h1.tee[1] - p[1]) / (h1.tee[1] - h1.green.c[1]), 0, 1);
            col = mul(col, 1.05 - 0.11 * t);
          }
          // The far edges catch the light
          if (y > 0 && !pts[i - GW]) col = mix(col, [236, 232, 190], 0.35);
          // Warmer towards the sun, which is low and off to the right
          const s = clamp((p[1] - (W - p[0]) + W) / (W + H), 0, 1);
          col = [col[0] * (1 + 0.05 * s) + 12 * s, col[1] * (1 + 0.03 * s) + 6 * s, col[2]];
          // The light: a pool on the hole in play, dithered at its edge; the rest quieter
          let lit = 1;
          if (mode === 'quiet') lit = 0.25;
          else if (isle) {
            // On a hole's island the rim is hazed, dithered, before it goes altogether
            const dd = isleD(isle, x - GX + 0.5, y - GY + 0.5);
            lit = clamp((0.94 - dd) / 0.22, 0, 1) > bayer(x, y) ? 1 : 0;
          } else if (fr) {
            const cx = (fr[0] + fr[2]) / 2;
            const cy = (fr[1] + fr[3]) / 2;
            const rx = (fr[2] - fr[0]) / 2 + 16;
            const ry = (fr[3] - fr[1]) / 2 + 16;
            const dd = Math.hypot((p[0] - cx) / rx, (p[1] - cy) / ry);
            lit = clamp((1.08 - dd) / 0.26, 0, 1);
            lit = lit > bayer(x, y) ? 1 : 0;
          }
          if (lit >= 1) col = mode === 'play' ? [col[0] * 1.04 + 8, col[1] * 1.03 + 5, col[2] * 0.98] : col;
          else col = mix(mul(col, mode === 'quiet' ? 0.94 : 0.9), G.haze, mode === 'quiet' ? 0.22 : 0.2);
        } else {
          // The sides: a lip of grass, then soil in layers, lit on the face towards the sun
          for (let dd = 1; dd <= T; dd++) {
            if (!shown(x - GX + 0.5, y - GY + 0.5, x, y)) break;
            const sp = unIso(x - GX + 0.5, y - GY + 0.5 - dd);
            if (!onPlate(sp)) continue;
            const right = H - sp[1] < sp[0];
            const L = (lit: RGB, dark: RGB) => (right ? lit : dark);
            if (dd === 1) col = L([128, 164, 84], [98, 130, 66]);
            else if (dd === 2) col = L([104, 78, 50], [80, 60, 40]);
            else if (dd === T) col = L([88, 66, 44], [66, 50, 34]);
            else {
              col = L([150, 114, 74], [116, 88, 58]);
              if (dd === 5) col = mul(col, 0.9);
              if (hash(x, y, 3) > 0.9) col = mul(col, 1.12);
            }
            if (mode === 'quiet') col = mix(col, G.haze, 0.15);
            break;
          }
        }
        if (col) {
          const k = i * 4;
          d[k] = col[0];
          d[k + 1] = col[1];
          d[k + 2] = col[2];
          d[k + 3] = 255;
        }
      }
    // Long shadows, raked left by the low sun
    const shade = (sx: number, sy: number, len: number, h: number, k = 0.8) => {
      for (let dx = 1; dx <= len; dx++)
        for (let dy = 0; dy < h; dy++) {
          const x = Math.round(sx - dx);
          const y = Math.round(sy + dy + dx * 0.14);
          if (x < 0 || y < 0 || x >= GW || y >= GH) continue;
          const i = y * GW + x;
          if (!pts[i]) continue;
          // The tip of a shadow thins out, dithered
          if (dx > len * 0.7 && bayer(x, y) < (dx - len * 0.7) / (len * 0.3)) continue;
          const k4 = i * 4;
          d[k4] *= k;
          d[k4 + 1] *= k;
          d[k4 + 2] *= k * 0.96;
        }
    };
    const at = (p: Vec): Vec => [GX + isoX(p[0], p[1]), GY + isoY(p[0], p[1])];
    // Only what's stood on the ground in view throws a shadow on it
    const stands = (p: Vec) => standsAt(isoX(p[0], p[1]), isoY(p[0], p[1]));
    allTrees.forEach((t, i) => {
      if (!stands(t)) return;
      const [sx, sy] = at(t);
      const sp = treeSp[i];
      shade(sx - 1, sy - 1, Math.round(sp.c.height * 1.1), 3);
    });
    for (const h of COURSE.holes) {
      if (!stands(h.cup)) continue;
      const [sx, sy] = at(h.cup);
      shade(sx, sy, 12, 1, 0.82);
    }
    const house: Vec = [COURSE.terrace[0] + 30, COURSE.terrace[1] + 10];
    if (stands(house)) {
      const [sx, sy] = at(house);
      shade(sx - 4, sy - 6, 22, 8, 0.82);
    }
    for (const p of gallery()) {
      if (!stands(p)) continue;
      const [sx, sy] = at(p);
      shade(sx, sy, 7, 1, 0.84);
    }
    for (const p of COURSE.blooms) {
      if (!stands(p)) continue;
      const [sx, sy] = at(p);
      shade(sx - 2, sy - 1, 7, 2, 0.84);
    }
    gg.putImageData(img, 0, 0);
  }

  /** Look at the table another way: the ground is drawn again for it, and comes in
   *  dithered when animate. Returns whether anything changed */
  function setView(v: View, now: number, animate: boolean) {
    if (v.key === viewKey) return false;
    viewKey = v.key;
    view.a = v.a;
    view.zk = v.zk;
    isle = v.island;
    ropeN = v.n;
    if (isle) {
      GX = -isle.l;
      GY = -isle.t;
      GW = isle.w;
      GH = isle.h;
    } else {
      GX = 182;
      GY = 2;
      GW = 262;
      GH = 142;
    }
    if (ground.width !== GW || ground.height !== GH) {
      [ground, gg] = canvas(GW, GH);
      [prev, pg] = canvas(GW, GH);
    }
    groundKey = '';
    viewT0 = animate ? now : -1e9;
    if (v.origin) place(v.origin[0], v.origin[1], 0, now);
    // Effects were made in the old view's pixels
    parts = [];
    rings = [];
    bloom = null;
    return true;
  }

  let groundKey = '';
  function setGround(mode: GroundMode, focus: number, now: number, animate = true) {
    const key = `${mode}:${focus}`;
    if (key === groundKey) return;
    const first = groundKey === '';
    groundKey = key;
    renderGround(mode, focus);
    fade = { t0: first || !animate ? -1e9 : now, ms: 700 };
  }

  // ---------------------------------------------------------------------------------
  // Layout and moves

  function resize(w: number, h: number, s: number) {
    lw = w;
    lh = h;
    scale = s;
    if (cv.width !== w) cv.width = w;
    if (cv.height !== h) cv.height = h;
    g.imageSmoothingEnabled = false;
  }
  function place(x: number, y: number, ms: number, now: number) {
    if (ms <= 0) {
      ox = x;
      oy = y;
      pan = null;
      return;
    }
    pan = { fx: ox, fy: oy, tx: x, ty: y, t0: now, ms };
  }
  function stepPan(now: number) {
    if (!pan) return;
    const u = clamp((now - pan.t0) / pan.ms, 0, 1);
    const e = u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2;
    ox = pan.fx + (pan.tx - pan.fx) * e;
    oy = pan.fy + (pan.ty - pan.fy) * e;
    if (u >= 1) pan = null;
  }

  const sx = (p: Vec) => Math.round(ox + isoX(p[0], p[1]));
  const sy = (p: Vec) => Math.round(oy + isoY(p[0], p[1]));
  /** A course point in canvas pixels (whole), z in course units */
  const toPx = (p: Vec, z = 0): Vec => [sx(p), sy(p) - Math.round(z * view.zk)];
  /** A course point in CSS pixels, relative to the canvas */
  const toCss = (p: Vec, z = 0): Vec => {
    const [x, y] = toPx(p, z);
    return [(x + 0.5) * scale, (y + 0.5) * scale];
  };
  /** CSS pixels on the canvas to a course point, on the ground */
  const fromCss = (x: number, y: number): Vec => unIso(x / scale - ox, y / scale - oy);
  /** A screen offset in canvas pixels, as a course offset */
  const offset = (dx: number, dy: number): Vec => {
    const [x0, y0] = unIso(0, 0);
    const [x1, y1] = unIso(dx, dy);
    return [x1 - x0, y1 - y0];
  };

  // ---------------------------------------------------------------------------------
  // Effects

  let parts: Particle[] = [];
  let rings: Ring[] = [];
  const rockT: number[] = [];
  let bloom: { n: number; t0: number; ms: number } | null = null;

  function burst(kind: 'sand' | 'splash' | 'divot' | 'puff' | 'leaves' | 'turf' | 'gold' | 'clack', p: Vec, now: number, dir = 0) {
    const [x, y] = toPx(p);
    const add = (n: number, col: string | string[], sp: number, up: number, life: number, spread = Math.PI * 2, base = 0) => {
      for (let i = 0; i < n; i++) {
        const a = base + (spread >= Math.PI * 2 ? (i / n) * Math.PI * 2 + hash(i, n) : (hash(i, n, 7) - 0.5) * spread);
        const v = sp * (0.5 + hash(i, n, 3) * 0.7);
        parts.push({ x, y, z: 0, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.5, vz: up * (0.6 + hash(i, n, 5) * 0.6), t0: now, life: life * (0.7 + hash(i, n, 9) * 0.5), col: Array.isArray(col) ? col[i % col.length] : col });
      }
    };
    switch (kind) {
      case 'sand':
        add(14, ['#f2e2b4', '#dcc48a', '#fff3d0'], 0.03, 0.05, 520);
        rings.push({ x, y, t0: now, life: 360, r0: 1, r1: 5, col: '#e9d7a4' });
        break;
      case 'splash':
        rings.push({ x, y, t0: now, life: 700, r0: 1, r1: 7, col: '#e4f2ee' });
        rings.push({ x, y, t0: now + 140, life: 800, r0: 1, r1: 10, col: '#cfe6e0' });
        add(8, ['#e8f6f2', '#bfe0da'], 0.012, 0.075, 600);
        break;
      case 'divot':
        add(6, ['#6b4a2b', '#8a6a3c', '#5c9b45'], 0.035, 0.05, 460, 1.4, dir);
        break;
      case 'turf':
        add(5, ['#5c9b45', '#7a5a34', '#8fc463'], 0.02, 0.04, 380);
        break;
      case 'puff':
        rings.push({ x, y, t0: now, life: 300, r0: 1, r1: 4, col: '#f4f8e4' });
        break;
      case 'gold':
        rings.push({ x, y, t0: now, life: 380, r0: 2, r1: 9, col: '#f1c75a' });
        break;
      case 'clack':
        rings.push({ x, y: y - 6, t0: now, life: 240, r0: 1, r1: 5, col: '#fff6dc' });
        break;
      case 'leaves':
        for (let i = 0; i < 6; i++)
          parts.push({ x: x + Math.round((hash(i, 2) - 0.5) * 8), y, z: 8 + hash(i, 4) * 6, vx: (hash(i, 6) - 0.5) * 0.012, vy: 0, vz: -0.004, t0: now + i * 60, life: 1300, col: i % 2 ? '#5c9b45' : '#8fc463', drag: 1 });
        break;
    }
  }
  function rock(i: number, now: number) {
    rockT[i] = now;
  }
  function shake(amp: number, now: number) {
    shakeT0 = now;
    shakeAmp = amp;
  }
  function glowHole(n: number, now: number, ms = 1400) {
    bloom = { n, t0: now, ms };
  }

  function drawEllipse(cx: number, cy: number, rx: number, ry: number, col: string, dash = 0, phase = 0) {
    g.fillStyle = col;
    const n = Math.max(12, Math.round((rx + ry) * 3));
    let lastX = NaN;
    let lastY = NaN;
    for (let k = 0; k < n; k++) {
      if (dash && ((k + phase) % dash) * 2 >= dash) continue;
      const a = (k / n) * Math.PI * 2;
      const x = Math.round(cx + Math.cos(a) * rx);
      const y = Math.round(cy + Math.sin(a) * ry);
      if (x === lastX && y === lastY) continue;
      lastX = x;
      lastY = y;
      g.fillRect(x, y, 1, 1);
    }
  }

  // ---------------------------------------------------------------------------------
  // A frame

  type Item = { y: number; d: () => void };

  function draw(f: Frame) {
    const now = f.now;
    stepPan(now);
    g.clearRect(0, 0, lw, lh);
    if (f.cut) {
      f.cut(g, lw, lh);
      veil(f, now);
      return;
    }
    let shx = 0;
    let shy = 0;
    if (now - shakeT0 < 280 && !f.reduce) {
      const u = (now - shakeT0) / 280;
      const a = Math.round(shakeAmp * (1 - u));
      shx = (Math.floor(now / 40) & 1 ? 1 : -1) * a;
      shy = Math.floor(now / 60) & 1 ? Math.round(a / 2) : 0;
    }
    const OX = ox;
    const OY = oy;
    ox = Math.round(OX + shx);
    oy = Math.round(OY + shy);

    // The ground, and the old light fading out
    const gx = ox - GX;
    const gy = oy - GY;
    g.drawImage(ground, gx, gy);
    const fu = (now - fade.t0) / fade.ms;
    if (fu < 1 && !f.reduce) {
      g.globalAlpha = 1 - fu;
      g.drawImage(prev, gx, gy);
      g.globalAlpha = 1;
    }

    // The water, glinting
    if (!f.reduce) {
      g.fillStyle = '#c4e2dc';
      const tk = Math.floor(now / 220);
      for (let i = 0; i < waterPx.length; i += 2) {
        const x = waterPx[i];
        const y = waterPx[i + 1];
        if (hash(x, y, tk) > 0.988 || ((x * 2 + y * 3 + Math.floor(now / 90)) % 97 === 0 && hash(x, y) > 0.6)) g.fillRect(gx + x, gy + y, 1, 1);
      }
    }

    // A warm bloom on a holed green
    if (bloom) {
      const u = (now - bloom.t0) / bloom.ms;
      if (u >= 1) bloom = null;
      else {
        const h = COURSE.holes[bloom.n - 1];
        const [cx, cy] = toPx(h.green.c);
        const a = Math.sin(u * Math.PI);
        g.fillStyle = '#f8d77a';
        const rx = Math.round(h.green.rx * view.a * 1.3);
        const ry = Math.round(h.green.ry * view.a * 0.75);
        for (let y = -ry - 2; y <= ry + 2; y++)
          for (let x = -rx - 3; x <= rx + 3; x++) {
            const dd = Math.hypot(x / (rx + 2), y / (ry + 1.5));
            if (dd <= 1 && bayer(cx + x, cy + y) < a * (1 - dd) * 0.9) g.fillRect(cx + x, cy + y, 1, 1);
          }
      }
    }

    // Lines on the ground: the record's shots, ghosts, the aim
    if (f.record) drawRecord(f.record, now);
    if (f.ghost) drawFlight(f.ghost.pts, f.ghost.alpha, '#fff6dc', 2);
    if (f.aim) drawAim(f.aim, now);
    for (const c of f.chips) {
      const [x, y] = toPx(c.at);
      drawEllipse(x, y, 5, 2.5, c.on ? '#fff6dc' : 'rgba(255,246,220,0.6)', c.on ? 0 : 4, Math.floor(now / 160));
    }

    // Everything that stands up, back to front: on a hole, only what's on its island
    const items: Item[] = [];
    const seen = (q: Vec) => standsAt(sx(q) - ox, sy(q) - oy);
    allTrees.forEach((t, i) => {
      if (!seen(t)) return;
      const [x, y] = toPx(t);
      const sp = treeSp[i];
      // A gust through the trees now and then, when it's blowing
      const gust = !f.reduce && f.wind.level >= 2 && hash(i, Math.floor(now / 1300)) < (f.wind.level === 3 ? 0.12 : 0.05);
      const rk = rockT[i] != null && now - rockT[i] < 420 ? (Math.floor((now - rockT[i]) / 70) & 1 ? 1 : -1) : gust ? (Math.floor(now / 160) & 1 ? (f.wind.dx >= 0 ? 1 : -1) : 0) : 0;
      items.push({ y, d: () => g.drawImage(sp.c, x - sp.ax + rk, y - sp.ay) });
    });
    // The flags fly with the wind: faster the harder it blows, still when it's still
    const flap = [0, 300, 190, 120][f.wind.level];
    COURSE.holes.forEach((h, i) => {
      const [x, y] = toPx(h.cup);
      const fr = f.reduce || !flap ? 0 : Math.floor(now / flap + i * 2) % 3;
      if (seen(h.cup)) items.push({ y, d: () => drawFlag(g, x, y, fr, f.live === h.n, f.wind.dir) });
      const [tx, ty] = toPx(h.tee);
      const sg = signs[i];
      if (seen(h.tee)) items.push({ y: ty - 1, d: () => g.drawImage(sg.c, tx - 9 - sg.ax, ty - 1 - sg.ay) });
    });
    COURSE.blooms.forEach((b, i) => {
      if (!seen(b)) return;
      const [x, y] = toPx(b);
      const sp = bloomSp[i % 3];
      items.push({ y, d: () => g.drawImage(sp.c, x - sp.ax, y - sp.ay) });
    });
    if (seen(COURSE.bridge)) {
      const [x, y] = toPx(COURSE.bridge);
      items.push({ y: y - 3, d: () => g.drawImage(bridgeSp.c, x - bridgeSp.ax, y - bridgeSp.ay) });
    }
    // The ghost of a shot that went wrong, flying it again on the walk
    if (f.ghostBall) {
      const gb = f.ghostBall;
      const [x, y] = toPx(gb.p);
      items.push({
        y: y + 0.4,
        d: () => {
          g.globalAlpha = gb.a;
          g.fillStyle = 'rgba(36,44,22,0.3)';
          g.fillRect(x, y, 1, 1);
          g.fillStyle = '#fff6dc';
          g.fillRect(x, y - Math.round(gb.z * view.zk) - 1, 2, 2);
          g.globalAlpha = 1;
        },
      });
    }
    const housePt: Vec = [COURSE.terrace[0] + 30, COURSE.terrace[1] + 10];
    if (seen(housePt)) {
      const [x, y] = toPx(housePt);
      items.push({ y, d: () => g.drawImage(houseSp.c, x - houseSp.ax, y - houseSp.ay) });
    }
    const bodies = ['#8a3b2a', '#2f4a6b', '#5b6b3a'];
    gallery().forEach((p, i) => {
      if (!seen(p)) return;
      const [x, y] = toPx(p);
      const age = now - f.galleryBob;
      const lift = age >= 0 && age < 900 && !f.reduce ? (Math.floor(age / 110 + i) & 1) : 0;
      items.push({ y, d: () => drawPerson(g, x, y, bodies[i], lift) });
    });
    // Your partner, in the pink jumper, stood off the tee while you play from it
    f.party.forEach((p) => {
      if (!seen(p)) return;
      const [x, y] = toPx(p);
      items.push({ y, d: () => drawPerson(g, x, y, '#d66a7e') });
    });
    f.four.forEach((p, i) => {
      const [x, y] = toPx(p);
      const wave = i === 1 && !f.reduce ? Math.floor(now / 260) & 1 : -1;
      items.push({ y, d: () => drawPerson(g, x, y, ['#7a4a24', '#2f4a6b', '#8a6d34', '#5b6e7a'][i], 0, wave) });
    });
    // The heron: stood by the pond, or away over the table
    {
      const hp = COURSE.heron;
      if (f.heronT < 0 || f.reduce) {
        if (f.heronT < 0 && seen(hp)) {
          const [x, y] = toPx(hp);
          items.push({ y, d: () => drawHeron(g, x, y, -1) });
        }
      } else {
        const u = (now - f.heronT) / 2600;
        if (u < 1) {
          const [x0, y0] = toPx(hp);
          const x = Math.round(x0 - u * 90);
          const y = Math.round(y0 - 8 - u * 70 - Math.sin(u * 9) * 2);
          items.push({ y: y0 + 400, d: () => drawHeron(g, x, y, Math.floor(now / 140)) });
        }
      }
    }
    // The golfer, and their shadow
    if (f.golfer) {
      const gf = f.golfer;
      const [x, y] = toPx(gf.p);
      items.push({
        y,
        d: () => {
          g.fillStyle = P.shade;
          g.fillRect(x - 10, y, 12, 1);
          g.fillRect(x - 5, y + 1, 5, 1);
          if (gf.bag) drawBag(g, x - gf.face * 12 - 1, y - 2);
          drawGolfer(g, x, y, gf.face, gf.st);
        },
      });
    }
    // The ball, its shadow on the ground under it and its line in the air
    const ball = f.ball;
    if (ball && ball.o > 0) {
      const [x, y] = toPx(ball.p);
      const lift = Math.round(ball.z * view.zk);
      // Its shadow lies on the ground, under everything that stands. The low sun throws it
      // off to the left as it does the trees', so it slides away as the ball climbs and
      // runs back in to meet it on the way down; off the island it's lost
      if (ball.z >= 0) {
        const off = lift * RAKE;
        const q = unIso(sx(ball.p) - ox - off, sy(ball.p) - oy + off * 0.14);
        if (!lift || (seen(q) && q[0] >= 0 && q[0] <= W && q[1] >= 0 && q[1] <= H)) {
          const [hx, hy] = toPx(q);
          items.push({
            y: -1e9,
            d: () => {
              g.globalAlpha = ball.o;
              g.fillStyle = `rgba(36,44,22,${clamp(0.42 - lift * 0.008, 0.22, 0.42).toFixed(2)})`;
              g.fillRect(hx - (lift > 3 ? 0 : 1), hy, 2, 1);
              g.globalAlpha = 1;
            },
          });
        }
      }
      items.push({
        y: y + 0.5,
        d: () => {
          g.globalAlpha = ball.o;
          for (let i = 0; i < ball.trail.length; i++) {
            const tr = ball.trail[i];
            const [tx, ty] = toPx(tr.p, tr.z);
            g.fillStyle = i % 2 ? 'rgba(255,250,235,0.45)' : 'rgba(255,250,235,0.85)';
            g.fillRect(tx, ty, 1, 1);
          }
          const by = y - lift;
          if (ball.sunk) {
            g.fillStyle = '#ffffff';
            g.fillRect(x, by, 1, 1);
          } else {
            g.fillStyle = '#ffffff';
            g.fillRect(x, by - 1, 1, 1);
            g.fillRect(x, by, 1, 1);
            g.fillStyle = '#d9d6cc';
            g.fillRect(x + 1, by, 1, 1);
            g.fillStyle = '#ffffff';
            g.fillRect(x + 1, by - 1, 1, 1);
          }
          if (ball.tuft) {
            g.fillStyle = '#6e8a48';
            g.fillRect(x - 1, by, 1, 1);
            g.fillRect(x + 2, by - 1, 1, 2);
          }
          g.globalAlpha = 1;
        },
      });
    }
    // The aim peg stands up too
    if (f.aim) {
      const [x, y] = toPx(f.aim.to);
      const bob = f.reduce ? 0 : Math.floor(now / 400) & 1;
      items.push({
        y,
        d: () => {
          g.fillStyle = 'rgba(38,33,26,0.7)';
          g.fillRect(x, y - 5, 1, 5);
          g.fillStyle = P.ink;
          g.fillRect(x - 2, y - 9 - bob, 5, 5);
          g.fillStyle = '#e3b84f';
          g.fillRect(x - 1, y - 8 - bob, 3, 3);
          g.fillStyle = '#fff3c9';
          g.fillRect(x, y - 8 - bob, 1, 1);
        },
      });
    }
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.d();
    // What the golfer's thinking, over their head
    if (f.cloud && f.golfer) {
      const [x, y] = toPx(f.golfer.p);
      drawCloud(g, x + (f.golfer.face > 0 ? 1 : -14), y - 19, now - f.cloud.t0, f.cloud.doubt, f.reduce);
    }

    drawWind(f, now);

    // Particles and rings over everything
    parts = parts.filter((pt) => now - pt.t0 < pt.life);
    for (const pt of parts) {
      const t = now - pt.t0;
      if (t < 0) continue;
      const z = pt.drag ? Math.max(0, pt.z + pt.vz * t) : pt.z + pt.vz * t - 0.00028 * t * t;
      if (z < -0.5) continue;
      const x = Math.round(pt.x + pt.vx * t + (pt.drag ? Math.sin(t / 120) * 1.5 : 0));
      const y = Math.round(pt.y + pt.vy * t - z);
      g.fillStyle = pt.col;
      g.fillRect(x, y, 1, 1);
    }
    rings = rings.filter((r) => now - r.t0 < r.life);
    for (const r of rings) {
      const u = (now - r.t0) / r.life;
      if (u < 0) continue;
      const rr = r.r0 + (r.r1 - r.r0) * (1 - (1 - u) ** 2);
      g.globalAlpha = 1 - u * 0.7;
      drawEllipse(r.x, r.y, rr, rr * 0.5, r.col, u > 0.5 ? 3 : 0);
      g.globalAlpha = 1;
    }
    // Quiet, please: the edges close in, dithered, in three steps
    // Both only on what's drawn, never the clear canvas round the plate
    g.globalCompositeOperation = 'source-atop';
    const hl = f.reduce ? (f.hush > 0.5 ? 3 : 0) : Math.round(f.hush * 3);
    if (hl > 0) g.drawImage(vignette(hl), 0, 0);
    // Dusk: the light goes, a dithered veil at a time
    if (f.dusk > 0) {
      g.fillStyle = g.createPattern(ditherCanvas(Math.round(f.dusk * 9), '#5a3f2c'), 'repeat')!;
      g.fillRect(0, 0, lw, lh);
    }
    g.globalCompositeOperation = 'source-over';
    veil(f, now);
    ox = OX;
    oy = OY;
  }

  // The wind, seen: short pale streaks blowing across the course, more and faster the harder
  // it blows, none when it's still, and now and then a leaf carried with them. Worked out
  // from the clock alone, so there's nothing to keep. Where it swirls the line wanders and
  // the gusts come and go. Only over the course, never the clear canvas round it
  const STREAKS = [0, 16, 30, 48] as const;
  const SPEED = [0, 0.03, 0.05, 0.08] as const; // board pixels a millisecond
  const LEN = [0, 5, 9, 14] as const;
  function drawWind(f: Frame, now: number) {
    const lv = f.wind.level;
    if (!lv || f.cut) return;
    const t = f.reduce ? 0 : now;
    const n = Math.round((STREAKS[lv] * lw * lh) / (360 * 200));
    const base = Math.atan2(f.wind.dy, f.wind.dx);
    const padX = lw + 40;
    const padY = lh + 40;
    g.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < n; i++) {
      // Each streak lives a while and comes round again somewhere else
      const cyc = 2200 + hash(i, 1) * 1800;
      const k = Math.floor((t + hash(i, 2) * cyc) / cyc);
      const u = ((t + hash(i, 2) * cyc) % cyc) / cyc;
      const ang = f.wind.swirl ? base + Math.sin(t / 1700 + i * 0.9) * 1.1 + (hash(i, k, 5) - 0.5) * 0.8 : base + (hash(i, 6) - 0.5) * 0.12;
      const ux = Math.cos(ang);
      const uy = Math.sin(ang);
      const sp = SPEED[lv] * (f.wind.swirl ? 0.6 + hash(i, k, 7) * 0.9 : 0.85 + hash(i, 8) * 0.3);
      const x0 = hash(i, k, 3) * padX - 20 + ux * sp * u * cyc;
      const y0 = hash(i, k, 4) * padY - 20 + uy * sp * u * cyc;
      // In, held, out: thinned by the dither at either end
      const a = Math.min(1, u * 5, (1 - u) * 5);
      const leaf = i % 9 === 0;
      if (leaf) {
        const x = Math.round(x0 + Math.sin(t / 140 + i) * 1.2);
        const y = Math.round(y0 + Math.cos(t / 190 + i) * 1.2);
        if (bayer(x, y) < a) {
          g.fillStyle = i % 2 ? '#e8a6b8' : '#8fae5a';
          g.fillRect(x, y, 1, 1);
          g.fillRect(x + (ux >= 0 ? -1 : 1), y, 1, 1);
        }
        continue;
      }
      const L = LEN[lv] * (0.7 + hash(i, 9) * 0.6);
      g.fillStyle = 'rgba(255,250,235,0.7)';
      let lx = NaN;
      let ly = NaN;
      for (let s = 0; s < L; s++) {
        const x = Math.round(x0 - ux * s);
        const y = Math.round(y0 - uy * s);
        if (x === lx && y === ly) continue;
        lx = x;
        ly = y;
        // Fainter towards the tail
        if (bayer(x, y) >= a * (1 - (s / L) * 0.7)) continue;
        g.fillRect(x, y, 1, 1);
      }
    }
    g.globalCompositeOperation = 'source-over';
  }

  // A view coming in, or the board going out for a cut: pixels taken away in Bayer order
  const VEIL_MS = 450;
  function veil(f: Frame, now: number) {
    const u = f.reduce ? 1 : (now - viewT0) / VEIL_MS;
    const v = Math.max(f.veil, u < 1 ? 1 - u : 0);
    const level = Math.round(clamp(v, 0, 1) * 16);
    if (!level) return;
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = g.createPattern(ditherCanvas(level), 'repeat')!;
    g.fillRect(0, 0, lw, lh);
    g.globalCompositeOperation = 'source-over';
  }

  // The vignette for a hush, made once a size and level
  const vig: (HTMLCanvasElement | null)[] = [null, null, null, null];
  let vigKey = '';
  function vignette(level: number) {
    const key = `${lw}x${lh}`;
    if (key !== vigKey) {
      vigKey = key;
      vig.fill(null);
    }
    let c = vig[level];
    if (c) return c;
    const [vc, vg] = canvas(lw, lh);
    vg.fillStyle = 'rgba(38,33,26,0.5)';
    for (let y = 0; y < lh; y++)
      for (let x = 0; x < lw; x++) {
        const d = Math.hypot((x - lw / 2) / (lw * 0.5), (y - lh / 2) / (lh * 0.56));
        const a = clamp((d - 0.62) / 0.5, 0, 1) * (level / 3) * 0.7;
        if (bayer(x, y) < a) vg.fillRect(x, y, 1, 1);
      }
    vig[level] = c = vc;
    return c;
  }

  // A flight as dotted pixels at height, every other one lit
  function drawFlight(pts: readonly { p: Vec; z: number }[], alpha: number, col: string, gap: number, upto = 1) {
    if (alpha <= 0 || pts.length < 2) return;
    g.globalAlpha = alpha;
    g.fillStyle = col;
    const n = Math.floor((pts.length - 1) * upto);
    let lx = NaN;
    let ly = NaN;
    let k = 0;
    for (let i = 0; i <= n; i++) {
      const a = pts[i];
      const [x, y] = toPx(a.p, a.z);
      if (x === lx && y === ly) continue;
      // Fill gaps between samples so the dots stay even
      if (!Number.isNaN(lx)) {
        const steps = Math.max(Math.abs(x - lx), Math.abs(y - ly));
        for (let s = 1; s <= steps; s++) {
          const qx = Math.round(lx + ((x - lx) * s) / steps);
          const qy = Math.round(ly + ((y - ly) * s) / steps);
          if (k++ % gap === 0) g.fillRect(qx, qy, 1, 1);
        }
      } else g.fillRect(x, y, 1, 1);
      lx = x;
      ly = y;
    }
    g.globalAlpha = 1;
  }

  function drawAim(a: AimFrame, now: number) {
    const [x0, y0] = toPx(a.from);
    const [x1, y1] = toPx(a.to);
    const L = Math.hypot(x1 - x0, y1 - y0);
    const h = clamp(L * 0.32, 3, 24);
    const n = Math.max(4, Math.round(L / 2.4));
    const march = a.reduce || a.ink ? 0 : (now / 520) % 1;
    // Decided: the line inked solid in brass, drawn out from the ball, and still
    if (a.ink) {
      const m = Math.max(8, Math.round(L * 1.5));
      let lx = NaN;
      let ly = NaN;
      for (let k = 0; k <= m * a.ink; k++) {
        const t = k / m;
        if (t < 0.06 || t > 0.96) continue;
        const x = Math.round(x0 + (x1 - x0) * t);
        const y = Math.round(y0 + (y1 - y0) * t - Math.sin(Math.PI * t) * h);
        if (x === lx && y === ly) continue;
        lx = x;
        ly = y;
        g.fillStyle = 'rgba(38,33,26,0.45)';
        g.fillRect(x, y + 1, 1, 1);
        g.fillStyle = a.dim ? 'rgba(227,184,79,0.7)' : '#e3b84f';
        g.fillRect(x, y, 1, 1);
      }
    }
    for (let k = 0; k < (a.ink ? 0 : n); k++) {
      const t = (k + march) / n;
      if (t < 0.06 || t > 0.96) continue;
      const x = Math.round(x0 + (x1 - x0) * t);
      const y = Math.round(y0 + (y1 - y0) * t - Math.sin(Math.PI * t) * h);
      g.fillStyle = 'rgba(38,33,26,0.25)';
      g.fillRect(x, y + 1, 1, 1);
      g.fillStyle = a.dim ? 'rgba(255,250,235,0.55)' : '#fffaeb';
      g.fillRect(x, y, 1, 1);
    }
    if (a.pattern) drawPattern(a.pattern.c, a.pattern, a.dim, now);
    else drawEllipse(x1, y1, 6, 3, 'rgba(255,246,220,0.9)');
  }

  // The pattern: a pale dithered oval on the grass where a good strike lands, its rim
  // dotted. Laid on the ground, so it foreshortens with the course. With the nerves on, the
  // rim won't sit still
  function drawPattern(c: Vec, pt: NonNullable<AimFrame['pattern']>, dim: boolean, now: number) {
    const ux = Math.cos(pt.ang);
    const uy = Math.sin(pt.ang);
    const at = (t: number, k = 1): Vec => {
      const a = Math.cos(t) * pt.along * k;
      const b = Math.sin(t) * pt.across * k;
      return [c[0] + ux * a - uy * b, c[1] + uy * a + ux * b];
    };
    // Its extent on the board, from the rim
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    const rim: Vec[] = [];
    const n = 48;
    for (let i = 0; i < n; i++) {
      const p = toPx(at((i / n) * Math.PI * 2));
      rim.push(p);
      x0 = Math.min(x0, p[0]);
      x1 = Math.max(x1, p[0]);
      y0 = Math.min(y0, p[1]);
      y1 = Math.max(y1, p[1]);
    }
    // The fill: a light wash, so the grass and the flag read through it
    g.fillStyle = dim ? 'rgba(255,246,220,0.35)' : 'rgba(255,246,220,0.8)';
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        if (bayer(x, y) >= 0.32) continue;
        const q = unIso(x + 0.5 - ox, y + 0.5 - oy);
        const dx = q[0] - c[0];
        const dy = q[1] - c[1];
        const a = (dx * ux + dy * uy) / pt.along;
        const b = (-dx * uy + dy * ux) / pt.across;
        if (a * a + b * b <= 1) g.fillRect(x, y, 1, 1);
      }
    // The rim, unbroken, with a shadow under it so it reads on the pale grass; jittered a
    // pixel when the nerves are on
    const jit = pt.tremble ? Math.floor(now / 90) : -1;
    const pts: Vec[] = [];
    const m = Math.max(48, Math.round((x1 - x0 + y1 - y0) * 2));
    for (let i = 0; i < m; i++) {
      const [x, y] = toPx(at((i / m) * Math.PI * 2));
      const jx = jit >= 0 ? Math.round((hash(i >> 2, jit) - 0.5) * 2) : 0;
      const jy = jit >= 0 ? Math.round((hash(i >> 2, jit, 3) - 0.5) * 2) : 0;
      const last = pts[pts.length - 1];
      if (!last || last[0] !== x + jx || last[1] !== y + jy) pts.push([x + jx, y + jy]);
    }
    g.fillStyle = dim ? 'rgba(38,33,26,0.12)' : 'rgba(38,33,26,0.3)';
    for (const [x, y] of pts) g.fillRect(x, y + 1, 1, 1);
    g.fillStyle = dim ? 'rgba(255,250,235,0.55)' : '#fffaeb';
    for (const [x, y] of pts) g.fillRect(x, y, 1, 1);
    // The aim itself, a pip in the middle
    const [cx, cy] = toPx(c);
    g.fillStyle = 'rgba(38,33,26,0.35)';
    g.fillRect(cx, cy + 1, 1, 1);
    g.fillStyle = '#fffaeb';
    g.fillRect(cx, cy, 1, 1);
  }

  function drawRecord(r: RecordFrame, now: number) {
    const el = now - r.t0;
    // The ovals first, in pencil: a wide one is a shot swung before it was settled
    const pu = r.reduce ? 1 : clamp((el - 300) / 500, 0, 1);
    if (pu > 0)
      for (const pt of r.patterns) {
        const ux = Math.cos(pt.ang);
        const uy = Math.sin(pt.ang);
        const m = 40;
        g.fillStyle = `rgba(38,33,26,${(0.8 * pu).toFixed(2)})`;
        let lx = NaN;
        let ly = NaN;
        for (let i = 0; i < m; i++) {
          const t = (i / m) * Math.PI * 2;
          const a = Math.cos(t) * pt.along;
          const b = Math.sin(t) * pt.across;
          const [x, y] = toPx([pt.c[0] + ux * a - uy * b, pt.c[1] + uy * a + ux * b]);
          if (x === lx && y === ly) continue;
          lx = x;
          ly = y;
          g.fillRect(x, y, 1, 1);
        }
      }
    r.trails.forEach((t, i) => {
      const u = r.reduce ? 1 : clamp((el - 500 - i * 110) / 520, 0, 1);
      if (u <= 0) return;
      drawFlight(t, 0.95, '#fffaeb', 2, u);
      if (u >= 1) {
        const [x, y] = toPx(t[t.length - 1].p);
        g.fillStyle = '#ffffff';
        g.fillRect(x, y - 1, 2, 2);
      }
    });
    const lead = 500 + r.trails.length * 110 + 300;
    r.marks.forEach((m, i) => {
      if (!r.reduce && el < lead + i * 120) return;
      const [x, y] = toPx(m.at);
      const pop = !r.reduce && el < lead + i * 120 + 120 ? 1 : 0;
      if (m.moment) {
        g.fillStyle = P.ink;
        for (let k = -3 - pop; k <= 3 + pop; k++) {
          const w = 3 + pop - Math.abs(k);
          g.fillRect(x - w, y - 4 + k, w * 2 + 1, 1);
        }
        g.fillStyle = '#c9a24a';
        for (let k = -2; k <= 2; k++) {
          const w = 2 - Math.abs(k);
          g.fillRect(x - w, y - 4 + k, w * 2 + 1, 1);
        }
      } else {
        g.fillStyle = P.ink;
        g.fillRect(x - 2 - pop, y - 6 - pop, 4 + pop * 2, 4 + pop * 2);
        g.fillStyle = m.over ? '#fff6dc' : '#e3b84f';
        g.fillRect(x - 1, y - 5, 2, 2);
      }
    });
  }

  return {
    resize,
    place,
    setView,
    setGround,
    draw,
    burst,
    rock,
    shake,
    glowHole,
    toPx,
    toCss,
    fromCss,
    offset,
    get origin(): Vec {
      return [ox, oy];
    },
    get panning() {
      return pan != null;
    },
    get size() {
      return { lw, lh, scale };
    },
    clearFx() {
      parts = [];
      rings = [];
      bloom = null;
    },
  };
}
export type Board = ReturnType<typeof createBoard>;

/** pattern: where a good strike lands, an oval on the aim, in course units along the line
 *  and across it (play.ts eases it as the routine runs); tremble when the nerves are on */
/** ink: the line decided, drawn out in brass from the ball, 0 to 1 */
export type AimFrame = { from: Vec; to: Vec; dim: boolean; reduce: boolean; ink?: number; pattern?: { c: Vec; along: number; across: number; ang: number; tremble: boolean } };
/** patterns: each full shot's oval as it was swung from, pencilled under the lines */
export type RecordFrame = { t0: number; reduce: boolean; trails: { p: Vec; z: number }[][]; marks: { at: Vec; moment: boolean; over: boolean }[]; patterns: { c: Vec; along: number; across: number; ang: number }[] };
export type Frame = {
  now: number;
  reduce: boolean;
  live: number;
  golfer: { p: Vec; face: 1 | -1; st: Golfer; bag: boolean } | null;
  ball: { p: Vec; z: number; o: number; sunk: boolean; tuft: boolean; trail: { p: Vec; z: number }[] } | null;
  aim: AimFrame | null;
  chips: { at: Vec; on: boolean }[];
  ghost: { pts: { p: Vec; z: number }[]; alpha: number } | null;
  four: Vec[];
  /** Your partner, by the tee */
  party: Vec[];
  heronT: number;
  galleryBob: number;
  record: RecordFrame | null;
  hush: number;
  dusk: number;
  /** The wind, as the flags show it: which way across the screen, and how hard */
  /** dx, dy: which way it blows on the screen, a unit vector. swirl: it won't hold a line */
  wind: { dir: 1 | -1; level: number; dx: number; dy: number; swirl: boolean };
  cloud: { t0: number; doubt: boolean } | null;
  ghostBall: { p: Vec; z: number; a: number } | null;
  /** How much of the board is dithered away, 0 to 1 */
  veil: number;
  /** Between holes, the walk, painted over the whole board instead of the course */
  cut: ((g: Ctx, lw: number, lh: number) => void) | null;
};

// ---------------------------------------------------------------------------------------
// The pocket button: a plain white Flic, drawn in the course's pixels. 32 by 32

export function drawFlic(cv: HTMLCanvasElement, pressed: boolean, glow: number, moment: boolean, live = 0) {
  const N = 32;
  if (cv.width !== N) {
    cv.width = N;
    cv.height = N;
  }
  const g = cv.getContext('2d')!;
  g.clearRect(0, 0, N, N);
  const px = (x: number, y: number, c: string) => {
    g.fillStyle = c;
    g.fillRect(x, y, 1, 1);
  };
  // A squircle: inside if the rounded box holds the pixel
  const inside = (x: number, y: number, cx: number, cy: number, r: number) => {
    const dx = Math.max(Math.abs(x + 0.5 - cx) - (r - 5), 0);
    const dy = Math.max(Math.abs(y + 0.5 - cy) - (r - 5), 0);
    return dx * dx + dy * dy <= 25;
  };
  const d = pressed ? 1 : 0;
  const cx = 16 - d;
  const cy = 15 + d;
  // Live, while the inner voice is talking: a faint warm halo that breathes, thin enough
  // to draw the eye without asking for anything
  if (live > 0 && glow <= 0) {
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        if (inside(x, y, 16, 15, 12.6)) continue;
        for (let k = 1; k <= 3; k++)
          if (inside(x, y, 16, 15, 12.6 + k)) {
            const a = live * (k === 1 ? 0.75 : k === 2 ? 0.4 : 0.16);
            if (bayer(x, y) < a) px(x, y, k === 1 ? '#f1c75a' : '#f8dc8c');
            break;
          }
      }
  }
  // The glow: a gold ring, dithered as it fades; stronger and wider for a moment
  if (glow > 0) {
    const reach = moment ? 3 : 2;
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        if (inside(x, y, 16, 15, 12.6)) continue;
        for (let k = 1; k <= reach; k++)
          if (inside(x, y, 16, 15, 12.6 + k)) {
            const a = glow * (1 - (k - 1) / reach);
            if (bayer(x, y) < a) px(x, y, k === 1 ? '#f1c75a' : '#f8dc8c');
            break;
          }
      }
  }
  // Its shadow, cast left by the sun: shorter when pressed into the pocket
  const sh = pressed ? 1 : 2;
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++)
      if (inside(x + sh, y - sh, cx, cy, 12) && !inside(x, y, cx, cy, 12)) px(x, y, 'rgba(38,33,26,0.24)');
  // The body: lit along the top and right, a soft grey where it turns away
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      if (!inside(x, y, cx, cy, 12)) continue;
      const rim = !inside(x, y, cx, cy, 11);
      const rim2 = !inside(x, y, cx, cy, 10);
      let c = pressed ? '#ecE8dd' : '#f4f1e9';
      if (rim) c = y > cy + 4 || x < cx - 7 ? '#b9b4a6' : '#ffffff';
      else if (rim2) c = y > cy + 4 || x < cx - 7 ? '#d8d3c6' : '#fbfaf5';
      px(x, y, c);
    }
  // The outline, so it reads on the cream
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      if (inside(x, y, cx, cy, 12)) continue;
      if (inside(x - 1, y, cx, cy, 12) || inside(x + 1, y, cx, cy, 12) || inside(x, y - 1, cx, cy, 12) || inside(x, y + 1, cx, cy, 12)) px(x, y, '#8c8678');
    }
  // The face, a shallow dish with the mark pressed into it
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      if (inside(x, y, cx, cy, 8.4) && !inside(x, y, cx, cy, 7.6)) px(x, y, y < cy - 2 || x < cx - 3 ? '#d6d1c4' : '#ffffff');
    }
  const ink = moment && glow > 0 ? '#8a6d34' : '#9a9486';
  for (const [x, y] of [[0, -4], [-1, -3], [1, -3], [-2, -2], [2, -2], [-3, -1], [3, -1], [-3, 0], [3, 0], [-2, 1], [2, 1], [-1, 2], [1, 2], [0, 3]]) px(cx + x - 1, cy + y - 1, ink);
  px(cx - 1, cy - 1, ink);
  px(cx - 1, cy - 2, glow > 0 ? '#e3b84f' : ink);
}
