// Job links in the paste box. A link is only ever read through its board's public API, and
// only when it matches one of the patterns below exactly; the link itself is never fetched.
// Shared by the browser, to say straight away what will happen, and by the function, which
// decides again for itself. No fetching here.

export const BOARDS = ['greenhouse', 'lever', 'ashby'] as const;
export type Board = (typeof BOARDS)[number];

export const BOARD_NAMES: Record<Board, string> = { greenhouse: 'Greenhouse', lever: 'Lever', ashby: 'Ashby' };

export interface BoardLink {
  kind: 'board';
  board: Board;
  /** The company's board name: Greenhouse's token, Lever's site, Ashby's job board name. */
  token: string;
  /** The job's ID on that board. */
  id: string;
  /** Lever keeps EU boards on a separate host. */
  region?: 'eu';
}

export type ParsedLink = BoardLink | { kind: 'linkedin' } | { kind: 'other' };

const TOKEN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
const NUMERIC_ID = /^\d{1,20}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Whether the paste is a link rather than a posting: one run of text with no spaces, with a
 * web scheme or shaped like a host and a path. Null when it isn't a link at all.
 */
function asUrl(raw: string): URL | null {
  const s = raw.trim();
  if (!s || /\s/.test(s) || s.length > 2_000) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : /^(?:[a-z0-9-]+\.)+[a-z]{2,}(?:[/?#]|$)/i.test(s) ? `https://${s}` : null;
  if (!withScheme) return null;
  try {
    return new URL(withScheme);
  } catch {
    return null;
  }
}

const isLinkedIn = (host: string) => host === 'linkedin.com' || host.endsWith('.linkedin.com') || host === 'lnkd.in';

/** Path segments, empty ones dropped, each decoded once. */
function segments(url: URL): string[] | null {
  try {
    return url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  } catch {
    return null;
  }
}

function boardLink(url: URL): BoardLink | null {
  // A link with a login or a port isn't one a board gives out
  if (url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase();
  const path = segments(url);
  if (!path) return null;

  // EU-hosted boards share the same job IDs and are read through the same API
  if (host === 'job-boards.greenhouse.io' || host === 'job-boards.eu.greenhouse.io' || host === 'boards.greenhouse.io') {
    // /{token}/jobs/{id}
    if (path.length === 3 && path[1] === 'jobs' && TOKEN.test(path[0]) && NUMERIC_ID.test(path[2])) {
      return { kind: 'board', board: 'greenhouse', token: path[0], id: path[2] };
    }
    // The embedded form: /embed/job_app?for={token}&token={id}
    if (host === 'boards.greenhouse.io' && path.join('/') === 'embed/job_app') {
      const token = url.searchParams.get('for') ?? '';
      const id = url.searchParams.get('token') ?? '';
      if (TOKEN.test(token) && NUMERIC_ID.test(id)) return { kind: 'board', board: 'greenhouse', token, id };
    }
    return null;
  }

  if (host === 'jobs.lever.co' || host === 'jobs.eu.lever.co') {
    // /{site}/{id}, or its /apply page
    if ((path.length === 2 || (path.length === 3 && path[2] === 'apply')) && TOKEN.test(path[0]) && UUID.test(path[1])) {
      return {
        kind: 'board',
        board: 'lever',
        token: path[0],
        id: path[1].toLowerCase(),
        ...(host === 'jobs.eu.lever.co' ? { region: 'eu' as const } : {}),
      };
    }
    return null;
  }

  if (host === 'jobs.ashbyhq.com') {
    // /{board}/{id}, or its /application page
    if ((path.length === 2 || (path.length === 3 && path[2] === 'application')) && TOKEN.test(path[0]) && UUID.test(path[1])) {
      return { kind: 'board', board: 'ashby', token: path[0], id: path[1].toLowerCase() };
    }
    return null;
  }

  return null;
}

/** What to do with a paste: read a board link, decline LinkedIn or another link, or null for text. */
export function parseJobLink(raw: unknown): ParsedLink | null {
  if (typeof raw !== 'string') return null;
  const url = asUrl(raw);
  if (!url) return null;
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return { kind: 'other' };
  if (isLinkedIn(url.hostname.toLowerCase())) return { kind: 'linkedin' };
  return boardLink(url) ?? { kind: 'other' };
}

/** The supported boards, for a sentence: "Greenhouse, Lever and Ashby". */
export const BOARD_LIST = `${BOARD_NAMES.greenhouse}, ${BOARD_NAMES.lever} and ${BOARD_NAMES.ashby}`;
