// Stand-ins for the real-role mock-ups. Throwaway: not for merging. The company and posting are
// invented; they're set out the way a board's listing comes back (title, the board's own
// location fields, then the description), so the sheet shows the board and the posting
// disagreeing about where the work is done.
import type { FitAssessment } from '../../../../fit/schema';

export const ROLE = {
  title: 'Product Engineer, AI',
  company: 'Halden',
  board: 'Ashby',
  text: `Product Engineer, AI
Location: Remote - UK
Workplace: Remote

Halden builds scheduling software for community health teams. Around 400 clinics use it to plan home visits.

The role
We're hiring a product engineer for the team building our visit assistant, which drafts each day's route and explains its choices to the nurse.
You'll ship features across the stack, from the React front end to the prompts and tools the assistant calls.
You'll work closely with our designer and two clinicians on what we build next.

What we're looking for
- 5+ years building web products in TypeScript and React.
- Experience shipping LLM features to real users.
- Comfortable with Python for data work; we're a mixed TypeScript and Python shop.

How we work
We're remote-first within the UK, and the team meets in our London office on Tuesdays and Thursdays.

Benefits
- 30 days' holiday plus bank holidays
- Private health insurance
- A learning budget of £1,500 a year`,
};

export const ROLE_RESULT: FitAssessment = {
  verdict: 'possible',
  reasons: [
    { code: 'ai_product_end_to_end', quote: "You'll ship features across the stack, from the React front end to the prompts and tools the assistant calls." },
    { code: 'typescript_react', quote: '5+ years building web products in TypeScript and React.' },
    { code: 'specialism_gap', quote: "Comfortable with Python for data work; we're a mixed TypeScript and Python shop." },
  ],
  location: { verdict: 'case_by_case', quote: 'the team meets in our London office on Tuesdays and Thursdays' },
  injection: { present: false, quote: null },
} as FitAssessment;

/** Placeholder figures: the real ones would come from the boards when the role is picked. */
export const POOL = { boards: 27, roles: 214 };

/** Kinds of role a visitor can ask for; each maps to a title filter on the server. */
export const KINDS = ['Product engineer', 'AI engineer', 'Frontend', 'Design engineer', 'Any'] as const;

/** For the live-list direction: roles as the boards list them, locations left as written. */
export const LIST = [
  { title: 'Product Engineer, AI', company: 'Halden', where: 'Remote - UK', board: 'Ashby', age: '2 days' },
  { title: 'Senior Frontend Engineer', company: 'Cobalt Ledger', where: 'London (Hybrid)', board: 'Greenhouse', age: '6 days' },
  { title: 'Design Engineer', company: 'Fieldnote', where: 'Remote, Europe', board: 'Ashby', age: '1 day' },
  { title: 'Applied AI Engineer', company: 'Northgate Health', where: 'Leeds or Remote', board: 'Lever', age: '3 days' },
  { title: 'Founding Engineer', company: 'Tessel', where: 'Remote', board: 'Ashby', age: 'today' },
];
