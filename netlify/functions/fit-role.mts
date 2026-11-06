import type { Config } from '@netlify/functions';
import { handleFindRole } from '../../src/fit/finder/handler.ts';
import { screenerFromEnv } from '../../src/fit/finder/screen.ts';

// The role finder: one live role's link, picked at random from public job boards, for the fit
// check band to check. With JEV_API_KEY set, Jev screens a handful of candidates first and
// rules out the clear noes. Only public postings go to Jev. Nothing is stored or logged.

const screen = screenerFromEnv();

export default (req: Request) => handleFindRole(req, { screen });

// Literals, because Netlify reads this config statically at deploy. A test keeps them in
// step with FIND_ROLE_PATH and FIND_RATE_LIMIT in the handler.
export const config: Config = {
  path: '/api/fit-role',
  method: ['GET'],
  rateLimit: { windowLimit: 10, windowSize: 180, aggregateBy: ['ip', 'domain'] },
};
