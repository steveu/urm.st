// The fit check's result, as HTML, for the band: rendered at build time for the samples and
// in the browser for a pasted posting, so both look the same. Every word is either site copy
// from src/fit/copy.ts or a quote from the posting; the quotes are the visitor's own text, so
// they're always escaped, and a flagged injection quote may well contain markup.
import { INJECTION_COPY, LOCATION_COPY, REASONS, UNASSESSABLE_COPY, VERDICT_COPY, type Side, type Verdict } from '../../fit/copy.ts';
import { BOARD_LIST } from '../../fit/links.ts';
import type { FitAssessment } from '../../fit/schema.ts';

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** How many of the three marks a verdict fills: a calm scale, not a traffic light. */
export const VERDICT_LEVEL: Record<Verdict, number> = { strong: 3, possible: 2, poor: 1 };

const SIDE_LABEL: Record<Side, string> = { for: 'For', against: 'Against', mixed: 'Mixed' };

const quote = (q: string) => `<blockquote class="quote"><p><mark>${escapeHtml(q.trim())}</mark></p></blockquote>`;

const meter = (v: Verdict) =>
  `<span class="meter" aria-hidden="true">${[1, 2, 3].map((n) => `<i${n <= VERDICT_LEVEL[v] ? ' class="on"' : ''}></i>`).join('')}</span>`;

export interface ResultOptions {
  /** Says whose posting this is: a sample's title, or "Your posting". */
  label: string;
  /** Offer the contact details after a strong or possible fit. Not for the made-up samples. */
  contact?: boolean;
}

export function resultHtml(a: FitAssessment, opts: ResultOptions): string {
  const v = VERDICT_COPY[a.verdict];
  const reasons = a.reasons
    .map((r) => {
      const { side, copy } = REASONS[r.code];
      return `<li class="reason" data-side="${side}"><span class="side">${SIDE_LABEL[side]}</span><div><p class="copy">${escapeHtml(copy)}</p>${quote(r.quote)}</div></li>`;
    })
    .join('');
  const loc = `<div class="reason where"><span class="side">Location</span><div><p class="copy">${escapeHtml(LOCATION_COPY[a.location.verdict])}</p>${a.location.quote ? quote(a.location.quote) : ''}</div></div>`;
  const injection =
    a.injection.present && a.injection.quote
      ? `<div class="reason injection"><span class="side">Ignored</span><div><p class="copy">${escapeHtml(INJECTION_COPY)}</p>${quote(a.injection.quote)}</div></div>`
      : '';
  const contact =
    opts.contact && a.verdict !== 'poor'
      ? `<p class="contact">Hiring for it? <a href="mailto:steve@urm.st">steve@urm.st</a></p>`
      : '';
  return (
    `<p class="whose">${escapeHtml(opts.label)}</p>` +
    `<div class="verdict" data-verdict="${a.verdict}">${meter(a.verdict)}<h3>${escapeHtml(v.label)}</h3></div>` +
    `<p class="line">${escapeHtml(v.line)}</p>` +
    injection +
    `<ol class="reasons" aria-label="Reasons">${reasons}</ol>` +
    loc +
    contact
  );
}

export function unassessableHtml(label: string): string {
  return `<p class="whose">${escapeHtml(label)}</p><p class="plain">${escapeHtml(UNASSESSABLE_COPY)}</p>`;
}

/** What the visitor can be told when a check doesn't come back. Site copy, keyed by cause. */
export const ERROR_COPY = {
  too_short: 'That’s too short to be a job posting. Paste the whole description.',
  too_long: 'That’s more than 12,000 characters. Trim it to the job description itself.',
  rate_limited: 'That’s a few checks in a row. Try again in three minutes.',
  busy: 'The model is busy just now. Try again in a minute.',
  unavailable: 'The check isn’t available just now. The samples still work.',
  network: 'Couldn’t reach the check. Try again in a moment.',
  linkedin: 'LinkedIn links can’t be read here. Copy the job description from LinkedIn and paste that instead.',
  other_link: `That link isn’t one I can read. ${BOARD_LIST} job links work; for anything else, paste the job description.`,
  link_not_found: 'That job isn’t on the board, or is no longer listed. Check the link, or paste the job description.',
  link_failed: 'Couldn’t read that job from the board just now. Try again, or paste the job description.',
  link_too_short: 'That job’s listing has too little text to judge. Paste the job description instead.',
} as const;
export type ErrorCause = keyof typeof ERROR_COPY;

