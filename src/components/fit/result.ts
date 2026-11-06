// The fit check's posting sheet, as HTML: rendered at build time for the samples and in the
// browser for a pasted posting or a job link, so both look the same. The posting is set on a
// sheet with each quote the answer rests on tinted in place, in the colour of the side it
// pulls; the margin carries the verdict and a note level with each passage. Unmarked stretches
// fold away. Every word is either site copy from src/fit/copy.ts or the posting's own text,
// and the posting is the visitor's: all of it is escaped, the quotes included, since a flagged
// injection may well contain markup.
import {
  INJECTION_COPY,
  LOCATION_COPY,
  REASONS,
  UNASSESSABLE_COPY,
  VERDICT_COPY,
  type LocationVerdict,
  type Side,
  type Verdict,
} from '../../fit/copy.ts';
import { BOARD_LIST } from '../../fit/links.ts';
import type { TurnDown } from '../../fit/finder/screen.ts';
import { SCREEN_SHORT } from '../../fit/finder/screen-copy.ts';
import type { FitAssessment } from '../../fit/schema.ts';

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

// ---- Finding the quotes in the posting ----

/**
 * Where each quote sits in the posting. Tolerant in the same ways as the quote check (case,
 * whitespace, typographic quotes and dashes, list markers), so a quote that passed the check
 * is found. Returns non-overlapping ranges in order.
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

type Span = [number, number];
const overlaps = (a: Span, b: Span) => a[0] < b[1] && b[0] < a[1];

/**
 * One quote's place: the checked quotes are the posting's own text, so an exact match comes
 * first, skipping passages another mark already holds; the tolerant match is the fallback.
 */
function locate(text: string, quote: string, taken: Span[]): Span | undefined {
  if (quote.trim()) {
    for (let at = text.indexOf(quote); at !== -1; at = text.indexOf(quote, at + 1)) {
      const span: Span = [at, at + quote.length];
      if (!taken.some((t) => overlaps(t, span))) return span;
    }
  }
  return quoteRanges(text, [quote])[0];
}

// ---- The marks and their notes ----

/** The colour a mark and its note carry: a side, neutral (an unclear place) or void (ignored). */
export type Tone = Side | 'neutral' | 'void';
export type MarkKind = 'reason' | 'location' | 'injection';

export const SIDE_LABEL: Record<Side, string> = { for: 'For', against: 'Against', mixed: 'Mixed' };
export const VERDICT_TONE: Record<Verdict, Tone> = { strong: 'for', possible: 'mixed', poor: 'against' };
export const LOCATION_TONE: Record<LocationVerdict, Tone> = {
  works: 'for',
  case_by_case: 'mixed',
  doesnt_work: 'against',
  unclear: 'neutral',
};

export interface Note {
  kind: MarkKind;
  tone: Tone;
  label: string;
  copy: string;
  /** Its place in reading order, for the motion: a note follows its own tint. */
  i: number;
  /** A quote that couldn't be placed on the sheet, shown with its note instead. */
  quote?: string;
  /** A mark that repeats an earlier note: tinted, with no note of its own. */
  quiet?: boolean;
  /** A lighter tint: found, but not one of the reasons the verdict rests on. */
  faint?: boolean;
  /** A short tag after the note, such as whether a second model agrees. */
  aside?: { text: string; state: string };
}

interface Mark {
  /** Where the tint starts and ends; a mark that overlaps an earlier one starts where that ends. */
  from: number;
  to: number;
  /** Where the quote starts, which decides the row its note sits beside. */
  start: number;
  note: Note;
}

function notesFor(a: FitAssessment): Array<{ quote: string | null; note: Note }> {
  const notes = a.reasons.map((r) => {
    const { side, copy } = REASONS[r.code];
    return { quote: r.quote, note: { kind: 'reason' as const, tone: side, label: SIDE_LABEL[side], copy, i: 0 } };
  });
  const v = a.location.verdict;
  const out: Array<{ quote: string | null; note: Note }> = [...notes];
  out.push({ quote: a.location.quote, note: { kind: 'location', tone: LOCATION_TONE[v], label: 'Location', copy: LOCATION_COPY[v], i: 0 } });
  if (a.injection.present) {
    out.push({ quote: a.injection.quote, note: { kind: 'injection', tone: 'void', label: 'Ignored', copy: INJECTION_COPY, i: 0 } });
  }
  return out;
}

