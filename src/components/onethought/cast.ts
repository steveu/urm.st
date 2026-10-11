// The cast on the walk's stage: you, your caddie and your partner, from the waist up, 128
// by 144 pixels, drawn at the board's own pixel size, so they're finer than the board's
// sprites rather than a small face blown up. The box at the foot of the frame covers
// their waist, as a courtroom's would.
//
// Each is built from named parts (torso, arms, neck, head, ear, nose, hair, hat), every
// part a shape filled with a material: four tones lit from the right, where the low sun
// is, a warm rim on the sunny edge, and a dark line only on the shaded edges. Textures go
// on as the tones are worked out: the knit of a jumper, the weave of a hat, the grain of a
// beard. The face is drawn over that, by expression: brows, eyes, lids and mouth.
//
// Every expression is a pose as much as a face: where the hands go says more than the
// brows. Each pose has a second frame, a small move (a tap of the finger, a bob of the
// shoulders, a jitter of the hands) that the stage swaps in now and then, on top of the
// blink and the talking mouth.
//
// Drawn facing right. The others face left on the stage, so they're drawn mirrored with
// the light reversed, which keeps the sun on the right for everyone.

import { bayer, hash } from './pixel';

export type Actor = 'you' | 'caddie' | 'partner';
/** A face: as they are, pleased with it, caught out, thinking it over, or the shout */
export type Face = 'normal' | 'pleased' | 'shocked' | 'thinking' | 'shout';
/** The mouth while talking: shut, half open, open */
export type Mouth = 0 | 1 | 2;

export const W = 128;
export const H = 144;

type Pt = [number, number];
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

// ---------------------------------------------------------------------------------------
// Materials: four tones, darkest first; the sun's rim; the line on the shaded side

type Mat = { tones: [string, string, string, string]; rim: string; line: string };
const MATS = {
  skin: { tones: ['#9a5e46', '#c88664', '#e6ac84', '#f6cfa8'], rim: '#ffe0aa', line: '#6a3a2a' },
  hairBrown: { tones: ['#2a1c12', '#47331f', '#664a30', '#86643f'], rim: '#c08a50', line: '#1c120c' },
  hairGrey: { tones: ['#55514c', '#7e7a72', '#a8a398', '#d0cbbe'], rim: '#efe2c0', line: '#3a3632' },
  ginger: { tones: ['#5a2810', '#8a431c', '#b4642c', '#d88a44'], rim: '#f6b866', line: '#3c1a0a' },
  capTweed: { tones: ['#3a2c1e', '#5c4830', '#7c6446', '#9e845e'], rim: '#d6b278', line: '#241a10' },
  jumperRed: { tones: ['#5a1a12', '#8c2c1a', '#bc4228', '#de6a42'], rim: '#f6a064', line: '#3a0e08' },
  shirt: { tones: ['#a89e8a', '#cec4ae', '#ebe3ce', '#fbf6ea'], rim: '#fffaf0', line: '#6e6656' },
  beanie: { tones: ['#252f1a', '#3c4a26', '#5a6a38', '#7c8e50'], rim: '#b8c47a', line: '#161c0e' },
  beard: { tones: ['#5c5852', '#87827a', '#b0aba0', '#d8d3c6'], rim: '#f2e8cc', line: '#3a3632' },
  jacket: { tones: ['#121c2e', '#1e314c', '#2e486a', '#48688c'], rim: '#a8a890', line: '#0a1220' },
  towel: { tones: ['#9a907e', '#cdc4ae', '#e9e2cd', '#fbf8ee'], rim: '#fffaf0', line: '#5e5646' },
  towelStripe: { tones: ['#28361c', '#3c5028', '#567038', '#76904c'], rim: '#b0c27a', line: '#18200e' },
  bucket: { tones: ['#6a5636', '#927a52', '#bea474', '#dcc492'], rim: '#f6e0a8', line: '#463820' },
  bucketBand: { tones: ['#4a3a22', '#64502e', '#7e683e', '#9a8250'], rim: '#d6b878', line: '#2e2414' },
  jumperPink: { tones: ['#783246', '#a64e68', '#d4687c', '#ea8c96'], rim: '#ffc2a8', line: '#4a1a28' },
  strap: { tones: ['#2e1c10', '#4e3018', '#6e4624', '#8e5e32'], rim: '#c89860', line: '#1a0e06' },
} satisfies Record<string, Mat>;
type MatName = keyof typeof MATS;
const MAT_LIST = Object.keys(MATS) as MatName[];

// ---------------------------------------------------------------------------------------
// The working picture: per pixel, a material and a lightness (0 dark to 1 lit), plus an
// overlay of exact colours for the face

type Pic = { mat: Int8Array; v: Float32Array; over: (string | null)[]; ls: number };
const pic = (ls: number): Pic => ({ mat: new Int8Array(W * H).fill(-1), v: new Float32Array(W * H), over: new Array(W * H).fill(null), ls });

