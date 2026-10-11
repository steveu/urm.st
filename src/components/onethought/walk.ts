// The walk between holes, painted over the whole board: side on, at last light, the same
// evening as the sealed round. A pale sky to amber, the sun low on the right, far hills in
// haze, a back-lit treeline, then the field and the path with the trees beside it, every
// one throwing its shadow long to the left. The golfer crosses it with the bag up towards
// the next tee's sign (the clubhouse, after the last green) while the inner voice talks.
//
// Painted once a size into three layers that slide at their own pace; each frame draws
// only the golfer, their shadow, the sign, motes in the light and the near crowns going by.

import { bayer, hash, canvas, drawGolfer, drawCloud, teeSign, house, type Sprite } from './pixel';

type RGB = readonly [number, number, number];
type Ctx = CanvasRenderingContext2D;

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const mix = (a: RGB, b: RGB, t: number): RGB => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];
// A 0..1 value onto n steps, ordered-dithered across each boundary
const step = (v: number, n: number, x: number, y: number) => clamp(Math.floor(v * (n - 1) + bayer(x, y)), 0, n - 1);

// The palette: the sealed round's evening
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
const CLOUD = { body: [212, 150, 158] as RGB, top: [196, 136, 150] as RGB, lit: [252, 208, 162] as RGB, warm: [236, 170, 142] as RGB };
const HILL: RGB[] = [
  [224, 180, 182],
  [202, 160, 174],
];
const HILL_LIT: RGB = [242, 202, 176];
const BACK = { body: [158, 120, 140] as RGB, dark: [140, 106, 130] as RGB, rim: [238, 172, 132] as RGB };
const TREE = { body: [94, 78, 100] as RGB, dark: [72, 60, 84] as RGB, mid: [118, 96, 110] as RGB, rimDim: [190, 128, 112] as RGB, rim: [240, 168, 96] as RGB, hot: [255, 216, 142] as RGB };
const BLOSSOM = { shade: [204, 104, 136] as RGB, pink: [236, 146, 164] as RGB, lit: [255, 200, 192] as RGB };
// Lit far, lit near, shaded far, shaded near
const ROUGH: RGB[] = [
  [218, 186, 110],
  [146, 134, 78],
  [152, 122, 134],
  [94, 86, 110],
];
const PATH: RGB[] = [
  [232, 206, 140],
  [196, 178, 112],
  [170, 144, 146],
  [122, 108, 124],
];
const GOLD_SPILL: RGB = [236, 196, 120];
const MOTE = '#ffecb4';
const SHADOW = 'rgba(72,60,96,0.42)';

/** How far across (0 to 1); the hole the walk is to, or 0 for the clubhouse; the golfer's
 *  walk and bearing; and whether the voices sit at the top of the board (a phone) */
export type WalkFrame = { u: number; n: number; walking: boolean; bow: boolean; cloud: { t0: number; doubt: boolean } | null; top: boolean; golfer: boolean };

const SCROLL = 64; // how far the near ground goes by over the walk, in pixels

type Layer = { c: HTMLCanvasElement; g: Ctx; img: ImageData; w: number; h: number };
function layer(w: number, h: number): Layer {
  const [c, g] = canvas(w, h);
  return { c, g, img: g.createImageData(w, h), w, h };
}
function put(l: Layer, x: number, y: number, c: RGB) {
  if (x < 0 || y < 0 || x >= l.w || y >= l.h) return;
  const i = (y * l.w + x) * 4;
  l.img.data[i] = c[0];
  l.img.data[i + 1] = c[1];
  l.img.data[i + 2] = c[2];
  l.img.data[i + 3] = 255;
}

