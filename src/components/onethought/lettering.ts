// Hand-built pixel lettering, for the shout on the walk and the stamps over the ball: chunky
// italic display letters drawn as pixel glyphs, in two tones with a light top edge, a
// thick dark outline and a hard drop shadow.
//
// And the shout itself: the thought's word in a flat burst sized to the word, with a dark
// rim. Speed lines rake out only as it lands; then it holds still, and goes.

import { bayer, hash, canvas } from './pixel';

// The glyphs: capitals nine rows high on an eight-wide cell, small letters six rows from
// the fourth, descenders two rows under the line. '#' is ink
const G: Record<string, string[]> = {
  ' ': ['...', '...', '...', '...', '...', '...', '...', '...', '...'],
  D: ['######..', '##...##.', '##....##', '##....##', '##....##', '##....##', '##....##', '##...##.', '######..'],
  G: ['..#####.', '.##...##', '##......', '##......', '##..####', '##....##', '##....##', '.##...##', '..######'],
  c: ['........', '........', '........', '.#####..', '##...##.', '##......', '##......', '##...##.', '.#####..'],
  B: ['######..', '##...##.', '##...##.', '##..##..', '######..', '##...##.', '##....##', '##...##.', '######..'],
  C: ['..#####.', '.##...##', '##......', '##......', '##......', '##......', '##......', '.##...##', '..#####.'],
  K: ['##...##.', '##..##..', '##.##...', '####....', '###.....', '####....', '##.##...', '##..##..', '##...##.'],
  a: ['........', '........', '........', '.#####..', '.....##.', '.######.', '##...##.', '##...##.', '.#######'],
  d: ['.....##.', '.....##.', '.....##.', '.######.', '##...##.', '##...##.', '##...##.', '##..###.', '.###.##.'],
  e: ['........', '........', '........', '.#####..', '##...##.', '#######.', '##......', '##...##.', '.#####..'],
  g: ['........', '........', '........', '.######.', '##...##.', '##...##.', '##...##.', '.######.', '.....##.', '##...##.', '.#####..'],
  h: ['##......', '##......', '##......', '##.###..', '###..##.', '##...##.', '##...##.', '##...##.', '##...##.'],
  i: ['.##.', '.##.', '....', '###.', '.##.', '.##.', '.##.', '.##.', '####'],
  m: ['..........', '..........', '..........', '#########.', '##..##..##', '##..##..##', '##..##..##', '##..##..##', '##..##..##'],
  n: ['........', '........', '........', '##.###..', '###..##.', '##...##.', '##...##.', '##...##.', '##...##.'],
  o: ['........', '........', '........', '.#####..', '##...##.', '##...##.', '##...##.', '##...##.', '.#####..'],
  p: ['........', '........', '........', '######..', '##...##.', '##...##.', '##...##.', '######..', '##......', '##......', '##......'],
  r: ['........', '........', '........', '##.####.', '###...##', '##......', '##......', '##......', '##......'],
  t: ['........', '.##.....', '.##.....', '######..', '.##.....', '.##.....', '.##.....', '.##..##.', '..####..'],
  u: ['........', '........', '........', '##...##.', '##...##.', '##...##.', '##...##.', '##..###.', '.###.##.'],
  '!': ['.##.', '.##.', '.##.', '.##.', '.##.', '.##.', '....', '.##.', '.##.'],
};
const ROWS = 11;
const LEAN = 3; // a row's shift right for every so many rows up: the italic

export type Pal = { hi: string; mid: string; lo: string; line: string; shadow: string };
/** The shout: white at the top of each letter to red at its foot */
export const SHOUT_PAL: Pal = { hi: '#ffd2a8', mid: '#d4442a', lo: '#b8321c', line: '#2a1410', shadow: '#5a2a20' };
/** A moment kept: brass */
export const BRASS_PAL: Pal = { hi: '#fff3c9', mid: '#e3b84f', lo: '#a07a28', line: '#3e2c12', shadow: '#7a5c2c' };
/** A tap's stamp over the ball: the shout's colours, small */
export const STAMP_PAL = SHOUT_PAL;

const cache = new Map<string, HTMLCanvasElement>();

/** A word in the lettering, each glyph pixel k by k board pixels, outlined, shaded and
 *  shadowed. Cached */
