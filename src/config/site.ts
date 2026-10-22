import type { Role } from '@/types';

/** Change brand, contact and business terms here before configuring a production backend. */
export const site = {
  name: 'Desloop Academy',
  shortName: 'Desloop',
  tagline: 'Learn it. Build it. Make it yours.',
  description: 'Practical learning, thoughtful AI guidance, and people in your corner.',
  locale: 'en-GH',
  currency: 'GHS',
  contactEmail: null as string | null, // Owner must provide and configure delivery.
  logoPath: '/brand/brandmark-dark.webp',
  brandAssets: {
    wordmarkDark: '/brand/wordmark-dark.webp',
    wordmarkLight: '/brand/wordmark-light.webp',
    wordmarkMono: '/brand/wordmark-mono.webp',
    appIcon: '/brand/app-icon.webp',
    favicon: '/favicon.png',
  },
  mode: 'demo' as const, // No environment flag can turn the mock services into production services.
  legal: { operator: 'To be confirmed', privacyReviewed: false, childSafetyReviewed: false },
} as const;

export const roleDetails: Record<Role, { label: string; home: string; description: string }> = {
  learner: {
    label: 'Learner',
    home: '/app',
    description: 'Courses, projects, and learning progress',
  },
  parent: { label: 'Parent / guardian', home: '/parent', description: 'Support a linked learner' },
  teacher_partner: {
    label: 'Teacher partner',
    home: '/partner',
    description: 'Invitations, learner support, and earnings',
  },
  classroom_teacher: {
    label: 'Classroom teacher',
    home: '/classroom',
    description: 'Classes and assignment review',
  },
  facilitator: {
    label: 'Facilitator',
    home: '/facilitator',
    description: 'Course creation and teaching',
  },
  school_admin: {
    label: 'School administrator',
    home: '/school',
    description: 'Institutional learning management',
  },
  platform_admin: {
    label: 'Platform administrator',
    home: '/admin',
    description: 'Platform operations and review',
  },
  support: {
    label: 'Support staff',
    home: '/admin/operations',
    description: 'Support workspace preview',
  },
  moderator: {
    label: 'Community moderator',
    home: '/admin/moderation',
    description: 'Community review preview',
  },
};

export const primaryRoles: Role[] = [
  'learner',
  'teacher_partner',
  'school_admin',
  'parent',
  'facilitator',
  'classroom_teacher',
  'platform_admin',
];

export const categories = [
  'All subjects',
  'Digital literacy',
  'Coding',
  'Artificial intelligence',
  'Design',
  'Cybersecurity',
  'Business & data',
];

/** No live prices, entitlements, or teacher commission terms have been approved. */
export const commercial = {
  currency: 'GHS',
  commissionRate: null as number | null,
  plans: [
    {
      id: 'individual',
      name: 'Individual',
      audience: 'For independent learners',
      features: ['Personal learning space', 'Required pathway and projects', 'Portfolio tools'],
      cta: 'Request plan details',
    },
    {
      id: 'family',
      name: 'Family',
      audience: 'For families learning together',
      features: ['Learner profiles', 'Guardian overview', 'Flexible learning journeys'],
      cta: 'Ask about family plans',
    },
    {
      id: 'school',
      name: 'School',
      audience: 'For schools and institutions',
      features: ['Classes and assignments', 'Progress reporting', 'Onboarding support'],
      cta: 'Talk to us about schools',
    },
  ],
  billingPeriods: ['monthly', 'annual'] as const,
};

export const publicNav = [
  { label: 'Explore', href: '/explore' },
  { label: 'Courses', href: '/courses' },
  { label: 'Sample workshops', href: '/sample-courses' },
  { label: 'For teachers', href: '/teachers' },
  { label: 'For schools', href: '/schools' },
  { label: 'Pricing', href: '/pricing' },
];

export const publicFooter = [
  {
    title: 'Learn',
    links: [
      ['Explore learning', '/explore'],
      ['Courses', '/courses'],
      ['Sample workshops', '/sample-courses'],
      ['Children', '/learn/children'],
      ['Teenagers', '/learn/teens'],
      ['Adults', '/learn/adults'],
      ['Career skills', '/learn/careers'],
    ],
  },
  {
    title: 'Get involved',
    links: [
      ['Parents & guardians', '/parents'],
      ['Teacher partners', '/teachers'],
      ['Schools', '/schools'],
      ['Facilitators', '/facilitators'],
      ['Project gallery', '/projects'],
    ],
  },
  {
    title: 'Help & company',
    links: [
      ['About', '/about'],
      ['Contact', '/contact'],
      ['Support', '/support'],
      ['FAQ', '/faq'],
      ['Child safety', '/child-safety'],
    ],
  },
  {
    title: 'Policies',
    links: [
      ['Privacy', '/privacy'],
      ['Terms of service', '/terms'],
      ['Community guidelines', '/community-guidelines'],
    ],
  },
] as const;
