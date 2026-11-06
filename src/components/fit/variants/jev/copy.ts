// Site copy for the Jev mock-up: what a yes to each criterion means for the profile, said in
// the band's voice, and which way it pulls. Throwaway.
import type { CriterionId } from './criteria.ts';

export type Pull = 'for' | 'against' | 'mixed';

export const CRITERION_COPY: Record<CriterionId, { short: string; copy: string; pull: Pull }> = {
  product_is_ai: { short: 'AI product', copy: 'The product itself is AI.', pull: 'for' },
  role_ai_work: { short: 'Builds AI', copy: 'The role builds AI behaviour: prompts, tools or evals.', pull: 'for' },
  owns_user_facing: { short: 'Owns what users touch', copy: 'Owns the interface, design system or agent, with a say in how it works.', pull: 'for' },
  product_role: { short: 'Product management', copy: 'A product management role.', pull: 'mixed' },
  explicitly_junior: { short: 'Junior', copy: 'Marked as junior.', pull: 'against' },
  stated_mid_level: { short: 'Mid-level', copy: 'Stated as mid-level.', pull: 'mixed' },
  junior_signals: { short: 'Junior wording', copy: 'Junior-sounding wording, with no level stated.', pull: 'mixed' },
  backend_or_data: { short: 'Backend or data', copy: 'Mainly backend or data work.', pull: 'against' },
  customer_delivery: { short: 'Customer delivery', copy: 'Customer-facing delivery work.', pull: 'against' },
  agency: { short: 'Agency', copy: 'An agency or consultancy, building for clients.', pull: 'against' },
  people_management: { short: 'People management', copy: 'Mainly managing people.', pull: 'against' },
  internal_tooling: { short: 'Internal tools', copy: 'Internal tools for the employer’s own staff.', pull: 'against' },
  off_discipline: { short: 'Another discipline', copy: 'Outside web and AI product work.', pull: 'against' },
};
