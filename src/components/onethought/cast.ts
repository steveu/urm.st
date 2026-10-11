// The cast on the walk's stage, large: you, your caddie and your partner. 112 by 112
// pixels, drawn at the board's own pixel size, so they're finer than the board's sprites
// rather than a small face blown up.
//
// Each is built from named parts (shoulders, neck, head, ear, nose, hair, hat), every part
// a shape filled with a material: four tones lit from the right, where the low sun is, a
// warm rim on the sunny edge, and a dark line only on the shaded edges. Textures go on as
// the tones are worked out: the knit of a jumper, the weave of a hat, the grain of a
// beard. The face is drawn over that, by expression: brows, eyes, lids and mouth.
//
// Drawn facing right. The others face left on the stage, so they're drawn mirrored with
// the light reversed, which keeps the sun on the right for everyone.

import { bayer, hash } from './pixel';

export type Actor = 'you' | 'caddie' | 'partner';
export type Face = 'normal' | 'pleased' | 'shocked' | 'thinking';
/** The mouth while talking: shut, half open, open */
export type Mouth = 0 | 1 | 2;

export const SIZE = 112;
const N = SIZE;

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
} satisfies Record<string, Mat>;
type MatName = keyof typeof MATS;
const MAT_LIST = Object.keys(MATS) as MatName[];

// ---------------------------------------------------------------------------------------
// The working picture: per pixel, a material and a lightness (0 dark to 1 lit), plus an
// overlay of exact colours for the face

type Pic = { mat: Int8Array; v: Float32Array; over: (string | null)[]; ls: number };
const pic = (ls: number): Pic => ({ mat: new Int8Array(N * N).fill(-1), v: new Float32Array(N * N), over: new Array(N * N).fill(null), ls });

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
      if (x < 0 || y < 0 || x >= N || y >= N) continue;
      const nx = (x + 0.5 - cx) / rx;
      const ny = (y + 0.5 - cy) / ry;
      if (nx * nx + ny * ny > 1) continue;
      if (o.keep && !o.keep(x, y)) continue;
      const i = y * N + x;
      p.mat[i] = mi;
      p.v[i] = base + 0.4 * nx * p.ls - 0.22 * ny + tex(x, y);
    }
}
// Fill a polygon, lit across its width
function poly(p: Pic, pts: [number, number][], m: MatName, o: { tex?: Tex; base?: number } = {}) {
  const mi = MAT_LIST.indexOf(m);
  const tex = o.tex ?? flat;
  const base = o.base ?? 0.55;
  const xs = pts.map((q) => q[0]);
  const ys = pts.map((q) => q[1]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  for (let y = Math.max(0, Math.floor(Math.min(...ys))); y <= Math.min(N - 1, Math.ceil(Math.max(...ys))); y++)
    for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(N - 1, Math.ceil(x1)); x++) {
      let inside = false;
      for (let a = 0, b = pts.length - 1; a < pts.length; b = a++) {
        const [xa, ya] = pts[a];
        const [xb, yb] = pts[b];
        if (ya > y + 0.5 !== yb > y + 0.5 && x + 0.5 < ((xb - xa) * (y + 0.5 - ya)) / (yb - ya) + xa) inside = !inside;
      }
      if (!inside) continue;
      const i = y * N + x;
      p.mat[i] = mi;
      p.v[i] = base + 0.3 * ((x - (x0 + x1) / 2) / ((x1 - x0) / 2 || 1)) * p.ls + tex(x, y);
    }
}
// Darken (or lighten) what's already there, where a shape says: shadows cast by a brim,
// a jaw, a collar
function tint(p: Pic, test: (x: number, y: number) => boolean, dv: number, only?: MatName[]) {
  const ids = only?.map((m) => MAT_LIST.indexOf(m));
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      if (p.mat[i] < 0 || (ids && !ids.includes(p.mat[i])) || !test(x, y)) continue;
      p.v[i] += dv;
    }
}
const set = (p: Pic, x: number, y: number, c: string) => {
  if (x >= 0 && y >= 0 && x < N && y < N) p.over[Math.round(y) * N + Math.round(x)] = c;
};
// A line of exact colour, a pixel thick
function line(p: Pic, x0: number, y0: number, x1: number, y1: number, c: string) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let k = 0; k <= n; k++) set(p, x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n, c);
}

