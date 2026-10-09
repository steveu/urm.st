// CV content. Contact details stay limited to what's already public in the footer.

export type Role = {
  title: string;
  start: string;
  end?: string;
  // [text](url) marks a quiet link to the work itself
  highlights: string[];
};

export type Job = {
  // Left out for freelance work, where the title already says it
  company?: string;
  roles: Role[];
};

export const work: Job[] = [
  {
    company: 'Hublsoft',
    roles: [
      {
        title: 'Senior Frontend Engineer',
        start: '2021-03',
        highlights: [
          'AI-directed data exploration and storytelling in an enterprise data product: first as workflows for business users, now as a multi-agent harness.',
          'Work across the experience, the prompts, tools and context, and the evals that prove they work.',
          'Before that, design and frontend for an Innovate UK-funded programme on advanced AI capabilities.',
        ],
      },
    ],
  },
  {
    company: 'Pierbridge',
    roles: [
      {
        title: 'UX Developer',
        start: '2019-09',
        end: '2021-03',
        highlights: [
          'Led the frontend re-architecture of a parcel TMS product using React and TypeScript.',
          'Delivered UX and concept design for a data mapping tool to streamline workflows.',
        ],
      },
    ],
  },
  {
    company: 'Effective Experiments',
    roles: [
      {
        title: 'Senior Frontend Engineer',
        start: '2019-02',
        end: '2019-08',
        highlights: [
          'Worked in a product team rebuilding a legacy application in React and GraphQL.',
          'Built a React component library in Storybook.',
        ],
      },
    ],
  },
  {
    company: 'Bytemark',
    roles: [
      {
        title: 'Lead Frontend Developer',
        start: '2017-11',
        end: '2019-02',
        highlights: [
          'Led UI design and frontend development of the company’s core applications.',
        ],
      },
      {
        title: 'Product Manager',
        start: '2016-06',
        end: '2017-11',
        highlights: [
          'Drove customer-led product strategy, marketing and vision.',
          'Led a cross-functional team; increased revenue per customer by 35% and the customer base by 15%.',
        ],
      },
      {
        title: 'UX Developer',
        start: '2014-01',
        end: '2016-06',
        highlights: [
          'Designed and built the first visual interfaces for customers, who until then had only the command line.',
          'The cloud server [control panel](https://panel.bytemark.co.uk/) became the customer portal, still in use more than ten years on.',
        ],
      },
    ],
  },
  {
    roles: [
      {
        title: 'Freelance Designer and Developer',
        start: '2012-10',
        end: '2014-01',
        highlights: ['Worked on Wren Kitchens’ visual kitchen planning app, on contract.'],
      },
    ],
  },
  {
    company: 'Designition',
    roles: [
      {
        title: 'Senior Designer',
        start: '2005-06',
        end: '2012-09',
        highlights: [
          'Led visual design, client relationships and full-stack development (PHP) for a web agency.',
          'Won two major industry awards for websites designed and developed in-house.',
        ],
      },
    ],
  },
  {
    company: 'Clearbar',
    roles: [
      {
        title: 'Founder',
        start: '2003-10',
        end: '2005-12',
        highlights: ['Founded and ran a web design and development business.'],
      },
    ],
  },
];

export const education = [
  {
    award: 'MSc Human-Centred Interactive Technologies',
    institution: 'University of York',
    start: '2008',
    end: '2009',
    highlights: ['Distinction, with an average mark above 90%.', 'Fully funded ESRC scholarship.'],
  },
  {
    award: 'MA (Hons) Political Science, 2:1',
    institution: 'University of Glasgow',
    start: '1999',
    end: '2003',
  },
];

// Personal projects, linked to their section on /work once it exists
export type Project = { name: string; icon: string; href?: string; summary: string; tech?: string };

export const projects: Project[] = [
  {
    name: 'Eddy',
    icon: '/icons/eddy.png',
    href: '/work#eddy',
    summary:
      'A family video app. A model running at home checks every video a kid shares against their age, and the feed ends. In daily family use since April.',
    tech: 'Gemma 4 · Ollama · Node · SQLite · iOS',
  },
  {
    name: 'One Thought',
    icon: '/icons/one-thought.png',
    summary: 'A golf app that counts one thought with a button in your pocket.',
  },
];

// One plain line, grouped; only what holds up in an interview
export const skills = [
  'TypeScript, React, GraphQL, Node, SQLite',
  'LLM workflows, multi-agent harnesses, tools, context engineering, evals',
  'Local models (Ollama)',
  'Built with Claude Code, Codex and Pi',
];
