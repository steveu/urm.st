// The cast on the walk's stage: you, your caddie and your partner, head and shoulders, the
// box at the foot of the frame cutting them at the chest. The figures themselves are
// hand-placed (hand.ts); this keeps them by frame.

import { handFrame, handHead, PLATE_W, PLATE_H } from './hand';

export type Actor = 'you' | 'caddie' | 'partner';
/** A face: as they are, pleased with it, caught out, thinking it over, or the shout */
export type Face = 'normal' | 'pleased' | 'shocked' | 'thinking' | 'shout';
/** The mouth while talking: shut, half open, open */
export type Mouth = 0 | 1 | 2;
/** A gesture a line can carry, over the face, in two frames: your partner's grin going,
 *  your caddie lowering his eyes, yours sliding off sideways */
export type Gesture = 'falter' | 'lower' | 'glance';

export const W = PLATE_W;
export const H = PLATE_H;

const cache = new Map<string, HTMLCanvasElement>();
/** One frame of a portrait: the face and its pose, the pose's frame, eyes shut or not, the
 *  mouth's frame; flip to face left; a gesture and its frame, if one's playing */
export function portraitFrame(who: Actor, f: Face, frame: 0 | 1, blink: boolean, mouth: Mouth, flip = false, gest: [Gesture, 0 | 1] | null = null): HTMLCanvasElement {
  const key = `${who}:${f}:${frame}:${blink}:${mouth}:${flip}:${gest ?? ''}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = handFrame(who, f, frame, blink, mouth, flip, gest);
  cache.set(key, c);
  return c;
}

export const FACES: Face[] = ['normal', 'pleased', 'shocked', 'thinking', 'shout'];

/** Where the head is in a portrait, hat included, as drawn or flipped */
export function headBox(who: Actor, flip = false): { x: number; y: number; w: number; h: number } {
  return handHead(who, flip);
}
