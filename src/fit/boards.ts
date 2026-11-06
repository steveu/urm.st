// Read one job from a board's public API, for a link pasted into the fit check. Only the API
// hosts below are ever called, with a fixed User-Agent, a short timeout, no redirects and a
// cap on how much is read. The board's own location fields go at the top of the text the
// model reads, so the location verdict can rest on them and quote them like anything else.
// Nothing is stored: the posting lives for one request.
import { LIMITS } from './check.ts';
import type { Board, BoardLink } from './links.ts';

export const USER_AGENT = 'urm.st fit check (+https://urm.st)';

/** The only hosts this ever calls. */
export const API_HOSTS = ['boards-api.greenhouse.io', 'api.lever.co', 'api.eu.lever.co', 'api.ashbyhq.com'] as const;

export const BOARD_LIMITS = {
  /**
   * Board APIs mostly answer in about a second, but about one call in ten takes four to six.
   * Those slow calls came in runs, so a quick retry didn't help; one patient attempt does. It
   * leaves room for two model calls inside the function's time limit.
   */
  timeoutMs: 8_000,
  /** Greenhouse and Lever answer with one job: tens of kilobytes. */
  jobBytes: 1024 * 1024,
  /** Ashby has no one-job endpoint, so the whole board comes back: a few megabytes for big ones. */
  boardBytes: 8 * 1024 * 1024,
} as const;

export type FetchFn = (input: URL, init: RequestInit) => Promise<Response>;

export interface BoardPosting {
  board: Board;
  title: string | null;
  /** What the model reads and the quotes are checked against: the board's fields, then the description. */
  text: string;
  /** The description was cut to fit the 12,000-character limit. */
  truncated: boolean;
}

export type BoardError = 'not_found' | 'board_failed';
export type BoardResult = { ok: true; posting: BoardPosting } | { ok: false; error: BoardError };

/** The one API URL a link is read through. */
export function apiUrl(link: BoardLink): URL {
  const t = encodeURIComponent(link.token);
  const id = encodeURIComponent(link.id);
  switch (link.board) {
    case 'greenhouse':
      return new URL(`https://boards-api.greenhouse.io/v1/boards/${t}/jobs/${id}?content=true`);
    case 'lever':
      return new URL(`https://${link.region === 'eu' ? 'api.eu.lever.co' : 'api.lever.co'}/v0/postings/${t}/${id}?mode=json`);
    case 'ashby':
      return new URL(`https://api.ashbyhq.com/posting-api/job-board/${t}`);
  }
}

class Failed extends Error {
  readonly error: BoardError;
  constructor(error: BoardError) {
    super(error);
    this.error = error;
  }
}

/** GET a JSON body from an allowed API host, reading no more than `cap` bytes. Also used by the role finder. */
export async function getJson(fetchFn: FetchFn, url: URL, cap: number, timeoutMs: number): Promise<unknown> {
  if (url.protocol !== 'https:' || !(API_HOSTS as readonly string[]).includes(url.hostname)) {
    throw new Error(`not an allowed API host: ${url.hostname}`);
  }
  let res: Response;
  try {
    res = await fetchFn(url, {
      headers: { 'user-agent': USER_AGENT, accept: 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new Failed('board_failed');
  }
  if (!res.ok) {
    await res.body?.cancel().catch(() => {});
    throw new Failed(res.status === 404 ? 'not_found' : 'board_failed');
  }
  if (Number(res.headers.get('content-length') ?? 0) > cap) {
    await res.body?.cancel().catch(() => {});
    throw new Failed('board_failed');
  }
  const bytes = await readCapped(res, cap);
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Failed('board_failed');
  }
}

async function readCapped(res: Response, cap: number): Promise<Uint8Array> {
  if (!res.body) return new Uint8Array();
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > cap) {
        await reader.cancel().catch(() => {});
        throw new Failed('board_failed');
      }
      chunks.push(value);
    }
  } catch (err) {
    // A timeout or a drop part way through the body
    throw err instanceof Failed ? err : new Failed('board_failed');
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.byteLength;
  }
  return out;
}

