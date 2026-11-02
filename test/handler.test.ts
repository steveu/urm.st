import { APIError } from '@anthropic-ai/sdk';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { config } from '../netlify/functions/fit-check.mts';
import { LIMITS, type MessagesClient } from '../src/fit/check.ts';
import { clientFromEnv, FIT_CHECK_PATH, handleFitCheck, RATE_LIMIT } from '../src/fit/handler.ts';
import { message, POSTING, stubClient, validAnswer } from './helpers.ts';

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
    expect(await res.json()).toEqual({ status: 'ok', promptVersion: 'fit-v1', ...validAnswer() });
  });

  it('says unassessable, without the problems, when the answers never check out', async () => {
    const { client } = stubClient([message('nope'), message('still nope')]);
    const res = await handleFitCheck(post({ text: POSTING }), deps(client));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'unassessable', promptVersion: 'fit-v1' });
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
