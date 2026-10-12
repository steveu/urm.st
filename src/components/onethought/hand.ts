// The cast, hand-placed: each portrait laid down pixel by pixel as rows of colour keys,
// the way the courtroom games' sprites are, rather than built up from shapes. A figure is
// a jacket under a head; the head moves a pixel against the jacket for a pose's second
// frame, and an expression is a patch over the brows and eyes and another over the mouth,
// so the rest of the face never shifts.
//
// Drawn as they stand on the stage, lit from the right, where the low sun is; mirrored
// only if asked to face the other way. Flat tones, three or four to a material, a dark
// line round the skin and the hair, no gradients and no noise.

import type { Face, Mouth } from './cast';

type Patch = [number, number, string];

// ---------------------------------------------------------------------------------------
// The caddie: a wool hat, a grey beard with a full moustache over the lip, a navy jacket
// zipped to a stood-up collar. Turned a touch towards you, on the left

const CADDIE_PAL: Record<string, string> = {
  // skin, shadow to light, and its line
  K: '#2e1a12', 1: '#a8664a', 2: '#d48e66', 3: '#eeb48a', 4: '#f8d2a8',
  // grey hair, dark to light, and its line
  G: '#36312c', 5: '#5e5a54', 6: '#8a857b', 7: '#b8b2a5', 8: '#e2dbcb', 9: '#f6f0e2',
  // the hat
  B: '#141a0c', b: '#26301a', c: '#3e4c28', d: '#5c6c3a', e: '#7e9052',
  // eyes, mouth, lip, teeth, sweat
  W: '#efe6d4', I: '#241a14', M: '#4a1c18', L: '#b06a50', T: '#f0e6d2', w: '#bfe3ef', x: '#ffffff',
  // the jacket, its line, the jumper under it
  J: '#0a1020', s: '#16223a', t: '#24385a', u: '#36547c', v: '#5a7aa0', N: '#4a463e',
};

