import { describe, expect, it } from 'vitest';
import { ago, readPool, stripHtml, stripShape, stripSteps, type Pool, type PoolRole } from '../src/components/fit/pool.ts';

// Invented roles throughout.
const role = (company: string, title: string, extra: Partial<PoolRole> = {}): PoolRole => ({
  company,
  board: 'Ashby',
  title,
  places: ['London'],
  link: `https://jobs.ashbyhq.com/example/${company}-${title}`.replace(/\s/g, '-'),
  ...extra,
});

const pool = (over: Partial<Pool> = {}): Pool => ({
  at: '2026-11-06T10:00:00Z',
  boards: { tried: 3, read: 3 },
  listed: 1000,
  inScope: 500,
  open: 200,
  left: [role('Example', 'Design Engineer')],
  ruledOut: [role('Example', 'Backend Engineer', { reason: 'backend_or_data', p: 0.97 })],
  unscreened: 0,
  screening: { model: 'jev-1.14.0', ms: 6200, costUsd: 0.059 },
  screenFailed: false,
  ...over,
});

describe('the strip', () => {
  it('has a step for each narrowing, ending at the one role on the sheet', () => {
    expect(stripSteps(pool()).map((s) => [s.count, s.by])).toEqual([
      [1000, 'read'],
      [500, 'title rule'],
      [200, 'place rule'],
      [1, 'Jev'],
      [1, 'Haiku'],
    ]);
    expect(stripSteps(pool({ screening: null, screenFailed: true })).map((s) => s.by)).toEqual(['read', 'title rule', 'place rule', 'Haiku']);
  });

  it('draws each step to scale, hatching what each rule took away and what Jev ruled out', () => {
    const { polygon, cuts, sageFrom } = stripShape(stripSteps(pool()));
    // Full height less a margin at the start; half of that once the title rule has run
    expect(polygon.startsWith('0% 4%, ')).toBe(true);
    expect(polygon).toContain('26% 27%');
    expect(cuts.map((c) => c.kind)).toEqual(['rule', 'rule', 'jev']);
    // Jev's cut is as thick as what it was given
    expect(cuts[2].height).toBeCloseTo(200 * 0.092, 1);
    expect(sageFrom).toBe(54);
  });

  it('says when it was read and what Jev cost', () => {
    const html = stripHtml(pool(), Date.parse('2026-11-06T12:00:00Z'));
    expect(html).toContain('Read 2 hours ago. Jev screened 2 roles in 6.2s, for $0.06.');
    expect(html).toContain('<b>1</b> <span>clear Jev’s bar; 1 don’t</span> <i class="by">Jev</i>');
    expect(stripHtml(pool({ screening: null, screenFailed: true }))).toContain('Jev couldn’t screen them just now.');
  });
});

describe('readPool', () => {
  it('takes the funnel’s answer, and nothing of the wrong shape', () => {
    expect(readPool({ funnel: pool() })).not.toBeNull();
    expect(readPool({ funnel: { ...pool(), left: [{ title: 'x' }] } })).toBeNull();
    expect(readPool({ funnel: { ...pool(), ruledOut: [role('A', 'B', { reason: 'nonsense' as never, p: 1 })] } })).toBeNull();
    expect(readPool(null)).toBeNull();
  });
});

describe('ago', () => {
  const now = Date.parse('2026-11-06T12:00:00Z');
  it.each([
    ['2026-11-06T11:59:30Z', 'just now'],
    ['2026-11-06T11:48:00Z', '12 minutes ago'],
    ['2026-11-06T11:00:00Z', 'an hour ago'],
    ['2026-11-06T06:00:00Z', '6 hours ago'],
    ['2026-11-05T10:00:00Z', 'yesterday'],
  ])('%s is %s', (at, said) => expect(ago(at, now)).toBe(said));
});
