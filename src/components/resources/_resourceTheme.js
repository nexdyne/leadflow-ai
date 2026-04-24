// Shared theme tokens for the /resources surface. These mirror the
// landing-page COLORS export so pages stay visually locked to the home
// page — change them in one place when the brand updates.
// C70: USWDS-adjacent federal palette. See LandingPage.jsx COLORS for
// the full rationale. Legacy `orange*` keys aliased to amber so any
// stray reference in a resource page renders muted rather than loud.
export const COLORS = {
  navy: '#0a1628',
  navyLight: '#162440',
  navyMid: '#0f1d35',
  federalNavy: '#0B2D68',
  paleBlue: '#E8EEFA',
  blue: '#2E7BE8',
  blueHover: '#1E63C4',
  blueDeep: '#164F9C',
  blueGlow: '#5B9DF0',
  blueLight: '#EEF4FE',
  amber: '#F5A623',
  amberDeep: '#D78A0E',
  amberHover: '#B87608',
  amberLight: '#FEF4DF',
  amberGlow: '#FFC15E',
  orange: '#F5A623',
  orangeDeep: '#D78A0E',
  orangeHover: '#B87608',
  orangeLight: '#FEF4DF',
  orangeGlow: '#FFC15E',
  white: '#ffffff',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',
  teal: '#0d9488',
  red: '#dc2626',
  green: '#0FA040',
};

// Type tag color mapping — matches LandingPage.jsx ResourceCard.
export const TYPE_COLORS = {
  REGULATION: COLORS.red,
  GUIDE: COLORS.blue,
  NEWS: COLORS.green,
  TUTORIAL: COLORS.orange,
};

// Single source of truth for the resources catalog. The landing-page
// card grid, the /resources index page, and the individual page headers
// all read from this list so a new resource appears everywhere the
// moment it lands in here.
export const RESOURCES = [
  {
    slug: 'michigan-lira-2026',
    type: 'REGULATION',
    title: 'Michigan LIRA Compliance Guide 2026',
    desc: 'Complete guide to Michigan Lead Inspection and Risk Assessment requirements under current EGLE regulations.',
    readingTimeMin: 14,
    lastReviewed: 'April 2026',
  },
  {
    slug: 'xrf-testing',
    type: 'GUIDE',
    title: 'XRF Testing Best Practices',
    desc: 'Industry-standard procedures for XRF lead testing, calibration checks, and result interpretation for inspectors.',
    readingTimeMin: 12,
    lastReviewed: 'April 2026',
  },
  {
    slug: 'epa-rrp-updates',
    type: 'NEWS',
    title: 'EPA Lead Paint RRP Rule Updates',
    desc: "Latest updates to EPA's Renovation, Repair, and Painting (RRP) rule affecting Michigan properties built before 1978.",
    readingTimeMin: 10,
    lastReviewed: 'April 2026',
  },
  {
    slug: 'getting-started',
    type: 'TUTORIAL',
    title: 'Getting Started with LeadFlow AI',
    desc: 'Step-by-step walkthrough of setting up your inspection team, creating projects, and generating your first report.',
    readingTimeMin: 9,
    lastReviewed: 'April 2026',
  },
];

export const RESOURCE_BY_SLUG = Object.fromEntries(RESOURCES.map(r => [r.slug, r]));
