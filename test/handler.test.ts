import { APIError } from '@anthropic-ai/sdk';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { config } from '../netlify/functions/fit-check.mts';
import { LIMITS, type MessagesClient } from '../src/fit/check.ts';
import { clientFromEnv, FIT_CHECK_PATH, handleFitCheck, RATE_LIMIT } from '../src/fit/handler.ts';
import { message, POSTING, stubClient, validAnswer } from './helpers.ts';
import { PROMPT_VERSION } from '../src/fit/prompt.ts';

const post = (body: unknown, init: RequestInit = {}) =>
  new Request(`https://urm.st${FIT_CHECK_PATH}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
    ...init,
  });

const deps = (client: MessagesClient | null) => ({ client: () => client, random: () => 'abc123' });

afterEach(() => vi.restoreAllMocks());

describe('handleFitCheck', () => {
  it('returns the checked assessment and nothing else', async () => {
    const { client } = stubClient([message(validAnswer())]);
    const res = await handleFitCheck(post({ text: POSTING }), deps(client));
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.json()).toEqual({ status: 'ok', promptVersion: PROMPT_VERSION, ...validAnswer() });
  });

  it('says unassessable, without the problems, when the answers never check out', async () => {
    const { client } = stubClient([message('nope'), message('still nope')]);
    const res = await handleFitCheck(post({ text: POSTING }), deps(client));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'unassessable', promptVersion: PROMPT_VERSION });
  });

  it('takes POST only', async () => {
    const res = await handleFitCheck(new Request(`https://urm.st${FIT_CHECK_PATH}`), deps(null));
    expect(res.status).toBe(405);
  });

  it('turns away malformed bodies', async () => {
    for (const body of ['{', '"text"', JSON.stringify({ posting: POSTING }), 'null']) {
      const res = await handleFitCheck(post(body), deps(null));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ status: 'error', error: 'bad_request' });
    }
  });

  it('turns away short and overlong postings before calling the model', async () => {
    const { client, calls } = stubClient([]);
    const short = await handleFitCheck(post({ text: 'Engineer wanted.' }), deps(client));
    const long = await handleFitCheck(post({ text: 'x'.repeat(LIMITS.maxChars + 1) }), deps(client));
    const huge = await handleFitCheck(post('x'.repeat(70_000)), deps(client));
    expect(short.status).toBe(400);
    expect(await short.json()).toEqual({ status: 'error', error: 'too_short' });
    expect(long.status).toBe(413);
    expect(await long.json()).toEqual({ status: 'error', error: 'too_long', maxChars: LIMITS.maxChars });
    expect(huge.status).toBe(413);
    expect(calls).toHaveLength(0);
  });

  it('is unavailable without an API key', async () => {
    const res = await handleFitCheck(post({ text: POSTING }), deps(null));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ status: 'error', error: 'unavailable' });
  });

  it('reports a busy model, logging only the status and never the posting', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const busy = APIError.generate(429, { type: 'error', error: { type: 'rate_limit_error', message: 'slow down' } }, undefined, new Headers());
    const { client } = stubClient([busy]);
    const res = await handleFitCheck(post({ text: POSTING }), deps(client));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ status: 'error', error: 'busy' });
    expect(log).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith('fit-check: model call failed (429)');
  });
});

describe('clientFromEnv', () => {
  it('has no client without a key, and builds one once with a key', () => {
    expect(clientFromEnv({})()).toBeNull();
    const get = clientFromEnv({ ANTHROPIC_API_KEY: 'test-key' });
    expect(get()).not.toBeNull();
    expect(get()).toBe(get());
  });
});

describe('function config', () => {
  it('matches the handler: path, POST only, per-visitor rate limit', () => {
    expect(config.path).toBe(FIT_CHECK_PATH);
    expect(config.method).toEqual(['POST']);
    expect(config.rateLimit).toEqual({ ...RATE_LIMIT, aggregateBy: ['ip', 'domain'] });
  });
});

