import { describe, expect, it } from 'vitest';
import { config } from '../netlify/functions/fit-role.mts';
import { apiUrl, API_HOSTS } from '../src/fit/boards.ts';
import { parseJobLink } from '../src/fit/links.ts';
import { FINDER_BOARDS, type FinderBoard } from '../src/fit/finder/boards.ts';
import { placeFits, titleFits } from '../src/fit/finder/filter.ts';
import { findRole, jobLink, listedRoles, listUrl, FINDER_LIMITS } from '../src/fit/finder/find.ts';
import { FIND_RATE_LIMIT, FIND_ROLE_PATH, handleFindRole } from '../src/fit/finder/handler.ts';

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

/** Math.random's stand-in: these values in turn, then 0. */
const seq = (...xs: number[]) => {
  let i = 0;
  return () => (i < xs.length ? xs[i++] : 0);
};

describe('titleFits', () => {
  it.each([
    'Senior Product Engineer',
    'Design Engineer',
    'Full-Stack Engineer',
    'AI Engineer (Core Harness)',
    'Lead Front End Engineer',
    'Founding Engineer',
    'Software Engineer, AI Product',
    'Staff Frontend Engineer',
  ])('picks %s', (t) => expect(titleFits(t)).toBe(true));

  it.each([
    'Senior Product Engineer [Backend]',
    'Full-Stack Engineer (Backend Leaning)',
    'Mechanical Design Engineer',
    'Applied AI Architect, Industries',
    'GTM Engineer (Applied AI)',
    'Data Scientist, Agent',
    'Engineering Manager, Frontend',
    'Junior Frontend Developer',
    'iOS Engineer',
    'Forward Deployed Engineer, AI',
    'Account Executive',
  ])('leaves %s', (t) => expect(titleFits(t)).toBe(false));
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
  ])('picks %j', (places) => expect(placeFits(places)).toBe(true));

  it.each([
    [['New York, NY']],
    [['New York; Remote - US']],
    [['Remote - US']],
    [['Cambridge, MA']],
    [['Berlin; Paris']],
    [['Remote; United States']],
    [[]],
    [['  ', null]],
  ])('leaves %j', (places) => expect(placeFits(places)).toBe(false));
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

describe('findRole', () => {
  it('picks a company first, then a role from it, from the roles the filters let through', async () => {
    const { fn } = stubFetch({
      [listUrl(GH).href]: ghBody([
        [1, 'Product Engineer', 'London, UK'],
        [2, 'Product Engineer', 'London, UK'],
        [3, 'Product Engineer', 'London, UK'],
        [4, 'Sales Engineer', 'London, UK'],
      ]),
      [listUrl(AB).href]: abBody([
        [1, 'Design Engineer', 'Remote'],
        [2, 'Design Engineer', 'San Francisco'],
      ]),
    });
    // Draws: the shuffle (0 swaps the two, so Ashby is read first), the company (0.4 of two is
    // the first, Ashby), then the role. Pooling all four roles instead, 0.4 would land on a
    // Greenhouse one: the one Ashby role gets the same chance as the three Greenhouse roles together
    const found = await findRole({ fetch: fn, boards: [GH, AB], random: seq(0, 0.4, 0) });
    expect(found).toEqual({
      ok: true,
      role: { company: AB.company, board: 'ashby', title: 'Design Engineer', places: ['Remote'], link: `https://jobs.ashbyhq.com/exampleab/${UUID(1)}` },
      considered: { boards: 2, companies: 2, roles: 4 },
    });
  });

  it('skips a board that fails or is slow, and still picks from the rest', async () => {
    const { fn } = stubFetch({ [listUrl(GH).href]: new Error('network'), [listUrl(AB).href]: abBody([[1, 'Product Engineer', 'UK']]) });
    const found = await findRole({ fetch: fn, boards: [GH, AB], random: seq() });
    expect(found.ok && found.role.company).toBe(AB.company);
    expect(found.ok && found.considered.boards).toBe(1);
  });

  it('reads a second handful of boards only when the first had nothing to pick', async () => {
    const boards: FinderBoard[] = Array.from({ length: FINDER_LIMITS.perRound + 2 }, (_, i) => ({
      company: `Example ${i}`,
      board: 'greenhouse',
      token: `example${i}`,
    }));
    const answers: Record<string, unknown> = {};
    boards.forEach((b, i) => (answers[listUrl(b).href] = ghBody(i === boards.length - 1 ? [[9, 'Founding Engineer', 'York']] : [[1, 'Recruiter', 'York']])));
    const { fn, calls } = stubFetch(answers);
    // random() of 0 keeps the shuffle in order: the match is in the second round
    const found = await findRole({ fetch: fn, boards, random: () => 0 });
    expect(calls.length).toBe(boards.length);
    expect(found.ok && found.role.title).toBe('Founding Engineer');
  });

  it('gives up after the rounds, telling an empty pick from boards that all failed', async () => {
    const quiet = stubFetch({ [listUrl(GH).href]: ghBody([[1, 'Recruiter', 'London']]) });
    expect(await findRole({ fetch: quiet.fn, boards: [GH], random: seq() })).toEqual({ ok: false, error: 'none_found' });
    const down = stubFetch({ [listUrl(GH).href]: 503, [listUrl(AB).href]: new Error('timeout') });
    expect(await findRole({ fetch: down.fn, boards: [GH, AB], random: seq() })).toEqual({ ok: false, error: 'boards_failed' });
  });

  it('never reads more than its rounds allow', async () => {
    const { fn, calls } = stubFetch({});
    await findRole({ fetch: fn, random: seq() });
    expect(calls.length).toBe(Math.min(FINDER_BOARDS.length, FINDER_LIMITS.perRound * FINDER_LIMITS.rounds));
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

describe('handleFindRole', () => {
  const get = () => new Request(`http://x${FIND_ROLE_PATH}`);

  it('answers a GET with the role, its board by name, never cached', async () => {
    const { fn } = stubFetch({ [listUrl(GH).href]: ghBody([[7, 'Product Engineer', 'Remote (UK)']]) });
    const res = await handleFindRole(get(), { fetch: fn, boards: [GH], random: seq() });
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.json()).toEqual({
      status: 'ok',
      role: { company: GH.company, board: 'Greenhouse', title: 'Product Engineer', places: ['Remote (UK)'], link: 'https://job-boards.greenhouse.io/examplegh/jobs/7' },
      considered: { boards: 1, companies: 1, roles: 1 },
    });
  });

  it('says when there was nothing to pick, or the boards could not be read', async () => {
    const quiet = stubFetch({ [listUrl(GH).href]: ghBody([]) });
    const none = await handleFindRole(get(), { fetch: quiet.fn, boards: [GH] });
    expect(none.status).toBe(404);
    expect(await none.json()).toEqual({ status: 'error', error: 'none_found' });
    const down = await handleFindRole(get(), { fetch: () => Promise.reject(new Error('down')), boards: [GH, AB] });
    expect(down.status).toBe(502);
    expect(await down.json()).toEqual({ status: 'error', error: 'boards_failed' });
  });

  it('turns away anything but GET', async () => {
    const res = await handleFindRole(new Request(`http://x${FIND_ROLE_PATH}`, { method: 'POST', body: '{}' }));
    expect(res.status).toBe(405);
  });
});

describe('function config', () => {
  it('matches the handler', () => {
    expect(config.path).toBe(FIND_ROLE_PATH);
    expect(config.method).toEqual(['GET']);
    expect(config.rateLimit).toEqual({ ...FIND_RATE_LIMIT, aggregateBy: ['ip', 'domain'] });
  });
});
