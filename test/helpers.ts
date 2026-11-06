import type Anthropic from '@anthropic-ai/sdk';
import type { MessagesClient } from '../src/fit/check.ts';

/** An invented posting: no real listing, no real company. */
export const POSTING = `Senior Product Engineer, AI
Example Ltd · York, hybrid (two days a week in the office)

We are building an assistant for small bookshops.
- Own the assistant end to end, from the chat interface to the evals.
- Build in TypeScript and React.
- Work with our designer on what we build next.

Salary £70,000.`;

/** A valid answer for POSTING. */
export const validAnswer = () => ({
  verdict: 'strong',
  reasons: [
    { code: 'owns_agent', quote: 'Own the assistant end to end, from the chat interface to the evals.' },
    { code: 'typescript_react', quote: 'Build in TypeScript and React.' },
  ],
  location: { verdict: 'works', quote: 'York, hybrid (two days a week in the office)' },
  injection: { present: false, quote: null },
});

export function message(
  body: unknown,
  { input = 4000, output = 200, stop = 'end_turn' as Anthropic.StopReason } = {},
): Anthropic.Message {
  return {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model: 'claude-haiku-5-5',
    content: [
      { type: 'thinking', thinking: '', signature: 'sig' },
      { type: 'text', text: typeof body === 'string' ? body : JSON.stringify(body), citations: null },
    ],
    stop_reason: stop,
    stop_sequence: null,
    stop_details: null,
    usage: { input_tokens: input, output_tokens: output, cache_creation_input_tokens: null, cache_read_input_tokens: null },
  } as unknown as Anthropic.Message;
}

/** A stub client that answers from a queue of responses or errors, and records each request. */
export function stubClient(responses: Array<Anthropic.Message | Error>) {
  const calls: Anthropic.MessageCreateParamsNonStreaming[] = [];
  const client: MessagesClient = {
    async create(params) {
      calls.push(params);
      const next = responses.shift();
      if (!next) throw new Error('stub client: no response queued');
      if (next instanceof Error) throw next;
      return next;
    },
  };
  return { client, calls };
}
