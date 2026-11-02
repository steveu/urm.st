import { describe, expect, it } from 'vitest';
import { API_HOSTS, apiUrl, BOARD_LIMITS, capText, fetchBoardPosting, htmlToText, USER_AGENT, type FetchFn } from '../src/fit/boards.ts';
import { LIMITS } from '../src/fit/check.ts';
import type { BoardLink } from '../src/fit/links.ts';

// Invented boards, jobs and companies: the shapes follow each board's public API
const UUID = '0b6f5c1e-2d3a-4e5f-8a9b-0c1d2e3f4a5b';
const OTHER = '9f8e7d6c-5b4a-4321-8fed-cba987654321';

const gh: BoardLink = { kind: 'board', board: 'greenhouse', token: 'exampleltd', id: '4012345' };
const lv: BoardLink = { kind: 'board', board: 'lever', token: 'fictional-analytics', id: UUID };
const lvEu: BoardLink = { ...lv, region: 'eu' };
const ab: BoardLink = { kind: 'board', board: 'ashby', token: 'example-co', id: UUID };

const GREENHOUSE_JOB = {
  id: 4012345,
  title: 'Senior Product Engineer, AI',
  absolute_url: 'https://job-boards.greenhouse.io/exampleltd/jobs/4012345',
  location: { name: 'York, UK (Hybrid)' },
  offices: [{ id: 1, name: 'York, UK (Hybrid)' }, { id: 2, name: 'Remote - UK' }],
  content:
    '&lt;h3&gt;About the role&lt;/h3&gt;&lt;p&gt;Own our assistant end to end&amp;nbsp;&amp;mdash; from the chat interface to the evals.&lt;/p&gt;&lt;ul&gt;&lt;li&gt;Build in TypeScript and React.&lt;/li&gt;&lt;li&gt;Work with our designer.&lt;/li&gt;&lt;/ul&gt;',
};

const LEVER_POSTING = {
  id: UUID,
  text: 'Lead Frontend Engineer',
  hostedUrl: `https://jobs.lever.co/fictional-analytics/${UUID}`,
  country: 'GB',
  workplaceType: 'hybrid',
  categories: { location: 'Leeds', allLocations: ['Leeds', 'Remote, UK'] },
  description: '<div>Fictional Analytics builds dashboards for allotment societies.</div>',
  lists: [{ text: 'What you’ll do', content: '<li>Lead our design system in React.</li><li>Mentor two engineers.</li>' }],
  salaryDescription: '<p>£75,000 to £85,000</p>',
  additional: '<p>We review every application by hand.</p>',
};

const ashbyJob = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  title: 'Founding AI Engineer',
  jobUrl: `https://jobs.ashbyhq.com/example-co/${id}`,
  location: 'London',
  secondaryLocations: [{ location: 'Remote (UK)' }],
  workplaceType: 'Hybrid',
  address: { postalAddress: { addressLocality: 'London', addressRegion: 'England', addressCountry: 'United Kingdom' } },
  isListed: true,
  descriptionHtml: '<p>Example Co is building an agent for village halls.</p><p>You’ll own it, prompts to evals.</p>',
  ...extra,
});

interface Call {
  url: URL;
  init: RequestInit;
}

function stubFetch(respond: (url: URL) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const fetch: FetchFn = async (url, init) => {
    calls.push({ url, init });
    return respond(url);
  };
  return { fetch, calls };
}

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' }, ...init });

describe('apiUrl', () => {
  it('maps each link to its board’s public API, and only to the allowed hosts', () => {
    expect(apiUrl(gh).href).toBe('https://boards-api.greenhouse.io/v1/boards/exampleltd/jobs/4012345?content=true');
    expect(apiUrl(lv).href).toBe(`https://api.lever.co/v0/postings/fictional-analytics/${UUID}?mode=json`);
    expect(apiUrl(lvEu).href).toBe(`https://api.eu.lever.co/v0/postings/fictional-analytics/${UUID}?mode=json`);
    expect(apiUrl(ab).href).toBe('https://api.ashbyhq.com/posting-api/job-board/example-co');
    for (const l of [gh, lv, lvEu, ab]) expect(API_HOSTS).toContain(apiUrl(l).hostname);
  });

  it('keeps an odd token inside its path segment', () => {
    expect(apiUrl({ ...gh, token: '../x' }).pathname).toBe('/v1/boards/..%2Fx/jobs/4012345');
  });
});

