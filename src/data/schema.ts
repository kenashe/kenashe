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
  alternateName: 'Kenneth Ashe',
  url: 'https://kenashe.ai/',
  mainEntityOfPage: 'https://kenashe.ai/about/',
  image: 'https://kenashe.ai/images/ken-ashe.jpeg',
  jobTitle: 'AI application builder',
  description:
    'Ken Ashe is a CPA and PMP who builds and evaluates AI agent systems in public, publishing what shipped, what broke, and what the evidence supports.',
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
      credentialCategory: 'license',
      recognizedBy: { '@type': 'Organization', name: 'State of New Jersey' },
    },
    {
      '@type': 'EducationalOccupationalCredential',
      name: 'Chartered Global Management Accountant (CGMA)',
      credentialCategory: 'designation',
      recognizedBy: { '@type': 'Organization', name: 'AICPA' },
    },
    {
      '@type': 'EducationalOccupationalCredential',
      name: 'Project Management Professional (PMP)',
      credentialCategory: 'certification',
      recognizedBy: { '@type': 'Organization', name: 'Project Management Institute' },
    },
    {
      '@type': 'EducationalOccupationalCredential',
      name: 'PMI Agile Certified Practitioner (PMI-ACP)',
      credentialCategory: 'certification',
      recognizedBy: { '@type': 'Organization', name: 'Project Management Institute' },
    },
    {
      '@type': 'EducationalOccupationalCredential',
      name: 'Certified Scrum Product Owner (CSPO)',
      credentialCategory: 'certificate',
      recognizedBy: { '@type': 'Organization', name: 'Scrum Alliance' },
    },
    {
      '@type': 'EducationalOccupationalCredential',
      name: 'SAFe POPM',
      credentialCategory: 'certificate',
      recognizedBy: { '@type': 'Organization', name: 'Scaled Agile' },
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