describe('handleFitCheck with a job link', () => {
  // An invented Lever posting whose text holds validAnswer's quotes
  const UUID = '0b6f5c1e-2d3a-4e5f-8a9b-0c1d2e3f4a5b';
  const LINK = `https://jobs.lever.co/example-ltd/${UUID}`;
  const LEVER = {
    id: UUID,
    text: 'Senior Product Engineer, AI',
    country: 'GB',
    workplaceType: 'hybrid',
    categories: { allLocations: ['York, hybrid (two days a week in the office)'] },
    description:
      '<p>We are building an assistant for small bookshops.</p><ul><li>Own the assistant end to end, from the chat interface to the evals.</li><li>Build in TypeScript and React.</li><li>Work with our designer on what we build next.</li></ul>',
  };

  const stubFetch = (respond: () => Response) => {
    const urls: string[] = [];
    const fetch = async (url: URL) => {
      urls.push(url.href);
      return respond();
    };
    return { fetch, urls };
  };
  const linkDeps = (client: MessagesClient | null, fetch: (url: URL) => Promise<Response>) => ({
    client: () => client,
    random: () => 'abc123',
    fetch,
  });

  it('reads the posting from the board and returns it with the checked answer', async () => {
    const { fetch, urls } = stubFetch(() => Response.json(LEVER));
    const { client, calls } = stubClient([message(validAnswer())]);
    const res = await handleFitCheck(post({ text: LINK }), linkDeps(client, fetch));
    expect(urls).toEqual([`https://api.lever.co/v0/postings/example-ltd/${UUID}?mode=json`]);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ status: 'ok', promptVersion: PROMPT_VERSION, ...validAnswer() });
    expect(body.posting).toMatchObject({ board: 'lever', title: 'Senior Product Engineer, AI', truncated: false });
    expect(body.posting.text).toMatch(/^Senior Product Engineer, AI\nLocation: York, hybrid \(two days a week in the office\)\nWorkplace: Hybrid\nCountry: United Kingdom\n\n/);
    // The model read the board's text, not the link
    const sent = calls[0].messages[0].content as string;
    expect(sent).toContain('Workplace: Hybrid');
    expect(sent).not.toContain(LINK);
  });

  it('turns LinkedIn and other links away without fetching anything or calling the model', async () => {
    const { fetch, urls } = stubFetch(() => Response.json({}));
    const { client, calls } = stubClient([]);
    const linkedin = await handleFitCheck(post({ text: 'https://www.linkedin.com/jobs/view/1234567890/' }), linkDeps(client, fetch));
    const other = await handleFitCheck(post({ text: 'https://example.com/careers/engineer' }), linkDeps(client, fetch));
    expect(linkedin.status).toBe(422);
    expect(await linkedin.json()).toEqual({ status: 'error', error: 'linkedin' });
    expect(other.status).toBe(422);
    expect(await other.json()).toEqual({ status: 'error', error: 'unsupported_link' });
    expect(urls).toHaveLength(0);
    expect(calls).toHaveLength(0);
  });

  it('doesn’t fetch a board link when there’s no model to read it', async () => {
    const { fetch, urls } = stubFetch(() => Response.json(LEVER));
    const res = await handleFitCheck(post({ text: LINK }), linkDeps(null, fetch));
    expect(res.status).toBe(503);
    expect(urls).toHaveLength(0);
  });

  it('says when the job isn’t there or the board fails, without calling the model', async () => {
    const { client, calls } = stubClient([]);
    const missing = await handleFitCheck(post({ text: LINK }), linkDeps(client, stubFetch(() => new Response('', { status: 404 })).fetch));
    const down = await handleFitCheck(post({ text: LINK }), linkDeps(client, stubFetch(() => new Response('', { status: 500 })).fetch));
    expect(missing.status).toBe(422);
    expect(await missing.json()).toEqual({ status: 'error', error: 'not_found' });
    expect(down.status).toBe(502);
    expect(await down.json()).toEqual({ status: 'error', error: 'board_failed' });
    expect(calls).toHaveLength(0);
  });

  it('turns away a board posting with too little text to judge', async () => {
    const { client, calls } = stubClient([]);
    const thin = { id: UUID, text: 'Engineer', categories: { location: 'York' }, description: '<p>Join us.</p>' };
    const res = await handleFitCheck(post({ text: LINK }), linkDeps(client, stubFetch(() => Response.json(thin)).fetch));
    expect(await res.json()).toEqual({ status: 'error', error: 'too_short' });
    expect(calls).toHaveLength(0);
  });
});
