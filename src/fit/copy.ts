// Everything the fit check can say, written for the site. The model only ever picks from
// these keys; it never writes words that reach the page. The band renders a verdict, two or
// three reasons and a location from this copy, each beside a quote checked against the
// visitor's own paste. Everything is said about the profile, not about me.

export const VERDICTS = ['strong', 'possible', 'poor'] as const;
export type Verdict = (typeof VERDICTS)[number];

export const VERDICT_COPY: Record<Verdict, { label: string; line: string }> = {
  strong: { label: 'Strong match', line: 'The role and the profile line up closely.' },
  possible: { label: 'Partial match', line: 'Some of the role lines up with the profile.' },
  poor: { label: 'Poor match', line: 'The role and the profile point different ways.' },
};

// `side` says which way a reason pulls: towards the profile, away from it, or a bit of both
export type Side = 'for' | 'against' | 'mixed';

export const REASONS = {
  ai_product_end_to_end: { side: 'for', copy: 'Builds AI features people use, end to end: interface, prompts, tools and evals.' },
  owns_agent: { side: 'for', copy: 'Owns an AI agent or assistant, from its prompts and tools to the evals that show it works.' },
  evals_in_scope: { side: 'for', copy: 'Measuring whether the AI works is part of the job, not someone else’s.' },
  frontend_design_systems: { side: 'for', copy: 'Senior frontend or design engineering: design systems, UI architecture, interaction quality.' },
  typescript_react: { side: 'for', copy: 'TypeScript and React, my main stack.' },
  hands_on_product: { side: 'for', copy: 'A hands-on product role, shaping what gets built with design and engineering.' },
  early_ownership: { side: 'for', copy: 'Founding engineer or first AI engineer: hands-on, with a say in the product.' },
  senior_hands_on: { side: 'for', copy: 'Senior or lead by scope, and still hands-on.' },
  ai_leans_platform: { side: 'mixed', copy: 'User-facing AI work, but leaning towards platform rather than product.' },
  frontend_without_ai: { side: 'mixed', copy: 'Good frontend or design engineering work, with no AI in it.' },
  specialism_gap: { side: 'mixed', copy: 'Asks for years in a specialism I haven’t held as a job, such as ML or Python data work.' },
  backend_leaning: { side: 'against', copy: 'Mainly backend: services, APIs, data pipelines or infrastructure.' },
  ml_or_data_science: { side: 'against', copy: 'ML, MLOps or data science, rather than building the product.' },
  customer_delivery: { side: 'against', copy: 'Customer-facing delivery: solutions, integration, forward-deployed or SDK work.' },
  internal_tooling: { side: 'against', copy: 'Internal tooling for operations or sales, without owning an AI agent.' },
  architecture_or_management: { side: 'against', copy: 'Centred on architecture or managing people, rather than hands-on product work.' },
  agency_delivery: { side: 'against', copy: 'Agency, consultancy or outsourced delivery.' },
  ai_tools_only: { side: 'against', copy: 'Uses AI coding tools, rather than building AI products.' },
  junior_level: { side: 'against', copy: 'A junior or mid-level role.' },
  unrelated_role: { side: 'against', copy: 'A different kind of role, or an engineering discipline I don’t work in.' },
} as const satisfies Record<string, { side: Side; copy: string }>;

export type ReasonCode = keyof typeof REASONS;
export const REASON_CODES = Object.keys(REASONS) as ReasonCode[];

export const LOCATIONS = ['works', 'case_by_case', 'doesnt_work', 'unclear'] as const;
export type LocationVerdict = (typeof LOCATIONS)[number];

// Judged against the profile's location preferences (profile.md), which the model is given
export const LOCATION_COPY: Record<LocationVerdict, string> = {
  works: 'Location matches the profile.',
  case_by_case: 'Location: case by case.',
  doesnt_work: 'Location is outside the profile’s preferences.',
  unclear: 'The posting doesn’t say where the work is done.',
};

export const INJECTION_COPY = 'Instructions aimed at AI tools rather than people. The check ignored them.';

export const UNASSESSABLE_COPY = 'Couldn’t assess this one: the answer didn’t check out against the posting, so it isn’t shown.';
