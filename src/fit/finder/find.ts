// The role finder: a real, live role for the fit check, picked at random from public job
// boards. It reads a few boards' job lists through their public APIs, keeps the roles whose
// title and listed location the profile could plausibly fit, picks a company at random among
// those with one, then a role at random from that company. Picking the company first stops
// the biggest boards from crowding out the rest.
//
// It returns the role's job link and nothing else: the fit check reads the posting from that
// link itself, with its own limits, so the finder never sees the model and never keeps text.
import { BOARD_LIMITS, getJson, type FetchFn } from '../boards.ts';
import { parseJobLink, type Board } from '../links.ts';
import { FINDER_BOARDS, type FinderBoard } from './boards.ts';
import { placeFits, titleFits } from './filter.ts';

export const FINDER_LIMITS = {
  /** Boards read at once. Most answer in about a second; a few hold the rest up. */
  perRound: 6,
  /** A second handful of boards, only if the first had nothing to pick. */
  rounds: 2,
  /** Shorter than a single job read's: a board that slow is skipped, not waited for. */
  timeoutMs: 5_000,
  /** Lever and Ashby send every job's description with the list: a few megabytes for big boards. */
  listBytes: BOARD_LIMITS.boardBytes,
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

export type FindResult =
  | {
      ok: true;
      role: FoundRole;
      /** What the pick was made from: boards read, companies with a role to pick, and those roles. */
      considered: { boards: number; companies: number; roles: number };
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
  const jobs =
    b.board === 'lever'
      ? arr(body)
      : arr(obj(body)?.jobs).filter((j) => b.board !== 'ashby' || obj(j)?.isListed !== false);
  const out: FoundRole[] = [];
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
    out.push({ company: b.company, board: b.board, title, places, link });
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
  /** In [0, 1), like Math.random. Tests pass their own. */
  random?: () => number;
  boards?: readonly FinderBoard[];
  timeoutMs?: number;
}

/** A live role at random, or why there isn't one. Board failures are skipped, not thrown. */
export async function findRole(opts: FindOptions = {}): Promise<FindResult> {
  const fetchFn = opts.fetch ?? ((input, init) => fetch(input, init));
  const random = opts.random ?? Math.random;
  const timeoutMs = opts.timeoutMs ?? FINDER_LIMITS.timeoutMs;
  const order = shuffled(opts.boards ?? FINDER_BOARDS, random);

  let read = 0;
  let roles = 0;
  const byCompany = new Map<string, FoundRole[]>();
  for (let round = 0; round < FINDER_LIMITS.rounds; round++) {
    const batch = order.slice(round * FINDER_LIMITS.perRound, (round + 1) * FINDER_LIMITS.perRound);
    if (!batch.length) break;
    const lists = await Promise.all(
      batch.map((b) =>
        getJson(fetchFn, listUrl(b), FINDER_LIMITS.listBytes, timeoutMs).then(
          (body) => ({ b, roles: pickable(listedRoles(b, body)) }),
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
    if (byCompany.size) {
      const company = pick([...byCompany.keys()], random);
      return { ok: true, role: pick(byCompany.get(company)!, random), considered: { boards: read, companies: byCompany.size, roles } };
    }
  }
  return { ok: false, error: read ? 'none_found' : 'boards_failed' };
}
