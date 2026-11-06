// Criteria that count for a role, proposed for the site's sentence marks (job-radar #40). Trial
// only: they mark sentences and don't change the fit. Each is one judgement; TypeScript and
// React is a keyword check in code, so it isn't asked. Throwaway.
import type { Criterion } from './criteria.ts';
import type { Pull } from './copy.ts';

export const EXTRA = {
  evals_in_scope: {
    instructions: 'Does the role in the `posting` include measuring whether the AI works, such as running evals, building test sets or reviewing model output?',
    true: 'The duties include running evals, building test sets, or reviewing model output to decide what ships.',
    false: 'The posting has no AI work, or someone else measures the AI, or the only testing is of ordinary code.',
  },
  works_with_design: {
    instructions: 'Does the role in the `posting` work directly with a designer on what gets built?',
    true: 'The posting says the role works with a designer, a product designer or a design team.',
    false: 'No designer is mentioned, or the role is itself the designer handing work to engineers.',
  },
  shapes_product: {
    instructions: 'Does the role in the `posting` have a say in what gets built?',
    true: 'The role decides features, plans the roadmap, or works with founders, product or users on what to build next.',
    false: 'The role builds or runs what others have decided, such as services, tickets or a platform for other teams.',
  },
  senior_level: {
    instructions: 'Does the `posting` state that the role is senior, lead, staff or principal?',
    true: "The title or text says senior, lead, staff or principal, or it asks for five or more years' experience.",
    false: 'The posting says junior, graduate or mid-level, or states no level at all.',
  },
  frontend_craft: {
    instructions: 'Is frontend engineering craft central to the role in the `posting`?',
    true: 'The role centres on UI architecture, a component library or design system, accessibility, or interaction detail in code.',
    false: 'The role is mainly backend, platform or design work, or the front end is one part of full-stack feature work.',
  },
  ai_ux: {
    instructions: 'Does the role in the `posting` shape how users see and steer an AI feature?',
    true: "The duties include how an assistant shows its working, how users correct or overrule it, or how they edit what it drafts.",
    false: 'The role has no AI feature to shape, or builds the AI behind the scenes without its interface.',
  },
  early_ownership: {
    instructions: 'Is the role in the `posting` a founding role, or the first of its kind at the employer?',
    true: 'The posting says founding engineer, first AI engineer, first designer, or one of the first hires.',
    false: 'The role joins an existing team doing that work, or the posting says nothing about being early.',
  },
} satisfies Record<string, Criterion>;

export type ExtraId = keyof typeof EXTRA;
export const EXTRA_IDS = Object.keys(EXTRA) as ExtraId[];

export const EXTRA_COPY: Record<ExtraId | 'typescript_react', { short: string; pull: Pull }> = {
  typescript_react: { short: 'TypeScript and React', pull: 'for' },
  evals_in_scope: { short: 'Evals in scope', pull: 'for' },
  works_with_design: { short: 'Works with design', pull: 'for' },
  shapes_product: { short: 'Shapes the product', pull: 'for' },
  senior_level: { short: 'Senior level', pull: 'for' },
  frontend_craft: { short: 'Frontend craft', pull: 'for' },
  ai_ux: { short: 'Shapes the AI’s interface', pull: 'for' },
  early_ownership: { short: 'Early ownership', pull: 'for' },
};

/** TypeScript and React, in code: whole words, either name. */
export const TS_REACT = /\b(TypeScript|React)\b/;

/**
 * Expected answers, written before the first run. null: a reasonable reader could go either
 * way, so it isn't scored.
 */
export const GOLD: Record<string, Record<ExtraId | 'typescript_react', boolean | null>> = {
  strong: { typescript_react: true, evals_in_scope: true, works_with_design: true, shapes_product: true, senior_level: true, frontend_craft: null, ai_ux: true, early_ownership: null },
  possible: { typescript_react: true, evals_in_scope: false, works_with_design: true, shapes_product: true, senior_level: true, frontend_craft: true, ai_ux: false, early_ownership: false },
  poor: { typescript_react: false, evals_in_scope: false, works_with_design: false, shapes_product: false, senior_level: true, frontend_craft: false, ai_ux: false, early_ownership: false },
  injection: { typescript_react: false, evals_in_scope: false, works_with_design: false, shapes_product: true, senior_level: false, frontend_craft: false, ai_ux: true, early_ownership: false },
  halden: { typescript_react: true, evals_in_scope: false, works_with_design: true, shapes_product: true, senior_level: true, frontend_craft: false, ai_ux: null, early_ownership: false },
};
