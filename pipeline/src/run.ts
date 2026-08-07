// Daily orchestrator: ingest -> embed -> cluster -> dedup -> rank -> select tiers ->
// synthesize -> gate -> images -> publish -> digest. `--shadow` = draft-only, no commit.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { env, loadSources, loadDeepDive } from './config.ts';
import { getStore } from './store.ts';
import { ingest } from './ingest.ts';
import { LexicalEmbedder, cluster, isCovered } from './core.ts';
import { embedMany } from './llm.ts';
import { synthesize } from './synthesize.ts';
import { gate } from './gate.ts';
import { addImages } from './images.ts';
import { writePost, commitAndPush, commitToBranch, triggerDeploy } from './publish.ts';
import { writeRelated, cosine } from './related.ts';
import type { Item, Story, RunReport, Vec } from './types.ts';

const repoRoot = path.resolve(import.meta.dirname, '../../');
const hash = (s: string) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);

// Digital-assets beachhead source names (must match config/sources.yaml). Used to reserve
// a guaranteed selection slot so the beachhead surfaces; split domains/crypto for balance.
const DA_DOMAINS = new Set(['Domain Name Wire', 'DomainInvesting', 'TheDomains']);
const DA_CRYPTO = new Set(['Decrypt', 'CoinDesk', 'The Block', 'CoinTelegraph', 'The Defiant']);
// AI x marketing & ops beachhead source names (must match config/sources.yaml). These
// feeds are tier 2 and single-source, so on merit they never outrank an arXiv story;
// without a reserved slot the marketing hub only ever grows via the monthly pillar.
const MK_SOURCES = new Set(['Marketing AI Institute', 'Search Engine Journal', 'Martech']);
const inSources = (s: Story, names: Set<string>) => s.items.some((i) => names.has(i.source));

// Canonical beachhead tags: add the hub's canonical tag when a post carries any family
// alias, so tagging standardizes going forward (hubs still aggregate the whole family).
const CANON: Record<string, string[]> = {
  'ai-agents': ['agents', 'agentic', 'tool-use', 'langchain', 'agent-eval'],
  'evals': ['evaluation', 'agent-eval'],
  'marketing-ops': ['marketing-automation', 'ai-marketing'],
  'building-with-ai': ['ai-workflows', 'builder-tools', 'developer-tools', 'ai-coding', 'ai-tools', 'workflows'],
};
const withCanonicalTags = (tags: string[]): string[] => {
  const out = new Set(tags);
  for (const [canon, fam] of Object.entries(CANON)) {
    if (tags.some((t) => t === canon || fam.includes(t))) out.add(canon);
  }
  return [...out];
};

// --- Weekly deep-dive (pillar) selection helpers ---
// Beachhead detection for choosing what to go deep on. Digital-assets is source-based
// (reuses the DA sets); the other three match distinctive keywords in the story text.
// Heuristic and selection-only — the synthesizer and gate still decide quality.
const BH_KEYWORDS: Record<string, string[]> = {
  'ai-agents': ['agent', 'agentic', 'tool use', 'tool-use', 'eval', 'benchmark', 'langchain', 'autonomous', 'multi-agent'],
  'marketing-ops': ['marketing', ' seo', 'brand', 'campaign', 'advertis', 'go-to-market', 'growth', 'crm', 'content ops', 'copywrit', 'martech', 'attribution', 'demand gen', 'lifecycle', 'positioning', 'email marketing', 'ppc', 'search engine', 'ai overview', 'funnel'],
  'building-with-ai': ['shipped', 'build', 'workflow', 'developer', 'coding', 'codebase', 'automation', 'pipeline', 'devtool', 'ide '],
};
const BEACHHEADS = ['ai-agents', 'marketing-ops', 'building-with-ai', 'digital-assets'] as const;
function storyBeachhead(s: Story): string | null {
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
// When did each beachhead last get a pillar? Derived from the published posts (the repo
// IS the state - no extra schema): a pillar is tagged 'deep-dive' plus its beachhead tag,
// and the filename is date-prefixed. Used to fall back to the least-recently-covered
// beachhead instead of the biggest one, which would otherwise always be ai-agents.
function lastPillarByBeachhead(root: string): Map<string, string> {
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

// ISO week number (UTC) so the beachhead rotation is deterministic and even across the year.
function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function rankScore(items: Item[]): number {
  const weight = items.reduce((a, b) => a + b.weight, 0);
  const tier1 = items.some((i) => i.tier === 1) ? 0.5 : 0;
  const corroboration = Math.min(items.length, 5) * 0.15; // multi-source stories rank higher
  return weight + tier1 + corroboration;
}

async function notify(text: string, markdown = true): Promise<void> {
  if (!env.telegram.token || !env.telegram.chat) { console.log('[digest]\n' + text); return; }
  await fetch(`https://api.telegram.org/bot${env.telegram.token}/sendMessage`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: env.telegram.chat, text, ...(markdown ? { parse_mode: 'Markdown' } : {}) }),
  }).catch(() => {});
}

