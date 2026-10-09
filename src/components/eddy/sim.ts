// Illustrative inputs for the home demo. The rubric dimensions, verdict shape and
// screens follow the real app; titles and scores are made up.
//
// Everything here is pure and deterministic, so the server render and the
// client script compute identical states.

export const DIMS = ['Language', 'Violence', 'Frightening', 'Sexual', 'Substances', 'Dangerous acts', 'Commercial', 'Attitude'];

export type Verdict = 'clear-yes' | 'uncertain' | 'clear-no';

export type Sample = {
  title: string;
  meta: string;
  colour: string;
  scores: number[];
  flags: string;
  reason?: string;
};

export const SAMPLES: Sample[] = [
  { title: 'How do volcanoes actually work?', meta: 'science · 14 min', colour: '#c9653a', scores: [0, 0, 1, 0, 0, 0, 0, 0], flags: 'none' },
  { title: 'Opening 50 mystery packs!!', meta: 'gaming · 22 min', colour: '#8b5fa6', scores: [1, 0, 0, 0, 0, 0, 2, 1], flags: 'loot-box' },
  {
    title: 'Scariest things caught on camera at 3am',
    meta: 'entertainment · 11 min',
    colour: '#3f4a5a',
    scores: [1, 1, 3, 0, 0, 0, 0, 1],
    flags: 'none',
    reason: 'It’s made to be frightening, and that’s past the line for your age. A grown-up can still say yes.',
  },
  { title: 'Parkour roof run, POV', meta: 'sport · 8 min', colour: '#5e7f5a', scores: [0, 0, 1, 0, 0, 2, 0, 1], flags: 'none' },
  { title: 'Building a working lock in redstone', meta: 'gaming · 12 min', colour: '#4f7a8a', scores: [0, 0, 0, 0, 0, 0, 0, 0], flags: 'none' },
  { title: 'Why do cats knock things off tables?', meta: 'animals · 6 min', colour: '#b0884a', scores: [0, 0, 0, 0, 0, 0, 0, 0], flags: 'none' },
  {
    title: 'Insane car crash compilation 2026',
    meta: 'entertainment · 15 min',
    colour: '#6a3b3b',
    scores: [2, 3, 2, 0, 0, 1, 0, 1],
    flags: 'none',
    reason: 'There’s real crashes and people getting hurt, and that’s past the line for your age. A grown-up can still say yes.',
  },
  { title: 'Drawing a dragon in 10 minutes', meta: 'art · 10 min', colour: '#7d6aa8', scores: [0, 0, 0, 0, 0, 0, 0, 0], flags: 'none' },
];

// Per age band, the highest score each dimension may reach before the verdict
// stops being clear-yes. Shape follows the real limits table; values are illustrative.
const LIMITS_10_12 = [1, 1, 1, 0, 0, 1, 1, 1];

export function verdictFromScores(scores: number[], flags: string): Verdict {
  if (scores.some((v, i) => v >= 3 || v > LIMITS_10_12[i] + 1)) return 'clear-no';
  if (flags !== 'none' || scores.some((v, i) => v > LIMITS_10_12[i])) return 'uncertain';
  return 'clear-yes';
}

export const scoreLine = (s: Sample) =>
  s.scores
    .map((v, i) => (v > 0 ? `${DIMS[i]} ${v}` : ''))
    .filter(Boolean)
    .join(' · ') + (s.flags !== 'none' ? ` · flag: ${s.flags}` : '');

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

// ---------------------------------------------------------------------------
// State. A step runs the next sample through the guard; a decision is a parent's tap.

export type ItemStatus = 'ready' | 'waiting' | 'unsafe' | 'not-for-us';
export type FeedItem = { sample: Sample; status: ItemStatus; isNew?: boolean };
export type Decision = 'ready' | 'unsafe' | 'not-for-us';
export type LogLine = { html: string; kind: 'guard' | 'parent' | 'end' };
export type SimState = { i: number; tick: number; feed: FeedItem[]; pending: Sample[]; done?: Decision };

