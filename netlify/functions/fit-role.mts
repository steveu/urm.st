import type { Config } from '@netlify/functions';
import { handleFindRole } from '../../src/fit/finder/handler.ts';

// The role finder: one live role's link, picked at random from public job boards, for the fit
// check band to check. No model call and no key. Nothing is stored or logged.

export default (req: Request) => handleFindRole(req);

// Literals, because Netlify reads this config statically at deploy. A test keeps them in
// step with FIND_ROLE_PATH and FIND_RATE_LIMIT in the handler.
export const config: Config = {
  path: '/api/fit-role',
  method: ['GET'],
  rateLimit: { windowLimit: 10, windowSize: 180, aggregateBy: ['ip', 'domain'] },
};
