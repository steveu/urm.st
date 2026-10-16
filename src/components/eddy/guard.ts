// The home page's guard toy. The rubric dimensions, age limits and verdict rules
// are Eddy's real ones (rubric v1.3); the links and their scores are made up.
//
// Pure and deterministic, so the server render and the client script agree.

export const DIMS = ['Language', 'Violence', 'Frightening', 'Sexual', 'Substances', 'Dangerous acts', 'Commercial', 'Attitude'];

export const BANDS = ['Under 10', '10–12', '13–15'];

// The highest score each dimension may reach, per band, in DIMS order
const LIMITS = [
  [1, 1, 1, 0, 0, 1, 1, 1],
  [2, 1, 1, 1, 1, 1, 1, 1],
  [2, 2, 2, 1, 1, 2, 2, 1],
];

// A loot-box flag on a kid's request asks a grown-up under 10, and is allowed after
const LOOT_BOX_ESCALATES = [true, false, false];

export type Verdict = 'clear-yes' | 'uncertain' | 'clear-no';
export type Choice = 'allow' | 'unsafe' | 'not-for-us';

// `saw` is the guard's short written reason, as a parent's Decisions card shows it.
// `seen` is the family's own history with the channel, from past decisions, not the guard.
export type Sample = { title: string; channel: string; seen: string; colour: string; dur: string; scores: number[]; lootBox?: boolean; saw: string };

export const SAMPLES: Sample[] = [
  { title: 'How do volcanoes actually work?', channel: 'Magma Desk', seen: '3 allowed', dur: '14:02', colour: '#c9653a', scores: [0, 0, 1, 0, 0, 0, 0, 0], saw: 'A science explainer. One short eruption clip, nothing graphic.' },
  { title: 'Losing it at the final boss', channel: 'Boss Rush Benny', seen: '1 allowed, 1 not for us', dur: '18:20', colour: '#4f7a8a', scores: [2, 0, 0, 0, 0, 0, 0, 1], saw: 'Gameplay with regular swearing when the player loses, mostly mild.' },
  { title: 'Opening 50 mystery packs!!', channel: 'Pack Party', seen: '2 not for us', dur: '22:41', colour: '#8b5fa6', scores: [1, 0, 0, 0, 0, 0, 2, 1], lootBox: true, saw: 'Opens paid card packs, loot-box style, with constant hype about rare pulls.' },
  { title: 'Parkour roof run, POV', channel: 'Rooftop Crew', seen: 'New channel', dur: '8:15', colour: '#5e7f5a', scores: [0, 0, 1, 0, 0, 2, 0, 1], saw: 'Rooftop running filmed first-person, with jumps between buildings that kids copy.' },
  { title: 'Scariest things caught on camera at 3am', channel: 'After Midnight Files', seen: 'New channel', dur: '11:37', colour: '#3f4a5a', scores: [1, 1, 3, 0, 0, 0, 0, 1], saw: 'Clips edited to frighten, with jump scares and creepy music throughout.' },
];

export const START = { sample: 0, band: 1 };

export const limitsFor = (band: number) => LIMITS[band];

// Over a limit by one asks a grown-up; by two or more is a clear no. A step can
// only make the verdict stricter.
export function decide(s: Sample, band: number) {
  const limits = LIMITS[band];
  let verdict: Verdict = 'clear-yes';
  const lines: string[] = [];
  let worst = -1;
  for (const [i, score] of s.scores.entries()) {
    const over = score - limits[i];
    if (over <= 0) continue;
    const v: Verdict = over >= 2 ? 'clear-no' : 'uncertain';
    if (v === 'clear-no' && worst < 0) worst = i;
    lines.push(`${DIMS[i]} ${score}, limit ${limits[i]} <span class="arrow">→</span> ${over >= 2 ? 'two over' : 'one over'}`);
    if (v === 'clear-no' || verdict === 'clear-yes') verdict = v;
  }
  if (s.lootBox) {
    if (LOOT_BOX_ESCALATES[band]) {
      lines.push('Loot-box flag <span class="arrow">→</span> asks a grown-up under 10');
      if (verdict === 'clear-yes') verdict = 'uncertain';
    } else {
      lines.push('<span class="quiet">Loot-box flag: allowed from 10</span>');
    }
  }
  if (!lines.some((l) => !l.startsWith('<span class="quiet">'))) {
    lines.unshift(`Every score within the limits for ${BANDS[band].toLowerCase()}`);
  }
  return { verdict, lines, worst };
}

const VERDICT_WORD: Record<Verdict, string> = { 'clear-yes': 'clear yes', uncertain: 'uncertain', 'clear-no': 'clear no' };

