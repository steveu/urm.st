// The funnel: every role on a set of public job boards, narrowed in plain steps to the ones
// worth a closer look. It reads each board's whole job list through its public API, keeps the
// engineering, design and product roles by title, then those open to the UK by the board's own
// location fields (./filter.ts). With a Jev screener, it puts every one of those to Jev, which
// rules out the clear noes (./screen.ts). Jev only ever rules a role out, never in, and a role
// Jev couldn't answer for is left out of both lists, never counted as passing.
//
// What's left is listed by company, not ranked: Haiku judges a role only when a visitor opens
// it, through the fit check, which reads the posting again from its link. Only titles,
// companies, places and links come back; no posting text. Nothing is stored here.
import { BOARD_LIMITS, compose, getJson, readJob, type FetchFn } from '../boards.ts';
import { parseJobLink, type Board } from '../links.ts';
import { FINDER_BOARDS, type FinderBoard } from './boards.ts';
import { inScope, placeFits } from './filter.ts';
import { JEV_MODEL, JEV_USD_PER_MTOK, ruling, type Screener, type ScreenId } from './screen.ts';

export const FUNNEL_LIMITS = {
  /** A board slower than this is skipped, not waited for. */
  timeoutMs: 8_000,
  /** Lever, Ashby and Greenhouse (asked for content) send every description with the list. */
  listBytes: BOARD_LIMITS.boardBytes,
  /** Jev requests in flight at once. 24 screened about 700 roles in under seven seconds. */
  jevConcurrency: 24,
  /** No new Jev request starts after this long from the start: the function has 60 seconds. */
  jevDeadlineMs: 40_000,
} as const;

export interface FunnelRole {
  company: string;
  board: Board;
  title: string;
  /** The board's own location fields, as listed. */
  places: string[];
  /** The job's link on its board, which the fit check reads. */
  link: string;
}

export interface RuledOutRole extends FunnelRole {
  reason: ScreenId;
  /** Jev's answer to that question, at or above the line. */
  p: number;
}

export interface Funnel {
  /** When the boards were read, as an ISO time. */
  at: string;
  boards: { tried: number; read: number };
  /** Every role on the boards that were read. */
  listed: number;
  /** Engineering, design or product, by title. */
  inScope: number;
  /** Of those, open to the UK. What Jev is asked about. */
  open: number;
  /** What Jev left, or every open role when Jev didn't screen. By company, then title. */
  left: FunnelRole[];
  /** What Jev ruled out, with the reason. By company, then title. */
  ruledOut: RuledOutRole[];
  /** Open roles Jev couldn't answer for, or with too little text to ask about: in neither list. */
  unscreened: number;
  /** Null when there's no screener, or Jev answered for none of them (then `screenFailed`). */
  screening: { model: string; ms: number; costUsd: number } | null;
  screenFailed: boolean;
}

export type FunnelError = 'boards_failed' | 'none_found';
export type FunnelResult = { ok: true; funnel: Funnel } | { ok: false; error: FunnelError };

/** The one API URL a board's job list is read from, with every description. */
export function listUrl(b: FinderBoard): URL {
  const t = encodeURIComponent(b.token);
  switch (b.board) {
    case 'greenhouse':
      return new URL(`https://boards-api.greenhouse.io/v1/boards/${t}/jobs?content=true`);
    case 'lever':
      return new URL(`https://${b.region === 'eu' ? 'api.eu.lever.co' : 'api.lever.co'}/v0/postings/${t}?mode=json`);
    case 'ashby':
      return new URL(`https://api.ashbyhq.com/posting-api/job-board/${t}`);
  }
}

/** A job's link on its board, in the form the fit check reads. */
export function jobLink(b: FinderBoard, id: string): string {
  const t = encodeURIComponent(b.token);
  const i = encodeURIComponent(id);
  switch (b.board) {
    case 'greenhouse':
      return `https://job-boards.greenhouse.io/${t}/jobs/${i}`;
    case 'lever':
      return `https://${b.region === 'eu' ? 'jobs.eu.lever.co' : 'jobs.lever.co'}/${t}/${i}`;
    case 'ashby':
      return `https://jobs.ashbyhq.com/${t}/${i}`;
  }
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim().replace(/\s+/g, ' ') : null);
const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const uniq = (xs: (string | null)[]) => [...new Set(xs.filter((x): x is string => !!x))];

interface Listed {
  role: FunnelRole;
  /** The board's own record of the job, for building its text without another read. */
  raw: Record<string, unknown>;
}

/** Every listed role on a board, as a title, its location fields and its link. */
export function listedRoles(b: FinderBoard, body: unknown): FunnelRole[] {
  return listed(b, body).map((l) => l.role);
}

