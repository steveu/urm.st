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
    activity: activity.projects.eddy,
  },
  {
    key: 'one-thought',
    name: 'One Thought',
    description: 'A golf app that counts one thought with a button in your pocket.',
    state: 'beta',
    status: 'TestFlight',
    swatch: 'var(--one-thought)',
    ink: '#7a5f2b',
    icon: '/icons/one-thought.png',
    activity: activity.projects['one-thought'],
  },
  {
    key: 'hublsoft',
    name: 'Hublsoft',
    description: 'AI-directed data analysis for a decision-intelligence platform.',
    state: 'soon',
    status: 'In progress',
    swatch: 'transparent',
    ink: 'var(--faint)',
  },
];
