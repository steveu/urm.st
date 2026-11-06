// The public job boards the funnel reads. Product, AI and fintech companies with Greenhouse,
// Lever or Ashby boards, chosen for range rather than fit: some hire in or near York or
// remotely in the UK, most in London, a few further afield. Boards with many hundreds of roles
// (Stripe, Cloudflare, Datadog) are left out, as they'd outweigh the rest. Each was checked
// against its board's public API on 6 November 2026. The funnel reads only these.
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
  { company: 'Causaly', board: 'ashby', token: 'causaly' },
  { company: 'Cleo', board: 'greenhouse', token: 'cleo' },
  { company: 'ClickHouse', board: 'ashby', token: 'clickhouse' },
  { company: 'Cohere', board: 'ashby', token: 'cohere' },
  { company: 'Contentful', board: 'greenhouse', token: 'contentful' },
  { company: 'Deepgram', board: 'ashby', token: 'deepgram' },
  { company: 'Deliveroo', board: 'greenhouse', token: 'deliveroo' },
  { company: 'ElevenLabs', board: 'ashby', token: 'elevenlabs' },
  { company: 'Faculty', board: 'ashby', token: 'faculty' },
  { company: 'Figma', board: 'greenhouse', token: 'figma' },
  { company: 'GitLab', board: 'greenhouse', token: 'gitlab' },
  { company: 'GoCardless', board: 'greenhouse', token: 'gocardless' },
  { company: 'Grafana Labs', board: 'greenhouse', token: 'grafanalabs' },
  { company: 'Granola', board: 'ashby', token: 'granola' },
  { company: 'Hex', board: 'ashby', token: 'hex' },
  { company: 'incident.io', board: 'ashby', token: 'incident' },
  { company: 'Intercom', board: 'greenhouse', token: 'intercom' },
  { company: 'Kaluza', board: 'ashby', token: 'kaluza' },
  { company: 'Lendable', board: 'ashby', token: 'lendable' },
  { company: 'Linear', board: 'ashby', token: 'linear' },
  { company: 'Lovable', board: 'ashby', token: 'lovable' },
  { company: 'Marshmallow', board: 'ashby', token: 'marshmallow' },
  { company: 'Miro', board: 'ashby', token: 'miro' },
  { company: 'Modal', board: 'ashby', token: 'modal' },
  { company: 'Monzo', board: 'greenhouse', token: 'monzo' },
  { company: 'Moonpig', board: 'lever', token: 'moonpig' },
  { company: 'Motorway', board: 'ashby', token: 'motorway' },
  { company: 'Multiverse', board: 'ashby', token: 'multiverse' },
  { company: 'n8n', board: 'ashby', token: 'n8n' },
  { company: 'Notion', board: 'ashby', token: 'notion' },
  { company: 'Opencast', board: 'lever', token: 'opencast', region: 'eu' },
  { company: 'Paddle', board: 'ashby', token: 'paddle' },
  { company: 'Perplexity', board: 'ashby', token: 'perplexity' },
  { company: 'Pleo', board: 'ashby', token: 'pleo' },
  { company: 'PostHog', board: 'ashby', token: 'posthog' },
  { company: 'Prolific', board: 'greenhouse', token: 'prolific' },
  { company: 'Quantexa', board: 'ashby', token: 'quantexa' },
  { company: 'Render', board: 'ashby', token: 'render' },
  { company: 'Replit', board: 'ashby', token: 'replit' },
  { company: 'Sanity', board: 'ashby', token: 'sanity' },
  { company: 'Scott Logic', board: 'lever', token: 'scottlogic' },
  { company: 'Sentry', board: 'ashby', token: 'sentry' },
  { company: 'Snyk', board: 'ashby', token: 'snyk' },
  { company: 'Speechmatics', board: 'greenhouse', token: 'speechmatics' },
  { company: 'Spotify', board: 'lever', token: 'spotify' },
  { company: 'StarCompliance', board: 'lever', token: 'starcompliance' },
  { company: 'Storyblok', board: 'greenhouse', token: 'storyblok' },
  { company: 'Supabase', board: 'ashby', token: 'supabase' },
  { company: 'Synthesia', board: 'ashby', token: 'synthesia' },
  { company: 'Tailscale', board: 'greenhouse', token: 'tailscale' },
  { company: 'Temporal', board: 'ashby', token: 'temporal' },
  { company: 'Tide', board: 'greenhouse', token: 'tide' },
  { company: 'tldraw', board: 'ashby', token: 'tldraw' },
  { company: 'Trading 212', board: 'ashby', token: 'trading212' },
  { company: 'Trigger.dev', board: 'ashby', token: 'triggerdev' },
  { company: 'Vanta', board: 'ashby', token: 'vanta' },
  { company: 'Vercel', board: 'greenhouse', token: 'vercel' },
  { company: 'Wayve', board: 'ashby', token: 'wayve' },
  { company: 'Webflow', board: 'ashby', token: 'webflow' },
  { company: 'Wise', board: 'greenhouse', token: 'wise' },
  { company: 'Zego', board: 'ashby', token: 'zego' },
  { company: 'Zopa', board: 'lever', token: 'zopa' },
];
