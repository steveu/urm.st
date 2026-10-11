// The round's state, and the words on the two screens after it: the record, read in one
// sentence by the app's own rules, and the sealed round (its picture is ending.ts).
// Shared by the server render and the client script.

import { THOUGHTS } from './thoughts';
import { sentence, type Verdict } from './read';
import { renumber, shownOrdinal } from './numbers';
import { mapping } from './sim';

export type Stage = 'choose' | 'round' | 'record' | 'sealed';

/** A press: notional round seconds, the hole it counts for, where the golfer stood, and
 *  whether it was made over the ball rather than on the walk */
export type Press = { t: number; hole: number; at: [number, number]; over: boolean };

/** Where a shot finished, as the card draws it */
export type Lie = 'fairway' | 'rough' | 'bunker' | 'trees' | 'green' | 'water' | 'out' | 'holed' | 'picked';
// A tap may have caught a line of the inner voice; a catch said and let go by is 'missed'
// A moment may have kept a line of the inner voice's, on the walk
export type CardEvent = { k: 'shot'; lie: Lie; putt: boolean } | { k: 'tap'; over: boolean; caught?: boolean } | { k: 'moment'; kept?: boolean } | { k: 'missed' };

export type State = {
  stage: Stage;
  thought: number;
  taps: Press[];
  moments: Press[];
  end: number;
  holesPlayed: number;
  complete: boolean;
  // Per hole, every shot and press in the order it happened
  card: CardEvent[][];
  // Notional seconds where each hole handed over to the next
  bounds: number[];
  verdict?: Verdict;
};

export const fresh = (thought: number, stage: Stage = 'choose'): State => ({
  stage,
  thought,
  taps: [],
  moments: [],
  end: 0,
  holesPlayed: 0,
  complete: false,
  card: [[], [], []],
  bounds: [],
});

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');

// The composer reads holes 1 to 3, as it was built to; the holes are shown as the 11th to
// the 13th, so its hole ordinals are renumbered afterwards (numbers.ts says why)
export function read(s: State) {
  return renumber(sentence({
    thought: THOUGHTS[s.thought].name,
    taps: s.taps.map((x) => x.t),
    end: s.end,
    verdict: s.verdict,
    // Each tap keeps the hole it was pressed on, and the card has par for all three
    mapping: mapping(
      s.taps.map((x) => x.hole),
      s.holesPlayed,
    ),
  }));
}

const SAY: Record<Lie, string> = {
  fairway: 'fairway',
  rough: 'rough',
  bunker: 'bunker',
  trees: 'trees',
  green: 'green',
  water: 'water',
  out: 'out',
  holed: 'holed',
  picked: 'picked up',
};

// The card: a row a hole, one glyph per event in the order it happened. Shots are
// squares, putts pale squares, taps ticks, moments diamonds; a tap that caught a line is
// stamped, a catch let go by is a faint hollow tick, and a moment kept is edged in gold.
// No totals
// What the key line's tap means, by the thought: its word on the card's key, in words for
// a screen reader, and for one let go by
const KEY_WORDS: Record<string, { k: string; tap: string; miss: string }> = {
  'The Heckler': { k: 'got me', tap: 'a tap as it showed', miss: 'it showed, let pass' },
  'Commit to the Line': { k: 'decided', tap: 'a tap as you decided', miss: 'a pick let pass' },
  'Pins Are a Psyop': { k: 'boring', tap: 'a tap for the boring target', miss: 'the boring target, let pass' },
};

function card(s: State) {
  const rows = s.card.slice(0, Math.max(s.holesPlayed, 1));
  const kw = KEY_WORDS[THOUGHTS[s.thought].name] ?? { k: 'caught', tap: 'a tap that caught the line', miss: 'a line let pass' };
  const glyph = (e: CardEvent) =>
    e.k === 'shot'
      ? e.lie === 'picked'
        ? '<i class="g pk"></i>'
        : `<i class="g ${e.putt ? 'pt' : `s-${e.lie}`}"></i>`
      : e.k === 'tap'
        ? e.caught
          ? '<u class="ck"></u>'
          : `<u class="tk${e.over ? ' over' : ''}"></u>`
        : e.k === 'missed'
          ? '<u class="ck miss"></u>'
          : `<s class="dm${e.kept ? ' kept' : ''}"></s>`;
  const words = (e: CardEvent) =>
    e.k === 'shot'
      ? e.putt
        ? e.lie === 'holed'
          ? 'putt, holed'
          : 'putt'
        : SAY[e.lie]
      : e.k === 'tap'
        ? e.caught
          ? kw.tap
          : e.over
            ? 'tap over the ball'
            : 'tap'
        : e.k === 'missed'
          ? kw.miss
          : e.kept
            ? 'a moment kept'
            : 'moment';
  const all = rows.flat();
  const caught = all.some((e) => e.k === 'tap' && e.caught);
  const missed = all.some((e) => e.k === 'missed');
  const moments = all.some((e) => e.k === 'moment');
  const kept = all.some((e) => e.k === 'moment' && e.kept);
  const said = rows.map((r, i) => `${shownOrdinal(i + 1)}: ${r.length ? r.map(words).join(', ') : 'nothing'}.`).join(' ');
  return `<div class="rows" aria-hidden="true">${rows.map((r, i) => `<span class="hn">${shownOrdinal(i + 1)}</span><span class="d">${r.map(glyph).join('')}</span>`).join('')}</div>
    <p class="key" aria-hidden="true"><i class="g s-fairway"></i> shot <i class="g pt"></i> putt <u class="tk"></u> tap${caught ? ` <u class="ck"></u> ${kw.k}` : ''}${missed ? ' <u class="ck miss"></u> let pass' : ''}${moments ? ' <s class="dm"></s> moment' : ''}${kept ? ' <s class="dm kept"></s> kept' : ''}</p>
    <p class="visually-hidden">${said}</p>`;
}

export function recordHtml(s: State) {
  return `<p class="k">The record</p>
    ${card(s)}
    <p class="read">${esc(read(s))}</p>
    <p class="ask">Did it earn another round?</p>
    <div class="kd">${(['keep', 'drop'] as const).map((v) => `<button type="button" class="pb small" data-act="${v}" aria-pressed="${s.verdict === v}">${v}</button>`).join('')}</div>
    <button type="button" class="pb seal" data-act="seal"${s.verdict ? '' : ' disabled'}>Seal the round</button>`;
}

// The verdict clause is set on its own line, with a brass pixel rule under it
function sealedSentence(s: State) {
  const whole = read(s);
  const clause = ['Keeping the thought.', 'Dropping the thought.'].find((c) => whole.endsWith(c));
  const lead = clause ? whole.slice(0, -clause.length).trim() : whole;
  return `${esc(lead)}${clause ? `<br/><span class="v">${clause}</span>` : ''}`;
}

export function sealedHtml(s: State) {
  return `<p class="eb">The round, sealed</p>
    <p class="s">${sealedSentence(s)}</p>
    <p class="c">${s.verdict === 'drop' ? 'the thought is set down' : 'the thought carries'}</p>
    <p class="d">${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    <button type="button" class="pb again" data-act="again">play another</button>`;
}

/** The One Thought mark: a ring, a diamond, a dot */
export const MARK = `<circle cx="15" cy="15" r="13"/><rect x="9" y="9" width="12" height="12" rx="2" transform="rotate(45 15 15)"/><circle cx="15" cy="15" r="1.8" fill="currentColor" stroke="none"/>`;