/** The marks found on the posting, in reading order, and the notes with nothing to mark. */
function marksFor(text: string, a: FitAssessment | undefined): { marks: Mark[]; loose: Note[] } {
  if (!a) return { marks: [], loose: [] };
  const marks: Mark[] = [];
  const loose: Note[] = [];
  for (const { quote, note } of notesFor(a)) {
    const at = quote ? locate(text, quote, marks.map((m): Span => [m.from, m.to])) : undefined;
    if (at) marks.push({ from: at[0], to: at[1], start: at[0], note });
    // An unclear location has no quote; a quote that can't be placed (never expected) keeps its words
    else loose.push(quote ? { ...note, quote } : note);
  }
  marks.sort((x, y) => x.from - y.from);
  let end = 0;
  marks.forEach((m, i) => {
    m.note.i = i;
    if (m.from < end) m.from = Math.min(end, m.to);
    end = Math.max(end, m.to);
  });
  loose.forEach((n, k) => (n.i = marks.length + k));
  return { marks, loose };
}

export const PIN =
  '<svg class="pin" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 11s3.6-3.4 3.6-6.1A3.6 3.6 0 0 0 2.4 4.9C2.4 7.6 6 11 6 11Z"/><circle cx="6" cy="4.9" r="1.2"/></svg>';

function markHtml(n: Note, inner: string, first: boolean) {
  const at = `data-tone="${n.tone}" style="--i:${n.i}"`;
  if (n.kind === 'injection') return `<mark class="m-void" ${at}><s>${inner}</s></mark>`;
  if (n.kind === 'location') return `<mark class="m-loc" ${at}>${first ? PIN : ''}${inner}</mark>`;
  return `<mark class="m-tint${n.faint ? ' faint' : ''}" ${at}>${inner}</mark>`;
}

// ---- The posting as rows ----

export type RowType = 'title' | 'meta' | 'heading' | 'bullet' | 'para';

export interface Row {
  type: RowType;
  html: string;
  notes: Note[];
  /** The tone of the first mark in the row, if any. */
  tone?: Tone;
  chars: number;
  /** A blank line came before it in the posting. */
  gap: boolean;
}

const BULLET = /^[ \t]*[-*\u2022\u00b7][ \t]+/;
const LEAD = /^[ \t]*/;
/** A short, unpunctuated line on its own: a section heading such as "What you'll do". */
const isHeading = (s: string) => s.length <= 40 && !/[.:;,!?]$/.test(s);

function rowsOf(text: string, marks: Mark[]): Row[] {
  const rows: Array<Row & { bullet: boolean }> = [];
  let offset = 0;
  let gap = false;
  for (const raw of text.split('\n')) {
    const start = offset;
    offset += raw.length + 1;
    if (!raw.trim()) {
      gap = rows.length > 0;
      continue;
    }
    const bullet = BULLET.exec(raw);
    const from = start + (bullet ?? LEAD.exec(raw)!)[0].length;
    const end = start + raw.trimEnd().length;
    const content = text.slice(from, end);
    let html = '';
    let at = from;
    let tone: Tone | undefined;
    const notes: Note[] = [];
    for (const m of marks) {
      if (m.start >= start && m.start < offset) notes.push(m.note);
      if (m.to <= from || m.from >= end || m.from >= m.to) continue;
      const a0 = Math.max(m.from, from);
      const a1 = Math.min(m.to, end);
      html += escapeHtml(text.slice(at, a0)) + markHtml(m.note, escapeHtml(text.slice(a0, a1)), m.from >= from);
      at = a1;
      tone ??= m.note.tone;
    }
    html += escapeHtml(text.slice(at, end));
    const type: RowType = bullet ? 'bullet' : isHeading(content) ? 'heading' : 'para';
    rows.push({ type, html, notes, tone, chars: content.length, gap, bullet: !!bullet });
    gap = false;
  }

  // The head: a short first line is the title, and short lines straight after it (the
  // company and place, or a job board's fields) are its meta, up to the first blank line
  if (rows[0] && !rows[0].bullet && rows[0].chars <= 120) {
    rows[0].type = 'title';
    for (let i = 1; i < rows.length && i <= 4 && !rows[i].gap && !rows[i].bullet && rows[i].chars <= 100; i++) rows[i].type = 'meta';
  }
  return rows.map(({ bullet: _, ...r }) => r);
}

