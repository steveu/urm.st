import { describe, expect, it } from 'vitest';
import { ago, funnelHtml, poolListHtml, readPool, type Pool, type PoolRole } from '../src/components/fit/pool.ts';

// Invented roles throughout.
const role = (company: string, title: string, extra: Partial<PoolRole> = {}): PoolRole => ({
  company,
  board: 'Ashby',
  title,
  places: ['London', 'Remote'],
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

describe('funnelHtml', () => {
  it('draws each step to scale, starting from the width above it', () => {
    const html = funnelHtml(pool(), Date.parse('2026-11-06T12:00:00Z'));
    expect(html).toContain('--i:0;--from:100.0%;--w:100.0%');
    expect(html).toContain('--i:1;--from:100.0%;--w:50.0%');
    expect(html).toContain('--i:2;--from:50.0%;--w:20.0%');
    // Jev's step: from what it screened to what it left, never thinner than a sliver
    expect(html).toContain('class="jev" style="--i:3;--from:20.0%;--w:0.8%"');
    expect(html).toContain('left; Jev ruled out 1');
    expect(html).toContain('Read 2 hours ago. Jev screened 2 roles in 6.2s, for $0.06.');
  });

  it('says so when Jev didn’t screen, and draws no Jev step', () => {
    const html = funnelHtml(pool({ screening: null, screenFailed: true, ruledOut: [] }));
    expect(html).not.toContain('class="jev"');
    expect(html).toContain('Jev couldn’t screen them just now');
  });
});

describe('poolListHtml', () => {
  it('groups by company, marks the open role, and escapes board text', () => {
    const roles = [role('A <b>', 'Product <i>Engineer</i>'), role('B', 'Designer')];
    const html = poolListHtml(roles, { current: roles[1].link });
    expect(html).toContain('<p class="co">A &lt;b&gt;</p>');
    expect(html).toContain('Product &lt;i&gt;Engineer&lt;/i&gt;');
    expect(html.match(/aria-current/g)?.length).toBe(1);
    expect(html).toContain('London +1');
  });

  it('shows Jev’s reason on a ruled-out role, and filters by title or company', () => {
    const out = [role('Example', 'Backend Engineer', { reason: 'backend_or_data', p: 0.97 })];
    expect(poolListHtml(out, {})).toContain('mainly backend or data · 0.97');
    expect(poolListHtml(out, { filter: 'design' })).toContain('Nothing matches');
    expect(poolListHtml(out, { filter: 'EXAMPLE' })).toContain('Backend Engineer');
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
