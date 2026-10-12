// The sealed round, in pixels: the last green at last light, painted small and scaled up
// by a whole number so every pixel reads as placed. A low sun to the right owns the frame;
// the sky grades from a pale top (where the words sit) through rose to amber, in ordered
// dither. Far hills in haze, a treeline back-lit and rimmed in gold, the clubhouse with its
// windows lit, a creek and a pond under a stone footbridge with the sun broken up on the
// water, and in the near ground the last green, the flag, and the golfer walking off with
// the bag on their shoulder. Everything casts its shadow away from the sun, towards you.
//
// The painting is drawn once into its own canvas. Each frame copies it and draws only what
// moves over it: clouds, birds, the light on the water, motes, smoke, the pennant, the
// golfer and their shadow. The loop runs only while the band can be seen.

import { bayer, hash, canvas, drawGolfer, ditherCanvas } from './pixel';
import type { Verdict } from './read';

type RGB = readonly [number, number, number];
/** Where the words sit, in canvas pixels: left, right and bottom */
export type Box = { l: number; r: number; b: number };

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const mix = (a: RGB, b: RGB, t: number): RGB => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];
/** A 0..1 value onto n steps, ordered-dithered across a band either side of each boundary
 *  (`band` 1: the whole interval, a smooth ramp; smaller: flat bands with dithered seams) */
const step = (v: number, n: number, x: number, y: number, band = 1) =>
  clamp(Math.floor(v * (n - 1) + 0.5 + (bayer(x, y) - 0.5) * band), 0, n - 1);
const rgb = (c: RGB) => `rgb(${c[0]},${c[1]},${c[2]})`;
const lum = (c: RGB) => (c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11) / 255;

// ---------------------------------------------------------------------------------------
// The palette: one evening. Pale lilac to rose to amber in the sky; gold round the sun;
// violet in every shadow; the greens warmed by the light and cooled out of it

const SKY: RGB[] = [
  [245, 238, 234],
  [246, 229, 225],
  [248, 217, 208],
  [249, 204, 188],
  [249, 189, 164],
  [245, 171, 142],
  [236, 152, 128],
];
const GLOW: RGB[] = [
  [250, 186, 122],
  [252, 206, 144],
  [254, 225, 174],
  [255, 240, 206],
];
const SUN: RGB = [255, 251, 236];
const SUN_EDGE: RGB = [255, 238, 198];
const CLOUD = { body: [212, 150, 158] as RGB, top: [196, 136, 150] as RGB, lit: [252, 208, 162] as RGB, hot: [255, 236, 202] as RGB, warm: [236, 170, 142] as RGB };
const HILL: RGB[] = [
  [224, 180, 182],
  [202, 160, 174],
];
const HILL_LIT: RGB[] = [
  [242, 202, 176],
  [226, 182, 170],
];
const FIELD: RGB[] = [
  [214, 164, 150],
  [236, 192, 154],
];
const BACK = { body: [158, 120, 140] as RGB, dark: [140, 106, 130] as RGB, rim: [238, 172, 132] as RGB };
const TREE = {
  body: [94, 78, 100] as RGB,
  dark: [72, 60, 84] as RGB,
  mid: [118, 96, 110] as RGB,
  rimDim: [190, 128, 112] as RGB,
  rim: [240, 168, 96] as RGB,
  hot: [255, 216, 142] as RGB,
};
const BLOSSOM = { shade: [204, 104, 136] as RGB, pink: [236, 146, 164] as RGB, lit: [255, 200, 192] as RGB, leaf: [96, 76, 98] as RGB };
// Ground materials: lit far, lit near, shaded far, shaded near
type Mat = readonly [RGB, RGB, RGB, RGB];
const ROUGH: Mat = [
  [218, 186, 110],
  [146, 134, 78],
  [152, 122, 134],
  [94, 86, 110],
];
const FAIR_A: Mat = [
  [228, 206, 122],
  [182, 172, 90],
  [162, 136, 142],
  [100, 96, 114],
];
const FAIR_B: Mat = [
  [214, 194, 112],
  [166, 158, 82],
  [150, 126, 136],
  [90, 88, 108],
];
const GRN_A: Mat = [
  [214, 212, 124],
  [188, 194, 104],
  [152, 144, 140],
  [112, 116, 120],
];
const GRN_B: Mat = [
  [200, 200, 114],
  [174, 182, 96],
  [142, 136, 134],
  [102, 108, 114],
];
const FRINGE: Mat = [
  [186, 172, 92],
  [132, 136, 70],
  [128, 108, 124],
  [82, 80, 100],
];
const SAND: Mat = [
  [252, 226, 176],
  [248, 214, 162],
  [202, 168, 168],
  [184, 150, 156],
];
const PATH: Mat = [
  [232, 206, 140],
  [196, 178, 112],
  [170, 144, 146],
  [122, 108, 124],
];
const WATER_WARM: RGB[] = [
  [92, 66, 96],
  [134, 90, 110],
  [182, 122, 118],
  [220, 154, 122],
  [240, 186, 136],
  [250, 214, 164],
  [255, 236, 200],
  [255, 248, 226],
];
const WATER: RGB[] = [
  [62, 56, 88],
  [88, 76, 110],
  [122, 100, 128],
  [162, 128, 146],
  [202, 158, 156],
  [234, 192, 166],
  [252, 222, 186],
  [255, 243, 216],
];
const BANK: RGB[] = [
  [70, 62, 84],
  [104, 88, 108],
];
const STONE = { face: [178, 146, 150] as RGB, joint: [146, 116, 130] as RGB, cap: [250, 214, 164] as RGB, capSh: [206, 170, 160] as RGB, lit: [232, 190, 160] as RGB, arch: [70, 58, 84] as RGB };
const HOUSE = {
  wall: [200, 170, 166] as RGB,
  wallDk: [170, 142, 148] as RGB,
  gable: [252, 224, 180] as RGB,
  gableDk: [232, 196, 160] as RGB,
  roof: [144, 74, 70] as RGB,
  roofDk: [112, 58, 64] as RGB,
  ridge: [246, 154, 98] as RGB,
  eave: [92, 66, 82] as RGB,
  win: [255, 206, 112] as RGB,
  winHi: [255, 236, 174] as RGB,
  frame: [128, 98, 104] as RGB,
  door: [94, 64, 68] as RGB,
  chimney: [150, 116, 122] as RGB,
};
const GOLD_SPILL: RGB = [236, 196, 120];
const MOTE: RGB = [255, 236, 180];
const BIRD: RGB = [92, 66, 92];
const SMOKE: RGB = [172, 144, 164];
const STICK: RGB = [244, 236, 220];
const STICK_DK: RGB = [150, 128, 140];

// Kept, you walk in with your partner; dropped, you go on ahead of them, alone and slower,
// with your head down
export type EndingOpts = { reduce: boolean; verdict?: Verdict };

// Dropped: how far ahead (in board pixels) and how slowly (pixels a second, against 2.3 kept)
// the golfer walks off. The pace is the bowed walk's, as on the walks between holes: 150 to 190ms a step
const DROP_AHEAD = 7;
const DROP_PACE = 1.8;
// Kept: where your partner walks, from you, at each size of the walk
const PARTNER_NEAR = [9, -2];
const PARTNER_MID = [6, -1];
const PARTNER_FAR = [4, -1];

type Cloud = { x: number; y: number; px: [number, number, number][]; v: number };
type Pt = [number, number];

