export const SITE_URL = 'https://kenashe.ai';
export const SITE_TITLE = 'Ken Ashe | AI Optimist';
export const SITE_DESCRIPTION = 'Digital marketer. Building with AI.';
export const AUTHOR = 'Ken Ashe';
export const NEWSLETTER_URL = 'https://newsletter.kenashe.ai';

// Platform-stable Substack RSS URL - works regardless of custom domain config.
export const SUBSTACK_RSS_URL = 'https://newsletter.kenashe.ai/feed';

// 1200x630 social card. JPEG/PNG render across all OG + Twitter consumers;
// SVG does not (notably Facebook/LinkedIn), so the card ships as a raster.
export const DEFAULT_OG_IMAGE = '/og-default.png';

export const NAV: { label: string; href: string }[] = [
  { label: 'Projects', href: '/projects/' },
  { label: 'Blog', href: '/blog/' },
  { label: 'Newsroom', href: '/newsroom/' },
  { label: 'About', href: '/about/' },
];

export const SOCIAL: { label: string; href: string }[] = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/kenashe' },
  { label: 'X', href: 'https://x.com/kenashe' },
  { label: 'GitHub', href: 'https://github.com/kenashe' },
  { label: 'Email', href: 'mailto:hello@kenashe.ai' },
];
