import activity from './activity.json';

export type ProjectState = 'live' | 'beta' | 'soon';

export type Project = {
  key: string;
  name: string;
  description: string;
  role?: string;
  platform?: string;
  state: ProjectState;
  status: string;
  since?: string;
  swatch: string;
  href?: string;
  activity?: (typeof activity.projects)[keyof typeof activity.projects];
};

export const activityMeta = { generatedAt: activity.generatedAt, weeks: activity.weeks };

export const projects: Project[] = [
  {
    key: 'eddy',
    name: 'Eddy',
    description: 'A self-hosted family video app. A local model checks every shared link, and a short daily feed ends on purpose.',
    role: 'Product, design, engineering, evals',
    platform: 'Web + iOS · Gemma on a Mac mini',
    state: 'live',
    status: 'Live',
    since: 'in daily use since Apr 2026',
    swatch: 'var(--eddy)',
    href: '/work',
    activity: activity.projects.eddy,
  },
  {
    key: 'one-thought',
    name: 'One Thought',
    description: 'A golf app for carrying one thought round the course, counted with a button in your pocket.',
    role: 'Product, design, engineering',
    platform: 'iOS + watchOS · designed in Claude Design',
    state: 'beta',
    status: 'TestFlight',
    since: 'since Sep 2026',
    swatch: 'var(--one-thought)',
    href: '/work',
    activity: activity.projects['one-thought'],
  },
  {
    key: 'hublsoft',
    name: 'Hublsoft',
    description: 'AI-directed data analysis for a decision-intelligence platform.',
    state: 'soon',
    status: 'In progress',
    since: 'case study soon',
    swatch: 'transparent',
  },
];
