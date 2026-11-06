// Jev screening for the funnel: a bar each role has to clear before Haiku might read it. Five
// questions each ask about something that pulls a role away from the profile, and one asks
// whether it's mainly hands-on building. A role passes when Jev reads it as hands-on building
// (0.7 or above) with nothing much against it (every other answer under 0.3). 0.7 and 0.3 are
// TypeSafe's suggested starting lines for yes and no, not lines fitted to the roles below.
//
// Why a bar and not just the clear noes: on 6 November, Haiku checked 76 roles from the live
// pool. All 10 that Jev had ruled out at 0.9 came back Poor, but so did 33 of the 66 left, so
// "left" meant little. Of those 66, the 22 that cleared this bar came back 7 Strong, 13
// Partial and 2 Poor; the 44 that didn't, 2 Strong, 11 Partial and 31 Poor. The bar costs some
// good roles to show mostly good ones. One day's sample, and Haiku isn't ground truth.
//
// The five questions' wording is job-radar's (src/eval/criteria/criteria.ts on the
// jev-criteria branch); "Agency" is left out, as it read recruiters as agencies.
//
// Only public job board postings are sent to Jev, never a visitor's paste. Nothing is stored.

export const JEV_MODEL = 'jev-1.14.0';
export const JEV_URL = 'https://api.typesafe.ai/v1/systemone';
/** Input tokens only; output is free (docs.typesafe.ai/go/models, checked 2026-11-06). */
export const JEV_USD_PER_MTOK = 0.042;

/** A role passes with hands-on building at or above `handsOn`, and every other answer below `against`. */
export const PASS = { handsOn: 0.7, against: 0.3 } as const;

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

/**
 * The one question a role has to answer yes to. On the live pool it set apart the product
 * managers, product designers and programme managers, and none of the roles titled product,
 * frontend, full-stack, design or AI engineer. The profile counts hands-on product and design
 * roles as possible fits, but Haiku judged most of those Poor.
 */
export const HANDS_ON: Question = {
  instructions: 'Is the role in the `posting` mainly hands-on building of software: writing the code for a product’s features, interface or AI behaviour?',
  true: 'Most duties are writing and shipping code: product features, user interfaces, design systems in code, or an AI agent’s prompts, tools and evals.',
  false: 'Most duties are product management, visual or UX design without code, analysis, quality assurance, research, marketing, support or operations.',
};

export interface ScreenAnswer {
  answers: Record<ScreenId, number>;
  /** Jev's answer to HANDS_ON. */
  handsOn: number;
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
      [...SCREEN_IDS.map((id) => [id, SCREEN_QUESTIONS[id]] as const), ['hands_on', HANDS_ON] as const].map(([id, q]) => [
        id,
        { type: 'noul', instructions: q.instructions, criteria: { true: q.true, false: q.false } },
      ]),
    ),
  };
}

/** Why Jev turns a role down: one of the five, or that it isn't mainly hands-on building. */
export type TurnDown = ScreenId | 'not_hands_on';

/**
 * Null when the role passes; otherwise the strongest reason it doesn't, with how sure Jev is
 * of that no (for hands-on building, one less its answer).
 */
export function ruling(answers: Record<ScreenId, number>, handsOn: number): { reason: TurnDown; p: number } | null {
  let worst: { reason: TurnDown; p: number } | null = handsOn < PASS.handsOn ? { reason: 'not_hands_on', p: 1 - handsOn } : null;
  for (const id of SCREEN_IDS) {
    const p = answers[id];
    if (p >= PASS.against && (!worst || p > worst.p)) worst = { reason: id, p };
  }
  return worst;
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
    const handsOn = json.answers?.hands_on?.noul;
    if (typeof handsOn !== 'number' || !(handsOn >= 0 && handsOn <= 1)) throw new Error('Jev gave no answer for hands_on');
    const tokens = json.usage?.input_tokens;
    return { answers, handsOn, inputTokens: typeof tokens === 'number' ? tokens : 0 };
  };
}

/** A screener from the environment, or null when no key is set: the funnel then doesn't screen. */
export function screenerFromEnv(env: Record<string, string | undefined> = process.env): Screener | null {
  const apiKey = env.JEV_API_KEY ?? env.TYPESAFE_API_KEY;
  return apiKey ? jevScreener({ apiKey }) : null;
}
