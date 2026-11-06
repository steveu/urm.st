import { describe, expect, it } from 'vitest';
import { listUrl, findRole, type Screening } from '../src/fit/finder/find.ts';
import type { FinderBoard } from '../src/fit/finder/boards.ts';
import { JEV_MODEL, JEV_URL, jevScreener, RULE_OUT_AT, ruling, SCREEN_IDS, screenerFromEnv, screenRequest, type ScreenId, type Screener } from '../src/fit/finder/screen.ts';
import { apiUrl } from '../src/fit/boards.ts';

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
    return { answers: /backend/i.test(text) ? with_('backend_or_data', 0.97) : none(), inputTokens: 1000 };
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
    new Response(JSON.stringify({ answers: Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, { noul: v }])), usage: { input_tokens: 812 } }), { status: 200 });

  it('asks every question of the posting in one pinned request, and reads the answers', async () => {
    const sent: Array<{ url: string; init: RequestInit }> = [];
    const screen = jevScreener({ apiKey: 'test-key', fetch: async (url, init) => (sent.push({ url, init }), ok(none())) });
    const got = await screen('An invented posting');
    expect(got).toEqual({ answers: none(), inputTokens: 812 });
    expect(sent[0].url).toBe(JEV_URL);
    const body = JSON.parse(String(sent[0].init.body));
    expect(body).toEqual(screenRequest('An invented posting'));
    expect(body.model).toBe(JEV_MODEL);
    expect(Object.keys(body.questions)).toEqual(SCREEN_IDS);
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

  it('comes from the environment only when a key is set', () => {
    expect(screenerFromEnv({})).toBeNull();
    expect(screenerFromEnv({ JEV_API_KEY: 'k' })).toBeTypeOf('function');
    expect(screenerFromEnv({ TYPESAFE_API_KEY: 'k' })).toBeTypeOf('function');
  });
});

describe('findRole with screening', () => {
  const boards = {
    [listUrl(AB).href]: { jobs: [abJob(1, 'Product Engineer', 'Build the backend services and data pipelines'), abJob(2, 'Design Engineer', 'Build the interface and design system')] },
    [listUrl(LV).href]: [
      { id: UUID(3), text: 'Product Engineer', categories: { allLocations: ['Leeds'] }, country: 'GB', description: DESC('Own the backend APIs and on-call'), lists: [] },
    ],
  };

  it('puts candidates to Jev, rules out the clear noes, and picks from the rest', async () => {
    const seen: string[] = [];
    const { fn } = stubFetch(boards);
    const found = await findRole({ fetch: fn, boards: [AB, LV], screen: textScreener(seen), random: () => 0 });
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.role.title).toBe('Design Engineer');
    const s = found.screening as Screening;
    expect(s.screened).toBe(3);
    expect(s.allRuledOut).toBe(false);
    expect(s.ruledOut.map((r) => `${r.company}: ${r.reason}`).sort()).toEqual(['Example Ashby: backend_or_data', 'Example Lever: backend_or_data']);
    // Jev read the text the fit check reads: title and the board's fields first
    expect(seen.some((t) => t.startsWith('Design Engineer\nLocation: London'))).toBe(true);
    expect(s.costUsd).toBeGreaterThan(0);
  });

  it('reads a Greenhouse candidate from its job, as the list has no description', async () => {
    const link = { kind: 'board' as const, board: 'greenhouse' as const, token: GH.token, id: '42' };
    const { fn, calls } = stubFetch({
      [listUrl(GH).href]: { jobs: [{ id: 42, title: 'Founding Engineer', location: { name: 'York' } }] },
      [apiUrl(link).href]: { id: 42, title: 'Founding Engineer', location: { name: 'York' }, content: '&lt;p&gt;Build the product with our founders.&lt;/p&gt;' },
    });
    const seen: string[] = [];
    const found = await findRole({ fetch: fn, boards: [GH], screen: textScreener(seen), random: () => 0 });
    expect(calls).toContain(apiUrl(link).href);
    expect(seen[0]).toContain('Build the product with our founders.');
    expect(found.ok && found.screening?.screened).toBe(1);
  });

  it('when Jev rules out every candidate, picks one of them and says so', async () => {
    const { fn } = stubFetch({ [listUrl(LV).href]: boards[listUrl(LV).href] });
    const found = await findRole({ fetch: fn, boards: [LV], screen: textScreener(), random: () => 0 });
    expect(found.ok && found.screening?.allRuledOut).toBe(true);
    expect(found.ok && found.role.company).toBe(LV.company);
  });

  it('when Jev fails, picks unscreened and says the screening failed: a failure is never a pass', async () => {
    const { fn } = stubFetch(boards);
    const found = await findRole({ fetch: fn, boards: [AB, LV], screen: async () => Promise.reject(new Error('down')), random: () => 0 });
    expect(found).toMatchObject({ ok: true, screening: null, screenFailed: true });
  });
});
