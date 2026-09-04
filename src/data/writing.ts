// Metadata for the human-directed essays under /writing/. The index page renders this
// list, and each essay page reads its own entry, so title/date/authorship live in one place.
//
// `authorship` is the on-page label for how a piece was produced. It is optional: essays
// without one fall back to DEFAULT_AUTHORSHIP. Set it per essay; never special-case a slug
// in a template.
export const DEFAULT_AUTHORSHIP = 'Written by hand';

export interface Essay {
  slug: string;
  title: string;
  date: string; // as displayed on the index
  dek: string;
  authorship?: string;
}

export const essays: Essay[] = [
  {
    slug: 'ai-agents-reasoning-from-events-that-never-happened',
    title: 'AI agents can sound strategic while reasoning from events that never happened',
    date: 'September 2026',
    dek: 'What happened when AI agents were required to explain social decisions without enough grounded evidence, and why the useful fix was an environment that could contradict them.',
    authorship: 'Human-directed, AI-assisted',
  },
  {
    slug: 'the-digest-is-the-system',
    title: 'The digest is the system. Building is the work.',
    date: 'August 2026',
    dek: 'Why the autonomous blog stops being the public face of this site, and what stands behind it instead.',
  },
];

export const hrefFor = (e: Essay): string => `/writing/${e.slug}/`;

export function essayBySlug(slug: string): Essay {
  const e = essays.find((x) => x.slug === slug);
  if (!e) throw new Error(`No essay metadata for slug "${slug}" in src/data/writing.ts`);
  return e;
}

export const authorshipOf = (e: Essay): string => e.authorship ?? DEFAULT_AUTHORSHIP;