async function main(): Promise<void> {
  const shadow = process.argv.includes('--shadow');
  const store = getStore();
  const report: RunReport = { startedAt: new Date().toISOString(), shadow, ingested: 0, stories: 0, deduped: 0, selected: 0, published: [], drafted: [], skipped: [], errors: [] };

  const items = await ingest(loadSources(), store, { skipSeen: shadow });
  report.ingested = items.length;
  const memory = await store.loadCovered();

  // Embeddings: semantic (OpenAI) when a key is present, else the lexical dev fallback.
  let itemsV: { item: Item; vec: Vec }[];
  if (process.env.OPENAI_API_KEY) {
    const vecs = await embedMany(items.map((i) => `${i.title}\n\n${i.text.slice(0, 6000)}`));
    itemsV = items.map((i, idx) => ({ item: i, vec: vecs[idx] as Vec }));
  } else {
    const emb = new LexicalEmbedder();
    emb.fit([...items.map((i) => `${i.title} ${i.text}`), ...memory.map((m) => m.title)]);
    itemsV = items.map((i) => ({ item: i, vec: emb.embed(i.text, i.title) as Vec }));
  }

  const groups = cluster(itemsV, env.clusterSim);
  const stories: Story[] = groups.map((g) => ({
    key: hash(g.map((x) => x.item.id).sort().join('|')),
    items: g.map((x) => x.item),
    vec: g[0].vec,
    score: rankScore(g.map((x) => x.item)),
    tier: 'note',
  }));
  report.stories = stories.length;

  // The fix the old pipeline lacked: check each story against covered memory.
  const kept = stories.filter((s) => {
    const { covered, sim } = isCovered(s.vec, memory, env.dedupSim);
    if (covered) report.skipped.push({ title: s.items[0].title, reason: `dup (sim ${sim.toFixed(2)})` });
    return !covered;
  });
  report.deduped = stories.length - kept.length;

  kept.sort((a, b) => b.score - a.score);

  // Weekly deep-dive (pillar): on the scheduled weekday (or forced for a shadow test),
  // pick a beachhead by ISO-week rotation; if that beachhead is thin this week, fall back
  // to whichever has the most material; if none clears the floor, skip the pillar entirely.
  // The chosen story is pulled out and given the 'deepdive' tier, taking one flagship slot.
  const dd = loadDeepDive();
  // `force` is a shadow-only test override; live runs strictly follow the weekday schedule
  // (so a lingering force flag can never publish an un-inspected pillar off-schedule).
  const runDeepDive = dd.enabled && ((dd.force && shadow) || (new Date().getUTCDay() === dd.weekday && !shadow));
  let ddStory: Story | undefined;
  let ddBeachhead = '';
  let ddSourceKeys: Set<string> | undefined;
  if (runDeepDive) {
    // A pillar may only form around a cluster that carries a citable primary (tier-1)
    // source, so it is defensible by construction; a commentary-only cluster is never
    // eligible (that is what sank the shadow-tested Exploit Gym pillar at gate).
    // Anchor-eligible = a tier-1 origin OR a `primary` trade newsroom (see sources.yaml).
    // Commentary/reaction sources never qualify, however many of them corroborate:
    // the rumor pillar this rule exists to block was covered by four YouTube channels.
    const hasPrimary = (s: Story) => s.items.some((i) => i.tier === 1 || i.primary === true);
    const byBh = new Map<string, Story[]>();
    for (const s of kept) {
      const bh = storyBeachhead(s);
      if (bh) { const g = byBh.get(bh) ?? []; g.push(s); byBh.set(bh, g); }
    }
    // Eligible beachhead = enough material AND at least one primary-anchored story.
    const eligible = (bh: string) => {
      const g = byBh.get(bh) ?? [];
      return g.length >= dd.minStories && g.some(hasPrimary);
    };
    const rotate = BEACHHEADS[isoWeek(new Date()) % BEACHHEADS.length];
    let pickBh = '';
    if (eligible(rotate)) {
      pickBh = rotate;
    } else {
      // Rotation pick isn't eligible this week. Fall back to the LEAST-RECENTLY-COVERED
      // eligible beachhead (never-covered wins), tie-broken by material, so coverage
      // spreads instead of defaulting to whichever hub has the most stories.
      const lastPillar = lastPillarByBeachhead(repoRoot);
      const alt = [...byBh.keys()]
        .filter(eligible)
        .sort((a, b) => {
          const la = lastPillar.get(a) ?? '';
          const lb = lastPillar.get(b) ?? '';
          if (la !== lb) return la < lb ? -1 : 1;
          return (byBh.get(b)?.length ?? 0) - (byBh.get(a)?.length ?? 0);
        })[0];
      if (alt) pickBh = alt;
    }
    if (pickBh) {
      // Anchor on the top-scored PRIMARY story, then fold in the next few primary stories
      // in the beachhead so the pillar synthesizes the AREA (multi-source) rather than a
      // single paper — single-paper analysis is what capped originality at gate.
      const primaries = (byBh.get(pickBh) ?? []).filter(hasPrimary).sort((a, b) => b.score - a.score);
      if (primaries.length) {
        const anchorStories = primaries.slice(0, Math.max(1, dd.maxStories));
        const mergedItems: Item[] = [];
        const seenIds = new Set<string>();
        for (const st of anchorStories) for (const it of st.items) {
          if (!seenIds.has(it.id)) { seenIds.add(it.id); mergedItems.push(it); }
        }
        ddStory = { ...anchorStories[0], items: mergedItems.slice(0, 8) };
        ddBeachhead = pickBh;
        ddSourceKeys = new Set(anchorStories.map((s) => s.key));
      }
    }
    // Observability: log the pick, or when skipping, why — per-beachhead story counts and
    // how many carry a tier-1 primary (the eligibility bar), e.g. "ai-agents:3(1p)".
    const bhSummary = BEACHHEADS.map((bh) => {
      const g = byBh.get(bh) ?? [];
      return `${bh}:${g.length}(${g.filter(hasPrimary).length}p)`;
    }).join(' ');
    console.log(
      ddStory
        ? `[deepdive] ${ddBeachhead} pillar from ${ddSourceKeys?.size ?? 1} primary stories | ${bhSummary}`
        : `[deepdive] skipped: no beachhead with >=${dd.minStories} stories incl. a tier-1 primary | ${bhSummary}`,
    );
  }
  const ddSelected: Story[] = ddStory ? [{ ...ddStory, tier: 'deepdive' as const }] : [];
  const flagBudget = ddStory ? Math.max(0, env.flagships - 1) : env.flagships;

  // Beachhead guarantee: reserve up to one domains + one crypto "AI x digital assets"
  // story (top-ranked of each) so the beachhead reliably surfaces without drowning
  // mainstream AI. Reserved from the notes budget; still gated below (a slot is not a publish).
  // Exclude every story folded into the pillar so we do not also publish them as notes.
  const pool = kept.filter((s) => !(ddSourceKeys ?? new Set<string>()).has(s.key));
  const daPicks: Story[] = [];
  const domainPick = pool.find((s) => inSources(s, DA_DOMAINS));
  if (domainPick) daPicks.push(domainPick);
  const cryptoPick = pool.find((s) => inSources(s, DA_CRYPTO));
  if (cryptoPick) daPicks.push(cryptoPick);
  const daKeys = new Set(daPicks.map((s) => s.key));
  // Same guarantee for the marketing & ops beachhead: reserve the top-ranked marketing
  // story so that hub grows daily rather than only when a pillar lands.
  const mkPick = pool.find((s) => inSources(s, MK_SOURCES) && !daKeys.has(s.key));
  const reserved: Story[] = [...daPicks, ...(mkPick ? [mkPick] : [])];
  const reservedKeys = new Set(reserved.map((s) => s.key));
  const rest = pool.filter((s) => !reservedKeys.has(s.key));
  const flagships = rest.slice(0, flagBudget).map((s) => ({ ...s, tier: 'flagship' as const }));
  const notesRoom = Math.max(0, env.notesMax - reserved.length);
  const notes = rest.slice(flagBudget, flagBudget + notesRoom).map((s) => ({ ...s, tier: 'note' as const }));
  const selected: Story[] = [...ddSelected, ...flagships, ...notes, ...reserved.map((s) => ({ ...s, tier: 'note' as const }))];
  report.selected = selected.length;
  console.log(`[select] reserved -> domains:${domainPick ? 1 : 0} crypto:${cryptoPick ? 1 : 0} marketing:${mkPick ? 1 : 0} | flagships:${flagships.length} notes:${notes.length}`);

  let gatePass = 0;
  for (const story of selected) {
    try {
      // For a deep-dive, gather its semantic spokes (nearest published posts) to link.
      const spokes = story.tier === 'deepdive'
        ? memory
            .map((m) => ({ slug: m.slug, title: m.title, score: cosine(story.vec, m.vec) }))
            .filter((x) => x.score >= env.relatedMinSim)
            .sort((a, b) => b.score - a.score)
            .slice(0, 8)
            .map(({ slug, title }) => ({ slug, title }))
        : [];
      const draft = await synthesize(story, spokes);
      if (story.tier === 'deepdive') {
        draft.tags = [...new Set([...draft.tags, ddBeachhead, 'deep-dive'])];
      }
      // Canonical beachhead tags so the future hub can aggregate the cluster.
      if (inSources(story, DA_DOMAINS) || inSources(story, DA_CRYPTO)) {
        const half = inSources(story, DA_DOMAINS) ? 'domains' : 'crypto';
        draft.tags = [...new Set([...draft.tags, 'digital-assets', half])];
      }
      if (inSources(story, MK_SOURCES)) {
        draft.tags = [...new Set([...draft.tags, 'marketing-ops'])];
      }
      draft.tags = withCanonicalTags(draft.tags);
      const g = await gate(draft); // sets draft.draft based on tier threshold
      if (!draft.draft) gatePass += 1; // gate verdict, before the shadow override
      const why = `${g.verdict} ${g.total}/40${g.critical_fails.length ? ` fails=[${g.critical_fails.join('; ')}]` : ''}${g.ai_tells_found.length ? ` tells=${g.ai_tells_found.length}` : ''} :: ${g.reason}`;
      await addImages(draft, repoRoot, shadow);
      if (shadow) draft.draft = true; // shadow never publishes
      writePost(repoRoot, draft);
      if (draft.draft) {
        report.drafted.push({ slug: draft.slug, reason: why });
      } else {
        report.published.push({ slug: draft.slug, tier: draft.tierKind });
        await store.addCovered({ slug: draft.slug, title: draft.title, publishedAt: draft.pubDate, vec: story.vec });
      }
    } catch (e) { report.errors.push(`${story.key}: ${(e as Error).message}`); }
  }

  // Recompute related-post links across all published posts (bidirectional).
  const rel = await writeRelated(store, repoRoot, { k: env.relatedK, minSim: env.relatedMinSim });
  console.log(`[related] ${rel.withLinks}/${rel.posts} posts have related links`);

  if (!shadow && (report.published.length || report.drafted.length)) {
    commitAndPush(repoRoot, `pipeline: ${report.published.length} posts, ${report.drafted.length} drafts (${report.startedAt.slice(0, 10)})`);
    await triggerDeploy();
  } else if (shadow && report.drafted.length) {
    commitToBranch(repoRoot, 'pipeline-shadow', `shadow preview: ${report.drafted.length} drafts (${report.startedAt.slice(0, 10)})`);
  }
  await store.recordRun(report);
  await notify(`*The Lab daily${shadow ? ' (shadow)' : ''}*\nIngested ${report.ingested}, stories ${report.stories}, deduped ${report.deduped}.\nGate passed ${gatePass}/${report.selected}. Published ${report.published.length} (${flagships.length} flagship${ddStory ? `, deep-dive: ${ddBeachhead}` : ''}), drafted ${report.drafted.length}, skipped ${report.skipped.length} dupes.${report.errors.length ? `\n⚠️ errors: ${report.errors.length}` : ''}`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch(async (e) => {
  console.error(e);
  // A hard failure (rejected push, DB/LLM outage, etc.) lands here AFTER the success
  // digest at the end of main() has been skipped — so the run would otherwise fail
  // silently. Send a plain-text failure ping (no Markdown, so a messy error string
  // can't break Telegram parsing) before exiting non-zero.
  const detail = e instanceof Error ? (e.stack ?? e.message) : String(e);
  await notify(`🚨 The Lab daily FAILED (${new Date().toISOString()})\n\n${detail.slice(0, 1500)}`, false);
  process.exit(1);
});
