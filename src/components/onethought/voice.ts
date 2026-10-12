// The voices at the foot of the board: the golfer's own and the caddie's. A
// pixel portrait cuts in beside a text box and the line types out, holds, and goes. On
// the walk between holes the whole cast takes turns, large, in a scene (scenes.ts).
//
// The golfer's own voice comes as a short run of testimony, two or three lines, one at a
// time. Pressing the pocket button while a line is up catches it. One line in a run (and
// sometimes none) is the catch for the thought being carried; the rest are ordinary
// thoughts, so it's a judgement, not a reflex. A catch gets a stamp, the face settles and
// the rest of the run is dropped. A hold on a moment keeps it. A press on any other line
// is just a tap, or a moment marked, as ever. Nothing here ever reaches the sim: the
// reward is the story, not the score.
//
// No line says when to press, names a thought, or names the button.

import { portrait, type Who, type Expr } from './portrait';
import * as snd from './sound';
import { letteringEl, BRASS_PAL, STAMP_PAL } from './lettering';

export type Cut = {
  who: Who;
  expr: Expr;
  line: string;
  by: string;
  /** Which run of the inner voice this line belongs to */
  run?: number;
  /** The line the carried thought is about */
  catch?: boolean;
  /** Carrying the Heckler, the jab said straight before the catch: a tap on it is the same
   *  catch, and the line after goes unsaid */
  lead?: boolean;
  /** A better line, worked out as it's said (the aim may have changed since) */
  alt?: () => string | null;
  /** On the walk: a moment worth keeping from the hole, for a hold */
  moment?: boolean;
  /** How long it holds once typed, if not the usual */
  hold?: number;
  /** Typed faster than the usual, on the walk */
  cps?: number;
  /** Part of a scene: answering it leaves the rest of the scene to play */
  scene?: boolean;
  /** Worked out as it's said: a line and a face that answer what came before */
  react?: () => { who: Who; line: string; expr: Expr } | null;
};

export type Sit = 'heckled' | 'gallery' | 'bad' | 'good' | 'choice' | 'doubt' | 'approach';
export type RunSpec = { p: number; catchP: number; catch: readonly string[]; catchExpr: Expr; foils: readonly string[]; expr: Expr };

/** The head's small talk: none of it is about anything */
export const ORDINARY = [
  'Nice tempo.',
  'Wind’s dropped a bit.',
  'Bag’s heavy today.',
  'Lovely light tonight.',
  'Greens look quick.',
  'Shoelace is loose.',
  'Should’ve had a sandwich.',
  'Grip’s fine. Probably.',
] as const;

const COMMIT = ['That one. Done.', 'That’s the line.', 'Right. That one.', 'Picked it. Go.'];

