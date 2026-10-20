// /connect — the conference "digital business card". THIS IS THE ONLY FILE TO EDIT before an
// event. The page (src/pages/connect/index.astro) and the contact card
// (src/pages/connect/ken-ashe.vcf.ts) read everything from here, so changing text, buttons,
// order, visibility, icons or the emphasized button never touches a component, and the URL
// (https://kenashe.ai/connect) never changes. How-to: docs/connect.md.

/** Icons available to buttons and links (drawn in src/components/ConnectIcon.astro). */
export type ConnectIcon =
  | 'x'
  | 'linkedin'
  | 'github'
  | 'youtube'
  | 'tiktok'
  | 'building'
  | 'contact'
  | 'globe'
  | 'mail'
  | 'calendar'
  | 'link';

export interface ConnectButton {
  /** Short stable name. Used for the emphasized button and as the analytics label. */
  id: string;
  label: string;
  /** Full URL, a site path such as /building/, or CONTACT_CARD for the vCard download. */
  href: string;
  icon: ConnectIcon;
  /** false hides the button without deleting it. */
  show: boolean;
}

/** Path of the generated contact card. Use as a button href to make it a "save contact" button. */
export const CONTACT_CARD = '/connect/ken-ashe.vcf';

export const connect = {
  name: 'Ken Ashe',
  subtitle: 'AI Builder | Entrepreneur | CPA & PMP',
  intro: 'I build things, test new technology, and show what actually happens.',

  /** Optional event line shown above the name, e.g. 'Great meeting you at NFT.NYC'. Empty = hidden. */
  greeting: '',

  /** id of the button drawn with the accent color. Must match a visible button's id. */
  emphasized: 'x',

  /** Primary buttons, top to bottom in this order. */
  buttons: [
    { id: 'x', label: 'Follow on X', href: 'https://x.com/kenashe', icon: 'x', show: true },
    { id: 'linkedin', label: 'Connect on LinkedIn', href: 'https://www.linkedin.com/in/kenashe', icon: 'linkedin', show: true },
    { id: 'building', label: 'See What I’m Building', href: '/building/', icon: 'building', show: true },
    { id: 'contact', label: 'Save My Contact', href: CONTACT_CARD, icon: 'contact', show: true },
    // Spares, hidden until needed. Flip show to true and move them into position.
    { id: 'youtube', label: 'Watch on YouTube', href: 'https://www.youtube.com/@KenAshe', icon: 'youtube', show: false },
    { id: 'tiktok', label: 'Follow on TikTok', href: 'https://www.tiktok.com/@ken.ashe', icon: 'tiktok', show: false },
    { id: 'email', label: 'Email Me', href: 'mailto:hello@kenashe.ai', icon: 'mail', show: false },
  ] satisfies ConnectButton[],

  /** Small text links under the buttons. Same fields as buttons. */
  links: [
    { id: 'site', label: 'kenashe.ai', href: '/', icon: 'globe', show: true },
    { id: 'github', label: 'GitHub', href: 'https://github.com/kenashe', icon: 'github', show: true },
    { id: 'youtube-link', label: 'YouTube', href: 'https://www.youtube.com/@KenAshe', icon: 'youtube', show: true },
  ] satisfies ConnectButton[],

  /** What goes into the downloadable contact card. Public business details only. */
  contact: {
    firstName: 'Ken',
    lastName: 'Ashe',
    title: 'AI Builder, Entrepreneur, CPA & PMP',
    organization: 'Lucky Domains',
    email: 'hello@kenashe.ai',
    website: 'https://kenashe.ai/',
    region: 'NJ',
    country: 'USA',
    note: 'Met at a conference? I build things, test new technology, and show what actually happens at kenashe.ai.',
    profiles: [
      { label: 'X', url: 'https://x.com/kenashe' },
      { label: 'LinkedIn', url: 'https://www.linkedin.com/in/kenashe' },
      { label: 'GitHub', url: 'https://github.com/kenashe' },
      { label: 'YouTube', url: 'https://www.youtube.com/@KenAshe' },
    ],
  },
};
