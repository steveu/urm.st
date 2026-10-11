// The read: a round's taps in, one sentence out. A port of the app's composer
// (Read/Composer.swift), checked against its test table, so the toy on the home page
// writes what the app would. Pure: the same round always reads the same.
//
// Times are seconds from the start of the round.

export type Verdict = 'keep' | 'drop';

type Pack = { floor: boolean; count: (n: number) => string };

// Each thought's authored count phrase. A floor pack is a rep log, so it never takes a
// clause: a located fact would read the count as a score.
const PACKS: Record<string, Pack> = {
  'Full Routine': { floor: false, count: (n) => (n === 0 ? 'not once' : n === 1 ? 'lost it once' : n === 2 ? 'lost it twice' : `lost it ${n} times`) },
  'The Heckler': { floor: false, count: (n) => (n === 0 ? 'not once' : n === 1 ? 'let it show once' : n === 2 ? 'let it show twice' : `let it show ${word(n)} times`) },
  'Pins Are a Psyop': { floor: false, count: (n) => (n === 0 ? 'not one' : n === 1 ? 'one tap' : `${n} taps`) },
  'Commit to the Line': { floor: true, count: (n) => (n === 0 ? 'none committed' : n === 1 ? 'one line committed' : `${n} lines committed`) },
  'One Breath': { floor: false, count: (n) => (n === 0 ? 'none marked' : n === 1 ? 'once' : word(n)) },
  'Ancient History': { floor: true, count: (n) => (n === 0 ? 'none closed' : n === 1 ? 'closed one' : `closed ${n}`) },
};

/** Where the taps fell, when the course is known. holes aligns with taps; null is unplaced. */
export type Mapping = { holes: (number | null)[]; par: Record<number, number>; holesPlayed: number };

export type Round = {
  thought: string;
  taps: number[];
  end?: number;
  feel?: number;
  gross?: number;
  verdict?: Verdict;
  mapping?: Mapping;
};

export function sentence(r: Round) {
  const pack = PACKS[r.thought];
  const holes = r.mapping?.holes ?? [];
  // Each tap keeps its hole through the sort
  const ordered = r.taps
    .map((t, i) => ({ t, i, hole: holes[i] ?? null }))
    .sort((a, b) => a.t - b.t || a.i - b.i);
  let line = `${r.thought}: ${pack.count(ordered.length)}`;
  if (!pack.floor) {
    const c = clause(ordered.map((o) => o.t), ordered.map((o) => o.hole), r.end, r.mapping);
    if (c) line += `, ${c}`;
  }
  line += '.';
  if (r.feel != null) line += ` Felt ${r.feel}/5 present.`;
  if (r.gross != null) line += ` Shot ${r.gross}.`;
  if (r.verdict) line += r.verdict === 'keep' ? ' Keeping the thought.' : ' Dropping the thought.';
  return line;
}

// One clause or none, first trigger wins: the hole clauses when the course is known,
// then the four from time alone. Space beats time.
const MAJORITY = 0.5;
const DOMINANT = 2 / 3;
const HEAVY = 3 / 4;
const BURST_CEILING = 20 * 60;
const RHYTHM_FLOOR = 90 * 60;
const QUIET_FLOOR = 60 * 60;

function clause(taps: number[], holes: (number | null)[], end: number | undefined, mapping?: Mapping) {
  if (mapping) {
    const h = mapping.holesPlayed;
    const n9 = nine(holes, h);
    const located = singleHole(holes) ?? holeRun(holes, h) ?? changepoint(holes, h, n9 != null) ?? parClass(holes, mapping) ?? n9;
    if (located) return located;
  }
  // A round never ended runs to its last tap
  const stop = Math.max(end ?? taps.at(-1) ?? 0, 0);
  return burst(taps, stop) ?? quietStretch(taps, stop) ?? timeSkew(taps, stop) ?? evenSpread(taps, stop);
}

const placed = (holes: (number | null)[]) => holes.filter((x): x is number => x != null);

function tally(holes: (number | null)[]) {
  const t = new Map<number, number>();
  for (const x of placed(holes)) t.set(x, (t.get(x) ?? 0) + 1);
  return t;
}