// A texture nudges the lightness as a shape is filled
type Tex = (x: number, y: number) => number;
const flat: Tex = () => 0;
// Knit: ribs up the jumper, a stitch in every other row
const knit: Tex = (x, y) => (x % 3 === 0 ? -0.09 : 0) + ((x + (y >> 1)) % 6 === 0 ? 0.05 : 0);
// Cables down a jumper: twisted columns
const cable: Tex = (x, y) => {
  const c = x % 9;
  if (c === 0) return -0.14;
  if (c >= 3 && c <= 6) return Math.sin((y + (c - 3) * 2) / 1.6) * 0.09;
  return 0;
};
// Tweed: a small herringbone
const tweed: Tex = (x, y) => ((((x >> 1) + y) & 1) ^ ((x >> 2) & 1) ? 0.06 : -0.06);
// The wool hat's ribs
const ribs: Tex = (x) => (x % 3 === 0 ? -0.16 : x % 3 === 1 ? 0.04 : 0);
// Woven canvas
const weave: Tex = (x, y) => (x % 3 === 0 || y % 3 === 0 ? -0.05 : 0.02);
// Hair and beard: strands, uneven
const grain: Tex = (x, y) => {
  const h = hash(x, y >> 1, 17);
  return h > 0.78 ? 0.12 : h < 0.2 ? -0.12 : 0;
};

// Fill an ellipse, shaded as a rounded form lit from the right and a little above
function ell(p: Pic, cx: number, cy: number, rx: number, ry: number, m: MatName, o: { tex?: Tex; base?: number; keep?: (x: number, y: number) => boolean } = {}) {
  const mi = MAT_LIST.indexOf(m);
  const tex = o.tex ?? flat;
  const base = o.base ?? 0.55;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const nx = (x + 0.5 - cx) / rx;
      const ny = (y + 0.5 - cy) / ry;
      if (nx * nx + ny * ny > 1) continue;
      if (o.keep && !o.keep(x, y)) continue;
      const i = y * W + x;
      p.mat[i] = mi;
      p.v[i] = base + 0.4 * nx * p.ls - 0.22 * ny + tex(x, y);
    }
}
// Fill a polygon, lit across its width
function poly(p: Pic, pts: Pt[], m: MatName, o: { tex?: Tex; base?: number } = {}) {
  const mi = MAT_LIST.indexOf(m);
  const tex = o.tex ?? flat;
  const base = o.base ?? 0.55;
  const xs = pts.map((q) => q[0]);
  const ys = pts.map((q) => q[1]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  for (let y = Math.max(0, Math.floor(Math.min(...ys))); y <= Math.min(H - 1, Math.ceil(Math.max(...ys))); y++)
    for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(W - 1, Math.ceil(x1)); x++) {
      let inside = false;
      for (let a = 0, b = pts.length - 1; a < pts.length; b = a++) {
        const [xa, ya] = pts[a];
        const [xb, yb] = pts[b];
        if (ya > y + 0.5 !== yb > y + 0.5 && x + 0.5 < ((xb - xa) * (y + 0.5 - ya)) / (yb - ya) + xa) inside = !inside;
      }
      if (!inside) continue;
      const i = y * W + x;
      p.mat[i] = mi;
      p.v[i] = base + 0.3 * ((x - (x0 + x1) / 2) / ((x1 - x0) / 2 || 1)) * p.ls + tex(x, y);
    }
}
// A capsule between two points: an arm, a finger. Lit across its width. It casts a short
// shadow on whatever it lies over, which is what keeps an arm apart from a jumper of the
// same wool
function capsule(p: Pic, a: Pt, b: Pt, r: number, m: MatName, o: { tex?: Tex; base?: number; shade?: boolean } = {}) {
  const mi = MAT_LIST.indexOf(m);
  const tex = o.tex ?? flat;
  const base = o.base ?? 0.55;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  // The normal across the arm, turned to point sunward (right), or up for a level arm
  let nx = dy / len;
  let ny = -dx / len;
  if (nx < 0 || (nx === 0 && ny > 0)) {
    nx = -nx;
    ny = -ny;
  }
  const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0]) - r - 3));
  const x1 = Math.min(W - 1, Math.ceil(Math.max(a[0], b[0]) + r + 3));
  const y0 = Math.max(0, Math.floor(Math.min(a[1], b[1]) - r - 3));
  const y1 = Math.min(H - 1, Math.ceil(Math.max(a[1], b[1]) + r + 3));
  const near = (x: number, y: number) => {
    const t = clamp(((x + 0.5 - a[0]) * dx + (y + 0.5 - a[1]) * dy) / (len * len), 0, 1);
    const px = a[0] + dx * t;
    const py = a[1] + dy * t;
    return { d: Math.hypot(x + 0.5 - px, y + 0.5 - py), s: (x + 0.5 - px) * nx + (y + 0.5 - py) * ny };
  };
  if (o.shade !== false)
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const i = y * W + x;
        if (p.mat[i] < 0) continue;
        const { d } = near(x, y);
        if (d > r && d <= r + 2) p.v[i] -= d <= r + 1 ? 0.24 : 0.1;
      }
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const { d, s } = near(x, y);
      if (d > r) continue;
      const i = y * W + x;
      p.mat[i] = mi;
      p.v[i] = base + (s / r) * (0.4 * nx * p.ls - 0.22 * ny) + tex(x, y);
    }
}
// Darken (or lighten) what's already there, where a shape says: shadows cast by a brim,
// a jaw, a collar
function tint(p: Pic, test: (x: number, y: number) => boolean, dv: number, only?: MatName[]) {
  const ids = only?.map((m) => MAT_LIST.indexOf(m));
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (p.mat[i] < 0 || (ids && !ids.includes(p.mat[i])) || !test(x, y)) continue;
      p.v[i] += dv;
    }
}
const set = (p: Pic, x: number, y: number, c: string) => {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi >= 0 && yi >= 0 && xi < W && yi < H) p.over[yi * W + xi] = c;
};
// A line of exact colour, a pixel thick
function line(p: Pic, x0: number, y0: number, x1: number, y1: number, c: string) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let k = 0; k <= n; k++) set(p, x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n, c);
}

