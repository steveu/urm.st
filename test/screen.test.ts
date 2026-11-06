import { describe, expect, it } from 'vitest';
import { listUrl, runFunnel } from '../src/fit/finder/funnel.ts';
import { FUNNEL_CACHE, funnelHandler } from '../src/fit/finder/handler.ts';
import type { FinderBoard } from '../src/fit/finder/boards.ts';
import { JEV_MODEL, JEV_URL, jevScreener, RULE_OUT_AT, ruling, SCREEN_IDS, screenerFromEnv, screenRequest, type ScreenId, type Screener } from '../src/fit/finder/screen.ts';

// Invented boards and postings throughout: no real listing.
const UUID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const AB: FinderBoard = { company: 'Example Ashby', board: 'ashby', token: 'exampleab' };
const LV: FinderBoard = { company: 'Example Lever', board: 'lever', token: 'examplelv' };
const GH: FinderBoard = { company: 'Example Greenhouse', board: 'greenhouse', token: 'examplegh' };

const none = (): Record<ScreenId, number> => Object.fromEntries(SCREEN_IDS.map((id) => [id, 0.05])) as Record<ScreenId, number>;
const with_ = (id: ScreenId, p: number) => ({ ...none(), [id]: p });

const DESC = (what: string) => `<p>${what}. You will work with our designer on what we build next, in a small product team.</p>`;
const abJob = (n: number, title: string, what: string) => ({ id: UUID(n), title, location: 'London', isListed: true, secondaryLocations: [], descriptionHtml: DESC(what) });