export function lettering(text: string, k: number, pal: Pal): HTMLCanvasElement {
  const key = `${text}:${k}:${pal.hi}`;
  const hit = cache.get(key);
  if (hit) return hit;
  // Lay the glyphs out on the glyph grid, leaning
  const glyphs = [...text].map((ch) => G[ch] ?? G[ch.toLowerCase()] ?? G['!']);
  const lean = Math.ceil(ROWS / LEAN);
  const gw = glyphs.reduce((w, gl) => w + gl[0].length + 1, 0) + lean;
  const mask = new Uint8Array(gw * ROWS);
  let cx = 0;
  for (const gl of glyphs) {
    gl.forEach((row, r) =>
      [...row].forEach((ch, c) => {
        if (ch === '#') mask[r * gw + cx + c + Math.floor((ROWS - 1 - r) / LEAN)] = 1;
      }),
    );
    cx += gl[0].length + 1;
  }
  // Up to board pixels, with room for the outline and the shadow
  const o = k >= 2 ? 2 : 1;
  const sh = k + 1;
  const W = gw * k + 2 * o + sh;
  const H = ROWS * k + 2 * o + sh;
  const [c, g] = canvas(W, H);
  const ink = (x: number, y: number) => {
    const gx = Math.floor((x - o) / k);
    const gy = Math.floor((y - o) / k);
    return gx >= 0 && gy >= 0 && gx < gw && gy < ROWS && mask[gy * gw + gx] === 1;
  };
  const near = (x: number, y: number, r: number) => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (ink(x + dx, y + dy)) return true;
    return false;
  };
  const px = (x: number, y: number, col: string) => {
    g.fillStyle = col;
    g.fillRect(x, y, 1, 1);
  };
  // The shadow first, then the outline, then the letters
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (near(x - sh, y - sh, o)) px(x, y, pal.shadow);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (near(x, y, o)) px(x, y, pal.line);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!ink(x, y)) continue;
      // Two tones: the body, and a bright edge along the top of every stroke
      px(x, y, !ink(x, y - 1) ? pal.hi : pal.mid);
    }
  cache.set(key, c);
  return c;
}

/** The same, as its own element for the page, sized in the board's pixels (--px) */
export function letteringEl(text: string, k: number, pal: Pal): HTMLCanvasElement {
  const src = lettering(text, k, pal);
  const [c, g] = canvas(src.width, src.height);
  g.drawImage(src, 0, 0);
  c.style.width = `calc(${c.width} * var(--px))`;
  c.style.height = `calc(${c.height} * var(--px))`;
  return c;
}

// ---------------------------------------------------------------------------------------
// The shout

const IN_MS = 110;
const LAND_MS = 150;
export const SHOUT_HOLD = 1050;
const OUT_MS = 140;

// The burst, built once a size and word: a few big uneven spikes, flat cream, a dark rim
const bursts = new Map<string, HTMLCanvasElement>();
function burst(bw: number, bh: number, seed: number): HTMLCanvasElement {
  const key = `${bw}x${bh}:${seed}`;
  const hit = bursts.get(key);
  if (hit) return hit;
  const [c, g] = canvas(bw, bh);
  const cx = bw / 2;
  const cy = bh / 2;
  // The edge's reach at each angle: spikes of uneven length and spacing
  const n = 12;
  const pts: { a: number; r: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = ((i + hash(i, seed, 3) * 0.5) / n) * Math.PI * 2;
    pts.push({ a, r: 0.94 + hash(i, seed, 5) * 0.06 });
    pts.push({ a: a + (Math.PI / n) * (0.8 + hash(i, seed, 7) * 0.4), r: 0.7 + hash(i, seed, 9) * 0.08 });
  }
  const reach = (ang: number) => {
    let a = ang;
    if (a < 0) a += Math.PI * 2;
    for (let i = 0; i < pts.length; i++) {
      const p0 = pts[i];
      const p1 = pts[(i + 1) % pts.length];
      const a1 = i + 1 === pts.length ? p1.a + Math.PI * 2 : p1.a;
      if ((a >= p0.a && a < a1) || (i + 1 === pts.length && a < pts[0].a)) {
        const aa = a < p0.a ? a + Math.PI * 2 : a;
        return p0.r + (p1.r - p0.r) * ((aa - p0.a) / (a1 - p0.a));
      }
    }
    return pts[0].r;
  };
  const inside = (x: number, y: number, grow = 0) => {
    const dx = (x + 0.5 - cx) / (cx - 2 + grow);
    const dy = (y + 0.5 - cy) / (cy - 2 + grow);
    return Math.hypot(dx, dy) <= reach(Math.atan2(dy, dx));
  };
  for (let y = 0; y < bh; y++)
    for (let x = 0; x < bw; x++) {
      if (inside(x, y, -3)) {
        g.fillStyle = '#fff6dc';
      } else if (inside(x, y)) g.fillStyle = '#2a1410';
      else continue;
      g.fillRect(x, y, 1, 1);
    }
  bursts.set(key, c);
  return c;
}

