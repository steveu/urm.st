// Serve the built site from ./dist with the fit check working, without the Netlify CLI: the
// function's path goes to the same handler the Netlify Function exports. Build first.
//
//   npm run build
//   ANTHROPIC_API_KEY=… npm run preview:fit              # or: node --env-file=<file> scripts/preview-fit.ts
//   HOST=0.0.0.0 PORT=4391 npm run preview:fit           # to reach it from another device
//
// The API key is read from the environment only (ANTHROPIC_WORKSPACE_ID too, if the key
// needs one). Netlify's rate limit doesn't exist here, so a small in-memory limiter with the
// same numbers stands in: per client address, reset on restart, fine for one person testing.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import fitCheck from '../netlify/functions/fit-check.mts';
import { FIT_CHECK_PATH, RATE_LIMIT } from '../src/fit/handler.ts';

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 4391);
const DIST = resolve(import.meta.dirname, '..', 'dist');
const MAX_BODY_BYTES = 64 * 1024 + 1;

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('No dist/index.html: run npm run build first.');
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('ANTHROPIC_API_KEY is not set: the samples work, a pasted posting gets "unavailable".');
}

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
};

// Requests per address in the current window, as Netlify counts them
const windows = new Map<string, { start: number; count: number }>();
function allowed(ip: string): boolean {
  const now = Date.now();
  const w = windows.get(ip);
  if (!w || now - w.start >= RATE_LIMIT.windowSize * 1000) {
    windows.set(ip, { start: now, count: 1 });
    return true;
  }
  return ++w.count <= RATE_LIMIT.windowLimit;
}

async function readBody(req: IncomingMessage): Promise<Uint8Array<ArrayBuffer>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    // Past the handler's own cap; keep only enough for it to say "too long"
    if (size > MAX_BODY_BYTES) break;
    chunks.push(chunk);
  }
  return new Uint8Array(Buffer.concat(chunks));
}

async function api(req: IncomingMessage, res: ServerResponse) {
  if (req.method === 'POST' && !allowed(req.socket.remoteAddress ?? '')) {
    res.writeHead(429, { 'content-type': 'text/plain; charset=utf-8' }).end('Too many requests');
    return;
  }
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
  const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await readBody(req);
  const out = await fitCheck(new Request(`http://${HOST}${req.url}`, { method: req.method, headers, body }));
  res.writeHead(out.status, Object.fromEntries(out.headers));
  res.end(Buffer.from(await out.arrayBuffer()));
}

// Astro builds /about to about.html and / to index.html
function file(pathname: string): string | null {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  const base = join(DIST, clean);
  if (!base.startsWith(DIST)) return null;
  for (const p of [base, `${base}.html`, join(base, 'index.html')]) {
    if (existsSync(p) && statSync(p).isFile()) return p;
  }
  return null;
}

function serve(pathname: string, res: ServerResponse) {
  const found = file(pathname);
  const path = found ?? join(DIST, '404.html');
  res.writeHead(found ? 200 : 404, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
  createReadStream(path).pipe(res);
}

createServer((req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost');
  if (pathname === FIT_CHECK_PATH) {
    api(req, res).catch(() => {
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
    return;
  }
  serve(pathname, res);
}).listen(PORT, HOST, () => {
  console.log(`Serving dist with the fit check at http://${HOST}:${PORT} (POST ${FIT_CHECK_PATH})`);
});
