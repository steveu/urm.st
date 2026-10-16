import activity from './activity.json';

export type ProjectState = 'live' | 'beta' | 'soon';

export type Project = {
  key: string;
  name: string;
  description: string;
  state: ProjectState;
  status: string;
  swatch: string;
  /** Text-safe version of the swatch, for marks and labels */
  ink: string;
  /** iOS app icon, 96px square, under public/ */
  icon?: string;
  /** Its section on /work */
  work?: string;
  /** Public source, when there is some */
  repo?: string;
  activity?: (typeof activity.projects)[keyof typeof activity.projects];
};

export const activityMeta = { generatedAt: activity.generatedAt };

export const projects: Project[] = [
  {
    key: 'eddy',
    name: 'Eddy',
    description: 'A family video app where a local model checks every link.',
    state: 'live',
    status: 'Live',
    swatch: 'var(--eddy)',
    ink: 'var(--eddy)',
    icon: '/icons/eddy.png',
    work: '/work#eddy',
    repo: 'https://github.com/eddy-hq/eddy',
    activity: activity.projects.eddy,
  },
  {
    key: 'one-thought',
    name: 'One Thought',
    description: 'A golf app for carrying one thought round the course.',
    state: 'beta',
    status: 'TestFlight',
    swatch: 'var(--one-thought)',
    ink: '#7a5f2b',
    icon: '/icons/one-thought.png',
    work: '/work#one-thought',
    activity: activity.projects['one-thought'],
  },
  {
    key: 'hublai',
    name: 'HublAI',
    description: 'AI-directed data analysis for a decision-intelligence platform.',
    state: 'soon',
    status: 'In progress',
    swatch: 'transparent',
    ink: 'var(--faint)',
  },
];
