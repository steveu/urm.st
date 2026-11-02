// How often the fit check agrees with my own labels in job-radar, on postings I labelled
// after the scoring profile was frozen (the held-out set). job-radar's database is read at run
// time, opened read-only, from outside the repo; it is never written. Only aggregate counts
// and rates are written (src/fit/evals/agreement-results.json) or printed: no posting text,
// title or employer leaves this script, other than to the model as the check itself sends it.
//
//   node --env-file=<your env file> scripts/fit-agreement.ts [--db <path>] [--limit <n>]
//
// Current label = the latest per posting; keep and maybe are positive, skip is negative.
import { writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { pathToFileURL } from 'node:url';
import { capText, htmlToText } from '../src/fit/boards.ts';
import { checkFit, LIMITS, preparePosting } from '../src/fit/check.ts';
import { outcomeOf, summariseAgreement, type LabelledOutcome } from '../src/fit/evals/summarise.ts';
import { clientFromEnv } from '../src/fit/handler.ts';
import { MODEL, PROMPT_VERSION } from '../src/fit/prompt.ts';
import { pool } from './fit-pool.ts';

/** The scoring profile was frozen at this moment; labels first made after it are held out. */
const HELD_OUT_AFTER = '2026-10-30T19:14:24Z';

const OUT = resolve(import.meta.dirname, '..', 'src/fit/evals/agreement-results.json');
const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const DB = arg('--db') ?? resolve(homedir(), 'data/job-radar/radar.db');
const LIMIT = Number(arg('--limit') ?? Infinity);

const client = clientFromEnv()();
if (!client) {
  console.error('Set ANTHROPIC_API_KEY in the environment.');
  process.exit(1);
}

interface Row {
  title: string;
  employer: string | null;
  location: string | null;
  description: string | null;
  description_full: number;
  current_label: 'keep' | 'maybe' | 'skip';
  first_labelled: string;
}

// Read-only twice over: the URI's mode=ro and the driver's own flag
const url = pathToFileURL(DB);
url.search = 'mode=ro';
const db = new DatabaseSync(url, { readOnly: true });
const rows = db
  .prepare(
    `SELECT p.title, p.employer, p.location, p.description, p.description_full,
       (SELECT label FROM labels WHERE posting_id = p.id ORDER BY id DESC LIMIT 1) AS current_label,
       (SELECT created_at FROM labels WHERE posting_id = p.id ORDER BY created_at, id LIMIT 1) AS first_labelled
     FROM postings p
     WHERE EXISTS (SELECT 1 FROM labels WHERE posting_id = p.id)`,
  )
  .all() as unknown as Row[];
db.close();

// Compared as instants, not strings: stored times carry milliseconds, the cut-off doesn't
const cutoff = Date.parse(HELD_OUT_AFTER);
const heldOut = rows.filter((r) => Date.parse(r.first_labelled) > cutoff).slice(0, LIMIT);

/** The posting as a visitor might paste it: title, employer and location, then the description. */
function asPaste(r: Row): string {
  const head = [r.title, r.employer && `Company: ${r.employer}`, r.location && `Location: ${r.location}`].filter(Boolean).join('\n');
  const body = capText(htmlToText(r.description ?? ''), Math.max(LIMITS.maxChars - head.length - 2, 0)).text;
  return [head, body].filter(Boolean).join('\n\n');
}

let tooShort = 0;
let summariesOnly = 0;
let callFailed = 0;
let done = 0;
const scored: LabelledOutcome[] = [];

await pool(heldOut, 4, async (r) => {
  const posting = preparePosting(asPaste(r));
  if (!posting.ok) {
    tooShort++;
    return;
  }
  if (!r.description_full) summariesOnly++;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      let firstFailed = false;
      const result = await checkFit(posting.text, {
        client: client!,
        onAttempt: (n, problems) => {
          if (n === 1 && problems.length) firstFailed = true;
        },
      });
      scored.push({ positive: r.current_label !== 'skip', outcome: outcomeOf(result, firstFailed) });
      break;
    } catch {
      // Rate limits and overloads: wait and try again; never print the error, which can echo the request
      if (attempt === 3) callFailed++;
      else await new Promise((res) => setTimeout(res, 5_000 * attempt));
    }
  }
  done++;
  if (done % 10 === 0) console.log(`${done} of ${heldOut.length}`);
});

const results = summariseAgreement(scored, {
  ranAt: new Date().toISOString().slice(0, 10),
  model: MODEL,
  promptVersion: PROMPT_VERSION,
  heldOutAfter: HELD_OUT_AFTER,
  found: heldOut.length,
  tooShort,
  summariesOnly,
  callFailed,
});
console.log(JSON.stringify(results, null, 2));
writeFileSync(OUT, `${JSON.stringify(results, null, 2)}\n`);
console.log(`Wrote ${OUT}`);