// ---------------------------------------------------------------------------------------
// Poses: where each arm goes, which layer it's drawn on, what the hand does, and the
// head's tilt. `f1` is the second frame's nudge

type Layer = 'back' | 'mid' | 'front';
type Hand = 'fist' | 'open' | 'point' | 'thumb' | 'hide';
type Arm = { e: Pt; h: Pt; layer: Layer; hand: Hand; f1?: Pt };
type Pose = { L: Arm; R: Arm; head: Pt; headF1?: Pt };

const SH_L: Pt = [30, 92];
const SH_R: Pt = [94, 92];

// Hands in the pockets: the arms straight down, the hands under the box
const pockets: Pose = {
  L: { e: [24, 118], h: [26, 148], layer: 'mid', hand: 'hide' },
  R: { e: [102, 118], h: [100, 148], layer: 'mid', hand: 'hide' },
  head: [0, 0],
};
// Arms folded: the near forearm over the far
const folded: Pose = {
  L: { e: [20, 122], h: [82, 118], layer: 'front', hand: 'fist' },
  R: { e: [108, 122], h: [46, 116], layer: 'front', hand: 'fist' },
  head: [0, 0],
};
// Hands on the hips, elbows out
const hips: Pose = {
  L: { e: [12, 116], h: [30, 126], layer: 'mid', hand: 'fist' },
  R: { e: [114, 116], h: [96, 126], layer: 'mid', hand: 'fist' },
  head: [0, 0],
};
// Caught out: hands up by the shoulders, the head back, the hands shaking
const handsUp: Pose = {
  L: { e: [14, 114], h: [18, 84], layer: 'mid', hand: 'open', f1: [-1, 1] },
  R: { e: [112, 114], h: [108, 84], layer: 'mid', hand: 'open', f1: [1, 1] },
  head: [-2, -1],
};

const POSES: Record<Actor, Record<Face, Pose>> = {
  you: {
    normal: pockets,
    // A thumb hooked in the bag's strap
    pleased: {
      L: pockets.L,
      R: { e: [112, 120], h: [82, 100], layer: 'front', hand: 'fist', f1: [0, -1] },
      head: [0, 1],
      headF1: [0, -1],
    },
    shocked: handsUp,
    // A knuckle to the chin, the other arm across, a finger tapping
    thinking: {
      L: { e: [20, 122], h: [80, 118], layer: 'front', hand: 'fist' },
      R: { e: [112, 124], h: [78, 68], layer: 'front', hand: 'fist', f1: [0, -1] },
      head: [1, 2],
    },
    // The shout: an arm thrust out, the other fist at the hip, leaning into it
    shout: {
      L: { e: [16, 118], h: [30, 114], layer: 'mid', hand: 'fist' },
      R: { e: [112, 76], h: [120, 54], layer: 'front', hand: 'point', f1: [2, -1] },
      head: [2, -2],
    },
  },
  caddie: {
    normal: folded,
    // A thumb up, no more than that
    pleased: {
      L: { e: [22, 118], h: [26, 148], layer: 'mid', hand: 'hide' },
      R: { e: [112, 122], h: [100, 94], layer: 'mid', hand: 'thumb', f1: [0, -2] },
      head: [0, 1],
    },
    // A shrug: what did I say
    shocked: {
      L: { e: [16, 120], h: [12, 96], layer: 'mid', hand: 'open', f1: [0, 1] },
      R: { e: [112, 120], h: [116, 96], layer: 'mid', hand: 'open', f1: [0, 1] },
      head: [-1, -1],
    },
    // Stroking the beard
    thinking: {
      L: { e: [20, 122], h: [82, 118], layer: 'front', hand: 'fist' },
      R: { e: [112, 120], h: [74, 72], layer: 'front', hand: 'fist', f1: [0, 2] },
      head: [1, 1],
    },
    shout: folded,
  },
  partner: {
    normal: hips,
    // A belly laugh: both hands on it, the shoulders going
    pleased: {
      L: { e: [14, 126], h: [50, 136], layer: 'front', hand: 'open', f1: [0, -1] },
      R: { e: [114, 126], h: [76, 136], layer: 'front', hand: 'open', f1: [0, -1] },
      head: [0, 1],
      headF1: [0, -2],
    },
    // Both hands to the hat
    shocked: {
      L: { e: [8, 104], h: [44, 26], layer: 'front', hand: 'open', f1: [0, 1] },
      R: { e: [120, 104], h: [86, 28], layer: 'front', hand: 'open', f1: [0, 1] },
      head: [-2, -1],
    },
    // A scratch under the brim
    thinking: {
      L: hips.L,
      R: { e: [118, 104], h: [94, 36], layer: 'front', hand: 'open', f1: [1, -1] },
      head: [1, 2],
    },
    shout: hips,
  },
};

