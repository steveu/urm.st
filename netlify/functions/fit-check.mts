import type { Config } from '@netlify/functions';
import { clientFromEnv, handleFitCheck } from '../../src/fit/handler.ts';

// The fit check: a pasted posting in, a checked verdict out. The API key is in Netlify's
// environment, never the client. Nothing is stored or logged.

const client = clientFromEnv();

export default (req: Request) => handleFitCheck(req, { client });

// Literals, because Netlify reads this config statically at deploy. A test keeps them in
// step with FIT_CHECK_PATH and RATE_LIMIT in the handler.
export const config: Config = {
  path: '/api/fit-check',
  method: ['POST'],
  // Per visitor, enforced by Netlify before the function runs; over the limit gets a 429.
  // A monthly spend cap in the Anthropic Console backs it up.
  rateLimit: { windowLimit: 5, windowSize: 180, aggregateBy: ['ip', 'domain'] },
};
