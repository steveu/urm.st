// CV content. Contact details stay limited to what's already public in the footer.

export type Role = {
  title: string;
  start: string;
  end?: string;
  highlights: string[];
};

export type Job = {
  company: string;
  href?: string;
  roles: Role[];
};

export const work: Job[] = [
  {
    company: 'Hublsoft',
    href: 'https://hublsoft.com/',
    roles: [
      {
        title: 'Senior Frontend Engineer',
        start: '2021-03',
        highlights: [
          'Senior member of the engineering team building a decision intelligence platform.',
          'Key contributor to an Innovate UK-funded project, integrating AI capabilities into the product.',
        ],
      },
    ],
  },
  {
    company: 'Pierbridge',
    href: 'https://pierbridge.com/',
    roles: [
      {
        title: 'UX/Frontend Developer',
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
    href: 'https://effectiveexperiments.com/',
    roles: [
      {
        title: 'Senior Frontend Engineer',
        start: '2019-02',
        end: '2019-08',
        highlights: [
          'Worked in a product team rebuilding a legacy application in React and GraphQL.',
          'Built a React component library to exacting design standards using Storybook.',
        ],
      },
    ],
  },
  {
    company: 'Bytemark',
    href: 'https://www.bytemark.co.uk',
    roles: [
      {
        title: 'Lead Frontend Developer',
        start: '2017-11',
        end: '2019-02',
        highlights: [
          'Senior member of an Agile (Scrum) engineering team.',
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
        highlights: ['Introduced a UX and design focus to an engineering-led environment, shaping early product experiences.'],
      },
    ],
  },
  {
    company: 'Independent',
    roles: [
      {
        title: 'UI Designer',
        start: '2012-10',
        end: '2014-01',
        highlights: ['Design and frontend development across a range of client projects.'],
      },
    ],
  },
  {
    company: 'Designition',
    href: 'https://designition.co.uk',
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
    href: 'https://web.archive.org/web/20050204022131/http://clearbar.com:80/index.php',
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
    award: 'ILM Level 5, Leadership and Management',
    institution: 'University of York',
    start: '2017',
  },
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
