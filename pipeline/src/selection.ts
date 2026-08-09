// Pure selection/ranking logic, split out of run.ts so it can be unit-tested without
// importing the orchestrator (run.ts executes the whole pipeline on import).
// Nothing here does I/O except lastPillarByBeachhead, which only reads the posts directory.
import fs from 'node:fs';
import path from 'node:path';
import type { Item, Story } from './types.ts';

// Digital-assets beachhead source names (must match config/sources.yaml). Used to reserve
// a guaranteed selection slot so the beachhead surfaces; split domains/crypto for balance.
export const DA_DOMAINS = new Set(['Domain Name Wire', 'DomainInvesting', 'TheDomains']);
export const DA_CRYPTO = new Set(['Decrypt', 'CoinDesk', 'The Block', 'CoinTelegraph', 'The Defiant']);
// AI x marketing & ops beachhead source names (must match config/sources.yaml). These
// feeds are tier 2 and single-source, so on merit they never outrank an arXiv story;
// without a reserved slot the marketing hub only ever grows via the monthly pillar.
export const MK_SOURCES = new Set(['Marketing AI Institute', 'Search Engine Journal', 'Martech']);
export const inSources = (s: Story, names: Set<string>) => s.items.some((i) => names.has(i.source));

// Anchor-eligible = a tier-1 origin OR a `primary` trade newsroom (see sources.yaml).
// Commentary/reaction sources never qualify, however many of them corroborate:
// the rumor pillar this rule exists to block was covered by four YouTube channels.
export const hasPrimary = (s: Story) => s.items.some((i) => i.tier === 1 || i.primary === true);

// Canonical beachhead tags: add the hub's canonical tag when a post carries any family
// alias, so tagging standardizes going forward (hubs still aggregate the whole family).
export const CANON: Record<string, string[]> = {
  'ai-agents': ['agents', 'agentic', 'tool-use', 'langchain', 'agent-eval'],
  'evals': ['evaluation', 'agent-eval'],
  'marketing-ops': ['marketing-automation', 'ai-marketing'],
  'building-with-ai': ['ai-workflows', 'builder-tools', 'developer-tools', 'ai-coding', 'ai-tools', 'workflows'],
};
export const withCanonicalTags = (tags: string[]): string[] => {
  const out = new Set(tags);
  for (const [canon, fam] of Object.entries(CANON)) {
    if (tags.some((t) => t === canon || fam.includes(t))) out.add(canon);
  }
  return [...out];
};

// Beachhead detection for choosing what to go deep on. Digital-assets is source-based
// (reuses the DA sets); the other three match distinctive keywords in the story text.
// Heuristic and selection-only — the synthesizer and gate still decide quality.
export const BH_KEYWORDS: Record<string, string[]> = {
  'ai-agents': ['agent', 'agentic', 'tool use', 'tool-use', 'eval', 'benchmark', 'langchain', 'autonomous', 'multi-agent'],
  'marketing-ops': ['marketing', ' seo', 'brand', 'campaign', 'advertis', 'go-to-market', 'growth', 'crm', 'content ops', 'copywrit', 'martech', 'attribution', 'demand gen', 'lifecycle', 'positioning', 'email marketing', 'ppc', 'search engine', 'ai overview', 'funnel'],
  'building-with-ai': ['shipped', 'build', 'workflow', 'developer', 'coding', 'codebase', 'automation', 'pipeline', 'devtool', 'ide '],
};
export const BEACHHEADS = ['ai-agents', 'marketing-ops', 'building-with-ai', 'digital-assets'] as const;

export function storyBeachhead(s: Story): string | null {
  if (inSources(s, DA_DOMAINS) || inSources(s, DA_CRYPTO)) return 'digital-assets';
  const hay = ` ${s.items.map((i) => `${i.title} ${i.text}`).join(' ').toLowerCase()} `;
  let best: string | null = null;
  let bestN = 0;
  for (const [bh, kws] of Object.entries(BH_KEYWORDS)) {
    const n = kws.reduce((a, k) => a + (hay.includes(k) ? 1 : 0), 0);
    if (n > bestN) { bestN = n; best = bh; }
  }
  return bestN > 0 ? best : null;
}

