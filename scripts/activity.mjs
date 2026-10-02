#!/usr/bin/env node
// Snapshot recent commit activity for the projects shown in the hero.
// Netlify can't see these repos, so run this locally and commit the output:
//   npm run activity
// Repos are expected as siblings of this one (e.g. ../eddy); override with
// ACTIVITY_ROOT=/path/to/code.

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEEKS = 26;
const here = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(here, '..');
const codeRoot = process.env.ACTIVITY_ROOT ?? path.resolve(siteRoot, '..');
const out = path.join(siteRoot, 'src/data/activity.json');

const repos = { eddy: 'eddy', 'one-thought': 'one-thought' };

const git = (repo, ...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim();

function defaultBranch(repo) {
  try {
    return git(repo, 'symbolic-ref', '--short', 'refs/remotes/origin/HEAD').replace(/^origin\//, '');
  } catch {
    return 'main';
  }
}

// Monday 00:00 UTC of the week containing `d`
function weekStart(d) {
  const s = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  s.setUTCDate(s.getUTCDate() - ((s.getUTCDay() + 6) % 7));
  return s;
}

const now = new Date();
const firstWeek = weekStart(now);
firstWeek.setUTCDate(firstWeek.getUTCDate() - 7 * (WEEKS - 1));

const projects = {};
for (const [key, dir] of Object.entries(repos)) {
  const repo = path.join(codeRoot, dir);
  const branch = defaultBranch(repo);
  const dates = git(repo, 'log', branch, '--no-merges', '--format=%aI')
    .split('\n')
    .filter(Boolean)
    .map((s) => new Date(s));

  const weeks = new Array(WEEKS).fill(0);
  for (const d of dates) {
    const i = Math.floor((weekStart(d) - firstWeek) / (7 * 864e5));
    if (i >= 0 && i < WEEKS) weeks[i]++;
  }

  projects[key] = {
    weeks,
    total: dates.length,
    inWindow: weeks.reduce((a, b) => a + b, 0),
    first: dates.at(-1)?.toISOString().slice(0, 10),
    last: dates[0]?.toISOString().slice(0, 10),
  };
}

const data = { generatedAt: now.toISOString().slice(0, 10), weeks: WEEKS, weekOf: firstWeek.toISOString().slice(0, 10), projects };
writeFileSync(out, JSON.stringify(data, null, 2) + '\n');
console.log(`Wrote ${path.relative(siteRoot, out)}`);
for (const [k, p] of Object.entries(projects)) console.log(`  ${k}: ${p.inWindow} commits in ${WEEKS} weeks, last ${p.last}`);
