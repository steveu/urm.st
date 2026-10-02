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
    // When the decision was made
    date: z.coerce.date(),
    // When it was written up as a record, if later than the decision
    written: z.coerce.date().optional(),
    summary: z.string(),
    amended: z.array(z.coerce.date()).optional(),
    // Written up after the fact from plans, design notes and commits, not recorded at the time
    retroactive: z.boolean().optional(),
  }),
});

export const collections = { decisions };