// ---------------------------------------------------------------------------------------
// The common figure: shoulders, neck, head, ear, nose. Returns where the face goes

type Head = { cx: number; cy: number; rx: number; ry: number; eyeY: number; nearX: number; farX: number; mouthX: number; mouthY: number };

function figure(p: Pic, body: MatName, bodyTex: Tex, head: Head) {
  // Shoulders and the top of the chest, sloping off the neck and running out of the frame
  poly(p, [[-2, 113], [2, 101], [12, 93], [30, 87], [44, 84], [68, 84], [82, 87], [100, 93], [110, 101], [114, 113]], body, { tex: bodyTex, base: 0.48 });
  tint(p, (_x, y) => y >= 104, -0.12, [body]);
  // The neck, in the jaw's shadow at the top
  for (let y = head.cy + 14; y < 94; y++) for (let x = 46; x <= 66; x++) p.mat[y * N + x] = MAT_LIST.indexOf('skin');
  for (let y = head.cy + 14; y < 94; y++)
    for (let x = 46; x <= 66; x++) {
      const i = y * N + x;
      p.v[i] = 0.3 + ((x - 56) / 10) * 0.2 * p.ls + (y - head.cy - 14) * 0.01;
    }
  // The skull and the jaw, the ear on the far side
  ell(p, head.cx, head.cy, head.rx, head.ry, 'skin');
  ell(p, head.cx + 3, head.cy + 12, head.rx - 4, head.ry * 0.6, 'skin', { base: 0.5 });
  ear(p, head);
  nose(p, head);
  // Under the jaw, in shade
  tint(p, (x, y) => y >= head.cy + head.ry * 0.55 + 12 && y <= head.cy + head.ry * 0.55 + 16, -0.2, ['skin']);
  return head;
}

// The nose, turned three-quarters with the head: down from between the eyes, its tip
// towards the far eye, lit on its bridge and shaded on the near flank and underneath.
// Drawn again over a beard
function nose(p: Pic, head: Head) {
  const nx = Math.round((head.nearX + head.farX) / 2) + 1;
  const ny = head.eyeY + 1;
  const nb = head.cy + 10;
  poly(p, [[nx - 1, ny], [nx + 1, ny], [nx + 4, nb - 3], [nx + 5, nb - 1], [nx + 3, nb + 1], [nx - 3, nb + 1], [nx - 4, nb - 1]], 'skin', { base: 0.68 });
  tint(p, (x, y) => y > ny + 1 && y < nb - 1 && x >= nx - 3 && x <= nx - 1 && x - (nx - 3) < (y - ny) / 3, -0.26, ['skin']);
  tint(p, (x, y) => y >= nb + 1 && y <= nb + 2 && x >= nx - 4 && x <= nx + 4, -0.4, ['skin']);
  tint(p, (x, y) => y === nb && (x === nx - 2 || x === nx + 2), -0.45, ['skin']);
}

// The ear, on the far side: drawn again over any hair
function ear(p: Pic, head: Head) {
  const ex = head.cx - head.rx + 2;
  ell(p, ex, head.cy + 4, 4.5, 7, 'skin', { base: 0.4 });
  tint(p, (x, y) => Math.hypot((x - ex - 0.5) / 2, (y - head.cy - 4) / 4) < 1, -0.25, ['skin']);
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
  if (face === 'pleased') for (let dx = -hw + 1; dx < hw; dx++) set(p, cx + dx, cy + bot + 1, LID);
  else for (let dx = -hw + 1; dx < hw; dx++) set(p, cx + dx, cy + bot + 1, LID);
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
  const by = h.eyeY - 6;
  const B: Record<Face, [[number, number, number], [number, number, number]]> = {
    normal: [[0, 0, 1], [0, 0, 1]],
    pleased: [[-1, -1, 2], [-1, -1, 2]],
    shocked: [[-3, -4, 2], [-3, -4, 2]],
    thinking: [[-1, 2, 0], [-3, -2, 1]],
  };
  const [nb, fb] = B[f];
  brow(p, h.nearX - 6, h.nearX + 4, by + nb[0], by + nb[1], nb[2], browCol, browThick);
  brow(p, h.farX + 4, h.farX - 3, by + fb[0], by + fb[1], fb[2], browCol, browThick);
  // A worried crease between the brows, when thinking
  if (f === 'thinking') line(p, h.nearX + 6, by - 1, h.nearX + 6, by + 1, LID);
  eye(p, h.nearX, h.eyeY, 9, f, blink, true);
  eye(p, h.farX, h.eyeY, 6, f, blink, false);
  // The mouth: shut, half, open; its shape by the face
  const mx = h.mouthX;
  const my = h.mouthY;
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
  you: { cx: 55, cy: 50, rx: 21, ry: 25, eyeY: 51, nearX: 52, farX: 67, mouthX: 63, mouthY: 67 },
  caddie: { cx: 55, cy: 51, rx: 21, ry: 25, eyeY: 53, nearX: 52, farX: 67, mouthX: 63, mouthY: 69 },
  partner: { cx: 55, cy: 52, rx: 24, ry: 25, eyeY: 53, nearX: 51, farX: 67, mouthX: 64, mouthY: 72 },
};

