// The strip above the sheet: the funnel's counts drawn as one shape that narrows, step by
// step, from every role on the boards to the one on the sheet. Its thickness at each step is
// to scale; behind each narrowing, hatched, is what that step took away, in clay for what Jev
// turned down. Everything here is site copy or a number; the funnel's answer is read in the
// browser (src/fit/finder/handler.ts).
import type { TurnDown } from '../../fit/finder/screen.ts';
import { SCREEN_SHORT } from '../../fit/finder/screen-copy.ts';

export interface PoolRole {
  company: string;
  board: string;
  title: string;
  places: string[];
  link: string;
  reason?: TurnDown;
  p?: number;
}

export interface Pool {
  at: string;
  boards: { tried: number; read: number };
  listed: number;
  inScope: number;
  open: number;
  left: PoolRole[];
  ruledOut: PoolRole[];
  unscreened: number;
  screening: { model: string; ms: number; costUsd: number } | null;
  screenFailed: boolean;
}

const isRole = (r: unknown): r is PoolRole => {
  const o = r as PoolRole | null;
  return !!o && typeof o.company === 'string' && typeof o.board === 'string' && typeof o.title === 'string' && Array.isArray(o.places) && typeof o.link === 'string';
};

/** The funnel's answer, if it has the shape the band draws from; null otherwise. */
export function readPool(body: unknown): Pool | null {
  const f = (body as { funnel?: Pool } | null)?.funnel;
  if (!f || typeof f.listed !== 'number' || typeof f.inScope !== 'number' || typeof f.open !== 'number') return null;
  if (!Array.isArray(f.left) || !Array.isArray(f.ruledOut) || !f.left.every(isRole) || !f.ruledOut.every(isRole)) return null;
  if (!f.ruledOut.every((r) => r.reason && r.reason in SCREEN_SHORT && typeof r.p === 'number')) return null;
  return f;
}

const n = (x: number) => x.toLocaleString('en-GB');
const fix = (x: number) => Number(x.toFixed(2));

/** "just now", "12 minutes ago", "3 hours ago", "yesterday". */
export function ago(iso: string, now = Date.now()): string {
  const mins = Math.round((now - Date.parse(iso)) / 60_000);
  if (!Number.isFinite(mins) || mins < 2) return 'just now';
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return hours === 1 ? 'an hour ago' : `${hours} hours ago`;
  return hours < 48 ? 'yesterday' : `${Math.round(hours / 24)} days ago`;
}

const usd = (x: number) => (x < 0.01 ? 'under a cent' : `$${x.toFixed(2)}`);

interface Step {
  count: number;
  words: string;
  by: string;
  /** What this step took away is shown, hatched: clay for Jev. */
  cut?: 'rule' | 'jev';
}

export function stripSteps(f: Pool): Step[] {
  const steps: Step[] = [
    { count: f.listed, words: `roles on ${n(f.boards.read)} job boards`, by: 'read' },
    { count: f.inScope, words: 'engineering, design or product', by: 'title rule', cut: 'rule' },
    { count: f.open, words: 'open to the UK', by: 'place rule', cut: 'rule' },
  ];
  if (f.screening) steps.push({ count: f.left.length, words: `clear Jev’s bar; ${n(f.ruledOut.length)} don’t`, by: 'Jev', cut: 'jev' });
  steps.push({ count: 1, words: 'on the sheet', by: 'Haiku' });
  return steps;
}

/**
 * The narrowing shape, in percentages of its box: a plateau at each step, its thickness to
 * scale against every role read, sloping down to the next. Returned as a clip-path polygon,
 * the hatched cuts behind it, and where Jev's part begins (drawn in sage from there).
 */
export function stripShape(steps: Step[]) {
  const k = steps.length;
  const centre = (i: number) => ((i + 0.5) * 100) / k;
  const half = (100 / k) * 0.2;
  const thick = (i: number) => Math.max((steps[i].count / steps[0].count) * 92, 3);
  const top: Array<[number, number]> = [[0, 50 - thick(0) / 2]];
  steps.forEach((_, i) => {
    top.push([centre(i) - half, 50 - thick(i) / 2], [centre(i) + half, 50 - thick(i) / 2]);
  });
  top.push([100, 50 - thick(k - 1) / 2]);
  const bottom = top.map(([x, y]) => [x, 100 - y] as [number, number]).reverse();
  const polygon = [...top, ...bottom].map(([x, y]) => `${fix(x)}% ${fix(y)}%`).join(', ');
  const cuts = steps.flatMap((s, i) =>
    s.cut && i
      ? [{ kind: s.cut, left: fix(centre(i - 1) + half), width: fix(100 / k), top: fix(50 - thick(i - 1) / 2), height: fix(thick(i - 1)) }]
      : [],
  );
  const jev = steps.findIndex((s) => s.cut === 'jev');
  return { polygon, cuts, sageFrom: jev > 0 ? fix(centre(jev - 1) + half) : 100 };
}

/** The strip: the shape, then a caption under each step, then a line on when and how fast. */
export function stripHtml(f: Pool, now = Date.now()): string {
  const steps = stripSteps(f);
  const { polygon, cuts, sageFrom } = stripShape(steps);
  const hatch = cuts
    .map((c) => `<i class="cut" data-kind="${c.kind}" style="left:${c.left}%;width:${c.width}%;top:${c.top}%;height:${c.height}%"></i>`)
    .join('');
  const shape =
    `<div class="flow" aria-hidden="true">${hatch}` +
    `<i class="body" style="clip-path:polygon(${polygon});--sage:${sageFrom}%"></i></div>`;
  const caps = steps
    .map(
      (s, i) =>
        `<li style="--i:${i}"${s.cut === 'jev' ? ' class="jev"' : ''}><b>${n(s.count)}</b> <span>${s.words}</span> <i class="by">${s.by}</i></li>`,
    )
    .join('');
  let note: string;
  if (f.screening) {
    const missed = f.unscreened ? ` It couldn’t answer for ${n(f.unscreened)}, so they’re left out.` : '';
    note = `Read ${ago(f.at, now)}. Jev screened ${n(f.left.length + f.ruledOut.length)} roles in ${(f.screening.ms / 1000).toFixed(1)}s, for ${usd(f.screening.costUsd)}.${missed}`;
  } else {
    note = `Read ${ago(f.at, now)}. ${f.screenFailed ? 'Jev couldn’t screen them just now.' : 'Jev isn’t screening them here.'}`;
  }
  return `${shape}<ol class="steps-row" style="--k:${steps.length}">${caps}</ol><p class="strip-note">${note}</p>`;
}

