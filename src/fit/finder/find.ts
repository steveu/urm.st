// The role finder: a real, live role for the fit check, picked at random from public job
// boards. It reads a few boards' job lists through their public APIs, keeps the roles whose
// title and listed location the profile could plausibly fit, picks a company at random among
// those with one, then a role at random from that company. Picking the company first stops
// the biggest boards from crowding out the rest.
//
// With a Jev screener, it first puts a handful of candidate roles, one per company where it
// can, to Jev, rules out the clear noes (./screen.ts), and picks from the rest; Jev only ever
// rules a role out. It returns the role's job link, and what the screening did: the fit check
// reads the posting from the link itself, with its own limits. Nothing is kept.
import { BOARD_LIMITS, compose, fetchBoardPosting, getJson, readJob, type FetchFn } from '../boards.ts';
import { parseJobLink, type Board } from '../links.ts';
import { FINDER_BOARDS, type FinderBoard } from './boards.ts';
import { placeFits, titleFits } from './filter.ts';
import { JEV_MODEL, JEV_USD_PER_MTOK, ruling, type Screener, type ScreenId } from './screen.ts';

export const FINDER_LIMITS = {
  /** Boards read at once. Most answer in about a second; a few hold the rest up. */
  perRound: 6,
  /** A second handful of boards, only if the first had nothing to pick. */
  rounds: 2,
  /** Shorter than a single job read's: a board that slow is skipped, not waited for. */
  timeoutMs: 5_000,
  /** Lever and Ashby send every job's description with the list: a few megabytes for big boards. */
  listBytes: BOARD_LIMITS.boardBytes,
  /** Roles put to Jev at once. */
  candidates: 8,
  /** Greenhouse lists carry no descriptions, so a candidate's text is one more short read. */
  jobTimeoutMs: 4_000,
} as const;

export interface FoundRole {
  company: string;
  board: Board;
  title: string;
  /** The board's own location fields, as listed. */
  places: string[];
  /** The job's link on its board, which the fit check reads. */
  link: string;
}

export type FindError = 'none_found' | 'boards_failed';

/** What Jev's screening did, for the band to show. Titles and companies only: no posting text. */
export interface Screening {
  model: string;
  ms: number;
  /** Candidates Jev answered for. */
  screened: number;
  ruledOut: Array<{ company: string; title: string; reason: ScreenId; p: number }>;
  /** Every candidate was ruled out, so the role is one of them, checked anyway. */
  allRuledOut: boolean;
  costUsd: number;
}

export type FindResult =
  | {
      ok: true;
      role: FoundRole;
      /** What the pick was made from: boards read, companies with a role to pick, and those roles. */
      considered: { boards: number; companies: number; roles: number };
      /** Null when no screener is set up, or when Jev couldn't answer (then `screenFailed`). */
      screening: Screening | null;
      screenFailed?: boolean;
    }
  | { ok: false; error: FindError };

