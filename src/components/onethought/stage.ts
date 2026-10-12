// The stage on the walk between holes: one line at a time in a box across the foot of the
// frame, a name tab on its edge, the words typing out with a blip a letter, and an arrow
// when the line's done. The player moves it on with a click on the scene or Enter or
// Space; that's never the Flic. The Flic answers the line that's up: a tap on the key line
// catches it (the shout), or on the heckle that leads to it, carrying the Heckler; a hold
// on a moment keeps it. Neither ever moves the scene on,
// and nothing here reaches the sim.
//
// A hush is a beat with nobody speaking: no box, no face, the walk left to itself for a
// few seconds or until a click, and the Flic on it as on any line that isn't the key one.
//
// The faces themselves are drawn on the board (play.ts asks who's speaking, how, and
// whether their mouth is moving), and so is the shout (lettering.ts); this keeps the words,
// the timing, the flash and the shake, and says when the shout began and what it says.

import type { Beat, Speaker } from './scenes';
import * as snd from './sound';
import { letteringEl, BRASS_PAL, SHOUT_HOLD } from './lettering';

const CPS = 34; // letters a second: readable, unhurried
const AUTO_MS = 8000; // a line left alone this long goes on by itself, bar your thoughts
const HUSH_MS = 2800; // a hush, the same, sooner
const FLASH_MS = 180;
const SHAKE_MS = 280;

const TAB: Record<Speaker, string> = { you: 'you', caddie: 'your caddie', partner: 'your partner' };

// A line in brackets is thought, not said: shown without them, in its own colour
const isThought = (b: Beat) => b.who === 'you' && /^\(.*\)$/.test(b.text);
const shownText = (b: Beat) => (isThought(b) ? b.text.slice(1, -1) : b.text);

// When each letter of a line lands: a beat on a comma, a longer one on a full stop, longer
// still on an ellipsis; a thought comes slower
function timing(b: Beat, text: string): number[] {
  const per = 1000 / (isThought(b) ? CPS * 0.85 : CPS);
  const out: number[] = [0];
  let t = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    t += per;
    if (ch === '…') t += 450;
    else if ('.!?'.includes(ch) && i < text.length - 1) t += 240;
    else if (',;:'.includes(ch)) t += 110;
    out.push(t);
  }
  return out;
}

type Els = { box: HTMLElement; tab: HTMLElement; line: HTMLElement; stamp: HTMLElement };
type Opts = {
  reduce: boolean;
  status: (t: string) => void;
  /** The key line answered: caught, or let go by when the scene moved on past it */
  onKey: (caught: boolean) => void;
  /** The last line moved on from */
  onEnd: () => void;
};