/** Read the job a link points at. Errors come back as values: missing, or the board failed. */
export async function fetchBoardPosting(
  link: BoardLink,
  opts: { fetch?: FetchFn; timeoutMs?: number } = {},
): Promise<BoardResult> {
  const fetchFn = opts.fetch ?? ((input, init) => fetch(input, init));
  const timeoutMs = opts.timeoutMs ?? BOARD_LIMITS.timeoutMs;
  const cap = link.board === 'ashby' ? BOARD_LIMITS.boardBytes : BOARD_LIMITS.jobBytes;
  try {
    const body = await getJson(fetchFn, apiUrl(link), cap, timeoutMs);
    const job = pick(link, body);
    if (!job) return { ok: false, error: 'not_found' };
    return { ok: true, posting: compose(link.board, job) };
  } catch (err) {
    if (err instanceof Failed) return { ok: false, error: err.error };
    throw err;
  }
}

// ---- The boards' fields, reduced to a title, location lines and a description ----

export interface Job {
  title: string | null;
  /** "Label: value" lines from the board's own location fields, in order. */
  fields: [string, string][];
  html: string;
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim().replace(/\s+/g, ' ') : null);
const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const uniq = (xs: (string | null)[]) => [...new Set(xs.filter((x): x is string => !!x))];

const WORKPLACE: Record<string, string> = { onsite: 'On-site', hybrid: 'Hybrid', remote: 'Remote' };
const workplace = (v: unknown) => {
  const s = str(v)?.toLowerCase().replace(/[^a-z]/g, '');
  return s ? (WORKPLACE[s] ?? null) : null;
};

/** "GB" to "United Kingdom"; anything unrecognised as it came. */
function country(code: unknown): string | null {
  const s = str(code);
  if (!s) return null;
  if (!/^[A-Za-z]{2}$/.test(s)) return s;
  try {
    return new Intl.DisplayNames(['en-GB'], { type: 'region' }).of(s.toUpperCase()) ?? s;
  } catch {
    return s;
  }
}

function pick(link: BoardLink, body: unknown): Job | null {
  const b = obj(body);
  switch (link.board) {
    case 'greenhouse':
      return b && String(b.id) === link.id ? greenhouse(b) : null;
    case 'lever':
      return b && str(b.id)?.toLowerCase() === link.id ? lever(b) : null;
    case 'ashby': {
      const job = arr(b?.jobs).map(obj).find((j) => str(j?.id)?.toLowerCase() === link.id && j?.isListed !== false);
      return job ? ashby(job) : null;
    }
  }
}

/**
 * One job from a board's own record, reduced to what the text is built from. Also used by the
 * role finder on the jobs in a board's list (Lever's and Ashby's lists carry descriptions).
 */
export function readJob(board: Board, j: Record<string, unknown>): Job {
  return board === 'greenhouse' ? greenhouse(j) : board === 'lever' ? lever(j) : ashby(j);
}

function greenhouse(j: Record<string, unknown>): Job {
  const offices = uniq(arr(j.offices).map((o) => str(obj(o)?.name)));
  const location = str(obj(j.location)?.name);
  const fields: [string, string][] = [];
  if (location) fields.push(['Location', location]);
  const extra = offices.filter((o) => o.toLowerCase() !== location?.toLowerCase());
  if (extra.length) fields.push(['Offices', extra.join('; ')]);
  // The board entity-encodes its HTML ("&lt;p&gt;"), so it's decoded once to get HTML
  const content = str(j.content);
  return { title: str(j.title), fields, html: content ? decodeEntities(content) : '' };
}

