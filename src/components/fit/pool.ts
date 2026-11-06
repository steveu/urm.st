// The pool beside the sheet: the funnel's counts as bars, then its roles, listed by company.
// What Jev left, or what it ruled out with its reason; never ranked. Everything here is site
// copy or a board's own title, company and place, escaped. Drawn in the browser from the
// funnel's answer (src/fit/finder/handler.ts).
import type { ScreenId } from '../../fit/finder/screen.ts';
import { SCREEN_SHORT } from '../../fit/finder/screen-copy.ts';
import { escapeHtml } from './result.ts';

export interface PoolRole {
  company: string;
  board: string;
  title: string;
  places: string[];
  link: string;
  reason?: ScreenId;
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
const pct = (part: number, whole: number) => `${whole ? Math.max((100 * part) / whole, 0.8).toFixed(1) : 0}%`;

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

/**
 * The funnel: one centred bar per step, to scale against every role read, so the pool visibly
 * narrows. Behind each bar, faint, is the width it came from: what that step took away. Jev's
 * step shows what it ruled out in clay. Each bar starts at the width above it, so the band can
 * draw the narrowing in (the `narrow` class).
 */
export function funnelHtml(f: Pool, now = Date.now()): string {
  const steps: Array<{ count: number; words: string; by: string; tone?: string }> = [
    { count: f.listed, words: `roles on ${n(f.boards.read)} public job boards`, by: 'read' },
    { count: f.inScope, words: 'engineering, design or product', by: 'title rule' },
    { count: f.open, words: 'open to the UK', by: 'place rule' },
  ];
  let note: string;
  if (f.screening) {
    const screened = f.left.length + f.ruledOut.length;
    steps.push({ count: f.left.length, words: `left; Jev ruled out ${n(f.ruledOut.length)}`, by: 'Jev', tone: 'jev' });
    const missed = f.unscreened ? ` It couldn’t answer for ${n(f.unscreened)}, so they’re left out.` : '';
    note = `Read ${ago(f.at, now)}. Jev screened ${n(screened)} roles in ${(f.screening.ms / 1000).toFixed(1)}s, for ${usd(f.screening.costUsd)}.${missed}`;
  } else {
    note = `Read ${ago(f.at, now)}. ${f.screenFailed ? 'Jev couldn’t screen them just now, so every one is listed.' : 'Jev isn’t screening them here, so every one is listed.'}`;
  }
  const rows = steps.map((s, i) => {
    const from = pct(i ? steps[i - 1].count : s.count, f.listed);
    return (
      `<li${s.tone ? ` class="${s.tone}"` : ''} style="--i:${i};--from:${from};--w:${pct(s.count, f.listed)}">` +
      `<span class="track" aria-hidden="true"><span class="was"></span><span class="bar"></span></span>` +
      `<span class="cap"><b>${n(s.count)}</b> ${s.words} <i class="by">${s.by}</i></span></li>`
    );
  });
  return `<ol class="funnel-bars">${rows.join('')}</ol><p class="funnel-note">${note}</p>`;
}

export type PoolView = 'left' | 'out';

/** The first place listed, and how many more: Greenhouse puts several in one field, split by semicolons. */
function place(places: string[]): string {
  const all = places.flatMap((p) => p.split(';')).map((p) => p.trim()).filter(Boolean);
  return all.length ? `${all[0]}${all.length > 1 ? ` +${all.length - 1}` : ''}` : '';
}

/** One view of the pool, filtered, grouped under each company. The open role is marked. */
export function poolListHtml(roles: PoolRole[], o: { filter?: string; current?: string | null }): string {
  const q = (o.filter ?? '').trim().toLowerCase();
  const shown = q ? roles.filter((r) => `${r.title} ${r.company}`.toLowerCase().includes(q)) : roles;
  if (!shown.length) return `<p class="none">${q ? 'Nothing matches that.' : 'None.'}</p>`;
  const out: string[] = [];
  let company: string | null = null;
  for (const r of shown) {
    if (r.company !== company) {
      if (company !== null) out.push('</ul>');
      company = r.company;
      out.push(`<p class="co">${escapeHtml(r.company)}</p><ul>`);
    }
    const why = r.reason ? `<span class="rw">${escapeHtml(SCREEN_SHORT[r.reason])} · ${r.p!.toFixed(2)}</span>` : `<span class="rp">${escapeHtml(place(r.places))}</span>`;
    const cur = r.link === o.current ? ' aria-current="true"' : '';
    out.push(`<li><button type="button" data-link="${escapeHtml(r.link)}"${cur}><span class="rt">${escapeHtml(r.title)}</span>${why}</button></li>`);
  }
  out.push('</ul>');
  return out.join('');
}
