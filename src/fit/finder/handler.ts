import type { FetchFn } from '../boards.ts';
import { BOARD_NAMES } from '../links.ts';
import type { FinderBoard } from './boards.ts';
import { findRole, type FindError, type FoundRole } from './find.ts';

// The HTTP side of the role finder, shared by the Netlify Function and the local preview
// server. GET only, no input: it answers with one live role's link for the band to check.
// No model is called here, and nothing is stored or logged.

export const FIND_ROLE_PATH = '/api/fit-role';

/**
 * Requests per visitor (IP and domain) per window. Netlify enforces it; see the function
 * config. Looser than the fit check's, as a find costs a few board reads and no model call.
 */
export const FIND_RATE_LIMIT = { windowLimit: 10, windowSize: 180 } as const;

export type FindRoleResponse =
  | {
      status: 'ok';
      role: Omit<FoundRole, 'board'> & { board: string };
      considered: { boards: number; companies: number; roles: number };
    }
  | { status: 'error'; error: FindError | 'method' };

const STATUS: Record<FindError | 'method', number> = { method: 405, none_found: 404, boards_failed: 502 };

const json = (body: FindRoleResponse, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

export interface FindRoleDeps {
  fetch?: FetchFn;
  random?: () => number;
  /** Tests pass their own; otherwise the finder's list. */
  boards?: readonly FinderBoard[];
}

export async function handleFindRole(req: Request, deps: FindRoleDeps = {}): Promise<Response> {
  if (req.method !== 'GET') return json({ status: 'error', error: 'method' }, STATUS.method);
  const found = await findRole({ fetch: deps.fetch, random: deps.random, boards: deps.boards });
  if (!found.ok) {
    console.error(`fit-role: ${found.error}`);
    return json({ status: 'error', error: found.error }, STATUS[found.error]);
  }
  const { role, considered } = found;
  return json({ status: 'ok', role: { ...role, board: BOARD_NAMES[role.board] }, considered });
}
