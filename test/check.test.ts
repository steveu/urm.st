import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkFit, LIMITS, preparePosting } from '../src/fit/check.ts';
import { REASONS } from '../src/fit/copy.ts';
import { PROFILE } from '../src/fit/profile.ts';
import { buildSystemPrompt, MODEL, PROMPT_VERSION } from '../src/fit/prompt.ts';
import { message, POSTING, stubClient, validAnswer } from './helpers.ts';

const fixed = () => 'abc123';

describe('preparePosting', () => {
  it('normalises line endings and trims', () => {
    expect(preparePosting(`  ${POSTING.replace(/\n/g, '\r\n')}  `)).toEqual({ ok: true, text: POSTING });
  });

  it('turns away empty, short and overlong pastes', () => {
    expect(preparePosting('')).toEqual({ ok: false, error: 'empty' });
    expect(preparePosting(42)).toEqual({ ok: false, error: 'empty' });
    expect(preparePosting('Product engineer, York.')).toEqual({ ok: false, error: 'too_short' });
    expect(preparePosting('x'.repeat(LIMITS.maxChars + 1))).toEqual({ ok: false, error: 'too_long' });
    expect(preparePosting('x'.repeat(LIMITS.maxChars)).ok).toBe(true);
  });
});

describe('checkFit', () => {
  it('sends the pinned model, a token cap, no tools, and the posting as delimited data', async () => {
    const { client, calls } = stubClient([message(validAnswer())]);
    const r = await checkFit(POSTING, { client, random: fixed });

    expect(r).toMatchObject({ status: 'ok', attempts: 1, promptVersion: PROMPT_VERSION, model: MODEL });
    expect(calls).toHaveLength(1);
    const p = calls[0];
    expect(p.model).toBe('claude-haiku-5-5');
    expect(p.max_tokens).toBe(LIMITS.maxTokens);
    expect(p.tools).toBeUndefined();
    expect(p.output_config?.format?.type).toBe('json_schema');
    expect(p.messages).toEqual([{ role: 'user', content: `<posting-abc123>\n${POSTING}\n</posting-abc123>` }]);
  });

  it('retries once with the problems, then succeeds', async () => {
    const bad = validAnswer();
    bad.reasons[0].quote = 'Owns everything forever';
    const { client, calls } = stubClient([message(bad), message(validAnswer())]);
    const r = await checkFit(POSTING, { client, random: fixed });

    expect(r).toMatchObject({ status: 'ok', attempts: 2 });
    expect(calls[1].messages[0].content).toContain('A previous answer for this posting was rejected');
    expect(calls[1].messages[0].content).toContain('reasons[0].quote: not a verbatim quote');
  });

  it('gives up as unassessable after two failed answers', async () => {
    const { client, calls } = stubClient([message('not json'), message({ verdict: 'strong' })]);
    const r = await checkFit(POSTING, { client });
    expect(r.status).toBe('unassessable');
    expect(calls).toHaveLength(2);
  });

  it('treats refusals and truncated replies as failed answers', async () => {
    const { client } = stubClient([message('', { stop: 'refusal' }), message(validAnswer(), { stop: 'max_tokens' })]);
    const r = await checkFit(POSTING, { client });
    expect(r).toMatchObject({ status: 'unassessable', problems: ['output hit max_tokens'] });
  });

  it('adds up tokens and cost across attempts', async () => {
    const { client } = stubClient([message('nope', { input: 4000, output: 1000 }), message(validAnswer(), { input: 4000, output: 200 })]);
    const r = await checkFit(POSTING, { client });
    expect(r.usage.inputTokens).toBe(8000);
    expect(r.usage.outputTokens).toBe(1200);
    // 8,000 in at $0.10/MTok and 1,200 out at $0.50/MTok
    expect(r.usage.costUsd).toBeCloseTo(0.0014, 8);
  });

  it('lets API errors through to the caller', async () => {
    const { client } = stubClient([new Error('boom')]);
    await expect(checkFit(POSTING, { client })).rejects.toThrow('boom');
  });
});

describe('the system prompt', () => {
  it('carries the public profile, verbatim from profile.md', () => {
    const md = readFileSync(new URL('../src/fit/profile.md', import.meta.url), 'utf8');
    expect(PROFILE).toBe(md);
    expect(buildSystemPrompt()).toContain(PROFILE);
  });

  it('lists every reason code with its site copy', () => {
    const system = buildSystemPrompt();
    for (const [code, r] of Object.entries(REASONS)) expect(system).toContain(`- ${code} (${r.side}): ${r.copy}`);
  });
});
