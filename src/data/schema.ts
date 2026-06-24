// Canonical schema.org nodes shared across KenAshe.ai pages.
//
// `personKenAshe` is the load-bearing entity for cross-domain triangulation
// (KenAshe.ai <-> Lucky Domains). It MUST stay byte-identical everywhere it
// appears — on KenAshe.ai (homepage, about, news/site-launch) and, as an
// identical copy, on Lucky Domains. Define it once here and import it; never
// inline a second, hand-written copy that could drift.
//
// Source of truth: entity-schema-linking-spec-final.md
// ("Shared node — Ken Ashe Person"). Do not reorder keys, add/remove fields,
// or edit values.

export const personKenAshe = {
  '@type': 'Person',
  '@id': 'https://kenashe.ai/#ken-ashe',
  name: 'Ken Ashe',
  url: 'https://kenashe.ai/',
  image: 'https://kenashe.ai/images/ken-ashe.jpg',
  jobTitle: ['Digital Marketer', 'AI Operator', 'Founder'],
  description: 'Digital marketer, CPA, PMP, and AI operator building with AI in public.',
  sameAs: [
    'https://www.linkedin.com/in/kenashe/',
    'https://substack.com/@kenashe',
    'https://x.com/kenashe',
    'https://github.com/kenashe',
  ],
  affiliation: { '@id': 'https://luckydomains.io/#organization' },
  knowsAbout: [
    'AI workflows',
    'AI agents',
    'Marketing automation',
    'SEO',
    'AI-assisted development',
    'Domain acquisition',
  ],
};