// A tree as a mask: a crown of lumps on a short trunk, or a pine in tiers
function plant(m: Uint8Array, w: number, h: number, x: number, base: number, ht: number, wd: number, pine: boolean, seed: number) {
  const set = (px: number, py: number) => {
    if (px >= 0 && py >= 0 && px < w && py < h) m[py * w + px] = 1;
  };
  if (pine) {
    for (let j = 0; j < ht; j++) {
      const y = base - j;
      if (j < 2) {
        set(x, y);
        continue;
      }
      const u = (j - 2) / Math.max(1, ht - 2);
      const tier = (j - 2) % 3 === 0 ? 1 : (j - 2) % 3 === 1 ? 0.86 : 0.74;
      const hw = Math.round((1 - u) * (wd / 2) * tier + 0.3);
      for (let i = -hw; i <= hw; i++) if (Math.abs(i) < hw || hash(x + i, y, seed) > 0.25) set(x + i, y);
    }
    return;
  }
  const ch = Math.max(ht * 0.84, 4);
  const a = wd / 2;
  const b = ch / 2;
  const cy = base - ht + b;
  const lumps: [number, number, number][] = [[0, cy, b * 0.8]];
  const n = 5 + Math.floor(wd / 5);
  for (let k = 0; k < n; k++) {
    const ang = hash(k, seed, 1) * Math.PI * 2;
    const rr = Math.sqrt(hash(k, seed, 2)) * 0.62;
    const lr = Math.min(a, b) * (0.36 + hash(k, seed, 3) * 0.26);
    lumps.push([Math.cos(ang) * a * rr, cy + Math.sin(ang) * b * rr * 0.9, lr]);
  }
  const tw = Math.max(0, Math.round(wd / 14));
  for (let j = 0; j < ht - ch + 3; j++) for (let i = -tw; i <= tw; i++) set(x + i, base - j);
  for (let y = Math.floor(base - ht - 2); y <= base; y++)
    for (let i = -Math.ceil(a + 3); i <= Math.ceil(a + 3); i++) {
      if (lumps.some(([lx, ly, lr]) => Math.hypot(i - lx, (y - ly) * 1.05) <= lr - (hash(x + i, y, seed) < 0.3 ? 0.8 : 0))) set(x + i, y);
    }
}

// Colour a mask lit from the right: a rim where it meets the sky on the sun side, hot at
// its top right, dark at the foot and the shaded left
function paintMask(l: Layer, m: Uint8Array, pal: { body: RGB; dark: RGB; mid: RGB; rim: RGB; hot?: RGB }, dimRim = false) {
  const { w, h } = l;
  const at = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && m[y * w + x] === 1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!at(x, y)) continue;
      const right = !at(x + 1, y);
      const up = !at(x, y - 1);
      const left = !at(x - 1, y);
      let c = pal.body;
      if ((right && up) && pal.hot && !dimRim) c = pal.hot;
      else if (right || (up && at(x - 1, y - 1) === false && hash(x, y, 9) > 0.4)) c = pal.rim;
      else if (!at(x + 2, y) && bayer(x, y) < 0.5) c = pal.mid;
      else if (left || !at(x, y + 3) || bayer(x, y) < 0.22) c = pal.dark;
      put(l, x, y, c);
    }
}

