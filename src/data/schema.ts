// Canonical schema.org nodes shared across KenAshe.ai pages.
//
// `personKenAshe` is the load-bearing entity for cross-domain triangulation
// (KenAshe.ai <-> Lucky Domains). It MUST stay byte-identical everywhere it
// appears - on KenAshe.ai (homepage, about, news/site-launch) and, as an
// identical copy, on Lucky Domains. Define it once here and import it; never
// inline a second, hand-written copy that could drift.
//
// Source of truth: entity-schema-linking-spec-final.md
// ("Shared node - Ken Ashe Person"), revised 2026-09-04 for the "AI application
// builder" identity (jobTitle, description, mainEntityOfPage -> /about/, credentials,
// contact, sameAs incl. PMI; Substack dropped). Any change here must be mirrored in
// the Lucky Domains repo's index.html in the same pass (DECISIONS.md D9).

export const personKenAshe = {
  '@type': 'Person',
  '@id': 'https://kenashe.ai/#ken-ashe',
  name: 'Ken Ashe',
  url: 'https://kenashe.ai/',
  mainEntityOfPage: 'https://kenashe.ai/about/',
  image: 'https://kenashe.ai/images/ken-ashe.jpeg',
  jobTitle: 'AI application builder',
  description: 'AI application builder, CPA, and PMP who builds with AI in public.',
  email: 'hello@kenashe.ai',
  address: {
    '@type': 'PostalAddress',
    addressRegion: 'NJ',
    addressCountry: 'US',
  },
  hasCredential: [
    {
      '@type': 'EducationalOccupationalCredential',
      name: 'Certified Public Accountant (CPA)',
      credentialCategory: 'certification',
    },
    {
      '@type': 'EducationalOccupationalCredential',
      name: 'Project Management Professional (PMP)',
      credentialCategory: 'certification',
      recognizedBy: { '@type': 'Organization', name: 'Project Management Institute' },
    },
  ],
  sameAs: [
    'https://github.com/kenashe',
    'https://www.linkedin.com/in/kenashe',
    'https://x.com/kenashe',
    'https://community.pmi.org/profile/kenashe',
  ],
  affiliation: {
    '@type': 'Organization',
    '@id': 'https://luckydomains.io/#organization',
    name: 'Lucky Domains',
    url: 'https://luckydomains.io/',
  },
  knowsAbout: [
    'AI workflows',
    'AI agents',
    'Marketing automation',
    'SEO',
    'AI-assisted development',
    'Domain acquisition',
  ],
};

// `websiteKenAshe` is the canonical WebSite node. Same rule as the Person above:
// define it once here and import it; never inline a second, hand-written copy.
// Every page that REFERENCES https://kenashe.ai/#website (blog posts, topic hubs,
// the homepage) should also emit this node, so a consumer reading ONE page in
// isolation - which is how most LLM scrapers read the site - resolves the entity
// instead of a dangling @id. Key order matches the homepage's previous inline copy
// so the rendered output is unchanged.
export const websiteKenAshe = {
  '@type': 'WebSite',
  '@id': 'https://kenashe.ai/#website',
  name: 'KenAshe.ai',
  url: 'https://kenashe.ai/',
  sameAs: ['https://www.linkedin.com/company/kenashe-ai'],
  description: 'Personal publication and public AI build log from Ken Ashe.',
  creator: { '@id': 'https://kenashe.ai/#ken-ashe' },
  publisher: { '@id': 'https://kenashe.ai/#ken-ashe' },
  mainEntity: { '@id': 'https://kenashe.ai/#ken-ashe' },
  inLanguage: 'en-US',
};
