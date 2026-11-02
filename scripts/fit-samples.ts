// Run the fit check live on the four invented sample postings and write what came back to
// src/fit/sample-results.json, which the home band renders at build time. Re-run it after
// changing a sample, the prompt or the model (a test fails until you do), and commit the JSON.
//
//   node --env-file=<your env file> scripts/fit-samples.ts [--force]
//
// Each sample is there to show one kind of answer. If a verdict comes back other than the one
// the sample was written for, nothing is written: look at the posting and the prompt rather
// than re-rolling until it agrees. --force writes it anyway.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { checkFit, preparePosting } from '../src/fit/check.ts';
import { clientFromEnv } from '../src/fit/handler.ts';
import { SAMPLE_POSTINGS } from '../src/fit/samples.ts';
import type { SampleResults } from '../src/fit/sample-results.ts';

const OUT = resolve(import.meta.dirname, '..', 'src/fit/sample-results.json');
const force = process.argv.includes('--force');

const client = clientFromEnv()();
if (!client) {
  console.error('Set ANTHROPIC_API_KEY in the environment.');
  process.exit(1);
}

const out: SampleResults = { model: '', promptVersion: '', results: {} };
let cost = 0;
let mismatched = false;

for (const s of SAMPLE_POSTINGS) {
  const posting = preparePosting(s.text);
  if (!posting.ok) throw new Error(`${s.id}: ${posting.error}`);
  const r = await checkFit(posting.text, { client });
  cost += r.usage.costUsd;
  out.model = r.model;
  out.promptVersion = r.promptVersion;
  if (r.status !== 'ok') {
    console.error(`${s.id}: unassessable after ${r.attempts} attempts: ${r.problems.join('; ')}`);
    process.exit(1);
  }
  const a = r.assessment;
  const expected = s.id === 'injection' ? a.injection.present : a.verdict === s.id;
  if (!expected) mismatched = true;
  console.log(`${s.id}: ${a.verdict}, location ${a.location.verdict}, injection ${a.injection.present}${expected ? '' : '  <- not what the sample was written for'}`);
  out.results[s.id] = a;
}

console.log(`cost $${cost.toFixed(5)}`);
if (mismatched && !force) {
  console.error('Not written: a sample came back other than intended (pass --force to write it anyway).');
  process.exit(1);
}
writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
console.log(`Wrote ${OUT}`);