const CADDIE_HEAD: Patch[] = [
  [16, 0, 'BBBBBBBBBBBBBBBB'],
  [13, 1, 'BBBcccccccddddddeedBBB'],
  [11, 2, 'BBbccccccccdddddddddeeedBB'],
  [9, 3, 'BBbbcccccccccddddddddddeeeddBB'],
  [8, 4, 'BbbccccccccccddddddddddddeeddddB'],
  [7, 5, 'BbbbccccccccccddddddddddddeedddddB'],
  [7, 6, 'BbbbcccccccccccddddddddddddddddddB'],
  [6, 7, 'BbbbbcccccccccccdddddddddddddddddddB'],
  [6, 8, 'BbbbbbcccccccccccccddddddddddddddddB'],
  [5, 9, 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'],
  [5, 10, 'BbcbcbcbcbcbccdcdcdcdcdcddedededededdB'],
  [5, 11, 'BbcbcbcbcbcbccdcdcdcdcdcddedededededdB'],
  [5, 12, 'BbcbcbcbcbcbccdcdcdcdcdcddedededededdB'],
  [5, 13, 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'],
  [8, 14, 'K111111111111111222222222222222K'],
  [8, 15, 'K122222222222223333333333333333K'],
  [8, 16, 'K122222222222333333333333333333K'],
  [8, 17, 'K126555555522233335555556633333K'],
  [8, 18, 'K122555555522233335555555333333K'],
  [8, 19, 'K122KKKKKK2213333KKKKKK33333333K'],
  [8, 20, 'K122KWIIW22113333WIIWWK33333333K'],
  [8, 21, 'K562211112211333322222333333376K'],
  [8, 22, 'K566222222211333333333333344376K'],
  [8, 23, 'K566622222211133333333333344776K'],
  [8, 24, 'K566662222211144333333333347776K'],
  [8, 25, 'K56666622221K113333333333477776K'],
  [8, 26, 'K566666222111111122233333477777K'],
  [7, 27, 'G56666788888888888888888777777776G'],
  [7, 28, 'G56667888889999999999888877777776G'],
  [7, 29, 'G56677888888887888888888877777776G'],
  [7, 30, 'G56788887777777777777888887777776G'],
  [7, 31, 'G5788755555MMMMMMM555557888777776G'],
  [7, 32, 'G56776666666LLLLL7777777777777776G'],
  // the near ear, out past the sideburn
  [40, 19, 'KK'], [40, 20, '34K'], [40, 21, '13K'], [40, 22, '13K'], [40, 23, '23K'], [40, 24, '3K'], [40, 25, 'K'],
];

// The beard under the moustache: its outline by row, then strands down it, lit on the
// right, a pixel's wave every few rows, darker at its foot
const BEARD_SPAN: [number, number][] = [[7, 40], [7, 40], [8, 39], [8, 39], [9, 38], [10, 37], [11, 36], [13, 34], [15, 32], [17, 30], [20, 27]];
const STRANDS = [10, 13, 17, 20, 24, 27, 30, 34, 37];
const CADDIE_BEARD: Patch[] = BEARD_SPAN.map(([a, b], i) => {
  const y = 33 + i;
  let s = '';
  for (let x = a; x <= b; x++) {
    if (x === a || x === b || i === BEARD_SPAN.length - 1) {
      s += 'G';
      continue;
    }
    const base = x < 13 ? 5 : x < 19 ? 6 : x < 31 ? 7 : 8;
    const sx = x - ((y >> 2) & 1);
    const strand = STRANDS.includes(sx) ? -1 : STRANDS.includes(sx - 1) && x > 22 && y < 38 ? 1 : 0;
    s += String(Math.max(5, Math.min(9, base + strand + (y >= 41 ? -1 : 0))));
  }
  return [a, y, s];
});

// Brows and eyes by expression, over the head (left eye x12 to 17, right x25 to 30,
// the lid on row 19, the eye on 20)
const CADDIE_FACE: Record<Face, Patch[]> = {
  normal: [],
  // brows up a row, the eyes shut in two arcs
  pleased: [
    [12, 16, '5555555'], [26, 16, '55555566'], [12, 18, '2222222'], [26, 18, '3333333'],
    [12, 19, '2KKKK2'], [25, 19, '3KKKK3'], [12, 20, 'K2222K'], [25, 20, 'K3333K'], [12, 21, '222222'], [25, 21, '33333'],
    [18, 31, '5MMMMM5'],
  ],
  // brows high, the eyes wide with the pupils small in them, the mouth open
  shocked: [
    [12, 15, '5555555'], [26, 15, '55555566'], [11, 17, '22222222'], [26, 17, '33333333'], [12, 18, '2222222'], [26, 18, '3333333'],
    [12, 20, 'KWWIWK'], [25, 20, 'WWIWWK'], [12, 21, 'KWWWWK'], [25, 21, 'KWWWWK'], [13, 22, '1111'], [26, 22, '2222'],
    [18, 31, 'MMMMMMM'], [19, 32, 'MMMMM'],
  ],
  // one brow up, the other slanting down to the nose, the eyes off to the side, the
  // mouth to one side
  thinking: [
    [12, 16, '5555555'], [12, 18, '2222222'], [26, 17, '55533333'], [26, 18, '5555555'],
    [13, 20, 'IIWW'], [25, 20, 'IIWWW'],
    [18, 31, '555MMMM'],
  ],
  // brows down hard at the middle, the mouth wide
  shout: [
    [11, 17, '25555555'], [11, 18, '22255555'], [26, 17, '5555553'], [26, 18, '55553333'],
    [17, 31, 'MMMMMMMMM'], [18, 32, 'MTTTTTM'],
  ],
};
const CADDIE_BLINK: Patch[] = [[12, 19, '222222'], [25, 19, '333333'], [12, 20, '2KKKK2'], [25, 20, '3KKKK3']];
const CADDIE_TALK: Record<1 | 2, Patch[]> = {
  1: [[18, 31, 'MMMMMMM'], [19, 32, 'MMMMM'], [19, 33, 'LLLLL']],
  2: [[17, 31, 'MMMMMMMMM'], [18, 32, 'MMMMMMM'], [19, 33, 'MTTTM'], [19, 34, 'LLLLL']],
};
// Caught out: a bead of sweat at the temple, falling a little on the second frame
const SWEAT: Patch[] = [[5, 0, '.w.'], [5, 1, 'wwx'], [5, 2, 'www'], [5, 3, '.w.']];

// The head's move for a pose's second frame (and its rest for some faces), in pixels
const CADDIE_POSE: Record<Face, [[number, number], [number, number]]> = {
  normal: [[0, 0], [0, 0]],
  pleased: [[0, 1], [0, 0]],
  shocked: [[1, -1], [2, -1]],
  thinking: [[-1, 1], [-1, 2]],
  shout: [[0, 0], [0, -1]],
};

// ---------------------------------------------------------------------------------------
// The jacket: sloped shoulders, a stood-up collar leaning in, the zip

function caddieJacket(): string[][] {
  const g = Array.from({ length: 114 }, () => Array<string>(80).fill('.'));
  const put = (x: number, y: number, s: string) => [...s].forEach((ch, i) => {
    if (y >= 0 && y < g.length && x + i >= 0 && x + i < 80) g[y][x + i] = ch;
  });
  const edge: [number, number, number][] = [[40, 26, 55], [42, 20, 61], [44, 15, 66], [46, 11, 70], [48, 8, 73], [50, 6, 75], [53, 5, 76], [57, 4, 77]];
  for (let y = 38; y < g.length; y++) {
    let r: [number, number] | null = null;
    for (const [yy, a, b] of edge) if (y >= yy) r = [a, b];
    if (!r) continue;
    for (let x = r[0]; x <= r[1]; x++) {
      const u = (x - r[0]) / (r[1] - r[0]);
      g[y][x] = x === r[0] || x === r[1] ? 'J' : u < 0.3 ? 's' : u < 0.72 ? 't' : 'u';
    }
    if (y < 52) for (let k = 1; k < 4; k++) g[y][r[1] - k] = k === 1 ? 'u' : 'v';
  }
  for (let y = 33; y < 50; y++) {
    const l = 22 + Math.floor((y - 33) * 0.4);
    const r = 57 - Math.floor((y - 33) * 0.4);
    put(l - 3, y, 'J');
    put(l - 2, y, 'sstt');
    put(l + 2, y, 'J');
    put(r - 2, y, 'J');
    put(r - 1, y, 'uuvv');
    put(r + 3, y, 'J');
    for (let x = l + 3; x < r - 2; x++) g[y][x] = 'N';
  }
  for (let y = 49; y < g.length; y++) put(39, y, 'Jv');
  return g;
}

// ---------------------------------------------------------------------------------------
// Onto the plate

/** Where the figure sits on the plate: the jacket's top left, and the head's against it */
const AT = { x: 24, y: 30 };
const HEAD_AT = { x: 16, y: 0 };

let jacket: string[][] | null = null;

/** One frame of the caddie on a plate w by h, flipped if asked */
export function caddieFrame(w: number, h: number, f: Face, frame: 0 | 1, blink: boolean, mouth: Mouth, flip: boolean): HTMLCanvasElement {
  jacket ??= caddieJacket();
  const g = jacket.map((r) => r.slice());
  const [dx, dy] = CADDIE_POSE[f][frame];
  const put = (x: number, y: number, s: string) => [...s].forEach((ch, i) => {
    const yy = y + HEAD_AT.y + dy;
    const xx = x + i + HEAD_AT.x + dx;
    if (ch !== '.' && yy >= 0 && yy < g.length && xx >= 0 && xx < 80) g[yy][xx] = ch;
  });
  for (const [x, y, s] of [...CADDIE_HEAD, ...CADDIE_BEARD, ...CADDIE_FACE[f]]) put(x, y, s);
  if (blink && f !== 'pleased') for (const [x, y, s] of CADDIE_BLINK) put(x, y, s);
  if (mouth > 0) for (const [x, y, s] of CADDIE_TALK[mouth as 1 | 2]) put(x, y, s);
  if (f === 'shocked') for (const [x, y, s] of SWEAT) put(x, y + 15 + frame * 2, s);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const cg = c.getContext('2d')!;
  g.forEach((row, y) =>
    row.forEach((ch, x) => {
      const col = CADDIE_PAL[ch];
      if (!col) return;
      cg.fillStyle = col;
      const px = AT.x + x;
      cg.fillRect(flip ? px : w - 1 - px, AT.y + y, 1, 1);
    }),
  );
  return c;
}

/** The caddie's head on the plate, hat to beard, as drawn or mirrored */
export function caddieHead(w: number, flip: boolean): { x: number; y: number; w: number; h: number } {
  const x = AT.x + HEAD_AT.x + 5;
  const hw = 38;
  return { x: flip ? x : w - x - hw, y: AT.y + HEAD_AT.y, w: hw, h: 44 };
}