const add = (a: Pt, b: Pt | undefined, k: number): Pt => (b ? [a[0] + b[0] * k, a[1] + b[1] * k] : a);

// An arm: the upper arm from the shoulder, the forearm, then the hand
function arm(p: Pic, sh: Pt, a: Arm, frame: 0 | 1, m: MatName, tex: Tex) {
  const e = add(a.e, a.f1, frame * 0.5);
  const h = add(a.h, a.f1, frame);
  capsule(p, sh, e, 7, m, { tex, base: 0.5 });
  capsule(p, e, h, 6, m, { tex, base: 0.55 });
  hand(p, e, h, a.hand);
}
// The hand, at the end of the forearm, doing what the pose asks
function hand(p: Pic, e: Pt, h: Pt, kind: Hand) {
  if (kind === 'hide') return;
  const dx = h[0] - e[0];
  const dy = h[1] - e[1];
  const L = Math.hypot(dx, dy) || 1;
  const ux = dx / L;
  const uy = dy / L;
  const at = (k: number, s: number): Pt => [h[0] + ux * k - uy * s, h[1] + uy * k + ux * s];
  capsule(p, at(-1, 0), at(2, 0), 5, 'skin', { base: 0.58 });
  if (kind === 'open') for (const s of [-3.4, 0, 3.4]) capsule(p, at(3, s), at(8, s * 1.1), 1.8, 'skin', { base: 0.6 });
  else if (kind === 'point') capsule(p, at(3, 0), at(13, 0), 2.2, 'skin', { base: 0.62 });
  else if (kind === 'thumb') capsule(p, [h[0], h[1] - 2], [h[0], h[1] - 10], 2.2, 'skin', { base: 0.62 });
  // The knuckles: a shade across a closed hand
  if (kind === 'fist' || kind === 'point') tint(p, (x, y) => Math.abs((x + 0.5 - h[0]) * ux + (y + 0.5 - h[1]) * uy - 1) < 0.6 && Math.hypot(x + 0.5 - h[0], y + 0.5 - h[1]) < 4.5, -0.18, ['skin']);
}

// ---------------------------------------------------------------------------------------
// The common figure: the torso, the arms by layer, the neck, the head, the ear, the nose.
// The head's parts are placed from its centre, so a pose can tilt it

type Head = { cx: number; cy: number; rx: number; ry: number; eyeY: number; nearX: number; farX: number; mouthX: number; mouthY: number };

function torso(p: Pic, body: MatName, bodyTex: Tex) {
  poly(p, [[14, 146], [18, 104], [24, 90], [36, 82], [50, 78], [62, 77], [74, 78], [88, 82], [100, 90], [106, 104], [110, 146]], body, { tex: bodyTex, base: 0.48 });
  tint(p, (_x, y) => y >= 134, -0.1, [body]);
}
function arms(p: Pic, pose: Pose, layer: Layer, frame: 0 | 1, m: MatName, tex: Tex) {
  // The near forearm (the right) goes over the far one when both are in front
  if (pose.L.layer === layer) arm(p, SH_L, pose.L, frame, m, tex);
  if (pose.R.layer === layer) arm(p, SH_R, pose.R, frame, m, tex);
}
function neck(p: Pic, head: Head) {
  for (let y = head.cy + 12; y < 84; y++)
    for (let x = head.cx - 10; x <= head.cx + 10; x++) {
      const i = y * W + x;
      p.mat[i] = MAT_LIST.indexOf('skin');
      p.v[i] = 0.3 + ((x - head.cx) / 10) * 0.2 * p.ls + (y - head.cy - 12) * 0.01;
    }
}
function skull(p: Pic, head: Head) {
  ell(p, head.cx, head.cy, head.rx, head.ry, 'skin');
  ell(p, head.cx + 3, head.cy + 10, head.rx - 4, head.ry * 0.6, 'skin', { base: 0.5 });
  ear(p, head);
  nose(p, head);
  // Under the jaw, in shade
  tint(p, (x, y) => y >= head.cy + head.ry * 0.55 + 10 && y <= head.cy + head.ry * 0.55 + 13 && Math.abs(x - head.cx - 2) < head.rx - 4, -0.2, ['skin']);
}