/** The one API URL a board's job list is read from. */
export function listUrl(b: FinderBoard): URL {
  const t = encodeURIComponent(b.token);
  switch (b.board) {
    case 'greenhouse':
      return new URL(`https://boards-api.greenhouse.io/v1/boards/${t}/jobs`);
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

/** Every listed role on a board, as a title, its location fields and its link. */
export function listedRoles(b: FinderBoard, body: unknown): FoundRole[] {
  return listed(b, body).map((l) => l.role);
}

interface Listed {
  role: FoundRole;
  /** The board's own record of the job, for building its text without another read. */
  raw: Record<string, unknown>;
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

/** The roles on a board the profile could plausibly fit. */
export const pickable = (roles: FoundRole[]) => roles.filter((r) => titleFits(r.title) && placeFits(r.places));

function shuffled<T>(xs: readonly T[], random: () => number): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const k = Math.floor(random() * (i + 1));
    [out[i], out[k]] = [out[k], out[i]];
  }
  return out;
}

const pick = <T>(xs: readonly T[], random: () => number): T => xs[Math.min(Math.floor(random() * xs.length), xs.length - 1)];

export interface FindOptions {
  fetch?: FetchFn;
  /** Jev, to rule out clear noes before the pick. Without one, the pick isn't screened. */
  screen?: Screener | null;
  /** In [0, 1), like Math.random. Tests pass their own. */
  random?: () => number;
  boards?: readonly FinderBoard[];
  timeoutMs?: number;
  /** Links not to pick: the roles a visitor has already been shown. */
  exclude?: ReadonlySet<string>;
}

/** Up to `n` candidates, one per company in a random order, then more from each in turn. */
function candidatesFrom(byCompany: Map<string, Listed[]>, random: () => number, n: number): Listed[] {
  const queues = shuffled([...byCompany.values()], random).map((roles) => shuffled(roles, random));
  const out: Listed[] = [];
  for (let round = 0; out.length < n && queues.some((q) => q.length > round); round++) {
    for (const q of queues) if (q[round] && out.length < n) out.push(q[round]);
  }
  return out;
}

/** The text the fit check will read for a candidate: from the list for Lever and Ashby, one read for Greenhouse. */
async function candidateText(l: Listed, fetchFn: FetchFn): Promise<string | null> {
  if (l.role.board !== 'greenhouse') {
    const text = compose(l.role.board, readJob(l.role.board, l.raw)).text;
    return text.length > l.role.title.length + 40 ? text : null;
  }
  const link = parseJobLink(l.role.link);
  if (link?.kind !== 'board') return null;
  const read = await fetchBoardPosting(link, { fetch: fetchFn, timeoutMs: FINDER_LIMITS.jobTimeoutMs });
  return read.ok ? read.posting.text : null;
}

/** One at random from a company at random, so a board with many roles doesn't crowd out the rest. */
function pickByCompany(xs: Listed[], random: () => number): Listed {
  const companies = [...new Set(xs.map((x) => x.role.company))];
  const company = pick(companies, random);
  return pick(
    xs.filter((x) => x.role.company === company),
    random,
  );
}

/** A live role at random, or why there isn't one. Board failures are skipped, not thrown. */
export async function findRole(opts: FindOptions = {}): Promise<FindResult> {
  const fetchFn = opts.fetch ?? ((input, init) => fetch(input, init));
  const random = opts.random ?? Math.random;
  const timeoutMs = opts.timeoutMs ?? FINDER_LIMITS.timeoutMs;
  const order = shuffled(opts.boards ?? FINDER_BOARDS, random);

  let read = 0;
  let roles = 0;
  const byCompany = new Map<string, Listed[]>();
  for (let round = 0; round < FINDER_LIMITS.rounds; round++) {
    const batch = order.slice(round * FINDER_LIMITS.perRound, (round + 1) * FINDER_LIMITS.perRound);
    if (!batch.length) break;
    const lists = await Promise.all(
      batch.map((b) =>
        getJson(fetchFn, listUrl(b), FINDER_LIMITS.listBytes, timeoutMs).then(
          (body) => ({
            b,
            roles: listed(b, body).filter((l) => titleFits(l.role.title) && placeFits(l.role.places) && !opts.exclude?.has(l.role.link)),
          }),
          () => null,
        ),
      ),
    );
    for (const l of lists) {
      if (!l) continue;
      read++;
      roles += l.roles.length;
      if (l.roles.length) byCompany.set(l.b.company, l.roles);
    }
    if (byCompany.size) break;
  }
  if (!byCompany.size) return { ok: false, error: read ? 'none_found' : 'boards_failed' };
  const considered = { boards: read, companies: byCompany.size, roles };
  const all = [...byCompany.values()].flat();
  if (!opts.screen) return { ok: true, role: pickByCompany(all, random).role, considered, screening: null };

  // Screening: candidates' texts, then Jev on each at once. A candidate whose text or answer
  // couldn't be had is left out of the screening, never counted as passing it
  const candidates = candidatesFrom(byCompany, random, FINDER_LIMITS.candidates);
  const started = performance.now();
  const screen = opts.screen;
  const results = await Promise.all(
    candidates.map(async (l) => {
      try {
        const text = await candidateText(l, fetchFn);
        if (!text) return null;
        return { l, answer: await screen(text) };
      } catch {
        return null;
      }
    }),
  );
  const answered = results.filter((r): r is NonNullable<typeof r> => r !== null);
  if (!answered.length) return { ok: true, role: pickByCompany(all, random).role, considered, screening: null, screenFailed: true };

  const ruled = answered.map((r) => ({ ...r, out: ruling(r.answer.answers) }));
  const kept = ruled.filter((r) => !r.out);
  const chosen = pickByCompany((kept.length ? kept : ruled).map((r) => r.l), random);
  const tokens = answered.reduce((n, r) => n + r.answer.inputTokens, 0);
  return {
    ok: true,
    role: chosen.role,
    considered,
    screening: {
      model: JEV_MODEL,
      ms: Math.round(performance.now() - started),
      screened: answered.length,
      ruledOut: ruled.filter((r) => r.out).map((r) => ({ company: r.l.role.company, title: r.l.role.title, reason: r.out!.reason, p: r.out!.p })),
      allRuledOut: !kept.length,
      costUsd: (tokens * JEV_USD_PER_MTOK) / 1_000_000,
    },
  };
}