export type Block = { kind: 'row'; row: Row } | { kind: 'fold'; rows: Row[] };

export interface Sheet {
  /** The title and meta lines. */
  head: Row[];
  blocks: Block[];
  /** Notes with nothing to mark: an unclear location, or a quote that couldn't be placed. */
  loose: Note[];
  /** How many marks, for the motion's timing. */
  marks: number;
}

/**
 * The posting as rows, its quotes marked, each run of unmarked rows longer than a short
 * paragraph or two folded away (keeping the opening paragraph, and a heading that leads
 * straight into a marked row).
 * @param crop Show only the first this-many body rows and fold the rest: for a posting that
 *   hasn't been marked, where there's nothing to keep open.
 */
export function markUp(text: string, a?: FitAssessment, crop?: number): Sheet {
  return layout(text, marksFor(text, a), crop);
}

function layout(text: string, { marks, loose }: { marks: Mark[]; loose: Note[] }, crop?: number): Sheet {
  const rows = rowsOf(text, marks);
  const split = rows.findIndex((r) => r.type !== 'title' && r.type !== 'meta');
  const head = split === -1 ? rows : rows.slice(0, split);
  const body = split === -1 ? [] : rows.slice(split);
  const blocks: Block[] = [];

  if (crop !== undefined) {
    body.slice(0, crop).forEach((row) => blocks.push({ kind: 'row', row }));
    if (body.length > crop) blocks.push({ kind: 'fold', rows: body.slice(crop) });
    return { head, blocks, loose, marks: marks.length };
  }

  let run: Row[] = [];
  const flush = (next?: Row) => {
    if (!run.length) return;
    // The opening paragraph says what the company does: it stays, for context
    if (blocks.length === 0 && run[0].type === 'para') blocks.push({ kind: 'row', row: run.shift()! });
    if (!run.length) return;
    let keep: Row | undefined;
    if (next && run.at(-1)!.type === 'heading') keep = run.pop();
    const chars = run.reduce((n, r) => n + r.chars, 0);
    if (run.length >= 3 || chars > 240) blocks.push({ kind: 'fold', rows: run });
    else run.forEach((row) => blocks.push({ kind: 'row', row }));
    if (keep) blocks.push({ kind: 'row', row: keep });
    run = [];
  };
  for (const row of body) {
    if (row.tone || row.notes.length) {
      flush(row);
      blocks.push({ kind: 'row', row });
    } else run.push(row);
  }
  flush();
  return { head, blocks, loose, marks: marks.length };
}

// ---- Thumbnails ----

/** One bar of a thumbnail: a line of text, scaled down. */
export interface MiniLine {
  /** Width as a fraction of the sheet's measure. */
  w: number;
  type: RowType;
  tone?: Tone;
  gap: boolean;
}

/**
 * The posting as a thumbnail: every paragraph as bars of roughly its wrapped length, the
 * marked ones in their tone. Capped so a long posting still fits the little sheet.
 */
export function miniLines(text: string, a?: FitAssessment, perLine = 52, max = 15): MiniLine[] {
  const lines: MiniLine[] = [];
  for (const r of rowsOf(text, marksFor(text, a).marks)) {
    const n = Math.max(1, Math.ceil(r.chars / perLine));
    for (let i = 0; i < n; i++) {
      const rest = r.chars / perLine - i;
      lines.push({
        w: r.type === 'title' ? 0.7 : i === n - 1 ? Math.max(0.18, Math.min(1, rest)) : 1,
        type: r.type,
        tone: r.tone,
        gap: i === 0 && r.gap,
      });
    }
  }
  return lines.slice(0, max);
}