export function createStage(els: Els, opts: Opts) {
  const { reduce } = opts;
  let lines: Beat[] = [];
  let i = -1;
  let t0 = 0;
  let shown = -1;
  let doneAt = -1;
  let answered: 'caught' | 'missed' | null = null;
  let after: { caught: Beat[]; missed: Beat[] } = { caught: [], missed: [] };
  let flashT0 = -1e9;
  let flashK = 1;
  let shakeT0 = -1e9;
  let shoutT0 = -1e9;
  let shoutLine = -1;
  let shoutWord = '';
  // The kept stamp, in the brass lettering, drawn at the board's pixel size
  els.stamp.replaceChildren(letteringEl('Kept', 1, BRASS_PAL));
  let running = false;

  const cur = () => (running && i >= 0 ? lines[i] : null);

  let txt = '';
  let at: number[] = [];

  function show(now: number) {
    const b = lines[i];
    t0 = now;
    shown = -1;
    doneAt = -1;
    // A hush: nothing to type, the box down, and only the status says what's happening
    txt = b.hush ? '' : shownText(b);
    at = timing(b, txt);
    els.box.classList.toggle('on', !b.hush);
    if (b.hush) return opts.status(b.text);
    els.tab.textContent = TAB[b.who];
    els.box.dataset.who = b.who;
    els.box.classList.toggle('thought', isThought(b));
    els.box.classList.remove('done', 'kept');
    els.line.textContent = '';
    opts.status(`${TAB[b.who].replace(/^./, (m) => m.toUpperCase())}: ${b.text}`);
  }

  function finishTyping(now: number) {
    shown = txt.length;
    els.line.textContent = txt;
    doneAt = now;
    els.box.classList.add('done');
  }

  function end() {
    running = false;
    els.box.classList.remove('on', 'done', 'kept', 'off', 'thought');
    opts.onEnd();
  }

  return {
    /** A scene: its lines, the key line somewhere among them, and what's said to the key
     *  line, which goes in straight after it once it's caught or let go */
    start(lead: Beat[], caught: Beat[], missed: Beat[], now: number) {
      lines = [...lead];
      after = { caught, missed };
      answered = null;
      i = 0;
      running = true;
      els.box.classList.add('on');
      show(now);
    },
    /** Each frame: type, blip, and go on by itself if left long enough. Your thoughts
     *  wait, all of them, so the key line can't be told by its waiting: letting it go is
     *  the player's to do, with a click, never the clock's. A click still moves it on, so
     *  the scene can't stall */
    step(now: number) {
      const b = cur();
      if (!b) return;
      if (doneAt < 0) {
        let n = reduce ? txt.length : Math.max(0, shown);
        if (!reduce) while (n < txt.length && at[n + 1] <= now - t0) n++;
        if (n !== shown) {
          if (n > shown && n % 2 === 0 && /\S/.test(txt.charAt(n - 1))) snd.blip(b.who);
          shown = n;
          els.line.textContent = txt.slice(0, n);
        }
        if (n >= txt.length) finishTyping(now);
      } else if (now - doneAt >= (b.hush ? HUSH_MS : AUTO_MS) && !(b.key ? !answered : b.who === 'you' && b.text.startsWith('('))) this.advance(now, true);
    },
    /** A click or Enter: finish the line if it's typing, else on to the next */
    advance(now: number, auto = false) {
      const b = cur();
      if (!b) return;
      if (doneAt < 0) {
        finishTyping(now);
        return;
      }
      if (!auto) snd.click();
      // Moving on past the key line unanswered lets it go
      if (b.key && !answered) {
        answered = 'missed';
        lines.splice(i + 1, 0, ...after.missed);
        opts.onKey(false);
      }
      i++;
      if (i >= lines.length) end();
      else show(now);
    },
    /** The Flic, tapped on the line it went down on: the key line, caught, or the heckle
     *  that leads to it, which is the same catch. Then what's said to it goes in after the
     *  key line, so on a heckle the key line's still said, already answered */
    catchNow(armed: Beat | null, word: string, now: number) {
      const b = cur();
      if (!b || !armed || armed !== b || !(b.key || b.lead) || answered) return false;
      answered = 'caught';
      const k = b.key ? i : lines.findIndex((l, j) => j > i && l.key);
      lines.splice(k + 1, 0, ...after.caught);
      finishTyping(now);
      shoutWord = word;
      shoutT0 = now;
      shoutLine = i;
      if (!reduce) {
        flashT0 = now;
        flashK = 1;
        shakeT0 = now;
      }
      snd.shout();
      opts.onKey(true);
      return true;
    },
    /** The Flic, held on the line it went down on: a moment, kept */
    keepNow(armed: Beat | null, now: number) {
      const b = cur();
      if (!b || !armed || armed !== b || !b.moment || els.box.classList.contains('kept')) return false;
      els.box.classList.add('kept');
      if (!reduce) {
        flashT0 = now;
        flashK = 0.4;
      }
      snd.kept();
      return true;
    },
    /** The shout, while it's on: its word, and how long since it began */
    shout(now: number) {
      return now - shoutT0 <= SHOUT_HOLD + 200 ? { word: shoutWord, t: now - shoutT0 } : null;
    },
    /** How long since the shout, while the line it was shouted on is still up; -1 once
     *  the scene has moved on, so the shouter's face can hold and then land */
    shoutAge(now: number) {
      return i === shoutLine ? now - shoutT0 : -1;
    },
    clear() {
      running = false;
      // Forget the last scene, or the next walk starts from where it ended
      lines = [];
      i = -1;
      els.box.classList.remove('on', 'done', 'kept', 'off', 'thought');
      shoutT0 = -1e9;
      shoutLine = -1;
    },
    get current() {
      return cur();
    },
    /** Who's on, with what face, and whether their words are still coming */
    get speaker() {
      const b = cur();
      return b && !b.hush ? { who: b.who, face: b.face ?? 'normal', talking: doneAt < 0, t0 } : null;
    },
    /** When the hush that's on began, or -1 if there isn't one */
    get hushT0() {
      return cur()?.hush ? t0 : -1;
    },
    /** The white flash, 0 to 1 */
    flash(now: number) {
      const u = (now - flashT0) / FLASH_MS;
      return u >= 0 && u < 1 ? (1 - u) * flashK : 0;
    },
    /** The jolt, in board pixels */
    shake(now: number): [number, number] {
      const u = (now - shakeT0) / SHAKE_MS;
      if (u < 0 || u >= 1) return [0, 0];
      const a = Math.round(3 * (1 - u));
      return [(Math.floor(now / 35) & 1 ? 1 : -1) * a, Math.floor(now / 50) & 1 ? Math.round(a / 2) : 0];
    },
    /** How far through the scene, 0 to 1 */
    get progress() {
      return lines.length ? Math.max(0, i) / lines.length : 0;
    },
    get running() {
      return running;
    },
  };
}
export type Stage = ReturnType<typeof createStage>;