// Per thought, by name, the moments that matter for it. p is the chance a run comes at
// all; catchP the chance it holds the catch
export const XEXAM: Record<string, Partial<Record<Sit, RunSpec>>> = {
  'The Heckler': {
    heckled: {
      p: 0.9,
      catchP: 0.85,
      catch: ['Ears are going.', 'That’s got in.', 'Face is giving it away.', 'Right. That stung.'],
      catchExpr: 'wince',
      foils: ['They heard. Course they heard.', 'They’ve a point, though.', 'Everyone saw that.', 'You were always going to.'],
      expr: 'tense',
    },
    gallery: {
      p: 0.75,
      catchP: 0.75,
      catch: ['Hands have gone.', 'That’s got in.', 'Ears are going.'],
      catchExpr: 'wince',
      foils: ['Short hole. You know what you do here.', 'Over the water. In front of everyone.', 'Don’t top it. You’ll top it.', 'Not the water.'],
      expr: 'tense',
    },
    bad: {
      p: 0.4,
      catchP: 0.6,
      catch: ['Club’s going in the bag hard.', 'Kick the bag. Go on.'],
      catchExpr: 'wince',
      foils: ['That’s the round gone.', 'Every time. Every single time.', 'And that was the easy bit.'],
      expr: 'wince',
    },
  },
  'Commit to the Line': {
    choice: {
      p: 0.75,
      catchP: 0.85,
      catch: COMMIT,
      catchExpr: 'calm',
      foils: ['Or the other line?', 'Is that enough club?', 'Was the other one better?', 'Flag’s right there.', 'Left a touch. Or not.'],
      expr: 'tense',
    },
    doubt: {
      p: 0.8,
      catchP: 0.65,
      catch: COMMIT,
      catchExpr: 'calm',
      foils: ['Or the first one?', 'Is that right?', 'Left a touch. Or not.', 'Was the other one better?'],
      expr: 'tense',
    },
  },
  // Tempted at the flag on the approach; the catch is the moment the middle of the green
  // is taken
  'Pins Are a Psyop': {
    approach: {
      p: 0.85,
      catchP: 0.85,
      catch: ['Middle of the green. Boring. Fine.', 'Fat of the green. Let them have the flag.', 'Boring target. Done.', 'Away from the flag. That’s it.'],
      catchExpr: 'calm',
      foils: ['Flag’s right there.', 'Could get it close, though…', 'Go on. Have a go at it.', 'Nobody remembers the middle of the green.', 'They’ve tucked it. Course they have.'],
      expr: 'tense',
    },
    doubt: {
      p: 0.6,
      catchP: 0.6,
      catch: ['No. Middle of the green.', 'Boring target. Done.'],
      catchExpr: 'calm',
      foils: ['Or straight at it?', 'Just this once, the flag.', 'Is the fat too far from it?'],
      expr: 'tense',
    },
  },
  'Ancient History': {
    bad: {
      p: 0.7,
      catchP: 0.85,
      catch: ['Gone. Next one.', 'That’s finished.', 'Leave it there.', 'Done with. Walk on.'],
      catchExpr: 'calm',
      foils: ['Five yards left and that’s on.', 'Should’ve been the other club.', 'You always do that here.', 'That kick was rough luck.', 'Every time. Every single time.'],
      expr: 'wince',
    },
    good: {
      p: 0.35,
      catchP: 0.7,
      catch: ['Lovely. Now leave it.', 'Gone. Next one.', 'Good one. Gone now.'],
      catchExpr: 'calm',
      foils: ['Don’t get used to it.', 'Do that every time, then.', 'Bit lucky, that.'],
      expr: 'calm',
    },
  },
};

// ---------------------------------------------------------------------------------------
// The walk to the next tee is a scene (scenes.ts). What's left here goes either side of
// it: what follows you onto the tee, and what goes with you

/** A tell let go by follows you onto the next tee */
export const FOLLOW: Record<string, readonly string[]> = {
  'The Heckler': ['You’re still chewing on that.', 'Same hands as last time.'],
  'Commit to the Line': ['Which line here, then? Which line?', 'Still not sure about that last one.'],
  'Pins Are a Psyop': ['Flag’s right there, though.', 'Could just have a go at this one.'],
  'Ancient History': ['Still thinking about that last hole.', 'Leave it. Can’t, though.'],
};

/** And something kept goes with you */
export const KEPT = ['Still got that one.', 'Hang on to that.'];

export const BY: Record<Who, string> = {
  you: 'you, to yourself',
  caddie: 'your caddie',
  partner: 'your partner',
};
const IN_MS = 150;
const CHARS_PER_S = 40;
// A single line holds long enough to read; a line of testimony a little longer, to react
const HOLD_MS = 1600;
const RUN_HOLD_MS = 2000;
// After a catch the caught line stays up, stamped, for a beat
const CAUGHT_MS = 1500;
const OUT_MS = 150;

type Opts = {
  reduce: boolean;
  status: (t: string) => void;
  /** A run is over: whether its catch was said, and whether it was caught */
  onRunEnd: (run: number, offered: boolean, caught: boolean) => void;
  /** A run of the inner voice is under way, or not */
  onLive: (on: boolean) => void;
};