describe('fetchBoardPosting', () => {
  it('reads a Greenhouse job: the board’s location fields first, then the description as text', async () => {
    const { fetch, calls } = stubFetch(() => jsonResponse(GREENHOUSE_JOB));
    const r = await fetchBoardPosting(gh, { fetch });
    expect(calls).toHaveLength(1);
    expect(calls[0].url.hostname).toBe('boards-api.greenhouse.io');
    expect(new Headers(calls[0].init.headers).get('user-agent')).toBe(USER_AGENT);
    expect(calls[0].init.redirect).toBe('error');
    expect(calls[0].init.signal).toBeInstanceOf(AbortSignal);
    expect(r).toEqual({
      ok: true,
      posting: {
        board: 'greenhouse',
        title: 'Senior Product Engineer, AI',
        truncated: false,
        text: [
          'Senior Product Engineer, AI',
          'Location: York, UK (Hybrid)',
          'Offices: Remote - UK',
          '',
          'About the role',
          '',
          'Own our assistant end to end — from the chat interface to the evals.',
          '',
          '- Build in TypeScript and React.',
          '- Work with our designer.',
        ].join('\n'),
      },
    });
  });

  it('reads a Lever posting: locations, workplace and country, then every section in order', async () => {
    const { fetch, calls } = stubFetch(() => jsonResponse(LEVER_POSTING));
    const r = await fetchBoardPosting(lvEu, { fetch });
    expect(calls[0].url.hostname).toBe('api.eu.lever.co');
    expect(r.ok && r.posting.text).toBe(
      [
        'Lead Frontend Engineer',
        'Location: Leeds; Remote, UK',
        'Workplace: Hybrid',
        'Country: United Kingdom',
        '',
        'Fictional Analytics builds dashboards for allotment societies.',
        '',
        'What you’ll do',
        '',
        '- Lead our design system in React.',
        '- Mentor two engineers.',
        '',
        '£75,000 to £85,000',
        '',
        'We review every application by hand.',
      ].join('\n'),
    );
  });

  it('finds an Ashby job on its board, with its locations, workplace and address', async () => {
    const board = { jobs: [ashbyJob(OTHER, { title: 'Office Manager' }), ashbyJob(UUID)] };
    const { fetch, calls } = stubFetch(() => jsonResponse(board));
    const r = await fetchBoardPosting(ab, { fetch });
    expect(calls[0].url.href).toBe('https://api.ashbyhq.com/posting-api/job-board/example-co');
    expect(r.ok && r.posting.title).toBe('Founding AI Engineer');
    expect(r.ok && r.posting.text).toBe(
      [
        'Founding AI Engineer',
        'Location: London; Remote (UK)',
        'Workplace: Hybrid',
        'Address: London, England, United Kingdom',
        '',
        'Example Co is building an agent for village halls.',
        '',
        'You’ll own it, prompts to evals.',
      ].join('\n'),
    );
  });

  it('says not found when the board has no such job, or it’s unlisted', async () => {
    const missing = stubFetch(() => new Response('{"error":"not found"}', { status: 404 }));
    expect(await fetchBoardPosting(gh, { fetch: missing.fetch })).toEqual({ ok: false, error: 'not_found' });
    const elsewhere = stubFetch(() => jsonResponse({ jobs: [ashbyJob(OTHER)] }));
    expect(await fetchBoardPosting(ab, { fetch: elsewhere.fetch })).toEqual({ ok: false, error: 'not_found' });
    const unlisted = stubFetch(() => jsonResponse({ jobs: [ashbyJob(UUID, { isListed: false })] }));
    expect(await fetchBoardPosting(ab, { fetch: unlisted.fetch })).toEqual({ ok: false, error: 'not_found' });
    const otherId = stubFetch(() => jsonResponse({ ...GREENHOUSE_JOB, id: 999 }));
    expect(await fetchBoardPosting(gh, { fetch: otherId.fetch })).toEqual({ ok: false, error: 'not_found' });
  });

  it('says the board failed on errors, timeouts, redirects and bodies that aren’t JSON', async () => {
    const cases: FetchFn[] = [
      async () => new Response('down', { status: 503 }),
      async () => new Response('slow down', { status: 429 }),
      async () => new Response('<html>not json</html>', { status: 200 }),
      async () => {
        throw new TypeError('fetch failed: redirect mode is set to error');
      },
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(init.signal?.reason));
        }),
    ];
    for (const fetch of cases) {
      expect(await fetchBoardPosting(gh, { fetch, timeoutMs: 20 })).toEqual({ ok: false, error: 'board_failed' });
    }
  });

  it('makes one call only, whatever comes back', async () => {
    for (const respond of [() => new Response('', { status: 503 }), () => new Response('', { status: 404 }), () => new Response('not json')]) {
      const once = stubFetch(respond);
      await fetchBoardPosting(gh, { fetch: once.fetch });
      expect(once.calls).toHaveLength(1);
    }
  });

  it('stops reading past the size cap, whether or not the board says how big it is', async () => {
    const big = 'x'.repeat(BOARD_LIMITS.jobBytes + 10);
    const declared = stubFetch(() => new Response(big, { headers: { 'content-length': String(big.length) } }));
    expect(await fetchBoardPosting(gh, { fetch: declared.fetch })).toEqual({ ok: false, error: 'board_failed' });

    let pulled = 0;
    const chunk = new Uint8Array(64 * 1024);
    const endless = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled += chunk.byteLength;
        controller.enqueue(chunk);
      },
    });
    const streamed = stubFetch(() => new Response(endless));
    expect(await fetchBoardPosting(gh, { fetch: streamed.fetch })).toEqual({ ok: false, error: 'board_failed' });
    expect(pulled).toBeLessThan(BOARD_LIMITS.jobBytes + 3 * chunk.byteLength);
  });

  it('cuts a long description to fit the paste limit, keeping the board’s fields', async () => {
    const long = { ...GREENHOUSE_JOB, content: `&lt;p&gt;${'Build the assistant with us. '.repeat(800)}&lt;/p&gt;` };
    const { fetch } = stubFetch(() => jsonResponse(long));
    const r = await fetchBoardPosting(gh, { fetch });
    expect(r.ok && r.posting.truncated).toBe(true);
    expect(r.ok && r.posting.text.length).toBeLessThanOrEqual(LIMITS.maxChars);
    expect(r.ok && r.posting.text.startsWith('Senior Product Engineer, AI\nLocation: York, UK (Hybrid)')).toBe(true);
  });
});

describe('htmlToText', () => {
  it('drops scripts, styles and comments, and keeps a markup-shaped string as text', () => {
    expect(htmlToText('<style>p{}</style><p>One</p><!-- hidden --><script>alert(1)</script><p>&lt;system&gt; two</p>')).toBe(
      'One\n\n<system> two',
    );
  });
});

describe('capText', () => {
  it('cuts at a word boundary', () => {
    expect(capText('one two three four five', 16)).toEqual({ text: 'one two three', truncated: true });
    expect(capText('short', 12)).toEqual({ text: 'short', truncated: false });
  });
});