export function groupByBeachhead(stories: Story[]): Map<string, Story[]> {
  const byBh = new Map<string, Story[]>();
  for (const s of stories) {
    const bh = storyBeachhead(s);
    if (bh) { const g = byBh.get(bh) ?? []; g.push(s); byBh.set(bh, g); }
  }
  return byBh;
}

// When did each beachhead last get a pillar? Derived from the published posts (the repo
// IS the state - no extra schema): a pillar is tagged 'deep-dive' plus its beachhead tag,
// and the filename is date-prefixed. Used to fall back to the least-recently-covered
// beachhead instead of the biggest one, which would otherwise always be ai-agents.
export function lastPillarByBeachhead(root: string): Map<string, string> {
  const out = new Map<string, string>();
  const dir = path.join(root, 'src/content/blog');
  let files: string[] = [];
  try { files = fs.readdirSync(dir); } catch { return out; }
  for (const f of files) {
    if (!f.endsWith('.mdx')) continue;
    let fm = '';
    try { fm = /^---\n([\s\S]*?)\n---/.exec(fs.readFileSync(path.join(dir, f), 'utf8'))?.[1] ?? ''; } catch { continue; }
    const tags = /^tags:\s*\[(.*)\]\s*$/m.exec(fm)?.[1] ?? '';
    if (!tags.includes('deep-dive')) continue;
    const date = f.slice(0, 10); // YYYY-MM-DD prefix sorts lexicographically
    for (const bh of BEACHHEADS) {
      if (!tags.includes(`"${bh}"`)) continue;
      const prev = out.get(bh);
      if (!prev || date > prev) out.set(bh, date);
    }
  }
  return out;
}

// Which beachhead should this week's pillar cover? Prefer the rotation slot; if it is not
// eligible (enough material AND a primary-anchored story), fall back to the
// least-recently-covered eligible beachhead. Empty string = skip the pillar entirely.
export function chooseBeachhead(
  byBh: Map<string, Story[]>,
  opts: { rotate: string; minStories: number; lastPillar: Map<string, string> },
): string {
  const eligible = (bh: string) => {
    const g = byBh.get(bh) ?? [];
    return g.length >= opts.minStories && g.some(hasPrimary);
  };
  if (eligible(opts.rotate)) return opts.rotate;
  const alt = [...byBh.keys()]
    .filter(eligible)
    .sort((a, b) => {
      const la = opts.lastPillar.get(a) ?? '';
      const lb = opts.lastPillar.get(b) ?? '';
      if (la !== lb) return la < lb ? -1 : 1;
      return (byBh.get(b)?.length ?? 0) - (byBh.get(a)?.length ?? 0);
    })[0];
  return alt ?? '';
}

// ISO week number (UTC) so the beachhead rotation is deterministic and even across the year.
export function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function rankScore(items: Item[]): number {
  const weight = items.reduce((a, b) => a + b.weight, 0);
  const tier1 = items.some((i) => i.tier === 1) ? 0.5 : 0;
  const corroboration = Math.min(items.length, 5) * 0.15; // multi-source stories rank higher
  return weight + tier1 + corroboration;
}

// Guaranteed beachhead slots: top-ranked domains + crypto + marketing story. These feeds
// are tier 2 and single-source, so on merit they never beat an arXiv paper. Reserved from
// the notes budget; still gated downstream (a slot is not a publish).
export function pickReserved(pool: Story[]): {
  domainPick?: Story;
  cryptoPick?: Story;
  mkPick?: Story;
  reserved: Story[];
  reservedKeys: Set<string>;
} {
  const daPicks: Story[] = [];
  const domainPick = pool.find((s) => inSources(s, DA_DOMAINS));
  if (domainPick) daPicks.push(domainPick);
  const cryptoPick = pool.find((s) => inSources(s, DA_CRYPTO));
  if (cryptoPick) daPicks.push(cryptoPick);
  const daKeys = new Set(daPicks.map((s) => s.key));
  const mkPick = pool.find((s) => inSources(s, MK_SOURCES) && !daKeys.has(s.key));
  const reserved: Story[] = [...daPicks, ...(mkPick ? [mkPick] : [])];
  return { domainPick, cryptoPick, mkPick, reserved, reservedKeys: new Set(reserved.map((s) => s.key)) };
}