// The nose, turned three-quarters with the head: down from between the eyes, its tip
// towards the far eye, lit on its bridge and shaded on the near flank and underneath.
// Drawn again over a beard
function nose(p: Pic, head: Head) {
  const nx = Math.round((head.nearX + head.farX) / 2) + 1;
  const ny = head.eyeY + 1;
  const nb = head.cy + 8;
  poly(p, [[nx - 1, ny], [nx + 1, ny], [nx + 4, nb - 3], [nx + 5, nb - 1], [nx + 3, nb + 1], [nx - 3, nb + 1], [nx - 4, nb - 1]], 'skin', { base: 0.68 });
  tint(p, (x, y) => y > ny + 1 && y < nb - 1 && x >= nx - 3 && x <= nx - 1 && x - (nx - 3) < (y - ny) / 3, -0.26, ['skin']);
  tint(p, (x, y) => y >= nb + 1 && y <= nb + 2 && x >= nx - 4 && x <= nx + 4, -0.4, ['skin']);
  tint(p, (x, y) => y === nb && (x === nx - 2 || x === nx + 2), -0.45, ['skin']);
}

// The ear, on the far side: drawn again over any hair
function ear(p: Pic, head: Head) {
  const ex = head.cx - head.rx + 2;
  ell(p, ex, head.cy + 3, 4, 6, 'skin', { base: 0.4 });
  tint(p, (x, y) => Math.hypot((x - ex - 0.5) / 1.8, (y - head.cy - 3) / 3.5) < 1, -0.25, ['skin']);
}

// ---------------------------------------------------------------------------------------
// The face, by expression. Brows carry most of it; the eyes and the mouth follow

const INK = '#3a2418';
const WHITE = '#fffaf0';
const IRIS = '#2a2018';
const LID = '#8a5240';
const LIP = '#a85a48';
const MOUTH_IN = '#5a2420';
const TEETH = '#f4ead8';
const SWEAT = ['#bfe3ef', '#ffffff'];

function eye(p: Pic, cx: number, cy: number, w: number, face: Face, blink: boolean, near: boolean) {
  const hw = Math.floor(w / 2);
  if (face === 'shout') {
    // Screwed shut: a wedge, the lid pressed down hard
    for (let dx = -hw; dx <= hw; dx++) {
      set(p, cx + dx, cy - 1 + (near ? Math.round(Math.abs(dx) / 2) : 0), INK);
      set(p, cx + dx, cy + (near ? Math.round(Math.abs(dx) / 2) : 0), INK);
    }
    return;
  }
  if (blink) {
    // Shut: the lid's line, curved a little down
    for (let dx = -hw; dx <= hw; dx++) set(p, cx + dx, cy + (Math.abs(dx) === hw ? 0 : 1), INK);
    return;
  }
  // How open: wide when shocked, narrowed by a smile, a lowered lid when thinking
  const top = face === 'shocked' ? -3 : face === 'thinking' ? -1 : face === 'pleased' ? -1 : -2;
  const bot = face === 'shocked' ? 2 : face === 'pleased' ? 0 : 1;
  for (let dy = top; dy <= bot; dy++)
    for (let dx = -hw; dx <= hw; dx++) {
      const corner = Math.abs(dx) === hw && (dy === top || dy === bot);
      if (!corner) set(p, cx + dx, cy + dy, WHITE);
    }
  // The iris: looking ahead, up and away when thinking, small when shocked
  const ix = face === 'thinking' ? -1 : 1;
  const iy = face === 'thinking' ? top : 0;
  const ir = face === 'shocked' ? 0 : 1;
  for (let dy = -ir - (face === 'shocked' ? 0 : 1); dy <= ir; dy++)
    for (let dx = -ir; dx <= ir + (near ? 1 : 0); dx++) if (cy + iy + dy >= cy + top && cy + iy + dy <= cy + bot) set(p, cx + ix + dx, cy + iy + dy, IRIS);
  if (face !== 'shocked') set(p, cx + ix + ir + (near ? 1 : 0), cy + iy - 1, WHITE);
  // The upper lid, heavy; the lower, a soft line
  for (let dx = -hw - 1; dx <= hw; dx++) set(p, cx + dx, cy + top - 1, INK);
  for (let dx = -hw + 1; dx < hw; dx++) set(p, cx + dx, cy + bot + 1, LID);
}

// A brow: from its outer end to its inner end, by how high each sits
function brow(p: Pic, x0: number, x1: number, y0: number, y1: number, arch: number, c: string, thick = 2) {
  const n = Math.abs(x1 - x0);
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const x = x0 + (x1 - x0) * t;
    const y = Math.round(y0 + (y1 - y0) * t - arch * Math.sin(Math.PI * t));
    for (let j = 0; j < thick; j++) set(p, x, y + j, c);
  }
}