// The log's clock: a fixed afternoon, with fixed gaps between lines
const START = 16 * 3600 + 40 * 60;
const GAPS = [41, 73, 58, 96, 37, 64, 88, 52, 71, 45, 83, 60, 49, 77]; // cycled

const clock = (tick: number) => {
  let t = START;
  for (let k = 0; k <= tick; k++) t += GAPS[k % GAPS.length];
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
};

const ts = (tick: number) => `<span class="ts">${clock(tick)}</span>`;

const shortScores = (s: Sample) =>
  s.scores
    .map((v, k) => (v > 0 ? `${DIMS[k].toLowerCase()} ${v}` : ''))
    .filter(Boolean)
    .join(' · ') || 'all 0';

const OUTCOME: Record<Verdict, string> = { 'clear-yes': 'to Today', uncertain: 'to a parent', 'clear-no': 'not shown' };

export const initialState = (): SimState => ({ i: 0, tick: 0, feed: [], pending: [] });
export const finished = (s: SimState) => s.i >= SAMPLES.length;

export function step(s: SimState): { state: SimState; line: LogLine } {
  if (finished(s)) {
    return {
      state: { ...s, tick: s.tick + 1 },
      line: { kind: 'end', html: `${ts(s.tick)} <span class="dim">queue empty · waiting for the next link</span>` },
    };
  }
  const sample = SAMPLES[s.i];
  const v = verdictFromScores(sample.scores, sample.flags);
  const next: SimState = { ...s, i: s.i + 1, tick: s.tick + 1 };
  if (v === 'clear-yes') next.feed = [{ sample, status: 'ready', isNew: true }, ...s.feed];
  if (v === 'uncertain') {
    next.feed = [{ sample, status: 'waiting', isNew: true }, ...s.feed];
    next.pending = [...s.pending, sample];
    next.done = undefined;
  }
  const flag = sample.flags !== 'none' ? ` · flag ${sample.flags}` : '';
  return {
    state: next,
    line: {
      kind: 'guard',
      html: `${ts(s.tick)} <span class="q">“${esc(sample.title)}”</span><br><span class="sc">${shortScores(sample)}${flag}</span> <span class="v ${v}">→ ${v}</span> <span class="dim">${OUTCOME[v]}</span>`,
    },
  };
}

const PARENT: Record<Decision, [string, string, string]> = {
  ready: ['allow', 'clear-yes', 'eval label: safe · measures the guard'],
  unsafe: ['unsafe', 'clear-no', 'eval label: unsafe · measures the guard'],
  'not-for-us': ['not for us', 'taste', 'taste, not safety · outside the eval'],
};

export function decide(s: SimState, d: Decision): { state: SimState; line: LogLine } | null {
  const [sample, ...pending] = s.pending;
  if (!sample) return null;
  const feed = s.feed.map((f) => (f.sample === sample ? { ...f, status: d } : f));
  const [word, cls, note] = PARENT[d];
  return {
    state: { ...s, tick: s.tick + 1, feed, pending, done: d },
    line: {
      kind: 'parent',
      html: `${ts(s.tick)} <span class="who">parent</span> <span class="q">“${esc(sample.title)}”</span> <span class="v ${cls}">→ ${word}</span> <span class="dim">${note}</span>`,
    },
  };
}

export const SEED_STEPS = 3; // volcano (clear-yes), mystery packs (uncertain), 3am (clear-no)

export function seeded(): { state: SimState; lines: LogLine[] } {
  let state = initialState();
  const lines: LogLine[] = [];
  for (let k = 0; k < SEED_STEPS; k++) {
    const r = step(state);
    state = r.state;
    lines.push(r.line);
  }
  return { state, lines };
}

// ---------------------------------------------------------------------------
// Phone screens. Each returns the inner HTML for a `.eddy-screen` element.

const PILL: Record<'ready' | 'waiting', [string, string]> = {
  ready: ['You asked', 'ready'],
  waiting: ['Waiting for a grown-up', 'waiting'],
};

const play = `<span class="ep-play"><svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span>`;

