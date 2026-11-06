import { describe, expect, it } from 'vitest';
import { parseJobLink } from '../src/fit/links.ts';

// Invented boards and IDs throughout
const UUID = '0b6f5c1e-2d3a-4e5f-8a9b-0c1d2e3f4a5b';

describe('parseJobLink', () => {
  it('reads Greenhouse job links, new and old hosts, and the embedded form', () => {
    const want = { kind: 'board', board: 'greenhouse', token: 'exampleltd', id: '4012345' };
    expect(parseJobLink('https://job-boards.greenhouse.io/exampleltd/jobs/4012345')).toEqual(want);
    expect(parseJobLink('https://boards.greenhouse.io/exampleltd/jobs/4012345?gh_src=abc')).toEqual(want);
    expect(parseJobLink('  https://boards.greenhouse.io/exampleltd/jobs/4012345/  ')).toEqual(want);
    expect(parseJobLink('https://boards.greenhouse.io/embed/job_app?for=exampleltd&token=4012345')).toEqual(want);
    expect(parseJobLink('job-boards.greenhouse.io/exampleltd/jobs/4012345')).toEqual(want);
    expect(parseJobLink('https://job-boards.eu.greenhouse.io/exampleltd/jobs/4012345')).toEqual(want);
  });

  it('reads Lever job links, with the EU host and the apply page', () => {
    expect(parseJobLink(`https://jobs.lever.co/fictional-analytics/${UUID}`)).toEqual({
      kind: 'board',
      board: 'lever',
      token: 'fictional-analytics',
      id: UUID,
    });
    expect(parseJobLink(`https://jobs.eu.lever.co/fictional-analytics/${UUID.toUpperCase()}/apply`)).toEqual({
      kind: 'board',
      board: 'lever',
      token: 'fictional-analytics',
      id: UUID,
      region: 'eu',
    });
  });

  it('reads Ashby job links, with the application page', () => {
    const want = { kind: 'board', board: 'ashby', token: 'Example.Co', id: UUID };
    expect(parseJobLink(`https://jobs.ashbyhq.com/Example.Co/${UUID}`)).toEqual(want);
    expect(parseJobLink(`https://jobs.ashbyhq.com/Example.Co/${UUID}/application?utm_source=x`)).toEqual(want);
  });

  it('declines LinkedIn links, without looking further', () => {
    for (const url of [
      'https://www.linkedin.com/jobs/view/1234567890/',
      'https://uk.linkedin.com/jobs/view/senior-engineer-at-example-1234567890',
      'linkedin.com/jobs/view/1234567890',
      'https://lnkd.in/abcdef',
    ]) {
      expect(parseJobLink(url)).toEqual({ kind: 'linkedin' });
    }
  });

  it('calls anything else a link it can’t read', () => {
    for (const url of [
      'https://example.com/careers/senior-engineer',
      'https://job-boards.greenhouse.io/exampleltd',
      'https://job-boards.greenhouse.io/exampleltd/jobs/not-a-number',
      'https://boards.greenhouse.io/embed/job_app?for=exampleltd',
      `https://jobs.lever.co/fictional-analytics/${UUID}/extra/bits`,
      'https://jobs.lever.co/fictional-analytics/1234',
      `https://jobs.ashbyhq.com/example/${UUID}/elsewhere`,
      `https://evil.jobs.lever.co/fictional-analytics/${UUID}`,
      `https://jobs.lever.co.example.com/fictional-analytics/${UUID}`,
      `https://user:pass@jobs.lever.co/fictional-analytics/${UUID}`,
      `https://jobs.lever.co:8443/fictional-analytics/${UUID}`,
      `https://jobs.lever.co/..%2Fapi/${UUID}`,
      `ftp://jobs.lever.co/fictional-analytics/${UUID}`,
    ]) {
      expect(parseJobLink(url), url).toEqual({ kind: 'other' });
    }
  });

  it('leaves text alone, including text that mentions a link', () => {
    for (const text of [
      'Senior Product Engineer at Example Ltd',
      `Apply at https://jobs.lever.co/fictional-analytics/${UUID}`,
      '',
      'TypeScript',
      'e.g.',
    ]) {
      expect(parseJobLink(text), text).toBeNull();
    }
    expect(parseJobLink(42)).toBeNull();
  });
});
