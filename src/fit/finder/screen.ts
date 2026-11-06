// Jev screening for the funnel: five yes/no questions that each, on their own, make a
// role a clear no for the profile. A candidate is ruled out when any answer is 0.9 or above;
// anything else is left for Haiku to judge. Jev only ever rules a role out, never in.
//
// The wording is job-radar's (src/eval/criteria/criteria.ts on the jev-criteria branch). On
// its 272 labelled postings, this rule ruled out 115 of 253 skips and none of the 19 keeps or
// maybes. The threshold and the choice of questions were made looking at that same set, so
// the figure is optimistic until it's checked on fresh labels. "Agency" is left out: it read
// recruiters as agencies.
//
// Only public job board postings are sent to Jev, never a visitor's paste. Nothing is stored.

export const JEV_MODEL = 'jev-1.14.0';
export const JEV_URL = 'https://api.typesafe.ai/v1/systemone';
/** Input tokens only; output is free (docs.typesafe.ai/go/models, checked 2026-11-06). */
export const JEV_USD_PER_MTOK = 0.042;

/** At or above this, an answer rules the role out. */
export const RULE_OUT_AT = 0.9;

export const SCREEN_LIMITS = { timeoutMs: 4_000, maxResponseBytes: 64 * 1024 } as const;

interface Question {
  instructions: string;
  true: string;
  false: string;
}

export const SCREEN_QUESTIONS = {
  backend_or_data: {
    instructions: "Is the main work of the role in the `posting` backend or data work rather than an interface or an AI agent's behaviour?",
    true: 'Most duties are services, APIs, data pipelines, indexes, ML models, infrastructure, distributed systems, platform work or on-call.',
    false: "Most duties are a user interface, a design system, an agent's prompts and tools, or product decisions, even if some backend work is included.",
  },
  customer_delivery: {
    instructions: "Is the role in the `posting` customer-facing delivery work for the employer's customers?",
    true: 'Forward deployed, solutions, integration or implementation engineering, developer experience, developer relations, or SDK work for outside developers.',
    false: "The role builds the employer's own product for its users, even if it talks to customers to learn what they need.",
  },
  people_management: {
    instructions: 'Is the role in the `posting` mainly people management?',
    true: 'Most duties are line management, hiring, performance reviews, planning and delivery tracking, with little hands-on building.',
    false: 'The role is mainly hands-on building, even if it includes mentoring or leading technical decisions.',
  },
  off_discipline: {
    instructions: 'Is the role in the `posting` outside software, design and product work on web or AI products?',
    true: 'The role is sales, marketing, customer support, embedded firmware, hardware, native mobile apps, or DevOps.',
    false: 'The role is software engineering, design engineering, applied AI or product management on a web or AI product.',
  },
  explicitly_junior: {
    instructions: 'Does the `posting` explicitly mark the role as junior?',
    true: "The title says junior, graduate, intern or apprentice; or it is a graduate programme; or it asks for under three years' experience, such as 0-2 or 1-2 years.",
    false: "The posting says senior, lead, staff or mid-level, says nothing about level, or asks for three or more years' experience.",
  },
} as const satisfies Record<string, Question>;

export type ScreenId = keyof typeof SCREEN_QUESTIONS;
export const SCREEN_IDS = Object.keys(SCREEN_QUESTIONS) as ScreenId[];

export interface ScreenAnswer {
  answers: Record<ScreenId, number>;
  inputTokens: number;
}

/** Answers the screening questions about one posting's text. Throws when Jev can't. */
export type Screener = (text: string) => Promise<ScreenAnswer>;

/** The one request: the posting as the state, every question asked of it at once. */
export function screenRequest(text: string) {
  return {
    model: JEV_MODEL,
    state: { posting: text },
    questions: Object.fromEntries(
      SCREEN_IDS.map((id) => {
        const q = SCREEN_QUESTIONS[id];
        return [id, { type: 'noul', instructions: q.instructions, criteria: { true: q.true, false: q.false } }];
      }),
    ),
  };
}

/** The strongest answer at or above the line, or null when nothing rules the role out. */
export function ruling(answers: Record<ScreenId, number>): { reason: ScreenId; p: number } | null {
  let best: { reason: ScreenId; p: number } | null = null;
  for (const id of SCREEN_IDS) {
    const p = answers[id];
    if (p >= RULE_OUT_AT && (!best || p > best.p)) best = { reason: id, p };
  }
  return best;
}

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

export function jevScreener(opts: { apiKey: string; fetch?: Fetch; timeoutMs?: number; retryMs?: number }): Screener {
  const doFetch = opts.fetch ?? ((url, init) => fetch(url, init));
  const send = (text: string) =>
    doFetch(JEV_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${opts.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify(screenRequest(text)),
      redirect: 'error',
      signal: AbortSignal.timeout(opts.timeoutMs ?? SCREEN_LIMITS.timeoutMs),
    });
  return async (text) => {
    let res = await send(text);
    // Over the rate limit: one more try after a short wait, then it's a failure like any other
    if (res.status === 429) {
      await res.body?.cancel().catch(() => {});
      await new Promise((r) => setTimeout(r, opts.retryMs ?? 600));
      res = await send(text);
    }
    if (!res.ok) {
      await res.body?.cancel().catch(() => {});
      throw new Error(`Jev ${res.status}`);
    }
    const raw = await res.text();
    if (raw.length > SCREEN_LIMITS.maxResponseBytes) throw new Error('Jev answer too large');
    const json = JSON.parse(raw) as { answers?: Record<string, { noul?: unknown }>; usage?: { input_tokens?: unknown } };
    const answers = {} as Record<ScreenId, number>;
    for (const id of SCREEN_IDS) {
      const p = json.answers?.[id]?.noul;
      if (typeof p !== 'number' || !(p >= 0 && p <= 1)) throw new Error(`Jev gave no answer for ${id}`);
      answers[id] = p;
    }
    const tokens = json.usage?.input_tokens;
    return { answers, inputTokens: typeof tokens === 'number' ? tokens : 0 };
  };
}

/** A screener from the environment, or null when no key is set: the funnel then doesn't screen. */
export function screenerFromEnv(env: Record<string, string | undefined> = process.env): Screener | null {
  const apiKey = env.JEV_API_KEY ?? env.TYPESAFE_API_KEY;
  return apiKey ? jevScreener({ apiKey }) : null;
}
