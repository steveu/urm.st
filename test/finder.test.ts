import { describe, expect, it } from 'vitest';
import { config } from '../netlify/functions/fit-roles.mts';
import { apiUrl, API_HOSTS } from '../src/fit/boards.ts';
import { parseJobLink } from '../src/fit/links.ts';
import { FINDER_BOARDS, type FinderBoard } from '../src/fit/finder/boards.ts';
import { inScope, placeFits } from '../src/fit/finder/filter.ts';
import { jobLink, listedRoles, listUrl, runFunnel } from '../src/fit/finder/funnel.ts';
import { FUNNEL_CACHE, FUNNEL_PATH, FUNNEL_RATE_LIMIT, funnelHandler } from '../src/fit/finder/handler.ts';

// Invented boards and roles throughout: no real listing.
const UUID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const GH: FinderBoard = { company: 'Example Greenhouse', board: 'greenhouse', token: 'examplegh' };
const LV: FinderBoard = { company: 'Example Lever', board: 'lever', token: 'examplelv', region: 'eu' };
const AB: FinderBoard = { company: 'Example Ashby', board: 'ashby', token: 'exampleab' };

const ghBody = (jobs: Array<[number, string, string]>) => ({ jobs: jobs.map(([id, title, where]) => ({ id, title, location: { name: where } })) });
const abBody = (jobs: Array<[number, string, string, boolean?]>) => ({
  jobs: jobs.map(([n, title, where, listed = true]) => ({ id: UUID(n), title, location: where, isListed: listed, secondaryLocations: [] })),
});
const lvBody = (jobs: Array<[number, string, string[], string?]>) =>
  jobs.map(([n, text, all, country]) => ({ id: UUID(n), text, categories: { allLocations: all }, country }));