/** Where the shouter is: their head's box in frame pixels, and the waist line where the
 *  box begins */
export type ShoutAnchor = { head: [number, number, number, number]; waist: number };

/** The shout, at `t` ms since it began, over the frame (w by h board pixels). It sizes
 *  itself to the frame: smaller letters on a phone rather than cut off. Given the
 *  shouter, it sits beside their head where there's room, the way a balloon does; on a
 *  narrow frame there's no beside, so it goes over the chest and leaves the face clear */
export function drawShout(g: CanvasRenderingContext2D, w: number, h: number, word: string, t: number, reduce: boolean, anchor: ShoutAnchor | null = null) {
  if (t < 0 || t > SHOUT_HOLD + OUT_MS) return;
  const glyphW = [...word].reduce((s, ch) => s + ((G[ch] ?? G[ch.toLowerCase()] ?? G['!'])[0].length + 1), 0) + 4;
  // As big as the frame allows, up to a size that keeps it in proportion to a face;
  // smaller, if that's what it takes to sit beside the head
  const size = (k: number) => {
    const letters = lettering(word, k, SHOUT_PAL);
    const bw = Math.round(letters.width * 1.2 + 20);
    return { k, letters, bw, bh: Math.round(Math.max(letters.height * 2, bw * 0.36)) };
  };
  let fit = size(Math.max(1, Math.min(2, Math.floor((w * 0.62) / glyphW))));
  const room = anchor ? w - anchor.head[2] : 0;
  while (anchor && fit.k > 1 && room < fit.bw * 0.9) fit = size(fit.k - 1);
  const { letters, bw, bh } = fit;
  const b = burst(bw, bh, word.length);
  let cx = Math.round(w / 2);
  let cy = Math.round(h * 0.4);
  if (anchor) {
    const [, hy0, hx1, hy1] = anchor.head;
    if (room >= bw * 0.9) {
      cx = Math.min(hx1 + 2 + Math.round(bw / 2), w - 2 - Math.round(bw / 2));
      cy = Math.max(Math.round((hy0 + hy1) / 2) - 8, Math.round(bh / 2) + 2);
    } else cy = anchor.waist - Math.round(bh / 2) + 6;
  }
  // In fast, a frame past full size, back; out quicker still
  let s = 1;
  if (!reduce) {
    if (t < IN_MS) s = 0.35 + (t / IN_MS) * 0.83;
    else if (t < IN_MS + 40) s = 1.12;
    else if (t > SHOUT_HOLD) s = 1 - ((t - SHOUT_HOLD) / OUT_MS) * 0.6;
  }
  // Speed lines out from behind it as it lands, thinning as they go; then gone
  if (!reduce && t >= IN_MS * 0.5 && t < IN_MS + LAND_MS) {
    g.fillStyle = 'rgba(255,246,220,0.6)';
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * Math.PI * 2 + hash(i, 3) * 0.1;
      const r0 = bw * 0.42;
      for (let r = r0; r < Math.max(w, h); r += 1) {
        const x = Math.round(cx + Math.cos(a) * r);
        const y = Math.round(cy + Math.sin(a) * r * 0.6);
        if (x < 0 || y < 0 || x >= w || y >= h) break;
        if (bayer(x, y) > 1 - (r - r0) / (w * 0.6) || i % 2) continue;
        g.fillRect(x, y, 1, 1);
      }
    }
  }
  const dw = Math.round(bw * s);
  const dh = Math.round(bh * s);
  g.imageSmoothingEnabled = false;
  g.drawImage(b, cx - Math.round(dw / 2), cy - Math.round(dh / 2), dw, dh);
  // The letters, still: the flash and the frame's shake are the only impact
  if (reduce || t >= IN_MS) {
    const lw = Math.round(letters.width * s);
    const lh = Math.round(letters.height * s);
    g.drawImage(letters, cx - Math.round(lw / 2), cy - Math.round(lh / 2), lw, lh);
  }
}
