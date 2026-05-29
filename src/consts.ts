export const SITE_URL = 'https://kenashe.ai';
export const SITE_TITLE = 'Ken Ashe | AI Optimist';
export const SITE_DESCRIPTION = 'Digital marketer. Building with AI.';
export const AUTHOR = 'Ken Ashe';
export const NEWSLETTER_URL = 'https://newsletter.kenashe.ai';

// Platform-stable Substack RSS URL — works regardless of custom domain config.
export const SUBSTACK_RSS_URL = 'https://newsletter.kenashe.ai/feed';

// TODO: replace with a 1200x630 PNG before launch — SVG OG images are not
// supported on every platform (notably Facebook). Drop the file in /public
// and update this path.
export const DEFAULT_OG_IMAGE = '/og-default.svg';

export const NAV: { label: string; href: string }[] = [
  { label: 'The Lab', href: '/blog/' },
  { label: 'Newsletter', href: 'https://newsletter.kenashe.ai' },
  { label: 'About', href: '/about/' },
  { label: 'Contact', href: '/contact/' },
];

export const SOCIAL: { label: string; href: string }[] = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/kenashe' },
  { label: 'X', href: 'https://x.com/kenashe' },
  { label: 'GitHub', href: 'https://github.com/kenashe' },
  { label: 'Email', href: 'mailto:hello@kenashe.ai' },
];
