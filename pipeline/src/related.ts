// Related-post links. Reuses the per-post topic embeddings the store already keeps
// (covered-memory) — for each published post, find its top-K most-similar other posts
// whose cosine similarity clears a floor, and write src/data/related.json for the site
// to render. No new API calls: pure vector math over embeddings we already store.
import fs from 'node:fs';
import path from 'node:path';
import type { Store } from './store.ts';
import type { Vec } from './types.ts';

export interface RelatedInput {
  slug: string;
  title: string;
  vec: Vec;
}
export type RelatedMap = Record<string, { slug: string; title: string }[]>;

function denseDot(a: number[], b: number[]): number {
  let s = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 1) s += a[i] * b[i];
  return s;
}
function denseNorm(a: number[]): number {
  let s = 0;
  for (const x of a) s += x * x;
  return Math.sqrt(s);
}

// Cosine similarity supporting dense (number[], production/OpenAI) and sparse (Map,
// lexical dev fallback) vectors. Mismatched forms score 0 (should not happen in a run).
export function cosine(a: Vec, b: Vec): number {
  if (Array.isArray(a) && Array.isArray(b)) {
    const na = denseNorm(a);
    const nb = denseNorm(b);
    return na && nb ? denseDot(a, b) / (na * nb) : 0;
  }
  if (a instanceof Map && b instanceof Map) {
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (const [k, v] of a) {
      na += v * v;
      const w = b.get(k);
      if (w) dot += v * w;
    }
    for (const v of b.values()) nb += v * v;
    return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
  }
  return 0;
}

// Pure: each post's top-`k` most-similar others with cosine >= `minSim` (the floor).
// Fewer than k (even zero) links is fine and preferred over padding weak matches.
export function computeRelated(entries: RelatedInput[], k = 5, minSim = 0.4): RelatedMap {
  const out: RelatedMap = {};
  for (const a of entries) {
    const scored: { slug: string; title: string; score: number }[] = [];
    for (const b of entries) {
      if (b.slug === a.slug) continue;
      const score = cosine(a.vec, b.vec);
      if (score >= minSim) scored.push({ slug: b.slug, title: b.title, score });
    }
    scored.sort((x, y) => y.score - x.score);
    out[a.slug] = scored.slice(0, k).map(({ slug, title }) => ({ slug, title }));
  }
  return out;
}

// Load published posts + embeddings from the store, compute related links, write JSON.
// Full recompute each run, so older posts pick up links to newer related posts too.
export async function writeRelated(
  store: Store,
  repoRoot: string,
  opts: { k?: number; minSim?: number } = {},
): Promise<{ posts: number; withLinks: number }> {
  const covered = await store.loadCovered();
  const entries: RelatedInput[] = covered.map((c) => ({ slug: c.slug, title: c.title, vec: c.vec }));
  const map = computeRelated(entries, opts.k ?? 5, opts.minSim ?? 0.4);
  const file = path.join(repoRoot, 'src/data/related.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(map, null, 2)}\n`);
  const withLinks = Object.values(map).filter((v) => v.length > 0).length;
  return { posts: entries.length, withLinks };
}
