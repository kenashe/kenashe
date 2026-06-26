import { projects, type Project } from './builds';

// The autonomous blog, shown as a normal card (it was previously the flagship
// case study; the simplified Building page has one category, no case studies).
const autonomousBlog: Project = {
  title: 'Autonomous AI blog',
  status: 'LIVE',
  dek: "Scans the day's AI sources, clusters them into distinct stories, and auto-publishes only the drafts that clear an editorial quality gate. No human in the loop.",
  stack: ['GitHub Actions', 'n8n', 'Claude Opus 4.8', 'GPT-5.5', 'Gemini 3.1 Pro', 'pgvector'],
  shippedAt: 'Jun 2026',
  metric: 'runs daily',
};

// The curated builds surfaced as cards (matches the prior Projects card set).
const CURATED = [
  'Geo-targeted affiliate site',
  'kenashe.ai',
  'Daily email to myself',
  'Agent-driven site design and deployment',
  'Sir Pitches-a-lot',
  'Six-agent email response team',
  'Personal assistant chatbot',
];

// Order by build date, newest first. A build's date is its ship date (LIVE) or
// the leading footer date (SHIPPED), parsed to a year*12+month ordinal so
// "Jun 2026" and "June 2026" compare equal.
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const ordinal = (p: Project): number => {
  const s = (p.shippedAt ?? p.footer?.[0] ?? '').toLowerCase();
  const month = MONTHS.findIndex((m) => s.includes(m));
  const year = s.match(/\d{4}/)?.[0];
  return month < 0 || !year ? 0 : Number(year) * 12 + month;
};

// All Building cards: the autonomous blog plus the curated set, one category,
// newest first. Shared by /building/ (full list) and the homepage (latest 3).
export const buildingCards: Project[] = [
  autonomousBlog,
  ...CURATED.map((t) => projects.find((p) => p.title === t)).filter(
    (p): p is Project => p !== undefined,
  ),
].sort((a, b) => ordinal(b) - ordinal(a));
