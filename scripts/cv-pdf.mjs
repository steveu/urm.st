#!/usr/bin/env node
// Print the /cv page to a PDF with the installed Chrome, so the download matches the page.
// Run locally after changing the CV, and commit the output:
//   npm run cv:pdf

import { spawn, execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(here, '..');
const out = path.join(siteRoot, 'public/steven-urmston-cv.pdf');
const port = 4329;

execFileSync('npx', ['astro', 'build'], { cwd: siteRoot, stdio: 'inherit' });

const server = spawn('npx', ['astro', 'preview', '--port', String(port)], { cwd: siteRoot, stdio: 'ignore' });

try {
  const url = `http://localhost:${port}/cv`;
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(url)).ok) break;
    } catch {}
    if (i > 50) throw new Error(`Preview server didn't start on port ${port}`);
    await new Promise((r) => setTimeout(r, 200));
  }

  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  // Links in the PDF point at the live site, not the local preview
  await page.evaluate(() => {
    for (const a of document.querySelectorAll('a[href^="/"]')) a.href = `https://urm.st${a.getAttribute('href')}`;
  });
  await page.pdf({ path: out, preferCSSPageSize: true, printBackground: true });
  await browser.close();
  console.log(`Wrote ${path.relative(siteRoot, out)}`);
} finally {
  server.kill();
}
