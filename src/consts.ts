export const SITE_URL = 'https://kenashe.ai';
export const SITE_TITLE = 'Ken Ashe | AI Application Builder';
export const SITE_DESCRIPTION = 'AI application builder shipping agents, automations, and AI-assisted websites in public.';
export const AUTHOR = 'Ken Ashe';

// 1200x630 social card. JPEG/PNG render across all OG + Twitter consumers;
// SVG does not (notably Facebook/LinkedIn), so the card ships as a raster.
export const DEFAULT_OG_IMAGE = '/og-default.png';

// Order is deliberate: what Ken builds, what he writes, who he is, external coverage and
// media info, then the autonomous digest last and labeled as such. Topics stay live at
// /topics/ but are reached from the Digest and the footer, not the primary nav.
export const NAV: { label: string; href: string }[] = [
  { label: 'Building', href: '/building/' },
  { label: 'Writing', href: '/writing/' },
  { label: 'About', href: '/about/' },
  { label: 'Newsroom', href: '/newsroom/' },
  { label: 'Digest', href: '/blog/' },
];

export const SOCIAL: { label: string; href: string }[] = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/kenashe' },
  { label: 'X', href: 'https://x.com/kenashe' },
  { label: 'GitHub', href: 'https://github.com/kenashe' },
  { label: 'Email', href: 'mailto:hello@kenashe.ai' },
];