function listed(b: FinderBoard, body: unknown): Listed[] {
  const jobs =
    b.board === 'lever'
      ? arr(body)
      : arr(obj(body)?.jobs).filter((j) => b.board !== 'ashby' || obj(j)?.isListed !== false);
  const out: Listed[] = [];
  for (const raw of jobs) {
    const j = obj(raw);
    if (!j) continue;
    let title: string | null;
    let places: string[];
    let id: string | null;
    if (b.board === 'greenhouse') {
      title = str(j.title);
      places = uniq([str(obj(j.location)?.name)]);
      id = typeof j.id === 'number' || typeof j.id === 'string' ? String(j.id) : null;
    } else if (b.board === 'lever') {
      const cats = obj(j.categories);
      title = str(j.text);
      places = uniq([...arr(cats?.allLocations).map(str), str(cats?.location), str(j.country)]);
      id = str(j.id)?.toLowerCase() ?? null;
    } else {
      title = str(j.title);
      places = uniq([
        str(j.location),
        ...arr(j.secondaryLocations).map((s) => str(obj(s)?.location)),
        str(obj(obj(j.address)?.postalAddress)?.addressCountry),
      ]);
      id = str(j.id)?.toLowerCase() ?? null;
    }
    if (!title || !id) continue;
    const link = jobLink(b, id);
    // Only a link the fit check will read: the same patterns, decided by the same code
    if (parseJobLink(link)?.kind !== 'board') continue;
    out.push({ role: { company: b.company, board: b.board, title, places, link }, raw: j });
  }
  return out;
}

/** The text Jev reads: what the fit check would read from the link, built from the list. Null when there's too little. */
export function roleText(role: FunnelRole, raw: Record<string, unknown>): string | null {
  const text = compose(role.board, readJob(role.board, raw)).text;
  return text.length > role.title.length + 80 ? text : null;
}

const byCompany = (a: FunnelRole, b: FunnelRole) =>
  a.company.localeCompare(b.company, 'en-GB', { sensitivity: 'base' }) || a.title.localeCompare(b.title, 'en-GB', { sensitivity: 'base' });

/** Runs `fn` over `items`, `n` at a time, starting no new one once `stop()` says so. */
async function pool<T, R>(items: readonly T[], n: number, stop: () => boolean, fn: (t: T) => Promise<R>): Promise<(R | undefined)[]> {
  const out: (R | undefined)[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length && !stop()) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return out;
}

export interface FunnelOptions {
  fetch?: FetchFn;
  /** Jev, to rule out clear noes. Without one, every open role is left, unscreened. */
  screen?: Screener | null;
  boards?: readonly FinderBoard[];
  timeoutMs?: number;
  now?: () => number;
}

/** Reads every board and narrows its roles. Board failures are skipped, not thrown. */
export async function runFunnel(opts: FunnelOptions = {}): Promise<FunnelResult> {
  const fetchFn = opts.fetch ?? ((input, init) => fetch(input, init));
  const now = opts.now ?? (() => performance.now());
  const boards = opts.boards ?? FINDER_BOARDS;
  const timeoutMs = opts.timeoutMs ?? FUNNEL_LIMITS.timeoutMs;
  const started = now();

  // Every board at once. Each list is reduced to its open roles and their texts as it arrives,
  // so the megabytes of descriptions aren't all held together
  const lists = await Promise.all(
    boards.map((b) =>
      getJson(fetchFn, listUrl(b), FUNNEL_LIMITS.listBytes, timeoutMs).then(
        (body) => {
          const all = listed(b, body);
          const scoped = all.filter((l) => inScope(l.role.title));
          const open = scoped.filter((l) => placeFits(l.role.places)).map((l) => ({ role: l.role, text: roleText(l.role, l.raw) }));
          return { listed: all.length, inScope: scoped.length, open };
        },
        () => null,
      ),
    ),
  );
  const read = lists.filter((l): l is NonNullable<typeof l> => l !== null);
  if (!read.length) return { ok: false, error: 'boards_failed' };
  const open = read.flatMap((l) => l.open);
  if (!open.length) return { ok: false, error: 'none_found' };

  const funnel: Funnel = {
    at: new Date().toISOString(),
    boards: { tried: boards.length, read: read.length },
    listed: read.reduce((n, l) => n + l.listed, 0),
    inScope: read.reduce((n, l) => n + l.inScope, 0),
    open: open.length,
    left: [],
    ruledOut: [],
    unscreened: 0,
    screening: null,
    screenFailed: false,
  };

  if (!opts.screen) {
    funnel.left = open.map((o) => o.role).sort(byCompany);
    return { ok: true, funnel };
  }

  const screen = opts.screen;
  const jevStarted = now();
  const answers = await pool(
    open,
    FUNNEL_LIMITS.jevConcurrency,
    () => now() - started > FUNNEL_LIMITS.jevDeadlineMs,
    async (o) => {
      if (!o.text) return null;
      try {
        return await screen(o.text);
      } catch {
        return null;
      }
    },
  );
  if (!answers.some((a) => a)) {
    funnel.left = open.map((o) => o.role).sort(byCompany);
    funnel.screenFailed = true;
    return { ok: true, funnel };
  }

  let tokens = 0;
  open.forEach((o, i) => {
    const a = answers[i];
    if (!a) {
      funnel.unscreened++;
      return;
    }
    tokens += a.inputTokens;
    const out = ruling(a.answers);
    if (out) funnel.ruledOut.push({ ...o.role, reason: out.reason, p: out.p });
    else funnel.left.push(o.role);
  });
  funnel.left.sort(byCompany);
  funnel.ruledOut.sort(byCompany);
  funnel.screening = { model: JEV_MODEL, ms: Math.round(now() - jevStarted), costUsd: (tokens * JEV_USD_PER_MTOK) / 1_000_000 };
  return { ok: true, funnel };
}
