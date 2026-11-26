import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { isThinTagListing } from './indexing.ts';
const read = (rel: string) => readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');
test('unannotated tag listings need at least three published articles', () => {
  for (const n of [0, 1, 2]) assert.equal(isThinTagListing(n), true);
  for (const n of [3, 4, 400]) assert.equal(isThinTagListing(n), false);
});
test('invalid inventory is not silently treated as indexable', () => {
  for (const n of [-1, NaN, Infinity, 1.1]) assert.throws(() => isThinTagListing(n));
});
test('only individual tag routes use the noindex rule; shared head and layouts have no blanket rule', () => {
  const routes = readdirSync(new URL('../pages/', import.meta.url), {recursive:true, encoding:'utf8'}).filter(p=>p.endsWith('.astro'));
  assert.deepEqual(routes.filter(p=>read(`src/pages/${p}`).includes('noindex, follow')), ['blog/tags/[tag].astro']);
  for (const p of ['src/components/BaseHead.astro','src/layouts/BaseLayout.astro','src/layouts/BlogPost.astro']) assert.doesNotMatch(read(p), /noindex/);
  assert.match(read('src/pages/blog/tags/[tag].astro'), /isThinTagListing\(posts\.filter\(\(p\) => !p\.data\.draft\)\.length\)/);
});
test('robots policy allows fetching noindex pages and advertises sitemap', () => {
  const robots = read('src/pages/robots.txt.ts'); assert.doesNotMatch(robots,/Disallow:/i); assert.ok(robots.includes('Allow: /')); assert.match(robots,/sitemap-index\.xml/);
});
