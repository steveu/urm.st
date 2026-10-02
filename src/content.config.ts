import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Public, scrubbed copies of each project's decision records (ADRs).
// Files live at src/content/decisions/<project>/<NNNN-slug>.md.
const decisions = defineCollection({
  loader: glob({ pattern: '*/*.md', base: './src/content/decisions' }),
  schema: z.object({
    project: z.enum(['eddy', 'one-thought']),
    number: z.number().int().positive(),
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string(),
    amended: z.array(z.coerce.date()).optional(),
  }),
});

export const collections = { decisions };
