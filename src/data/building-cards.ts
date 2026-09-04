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
  link: '/building/autonomous-ai-blog/',
};

// The curated builds surfaced as cards (matches the prior Projects card set).
const CURATED = [
  'AI werewolf / social deduction lab',
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

// --- Homepage continuation helpers -------------------------------------------------
// The homepage shows the first FEATURED_COUNT cards and then points at the rest. Every
// number a visitor sees ("3 of N", "View all N builds", "and N more") is derived from
// `buildingCards` here, so adding a project to builds.ts updates the copy on the next
// build with no edit, and the homepage count can never disagree with /building/.
const FEATURED_COUNT = 3;

export const featuredBuilds: Project[] = buildingCards.slice(0, FEATURED_COUNT);
export const remainingBuilds: Project[] = buildingCards.slice(FEATURED_COUNT);
export const totalBuilds: number = buildingCards.length;

// Guard against a runaway title in the one-line teaser; current titles are short, this
// only trims something extreme, at a word boundary, and never invents a name.
const shortTitle = (s: string, max = 60): string =>
  s.length <= max ? s : `${s.slice(0, max).replace(/\s+\S*$/, '')}...`;

// "Next on the log: A, B, C, and 4 more." / "A, B, and C." / "A and B." / "A." / null.
export function nextOnTheLog(): string | null {
  const titles = remainingBuilds.map((p) => shortTitle(p.title));
  if (titles.length === 0) return null;
  const shown = titles.slice(0, 3);
  const extra = titles.length - shown.length;
  let list: string;
  if (shown.length === 1) list = shown[0];
  else if (shown.length === 2 && extra === 0) list = `${shown[0]} and ${shown[1]}`;
  else if (extra === 0) list = `${shown.slice(0, -1).join(', ')}, and ${shown[shown.length - 1]}`;
  else list = `${shown.join(', ')}, and ${extra} more`;
  return `Next on the log: ${list}.`;
}
