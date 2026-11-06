// Copied from job-radar's jev-criteria branch (a9e5606), src/eval/criteria/criteria.ts, for the
// Jev mock-up only. Throwaway: the real thing would share one copy with job-radar.

/**
 * The fit criteria, one yes/no judgement each (issue #40). Jev answers them
 * as Nouls; Haiku answers the same wording as booleans, so a difference in
 * results is the model's, not the questions'. Every instruction names the
 * `posting` field of the state.
 */
export interface Criterion {
  instructions: string;
  true: string;
  false: string;
}

export const CRITERIA = {
  product_is_ai: {
    instructions: 'Is the product the employer in the `posting` builds itself powered by AI, such as an AI assistant, agent, copilot or LLM feature?',
    true: 'The product an employer sells is an AI assistant, agent, copilot or AI search, or uses LLMs to do work for its users.',
    false: 'The product is ordinary software, and AI appears only as coding tools the team uses, a vague future plan, or something another team is trying.',
  },
  role_ai_work: {
    instructions: "Does the role in the `posting` itself build AI behaviour, such as writing prompts, building an agent's tools, building LLM features or evaluating model output?",
    true: 'The duties include writing prompts, building agent tools, building LLM features, or running evaluations of model output.',
    false: 'The role uses AI coding assistants, works next to an AI team, manages people who build AI, or sells an AI product, but does not build AI behaviour itself.',
  },
  owns_user_facing: {
    instructions: "Does the role in the `posting` own a product's user interface, a design system, or an AI agent's behaviour, with a say in how it works?",
    true: 'The posting says the role owns, leads or decides the interface, the component library or design system, or the agent, rather than building parts of it.',
    false: 'The role builds what others scope: picking up tickets, building screens from handed-over designs, providing APIs or SDKs to others, or delivering client projects.',
  },
  product_role: {
    instructions: 'Is the role in the `posting` a product management role, such as product manager, product lead or product owner?',
    true: 'The job is product management: owning a roadmap and deciding what gets built, with engineers and designers building it.',
    false: 'The job is engineering, design, sales or another discipline. A product engineer is an engineering role.',
  },
  explicitly_junior: {
    instructions: 'Does the `posting` explicitly mark the role as junior?',
    true: "The title says junior, graduate, intern or apprentice; or it is a graduate programme; or it asks for under three years' experience, such as 0-2 or 1-2 years.",
    false: "The posting says senior, lead, staff or mid-level, says nothing about level, or asks for three or more years' experience.",
  },
  stated_mid_level: {
    instructions: 'Does the `posting` state that the role is mid-level?',
    true: "The title or text says mid-level, mid-weight or intermediate.",
    false: 'The posting states another level, or no level at all.',
  },
  junior_signals: {
    instructions: 'Does the `posting` use junior-sounding wording about the candidate, without stating a level?',
    true: "It talks about you learning and growing, mentoring for you, or requires a degree, or asks only for 'familiarity with', 'some experience' or an interest in the stack.",
    false: 'It asks for substantial, senior or proven experience, or has none of this wording. A learning budget in the perks does not count.',
  },
  backend_or_data: {
    instructions: "Is the main work of the role in the `posting` backend or data work rather than an interface or an AI agent's behaviour?",
    true: 'Most duties are services, APIs, data pipelines, indexes, ML models, infrastructure, distributed systems, platform work or on-call.',
    false: "Most duties are a user interface, a design system, an agent's prompts and tools, or product decisions, even if some backend work is included.",
  },
  customer_delivery: {
    instructions: "Is the role in the `posting` customer-facing delivery work for the employer's customers?",
    true: 'Forward deployed, solutions, integration or implementation engineering, developer experience, developer relations, or SDK work for outside developers.',
    false: 'The role builds the employer\'s own product for its users, even if it talks to customers to learn what they need.',
  },
  agency: {
    instructions: 'Is the employer in the `posting` an agency, consultancy or outsourcing firm building projects for clients?',
    true: 'The employer describes itself as an agency, studio, consultancy or outsourcer, and the work is client projects.',
    false: 'The employer builds and sells its own product or service.',
  },
  people_management: {
    instructions: 'Is the role in the `posting` mainly people management?',
    true: 'Most duties are line management, hiring, performance reviews, planning and delivery tracking, with little hands-on building.',
    false: 'The role is mainly hands-on building, even if it includes mentoring or leading technical decisions.',
  },
  internal_tooling: {
    instructions: "Does the role in the `posting` build internal tools for the employer's own staff, rather than a product customers use?",
    true: "The users are the employer's own operations, support, sales, claims or warehouse staff.",
    false: "The users are the employer's customers, or the public.",
  },
  off_discipline: {
    instructions: 'Is the role in the `posting` outside software, design and product work on web or AI products?',
    true: 'The role is sales, marketing, customer support, embedded firmware, hardware, native mobile apps, or DevOps.',
    false: 'The role is software engineering, design engineering, applied AI or product management on a web or AI product.',
  },
} satisfies Record<string, Criterion>;

export type CriterionId = keyof typeof CRITERIA;
export const CRITERION_IDS = Object.keys(CRITERIA) as CriterionId[];

export type Answers = Record<CriterionId, boolean>;