export function errorHtml(label: string, cause: ErrorCause): string {
  return `<p class="whose">${escapeHtml(label)}</p><p class="plain">${escapeHtml(ERROR_COPY[cause])}</p>`;
}

/** The two things that really happen, in order: the model reads it, then every quote is checked. */
export const STEPS = ['Reading it against my profile', 'Checking every quote against your text'] as const;

/** For a link, the first step says where the posting comes from: fetching it is part of that request. */
export const linkSteps = (board: string) =>
  [`Fetching it from ${board} and reading it against my profile`, 'Checking every quote against the posting'] as const;

export function progressHtml(label: string, step: 0 | 1, seconds = 0, steps: readonly [string, string] = STEPS): string {
  const items = steps.map((s, i) => {
    const state = i < step ? 'done' : i === step ? 'active' : 'todo';
    const time = i === 0 && step === 0 ? ` <span class="secs">${seconds}s</span>` : '';
    return `<li data-state="${state}"><span class="dot" aria-hidden="true"></span>${escapeHtml(s)}${time}</li>`;
  }).join('');
  return (
    `<p class="whose">${escapeHtml(label)}</p>` +
    `<ol class="progress">${items}</ol>` +
    `<p class="hint">Usually two to six seconds; longer if the first answer doesn’t check out and it reads again.</p>`
  );
}

/**
 * Where each quote sits in the posting, for marking it up in the samples' text. Tolerant in
 * the same ways as the quote check (case, whitespace, typographic quotes and dashes, list
 * markers), so a quote that passed the check is found. Returns non-overlapping ranges in order.
 */
export function quoteRanges(text: string, quotes: string[]): [number, number][] {
  const ranges: [number, number][] = [];
  for (const q of quotes) {
    const core = q.trim().replace(/^["'\u201c\u2018]+|["'\u201d\u2019]+$/g, '').trim().replace(/\s+/g, ' ');
    if (!core) continue;
    const pattern = [...core]
      .map((c) => {
        if (/\s/.test(c)) return '\\s+(?:[-*\u2022\u00b7][ \\t]+)?';
        if (/['\u2018\u2019\u201b\u2032]/.test(c)) return '[\'\u2018\u2019\u201b\u2032]';
        if (/["\u201c\u201d\u2033]/.test(c)) return '["\u201c\u201d\u2033]';
        if (/[-\u2010-\u2015]/.test(c)) return '[-\u2010-\u2015]';
        return c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      })
      .join('');
    const m = new RegExp(pattern, 'iu').exec(text);
    if (m) ranges.push([m.index, m.index + m[0].length]);
  }
  ranges.sort((a, b) => a[0] - b[0]);
  return ranges.filter((r, i) => i === 0 || r[0] >= ranges[i - 1][1]);
}

/** A posting's text with its quotes marked, escaped, for the samples' "Read the posting". */
export function markedPostingHtml(text: string, quotes: string[]): string {
  let out = '';
  let at = 0;
  for (const [from, to] of quoteRanges(text, quotes)) {
    out += escapeHtml(text.slice(at, from)) + `<mark>${escapeHtml(text.slice(from, to))}</mark>`;
    at = to;
  }
  return out + escapeHtml(text.slice(at));
}

/**
 * A linked posting as the check read it from the board, with its quotes marked: the visitor
 * pasted a link, so this is the only place they see the text behind the evidence.
 */
export function boardPostingHtml(text: string, quotes: string[], board: string, truncated: boolean): string {
  const cut = truncated
    ? `<p class="cut">The listing is longer than 12,000 characters, so the check read the start of it, shown here.</p>`
    : '';
  return (
    `<details class="posting"><summary>Read the posting, as read from ${escapeHtml(board)}</summary>` +
    `${cut}<div class="ptext">${markedPostingHtml(text, quotes)}</div></details>`
  );
}