function face(p: Pic, h: Head, f: Face, blink: boolean, mouth: Mouth, browCol: string, browThick = 2) {
  // Brows: [outer y, inner y, arch] for the near brow (left) and the far one (right)
  const by = h.eyeY - 5;
  const B: Record<Face, [[number, number, number], [number, number, number]]> = {
    normal: [[0, 0, 1], [0, 0, 1]],
    pleased: [[-1, -1, 2], [-1, -1, 2]],
    shocked: [[-3, -4, 2], [-3, -4, 2]],
    thinking: [[-1, 2, 0], [-3, -2, 1]],
    shout: [[-1, 2, 0], [-1, 2, 0]],
  };
  const [nb, fb] = B[f];
  brow(p, h.nearX - 5, h.nearX + 4, by + nb[0], by + nb[1], nb[2], browCol, browThick);
  brow(p, h.farX + 3, h.farX - 3, by + fb[0], by + fb[1], fb[2], browCol, browThick);
  // A crease between the brows, when thinking or shouting
  if (f === 'thinking' || f === 'shout') line(p, h.nearX + 6, by - 1, h.nearX + 6, by + 1, LID);
  eye(p, h.nearX, h.eyeY, 8, f, blink, true);
  eye(p, h.farX, h.eyeY, 5, f, blink, false);
  // The mouth: shut, half, open; its shape by the face
  const mx = h.mouthX;
  const my = h.mouthY;
  if (f === 'shout') {
    // Wide open, a row of teeth across the top
    for (let dy = -1; dy < 6; dy++)
      for (let dx = -5; dx <= 5; dx++) {
        if (Math.abs(dx) === 5 && (dy === -1 || dy >= 4)) continue;
        if (Math.abs(dx) >= 4 && dy === 5) continue;
        set(p, mx + dx, my + dy - 1, dy === -1 ? LIP : dy === 0 ? TEETH : MOUTH_IN);
      }
    return;
  }
  if (mouth === 0) {
    if (f === 'pleased') {
      for (let dx = -5; dx <= 5; dx++) set(p, mx + dx, my - (Math.abs(dx) >= 4 ? 1 : 0), LIP);
      set(p, mx - 6, my - 2, LIP);
      set(p, mx + 6, my - 2, LIP);
    } else if (f === 'shocked') {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) set(p, mx + dx, my + dy, Math.abs(dx) + Math.abs(dy) === 2 ? LIP : MOUTH_IN);
    } else if (f === 'thinking') {
      for (let dx = 0; dx <= 5; dx++) set(p, mx + dx, my + (dx > 3 ? -1 : 0), LIP);
    } else {
      for (let dx = -4; dx <= 4; dx++) set(p, mx + dx, my + (dx === -4 ? 1 : 0), LIP);
    }
    return;
  }
  // Talking: an opening, a row of teeth along its top when it's wide
  const hgt = mouth === 1 ? 2 : f === 'shocked' ? 6 : 4;
  const w = f === 'shocked' ? 3 : f === 'thinking' ? 3 : 5;
  const up = f === 'pleased' ? -1 : 0;
  for (let dy = 0; dy < hgt; dy++)
    for (let dx = -w; dx <= w; dx++) {
      const edge = Math.abs(dx) === w && (dy === 0 || dy === hgt - 1);
      if (edge) continue;
      set(p, mx + dx + (f === 'thinking' ? 2 : 0), my + dy - 1 + up, mouth === 2 && dy === 0 && f !== 'shocked' ? TEETH : MOUTH_IN);
    }
  for (let dx = -w; dx <= w; dx++) set(p, mx + dx + (f === 'thinking' ? 2 : 0), my - 2 + up, LIP);
}

// ---------------------------------------------------------------------------------------
// The three of them

const HEAD: Record<Actor, Head> = {
  you: { cx: 62, cy: 42, rx: 18, ry: 21, eyeY: 43, nearX: 57, farX: 70, mouthX: 67, mouthY: 56 },
  caddie: { cx: 62, cy: 43, rx: 18, ry: 21, eyeY: 45, nearX: 57, farX: 70, mouthX: 67, mouthY: 58 },
  partner: { cx: 62, cy: 43, rx: 20, ry: 21, eyeY: 45, nearX: 56, farX: 70, mouthX: 68, mouthY: 60 },
};
// The head, tilted by the pose and its frame
function headAt(who: Actor, pose: Pose, frame: 0 | 1): Head {
  const h = HEAD[who];
  const [dx, dy] = add(pose.head, pose.headF1, frame);
  return { ...h, cx: h.cx + dx, cy: h.cy + dy, eyeY: h.eyeY + dy, nearX: h.nearX + dx, farX: h.farX + dx, mouthX: h.mouthX + dx, mouthY: h.mouthY + dy };
}

