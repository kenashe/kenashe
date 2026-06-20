// One-time: embed the existing published posts into covered memory so de-dup works
// from the first run. Usage: STORE_BACKEND=postgres OPENAI_API_KEY=... npm run backfill
import fs from 'node:fs';
import path from 'node:path';
import { getStore } from './store.ts';
import { embedMany } from './llm.ts';

const BLOG = path.resolve(import.meta.dirname, '../../src/content/blog');
const store = getStore();

const posts = fs.readdirSync(BLOG)
  .filter((f) => f.endsWith('.mdx'))
  .map((f) => {
    const raw = fs.readFileSync(path.join(BLOG, f), 'utf8');
    const m = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
    const fm = m ? m[1] : '';
    const body = m ? m[2] : '';
    const g = (n: string) => fm.match(new RegExp(`^${n}:\\s*(.+)$`, 'm'))?.[1]?.replace(/^["']|["']$/g, '') ?? '';
    return { slug: f.slice(0, -4), title: g('title'), desc: g('description'), pub: g('pubDate'), body, draft: /^draft:\s*true/m.test(fm) };
  })
  .filter((p) => !p.draft && p.title);

console.log(`embedding ${posts.length} published posts...`);
const vecs = await embedMany(posts.map((p) => `${p.title}\n\n${p.desc}\n\n${p.body.slice(0, 4000)}`));
for (let i = 0; i < posts.length; i++) {
  await store.addCovered({ slug: posts[i].slug, title: posts[i].title, publishedAt: posts[i].pub || new Date().toISOString().slice(0, 10), vec: vecs[i] });
}
console.log(`backfilled ${posts.length} posts into covered memory`);