// One hole holds more than half the taps, or the only tap is placed
function singleHole(holes: (number | null)[]) {
  const n = holes.length;
  if (n === 1 && holes[0] != null) return `on the ${ordinal(holes[0])}`;
  if (n < 2) return null;
  const top = [...tally(holes)].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
  if (!top || !(top[1] > n * MAJORITY)) return null;
  const [hole, k] = top;
  if (k === n) return n === 2 ? `both on the ${ordinal(hole)}` : `all ${word(k)} on the ${ordinal(hole)}`;
  return `${word(k)} on the ${ordinal(hole)}`;
}

// Two to four holes in a row hold two thirds of the taps; shortest wins, then the later
function holeRun(holes: (number | null)[], played: number) {
  const n = holes.length;
  if (n < 3 || played < 2) return null;
  const counts = tally(holes);
  for (let len = 2; len <= 4; len++) {
    if (!(len < played / 2) || played < len) continue;
    let best: { start: number; k: number } | null = null;
    for (let start = 1; start <= played - len + 1; start++) {
      let k = 0;
      for (let x = start; x < start + len; x++) k += counts.get(x) ?? 0;
      if (k < n * DOMINANT) continue;
      if (start >= (best?.start ?? -Infinity)) best = { start, k };
    }
    if (!best) continue;
    const bounds = `between the ${ordinal(best.start)} and the ${ordinal(best.start + len - 1)}`;
    return best.k === n ? `all ${word(best.k)} ${bounds}` : `${word(best.k)} ${bounds}`;
  }
  return null;
}

// A quiet tail, or most taps either side of one hole. At or wide of the turn, the nine
// says it better, so the skew stands aside
function changepoint(holes: (number | null)[], played: number, deferToNine: boolean) {
  const n = holes.length;
  const m = placed(holes);
  if (n >= 3 && m.length === n) {
    const j = Math.max(...m);
    if (played - j >= 4) return `none after the ${ordinal(j)}`;
  }
  if (n < 4 || played < 6) return null;
  let best: { share: number; after: boolean; j: number } | null = null;
  for (let j = 3; j <= played - 3; j++) {
    const after = m.filter((x) => x > j).length / n;
    const before = m.filter((x) => x < j).length / n;
    for (const [share, side] of [[after, true], [before, false]] as const) {
      if (share < HEAVY) continue;
      const wins = !best ? true : share !== best.share ? share > best.share : side !== best.after ? side : j > best.j;
      if (wins) best = { share, after: side, j };
    }
  }
  if (!best) return null;
  if (deferToNine && (best.after ? best.j <= 9 : best.j >= 10)) return null;
  const side = best.after ? 'after' : 'before';
  return best.share === 1 ? `all ${side} the ${ordinal(best.j)}` : `mostly ${side} the ${ordinal(best.j)}`;
}

// Only with par for every hole played
function parClass(holes: (number | null)[], { par, holesPlayed: h }: Mapping) {
  const n = holes.length;
  if (n < 4 || h < 1) return null;
  for (let x = 1; x <= h; x++) if (par[x] == null) return null;
  const m = placed(holes);
  const allPlaced = m.length === n;
  let best: { dev: number; absence: boolean; text: string } | null = null;
  for (const [p, name] of [[3, 'threes'], [4, 'fours'], [5, 'fives']] as const) {
    let classHoles = 0;
    for (let x = 1; x <= h; x++) if (par[x] === p) classHoles++;
    const k = m.filter((x) => par[x] === p).length;
    const dev = Math.abs(k / n - classHoles / h);
    let c: { dev: number; absence: boolean; text: string } | null = null;
    if (k === 0 && allPlaced && classHoles >= 3) c = { dev, absence: true, text: `none on the par ${name}` };
    else if (k > 0 && k >= n * DOMINANT && classHoles < h / 2) c = { dev, absence: false, text: `${word(k)} on the par ${name}` };
    if (!c) continue;
    if (!best || c.dev > best.dev || (c.dev === best.dev && c.absence && !best.absence)) best = c;
  }
  return best?.text ?? null;
}

