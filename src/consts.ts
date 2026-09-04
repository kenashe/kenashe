export const SITE_URL = 'https://kenashe.ai';
export const SITE_TITLE = 'Ken Ashe | AI Application Builder';
export const SITE_DESCRIPTION = 'AI application builder shipping agents, automations, and AI-assisted websites in public.';
export const AUTHOR = 'Ken Ashe';

// 1200x630 social card. JPEG/PNG render across all OG + Twitter consumers;
// SVG does not (notably Facebook/LinkedIn), so the card ships as a raster.
export const DEFAULT_OG_IMAGE = '/og-default.png';

// Order is deliberate: the personal body of work leads; the autonomous digest is
// labeled as such and never sits first. "About" is the canonical bio page (/about/);
// Disclosure stays linked from the footer under Legal.
export const NAV: { label: string; href: string }[] = [
  { label: 'Building', href: '/building/' },
  { label: 'Topics', href: '/topics/' },
  { label: 'Writing', href: '/writing/' },
  { label: 'Digest', href: '/blog/' },
  { label: 'About', href: '/about/' },
];

export const SOCIAL: { label: string; href: string }[] = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/kenashe' },
  { label: 'X', href: 'https://x.com/kenashe' },
  { label: 'GitHub', href: 'https://github.com/kenashe' },
  { label: 'Email', href: 'mailto:hello@kenashe.ai' },
];