export function todayScreen(items: FeedItem[]) {
  // Unsafe and Not for us drop out of Today; there's no cap, older items slide under the fade
  const visible = items.filter((i) => i.status === 'ready' || i.status === 'waiting');
  const [hero, ...rest] = visible;
  const card = (i: FeedItem, big: boolean) => {
    const [label, kind] = PILL[i.status as 'ready' | 'waiting'];
    const dim = i.status === 'ready' ? '' : ' ep-dim';
    return big
      ? `<div class="ep-card${i.isNew ? ' ep-in' : ''}">
          <span class="ep-thumb${dim}" style="background:${i.sample.colour}">${i.status === 'ready' ? play : ''}</span>
          <span class="ep-card-body">
            <span class="ep-pill ep-pill-${kind}">${label}</span>
            <span class="ep-title">${esc(i.sample.title)}</span>
            <span class="ep-meta">${i.status === 'ready' ? i.sample.meta.split(' · ')[1] + ' · just now' : 'A grown-up will look soon'}</span>
          </span>
        </div>`
      : `<div class="ep-row${i.isNew ? ' ep-in' : ''}">
          <span class="ep-thumb ep-thumb-sm${dim}" style="background:${i.sample.colour}"></span>
          <span class="ep-row-body">
            <span class="ep-title ep-title-sm">${esc(i.sample.title)}</span>
            <span class="ep-pill ep-pill-${kind}">${label}</span>
          </span>
        </div>`;
  };
  return `<div class="ep-pad ep-today">
    <div class="ep-today-head"><span class="ep-logo"></span><span class="ep-head-title">Today</span></div>
    ${hero ? card(hero, true) : `<p class="ep-body ep-empty">Nothing yet. Share a link to ask for one.</p>`}
    <div class="ep-list">${rest.map((i) => card(i, false)).join('')}</div>
    <p class="ep-end">That’s today.</p>
  </div>`;
}

const DONE: Record<Decision, [string, string]> = {
  ready: ['Allowed.', 'Kept to measure the guard, never to train it.'],
  unsafe: ['Marked unsafe.', 'Kept to measure the guard, never to train it.'],
  'not-for-us': ['Not for us.', 'Taste, not safety. Kept for the feed, not the guard.'],
};

// `enter` animates the waiting card in; the client sets it only when a new card arrives
export function decisionsScreen(pending: Sample[], done?: Decision, opts: { disabled?: boolean; enter?: boolean } = {}) {
  const s = pending[0];
  const off = opts.disabled ? ' disabled' : '';
  return `<div class="ep-pad ep-decisions">
    <p class="ep-title ep-title-xl">Decisions</p>
    <div class="ep-seg"><span class="on">Today</span><span>Catch-up</span><span>Review</span></div>
    ${
      done
        ? `<div class="ep-card ep-done ep-in"><span class="ep-done-line">${DONE[done][0]}</span><span class="ep-meta">${DONE[done][1]}</span></div>`
        : s
          ? `<div class="ep-card ep-ask${opts.enter ? ' ep-in' : ''}">
              <span class="ep-pill ep-pill-waiting">A kid asked · 10–12</span>
              <span class="ep-thumb" style="background:${s.colour}"></span>
              <span class="ep-title" id="ep-ask-title">${esc(s.title)}</span>
              <span class="ep-guard"><b>Guard</b> · uncertain<br>${esc(scoreLine(s))}</span>
              <span class="ep-actions">
                <button type="button" class="ep-allow" data-decide="ready" aria-describedby="ep-ask-title"${off}>Allow</button>
                <button type="button" class="ep-unsafe" data-decide="unsafe" aria-describedby="ep-ask-title"${off}>Unsafe</button>
                <button type="button" class="ep-nfu" data-decide="not-for-us" aria-describedby="ep-ask-title"${off}>Not for us</button>
              </span>
            </div>
            ${pending.length > 1 ? `<p class="ep-meta ep-more">${pending.length - 1} more waiting</p>` : ''}`
          : `<p class="ep-body ep-empty">Nothing waiting.</p>`
    }
  </div>`;
}