export function createCutins(el: HTMLElement, opts: Opts) {
  const { reduce } = opts;
  const face = el.querySelector<HTMLCanvasElement>('[data-face]')!;
  const fg = face.getContext('2d')!;
  const whoEl = el.querySelector<HTMLElement>('[data-who]')!;
  const lineEl = el.querySelector<HTMLElement>('[data-line]')!;
  const stampEl = el.querySelector<HTMLElement>('.stamp')!;
  let cur: { cut: Cut; t0: number; shown: number; out: number; caught: number; expr: Expr } | null = null;
  let queue: Cut[] = [];
  const runs = new Map<number, { offered: boolean; caught: boolean }>();
  let live = false;

  function setLive(on: boolean) {
    if (on === live) return;
    live = on;
    opts.onLive(on);
  }

  function drawFace(c: Cut, expr: Expr) {
    fg.imageSmoothingEnabled = false;
    fg.clearRect(0, 0, 48, 48);
    // The face sits to the right of its words, so it looks back across at them
    fg.drawImage(portrait(c.who, expr, true), 0, 0);
  }

  function show(c: Cut, now: number) {
    const better = c.alt?.();
    if (better) c.line = better;
    const r = c.react?.();
    if (r) {
      c.who = r.who;
      c.line = r.line;
      c.expr = r.expr;
    }
    cur = { cut: c, t0: now, shown: -1, out: -1, caught: -1, expr: c.expr };
    el.dataset.who = c.who;
    drawFace(c, c.expr);
    whoEl.textContent = c.by || BY[c.who];
    lineEl.textContent = reduce ? c.line : '';
    el.classList.remove('on', 'out', 'caught', 'kept');
    void el.offsetWidth;
    el.classList.add('on');
    el.classList.toggle('run', c.run != null);
    if (c.run != null) {
      const r = runs.get(c.run);
      if (r && (c.catch || c.lead)) r.offered = true;
      setLive(true);
    }
    opts.status(c.who === 'you' ? `You think: ${c.line}` : `${(c.by || BY[c.who]).replace(/^./, (m) => m.toUpperCase())}: ${c.line}`);
  }

  function hide(now: number) {
    if (!cur || cur.out >= 0) return;
    cur.out = now;
    el.classList.add('out');
  }

  function endRun(run: number) {
    const r = runs.get(run);
    runs.delete(run);
    setLive(false);
    if (r) opts.onRunEnd(run, r.offered, r.caught);
  }

  // A line answered: typed out in full, stamped, the face settled, held a beat
  function stamp(now: number, kind: 'caught' | 'kept', label: string = kind) {
    if (!cur) return;
    cur.expr = 'settled';
    cur.out = -1;
    cur.caught = now;
    cur.t0 = now - IN_MS - (cur.cut.line.length * 1000) / (cur.cut.cps ?? CHARS_PER_S);
    cur.shown = cur.cut.line.length;
    lineEl.textContent = cur.cut.line;
    // The word in the shout's lettering, small: capitalised, with a bang for a tap
    const word = label.replace(/\.$/, '').replace(/^./, (m) => m.toUpperCase());
    stampEl.replaceChildren(kind === 'kept' ? letteringEl(word, 1, BRASS_PAL) : letteringEl(`${word}!`, 1, STAMP_PAL));
    if (kind === 'kept') snd.kept();
    else snd.shout(label);
    el.classList.remove('out');
    el.classList.add(kind);
    drawFace(cur.cut, 'settled');
  }

  const holdFor = (c: Cut) => c.hold ?? (c.run != null ? RUN_HOLD_MS : HOLD_MS);

  return {
    /** Say it now, or after whatever's being said */
    say(c: Cut, now: number) {
      if (!cur) show(c, now);
      else if (queue.length < 2) queue.push(c);
    },
    /** A run of testimony: said line by line, after whatever's being said */
    run(id: number, cuts: Cut[], now: number) {
      runs.set(id, { offered: false, caught: false });
      cuts.forEach((c) => (c.run = id));
      queue.push(...cuts);
      if (!cur) show(queue.shift()!, now);
    },
    /** Each frame: type the line, hold it, take it away, and on to the next */
    step(now: number) {
      if (!cur) return;
      const c = cur.cut;
      if (cur.out >= 0) {
        if (now - cur.out >= (reduce ? 0 : OUT_MS)) {
          el.classList.remove('on', 'out', 'caught', 'kept', 'run');
          cur = null;
          const next = queue.shift();
          if (c.run != null && next?.run !== c.run) endRun(c.run);
          if (next) show(next, now);
        }
        return;
      }
      const typed = reduce ? c.line.length : Math.max(0, Math.floor(((now - cur.t0 - IN_MS) * (c.cps ?? CHARS_PER_S)) / 1000));
      const n = Math.min(c.line.length, typed);
      if (n !== cur.shown) {
        if (n > cur.shown && n % 2 === 0) snd.blip(c.who);
        cur.shown = n;
        lineEl.textContent = c.line.slice(0, n);
      }
      if (cur.caught >= 0) {
        if (now - cur.caught >= CAUGHT_MS) hide(now);
        return;
      }
      const full = reduce ? cur.t0 : cur.t0 + IN_MS + (c.line.length * 1000) / (c.cps ?? CHARS_PER_S);
      if (now - full >= holdFor(c)) hide(now);
    },
    /** The line up now, for a press to be held against when it's let go */
    get current() {
      return cur && (cur.out < 0 || cur.caught >= 0) ? cur.cut : null;
    },
    /** The pocket button, tapped: true if it caught the line that was up when it went
     *  down (armed), still up or only just going. The stamp says what a tap means */
    catchNow(now: number, armed: Cut | null, label = 'caught') {
      if (!cur || !armed || cur.cut !== armed || cur.cut.run == null || cur.caught >= 0) return false;
      // Going out counts: the press began while it was there
      if (cur.out >= 0 && now - cur.out > OUT_MS + 300) return false;
      if (!cur.cut.catch && !cur.cut.lead) return false;
      const run = cur.cut.run;
      const r = runs.get(run);
      if (r) r.caught = true;
      // The rest of the run goes quiet, but a scene plays on, and a moment worth keeping
      if (!cur.cut.scene) queue = queue.filter((q) => q.run !== run || q.moment);
      stamp(now, 'caught', label);
      if (!queue.some((q) => q.run === run)) setLive(false);
      return true;
    },
    /** The pocket button, held: true if the line it went down on is a moment, now kept */
    keepNow(now: number, armed: Cut | null) {
      if (!cur || !armed || cur.cut !== armed || cur.cut.run == null || cur.caught >= 0 || !cur.cut.moment) return false;
      if (cur.out >= 0 && now - cur.out > OUT_MS + 300) return false;
      stamp(now, 'kept');
      return true;
    },
    /** Who's speaking and with what face, for the stage on the walk */
    get face() {
      return cur && cur.out < 0 ? { who: cur.cut.who, expr: cur.expr, t0: cur.t0 } : null;
    },
    /** A click or a key: finish typing if it's typing, else on to the next line */
    skip(now: number) {
      if (!cur || cur.out >= 0) return false;
      if (cur.shown < cur.cut.line.length) {
        cur.t0 = now - IN_MS - (cur.cut.line.length * 1000) / (cur.cut.cps ?? CHARS_PER_S);
        cur.shown = cur.cut.line.length;
        lineEl.textContent = cur.cut.line;
        return true;
      }
      hide(now);
      return true;
    },
    /** A run taken back before it's done: the rest goes unsaid, and its catch isn't
     *  counted as let go. One already caught stands */
    drop(id: number, now: number) {
      const r = runs.get(id);
      if (!r || r.caught) return;
      r.offered = false;
      queue = queue.filter((q) => q.run !== id);
      if (cur?.cut.run === id) hide(now);
      else endRun(id);
    },
    /** Gone, and nothing waiting: for a swing, a new hole, the end */
    clear(now: number) {
      // Runs that never got said end here, unsaid
      for (const q of queue) if (q.run != null && q.run !== cur?.cut.run && runs.has(q.run)) endRun(q.run);
      queue = [];
      if (cur) hide(now);
    },
    get showing() {
      return !!cur && cur.out < 0;
    },
    /** A run of the inner voice is being said, or is waiting to be */
    get inRun() {
      return (!!cur && cur.cut.run != null) || queue.some((q) => q.run != null);
    },
    get line() {
      return cur?.cut.line ?? '';
    },
    /** Whether the line up now is the catch (for the screenshot bot) */
    get catchUp() {
      return !!cur && cur.out < 0 && cur.caught < 0 && !!cur.cut.catch;
    },
    /** And whether it's a moment to keep */
    get momentUp() {
      return !!cur && cur.out < 0 && cur.caught < 0 && !!cur.cut.moment;
    },
  };
}
export type Cutins = ReturnType<typeof createCutins>;
