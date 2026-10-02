#!/usr/bin/env node
// Snapshot commit activity (per month) for the projects on the site.
// Netlify can't see these repos, so run this locally and commit the output:
//   npm run activity
// Repos are expected as siblings of this one (e.g. ../eddy); override with
// ACTIVITY_ROOT=/path/to/code.

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

const projects = {};
for (const [key, dir] of Object.entries(repos)) {
  const repo = path.join(codeRoot, dir);
  const branch = defaultBranch(repo);
  const dates = git(repo, 'log', branch, '--no-merges', '--format=%aI')
    .split('\n')
    .filter(Boolean)
    .map((s) => new Date(s));

  // Commits per calendar month (UTC), keyed YYYY-MM
  const months = {};
  for (const d of dates) {
    const k = d.toISOString().slice(0, 7);
    months[k] = (months[k] ?? 0) + 1;
  }

  projects[key] = {
    months,
    total: dates.length,
    first: dates.at(-1)?.toISOString().slice(0, 10),
    last: dates[0]?.toISOString().slice(0, 10),
  };
}

const now = new Date();
const data = { generatedAt: now.toISOString().slice(0, 10), projects };
writeFileSync(out, JSON.stringify(data, null, 2) + '\n');
console.log(`Wrote ${path.relative(siteRoot, out)}`);
for (const [k, p] of Object.entries(projects)) console.log(`  ${k}: ${p.total} commits, ${p.first} to ${p.last}`);