function drawYou(p: Pic, f: Face, frame: 0 | 1, blink: boolean, mouth: Mouth) {
  const pose = POSES.you[f];
  const h = headAt('you', pose, frame);
  arms(p, pose, 'back', frame, 'jumperRed', knit);
  torso(p, 'jumperRed', knit);
  // The bag's strap, across the chest from the far shoulder
  poly(p, [[84, 80], [96, 84], [66, 146], [54, 146]], 'strap', { base: 0.5 });
  tint(p, (x, y) => x > 60 && y > 84 && (96 - (y - 84) * 0.48 - x) > -1 && (96 - (y - 84) * 0.48 - x) < 2, -0.2, ['jumperRed']);
  // The V of the jumper, a white collar in it
  poly(p, [[52, 80], [62, 96], [72, 80], [67, 78], [62, 87], [57, 78]], 'shirt', { base: 0.6 });
  poly(p, [[53, 78], [58, 78], [62, 86], [55, 86]], 'shirt', { base: 0.75 });
  poly(p, [[71, 78], [66, 78], [62, 86], [69, 86]], 'shirt', { base: 0.75 });
  arms(p, pose, 'mid', frame, 'jumperRed', knit);
  neck(p, h);
  skull(p, h);
  // Hair at the back of the head and over the ear, under the cap
  ell(p, h.cx - 15, h.cy - 2, 5, 9, 'hairBrown', { tex: grain, keep: (x, y) => y > h.cy - 10 && x < h.cx - 9 });
  ell(p, h.cx - 10, h.cy - 5, 8, 3.5, 'hairBrown', { tex: grain, keep: (_x, y) => y > h.cy - 8 });
  ear(p, h);
  // The flat cap: a crown, a band, a peak out over the eyes, casting its shade
  ell(p, h.cx - 2, h.cy - 13, 22, 10, 'capTweed', { tex: tweed, keep: (_x, y) => y <= h.cy - 8 });
  poly(p, [[h.cx + 4, h.cy - 10], [h.cx + 26, h.cy - 8], [h.cx + 26, h.cy - 5], [h.cx + 6, h.cy - 4]], 'capTweed', { tex: tweed, base: 0.45 });
  tint(p, (_x, y) => y === h.cy - 8 || y === h.cy - 7, -0.25, ['capTweed']);
  tint(p, (x, y) => y >= h.cy - 7 && y <= h.cy - 3 && x > h.cx - 16, -0.35, ['skin']);
  face(p, h, f, blink, mouth, MATS.hairBrown.tones[0]);
  arms(p, pose, 'front', frame, 'jumperRed', knit);
  return h;
}

function drawCaddie(p: Pic, f: Face, frame: 0 | 1, blink: boolean, mouth: Mouth) {
  const pose = POSES.caddie[f];
  const h = headAt('caddie', pose, frame);
  arms(p, pose, 'back', frame, 'jacket', flat);
  torso(p, 'jacket', flat);
  // The zip, and a turned-up collar either side of the neck
  tint(p, (x, y) => x === 62 && y > 92, -0.3, ['jacket']);
  poly(p, [[46, 80], [56, 74], [58, 90], [48, 94]], 'jacket', { base: 0.65 });
  poly(p, [[78, 80], [68, 74], [66, 90], [76, 94]], 'jacket', { base: 0.7 });
  // The towel over the shoulder, striped
  poly(p, [[72, 80], [92, 78], [96, 118], [76, 118]], 'towel', { base: 0.6 });
  for (const sy of [92, 104]) poly(p, [[73, sy], [94, sy - 1], [94.5, sy + 2], [73.5, sy + 3]], 'towelStripe', { base: 0.55 });
  arms(p, pose, 'mid', frame, 'jacket', flat);
  neck(p, h);
  skull(p, h);
  // Grey hair at the back
  ell(p, h.cx - 16, h.cy - 2, 4.5, 8, 'hairGrey', { tex: grain, keep: (x, y) => y > h.cy - 8 && x < h.cx - 11 });
  ear(p, h);
  // The beard: round the jaw and up the cheek to the ear, the mouth showing through
  ell(p, h.cx + 1, h.cy + 12, 18, 14, 'beard', { tex: grain, keep: (x, y) => y >= h.cy + 6 || (x < h.cx - 10 && y >= h.cy - 2) });
  ell(p, h.cx + 4, h.cy + 9, 8, 2.4, 'beard', { tex: grain, base: 0.7 });
  // The nose, over the moustache's top edge, or the beard swallows it
  nose(p, { ...h, cy: h.cy - 2 });
  // The wool hat: a dome and a ribbed band turned up
  ell(p, h.cx - 1, h.cy - 18, 21, 13, 'beanie', { tex: ribs, keep: (_x, y) => y <= h.cy - 13 });
  poly(p, [[h.cx - 23, h.cy - 15], [h.cx + 21, h.cy - 15], [h.cx + 20, h.cy - 7], [h.cx - 22, h.cy - 7]], 'beanie', { tex: ribs, base: 0.5 });
  tint(p, (_x, y) => y === h.cy - 15 || y === h.cy - 14, 0.15, ['beanie']);
  tint(p, (x, y) => y >= h.cy - 7 && y <= h.cy - 5 && x > h.cx - 18, -0.3, ['skin']);
  face(p, h, f, blink, mouth, MATS.hairGrey.tones[0]);
  arms(p, pose, 'front', frame, 'jacket', flat);
  return h;
}