function lever(j: Record<string, unknown>): Job {
  const cats = obj(j.categories);
  const all = uniq(arr(cats?.allLocations).map(str));
  const location = all.length ? all.join('; ') : str(cats?.location);
  const fields: [string, string][] = [];
  if (location) fields.push(['Location', location]);
  const wp = workplace(j.workplaceType);
  if (wp) fields.push(['Workplace', wp]);
  const c = country(j.country);
  if (c) fields.push(['Country', c]);
  // Description, each list under its heading, the pay wording, then the closing section
  const lists = arr(j.lists).map((l) => {
    const heading = str(obj(l)?.text);
    return `${heading ? `<h3>${escapeHtml(heading)}</h3>` : ''}<ul>${str(obj(l)?.content) ?? ''}</ul>`;
  });
  const html = [str(j.description) ?? '', ...lists, str(j.salaryDescription) ?? '', str(j.additional) ?? ''].join('\n');
  return { title: str(j.text), fields, html };
}

function ashby(j: Record<string, unknown>): Job {
  const secondary = arr(j.secondaryLocations).map(obj);
  const places = uniq([str(j.location), ...secondary.map((s) => str(s?.location))]);
  const fields: [string, string][] = [];
  if (places.length) fields.push(['Location', places.join('; ')]);
  const wp = workplace(j.workplaceType);
  if (wp) fields.push(['Workplace', wp]);
  const a = obj(obj(j.address)?.postalAddress);
  const address = uniq([str(a?.addressLocality), str(a?.addressRegion), str(a?.addressCountry)]).join(', ');
  if (address && !places.some((p) => p.toLowerCase() === address.toLowerCase())) fields.push(['Address', address]);
  return { title: str(j.title), fields, html: str(j.descriptionHtml) ?? '' };
}

/**
 * The text the model reads: the title, the board's location fields as labelled lines, then
 * the description as plain text, cut at a word boundary to fit the paste limit.
 */
export function compose(board: Board, job: Job): BoardPosting {
  const head = [job.title, ...job.fields.map(([k, v]) => `${k}: ${v}`)].filter(Boolean).join('\n');
  const room = LIMITS.maxChars - head.length - 2;
  const { text: body, truncated } = capText(htmlToText(job.html), Math.max(room, 0));
  return { board, title: job.title, text: [head, body].filter(Boolean).join('\n\n'), truncated };
}

// ---- HTML to plain text, after job-radar's ----

const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ndash: '–', mdash: '—', hellip: '…', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  bull: '•', middot: '·', pound: '£', euro: '€', copy: '©', reg: '®', trade: '™',
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (whole, body: string) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? Number.parseInt(body.slice(2), 16) : Number(body.slice(1));
      return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    return NAMED[body.toLowerCase()] ?? whole;
  });
}

const escapeHtml = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

const BLOCK = /<\/?(p|div|ul|ol|h[1-6]|tr|table|section|article|header|footer|blockquote)\b[^>]*>/gi;

/** Scripts, styles and comments dropped; blocks and <br> to line breaks, list items to "- ". */
export function htmlToText(html: string): string {
  const s = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|head)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n- ')
    .replace(/<\/li\s*>/gi, '')
    .replace(BLOCK, '\n')
    .replace(/<[^>]*>/g, '');
  return decodeEntities(s)
    .replace(/ /g, ' ')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    // A list item whose text sits in its own paragraph: "- " then the text, on one line
    .replace(/\n- *\n+(?=\S)/g, '\n- ')
    // No blank lines between the items of one list
    .replace(/(?<=(?:^|\n)- [^\n]*)\n\n(?=- )/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** At most `max` characters, cut at a word boundary where there's one near the end. */
export function capText(text: string, max: number): { text: string; truncated: boolean } {
  if (text.length <= max) return { text, truncated: false };
  const cut = text.slice(0, max);
  const lastSpace = cut.search(/\s\S*$/);
  return { text: (lastSpace > max * 0.8 ? cut.slice(0, lastSpace) : cut).trimEnd(), truncated: true };
}
