// The public job boards the role finder picks from. Product and AI companies with Greenhouse,
// Lever or Ashby boards, chosen for range rather than fit: some hire in or near York or
// remotely in the UK, most in London, a few further afield. Each was checked against its
// board's public API on 6 November 2026. The finder reads only these.
import type { Board } from '../links.ts';

export interface FinderBoard {
  company: string;
  board: Board;
  /** Greenhouse's board token, Lever's site or Ashby's job board name. */
  token: string;
  /** Lever keeps EU boards on a separate host. */
  region?: 'eu';
}

export const FINDER_BOARDS: readonly FinderBoard[] = [
  { company: 'Anaplan', board: 'greenhouse', token: 'anaplan' },
  { company: 'Attio', board: 'ashby', token: 'attio' },
  { company: 'Aveni', board: 'ashby', token: 'aveni' },
  { company: 'Canonical', board: 'greenhouse', token: 'canonical' },
  { company: 'ClickHouse', board: 'ashby', token: 'clickhouse' },
  { company: 'Cohere', board: 'ashby', token: 'cohere' },
  { company: 'Deliveroo', board: 'greenhouse', token: 'deliveroo' },
  { company: 'ElevenLabs', board: 'ashby', token: 'elevenlabs' },
  { company: 'Faculty', board: 'ashby', token: 'faculty' },
  { company: 'Figma', board: 'greenhouse', token: 'figma' },
  { company: 'GitLab', board: 'greenhouse', token: 'gitlab' },
  { company: 'Granola', board: 'ashby', token: 'granola' },
  { company: 'incident.io', board: 'ashby', token: 'incident' },
  { company: 'Intercom', board: 'greenhouse', token: 'intercom' },
  { company: 'Lovable', board: 'ashby', token: 'lovable' },
  { company: 'Motorway', board: 'ashby', token: 'motorway' },
  { company: 'Multiverse', board: 'ashby', token: 'multiverse' },
  { company: 'n8n', board: 'ashby', token: 'n8n' },
  { company: 'Opencast', board: 'lever', token: 'opencast', region: 'eu' },
  { company: 'Paddle', board: 'ashby', token: 'paddle' },
  { company: 'PostHog', board: 'ashby', token: 'posthog' },
  { company: 'Prolific', board: 'greenhouse', token: 'prolific' },
  { company: 'Scott Logic', board: 'lever', token: 'scottlogic' },
  { company: 'StarCompliance', board: 'lever', token: 'starcompliance' },
  { company: 'Synthesia', board: 'ashby', token: 'synthesia' },
  { company: 'Tailscale', board: 'greenhouse', token: 'tailscale' },
  { company: 'tldraw', board: 'ashby', token: 'tldraw' },
  { company: 'Trigger.dev', board: 'ashby', token: 'triggerdev' },
];