// The kid's side of the reason, in their words
const REASON = [
  'There’s strong language in it,',
  'There’s violence in it,',
  'It’s made to be frightening,',
  'There’s grown-up content in it,',
  'It’s about drinking or drugs,',
  'It shows dangerous stunts people copy,',
  'It’s mostly selling things,',
  'It’s got a mean attitude,',
];

export function verdictHtml(s: Sample, band: number) {
  const d = decide(s, band);
  return `<p class="verdict ${d.verdict}"><span class="chip">${VERDICT_WORD[d.verdict]}</span></p>
    <ul class="why">${d.lines.map((l) => `<li>${l}</li>`).join('')}</ul>`;
}

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const MEANS: Record<Choice, string> = {
  allow: 'Allowed, so it goes to the kid now.',
  unsafe: 'Unsafe is a safety call, the only kind the guard is measured on.',
  'not-for-us': 'Not for us is a taste call. It shapes the feed and never counts against the guard.',
};

// The app's own icons for each answer (check, shield, thumbs-down)
const ICON: Record<Choice, string> = {
  allow: '<path d="M20 6 9 17l-5-5"/>',
  unsafe:
    '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
  'not-for-us':
    '<path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/>',
};

const CHOICES: [Choice, string][] = [
  ['allow', 'Allow'],
  ['unsafe', 'Unsafe'],
  ['not-for-us', 'Not for us'],
];

// Eddy's app icon, small, for the notification
const APP_ICON = `<svg class="app" viewBox="0 0 512 512" aria-hidden="true"><rect width="512" height="512" rx="115" fill="#1b2a41"/><rect x="40" y="40" width="432" height="432" rx="105" fill="#21405a"/><rect x="88" y="88" width="336" height="336" rx="92" fill="#2b6377"/><rect x="136" y="136" width="240" height="240" rx="72" fill="#4e9ca0"/><path d="M228 208V304L308 256Z" fill="#faf6ec" stroke="#faf6ec" stroke-width="20" stroke-linejoin="round"/></svg>`;

// The parent's push notification, long-pressed as on iOS 27: the notification lifts out
// of the stack and the three answers open beneath it. Quiet when the guard was sure.
export function parentHtml(s: Sample, band: number, choice?: Choice) {
  const d = decide(s, band);
  if (d.verdict === 'clear-yes') return '<p class="quiet">Never reaches a parent. The guard was sure.</p>';
  if (d.verdict === 'clear-no') return '<p class="quiet">Only reaches a parent if the kid asks for it.</p>';
  return `<div class="ios">
      <div class="note">
        ${APP_ICON}
        <div class="body">
          <p class="head">Alex asked to watch</p>
          <p class="v">${esc(s.title)}</p>
          <p class="ch">${esc(s.channel)} · ${s.seen}</p>
          <p class="saw">${esc(s.saw)}</p>
        </div>
        <span class="thumb" style="background:${s.colour}"><span class="dur">${s.dur}</span></span>
      </div>
      <div class="actions${choice ? ' chosen' : ''}">${CHOICES.map(([k, label]) => `<button type="button" data-choice="${k}" aria-pressed="${choice === k}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>${label}</button>`).join('')}</div>
    </div>
    ${choice ? `<p class="means">${MEANS[choice]}</p>` : ''}`;
}

export function kidState(s: Sample, band: number, choice?: Choice) {
  const d = decide(s, band);
  if (d.verdict === 'clear-yes' || choice === 'allow') return { tone: 'yes', label: 'Ready', reason: '' };
  if (d.verdict === 'clear-no') {
    return {
      tone: 'no',
      label: 'Not available',
      reason: `${REASON[d.worst]} and that’s past the line for your age. You can ask a grown-up to approve it.`,
    };
  }
  if (choice) return { tone: 'no', label: 'Not available', reason: 'Blocked by a parent' };
  return { tone: 'wait', label: 'Waiting for a grown-up', reason: '' };
}

// The kid's Feed card for what they asked for, and where it stands
export function kidHtml(s: Sample, band: number, choice?: Choice) {
  const k = kidState(s, band, choice);
  const play = k.tone === 'yes' ? '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M3 2v6l5-3z" fill="currentColor"/></svg>' : '';
  return `<div class="kcard ${k.tone}">
      <span class="thumb" style="background:${s.colour}">${play}<span class="dur">${s.dur}</span></span>
      <span><span class="t">${esc(s.title)}</span><span class="m"><span class="pill">You asked</span> <span class="st">${k.label}</span></span></span>
    </div>
    ${k.reason ? `<p class="reason">${k.reason}</p>` : ''}`;
}

export function announce(s: Sample, band: number, choice?: Choice) {
  const d = decide(s, band);
  const k = kidState(s, band, choice);
  return `${s.title}, age ${BANDS[band]}: ${VERDICT_WORD[d.verdict]}. For the kid: ${k.label}.`;
}