export function createEnding(cv: HTMLCanvasElement) {
  const g = cv.getContext('2d')!;
  let lw = 0;
  let lh = 0;
  let scale = 4;
  let still: HTMLCanvasElement | null = null;
  // The ground in shadow, per pixel, for the shadows that move
  let shadeRGB = new Uint8ClampedArray(0);
  let groundMask = new Uint8Array(0);
  // Where things stand, set at layout
  let copy: Box = { l: 0, r: 0, b: 0 };
  let tall = false;
  let vh = 0; // the horizon
  let tb = 0; // the foot of the tree line
  let sun = { x: 0, y: 0, r: 0 };
  let wt = new Int16Array(0); // the water's far edge, per column (-1: none)
  let wb = new Int16Array(0); // and its near edge
  let flag = { x: 0, y: 0, h: 0 };
  let door: Pt = [0, 0];
  let chimney: Pt = [0, 0];
  let walk: { pts: Pt[]; len: number[]; total: number; nearY: number; midY: number } = { pts: [], len: [], total: 0, nearY: 0, midY: 0 };
  let clouds: Cloud[] = [];
  let glitter: { x: number; y: number; w: number }[] = [];
  let motes: { x: number; y: number; ph: number }[] = [];
  let birdY = 0;
  let pausedAt = -1;

  let raf = 0;
  let t0 = 0;
  let last = 0;
  let reduce = false;
  let verdict: Verdict | undefined;
  let running = false;

  /** Size to the box, in CSS pixels; `words` is where the copy sits, so the painting composes round it */
  function resize(w: number, h: number, words: Box) {
    scale = clamp(Math.round(w / 360), 2, 6);
    lw = Math.max(120, Math.ceil(w / scale));
    lh = Math.max(160, Math.ceil(h / scale));
    cv.width = lw;
    cv.height = lh;
    cv.style.width = `${lw * scale}px`;
    cv.style.height = `${lh * scale}px`;
    g.imageSmoothingEnabled = false;
    copy = { l: Math.floor(words.l / scale), r: Math.ceil(words.r / scale), b: Math.ceil(words.b / scale) };
    tall = lh > lw * 1.1;
    layout();
    paintStill();
    draw(performance.now());
  }

  // ---------------------------------------------------------------------------------
  // Composition

  function layout() {
    const r = Math.round(clamp(tall ? lw * 0.11 : lw * 0.072, 13, 30));
    let horizon = Math.round(lh * (tall ? 0.62 : 0.6));
    horizon = Math.max(horizon, copy.b + 16);
    let sx = Math.round(lw * (tall ? 0.7 : 0.75));
    // The disc stays clear of the words: beside them, or under them
    const discTop = Math.min(horizon, lh - 70) - Math.round(r * 0.45) - r;
    if (sx - r - 4 < copy.r && discTop < copy.b + 4) {
      sx = Math.min(Math.round(lw - r * 0.9), Math.max(sx, copy.r + r + 6));
      if (sx - r - 4 < copy.r) horizon = Math.max(horizon, copy.b + Math.round(r * 1.5) + 6);
    }
    vh = Math.min(horizon, lh - 70);
    const D = lh - vh;
    tb = vh + Math.max(8, Math.round(D * 0.13));
    sun = { x: sx, y: vh - Math.round(r * 0.45), r };

    // The water: a creek in from the left that opens into a pond under the sun
    wt = new Int16Array(lw).fill(-1);
    wb = new Int16Array(lw).fill(-1);
    const c0 = tb + Math.max(5, Math.round(D * 0.1));
    const creek = Math.max(2.5, D * 0.04);
    const pondW = r * (tall ? 1.9 : 2.3);
    for (let x = 0; x < lw; x++) {
      const wob = Math.sin(x / 23 + 1.3) * 2.6 + Math.sin(x / 7.3) * 0.6;
      const bump = Math.max(0, 1 - ((x - sun.x) / pondW) ** 2);
      const pond = Math.sqrt(bump) * D * (tall ? 0.09 : 0.11);
      const c = c0 + wob * (1 - bump) + pond * 0.35;
      const cw = creek * (0.75 + 0.35 * Math.sin(x / 31 + 0.4));
      wt[x] = Math.round(c - cw * 0.8 - pond * 0.25);
      wb[x] = Math.round(c + cw + pond);
    }

    // The last green, in the near ground, in the light coming through the gap
    const gx = Math.round(tall ? lw * 0.52 : Math.min(lw * 0.6, sun.x - r * 1.4));
    const gy = Math.round(vh + D * (tall ? 0.6 : 0.56));
    flag = { x: gx + 4, y: gy, h: Math.round(clamp(D * 0.24, 20, 28)) };

    // The clubhouse on the far lawn, left, under the words
    const hx = Math.round(clamp(lw * (tall ? 0.24 : 0.17), 22, lw * 0.4));
    door = [hx - 4, tb + 3];
    chimney = [hx - 9, 0];

    // The walk: off the green, down to the creek, over the bridge, up to the door
    const bx = Math.round(lw * (tall ? 0.3 : 0.36));
    const foot: Pt = [bx + 2, wb[bx] + 3];
    const deck = bridgeDeck(bx);
    const pts: Pt[] = [
      [flag.x - 9, flag.y + 2],
      [Math.round((flag.x + foot[0]) / 2 - 6), Math.round((flag.y + foot[1]) / 2 + 3)],
      foot,
      [bx, deck],
      [bx - 1, wt[bx] - 2],
      [Math.round((bx + door[0]) / 2), door[1] + 1],
      [door[0], door[1]],
    ];
    const len = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
    // Smaller as they go: full size on the near ground, then middling, then a speck over the bridge
    const nearY = Math.round(flag.y - (flag.y - foot[1]) * 0.35);
    walk = { pts, len, total: len.reduce((a, b) => a + b, 0), nearY, midY: foot[1] - 1 };

    // Clouds: long low streaks, right of the words and round the sun
    clouds = [];
    const cl = (x: number, y: number, n: number, seed: number, v: number) => clouds.push({ x, y, px: streak(n, seed), v });
    const skyTop = tall ? copy.b + 6 : 6;
    cl(sun.x - r * 1.7, sun.y + r * 0.25, Math.round(r * 3), 1, 0.35);
    cl(sun.x + r * 0.5, sun.y - r * 1.15, Math.round(r * 2.4), 2, 0.25);
    cl(sun.x - r * 0.6, Math.max(skyTop + 4, sun.y - r * 2.4), Math.round(r * 2.8), 3, 0.18);
    if (!tall) cl(lw * 0.9, Math.max(skyTop, sun.y - r * 3.4), Math.round(r * 1.4), 4, 0.12);
    else cl(lw * 0.2, Math.max(skyTop + 10, sun.y - r * 0.8), Math.round(r * 1.6), 5, 0.2);

    // The light on the water, under the sun
    glitter = [];
    for (let x = Math.round(sun.x - pondW); x <= sun.x + pondW; x++) {
      if (x < 0 || x >= lw || wt[x] < 0) continue;
      for (let y = wt[x] + 1; y < wb[x]; y++) {
        const j = y - wt[x];
        const w = Math.min(pondW * 0.75, 2 + j * 1.15);
        if (Math.abs(x - sun.x) <= w) glitter.push({ x, y, w: Math.abs(x - sun.x) / w });
      }
    }
    motes = [];
    for (let i = 0; i < 18; i++)
      motes.push({ x: Math.round(gx - lw * 0.12 + hash(i, 1, 31) * (sun.x - gx + lw * 0.2)), y: Math.round(vh + hash(i, 2, 31) * (gy - vh)), ph: hash(i, 3, 31) });
    birdY = Math.round(sun.y - r * 0.2);
  }

  /** A cloud: a long low lens, puffed along its top, with a lit belly and ragged ends.
   *  Kinds: 0 body, 1 crown, 2 lit belly, 3 trailing wisp */
  function streak(n: number, seed: number) {
    const px: [number, number, number][] = [];
    const T = Math.max(2, Math.round(n / 11));
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const e = Math.min(t, 1 - t) * 2;
      // The crown rises in two or three puffs
      const puff = 0.55 + 0.45 * Math.abs(Math.sin(t * Math.PI * (2 + (seed % 2)) + seed));
      const hgt = Math.round(T * Math.sqrt(e) * puff + (hash(i, seed, 4) - 0.5) * 0.8);
      if (hash(i, seed, 5) > e * 8) continue;
      px.push([i, 1, 2]);
      for (let j = 0; j < hgt; j++) px.push([i, -j, j === hgt - 1 ? 1 : 0]);
      if (t > 0.08 && t < 0.45 && hash(i, seed, 6) > 0.45) px.push([i + 2, 2, 3]);
    }
    return px;
  }

  // The bridge: where its deck sits over the water at column x
  const bridgeH = () => Math.max(6, Math.round(Math.min((lh - vh) * 0.085, lw * 0.034)));
  const bridgeDeck = (bx: number) => Math.round((wt[bx] + wb[bx]) / 2) - bridgeH();

  /** The glow round the sun, 0..1, wider than it is tall, with rays */
  function glowAt(x: number, y: number) {
    const dx = x - sun.x;
    const dy = y - sun.y;
    const d = Math.hypot(dx / 1.7, dy);
    let gl = clamp(1 - (d - sun.r * 0.7) / (sun.r * 2.6), 0, 1) ** 1.6;
    // Rays: faint wedges, fanned from the disc
    const a = Math.atan2(dy, dx);
    const ray = 0.5 + 0.5 * Math.sin(a * 13 + Math.sin(a * 5) * 1.6);
    const reach = clamp(1 - Math.hypot(dx, dy) / (sun.r * 4.4), 0, 1);
    if (ray > 0.8 && dy < sun.r * 0.3 && Math.hypot(dx, dy) > sun.r * 1.05 && !inWords(x, y, 8)) {
      const add = 0.32 * reach ** 1.3 * ((ray - 0.8) / 0.2);
      // Rays live inside the glow: no stray dots out in the pale sky
      if (gl + add > 0.2) gl += add;
    }
    return clamp(gl, 0, 1);
  }
  const inWords = (x: number, y: number, m = 0) => x < copy.r + m && x > copy.l - m && y < copy.b + m;

  // ---------------------------------------------------------------------------------
  // Drawn once

  function paintStill() {
    const [c, s] = canvas(lw, lh);
    still = c;
    const img = s.createImageData(lw, lh);
    const d = img.data;
    shadeRGB = new Uint8ClampedArray(lw * lh * 3);
    groundMask = new Uint8Array(lw * lh);
    const put = (x: number, y: number, col: RGB) => {
      if (x < 0 || y < 0 || x >= lw || y >= lh) return;
      const k = (y * lw + x) * 4;
      d[k] = col[0];
      d[k + 1] = col[1];
      d[k + 2] = col[2];
      d[k + 3] = 255;
    };
    const get = (x: number, y: number): RGB => {
      x = clamp(x, 0, lw - 1);
      y = clamp(y, 0, lh - 1);
      const k = (y * lw + x) * 4;
      return [d[k], d[k + 1], d[k + 2]];
    };
    const D = lh - vh;

    // The sky: bands down to the horizon, warmer towards it and towards the sun
    for (let y = 0; y < vh + 2; y++)
      for (let x = 0; x < lw; x++) {
        const side = 1 - Math.abs(x - sun.x) / lw;
        const v = clamp((y / vh) ** 1.35 * 0.92 + side * 0.1 - 0.04, 0, 1);
        const gl = glowAt(x, y);
        const gi = Math.floor(gl * 4 + bayer(x, y)) - 1;
        put(x, y, gi >= 0 ? GLOW[Math.min(3, gi)] : SKY[step(v, SKY.length, x, y, 0.7)]);
      }
    // The sun
    for (let y = sun.y - sun.r - 1; y <= sun.y + sun.r + 1; y++)
      for (let x = sun.x - sun.r - 1; x <= sun.x + sun.r + 1; x++) {
        const dd = Math.hypot(x - sun.x, y - sun.y);
        if (dd > sun.r + 0.2) continue;
        put(x, y, dd > sun.r - 1.2 ? SUN_EDGE : SUN);
      }

    // The far hills, in haze; paler by the sun, and kept low under the words
    const ridge = (x: number, k: number) => {
      const a = k === 0 ? Math.sin(x / 41 + 0.6) * 0.5 + 0.5 : Math.sin(x / 27 + 2.1) * 0.5 + 0.5;
      const b = Math.sin(x / (k === 0 ? 13 : 9) + k) * 0.5 + 0.5;
      // The far ridge swells to a long hill behind the middle of the course
      const hill = Math.exp(-(((x - lw * 0.46) / (lw * 0.22)) ** 2));
      let top = vh - (k === 0 ? 4 + Math.round(a * 5 + b * 2 + hill * Math.min((tb - vh) * 1.1, lw * 0.045)) : 1 + Math.round(a * 5 + b * 1.5));
      if (x < copy.r + 4) top = Math.max(top, copy.b + 4);
      return top;
    };
    for (let k = 0; k < 2; k++)
      for (let x = 0; x < lw; x++) {
        const top = ridge(x, k);
        for (let y = top; y < tb; y++) {
          const gl = glowAt(x, Math.min(y, sun.y + sun.r));
          const lit = y === top ? gl > 0.08 : gl > 0.45 + (bayer(x, y) - 0.5) * 0.25;
          put(x, y, lit ? HILL_LIT[k] : HILL[k]);
        }
      }
    // The distant fields between the hills and the trees, lit
    for (let y = vh; y < tb; y++)
      for (let x = 0; x < lw; x++) {
        const gl = glowAt(x, Math.min(y, sun.y + sun.r));
        put(x, y, FIELD[gl + (y - vh) / (tb - vh) * 0.3 > bayer(x, y) * 0.8 + 0.2 ? 1 : 0]);
      }

    // The tree line: what stands where, then a shadow from each; drawn after the ground
    const back = new Uint8Array(lw * lh);
    const front = new Uint8Array(lw * lh);
    const nearM = new Uint8Array(lw * lh);
    const plant = (m: Uint8Array, x: number, base: number, h: number, w: number, pine: boolean, seed: number) => {
      if (h < 2) return;
      const set = (px: number, py: number) => {
        if (px < 0 || px >= lw || py < 0 || py >= lh) return;
        m[py * lw + px] = 1;
      };
      if (pine) {
        for (let j = 0; j < h; j++) {
          const y = base - j;
          if (j < 2) {
            set(x, y);
            continue;
          }
          const u = (j - 2) / Math.max(1, h - 2);
          const tier = (j - 2) % 3 === 0 ? 1 : (j - 2) % 3 === 1 ? 0.88 : 0.76;
          const hw = Math.round((1 - u) * (w / 2) * tier + (u < 0.95 ? 0.3 : 0));
          for (let i = -hw; i <= hw; i++) if (Math.abs(i) < hw || hash(x + i, y, seed) > 0.25) set(x + i, y);
        }
      } else {
        // A crown wider than it is tall, built of lumps, on a short trunk
        const ch = m === nearM ? Math.max(Math.min(h - 2, w * 0.85), h * 0.64) : h - 1;
        const a = w / 2;
        const b = ch / 2;
        const cy = base - h + b;
        const lumps: [number, number, number][] = [[0, cy, b * 0.8]];
        const n = 5 + Math.floor(w / 5);
        for (let k = 0; k < n; k++) {
          const ang = hash(k, seed, 1) * Math.PI * 2;
          const rr = Math.sqrt(hash(k, seed, 2)) * 0.62;
          const lr = Math.min(a, b) * (0.34 + hash(k, seed, 3) * 0.26);
          lumps.push([Math.cos(ang) * a * rr, cy + Math.sin(ang) * b * rr * 0.9, lr]);
        }
        for (let j = 0; j < h - ch + 2; j++) set(x, base - j);
        for (let y = Math.floor(base - h - 2); y <= base - 1; y++)
          for (let i = -Math.ceil(a + 3); i <= Math.ceil(a + 3); i++) {
            const inside = lumps.some(([lx, ly, lr]) => Math.hypot(i - lx, (y - ly) * 1.05) <= lr - (hash(x + i, y, seed) < 0.3 ? 0.8 : 0));
            if (inside) set(x + i, y);
          }
      }
    };
    // The back row, low and hazy
    for (let i = 0, x = -3; x < lw + 4; i++) {
      const h = 5 + Math.round(hash(i, 1, 51) * 7);
      const pine = hash(i, 2, 51) < 0.45;
      const w = pine ? 5 + Math.round(hash(i, 3, 51) * 3) : 6 + Math.round(hash(i, 3, 51) * 6);
      let hh = h;
      if (x < copy.r + 6) hh = Math.min(hh, tb - 2 - (copy.b + 4));
      if (Math.abs(x - sun.x) < sun.r * 0.9) hh = Math.round(hh * 0.5);
      plant(back, x, tb - 2, hh, w, pine, 51 + i);
      x += 3 + Math.round(hash(i, 4, 51) * 4);
    }
    // The front row: varied, with gaps the light comes through, and a wide gap at the sun
    for (let i = 0, x = -2; x < lw + 4; i++) {
      const pine = hash(i, 2, 61) < 0.42;
      let h = pine ? 15 + Math.round(hash(i, 1, 61) * 12) : 10 + Math.round(hash(i, 1, 61) * 8);
      const w = pine ? 7 + 2 * Math.round(hash(i, 3, 61) * 2) : 8 + Math.round(hash(i, 3, 61) * 7);
      const gap = hash(i, 5, 61) < 0.16;
      const near = Math.abs(x - sun.x);
      if (near < sun.r * 1.25) h = 0;
      else if (near < sun.r * 1.8) h = Math.round(h * 0.6);
      if (x - w / 2 < copy.r + 3) h = Math.min(h, tb - (copy.b + 4));
      if (!gap) plant(front, x, tb + (hash(i, 6, 61) < 0.5 ? 0 : 1), h, w, pine, 61 + i);
      x += (pine ? 4 : 5) + Math.round(hash(i, 4, 61) * 4) + (gap ? 5 + Math.round(hash(i, 7, 61) * 8) : 0);
    }
    // Near trees framing the picture: an oak and a pine on the right by the pond, an oak at the left
    const S = Math.min(D, lw * 0.3);
    const nearTrees: { bx: number; by: number; h: number }[] = [];
    const nearTree = (x: number, base: number, h: number, w: number, pine: boolean, seed: number) => {
      h = Math.min(h, base - (x - w < copy.r + 4 ? copy.b + 6 : 2));
      if (h < 10) return;
      plant(nearM, x, base, h, w, pine, seed);
      // A trunk up into the crown, and roots splayed at the foot
      if (!pine) {
        const tw = Math.max(1, Math.round(w / 9));
        for (let y = base; y > base - h * 0.55; y--) {
          const flare = base - y < 3 ? 1 : 0;
          for (let i = -tw - flare; i <= tw - 1 + flare; i++) if (y >= 0) nearM[y * lw + x + i] = 1;
        }
        for (const i of [-tw - 1, tw]) nearM[base * lw + x + i] = 1;
      }
      nearTrees.push({ bx: x, by: base, h });
    };
    {
      // On the right, cut by the frame; on a phone, the sun needs the room
      const rx = Math.round(lw * 0.985);
      const rb = Math.max(Math.round(vh + D * 0.4), wb[clamp(rx, 0, lw - 1)] + 6);
      if (!tall) nearTree(rx, rb, Math.round(S * 0.7), Math.round(S * 0.5), false, 101);
      nearTree(Math.round(lw * 0.03), Math.round(vh + D * 0.5), Math.round(S * 0.66), Math.round(S * 0.46), false, 103);
    }
    // Two pines against the disc
    const disc = new Uint8Array(lw * lh);
    plant(disc, Math.round(sun.x - sun.r * 0.42), tb, tb - sun.y + Math.round(sun.r * 0.35), 11, true, 91);
    plant(disc, Math.round(sun.x + sun.r * 0.5), tb + 1, tb - sun.y - Math.round(sun.r * 0.15), 9, true, 92);

    // The ground, near and far, lit or in the trees' shadow
    const bx = walk.pts[3][0];
    const gx = flag.x - 4;
    const gy = flag.y;
    const grx = Math.round(tall ? lw * 0.3 : lw * 0.15);
    const gry = Math.max(5, Math.round(grx * 0.24));
    const fair: Pt[] = [
      [Math.round(lw * -0.05), lh + 12],
      [Math.round(lw * 0.22), Math.round(vh + D * 0.8)],
      [gx - grx + 2, gy + 2],
    ];
    const path: Pt[] = walk.pts.slice(0, 3);
    const segD = (px: number, py: number, pts: Pt[]) => {
      let best = Infinity;
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1];
        const [qx, qy] = pts[i];
        const dx = qx - ax;
        const dy = qy - ay;
        const l2 = dx * dx + dy * dy;
        const t = l2 === 0 ? 0 : clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
        best = Math.min(best, Math.hypot(px - (ax + t * dx), (py - (ay + t * dy)) * 1.6));
      }
      return best;
    };
    const bunkers: [number, number, number, number][] = [
      [gx - Math.round(grx * 0.78), gy + gry + 3, Math.round(grx * 0.22), Math.max(2, Math.round(gry * 0.45))],
      [gx + Math.round(grx * 0.75), gy - gry - 1, Math.round(grx * 0.16), Math.max(2, Math.round(gry * 0.35))],
    ];
    // A point on the ground is in shadow if the line back to the sun passes through a
    // tree: the trees' own outlines, laid down long across the grass
    const reach = Math.max(1.2, D / 90);
    // A big tree behind you throws its crown across the front: lobed, with light let through
    const lobes: [number, number, number][] = [];
    for (let i = 0; i < 9; i++) lobes.push([lw * (i / 8) + (hash(i, 1, 33) - 0.5) * lw * 0.08, lh + D * 0.02, D * (0.17 + hash(i, 2, 33) * 0.12)]);
    const nearEdge = (x: number) => {
      let e = lh + 4;
      for (const [cx, cy, r] of lobes) {
        const dx = (x - cx) / 2.6;
        if (Math.abs(dx) < r) e = Math.min(e, cy + r * 0.25 - Math.sqrt(r * r - dx * dx) * 0.75);
      }
      return e + Math.sin(x / 3.1) * 0.7 + (bayer(x, Math.round(e)) - 0.5) * 3;
    };
    const dapple = (x: number, y: number) => {
      const cx = Math.floor(x / 9);
      const cy = Math.floor(y / 4);
      if (hash(cx, cy, 34) > 0.3) return false;
      const ox = cx * 9 + 2 + hash(cx, cy, 35) * 5;
      const oy = cy * 4 + 1 + hash(cx, cy, 36) * 2;
      const e = ((x - ox) / 2.6) ** 2 + ((y - oy) / 1.1) ** 2;
      return e < 1 && (e < 0.5 || bayer(x, y) < 0.5);
    };
    // The near trees' shadows, raked long to the left across the grass
    const vpx = sun.x + lw * 0.3;
    const nearShadow = (x: number, y: number) => {
      for (const t of nearTrees) {
        if (y <= t.by) continue;
        const n = Math.hypot(t.bx - vpx, t.by - vh);
        const ux = (t.bx - vpx) / n;
        const uy = (t.by - vh) / n;
        const ox = x - t.bx;
        const oy = y - t.by;
        const along = ox * ux + oy * uy;
        if (along < 0 || along > t.h * 1.1) continue;
        const perp = -ox * uy + oy * ux;
        const tx = Math.round(t.bx - perp * 1.4);
        const ty = Math.round(t.by - along / 1.1);
        if (tx >= 0 && tx < lw && ty >= 0 && nearM[ty * lw + tx]) return true;
      }
      return false;
    };
    const shadowed = (x: number, y: number) => {
      if (y > nearEdge(x)) return !dapple(x, y);
      if (nearShadow(x, y)) return true;
      if (y <= tb) return false;
      const tx = Math.round(sun.x + ((x - sun.x) * (tb - vh)) / (y - vh));
      const hgt = (y - tb) / reach;
      const ty = Math.round(tb - hgt);
      if (tx < 0 || tx >= lw) return hgt < 8;
      if (front[ty * lw + tx] === 1) return true;
      // The soft end of a shadow, where the top of a tree is
      return ty > 0 && front[(ty + 1) * lw + tx] === 1 && bayer(x, y) < 0.5;
    };
    const matAt = (x: number, y: number): Mat => {
      if (y <= tb + 2) return ROUGH;
      const e = ((x - gx) / grx) ** 2 + ((y - gy) / gry) ** 2;
      // Mown stripes run with the light, out from the foot of the sun
      const stripe = Math.floor(((x - sun.x) / Math.max(1, y - vh)) * 7 + 100) & 1;
      if (e <= 1) return stripe ? GRN_A : GRN_B;
      if (e <= 1.32) return FRINGE;
      for (const [cx, cy, rx, ry] of bunkers) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) return SAND;
      if (segD(x, y, path) < 0.6 + (y - vh) * 0.022 && y > wb[clamp(x, 0, lw - 1)] + 1) return PATH;
      const fw = (y - vh) * 0.5;
      if (segD(x, y, fair) < fw) return stripe ? FAIR_A : FAIR_B;
      return ROUGH;
    };
    const colAt = (m: Mat, x: number, y: number, shade: boolean): RGB => {
      const u = clamp((y - tb) / (lh - tb), 0, 1);
      const i = step(u, 3, x, y, 0.4);
      let col = mix(shade ? m[2] : m[0], shade ? m[3] : m[1], i / 2);
      // Rough: a sparse tick of darker grass, more of them nearer
      if (m === ROUGH && hash(x, y, 11) < 0.02 + u * 0.06) col = mix(shade ? m[2] : m[0], shade ? m[3] : m[1], Math.min(1, i / 2 + 0.5));
      return col;
    };
    for (let y = tb; y < lh; y++)
      for (let x = 0; x < lw; x++) {
        const m = matAt(x, y);
        const sh = shadowed(x, y);
        let col = colAt(m, x, y, sh);
        if (!sh && y > tb) {
          // Contre-jour: the grass between you and the sun shines; away from that line it cools
          const off = Math.abs(x - sun.x) / ((y - vh) * 1.1 + 4);
          const sheen = clamp(1 - off, 0, 1);
          const k = sheen * 2.2 + (bayer(x, y) - 0.5) * 0.5;
          if (k > 1.5) col = mix(col, [255, 222, 150], m === GRN_A || m === GRN_B ? 0.22 : 0.38);
          else if (k > 0.75) col = mix(col, [255, 222, 150], m === GRN_A || m === GRN_B ? 0.1 : 0.18);
          else if (off > 2.2 + (bayer(x, y) - 0.5) * 0.6) col = mix(col, colAt(m, x, y, true), 0.3);
        }
        put(x, y, col);
        const ds = colAt(m, x, y, true);
        const k = (y * lw + x) * 3;
        shadeRGB[k] = ds[0];
        shadeRGB[k + 1] = ds[1];
        shadeRGB[k + 2] = ds[2];
        groundMask[y * lw + x] = 1;
      }
    // The bunkers' back lips, in shade
    for (const [cx, cy, rx, ry] of bunkers)
      for (let x = cx - rx; x <= cx + rx; x++) {
        const top = Math.round(cy - ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2)));
        put(x, top, mix(SAND[2], ROUGH[3], 0.5));
        if (x < cx + rx * 0.3) put(x, top + 1, SAND[2]);
      }
    // The fringe of the green, a darker lip at the front
    for (let x = gx - grx; x <= gx + grx; x++) {
      const yy = Math.round(gy + gry * 1.15 * Math.sqrt(Math.max(0, 1 - ((x - gx) / (grx * 1.15)) ** 2)));
      put(x, yy, mix(get(x, yy), ROUGH[3], 0.4));
    }

    // Trees over the ground: the back row, then the front, rimmed where they face the sun
    const at = (m: Uint8Array, x: number, y: number) => x >= 0 && x < lw && y >= 0 && y < lh && m[y * lw + x] === 1;
    for (let y = 0; y < lh; y++)
      for (let x = 0; x < lw; x++) {
        if (!at(back, x, y)) continue;
        const near = 1 - Math.abs(x - sun.x) / (lw * 0.5);
        const rim = !at(back, x + 1, y) && near > 0.4;
        put(x, y, rim ? BACK.rim : hash(x, y, 13) < 0.2 ? BACK.dark : BACK.body);
      }
    for (let y = 0; y < lh; y++)
      for (let x = 0; x < lw; x++) {
        if (at(disc, x, y)) {
          // Against the disc: a silhouette, rimmed thinly
          const inDisc = Math.hypot(x - sun.x, y - sun.y) < sun.r + 1;
          put(x, y, !at(disc, x + 1, y) && !inDisc ? TREE.rim : hash(x, y, 14) < 0.3 ? TREE.dark : TREE.body);
          continue;
        }
        if (at(front, x, y)) put(x, y, treeCol(front, x, y, 0.6));
      }
    function treeCol(m: Uint8Array, x: number, y: number, spread: number): RGB {
      const near = clamp(1 - Math.abs(x - sun.x) / (lw * spread), 0, 1);
      const sd = x < sun.x ? 1 : -1;
      const edge = !at(m, x + sd, y);
      const top = !at(m, x, y - 1) && !at(m, x + sd, y - 1);
      const edge2 = !edge && !at(m, x + 2 * sd, y);
      // Foliage in clumps: dark pockets two pixels across, a paler leaf where the light gets in
      const clump = hash(x >> 1, (y + (x >> 2)) >> 1, 14);
      let col: RGB = clump < 0.24 ? TREE.dark : clump > 0.9 && near > 0.3 ? TREE.mid : TREE.body;
      if (edge) col = near > 0.72 ? TREE.hot : near > 0.35 ? TREE.rim : TREE.rimDim;
      else if (top && near > 0.55) col = TREE.rimDim;
      else if (edge2 && near > 0.72) col = TREE.rimDim;
      return col;
    }
    // Azaleas along the foot of the trees
    const bush = (x0: number, y0: number, w: number, h: number, seed: number) => {
      for (let y = y0 - h; y <= y0; y++)
        for (let x = x0 - w; x <= x0 + w; x++) {
          const e = ((x - x0) / (w + 0.5)) ** 2 + ((y - y0) / (h + 0.5)) ** 2;
          if (e > 1 || (e > 0.7 && hash(x, y, seed) < 0.35)) continue;
          const rimSide = x - x0 > w * 0.3 && y - y0 < -h * 0.2;
          const bloom = hash(x, y, seed + 1);
          let col: RGB = BLOSSOM.leaf;
          if (bloom > 0.42) col = rimSide ? BLOSSOM.lit : bloom > 0.75 ? BLOSSOM.pink : BLOSSOM.shade;
          else if (rimSide && e > 0.5) col = TREE.rim;
          put(x, y, col);
        }
    };
    for (let i = 0, x = 4; x < lw; i++) {
      const skip = Math.abs(x - sun.x) < sun.r * 1.3 || Math.abs(x - door[0]) < 18;
      if (!skip && hash(i, 1, 71) < 0.55) bush(x, tb + 1, 2 + Math.round(hash(i, 2, 71) * 3), 2 + Math.round(hash(i, 3, 71) * 1.5), 71 + i);
      x += 9 + Math.round(hash(i, 4, 71) * 14);
    }

    // The clubhouse: a long front in shade, a lit gable to the sun, a red roof, warm windows
    house(put);
    bush(door[0] - 17, door[1] + 1, 3, 3, 81);
    bush(door[0] + 23, door[1] + 1, 3, 2, 82);
    // A path from the door, worn pale, down to the bridge
    {
      const from: Pt = [door[0], door[1] + 1];
      const to: Pt = [bx - 1, wt[bx] - 1];
      const n = Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1]));
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const x = Math.round(from[0] + (to[0] - from[0]) * t + Math.sin(t * 3.1) * 2);
        const y = Math.round(from[1] + (to[1] - from[1]) * t);
        if (wt[x] >= 0 && y >= wt[x]) continue;
        put(x, y, shadowed(x, y) ? PATH[2] : PATH[0]);
      }
    }

    // The water: what stands over it, mirrored at its far edge and broken by ripples, in the water's own colours
    for (let x = 0; x < lw; x++) {
      if (wt[x] < 0) continue;
      for (let y = wt[x]; y <= wb[x]; y++) {
        const j = y - wt[x];
        const xo = Math.round(Math.sin(y * 1.7 + x * 0.05) * (0.6 + j * 0.12));
        // A narrow creek mirrors the trees on its bank; the open pond, the sky beyond them
        const open = wb[x] - wt[x] > 11;
        const src = get(x + xo, open ? tb - 4 - Math.round(j * 4) : tb - 2 - Math.round(j * 2.2));
        let L = lum(src) * 0.96 - 0.08;
        // Ripple streaks: dashes along the rows, not a dither
        const rip = hash(Math.floor((x + y * 7) / 6), y, 21);
        if (rip > 0.86) L += 0.1;
        else if (rip < 0.1) L -= 0.12;
        const thr = 0.25 + hash(Math.floor((x + y * 5) / 4), y, 24) * 0.5;
        // Warm where it mirrors the glow, cool where it mirrors the trees and the high sky
        const ramp = src[0] - src[2] > 70 && src[1] > 150 ? WATER_WARM : WATER;
        let col = ramp[clamp(Math.floor(clamp(L, 0, 1) * 6 + thr), 0, 7)];
        // Specular streaks where the surface catches the sky
        if (hash(Math.floor((x + y * 13) / 4), y, 25) > (open ? 0.95 : 0.9) && !shadowed(x, y)) col = ramp[6];
        if (j === 0) col = shadowed(x, y) ? WATER[2] : WATER[5];
        put(x, y, col);
        groundMask[y * lw + x] = 0;
      }
      // The near bank: dark where it turns from the sun
      put(x, wb[x] + 1, BANK[0]);
      if (hash(x, 1, 22) < 0.6) put(x, wb[x] + 2, BANK[1]);
    }
    // The column of light, set down once; the sparkle on it moves
    for (const p of glitter) {
      const on = hash(p.x >> 1, p.y, 23) < (1 - p.w) * 0.75 + 0.1;
      if (on) put(p.x, p.y, p.w < 0.35 ? WATER[7] : p.w < 0.7 ? WATER[6] : WATER[5]);
    }

    // The footbridge, its arch face on, and the arch again in the water
    footbridge(put, get, bx);

    // The near trees, darker for being nearer, rimmed on the sun's side
    for (let y = 0; y < lh; y++)
      for (let x = 0; x < lw; x++) {
        if (!at(nearM, x, y)) continue;
        const c = treeCol(nearM, x, y, 0.9);
        put(x, y, c === TREE.body ? mix(TREE.body, TREE.dark, 0.5) : c);
      }
    // Reeds at the pond's near edge, against the bright water
    for (const cx of [sun.x - sun.r * 1.15, sun.x + sun.r * 0.55, sun.x + sun.r * 1.5]) {
      for (let k = 0; k < 7; k++) {
        const x = Math.round(cx + (hash(k, cx, 95) - 0.5) * 9);
        if (x < 0 || x >= lw || wt[x] < 0 || Math.abs(x - sun.x) < 2) continue;
        const h = 2 + Math.round(hash(k, cx, 96) * 6);
        const lean = hash(k, cx, 97) < 0.5 ? -1 : 1;
        const y0 = wb[x] + 1;
        for (let j = 0; j < h; j++) put(x + (j > h * 0.6 ? lean : 0), y0 - j, j === h - 1 ? TREE.rim : TREE.dark);
        if (h > 5 && hash(k, cx, 98) < 0.4) {
          put(x + lean, y0 - h, [124, 74, 64]);
          put(x + lean, y0 - h + 1, [124, 74, 64]);
        }
      }
    }
    // Grass at the front, against the light: dark blades, gold at the tips, a few flowers
    for (let x = 0; x < lw; x++) {
      const tuft = 0.5 + 0.5 * Math.sin(x / 7.7 + Math.sin(x / 3.1));
      if (hash(x, 1, 41) > 0.35 + tuft * 0.5) continue;
      const hgt = Math.round(D * (0.02 + tuft * 0.05) * (0.5 + hash(x, 2, 41)));
      const lean = hash(x, 3, 41) < 0.5 ? -1 : 1;
      for (let j = 0; j < hgt; j++) {
        const bend = j > hgt * 0.65 ? lean : 0;
        const tip = j === hgt - 1;
        put(x + bend, lh - 1 - j, tip && hash(x, 4, 41) < 0.55 ? TREE.rim : j < 2 ? BANK[0] : [84, 72, 96]);
      }
      const f = hash(x, 5, 41);
      if (hgt > 3 && f < 0.07) {
        const col: RGB = f < 0.035 ? BLOSSOM.lit : [252, 238, 208];
        put(x + lean, lh - hgt - 1, col);
        put(x + lean + 1, lh - hgt - 1, f < 0.035 ? BLOSSOM.pink : [236, 208, 160]);
        put(x + lean, lh - hgt - 2, col);
      }
    }
    // Azaleas in the near corner
    bush(Math.round(lw * 0.04), lh - 2, Math.round(D * 0.08), Math.round(D * 0.07), 83);
    bush(Math.round(lw * 0.11), lh, Math.round(D * 0.06), Math.round(D * 0.05), 84);
    bush(Math.round(lw * 0.97), lh - 1, Math.round(D * 0.07), Math.round(D * 0.06), 85);

    // The flagstick's shadow, long, away from the sun
    {
      const dx = flag.x - sun.x - lw * 0.3;
      const dy = flag.y - vh;
      const n = Math.hypot(dx, dy);
      const len = flag.h * 3.2;
      for (let i = 1; i < len; i++) {
        const x = Math.round(flag.x + (dx / n) * i);
        const y = Math.round(flag.y + (dy / n) * i);
        if (i > len * 0.75 && bayer(x, y) < (i - len * 0.75) / (len * 0.25)) continue;
        if (x < 0 || y >= lh || !groundMask[y * lw + x]) continue;
        const k = (y * lw + x) * 3;
        put(x, y, [shadeRGB[k], shadeRGB[k + 1], shadeRGB[k + 2]]);
      }
      // The hole
      put(flag.x - 1, flag.y, ROUGH[3]);
      put(flag.x, flag.y, ROUGH[3]);
      put(flag.x + 1, flag.y, ROUGH[3]);
    }
    s.putImageData(img, 0, 0);
    // The flagstick, lit down the sun's side
    s.fillStyle = rgb(STICK_DK);
    s.fillRect(flag.x, flag.y - flag.h, 1, flag.h);
    s.fillStyle = rgb(STICK);
    s.fillRect(flag.x, flag.y - flag.h, 1, Math.round(flag.h * 0.7));
    s.fillStyle = rgb(TREE.hot);
    s.fillRect(flag.x, flag.y - flag.h - 1, 1, 1);
  }

  function house(put: (x: number, y: number, c: RGB) => void) {
    const [hx0] = door;
    const base = door[1];
    const left = hx0 - 13;
    const right = hx0 + 13; // the front wall
    const gw = 7; // the gable end
    const wallH = 9;
    const R = 7; // the roof's rise
    const top = base - wallH;
    // Contact shadow under it
    for (let x = left - 2; x <= right + gw + 2; x++) {
      put(x, base + 1, BANK[1]);
      if (x > left && x < right + gw) put(x, base + 2, ROUGH[2]);
    }
    for (let y = top; y <= base; y++) {
      for (let x = left; x <= right; x++) put(x, y, (x + y * 2) % 7 === 0 ? HOUSE.wallDk : HOUSE.wall);
      for (let x = right + 1; x <= right + gw; x++) put(x, y - Math.round((x - right) * 0.3), x === right + 1 ? HOUSE.gableDk : HOUSE.gable);
    }
    // The gable's triangle, lit
    for (let k = 0; k <= R; k++) {
      const y = top - k;
      const a = right + 1 + Math.round((k * gw) / (2 * R));
      const b = right + gw - Math.round((k * gw) / (2 * R));
      for (let x = a; x <= b; x++) put(x, y - Math.round((x - right) * 0.3), HOUSE.gable);
    }
    // The roof's front slope, in shade, with a lit ridge and rake
    for (let k = 0; k <= R; k++) {
      const y = top - 1 - k;
      const a = left - 2 + Math.round((k * gw) / (2 * R));
      const b = right + 1 + Math.round((k * gw) / (2 * R));
      for (let x = a; x <= b; x++) {
        let col: RGB = (x + k) % 3 === 0 ? HOUSE.roofDk : HOUSE.roof;
        if (k === R) col = HOUSE.ridge;
        else if (x === b) col = HOUSE.ridge;
        put(x, y + (x > right ? -Math.round((x - right) * 0.3) : 0), col);
      }
    }
    for (let x = left - 1; x <= right; x++) put(x, top, HOUSE.eave);
    // Windows, lit, and the door
    for (let i = 0; i < 5; i++) {
      const wx = left + 2 + i * 5;
      if (Math.abs(wx - (hx0 - 4)) < 3) continue;
      put(wx - 1, top + 3, HOUSE.frame);
      for (let j = 0; j < 3; j++) {
        put(wx, top + 3 + j, j === 0 ? HOUSE.winHi : HOUSE.win);
        put(wx + 1, top + 3 + j, HOUSE.win);
      }
      put(wx, base + 1, GOLD_SPILL);
      put(wx + 1, base + 1, GOLD_SPILL);
    }
    for (let j = 0; j < 5; j++) {
      put(hx0 - 5, base - j, HOUSE.door);
      put(hx0 - 4, base - j, j === 4 ? HOUSE.door : HOUSE.win);
      put(hx0 - 3, base - j, HOUSE.door);
    }
    // A gable window, and the chimney
    put(right + 3, top - 2 - 1, HOUSE.win);
    put(right + 4, top - 2 - 1, HOUSE.win);
    const cx = left + 5;
    const ctop = top - R - 4;
    for (let y = ctop; y < top - R + 3; y++) {
      put(cx, y, HOUSE.chimney);
      put(cx + 1, y, HOUSE.chimney);
      put(cx + 2, y, y === ctop ? HOUSE.ridge : HOUSE.gableDk);
    }
    chimney = [cx + 1, ctop - 1];
  }

  function footbridge(put: (x: number, y: number, c: RGB) => void, get: (x: number, y: number) => RGB, bx: number) {
    const waterY = Math.round((wt[bx] + wb[bx]) / 2) + 1;
    const H = bridgeH();
    const half = Math.max(11, Math.round(H * 2));
    const ai = half - 3;
    const rise = H - 2;
    const deck = waterY - H;
    const face = new Map<number, RGB>();
    for (let i = -half; i <= half; i++) {
      const x = bx + i;
      const archTop = Math.abs(i) < ai ? Math.round(waterY - rise * Math.sqrt(1 - (i / ai) ** 2)) : 99999;
      for (let y = deck; y <= waterY; y++) {
        let col: RGB;
        if (y > archTop) col = y === archTop + 1 ? STONE.arch : mix(get(x, y), STONE.arch, 0.6);
        else if (y === deck) col = i > -half + 1 ? STONE.cap : STONE.capSh;
        else if (y === deck + 1) col = STONE.joint;
        else if (i === half || i === half - 1) col = STONE.lit;
        else col = (y - deck) % 2 === 0 && (x + (y >> 1) * 2) % 4 !== 0 ? STONE.face : (x + (y >> 1) * 2) % 4 === 0 ? STONE.joint : STONE.face;
        if (y > archTop - 1 && y <= archTop && Math.abs(i) < ai) col = STONE.joint;
        put(x, y, col);
        face.set(y * lw + x, col);
      }
    }
    // The bridge in the water, under itself
    for (const [k, col] of face) {
      const x = k % lw;
      const y = Math.floor(k / lw);
      const ry = 2 * waterY - y + 1;
      if (wt[x] < 0 || ry > wb[x] || ry <= waterY) continue;
      const xo = Math.round(Math.sin(ry * 1.7) * 0.6);
      put(x + xo, ry, WATER[step(clamp(lum(col) * 0.85 - 0.08, 0, 1), 7, x, ry)]);
    }
  }

  // ---------------------------------------------------------------------------------
  // Sprites, made once

  // Your partner is you redrawn without the bag, in their own colours: the pink jumper and
  // the bucket hat from their portrait, and ginger under it (the hair only: the belt is the
  // same brown)
  const PARTNER_SWAP: [string, string][] = [
    ['#c0452b', '#a64e68'],
    ['#df6a43', '#d4687c'],
    ['#8f2f1c', '#783246'],
    ['#7a6447', '#927a52'],
    ['#957b58', '#bea474'],
    ['#4e3f2b', '#6a5636'],
  ];
  const PARTNER_HAIR = '#a85a26';
  const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  function recolour(d: Uint8ClampedArray, w: number, hairRows: number) {
    const swaps = PARTNER_SWAP.map(([a, b]) => [hex(a), hex(b)]);
    const hair = [hex('#4a3626'), hex(PARTNER_HAIR)];
    for (let k = 0; k < d.length; k += 4) {
      if (d[k + 3] !== 255) continue;
      const row = Math.floor(k / 4 / w);
      for (const [a, b] of row < hairRows ? [...swaps, hair] : swaps)
        if (d[k] === a[0] && d[k + 1] === a[1] && d[k + 2] === a[2]) {
          d[k] = b[0];
          d[k + 1] = b[1];
          d[k + 2] = b[2];
          break;
        }
    }
  }

  const golfers = new Map<string, HTMLCanvasElement>();
  function golferSprite(ph: number, partner = false, bow = false) {
    const id = `${ph}${partner ? 'p' : ''}${bow ? 'b' : ''}`;
    const had = golfers.get(id);
    if (had) return had;
    const [c, s] = canvas(28, 30);
    drawGolfer(s, 14, 25, -1, { kind: 'walk', phase: ph, bag: !partner, bow });
    // Back-lit: a warm rim down the side that faces the sun
    const im = s.getImageData(0, 0, 28, 30);
    const d = im.data;
    if (partner) recolour(d, 28, 13);
    for (let y = 0; y < 30; y++)
      for (let x = 27; x > 0; x--) {
        const k = (y * 28 + x) * 4;
        if (d[k + 3] === 255 && d[k + 7] < 255) {
          d[k] = Math.round(d[k] * 0.4 + 255 * 0.6);
          d[k + 1] = Math.round(d[k + 1] * 0.4 + 206 * 0.6);
          d[k + 2] = Math.round(d[k + 2] * 0.4 + 140 * 0.6);
          break;
        }
      }
    s.putImageData(im, 0, 0);
    golfers.set(id, c);
    return c;
  }
  // The golfer in the middle distance: thirteen pixels, drawn by hand, two strides
  const MID_KEY: Record<string, string> = {
    C: '#957b58',
    c: '#7a6447',
    h: '#4a3626',
    s: '#ebc39b',
    S: '#c99a74',
    w: '#fbf6ea',
    r: '#c0452b',
    R: '#df6a43',
    d: '#8f2f1c',
    b: '#7a4a24',
    B: '#56331a',
    k: '#a49f92',
    t: '#f1e9d3',
    T: '#cdbf9c',
    o: '#3a2a1e',
    g: '#ffc488',
  };
  const MID_BODY = ['...CC.k', '.ccchbk', '.ssShb.', '..sS.b.', '.dwrRbg', '.drrRBg', '.drrRBg', '.srrR..', '..hhh..'];
  const MID_LEGS = [
    ['..t.T..', '..t.T..', '..t.T..', '.oo.oo.'],
    ['..tT...', '.t..T..', '.t...T.', 'oo...oo'],
  ];
  // Your partner at this size: no bag, nor the light along it, and their colours
  const MID_PARTNER: Record<string, string> = { ...MID_KEY, C: '#bea474', c: '#927a52', H: PARTNER_HAIR, r: '#a64e68', R: '#d4687c', d: '#783246' };
  const mids: HTMLCanvasElement[] = [];
  function midGolfer(ph: number, partner = false) {
    const id = ph + (partner ? 2 : 0);
    if (mids[id]) return mids[id];
    const key = partner ? MID_PARTNER : MID_KEY;
    const rows = [...MID_BODY, ...MID_LEGS[ph]].map((r, j) => (partner ? r.replace(/[bBkg]/g, '.').replace(/h/g, j < 4 ? 'H' : 'h') : r));
    const [c, s] = canvas(11, 15);
    const on = (i: number, j: number) => j >= 0 && j < rows.length && i >= 0 && i < 7 && rows[j][i] !== '.';
    // An outline, then the figure
    s.fillStyle = 'rgba(40,46,22,0.6)';
    for (let j = -1; j <= rows.length; j++)
      for (let i = -1; i <= 7; i++) if (!on(i, j) && (on(i + 1, j) || on(i - 1, j) || on(i, j + 1) || on(i, j - 1))) s.fillRect(i + 2, j + 1, 1, 1);
    rows.forEach((row, j) =>
      [...row].forEach((ch, i) => {
        if (ch === '.') return;
        s.fillStyle = key[ch];
        s.fillRect(i + 2, j + 1, 1, 1);
      }),
    );
    mids[id] = c;
    return c;
  }

  // The golfer far off, on the bridge and the lawn: six pixels tall, the cap, the red jumper
  // (your partner the same, without the bag, in their colours)
  const BAG = new Set(['#7a4a24', '#a49f92', '#56331a']);
  const SMALL_PARTNER: Record<string, string> = { '#7a6447': '#927a52', '#4a3626': PARTNER_HAIR, '#c0452b': '#a64e68', '#df6a43': '#d4687c' };
  function smallGolfer(x: number, y: number, ph: number, a = 1, partner = false) {
    const s = ph & 1;
    const px = (dx: number, dy: number, col: string) => {
      if (a < 1 && bayer(x + dx, y + dy) > a) return;
      if (partner && BAG.has(col)) return;
      g.fillStyle = partner ? (SMALL_PARTNER[col] ?? col) : col;
      g.fillRect(x + dx, y + dy, 1, 1);
    };
    px(1, -6, '#7a4a24');
    px(2, -7, '#a49f92');
    px(1, -5, '#56331a');
    px(-1, -7, '#7a6447');
    px(0, -7, '#7a6447');
    px(-1, -6, '#ebc39b');
    px(0, -6, '#4a3626');
    px(-1, -5, '#c0452b');
    px(0, -5, '#df6a43');
    px(-1, -4, '#c0452b');
    px(0, -4, '#ffb070');
    px(-1, -3, '#f1e9d3');
    px(0, -3, '#f1e9d3');
    px(s ? -2 : -1, -2, '#f1e9d3');
    px(s ? 1 : 0, -2, '#cdbf9c');
    px(s ? -2 : -1, -1, '#3a2a1e');
    px(s ? 1 : 0, -1, '#3a2a1e');
  }

  // ---------------------------------------------------------------------------------
  // Each frame

  // The pennant, back-lit, on three frames
  const PENNANT = [
    ['#####...', '########', '#####+..', '##+.....'],
    ['####....', '#######.', '######++', '###.....'],
    ['#####...', '#######+', '####++..', '#+......'],
  ];
  function pennant(fr: number) {
    PENNANT[fr].forEach((row, j) =>
      [...row].forEach((ch, i) => {
        if (ch === '.') return;
        g.fillStyle = ch === '+' ? '#a83a26' : j === 0 || i === row.lastIndexOf('#') ? '#ffa266' : '#e2583a';
        g.fillRect(flag.x - 1 - i, flag.y - flag.h + j, 1, 1);
      }),
    );
  }

  const shadowPx = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= lw || y >= lh || !groundMask[y * lw + x]) return;
    const k = (y * lw + x) * 3;
    g.fillStyle = `rgb(${shadeRGB[k]},${shadeRGB[k + 1]},${shadeRGB[k + 2]})`;
    g.fillRect(x, y, 1, 1);
  };
  function longShadow(x: number, y: number, len: number, thick: number) {
    const dx = x - sun.x - lw * 0.3;
    const dy = y - vh;
    const n = Math.hypot(dx, dy);
    for (let i = 1; i < len; i++) {
      const sx = Math.round(x + (dx / n) * i);
      const sy = Math.round(y + (dy / n) * i);
      if (i > len * 0.7 && bayer(sx, sy) < (i - len * 0.7) / (len * 0.3)) continue;
      for (let j = 0; j < (i < len * 0.5 ? thick : 1); j++) shadowPx(sx - j, sy);
    }
  }

  /** Where the golfer is on the walk at d pixels along it */
  function along(dist: number): { x: number; y: number; done: boolean } {
    let rest = dist;
    for (let i = 0; i < walk.len.length; i++) {
      if (rest <= walk.len[i]) {
        const [ax, ay] = walk.pts[i];
        const [bx, by] = walk.pts[i + 1];
        const t = rest / walk.len[i];
        return { x: Math.round(ax + (bx - ax) * t), y: Math.round(ay + (by - ay) * t), done: false };
      }
      rest -= walk.len[i];
    }
    const [x, y] = walk.pts[walk.pts.length - 1];
    return { x, y, done: true };
  }

  /** One figure on the walk, at the size its distance gives it */
  function walker(dist: number, at: { x: number; y: number; done: boolean }, ph: number, partner: boolean, bow: boolean) {
    if (at.y >= walk.nearY) {
      longShadow(at.x, at.y, 46, 2);
      g.drawImage(golferSprite(ph & 3, partner, bow), at.x - 14, at.y - 25);
    } else if (at.y >= walk.midY) {
      longShadow(at.x, at.y, 30, 1);
      g.drawImage(midGolfer(ph & 1, partner), at.x - 5, at.y - 14);
    } else {
      const fade = at.done ? 1 - clamp((dist - walk.total) / 6, 0, 1) : 1;
      if (fade > 0) {
        if (!at.done) longShadow(at.x, at.y, 14, 1);
        smallGolfer(at.x, at.y, ph, fade, partner);
      }
    }
  }

  function draw(now: number) {
    if (!still) return;
    const t = reduce ? 0 : Math.max(0, now - t0);
    g.clearRect(0, 0, lw, lh);
    g.drawImage(still, 0, 0);

    // Clouds, drifting left, thinning out before they reach the words
    for (const cl of clouds) {
      const span = lw + 60;
      let x0 = cl.x - (reduce ? 0 : (t / 1000) * cl.v);
      x0 = ((((x0 + 40) % span) + span) % span) - 40;
      const y0 = Math.round(cl.y);
      for (const [dx, dy, kind] of cl.px) {
        const x = Math.round(x0) + dx;
        const y = y0 + dy;
        if (x < 0 || x >= lw || y < 0) continue;
        const fade = copy.b > y - 2 ? clamp((x - copy.r - 4) / 14, 0, 1) : 1;
        if (fade < 1 && bayer(x, y) >= fade) continue;
        const dd = Math.hypot((x - sun.x) / 1.6, y - sun.y) / sun.r;
        const hot = dd < 2.2;
        const col = kind === 2 ? (hot ? CLOUD.hot : CLOUD.lit) : kind === 3 ? CLOUD.lit : kind === 1 ? (hot ? CLOUD.warm : CLOUD.top) : hot ? CLOUD.warm : CLOUD.body;
        g.fillStyle = rgb(col);
        g.fillRect(x, y, 1, 1);
      }
    }

    // The sun on the water: the column breaks and mends
    if (!reduce) {
      const tk = Math.floor(t / 170);
      for (const p of glitter) {
        const run = Math.floor((p.x + Math.floor(tk * 0.5 + p.y * 1.3)) / 2);
        const h = hash(run, p.y, tk);
        if (h < (1 - p.w) * 0.6 + 0.08) {
          g.fillStyle = rgb(h < 0.2 ? WATER[7] : WATER[6]);
          g.fillRect(p.x, p.y, 1, 1);
        } else if (h > 0.93) {
          g.fillStyle = rgb(WATER[4]);
          g.fillRect(p.x, p.y, 1, 1);
        }
      }
    }

    // Smoke from the clubhouse chimney
    g.fillStyle = rgb(SMOKE);
    for (let i = 0; i < 16; i++) {
      const a = (t / 11000 + i / 16) % 1;
      const x = Math.round(chimney[0] - a * a * 12 + Math.sin(a * 6 + i * 0.7) * 1.2);
      const y = Math.round(chimney[1] - a * 15);
      if (a > 0.55 && bayer(x, y) > (1 - a) * 2) continue;
      g.fillRect(x, y, a < 0.4 ? 1 : 2, 1);
    }

    pennant(reduce ? 0 : Math.floor(t / 210) % 3);

    // The golfer, walking off: down from the green, over the bridge, up to the door
    // Slow on the near ground, slower still far off: it is a long way to the house
    // Dropped, they set off a step ahead and go slower, head down, on their own
    const alone = verdict === 'drop';
    const ahead = alone ? DROP_AHEAD : 0;
    const pace = alone ? DROP_PACE : 2.3;
    const big = walk.len[0] + walk.len[1];
    const secs = Math.max(0, (t - 1800) / 1000);
    const dist = ahead + (reduce ? walk.len[0] * 0.6 : Math.min(secs * pace, big) + Math.max(0, secs * pace - big) * 0.6);
    const at = along(dist);
    const stepPh = reduce ? 0 : Math.floor(dist / 1.6);
    if (alone) walker(dist, at, stepPh, false, true);
    else {
      // Kept, your partner walks in beside you, on the far side: a little right of you and a
      // pixel or two up the screen, closer in as you both get smaller. Whoever is further up
      // the screen goes behind
      const [ox, oy] = at.y >= walk.nearY ? PARTNER_NEAR : at.y >= walk.midY ? PARTNER_MID : PARTNER_FAR;
      const mate = { ...at, x: at.x + ox, y: at.y + oy };
      const both: [number, typeof at, number, boolean][] = [
        [dist, at, stepPh, false],
        [dist, mate, stepPh + 2, true],
      ];
      both.sort((a, b) => a[1].y - b[1].y);
      for (const [d, p, ph, partner] of both) walker(d, p, ph, partner, false);
    }

    // Motes in the light over the green
    if (!reduce)
      for (const m of motes) {
        const a = (t / 1000) * 0.06 + m.ph;
        const y = Math.round(m.y - ((a * 30) % 24));
        const x = Math.round(m.x + Math.sin(a * 6 + m.ph * 9) * 2);
        if (Math.sin(t / 700 + m.ph * 20) < 0.2) continue;
        if (x < 0 || x >= lw || y < 0 || y >= lh) continue;
        g.fillStyle = rgb(MOTE);
        g.fillRect(x, y, 1, 1);
      }

    // Birds: a pair, now and then, across the sun
    if (!reduce) {
      const cyc = 26000;
      const u = ((t + 9000) % cyc) / 15000;
      if (u < 1)
        for (const [ox, oy, ph] of [
          [0, 0, 0],
          [7, -3, 2],
          [13, 1, 1],
        ]) {
          const x = Math.round(lw + 12 - u * (lw + 12 - copy.r) * 1.1 + ox);
          const y = Math.round(birdY - u * (birdY - 4) * 0.9 + oy + Math.sin(u * 14 + ox) * 1.2);
          if (inWords(x, y, 3)) continue;
          const up = Math.floor(t / 190 + ph) % 2 === 0;
          g.fillStyle = rgb(BIRD);
          g.fillRect(x, y, 1, 1);
          g.fillRect(x - 1, y - 1, 1, 1);
          g.fillRect(x + 1, y - 1, 1, 1);
          g.fillRect(x - 2, up ? y - 2 : y, 1, 1);
          g.fillRect(x + 2, up ? y - 2 : y, 1, 1);
        }
    }

    // In, by a dither: pixels arrive in the Bayer order
    const rv = reduce ? 1 : clamp(t / 700, 0, 1);
    if (rv < 1) {
      const lvl = Math.round((1 - rv) * 16);
      if (lvl > 0) {
        g.globalCompositeOperation = 'destination-out';
        g.fillStyle = g.createPattern(ditherCanvas(lvl), 'repeat')!;
        g.fillRect(0, 0, lw, lh);
        g.globalCompositeOperation = 'source-over';
      }
    }
  }

  function loop(now: number) {
    if (!running) return;
    // Pixel art moves on its own beat: a frame every 50ms is plenty
    if (now - last >= 48) {
      last = now;
      draw(now);
    }
    raf = requestAnimationFrame(loop);
  }

  return {
    resize,
    get scale() {
      return scale;
    },
    start(o: EndingOpts) {
      reduce = o.reduce;
      verdict = o.verdict;
      t0 = performance.now();
      pausedAt = -1;
      if (running) return;
      running = true;
      draw(t0);
      if (!reduce) raf = requestAnimationFrame(loop);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    /** Pause and resume without restarting the walk, for when the band scrolls away */
    pause(v: boolean) {
      if (!running || reduce) return;
      cancelAnimationFrame(raf);
      const now = performance.now();
      if (v && pausedAt < 0) pausedAt = now;
      if (!v) {
        if (pausedAt >= 0) t0 += now - pausedAt;
        pausedAt = -1;
        raf = requestAnimationFrame(loop);
      }
    },
  };
}
