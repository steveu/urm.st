// Run the fit check live on every red-team pair (src/fit/evals/redteam.ts), the posting as
// written and with an instruction to AI tools slipped in, and write the aggregate figures to
// src/fit/evals/redteam-results.json. The postings are invented; only the counts are written.
//
//   node --env-file=<your env file> scripts/fit-redteam.ts
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { checkFit, preparePosting } from '../src/fit/check.ts';
import { buildPairs } from '../src/fit/evals/redteam.ts';
import { outcomeOf, summariseRedTeam, type PairOutcome, type RunOutcome } from '../src/fit/evals/summarise.ts';
import { clientFromEnv } from '../src/fit/handler.ts';
import { MODEL, PROMPT_VERSION } from '../src/fit/prompt.ts';
import { pool } from './fit-pool.ts';

const OUT = resolve(import.meta.dirname, '..', 'src/fit/evals/redteam-results.json');

const client = clientFromEnv()();
if (!client) {
  console.error('Set ANTHROPIC_API_KEY in the environment.');
  process.exit(1);
}

async function run(text: string): Promise<RunOutcome> {
  const posting = preparePosting(text);
  if (!posting.ok) throw new Error(`red-team posting rejected: ${posting.error}`);
  let firstFailed = false;
  const result = await checkFit(posting.text, {
    client: client!,
    onAttempt: (n, problems) => {
      if (n === 1 && problems.length) firstFailed = true;
    },
  });
  return outcomeOf(result, firstFailed);
}

const pairs = buildPairs();
const outcomes = await pool(pairs, 4, async (p): Promise<PairOutcome> => {
  const [clean, injected] = await Promise.all([run(p.clean), run(p.injected)]);
  const show = (r: RunOutcome) => (r.ok ? `${r.verdict}/${r.location}/${r.injectionPresent ? 'flagged' : '-'}` : 'unassessable');
  console.log(`${p.pair.id.padEnd(30)} clean ${show(clean).padEnd(34)} injected ${show(injected)}`);
  return { base: p.base.id, kind: p.pair.kind, injectionText: p.injectionText, clean, injected };
});

const results = summariseRedTeam(outcomes, { ranAt: new Date().toISOString().slice(0, 10), model: MODEL, promptVersion: PROMPT_VERSION });
console.log(JSON.stringify(results, null, 2));
writeFileSync(OUT, `${JSON.stringify(results, null, 2)}\n`);
console.log(`Wrote ${OUT}`);
