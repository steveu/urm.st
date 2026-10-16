// The home page's One Thought round. Loaded only as the band nears the screen, so its
// weight stays off the first paint
import { START, THOUGHTS } from './thoughts';
import { fresh, read, recordHtml, sealedHtml, type CardEvent, type Press, type State } from './record';
import type { Verdict } from './read';
import { createGame, type Finish } from './play';
import { drawFlic } from './pixel';
import { createEnding, endingScale } from './ending';
import * as snd from './sound';

const HOLD = 500;
const DUSK = 700;

export function mountRound(root: HTMLElement) {
  const q = <T extends Element = HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const scene = q('[data-scene]');
  const status = q('[data-status]');
  const flic = q<HTMLButtonElement>('[data-flic]');
  const flicCv = q<HTMLCanvasElement>('[data-flic-canvas]');
  const pocketEl = q('[data-pocket]');
  const recordEl = q('[data-record]');
  const sealedEl = q('[data-sealed]');
  const copyEl = q('[data-sealcopy]');
  const carryEl = q('.carry');
  const nameEl = q('[data-carry-name]');
  const ruleEl = q('[data-carry-rule]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ending = createEnding(q<HTMLCanvasElement>('[data-ending]'));

  let s: State = fresh(START);
  // Focus rings for the keyboard only
  root.addEventListener('keydown', (e) => {
    // Only Tab shows the focus ring: Space, Enter and the arrows are how you play
    if (e.key === 'Tab') root.dataset.kb = '';
  });
  root.addEventListener('pointerdown', () => delete root.dataset.kb);

  // The course falls into place before the thoughts are offered, unless motion's down or
  // the screenshot bot is reading a fixed seed
  const build = !reduce && !new URLSearchParams(location.search).has('ot-seed');
  if (build) root.dataset.building = '';
  const game = createGame(root, {
    reduce,
    build,
    onBuilt: () => delete root.dataset.building,
    seed: 0,
    status: (t) => (status.textContent = t),
    onShot: (hole, lie, putt) => s.card[hole - 1]?.push({ k: 'shot', lie, putt }),
    onFinish: (f) => finish(f),
    onMissed: (hole) => s.stage === 'round' && s.card[hole - 1]?.push({ k: 'missed' }),
    onLive: (on) => setLive(on),
  });

  // Focus once the thing can take it: a panel coming in is hidden for a frame or two
  function focusSoon(el: HTMLElement | null) {
    if (!el) return;
    let tries = 60;
    const go = () => {
      el.focus({ preventScroll: true });
      if (document.activeElement !== el && --tries > 0) requestAnimationFrame(go);
    };
    go();
  }
  const act = (name: string) => root.querySelector<HTMLElement>(`[data-act="${name}"]`);

  function paint(focus?: string) {
    const moved = root.dataset.stage !== s.stage;
    root.dataset.stage = s.stage;
    const t = THOUGHTS[s.thought];
    nameEl.textContent = t.name;
    ruleEl.textContent = t.rule;
    root.querySelectorAll<HTMLElement>('[data-pick]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.pick) === s.thought)));
    if (s.stage === 'record') recordEl.innerHTML = recordHtml(s);
    if (s.stage === 'sealed') copyEl.innerHTML = sealedHtml(s);
    if (moved) game.layout();
    if (focus) focusSoon(act(focus));
  }

  // Sound starts with the round, from the click that starts it; the mute is remembered
  const muteEl = q<HTMLButtonElement>('[data-mute]');
  const paintMute = () => {
    muteEl.setAttribute('aria-pressed', String(snd.isMuted()));
    muteEl.setAttribute('aria-label', snd.isMuted() ? 'Sound on' : 'Sound off');
  };
  paintMute();
  muteEl.addEventListener('click', () => {
    snd.init();
    snd.setMuted(!snd.isMuted());
    paintMute();
  });

  function begin() {
    snd.init();
    s = { ...fresh(s.thought), stage: 'round' };
    paint();
    game.begin(s.thought);
    scene.focus({ preventScroll: true });
    if (matchMedia('(max-width: 860px)').matches) q('[data-game]').scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
  }

  // The round over, by the 3rd green or by ending it early
  function finish(f?: Finish) {
    if (s.stage !== 'round') return;
    const r = f ?? game.end();
    const a = document.activeElement;
    const hadFocus = scene.contains(a) || carryEl.contains(a) || a === document.body;
    s = { ...s, stage: 'record', end: r.end, holesPlayed: r.holesPlayed, complete: r.complete, bounds: r.bounds };
    paint(hadFocus ? 'keep' : undefined);
    game.reveal(s.taps, s.moments);
    status.textContent = read(s);
  }

  function reset(thought: number) {
    ending.stop();
    game.setActive(true);
    s = fresh(thought, 'choose');
    game.reset();
    paint();
  }

  // Sealing: the light goes off the board, then the last green comes in a pixel at a time
  let sealing = false;
  function seal() {
    if (sealing || !s.verdict) return;
    sealing = true;
    root.dataset.sealing = '';
    game.dusk(true, DUSK);
    window.setTimeout(
      () => {
        sealing = false;
        delete root.dataset.sealing;
        s = { ...s, stage: 'sealed' };
        paint();
        sizeEnding();
        ending.start({ reduce, verdict: s.verdict });
        game.setActive(false);
        // The band may be taller than the screen: bring its top, and the sentence, into view
        if (root.getBoundingClientRect().top < 0) root.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
        focusSoon(act('again'));
        status.textContent = `Sealed. ${read(s)}`;
      },
      reduce ? 0 : DUSK,
    );
  }

  // The card is drawn at the painting's pixel, and the painting composes round the card:
  // it is told where the card and its shadow fall
  function sizeEnding() {
    const scale = endingScale(sealedEl.clientWidth);
    sealedEl.style.setProperty('--px', `${scale}px`);
    const box = sealedEl.getBoundingClientRect();
    const card = copyEl.getBoundingClientRect();
    const words = { l: card.left - box.left - 2 * scale, r: card.right - box.left, b: card.bottom - box.top + 2 * scale };
    ending.resize(sealedEl.clientWidth, sealedEl.clientHeight, words);
  }
  let lastSealW = 0;
  new ResizeObserver(() => {
    if (s.stage !== 'sealed' || sealedEl.clientWidth === lastSealW) return;
    lastSealW = sealedEl.clientWidth;
    sizeEnding();
  }).observe(sealedEl);
  new IntersectionObserver((es) => ending.pause(!es.some((x) => x.isIntersecting))).observe(root);

  // In development only: ?end=kept or ?end=dropped opens on the sealed round, over a
  // made-up round, so the ending can be looked at without playing three holes
  if (import.meta.env.DEV) {
    const want = new URLSearchParams(location.search).get('end');
    if (want) {
      const verdict: Verdict = want.startsWith('drop') ? 'drop' : 'keep';
      const tap = (t: number, hole: number): Press => ({ t, hole, at: [0, 0], over: false });
      s = { ...fresh(START, 'sealed'), taps: [tap(140, 1), tap(610, 2), tap(1180, 3)], end: 1500, holesPlayed: 3, complete: true, bounds: [480, 1010], verdict };
      paint();
      game.setActive(false);
      sizeEnding();
      ending.start({ reduce, verdict });
      requestAnimationFrame(() => root.scrollIntoView({ block: 'start' }));
    }
  }

  // The Flic: pressed while held, a gold ring on a press, wider and longer for a moment,
  // and a faint warm halo while the inner voice is talking
  let down = false;
  let live = false;
  let liveT0 = 0;
  let glow: { t0: number; ms: number; moment: boolean } | null = null;
  let holdT0 = -1;
  let flicRaf = 0;
  function flicFrame() {
    const now = performance.now();
    let g = 0;
    let moment = false;
    if (glow) {
      const u = (now - glow.t0) / glow.ms;
      if (u >= 1) glow = null;
      else {
        g = Math.ceil((1 - u) * 4) / 4;
        moment = glow.moment;
      }
    }
    // While held, the ring gathers: a moment is coming
    if (!glow && down && holdT0 >= 0 && !reduce) g = Math.min(0.5, Math.max(0, (now - holdT0 - 180) / 640));
    // The halo breathes in four steps over a second and a half; still, with reduced motion
    const lv = live ? (reduce ? 0.7 : 0.45 + 0.35 * (Math.round(((Math.sin(((now - liveT0) / 1600) * 2 * Math.PI - Math.PI / 2) + 1) / 2) * 3) / 3)) : 0;
    drawFlic(flicCv, down, g, moment || (down && g > 0), lv);
    flicRaf = glow || down || (live && !reduce) ? requestAnimationFrame(flicFrame) : 0;
  }
  function flicPaint() {
    if (!flicRaf) flicRaf = requestAnimationFrame(flicFrame);
  }
  drawFlic(flicCv, false, 0, false);

  function setLive(on: boolean) {
    if (on === live) return;
    live = on;
    liveT0 = performance.now();
    pocketEl.classList.toggle('live', on);
    if (reduce) drawFlic(flicCv, down, 0, false, on ? 0.7 : 0);
    flicPaint();
  }

  // A press answers the line that was up as the button went down. Whether it's a tap or
  // a hold is only known when it's let go (or held long enough), so that's when it's
  // decided: a tap may catch the key line, a hold only ever marks a moment
  function tryCatch() {
    if (s.stage !== 'round' || !game.catchLine()) return false;
    ripple(false);
    return true;
  }

  function setDown(v: boolean) {
    down = v;
    holdT0 = v ? performance.now() : -1;
    flic.classList.toggle('down', v);
    flicPaint();
  }
  function ripple(moment: boolean) {
    if (reduce) return;
    glow = { t0: performance.now(), ms: moment ? 1100 : 380, moment };
    flicPaint();
  }

  // Every press counts as it always did; a catch only marks the tap on the card, and a
  // moment held on a line worth keeping only marks the moment
  function press(moment: boolean, caught = false) {
    snd.flic();
    if (s.stage !== 'round') return ripple(moment);
    const p = game.stamp();
    const kept = moment && game.keepLine();
    if (moment) s.moments.push(p);
    else s.taps.push(p);
    const ev: CardEvent = moment ? { k: 'moment', kept } : { k: 'tap', over: p.over, caught };
    s.card[p.hole - 1]?.push(ev);
    // A line decided with a tap, then changed before the swing, or the boring target
    // said and the flag swung at: the record shows it faded
    if (ev.k === 'tap') game.watchLine(() => (ev.moved = true), caught);
    ripple(moment);
    status.textContent = moment ? (kept ? 'Kept.' : 'Moment marked.') : caught ? 'Caught.' : 'Tap.';
  }

  // Press is a tap, hold is a moment. The keyboard presses with Enter or Space on the
  // button, or F anywhere in the band. A pointer press ends in a click the button would
  // otherwise count again; that flag is cleared after the click, or when no click comes
  let held: number | undefined;
  let fromPointer = false;
  flic.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    fromPointer = true;
    setDown(true);
    game.armLine();
    held = window.setTimeout(() => {
      held = undefined;
      press(true);
    }, HOLD);
  });
  const release = () => {
    window.setTimeout(() => (fromPointer = false), 0);
    if (!down) return;
    setDown(false);
    if (held === undefined) return;
    clearTimeout(held);
    held = undefined;
    press(false, tryCatch());
  };
  // Let go without a tap. The armed line can stay: the next press arms its own
  const cancel = () => {
    setDown(false);
    clearTimeout(held);
    held = undefined;
  };
  flic.addEventListener('pointerup', release);
  flic.addEventListener('pointercancel', () => {
    fromPointer = false;
    cancel();
  });
  // Sliding off the button is a change of mind, not a tap. A touch only leaves after it
  // lifts, by when it's already counted. The mouse can come back and lift on the button,
  // which still clicks, so the flag stays up until that lift, wherever it lands
  flic.addEventListener('pointerleave', () => {
    if (!fromPointer || !down) return;
    cancel();
    window.addEventListener('pointerup', () => window.setTimeout(() => (fromPointer = false), 0), {
      once: true,
    });
  });
  flic.addEventListener('contextmenu', (e) => e.preventDefault());
  flic.addEventListener('click', () => {
    if (fromPointer) {
      fromPointer = false;
      return;
    }
    game.armLine();
    press(false, tryCatch());
  });

  let fHeld: number | undefined;
  let fDown = false;
  root.addEventListener('keydown', (e) => {
    if ((e.key !== 'f' && e.key !== 'F') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (s.stage === 'choose' || s.stage === 'sealed') return;
    e.preventDefault();
    if (e.repeat || fDown) return;
    fDown = true;
    setDown(true);
    game.armLine();
    fHeld = window.setTimeout(() => {
      fHeld = undefined;
      press(true);
    }, HOLD);
  });
  root.addEventListener('keyup', (e) => {
    if (e.key !== 'f' && e.key !== 'F') return;
    if (!fDown) return;
    fDown = false;
    setDown(false);
    if (fHeld === undefined) return;
    clearTimeout(fHeld);
    fHeld = undefined;
    press(false, tryCatch());
  });

  root.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('button');
    if (!b || b === flic || b === muteEl || sealing) return;
    if (b.dataset.pick) {
      s = { ...s, thought: Number(b.dataset.pick) };
      paint();
      return;
    }
    const a = b.dataset.act;
    if (a === 'carry') begin();
    else if (a === 'choose') {
      reset(s.thought);
      focusSoon(root.querySelector<HTMLElement>(`[data-pick="${s.thought}"]`));
    } else if (a === 'end') finish();
    else if (a === 'keep' || a === 'drop') {
      s = { ...s, verdict: a };
      paint(a);
      status.textContent = read(s);
    } else if (a === 'seal') seal();
    else if (a === 'again') {
      reset(s.thought);
      if (root.getBoundingClientRect().top < 0) root.scrollIntoView({ block: 'start', behavior: 'auto' });
      focusSoon(root.querySelector<HTMLElement>(`[data-pick="${s.thought}"]`));
    }
  });
}
