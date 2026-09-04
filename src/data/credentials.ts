// Ken's credentials, in tiers. Single source for the homepage (CPA + PMP only) and the
// full list on /about/. All six are active. Names and issuers are exact; "SAFe POPM" carries
// no version number on purpose. Never attach verification or "Verify" links to these: the
// New Jersey license lookup has no stable public URL and no other source attests to
// current status, so a link labeled as verification would not verify anything.
export interface Credential {
  name: string;
  issuer: string;
}
export interface CredentialTier {
  label: string;
  items: Credential[];
}

export const credentialTiers: CredentialTier[] = [
  {
    label: 'Licenses & designations',
    items: [
      { name: 'Certified Public Accountant (CPA)', issuer: 'State of New Jersey' },
      { name: 'Chartered Global Management Accountant (CGMA)', issuer: 'AICPA' },
    ],
  },
  {
    label: 'Certifications',
    items: [
      { name: 'Project Management Professional (PMP)', issuer: 'Project Management Institute' },
      { name: 'PMI Agile Certified Practitioner (PMI-ACP)', issuer: 'Project Management Institute' },
    ],
  },
  {
    label: 'Training-based',
    items: [
      { name: 'Certified Scrum Product Owner (CSPO)', issuer: 'Scrum Alliance' },
      { name: 'SAFe POPM', issuer: 'Scaled Agile' },
    ],
  },
];

export const CREDENTIAL_STATUS = 'Active';

/** The two that appear on the homepage. Everything else lives on /about/. */
export const homepageCredentials: Credential[] = [
  credentialTiers[0].items[0], // CPA
  credentialTiers[1].items[0], // PMP
];