/** A fetch that answers each list URL with a body, a status, or a thrown error. */
function stubFetch(answers: Record<string, unknown>) {
  const calls: string[] = [];
  const fn = async (url: URL) => {
    calls.push(url.href);
    const a = answers[url.href];
    if (a === undefined) return new Response('not found', { status: 404 });
    if (a instanceof Error) throw a;
    if (typeof a === 'number') return new Response('', { status: a });
    return new Response(JSON.stringify(a), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  return { fn, calls };
}

describe('inScope', () => {
  it.each([
    'Senior Product Engineer',
    'Senior Product Engineer [Backend]',
    'Design Engineer',
    'Full-Stack Engineer',
    'AI Engineer (Core Harness)',
    'Lead Front End Engineer',
    'Engineering Manager, Frontend',
    'Product Designer',
    'Senior Product Manager',
    'Machine Learning Engineer',
  ])('keeps %s, for Jev to judge', (t) => expect(inScope(t)).toBe(true));

  it.each(['Account Executive', 'Sales Engineer', 'Technical Recruiter', 'Software Engineering Intern', 'Graduate Developer', 'Legal Counsel', 'Office Manager'])(
    'drops %s',
    (t) => expect(inScope(t)).toBe(false),
  );
});

describe('placeFits', () => {
  it.each([
    [['York, United Kingdom, Hybrid', 'GB']],
    [['Remote (United Kingdom)']],
    [['London; Stockholm']],
    [['Toronto', 'UK']],
    [['GB']],
    [['Remote']],
    [['Remote; Europe']],
    [['EMEA']],
    [['Remote - Anywhere']],
  ])('keeps %j', (places) => expect(placeFits(places)).toBe(true));

  it.each([
    [['New York, NY']],
    [['New York; Remote - US']],
    [['Remote - US']],
    [['Cambridge, MA']],
    [['Berlin; Paris']],
    [['Remote; United States']],
    [[]],
    [['  ', null]],
  ])('drops %j', (places) => expect(placeFits(places)).toBe(false));
});

describe('listedRoles', () => {
  it('reads a Greenhouse list, linking each job where the fit check reads it', () => {
    const roles = listedRoles(GH, ghBody([[123, 'Product Engineer', 'London, UK']]));
    expect(roles).toEqual([
      { company: GH.company, board: 'greenhouse', title: 'Product Engineer', places: ['London, UK'], link: 'https://job-boards.greenhouse.io/examplegh/jobs/123' },
    ]);
  });

  it('reads a Lever list on the EU host, with the country code as a place', () => {
    const [role] = listedRoles(LV, lvBody([[1, 'Design Engineer', ['Leeds'], 'GB']]));
    expect(role.link).toBe(`https://jobs.eu.lever.co/examplelv/${UUID(1)}`);
    expect(role.places).toEqual(['Leeds', 'GB']);
  });

  it('skips unlisted Ashby jobs and any job whose link the fit check would not read', () => {
    const body = abBody([
      [1, 'Product Engineer', 'London'],
      [2, 'Product Engineer', 'London', false],
    ]);
    (body.jobs as Array<{ id: string }>).push({ id: 'not-a-uuid', title: 'Product Engineer', location: 'London' } as never);
    expect(listedRoles(AB, body).map((r) => r.link)).toEqual([`https://jobs.ashbyhq.com/exampleab/${UUID(1)}`]);
  });

  it('skips jobs with no title or id, and copes with a body of the wrong shape', () => {
    expect(listedRoles(GH, { jobs: [{ id: 1 }, { title: 'Product Engineer' }, null] })).toEqual([]);
    expect(listedRoles(GH, 'nonsense')).toEqual([]);
    expect(listedRoles(LV, { jobs: [] })).toEqual([]);
  });
});

describe('runFunnel without Jev', () => {
  it('reads every board, counts each step, and lists what is open by company then title', async () => {
    const { fn, calls } = stubFetch({
      [listUrl(GH).href]: ghBody([
        [1, 'Product Engineer', 'London, UK'],
        [2, 'Account Executive', 'London, UK'],
        [3, 'Design Engineer', 'San Francisco'],
      ]),
      [listUrl(AB).href]: abBody([
        [1, 'Product Designer', 'Remote'],
        [2, 'Backend Engineer', 'London'],
      ]),
    });
    const r = await runFunnel({ fetch: fn, boards: [GH, AB] });
    expect(calls.sort()).toEqual([listUrl(AB).href, listUrl(GH).href].sort());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const f = r.funnel;
    expect({ boards: f.boards, listed: f.listed, inScope: f.inScope, open: f.open }).toEqual({ boards: { tried: 2, read: 2 }, listed: 5, inScope: 4, open: 3 });
    expect(f.left.map((x) => `${x.company}: ${x.title}`)).toEqual([
      'Example Ashby: Backend Engineer',
      'Example Ashby: Product Designer',
      'Example Greenhouse: Product Engineer',
    ]);
    expect(f).toMatchObject({ ruledOut: [], unscreened: 0, screening: null, screenFailed: false });
  });

  it('asks Greenhouse for every description with the list', () => {
    expect(listUrl(GH).searchParams.get('content')).toBe('true');
  });

  it('skips a board that fails, and tells an empty funnel from boards that all failed', async () => {
    const some = stubFetch({ [listUrl(GH).href]: new Error('network'), [listUrl(AB).href]: abBody([[1, 'Product Engineer', 'UK']]) });
    const r = await runFunnel({ fetch: some.fn, boards: [GH, AB] });
    expect(r.ok && r.funnel.boards).toEqual({ tried: 2, read: 1 });
    const quiet = stubFetch({ [listUrl(GH).href]: ghBody([[1, 'Recruiter', 'London']]) });
    expect(await runFunnel({ fetch: quiet.fn, boards: [GH] })).toEqual({ ok: false, error: 'none_found' });
    const down = stubFetch({ [listUrl(GH).href]: 503, [listUrl(AB).href]: new Error('timeout') });
    expect(await runFunnel({ fetch: down.fn, boards: [GH, AB] })).toEqual({ ok: false, error: 'boards_failed' });
  });
});

describe('FINDER_BOARDS', () => {
  it('names each company and board once', () => {
    expect(new Set(FINDER_BOARDS.map((b) => b.company)).size).toBe(FINDER_BOARDS.length);
    expect(new Set(FINDER_BOARDS.map((b) => `${b.board}/${b.token}`)).size).toBe(FINDER_BOARDS.length);
  });

  it('lists and links only through hosts the fit check already allows', () => {
    for (const b of FINDER_BOARDS) {
      expect(API_HOSTS).toContain(listUrl(b).hostname);
      const id = b.board === 'greenhouse' ? '42' : UUID(42);
      const link = parseJobLink(jobLink(b, id));
      expect(link).toMatchObject({ kind: 'board', board: b.board, token: b.token, id });
      if (link?.kind === 'board') expect(API_HOSTS).toContain(apiUrl(link).hostname);
    }
  });
});

describe('funnelHandler', () => {
  const get = () => new Request(`http://x${FUNNEL_PATH}`);
  const oneRole = () => stubFetch({ [listUrl(GH).href]: ghBody([[7, 'Product Engineer', 'Remote (UK)']]) });

  it('answers a GET with the funnel, boards by name; unscreened, it is cached only briefly', async () => {
    const res = await funnelHandler({ fetch: oneRole().fn, boards: [GH] })(get());
    expect(res.status).toBe(200);
    expect(res.headers.get('netlify-cdn-cache-control')).toBe(`public, durable, s-maxage=${FUNNEL_CACHE.unscreened}`);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.funnel.left).toEqual([
      { company: GH.company, board: 'Greenhouse', title: 'Product Engineer', places: ['Remote (UK)'], link: 'https://job-boards.greenhouse.io/examplegh/jobs/7' },
    ]);
  });

  it('runs once for requests that arrive together or soon after, and again once its time is up', async () => {
    const { fn, calls } = oneRole();
    let t = 0;
    const handle = funnelHandler({ fetch: fn, boards: [GH], now: () => t });
    await Promise.all([handle(get()), handle(get())]);
    await handle(get());
    expect(calls.length).toBe(1);
    t += FUNNEL_CACHE.unscreened * 1000 + 1;
    await handle(get());
    expect(calls.length).toBe(2);
  });

  it('says when there was nothing open, or the boards could not be read, and keeps neither', async () => {
    const quiet = stubFetch({ [listUrl(GH).href]: ghBody([]) });
    const handle = funnelHandler({ fetch: quiet.fn, boards: [GH] });
    const none = await handle(get());
    expect(none.status).toBe(404);
    expect(none.headers.get('cache-control')).toBe('no-store');
    expect(await none.json()).toEqual({ status: 'error', error: 'none_found' });
    await handle(get());
    expect(quiet.calls.length).toBe(2);
    const down = await funnelHandler({ fetch: () => Promise.reject(new Error('down')), boards: [GH, AB] })(get());
    expect(down.status).toBe(502);
    expect(await down.json()).toEqual({ status: 'error', error: 'boards_failed' });
  });

  it('turns away anything but GET', async () => {
    const res = await funnelHandler()(new Request(`http://x${FUNNEL_PATH}`, { method: 'POST', body: '{}' }));
    expect(res.status).toBe(405);
  });
});

describe('function config', () => {
  it('matches the handler', () => {
    expect(config.path).toBe(FUNNEL_PATH);
    expect(config.method).toEqual(['GET']);
    expect(config.rateLimit).toEqual({ ...FUNNEL_RATE_LIMIT, aggregateBy: ['ip', 'domain'] });
  });
});