function drawPartner(p: Pic, f: Face, frame: 0 | 1, blink: boolean, mouth: Mouth) {
  const pose = POSES.partner[f];
  const h = headAt('partner', pose, frame);
  arms(p, pose, 'back', frame, 'jumperPink', cable);
  torso(p, 'jumperPink', cable);
  // A white polo collar
  poly(p, [[50, 80], [62, 82], [59, 90], [48, 86]], 'shirt', { base: 0.7 });
  poly(p, [[74, 80], [63, 82], [66, 90], [76, 86]], 'shirt', { base: 0.75 });
  arms(p, pose, 'mid', frame, 'jumperPink', cable);
  neck(p, h);
  skull(p, h);
  // Ginger at the back, rosy in the cheek
  ell(p, h.cx - 18, h.cy - 1, 4.5, 8, 'ginger', { tex: grain, keep: (x, y) => y > h.cy - 7 && x < h.cx - 13 });
  ear(p, h);
  tint(p, (x, y) => Math.hypot(x - h.cx - 13, y - h.cy - 7) < 4 && bayer(x, y) < 0.5, -0.1, ['skin']);
  // The bucket hat: a crown, a band, a soft brim all round
  ell(p, h.cx - 1, h.cy - 18, 18, 11, 'bucket', { tex: weave, keep: (_x, y) => y <= h.cy - 11 });
  poly(p, [[h.cx - 19, h.cy - 14], [h.cx + 17, h.cy - 14], [h.cx + 17, h.cy - 11], [h.cx - 19, h.cy - 11]], 'bucketBand', { base: 0.5 });
  ell(p, h.cx - 1, h.cy - 10, 29, 5, 'bucket', { tex: weave, base: 0.5, keep: (_x, y) => y >= h.cy - 12 });
  tint(p, (x, y) => y >= h.cy - 6 && y <= h.cy - 3 && x > h.cx - 24 && x < h.cx + 28, -0.35, ['skin', 'ginger']);
  // The moustache: full under the nose, tapering out and down at the ends
  const mx = h.mouthX;
  const my = h.mouthY;
  poly(p, [[mx - 8, my - 7], [mx - 2, my - 9], [mx + 2, my - 9], [mx + 8, my - 7], [mx + 13, my - 2], [mx + 10, my - 1], [mx + 5, my - 4], [mx, my - 4], [mx - 5, my - 4], [mx - 11, my - 1], [mx - 14, my - 2]], 'ginger', { tex: grain, base: 0.55 });
  face(p, h, f, blink, mouth, MATS.ginger.tones[1], 3);
  arms(p, pose, 'front', frame, 'jumperPink', cable);
  return h;
}

// ---------------------------------------------------------------------------------------
// Into pixels: tones by lightness (dithered at the seams), the sun's rim on the lit edge,
// the dark line on the shaded edges only

function render(p: Pic): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const img = g.createImageData(W, H);
  const out = (x: number, y: number, col: string) => {
    const tx = p.ls > 0 ? x : W - 1 - x;
    const i = (y * W + tx) * 4;
    img.data[i] = parseInt(col.slice(1, 3), 16);
    img.data[i + 1] = parseInt(col.slice(3, 5), 16);
    img.data[i + 2] = parseInt(col.slice(5, 7), 16);
    img.data[i + 3] = 255;
  };
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? -1 : p.mat[y * W + x]);
  const ls = p.ls;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const m = p.mat[i];
      if (p.over[i]) {
        out(x, y, p.over[i]!);
        continue;
      }
      if (m < 0) {
        // The line: only where a shape's shaded edge (away from the sun) or its foot meets
        // the air
        const sh = at(x + ls, y);
        const up = at(x, y - 1);
        if (sh >= 0) out(x, y, MATS[MAT_LIST[sh]].line);
        else if (up >= 0 && y < H - 1) out(x, y, MATS[MAT_LIST[up]].line);
        continue;
      }
      const mat = MATS[MAT_LIST[m]];
      // The sun's rim: the lit edge, two pixels deep where it's already bright
      const edge = at(x + ls, y) < 0 || (at(x + 2 * ls, y) < 0 && p.v[i] > 0.6);
      if (edge && y < H - 2) {
        out(x, y, mat.rim);
        continue;
      }
      // A seam between materials, from the one above: a dark line under a hat or hair
      const above = at(x, y - 1);
      let v = p.v[i];
      if (above >= 0 && above !== m) v -= 0.3;
      const d = MAT_LIST[m] === 'skin' ? 0.22 : 0.42;
      const t = Math.max(0, Math.min(3, Math.floor(v * 4 + (bayer(x, y) - 0.5) * d)));
      out(x, y, mat.tones[t]);
    }
  g.putImageData(img, 0, 0);
  return c;
}

// ---------------------------------------------------------------------------------------

const cache = new Map<string, HTMLCanvasElement>();
/** One frame of a portrait: the face and its pose, the pose's frame, eyes shut or not, the
 *  mouth's frame; flip to face left with the light kept on the right */
export function portraitFrame(who: Actor, f: Face, frame: 0 | 1, blink: boolean, mouth: Mouth, flip = false): HTMLCanvasElement {
  const key = `${who}:${f}:${frame}:${blink}:${mouth}:${flip}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const p = pic(flip ? -1 : 1);
  const h = who === 'you' ? drawYou(p, f, frame, blink, mouth) : who === 'caddie' ? drawCaddie(p, f, frame, blink, mouth) : drawPartner(p, f, frame, blink, mouth);
  // Caught out: a bead of sweat at the temple, falling on the second frame
  if (f === 'shocked') {
    const sx = h.cx - 17;
    const sy = h.cy - 8 + frame * 3;
    for (const [dx, dy, k] of [[0, 0, 0], [-1, 1, 0], [0, 1, 1], [1, 1, 0], [-1, 2, 0], [0, 2, 0], [1, 2, 0], [0, 3, 0]] as const) set(p, sx + dx, sy + dy, SWEAT[k]);
  }
  const c = render(p);
  cache.set(key, c);
  return c;
}

export const FACES: Face[] = ['normal', 'pleased', 'shocked', 'thinking', 'shout'];
