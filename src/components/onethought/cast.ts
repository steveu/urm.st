// The cast on the walk's stage: you, your caddie and your partner, head and shoulders, on
// a 128 by 144 plate, drawn at the board's own pixel size, so they're finer than the
// board's sprites rather than a small face blown up. The box at the foot of the frame
// cuts them at the chest.
//
// Each is built from named parts (torso, neck, head, ear, nose, hair, hat), every
// part a shape filled with a material: four tones lit from the right, where the low sun
// is, a warm rim on the sunny edge, and a dark line all round. Textures go
// on as the tones are worked out: the knit of a jumper, the weave of a hat, the grain of a
// beard. The face is drawn over that, by expression: brows, eyes, lids and mouth.
//
// The face carries each expression, with a tilt of the head. Each has a second frame, a
// small move of the head (a jolt, a nod, a bob) that the stage swaps in now and then, on
// top of the blink and the talking mouth.
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
// Poses: head and shoulders only, the face carrying it. Each face tilts the head its own
// way, and `headF1` is the second frame's nudge (a jolt while caught out, a nod while
// thinking, a bob while pleased)

type Pose = { head: Pt; headF1?: Pt };

const POSES: Record<Actor, Record<Face, Pose>> = {
  you: {
    normal: { head: [0, 0] },
    pleased: { head: [0, 1], headF1: [0, -1] },
    shocked: { head: [-2, -1], headF1: [-1, 0] },
    thinking: { head: [1, 2], headF1: [0, 1] },
    shout: { head: [2, -2], headF1: [1, -1] },
  },
  caddie: {
    normal: { head: [0, 0] },
    pleased: { head: [0, 1], headF1: [0, -1] },
    shocked: { head: [-1, -1], headF1: [-1, 0] },
    thinking: { head: [1, 1], headF1: [0, 1] },
    shout: { head: [0, 0] },
  },
  partner: {
    normal: { head: [0, 0] },
    pleased: { head: [-1, -1], headF1: [0, -2] },
    shocked: { head: [-2, -1], headF1: [-1, 0] },
    thinking: { head: [1, 2], headF1: [0, 1] },
    shout: { head: [0, 0] },
  },
};

const add = (a: Pt, b: Pt | undefined, k: number): Pt => (b ? [a[0] + b[0] * k, a[1] + b[1] * k] : a);

// ---------------------------------------------------------------------------------------
// The common figure: the torso, the neck, the head, the ear, the nose.
// The head's parts are placed from its centre, so a pose can tilt it

type Head = { cx: number; cy: number; rx: number; ry: number; eyeY: number; nearX: number; farX: number; mouthX: number; mouthY: number };

function torso(p: Pic, body: MatName, bodyTex: Tex) {
  poly(p, [[14, 146], [18, 104], [24, 90], [36, 82], [50, 78], [62, 77], [74, 78], [88, 82], [100, 90], [106, 104], [110, 146]], body, { tex: bodyTex, base: 0.48 });
  tint(p, (_x, y) => y >= 134, -0.1, [body]);
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
  ell(p, head.cx + 5, head.cy + 10, head.rx - 4, head.ry * 0.6, 'skin', { base: 0.5 });
  ear(p, head);
  nose(p, head);
  // Under the jaw, in shade
  tint(p, (x, y) => y >= head.cy + head.ry * 0.55 + 10 && y <= head.cy + head.ry * 0.55 + 13 && Math.abs(x - head.cx - 2) < head.rx - 4, -0.2, ['skin']);
}

// The nose, the head turned well round: it breaks the face's outline at the front, from
// the brow down to a tip past the cheek, lit on its front, shaded back along its near
// flank and under the tip. Drawn again over a beard
function nose(p: Pic, head: Head) {
  const fx = head.cx + head.rx;
  const top = head.eyeY + 1;
  const nb = head.cy + 8;
  poly(p, [[fx - 3, top], [fx, top], [fx + 4, nb - 1], [fx + 3, nb + 1], [fx - 2, nb + 1], [fx - 4, nb - 2]], 'skin', { base: 0.7 });
  tint(p, (x, y) => y > top + 1 && y < nb - 1 && x >= fx - 5 && x <= fx - 3, -0.2, ['skin']);
  tint(p, (x, y) => y === nb + 1 && x >= fx - 2 && x <= fx + 2, -0.4, ['skin']);
  tint(p, (x, y) => y === nb && x === fx - 1, -0.45, ['skin']);
}

