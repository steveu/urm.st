import type { FetchFn } from '../boards.ts';
import { BOARD_NAMES } from '../links.ts';
import type { FinderBoard } from './boards.ts';
import { runFunnel, type Funnel, type FunnelError, type FunnelResult, type FunnelRole, type RuledOutRole } from './funnel.ts';
import type { Screener } from './screen.ts';

// The HTTP side of the funnel, shared by the Netlify Function and the local preview server.
// GET only, no input: it answers with the funnel's counts and its two lists, for the band to
// show. Haiku isn't called here, and nothing is stored or logged.
//
// A run reads every board and screens several hundred roles: about fifteen seconds and six
// cents. So one run serves everyone for a while: Netlify's shared cache keeps the answer for
// six hours and goes on serving it for a day while a fresh one is made, and each warm instance
// keeps its own for half an hour. An answer Jev didn't screen is kept only briefly.

export const FUNNEL_PATH = '/api/fit-roles';

/** Requests per visitor (IP and domain) per window. Netlify enforces it; see the function config. */
export const FUNNEL_RATE_LIMIT = { windowLimit: 10, windowSize: 180 } as const;

/** Seconds. */
export const FUNNEL_CACHE = {
  /** In Netlify's shared cache, fresh. */
  shared: 6 * 3600,
  /** Then served while a fresh answer is made. */
  stale: 24 * 3600,
  /** In the browser. */
  browser: 300,
  /** Kept by a warm instance: mostly so that a burst of first visits makes one run. */
  instance: 1800,
  /** Anywhere, for an answer Jev didn't screen. */
  unscreened: 600,
} as const;

type Named<T> = Omit<T, 'board'> & { board: string };
export type FunnelBody = Omit<Funnel, 'left' | 'ruledOut'> & { left: Named<FunnelRole>[]; ruledOut: Named<RuledOutRole>[] };

export type FunnelResponse = { status: 'ok'; funnel: FunnelBody } | { status: 'error'; error: FunnelError | 'method' };

const STATUS: Record<FunnelError | 'method', number> = { method: 405, none_found: 404, boards_failed: 502 };

function json(body: FunnelResponse, status: number, cache?: { shared: number; stale?: number; browser: number }) {
  const headers: Record<string, string> = { 'content-type': 'application/json; charset=utf-8' };
  if (cache) {
    headers['cache-control'] = `public, max-age=${cache.browser}`;
    headers['netlify-cdn-cache-control'] = `public, durable, s-maxage=${cache.shared}${cache.stale ? `, stale-while-revalidate=${cache.stale}` : ''}`;
  } else headers['cache-control'] = 'no-store';
  return new Response(JSON.stringify(body), { status, headers });
}

/** The boards as the band names them: "Ashby", not "ashby". */
function named(f: Funnel): FunnelBody {
  return {
    ...f,
    left: f.left.map((r) => ({ ...r, board: BOARD_NAMES[r.board] })),
    ruledOut: f.ruledOut.map((r) => ({ ...r, board: BOARD_NAMES[r.board] })),
  };
}

export interface FunnelDeps {
  fetch?: FetchFn;
  /** Tests pass their own; otherwise the funnel's list. */
  boards?: readonly FinderBoard[];
  /** Jev, from the environment in production; null or absent to list every open role unscreened. */
  screen?: Screener | null;
  /** Milliseconds, like Date.now. */
  now?: () => number;
}

/** A handler with its own instance cache: one per function instance. */
export function funnelHandler(deps: FunnelDeps = {}): (req: Request) => Promise<Response> {
  const now = deps.now ?? Date.now;
  let kept: { until: number; result: Promise<FunnelResult> } | null = null;

  const run = (): Promise<FunnelResult> => {
    if (kept && now() < kept.until) return kept.result;
    const result = runFunnel({ fetch: deps.fetch, boards: deps.boards, screen: deps.screen });
    // Kept while it runs, so requests that arrive meanwhile share it; then kept or dropped
    const entry = { until: Number.POSITIVE_INFINITY, result };
    kept = entry;
    result.then(
      (r) => {
        if (kept !== entry) return;
        if (!r.ok) kept = null;
        else entry.until = now() + 1000 * (r.funnel.screening ? FUNNEL_CACHE.instance : FUNNEL_CACHE.unscreened);
      },
      () => {
        if (kept === entry) kept = null;
      },
    );
    return result;
  };

  return async (req) => {
    if (req.method !== 'GET') return json({ status: 'error', error: 'method' }, STATUS.method);
    const r = await run();
    if (!r.ok) {
      console.error(`fit-roles: ${r.error}`);
      return json({ status: 'error', error: r.error }, STATUS[r.error]);
    }
    const f = r.funnel;
    if (f.screenFailed) console.error('fit-roles: Jev screening failed; listed unscreened');
    const cache = f.screening
      ? { shared: FUNNEL_CACHE.shared, stale: FUNNEL_CACHE.stale, browser: FUNNEL_CACHE.browser }
      : { shared: FUNNEL_CACHE.unscreened, browser: FUNNEL_CACHE.browser };
    return json({ status: 'ok', funnel: named(f) }, 200, cache);
  };
}
