// Display names and swatches for projects that have decision logs.
export const projectInfo = {
  // swatch: decorative fills; ink: the same hue dark enough for text on the light ground
  eddy: { name: 'Eddy', swatch: 'var(--eddy)', ink: 'var(--eddy)' },
  'one-thought': { name: 'One Thought', swatch: 'var(--one-thought)', ink: '#7a5f2b' },
} as const;

export type ProjectKey = keyof typeof projectInfo;

export const formatDate = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export const pad = (n: number) => String(n).padStart(4, '0');
