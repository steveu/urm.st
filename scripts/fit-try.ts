// Run the fit check live on the invented sample postings and print each verdict, its checks
// and its cost. Needs ANTHROPIC_API_KEY (and ANTHROPIC_WORKSPACE_ID if the key isn't scoped
// to one) in the environment:
//
//   node --env-file=<your env file> scripts/fit-try.ts [sample id ...]
import { checkFit, preparePosting } from '../src/fit/check.ts';
import { clientFromEnv } from '../src/fit/handler.ts';
import { SAMPLE_POSTINGS } from '../src/fit/samples.ts';

const client = clientFromEnv()();
if (!client) {
  console.error('Set ANTHROPIC_API_KEY in the environment.');
  process.exit(1);
}

const wanted = process.argv.slice(2);
const samples = SAMPLE_POSTINGS.filter((s) => !wanted.length || wanted.includes(s.id));
let total = 0;
for (const s of samples) {
  const posting = preparePosting(s.text);
  if (!posting.ok) throw new Error(`${s.id}: ${posting.error}`);
  const started = Date.now();
  const r = await checkFit(posting.text, {
    client,
    onAttempt: (n, problems, res) => {
      if (problems.length) console.log(`  attempt ${n} failed (${res.stop_reason}, ${res.usage.output_tokens} out): ${problems.join('; ')}`);
    },
  });
  total += r.usage.costUsd;
  const head = `${s.id}: ${r.status}, ${r.attempts} attempt(s), ${((Date.now() - started) / 1000).toFixed(1)}s, ${r.usage.inputTokens} in / ${r.usage.outputTokens} out, $${r.usage.costUsd.toFixed(5)}`;
  console.log(head);
  if (r.status === 'ok') console.log(JSON.stringify(r.assessment, null, 2));
  else console.log(r.problems.map((p) => `  ${p}`).join('\n'));
}
console.log(`total $${total.toFixed(5)} for ${samples.length}`);
