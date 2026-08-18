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
import { announce } from './indexnow.ts';
import {
  BEACHHEADS, DA_DOMAINS, DA_CRYPTO, MK_SOURCES, inSources, hasPrimary, withCanonicalTags,
  storyBeachhead, groupByBeachhead, lastPillarByBeachhead, chooseBeachhead, isoWeek,
  rankScore, pickReserved,
} from './selection.ts';
import type { Item, Story, RunReport, Vec } from './types.ts';

const repoRoot = path.resolve(import.meta.dirname, '../../');
const hash = (s: string) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);

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
    const byBh = groupByBeachhead(kept);
    const rotate = BEACHHEADS[isoWeek(new Date()) % BEACHHEADS.length];
    const pickBh = chooseBeachhead(byBh, {
      rotate,
      minStories: dd.minStories,
      lastPillar: lastPillarByBeachhead(repoRoot),
    });
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
  const { domainPick, cryptoPick, mkPick, reserved, reservedKeys } = pickReserved(pool);
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
  // Ping IndexNow last: it waits for the Vercel deploy (up to ~12 min) before telling
  // crawlers to fetch, so it must not delay the digest above or block recording the run.
  if (!shadow && env.indexNow) {
    await announce(env.siteUrl, report.published.map((p) => p.slug));
  }
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
