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
import { writePost, commitAndPush, triggerDeploy } from './publish.ts';
import type { Item, Story, RunReport, Vec } from './types.ts';

const repoRoot = path.resolve(import.meta.dirname, '../../');
const hash = (s: string) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);

function rankScore(items: Item[]): number {
  const weight = items.reduce((a, b) => a + b.weight, 0);
  const tier1 = items.some((i) => i.tier === 1) ? 0.5 : 0;
  const corroboration = Math.min(items.length, 5) * 0.15; // multi-source stories rank higher
  return weight + tier1 + corroboration;
}

async function notify(text: string): Promise<void> {
  if (!env.telegram.token || !env.telegram.chat) { console.log('[digest]\n' + text); return; }
  await fetch(`https://api.telegram.org/bot${env.telegram.token}/sendMessage`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: env.telegram.chat, text, parse_mode: 'Markdown' }),
  }).catch(() => {});
}

async function main(): Promise<void> {
  const shadow = process.argv.includes('--shadow');
  const store = getStore();
  const report: RunReport = { startedAt: new Date().toISOString(), shadow, ingested: 0, stories: 0, deduped: 0, selected: 0, published: [], drafted: [], skipped: [], errors: [] };

  const items = await ingest(loadSources(), store);
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
  const flagships = kept.slice(0, env.flagships).map((s) => ({ ...s, tier: 'flagship' as const }));
  const notes = kept.slice(env.flagships, env.flagships + env.notesMax).map((s) => ({ ...s, tier: 'note' as const }));
  const selected: Story[] = [...flagships, ...notes];
  report.selected = selected.length;

  for (const story of selected) {
    try {
      const draft = await synthesize(story);
      await gate(draft); // sets draft.draft based on tier threshold
      await addImages(draft, repoRoot, shadow);
      if (shadow) draft.draft = true; // shadow never publishes
      writePost(repoRoot, draft);
      if (draft.draft) {
        report.drafted.push({ slug: draft.slug, reason: shadow ? 'shadow' : 'below gate' });
      } else {
        report.published.push({ slug: draft.slug, tier: draft.tierKind });
        await store.addCovered({ slug: draft.slug, title: draft.title, publishedAt: draft.pubDate, vec: story.vec });
      }
    } catch (e) { report.errors.push(`${story.key}: ${(e as Error).message}`); }
  }

  if (!shadow && (report.published.length || report.drafted.length)) {
    commitAndPush(repoRoot, `pipeline: ${report.published.length} posts, ${report.drafted.length} drafts (${report.startedAt.slice(0, 10)})`);
    await triggerDeploy();
  }
  await store.recordRun(report);
  await notify(`*The Lab daily${shadow ? ' (shadow)' : ''}*\nIngested ${report.ingested}, stories ${report.stories}, deduped ${report.deduped}.\nPublished ${report.published.length} (${flagships.length} flagship), drafted ${report.drafted.length}, skipped ${report.skipped.length} dupes.${report.errors.length ? `\n⚠️ errors: ${report.errors.length}` : ''}`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
