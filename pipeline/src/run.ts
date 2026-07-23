// Daily orchestrator: ingest -> embed -> cluster -> dedup -> rank -> select tiers ->
// synthesize -> gate -> images -> publish -> digest. `--shadow` = draft-only, no commit.
import path from 'node:path';
import crypto from 'node:crypto';
import { env, loadSources } from './config.ts';
import { getStore } from './store.ts';
import { ingest } from './ingest.ts';
import { LexicalEmbedder, cluster, isCovered } from './core.ts';
import { embedMany } from './llm.ts';
import { synthesize } from './synthesize.ts';
import { gate } from './gate.ts';
import { addImages } from './images.ts';
import { writePost, commitAndPush, commitToBranch, triggerDeploy } from './publish.ts';
import { writeRelated } from './related.ts';
import type { Item, Story, RunReport, Vec } from './types.ts';

const repoRoot = path.resolve(import.meta.dirname, '../../');
const hash = (s: string) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);

// Digital-assets beachhead source names (must match config/sources.yaml). Used to reserve
// a guaranteed selection slot so the beachhead surfaces; split domains/crypto for balance.
const DA_DOMAINS = new Set(['Domain Name Wire', 'DomainInvesting', 'TheDomains']);
const DA_CRYPTO = new Set(['Decrypt', 'CoinDesk', 'The Block', 'CoinTelegraph', 'The Defiant']);
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
  // Beachhead guarantee: reserve up to one domains + one crypto "AI x digital assets"
  // story (top-ranked of each) so the beachhead reliably surfaces without drowning
  // mainstream AI. Reserved from the notes budget; still gated below (a slot is not a publish).
  const daPicks: Story[] = [];
  const domainPick = kept.find((s) => inSources(s, DA_DOMAINS));
  if (domainPick) daPicks.push(domainPick);
  const cryptoPick = kept.find((s) => inSources(s, DA_CRYPTO));
  if (cryptoPick) daPicks.push(cryptoPick);
  const daKeys = new Set(daPicks.map((s) => s.key));
  const rest = kept.filter((s) => !daKeys.has(s.key));
  const flagships = rest.slice(0, env.flagships).map((s) => ({ ...s, tier: 'flagship' as const }));
  const notesRoom = Math.max(0, env.notesMax - daPicks.length);
  const notes = rest.slice(env.flagships, env.flagships + notesRoom).map((s) => ({ ...s, tier: 'note' as const }));
  const selected: Story[] = [...flagships, ...notes, ...daPicks.map((s) => ({ ...s, tier: 'note' as const }))];
  report.selected = selected.length;

  let gatePass = 0;
  for (const story of selected) {
    try {
      const draft = await synthesize(story);
      // Canonical beachhead tags so the future hub can aggregate the cluster.
      if (inSources(story, DA_DOMAINS) || inSources(story, DA_CRYPTO)) {
        const half = inSources(story, DA_DOMAINS) ? 'domains' : 'crypto';
        draft.tags = [...new Set([...draft.tags, 'digital-assets', half])];
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
  await notify(`*The Lab daily${shadow ? ' (shadow)' : ''}*\nIngested ${report.ingested}, stories ${report.stories}, deduped ${report.deduped}.\nGate passed ${gatePass}/${report.selected}. Published ${report.published.length} (${flagships.length} flagship), drafted ${report.drafted.length}, skipped ${report.skipped.length} dupes.${report.errors.length ? `\n⚠️ errors: ${report.errors.length}` : ''}`);
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
