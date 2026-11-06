// Test the proposed "for" criteria (variants/jev/extra.ts) on five invented postings: Jev's
// posting-level answers against the expected ones, and which sentences each marks. Throwaway.
//
//   node --env-file=<env with JEV_API_KEY> scripts/jev-extra.ts
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SAMPLE_POSTINGS } from '../src/fit/samples.ts';
import { ROLE } from '../src/components/fit/variants/real-role/mock.ts';
import { EXTRA, EXTRA_IDS, GOLD, TS_REACT, type ExtraId } from '../src/components/fit/variants/jev/extra.ts';
import { sentences, type Sentence } from '../src/components/fit/variants/jev/sentences.ts';

const JEV_URL = 'https://api.typesafe.ai/v1/systemone';
const key = process.env.JEV_API_KEY ?? process.env.TYPESAFE_API_KEY;
if (!key) throw new Error('Needs JEV_API_KEY');
type Noul = { type: 'noul'; instructions: string; criteria: { true: string; false: string } };

async function jev(state: object, questions: Record<string, Noul>) {
  const res = await fetch(JEV_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'jev-1.14.0', state, questions }),
  });
  if (!res.ok) throw new Error(`Jev ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = (await res.json()) as { answers: Record<string, { noul: number }>; usage: { input_tokens: number } };
  return { a: Object.fromEntries(Object.entries(j.answers).map(([k, v]) => [k, v.noul])), tokens: j.usage.input_tokens };
}

const whole = (): Record<string, Noul> =>
  Object.fromEntries(EXTRA_IDS.map((id) => [id, { type: 'noul', instructions: EXTRA[id].instructions, criteria: { true: EXTRA[id].true, false: EXTRA[id].false } }]));
const perSentence = (list: Sentence[]): Record<string, Noul> =>
  Object.fromEntries(
    list.flatMap((s) =>
      EXTRA_IDS.map((id) => [
        `${s.id}__${id}`,
        {
          type: 'noul',
          instructions: `Does this sentence from the \`posting\` show that the answer is yes to: ${EXTRA[id].instructions} Sentence: "${s.text}"`,
          criteria: {
            true: `The sentence itself says so. ${EXTRA[id].true}`,
            false: `The sentence is about something else, such as perks, the company or another duty, or it points the other way. ${EXTRA[id].false}`,
          },
        },
      ]),
    ),
  );

const POSTINGS = [...SAMPLE_POSTINGS.map((s) => ({ id: s.id, text: s.text })), { id: 'halden', text: ROLE.text }];
const out: Record<string, unknown> = {};
let tokens = 0;
let right = 0;
let scored = 0;
const misses: string[] = [];
for (const p of POSTINGS) {
  const asked = sentences(p.text).filter((s) => !s.heading);
  const chunks: Sentence[][] = [];
  for (let i = 0; i < asked.length; i += 12) chunks.push(asked.slice(i, i + 12));
  const [w, ...parts] = await Promise.all([jev({ posting: p.text }, whole()), ...chunks.map((c) => jev({ posting: p.text }, perSentence(c)))]);
  tokens += w.tokens + parts.reduce((n, x) => n + x.tokens, 0);
  const sent: Record<string, Record<string, number>> = {};
  for (const part of parts) for (const [k, v] of Object.entries(part.a)) {
    const [sid, cid] = k.split('__');
    (sent[sid] ??= {})[cid] = v;
  }
  const posting: Record<string, number> = { ...w.a, typescript_react: TS_REACT.test(p.text) ? 1 : 0 };
  out[p.id] = { posting, sentences: sent };

  console.log(`\n== ${p.id}`);
  for (const id of ['typescript_react', ...EXTRA_IDS] as Array<ExtraId | 'typescript_react'>) {
    const prob = posting[id];
    const gold = GOLD[p.id][id];
    const read = prob >= 0.7 ? true : prob <= 0.3 ? false : null;
    const ok = gold === null ? '  ' : read === gold ? 'ok' : 'XX';
    if (gold !== null) {
      scored++;
      if (read === gold) right++;
      else misses.push(`${p.id}.${id}: ${prob.toFixed(2)}, expected ${gold}`);
    }
    const marked =
      id === 'typescript_react'
        ? asked.filter((s) => TS_REACT.test(s.text))
        : prob >= 0.7
          ? asked.filter((s) => (sent[s.id]?.[id] ?? 0) >= 0.5)
          : [];
    console.log(`${ok} ${id.padEnd(18)} ${prob.toFixed(2)} gold ${String(gold).padEnd(5)} ${marked.map((s) => `[${s.text.slice(0, 48)}]`).join(' ')}`);
  }
}
console.log(`\nPosting-level: ${right} of ${scored} expected answers (settled and right); cost $${((tokens * 0.042) / 1e6).toFixed(4)}`);
if (misses.length) console.log(`Misses or unsettled:\n  ${misses.join('\n  ')}`);
writeFileSync(resolve(import.meta.dirname, '../src/components/fit/variants/jev/extra-answers.json'), `${JSON.stringify(out, null, 2)}\n`);
