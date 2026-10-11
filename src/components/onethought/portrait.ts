// The close-ups: a pixel portrait that cuts in beside a line of text at the foot of the
// board, when the inner voice speaks, when the rope heckles, and when the caddie offers
// two lines; and on the walks between holes, large on the stage: you, the caddie and your
// partner, a friendly rival in a pink jumper and a bucket hat. The rope is never seen.
// 48 by 48 low-res pixels, in the board's palette, at the board's scale. The walk's stage
// draws the cast larger and finer (cast.ts).
//
// Each face is a few strong shapes (hat, head, shoulders) with a hand-placed set of
// features for the expression: the eyes and brows carry it. Lit from the right, where
// the low sun is.

export type Who = 'you' | 'heckler' | 'caddie' | 'partner';
export type Expr = 'calm' | 'wince' | 'tense' | 'settled';

const N = 48;
export const PAL: Record<string, string> = {
  K: '#26211a',
  k: '#4a3f33',
  c: '#7a6447',
  C: '#9c8260',
  d: '#4e3f2b',
  s: '#ebc39b',
  S: '#c99a74',
  l: '#f7dcbc',
  h: '#4a3626',
  H: '#6b513a',
  w: '#fbf6ea',
  W: '#d9d0bc',
  r: '#c0452b',
  R: '#df6a43',
  q: '#8f2f1c',
  e: '#fffaf0',
  m: '#8f4a3a',
  M: '#5a2a20',
  g: '#e39a7c',
  t: '#bfe3ef',
  T: '#ffffff',
  // The heckler: tweed and a ruddy face
  u: '#8a7a52',
  U: '#a8986a',
  v: '#5e5236',
  o: '#e8ae8a',
  O: '#c98a6a',
  // The caddie: a navy jacket, a grey beard, a green wool hat
  n: '#2f4a6b',
  N: '#4a6a8e',
  j: '#1f3350',
  x: '#9a948a',
  X: '#c8c2b6',
  y: '#5b6b3a',
  Y: '#7d8f52',
  z: '#3d4a26',
  // Your partner: a pink jumper, a tan bucket hat, a ginger moustache
  i: '#d66a7e',
  I: '#ec8e96',
  J: '#965a5a',
  b: '#c4aa78',
  B: '#dec896',
  G: '#967e56',
  L: '#b06230',
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

// The faces: brows, lids and eyes for both eyes at once, the near one large and the far
// one squeezed against the profile; then a mouth. Placed for a head centred at (23, 22)
const EYES: Record<Expr, string[]> = {
  calm: [
    '..........',
    '.hhhh..hh.',
    '..........',
    '.KKKK..KK.',
    '.eeKK..eK.',
    '.eeKK..eK.',
  ],
  // Squeezed shut, the brows dragged down to meet them
  wince: [
    '..........',
    '...hhh.h..',
    '.hh..hhh..',
    '..........',
    '.KKKKK.KK.',
    '..KKK...K.',
  ],
  // Wide, small pupils, the brows up and apart
  tense: [
    '.hhh...hh.',
    '.....h....',
    '.KKKK..KK.',
    '.eeee..ee.',
    '.eeKe..Ke.',
    '.eeee..ee.',
  ],
  // The lids half down, the brows easy
  settled: [
    '..........',
    '.hhhh..hh.',
    '..........',
    '..........',
    '.KKKK..KK.',
    '..eKK..eK.',
  ],
};
const MOUTH: Record<Expr, string[]> = {
  calm: ['.MMMM.'],
  wince: ['MMMMMM', 'MeeeeM', '.MMMM.'],
  tense: ['.M..M.', 'M.MM.M'],
  settled: ['M....M', '.MMMM.'],
};

const cache = new Map<string, HTMLCanvasElement>();

export function build(who: Who, expr: Expr): Grid {
  let g = blank();
  if (who === 'you') {
    body(g, 23, 38, 'r', 'R', 'q');
    // A white collar, open at the neck
    patch(g, 17, 36, ['ww.......ww', 'wWw.....wWw', '.wWw...wWw.', '..ww...ww..']);
    neck(g, 23, 32, 's', 'S');
    head(g, 23, 22, 's', 'S', 'l');
    // Hair at the back, under the cap
    for (let y = 15; y <= 22; y++) for (let x = 13; x <= 16 - Math.max(0, y - 19); x++) set(g, x, y, 'h');
    // The flat cap: a crown, a band, and a brim out over the eyes
    ellipse(g, 21, 12, 12.5, 5.5, (_x, y, nx) => (y < 9 && nx > -0.2 ? 'C' : nx < -0.6 ? 'd' : 'c'));
    for (let x = 9; x <= 33; x++) set(g, x, 15, 'd');
    patch(g, 29, 13, ['ccccccccc.', 'Ccccccccccc', 'dddddddddd']);
    for (let x = 12; x <= 24; x++) if (x % 3 === 0) set(g, x, 11, 'C');
  } else if (who === 'caddie') {
    body(g, 23, 38, 'n', 'N', 'j');
    patch(g, 19, 36, ['jj.....jj', '.jjj.jjj.', '...jjj...']);
    neck(g, 23, 32, 's', 'S');
    head(g, 23, 22, 's', 'S', 'l');
    // A grey beard round the jaw
    for (let y = 26; y <= 34; y++) for (let x = 15; x <= 32 - Math.max(0, y - 30) * 2; x++) if (g[y][x] === 's' || g[y][x] === 'S' || y >= 32) set(g, x, y, x > 26 ? 'X' : 'x');
    // A wool hat, ribbed, with a turned-up band
    ellipse(g, 22, 13, 11.5, 7.5, (x, y) => (y > 15 ? null : x % 2 ? 'y' : x > 26 ? 'Y' : 'z'));
    for (let x = 11; x <= 33; x++) {
      set(g, x, 15, x > 27 ? 'Y' : 'y');
      set(g, x, 16, 'z');
    }
  } else if (who === 'partner') {
    // Round and pink, a bucket hat, a moustache that does most of the talking
    body(g, 23, 38, 'i', 'I', 'J');
    patch(g, 19, 36, ['ww.....ww', '.wwJJJww.', '...JJJ...']);
    neck(g, 23, 32, 's', 'S');
    ellipse(g, 23, 23, 11.5, 12, (_x, _y, nx, ny) => (nx < -0.55 ? 'S' : nx > 0.45 && ny > -0.3 && ny < 0.3 ? 'l' : 's'));
    ellipse(g, 13, 24, 2.4, 3.4, (_x, _y, nx) => (nx > 0.2 ? 'S' : 's'));
    patch(g, 33, 22, ['s.', 'ss', 'ss', 'Ss']);
    // The hat: a crown and a soft brim all round
    ellipse(g, 22, 11, 9.5, 5, (x, y) => (y > 13 ? null : x > 26 ? 'B' : (x + y) % 4 === 0 ? 'G' : 'b'));
    for (let x = 9; x <= 36; x++) set(g, x, 14, x > 30 ? 'B' : 'b');
    for (let x = 10; x <= 35; x++) set(g, x, 15, 'G');
    patch(g, 24, 17, EYES[expr]);
    // Brows, bushy and ginger, over the eyes
    patch(g, 24, 17, ['.LLLL..LL.']);
    // The moustache, wide, over a mouth always half open
    patch(g, 25, 26, ['LLLLLLLLLL', '.LLLLLLLL.']);
    patch(g, 28, 28, expr === 'settled' ? ['M..M', '.MM.'] : ['MMMM', 'MeeM', '.MM.']);
    return outline(g);
  } else {
    // The heckler: a tweed hat, a ruddy face, a mouth open on the second word
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
  // The brim's shadow across the brow
  if (who === 'you') for (let x = 17; x <= 32; x++) if (g[17][x] === "s" || g[17][x] === "l") set(g, x, 17, "S");
  patch(g, 24, 17, EYES[expr]);
  // The nose's shadow, on the far side of it
  set(g, 32, 25, 'S');
  set(g, 32, 24, 'S');
  patch(g, 27, who === 'caddie' ? 28 : 29, MOUTH[expr]);
  // A bead of sweat at the temple, when it's tense
  if (expr === 'tense') patch(g, 17, 15, ['.t.', 'tTt', 'ttt', '.t.']);
  // A little colour in the cheek, when it's settled
  if (expr === 'settled' && who === 'you') patch(g, 30, 25, ['gg']);
  g = outline(g);
  return g;
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
  const grid = build(who, expr);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const ch = grid[y][x];
      if (ch === '.') continue;
      g.fillStyle = PAL[ch] ?? '#ff00ff';
      g.fillRect(flip ? N - 1 - x : x, y, 1, 1);
    }
  cache.set(key, c);
  return c;
}

export const EXPRS: Expr[] = ['calm', 'wince', 'tense', 'settled'];
