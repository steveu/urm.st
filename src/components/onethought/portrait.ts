// The close-ups: a pixel portrait that cuts in beside a line of text at the foot of the
// board, when the inner voice speaks and when the caddie offers two lines. 48 by 48, at
// the board's own pixel. You, the caddie and your partner are the same hand-placed heads
// as on the walk's stage (hand.ts), at half the size. Lit from the right, where the low
// sun is.

import { handHeadOnto } from './hand';
import type { Face } from './cast';

export type Who = 'you' | 'caddie' | 'partner';
export type Expr = 'calm' | 'wince' | 'tense' | 'settled';

const N = 48;
// The close-ups' expressions, as the cast's faces: easy, caught out, worried at, settled
const AS_FACE: Record<Expr, Face> = { calm: 'normal', wince: 'shocked', tense: 'thinking', settled: 'pleased' };

const cache = new Map<string, HTMLCanvasElement>();

// The ground behind a face: a warm band for you, sage for the caddie, rose for your
// partner, with Bayer-dithered speed lines across it
const BG: Record<Who, [string, string]> = {
  you: ['#f3d48a', '#e9bd62'],
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
  handHeadOnto(g, who, AS_FACE[expr], N, flip);
  cache.set(key, c);
  return c;
}

export const EXPRS: Expr[] = ['calm', 'wince', 'tense', 'settled'];
