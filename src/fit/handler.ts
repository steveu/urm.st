import Anthropic, { APIError } from '@anthropic-ai/sdk';
import { checkFit, LIMITS, messagesClient, preparePosting, type InputError, type MessagesClient } from './check.ts';
import type { FitAssessment } from './schema.ts';

// The HTTP side of the fit check, shared by the Netlify Function and the local preview
// server. Nothing here stores or logs what was pasted: the text lives for one request.

export const FIT_CHECK_PATH = '/api/fit-check';

/** Requests per visitor (IP and domain) per window. Netlify enforces it; see the function config. */
export const RATE_LIMIT = { windowLimit: 5, windowSize: 180 } as const;

/** Well above 12,000 characters of JSON-escaped text, well below anything worth reading. */
const MAX_BODY_BYTES = 64 * 1024;

export type FitError = InputError | 'method' | 'bad_request' | 'unavailable' | 'busy';

export type FitResponse =
  | ({ status: 'ok'; promptVersion: string } & FitAssessment)
  | { status: 'unassessable'; promptVersion: string }
  | { status: 'error'; error: FitError; maxChars?: number };

const STATUS: Record<FitError, number> = {
  method: 405,
  bad_request: 400,
  empty: 400,
  too_short: 400,
  too_long: 413,
  busy: 503,
  unavailable: 503,
};

const json = (body: FitResponse, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const fail = (error: FitError) => json({ status: 'error', error, ...(error === 'too_long' ? { maxChars: LIMITS.maxChars } : {}) }, STATUS[error]);

export interface HandlerDeps {
  /** Null when the API key isn't configured. */
  client: () => MessagesClient | null;
  random?: () => string;
}

export async function handleFitCheck(req: Request, deps: HandlerDeps): Promise<Response> {
  if (req.method !== 'POST') return fail('method');
  if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return fail('too_long');

  let body: unknown;
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return fail('too_long');
    body = JSON.parse(raw);
  } catch {
    return fail('bad_request');
  }
  if (typeof body !== 'object' || body === null || !('text' in body)) return fail('bad_request');

  const posting = preparePosting(body.text);
  if (!posting.ok) return fail(posting.error);

  const client = deps.client();
  if (!client) return fail('unavailable');

  try {
    const result = await checkFit(posting.text, { client, random: deps.random });
    if (result.status === 'unassessable') return json({ status: 'unassessable', promptVersion: result.promptVersion });
    return json({ status: 'ok', promptVersion: result.promptVersion, ...result.assessment });
  } catch (err) {
    // The status only: never the request, the posting or the model's reply
    const status = err instanceof APIError ? err.status : undefined;
    console.error(`fit-check: model call failed (${status ?? 'no status'})`);
    return fail(status === 429 || status === 529 ? 'busy' : 'unavailable');
  }
}

/**
 * A client from the environment, built once. The key is only ever read from the
 * environment: Netlify's in production, the shell's for the local preview.
 */
export function clientFromEnv(env: Record<string, string | undefined> = process.env): () => MessagesClient | null {
  let cached: MessagesClient | null | undefined;
  return () => {
    if (cached !== undefined) return cached;
    if (!env.ANTHROPIC_API_KEY) return (cached = null);
    // Keys that aren't scoped to a workspace must name one on every request
    const workspace = env.ANTHROPIC_WORKSPACE_ID;
    const client = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY,
      maxRetries: 0,
      timeout: LIMITS.timeoutMs,
      ...(workspace ? { defaultHeaders: { 'anthropic-workspace-id': workspace } } : {}),
    });
    return (cached = messagesClient(client));
  };
}
