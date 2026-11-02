// Run the fit check live on the four invented sample postings and write what came back to
// src/fit/sample-results.json, which the home band renders at build time. Re-run it after
// changing a sample, the prompt or the model (a test fails until you do), and commit the JSON.
//
//   node --env-file=<your env file> scripts/fit-samples.ts [--force]
//
// Each sample is there to show one kind of answer, with reasons the posting was written to
// show (src/fit/samples.ts, sampleProblems). If a sample misses on every try, nothing is
// written. Read the quotes printed below before committing: no check can tell whether a
// quote really shows its reason.
// --force writes it anyway, and the samples test then fails.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { checkFit, preparePosting } from '../src/fit/check.ts';
import { clientFromEnv } from '../src/fit/handler.ts';
import { SAMPLE_POSTINGS, sampleProblems } from '../src/fit/samples.ts';
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

// Reason codes vary a little from run to run, so a sample whose answer misses is run again,
// up to three times in all; every attempt is printed. Verdicts that miss are worth reading
// the posting and the prompt for, not re-rolling: the attempts show whether they're stable.
const TRIES = 3;

for (const s of SAMPLE_POSTINGS) {
  const posting = preparePosting(s.text);
  if (!posting.ok) throw new Error(`${s.id}: ${posting.error}`);
  for (let i = 1; i <= TRIES; i++) {
    const r = await checkFit(posting.text, { client });
    cost += r.usage.costUsd;
    out.model = r.model;
    out.promptVersion = r.promptVersion;
    if (r.status !== 'ok') {
      console.error(`${s.id}: unassessable after ${r.attempts} attempts: ${r.problems.join('; ')}`);
      process.exit(1);
    }
    const a = r.assessment;
    const problems = sampleProblems(s, a);
    console.log(`${s.id} (try ${i}): ${a.verdict}, location ${a.location.verdict}, injection ${a.injection.present}`);
    for (const reason of a.reasons) console.log(`  ${reason.code}: ${JSON.stringify(reason.quote)}`);
    console.log(`  location: ${JSON.stringify(a.location.quote)}`);
    for (const p of problems) console.log(`  <- ${p}`);
    out.results[s.id] = a;
    if (!problems.length) break;
    if (i === TRIES) mismatched = true;
  }
}

console.log(`cost $${cost.toFixed(5)}`);
if (mismatched && !force) {
  console.error('Not written: a sample came back other than written for (pass --force to write it anyway).');
  process.exit(1);
}
writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
console.log(`Wrote ${OUT}`);