function stubFetch(answers: Record<string, unknown>) {
  const calls: string[] = [];
  const fn = async (url: URL) => {
    calls.push(url.href);
    const a = answers[url.href];
    if (a === undefined) return new Response('not found', { status: 404 });
    return new Response(JSON.stringify(a), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  return { fn, calls };
}

/** A screener that answers from the posting's text: "backend" in it reads as backend work. */
function textScreener(seen: string[] = []): Screener {
  return async (text) => {
    seen.push(text);
    return { answers: /backend/i.test(text) ? with_('backend_or_data', 0.97) : none(), handsOn: 0.9, inputTokens: 1000 };
  };
}

describe('ruling', () => {
  it('rules a role out at the line, naming the strongest answer', () => {
    expect(ruling(none())).toBeNull();
    expect(ruling(with_('people_management', RULE_OUT_AT - 0.01))).toBeNull();
    expect(ruling(with_('people_management', RULE_OUT_AT))).toEqual({ reason: 'people_management', p: RULE_OUT_AT });
    expect(ruling({ ...with_('backend_or_data', 0.92), explicitly_junior: 0.99 })).toEqual({ reason: 'explicitly_junior', p: 0.99 });
  });
});

describe('jevScreener', () => {
  const ok = (answers: Record<string, number>) =>
    new Response(
      JSON.stringify({ answers: Object.fromEntries(Object.entries({ hands_on: 0.9, ...answers }).map(([k, v]) => [k, { noul: v }])), usage: { input_tokens: 812 } }),
      { status: 200 },
    );

  it('asks every question of the posting in one pinned request, and reads the answers', async () => {
    const sent: Array<{ url: string; init: RequestInit }> = [];
    const screen = jevScreener({ apiKey: 'test-key', fetch: async (url, init) => (sent.push({ url, init }), ok(none())) });
    const got = await screen('An invented posting');
    expect(got).toEqual({ answers: none(), handsOn: 0.9, inputTokens: 812 });
    expect(sent[0].url).toBe(JEV_URL);
    const body = JSON.parse(String(sent[0].init.body));
    expect(body).toEqual(screenRequest('An invented posting'));
    expect(body.model).toBe(JEV_MODEL);
    expect(Object.keys(body.questions)).toEqual([...SCREEN_IDS, 'hands_on']);
    for (const q of Object.values(body.questions) as Array<{ instructions: string }>) expect(q.instructions).toContain('`posting`');
    expect((sent[0].init.headers as Record<string, string>).authorization).toBe('Bearer test-key');
  });

  it('throws, rather than answering, when Jev fails or an answer is missing', async () => {
    await expect(jevScreener({ apiKey: 'k', fetch: async () => new Response('busy', { status: 503 }) })('x')).rejects.toThrow('Jev 503');
    const partial = { ...none() } as Partial<Record<ScreenId, number>>;
    delete partial.off_discipline;
    await expect(jevScreener({ apiKey: 'k', fetch: async () => ok(partial as Record<string, number>) })('x')).rejects.toThrow('off_discipline');
    await expect(jevScreener({ apiKey: 'k', fetch: async () => ok({ ...none(), agency: 1.4, backend_or_data: 1.4 }) })('x')).rejects.toThrow('backend_or_data');
  });

  it('tries once more after a short wait when over the rate limit', async () => {
    let n = 0;
    const screen = jevScreener({ apiKey: 'k', retryMs: 0, fetch: async () => (n++ ? ok(none()) : new Response('slow down', { status: 429 })) });
    expect((await screen('x')).answers).toEqual(none());
    expect(n).toBe(2);
    const always = jevScreener({ apiKey: 'k', retryMs: 0, fetch: async () => new Response('slow down', { status: 429 }) });
    await expect(always('x')).rejects.toThrow('Jev 429');
  });

  it('comes from the environment only when a key is set', () => {
    expect(screenerFromEnv({})).toBeNull();
    expect(screenerFromEnv({ JEV_API_KEY: 'k' })).toBeTypeOf('function');
    expect(screenerFromEnv({ TYPESAFE_API_KEY: 'k' })).toBeTypeOf('function');
  });
});

describe('runFunnel with screening', () => {
  const boards = {
    [listUrl(AB).href]: { jobs: [abJob(1, 'Product Engineer', 'Build the backend services and data pipelines'), abJob(2, 'Design Engineer', 'Build the interface and design system')] },
    [listUrl(LV).href]: [
      { id: UUID(3), text: 'Product Engineer', categories: { allLocations: ['Leeds'] }, country: 'GB', description: DESC('Own the backend APIs and on-call'), lists: [] },
    ],
    [listUrl(GH).href]: {
      jobs: [{ id: 42, title: 'Founding Engineer', location: { name: 'York' }, content: '&lt;p&gt;Build the product with our founders, from the first sketch to the shipped feature.&lt;/p&gt;' }],
    },
  };

  it('puts every open role to Jev, and splits them into what it left and what it ruled out', async () => {
    const seen: string[] = [];
    const { fn } = stubFetch(boards);
    const r = await runFunnel({ fetch: fn, boards: [AB, LV, GH], screen: textScreener(seen) });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const f = r.funnel;
    expect(f.left.map((x) => x.title)).toEqual(['Design Engineer', 'Founding Engineer']);
    // Each role left carries Jev's strongest answer, below the line, to steer which is shown
    expect(f.left.map((x) => [x.p, x.handsOn])).toEqual([
      [0.05, 0.9],
      [0.05, 0.9],
    ]);
    expect(f.ruledOut.map((x) => `${x.company}: ${x.reason} ${x.p}`)).toEqual(['Example Ashby: backend_or_data 0.97', 'Example Lever: backend_or_data 0.97']);
    expect(f.unscreened).toBe(0);
    expect(f.screening).toMatchObject({ model: JEV_MODEL });
    expect(f.screening!.costUsd).toBeGreaterThan(0);
    // Jev read the text the fit check reads: title and the board's fields first, Greenhouse's
    // from the list's own content
    expect(seen.some((t) => t.startsWith('Design Engineer\nLocation: London'))).toBe(true);
    expect(seen.some((t) => t.includes('Build the product with our founders'))).toBe(true);
  });

  it('leaves out of both lists a role Jev could not answer for: a failure is never a pass', async () => {
    const { fn } = stubFetch(boards);
    const flaky: Screener = async (text) => {
      if (text.startsWith('Founding Engineer')) throw new Error('timeout');
      return textScreener()(text);
    };
    const r = await runFunnel({ fetch: fn, boards: [AB, LV, GH], screen: flaky });
    expect(r.ok && r.funnel.unscreened).toBe(1);
    expect(r.ok && r.funnel.left.map((x) => x.title)).toEqual(['Design Engineer']);
  });

  it('when Jev answers for none, lists every open role and says the screening failed', async () => {
    const { fn } = stubFetch(boards);
    const r = await runFunnel({ fetch: fn, boards: [AB, LV], screen: async () => Promise.reject(new Error('down')) });
    expect(r).toMatchObject({ ok: true, funnel: { screening: null, screenFailed: true, ruledOut: [] } });
    expect(r.ok && r.funnel.left.length).toBe(3);
  });

  it('is cached for hours once screened', async () => {
    const { fn } = stubFetch(boards);
    const res = await funnelHandler({ fetch: fn, boards: [AB], screen: textScreener() })(new Request('http://x/'));
    expect(res.headers.get('netlify-cdn-cache-control')).toBe(`public, durable, s-maxage=${FUNNEL_CACHE.shared}, stale-while-revalidate=${FUNNEL_CACHE.stale}`);
    expect(res.headers.get('cache-control')).toBe(`public, max-age=${FUNNEL_CACHE.browser}`);
  });
});