// The ear, halfway back on the turned head: lighter than the cheek, a dark edge where it
// meets the face at the front, a hollow inside. Drawn again over any hair
function ear(p: Pic, head: Head) {
  const ex = head.cx - 6;
  const ey = head.cy + 3;
  ell(p, ex, ey, 4, 6, 'skin', { base: 0.62 });
  const r = (x: number, y: number) => Math.hypot((x + 0.5 - ex) / 4.5, (y + 0.5 - ey) / 6.5);
  tint(p, (x, y) => x >= ex && r(x, y) >= 0.78 && r(x, y) < 1.12, -0.45, ['skin']);
  tint(p, (x, y) => Math.hypot((x + 0.5 - ex - 0.5) / 1.6, (y + 0.5 - ey) / 3.2) < 1, -0.3, ['skin']);
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

// `lip` is for a face with hair round the mouth: the talking mouth a little bigger, with a
// lower lip under it, so it's seen to move under a moustache
function face(p: Pic, h: Head, f: Face, blink: boolean, mouth: Mouth, browCol: string, o: { thick?: number; lip?: boolean } = {}) {
  const browThick = o.thick ?? 2;
  // Brows: [outer y, inner y, arch] for the near brow (left) and the far one (right)
  const by = h.eyeY - 5;
  const B: Record<Face, [[number, number, number], [number, number, number]]> = {
    normal: [[-1, -1, 1], [-1, -1, 1]],
    pleased: [[-1, -1, 2], [-1, -1, 2]],
    shocked: [[-3, -4, 2], [-3, -4, 2]],
    thinking: [[-1, 2, 0], [-3, -2, 1]],
    shout: [[-1, 2, 0], [-1, 2, 0]],
  };
  const [nb, fb] = B[f];
  brow(p, h.nearX - 5, h.nearX + 4, by + nb[0], by + nb[1], nb[2], browCol, browThick);
  brow(p, h.farX + 2, h.farX - 1, by + fb[0], by + fb[1], fb[2], browCol, browThick);
  // A crease between the brows, when thinking or shouting
  if (f === 'thinking' || f === 'shout') line(p, h.nearX + 6, by - 1, h.nearX + 6, by + 1, LID);
  eye(p, h.nearX, h.eyeY, 8, f, blink, true);
  eye(p, h.farX, h.eyeY, 3, f, blink, false);
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
  const hgt = (mouth === 1 ? 2 : f === 'shocked' ? 6 : 4) + (o.lip ? 1 : 0);
  const w = (f === 'shocked' ? 3 : f === 'thinking' ? 3 : 5) + (o.lip ? 1 : 0);
  const up = f === 'pleased' ? -1 : 0;
  const ox = f === 'thinking' ? 2 : 0;
  for (let dy = 0; dy < hgt; dy++)
    for (let dx = -w; dx <= w; dx++) {
      const edge = Math.abs(dx) === w && (dy === 0 || dy === hgt - 1);
      if (edge) continue;
      set(p, mx + dx + ox, my + dy - 1 + up, mouth === 2 && dy === 0 && f !== 'shocked' ? TEETH : MOUTH_IN);
    }
  for (let dx = -w; dx <= w; dx++) set(p, mx + dx + ox, my - 2 + up, LIP);
  // The lower lip, a line under the opening
  if (o.lip) for (let dx = -w + 1; dx < w; dx++) set(p, mx + dx + ox, my + hgt - 1 + up, LIP);
}

// ---------------------------------------------------------------------------------------
// The three of them

const HEAD: Record<Actor, Head> = {
  you: { cx: 62, cy: 50, rx: 18, ry: 21, eyeY: 51, nearX: 69, farX: 78, mouthX: 72, mouthY: 64 },
  caddie: { cx: 62, cy: 51, rx: 18, ry: 21, eyeY: 53, nearX: 69, farX: 78, mouthX: 72, mouthY: 66 },
  partner: { cx: 62, cy: 51, rx: 20, ry: 21, eyeY: 53, nearX: 70, farX: 80, mouthX: 73, mouthY: 68 },
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
  torso(p, 'jumperRed', knit);
  // The bag's strap, across the chest from the far shoulder
  poly(p, [[84, 80], [96, 84], [66, 146], [54, 146]], 'strap', { base: 0.5 });
  tint(p, (x, y) => x > 60 && y > 84 && (96 - (y - 84) * 0.48 - x) > -1 && (96 - (y - 84) * 0.48 - x) < 2, -0.2, ['jumperRed']);
  // The V of the jumper, a white collar in it
  poly(p, [[52, 80], [62, 96], [72, 80], [67, 78], [62, 87], [57, 78]], 'shirt', { base: 0.6 });
  poly(p, [[53, 78], [58, 78], [62, 86], [55, 86]], 'shirt', { base: 0.75 });
  poly(p, [[71, 78], [66, 78], [62, 86], [69, 86]], 'shirt', { base: 0.75 });
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
  return h;
}

function drawCaddie(p: Pic, f: Face, frame: 0 | 1, blink: boolean, mouth: Mouth) {
  const pose = POSES.caddie[f];
  const h = headAt('caddie', pose, frame);
  torso(p, 'jacket', flat);
  // The zip, and a turned-up collar either side of the neck
  tint(p, (x, y) => x === 62 && y > 92, -0.3, ['jacket']);
  poly(p, [[46, 80], [56, 74], [58, 90], [48, 94]], 'jacket', { base: 0.65 });
  poly(p, [[78, 80], [68, 74], [66, 90], [76, 94]], 'jacket', { base: 0.7 });
  neck(p, h);
  skull(p, h);
  // Grey hair at the back
  ell(p, h.cx - 16, h.cy - 2, 4.5, 8, 'hairGrey', { tex: grain, keep: (x, y) => y > h.cy - 8 && x < h.cx - 11 });
  // The beard: the chin and the jaw, longer than the skull, up the near cheek to the
  // rim and up the far one to a sideburn, with skin left between it and the ear and
  // round the mouth. Its top edge is a line from the sideburn down to the mouth's corner
  // and back up the cheek; its rim breaks into tufts, with a few stray pixels outside
  const mx = h.mouthX;
  const my = h.mouthY;
  const beardTop = (x: number) => {
    if (x < h.cx - 10) return h.cy + 2;
    if (x < mx - 5) return h.cy + 4 + (x - (h.cx - 10));
    if (x <= mx + 6) return my + 3;
    return my - 1 - Math.round((x - mx - 6) * 0.9);
  };
  const bx = h.cx + 4;
  const by = h.cy + 11;
  ell(p, bx, by, 18, 17, 'beard', { tex: grain, keep: (x, y) => y >= beardTop(x) + 1 && hash(x, y, 23) > 0.62 });
  ell(p, bx, by, 16, 15, 'beard', { tex: grain, keep: (x, y) => y >= beardTop(x) && (y > beardTop(x) + 1 || hash(x, y, 29) > 0.3) });
  ear(p, h);
  // The lips, bare in the beard, then the moustache over the top one, lifting a pixel as
  // the mouth opens wide
  ell(p, mx, my + 1, 7, 3.5, 'skin', { base: 0.5 });
  const lift = mouth === 2 ? 1 : 0;
  poly(p, [[mx - 7, my - 6 - lift], [mx - 2, my - 8 - lift], [mx + 1, my - 8 - lift], [mx + 4, my - 6 - lift], [mx + 6, my - 2 - lift], [mx + 4, my - 2 - lift], [mx + 2, my - 4 - lift], [mx, my - 4 - lift], [mx - 4, my - 4 - lift], [mx - 8, my - 2 - lift], [mx - 11, my - 2 - lift]], 'beard', { tex: grain, base: 0.62 });
  // The nose, over the moustache's top edge, or the beard swallows it
  nose(p, { ...h, cy: h.cy - 2 });
  // The wool hat: a dome and a ribbed band turned up
  ell(p, h.cx - 1, h.cy - 18, 21, 13, 'beanie', { tex: ribs, keep: (_x, y) => y <= h.cy - 13 });
  poly(p, [[h.cx - 23, h.cy - 15], [h.cx + 21, h.cy - 15], [h.cx + 20, h.cy - 7], [h.cx - 22, h.cy - 7]], 'beanie', { tex: ribs, base: 0.5 });
  tint(p, (_x, y) => y === h.cy - 15 || y === h.cy - 14, 0.15, ['beanie']);
  tint(p, (x, y) => y >= h.cy - 7 && y <= h.cy - 5 && x > h.cx - 18, -0.3, ['skin']);
  face(p, h, f, blink, mouth, MATS.hairGrey.tones[0], { lip: true });
  return h;
}

function drawPartner(p: Pic, f: Face, frame: 0 | 1, blink: boolean, mouth: Mouth) {
  const pose = POSES.partner[f];
  const h = headAt('partner', pose, frame);
  torso(p, 'jumperPink', cable);
  // A white polo collar
  poly(p, [[50, 80], [62, 82], [59, 90], [48, 86]], 'shirt', { base: 0.7 });
  poly(p, [[74, 80], [63, 82], [66, 90], [76, 86]], 'shirt', { base: 0.75 });
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
  // The moustache: full under the nose, tapering out and down at the ends, lifting a
  // pixel as the mouth opens wide
  const mx = h.mouthX;
  const my = h.mouthY - (mouth === 2 ? 1 : 0);
  poly(p, [[mx - 8, my - 7], [mx - 2, my - 9], [mx + 1, my - 9], [mx + 4, my - 7], [mx + 6, my - 2], [mx + 5, my - 1], [mx + 2, my - 4], [mx, my - 4], [mx - 5, my - 4], [mx - 11, my - 1], [mx - 14, my - 2]], 'ginger', { tex: grain, base: 0.55 });
  face(p, h, f, blink, mouth, MATS.ginger.tones[1], { thick: 3, lip: true });
  return h;
}

// ---------------------------------------------------------------------------------------
// Into pixels: tones by lightness (dithered at the seams), the sun's rim on the lit edge,
// the dark line all round

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
        // The line: all round, wherever a shape meets the air, in the colour of the
        // shape it edges (the shaded side's first, then the one above); the rim sits a
        // pixel inside it on the sunny side, so the figure holds against a bright sky
        const sh = at(x + ls, y);
        const up = at(x, y - 1);
        const lit = at(x - ls, y);
        const dn = at(x, y + 1);
        const n = sh >= 0 ? sh : up >= 0 ? up : lit >= 0 ? lit : y < H - 1 ? dn : -1;
        if (n >= 0) out(x, y, MATS[MAT_LIST[n]].line);
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

/** Where the head is in a portrait, hat included, as drawn or flipped */
export function headBox(who: Actor, flip = false): { x: number; y: number; w: number; h: number } {
  const h = HEAD[who];
  const x = h.cx - h.rx - 2;
  const w = h.rx * 2 + 4;
  return { x: flip ? W - x - w : x, y: h.cy - h.ry - 12, w, h: h.ry * 2 + 12 };
}

// ---------------------------------------------------------------------------------------
// The gallery at the rope: three of them in silhouette against the low sun, hand-placed
// at the board's pixel, near, so their heads break the horizon. '#' is ink, '+' the light
// on a sunward edge, '*' where it's bright, the cap's peak and the hat's brim. Their feet
// are under the box, so the coats run on. Drawn facing right, towards the course and you:
// a flat cap with a hand cupped to the mouth (the one doing the shouting), a bobble hat
// stood behind with their hands in their pockets, a bare head wound in a scarf with their
// arms folded

type GalleryFig = { rows: string[]; ink: string; lit: string; hi: string };
const HECKLER: GalleryFig = {
  ink: '#221a2c',
  lit: '#6e4c66',
  hi: '#c09aac',
  rows: [
    '..........########..........',
    '........############........',
    '.......##############.......',
    '......################......',
    '......#################.....',
    '.....##################.....',
    '.....###################***.',
    '.....######################.',
    '......##################....',
    '.......###########+.........',
    '.......###########+.........',
    '.......############+........',
    '.......#############+.......',
    '.......############++#......',
    '........##########+#####+...',
    '........##########+######+..',
    '........#########+#######+..',
    '.........########.#######+..',
    '..........######..#######+..',
    '...........#####...######+..',
    '...........#####....#####+..',
    '...........#####....#####+..',
    '...........#####.....####+..',
    '..........######.....#####+.',
    '.........#######......####+.',
    '........######+##.....####+.',
    '......#######+###.....####+.',
    '.....#######+####.....#####+',
    '....#############.....#####+',
    '...##############.....#####+',
    '...###############....#####+',
    '...################...#####+',
    '...#################..#####+',
    '...#######################+.',
    '...######################+..',
    '...#####################+...',
    '...####################.....',
    '...###################......',
    '...##################.......',
    '...##################.......',
    '...##################.......',
    '...##################.......',
    '...##################.......',
    '...##################.......',
    '...##################.......',
    '...##################.......',
    '...##################.......',
    '...##################.......',
    '...##################.......',
    '...##################.......',
    '...##################.......',
    '...##################.......',
    '...##################.......',
    '...##################.......',
    '...##################.......',
    '...##################.......',
    '...##################.......',
    '...##################.......',
    '....################........',
    '....################........',
    '....################........',
    '....################........',
    '....################........',
    '....################........',
    '....################........',
    '....################........',
    '....################........',
    '....################........',
    '....################........',
    '....################........',
    '....################........',
    '....################........',
    '....################........',
    '....################........',
    '....################........',
    '....################........',
    '....################........',
    '....################........',
    '....################........',
    '....################........',
    '....################........',
    '....################........',
    '....################........',
    '....################........',
  ],
};
const BOBBLE: GalleryFig = {
  ink: '#3a2c48',
  lit: '#7a5a74',
  hi: '#b890a8',
  rows: [
    '...........####...........',
    '..........######..........',
    '..........######+.........',
    '...........####...........',
    '.........########.........',
    '........##########........',
    '.......############.......',
    '......##############......',
    '......##############+.....',
    '.....################.....',
    '.....################+....',
    '.....################+....',
    '....##################*...',
    '....###################...',
    '....###################+..',
    '....###################+..',
    '....###################...',
    '.....#################....',
    '.....################+....',
    '.....################+....',
    '.....#################+...',
    '.....#################+...',
    '.....################+....',
    '......###############+....',
    '......##############+.....',
    '.......############.......',
    '........##########........',
    '.........########.........',
    '.........########.........',
    '........##########........',
    '.....################.....',
    '...##################+....',
    '..####################+...',
    '.######################+..',
    '.#######################+.',
    '.#######################+.',
    '.########################.',
    '.########################.',
    '.########################.',
    '.########################.',
    '.########################.',
    '.########################.',
    '.########################.',
    '.########################.',
    '##########################',
    '##########################',
    '##########################',
    '##########################',
    '##########################',
    '##########################',
    '##########################',
    '##########################',
    '##########################',
    '##########################',
    '##########################',
    '##########################',
    '##########################',
    '##########################',
    '##########################',
    '##########################',
    '.########################.',
    '.########################.',
    '.########################.',
    '.########################.',
    '.########################.',
    '.########################.',
    '.########################.',
    '.########################.',
    '.########################.',
    '.########################.',
    '.########################.',
    '.########################.',
    '.########################.',
    '.########################.',
    '.########################.',
    '.########################.',
    '.########################.',
    '.########################.',
    '.########################.',
    '.########################.',
    '.########################.',
    '.########################.',
    '.########################.',
    '.########################.',
    '.########################.',
    '.########################.',
    '.########################.',
    '.########################.',
    '.########################.',
    '.########################.',
    '.########################.',
    '.########################.',
  ],
};
const SCARF: GalleryFig = {
  ink: '#221a2c',
  lit: '#6e4c66',
  hi: '#c09aac',
  rows: [
    '........#..##...........',
    '.......####.###.........',
    '......###########.......',
    '.....#############......',
    '.....##############.....',
    '....################....',
    '....################+...',
    '....################+...',
    '....################+...',
    '....#################...',
    '....#################+..',
    '....################+...',
    '.....###############+...',
    '.....##############+....',
    '......############+.....',
    '...###################..',
    '..####################+.',
    '..####################+.',
    '..#####################.',
    '...###################..',
    '....#############+####..',
    '....##############.####.',
    '...###############.####+',
    '..################.####+',
    '.#################.####+',
    '.######################+',
    '.######################.',
    '.######################.',
    '.#####################+.',
    '.######################.',
    '.######################.',
    '.######################.',
    '.######################.',
    '.######################.',
    '.######################.',
    '.+++++++++++++++++++++..',
    '.######################.',
    '.#######################',
    '.#######################',
    '.#######################',
    '.#######################',
    '.#######################',
    '.#######################',
    '.#######################',
    '.######################.',
    '..####################..',
    '..####################..',
    '..####################..',
    '..####################..',
    '..####################..',
    '..####################..',
    '..####################..',
    '..####################..',
    '..####################..',
    '..####################..',
    '..####################..',
    '..####################..',
    '..####################..',
    '..####################..',
    '..####################..',
    '..####################..',
    '..####################..',
    '..####################..',
    '..####################..',
    '..####################..',
    '..####################..',
    '..####################..',
    '..####################..',
    '..####################..',
    '..####################..',
    '..####################..',
    '..####################..',
    '..####################..',
    '..####################..',
    '..####################..',
    '..####################..',
  ],
};

const galleryCache: HTMLCanvasElement[] = [];
/** The three at the rope, in order back to front: the bobble hat, the cap, the scarf.
 *  Each is its own sprite; the stage places them by the frame's width */
export function galleryFigures(): HTMLCanvasElement[] {
  if (galleryCache.length) return galleryCache;
  for (const f of [BOBBLE, HECKLER, SCARF]) {
    const w = f.rows[0].length;
    const h = f.rows.length;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d')!;
    f.rows.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (ch === '.') return;
        g.fillStyle = ch === '#' ? f.ink : ch === '+' ? f.lit : f.hi;
        g.fillRect(x, y, 1, 1);
      }),
    );
    galleryCache.push(c);
  }
  return galleryCache;
}