function drawYou(p: Pic, f: Face, blink: boolean, mouth: Mouth) {
  const h = figure(p, 'jumperRed', knit, HEAD.you);
  // The V of the jumper, a white collar in it
  poly(p, [[44, 86], [56, 104], [68, 86], [62, 84], [56, 94], [50, 84]], 'shirt', { base: 0.6 });
  poly(p, [[46, 84], [52, 84], [56, 92], [49, 92]], 'shirt', { base: 0.75 });
  poly(p, [[66, 84], [60, 84], [56, 92], [63, 92]], 'shirt', { base: 0.75 });
  // Hair at the back of the head and over the ear, under the cap
  ell(p, 38, 47, 6, 10, 'hairBrown', { tex: grain, keep: (x, y) => y > 38 && x < 45 });
  ell(p, 44, 44, 9, 4, 'hairBrown', { tex: grain, keep: (_x, y) => y > 40 });
  ear(p, h);
  // The flat cap: a crown, a band, a peak out over the eyes, casting its shade
  ell(p, 52, 34, 26, 12, 'capTweed', { tex: tweed, keep: (_x, y) => y <= 40 });
  poly(p, [[60, 37], [86, 39], [86, 43], [62, 44]], 'capTweed', { tex: tweed, base: 0.45 });
  tint(p, (_x, y) => y === 40 || y === 41, -0.25, ['capTweed']);
  tint(p, (x, y) => y >= 41 && y <= 45 && x > 36, -0.35, ['skin']);
  face(p, h, f, blink, mouth, MATS.hairBrown.tones[0]);
}

function drawCaddie(p: Pic, f: Face, blink: boolean, mouth: Mouth) {
  const h = figure(p, 'jacket', flat, HEAD.caddie);
  // A turned-up collar either side of the neck
  poly(p, [[40, 82], [50, 78], [52, 92], [42, 96]], 'jacket', { base: 0.65 });
  poly(p, [[72, 82], [62, 78], [60, 92], [70, 96]], 'jacket', { base: 0.7 });
  // The towel over the shoulder, striped
  poly(p, [[66, 84], [86, 82], [90, 112], [70, 112]], 'towel', { base: 0.6 });
  for (const sy of [92, 100]) poly(p, [[67, sy], [88, sy - 1], [88.5, sy + 2], [67.5, sy + 3]], 'towelStripe', { base: 0.55 });
  // Grey hair at the back
  ell(p, 37, 47, 5, 9, 'hairGrey', { tex: grain, keep: (x, y) => y > 40 && x < 43 });
  ear(p, h);
  // The beard: round the jaw and up the cheek to the ear, the mouth showing through
  ell(p, 56, 64, 21, 17, 'beard', { tex: grain, keep: (x, y) => y >= 57 || (x < 44 && y >= 48) });
  ell(p, 58, 60, 9, 2.6, 'beard', { tex: grain, base: 0.7 });
  // The nose, over the moustache's top edge, or the beard swallows it
  nose(p, { ...h, cy: h.cy - 2 });
  // The wool hat: a dome and a ribbed band turned up
  ell(p, 54, 30, 25, 15, 'beanie', { tex: ribs, keep: (_x, y) => y <= 36 });
  poly(p, [[28, 33], [82, 33], [81, 42], [29, 42]], 'beanie', { tex: ribs, base: 0.5 });
  tint(p, (_x, y) => y === 33 || y === 34, 0.15, ['beanie']);
  tint(p, (x, y) => y >= 42 && y <= 44 && x > 34, -0.3, ['skin']);
  face(p, h, f, blink, mouth, MATS.hairGrey.tones[0]);
}