export function createWalk() {
  let key = '';
  let back: Layer | null = null;
  let far: Layer | null = null;
  let land: Layer | null = null;
  let front: { c: HTMLCanvasElement; x: number; ax: number; ay: number }[] = [];
  let hz = 0;
  let pathY = 0;
  let sun = { x: 0, y: 0, r: 0 };
  const signs = [teeSign(11), teeSign(12), teeSign(13)];
  const houseSp: Sprite = house();

  function paint(lw: number, lh: number, top: boolean) {
    const k = `${lw}x${lh}:${top}`;
    if (k === key) return;
    key = k;
    // The voices take the top on a phone and the foot elsewhere; the walk keeps clear
    pathY = top ? lh - 34 : Math.round(lh * 0.6);
    hz = pathY - 26;
    sun = { x: Math.round(lw * 0.82), y: hz - 8, r: clamp(Math.round(lh * 0.05), 6, 9) };

    // The sky, the sun, the clouds and the hills: still
    back = layer(lw, hz + 2);
    const clouds = [
      { cx: lw * 0.24, cy: hz * 0.34, a: lw * 0.17, b: 2.6 },
      { cx: lw * 0.6, cy: hz * 0.18, a: lw * 0.1, b: 1.8 },
      { cx: lw * 0.93, cy: hz * 0.52, a: lw * 0.13, b: 2.2 },
    ];
    for (let y = 0; y < hz + 2; y++)
      for (let x = 0; x < lw; x++) {
        let c = SKY[step((y / hz) ** 1.15, 7, x, y)];
        const d = Math.hypot((x - sun.x) / 1.7, y - sun.y) / (sun.r * 6);
        if (d < 1) {
          const lv = step((1 - d) ** 1.5, 5, x, y);
          if (lv > 0) c = GLOW[lv - 1];
        }
        for (const cl of clouds) {
          const dx = (x - cl.cx) / cl.a;
          if (Math.abs(dx) >= 1) continue;
          const span = Math.sqrt(1 - dx * dx);
          const t = cl.cy - cl.b * span * 1.5 - Math.max(0, Math.sin(x / 3.1 + cl.cx) * 1.2 * span);
          const bot = cl.cy + cl.b * span * 0.5;
          if (y < t || y > bot) continue;
          const sunward = x > cl.cx - cl.a * 0.2 ? 1 : 0;
          c = y >= Math.round(bot) - 0.5 ? (sunward ? CLOUD.lit : CLOUD.warm) : y < t + 1 ? CLOUD.top : sunward && bayer(x, y) < 0.35 ? CLOUD.warm : CLOUD.body;
        }
        const r = Math.hypot(x - sun.x, y - sun.y);
        if (r <= sun.r) c = SUN;
        else if (r <= sun.r + 1) c = SUN_EDGE;
        const r1 = hz - 10 + 3 * Math.sin(x / 27) + 2 * Math.sin(x / 11 + 1.3);
        const r2 = hz - 5 + 2 * Math.sin(x / 19 + 2);
        if (y >= r2) c = HILL[1];
        else if (y >= r1) c = y < r1 + 1 && Math.abs(x - sun.x) < sun.r * 7 ? HILL_LIT : HILL[0];
        put(back, x, y, c);
      }
    back.g.putImageData(back.img, 0, 0);

    // The far treeline, back-lit, with a gap where the sun goes down
    far = layer(lw + SCROLL, hz + 2);
    {
      const m = new Uint8Array(far.w * far.h);
      for (let i = 0, x = -3; x < far.w + 4; i++) {
        const pine = hash(i, 2, 51) < 0.45;
        let ht = pine ? 9 + Math.round(hash(i, 1, 51) * 8) : 6 + Math.round(hash(i, 1, 51) * 6);
        const wd = pine ? 5 + Math.round(hash(i, 3, 51) * 3) : 7 + Math.round(hash(i, 3, 51) * 6);
        if (Math.abs(x - sun.x - SCROLL * 0.15) < sun.r * 1.6) ht = Math.round(ht * 0.35);
        if (ht > 2) plant(m, far.w, far.h, x, hz + 1, ht, wd, pine, 51 + i);
        x += 3 + Math.round(hash(i, 4, 51) * 5);
      }
      paintMask(far, m, { body: BACK.body, dark: BACK.dark, mid: BACK.body, rim: BACK.rim });
      far.g.putImageData(far.img, 0, 0);
    }

    // The field, the path, the trees along its far side and their long shadows
    land = layer(lw + SCROLL, lh);
    {
      const W = land.w;
      const trees: { x: number; ht: number; wd: number; pine: boolean; seed: number }[] = [];
      const signX = Math.round(lw * 0.86) + SCROLL;
      for (let i = 0, x = 14; x < W + 10; i++) {
        const pine = hash(i, 2, 71) < 0.35;
        const ht = pine ? 34 + Math.round(hash(i, 1, 71) * 16) : 26 + Math.round(hash(i, 1, 71) * 16);
        const wd = pine ? 11 + Math.round(hash(i, 3, 71) * 4) : 28 + Math.round(hash(i, 3, 71) * 14);
        // Room round the sign, and no tree over the sun
        if (Math.abs(x - signX) > wd / 2 + 8 && Math.abs(x - SCROLL / 2 - sun.x) > sun.r * 2) trees.push({ x, ht, wd, pine, seed: 71 + i });
        x += 40 + Math.round(hash(i, 4, 71) * 44);
      }
      const foot = pathY - 6;
      // Shadows: each tree's, raked long to the left and towards you, across the path
      const sh = new Uint8Array(W * lh);
      for (const t of trees) {
        const len = Math.round(t.ht * 1.5);
        for (let dx = 0; dx < len; dx++) {
          const u = dx / len;
          // Thin at the trunk, the crown's shadow wider further out
          const half = u < 0.3 ? 0.6 : (t.wd / 2) * Math.sin(((u - 0.3) / 0.7) * Math.PI) * 0.22 + 0.6;
          for (let dy = -half; dy <= half; dy++) {
            const x = t.x - dx;
            const y = Math.round(foot + 1 + dy + dx * 0.32);
            if (x < 0 || x >= W || y < hz || y >= lh) continue;
            if (u > 0.7 && bayer(x, y) < (u - 0.7) / 0.3) continue;
            sh[y * W + x] = 1;
          }
        }
      }
      for (let y = hz; y < lh; y++)
        for (let x = 0; x < W; x++) {
          const t = (y - hz) / (lh - hz);
          const s = sh[y * W + x] === 1;
          const dp = Math.abs(y - pathY + 0.5 - Math.sin(x / 40) * 0.8);
          const onPath = dp < 2.5 || (dp < 3.5 && bayer(x, y) < 0.5);
          const pal = onPath ? PATH : ROUGH;
          const lit = [pal[0], mix(pal[0], pal[1], 0.5), pal[1]];
          const shd = [pal[2], pal[3]];
          let c = s ? shd[step(t, 2, x, y)] : lit[step(t, 3, x, y)];
          if (!onPath && !s) {
            const n = hash(x, y, 77);
            if (n > 0.93) c = mix(c, ROUGH[3], 0.3);
            else if (n < 0.04) c = mix(c, GOLD_SPILL, 0.4);
          }
          // The low sun spills along the far edge of the field
          const g = 1 - Math.hypot((x - SCROLL * 0.5 - sun.x) / (lw * 0.35), (y - hz) / 10);
          if (!s && g > 0 && bayer(x, y) < g * 0.8) c = mix(c, GOLD_SPILL, 0.45);
          if (y === hz) c = mix(c, GLOW[2], 0.4);
          put(land, x, y, c);
        }
      // Bushes in flower along the path's far side
      for (let i = 0, x = 30; x < W; i++, x += 56 + Math.round(hash(i, 6, 81) * 60)) {
        for (let dy = 0; dy < 5; dy++)
          for (let dx = -5; dx <= 5; dx++) {
            if ((dx / 5.5) ** 2 + ((dy - 4) / 4.5) ** 2 > 1) continue;
            const h = hash(x + dx, dy, 83);
            const c = dy < 3 && h > 0.4 ? (dx > 1 ? BLOSSOM.lit : h > 0.7 ? BLOSSOM.pink : BLOSSOM.shade) : dx > 2 ? TREE.mid : TREE.dark;
            put(land, x + dx, pathY - 9 + dy, c);
          }
      }
      const m = new Uint8Array(W * lh);
      for (const t of trees) plant(m, W, lh, t.x, foot, t.ht, t.wd, t.pine, t.seed);
      paintMask(land, m, TREE);
      land.g.putImageData(land.img, 0, 0);
    }

    // Two near crowns, dark against the light, going by faster than the rest
    front = [];
    for (const [i, fx] of [[0, lw * 0.06], [1, lw * 0.64 + SCROLL]] as const) {
      const wd = 46 + i * 10;
      const ht = 44;
      const l = layer(wd + 10, ht + 6);
      const m = new Uint8Array(l.w * l.h);
      plant(m, l.w, l.h, Math.round(l.w / 2), l.h - 1, ht, wd, false, 91 + i);
      paintMask(l, m, { body: TREE.dark, dark: TREE.dark, mid: TREE.body, rim: TREE.rimDim }, true);
      l.g.putImageData(l.img, 0, 0);
      front.push({ c: l.c, x: Math.round(fx), ax: Math.round(l.w / 2), ay: l.h - 1 });
    }
  }

  function draw(g: Ctx, lw: number, lh: number, f: WalkFrame, now: number, reduce: boolean) {
    paint(lw, lh, f.top);
    const u = clamp(f.u, 0, 1);
    const sc = Math.round(u * SCROLL);
    g.drawImage(back!.c, 0, 0);
    g.drawImage(far!.c, -Math.round(sc * 0.3), 0);
    g.drawImage(land!.c, -sc, 0);
    // Where the walk ends: the next tee's sign, or the clubhouse
    if (f.n) {
      const sp = signs[f.n - 1];
      g.drawImage(sp.c, Math.round(lw * 0.86) + SCROLL - sc - sp.ax, pathY - 3 - sp.ay);
    } else g.drawImage(houseSp.c, Math.round(lw * 0.88) + SCROLL - sc - houseSp.ax, pathY - 5 - houseSp.ay);
    // The golfer, and their shadow, long to the left (left out while their portrait's up)
    if (f.golfer) {
      const gx = Math.round(lw * 0.12 + (lw * 0.62 * u));
      g.fillStyle = SHADOW;
      g.fillRect(gx - 24, pathY, 24, 1);
      g.fillRect(gx - 13, pathY + 1, 12, 1);
      drawGolfer(g, gx, pathY, 1, { kind: 'walk', phase: f.walking && !reduce ? Math.floor(now / (f.bow ? 190 : 150)) : 0, bag: true, bow: f.bow });
      if (f.cloud) drawCloud(g, gx + 1, pathY - 19, now - f.cloud.t0, f.cloud.doubt, reduce);
    }
    // Motes, drifting in the light
    if (!reduce) {
      g.fillStyle = MOTE;
      for (let i = 0; i < 9; i++) {
        const x = Math.round((hash(i, 1, 5) * lw + now * 0.004 * (1 + (i % 3))) % lw);
        const y = Math.round(hz - 24 + hash(i, 2, 5) * 40 + Math.sin(now / 900 + i) * 3);
        if (Math.floor(now / 300 + i) % 4) g.fillRect(x, y, 1, 1);
      }
    }
    for (const fr of front) g.drawImage(fr.c, Math.round(fr.x - sc * 1.5) - fr.ax, lh + (f.top ? 30 : 8) - fr.ay);
  }

  return { draw };
}
