// The close-ups: a pixel portrait that cuts in beside a line of text at the foot of the
// board, when the inner voice speaks, when the rope heckles, and when the caddie offers
// two lines. 48 by 48, at the board's own pixel. You, the caddie and your partner are the
// same hand-placed heads as on the walk's stage (hand.ts), at half the size; the heckler
// is only ever this, a few strong shapes with the face hand-placed over them. Lit from
// the right, where the low sun is.

import { handHeadOnto } from './hand';
import type { Face } from './cast';

export type Who = 'you' | 'heckler' | 'caddie' | 'partner';
export type Expr = 'calm' | 'wince' | 'tense' | 'settled';

const N = 48;
export const PAL: Record<string, string> = {
  K: '#26211a',
  s: '#ebc39b',
  h: '#4a3626',
  w: '#fbf6ea',
  e: '#fffaf0',
  m: '#8f4a3a',
  M: '#5a2a20',
  g: '#e39a7c',
  // The heckler: tweed and a ruddy face
  u: '#8a7a52',
  U: '#a8986a',
  v: '#5e5236',
  o: '#e8ae8a',
  O: '#c98a6a',
};

type Grid = string[][];
const blank = (): Grid => Array.from({ length: N }, () => Array<string>(N).fill('.'));
const set = (g: Grid, x: number, y: number, c: string) => {
  if (x >= 0 && y >= 0 && x < N && y < N) g[y][x] = c;
};
function ellipse(g: Grid, cx: number, cy: number, rx: number, ry: number, col: (x: number, y: number, nx: number, ny: number) => string | null) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const nx = (x + 0.5 - cx) / rx;
      const ny = (y + 0.5 - cy) / ry;
      if (nx * nx + ny * ny > 1) continue;
      const c = col(x, y, nx, ny);
      if (c) set(g, x, y, c);
    }
}
// A patch of hand-placed pixels: rows of palette letters, '.' leaves what's there
function patch(g: Grid, x0: number, y0: number, rows: string[]) {
  rows.forEach((r, j) => [...r].forEach((c, i) => c !== '.' && set(g, x0 + i, y0 + j, c)));
}
// An ink outline round everything drawn, where it meets the background
function outline(g: Grid) {
  const out = g.map((r) => [...r]);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      if (g[y][x] !== '.') continue;
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy]?.[x + dx] && g[y + dy][x + dx] !== '.');
      if (near) out[y][x] = 'K';
    }
  return out;
}

// Shoulders and a body, sloping out to the frame's foot
function body(g: Grid, cx: number, top: number, main: string, lit: string, dark: string) {
  for (let y = top; y < N; y++) {
    const w = Math.min(22, 9 + (y - top) * 2.4);
    for (let x = Math.round(cx - w); x <= Math.round(cx + w); x++) {
      const u = (x - (cx - w)) / (2 * w);
      set(g, x, y, u > 0.72 ? lit : u < 0.22 ? dark : main);
    }
  }
}

// A head turned three-quarters to the right: a skull, a jaw, an ear, a nose
function head(g: Grid, cx: number, cy: number, skin: string, shade: string, light: string) {
  ellipse(g, cx, cy, 10, 12, (_x, _y, nx, ny) => (nx < -0.55 ? shade : nx > 0.45 && ny > -0.3 && ny < 0.3 ? light : skin));
  // The jaw, squarer on the near side
  for (let y = cy + 6; y <= cy + 11; y++) for (let x = cx - 4; x <= cx + 8 - Math.max(0, y - cy - 8); x++) set(g, x, y, skin);
  for (let y = cy + 9; y <= cy + 11; y++) set(g, cx - 5, y, shade);
  // The ear, on the far side
  ellipse(g, cx - 9, cy + 1, 2.4, 3.4, (_x, _y, nx) => (nx > 0.2 ? shade : skin));
  // The nose, out past the cheek
  patch(g, cx + 9, cy, [`${skin}.`, `${skin}${skin}`, `${skin}${skin}`, `${shade}${skin}`]);
}

function neck(g: Grid, cx: number, top: number, skin: string, shade: string) {
  for (let y = top; y < top + 7; y++) for (let x = cx - 4; x <= cx + 4; x++) set(g, x, y, y < top + 2 || x < cx - 1 ? shade : skin);
}

// The close-ups' expressions, as the cast's faces: easy, caught out, worried at, settled
const AS_FACE: Record<Expr, Face> = { calm: 'normal', wince: 'shocked', tense: 'thinking', settled: 'pleased' };

const cache = new Map<string, HTMLCanvasElement>();

/** The heckler, on a grid of palette keys */
function heckler(): Grid {
  const g = blank();
  // A tweed hat, a ruddy face, a mouth open on the second word
  body(g, 23, 38, 'u', 'U', 'v');
  patch(g, 20, 36, ['ww...ww', '.wwwww.', '..ggg..']);
  neck(g, 23, 32, 'o', 'O');
  head(g, 23, 23, 'o', 'O', 's');
  ellipse(g, 29, 26, 2.6, 1.6, () => 'g');
  ellipse(g, 21, 26, 2.2, 1.4, () => 'g');
  // A round-brimmed hat
  ellipse(g, 22, 13, 10.5, 6, (x, y) => (y > 15 ? null : (x + y) % 3 === 0 ? 'v' : x > 26 ? 'U' : 'u'));
  for (let x = 8; x <= 37; x++) set(g, x, 15, x > 30 ? 'U' : 'v');
  for (let x = 10; x <= 35; x++) set(g, x, 16, 'v');
  // Eyes narrowed with glee, brows up, the mouth wide open
  patch(g, 25, 19, ['.hhh..', '......', 'KKKK..', '.KK...']);
  patch(g, 31, 19, ['hh.', '...', 'KK.', 'K..']);
  patch(g, 27, 28, ['MMMMMM', 'MeeeeM', 'MmmmmM', '.MMMM.']);
  return outline(g);
}

// The ground behind a face: a warm band for you, rose for the rope, sage for the caddie,
// with Bayer-dithered speed lines across it
const BG: Record<Who, [string, string]> = {
  you: ['#f3d48a', '#e9bd62'],
  heckler: ['#e7b3a0', '#cf8c78'],
  caddie: ['#cfd8ae', '#aebd86'],
  partner: ['#f2c4c8', '#e2a2aa'],
};

/** A face on its own 48 by 48 canvas, cached; flip mirrors it to look left */
export function portrait(who: Who, expr: Expr, flip = false): HTMLCanvasElement {
  const key = `${who}:${expr}:${flip}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = N;
  c.height = N;
  const g = c.getContext('2d')!;
  const [a, b] = BG[who];
  for (let y = 0; y < N; y++) {
    g.fillStyle = y % 6 < 2 && (y >> 1) % 2 === 0 ? b : a;
    g.fillRect(0, y, N, 1);
  }
  if (who === 'heckler') {
    const grid = heckler();
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const ch = grid[y][x];
        if (ch === '.') continue;
        g.fillStyle = PAL[ch] ?? '#ff00ff';
        g.fillRect(flip ? N - 1 - x : x, y, 1, 1);
      }
  } else handHeadOnto(g, who, AS_FACE[expr], N, flip);
  cache.set(key, c);
  return c;
}

export const EXPRS: Expr[] = ['calm', 'wince', 'tense', 'settled'];