function drawPartner(p: Pic, f: Face, blink: boolean, mouth: Mouth) {
  const h = figure(p, 'jumperPink', cable, HEAD.partner);
  // A white polo collar
  poly(p, [[44, 84], [55, 86], [52, 94], [42, 90]], 'shirt', { base: 0.7 });
  poly(p, [[68, 84], [57, 86], [60, 94], [70, 90]], 'shirt', { base: 0.75 });
  // Ginger at the back, rosy in the cheek
  ell(p, 34, 49, 5, 9, 'ginger', { tex: grain, keep: (x, y) => y > 42 && x < 40 });
  ear(p, h);
  tint(p, (x, y) => Math.hypot(x - 70, y - 60) < 4 && bayer(x, y) < 0.5, -0.1, ['skin']);
  // The bucket hat: a crown, a band, a soft brim all round
  ell(p, 54, 30, 21, 13, 'bucket', { tex: weave, keep: (_x, y) => y <= 38 });
  poly(p, [[33, 34], [75, 34], [75, 37], [33, 37]], 'bucketBand', { base: 0.5 });
  ell(p, 54, 39, 34, 6, 'bucket', { tex: weave, base: 0.5, keep: (_x, y) => y >= 37 });
  tint(p, (x, y) => y >= 44 && y <= 47 && x > 30 && x < 82, -0.35, ['skin', 'ginger']);
  // The moustache: full under the nose, tapering out and down at the ends
  poly(p, [[56, 64], [62, 62], [66, 62], [72, 64], [77, 69], [74, 70], [69, 67], [64, 67], [59, 67], [53, 70], [50, 69]], 'ginger', { tex: grain, base: 0.55 });
  face(p, h, f, blink, mouth, MATS.ginger.tones[1], 3);
}

// ---------------------------------------------------------------------------------------
// Into pixels: tones by lightness (dithered at the seams), the sun's rim on the lit edge,
// the dark line on the shaded edges only

function render(p: Pic): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = N;
  c.height = N;
  const g = c.getContext('2d')!;
  const img = g.createImageData(N, N);
  const out = (x: number, y: number, col: string) => {
    const tx = p.ls > 0 ? x : N - 1 - x;
    const i = (y * N + tx) * 4;
    img.data[i] = parseInt(col.slice(1, 3), 16);
    img.data[i + 1] = parseInt(col.slice(3, 5), 16);
    img.data[i + 2] = parseInt(col.slice(5, 7), 16);
    img.data[i + 3] = 255;
  };
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= N || y >= N ? -1 : p.mat[y * N + x]);
  const ls = p.ls;
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
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
        else if (up >= 0 && y < N - 1) out(x, y, MATS[MAT_LIST[up]].line);
        continue;
      }
      const mat = MATS[MAT_LIST[m]];
      // The sun's rim: the lit edge, two pixels deep where it's already bright
      const edge = at(x + ls, y) < 0 || (at(x + 2 * ls, y) < 0 && p.v[i] > 0.6);
      if (edge && y < N - 2) {
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
/** One frame of a portrait: the face, eyes shut or not, the mouth's frame; flip to face
 *  left with the light kept on the right */
export function portraitFrame(who: Actor, f: Face, blink: boolean, mouth: Mouth, flip = false): HTMLCanvasElement {
  const key = `${who}:${f}:${blink}:${mouth}:${flip}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const p = pic(flip ? -1 : 1);
  if (who === 'you') drawYou(p, f, blink, mouth);
  else if (who === 'caddie') drawCaddie(p, f, blink, mouth);
  else drawPartner(p, f, blink, mouth);
  // Caught out: a bead of sweat at the temple
  if (f === 'shocked') {
    const sx = 38;
    const sy = 40;
    for (const [dx, dy, k] of [[0, 0, 0], [-1, 1, 0], [0, 1, 1], [1, 1, 0], [-1, 2, 0], [0, 2, 0], [1, 2, 0], [0, 3, 0]] as const) set(p, sx + dx, sy + dy, SWEAT[k]);
  }
  const c = render(p);
  cache.set(key, c);
  return c;
}

export const FACES: Face[] = ['normal', 'pleased', 'shocked', 'thinking'];