/** A thumbnail's lines: only the evidence is drawn in colour, the rest a faint trace. */
export function miniHtml(text: string, a?: FitAssessment): string {
  const lines = miniLines(text, a)
    .map((l) => `<i data-type="${l.type}"${l.tone ? ` data-tone="${l.tone}"` : ''}${l.gap ? ' data-gap' : ''} style="--w:${Math.round(l.w * 100)}%"></i>`)
    .join('');
  return `<span class="body">${lines}</span>`;
}

// ---- The sheet ----

/** The verdict's glyph: a full disc, a half and an open ring, so the level reads without colour. */
const STATUS: Record<Verdict, string> = {
  strong: '<circle cx="7" cy="7" r="5.25" class="fill"/>',
  possible: '<circle cx="7" cy="7" r="5.25"/><path d="M7 1.75a5.25 5.25 0 0 1 0 10.5Z" class="fill"/>',
  poor: '<circle cx="7" cy="7" r="5.25"/>',
};

const CHEVRON = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4.5 3 7.5 6l-3 3"/></svg>';

function noteHtml(n: Note, lead: boolean): string {
  if (n.quiet) return '';
  const words = n.kind === 'location' ? `${PIN}<p>${escapeHtml(n.copy)}</p>` : `<p><b>${escapeHtml(n.label)}</b> ${escapeHtml(n.copy)}</p>`;
  const quote = n.quote ? `<blockquote>${escapeHtml(n.quote)}</blockquote>` : '';
  const aside = n.aside ? `<p class="aside" data-state="${escapeHtml(n.aside.state)}">${escapeHtml(n.aside.text)}</p>` : '';
  return `<div class="note${lead ? ' lead' : ''}" data-kind="${n.kind}" data-tone="${n.tone}" style="--i:${n.i}">${words}${aside}${quote}</div>`;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function rowHtml(r: Row, style = '') {
  const at = `${r.tone ? ` data-tone="${r.tone}"` : ''}${r.gap ? ' data-gap' : ''}${style ? ` style="${style}"` : ''}`;
  return r.type === 'title' ? `<h3 class="t title"${at}>${r.html}</h3>` : `<p class="t ${r.type}"${at}>${r.html}</p>`;
}

interface Page {
  label: string;
  state: 'result' | 'progress' | 'message';
  sheet: Sheet;
  /** The top of the margin: the verdict, the steps or a message. */
  top: string;
  /** Under the posting: where it came from, and the way back to the paste area. */
  foot?: string;
  fold: (rows: number) => string;
}

/**
 * The page's grid: the posting in one column, the margin in the other, each note on the same
 * row as the words behind it. The rows down to the first one with a note of its own share the
 * first grid row with the head of the margin (the verdict and any notes on them), stacked in
 * one cell, so a tall verdict adds space below them rather than between the title and its meta.
 */
function pageHtml(p: Page): string {
  const { head, blocks, loose } = p.sheet;
  const firstNoted = blocks.findIndex((b) => b.kind === 'row' && b.row.notes.length > 0);
  // With no title, the first row leads in, and its notes go to the head of the margin
  const leading = firstNoted === -1 ? blocks.length : Math.max(firstNoted, head.length ? 0 : 1);
  const headNotes: Note[] = head.flatMap((r) => r.notes);
  const blockHtml = (b: Block, style = '') => {
    if (b.kind === 'row') return rowHtml(b.row, style);
    const inner = b.rows.map((r) => rowHtml(r)).join('');
    return `<details class="t fold"${style ? ` style="${style}"` : ''}><summary>${CHEVRON}${escapeHtml(p.fold(b.rows.length))}</summary>${inner}</details>`;
  };
  const lead = [...head.map((r) => rowHtml(r)), ...blocks.slice(0, leading).map((b) => blockHtml(b))];
  for (const b of blocks.slice(0, leading)) if (b.kind === 'row') headNotes.push(...b.row.notes);
  headNotes.push(...loose);

  const out = [
    `<div class="t lead-in" style="grid-row:1">${lead.join('')}</div>`,
    `<div class="m head-m" style="grid-row:1">${p.top}${headNotes.map((n) => noteHtml(n, false)).join('')}</div>`,
  ];
  let row = 2;
  for (const b of blocks.slice(leading)) {
    out.push(blockHtml(b, `grid-row:${row}`));
    if (b.kind === 'row' && b.row.notes.length) {
      out.push(`<div class="m"${b.row.gap ? ' data-gap' : ''} style="grid-row:${row}">${b.row.notes.map((n) => noteHtml(n, true)).join('')}</div>`);
    }
    row++;
  }
  if (p.foot) out.push(`<div class="t foot" style="grid-row:${row}">${p.foot}</div>`);
  return `<article class="page" data-state="${p.state}" aria-label="${escapeHtml(p.label)}" style="--n:${p.sheet.marks}">${out.join('')}</article>`;
}

export interface SheetOptions {
  /** Says whose posting this is, for assistive tech: a sample's title, or "Your posting". */
  label: string;
  /** For a job link: the board it was read from, and whether its text was cut to fit. */
  source?: { board: string; truncated: boolean };
  /** Offer the way back to the paste area. Only for a visitor's own posting. */
  edit?: boolean;
  /** For a job link with no text to show yet: the link stands in for the posting. */
  link?: string;
  /** For a live role: its link, what Jev made of it (null: it passed), and whether there's a turned-down one to offer. */
  found?: { link: string; ruling: { reason: TurnDown; p: number } | null; screened: boolean; canRuled: boolean; checked?: boolean };
}

const EDIT =
  '<div class="found-actions"><button type="button" class="again" data-edit>Edit or paste another</button>' +
  '<button type="button" class="again" data-back>Back to a live role</button></div>';

export const SHUFFLE =
  '<svg class="shuffle" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4.5h2.6c1.3 0 2.1.5 2.8 1.6l1.2 1.8c.7 1.1 1.5 1.6 2.8 1.6H14M11.8 7.3 14 9.5l-2.2 2.2M2 11.5h2.6c1.3 0 2.1-.5 2.8-1.6M9.4 6.1c.7-1.1 1.5-1.6 2.8-1.6H14M11.8 2.3 14 4.5l-2.2 2.2"/></svg>';

/** Under a live role: what Jev made of it, where Haiku read it, then another, one Jev turned down, the posting, or your own. */
function foundFoot(o: SheetOptions & { found: NonNullable<SheetOptions['found']> }): string {
  const { link, ruling, screened, canRuled } = o.found;
  const board = o.source?.board;
  const cut = o.source?.truncated ? ' The listing is longer than 12,000 characters, so the check read the start of it, shown here.' : '';
  const jev = ruling
    ? `Jev turned this one down: ${escapeHtml(SCREEN_SHORT[ruling.reason])} · ${ruling.p.toFixed(2)}.`
    : screened
      ? 'It cleared Jev’s bar: hands-on building, little against it.'
      : 'Jev didn’t screen this one.';
  // Only when Haiku's answer is on the sheet: not on a check that didn't run
  const haiku = o.found.checked
    ? ` Haiku checked it${ruling ? ' anyway' : ''}${board ? `, reading it from ${escapeHtml(board)} just now` : ''}.${cut}`
    : '';
  return (
    `<p class="src">${jev}${haiku}</p>` +
    `<div class="found-actions"><button type="button" class="another" data-another>${SHUFFLE}Another role</button>` +
    (canRuled ? `<button type="button" class="another ruled" data-ruled>One Jev turned down</button>` : '') +
    `<a class="again" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">Open the posting${board ? ` on ${escapeHtml(board)}` : ''} ↗</a>` +
    `<button type="button" class="again" data-own>Paste your own</button></div>`
  );
}

function foot(o: SheetOptions): string | undefined {
  if (o.found) return foundFoot({ ...o, found: o.found });
  const parts: string[] = [];
  if (o.source) {
    const cut = o.source.truncated ? ' The listing is longer than 12,000 characters, so the check read the start of it, shown here.' : '';
    parts.push(`<p class="src">As read from ${escapeHtml(o.source.board)}.${cut}</p>`);
  }
  if (o.edit) parts.push(EDIT);
  return parts.length ? parts.join('') : undefined;
}

/** A mark placed by the caller, by its place in the text, rather than found from a quote. */
export interface PlacedMark {
  from: number;
  to: number;
  note: Omit<Note, 'i'>;
}

/**
 * The same sheet from marks the caller has placed, with its own top of the margin: for a judge
 * that marks whole sentences rather than quoting. Overlapping marks keep the earlier one's span.
 */
export function placedSheetHtml(text: string, placed: PlacedMark[], top: string, o: SheetOptions & { loose?: Array<Omit<Note, 'i'>> }): string {
  const marks: Mark[] = placed.map((p) => ({ from: p.from, to: p.to, start: p.from, note: { ...p.note, i: 0 } })).sort((x, y) => x.from - y.from);
  let end = 0;
  marks.forEach((m, i) => {
    m.note.i = i;
    if (m.from < end) m.from = Math.min(end, m.to);
    end = Math.max(end, m.to);
  });
  const loose = (o.loose ?? []).map((n, k) => ({ ...n, i: marks.length + k }));
  return pageHtml({
    label: o.label,
    state: 'result',
    sheet: layout(text, { marks, loose }),
    top,
    foot: foot(o),
    fold: (n) => `${plural(n, 'paragraph', 'paragraphs')}, nothing marked`,
  });
}

/** A checked answer: the posting marked up, the verdict and a note for each mark. */
export function resultSheetHtml(text: string, a: FitAssessment, o: SheetOptions): string {
  const v = VERDICT_COPY[a.verdict];
  const tone = VERDICT_TONE[a.verdict];
  const top =
    `<div class="verdict"><p class="chip" data-tone="${tone}"><svg viewBox="0 0 14 14" aria-hidden="true">${STATUS[a.verdict]}</svg>${escapeHtml(v.label)}</p>` +
    `<p class="v-line">${escapeHtml(v.line)}</p></div>`;
  return pageHtml({
    label: o.label,
    state: 'result',
    sheet: markUp(text, a),
    top,
    foot: foot(o),
    fold: (n) => `${plural(n, 'paragraph', 'paragraphs')}, nothing marked`,
  });
}

/** Before there's text: a job link, named by its board, with the link as the meta line. */
function linkSheet(label: string, link: string): Sheet {
  const row = (type: RowType, s: string): Row => ({ type, html: escapeHtml(s), notes: [], chars: s.length, gap: false });
  return { head: [row('title', label), row('meta', link)], blocks: [], loose: [], marks: 0 };
}

const unmarked = (text: string | null, o: SheetOptions) => (text === null ? linkSheet(o.label, o.link ?? '') : markUp(text, undefined, 4));
const more = (n: number) => plural(n, 'more paragraph', 'more paragraphs');

/** The two things that really happen, in order: the model reads it, then every quote is checked. */
export const STEPS = ['Reading it against the profile', 'Checking every quote against your text'] as const;

/** For a link, the first step says where the posting comes from: fetching it is part of that request. */
export const linkSteps = (board: string) =>
  [`Fetching it from ${board} and reading it against the profile`, 'Checking every quote against the posting'] as const;

/** What the wait's chip says at each step, where the verdict will appear. */
export const WAIT_HEADINGS = ['Reading your posting…', 'Checking the quotes…'] as const;

const SPINNER =
  '<svg viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="5.25" class="track"/><path d="M7 1.75a5.25 5.25 0 0 1 5.25 5.25"/></svg>';

export interface ProgressOptions extends SheetOptions {
  step: 0 | 1;
  seconds?: number;
  steps?: readonly [string, string];
}

/**
 * The wait: the pasted text stays on the sheet, folded after its first few lines, and the
 * margin holds the verdict's place with the step in hand and the two steps underneath.
 */
export function progressSheetHtml(text: string | null, o: ProgressOptions): string {
  const items = (o.steps ?? STEPS)
    .map((s, i) => {
      const state = i < o.step ? 'done' : i === o.step ? 'active' : 'todo';
      const time = i === 0 && o.step === 0 ? ` <span class="secs">${o.seconds ?? 0}s</span>` : '';
      return `<li data-state="${state}"><span class="dot" aria-hidden="true"></span>${escapeHtml(s)}${time}</li>`;
    })
    .join('');
  const top =
    `<div class="verdict reading"><p class="chip wait">${SPINNER}<span data-wait>${WAIT_HEADINGS[o.step]}</span></p>` +
    `<ol class="steps">${items}</ol>` +
    `<p class="small">Usually two to six seconds; longer if the first answer doesn’t check out and it reads again.</p></div>`;
  return pageHtml({ label: o.label, state: 'progress', sheet: unmarked(text, o), top, fold: more });
}

/** A ghost of a posting, drawn like the thumbnails, while the finder picks a role. */
const GHOST: Array<[number, string?]> = [[58, 'title'], [36, 'meta'], [30, 'meta'], [0, 'gap'], [94], [86], [0, 'gap'], [24, 'head'], [96], [90], [72], [0, 'gap'], [28, 'head'], [92], [64]];

export const FIND_STEPS = (boards: number) =>
  [`Reading every role on ${boards} public job boards`, 'Jev picking out the few worth reading', 'Haiku reading one of them'] as const;

/** The wait before there's a role: a ghost posting, and the steps ahead in the margin. */
export function findingSheetHtml(boards: number): string {
  const bars = GHOST.map(([w, k]) => `<i${k ? ` data-k="${k}"` : ''} style="--w:${w}%"></i>`).join('');
  const steps = FIND_STEPS(boards).map((s, i) => `<li data-state="${i ? 'todo' : 'active'}"><span class="dot" aria-hidden="true"></span>${escapeHtml(s)}</li>`).join('');
  const top =
    `<div class="verdict reading"><p class="chip wait">${SPINNER}<span data-wait>Reading the boards…</span></p><ol class="steps">${steps}</ol>` +
    `<p class="small">Usually instant. Every few hours it reads afresh, which takes about fifteen seconds.</p></div>`;
  return (
    `<article class="page" data-state="progress" aria-label="Reading the job boards">` +
    `<div class="t lead-in" style="grid-row:1"><div class="ghost" aria-hidden="true">${bars}</div></div>` +
    `<div class="m head-m" style="grid-row:1">${top}</div></article>`
  );
}

/** What the visitor can be told when a check doesn't come back. Site copy, keyed by cause. */
export const ERROR_COPY = {
  too_short: 'That’s too short to be a job posting. Paste the whole description.',
  too_long: 'That’s more than 12,000 characters. Trim it to the job description itself.',
  rate_limited: 'That’s a few checks in a row. Try again in three minutes.',
  busy: 'The model is busy just now. Try again in a minute.',
  unavailable: 'The check isn’t available just now. Try again later.',
  network: 'Couldn’t reach the check. Try again in a moment.',
  linkedin: 'LinkedIn links can’t be read here. Copy the job description from LinkedIn and paste that instead.',
  other_link: `That link isn’t one the check can read. ${BOARD_LIST} job links work; for anything else, paste the job description.`,
  link_not_found: 'That job isn’t on the board, or is no longer listed. Check the link, or paste the job description.',
  link_failed: 'Couldn’t read that job from the board just now. Try again, or paste the job description.',
  link_too_short: 'That job’s listing has too little text to judge. Paste the job description instead.',
} as const;
export type ErrorCause = keyof typeof ERROR_COPY;

/** A plain message in the margin, beside the posting as it was pasted. */
function messageSheetHtml(text: string | null, message: string, o: SheetOptions): string {
  return pageHtml({ label: o.label, state: 'message', sheet: unmarked(text, o), top: `<p class="plain">${escapeHtml(message)}</p>`, foot: foot(o), fold: more });
}

/** An answer that didn't check out against the posting, so none of it is shown. */
export const unassessableSheetHtml = (text: string | null, o: SheetOptions) => messageSheetHtml(text, UNASSESSABLE_COPY, o);

/** A check that didn't run, in site copy. */
export const errorSheetHtml = (text: string | null, cause: ErrorCause, o: SheetOptions) => messageSheetHtml(text, ERROR_COPY[cause], o);
