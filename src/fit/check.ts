import type Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt, buildUserMessage, MODEL, postingTag, PROMPT_VERSION } from './prompt.ts';
import { assessmentJsonSchema, validateAssessment, type FitAssessment } from './schema.ts';

/** The one SDK call the check makes. Tests pass a stub. */
export interface MessagesClient {
  create(params: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message>;
}

export function messagesClient(client: Anthropic): MessagesClient {
  return { create: (params) => client.messages.create(params) };
}

export const LIMITS = {
  /** Shorter than this isn't a posting. */
  minChars: 150,
  /** About three pages of posting; the page counts down to it. */
  maxChars: 12_000,
  /** Covers low-effort thinking plus a reply of a few hundred tokens. */
  maxTokens: 2_000,
  /** The first answer, and one retry when it fails the checks. */
  attempts: 2,
  /** Per call; two calls stay inside the function's 60-second limit. */
  timeoutMs: 25_000,
} as const;

/** Claude Haiku 5.5, prompts up to 100K tokens, from the pricing page (checked 2 November 2026). */
export const PRICING = { model: MODEL, inputPerMTok: 0.1, outputPerMTok: 0.5 } as const;

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export type InputError = 'empty' | 'too_short' | 'too_long';

/** Tidy the paste into the exact text the model sees and the quotes are checked against. */
export function preparePosting(raw: unknown): { ok: true; text: string } | { ok: false; error: InputError } {
  if (typeof raw !== 'string') return { ok: false, error: 'empty' };
  const text = raw.replace(/\r\n?/g, '\n').trim();
  if (!text) return { ok: false, error: 'empty' };
  if (text.length < LIMITS.minChars) return { ok: false, error: 'too_short' };
  if (text.length > LIMITS.maxChars) return { ok: false, error: 'too_long' };
  return { ok: true, text };
}

export type FitResult =
  | { status: 'ok'; assessment: FitAssessment; attempts: number; usage: Usage; promptVersion: string; model: string }
  | { status: 'unassessable'; problems: string[]; attempts: number; usage: Usage; promptVersion: string; model: string };

export interface CheckOptions {
  client: MessagesClient;
  /** Random tag suffix for the data block. Tests pass a fixed one. */
  random?: () => string;
  /** Called after each attempt with what failed, or an empty list. For evals and the try script. */
  onAttempt?: (attempt: number, problems: string[], res: Anthropic.Message) => void;
}

const defaultRandom = () => crypto.randomUUID().slice(0, 8);

/**
 * Ask the model for a verdict on one prepared posting and check the answer: schema, reason
 * codes, and every quote verbatim from the posting. A failed answer is retried once with
 * the problems listed, then given up as unassessable. API errors are thrown to the caller.
 */
export async function checkFit(text: string, opts: CheckOptions): Promise<FitResult> {
  const system = buildSystemPrompt();
  const tag = postingTag(opts.random ?? defaultRandom);
  const usage: Usage = { inputTokens: 0, outputTokens: 0, costUsd: 0 };
  const meta = { promptVersion: PROMPT_VERSION, model: MODEL };
  let problems: string[] = [];

  for (let attempt = 1; attempt <= LIMITS.attempts; attempt++) {
    const res = await opts.client.create({
      model: MODEL,
      max_tokens: LIMITS.maxTokens,
      system,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: assessmentJsonSchema } },
      messages: [{ role: 'user', content: buildUserMessage(text, tag, problems) }],
    });
    addUsage(usage, res.usage);
    const result = interpret(res, text);
    opts.onAttempt?.(attempt, result.ok ? [] : result.problems, res);
    if (result.ok) return { status: 'ok', assessment: result.value, attempts: attempt, usage, ...meta };
    problems = result.problems;
  }
  return { status: 'unassessable', problems, attempts: LIMITS.attempts, usage, ...meta };
}

function addUsage(total: Usage, u: Anthropic.Usage) {
  const input = u.input_tokens + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0);
  total.inputTokens += input;
  total.outputTokens += u.output_tokens;
  total.costUsd += (input * PRICING.inputPerMTok + u.output_tokens * PRICING.outputPerMTok) / 1_000_000;
}

type Interpreted = { ok: true; value: FitAssessment } | { ok: false; problems: string[] };

/** Turn one response into a checked assessment, or the reasons it isn't one. */
export function interpret(res: Anthropic.Message, source: string): Interpreted {
  if (res.stop_reason === 'refusal') return { ok: false, problems: ['model refused'] };
  if (res.stop_reason === 'max_tokens') return { ok: false, problems: ['output hit max_tokens'] };
  const raw = res.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
  if (!raw) return { ok: false, problems: ['no text in response'] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, problems: ['output is not valid JSON'] };
  }
  return validateAssessment(parsed, source);
}
