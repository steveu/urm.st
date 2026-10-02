// Display names and swatches for projects that have decision logs.
export const projectInfo = {
  eddy: { name: 'Eddy', swatch: 'var(--eddy)' },
  'one-thought': { name: 'One Thought', swatch: 'var(--one-thought)' },
} as const;

export type ProjectKey = keyof typeof projectInfo;

export const formatDate = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export const pad = (n: number) => String(n).padStart(4, '0');
