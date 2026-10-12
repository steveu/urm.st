// The cast, hand-placed: each portrait laid down pixel by pixel as rows of colour keys,
// the way the courtroom games' sprites are, rather than built up from shapes. A figure is
// a jacket under a head; the head moves a pixel against the jacket for a pose's second
// frame, and an expression is a patch over the brows and eyes and another over the mouth,
// so the rest of the face never shifts.
//
// Drawn as they stand on the stage, lit from the right, where the low sun is; mirrored
// only if asked to face the other way. Flat tones, three or four to a material, a dark
// line round the skin and the hair, no gradients and no noise.

import type { Actor, Face, Mouth } from './cast';

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
  // brows up, the eyes wide with the pupils small in them, the mouth open
  shocked: [
    [12, 16, '5555555'], [26, 16, '55555566'], [12, 18, '2222222'], [26, 18, '3333333'],
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
// You: a flat cap, brown hair, a red jumper with a white collar in its V, the bag's strap
// across it. Built like your partner, turned a touch, but the other way, towards them;
// still lit from the right, so the near cheek is in the shade and the far one in the sun

const YOU_PAL: Record<string, string> = {
  K: '#2e1a12', 0: '#bd7a56', 1: '#a8664a', 2: '#d48e66', 3: '#eeb48a', 4: '#f8d2a8',
  H: '#22160e', h: '#47331f', j: '#664a30',
  // the cap, brown tweed, darker under its peak
  C: '#241a10', c: '#4a3a28', d: '#6a5438', e: '#8a7050', f: '#a88c64', k: '#2e2416',
  R: '#2e0a06', r: '#5a1a12', s: '#8c2c1a', t: '#bc4228', u: '#de6a42',
  Q: '#5e5646', q: '#cec4ae', o: '#ebe3ce', O: '#fbf6ea',
  Z: '#1a0e06', z: '#4e3018', y: '#7a5230',
  W: '#efe6d4', I: '#241a14', M: '#5a2420', L: '#b06a50', T: '#f0e6d2', w: '#bfe3ef', x: '#ffffff',
};

/** A blank grid w by h, and a way to write rows of keys into it */
function grid(w: number, h: number): [string[][], (x: number, y: number, s: string) => void] {
  const g = Array.from({ length: h }, () => Array<string>(w).fill('.'));
  const put = (x: number, y: number, s: string) =>
    [...s].forEach((ch, i) => {
      if (ch !== '.' && y >= 0 && y < h && x + i >= 0 && x + i < w) g[y][x + i] = ch;
    });
  return [g, put];
}
/** A grid's rows as patches, the empty pixels left out */
const rows = (g: string[][]): Patch[] => g.map((r, y) => [0, y, r.join('')] as Patch);

function youBody(): string[][] {
  const [g, put] = grid(80, 114);
  // The jumper's shoulders, lit on the right
  const edge: [number, number, number][] = [[40, 24, 57], [42, 18, 63], [44, 13, 68], [46, 10, 71], [48, 7, 74], [51, 5, 76], [55, 4, 77]];
  for (let y = 38; y < g.length; y++) {
    let r: [number, number] | null = null;
    for (const [yy, a, b] of edge) if (y >= yy) r = [a, b];
    if (!r) continue;
    for (let x = r[0]; x <= r[1]; x++) {
      const u = (x - r[0]) / (r[1] - r[0]);
      g[y][x] = x === r[0] || x === r[1] ? 'R' : u < 0.25 ? 'r' : u < 0.62 ? 's' : u < 0.9 ? 't' : 'u';
    }
  }
  // The neck, in the chin's shade at the top
  for (let y = 33; y < 46; y++) for (let x = 31; x <= 48; x++) g[y][x] = x === 31 || x === 48 ? 'K' : x < 35 ? '1' : y < 38 ? '0' : x > 44 ? '3' : '2';
  // The V, a white shirt in it, its trim lit
  for (let y = 44; y < 58; y++) {
    const l = 31 + Math.floor((y - 44) * 0.7);
    const rr = 48 - Math.floor((y - 44) * 0.7);
    if (l >= rr) break;
    for (let x = l; x <= rr; x++) g[y][x] = x === l || x === rr ? 'R' : x === l + 1 || x === rr - 1 ? 'u' : x < 39 ? 'o' : 'O';
  }
  // The shirt's collar, either side of the neck, over the V
  for (const [x, y, s] of [
    [28, 39, 'QQQQ'], [27, 40, 'QqqqQ'], [26, 41, 'QqqqqQ'], [26, 42, 'QqqqooQ'], [27, 43, 'QqooooQ'], [29, 44, 'QQooOQ'], [32, 45, 'QQQ'],
    [48, 39, 'QQQQ'], [48, 40, 'QoOOQ'], [48, 41, 'QooOOQ'], [47, 42, 'QoooOOQ'], [46, 43, 'QooooOQ'], [46, 44, 'QOooQQ'], [45, 45, 'QQQ'],
  ] as Patch[]) put(x, y, s);
  // The strap, from the far shoulder down across the chest
  for (let y = 41; y < g.length; y++) put(64 - Math.floor((y - 41) * 0.6), y, 'ZzyyZ');
  return g;
}

const YOU_HEAD_ROWS: Patch[] = [
  [8, 12, 'K111111111111111111111111111111K'],
  [8, 13, 'K122222222222222233333333333333K'],
  [8, 14, 'K122222222222222222333333333333K'],
  [8, 15, 'K12222hhHHHHHH2222333HHHHHHHh33K'],
  [8, 16, 'K122222HHHHHHH2222333HHHHHHH333K'],
  [8, 17, 'K12222222KKKKKK2223333KKKKKK333K'],
  [8, 18, 'K12222222KWWIIW21133333WIIWK333K'],
  [8, 19, 'K122222222111122113333332222333K'],
  [8, 20, 'K122222222222222113333333333333K'],
  [8, 21, 'K122222222222222113333333333333K'],
  [8, 22, 'K122222222222222114433333333333K'],
  [8, 23, 'K1222222222222221K1113333333333K'],
  [8, 24, 'K122222222222211111111133333333K'],
  [8, 25, 'K122222222222222111133333333333K'],
  [8, 26, 'K122222222222222333333333333333K'],
  [9, 27, 'K12222222222222222222333333333K'],
  [9, 28, 'K1222222222222MMMMMMM33333333K'],
  [10, 29, 'K1222222222222LLLLL333333333K'],
  [11, 30, 'K1222222222222222233333333K'],
  [12, 31, 'K122222222223333333333333K'],
  [13, 32, 'K1222222222333333333333K'],
  [15, 33, 'K1222222233344433333K'],
  [17, 34, 'K1222223333333333K'],
  [19, 35, 'K122233333333K'],
  [21, 36, 'K11111111K'],
  [23, 37, 'KKKKKKK'],
];

function youHead(): Patch[] {
  const [g, put] = grid(48, 40);
  for (const [x, y, s] of YOU_HEAD_ROWS) put(x, y, s);
  // Brown hair under the cap: over the near ear and down to a sideburn, a little at the far side
  for (const [x, y, s] of [
    [5, 12, 'Hhhh'], [5, 13, 'Hhhhhh'], [5, 14, 'Hhhhhh'], [6, 15, 'Hhhhh'], [6, 16, 'Hhhh'], [7, 17, 'Hh'],
    [9, 17, 'hh'], [9, 18, 'hh'], [9, 19, 'hh'], [9, 20, 'h'],
    [38, 12, 'hjH'], [38, 13, 'jH'], [39, 14, 'H'],
  ] as Patch[]) put(x, y, s);
  // The near ear
  for (const [x, y, s] of [[5, 17, 'KK'], [4, 18, 'K23'], [4, 19, 'K12'], [4, 20, 'K12'], [4, 21, 'K22'], [5, 22, 'K2'], [6, 23, 'K']] as Patch[]) put(x, y, s);
  // The flat cap: a wide crown pulled forward over a short peak, three flat tones, no
  // more
  const CROWN: [number, number][] = [[14, 32], [10, 36], [8, 39], [6, 41], [5, 42], [5, 43], [5, 44], [5, 44]];
  CROWN.forEach(([a, b], i) => {
    const y = i + 2;
    for (let x = a; x <= b; x++) {
      const u = (x - a) / (b - a);
      g[y][x] = x === a || x === b || y === 2 ? 'C' : u < 0.25 ? 'c' : u < 0.62 ? 'd' : u < 0.9 || y > 4 ? 'e' : 'f';
    }
  });
  // where the crown overhangs the peak, a line; the band round the back
  for (let x = 5; x <= 44; x++) g[9][x] = x < 22 ? (x === 5 ? 'C' : 'c') : 'C';
  for (let x = 5; x <= 21; x++) g[10][x] = x === 5 ? 'C' : x < 9 ? 'c' : 'd';
  for (let x = 6; x <= 21; x++) g[11][x] = 'C';
  // the peak, its top catching the light, dark under it
  for (let x = 22; x <= 45; x++) g[10][x] = x === 22 || x === 45 ? 'C' : x > 38 ? 'f' : 'e';
  for (let x = 21; x <= 44; x++) g[11][x] = x === 21 || x === 44 ? 'C' : 'k';
  for (let x = 22; x <= 42; x++) g[12][x] = 'C';
  return rows(g);
}

const YOU_FACE: Record<Face, Patch[]> = {
  normal: [],
  pleased: [
    [29, 14, 'HHHHHHH'], [14, 14, 'hhHHHHHH'], [29, 16, '3333333'], [15, 16, '2222222'], [30, 17, '3KKKK3'], [17, 17, '2KKKK2'], [30, 18, 'K3333K'], [17, 18, 'K2222K'], [30, 19, '333333'], [18, 19, '22222'],
    [22, 27, 'M'], [30, 27, 'M'],
  ],
  shocked: [
    [29, 14, 'HHHHHHH'], [14, 14, 'hhHHHHHH'], [29, 16, '3333333'], [15, 16, '2222222'], [30, 18, 'KWIWWK'], [17, 18, 'KWWIWW'], [30, 19, 'KWWWWK'], [17, 19, 'KWWWWK'], [31, 20, '2222'], [18, 20, '1111'],
    [23, 28, '2MMMMM3'], [24, 29, 'MMMMM'], [25, 30, 'LLL'],
  ],
  thinking: [
    [29, 14, 'HHHHHHH'], [29, 16, '3333333'], [14, 15, '22222HHH'], [15, 16, 'HHHHHHH'], [31, 18, 'WWII'], [18, 18, 'WWWII'],
    [23, 28, '222MMMM'], [24, 29, '22LLL'],
  ],
  shout: [
    [29, 15, 'HHHHHHH3'], [29, 16, 'HHHHH333'], [15, 15, '2HHHHHH'], [14, 16, '2222HHHH'],
    [22, 27, 'LLLLLLLLL'], [22, 28, 'MTTTTTTTM'], [22, 29, 'MMMMMMMMM'], [23, 30, 'MMMMMMM'], [24, 31, 'LLLLL'],
  ],
};
const YOU_BLINK: Patch[] = [[30, 17, '333333'], [17, 17, '222222'], [30, 18, '3KKKK3'], [17, 18, '2KKKK2']];

// ---------------------------------------------------------------------------------------
// Your partner: a bucket hat, ginger hair and a ginger moustache sweeping off the lip,
// rosy in the cheek, a pink cable jumper with a white polo collar. Turned a touch towards
// you, like the caddie

const PARTNER_PAL: Record<string, string> = {
  K: '#2e1a12', 0: '#bd7a56', 1: '#a8664a', 2: '#d48e66', 3: '#eeb48a', 4: '#f8d2a8', p: '#e0806a',
  G: '#3c1a0a', 5: '#7a3a16', 6: '#a85a26', 7: '#d08240', 8: '#eca85e',
  B: '#463820', b: '#6a5636', c: '#927a52', d: '#bea474', e: '#dcc492', m: '#4a3a22', n: '#64502e',
  J: '#4a1a28', s: '#783246', t: '#a64e68', u: '#d4687c', v: '#ea8c96',
  Q: '#6e6656', q: '#cec4ae', o: '#ebe3ce', O: '#fbf6ea',
  W: '#efe6d4', I: '#241a14', M: '#4a1c18', L: '#b06a50', T: '#f0e6d2', w: '#bfe3ef', x: '#ffffff',
};

const PARTNER_HEAD: Patch[] = [
  // the bucket hat: a crown, a band, the brim all round
  [14, 0, 'BBBBBBBBBBBBBBBBBBBB'],
  [12, 1, 'BBbbcccccdddddddddeeddBB'],
  [11, 2, 'BbbccccccddddddddddeeeeddB'],
  [11, 3, 'BbbccccccdddddddddddeeeddB'],
  [10, 4, 'BbbbcccccccdddddddddddeeeddB'],
  [10, 5, 'BbbbcccccccdddddddddddddddddB'],
  [10, 6, 'BmmmmmmmmnnnnnnnnnnnnnnnnnnB'],
  [10, 7, 'BmmmmmmmmnnnnnnnnnnnnnnnnnnB'],
  [4, 8, 'BBbbbccccccccccdddddddddddddddeeeeeeddBB'],
  [2, 9, 'BbbbbcccccccccccddddddddddddddddeeeeeeeedddB'],
  [2, 10, 'BbbbbbbbbbccccccccccccccccccccccccccccddddddB'],
  [3, 11, 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'],
  // the face, in the brim's shade at the top
  [8, 12, 'K111111111111111222222222222222K'],
  [8, 13, 'K122222222222223333333333333333K'],
  [8, 14, 'K122222222222333333333333333333K'],
  [8, 15, 'K126555555522233335555556633333K'],
  [8, 16, 'K122555555522233335555555333333K'],
  [8, 17, 'K122KKKKKK2213333KKKKKK33333333K'],
  [8, 18, 'K122KWIIW22113333WIIWWK33333333K'],
  [8, 19, 'K122211112211333322222333333333K'],
  [8, 20, 'K12pp22222211333333333333pp4333K'],
  [8, 21, 'K12pp22222211133333333333pp4333K'],
  [8, 22, 'K122222222211144333333333343333K'],
  [8, 23, 'K12222222221K113333333333433333K'],
  [8, 24, 'K122222222111111122233333433333K'],
  // the moustache, off the lip and down at its ends, the mouth under it
  [8, 25, 'K222225667777777777888853333333K'],
  [8, 26, 'K222256677777777788888875333333K'],
  [8, 27, 'K222566677777577778888877533333K'],
  [8, 28, 'K22566775MMMMMMMM57788877533333K'],
  [8, 29, 'K2566752222LLLLL333335788533333K'],
  [8, 30, 'K125222222211111333333333333333K'],
  // ginger at the temples, under the brim
  [5, 12, 'G66'], [5, 13, 'G665'], [6, 14, 'G6'], [7, 15, 'G'],
  [39, 12, '78G'], [40, 13, '78G'], [40, 14, '7G'], [40, 15, 'G'],
  // the near ear
  [40, 17, 'KK'], [40, 18, '34K'], [40, 19, '13K'], [40, 20, '13K'], [40, 21, '23K'], [40, 22, '3K'], [40, 23, 'K'],
];
// The jaw and the chin, round, lit on the right, the chin's light
const PARTNER_JAW: Patch[] = ([[8, 39], [9, 38], [10, 37], [11, 35], [13, 33], [16, 30], [19, 27]] as [number, number][]).map(([a, b], i) => {
  const y = 31 + i;
  let s = '';
  for (let x = a; x <= b; x++) {
    if (x === a || x === b || i === 6) s += 'K';
    else if (i === 5) s += '1';
    else if (i === 3 && x >= 24 && x <= 26) s += '4';
    else s += x < a + 2 ? '1' : x < 21 ? '2' : '3';
  }
  return [a, y, s];
});

function partnerBody(): string[][] {
  const [g, put] = grid(80, 114);
  const edge: [number, number, number][] = [[40, 24, 57], [42, 18, 63], [44, 13, 68], [46, 10, 71], [48, 7, 74], [51, 5, 76], [55, 4, 77]];
  const TONES = ['s', 't', 'u', 'v'];
  for (let y = 38; y < g.length; y++) {
    let r: [number, number] | null = null;
    for (const [yy, a, b] of edge) if (y >= yy) r = [a, b];
    if (!r) continue;
    for (let x = r[0]; x <= r[1]; x++) {
      const u = (x - r[0]) / (r[1] - r[0]);
      if (x === r[0] || x === r[1]) {
        g[y][x] = 'J';
        continue;
      }
      // The cables: two twisting lines every so far, a tone down where they cross
      let k = u < 0.3 ? 0 : u < 0.72 ? 1 : 2;
      const a = (x + (y >> 1)) % 9;
      const b = (x - (y >> 1) + 90) % 9;
      if (a === 0 || b === 0) k = Math.max(0, k - 1);
      else if (k === 2 && (a === 1 || b === 1)) k = 3;
      g[y][x] = TONES[k];
    }
  }
  // The neck, in the chin's shade at the top
  for (let y = 33; y < 44; y++) for (let x = 31; x <= 48; x++) g[y][x] = x === 31 || x === 48 ? 'K' : x < 35 ? '1' : y < 38 ? '0' : x > 44 ? '3' : '2';
  // The polo's collar, two flaps either side of the neck, the placket down from it
  for (const [x, y, s] of [
    [28, 39, 'QQQQ'], [27, 40, 'QqqqQ'], [26, 41, 'QqqqqQ'], [26, 42, 'QqqqooQ'], [27, 43, 'QqooooQ'], [29, 44, 'QQooOQ'], [32, 45, 'QQQ'],
    [48, 39, 'QQQQ'], [48, 40, 'QoOOQ'], [48, 41, 'QooOOQ'], [47, 42, 'QoooOOQ'], [46, 43, 'QooooOQ'], [46, 44, 'QOooQQ'], [45, 45, 'QQQ'],
  ] as Patch[]) put(x, y, s);
  for (let y = 44; y < 54; y++) put(37, y, y === 47 || y === 51 ? 'JQQJ' : 'JoOJ');
  return g;
}

// The partner's eyes sit two rows higher than the caddie's, the mouth at row 28
const lift = (ps: Patch[], dy: number): Patch[] => ps.map(([x, y, s]) => [x, y + dy, s]);
const PARTNER_MOUTH: Record<Face, Patch[]> = {
  normal: [],
  pleased: [[17, 28, '5MMMMMM5'], [19, 29, 'LLLLL']],
  shocked: [[17, 28, 'MMMMMMMM'], [18, 29, 'MMMMMM'], [19, 30, 'LLLLL']],
  thinking: [[17, 28, '555MMMMM']],
  shout: [[17, 28, 'MMMMMMMM'], [17, 29, 'MTTTTTTM'], [18, 30, 'MMMMMM'], [19, 31, 'LLLL']],
};

// ---------------------------------------------------------------------------------------
// Onto the plate

type Fig = {
  pal: Record<string, string>;
  /** Facing right as drawn */
  right: boolean;
  body: () => string[][];
  head: () => Patch[];
  face: Record<Face, Patch[]>;
  blink: Patch[];
  talk: Record<1 | 2, Patch[]>;
  /** The head's place for each face at rest and on its second frame, against the body */
  pose: Record<Face, [[number, number], [number, number]]>;
  sweat: [number, number];
  /** The head, hat to chin, on the head's own grid */
  box: { x: number; y: number; w: number; h: number };
};

const FIGS: Record<Actor, Fig> = {
  you: {
    pal: YOU_PAL,
    right: true,
    body: youBody,
    head: youHead,
    face: YOU_FACE,
    blink: YOU_BLINK,
    talk: {
      1: [[23, 28, 'MMMMMMM'], [24, 29, 'MMMMM'], [24, 30, 'LLLLL']],
      2: [[23, 28, 'MMMMMMM'], [23, 29, 'MTTTTTM'], [24, 30, 'MMMMM'], [24, 31, 'LLLLL']],
    },
    pose: { normal: [[0, 0], [0, 0]], pleased: [[0, -1], [0, 0]], shocked: [[-1, -1], [-1, -2]], thinking: [[1, 1], [1, 2]], shout: [[0, 0], [1, -1]] },
    sweat: [40, 13],
    box: { x: 4, y: 2, w: 42, h: 36 },
  },
  caddie: {
    pal: CADDIE_PAL,
    right: false,
    body: caddieJacket,
    head: () => [...CADDIE_HEAD, ...CADDIE_BEARD],
    face: CADDIE_FACE,
    blink: CADDIE_BLINK,
    talk: CADDIE_TALK,
    pose: CADDIE_POSE,
    sweat: [5, 15],
    box: { x: 5, y: 0, w: 38, h: 44 },
  },
  partner: {
    pal: PARTNER_PAL,
    right: false,
    body: partnerBody,
    head: () => [...PARTNER_HEAD, ...PARTNER_JAW],
    face: {
      normal: [],
      pleased: [...lift(CADDIE_FACE.pleased.filter(([, y]) => y < 30), -2), ...PARTNER_MOUTH.pleased],
      shocked: [...lift(CADDIE_FACE.shocked.filter(([, y]) => y < 30), -2), ...PARTNER_MOUTH.shocked],
      thinking: [...lift(CADDIE_FACE.thinking.filter(([, y]) => y < 30), -2), ...PARTNER_MOUTH.thinking],
      shout: [...lift(CADDIE_FACE.shout.filter(([, y]) => y < 30), -2), ...PARTNER_MOUTH.shout],
    },
    blink: lift(CADDIE_BLINK, -2),
    talk: {
      1: [[17, 28, 'MMMMMMMM'], [18, 29, 'MMMMMM'], [19, 30, 'LLLLL']],
      2: [[17, 28, 'MMMMMMMM'], [17, 29, 'MMMMMMMM'], [18, 30, 'MTTTTM'], [19, 31, 'LLLLL']],
    },
    pose: { normal: [[0, 0], [0, 0]], pleased: [[0, -1], [0, 0]], shocked: [[1, -1], [1, -2]], thinking: [[-1, 1], [-1, 2]], shout: [[0, 0], [0, -1]] },
    sweat: [5, 13],
    box: { x: 2, y: 0, w: 44, h: 38 },
  },
};

/** The figures are drawn at the board's own pixel, on a plate cut at the collar: the box at
 *  the foot of the frame covers the rest */
const SCALE = 1;
const GRID_W = 80;
const GRID_H = 90;
export const PLATE_W = GRID_W * SCALE;
export const PLATE_H = GRID_H * SCALE;
/** Where the head sits against the body */
const HEAD_AT = { x: 16, y: 0 };

const built = new Map<string, { body: string[][]; head: Patch[] }>();

/** A figure laid out as keys on its grid: the body, the head on it in its pose, the face */
function compose(who: Actor, f: Face, frame: 0 | 1, blink: boolean, mouth: Mouth): string[][] {
  const fig = FIGS[who];
  let b = built.get(who);
  if (!b) {
    b = { body: fig.body(), head: fig.head() };
    built.set(who, b);
  }
  const g = b.body.slice(0, GRID_H).map((r) => r.slice());
  const [dx, dy] = fig.pose[f][frame];
  const put = (x: number, y: number, s: string) =>
    [...s].forEach((ch, i) => {
      const yy = y + HEAD_AT.y + dy;
      const xx = x + i + HEAD_AT.x + dx;
      if (ch !== '.' && yy >= 0 && yy < g.length && xx >= 0 && xx < GRID_W) g[yy][xx] = ch;
    });
  for (const [x, y, s] of [...b.head, ...fig.face[f]]) put(x, y, s);
  if (blink && f !== 'pleased' && f !== 'shout') for (const [x, y, s] of fig.blink) put(x, y, s);
  if (mouth > 0 && f !== 'shout') for (const [x, y, s] of fig.talk[mouth as 1 | 2]) put(x, y, s);
  if (f === 'shocked') for (const [x, y, s] of SWEAT) put(x + fig.sweat[0] - 5, y + fig.sweat[1] + frame * 2, s);
  return g;
}

/** One frame of a figure; flip to face left */
export function handFrame(who: Actor, f: Face, frame: 0 | 1, blink: boolean, mouth: Mouth, flip: boolean): HTMLCanvasElement {
  const fig = FIGS[who];
  const g = compose(who, f, frame, blink, mouth);
  const c = document.createElement('canvas');
  c.width = PLATE_W;
  c.height = PLATE_H;
  const cg = c.getContext('2d')!;
  // Mirrored when asked to face the other way from the way they're drawn
  const mirror = fig.right === flip;
  g.forEach((row, y) =>
    row.forEach((ch, x) => {
      const col = fig.pal[ch];
      if (!col) return;
      cg.fillStyle = col;
      cg.fillRect((mirror ? GRID_W - 1 - x : x) * SCALE, y * SCALE, SCALE, SCALE);
    }),
  );
  return c;
}

/** A figure's head on the plate, hat to chin, as drawn or mirrored */
export function handHead(who: Actor, flip: boolean): { x: number; y: number; w: number; h: number } {
  const bx = FIGS[who].box;
  const x = HEAD_AT.x + bx.x;
  const gx = FIGS[who].right === flip ? GRID_W - x - bx.w : x;
  return { x: gx * SCALE, y: (HEAD_AT.y + bx.y) * SCALE, w: bx.w * SCALE, h: bx.h * SCALE };
}

/** A figure's head and collar, n by n at the board's own pixel, over whatever's on the
 *  canvas already: the close-ups that cut in during play. Flip to face left */
export function handHeadOnto(cg: CanvasRenderingContext2D, who: Actor, f: Face, n: number, flip: boolean) {
  const fig = FIGS[who];
  const g = compose(who, f, 0, false, 0);
  const mirror = fig.right === flip;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const col = fig.pal[g[y]?.[HEAD_AT.x + x] ?? '.'];
      if (!col) continue;
      cg.fillStyle = col;
      cg.fillRect(mirror ? n - 1 - x : x, y, 1, 1);
    }
}