// Both nines need seven holes played
function nine(holes: (number | null)[], played: number) {
  const n = holes.length;
  if (Math.min(played, 9) < 7 || Math.max(played - 9, 0) < 7) return null;
  const m = placed(holes);
  for (const [front, name] of [[true, 'front'], [false, 'back']] as const) {
    const k = m.filter((x) => (front ? x <= 9 : x >= 10)).length;
    if (n >= 3 && k === n) return `all on the ${name} nine`;
    if (n >= 4 && k >= n * HEAVY) return `${word(k)} on the ${name} nine`;
  }
  return null;
}

// Three or more taps close together; the tightest run wins, then the later. The span
// rounds up to five minutes, so the stated fact stays true
function burst(taps: number[], span: number) {
  if (taps.length < 3) return null;
  const win = Math.min(BURST_CEILING, span / 12);
  let best: { span: number; count: number } | null = null;
  let j = 0;
  for (let i = 0; i < taps.length; i++) {
    if (j < i) j = i;
    while (j + 1 < taps.length && taps[j + 1] - taps[i] <= win) j++;
    if (j - i + 1 < 3) continue;
    if (i > 0 && taps[j] - taps[i - 1] <= win) continue;
    const s = taps[j] - taps[i];
    if (s <= (best?.span ?? Infinity)) best = { span: s, count: j - i + 1 };
  }
  if (!best) return null;
  const minutes = Math.max(5, Math.ceil(best.span / 300) * 5);
  return `${word(best.count)} inside ${word(minutes)} minutes`;
}

// The longest gap with no taps, if it's a third of the round and an hour. Rounds down to
// half-hours, so it's never longer than the truth
function quietStretch(taps: number[], end: number) {
  if (end < RHYTHM_FLOOR || taps.length < 2) return null;
  const threshold = Math.max(end / 3, QUIET_FLOOR);
  const bounds = [0, ...taps, end];
  let best: { len: number; i: number } | null = null;
  for (let i = 0; i < bounds.length - 1; i++) {
    const len = bounds[i + 1] - bounds[i];
    if (len >= threshold && len >= (best?.len ?? threshold)) best = { len, i };
  }
  if (!best) return null;
  const halves = Math.floor(best.len / 1800);
  const whole = Math.floor(halves / 2);
  const half = halves % 2 === 1;
  const duration = whole === 1 ? (half ? 'hour and a half' : 'hour') : half ? `${word(whole)} and a half hours` : `${word(whole)} hours`;
  if (best.i === 0) return `none for the first ${duration}`;
  if (best.i === bounds.length - 2) return `none in the last ${duration}`;
  return `${whole === 1 ? 'an ' : ''}${duration} without one mid-round`;
}

// Two thirds of the taps in one third of the round
function timeSkew(taps: number[], span: number) {
  if (span < RHYTHM_FLOOR || taps.length < 4) return null;
  const thirds = [0, 0, 0];
  for (const t of taps) thirds[Math.min(Math.max(Math.floor(t / (span / 3)), 0), 2)]++;
  const said = ['mostly early', 'mostly mid-round', 'mostly late on'];
  const i = thirds.findIndex((c) => c >= (taps.length * 2) / 3);
  return i < 0 ? null : said[i];
}

// No gap more than twice the mean
function evenSpread(taps: number[], span: number) {
  if (span < RHYTHM_FLOOR || taps.length < 4) return null;
  const overall = taps.at(-1)! - taps[0];
  if (overall <= 0) return null;
  const mean = overall / (taps.length - 1);
  for (let i = 0; i < taps.length - 1; i++) if (taps[i + 1] - taps[i] > mean * 2) return null;
  return 'spread across the round';
}

const SMALL = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty'.split(' ');

// Numbers in words to twenty, then digits
export const word = (n: number) => SMALL[n] ?? String(n);

export function ordinal(n: number) {
  const t = n % 100;
  const u = n % 10;
  const suffix = t >= 11 && t <= 13 ? 'th' : u === 1 ? 'st' : u === 2 ? 'nd' : u === 3 ? 'rd' : 'th';
  return `${n}${suffix}`;
}
