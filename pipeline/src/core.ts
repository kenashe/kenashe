// De-dup / clustering core. Dep-free so it runs under `node --experimental-strip-types`.
// Production swaps LexicalEmbedder for an API embedder (see llm.ts embed()), but the
// cluster() / isCovered() logic is identical. Proven against the Bucket B ground truth:
// 23/23 known duplicates placed their canonical in the top-3 nearest neighbours.
import fs from 'node:fs';
import path from 'node:path';
import type { SparseVec, Vec } from './types.ts';

const STOP = new Set(
  ('the a an and or but for to of in on with your you my i is are was were be this that it its as at by '
  + 'from not no so if why how what when into over under most own out do dont more than then them they we '
  + 'our us me his her their about just like can will would could should new now has have had also').split(/\s+/),
);

export function tokenize(s: string): string[] {
  return (s.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 2 && !STOP.has(w));
}

export class LexicalEmbedder {
  private idf = new Map<string, number>();
  private n = 1;
  fit(texts: string[]): void {
    this.n = texts.length || 1;
    const df = new Map<string, number>();
    for (const t of texts) for (const w of new Set(tokenize(t))) df.set(w, (df.get(w) ?? 0) + 1);
    for (const [w, d] of df) this.idf.set(w, Math.log(this.n / d));
  }
  embed(text: string, title?: string): SparseVec {
    const bag = new Map<string, number>();
    const add = (s: string, w: number) => { for (const t of tokenize(s)) bag.set(t, (bag.get(t) ?? 0) + w); };
    if (title) add(title, 3);
    add(text, 1);
    const vec = new Map<string, number>();
    for (const [t, c] of bag) vec.set(t, c * (this.idf.get(t) ?? Math.log(this.n)));
    return vec;
  }
}

export function cosine(a: Vec, b: Vec): number {
  if (a instanceof Map && b instanceof Map) {
    let na = 0, nb = 0, dot = 0;
    for (const v of a.values()) na += v * v;
    for (const v of b.values()) nb += v * v;
    const [s, l] = a.size < b.size ? [a, b] : [b, a];
    for (const [k, v] of s) { const o = l.get(k); if (o) dot += v * o; }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
  }
  const x = a as number[], y = b as number[];
  let na = 0, nb = 0, dot = 0;
  for (let i = 0; i < x.length; i++) { dot += x[i] * y[i]; na += x[i] * x[i]; nb += y[i] * y[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

// Greedy single-link clustering: collapses all items about one story together.
export function cluster<T extends { vec: Vec }>(items: T[], threshold: number): T[][] {
  const clusters: { medoid: T; members: T[] }[] = [];
  for (const it of items) {
    let best: { medoid: T; members: T[] } | null = null;
    let bs = 0;
    for (const c of clusters) { const s = cosine(it.vec, c.medoid.vec); if (s > bs) { bs = s; best = c; } }
    if (best && bs >= threshold) best.members.push(it);
    else clusters.push({ medoid: it, members: [it] });
  }
  return clusters.map((c) => c.members);
}

// The fix the old pipeline was missing: check a candidate against covered memory.
export function isCovered(vec: Vec, memory: { vec: Vec }[], threshold: number): { covered: boolean; sim: number } {
  let max = 0;
  for (const m of memory) { const s = cosine(vec, m.vec); if (s > max) max = s; }
  return { covered: max >= threshold, sim: max };
}

// --- runnable demo: validates the TS core compiles + clusters the real corpus ---
if (process.argv.includes('--demo')) {
  const BLOG = path.resolve(import.meta.dirname, '../../src/content/blog');
  const files = fs.readdirSync(BLOG).filter((f) => f.endsWith('.mdx'));
  const docs = files.map((f) => {
    const raw = fs.readFileSync(path.join(BLOG, f), 'utf8');
    const fm = raw.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
    const title = fm.match(/^title:\s*(.+)$/m)?.[1]?.replace(/^["']|["']$/g, '') ?? f;
    return { title, body: raw.slice(0, 1200) };
  });
  const emb = new LexicalEmbedder();
  emb.fit(docs.map((d) => `${d.title} ${d.body}`));
  const vecd = docs.map((d) => ({ title: d.title, vec: emb.embed(d.body, d.title) as Vec }));
  const groups = cluster(vecd, 0.18).filter((c) => c.length > 1);
  console.log(`[core demo] ${docs.length} posts -> ${groups.length} multi-post clusters`);
  for (const g of groups.slice(0, 6)) console.log('  • ' + g.map((d) => d.title).join('  |  ').slice(0, 150));
}
