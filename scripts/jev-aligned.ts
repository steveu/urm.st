// Real answers for the aligned mock-up, on invented postings only: Haiku's check as it runs
// today (verdict, reasons, quotes, location), and, sent at the same time, Jev on the site's
// reason list for the whole posting and for every sentence. Throwaway.
//
//   node --env-file=<env with JEV_API_KEY and ANTHROPIC_API_KEY> scripts/jev-aligned.ts
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import { checkFit, messagesClient } from '../src/fit/check.ts';
import { REASON_CODES } from '../src/fit/copy.ts';
import { SAMPLE_POSTINGS } from '../src/fit/samples.ts';
import { ROLE } from '../src/components/fit/variants/real-role/mock.ts';
import { REASON_QUESTIONS } from '../src/components/fit/variants/jev/reasons.ts';
import { sentences, type Sentence } from '../src/components/fit/variants/jev/sentences.ts';

const key = process.env.JEV_API_KEY ?? process.env.TYPESAFE_API_KEY;
if (!key || !process.env.ANTHROPIC_API_KEY) throw new Error('Needs JEV_API_KEY and ANTHROPIC_API_KEY');
const CHUNK = 10;
type Noul = { type: 'noul'; instructions: string; criteria: { true: string; false: string } };

let tokens = 0;
async function jev(posting: string, questions: Record<string, Noul>) {
  const res = await fetch('https://api.typesafe.ai/v1/systemone', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'jev-1.14.0', state: { posting }, questions }),
  });
  if (!res.ok) throw new Error(`Jev ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = (await res.json()) as { answers: Record<string, { noul: number }>; usage: { input_tokens: number } };
  tokens += j.usage.input_tokens;
  return Object.fromEntries(Object.entries(j.answers).map(([k, v]) => [k, v.noul]));
}

const whole = (): Record<string, Noul> =>
  Object.fromEntries(
    REASON_CODES.map((c) => [c, { type: 'noul', instructions: REASON_QUESTIONS[c].instructions, criteria: { true: REASON_QUESTIONS[c].true, false: REASON_QUESTIONS[c].false } }]),
  );
const perSentence = (list: Sentence[]): Record<string, Noul> =>
  Object.fromEntries(
    list.flatMap((s) =>
      REASON_CODES.map((c) => [
        `${s.id}__${c}`,
        {
          type: 'noul',
          instructions: `Does this sentence from the \`posting\` show that the answer is yes to: ${REASON_QUESTIONS[c].instructions} Sentence: "${s.text}"`,
          criteria: {
            true: `The sentence itself says so. ${REASON_QUESTIONS[c].true}`,
            false: `The sentence is about something else, such as perks, the company or another duty, or it points the other way. ${REASON_QUESTIONS[c].false}`,
          },
        },
      ]),
    ),
  );

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 1,
  ...(process.env.ANTHROPIC_WORKSPACE_ID ? { defaultHeaders: { 'anthropic-workspace-id': process.env.ANTHROPIC_WORKSPACE_ID } } : {}),
});

const POSTINGS = [
  { id: 'halden', title: ROLE.title, company: ROLE.company, text: ROLE.text },
  ...SAMPLE_POSTINGS.filter((s) => s.id !== 'injection').map((s) => ({ id: s.id, title: s.title, company: s.company, text: s.text })),
];

const out: Record<string, unknown> = { jev: 'jev-1.14.0', ranAt: new Date().toISOString(), postings: {} };
for (const p of POSTINGS) {
  const list = sentences(p.text);
  const asked = list.filter((s) => !s.heading);
  const chunks: Sentence[][] = [];
  for (let i = 0; i < asked.length; i += CHUNK) chunks.push(asked.slice(i, i + CHUNK));
  const started = performance.now();
  const jevRun = Promise.all([jev(p.text, whole()), ...chunks.map((c) => jev(p.text, perSentence(c)))]).then((r) => ({ r, ms: performance.now() - started }));
  const haikuRun = checkFit(p.text, { client: messagesClient(anthropic) }).then((r) => ({ r, ms: performance.now() - started }));
  const [j, h] = await Promise.all([jevRun, haikuRun]);
  const [posting, ...parts] = j.r;
  const per: Record<string, Record<string, number>> = {};
  for (const part of parts) for (const [k, v] of Object.entries(part)) {
    const [sid, code] = k.split('__');
    (per[sid] ??= {})[code] = v;
  }
  (out.postings as Record<string, unknown>)[p.id] = {
    title: p.title,
    company: p.company,
    text: p.text,
    sentences: list,
    jev: { posting, sentences: per, ms: Math.round(j.ms), questions: REASON_CODES.length * (1 + asked.length) },
    haiku: { check: h.r.status === 'ok' ? h.r.assessment : null, ms: Math.round(h.ms) },
  };
  const a = h.r.status === 'ok' ? h.r.assessment : null;
  const agree = a?.reasons.map((r) => `${r.code} ${(posting[r.code] ?? 0).toFixed(2)}`).join(', ');
  const jevYes = REASON_CODES.filter((c) => posting[c] >= 0.7).join(', ');
  console.log(`${p.id}: Jev ${Math.round(j.ms)}ms, Haiku ${Math.round(h.ms)}ms ${a?.verdict}\n  Haiku's reasons, Jev's answer: ${agree}\n  Jev yes: ${jevYes}`);
}
console.log(`Jev cost $${((tokens * 0.042) / 1e6).toFixed(4)}`);
writeFileSync(resolve(import.meta.dirname, '../src/components/fit/variants/jev/aligned-answers.json'), `${JSON.stringify(out, null, 2)}\n`);
