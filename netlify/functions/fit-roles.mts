import type { Config } from '@netlify/functions';
import { funnelHandler } from '../../src/fit/finder/handler.ts';
import { screenerFromEnv } from '../../src/fit/finder/screen.ts';

// The funnel: every role on a set of public job boards, narrowed to the engineering, design
// and product roles open to the UK, then, with JEV_API_KEY set, screened by Jev, which rules
// out the clear noes. Only public postings go to Jev. Nothing is stored or logged. The answer
// is cached; see the handler.

export default funnelHandler({ screen: screenerFromEnv() });

// Literals, because Netlify reads this config statically at deploy. A test keeps them in
// step with FUNNEL_PATH and FUNNEL_RATE_LIMIT in the handler.
export const config: Config = {
  path: '/api/fit-roles',
  method: ['GET'],
  rateLimit: { windowLimit: 10, windowSize: 180, aggregateBy: ['ip', 'domain'] },
};
