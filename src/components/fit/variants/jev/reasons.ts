// The site's reason list (src/fit/copy.ts REASONS) as Jev questions, so Haiku and Jev speak the
// same vocabulary: Haiku picks two or three reasons; Jev answers every one of them, for the
// posting and for each sentence. Worded about the posting alone, since Jev doesn't see the
// profile. Throwaway: for the aligned mock-up.
import type { ReasonCode } from '../../../../fit/copy.ts';
import type { Criterion } from './criteria.ts';

export const REASON_QUESTIONS: Record<ReasonCode, Criterion> = {
  ai_product_end_to_end: {
    instructions: 'Does the role in the `posting` build AI features that users use, across the interface and the prompts, tools or evals behind it?',
    true: 'The role builds user-facing AI features across several layers: the interface and the prompts, tools or evals behind it.',
    false: 'The role builds one layer only, such as a backend service or a model, or the product has no AI.',
  },
  owns_agent: {
    instructions: 'Does the role in the `posting` own an AI agent or assistant?',
    true: 'The posting says the role owns, leads or is responsible for an assistant or agent: its prompts, tools or behaviour.',
    false: 'There is no agent or assistant, or the role contributes to one that another team owns.',
  },
  evals_in_scope: {
    instructions: 'Does the role in the `posting` include measuring whether the AI works, such as running evals, building test sets or reviewing model output?',
    true: 'The duties include running evals, building test sets, or reviewing model output to decide what ships.',
    false: 'The posting has no AI work, or someone else measures the AI, or the only testing is of ordinary code.',
  },
  frontend_design_systems: {
    instructions: 'Is frontend or design engineering craft central to the role in the `posting`?',
    true: 'The role centres on UI architecture, a component library or design system, accessibility, or interaction detail in code.',
    false: 'The role is mainly backend, platform or design work, or the front end is one part of full-stack feature work.',
  },
  typescript_react: {
    instructions: "Does the `posting` name TypeScript or React as part of the role's own stack?",
    true: 'TypeScript or React is in the duties or requirements for this role.',
    false: "Neither is named, or only as a nice-to-have or as another team's stack.",
  },
  hands_on_product: {
    instructions: 'Is the role in the `posting` hands-on and also shaping what gets built?',
    true: 'The role builds, and also helps decide what to build with designers, product or founders.',
    false: 'The role builds what others have decided, or does not build at all.',
  },
  early_ownership: {
    instructions: 'Is the role in the `posting` a founding role, or the first of its kind at the employer?',
    true: 'The posting says founding engineer, first AI engineer, first designer, or one of the first hires.',
    false: 'The role joins an existing team doing that work, or the posting says nothing about being early.',
  },
  senior_hands_on: {
    instructions: 'Is the role in the `posting` senior or lead by scope, while still hands-on?',
    true: "The posting says senior, lead, staff or principal, or asks for five or more years' experience, and the role still builds.",
    false: 'The posting says junior or mid-level, states no level, or the senior role is mostly managing.',
  },
  ai_leans_platform: {
    instructions: 'Is the AI work in the `posting` platform work for other teams, rather than a product for users?',
    true: 'The role builds AI infrastructure, model serving, or an internal AI platform that other teams use.',
    false: 'The role builds AI features that end users use, or the posting has no AI work.',
  },
  frontend_without_ai: {
    instructions: 'Is the role in the `posting` frontend or design engineering with no AI work in it?',
    true: 'The role is frontend or design engineering, and the posting has no AI work for it, or says so.',
    false: 'The role includes AI work, or it is not frontend or design engineering.',
  },
  specialism_gap: {
    instructions: 'Does the `posting` require years of experience in machine learning, data science or Python data work?',
    true: 'The requirements ask for professional experience in machine learning, data science or Python data engineering.',
    false: 'Those are absent, optional, or a small part of a mixed stack.',
  },
  backend_leaning: {
    instructions: 'Is the main work of the role in the `posting` backend work: services, APIs, data pipelines or infrastructure?',
    true: 'Most duties are services, APIs, data pipelines, infrastructure, platform work or on-call.',
    false: 'Most duties are a user interface, a design system, an AI feature or product decisions, even with some backend work.',
  },
  ml_or_data_science: {
    instructions: 'Is the role in the `posting` mainly ML, MLOps or data science?',
    true: 'Most duties are training or deploying models, MLOps, research or data science.',
    false: 'Most duties are building the product, its interface or its features, even if models are used.',
  },
  customer_delivery: {
    instructions: "Is the role in the `posting` customer-facing delivery work for the employer's customers?",
    true: 'Forward deployed, solutions, integration or implementation engineering, developer relations, or SDK work for outside developers.',
    false: "The role builds the employer's own product for its users, even if it talks to customers to learn what they need.",
  },
  internal_tooling: {
    instructions: "Does the role in the `posting` build internal tools for the employer's own staff, rather than a product customers use?",
    true: "The users are the employer's own operations, support, sales or warehouse staff.",
    false: "The users are the employer's customers or the public.",
  },
  architecture_or_management: {
    instructions: 'Is the role in the `posting` centred on architecture or managing people, rather than hands-on building?',
    true: 'Most duties are system architecture, line management, hiring or delivery tracking.',
    false: 'The role is mainly hands-on building, even with some mentoring or technical decisions.',
  },
  agency_delivery: {
    instructions: 'Is the employer in the `posting` an agency, consultancy or outsourcing firm building projects for clients?',
    true: 'The employer describes itself as an agency, studio, consultancy or outsourcer, and the work is client projects.',
    false: 'The employer builds and sells its own product or service.',
  },
  ai_tools_only: {
    instructions: 'Is AI in the `posting` only about coding tools the team uses, rather than AI in the product?',
    true: 'The posting mentions AI only as tools such as coding assistants used while building.',
    false: 'The product or the role involves building AI features, or the posting does not mention AI.',
  },
  junior_level: {
    instructions: 'Does the `posting` mark the role as junior or mid-level?',
    true: "The title or text says junior, graduate, mid-level or intermediate, or asks for under three years' experience.",
    false: 'The posting says senior, lead, staff or principal, or gives no level.',
  },
  unrelated_role: {
    instructions: 'Is the role in the `posting` outside software, design and product work on web or AI products?',
    true: 'The role is sales, marketing, support, embedded firmware, hardware, native mobile apps, or DevOps.',
    false: 'The role is software engineering, design engineering, applied AI or product work on a web or AI product.',
  },
};
